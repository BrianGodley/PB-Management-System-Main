// Walls CMU structure QUANTITIES value test — a 20 LF × 48" (4') CMU wall on an
// 8x8x16 grey block, 16"×12" footing, rebar @ 16" o.c. + 2 wall-horiz + 2 footing
// bars, 100% grouted, 5% block order waste, 10% footing-rebar wrap.
//
//   blocksPerCourse = ceil(20*12 / 16) = 15 ; courses = ceil(48/8) = 6 ; raw = 90
//   orderGreyBlock  = ceil(90 * 1.05) = 95
//   footingCF = (16/12)*(12/12)*20 = 26.6667 → CY = /27 = 0.98765
//   grout/block = 0.5 CF → groutCF = 90*0.5 = 45 → groutCY = 45/27 = 1.66667
//   bars = ceil(240/16)=15 ; wallVertLF = 15*(48/12)=60 ; wallHorizLF = 2*20=40
//   footingRebarLF = 20*2*1.1 = 44
import test from 'node:test'
import assert from 'node:assert/strict'
import { cmuStructQuantities, cmuStructTotals } from './wallsStruct.js'

const near = (a, b, why) => assert.ok(Math.abs(a - b) < 1e-4, `${why}: got ${a}, expected ${b}`)

const WALL = {
  lf: 20,
  heightIn: 48,
  footingWIn: 16,
  footingDIn: 12,
  rebarSpIn: 16,
  wallHorizBars: 2,
  horizBars: 2,
  pctGrouted: 100,
}
const BLOCK = { w: 8, h: 8, l: 16 }
const COEFFS = { blockOrderWaste: 1.05, footingRebarWaste: 1.1 }

test('CMU 20 LF × 48" — block + course counts exact', () => {
  const q = cmuStructQuantities(WALL, BLOCK, COEFFS)
  assert.equal(q.blocksPerCourse, 15)
  assert.equal(q.totalCourses, 6)
  assert.equal(q.rawBlocks, 90)
  assert.equal(q.orderGreyBlock, 95) // 90 × 1.05, rounded up
})

test('CMU 20 LF × 48" — footing + grout volumes exact', () => {
  const q = cmuStructQuantities(WALL, BLOCK, COEFFS)
  near(q.footingCF, 26.6667, 'footingCF = 16/12 × 1 × 20')
  near(q.footingCY, 26.6667 / 27, 'footingCY')
  near(q.groutCF, 45, 'groutCF = 90 blocks × 0.5 CF')
  near(q.groutCY, 45 / 27, 'groutCY')
})

test('CMU 20 LF × 48" — rebar lengths exact', () => {
  const q = cmuStructQuantities(WALL, BLOCK, COEFFS)
  assert.equal(q.bars, 15)
  assert.equal(q.wallVertLF, 60) // 15 bars × 4' tall
  assert.equal(q.wallHorizLF, 40) // 2 bars × 20 LF
  near(q.footingRebarLF, 44, '20 LF × 2 bars × 1.1 wrap')
})

test('taller wall adds courses/blocks; wider footing adds concrete', () => {
  const tall = cmuStructQuantities({ ...WALL, heightIn: 56 }, BLOCK, COEFFS)
  assert.equal(tall.totalCourses, 7) // ceil(56/8)
  assert.equal(tall.rawBlocks, 105)
  const wide = cmuStructQuantities({ ...WALL, footingWIn: 24 }, BLOCK, COEFFS)
  assert.ok(wide.footingCF > cmuStructQuantities(WALL, BLOCK, COEFFS).footingCF)
})

test('pctGrouted scales grout linearly', () => {
  const half = cmuStructQuantities({ ...WALL, pctGrouted: 50 }, BLOCK, COEFFS)
  near(half.groutCF, 22.5, '50% of 45')
})

// ── Dollar totals ────────────────────────────────────────────────────────────
// rates (hrs per unit): rebar .05, footing-pour(hand) 2, block .2, grout(hand) .15,
// setup/clean .1 ; prices: concrete(hand) $150 ; block $3 ; rebar material $61.20.
const RATE = { rebarLab: 0.05, footingPourHandLab: 2, blockLab: 0.2, handGroutLab: 0.15, setupCleanLab: 0.1, curveLab: 0.5 }
const PRICE = { concreteHand: 150, concreteTruck: 180, groutPumpSetup: 250, groutPumpPerYd: 30 }
const CTX = {
  r: k => RATE[k] || 0,
  pm: k => PRICE[k] || 0,
  blockPrice: 3,
  rebarMat: 61.2,
  footingPump: 'No',
  groutPump: 'No',
  installKey: 'blockLab',
}

test('CMU dollar totals — labor hours and material $ exact', () => {
  const q = cmuStructQuantities(WALL, BLOCK, COEFFS)
  const t = cmuStructTotals(q, WALL, CTX)
  near(t.rebarHrs, 7.2, 'rebar hrs = (60+40+44) × 0.05')
  near(t.hrs, 35.925309, 'rebar 7.2 + footing 1.9753 + block 18 + grout 6.75 + setup 2')
  near(t.mat, 744.348148, 'block 285 + rebar 61.2 + footing 148.15 + grout 250')
})

test('dollar totals reflect a View Rates edit (block price + install labor)', () => {
  const q = cmuStructQuantities(WALL, BLOCK, COEFFS)
  const base = cmuStructTotals(q, WALL, CTX)
  const edited = cmuStructTotals(q, WALL, {
    ...CTX,
    blockPrice: 4, // +$1/block in View Rates
    r: k => (k === 'blockLab' ? 0.3 : RATE[k] || 0), // +0.1 hr/block
  })
  near(edited.mat - base.mat, 95 * 1, 'material rises by orderGreyBlock × $1')
  near(edited.hrs - base.hrs, 90 * 0.1, 'labor rises by rawBlocks × 0.1 hr')
})

test('grout pump path adds setup + per-CY fees and uses truck concrete', () => {
  const q = cmuStructQuantities(WALL, BLOCK, COEFFS)
  const t = cmuStructTotals(q, WALL, { ...CTX, groutPump: 'Yes' })
  // vs hand: + groutPumpSetup 250 + groutCY×30, and grout concrete now truck($180) not hand($150)
  const hand = cmuStructTotals(q, WALL, CTX)
  near(t.mat - hand.mat, 250 + q.groutCY * 30 + q.groutCY * (180 - 150), 'pump setup + per-CY + truck mix delta')
})
