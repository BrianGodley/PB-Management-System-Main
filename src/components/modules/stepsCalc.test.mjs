// Acceptance tests for the pure Steps calc (no network).
//   Material step sections (Paver/Brick/Tile/Flag): labor = SF × labor_rates['Steps - <form>']
//   (hrs per Ln Ft); material = SF × the picked catalog item's unit_cost (vendor-first →
//   Standard = null-vendor row). Concrete steps: labor = LF × (typeHrs + finishHrs) ×
//   formMult; material = LF × (typeMat + finishMat), name-keyed. Sub rows: flat $/LF.
//   NO-FALLBACK: a picked step whose catalog item doesn't resolve adds $0 material (no
//   hidden constant); labor still comes from the rate.
// Run: node --test src/components/modules/stepsCalc.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { calcSteps } from './stepsCalc.js'

const LRPH = 75
const PAVER = { id: 'p1', name: 'Ashlar Paver', sub_category: 'Paver Material', vendor_id: null, unit_cost: 8, sf_per_pallet: 120 }
const base = {
  subType: 'In House',
  paverRows: [], brickRows: [], tileRows: [], flagRows: [],
  subPaverRows: [], subBrickRows: [], subTileRows: [], subFlagRows: [],
  concRows: [], subConcRows: [], manualRows: [], subManualRows: [],
  difficulty: 0, hoursAdj: 0, distanceLF: 0,
}
// calcSteps(state, lrph, laborRates, materialRates, materialRows, gpmd, walkAccess, laborBurdenPct, subGpMarkupRate, commissionRate)
const run = (state, lr = {}, mr = {}, materialRows = []) =>
  calcSteps({ ...base, ...state }, LRPH, lr, mr, materialRows, 500, null, 0.3, 0.35, 0.05)

const finiteNums = obj => {
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'number') assert.ok(Number.isFinite(v), `${k} not finite: ${v}`)
  }
}

test('paver step value: labor = SF × form rate, material = SF × item price (100 SF × 0.5 = 50 hrs; × $8 = $800)', () => {
  const r = run(
    { paverRows: [{ vendor: 'Standard', type: 'Ashlar Paver', form: 'Straight', sf: 100 }] },
    { 'LAB-425-steps-straight': 0.5 },
    {},
    [PAVER]
  )
  assert.equal(r.totalHrs, 50, `totalHrs got ${r.totalHrs}`)
  assert.equal(r.laborCost, 50 * LRPH, `laborCost got ${r.laborCost}`)
  assert.equal(r.stepMat, 800, `stepMat got ${r.stepMat}`)
  assert.equal(r.pallets, 1, `pallets = ceil(100/120) = 1; got ${r.pallets}`)
  finiteNums(r)
})

test('paver edit-reflects: raising the form labor rate raises labor proportionally', () => {
  const a = run({ paverRows: [{ vendor: 'Standard', type: 'Ashlar Paver', form: 'Straight', sf: 100 }] }, { 'LAB-425-steps-straight': 0.5 }, {}, [PAVER])
  const b = run({ paverRows: [{ vendor: 'Standard', type: 'Ashlar Paver', form: 'Straight', sf: 100 }] }, { 'LAB-425-steps-straight': 1.0 }, {}, [PAVER])
  assert.equal(b.laborCost, a.laborCost * 2, 'rate ×2 → labor ×2')
})

test('concrete step value: labor = LF × (type + finish) × formMult; material = LF × (typeMat + finishMat)', () => {
  const r = run(
    { concRows: [{ type: 'Standard', form: 'Straight', sf: 100, finish: 'Smooth' }] },
    { 'LAB-416-steps-conc-standard-hrs-per-sq-ft': 0.9, 'LAB-424-steps-finish-smooth-hrs-per-sq-ft': 0.1, 'LAB-414-steps-conc-form-straight': 1 },
    { 'Steps - Conc Standard $ per Sq Ft': 5, 'Steps - Finish Smooth $ per Sq Ft': 1 }
  )
  assert.equal(r.totalHrs, 100, `totalHrs got ${r.totalHrs}`) // 100 × (0.9+0.1) × 1
  assert.equal(r.concMat, 600, `concMat got ${r.concMat}`)    // 100 × (5+1)
})

