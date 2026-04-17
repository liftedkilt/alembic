export function bookSummaryPrompt(input: { title: string; author?: string; chapterMiniSummaries: string[] }): string {
  const byline = input.author ? ` by ${input.author}` : '';
  return `You are distilling a book into a single-paragraph summary for a reader who wants a clear overview before diving in.

Title: ${input.title}${byline}

Here are brief summaries of each chapter, in order:

${input.chapterMiniSummaries.map((s, i) => `Chapter ${i + 1}: ${s}`).join('\n')}

Write ONE paragraph (4-6 sentences) that captures what this book is about: its subject, its arc, its voice. No preamble, no "this book". Just the paragraph.`;
}

export function chapterMiniSummaryPrompt(input: { title: string; firstParagraph: string; lastParagraph: string }): string {
  return `Summarize the following chapter in 1-2 sentences. Focus on what happens or what it argues.

Title: ${input.title}

Opening: ${input.firstParagraph}

Closing: ${input.lastParagraph}

Summary:`;
}
