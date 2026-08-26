// Acceptance tests for the pure Pool calc (no network).
//   Excavation: CY = (waterSF × avgDepth / 27) × swell; In-House hrs = CY × equip rate
//   (labor_rates['Excavation - …']); Sub = subRate × CY (or flat). Water Features: hrs =
//   qty × labor_rates[item.calc_meta.labor_rate]; mat = qty × item.unit_cost (vendor catalog).
//   Coefficients (avg-depth ratio, swells, tile coverage) read live from materialPrices; NO
//   hardcoded rate fallbacks (unset ⇒ 0). Sub tab moves the module's in-house hours to $0.
// Run: node --test src/components/modules/poolCalc.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { calcPool } from './poolCalc.js'

const off = () => ({ enabled: false })
const base = () => ({
  pool: off(), spa: off(), vault: off(), basin: off(), trough: off(),
  excavation: {}, shotcrete: {}, tile: {}, interiorFinish: {}, plumbing: {}, steel: {},
  spillways: [], waterFeatures: [], copingRows: [], raisedSurfaces: [], equipment: [], manualRows: [],
  epLineRows: [], epGasRows: [], epWireRows: [], epElecRows: [], epTrenchRows: [], gasFixtureRows: [],
  laborRatePerHour: 75, laborBurdenPct: 0.3, gpmd: 500, commissionRate: 0.05, subGpMarkupRate: 0.2,
  subType: 'In House', rateOverrides: {},
})
// calcPool(state, materialPrices, laborRates, subRates, walkAccess, materialRows)
const run = (state, mp = {}, lr = {}, subRates = {}, materialRows = []) =>
  calcPool({ ...base(), ...state }, mp, lr, subRates, null, materialRows)

