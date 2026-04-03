// SM-005 → SM-007: Navigation smoke tests
// Requires AUTH — uses environment variables for test credentials.
// Set TEST_DOCTOR_EMAIL, TEST_DOCTOR_PASSWORD before running.

import { test, expect } from '@playwright/test';

const DOCTOR_EMAIL = process.env.TEST_DOCTOR_EMAIL || '';
const DOCTOR_PASSWORD = process.env.TEST_DOCTOR_PASSWORD || '';

const needsAuth = DOCTOR_EMAIL && DOCTOR_PASSWORD;

test.describe('Navigation Smoke Tests', () => {
  test.skip(!needsAuth, 'Skipped — set TEST_DOCTOR_EMAIL and TEST_DOCTOR_PASSWORD env vars');

  test.beforeEach(async ({ page }) => {
    // Login as doctor
    await page.goto('/');
    await page.locator('input[type="email"], input[type="text"]').first().fill(DOCTOR_EMAIL);
    await page.locator('input[type="password"]').fill(DOCTOR_PASSWORD);
    await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign")').first().click();
    // Wait for dashboard to load
    await page.waitForURL(/\/(dashboard)?$/, { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);
  });

  test('SM-005: Dashboard loads after login', async ({ page }) => {
    // Should be on dashboard with content rendered
    const dashboardContent = page.locator('[class*="dashboard"], [class*="Dashboard"], [data-testid="dashboard"]').first();
    // Alternatively, check for known dashboard widgets
    const hasContent = await page.locator('main, [role="main"], .card, [class*="widget"]').first().isVisible().catch(() => false);
    expect(hasContent).toBe(true);
    // No error boundary should be visible
    await expect(page.locator('text=/something went wrong/i')).not.toBeVisible();
  });

  test('SM-006: Deep-link preserves target page (BUG-NAV-002)', async ({ page, context }) => {
    // Open a new page and navigate directly to /ebooks
    const newPage = await context.newPage();
    await newPage.goto('/ebooks');
    // Should redirect to login since it's a new context
    await newPage.waitForTimeout(2000);

    // Now login on this page
    const emailInput = newPage.locator('input[type="email"], input[type="text"]').first();
    if (await emailInput.isVisible().catch(() => false)) {
      await emailInput.fill(DOCTOR_EMAIL);
      await newPage.locator('input[type="password"]').fill(DOCTOR_PASSWORD);
      await newPage.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign")').first().click();
      await newPage.waitForTimeout(3000);
      // Should land on ebooks, not dashboard
      const url = newPage.url();
      expect(url).toContain('ebook');
    }
    await newPage.close();
  });

  test('SM-007: Role guard blocks unauthorized pages', async ({ page }) => {
    // Doctor should NOT be able to access /users (superadmin only)
    await page.goto('/users');
    await page.waitForTimeout(2000);
    // Should redirect away from /users
    const url = page.url();
    expect(url).not.toMatch(/\/users$/);
  });
});
