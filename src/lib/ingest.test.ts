import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { prisma } from './db';
import { ingestUpload } from './ingest';

const fixture = readFileSync(path.resolve(__dirname, '../../test/fixtures/sample.epub'));

beforeEach(async () => {
  await prisma.job.deleteMany();
  await prisma.paragraph.deleteMany();
  await prisma.chapter.deleteMany();
  await prisma.book.deleteMany();
});

describe('ingestUpload', () => {
  it('persists book, chapters, paragraphs and enqueues a job', async () => {
    const { bookId } = await ingestUpload({ filename: 'sample.epub', bytes: fixture });
    const book = await prisma.book.findUniqueOrThrow({
      where: { id: bookId },
      include: { chapters: { include: { paragraphs: true } }, jobs: true },
    });

    expect(book.status).toBe('summarizing');
    expect(book.chapters.length).toBeGreaterThan(1);
    expect(book.chapters[0].paragraphs.length).toBeGreaterThan(0);
    expect(book.jobs).toHaveLength(1);
    expect(book.jobs[0].type).toBe('summarize-book-and-chapters');
    expect(book.jobs[0].status).toBe('queued');
  });

  it('marks book failed if parsing throws', async () => {
    const bad = Buffer.from('not a real book file, just gibberish text blob');
    await expect(ingestUpload({ filename: 'x.txt', bytes: bad })).rejects.toThrow();
    const books = await prisma.book.findMany();
    expect(books).toHaveLength(0); // ingestion should roll back — nothing persisted on parse failure
  });
});
