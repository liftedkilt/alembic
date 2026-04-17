import { prisma } from './db';

export async function getBookForReader(id: string) {
  const book = await prisma.book.findUnique({
    where: { id },
    include: {
      chapters: {
        orderBy: { index: 'asc' },
        select: {
          id: true,
          index: true,
          title: true,
          summary: true,
          isTrivial: true,
          paragraphSummariesStatus: true,
          paragraphs: {
            orderBy: { index: 'asc' },
            select: { id: true, index: true, summary: true, fullText: true },
          },
        },
      },
    },
  });
  if (!book) return null;

  // Only ship paragraph bodies for trivial chapters — those render inline.
  // Non-trivial chapters load paragraphs lazily via the summaries API.
  return {
    ...book,
    chapters: book.chapters.map((ch) => ({
      ...ch,
      paragraphs: ch.isTrivial ? ch.paragraphs : undefined,
    })),
  };
}

export async function getChapterWithParagraphs(chapterId: string) {
  return prisma.chapter.findUnique({
    where: { id: chapterId },
    include: { paragraphs: { orderBy: { index: 'asc' } } },
  });
}
