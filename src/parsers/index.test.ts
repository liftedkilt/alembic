import { describe, it, expect } from 'vitest';
import { pickParser } from '.';

describe('pickParser', () => {
  it('picks EPUB parser for PK bytes', () => {
    const buf = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
    expect(pickParser('book.epub', buf)?.format).toBe('epub');
  });
  it('picks PDF parser for %PDF- bytes', () => {
    expect(pickParser('x.pdf', Buffer.from('%PDF-1.4...'))?.format).toBe('pdf');
  });
  it('picks MOBI parser by BOOKMOBI signature', () => {
    const buf = Buffer.alloc(80);
    buf.write('BOOKMOBI', 60);
    expect(pickParser('x.mobi', buf)?.format).toBe('mobi');
  });
  it('falls back to extension when signature is ambiguous', () => {
    expect(pickParser('x.epub', Buffer.from([0x50, 0x4b, 0x03, 0x04]))?.format).toBe('epub');
  });
  it('returns null for unknown', () => {
    expect(pickParser('x.txt', Buffer.from('plain'))).toBeNull();
  });
});
