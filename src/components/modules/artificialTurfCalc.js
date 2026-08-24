// Pure Artificial Turf calc — extracted from ArtificialTurfModule.jsx so the math is
// unit-testable without React/Supabase. Logic identical. calcWalkAccessLabor (lib/walkAccess)
// and the catalog resolvers catalogItemFor/catalogOptions (lib/materialCatalog) both import
// supabase, so their pure bodies are inlined here. The module keeps its own copies of the
// helpers for JSX; this file owns the copies the calc consumes.
import { LAB } from '../../lib/laborRefs.js'
import { makeModuleRates } from '../../lib/moduleRates.js'
const n = v => parseFloat(v) || 0
const DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN = 60
const isStandardSel = v => !v || v === 'Standard'

function calcWalkAccessLabor(laborSubtotalHrs, distanceLF, opts = {}) {
  const hrs = n(laborSubtotalHrs); const lf = n(distanceLF)
  const pace = n(opts.paceLfPerMin) || DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN
  if (hrs <= 0 || lf <= 0 || pace <= 0) return 0
  return ((hrs / 8) * (lf * 2)) / pace
}
function catalogOptions(materialRows, subcategory, vendorSel, { standardRows = 'exclude', stripPrefix = false, category = null } = {}) {
  const isStandard = isStandardSel(vendorSel) || vendorSel === 'Custom'
  if (isStandard && standardRows === 'exclude') return []
  const prefix = `${subcategory} - `
  return (materialRows || [])
    .filter(r => r.sub_category === subcategory && (!category || r.category === category) && (isStandard ? r.vendor_id == null : r.vendor_id === vendorSel))
    .map(r => {
      const label = stripPrefix && r.name && r.name.startsWith(prefix) ? r.name.slice(prefix.length) : r.name
      return { id: r.id, value: r.id, label, stored: label, row: r }
    })
}
function catalogItemFor(materialRows, subcategory, vendorSel, key, opts = {}) {
  const { fallbackFirst = true, ...rest } = opts
  const options = catalogOptions(materialRows, subcategory, vendorSel, rest)
  if (!options.length) return null
  if (!key) return fallbackFirst ? options[0].row : null
  const byId = options.find(o => o.id === key)
  if (byId) return byId.row
  const byLabel = options.find(o => o.stored === key || o.label === key)
  if (byLabel) return byLabel.row
  return fallbackFirst ? options[0].row : null
}

// ── Module const/helper block (carried verbatim; the pieces the calc consumes) ──
const CATALOG_OPTS = { standardRows: 'null-vendor', stripPrefix: true }
const TURF_CAT = { base: 'Turf Base', turf: 'Turf Material' }

export const DEMO_METHODS = [
  { key: 'Skid Steer Good', label: 'Skid Steer (Good)', matKey: LAB.TURF_DEMO_SKID_GOOD },
  { key: 'Skid Steer OK', label: 'Skid Steer (OK)', matKey: LAB.TURF_DEMO_SKID_OK },
  { key: 'Mini Skid Steer', label: 'Mini Skid Steer', matKey: LAB.TURF_DEMO_MINI_SKID },
  { key: 'Wheelbarrow', label: 'Wheelbarrow', matKey: LAB.TURF_DEMO_WHEELBARROW },
  { key: 'Hand', label: 'Hand', matKey: LAB.TURF_DEMO_HAND },
]
export const DEMO_ROWS = [
  { key: 'concrete', label: 'Concrete', dumpKey: 'Dump Fee - Concrete' },
  { key: 'soil', label: 'Soil', dumpKey: 'Dump Fee - Dirt' },
  { key: 'lawn', label: 'Lawn', dumpKey: 'Dump Fee - Green Waste' },
]
const BASE_MATERIALS = [
  { key: 'Gravel', label: 'Class II Roadbase', qtyUnit: 'cy' },
  { key: 'DG', label: 'DG', qtyUnit: 'cy' },
  { key: 'Weed', label: 'Weed Barrier', qtyUnit: 'sf' },
]
const BASE_KINDS = [
  { key: 'Gravel', label: 'Roadbase', match: r => r.sub_category === 'Base Material' },
  { key: 'DG', label: 'DG Base', match: r => r.sub_category === 'Decomposed Granite' },
  { key: 'Weed', label: 'Weed Barrier', match: r => r.sub_category === 'Barriers' },
]
const baseKindDef = key => BASE_KINDS.find(b => b.key === key) || BASE_KINDS[0]

