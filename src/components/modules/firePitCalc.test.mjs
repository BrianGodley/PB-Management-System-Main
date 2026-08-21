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
  smoothStucco: { dbName: 'Smooth Stucco - Finishes' },
  smoothStuccoLab: { dbName: 'Smooth Stucco - Finishes Labor Rate' },
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
  const mp = { 'Smooth Stucco - Finishes': 4, 'Smooth Stucco - Finishes Labor Rate': 0.1 }
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

// ── Scenario: 12 LF × 18" fire pit, all cap types, all wall finishes @ 20 SF ─────
// (structure block/footing/grout for the 12 LF × 18" ring is STRUCT_CALC in the React
//  module; this scenario locks every CAP and every FINISH type shows material + labor.)
const RATES = {
  capFlagstone: { dbName: 'FP Cap Flagstone' },
  capPrecast: { dbName: 'FP Cap Precast' },
  capPipConcrete: { dbName: 'FP Cap PIP Concrete' },
  capBullnose: { dbName: 'FP Cap Bullnose Brick' },
  capFlagstoneLab: { dbName: 'FP Cap Flagstone Labor Rate' },
  capPrecastLab: { dbName: 'FP Cap Precast Labor Rate' },
  capPipConcreteLab: { dbName: 'FP Cap PIP Concrete Labor Rate' },
  capBullnoseLab: { dbName: 'FP Cap Bullnose Brick Labor Rate' },
  sandStucco: { dbName: 'Sand Stucco - Finishes' },
  smoothStucco: { dbName: 'Smooth Stucco - Finishes' },
  ledgerstone: { dbName: 'Ledgerstone - Finishes' },
  stackedStone: { dbName: 'Stacked Stone - Finishes' },
  tile: { dbName: 'Tile - Finishes' },
  realFlagstone: { dbName: 'Real Flagstone - Finishes' },
  realStone: { dbName: 'Real Stone - Finishes' },
  sandStuccoLab: { dbName: 'Sand Stucco - Finishes Labor Rate' },
  smoothStuccoLab: { dbName: 'Smooth Stucco - Finishes Labor Rate' },
  ledgerstoneLab: { dbName: 'Ledgerstone - Finishes Labor Rate' },
  stackedStoneLab: { dbName: 'Stacked Stone - Finishes Labor Rate' },
  tileLab: { dbName: 'Tile - Finishes Labor Rate' },
  flagstoneLab: { dbName: 'Real Flagstone - Finishes Labor Rate' },
  realStoneLab: { dbName: 'Real Stone - Finishes Labor Rate' },
}
// Every rate priced non-zero (as it would be once seeded in Master Rates).
const MP = Object.fromEntries(Object.values(RATES).map(r => [r.dbName, /Labor Rate/.test(r.dbName) ? 0.2 : 10]))

const CAP_META = {
  Flagstone: { matKey: 'capFlagstone', labKey: 'capFlagstoneLab' },
  Precast: { matKey: 'capPrecast', labKey: 'capPrecastLab' },
  'PIP Concrete': { matKey: 'capPipConcrete', labKey: 'capPipConcreteLab' },
  'Bullnose Brick': { matKey: 'capBullnose', labKey: 'capBullnoseLab' },
}
const WF_META = {
  'Sand Stucco': { key: 'sandStucco', labKey: 'sandStuccoLab', unit: 'SF' },
  'Smooth Stucco': { key: 'smoothStucco', labKey: 'smoothStuccoLab', unit: 'SF' },
  'Ledgerstone Veneer': { key: 'ledgerstone', labKey: 'ledgerstoneLab', waste: 1.1, screwPer5: 2 },
  'Stacked Stone Veneer': { key: 'stackedStone', labKey: 'stackedStoneLab', waste: 1.1, screwPer5: 2 },
  Tile: { key: 'tile', labKey: 'tileLab', adhesivePerSF: 1 },
  'Real Flagstone': { key: 'realFlagstone', labKey: 'flagstoneLab', unit: 'stone', delivPerSF: 1, misc: 268.75 },
  'Real Stone': { key: 'realStone', labKey: 'realStoneLab', unit: 'stone', delivPerSF: 2.5714, addPerSF: 1 },
}

