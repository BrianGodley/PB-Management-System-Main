import { test, expect } from '@playwright/test'
import { collectErrors, fillField, moduleRowTitles, openModule, scanEveryOptionForNaN } from './helpers.js'

// ─────────────────────────────────────────────────────────────────────────────
// Steps module — live-browser layer of the MODULE-TEST-CHECKLIST. Five material step
// sections (Paver / Brick / Tiled / Flagstone with Vendor + Type pickers, and Concrete
// with Type/Finish/Form). Material-step labor is form-driven (hrs = SF × labor_rates
// ['Steps - <Form>'], hrs-per-Ln-Ft); step material is the picked catalog item's
// unit_cost (vendor-first → Standard). Concrete labor = LF × (type + finish) × form
// multiplier; concrete material = LF × (typeMat + finishMat). No-fallback: an unset form
// rate reads 0 hrs and an unresolved step material adds $0 (proven deterministically in
// stepsCalc.test.mjs). In-House ↔ Subcontractor toggle (Sub = flat $/Ln Ft, no labor).
// This proves: pickers populate, every vendor × Type option computes without NaN, numeric
// fields price, both crew modes render, a live edit moves the total, and no console/HTTP
// errors.
//
// NON-DESTRUCTIVE: opens a test estimate + the Steps editor, reads/enters values, NEVER
// saves. Requires TEST_ESTIMATE_URL + a Steps module on the estimate.
// ─────────────────────────────────────────────────────────────────────────────
const ESTIMATE = process.env.TEST_ESTIMATE_URL

// A whole-suite skip is a SILENT GAP — a skipped test verified nothing, which reads like a
// pass. When the Steps editor will not open, name the module rows that ARE on the estimate
// so the next run tells "Steps is not on this estimate" (fix the estimate / TEST_ESTIMATE_URL)
// apart from "the row is named differently" (fix the selector), instead of skipping anonymously.
async function openSteps(page) {
  const ok = await openModule(page, 'Steps')
  if (ok) return { ok, why: '' }
  const titles = await moduleRowTitles(page)
  return {
    ok,
    why: `Steps editor not reachable — module rows on this estimate: ${
      titles.length ? titles.join(' | ') : '(no clickable module rows found)'
    }`,
  }
}

test.describe('Steps', () => {
  test.skip(!ESTIMATE, 'Set TEST_ESTIMATE_URL to a test estimate to enable Steps checks.')

  test('module editor opens with step sections', async ({ page }, testInfo) => {
    const errors = collectErrors(page)
    const { ok, why } = await openSteps(page)
    await testInfo.attach('steps.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    test.skip(!ok, why)
    const anySection = page.getByText(/Paver Steps|Brick Steps|Tiled Steps|Flagstone Steps|Concrete Steps/i)
    expect(await anySection.count(), 'No Steps sections rendered').toBeGreaterThan(0)
    expect(errors, `Console/HTTP errors:\n${errors.join('\n')}`).toEqual([])
  })

  test('exhaustive: every vendor × Type option computes without NaN/console error', async ({ page }, testInfo) => {
    test.setTimeout(240000)
    const errors = collectErrors(page)
    const { ok, why } = await openSteps(page)
    test.skip(!ok, why)
    const bad = []
    for (const mode of ['In House', 'In-House', 'Subcontractor', 'Sub']) {
      const btn = page.getByRole('button', { name: new RegExp(`^\\s*${mode}\\s*$`, 'i') }).first()
      if (!(await btn.count())) continue
      await btn.click().catch(() => {})
      await page.waitForTimeout(250)
      for (const h of await scanEveryOptionForNaN(page)) bad.push(`[${mode}] ${h}`)
    }
    if (!bad.length) for (const h of await scanEveryOptionForNaN(page)) bad.push(h)
    await testInfo.attach('steps-exhaustive.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    expect(bad, `Vendor × Type combos producing NaN/Infinity:\n${bad.join('\n')}`).toEqual([])
    expect(errors, `Console/HTTP errors:\n${errors.join('\n')}`).toEqual([])
  })

  test('numeric fields accept input and the module computes a total', async ({ page }) => {
    const { ok, why } = await openSteps(page)
    test.skip(!ok, why)
    const nums = page.locator('input[type="number"], input[step]')
    const n = Math.min(await nums.count(), 60)
    for (let i = 0; i < n; i++) {
      const inp = nums.nth(i)
      if (!(await inp.isVisible().catch(() => false))) continue
      await fillField(inp, '3').catch(() => {})
    }
    await page.waitForTimeout(400)
    await expect(page.getByText(/\$[\d,]/).first(), 'No dollar total after entering values').toBeVisible()
    // NOTE: we do NOT assert "no unpriced banner" — driving SF on rows whose form labor or
    // step material is unset legitimately surfaces the no-fallback path. That behavior is
    // proven deterministically in stepsCalc.test.mjs.
  })

  test('In-House and Subcontractor both render pricing without NaN', async ({ page }) => {
    const { ok, why } = await openSteps(page)
    test.skip(!ok, why)
    for (const mode of [/^in.?house$/i, /^subcontractor$/i]) {
      const btn = page.getByRole('button', { name: mode }).first()
      if (!(await btn.count())) continue
      await btn.click().catch(() => {})
      await expect
        .poll(() => page.evaluate(() => /\bNaN\b|Infinity/.test(document.body.innerText)), {
          timeout: 8000,
          message: `Steps mode ${mode} produced NaN/Infinity`,
        })
        .toBe(false)
    }
    await expect(page.getByText(/\$[\d,]/).first(), 'No pricing rendered').toBeVisible()
  })

  test('live edit reflects: changing Hours Adj moves the total (Goal 4 in-browser)', async ({ page }) => {
    const { ok, why } = await openSteps(page)
    test.skip(!ok, why)
    const dollars = () => page.evaluate(() => (document.body.innerText.match(/\$[\d,]+(\.\d+)?/g) || []).join('|'))
    // Drive "Hours Adj (±hrs)" specifically, NOT the first numeric input. The module's first
    // numeric field is Difficulty (%), which only *scales* existing labor hours — it cannot
    // move the total when the Steps module on this estimate has no priced line items
    // (0 × anything = 0), which reads as a false Goal-4 failure. Hours Adj *adds* labor hours
    // directly, so on the In-House tab its edit always moves the total, independent of catalog
    // pricing. (The pure recompute is proven in stepsCalc.test.mjs's edit-reflects case.)
    const target = page.locator('div:has(> p:has-text("Hours Adj")) input[type="number"]').first()
    // Not a skip: In-House renders Job Site Conditions, so a missing Hours Adj field means the
    // editor rendered wrong — a real failure, not a reason to go quiet.
    await expect(
      target,
      'Hours Adj field not found in the open Steps editor (In-House Job Site Conditions).'
    ).toHaveCount(1)
    await fillField(target, '2')
    await expect(target, 'Hours Adj did not accept 2').toHaveValue('2')
    await page.waitForTimeout(600)
    const before = await dollars()
    await fillField(target, '20')
    await target.blur().catch(() => {})
    await expect(target, 'Hours Adj did not accept 20').toHaveValue('20')
    await expect
      .poll(dollars, {
        timeout: 10000,
        message:
          'Total did not change after editing Hours Adj 2 -> 20 hrs (the input accepted the value, so this is a recompute/pricing issue, not a selector one).',
      })
      .not.toBe(before)
  })
})
