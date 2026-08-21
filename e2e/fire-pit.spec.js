import { test, expect } from '@playwright/test'
import { collectErrors, scanEveryOptionForNaN } from './helpers.js'

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
    // Anchor on the Method <select> (Trench/Hand); the LF/Width/Depth inputs are in
    // its row. Inputs are readonly-until-focus, so click each before filling.
    const method = trench.locator('xpath=following::select[1]')
    await expect(method, 'No Trenching Method select').toBeVisible()
    expect(await method.locator('option').count(), 'Method options (Trench/Hand)').toBeGreaterThanOrEqual(2)
    const row = method.locator('xpath=ancestor::tr[1]')
    const inputs = row.locator('input')
    const vals = ['20', '6', '24'] // LF, Width, Depth
    for (let i = 0; i < 3; i++) {
      await inputs.nth(i).click().catch(() => {})
      await inputs.nth(i).fill(vals[i])
    }
    await expect(inputs.nth(0), 'LF did not accept input').toHaveValue('20')
    // Est. Hrs cell (last cell of the row) should show a decimal, not "—".
    await expect(row.locator('td').last(), 'Trench hours did not compute').toHaveText(/\d+\.\d{2}/)
  })

  test('wall finishes resolve a price (no unpriced/labor-needed banner) for standard types', async ({ page }, testInfo) => {
    const ok = await openFirePit(page)
    test.skip(!ok, 'Fire Pit editor not reachable on this estimate.')
    // Pick the first real option in each Wall Finish Type dropdown; a shared finish
    // that's live in View Rates must NOT trigger the unpriced / "labor rate needed"
    // fix-it banner. (This is expected to reveal the per-module duplicate-finish bug
    // until the shared-finishes consolidation lands.)
    const wf = sectionSelect(page, 'Wall Finishes')
    if (await wf.count()) {
      const opts = wf.locator('option')
      if ((await opts.count()) > 1) {
        await wf.selectOption({ index: 1 }).catch(() => {})
      }
    }
    await testInfo.attach('fire-pit-finish.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    await expect(
      page.getByText(/labor rate needed|price me|unpriced/i),
      'A live-in-View-Rates finish still shows an unpriced/labor-needed banner'
    ).toHaveCount(0)
  })

  // Guards the fetch-scope bug (shared finish LABOR resolved to 0 hrs because the
  // module's labor_rates query omitted category 'Finishes'). "No banner" is not
  // enough — the finish line must show BOTH nonzero material $ AND nonzero labor hrs.
  test('wall finish resolves nonzero material $ AND nonzero labor hrs', async ({ page }, testInfo) => {
    const ok = await openFirePit(page)
    test.skip(!ok, 'Fire Pit editor not reachable on this estimate.')
    const wf = sectionSelect(page, 'Wall Finishes')
    test.skip(!(await wf.count()), 'No Wall Finishes picker on this estimate.')
    const opts = await wf.locator('option').allTextContents()
    const idx = opts.findIndex(o => o && !/^\s*select/i.test(o.trim()))
    test.skip(idx < 1, 'No real finish option to pick.')
    await wf.selectOption({ index: idx })
    // Enter SF in the finish row (the input immediately following the finish select).
    const sf = wf.locator('xpath=following::input[1]')
    await sf.click().catch(() => {})
    await sf.fill('50').catch(() => {})
    await page.waitForTimeout(600)
    const region = await wf.locator('xpath=ancestor::table[1]').innerText()
    await testInfo.attach('fire-pit-finish-value.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    expect(/\$\s?[1-9][\d,]*/.test(region), `finish material should be nonzero — got:\n${region.slice(0, 300)}`).toBe(true)
    expect(/\b[1-9]\d*\.\d{1,2}\b/.test(region), `finish labor hrs should be nonzero (the fetch-scope bug) — got:\n${region.slice(0, 300)}`).toBe(true)
  })

  // ── EXHAUSTIVE coverage — every field + every dropdown option ────────────────
  const UNPRICED = /labor rate needed|price me|unpriced|missing price|needs? a price|set (a |the )?price/i

  test('exhaustive: every TYPE dropdown option computes without a NaN/console error', async ({ page }, testInfo) => {
    // Fire Pit has 4 structure-type tabs, so this cycles far more select/option
    // pairs than the other modules; 180s was not enough on prod (CI timeout,
    // 2026-08-20). Raised — coverage stays "every option", no options skipped.
    test.setTimeout(300000)
    const errors = collectErrors(page)
    const ok = await openFirePit(page)
    test.skip(!ok, 'Fire Pit editor not reachable on this estimate.')
    // Fast DOM-dispatch scan (helpers.scanEveryOptionForNaN) — replaces per-option
    // Playwright selectOption, whose actionability waits blew the 180s/600s ceiling
    // on Fire Pit's 4-tab editor. Cycles every non-vendor option, same coverage.
    const bad = await scanEveryOptionForNaN(page)
    expect(bad, `Options producing NaN/Infinity: ${bad.join(', ')}`).toEqual([])
    await testInfo.attach('fire-pit-exhaustive.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    // Console/HTTP errors during option cycling = real bug.
    expect(errors, `Console/HTTP errors:\n${errors.join('\n')}`).toEqual([])
  })

  test('exhaustive: every structure type tab computes without NaN', async ({ page }) => {
    const ok = await openFirePit(page)
    test.skip(!ok, 'Fire Pit editor not reachable on this estimate.')
    for (const t of ['CMU', 'Poured in Place', 'Modular', 'Brick']) {
      const tab = page.getByRole('button', { name: new RegExp(t, 'i') }).first()
      if (!(await tab.count())) continue
      await tab.click().catch(() => {})
      // The flake was a fixed 250ms sleep racing the tab's re-render. Poll the
      // in-page text instead: this waits out both the render and any transient
      // NaN that appears mid-recompute, and passes as soon as the tab is stable.
      await expect
        .poll(() => page.evaluate(() => /\bNaN\b|Infinity/.test(document.body.innerText)), {
          timeout: 8000,
          message: `Structure ${t} produced NaN/Infinity`,
        })
        .toBe(false)
    }
  })

  test('exhaustive: numeric fields accept input and the module computes a total', async ({ page }) => {
    const ok = await openFirePit(page)
    test.skip(!ok, 'Fire Pit editor not reachable on this estimate.')
    // Fill every visible numeric input with a representative value (click-before-fill
    // for readonly-until-focus fields), then assert a dollar total renders.
    const nums = page.locator('input[type="number"], input[step]')
    const n = Math.min(await nums.count(), 60)
    for (let i = 0; i < n; i++) {
      const inp = nums.nth(i)
      if (!(await inp.isVisible().catch(() => false))) continue
      await inp.click().catch(() => {})
      await inp.fill('5').catch(() => {})
    }
    await page.waitForTimeout(300)
    await expect(page.getByText(/\$[\d,]+/).first(), 'No dollar total after entering values').toBeVisible()
    expect(await page.getByText(UNPRICED).count(), 'Unpriced prompt after filling fields').toBe(0)
  })

  test('exhaustive: Subcontractor tab renders and prices', async ({ page }) => {
    const ok = await openFirePit(page)
    test.skip(!ok, 'Fire Pit editor not reachable on this estimate.')
    const subTab = page.getByRole('button', { name: /^subcontractor$/i }).first()
    if (!(await subTab.count())) return
    await subTab.click().catch(() => {})
    await page.waitForTimeout(300)
    await expect(page.getByText(/\$[\d,]/).first(), 'Sub tab shows no pricing').toBeVisible()
    expect(await page.getByText(UNPRICED).count(), 'Unpriced prompt on Sub tab').toBe(0)
  })
})
