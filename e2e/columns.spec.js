import { test, expect } from '@playwright/test'
import { collectErrors, openModule, scanEveryOptionForNaN } from './helpers.js'

// ─────────────────────────────────────────────────────────────────────────────
// Columns module — live-browser layer of the MODULE-TEST-CHECKLIST (Goal 4 +
// exhaustive UI). Four frozen structure-type tabs (CMU / Poured in Place /
// Modular / Brick), per-tab Installation + Finishes (now shown on ALL tabs, and
// sourced from the SHARED Finishes records — material + labor). This proves the
// wired editor: pickers populate, every vendor × item option on every tab
// computes without NaN, the Sub tab prices, finishes resolve (no unpriced), and a
// live edit moves the total.
//
// NON-DESTRUCTIVE: opens a test estimate + the Columns editor, reads/enters
// values, NEVER saves. Requires TEST_ESTIMATE_URL.
// ─────────────────────────────────────────────────────────────────────────────
const ESTIMATE = process.env.TEST_ESTIMATE_URL
const UNPRICED = /labor rate needed|price me|unpriced|missing price|needs? a price|set (a |the )?price/i
const COL_TYPES = ['CMU', 'Poured in Place', 'Modular', 'Brick']
const FINISH = /stucco|ledgerstone|stacked stone|\btile\b|flagstone|real stone/i

// Columns' pickers (block vendors, finishes) are fed by an async catalog fetch that
// resolves AFTER the editor mounts — openModule returns as soon as the static "View
// Rates" button paints, well before the fetch lands. Scanning a vendor dropdown in
// that window sees only the static "Standard" option (a false "Standard-only" fail),
// even though the shared Wall Block products (Angelus, etc.) are about to load. Wait
// for the network to settle before asserting on picker contents. Same fix as openOk.
async function openColumns(page) {
  const ok = await openModule(page, 'Columns')
  if (ok) {
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(1000)
  }
  return ok
}

