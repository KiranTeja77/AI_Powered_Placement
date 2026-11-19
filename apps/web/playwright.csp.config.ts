import { defineConfig, devices } from '@playwright/test'

/**
 * Runs the Content-Security-Policy check against the production build, which is the only place the
 * policy exists (the dev server needs inline scripts). Stop the dev server, then:
 * `pnpm build && pnpm e2e:csp`.
 */
export default defineConfig({
  testDir: './e2e-csp',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:5173', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm exec vite preview --port 5173 --strictPort',
    url: 'http://localhost:5173',
    // The API only accepts requests from the web origin on 5173, so the preview must use that port.
    // A dev server already running there would be tested by mistake, so refuse to reuse it.
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
