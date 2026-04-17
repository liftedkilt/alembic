import { describe, it, expect } from 'vitest';
import { isTrivialParagraph, isTrivialChapter } from './triviality';

describe('isTrivialParagraph', () => {
  it('empty string is trivial', () => {
    expect(isTrivialParagraph('')).toBe(true);
    expect(isTrivialParagraph('   \n  ')).toBe(true);
  });

  it('fragment without sentence end is trivial', () => {
    expect(isTrivialParagraph('THERE AND BACK AGAIN')).toBe(true);
    expect(isTrivialParagraph('Houghton Mifflin Harcourt')).toBe(true);
  });

  it('single sentence is trivial', () => {
    expect(isTrivialParagraph('He went home.')).toBe(true);
    expect(isTrivialParagraph('The dragon is dead and diminished.')).toBe(true);
  });

  it('two or more sentences are not trivial', () => {
    expect(isTrivialParagraph('He went home. She followed him.')).toBe(false);
    expect(isTrivialParagraph('First thing happened. Then the next. And a third.')).toBe(false);
  });

  it('image markers are trivial (no summary needed)', () => {
    expect(isTrivialParagraph('[[IMG:/api/books/abc/images/map.png]]')).toBe(true);
  });

  it('long single sentence over the length cap is NOT trivial', () => {
    const long = 'A '.repeat(120) + 'very long run-on sentence with no stop until the end.';
    expect(isTrivialParagraph(long)).toBe(false);
  });
});

describe('isTrivialChapter', () => {
  it('empty is trivial', () => {
    expect(isTrivialChapter([])).toBe(true);
  });

  it('all-trivial short paragraphs make a trivial chapter', () => {
    expect(isTrivialChapter(['THERE AND BACK AGAIN', 'Houghton Mifflin Harcourt'])).toBe(true);
  });

  it('one non-trivial paragraph disqualifies the chapter', () => {
    expect(isTrivialChapter(['Title.', 'A long story with many sentences. More than one. A third one here.'])).toBe(false);
  });

  it('sum-length cap disqualifies a chapter of many short fragments', () => {
    const many = Array.from({ length: 40 }, () => 'Some short fragment');
    expect(isTrivialChapter(many)).toBe(false);
  });
});
