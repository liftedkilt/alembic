'use client';

import { Fragment, type ReactNode } from 'react';

const IMG_MARKER_RE = /\[\[IMG:([^|\]]+)(?:\|([^\]]*))?\]\]/g;

export function RichText({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;

  for (const m of text.matchAll(IMG_MARKER_RE)) {
    const start = m.index ?? 0;
    if (start > last) {
      nodes.push(<TextRun key={key++} html={text.slice(last, start)} />);
    }
    const src = m[1];
    const alt = m[2] ?? '';
    nodes.push(
      <figure key={key++} className="my-6">
        { }
        <img src={src} alt={alt} className="mx-auto max-w-full rounded-sm" />
        {alt && (
          <figcaption className="mt-2 text-center text-xs font-sans text-muted-foreground">{alt}</figcaption>
        )}
      </figure>,
    );
    last = start + m[0].length;
  }
  if (last < text.length) nodes.push(<TextRun key={key++} html={text.slice(last)} />);
  if (nodes.length === 0) nodes.push(<TextRun key={key++} html={text} />);

  return <Fragment>{nodes}</Fragment>;
}

function TextRun({ html }: { html: string }) {
  const trimmed = html.trim();
  if (!trimmed) return null;
  // The parser has already sanitized the HTML down to a known inline
  // whitelist (em/strong/i/b/small/sub/sup/cite/q/mark/u). Anything else
  // was discarded at ingest, so innerHTML is safe here.
  return (
    <p
      className="font-serif text-[1.05rem] leading-[1.75] text-foreground"
      dangerouslySetInnerHTML={{ __html: trimmed }}
    />
  );
}
