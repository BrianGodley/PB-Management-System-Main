import WorkTypeChooser from './WorkTypeChooser'
import CrewTypeBar from './CrewTypeBar'
import ModuleHeaderSlot from './ModuleHeaderSlot'
// ─────────────────────────────────────────────────────────────────────────────
// ArtificialTurfModule — Artificial Turf system estimator
// Rates pulled from DB:
//   labor_rates  (category='Artificial Turf') — demo, base, install, cut rates
//   material_rates (category='Artificial Turf') — turf brands, base, infill, install materials
//   material_rates (category='Demo') — dump fees for concrete/soil/green waste
//
// Excel source: "Artificial Turf Module" sheet + Master Rates and Calcs
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useContext } from 'react'
import { SubTabContext, subSectionTitle } from './subTabContext'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import { fetchSalesTaxRate } from '../../lib/companyDefaults'
import { calcWalkAccessLabor, DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN } from '../../lib/walkAccess'
import { catalogItemFor, catalogOptions, fetchModuleCatalog, fetchStandardRateMap } from '../../lib/materialCatalog'

const CATALOG_OPTS = { standardRows: 'exclude', stripPrefix: true }

// ── Demo method rates (tons/hr) — DemoRatesTurf lookup table ────────────────
const DEMO_METHODS = [
  { key: 'Skid Steer Good', label: 'Skid Steer (Good)', matKey: 'Turf - Demo Skid Steer Good' },
  { key: 'Skid Steer OK', label: 'Skid Steer (OK)', matKey: 'Turf - Demo Skid Steer OK' },
  { key: 'Mini Skid Steer', label: 'Mini Skid Steer', matKey: 'Turf - Demo Mini Skid Steer' },
  { key: 'Wheelbarrow', label: 'Wheelbarrow', matKey: 'Turf - Demo Wheelbarrow' },
  { key: 'Hand', label: 'Hand', matKey: 'Turf - Demo Hand' },
]

// ── Demo row types — each has its dump fee key ────────────────────────────────
const DEMO_ROWS = [
  { key: 'concrete', label: 'Concrete', dumpKey: 'Dump Fee - Concrete' },
  { key: 'soil', label: 'Soil', dumpKey: 'Dump Fee - Dirt' },
  { key: 'lawn', label: 'Lawn', dumpKey: 'Dump Fee - Green Waste' },
]

// Turf brands are no longer a hardcoded list — they live in the catalog as
// products (category 'Artificial Turf', sub_category 'Turf Material'). See
// turfBrandOptions / turfBrandRow below.

// ── Estimate-config factors ───────────────────────────────────────────────────
// Only the company/estimate-config constants live here. Every per-item labor
// coefficient and material price is read live from the rate tables (labor_rates
// / misc_rates / material) — no hardcoded rate fallbacks. Missing rates are
// guaranteed by supabase-turf-fallbacks-seed.sql.
// Company/estimate financial settings (labor rate, burden %, GPMD, commission,
// sub GP markup) are sourced live from company_settings — no hardcoded defaults.

// ── Calculation engine ────────────────────────────────────────────────────────
const n = v => parseFloat(v) || 0

// ── Vendor catalog: material-only price override ─────────────────────────────
// The Type (turf brand / base material) still sets the item and its Standard price;
// a real vendor only overrides the MATERIAL price for that item (matched by
// label in the vendor's catalog), never labor.
const TURF_CAT = { base: 'Turf Base', turf: 'Turf Material' }
// Shared Turf Prep base materials. The two prep bases reuse the SAME catalog item
// + Standard price that other modules already price against, so a rate change
// propagates everywhere instead of living in Turf's own 'Turf - Gravel/DG Base'
// rates:
//   • DG (Class II divisor row) ↔ Ground Treatments 'Decomposed Granite' (per ton)
//   • Class II Roadbase        ↔ the Concrete module's base item ('Class II
//     Roadbase', else the 'Base - Class II Roadbase' named rate)
// Their Standard prices are stashed in the module price map (mp): DG under its own
// name, Class II under a synthetic key so it can't collide with the Turf Base
// catalog's OWN 'Class II Roadbase' picker product (same name, different item).
const SHARED_DG_NAME = 'Decomposed Granite'
const SHARED_CLASS2_NAMES = ['Class II Roadbase', 'Base - Class II Roadbase']
const SHARED_CLASS2_KEY = 'Turf Prep — Class II Base (shared)'
// Weed fabric is now the company-wide shared 'Weed Fabric' record (Basic
// Materials → Barriers, priced per Sq Ft) — same pattern as Class II / DG.
const SHARED_WEED_NAME = 'Weed Fabric'
const SHARED_WEED_NAMES = ['Weed Fabric', 'Weed Barrier Fabric', 'Turf - Weed Barrier Fabric']
// First key with a defined value wins (no hardcoded price fallback).
const firstDefinedRate = (m, keys) => {
  for (const k of keys) if (m && m[k] != null) return m[k]
  return undefined
}
// Resolve a shared base material price (Class II / DG / Weed) for the chosen
// vendor from the SHARED catalog rows (Concrete / Basic Materials / Ground
// Treatments), since those items no longer live in the Artificial Turf catalog.
// Vendor pick → that vendor's open price for the item; else the Standard
// (null-vendor) price; else the name-keyed Standard fallback from the map.
const sharedBasePrice = (sharedRows, names, vendorSel, stdFallback) => {
  const isStd = !vendorSel || vendorSel === 'Standard' || vendorSel === 'auto'
  if (!isStd) {
    const vrow = (sharedRows || []).find(r => names.includes(r.name) && r.vendor_id === vendorSel)
    if (vrow && n(vrow.unit_cost) > 0) return n(vrow.unit_cost)
  }
  const srow = (sharedRows || []).find(r => names.includes(r.name) && r.vendor_id == null)
  if (srow != null) return n(srow.unit_cost)
  return n(stdFallback)
}
// Base-install material picker options. Each computes qty differently:
// Gravel/DG are priced per ton, Weed per roll. Vendor overrides material price
// only (matched by label); labor is per-material preset math.
// `dbName` maps each built-in to its catalog Item name under Sub-category
// 'Turf Base' (Gravel↔"Gravel Base", DG↔"DG Base", Weed↔"Weed Barrier Fabric").
// The built-in `label` ('2" Gravel Base' …) differs from the catalog name, so
// vendor/catalog price lookups key off `dbName`, while labor/qty coefficients
// still key off `key` (Gravel/DG/Weed).
const BASE_MATERIALS = [
  { key: 'Gravel', label: 'Class II Roadbase', dbName: 'Gravel Base', matKey: 'Turf - Gravel Base', qtyUnit: 'cy' },
  { key: 'DG', label: 'DG', dbName: 'DG Base', matKey: 'Turf - DG Base', qtyUnit: 'cy' },
  { key: 'Weed', label: 'Weed Barrier', dbName: 'Weed Barrier Fabric', matKey: SHARED_WEED_NAME, qtyUnit: 'sf' },
]
// Turf Prep is three FIXED base layers, each its own mini-section: a fixed
// identity (row label) + vendor picker + Type picker whose options are the shared
// `material` rows for that layer. Vendor + Type together set the price.
//   Roadbase → Class II items (Basic Materials 'Aggregate & Concrete', matched by
//     name since that subcategory also holds concrete/sand)
//   DG Base  → Basic Materials subcategory 'Decomposed Granite'
//   Weed Barrier → Basic Materials subcategory 'Barriers'
const BASE_KINDS = [
  { key: 'Gravel', label: 'Roadbase', match: r => SHARED_CLASS2_NAMES.includes(r.name) },
  { key: 'DG', label: 'DG Base', match: r => r.sub_category === 'Decomposed Granite' },
  { key: 'Weed', label: 'Weed Barrier', match: r => r.sub_category === 'Barriers' },
]
const baseKindDef = key => BASE_KINDS.find(b => b.key === key) || BASE_KINDS[0]
// Vendor-first Type options: the shared products for this layer, filtered to the
// chosen vendor (Standard → null-vendor rows), unique by name.
function baseTypeOptions(sharedRows, kind, vendorSel) {
  const def = baseKindDef(kind)
  const isStd = !vendorSel || vendorSel === 'Standard' || vendorSel === 'auto'
  const seen = new Set()
  return (sharedRows || [])
    .filter(def.match)
    .filter(r => (isStd ? r.vendor_id == null : r.vendor_id === vendorSel))
    .filter(r => (seen.has(r.name) ? false : (seen.add(r.name), true)))
    .map(r => ({ label: r.name, value: r.name, price: n(r.unit_cost) }))
}
// Vendors that carry any product for this layer (for the row's vendor picker).
function baseVendorOptions(sharedRows, vendors, kind) {
  const def = baseKindDef(kind)
  const ids = new Set(
    (sharedRows || []).filter(def.match).filter(r => r.vendor_id != null).map(r => r.vendor_id)
  )
  return (vendors || []).filter(v => ids.has(v.id))
}
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
// Vendor-first Base-material picker options (mirrors UtilitiesModule.mergedUtilTypes
// and the turf-brand picker above). Standard/unset → the null-vendor 'Turf Base'
// catalog Items; a real vendor → only that vendor's Items. Each catalog Item is
// mapped back to its built-in (by catalog name / label) so labor + qty math and
// the built-in matKey/fallback stay intact. Options come ONLY from the catalog —
// when there are NO catalog Items for the selected vendor+sub-category the list is
// empty (the picker shows just its "Select …" placeholder). BASE_MATERIALS is still
// consulted for labor/qty coefficients on catalog rows, never for options.
function baseMatOptions(materialRows, vendorSel = 'Standard') {
  // Unset vendor (empty "Select vendor" placeholder) → no items; the estimator
  // picks a vendor first, then the base list populates (vendor-first).
  if (!vendorSel) return []
  const isStd = vendorSel === 'Standard' || vendorSel === 'auto'
  const catRows = catalogOptions(materialRows, TURF_CAT.base, isStd ? 'Standard' : vendorSel, {
    standardRows: 'null-vendor',
    stripPrefix: true,
    category: 'Artificial Turf',
  })
  if (!catRows.length) return []
  return catRows.map(o => {
    const bi = BASE_MATERIALS.find(m => m.dbName === o.row.name || m.label === o.label)
    return {
      ...(bi || {}),
      key: bi?.key, // built-in key drives labor/qty branch (Gravel/DG/Weed)
      value: bi?.key || o.row.name, // built-in key round-trips stored rows; else the Item name
      label: o.label, // show the catalog Item name
      dbName: o.row.name, // material-price target (matched by name for the vendor)
      qtyUnit: bi?.qtyUnit || 't',
      matKey: bi?.matKey,
      fromMaster: !bi,
    }
  })
}
function turfMatPrice(cat, vendorSel, typeLabel, houseName, materialRows, catDefaults, mp) {
  const vsel = vendorSel && vendorSel !== 'auto' ? vendorSel : catDefaults?.[cat] || 'Standard'
  const vrow = catalogItemFor(materialRows, cat, vsel, typeLabel, {
    ...CATALOG_OPTS,
    fallbackFirst: false,
  })
  if (vrow) return { price: n(vrow.unit_cost), dbName: vrow.name }
  // No hardcoded fallback — an unpriced item resolves to $0 (surfaced as $0).
  return { price: n(mp[houseName]), dbName: houseName }
}

