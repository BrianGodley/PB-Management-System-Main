// Pure Paver calc — extracted from PaverModule.jsx so the math is unit-testable
// without React/Supabase. Logic identical. The small pure helpers below (catalogOptions
// / catalogItemFor / isStandardSel / paverItemFor / calcWalkAccessLabor) are inlined
// from lib/materialCatalog + lib/walkAccess (which import supabase); kept in sync.
import { LAB } from '../../lib/laborRefs.js'
import { BAS } from '../../lib/basicLaborRefs.js'
const n = v => parseFloat(v) || 0
const DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN = 60
const isStandardSel = v => !v || v === 'Standard'
const CATALOG_OPTS = { standardRows: 'null-vendor', stripPrefix: true }
const PAVER_CAT = { paver: 'Paver Material', base: 'Base Material' }

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
function paverItemFor(cat, vendorSel, key, materialRows) {
  if (!vendorSel || vendorSel === 'auto') return null
  const isStd = vendorSel === 'Standard'
  return catalogItemFor(materialRows, cat, isStd ? 'Standard' : vendorSel, key, CATALOG_OPTS)
}
function calcWalkAccessLabor(laborSubtotalHrs, distanceLF, opts = {}) {
  const hrs = n(laborSubtotalHrs)
  const lf = n(distanceLF)
  const pace = n(opts.paceLfPerMin) || DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN
  if (hrs <= 0 || lf <= 0 || pace <= 0) return 0
  return ((hrs / 8) * (lf * 2)) / pace
}

