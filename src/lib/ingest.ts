import { writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from './db';
import { storagePath } from './storage';
import { pickParser, ParserError } from '@/parsers';
import { isTrivialChapter, isTrivialParagraph } from './triviality';

export async function ingestUpload(input: { filename: string; bytes: Buffer }): Promise<{ bookId: string }> {
  const parser = pickParser(input.filename, input.bytes);
  if (!parser) throw new ParserError(`Unsupported file: ${input.filename}`);

  const parsed = await parser.parse(input.bytes);

  const bookId = await prisma.$transaction(async (tx) => {
    const book = await tx.book.create({
      data: {
        title: parsed.title,
        author: parsed.author,
        format: parser.format,
        filePath: '',
        status: 'summarizing',
      },
    });

    const dir = storagePath('books', book.id);
    const filePath = path.join(dir, `source.${parser.format}`);
    const coverPath = parsed.coverBytes ? path.join(dir, 'cover.bin') : null;

    // Rewrite internal image markers into public URL paths now that we know
    // the bookId. `[[IMG:name|alt]]` → `[[IMG:/api/books/<id>/images/name|alt]]`.
    const imgBase = `/api/books/${book.id}/images/`;
    const rewriteImageMarkers = (text: string) =>
      text.replace(/\[\[IMG:([^|\]]+)(\|[^\]]*)?\]\]/g, (_, name, altPart = '') => {
        if (name.startsWith('/')) return `[[IMG:${name}${altPart}]]`;
        return `[[IMG:${imgBase}${name}${altPart}]]`;
      });

    for (let ci = 0; ci < parsed.chapters.length; ci++) {
      const ch = parsed.chapters[ci];
      const paragraphs = ch.paragraphs.map(rewriteImageMarkers);
      const chapterTrivial = isTrivialChapter(paragraphs);
      await tx.chapter.create({
        data: {
          bookId: book.id,
          index: ci,
          title: ch.title,
          isTrivial: chapterTrivial,
          paragraphSummariesStatus: chapterTrivial ? 'ready' : 'pending',
          paragraphs: {
            create: paragraphs.map((t, pi) => ({
              index: pi,
              fullText: t,
              summary: isTrivialParagraph(t) ? t : null,
            })),
          },
        },
      });
    }

    await tx.book.update({ where: { id: book.id }, data: { filePath, coverPath } });
    await tx.job.create({ data: { bookId: book.id, type: 'summarize-book-and-chapters', status: 'queued' } });

    return book.id;
  });

  try {
    const dir = storagePath('books', bookId);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, `source.${parser.format}`), input.bytes);
    if (parsed.coverBytes) {
      await writeFile(path.join(dir, 'cover.bin'), parsed.coverBytes);
    }
    if (parsed.images && parsed.images.length > 0) {
      const imgDir = storagePath('books', bookId, 'images');
      await mkdir(imgDir, { recursive: true });
      for (const img of parsed.images) {
        await writeFile(path.join(imgDir, img.filename), img.bytes);
      }
    }
  } catch (e) {
    await prisma.book.delete({ where: { id: bookId } }).catch(() => {});
    const dir = storagePath('books', bookId);
    await rm(dir, { recursive: true, force: true }).catch(() => {});
    throw e;
  }

  return { bookId };
}
