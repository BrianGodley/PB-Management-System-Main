import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeColumnFinishRow } from './columnsCalc.js'

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
