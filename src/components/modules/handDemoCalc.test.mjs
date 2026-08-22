// Acceptance tests for the Hand Demo CF/hr model (reworked 2026-08-20):
//   hours = Cu Ft ÷ (CF/hr), CF = SF × depth ÷ 12; no tonnage; rebar toggle ×1.25 on
//   concrete; sub grading Cut/Fill priced per CF (with depth); In-House/Sub independent.
// Pure calc, no network. Run: node --test src/components/modules/handDemoCalc.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { calcDemo } from './handDemoCalc.js'

// hrs-per-Cu-Ft rates (In-House labor). hours = Cu Ft × rate. JJ = shared Basic Labor.
const fullRates = (over = {}) => ({
  'Hand - Concrete': 0.1,   // hrs / Cu Ft
  'Hand - Soil': 0.1,
  'Hand - Grass': 0.1,
  'Hand - Import Base': 0.1,
  'Hand - Bucket': 0.1,
  'Hand - Misc Flat': 0.1,
  'Hand - Misc Vertical': 0.1,
  'Hand - Footing': 0.1,
  'Hand - Grade Cut': 0.1,
  'Hand - Grade Fill': 0.05,
  'Basic Labor - Jumping Jack': 0.04, // shared, hrs / Cu Ft
  'Hand - Rebar': 0.25, // +25% concrete when rebar toggle on
  'Hand - Load (CY)': 1,
  'Hand - Difficulty Ratio': 1,
  ...over,
})
const fullMat = (over = {}) => ({
  'Hand - Container (Low-Boy)': 500,
  'Hand - Container Capacity (CY)': 12,
  'Hand - Removal Swell': 1.25,
  'Hand - Import Base $/10cy': 300,
  ...over,
})
const fullSub = (over = {}) => ({
  'Sub Grade - Hand Cut': 1.75, // $/CF
  'Sub Grade - Hand Fill': 1.5, // $/CF
  'Sub Grade - Hand JJ': 1, // $/SF
  'Sub Grade - Hand Roll': 4, // $/SF
  'Sub Grade - Hand Sheepsfoot': 5, // $/SF
  'Sub Tree - Hand 6-12': 350,
  'Sub Tree - Hand 12-18': 1200,
  'Sub Tree - Hand 18-24': 2800,
  'Hand - Sub Haul CY - Concrete': 80,
  'Hand - Sub Haul CY - Dirt': 80,
  'Hand - Sub Haul CY - Grass': 67,
  'Hand - Sub Haul - Trash 12yd': 850,
  ...over,
})
const LRPH = 75
const run = (state, lr = fullRates(), mp = fullMat(), sr = fullSub()) =>
  calcDemo({ difficulty: 0, distanceLF: 0, ...state }, LRPH, mp, lr, 0.35, sr, 500, null, 0.3, 0.05)

const finiteNums = obj => {
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'number') assert.ok(Number.isFinite(v), `${k} not finite: ${v}`)
  }
}

test('concrete demo: hours = CF × 0.1 (300 SF × 12in = 300 CF → 30 hrs)', () => {
  // Only concrete; distance 0 so no walk hours; difficulty 0 so diff = 1.
  const r = run({ dumpType: 'In House', concSF: 300, concDepth: 12 })
  assert.equal(r.laborCost, 30 * LRPH, `30 hrs × $${LRPH} = ${30 * LRPH}, got ${r.laborCost}`)
  finiteNums(r)
})

test('bucket checkbox multiplies that row hours by the Bucket coefficient', () => {
  const rates = fullRates({ 'Hand - Bucket Labor Mult': 2 })
  const base = run({ dumpType: 'In House', concSF: 300, concDepth: 12 }, rates)
  const bucketed = run({ dumpType: 'In House', concSF: 300, concDepth: 12, concBucket: true }, rates)
  assert.equal(bucketed.laborCost, base.laborCost * 2, 'concrete bucket → ×2')
  // Unset coefficient ⇒ no effect (identity), never zeroes.
  const noCoef = run({ dumpType: 'In House', concSF: 300, concDepth: 12, concBucket: true }, fullRates())
  assert.equal(noCoef.laborCost, base.laborCost, 'no bucket coefficient → checkbox is a no-op')
})

