// Acceptance tests for the pure Planting calc (no network).
//   Plant labor: hrs = qty × perDay, where perDay = labor_rates[item.calc_meta.labor_rate]
//   (hrs per plant, item-driven). Material = qty × the row's vendor-defaulted unit price.
//   The perDay>0 guard skips BOTH hrs and material when the plant's labor rate is unset,
//   AND the plant surfaces in `laborUnset` (NO-FALLBACK). Add-ons: hrs = qty × labor_rates
//   [meta.labKey] (perDay) or ÷60 (perMin); material vendor-first → Standard. Till: hrs =
//   soilCY×moveRate + sqft×tillRate + sqft×amendRate, guarded (all three > 0 or 0).
//   Sub tab: flat $/unit only, zero labor hours, cost routed into subCost.
// Run: node --test src/components/modules/plantingCalc.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { calcPlanting, ADDON_META } from './plantingCalc.js'

const LRPH = 75
const base = {
  subType: 'In House', tillSqft: '', difficulty: '', hoursAdj: '',
  smallPlantRows: [], largePlantRows: [], addonRows: [], otherAddons: {},
  manualRows: [], distanceLF: '',
}
// A priced Standard (null-vendor) plant Item whose install labor points at 'Plant - 5 Gallon'.
const PLANT = { id: 'pl1', name: '5 gallon standard', sub_category: 'Plants', category: 'Planting', vendor_id: null, unit_cost: 18, calc_meta: { labor_rate: 'Plant - 5 Gallon' } }
// calcPlanting(state, lrph, gpmd, materialPrices, laborRates, walkAccess, laborBurdenPct, materialRows, commissionRate)
const run = (state, lr = {}, mp = {}, materialRows = []) =>
  calcPlanting({ ...base, ...state }, LRPH, 500, mp, lr, null, 0.3, materialRows, 0.05)

const finiteNums = obj => {
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'number') assert.ok(Number.isFinite(v), `${k} not finite: ${v}`)
  }
}

test('plant labor value: hrs = qty × per-plant rate (10 × 0.5 = 5 hrs → $375); material = qty × price ($180)', () => {
  const r = run(
    { smallPlantRows: [{ vendor: 'Standard', type: '5 gallon standard', qty: '10', price: '18' }] },
    { 'Plant - 5 Gallon': 0.5 }, {}, [PLANT]
  )
  assert.equal(r.smallHrs, 5, `smallHrs got ${r.smallHrs}`)
  assert.equal(r.totalHrs, 5, `totalHrs got ${r.totalHrs}`)
  assert.equal(r.laborCost, 5 * LRPH, `laborCost got ${r.laborCost}`)
  assert.equal(r.totalMat, 180, `totalMat got ${r.totalMat}`)
  assert.deepEqual(r.laborUnset, [], 'priced plant does not flag as unset')
  finiteNums(r)
})

test('plant edit-reflects: raising the per-plant labor rate raises labor proportionally', () => {
  const a = run({ smallPlantRows: [{ vendor: 'Standard', type: '5 gallon standard', qty: '10', price: '18' }] }, { 'Plant - 5 Gallon': 0.5 }, {}, [PLANT])
  const b = run({ smallPlantRows: [{ vendor: 'Standard', type: '5 gallon standard', qty: '10', price: '18' }] }, { 'Plant - 5 Gallon': 1.0 }, {}, [PLANT])
  assert.equal(b.laborCost, a.laborCost * 2, 'rate ×2 → labor ×2')
})

test('add-on labor (perDay): hrs = qty × labor rate (4 × 0.25 = 1 hr); material = qty × Standard price (4 × $10 = $40)', () => {
  const r = run(
    { addonRows: [{ vendor: 'Standard', type: 'Tree Stake', qty: '4' }] },
    { 'Tree Stakes - Install Rate': 0.25 },
    { 'Tree Stake': 10 }
  )
  assert.equal(r.addonHrs, 1, `addonHrs got ${r.addonHrs}`)
  assert.equal(r.totalMat, 40, `add-on material got ${r.totalMat}`)
  assert.equal(ADDON_META['Tree Stake'].mode, 'perDay', 'Tree Stake is a perDay add-on (hrs = qty × rate)')
})

