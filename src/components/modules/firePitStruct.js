// Pure, React-free Fire Pit STRUCTURE math (CMU / PIP / Modular / Brick), extracted
// from FirePitModule so it can be unit-tested with `node --test`. Same formulas,
// same rate keys; the React module imports STRUCT_CALC from here (single source).
import { groutCuFtPerBlock } from '../../lib/cmuGrout.js'

const n = v => parseFloat(v) || 0

// Standard CMU block dimensions (inches) + grout fill per block (8x8x16 = 0.5 CF).
const BLOCK_LENGTH_IN = 16
const BLOCK_HEIGHT_IN = 8
const BLOCK_WIDTH_IN = 8
const GROUT_CF_PER_BLOCK = groutCuFtPerBlock(BLOCK_WIDTH_IN, BLOCK_HEIGHT_IN)

const MORTAR_NAME = 'Mortar'
const FORM_LUMBER_NAME = 'FP Form Lumber'
const FP_BRICK_LAY = { dbName: 'Wall Brick Lay Labor' }
const FP_FORM_LAB = { dbName: 'Wall PIP Install Labor' }
const FP_POUR_LAB = { dbName: 'FP Pour Concrete Labor Rate' }

// Rate keys (name only — no hardcoded fallback; an unset rate reads undefined).
const FP_RATES = {
  fpBlock: { dbName: 'FP Block' },
  fpRebar: { dbName: 'FP Rebar' },
  fpConcrete: { dbName: 'FP Concrete' },
  fpGroutPump: { dbName: 'FP Grout Pump Setup' },
  digLab: { dbName: 'FP Dig Footing Labor Rate' },
  rebarLab: { dbName: 'FP Set Rebar Labor Rate' },
  blockLab: { dbName: 'FP Set Blocks Labor Rate' },
  handGroutLab: { dbName: 'FP Hand Grout Labor Rate' },
  pumpGroutLab: { dbName: 'FP Pump Grout Labor Rate' },
}

const structHasGeo = s => n(s?.wallLF) > 0 && n(s?.wallHeightIn) > 0
function catalogRowById(materialRows, id) {
  return (materialRows || []).find(r => r.id === id) || null
}
function blockDims(row, def = { w: 8, h: 8, l: 16 }) {
  const cm = row && row.calc_meta ? row.calc_meta : {}
  return {
    w: n(cm.block_w_in) || n(row && row.block_w_in) || def.w,
    h: n(cm.block_h_in) || n(row && row.block_h_in) || def.h,
    l: n(cm.block_l_in) || n(row && row.block_l_in) || def.l,
  }
}

// Footing + rebar geometry shared by all four types (identical to legacy FP).
function structFootingRebar(s) {
  const wallLF = n(s.wallLF)
  const wallHeightIn = n(s.wallHeightIn)
  const footingCF = (n(s.footingWidthIn) / 12) * (n(s.footingDepthIn) / 12) * wallLF
  const footingCY = footingCF / 27
  const vertRebars = n(s.rebarSpacingIn) > 0 ? Math.ceil((wallLF * 12) / n(s.rebarSpacingIn)) : 0
  const vertRebarLF = (vertRebars * (wallHeightIn + n(s.footingDepthIn))) / 12
  const horizRebarLF = (2 + n(s.bondBeamCourses)) * wallLF // 2 footing bars + bond beams
  const totalRebarLF = vertRebarLF + horizRebarLF
  return { footingCF, footingCY, totalRebarLF }
}

