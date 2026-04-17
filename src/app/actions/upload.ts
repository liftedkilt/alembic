'use server';

import { revalidatePath } from 'next/cache';
import { ingestUpload } from '@/lib/ingest';

export async function uploadBook(formData: FormData): Promise<{ bookId?: string; error?: string }> {
  const file = formData.get('file');
  if (!(file instanceof File)) return { error: 'No file provided' };
  const bytes = Buffer.from(await file.arrayBuffer());
  try {
    const { bookId } = await ingestUpload({ filename: file.name, bytes });
    revalidatePath('/');
    return { bookId };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Upload failed' };
  }
}
