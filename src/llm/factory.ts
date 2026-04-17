import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOllama } from 'ollama-ai-provider';
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { LLMProvider } from './provider';
import { AiSdkProvider } from './ai-sdk';

// Summarization is a low-reasoning task — distilling text, not solving puzzles.
// Every major provider ships "thinking" modes that default to on (Google Gemini 2.5,
// OpenAI o-series / gpt-5) or get triggered at higher budgets. We opt out so a
// chapter summary doesn't spend 30s on internal deliberation.
const LOW_REASONING_PROVIDER_OPTIONS = {
  google: { thinkingConfig: { thinkingBudget: 0, includeThoughts: false } },
  openai: { reasoningEffort: 'none' },
  anthropic: {},
};

export async function buildProviderFromSettings(): Promise<LLMProvider> {
  // E2E escape hatch: never leaves a fingerprint in the Settings row, never makes
  // a network call. Deliberately returns empty structured output so paragraph-
  // summary generation fails — E2E tests cover the book + chapter path only.
  if (process.env.ALEMBIC_FAKE_LLM === '1') {
    const { FakeLLMProvider } = await import('./fake');
    return new FakeLLMProvider({
      text: (p) => (p.includes('ONE paragraph') ? 'A distilled overview of this book.' : 'A short chapter summary.'),
      structured: () => ({ summaries: [] }),
    });
  }

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
      return new AiSdkProvider(`openai:${modelId}`, client(modelId), LOW_REASONING_PROVIDER_OPTIONS);
    }
    case 'anthropic': {
      const apiKey = keys.anthropic ? decrypt(keys.anthropic) : undefined;
      const client = createAnthropic({ apiKey });
      return new AiSdkProvider(`anthropic:${modelId}`, client(modelId), LOW_REASONING_PROVIDER_OPTIONS);
    }
    case 'google': {
      const apiKey = keys.google ? decrypt(keys.google) : undefined;
      const client = createGoogleGenerativeAI({ apiKey });
      return new AiSdkProvider(`google:${modelId}`, client(modelId), LOW_REASONING_PROVIDER_OPTIONS);
    }
    case 'ollama': {
      const client = createOllama({ baseURL: baseUrl ?? 'http://localhost:11434/api' });
      return new AiSdkProvider(`ollama:${modelId}`, client(modelId));
    }
    case 'openai-compatible': {
      const apiKey = keys['openai-compatible'] ? decrypt(keys['openai-compatible']) : undefined;
      const client = createOpenAI({ apiKey, baseURL: baseUrl ?? undefined });
      return new AiSdkProvider(`compat:${modelId}`, client(modelId), LOW_REASONING_PROVIDER_OPTIONS);
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
