'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export type Theme = 'light' | 'dark' | 'sepia';
export type FontChoice = 'source-serif' | 'merriweather' | 'lora' | 'georgia' | 'system-sans';

export const FONT_FAMILIES: Record<FontChoice, string> = {
  'source-serif': '"Source Serif 4", ui-serif, Georgia, serif',
  merriweather: 'Merriweather, ui-serif, Georgia, serif',
  lora: 'Lora, ui-serif, Georgia, serif',
  georgia: 'Georgia, "Times New Roman", serif',
  'system-sans': 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
};

const FONT_LABELS: Record<FontChoice, string> = {
  'source-serif': 'Source Serif',
  merriweather: 'Merriweather',
  lora: 'Lora',
  georgia: 'Georgia',
  'system-sans': 'System Sans',
};

const SIZE_STEPS = [0.88, 0.94, 1, 1.08, 1.18, 1.3];

function readPref<T extends string>(key: string, fallback: T, allowed: readonly T[]): T {
  if (typeof window === 'undefined') return fallback;
  const v = localStorage.getItem(key);
  return v && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

function readScale(): number {
  if (typeof window === 'undefined') return 1;
  const v = Number(localStorage.getItem('alembic-font-scale'));
  return SIZE_STEPS.includes(v) ? v : 1;
}

export function applyPreferences(theme: Theme, font: FontChoice, scale: number) {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  html.classList.remove('dark', 'sepia');
  if (theme !== 'light') html.classList.add(theme);
  html.style.setProperty('--reader-font-family', FONT_FAMILIES[font]);
  html.style.setProperty('--reader-font-scale', String(scale));
}

export function ReadingPreferences() {
  const [theme, setTheme] = useState<Theme>('light');
  const [font, setFont] = useState<FontChoice>('source-serif');
  const [scale, setScale] = useState<number>(1);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = readPref<Theme>('alembic-theme', 'light', ['light', 'dark', 'sepia']);
    const f = readPref<FontChoice>('alembic-font', 'source-serif', [
      'source-serif',
      'merriweather',
      'lora',
      'georgia',
      'system-sans',
    ]);
    const s = readScale();
    setTheme(t);
    setFont(f);
    setScale(s);
    applyPreferences(t, f, s);
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function update(next: { theme?: Theme; font?: FontChoice; scale?: number }) {
    const nextTheme = next.theme ?? theme;
    const nextFont = next.font ?? font;
    const nextScale = next.scale ?? scale;
    if (next.theme !== undefined) {
      setTheme(nextTheme);
      localStorage.setItem('alembic-theme', nextTheme);
    }
    if (next.font !== undefined) {
      setFont(nextFont);
      localStorage.setItem('alembic-font', nextFont);
    }
    if (next.scale !== undefined) {
      setScale(nextScale);
      localStorage.setItem('alembic-font-scale', String(nextScale));
    }
    applyPreferences(nextTheme, nextFont, nextScale);
  }

  const scaleIndex = Math.max(0, SIZE_STEPS.indexOf(scale));

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Reading preferences"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-sans text-muted-foreground hover:text-primary hover:border-primary/50 transition"
      >
        Aa
      </button>
      {open && (
        <div
          role="dialog"
          className="absolute right-0 mt-2 w-64 rounded-lg border border-border bg-card p-4 shadow-lg z-20"
        >
          <div className="mb-3">
            <div className="mb-1.5 text-[0.65rem] font-sans uppercase tracking-[0.2em] text-muted-foreground">
              Theme
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {(['light', 'sepia', 'dark'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => update({ theme: t })}
                  className={cn(
                    'rounded-md border px-2 py-1.5 text-xs font-sans capitalize transition',
                    theme === t
                      ? 'border-primary bg-accent text-accent-foreground'
                      : 'border-border hover:border-primary/50',
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <div className="mb-1.5 text-[0.65rem] font-sans uppercase tracking-[0.2em] text-muted-foreground">
              Font
            </div>
            <select
              value={font}
              onChange={(e) => update({ font: e.target.value as FontChoice })}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm font-sans focus:outline-none focus:border-primary"
            >
              {(Object.keys(FONT_LABELS) as FontChoice[]).map((f) => (
                <option key={f} value={f} style={{ fontFamily: FONT_FAMILIES[f] }}>
                  {FONT_LABELS[f]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between text-[0.65rem] font-sans uppercase tracking-[0.2em] text-muted-foreground">
              <span>Size</span>
              <span className="normal-case tracking-normal text-[0.7rem]">{Math.round(scale * 100)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => update({ scale: SIZE_STEPS[Math.max(0, scaleIndex - 1)] })}
                disabled={scaleIndex === 0}
                className="rounded-md border border-border px-2 py-1 text-sm font-sans disabled:opacity-40 hover:border-primary/50"
                aria-label="Smaller"
              >
                A−
              </button>
              <div className="flex-1 flex items-center gap-1">
                {SIZE_STEPS.map((s, i) => (
                  <div
                    key={s}
                    className={cn(
                      'h-1 flex-1 rounded-full transition',
                      i <= scaleIndex ? 'bg-primary' : 'bg-muted',
                    )}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => update({ scale: SIZE_STEPS[Math.min(SIZE_STEPS.length - 1, scaleIndex + 1)] })}
                disabled={scaleIndex === SIZE_STEPS.length - 1}
                className="rounded-md border border-border px-2 py-1 text-sm font-sans disabled:opacity-40 hover:border-primary/50"
                aria-label="Larger"
              >
                A+
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
