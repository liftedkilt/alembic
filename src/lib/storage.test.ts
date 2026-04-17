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
  it('rejects null byte', () => {
    expect(() => storagePath('book\0.txt')).toThrow();
  });
  it('rejects empty parts and empty input', () => {
    expect(() => storagePath()).toThrow();
    expect(() => storagePath('')).toThrow();
    expect(() => storagePath('books', '')).toThrow();
  });
  it('rejects sibling-prefix escape', () => {
    const sibling = STORAGE_ROOT + '-evil/foo';
    // ask for a path that would resolve into a sibling of STORAGE_ROOT via ..
    expect(() => storagePath('..', path.basename(STORAGE_ROOT) + '-evil', 'foo')).toThrow();
    void sibling;
  });
});
