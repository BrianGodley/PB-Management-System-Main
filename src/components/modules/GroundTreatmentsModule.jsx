import WorkTypeChooser from './WorkTypeChooser'
import CrewTypeBar from './CrewTypeBar'
import ModuleHeaderSlot from './ModuleHeaderSlot'
import { useState, useEffect, useCallback, useContext } from 'react'
import { SubTabContext, subSectionTitle } from './subTabContext'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import { fetchSalesTaxRate } from '../../lib/companyDefaults'
import { calcWalkAccessLabor, DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN } from '../../lib/walkAccess'
import { catalogOptions, fetchModuleCatalog } from '../../lib/materialCatalog'

// Estimator repoint: Ground Treatments material pickers now read from the rebuilt
// catalog (material + material_price), filtered by (Ground Treatments, sub-cat).
// The taxonomy sub-category name equals each section's marker except D.G., whose
// sub-category is named "Decomposed Granite" — remap it back to the "DG" marker.
const GT_MARKER_REMAP = { 'Decomposed Granite': 'DG' }
async function fetchGtRows() {
  const rows = await fetchModuleCatalog(['Ground Treatments'])
  return (rows || []).map(r => ({ ...r, sub_category: GT_MARKER_REMAP[r.sub_category] || r.sub_category }))
}

