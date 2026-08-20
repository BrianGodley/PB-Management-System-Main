// Open the estimate and enter a module's EDITOR by name. Generalized from the
// hardened Fire Pit flow so every module spec reuses one nav path:
//   1) the estimate opens VIEW-ONLY → click the top-level "✏️ Edit" (not per-module),
//   2) click the project ROW then the module ROW (both `div.cursor-pointer` with the
//      module name; the name <p> carries a drag handle so exact-text match fails),
//   3) click "✎ Edit Module". Editor-open signal = the "View Rates" button every
//      module editor renders (version-independent). Returns true once it's visible.
export async function openModule(page, moduleName, { estimateUrl = process.env.TEST_ESTIMATE_URL, timeout = 30000 } = {}) {
  await page.goto(estimateUrl, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle').catch(() => {})
  const estEdit = page.getByRole('button', { name: /edit/i }).filter({ hasNotText: /module/i }).first()
  if (await estEdit.count()) {
    await estEdit.click().catch(() => {})
    await page.waitForLoadState('networkidle').catch(() => {})
  }
  const editBtn = page.getByRole('button', { name: /edit module/i })
  const rows = page.locator('div.cursor-pointer').filter({ hasText: moduleName })
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

// The first <select> that FOLLOWS a section's header text (robust to wrapper nesting).
export function sectionSelect(page, title) {
  return page.getByText(new RegExp(`^\\s*${title}\\s*$`, 'i')).first().locator('xpath=following::select[1]')
}

// Exhaustively cycle every option of every non-vendor <select> and flag any that
// produces NaN/Infinity. Uses a native DOM set + `change` dispatch instead of
// Playwright's selectOption — the latter's per-option actionability waits blow the
// test timeout on large editors. Reads innerText after two rAFs so React has
// painted the recompute. Returns the list of option labels that produced NaN.
export async function scanEveryOptionForNaN(page) {
  const bad = []
  const nSel = await page.locator('select').count()
  for (let s = 0; s < nSel; s++) {
    const optTexts = await page.locator('select').nth(s).locator('option').allTextContents()
    if (optTexts.some(t => /^\s*standard\s*$/i.test(t))) continue // skip vendor selects
    for (let o = 0; o < optTexts.length; o++) {
      const label = (optTexts[o] || '').trim()
      if (!label || /^select/i.test(label)) continue
      const nan = await page.evaluate(
        ({ s, o }) =>
          new Promise(res => {
            const el = document.querySelectorAll('select')[s]
            if (!el) return res(false)
            el.selectedIndex = o
            el.dispatchEvent(new Event('change', { bubbles: true }))
            requestAnimationFrame(() =>
              requestAnimationFrame(() => res(/\bNaN\b|Infinity/.test(document.body.innerText)))
            )
          }),
        { s, o }
      )
      if (nan) bad.push(label)
    }
  }
  return bad
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
