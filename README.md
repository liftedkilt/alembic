# Alembic

A web app that distills books into layered summaries. Upload EPUB/PDF/MOBI, open a book, and zoom from a one-paragraph overview into chapter summaries, paragraph summaries, and finally the full text.

## Setup

```bash
cp .env.example .env
# edit .env:
#   APP_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes).
#     Generate with: openssl rand -hex 32
#   DATABASE_URL defaults to file:./dev.db — fine for single-user local use.
npm install
npx prisma migrate dev
```

## Run

```bash
npm run dev:all
```

`dev:all` starts both the Next.js web server and the summarizer worker. Plain `npm run dev` starts only the web server; uploaded books will queue but never summarize.

Open http://localhost:3000. Configure your LLM provider at `/settings` before uploading (OpenAI, Anthropic, Google, Ollama, or any OpenAI-compatible endpoint).

## Testing

- `npm test` — unit + integration tests (uses an isolated SQLite DB at `prisma/test.db`)
- `npm run test:e2e` — Playwright smoke test (starts its own dev server with `ALEMBIC_FAKE_LLM=1`)
- `ALEMBIC_FAKE_LLM=1 npm run dev:all` — run the app locally without any real LLM; good for UI iteration

## Notes

- **MOBI parsing** requires [Calibre](https://calibre-ebook.com) (`ebook-convert` on PATH). If Calibre isn't installed, convert to EPUB first.
- **Data storage:** book metadata lives in `prisma/dev.db`; book files and covers in `storage/books/<id>/`. Delete both to reset.
- **Security:** this app is single-user by design. API keys are encrypted at rest with AES-256-GCM, but the server has no auth — run it on `localhost` or behind a trusted proxy.
