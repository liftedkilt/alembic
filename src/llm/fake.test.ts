import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { FakeLLMProvider } from './fake';

describe('FakeLLMProvider', () => {
  it('records text calls and returns default output', async () => {
    const f = new FakeLLMProvider();
    const r = await f.generate('hello world prompt text');
    expect(r).toMatch(/^FAKE_SUMMARY/);
    expect(f.calls).toHaveLength(1);
    expect(f.calls[0].kind).toBe('text');
  });

  it('validates structured output against schema', async () => {
    const f = new FakeLLMProvider({
      structured: () => ({ summaries: [{ index: 0, summary: 'a' }] }),
    });
    const schema = z.object({ summaries: z.array(z.object({ index: z.number(), summary: z.string() })) });
    const r = await f.generateStructured('x', schema);
    expect(r.summaries[0].summary).toBe('a');
  });

  it('throws when structured output is malformed', async () => {
    const f = new FakeLLMProvider({ structured: () => ({ wrong: true }) });
    const schema = z.object({ summaries: z.array(z.string()) });
    await expect(f.generateStructured('x', schema)).rejects.toThrow();
  });
});
