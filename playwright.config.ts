import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_WEB_URL || 'http://127.0.0.1:4173';

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'tests-artifacts/playwright-report', open: 'never' }],
    ['junit', { outputFile: 'tests-artifacts/playwright-junit.xml' }],
  ],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 8_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: 'web-desktop-chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'mobile-android-chromium',
      use: {
        ...devices['Pixel 7'],
      },
    },
    {
      name: 'mobile-ios-webkit',
      use: {
        ...devices['iPhone 13'],
      },
    },
  ],
  webServer: process.env.E2E_EXTERNAL_SERVER === '1'
    ? undefined
    : {
        command: 'npm --workspace ionic-busgo run dev -- --host 127.0.0.1 --port 4173',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
