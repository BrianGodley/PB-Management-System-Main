import { test, expect } from '@playwright/test'
import { collectErrors, fillField, openModule, scanEveryOptionForNaN } from './helpers.js'

// ─────────────────────────────────────────────────────────────────────────────
// Concrete module — live-browser layer of the MODULE-TEST-CHECKLIST. Concrete is
// the NO-FALLBACK reference: Base Install + Concrete Install (per size-tier) rows
// with Vendor/Type pickers, rebar/form/sleeve, finishes, and an "unpriced items"
// fix-it banner when a picked item has no catalog price. In-House ↔ Subcontractor
// toggle instead of type tabs. This proves: pickers populate, every vendor × item
// option computes without NaN, numeric fields price, both crew modes render, a live
// edit moves the total, and no console/HTTP errors.
//
// NON-DESTRUCTIVE: opens a test estimate + the Concrete editor, reads/enters values,
// NEVER saves. Requires TEST_ESTIMATE_URL + a Concrete module on the estimate.
// ─────────────────────────────────────────────────────────────────────────────
const ESTIMATE = process.env.TEST_ESTIMATE_URL

test.describe('Concrete', () => {
  test.skip(!ESTIMATE, 'Set TEST_ESTIMATE_URL to a test estimate to enable Concrete checks.')

  test('module editor opens with concrete sections', async ({ page }, testInfo) => {
    const errors = collectErrors(page)
    const ok = await openModule(page, 'Concrete')
    await testInfo.attach('concrete.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    test.skip(!ok, 'Concrete module not on this estimate.')
    const anySection = page.getByText(/Base Install|Concrete Install|Rebar|Finish|Manual/i)
    expect(await anySection.count(), 'No Concrete sections rendered').toBeGreaterThan(0)
    expect(errors, `Console/HTTP errors:\n${errors.join('\n')}`).toEqual([])
  })

  test('exhaustive: every vendor × item option computes without NaN/console error', async ({ page }, testInfo) => {
    test.setTimeout(240000)
    const errors = collectErrors(page)
    const ok = await openModule(page, 'Concrete')
    test.skip(!ok, 'Concrete editor not reachable on this estimate.')
    const bad = []
    for (const mode of ['In House', 'In-House', 'Subcontractor', 'Sub']) {
      const btn = page.getByRole('button', { name: new RegExp(`^\\s*${mode}\\s*$`, 'i') }).first()
      if (!(await btn.count())) continue
      await btn.click().catch(() => {})
      await page.waitForTimeout(250)
      for (const h of await scanEveryOptionForNaN(page)) bad.push(`[${mode}] ${h}`)
    }
    if (!bad.length) for (const h of await scanEveryOptionForNaN(page)) bad.push(h)
    await testInfo.attach('concrete-exhaustive.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    expect(bad, `Vendor × item combos producing NaN/Infinity:\n${bad.join('\n')}`).toEqual([])
    expect(errors, `Console/HTTP errors:\n${errors.join('\n')}`).toEqual([])
  })

  test('numeric fields accept input and the module computes a total', async ({ page }) => {
    const ok = await openModule(page, 'Concrete')
    test.skip(!ok, 'Concrete editor not reachable on this estimate.')
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
    // unpriced behavior itself is proven deterministically in concreteCalc.test.mjs.
  })

  test('In-House and Subcontractor both render pricing without NaN', async ({ page }) => {
    const ok = await openModule(page, 'Concrete')
    test.skip(!ok, 'Concrete editor not reachable on this estimate.')
    for (const mode of [/^in.?house$/i, /^subcontractor$/i]) {
      const btn = page.getByRole('button', { name: mode }).first()
      if (!(await btn.count())) continue
      await btn.click().catch(() => {})
      await expect
        .poll(() => page.evaluate(() => /\bNaN\b|Infinity/.test(document.body.innerText)), {
          timeout: 8000,
          message: `Concrete mode ${mode} produced NaN/Infinity`,
        })
        .toBe(false)
    }
    await expect(page.getByText(/\$[\d,]/).first(), 'No pricing rendered').toBeVisible()
  })

  // View Rates COVERAGE — same regression family as Pavers: a Base-Prep-only
  // rateScope flips buildViewRates into scope-only mode and drops the whole
  // Concrete category (mix / rebar / finish material + all install/finish labor)
  // while the module still prices correctly, so NaN/total-moves tests stay green.
  // Assert the popup actually lists concrete MATERIAL + concrete LABOR.
  test('View Rates lists concrete materials AND labor (coverage, not just Base Prep)', async ({ page }, testInfo) => {
    const ok = await openModule(page, 'Concrete')
    test.skip(!ok, 'Concrete editor not reachable on this estimate.')
    await page.getByRole('button', { name: /view rates/i }).first().click()
    const heading = page.getByText(/—\s*All Rates/i).first()
    await expect(heading, 'View Rates popup did not open').toBeVisible({ timeout: 10000 })
    const modal = heading.locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]')
    await testInfo.attach('concrete-viewrates.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    await expect(
      modal.getByText(/Class II Roadbase|Ready Mix|Hand Mix|Rebar/i).first(),
      'View Rates shows NO concrete material rows (scope dropped the material catalog).'
    ).toBeVisible()
    await expect(
      modal.getByText(/Install|Rebar|Form|Sleeve|Vapor|Sealer|Finish/i).first(),
      'View Rates shows only Base Prep — the Concrete labor category is missing.'
    ).toBeVisible()
  })

  test('live edit reflects: changing a field moves the total (Goal 4 in-browser)', async ({ page }) => {
    const ok = await openModule(page, 'Concrete')
    test.skip(!ok, 'Concrete editor not reachable on this estimate.')
    const dollars = () => page.evaluate(() => (document.body.innerText.match(/\$[\d,]+(\.\d+)?/g) || []).join('|'))
    // Drive the first several VISIBLE numeric inputs, not just input.first(): the very
    // first field is often a job-site/difficulty input that doesn't move the total on
    // this estimate (a selector false-negative), so a single-field edit is flaky. At
    // least one of the first handful is a quantity/SF that recomputes pricing.
    const nums = page.locator('input[type="number"], input[step]')
    const count = Math.min(await nums.count(), 10)
    test.skip(!count, 'No numeric input to drive a live edit.')
    // Use fillField (focus + clear the autofill-guard readonly) — a bare .fill() waits
    // out its actionability timeout on a never-focused readonly input and blows the test
    // timeout. Only fill visible fields.
    for (let i = 0; i < count; i++) {
      const inp = nums.nth(i)
      if (await inp.isVisible().catch(() => false)) await fillField(inp, '100').catch(() => {})
    }
    await page.waitForTimeout(400)
    const before = await dollars()
    for (let i = 0; i < count; i++) {
      const inp = nums.nth(i)
      if (await inp.isVisible().catch(() => false)) await fillField(inp, '900').catch(() => {})
    }
    await expect
      .poll(dollars, { timeout: 8000, message: 'Total did not change after editing the numeric fields' })
      .not.toBe(before)
  })
})
