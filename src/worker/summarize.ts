import { prisma } from '@/lib/db';
import { LLMProvider } from '@/llm/provider';
import { bookSummaryPrompt, chapterMiniSummaryPrompt } from '@/llm/prompts/bookSummary';
import { chapterSummaryPrompt } from '@/llm/prompts/chapterSummary';

const DEFAULT_MAX_ATTEMPTS = 3;
const BACKOFF_MS = [1_000, 4_000, 10_000];

async function withRetry<T>(fn: () => Promise<T>, max: number): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < max; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < max - 1) await new Promise((r) => setTimeout(r, BACKOFF_MS[Math.min(i, BACKOFF_MS.length - 1)]));
    }
  }
  throw lastErr;
}

export async function runSummarizeJob(
  jobId: string,
  provider: LLMProvider,
  opts: { maxAttempts?: number } = {},
): Promise<void> {
  const max = opts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const job = await prisma.job.findUniqueOrThrow({
    where: { id: jobId },
    include: {
      book: {
        include: {
          chapters: {
            include: { paragraphs: { orderBy: { index: 'asc' } } },
            orderBy: { index: 'asc' },
          },
        },
      },
    },
  });

  const book = job.book;
  try {
    const miniSummaries: string[] = [];
    for (const ch of book.chapters) {
      const first = ch.paragraphs[0]?.fullText ?? '';
      const last = ch.paragraphs.at(-1)?.fullText ?? first;
      const mini = await withRetry(
        () => provider.generate(chapterMiniSummaryPrompt({ title: ch.title, firstParagraph: first, lastParagraph: last })),
        max,
      );
      miniSummaries.push(mini);
    }

    const bookSummary = await withRetry(
      () => provider.generate(bookSummaryPrompt({
        title: book.title,
        author: book.author ?? undefined,
        chapterMiniSummaries: miniSummaries,
      })),
      max,
    );

    for (let i = 0; i < book.chapters.length; i++) {
      const ch = book.chapters[i];
      if (ch.summary) continue;
      const summary = await withRetry(
        () => provider.generate(chapterSummaryPrompt({ title: ch.title, paragraphs: ch.paragraphs.map((p) => p.fullText) })),
        max,
      );
      await prisma.chapter.update({ where: { id: ch.id }, data: { summary } });
    }

    await prisma.book.update({ where: { id: book.id }, data: { bookSummary, status: 'ready' } });
    await prisma.job.update({ where: { id: jobId }, data: { status: 'done', finishedAt: new Date() } });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const somePartial = await prisma.chapter.count({ where: { bookId: book.id, summary: { not: null } } });
    await prisma.book.update({
      where: { id: book.id },
      data: {
        status: somePartial > 0 ? 'partial' : 'failed',
        statusError: message,
      },
    });
    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'failed', error: message, finishedAt: new Date() },
    });
    throw e;
  }
}
