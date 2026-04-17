import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOllama } from 'ollama-ai-provider';
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { LLMProvider } from './provider';
import { AiSdkProvider } from './ai-sdk';

export async function buildProviderFromSettings(): Promise<LLMProvider> {
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  const keys = safeParseKeys(settings.apiKeys);
  const { llmProvider: provider, llmModel: modelId, baseUrl } = settings;

  switch (provider) {
    case 'openai': {
      const apiKey = keys.openai ? decrypt(keys.openai) : undefined;
      const client = createOpenAI({ apiKey, baseURL: baseUrl ?? undefined });
      return new AiSdkProvider(`openai:${modelId}`, client(modelId));
    }
    case 'anthropic': {
      const apiKey = keys.anthropic ? decrypt(keys.anthropic) : undefined;
      const client = createAnthropic({ apiKey });
      return new AiSdkProvider(`anthropic:${modelId}`, client(modelId));
    }
    case 'google': {
      const apiKey = keys.google ? decrypt(keys.google) : undefined;
      const client = createGoogleGenerativeAI({ apiKey });
      return new AiSdkProvider(`google:${modelId}`, client(modelId));
    }
    case 'ollama': {
      const client = createOllama({ baseURL: baseUrl ?? 'http://localhost:11434/api' });
      return new AiSdkProvider(`ollama:${modelId}`, client(modelId));
    }
    case 'openai-compatible': {
      const apiKey = keys['openai-compatible'] ? decrypt(keys['openai-compatible']) : undefined;
      const client = createOpenAI({ apiKey, baseURL: baseUrl ?? undefined });
      return new AiSdkProvider(`compat:${modelId}`, client(modelId));
    }
    default:
      throw new Error(`Unknown LLM provider: ${provider}`);
  }
}

function safeParseKeys(raw: string): Record<string, string> {
  try {
    const v = JSON.parse(raw);
    return typeof v === 'object' && v ? v : {};
  } catch {
    return {};
  }
}
