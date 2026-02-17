import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for go-admin translation UX E2E tests.
 *
 * Prerequisites:
 * - Example web server running at localhost:8080 (./taskfile dev:serve from examples/web)
 * - ADMIN_TRANSLATION_PROFILE=full for full translation capabilities
 *
 * Run:
 * - npm run e2e           (headless)
 * - npm run e2e:headed    (with browser UI)
 * - npm run e2e:ui        (with Playwright UI)
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // Run sequentially to avoid auth state conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Firefox and WebKit can be enabled for broader coverage
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],
  // Web server is managed externally (./taskfile dev:serve)
  // Uncomment below to auto-start in CI:
  // webServer: {
  //   command: 'cd ../../examples/web && ./taskfile dev:serve',
  //   url: 'http://localhost:8080/admin',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120000,
  // },
});
