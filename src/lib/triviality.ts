const TRIVIAL_PARAGRAPH_MAX_LENGTH = 200;
const TRIVIAL_CHAPTER_MAX_LENGTH = 600;

export function isTrivialParagraph(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith('[[IMG:')) return true;
  if (trimmed.length > TRIVIAL_PARAGRAPH_MAX_LENGTH) return false;
  const sentenceEnds = trimmed.match(/[.!?](\s|$)/g);
  return !sentenceEnds || sentenceEnds.length <= 1;
}

export function isTrivialChapter(paragraphs: string[]): boolean {
  if (paragraphs.length === 0) return true;
  const totalLen = paragraphs.reduce((n, p) => n + p.length, 0);
  if (totalLen > TRIVIAL_CHAPTER_MAX_LENGTH) return false;
  return paragraphs.every(isTrivialParagraph);
}
