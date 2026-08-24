// Walls FINISH / CAP / WATERPROOFING row math — value correctness (Goal 1) AND
// live rate-edit reflection (Goal 4). Rates are synthetic but the arithmetic is
// exactly what the module runs (the module injects the same lab/catP/… into these
// pure fns). Each family: exact mat/hrs at a fixed size, then bump the material $
// and the labor rate and assert the estimate moves.
import test from 'node:test'
import assert from 'node:assert/strict'
import { computeWallFinishRow, computeCapRow, computeWpRow } from './wallsCalc.js'

const near = (a, b, why) => assert.ok(Math.abs(a - b) < 1e-3, `${why}: got ${a}, expected ${b}`)

// ── synthetic labor-coefficient table (key → hrs/unit or dimensionless factor) ──
const RATES = {
  sandStuccoLab: 0.05,
  smoothStuccoLab: 0.06,
  ledgerstoneLab: 0.1,
  ledgerWaste: 1.1,
  ledgerSetSfPerUnit: 50,
  ledgerSetUnitCost: 8,
  ledgerSubExtraPerSf: 1,
  stackedStoneLab: 0.12,
  stackedWaste: 1.15,
  stackedSetSfPerUnit: 40,
  stackedSetUnitCost: 9,
  stackedSubExtraPerSf: 1.5,
  tileLab: 0.2,
  tileExtraPerSf: 0.5,
  flagstoneLab: 0.15,
  flagstoneSfPerTon: 40,
  flagstoneExtraPerSf: 0.3,
  realStoneLab: 0.18,
  realStoneSfPerTon: 35,
  realStoneExtraPerSf: 0.4,
  capFlagstoneLab: 0.3,
  capPrecastLab: 0.2,
  capPipLab: 0.4,
  capBullnoseLab: 0.25,
}
const lab = k => RATES[k] ?? 0

// ─────────────────────────── FINISHES @ 20 SF (Goal 1) ───────────────────────
const SF = 20
const fin = (type, catP, over = {}) => computeWallFinishRow({ type, sf: SF, vendor: 'Standard', ...over }, { lab, catP })

test('Sand Stucco @20SF — mat = sf×rate, hrs = sf×lab', () => {
  const r = fin('Sand Stucco', 10)
  near(r.mat, 200, 'mat')
  near(r.hrs, 1.0, 'hrs = 20 × 0.05')
  near(r.subUnit, 10, 'subUnit = rate')
})
test('Smooth Stucco @20SF', () => {
  const r = fin('Smooth Stucco', 11)
  near(r.mat, 220, 'mat')
  near(r.hrs, 1.2, 'hrs = 20 × 0.06')
})
test('Ledgerstone @20SF — waste + set units', () => {
  const r = fin('Ledgerstone', 12)
  near(r.mat, 20 * 12 * 1.1 + (20 / 50) * 8, 'mat = sf×rate×waste + (sf/setSf)×setCost')
  near(r.mat, 267.2, 'mat exact')
  near(r.hrs, 2.0, 'hrs')
  near(r.subUnit, 12 * 1.1 + 1, 'subUnit')
})
test('Stacked Stone @20SF', () => {
  const r = fin('Stacked Stone', 15)
  near(r.mat, 20 * 15 * 1.15 + (20 / 40) * 9, 'mat')
  near(r.mat, 349.5, 'mat exact')
  near(r.hrs, 2.4, 'hrs')
})
test('Tile @20SF — extra per SF', () => {
  const r = fin('Tile', 8)
  near(r.mat, 170, 'mat = 20×8 + 20×0.5')
  near(r.hrs, 4.0, 'hrs')
})
test('Real Flagstone @20SF — priced per Sq Ft (shared record, no ton conversion)', () => {
  const r = fin('Real Flagstone', 250)
  near(r.mat, 20 * 250, 'mat = sf × rate')
  near(r.hrs, 3.0, 'hrs')
  near(r.tons, 0, 'no tons — $/SF now')
})
test('Real Stone @20SF — priced per Sq Ft (shared record, no ton conversion)', () => {
  const r = fin('Real Stone', 300)
  near(r.mat, 20 * 300, 'mat = sf × rate')
  near(r.hrs, 3.6, 'hrs')
  near(r.tons, 0, 'no tons — $/SF now')
})
test('rateIn override wins over catalog price', () => {
  const r = fin('Sand Stucco', 10, { rateIn: 25 })
  near(r.mat, 500, 'mat uses 25 not 10')
})

