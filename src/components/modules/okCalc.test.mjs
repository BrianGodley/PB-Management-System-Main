import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeOkFinishRow, WF_META, WF_LIST, okFinishTypeOptions } from './okCalc.js'

const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, `${msg}: ${a} vs ${b}`)

// Value — veneer/else mode: sf × $/SF × waste + screws; labor = sf × hrs/SF.
test('value: veneer finish = sf × unit × waste + screws, sf × laborRate', () => {
  const meta = { unit: 'SF', waste: 1.1, screwPer5: 2 }
  const r = computeOkFinishRow(20, meta, 10, 0.3333)
  near(r.mat, 20 * 10 * 1.1 + (20 / 5) * 2, 'mat = sf×unit×waste + screws')
  near(r.hrs, 20 * 0.3333, 'hrs')
})

// Stone mode — sf × $/SF + delivery + flat misc (+ optional add/SF).
test('value: stone finish = sf×unit + sf×delivery + misc', () => {
  const meta = { unit: 'stone', delivPerSF: 1, misc: 268.75 }
  const r = computeOkFinishRow(20, meta, 15, 0.5)
  near(r.mat, 20 * 15 + 20 * 1 + 268.75, 'mat = sf×unit + sf×deliv + misc')
  near(r.hrs, 20 * 0.5, 'hrs')
})

// Edit-reflects — raising the shared unit / labor rate raises the output.
test('edit-reflects: bump unit/laborRate → output rises', () => {
  const meta = { unit: 'SF' }
  const before = computeOkFinishRow(20, meta, 6.5, 0.3)
  const afterMat = computeOkFinishRow(20, meta, 9.0, 0.3)
  const afterLab = computeOkFinishRow(20, meta, 6.5, 0.5)
  assert.ok(afterMat.mat > before.mat, 'material rises with the shared price')
  assert.ok(afterLab.hrs > before.hrs, 'labor rises with the shared rate')
})

// Unpriced / NO-FALLBACK — unit 0 + laborRate 0 → 0 (base material only, no constant).
test('unpriced: unit 0, laborRate 0 → mat is adders-only, hrs 0', () => {
  const meta = { unit: 'SF' } // no adders
  const r = computeOkFinishRow(30, meta, 0, 0)
  near(r.mat, 0, 'no price + no adders → 0')
  near(r.hrs, 0, 'no labor rate → 0 hrs')
})

// ── Finish-option CONTRACT (the "switching finish zeros out" regression) ──────
// The TYPE dropdown must only ever offer options that round-trip to a WF_META meta
// with a material key + labor key — otherwise selecting one drops to masterWallMeta
// and zeroes material+labor. The bug: the dropdown was built from raw 'Finish
// Material' catalog names (junk like Concrete Truck / *Flatwork + full '<Type> -
// Finishes' names), none of which are WF_META keys. These lock the contract.
test('contract: every finish dropdown option is a WF_META key', () => {
  for (const opt of okFinishTypeOptions()) {
    assert.ok(WF_META[opt], `dropdown option "${opt}" is not a WF_META key → would zero out`)
  }
})

test('contract: every WF_META finish carries a material key + labor key', () => {
  for (const type of WF_LIST) {
    const m = WF_META[type]
    assert.ok(m && m.key, `${type} missing material key (OK_RATES material lookup)`)
    assert.ok(m && m.labKey, `${type} missing labKey (OK_RATES labor lookup)`)
  }
})

test('contract: every canonical finish prices material + labor at a positive rate', () => {
  // Feed each finish its shared unit ($/SF or $/stone) + a labor rate; all must
  // produce BOTH material and hours (proving the option, once selected, prices).
  for (const type of WF_LIST) {
    const meta = WF_META[type]
    const r = computeOkFinishRow(20, meta, 10, 0.3)
    assert.ok(r.mat > 0, `${type}: material should be > 0 at 20 SF × $10`)
    assert.ok(r.hrs > 0, `${type}: labor hours should be > 0 at 20 SF × 0.3 hr/SF`)
  }
})

// Vendor-override — a different injected unit drives a different total.
test('vendor-override: vendor unit changes the material total', () => {
  const meta = { unit: 'SF' }
  const std = computeOkFinishRow(10, meta, 10, 0.3333)
  const ven = computeOkFinishRow(10, meta, 14, 0.3333)
  assert.ok(ven.mat > std.mat, 'vendor price overrides Standard')
})

// Zero / missing sf or meta → zero (guarded, no NaN).
test('zero sf or missing meta → { mat: 0, hrs: 0 }', () => {
  near(computeOkFinishRow(0, { unit: 'SF' }, 10, 0.3).mat, 0, 'zero sf')
  near(computeOkFinishRow(20, null, 10, 0.3).hrs, 0, 'missing meta')
})
