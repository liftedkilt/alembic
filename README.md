# Alembic

A web app that distills books into layered summaries. Upload EPUB/PDF/MOBI, open a book, and zoom from a one-paragraph overview into chapter summaries, paragraph summaries, and finally the full text.

## Setup

```bash
cp .env.example .env
# edit .env: set APP_ENCRYPTION_KEY to `openssl rand -hex 32`
npm install
npx prisma migrate dev
```

## Run

```bash
npm run dev:all
```

Open http://localhost:3000. Configure your LLM provider at `/settings` before uploading.

## Notes

- MOBI parsing requires [Calibre](https://calibre-ebook.com) (`ebook-convert` on PATH).
- All data lives in `prisma/dev.db` and `storage/`. Delete those to reset.
