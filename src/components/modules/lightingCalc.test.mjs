// Acceptance tests for the pure Lighting calc (no network).
//   Each section row picks a catalog item (material_rates, sub_category Light Fixture /
//   Transformer / Wire, vendor-first). Install labor is ITEM-DRIVEN: hrs = qty ×
//   labor_rates[item.calc_meta.labor_rate] (hrs-per-unit). Material = qty × unit_cost,
//   then × (1 + markup). Watts/VA accumulate for transformer sizing.
//   No-fallback: an item whose calc_meta.labor_rate is unset/unpriced adds 0 hrs and
//   surfaces in `laborUnset` (fix-it) — never a hidden constant.
//   Sub tab: flat $/each (sub_price_ea → unit_cost), NO labor hours, cost → subCost.
// Run: node --test src/components/modules/lightingCalc.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { calcLighting } from './lightingCalc.js'

const LRPH = 75
// One catalog fixture row: Standard (vendor_id null), sub_category 'Light Fixture',
// points its install labor at the 'Fixture Labor' rate.
const FIXTURE = {
  id: 'fix1', name: 'Path Light', sub_category: 'Light Fixture', vendor_id: null,
  unit_cost: 100, watts: 12, va: 15, sub_price_ea: 180, calc_meta: { labor_rate: 'Fixture Labor' },
}
const WIRE = {
  id: 'wire1', name: '12ga Wire', sub_category: 'Wire', vendor_id: null,
  unit_cost: 2, watts: 0, va: 0, sub_price_ea: null, calc_meta: { labor_rate: 'Wire Labor' },
}
const base = { difficulty: 0, hoursAdj: 0, distanceLF: 0, fixtureRows: [], transformerRows: [], wireRows: [], manualRows: [], subType: 'In House' }
// calcLighting(state, lrph, materialRows, gpmd, walkAccess, laborBurdenPct, priceOf, materialMarkup, commissionRate, laborRates)
const run = (state, materialRows, laborRates = {}, markup = 0) =>
  calcLighting({ ...base, ...state }, LRPH, materialRows, 500, null, 0.3, it => parseFloat(it.unit_cost) || 0, markup, 0.05, laborRates)

const finiteNums = obj => {
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'number') assert.ok(Number.isFinite(v), `${k} not finite: ${v}`)
  }
}

test('labor value: item-driven hrs = qty × calc_meta.labor_rate (3 fixtures × 1.5 hr = 4.5 hrs → $337.50)', () => {
  const r = run({ fixtureRows: [{ vendor: 'Standard', itemId: 'fix1', qty: 3 }] }, [FIXTURE], { 'Fixture Labor': 1.5 })
  assert.equal(r.totalHrs, 4.5, `totalHrs got ${r.totalHrs}`)
  assert.equal(r.laborCost, 4.5 * LRPH, `laborCost got ${r.laborCost}`)
  finiteNums(r)
})

test('material value: qty × unit_cost, and watts/VA accumulate (3 × $100 = $300 raw; 36W / 45VA)', () => {
  const r = run({ fixtureRows: [{ vendor: 'Standard', itemId: 'fix1', qty: 3 }] }, [FIXTURE], { 'Fixture Labor': 1.5 })
  assert.equal(r.rawMat, 300, `rawMat got ${r.rawMat}`)
  assert.equal(r.totalWatts, 36, `watts got ${r.totalWatts}`)
  assert.equal(r.totalVA, 45, `VA got ${r.totalVA}`)
})

test('edit-reflects: raising the item labor rate raises labor proportionally', () => {
  const a = run({ fixtureRows: [{ vendor: 'Standard', itemId: 'fix1', qty: 3 }] }, [FIXTURE], { 'Fixture Labor': 1.5 })
  const b = run({ fixtureRows: [{ vendor: 'Standard', itemId: 'fix1', qty: 3 }] }, [FIXTURE], { 'Fixture Labor': 3 })
  assert.equal(b.laborCost, a.laborCost * 2, 'rate ×2 → labor ×2')
})

