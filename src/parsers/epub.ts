import EPub from 'epub2';
import { ParsedBook, Parser, ParserError } from './types';
import { splitParagraphs } from './splitParagraphs';

export class EpubParser implements Parser {
  format = 'epub' as const;

  canParse(buf: Buffer): boolean {
    // EPUB = zip = "PK\x03\x04"
    return buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;
  }

  async parse(buf: Buffer): Promise<ParsedBook> {
    try {
      const epub = await EPub.createAsync(buf as any);
      const title = epub.metadata.title ?? 'Untitled';
      const author = epub.metadata.creator;
      const chapters: ParsedBook['chapters'] = [];

      let coverBytes: Buffer | undefined;
      const coverId = (epub as any).metadata?.cover;
      if (coverId) {
        try {
          coverBytes = await new Promise<Buffer>((resolve, reject) => {
            (epub as any).getImage(coverId, (err: Error | null, data: Buffer) =>
              err ? reject(err) : resolve(data),
            );
          });
        } catch { /* cover optional */ }
      }

      for (const item of epub.flow) {
        const html: string = await new Promise((resolve, reject) => {
          (epub as any).getChapter(item.id, (err: Error | null, text: string) =>
            err ? reject(err) : resolve(text),
          );
        });
        const text = stripHtml(html);
        const paragraphs = splitParagraphs(text);
        if (paragraphs.length === 0) continue;
        chapters.push({ title: item.title ?? `Chapter ${chapters.length + 1}`, paragraphs });
      }

      if (chapters.length === 0) {
        throw new ParserError('EPUB produced no chapters with readable content');
      }
      return { title, author, coverBytes, chapters };
    } catch (e) {
      if (e instanceof ParserError) throw e;
      throw new ParserError('Failed to parse EPUB', e);
    }
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/(p|div|h[1-6]|li|br)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}
