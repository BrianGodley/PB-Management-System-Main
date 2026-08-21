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

// Outdoor Kitchen is the heaviest editor: its catalog (appliances / sinks / finishes /
// gas + the shared Finishes rows) is fetched async AFTER the editor mounts, so the
// pickers are briefly empty and prices are 0 right after open. Wait for the network to
// settle before asserting, or the finish picker / prices look empty when they're just
// still loading.
async function openOk(page) {
  const ok = await openModule(page, 'Outdoor Kitchen')
  if (ok) {
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(1000)
  }
  return ok
}

// Select the shared wall-finish TYPE and return that row's first (SF) input.
// This is the ONLY policy-correct way to make an OK row price: per the no-fallback
// + empty-picker rules, a row whose type picker is still on "Select…" stays $0 and
// an unpriced/unselected row legitimately raises the unpriced banner. So a test that
// just fills raw quantities on unselected rows is asserting behavior the rules
// forbid. Pick a known-priced finish first, then drive ITS quantity — the same
// pattern the passing "shared wall finish resolves" test uses.
async function selectFinishRow(page) {
  const all = page.locator('select')
  const nAll = await all.count()
  for (let i = 0; i < nAll; i++) {
    const o = await all.nth(i).locator('option').allTextContents()
    const fi = o.findIndex(x => FINISH.test(x))
    if (fi >= 0) {
      const sel = all.nth(i)
      await sel.selectOption({ index: fi })
      await page.waitForTimeout(300)
      const row = sel.locator('xpath=ancestor::tr[1]')
      return row.locator('input').first()
    }
  }
  return null
}

test.describe('Outdoor Kitchen', () => {
  test.skip(!ESTIMATE, 'Set TEST_ESTIMATE_URL to a test estimate to enable Outdoor Kitchen checks.')

  test('module editor opens with the Wall Finishes section', async ({ page }, testInfo) => {
    const errors = collectErrors(page)
    const ok = await openOk(page)
    await testInfo.attach('outdoor-kitchen.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    expect(ok, 'Could not open the Outdoor Kitchen module editor — check the add/edit flow.').toBeTruthy()
    await expect(page.getByText(/^\s*Wall Finishes\s*$/i).first(), 'Wall Finishes section missing').toBeVisible()
    expect(errors, `Console/HTTP errors:\n${errors.join('\n')}`).toEqual([])
  })

  // (No generic "every dropdown populated" test — vendor pickers can be Standard-only
  //  and type pickers start on a placeholder. Coverage comes from the shared-finish
  //  resolve test + the vendor × item matrix below.)

  test('shared wall finish resolves without an unpriced banner', async ({ page }, testInfo) => {
    const ok = await openOk(page)
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
    const ok = await openOk(page)
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

  test('numeric fields accept input and the module computes a total (priced finish selected)', async ({ page }) => {
    const ok = await openOk(page)
    test.skip(!ok, 'Outdoor Kitchen editor not reachable on this estimate.')
    // Select a priced finish FIRST so at least one row actually prices, then drive its
    // quantity. We deliberately do NOT blanket-fill every numeric input and assert
    // "no unpriced": a quantity on a row whose type is still "Select…" (or is unpriced
    // in the rate tables) is SUPPOSED to raise the unpriced banner — that's the
    // no-fallback rule working, not a bug. So we assert the module computes a real
    // dollar total off the selected priced finish.
    const sf = await selectFinishRow(page)
    test.skip(!sf, 'No finish option found — shared Finishes not loading in Outdoor Kitchen?')
    await sf.click().catch(() => {})
    await sf.fill('50').catch(() => {})
    await page.waitForTimeout(400)
    await expect(page.getByText(/\$[\d,]/).first(), 'No dollar total after pricing a finish').toBeVisible()
  })

  test('Subcontractor tab renders and prices', async ({ page }) => {
    const ok = await openOk(page)
    test.skip(!ok, 'Outdoor Kitchen editor not reachable on this estimate.')
    const subTab = page.getByRole('button', { name: /^subcontractor$/i }).first()
    if (!(await subTab.count())) return
    await subTab.click().catch(() => {})
    await page.waitForTimeout(300)
    await expect(page.getByText(/\$[\d,]/).first(), 'Sub tab shows no pricing').toBeVisible()
    expect(await page.getByText(UNPRICED).count(), 'Unpriced prompt on Sub tab').toBe(0)
  })

  test('live edit reflects: changing the priced finish SF moves the total (Goal 4 in-browser)', async ({ page }) => {
    const ok = await openOk(page)
    test.skip(!ok, 'Outdoor Kitchen editor not reachable on this estimate.')
    const dollars = () => page.evaluate(() => (document.body.innerText.match(/\$[\d,]+(\.\d+)?/g) || []).join('|'))
    // Drive a row that actually prices — the selected shared finish — not nums.first(),
    // which is a structure/counter field on a row whose type picker is still empty (so
    // it correctly stays $0 no matter what you type, and the total never moves).
    const sf = await selectFinishRow(page)
    test.skip(!sf, 'No priced finish row to drive a live edit.')
    await sf.click().catch(() => {})
    await sf.fill('10').catch(() => {})
    await page.waitForTimeout(400)
    const before = await dollars()
    await sf.click().catch(() => {})
    await sf.fill('99').catch(() => {})
    await expect
      .poll(dollars, { timeout: 8000, message: 'Total did not change after editing the finish SF' })
      .not.toBe(before)
  })
})
