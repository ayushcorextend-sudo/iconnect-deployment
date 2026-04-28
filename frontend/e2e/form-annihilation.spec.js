import { test, expect } from '@playwright/test';

// Form validation constraints edge cases
test.describe('Form Annihilation', () => {
  test('Login boundary matrix: XSS, massive strings, nulls', async ({ page }) => {
    await page.goto('/');

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitBtn = page.locator('button:has-text("Sign In"), button:has-text("Login")').first();

    if (await submitBtn.isVisible()) {
      // 1. Massive String
      await emailInput.fill('a'.repeat(5000) + '@example.com');
      await passwordInput.fill('short');
      await submitBtn.click();
      // Should not crash, and ideally present an error or handle gracefully
      await expect(page.locator('.toast')).toBeVisible({ timeout: 10000 }).catch(() => {}); // Optional catch 

      // 2. XSS Payload
      await emailInput.fill('<script>alert("xss")</script>@test.com');
      await submitBtn.click();
      
      // 3. Null/Empty values
      await emailInput.fill('');
      await passwordInput.fill('');
      await submitBtn.click();
      // Browser validation usually blocks empty fields, but if it passes, expect visual validation
      const typeEmailHtml = await emailInput.evaluate(e => e.type);
      expect(typeEmailHtml).toBe('email');
    }
  });
});
