// Pure Ground Treatments calc — extracted from GroundTreatmentsModule.jsx so the math is
// unit-testable without React/Supabase. Logic identical. calcWalkAccessLabor (lib/walkAccess)
// and catalogOptions (lib/materialCatalog) both import supabase, so their pure bodies are
// inlined here. The module keeps its own copies of these helpers for JSX; this file owns the
// copies the calc consumes (GT_RATES / mergedGtOpts / resolveType).
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


// ── GT_RATES (rate key → DB name map) ──
export const GT_RATES = {
  // ── Mulch ──────────────────────────────────────────────────────────────────
  mulchPerCY: { dbName: 'Mulch' }, // $/CY
  mulchDelivery: { dbName: 'Mulch Delivery Fee' }, // $ flat per delivery
  mulchLab: { dbName: 'Mulch - Labor Rate' }, // CY/day spread rate (labor_rates)

  // ── Edging ─────────────────────────────────────────────────────────────────
  plasticEdgingMat: { dbName: 'Plastic Edging' }, // $/LF
  plasticEdgingLab: { dbName: 'Plastic Edging - Labor Rate' }, // hrs/LF
  metalEdgingMat: { dbName: 'Metal Edging' }, // $/LF
  metalEdgingLab: { dbName: 'Metal Edging - Labor Rate' }, // hrs/LF

  // ── Soil Prep / Preparation ──────────────────────────────────────────────────
  soilPrepMat: { dbName: 'Soil Prep' }, // $/SF  (Area = Planter)
  soilPrepLab: { dbName: 'Soil Prep - Labor Rate' }, // hrs/SF (Area = Planter)
  soilPrepHandAdd: { dbName: 'Soil Prep - Hand Add' }, // hrs/SF — Method = Hand add (In-House only)
  sodPrepMat: { dbName: 'Sod Soil Prep' }, // $/SF  (Area = Sod)
  sodPrepLab: { dbName: 'Sod Soil Prep - Labor Rate' }, // hrs/SF (Area = Sod)
  // ── Tilling (Planter Prep + Sod Prep) — labor per SF by tilling method ──────
  // Added on top of the base soil-prep labor. None = no tilling. Seed real
  // incremental tilling labor via labor_rates (category Ground Treatments).
  tillHandLab: { dbName: 'GT - Till Hand Labor Rate' }, // hrs/SF
  tillTillerLab: { dbName: 'GT - Till Tiller Labor Rate' }, // hrs/SF

  // ── Sod ────────────────────────────────────────────────────────────────────
  sodMarathonMat: { dbName: 'Sod - Marathon' }, // $/SF
  sodStAugMat: { dbName: 'Sod - St. Augustine' }, // $/SF
  sodLab: { dbName: 'Sod - Labor Rate' }, // hrs/SF (≈8/700)
  fertilizerSFPerBag: { dbName: 'Fertilizer - SF Per Bag' }, // SF covered per 18-lb bag (labor_rates coefficient)

  // ── Steppers ───────────────────────────────────────────────────────────────
  // Each stone (Flagstone / Precast) has ONE per-ton material key shared across
  // its Soil Set + Concrete Set lines, and a SEPARATE labor rate (SF/day) per
  // set. "Concrete Set" differs from "Soil Set" only by a (slower) labor rate —
  // no automatic concrete/mortar material is added (values TBD).
  flagstonePerTon: { dbName: 'Flagstone Steppers' }, // $/ton default
  flagstoneSoilLab: { dbName: 'Flagstone Steppers - Soil Labor' }, // SF/day
  flagstoneConcreteLab: { dbName: 'Flagstone Steppers - Concrete Labor' }, // SF/day
  precastPerTon: { dbName: 'Precast Steppers' }, // $/ton default
  precastSoilLab: { dbName: 'Precast Steppers - Soil Labor' }, // SF/day
  precastConcreteLab: { dbName: 'Precast Steppers - Concrete Labor' }, // SF/day

  // ── Decomposed Granite ─────────────────────────────────────────────────────
  dgPerTon: { dbName: 'Decomposed Granite' }, // $/Cu Yd (DG material now priced per cubic yard)
  dgCementPerTon: { dbName: 'DG Cement Mix' }, // $/ton add-on (cement mix still per ton)
  dgHandLab: { dbName: 'DG - Hand Labor Rate' }, // CY/hr (labor_rates)
  dgMachineLab: { dbName: 'DG - Machine Labor Rate' }, // CY/day (labor_rates)

  // ── Gravel ─────────────────────────────────────────────────────────────────
  // Weed fabric material is the company-wide shared 'Weed Fabric' record
  // (Basic Materials → Barriers, $/SF). Labor stays a GT labor coefficient.
  gravelFabricMat: { dbName: 'Weed Fabric' }, // $/SF (shared Basic Materials → Barriers)
  gravelFabricLab: { dbName: 'Gravel Fabric - Labor Rate' }, // hrs/SF
  gravelMachineLab: { dbName: 'Gravel - Machine Labor Rate' }, // CY/day (labor_rates)
  gravelHandLab: { dbName: 'Gravel - Hand Labor Rate' }, // CY/day (labor_rates)
}