function calcCmuStruct(s, mp = {}, materialRows = []) {
  const p = (db, fb) => (mp[db] != null ? mp[db] : fb)
  if (!structHasGeo(s)) return { mat: 0, hrs: 0 }
  const wallLF = n(s.wallLF)
  const wallHeightIn = n(s.wallHeightIn)
  const blocksPerCourse = Math.ceil((wallLF * 12) / BLOCK_LENGTH_IN)
  const coursesCount = Math.ceil(wallHeightIn / BLOCK_HEIGHT_IN)
  const rawBlocks = blocksPerCourse * coursesCount
  const totalBlocks = rawBlocks * 1.1
  const { footingCF, footingCY, totalRebarLF } = structFootingRebar(s)
  const groutCF = rawBlocks * GROUT_CF_PER_BLOCK * (n(s.pctGrouted) / 100)
  const groutCY = groutCF / 27
  const digHrs = footingCF > 0 ? footingCF * p(FP_RATES.digLab.dbName, FP_RATES.digLab.fallback) : 0
  const rebarHrs = totalRebarLF > 0 ? totalRebarLF * p(FP_RATES.rebarLab.dbName, FP_RATES.rebarLab.fallback) : 0
  const setBlockHrs = rawBlocks > 0 ? rawBlocks * p(FP_RATES.blockLab.dbName, FP_RATES.blockLab.fallback) : 0
  const groutRate = s.useGroutPump === 'Yes'
    ? p(FP_RATES.pumpGroutLab.dbName, FP_RATES.pumpGroutLab.fallback)
    : p(FP_RATES.handGroutLab.dbName, FP_RATES.handGroutLab.fallback)
  const groutHrs = groutCF > 0 ? groutCF * groutRate : 0
  const structuralBaseHrs = digHrs + rebarHrs + setBlockHrs + groutHrs
  const curveAddHrs = structuralBaseHrs * (n(s.pctCurved) / 100) * p('FP Curve Labor Factor')
  const picked = catalogRowById(materialRows, s.matType)
  const blockPrice = picked ? n(picked.unit_cost) : p(FP_RATES.fpBlock.dbName, FP_RATES.fpBlock.fallback)
  const blockMat = totalBlocks * blockPrice
  const rebarMat = totalRebarLF * p('Rebar ' + (s.rebarSize || '#4'), FP_RATES.fpRebar.fallback)
  const footingMat = footingCY * p(FP_RATES.fpConcrete.dbName, FP_RATES.fpConcrete.fallback)
  const groutMat = groutCY * p(FP_RATES.fpConcrete.dbName, FP_RATES.fpConcrete.fallback)
  const pumpSetupMat = s.useGroutPump === 'Yes' && groutCF > 0
    ? p(FP_RATES.fpGroutPump.dbName, FP_RATES.fpGroutPump.fallback)
    : 0
  const mat = blockMat + rebarMat + footingMat + groutMat + pumpSetupMat
  const hrs = n(s.layoutHrs) + structuralBaseHrs + curveAddHrs
  return { mat, hrs, blocksPerCourse, coursesCount, rawBlocks, totalBlocks, footingCF, footingCY, groutCF, groutCY, totalRebarLF, curveAddHrs, blockMat, rebarMat, footingMat, groutMat, pumpSetupMat }
}

function calcPipStruct(s, mp = {}, materialRows = []) {
  const p = (db, fb) => (mp[db] != null ? mp[db] : fb)
  if (!structHasGeo(s)) return { mat: 0, hrs: 0 }
  const wallLF = n(s.wallLF)
  const wallHt = n(s.wallHeightIn) / 12
  const wallWidthIn = n(s.wallWidthIn) || BLOCK_WIDTH_IN
  const pourCF = wallLF * wallHt * (wallWidthIn / 12)
  const pourCY = pourCF / 27
  const formSF = 2 * wallLF * wallHt
  const { footingCF, footingCY, totalRebarLF } = structFootingRebar(s)
  const picked = catalogRowById(materialRows, s.matType)
  const mixPrice = picked ? n(picked.unit_cost) : p(FP_RATES.fpConcrete.dbName, FP_RATES.fpConcrete.fallback)
  const pourMat = pourCY * mixPrice
  const formMat = formSF * p(FORM_LUMBER_NAME, 0)
  const rebarMat = totalRebarLF * p('Rebar ' + (s.rebarSize || '#4'), FP_RATES.fpRebar.fallback)
  const footingMat = footingCY * p(FP_RATES.fpConcrete.dbName, FP_RATES.fpConcrete.fallback)
  const mat = pourMat + formMat + rebarMat + footingMat
  const digHrs = footingCF > 0 ? footingCF * p(FP_RATES.digLab.dbName, FP_RATES.digLab.fallback) : 0
  const rebarHrs = totalRebarLF > 0 ? totalRebarLF * p(FP_RATES.rebarLab.dbName, FP_RATES.rebarLab.fallback) : 0
  const pourHrs = pourCY * p(FP_POUR_LAB.dbName, FP_POUR_LAB.fallback)
  const formHrs = formSF * p(FP_FORM_LAB.dbName, FP_FORM_LAB.fallback)
  const structuralBaseHrs = digHrs + rebarHrs + pourHrs + formHrs
  const curveAddHrs = structuralBaseHrs * (n(s.pctCurved) / 100) * p('FP Curve Labor Factor')
  const hrs = n(s.layoutHrs) + structuralBaseHrs + curveAddHrs
  return { mat, hrs, pourCY, formSF, footingCF, footingCY, totalRebarLF, curveAddHrs, pourMat, formMat, rebarMat, footingMat }
}

