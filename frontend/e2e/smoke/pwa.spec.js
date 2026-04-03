// SM-014 → SM-015: PWA smoke tests

import { test, expect } from '@playwright/test';

test.describe('PWA Smoke Tests', () => {
  test('SM-014: Service worker registers', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);

    // Check if service worker is registered
    const swRegistered = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const registrations = await navigator.serviceWorker.getRegistrations();
      return registrations.length > 0;
    });

    expect(swRegistered).toBe(true);
  });

  test('SM-015: Web manifest is accessible and valid', async ({ page }) => {
    // Fetch the manifest
    const response = await page.goto('/manifest.webmanifest');

    if (response && response.ok()) {
      const body = await response.text();
      const manifest = JSON.parse(body);

      // Must have required PWA fields
      expect(manifest).toHaveProperty('name');
      expect(manifest).toHaveProperty('start_url');
      expect(manifest).toHaveProperty('icons');
      expect(manifest.icons.length).toBeGreaterThan(0);
    } else {
      // Try alternate path
      const altResponse = await page.goto('/manifest.json');
      if (altResponse && altResponse.ok()) {
        const body = await altResponse.text();
        const manifest = JSON.parse(body);
        expect(manifest).toHaveProperty('name');
      } else {
        throw new Error('No manifest found at /manifest.webmanifest or /manifest.json');
      }
    }
  });
});
