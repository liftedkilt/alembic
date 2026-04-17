import path from 'node:path';
import EPub from 'epub2';
import sanitizeHtml from 'sanitize-html';
import { ParsedBook, ParsedImage, Parser, ParserError } from './types';
import { splitParagraphs } from './splitParagraphs';

const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|svg)$/i;

// Inline formatting we keep when storing paragraph text. Structural tags
// (p, div, h*, li, blockquote, br) are converted to paragraph breaks before
// sanitize-html runs.
const INLINE_HTML_WHITELIST = ['em', 'strong', 'i', 'b', 'small', 'sub', 'sup', 'cite', 'q', 'mark', 'u'] as const;

export class EpubParser implements Parser {
  format = 'epub' as const;

  canParse(buf: Buffer): boolean {
    return buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;
  }

  async parse(buf: Buffer): Promise<ParsedBook> {
    try {
      const epub = await EPub.createAsync(buf as any);
      const title = epub.metadata.title ?? 'Untitled';
      const author = epub.metadata.creator;

      const coverBytes = await tryGetCover(epub);

      // href → manifest id (for resolving <img src>)
      const hrefToId = new Map<string, string>();
      const manifest = (epub as any).manifest as Record<string, { id: string; href: string }>;
      for (const entry of Object.values(manifest ?? {})) {
        hrefToId.set(entry.href, entry.id);
      }

      const images: ParsedImage[] = [];
      const hrefToFilename = new Map<string, string>();
      let imgSeq = 0;

      const chapters: ParsedBook['chapters'] = [];

      for (const item of epub.flow) {
        const raw: string = await new Promise((resolve, reject) => {
          (epub as any).getChapter(item.id, (err: Error | null, text: string) =>
            err ? reject(err) : resolve(text),
          );
        });

        const chapterDir = path.posix.dirname(item.href);
        const withImages = await replaceImagesWithMarkers({
          html: raw,
          chapterDir,
          hrefToId,
          hrefToFilename,
          getImage: (id) =>
            new Promise<Buffer>((resolve, reject) => {
              (epub as any).getImage(id, (err: Error | null, data: Buffer) =>
                err ? reject(err) : resolve(data),
              );
            }),
          onNewImage: (filename, bytes) => {
            images.push({ filename, bytes });
          },
          nextSeq: () => ++imgSeq,
        });

        const text = stripHtml(withImages);
        const paragraphs = splitParagraphs(text);
        if (paragraphs.length === 0) continue;
        chapters.push({ title: item.title ?? `Chapter ${chapters.length + 1}`, paragraphs });
      }

      if (chapters.length === 0) {
        throw new ParserError('EPUB produced no chapters with readable content');
      }
      return { title, author, coverBytes, images, chapters };
    } catch (e) {
      if (e instanceof ParserError) throw e;
      throw new ParserError('Failed to parse EPUB', e);
    }
  }
}

async function tryGetCover(epub: any): Promise<Buffer | undefined> {
  const coverId = epub.metadata?.cover;
  if (!coverId) return undefined;
  try {
    return await new Promise<Buffer>((resolve, reject) => {
      epub.getImage(coverId, (err: Error | null, data: Buffer) => (err ? reject(err) : resolve(data)));
    });
  } catch {
    return undefined;
  }
}

async function replaceImagesWithMarkers(opts: {
  html: string;
  chapterDir: string;
  hrefToId: Map<string, string>;
  hrefToFilename: Map<string, string>;
  getImage: (id: string) => Promise<Buffer>;
  onNewImage: (filename: string, bytes: Buffer) => void;
  nextSeq: () => number;
}): Promise<string> {
  const tagRe = /<img\b([^>]*?)\/?>/gi;
  const tasks: { index: number; length: number; replacement: string }[] = [];

  const matches = [...opts.html.matchAll(tagRe)];
  for (const m of matches) {
    const attrs = m[1] ?? '';
    const src = attrValue(attrs, 'src');
    if (!src) continue;
    if (/^(https?:|data:|mailto:)/i.test(src)) continue; // skip external / inline data URIs

    const resolved = path.posix.normalize(path.posix.join(opts.chapterDir, decodeURI(src)));
    let filename = opts.hrefToFilename.get(resolved);
    if (!filename) {
      const id = opts.hrefToId.get(resolved) ?? opts.hrefToId.get(src);
      if (!id) continue;
      try {
        const bytes = await opts.getImage(id);
        const ext = path.extname(resolved).toLowerCase() || guessExt(src) || '.bin';
        filename = `img-${String(opts.nextSeq()).padStart(4, '0')}${ext}`;
        opts.hrefToFilename.set(resolved, filename);
        opts.onNewImage(filename, bytes);
      } catch {
        continue;
      }
    }

    const alt = (attrValue(attrs, 'alt') ?? '').replace(/[|\]]/g, ' ').trim();
    const marker = `\n\n[[IMG:${filename}${alt ? `|${alt}` : ''}]]\n\n`;
    tasks.push({ index: m.index ?? 0, length: m[0].length, replacement: marker });
  }

  if (tasks.length === 0) return opts.html;

  // Splice replacements from back to front so indices remain valid.
  tasks.sort((a, b) => b.index - a.index);
  let out = opts.html;
  for (const t of tasks) {
    out = out.slice(0, t.index) + t.replacement + out.slice(t.index + t.length);
  }
  return out;
}

function attrValue(attrs: string, name: string): string | null {
  const m = attrs.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return m ? (m[1] ?? m[2] ?? m[3] ?? null) : null;
}

function guessExt(src: string): string | null {
  const m = src.match(IMAGE_EXT_RE);
  return m ? '.' + m[1].toLowerCase().replace('jpeg', 'jpg') : null;
}

function stripHtml(html: string): string {
  // 1. Drop scripts/styles wholesale.
  let out = html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '');
  // 2. Convert structural block boundaries to paragraph separators.
  out = out.replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, '\n\n');
  out = out.replace(/<(blockquote|hr)\b[^>]*>/gi, '\n\n');
  out = out.replace(/<br\s*\/?>/gi, '\n\n');
  // 3. Sanitize to the inline whitelist. sanitize-html also decodes entities.
  out = sanitizeHtml(out, {
    allowedTags: [...INLINE_HTML_WHITELIST],
    allowedAttributes: {},
    allowedSchemes: [],
    disallowedTagsMode: 'discard',
  });
  // 4. Collapse NBSPs that survived entity decoding.
  out = out.replace(/\u00a0/g, ' ');
  return out;
}