export function calcPaver(
  state,
  laborRatePerHour,
  laborRates,
  materialRates,
  paverPrices,
  gpmd = null,
  walkAccess = null,
  laborBurdenPct = null,
  materialRows = [],
  priceOf = item => n(item?.unit_cost),
  commissionRate = null
) {
  const lr = laborRates || {}
  const mr = materialRates || {}
  const pp = paverPrices || []
  // Walk-access pace is now a Paver-specific editable labor rate (LF/min).
  const walkPace =
    n(lr[LAB.PAVER_WALK_ACCESS_PACE]) ||
    parseFloat(walkAccess?.paceLfPerMin) ||
    0

  // Labor rates — live from labor_rates by stable ref_key, no hardcoded fallback.
  const installRate = n(lr[LAB.PAVER_INSTALL])
  const straightCutRate = n(lr[LAB.PAVER_STRAIGHT_CUT])
  const curvedCutRate = n(lr[LAB.PAVER_CURVED_CUT])
  const restraintRate = n(lr[LAB.PAVER_RESTRAINTS])
  const sleevesRate = n(lr[LAB.PAVER_SLEEVES])
  const vertSoldierRate = n(lr[LAB.PAVER_VERTICAL_SOLDIER])
  const sealerRate = n(lr[LAB.PAVER_SEALER])
  const add80mmMult = n(lr[LAB.PAVER_80MM_ADD])
  const addStonePer = n(lr[LAB.PAVER_STONE_ADD])
  const addColorPer = n(lr[LAB.PAVER_COLOR_ADD])
  // Poly Sand labor coefficients — New and Existing are now independent rates.
  const polySandNewSpread = n(lr[LAB.PAVER_POLY_SAND_NEW])
  const polySandExistingSpread = n(lr[LAB.PAVER_POLY_SAND_EXISTING])
  // Base prep reads the shared Basic Labor table (one source of truth, by ref_key).
  // All hrs / Cu Ft (the demo volume basis).
  const baseSkidGood = n(lr[BAS.IMPORT_BASE_SKID_GOOD]) // hrs / Cu Ft
  const baseSkidOK = n(lr[BAS.IMPORT_BASE_SKID_OK])     // hrs / Cu Ft
  const baseMiniBobcat = n(lr[BAS.IMPORT_BASE_MINI])    // hrs / Cu Ft
  const baseHand = n(lr[BAS.IMPORT_BASE_HAND])          // hrs / Cu Ft

  // Material rates — live from the catalog / misc_rates, no hardcoded fallback.
  const baseRockPerTon = n(mr['Paver - Base Rock'])
  const beddingSandPerCy = n(mr['Bedding Sand']) // shared Basic Materials, now $/Cu Yd
  const jointSandPerSF = n(mr['Paver - Joint Sand'])
  // Single poly-sand MATERIAL rate used for BOTH New and Existing pavers.
  const polySandPerSF = n(mr['Paver - Poly Sand'])
  const sealerMatPerSF = n(mr['Paver - Sealer'])
  const restraintConcrLF = n(mr['Paver - Restraint Concrete'])
  const sleevesMatLF = n(mr['Paver - Sleeves'])
  const palletCharge = n(mr['Paver - Pallet Charge'])
  const deliveryFlat = n(mr['Paver - Delivery'])
  // Tunable estimating coefficients (DB-editable via misc_rates).
  const deliverySFPerIncrement = n(mr['Paver - Delivery SF Increment']) // SF per delivery charge

  const BASE_RATE_MAP = {
    'Skid Good': baseSkidGood,
    'Skid OK': baseSkidOK,
    'Mini Skid': baseMiniBobcat,
    Hand: baseHand,
  }

  // ── Paver areas ─────────────────────────────────────────────────────────────
  const computeArea = row => {
    const sf = n(row.sf)
    const depthIn = n(row.depth) || 6
    // Base area can be larger than the paver field (overdig, edge transitions,
    // base prep beyond the pavers). Use the optional Base SF when provided;
    // otherwise fall back to the paver SF.
    const baseSf = row.baseSf !== '' && row.baseSf != null ? n(row.baseSf) : sf
    // Base LABOR shares the demo Import Base rate — hrs × Cu Ft for every method.
    const baseVolume = baseSf * (depthIn / 12) // Cu Ft
    const baseRate = BASE_RATE_MAP[row.method] ?? baseSkidOK
    const baseHrs = baseVolume * baseRate

    // Base MATERIAL is now priced per CUBIC YARD (company-wide move — base
    // aggregates are bought by the cubic yard). Loose volume =
    //   area(SF) × depth(in)/12 (→ Cu Ft) ÷ 27 (→ Cu Yd).
    const baseCuYd = baseSf > 0 && depthIn > 0 ? (baseSf * (depthIn / 12)) / 27 : 0

    // Base material $/CY — vendor-aware. A real vendor overrides via its catalog
    // item; Standard resolves the CANONICAL shared Basic Materials record
    // 'Class II Roadbase' ($24/CY) by NAME (the Paver-specific base item has been
    // archived) with a legacy-name / base-rock fallback. Price now represents $/CY.
    let baseCyRate = 0
    if (!row.baseVendor) {
      // No base vendor selected yet → $0 base material (pick a vendor first).
      baseCyRate = 0
    } else if (row.baseVendor !== 'Standard' && row.baseVendor !== 'auto') {
      const bItem = paverItemFor(
        PAVER_CAT.base,
        row.baseVendor,
        row.baseId || row.baseType,
        materialRows
      )
      baseCyRate = bItem ? priceOf(bItem) : baseRockPerTon
    } else {
      // Standard → the shared Base Material null-vendor catalog record (one
      // record, one price). The name chain remains only as an equivalent last
      // resort for an old estimate whose base type doesn't resolve to a record.
      const bItem = paverItemFor(PAVER_CAT.base, 'Standard', row.baseId || row.baseType, materialRows)
      baseCyRate = bItem
        ? priceOf(bItem)
        : n(mr['Class II Roadbase']) ||
          n(mr['Base - Class II Roadbase']) ||
          n(mr['Base Material - Class II Roadbase']) ||
          baseRockPerTon
    }
    const baseMatCost = baseCuYd * baseCyRate

    // Paver material — vendor catalog (Vendor + Type) with a Custom inline-price
    // fallback. Old estimates (paverBrand/paverName) still price via paver_prices.
    const isCustom = row.paverVendor === 'Custom' || row.paverBrand === 'Custom'
    let pricePerSF = 0
    let sfPerPallet = 0
    if (isCustom) {
      pricePerSF = n(row.customPricePerSF)
    } else if (row.paverVendor && (row.paverId || row.paverType)) {
      // Skip rows with a vendor but no paver chosen yet — they price at $0 rather
      // than falling back to the vendor's first catalog item.
      const item = paverItemFor(
        PAVER_CAT.paver,
        row.paverVendor,
        row.paverId || row.paverType,
        materialRows
      )
      if (item) {
        pricePerSF = priceOf(item)
        sfPerPallet = n(item.sf_per_pallet)
      }
    } else if (row.paverBrand) {
      const paverData = pp.find(p => p.brand === row.paverBrand && p.name === row.paverName)
      pricePerSF = paverData?.price_per_sf || 0
      sfPerPallet = paverData?.sf_per_pallet || 0
    }
    const pallets = sf > 0 && sfPerPallet > 0 ? Math.ceil(sf / sfPerPallet) : 0
    const paverCost = sf * pricePerSF

    return {
      sf,
      baseSf,
      depthIn,
      baseCuYd,
      baseHrs,
      baseCyRate,
      baseMatCost,
      paverCost,
      pallets,
      pricePerSF,
      sfPerPallet,
    }
  }
  // In-House areas drive labor; the Subcontractor tab has its own area rows.
  // MATERIAL (pavers, base rock, pallets, sands, delivery) follows the ACTIVE
  // tab's rows so the Sub tab's Paver/Base Material sections price too — while
  // in-house LABOR still reads the in-house rows (0 on the Sub tab).
  const areas = (state.areaRows || []).map(computeArea)
  const subAreas = (state.subAreaRows || []).map(computeArea)
  const isSubTab = state.subType === 'Subcontractor'
  const matAreas = isSubTab ? subAreas : areas

  const totalInstallSF = areas.reduce((s, a) => s + a.sf, 0) // in-house labor SF
  const matInstallSF = matAreas.reduce((s, a) => s + a.sf, 0) // material SF (active tab)
  const totalBaseCuYd = matAreas.reduce((s, a) => s + (a.baseCuYd || 0), 0)
  const totalBaseHrs = areas.reduce((s, a) => s + a.baseHrs, 0)
  const totalPaverCost = matAreas.reduce((s, a) => s + a.paverCost, 0)
  const totalAreaPallets = matAreas.reduce((s, a) => s + a.pallets, 0)

  // ── Install labor hours ──────────────────────────────────────────────────────
  // Install SF is now entered MANUALLY (no longer auto-derived from the paver
  // area rows). Labor = manual SF × install rate (hrs-per-SF; standardized
  // 2026-08-18, was SF/hr).
  const installSFVal = n(state.installSF)
  const installHrs = installSFVal * installRate
  // 80mm thickness penalty: its own SF input adds a table-driven % (Paver - 80mm
  // Add, a multiplier) to the install labor for that SF.
  const mm80SFVal = n(state.mm80SF)
  const add80mmHrs = mm80SFVal * add80mmMult * installRate
  const straightCutHrs = n(state.straightCutLF) * straightCutRate
  const curvedCutHrs = n(state.curvedCutLF) * curvedCutRate
  const restraintsHrs = n(state.restraintsLF) * restraintRate
  const sleevesHrs = n(state.sleevesLF) * sleevesRate
  // Vertical Soldier Course rows (In-House). LF summed across rows drives labor.
  const vertRows = Array.isArray(state.vertRows) ? state.vertRows : []
  const vertTotalLF = vertRows.reduce((s, r) => s + n(r.lf), 0)
  const vertSoldierHrs = vertTotalLF * vertSoldierRate
  const sealerHrs = n(state.sealerSF) * sealerRate
  // Poly Sand — New pavers: own SF input × the New poly-sand labor coefficient
  // (Paver - Poly Sand New, fallback 0.004 hrs/SF). Independent of the paver area.
  const polySandNewSFVal = n(state.polySandNewSF)
  const polySandHrs = polySandNewSFVal * polySandNewSpread
  // Poly Sand — Existing pavers: own SF input × its OWN Existing labor coefficient
  // (Paver - Poly Sand Existing, fallback 0.0075 hrs/SF).
  const polySandExistingSFVal = n(state.polySandExistingSF)
  const polySandExistingHrs = polySandExistingSFVal * polySandExistingSpread
  const addStoneHrs = n(state.numStones) * addStonePer
  const addColorHrs = n(state.numColors) * addColorPer

  // ── Vertical soldier ─────────────────────────────────────────────────────────
  // Priced from the ACTIVE tab's fields so each tab's material is independent.
  // In-House uses Vendor + Type from the paver catalog (price_per_lf_vert) with
  // Custom / legacy brand-name fallbacks; the Sub tab uses its own brand/name.
  const vSoldierLF = isSubTab ? n(state.subVertSoldierLF) : vertTotalLF
  let vertPaverCost = 0
  if (isSubTab) {
    // Sub tab keeps the legacy single-record soldier fields (no rows UI on Sub).
    let ppl = 0
    if (state.subVertPaverBrand === 'Custom') {
      ppl = n(state.subVertCustomPricePerLF)
    } else if (state.subVertPaverBrand) {
      const vpd = pp.find(
        p => p.brand === state.subVertPaverBrand && p.name === state.subVertPaverName
      )
      ppl = vpd?.price_per_lf_vert || 0
    }
    vertPaverCost = n(state.subVertSoldierLF) * ppl
  } else {
    // In-House: sum each row's LF × its own $/LF (vendor catalog or Custom).
    for (const r of vertRows) {
      const lf = n(r.lf)
      let ppl = 0
      if (r.vendor === 'Custom') {
        ppl = n(r.customPricePerLF)
      } else if (r.vendor && (r.id || r.type)) {
        // Vendor chosen but no paver selected yet → $0 (no fallback to first item).
        const vItem = paverItemFor(PAVER_CAT.paver, r.vendor, r.id || r.type, materialRows)
        ppl = vItem ? n(vItem.price_per_lf_vert) : 0
      }
      vertPaverCost += lf * ppl
    }
  }

  const totalPallets = totalAreaPallets

  // ── Manual rows ──────────────────────────────────────────────────────────────
  const manualRows = (state.manualRows || []).filter(
    r => n(r.hours) > 0 || n(r.materials) > 0 || n(r.subCost) > 0
  )
  const manualHrs = manualRows.reduce((s, r) => s + n(r.hours), 0)
  // Material follows the ACTIVE tab (In-House vs Sub manual rows) so each tab's
  // breakdown is independent; hours/subCost above stay In-House for labor.
  const manualMat = (isSubTab ? state.subManualRows || [] : state.manualRows || []).reduce(
    (s, r) => s + n(r.materials),
    0
  )
  const manualSub = manualRows.reduce((s, r) => s + n(r.subCost), 0)

  // ── Hour totals ───────────────────────────────────────────────────────────────
  const diff = 1 + n(state.difficulty) / 100
  const hrsAdj = n(state.hoursAdj)
  const rawInstallHrs =
    installHrs +
    add80mmHrs +
    straightCutHrs +
    curvedCutHrs +
    restraintsHrs +
    sleevesHrs +
    vertSoldierHrs +
    sealerHrs +
    polySandHrs +
    polySandExistingHrs +
    addStoneHrs +
    addColorHrs
  const adjustedInstallHrs = rawInstallHrs * diff + hrsAdj
  const _preWalkHrs = adjustedInstallHrs + totalBaseHrs + manualHrs
  const walkHrs = calcWalkAccessLabor(_preWalkHrs, state.distanceLF, { paceLfPerMin: walkPace })
  const totalHrs = _preWalkHrs + walkHrs

  // ── Materials ─────────────────────────────────────────────────────────────────
  // Every material input follows the ACTIVE tab so each tab's Materials
  // Breakdown is fully independent (labor above still reads In-House fields).
  const mSealerSF = isSubTab ? n(state.subSealerSF) : n(state.sealerSF)
  const mRestraintsLF = isSubTab ? n(state.subRestraintsLF) : n(state.restraintsLF)
  const mSleevesLF = isSubTab ? n(state.subSleevesLF) : n(state.sleevesLF)
  // Poly-sand New material follows the ACTIVE tab: In-House uses its own SF input
  // (polySandNewSF); the Sub tab keeps its whole-area toggle (subPolySand).
  const mPolyNewSF = isSubTab ? (state.subPolySand ? matInstallSF : 0) : n(state.polySandNewSF)
  const mPolyExistingSF = isSubTab ? n(state.subPolySandExistingSF) : n(state.polySandExistingSF)
  // Base rock is priced per-area (vendor/type aware) from the ACTIVE tab's rows;
  // sands/delivery follow the active tab's material SF.
  const baseRockCost = matAreas.reduce((s, a) => s + (a.baseMatCost || 0), 0)
  // Bedding sand is a 1-inch layer under the pavers, now bought per Cu Yd.
  // Loose volume = SF × (1 in / 12) / 27 = SF / 324. (27 cf/cy, 12 in/ft fixed.)
  const beddingCuYd = matInstallSF / 324
  const beddingSandCost = beddingCuYd * beddingSandPerCy
  const jointSandCost = matInstallSF * jointSandPerSF
  const polySandCost = mPolyNewSF > 0 ? mPolyNewSF * polySandPerSF : 0
  // Existing poly sand MATERIAL uses the SAME single rate as New (Paver - Poly Sand).
  const polySandExistingCost = mPolyExistingSF * polySandPerSF
  const sealerMatCost = mSealerSF * sealerMatPerSF
  const restraintMatCost = mRestraintsLF * restraintConcrLF
  const sleevesMatCost = mSleevesLF * sleevesMatLF
  const palletCost = totalPallets * palletCharge
  // Delivery is automatic whenever any paver is selected and is charged once
  // per 900 SF increment (rounded up). The base rate ($442.75 by default) lives
  // in material_rates as "Paver - Delivery" and represents the per-increment
  // fee, not a one-time flat charge.
  const paverSelected = matInstallSF > 0
  const deliveryIncrements =
    paverSelected && deliverySFPerIncrement > 0 ? Math.ceil(matInstallSF / deliverySFPerIncrement) : 0
  const deliveryCost = deliveryIncrements * deliveryFlat
  const shipping = isSubTab ? 0 : n(state.shippingCharge)
  const salesTaxRate = n(state.salesTax) / 100
  const salesTaxCost = (totalPaverCost + vertPaverCost) * salesTaxRate

  const totalMat =
    totalPaverCost +
    vertPaverCost +
    baseRockCost +
    beddingSandCost +
    jointSandCost +
    polySandCost +
    polySandExistingCost +
    sealerMatCost +
    restraintMatCost +
    sleevesMatCost +
    palletCost +
    deliveryCost +
    shipping +
    salesTaxCost +
    manualMat

  // ── Financials ────────────────────────────────────────────────────────────────
  const manDays = totalHrs / 8
  const lrph = n(laborRatePerHour)
  const laborCost = totalHrs * lrph
  const burden = laborCost * n(laborBurdenPct)
  const gp = manDays * n(gpmd)
  const commission = gp * n(commissionRate)
  const subCost = manualSub
  const price = laborCost + burden + totalMat + gp + commission + subCost

  return {
    walkHrs,
    walkPace,
    totalHrs,
    adjustedInstallHrs,
    totalBaseHrs,
    rawInstallHrs,
    manDays,
    laborCost,
    burden,
    totalMat,
    subCost,
    gp,
    commission,
    price,
    areas,
    subAreas,
    totalInstallSF,
    matInstallSF,
    totalBaseCuYd,
    totalPallets,
    totalAreaPallets,
    installHrs,
    add80mmHrs,
    straightCutHrs,
    curvedCutHrs,
    restraintsHrs,
    sleevesHrs,
    vertSoldierHrs,
    sealerHrs,
    polySandHrs,
    polySandExistingHrs,
    polySandExistingSF: polySandExistingSFVal,
    addStoneHrs,
    addColorHrs,
    baseRockCost,
    beddingSandCost,
    jointSandCost,
    polySandCost,
    polySandExistingCost,
    sealerMatCost,
    restraintMatCost,
    sleevesMatCost,
    palletCost,
    deliveryCost,
    deliveryIncrements,
    shipping,
    salesTaxCost,
    totalPaverCost,
    vertPaverCost,
    manualHrs,
    manualMat,
    manualSub,
    installRate,
    straightCutRate,
    curvedCutRate,
    restraintRate,
    sleevesRate,
    vertSoldierRate,
    sealerRate,
    baseSkidGood,
    baseSkidOK,
    baseMiniBobcat,
    baseHand,
    baseRockPerTon,
    beddingSandPerCy,
    jointSandPerSF,
    polySandPerSF,
    sealerMatPerSF,
    restraintConcrLF,
    sleevesMatLF,
    palletCharge,
    deliveryFlat,
    deliverySFPerIncrement,
  }
}