test('concrete edit-reflects: raising the finish material rate raises material', () => {
  const rates = { 'LAB-416-steps-conc-standard-hrs-per-sq-ft': 0.9, 'LAB-424-steps-finish-smooth-hrs-per-sq-ft': 0.1, 'LAB-414-steps-conc-form-straight': 1 }
  const a = run({ concRows: [{ type: 'Standard', form: 'Straight', sf: 100, finish: 'Smooth' }] }, rates, { 'Steps - Conc Standard $ per Sq Ft': 5, 'Steps - Finish Smooth $ per Sq Ft': 1 })
  const b = run({ concRows: [{ type: 'Standard', form: 'Straight', sf: 100, finish: 'Smooth' }] }, rates, { 'Steps - Conc Standard $ per Sq Ft': 5, 'Steps - Finish Smooth $ per Sq Ft': 3 })
  assert.equal(b.concMat, a.concMat + 100 * 2, 'finish mat +$2/SF over 100 SF → +$200')
})

test('material NO-FALLBACK: a picked paver step with no catalog item → $0 material (labor still priced)', () => {
  const r = run(
    { paverRows: [{ vendor: 'Standard', type: 'Ashlar Paver', form: 'Straight', sf: 100 }] },
    { 'LAB-425-steps-straight': 0.5 },
    {},
    [] // empty catalog → item doesn't resolve
  )
  assert.equal(r.stepMat, 0, 'no resolvable catalog price → $0 material (no hidden constant)')
  assert.equal(r.totalHrs, 50, 'labor still comes from the rate')
})

test('sub tab: sub rows price flat $/LF, independent of In-House labor rows', () => {
  const r = run(
    { subType: 'Subcontractor', subPaverRows: [{ type: 'X', form: 'Straight', sf: 100, grouted: false }] },
    {},
    { 'Steps - Sub Paver Base': 2, 'Steps - Sub Form Straight': 0.5 }
  )
  assert.equal(r.subStepCost, 250, `subStepCost = 100 × (2 + 0.5) = 250; got ${r.subStepCost}`)
  assert.ok(r.subCost >= 250, 'sub cost includes the flat step cost')
  assert.equal(r.totalHrs, 0, 'no In-House rows → no labor (sub rows never add labor hours)')
  finiteNums(r)
})

test('no NaN across a populated estimate (paver + concrete + sub + manual)', () => {
  const r = run(
    {
      paverRows: [{ vendor: 'Standard', type: 'Ashlar Paver', form: 'Straight', sf: 80 }],
      concRows: [{ type: 'Standard', form: 'Straight', sf: 40, finish: 'Broom' }],
      subPaverRows: [{ type: 'X', form: 'Curved', sf: 30 }],
      manualRows: [{ hours: 4, materials: 50, subCost: 0 }],
      distanceLF: 120,
    },
    { 'LAB-425-steps-straight': 0.5, 'LAB-416-steps-conc-standard-hrs-per-sq-ft': 0.9, 'LAB-420-steps-finish-broom-hrs-per-sq-ft': 0.1, 'LAB-414-steps-conc-form-straight': 1 },
    { 'Steps - Conc Standard $ per Sq Ft': 5, 'Steps - Finish Broom $ per Sq Ft': 1, 'Steps - Sub Paver Base': 2 },
    [PAVER]
  )
  finiteNums(r)
  assert.ok(r.price >= 0, 'price is a non-negative number')
  assert.ok(r.walkHrs > 0, 'walk-access penalty applies when distanceLF > 0')
})
