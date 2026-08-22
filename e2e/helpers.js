// Bounded "network is quiet" wait. Against the live SPA (weather poll, Supabase
// realtime, analytics beacons) the page can NEVER reach true networkidle, so a
// bare waitForLoadState('networkidle') burns the ENTIRE test timeout — that is
// exactly what made smoke.spec.js flaky (attempt 1 timed out at 60s, retry
// passed in 3.5s). Wait at most `timeout` ms, then move on: every assertion
// after it does its own waiting anyway.
export async function settle(page, timeout = 10000) {
  await page.waitForLoadState('networkidle', { timeout }).catch(() => {})
  await page.waitForTimeout(250)
}

// Open the estimate and enter a module's EDITOR by name. Generalized from the
// hardened Fire Pit flow so every module spec reuses one nav path:
//   1) the estimate opens VIEW-ONLY → click the top-level "✏️ Edit" (not per-module),
//   2) click the project ROW then the module ROW (both `div.cursor-pointer` with the
//      module name; the name <p> carries a drag handle so exact-text match fails),
//   3) click "✎ Edit Module". Editor-open signal = the "View Rates" button every
//      module editor renders (version-independent). Returns true once it's visible.
// `exclude` (RegExp): drop rows whose text also matches it. `hasText` is a
// SUBSTRING match, so "Skid Steer Demo" silently matches a "Mini Skid Steer
// Demo" row too — on an estimate carrying only the Mini module the Skid Steer
// spec would then pass while testing the wrong module (a false green). Specs
// whose name is a prefix of another module's pass exclude: /mini/i.
export async function openModule(page, moduleName, { estimateUrl = process.env.TEST_ESTIMATE_URL, timeout = 45000, exclude = null } = {}) {
  await page.goto(estimateUrl, { waitUntil: 'domcontentloaded' })
  await settle(page)
  const estEdit = page.getByRole('button', { name: /edit/i }).filter({ hasNotText: /module/i }).first()
  if (await estEdit.count()) {
    await estEdit.click().catch(() => {})
    await settle(page)
  }
  const editBtn = page.getByRole('button', { name: /edit module/i })
  let rows = page.locator('div.cursor-pointer').filter({ hasText: moduleName })
  if (exclude) rows = rows.filter({ hasNotText: exclude })
  if (!(await rows.count())) return false
  for (let pass = 0; pass < 3 && !(await editBtn.count()); pass++) {
    const n = await rows.count()
    for (let i = 0; i < n && !(await editBtn.count()); i++) {
      await rows.nth(i).click({ force: true }).catch(() => {})
      await page.waitForTimeout(300)
    }
  }
  if (await editBtn.count()) await editBtn.first().click().catch(() => {})
  const signal = page.getByRole('button', { name: /view rates/i })
  await signal.first().waitFor({ state: 'visible', timeout }).catch(() => {})
  return (await signal.count()) > 0
}

// Diagnostic: the text of every clickable module row currently on the page.
// When openModule() returns false the only two explanations are "the module is
// not on this estimate" and "the row is named/marked up differently" — this
// tells the two apart in the failure message instead of guessing next round.
export async function moduleRowTitles(page) {
  return await page
    .locator('div.cursor-pointer')
    .allInnerTexts()
    .then(t => t.map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 40))
    .catch(() => [])
}

// The first <select> that FOLLOWS a section's header text (robust to wrapper nesting).
export function sectionSelect(page, title) {
  return page.getByText(new RegExp(`^\\s*${title}\\s*$`, 'i')).first().locator('xpath=following::select[1]')
}

