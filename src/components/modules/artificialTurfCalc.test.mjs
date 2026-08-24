// Acceptance tests for the pure Artificial Turf calc (no network).
//   Demo: tons = (SF / demoTonsDivisor) × inches; hrs = tons × method rate (hrs/Ton);
//   mat = tons × dumpFee. Base layers (Gravel/DG per Cu Yd, Weed per SF): qty × the base
//   Type's vendor-resolved price; hrs = SF × install rate. Turf rolls: SF = edgeLF × roll
//   width; hrs = SF × install rate; mat = SF × brand $/SF (vendor catalog). Strips: LF-based.
//   Sub tab: flat $/SF-LF sub cost, NO labor hours, base section suppressed. Unpriced ⇒ $0
//   (NO-FALLBACK). Labor rates are hrs-per-unit.
// Run: node --test src/components/modules/artificialTurfCalc.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { calcTurf } from './artificialTurfCalc.js'

const LRPH = 35
const demo0 = {
  concrete: { sf: '', inches: '4', method: 'Skid Steer Good' },
  soil: { sf: '', inches: '4', method: 'Skid Steer Good' },
  lawn: { sf: '', inches: '4', method: 'Skid Steer Good' },
}
const base = {
  subType: 'In House', difficulty: 0, hoursAdj: 0, distanceLF: 0,
  demo: demo0, baseRows: [], rolls: [{ brand: '', edgeLF: '', vendor: '', useZeoFill: false }],
  stripRows: [], manualRows: [],
}
const TURF = [{ id: 't1', name: 'Emerald 80', sub_category: 'Turf Material', category: 'Artificial Turf', vendor_id: null, unit_cost: 3 }]
// calcTurf(state, lrph, mp, lr, gpmd, walkAccess, laborBurdenPct, subRates, materialRows, catDefaults, commissionRate, sharedBaseRows)
const run = (state, mp = {}, lr = {}, materialRows = [], subRates = {}, sharedBaseRows = []) =>
  calcTurf({ ...base, ...state }, LRPH, mp, lr, 425, null, 0.29, subRates, materialRows, {}, 0.05, sharedBaseRows)

