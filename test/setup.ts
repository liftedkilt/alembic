import { execSync } from 'node:child_process';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { beforeAll, afterAll } from 'vitest';

const ROOT = process.cwd();
const TEST_DB = path.join(ROOT, 'prisma', 'test.db');
const TEST_STORAGE = path.join(ROOT, 'test', '.tmp-storage');

process.env.DATABASE_URL = `file:${TEST_DB}`;
process.env.STORAGE_ROOT = TEST_STORAGE;
process.env.APP_ENCRYPTION_KEY ??= '0'.repeat(64);

beforeAll(() => {
  // Apply migrations to a fresh test DB (prisma CLI reads DATABASE_URL from env).
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: `file:${TEST_DB}` },
  });
});

afterAll(async () => {
  await rm(TEST_STORAGE, { recursive: true, force: true });
});
