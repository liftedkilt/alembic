import { describe, it, expect } from 'vitest';
import { stripInlineMarkdown } from './text';

describe('stripInlineMarkdown', () => {
  it('removes single-asterisk emphasis', () => {
    expect(stripInlineMarkdown('*Tolkien* wrote *The Hobbit*.')).toBe('Tolkien wrote The Hobbit.');
  });

  it('removes double-asterisk bold', () => {
    expect(stripInlineMarkdown('This is **important** and **bold**.')).toBe('This is important and bold.');
  });

  it('removes underscore emphasis but preserves word-internal underscores', () => {
    expect(stripInlineMarkdown('He said _hello_ to her.')).toBe('He said hello to her.');
    expect(stripInlineMarkdown('snake_case_identifier stays intact.')).toBe('snake_case_identifier stays intact.');
  });

  it('removes backtick code', () => {
    expect(stripInlineMarkdown('Use the `cn()` helper.')).toBe('Use the cn() helper.');
  });

  it('preserves standalone asterisks used as bullets or punctuation', () => {
    expect(stripInlineMarkdown('A * B = C')).toBe('A * B = C');
  });

  it('leaves non-emphasized prose unchanged', () => {
    expect(stripInlineMarkdown('Plain prose here. No markdown.')).toBe('Plain prose here. No markdown.');
  });
});
