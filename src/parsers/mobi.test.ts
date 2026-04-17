import { describe, it, expect } from 'vitest';
import { MobiParser } from './mobi';

describe('MobiParser', () => {
  const p = new MobiParser();

  it('canParse returns false for non-MOBI bytes', () => {
    expect(p.canParse(Buffer.from('hello world not a mobi'))).toBe(false);
  });

  it('canParse recognises BOOKMOBI signature', () => {
    const fake = Buffer.alloc(80);
    fake.write('BOOKMOBI', 60);
    expect(p.canParse(fake)).toBe(true);
  });
});