// Price for a base row's selected Type + vendor from the shared rows.
function baseTypePrice(sharedRows, kind, vendorSel, typeName) {
  if (!typeName) return 0
  const def = baseKindDef(kind)
  const isStd = !vendorSel || vendorSel === 'Standard' || vendorSel === 'auto'
  if (!isStd) {
    const vr = (sharedRows || []).find(r => def.match(r) && r.name === typeName && r.vendor_id === vendorSel)
    if (vr && n(vr.unit_cost) > 0) return n(vr.unit_cost)
  }
  const sr = (sharedRows || []).find(r => def.match(r) && r.name === typeName && r.vendor_id == null)
  if (sr) return n(sr.unit_cost)
  return 0
}
// Resolve a turf-brand selection (row id / legacy key / label) to its catalog row,
// preferring a vendor-specific row over Standard.
function turfBrandRow(materialRows, vendorSel, key) {
  return (
    catalogItemFor(materialRows, TURF_CAT.turf, vendorSel, key, { standardRows: 'null-vendor', stripPrefix: true, fallbackFirst: false }) ||
    catalogItemFor(materialRows, TURF_CAT.turf, 'Standard', key, { standardRows: 'null-vendor', stripPrefix: true, fallbackFirst: true })
  )
}

export function calcTurf(
  state,
  laborRatePerHour,
  materialPrices,
  laborRates,
  gpmd,
  walkAccess = null,
  laborBurdenPct,
  subRates = {},
  materialRows = [],
  catDefaults = {},
  commissionRate,
  sharedBaseRows = []
) {
  const _pace = parseFloat(walkAccess?.paceLfPerMin) || DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN
  const mp = materialPrices || {}
  const lr = laborRates || {}
  const lrph = n(laborRatePerHour)
  // Unpriced-labor surfacing: read in-house labor rates through R.labor at their
  // guarded point of use so an unset rate (still $0 in the math) becomes a visible
  // fix-it prompt. Value-identical to n(lr[name]); purely additive.
  const R = makeModuleRates({ material: mp, labor: lr, sub: subRates || {}, misc: mp, materialRows: materialRows || [] })
  const hrsAdj = n(state.hoursAdj)
  const distanceLF = n(state.distanceLF)

  const isSub = state.subType === 'Subcontractor'
  const subInstallPerSF = n(subRates['Turf Sub - Install Per SF'])
  const subStripPerLF = n(subRates['Turf Sub - Strip Per LF'])

  function demoRate(method) {
    const m = DEMO_METHODS.find(x => x.key === method)
    return n(lr[m?.matKey])
  }

  let demoHrs = 0, demoMat = 0
  const demoCalc = DEMO_ROWS.map(row => {
    const sf = n(state.demo[row.key]?.sf)
    const inches = n(state.demo[row.key]?.inches) || 4
    const method = state.demo[row.key]?.method || 'Skid Steer Good'
    const dumpRate = n(mp[row.dumpKey])
    // Volume in Cu Yd (tons removed): SF × depth_in / 324 (27 cf/cy × 12 in/ft).
    const cy = sf > 0 ? (sf * (inches / 12)) / 27 : 0
    // Demo labor (hrs per Cu Yd) read via R.labor at point-of-use, guarded by cy,
    // so an unset method rate surfaces only when that demo row has volume.
    const dm = DEMO_METHODS.find(x => x.key === method)
    const rate = cy > 0
      ? R.labor(dm?.matKey, { category: 'Artificial Turf', unit: 'Hrs per Cu Yd', label: 'Demo — ' + (dm?.label || method) })
      : demoRate(method)
    const hrs = cy * rate // demo rate is hours per Cu Yd
    const mat = cy * dumpRate // dump per Cu Yd
    demoHrs += hrs; demoMat += mat
    return { sf, inches, method, rate, cy, hrs, mat, dumpRate }
  })

  const turfAreaSF = Math.max(...DEMO_ROWS.map(r => n(state.demo[r.key]?.sf))) || 0

  let baseHrs = 0, baseMat = 0
  const weedFabricSFPerRoll = n(mp['Turf - Weed Fabric SF per Roll'])
  const baseCalc = (state.baseRows || []).map(row => {
    if (!row.material)
      return { material: '', label: '', qtyUnit: '', sf: n(row.sf), qty: 0, hrs: 0, mat: 0, price: 0 }
    const def = BASE_MATERIALS.find(m => m.key === row.material) || BASE_MATERIALS[0]
    const sf = n(row.sf) || turfAreaSF
    const price = baseTypePrice(sharedBaseRows, row.material, row.vendor, row.type)
    const classIIDepthIn = n(mp['Turf - Class II Depth In']) || 3
    const dgDepthIn = n(mp['Turf - DG Depth In']) || 1
    let qty = 0, hrs = 0
    if (def.key === 'Gravel') {
      const baseSFPerHr = n(mp['Turf - Base Install'])
      qty = sf > 0 && classIIDepthIn > 0 ? (sf * (classIIDepthIn / 12)) / 27 : 0
      hrs = sf * baseSFPerHr
    } else if (def.key === 'DG') {
      const dgSFPerHr = n(mp['Turf - DG Base Install'])
      qty = sf > 0 && dgDepthIn > 0 ? (sf * (dgDepthIn / 12)) / 27 : 0
      hrs = sf * dgSFPerHr
    } else {
      const weedSFPerHr = n(mp['Turf - Weed Fabric Install'])
      qty = sf
      hrs = sf * weedSFPerHr
    }
    const mat = qty * price
    baseHrs += hrs; baseMat += mat
    return { material: def.key, label: def.label, qtyUnit: def.qtyUnit, sf: n(row.sf), qty, hrs, mat, price }
  })

  if (isSub) { baseHrs = 0; baseMat = 0 }

  const turfSFHr = n(lr[LAB.TURF_TURF_INSTALL])
  const rollWidthFt = n(mp['Turf - Roll Width FT']) || 15
  let turfHrs = 0, turfMat = 0, totalEdgeLF = 0, subTurfCost = 0, cutHrs = 0, cutMat = 0, subCutMat = 0, infillMat = 0
  const installMatPerLF = n(mp['Turf - Install Materials'])
  const cutSFHr = n(mp['Turf - Cut/Staple/Seam'])
  const infillSFPerBag = n(mp['Turf - Infill SF per Bag'])
  const zeoPerBag = n(mp['Turf - Infill ZeoFill'])
  const durafillPerSF = n(mp['Turf - Infill Durafill'])

  const rollCalc = state.rolls.map(roll => {
    const useZeo = !!roll.useZeoFill
    if (!roll.brand)
      return { edgeLF: n(roll.edgeLF), installSF: n(roll.installSF), sf: 0, brand: '', pricePerSF: 0, hrs: 0, mat: 0, rowSubCost: 0, cutHrs: 0, cutMat: 0, subCutMat: 0, infillMat: 0, infillSF: 0, useZeoFill: useZeo }
    const edgeLF = n(roll.edgeLF)
    const installSF = n(roll.installSF)
    const brandRow = turfBrandRow(materialRows, roll.vendor, roll.brand)
    const pricePerSF = n(brandRow?.unit_cost)
    const sf = isSub ? installSF : edgeLF * rollWidthFt
    // Turf install labor (hrs per Sq Ft) via R.labor at point-of-use — in-house only
    // (Sub is flat-priced), guarded by sf so an unset rate surfaces only when used.
    const hrs = (!isSub && sf > 0) ? sf * R.labor(LAB.TURF_TURF_INSTALL, { category: 'Artificial Turf', unit: 'Hrs per Sq Ft', label: 'Turf Install' }) : 0
    const mat = isSub ? 0 : sf * pricePerSF
    const rowSubCost = installSF * (subInstallPerSF + pricePerSF)
    const rCutHrs = !isSub ? edgeLF * cutSFHr : 0
    const rSubCutMat = installMatPerLF * edgeLF
    const rCutMat = isSub ? 0 : installMatPerLF * edgeLF
    let rInfillMat = 0
    if (!isSub && sf > 0) {
      if (useZeo) {
        const bags = infillSFPerBag > 0 ? Math.ceil(sf / infillSFPerBag) : 0
        rInfillMat = bags * zeoPerBag
      } else {
        rInfillMat = sf * durafillPerSF
      }
    }
    turfHrs += hrs; turfMat += mat; totalEdgeLF += edgeLF; subTurfCost += rowSubCost
    cutHrs += rCutHrs; cutMat += rCutMat; subCutMat += rSubCutMat; infillMat += rInfillMat
    return { edgeLF, installSF, sf, brand: roll.brand, pricePerSF, hrs, mat, rowSubCost, cutHrs: rCutHrs, cutMat: rCutMat, subCutMat: rSubCutMat, infillMat: rInfillMat, infillSF: sf, useZeoFill: useZeo }
  })
  const infillAreaSF = rollCalc.reduce((s, r) => s + (r.infillSF || 0), 0)

  const stripLFHr = n(lr[LAB.TURF_STRIP_INSTALL])
  let stripsHrs = 0, stripsMat = 0, subStripsCost = 0
  const stripCalc = (state.stripRows || []).map(strip => {
    const lf = n(strip?.lf)
    const widthIn = n(strip?.widthIn) || 12
    const has = !!(strip && strip.brand)
    const brandRow = has ? turfBrandRow(materialRows, strip?.vendor, strip?.brand) : null
    const price = n(brandRow?.unit_cost)
    const sf = lf * (widthIn / 12)
    // Strip install labor (hrs per Ln Ft) via R.labor at point-of-use — in-house only,
    // guarded by lf so an unset rate surfaces only when a strip row is actually used.
    const hrs = (has && !isSub && lf > 0) ? lf * R.labor(LAB.TURF_STRIP_INSTALL, { category: 'Artificial Turf', unit: 'Hrs per Ln Ft', label: 'Turf Strip Install' }) : 0
    const mat = has && !isSub ? price * sf : 0
    const rowSubCost = has ? lf * subStripPerLF + price * sf : 0
    stripsHrs += hrs; stripsMat += mat; subStripsCost += rowSubCost
    return { lf, widthIn, price, sf, hrs, mat, rowSubCost }
  })

  const manualFiltered = (state.manualRows || []).filter(
    r => n(r.hours) > 0 || n(r.materials) > 0 || n(r.subCost) > 0
  )
  const manualHrs = manualFiltered.reduce((s, r) => s + n(r.hours), 0)
  const manualMat = manualFiltered.reduce((s, r) => s + n(r.materials), 0)
  const manualSub = manualFiltered.reduce((s, r) => s + n(r.subCost), 0)

  const rawHrs = baseHrs + turfHrs + stripsHrs + cutHrs + manualHrs
  const diffHrs = (rawHrs * n(state.difficulty)) / 100
  const _preWalkHrs = rawHrs + diffHrs + hrsAdj
  const walkHrs = calcWalkAccessLabor(_preWalkHrs, distanceLF, { paceLfPerMin: _pace })
  const totalHrs = _preWalkHrs + walkHrs
  const totalMat = baseMat + turfMat + stripsMat + cutMat + infillMat + manualMat
  const subCost = manualSub + (isSub ? subTurfCost + subStripsCost + subCutMat : 0)

  const manDays = totalHrs / 8
  const laborCost = totalHrs * lrph
  const burden = laborCost * n(laborBurdenPct)
  const gp = manDays * n(gpmd)
  const commission = gp * n(commissionRate)
  const price = laborCost + burden + totalMat + gp + commission + subCost

  return {
    unpriced: R.unpricedList,
    walkHrs, totalHrs, manDays, laborCost, burden, totalMat, subCost, gp, commission, price,
    infillAreaSF, demoCalc, turfAreaSF, baseCalc, rollCalc, totalEdgeLF, turfHrs, turfSFHr, turfMat,
    stripCalc, stripsHrs, stripLFHr, stripsMat, cutHrs, cutMat, subCutMat, infillMat, demoHrs, baseHrs,
    rawHrs, diffHrs, isSub, subTurfCost, subStripsCost, subInstallPerSF, subStripPerLF,
    weedFabricSFPerRoll, rollWidthFt, infillSFPerBag,
  }
}
