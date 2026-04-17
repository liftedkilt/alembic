export function paragraphSummariesPrompt(input: { title: string; paragraphs: string[] }): string {
  const numbered = input.paragraphs.map((p, i) => `[${i}] ${p}`).join('\n\n');
  return `For each numbered paragraph below from the chapter "${input.title}", write a single concise sentence (<= 20 words) that captures its point. Return a JSON object matching the schema { summaries: [{ index, summary }] } with one entry per input paragraph, in order.

Each summary must be plain prose: no Markdown (no asterisks, underscores, backticks), no quotation marks wrapping the whole sentence, no leading labels.

${numbered}`;
}
