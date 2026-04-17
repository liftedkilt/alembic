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

  it('throws and persists nothing when file format is unsupported', async () => {
    const bad = Buffer.from('not a real book file, just gibberish text blob');
    await expect(ingestUpload({ filename: 'x.txt', bytes: bad })).rejects.toThrow();
    const books = await prisma.book.findMany();
    expect(books).toHaveLength(0);
  });

  it('throws and persists nothing when the chosen parser fails mid-parse', async () => {
    // Minimal ZIP magic header so EpubParser.canParse is true, but invalid EPUB
    // internals so parse() throws after the registry selects it.
    const bogusEpub = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('not a real epub')]);
    await expect(ingestUpload({ filename: 'x.epub', bytes: bogusEpub })).rejects.toThrow();
    const books = await prisma.book.findMany();
    expect(books).toHaveLength(0);
  });
});
