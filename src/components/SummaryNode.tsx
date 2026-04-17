'use client';

import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LeafText {
  kind: 'leaf';
  text: string;
}

export interface SummaryBranch {
  kind: 'branch';
  summary: string | null;
  label?: string;
  loading?: boolean;
  error?: string | null;
  onExpand?: () => void;
  children: SummaryNodeData[];
}

export type SummaryNodeData = SummaryBranch | LeafText;

type Props = {
  node: SummaryNodeData;
  depth?: number;
};

export function SummaryNode({ node, depth = 0 }: Props) {
  const [open, setOpen] = useState(false);

  const handleToggle = useCallback(() => {
    if (node.kind !== 'branch') return;
    const next = !open;
    setOpen(next);
    if (next && node.onExpand) node.onExpand();
  }, [open, node]);

  if (node.kind === 'leaf') {
    return <p className="font-serif text-lg leading-relaxed">{node.text}</p>;
  }

  return (
    <motion.div
      layout="position"
      className={cn('rounded-lg', depth > 0 && 'border-l-2 border-border pl-4 ml-1')}
    >
      <button
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
        className={cn(
          'group w-full text-left py-3 px-1 transition-colors hover:text-primary flex items-start gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md',
          open && 'text-primary',
        )}
      >
        <ChevronDown
          className={cn('size-5 mt-1 shrink-0 transition-transform', open ? 'rotate-0' : '-rotate-90')}
        />
        <div className="flex-1">
          {node.label && <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{node.label}</div>}
          <div className={cn('font-serif leading-relaxed', depth === 0 ? 'text-xl' : 'text-base')}>
            {node.summary ?? <span className="text-muted-foreground italic">Not summarized yet</span>}
          </div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="pl-7 pb-3 space-y-2">
              {node.loading && (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-4 rounded bg-muted animate-pulse" />
                  ))}
                </div>
              )}
              {node.error && <div className="text-sm text-destructive">{node.error}</div>}
              {!node.loading && !node.error && node.children.map((child, i) => (
                <SummaryNode key={i} node={child} depth={depth + 1} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
