import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { storagePath } from '@/lib/storage';

const CONTENT_TYPE: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; name: string }> }) {
  const { id, name } = await params;
  if (!/^[A-Za-z0-9._-]+$/.test(id) || !/^[A-Za-z0-9._-]+$/.test(name)) {
    return NextResponse.json({ error: 'invalid path' }, { status: 400 });
  }
  const ext = path.extname(name).toLowerCase();
  const contentType = CONTENT_TYPE[ext] ?? 'application/octet-stream';

  try {
    const file = storagePath('books', id, 'images', name);
    const bytes = await readFile(file);
    const body = new Uint8Array(bytes);
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
}
