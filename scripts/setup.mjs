#!/usr/bin/env node
// One-shot bootstrap for a fresh clone: creates .env with a generated
// encryption key if missing, then runs Prisma migrations. Idempotent —
// safe to rerun.
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const envPath = resolve(root, '.env');

function ensureEnv() {
  if (existsSync(envPath)) {
    const contents = readFileSync(envPath, 'utf8');
    if (contents.includes('APP_ENCRYPTION_KEY=') && !/APP_ENCRYPTION_KEY=\s*$/.test(contents)) {
      console.log('.env already exists — leaving it alone.');
      return;
    }
  }
  const key = randomBytes(32).toString('hex');
  const body = `DATABASE_URL="file:./dev.db"\nAPP_ENCRYPTION_KEY=${key}\n`;
  writeFileSync(envPath, body, { mode: 0o600 });
  console.log('Wrote .env with a generated APP_ENCRYPTION_KEY.');
}

function run(cmd, args) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', cwd: root });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

ensureEnv();
console.log('\nRunning Prisma migrations…');
run('npx', ['prisma', 'migrate', 'deploy']);
run('npx', ['prisma', 'generate']);

console.log('\nSetup complete. Next steps:');
console.log('  npm run dev:all     # development (web + worker, hot reload)');
console.log('  npm run start:all   # production build already required');
