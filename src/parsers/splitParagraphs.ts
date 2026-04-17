export function splitParagraphs(text: string, opts: { minLength?: number } = {}): string[] {
  const min = opts.minLength ?? 20;
  return text
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n+/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length >= min);
}
