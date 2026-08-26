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
const PAVER = { id: 'p1', name: 'Ashlar Paver', sub_category: 'Paver Material', vendor_id: null, unit_cost: 8, sf_per_pallet: 120, ref_key: 'MAT-501-ashlar-paver' }
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
    { 'LAB-425-steps-paver-straight': 0.5 },
    {},
    [PAVER]
  )
  assert.equal(r.totalHrs, 50, `totalHrs got ${r.totalHrs}`)
  assert.equal(r.laborCost, 50 * LRPH, `laborCost got ${r.laborCost}`)
  assert.equal(r.stepMat, 800, `stepMat got ${r.stepMat}`)
  assert.equal(r.pallets, 1, `pallets = ceil(100/120) = 1; got ${r.pallets}`)
  finiteNums(r)
})

test('M5 ref_key parity: a paver step picked by material ref_key resolves the same price as by name', () => {
  const byName = run(
    { paverRows: [{ vendor: 'Standard', type: 'Ashlar Paver', form: 'Straight', sf: 100 }] },
    { 'LAB-425-steps-paver-straight': 0.5 }, {}, [PAVER]
  )
  const byRef = run(
    { paverRows: [{ vendor: 'Standard', type: 'MAT-501-ashlar-paver', form: 'Straight', sf: 100 }] },
    { 'LAB-425-steps-paver-straight': 0.5 }, {}, [PAVER]
  )
  assert.equal(byRef.stepMat, byName.stepMat, `ref_key material should match name material; got ${byRef.stepMat} vs ${byName.stepMat}`)
  assert.equal(byRef.stepMat, 800, `100 SF × $8 = $800; got ${byRef.stepMat}`)
  assert.equal(byRef.totalHrs, byName.totalHrs, 'labor identical regardless of key form')
})

test('paver edit-reflects: raising the form labor rate raises labor proportionally', () => {
  const a = run({ paverRows: [{ vendor: 'Standard', type: 'Ashlar Paver', form: 'Straight', sf: 100 }] }, { 'LAB-425-steps-paver-straight': 0.5 }, {}, [PAVER])
  const b = run({ paverRows: [{ vendor: 'Standard', type: 'Ashlar Paver', form: 'Straight', sf: 100 }] }, { 'LAB-425-steps-paver-straight': 1.0 }, {}, [PAVER])
  assert.equal(b.laborCost, a.laborCost * 2, 'rate ×2 → labor ×2')
})

test('brick/tile steps price off their OWN straight base rate; Curved = +20% form multiplier', () => {
  // Brick straight: base 1.5 × formMult 1 (unset) = 150.
  const brick = run(
    { brickRows: [{ vendor: 'Standard', type: 'X', form: 'Straight', sf: 100 }] },
    { 'LAB-434-steps-brick-straight': 1.5, 'LAB-425-steps-paver-straight': 0.6667 },
    {}, []
  )
  assert.equal(brick.totalHrs, 150, `brick 100 × 1.5 × 1 = 150 (own straight rate, not paver); got ${brick.totalHrs}`)
  // Tile CURVED: base straight rate 3 × the shared curved multiplier 1.2 = 360 —
  // Curved is a modifier, no standalone curved rate.
  const tile = run(
    { tileRows: [{ vendor: 'Standard', type: 'X', form: 'Curved', sf: 100 }] },
    { 'LAB-436-steps-tile-straight': 3, 'LAB-413-steps-conc-form-curved': 1.2 },
    {}, []
  )
  assert.equal(tile.totalHrs, 360, `tile 100 × 3 × 1.2 (curved modifier) = 360; got ${tile.totalHrs}`)
})

test('flagstone steps price off their OWN rate (2 hrs/LF); Curved = +20% form modifier', () => {
  const FLAG = { id: 'f1', name: 'Arizona Flagstone', sub_category: 'Flagstone', vendor_id: null, unit_cost: 6, ref_key: 'MAT-098-flagstone-flatwork' }
  // Straight: base 2 × formMult 1 (unset) = 200 hrs over 100 LF.
  const straight = run(
    { flagRows: [{ vendor: 'Standard', type: 'Arizona Flagstone', form: 'Straight', sf: 100 }] },
    { 'LAB-438-steps-flagstone': 2 },
    {}, [FLAG]
  )
  assert.equal(straight.totalHrs, 200, `flag 100 × 2 × 1 = 200 (own rate, not paver); got ${straight.totalHrs}`)
  assert.equal(straight.stepMat, 600, `100 SF × $6 = $600; got ${straight.stepMat}`)
  // Curved: base 2 × the shared curved multiplier 1.2 = 240 — no standalone curved rate.
  const curved = run(
    { flagRows: [{ vendor: 'Standard', type: 'Arizona Flagstone', form: 'Curved', sf: 100 }] },
    { 'LAB-438-steps-flagstone': 2, 'LAB-413-steps-conc-form-curved': 1.2 },
    {}, [FLAG]
  )
  assert.equal(curved.totalHrs, 240, `flag 100 × 2 × 1.2 (curved modifier) = 240; got ${curved.totalHrs}`)
})

