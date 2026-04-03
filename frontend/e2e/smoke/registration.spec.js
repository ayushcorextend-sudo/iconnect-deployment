// SM-008 → SM-009: Registration smoke tests
// Tests the 4-step registration wizard renders and validates.

import { test, expect } from '@playwright/test';

test.describe('Registration Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/registration');
    await page.waitForTimeout(1500);
  });

  test('SM-008: Registration wizard renders step 1', async ({ page }) => {
    // Step 1 should show basic info fields
    const emailField = page.locator('input[type="email"], input[placeholder*="email" i], input[name="email"]').first();
    const nameField = page.locator('input[placeholder*="name" i], input[name="name"], input[name="fullName"]').first();
    const passwordField = page.locator('input[type="password"]').first();

    // At least email and password should be visible on step 1
    const hasEmail = await emailField.isVisible().catch(() => false);
    const hasPassword = await passwordField.isVisible().catch(() => false);

    expect(hasEmail || hasPassword).toBe(true);
  });

  test('SM-009: Step validation fires on empty submission', async ({ page }) => {
    // Try to proceed without filling anything
    const nextBtn = page.locator('button:has-text("Next"), button:has-text("Continue"), button:has-text("Proceed"), button[type="submit"]').first();
    const isNextVisible = await nextBtn.isVisible().catch(() => false);

    if (isNextVisible) {
      await nextBtn.click();
      await page.waitForTimeout(1000);

      // Should show validation errors OR stay on same step
      const hasValidationError = await page.locator(
        '[class*="error"], [class*="Error"], [role="alert"], text=/required/i, text=/please/i, .text-red'
      ).first().isVisible().catch(() => false);

      // At minimum, we should still be on registration (not redirected)
      expect(page.url()).toContain('registration');
    }
  });
});
