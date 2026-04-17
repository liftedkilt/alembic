import { prisma } from '@/lib/db';
import { UploadDropzone } from '@/components/UploadDropzone';
import { BookCard } from '@/components/BookCard';

export const dynamic = 'force-dynamic';

export default async function LibraryPage() {
  const books = await prisma.book.findMany({ orderBy: { uploadedAt: 'desc' } });

  return (
    <main className="container max-w-5xl py-10">
      <header className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-serif text-4xl text-primary">Alembic</h1>
          <p className="text-muted-foreground mt-1">Your library, distilled.</p>
        </div>
        <a href="/settings" className="text-sm text-muted-foreground hover:text-primary">Settings →</a>
      </header>

      <section className="mb-10">
        <UploadDropzone />
      </section>

      <section>
        {books.length === 0 ? (
          <p className="text-muted-foreground">No books yet — upload one above.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {books.map((b) => (
              <BookCard key={b.id} id={b.id} title={b.title} author={b.author} status={b.status} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
