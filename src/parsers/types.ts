export interface ParsedChapter {
  title: string;
  paragraphs: string[];
}

export interface ParsedImage {
  filename: string;
  bytes: Buffer;
}

export interface ParsedBook {
  title: string;
  author?: string;
  coverBytes?: Buffer;
  images?: ParsedImage[];
  chapters: ParsedChapter[];
}

export interface Parser {
  format: 'epub' | 'pdf' | 'mobi';
  canParse(buf: Buffer): boolean;
  parse(buf: Buffer): Promise<ParsedBook>;
}

export class ParserError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
  }
}
