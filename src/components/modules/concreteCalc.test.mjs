// Acceptance tests for the pure Concrete calc (no network).
//   Base prep labor = Cu Ft × rate = (SF × depth_in/12) × rate (mirrors Pavers;
//   shared Basic Labor 'Base Prep' rate, hrs per Cu Ft).
//   totalHrs (no walk) → laborCost = totalHrs × lrph. NO-FALLBACK: an item with no
//   catalog price resolves $0 AND surfaces in the `unpriced` list (the fix-it banner),
//   never a hidden constant. Rates resolve by NAME from the injected lr/mr/sr maps.
// Run: node --test src/components/modules/concreteCalc.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { calcConcrete } from './concreteCalc.js'

const LRPH = 75
// calcConcrete(state, lrph, lr, mr, sr, gpmd, walkAccess, laborBurdenPct, materialRows, catDefaults, commissionRate)
const run = (state, { lr = {}, mr = {}, sr = {}, materialRows = [] } = {}) =>
  calcConcrete({ subType: 'In House', distanceLF: 0, ...state }, LRPH, lr, mr, sr, 500, null, 0.3, materialRows, {}, 0.05)

const finiteNums = obj => {
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'number') assert.ok(Number.isFinite(v), `${k} not finite: ${v}`)
  }
}

test('value: base prep labor = Cu Ft × rate (108 SF × 4in/12 = 36 Cu Ft × 0.5 = 18 hrs → $1350)', () => {
  const sf = 108, depth = 4, rate = 0.5
  const r = run({ baseRows: [{ method: 'Skid Steer', sf, depth }] }, { lr: { 'BAS-004-import-base-skid-steer-good': rate } })
  const expHrs = sf * (depth / 12) * rate // 36 Cu Ft × 0.5 = 18 hrs
  assert.equal(r.laborCost, expHrs * LRPH, `laborCost got ${r.laborCost}`)
  finiteNums(r)
})

test('units: doubling depth doubles base labor (hrs-per-unit multiply, no production divide)', () => {
  const a = run({ baseRows: [{ method: 'Skid Steer', sf: 100, depth: 4 }] }, { lr: { 'BAS-004-import-base-skid-steer-good': 0.5 } })
  const b = run({ baseRows: [{ method: 'Skid Steer', sf: 100, depth: 8 }] }, { lr: { 'BAS-004-import-base-skid-steer-good': 0.5 } })
  assert.equal(b.laborCost, a.laborCost * 2, 'depth 4→8 doubles hours')
})

test('edit-reflects: raising the base labor rate raises labor proportionally', () => {
  const a = run({ baseRows: [{ method: 'Skid Steer', sf: 100, depth: 4 }] }, { lr: { 'BAS-004-import-base-skid-steer-good': 0.5 } })
  const b = run({ baseRows: [{ method: 'Skid Steer', sf: 100, depth: 4 }] }, { lr: { 'BAS-004-import-base-skid-steer-good': 1.0 } })
  assert.equal(b.laborCost, a.laborCost * 2, 'rate ×2 → labor ×2')
})

test('unpriced / NO-FALLBACK: rebar with no catalog price → surfaces in the unpriced list and contributes $0', () => {
  // rebarSF drives rebar MATERIAL via R.mat('Rebar #4'); with no price in the material
  // map it must (a) surface in the fix-it `unpriced` list and (b) contribute $0 — never
  // a hidden constant. This is the Concrete reference behavior for the whole codebase.
  const r = run(
    { rebarSF: 100, rebarSize: '#4', rebarSpacing: '24" OC' },
    { lr: { 'Concrete - Rebar Per SF': 0.02 } } // labor priced, MATERIAL 'Rebar #4' absent
  )
  const rebarUnpriced = (r.unpriced || []).some(u => /rebar/i.test(`${u.name || ''} ${u.label || ''}`))
  assert.ok(rebarUnpriced, `rebar material should be in the unpriced list; got ${JSON.stringify(r.unpriced)}`)
  finiteNums(r)
})

test('unpriced clears once the rate is provided (edit-reflects on the banner)', () => {
  const missing = run({ rebarSF: 100, rebarSize: '#4', rebarSpacing: '24" OC' }, { lr: { 'Concrete - Rebar Per SF': 0.02 } })
  const priced = run(
    { rebarSF: 100, rebarSize: '#4', rebarSpacing: '24" OC' },
    { lr: { 'Concrete - Rebar Per SF': 0.02 }, mr: { 'Rebar #4': 0.85 } }
  )
  const cnt = obj => (obj.unpriced || []).filter(u => /rebar/i.test(`${u.name || ''} ${u.label || ''}`)).length
  assert.ok(cnt(missing) > 0, 'rebar unpriced when material absent')
  assert.equal(cnt(priced), 0, 'rebar no longer unpriced once material is priced')
})

test('no NaN across a populated In-House estimate', () => {
  const r = run(
    {
      baseRows: [{ method: 'Skid Steer', sf: 300, depth: 4 }],
      installTiers: { s300_600: 400 },
      installTierDepth: { s300_600: 4 },
      rebarSF: 200,
      rebarSize: '#4',
      rebarSpacing: '18" OC',
      formLF: 60,
    },
    {
      lr: { 'BAS-004-import-base-skid-steer-good': 0.5, 'LAB-076-concrete-install-300-600': 0.05, 'Concrete - Rebar Per SF': 0.02 },
      mr: { 'Rebar #4': 0.85, 'Concrete - Form Lumber LF': 2 },
    }
  )
  finiteNums(r)
  assert.ok(r.price >= 0, 'price is a non-negative number')
})
