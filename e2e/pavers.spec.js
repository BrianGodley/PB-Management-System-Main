import { test, expect } from '@playwright/test'
import { collectErrors, fillField, moduleRowTitles, openModule, scanEveryOptionForNaN } from './helpers.js'

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

// A whole-suite skip is a SILENT GAP — a skipped test verified nothing, which reads
// like a pass. When the Pavers editor will not open, name the module rows that ARE on
// the estimate so the next run tells "Pavers is not on this estimate" (fix the estimate
// / TEST_ESTIMATE_URL) apart from "the row is named or marked up differently" (fix the
// selector), instead of skipping anonymously.
async function openPavers(page) {
  const ok = await openModule(page, 'Paver')
  if (ok) return { ok, why: '' }
  const titles = await moduleRowTitles(page)
  return {
    ok,
    why: `Pavers editor not reachable — module rows on this estimate: ${
      titles.length ? titles.join(' | ') : '(no clickable module rows found)'
    }`,
  }
}

test.describe('Pavers', () => {
  test.skip(!ESTIMATE, 'Set TEST_ESTIMATE_URL to a test estimate to enable Pavers checks.')

  test('module editor opens with pavers sections', async ({ page }, testInfo) => {
    const errors = collectErrors(page)
    const { ok, why } = await openPavers(page)
    await testInfo.attach('pavers.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    test.skip(!ok, why)
    const anySection = page.getByText(/Paver|Base|Cut|Restraint|Vertical Soldier|Sealer|Poly Sand/i)
    expect(await anySection.count(), 'No Pavers sections rendered').toBeGreaterThan(0)
    expect(errors, `Console/HTTP errors:\n${errors.join('\n')}`).toEqual([])
  })

  test('exhaustive: every vendor × item option computes without NaN/console error', async ({ page }, testInfo) => {
    test.setTimeout(240000)
    const errors = collectErrors(page)
    const { ok, why } = await openPavers(page)
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
    await testInfo.attach('pavers-exhaustive.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    expect(bad, `Vendor × item combos producing NaN/Infinity:\n${bad.join('\n')}`).toEqual([])
    expect(errors, `Console/HTTP errors:\n${errors.join('\n')}`).toEqual([])
  })

  test('numeric fields accept input and the module computes a total', async ({ page }) => {
    const { ok, why } = await openPavers(page)
    test.skip(!ok, why)
    const nums = page.locator('input[type="number"], input[step]')
    const n = Math.min(await nums.count(), 60)
    for (let i = 0; i < n; i++) {
      const inp = nums.nth(i)
      if (!(await inp.isVisible().catch(() => false))) continue
      // fillField (not fill): Layout.jsx's autofill guard marks every input readonly
      // until its first focus, and fill()'s editable check runs BEFORE it focuses — a
      // bare fill() times out on a field the user can type in, and the old
      // .catch(() => {}) swallowed that so a value that never landed looked like a
      // priced field.
      await fillField(inp, '50').catch(() => {})
    }
    await page.waitForTimeout(400)
    await expect(page.getByText(/\$[\d,]/).first(), 'No dollar total after entering values').toBeVisible()
    // NOTE: we do NOT assert "no unpriced banner" — driving raw SF on rows whose
    // Vendor/Type is unset legitimately surfaces the no-fallback fix-it banner. The
    // unpriced behavior itself is proven deterministically in paversCalc.test.mjs.
  })

  test('In-House and Subcontractor both render pricing without NaN', async ({ page }) => {
    const { ok, why } = await openPavers(page)
    test.skip(!ok, why)
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

  // View Rates COVERAGE — the regression the NaN-scan could NOT catch: PaverModule
  // passed rateScope=[{Basic Labor/Base Prep}] only, which flips buildViewRates into
  // scope-only mode and drops the Paver category (all materials + labor). The module
  // still priced fine (calc reads the rate map directly), so every NaN / total-moves
  // test stayed green while View Rates showed ONLY Base Prep. This asserts the popup
  // actually lists paver MATERIAL + paver LABOR, not just the borrowed base-prep rows.
  test('View Rates lists paver materials AND labor (coverage, not just Base Prep)', async ({ page }, testInfo) => {
    const { ok, why } = await openPavers(page)
    test.skip(!ok, why)
    await page.getByRole('button', { name: /view rates/i }).first().click()
    const heading = page.getByText(/—\s*All Rates/i).first()
    await expect(heading, 'View Rates popup did not open').toBeVisible({ timeout: 10000 })
    // Scope every assertion to the popup so we don't match the module body behind it
    // (which also renders "Install", "Class II Roadbase", etc.).
    const modal = heading.locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]')
    await testInfo.attach('pavers-viewrates.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    // Material coverage — the shared base aggregates Pavers borrow (Standard rows).
    await expect(
      modal.getByText(/Class II Roadbase|Bedding Sand|Base Rock/i).first(),
      'View Rates shows NO paver material rows (scope dropped the material catalog).'
    ).toBeVisible()
    // Labor coverage BEYOND base prep — the paver install/cut/restraint/sealer/soldier
    // labor that lives in the Paver(s) category. If only Base Prep survived, none appear.
    await expect(
      modal.getByText(/Install|Straight Cut|Curved Cut|Restraint|Sealer|Soldier/i).first(),
      'View Rates shows only Base Prep — the Paver labor category is missing.'
    ).toBeVisible()
  })

  test('live edit reflects: changing a field moves the total (Goal 4 in-browser)', async ({ page }) => {
    const { ok, why } = await openPavers(page)
    test.skip(!ok, why)
    const dollars = () => page.evaluate(() => (document.body.innerText.match(/\$[\d,]+(\.\d+)?/g) || []).join('|'))
    const target = page.locator('input[type="number"], input[step]').first()
    // Not a skip: the editor is open by this point, so "no numeric input" means the
    // module rendered nothing drivable — a real failure, not a reason to go quiet.
    await expect(
      target,
      'No numeric input in the open Pavers editor — the module rendered no drivable field.'
    ).toHaveCount(1)
    // Every step fails loudly: fillField + toHaveValue separate "the edit never
    // landed" (selector/readonly problem) from "the edit landed and the total did not
    // move" (a real recompute/pricing bug).
    await fillField(target, '100')
    await expect(target, 'Pavers field did not accept 100').toHaveValue('100')
    await page.waitForTimeout(600)
    const before = await dollars()
    await fillField(target, '900')
    await target.blur().catch(() => {})
    await expect(target, 'Pavers field did not accept 900').toHaveValue('900')
    const where = await target.evaluate(el => el.outerHTML.slice(0, 200))
    await expect
      .poll(dollars, {
        timeout: 10000,
        message: `Total did not change after editing a Pavers field 100 -> 900 (the input accepted the value, so this is a recompute/pricing issue, not a selector one). Input: ${where}`,
      })
      .not.toBe(before)
  })
})
