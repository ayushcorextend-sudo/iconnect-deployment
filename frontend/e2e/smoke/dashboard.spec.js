// SM-010 → SM-011: Dashboard smoke tests
// Requires auth credentials for doctor and superadmin.

import { test, expect } from '@playwright/test';

const DOCTOR_EMAIL = process.env.TEST_DOCTOR_EMAIL || '';
const DOCTOR_PASSWORD = process.env.TEST_DOCTOR_PASSWORD || '';
const SA_EMAIL = process.env.TEST_SA_EMAIL || '';
const SA_PASSWORD = process.env.TEST_SA_PASSWORD || '';

async function login(page, email, password) {
  await page.goto('/');
  await page.locator('input[type="email"], input[type="text"]').first().fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign")').first().click();
  await page.waitForTimeout(3000);
}

test.describe('Dashboard Smoke Tests', () => {
  test('SM-010: Doctor dashboard loads without crash', async ({ page }) => {
    test.skip(!DOCTOR_EMAIL || !DOCTOR_PASSWORD, 'Set TEST_DOCTOR_EMAIL/PASSWORD');
    await login(page, DOCTOR_EMAIL, DOCTOR_PASSWORD);

    // Dashboard should render — check for common dashboard elements
    const hasContent = await page.locator('.card, [class*="widget"], [class*="Widget"], [class*="dashboard"], main').first().isVisible({ timeout: 8000 }).catch(() => false);
    expect(hasContent).toBe(true);

    // No error boundary triggered
    await expect(page.locator('text=/something went wrong/i')).not.toBeVisible();
    await expect(page.locator('text=/error boundary/i')).not.toBeVisible();

    // No console errors that crash the page
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.waitForTimeout(2000);
    // Filter out known non-critical errors
    const criticalErrors = errors.filter(e =>
      !e.includes('ResizeObserver') &&
      !e.includes('network') &&
      !e.includes('Failed to fetch')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('SM-011: Superadmin dashboard loads with tabs', async ({ page }) => {
    test.skip(!SA_EMAIL || !SA_PASSWORD, 'Set TEST_SA_EMAIL/PASSWORD');
    await login(page, SA_EMAIL, SA_PASSWORD);

    // SA dashboard should have tab navigation
    const hasContent = await page.locator('.card, [class*="tab"], [role="tablist"], [class*="dashboard"], main').first().isVisible({ timeout: 8000 }).catch(() => false);
    expect(hasContent).toBe(true);

    // No crash
    await expect(page.locator('text=/something went wrong/i')).not.toBeVisible();
  });
});
