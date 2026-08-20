// Pure, React-free CMU wall STRUCTURE quantities (block count, footing, grout, rebar
// LF), extracted from calcOneCMU so the geometry can be unit-tested with `node --test`.
// This is the correctness-critical part (block-count / dimension math). Rate-driven
// waste coefficients are INJECTED so the helper stays free of the price map; the
// dollar composition (qty × rate) stays in the module. Same formulas, single source —
// WallsModule imports cmuStructQuantities from here.
import { groutCyPerBlock } from '../../lib/cmuGrout.js'

export const n = v => parseFloat(v) || 0

export function cmuStructQuantities(wall, block, { blockOrderWaste = 1, footingRebarWaste = 1 } = {}) {
  const lf = n(wall.lf)
  const heightIn = n(wall.heightIn)
  const blocksPerCourse = Math.ceil((lf * 12) / block.l)
  const totalCourses = Math.ceil(heightIn / block.h)
  const rawBlocks = blocksPerCourse * totalCourses
  const orderGreyBlock = Math.ceil(blocksPerCourse * totalCourses * blockOrderWaste)

  const footingCF = (n(wall.footingWIn) / 12) * (n(wall.footingDIn) / 12) * lf
  const footingCY = footingCF / 27
  const groutCY = rawBlocks * groutCyPerBlock(block.w, block.h) * (n(wall.pctGrouted) / 100)
  const groutCF = groutCY * 27

  const bars = n(wall.rebarSpIn) > 0 ? Math.ceil((lf * 12) / n(wall.rebarSpIn)) : 0
  const wallVertLF = bars * (heightIn / 12)
  const wallHorizLF = n(wall.wallHorizBars) * lf
  const footingRebarLF = lf * n(wall.horizBars) * footingRebarWaste

  return {
    blocksPerCourse,
    totalCourses,
    rawBlocks,
    orderGreyBlock,
    footingCF,
    footingCY,
    groutCY,
    groutCF,
    bars,
    wallVertLF,
    wallHorizLF,
    footingRebarLF,
  }
}

// Pure CMU dollar TOTALS from the quantities `q` plus injected rate/price lookups:
//   r(key)  → labor coefficient (hrs per unit) for a WALL_RATES labor key
//   pm(key) → material $/unit for a WALL_RATES material key (vendor-resolved)
//   blockPrice → $/grey block; rebarMat → already-summed rebar $ (size-priced)
// Same math as calcOneCMU; the React module injects its own r / pm / blockPrice /
// rebarMat so this stays free of the price map + supabase.
export function cmuStructTotals(q, wall, { r, pm, blockPrice, rebarMat, footingPump, groutPump, installKey }) {
  const lf = n(wall.lf)
  const rebarHrs = (q.wallVertLF + q.wallHorizLF + q.footingRebarLF) * r('rebarLab')
  const groutRate = groutPump === 'Yes' ? r('pumpGroutLab') : r('handGroutLab')
  const structBase =
    rebarHrs +
    (q.footingCY > 0 ? q.footingCY * r(footingPump === 'Yes' ? 'footingPourPumpLab' : 'footingPourHandLab') : 0) +
    (q.rawBlocks > 0 ? q.rawBlocks * r(installKey) : 0) +
    (q.groutCF > 0 ? q.groutCF * groutRate : 0) +
    lf * r('setupCleanLab')
  const curveAdd = structBase * (n(wall.pctCurved) / 100) * r('curveLab')
  const hrs = structBase + curveAdd
  const footConcrPrc = footingPump === 'Yes' ? pm('concreteTruck') : pm('concreteHand')
  const groutConcrPrc = groutPump === 'Yes' ? pm('concreteTruck') : pm('concreteHand')
  const mat =
    q.orderGreyBlock * blockPrice +
    rebarMat +
    q.footingCY * footConcrPrc +
    (footingPump === 'Yes' ? pm('groutPumpSetup') : 0) +
    q.groutCY * groutConcrPrc +
    (groutPump === 'Yes' && q.groutCY > 0 ? pm('groutPumpSetup') + q.groutCY * pm('groutPumpPerYd') : 0)
  return { hrs, mat, curveAdd, structBase, rebarHrs }
}
