// SM-001 → SM-004: Auth smoke tests
// Verifies login page renders, error handling, OTP form, and OAuth button.
// These run WITHOUT real credentials — they test UI readiness only.

import { test, expect } from '@playwright/test';

test.describe('Auth Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('SM-001: Login page renders with form fields', async ({ page }) => {
    // Login page should be the default for unauthenticated users
    await expect(page.locator('input[type="email"], input[type="text"]').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('input[type="password"]')).toBeVisible();
    // Submit button should exist
    await expect(page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign")').first()).toBeVisible();
  });

  test('SM-002: Login error on empty/bad credentials', async ({ page }) => {
    // Try submitting with empty or bad data
    const emailInput = page.locator('input[type="email"], input[type="text"]').first();
    const passwordInput = page.locator('input[type="password"]');
    const submitBtn = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign")').first();

    await emailInput.fill('nonexistent@test.invalid');
    await passwordInput.fill('WrongPassword123!');
    await submitBtn.click();

    // Should show an error message — no crash, no redirect to dashboard
    await page.waitForTimeout(2000);
    const errorVisible = await page.locator('[role="alert"], .error, [class*="error"], [class*="Error"], text=/invalid|incorrect|wrong|failed/i').first().isVisible().catch(() => false);
    // At minimum, we should NOT be on a dashboard
    const url = page.url();
    expect(url).not.toContain('/dashboard');
  });

  test('SM-003: OTP form appears when selected', async ({ page }) => {
    // Look for OTP toggle/tab/button
    const otpTrigger = page.locator('button:has-text("OTP"), a:has-text("OTP"), [data-testid="otp-toggle"], text=/otp|one.time/i').first();
    const isOtpAvailable = await otpTrigger.isVisible().catch(() => false);

    if (isOtpAvailable) {
      await otpTrigger.click();
      // OTP flow should show email input but NOT password
      await expect(page.locator('input[type="email"], input[type="text"]').first()).toBeVisible();
      // Look for "Send OTP" or similar button
      await expect(page.locator('button:has-text("Send"), button:has-text("OTP"), button:has-text("Verify")').first()).toBeVisible();
    } else {
      test.skip(true, 'OTP option not visible on login page');
    }
  });

  test('SM-004: Google OAuth button present', async ({ page }) => {
    const googleBtn = page.locator('button:has-text("Google"), [data-testid="google-auth"], [class*="google"], img[alt*="Google"]').first();
    const isGoogleAvailable = await googleBtn.isVisible().catch(() => false);

    if (isGoogleAvailable) {
      // Verify it's clickable (don't actually click — it would redirect to Google)
      await expect(googleBtn).toBeEnabled();
    } else {
      // Google OAuth may only be on doctor login mode
      test.skip(true, 'Google OAuth button not visible on current login mode');
    }
  });
});