const finiteNums = obj => {
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'number') assert.ok(Number.isFinite(v), `${k} not finite: ${v}`)
  }
}
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} !≈ ${b}`)

test('turf roll value: SF = edgeLF × roll width; hrs = SF × install rate; mat = SF × brand $/SF', () => {
  const r = run(
    { rolls: [{ brand: 'Emerald 80', edgeLF: '100', vendor: 'Standard', useZeoFill: false }] },
    { 'Turf - Roll Width FT': 15 }, { 'LAB-451-turf-turf-install': 0.01 }, TURF
  )
  assert.equal(r.rollCalc[0].sf, 1500, `roll SF got ${r.rollCalc[0].sf}`) // 100 × 15
  assert.equal(r.turfHrs, 15, `turfHrs got ${r.turfHrs}`)                  // 1500 × 0.01
  assert.equal(r.turfMat, 4500, `turfMat got ${r.turfMat}`)               // 1500 × 3
})

test('turf edit-reflects: raising the install rate raises turf labor proportionally', () => {
  const a = run({ rolls: [{ brand: 'Emerald 80', edgeLF: '100', vendor: 'Standard' }] }, { 'Turf - Roll Width FT': 15 }, { 'LAB-451-turf-turf-install': 0.01 }, TURF)
  const b = run({ rolls: [{ brand: 'Emerald 80', edgeLF: '100', vendor: 'Standard' }] }, { 'Turf - Roll Width FT': 15 }, { 'LAB-451-turf-turf-install': 0.02 }, TURF)
  assert.equal(b.turfHrs, a.turfHrs * 2, 'rate ×2 → turf hrs ×2')
})

test('demo value: cy = SF × in/324; hrs = cy × method rate (hrs/CY); mat = cy × dump fee ($/CY)', () => {
  const r = run(
    { demo: { ...demo0, concrete: { sf: '1000', inches: '4', method: 'Skid Steer Good' } } },
    { 'Dump Fee - Concrete': 10 },
    { 'LAB-445-turf-demo-skid-steer-good': 0.5 }
  )
  const cy = (1000 * (4 / 12)) / 27 // ≈ 12.3457 Cu Yd
  near(r.demoCalc[0].cy, cy)
  near(r.demoHrs, cy * 0.5)
  near(r.demoCalc[0].mat, cy * 10)
})

test('base Gravel value: qty (Cu Yd) = SF × depth/12 ÷ 27; hrs = SF × install; mat = qty × Type price', () => {
  const shared = [{ name: 'Class II', sub_category: 'Base Material', vendor_id: null, unit_cost: 30 }]
  const r = run(
    { baseRows: [{ material: 'Gravel', type: 'Class II', vendor: 'Standard', sf: '1000' }] },
    { 'Turf - Class II Depth In': 3, 'Turf - Base Install': 0.005 }, {}, [], {}, shared
  )
  near(r.baseCalc[0].qty, (1000 * (3 / 12)) / 27)
  assert.equal(r.baseHrs, 5, `baseHrs got ${r.baseHrs}`) // 1000 × 0.005
  near(r.baseCalc[0].mat, ((1000 * (3 / 12)) / 27) * 30)
})

test('vendor-first base: a real vendor’s shared-row price overrides the Standard price', () => {
  const shared = [
    { name: 'Class II', sub_category: 'Base Material', vendor_id: null, unit_cost: 30 },
    { name: 'Class II', sub_category: 'Base Material', vendor_id: 'v-quarry', unit_cost: 40 },
  ]
  const std = run({ baseRows: [{ material: 'Gravel', type: 'Class II', vendor: 'Standard', sf: '1000' }] }, { 'Turf - Class II Depth In': 3, 'Turf - Base Install': 0 }, {}, [], {}, shared)
  const ven = run({ baseRows: [{ material: 'Gravel', type: 'Class II', vendor: 'v-quarry', sf: '1000' }] }, { 'Turf - Class II Depth In': 3, 'Turf - Base Install': 0 }, {}, [], {}, shared)
  const qty = (1000 * (3 / 12)) / 27
  near(std.baseCalc[0].mat, qty * 30) // Standard shared-row price
  near(ven.baseCalc[0].mat, qty * 40) // vendor shared-row price overrides
  assert.ok(ven.baseCalc[0].mat > std.baseCalc[0].mat, 'vendor price is higher here')
})

test('material NO-FALLBACK: an unpriced turf brand / unset demo divisor → $0 (no hidden constant)', () => {
  const noPrice = run({ rolls: [{ brand: 'Emerald 80', edgeLF: '100', vendor: 'Standard' }] }, { 'Turf - Roll Width FT': 15 }, { 'LAB-451-turf-turf-install': 0.01 }, []) // empty catalog
  assert.equal(noPrice.turfMat, 0, 'no catalog price → $0 turf material')
  assert.equal(noPrice.turfHrs, 15, 'labor still computes from the geometry + rate')
  // Demo now computes Cu Yd straight from geometry (no divisor) — always finite.
  const demoOnly = run({ demo: { ...demo0, concrete: { sf: '1000', inches: '4', method: 'Skid Steer Good' } } }, {}, { 'LAB-445-turf-demo-skid-steer-good': 0.5 })
  const cy = (1000 * (4 / 12)) / 27
  near(demoOnly.demoCalc[0].cy, cy)
  near(demoOnly.demoHrs, cy * 0.5)
})

test('sub tab: rolls price as flat $/SF sub cost, NO labor hours, base section suppressed', () => {
  const r = run(
    { subType: 'Subcontractor', rolls: [{ brand: 'Emerald 80', installSF: '1000', edgeLF: '0', vendor: 'Standard' }],
      baseRows: [{ material: 'Gravel', type: 'Class II', vendor: 'Standard', sf: '1000' }] },
    { 'Turf - Roll Width FT': 15, 'Turf - Base Install': 0.005 }, { 'LAB-451-turf-turf-install': 0.01 }, TURF,
    { 'Turf Sub - Install Per SF': 2 }
  )
  assert.equal(r.turfHrs, 0, 'sub tab has no turf labor hours')
  assert.equal(r.baseHrs, 0, 'sub tab suppresses the base section')
  assert.equal(r.totalHrs, 0, 'sub tab has no labor hours at all')
  // rowSubCost = installSF × (subInstall + brand $/SF) = 1000 × (2 + 3) = 5000
  assert.equal(r.subTurfCost, 5000, `subTurfCost got ${r.subTurfCost}`)
  assert.ok(r.subCost >= 5000, 'sub cost includes the flat turf sub cost')
  finiteNums(r)
})

test('labor unpriced: an unset labor rate surfaces ONLY for a section in use (in-house)', () => {
  const laborItems = obj => (obj.unpriced || []).filter(u => u.kind === 'labor')
  // A turf roll with SF entered but its install labor rate unset → surfaces.
  const used = run({ rolls: [{ brand: 'Emerald 80', edgeLF: '100', vendor: 'Standard' }] }, { 'Turf - Roll Width FT': 15 }, {}, TURF)
  assert.ok(
    laborItems(used).some(u => /turf install/i.test(u.label || u.name || '')),
    `turf install labor surfaces when a roll has SF; got ${JSON.stringify(used.unpriced)}`
  )
  // Same roll on the Sub tab (flat-priced, no in-house hours) → labor must NOT surface.
  const sub = run(
    { subType: 'Subcontractor', rolls: [{ brand: 'Emerald 80', installSF: '1000', edgeLF: '0', vendor: 'Standard' }] },
    { 'Turf - Roll Width FT': 15 }, {}, TURF, { 'Turf Sub - Install Per SF': 2 }
  )
  assert.equal(laborItems(sub).length, 0, `Sub tab surfaces no in-house labor; got ${JSON.stringify(sub.unpriced)}`)
})

test('no NaN across a populated estimate (demo + base + roll + strip + manual, difficulty + walk-access)', () => {
  const shared = [{ name: 'Class II', sub_category: 'Base Material', vendor_id: null, unit_cost: 30 }]
  const r = run(
    {
      difficulty: 10, hoursAdj: 2, distanceLF: 120,
      demo: { ...demo0, concrete: { sf: '800', inches: '4', method: 'Hand' } },
      baseRows: [{ material: 'Gravel', type: 'Class II', vendor: 'Standard', sf: '800' }],
      rolls: [{ brand: 'Emerald 80', edgeLF: '60', vendor: 'Standard', useZeoFill: false }],
      stripRows: [{ lf: '20', widthIn: '12', brand: 'Emerald 80', vendor: 'Standard' }],
      manualRows: [{ hours: 4, materials: 50, subCost: 0 }],
    },
    { 'Turf - Roll Width FT': 15, 'Turf - Class II Depth In': 3, 'Turf - Base Install': 0.005, 'Turf - Demo Tons Divisor': 100, 'Dump Fee - Concrete': 10, 'Turf - Infill Durafill': 0.5 },
    { 'LAB-451-turf-turf-install': 0.01, 'LAB-450-turf-strip-install': 0.08, 'LAB-443-turf-demo-hand': 1.5 },
    TURF, {}, shared
  )
  finiteNums(r)
  assert.ok(r.price > 0, 'price is positive with priced rows')
  assert.ok(r.walkHrs > 0, 'walk-access penalty applies when distanceLF > 0')
})