test('concrete step value: labor = LF × (type + finish) × formMult; material = LF × (typeMat + finishMat)', () => {
  const r = run(
    { concRows: [{ type: 'Standard', form: 'Straight', sf: 100, finish: 'Smooth' }] },
    { 'LAB-416-steps-conc-standard': 0.9, 'LAB-424-steps-finish-smooth': 0.1, 'LAB-414-steps-conc-form-straight': 1 },
    { 'Steps - Conc Standard $ per Sq Ft': 5, 'Steps - Finish Smooth $ per Sq Ft': 1 }
  )
  assert.equal(r.totalHrs, 100, `totalHrs got ${r.totalHrs}`) // 100 × (0.9+0.1) × 1
  assert.equal(r.concMat, 600, `concMat got ${r.concMat}`)    // 100 × (5+1)
})

test('concrete edit-reflects: raising the finish material rate raises material', () => {
  const rates = { 'LAB-416-steps-conc-standard': 0.9, 'LAB-424-steps-finish-smooth': 0.1, 'LAB-414-steps-conc-form-straight': 1 }
  const a = run({ concRows: [{ type: 'Standard', form: 'Straight', sf: 100, finish: 'Smooth' }] }, rates, { 'Steps - Conc Standard $ per Sq Ft': 5, 'Steps - Finish Smooth $ per Sq Ft': 1 })
  const b = run({ concRows: [{ type: 'Standard', form: 'Straight', sf: 100, finish: 'Smooth' }] }, rates, { 'Steps - Conc Standard $ per Sq Ft': 5, 'Steps - Finish Smooth $ per Sq Ft': 3 })
  assert.equal(b.concMat, a.concMat + 100 * 2, 'finish mat +$2/SF over 100 SF → +$200')
})

test('material NO-FALLBACK: a picked paver step with no catalog item → $0 material (labor still priced)', () => {
  const r = run(
    { paverRows: [{ vendor: 'Standard', type: 'Ashlar Paver', form: 'Straight', sf: 100 }] },
    { 'LAB-425-steps-paver-straight': 0.5 },
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

test('labor unpriced: an unset labor rate surfaces ONLY for a section in use', () => {
  const laborItems = obj => (obj.unpriced || []).filter(u => u.kind === 'labor')
  // Paver step entered but its form-labor rate is unset → surfaces.
  const used = run({ paverRows: [{ vendor: 'Standard', type: 'Ashlar Paver', form: 'Straight', sf: 100 }] }, {}, {}, [PAVER])
  assert.ok(laborItems(used).some(u => /step install|form/i.test(u.label || u.name)), 'step form labor surfaces when SF > 0')
  // No SF → the form-labor rate is never read, so it must NOT surface.
  const unused = run({ paverRows: [{ vendor: 'Standard', type: 'Ashlar Paver', form: 'Straight', sf: 0 }] }, {}, {}, [PAVER])
  assert.ok(!laborItems(unused).some(u => /step install|form/i.test(u.label || u.name)), 'step form labor does NOT surface when unused')
  // Sub tab: sub rows are flat $/LF → no in-house labor items surface.
  const sub = run({ subType: 'Subcontractor', subPaverRows: [{ type: 'X', form: 'Straight', sf: 100 }] }, {}, { 'Steps - Sub Paver Base': 2 })
  assert.equal(laborItems(sub).length, 0, 'no labor items surface from sub rows')
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
    { 'LAB-425-steps-paver-straight': 0.5, 'LAB-416-steps-conc-standard': 0.9, 'LAB-420-steps-finish-broom': 0.1, 'LAB-414-steps-conc-form-straight': 1 },
    { 'Steps - Conc Standard $ per Sq Ft': 5, 'Steps - Finish Broom $ per Sq Ft': 1, 'Steps - Sub Paver Base': 2 },
    [PAVER]
  )
  finiteNums(r)
  assert.ok(r.price >= 0, 'price is a non-negative number')
  assert.ok(r.walkHrs > 0, 'walk-access penalty applies when distanceLF > 0')
})
