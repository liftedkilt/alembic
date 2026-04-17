'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { SummaryNode, SummaryNodeData } from '@/components/SummaryNode';
import { RetryBanner } from '@/components/RetryBanner';
import { isTrivialParagraph } from '@/lib/triviality';

type ChapterLite = {
  id: string;
  index: number;
  title: string;
  summary: string | null;
  isTrivial: boolean;
  paragraphSummariesStatus: string;
  paragraphs?: { id: string; index: number; summary: string | null; fullText: string }[];
};

type ApiParagraphs = {
  status: string;
  paragraphs: { id: string; index: number; summary: string | null; fullText: string }[];
};

export function ReaderClient({
  book,
}: {
  book: {
    id: string;
    title: string;
    author: string | null;
    bookSummary: string | null;
    status: string;
    statusError: string | null;
    chapters: ChapterLite[];
  };
}) {
  const [chapterState, setChapterState] = useState<
    Record<string, { loading: boolean; error: string | null; paragraphs?: ApiParagraphs['paragraphs'] }>
  >({});

  const fetchChapter = useCallback(async (chId: string) => {
    let alreadyFetching = false;
    setChapterState((s) => {
      if (s[chId]?.paragraphs || s[chId]?.loading) {
        alreadyFetching = true;
        return s;
      }
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
      setChapterState((s) => ({
        ...s,
        [chId]: { loading: false, error: null, paragraphs: data.paragraphs },
      }));
    } catch (e) {
      setChapterState((s) => ({
        ...s,
        [chId]: { loading: false, error: e instanceof Error ? e.message : 'failed' },
      }));
    }
  }, []);

  const retryChapter = useCallback(
    (chId: string) => {
      setChapterState((s) => {
        const next = { ...s };
        delete next[chId];
        return next;
      });
      void fetchChapter(chId);
    },
    [fetchChapter],
  );

  const paragraphNode = (p: { summary: string | null; fullText: string }): SummaryNodeData => {
    if (!p.summary || p.summary === p.fullText || isTrivialParagraph(p.fullText)) {
      return { kind: 'leaf', text: p.fullText };
    }
    return {
      kind: 'branch',
      heading: 'paragraph',
      summary: p.summary,
      children: [{ kind: 'leaf', text: p.fullText }],
    };
  };

  const chapterNode = (ch: ChapterLite): SummaryNodeData => {
    if (ch.isTrivial) {
      const paragraphs = ch.paragraphs ?? [];
      return {
        kind: 'section',
        label: `Chapter ${ch.index + 1}`,
        children: paragraphs.map((p) => paragraphNode(p)),
      };
    }
    const state = chapterState[ch.id];
    return {
      kind: 'branch',
      heading: 'chapter',
      label: `Chapter ${ch.index + 1}`,
      summary: ch.summary,
      loading: state?.loading,
      error: state?.error,
      onExpand: () => fetchChapter(ch.id),
      onRetry: () => retryChapter(ch.id),
      children: (state?.paragraphs ?? []).map<SummaryNodeData>(paragraphNode),
    };
  };

  const tree: SummaryNodeData = {
    kind: 'branch',
    heading: 'book',
    summary: book.bookSummary,
    children: book.chapters.map(chapterNode),
  };

  return (
    <>
      <main className="mx-auto max-w-[64ch] px-6 pb-24 pt-12">
        <div className="mb-10">
          <Link
            href="/"
            className="text-xs font-sans uppercase tracking-[0.22em] text-muted-foreground hover:text-primary transition-colors"
          >
            ← Library
          </Link>
        </div>

        <header className="mb-14 text-center">
          <h1 className="font-serif text-3xl sm:text-4xl leading-tight text-foreground">
            {book.title}
          </h1>
          {book.author && (
            <div className="mt-3 font-serif italic text-muted-foreground">{book.author}</div>
          )}
          {(book.status === 'summarizing' ||
            book.status === 'uploaded' ||
            book.status === 'parsing') && (
            <div className="mt-6 text-sm font-sans text-muted-foreground">
              Generating summaries…
            </div>
          )}
          {(book.status === 'failed' || book.status === 'partial') && (
            <div className="mt-6 text-left">
              <RetryBanner bookId={book.id} status={book.status} message={book.statusError} />
            </div>
          )}
        </header>

        <article>
          <SummaryNode node={tree} />
        </article>
      </main>
    </>
  );
}
