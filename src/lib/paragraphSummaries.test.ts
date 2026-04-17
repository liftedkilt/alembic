import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { prisma } from './db';
import { ingestUpload } from './ingest';
import { FakeLLMProvider } from '@/llm/fake';
import { ensureParagraphSummaries } from './paragraphSummaries';

const fixture = readFileSync(path.resolve(__dirname, '../../test/fixtures/sample.epub'));

beforeEach(async () => {
  await prisma.job.deleteMany();
  await prisma.paragraph.deleteMany();
  await prisma.chapter.deleteMany();
  await prisma.book.deleteMany();
});

describe('ensureParagraphSummaries', () => {
  it('batch-generates summaries for a chapter and caches them', async () => {
    const { bookId } = await ingestUpload({ filename: 'sample.epub', bytes: fixture });
    const chapter = await prisma.chapter.findFirstOrThrow({
      where: { bookId },
      include: { paragraphs: { orderBy: { index: 'asc' } } },
    });

    const provider = new FakeLLMProvider({
      structured: (_p) => ({
        summaries: chapter.paragraphs.map((p, i) => ({ index: i, summary: `sum-${i}` })),
      }),
    });

    await ensureParagraphSummaries(chapter.id, provider);
    const reloaded = await prisma.chapter.findUniqueOrThrow({
      where: { id: chapter.id },
      include: { paragraphs: { orderBy: { index: 'asc' } } },
    });
    expect(reloaded.paragraphSummariesStatus).toBe('ready');
    expect(reloaded.paragraphs[0].summary).toBe('sum-0');

    await ensureParagraphSummaries(chapter.id, provider);
    expect(provider.calls.length).toBe(1); // second call is a no-op when status=ready
  });

  it('dedupes concurrent callers with an atomic status transition', async () => {
    const { bookId } = await ingestUpload({ filename: 'sample.epub', bytes: fixture });
    const chapter = await prisma.chapter.findFirstOrThrow({
      where: { bookId },
      include: { paragraphs: { orderBy: { index: 'asc' } } },
    });

    const provider = new FakeLLMProvider({
      structured: () => ({
        summaries: chapter.paragraphs.map((p) => ({ index: p.index, summary: `sum-${p.index}` })),
      }),
    });

    await Promise.all([
      ensureParagraphSummaries(chapter.id, provider),
      ensureParagraphSummaries(chapter.id, provider),
      ensureParagraphSummaries(chapter.id, provider),
    ]);
    expect(provider.calls.length).toBe(1);

    const reloaded = await prisma.chapter.findUniqueOrThrow({ where: { id: chapter.id } });
    expect(reloaded.paragraphSummariesStatus).toBe('ready');
  });

  it('marks failed when LLM returns fewer entries than paragraphs', async () => {
    const { bookId } = await ingestUpload({ filename: 'sample.epub', bytes: fixture });
    const chapter = await prisma.chapter.findFirstOrThrow({
      where: { bookId },
      include: { paragraphs: { orderBy: { index: 'asc' } } },
    });

    const provider = new FakeLLMProvider({
      structured: () => ({ summaries: [{ index: 0, summary: 'only first' }] }), // intentionally short
    });

    await expect(ensureParagraphSummaries(chapter.id, provider)).rejects.toThrow(/incomplete/);
    const reloaded = await prisma.chapter.findUniqueOrThrow({ where: { id: chapter.id } });
    expect(reloaded.paragraphSummariesStatus).toBe('failed');
    expect(reloaded.paragraphSummariesError).toMatch(/incomplete/);
  });
});
