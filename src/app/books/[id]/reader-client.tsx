'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { RetryBanner } from '@/components/RetryBanner';
import { RichText } from '@/components/RichText';
import { stripInlineMarkdown } from '@/lib/text';
import { isTrivialParagraph } from '@/lib/triviality';
import { cn } from '@/lib/utils';

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

type Branch = {
  kind: 'branch';
  id: string;
  depth: number;
  heading?: 'book' | 'chapter' | 'paragraph';
  label?: string;
  summary: string | null;
  loading?: boolean;
  error?: string | null;
  onExpand?: () => void;
  onRetry?: () => void;
  children: Node[];
};

type Leaf = { kind: 'leaf'; id: string; depth: number; text: string };

type Section = {
  kind: 'section';
  id: string;
  depth: number;
  label: string;
  children: Node[];
};

type Node = Branch | Leaf | Section;

type FlatItem =
  | { kind: 'summary'; id: string; depth: number; heading?: 'book' | 'chapter' | 'paragraph'; text: string; onToggle: () => void }
  | { kind: 'full'; id: string; depth: number; text: string }
  | { kind: 'label'; id: string; depth: number; text: string; onToggle?: () => void }
  | { kind: 'loading'; id: string; depth: number }
  | { kind: 'error'; id: string; depth: number; message: string; onRetry?: () => void };

function flatten(node: Node, expanded: Set<string>, out: FlatItem[]): void {
  if (node.kind === 'leaf') {
    out.push({ kind: 'full', id: node.id, depth: node.depth, text: node.text });
    return;
  }

  if (node.kind === 'section') {
    out.push({ kind: 'label', id: node.id + '#label', depth: node.depth, text: node.label });
    for (const c of node.children) flatten(c, expanded, out);
    return;
  }

  const isExpanded = expanded.has(node.id);
  const chapterLabel =
    node.heading === 'chapter' && node.label
      ? ({
          kind: 'label' as const,
          id: node.id + '#label',
          depth: node.depth,
          text: node.label,
          onToggle: isExpanded ? () => expanded && undefined : undefined,
        })
      : null;

  if (!isExpanded) {
    if (chapterLabel) out.push(chapterLabel);
    out.push({
      kind: 'summary',
      id: node.id,
      depth: node.depth,
      heading: node.heading,
      text: node.summary ?? '',
      onToggle: () => node.onExpand?.(), // wrap; actual toggle set below
    });
    return;
  }

  // Expanded branch: show the label (clickable to collapse), then children
  if (chapterLabel) out.push(chapterLabel);

  if (node.loading) {
    out.push({ kind: 'loading', id: node.id + '#loading', depth: node.depth + 1 });
    return;
  }
  if (node.error) {
    out.push({
      kind: 'error',
      id: node.id + '#error',
      depth: node.depth + 1,
      message: node.error,
      onRetry: node.onRetry,
    });
    return;
  }
  for (const c of node.children) flatten(c, expanded, out);
}

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
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [chapterState, setChapterState] = useState<
    Record<string, { loading: boolean; error: string | null; paragraphs?: ApiParagraphs['paragraphs'] }>
  >({});

  const toggle = useCallback((id: string, onExpand?: () => void) => {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else {
        next.add(id);
        if (onExpand) onExpand();
      }
      return next;
    });
  }, []);

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

  // Build the tree ---------------------------------------------------------

  const paragraphNode = (bookChId: string, p: { id: string; index: number; summary: string | null; fullText: string }): Node => {
    const id = `${bookChId}.p${p.index}`;
    if (!p.summary || p.summary === p.fullText || isTrivialParagraph(p.fullText)) {
      return { kind: 'leaf', id, depth: 3, text: p.fullText };
    }
    return {
      kind: 'branch',
      id,
      depth: 3,
      heading: 'paragraph',
      summary: p.summary,
      children: [{ kind: 'leaf', id: id + '#full', depth: 4, text: p.fullText }],
    };
  };

  const chapterNode = (ch: ChapterLite): Node => {
    const chId = `book.c${ch.index}`;
    if (ch.isTrivial) {
      const paragraphs = ch.paragraphs ?? [];
      return {
        kind: 'section',
        id: chId,
        depth: 1,
        label: `Chapter ${ch.index + 1}`,
        children: paragraphs.map((p) => paragraphNode(chId, p)),
      };
    }
    const state = chapterState[ch.id];
    return {
      kind: 'branch',
      id: chId,
      depth: 1,
      heading: 'chapter',
      label: `Chapter ${ch.index + 1}`,
      summary: ch.summary,
      loading: state?.loading,
      error: state?.error,
      onExpand: () => void fetchChapter(ch.id),
      onRetry: () => retryChapter(ch.id),
      children: (state?.paragraphs ?? []).map((p) => paragraphNode(chId, p)),
    };
  };

  const tree: Node = {
    kind: 'branch',
    id: 'book',
    depth: 0,
    heading: 'book',
    summary: book.bookSummary,
    children: book.chapters.map(chapterNode),
  };

  // Flatten ---------------------------------------------------------------

  const items: FlatItem[] = [];
  flatten(tree, expanded, items);

  // Override onToggle to use our state helper with correct onExpand hookup
  const resolveOnToggle = (node: Node, id: string): (() => void) => {
    if (node.kind !== 'branch') return () => {};
    const nodeOnExpand = node.onExpand;
    return () => toggle(id, nodeOnExpand);
  };

  // Walk the tree once more to fill in correct toggle handlers.
  const togglesByNodeId: Record<string, () => void> = {};
  const walk = (n: Node) => {
    if (n.kind === 'branch') {
      togglesByNodeId[n.id] = resolveOnToggle(n, n.id);
      n.children.forEach(walk);
    } else if (n.kind === 'section') {
      n.children.forEach(walk);
    }
  };
  walk(tree);

  const hydratedItems = items.map((it) => {
    if (it.kind === 'summary') {
      return { ...it, onToggle: togglesByNodeId[it.id] ?? (() => {}) };
    }
    if (it.kind === 'label' && it.id.endsWith('#label')) {
      const branchId = it.id.slice(0, -'#label'.length);
      const t = togglesByNodeId[branchId];
      if (t) return { ...it, onToggle: t };
    }
    return it;
  });

  const bookIsExpanded = expanded.has('book');

  return (
    <main className="mx-auto max-w-[64ch] px-6 pb-24 pt-12">
      <div className="mb-10">
        <Link
          href="/"
          className="text-xs font-sans uppercase tracking-[0.22em] text-muted-foreground hover:text-primary transition-colors"
        >
          ← Library
        </Link>
      </div>

      <header className="mb-12 text-center">
        <button
          onClick={() => toggle('book')}
          className="font-serif text-3xl sm:text-4xl leading-tight text-foreground hover:text-primary transition-colors"
          title={bookIsExpanded ? 'Collapse to overview' : 'Expand to chapters'}
        >
          {book.title}
        </button>
        {book.author && (
          <div className="mt-3 font-serif italic text-muted-foreground">{book.author}</div>
        )}
        {(book.status === 'summarizing' ||
          book.status === 'uploaded' ||
          book.status === 'parsing') && (
          <div className="mt-6 text-sm font-sans text-muted-foreground">Generating summaries…</div>
        )}
        {(book.status === 'failed' || book.status === 'partial') && (
          <div className="mt-6 text-left">
            <RetryBanner bookId={book.id} status={book.status} message={book.statusError} />
          </div>
        )}
      </header>

      <article className="space-y-4">
        <LayoutGroup>
          <AnimatePresence initial={false} mode="popLayout">
            {hydratedItems.map((item) => (
              <FlatItemView key={item.id} item={item} />
            ))}
          </AnimatePresence>
        </LayoutGroup>
      </article>
    </main>
  );
}

