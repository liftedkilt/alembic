import { test, expect } from '@playwright/test';
import path from 'node:path';

test('upload, summarize, expand through levels', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/');
  const fileInput = page.locator('input[type=file]');
  await fileInput.setInputFiles(path.resolve(__dirname, '../test/fixtures/sample.epub'));

  // wait for a book card to appear (the most recent upload is first)
  const firstBookCard = page.locator('a[href^="/books/"]').first();
  await expect(firstBookCard).toBeVisible({ timeout: 15_000 });

  // Reload periodically until the first card shows "Ready" (the library page is server-rendered).
  await expect(async () => {
    await page.reload();
    await expect(firstBookCard.getByText('Ready')).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 60_000 });

  // Click the first book card (most recent upload)
  await firstBookCard.click();
  await expect(page.getByText('A distilled overview')).toBeVisible();

  await page.getByRole('button').first().click(); // expand book summary
  await expect(page.getByText('Chapter 1', { exact: true })).toBeVisible();
});
