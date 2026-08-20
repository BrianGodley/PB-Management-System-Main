// Acceptance test — locks the Fire Pit cap/finish fix:
//   a cap + a finish must show BOTH non-zero material AND non-zero labor, including
//   the vendor/catalog path where labor comes from the Master-Rates default-labor
//   pointer (calc_meta.labor_rate). An unset labor must read 0 AND flag itself for
//   the fix-it modal — never a silent type-inheritance fallback.
//
// Run:  node --test src/components/modules/firePitCalc.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { computeCapRow, computeFinishRow, resolveLabor } from './firePitCalc.js'

// Minimal FP_RATES shape the calc reads (name -> mp key).
const FP_RATES = {
  capPrecast: { dbName: 'FP Cap Precast' },
  capPrecastLab: { dbName: 'FP Cap Precast Labor Rate' },
  smoothStucco: { dbName: 'Smooth Stucco - FP' },
  smoothStuccoLab: { dbName: 'Smooth Stucco - FP Labor Rate' },
}

test('built-in Precast cap: material AND labor both non-zero', () => {
  const meta = { matKey: 'capPrecast', labKey: 'capPrecastLab' } // built-in (not master)
  const mp = { 'FP Cap Precast': 50, 'FP Cap Precast Labor Rate': 0.25 }
  const r = computeCapRow({ type: 'Precast', lf: 10 }, { meta, vendorUnit: null, mp, fpRates: FP_RATES })
  assert.ok(r.mat > 0, `material should be > 0, got ${r.mat}`)
  assert.ok(r.hrs > 0, `labor should be > 0, got ${r.hrs}`)
  assert.equal(r.laborUnset, null)
})

test('vendor cap via default-labor pointer: material AND labor both non-zero (THE fix)', () => {
  // Catalog/vendor cap: matUnit from the catalog, no numeric laborCoeff, labor comes
  // from the Master-Rates default-labor pointer.
  const meta = { master: true, matUnit: 60, laborCoeff: 0, labor_rate: 'FP Cap Precast Labor Rate' }
  const mp = { 'FP Cap Precast Labor Rate': 0.25 }
  const r = computeCapRow({ type: 'Bellecrete Precast', lf: 8, vendor: 'v1' }, { meta, vendorUnit: null, mp, fpRates: FP_RATES })
  assert.ok(r.mat > 0, `material from catalog matUnit, got ${r.mat}`)
  assert.ok(r.hrs > 0, `labor from default-labor pointer, got ${r.hrs}`)
  assert.equal(r.laborUnset, null)
})

test('vendor cap with NO labor configured: 0 labor + unpriced flag, never a silent fallback', () => {
  const meta = { master: true, matUnit: 60, laborCoeff: 0, labor_rate: null }
  const r = computeCapRow({ type: 'Mystery Cap', lf: 5 }, { meta, vendorUnit: null, mp: {}, fpRates: FP_RATES })
  assert.equal(r.hrs, 0, 'no fallback labor')
  assert.ok(r.laborUnset, 'must flag for the fix-it modal')
})

test('vendor price overrides the house unit for material', () => {
  const meta = { master: true, matUnit: 60, laborCoeff: 0.3 }
  const r = computeCapRow({ type: 'X', lf: 2 }, { meta, vendorUnit: 75, mp: {}, fpRates: FP_RATES })
  assert.equal(r.unit, 75)
  assert.equal(r.mat, 150)
})

test('built-in Smooth Stucco finish: material AND labor both non-zero', () => {
  const meta = { key: 'smoothStucco', labKey: 'smoothStuccoLab' }
  const mp = { 'Smooth Stucco - FP': 4, 'Smooth Stucco - FP Labor Rate': 0.1 }
  const r = computeFinishRow({ type: 'Smooth Stucco', sf: 20 }, { meta, vendorUnit: null, mp, fpRates: FP_RATES })
  assert.ok(r.mat > 0, `material should be > 0, got ${r.mat}`)
  assert.ok(r.hrs > 0, `labor should be > 0, got ${r.hrs}`)
})

test('a View Rates price edit reflects in the estimate (calc consumes mp by name)', () => {
  // The module reads material/labor by NAME from mp; a View Rates edit writes that
  // same name-keyed value. So changing the rate changes the estimate output.
  const meta = { matKey: 'capPrecast', labKey: 'capPrecastLab' }
  const before = computeCapRow({ type: 'Precast', lf: 10 }, {
    meta, vendorUnit: null, fpRates: FP_RATES,
    mp: { 'FP Cap Precast': 50, 'FP Cap Precast Labor Rate': 0.25 },
  })
  const after = computeCapRow({ type: 'Precast', lf: 10 }, {
    meta, vendorUnit: null, fpRates: FP_RATES,
    mp: { 'FP Cap Precast': 60, 'FP Cap Precast Labor Rate': 0.5 }, // edited in View Rates
  })
  assert.equal(before.mat, 500)
  assert.equal(after.mat, 600) // material reflects the edited price
  assert.equal(after.hrs, before.hrs * 2) // labor reflects the edited rate
})

test('resolveLabor priority: numeric coeff > pointer > 0', () => {
  assert.equal(resolveLabor({ master: true, laborCoeff: 0.5, labor_rate: 'X' }, 'X', { X: 9 }), 0.5)
  assert.equal(resolveLabor({ master: true, laborCoeff: 0, labor_rate: 'X' }, 'X', { X: 0.25 }), 0.25)
  assert.equal(resolveLabor({ master: true, laborCoeff: 0, labor_rate: null }, null, {}), 0)
})
