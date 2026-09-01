import { test, expect } from '@playwright/test'
import { collectErrors, settle } from './helpers.js'

// Covers the two hardening fixes from the npm-audit triage. NON-DESTRUCTIVE:
// loads pages, reads the URL and the rendered canvas, never saves anything.
//
// 1. Open redirect — EstimateDetail read `?return_to=` straight out of the query
//    string and handed it to navigate(). safeInternalPath() now rejects anything
//    that is not a clean relative path. The redirect itself only fires after a
//    change-order bid is created, which the suite must never do against prod, so
//    this asserts the reachable half: a hostile return_to never moves the origin.
// 2. isEvalSupported:false on every pdf.js entry point (GHSA-wgrm-67xf-hhpq).
//    The regression risk is that PDFs stop rendering, so assert one still draws.

const ESTIMATE = process.env.TEST_ESTIMATE_URL

test.describe('Security — open redirect', () => {
  test.skip(!ESTIMATE, 'Set TEST_ESTIMATE_URL to a test estimate to enable redirect checks.')

  // Each of these is a way to smuggle an absolute destination past a naive
  // "starts with /" check; all must leave us on the app's own origin.
  const HOSTILE = ['//example.com', '/\\example.com', 'https://example.com', 'javascript:alert(1)']

  for (const payload of HOSTILE) {
    test(`return_to=${payload} does not leave the origin`, async ({ page, baseURL }) => {
      const target = `${ESTIMATE}${ESTIMATE.includes('?') ? '&' : '?'}return_to=${encodeURIComponent(payload)}`
      await page.goto(target, { waitUntil: 'domcontentloaded' })
      await settle(page)

      // Only the HOST tells us whether the redirect was followed. The payload is
      // still sitting in our own query string — we put it there — so matching the
      // whole URL against /example\.com/ can never pass, no matter how well the
      // guard works. Assert on the parsed origin and host instead.
      const url = new URL(page.url())
      expect(url.origin, `navigated off-origin via return_to=${payload}`).toBe(
        new URL(baseURL).origin
      )
      expect(url.host, `landed on a foreign host via return_to=${payload}`).not.toMatch(
        /example\.com/
      )
    })
  }
})

test.describe('Security — PDF rendering still works with eval disabled', () => {
  test('e-documents list renders a PDF preview', async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto('/edocuments', { waitUntil: 'domcontentloaded' })
    await settle(page)
    await expect(page).not.toHaveURL(/\/login/)

    // react-pdf draws each page into a <canvas>. If isEvalSupported:false had
    // broken font/CMap handling, the Document would surface its error slot
    // instead of ever painting one.
    const canvas = page.locator('canvas')
    const empty = page.getByText(/no e-?documents/i)
    await expect(canvas.first().or(empty)).toBeVisible({ timeout: 30_000 })
    if (await empty.isVisible().catch(() => false)) {
      test.info().annotations.push({ type: 'warning', description: 'No e-documents present — PDF render path not exercised.' })
      return
    }
    expect(errors.filter(e => /pdf|eval|worker/i.test(e)), `PDF console errors:\n${errors.join('\n')}`).toEqual([])
  })
})
