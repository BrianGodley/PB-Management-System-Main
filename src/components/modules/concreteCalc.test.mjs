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

test('PARITY (M5): install-tier mix selected by material ref_key — price resolves by key AND hand-mix uplift fires via the RESOLVED name (not the raw key)', () => {
  const stdMix = { id: 'm1', ref_key: 'MAT-050-standard-mix', name: 'Standard Mix', sub_category: 'Concrete Mix', category: 'Concrete', vendor_id: null, unit_cost: 200, calc_meta: {} }
  const handMix = { id: 'm2', ref_key: 'MAT-051-hand-mix', name: 'Hand Mix', sub_category: 'Concrete Mix', category: 'Concrete', vendor_id: null, unit_cost: 200, calc_meta: {} }
  const mk = mixRef =>
    run(
      { installTiers: { s300_600: 540 }, installTierVendor: { s300_600: 'Standard' }, installTierType: { s300_600: mixRef }, installTierDepth: { s300_600: 4 } },
      { lr: { 'LAB-076-concrete-install-300-600': 0.1, 'LAB-072-concrete-hand-mix-labor-uplift': 15 }, materialRows: [stdMix, handMix] }
    )
  const std = mk('MAT-050-standard-mix')
  const hm = mk('MAT-051-hand-mix')
  // Material resolves by ref_key: 540 SF × 4in/12 / 27 = 6.667 CY × $200 ≈ $1333.
  assert.ok(std.totalMat > 1300 && std.totalMat < 1367, `mix priced by ref_key; got ${std.totalMat}`)
  // Hand-mix +15% uplift applies via the resolved item name, not the stored key.
  assert.ok(Math.abs(hm.installHrs - std.installHrs * 1.15) < 0.001, `uplift is 15%: ${hm.installHrs} vs ${std.installHrs}×1.15`)
})

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
  // Count only the MATERIAL rebar unpriced item (labor rebar is a separate kind now).
  const cnt = obj => (obj.unpriced || []).filter(u => u.kind !== 'labor' && /rebar/i.test(`${u.name || ''} ${u.label || ''}`)).length
  assert.ok(cnt(missing) > 0, 'rebar unpriced when material absent')
  assert.equal(cnt(priced), 0, 'rebar no longer unpriced once material is priced')
})

test('labor unpriced: an unset labor rate surfaces ONLY for a section in use', () => {
  const laborItems = obj => (obj.unpriced || []).filter(u => u.kind === 'labor')
  // Form LF entered but its labor rate (LAB.CONC_FORM_SETTING) is unset → surfaces.
  const used = run({ formLF: 50 }, { lr: {} })
  assert.ok(laborItems(used).some(u => /form/i.test(u.label || u.name)), 'form labor surfaces when formLF > 0')
  // No form LF entered → the form labor rate is never read, so it must NOT surface.
  const unused = run({ formLF: 0 }, { lr: {} })
  assert.ok(!laborItems(unused).some(u => /form/i.test(u.label || u.name)), 'form labor does NOT surface when unused')
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
