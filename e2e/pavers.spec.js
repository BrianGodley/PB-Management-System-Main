import { test, expect } from '@playwright/test'
import { collectErrors, openModule, scanEveryOptionForNaN } from './helpers.js'

// ─────────────────────────────────────────────────────────────────────────────
// Pavers module — live-browser layer of the MODULE-TEST-CHECKLIST. Paver areas with
// Vendor/Type pickers (Paver Material + Base Material, catalog-driven), plus install
// SF, straight/curved cuts, restraints, sleeves, vertical soldier, sealer, and poly
// sand — all hrs-per-unit labor read by NAME. No-fallback: an unset rate reads 0 and a
// catalog item with no row resolves $0 (proven in paverCalc.test.mjs). In-House ↔
// Subcontractor toggle. This proves: pickers populate, every vendor × item option
// computes without NaN, numeric fields price, both crew modes render, a live edit
// moves the total, and no console/HTTP errors.
//
// NON-DESTRUCTIVE: opens a test estimate + the Pavers editor, reads/enters values,
// NEVER saves. Requires TEST_ESTIMATE_URL + a Pavers module on the estimate.
// ─────────────────────────────────────────────────────────────────────────────
const ESTIMATE = process.env.TEST_ESTIMATE_URL

test.describe('Pavers', () => {
  test.skip(!ESTIMATE, 'Set TEST_ESTIMATE_URL to a test estimate to enable Pavers checks.')

  test('module editor opens with pavers sections', async ({ page }, testInfo) => {
    const errors = collectErrors(page)
    const ok = await openModule(page, 'Pavers')
    await testInfo.attach('pavers.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    test.skip(!ok, 'Pavers module not on this estimate.')
    const anySection = page.getByText(/Paver|Base|Cut|Restraint|Vertical Soldier|Sealer|Poly Sand/i)
    expect(await anySection.count(), 'No Pavers sections rendered').toBeGreaterThan(0)
    expect(errors, `Console/HTTP errors:\n${errors.join('\n')}`).toEqual([])
  })

  test('exhaustive: every vendor × item option computes without NaN/console error', async ({ page }, testInfo) => {
    test.setTimeout(240000)
    const errors = collectErrors(page)
    const ok = await openModule(page, 'Pavers')
    test.skip(!ok, 'Pavers editor not reachable on this estimate.')
    const bad = []
    for (const mode of ['In House', 'In-House', 'Subcontractor', 'Sub']) {
      const btn = page.getByRole('button', { name: new RegExp(`^\\s*${mode}\\s*$`, 'i') }).first()
      if (!(await btn.count())) continue
      await btn.click().catch(() => {})
      await page.waitForTimeout(250)
      for (const h of await scanEveryOptionForNaN(page)) bad.push(`[${mode}] ${h}`)
    }
    if (!bad.length) for (const h of await scanEveryOptionForNaN(page)) bad.push(h)
    await testInfo.attach('pavers-exhaustive.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    expect(bad, `Vendor × item combos producing NaN/Infinity:\n${bad.join('\n')}`).toEqual([])
    expect(errors, `Console/HTTP errors:\n${errors.join('\n')}`).toEqual([])
  })

  test('numeric fields accept input and the module computes a total', async ({ page }) => {
    const ok = await openModule(page, 'Pavers')
    test.skip(!ok, 'Pavers editor not reachable on this estimate.')
    const nums = page.locator('input[type="number"], input[step]')
    const n = Math.min(await nums.count(), 60)
    for (let i = 0; i < n; i++) {
      const inp = nums.nth(i)
      if (!(await inp.isVisible().catch(() => false))) continue
      await inp.click().catch(() => {})
      await inp.fill('50').catch(() => {})
    }
    await page.waitForTimeout(400)
    await expect(page.getByText(/\$[\d,]/).first(), 'No dollar total after entering values').toBeVisible()
    // NOTE: we do NOT assert "no unpriced banner" — driving raw SF on rows whose
    // Vendor/Type is unset legitimately surfaces the no-fallback fix-it banner. The
    // unpriced behavior itself is proven deterministically in paversCalc.test.mjs.
  })

  test('In-House and Subcontractor both render pricing without NaN', async ({ page }) => {
    const ok = await openModule(page, 'Pavers')
    test.skip(!ok, 'Pavers editor not reachable on this estimate.')
    for (const mode of [/^in.?house$/i, /^subcontractor$/i]) {
      const btn = page.getByRole('button', { name: mode }).first()
      if (!(await btn.count())) continue
      await btn.click().catch(() => {})
      await expect
        .poll(() => page.evaluate(() => /\bNaN\b|Infinity/.test(document.body.innerText)), {
          timeout: 8000,
          message: `Pavers mode ${mode} produced NaN/Infinity`,
        })
        .toBe(false)
    }
    await expect(page.getByText(/\$[\d,]/).first(), 'No pricing rendered').toBeVisible()
  })

  test('live edit reflects: changing a field moves the total (Goal 4 in-browser)', async ({ page }) => {
    const ok = await openModule(page, 'Pavers')
    test.skip(!ok, 'Pavers editor not reachable on this estimate.')
    const dollars = () => page.evaluate(() => (document.body.innerText.match(/\$[\d,]+(\.\d+)?/g) || []).join('|'))
    const target = page.locator('input[type="number"], input[step]').first()
    test.skip(!(await target.count()), 'No numeric input to drive a live edit.')
    await target.click().catch(() => {})
    await target.fill('100').catch(() => {})
    await page.waitForTimeout(400)
    const before = await dollars()
    await target.click().catch(() => {})
    await target.fill('900').catch(() => {})
    await expect
      .poll(dollars, { timeout: 8000, message: 'Total did not change after editing a field' })
      .not.toBe(before)
  })
})
