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
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 8000,
    navigationTimeout: 10000,
  },
  projects: [
    {
      name: 'Desktop Chrome 1080p',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    {
      name: 'Desktop Chrome 4K',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 3840, height: 2160 }
      },
    },
    {
      name: 'iPhone 15 Pro',
      use: { ...devices['iPhone 15 Pro'] },
    },
    {
      name: 'iPad Air',
      use: { ...devices['iPad Air'] },
    },
  ],
});
