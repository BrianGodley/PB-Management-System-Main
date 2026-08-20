// Structure value test — a 12 LF × 18" CMU fire pit ring with a 1'×1' footing,
// rebar @ 24" o.c. + 1 bond beam, 100% grouted (hand mix). Asserts the EXACT
// geometry and dollar/hour values so the structure math can't drift.
//
// Chosen rates (mp) and the derivation:
//   blocksPerCourse = ceil(12*12 / 16) = 9 ; courses = ceil(18/8) = 3 ; raw = 27
//   totalBlocks = 27 * 1.1 = 29.7 ; grout/block = 0.5 CF → groutCF = 27*0.5 = 13.5
//   footingCF = 1'×1'×12 = 12 → footingCY = 12/27 ; vertRebar = ceil(144/24)=6 →
//   6*(18+12)/12 = 15 ; horiz = (2+1)*12 = 36 → totalRebarLF = 51
//   MATERIAL: block 29.7*$3=89.10 + rebar 51*$1.2=61.20 + footing (12/27)*$150=66.667
//            + grout 0.5*$150=75 = $291.97
//   LABOR (hrs): dig 12*0.1=1.2 + rebar 51*0.05=2.55 + block 27*0.2=5.4
//               + grout 13.5*0.1=1.35 = 10.5
import test from 'node:test'
import assert from 'node:assert/strict'
import { STRUCT_CALC } from './firePitStruct.js'

const near = (a, b, why) => assert.ok(Math.abs(a - b) < 1e-6, `${why}: got ${a}, expected ${b}`)

const S = {
  wallLF: 12,
  wallHeightIn: 18,
  footingWidthIn: 12,
  footingDepthIn: 12,
  rebarSpacingIn: 24,
  bondBeamCourses: 1,
  pctGrouted: 100,
  useGroutPump: 'No',
  pctCurved: 0,
  layoutHrs: 0,
  rebarSize: '#4',
}
const MP = {
  'FP Set Blocks Labor Rate': 0.2,
  'FP Dig Footing Labor Rate': 0.1,
  'FP Set Rebar Labor Rate': 0.05,
  'FP Hand Grout Labor Rate': 0.1,
  'FP Block': 3,
  'FP Concrete': 150,
  'Rebar #4': 1.2,
  'FP Curve Labor Factor': 1,
}

test('CMU 12 LF × 18" — geometry is exact', () => {
  const r = STRUCT_CALC.CMU(S, MP, [])
  assert.equal(r.blocksPerCourse, 9)
  assert.equal(r.coursesCount, 3)
  assert.equal(r.rawBlocks, 27)
  near(r.totalBlocks, 29.7, 'totalBlocks (10% waste)')
  assert.equal(r.footingCF, 12)
  near(r.footingCY, 12 / 27, 'footingCY')
  assert.equal(r.totalRebarLF, 51)
  near(r.groutCF, 13.5, 'groutCF')
  near(r.groutCY, 0.5, 'groutCY')
})

test('CMU 12 LF × 18" — dollar values are correct', () => {
  const r = STRUCT_CALC.CMU(S, MP, [])
  near(r.blockMat, 89.1, 'blockMat = 29.7 × $3')
  near(r.rebarMat, 61.2, 'rebarMat = 51 × $1.2')
  near(r.footingMat, (12 / 27) * 150, 'footingMat = footingCY × $150')
  near(r.groutMat, 75, 'groutMat = 0.5 CY × $150')
  near(r.pumpSetupMat, 0, 'no pump setup')
  near(r.mat, 291.9666667, 'total structure material')
})

test('CMU 12 LF × 18" — labor hours are correct', () => {
  const r = STRUCT_CALC.CMU(S, MP, [])
  near(r.hrs, 10.5, 'dig 1.2 + rebar 2.55 + block 5.4 + grout 1.35')
})

test('structure reflects a View Rates edit — block price + set-block labor', () => {
  const before = STRUCT_CALC.CMU(S, MP, [])
  const after = STRUCT_CALC.CMU(S, { ...MP, 'FP Block': 4, 'FP Set Blocks Labor Rate': 0.3 }, [])
  near(after.blockMat, 29.7 * 4, 'block material follows the edited price')
  assert.ok(after.hrs > before.hrs, 'labor follows the edited set-block rate')
})

test('grout pump path: pump labor + pump setup fee apply', () => {
  const r = STRUCT_CALC.CMU(
    { ...S, useGroutPump: 'Yes' },
    { ...MP, 'FP Pump Grout Labor Rate': 0.08, 'FP Grout Pump Setup': 250 },
    []
  )
  near(r.pumpSetupMat, 250, 'pump setup flat fee')
})
