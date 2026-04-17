import { z } from 'zod';
import { LLMProvider, GenerateOpts } from './provider';

export interface FakeScript {
  text?: (prompt: string) => string;
  structured?: (prompt: string) => unknown;
}

export class FakeLLMProvider implements LLMProvider {
  name = 'fake';
  public calls: { prompt: string; kind: 'text' | 'structured' }[] = [];

  constructor(private script: FakeScript = {}) {}

  async generate(prompt: string, _opts?: GenerateOpts): Promise<string> {
    this.calls.push({ prompt, kind: 'text' });
    return this.script.text ? this.script.text(prompt) : `FAKE_SUMMARY(${prompt.length} chars)`;
  }

  async generateStructured<T>(prompt: string, schema: z.ZodSchema<T>, _opts?: GenerateOpts): Promise<T> {
    this.calls.push({ prompt, kind: 'structured' });
    const raw = this.script.structured
      ? this.script.structured(prompt)
      : { summaries: [] };
    return schema.parse(raw);
  }
}
