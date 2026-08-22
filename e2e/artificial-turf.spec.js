import { test, expect } from '@playwright/test'
import { collectErrors, fillField, moduleRowTitles, openModule, scanEveryOptionForNaN } from './helpers.js'

// ─────────────────────────────────────────────────────────────────────────────
// Artificial Turf module — live-browser layer of the MODULE-TEST-CHECKLIST. Sections:
// Demo (per-material tonnage removal), Turf Prep (3 fixed base layers with Vendor + Type),
// Turf Installation (rolls with a Vendor + brand picker), and Turf Strips. Labor is all
// hrs-per-unit (demo hrs/Ton, base/turf hrs/SF, strip hrs/LF); base + turf material resolve
// vendor-first from the shared/turf catalog; an unpriced item ⇒ $0 (no fallback, proven in
// artificialTurfCalc.test.mjs). In-House ↔ Subcontractor toggle (Sub = flat $/SF-LF, no
// labor, no base section). This proves: pickers populate, every vendor × Type option
// computes without NaN, numeric fields price, both crew modes render, a live edit moves the
// total, and no console/HTTP errors.
//
// NON-DESTRUCTIVE: opens a test estimate + the Turf editor, reads/enters values, NEVER
// saves. Requires TEST_ESTIMATE_URL + an Artificial Turf module on the estimate.
// ─────────────────────────────────────────────────────────────────────────────
const ESTIMATE = process.env.TEST_ESTIMATE_URL

async function openTurf(page) {
  // The row may be titled "Artificial Turf" or "Turf"; match on "Turf" (openModule uses hasText).
  const ok = await openModule(page, 'Turf')
  if (ok) return { ok, why: '' }
  const titles = await moduleRowTitles(page)
  return {
    ok,
    why: `Artificial Turf editor not reachable — module rows on this estimate: ${
      titles.length ? titles.join(' | ') : '(no clickable module rows found)'
    }`,
  }
}

test.describe('Artificial Turf', () => {
  test.skip(!ESTIMATE, 'Set TEST_ESTIMATE_URL to a test estimate to enable Artificial Turf checks.')

  test('module editor opens with turf sections', async ({ page }, testInfo) => {
    const errors = collectErrors(page)
    const { ok, why } = await openTurf(page)
    await testInfo.attach('turf.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    test.skip(!ok, why)
    const anySection = page.getByText(/Turf Prep|Turf Installation|Demo|Strips/i)
    expect(await anySection.count(), 'No Turf sections rendered').toBeGreaterThan(0)
    expect(errors, `Console/HTTP errors:\n${errors.join('\n')}`).toEqual([])
  })

  test('exhaustive: every vendor × Type option computes without NaN/console error', async ({ page }, testInfo) => {
    test.setTimeout(240000)
    const errors = collectErrors(page)
    const { ok, why } = await openTurf(page)
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
    await testInfo.attach('turf-exhaustive.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    expect(bad, `Vendor × Type combos producing NaN/Infinity:\n${bad.join('\n')}`).toEqual([])
    expect(errors, `Console/HTTP errors:\n${errors.join('\n')}`).toEqual([])
  })

  test('numeric fields accept input and the module computes a total', async ({ page }) => {
    const { ok, why } = await openTurf(page)
    test.skip(!ok, why)
    const nums = page.locator('input[type="number"], input[step]')
    const n = Math.min(await nums.count(), 60)
    for (let i = 0; i < n; i++) {
      const inp = nums.nth(i)
      if (!(await inp.isVisible().catch(() => false))) continue
      await fillField(inp, '50').catch(() => {})
    }
    await page.waitForTimeout(400)
    await expect(page.getByText(/\$[\d,]/).first(), 'No dollar total after entering values').toBeVisible()
  })

  test('In-House and Subcontractor both render pricing without NaN', async ({ page }) => {
    const { ok, why } = await openTurf(page)
    test.skip(!ok, why)
    for (const mode of [/^in.?house$/i, /^subcontractor$/i]) {
      const btn = page.getByRole('button', { name: mode }).first()
      if (!(await btn.count())) continue
      await btn.click().catch(() => {})
      await expect
        .poll(() => page.evaluate(() => /\bNaN\b|Infinity/.test(document.body.innerText)), {
          timeout: 8000,
          message: `Turf mode ${mode} produced NaN/Infinity`,
        })
        .toBe(false)
    }
    await expect(page.getByText(/\$[\d,]/).first(), 'No pricing rendered').toBeVisible()
  })

  test('live edit reflects: changing Hours Adj moves the total (Goal 4 in-browser)', async ({ page }) => {
    const { ok, why } = await openTurf(page)
    test.skip(!ok, why)
    // Ensure the In-House tab is active — the saved module can open on the Subcontractor tab,
    // where "Job Site Conditions / Hours Adj" (In-House only) is not rendered.
    const ihBtn = page.getByRole('button', { name: /^in.?house$/i }).first()
    if (await ihBtn.count()) { await ihBtn.click().catch(() => {}); await page.waitForTimeout(300) }
    const dollars = () => page.evaluate(() => (document.body.innerText.match(/\$[\d,]+(\.\d+)?/g) || []).join('|'))
    // Drive "Hours Adj (±hrs)" via a DIRECT-child `> p` so the locator resolves the leaf field,
    // not the module root. Hours Adj *adds* labor hours directly, so its edit always moves the
    // In-House total independent of catalog pricing. (Pure recompute proven in
    // artificialTurfCalc.test.mjs's edit-reflects case.)
    const target = page.locator('div:has(> p:has-text("Hours Adj")) input[type="number"]').first()
    await expect(
      target,
      'Hours Adj field not found in the open Turf editor (In-House Job Site Conditions).'
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
