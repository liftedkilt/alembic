'use server';

import { prisma } from '@/lib/db';
import { encrypt } from '@/lib/crypto';
import { revalidatePath } from 'next/cache';

export async function saveSettings(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const provider = String(formData.get('provider') ?? 'openai');
  const model = String(formData.get('model') ?? '');
  const baseUrl = String(formData.get('baseUrl') ?? '').trim() || null;
  const apiKeyRaw = String(formData.get('apiKey') ?? '').trim();

  if (!model) return { ok: false, error: 'Model is required' };

  const existing = await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  const keys = safeParse(existing.apiKeys);
  if (apiKeyRaw) keys[provider] = encrypt(apiKeyRaw);

  await prisma.settings.update({
    where: { id: 1 },
    data: { llmProvider: provider, llmModel: model, apiKeys: JSON.stringify(keys), baseUrl },
  });
  revalidatePath('/settings');
  return { ok: true };
}

export async function testConnection(): Promise<{ ok: boolean; output?: string; error?: string }> {
  const { buildProviderFromSettings } = await import('@/llm/factory');
  try {
    const p = await buildProviderFromSettings();
    const result = await Promise.race<Promise<string> | Promise<never>>([
      p.generate('Respond with the single word: alembic.'),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('Timed out after 15s — check base URL and network')), 15_000)),
    ]);
    return { ok: true, output: result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'failed' };
  }
}

function safeParse(raw: string): Record<string, string> {
  try { const v = JSON.parse(raw); return typeof v === 'object' && v ? v : {}; } catch { return {}; }
}
