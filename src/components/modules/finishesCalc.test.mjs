// Acceptance tests for the pure Finishes calc (no network).
//   Three row sections (Flatwork / Wall Caps / Wall Finishes). Each row's type drives the
//   geometry + labor formula; the Vendor only changes the MATERIAL $ source (vendor catalog
//   Item price → else the name-keyed Standard price in `mp`). Labor coefficients are read
//   from the SAME `mp` map by their DB name. Unpriced ⇒ $0 / 0 hrs (NO-FALLBACK). Sub tab:
//   flat $/unit per row, zero labor hours, cost routed into subCost.
// Run: node --test src/components/modules/finishesCalc.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { calcFinishes } from './finishesCalc.js'

const base = {
  subType: 'In House', difficulty: '', hoursAdj: '', distanceLF: '',
  flatworkRows: [], capRows: [], wallFinishRows: [], manualRows: [], subGpMarkupRate: 0.2, commissionRate: 0.05,
}
// calcFinishes(state, lrph, mp, gpmd, walkAccess, laborBurdenPct, materialRows)
const run = (state, mp = {}, materialRows = []) =>
  calcFinishes({ ...base, ...state }, 35, mp, 425, null, 0.29, materialRows)

const finiteNums = obj => {
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'number') assert.ok(Number.isFinite(v), `${k} not finite: ${v}`)
  }
}

test('flatwork Tile value: mat = SF × $/SF; hrs = SF × labor rate (100 × $10 = $1000; × 0.2 = 20 hrs → $700)', () => {
  const r = run(
    { flatworkRows: [{ vendor: 'Standard', type: 'Tile', sf: '100' }] },
    { 'Finishes Tile Flatwork': 10, 'Finishes Tile Flatwork Labor Rate': 0.2 }
  )
  assert.equal(r.totalMat, 1000, `totalMat got ${r.totalMat}`)
  assert.equal(r.totalHrs, 20, `totalHrs got ${r.totalHrs}`)
  assert.equal(r.laborCost, 20 * 35, `laborCost got ${r.laborCost}`)
  finiteNums(r)
})

test('flatwork edit-reflects: raising the labor rate raises labor proportionally', () => {
  const a = run({ flatworkRows: [{ vendor: 'Standard', type: 'Tile', sf: '100' }] }, { 'Finishes Tile Flatwork': 10, 'Finishes Tile Flatwork Labor Rate': 0.2 })
  const b = run({ flatworkRows: [{ vendor: 'Standard', type: 'Tile', sf: '100' }] }, { 'Finishes Tile Flatwork': 10, 'Finishes Tile Flatwork Labor Rate': 0.4 })
  assert.equal(b.laborCost, a.laborCost * 2, 'rate ×2 → labor ×2')
})

test('cap Precast value: mat = qty × $/ea; hrs = qty × hrs/ea (5 × $40 = $200; × 0.5 = 2.5 hrs)', () => {
  const r = run(
    { capRows: [{ vendor: 'Standard', type: 'Precast', qty: '5' }] },
    { 'Finishes Cap Precast': 40, 'Finishes Cap Precast Labor Rate': 0.5 }
  )
  assert.equal(r.totalMat, 200, `cap mat got ${r.totalMat}`)
  assert.equal(r.totalHrs, 2.5, `cap hrs got ${r.totalHrs}`)
})

test('wall Ledgerstone composite: mat = SF × price × 1.1 + SF × screws (50 × $20 × 1.1 + 50 × $2 = $1200)', () => {
  const r = run(
    { wallFinishRows: [{ vendor: 'Standard', type: 'Ledgerstone', sf: '50' }] },
    { 'Ledgerstone - Finishes': 20, 'Finishes Stone Screws': 2, 'Ledgerstone - Finishes Labor Rate': 0.3 }
  )
  assert.equal(r.totalMat, 50 * 20 * 1.1 + 50 * 2, `ledgerstone mat got ${r.totalMat}`)
  assert.equal(r.totalHrs, 50 * 0.3, `ledgerstone hrs got ${r.totalHrs}`)
})

