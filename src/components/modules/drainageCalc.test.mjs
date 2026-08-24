// Acceptance tests for the pure Drainage calc (no network).
//   Trench: hrs = cf × rate, cf = LF × (W/12) × (D/12) (hours per Cu Ft), name-keyed.
//   Pipe/french MATERIAL + per-LF LABOR resolve from the catalog (vendor-first, via the
//   item's calc_meta.labor_rate) — a typed row with no resolvable labor flags itself in
//   `laborUnset` and adds $0 (NO-FALLBACK). laborCost = totalHrs × lrph (no walk/diff).
// Run: node --test src/components/modules/drainageCalc.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { calcDrainage } from './drainageCalc.js'

const LRPH = 75
const base = { difficulty: 0, hoursAdj: 0, trenchRows: [], pipeRows: [], fixtureRows: [], frenchRows: [], additionalItems: {}, manualRows: [], distanceLF: 0 }
// calcDrainage(state, lrph, materialPrices, gpmd, walkAccess, laborBurdenPct, subRates, subMarkupRate, materialRows, catDefaults, commissionRate)
const run = (state, mp = {}, materialRows = []) =>
  calcDrainage({ ...base, ...state }, LRPH, mp, 500, null, 0.3, {}, 0.35, materialRows, {}, 0.05)

const finiteNums = obj => {
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'number') assert.ok(Number.isFinite(v), `${k} not finite: ${v}`)
  }
}

test('trench value: hrs = cf × rate (100 LF × 6in × 24in = 100 CF × 0.1 = 10 hrs → $750)', () => {
  const r = run({ trenchRows: [{ lf: 100, width: 6, depth: 24, equipment: 'Trench' }] }, { 'Drainage Trench Excavation': 0.1 })
  assert.equal(r.totalHrs, 10, `totalHrs got ${r.totalHrs}`)
  assert.equal(r.laborCost, 10 * LRPH, `laborCost got ${r.laborCost}`)
  finiteNums(r)
})

test('trench units: doubling depth doubles Cu Ft → doubles hours', () => {
  const a = run({ trenchRows: [{ lf: 100, width: 6, depth: 24, equipment: 'Trench' }] }, { 'Drainage Trench Excavation': 0.1 })
  const b = run({ trenchRows: [{ lf: 100, width: 6, depth: 48, equipment: 'Trench' }] }, { 'Drainage Trench Excavation': 0.1 })
  assert.equal(b.totalHrs, a.totalHrs * 2, 'depth 24→48 doubles hours')
})

test('trench edit-reflects: raising the excavation rate raises labor proportionally', () => {
  const a = run({ trenchRows: [{ lf: 100, width: 6, depth: 24, equipment: 'Trench' }] }, { 'Drainage Trench Excavation': 0.1 })
  const b = run({ trenchRows: [{ lf: 100, width: 6, depth: 24, equipment: 'Trench' }] }, { 'Drainage Trench Excavation': 0.2 })
  assert.equal(b.laborCost, a.laborCost * 2, 'rate ×2 → labor ×2')
})

test('trench equipment independence: Trench vs Hand read different rate keys', () => {
  const t = run({ trenchRows: [{ lf: 100, width: 6, depth: 24, equipment: 'Trench' }] }, { 'Drainage Trench Excavation': 0.1, 'Drainage Hand Excavation': 0.5 })
  const h = run({ trenchRows: [{ lf: 100, width: 6, depth: 24, equipment: 'Hand' }] }, { 'Drainage Trench Excavation': 0.1, 'Drainage Hand Excavation': 0.5 })
  assert.equal(t.totalHrs, 10, 'Trench uses the Trench rate')
  assert.equal(h.totalHrs, 50, 'Hand uses the Hand rate (independent)')
})

test('trench no-fallback: unset excavation rate → 0 hours (no hidden constant)', () => {
  const r = run({ trenchRows: [{ lf: 100, width: 6, depth: 24, equipment: 'Trench' }] }, {})
  assert.equal(r.totalHrs, 0, 'unset rate → 0 hours')
})

test('unpriced / NO-FALLBACK: a typed pipe row with no resolvable labor → flagged in laborUnset and $0', () => {
  // Pipe labor rides the catalog item's calc_meta.labor_rate (vendor-first). With no
  // catalog row it can't resolve → it must surface in the `laborUnset` fix-it list and
  // add 0 hours — never a hidden constant.
  const r = run({ pipeRows: [{ type: '4" SDR 35', lf: 100 }] }, {}, [])
  assert.ok((r.laborUnset || []).length > 0, `expected a laborUnset entry; got ${JSON.stringify(r.laborUnset)}`)
  assert.equal(r.laborCost, 0, 'unresolved pipe labor → $0')
})

test('M5 ref_key parity: a pipe row picked by material ref_key resolves the same material + labor as by name', () => {
  const rows = [{
    id: 'd1', ref_key: 'MAT-410-4-sdr-35', name: '4" SDR 35',
    sub_category: 'Drain Pipe', category: 'Drainage', vendor_id: null,
    unit_cost: 3, calc_meta: { labor_rate: '4" SDR 35 - Labor Rate' },
  }]
  const mp = { '4" SDR 35 - Labor Rate': 0.2 }
  const byName = run({ pipeRows: [{ vendor: 'Standard', type: '4" SDR 35', lf: 100 }] }, mp, rows)
  const byRef = run({ pipeRows: [{ vendor: 'Standard', type: 'MAT-410-4-sdr-35', lf: 100 }] }, mp, rows)
  // Only a pipe row is entered, so totalMat = pipe material, totalHrs = pipe labor.
  assert.equal(byRef.totalMat, byName.totalMat, `material should match; got ${byRef.totalMat} vs ${byName.totalMat}`)
  assert.equal(byRef.totalMat, 300, `100 Ln Ft × $3 = $300; got ${byRef.totalMat}`)
  assert.equal(byRef.totalHrs, byName.totalHrs, 'labor identical regardless of key form')
  assert.equal(byRef.totalHrs, 20, `100 × 0.2 = 20 hrs; got ${byRef.totalHrs}`)
})

test('no NaN across a populated estimate (trench + pipe)', () => {
  const r = run(
    { trenchRows: [{ lf: 80, width: 6, depth: 18, equipment: 'Trench' }], pipeRows: [{ type: '4" SDR 35', lf: 80 }] },
    { 'Drainage Trench Excavation': 0.1 }
  )
  finiteNums(r)
  assert.ok(r.price >= 0, 'price is a non-negative number')
})
