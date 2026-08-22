import { test, expect } from '@playwright/test'
import { collectErrors, fillField, openModule, scanEveryOptionForNaN } from './helpers.js'

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

// Return the FIRST row of the Wall Finishes table (type <select> + SF <input>).
// Anchoring on the "Wall Finishes" section header is important: an earlier
// appliance/sink dropdown elsewhere on the page can contain a finish-like token
// (e.g. "Tile", "Real Stone"), so a naive "first select whose option matches the
// finish regex" grabs the WRONG row and drives a field that needn't move the total.
// The finish row's own math (sf × unit) is what we want to exercise.
function finishRow(page) {
  // The <tr> that contains an SF number input inside the Wall Finishes table. The
  // section header is followed by a table whose body rows each carry the type
  // <select> + the SF NumInput. Take the first such row after the header.
  return page
    .locator('table', { has: page.locator('select') })
    .filter({ has: page.getByRole('option', { name: FINISH }) })
    .last()
    .locator('tbody tr')
    .first()
}

async function selectFinishRow(page) {
  const row = finishRow(page)
  if (!(await row.count())) return null
  const typeSel = row.locator('select').last() // vendor select is first, type select second
  const opts = await typeSel.locator('option').allTextContents()
  const fi = opts.findIndex(x => FINISH.test(x))
  if (fi < 0) return null
  await typeSel.selectOption({ index: fi })
  await page.waitForTimeout(300)
  return row.locator('input[type="number"], input').first()
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

  test('live edit reflects: changing a frozen-priced field moves the total (Goal 4 in-browser)', async ({ page }) => {
    const ok = await openOk(page)
    test.skip(!ok, 'Outdoor Kitchen editor not reachable on this estimate.')
    // Drive BBQ Wall Length — a STRUCTURE field priced off the BBQ block rate, which
    // predates the finishes consolidation and is present in a saved estimate's FROZEN
    // rate snapshot. We deliberately do NOT drive a finish here: the CI estimate is a
    // SAVED estimate, and per the repo rule saved estimates carry a frozen snapshot, so
    // the newer shared-finish prices legitimately read $0 on them (fresh-estimate
    // correctness is what matters, and the finish value math is covered deterministically
    // in okCalc.test.mjs). This proves the in-browser recompute path with a field that
    // reliably prices on any estimate.
    const dollars = () => page.evaluate(() => (document.body.innerText.match(/\$[\d,]+(\.\d+)?/g) || []).join('|'))
    // The BBQ Structure labels are plain <label> elements with no htmlFor and the
    // input is a SIBLING, not a child — so getByLabel() matches nothing and the old
    // "first numeric input on the page" fallback silently drove an unrelated field.
    // Anchor on the VISIBLE label element and take the very next input in document
    // order. Every step below fails loudly: the previous version wrapped click/fill
    // in .catch(() => {}), so a fill that never landed looked exactly like a total
    // that refused to move. The toHaveValue assertions separate the two cases —
    // if the value sticks but the total does not move, that is a product bug.
    const fieldAfterLabel = text =>
      page
        .locator('label')
        .filter({ hasText: text })
        .filter({ visible: true })
        .first()
        .locator('xpath=following::input[1]')
    const label = page
      .locator('label')
      .filter({ hasText: /BBQ Wall Length/i })
      .filter({ visible: true })
      .first()
    await expect(
      label,
      'BBQ Wall Length label not found — the BBQ Structure section did not render.'
    ).toHaveCount(1)
    const target = label.locator('xpath=following::input[1]')
    await expect(
      target,
      'No input follows the BBQ Wall Length label — the field markup changed.'
    ).toHaveCount(1)
    // BBQ wall area = (height ÷ 12) × length, so with the height field left BLANK the
    // wall SF stays 0 no matter what length we type and the total legitimately never
    // moves — a harness gap, not a recompute bug. "48" in the height box is only a
    // placeholder, never a value. Set the height explicitly first so the field we are
    // driving actually has a quantity to multiply. (No dollar value is being set here —
    // this is a dimension the user types, not a rate.)
    const heightIn = fieldAfterLabel(/BBQ Wall Height/i)
    if (await heightIn.count()) {
      if (!(await heightIn.inputValue())) {
        await fillField(heightIn, '48')
        await expect(heightIn, 'BBQ Wall Height did not accept 48').toHaveValue('48')
        await page.waitForTimeout(300)
      }
    }
    // fillField (not fill): Layout.jsx's autofill guard marks every input
    // readonly until its first focus, and fill()'s editable check runs BEFORE
    // it focuses — so a bare fill() times out on a field the user can type in.
    await fillField(target, '8')
    await expect(target, 'BBQ Wall Length did not accept 8').toHaveValue('8')
    await page.waitForTimeout(600)
    const before = await dollars()
    await fillField(target, '40')
    // Blur so any commit-on-blur handling also fires, then prove the edit landed
    // before blaming the recompute.
    await target.blur().catch(() => {})
    await expect(target, 'BBQ Wall Length did not accept 40').toHaveValue('40')
    const where = await target.evaluate(el => el.outerHTML.slice(0, 200))
    await expect
      .poll(dollars, {
        timeout: 10000,
        message: `Total did not change after editing BBQ Wall Length 8 -> 40 (input accepted the value, so this is a recompute/pricing issue, not a selector one). Input: ${where}`,
      })
      .not.toBe(before)
  })
})