// Exhaustively exercise EVERY select's EVERY option and flag any combination that
// produces NaN/Infinity. Vendor selects are NO LONGER skipped — instead, within each
// row we walk the full vendor × item matrix (every vendor AND the Standard option,
// against every item/type option), because vendor→item is where real-DB price
// resolution bugs live (a vendor with no material_price row resolves $0/NaN, which a
// pure unit test can't see). Selects with no vendor/item pair in their row are cycled
// standalone. Runs entirely in ONE in-page async evaluate (native `change` dispatch,
// no Playwright per-option actionability waits) so the full matrix stays under the
// timeout. Reads innerText after two rAFs so React has painted each recompute.
// Returns the list of "vendor × item" (or single-option) labels that produced NaN.
export async function scanEveryOptionForNaN(page) {
  return await page.evaluate(async () => {
    const bad = []
    const raf = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
    const isVendor = el => Array.from(el.options).some(o => /^\s*standard\s*$/i.test(o.textContent || ''))
    const rowOf = el => el.closest('tr') || el.closest('[data-row]') || el.parentElement
    const realOpts = el =>
      Array.from(el.options)
        .map((o, i) => ({ i, label: (o.textContent || '').trim() }))
        .filter(o => o.label && !/^select/i.test(o.label)) // keep every real option incl. Standard
    const pick = (el, i) => {
      el.selectedIndex = i
      el.dispatchEvent(new Event('change', { bubbles: true }))
    }
    // Exclude the legit label "Infinity Edge Basin" (Pool) — a real numeric Infinity
    // ("Infinity hrs", "$Infinity") is never followed by " Edge", so it's still caught.
    const hasNaN = () => /\bNaN\b|Infinity(?!\s+Edge)/.test(document.body.innerText)

    // Group every select by its nearest row so vendor + item pickers pair correctly.
    const rows = new Map()
    for (const el of Array.from(document.querySelectorAll('select'))) {
      const r = rowOf(el)
      if (!rows.has(r)) rows.set(r, [])
      rows.get(r).push(el)
    }
    for (const group of rows.values()) {
      const vendors = group.filter(isVendor)
      const items = group.filter(el => !isVendor(el))
      if (vendors.length && items.length) {
        // Full vendor × item matrix for this row.
        for (const v of vendors) {
          for (const vo of realOpts(v)) {
            pick(v, vo.i)
            await raf()
            for (const it of items) {
              for (const io of realOpts(it)) {
                pick(it, io.i)
                await raf()
                if (hasNaN()) bad.push(`${vo.label} × ${io.label}`)
              }
            }
          }
        }
      } else {
        // No vendor/item pair — cycle each select's options on their own.
        for (const el of group) {
          for (const o of realOpts(el)) {
            pick(el, o.i)
            await raf()
            if (hasNaN()) bad.push(o.label)
          }
        }
      }
    }
    return bad
  })
}

// Attach console/page-error collectors to a page. Returns an array that fills with
// error strings as the page runs. Ignore benign noise (favicon, ResizeObserver).
export function collectErrors(page) {
  const errors = []
  const ignore = [
    /ResizeObserver loop/i,
    /favicon/i,
    /Failed to load resource.*(favicon|\.map)/i,
    /Download the React DevTools/i,
    // Transient network flakes from the CI runner reaching prod (not app bugs).
    // A real API failure still surfaces via the http>=400 response handler below;
    // a timed-out/aborted request only appears here with no status, so it's noise.
    /Failed to load resource.*net::ERR_(TIMED_OUT|CONNECTION|NETWORK|ABORTED|NAME_NOT_RESOLVED|INTERNET_DISCONNECTED)/i,
  ]
  const keep = t => t && !ignore.some(re => re.test(t))
  page.on('console', msg => {
    if (msg.type() === 'error' && keep(msg.text())) errors.push(`console: ${msg.text()}`)
  })
  page.on('pageerror', err => {
    if (keep(err.message)) errors.push(`pageerror: ${err.message}`)
  })
  // Capture failed HTTP responses WITH their URL so a bare "400" in the console
  // becomes actionable. Ignore 401 (token-refresh races the app retries) and the
  // asset noise above.
  page.on('response', resp => {
    const s = resp.status()
    if (s >= 400 && s !== 401 && keep(resp.url())) {
      errors.push(`http ${s}: ${resp.request().method()} ${resp.url()}`)
    }
  })
  return errors
}

// Fill a number/text field that the app's autofill guard has made READONLY.
// Layout.jsx marks every input readonly on mount and removes the attribute on
// the FIRST focus (it blocks the browser's contact/address autofill overlay).
// Playwright's fill() runs its "editable" actionability check BEFORE focusing,
// so on a never-touched field it waits out the whole timeout on an input the
// user could type into fine — that is what killed the Outdoor Kitchen live-edit
// test (resolved element showed `readonly` in the call log). Focus first to
// wake the field, then fill. Throws on real failures — never wrap this in
// .catch(() => {}), or a fill that never landed looks like a total that refused
// to move.
export async function fillField(locator, value) {
  await locator.scrollIntoViewIfNeeded().catch(() => {})
  await locator.focus()
  // The focus handler removes readonly synchronously; wait for it so fill()'s
  // actionability check sees an editable field.
  await locator.evaluate(el => el.removeAttribute('readonly')).catch(() => {})
  await locator.fill(String(value))
}
