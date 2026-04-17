'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Breadcrumb } from '@/components/Breadcrumb';
import { SummaryNode, SummaryNodeData } from '@/components/SummaryNode';
import { RetryBanner } from '@/components/RetryBanner';

type ChapterLite = { id: string; index: number; title: string; summary: string | null; paragraphSummariesStatus: string };

type ApiParagraphs = { status: string; paragraphs: { id: string; index: number; summary: string | null; fullText: string }[] };

export function ReaderClient({
  book,
}: {
  book: { id: string; title: string; author: string | null; bookSummary: string | null; status: string; statusError: string | null; chapters: ChapterLite[] };
}) {
  const [chapterState, setChapterState] = useState<Record<string, { loading: boolean; error: string | null; paragraphs?: ApiParagraphs['paragraphs'] }>>({});

  const fetchChapter = useCallback(async (chId: string) => {
    let alreadyFetching = false;
    setChapterState((s) => {
      if (s[chId]?.paragraphs || s[chId]?.loading) { alreadyFetching = true; return s; }
      return { ...s, [chId]: { loading: true, error: null } };
    });
    if (alreadyFetching) return;

    try {
      const head = await fetch(`/api/chapters/${chId}/summaries`, { method: 'GET' });
      let data: ApiParagraphs = await head.json();
      if (data.status !== 'ready') {
        const gen = await fetch(`/api/chapters/${chId}/summaries`, { method: 'POST' });
        if (!gen.ok) throw new Error((await gen.json()).error ?? 'Failed to generate summaries');
        data = await gen.json();
      }
      setChapterState((s) => ({ ...s, [chId]: { loading: false, error: null, paragraphs: data.paragraphs } }));
    } catch (e) {
      setChapterState((s) => ({ ...s, [chId]: { loading: false, error: e instanceof Error ? e.message : 'failed' } }));
    }
  }, []);

  const retryChapter = useCallback((chId: string) => {
    setChapterState((s) => {
      const next = { ...s };
      delete next[chId];
      return next;
    });
    void fetchChapter(chId);
  }, [fetchChapter]);

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
        onRetry: () => retryChapter(ch.id),
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
        {(book.status === 'summarizing' || book.status === 'uploaded' || book.status === 'parsing') && (
          <div className="mt-4 text-sm rounded-md bg-accent text-accent-foreground p-3">
            Generating summaries… refresh in a moment.
          </div>
        )}
        {(book.status === 'failed' || book.status === 'partial') && (
          <RetryBanner bookId={book.id} status={book.status} message={book.statusError} />
        )}
        <div className="mt-6"><Link href="/" className="text-sm text-muted-foreground hover:text-primary">← Library</Link></div>
      </header>

      <section className="space-y-2">
        <SummaryNode node={tree} />
      </section>
    </main>
  );
}
