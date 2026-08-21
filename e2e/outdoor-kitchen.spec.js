import { test, expect } from '@playwright/test'
import { collectErrors, openModule, scanEveryOptionForNaN } from './helpers.js'

// ─────────────────────────────────────────────────────────────────────────────
// Outdoor Kitchen module — live-browser layer of the MODULE-TEST-CHECKLIST.
// Single BBQ layout (structure / counters / appliances / wall finishes / gas)
// with In-House and Sub tabs. Wall finishes now source from the SHARED Finishes
// records (material + labor), same as Fire Pit / Walls / Columns. Proves the
// wired editor: pickers populate, every vendor × item option computes without
// NaN, finishes resolve (no unpriced), the Sub tab prices, and a live edit moves
// the total.
//
// NON-DESTRUCTIVE: opens a test estimate + the Outdoor Kitchen editor,
// reads/enters values, NEVER saves. Requires TEST_ESTIMATE_URL.
// ─────────────────────────────────────────────────────────────────────────────
const ESTIMATE = process.env.TEST_ESTIMATE_URL
const UNPRICED = /labor rate needed|price me|unpriced|missing price|needs? a price|set (a |the )?price/i
const FINISH = /stucco|ledgerstone|stacked stone|\btile\b|flagstone|real stone/i

test.describe('Outdoor Kitchen', () => {
  test.skip(!ESTIMATE, 'Set TEST_ESTIMATE_URL to a test estimate to enable Outdoor Kitchen checks.')

  test('module editor opens with the Wall Finishes section', async ({ page }, testInfo) => {
    const errors = collectErrors(page)
    const ok = await openModule(page, 'Outdoor Kitchen')
    await testInfo.attach('outdoor-kitchen.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    expect(ok, 'Could not open the Outdoor Kitchen module editor — check the add/edit flow.').toBeTruthy()
    await expect(page.getByText(/^\s*Wall Finishes\s*$/i).first(), 'Wall Finishes section missing').toBeVisible()
    expect(errors, `Console/HTTP errors:\n${errors.join('\n')}`).toEqual([])
  })

  test('every Type dropdown is populated (no empty picker)', async ({ page }) => {
    const ok = await openModule(page, 'Outdoor Kitchen')
    test.skip(!ok, 'Outdoor Kitchen editor not reachable on this estimate.')
    const selects = page.locator('select')
    const n = await selects.count()
    expect(n, 'No <select> pickers found in Outdoor Kitchen editor').toBeGreaterThan(0)
    for (let i = 0; i < n; i++) {
      const opts = await selects.nth(i).locator('option').count()
      expect(opts, `Select #${i} is empty (only a placeholder / no options)`).toBeGreaterThan(1)
    }
  })

  test('shared wall finish resolves without an unpriced banner', async ({ page }, testInfo) => {
    const ok = await openModule(page, 'Outdoor Kitchen')
    test.skip(!ok, 'Outdoor Kitchen editor not reachable on this estimate.')
    const all = page.locator('select')
    const nAll = await all.count()
    let wf = null
    let idx = -1
    for (let i = 0; i < nAll; i++) {
      const o = await all.nth(i).locator('option').allTextContents()
      const fi = o.findIndex(x => FINISH.test(x))
      if (fi >= 0) { wf = all.nth(i); idx = fi; break }
    }
    expect(wf, 'No finish option found — shared Finishes not loading in Outdoor Kitchen?').not.toBeNull()
    await wf.selectOption({ index: idx })
    // Enter SF in that finish row so it prices.
    const row = wf.locator('xpath=ancestor::tr[1]')
    const sf = row.locator('input').first()
    await sf.click().catch(() => {})
    await sf.fill('50').catch(() => {})
    await page.waitForTimeout(500)
    await testInfo.attach('ok-finish.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    expect(await page.getByText(UNPRICED).count(), 'Shared finish shows an unpriced/labor-needed banner').toBe(0)
  })

  test('exhaustive: every vendor × item option, both tabs, computes without NaN/console error', async ({ page }, testInfo) => {
    test.setTimeout(300000)
    const errors = collectErrors(page)
    const ok = await openModule(page, 'Outdoor Kitchen')
    test.skip(!ok, 'Outdoor Kitchen editor not reachable on this estimate.')
    const bad = []
    for (const tab of ['In House', 'In-House', 'Subcontractor', 'Sub']) {
      const btn = page.getByRole('button', { name: new RegExp(`^\\s*${tab}\\s*$`, 'i') }).first()
      if (!(await btn.count())) continue
      await btn.click().catch(() => {})
      await page.waitForTimeout(250)
      for (const h of await scanEveryOptionForNaN(page)) bad.push(`[${tab}] ${h}`)
    }
    if (!bad.length) for (const h of await scanEveryOptionForNaN(page)) bad.push(h) // fallback: single view
    await testInfo.attach('ok-exhaustive.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    expect(bad, `Vendor × item combos producing NaN/Infinity:\n${bad.join('\n')}`).toEqual([])
    expect(errors, `Console/HTTP errors:\n${errors.join('\n')}`).toEqual([])
  })

  test('exhaustive: numeric fields accept input and the module computes a total', async ({ page }) => {
    const ok = await openModule(page, 'Outdoor Kitchen')
    test.skip(!ok, 'Outdoor Kitchen editor not reachable on this estimate.')
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
    const ok = await openModule(page, 'Outdoor Kitchen')
    test.skip(!ok, 'Outdoor Kitchen editor not reachable on this estimate.')
    const subTab = page.getByRole('button', { name: /^subcontractor$/i }).first()
    if (!(await subTab.count())) return
    await subTab.click().catch(() => {})
    await page.waitForTimeout(300)
    await expect(page.getByText(/\$[\d,]/).first(), 'Sub tab shows no pricing').toBeVisible()
    expect(await page.getByText(UNPRICED).count(), 'Unpriced prompt on Sub tab').toBe(0)
  })

  test('live edit reflects: changing a field moves the total (Goal 4 in-browser)', async ({ page }) => {
    const ok = await openModule(page, 'Outdoor Kitchen')
    test.skip(!ok, 'Outdoor Kitchen editor not reachable on this estimate.')
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
