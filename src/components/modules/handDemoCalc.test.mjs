// Acceptance tests for the Hand Demo CF/hr model (reworked 2026-08-20):
//   hours = Cu Ft ÷ (CF/hr), CF = SF × depth ÷ 12; no tonnage; rebar toggle ×1.25 on
//   concrete; sub grading Cut/Fill priced per CF (with depth); In-House/Sub independent.
// Pure calc, no network. Run: node --test src/components/modules/handDemoCalc.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { calcDemo } from './handDemoCalc.js'

// CF/hr production rates (In-House labor) + JJ (SF/hr) + rebar factor.
const fullRates = (over = {}) => ({
  'Demo - Hand Concrete': 15,
  'Demo - Hand Soil': 10,
  'Demo - Hand Grass': 12,
  'Demo - Hand Import Base': 40,
  'Demo - Hand Bucket': 8,
  'Demo - Hand Misc Flat': 10,
  'Demo - Hand Misc Vert': 10,
  'Demo - Hand Footing': 10,
  'Demo - Hand Grade Cut': 8,
  'Demo - Hand Grade Fill': 40,
  'Demo - Hand JJ': 50, // SF/hr
  'Demo - Hand Rebar': 0.25, // +25% concrete when rebar toggle on
  'Demo - Hand Load (CY)': 1,
  'Demo - Hand Difficulty Ratio': 1,
  ...over,
})
const fullMat = (over = {}) => ({
  'Demo - Hand Container (Low-Boy)': 500,
  'Demo - Hand Container Capacity (CY)': 12,
  'Demo - Hand Removal Swell': 1.25,
  'Demo - Hand Import Base $/10cy': 300,
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
  'Demo - Hand Sub Haul CY - Concrete': 80,
  'Demo - Hand Sub Haul CY - Dirt': 80,
  'Demo - Hand Sub Haul CY - Grass': 67,
  'Demo - Hand Sub Haul - Trash 12yd': 850,
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

test('concrete demo: hours = CF ÷ 15 (300 SF × 12in = 300 CF → 20 hrs)', () => {
  // Only concrete; distance 0 so no walk hours; difficulty 0 so diff = 1.
  const r = run({ dumpType: 'In House', concSF: 300, concDepth: 12 })
  assert.equal(r.laborCost, 20 * LRPH, `20 hrs × $${LRPH} = ${20 * LRPH}, got ${r.laborCost}`)
  finiteNums(r)
})

test('rebar toggle adds 25% to concrete hours', () => {
  const base = run({ dumpType: 'In House', concSF: 300, concDepth: 12 })
  const withRebar = run({ dumpType: 'In House', concSF: 300, concDepth: 12, rebar: true })
  assert.equal(withRebar.laborCost, base.laborCost * 1.25, 'rebar → concrete ×1.25')
})

test('soil demo uses its own CF/hr (200 CF ÷ 10 = 20 hrs)', () => {
  const r = run({ dumpType: 'In House', dirtSF: 200, dirtDepth: 12 })
  assert.equal(r.laborCost, 20 * LRPH)
})

test('grade fill uses 40 CF/hr, grade cut uses 8 CF/hr (distinct rates)', () => {
  const cut = run({ dumpType: 'In House', gradeCutSF: 80, gradeCutDepth: 12 }) // 80 CF ÷ 8 = 10 hrs
  const fill = run({ dumpType: 'In House', gradeFillSF: 80, gradeFillDepth: 12 }) // 80 CF ÷ 40 = 2 hrs
  assert.equal(cut.laborCost, 10 * LRPH)
  assert.equal(fill.laborCost, 2 * LRPH)
})

test('View Rates edit reflects: raising the concrete CF/hr LOWERS hours (faster)', () => {
  const slow = run({ dumpType: 'In House', concSF: 300, concDepth: 12 }, fullRates({ 'Demo - Hand Concrete': 15 }))
  const fast = run({ dumpType: 'In House', concSF: 300, concDepth: 12 }, fullRates({ 'Demo - Hand Concrete': 30 }))
  assert.ok(fast.laborCost < slow.laborCost, 'higher CF/hr → fewer hours → lower labor')
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
