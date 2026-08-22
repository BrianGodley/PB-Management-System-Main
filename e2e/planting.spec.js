import { test, expect } from '@playwright/test'
import { collectErrors, fillField, moduleRowTitles, openModule, scanEveryOptionForNaN } from './helpers.js'

// ─────────────────────────────────────────────────────────────────────────────
// Planting module — live-browser layer of the MODULE-TEST-CHECKLIST. Three material
// sections (Small Plants / Large Plants / Planting Add-Ons) with Vendor + Item pickers,
// plus a Till & Amend section and optional Yard Checks. Per-plant install labor is
// ITEM-DRIVEN (hrs = qty × labor_rates[item.calc_meta.labor_rate], hrs-per-plant); plant
// material is the row's vendor-defaulted unit price. Add-ons: hrs = qty × labor_rates
// [labKey]; material vendor-first → Standard. No-fallback: an unset plant labor rate reads
// 0 hrs + 0 material (guard) and surfaces in the fix-it list (proven deterministically in
// plantingCalc.test.mjs). In-House ↔ Subcontractor toggle (Sub = flat $/unit, no labor).
// This proves: pickers populate, every vendor × Item option computes without NaN, numeric
// fields price, both crew modes render, a live edit moves the total, and no console/HTTP
// errors.
//
// NON-DESTRUCTIVE: opens a test estimate + the Planting editor, reads/enters values, NEVER
// saves. Requires TEST_ESTIMATE_URL + a Planting module on the estimate.
// ─────────────────────────────────────────────────────────────────────────────
const ESTIMATE = process.env.TEST_ESTIMATE_URL

// A whole-suite skip is a SILENT GAP — a skipped test verified nothing, which reads like a
// pass. When the Planting editor will not open, name the module rows that ARE on the
// estimate so the next run tells "Planting is not on this estimate" (fix the estimate /
// TEST_ESTIMATE_URL) apart from "the row is named differently" (fix the selector).
async function openPlanting(page) {
  const ok = await openModule(page, 'Planting')
  if (ok) return { ok, why: '' }
  const titles = await moduleRowTitles(page)
  return {
    ok,
    why: `Planting editor not reachable — module rows on this estimate: ${
      titles.length ? titles.join(' | ') : '(no clickable module rows found)'
    }`,
  }
}

test.describe('Planting', () => {
  test.skip(!ESTIMATE, 'Set TEST_ESTIMATE_URL to a test estimate to enable Planting checks.')

  test('module editor opens with planting sections', async ({ page }, testInfo) => {
    const errors = collectErrors(page)
    const { ok, why } = await openPlanting(page)
    await testInfo.attach('planting.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    test.skip(!ok, why)
    const anySection = page.getByText(/Small Plants|Large Plants|Planting Add-Ons|Till/i)
    expect(await anySection.count(), 'No Planting sections rendered').toBeGreaterThan(0)
    expect(errors, `Console/HTTP errors:\n${errors.join('\n')}`).toEqual([])
  })

  test('exhaustive: every vendor × Item option computes without NaN/console error', async ({ page }, testInfo) => {
    test.setTimeout(240000)
    const errors = collectErrors(page)
    const { ok, why } = await openPlanting(page)
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
    await testInfo.attach('planting-exhaustive.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    expect(bad, `Vendor × Item combos producing NaN/Infinity:\n${bad.join('\n')}`).toEqual([])
    expect(errors, `Console/HTTP errors:\n${errors.join('\n')}`).toEqual([])
  })

  test('numeric fields accept input and the module computes a total', async ({ page }) => {
    const { ok, why } = await openPlanting(page)
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
    // NOTE: we do NOT assert "no unpriced banner" — driving qty on rows whose plant labor is
    // unset legitimately surfaces the no-fallback fix-it path. That behavior is proven
    // deterministically in plantingCalc.test.mjs.
  })

  test('In-House and Subcontractor both render pricing without NaN', async ({ page }) => {
    const { ok, why } = await openPlanting(page)
    test.skip(!ok, why)
    for (const mode of [/^in.?house$/i, /^subcontractor$/i]) {
      const btn = page.getByRole('button', { name: mode }).first()
      if (!(await btn.count())) continue
      await btn.click().catch(() => {})
      await expect
        .poll(() => page.evaluate(() => /\bNaN\b|Infinity/.test(document.body.innerText)), {
          timeout: 8000,
          message: `Planting mode ${mode} produced NaN/Infinity`,
        })
        .toBe(false)
    }
    await expect(page.getByText(/\$[\d,]/).first(), 'No pricing rendered').toBeVisible()
  })

  test('live edit reflects: changing Hours Adj moves the total (Goal 4 in-browser)', async ({ page }) => {
    const { ok, why } = await openPlanting(page)
    test.skip(!ok, why)
    // Ensure the In-House tab is active — the saved module can open on the Subcontractor
    // tab, where "Job Site Conditions / Hours Adj" (In-House only) is not rendered.
    const ihBtn = page.getByRole('button', { name: /^in.?house$/i }).first()
    if (await ihBtn.count()) { await ihBtn.click().catch(() => {}); await page.waitForTimeout(300) }
    const dollars = () => page.evaluate(() => (document.body.innerText.match(/\$[\d,]+(\.\d+)?/g) || []).join('|'))
    // Drive "Hours Adj (±hrs)" specifically, NOT the first numeric input. The module's first
    // numeric field is Difficulty (%), which only *scales* existing labor hours — it cannot
    // move the total when the Planting module on this estimate has no priced line items
    // (0 × anything = 0), a false Goal-4 failure. Hours Adj *adds* labor hours directly, so
    // its edit always moves the total on the In-House tab, independent of catalog pricing.
    // (The pure recompute is proven in plantingCalc.test.mjs's edit-reflects case.)
    const target = page.locator('div:has(> p:has-text("Hours Adj")) input[type="number"]').first()
    // Not a skip: In-House renders Job Site Conditions, so a missing Hours Adj field means the
    // editor rendered wrong — a real failure, not a reason to go quiet.
    await expect(
      target,
      'Hours Adj field not found in the open Planting editor (In-House Job Site Conditions).'
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
