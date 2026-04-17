'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const LABELS = ['Overview', 'Chapters', 'Paragraphs', 'Full text'] as const;

export function ZoomIndicator({ depth }: { depth: number }) {
  const clamped = Math.max(0, Math.min(depth, LABELS.length - 1));
  return (
    <div className="pointer-events-none fixed top-5 right-5 z-20 flex flex-col items-end gap-1.5 select-none">
      <div className="flex items-center gap-1">
        {LABELS.map((_, i) => (
          <motion.div
            key={i}
            animate={{
              backgroundColor:
                i <= clamped ? 'hsl(var(--primary))' : 'hsl(var(--border))',
              width: i === clamped ? 22 : 14,
            }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className={cn('h-[3px] rounded-full')}
          />
        ))}
      </div>
      <motion.div
        key={clamped}
        initial={{ opacity: 0, y: -2 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-[0.62rem] font-sans uppercase tracking-[0.22em] text-muted-foreground"
      >
        {LABELS[clamped]}
      </motion.div>
    </div>
  );
}