test('LABOR NO-FALLBACK: a plant whose install rate is unset → 0 hrs + 0 material (guard) AND flags in laborUnset', () => {
  const r = run(
    { smallPlantRows: [{ vendor: 'Standard', type: '5 gallon standard', qty: '10', price: '18' }] },
    {}, {}, [PLANT] // labor rate map empty → perDay resolves 0
  )
  assert.equal(r.smallHrs, 0, 'unset rate → 0 hrs (no hidden constant)')
  assert.equal(r.totalMat, 0, 'perDay>0 guard also skips material when labor is unset')
  assert.ok((r.laborUnset || []).length > 0, `expected laborUnset entry; got ${JSON.stringify(r.laborUnset)}`)
  assert.ok(r.laborUnset.some(u => u.label === '5 gallon standard'), 'the unpriced plant is surfaced by label')
})

test('till labor: hrs = soilCY×move + sqft×till + sqft×amend, guarded (drop one rate → 0 till hrs)', () => {
  const rates = { 'LAB-435-till-soil-move-rate': 1, 'LAB-436-till-tilling-rate': 0.1, 'LAB-434-till-amend-rate': 0.1 }
  const full = run({ tillSqft: '100' }, rates)
  // soilCY = 100×0.167/27 = 0.6185…; hrs = 0.6185×1 + 100×0.1 + 100×0.1 ≈ 20.6185
  assert.ok(Math.abs(full.tillHrs - (((100 * 0.167) / 27) * 1 + 100 * 0.1 + 100 * 0.1)) < 1e-9, `tillHrs got ${full.tillHrs}`)
  const missing = run({ tillSqft: '100' }, { 'LAB-435-till-soil-move-rate': 1, 'LAB-436-till-tilling-rate': 0.1 }) // amend unset
  assert.equal(missing.tillHrs, 0, 'any unset till rate → 0 till hrs (no partial fallback)')
})

test('sub tab: flat $/unit only, zero labor hours, cost routed into subCost', () => {
  const r = run(
    { subType: 'Subcontractor', smallPlantRows: [{ vendor: 'Standard', type: '5 gallon standard', qty: '10', price: '18', subEach: '25' }] },
    { 'Plant - 5 Gallon': 0.5 }, {}, [PLANT]
  )
  assert.equal(r.totalHrs, 0, 'sub tab has no labor hours')
  assert.equal(r.laborCost, 0, 'sub tab has no labor cost')
  assert.equal(r.totalMat, 0, 'sub tab keeps material out of the In-House total')
  assert.equal(r.subCost, 250, `subCost = 10 × $25 = $250; got ${r.subCost}`)
  finiteNums(r)
})

test('no NaN across a populated estimate (till + plants + add-on + manual + yard check)', () => {
  const r = run(
    {
      tillSqft: '80',
      smallPlantRows: [{ vendor: 'Standard', type: '5 gallon standard', qty: '6', price: '18' }],
      addonRows: [{ vendor: 'Standard', type: 'Tree Stake', qty: '4' }],
      manualRows: [{ hours: 4, materials: 50, subCost: 0 }],
      yardCheck: { enabled: true, hours: '3', pct: '2' },
      distanceLF: '120',
    },
    { 'Plant - 5 Gallon': 0.5, 'Tree Stakes - Install Rate': 0.25, 'LAB-435-till-soil-move-rate': 1, 'LAB-436-till-tilling-rate': 0.1, 'LAB-434-till-amend-rate': 0.1 },
    { 'Tree Stake': 10 },
    [PLANT]
  )
  finiteNums(r)
  assert.ok(r.price >= 0, 'price is a non-negative number')
  assert.ok(r.walkHrs > 0, 'walk-access penalty applies when distanceLF > 0')
  assert.ok(r.yardCheckHrs > 0, 'yard check adds hours when enabled')
})
