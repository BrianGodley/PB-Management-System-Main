import { test, expect } from '@playwright/test'
import { collectErrors } from './helpers.js'

// Round 1 — navigation smoke. Visit each main authenticated route directly and
// assert it renders without a console/page error and without showing an error
// boundary. Read-only: no clicks that mutate data.
const ROUTES = [
  { path: '/', name: 'Dashboard' },
  { path: '/jobs', name: 'Jobs' },
  { path: '/bids', name: 'Bids' },
  { path: '/tracker', name: 'Tracker' },
  { path: '/collections', name: 'Collections' },
  { path: '/statistics', name: 'Statistics' },
  { path: '/master-rates', name: 'Master Rates' },
  { path: '/admin', name: 'Admin' },
]

for (const route of ROUTES) {
  test(`loads ${route.name} (${route.path})`, async ({ page }) => {
    const errors = collectErrors(page)
    const resp = await page.goto(route.path, { waitUntil: 'domcontentloaded' })
    // SPA returns 200 for the app shell on every path.
    if (resp) expect(resp.status(), `HTTP status for ${route.path}`).toBeLessThan(400)
    await expect(page).not.toHaveURL(/\/login/)
    // No visible crash / error boundary text.
    await expect(page.getByText(/something went wrong|application error|unexpected error/i)).toHaveCount(0)
    await page.waitForLoadState('networkidle')
    expect(errors, `Console errors on ${route.name}:\n${errors.join('\n')}`).toEqual([])
  })
}
