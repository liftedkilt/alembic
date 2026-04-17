'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { stripInlineMarkdown } from '@/lib/text';

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

export type SummaryNodeData = SummaryBranch | LeafText;

interface OpenRegistry {
  inc: (depth: number) => void;
  dec: (depth: number) => void;
}

const OpenRegistryContext = createContext<OpenRegistry | null>(null);

export function OpenRegistryProvider({
  registry,
  children,
}: {
  registry: OpenRegistry;
  children: React.ReactNode;
}) {
  return <OpenRegistryContext.Provider value={registry}>{children}</OpenRegistryContext.Provider>;
}

type Props = {
  node: SummaryNodeData;
  depth?: number;
  initiallyOpen?: boolean;
};

export function SummaryNode({ node, depth = 0, initiallyOpen = false }: Props) {
  const [open, setOpen] = useState(initiallyOpen);
  const registry = useContext(OpenRegistryContext);

  useEffect(() => {
    if (node.kind !== 'branch') return;
    if (!open) return;
    registry?.inc(depth);
    return () => registry?.dec(depth);
  }, [open, depth, node.kind, registry]);

  const handleToggle = useCallback(() => {
    if (node.kind !== 'branch') return;
    const next = !open;
    setOpen(next);
    if (next && node.onExpand) node.onExpand();
  }, [open, node]);

  if (node.kind === 'leaf') {
    return (
      <motion.p
        layout="position"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="font-serif text-[1.05rem] leading-[1.75] text-foreground"
      >
        {node.text}
      </motion.p>
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
          className="mt-12 mb-5 text-center text-[0.7rem] font-sans uppercase tracking-[0.28em] text-muted-foreground"
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
                'space-y-5',
                isBook && 'mt-6',
                isChapter && 'mt-5',
                isParagraph && 'mt-4',
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
