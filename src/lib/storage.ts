import path from 'node:path';

export const STORAGE_ROOT = path.resolve(process.cwd(), 'storage');

export function storagePath(...parts: string[]): string {
  const joined = path.join(STORAGE_ROOT, ...parts);
  const resolved = path.resolve(joined);
  if (resolved !== STORAGE_ROOT && !resolved.startsWith(STORAGE_ROOT + path.sep)) {
    throw new Error(`path escapes storage root: ${resolved}`);
  }
  return resolved;
}
