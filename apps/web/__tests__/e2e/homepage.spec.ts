import { test, expect } from '@playwright/test';

test.describe('E2E Tests', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('ETH Global');
  });

  test('displays integration cards', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Privy Integration')).toBeVisible();
    await expect(page.locator('text=Viem Integration')).toBeVisible();
    await expect(page.locator('text=Drizzle ORM')).toBeVisible();
    await expect(page.locator('text=x402 Protocol')).toBeVisible();
  });
});