const finiteNums = obj => { for (const [k, v] of Object.entries(obj)) if (typeof v === 'number') assert.ok(Number.isFinite(v), `${k} not finite: ${v}`) }
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} !≈ ${b}`)

// Coefficients used across the excavation tests.
const EXC_MP = { 'Pool Avg Depth Ratio': 0.5, 'Pool Excavation Swell Factor': 1, 'Pool Shotcrete Shell Thickness': 0, 'Pool Shotcrete Swell Factor': 1 }

test('excavation In-House: CY = (waterSF × avgDepth / 27) × swell; hrs = CY × equip rate', () => {
  const r = run(
    { pool: { enabled: true, waterSF: '400', maxDepth: '6', perimLF: '0' }, excavation: { equipment: 'Hand Dig' } },
    EXC_MP, { 'LAB-392-skid-soil': 0.5 }
  )
  // avgDepth = 6 × 0.5 = 3; CY = (400 × 3 / 27) × 1 = 44.444…
  near(r.totalExcavCY, (400 * 3 / 27) * 1)
  near(r.excavHrs, ((400 * 3) / 27) * 0.5)
  assert.ok(r.price > 0, 'a priced excavation produces a positive price')
  finiteNums(r)
})

test('excavation edit-reflects: raising the equipment CY rate raises excavation hours', () => {
  const a = run({ pool: { enabled: true, waterSF: '400', maxDepth: '6', perimLF: '0' }, excavation: { equipment: 'Hand Dig' } }, EXC_MP, { 'LAB-392-skid-soil': 0.5 })
  const b = run({ pool: { enabled: true, waterSF: '400', maxDepth: '6', perimLF: '0' }, excavation: { equipment: 'Hand Dig' } }, EXC_MP, { 'LAB-392-skid-soil': 1.0 })
  near(b.excavHrs, a.excavHrs * 2)
})

test('excavation Sub: subRate per Cu Yd × dug volume, zero In-House excavation hours', () => {
  const r = run(
    { pool: { enabled: true, waterSF: '400', maxDepth: '6', perimLF: '0' },
      excavation: { mode: 'Sub', equipment: 'Hand Dig', subRate: '20', subRateUnit: 'per yd' } },
    EXC_MP, { 'LAB-392-skid-soil': 0.5 }
  )
  assert.equal(r.excavHrs, 0, 'sub tab has no In-House excavation hours')
  near(r.excavAutoSub, 20 * ((400 * 3) / 27)) // $20/CY × CY
})

test('water features value: hrs = qty × item labor rate; mat = qty × item unit_cost (vendor catalog)', () => {
  const rows = [{
    id: 'wf1', name: 'Sheer Descent 24in', sub_category: 'Water Features', category: 'Pool',
    vendor_id: null, unit_cost: 500, calc_meta: { water_feature_type: 'Sheer Descents', labor_rate: 'Pool - Sheer Descent Labor' },
  }]
  const r = run(
    { waterFeatures: [{ vendor: 'Standard', wfType: 'Sheer Descents', type: 'Sheer Descent 24in', qty: '2' }] },
    {}, { 'Pool - Sheer Descent Labor': 12 }, {}, rows
  )
  assert.equal(r.waterFeatureMat, 2 * 500, `waterFeatureMat got ${r.waterFeatureMat}`)
  assert.equal(r.waterFeatureHrs, 2 * 12, `waterFeatureHrs got ${r.waterFeatureHrs}`)
  assert.equal(r.waterFeatureCalc.length, 1, 'per-row breakdown emitted for the summary')
})

test('M5 ref_key parity: a water feature picked by material ref_key resolves the same material + labor as by name', () => {
  const rows = [{
    id: 'wf1', ref_key: 'MAT-600-sheer-descent-24in', name: 'Sheer Descent 24in',
    sub_category: 'Water Features', category: 'Pool', vendor_id: null, unit_cost: 500,
    calc_meta: { water_feature_type: 'Sheer Descents', labor_rate: 'Pool - Sheer Descent Labor' },
  }]
  const lr = { 'Pool - Sheer Descent Labor': 12 }
  const byName = run({ waterFeatures: [{ vendor: 'Standard', wfType: 'Sheer Descents', type: 'Sheer Descent 24in', qty: '2' }] }, {}, lr, {}, rows)
  const byRef = run({ waterFeatures: [{ vendor: 'Standard', wfType: 'Sheer Descents', type: 'MAT-600-sheer-descent-24in', qty: '2' }] }, {}, lr, {}, rows)
  assert.equal(byRef.waterFeatureMat, byName.waterFeatureMat, `material should match; got ${byRef.waterFeatureMat} vs ${byName.waterFeatureMat}`)
  assert.equal(byRef.waterFeatureMat, 1000, `2 × $500 = $1000; got ${byRef.waterFeatureMat}`)
  assert.equal(byRef.waterFeatureHrs, byName.waterFeatureHrs, 'labor identical regardless of key form')
  // The summary breakdown resolves the ref_key back to the item's name.
  assert.equal(byRef.waterFeatureCalc[0].label, 'Sheer Descent 24in', `label resolves to name; got ${byRef.waterFeatureCalc[0].label}`)
})

test('material NO-FALLBACK: an unpriced water feature (no catalog row) → $0 material, 0 labor', () => {
  const r = run(
    { waterFeatures: [{ vendor: 'Standard', wfType: 'Sheer Descents', type: 'Sheer Descent 24in', qty: '2' }] },
    {}, {}, {}, [] // empty catalog
  )
  assert.equal(r.waterFeatureMat, 0, 'no catalog item → $0 material (no hidden constant)')
  assert.equal(r.waterFeatureHrs, 0, 'no resolvable labor rate → 0 hours')
})

test('excavation NO-FALLBACK: unset equipment CY rate → 0 excavation hours (no constant)', () => {
  const r = run(
    { pool: { enabled: true, waterSF: '400', maxDepth: '6', perimLF: '0' }, excavation: { equipment: 'Hand Dig' } },
    EXC_MP, {} // no Excavation rate
  )
  assert.ok(r.totalExcavCY > 0, 'volume still computes from geometry')
  assert.equal(r.excavHrs, 0, 'unset equip rate → 0 hours')
})

test('excavation defaults to In-House; setting its own mode to Sub zeroes its hours', () => {
  // Excavation now DEFAULTS to In-House regardless of the module tab; only its own
  // per-section toggle (mode: 'Sub') subs it out.
  const dflt = run({ pool: { enabled: true, waterSF: '400', maxDepth: '6', perimLF: '0' }, excavation: { equipment: 'Hand Dig' } }, EXC_MP, { 'LAB-392-skid-soil': 0.5 })
  const sub = run({ pool: { enabled: true, waterSF: '400', maxDepth: '6', perimLF: '0' }, excavation: { mode: 'Sub', equipment: 'Hand Dig', subRate: '20', subRateUnit: 'per yd' } }, EXC_MP, { 'LAB-392-skid-soil': 0.5 })
  assert.equal(dflt.excMode, 'In House', 'unset excavation mode defaults to In House')
  assert.ok(dflt.excavHrs > 0, 'In-House excavation charges equipment hours')
  assert.equal(sub.excavHrs, 0, 'mode Sub charges a flat sub cost, no In-House hours')
  finiteNums(sub)
})

test('excavation In-House + Sub Haul: haul = CY × $/CY (55), posts as MATERIAL; equipment hrs still charged', () => {
  const r = run(
    { pool: { enabled: true, waterSF: '400', maxDepth: '6', perimLF: '0' },
      excavation: { mode: 'In House', equipment: 'Hand Dig', haulMethod: 'Sub Haul' } },
    EXC_MP, { 'LAB-392-skid-soil': 0.5 }, { 'Excavation - Sub Haul per Cu Yd': 55 }
  )
  const cy = (400 * 3) / 27
  near(r.excavHaulMat, cy * 55, 1e-6) // Sub Haul priced by the yard
  near(r.excavHrs, cy * 0.5, 1e-6) // In-House still digs (labor hours)
  assert.ok(r.totalMat >= cy * 55 - 1e-6, 'haul cost posts as material (In-House total)')
  assert.equal(r.excavSub, 0, 'In-House excavation adds nothing to subCost')
})

test('excavation Haul Method: Sub Haul = CY × $/CY (55); Containers = ceil(CY÷10) × $/container (70)', () => {
  const st = { pool: { enabled: true, waterSF: '400', maxDepth: '6', perimLF: '0' }, excavation: { mode: 'In House', equipment: 'Hand Dig' } }
  const rates = { 'Excavation - Sub Haul per Cu Yd': 55, 'Excavation - Roll Off per Container': 70 }
  const subHaul = run({ ...st, excavation: { ...st.excavation, haulMethod: 'Sub Haul' } }, EXC_MP, { 'LAB-392-skid-soil': 0.5 }, rates)
  const cont = run({ ...st, excavation: { ...st.excavation, haulMethod: 'Containers' } }, EXC_MP, { 'LAB-392-skid-soil': 0.5 }, rates)
  const cy = (400 * 3) / 27
  near(subHaul.excavHaulMat, cy * 55, 1e-6)
  assert.equal(cont.haulContainers, Math.ceil(cy / 10), 'containers = ceil(yards ÷ 10)')
  near(cont.excavHaulMat, Math.ceil(cy / 10) * 70, 1e-6)
})

test('excavation mode "Sub" (on the In-House module tab): equipment/haul off, flat sub cost only', () => {
  const r = run(
    { pool: { enabled: true, waterSF: '400', maxDepth: '6', perimLF: '0' },
      excavation: { mode: 'Sub', equipment: 'Hand Dig', haulMethod: 'Containers', subRate: '20', subRateUnit: 'per yd' } },
    EXC_MP, { 'LAB-392-skid-soil': 0.5 }, { 'Excavation - Roll Off per Container': 70 }
  )
  assert.equal(r.excavHrs, 0, 'subbed excavation charges no In-House hours')
  assert.equal(r.excavHaulMat, 0, 'subbed excavation charges no separate haul (all-in sub)')
  near(r.excavSub, 20 * ((400 * 3) / 27), 1e-6) // $/CY sub cost
})

test('haul NO-FALLBACK: a haul method with no seeded rate → $0 haul (no constant)', () => {
  const r = run(
    { pool: { enabled: true, waterSF: '400', maxDepth: '6', perimLF: '0' }, excavation: { mode: 'In House', equipment: 'Hand Dig', haulMethod: 'Sub Haul' } },
    EXC_MP, { 'LAB-392-skid-soil': 0.5 }, {} // no haul rate seeded
  )
  assert.equal(r.excavHaulMat, 0, 'unset haul rate → $0 (no hidden 55/70 constant)')
})

test('shotcrete In-House: material = CY × Type $/CY (Concrete Mix catalog) + labor = CY × 2 hrs/CY', () => {
  const mp = { 'Pool Avg Depth Ratio': 0.5, 'Pool Shotcrete Shell Thickness': 0.5, 'Pool Shotcrete Swell Factor': 1, 'Pool Excavation Swell Factor': 1 }
  const rows = [{ id: 'tm', name: 'Truck Mix Concrete', sub_category: 'Concrete Mix', vendor_id: null, unit_cost: 200 }]
  const r = run(
    { pool: { enabled: true, waterSF: '400', maxDepth: '6', perimLF: '80' }, shotcrete: { vendor: 'Standard', type: 'Truck Mix Concrete' } },
    mp, { 'LAB-349-pool-shotcrete-labor': 2 }, {}, rows
  )
  const bot = (400 * 0.5) / 27
  const wall = (80 * (6 * 0.5) * 0.5) / 27
  const cy = (bot + wall) * 1
  near(r.totalShotCY, cy, 1e-6)
  near(r.shotcreteMat, cy * 200, 1e-4)   // vendor concrete $/CY
  near(r.shotcreteHrs, cy * 2, 1e-6)     // 2 hrs per Cu Yd
  assert.equal(r.shotcreteSub, 0, 'In-House tab: shotcrete is NOT an auto sub')
})

test('shotcrete edit-reflects + NO-FALLBACK: labor scales with the rate; unset rate → 0 hrs', () => {
  const mp = { 'Pool Avg Depth Ratio': 0.5, 'Pool Shotcrete Shell Thickness': 0.5, 'Pool Shotcrete Swell Factor': 1 }
  const rows = [{ id: 'tm', name: 'Truck Mix Concrete', sub_category: 'Concrete Mix', vendor_id: null, unit_cost: 200 }]
  const st = { pool: { enabled: true, waterSF: '400', maxDepth: '6', perimLF: '80' }, shotcrete: { vendor: 'Standard', type: 'Truck Mix Concrete' } }
  const a = run(st, mp, { 'LAB-349-pool-shotcrete-labor': 2 }, {}, rows)
  const b = run(st, mp, { 'LAB-349-pool-shotcrete-labor': 4 }, {}, rows)
  near(b.shotcreteHrs, a.shotcreteHrs * 2)
  const none = run(st, mp, {}, {}, rows)
  assert.equal(none.shotcreteHrs, 0, 'unset Pool - Shotcrete Labor → 0 hrs (no constant)')
})

test('shotcrete on the Sub tab stays an auto sub; no in-house shotcrete material/labor', () => {
  const mp = { 'Pool Avg Depth Ratio': 0.5, 'Pool Shotcrete Shell Thickness': 0.5, 'Pool Shotcrete Swell Factor': 1 }
  const rows = [{ id: 'tm', name: 'Truck Mix Concrete', sub_category: 'Concrete Mix', vendor_id: null, unit_cost: 200 }]
  const r = run(
    { subType: 'Subcontractor', pool: { enabled: true, waterSF: '400', maxDepth: '6', perimLF: '80' }, shotcrete: { vendor: 'Standard', type: 'Truck Mix Concrete' } },
    mp, { 'LAB-349-pool-shotcrete-labor': 2 }, { 'Shotcrete Material': 100, 'Shotcrete Labor': 30, 'Shotcrete Minimum Labor': 500 }, rows
  )
  assert.equal(r.shotcreteMat, 0, 'Sub tab: no in-house shotcrete material')
  assert.equal(r.shotcreteHrs, 0, 'Sub tab: no in-house shotcrete labor')
  assert.ok(r.shotcreteSub > 0, 'Sub tab keeps the auto shotcrete sub')
})

test('no NaN across a populated estimate (excavation + water feature + manual)', () => {
  const rows = [{ id: 'wf1', name: 'Sheer Descent 24in', sub_category: 'Water Features', category: 'Pool', vendor_id: null, unit_cost: 500, calc_meta: { water_feature_type: 'Sheer Descents', labor_rate: 'Pool - Sheer Descent Labor' } }]
  const r = run(
    {
      pool: { enabled: true, waterSF: '450', maxDepth: '6', perimLF: '90' },
      excavation: { equipment: 'Hand Dig' },
      waterFeatures: [{ vendor: 'Standard', wfType: 'Sheer Descents', type: 'Sheer Descent 24in', qty: '2' }],
      manualRows: [{ hours: 4, materials: 50, subCost: 0 }],
    },
    { ...EXC_MP, 'Pool Shotcrete Shell Thickness': 0.5 }, { 'LAB-392-skid-soil': 0.5, 'Pool - Sheer Descent Labor': 12 }, {}, rows
  )
  finiteNums(r)
  assert.ok(r.price > 0, 'price is positive with priced sections')
})

test('steel/rebar In-House: no ReferenceError; rebar mat = shell SF × LF/SF × Reinforcement $/LF; hrs = LF × steel-install rate', () => {
  // Guards the 'REINFORCEMENT_SUBCAT is not defined' crash: entering steel SF +
  // LF/SF invokes the Reinforcement catalog lookup, which threw because the calc
  // referenced consts only defined in PoolModule.jsx.
  const rows = [
    { id: 'rb4', name: 'Rebar #4', sub_category: 'Reinforcement', category: 'Basic Materials', vendor_id: null, unit_cost: 0.9, ref_key: 'MAT-029-rebar-4' },
  ]
  const r = run(
    { steel: { sf: '100', lfPerSf: '1.5', vendor: 'Standard', rebarSize: 'Rebar #4' } },
    {}, { 'LAB-410-steel-install': 0.02 }, {}, rows
  )
  finiteNums(r)
  assert.equal(r.steelLF, 150) // 100 × 1.5
  assert.ok(Math.abs(r.steelMat - 150 * 0.9) < 1e-9, 'rebar material = LF × $/LF')
  assert.ok(Math.abs(r.steelHrs - 150 * 0.02) < 1e-9, 'steel hours = LF × install rate')
})

test('trench section (POOL_TRENCH_LABOR) does not throw and prices hrs = Cu Ft × rate', () => {
  // Regression: the pure calc must define POOL_TRENCH_LABOR (was only in PoolModule),
  // else entering a trench depth threw ReferenceError and crashed the whole section.
  const mp = { 'Utilities Trench Excavation': 0.1, 'Utilities Hand Excavation': 0.2 }
  // 10 LF × (12/12) × (12/12) = 10 Cu Ft × 0.1 hrs/CF = 1 hr.
  const r = run({ epTrenchRows: [{ equipment: 'Trench', lf: '10', width: '12', depth: '12' }] }, mp)
  finiteNums(r)
  assert.ok(r.totalHrs >= 1 - 1e-9, `trench hrs should include 10 CF × 0.1 = 1; got totalHrs ${r.totalHrs}`)
})
