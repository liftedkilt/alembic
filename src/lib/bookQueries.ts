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
          paragraphSummariesStatus: true,
        },
      },
    },
  });
  return book;
}

export async function getChapterWithParagraphs(chapterId: string) {
  return prisma.chapter.findUnique({
    where: { id: chapterId },
    include: { paragraphs: { orderBy: { index: 'asc' } } },
  });
}
