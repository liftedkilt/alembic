import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { ParsedBook, Parser, ParserError } from './types';
import { EpubParser } from './epub';

export class MobiParser implements Parser {
  format = 'mobi' as const;

  canParse(buf: Buffer): boolean {
    if (buf.length < 68) return false;
    return buf.slice(60, 68).toString('ascii') === 'BOOKMOBI';
  }

  async parse(buf: Buffer): Promise<ParsedBook> {
    // Strategy: convert MOBI -> EPUB via Calibre, then hand off to EpubParser.
    // (Pure-JS MOBI parsing is unreliable across Kindle variants; Calibre is widely available.)
    const tmp = await mkdtemp(path.join(os.tmpdir(), 'alembic-mobi-'));
    const inPath = path.join(tmp, 'in.mobi');
    const outPath = path.join(tmp, 'out.epub');
    try {
      await writeFile(inPath, buf);
      await runEbookConvert(inPath, outPath);
      const epubBuf = await readFile(outPath);
      return await new EpubParser().parse(epubBuf);
    } catch (e) {
      if (e instanceof ParserError) throw e;
      throw new ParserError(
        'Failed to parse MOBI. Install Calibre (https://calibre-ebook.com) so `ebook-convert` is available.',
        e,
      );
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  }
}

function runEbookConvert(src: string, dst: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ebook-convert', [src, dst], { stdio: 'ignore' });
    proc.on('error', reject);
    proc.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`ebook-convert exited with code ${code}`)),
    );
  });
}
