import { test, expect } from '@playwright/test'
import { collectErrors } from './helpers.js'

// ─────────────────────────────────────────────────────────────────────────────
// Fire Pit module — reproduces the bugs manual testing caught that unit tests
// (which inject values) structurally cannot: an empty Gas Line picker from a
// subcategory mismatch, a missing Trenching section, and wall finishes that
// resolve null/unpriced even though a price is live in View Rates.
//
// NON-DESTRUCTIVE: opens a test estimate, opens the Fire Pit module editor, reads
// + enters values, and NEVER saves. Requires TEST_ESTIMATE_URL.
//
// Round-1 selectors are text/section based; the attached screenshots let us
// harden them after the first run (same approach as estimator.spec.js).
// ─────────────────────────────────────────────────────────────────────────────
const ESTIMATE = process.env.TEST_ESTIMATE_URL

// Open the estimate and enter the Fire Pit module editor. Returns true if the
// editor opened (section headers visible), false if Fire Pit isn't reachable.
async function openFirePit(page) {
  await page.goto(ESTIMATE, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle')
  // Enter the Fire Pit module: click an existing Fire Pit module row/tile, or the
  // "Fire Pit" type in the add-module chooser. Try the most specific first.
  const candidates = [
    page.getByRole('button', { name: /fire pit/i }),
    page.getByText(/^fire pit$/i),
    page.getByText(/fire pit/i),
  ]
  for (const c of candidates) {
    if (await c.count()) {
      await c.first().click().catch(() => {})
      // The editor is open once a Fire Pit section header renders.
      if (await page.getByText(/gas line|structure|wall finishes/i).first().count()) return true
    }
  }
  return (await page.getByText(/gas line|wall finishes/i).first().count()) > 0
}

// Find the <select> elements inside the section whose header text matches `title`.
function sectionSelects(page, title) {
  // The section is a <div> containing a SectionHeader (title text) then a table.
  return page
    .locator('div', { has: page.getByText(new RegExp(`^\\s*${title}\\s*$`, 'i')) })
    .last()
    .locator('select')
}

test.describe('Fire Pit', () => {
  test.skip(!ESTIMATE, 'Set TEST_ESTIMATE_URL to a test estimate to enable Fire Pit checks.')

  test('module editor opens with Gas Line + Trenching + Gas Fixtures sections', async ({ page }, testInfo) => {
    const errors = collectErrors(page)
    const ok = await openFirePit(page)
    await testInfo.attach('fire-pit.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    expect(ok, 'Could not open the Fire Pit module editor — check the add/edit flow selector.').toBeTruthy()

    await expect(page.getByText(/^\s*Trenching\s*$/i).first(), 'Trenching section missing').toBeVisible()
    await expect(page.getByText(/^\s*Gas Line\s*$/i).first(), 'Gas Line section missing').toBeVisible()
    await expect(page.getByText(/^\s*Gas Fixtures\s*$/i).first(), 'Gas Fixtures section missing').toBeVisible()
    expect(errors, `Console/HTTP errors:\n${errors.join('\n')}`).toEqual([])
  })

  test('Gas Line Type dropdown is populated (bug: was empty from wrong subcategory)', async ({ page }) => {
    const ok = await openFirePit(page)
    test.skip(!ok, 'Fire Pit editor not reachable on this estimate.')
    const selects = sectionSelects(page, 'Gas Line')
    await expect(selects.first(), 'No Type dropdown in Gas Line').toBeVisible()
    // A working picker has the placeholder plus at least one real gas-pipe option.
    const optionCount = await selects.first().locator('option').count()
    expect(optionCount, 'Gas Line Type dropdown is empty — subcategory mismatch').toBeGreaterThan(1)
  })

  test('Trenching row with dimensions computes non-zero hours', async ({ page }) => {
    const ok = await openFirePit(page)
    test.skip(!ok, 'Fire Pit editor not reachable on this estimate.')
    // Locate the Trenching section's numeric inputs (LF, Width, Depth) and fill them.
    const trench = page
      .locator('div', { has: page.getByText(/^\s*Trenching\s*$/i) })
      .last()
    const nums = trench.locator('input')
    await expect(nums.first(), 'No Trenching inputs').toBeVisible()
    // First row inputs are LF, Width, Depth (Method is a <select>).
    await nums.nth(0).fill('20')
    await nums.nth(1).fill('6')
    await nums.nth(2).fill('24')
    // Est. Hrs cell should now show a non-"—" value.
    await expect(trench.getByText(/\d+\.\d{2}/).first(), 'Trench hours did not compute').toBeVisible()
  })

  test('wall finishes resolve a price (no unpriced/labor-needed banner) for standard types', async ({ page }, testInfo) => {
    const ok = await openFirePit(page)
    test.skip(!ok, 'Fire Pit editor not reachable on this estimate.')
    // Pick the first real option in each Wall Finish Type dropdown; a shared finish
    // that's live in View Rates must NOT trigger the unpriced / "labor rate needed"
    // fix-it banner. (This is expected to reveal the per-module duplicate-finish bug
    // until the shared-finishes consolidation lands.)
    const wf = sectionSelects(page, 'Wall Finishes')
    if (await wf.count()) {
      const opts = wf.first().locator('option')
      if ((await opts.count()) > 1) {
        await wf.first().selectOption({ index: 1 }).catch(() => {})
      }
    }
    await testInfo.attach('fire-pit-finish.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    await expect(
      page.getByText(/labor rate needed|price me|unpriced/i),
      'A live-in-View-Rates finish still shows an unpriced/labor-needed banner'
    ).toHaveCount(0)
  })
})
