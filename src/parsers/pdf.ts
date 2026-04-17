import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { ParsedBook, Parser, ParserError } from './types';
import { splitParagraphs } from './splitParagraphs';

export class PdfParser implements Parser {
  format = 'pdf' as const;

  canParse(buf: Buffer): boolean {
    return buf.length > 4 && buf.slice(0, 5).toString() === '%PDF-';
  }

  async parse(buf: Buffer): Promise<ParsedBook> {
    try {
      const doc = await getDocument({ data: new Uint8Array(buf), useSystemFonts: true }).promise;
      const metadata = await doc.getMetadata().catch(() => null);
      const info = (metadata?.info ?? {}) as Record<string, string>;
      const title = info.Title?.trim() || 'Untitled PDF';
      const author = info.Author?.trim() || undefined;

      const outline = await doc.getOutline().catch(() => null);
      const pageTexts: string[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        pageTexts.push(content.items.map((it: any) => ('str' in it ? it.str : '')).join(' '));
      }

      const chapters = outline && outline.length > 0
        ? await chaptersFromOutline(doc, outline, pageTexts)
        : heuristicChapters(pageTexts);

      if (chapters.length === 0) {
        throw new ParserError('PDF produced no chapters');
      }
      return { title, author, chapters };
    } catch (e) {
      if (e instanceof ParserError) throw e;
      throw new ParserError('Failed to parse PDF', e);
    }
  }
}

async function chaptersFromOutline(doc: any, outline: any[], pageTexts: string[]) {
  const marks: { title: string; page: number }[] = [];
  for (const item of outline) {
    try {
      const dest = typeof item.dest === 'string' ? await doc.getDestination(item.dest) : item.dest;
      if (!dest) continue;
      const ref = dest[0];
      const pageIndex = await doc.getPageIndex(ref);
      marks.push({ title: item.title.trim(), page: pageIndex });
    } catch {
      // skip malformed entry
    }
  }
  marks.sort((a, b) => a.page - b.page);
  const chapters = [];
  for (let i = 0; i < marks.length; i++) {
    const start = marks[i].page;
    const end = i + 1 < marks.length ? marks[i + 1].page : pageTexts.length;
    const text = pageTexts.slice(start, end).join('\n\n');
    const paragraphs = splitParagraphs(text);
    if (paragraphs.length > 0) chapters.push({ title: marks[i].title, paragraphs });
  }
  return chapters;
}

function heuristicChapters(pageTexts: string[]) {
  const fullText = pageTexts.join('\n\n');
  const re = /^\s*(chapter\s+\w+|part\s+\w+|prologue|epilogue|introduction)\s*$/gim;
  const splits: { title: string; start: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(fullText)) !== null) splits.push({ title: m[0].trim(), start: m.index });
  if (splits.length === 0) {
    const paragraphs = splitParagraphs(fullText);
    return paragraphs.length > 0 ? [{ title: 'Full text', paragraphs }] : [];
  }
  const chapters = [];
  for (let i = 0; i < splits.length; i++) {
    const start = splits[i].start;
    const end = i + 1 < splits.length ? splits[i + 1].start : fullText.length;
    const text = fullText.slice(start, end);
    const paragraphs = splitParagraphs(text);
    if (paragraphs.length > 0) chapters.push({ title: splits[i].title, paragraphs });
  }
  return chapters;
}
