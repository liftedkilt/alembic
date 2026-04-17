import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { saveSettings } from './actions';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

beforeEach(async () => {
  await prisma.settings.deleteMany();
});

function makeFormData(obj: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(obj)) fd.set(k, v);
  return fd;
}

describe('saveSettings', () => {
  it('rejects when model is missing', async () => {
    const r = await saveSettings(makeFormData({ provider: 'openai', model: '' }));
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/model/i);
  });

  it('encrypts and stores the api key on first save', async () => {
    const r = await saveSettings(makeFormData({
      provider: 'openai', model: 'gpt-4o-mini', apiKey: 'sk-secret-123', baseUrl: '',
    }));
    expect(r.ok).toBe(true);

    const s = await prisma.settings.findUniqueOrThrow({ where: { id: 1 } });
    expect(s.llmProvider).toBe('openai');
    expect(s.llmModel).toBe('gpt-4o-mini');
    expect(s.baseUrl).toBeNull();

    const keys = JSON.parse(s.apiKeys) as Record<string, string>;
    expect(keys.openai).toBeDefined();
    expect(keys.openai).not.toBe('sk-secret-123');
    expect(decrypt(keys.openai)).toBe('sk-secret-123');
  });

  it('preserves existing api keys when the apiKey input is blank', async () => {
    await saveSettings(makeFormData({
      provider: 'openai', model: 'gpt-4o-mini', apiKey: 'sk-original', baseUrl: '',
    }));
    const beforeRow = await prisma.settings.findUniqueOrThrow({ where: { id: 1 } });
    const beforeKeys = JSON.parse(beforeRow.apiKeys) as Record<string, string>;

    const r = await saveSettings(makeFormData({
      provider: 'openai', model: 'gpt-4o-preview', apiKey: '', baseUrl: '',
    }));
    expect(r.ok).toBe(true);

    const after = await prisma.settings.findUniqueOrThrow({ where: { id: 1 } });
    const afterKeys = JSON.parse(after.apiKeys) as Record<string, string>;
    expect(afterKeys.openai).toBe(beforeKeys.openai);
    expect(after.llmModel).toBe('gpt-4o-preview');
  });

  it('namespaces api keys per provider', async () => {
    await saveSettings(makeFormData({
      provider: 'openai', model: 'gpt-4o-mini', apiKey: 'sk-openai', baseUrl: '',
    }));
    await saveSettings(makeFormData({
      provider: 'anthropic', model: 'claude-sonnet-4-6', apiKey: 'sk-anth', baseUrl: '',
    }));

    const s = await prisma.settings.findUniqueOrThrow({ where: { id: 1 } });
    const keys = JSON.parse(s.apiKeys) as Record<string, string>;
    expect(decrypt(keys.openai)).toBe('sk-openai');
    expect(decrypt(keys.anthropic)).toBe('sk-anth');
  });

  it('stores baseUrl when provided and null when blank', async () => {
    await saveSettings(makeFormData({
      provider: 'ollama', model: 'llama3.1', apiKey: '', baseUrl: 'http://localhost:11434/api',
    }));
    const s1 = await prisma.settings.findUniqueOrThrow({ where: { id: 1 } });
    expect(s1.baseUrl).toBe('http://localhost:11434/api');

    await saveSettings(makeFormData({
      provider: 'ollama', model: 'llama3.1', apiKey: '', baseUrl: '   ',
    }));
    const s2 = await prisma.settings.findUniqueOrThrow({ where: { id: 1 } });
    expect(s2.baseUrl).toBeNull();
  });
});
