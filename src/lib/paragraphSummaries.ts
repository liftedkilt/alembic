import { z } from 'zod';
import { prisma } from './db';
import { LLMProvider } from '@/llm/provider';
import { paragraphSummariesPrompt } from '@/llm/prompts/paragraphSummaries';

const ResponseSchema = z.object({
  summaries: z.array(z.object({ index: z.number().int().nonnegative(), summary: z.string() })),
});

export async function ensureParagraphSummaries(chapterId: string, provider: LLMProvider): Promise<void> {
  const chapter = await prisma.chapter.findUniqueOrThrow({
    where: { id: chapterId },
    include: { paragraphs: { orderBy: { index: 'asc' } } },
  });
  if (chapter.paragraphSummariesStatus === 'ready') return;

  const claimed = await prisma.chapter.updateMany({
    where: { id: chapterId, paragraphSummariesStatus: { notIn: ['generating', 'ready'] } },
    data: { paragraphSummariesStatus: 'generating', paragraphSummariesError: null },
  });
  if (claimed.count === 0) {
    // Another caller is already generating (or just finished). Don't duplicate work.
    return;
  }

  try {
    // Paragraphs that already have a summary (trivial ones, pre-filled at ingest)
    // don't need the LLM. Only send the rest.
    const needsSummary = chapter.paragraphs.filter((p) => !p.summary);

    if (needsSummary.length === 0) {
      await prisma.chapter.update({
        where: { id: chapterId },
        data: { paragraphSummariesStatus: 'ready' },
      });
      return;
    }

    const prompt = paragraphSummariesPrompt({
      title: chapter.title,
      paragraphs: needsSummary.map((p) => p.fullText),
    });
    const res = await provider.generateStructured(prompt, ResponseSchema);

    // Response indices are 0..needsSummary.length-1 (local to the request).
    const byLocalIndex = new Map(res.summaries.map((s) => [s.index, s.summary]));
    const missing = needsSummary
      .map((_, i) => i)
      .filter((i) => !byLocalIndex.has(i) || (byLocalIndex.get(i) ?? '').trim().length === 0);
    if (missing.length > 0) {
      throw new Error(`LLM returned incomplete paragraph summaries; missing ${missing.length}/${needsSummary.length}`);
    }
    await prisma.$transaction(
      needsSummary.map((p, i) =>
        prisma.paragraph.update({
          where: { id: p.id },
          data: { summary: byLocalIndex.get(i) ?? null },
        }),
      ),
    );
    await prisma.chapter.update({
      where: { id: chapterId },
      data: { paragraphSummariesStatus: 'ready' },
    });
  } catch (e) {
    await prisma.chapter.update({
      where: { id: chapterId },
      data: {
        paragraphSummariesStatus: 'failed',
        paragraphSummariesError: e instanceof Error ? e.message : String(e),
      },
    });
    throw e;
  }
}
