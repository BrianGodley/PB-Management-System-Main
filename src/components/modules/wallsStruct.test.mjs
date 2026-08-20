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
import { cmuStructQuantities } from './wallsStruct.js'

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
