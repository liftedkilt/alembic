'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function RetryBanner({ bookId, status, message }: { bookId: string; status: string; message: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function retry() {
    setErr(null);
    start(async () => {
      const res = await fetch(`/api/books/${bookId}/regenerate`, { method: 'POST' });
      if (!res.ok) {
        setErr((await res.json()).error ?? 'Failed to restart summarization');
        return;
      }
      router.refresh();
    });
  }

  const label = status === 'partial' ? 'Some chapter summaries are missing.' : 'Summary generation failed.';
  return (
    <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 text-sm p-3">
      <div className="font-medium text-destructive">{label}</div>
      {message && <div className="mt-1 text-muted-foreground">{message}</div>}
      <button
        onClick={retry}
        disabled={pending}
        className="mt-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
      >
        {pending ? 'Restarting…' : 'Retry'}
      </button>
      {err && <div className="mt-2 text-xs text-destructive">{err}</div>}
    </div>
  );
}
