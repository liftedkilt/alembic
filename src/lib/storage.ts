import path from 'node:path';

export const STORAGE_ROOT = path.resolve(process.env.STORAGE_ROOT || path.resolve(process.cwd(), 'storage'));

export function storagePath(...parts: string[]): string {
  for (const p of parts) if (p.includes('\0')) throw new Error('null byte in path');
  if (parts.length === 0 || parts.some((p) => p === '')) throw new Error('empty path component');
  const joined = path.join(STORAGE_ROOT, ...parts);
  const resolved = path.resolve(joined);
  if (!resolved.startsWith(STORAGE_ROOT + path.sep)) {
    throw new Error(`path escapes storage root: ${resolved}`);
  }
  return resolved;
}
