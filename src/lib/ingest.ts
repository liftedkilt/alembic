import { writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from './db';
import { storagePath } from './storage';
import { pickParser, ParserError } from '@/parsers';

export async function ingestUpload(input: { filename: string; bytes: Buffer }): Promise<{ bookId: string }> {
  const parser = pickParser(input.filename, input.bytes);
  if (!parser) throw new ParserError(`Unsupported file: ${input.filename}`);

  const parsed = await parser.parse(input.bytes);

  // 1. DB work in a single transaction. Filesystem paths are computed up front
  //    but not yet written; if the transaction rolls back, nothing is on disk.
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

    for (let ci = 0; ci < parsed.chapters.length; ci++) {
      const ch = parsed.chapters[ci];
      await tx.chapter.create({
        data: {
          bookId: book.id,
          index: ci,
          title: ch.title,
          paragraphs: {
            create: ch.paragraphs.map((t, pi) => ({ index: pi, fullText: t })),
          },
        },
      });
    }

    await tx.book.update({ where: { id: book.id }, data: { filePath, coverPath } });
    await tx.job.create({ data: { bookId: book.id, type: 'summarize-book-and-chapters', status: 'queued' } });

    return book.id;
  });

  // 2. Persist files outside the transaction. If this fails, compensate by
  //    deleting the book row (cascades to chapters/paragraphs/jobs).
  try {
    const dir = storagePath('books', bookId);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, `source.${parser.format}`), input.bytes);
    if (parsed.coverBytes) {
      await writeFile(path.join(dir, 'cover.bin'), parsed.coverBytes);
    }
  } catch (e) {
    await prisma.book.delete({ where: { id: bookId } }).catch(() => {});
    const dir = storagePath('books', bookId);
    await rm(dir, { recursive: true, force: true }).catch(() => {});
    throw e;
  }

  return { bookId };
}
