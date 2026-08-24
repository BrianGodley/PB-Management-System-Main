// Acceptance tests for the Skid Steer Demo calc (pure, no network).
//   New In-House labor model (hrs per unit, MULTIPLY — higher rate ⇒ more hours):
//     Concrete/Soil/Footing/Misc-Vert = hrs × Cu Yd
//     Misc-Flat/Compaction/Jumping-Jack = hrs × Cu Ft
//     Grade-Cut/Grade-Fill/Import-Base = hrs × Sq Ft
//   Rebar/Mesh is a yes/no toggle (+30% to concrete). Shrubs use per-height Each
//   rates. Jumping Jack + Difficulty come from the shared 'Basic Labor …' rows.
//   Sub tab is unchanged (per-ton). Reads 'Skid - …' keys.
// Run: node --test src/components/modules/skidSteerCalc.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { calcDemo } from './skidSteerCalc.js'

const fullRates = (over = {}) => ({
  'Skid - Concrete': 0.5,        // hrs / Cu Yd
  'Skid - Soil': 0.4,            // hrs / Cu Yd
  'Skid - Footing': 0.6,         // hrs / Cu Yd
  'Skid - Misc Flat': 0.02,      // hrs / Cu Ft
  'Skid - Misc Vertical': 0.65,  // hrs / Cu Yd
  'Skid - Grade Cut': 0.015,     // hrs / Sq Ft
  'Skid - Grade Fill': 0.018,    // hrs / Sq Ft
  'BAS-004-import-base-skid-steer-good': 0.018,   // hrs / Cu Ft (shared Base Prep Skid)
  'Skid - Compaction': 0.0033,   // hrs / Cu Ft
  'BAS-006-jumping-jack': 0.01, // shared, hrs / Cu Ft
  'BAS-007-difficulty-ratio': 1, // shared
  'Demo - Skid - Grass SF': 0.3, // unchanged (per 100 sf·in)
  'Demo - Skid Steer Grass': 0.3,
  'Skid - Shrubs 0-1 ft': 0.09,
  'Skid - Shrubs 1-2 ft': 0.012,
  'Skid - Shrubs 2-3 ft': 0.018,
  'Skid - Shrubs 3-4 ft': 0.24,
  'Skid - Shrubs 4-5 ft': 0.03,
  'Skid - Stump Small': 1,
  'Skid - Stump Medium': 2,
  'Skid - Stump Large': 3,
  'Skid - Stump XL': 4,
  'Skid - Tree Small': 1,
  'Skid - Tree Medium': 2,
  'Skid - Tree Large': 3,
  // Sub tab (untouched) — per-ton coefficients + shuttle still live in labor_rates
  'BAS-008-concrete-weight-lb-cf': 150,
  'Demo - Skid Steer Haul Sec/Ft': 1,
  'Demo - Skid Steer Load (CY)': 1,
  ...over,
})
const fullMat = (over = {}) => ({
  'Tons SF-in Denominator': 150,
  'Container (Low-Boy)': 500,
  'Container Capacity (CY)': 12,
  'Removal Swell': 1.3,
  'Import Base $/10cy': 300,
  'Dump Fee - Concrete': 0,
  'Dump Fee - Dirt': 0,
  'Dump Fee - Green Waste': 0,
  'Tree CY Factor': 1, // moved to master material rates (Basic Materials)
  ...over,
})
const fullSub = (over = {}) => ({
  'Sub Grade - Skid Cut SF': 1.75,
  'Sub Grade - Skid Fill SF': 1.5,
  'Sub Grade - Skid JJ SF': 1,
  'Sub Grade - Skid Sheepsfoot SF': 5,
  'Sub Grade - Skid Roll SF': 4,
  'Sub Grade - Skid SS Compact SF': 3,
  'Sub Stump - Skid Small': 100,
  'Sub Stump - Skid Medium': 200,
  'Sub Stump - Skid Large': 300,
  'Sub Stump - Skid XL': 400,
  'Sub Tree - Skid Small': 350,
  'Sub Tree - Skid Medium': 1200,
  'Sub Tree - Skid Large': 2800,
  ...over,
})
const LRPH = 75
const run = (state, lr = fullRates(), mp = fullMat(), sr = fullSub()) =>
  calcDemo({ difficulty: 0, hoursAdj: 0, distanceLF: 0, ...state }, LRPH, mp, lr, 0.35, sr, 500, null, 0.3, 0.05)

