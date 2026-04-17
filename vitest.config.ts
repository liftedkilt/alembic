import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    fileParallelism: false,
  },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
});
