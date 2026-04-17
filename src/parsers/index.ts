import { Parser } from './types';
import { EpubParser } from './epub';
import { PdfParser } from './pdf';
import { MobiParser } from './mobi';

export * from './types';
export { EpubParser, PdfParser, MobiParser };

const parsers: Parser[] = [new EpubParser(), new PdfParser(), new MobiParser()];

export function pickParser(filename: string, buf: Buffer): Parser | null {
  for (const p of parsers) if (p.canParse(buf)) return p;
  const ext = filename.toLowerCase().split('.').pop();
  if (ext === 'epub') return new EpubParser();
  if (ext === 'pdf') return new PdfParser();
  if (ext === 'mobi' || ext === 'azw' || ext === 'azw3') return new MobiParser();
  return null;
}
