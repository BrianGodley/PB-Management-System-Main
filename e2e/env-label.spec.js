import { test, expect } from '@playwright/test'

// The staging and production windows are otherwise identical, so the tab title
// is the thing that tells them apart when both are open. This asserts the
// invariant rather than a fixed string, so the one spec is correct against
// either environment:
//
//   data-env="production" -> plain title, no STAGING anywhere
//   data-env="staging"    -> title prefixed "STAGING — "
//
// The fail-safe direction matters most: an unset or malformed VITE_SUPABASE_URL
// resolves to "staging", so a misconfigured build shouts rather than passing
// itself off as production.
test.describe('Environment label', () => {
  test('tab title matches the Supabase project the app is pointed at', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const env = await page.locator('html').getAttribute('data-env')
    expect(env, 'main.jsx should stamp data-env on <html>').toMatch(/^(production|staging)$/)

    const title = await page.title()
    expect(title, 'title should never be empty').not.toBe('')

    if (env === 'production') {
      expect(title, 'production must NOT be labelled').not.toContain('STAGING')
    } else {
      expect(title, 'non-production MUST be labelled').toMatch(/^STAGING — /)
    }
  })

  test('staging shows the hazard bar; production shows none', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const env = await page.locator('html').getAttribute('data-env')
    // The marker is a ::before pseudo-element on <html>, so it has to be read
    // through getComputedStyle rather than located as a DOM node.
    const bar = await page.evaluate(() => {
      const s = getComputedStyle(document.documentElement, '::before')
      return { content: s.content, height: s.height, position: s.position, pointerEvents: s.pointerEvents }
    })

    if (env === 'production') {
      expect(bar.content, 'production must not render the staging bar').toBe('none')
    } else {
      expect(bar.content, 'staging must render the bar').not.toBe('none')
      expect(bar.height, 'bar should be the 4px marker').toBe('4px')
      expect(bar.position).toBe('fixed')
      // Must never intercept a click meant for the app underneath it.
      expect(bar.pointerEvents, 'bar must not be clickable').toBe('none')
    }
  })

  test('label is applied once, not repeated on re-render', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.reload({ waitUntil: 'domcontentloaded' })

    const title = await page.title()
    const occurrences = (title.match(/STAGING/g) || []).length
    expect(occurrences, `title should carry at most one STAGING prefix, got: ${title}`)
      .toBeLessThanOrEqual(1)
  })
})
