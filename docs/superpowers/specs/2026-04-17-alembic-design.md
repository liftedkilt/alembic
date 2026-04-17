# Alembic — Design Spec

**Date:** 2026-04-17
**Status:** Approved (pending user spec review)

## 1. Purpose

Alembic is a web app for uploading e-books (EPUB, PDF, MOBI) and reading them through an LLM-generated hierarchical summary. The name refers to the classical distillation apparatus: the app distills a book into layered essences, letting the reader control how concentrated their view is at any point. Opening a book shows a single-paragraph summary of the whole work. Clicking any summary expands it into the next level down — chapter summaries, then paragraph summaries, then the original text. The goal is to let the reader move fluidly between a 10-second overview and the full prose, controlling the level of detail per-section.

## 2. Scope

**In scope:**
- Upload and parse EPUB, PDF, MOBI
- Hierarchical summarization: book → chapter → paragraph → full text
- In-place expanding reader UI (web, mobile-responsive, PWA-installable)
- Pluggable LLM backend with provider/model selection
- Single-user, local-first

**Out of scope (for now):**
- Multi-user accounts, sharing, sync
- Highlights, notes, bookmarks, reading progress
- Text-to-speech, translation
- Non-book formats (DOCX, HTML, plain text)

## 3. Tech Stack

- **Framework:** Next.js 15 (App Router) + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Animation:** Framer Motion
- **DB:** SQLite via Prisma
- **File storage:** local disk under `storage/books/<bookId>/`
- **LLM:** Vercel AI SDK
- **Background worker:** single long-running Node process that polls the `Job` table — separate process in the same repo, run via its own npm script (`npm run worker`)
- **PWA:** `next-pwa` or manual manifest + service worker

No Redis, no external queue, no separate API server — single-process simplicity for single-user.

## 4. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (PWA)                            │
│   React Server Components + Client Components (reader UI)        │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP / Server Actions
┌──────────────────────────▼──────────────────────────────────────┐
│                       Next.js Server                             │
│  ┌────────────┐  ┌────────────────┐  ┌───────────────────────┐  │
│  │ Upload API │  │ Reader queries │  │ Settings + on-demand  │  │
│  │            │  │  (Prisma)      │  │ paragraph-summary API │  │
│  └─────┬──────┘  └────────────────┘  └───────┬───────────────┘  │
│        │                                     │                   │
│        ▼                                     ▼                   │
│  ┌─────────────────────┐         ┌─────────────────────────┐    │
│  │ Parser registry     │         │ LLMProvider interface   │    │
│  │  epub | pdf | mobi  │         │  openai|anthropic|...   │    │
│  └─────────────────────┘         └─────────────────────────┘    │
│                      │                       │                   │
│                      ▼                       ▼                   │
│            ┌─────────────────────────────────────┐               │
│            │   SQLite (Prisma)                   │               │
│            │   books, chapters, paragraphs, jobs │               │
│            └─────────────────────────────────────┘               │
└──────────────────────────────────────────────────────────────────┘
                           ▲
                           │ polls
┌──────────────────────────┴──────────────────────────────────────┐
│        Background worker (same repo, separate process)           │
│  Picks up SummaryJob rows, generates book + chapter summaries    │
└──────────────────────────────────────────────────────────────────┘
```

## 5. Data Model (Prisma)

```prisma
model Book {
  id          String   @id @default(cuid())
  title       String
  author      String?
  format      String   // "epub" | "pdf" | "mobi"
  filePath    String   // absolute path under storage/
  coverPath   String?
  status      String   // "uploaded" | "parsing" | "summarizing" | "ready" | "failed"
  statusError String?
  bookSummary String?
  uploadedAt  DateTime @default(now())
  chapters    Chapter[]
  jobs        Job[]
}

model Chapter {
  id        String   @id @default(cuid())
  bookId    String
  index     Int
  title     String
  summary   String?
  book      Book     @relation(fields: [bookId], references: [id], onDelete: Cascade)
  paragraphs Paragraph[]
  paragraphSummariesStatus String @default("pending") // "pending"|"generating"|"ready"|"failed"
  @@index([bookId, index])
}

model Paragraph {
  id        String  @id @default(cuid())
  chapterId String
  index     Int
  fullText  String
  summary   String? // null until generated
  chapter   Chapter @relation(fields: [chapterId], references: [id], onDelete: Cascade)
  @@index([chapterId, index])
}

model Job {
  id        String   @id @default(cuid())
  bookId    String
  type      String   // "summarize-book-and-chapters"
  status    String   // "queued"|"running"|"done"|"failed"
  attempts  Int      @default(0)
  error     String?
  createdAt DateTime @default(now())
  startedAt DateTime?
  finishedAt DateTime?
  book      Book     @relation(fields: [bookId], references: [id], onDelete: Cascade)
}

