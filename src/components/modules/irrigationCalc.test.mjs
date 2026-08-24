// Acceptance tests for the pure Irrigation calc (no network).
//   Zone labor: hrs = qty(zones) × per-zone rate (Trench vs Hand read different DB keys).
//   Timer labor: hrs = qty × 'LAB-262-irrigation-timer-install'. All rates hrs-per-unit.
//   Material (zone BOM + timer) resolves live (vendor-first → Standard); an unpriced
//   BOM line surfaces in the row's `missing` list and adds $0 (NO-FALLBACK, no constant).
//   Sub tab: flat $/unit only, zero labor hours, cost routed into subCost.
// Run: node --test src/components/modules/irrigationCalc.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { calcIrrigation, TIMER_TYPES } from './irrigationCalc.js'

const LRPH = 75
const base = { difficulty: 0, hoursAdj: 0, distanceLF: 0, zoneRows: [], timerRows: [], manualRows: [], subType: 'In House' }
// calcIrrigation(state, lrph, materialPrices, laborRates, salesTax, gpmd, walkAccess, laborBurdenPct, materialRows, commissionRate)
const run = (state, lr = {}, mp = {}, materialRows = []) =>
  calcIrrigation({ ...base, ...state }, LRPH, mp, lr, 0.095, 500, null, 0.3, materialRows, 0.05)

const finiteNums = obj => {
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'number') assert.ok(Number.isFinite(v), `${k} not finite: ${v}`)
  }
}

test('zone labor value: hrs = qty × per-zone rate (2 lawn zones × 3 hrs = 6 hrs → $450)', () => {
  const r = run({ zoneRows: [{ type: 'lawn', qty: 2, mode: 'Trench' }] }, { 'LAB-253-irrigation-lawn-trench': 3 })
  assert.equal(r.zoneHrs, 6, `zoneHrs got ${r.zoneHrs}`)
  assert.equal(r.totalHrs, 6, `totalHrs got ${r.totalHrs}`)
  assert.equal(r.laborCost, 6 * LRPH, `laborCost got ${r.laborCost}`)
  finiteNums(r)
})

test('zone edit-reflects: raising the per-zone rate raises labor proportionally', () => {
  const a = run({ zoneRows: [{ type: 'lawn', qty: 2, mode: 'Trench' }] }, { 'LAB-253-irrigation-lawn-trench': 3 })
  const b = run({ zoneRows: [{ type: 'lawn', qty: 2, mode: 'Trench' }] }, { 'LAB-253-irrigation-lawn-trench': 6 })
  assert.equal(b.laborCost, a.laborCost * 2, 'rate ×2 → labor ×2')
})

test('zone mode independence: Trench vs Hand read different rate keys', () => {
  const rates = { 'LAB-253-irrigation-lawn-trench': 3, 'LAB-252-irrigation-lawn-hand': 9 }
  const t = run({ zoneRows: [{ type: 'lawn', qty: 1, mode: 'Trench' }] }, rates)
  const h = run({ zoneRows: [{ type: 'lawn', qty: 1, mode: 'Hand' }] }, rates)
  assert.equal(t.zoneHrs, 3, 'Trench uses the Trench rate')
  assert.equal(h.zoneHrs, 9, 'Hand uses the Hand rate (independent)')
})

test('timer labor value: hrs = qty × Timer Install rate (2 × 1.5 = 3 hrs → $225)', () => {
  const r = run({ timerRows: [{ type: 'timer4', qty: 2 }] }, { 'LAB-262-irrigation-timer-install': 1.5 })
  assert.equal(r.timerLaborHrs, 3, `timerLaborHrs got ${r.timerLaborHrs}`)
  assert.equal(r.laborCost, 3 * LRPH, `laborCost got ${r.laborCost}`)
})

test('timer MATERIAL value: a priced timer resolves material by its catalog description key (2 × $200 = $400 raw)', () => {
  // Regression guard for the "controllers add no material" bug: the timer material is
  // an exact-string lookup of matKey in the Standard price map (materialPrices), which is
  // keyed by the catalog item's `description` = 'Timer - N Station' (sub_category
  // Controllers) — NOT 'Irrigation Timer - N Station'. A mismatched key silently yields $0.
  // Production price map is dual-keyed by ref_key + name (M7); the timer material now
  // reads by its frozen ref_key first (MAT-209-timer-4-station).
  const r = run({ timerRows: [{ vendor: 'Standard', type: 'timer4', qty: 2 }] }, { 'LAB-262-irrigation-timer-install': 1 }, { 'Timer - 4 Station': 200, 'MAT-209-timer-4-station': 200 })
  assert.equal(r.rawMat, 400, `timer rawMat got ${r.rawMat} — timer material did not resolve`)
  assert.ok(r.totalMat > r.rawMat, 'sales tax is applied on top of raw timer material')
})

test('timer matKey contract: every matKey is the bare catalog form "Timer - …" (no "Irrigation " prefix)', () => {
  // The estimator prices timers by exact match against material.description in the
  // Controllers sub_category. If a future edit re-adds the 'Irrigation ' prefix, the
  // lookup breaks and every controller silently prices at $0 — so lock the format here.
  for (const t of TIMER_TYPES) {
    assert.ok(/^Timer - /.test(t.matKey), `matKey must start with "Timer - ": ${t.matKey}`)
    assert.ok(!/^Irrigation Timer/.test(t.matKey), `matKey must NOT carry the 'Irrigation ' prefix: ${t.matKey}`)
  }
})

