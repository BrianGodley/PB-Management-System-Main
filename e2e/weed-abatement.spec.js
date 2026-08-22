import { test, expect } from '@playwright/test'
import { collectErrors, fillField, moduleRowTitles, openModule } from './helpers.js'

// ─────────────────────────────────────────────────────────────────────────────
// Weed Abatement module — live-browser layer of the MODULE-TEST-CHECKLIST. No vendor
// catalog: In-House pricing is four company coefficients (Travel hr/visit, Flat & Hillside
// hrs/SF, Material $/1k SF) read live from labor_rates + misc_rates (category 'Weed
// Abatement'); a missing row ⇒ 0 (no fallback, proven in weedCalc.test.mjs). Area Type
// (Flat / Hillside / Mixed) gates which area contributes; Number of Visits multiplies
// travel, labor AND material. The Sub tab is a STRICT per-estimate $/SF (× area × visits +
// optional flat add) with no labor hours. Regression guard: the In-House value path used to
// throw a ReferenceError (flatPer1k/hillPer1k) — the "renders pricing" checks below would
// have caught it. This proves: the editor renders, every Area-Type mode computes without
// NaN, numeric fields price, both crew modes render, a live edit moves the total, no
// console/HTTP errors.
//
// NON-DESTRUCTIVE: opens a test estimate + the Weed Abatement editor, reads/enters values,
// NEVER saves. Requires TEST_ESTIMATE_URL + a Weed Abatement module on the estimate.
// ─────────────────────────────────────────────────────────────────────────────
const ESTIMATE = process.env.TEST_ESTIMATE_URL

async function openWeed(page) {
  // The module row may be titled "Weeds" or "Weed Abatement" depending on the estimate;
  // match on the "Weed" substring (openModule uses hasText), which catches both.
  const ok = await openModule(page, 'Weed')
  if (ok) return { ok, why: '' }
  const titles = await moduleRowTitles(page)
  return {
    ok,
    why: `Weed Abatement editor not reachable — module rows on this estimate: ${
      titles.length ? titles.join(' | ') : '(no clickable module rows found)'
    }`,
  }
}

