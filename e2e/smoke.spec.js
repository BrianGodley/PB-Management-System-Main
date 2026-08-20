import { test, expect } from '@playwright/test'
import { collectErrors } from './helpers.js'

// Round 1 — load & session. The app is a logged-in SPA; confirm the dashboard
// renders and the initial load is free of console/page errors.
test('dashboard loads without console errors', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/')
  // Not bounced to /login (session is valid), and something rendered.
  await expect(page).not.toHaveURL(/\/login/)
  await expect(page.locator('body')).toBeVisible()
  await page.waitForLoadState('networkidle')
  expect(errors, `Console errors on load:\n${errors.join('\n')}`).toEqual([])
})
