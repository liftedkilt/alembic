'use client';

import { useState, useTransition } from 'react';
import { saveSettings, testConnection } from './actions';

const PROVIDERS = ['openai', 'anthropic', 'google', 'ollama', 'openai-compatible'];

export function SettingsForm({ initial }: { initial: { provider: string; model: string; baseUrl: string | null } }) {
  const [pending, start] = useTransition();
  const [testOut, setTestOut] = useState<string | null>(null);
  const [testErr, setTestErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await saveSettings(fd);
      setSaved(r.ok);
      setTestErr(r.error ?? null);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-lg">
      <div className="space-y-1">
        <label className="text-sm font-medium block">Provider</label>
        <select name="provider" defaultValue={initial.provider} className="w-full rounded-md border border-input bg-background px-3 py-2">
          {PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium block">Model</label>
        <input name="model" defaultValue={initial.model} placeholder="e.g. gpt-4o-mini, claude-sonnet-4-6, llama3.1" className="w-full rounded-md border border-input bg-background px-3 py-2" />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium block">API key (leave blank to keep existing)</label>
        <input type="password" name="apiKey" className="w-full rounded-md border border-input bg-background px-3 py-2" autoComplete="off" />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium block">Base URL (optional — for Ollama / openai-compatible)</label>
        <input name="baseUrl" defaultValue={initial.baseUrl ?? ''} className="w-full rounded-md border border-input bg-background px-3 py-2" />
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-md bg-primary text-primary-foreground px-4 py-2 font-medium hover:opacity-90">
          {pending ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => start(async () => {
            setTestOut(null); setTestErr(null);
            const r = await testConnection();
            if (r.ok) setTestOut(r.output ?? ''); else setTestErr(r.error ?? 'failed');
          })}
          className="rounded-md border border-border px-4 py-2 font-medium hover:bg-muted"
        >
          Test connection
        </button>
      </div>

      {saved && <div className="text-sm text-primary">Saved.</div>}
      {testOut && <div className="text-sm rounded-md border border-border bg-card p-3">Model replied: <code>{testOut}</code></div>}
      {testErr && <div className="text-sm text-destructive">{testErr}</div>}
    </form>
  );
}
