import { test, expect } from '@playwright/test'
import { collectErrors, scanEveryOptionForNaN, settle } from './helpers.js'

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
  await settle(page)
  // 0) The estimate opens VIEW-ONLY ("👁 View Module" / "Viewing only…"). Click the
  //    estimate's top-level "✏️ Edit" (not the per-module button) to enter edit mode.
  const estEdit = page
    .getByRole('button', { name: /edit/i })
    .filter({ hasNotText: /module/i })
    .first()
  if (await estEdit.count()) {
    await estEdit.click().catch(() => {})
    await settle(page)
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
    // Find the finish TYPE picker by its OPTIONS (a select whose options contain a known
    // finish name) — robust to header text / select ordering. If NO select has a finish
    // option, that is itself a real finding (shared finishes not loading) and the skip
    // reason says so.
    const FINISH = /stucco|ledgerstone|stacked stone|\btile\b|flagstone|real stone/i
    const all = page.locator('select')
    const nAll = await all.count()
    let wf = null
    let finishIdx = -1
    for (let i = 0; i < nAll; i++) {
      const o = await all.nth(i).locator('option').allTextContents()
      const fi = o.findIndex(x => FINISH.test(x))
      if (fi >= 0) { wf = all.nth(i); finishIdx = fi; break }
    }
    // HARD FAIL (not skip) if no finish picker exists — a missing finish picker is
    // itself the bug (shared finishes not loading), and a skip reads as green.
    expect(wf, 'No finish TYPE picker found — no select has a finish option (shared finishes not loading?).').not.toBeNull()
    await wf.selectOption({ index: finishIdx })
    // Enter SF in the finish row, then read that row's TOTAL cell (last td) — NOT the
    // whole row. The whole-row text lets the material price's decimals ("$150.00")
    // satisfy a naive "any decimal" check, which is exactly how this test used to pass
    // while labor hrs were 0. The hours token is rendered ONLY as " · N.Nh" and ONLY
    // when hrs>0 (FirePitModule ~L1786), so we assert that token explicitly.
    const row = wf.locator('xpath=ancestor::tr[1]')
    const sf = row.locator('input').first()
    await sf.click().catch(() => {})
    await sf.fill('50').catch(() => {})
    await page.waitForTimeout(600)
    const totalCell = await row.locator('td').last().innerText()
    await testInfo.attach('fire-pit-finish-value.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    // Material: a real dollar amount in the total cell.
    expect(/\$\s?[1-9][\d,]*(\.\d{2})?/.test(totalCell), `finish MATERIAL should be nonzero — total cell was:\n${totalCell}`).toBe(true)
    // Labor: the explicit hours token "· N.Nh" (NOT just any decimal). This is what
    // catches the real bug — zero hrs renders no "h" at all, so this must go red.
    expect(/·\s*[1-9]\d*(\.\d+)?\s*h\b/i.test(totalCell), `finish LABOR hrs should be nonzero — no "· N.Nh" token in total cell:\n${totalCell}`).toBe(true)
  })

  // ── EXHAUSTIVE coverage — every field + every dropdown option ────────────────
  const UNPRICED = /labor rate needed|price me|unpriced|missing price|needs? a price|set (a |the )?price/i

  test('exhaustive: every vendor × item option, on every tab, computes without a NaN/console error', async ({ page }, testInfo) => {
    // NO STONE UNTURNED: cycle the FULL vendor × item matrix (every vendor AND the
    // Standard option, against every item/type option) for every row — AND do it on
    // every tab, because inactive tabs aren't in the DOM so their selects would never
    // be scanned otherwise. Fire Pit has 4 structure tabs × In-House/Sub, so this is
    // by far the heaviest scan; the matrix runs in-page (one evaluate per tab, no
    // Playwright per-option waits) to stay under the ceiling. Raised to the max.
    test.setTimeout(600000)
    const errors = collectErrors(page)
    const ok = await openFirePit(page)
    test.skip(!ok, 'Fire Pit editor not reachable on this estimate.')

    const bad = []
    const scanCurrentView = async label => {
      const hits = await scanEveryOptionForNaN(page)
      for (const h of hits) bad.push(`[${label}] ${h}`)
    }
    // Enumerate every In-House/Sub × structure-type tab combination and scan each.
    const outerTabs = ['In House', 'In-House', 'Subcontractor', 'Sub']
    const structureTabs = ['CMU', 'Poured in Place', 'Modular', 'Brick']
    const clickTab = async name => {
      const btn = page.getByRole('button', { name: new RegExp(`^\\s*${name}\\s*$`, 'i') }).first()
      if (!(await btn.count())) return false
      await btn.click().catch(() => {})
      await page.waitForTimeout(250)
      return true
    }
    let scannedAny = false
    for (const outer of outerTabs) {
      const outerOk = await clickTab(outer)
      // Only one of the In House / In-House synonyms (and Sub / Subcontractor) exists.
      if (!outerOk) continue
      for (const st of structureTabs) {
        const stOk = await clickTab(st)
        if (!stOk) continue
        scannedAny = true
        await scanCurrentView(`${outer} › ${st}`)
      }
      // If a tab layout has no structure sub-tabs, still scan the outer view.
      if (!scannedAny) await scanCurrentView(outer)
    }
    // Fallback: if no tab buttons matched at all, scan whatever is mounted.
    if (!scannedAny) await scanCurrentView('default view')

    expect(bad, `Vendor × item combos producing NaN/Infinity:\n${bad.join('\n')}`).toEqual([])
    await testInfo.attach('fire-pit-exhaustive.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    // Console/HTTP errors during the whole matrix cycle = real bug.
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
