// SM-012 → SM-013: E-Books smoke tests

import { test, expect } from '@playwright/test';

const DOCTOR_EMAIL = process.env.TEST_DOCTOR_EMAIL || '';
const DOCTOR_PASSWORD = process.env.TEST_DOCTOR_PASSWORD || '';

test.describe('E-Books Smoke Tests', () => {
  test.skip(!DOCTOR_EMAIL || !DOCTOR_PASSWORD, 'Set TEST_DOCTOR_EMAIL/PASSWORD');

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="email"], input[type="text"]').first().fill(DOCTOR_EMAIL);
    await page.locator('input[type="password"]').fill(DOCTOR_PASSWORD);
    await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign")').first().click();
    await page.waitForTimeout(3000);
  });

  test('SM-012: E-Books page loads with content list', async ({ page }) => {
    await page.goto('/ebooks');
    await page.waitForTimeout(2000);

    // Page should render without crash
    await expect(page.locator('text=/something went wrong/i')).not.toBeVisible();

    // Should have content items or an empty state (not a crash)
    const hasItems = await page.locator('.card, [class*="book"], [class*="artifact"], [class*="item"], [class*="content"]').first().isVisible().catch(() => false);
    const hasEmpty = await page.locator('text=/no content/i, text=/no ebooks/i, text=/empty/i, text=/nothing/i').first().isVisible().catch(() => false);

    // Either content exists or empty state shown — both are valid, crash is not
    expect(hasItems || hasEmpty).toBe(true);
  });

  test('SM-013: PDF viewer opens on item click', async ({ page }) => {
    await page.goto('/ebooks');
    await page.waitForTimeout(2000);

    // Click first content item
    const firstItem = page.locator('.card, [class*="book"], [class*="artifact"]').first();
    const hasItem = await firstItem.isVisible().catch(() => false);

    if (hasItem) {
      await firstItem.click();
      await page.waitForTimeout(2000);

      // PDF viewer or reader should appear
      const hasViewer = await page.locator(
        'canvas, [class*="reader"], [class*="Reader"], [class*="pdf"], [class*="PDF"], iframe, embed'
      ).first().isVisible().catch(() => false);

      expect(hasViewer).toBe(true);
    } else {
      test.skip(true, 'No content items available to open');
    }
  });
});