test('rebar toggle adds 25% to concrete hours', () => {
  const base = run({ dumpType: 'In House', concSF: 300, concDepth: 12 })
  const withRebar = run({ dumpType: 'In House', concSF: 300, concDepth: 12, rebar: true })
  assert.equal(withRebar.laborCost, base.laborCost * 1.25, 'rebar → concrete ×1.25')
})

test('soil demo uses its own hrs/CF (200 CF × 0.1 = 20 hrs)', () => {
  const r = run({ dumpType: 'In House', dirtSF: 200, dirtDepth: 12 })
  assert.equal(r.laborCost, 20 * LRPH)
})

test('grade cut uses 0.1 hrs/CF, grade fill 0.05 (distinct rates)', () => {
  const cut = run({ dumpType: 'In House', gradeCutSF: 80, gradeCutDepth: 12 }) // 80 CF × 0.1 = 8 hrs
  const fill = run({ dumpType: 'In House', gradeFillSF: 80, gradeFillDepth: 12 }) // 80 CF × 0.05 = 4 hrs
  assert.equal(cut.laborCost, 8 * LRPH)
  assert.equal(fill.laborCost, 4 * LRPH)
})

test('View Rates edit reflects: raising the hrs/CF RAISES hours (multiply model)', () => {
  const slow = run({ dumpType: 'In House', concSF: 300, concDepth: 12 }, fullRates({ 'Hand - Concrete': 0.1 }))
  const fast = run({ dumpType: 'In House', concSF: 300, concDepth: 12 }, fullRates({ 'Hand - Concrete': 0.2 }))
  assert.equal(fast.laborCost, slow.laborCost * 2, 'rate ×2 → hours ×2')
})

test('sub grading Cut is priced per CF with depth (100 SF × 12in × $1.75 = $175)', () => {
  const r = run({ dumpType: 'Subcontractor', subGradeCutSF: 100, subGradeCutDepth: 12 })
  assert.equal(r.subGradingCost, 175, `got ${r.subGradingCost}`)
})

test('sub compaction stays per SF (Roll 50 SF × $4 = $200)', () => {
  const r = run({ dumpType: 'Subcontractor', rollCompSF: 50 })
  assert.equal(r.subGradingCost, 200, `got ${r.subGradingCost}`)
})

test('sub tree priced per each by diameter (2× 18-24 @ $2800 = $5600)', () => {
  const r = run({ dumpType: 'Subcontractor', subTreeRows: [{ qty: 2, size: '18" - 24"' }] })
  assert.equal(r.subTreeCost, 5600, `got ${r.subTreeCost}`)
})

test('In-House and Subcontractor are independent (each responds to its own inputs)', () => {
  const ih = run({ dumpType: 'In House', concSF: 300, concDepth: 12 })
  const ihMore = run({ dumpType: 'In House', concSF: 600, concDepth: 12 })
  assert.ok(ihMore.laborCost > ih.laborCost, 'In-House tracks concSF')
  const sub = run({ dumpType: 'Subcontractor', subGradeCutSF: 100, subGradeCutDepth: 12 })
  const subMore = run({ dumpType: 'Subcontractor', subGradeCutSF: 200, subGradeCutDepth: 12 })
  assert.ok(subMore.subGradingCost > sub.subGradingCost, 'Sub tracks its own grade input')
  // In-House concSF must not change sub grading.
  const subWithConc = run({ dumpType: 'Subcontractor', subGradeCutSF: 100, subGradeCutDepth: 12, concSF: 9999, concDepth: 12 })
  assert.equal(subWithConc.subGradingCost, sub.subGradingCost)
})
