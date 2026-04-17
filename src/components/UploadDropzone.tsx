'use client';

import { useRef, useState, useTransition } from 'react';
import { uploadBook } from '@/app/actions/upload';
import { cn } from '@/lib/utils';

export function UploadDropzone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit(file: File) {
    setError(null);
    const fd = new FormData();
    fd.set('file', file);
    start(async () => {
      const res = await uploadBook(fd);
      if (res.error) setError(res.error);
    });
  }

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const f = e.dataTransfer.files[0];
        if (f) submit(f);
      }}
      className={cn(
        'block cursor-pointer rounded-lg border-2 border-dashed p-10 text-center transition-colors',
        drag ? 'border-primary bg-accent' : 'border-border hover:border-primary/60',
        pending && 'opacity-60 pointer-events-none',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".epub,.pdf,.mobi,.azw,.azw3"
        className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) submit(f); }}
      />
      <div className="text-lg font-medium">{pending ? 'Uploading…' : 'Drop an EPUB, PDF, or MOBI here'}</div>
      <div className="text-sm text-muted-foreground mt-1">or click to choose</div>
      {error && <div className="mt-3 text-sm text-destructive">{error}</div>}
    </label>
  );
}