// Turf brands live entirely in the catalog now (category 'Artificial Turf',
// sub_category 'Turf Material'). One product row per brand = one id; a vendor
// that quotes differently is a price tag on that same id, never a new row.
//   turfBrandOptions → the standard products for the picker ({id, label, row}).
//   turfBrandRow     → resolve a saved selection (row id, or a legacy key/label)
//                      to its row, preferring a vendor-specific row over standard.
function turfBrandOptions(materialRows, vendorSel = 'Standard') {
  // Unset vendor (empty "Select vendor" placeholder) → no items until a vendor
  // is chosen, then the list populates (vendor-first).
  if (!vendorSel) return []
  // Vendor-first (mirrors Paver's paverOptions): Standard/auto → the null-vendor
  // Standard products; a real vendor → only that vendor's Items.
  const vsel = vendorSel && vendorSel !== 'auto' ? vendorSel : 'Standard'
  return catalogOptions(materialRows, TURF_CAT.turf, vsel, {
    standardRows: 'null-vendor',
    stripPrefix: true,
  })
}
function turfBrandRow(materialRows, vendorSel, key) {
  return (
    catalogItemFor(materialRows, TURF_CAT.turf, vendorSel, key, {
      standardRows: 'null-vendor',
      stripPrefix: true,
      fallbackFirst: false,
    }) ||
    catalogItemFor(materialRows, TURF_CAT.turf, 'Standard', key, {
      standardRows: 'null-vendor',
      stripPrefix: true,
      fallbackFirst: true,
    })
  )
}

