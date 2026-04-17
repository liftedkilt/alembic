'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Breadcrumb } from '@/components/Breadcrumb';
import { SummaryNode, SummaryNodeData } from '@/components/SummaryNode';

type ChapterLite = { id: string; index: number; title: string; summary: string | null; paragraphSummariesStatus: string };

type ApiParagraphs = { status: string; paragraphs: { id: string; index: number; summary: string | null; fullText: string }[] };

export function ReaderClient({
  book,
}: {
  book: { id: string; title: string; author: string | null; bookSummary: string | null; status: string; chapters: ChapterLite[] };
}) {
  const [chapterState, setChapterState] = useState<Record<string, { loading: boolean; error: string | null; paragraphs?: ApiParagraphs['paragraphs'] }>>({});

  const fetchChapter = useCallback(async (chId: string) => {
    if (chapterState[chId]?.paragraphs) return;
    setChapterState((s) => ({ ...s, [chId]: { loading: true, error: null } }));
    try {
      const head = await fetch(`/api/chapters/${chId}/summaries`, { method: 'GET' });
      let data: ApiParagraphs = await head.json();
      if (data.status !== 'ready') {
        const gen = await fetch(`/api/chapters/${chId}/summaries`, { method: 'POST' });
        if (!gen.ok) throw new Error((await gen.json()).error ?? 'Failed to generate summaries');
        const refresh = await fetch(`/api/chapters/${chId}/summaries`, { method: 'GET' });
        data = await refresh.json();
      }
      setChapterState((s) => ({ ...s, [chId]: { loading: false, error: null, paragraphs: data.paragraphs } }));
    } catch (e) {
      setChapterState((s) => ({ ...s, [chId]: { loading: false, error: e instanceof Error ? e.message : 'failed' } }));
    }
  }, [chapterState]);

  const tree: SummaryNodeData = {
    kind: 'branch',
    label: 'Book',
    summary: book.bookSummary,
    children: book.chapters.map((ch) => {
      const state = chapterState[ch.id];
      return {
        kind: 'branch',
        label: `Chapter ${ch.index + 1}`,
        summary: ch.summary,
        loading: state?.loading,
        error: state?.error,
        onExpand: () => fetchChapter(ch.id),
        children: (state?.paragraphs ?? []).map<SummaryNodeData>((p) => ({
          kind: 'branch',
          label: `¶ ${p.index + 1}`,
          summary: p.summary,
          children: [{ kind: 'leaf', text: p.fullText }],
        })),
      };
    }),
  };

  return (
    <main className="container max-w-3xl py-8">
      <header className="mb-8">
        <Breadcrumb parts={['Library', book.title]} />
        <h1 className="font-serif text-3xl mt-3">{book.title}</h1>
        {book.author && <div className="text-muted-foreground mt-1">{book.author}</div>}
        {book.status !== 'ready' && book.status !== 'partial' && (
          <div className="mt-4 text-sm rounded-md bg-accent text-accent-foreground p-3">
            {book.status === 'summarizing' ? 'Generating summaries… refresh in a moment.' : `Status: ${book.status}`}
          </div>
        )}
        <div className="mt-6"><Link href="/" className="text-sm text-muted-foreground hover:text-primary">← Library</Link></div>
      </header>

      <section className="space-y-2">
        <SummaryNode node={tree} />
      </section>
    </main>
  );
}
