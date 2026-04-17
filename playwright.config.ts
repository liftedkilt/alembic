import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  webServer: {
    command: 'npm run dev:all',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { APP_ENCRYPTION_KEY: '0'.repeat(64), ALEMBIC_FAKE_LLM: '1' },
  },
  use: { baseURL: 'http://localhost:3000' },
});
