import { z } from 'zod';

export interface GenerateOpts {
  maxTokens?: number;
  temperature?: number;
}

export interface LLMProvider {
  name: string;
  generate(prompt: string, opts?: GenerateOpts): Promise<string>;
  generateStructured<T>(prompt: string, schema: z.ZodSchema<T>, opts?: GenerateOpts): Promise<T>;
}