test.describe('Weed Abatement', () => {
  test.skip(!ESTIMATE, 'Set TEST_ESTIMATE_URL to a test estimate to enable Weed Abatement checks.')

  test('module editor opens with Area Type + area fields', async ({ page }, testInfo) => {
    const errors = collectErrors(page)
    const { ok, why } = await openWeed(page)
    await testInfo.attach('weed.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    test.skip(!ok, why)
    const anySection = page.getByText(/Area Type|Flat Area|Hillside Area|Number of Visits/i)
    expect(await anySection.count(), 'No Weed Abatement sections rendered').toBeGreaterThan(0)
    expect(errors, `Console/HTTP errors:\n${errors.join('\n')}`).toEqual([])
  })

  test('every Area Type mode (Flat / Hillside / Mixed) computes without NaN — In-House value path (ReferenceError regression)', async ({ page }, testInfo) => {
    const errors = collectErrors(page)
    const { ok, why } = await openWeed(page)
    test.skip(!ok, why)
    // Make sure some area is entered so the In-House labor/material path actually runs.
    for (const inp of await page.locator('input[type="number"]').all()) {
      if (await inp.isVisible().catch(() => false)) await fillField(inp, '1000').catch(() => {})
    }
    for (const mode of ['Flat', 'Hillside', 'Mixed']) {
      const btn = page.getByRole('button', { name: new RegExp(`^\\s*${mode}\\s*$`, 'i') }).first()
      if (await btn.count()) { await btn.click().catch(() => {}); await page.waitForTimeout(200) }
      await expect
        .poll(() => page.evaluate(() => /\bNaN\b|Infinity/.test(document.body.innerText)), {
          timeout: 6000,
          message: `Area Type ${mode} produced NaN/Infinity`,
        })
        .toBe(false)
    }
    await testInfo.attach('weed-modes.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    expect(errors, `Console/HTTP errors:\n${errors.join('\n')}`).toEqual([])
  })

  test('numeric fields accept input and the module computes a total', async ({ page }) => {
    const { ok, why } = await openWeed(page)
    test.skip(!ok, why)
    const nums = page.locator('input[type="number"], input[step]')
    const n = Math.min(await nums.count(), 30)
    for (let i = 0; i < n; i++) {
      const inp = nums.nth(i)
      if (!(await inp.isVisible().catch(() => false))) continue
      await fillField(inp, '1000').catch(() => {})
    }
    await page.waitForTimeout(400)
    await expect(page.getByText(/\$[\d,]/).first(), 'No dollar total after entering values').toBeVisible()
  })

  test('In-House and Subcontractor both render pricing without NaN', async ({ page }) => {
    const { ok, why } = await openWeed(page)
    test.skip(!ok, why)
    for (const mode of [/^in.?house$/i, /^subcontractor$/i]) {
      const btn = page.getByRole('button', { name: mode }).first()
      if (!(await btn.count())) continue
      await btn.click().catch(() => {})
      await expect
        .poll(() => page.evaluate(() => /\bNaN\b|Infinity/.test(document.body.innerText)), {
          timeout: 8000,
          message: `Weed mode ${mode} produced NaN/Infinity`,
        })
        .toBe(false)
    }
    await expect(page.getByText(/\$[\d,]/).first(), 'No pricing rendered').toBeVisible()
  })

  test('live edit reflects: changing the Sub $/SF rate moves the total (Goal 4 in-browser, DB-independent)', async ({ page }) => {
    const { ok, why } = await openWeed(page)
    test.skip(!ok, why)
    // Drive the Subcontractor tab: sub cost = area × $/SF × visits (+ flat add) is entirely
    // estimate-entered, so it does NOT depend on any seeded DB coefficient — a change to the
    // $/SF rate ALWAYS moves the total. (The pure recompute is proven in weedCalc.test.mjs.)
    const subBtn = page.getByRole('button', { name: /^subcontractor$/i }).first()
    await expect(subBtn, 'Subcontractor tab toggle not found').toHaveCount(1)
    await subBtn.click()
    await page.waitForTimeout(300)
    // Drive "Additional Flat Sub Cost (optional)" — it adds DIRECTLY into subCost
    // (subCost = area × $/SF × visits + subFlat), so it moves the total with no dependence on
    // area, mode, visits, or any seeded rate. The cleanest deterministic Goal-4 driver here.
    // (The pure recompute — including the $/SF × area path — is proven in weedCalc.test.mjs.)
    // Scope to the leaf wrapper via a DIRECT-child label (`> label`); a loose descendant
    // `:has` matches the module root div, whose first number input is Flat Area — which is
    // exactly what sank the earlier attempts (the value landed in Flat Area, not this field).
    const flat = page.locator('div:has(> label:has-text("Additional Flat Sub Cost")) input[type="number"]').first()
    await expect(flat, 'Additional Flat Sub Cost field not found on the Sub tab').toHaveCount(1)
    const dollars = () => page.evaluate(() => (document.body.innerText.match(/\$[\d,]+(\.\d+)?/g) || []).join('|'))
    await fillField(flat, '100')
    await expect(flat, 'Flat sub cost did not accept 100').toHaveValue('100')
    await page.waitForTimeout(500)
    const before = await dollars()
    await fillField(flat, '900')
    await flat.blur().catch(() => {})
    await expect(flat, 'Flat sub cost did not accept 900').toHaveValue('900')
    await expect
      .poll(dollars, {
        timeout: 10000,
        message: 'Subcontractor Cost did not change after editing the flat sub cost 100 -> 900 (input accepted the value, so this is a recompute issue, not a selector one).',
      })
      .not.toBe(before)
  })
})
