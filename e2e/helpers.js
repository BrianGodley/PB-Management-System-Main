// Attach console/page-error collectors to a page. Returns an array that fills with
// error strings as the page runs. Ignore benign noise (favicon, ResizeObserver).
export function collectErrors(page) {
  const errors = []
  const ignore = [
    /ResizeObserver loop/i,
    /favicon/i,
    /Failed to load resource.*(favicon|\.map)/i,
    /Download the React DevTools/i,
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