model Settings {
  id          Int    @id @default(1)
  llmProvider String // "openai"|"anthropic"|"google"|"ollama"|"openai-compatible"
  llmModel    String
  apiKeys     String // JSON, AES-encrypted
  baseUrl     String? // for openai-compatible / ollama
}
```

Paragraph summaries are stored inline on the `Paragraph` row; `Chapter.paragraphSummariesStatus` records whether the batch-generation has run for that chapter.

## 6. File Parsing

A `Parser` interface produces a canonical output:

```ts
interface ParsedBook {
  title: string;
  author?: string;
  coverBytes?: Buffer;       // optional cover image
  chapters: Array<{
    title: string;
    paragraphs: string[];    // split and cleaned
  }>;
}

interface Parser {
  canParse(format: string, buf: Buffer): boolean;
  parse(buf: Buffer): Promise<ParsedBook>;
}
```

**Implementations:**
- `EpubParser` — `epub2` npm, uses native TOC for chapters
- `PdfParser` — `pdfjs-dist`, uses outline if present; otherwise heuristic split on "Chapter N", large-font headings, or page breaks
- `MobiParser` — pure-JS `mobi` npm first; if that fails, shell out to Calibre's `ebook-convert` (if installed on host) to produce EPUB, then run `EpubParser` on the result

**Paragraph splitting:** for each chapter's raw text, split on `\n\s*\n`, trim, drop empties and items under a minimum length (default 20 chars — configurable).

## 7. LLM Abstraction

```ts
interface LLMProvider {
  generate(prompt: string, opts?: { maxTokens?: number; temperature?: number }): Promise<string>;
  generateStructured<T>(prompt: string, schema: z.ZodSchema<T>): Promise<T>;
}
```

Implemented once with Vercel AI SDK; dispatches to `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`, `ollama-ai-provider`, etc. Provider + model + API key read from the `Settings` row at request time.

API keys encrypted at rest with AES-256-GCM using a key from `APP_ENCRYPTION_KEY` env var.

## 8. Summary Generation Pipeline

### Timing
- **On upload → background (worker picks up):** book summary + all chapter summaries
- **On-demand (first click into a chapter):** paragraph summaries for that chapter (batch — one LLM call for the whole chapter returning a summary per paragraph via structured output)

### Book summary (map-reduce)
1. For each chapter, ask LLM for a 1-2 sentence mini-summary using chapter title + first + last paragraphs (to keep tokens bounded)
2. Concatenate mini-summaries
3. Ask LLM to produce a single-paragraph summary of the whole book from the concatenated mini-summaries

### Chapter summaries
- For each chapter, send chapter title + all paragraphs (truncate at the model's context limit, keeping first 60% + last 20% if needed) and ask for a single-paragraph summary

### Paragraph summaries (lazy, per-chapter batch)
- When the user first clicks a chapter, call `generateStructured` with a schema:
  ```ts
  z.object({ summaries: z.array(z.object({ index: z.number(), summary: z.string() })) })
  ```
- Prompt includes the chapter's paragraphs numbered 1..N; response gives one sentence per paragraph
- Persist all at once; next open is instant

### Caching
All outputs land in the DB. Re-opening a book never regenerates anything unless the user explicitly asks to re-summarize (settings → "Regenerate" button per book).

### Prompt templates
Live in `src/llm/prompts/` — one file per summary level, each exporting a function that builds the prompt. Easy to A/B or override later.

## 9. UI — Reading View

### Layout
- Centered reading column, max-width ~72ch
- Serif body (e.g., Source Serif), sans-serif chrome (Inter)
- Generous leading and whitespace
- Sticky top bar with breadcrumbs: `Library › Book title › Chapter 4 › ¶12`
- Keyboard controls always visible on desktop (hint row in footer)

### Interaction
- Summary cards are clickable regions with subtle hover state
- Click → Framer Motion layout animation expands the card height, reveals children indented one step, parent collapses to a compact "pill" header that remains clickable to zoom back out
- Nested levels share the same component (`<SummaryNode>`) recursively — one component handles book / chapter / paragraph layers
- Full text (leaf level) renders without the clickable affordance; clicking its parent summary pill collapses it back

### Loading states
- Book status `parsing` / `summarizing`: library shows a spinner tile; opening shows a progress view ("Generating book + chapter summaries…") with live status
- Clicking into a chapter whose paragraph summaries aren't yet generated: inline skeleton placeholders per paragraph, replaced in-place when the batch resolves

### Keyboard
- `→` / Enter / Space: expand focused node
- `←` / Esc: collapse to parent
- `↑` / `↓`: move focus between sibling nodes
- `/`: open command palette (later; library v1 only has book list)

### Mobile
- Same UI; tap targets ≥44px; breadcrumb collapses to chevron+current-level label
- PWA manifest with dark icon set, installable via browser "Add to Home Screen"

## 10. Pages & API

- `/` — Library: grid of books (cover, title, author, status badge), upload dropzone (drag-and-drop + click)
- `/books/[id]` — Reader view
- `/settings` — LLM provider + model + API key inputs, "Test connection" button

API / server actions:
- `POST /api/upload` — multipart upload, returns `{ bookId }`; enqueues parse + summary jobs
- `GET  /api/books/[id]` — full book with chapters (no full paragraph text until needed)
- `GET  /api/books/[id]/chapters/[ci]` — chapter with paragraph summaries (triggers batch-gen if not ready)
- `GET  /api/books/[id]/chapters/[ci]/paragraphs/[pi]` — full paragraph text
- `POST /api/books/[id]/regenerate` — clear summaries + re-enqueue
- `DELETE /api/books/[id]` — remove book + files

## 11. Testing

- **Unit (Vitest):**
  - Each parser against a fixture file in `test/fixtures/`
  - Paragraph splitter edge cases (CRLF, Unicode, runs of blank lines)
  - Prompt builders (snapshot tests)
  - LLMProvider wrapper with a mock AI SDK model
- **Integration (Vitest + Prisma test DB):**
  - Upload → parse → summarize flow using a tiny text book and a `FakeLLMProvider` that returns deterministic strings
  - On-demand paragraph-summary batch
  - Regenerate flow wipes and repopulates
- **E2E (Playwright):**
  - Upload a fixture EPUB, wait for `ready`, open book, click through all three levels, verify full text appears
  - Settings page: change provider, test connection (mocked endpoint)

## 12. Error Handling

| Failure | Behavior |
|---------|----------|
| Upload parse error | Book row saved with `status=failed`, `statusError` set; library card shows error + "Re-upload" |
| MOBI parser fallback (no Calibre installed) | Clear error message in UI pointing user to install Calibre or convert first |
| LLM API key missing | Settings page shows prompt; summary jobs stay `queued` until key set |
| LLM call fails (network, 5xx) | Retry 3× with exponential backoff (1s, 4s, 10s). After that, `Job.status=failed`; book status becomes `partial` if some chapters succeeded, `failed` if none. Retry button in reader |
| LLM returns malformed structured output | Treat as transient, retry with a stricter "JSON only, no prose" system message |
| On-demand paragraph-summary fails | Toast + inline "Retry" per chapter; user can still read full text |

## 13. Security / Privacy

- API keys encrypted at rest (AES-256-GCM, key in env)
- Uploaded book files never leave the server except as prompt content to the configured LLM provider (which is the user's own choice — Ollama for zero data exfiltration)
- No analytics, telemetry, or external calls other than the configured LLM endpoint
- Local-filesystem paths validated against a `storage/` root to prevent path traversal on any file-serving endpoint

## 14. Directory Layout

```
reader/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── page.tsx          # library
│   │   ├── books/[id]/page.tsx
│   │   ├── settings/page.tsx
│   │   └── api/…
│   ├── components/           # UI (SummaryNode, BookCard, UploadDropzone, …)
│   ├── lib/
│   │   ├── db.ts             # Prisma client
│   │   ├── storage.ts        # file paths, safe read/write
│   │   └── crypto.ts         # AES for API keys
│   ├── parsers/              # Parser implementations + registry
│   ├── llm/
│   │   ├── provider.ts       # LLMProvider interface
│   │   ├── factory.ts        # build provider from Settings
│   │   └── prompts/
│   └── worker/
│       ├── index.ts          # worker entry (started via `npm run worker`)
│       └── summarize.ts      # job handler for book + chapter summaries
├── storage/                  # gitignored, holds book files + covers
├── test/
│   ├── fixtures/
│   └── …
├── docs/superpowers/specs/
├── package.json
└── …
```

`package.json` scripts:
- `dev` — `next dev`
- `worker` — `tsx src/worker/index.ts`
- `dev:all` — `concurrently npm:dev npm:worker`
- `build` / `start` / `test` / `test:e2e`

## 15. Open Questions (nothing blocking v1)

- Should covers be extracted and displayed, or is title-only fine for v1? → **Yes, extract when format supplies one (EPUB), else generated gradient tile.**
- Should we show per-chapter token cost estimates in settings? → **Nice-to-have, not v1.**
- Streaming summaries as they generate vs. show-when-done? → **v1: show-when-done (simpler); consider streaming for chapter-level later.**

## 16. Success Criteria

- Upload a 300-page EPUB; within ~2 min with a modern model, book + chapter summaries are ready
- Opening a ready book is instant and shows the book summary
- Clicking through all three levels (book → chapter → paragraph → full text) works smoothly on desktop and mobile
- Swapping LLM provider in settings takes effect on the next generation
- No key or book content sent anywhere except the configured provider endpoint
