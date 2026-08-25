// Acceptance tests for the pure Ground Treatments calc (no network).
//   Many sections (Mulch, Edging, Planter/Sod Prep, Sod, Fertilizer, Steppers, DG,
//   Gravel/Pebble/Cobble). Each row's Type resolves its material $ from the catalog
//   (vendor-first → Standard); labor coefficients are read from the rate map by DB name.
//   Volumes use fixed unit math (SF × depth/12 ÷ 27 = Cu Yd). Sub tab: flat $/SF (or $/LF
//   for edging) per section, NO in-house hours/material. Unpriced ⇒ $0 (NO-FALLBACK).
// Run: node --test src/components/modules/groundTreatmentsCalc.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { calcGroundTreatments } from './groundTreatmentsCalc.js'

const LRPH = 35
const base = {
  subType: 'In House', difficulty: 0, hoursAdj: 0, distanceLF: 0,
  mulchRows: [], edgingRows: [], planterPrepRows: [], sodPrepRows: [], sodRows: [], sodFertRows: [],
  dgRows: [], gravelRows: [], pebbleRows: [], cobbleRows: [], manualRows: [],
  plasticEdgingLF: '', metalEdgingLF: '', soilPrepSF: '', sodSF: '',
  flagstoneSoilSF: '', flagstoneConcreteSF: '', precastSoilSF: '', precastConcreteSF: '',
  stepperVendor: {}, stepperType: {}, subGpMarkupRate: 0.2, commissionRate: 0.05,
}
const row = (name, sub, cost, vendor_id = null, ref_key = null) => ({ id: name, ref_key, name, sub_category: sub, category: 'Ground Treatments', vendor_id, unit_cost: cost })
// calcGroundTreatments(state, lrph, mp, gpmd, walkAccess, laborBurdenPct, opts, materialRows, catDefaults, commissionRate)
const run = (state, mp = {}, materialRows = []) =>
  calcGroundTreatments({ ...base, ...state }, LRPH, mp, 425, null, 0.29, {}, materialRows, {}, 0.05)

