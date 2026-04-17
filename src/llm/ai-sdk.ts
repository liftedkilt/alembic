import { generateText, generateObject } from 'ai';
import { z } from 'zod';
import { LLMProvider, GenerateOpts } from './provider';

export class AiSdkProvider implements LLMProvider {
  constructor(public readonly name: string, private model: any) {}

  async generate(prompt: string, opts?: GenerateOpts): Promise<string> {
    const { text } = await generateText({
      model: this.model,
      prompt,
      maxOutputTokens: opts?.maxTokens,
      temperature: opts?.temperature,
    });
    return text.trim();
  }

  async generateStructured<T>(prompt: string, schema: z.ZodSchema<T>, opts?: GenerateOpts): Promise<T> {
    const { object } = await generateObject({
      model: this.model,
      prompt,
      schema: schema as any,
      maxOutputTokens: opts?.maxTokens,
      temperature: opts?.temperature,
    });
    return object as T;
  }
}