function calcTurf(
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
  const hrsAdj = n(state.hoursAdj)
  const distanceLF = n(state.distanceLF) // avg distance truck to work area

  // ── Subcontractor tab ──────────────────────────────────────────────────────
  // On the Sub tab, turf install + strips become flat sub costs (SF/LF based,
  // no labor hours). Rates come from subcontractor_rates (category 'Artificial
  // Turf'), keyed by company_name.
  const isSub = state.subType === 'Subcontractor'
  const subInstallPerSF = n(subRates['Turf Sub - Install Per SF'])
  const subStripPerLF = n(subRates['Turf Sub - Strip Per LF'])

  // Look up demo method rate (tons/hr) for each demo row
  function demoRate(method) {
    const m = DEMO_METHODS.find(x => x.key === method)
    return n(lr[m?.matKey])
  }

  // ── Demo section ──────────────────────────────────────────────────────────
  // Removal tonnage density (SF·inch per ton) — DB-editable coefficient.
  const demoTonsDivisor = n(mp['Turf - Demo Tons Divisor'])
  let demoHrs = 0,
    demoMat = 0
  const demoCalc = DEMO_ROWS.map(row => {
    const sf = n(state.demo[row.key]?.sf)
    const inches = n(state.demo[row.key]?.inches) || 4
    const method = state.demo[row.key]?.method || 'Skid Steer Good'
    const rate = demoRate(method)
    const dumpRate = n(mp[row.dumpKey])
    const tons = sf > 0 && demoTonsDivisor > 0 ? (sf / demoTonsDivisor) * inches : 0
    const hrs = tons > 0 && rate > 0 ? tons / rate : 0
    const mat = tons * dumpRate
    demoHrs += hrs
    demoMat += mat
    return { sf, inches, method, rate, tons, hrs, mat, dumpRate }
  })

  // Total turf SF comes from demo concrete row (K8 = K9 = K10 = same area)
  // Use the largest demo SF entered, or default to concrete row
  const turfAreaSF = Math.max(...DEMO_ROWS.map(r => n(state.demo[r.key]?.sf))) || 0

  // ── Base installation ─────────────────────────────────────────────────────
  // Rows: pick a material (Gravel/DG priced per ton, Weed per roll); Vendor
  // overrides the material price only. Labor is per-material preset math.
  //   Gravel: tons=(SF/200)*2, hrs=(SF/baseSFPerHr)*baseInstallRate
  //   DG:     tons=(SF*(1/12))/27, hrs handled by walk-access penalty (0 here)
  //   Weed:   rolls=ceil(SF/1800), hrs=(SF/1000)*weedFabricHrPer1kSF
  let baseHrs = 0,
    baseMat = 0
  // Gravel-base tonnage density (SF·inch per ton) + weed-fabric roll coverage —
  // DB-editable estimating coefficients.
  const gravelBaseTonsDivisor = n(mp['Turf - Gravel Base Tons Divisor'])
  const weedFabricSFPerRoll = n(mp['Turf - Weed Fabric SF per Roll'])
  const baseCalc = (state.baseRows || []).map(row => {
    // Unselected base material contributes nothing (no crash, no fallback-to-first).
    if (!row.material)
      return { material: '', label: '', qtyUnit: '', sf: n(row.sf), qty: 0, hrs: 0, mat: 0, price: 0 }
    // Each base row is a fixed layer (row.material = Gravel/DG/Weed). Its price is
    // the selected Type product for the chosen vendor, resolved from the shared
    // `material` + `material_price` rows (Basic Materials / Concrete / Ground
    // Treatments). Qty math below is unchanged (per-layer).
    const def = BASE_MATERIALS.find(m => m.key === row.material) || BASE_MATERIALS[0]
    const sf = n(row.sf) || turfAreaSF
    const price = baseTypePrice(sharedBaseRows, row.material, row.vendor, row.type)
    // Class II and DG are priced by the cubic yard (matching the master rates,
    // now per Cu Yd). Volume = SF × depth/12 ÷ 27, with DB-editable install
    // depths (misc_rates). Weed is now the shared 'Weed Fabric' record priced
    // per Sq Ft — billed SF × $/SF (company-wide consolidation).
    // Install depths are DB-editable (misc_rates) but fall back to their spec
    // defaults so the Cu Yd quantity never zeroes if the rate row is missing
    // (allowed coefficient fallbacks).
    const classIIDepthIn = n(mp['Turf - Class II Depth In']) || 3
    const dgDepthIn = n(mp['Turf - DG Depth In']) || 1
    let qty = 0, // display quantity (Cu Yd for Class II/DG, Sq Ft for Weed)
      hrs = 0
    if (def.key === 'Gravel') {
      const baseSFPerHr = n(mp['Turf - Base Install SF/hr'])
      qty = sf > 0 && classIIDepthIn > 0 ? (sf * (classIIDepthIn / 12)) / 27 : 0 // Cu Yd
      hrs = sf > 0 && baseSFPerHr > 0 ? sf / baseSFPerHr : 0
    } else if (def.key === 'DG') {
      const dgSFPerHr = n(mp['Turf - DG Base Install SF/hr'])
      qty = sf > 0 && dgDepthIn > 0 ? (sf * (dgDepthIn / 12)) / 27 : 0 // Cu Yd
      hrs = sf > 0 && dgSFPerHr > 0 ? sf / dgSFPerHr : 0
    } else {
      // Weed fabric: billed by the Sq Ft off the shared 'Weed Fabric' rate.
      // Install labor — DB-editable production rate (SF/hr).
      const weedSFPerHr = n(mp['Turf - Weed Fabric Install SF/hr'])
      qty = sf // Sq Ft
      hrs = sf > 0 && weedSFPerHr > 0 ? sf / weedSFPerHr : 0
    }
    // Class II / DG bill per Cu Yd; Weed bills per Sq Ft. All are qty × price.
    const mat = qty * price
    baseHrs += hrs
    baseMat += mat
    return { material: def.key, label: def.label, qtyUnit: def.qtyUnit, sf: n(row.sf), qty, hrs, mat, price }
  })

  // On the Sub tab there is no Base Installation section — the subcontractor's
  // flat SF/LF pricing is all-in — so base labor + material never apply.
  if (isSub) {
    baseHrs = 0
    baseMat = 0
  }

  // ── Turf installation (up to 3 rolls of 15' wide) ─────────────────────────
  // hrs = SF/TurfSFHr * TurfPH = SF/20 * 0.5
  const turfSFHr = n(lr['Turf - Turf Install SF/hr'])
  // Turf roll width (ft) — DB-editable product spec.
  // Roll width is a fixed physical spec (15' wide rolls); the misc_rates value is
  // editable but falls back to 15 so the section never silently zeroes if the
  // rate row is missing (allowed coefficient fallback).
  const rollWidthFt = n(mp['Turf - Roll Width FT']) || 15
  let turfHrs = 0,
    turfMat = 0,
    totalEdgeLF = 0,
    subTurfCost = 0

  const rollCalc = state.rolls.map(roll => {
    // Unselected turf roll (no brand) contributes nothing — no labor, no material,
    // and its edge LF is excluded from cut/seam totals (no crash, no fallback).
    if (!roll.brand)
      return { edgeLF: n(roll.edgeLF), installSF: n(roll.installSF), sf: 0, brand: '', pricePerSF: 0, hrs: 0, mat: 0, rowSubCost: 0 }
    const edgeLF = n(roll.edgeLF)
    const installSF = n(roll.installSF)
    const brandRow = turfBrandRow(materialRows, roll.vendor, roll.brand)
    const pricePerSF = n(brandRow?.unit_cost)
    // In-house derives SF from the 15' roll edge; the Sub tab uses the
    // installed SF the estimator enters directly.
    const sf = isSub ? installSF : edgeLF * rollWidthFt
    const hrs = !isSub && sf > 0 && turfSFHr > 0 ? sf / turfSFHr : 0
    const mat = isSub ? 0 : sf * pricePerSF
    // All-in sub cost for this roll: (sub install $/SF + material $/SF) × SF.
    const rowSubCost = installSF * (subInstallPerSF + pricePerSF)
    turfHrs += hrs
    turfMat += mat
    totalEdgeLF += edgeLF
    subTurfCost += rowSubCost
    return { edgeLF, installSF, sf, brand: roll.brand, pricePerSF, hrs, mat, rowSubCost }
  })

  // ── Turf Strips (row 20-21) ───────────────────────────────────────────────
  // Narrow/custom cut strips — separate from the 15' wide rolls.
  // Labor: hrs = (LF / 100) * 8  — Excel R20=(E21/100)*8
  // Material: brand $/SF × (LF × width ft)  — Excel S20=O20*Q20 (manual inputs)
  // Now a user-managed list of strip rows (was a single row).
  // Labor rate is DB-editable (LF/hr). Legacy (LF/100)*8 == LF/12.5.
  const stripLFHr = n(lr['Turf - Strip Install LF/hr'])
  let stripsHrs = 0,
    stripsMat = 0,
    subStripsCost = 0
  const stripCalc = (state.stripRows || []).map(strip => {
    const lf = n(strip?.lf)
    const widthIn = n(strip?.widthIn) || 12
    // Unselected strip (no brand) contributes nothing (no crash, no fallback).
    const has = !!(strip && strip.brand)
    const brandRow = has ? turfBrandRow(materialRows, strip?.vendor, strip?.brand) : null
    const price = n(brandRow?.unit_cost)
    const sf = lf * (widthIn / 12)
    const hrs = has && !isSub && lf > 0 && stripLFHr > 0 ? lf / stripLFHr : 0
    const mat = has && !isSub ? price * sf : 0
    // Sub strips: flat $/LF sub install + brand material $/SF.
    const rowSubCost = has ? lf * subStripPerLF + price * sf : 0
    stripsHrs += hrs
    stripsMat += mat
    subStripsCost += rowSubCost
    return { lf, widthIn, price, sf, hrs, mat, rowSubCost }
  })

  // ── Cut, Staple & Seam ────────────────────────────────────────────────────
  // hrs = (totalLF / TurfCutSfHr) * TurfCutRate = (totalLF/100)*1.0
  // mat = installMaterials ($/LF) × totalLF  — matches Excel S18=O18*Q18
  const installMatPerLF = n(mp['Turf - Install Materials'])
  // Cut/staple/seam labor coefficients are DB-editable (labor_rates).
  const cutSFHr = n(mp['Turf - Cut/Staple/Seam LF/hr'])
  const cutHrs =
    !isSub && totalEdgeLF > 0 && cutSFHr > 0 ? totalEdgeLF / cutSFHr : 0
  // On the Sub tab cut/seam material rolls into the sub cost bucket instead of
  // in-house material.
  const subCutMat = installMatPerLF * totalEdgeLF
  const cutMat = isSub ? 0 : installMatPerLF * totalEdgeLF

  // ── Infill ────────────────────────────────────────────────────────────────
  // Excel uses K8 (base gravel SF) directly for infill quantity — NOT the demo SF.
  // When no demo rows are entered, turfAreaSF = 0 but infill still applies to the
  // installed base area. Fall back to base SF so infill always calculates.
  // ZeoFill (pet): $30/bag, bags=ceil(SF/30)
  // Standard Durafill: $0.62/SF
  const infillAreaSF =
    turfAreaSF || (state.baseRows || []).reduce((m, r) => Math.max(m, n(r.sf)), 0)
  // ZeoFill coverage (SF per bag) — DB-editable product spec.
  const infillSFPerBag = n(mp['Turf - Infill SF per Bag'])
  let infillMat = 0
  if (!isSub && infillAreaSF > 0) {
    if (state.useZeoFill) {
      const bags = infillSFPerBag > 0 ? Math.ceil(infillAreaSF / infillSFPerBag) : 0
      infillMat = bags * n(mp['Turf - Infill ZeoFill'])
    } else {
      infillMat = infillAreaSF * n(mp['Turf - Infill Durafill'])
    }
  }

  // ── Manual entry ─────────────────────────────────────────────────────────
  const manualFiltered = (state.manualRows || []).filter(
    r => n(r.hours) > 0 || n(r.materials) > 0 || n(r.subCost) > 0
  )
  const manualHrs = manualFiltered.reduce((s, r) => s + n(r.hours), 0)
  const manualMat = manualFiltered.reduce((s, r) => s + n(r.materials), 0)
  const manualSub = manualFiltered.reduce((s, r) => s + n(r.subCost), 0)

  // ── Totals ────────────────────────────────────────────────────────────────
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
    walkHrs,
    totalHrs,
    manDays,
    laborCost,
    burden,
    totalMat,
    subCost,
    gp,
    commission,
    price,
    infillAreaSF,
    demoCalc,
    turfAreaSF,
    baseCalc,
    rollCalc,
    totalEdgeLF,
    turfHrs,
    turfSFHr,
    turfMat,
    stripCalc,
    stripsHrs,
    stripLFHr,
    stripsMat,
    cutHrs,
    cutMat,
    subCutMat,
    infillMat,
    demoHrs,
    baseHrs,
    rawHrs,
    diffHrs,
    isSub,
    subTurfCost,
    subStripsCost,
    subInstallPerSF,
    subStripPerLF,
    // Resolved tunable estimating coefficients (exposed for View Rates + display)
    demoTonsDivisor,
    gravelBaseTonsDivisor,
    weedFabricSFPerRoll,
    rollWidthFt,
    infillSFPerBag,
  }
}

// ── Default state ─────────────────────────────────────────────────────────────
const DEFAULT_STATE = {
  difficulty: 0,
  crewType: 'Landscape',
  hoursAdj: 0,
  distanceLF: 0, // avg distance from truck to work area
  demo: {
    concrete: { sf: '', inches: '4', method: 'Skid Steer Good' },
    soil: { sf: '', inches: '4', method: 'Skid Steer Good' },
    lawn: { sf: '', inches: '4', method: 'Skid Steer Good' },
  },
  // Master base area — filling this auto-populates each base row's Sq Ft.
  baseAreaSF: '',
  // Three FIXED base layers, each its own row: Roadbase, DG Base, Weed Barrier.
  // Each carries a vendor + Type selection that sets its price.
  baseRows: [
    { material: 'Gravel', type: '', sf: '', vendor: 'Standard' },
    { material: 'DG', type: '', sf: '', vendor: 'Standard' },
    { material: 'Weed', type: '', sf: '', vendor: 'Standard' },
  ],
  useZeoFill: false,
  rolls: [{ brand: '', edgeLF: '', vendor: '' }],
  stripRows: [{ lf: '', widthIn: '12', brand: '', vendor: '' }],
  manualRows: [{ label: '', hours: '', materials: '', subCost: '' }],
}