const finiteNums = obj => { for (const [k, v] of Object.entries(obj)) if (typeof v === 'number') assert.ok(Number.isFinite(v), `${k} not finite: ${v}`) }
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} !≈ ${b}`)
const CY = (sf, depthIn) => (sf * (depthIn / 12)) / 27

test('mulch value: material = CY × $/CY + delivery; labor = CY × spread + SF × coverage', () => {
  const r = run(
    { mulchRows: [{ sf: '100', depth: '3', type: 'Standard Mulch', vendor: 'Standard', weedFabric: 'No' }] },
    { 'Mulch - Labor Rate': 0.1, 'GT - Mulch Coverage': 0.02, 'Mulch Delivery Fee': 50 },
    [row('Standard Mulch', 'Mulch', 40)]
  )
  near(r.mulchMat, CY(100, 3) * 40 + 50)
  near(r.mulchLab, CY(100, 3) * 0.1 + 100 * 0.02)
})

test('mulch edit-reflects: raising $/CY raises mulch material (delivery fee constant)', () => {
  const a = run({ mulchRows: [{ sf: '100', depth: '3', type: 'M', vendor: 'Standard', weedFabric: 'No' }] }, { 'Mulch Delivery Fee': 50 }, [row('M', 'Mulch', 40)])
  const b = run({ mulchRows: [{ sf: '100', depth: '3', type: 'M', vendor: 'Standard', weedFabric: 'No' }] }, { 'Mulch Delivery Fee': 50 }, [row('M', 'Mulch', 80)])
  near(b.mulchMat - a.mulchMat, CY(100, 3) * 40) // +$40/CY over the same CY
})

test('M5 ref_key parity: a mulch row picked by material ref_key resolves the same material as by name', () => {
  const rows = [row('Standard Mulch', 'Mulch', 40, null, 'MAT-720-standard-mulch')]
  const byName = run({ mulchRows: [{ sf: '100', depth: '3', type: 'Standard Mulch', vendor: 'Standard', weedFabric: 'No' }] }, { 'Mulch Delivery Fee': 50 }, rows)
  const byRef = run({ mulchRows: [{ sf: '100', depth: '3', type: 'MAT-720-standard-mulch', vendor: 'Standard', weedFabric: 'No' }] }, { 'Mulch Delivery Fee': 50 }, rows)
  near(byRef.mulchMat, byName.mulchMat)
  near(byRef.mulchMat - 50, CY(100, 3) * 40) // material (minus flat delivery) = CY × $40/CY
})

test('edging: metal vs plastic read different labor rate keys (independence)', () => {
  const rows = [row('Metal Edging', 'Edging', 4), row('Plastic Edging', 'Edging', 2)]
  const rates = { 'Metal Edging - Labor Rate': 0.5, 'Plastic Edging - Labor Rate': 0.1 }
  const metal = run({ edgingRows: [{ lf: '100', type: 'Metal Edging', vendor: 'Standard' }] }, rates, rows)
  const plastic = run({ edgingRows: [{ lf: '100', type: 'Plastic Edging', vendor: 'Standard' }] }, rates, rows)
  assert.equal(metal.edgingLab, 100 * 0.5, 'metal type uses the Metal labor rate')
  assert.equal(plastic.edgingLab, 100 * 0.1, 'plastic type uses the Plastic labor rate (independent)')
  assert.equal(metal.edgingMat, 100 * 4, 'edging material = LF × Type $/LF')
})

test('planter prep + tilling: labor = area × (base + tilling coeff); material = CY × soil $/CY', () => {
  const r = run(
    { planterPrepRows: [{ area: '200', depthIn: '6', type: 'Compost', vendor: 'Standard', tilling: 'Hand' }] },
    { 'Soil Prep - Labor Rate': 0.02, 'GT - Till Hand Labor Rate': 0.01 },
    [row('Compost', 'Soils', 45)]
  )
  assert.equal(r.soilLab, 200 * (0.02 + 0.01), `soilLab got ${r.soilLab}`)
  near(r.soilMat, CY(200, 6) * 45)
})

test('sod + fertilizer: sod mat = SF × $/SF; fertilizer bags = ceil(SF / SF-per-bag) × $/bag', () => {
  const r = run(
    {
      sodRows: [{ sf: '1000', type: 'Marathon', vendor: 'Standard' }],
      sodFertRows: [{ fertilizer: 'Starter', vendor: 'Standard', sf: '1000' }],
    },
    { 'Sod - Labor Rate': 0.01, 'Fertilizer - SF Per Bag': 400 },
    [row('Marathon', 'Sod', 0.8), row('Starter', 'Fertilizer', 25)]
  )
  assert.equal(r.sodMat, 1000 * 0.8, `sod mat got ${r.sodMat}`)
  assert.equal(r.sodLab, 1000 * 0.01, `sod labor got ${r.sodLab}`)
  // bags = ceil(1000 / 400) = 3; fert mat = 3 × $25 = $75
  assert.equal(r.fertMat ?? r.totalMat - r.sodMat, 75, `fert bags/material off (totalMat ${r.totalMat})`)
})

test('DG value: material = CY × $/CY; labor = CY × method rate + SF × cleanup', () => {
  const mp = {
    'GT - DG Cleanup Coverage': 0.01, 'DG - Machine Labor Rate': 0.5,
  }
  const r = run(
    { dgRows: [{ sf: '100', depth: '2', type: 'DG Gold', method: 'Machine', cement: 'No', weedFabric: 'No' }] },
    mp, [row('DG Gold', 'DG', 60)]
  )
  const cy = CY(100, 2)
  near(r.dgMat, cy * 60) // material priced per Cu Yd (markup removed)
  near(r.dgLab, cy * 0.5 + 100 * 0.01) // method rate × CY + cleanup (swell + placement removed)
})

test('vendor branch resolves the PICKED material by ref_key (not stuck on the first) — GT price-change regression', () => {
  const V = 'vendor-1'
  const rows = [
    row('DG Gold', 'DG', 40, V, 'MAT-901-dg-gold'),
    row('DG Brown', 'DG', 70, V, 'MAT-902-dg-brown'),
  ]
  const pick = ref =>
    run(
      { dgRows: [{ sf: '100', depth: '2', type: ref, method: 'Machine', cement: 'No', weedFabric: 'No', vendor: V }] },
      { 'DG - Machine Labor Rate': 0.5, 'GT - DG Cleanup Coverage': 0 },
      rows
    )
  const cy = CY(100, 2)
  near(pick('MAT-901-dg-gold').dgMat, cy * 40)
  near(pick('MAT-902-dg-brown').dgMat, cy * 70) // must be 70 (picked), not 40 (first option)
})

test('gravel value: material = CY × $/CY (no fabric); labor = CY × swell × machine rate', () => {
  const r = run(
    { gravelRows: [{ sf: '100', depthIn: '3', type: '3/4 Gravel', method: 'Machine', weedFabric: 'No' }] },
    { 'GT - Aggregate Removal Swell': 1.2, 'Gravel - Machine Labor Rate': 0.5 },
    [row('3/4 Gravel', 'Gravel', 50)]
  )
  near(r.gravelMat, CY(100, 3) * 50)
  near(r.gravelLab, CY(100, 3) * 1.2 * 0.5)
})

test('material NO-FALLBACK: an unpriced mulch type → $0 material (labor still applies)', () => {
  const r = run(
    { mulchRows: [{ sf: '100', depth: '3', type: 'Standard Mulch', vendor: 'Standard', weedFabric: 'No' }] },
    { 'Mulch - Labor Rate': 0.1, 'GT - Mulch Coverage': 0.02 },
    [] // empty catalog → type resolves to $0
  )
  assert.equal(r.mulchMat, 0, 'no catalog price → $0 mulch material (no hidden constant)')
  assert.ok(r.mulchLab > 0, 'labor still applies from the rate map')
})

test('sub tab: flat $/SF (and $/LF for edging) per section, no in-house hours/material', () => {
  const r = run(
    {
      subType: 'Subcontractor',
      mulchRows: [{ sf: '100', depth: '3', type: 'M', vendor: 'Standard' }],
      plasticEdgingLF: '50', metalEdgingLF: '0', soilPrepSF: '0', sodSF: '200',
    },
    { 'Mulch Sub - $/SF': 2, 'Edging Sub - $/LF': 3, 'Sod Sub - $/SF': 1.5 },
    [row('M', 'Mulch', 40)]
  )
  assert.equal(r.totalHrs, 0, 'sub tab has no in-house hours')
  assert.equal(r.totalMat, 0, 'sub tab has no in-house material')
  // subCost = mulch 100×2 + edging 50×3 + sod 200×1.5 = 200 + 150 + 300 = 650
  assert.equal(r.subCost, 650, `subCost got ${r.subCost}`)
  finiteNums(r)
})

test('tons removed: steppers price per Sq Ft, DG per Cu Yd (no divisor, always finite)', () => {
  // Steppers now price SF × $/Sq Ft directly (no SF-per-ton divisor). 100 SF × $300/SF.
  const step = run(
    { flagstoneSoilSF: '100', stepperVendor: { flagSoil: 'Standard' }, stepperType: { flagSoil: 'Flagstone' } },
    { 'Flagstone Steppers - Soil Labor': 0.1 },
    [row('Flagstone', 'Steppers', 300)]
  )
  assert.ok(Number.isFinite(step.totalMat), `stepper totalMat must be finite; got ${step.totalMat}`)
  assert.equal(step.flagMat, 100 * 300, `stepper material = SF × $/SF; got ${step.flagMat}`)

  // DG has no tons denominator anymore; all values compute off Cu Yd and stay finite.
  const dg = run(
    { dgRows: [{ sf: '100', depth: '2', type: 'DG Gold', method: 'Machine', cement: 'No', weedFabric: 'No' }] },
    { 'GT - DG Material Markup': 1, 'DG - Machine Labor Rate': 0.5, 'GT - DG Cleanup Coverage': 0.01 },
    [row('DG Gold', 'DG', 60)]
  )
  assert.ok(Number.isFinite(dg.dgLab) && Number.isFinite(dg.totalMat), `DG values must be finite; got lab ${dg.dgLab}, mat ${dg.totalMat}`)
})

test('labor unpriced: an unset labor rate surfaces ONLY for a section in use', () => {
  const laborItems = obj => (obj.unpriced || []).filter(u => u.kind === 'labor')
  // Sod entered but its labor rate ('Sod - Labor Rate') is unset → surfaces.
  const used = run({ sodRows: [{ sf: '1000', type: 'Marathon', vendor: 'Standard' }] }, {}, [row('Marathon', 'Sod', 0.8)])
  assert.ok(laborItems(used).some(u => /sod/i.test(u.label || u.name)), 'sod labor surfaces when sod SF > 0')
  // No sod SF → the sod labor rate is never read, so it must NOT surface.
  const unused = run({ sodRows: [{ sf: '0', type: 'Marathon', vendor: 'Standard' }] }, {}, [row('Marathon', 'Sod', 0.8)])
  assert.ok(!laborItems(unused).some(u => /sod/i.test(u.label || u.name)), 'sod labor does NOT surface when unused')
  // Sub tab: flat $/SF pricing, so no in-house labor items surface at all.
  const sub = run(
    { subType: 'Subcontractor', sodSF: '1000', sodRows: [{ sf: '1000', type: 'Marathon', vendor: 'Standard' }] },
    { 'Sod Sub - $/SF': 1.5 }, [row('Marathon', 'Sod', 0.8)]
  )
  assert.equal(laborItems(sub).length, 0, 'no labor items surface on the Sub tab')
})

test('no NaN across a populated estimate (mulch + edging + prep + sod + DG + gravel + manual)', () => {
  const rows = [
    row('Standard Mulch', 'Mulch', 40), row('Metal Edging', 'Edging', 4), row('Compost', 'Soils', 45),
    row('Marathon', 'Sod', 0.8), row('DG Gold', 'DG', 60), row('3/4 Gravel', 'Gravel', 50),
  ]
  const mp = {
    'Mulch - Labor Rate': 0.1, 'GT - Mulch Coverage': 0.02, 'Mulch Delivery Fee': 50, 'Metal Edging - Labor Rate': 0.5,
    'Soil Prep - Labor Rate': 0.02, 'Sod - Labor Rate': 0.01, 'GT - DG Tons Denominator': 2000, 'GT - DG Removal Swell': 1.2,
    'GT - DG Cleanup Coverage': 0.01, 'GT - DG Placement Labor per Ton': 0.3, 'GT - DG Material Markup': 1.1,
    'DG - Machine Labor Rate': 0.5, 'GT - Aggregate Removal Swell': 1.2, 'Gravel - Machine Labor Rate': 0.5,
  }
  const r = run(
    {
      difficulty: 10, hoursAdj: 2, distanceLF: 120,
      mulchRows: [{ sf: '80', depth: '3', type: 'Standard Mulch', vendor: 'Standard', weedFabric: 'No' }],
      edgingRows: [{ lf: '40', type: 'Metal Edging', vendor: 'Standard' }],
      planterPrepRows: [{ area: '100', depthIn: '6', type: 'Compost', vendor: 'Standard', tilling: 'None' }],
      sodRows: [{ sf: '300', type: 'Marathon', vendor: 'Standard' }],
      dgRows: [{ sf: '60', depth: '2', type: 'DG Gold', method: 'Machine', cement: 'No', weedFabric: 'No' }],
      gravelRows: [{ sf: '50', depthIn: '3', type: '3/4 Gravel', method: 'Machine', weedFabric: 'No' }],
      manualRows: [{ hours: 4, materials: 50, subCost: 0 }],
    },
    mp, rows
  )
  finiteNums(r)
  assert.ok(r.price > 0, 'price is positive with priced rows')
  assert.ok(r.walkHrs > 0, 'walk-access penalty applies when distanceLF > 0')
})
