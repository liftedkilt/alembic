import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (origin && host && !origin.endsWith(host)) {
    return NextResponse.json({ error: 'cross-origin' }, { status: 403 });
  }
  const { id } = await params;
  const book = await prisma.book.findUnique({ where: { id } });
  if (!book) return NextResponse.json({ error: 'not found' }, { status: 404 });

  await prisma.$transaction([
    prisma.paragraph.updateMany({ where: { chapter: { bookId: id } }, data: { summary: null } }),
    prisma.chapter.updateMany({ where: { bookId: id }, data: { summary: null, paragraphSummariesStatus: 'pending', paragraphSummariesError: null } }),
    prisma.book.update({ where: { id }, data: { bookSummary: null, status: 'summarizing', statusError: null } }),
    prisma.job.create({ data: { bookId: id, type: 'summarize-book-and-chapters' } }),
  ]);

  return NextResponse.json({ ok: true });
}
