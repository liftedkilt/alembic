import { describe, it, expect } from 'vitest';
import { bookSummaryPrompt, chapterMiniSummaryPrompt } from './bookSummary';
import { chapterSummaryPrompt } from './chapterSummary';
import { paragraphSummariesPrompt } from './paragraphSummaries';

describe('prompt builders', () => {
  it('bookSummaryPrompt includes title, author, and chapter mini-summaries', () => {
    const p = bookSummaryPrompt({ title: 'T', author: 'A', chapterMiniSummaries: ['one', 'two'] });
    expect(p).toContain('T by A');
    expect(p).toContain('Chapter 1: one');
    expect(p).toContain('Chapter 2: two');
  });

  it('chapterSummaryPrompt joins paragraphs', () => {
    const p = chapterSummaryPrompt({ title: 'Ch', paragraphs: ['p1 content here', 'p2 content here'] });
    expect(p).toContain('Title: Ch');
    expect(p).toContain('p1 content here');
    expect(p).toContain('p2 content here');
  });

  it('paragraphSummariesPrompt numbers paragraphs and references the chapter title', () => {
    const p = paragraphSummariesPrompt({ title: 'Ch', paragraphs: ['aaa', 'bbb'] });
    expect(p).toContain('"Ch"');
    expect(p).toMatch(/\[0\] aaa/);
    expect(p).toMatch(/\[1\] bbb/);
  });
});
