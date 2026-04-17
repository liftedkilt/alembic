'use client';

import { ChevronRight } from 'lucide-react';

export function Breadcrumb({ parts }: { parts: string[] }) {
  return (
    <nav className="text-sm text-muted-foreground flex items-center flex-wrap gap-1">
      {parts.map((p, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="size-3" />}
          <span className={i === parts.length - 1 ? 'text-foreground' : ''}>{p}</span>
        </span>
      ))}
    </nav>
  );
}