// Goal 4 — every finish: material $ edit and labor edit both move the estimate.
const FINISHES = ['Sand Stucco', 'Smooth Stucco', 'Ledgerstone', 'Stacked Stone', 'Tile', 'Real Flagstone', 'Real Stone']
const LAB_KEY = {
  'Sand Stucco': 'sandStuccoLab',
  'Smooth Stucco': 'smoothStuccoLab',
  Ledgerstone: 'ledgerstoneLab',
  'Stacked Stone': 'stackedStoneLab',
  Tile: 'tileLab',
  'Real Flagstone': 'flagstoneLab',
  'Real Stone': 'realStoneLab',
}
for (const type of FINISHES) {
  test(`${type} — material price edit reflects`, () => {
    const base = fin(type, 20)
    const bumped = fin(type, 40)
    assert.ok(bumped.mat > base.mat, `${type} mat should rise with catalog $`)
  })
  test(`${type} — labor rate edit reflects`, () => {
    const k = LAB_KEY[type]
    const base = computeWallFinishRow({ type, sf: SF, vendor: 'Standard' }, { lab, catP: 20 })
    const bumped = computeWallFinishRow(
      { type, sf: SF, vendor: 'Standard' },
      { lab: key => (key === k ? RATES[k] * 2 : RATES[key] ?? 0), catP: 20 }
    )
    assert.ok(bumped.hrs > base.hrs, `${type} hrs should rise with labor rate`)
  })
}

// ─────────────────────────── CAPS @ 12 LF (Goal 1) ───────────────────────────
test('Flagstone cap @12LF, 12" wide — priced per Sq Ft of cap surface', () => {
  const r = computeCapRow({ type: 'Flagstone', lf: 12, widthIn: 12, vendor: 'Standard' }, { lab, capP: () => 5 })
  near(r.mat, (12 / 12) * 12 * 5, 'mat = width_ft × LF × $/SF = 1 × 12 × 5 = 60')
  near(r.hrs, 3.6, 'hrs = 12 × 0.3')
  near(r.qty, 12, 'LF')
})
test('Precast cap — per-each with width factor', () => {
  const r = computeCapRow({ type: 'Precast', qty: 10, widthIn: 8, vendor: 'Standard' }, { lab, capP: () => 25 })
  near(r.mat, 250, 'mat = 10 × 25 × (8/8)')
  near(r.hrs, 2.0, 'hrs = 10 × 0.2')
  assert.equal(r.unit, 'ea')
})
test('Precast width factor scales material', () => {
  const r = computeCapRow({ type: 'Precast', qty: 10, widthIn: 16, vendor: 'Standard' }, { lab, capP: () => 25 })
  near(r.mat, 500, '16"/8" = 2× material')
})
test('PIP Concrete cap — poured off ready-mix $/CY', () => {
  const r = computeCapRow(
    { type: 'PIP Concrete', lf: 12, widthIn: 6, vendor: 'Standard' },
    { lab, capP: () => 0, concreteTruckP: 180 }
  )
  near(r.mat, ((12 * (6 / 12) * 0.333) / 27) * 180, 'mat')
  near(r.hrs, 4.8, 'hrs = 12 × 0.4')
})
test('Bullnose Brick cap @12LF', () => {
  const r = computeCapRow({ type: 'Bullnose Brick', lf: 12, vendor: 'Standard' }, { lab, capP: () => 6 })
  near(r.mat, 72, 'mat = 12 × 6')
  near(r.hrs, 3.0, 'hrs = 12 × 0.25')
})
test('Catalog cap — per_lf count + calc_meta labor pointer', () => {
  const r = computeCapRow(
    { type: 'Custom Bullnose', lf: 12, vendor: 'Standard' },
    { lab, capP: () => 5, defaultCap: { perLf: 3, labRate: 0.2 } }
  )
  near(r.mat, 12 * 3 * 5, 'mat = lf × per_lf × price')
  near(r.hrs, 2.4, 'hrs = 12 × 0.2 (labor_rate pointer)')
})
test('Catalog cap — unset labor pointer = 0 hrs (no fallback)', () => {
  const r = computeCapRow({ type: 'X', lf: 12, vendor: 'Standard' }, { lab, capP: () => 5, defaultCap: { perLf: 1, labRate: 0 } })
  near(r.hrs, 0, 'unset ⇒ 0, never a guessed fallback')
})

// Goal 4 — caps: material $ + labor edits reflect
test('cap material price edit reflects (Bullnose)', () => {
  const base = computeCapRow({ type: 'Bullnose Brick', lf: 12, vendor: 'Standard' }, { lab, capP: () => 6 })
  const bumped = computeCapRow({ type: 'Bullnose Brick', lf: 12, vendor: 'Standard' }, { lab, capP: () => 9 })
  assert.ok(bumped.mat > base.mat, 'mat rises with cap $')
})
test('cap labor rate edit reflects (Precast)', () => {
  const base = computeCapRow({ type: 'Precast', qty: 10, widthIn: 8, vendor: 'Standard' }, { lab, capP: () => 25 })
  const bumped = computeCapRow(
    { type: 'Precast', qty: 10, widthIn: 8, vendor: 'Standard' },
    { lab: k => (k === 'capPrecastLab' ? 0.4 : RATES[k] ?? 0), capP: () => 25 }
  )
  assert.ok(bumped.hrs > base.hrs, 'hrs rises with cap labor rate')
})