// ── Per-tab input record ──────────────────────────────────────────────────────
// In-House and Sub each hold their own independent copy of every user-input
// field, so the two tabs are separate calculators. Shared fields (crewType,
// subType, rate maps, notes) live at the top level of `state`, not here.
function makeTurfTab(src = {}) {
  const d = DEFAULT_STATE
  return {
    difficulty: src.difficulty ?? d.difficulty,
    hoursAdj: src.hoursAdj ?? d.hoursAdj,
    distanceLF: src.distanceLF ?? d.distanceLF,
    demo: {
      concrete: { ...d.demo.concrete, ...(src.demo?.concrete) },
      soil: { ...d.demo.soil, ...(src.demo?.soil) },
      lawn: { ...d.demo.lawn, ...(src.demo?.lawn) },
    },
    baseRows: (src.baseRows || d.baseRows).map(r => ({ ...r })),
    useZeoFill: src.useZeoFill ?? d.useZeoFill,
    rolls: (src.rolls || d.rolls).map(r => ({ ...r })),
    // strips was a single object; migrate legacy saves into the new row list.
    stripRows: (src.stripRows || (src.strips ? [src.strips] : d.stripRows)).map(r => ({ ...r })),
    manualRows: (src.manualRows || d.manualRows).map(r => ({ ...r })),
  }
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function SecHdr({ title }) {
  const isSub = useContext(SubTabContext)
  return (
    <div className="bg-gray-100 rounded-lg px-4 py-2.5 border border-gray-200 mb-2">
      <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">{subSectionTitle(title, isSub)}</h3>
    </div>
  )
}
function Inp({ value, onChange, placeholder = '0', type = 'number', step, className = '' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      step={step}
      className={`w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 ${className}`}
    />
  )
}
function Sel({ value, onChange, options, optionLabels, placeholder }) {
  // When `placeholder` is provided, an unset value shows the placeholder (empty
  // option) and a stored value not in `options` stays selectable (backward-compat).
  const hasVal = value !== '' && value != null
  const known = options.includes(value)
  return (
    <select
      value={hasVal ? value : ''}
      onChange={onChange}
      className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
    >
      {placeholder && !hasVal && <option value="">{placeholder}</option>}
      {placeholder && hasVal && !known && <option value={value}>{value}</option>}
      {options.map((o, i) => (
        <option key={o} value={o}>
          {optionLabels ? optionLabels[i] : o}
        </option>
      ))}
    </select>
  )
}
function TH({ cols }) {
  return (
    <thead>
      <tr className="text-center text-gray-400 border-b border-gray-100 text-xs">
        {cols.map((c, i) => (
          <th key={i} className={`py-1 pr-2 font-medium ${c.w || ''}`}>
            {c.label}
          </th>
        ))}
      </tr>
    </thead>
  )
}
function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="w-4 h-4 rounded accent-blue-600"
      />
      <span className="text-xs text-gray-700">{label}</span>
    </label>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ArtificialTurfModule({ initialData, onSave, onCancel }) {
  const [state, setState] = useState(() => {
    // Legacy flat state (pre per-tab): input fields lived at the top level. Seed
    // the In-House tab from those; the Sub tab starts empty unless the estimate
    // already stored subData.
    const legacy = { ...DEFAULT_STATE, ...(initialData || {}) }
    // Migrate legacy fixed base object → baseRows list (In-House seed only).
    if (initialData && !initialData.baseRows && initialData.base) {
      const b = initialData.base
      const rows = [
        b.useGravel !== false && { material: 'Gravel', sf: b.gravelSF || '', vendor: b.gravelVendor || 'Standard' },
        b.useDG !== false && { material: 'DG', sf: b.dgSF || '', vendor: b.dgVendor || 'Standard' },
        b.useWeedFabric !== false && { material: 'Weed', sf: b.weedSF || '', vendor: b.weedVendor || 'Standard' },
      ].filter(Boolean)
      legacy.baseRows = rows.length ? rows : DEFAULT_STATE.baseRows.map(r => ({ ...r }))
    }
    return {
      crewType: initialData?.crewType ?? DEFAULT_STATE.crewType,
      subType: initialData?.subType ?? 'In-House',
      // Independent In-House vs Sub input records — each tab is its own calculator.
      ihData: makeTurfTab(initialData?.ihData || legacy),
      subData: makeTurfTab(initialData?.subData || {}),
    }
  })

  // Free-text notes for this module — Sam writes auto-generated
  // takeoffs here via create_estimate_from_takeoff, and the user can
  // overwrite / append their own.
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [materialPrices, setMaterialPrices] = useState(initialData?.materialPrices || {})
  const [laborRates, setLaborRates] = useState(initialData?.laborRates || {})
  const [subRates, setSubRates] = useState(initialData?.subRates || {})
  // Vendor catalog: material_rates rows (sub_category + vendor_id) + vendor list.
  const [materialRows, setMaterialRows] = useState(initialData?.materialRows || [])
  // Shared base catalog rows (Concrete + Basic Materials + Ground Treatments) —
  // used to surface the shared Class II / DG base items in View Rates so editing
  // there edits the SAME rate the other modules use.
  const [sharedBaseRows, setSharedBaseRows] = useState([])
  const [vendors, setVendors] = useState([])
  const [laborRatePerHour, setLaborRatePerHour] = useState(initialData?.laborRatePerHour ?? null)
  const [laborBurdenPct, setLaborBurdenPct] = useState(initialData?.laborBurdenPct ?? null)
  const [gpmd, setGpmd] = useState(initialData?.gpmd ?? null)
  const [commissionRate, setCommissionRate] = useState(initialData?.commissionRate ?? null)
  const [subGpMarkupRate, setSubGpMarkupRate] = useState(initialData?.subGpMarkupRate ?? null)
  const [walkAccess] = useState(
    initialData?.walkAccess ?? {
      paceLfPerMin: DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN,
    }
  )

  // ── Sales tax — applied to totalMat across every module so the bid
  //    reflects supplier-invoiced material cost. Sourced from
  //    company_settings.sales_tax_rate via fetchSalesTaxRate(). Default
  //    0 (no tax) until the admin sets it in Opportunities → Settings.
  const [salesTaxRate, setSalesTaxRate] = useState(0)
  useEffect(() => {
    let alive = true
    fetchSalesTaxRate().then(r => {
      if (alive) setSalesTaxRate(r)
    })
    return () => {
      alive = false
    }
  }, [])

  const [pricesLoading, setPricesLoading] = useState(!initialData?.materialPrices)

  // Re-fetch Turf rate maps. Used on mount and after any RateEditPopover save.
  const refreshAllRates = useCallback(async () => {
    // material_rates retired: base map (incl. shared Demo fees) from the new
    // model; Turf catalog from material + material_price. Markers
    // ('Turf Material'/'Turf Base') are unchanged, so no remap.
    // Also pull the SHARED base categories so the two Turf Prep bases can price
    // off the same items other modules use: Ground Treatments 'Decomposed Granite'
    // (DG) and the Concrete base item (Class II). sharedMap is scoped to those
    // categories only, so its 'Class II Roadbase' is the CONCRETE product and can
    // never be shadowed by the Turf Base catalog's own same-named picker item.
    const SHARED_BASE_CATS = ['Concrete', 'Basic Materials', 'Ground Treatments']
    const [matMap, labRes, subRes, rows, venRes, sharedMap, sharedRows] = await Promise.all([
      fetchStandardRateMap(['Artificial Turf', 'Demo']),
      supabase.from('labor_rates').select('name, rate').eq('category', 'Artificial Turf'),
      supabase
        .from('subcontractor_rates')
        .select('company_name, rate')
        .eq('category', 'Artificial Turf'),
      fetchModuleCatalog(['Artificial Turf']),
      supabase
        .from('subs_vendors')
        .select('id, company_name')
        .eq('type', 'vendor')
        .order('company_name'),
      fetchStandardRateMap(SHARED_BASE_CATS),
      fetchModuleCatalog(SHARED_BASE_CATS),
    ])
    setMaterialRows(rows || [])
    setSharedBaseRows(sharedRows || [])
    setVendors(
      (venRes.data || []).map(v => ({
        id: v.id,
        name: v.company_name,
      }))
    )
    // Land the shared Standard prices in the module price map (mp). DG under its
    // own name; Class II under a synthetic key so it can't collide with the Turf
    // Base catalog's own 'Class II Roadbase' picker product.
    setMaterialPrices({
      ...matMap,
      [SHARED_DG_NAME]: firstDefinedRate(sharedMap, [SHARED_DG_NAME]),
      [SHARED_CLASS2_KEY]: firstDefinedRate(sharedMap, SHARED_CLASS2_NAMES),
      [SHARED_WEED_NAME]: firstDefinedRate(sharedMap, SHARED_WEED_NAMES),
    })
    if (labRes.data) {
      const m = {}
      labRes.data.forEach(r => {
        m[r.name] = parseFloat(r.rate)
      })
      setLaborRates(m)
    }
    if (subRes.data) {
      const m = {}
      subRes.data.forEach(r => {
        m[r.company_name] = parseFloat(r.rate) || 0
      })
      setSubRates(m)
    }
  }, [])

  // Always load the vendor list + material rows (even when re-editing a saved
  // estimate) so the per-line Vendor pickers work.
  useEffect(() => {
    let alive = true
    Promise.all([
      fetchModuleCatalog(['Artificial Turf']),
      supabase
        .from('subs_vendors')
        .select('id, company_name')
        .eq('type', 'vendor')
        .order('company_name'),
    ]).then(([rows, venRes]) => {
      if (!alive) return
      setMaterialRows(rows || [])
      setVendors(
        (venRes.data || []).map(v => ({
          id: v.id,
          name: v.company_name,
        }))
      )
    })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let gone = false
    ;(async () => {
      await Promise.all([
        supabase
          .from('company_settings')
          .select('labor_rate_per_hour, labor_burden_pct, estimate_gpmd_default, commission_rate, sub_gp_markup_rate')
          .single()
          .then(({ data }) => {
            if (gone || !data) return
            if (!initialData?.laborRatePerHour && data.labor_rate_per_hour != null)
              setLaborRatePerHour(parseFloat(data.labor_rate_per_hour))
            if (!initialData?.laborBurdenPct && data.labor_burden_pct != null)
              setLaborBurdenPct(parseFloat(data.labor_burden_pct))
            if (initialData?.gpmd == null && data.estimate_gpmd_default != null)
              setGpmd(parseFloat(data.estimate_gpmd_default))
            if (initialData?.commissionRate == null && data.commission_rate != null)
              setCommissionRate(parseFloat(data.commission_rate))
            if (initialData?.subGpMarkupRate == null && data.sub_gp_markup_rate != null)
              setSubGpMarkupRate(parseFloat(data.sub_gp_markup_rate))
          }),
        refreshAllRates(),
      ])
      if (!gone) setPricesLoading(false)
    })()
    return () => {
      gone = true
    }
  }, [refreshAllRates])

  // Active tab helpers. `isSub` selects which per-tab record (ihData/subData)
  // every input reads from and writes to, so the two tabs never affect each other.
  const isSub = state.subType === 'Subcontractor'
  const T = isSub ? state.subData : state.ihData
  const tabKey = p => (p.subType === 'Subcontractor' ? 'subData' : 'ihData')

  // Top-level shared setter (crewType, subType).
  const set = useCallback((f, v) => setState(p => ({ ...p, [f]: v })), [])
  // Active-tab scalar setter (difficulty, hoursAdj, distanceLF, useZeoFill, manualRows…).
  const setT = useCallback(
    (f, v) =>
      setState(p => {
        const k = tabKey(p)
        return { ...p, [k]: { ...p[k], [f]: v } }
      }),
    []
  )
  const setDemo = useCallback(
    (type, field, val) =>
      setState(p => {
        const k = tabKey(p)
        const cur = p[k]
        return {
          ...p,
          [k]: { ...cur, demo: { ...cur.demo, [type]: { ...cur.demo[type], [field]: val } } },
        }
      }),
    []
  )
  const setBaseRow = useCallback(
    (i, field, val) =>
      setState(p => {
        const k = tabKey(p)
        const cur = p[k]
        const baseRows = (cur.baseRows || []).map((r, idx) =>
          idx === i ? { ...r, [field]: val } : r
        )
        return { ...p, [k]: { ...cur, baseRows } }
      }),
    []
  )
  const addBaseRow = useCallback(
    () =>
      setState(p => {
        const k = tabKey(p)
        const cur = p[k]
        return {
          ...p,
          [k]: {
            ...cur,
            baseRows: [...(cur.baseRows || []), { material: '', sf: '', vendor: '' }],
          },
        }
      }),
    []
  )
  // Master base-area field — sets every base row's Sq Ft to the entered value.
  const setBaseAreaSF = useCallback(
    val =>
      setState(p => {
        const k = tabKey(p)
        const cur = p[k]
        const baseRows = (cur.baseRows || []).map(r => ({ ...r, sf: val }))
        return { ...p, [k]: { ...cur, baseAreaSF: val, baseRows } }
      }),
    []
  )
  const removeBaseRow = useCallback(
    i =>
      setState(p => {
        const k = tabKey(p)
        const cur = p[k]
        return { ...p, [k]: { ...cur, baseRows: (cur.baseRows || []).filter((_, idx) => idx !== i) } }
      }),
    []
  )
  const setRoll = useCallback(
    (i, field, val) =>
      setState(p => {
        const k = tabKey(p)
        const cur = p[k]
        const rolls = [...cur.rolls]
        rolls[i] = { ...rolls[i], [field]: val }
        return { ...p, [k]: { ...cur, rolls } }
      }),
    []
  )
  const addRoll = useCallback(
    () =>
      setState(p => {
        const k = tabKey(p)
        const cur = p[k]
        return {
          ...p,
          [k]: { ...cur, rolls: [...(cur.rolls || []), { brand: '', edgeLF: '', vendor: '' }] },
        }
      }),
    []
  )
  const setRow = useCallback(
    (i, f, v) =>
      setState(p => {
        const k = tabKey(p)
        const cur = p[k]
        const rows = [...cur.manualRows]
        rows[i] = { ...rows[i], [f]: v }
        return { ...p, [k]: { ...cur, manualRows: rows } }
      }),
    []
  )
  const setStripRow = useCallback(
    (i, field, val) =>
      setState(p => {
        const k = tabKey(p)
        const cur = p[k]
        const stripRows = (cur.stripRows || []).map((r, idx) =>
          idx === i ? { ...r, [field]: val } : r
        )
        return { ...p, [k]: { ...cur, stripRows } }
      }),
    []
  )
  const addStripRow = useCallback(
    () =>
      setState(p => {
        const k = tabKey(p)
        const cur = p[k]
        return {
          ...p,
          [k]: {
            ...cur,
            stripRows: [...(cur.stripRows || []), { lf: '', widthIn: '12', brand: '', vendor: '' }],
          },
        }
      }),
    []
  )

  // ── Vendor catalog helpers (material-only per-line Vendor pickers) ────────
  const vendorsForCategory = cat => vendors.filter(v => materialRows.some(r => r.vendor_id === v.id && (r.sub_category === cat || r.category === cat)))
  // A vendor belongs in a SECTION's dropdown only if they actually price a product
  // under that section's marker (not just somewhere in the category). Standard is
  // always offered via the <option value="Standard">Standard</option> in each select.
  const vendorsSupplyingMarker = marker => {
    const ids = new Set(
      (materialRows || []).filter(r => r.sub_category === marker && r.vendor_id).map(r => r.vendor_id)
    )
    return vendors.filter(v => ids.has(v.id))
  }
  const catDefaults = {} // Turf defaults to Standard; a real vendor is an explicit pick.

  // Feed the calc only the ACTIVE tab's inputs plus the shared top-level fields
  // (crewType, subType). Each tab thus prices from its own independent data.
  const calcState = { ...T, crewType: state.crewType, subType: state.subType }
  const calcRaw = calcTurf(
    calcState,
    laborRatePerHour,
    materialPrices,
    laborRates,
    gpmd,
    walkAccess,
    laborBurdenPct,
    subRates,
    materialRows,
    catDefaults,
    commissionRate,
    sharedBaseRows
  )
  // Apply company sales tax to the module's total material cost so the
  // estimate price matches what suppliers actually invoice. Stored
  // material_cost (saved with the module) ends up tax-inclusive too,
  // so bid totals add up to GpmdBar's displayed price.
  const _salesTaxAmt = (calcRaw.totalMat || 0) * (salesTaxRate || 0)
  const calc =
    _salesTaxAmt > 0
      ? {
          ...calcRaw,
          totalMat: (calcRaw.totalMat || 0) + _salesTaxAmt,
          price: (calcRaw.price || 0) + _salesTaxAmt,
          salesTax: _salesTaxAmt,
        }
      : calcRaw

  const fmt2 = v =>
    `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const fh = v => (v > 0 ? v.toFixed(2) : '—')
  const td = 'py-1.5 pr-2 align-top'
  const num = 'py-1.5 pr-2 text-gray-600 tabular-nums text-xs align-top text-center'
  const demoMethodKeys = DEMO_METHODS.map(m => m.key)
  const demoMethodLabels = DEMO_METHODS.map(m => m.label)
  const brandOpts = turfBrandOptions(materialRows)
  const brandKeys = brandOpts.map(o => o.id)
  const brandLabels = brandOpts.map(o => o.label)

  function handleSave() {
    onSave({
      notes,
      man_days: parseFloat(calc.manDays.toFixed(2)),
      material_cost: parseFloat(calc.totalMat.toFixed(2)),
      labor_cost: parseFloat(calc.laborCost.toFixed(2)),
      labor_burden: parseFloat(calc.burden.toFixed(2)),
      gross_profit: parseFloat(calc.gp.toFixed(2)),
      sub_cost: parseFloat(calc.subCost.toFixed(2)),
      total_price: parseFloat(calc.price.toFixed(2)),
      data: {
        ...state,
        walkAccess,
        laborRatePerHour,
        laborBurdenPct,
        gpmd,
        commissionRate,
        subGpMarkupRate,
        materialPrices,
        laborRates,
        subRates,
        calc: {
          totalHrs: calc.totalHrs,
          manDays: calc.manDays,
          laborCost: calc.laborCost,
          burden: calc.burden,
          totalMat: calc.totalMat,
          subCost: calc.subCost,
          gp: calc.gp,
          commission: calc.commission,
          price: calc.price,
          turfAreaSF: calc.turfAreaSF,
        },
      },
    })
  }

  // ── Catalog material rows for View Rates ────────────────────────────────────
  // Mirrors Walls/Utilities: surface the module's material catalog prices (one
  // row per vendor, Standard first) so each section lists its MATERIAL rates
  // after its labor rates. Sourced from the SAME `materialRows`/`vendors` state
  // the estimator's pickers use — no extra fetch.
  const vendorNames = Object.fromEntries((vendors || []).map(v => [v.id, v.name]))
  const catalogRowToItem = r0 => ({
    label: `${r0.vendor_id ? vendorNames[r0.vendor_id] || 'Vendor' : 'Standard'} — ${r0.name}`,
    table: 'material_price',
    materialId: r0.id,
    vendorId: r0.vendor_id || undefined,
    category: 'Artificial Turf',
    unitLabel: r0.unit || 'ea',
    mode: 'currency',
    value: n(r0.unit_cost),
  })
  const catalogSort = (a, b) => {
    const va = a.vendor_id == null ? '' : vendorNames[a.vendor_id] || '~'
    const vb = b.vendor_id == null ? '' : vendorNames[b.vendor_id] || '~'
    return va.localeCompare(vb) || (a.name || '').localeCompare(b.name || '')
  }
  // Sub-category–picked sections (Turf Base / Turf Material): all catalog rows.
  const catalogBlockItems = subcat =>
    (materialRows || [])
      .filter(r0 => r0.sub_category === subcat)
      .filter(r0 => r0.vendor_id == null || vendorNames[r0.vendor_id])
      .sort(catalogSort)
      .map(catalogRowToItem)
  // Named materials (base fabrics, infill, install materials): by exact name.
  const materialRateRows = dbName =>
    (materialRows || [])
      .filter(r0 => r0.name === dbName)
      .filter(r0 => r0.vendor_id == null || vendorNames[r0.vendor_id])
      .sort(catalogSort)
      .map(catalogRowToItem)
  // Shared base materials pulled from OTHER modules' catalogs (Concrete base /
  // Ground Treatments DG). Surfaced with their real name + unit (per ton) so the
  // View Rates row matches the rate Class II / DG actually price against — and
  // editing it updates the shared item everywhere.
  const sharedMatRows = names =>
    (sharedBaseRows || [])
      .filter(r0 => names.includes(r0.name))
      .filter(r0 => r0.vendor_id == null || vendorNames[r0.vendor_id])
      .sort(catalogSort)
      .map(catalogRowToItem)

  // ── Grouped rate list for the "View Rates" popup (CrewTypeBar). Every rate
  //    that used to have an inline RateEditPopover in this module now lives here.
  const turfRateList = [
    {
      group: 'Turf Prep',
      items: [
        {
          label: 'Class II Base Install',
          table: 'labor_rates',
          name: 'Turf - Base Install SF/hr',
          category: 'Artificial Turf',
          mode: 'coefficient',
          unitLabel: 'Sq Ft per hr',
          value: materialPrices['Turf - Base Install SF/hr'],
        },
        {
          label: 'DG Base Install',
          table: 'labor_rates',
          name: 'Turf - DG Base Install SF/hr',
          category: 'Artificial Turf',
          mode: 'coefficient',
          unitLabel: 'Sq Ft per hr',
          value: materialPrices['Turf - DG Base Install SF/hr'],
        },
        {
          label: 'Weed Fabric Install',
          table: 'labor_rates',
          name: 'Turf - Weed Fabric Install SF/hr',
          category: 'Artificial Turf',
          mode: 'coefficient',
          unitLabel: 'Sq Ft per hr',
          value: materialPrices['Turf - Weed Fabric Install SF/hr'],
        },
        // Base materials (Turf Base catalog products + named base fabrics) —
        // surfaced here so Turf Prep has its own editable Materials sub-section.
        // Class II + DG price off the SHARED items (Concrete base / GT Decomposed
        // Granite) at their real per-ton rate — not the Turf Base catalog's
        // per-each rows. Weed Barrier now shares the 'Weed Fabric' record
        // (Basic Materials → Barriers, $/SF) — same as Class II / DG.
        ...sharedMatRows(SHARED_CLASS2_NAMES),
        ...sharedMatRows([SHARED_DG_NAME]),
        ...sharedMatRows(SHARED_WEED_NAMES),
      ],
    },
    {
      group: 'Turf Installation',
      items: [
        {
          label: 'Turf Install',
          table: 'labor_rates',
          name: 'Turf - Turf Install SF/hr',
          category: 'Artificial Turf',
          mode: 'coefficient',
          unitLabel: 'Sq Ft per hr',
          value: calc.turfSFHr,
        },
        {
          label: 'Cut, Staple & Seam',
          table: 'labor_rates',
          name: 'Turf - Cut/Staple/Seam LF/hr',
          category: 'Artificial Turf',
          mode: 'coefficient',
          unitLabel: 'Ln Ft per hr',
          value: materialPrices['Turf - Cut/Staple/Seam LF/hr'],
        },
        // Turf material catalog ('Turf Material' brands) and the named consumables
        // (install materials, infill). The Turf Strips section reuses this same
        // 'Turf Material' catalog, so its materials are surfaced here. (Base
        // materials live under the Turf Prep group above.)
        ...catalogBlockItems(TURF_CAT.turf),
        ...materialRateRows('Turf - Install Materials'),
        ...materialRateRows('Turf - Infill ZeoFill'),
        ...materialRateRows('Turf - Infill Durafill'),
      ],
    },
    {
      group: 'Turf Strips',
      items: [
        {
          label: 'Turf Strip Install',
          table: 'labor_rates',
          name: 'Turf - Strip Install LF/hr',
          category: 'Artificial Turf',
          mode: 'coefficient',
          unitLabel: 'Ln Ft per hr',
          value: calc.stripLFHr,
        },
      ],
    },
    {
      group: 'Estimating Factors',
      items: [
        {
          label: 'Demo Tons Divisor',
          table: 'misc_rates',
          name: 'Turf - Demo Tons Divisor',
          category: 'Artificial Turf',
          mode: 'coefficient',
          unitLabel: 'Sq Ft·in per Tons',
          value: materialPrices['Turf - Demo Tons Divisor'],
        },
        {
          label: 'Gravel Base Tons Divisor',
          table: 'misc_rates',
          name: 'Turf - Gravel Base Tons Divisor',
          category: 'Artificial Turf',
          mode: 'coefficient',
          unitLabel: 'Sq Ft·in per Tons',
          value: materialPrices['Turf - Gravel Base Tons Divisor'],
        },
        {
          label: 'Weed Fabric SF per Roll',
          table: 'misc_rates',
          name: 'Turf - Weed Fabric SF per Roll',
          category: 'Artificial Turf',
          mode: 'coefficient',
          unitLabel: 'Sq Ft per roll',
          value: materialPrices['Turf - Weed Fabric SF per Roll'],
        },
        {
          label: 'Turf Roll Width',
          table: 'misc_rates',
          name: 'Turf - Roll Width FT',
          category: 'Artificial Turf',
          mode: 'coefficient',
          unitLabel: 'ft',
          value: materialPrices['Turf - Roll Width FT'],
        },
        {
          label: 'Infill SF per Bag (ZeoFill)',
          table: 'misc_rates',
          name: 'Turf - Infill SF per Bag',
          category: 'Artificial Turf',
          mode: 'coefficient',
          unitLabel: 'Sq Ft per bag',
          value: materialPrices['Turf - Infill SF per Bag'],
        },
      ],
    },
    {
      group: 'Subcontractor',
      items: [
        {
          label: 'Turf Sub - Install Per SF',
          table: 'subcontractor_rates',
          name: 'Turf Sub - Install Per SF',
          category: 'Artificial Turf',
          mode: 'currency',
          unitLabel: 'Sq Ft',
          value: calc.subInstallPerSF,
        },
        {
          label: 'Turf Sub - Strip Per LF',
          table: 'subcontractor_rates',
          name: 'Turf Sub - Strip Per LF',
          category: 'Artificial Turf',
          mode: 'currency',
          unitLabel: 'Ln Ft',
          value: calc.subStripPerLF,
        },
      ],
    },
  ]

  return (
    <SubTabContext.Provider value={isSub}>
    <div className="space-y-4">
      {/* ── Frozen header: GPMD bar + Crew Type / View Rates bar ── */}
      <div className="sticky top-0 z-20 -mx-6 bg-white shadow-md">
        <div className="px-6 pt-1 pb-1 bg-gray-900">
          <GpmdBar
            variant={state.subType === 'Subcontractor' ? 'sub' : 'inhouse'}
            sticky
            totalMat={calc.totalMat}
            totalHrs={calc.totalHrs}
            manDays={calc.manDays}
            laborCost={calc.laborCost}
            laborRatePerHour={laborRatePerHour}
            burden={calc.burden}
            gp={calc.gp}
            commission={calc.commission}
            subCost={calc.subCost}
            gpmd={gpmd}
            price={calc.price}
            subMarkupRate={subGpMarkupRate}
          />
        </div>
        <div className="px-6 py-2">
          <CrewTypeBar
            crewType={state.crewType}
            onCrewTypeChange={v => set('crewType', v)}
            title="Artificial Turf"
            rates={turfRateList}
            refreshAllRates={refreshAllRates}
            showInlineToggle={false}
          />
        </div>
      </div>

      <ModuleHeaderSlot>
        <WorkTypeChooser value={state.subType || 'In-House'} onChange={v => set('subType', v)} compact />
      </ModuleHeaderSlot>

      {pricesLoading && (
        <div className="text-xs text-amber-700 bg-amber-50 rounded px-3 py-2">
          Loading current rates…
        </div>
      )}

      {/* Settings — Job Site Conditions is In-House only (hidden on Sub tab) */}
      {state.subType !== 'Subcontractor' && (
        <>
      <SecHdr title="Job Site Conditions" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Difficulty (%)</p>
          <Inp
            value={T.difficulty}
            onChange={e => setT('difficulty', e.target.value)}
            step="5"
          />
        </div>
        <div>
          <p
            className="text-xs text-gray-500 mb-0.5"
            title="Average Distance from Truck to Work Area"
          >
            Truck → Work Area (Avg LF)
          </p>
          <Inp
            value={T.distanceLF}
            onChange={e => setT('distanceLF', e.target.value)}
            step="5"
          />
          {calc.walkHrs > 0 && (
            <p className="text-[10px] text-gray-500 italic lowercase mt-0.5">
              +{calc.walkHrs.toFixed(2)} hrs walk-access
            </p>
          )}
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Hours Adj (±hrs)</p>
          <Inp value={T.hoursAdj} onChange={e => setT('hoursAdj', e.target.value)} step="0.5" />
        </div>
      </div>
        </>
      )}

      {/* Base Installation — In-House only (hidden on Sub tab) */}
      {state.subType !== 'Subcontractor' && (
      <div>
        <SecHdr title="Turf Prep" />
        {/* Master area — fills every base row's Sq Ft automatically. */}
        <div className="flex flex-col items-center mb-3">
          <label className="text-xs font-medium text-gray-600 mb-1 text-center">Square Footage</label>
          <Inp
            value={T.baseAreaSF ?? ''}
            onChange={e => setBaseAreaSF(e.target.value)}
            placeholder="0"
            className="text-center w-32"
          />
        </div>
        <table className="w-full text-xs">
          <TH
            cols={[
              { label: 'Base', w: 'w-28' },
              { label: 'Vendor', w: 'w-32' },
              { label: 'Type', w: 'w-28' },
              { label: 'Sq Ft', w: 'w-20' },
              { label: 'Qty', w: 'w-16' },
              { label: 'Hrs', w: 'w-16' },
              { label: 'Material', w: 'w-24' },
            ]}
          />
          <tbody className="divide-y divide-gray-50">
            {(T.baseRows || []).map((row, i) => {
              // Each row is a fixed base layer (Roadbase / DG Base / Weed Barrier).
              // Vendor + Type pickers are sourced from the shared material rows for
              // that layer; the calc resolves the price from the selection.
              const def = BASE_MATERIALS.find(m => m.key === row.material) || BASE_MATERIALS[0]
              const kdef = baseKindDef(row.material)
              const typeOpts = baseTypeOptions(sharedBaseRows, row.material, row.vendor)
              const venOpts = baseVendorOptions(sharedBaseRows, vendors, row.material)
              const bc = calc.baseCalc?.[i] || {}
              const unitLabel =
                def.qtyUnit === 'sf' ? 'Sq Ft' : def.qtyUnit === 'roll' ? 'roll' : 'Cu Yd'
              const rate = n(bc.price)
              return (
                <tr key={i}>
                  <td className={td}>
                    <span className="text-xs font-medium text-gray-700 whitespace-nowrap">
                      {kdef.label}
                    </span>
                  </td>
                  <td className={td}>
                    <select
                      className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs bg-white"
                      value={row.vendor || ''}
                      onChange={e => setBaseRow(i, 'vendor', e.target.value)}
                      title="Vendor"
                    >
                      <option value="">Select</option>
                      <option value="Standard">Standard</option>
                      {venOpts.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={td}>
                    <div className="flex items-center gap-1">
                      <select
                        className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs bg-white"
                        value={row.type || ''}
                        onChange={e => setBaseRow(i, 'type', e.target.value)}
                        title="Type"
                      >
                        {!row.type && <option value="">Select type</option>}
                        {row.type && !typeOpts.some(o => o.value === row.type) && (
                          <option value={row.type}>{row.type}</option>
                        )}
                        {typeOpts.map(o => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <span className="text-gray-400 whitespace-nowrap">
                        ${rate.toFixed(2)}/{unitLabel}
                      </span>
                    </div>
                  </td>
                  <td className={td}>
                    <Inp
                      value={row.sf}
                      onChange={e => setBaseRow(i, 'sf', e.target.value)}
                      placeholder={calc.turfAreaSF || '0'}
                      className="text-center"
                    />
                  </td>
                  <td className={num}>
                    {bc.qty > 0
                      ? def.qtyUnit === 'sf'
                        ? `${bc.qty.toLocaleString()} Sq Ft`
                        : def.qtyUnit === 'roll'
                          ? `${bc.qty} ${bc.qty === 1 ? 'roll' : 'rolls'}`
                          : `${bc.qty.toFixed(2)} Cu Yd`
                      : '—'}
                  </td>
                  <td className={num}>{bc.hrs > 0 ? fh(bc.hrs) : '—'}</td>
                  <td className={num}>{bc.mat > 0 ? fmt2(bc.mat) : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      )}

      {/* Turf Installation */}
      <div>
        <SecHdr title="Turf Installation (15' Wide Rolls)" />
        <table className="w-full text-xs">
          <TH
            cols={
              calc.isSub
                ? [
                    { label: 'Vendor', w: 'w-40' },
                    { label: 'Turf Type', w: 'w-32' },
                    { label: 'Install SF', w: 'w-24' },
                    { label: 'Edge LF', w: 'w-20' },
                    { label: 'Material', w: 'w-24' },
                  ]
                : [
                    { label: 'Vendor', w: 'w-40' },
                    { label: 'Turf Type', w: 'w-32' },
                    { label: 'Edge LF', w: 'w-20' },
                    { label: 'Sq Ft', w: 'w-20' },
                    { label: 'Hrs', w: 'w-16' },
                    { label: 'Material', w: 'w-24' },
                  ]
            }
          />
          <tbody className="divide-y divide-gray-50">
            {T.rolls.map((roll, i) => {
              const cr = calc.rollCalc[i]
              // Only resolve a brand row when one is selected — an empty picker
              // must not auto-fill the first turf.
              const brandRow = roll.brand ? turfBrandRow(materialRows, roll.vendor, roll.brand) : null
              const rollBrandOpts = turfBrandOptions(materialRows, roll.vendor)
              return (
                <tr key={i}>
                  <td className={td}>
                    <select
                      className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs bg-white"
                      value={roll.vendor || ''}
                      onChange={e => setRoll(i, 'vendor', e.target.value)}
                      title="Vendor"
                    >
                      <option value="">Select</option>
                      <option value="Standard">Standard</option>
                      {vendorsSupplyingMarker(TURF_CAT.turf).map(v => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={td}>
                    <Sel
                      value={roll.brand ? (brandRow?.id || roll.brand) : ''}
                      onChange={e => setRoll(i, 'brand', e.target.value)}
                      options={rollBrandOpts.map(o => o.id)}
                      optionLabels={rollBrandOpts.map(o => o.label)}
                      placeholder="Select turf"
                    />
                  </td>
                  {calc.isSub ? (
                    <>
                      <td className={td}>
                        <Inp
                          value={roll.installSF || ''}
                          onChange={e => setRoll(i, 'installSF', e.target.value)}
                          className="text-center"
                        />
                      </td>
                      <td className={td}>
                        <Inp
                          value={roll.edgeLF}
                          onChange={e => setRoll(i, 'edgeLF', e.target.value)}
                          className="text-center"
                        />
                      </td>
                      <td className={num}>{cr.rowSubCost > 0 ? fmt2(cr.rowSubCost) : '—'}</td>
                    </>
                  ) : (
                    <>
                      <td className={td}>
                        <Inp
                          value={roll.edgeLF}
                          onChange={e => setRoll(i, 'edgeLF', e.target.value)}
                          className="text-center"
                        />
                      </td>
                      <td className={num}>{cr.sf > 0 ? cr.sf.toLocaleString() : '—'}</td>
                      <td className={num}>{fh(cr.hrs)}</td>
                      <td className={num}>{cr.mat > 0 ? fmt2(cr.mat) : '—'}</td>
                    </>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
        <button
          type="button"
          onClick={addRoll}
          className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          ＋ Add row
        </button>

        {/* Pet-odor infill upgrade — sits under the turf install rows. */}
        <div className="mt-3 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <Toggle
            checked={T.useZeoFill}
            onChange={v => setT('useZeoFill', v)}
            label="ZeoFill Pet Odor Infill (upgrade)"
          />
          <span className="text-xs text-amber-700 ml-auto inline-flex items-center gap-1">
            {T.useZeoFill ? (
              <>
                {calc.infillSFPerBag > 0 ? Math.ceil(calc.infillAreaSF / calc.infillSFPerBag) : 0} bags @ $
                {n(materialPrices['Turf - Infill ZeoFill']).toFixed(2)}
                /bag
              </>
            ) : (
              <>
                Durafill @ $
                {n(materialPrices['Turf - Infill Durafill']).toFixed(2)}
                /SF
              </>
            )}
          </span>
        </div>

        {/* Cut, Staple & Seam — auto-calculated */}
        {calc.totalEdgeLF > 0 && (
          <div className="mt-2 bg-gray-50 rounded-lg px-3 py-2 text-xs flex justify-between">
            <span className="text-gray-600 font-medium inline-flex items-center gap-1">
              Cut, Staple &amp; Seam
              <span className="text-gray-400 font-normal ml-1">({calc.totalEdgeLF} Ln Ft total)</span>
            </span>
            <div className="flex gap-4">
              {!calc.isSub && <span className="text-gray-700">{fh(calc.cutHrs)} hrs</span>}
              <span className="text-gray-700">
                {fmt2(calc.isSub ? calc.subCutMat : calc.cutMat)} {calc.isSub ? 'sub' : 'mat'}
              </span>
            </div>
          </div>
        )}

        {/* Infill — auto-calculated from base area */}
        {calc.infillAreaSF > 0 && (
          <div className="mt-1 bg-gray-50 rounded-lg px-3 py-2 text-xs flex justify-between">
            <span className="text-gray-600 font-medium">
              {T.useZeoFill ? 'ZeoFill Pet Infill' : 'Durafill Infill'}
              <span className="text-gray-400 font-normal ml-2">
                ({calc.infillAreaSF.toLocaleString()} Sq Ft)
              </span>
            </span>
            <span className="text-gray-700">{fmt2(calc.infillMat)}</span>
          </div>
        )}
      </div>

      {/* Turf Strips */}
      <div>
        <SecHdr title="Turf Strips (Narrow / Custom Cuts)" />
        <div className="text-xs text-gray-500 mb-2 italic">
          {calc.isSub ? (
            <>
              For narrow strips that don't come off a standard 15' roll. Flat subcontractor rate:{' '}
              <span className="text-gray-600">${calc.subStripPerLF} per Ln Ft</span> + brand material ($ per Sq Ft).
            </>
          ) : (
            <>
              For narrow strips that don't come off a standard 15' roll. Row edits both rates:{' '}
              <span className="text-gray-600">material</span> ($ per Sq Ft, per brand) and{' '}
              <span className="text-gray-600">install labor</span> ({calc.stripLFHr} Ln Ft/hr).
            </>
          )}
        </div>
        <table className="w-full text-xs">
          <TH
            cols={
              calc.isSub
                ? [
                    { label: 'Vendor', w: 'w-28' },
                    { label: 'Turf Type' },
                    { label: 'Length (LF)', w: 'w-24' },
                    { label: 'Width (in)', w: 'w-20' },
                    { label: 'Material', w: 'w-24' },
                  ]
                : [
                    { label: 'Vendor', w: 'w-28' },
                    { label: 'Turf Type' },
                    { label: 'Length (LF)', w: 'w-24' },
                    { label: 'Width (in)', w: 'w-20' },
                    { label: 'Sq Ft', w: 'w-16' },
                    { label: 'Hrs', w: 'w-16' },
                    { label: 'Material', w: 'w-24' },
                  ]
            }
          />
          <tbody className="divide-y divide-gray-50">
            {(T.stripRows || []).map((strip, i) => {
              const sc = calc.stripCalc?.[i] || {}
              const rowStripsBrandOpts = turfBrandOptions(materialRows, strip?.vendor)
              // Only resolve a brand row when one is selected — an empty picker
              // must not auto-fill the first turf.
              const stripBrandRow = strip?.brand
                ? turfBrandRow(materialRows, strip?.vendor, strip?.brand)
                : null
              return (
                <tr key={i}>
                  <td className={td}>
                    <select
                      className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs bg-white"
                      value={strip?.vendor || ''}
                      onChange={e => setStripRow(i, 'vendor', e.target.value)}
                      title="Vendor"
                    >
                      <option value="">Select</option>
                      <option value="Standard">Standard</option>
                      {vendorsSupplyingMarker(TURF_CAT.turf).map(v => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={td}>
                    <Sel
                      value={strip?.brand ? (stripBrandRow?.id || strip?.brand) : ''}
                      onChange={e => setStripRow(i, 'brand', e.target.value)}
                      placeholder="Select turf"
                      options={rowStripsBrandOpts.map(o => o.id)}
                      optionLabels={rowStripsBrandOpts.map(o => o.label)}
                    />
                  </td>
                  <td className={td}>
                    <Inp
                      value={strip?.lf || ''}
                      onChange={e => setStripRow(i, 'lf', e.target.value)}
                      className="text-center"
                    />
                  </td>
                  <td className={td}>
                    <Inp
                      value={strip?.widthIn || '12'}
                      onChange={e => setStripRow(i, 'widthIn', e.target.value)}
                      placeholder="12"
                      step="1"
                      className="text-center"
                    />
                  </td>
                  {calc.isSub ? (
                    <td className={num}>{sc.rowSubCost > 0 ? fmt2(sc.rowSubCost) : '—'}</td>
                  ) : (
                    <>
                      <td className={num}>{sc.sf > 0 ? sc.sf.toLocaleString() : '—'}</td>
                      <td className={num}>{fh(sc.hrs)}</td>
                      <td className={num}>{sc.mat > 0 ? fmt2(sc.mat) : '—'}</td>
                    </>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
        <button
          type="button"
          onClick={addStripRow}
          className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          ＋ Add row
        </button>
      </div>

      {/* Manual Entry */}
      <div>
        <SecHdr title="Manual Entry" />
        <table className="w-full text-xs table-fixed">
          <colgroup>
            {isSub ? (
              <>
                <col className="w-1/2" />
                <col className="w-1/2" />
              </>
            ) : (
              <>
                <col className="w-1/3" />
                <col className="w-1/3" />
                <col className="w-1/3" />
              </>
            )}
          </colgroup>
          <TH
            cols={
              isSub
                ? [{ label: 'Description' }, { label: 'Cost ($)' }]
                : [{ label: 'Description' }, { label: 'Hours' }, { label: 'Materials ($)' }]
            }
          />
          <tbody className="divide-y divide-gray-50">
            {T.manualRows.map((r, i) => (
              <tr key={i}>
                <td className={td}>
                  <Inp
                    type="text"
                    value={r.label}
                    onChange={e => setRow(i, 'label', e.target.value)}
                    placeholder="Description"
                  />
                </td>
                {isSub ? (
                  <td className={td}>
                    <div className="flex items-center gap-1">
                      <Inp
                        value={r.subCost}
                        onChange={e => setRow(i, 'subCost', e.target.value)}
                        step="1"
                        className="text-center flex-1"
                      />
                      {T.manualRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setT('manualRows', T.manualRows.filter((_, idx) => idx !== i))}
                          className="text-gray-300 hover:text-red-500 text-sm px-1"
                          title="Remove line"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </td>
                ) : (
                  <>
                    <td className={td}>
                      <Inp
                        value={r.hours}
                        onChange={e => setRow(i, 'hours', e.target.value)}
                        step="0.5"
                        className="text-center"
                      />
                    </td>
                    <td className={td}>
                      <div className="flex items-center gap-1">
                        <Inp
                          value={r.materials}
                          onChange={e => setRow(i, 'materials', e.target.value)}
                          step="1"
                          className="text-center flex-1"
                        />
                        {T.manualRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setT('manualRows', T.manualRows.filter((_, idx) => idx !== i))}
                            className="text-gray-300 hover:text-red-500 text-sm px-1"
                            title="Remove line"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          onClick={() => setT('manualRows', [...T.manualRows, { label: '', hours: '', materials: '', subCost: '' }])}
          className="mt-2 text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
          + Add manual entry
        </button>
      </div>

      {/* Turf area context chip */}
      {calc.turfAreaSF > 0 && (
        <div className="flex gap-3 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
          <span className="font-medium text-gray-700">{calc.turfAreaSF.toLocaleString()} Sq Ft</span>
          <span>turf area</span>
          {calc.infillAreaSF !== calc.turfAreaSF && (
            <span className="text-gray-400">
              · {calc.infillAreaSF.toLocaleString()} Sq Ft infill base
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={handleSave}
          className="flex-1 bg-gray-900 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
    </SubTabContext.Provider>
  )
}
