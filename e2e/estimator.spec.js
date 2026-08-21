import { test, expect } from '@playwright/test'
import { collectErrors, settle } from './helpers.js'

// Round 1 — estimator (NON-DESTRUCTIVE). Opens an existing estimate and verifies
// it renders cleanly. Nothing is entered or saved in round 1; the deeper calc
// assertions (Fire Pit cap+finish show material AND labor; Walls modular block
// math; unpriced -> $0/modal) are added in round 2 once the first run's
// screenshots reveal the exact DOM selectors.
//
// Requires TEST_ESTIMATE_URL (e.g. /estimates/<id>) pointing at a throwaway/test
// estimate. Skips cleanly if unset so the rest of the suite still runs.
const ESTIMATE = process.env.TEST_ESTIMATE_URL

test.describe('Estimator', () => {
  test.skip(!ESTIMATE, 'Set TEST_ESTIMATE_URL to a test estimate to enable estimator checks.')

  test('estimate opens without console errors', async ({ page }, testInfo) => {
    const errors = collectErrors(page)
    await page.goto(ESTIMATE, { waitUntil: 'domcontentloaded' })
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.getByText(/something went wrong|application error/i)).toHaveCount(0)
    await settle(page)

    // Capture the estimate for review (informs round-2 selector work).
    await testInfo.attach('estimate.png', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    })
    expect(errors, `Console errors in estimate:\n${errors.join('\n')}`).toEqual([])
  })

  test('Fire Pit module renders if present', async ({ page }) => {
    await page.goto(ESTIMATE, { waitUntil: 'domcontentloaded' })
    await settle(page)
    const firePit = page.getByText(/fire pit/i).first()
    // Not every estimate has a Fire Pit; only assert when the module is present.
    if (await firePit.count()) {
      await expect(firePit).toBeVisible()
    } else {
      test.info().annotations.push({ type: 'note', description: 'No Fire Pit module on this estimate.' })
    }
  })
})
