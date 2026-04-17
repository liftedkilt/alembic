# Alembic

A web app that distills books into layered summaries. Upload EPUB/PDF/MOBI, open a book, and zoom from a one-paragraph overview into chapter summaries, paragraph summaries, and finally the full text.

## Quick start

```bash
npm install
npm run setup        # creates .env (with a generated APP_ENCRYPTION_KEY) and runs migrations
npm run dev:all      # starts the web server + summarizer worker
```

Open http://localhost:3000, visit `/settings` to configure your LLM provider (OpenAI, Anthropic, Google, Ollama, or any OpenAI-compatible endpoint), then upload a book.

## Scripts

| Script            | What it does                                                              |
|-------------------|---------------------------------------------------------------------------|
| `npm run setup`   | One-shot bootstrap: writes `.env` if missing, runs Prisma migrations.     |
| `npm run dev:all` | Dev: Next.js + background worker, hot reload.                             |
| `npm run dev`     | Dev: Next.js only (uploads queue but don't summarize).                    |
| `npm run build`   | Production build.                                                         |
| `npm run start:all` | Production: Next.js + worker. Requires `npm run build` first.           |
| `npm test`        | Unit + integration tests (isolated SQLite DB at `prisma/test.db`).        |
| `npm run test:e2e`| Playwright smoke test (uses `ALEMBIC_FAKE_LLM=1` — no real API calls).    |

`ALEMBIC_FAKE_LLM=1 npm run dev:all` runs the app locally without any real LLM — useful for UI iteration.

## Notes

- **MOBI parsing** requires [Calibre](https://calibre-ebook.com) (`ebook-convert` on PATH). If Calibre isn't installed, convert to EPUB first.
- **Data storage:** book metadata in `prisma/dev.db`; book files and covers in `storage/books/<id>/`. Delete both to reset.
- **Security:** this app is single-user by design. API keys are encrypted at rest with AES-256-GCM, but the server has no auth — run it on `localhost` or behind a trusted proxy.
