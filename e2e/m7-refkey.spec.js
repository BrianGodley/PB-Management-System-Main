import { test, expect } from '@playwright/test'
import { collectErrors, moduleRowTitles, openModule, scanEveryOptionForNaN } from './helpers.js'

// ─────────────────────────────────────────────────────────────────────────────
// M7 material ref_key regression — proves the "read a built-in material's Standard
// price by its frozen ref_key (MAT-NNN) instead of its editable description" change
// did not break pricing in ANY converted module.
//
// The conversion is value-identical today (the Standard rate map is dual-keyed by
// name + ref_key), so the NEW failure mode is a mis-wired ref_key: it resolves to
// undefined and the row prices $0 or the calc goes NaN. This spec opens each
// converted module and walks the FULL vendor × Type matrix (the shared
// scanEveryOptionForNaN helper — every real vendor AND the Standard option, against
// every item option) in both crew modes, asserting nothing computes NaN/Infinity and
// no console/HTTP error fires. It is the same proven, robust pattern the per-module
// specs use; a $0-specific assertion will be hardened from the real DOM after run 1.
//
// NON-DESTRUCTIVE: opens the test estimate + each module editor, cycles pickers,
// NEVER saves. Requires TEST_ESTIMATE_URL + the modules present on that estimate;
// any module not on the estimate is skipped (not failed) with a diagnostic.
// ─────────────────────────────────────────────────────────────────────────────
const ESTIMATE = process.env.TEST_ESTIMATE_URL

// Every module whose built-in material Standard reads were repointed to ref_key in M7.
// `exclude` guards prefix collisions in the module-row substring match (see helpers).
const MODULES = [
  { name: 'Finishes' },
  { name: 'Columns' },
  { name: 'Concrete' },
  { name: 'Planting' },
  { name: 'Drainage' },
  { name: 'Ground Treatments' },
  { name: 'Outdoor Kitchen' },
  { name: 'Fire Pit' },
  { name: 'Walls' },
  { name: 'Irrigation' },
]

test.describe('M7 material ref_key resolution (no NaN / $0 across converted modules)', () => {
  test.skip(!ESTIMATE, 'Set TEST_ESTIMATE_URL to a test estimate to enable the M7 ref_key regression.')

  for (const { name, exclude } of MODULES) {
    test(`${name}: every vendor × Type computes through ref_key without NaN/console error`, async ({ page }, testInfo) => {
      test.setTimeout(240000)
      const errors = collectErrors(page)
      const ok = await openModule(page, name, { exclude })
      if (!ok) {
        const titles = await moduleRowTitles(page)
        test.skip(true, `${name} editor not reachable — module rows on this estimate: ${titles.length ? titles.join(' | ') : '(none found)'}`)
      }
      const bad = []
      let sawMode = false
      for (const mode of ['In House', 'In-House', 'Subcontractor', 'Sub']) {
        const btn = page.getByRole('button', { name: new RegExp(`^\\s*${mode}\\s*$`, 'i') }).first()
        if (!(await btn.count())) continue
        sawMode = true
        await btn.click().catch(() => {})
        await page.waitForTimeout(250)
        for (const h of await scanEveryOptionForNaN(page)) bad.push(`[${mode}] ${h}`)
      }
      // Modules without a crew-mode toggle: scan once as-is.
      if (!sawMode) for (const h of await scanEveryOptionForNaN(page)) bad.push(h)
      await testInfo.attach(`m7-${name.replace(/\s+/g, '-').toLowerCase()}.png`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: 'image/png',
      })
      expect(bad, `${name}: vendor × Type combos producing NaN/Infinity (a mis-wired ref_key):\n${bad.join('\n')}`).toEqual([])
      expect(errors, `${name}: console/HTTP errors:\n${errors.join('\n')}`).toEqual([])
    })
  }
})
