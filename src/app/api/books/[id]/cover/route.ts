import { readFile } from 'node:fs/promises';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

function sniff(bytes: Buffer): string {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 6 && bytes.slice(0, 6).toString('ascii') === 'GIF89a') return 'image/gif';
  if (bytes.length >= 6 && bytes.slice(0, 6).toString('ascii') === 'GIF87a') return 'image/gif';
  if (bytes.length >= 12 && bytes.slice(0, 4).toString('ascii') === 'RIFF' && bytes.slice(8, 12).toString('ascii') === 'WEBP')
    return 'image/webp';
  const head = bytes.slice(0, 256).toString('ascii');
  if (head.trimStart().startsWith('<svg') || head.includes('<?xml')) return 'image/svg+xml';
  return 'application/octet-stream';
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }
  const book = await prisma.book.findUnique({ where: { id }, select: { coverPath: true } });
  if (!book?.coverPath) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  try {
    const bytes = await readFile(book.coverPath);
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        'Content-Type': sniff(bytes),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
}