export function mergedGtOpts(cat, houseArray, materialRows) {
  // Purely table-driven: options come ONLY from the catalog for this sub-category.
  // (houseArray is ignored — no hardcoded fallback list.)
  return catalogOptions(materialRows, cat, 'Standard', { standardRows: 'null-vendor', stripPrefix: true }).map(
    o => ({ label: o.label, dbName: o.row.name, fallback: parseFloat(o.row.unit_cost) || 0, id: o.row.id })
  )
}

export function resolveType(label, options, houseArray) {
  return (
    (options || []).find(t => t.label === label) ||
    (houseArray || []).find(t => t.label === label) ||
    (options && options[0]) ||
    (houseArray && houseArray[0]) ||
    // Table-driven safe default when a sub-category/vendor has no products —
    // keeps the calc + render from crashing on an empty list (price resolves 0).
    { label: '', dbName: null, fallback: 0, id: null }
  )
}

// ── Calculation engine ──
export function calcGroundTreatments(
  state,
  lrph,
  mp = {},
  gpmd,
  walkAccess = null,
  laborBurdenPct,
  opts = {},
  materialRows = [],
  catDefaults = {},
  commissionRate
) {
  const _pace = parseFloat(walkAccess?.paceLfPerMin) || DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN
  // Sod stays single-choice, so its option list is still supplied via opts.
  // Default to the hardcoded Standard array so the calc works if opts is absent.
  const _opts = {
    sod: opts.sod || [],
  }
  // Per-ROW type option resolver (vendor-aware). 'Standard' (or missing vendor on
  // an old estimate) → hardcoded Standard array. A vendor id → that vendor's
  // products for the row's material category, priced at the vendor's unit_cost.
  const rowOpt = (cat, row, houseArray) => {
    // Resolve the effective vendor: a stored 'auto' (new default) → the category
    // default (first real vendor, else Standard); an explicit 'Standard'/id stays as-is.
    const vsel = row.vendor && row.vendor !== 'auto' ? row.vendor : (catDefaults[cat] || 'Standard')
    if (!vsel || vsel === 'Standard') {
      const merged = mergedGtOpts(cat, houseArray, materialRows)
      return resolveType(row.type, merged, [])
    }
    // Shared row filtering (subcat + vendor); GT keeps its own label transform.
    // standardRows is moot here (vsel is always a real vendor on this branch),
    // but kept as 'null-vendor' so every catalogOptions call in this file uses
    // the one sourcing mode — Standard elsewhere reads the same null-vendor rows.
    const opts = catalogOptions(materialRows, cat, vsel, { standardRows: 'null-vendor' }).map(o => ({
      label: o.row.name.replace(new RegExp('^' + cat + ' - '), '').replace(/^.*? - /, ''),
      dbName: o.row.name,
      fallback: parseFloat(o.row.unit_cost) || 0,
      id: o.row.id,
    }))
    return resolveType(row.type, opts, [])
  }
  const {
    difficulty,
    hoursAdj,
    mulchRows,
    plasticEdgingLF,
    metalEdgingLF,
    edgingRows,
    soilPrepSF,
    prepVendor,
    prepType,
    prepDepthIn,
    prepTilling,
    sodPrepSF,
    sodPrepVendor,
    sodPrepType,
    sodPrepDepthIn,
    sodPrepTilling,
    sodSF,
    sodType,
    sodFertilizer,
    sodFertilizerVendor,
    sodFertilizerSF,
    // Multi-row sections (each an array of per-row objects; mirror mulchRows).
    planterPrepRows,
    sodPrepRows,
    sodRows,
    sodFertRows,
    flagstoneSoilSF,
    flagstoneConcreteSF,
    precastSoilSF,
    precastConcreteSF,
    stepperVendor,
    stepperType,
    dgRows,
    gravelRows,
    soilsRows,
    pebbleRows,
    cobbleRows,
    manualRows,
  } = state

  const p = dbName => n(mp[dbName])

  // ── Table-driven estimating coefficients (fall back to code constants) ──
  // Business-tunable coverage/swell/markup assumptions, surfaced as editable
  // coefficient rows in View Rates (labor_rates, category Ground Treatments).
  // Fixed unit conversions (27 cf/cy, 12 in/ft) stay as literal math.
  const mulchCoverageSfDay = p('GT - Mulch Coverage')
  const stepperSfPerTon = p('GT - Steppers SF Per Ton')
  const dgTonsDenom = p('GT - DG Tons Denominator')
  const dgRemovalSwell = p('GT - DG Removal Swell')
  const dgCoverageSfDay = p('GT - DG Cleanup Coverage')
  const dgCementLaborFactor = p('GT - DG Cement Labor Factor')
  const dgMaterialMarkup = p('GT - DG Material Markup')
  const dgPlacementPerTon = p('GT - DG Placement Labor per Ton')
  const aggregateRemovalSwell = p('GT - Aggregate Removal Swell')

  let totalMat = 0

  // ── Mulch (multi-row) ────────────────────────────────────────────────────────
  let mulchLab = 0,
    mulchMat = 0
  {
    const mulchCYPerDay = p(GT_RATES.mulchLab.dbName)
    let anyMulch = false
    ;(mulchRows || []).forEach(r => {
      if (!(n(r.sf) > 0)) return
      if (!r.type) return
      anyMulch = true
      const CY = (n(r.sf) * (n(r.depth) / 12)) / 27
      const mt = rowOpt('Mulch', r, [])
      mulchMat += CY * mt.fallback
      // hrs-per-unit (standardized 2026-08-18): mulch labor is hrs/Cu Yd, coverage hrs/Sq Ft.
      mulchLab += CY * mulchCYPerDay + n(r.sf) * mulchCoverageSfDay
      if (r.weedFabric === 'Yes') {
        mulchMat += n(r.sf) * p(GT_RATES.gravelFabricMat.dbName)
        mulchLab += n(r.sf) * p(GT_RATES.gravelFabricLab.dbName)
      }
    })
    // Flat delivery fee applied ONCE if any mulch row has area.
    if (anyMulch) {
      mulchMat += p(GT_RATES.mulchDelivery.dbName)
    }
  }

  // ── Edging ─────────────────────────────────────────────────────────────────
  // Labor stays per-line (unchanged). Material rate now comes from the picked
  // Type (filtered to the picked Vendor's catalog); Standard defaults to
  // Plastic/Metal so old estimates price identically.
  // Edging rows (Vendor + Type + LF). Material from the picked Type (filtered to
  // the Vendor's catalog). Labor rate keys off the Type: a metal-ish type uses the
  // Metal labor rate, otherwise the Plastic labor rate. Empty (no type) → $0.
  // Guarded so an unselected row contributes nothing.
  let edgingLab = 0,
    edgingMat = 0
  ;(edgingRows || []).forEach(r => {
    if (!r.type) return
    const lf = n(r.lf)
    const opt = rowOpt('Edging', { vendor: r.vendor, type: r.type }, [])
    const isMetal = /metal/i.test(r.type || '')
    const labRate = isMetal
      ? p(GT_RATES.metalEdgingLab.dbName)
      : p(GT_RATES.plasticEdgingLab.dbName)
    edgingLab += lf * labRate
    edgingMat += lf * opt.fallback
  })

  // ── Preparation (Planting Bed Prep) ─────────────────────────────────────────
  // Area = Planter → existing Soil Prep rates; Area = Sod → independent Sod Soil
  // Prep rates (same defaults). Method = Hand adds an editable per-SF labor
  // coefficient — In-House ONLY (the Sub tab prices prep material the same way
  // but never gets the Hand labor add). soilLab/soilMat keep their downstream
  // wiring (base labor hours + total material).
  const _prepIsSub = state.subType === 'Subcontractor'
  // Tilling labor (hrs/SF) added on top of the base soil-prep labor. None = 0.
  const _tillLab = method =>
    method === 'Hand'
      ? p(GT_RATES.tillHandLab.dbName)
      : method === 'Tiller'
        ? p(GT_RATES.tillTillerLab.dbName)
        : 0

  // ── Planter Preparation (multi-row, Soils-style) ────────────────────────────
  // Each row: Material = CY × $/CY from the picked soil/amendment (sub-category
  // 'Soils'); Labor = area × (soilPrepLab base + tilling coeff). Tilling
  // (None/Hand/Tiller) is the single method control — no separate hand-add
  // (would double-count). Section totals SUM every row.
  let soilLab = 0
  let soilMat = 0
  ;(planterPrepRows || []).forEach(r => {
    const area = n(r.area)
    if (!(area > 0)) return
    const baseLab = p(GT_RATES.soilPrepLab.dbName)
    soilLab += area * (baseLab + _tillLab(r.tilling))
    if (r.type) {
      const CY = (area * (n(r.depthIn) / 12)) / 27
      const st = rowOpt('Soils', { vendor: r.vendor, type: r.type }, [])
      soilMat += CY * st.fallback
    }
  })

  // ── Sod Preparation (multi-row, Soils-style, sod-prep labor base) ───────────
  let sodPrepLabHrs = 0
  let sodPrepMatCost = 0
  ;(sodPrepRows || []).forEach(r => {
    const area = n(r.area)
    if (!(area > 0)) return
    const baseLab = p(GT_RATES.sodPrepLab.dbName)
    sodPrepLabHrs += area * (baseLab + _tillLab(r.tilling))
    if (r.type) {
      const CY = (area * (n(r.depthIn) / 12)) / 27
      const st = rowOpt('Soils', { vendor: r.vendor, type: r.type }, [])
      sodPrepMatCost += CY * st.fallback
    }
  })

  // ── Sod (multi-row) ─────────────────────────────────────────────────────────
  // Per row: labor = SF × sodLab; material = SF × the picked variety's $/SF
  // (no variety picked → $0 material, labor still applies). Section sums rows.
  let sodLab = 0
  let sodMat = 0
  ;(sodRows || []).forEach(r => {
    const sf = n(r.sf)
    sodLab += sf * p(GT_RATES.sodLab.dbName)
    if (r.type) {
      const st = rowOpt('Sod', { vendor: r.vendor, type: r.type }, [])
      sodMat += sf * st.fallback
    }
  })

  // ── Sod Fertilizer (multi-row) ──────────────────────────────────────────────
  // Auto-figured bags from fertilizer SF × coverage (SF/bag), material only.
  // A row with no explicit SF falls back to the total sod SF (sum of sodRows),
  // mirroring the legacy single-row default. Section sums every row.
  let fertMat = 0
  const _sodSFTotal = (sodRows || []).reduce((a, r) => a + n(r.sf), 0)
  ;(sodFertRows || []).forEach(r => {
    const _fertV =
      r.vendor && r.vendor !== 'auto' ? r.vendor : (catDefaults.Fertilizer || 'Standard')
    const fertT = rowOpt('Fertilizer', { vendor: _fertV, type: r.fertilizer }, [])
    const _fertSF = n(r.sf) || _sodSFTotal
    if (r.fertilizer && fertT && fertT.dbName && _fertSF > 0) {
      const sfPerBag = p(GT_RATES.fertilizerSFPerBag.dbName)
      const bags = sfPerBag > 0 ? Math.ceil(_fertSF / sfPerBag) : 0
      fertMat += bags * fertT.fallback
    }
  })

  // ── Steppers (Flagstone + Precast, Soil Set + Concrete Set) ─────────────────
  // Each of the 4 lines now resolves its own material rate from a per-line
  // Vendor + Type pick (Standard defaults → Flagstone/Precast so old estimates are
  // unchanged). Labor stays per-line (its own SF/day rate). material = tons *
  // perTon, tons = SF/80. flagLab/flagMat/precastLab/precastMat are retained for
  // the return shape; stepLab/stepMat are the section totals fed to the bid.
  let stepLab = 0,
    stepMat = 0
  let flagLab = 0,
    flagMat = 0,
    precastLab = 0,
    precastMat = 0
  {
    const _sv = stepperVendor || {}
    const _st = stepperType || {}
    const stepLines = [
      { key: 'flagSoil', sf: flagstoneSoilSF, labRate: GT_RATES.flagstoneSoilLab, defType: 'Flagstone', bucket: 'flag' },
      { key: 'flagConc', sf: flagstoneConcreteSF, labRate: GT_RATES.flagstoneConcreteLab, defType: 'Flagstone', bucket: 'flag' },
      { key: 'precSoil', sf: precastSoilSF, labRate: GT_RATES.precastSoilLab, defType: 'Precast', bucket: 'precast' },
      { key: 'precConc', sf: precastConcreteSF, labRate: GT_RATES.precastConcreteLab, defType: 'Precast', bucket: 'precast' },
    ]
    stepLines.forEach(ln => {
      if (!(n(ln.sf) > 0)) return
      const opt = rowOpt('Steppers', { vendor: _sv[ln.key], type: _st[ln.key] || ln.defType }, [])
      const perTon = opt.fallback
      // hrs-per-unit: stepper labor is hrs per Sq Ft (standardized 2026-08-18, was SF/day).
      const sfPerDay = p(ln.labRate.dbName)
      const lab = n(ln.sf) * sfPerDay
      // Guard the divisor: an unset 'GT - Steppers SF Per Ton' ⇒ 0 material (no fallback,
      // never Infinity). Matches the demoTonsDivisor / sfPerBag guards elsewhere.
      const mat = stepperSfPerTon > 0 ? (n(ln.sf) / stepperSfPerTon) * perTon : 0
      stepLab += lab
      stepMat += mat
      if (ln.bucket === 'flag') {
        flagLab += lab
        flagMat += mat
      } else {
        precastLab += lab
        precastMat += mat
      }
    })
  }

  // ── Decomposed Granite (multi-row) ──────────────────────────────────────────
  let dgLab = 0,
    dgMat = 0
  {
    const dgHandRate = p(GT_RATES.dgHandLab.dbName)
    const dgMachineRate = p(GT_RATES.dgMachineLab.dbName)
    ;(dgRows || []).forEach(r => {
      if (!(n(r.sf) > 0)) return
      if (!r.type) return
      // Guard the divisor: an unset 'GT - DG Tons Denominator' ⇒ 0 tons (no Infinity); DG
      // labor/cement scale off tons, so an unset coefficient contributes 0, not NaN.
      const tons = dgTonsDenom > 0 ? (n(r.sf) * n(r.depth)) / dgTonsDenom : 0
      // DG MATERIAL is now priced per CUBIC YARD (company-wide base-aggregate
      // change): material $ = CY × $/CY. Volume in CY uses the fixed unit math
      // (27 cf/cy × 12 in/ft → SF × depth_in / 324). `tons` is retained ONLY for
      // labor (excavation/placement) and the per-ton Cement Mix add-on — both
      // unchanged — so dgTonsDenom is still in use (harmless if it were unused).
      const CY = (n(r.sf) * (n(r.depth) / 12)) / 27
      const cement = r.cement === 'Yes'
      const dgt = rowOpt('DG', r, [])
      const baseHrs =
        r.method === 'Hand'
          ? tons * dgRemovalSwell * dgHandRate + n(r.sf) * dgCoverageSfDay + tons * dgPlacementPerTon
          : tons * dgRemovalSwell * dgMachineRate + n(r.sf) * dgCoverageSfDay + tons * dgPlacementPerTon
      dgLab += baseHrs + (cement ? tons * dgCementLaborFactor : 0)
      dgMat +=
        (CY * dgt.fallback +
          (cement
            ? tons * p(GT_RATES.dgCementPerTon.dbName)
            : 0)) *
        dgMaterialMarkup
      if (r.weedFabric === 'Yes') {
        dgMat += n(r.sf) * p(GT_RATES.gravelFabricMat.dbName)
        dgLab += n(r.sf) * p(GT_RATES.gravelFabricLab.dbName)
      }
    })
  }

  // ── Gravel rows ────────────────────────────────────────────────────────────
  let gravelLab = 0,
    gravelMat = 0
  gravelRows.forEach(r => {
    if (!n(r.sf)) return
    if (!r.type) return
    const CY = (n(r.sf) * (n(r.depthIn) / 12)) / 27
    const machineRate = p(GT_RATES.gravelMachineLab.dbName)
    const handRate = p(GT_RATES.gravelHandLab.dbName)
    const excavLab =
      r.method === 'Machine' ? CY * aggregateRemovalSwell * machineRate : CY * aggregateRemovalSwell * handRate
    // Weed barrier — same fabric material + labor rate as DG's weed barrier.
    // Legacy rows (no weedFabric field) default to Yes so prior estimates that
    // always included fabric are unchanged.
    const wantFabric = (r.weedFabric ?? 'Yes') === 'Yes'
    const fabricLab = wantFabric
      ? n(r.sf) * p(GT_RATES.gravelFabricLab.dbName)
      : 0
    gravelLab += excavLab + fabricLab
    const gtype = rowOpt('Gravel', r, [])
    const costPerCY = gtype.fallback
    gravelMat +=
      CY * costPerCY +
      (wantFabric ? n(r.sf) * p(GT_RATES.gravelFabricMat.dbName) : 0)
  })

  // ── Pebble rows (same calc/labor as Gravel; PEBBLE_TYPES material) ──────────
  let pebbleLab = 0,
    pebbleMat = 0
  ;(pebbleRows || []).forEach(r => {
    if (!n(r.sf)) return
    if (!r.type) return
    const CY = (n(r.sf) * (n(r.depthIn) / 12)) / 27
    const machineRate = p(GT_RATES.gravelMachineLab.dbName)
    const handRate = p(GT_RATES.gravelHandLab.dbName)
    const excavLab =
      r.method === 'Machine' ? CY * aggregateRemovalSwell * machineRate : CY * aggregateRemovalSwell * handRate
    // Weed barrier — same fabric material + labor rate as DG's weed barrier.
    const wantFabric = (r.weedFabric ?? 'Yes') === 'Yes'
    const fabricLab = wantFabric
      ? n(r.sf) * p(GT_RATES.gravelFabricLab.dbName)
      : 0
    pebbleLab += excavLab + fabricLab
    const ptype = rowOpt('Pebble', r, [])
    const costPerCY = ptype.fallback
    pebbleMat +=
      CY * costPerCY +
      (wantFabric ? n(r.sf) * p(GT_RATES.gravelFabricMat.dbName) : 0)
  })

  // ── Cobbles & Boulders rows (same calc/labor as Gravel; COBBLE_TYPES) ───────
  let cobbleLab = 0,
    cobbleMat = 0
  ;(cobbleRows || []).forEach(r => {
    if (!n(r.sf)) return
    if (!r.type) return
    const CY = (n(r.sf) * (n(r.depthIn) / 12)) / 27
    const machineRate = p(GT_RATES.gravelMachineLab.dbName)
    const handRate = p(GT_RATES.gravelHandLab.dbName)
    const excavLab =
      r.method === 'Machine' ? CY * aggregateRemovalSwell * machineRate : CY * aggregateRemovalSwell * handRate
    // Weed barrier — same fabric material + labor rate as DG's weed barrier.
    const wantFabric = (r.weedFabric ?? 'Yes') === 'Yes'
    const fabricLab = wantFabric
      ? n(r.sf) * p(GT_RATES.gravelFabricLab.dbName)
      : 0
    cobbleLab += excavLab + fabricLab
    const ctype = rowOpt('Cobbles', r, [])
    const costPerCY = ctype.fallback
    cobbleMat +=
      CY * costPerCY +
      (wantFabric ? n(r.sf) * p(GT_RATES.gravelFabricMat.dbName) : 0)
  })

  // ── Manual ─────────────────────────────────────────────────────────────────
  let manHrs = 0,
    manMat = 0,
    manSub = 0
  manualRows.forEach(r => {
    manHrs += n(r.hours)
    manMat += n(r.materials)
    manSub += n(r.subCost)
  })

  // ── Totals ─────────────────────────────────────────────────────────────────
  const baseHrs =
    mulchLab +
    edgingLab +
    soilLab +
    sodPrepLabHrs +
    sodLab +
    stepLab +
    dgLab +
    gravelLab +
    pebbleLab +
    cobbleLab +
    manHrs
  const diffMod = 1 + n(difficulty) / 100
  const _preWalkHrs = baseHrs * diffMod + n(hoursAdj)
  const walkHrs = calcWalkAccessLabor(_preWalkHrs, state.distanceLF, { paceLfPerMin: _pace })
  const totalHrs = _preWalkHrs + walkHrs
  const manDays = totalHrs / 8
  totalMat =
    mulchMat +
    edgingMat +
    soilMat +
    sodPrepMatCost +
    sodMat +
    fertMat +
    stepMat +
    dgMat +
    gravelMat +
    pebbleMat +
    cobbleMat +
    manMat
  const laborCost = totalHrs * n(lrph)
  const burden = laborCost * n(laborBurdenPct)
  const isSubTab = state.subType === 'Subcontractor'
  const subMarkup = n(state.subGpMarkupRate)
  // On the Sub tab every section is a FLAT subcontractor unit rate sourced from
  // subcontractor_rates (via mp) — $/SF (or $/LF for edging), not hours+material.
  // (Soils is omitted — subcontractors bring their own soil.)
  const _sfSum = rows => (rows || []).reduce((a, r) => a + n(r.sf), 0)
  const _stepSubSF =
    n(flagstoneSoilSF) + n(flagstoneConcreteSF) + n(precastSoilSF) + n(precastConcreteSF)
  const sectionSubTotal =
    n(soilPrepSF) * p('Soil Prep Sub - $/SF') +
    n(sodSF) * p('Sod Sub - $/SF') +
    _sfSum(mulchRows) * p('Mulch Sub - $/SF') +
    _sfSum(dgRows) * p('DG Sub - $/SF') +
    _sfSum(gravelRows) * p('Gravel Sub - $/SF') +
    _sfSum(pebbleRows) * p('Pebble Sub - $/SF') +
    _sfSum(cobbleRows) * p('Cobbles Sub - $/SF') +
    (n(plasticEdgingLF) + n(metalEdgingLF)) * p('Edging Sub - $/LF') +
    _stepSubSF * p('Steppers Sub - $/SF')
  let gp, subCost, subGp, commission, price
  if (isSubTab) {
    gp = 0
    subCost = sectionSubTotal + manSub // flat subcontractor unit rates
    subGp = subCost * subMarkup
    commission = subGp * n(commissionRate)
    price = subCost + subGp + commission
  } else {
    gp = manDays * n(gpmd)
    subCost = manSub
    subGp = 0
    commission = gp * n(commissionRate)
    price = totalMat + laborCost + burden + gp + commission + subCost
  }

  return {
    // On the Sub tab the bid is the flat subcontractor cost only — the itemized
    // in-house hours/material/burden don't apply (and shouldn't be taxed).
    walkHrs: isSubTab ? 0 : walkHrs,
    totalHrs: isSubTab ? 0 : totalHrs,
    manDays: isSubTab ? 0 : manDays,
    totalMat: isSubTab ? 0 : totalMat,
    laborCost: isSubTab ? 0 : laborCost,
    burden: isSubTab ? 0 : burden,
    gp,
    subGp,
    commission,
    subCost,
    price,
    // section breakdowns for summary
    mulchLab,
    mulchMat,
    edgingLab,
    edgingMat,
    soilLab,
    soilMat,
    sodPrepLab: sodPrepLabHrs,
    sodPrepMat: sodPrepMatCost,
    sodLab,
    sodMat,
    flagLab,
    flagMat,
    precastLab,
    precastMat,
    dgLab,
    dgMat,
    gravelLab,
    gravelMat,
    pebbleLab,
    pebbleMat,
    cobbleLab,
    cobbleMat,
  }
}
