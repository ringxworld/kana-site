import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './extension/tests',
  fullyParallel: true,
  retries: 0,
  reporter: 'line',
  use: {
    headless: true,
    // Intercept fetch from file:// pages
    bypassCSP: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
