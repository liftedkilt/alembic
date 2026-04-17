export function chapterSummaryPrompt(input: { title: string; paragraphs: string[] }): string {
  const body = input.paragraphs.join('\n\n');
  return `Summarize this chapter in a single paragraph (3-5 sentences). Capture the key events, arguments, or developments in the author's voice and register.

Title: ${input.title}

---

${body}

---

Format: plain prose only. No Markdown (no asterisks, underscores, backticks, bullets, or headings).

Summary:`;
}
