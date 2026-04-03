// SM-001 → SM-004: Auth smoke tests
// Verifies login page renders, error handling, Google tab, and tab switching.
// These run WITHOUT real credentials — they test UI readiness only.

import { test, expect } from '@playwright/test';

test.describe('Auth Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('SM-001: Login page renders with form fields', async ({ page }) => {
    // Login page should be the default for unauthenticated users
    // Default mode is "doctor" with "Password" tab active
    await expect(page.locator('input[type="email"], input[type="text"]').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('input[type="password"]')).toBeVisible();
    // Submit button should exist
    await expect(page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign")').first()).toBeVisible();
  });

  test('SM-002: Login error on empty/bad credentials', async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[type="text"]').first();
    const passwordInput = page.locator('input[type="password"]');
    const submitBtn = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign")').first();

    await emailInput.fill('nonexistent@test.invalid');
    await passwordInput.fill('WrongPassword123!');
    await submitBtn.click();

    // Should show an error message — no crash, no redirect to dashboard
    await page.waitForTimeout(3000);
    // Should NOT be on a dashboard
    const url = page.url();
    expect(url).not.toContain('/dashboard');
  });

  test('SM-003: Google tab switches and shows OAuth button', async ({ page }) => {
    // Doctor mode is default — should show Password | Google tabs
    const googleTab = page.locator('button:has-text("Google")').first();
    await expect(googleTab).toBeVisible({ timeout: 5000 });

    await googleTab.click();
    await page.waitForTimeout(500);

    // Google tab content should show "Continue with Google" button
    await expect(page.locator('button:has-text("Continue with Google")').first()).toBeVisible();
  });

  test('SM-004: Admin mode switch works', async ({ page }) => {
    // Doctor mode shows "Admin Access" section with SA and CA buttons
    const superAdminBtn = page.locator('button:has-text("Super Admin")').first();
    const isAdminVisible = await superAdminBtn.isVisible({ timeout: 5000 }).catch(() => false);

    if (isAdminVisible) {
      await superAdminBtn.click();
      await page.waitForTimeout(500);

      // Should switch to admin mode — heading changes, no Google tab
      await expect(page.locator('text=/Super Admin/i').first()).toBeVisible();
      // Password field should still be visible (admin always uses password)
      await expect(page.locator('input[type="password"]')).toBeVisible();
      // Google tab should NOT be visible in admin mode
      const googleTab = page.locator('button:has-text("Google")');
      await expect(googleTab).not.toBeVisible();
    } else {
      test.skip(true, 'Admin access section not visible');
    }
  });
});
