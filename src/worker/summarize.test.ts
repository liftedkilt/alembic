import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { prisma } from '@/lib/db';
import { ingestUpload } from '@/lib/ingest';
import { FakeLLMProvider } from '@/llm/fake';
import { runSummarizeJob } from './summarize';

const fixture = readFileSync(path.resolve(__dirname, '../../test/fixtures/sample.epub'));

beforeEach(async () => {
  await prisma.job.deleteMany();
  await prisma.paragraph.deleteMany();
  await prisma.chapter.deleteMany();
  await prisma.book.deleteMany();
});

describe('runSummarizeJob', () => {
  it('fills book + chapter summaries and marks book ready', async () => {
    const { bookId } = await ingestUpload({ filename: 'sample.epub', bytes: fixture });
    const job = await prisma.job.findFirstOrThrow({ where: { bookId } });

    const provider = new FakeLLMProvider({
      text: (prompt) => (prompt.includes('ONE paragraph') ? 'THE_BOOK_SUMMARY' : 'a chapter summary sentence here.'),
    });

    await runSummarizeJob(job.id, provider);

    const book = await prisma.book.findUniqueOrThrow({
      where: { id: bookId },
      include: { chapters: true },
    });

    expect(book.status).toBe('ready');
    expect(book.bookSummary).toBe('THE_BOOK_SUMMARY');
    expect(book.chapters.every((c) => c.summary !== null)).toBe(true);

    const updated = await prisma.job.findUniqueOrThrow({ where: { id: job.id } });
    expect(updated.status).toBe('done');
  });

  it('records failure and keeps partial summaries', async () => {
    const { bookId } = await ingestUpload({ filename: 'sample.epub', bytes: fixture });
    const job = await prisma.job.findFirstOrThrow({ where: { bookId } });

    let calls = 0;
    const provider = new FakeLLMProvider({
      text: () => { calls++; if (calls === 3) throw new Error('boom'); return 'ok text here fine'; },
    });

    await expect(runSummarizeJob(job.id, provider, { maxAttempts: 1 })).rejects.toThrow();
    const book = await prisma.book.findUniqueOrThrow({ where: { id: bookId } });
    expect(['failed', 'partial']).toContain(book.status);
  });
});
