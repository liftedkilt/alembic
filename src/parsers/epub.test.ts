import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { EpubParser } from './epub';

const fixture = readFileSync(path.resolve(__dirname, '../../test/fixtures/sample.epub'));

describe('EpubParser', () => {
  const p = new EpubParser();

  it('canParse returns true for EPUB bytes (PK magic)', () => {
    expect(p.canParse(fixture)).toBe(true);
  });

  it('parses title and chapters from fixture', async () => {
    const book = await p.parse(fixture);
    expect(book.title.length).toBeGreaterThan(0);
    expect(book.chapters.length).toBeGreaterThan(1);
    for (const ch of book.chapters) {
      expect(ch.title).toBeDefined();
      expect(Array.isArray(ch.paragraphs)).toBe(true);
    }
  });
});
