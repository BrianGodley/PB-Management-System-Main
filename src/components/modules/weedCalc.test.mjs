// Acceptance tests for the pure Weed Abatement calc (no network).
//   Labor: travelHrs = travel_rate × visits; flat/hill hrs = area × rate × visits (rates are
//   hrs per Sq Ft). Material = (area / 1000) × material$/1k × visits. All coefficients read
//   live from state.rates (labor_rates + misc_rates); a missing row ⇒ 0 (NO-FALLBACK).
//   Mode gates which area contributes (flat | hillside | mixed). Sub tab: STRICT $/SF ×
//   area × visits (+ optional flat add), zero labor hours, cost → subCost.
//
//   RED-FIRST NOTE: the pre-extraction In-House return referenced `flatPer1k`/`hillPer1k`,
//   which were never declared — a strict-mode ReferenceError. The first test below drives
//   the In-House value path; it THREW against the original calc and passes now that the
//   extraction exposes the real `flatRate`/`hillRate` coefficients.
// Run: node --test src/components/modules/weedCalc.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { calcWeed } from './weedCalc.js'

const LRPH = 75
const base = { subType: 'In-House', mode: 'flat', visits: '1', flatSF: '', hillSF: '', subRatePerSF: '', subFlat: '', rates: {} }
// calcWeed(state, laborRatePerHour, gpmd, laborBurdenPct, commissionRate)
const run = (state) => calcWeed({ ...base, ...state }, LRPH, 500, 0.3, 0.05)
const RATES = { travelHrsPerVisit: 1, flatHrsPer1k: 0.001, hillHrsPer1k: 0.002, materialPer1k: 50 }

const finiteNums = obj => {
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'number') assert.ok(Number.isFinite(v), `${k} not finite: ${v}`)
  }
}

test('In-House value path computes without throwing (regression: was a flatPer1k/hillPer1k ReferenceError)', () => {
  const r = run({ mode: 'flat', flatSF: '1000', visits: '2', rates: RATES })
  finiteNums(r) // proves the strict-mode ReferenceError is gone
  assert.equal(r.travelHrs, 2, `travelHrs got ${r.travelHrs}`) // 1 hr/visit × 2
  assert.equal(r.flatHrs, 2, `flatHrs got ${r.flatHrs}`)       // 1000 × 0.001 × 2
  assert.equal(r.totalHrs, 4, `totalHrs got ${r.totalHrs}`)
  assert.equal(r.laborCost, 4 * LRPH, `laborCost got ${r.laborCost}`)
  assert.equal(r.totalMat, 100, `totalMat got ${r.totalMat}`)  // (1000/1000) × 50 × 2
})

test('edit-reflects: raising the flat hrs/SF rate raises flat labor proportionally', () => {
  const a = run({ mode: 'flat', flatSF: '1000', visits: '1', rates: { ...RATES, travelHrsPerVisit: 0 } })
  const b = run({ mode: 'flat', flatSF: '1000', visits: '1', rates: { ...RATES, travelHrsPerVisit: 0, flatHrsPer1k: 0.002 } })
  assert.equal(b.flatHrs, a.flatHrs * 2, 'rate ×2 → flat hrs ×2')
})

test('mode independence: flat ignores hillSF; hillside ignores flatSF; mixed uses both', () => {
  const flat = run({ mode: 'flat', flatSF: '1000', hillSF: '500', visits: '1', rates: RATES })
  assert.equal(flat.hillHrs, 0, 'flat mode contributes no hillside hours')
  const hill = run({ mode: 'hillside', flatSF: '1000', hillSF: '500', visits: '1', rates: RATES })
  assert.equal(hill.flatHrs, 0, 'hillside mode contributes no flat hours')
  assert.equal(hill.hillHrs, 500 * 0.002, 'hillside uses the hillside rate')
  const mixed = run({ mode: 'mixed', flatSF: '1000', hillSF: '500', visits: '1', rates: RATES })
  assert.equal(mixed.flatHrs, 1000 * 0.001, 'mixed uses flat area')
  assert.equal(mixed.hillHrs, 500 * 0.002, 'mixed uses hillside area')
})

test('labor NO-FALLBACK: unset coefficients → 0 hours + 0 material (no hidden constant)', () => {
  const r = run({ mode: 'mixed', flatSF: '1000', hillSF: '500', visits: '2', rates: {} })
  assert.equal(r.laborHrs, 0, 'unset flat/hill rates → 0 labor hours')
  assert.equal(r.travelHrs, 0, 'unset travel rate → 0 travel hours')
  assert.equal(r.totalMat, 0, 'unset material rate → $0 material')
})

test('sub tab: STRICT $/SF × area × visits (+ flat add), zero labor hours, cost → subCost', () => {
  const r = run({ subType: 'Subcontractor', mode: 'mixed', flatSF: '600', hillSF: '400', visits: '2', subRatePerSF: '0.10', subFlat: '50', rates: RATES })
  assert.equal(r.totalHrs, 0, 'sub tab has no labor hours')
  assert.equal(r.laborCost, 0, 'sub tab has no labor cost')
  // subArea = 1000; 1000 × 0.10 × 2 = 200; + 50 flat = 250
  assert.equal(r.subCost, 250, `subCost got ${r.subCost}`)
  finiteNums(r)
})

test('no NaN across a populated In-House estimate', () => {
  const r = run({ mode: 'mixed', flatSF: '1200', hillSF: '800', visits: '3', rates: RATES })
  finiteNums(r)
  assert.ok(r.price > 0, 'price is positive with priced coefficients')
})
