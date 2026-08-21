// Acceptance tests for the Skid Steer Demo calc (pure, no network).
//   In-House labor model: hrs = (SF / 100) × depth_in × rate  (a MULTIPLY — higher
//   rate ⇒ more hours; hrs-per-unit, no production-rate divide). totalHrs (diff=1,
//   no walk) → laborCost = totalHrs × lrph. Sub grading is per-SF; sub tree per-each.
//   Reads 'Demo - Skid …' rate keys, independent of Hand/Mini.
// Run: node --test src/components/modules/skidSteerCalc.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { calcDemo } from './skidSteerCalc.js'

const fullRates = (over = {}) => ({
  'Demo - Skid - Concrete SF': 0.5,
  'Demo - Skid - Dirt SF': 0.4,
  'Demo - Skid - Grass SF': 0.3,
  'Demo - Skid - Misc Flat SF': 0.5,
  'Demo - Skid - Misc Vert SF': 0.5,
  'Demo - Skid - Footing SF': 0.5,
  'Demo - Skid - Grade Cut SF': 0.4,
  'Demo - Skid - Grade Fill SF': 0.2,
  'Demo - Skid - Import Base SF': 0.3,
  'Demo - Skid - JJ SF': 0.1,
  'Demo - Skid - SS Compact SF': 0.1,
  'Demo - Skid Steer Grass': 0.3,
  'Demo - Skid Rebar': 0.25,
  'Demo - Skid Shrub': 0.5,
  'Demo - Skid Stump Small': 1,
  'Demo - Skid Stump Medium': 2,
  'Demo - Skid Stump Large': 3,
  'Demo - Skid Stump XL': 4,
  'Demo - Skid Tree Small': 1,
  'Demo - Skid Tree Medium': 2,
  'Demo - Skid Tree Large': 3,
  'Demo - Skid Tons SF-in Denominator': 150,
  'Demo - Skid Concrete Weight lb/cf': 150,
  'Demo - Skid Difficulty Ratio': 1,
  'Demo - Skid Import Base Labor Mult': 0.5,
  'Demo - Skid Tree CY Factor': 1,
  'Demo - Skid Steer Haul Sec/Ft': 1,
  'Demo - Skid Steer Load (CY)': 1,
  ...over,
})
const fullMat = (over = {}) => ({
  'Demo - Skid Container (Low-Boy)': 500,
  'Demo - Skid Container Capacity (CY)': 12,
  'Demo - Skid Removal Swell': 1.3,
  'Demo - Skid Import Base $/10cy': 300,
  'Demo - Skid Dump - Concrete': 0,
  'Demo - Skid Dump - Dirt': 0,
  'Demo - Skid Dump - Green Waste': 0,
  ...over,
})
const fullSub = (over = {}) => ({
  'Sub Grade - Skid Cut SF': 1.75,
  'Sub Grade - Skid Fill SF': 1.5,
  'Sub Grade - Skid JJ SF': 1,
  'Sub Grade - Skid Sheepsfoot SF': 5,
  'Sub Grade - Skid Roll SF': 4,
  'Sub Grade - Skid SS Compact SF': 3,
  'Sub Stump - Skid Small': 100,
  'Sub Stump - Skid Medium': 200,
  'Sub Stump - Skid Large': 300,
  'Sub Stump - Skid XL': 400,
  'Sub Tree - Skid Small': 350,
  'Sub Tree - Skid Medium': 1200,
  'Sub Tree - Skid Large': 2800,
  ...over,
})
const LRPH = 75
const run = (state, lr = fullRates(), mp = fullMat(), sr = fullSub()) =>
  calcDemo({ difficulty: 0, hoursAdj: 0, distanceLF: 0, ...state }, LRPH, mp, lr, 0.35, sr, 500, null, 0.3, 0.05)

const finiteNums = obj => {
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'number') assert.ok(Number.isFinite(v), `${k} not finite: ${v}`)
  }
}

test('value: concrete hrs = (SF/100) × depth × rate (100 SF × 4in × 0.5 = 2 hrs → $150)', () => {
  const r = run({ dumpType: 'In House', concSF: 100, concDepth: 4 })
  assert.equal(r.conc.hours, 2, `conc.hours got ${r.conc.hours}`)
  assert.equal(r.laborCost, 2 * LRPH, `laborCost got ${r.laborCost}`)
  finiteNums(r)
})

test('units: labor is hrs-per-unit — doubling depth doubles hours (no production divide)', () => {
  const shallow = run({ dumpType: 'In House', concSF: 100, concDepth: 4 })
  const deep = run({ dumpType: 'In House', concSF: 100, concDepth: 8 })
  assert.equal(deep.laborCost, shallow.laborCost * 2, 'depth 4→8 doubles hours')
})

test('edit-reflects: raising the concrete SF rate RAISES hours (multiply model)', () => {
  const slow = run({ dumpType: 'In House', concSF: 100, concDepth: 4 }, fullRates({ 'Demo - Skid - Concrete SF': 0.5 }))
  const fast = run({ dumpType: 'In House', concSF: 100, concDepth: 4 }, fullRates({ 'Demo - Skid - Concrete SF': 1.0 }))
  assert.equal(fast.laborCost, slow.laborCost * 2, 'rate ×2 → hours ×2 (opposite of a CF/hr model)')
})

test('unpriced / no-fallback: an unset labor rate resolves to 0, not a hidden constant', () => {
  const r = run({ dumpType: 'In House', concSF: 100, concDepth: 4 }, fullRates({ 'Demo - Skid - Concrete SF': 0 }))
  assert.equal(r.conc.hours, 0, 'unset rate → 0 hours (no code fallback)')
  assert.equal(r.laborCost, 0, 'concrete-only with unset rate → $0 labor')
})

test('sub value: grading Cut is per-SF (100 SF × $1.75 = $175)', () => {
  const r = run({ dumpType: 'Subcontractor', subGradeCutSF: 100 })
  assert.equal(r.subGradingCost, 175, `subGradingCost got ${r.subGradingCost}`)
})

test('sub value: tree priced per each by size (2× Large @ $2800 = $5600)', () => {
  const r = run({ dumpType: 'Subcontractor', subTreeRows: [{ qty: 2, size: '18" - 24"' }] })
  assert.equal(r.subTreeCost, 5600, `subTreeCost got ${r.subTreeCost}`)
})

test('sub-independence: In-House and Sub track only their own inputs', () => {
  const ih = run({ dumpType: 'In House', concSF: 100, concDepth: 4 })
  const ihMore = run({ dumpType: 'In House', concSF: 200, concDepth: 4 })
  assert.ok(ihMore.laborCost > ih.laborCost, 'In-House labor tracks concSF')
  const sub = run({ dumpType: 'Subcontractor', subGradeCutSF: 100 })
  const subMore = run({ dumpType: 'Subcontractor', subGradeCutSF: 200 })
  assert.ok(subMore.subGradingCost > sub.subGradingCost, 'Sub grading tracks its own SF')
  // Cross-independence: In-House concSF must not move sub grading.
  const subWithConc = run({ dumpType: 'Subcontractor', subGradeCutSF: 100, concSF: 9999, concDepth: 12 })
  assert.equal(subWithConc.subGradingCost, sub.subGradingCost, 'In-House input does not leak into Sub')
})
