import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PdfParser } from './pdf';

const fixture = readFileSync(path.resolve(__dirname, '../../test/fixtures/sample.pdf'));

describe('PdfParser', () => {
  const p = new PdfParser();

  it('canParse returns true for %PDF- bytes', () => {
    expect(p.canParse(fixture)).toBe(true);
  });

  it('parses some chapters with paragraphs', async () => {
    const book = await p.parse(fixture);
    expect(book.title.length).toBeGreaterThan(0);
    expect(book.chapters.length).toBeGreaterThanOrEqual(1);
    const totalParas = book.chapters.reduce((n, c) => n + c.paragraphs.length, 0);
    expect(totalParas).toBeGreaterThan(5);
  });
});
