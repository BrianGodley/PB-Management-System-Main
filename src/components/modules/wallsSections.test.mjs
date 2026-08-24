// Per-wall SECTION calcs — Drainage / Backfill / Demo. Value correctness (Goal 1)
// + live rate-edit reflection (Goal 4). Synthetic rates; the arithmetic is exactly
// what the module runs (module injects the same `r`).
import test from 'node:test'
import assert from 'node:assert/strict'
import { wallDrain, wallBackfill, wallDemo } from './wallsSections.js'

const near = (a, b, why) => assert.ok(Math.abs(a - b) < 1e-3, `${why}: got ${a}, expected ${b}`)

// ── Drainage ────────────────────────────────────────────────────────────────
const DR = {
  drainPerf3Mat: 2,
  drainPerf3Lab: 0.05,
  drainPerf4Mat: 3,
  drainPerf4Lab: 0.06,
  drainSockMat: 1,
  drainSockLab: 0.02,
  drainBurritoMat: 1.5,
  drainBurritoLab: 0.03,
  drainGravel12Mat: 3,
  drainGravel12Lab: 0.03,
  drainGravel24Mat: 5,
  drainGravel24Lab: 0.05,
}
const rDr = k => DR[k] ?? 0
const DRAIN_WALL = { drainLf: 50, drainType: '3" Perforated', drainFabric: 'Drain Sock', drainGravel: '12"' }

test('Drainage @50LF — 3" pipe + sock + 12" gravel', () => {
  const r = wallDrain(DRAIN_WALL, rDr)
  near(r.mat, 50 * 2 + 50 * (1 + 3), 'pipe + (fabric+gravel) material')
  near(r.mat, 300, 'exact')
  near(r.hrs, 50 * 0.05 + (0.02 + 0.03) * 50, 'pipe + fabric+gravel labor')
  near(r.hrs, 5, 'exact')
})
test('Drainage — no LF = zero', () => {
  const r = wallDrain({ drainLf: 0 }, rDr)
  near(r.mat, 0, 'mat')
  near(r.hrs, 0, 'hrs')
})
test('Drainage — 4" pipe path + material/labor edits reflect', () => {
  const base = wallDrain({ ...DRAIN_WALL, drainType: '4" Perforated' }, rDr)
  near(base.mat, 50 * 3 + 50 * (1 + 3), 'uses 4" pipe cost')
  const matUp = wallDrain({ ...DRAIN_WALL, drainType: '4" Perforated' }, k => (k === 'drainPerf4Mat' ? 6 : DR[k] ?? 0))
  assert.ok(matUp.mat > base.mat, 'mat rises with 4" pipe $')
  const labUp = wallDrain({ ...DRAIN_WALL, drainType: '4" Perforated' }, k => (k === 'drainPerf4Lab' ? 0.2 : DR[k] ?? 0))
  assert.ok(labUp.hrs > base.hrs, 'hrs rises with 4" pipe labor')
})

// ── Backfill & Compaction ─────────────────────────────────────────────────────
const BF = { backfillHandGF: 0.1, backfillMiniGF: 0.06, backfillSkidGF: 0.05, compJJ: 0.05, handCompactionMult: 3 }
const rBf = k => BF[k] ?? 0
const BF_WALL = { bkLen: 20, bkWidth: 24, bkDepth: 12, bkMethod: 'Hand', bkCompMethod: 'Jumping Jack' }

test('Backfill @40SF×12in — Hand grade fill + Jumping Jack', () => {
  const r = wallBackfill(BF_WALL, rBf)
  // sf = 20 × (24/12) = 40 ; backfill (40/100)×12×0.1 = 0.48 ; jj (40/100)×12×0.05 = 0.24
  near(r.hrs, 0.48 + 0.24, 'backfill + compaction hrs')
  near(r.hrs, 0.72, 'exact')
})
test('Backfill — Hand compaction = mult × JJ (edit reflects)', () => {
  const jj = wallBackfill(BF_WALL, rBf)
  const hand = wallBackfill({ ...BF_WALL, bkCompMethod: 'Hand' }, rBf)
  near(hand.hrs, 0.48 + 0.24 * 3, 'hand compaction is 3× JJ')
  assert.ok(hand.hrs > jj.hrs, 'hand compaction costs more than JJ')
})
test('Backfill — grade-fill rate edit reflects', () => {
  const base = wallBackfill(BF_WALL, rBf)
  const up = wallBackfill(BF_WALL, k => (k === 'backfillHandGF' ? 0.2 : BF[k] ?? 0))
  assert.ok(up.hrs > base.hrs, 'hrs rises with grade-fill rate')
})

// ── Demo (Slope Removal + Dig&Haul Footing Soil) ──────────────────────────────
const DM = {
  demoHandDirt: 0.5,
  demoSfToTonsDenom: 200,
  demoHandContainerCy: 5,
  demoHandSwell: 1.2,
  demoHandContainer: 300,
  footingSoilSwell: 1.2,
  footingSoilContainerCy: 10,
  footingDigHaulLab: 8,
  footingSoilTonsPerCy: 1.5,
  footingSoilContainerPrice: 770,
}
const rDm = k => DM[k] ?? 0
const DEMO_WALL = {
  demoSlopeLf: 10,
  demoSlopeH: 24,
  demoSlopeD: 6,
  demoSlopeMethod: 'Hand',
  demoFootLen: 12,
  demoFootW: 16,
  demoFootD: 12,
  demoFootMethod: 'Hand',
}

test('Demo — slope removal + footing dig&haul (hrs/dump; tons removed)', () => {
  const r = wallDemo(DEMO_WALL, rDm)
  // slope: sf=20, t=6 → hrs (20/100)×6×0.5 = 0.6 ; footing CF=16 → hrs 16×8 = 128
  near(r.hrs, 0.6 + 128, 'slope 0.6 + footing 128')
  near(r.hrs, 128.6, 'exact')
  // dump: slope 1 container × 300 ; footing 1 container × 770
  near(r.dump, 300 + 770, 'slope 300 + footing 770')
})
test('Demo — footing container price edit reflects (seeded coefficient)', () => {
  const base = wallDemo(DEMO_WALL, rDm)
  const up = wallDemo(DEMO_WALL, k => (k === 'footingSoilContainerPrice' ? 900 : DM[k] ?? 0))
  assert.ok(up.dump > base.dump, 'dump rises with container price')
})
test('Demo — dirt-removal labor edit reflects', () => {
  const base = wallDemo(DEMO_WALL, rDm)
  const up = wallDemo(DEMO_WALL, k => (k === 'footingDigHaulLab' ? 12 : DM[k] ?? 0))
  assert.ok(up.hrs > base.hrs, 'hrs rises with dig+haul labor')
})
