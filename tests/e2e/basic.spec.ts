import { test, expect } from '@playwright/test';

test('optimistic class applies on beforeRequest', async ({ page }) => {
  await page.goto('/test-features.html');
  const btn = page.locator('#status-btn');
  await expect(btn).toBeVisible();
  await btn.click();
  await expect(btn).toHaveClass(/hx-optimistic/);
});

