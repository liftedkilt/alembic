import { test, expect } from '@playwright/test';
import path from 'node:path';

test('upload, summarize, expand through levels', async ({ page }) => {
  await page.goto('/');
  const fileInput = page.locator('input[type=file]');
  await fileInput.setInputFiles(path.resolve(__dirname, '../test/fixtures/sample.epub'));

  // wait for book card to appear and become Ready (worker polls at 2s)
  await expect(page.getByText(/Summarizing…|Ready/)).toBeVisible({ timeout: 15_000 });
  // Reload periodically until the book card shows "Ready" (the library page is server-rendered).
  await expect(async () => {
    await page.reload();
    await expect(page.getByText('Ready')).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 60_000 });

  // Click the first book card (library-page link that points at a book)
  await page.locator('a[href^="/books/"]').first().click();
  await expect(page.getByText('A distilled overview')).toBeVisible();

  await page.getByRole('button').first().click(); // expand book summary
  await expect(page.getByText('Chapter 1', { exact: true })).toBeVisible();
});
