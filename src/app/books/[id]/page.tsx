import { notFound } from 'next/navigation';
import { getBookForReader } from '@/lib/bookQueries';
import { ReaderClient } from './reader-client';

export const dynamic = 'force-dynamic';

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const book = await getBookForReader(id);
  if (!book) notFound();
  return <ReaderClient book={book} />;
}
