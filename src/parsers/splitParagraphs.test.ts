import { describe, it, expect } from 'vitest';
import { splitParagraphs } from './splitParagraphs';

describe('splitParagraphs', () => {
  it('splits on blank lines', () => {
    const input = 'first paragraph of text.\n\nsecond paragraph of text.\n\nthird one goes here.';
    expect(splitParagraphs(input)).toEqual([
      'first paragraph of text.',
      'second paragraph of text.',
      'third one goes here.',
    ]);
  });
  it('handles CRLF', () => {
    const input = 'alpha beta gamma delta\r\n\r\nsecond one is here now';
    expect(splitParagraphs(input)).toEqual(['alpha beta gamma delta', 'second one is here now']);
  });
  it('drops paragraphs below minLength', () => {
    const input = 'short\n\nthis paragraph is obviously long enough to be kept.';
    expect(splitParagraphs(input, { minLength: 20 })).toEqual([
      'this paragraph is obviously long enough to be kept.',
    ]);
  });
  it('collapses runs of blank lines', () => {
    const input = 'one paragraph here lives\n\n\n\nanother here also exists';
    expect(splitParagraphs(input)).toEqual(['one paragraph here lives', 'another here also exists']);
  });
  it('trims internal whitespace and drops empty', () => {
    const input = '   \n\n  real content that is long enough here  \n\n   ';
    expect(splitParagraphs(input)).toEqual(['real content that is long enough here']);
  });
});