const finiteNums = obj => {
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'number') assert.ok(Number.isFinite(v), `${k} not finite: ${v}`)
  }
}

test('value: concrete hrs = Cu Yd × rate (270 SF × 12in = 10 CY × 0.5 = 5 hrs → $375)', () => {
  const r = run({ dumpType: 'In House', concSF: 270, concDepth: 12 })
  assert.equal(r.conc.hours, 5, `conc.hours got ${r.conc.hours}`)
  assert.equal(r.laborCost, 5 * LRPH, `laborCost got ${r.laborCost}`)
  finiteNums(r)
})

test('units: labor is hrs-per-Cu-Yd — doubling depth doubles hours', () => {
  const shallow = run({ dumpType: 'In House', concSF: 270, concDepth: 12 })
  const deep = run({ dumpType: 'In House', concSF: 270, concDepth: 24 })
  assert.equal(deep.laborCost, shallow.laborCost * 2, 'depth 12→24 doubles CY → doubles hours')
})

test('edit-reflects: raising the concrete rate RAISES hours (multiply model)', () => {
  const slow = run({ dumpType: 'In House', concSF: 270, concDepth: 12 }, fullRates({ 'Skid - Concrete': 0.5 }))
  const fast = run({ dumpType: 'In House', concSF: 270, concDepth: 12 }, fullRates({ 'Skid - Concrete': 1.0 }))
  assert.equal(fast.laborCost, slow.laborCost * 2, 'rate ×2 → hours ×2')
})

test('unpriced / no-fallback: an unset labor rate resolves to 0, not a hidden constant', () => {
  const r = run({ dumpType: 'In House', concSF: 270, concDepth: 12 }, fullRates({ 'Skid - Concrete': 0 }))
  assert.equal(r.conc.hours, 0, 'unset rate → 0 hours (no code fallback)')
  assert.equal(r.laborCost, 0, 'concrete-only with unset rate → $0 labor')
})

test('rebar/mesh toggle: adds 30% to concrete labor (5 hrs → 6.5 hrs)', () => {
  const off = run({ dumpType: 'In House', concSF: 270, concDepth: 12 })
  const on = run({ dumpType: 'In House', concSF: 270, concDepth: 12, rebar: true })
  assert.equal(off.conc.hours, 5)
  assert.equal(on.conc.hours, 6.5, `rebar concrete hrs got ${on.conc.hours}`)
  assert.equal(on.rebarMult, 1.3)
})

test('shrubs: per-height Each rate (10 × 2–3 ft @ 0.018 = 0.18 hrs)', () => {
  const r = run({ dumpType: 'In House', shrubRows: [{ qty: 10, height: '2-3' }] })
  assert.equal(r.shrubRowsCalc[0].hrs, 0.18, `shrub hrs got ${r.shrubRowsCalc[0].hrs}`)
  // different bucket reads a different rate (no shared base × factor)
  const r2 = run({ dumpType: 'In House', shrubRows: [{ qty: 10, height: '3-4' }] })
  assert.equal(r2.shrubRowsCalc[0].hrs, 2.4)
})

test('jumping jack: shared Basic Labor rate × Cu Ft (270 CF × 0.01 = 2.7 hrs)', () => {
  const r = run({ dumpType: 'In House', jjSF: 270, jjDepth: 12 })
  assert.equal(r.jjHrs, 2.7, `jjHrs got ${r.jjHrs}`)
  // NO-FALLBACK: unset shared rate → 0
  const r0 = run({ dumpType: 'In House', jjSF: 270, jjDepth: 12 }, fullRates({ 'BAS-006-jumping-jack': 0 }))
  assert.equal(r0.jjHrs, 0)
})

test('difficulty: shared Basic Labor ratio scales the total (20 → ×1.20)', () => {
  const base = run({ dumpType: 'In House', concSF: 270, concDepth: 12 })
  const hard = run({ dumpType: 'In House', concSF: 270, concDepth: 12, difficulty: 20 })
  assert.ok(Math.abs(hard.totalHrs - base.totalHrs * 1.2) < 1e-9, `difficulty 20 → ×1.2 (got ${hard.totalHrs})`)
})