function FlatItemView({ item }: { item: FlatItem }) {
  const base = {
    layout: true as const,
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  };

  if (item.kind === 'summary') {
    const isBook = item.heading === 'book';
    return (
      <motion.button
        {...base}
        onClick={item.onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            item.onToggle();
          }
        }}
        className={cn(
          'block w-full text-left font-serif cursor-pointer',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:rounded-sm',
          'transition-colors duration-200 text-primary hover:text-primary/75',
          isBook ? 'text-[1.15rem] leading-[1.75]' : 'text-[1.05rem] leading-[1.75]',
        )}
        aria-expanded={false}
      >
        {stripInlineMarkdown(item.text)}
      </motion.button>
    );
  }

  if (item.kind === 'full') {
    return (
      <motion.div {...base}>
        <RichText text={item.text} />
      </motion.div>
    );
  }

  if (item.kind === 'label') {
    const clickable = Boolean(item.onToggle);
    return (
      <motion.div
        {...base}
        onClick={clickable ? item.onToggle : undefined}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        onKeyDown={(e) => {
          if (clickable && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            item.onToggle?.();
          }
        }}
        className={cn(
          'mt-6 mb-1 text-center text-[0.65rem] font-sans uppercase tracking-[0.32em] text-muted-foreground/70',
          clickable && 'cursor-pointer hover:text-primary transition-colors',
        )}
      >
        {item.text}
      </motion.div>
    );
  }

  if (item.kind === 'loading') {
    return (
      <motion.div {...base} className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-4 rounded bg-muted animate-pulse"
            style={{ width: `${72 + ((i * 9) % 24)}%` }}
          />
        ))}
      </motion.div>
    );
  }

  if (item.kind === 'error') {
    return (
      <motion.div {...base} className="text-sm font-sans">
        <div className="text-destructive">{item.message}</div>
        {item.onRetry && (
          <button
            onClick={item.onRetry}
            className="mt-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            Retry
          </button>
        )}
      </motion.div>
    );
  }

  return null;
}
