import { NextRequest, NextResponse } from 'next/server';
import { ensureParagraphSummaries } from '@/lib/paragraphSummaries';
import { getChapterWithParagraphs } from '@/lib/bookQueries';
import { buildProviderFromSettings } from '@/llm/factory';

export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const provider = await buildProviderFromSettings();
    await ensureParagraphSummaries(id, provider);
    const ch = await getChapterWithParagraphs(id);
    if (!ch) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json({
      status: ch.paragraphSummariesStatus,
      paragraphs: ch.paragraphs.map((p) => ({ id: p.id, index: p.index, summary: p.summary, fullText: p.fullText })),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'failed' }, { status: 500 });
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ch = await getChapterWithParagraphs(id);
  if (!ch) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({
    status: ch.paragraphSummariesStatus,
    paragraphs: ch.paragraphs.map((p) => ({ id: p.id, index: p.index, summary: p.summary, fullText: p.fullText })),
  });
}
