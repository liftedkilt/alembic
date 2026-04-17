import Link from 'next/link';
import { cn } from '@/lib/utils';
import { BookCardMenu } from './BookCardMenu';

type BookCardProps = {
  id: string;
  title: string;
  author: string | null;
  status: string;
};

const statusLabel: Record<string, string> = {
  uploaded: 'Queued',
  parsing: 'Parsing…',
  summarizing: 'Summarizing…',
  ready: 'Ready',
  failed: 'Failed',
  partial: 'Partial',
};

export function BookCard({ id, title, author, status }: BookCardProps) {
  return (
    <div className="relative">
      <div className="absolute top-3 right-3 z-10"><BookCardMenu id={id} /></div>
      <Link
        href={`/books/${id}`}
        className="group block rounded-lg border border-border bg-card p-5 transition hover:border-primary/60 hover:shadow-sm"
      >
        <div className="aspect-[2/3] w-full rounded-md bg-gradient-to-br from-accent to-muted mb-4 flex items-center justify-center">
          <span className="font-serif text-3xl text-primary/70 px-4 text-center line-clamp-5">{title}</span>
        </div>
        <div className="font-serif text-lg leading-tight line-clamp-2">{title}</div>
        {author && <div className="text-sm text-muted-foreground mt-1">{author}</div>}
        <div
          className={cn(
            'mt-3 inline-flex items-center text-xs px-2 py-0.5 rounded-full',
            status === 'ready' && 'bg-accent text-accent-foreground',
            status === 'failed' && 'bg-destructive/10 text-destructive',
            status !== 'ready' && status !== 'failed' && 'bg-muted text-muted-foreground',
          )}
        >
          {statusLabel[status] ?? status}
        </div>
      </Link>
    </div>
  );
}
