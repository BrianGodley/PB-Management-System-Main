import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeColumnFinishRow } from './columnsCalc.js'
import { makeModuleRates } from '../../lib/moduleRates.js'

const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, `${msg}: ${a} vs ${b}`)

// Value — In-House: mat = qty × $/SF, hrs = qty × hrs/SF (shared Finishes rate).
test('value: In-House finish = qty × matUnit, qty × laborRate', () => {
  const r = computeColumnFinishRow({ qty: 30 }, { matUnit: 10, laborRate: 0.3333, subUnit: 5 })
  near(r.mat, 300, 'mat')
  near(r.hrs, 30 * 0.3333, 'hrs')
})

// Edit-reflects — raising the shared material price (or labor rate) raises the output.
test('edit-reflects: bump matUnit/laborRate → output rises', () => {
  const before = computeColumnFinishRow({ qty: 20 }, { matUnit: 6.5, laborRate: 0.3 })
  const afterMat = computeColumnFinishRow({ qty: 20 }, { matUnit: 9.0, laborRate: 0.3 })
  const afterLab = computeColumnFinishRow({ qty: 20 }, { matUnit: 6.5, laborRate: 0.5 })
  assert.ok(afterMat.mat > before.mat, 'material rises when the shared price rises')
  assert.ok(afterLab.hrs > before.hrs, 'labor rises when the shared rate rises')
})

// Unpriced / NO-FALLBACK — an unset (0) injected unit resolves to 0, never a constant.
test('unpriced: matUnit 0 → mat 0 (no hidden fallback)', () => {
  const r = computeColumnFinishRow({ qty: 40 }, { matUnit: 0, laborRate: 0 })
  near(r.mat, 0, 'mat is 0 when unpriced')
  near(r.hrs, 0, 'hrs is 0 when unpriced')
})

// Vendor-override — a different injected unit (a vendor price) drives a different total.
test('vendor-override: vendor unit changes the material total', () => {
  const std = computeColumnFinishRow({ qty: 10 }, { matUnit: 10, laborRate: 0.3333 })
  const ven = computeColumnFinishRow({ qty: 10 }, { matUnit: 14, laborRate: 0.3333 })
  assert.ok(ven.mat > std.mat, 'vendor price overrides Standard')
})

// Sub-independence — Sub prices from subUnit and carries NO in-house labor hours.
test('sub-independence: Sub uses subUnit, no in-house hrs', () => {
  const r = computeColumnFinishRow({ qty: 25 }, { matUnit: 10, laborRate: 0.3333, subUnit: 3, isSub: true })
  near(r.mat, 75, 'mat = qty × subUnit')
  near(r.hrs, 0, 'no in-house labor on the Sub tab')
})

// Zero / empty qty → zero (guarded, no NaN).
test('zero qty → { mat: 0, hrs: 0 }', () => {
  near(computeColumnFinishRow({ qty: 0 }, { matUnit: 10, laborRate: 0.3333 }).mat, 0, 'mat')
  near(computeColumnFinishRow({}, { matUnit: 10, laborRate: 0.3333 }).hrs, 0, 'hrs')
})

// Labor unpriced — routed through R.labor, an unset finish labor rate surfaces ONLY
// for an in-house finish actually in use (qty>0); the Sub tab and unused rows do not.
test('labor unpriced: an unset finish labor rate surfaces only when the in-house finish is used', () => {
  const laborItems = R => R.unpricedList.filter(u => u.kind === 'labor')

  // In-house, qty>0, labor rate absent from the map → surfaces (value still 0).
  const usedR = makeModuleRates({ material: {}, labor: {}, sub: {}, misc: {} })
  const used = computeColumnFinishRow(
    { qty: 30 },
    { matUnit: 10, laborRate: 0, isSub: false, R: usedR, laborName: 'Tile - Finishes Labor Rate', laborMeta: { category: 'Finishes', unit: 'Hrs per Sq Ft', label: 'Tile Finish' } }
  )
  assert.equal(used.hrs, 0, 'unset rate still contributes 0 hrs (no hidden fallback)')
  assert.ok(laborItems(usedR).some(u => /tile/i.test(u.label || u.name)), 'in-house finish labor surfaces when used')

  // Sub tab — labor is never read (folded into the sub cost) → nothing surfaces.
  const subR = makeModuleRates({ material: {}, labor: {}, sub: {}, misc: {} })
  computeColumnFinishRow(
    { qty: 30 },
    { matUnit: 10, laborRate: 0, subUnit: 5, isSub: true, R: subR, laborName: 'Tile - Finishes Labor Rate', laborMeta: { category: 'Finishes', unit: 'Hrs per Sq Ft', label: 'Tile Finish' } }
  )
  assert.equal(laborItems(subR).length, 0, 'Sub tab surfaces no in-house labor')

  // Unused (qty 0) — the rate is never read → nothing surfaces.
  const unusedR = makeModuleRates({ material: {}, labor: {}, sub: {}, misc: {} })
  computeColumnFinishRow(
    { qty: 0 },
    { matUnit: 10, laborRate: 0, isSub: false, R: unusedR, laborName: 'Tile - Finishes Labor Rate', laborMeta: {} }
  )
  assert.equal(laborItems(unusedR).length, 0, 'unused finish row surfaces no labor')
})

// Priced rate — R.labor returns the same value as a plain injected laborRate (no math change).
test('R.labor value parity: a priced rate matches the plain injected laborRate', () => {
  const R = makeModuleRates({ material: {}, labor: { 'Tile - Finishes Labor Rate': 0.4 }, sub: {}, misc: {} })
  const viaR = computeColumnFinishRow({ qty: 10 }, { matUnit: 10, laborRate: 0.4, R, laborName: 'Tile - Finishes Labor Rate', laborMeta: {} })
  const plain = computeColumnFinishRow({ qty: 10 }, { matUnit: 10, laborRate: 0.4 })
  near(viaR.hrs, plain.hrs, 'R-routed hrs equal plain hrs')
  assert.equal(R.unpricedList.filter(u => u.kind === 'labor').length, 0, 'a priced rate does not surface')
})
