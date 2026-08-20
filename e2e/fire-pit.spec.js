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

// Open the estimate and enter the Fire Pit module EDITOR. The flow is three steps:
// select the Fire Pit PROJECT (left list) → select the Fire Pit MODULE row (both
// render an exact-text "Fire Pit" <p>) → click "✎ Edit Module" (COEstimatePanel
// line ~1170) which renders the FirePitModule editor. Returns true once an editor
// section (Gas Line / Trenching) is visible.
async function openFirePit(page) {
  await page.goto(ESTIMATE, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle')
  // 0) The estimate opens VIEW-ONLY ("👁 View Module" / "Viewing only…"). Click the
  //    estimate's top-level "✏️ Edit" (not the per-module button) to enter edit mode.
  const estEdit = page
    .getByRole('button', { name: /edit/i })
    .filter({ hasNotText: /module/i })
    .first()
  if (await estEdit.count()) {
    await estEdit.click().catch(() => {})
    await page.waitForLoadState('networkidle').catch(() => {})
  }
  // The project name paragraph is "⠿Fire Pit" (drag handle + name), so exact-text
  // matching fails; click the actual clickable ROW divs instead. Project rows and
  // module rows are both `div.cursor-pointer` containing "Fire Pit". Clicking the
  // project row reveals its module row (Panel 2); clicking the module row surfaces
  // "✎ Edit Module" (Panel 3). Loop passes until that button appears.
  const editBtn = page.getByRole('button', { name: /edit module/i })
  const rows = page.locator('div.cursor-pointer').filter({ hasText: 'Fire Pit' })
  if (!(await rows.count())) return false
  for (let pass = 0; pass < 3 && !(await editBtn.count()); pass++) {
    const n = await rows.count()
    for (let i = 0; i < n && !(await editBtn.count()); i++) {
      await rows.nth(i).click({ force: true }).catch(() => {})
      await page.waitForTimeout(300)
    }
  }
  if (await editBtn.count()) {
    await editBtn.first().click().catch(() => {})
  }
  // Editor-open signal (version-independent): every module editor shows a "View
  // Rates" button. Wait for it to render (the editor mounts async) before deciding.
  // The editor mounts async (fetches the catalog); can take >15s on cold prod.
  const editorSignal = page.getByRole('button', { name: /view rates/i }).or(page.getByText(/^\s*Trenching\s*$/i))
  await editorSignal
    .first()
    .waitFor({ state: 'visible', timeout: 30000 })
    .catch(() => {})
  return (await editorSignal.count()) > 0
}

// The first <select> that FOLLOWS a section's header text (robust to wrapper
// nesting — the header + its table are siblings, so scope by document order).
function sectionSelect(page, title) {
  return page
    .getByText(new RegExp(`^\\s*${title}\\s*$`, 'i'))
    .first()
    .locator('xpath=following::select[1]')
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
    const select = sectionSelect(page, 'Gas Line')
    await expect(select, 'No Type dropdown in Gas Line').toBeVisible()
    // A working picker has the placeholder plus at least one real gas-pipe option.
    const optionCount = await select.locator('option').count()
    expect(optionCount, 'Gas Line Type dropdown is empty — subcategory mismatch').toBeGreaterThan(1)
  })

  test('Trenching row with dimensions computes non-zero hours', async ({ page }) => {
    const ok = await openFirePit(page)
    test.skip(!ok, 'Fire Pit editor not reachable on this estimate.')
    const trench = page.getByText(/^\s*Trenching\s*$/i).first()
    // Method <select> (Trench/Hand) then LF/Width/Depth <input>s follow the heading.
    const method = trench.locator('xpath=following::select[1]')
    await expect(method, 'No Trenching Method select').toBeVisible()
    expect(await method.locator('option').count(), 'Method options (Trench/Hand)').toBeGreaterThanOrEqual(2)
    const lf = trench.locator('xpath=following::input[1]')
    await lf.fill('20')
    await trench.locator('xpath=following::input[2]').fill('6')
    await trench.locator('xpath=following::input[3]').fill('24')
    await expect(lf, 'LF did not accept input').toHaveValue('20')
    // Est. Hrs cell (the td after the depth input's td) should show a decimal, not "—".
    const hrsCell = trench.locator('xpath=following::input[3]/ancestor::td/following-sibling::td[1]')
    await expect(hrsCell, 'Trench hours did not compute').toHaveText(/\d+\.\d{2}/)
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
