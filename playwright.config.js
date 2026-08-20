import { defineConfig, devices } from '@playwright/test'
import { readFileSync } from 'node:fs'

// Load .env / .env.local into process.env (no dependency) so BASE_URL and the
// TEST_* credentials can live in your .env instead of the shell.
for (const f of ['.env', '.env.local']) {
  try {
    for (const line of readFileSync(f, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch {
    /* optional */
  }
}

// End-to-end tests against a running instance (prod by default). Configure via env
// so no URL or credential ever lives in the repo:
//   BASE_URL             the site under test (e.g. https://app.picturebuild.com)
//   TEST_USER_EMAIL      login username/email
//   TEST_USER_PASSWORD   login password (never committed; read from your .env)
//   TEST_ESTIMATE_URL    (optional) path to an existing estimate for calc checks,
//                        e.g. /estimates/<id>
//
// Round 1 is NON-DESTRUCTIVE: it loads pages, checks navigation + console errors,
// verifies the Code Changes tab, and inspects an estimate WITHOUT saving.
//
// Run:  npx playwright test           (all)
//       npx playwright test smoke     (one file)
//       npx playwright show-report    (last HTML report)
const baseURL = process.env.BASE_URL || 'http://localhost:5173'

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  // list = console; html = browsable report; json = machine-readable results file
  // that Claude reads from the repo after a run (test-results/results.json).
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // Logs in once and saves the session for every other spec.
    { name: 'setup', testMatch: /auth\.setup\.js/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/user.json' },
      dependencies: ['setup'],
    },
  ],
})
