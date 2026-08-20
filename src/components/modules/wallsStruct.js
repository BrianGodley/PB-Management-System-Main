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
