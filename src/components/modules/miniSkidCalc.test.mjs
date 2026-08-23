// Acceptance tests for the Mini Steer Demo calc (pure, no network).
//   In-House labor model: hrs = (SF / 100) × depth_in × rate  (a MULTIPLY — higher
//   rate ⇒ more hours; hrs-per-unit, no production-rate divide). totalHrs (diff=1,
//   no walk) → laborCost = totalHrs × lrph. Sub grading is per-SF; sub tree per-each.
//   Reads 'Mini - …' rate keys, independent of Hand/Mini.
// Run: node --test src/components/modules/skidSteerCalc.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { calcDemo } from './miniSkidCalc.js'

const fullRates = (over = {}) => ({
  'Mini - Concrete': 0.5,        // hrs / Cu Yd
  'Mini - Soil': 0.4,            // hrs / Cu Yd
  'Mini - Footing': 0.9,         // hrs / Cu Ft
  'Mini - Misc Flat': 1.25,      // hrs / Cu Yd
  'Mini - Misc Vertical': 0.845, // hrs / Cu Yd
  'Mini - Grade Cut': 0.03,      // hrs / Cu Ft
  'Mini - Grade Fill': 0.03,     // hrs / Cu Ft
  'BAS-003-import-base-mini-skid-steer': 0.035,   // hrs / Cu Ft
  'Mini - Compaction': 0.01,     // hrs / Cu Ft
  'BAS-006-jumping-jack': 0.04, // shared, hrs / Cu Ft
  'BAS-007-difficulty-ratio': 1, // shared
  'Mini - Grass SF': 0.02, // hrs / Cu Ft
  'Mini - Skid Steer Grass': 0.3,
  'Mini - Shrubs 0-1 ft': 0.09, 'Mini - Shrubs 1-2 ft': 0.12, 'Mini - Shrubs 2-3 ft': 0.18,
  'Mini - Shrubs 3-4 ft': 0.24, 'Mini - Shrubs 4-5 ft': 0.3,
  'Mini - Stump Small': 1, 'Mini - Stump Medium': 2, 'Mini - Stump Large': 3, 'Mini - Stump XL': 4,
  'Mini - Tree Small': 1, 'Mini - Tree Medium': 2, 'Mini - Tree Large': 3,
  'BAS-008-concrete-weight-lb-cf': 150,
  'Mini - Haul Sec/Ft': 1,
  'Mini - Load (CY)': 1,
  ...over,
})
const fullMat = (over = {}) => ({
  'Tons SF-in Denominator': 150,
  'Container (Low-Boy)': 500,
  'Container Capacity (CY)': 12,
  'Removal Swell': 1.3,
  'Import Base $/10cy': 300,
  'Dump Fee - Concrete': 0,
  'Dump Fee - Dirt': 0,
  'Dump Fee - Green Waste': 0,
  ...over,
})
const fullSub = (over = {}) => ({
  'Sub Grade - Mini Cut SF': 1.75,
  'Sub Grade - Mini Fill SF': 1.5,
  'Sub Grade - Mini JJ SF': 1,
  'Sub Grade - Mini Sheepsfoot SF': 5,
  'Sub Grade - Mini Roll SF': 4,
  'Sub Grade - Mini SS Compact SF': 3,
  'Sub Stump - Mini Small': 100,
  'Sub Stump - Mini Medium': 200,
  'Sub Stump - Mini Large': 300,
  'Sub Stump - Mini XL': 400,
  'Sub Tree - Mini Small': 350,
  'Sub Tree - Mini Medium': 1200,
  'Sub Tree - Mini Large': 2800,
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

test('value: concrete hrs = Cu Yd × rate (270 SF × 12in = 10 CY × 0.5 = 5 hrs → $375)', () => {
  const r = run({ dumpType: 'In House', concSF: 270, concDepth: 12 })
  assert.equal(r.conc.hours, 5, `conc.hours got ${r.conc.hours}`)
  assert.equal(r.laborCost, 5 * LRPH, `laborCost got ${r.laborCost}`)
  finiteNums(r)
})

test('rebar/mesh toggle: +30% to concrete labor (5 → 6.5 hrs)', () => {
  const off = run({ dumpType: 'In House', concSF: 270, concDepth: 12 })
  const on = run({ dumpType: 'In House', concSF: 270, concDepth: 12, rebar: true })
  assert.equal(on.conc.hours, 6.5, `rebar concrete hrs got ${on.conc.hours}`)
})

test('edit-reflects: raising the concrete rate RAISES hours (multiply model)', () => {
  const slow = run({ dumpType: 'In House', concSF: 270, concDepth: 12 }, fullRates({ 'Mini - Concrete': 0.5 }))
  const fast = run({ dumpType: 'In House', concSF: 270, concDepth: 12 }, fullRates({ 'Mini - Concrete': 1.0 }))
  assert.equal(fast.laborCost, slow.laborCost * 2, 'rate ×2 → hours ×2')
})

test('unpriced / no-fallback: an unset labor rate resolves to 0, not a hidden constant', () => {
  const r = run({ dumpType: 'In House', concSF: 270, concDepth: 12 }, fullRates({ 'Mini - Concrete': 0 }))
  assert.equal(r.conc.hours, 0, 'unset rate → 0 hours (no code fallback)')
  assert.equal(r.laborCost, 0, 'concrete-only with unset rate → $0 labor')
})

test('value: footing hrs = Cu Ft × rate (27 LF × 12in × 12in = 27 CF × 0.9 = 24.3 hrs)', () => {
  const r = run({ dumpType: 'In House', footingRows: [{ lf: 27, heightIn: 12, widthIn: 12 }] })
  assert.equal(r.footingCalc[0].hours, 24.3, `footing hours got ${r.footingCalc[0].hours}`)
})

test('value: grade cut hrs = Cu Ft × rate (300 SF × 12in = 300 CF × 0.03 = 9 hrs)', () => {
  const r = run({ dumpType: 'In House', gradeCutSF: 300, gradeCutDepth: 12 })
  assert.equal(r.gradeCut.hours, 9, `grade cut hours got ${r.gradeCut.hours}`)
})

test('value: import base hrs = Cu Ft × rate (100 SF × 12in = 100 CF × 0.035 = 3.5 hrs)', () => {
  const r = run({ dumpType: 'In House', baseSF: 100, baseDepth: 12 })
  assert.ok(Math.abs(r.base.hours - 3.5) < 1e-9, `import base hours got ${r.base.hours}`)
})

test('value: misc flat hrs = Cu Yd × rate (270 SF × 12in = 10 CY × 1.25 = 12.5 hrs)', () => {
  const r = run({ dumpType: 'In House', miscFlatRows: [{ sf: 270, depth: 12 }] })
  assert.equal(r.miscFlatCalc[0].hours, 12.5, `misc flat hours got ${r.miscFlatCalc[0].hours}`)
})

test('value: grade fill hrs = Cu Ft × rate (300 SF × 12in = 300 CF × 0.03 = 9 hrs)', () => {
  const r = run({ dumpType: 'In House', gradeFillSF: 300, gradeFillDepth: 12 })
  assert.equal(r.gradeFill.hours, 9, `grade fill hours got ${r.gradeFill.hours}`)
})

test('value: grass hrs = Cu Ft × rate (300 SF × 12in = 300 CF × 0.02 = 6 hrs)', () => {
  const r = run({ dumpType: 'In House', grassSF: 300, grassDepth: 12 })
  assert.equal(r.grass.hours, 6, `grass hours got ${r.grass.hours}`)
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