test('labor no-fallback: unset zone/timer rates → 0 hours (no hidden constant)', () => {
  const z = run({ zoneRows: [{ type: 'lawn', qty: 2, mode: 'Trench' }] }, {})
  assert.equal(z.zoneHrs, 0, 'unset zone rate → 0 hours')
  const t = run({ timerRows: [{ type: 'timer4', qty: 2 }] }, {})
  assert.equal(t.timerLaborHrs, 0, 'unset timer rate → 0 hours')
})

test('unpriced / NO-FALLBACK: a zone with no resolvable BOM prices flags every line in `missing` and adds $0', () => {
  const r = run({ zoneRows: [{ type: 'lawn', qty: 1, mode: 'Trench' }] }, { 'LAB-253-irrigation-lawn-trench': 3 }, {}, [])
  const row = r.zoneCalc[0]
  assert.ok((row.missing || []).length > 0, `expected missing BOM lines; got ${JSON.stringify(row.missing)}`)
  assert.equal(row.unitPrice, 0, 'no resolvable price → $0 unit (no constant)')
  assert.equal(r.rawMat, 0, 'unpriced material → $0 (no hidden fallback)')
})

test('sub tab: flat $/unit only, zero labor hours, cost routed into subCost', () => {
  const r = run({ subType: 'Subcontractor', zoneRows: [{ type: 'lawn', qty: 2, mode: 'Trench', subEach: 100 }] }, { 'LAB-253-irrigation-lawn-trench': 3 })
  assert.equal(r.totalHrs, 0, 'sub tab has no labor hours')
  assert.equal(r.laborCost, 0, 'sub tab has no labor cost')
  assert.equal(r.subCost, 200, `subCost = 2 × $100 = $200; got ${r.subCost}`)
  finiteNums(r)
})

test('material NO-FALLBACK surfacing: unpriced zone BOM + unpriced timer flag in matUnset (In-House)', () => {
  // Silent-$0 twin of the Lighting fix: a picked zone with no resolvable BOM price and a
  // selected timer with no material price both add $0 AND must surface in `matUnset` so the
  // module can prompt (name-based → saveStandardNamedRate write-back).
  const r = run(
    { zoneRows: [{ type: 'lawn', qty: 1, mode: 'Trench' }], timerRows: [{ vendor: 'Standard', type: 'timer4', qty: 1 }] },
    { 'LAB-253-irrigation-lawn-trench': 3, 'LAB-262-irrigation-timer-install': 1 },
    {},
    []
  )
  assert.ok((r.matUnset || []).length > 0, `expected matUnset entries; got ${JSON.stringify(r.matUnset)}`)
  assert.ok(r.matUnset.some(u => u.name === 'Timer - 4 Station'), 'unpriced timer material flagged')
  assert.ok(r.matUnset.some(u => /PIPE|VALVE|WIRE|NOZZLE/i.test(u.name || '')), 'unpriced zone BOM line flagged')
})

test('material matUnset is empty on the Sub tab (flat pricing, not catalog-resolved)', () => {
  const r = run(
    { subType: 'Subcontractor', zoneRows: [{ type: 'lawn', qty: 1, mode: 'Trench', subEach: 50 }], timerRows: [{ type: 'timer4', qty: 1, subEach: 100 }] },
    { 'LAB-253-irrigation-lawn-trench': 3 },
    {},
    []
  )
  assert.deepEqual(r.matUnset || [], [], 'Sub tab does not surface material-unpriced prompts')
})

test('labor unpriced: an unset zone/timer labor rate surfaces ONLY when that section is in use (In-House)', () => {
  const laborItems = obj => (obj.matUnset || []).filter(u => u.kind === 'labor')
  // Zone in use but its labor rate unset → surfaces (kind:'labor').
  const usedZone = run({ zoneRows: [{ type: 'lawn', qty: 2, mode: 'Trench' }] }, {})
  assert.ok(laborItems(usedZone).some(u => /lawn/i.test(u.label || u.name || '')), 'zone labor surfaces when zone qty > 0')
  // Timer in use but its labor rate unset → surfaces.
  const usedTimer = run({ timerRows: [{ type: 'timer4', qty: 2 }] }, {})
  assert.ok(laborItems(usedTimer).some(u => /timer/i.test(u.label || u.name || '')), 'timer labor surfaces when timer qty > 0')
  // Nothing in use → no labor flags.
  const none = run({}, {})
  assert.equal(laborItems(none).length, 0, 'no labor flags when nothing is in use')
  // Sub tab never flags labor.
  const sub = run({ subType: 'Subcontractor', zoneRows: [{ type: 'lawn', qty: 2, mode: 'Trench' }] }, {})
  assert.equal(laborItems(sub).length, 0, 'sub tab never flags labor')
})

test('no NaN across a populated estimate (zones + timers + manual)', () => {
  const r = run(
    {
      zoneRows: [{ type: 'lawn', qty: 2, mode: 'Trench' }],
      timerRows: [{ type: 'timer4', qty: 1 }],
      manualRows: [{ hours: 4, materials: 50, subCost: 0 }],
      distanceLF: 120,
    },
    { 'LAB-253-irrigation-lawn-trench': 3, 'LAB-262-irrigation-timer-install': 1.5 }
  )
  finiteNums(r)
  assert.ok(r.price >= 0, 'price is a non-negative number')
  assert.ok(r.walkHrs > 0, 'walk-access penalty applies when distanceLF > 0')
})
