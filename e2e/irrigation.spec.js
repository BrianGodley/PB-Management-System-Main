import { test, expect } from '@playwright/test'
import { collectErrors, fillField, moduleRowTitles, openModule, scanEveryOptionForNaN } from './helpers.js'

// ─────────────────────────────────────────────────────────────────────────────
// Irrigation module — live-browser layer of the MODULE-TEST-CHECKLIST. Zone rows
// (Planter Spray / Lawn / Hillside / Drip assemblies) price per-zone labor by NAME
// (Trench vs Hand keys) plus a live bill-of-materials, and Timer rows price per-timer
// install labor + a catalog timer material (vendor-first → Standard). All labor is
// hrs-per-unit read by name. No-fallback: an unset labor rate reads 0 and an unpriced
// BOM line surfaces in the zone row's `missing` list at $0 (proven deterministically in
// irrigationCalc.test.mjs). In-House ↔ Subcontractor toggle. This proves: pickers
// populate, every zone/timer option computes without NaN, numeric fields price, both crew
// modes render, a live edit moves the total, and no console/HTTP errors.
//
// NON-DESTRUCTIVE: opens a test estimate + the Irrigation editor, reads/enters values,
// NEVER saves. Requires TEST_ESTIMATE_URL + an Irrigation module on the estimate.
// ─────────────────────────────────────────────────────────────────────────────
const ESTIMATE = process.env.TEST_ESTIMATE_URL

// A whole-suite skip is a SILENT GAP — a skipped test verified nothing, which reads
// like a pass. When the Irrigation editor will not open, name the module rows that ARE on
// the estimate so the next run tells "Irrigation is not on this estimate" (fix the estimate
// / TEST_ESTIMATE_URL) apart from "the row is named or marked up differently" (fix the
// selector), instead of skipping anonymously.
async function openIrrigation(page) {
  const ok = await openModule(page, 'Irrigation')
  if (ok) return { ok, why: '' }
  const titles = await moduleRowTitles(page)
  return {
    ok,
    why: `Irrigation editor not reachable — module rows on this estimate: ${
      titles.length ? titles.join(' | ') : '(no clickable module rows found)'
    }`,
  }
}

test.describe('Irrigation', () => {
  test.skip(!ESTIMATE, 'Set TEST_ESTIMATE_URL to a test estimate to enable Irrigation checks.')

  test('module editor opens with irrigation sections', async ({ page }, testInfo) => {
    const errors = collectErrors(page)
    const { ok, why } = await openIrrigation(page)
    await testInfo.attach('irrigation.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    test.skip(!ok, why)
    const anySection = page.getByText(/Zone|Timer|Spray|Lawn|Drip|Station/i)
    expect(await anySection.count(), 'No Irrigation sections rendered').toBeGreaterThan(0)
    expect(errors, `Console/HTTP errors:\n${errors.join('\n')}`).toEqual([])
  })

  test('exhaustive: every zone/timer × vendor option computes without NaN/console error', async ({ page }, testInfo) => {
    test.setTimeout(240000)
    const errors = collectErrors(page)
    const { ok, why } = await openIrrigation(page)
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
    await testInfo.attach('irrigation-exhaustive.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    expect(bad, `Zone/timer × vendor combos producing NaN/Infinity:\n${bad.join('\n')}`).toEqual([])
    expect(errors, `Console/HTTP errors:\n${errors.join('\n')}`).toEqual([])
  })

  test('numeric fields accept input and the module computes a total', async ({ page }) => {
    const { ok, why } = await openIrrigation(page)
    test.skip(!ok, why)
    const nums = page.locator('input[type="number"], input[step]')
    const n = Math.min(await nums.count(), 60)
    for (let i = 0; i < n; i++) {
      const inp = nums.nth(i)
      if (!(await inp.isVisible().catch(() => false))) continue
      // fillField (not fill): Layout.jsx's autofill guard marks every input readonly
      // until its first focus, and fill()'s editable check runs BEFORE it focuses.
      await fillField(inp, '2').catch(() => {})
    }
    await page.waitForTimeout(400)
    await expect(page.getByText(/\$[\d,]/).first(), 'No dollar total after entering values').toBeVisible()
    // NOTE: we do NOT assert "no unpriced banner" — driving zone qty on rows whose
    // BOM items or labor are unset legitimately surfaces the no-fallback fix-it path.
    // The unpriced behavior itself is proven deterministically in irrigationCalc.test.mjs.
  })

  test('In-House and Subcontractor both render pricing without NaN', async ({ page }) => {
    const { ok, why } = await openIrrigation(page)
    test.skip(!ok, why)
    for (const mode of [/^in.?house$/i, /^subcontractor$/i]) {
      const btn = page.getByRole('button', { name: mode }).first()
      if (!(await btn.count())) continue
      await btn.click().catch(() => {})
      await expect
        .poll(() => page.evaluate(() => /\bNaN\b|Infinity/.test(document.body.innerText)), {
          timeout: 8000,
          message: `Irrigation mode ${mode} produced NaN/Infinity`,
        })
        .toBe(false)
    }
    await expect(page.getByText(/\$[\d,]/).first(), 'No pricing rendered').toBeVisible()
  })

  test('live edit reflects: changing a field moves the total (Goal 4 in-browser)', async ({ page }) => {
    const { ok, why } = await openIrrigation(page)
    test.skip(!ok, why)
    const dollars = () => page.evaluate(() => (document.body.innerText.match(/\$[\d,]+(\.\d+)?/g) || []).join('|'))
    const target = page.locator('input[type="number"], input[step]').first()
    // Not a skip: the editor is open by this point, so "no numeric input" means the
    // module rendered nothing drivable — a real failure, not a reason to go quiet.
    await expect(
      target,
      'No numeric input in the open Irrigation editor — the module rendered no drivable field.'
    ).toHaveCount(1)
    // fillField + toHaveValue separate "the edit never landed" (selector/readonly) from
    // "the edit landed and the total did not move" (a real recompute/pricing bug).
    await fillField(target, '1')
    await expect(target, 'Irrigation field did not accept 1').toHaveValue('1')
    await page.waitForTimeout(600)
    const before = await dollars()
    await fillField(target, '9')
    await target.blur().catch(() => {})
    await expect(target, 'Irrigation field did not accept 9').toHaveValue('9')
    const where = await target.evaluate(el => el.outerHTML.slice(0, 200))
    await expect
      .poll(dollars, {
        timeout: 10000,
        message: `Total did not change after editing an Irrigation field 1 -> 9 (the input accepted the value, so this is a recompute/pricing issue, not a selector one). Input: ${where}`,
      })
      .not.toBe(before)
  })
})
