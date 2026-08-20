import { test as setup, expect } from '@playwright/test'
import fs from 'node:fs'

// Logs in with credentials from env and saves the session (storageState) so the
// real test specs start already authenticated. The password is read from env at
// run time on YOUR machine — it is never stored in the repo.
const AUTH_FILE = 'e2e/.auth/user.json'

setup('authenticate', async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL
  const password = process.env.TEST_USER_PASSWORD
  if (!email || !password) {
    throw new Error(
      'Set TEST_USER_EMAIL and TEST_USER_PASSWORD (in .env or the shell) before running e2e tests.'
    )
  }

  await page.goto('/login')
  // Login form: username/email + password by placeholder, then submit.
  await page.getByPlaceholder(/username or you@company\.com/i).fill(email)
  await page.getByPlaceholder('••••••••').fill(password)
  await page.getByRole('button', { name: /sign in|log in/i }).click()

  // Success = we land on an authenticated route (dashboard), not /login.
  await expect(page).toHaveURL(/\/($|dashboard|jobs|tracker)/, { timeout: 20_000 })

  fs.mkdirSync('e2e/.auth', { recursive: true })
  await page.context().storageState({ path: AUTH_FILE })
})
