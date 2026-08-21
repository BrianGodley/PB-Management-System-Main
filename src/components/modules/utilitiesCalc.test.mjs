// Acceptance tests for the pure Utilities calc (no network). Utilities is the CANONICAL
// ("King") trench source — lib/trench math is shared with Fire Pit / OK / Pool, so these
// lock it once for all of them. Trench: hrs = cf × rate, cf = LF × (W/12) × (D/12), rate
// is HOURS per Cu Ft (category 'Utilities'). Line/gas/elec rows resolve material + per-LF
// labor via resolveUtilRow; an unset labor pushes to `laborUnset` (the fix-it flag) and
// contributes $0 — the shared no-fallback behavior.
// Run: node --test src/components/modules/utilitiesCalc.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { calcUtilities } from './utilitiesCalc.js'

const LRPH = 75
// calcUtilities(state, lrph, materialPrices, gpmd, walkAccess, laborBurdenPct, materialRows, catDefaults, commissionRate)
const base = { difficulty: 0, hoursAdj: 0, trenchRows: [], lineRows: [], gasPipeRows: [], wireRows: [], fixtureRows: [], elecFixtureRows: [], sewerLineRows: [], additionalItems: {}, manualRows: [], distanceLF: 0 }
const run = (state, mp = {}, materialRows = []) =>
  calcUtilities({ ...base, ...state }, LRPH, mp, 500, null, 0.3, materialRows, {}, 0.05)

const finiteNums = obj => {
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'number') assert.ok(Number.isFinite(v), `${k} not finite: ${v}`)
  }
}

test('TRENCH KING value: hrs = cf × rate (100 LF × 6in × 24in = 100 CF × 0.1 = 10 hrs → $750)', () => {
  const r = run(
    { trenchRows: [{ lf: 100, width: 6, depth: 24, equipment: 'Trench' }] },
    { 'Utilities Trench Excavation': 0.1 }
  )
  assert.equal(r.trenchHrs, 10, `trenchHrs got ${r.trenchHrs}`)
  assert.equal(r.laborCost, 10 * LRPH, `laborCost got ${r.laborCost}`)
  finiteNums(r)
})

test('trench units: doubling depth doubles Cu Ft → doubles hours (hrs-per-CF multiply)', () => {
  const a = run({ trenchRows: [{ lf: 100, width: 6, depth: 24, equipment: 'Trench' }] }, { 'Utilities Trench Excavation': 0.1 })
  const b = run({ trenchRows: [{ lf: 100, width: 6, depth: 48, equipment: 'Trench' }] }, { 'Utilities Trench Excavation': 0.1 })
  assert.equal(b.trenchHrs, a.trenchHrs * 2, 'depth 24→48 doubles CF and hours')
})

test('trench edit-reflects: raising the excavation rate raises hours proportionally', () => {
  const a = run({ trenchRows: [{ lf: 100, width: 6, depth: 24, equipment: 'Trench' }] }, { 'Utilities Trench Excavation': 0.1 })
  const b = run({ trenchRows: [{ lf: 100, width: 6, depth: 24, equipment: 'Trench' }] }, { 'Utilities Trench Excavation': 0.2 })
  assert.equal(b.trenchHrs, a.trenchHrs * 2, 'rate ×2 → hours ×2')
})

test('trench equipment independence: Trench vs Hand read different rate keys', () => {
  const t = run({ trenchRows: [{ lf: 100, width: 6, depth: 24, equipment: 'Trench' }] }, { 'Utilities Trench Excavation': 0.1, 'Utilities Hand Excavation': 0.5 })
  const h = run({ trenchRows: [{ lf: 100, width: 6, depth: 24, equipment: 'Hand' }] }, { 'Utilities Trench Excavation': 0.1, 'Utilities Hand Excavation': 0.5 })
  assert.equal(t.trenchHrs, 10, 'Trench uses the Trench rate')
  assert.equal(h.trenchHrs, 50, 'Hand uses the Hand rate (independent)')
})

test('trench no-fallback: an unset excavation rate → 0 hours (no hidden constant)', () => {
  const r = run({ trenchRows: [{ lf: 100, width: 6, depth: 24, equipment: 'Trench' }] }, {})
  assert.equal(r.trenchHrs, 0, 'unset rate → 0 trench hours')
})

test('unpriced / NO-FALLBACK: a line row with no resolvable labor → flagged in laborUnset and $0', () => {
  // Vendor selected but no catalog match → labor resolves 0; it must surface in the
  // shared `laborUnset` fix-it list (same behavior Fire Pit / OK / Pool inherit) and
  // add $0 hours — never a hidden constant.
  const r = run({ lineRows: [{ vendor: 'Standard', type: 'Mystery Line', lf: 10 }] }, {}, [])
  assert.ok((r.laborUnset || []).length > 0, `expected a laborUnset entry; got ${JSON.stringify(r.laborUnset)}`)
  assert.equal(r.lineHrs, 0, 'unresolved line labor contributes 0 hours')
})

test('no NaN across a populated estimate (trench + a line row)', () => {
  const r = run(
    {
      trenchRows: [{ lf: 80, width: 6, depth: 18, equipment: 'Trench' }],
      lineRows: [{ vendor: 'Standard', type: 'X', lf: 20 }],
    },
    { 'Utilities Trench Excavation': 0.1 },
    []
  )
  finiteNums(r)
  assert.ok(r.price >= 0, 'price is a non-negative number')
})