function calcModularStruct(s, mp = {}, materialRows = []) {
  const p = (db, fb) => (mp[db] != null ? mp[db] : fb)
  if (!structHasGeo(s)) return { mat: 0, hrs: 0 }
  const wallLF = n(s.wallLF)
  const wallHeightIn = n(s.wallHeightIn)
  const picked = catalogRowById(materialRows, s.matType)
  const dims = picked ? blockDims(picked) : { w: 8, h: 8, l: 16 }
  const blocksPerCourse = Math.ceil((wallLF * 12) / dims.l)
  const coursesCount = Math.ceil(wallHeightIn / dims.h)
  const rawBlocks = blocksPerCourse * coursesCount
  const totalBlocks = rawBlocks * 1.1
  const { footingCF, footingCY, totalRebarLF } = structFootingRebar(s)
  const blockPrice = picked ? n(picked.unit_cost) : 0
  const blockMat = totalBlocks * blockPrice
  const rebarMat = totalRebarLF * p('Rebar ' + (s.rebarSize || '#4'), FP_RATES.fpRebar.fallback)
  const footingMat = footingCY * p(FP_RATES.fpConcrete.dbName, FP_RATES.fpConcrete.fallback)
  const mat = blockMat + rebarMat + footingMat
  const digHrs = footingCF > 0 ? footingCF * p(FP_RATES.digLab.dbName, FP_RATES.digLab.fallback) : 0
  const rebarHrs = totalRebarLF > 0 ? totalRebarLF * p(FP_RATES.rebarLab.dbName, FP_RATES.rebarLab.fallback) : 0
  const setBlockHrs = rawBlocks > 0 ? rawBlocks * p(FP_RATES.blockLab.dbName, FP_RATES.blockLab.fallback) : 0
  const structuralBaseHrs = digHrs + rebarHrs + setBlockHrs
  const curveAddHrs = structuralBaseHrs * (n(s.pctCurved) / 100) * p('FP Curve Labor Factor')
  const hrs = n(s.layoutHrs) + structuralBaseHrs + curveAddHrs
  return { mat, hrs, blocksPerCourse, coursesCount, rawBlocks, totalBlocks, footingCF, footingCY, totalRebarLF, curveAddHrs, blockMat, rebarMat, footingMat }
}

function calcBrickStruct(s, mp = {}, materialRows = []) {
  const p = (db, fb) => (mp[db] != null ? mp[db] : fb)
  if (!structHasGeo(s)) return { mat: 0, hrs: 0 }
  const wallLF = n(s.wallLF)
  const faceSF = wallLF * (n(s.wallHeightIn) / 12)
  const picked = catalogRowById(materialRows, s.matType)
  const perSqft = n(picked && picked.calc_meta && picked.calc_meta.per_sqft) || 7
  const brickPrice = picked ? n(picked.unit_cost) : 0
  const bricks = faceSF * perSqft
  const { footingCF, footingCY, totalRebarLF } = structFootingRebar(s)
  const brickMat = bricks * brickPrice
  const mortarMat = faceSF * p(MORTAR_NAME, 0)
  const rebarMat = totalRebarLF * p('Rebar ' + (s.rebarSize || '#4'), FP_RATES.fpRebar.fallback)
  const footingMat = footingCY * p(FP_RATES.fpConcrete.dbName, FP_RATES.fpConcrete.fallback)
  const mat = brickMat + mortarMat + rebarMat + footingMat
  const digHrs = footingCF > 0 ? footingCF * p(FP_RATES.digLab.dbName, FP_RATES.digLab.fallback) : 0
  const rebarHrs = totalRebarLF > 0 ? totalRebarLF * p(FP_RATES.rebarLab.dbName, FP_RATES.rebarLab.fallback) : 0
  const brickHrs = faceSF * p(FP_BRICK_LAY.dbName, FP_BRICK_LAY.fallback)
  const structuralBaseHrs = digHrs + rebarHrs + brickHrs
  const curveAddHrs = structuralBaseHrs * (n(s.pctCurved) / 100) * p('FP Curve Labor Factor')
  const hrs = n(s.layoutHrs) + structuralBaseHrs + curveAddHrs
  return { mat, hrs, faceSF, bricks, footingCF, footingCY, totalRebarLF, curveAddHrs, brickMat, mortarMat, rebarMat, footingMat }
}

export const STRUCT_CALC = { CMU: calcCmuStruct, PIP: calcPipStruct, Modular: calcModularStruct, Brick: calcBrickStruct }
