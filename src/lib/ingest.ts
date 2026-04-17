import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from './db';
import { storagePath } from './storage';
import { pickParser, ParserError } from '@/parsers';

export async function ingestUpload(input: { filename: string; bytes: Buffer }): Promise<{ bookId: string }> {
  const parser = pickParser(input.filename, input.bytes);
  if (!parser) throw new ParserError(`Unsupported file: ${input.filename}`);

  const parsed = await parser.parse(input.bytes);

  return prisma.$transaction(async (tx) => {
    const book = await tx.book.create({
      data: {
        title: parsed.title,
        author: parsed.author,
        format: parser.format,
        filePath: '', // set after write
        status: 'summarizing',
      },
    });

    const dir = storagePath('books', book.id);
    await mkdir(dir, { recursive: true });
    const filePath = path.join(dir, `source.${parser.format}`);
    await writeFile(filePath, input.bytes);

    let coverPath: string | undefined;
    if (parsed.coverBytes) {
      coverPath = path.join(dir, 'cover.bin');
      await writeFile(coverPath, parsed.coverBytes);
    }

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
    await tx.job.create({
      data: { bookId: book.id, type: 'summarize-book-and-chapters', status: 'queued' },
    });

    return { bookId: book.id };
  });
}
