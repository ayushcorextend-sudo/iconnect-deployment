import { test, expect } from '@playwright/test';

// Centralised mock setup to isolate frontend logic from backend dependencies
async function setupMocks(page) {
  await page.route('**/rest/v1/profiles*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{
        id: 'mock-uuid',
        role: 'doctor',
        name: 'Dr. Alpha Beta',
        email: 'alpha@iconnect.in',
        status: 'active',
        verified: true
      }])
    });
  });

  await page.route('**/auth/v1/user', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'mock-uuid', email: 'alpha@iconnect.in' })
    });
  });

  // Mock any notifications or extra API calls
  await page.route('**/rest/v1/notifications*', async (route) => {
    await route.fulfill({ status: 200, body: JSON.stringify([]) });
  });

  await page.route('**/rest/v1/artifacts*', async (route) => {
    await route.fulfill({ status: 200, body: JSON.stringify([]) });
  });
}

test.describe('Routing & Navigation Matrix', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    // Inject mock auth token to bypass login loop
    await page.addInitScript(() => {
      window.localStorage.setItem('iconnect_session', JSON.stringify({
        userId: 'mock-uuid',
        role: 'doctor',
        accessToken: 'mock-token'
      }));
      // Workaround for Supabase internal storage
      window.localStorage.setItem('sb-localstorage-auth-token', JSON.stringify({
        user: { id: 'mock-uuid', email: 'alpha@iconnect.in' },
        access_token: 'mock-token'
      }));
    });
  });

  test('Verify Sidebar and deep link navigation', async ({ page }) => {
    await page.goto('/');
    // Check TopBar is loaded
    await expect(page.locator('header[role="banner"]')).toBeVisible();

    // The shell might load the Dashboard initially
    await expect(page.locator('.pt').first()).toBeVisible({ timeout: 15000 });

    // Open Sidebar (either already open or toggled)
    const sidebar = page.locator('.sidebar, .sidebar-open').first();
    // In mobile, we might need to click the hamburger menu
    if (await page.locator('.menu-btn').isVisible()) {
      await page.waitForTimeout(500);
      await page.locator('.menu-btn').first().click();
    }
    
    await expect(sidebar).toBeVisible();

    // Click on Profile routing link
    const profileLink = sidebar.locator('button:has-text("Profile")').first();
    if (await profileLink.isVisible()) {
      await profileLink.click();
      await expect(page.locator('text="Edit Profile"').first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('Navigation boundary test: Invalid Route Fallback', async ({ page }) => {
    await page.goto('/some-fake-route');
    // Ensure the shell doesn't crash, and fallback UI runs
    await expect(page.locator('header[role="banner"]')).toBeVisible();
    await expect(page.locator('.page')).toBeVisible();
  });
});