test.describe('Columns', () => {
  test.skip(!ESTIMATE, 'Set TEST_ESTIMATE_URL to a test estimate to enable Columns checks.')

  test('module editor opens with the column-type tabs', async ({ page }, testInfo) => {
    const errors = collectErrors(page)
    const ok = await openModule(page, 'Columns')
    await testInfo.attach('columns.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    expect(ok, 'Could not open the Columns module editor — check the add/edit flow.').toBeTruthy()
    const anyTab = page.getByRole('button', { name: new RegExp(COL_TYPES.join('|'), 'i') })
    expect(await anyTab.count(), 'No column-type tabs (CMU/PIP/Modular/Brick)').toBeGreaterThan(0)
    expect(errors, `Console/HTTP errors:\n${errors.join('\n')}`).toEqual([])
  })

  // (No generic "every dropdown populated" test: vendor pickers can legitimately be
  //  Standard-only, and per-row type pickers start on a "Select…" placeholder. The
  //  real empty-picker coverage is the finish-on-CMU-tab test + the vendor × item
  //  matrix below, which exercise the pickers that actually carry options.)

  test('finishes are available on the CMU tab (not PIP-only) and resolve without unpriced', async ({ page }, testInfo) => {
    const ok = await openColumns(page)
    test.skip(!ok, 'Columns editor not reachable on this estimate.')
    // Ensure we are on the CMU tab, then a finish TYPE option must be selectable.
    const cmu = page.getByRole('button', { name: /^\s*CMU\s*$/i }).first()
    if (await cmu.count()) {
      await cmu.click().catch(() => {})
      await page.waitForTimeout(250)
    }
    const all = page.locator('select')
    const nAll = await all.count()
    let wf = null
    let idx = -1
    for (let i = 0; i < nAll; i++) {
      const o = await all.nth(i).locator('option').allTextContents()
      const fi = o.findIndex(x => FINISH.test(x))
      if (fi >= 0) { wf = all.nth(i); idx = fi; break }
    }
    expect(wf, 'No finish option on the CMU tab — Finishes should show on ALL column tabs now').not.toBeNull()
    await wf.selectOption({ index: idx })
    await page.waitForTimeout(400)
    await testInfo.attach('columns-cmu-finish.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    expect(await page.getByText(UNPRICED).count(), 'Shared finish shows an unpriced/labor-needed banner').toBe(0)
  })

  test('CMU block vendor dropdown lists shared Wall Block vendors (not Standard-only)', async ({ page }, testInfo) => {
    const ok = await openColumns(page)
    test.skip(!ok, 'Columns editor not reachable on this estimate.')
    const cmu = page.getByRole('button', { name: /^\s*CMU\s*$/i }).first()
    if (await cmu.count()) {
      await cmu.click().catch(() => {})
      await page.waitForTimeout(250)
    }
    // The block row's vendor picker reads the SHARED 'Wall Block' sub-category, so it
    // must offer real block vendors (e.g. Angelus) — it regressed to Standard-only when
    // the list was scoped to the Columns category instead of the Wall Block sub-category.
    // Because those options arrive via an async catalog fetch, POLL until some vendor
    // dropdown gains a real vendor beyond Standard (rather than scanning once and racing
    // the fetch). The finish vendor picker can legitimately stay Standard-only, so we
    // only require that AT LEAST ONE CMU-tab vendor dropdown carries a vendor.
    const scanVendorPickers = () =>
      page.evaluate(() =>
        Array.from(document.querySelectorAll('select'))
          .map(s => Array.from(s.options).map(o => (o.textContent || '').trim()))
          .filter(opts => opts.some(t => /^\s*standard\s*$/i.test(t)))
      )
    await expect
      .poll(async () => (await scanVendorPickers()).some(opts => opts.length > 1), {
        timeout: 12000,
        message: 'No CMU-tab vendor dropdown offers a vendor beyond Standard — shared Wall Block vendors (Angelus) not surfacing.',
      })
      .toBe(true)
    await testInfo.attach('columns-cmu-vendors.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
  })

  test('exhaustive: every vendor × item option, on every tab, computes without NaN/console error', async ({ page }, testInfo) => {
    test.setTimeout(300000)
    const errors = collectErrors(page)
    const ok = await openModule(page, 'Columns')
    test.skip(!ok, 'Columns editor not reachable on this estimate.')
    const bad = []
    for (const t of COL_TYPES) {
      const tab = page.getByRole('button', { name: new RegExp(`^\\s*${t}\\s*$`, 'i') }).first()
      if (!(await tab.count())) continue
      await tab.click().catch(() => {})
      await page.waitForTimeout(250)
      for (const h of await scanEveryOptionForNaN(page)) bad.push(`[${t}] ${h}`)
    }
    await testInfo.attach('columns-exhaustive.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    expect(bad, `Vendor × item combos producing NaN/Infinity:\n${bad.join('\n')}`).toEqual([])
    expect(errors, `Console/HTTP errors:\n${errors.join('\n')}`).toEqual([])
  })

  test('exhaustive: every column-type tab computes without NaN', async ({ page }) => {
    const ok = await openModule(page, 'Columns')
    test.skip(!ok, 'Columns editor not reachable on this estimate.')
    for (const t of COL_TYPES) {
      const tab = page.getByRole('button', { name: new RegExp(`^\\s*${t}\\s*$`, 'i') }).first()
      if (!(await tab.count())) continue
      await tab.click().catch(() => {})
      await expect
        .poll(() => page.evaluate(() => /\bNaN\b|Infinity/.test(document.body.innerText)), {
          timeout: 8000,
          message: `Column type ${t} produced NaN/Infinity`,
        })
        .toBe(false)
    }
  })

  test('exhaustive: numeric fields accept input and the module computes a total', async ({ page }) => {
    const ok = await openModule(page, 'Columns')
    test.skip(!ok, 'Columns editor not reachable on this estimate.')
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
    const ok = await openModule(page, 'Columns')
    test.skip(!ok, 'Columns editor not reachable on this estimate.')
    const subTab = page.getByRole('button', { name: /^subcontractor$/i }).first()
    if (!(await subTab.count())) return
    await subTab.click().catch(() => {})
    await page.waitForTimeout(300)
    await expect(page.getByText(/\$[\d,]/).first(), 'Sub tab shows no pricing').toBeVisible()
    expect(await page.getByText(UNPRICED).count(), 'Unpriced prompt on Sub tab').toBe(0)
  })

  test('live edit reflects: changing a field moves the total (Goal 4 in-browser)', async ({ page }) => {
    const ok = await openModule(page, 'Columns')
    test.skip(!ok, 'Columns editor not reachable on this estimate.')
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
    await expect
      .poll(dollars, { timeout: 8000, message: 'Total did not change after editing a field' })
      .not.toBe(before)
  })
})
