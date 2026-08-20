// Acceptance tests for the extracted Hand Demo calc (handDemoCalc.js). Locks:
//   • the extraction is faithful — a representative estimate computes a finite price
//     with NO NaN/Infinity anywhere in the result,
//   • rate edits flow through (View Rates → estimate),
//   • In-House and Subcontractor are independent calculators (each responds only to
//     its own inputs).
// Pure calc, no network. Run: node --test src/components/modules/handDemoCalc.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { calcDemo } from './handDemoCalc.js'

// Every Demo labor/misc coefficient the calc reads → a nonzero value (avoids
// div-by-zero and lets each line produce hours). Denominators stay > 0.
const RATE_KEYS = [
  'Demo - Hand - Concrete SF', 'Demo - Hand - Dirt SF', 'Demo - Hand - Footing SF',
  'Demo - Hand - Grade Cut SF', 'Demo - Hand - Grade Fill SF', 'Demo - Hand - Grass SF',
  'Demo - Hand - Import Base SF', 'Demo - Hand - JJ SF', 'Demo - Hand - Misc Flat SF',
  'Demo - Hand - Misc Vert SF', 'Demo - Hand Bucket Labor Mult', 'Demo - Hand Bucket',
  'Demo - Hand Concrete Weight lb/cf', 'Demo - Hand Concrete/Dirt', 'Demo - Hand Difficulty Ratio',
  'Demo - Hand Grass', 'Demo - Hand Haul Sec/Ft', 'Demo - Hand Import Base Labor Mult',
  'Demo - Hand Import Base', 'Demo - Hand JJ Compaction', 'Demo - Hand Load (CY)',
  'Demo - Hand Rebar Install', 'Demo - Hand Rebar', 'Demo - Hand Shrub',
  'Demo - Hand Stump Large', 'Demo - Hand Stump Medium', 'Demo - Hand Stump Small',
  'Demo - Hand Stump XL', 'Demo - Hand Tons SF-in Denominator', 'Demo - Hand Tree CY Factor',
  'Demo - Hand Tree Large', 'Demo - Hand Tree Medium', 'Demo - Hand Tree Small',
]
const fullRates = (over = {}) => ({ ...Object.fromEntries(RATE_KEYS.map(k => [k, 1])), ...over })

// Demo MATERIAL prices. Container Capacity is a divisor in the container-count math,
// so it must be priced (> 0) — as it always is in prod. (An unset capacity making the
// calc emit NaN is a known fragility, logged as a follow-up.)
const fullMat = (over = {}) => ({
  'Demo - Hand Container (Low-Boy)': 500,
  'Demo - Hand Container Capacity (CY)': 12,
  'Demo - Hand Removal Swell': 1.25,
  'Demo - Hand Import Base $/10cy': 300,
  ...over,
})

// Subcontractor rates (subcontractor_rates, category Demo) — the Sub tab's pricing.
const fullSub = (over = {}) => ({
  'Sub Grade - Hand Cut SF': 2,
  'Sub Grade - Hand Fill SF': 2,
  'Sub Grade - Hand JJ SF': 1,
  'Sub Tree - Hand 6-12': 100,
  'Sub Tree - Hand 12-18': 200,
  ...over,
})

// calcDemo(state, laborRatePerHour, materialPrices, laborRates, subMarkupRate,
//          subRates, gpmd, walkAccess, laborBurdenPct, commissionRate)
const run = (state, lr = fullRates(), mp = fullMat(), sr = fullSub()) =>
  calcDemo(state, 75, mp, lr, 0.35, sr, 500, null, 0.3, 0.05)

const finiteNums = obj => {
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'number') assert.ok(Number.isFinite(v), `${k} is not finite: ${v}`)
  }
}

test('extraction is faithful: a concrete-demo estimate computes a finite price, no NaN', () => {
  const r = run({ dumpType: 'In House', concSF: 100, concDepth: 4 })
  assert.ok(Number.isFinite(r.price), `price should be finite, got ${r.price}`)
  assert.ok(r.price > 0, `price should be > 0, got ${r.price}`)
  finiteNums(r) // no NaN/Infinity anywhere in the numeric outputs
})

test('unset container PRICE (capacity still set) → dump cost 0, finite (no NaN)', () => {
  // With capacity priced but the container price unset, the container cost resolves
  // to 0 — never a fallback and never NaN.
  const mp = fullMat({ 'Demo - Hand Container (Low-Boy)': 0 })
  const r = run({ dumpType: 'In House', concSF: 100, concDepth: 4 }, fullRates(), mp)
  assert.ok(Number.isFinite(r.totalMat), `totalMat finite, got ${r.totalMat}`)
})

test('View Rates edit reflects: raising the concrete labor rate raises the price', () => {
  const state = { dumpType: 'In House', concSF: 100, concDepth: 4 }
  const before = run(state, fullRates({ 'Demo - Hand - Concrete SF': 1 }))
  const after = run(state, fullRates({ 'Demo - Hand - Concrete SF': 2 }))
  assert.ok(after.laborConc > before.laborConc, 'laborConc should rise with the rate')
  assert.ok(after.price > before.price, `price should rise; ${before.price} -> ${after.price}`)
})

test('In-House responds to its own input (concSF)', () => {
  const a = run({ dumpType: 'In House', concSF: 100, concDepth: 4 })
  const b = run({ dumpType: 'In House', concSF: 200, concDepth: 4 })
  assert.ok(b.price > a.price, 'more concrete SF → higher In-House price')
})

test('Subcontractor is independent: responds to its own sub inputs, not In-House concSF', () => {
  const subBase = { dumpType: 'Subcontractor', subGradeCutSF: 100 }
  const a = run(subBase)
  const b = run({ ...subBase, subGradeCutSF: 200 })
  assert.ok(b.subGradingCost > a.subGradingCost, 'sub grading cost tracks sub input')
  assert.ok(b.price > a.price, 'Sub price tracks its own inputs')
  // In-House concSF must NOT change the Subcontractor price path.
  const c = run({ ...subBase, concSF: 5000, concDepth: 4 })
  assert.equal(c.subGradingCost, a.subGradingCost, 'In-House concSF must not affect sub grading')
})
