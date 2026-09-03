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

  // ── Summary bar: four groups, materials split out of In-House labour ───────
  // The estimate bar used to be three groups (In House / Subcontractor /
  // Totals) with Materials sitting inside In-House. Materials now has its own
  // group so labour profit and material profit are separate verticals.
  test('estimate summary bar shows four groups with Materials split out', async ({ page }) => {
    await page.goto(ESTIMATE, { waitUntil: 'domcontentloaded' })
    await settle(page)

    // Group headings. "In House Labor Estimate" is the rename — asserting the
    // exact string catches a revert to the old "In House Estimate".
    await expect(page.getByText('In House Labor Estimate', { exact: true })).toBeVisible()
    await expect(page.getByText('Subcontractor Estimate', { exact: true })).toBeVisible()
    await expect(page.getByText('Materials Estimate', { exact: true })).toBeVisible()
    await expect(page.getByText('Estimate Totals', { exact: true })).toBeVisible()

    // Materials must appear exactly once and NOT inside the In-House group.
    // The group is the heading's next sibling, so scope the search to it.
    const inHouse = page.locator('div.flex.flex-col', {
      has: page.getByText('In House Labor Estimate', { exact: true }),
    }).first()
    await expect(inHouse.getByText('Materials', { exact: true })).toHaveCount(0)

    const materials = page.locator('div.flex.flex-col', {
      has: page.getByText('Materials Estimate', { exact: true }),
    }).first()
    await expect(materials.getByText('Materials', { exact: true })).toBeVisible()
    // Mirrors the Sub group: cost, an orange Markup box, then Gross Profit.
    await expect(materials.getByText('Markup', { exact: true })).toBeVisible()
    await expect(materials.getByText('Gross Profit', { exact: true })).toBeVisible()
  })

  // Material markup defaults to 0%, and 0% is a real state (materials sold at
  // cost), so it must read "0%" and "$0" — never a dash, which would suggest a
  // missing rate rather than a deliberate one.
  test('material markup and profit default to 0% and $0, not dashes', async ({ page }) => {
    await page.goto(ESTIMATE, { waitUntil: 'domcontentloaded' })
    await settle(page)
    const materials = page.locator('div.flex.flex-col', {
      has: page.getByText('Materials Estimate', { exact: true }),
    }).first()
    await expect(materials.getByText('—')).toHaveCount(0)
    await expect(materials.getByText(/^\d+(\.\d+)?%$/)).toBeVisible()
    await expect(materials.getByText(/^\$[\d,]+$/)).toHaveCount(2) // cost + gross profit
  })

  // GPMD was renamed GLPMD (Gross Labor Profit per Man Day) and moved from blue
  // to light yellow; Total Price took the blue.
  test('the man-day rate reads GLPMD, not GPMD', async ({ page }) => {
    await page.goto(ESTIMATE, { waitUntil: 'domcontentloaded' })
    await settle(page)
    await expect(page.getByText('GLPMD', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('GPMD', { exact: true })).toHaveCount(0)
  })

  // Gross Profit is green in all three profit groups — In House, Sub, Materials.
  test('gross profit renders green in each profit group', async ({ page }) => {
    await page.goto(ESTIMATE, { waitUntil: 'domcontentloaded' })
    await settle(page)
    for (const group of ['In House Labor Estimate', 'Subcontractor Estimate', 'Materials Estimate']) {
      const g = page.locator('div.flex.flex-col', {
        has: page.getByText(group, { exact: true }),
      }).first()
      const gp = g.getByText('Gross Profit', { exact: true })
      await expect(gp, `${group} has no Gross Profit column`).toBeVisible()
      // Gross profit is a boxed figure now, like GLPMD and Price — the value
      // carries text-green-200 inside a green-bordered box, not text-green-400.
      const value = g.locator('p.text-green-200').first()
      await expect(value, `${group} Gross Profit is not a green box`).toBeVisible()
    }
  })
})