test('vendor-first material: a real vendor’s catalog Item price overrides the Standard price', () => {
  const mp = { 'Finishes Tile Flatwork': 10, 'Finishes Tile Flatwork Labor Rate': 0.2 }
  const rows = [{ name: 'Tile Flatwork', vendor_id: 'v-homedepot', unit_cost: 15 }]
  const std = run({ flatworkRows: [{ vendor: 'Standard', type: 'Tile', sf: '100' }] }, mp, rows)
  const ven = run({ flatworkRows: [{ vendor: 'v-homedepot', type: 'Tile', sf: '100' }] }, mp, rows)
  assert.equal(std.totalMat, 1000, 'Standard uses the name-keyed price ($10)')
  assert.equal(ven.totalMat, 1500, 'a real vendor uses its catalog Item unit_cost ($15)')
  assert.equal(ven.totalHrs, std.totalHrs, 'labor is unchanged by vendor (same rate map)')
})

test('material NO-FALLBACK: an unpriced type resolves $0 material (and 0 hrs when labor unset) — no hidden constant', () => {
  const r = run({ flatworkRows: [{ vendor: 'Standard', type: 'Tile', sf: '100' }] }, {}) // empty rate map
  assert.equal(r.totalMat, 0, 'no price → $0 material (no constant)')
  assert.equal(r.totalHrs, 0, 'no labor rate → 0 hours')
})

test('sub tab: flat $/unit per row, zero labor hours, cost routed into subCost', () => {
  const r = run(
    { subType: 'Subcontractor', flatworkRows: [{ vendor: 'Standard', type: 'Tile', sf: '100', subEach: '12' }] },
    { 'Finishes Tile Flatwork': 10, 'Finishes Tile Flatwork Labor Rate': 0.2 }
  )
  assert.equal(r.totalHrs, 0, 'sub tab has no labor hours')
  assert.equal(r.laborCost, 0, 'sub tab has no labor cost')
  assert.equal(r.totalMat, 0, 'sub tab keeps material out of the In-House total')
  assert.equal(r.subCost, 100 * 12, `subCost = 100 SF × $12 = $1200; got ${r.subCost}`)
  finiteNums(r)
})

test('labor unpriced: an unset labor rate surfaces ONLY for an in-house section in use', () => {
  const laborItems = obj => (obj.unpriced || []).filter(u => u.kind === 'labor')
  // In-house Tile flatwork with SF but its labor rate unset → surfaces (material priced,
  // so only the labor item shows).
  const used = run({ flatworkRows: [{ vendor: 'Standard', type: 'Tile', sf: '100' }] }, { 'Finishes Tile Flatwork': 10 })
  assert.ok(laborItems(used).some(u => /tile flatwork/i.test(u.label || u.name || '')), `tile flatwork labor surfaces when SF entered; got ${JSON.stringify(used.unpriced)}`)
  // Same row with SF 0 → labor rate never read → does NOT surface.
  const unused = run({ flatworkRows: [{ vendor: 'Standard', type: 'Tile', sf: '0' }] }, { 'Finishes Tile Flatwork': 10 })
  assert.ok(!laborItems(unused).some(u => /tile flatwork/i.test(u.label || u.name || '')), 'labor does NOT surface when the section has no SF')
  // Sub tab (flat-priced, no in-house hours) → no labor surfaces at all.
  const sub = run({ subType: 'Subcontractor', flatworkRows: [{ vendor: 'Standard', type: 'Tile', sf: '100', subEach: '12' }] }, { 'Finishes Tile Flatwork': 10 })
  assert.equal(laborItems(sub).length, 0, `Sub tab surfaces no in-house labor; got ${JSON.stringify(sub.unpriced)}`)
})

test('no NaN across a populated estimate (flat + cap + wall + manual, with difficulty + walk-access)', () => {
  const r = run(
    {
      difficulty: '10', hoursAdj: '2', distanceLF: '120',
      flatworkRows: [{ vendor: 'Standard', type: 'Tile', sf: '80' }],
      capRows: [{ vendor: 'Standard', type: 'Bullnose Brick', lf: '30' }],
      wallFinishRows: [{ vendor: 'Standard', type: 'Sand Stucco', sf: '40' }],
      manualRows: [{ hours: 4, materials: 50, subCost: 0 }],
    },
    {
      'Finishes Tile Flatwork': 10, 'Finishes Tile Flatwork Labor Rate': 0.2,
      'Finishes Cap Bullnose Brick': 8, 'Finishes Cap Bullnose Labor Rate': 0.25,
      'Sand Stucco - Finishes': 3, 'Sand Stucco - Finishes Labor Rate': 0.15,
    }
  )
  finiteNums(r)
  assert.ok(r.price > 0, 'price is positive with priced rows')
  assert.ok(r.walkHrs > 0, 'walk-access penalty applies when distanceLF > 0')
})
