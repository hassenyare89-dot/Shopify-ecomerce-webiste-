import {defineConfig, devices} from '@playwright/test';

/**
 * E2E + HTTP integration tests run against a production build served by
 * MiniOxygen (`shopify hydrogen preview`) and the local MOCK Storefront API.
 * No real Shopify store, customer data or payments are involved.
 */
const PORT = 3000;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: {timeout: 10_000},
  reporter: process.env.CI ? [['github'], ['html', {open: 'never'}]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'off',
    screenshot: 'only-on-failure',
  },
  projects: [
    {name: 'desktop-chromium', use: {...devices['Desktop Chrome']}, testIgnore: /mobile\.spec\.ts/},
    {name: 'mobile-chromium', use: {...devices['Pixel 7']}, testMatch: /mobile\.spec\.ts/},
  ],
  webServer: [
    {
      command: 'node mock/storefront-server.mjs',
      url: 'http://127.0.0.1:4010/__health',
      reuseExistingServer: !process.env.CI,
      stdout: 'ignore',
    },
    {
      command: `npx shopify hydrogen preview --env-file mock/mock.env --port ${PORT}`,
      url: `http://localhost:${PORT}/robots.txt`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