// Section Type options — DB-driven from the new catalog: every Standard
// (null-vendor) product assigned to (Ground Treatments, cat) becomes an option,
// priced from material_price. The built-in `houseArray` is only a fallback for a
// sub-category that has no products yet, so nothing disappears mid-migration.
function mergedGtOpts(cat, houseArray, materialRows) {
  // Purely table-driven: options come ONLY from the catalog for this sub-category.
  // (houseArray is ignored — no hardcoded fallback list.)
  return catalogOptions(materialRows, cat, 'Standard', { standardRows: 'null-vendor', stripPrefix: true }).map(
    o => ({ label: o.label, dbName: o.row.name, fallback: parseFloat(o.row.unit_cost) || 0, id: o.row.id })
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Ground Treatments Module — based on Softscape Module tab in Excel estimator
// Covers: Mulch, Edging, Soil Prep, Sod, Flagstone/Precast Steppers,
//         Decomposed Granite, Gravel, Manual Entry
// ─────────────────────────────────────────────────────────────────────────────

// All dbName entries are read from material_rates (category = 'Ground Treatments').
// Fallback values are used when DB row is absent.
const GT_RATES = {
  // ── Mulch ──────────────────────────────────────────────────────────────────
  mulchPerCY: { dbName: 'Mulch', fallback: 25.0 }, // $/CY
  mulchDelivery: { dbName: 'Mulch Delivery Fee', fallback: 75.0 }, // $ flat per delivery
  mulchLab: { dbName: 'Mulch - Labor Rate', fallback: 15 }, // CY/day spread rate (labor_rates)

  // ── Edging ─────────────────────────────────────────────────────────────────
  plasticEdgingMat: { dbName: 'Plastic Edging', fallback: 1.2 }, // $/LF
  plasticEdgingLab: { dbName: 'Plastic Edging - Labor Rate', fallback: 0.09 }, // hrs/LF
  metalEdgingMat: { dbName: 'Metal Edging', fallback: 4.0 }, // $/LF
  metalEdgingLab: { dbName: 'Metal Edging - Labor Rate', fallback: 0.17 }, // hrs/LF

  // ── Soil Prep / Preparation ──────────────────────────────────────────────────
  soilPrepMat: { dbName: 'Soil Prep', fallback: 0.1558 }, // $/SF  (Area = Planter)
  soilPrepLab: { dbName: 'Soil Prep - Labor Rate', fallback: 0.012 }, // hrs/SF (Area = Planter)
  soilPrepHandAdd: { dbName: 'Soil Prep - Hand Add', fallback: 0.06 }, // hrs/SF — Method = Hand add (In-House only)
  sodPrepMat: { dbName: 'Sod Soil Prep', fallback: 0.1558 }, // $/SF  (Area = Sod)
  sodPrepLab: { dbName: 'Sod Soil Prep - Labor Rate', fallback: 0.012 }, // hrs/SF (Area = Sod)
  // ── Tilling (Planter Prep + Sod Prep) — labor per SF by tilling method ──────
  // Added on top of the base soil-prep labor. None = no tilling. Seed real
  // incremental tilling labor via labor_rates (category Ground Treatments).
  tillHandLab: { dbName: 'GT - Till Hand Labor Rate', fallback: 0.06 }, // hrs/SF
  tillTillerLab: { dbName: 'GT - Till Tiller Labor Rate', fallback: 0.012 }, // hrs/SF

  // ── Sod ────────────────────────────────────────────────────────────────────
  sodMarathonMat: { dbName: 'Sod - Marathon', fallback: 1.2 }, // $/SF
  sodStAugMat: { dbName: 'Sod - St. Augustine', fallback: 1.97 }, // $/SF
  sodLab: { dbName: 'Sod - Labor Rate', fallback: 0.01143 }, // hrs/SF (≈8/700)
  fertilizerSFPerBag: { dbName: 'Fertilizer - SF Per Bag', fallback: 4000 }, // SF covered per 18-lb bag (labor_rates coefficient)

  // ── Steppers ───────────────────────────────────────────────────────────────
  // Each stone (Flagstone / Precast) has ONE per-ton material key shared across
  // its Soil Set + Concrete Set lines, and a SEPARATE labor rate (SF/day) per
  // set. "Concrete Set" differs from "Soil Set" only by a (slower) labor rate —
  // no automatic concrete/mortar material is added (values TBD).
  flagstonePerTon: { dbName: 'Flagstone Steppers', fallback: 500.0 }, // $/ton default
  flagstoneSoilLab: { dbName: 'Flagstone Steppers - Soil Labor', fallback: 35 }, // SF/day
  flagstoneConcreteLab: { dbName: 'Flagstone Steppers - Concrete Labor', fallback: 25 }, // SF/day
  precastPerTon: { dbName: 'Precast Steppers', fallback: 200.0 }, // $/ton default
  precastSoilLab: { dbName: 'Precast Steppers - Soil Labor', fallback: 50 }, // SF/day
  precastConcreteLab: { dbName: 'Precast Steppers - Concrete Labor', fallback: 35 }, // SF/day

  // ── Decomposed Granite ─────────────────────────────────────────────────────
  dgPerTon: { dbName: 'Decomposed Granite', fallback: 50.0 }, // $/ton
  dgCementPerTon: { dbName: 'DG Cement Mix', fallback: 20.0 }, // $/ton add-on
  dgHandLab: { dbName: 'DG - Hand Labor Rate', fallback: 0.5 }, // CY/hr (labor_rates)
  dgMachineLab: { dbName: 'DG - Machine Labor Rate', fallback: 12 }, // CY/day (labor_rates)

  // ── Gravel ─────────────────────────────────────────────────────────────────
  gravelFabricMat: { dbName: 'Gravel Fabric', fallback: 0.1 }, // $/SF
  gravelFabricLab: { dbName: 'Gravel Fabric - Labor Rate', fallback: 0.024 }, // hrs/SF
  gravelMachineLab: { dbName: 'Gravel - Machine Labor Rate', fallback: 12 }, // CY/day (labor_rates)
  gravelHandLab: { dbName: 'Gravel - Hand Labor Rate', fallback: 4 }, // CY/day (labor_rates)
}

// Gravel material types — each drives its own $/CY (material_rates). Pricing TBD
// (all default 130) until real per-type prices are entered via RateEditPopover.
const GRAVEL_TYPES = [
  { label: 'Crushed Pea Gravel', dbName: 'Gravel - Crushed Pea Gravel', fallback: 130 },
  { label: '3/4" Crushed Gravel', dbName: 'Gravel - 3/4" Crushed Gravel', fallback: 130 },
  { label: 'Del Rio', dbName: 'Gravel - Del Rio', fallback: 130 },
  { label: 'Black River Rock 1" minus', dbName: 'Gravel - Black River Rock 1in minus', fallback: 130 },
  { label: 'Black River Rock 1"-2"', dbName: 'Gravel - Black River Rock 1in-2in', fallback: 130 },
  { label: 'Black River Rock 2" to 3"', dbName: 'Gravel - Black River Rock 2in-3in', fallback: 130 },
  { label: '3/8" Crushed Pea Gravel', dbName: 'Gravel - 3/8in Crushed Pea Gravel', fallback: 89 },
  { label: '1 1/2" Crushed Gravel',   dbName: 'Gravel - 1.5in Crushed Gravel',     fallback: 85 },
  { label: 'Misc Aggregate (3/4")',   dbName: 'Gravel - Misc Aggregate',           fallback: 40 },
  { label: 'Black Lava',              dbName: 'Gravel - Black Lava',                fallback: 165 },
  { label: 'Burgundy Lava 3/8"',      dbName: 'Gravel - Burgundy Lava 3/8in',      fallback: 180 },
  { label: 'Burgundy Lava 3/4"',      dbName: 'Gravel - Burgundy Lava 3/4in',      fallback: 165 },
  { label: 'California Gold 3/8"',    dbName: 'Gravel - California Gold 3/8in',     fallback: 250 },
  { label: 'California Gold 3/4"',    dbName: 'Gravel - California Gold 3/4in',     fallback: 300 },
  { label: 'Eagle Mountain',          dbName: 'Gravel - Eagle Mountain',           fallback: 165 },
  { label: 'Honey Quartz',            dbName: 'Gravel - Honey Quartz',             fallback: 200 },
  { label: 'Las Vegas Rainbow',       dbName: 'Gravel - Las Vegas Rainbow',        fallback: 220 },
  { label: 'Pearl White',             dbName: 'Gravel - Pearl White',              fallback: 300 },
  { label: 'Tuscan Rose',             dbName: 'Gravel - Tuscan Rose',              fallback: 220 },
]

// Pebble material types — each drives its own $/CY (material_rates). Reuses the
// same labor + fabric rates as Gravel; only the material Type list differs.
const PEBBLE_TYPES = [
  { label: 'Arizona River Rock', dbName: 'Pebble - Arizona River Rock', fallback: 300 },
  { label: 'Cinnamon',           dbName: 'Pebble - Cinnamon',           fallback: 320 },
  { label: 'Del Rio Pebble',     dbName: 'Pebble - Del Rio',            fallback: 200 },
  { label: 'Leopard Granite',    dbName: 'Pebble - Leopard Granite',    fallback: 150 },
  { label: 'White River Pebble', dbName: 'Pebble - White River',        fallback: 150 },
  { label: 'Yosemite',           dbName: 'Pebble - Yosemite',           fallback: 295 },
  { label: 'Yuba (Salt & Pepper)', dbName: 'Pebble - Yuba',             fallback: 450 },
  { label: 'Baja (Beach)',       dbName: 'Pebble - Baja',               fallback: 660 },
  { label: 'Black (Beach)',      dbName: 'Pebble - Black',              fallback: 660 },
  { label: 'Buff (Beach)',       dbName: 'Pebble - Buff',               fallback: 690 },
  { label: 'Mixed (Beach)',      dbName: 'Pebble - Mixed',              fallback: 660 },
  { label: 'Red (Beach)',        dbName: 'Pebble - Red',               fallback: 690 },
  { label: 'Sonora (Beach)',     dbName: 'Pebble - Sonora',             fallback: 660 },
]

// Cobbles & Boulders material types — same calc/labor as Gravel; type list only.
const COBBLE_TYPES = [
  { label: 'Granite River Rock', dbName: 'Cobble - Granite River Rock', fallback: 308 },
  { label: 'Arizona',            dbName: 'Cobble - Arizona',            fallback: 420 },
  { label: 'Auburn Brown',       dbName: 'Cobble - Auburn Brown',       fallback: 644 },
  { label: 'Cresta',             dbName: 'Cobble - Cresta',             fallback: 700 },
  { label: 'Las Vegas Rainbow',  dbName: 'Cobble - Las Vegas Rainbow',  fallback: 588 },
  { label: 'Miners Gold',        dbName: 'Cobble - Miners Gold',        fallback: 252 },
  { label: 'Miners Pink',        dbName: 'Cobble - Miners Pink',        fallback: 252 },
]

// Mulch product types (material_rates, $/CY). Type drives material cost only.
const MULCH_TYPES = [
  { label: 'Premium Mulch', dbName: 'Mulch - Premium', fallback: 20 },
  { label: 'Brown Shredded', dbName: 'Mulch - Brown Shredded', fallback: 20 },
  { label: 'Flower Bed Mulch', dbName: 'Mulch - Flower Bed', fallback: 28 },
  { label: 'Shredded Cedar / Gorilla Hair', dbName: 'Mulch - Shredded Cedar', fallback: 80 },
  { label: 'Forest Moss', dbName: 'Mulch - Forest Moss', fallback: 80 },
  { label: 'Black Dyed Chips', dbName: 'Mulch - Black Dyed Chips', fallback: 32 },
  { label: 'Brown Dyed Chips', dbName: 'Mulch - Brown Dyed Chips', fallback: 32 },
  { label: 'Red Dyed Chips', dbName: 'Mulch - Red Dyed Chips', fallback: 32 },
  { label: 'Playground Chips', dbName: 'Mulch - Playground Chips', fallback: 60 },
  { label: 'Walk On Bark', dbName: 'Mulch - Walk On Bark', fallback: 85 },
  { label: 'Small Bark Nugget', dbName: 'Mulch - Small Bark Nugget', fallback: 85 },
  { label: 'Medium Bark Nugget', dbName: 'Mulch - Medium Bark Nugget', fallback: 85 },
]

// D.G. product types (material_rates, per TON — matches the existing per-ton DG
// material calc). Default 'Decomposed Granite' keeps existing estimates unchanged.
const DG_TYPES = [
  { label: 'Decomposed Granite', dbName: 'Decomposed Granite', fallback: 50 }, // C&M $50/CY
  { label: 'Stabilized DG', dbName: 'DG - Stabilized', fallback: 75 }, // C&M $75/CY
  { label: 'Rock Dust - Grey', dbName: 'DG - Rock Dust Grey', fallback: 120 }, // C&M $120/CY
  { label: 'Grey Stabilized Rock Dust', dbName: 'DG - Grey Stabilized Rock Dust', fallback: 145 }, // C&M $145/CY
]

// Stepper stone types (material_rates, per TON). Standard defaults keep existing
// estimates unchanged (Flagstone / Precast). Vendor rows filter to sub_category
// 'Steppers'. Labor stays per-line (Soil vs Concrete SF/day), not from the type.
const STEPPER_TYPES = [
  { label: 'Flagstone', dbName: 'Flagstone Steppers', fallback: 500 },
  { label: 'Precast',   dbName: 'Precast Steppers',   fallback: 200 },
]
// Edging types (material_rates, per LF). Standard defaults keep existing estimates
// unchanged (Plastic / Metal). Vendor rows filter to sub_category 'Edging'.
const EDGING_TYPES = [
  { label: 'Plastic', dbName: 'Plastic Edging', fallback: 1.2 },
  { label: 'Metal',   dbName: 'Metal Edging',   fallback: 4.0 },
]

const DEFAULTS = {
  laborRatePerHour: 35,
  laborBurdenPct: 0.29,
  gpmd: 425,
  commissionRate: 0.12,
}

// Sod varieties — Southland Sod Farms wholesale, Zone 2 delivered $/SF (material_rates).
const SOD_TYPES = [
  { label: 'Marathon', dbName: 'Sod - Marathon', fallback: 1.0 },
  { label: 'Marathon II', dbName: 'Sod - Marathon II', fallback: 1.01 },
  { label: 'Marathon Lite', dbName: 'Sod - Marathon Lite', fallback: 1.16 },
  { label: 'Marathon II Lite', dbName: 'Sod - Marathon II Lite', fallback: 1.17 },
  { label: 'PureBlue Lite', dbName: 'Sod - PureBlue Lite', fallback: 1.26 },
  { label: 'GreenWave Lite', dbName: 'Sod - GreenWave Lite', fallback: 1.26 },
  { label: 'Hybrid Bermuda', dbName: 'Sod - Hybrid Bermuda', fallback: 1.0 },
  { label: 'St. Augustine', dbName: 'Sod - St. Augustine', fallback: 1.73 },
]

// Soil-prep bed material — single Standard type; vendors may supply a 'Soil Prep'
// category so the Sod section's Soil Prep line matches the Vendor|Type format.
const SOIL_PREP_TYPES = [
  { label: 'Soil Prep', dbName: GT_RATES.soilPrepMat.dbName, fallback: GT_RATES.soilPrepMat.fallback },
]

// Fertilizer options — Southland Sod Farms, $/18-lb bag (material_rates). Bags are
// auto-figured from the sod SF via the SF-per-bag coverage coefficient.
const FERTILIZER_TYPES = [
  { label: 'None', dbName: null, fallback: 0 },
  { label: 'Marathon All Season (24-2-4)', dbName: 'Fertilizer - Marathon All Season', fallback: 20.84 },
  { label: 'Sod & Seed Starter (15-15-15)', dbName: 'Fertilizer - Sod Seed Starter', fallback: 20.87 },
]

// Soil products — C&M Topsoil "SOILS" section, $/CY (material_rates). Optional lines.
const SOIL_TYPES = [
  { label: 'Topsoil (Sandy Loam)', dbName: 'Soil - Topsoil', fallback: 20 },
  { label: 'Compost', dbName: 'Soil - Compost', fallback: 20 },
  { label: 'Seed Cover', dbName: 'Soil - Seed Cover', fallback: 20 },
  { label: 'Veggie/Flower Mix', dbName: 'Soil - Veggie Flower Mix', fallback: 20 },
  { label: '50/50 Planter Mix', dbName: 'Soil - 50-50 Planter Mix', fallback: 20 },
  { label: '70/30 Topsoil Mix', dbName: 'Soil - 70-30 Topsoil Mix', fallback: 20 },
  { label: '30/70 Compost Mix', dbName: 'Soil - 30-70 Compost Mix', fallback: 40 },
  { label: 'Nursery Mix', dbName: 'Soil - Nursery Mix', fallback: 20 },
  { label: 'Nursery Mix w/ Pumice', dbName: 'Soil - Nursery Mix Pumice', fallback: 40 },
  { label: 'Cactus Mix', dbName: 'Soil - Cactus Mix', fallback: 40 },
  { label: 'Can Mix', dbName: 'Soil - Can Mix', fallback: 40 },
  { label: 'Color Mix', dbName: 'Soil - Color Mix', fallback: 40 },
  { label: 'Bioswale Mix', dbName: 'Soil - Bioswale Mix', fallback: 40 },
  { label: 'Pump Mix', dbName: 'Soil - Pump Mix', fallback: 40 },
]
const DG_METHODS = ['Machine', 'Hand']

const n = v => parseFloat(v) || 0

// Resolve a saved row LABEL to its matching type option {label, dbName, fallback}.
// Prefers the section's current (possibly vendor-filtered) option list, then the
// hardcoded Standard array, then the first available option — so pricing never breaks
// when a vendor is selected, a product is missing, or an old estimate is reopened.
function resolveType(label, options, houseArray) {
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

// ── Calculation engine ────────────────────────────────────────────────────────
function calcGroundTreatments(
  state,
  lrph = DEFAULTS.laborRatePerHour,
  mp = {},
  gpmd = DEFAULTS.gpmd,
  walkAccess = null,
  laborBurdenPct = DEFAULTS.laborBurdenPct,
  opts = {},
  materialRows = [],
  catDefaults = {}
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
    const opts = catalogOptions(materialRows, cat, vsel, { standardRows: 'exclude' }).map(o => ({
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
    edgingVendor,
    edgingType,
    edgingLF,
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

  const p = (dbName, fallback) => mp[dbName] ?? fallback

  // ── Table-driven estimating coefficients (fall back to code constants) ──
  // Business-tunable coverage/swell/markup assumptions, surfaced as editable
  // coefficient rows in View Rates (labor_rates, category Ground Treatments).
  // Fixed unit conversions (27 cf/cy, 12 in/ft) stay as literal math.
  const mulchCoverageSfDay = p('GT - Mulch Coverage SF/Day', 3200)
  const stepperSfPerTon = p('GT - Steppers SF Per Ton', 80)
  const dgTonsDenom = p('GT - DG Tons Denominator', 200)
  const dgRemovalSwell = p('GT - DG Removal Swell', 1.62)
  const dgCoverageSfDay = p('GT - DG Cleanup Coverage SF/Day', 1000)
  const dgCementLaborFactor = p('GT - DG Cement Labor Factor', 1.25)
  const dgMaterialMarkup = p('GT - DG Material Markup', 1.1)
  const aggregateRemovalSwell = p('GT - Aggregate Removal Swell', 1.62)

  let totalMat = 0

  // ── Mulch (multi-row) ────────────────────────────────────────────────────────
  let mulchLab = 0,
    mulchMat = 0
  {
    const mulchCYPerDay = p(GT_RATES.mulchLab.dbName, GT_RATES.mulchLab.fallback)
    let anyMulch = false
    ;(mulchRows || []).forEach(r => {
      if (!(n(r.sf) > 0)) return
      if (!r.type) return
      anyMulch = true
      const CY = (n(r.sf) * (n(r.depth) / 12)) / 27
      const mt = rowOpt('Mulch', r, [])
      mulchMat += CY * mt.fallback
      mulchLab += (CY / mulchCYPerDay) * 8 + (n(r.sf) / mulchCoverageSfDay) * 8
      if (r.weedFabric === 'Yes') {
        mulchMat += n(r.sf) * p(GT_RATES.gravelFabricMat.dbName, GT_RATES.gravelFabricMat.fallback)
        mulchLab += n(r.sf) * p(GT_RATES.gravelFabricLab.dbName, GT_RATES.gravelFabricLab.fallback)
      }
    })
    // Flat delivery fee applied ONCE if any mulch row has area.
    if (anyMulch) {
      mulchMat += p(GT_RATES.mulchDelivery.dbName, GT_RATES.mulchDelivery.fallback)
    }
  }

  // ── Edging ─────────────────────────────────────────────────────────────────
  // Labor stays per-line (unchanged). Material rate now comes from the picked
  // Type (filtered to the picked Vendor's catalog); Standard defaults to
  // Plastic/Metal so old estimates price identically.
  // ONE combined Edging row (Vendor + Type + LF). Material from the picked Type
  // (filtered to the Vendor's catalog). Labor rate keys off the Type: a metal-ish
  // type uses the Metal labor rate, otherwise the Plastic labor rate. Empty
  // (no type) → $0. Guarded so an unselected row contributes nothing.
  const _edgeLF = n(edgingLF)
  const _edgeOpt = rowOpt('Edging', { vendor: edgingVendor, type: edgingType }, [])
  const _edgeIsMetal = /metal/i.test(edgingType || '')
  const _edgeLabRate = _edgeIsMetal
    ? p(GT_RATES.metalEdgingLab.dbName, GT_RATES.metalEdgingLab.fallback)
    : p(GT_RATES.plasticEdgingLab.dbName, GT_RATES.plasticEdgingLab.fallback)
  const edgingLab = edgingType ? _edgeLF * _edgeLabRate : 0
  const edgingMat = edgingType ? _edgeLF * _edgeOpt.fallback : 0

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
      ? p(GT_RATES.tillHandLab.dbName, GT_RATES.tillHandLab.fallback)
      : method === 'Tiller'
        ? p(GT_RATES.tillTillerLab.dbName, GT_RATES.tillTillerLab.fallback)
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
    const baseLab = p(GT_RATES.soilPrepLab.dbName, GT_RATES.soilPrepLab.fallback)
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
    const baseLab = p(GT_RATES.sodPrepLab.dbName, GT_RATES.sodPrepLab.fallback)
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
    sodLab += sf * p(GT_RATES.sodLab.dbName, GT_RATES.sodLab.fallback)
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
      const sfPerBag = p(GT_RATES.fertilizerSFPerBag.dbName, GT_RATES.fertilizerSFPerBag.fallback)
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
      const sfPerDay = p(ln.labRate.dbName, ln.labRate.fallback)
      const lab = sfPerDay > 0 ? (n(ln.sf) / sfPerDay) * 8 : 0
      const mat = (n(ln.sf) / stepperSfPerTon) * perTon
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
    const dgHandRate = p(GT_RATES.dgHandLab.dbName, GT_RATES.dgHandLab.fallback)
    const dgMachineRate = p(GT_RATES.dgMachineLab.dbName, GT_RATES.dgMachineLab.fallback)
    ;(dgRows || []).forEach(r => {
      if (!(n(r.sf) > 0)) return
      if (!r.type) return
      const tons = (n(r.sf) * n(r.depth)) / dgTonsDenom
      const cement = r.cement === 'Yes'
      const dgt = rowOpt('DG', r, [])
      const baseHrs =
        r.method === 'Hand'
          ? (tons * dgRemovalSwell) / dgHandRate + (n(r.sf) / dgCoverageSfDay) * 8 + tons
          : ((tons * dgRemovalSwell) / dgMachineRate) * 8 + (n(r.sf) / dgCoverageSfDay) * 8 + tons
      dgLab += baseHrs + (cement ? tons * dgCementLaborFactor : 0)
      dgMat +=
        (tons * dgt.fallback +
          (cement
            ? tons * p(GT_RATES.dgCementPerTon.dbName, GT_RATES.dgCementPerTon.fallback)
            : 0)) *
        dgMaterialMarkup
      if (r.weedFabric === 'Yes') {
        dgMat += n(r.sf) * p(GT_RATES.gravelFabricMat.dbName, GT_RATES.gravelFabricMat.fallback)
        dgLab += n(r.sf) * p(GT_RATES.gravelFabricLab.dbName, GT_RATES.gravelFabricLab.fallback)
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
    const machineRate = p(GT_RATES.gravelMachineLab.dbName, GT_RATES.gravelMachineLab.fallback)
    const handRate = p(GT_RATES.gravelHandLab.dbName, GT_RATES.gravelHandLab.fallback)
    const excavLab =
      r.method === 'Machine' ? ((CY * aggregateRemovalSwell) / machineRate) * 8 : ((CY * aggregateRemovalSwell) / handRate) * 8
    // Weed barrier — same fabric material + labor rate as DG's weed barrier.
    // Legacy rows (no weedFabric field) default to Yes so prior estimates that
    // always included fabric are unchanged.
    const wantFabric = (r.weedFabric ?? 'Yes') === 'Yes'
    const fabricLab = wantFabric
      ? n(r.sf) * p(GT_RATES.gravelFabricLab.dbName, GT_RATES.gravelFabricLab.fallback)
      : 0
    gravelLab += excavLab + fabricLab
    const gtype = rowOpt('Gravel', r, [])
    const costPerCY = gtype.fallback
    gravelMat +=
      CY * costPerCY +
      (wantFabric ? n(r.sf) * p(GT_RATES.gravelFabricMat.dbName, GT_RATES.gravelFabricMat.fallback) : 0)
  })

  // ── Pebble rows (same calc/labor as Gravel; PEBBLE_TYPES material) ──────────
  let pebbleLab = 0,
    pebbleMat = 0
  ;(pebbleRows || []).forEach(r => {
    if (!n(r.sf)) return
    if (!r.type) return
    const CY = (n(r.sf) * (n(r.depthIn) / 12)) / 27
    const machineRate = p(GT_RATES.gravelMachineLab.dbName, GT_RATES.gravelMachineLab.fallback)
    const handRate = p(GT_RATES.gravelHandLab.dbName, GT_RATES.gravelHandLab.fallback)
    const excavLab =
      r.method === 'Machine' ? ((CY * aggregateRemovalSwell) / machineRate) * 8 : ((CY * aggregateRemovalSwell) / handRate) * 8
    // Weed barrier — same fabric material + labor rate as DG's weed barrier.
    const wantFabric = (r.weedFabric ?? 'Yes') === 'Yes'
    const fabricLab = wantFabric
      ? n(r.sf) * p(GT_RATES.gravelFabricLab.dbName, GT_RATES.gravelFabricLab.fallback)
      : 0
    pebbleLab += excavLab + fabricLab
    const ptype = rowOpt('Pebble', r, [])
    const costPerCY = ptype.fallback
    pebbleMat +=
      CY * costPerCY +
      (wantFabric ? n(r.sf) * p(GT_RATES.gravelFabricMat.dbName, GT_RATES.gravelFabricMat.fallback) : 0)
  })

  // ── Cobbles & Boulders rows (same calc/labor as Gravel; COBBLE_TYPES) ───────
  let cobbleLab = 0,
    cobbleMat = 0
  ;(cobbleRows || []).forEach(r => {
    if (!n(r.sf)) return
    if (!r.type) return
    const CY = (n(r.sf) * (n(r.depthIn) / 12)) / 27
    const machineRate = p(GT_RATES.gravelMachineLab.dbName, GT_RATES.gravelMachineLab.fallback)
    const handRate = p(GT_RATES.gravelHandLab.dbName, GT_RATES.gravelHandLab.fallback)
    const excavLab =
      r.method === 'Machine' ? ((CY * aggregateRemovalSwell) / machineRate) * 8 : ((CY * aggregateRemovalSwell) / handRate) * 8
    const fabricLab =
      n(r.sf) * p(GT_RATES.gravelFabricLab.dbName, GT_RATES.gravelFabricLab.fallback)
    cobbleLab += excavLab + fabricLab
    const ctype = rowOpt('Cobbles', r, [])
    const costPerCY = ctype.fallback
    cobbleMat +=
      CY * costPerCY +
      n(r.sf) * p(GT_RATES.gravelFabricMat.dbName, GT_RATES.gravelFabricMat.fallback)
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
  const laborCost = totalHrs * lrph
  const burden = laborCost * (n(laborBurdenPct) || DEFAULTS.laborBurdenPct)
  const isSubTab = state.subType === 'Subcontractor'
  const subMarkup = n(state.subGpMarkupRate) || 0.2
  // On the Sub tab every section is a FLAT subcontractor unit rate sourced from
  // subcontractor_rates (via mp) — $/SF (or $/LF for edging), not hours+material.
  // (Soils is omitted — subcontractors bring their own soil.)
  const _sfSum = rows => (rows || []).reduce((a, r) => a + n(r.sf), 0)
  const _stepSubSF =
    n(flagstoneSoilSF) + n(flagstoneConcreteSF) + n(precastSoilSF) + n(precastConcreteSF)
  const sectionSubTotal =
    n(soilPrepSF) * p('Soil Prep Sub - $/SF', 0) +
    n(sodSF) * p('Sod Sub - $/SF', 0) +
    _sfSum(mulchRows) * p('Mulch Sub - $/SF', 0) +
    _sfSum(dgRows) * p('DG Sub - $/SF', 0) +
    _sfSum(gravelRows) * p('Gravel Sub - $/SF', 0) +
    _sfSum(pebbleRows) * p('Pebble Sub - $/SF', 0) +
    _sfSum(cobbleRows) * p('Cobbles Sub - $/SF', 0) +
    (n(plasticEdgingLF) + n(metalEdgingLF)) * p('Edging Sub - $/LF', 0) +
    _stepSubSF * p('Steppers Sub - $/SF', 0)
  let gp, subCost, subGp, commission, price
  if (isSubTab) {
    gp = 0
    subCost = sectionSubTotal + manSub // flat subcontractor unit rates
    subGp = subCost * subMarkup
    commission = subGp * DEFAULTS.commissionRate
    price = subCost + subGp + commission
  } else {
    gp = manDays * gpmd
    subCost = manSub
    subGp = 0
    commission = gp * DEFAULTS.commissionRate
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

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionHeader({ title }) {
  const isSub = useContext(SubTabContext)
  return (
    <div className="bg-gray-100 rounded-lg px-4 py-2.5 border border-gray-200 mb-2">
      <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">{subSectionTitle(title, isSub)}</h3>
    </div>
  )
}

function NumInput({ value, onChange, placeholder = '0', className = '' }) {
  return (
    <input
      type="number"
      step="any"
      className={`input text-sm py-1.5 ${className}`}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  )
}

function LabeledRow({ label, children, note }) {
  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-gray-100">
      <span className="text-xs text-gray-700 w-40 shrink-0">{label}</span>
      {children}
      {note && <span className="text-xs text-gray-400 shrink-0">{note}</span>}
    </div>
  )
}

// Per-section Vendor picker. "Standard" (default) keeps the hardcoded type list;
// selecting a vendor filters that section's Type dropdown to the vendor's
// products at the vendor's price (from material_rates).
function VendorPicker({ vendors = [], value = 'Standard', onChange, label = 'Vendor' }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-xs text-gray-500">{label}:</span>
      <select
        className="input text-sm py-1"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        <option value="Standard">Standard</option>
        {vendors.map(v => (
          <option key={v.id} value={v.id}>
            {v.name}
          </option>
        ))}
      </select>
    </span>
  )
}

const DEFAULT_GRAVEL_ROWS = [
  { sf: '', method: 'Hand', type: '', depthIn: '3', weedFabric: 'Yes', vendor: '' },
]
const DEFAULT_SOILS_ROWS = [
  { type: '', sf: '', depthIn: '2', vendor: '' },
]
const DEFAULT_PEBBLE_ROWS = [
  { sf: '', method: 'Hand', type: '', depthIn: '3', weedFabric: 'Yes', vendor: '' },
]
const DEFAULT_COBBLE_ROWS = [
  { sf: '', method: 'Hand', type: '', depthIn: '3', vendor: '' },
]
const DEFAULT_MULCH_ROWS = [
  { type: '', sf: '', depth: '2', weedFabric: 'No', vendor: '' },
]
const DEFAULT_DG_ROWS = [
  { type: '', sf: '', depth: '3.5', weedFabric: 'No', method: 'Machine', cement: 'No', vendor: '' },
]
const DEFAULT_MANUAL_ROWS = [{ label: '', hours: '', materials: '', subCost: '' }]
// Per-tab input record. In-House and Sub each hold their own independent copy so
// the two tabs are separate calculators. Shared fields (rates, vendors list,
// crewType, notes, walkAccess, subType) live on the component, not here.
function makeTab(src = {}) {
  return {
    difficulty: src.difficulty ?? '',
    hoursAdj: src.hoursAdj ?? '',
    distanceLF: src.distanceLF ?? '',
    // Mulch multi-row. Backward-compat: migrate a legacy single mulch entry.
    mulchRows:
      src.mulchRows ??
      (src.mulchSF != null && src.mulchSF !== ''
        ? [
            {
              type: src.mulchType || 'Premium Mulch',
              sf: src.mulchSF,
              depth: src.mulchDepth || '2',
              weedFabric: src.mulchWeedFabric || 'No',
            },
          ]
        : DEFAULT_MULCH_ROWS.map(r => ({ ...r }))),
    plasticEdgingLF: src.plasticEdgingLF ?? '',
    metalEdgingLF: src.metalEdgingLF ?? '',
    soilPrepSF: src.soilPrepSF ?? '',
    // Planter Preparation — Soils-style row (Vendor + soil/amendment Type + Area
    // (soilPrepSF) + Depth → CY × $/CY) plus a Tilling method (None/Hand/Tiller).
    prepVendor: src.prepVendor ?? '',
    prepType: src.prepType ?? '',
    prepDepthIn: src.prepDepthIn ?? '2',
    prepTilling: src.prepTilling ?? (src.prepMethod === 'Hand' ? 'Hand' : 'Tiller'),
    // Sod Preparation — independent Soils-style row using the sod-prep labor base.
    sodPrepSF: src.sodPrepSF ?? src.sodSoilPrepSF ?? '',
    sodPrepVendor: src.sodPrepVendor ?? '',
    sodPrepType: src.sodPrepType ?? '',
    sodPrepDepthIn: src.sodPrepDepthIn ?? '2',
    sodPrepTilling: src.sodPrepTilling ?? 'Tiller',
    // Legacy prep fields kept for backward-compat with saved estimates + summary.
    prepMethod: src.prepMethod ?? 'Tiller',
    prepArea: src.prepArea ?? 'Planter',
    sodSoilPrepSF: src.sodSoilPrepSF ?? '',
    sodSoilPrepVendor: src.sodSoilPrepVendor ?? 'Standard',
    sodSoilPrepType: src.sodSoilPrepType ?? 'Soil Prep',
    sodFertilizerSF: src.sodFertilizerSF ?? '',
    sodSF: src.sodSF ?? '',
    sodType: src.sodType ?? '',
    sodFertilizer: src.sodFertilizer ?? '',
    flagstoneSoilSF: src.flagstoneSoilSF ?? '',
    flagstoneConcreteSF: src.flagstoneConcreteSF ?? '',
    precastSoilSF: src.precastSoilSF ?? '',
    precastConcreteSF: src.precastConcreteSF ?? '',
    stepperVendor:
      src.stepperVendor ?? { flagSoil: '', flagConc: '', precSoil: '', precConc: '' },
    stepperType:
      src.stepperType ?? { flagSoil: '', flagConc: '', precSoil: '', precConc: '' },
    // Edging — single combined row (Vendor + Type + LF). Backward-compat: old
    // saved data stored maps for edgingVendor/edgingType; coerce to '' strings.
    edgingVendor: typeof src.edgingVendor === 'string' ? src.edgingVendor : '',
    edgingType: typeof src.edgingType === 'string' ? src.edgingType : '',
    edgingLF: src.edgingLF ?? '',
    // D.G. multi-row. Backward-compat: migrate a legacy single DG entry.
    dgRows:
      src.dgRows ??
      (src.dgSF != null && src.dgSF !== ''
        ? [
            {
              type: src.dgType || 'Decomposed Granite',
              sf: src.dgSF,
              depth: src.dgDepth || '3.5',
              weedFabric: src.dgWeedFabric || 'No',
              method: src.dgMethod || 'Machine',
              cement: src.dgCement || 'No',
            },
          ]
        : DEFAULT_DG_ROWS.map(r => ({ ...r }))),
    gravelRows: src.gravelRows ?? DEFAULT_GRAVEL_ROWS.map(r => ({ ...r })),
    soilsRows: src.soilsRows ?? DEFAULT_SOILS_ROWS.map(r => ({ ...r })),
    pebbleRows: src.pebbleRows ?? DEFAULT_PEBBLE_ROWS.map(r => ({ ...r })),
    cobbleRows: src.cobbleRows ?? DEFAULT_COBBLE_ROWS.map(r => ({ ...r })),
    manualRows: src.manualRows ?? DEFAULT_MANUAL_ROWS.map(r => ({ ...r })),
    sodVendor: src.sodVendor ?? '',
    sodFertilizerVendor: src.sodFertilizerVendor ?? '',
    // ── Multi-row sections. Each defaults to ONE row seeded from the legacy
    //    scalar fields so a saved estimate's single entry still shows. The old
    //    scalar fields above are kept (harmless) for backward-compat + Sub scope.
    planterPrepRows: src.planterPrepRows ?? [
      {
        area: src.soilPrepSF ?? '',
        vendor: src.prepVendor ?? '',
        type: src.prepType ?? '',
        depthIn: src.prepDepthIn ?? '2',
        tilling: src.prepTilling ?? (src.prepMethod === 'Hand' ? 'Hand' : 'Tiller'),
      },
    ],
    sodPrepRows: src.sodPrepRows ?? [
      {
        area: src.sodPrepSF ?? src.sodSoilPrepSF ?? '',
        vendor: src.sodPrepVendor ?? '',
        type: src.sodPrepType ?? '',
        depthIn: src.sodPrepDepthIn ?? '2',
        tilling: src.sodPrepTilling ?? 'Tiller',
      },
    ],
    sodRows: src.sodRows ?? [
      { vendor: src.sodVendor ?? '', type: src.sodType ?? '', sf: src.sodSF ?? '' },
    ],
    sodFertRows: src.sodFertRows ?? [
      {
        vendor: src.sodFertilizerVendor ?? '',
        fertilizer: src.sodFertilizer ?? '',
        sf: src.sodFertilizerSF ?? '',
      },
    ],
  }
}

// ── Main component ────────────────────────────────────────────────────────────
export default function GroundTreatmentsModule({ onSave, onBack, saving, initialData }) {
  const [laborRatePerHour, setLaborRatePerHour] = useState(
    initialData?.laborRatePerHour ?? DEFAULTS.laborRatePerHour
  )
  const [laborBurdenPct, setLaborBurdenPct] = useState(
    initialData?.laborBurdenPct ?? DEFAULTS.laborBurdenPct
  )

  // Free-text notes for this module — Sam writes auto-generated
  // takeoffs here via create_estimate_from_takeoff, and the user can
  // overwrite / append their own.
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [walkAccess, setWalkAccess] = useState(
    initialData?.walkAccess ?? {
      paceLfPerMin: DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN,
    }
  )
  const [materialPrices, setMaterialPrices] = useState(initialData?.materialPrices ?? {})
  const [pricesLoading, setPricesLoading] = useState(!initialData?.materialPrices)
  // Full material_rates rows (name/unit_cost/sub_category/vendor_id) — used to build
  // vendor-filtered Type option lists. Vendors list (id/company_name) for pickers.
  const [materialRows, setMaterialRows] = useState([])
  const [vendors, setVendors] = useState([])

  // Load the full material rows + vendors used to build vendor-filtered Type
  // lists. Kept separate so it can run even when a saved estimate supplies a
  // materialPrices snapshot (so the vendor pickers still work on re-edit).
  const loadVendorData = useCallback(async () => {
    const [gtRows, venRes] = await Promise.all([
      fetchGtRows(),
      supabase.from('subs_vendors').select('id, company_name').eq('type', 'vendor').order('company_name'),
    ])
    setMaterialRows(gtRows || [])
    setVendors(
      (venRes.data || []).map(v => ({
        id: v.id,
        name: v.company_name,
      }))
    )
  }, [])

  // Re-fetch the merged labor+material rate map. Called on mount and after any
  // RateEditPopover save so the calc reflects edits. Also refreshes the full
  // material rows + vendors that drive the vendor-filtered Type lists.
  const refreshAllRates = useCallback(async () => {
    // Fully off material_rates: mp is built from labor_rates (labor), misc_rates
    // (fees), and the new catalog's Standard material prices (by clean name).
    // Material option prices also come through the picker options from fetchGtRows.
    const [labRes, feeRes, subRes, gtRows, venRes] = await Promise.all([
      supabase.from('labor_rates').select('name, rate').eq('category', 'Ground Treatments'),
      supabase.from('misc_rates').select('name, rate').eq('category', 'Ground Treatments'),
      supabase.from('subcontractor_rates').select('company_name, rate').eq('category', 'Ground Treatments'),
      fetchGtRows(),
      supabase.from('subs_vendors').select('id, company_name').eq('type', 'vendor').order('company_name'),
    ])
    const prices = {}
    // Standard (null-vendor) material prices, keyed by clean description
    ;(gtRows || []).forEach(r => {
      if (r.vendor_id == null && r.name) prices[r.name] = parseFloat(r.unit_cost) || 0
    })
    ;(labRes.data || []).forEach(r => {
      prices[r.name] = parseFloat(r.rate) || 0
    })
    ;(feeRes.data || []).forEach(r => {
      prices[r.name] = parseFloat(r.rate) || 0
    })
    ;(subRes.data || []).forEach(r => {
      prices[r.company_name] = parseFloat(r.rate) || 0
    })
    setMaterialPrices(prices)
    setMaterialRows(gtRows || [])
    setVendors(
      (venRes.data || []).map(v => ({
        id: v.id,
        name: v.company_name,
      }))
    )
  }, [])

  useEffect(() => {
    if (!initialData?.laborRatePerHour) {
      supabase
        .from('company_settings')
        .select('labor_rate_per_hour, labor_burden_pct, walk_access_pace_lf_per_min')
        .single()
        .then(({ data }) => {
          if (!data) return
          if (data.labor_rate_per_hour != null)
            setLaborRatePerHour(parseFloat(data.labor_rate_per_hour) || DEFAULTS.laborRatePerHour)
          if (data.labor_burden_pct != null)
            setLaborBurdenPct(parseFloat(data.labor_burden_pct))
          if (data.walk_access_pace_lf_per_min != null) {
            const _wpace = parseFloat(data.walk_access_pace_lf_per_min)
            setWalkAccess({
              paceLfPerMin:
                Number.isFinite(_wpace) && _wpace > 0
                  ? _wpace
                  : DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN,
            })
          }
        })
    }
    if (initialData?.materialPrices) {
      // Saved estimate: keep the price snapshot, but still load vendors + rows
      // so the per-section vendor pickers work on re-edit.
      loadVendorData()
      return
    }
    refreshAllRates().then(() => setPricesLoading(false))
  }, [refreshAllRates, loadVendorData])

  const gpmd = initialData?.gpmd ?? DEFAULTS.gpmd
  const subGpMarkupRate = initialData?.subGpMarkupRate ?? 0.2

  // ── State ──────────────────────────────────────────────────────────────────
  const [crewType, setCrewType] = useState(initialData?.crewType ?? 'Landscape')
  const [subType, setSubType] = useState(initialData?.subType ?? 'In-House')

  // Independent In-House vs Sub input records — each tab is its own calculator.
  const [ihTab, setIhTab] = useState(() => makeTab(initialData?.ihData || initialData))
  const [subTab, setSubTab] = useState(() => makeTab(initialData?.subData || {}))
  const isSub = subType === 'Subcontractor'
  const cur = isSub ? subTab : ihTab
  const setCur = isSub ? setSubTab : setIhTab
  // Single setter factory: accepts a value (scalar fields) or an updater fn (rows).
  const setField = k => v =>
    setCur(p => ({ ...p, [k]: typeof v === 'function' ? v(p[k]) : v }))
  // Derived active-tab accessors — render bindings below stay unchanged.
  const difficulty = cur.difficulty
  const setDifficulty = setField('difficulty')
  const hoursAdj = cur.hoursAdj
  const setHoursAdj = setField('hoursAdj')
  const distanceLF = cur.distanceLF
  const setDistanceLF = setField('distanceLF')
  const mulchRows = cur.mulchRows
  const setMulchRows = setField('mulchRows')
  const plasticEdgingLF = cur.plasticEdgingLF
  const setPlasticEdgingLF = setField('plasticEdgingLF')
  const metalEdgingLF = cur.metalEdgingLF
  const setMetalEdgingLF = setField('metalEdgingLF')
  const soilPrepSF = cur.soilPrepSF
  const setSoilPrepSF = setField('soilPrepSF')
  // Planter Preparation row accessors
  const prepVendor = cur.prepVendor
  const setPrepVendor = setField('prepVendor')
  const prepType = cur.prepType
  const setPrepType = setField('prepType')
  const prepDepthIn = cur.prepDepthIn
  const setPrepDepthIn = setField('prepDepthIn')
  const prepTilling = cur.prepTilling
  const setPrepTilling = setField('prepTilling')
  // Sod Preparation row accessors
  const sodPrepSF = cur.sodPrepSF
  const setSodPrepSF = setField('sodPrepSF')
  const sodPrepVendor = cur.sodPrepVendor
  const setSodPrepVendor = setField('sodPrepVendor')
  const sodPrepType = cur.sodPrepType
  const setSodPrepType = setField('sodPrepType')
  const sodPrepDepthIn = cur.sodPrepDepthIn
  const setSodPrepDepthIn = setField('sodPrepDepthIn')
  const sodPrepTilling = cur.sodPrepTilling
  const setSodPrepTilling = setField('sodPrepTilling')
  const prepMethod = cur.prepMethod
  const setPrepMethod = setField('prepMethod')
  const prepArea = cur.prepArea
  const setPrepArea = setField('prepArea')
  const sodSoilPrepSF = cur.sodSoilPrepSF
  const setSodSoilPrepSF = setField('sodSoilPrepSF')
  const sodSoilPrepVendor = cur.sodSoilPrepVendor
  const setSodSoilPrepVendor = setField('sodSoilPrepVendor')
  const sodSoilPrepType = cur.sodSoilPrepType
  const setSodSoilPrepType = setField('sodSoilPrepType')
  const sodFertilizerSF = cur.sodFertilizerSF
  const setSodFertilizerSF = setField('sodFertilizerSF')
  const sodSF = cur.sodSF
  const setSodSF = setField('sodSF')
  const sodType = cur.sodType
  const setSodType = setField('sodType')
  const sodFertilizer = cur.sodFertilizer
  const setSodFertilizer = setField('sodFertilizer')
  const flagstoneSoilSF = cur.flagstoneSoilSF
  const setFlagstoneSoilSF = setField('flagstoneSoilSF')
  const flagstoneConcreteSF = cur.flagstoneConcreteSF
  const setFlagstoneConcreteSF = setField('flagstoneConcreteSF')
  const precastSoilSF = cur.precastSoilSF
  const setPrecastSoilSF = setField('precastSoilSF')
  const precastConcreteSF = cur.precastConcreteSF
  const setPrecastConcreteSF = setField('precastConcreteSF')
  const stepperVendor = cur.stepperVendor
  const setStepperVendor = setField('stepperVendor')
  const stepperType = cur.stepperType
  const setStepperType = setField('stepperType')
  const edgingVendor = cur.edgingVendor
  const setEdgingVendor = setField('edgingVendor')
  const edgingType = cur.edgingType
  const setEdgingType = setField('edgingType')
  const edgingLF = cur.edgingLF
  const setEdgingLF = setField('edgingLF')
  const dgRows = cur.dgRows
  const setDgRows = setField('dgRows')
  const gravelRows = cur.gravelRows
  const setGravelRows = setField('gravelRows')
  const soilsRows = cur.soilsRows
  const setSoilsRows = setField('soilsRows')
  const pebbleRows = cur.pebbleRows
  const setPebbleRows = setField('pebbleRows')
  const cobbleRows = cur.cobbleRows
  const setCobbleRows = setField('cobbleRows')
  const manualRows = cur.manualRows
  const setManualRows = setField('manualRows')
  const sodVendor = cur.sodVendor
  const setSodVendor = setField('sodVendor')
  const sodFertilizerVendor = cur.sodFertilizerVendor
  const setSodFertilizerVendor = setField('sodFertilizerVendor')
  // Multi-row section accessors (mirror mulchRows).
  const planterPrepRows = cur.planterPrepRows
  const setPlanterPrepRows = setField('planterPrepRows')
  const sodPrepRows = cur.sodPrepRows
  const setSodPrepRows = setField('sodPrepRows')
  const sodRows = cur.sodRows
  const setSodRows = setField('sodRows')
  const sodFertRows = cur.sodFertRows
  const setSodFertRows = setField('sodFertRows')

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

  // materialRows (live catalog) intentionally NOT persisted — fetched fresh on open.
  const state = { crewType, subType, subGpMarkupRate, ...cur }

  // Build a section's Type option list. Vendor-first: a real vendor -> that vendor's catalog Items; Standard/unset -> the Standard (null-vendor) catalog Items.
  // A vendor → that vendor's products for the section's sub_category, priced at
  // the vendor's unit_cost. Falls back to the Standard array if the vendor has no
  // rows for the sub_category (so the dropdown is never empty).
  function sectionOptions(subcat, vendorSel, houseArray) {
    // Unset vendor → empty Type list (only the row's own "Select …" placeholder);
    // pick a vendor first. Explicit 'Standard' still yields the Standard catalog.
    if (!vendorSel) return []
    if (vendorSel === 'Standard') return mergedGtOpts(subcat, houseArray, materialRows)
    const opts = catalogOptions(materialRows, subcat, vendorSel, { standardRows: 'exclude', stripPrefix: true })
    // Table-driven: a vendor with no catalog rows for this sub-category shows an
    // empty list (no hardcoded fallback).
    return opts.map(o => ({ label: o.label || o.row.name, dbName: o.row.name, fallback: n(o.row.unit_cost), id: o.row.id }))
  }

  // Vendors that supply a given material category — drives the per-row vendor
  // dropdowns so each row only offers vendors that carry that category.
  const vendorsForCategory = cat => vendors.filter(v => materialRows.some(r => r.vendor_id === v.id && (r.sub_category === cat || r.category === cat)))
  // First real vendor supplying a category (else 'Standard').
  const defaultVendorFor = cat => vendorsForCategory(cat)[0]?.id || 'Standard'

  // Product ids for the two FIXED (non-picker) material rates, resolved from the
  // new catalog so their inline pencils can edit material_price directly.
  const gravelFabricId = (materialRows.find(r => r.vendor_id == null && r.name === 'Gravel Fabric') || {}).id
  const dgCementId = (materialRows.find(r => r.vendor_id == null && r.sub_category === 'DG' && /cement/i.test(r.name || '')) || {}).id
  const soilPrepId = (materialRows.find(r => r.vendor_id == null && r.sub_category === 'Soil Prep') || {}).id

  // Per-row/section Vendor pickers now default to an empty "Select vendor"
  // placeholder (unset → empty Type list + $0 row). No auto-resolve of unset →
  // default vendor: the user picks the vendor first, then the Type list populates.

  const sodOpts = sectionOptions('Sod', sodVendor, [])
  const soilPrepOpts = sectionOptions('Soil Prep', sodSoilPrepVendor, SOIL_PREP_TYPES)

  const calcRaw = calcGroundTreatments(
    state,
    laborRatePerHour,
    materialPrices,
    gpmd,
    walkAccess,
    laborBurdenPct,
    { sod: sodOpts },
    materialRows
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

  const p = (dbName, fallback) => materialPrices[dbName] ?? fallback

  function updateSoils(i, field, val) {
    setSoilsRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }
  function updateGravel(i, field, val) {
    setGravelRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }
  function updatePebble(i, field, val) {
    setPebbleRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }
  function updateCobble(i, field, val) {
    setCobbleRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }
  function updateMulch(i, field, val) {
    setMulchRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }
  function updateDg(i, field, val) {
    setDgRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }
  function updatePlanterPrep(i, field, val) {
    setPlanterPrepRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }
  function updateSodPrep(i, field, val) {
    setSodPrepRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }
  function updateSodRow(i, field, val) {
    setSodRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }
  function updateSodFert(i, field, val) {
    setSodFertRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }
  function updateManual(i, field, val) {
    setManualRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }

  // Changing a ROW's vendor swaps that row's product list, so reset the row's
  // type to the first option of the new (vendor-filtered) list.
  function changeRowVendor(cat, houseArray, updateFn, i, v) {
    updateFn(i, 'vendor', v)
    const first = sectionOptions(cat, v, houseArray)[0]?.label
    if (first) updateFn(i, 'type', first)
  }
  function changeSodVendor(v) {
    setSodVendor(v)
    const first = sectionOptions('Sod', v, [])[0]?.label
    if (first) setSodType(first)
  }

  function handleSave() {
    onSave({
      notes,
      man_days: parseFloat(calc.manDays.toFixed(2)),
      material_cost: parseFloat(calc.totalMat.toFixed(2)),
      data: { ...state, ihData: ihTab, subData: subTab, walkAccess, laborRatePerHour, laborBurdenPct, gpmd, materialPrices, calc },
    })
  }

  // ── Grouped rate list for the "View Rates" popup (CrewTypeBar). Every labor
  //    coefficient + misc/subcontractor rate that used to have an inline
  //    RateEditPopover in this module now lives here. Per-type material prices
  //    are catalog products (material_price) — edit those in Master Material Rates.
  const groundTreatmentsRateList = [
    {
      group: 'Preparation',
      items: [
        {
          label: 'Soil Prep - Labor Rate',
          table: 'labor_rates',
          name: GT_RATES.soilPrepLab.dbName,
          category: 'Ground Treatments',
          mode: 'coefficient',
          unitLabel: 'hrs/SF',
          value: p(GT_RATES.soilPrepLab.dbName, GT_RATES.soilPrepLab.fallback),
        },
        {
          label: 'Sod Soil Prep - Labor Rate',
          table: 'labor_rates',
          name: GT_RATES.sodPrepLab.dbName,
          category: 'Ground Treatments',
          mode: 'coefficient',
          unitLabel: 'hrs/SF',
          value: p(GT_RATES.sodPrepLab.dbName, GT_RATES.sodPrepLab.fallback),
        },
        {
          label: 'Soil Prep - Hand Add',
          table: 'labor_rates',
          name: GT_RATES.soilPrepHandAdd.dbName,
          category: 'Ground Treatments',
          mode: 'coefficient',
          unitLabel: 'hrs/SF',
          value: p(GT_RATES.soilPrepHandAdd.dbName, GT_RATES.soilPrepHandAdd.fallback),
        },
        {
          label: 'Tilling - Hand Labor Rate',
          table: 'labor_rates',
          name: GT_RATES.tillHandLab.dbName,
          category: 'Ground Treatments',
          mode: 'coefficient',
          unitLabel: 'hrs/SF',
          value: p(GT_RATES.tillHandLab.dbName, GT_RATES.tillHandLab.fallback),
        },
        {
          label: 'Tilling - Tiller Labor Rate',
          table: 'labor_rates',
          name: GT_RATES.tillTillerLab.dbName,
          category: 'Ground Treatments',
          mode: 'coefficient',
          unitLabel: 'hrs/SF',
          value: p(GT_RATES.tillTillerLab.dbName, GT_RATES.tillTillerLab.fallback),
        },
      ],
    },
    {
      group: 'Sod',
      items: [
        {
          label: 'Sod - Labor Rate',
          table: 'labor_rates',
          name: GT_RATES.sodLab.dbName,
          category: 'Ground Treatments',
          mode: 'coefficient',
          unitLabel: 'hrs/SF',
          value: p(GT_RATES.sodLab.dbName, GT_RATES.sodLab.fallback),
        },
        {
          label: 'Fertilizer - SF Per Bag',
          table: 'labor_rates',
          name: GT_RATES.fertilizerSFPerBag.dbName,
          category: 'Ground Treatments',
          mode: 'coefficient',
          unitLabel: 'SF/bag',
          value: p(GT_RATES.fertilizerSFPerBag.dbName, GT_RATES.fertilizerSFPerBag.fallback),
        },
      ],
    },
    {
      group: 'Soils',
      items: [
        {
          label: 'Soils Install - Labor Rate',
          table: 'labor_rates',
          name: 'Soils Install Labor',
          category: 'Ground Treatments',
          mode: 'coefficient',
          unitLabel: 'hrs/SF-in',
          value: p('Soils Install Labor', 0.002),
        },
      ],
    },
    {
      group: 'Mulch',
      items: [
        {
          label: 'Mulch - Labor Rate',
          table: 'labor_rates',
          name: GT_RATES.mulchLab.dbName,
          category: 'Ground Treatments',
          mode: 'coefficient',
          unitLabel: 'CY/day',
          value: p(GT_RATES.mulchLab.dbName, GT_RATES.mulchLab.fallback),
        },
        {
          label: 'Mulch Delivery Fee',
          table: 'misc_rates',
          name: GT_RATES.mulchDelivery.dbName,
          category: 'Ground Treatments',
          mode: 'currency',
          unitLabel: 'flat',
          value: p(GT_RATES.mulchDelivery.dbName, GT_RATES.mulchDelivery.fallback),
        },
        {
          label: 'Mulch Coverage SF/Day',
          table: 'labor_rates',
          name: 'GT - Mulch Coverage SF/Day',
          category: 'Ground Treatments',
          mode: 'coefficient',
          unitLabel: 'SF/day',
          value: p('GT - Mulch Coverage SF/Day', 3200),
        },
      ],
    },
    {
      group: 'Weed Fabric',
      items: [
        {
          label: 'Gravel Fabric - Labor Rate',
          table: 'labor_rates',
          name: GT_RATES.gravelFabricLab.dbName,
          category: 'Ground Treatments',
          mode: 'coefficient',
          unitLabel: 'hrs/SF',
          value: p(GT_RATES.gravelFabricLab.dbName, GT_RATES.gravelFabricLab.fallback),
        },
      ],
    },
    {
      group: 'Decomposed Granite',
      items: [
        {
          label: 'DG - Hand Labor Rate',
          table: 'labor_rates',
          name: GT_RATES.dgHandLab.dbName,
          category: 'Ground Treatments',
          mode: 'coefficient',
          unitLabel: 'CY/hr',
          value: p(GT_RATES.dgHandLab.dbName, GT_RATES.dgHandLab.fallback),
        },
        {
          label: 'DG - Machine Labor Rate',
          table: 'labor_rates',
          name: GT_RATES.dgMachineLab.dbName,
          category: 'Ground Treatments',
          mode: 'coefficient',
          unitLabel: 'CY/day',
          value: p(GT_RATES.dgMachineLab.dbName, GT_RATES.dgMachineLab.fallback),
        },
        {
          label: 'DG - Tons Denominator',
          table: 'labor_rates',
          name: 'GT - DG Tons Denominator',
          category: 'Ground Treatments',
          mode: 'coefficient',
          unitLabel: 'SF-in/ton',
          value: p('GT - DG Tons Denominator', 200),
        },
        {
          label: 'DG - Removal Swell',
          table: 'labor_rates',
          name: 'GT - DG Removal Swell',
          category: 'Ground Treatments',
          mode: 'coefficient',
          unitLabel: '×',
          value: p('GT - DG Removal Swell', 1.62),
        },
        {
          label: 'DG - Cleanup Coverage SF/Day',
          table: 'labor_rates',
          name: 'GT - DG Cleanup Coverage SF/Day',
          category: 'Ground Treatments',
          mode: 'coefficient',
          unitLabel: 'SF/day',
          value: p('GT - DG Cleanup Coverage SF/Day', 1000),
        },
        {
          label: 'DG - Cement Labor Factor',
          table: 'labor_rates',
          name: 'GT - DG Cement Labor Factor',
          category: 'Ground Treatments',
          mode: 'coefficient',
          unitLabel: 'hrs/ton',
          value: p('GT - DG Cement Labor Factor', 1.25),
        },
        {
          label: 'DG - Material Markup',
          table: 'labor_rates',
          name: 'GT - DG Material Markup',
          category: 'Ground Treatments',
          mode: 'coefficient',
          unitLabel: '×',
          value: p('GT - DG Material Markup', 1.1),
        },
      ],
    },
    {
      group: 'Gravel / Pebble / Cobbles',
      items: [
        {
          label: 'Gravel - Machine Labor Rate',
          table: 'labor_rates',
          name: GT_RATES.gravelMachineLab.dbName,
          category: 'Ground Treatments',
          mode: 'coefficient',
          unitLabel: 'CY/day',
          value: p(GT_RATES.gravelMachineLab.dbName, GT_RATES.gravelMachineLab.fallback),
        },
        {
          label: 'Gravel - Hand Labor Rate',
          table: 'labor_rates',
          name: GT_RATES.gravelHandLab.dbName,
          category: 'Ground Treatments',
          mode: 'coefficient',
          unitLabel: 'CY/day',
          value: p(GT_RATES.gravelHandLab.dbName, GT_RATES.gravelHandLab.fallback),
        },
        {
          label: 'Aggregate - Removal Swell',
          table: 'labor_rates',
          name: 'GT - Aggregate Removal Swell',
          category: 'Ground Treatments',
          mode: 'coefficient',
          unitLabel: '×',
          value: p('GT - Aggregate Removal Swell', 1.62),
        },
      ],
    },
    {
      group: 'Edging',
      items: [
        {
          label: 'Plastic Edging - Labor Rate',
          table: 'labor_rates',
          name: GT_RATES.plasticEdgingLab.dbName,
          category: 'Ground Treatments',
          mode: 'coefficient',
          unitLabel: 'hrs/LF',
          value: p(GT_RATES.plasticEdgingLab.dbName, GT_RATES.plasticEdgingLab.fallback),
        },
        {
          label: 'Metal Edging - Labor Rate',
          table: 'labor_rates',
          name: GT_RATES.metalEdgingLab.dbName,
          category: 'Ground Treatments',
          mode: 'coefficient',
          unitLabel: 'hrs/LF',
          value: p(GT_RATES.metalEdgingLab.dbName, GT_RATES.metalEdgingLab.fallback),
        },
      ],
    },
    {
      group: 'Steppers',
      items: [
        {
          label: 'Flagstone Steppers - Soil Labor',
          table: 'labor_rates',
          name: GT_RATES.flagstoneSoilLab.dbName,
          category: 'Ground Treatments',
          mode: 'coefficient',
          unitLabel: 'SF/day',
          value: p(GT_RATES.flagstoneSoilLab.dbName, GT_RATES.flagstoneSoilLab.fallback),
        },
        {
          label: 'Flagstone Steppers - Concrete Labor',
          table: 'labor_rates',
          name: GT_RATES.flagstoneConcreteLab.dbName,
          category: 'Ground Treatments',
          mode: 'coefficient',
          unitLabel: 'SF/day',
          value: p(GT_RATES.flagstoneConcreteLab.dbName, GT_RATES.flagstoneConcreteLab.fallback),
        },
        {
          label: 'Precast Steppers - Soil Labor',
          table: 'labor_rates',
          name: GT_RATES.precastSoilLab.dbName,
          category: 'Ground Treatments',
          mode: 'coefficient',
          unitLabel: 'SF/day',
          value: p(GT_RATES.precastSoilLab.dbName, GT_RATES.precastSoilLab.fallback),
        },
        {
          label: 'Precast Steppers - Concrete Labor',
          table: 'labor_rates',
          name: GT_RATES.precastConcreteLab.dbName,
          category: 'Ground Treatments',
          mode: 'coefficient',
          unitLabel: 'SF/day',
          value: p(GT_RATES.precastConcreteLab.dbName, GT_RATES.precastConcreteLab.fallback),
        },
        {
          label: 'Steppers - SF Per Ton',
          table: 'labor_rates',
          name: 'GT - Steppers SF Per Ton',
          category: 'Ground Treatments',
          mode: 'coefficient',
          unitLabel: 'SF/ton',
          value: p('GT - Steppers SF Per Ton', 80),
        },
      ],
    },
    {
      group: 'Subcontractor',
      items: [
        {
          label: 'Soil Prep Sub - $/SF',
          table: 'subcontractor_rates',
          name: 'Soil Prep Sub - $/SF',
          category: 'Ground Treatments',
          mode: 'currency',
          unitLabel: 'SF',
          value: p('Soil Prep Sub - $/SF', 0),
        },
        {
          label: 'Sod Sub - $/SF',
          table: 'subcontractor_rates',
          name: 'Sod Sub - $/SF',
          category: 'Ground Treatments',
          mode: 'currency',
          unitLabel: 'SF',
          value: p('Sod Sub - $/SF', 0),
        },
        {
          label: 'Mulch Sub - $/SF',
          table: 'subcontractor_rates',
          name: 'Mulch Sub - $/SF',
          category: 'Ground Treatments',
          mode: 'currency',
          unitLabel: 'SF',
          value: p('Mulch Sub - $/SF', 0),
        },
        {
          label: 'DG Sub - $/SF',
          table: 'subcontractor_rates',
          name: 'DG Sub - $/SF',
          category: 'Ground Treatments',
          mode: 'currency',
          unitLabel: 'SF',
          value: p('DG Sub - $/SF', 0),
        },
        {
          label: 'Gravel Sub - $/SF',
          table: 'subcontractor_rates',
          name: 'Gravel Sub - $/SF',
          category: 'Ground Treatments',
          mode: 'currency',
          unitLabel: 'SF',
          value: p('Gravel Sub - $/SF', 0),
        },
        {
          label: 'Pebble Sub - $/SF',
          table: 'subcontractor_rates',
          name: 'Pebble Sub - $/SF',
          category: 'Ground Treatments',
          mode: 'currency',
          unitLabel: 'SF',
          value: p('Pebble Sub - $/SF', 0),
        },
        {
          label: 'Cobbles Sub - $/SF',
          table: 'subcontractor_rates',
          name: 'Cobbles Sub - $/SF',
          category: 'Ground Treatments',
          mode: 'currency',
          unitLabel: 'SF',
          value: p('Cobbles Sub - $/SF', 0),
        },
        {
          label: 'Edging Sub - $/LF',
          table: 'subcontractor_rates',
          name: 'Edging Sub - $/LF',
          category: 'Ground Treatments',
          mode: 'currency',
          unitLabel: 'LF',
          value: p('Edging Sub - $/LF', 0),
        },
        {
          label: 'Steppers Sub - $/SF',
          table: 'subcontractor_rates',
          name: 'Steppers Sub - $/SF',
          category: 'Ground Treatments',
          mode: 'currency',
          unitLabel: 'SF',
          value: p('Steppers Sub - $/SF', 0),
        },
      ],
    },
  ]

  return (
    <SubTabContext.Provider value={isSub}>
    <div className="space-y-5">
      {/* ── Frozen header: GPMD bar + Crew Type / View Rates bar ── */}
      <div className="sticky top-0 z-20 -mx-6 bg-white shadow-md">
        <div className="px-6 pt-1 pb-1 bg-gray-900">
          <GpmdBar
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
            variant={isSub ? 'sub' : 'inhouse'}
          />
        </div>
        <div className="px-6 py-2">
          <CrewTypeBar
            crewType={crewType}
            onCrewTypeChange={setCrewType}
            title="Ground Treatments"
            rates={groundTreatmentsRateList}
            refreshAllRates={refreshAllRates}
            showInlineToggle={false}
          />
        </div>
      </div>

      <ModuleHeaderSlot>
        <WorkTypeChooser value={subType || 'In-House'} onChange={setSubType} compact />
      </ModuleHeaderSlot>

      {pricesLoading && (
        <div className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
          Loading material prices from Master Rates…
        </div>
      )}

      {/* Settings — Job Site Conditions is In-House only (hidden on Sub tab) */}
      {subType !== 'Subcontractor' && (
        <>
      <SectionHeader title="Job Site Conditions" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Difficulty (%)</p>
          <NumInput value={difficulty} onChange={setDifficulty} placeholder="0" />
        </div>
        <div>
          <p
            className="text-xs text-gray-500 mb-0.5"
            title="Average Distance from Truck to Work Area"
          >
            Truck → Work Area (Avg LF)
          </p>
          <NumInput value={distanceLF} onChange={setDistanceLF} placeholder="0" />
          {calc.walkHrs > 0 && (
            <p className="text-[10px] text-gray-500 italic lowercase mt-0.5">
              +{calc.walkHrs.toFixed(2)} hrs walk-access
            </p>
          )}
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Hours Adj (±hrs)</p>
          <NumInput value={hoursAdj} onChange={setHoursAdj} placeholder="0" />
        </div>
      </div>
        </>
      )}

      {/* ── Subcontractor Scope (Sub tab only) — flat unit rates ── */}
      {isSub &&
        (() => {
          const _r = nm => n(materialPrices[nm]) || 0
          const _money = v =>
            v > 0 ? `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'
          const _pencil = (nm, unit) => (
            <span className="text-[11px] text-gray-400 inline-flex items-center whitespace-nowrap">
              ${_r(nm).toFixed(2)}/{unit}
            </span>
          )
          const _multi = (title, rows, setRows, subcat, nm) => {
            const rt = _r(nm)
            return (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-xs font-bold text-gray-600 uppercase flex-1">{title}</h4>
                  {_pencil(nm, 'SF')}
                </div>
                {(rows || []).map((row, i) => {
                  // Sub scope has no per-row vendor picker; show the Standard
                  // catalog when unset so the (informational) Type list is usable.
                  const opts = sectionOptions(subcat, row.vendor || 'Standard', [])
                  const t = resolveType(row.type, opts, [])
                  return (
                    <div key={i} className="flex items-center gap-2 mb-1">
                      <select
                        className="input text-sm py-1 flex-1 min-w-0"
                        value={row.type || ''}
                        onChange={e =>
                          setRows(rs => rs.map((rr, idx) => (idx === i ? { ...rr, type: e.target.value } : rr)))
                        }
                      >
                        {!row.type && <option value="">Select material</option>}
                        {row.type && !opts.some(o => o.label === row.type) && (
                          <option value={row.type}>{row.type}</option>
                        )}
                        {opts.map(o => (
                          <option key={o.label} value={o.label}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <NumInput
                        value={row.sf}
                        onChange={v => setRows(rs => rs.map((rr, idx) => (idx === i ? { ...rr, sf: v } : rr)))}
                        placeholder="SF"
                        className="w-24"
                      />
                      <span className="text-xs text-gray-600 w-20 text-right">{_money(n(row.sf) * rt)}</span>
                    </div>
                  )
                })}
              </div>
            )
          }
          return (
            <div className="border border-gray-200 rounded-xl p-4 bg-white">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Subcontractor Scope — flat rates</h3>

              {/* Preparation */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-bold text-gray-600 uppercase flex-1">Preparation</span>
                <NumInput value={soilPrepSF} onChange={setSoilPrepSF} placeholder="SF" className="w-24" />
                {_pencil('Soil Prep Sub - $/SF', 'SF')}
                <span className="text-xs text-gray-600 w-20 text-right">
                  {_money(n(soilPrepSF) * _r('Soil Prep Sub - $/SF'))}
                </span>
              </div>

              {/* Sod (material choice) */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-bold text-gray-600 uppercase">Sod</span>
                <select
                  className="input text-sm py-1 flex-1 min-w-0"
                  value={resolveType(sodType, sectionOptions('Sod', sodVendor || 'Standard', []), [])?.label || ''}
                  onChange={e => setSodType(e.target.value)}
                >
                  {sectionOptions('Sod', sodVendor || 'Standard', []).map(o => (
                    <option key={o.label} value={o.label}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <NumInput value={sodSF} onChange={setSodSF} placeholder="SF" className="w-24" />
                {_pencil('Sod Sub - $/SF', 'SF')}
                <span className="text-xs text-gray-600 w-20 text-right">
                  {_money(n(sodSF) * _r('Sod Sub - $/SF'))}
                </span>
              </div>

              {_multi('Mulch', mulchRows, setMulchRows, 'Mulch', 'Mulch Sub - $/SF')}
              {_multi('D.G.', dgRows, setDgRows, 'DG', 'DG Sub - $/SF')}
              {_multi('Gravel', gravelRows, setGravelRows, 'Gravel', 'Gravel Sub - $/SF')}
              {_multi('Pebble', pebbleRows, setPebbleRows, 'Pebble', 'Pebble Sub - $/SF')}
              {_multi('Cobbles & Boulders', cobbleRows, setCobbleRows, 'Cobbles', 'Cobbles Sub - $/SF')}

              {/* Edging (per LF) */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-xs font-bold text-gray-600 uppercase flex-1">Edging</h4>
                  {_pencil('Edging Sub - $/LF', 'LF')}
                </div>
                {[
                  ['Plastic (LF)', plasticEdgingLF, setPlasticEdgingLF],
                  ['Metal (LF)', metalEdgingLF, setMetalEdgingLF],
                ].map(([lbl, val, set]) => (
                  <div key={lbl} className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500 flex-1">{lbl}</span>
                    <NumInput value={val} onChange={set} placeholder="LF" className="w-24" />
                    <span className="text-xs text-gray-600 w-20 text-right">
                      {_money(n(val) * _r('Edging Sub - $/LF'))}
                    </span>
                  </div>
                ))}
              </div>

              {/* Steppers (per SF) */}
              <div className="mb-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-xs font-bold text-gray-600 uppercase flex-1">Steppers</h4>
                  {_pencil('Steppers Sub - $/SF', 'SF')}
                </div>
                {[
                  ['Flagstone — Soil Set', flagstoneSoilSF, setFlagstoneSoilSF],
                  ['Flagstone — Concrete Set', flagstoneConcreteSF, setFlagstoneConcreteSF],
                  ['Precast — Soil Set', precastSoilSF, setPrecastSoilSF],
                  ['Precast — Concrete Set', precastConcreteSF, setPrecastConcreteSF],
                ].map(([lbl, val, set]) => (
                  <div key={lbl} className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500 flex-1">{lbl}</span>
                    <NumInput value={val} onChange={set} placeholder="SF" className="w-24" />
                    <span className="text-xs text-gray-600 w-20 text-right">
                      {_money(n(val) * _r('Steppers Sub - $/SF'))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

      {/* In-House sections (hidden on the Sub tab) */}
      {!isSub && (
        <>
      {/* ── Planter Preparation ── */}
      {(() => {
        // Shared renderer for a Soils-style prep row (Planter / Sod). Material =
        // CY × $/CY from the picked soil/amendment (sub-category 'Soils'); labor =
        // area × (base soil-prep labor + Hand-add + tilling coeff).
        const isSubTab = subType === 'Subcontractor'
        const tillHrs = method =>
          method === 'Hand'
            ? p(GT_RATES.tillHandLab.dbName, GT_RATES.tillHandLab.fallback)
            : method === 'Tiller'
              ? p(GT_RATES.tillTillerLab.dbName, GT_RATES.tillTillerLab.fallback)
              : 0
        // Multi-row Soils-style prep renderer. Each row is Vendor + Soil/Amendment
        // Type + Area + Depth + Tilling; a "+ Add Row" appends another row and a
        // "×" removes one (only when >1). Material/labor computed per row.
        const prepSection = ({ title, rows, setRows, baseLabRate }) => {
          const upd = (i, field, val) =>
            setRows(rs => rs.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
          return (
            <div>
              <SectionHeader title={title} />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b border-gray-200">
                      <th className="text-center pb-1 pr-1 font-medium">Vendor</th>
                      <th className="text-center pb-1 pr-1 font-medium">Soil/Amendment Type</th>
                      <th className="text-center pb-1 pr-1 font-medium">Area (SF)</th>
                      <th className="text-center pb-1 pr-1 font-medium">Depth (in)</th>
                      <th className="text-center pb-1 pr-1 font-medium">Tilling</th>
                      <th className="text-center pb-1 pr-1 font-medium">$/CY</th>
                      <th className="text-center pb-1 font-medium text-gray-400">Material $</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(rows || []).map((row, i) => {
                      const rowOpts = sectionOptions('Soils', row.vendor, [])
                      const st = resolveType(row.type, rowOpts, [])
                      const typeCost = st.fallback
                      const CY = (n(row.area) * (n(row.depthIn) / 12)) / 27
                      const mat = row.type ? CY * typeCost : 0
                      const handAdd =
                        row.tilling === 'Hand' && !isSubTab
                          ? p(GT_RATES.soilPrepHandAdd.dbName, GT_RATES.soilPrepHandAdd.fallback)
                          : 0
                      const hrs =
                        n(row.area) > 0 ? n(row.area) * (baseLabRate + handAdd + tillHrs(row.tilling)) : 0
                      return (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="py-1 pr-1">
                            <select
                              className="input text-sm py-1.5"
                              value={row.vendor || ''}
                              onChange={e => upd(i, 'vendor', e.target.value)}
                              title="Vendor"
                            >
                              {!row.vendor && <option value="">Select</option>}
                              {row.vendor &&
                                row.vendor !== 'Standard' &&
                                !vendorsForCategory('Soils').some(v => v.id === row.vendor) && (
                                  <option value={row.vendor}>{row.vendor}</option>
                                )}
                              {vendorsForCategory('Soils').map(v => (
                                <option key={v.id} value={v.id}>
                                  {v.name}
                                </option>
                              ))}
                              <option value="Standard">Standard</option>
                            </select>
                          </td>
                          <td className="py-1 pr-1">
                            <select
                              className="input text-sm py-1.5"
                              value={row.type || ''}
                              onChange={e => upd(i, 'type', e.target.value)}
                            >
                              {!row.type && <option value="">Select soil/amendment</option>}
                              {row.type && !rowOpts.some(o => o.label === row.type) && (
                                <option value={row.type}>{row.type}</option>
                              )}
                              {rowOpts.map(t => (
                                <option key={t.label} value={t.label}>
                                  {t.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-1 pr-1">
                            <NumInput
                              value={row.area}
                              onChange={v => upd(i, 'area', v)}
                              placeholder="SF"
                              className="w-full text-center"
                            />
                          </td>
                          <td className="py-1 pr-1">
                            <NumInput
                              value={row.depthIn}
                              onChange={v => upd(i, 'depthIn', v)}
                              placeholder="2"
                              className="w-full text-center"
                            />
                          </td>
                          <td className="py-1 pr-1">
                            <select
                              className="input text-sm py-1.5"
                              value={row.tilling || 'None'}
                              onChange={e => upd(i, 'tilling', e.target.value)}
                              title="Tilling"
                            >
                              <option value="None">None</option>
                              <option value="Hand">Hand</option>
                              <option value="Tiller">Tiller</option>
                            </select>
                          </td>
                          <td className="py-1 pr-1">
                            <span className="text-xs text-gray-500 flex items-center justify-center gap-1 whitespace-nowrap">
                              ${typeCost.toFixed(2)}/CY
                            </span>
                          </td>
                          <td className="py-1 text-center text-xs text-gray-600 whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <span>{n(row.area) > 0 ? `$${mat.toFixed(2)} · ${hrs.toFixed(2)} hrs` : '—'}</span>
                              {(rows || []).length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => setRows(rs => rs.filter((_, idx) => idx !== i))}
                                  className="text-gray-300 hover:text-red-500 text-sm px-1"
                                  title="Remove line"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <button
                  type="button"
                  onClick={() =>
                    setRows(r => [...r, { area: '', vendor: '', type: '', depthIn: '2', tilling: 'Tiller' }])
                  }
                  className="mt-1 text-xs text-green-700 hover:text-green-900 font-medium"
                >
                  + Add Row
                </button>
              </div>
            </div>
          )
        }
        return (
          <>
            {prepSection({
              title: 'Planter Preparation',
              rows: planterPrepRows,
              setRows: setPlanterPrepRows,
              baseLabRate: p(GT_RATES.soilPrepLab.dbName, GT_RATES.soilPrepLab.fallback),
            })}
            {prepSection({
              title: 'Sod Preparation',
              rows: sodPrepRows,
              setRows: setSodPrepRows,
              baseLabRate: p(GT_RATES.sodPrepLab.dbName, GT_RATES.sodPrepLab.fallback),
            })}
          </>
        )
      })()}

      {/* ── Sod ── */}
      <div>
        <SectionHeader title="Sod" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-center pb-1 pr-1 font-medium">Vendor</th>
                <th className="text-center pb-1 pr-1 font-medium">Sod Type</th>
                <th className="text-center pb-1 pr-1 font-medium">SF</th>
                <th className="text-center pb-1 pr-1 font-medium">$/SF</th>
                <th className="text-center pb-1 font-medium text-gray-400">Material $</th>
              </tr>
            </thead>
            <tbody>
              {(sodRows || []).map((row, i) => {
                const rowOpts = sectionOptions('Sod', row.vendor, [])
                const st = resolveType(row.type, rowOpts, [])
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5"
                        value={row.vendor || ''}
                        onChange={e => updateSodRow(i, 'vendor', e.target.value)}
                        title="Vendor"
                      >
                        {!row.vendor && <option value="">Select</option>}
                        {row.vendor &&
                          row.vendor !== 'Standard' &&
                          !vendorsForCategory('Sod').some(v => v.id === row.vendor) && (
                            <option value={row.vendor}>{row.vendor}</option>
                          )}
                        {vendorsForCategory('Sod').map(v => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                        <option value="Standard">Standard</option>
                      </select>
                    </td>
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5"
                        value={row.type || ''}
                        onChange={e => updateSodRow(i, 'type', e.target.value)}
                      >
                        {!row.type && <option value="">Select sod</option>}
                        {row.type && !rowOpts.some(o => o.label === row.type) && (
                          <option value={row.type}>{row.type}</option>
                        )}
                        {rowOpts.map(t => (
                          <option key={t.label} value={t.label}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1 pr-1">
                      <NumInput
                        value={row.sf}
                        onChange={v => updateSodRow(i, 'sf', v)}
                        placeholder="SF"
                        className="w-full text-center"
                      />
                    </td>
                    <td className="py-1 pr-1">
                      <span className="text-xs text-gray-500 whitespace-nowrap block text-center">
                        ${st.fallback.toFixed(2)}/SF
                      </span>
                    </td>
                    <td className="py-1 text-center text-xs text-gray-600 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <span>{row.type && n(row.sf) > 0 ? `$${(n(row.sf) * st.fallback).toFixed(2)}` : '—'}</span>
                        {(sodRows || []).length > 1 && (
                          <button
                            type="button"
                            onClick={() => setSodRows(rs => rs.filter((_, idx) => idx !== i))}
                            className="text-gray-300 hover:text-red-500 text-sm px-1"
                            title="Remove line"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <button
            type="button"
            onClick={() => setSodRows(r => [...r, { vendor: '', type: '', sf: '' }])}
            className="mt-1 text-xs text-green-700 hover:text-green-900 font-medium"
          >
            + Add Row
          </button>
        </div>
      </div>

      {/* ── Sod Fertilizer ── */}
      <div>
        <SectionHeader title="Sod Fertilizer" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-center pb-1 pr-1 font-medium">Vendor</th>
                <th className="text-center pb-1 pr-1 font-medium">Fertilizer Type</th>
                <th className="text-center pb-1 pr-1 font-medium">SF</th>
                <th className="text-center pb-1 font-medium text-gray-400">Coverage / Cost</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const sfPerBag = p(
                  GT_RATES.fertilizerSFPerBag.dbName,
                  GT_RATES.fertilizerSFPerBag.fallback
                )
                // Rows with no explicit SF fall back to the total sod SF (sum of
                // sodRows) — mirror of the calc's single-row legacy default.
                const sodSFTotal = (sodRows || []).reduce((a, r) => a + n(r.sf), 0)
                return (sodFertRows || []).map((row, i) => {
                  const fertOpts = sectionOptions('Fertilizer', row.vendor, [])
                  const ft = resolveType(row.fertilizer, fertOpts, [])
                  const fertSF = n(row.sf) || sodSFTotal
                  const bags =
                    row.fertilizer && ft && ft.dbName && sfPerBag > 0 && fertSF > 0
                      ? Math.ceil(fertSF / sfPerBag)
                      : 0
                  return (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-1 pr-1">
                        <select
                          className="input text-sm py-1.5"
                          value={row.vendor || ''}
                          onChange={e => updateSodFert(i, 'vendor', e.target.value)}
                          title="Vendor"
                        >
                          {!row.vendor && <option value="">Select</option>}
                          {row.vendor &&
                            row.vendor !== 'Standard' &&
                            !vendorsForCategory('Fertilizer').some(v => v.id === row.vendor) && (
                              <option value={row.vendor}>{row.vendor}</option>
                            )}
                          {vendorsForCategory('Fertilizer').map(v => (
                            <option key={v.id} value={v.id}>
                              {v.name}
                            </option>
                          ))}
                          <option value="Standard">Standard</option>
                        </select>
                      </td>
                      <td className="py-1 pr-1">
                        <select
                          className="input text-sm py-1.5"
                          value={row.fertilizer || ''}
                          onChange={e => updateSodFert(i, 'fertilizer', e.target.value)}
                        >
                          {!row.fertilizer && <option value="">Select fertilizer</option>}
                          {row.fertilizer && !fertOpts.some(o => o.label === row.fertilizer) && (
                            <option value={row.fertilizer}>{row.fertilizer}</option>
                          )}
                          {fertOpts.map(t => (
                            <option key={t.label} value={t.label}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1 pr-1">
                        <NumInput
                          value={row.sf}
                          onChange={v => updateSodFert(i, 'sf', v)}
                          placeholder="SF"
                          className="w-full text-center"
                        />
                      </td>
                      <td className="py-1 text-center text-xs text-gray-600 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <span>
                            {ft && ft.dbName && row.fertilizer
                              ? `$${ft.fallback.toFixed(2)}/bag · 1 bag / ${sfPerBag} SF${
                                  bags > 0 ? ` = ${bags} bag${bags > 1 ? 's' : ''} · $${(bags * ft.fallback).toFixed(2)}` : ''
                                }`
                              : '—'}
                          </span>
                          {(sodFertRows || []).length > 1 && (
                            <button
                              type="button"
                              onClick={() => setSodFertRows(rs => rs.filter((_, idx) => idx !== i))}
                              className="text-gray-300 hover:text-red-500 text-sm px-1"
                              title="Remove line"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              })()}
            </tbody>
          </table>
          <button
            type="button"
            onClick={() => setSodFertRows(r => [...r, { vendor: '', fertilizer: '', sf: '' }])}
            className="mt-1 text-xs text-green-700 hover:text-green-900 font-medium"
          >
            + Add Row
          </button>
        </div>
      </div>

      {/* ── Mulch ── */}
      <div>
        <SectionHeader title="Mulch" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-center pb-1 pr-1 font-medium">Vendor</th>
                <th className="text-center pb-1 pr-1 font-medium">Mulch Type</th>
                <th className="text-center pb-1 pr-1 font-medium">Area (SF)</th>
                <th className="text-center pb-1 pr-1 font-medium">Depth (in)</th>
                <th className="text-center pb-1 pr-1 font-medium">$/CY</th>
                <th className="text-center pb-1 font-medium">Weed Fabric</th>
              </tr>
            </thead>
            <tbody>
              {mulchRows.map((row, i) => {
                const rowOpts = sectionOptions('Mulch', row.vendor, [])
                const mt = resolveType(row.type, rowOpts, [])
                const typeCost = mt.fallback
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5"
                        value={row.vendor || ''}
                        onChange={e => updateMulch(i, 'vendor', e.target.value)}
                        title="Vendor"
                      >
                        {!row.vendor && <option value="">Select</option>}
                        {row.vendor &&
                          row.vendor !== 'Standard' &&
                          !vendorsForCategory('Mulch').some(v => v.id === row.vendor) && (
                            <option value={row.vendor}>{row.vendor}</option>
                          )}
                        {vendorsForCategory('Mulch').map(v => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                        <option value="Standard">Standard</option>
                      </select>
                    </td>
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5"
                        value={row.type || ''}
                        onChange={e => updateMulch(i, 'type', e.target.value)}
                      >
                        {!row.type && <option value="">Select mulch</option>}
                        {row.type && !rowOpts.some(o => o.label === row.type) && (
                          <option value={row.type}>{row.type}</option>
                        )}
                        {rowOpts.map(t => (
                          <option key={t.label} value={t.label}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1 pr-1">
                      <NumInput value={row.sf} onChange={v => updateMulch(i, 'sf', v)} className="w-full text-center" />
                    </td>
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5 w-full"
                        value={row.depth}
                        onChange={e => updateMulch(i, 'depth', e.target.value)}
                      >
                        {['1', '2', '3', '4'].map(d => (
                          <option key={d} value={d}>
                            {d}" deep
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1 pr-1">
                      <span className="text-xs text-gray-500 flex items-center justify-center gap-1 whitespace-nowrap">
                        ${typeCost.toFixed(2)}/CY
                      </span>
                    </td>
                    <td className="py-1">
                      <div className="flex items-center gap-1">
                        <select
                          className="input text-sm py-1.5"
                          value={row.weedFabric}
                          onChange={e => updateMulch(i, 'weedFabric', e.target.value)}
                        >
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                        {mulchRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setMulchRows(rows => rows.filter((_, idx) => idx !== i))}
                            className="text-gray-300 hover:text-red-500 text-sm px-1"
                            title="Remove line"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <button
            type="button"
            onClick={() =>
              setMulchRows(r => [
                ...r,
                { type: '', sf: '', depth: '2', weedFabric: 'No', vendor: defaultVendorFor('Mulch') },
              ])
            }
            className="mt-1 text-xs text-green-700 hover:text-green-900 font-medium"
          >
            + Add Row
          </button>
        </div>
      </div>

      {/* ── Decomposed Granite ── */}
      <div>
        <SectionHeader title="Decomposed Granite (D.G.)" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-center pb-1 pr-1 font-medium">Vendor</th>
                <th className="text-center pb-1 pr-1 font-medium">DG Type</th>
                <th className="text-center pb-1 pr-1 font-medium">Area (SF)</th>
                <th className="text-center pb-1 pr-1 font-medium">Depth (in)</th>
                <th className="text-center pb-1 pr-1 font-medium">Weed Fabric</th>
                <th className="text-center pb-1 pr-1 font-medium">Method</th>
                <th className="text-center pb-1 font-medium">Cement</th>
              </tr>
            </thead>
            <tbody>
              {dgRows.map((row, i) => {
                const rowOpts = sectionOptions('DG', row.vendor, [])
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5"
                        value={row.vendor || ''}
                        onChange={e => updateDg(i, 'vendor', e.target.value)}
                        title="Vendor"
                      >
                        {!row.vendor && <option value="">Select</option>}
                        {row.vendor &&
                          row.vendor !== 'Standard' &&
                          !vendorsForCategory('DG').some(v => v.id === row.vendor) && (
                            <option value={row.vendor}>{row.vendor}</option>
                          )}
                        {vendorsForCategory('DG').map(v => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                        <option value="Standard">Standard</option>
                      </select>
                    </td>
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5"
                        value={row.type || ''}
                        onChange={e => updateDg(i, 'type', e.target.value)}
                      >
                        {!row.type && <option value="">Select DG</option>}
                        {row.type && !rowOpts.some(o => o.label === row.type) && (
                          <option value={row.type}>{row.type}</option>
                        )}
                        {rowOpts.map(t => (
                          <option key={t.label} value={t.label}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1 pr-1">
                      <NumInput value={row.sf} onChange={v => updateDg(i, 'sf', v)} className="w-full text-center" />
                    </td>
                    <td className="py-1 pr-1">
                      <NumInput
                        value={row.depth}
                        onChange={v => updateDg(i, 'depth', v)}
                        placeholder="3.5"
                        className="w-full text-center"
                      />
                    </td>
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5"
                        value={row.weedFabric}
                        onChange={e => updateDg(i, 'weedFabric', e.target.value)}
                      >
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </td>
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5"
                        value={row.method}
                        onChange={e => updateDg(i, 'method', e.target.value)}
                      >
                        {DG_METHODS.map(m => (
                          <option key={m}>{m}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1">
                      <div className="flex items-center gap-1">
                        <select
                          className="input text-sm py-1.5"
                          value={row.cement}
                          onChange={e => updateDg(i, 'cement', e.target.value)}
                          title="Add Cement Mixture"
                        >
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                        {dgRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setDgRows(rows => rows.filter((_, idx) => idx !== i))}
                            className="text-gray-300 hover:text-red-500 text-sm px-1"
                            title="Remove line"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <button
            type="button"
            onClick={() =>
              setDgRows(r => [
                ...r,
                {
                  type: '',
                  sf: '',
                  depth: '3.5',
                  weedFabric: 'No',
                  method: 'Machine',
                  cement: 'No',
                  vendor: defaultVendorFor('DG'),
                },
              ])
            }
            className="mt-1 text-xs text-green-700 hover:text-green-900 font-medium"
          >
            + Add Row
          </button>
        </div>
      </div>

      {/* ── Gravel ── */}
      <div>
        <SectionHeader title="Gravel" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-center pb-1 pr-1 font-medium">Vendor</th>
                <th className="text-center pb-1 pr-1 font-medium">Gravel Type</th>
                <th className="text-center pb-1 pr-1 font-medium">SF</th>
                <th className="text-center pb-1 pr-1 font-medium">Method</th>
                <th className="text-center pb-1 pr-1 font-medium">$/CY</th>
                <th className="text-center pb-1 pr-1 font-medium">Weed Barrier</th>
                <th className="text-center pb-1 font-medium">Depth (in)</th>
              </tr>
            </thead>
            <tbody>
              {gravelRows.map((row, i) => {
                const rowOpts = sectionOptions('Gravel', row.vendor, [])
                const gtype = resolveType(row.type, rowOpts, [])
                const typeCost = gtype.fallback
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5"
                        value={row.vendor || ''}
                        onChange={e => updateGravel(i, 'vendor', e.target.value)}
                        title="Vendor"
                      >
                        {!row.vendor && <option value="">Select</option>}
                        {row.vendor &&
                          row.vendor !== 'Standard' &&
                          !vendorsForCategory('Gravel').some(v => v.id === row.vendor) && (
                            <option value={row.vendor}>{row.vendor}</option>
                          )}
                        {vendorsForCategory('Gravel').map(v => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                        <option value="Standard">Standard</option>
                      </select>
                    </td>
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5"
                        value={row.type || ''}
                        onChange={e => updateGravel(i, 'type', e.target.value)}
                      >
                        {!row.type && <option value="">Select gravel</option>}
                        {row.type && !rowOpts.some(o => o.label === row.type) && (
                          <option value={row.type}>{row.type}</option>
                        )}
                        {rowOpts.map(t => (
                          <option key={t.label} value={t.label}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1 pr-1">
                      <NumInput value={row.sf} onChange={v => updateGravel(i, 'sf', v)} className="w-full text-center" />
                    </td>
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5"
                        value={row.method}
                        onChange={e => updateGravel(i, 'method', e.target.value)}
                      >
                        <option>Hand</option>
                        <option>Machine</option>
                      </select>
                    </td>
                    <td className="py-1 pr-1">
                      <span className="text-xs text-gray-500 flex items-center justify-center gap-1 whitespace-nowrap">
                        ${typeCost.toFixed(2)}/CY
                      </span>
                    </td>
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5"
                        value={row.weedFabric ?? 'Yes'}
                        onChange={e => updateGravel(i, 'weedFabric', e.target.value)}
                        title="Weed Barrier fabric"
                      >
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </td>
                    <td className="py-1">
                      <div className="flex items-center gap-1">
                        <NumInput
                          value={row.depthIn}
                          onChange={v => updateGravel(i, 'depthIn', v)}
                          placeholder="3"
                          className="w-full text-center"
                        />
                        {gravelRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setGravelRows(rows => rows.filter((_, idx) => idx !== i))}
                            className="text-gray-300 hover:text-red-500 text-sm px-1"
                            title="Remove line"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <button
            type="button"
            className="mt-1 text-xs text-green-700 hover:text-green-900 font-medium"
            onClick={() =>
              setGravelRows(r => [
                ...r,
                { sf: '', method: 'Hand', type: '', depthIn: '3', weedFabric: 'Yes', vendor: defaultVendorFor('Gravel') },
              ])
            }
          >
            + Add Row
          </button>
          {/* Show CY / material preview below table */}
          {gravelRows.some(r => n(r.sf) > 0) && (
            <div className="mt-1 flex gap-4 flex-wrap">
              {gravelRows.map((row, i) => {
                if (!n(row.sf) || !row.type) return null
                const CY = (n(row.sf) * (n(row.depthIn) / 12)) / 27
                const gtype = resolveType(row.type, sectionOptions('Gravel', row.vendor, []), [])
                const mat =
                  CY * gtype.fallback +
                  ((row.weedFabric ?? 'Yes') === 'Yes' ? n(row.sf) * p(GT_RATES.gravelFabricMat.dbName, 0.1) : 0)
                return (
                  <span key={i} className="text-xs text-gray-400">
                    #{i + 1}: {CY.toFixed(2)} CY · ${mat.toFixed(2)} mat
                  </span>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Pebble ── */}
      <div>
        <SectionHeader title="Pebble" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-center pb-1 pr-1 font-medium">Vendor</th>
                <th className="text-center pb-1 pr-1 font-medium">Pebble Type</th>
                <th className="text-center pb-1 pr-1 font-medium">SF</th>
                <th className="text-center pb-1 pr-1 font-medium">Method</th>
                <th className="text-center pb-1 pr-1 font-medium">$/CY</th>
                <th className="text-center pb-1 pr-1 font-medium">Weed Barrier</th>
                <th className="text-center pb-1 font-medium">Depth (in)</th>
              </tr>
            </thead>
            <tbody>
              {pebbleRows.map((row, i) => {
                const rowOpts = sectionOptions('Pebble', row.vendor, [])
                const ptype = resolveType(row.type, rowOpts, [])
                const typeCost = ptype.fallback
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5"
                        value={row.vendor || ''}
                        onChange={e => updatePebble(i, 'vendor', e.target.value)}
                        title="Vendor"
                      >
                        {!row.vendor && <option value="">Select</option>}
                        {row.vendor &&
                          row.vendor !== 'Standard' &&
                          !vendorsForCategory('Pebble').some(v => v.id === row.vendor) && (
                            <option value={row.vendor}>{row.vendor}</option>
                          )}
                        {vendorsForCategory('Pebble').map(v => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                        <option value="Standard">Standard</option>
                      </select>
                    </td>
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5"
                        value={row.type || ''}
                        onChange={e => updatePebble(i, 'type', e.target.value)}
                      >
                        {!row.type && <option value="">Select pebble</option>}
                        {row.type && !rowOpts.some(o => o.label === row.type) && (
                          <option value={row.type}>{row.type}</option>
                        )}
                        {rowOpts.map(t => (
                          <option key={t.label} value={t.label}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1 pr-1">
                      <NumInput value={row.sf} onChange={v => updatePebble(i, 'sf', v)} className="w-full text-center" />
                    </td>
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5"
                        value={row.method}
                        onChange={e => updatePebble(i, 'method', e.target.value)}
                      >
                        <option>Hand</option>
                        <option>Machine</option>
                      </select>
                    </td>
                    <td className="py-1 pr-1">
                      <span className="text-xs text-gray-500 flex items-center justify-center gap-1 whitespace-nowrap">
                        ${typeCost.toFixed(2)}/CY
                      </span>
                    </td>
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5"
                        value={row.weedFabric ?? 'Yes'}
                        onChange={e => updatePebble(i, 'weedFabric', e.target.value)}
                        title="Weed Barrier fabric"
                      >
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </td>
                    <td className="py-1">
                      <NumInput
                        value={row.depthIn}
                        onChange={v => updatePebble(i, 'depthIn', v)}
                        placeholder="3"
                        className="w-full text-center"
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <button
            type="button"
            className="mt-1 text-xs text-green-700 hover:text-green-900 font-medium"
            onClick={() =>
              setPebbleRows(r => [
                ...r,
                { sf: '', method: 'Hand', type: '', depthIn: '3', weedFabric: 'Yes', vendor: defaultVendorFor('Pebble') },
              ])
            }
          >
            + Add Row
          </button>
          {/* Show CY / material preview below table */}
          {pebbleRows.some(r => n(r.sf) > 0) && (
            <div className="mt-1 flex gap-4 flex-wrap">
              {pebbleRows.map((row, i) => {
                if (!n(row.sf) || !row.type) return null
                const CY = (n(row.sf) * (n(row.depthIn) / 12)) / 27
                const ptype = resolveType(row.type, sectionOptions('Pebble', row.vendor, []), [])
                const mat =
                  CY * ptype.fallback +
                  ((row.weedFabric ?? 'Yes') === 'Yes' ? n(row.sf) * p(GT_RATES.gravelFabricMat.dbName, 0.1) : 0)
                return (
                  <span key={i} className="text-xs text-gray-400">
                    #{i + 1}: {CY.toFixed(2)} CY · ${mat.toFixed(2)} mat
                  </span>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Cobbles & Boulders ── */}
      <div>
        <SectionHeader title="Cobbles & Boulders" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-center pb-1 pr-1 font-medium">Vendor</th>
                <th className="text-center pb-1 pr-1 font-medium">Cobble Type</th>
                <th className="text-center pb-1 pr-1 font-medium">SF</th>
                <th className="text-center pb-1 pr-1 font-medium">Method</th>
                <th className="text-center pb-1 pr-1 font-medium">$/CY</th>
                <th className="text-center pb-1 font-medium">Depth (in)</th>
              </tr>
            </thead>
            <tbody>
              {cobbleRows.map((row, i) => {
                const rowOpts = sectionOptions('Cobbles', row.vendor, [])
                const ctype = resolveType(row.type, rowOpts, [])
                const typeCost = ctype.fallback
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5"
                        value={row.vendor || ''}
                        onChange={e => updateCobble(i, 'vendor', e.target.value)}
                        title="Vendor"
                      >
                        {!row.vendor && <option value="">Select</option>}
                        {row.vendor &&
                          row.vendor !== 'Standard' &&
                          !vendorsForCategory('Cobbles').some(v => v.id === row.vendor) && (
                            <option value={row.vendor}>{row.vendor}</option>
                          )}
                        {vendorsForCategory('Cobbles').map(v => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                        <option value="Standard">Standard</option>
                      </select>
                    </td>
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5"
                        value={row.type || ''}
                        onChange={e => updateCobble(i, 'type', e.target.value)}
                      >
                        {!row.type && <option value="">Select cobble</option>}
                        {row.type && !rowOpts.some(o => o.label === row.type) && (
                          <option value={row.type}>{row.type}</option>
                        )}
                        {rowOpts.map(t => (
                          <option key={t.label} value={t.label}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1 pr-1">
                      <NumInput value={row.sf} onChange={v => updateCobble(i, 'sf', v)} className="w-full text-center" />
                    </td>
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5"
                        value={row.method}
                        onChange={e => updateCobble(i, 'method', e.target.value)}
                      >
                        <option>Hand</option>
                        <option>Machine</option>
                      </select>
                    </td>
                    <td className="py-1 pr-1">
                      <span className="text-xs text-gray-500 flex items-center justify-center gap-1 whitespace-nowrap">
                        ${typeCost.toFixed(2)}/CY
                      </span>
                    </td>
                    <td className="py-1">
                      <NumInput
                        value={row.depthIn}
                        onChange={v => updateCobble(i, 'depthIn', v)}
                        placeholder="3"
                        className="w-full text-center"
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <button
            type="button"
            className="mt-1 text-xs text-green-700 hover:text-green-900 font-medium"
            onClick={() =>
              setCobbleRows(r => [
                ...r,
                { sf: '', method: 'Hand', type: '', depthIn: '3', vendor: defaultVendorFor('Cobbles') },
              ])
            }
          >
            + Add Row
          </button>
          {/* Show CY / material preview below table */}
          {cobbleRows.some(r => n(r.sf) > 0) && (
            <div className="mt-1 flex gap-4 flex-wrap">
              {cobbleRows.map((row, i) => {
                if (!n(row.sf) || !row.type) return null
                const CY = (n(row.sf) * (n(row.depthIn) / 12)) / 27
                const ctype = resolveType(row.type, sectionOptions('Cobbles', row.vendor, []), [])
                const mat =
                  CY * ctype.fallback +
                  n(row.sf) * p(GT_RATES.gravelFabricMat.dbName, 0.1)
                return (
                  <span key={i} className="text-xs text-gray-400">
                    #{i + 1}: {CY.toFixed(2)} CY · ${mat.toFixed(2)} mat
                  </span>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Edging ── */}
      <div>
        <SectionHeader title="Edging" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-center pb-1 pr-1 font-medium">Vendor</th>
                <th className="text-center pb-1 pr-1 font-medium">Edging Type</th>
                <th className="text-center pb-1 pr-1 font-medium">LF</th>
                <th className="text-center pb-1 pr-1 font-medium">$/LF</th>
                <th className="text-center pb-1 font-medium text-gray-400">Material $</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                // ONE combined Edging row — the Type picker lists both Plastic and
                // Metal (plus vendor edging). Labor keys off the picked Type.
                const opts = sectionOptions('Edging', edgingVendor, [])
                const t = resolveType(edgingType, opts, [])
                const rate = t.fallback
                return (
                  <tr className="border-b border-gray-100">
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5"
                        value={edgingVendor || ''}
                        onChange={e => setEdgingVendor(e.target.value)}
                        title="Vendor"
                      >
                        {!edgingVendor && <option value="">Select</option>}
                        {edgingVendor &&
                          edgingVendor !== 'Standard' &&
                          !vendorsForCategory('Edging').some(v => v.id === edgingVendor) && (
                            <option value={edgingVendor}>{edgingVendor}</option>
                          )}
                        {vendorsForCategory('Edging').map(v => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                        <option value="Standard">Standard</option>
                      </select>
                    </td>
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5"
                        value={edgingType || ''}
                        onChange={e => setEdgingType(e.target.value)}
                      >
                        {!edgingType && <option value="">Select edging</option>}
                        {edgingType && !opts.some(o => o.label === edgingType) && (
                          <option value={edgingType}>{edgingType}</option>
                        )}
                        {opts.map(o => (
                          <option key={o.label} value={o.label}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1 pr-1">
                      <NumInput value={edgingLF} onChange={setEdgingLF} placeholder="LF" className="w-full text-center" />
                    </td>
                    <td className="py-1 pr-1">
                      <span className="text-xs text-gray-500 whitespace-nowrap block text-center">${rate.toFixed(2)}/LF</span>
                    </td>
                    <td className="py-1 text-center text-xs text-gray-600 whitespace-nowrap">
                      {edgingType && n(edgingLF) > 0 ? `$${(n(edgingLF) * rate).toFixed(2)}` : '—'}
                    </td>
                  </tr>
                )
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Steppers ── */}
      <div>
        <SectionHeader title="Steppers" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-center pb-1 pr-2 font-medium">Vendor</th>
                <th className="text-center pb-1 pr-2 font-medium">Stepper Type</th>
                <th className="text-center pb-1 pr-2 font-medium">Line</th>
                <th className="text-center pb-1 pr-2 font-medium">Area (SF)</th>
                <th className="text-center pb-1 pr-2 font-medium">Labor</th>
                <th className="text-center pb-1 pr-2 font-medium">$/Ton</th>
                <th className="text-center pb-1 pr-2 font-medium text-gray-400">Tons</th>
                <th className="text-center pb-1 font-medium text-gray-400">Material $</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  key: 'flagSoil',
                  label: 'Flagstone — Soil Set',
                  sf: flagstoneSoilSF,
                  set: setFlagstoneSoilSF,
                  labRate: GT_RATES.flagstoneSoilLab,
                },
                {
                  key: 'flagConc',
                  label: 'Flagstone — Concrete Set',
                  sf: flagstoneConcreteSF,
                  set: setFlagstoneConcreteSF,
                  labRate: GT_RATES.flagstoneConcreteLab,
                },
                {
                  key: 'precSoil',
                  label: 'Precast — Soil Set',
                  sf: precastSoilSF,
                  set: setPrecastSoilSF,
                  labRate: GT_RATES.precastSoilLab,
                },
                {
                  key: 'precConc',
                  label: 'Precast — Concrete Set',
                  sf: precastConcreteSF,
                  set: setPrecastConcreteSF,
                  labRate: GT_RATES.precastConcreteLab,
                },
              ].map(row => {
                const rowOpts = sectionOptions('Steppers', stepperVendor[row.key], [])
                const st = resolveType(stepperType[row.key], rowOpts, [])
                const sfPerDay = p(row.labRate.dbName, row.labRate.fallback)
                const perTon = st.fallback
                const sfN = n(row.sf)
                const tons = sfN / 80
                const mat = tons * perTon
                const hrs = sfPerDay > 0 ? (sfN / sfPerDay) * 8 : 0
                return (
                  <tr key={row.key} className="border-b border-gray-100">
                    <td className="py-1 pr-2">
                      <select
                        className="input text-sm py-1.5"
                        value={stepperVendor[row.key] || ''}
                        onChange={e =>
                          setStepperVendor(sv => ({ ...sv, [row.key]: e.target.value }))
                        }
                        title="Vendor"
                      >
                        {!stepperVendor[row.key] && <option value="">Select</option>}
                        {stepperVendor[row.key] &&
                          stepperVendor[row.key] !== 'Standard' &&
                          !vendorsForCategory('Steppers').some(v => v.id === stepperVendor[row.key]) && (
                            <option value={stepperVendor[row.key]}>{stepperVendor[row.key]}</option>
                          )}
                        {vendorsForCategory('Steppers').map(v => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                        <option value="Standard">Standard</option>
                      </select>
                    </td>
                    <td className="py-1 pr-2">
                      <select
                        className="input text-sm py-1.5"
                        value={stepperType[row.key] || ''}
                        onChange={e =>
                          setStepperType(st => ({ ...st, [row.key]: e.target.value }))
                        }
                        title="Stepper Type"
                      >
                        {!stepperType[row.key] && <option value="">Select stepper</option>}
                        {stepperType[row.key] && !rowOpts.some(o => o.label === stepperType[row.key]) && (
                          <option value={stepperType[row.key]}>{stepperType[row.key]}</option>
                        )}
                        {rowOpts.map(o => (
                          <option key={o.label} value={o.label}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1 pr-2 text-center text-xs text-gray-700 whitespace-nowrap">{row.label}</td>
                    <td className="py-1 pr-2">
                      <NumInput value={row.sf} onChange={row.set} className="text-center" />
                    </td>
                    <td className="py-1 pr-2">
                      <span className="text-xs text-gray-500 flex items-center justify-center gap-1 whitespace-nowrap">
                        {sfPerDay} SF/day
                      </span>
                    </td>
                    <td className="py-1 pr-2">
                      <span className="text-xs text-gray-500 flex items-center justify-center gap-1 whitespace-nowrap">
                        ${perTon.toFixed(2)}/ton
                      </span>
                    </td>
                    <td className="py-1 text-center text-xs text-gray-400 pr-2">
                      {sfN > 0 ? tons.toFixed(2) : '—'}
                    </td>
                    <td className="py-1 text-center text-xs text-gray-600 whitespace-nowrap">
                      {sfN > 0 ? `$${mat.toFixed(2)} · ${hrs.toFixed(2)} hrs` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

        </>
      )}

      {/* ── Manual Entry ── */}
      <div>
        <SectionHeader title="Manual Entry" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
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
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-center pb-1 pr-2 font-medium">Description</th>
                {isSub ? (
                  <th className="text-center pb-1 font-medium">Cost $</th>
                ) : (
                  <>
                    <th className="text-center pb-1 pr-2 font-medium">Hours</th>
                    <th className="text-center pb-1 font-medium">Materials $</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {manualRows.map((row, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1 pr-2">
                    <input
                      className="input text-sm py-1 w-full"
                      value={row.label}
                      onChange={e => updateManual(i, 'label', e.target.value)}
                    />
                  </td>
                  {isSub ? (
                    <td className="py-1">
                      <div className="flex items-center gap-1">
                        <NumInput value={row.subCost} onChange={v => updateManual(i, 'subCost', v)} className="text-center flex-1" />
                        {manualRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setManualRows(rows => rows.filter((_, idx) => idx !== i))}
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
                      <td className="py-1 pr-2">
                        <NumInput value={row.hours} onChange={v => updateManual(i, 'hours', v)} className="text-center" />
                      </td>
                      <td className="py-1">
                        <div className="flex items-center gap-1">
                          <NumInput
                            value={row.materials}
                            onChange={v => updateManual(i, 'materials', v)}
                            className="text-center flex-1"
                          />
                          {manualRows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setManualRows(rows => rows.filter((_, idx) => idx !== i))}
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
            onClick={() => setManualRows(rows => [...rows, { label: '', hours: '', materials: '', subCost: '' }])}
            className="mt-2 text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            + Add manual entry
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="btn-secondary flex-1">
          ← Back
        </button>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
    </SubTabContext.Provider>
  )
}
