import { defineConfig, devices } from '@playwright/test';

// Set BASE_URL to test an existing deploy (e.g. a Netlify deploy preview).
// Otherwise Playwright serves the local production build (`npm run build`).
const baseURL = process.env.BASE_URL ?? 'http://localhost:3100';

export default defineConfig({
  testDir: './tests/e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'npm run start -- --port 3100',
        url: baseURL,
        reuseExistingServer: false,
      },
});
