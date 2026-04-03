import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 15000,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 8000,
    navigationTimeout: 10000,
  },
  projects: [
    {
      name: 'smoke',
      testDir: './e2e/smoke',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'smoke-mobile',
      testDir: './e2e/smoke',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'chromium',
      testDir: './e2e',
      testIgnore: '**/smoke/**',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