test('sub value: grading Cut is per-SF (100 SF × $1.75 = $175)', () => {
  const r = run({ dumpType: 'Subcontractor', subGradeCutSF: 100 })
  assert.equal(r.subGradingCost, 175, `subGradingCost got ${r.subGradingCost}`)
})

test('sub value: tree priced per each by size (2× Large @ $2800 = $5600)', () => {
  const r = run({ dumpType: 'Subcontractor', subTreeRows: [{ qty: 2, size: '18" - 24"' }] })
  assert.equal(r.subTreeCost, 5600, `subTreeCost got ${r.subTreeCost}`)
})

test('add demo: two sections sum (2 × 5 hrs concrete = 10 hrs → $750)', () => {
  const r = run({
    dumpType: 'In House',
    mainDemoSections: [
      { concSF: 270, concDepth: 12 },
      { concSF: 270, concDepth: 12 },
    ],
  })
  assert.equal(r.sectionCalcs.length, 2)
  assert.equal(r.conc.hours, 10, `summed conc.hours got ${r.conc.hours}`)
  assert.equal(r.laborCost, 10 * LRPH, `laborCost got ${r.laborCost}`)
  // per-section rebar is independent
  const r2 = run({
    dumpType: 'In House',
    mainDemoSections: [
      { concSF: 270, concDepth: 12, rebar: true },
      { concSF: 270, concDepth: 12 },
    ],
  })
  assert.equal(r2.conc.hours, 6.5 + 5, `mixed-rebar conc.hours got ${r2.conc.hours}`)
})

test('add demo: flat-state fallback reproduces a single section exactly', () => {
  const flatR = run({ dumpType: 'In House', concSF: 270, concDepth: 12, grassSF: 100, grassDepth: 4, gradeCutSF: 50 })
  const secR = run({
    dumpType: 'In House',
    mainDemoSections: [{ concSF: 270, concDepth: 12, grassSF: 100, grassDepth: 4, gradeCutSF: 50 }],
  })
  assert.equal(secR.totalHrs, flatR.totalHrs, 'section-of-one totalHrs == flat totalHrs')
  assert.equal(secR.price, flatR.price, 'section-of-one price == flat price')
})

test('labor unpriced: an unset labor rate surfaces ONLY for a section in use', () => {
  const laborItems = obj => (obj.unpriced || []).filter(u => u.kind === 'labor')
  // Concrete SF entered but its labor rate ('Skid - Concrete') is unset → surfaces.
  const used = run({ dumpType: 'In House', concSF: 270, concDepth: 12 }, { 'BAS-007-difficulty-ratio': 1 })
  assert.ok(
    laborItems(used).some(u => /concrete/i.test(u.label || u.name)),
    `concrete labor should surface when concSF > 0; got ${JSON.stringify(used.unpriced)}`
  )
  // No concrete SF → the concrete labor rate is never read, so it must NOT surface.
  const unused = run({ dumpType: 'In House', concSF: 0, concDepth: 12 }, { 'BAS-007-difficulty-ratio': 1 })
  assert.ok(
    !laborItems(unused).some(u => /concrete/i.test(u.label || u.name)),
    'concrete labor must NOT surface when the section is unused'
  )
})

test('sub-independence: In-House and Sub track only their own inputs', () => {
  const ih = run({ dumpType: 'In House', concSF: 270, concDepth: 12 })
  const ihMore = run({ dumpType: 'In House', concSF: 540, concDepth: 12 })
  assert.ok(ihMore.laborCost > ih.laborCost, 'In-House labor tracks concSF')
  const sub = run({ dumpType: 'Subcontractor', subGradeCutSF: 100 })
  const subMore = run({ dumpType: 'Subcontractor', subGradeCutSF: 200 })
  assert.ok(subMore.subGradingCost > sub.subGradingCost, 'Sub grading tracks its own SF')
  const subWithConc = run({ dumpType: 'Subcontractor', subGradeCutSF: 100, concSF: 9999, concDepth: 12 })
  assert.equal(subWithConc.subGradingCost, sub.subGradingCost, 'In-House input does not leak into Sub')
})
