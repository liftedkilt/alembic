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

async function pickSubstantiveChapter(bookId: string) {
  const chapters = await prisma.chapter.findMany({
    where: { bookId, isTrivial: false },
    include: { paragraphs: { orderBy: { index: 'asc' } } },
  });
  const ch = chapters.find((c) => c.paragraphs.some((p) => !p.summary));
  if (!ch) throw new Error('fixture has no non-trivial chapter with non-trivial paragraphs');
  return ch;
}

describe('ensureParagraphSummaries', () => {
  it('batch-generates summaries for non-trivial paragraphs and caches them', async () => {
    const { bookId } = await ingestUpload({ filename: 'sample.epub', bytes: fixture });
    const chapter = await pickSubstantiveChapter(bookId);
    const needs = chapter.paragraphs.filter((p) => !p.summary);

    const provider = new FakeLLMProvider({
      structured: () => ({
        summaries: needs.map((_, i) => ({ index: i, summary: `sum-${i}` })),
      }),
    });

    await ensureParagraphSummaries(chapter.id, provider);
    const reloaded = await prisma.chapter.findUniqueOrThrow({
      where: { id: chapter.id },
      include: { paragraphs: { orderBy: { index: 'asc' } } },
    });
    expect(reloaded.paragraphSummariesStatus).toBe('ready');
    // Every paragraph has a summary now (either pre-filled trivial, or LLM-filled).
    expect(reloaded.paragraphs.every((p) => p.summary !== null)).toBe(true);
    // The first paragraph that needed summarization got our fake output.
    const firstNeeding = reloaded.paragraphs.find((p) => p.id === needs[0].id);
    expect(firstNeeding?.summary).toBe('sum-0');

    await ensureParagraphSummaries(chapter.id, provider);
    expect(provider.calls.length).toBe(1); // second call is a no-op when status=ready
  });

  it('dedupes concurrent callers with an atomic status transition', async () => {
    const { bookId } = await ingestUpload({ filename: 'sample.epub', bytes: fixture });
    const chapter = await pickSubstantiveChapter(bookId);
    const needs = chapter.paragraphs.filter((p) => !p.summary);

    const provider = new FakeLLMProvider({
      structured: () => ({
        summaries: needs.map((_, i) => ({ index: i, summary: `sum-${i}` })),
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

  it('marks failed when LLM returns fewer entries than non-trivial paragraphs', async () => {
    const { bookId } = await ingestUpload({ filename: 'sample.epub', bytes: fixture });
    // Find a chapter with MORE than one non-trivial paragraph so a single-entry
    // response is genuinely short.
    const chapters = await prisma.chapter.findMany({
      where: { bookId, isTrivial: false },
      include: { paragraphs: { orderBy: { index: 'asc' } } },
    });
    const chapter = chapters.find((c) => c.paragraphs.filter((p) => !p.summary).length > 1);
    if (!chapter) throw new Error('fixture has no chapter with 2+ non-trivial paragraphs');

    const provider = new FakeLLMProvider({
      structured: () => ({ summaries: [{ index: 0, summary: 'only first' }] }),
    });

    await expect(ensureParagraphSummaries(chapter.id, provider)).rejects.toThrow(/incomplete/);
    const reloaded = await prisma.chapter.findUniqueOrThrow({ where: { id: chapter.id } });
    expect(reloaded.paragraphSummariesStatus).toBe('failed');
    expect(reloaded.paragraphSummariesError).toMatch(/incomplete/);
  });
});
