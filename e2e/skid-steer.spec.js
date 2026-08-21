import { test, expect } from '@playwright/test'
import { collectErrors, openModule, scanEveryOptionForNaN } from './helpers.js'

// ─────────────────────────────────────────────────────────────────────────────
// Skid Steer Demo module — live-browser layer (MODULE-TEST-CHECKLIST). Demos are shaped
// differently from Walls/Fire Pit: few dropdowns, mostly numeric inputs (grading
// SF, hauling loads, shrub/stump counts) and an In-House ↔ Subcontractor toggle
// instead of type tabs. Sections: Job Site Conditions / Hauling / Shrub Demo /
// Stump Demo. NON-DESTRUCTIVE. Requires TEST_ESTIMATE_URL + a Skid Steer Demo module on
// the estimate. First-run selectors are text based; the loop hardens them.
// ─────────────────────────────────────────────────────────────────────────────
const ESTIMATE = process.env.TEST_ESTIMATE_URL
const UNPRICED = /labor rate needed|price me|unpriced|missing price|needs? a price|set (a |the )?price/i

test.describe('Skid Steer Demo', () => {
  test.skip(!ESTIMATE, 'Set TEST_ESTIMATE_URL to a test estimate to enable Skid Steer Demo checks.')

  test('module editor opens with demo sections', async ({ page }, testInfo) => {
    const errors = collectErrors(page)
    const ok = await openModule(page, 'Skid Steer Demo')
    await testInfo.attach('skid-steer.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    expect(ok, 'Could not open the Skid Steer Demo module editor — check the add/edit flow.').toBeTruthy()
    // At least one recognizable demo section renders.
    const anySection = page.getByText(/Job Site Conditions|Hauling|Shrub Demo|Stump Demo/i)
    expect(await anySection.count(), 'No Skid Steer Demo sections rendered').toBeGreaterThan(0)
    expect(errors, `Console/HTTP errors:\n${errors.join('\n')}`).toEqual([])
  })

  test('any Type dropdown present is populated', async ({ page }) => {
    const ok = await openModule(page, 'Skid Steer Demo')
    test.skip(!ok, 'Skid Steer Demo editor not reachable on this estimate.')
    const selects = page.locator('select')
    const n = await selects.count()
    for (let i = 0; i < n; i++) {
      const opts = await selects.nth(i).locator('option').count()
      expect(opts, `Select #${i} is empty (only a placeholder / no options)`).toBeGreaterThan(1)
    }
  })

  test('exhaustive: every dropdown option computes without a NaN/console error', async ({ page }, testInfo) => {
    test.setTimeout(180000)
    const errors = collectErrors(page)
    const ok = await openModule(page, 'Skid Steer Demo')
    test.skip(!ok, 'Skid Steer Demo editor not reachable on this estimate.')
    const bad = await scanEveryOptionForNaN(page)
    await testInfo.attach('skid-steer-exhaustive.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    expect(bad, `Options producing NaN/Infinity: ${bad.join(', ')}`).toEqual([])
    expect(errors, `Console/HTTP errors:\n${errors.join('\n')}`).toEqual([])
  })

  test('numeric fields accept input and the module computes a total', async ({ page }) => {
    const ok = await openModule(page, 'Skid Steer Demo')
    test.skip(!ok, 'Skid Steer Demo editor not reachable on this estimate.')
    const nums = page.locator('input[type="number"], input[step]')
    const n = Math.min(await nums.count(), 60)
    for (let i = 0; i < n; i++) {
      const inp = nums.nth(i)
      if (!(await inp.isVisible().catch(() => false))) continue
      await inp.click().catch(() => {})
      await inp.fill('3').catch(() => {})
    }
    await page.waitForTimeout(300)
    await expect(page.getByText(/\$[\d,]/).first(), 'No dollar total after entering values').toBeVisible()
    expect(await page.getByText(UNPRICED).count(), 'Unpriced prompt after filling priced fields').toBe(0)
  })

  test('In-House and Subcontractor both price without NaN', async ({ page }) => {
    const ok = await openModule(page, 'Skid Steer Demo')
    test.skip(!ok, 'Skid Steer Demo editor not reachable on this estimate.')
    // Demos toggle In House ↔ Subcontractor via the crew-type bar (dumpType). Both
    // modes must render pricing with no NaN.
    for (const mode of [/^in.?house$/i, /^subcontractor$/i]) {
      const btn = page.getByRole('button', { name: mode }).first()
      if (!(await btn.count())) continue
      await btn.click().catch(() => {})
      await expect
        .poll(() => page.evaluate(() => /\bNaN\b|Infinity/.test(document.body.innerText)), {
          timeout: 8000,
          message: `Demo mode ${mode} produced NaN/Infinity`,
        })
        .toBe(false)
    }
    await expect(page.getByText(/\$[\d,]/).first(), 'No pricing rendered').toBeVisible()
  })

  test('live edit reflects: changing a field moves the total (Goal 4 in-browser)', async ({ page }) => {
    const ok = await openModule(page, 'Skid Steer Demo')
    test.skip(!ok, 'Skid Steer Demo editor not reachable on this estimate.')
    const dollars = () => page.evaluate(() => (document.body.innerText.match(/\$[\d,]+(\.\d+)?/g) || []).join('|'))
    const target = page.locator('input[type="number"], input[step]').first()
    test.skip(!(await target.count()), 'No numeric input to drive a live edit.')
    await target.click().catch(() => {})
    await target.fill('1').catch(() => {})
    await page.waitForTimeout(400)
    const before = await dollars()
    await target.click().catch(() => {})
    await target.fill('88').catch(() => {})
    await expect
      .poll(dollars, { timeout: 8000, message: 'Total did not change after editing a field' })
      .not.toBe(before)
  })
})