test('material markup applies to raw material (15% → markedUpMat = rawMat × 1.15)', () => {
  const r = run({ fixtureRows: [{ vendor: 'Standard', itemId: 'fix1', qty: 2 }] }, [FIXTURE], { 'Fixture Labor': 1 }, 0.15)
  assert.equal(r.rawMat, 200, `rawMat got ${r.rawMat}`)
  assert.equal(Math.round(r.markedUpMat * 100) / 100, 230, `markedUpMat got ${r.markedUpMat}`)
})

test('labor no-fallback: unset item labor rate → 0 hours and a laborUnset flag (no constant)', () => {
  const r = run({ fixtureRows: [{ vendor: 'Standard', itemId: 'fix1', qty: 3 }] }, [FIXTURE], {})
  assert.equal(r.totalHrs, 0, 'unset item labor rate → 0 hours')
  assert.ok((r.laborUnset || []).some(u => u.name === 'Fixture Labor'), `expected Fixture Labor in laborUnset; got ${JSON.stringify(r.laborUnset)}`)
})

test('section independence: fixture vs wire read their own item labor keys', () => {
  const rates = { 'Fixture Labor': 1.5, 'Wire Labor': 0.2 }
  const rows = [FIXTURE, WIRE]
  const f = run({ fixtureRows: [{ vendor: 'Standard', itemId: 'fix1', qty: 2 }] }, rows, rates)
  const w = run({ wireRows: [{ vendor: 'Standard', itemId: 'wire1', qty: 100 }] }, rows, rates)
  assert.equal(f.totalHrs, 3, 'fixtures use Fixture Labor (2 × 1.5)')
  assert.equal(w.totalHrs, 20, 'wire uses Wire Labor (100 × 0.2), independent')
})

test('material NO-FALLBACK: a selected item with no price surfaces in matUnset and adds $0', () => {
  // The silent-$0 gap Brian hit with Light Craft fixtures: a picked item whose price
  // resolves to 0 must flag itself (fix-it prompt) and add $0 — never pass silently.
  const UNPRICED = { ...FIXTURE, id: 'fixU', name: 'Unpriced Fixture', unit_cost: 0 }
  const r = run({ fixtureRows: [{ vendor: 'Standard', itemId: 'fixU', qty: 3 }] }, [UNPRICED], { 'Fixture Labor': 1 })
  assert.ok((r.matUnset || []).some(u => u.materialId === 'fixU'), `expected fixU flagged in matUnset; got ${JSON.stringify(r.matUnset)}`)
  assert.equal(r.rawMat, 0, 'unpriced material → $0 (no hidden fallback)')
})

test('sub tab: flat $/each (sub_price_ea), zero labor hours, cost routed into subCost', () => {
  const r = run({ subType: 'Subcontractor', fixtureRows: [{ vendor: 'Standard', itemId: 'fix1', qty: 3 }] }, [FIXTURE], { 'Fixture Labor': 1.5 })
  assert.equal(r.totalHrs, 0, 'sub tab has no labor hours')
  assert.equal(r.laborCost, 0, 'sub tab has no labor cost')
  assert.equal(r.subCost, 540, `subCost = 3 × $180 sub_price_ea = $540; got ${r.subCost}`)
  assert.deepEqual(r.laborUnset, [], 'sub tab does not surface labor-unset prompts')
  finiteNums(r)
})

test('no NaN across a populated estimate (fixtures + wire + manual)', () => {
  const r = run(
    {
      fixtureRows: [{ vendor: 'Standard', itemId: 'fix1', qty: 4 }],
      wireRows: [{ vendor: 'Standard', itemId: 'wire1', qty: 250 }],
      manualRows: [{ hours: 2, materials: 40, subCost: 0 }],
      distanceLF: 150,
    },
    [FIXTURE, WIRE],
    { 'Fixture Labor': 1.5, 'Wire Labor': 0.2 },
    0.15
  )
  finiteNums(r)
  assert.ok(r.price >= 0, 'price is a non-negative number')
  assert.ok(r.walkHrs > 0, 'walk-access penalty applies when distanceLF > 0')
})
