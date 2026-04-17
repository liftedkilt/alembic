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

  await prisma.chapter.update({
    where: { id: chapterId },
    data: { paragraphSummariesStatus: 'generating', paragraphSummariesError: null },
  });

  try {
    const prompt = paragraphSummariesPrompt({
      title: chapter.title,
      paragraphs: chapter.paragraphs.map((p) => p.fullText),
    });
    const res = await provider.generateStructured(prompt, ResponseSchema);

    const byIndex = new Map(res.summaries.map((s) => [s.index, s.summary]));
    await prisma.$transaction(
      chapter.paragraphs.map((p) =>
        prisma.paragraph.update({
          where: { id: p.id },
          data: { summary: byIndex.get(p.index) ?? null },
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
