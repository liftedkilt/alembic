import { NextResponse } from 'next/server';
import { rm } from 'node:fs/promises';
import { prisma } from '@/lib/db';
import { storagePath } from '@/lib/storage';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (origin && host && !origin.endsWith(host)) {
    return NextResponse.json({ error: 'cross-origin' }, { status: 403 });
  }
  const { id } = await params;
  const book = await prisma.book.findUnique({ where: { id } });
  if (!book) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const dir = storagePath('books', id);
  await rm(dir, { recursive: true, force: true });
  await prisma.book.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
