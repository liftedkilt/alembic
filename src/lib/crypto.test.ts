import { describe, it, expect, beforeAll } from 'vitest';
import { encrypt, decrypt } from './crypto';

beforeAll(() => {
  process.env.APP_ENCRYPTION_KEY = '0'.repeat(64); // 32-byte hex
});

describe('crypto', () => {
  it('roundtrips a string', () => {
    const plain = 'sk-abc-123';
    const cipher = encrypt(plain);
    expect(cipher).not.toBe(plain);
    expect(decrypt(cipher)).toBe(plain);
  });

  it('produces different ciphertext each call (random IV)', () => {
    const a = encrypt('same');
    const b = encrypt('same');
    expect(a).not.toBe(b);
  });

  it('throws on tampered ciphertext', () => {
    const c = encrypt('hello');
    const tampered = c.slice(0, -2) + (c.endsWith('a') ? 'b' : 'a');
    expect(() => decrypt(tampered)).toThrow();
  });

  it('rejects a non-hex key', () => {
    const prev = process.env.APP_ENCRYPTION_KEY;
    process.env.APP_ENCRYPTION_KEY = 'z'.repeat(64);
    expect(() => encrypt('anything')).toThrow(/hex/);
    process.env.APP_ENCRYPTION_KEY = prev;
  });
});
