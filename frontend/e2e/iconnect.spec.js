import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

// Nav items per role — mirrors Sidebar.jsx
const NAV_ITEMS = {
  superadmin: [
    { label: 'Dashboard' },
    { label: 'User Management' },
    { label: 'Content Management' },
  ],
  contentadmin: [
    { label: 'Dashboard' },
    { label: 'Content Management' },
  ],
  doctor: [
    { label: 'Dashboard' },
    { label: 'E-Book Library' },
    { label: 'My Leaderboard' },
    { label: 'My Activity' },
    { label: 'Notifications' },
    { label: 'My Profile' },
    { label: 'Social Features' },
    { label: 'Interest Groups' },
    { label: 'Kahoot Quiz' },
  ],
};

async function loginAs(page, role) {
  await page.goto(BASE_URL);
  await expect(page.locator('.login-card')).toBeVisible();

  if (role === 'doctor') {
    await page.locator('.login-btn').click();
  } else if (role === 'superadmin') {
    await page.locator('.admin-btn', { hasText: 'Login as Super Admin' }).click();
  } else {
    await page.locator('.admin-btn', { hasText: 'Login as Content Admin' }).click();
  }

  await expect(page.locator('.sidebar')).toBeVisible({ timeout: 5000 });
}

async function logout(page) {
  await page.locator('.logout-btn').click();
  await expect(page.locator('.login-card')).toBeVisible({ timeout: 5000 });
}

for (const role of ['superadmin', 'contentadmin', 'doctor']) {
  test.describe(`Role: ${role}`, () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, role);
    });

    for (const navItem of NAV_ITEMS[role]) {
      test(`[${role}] nav → ${navItem.label}`, async ({ page }) => {
        await page.locator('.nav-item', { hasText: navItem.label }).click();

        // Give React time to render
        await page.waitForTimeout(400);

        // No error text on screen
        const bodyText = await page.locator('body').innerText();
        expect(bodyText).not.toMatch(/something went wrong/i);
        expect(bodyText).not.toMatch(/cannot read prop/i);
        expect(bodyText).not.toMatch(/uncaught error/i);

        // .page wrapper must exist and be visible
        const pageDiv = page.locator('.page');
        await expect(pageDiv).toBeVisible({ timeout: 3000 });

        // .page must have at least one child — not a blank screen
        const children = await pageDiv.locator('> *').count();
        expect(children).toBeGreaterThan(0);
      });
    }

    test(`[${role}] logout returns to login`, async ({ page }) => {
      await logout(page);
      await expect(page.locator('.login-card')).toBeVisible();
    });
  });
}