// ─────────────────────────── WATERPROOFING (Goal 1 + 4) ──────────────────────
test('WP row @20SF — mat = sf×$/SF, hrs = sf×labor', () => {
  const r = computeWpRow({ type: 'Primer + Membrane', sf: 20, vendor: 'Standard' }, { valid: true, catP: 4, wpRate: 0.05 })
  near(r.mat, 80, 'mat')
  near(r.hrs, 1.0, 'hrs = 20 × 0.05')
  near(r.subUnit, 4, 'subUnit = $/SF')
})
test('WP invalid/None type = all zero', () => {
  const r = computeWpRow({ type: 'None', sf: 20, vendor: 'Standard' }, { valid: false, catP: 4, wpRate: 0.05 })
  near(r.mat, 0, 'mat')
  near(r.hrs, 0, 'hrs')
})
test('WP material + labor edits reflect', () => {
  const base = computeWpRow({ type: 'Thoroseal 2 Coats', sf: 20 }, { valid: true, catP: 4, wpRate: 0.05 })
  const matUp = computeWpRow({ type: 'Thoroseal 2 Coats', sf: 20 }, { valid: true, catP: 6, wpRate: 0.05 })
  const labUp = computeWpRow({ type: 'Thoroseal 2 Coats', sf: 20 }, { valid: true, catP: 4, wpRate: 0.09 })
  assert.ok(matUp.mat > base.mat, 'mat rises with $/SF')
  assert.ok(labUp.hrs > base.hrs, 'hrs rises with per-type WP labor')
})

// ── SEEDED COEFFICIENTS (misc_rates/Walls) — the 19 rows recovered from git and
//    re-seeded. These tests lock the CORRECT pricing they produce AND prove the
//    bug they fix: with the coefficient at 0 (unseeded), the coefficient finishes
//    return NaN/Infinity. Values here mirror the seed SQL exactly. ─────────────
const SEEDED = {
  ledgerWaste: 1.1,
  ledgerSetSfPerUnit: 5,
  ledgerSetUnitCost: 2,
  ledgerSubExtraPerSf: 0.4,
  stackedWaste: 1.1,
  stackedSetSfPerUnit: 5,
  stackedSetUnitCost: 2,
  stackedSubExtraPerSf: 0.4,
  tileExtraPerSf: 1,
  flagstoneSfPerTon: 80,
  flagstoneExtraPerSf: 1.5,
  realStoneSfPerTon: 70,
  realStoneExtraPerSf: 2,
  // labor keys exist in DB already; give them values so hrs is finite
  ledgerstoneLab: 0.1,
  stackedStoneLab: 0.12,
  tileLab: 0.2,
  flagstoneLab: 0.15,
  realStoneLab: 0.18,
}
const labSeeded = k => SEEDED[k] ?? 0
const finSeeded = (type, catP) => computeWallFinishRow({ type, sf: 20, vendor: 'Standard' }, { lab: labSeeded, catP })

test('SEEDED: Ledgerstone @20SF prices correctly (was NaN when unseeded)', () => {
  const r = finSeeded('Ledgerstone', 10)
  near(r.mat, 20 * 10 * 1.1 + (20 / 5) * 2, 'sf×rate×waste + (sf/setSf)×setCost')
  near(r.mat, 228, 'exact = 220 + 8')
  assert.ok(Number.isFinite(r.mat), 'material is finite')
})
test('SEEDED: Stacked Stone @20SF = 228', () => {
  const r = finSeeded('Stacked Stone', 10)
  near(r.mat, 228, '220 + 8')
  assert.ok(Number.isFinite(r.mat))
})
test('SEEDED: Real Flagstone @20SF — $/SF (sf × rate)', () => {
  const r = finSeeded('Real Flagstone', 400)
  near(r.mat, 20 * 400, 'sf × rate')
  near(r.tons, 0, 'no tons — $/SF now')
})
test('SEEDED: Real Stone @20SF — $/SF (sf × rate)', () => {
  const r = finSeeded('Real Stone', 400)
  near(r.mat, 20 * 400, 'sf × rate')
  assert.ok(Number.isFinite(r.mat))
})
test('SEEDED: Tile @20SF = 150 (rate 6.5 + $1/SF extra)', () => {
  const r = finSeeded('Tile', 6.5)
  near(r.mat, 20 * 6.5 + 20 * 1, '130 + 20')
})

test('BUG GUARD: unseeded (coefficient 0) breaks Ledgerstone → NaN', () => {
  const r = computeWallFinishRow({ type: 'Ledgerstone', sf: 20, vendor: 'Standard' }, { lab: () => 0, catP: 10 })
  assert.ok(Number.isNaN(r.mat), 'sf/0 setting term → NaN (this is what the seed prevents)')
})
test('Real Flagstone is $/SF now — no coefficient division, always finite', () => {
  // Old model divided by SF-per-ton (a coefficient), so an unseeded 0 → Infinity.
  // The $/SF model is sf × rate with no division, so it can never blow up.
  const r = computeWallFinishRow({ type: 'Real Flagstone', sf: 20, vendor: 'Standard' }, { lab: () => 0, catP: 400 })
  assert.ok(Number.isFinite(r.mat), 'sf × rate is always finite')
  near(r.mat, 20 * 400, 'mat = sf × rate')
})