for (const [type, meta] of Object.entries(CAP_META)) {
  test(`scenario cap @ 12 LF — ${type}: material AND labor > 0`, () => {
    const r = computeCapRow({ type, lf: 12 }, { meta, vendorUnit: null, mp: MP, fpRates: RATES })
    assert.ok(r.mat > 0, `${type} material > 0, got ${r.mat}`)
    assert.ok(r.hrs > 0, `${type} labor > 0, got ${r.hrs}`)
    assert.equal(r.laborUnset, null)
  })
}

for (const [type, meta] of Object.entries(WF_META)) {
  test(`scenario finish @ 20 SF — ${type}: material AND labor > 0`, () => {
    const r = computeFinishRow({ type, sf: 20 }, { meta, vendorUnit: null, mp: MP, fpRates: RATES })
    assert.ok(r.mat > 0, `${type} material > 0, got ${r.mat}`)
    assert.ok(r.hrs > 0, `${type} labor > 0, got ${r.hrs}`)
    assert.equal(r.laborUnset, null)
  })
}

// Adjust each type's material price + labor rate (as a View Rates edit would) and
// confirm the estimate reflects it — per cap type and per finish type.
const bump = (mp, matName, labName) => ({ ...mp, [matName]: mp[matName] + 5, [labName]: mp[labName] + 0.1 })

for (const [type, meta] of Object.entries(CAP_META)) {
  test(`View Rates adjustment reflects — cap ${type}`, () => {
    const ctx = { meta, vendorUnit: null, fpRates: RATES }
    const before = computeCapRow({ type, lf: 12 }, { ...ctx, mp: MP })
    const after = computeCapRow({ type, lf: 12 }, { ...ctx, mp: bump(MP, RATES[meta.matKey].dbName, RATES[meta.labKey].dbName) })
    assert.ok(after.mat > before.mat, `${type} material should rise on a price edit`)
    assert.ok(after.hrs > before.hrs, `${type} labor should rise on a rate edit`)
  })
}
for (const [type, meta] of Object.entries(WF_META)) {
  test(`View Rates adjustment reflects — finish ${type}`, () => {
    const ctx = { meta, vendorUnit: null, fpRates: RATES }
    const before = computeFinishRow({ type, sf: 20 }, { ...ctx, mp: MP })
    const after = computeFinishRow({ type, sf: 20 }, { ...ctx, mp: bump(MP, RATES[meta.key].dbName, RATES[meta.labKey].dbName) })
    assert.ok(after.mat > before.mat, `${type} material should rise on a price edit`)
    assert.ok(after.hrs > before.hrs, `${type} labor should rise on a rate edit`)
  })
}

test('resolveLabor priority: numeric coeff > pointer > 0', () => {
  assert.equal(resolveLabor({ master: true, laborCoeff: 0.5, labor_rate: 'X' }, 'X', { X: 9 }), 0.5)
  assert.equal(resolveLabor({ master: true, laborCoeff: 0, labor_rate: 'X' }, 'X', { X: 0.25 }), 0.25)
  assert.equal(resolveLabor({ master: true, laborCoeff: 0, labor_rate: null }, null, {}), 0)
})

// Shared-finish labor: a master (catalog) finish whose calc_meta.labor_rate points at a
// fetched, priced rate must resolve nonzero hrs (this is the flow the finishes
// consolidation depends on). A NULL pointer must NOT silently pass — it resolves 0 hrs
// AND raises laborUnset so the fix-it modal fires. Regression guard for the Fire Pit
// wall-finish 0-hours bug (records shipped with no labor link).
test('master finish: pointer resolves hrs; null pointer flags laborUnset', () => {
  const meta = { master: true, key: 'x', matUnit: 5, labor_rate: 'Ledgerstone - Finishes Labor Rate' }
  const mp = { 'Ledgerstone - Finishes Labor Rate': 0.3333 }
  const linked = computeFinishRow({ sf: 30, type: 'Ledgerstone - Finishes' }, { meta, vendorUnit: null, mp, fpRates: {} })
  assert.ok(Math.abs(linked.hrs - 30 * 0.3333) < 1e-9, 'linked finish should resolve nonzero hrs')
  assert.equal(linked.laborUnset, null, 'a priced link should not flag unpriced')

  const orphan = computeFinishRow({ sf: 30, type: 'Ledgerstone - Finishes' }, { meta: { ...meta, labor_rate: null }, vendorUnit: null, mp, fpRates: {} })
  assert.equal(orphan.hrs, 0, 'null-pointer finish resolves 0 hrs')
  assert.ok(orphan.laborUnset, 'null-pointer finish must raise laborUnset (not silently pass)')
})
