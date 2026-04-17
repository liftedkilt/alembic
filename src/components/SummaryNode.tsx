'use client';

import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { stripInlineMarkdown } from '@/lib/text';
import { RichText } from './RichText';

export interface LeafText {
  kind: 'leaf';
  text: string;
}

export interface SummaryBranch {
  kind: 'branch';
  summary: string | null;
  heading?: 'book' | 'chapter' | 'paragraph';
  label?: string;
  loading?: boolean;
  error?: string | null;
  onExpand?: () => void;
  onRetry?: () => void;
  children: SummaryNodeData[];
}

export interface SummarySection {
  kind: 'section';
  label: string;
  children: SummaryNodeData[];
}

export type SummaryNodeData = SummaryBranch | LeafText | SummarySection;

type Props = {
  node: SummaryNodeData;
  depth?: number;
  initiallyOpen?: boolean;
};

export function SummaryNode({ node, depth = 0, initiallyOpen = false }: Props) {
  const [open, setOpen] = useState(initiallyOpen);

  const handleToggle = useCallback(() => {
    if (node.kind !== 'branch') return;
    const next = !open;
    setOpen(next);
    if (next && node.onExpand) node.onExpand();
  }, [open, node]);

  if (node.kind === 'leaf') {
    return (
      <motion.div
        layout="position"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <LeafContent text={node.text} />
      </motion.div>
    );
  }

  if (node.kind === 'section') {
    return (
      <motion.div layout="position">
        <motion.div
          layout="position"
          className="mt-8 mb-3 text-center text-[0.65rem] font-sans uppercase tracking-[0.32em] text-muted-foreground/70"
        >
          {node.label}
        </motion.div>
        <div className="space-y-4">
          {node.children.map((child, i) => (
            <SummaryNode key={i} node={child} depth={depth + 1} />
          ))}
        </div>
      </motion.div>
    );
  }

  const isBook = node.heading === 'book';
  const isChapter = node.heading === 'chapter';
  const isParagraph = node.heading === 'paragraph';

  const summaryClasses = cn(
    'block w-full text-left font-serif cursor-pointer',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:rounded-sm',
    'transition-[color,opacity] duration-300',
    isBook && 'text-[1.15rem] leading-[1.75]',
    !isBook && 'text-[1.05rem] leading-[1.75]',
    !open && 'text-primary hover:text-primary/75',
    open && 'text-primary/45 hover:text-primary/65',
  );

  return (
    <motion.div layout="position">
      {isChapter && node.label && (
        <motion.div
          layout="position"
          className="mt-8 mb-3 text-center text-[0.65rem] font-sans uppercase tracking-[0.32em] text-muted-foreground/70"
        >
          {node.label}
        </motion.div>
      )}

      <motion.button
        layout="position"
        onClick={handleToggle}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!open) handleToggle();
          } else if (e.key === 'ArrowLeft' || e.key === 'Escape') {
            e.preventDefault();
            if (open) handleToggle();
          }
        }}
        className={summaryClasses}
        aria-expanded={open}
      >
        {node.summary ? (
          stripInlineMarkdown(node.summary)
        ) : (
          <span className="text-muted-foreground italic">Not summarized yet</span>
        )}
      </motion.button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div
              className={cn(
                'space-y-4',
                isBook && 'mt-4',
                isChapter && 'mt-3',
                isParagraph && 'mt-3',
              )}
            >
              {node.loading && (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="h-4 rounded bg-muted animate-pulse"
                      style={{ width: `${72 + ((i * 9) % 24)}%` }}
                    />
                  ))}
                </div>
              )}

              {node.error && (
                <div className="text-sm font-sans">
                  <div className="text-destructive">{node.error}</div>
                  {node.onRetry && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        node.onRetry!();
                      }}
                      className="mt-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
                    >
                      Retry
                    </button>
                  )}
                </div>
              )}

              {!node.loading &&
                !node.error &&
                node.children.map((child, i) => (
                  <SummaryNode key={i} node={child} depth={depth + 1} />
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function LeafContent({ text }: { text: string }) {
  return <RichText text={text} />;
}
