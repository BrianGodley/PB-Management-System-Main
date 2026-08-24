// Acceptance tests for the pure Paver calc (no network).
//   Labor is hrs-per-unit: e.g. straightCutHrs = LF × rate, installHrs = SF × rate.
//   totalHrs (no walk) → laborCost = totalHrs × lrph. NO-FALLBACK: an unset rate reads
//   0 (never a hidden constant); catalog material with no row resolves $0. Rates come by
//   NAME from the injected laborRates / materialRates maps.
// Run: node --test src/components/modules/paverCalc.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { calcPaver } from './paverCalc.js'

const LRPH = 75
// calcPaver(state, lrph, laborRates, materialRates, paverPrices, gpmd, walkAccess, laborBurdenPct, materialRows, priceOf, commissionRate)
const run = (state, { lr = {}, mr = {}, pp = [], materialRows = [] } = {}) =>
  calcPaver({ distanceLF: 0, ...state }, LRPH, lr, mr, pp, 500, null, 0.3, materialRows, undefined, 0.05)

const finiteNums = obj => {
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'number') assert.ok(Number.isFinite(v), `${k} not finite: ${v}`)
  }
}

test('value: straight-cut labor = LF × rate (100 LF × 0.1 = 10 hrs → $750)', () => {
  const r = run({ straightCutLF: 100 }, { lr: { 'LAB-334-paver-straight-cut': 0.1 } })
  assert.equal(r.laborCost, 10 * LRPH, `laborCost got ${r.laborCost}`)
  finiteNums(r)
})

test('units: doubling the LF doubles labor (hrs-per-unit multiply)', () => {
  const a = run({ straightCutLF: 100 }, { lr: { 'LAB-334-paver-straight-cut': 0.1 } })
  const b = run({ straightCutLF: 200 }, { lr: { 'LAB-334-paver-straight-cut': 0.1 } })
  assert.equal(b.laborCost, a.laborCost * 2, 'LF 100→200 doubles hours')
})

test('edit-reflects: raising the labor rate raises labor proportionally', () => {
  const a = run({ straightCutLF: 100 }, { lr: { 'LAB-334-paver-straight-cut': 0.1 } })
  const b = run({ straightCutLF: 100 }, { lr: { 'LAB-334-paver-straight-cut': 0.2 } })
  assert.equal(b.laborCost, a.laborCost * 2, 'rate ×2 → labor ×2')
})

test('unpriced / NO-FALLBACK: an unset labor rate reads 0 (no hidden constant)', () => {
  // No 'LAB-334-paver-straight-cut' rate in the map → straight-cut hours resolve to 0, and
  // with no other priced input the estimate labor is $0. Never a code fallback.
  const r = run({ straightCutLF: 100 }, { lr: {} })
  assert.equal(r.laborCost, 0, 'unset rate → $0 labor (no fallback)')
})

test('multiple labor components sum (straight + curved cuts are independent rates)', () => {
  const r = run(
    { straightCutLF: 100, curvedCutLF: 50 },
    { lr: { 'LAB-334-paver-straight-cut': 0.1, 'LAB-324-paver-curved-cut': 0.2 } }
  )
  // 100×0.1 + 50×0.2 = 10 + 10 = 20 hrs → $1500
  assert.equal(r.laborCost, 20 * LRPH, `laborCost got ${r.laborCost}`)
})

test('bedding sand: priced per Cu Yd, 1in layer (324 SF = 1 CY × $30 = $30)', () => {
  // matInstallSF = 324 → beddingCuYd = 324/324 = 1 → cost = 1 × $30/CY. No tons divisor.
  const r = run({ areaRows: [{ sf: 324, depth: 6 }] }, { mr: { 'Bedding Sand': 30 } })
  assert.equal(r.beddingSandCost, 30, `beddingSandCost got ${r.beddingSandCost}`)
  // doubling area doubles bedding cost (linear in SF)
  const r2 = run({ areaRows: [{ sf: 648, depth: 6 }] }, { mr: { 'Bedding Sand': 30 } })
  assert.equal(r2.beddingSandCost, 60, `beddingSandCost got ${r2.beddingSandCost}`)
})

test('labor unpriced: an unset labor rate surfaces ONLY for a section in use', () => {
  const laborItems = obj => (obj.unpriced || []).filter(u => u.kind === 'labor')
  // Straight-cut LF entered but its labor rate is unset → surfaces.
  const used = run({ straightCutLF: 100 }, { lr: {} })
  assert.ok(laborItems(used).some(u => /cut/i.test(u.label || u.name)), 'straight-cut labor surfaces when LF > 0')
  // No straight-cut LF → that labor rate is never read, so it must NOT surface.
  const unused = run({ straightCutLF: 0 }, { lr: {} })
  assert.ok(!laborItems(unused).some(u => /cut/i.test(u.label || u.name)), 'straight-cut labor does NOT surface when unused')
})

test('labor unpriced (base prep): in-house area rows surface base labor; sub area rows do not', () => {
  const laborItems = obj => (obj.unpriced || []).filter(u => u.kind === 'labor')
  // In-house area row with volume + unset base-prep rate → base labor surfaces.
  const ih = run({ subType: 'In-House', areaRows: [{ sf: 100, depth: 6, method: 'Skid Steer' }] }, { lr: {} })
  assert.ok(laborItems(ih).some(u => /base prep/i.test(u.label || u.name)), 'in-house base prep labor surfaces')
  // The SUB engine (forced Sub, base labor discarded) records no base labor.
  const sub = run({ subType: 'Subcontractor', subAreaRows: [{ sf: 100, depth: 6, method: 'Skid Steer' }] }, { lr: {} })
  assert.ok(!laborItems(sub).some(u => /base prep/i.test(u.label || u.name)), 'sub area rows do NOT surface base prep labor')
})

test('no NaN across a populated estimate (install SF + cuts + restraints)', () => {
  const r = run(
    { installSF: 400, straightCutLF: 60, curvedCutLF: 30, restraintsLF: 80 },
    {
      lr: {
        'LAB-325-paver-install': 0.05,
        'LAB-334-paver-straight-cut': 0.1,
        'LAB-324-paver-curved-cut': 0.2,
        'LAB-328-paver-restraints': 0.05,
      },
    }
  )
  finiteNums(r)
  assert.ok(r.price >= 0, 'price is a non-negative number')
})
