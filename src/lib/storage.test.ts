import { describe, it, expect, beforeAll } from 'vitest';
import path from 'node:path';
import { storagePath, STORAGE_ROOT } from './storage';

describe('storagePath', () => {
  it('joins parts under STORAGE_ROOT', () => {
    const p = storagePath('books', 'abc', 'book.epub');
    expect(p).toBe(path.join(STORAGE_ROOT, 'books', 'abc', 'book.epub'));
  });
  it('rejects path traversal', () => {
    expect(() => storagePath('..', 'etc', 'passwd')).toThrow();
    expect(() => storagePath('books/../..')).toThrow();
  });
});
