'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MoreVertical } from 'lucide-react';

export function BookCardMenu({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  function doAction(path: string, method: 'POST' | 'DELETE') {
    setOpen(false);
    start(async () => {
      await fetch(path, { method });
      router.refresh();
    });
  }

  return (
    <div className="relative" onClick={(e) => e.preventDefault()}>
      <button
        onClick={(e) => { e.preventDefault(); setOpen((o) => !o); }}
        className="p-1 rounded hover:bg-muted"
        aria-label="Book actions"
      >
        <MoreVertical className="size-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-7 z-10 bg-card border border-border rounded-md shadow-md py-1 text-sm min-w-40">
          <button disabled={pending} onClick={() => doAction(`/api/books/${id}/regenerate`, 'POST')} className="w-full text-left px-3 py-1.5 hover:bg-muted">Regenerate</button>
          <button disabled={pending} onClick={() => { if (confirm('Delete this book?')) doAction(`/api/books/${id}`, 'DELETE'); }} className="w-full text-left px-3 py-1.5 hover:bg-muted text-destructive">Delete</button>
        </div>
      )}
    </div>
  );
}
