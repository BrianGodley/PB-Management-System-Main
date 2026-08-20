import { test, expect } from '@playwright/test'
import { collectErrors, openModule, scanEveryOptionForNaN } from './helpers.js'

// ─────────────────────────────────────────────────────────────────────────────
// Walls module — the live-browser layer of the MODULE-TEST-CHECKLIST (Goal 4 +
// exhaustive UI coverage). The unit suite (wallsCalc/wallsSections/wallsStruct
// .test.mjs, 65 tests) locks the math; this proves the wired-up editor: every
// picker populates, every option + every wall-type tab computes without NaN, the
// Sub tab prices, and a live field edit moves the total.
//
// NON-DESTRUCTIVE: opens a test estimate + the Walls editor, reads/enters values,
// NEVER saves. Requires TEST_ESTIMATE_URL. First-run selectors are text/section
// based; screenshots attach so the loop can harden them.
// ─────────────────────────────────────────────────────────────────────────────
const ESTIMATE = process.env.TEST_ESTIMATE_URL
const UNPRICED = /labor rate needed|price me|unpriced|missing price|needs? a price|set (a |the )?price/i
const WALL_TYPES = ['CMU', 'Poured in Place', 'Modular', 'Brick', 'Timber']

test.describe('Walls', () => {
  test.skip(!ESTIMATE, 'Set TEST_ESTIMATE_URL to a test estimate to enable Walls checks.')

  test('module editor opens with the wall-type tabs', async ({ page }, testInfo) => {
    const errors = collectErrors(page)
    const ok = await openModule(page, 'Walls')
    await testInfo.attach('walls.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    expect(ok, 'Could not open the Walls module editor — check the add/edit flow.').toBeTruthy()
    // At least one wall-type tab must render.
    const anyTab = page.getByRole('button', { name: new RegExp(WALL_TYPES.join('|'), 'i') })
    expect(await anyTab.count(), 'No wall-type tabs (CMU/PIP/Modular/Brick/Timber)').toBeGreaterThan(0)
    expect(errors, `Console/HTTP errors:\n${errors.join('\n')}`).toEqual([])
  })

  test('every Type dropdown is populated (no empty picker)', async ({ page }) => {
    const ok = await openModule(page, 'Walls')
    test.skip(!ok, 'Walls editor not reachable on this estimate.')
    const selects = page.locator('select')
    const n = await selects.count()
    expect(n, 'No <select> pickers found in Walls editor').toBeGreaterThan(0)
    for (let i = 0; i < n; i++) {
      const opts = await selects.nth(i).locator('option').count()
      expect(opts, `Select #${i} is empty (only a placeholder / no options)`).toBeGreaterThan(1)
    }
  })

  test('exhaustive: every TYPE dropdown option computes without a NaN/console error', async ({ page }, testInfo) => {
    test.setTimeout(180000)
    const errors = collectErrors(page)
    const ok = await openModule(page, 'Walls')
    test.skip(!ok, 'Walls editor not reachable on this estimate.')
    // Fast DOM-dispatch scan (helpers.scanEveryOptionForNaN) — cycles every
    // non-vendor option without Playwright's per-option actionability waits.
    const bad = await scanEveryOptionForNaN(page)
    await testInfo.attach('walls-exhaustive.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    expect(bad, `Options producing NaN/Infinity: ${bad.join(', ')}`).toEqual([])
    expect(errors, `Console/HTTP errors:\n${errors.join('\n')}`).toEqual([])
  })

  test('exhaustive: every wall-type tab computes without NaN', async ({ page }) => {
    const ok = await openModule(page, 'Walls')
    test.skip(!ok, 'Walls editor not reachable on this estimate.')
    for (const t of WALL_TYPES) {
      const tab = page.getByRole('button', { name: new RegExp(t, 'i') }).first()
      if (!(await tab.count())) continue
      await tab.click().catch(() => {})
      await expect
        .poll(() => page.evaluate(() => /\bNaN\b|Infinity/.test(document.body.innerText)), {
          timeout: 8000,
          message: `Wall type ${t} produced NaN/Infinity`,
        })
        .toBe(false)
    }
  })

  test('exhaustive: numeric fields accept input and the module computes a total', async ({ page }) => {
    const ok = await openModule(page, 'Walls')
    test.skip(!ok, 'Walls editor not reachable on this estimate.')
    const nums = page.locator('input[type="number"], input[step]')
    const n = Math.min(await nums.count(), 60)
    for (let i = 0; i < n; i++) {
      const inp = nums.nth(i)
      if (!(await inp.isVisible().catch(() => false))) continue
      await inp.click().catch(() => {})
      await inp.fill('5').catch(() => {})
    }
    await page.waitForTimeout(300)
    await expect(page.getByText(/\$[\d,]/).first(), 'No dollar total after entering values').toBeVisible()
    expect(await page.getByText(UNPRICED).count(), 'Unpriced prompt after filling priced fields').toBe(0)
  })

  test('Subcontractor tab renders and prices', async ({ page }) => {
    const ok = await openModule(page, 'Walls')
    test.skip(!ok, 'Walls editor not reachable on this estimate.')
    const subTab = page.getByRole('button', { name: /^subcontractor$/i }).first()
    if (!(await subTab.count())) return
    await subTab.click().catch(() => {})
    await page.waitForTimeout(300)
    await expect(page.getByText(/\$[\d,]/).first(), 'Sub tab shows no pricing').toBeVisible()
    expect(await page.getByText(UNPRICED).count(), 'Unpriced prompt on Sub tab').toBe(0)
  })

  test('live edit reflects: changing a field moves the total (Goal 4 in-browser)', async ({ page }) => {
    const ok = await openModule(page, 'Walls')
    test.skip(!ok, 'Walls editor not reachable on this estimate.')
    const dollars = () => page.evaluate(() => (document.body.innerText.match(/\$[\d,]+(\.\d+)?/g) || []).join('|'))
    const nums = page.locator('input[type="number"], input[step]')
    const target = nums.first()
    test.skip(!(await target.count()), 'No numeric input to drive a live edit.')
    await target.click().catch(() => {})
    await target.fill('1').catch(() => {})
    await page.waitForTimeout(400)
    const before = await dollars()
    await target.click().catch(() => {})
    await target.fill('99').catch(() => {})
    // A live recompute must change the on-page dollar figures.
    await expect
      .poll(dollars, { timeout: 8000, message: 'Total did not change after editing a field' })
      .not.toBe(before)
  })
})
