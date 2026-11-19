import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  // The tests run against the real stack. Some steps legitimately take several seconds on a laptop
  // (BCrypt at strength 12, the resume analyzer, Vite compiling a page on first visit), so the
  // assertion timeout is 15 s. It only bounds how long a check polls; passing tests are not slower.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  // In CI an HTML report is written too, so a failed run can be uploaded and opened.
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
