import WorkTypeChooser from './WorkTypeChooser'
import { useState, useEffect, useCallback, useContext } from 'react'
import { SubTabContext, subSectionTitle } from './subTabContext'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import ModuleNotesField from './ModuleNotesField'
import RateEditPopover from '../RateEditPopover'
import { fetchSalesTaxRate } from '../../lib/companyDefaults'
import { calcWalkAccessLabor, DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN } from '../../lib/walkAccess'
import { catalogOptions } from '../../lib/materialCatalog'

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

// Stepper stone types (material_rates, per TON). House defaults keep existing
// estimates unchanged (Flagstone / Precast). Vendor rows filter to subcategory
// 'Steppers'. Labor stays per-line (Soil vs Concrete SF/day), not from the type.
const STEPPER_TYPES = [
  { label: 'Flagstone', dbName: 'Flagstone Steppers', fallback: 500 },
  { label: 'Precast',   dbName: 'Precast Steppers',   fallback: 200 },
]
// Edging types (material_rates, per LF). House defaults keep existing estimates
// unchanged (Plastic / Metal). Vendor rows filter to subcategory 'Edging'.
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

// Soil-prep bed material — single House type; vendors may supply a 'Soil Prep'
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
// hardcoded House array, then the first available option — so pricing never breaks
// when a vendor is selected, a product is missing, or an old estimate is reopened.
function resolveType(label, options, houseArray) {
  return (
    (options || []).find(t => t.label === label) ||
    (houseArray || []).find(t => t.label === label) ||
    (options && options[0]) ||
    (houseArray && houseArray[0])
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
  // Default to the hardcoded House array so the calc works if opts is absent.
  const _opts = {
    sod: opts.sod || SOD_TYPES,
  }
  // Per-ROW type option resolver (vendor-aware). 'House' (or missing vendor on
  // an old estimate) → hardcoded House array. A vendor id → that vendor's
  // products for the row's material category, priced at the vendor's unit_cost.
  const rowOpt = (cat, row, houseArray) => {
    // Resolve the effective vendor: a stored 'auto' (new default) → the category
    // default (first real vendor, else House); an explicit 'House'/id stays as-is.
    const vsel = row.vendor && row.vendor !== 'auto' ? row.vendor : (catDefaults[cat] || 'House')
    if (!vsel || vsel === 'House') return resolveType(row.type, houseArray, houseArray)
    // Shared row filtering (subcat + vendor); GT keeps its own label transform.
    const opts = catalogOptions(materialRows, cat, vsel, { houseRows: 'exclude' }).map(o => ({
      label: o.row.name.replace(new RegExp('^' + cat + ' - '), '').replace(/^.*? - /, ''),
      dbName: o.row.name,
      fallback: parseFloat(o.row.unit_cost) || 0,
    }))
    return resolveType(row.type, opts, houseArray)
  }
  const {
    difficulty,
    hoursAdj,
    mulchRows,
    plasticEdgingLF,
    metalEdgingLF,
    soilPrepSF,
    prepMethod,
    prepArea,
    sodSF,
    sodType,
    sodFertilizer,
    sodFertilizerVendor,
    sodFertilizerSF,
    flagstoneSoilSF,
    flagstoneConcreteSF,
    precastSoilSF,
    precastConcreteSF,
    stepperVendor,
    stepperType,
    edgingVendor,
    edgingType,
    dgRows,
    gravelRows,
    soilsRows,
    pebbleRows,
    cobbleRows,
    manualRows,
  } = state

  const p = (dbName, fallback) => mp[dbName] ?? fallback

  let totalMat = 0

  // ── Mulch (multi-row) ────────────────────────────────────────────────────────
  let mulchLab = 0,
    mulchMat = 0
  {
    const mulchCYPerDay = p(GT_RATES.mulchLab.dbName, GT_RATES.mulchLab.fallback)
    let anyMulch = false
    ;(mulchRows || []).forEach(r => {
      if (!(n(r.sf) > 0)) return
      anyMulch = true
      const CY = (n(r.sf) * (n(r.depth) / 12)) / 27
      const mt = rowOpt('Mulch', r, MULCH_TYPES)
      mulchMat += CY * p(mt.dbName, mt.fallback)
      mulchLab += (CY / mulchCYPerDay) * 8 + (n(r.sf) / 3200) * 8
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
  // Type (filtered to the picked Vendor's catalog); House defaults to
  // Plastic/Metal so old estimates price identically.
  const plasticLab =
    n(plasticEdgingLF) * p(GT_RATES.plasticEdgingLab.dbName, GT_RATES.plasticEdgingLab.fallback)
  const _plasticEdgeOpt = rowOpt(
    'Edging',
    { vendor: (edgingVendor || {}).plastic, type: (edgingType || {}).plastic || 'Plastic' },
    EDGING_TYPES
  )
  const plasticMat =
    n(plasticEdgingLF) * p(_plasticEdgeOpt.dbName, _plasticEdgeOpt.fallback)
  const metalLab =
    n(metalEdgingLF) * p(GT_RATES.metalEdgingLab.dbName, GT_RATES.metalEdgingLab.fallback)
  const _metalEdgeOpt = rowOpt(
    'Edging',
    { vendor: (edgingVendor || {}).metal, type: (edgingType || {}).metal || 'Metal' },
    EDGING_TYPES
  )
  const metalMat =
    n(metalEdgingLF) * p(_metalEdgeOpt.dbName, _metalEdgeOpt.fallback)

  // ── Preparation (Planting Bed Prep) ─────────────────────────────────────────
  // Area = Planter → existing Soil Prep rates; Area = Sod → independent Sod Soil
  // Prep rates (same defaults). Method = Hand adds an editable per-SF labor
  // coefficient — In-House ONLY (the Sub tab prices prep material the same way
  // but never gets the Hand labor add). soilLab/soilMat keep their downstream
  // wiring (base labor hours + total material).
  const _prepIsSub = state.subType === 'Subcontractor'
  const _prepBaseLab =
    prepArea === 'Sod'
      ? p(GT_RATES.sodPrepLab.dbName, GT_RATES.sodPrepLab.fallback)
      : p(GT_RATES.soilPrepLab.dbName, GT_RATES.soilPrepLab.fallback)
  const _prepBaseMat =
    prepArea === 'Sod'
      ? p(GT_RATES.sodPrepMat.dbName, GT_RATES.sodPrepMat.fallback)
      : p(GT_RATES.soilPrepMat.dbName, GT_RATES.soilPrepMat.fallback)
  const _prepHandAdd =
    prepMethod === 'Hand' && !_prepIsSub
      ? p(GT_RATES.soilPrepHandAdd.dbName, GT_RATES.soilPrepHandAdd.fallback)
      : 0
  const soilLab = n(soilPrepSF) * (_prepBaseLab + _prepHandAdd)
  const soilMat = n(soilPrepSF) * _prepBaseMat

  // ── Sod ────────────────────────────────────────────────────────────────────
  const sodLab = n(sodSF) * p(GT_RATES.sodLab.dbName, GT_RATES.sodLab.fallback)
  const sodT = resolveType(sodType, _opts.sod, SOD_TYPES)
  const sodMat = n(sodSF) * p(sodT.dbName, sodT.fallback)

  // Fertilizer — auto-figured bags from sod SF × coverage (SF/bag). Material only.
  let fertMat = 0
  const _fertV =
    sodFertilizerVendor && sodFertilizerVendor !== 'auto'
      ? sodFertilizerVendor
      : (catDefaults.Fertilizer || 'House')
  const fertT =
    _fertV && _fertV !== 'House'
      ? rowOpt('Fertilizer', { vendor: _fertV, type: sodFertilizer }, FERTILIZER_TYPES)
      : FERTILIZER_TYPES.find(t => t.label === sodFertilizer)
  const _fertSF = n(sodFertilizerSF) || n(sodSF)
  if (fertT && fertT.dbName && _fertSF > 0) {
    const sfPerBag = p(GT_RATES.fertilizerSFPerBag.dbName, GT_RATES.fertilizerSFPerBag.fallback)
    const bags = sfPerBag > 0 ? Math.ceil(_fertSF / sfPerBag) : 0
    fertMat = bags * p(fertT.dbName, fertT.fallback)
  }

  // ── Soils (optional amendment lines) ────────────────────────────────────────
  let soilsMat = 0
  ;(soilsRows || []).forEach(r => {
    if (!n(r.sf)) return
    const CY = (n(r.sf) * (n(r.depthIn) / 12)) / 27
    const st = rowOpt('Soils', r, SOIL_TYPES)
    soilsMat += CY * p(st.dbName, st.fallback)
  })

  // ── Steppers (Flagstone + Precast, Soil Set + Concrete Set) ─────────────────
  // Each of the 4 lines now resolves its own material rate from a per-line
  // Vendor + Type pick (House defaults → Flagstone/Precast so old estimates are
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
      const opt = rowOpt('Steppers', { vendor: _sv[ln.key], type: _st[ln.key] || ln.defType }, STEPPER_TYPES)
      const perTon = p(opt.dbName, opt.fallback)
      const sfPerDay = p(ln.labRate.dbName, ln.labRate.fallback)
      const lab = sfPerDay > 0 ? (n(ln.sf) / sfPerDay) * 8 : 0
      const mat = (n(ln.sf) / 80) * perTon
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
      const tons = (n(r.sf) * n(r.depth)) / 200
      const cement = r.cement === 'Yes'
      const dgt = rowOpt('DG', r, DG_TYPES)
      const baseHrs =
        r.method === 'Hand'
          ? (tons * 1.62) / dgHandRate + (n(r.sf) / 1000) * 8 + tons
          : ((tons * 1.62) / dgMachineRate) * 8 + (n(r.sf) / 1000) * 8 + tons
      dgLab += baseHrs + (cement ? tons * 1.25 : 0)
      dgMat +=
        (tons * p(dgt.dbName, dgt.fallback) +
          (cement
            ? tons * p(GT_RATES.dgCementPerTon.dbName, GT_RATES.dgCementPerTon.fallback)
            : 0)) *
        1.1
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
    const CY = (n(r.sf) * (n(r.depthIn) / 12)) / 27
    const machineRate = p(GT_RATES.gravelMachineLab.dbName, GT_RATES.gravelMachineLab.fallback)
    const handRate = p(GT_RATES.gravelHandLab.dbName, GT_RATES.gravelHandLab.fallback)
    const excavLab =
      r.method === 'Machine' ? ((CY * 1.62) / machineRate) * 8 : ((CY * 1.62) / handRate) * 8
    // Weed barrier — same fabric material + labor rate as DG's weed barrier.
    // Legacy rows (no weedFabric field) default to Yes so prior estimates that
    // always included fabric are unchanged.
    const wantFabric = (r.weedFabric ?? 'Yes') === 'Yes'
    const fabricLab = wantFabric
      ? n(r.sf) * p(GT_RATES.gravelFabricLab.dbName, GT_RATES.gravelFabricLab.fallback)
      : 0
    gravelLab += excavLab + fabricLab
    const gtype = rowOpt('Gravel', r, GRAVEL_TYPES)
    const costPerCY = p(gtype.dbName, gtype.fallback)
    gravelMat +=
      CY * costPerCY +
      (wantFabric ? n(r.sf) * p(GT_RATES.gravelFabricMat.dbName, GT_RATES.gravelFabricMat.fallback) : 0)
  })

  // ── Pebble rows (same calc/labor as Gravel; PEBBLE_TYPES material) ──────────
  let pebbleLab = 0,
    pebbleMat = 0
  ;(pebbleRows || []).forEach(r => {
    if (!n(r.sf)) return
    const CY = (n(r.sf) * (n(r.depthIn) / 12)) / 27
    const machineRate = p(GT_RATES.gravelMachineLab.dbName, GT_RATES.gravelMachineLab.fallback)
    const handRate = p(GT_RATES.gravelHandLab.dbName, GT_RATES.gravelHandLab.fallback)
    const excavLab =
      r.method === 'Machine' ? ((CY * 1.62) / machineRate) * 8 : ((CY * 1.62) / handRate) * 8
    // Weed barrier — same fabric material + labor rate as DG's weed barrier.
    const wantFabric = (r.weedFabric ?? 'Yes') === 'Yes'
    const fabricLab = wantFabric
      ? n(r.sf) * p(GT_RATES.gravelFabricLab.dbName, GT_RATES.gravelFabricLab.fallback)
      : 0
    pebbleLab += excavLab + fabricLab
    const ptype = rowOpt('Pebble', r, PEBBLE_TYPES)
    const costPerCY = p(ptype.dbName, ptype.fallback)
    pebbleMat +=
      CY * costPerCY +
      (wantFabric ? n(r.sf) * p(GT_RATES.gravelFabricMat.dbName, GT_RATES.gravelFabricMat.fallback) : 0)
  })

  // ── Cobbles & Boulders rows (same calc/labor as Gravel; COBBLE_TYPES) ───────
  let cobbleLab = 0,
    cobbleMat = 0
  ;(cobbleRows || []).forEach(r => {
    if (!n(r.sf)) return
    const CY = (n(r.sf) * (n(r.depthIn) / 12)) / 27
    const machineRate = p(GT_RATES.gravelMachineLab.dbName, GT_RATES.gravelMachineLab.fallback)
    const handRate = p(GT_RATES.gravelHandLab.dbName, GT_RATES.gravelHandLab.fallback)
    const excavLab =
      r.method === 'Machine' ? ((CY * 1.62) / machineRate) * 8 : ((CY * 1.62) / handRate) * 8
    const fabricLab =
      n(r.sf) * p(GT_RATES.gravelFabricLab.dbName, GT_RATES.gravelFabricLab.fallback)
    cobbleLab += excavLab + fabricLab
    const ctype = rowOpt('Cobbles', r, COBBLE_TYPES)
    const costPerCY = p(ctype.dbName, ctype.fallback)
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
    plasticLab +
    metalLab +
    soilLab +
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
    plasticMat +
    metalMat +
    soilMat +
    sodMat +
    fertMat +
    stepMat +
    dgMat +
    gravelMat +
    pebbleMat +
    cobbleMat +
    soilsMat +
    manMat
  const laborCost = totalHrs * lrph
  const burden = laborCost * (n(laborBurdenPct) || DEFAULTS.laborBurdenPct)
  // On the Sub tab the itemized scope's cost IS the subcontractor cost — labor +
  // burden + material + any manual sub — and profit is the markup (Sub GP). The
  // in-house GP model applies only to the In-House tab.
  const isSubTab = state.subType === 'Subcontractor'
  const subMarkup = n(state.subGpMarkupRate) || 0.2
  let gp, subCost, subGp, commission, price
  if (isSubTab) {
    gp = 0
    subCost = totalMat + laborCost + burden + manSub
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
    walkHrs,
    totalHrs,
    manDays,
    totalMat,
    laborCost,
    burden,
    gp,
    subGp,
    commission,
    subCost,
    price,
    // section breakdowns for summary
    mulchLab,
    mulchMat,
    plasticLab,
    plasticMat,
    metalLab,
    metalMat,
    soilLab,
    soilMat,
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
    <div className="bg-gray-50 rounded-lg px-4 py-2.5 border border-gray-200 mb-2">
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

// Per-section Vendor picker. "House" (default) keeps the hardcoded type list;
// selecting a vendor filters that section's Type dropdown to the vendor's
// products at the vendor's price (from material_rates).
function VendorPicker({ vendors = [], value = 'House', onChange, label = 'Vendor' }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-xs text-gray-500">{label}:</span>
      <select
        className="input text-sm py-1"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        <option value="House">Unspecified</option>
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
  { sf: '', method: 'Hand', type: 'Crushed Pea Gravel', depthIn: '3', weedFabric: 'Yes', vendor: 'auto' },
  { sf: '', method: 'Hand', type: 'Crushed Pea Gravel', depthIn: '3', weedFabric: 'Yes', vendor: 'auto' },
]
const DEFAULT_SOILS_ROWS = [
  { type: 'Topsoil (Sandy Loam)', sf: '', depthIn: '2', vendor: 'auto' },
  { type: 'Topsoil (Sandy Loam)', sf: '', depthIn: '2', vendor: 'auto' },
]
const DEFAULT_PEBBLE_ROWS = [
  { sf: '', method: 'Hand', type: 'Arizona River Rock', depthIn: '3', weedFabric: 'Yes', vendor: 'auto' },
  { sf: '', method: 'Hand', type: 'Arizona River Rock', depthIn: '3', weedFabric: 'Yes', vendor: 'auto' },
]
const DEFAULT_COBBLE_ROWS = [
  { sf: '', method: 'Hand', type: 'Granite River Rock', depthIn: '3', vendor: 'auto' },
  { sf: '', method: 'Hand', type: 'Granite River Rock', depthIn: '3', vendor: 'auto' },
]
const DEFAULT_MULCH_ROWS = [
  { type: 'Premium Mulch', sf: '', depth: '2', weedFabric: 'No', vendor: 'auto' },
  { type: 'Premium Mulch', sf: '', depth: '2', weedFabric: 'No', vendor: 'auto' },
]
const DEFAULT_DG_ROWS = [
  { type: 'Decomposed Granite', sf: '', depth: '3.5', weedFabric: 'No', method: 'Machine', cement: 'No', vendor: 'auto' },
  { type: 'Decomposed Granite', sf: '', depth: '3.5', weedFabric: 'No', method: 'Machine', cement: 'No', vendor: 'auto' },
]
const DEFAULT_MANUAL_ROWS = [
  { label: 'Misc 1', hours: '', materials: '', subCost: '' },
  { label: 'Misc 2', hours: '', materials: '', subCost: '' },
  { label: 'Misc 3', hours: '', materials: '', subCost: '' },
]
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
            { type: 'Premium Mulch', sf: '', depth: '2', weedFabric: 'No' },
          ]
        : DEFAULT_MULCH_ROWS.map(r => ({ ...r }))),
    plasticEdgingLF: src.plasticEdgingLF ?? '',
    metalEdgingLF: src.metalEdgingLF ?? '',
    soilPrepSF: src.soilPrepSF ?? '',
    // Preparation section — Method (Tiller default / Hand adds per-SF labor) and
    // Area (Planter default → Soil Prep rates / Sod → Sod Soil Prep rates).
    prepMethod: src.prepMethod ?? 'Tiller',
    prepArea: src.prepArea ?? 'Planter',
    sodSoilPrepSF: src.sodSoilPrepSF ?? '',
    sodSoilPrepVendor: src.sodSoilPrepVendor ?? 'House',
    sodSoilPrepType: src.sodSoilPrepType ?? 'Soil Prep',
    sodFertilizerSF: src.sodFertilizerSF ?? '',
    sodSF: src.sodSF ?? '',
    sodType: src.sodType ?? 'Marathon',
    sodFertilizer: src.sodFertilizer ?? 'None',
    flagstoneSoilSF: src.flagstoneSoilSF ?? '',
    flagstoneConcreteSF: src.flagstoneConcreteSF ?? '',
    precastSoilSF: src.precastSoilSF ?? '',
    precastConcreteSF: src.precastConcreteSF ?? '',
    stepperVendor:
      src.stepperVendor ?? { flagSoil: 'House', flagConc: 'House', precSoil: 'House', precConc: 'House' },
    stepperType:
      src.stepperType ?? { flagSoil: 'Flagstone', flagConc: 'Flagstone', precSoil: 'Precast', precConc: 'Precast' },
    edgingVendor: src.edgingVendor ?? { plastic: 'House', metal: 'House' },
    edgingType: src.edgingType ?? { plastic: 'Plastic', metal: 'Metal' },
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
            { type: 'Decomposed Granite', sf: '', depth: '3.5', weedFabric: 'No', method: 'Machine', cement: 'No' },
          ]
        : DEFAULT_DG_ROWS.map(r => ({ ...r }))),
    gravelRows: src.gravelRows ?? DEFAULT_GRAVEL_ROWS.map(r => ({ ...r })),
    soilsRows: src.soilsRows ?? DEFAULT_SOILS_ROWS.map(r => ({ ...r })),
    pebbleRows: src.pebbleRows ?? DEFAULT_PEBBLE_ROWS.map(r => ({ ...r })),
    cobbleRows: src.cobbleRows ?? DEFAULT_COBBLE_ROWS.map(r => ({ ...r })),
    manualRows: src.manualRows ?? DEFAULT_MANUAL_ROWS.map(r => ({ ...r })),
    sodVendor: src.sodVendor ?? 'House',
    sodFertilizerVendor: src.sodFertilizerVendor ?? 'House',
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
  // Full material_rates rows (name/unit_cost/subcategory/vendor_id) — used to build
  // vendor-filtered Type option lists. Vendors list (id/company_name) for pickers.
  const [materialRows, setMaterialRows] = useState([])
  const [vendors, setVendors] = useState([])

  // Load the full material rows + vendors used to build vendor-filtered Type
  // lists. Kept separate so it can run even when a saved estimate supplies a
  // materialPrices snapshot (so the vendor pickers still work on re-edit).
  const loadVendorData = useCallback(async () => {
    const [matRowsRes, venRes] = await Promise.all([
      supabase
        .from('material_rates')
        .select('name, unit_cost, subcategory, vendor_id')
        .eq('category', 'Ground Treatments'),
      supabase.from('subs_vendors').select('id, company_name, supplied_categories').eq('type', 'vendor').order('company_name'),
    ])
    setMaterialRows(matRowsRes.data || [])
    setVendors(
      (venRes.data || []).map(v => ({
        id: v.id,
        name: v.company_name,
        categories: v.supplied_categories || [],
      }))
    )
  }, [])

  // Re-fetch the merged labor+material rate map. Called on mount and after any
  // RateEditPopover save so the calc reflects edits. Also refreshes the full
  // material rows + vendors that drive the vendor-filtered Type lists.
  const refreshAllRates = useCallback(async () => {
    const [matRes, labRes, matRowsRes, venRes] = await Promise.all([
      supabase.from('material_rates').select('name, unit_cost').eq('category', 'Ground Treatments'),
      supabase.from('labor_rates').select('name, rate').eq('category', 'Ground Treatments'),
      supabase
        .from('material_rates')
        .select('name, unit_cost, subcategory, vendor_id')
        .eq('category', 'Ground Treatments'),
      supabase.from('subs_vendors').select('id, company_name, supplied_categories').eq('type', 'vendor').order('company_name'),
    ])
    const prices = {}
    ;(matRes.data || []).forEach(r => {
      prices[r.name] = parseFloat(r.unit_cost) || 0
    })
    ;(labRes.data || []).forEach(r => {
      prices[r.name] = parseFloat(r.rate) || 0
    })
    setMaterialPrices(prices)
    setMaterialRows(matRowsRes.data || [])
    setVendors(
      (venRes.data || []).map(v => ({
        id: v.id,
        name: v.company_name,
        categories: v.supplied_categories || [],
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

  const state = { crewType, subType, subGpMarkupRate, ...cur, materialRows }

  // Build a section's Type option list. 'House' → hardcoded array (unchanged).
  // A vendor → that vendor's products for the section's subcategory, priced at
  // the vendor's unit_cost. Falls back to the House array if the vendor has no
  // rows for the subcategory (so the dropdown is never empty).
  function sectionOptions(subcat, vendorSel, houseArray) {
    if (!vendorSel || vendorSel === 'House') return houseArray
    const opts = catalogOptions(materialRows, subcat, vendorSel, { houseRows: 'exclude', stripPrefix: true })
    if (!opts.length) return houseArray
    return opts.map(o => ({ label: o.label || o.row.name, dbName: o.row.name, fallback: n(o.row.unit_cost) }))
  }

  // Vendors that supply a given material category — drives the per-row vendor
  // dropdowns so each row only offers vendors that carry that category.
  const vendorsForCategory = cat => vendors.filter(v => (v.categories || []).includes(cat))
  // First real vendor supplying a category (else 'House').
  const defaultVendorFor = cat => vendorsForCategory(cat)[0]?.id || 'House'

  // On a NEW module, once vendor catalogs load, default each section's vendor to
  // the first real vendor that supplies its category (House then falls to the
  // bottom of the picker). Runs once; never overrides a saved estimate or an
  // explicit user pick.
  const [vendorDefaultsApplied, setVendorDefaultsApplied] = useState(false)
  useEffect(() => {
    // Only skip for a genuinely SAVED estimate (has a price snapshot). A new
    // module always receives a non-empty initialData (gpmd/notes/etc.), so
    // guarding on `initialData` alone would wrongly suppress the defaults.
    if (vendorDefaultsApplied || initialData?.materialPrices || !vendors.length) return
    setVendorDefaultsApplied(true)
    // A field/row that hasn't been explicitly set yet — the 'auto' sentinel that
    // default rows ship with, a leftover 'House', or an empty value. Only these
    // get pushed to the category's first real vendor; an explicit user pick stays.
    const needsDefault = v => !v || v === 'House' || v === 'auto'
    const migRows = (cat, rows) =>
      (rows || []).map(r => (needsDefault(r.vendor) ? { ...r, vendor: defaultVendorFor(cat) } : r))
    const migMap = (obj, cat) => {
      const d = defaultVendorFor(cat)
      const nv = { ...(obj || {}) }
      Object.keys(nv).forEach(k => {
        if (needsDefault(nv[k])) nv[k] = d
      })
      return nv
    }
    // Migrate BOTH tabs so each independent calculator gets its section vendor
    // defaults (In-House and Sub stay separate).
    const migTab = t => ({
      ...t,
      gravelRows: migRows('Gravel', t.gravelRows),
      pebbleRows: migRows('Pebble', t.pebbleRows),
      cobbleRows: migRows('Cobbles', t.cobbleRows),
      soilsRows: migRows('Soils', t.soilsRows),
      mulchRows: migRows('Mulch', t.mulchRows),
      dgRows: migRows('DG', t.dgRows),
      sodVendor: needsDefault(t.sodVendor) ? defaultVendorFor('Sod') : t.sodVendor,
      sodFertilizerVendor: needsDefault(t.sodFertilizerVendor)
        ? defaultVendorFor('Fertilizer')
        : t.sodFertilizerVendor,
      sodSoilPrepVendor: needsDefault(t.sodSoilPrepVendor)
        ? defaultVendorFor('Soil Prep')
        : t.sodSoilPrepVendor,
      stepperVendor: migMap(t.stepperVendor, 'Steppers'),
      edgingVendor: migMap(t.edgingVendor, 'Edging'),
    })
    setIhTab(migTab)
    setSubTab(migTab)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendors, initialData, vendorDefaultsApplied])

  const sodOpts = sectionOptions('Sod', sodVendor, SOD_TYPES)
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
    const first = sectionOptions('Sod', v, SOD_TYPES)[0]?.label
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

  return (
    <SubTabContext.Provider value={isSub}>
    <div className="space-y-5">
      {/* ── Sticky GPMD bar ── */}
      <div className="sticky top-0 z-20 -mx-6 px-6 pt-1 pb-1 bg-gray-900 shadow-lg">
        {/* GPMD summary bar */}
        <GpmdBar
          variant={subType === 'Subcontractor' ? 'sub' : 'inhouse'}
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

      {/* Notes — pinned in its own sticky container just below the
          GPMD bar. Plain white textarea, no card chrome. */}
      <div className="sticky top-[56px] z-10 -mx-6 px-6 pt-2 pb-2 mt-2 bg-transparent">
        <ModuleNotesField value={notes} onChange={setNotes} />
      </div>

      <WorkTypeChooser value={subType || 'In-House'} onChange={setSubType} />

      {/* Crew Type */}
      <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-2.5 border border-gray-200">
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Crew Type</label>
        <select
          value={crewType}
          onChange={e => setCrewType(e.target.value)}
          className="input text-sm py-1 w-36"
        >
          <option value="Demo">Demo</option>
          <option value="Landscape">Landscape</option>
          <option value="Masonry">Masonry</option>
          <option value="Paver">Paver</option>
          <option value="Specialty">Specialty</option>
        </select>
      </div>

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

      {/* ── Preparation ── */}
      <div>
        <SectionHeader title="Preparation" />
        <div className="space-y-0">
          {(() => {
            const isSodArea = prepArea === 'Sod'
            const matName = isSodArea ? GT_RATES.sodPrepMat.dbName : GT_RATES.soilPrepMat.dbName
            const matVal = isSodArea
              ? p(GT_RATES.sodPrepMat.dbName, GT_RATES.sodPrepMat.fallback)
              : p(GT_RATES.soilPrepMat.dbName, GT_RATES.soilPrepMat.fallback)
            const labName = isSodArea ? GT_RATES.sodPrepLab.dbName : GT_RATES.soilPrepLab.dbName
            const labVal = isSodArea
              ? p(GT_RATES.sodPrepLab.dbName, GT_RATES.sodPrepLab.fallback)
              : p(GT_RATES.soilPrepLab.dbName, GT_RATES.soilPrepLab.fallback)
            const handAdd = p(GT_RATES.soilPrepHandAdd.dbName, GT_RATES.soilPrepHandAdd.fallback)
            const isSubTab = subType === 'Subcontractor'
            return (
              <LabeledRow
                label="Till and Amend"
                note={n(soilPrepSF) > 0 ? `$${(n(soilPrepSF) * matVal).toFixed(2)} mat` : null}
              >
                <select
                  className="input text-sm py-1.5 w-28"
                  value={prepMethod}
                  onChange={e => setPrepMethod(e.target.value)}
                  title="Method"
                >
                  <option value="Tiller">Tiller</option>
                  <option value="Hand">Hand</option>
                </select>
                <select
                  className="input text-sm py-1.5 w-28"
                  value={prepArea}
                  onChange={e => setPrepArea(e.target.value)}
                  title="Area"
                >
                  <option value="Planter">Planter</option>
                  <option value="Sod">Sod</option>
                </select>
                <NumInput
                  value={soilPrepSF}
                  onChange={setSoilPrepSF}
                  placeholder="SF"
                  className="w-28"
                />
                <span className="text-xs text-gray-400 inline-flex items-center gap-1 flex-wrap">
                  ${matVal.toFixed(4)}/SF
                  <RateEditPopover
                    table="material_rates"
                    name={matName}
                    category="Ground Treatments"
                    unitLabel="SF"
                    currentValue={matVal}
                    onSaved={refreshAllRates}
                  />
                  <RateEditPopover
                    table="labor_rates"
                    name={labName}
                    category="Ground Treatments"
                    mode="coefficient"
                    unitLabel="hrs/SF"
                    currentValue={labVal}
                    onSaved={refreshAllRates}
                  />
                  {prepMethod === 'Hand' && (
                    <>
                      · Hand{isSubTab ? ' (In-House only)' : ` +${handAdd} hrs/SF`}
                      <RateEditPopover
                        table="labor_rates"
                        name={GT_RATES.soilPrepHandAdd.dbName}
                        category="Ground Treatments"
                        mode="coefficient"
                        unitLabel="hrs/SF"
                        currentValue={handAdd}
                        onSaved={refreshAllRates}
                      />
                    </>
                  )}
                </span>
              </LabeledRow>
            )
          })()}
        </div>
      </div>

      {/* ── Soils ── */}
      <div>
        <SectionHeader title="Soils" />
        <p className="text-xs text-gray-400 mb-2">Optional soil / amendment lines (material only). Vendor is per-row.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1 pr-1 font-medium">Vendor</th>
                <th className="text-left pb-1 pr-1 font-medium">Type</th>
                <th className="text-left pb-1 pr-1 font-medium">Area (SF)</th>
                <th className="text-left pb-1 pr-1 font-medium">Depth (in)</th>
                <th className="text-left pb-1 pr-1 font-medium">$/CY</th>
                <th className="text-right pb-1 font-medium text-gray-400">Material $</th>
              </tr>
            </thead>
            <tbody>
              {soilsRows.map((row, i) => {
                const rowOpts = sectionOptions('Soils', row.vendor, SOIL_TYPES)
                const st = resolveType(row.type, rowOpts, SOIL_TYPES)
                const typeCost = p(st.dbName, st.fallback)
                const CY = (n(row.sf) * (n(row.depthIn) / 12)) / 27
                const mat = CY * typeCost
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5"
                        value={row.vendor || 'House'}
                        onChange={e => changeRowVendor('Soils', SOIL_TYPES, updateSoils, i, e.target.value)}
                      >
                        <option value="House">Unspecified</option>
                        {vendorsForCategory('Soils').map(v => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5"
                        value={row.type || rowOpts[0]?.label}
                        onChange={e => updateSoils(i, 'type', e.target.value)}
                      >
                        {rowOpts.map(t => (
                          <option key={t.label} value={t.label}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1 pr-1">
                      <NumInput value={row.sf} onChange={v => updateSoils(i, 'sf', v)} className="w-16" />
                    </td>
                    <td className="py-1 pr-1">
                      <NumInput
                        value={row.depthIn}
                        onChange={v => updateSoils(i, 'depthIn', v)}
                        placeholder="2"
                        className="w-20"
                      />
                    </td>
                    <td className="py-1 pr-1">
                      <span className="text-xs text-gray-500 inline-flex items-center gap-1 whitespace-nowrap">
                        ${typeCost.toFixed(2)}/CY
                        <RateEditPopover
                          table="material_rates"
                          name={st.dbName}
                          category="Ground Treatments"
                          unitLabel="CY"
                          currentValue={typeCost}
                          onSaved={refreshAllRates}
                        />
                      </span>
                    </td>
                    <td className="py-1 text-right text-xs text-gray-600">
                      <div className="flex items-center justify-end gap-1">
                        <span>{n(row.sf) > 0 ? `$${mat.toFixed(2)}` : '—'}</span>
                        {soilsRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setSoilsRows(rows => rows.filter((_, idx) => idx !== i))}
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
              setSoilsRows(r => [
                ...r,
                { type: SOIL_TYPES[0]?.label ?? 'Topsoil (Sandy Loam)', sf: '', depthIn: '2', vendor: defaultVendorFor('Soils') },
              ])
            }
          >
            + Add line
          </button>
        </div>
      </div>

      {/* ── Sod ── */}
      <div>
        <SectionHeader title="Sod" />
        <div className="space-y-0">
          <LabeledRow label="Sod">
            <select
              className="input text-sm py-1.5 w-32"
              value={sodVendor}
              onChange={e => changeSodVendor(e.target.value)}
              title="Vendor"
            >
              <option value="House">Unspecified</option>
              {vendorsForCategory('Sod').map(v => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            <select
              className="input text-sm py-1.5 flex-1"
              value={sodType}
              onChange={e => setSodType(e.target.value)}
            >
              {sodOpts.map(t => (
                <option key={t.label} value={t.label}>
                  {t.label}
                </option>
              ))}
            </select>
            <NumInput value={sodSF} onChange={setSodSF} placeholder="SF" className="w-24" />
            <span className="text-xs text-gray-400 inline-flex items-center gap-1">
              {(() => {
                const st = resolveType(sodType, sodOpts, SOD_TYPES)
                return (
                  <>
                    ${p(st.dbName, st.fallback).toFixed(2)}/SF
                    <RateEditPopover
                      table="material_rates"
                      name={st.dbName}
                      category="Ground Treatments"
                      unitLabel="SF"
                      currentValue={p(st.dbName, st.fallback)}
                      onSaved={refreshAllRates}
                    />
                  </>
                )
              })()}
              <RateEditPopover
                table="labor_rates"
                name={GT_RATES.sodLab.dbName}
                category="Ground Treatments"
                mode="coefficient"
                unitLabel="hrs/SF"
                currentValue={p(GT_RATES.sodLab.dbName, GT_RATES.sodLab.fallback)}
                onSaved={refreshAllRates}
              />
            </span>
            {n(sodSF) > 0 && (
              <span className="text-xs text-gray-400">
                $
                {(() => {
                  const st = resolveType(sodType, sodOpts, SOD_TYPES)
                  return (n(sodSF) * p(st.dbName, st.fallback)).toFixed(2)
                })()}{' '}
                mat
              </span>
            )}
          </LabeledRow>
          <LabeledRow label="Fertilizer">
            <select
              className="input text-sm py-1.5 w-32"
              value={sodFertilizerVendor}
              onChange={e => {
                const v = e.target.value
                setSodFertilizerVendor(v)
                const opts =
                  v === 'House'
                    ? FERTILIZER_TYPES
                    : [FERTILIZER_TYPES[0], ...sectionOptions('Fertilizer', v, [])]
                if (!opts.some(o => o.label === sodFertilizer)) setSodFertilizer(opts[0].label)
              }}
              title="Vendor"
            >
              <option value="House">Unspecified</option>
              {vendorsForCategory('Fertilizer').map(v => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            <select
              className="input text-sm py-1.5 flex-1"
              value={sodFertilizer}
              onChange={e => setSodFertilizer(e.target.value)}
            >
              {(sodFertilizerVendor === 'House'
                ? FERTILIZER_TYPES
                : [FERTILIZER_TYPES[0], ...sectionOptions('Fertilizer', sodFertilizerVendor, [])]
              ).map(t => (
                <option key={t.label} value={t.label}>
                  {t.label}
                </option>
              ))}
            </select>
            <NumInput
              value={sodFertilizerSF}
              onChange={setSodFertilizerSF}
              placeholder="SF"
              className="w-24"
            />
            {(() => {
              const ft =
                sodFertilizerVendor === 'House'
                  ? FERTILIZER_TYPES.find(t => t.label === sodFertilizer)
                  : resolveType(
                      sodFertilizer,
                      [FERTILIZER_TYPES[0], ...sectionOptions('Fertilizer', sodFertilizerVendor, [])],
                      FERTILIZER_TYPES
                    )
              if (!ft || !ft.dbName) return null
              const sfPerBag = p(
                GT_RATES.fertilizerSFPerBag.dbName,
                GT_RATES.fertilizerSFPerBag.fallback
              )
              const fertSF = n(sodFertilizerSF) || n(sodSF)
              const bags = sfPerBag > 0 && fertSF > 0 ? Math.ceil(fertSF / sfPerBag) : 0
              return (
                <span className="text-xs text-gray-400 inline-flex items-center gap-1 flex-wrap">
                  ${p(ft.dbName, ft.fallback).toFixed(2)}/bag
                  <RateEditPopover
                    table="material_rates"
                    name={ft.dbName}
                    category="Ground Treatments"
                    unitLabel="bag"
                    currentValue={p(ft.dbName, ft.fallback)}
                    onSaved={refreshAllRates}
                  />
                  · 1 bag / {sfPerBag} SF
                  <RateEditPopover
                    table="labor_rates"
                    name={GT_RATES.fertilizerSFPerBag.dbName}
                    category="Ground Treatments"
                    mode="coefficient"
                    unitLabel="SF/bag"
                    currentValue={sfPerBag}
                    onSaved={refreshAllRates}
                  />
                  {bags > 0 && (
                    <span className="text-gray-500">
                      = {bags} bag{bags > 1 ? 's' : ''} · ${(bags * p(ft.dbName, ft.fallback)).toFixed(2)}
                    </span>
                  )}
                </span>
              )
            })()}
          </LabeledRow>
        </div>
      </div>

      {/* ── Mulch ── */}
      <div>
        <SectionHeader title="Mulch" />
        <p className="text-xs text-gray-400 mb-2 inline-flex items-center flex-wrap gap-x-2">
          <span className="inline-flex items-center gap-1">
            {(() => {
              const mt = resolveType(
                mulchRows[0]?.type,
                sectionOptions('Mulch', mulchRows[0]?.vendor, MULCH_TYPES),
                MULCH_TYPES
              )
              return (
                <>
                  Type ${p(mt.dbName, mt.fallback).toFixed(2)}/CY
                  <RateEditPopover
                    table="material_rates"
                    name={mt.dbName}
                    category="Ground Treatments"
                    unitLabel="CY"
                    currentValue={p(mt.dbName, mt.fallback)}
                    onSaved={refreshAllRates}
                  />
                </>
              )
            })()}
          </span>
          ·
          <span className="inline-flex items-center gap-1">
            ${p(GT_RATES.mulchDelivery.dbName, 75).toFixed(2)} delivery
            <RateEditPopover
              table="material_rates"
              name={GT_RATES.mulchDelivery.dbName}
              category="Ground Treatments"
              unitLabel="flat"
              currentValue={p(GT_RATES.mulchDelivery.dbName, GT_RATES.mulchDelivery.fallback)}
              onSaved={refreshAllRates}
            />
          </span>
          ·
          <span className="inline-flex items-center gap-1">
            {p(GT_RATES.mulchLab.dbName, 15)} CY/day labor
            <RateEditPopover
              table="labor_rates"
              name={GT_RATES.mulchLab.dbName}
              category="Ground Treatments"
              mode="coefficient"
              unitLabel="CY/day"
              currentValue={p(GT_RATES.mulchLab.dbName, GT_RATES.mulchLab.fallback)}
              onSaved={refreshAllRates}
            />
          </span>
          ·
          <span className="inline-flex items-center gap-1">
            Weed fabric ${p(GT_RATES.gravelFabricMat.dbName, 0.1).toFixed(2)}/SF
            <RateEditPopover
              table="material_rates"
              name={GT_RATES.gravelFabricMat.dbName}
              category="Ground Treatments"
              unitLabel="SF"
              currentValue={p(GT_RATES.gravelFabricMat.dbName, GT_RATES.gravelFabricMat.fallback)}
              onSaved={refreshAllRates}
            />
            · {p(GT_RATES.gravelFabricLab.dbName, 0.024)} hrs/SF
            <RateEditPopover
              table="labor_rates"
              name={GT_RATES.gravelFabricLab.dbName}
              category="Ground Treatments"
              mode="coefficient"
              unitLabel="hrs/SF"
              currentValue={p(GT_RATES.gravelFabricLab.dbName, GT_RATES.gravelFabricLab.fallback)}
              onSaved={refreshAllRates}
            />
          </span>
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1 pr-1 font-medium">Vendor</th>
                <th className="text-left pb-1 pr-1 font-medium">Type</th>
                <th className="text-left pb-1 pr-1 font-medium">Area (SF)</th>
                <th className="text-left pb-1 pr-1 font-medium">Depth (in)</th>
                <th className="text-left pb-1 pr-1 font-medium">$/CY</th>
                <th className="text-left pb-1 font-medium">Weed Fabric</th>
              </tr>
            </thead>
            <tbody>
              {mulchRows.map((row, i) => {
                const rowOpts = sectionOptions('Mulch', row.vendor, MULCH_TYPES)
                const mt = resolveType(row.type, rowOpts, MULCH_TYPES)
                const typeCost = p(mt.dbName, mt.fallback)
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5"
                        value={row.vendor || 'House'}
                        onChange={e => changeRowVendor('Mulch', MULCH_TYPES, updateMulch, i, e.target.value)}
                      >
                        <option value="House">Unspecified</option>
                        {vendorsForCategory('Mulch').map(v => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5"
                        value={row.type || rowOpts[0]?.label}
                        onChange={e => updateMulch(i, 'type', e.target.value)}
                      >
                        {rowOpts.map(t => (
                          <option key={t.label} value={t.label}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1 pr-1">
                      <NumInput value={row.sf} onChange={v => updateMulch(i, 'sf', v)} className="w-16" />
                    </td>
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5 w-20"
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
                      <span className="text-xs text-gray-500 inline-flex items-center gap-1 whitespace-nowrap">
                        ${typeCost.toFixed(2)}/CY
                        <RateEditPopover
                          table="material_rates"
                          name={mt.dbName}
                          category="Ground Treatments"
                          unitLabel="CY"
                          currentValue={typeCost}
                          onSaved={refreshAllRates}
                        />
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
                { type: MULCH_TYPES[0]?.label ?? 'Premium Mulch', sf: '', depth: '2', weedFabric: 'No', vendor: defaultVendorFor('Mulch') },
              ])
            }
            className="mt-1 text-xs text-green-700 hover:text-green-900 font-medium"
          >
            + Add line
          </button>
        </div>
      </div>

      {/* ── Decomposed Granite ── */}
      <div>
        <SectionHeader title="Decomposed Granite (D.G.)" />
        <p className="text-xs text-gray-400 mb-2 inline-flex items-center flex-wrap gap-x-2">
          <span className="inline-flex items-center gap-1">
            {(() => {
              const dt = resolveType(
                dgRows[0]?.type,
                sectionOptions('DG', dgRows[0]?.vendor, DG_TYPES),
                DG_TYPES
              )
              return (
                <>
                  Type ${p(dt.dbName, dt.fallback).toFixed(2)}/ton
                  <RateEditPopover
                    table="material_rates"
                    name={dt.dbName}
                    category="Ground Treatments"
                    unitLabel="ton"
                    currentValue={p(dt.dbName, dt.fallback)}
                    onSaved={refreshAllRates}
                  />
                </>
              )
            })()}
          </span>
          ·
          <span className="inline-flex items-center gap-1">
            Cement add ${p(GT_RATES.dgCementPerTon.dbName, 20).toFixed(2)}/ton
            <RateEditPopover
              table="material_rates"
              name={GT_RATES.dgCementPerTon.dbName}
              category="Ground Treatments"
              unitLabel="ton"
              currentValue={p(GT_RATES.dgCementPerTon.dbName, GT_RATES.dgCementPerTon.fallback)}
              onSaved={refreshAllRates}
            />
          </span>
          ·
          <span className="inline-flex items-center gap-1">
            Hand {p(GT_RATES.dgHandLab.dbName, 0.5)} CY/hr labor
            <RateEditPopover
              table="labor_rates"
              name={GT_RATES.dgHandLab.dbName}
              category="Ground Treatments"
              mode="coefficient"
              unitLabel="CY/hr"
              currentValue={p(GT_RATES.dgHandLab.dbName, GT_RATES.dgHandLab.fallback)}
              onSaved={refreshAllRates}
            />
          </span>
          ·
          <span className="inline-flex items-center gap-1">
            Machine {p(GT_RATES.dgMachineLab.dbName, 12)} CY/day labor
            <RateEditPopover
              table="labor_rates"
              name={GT_RATES.dgMachineLab.dbName}
              category="Ground Treatments"
              mode="coefficient"
              unitLabel="CY/day"
              currentValue={p(GT_RATES.dgMachineLab.dbName, GT_RATES.dgMachineLab.fallback)}
              onSaved={refreshAllRates}
            />
          </span>
          ·
          <span className="inline-flex items-center gap-1">
            Weed fabric ${p(GT_RATES.gravelFabricMat.dbName, 0.1).toFixed(2)}/SF
            <RateEditPopover
              table="material_rates"
              name={GT_RATES.gravelFabricMat.dbName}
              category="Ground Treatments"
              unitLabel="SF"
              currentValue={p(GT_RATES.gravelFabricMat.dbName, GT_RATES.gravelFabricMat.fallback)}
              onSaved={refreshAllRates}
            />
            · {p(GT_RATES.gravelFabricLab.dbName, 0.024)} hrs/SF
            <RateEditPopover
              table="labor_rates"
              name={GT_RATES.gravelFabricLab.dbName}
              category="Ground Treatments"
              mode="coefficient"
              unitLabel="hrs/SF"
              currentValue={p(GT_RATES.gravelFabricLab.dbName, GT_RATES.gravelFabricLab.fallback)}
              onSaved={refreshAllRates}
            />
          </span>
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1 pr-1 font-medium">Vendor</th>
                <th className="text-left pb-1 pr-1 font-medium">Type</th>
                <th className="text-left pb-1 pr-1 font-medium">Area (SF)</th>
                <th className="text-left pb-1 pr-1 font-medium">Depth (in)</th>
                <th className="text-left pb-1 pr-1 font-medium">Weed Fabric</th>
                <th className="text-left pb-1 pr-1 font-medium">Method</th>
                <th className="text-left pb-1 font-medium">Cement</th>
              </tr>
            </thead>
            <tbody>
              {dgRows.map((row, i) => {
                const rowOpts = sectionOptions('DG', row.vendor, DG_TYPES)
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5"
                        value={row.vendor || 'House'}
                        onChange={e => changeRowVendor('DG', DG_TYPES, updateDg, i, e.target.value)}
                      >
                        <option value="House">Unspecified</option>
                        {vendorsForCategory('DG').map(v => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5"
                        value={row.type || rowOpts[0]?.label}
                        onChange={e => updateDg(i, 'type', e.target.value)}
                      >
                        {rowOpts.map(t => (
                          <option key={t.label} value={t.label}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1 pr-1">
                      <NumInput value={row.sf} onChange={v => updateDg(i, 'sf', v)} className="w-16" />
                    </td>
                    <td className="py-1 pr-1">
                      <NumInput
                        value={row.depth}
                        onChange={v => updateDg(i, 'depth', v)}
                        placeholder="3.5"
                        className="w-20"
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
                  type: DG_TYPES[0]?.label ?? 'Decomposed Granite',
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
            + Add line
          </button>
          {(n(calc.dgMat) > 0 || n(calc.dgLab) > 0) && (
            <div className="mt-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-gray-600 flex gap-6">
              <span>
                Material: <strong>${calc.dgMat.toFixed(2)}</strong>
              </span>
              <span>
                Labor: <strong>{calc.dgLab.toFixed(2)} hrs</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Gravel ── */}
      <div>
        <SectionHeader title="Gravel" />
        <p className="text-xs text-gray-400 mb-2 inline-flex items-center flex-wrap gap-x-2">
          <span className="inline-flex items-center gap-1">
            Fabric ${p(GT_RATES.gravelFabricMat.dbName, 0.1).toFixed(2)}/SF mat
            <RateEditPopover
              table="material_rates"
              name={GT_RATES.gravelFabricMat.dbName}
              category="Ground Treatments"
              unitLabel="SF"
              currentValue={p(GT_RATES.gravelFabricMat.dbName, GT_RATES.gravelFabricMat.fallback)}
              onSaved={refreshAllRates}
            />
            · {p(GT_RATES.gravelFabricLab.dbName, 0.024)} hrs/SF labor
            <RateEditPopover
              table="labor_rates"
              name={GT_RATES.gravelFabricLab.dbName}
              category="Ground Treatments"
              mode="coefficient"
              unitLabel="hrs/SF"
              currentValue={p(GT_RATES.gravelFabricLab.dbName, GT_RATES.gravelFabricLab.fallback)}
              onSaved={refreshAllRates}
            />
          </span>
          ·
          <span className="inline-flex items-center gap-1">
            Machine excav {p(GT_RATES.gravelMachineLab.dbName, 12)} CY/day
            <RateEditPopover
              table="labor_rates"
              name={GT_RATES.gravelMachineLab.dbName}
              category="Ground Treatments"
              mode="coefficient"
              unitLabel="CY/day"
              currentValue={p(GT_RATES.gravelMachineLab.dbName, GT_RATES.gravelMachineLab.fallback)}
              onSaved={refreshAllRates}
            />
          </span>
          ·
          <span className="inline-flex items-center gap-1">
            Hand excav {p(GT_RATES.gravelHandLab.dbName, 4)} CY/day
            <RateEditPopover
              table="labor_rates"
              name={GT_RATES.gravelHandLab.dbName}
              category="Ground Treatments"
              mode="coefficient"
              unitLabel="CY/day"
              currentValue={p(GT_RATES.gravelHandLab.dbName, GT_RATES.gravelHandLab.fallback)}
              onSaved={refreshAllRates}
            />
          </span>
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1 pr-1 font-medium">Vendor</th>
                <th className="text-left pb-1 pr-1 font-medium">Type</th>
                <th className="text-left pb-1 pr-1 font-medium">SF</th>
                <th className="text-left pb-1 pr-1 font-medium">Method</th>
                <th className="text-left pb-1 pr-1 font-medium">$/CY</th>
                <th className="text-left pb-1 pr-1 font-medium">Weed Barrier</th>
                <th className="text-left pb-1 font-medium">Depth (in)</th>
              </tr>
            </thead>
            <tbody>
              {gravelRows.map((row, i) => {
                const rowOpts = sectionOptions('Gravel', row.vendor, GRAVEL_TYPES)
                const gtype = resolveType(row.type, rowOpts, GRAVEL_TYPES)
                const typeCost = p(gtype.dbName, gtype.fallback)
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5"
                        value={row.vendor || 'House'}
                        onChange={e => changeRowVendor('Gravel', GRAVEL_TYPES, updateGravel, i, e.target.value)}
                      >
                        <option value="House">Unspecified</option>
                        {vendorsForCategory('Gravel').map(v => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5"
                        value={row.type || rowOpts[0]?.label}
                        onChange={e => updateGravel(i, 'type', e.target.value)}
                      >
                        {rowOpts.map(t => (
                          <option key={t.label} value={t.label}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1 pr-1">
                      <NumInput value={row.sf} onChange={v => updateGravel(i, 'sf', v)} className="w-16" />
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
                      <span className="text-xs text-gray-500 inline-flex items-center gap-1 whitespace-nowrap">
                        ${typeCost.toFixed(2)}/CY
                        <RateEditPopover
                          table="material_rates"
                          name={gtype.dbName}
                          category="Ground Treatments"
                          unitLabel="CY"
                          currentValue={typeCost}
                          onSaved={refreshAllRates}
                        />
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
                          className="w-20"
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
                { sf: '', method: 'Hand', type: GRAVEL_TYPES[0]?.label ?? 'Crushed Pea Gravel', depthIn: '3', weedFabric: 'Yes', vendor: defaultVendorFor('Gravel') },
              ])
            }
          >
            + Add line
          </button>
          {/* Show CY / material preview below table */}
          {gravelRows.some(r => n(r.sf) > 0) && (
            <div className="mt-1 flex gap-4 flex-wrap">
              {gravelRows.map((row, i) => {
                if (!n(row.sf)) return null
                const CY = (n(row.sf) * (n(row.depthIn) / 12)) / 27
                const gtype = resolveType(row.type, sectionOptions('Gravel', row.vendor, GRAVEL_TYPES), GRAVEL_TYPES)
                const mat =
                  CY * p(gtype.dbName, gtype.fallback) +
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
        <p className="text-xs text-gray-400 mb-2 inline-flex items-center flex-wrap gap-x-2">
          <span className="inline-flex items-center gap-1">
            Fabric ${p(GT_RATES.gravelFabricMat.dbName, 0.1).toFixed(2)}/SF mat
            <RateEditPopover
              table="material_rates"
              name={GT_RATES.gravelFabricMat.dbName}
              category="Ground Treatments"
              unitLabel="SF"
              currentValue={p(GT_RATES.gravelFabricMat.dbName, GT_RATES.gravelFabricMat.fallback)}
              onSaved={refreshAllRates}
            />
            · {p(GT_RATES.gravelFabricLab.dbName, 0.024)} hrs/SF labor
            <RateEditPopover
              table="labor_rates"
              name={GT_RATES.gravelFabricLab.dbName}
              category="Ground Treatments"
              mode="coefficient"
              unitLabel="hrs/SF"
              currentValue={p(GT_RATES.gravelFabricLab.dbName, GT_RATES.gravelFabricLab.fallback)}
              onSaved={refreshAllRates}
            />
          </span>
          ·
          <span className="inline-flex items-center gap-1">
            Machine excav {p(GT_RATES.gravelMachineLab.dbName, 12)} CY/day
            <RateEditPopover
              table="labor_rates"
              name={GT_RATES.gravelMachineLab.dbName}
              category="Ground Treatments"
              mode="coefficient"
              unitLabel="CY/day"
              currentValue={p(GT_RATES.gravelMachineLab.dbName, GT_RATES.gravelMachineLab.fallback)}
              onSaved={refreshAllRates}
            />
          </span>
          ·
          <span className="inline-flex items-center gap-1">
            Hand excav {p(GT_RATES.gravelHandLab.dbName, 4)} CY/day
            <RateEditPopover
              table="labor_rates"
              name={GT_RATES.gravelHandLab.dbName}
              category="Ground Treatments"
              mode="coefficient"
              unitLabel="CY/day"
              currentValue={p(GT_RATES.gravelHandLab.dbName, GT_RATES.gravelHandLab.fallback)}
              onSaved={refreshAllRates}
            />
          </span>
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1 pr-1 font-medium">Vendor</th>
                <th className="text-left pb-1 pr-1 font-medium">Type</th>
                <th className="text-left pb-1 pr-1 font-medium">SF</th>
                <th className="text-left pb-1 pr-1 font-medium">Method</th>
                <th className="text-left pb-1 pr-1 font-medium">$/CY</th>
                <th className="text-left pb-1 pr-1 font-medium">Weed Barrier</th>
                <th className="text-left pb-1 font-medium">Depth (in)</th>
              </tr>
            </thead>
            <tbody>
              {pebbleRows.map((row, i) => {
                const rowOpts = sectionOptions('Pebble', row.vendor, PEBBLE_TYPES)
                const ptype = resolveType(row.type, rowOpts, PEBBLE_TYPES)
                const typeCost = p(ptype.dbName, ptype.fallback)
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5"
                        value={row.vendor || 'House'}
                        onChange={e => changeRowVendor('Pebble', PEBBLE_TYPES, updatePebble, i, e.target.value)}
                      >
                        <option value="House">Unspecified</option>
                        {vendorsForCategory('Pebble').map(v => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5"
                        value={row.type || rowOpts[0]?.label}
                        onChange={e => updatePebble(i, 'type', e.target.value)}
                      >
                        {rowOpts.map(t => (
                          <option key={t.label} value={t.label}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1 pr-1">
                      <NumInput value={row.sf} onChange={v => updatePebble(i, 'sf', v)} className="w-16" />
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
                      <span className="text-xs text-gray-500 inline-flex items-center gap-1 whitespace-nowrap">
                        ${typeCost.toFixed(2)}/CY
                        <RateEditPopover
                          table="material_rates"
                          name={ptype.dbName}
                          category="Ground Treatments"
                          unitLabel="CY"
                          currentValue={typeCost}
                          onSaved={refreshAllRates}
                        />
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
                        className="w-20"
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
                { sf: '', method: 'Hand', type: PEBBLE_TYPES[0]?.label ?? 'Arizona River Rock', depthIn: '3', weedFabric: 'Yes', vendor: defaultVendorFor('Pebble') },
              ])
            }
          >
            + Add line
          </button>
          {/* Show CY / material preview below table */}
          {pebbleRows.some(r => n(r.sf) > 0) && (
            <div className="mt-1 flex gap-4 flex-wrap">
              {pebbleRows.map((row, i) => {
                if (!n(row.sf)) return null
                const CY = (n(row.sf) * (n(row.depthIn) / 12)) / 27
                const ptype = resolveType(row.type, sectionOptions('Pebble', row.vendor, PEBBLE_TYPES), PEBBLE_TYPES)
                const mat =
                  CY * p(ptype.dbName, ptype.fallback) +
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
        <p className="text-xs text-gray-400 mb-2 inline-flex items-center flex-wrap gap-x-2">
          <span className="inline-flex items-center gap-1">
            Fabric ${p(GT_RATES.gravelFabricMat.dbName, 0.1).toFixed(2)}/SF mat
            <RateEditPopover
              table="material_rates"
              name={GT_RATES.gravelFabricMat.dbName}
              category="Ground Treatments"
              unitLabel="SF"
              currentValue={p(GT_RATES.gravelFabricMat.dbName, GT_RATES.gravelFabricMat.fallback)}
              onSaved={refreshAllRates}
            />
            · {p(GT_RATES.gravelFabricLab.dbName, 0.024)} hrs/SF labor
            <RateEditPopover
              table="labor_rates"
              name={GT_RATES.gravelFabricLab.dbName}
              category="Ground Treatments"
              mode="coefficient"
              unitLabel="hrs/SF"
              currentValue={p(GT_RATES.gravelFabricLab.dbName, GT_RATES.gravelFabricLab.fallback)}
              onSaved={refreshAllRates}
            />
          </span>
          ·
          <span className="inline-flex items-center gap-1">
            Machine excav {p(GT_RATES.gravelMachineLab.dbName, 12)} CY/day
            <RateEditPopover
              table="labor_rates"
              name={GT_RATES.gravelMachineLab.dbName}
              category="Ground Treatments"
              mode="coefficient"
              unitLabel="CY/day"
              currentValue={p(GT_RATES.gravelMachineLab.dbName, GT_RATES.gravelMachineLab.fallback)}
              onSaved={refreshAllRates}
            />
          </span>
          ·
          <span className="inline-flex items-center gap-1">
            Hand excav {p(GT_RATES.gravelHandLab.dbName, 4)} CY/day
            <RateEditPopover
              table="labor_rates"
              name={GT_RATES.gravelHandLab.dbName}
              category="Ground Treatments"
              mode="coefficient"
              unitLabel="CY/day"
              currentValue={p(GT_RATES.gravelHandLab.dbName, GT_RATES.gravelHandLab.fallback)}
              onSaved={refreshAllRates}
            />
          </span>
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1 pr-1 font-medium">Vendor</th>
                <th className="text-left pb-1 pr-1 font-medium">Type</th>
                <th className="text-left pb-1 pr-1 font-medium">SF</th>
                <th className="text-left pb-1 pr-1 font-medium">Method</th>
                <th className="text-left pb-1 pr-1 font-medium">$/CY</th>
                <th className="text-left pb-1 font-medium">Depth (in)</th>
              </tr>
            </thead>
            <tbody>
              {cobbleRows.map((row, i) => {
                const rowOpts = sectionOptions('Cobbles', row.vendor, COBBLE_TYPES)
                const ctype = resolveType(row.type, rowOpts, COBBLE_TYPES)
                const typeCost = p(ctype.dbName, ctype.fallback)
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5"
                        value={row.vendor || 'House'}
                        onChange={e => changeRowVendor('Cobbles', COBBLE_TYPES, updateCobble, i, e.target.value)}
                      >
                        <option value="House">Unspecified</option>
                        {vendorsForCategory('Cobbles').map(v => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5"
                        value={row.type || rowOpts[0]?.label}
                        onChange={e => updateCobble(i, 'type', e.target.value)}
                      >
                        {rowOpts.map(t => (
                          <option key={t.label} value={t.label}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1 pr-1">
                      <NumInput value={row.sf} onChange={v => updateCobble(i, 'sf', v)} className="w-16" />
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
                      <span className="text-xs text-gray-500 inline-flex items-center gap-1 whitespace-nowrap">
                        ${typeCost.toFixed(2)}/CY
                        <RateEditPopover
                          table="material_rates"
                          name={ctype.dbName}
                          category="Ground Treatments"
                          unitLabel="CY"
                          currentValue={typeCost}
                          onSaved={refreshAllRates}
                        />
                      </span>
                    </td>
                    <td className="py-1">
                      <NumInput
                        value={row.depthIn}
                        onChange={v => updateCobble(i, 'depthIn', v)}
                        placeholder="3"
                        className="w-20"
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
                { sf: '', method: 'Hand', type: COBBLE_TYPES[0]?.label ?? 'Granite River Rock', depthIn: '3', vendor: defaultVendorFor('Cobbles') },
              ])
            }
          >
            + Add line
          </button>
          {/* Show CY / material preview below table */}
          {cobbleRows.some(r => n(r.sf) > 0) && (
            <div className="mt-1 flex gap-4 flex-wrap">
              {cobbleRows.map((row, i) => {
                if (!n(row.sf)) return null
                const CY = (n(row.sf) * (n(row.depthIn) / 12)) / 27
                const ctype = resolveType(row.type, sectionOptions('Cobbles', row.vendor, COBBLE_TYPES), COBBLE_TYPES)
                const mat =
                  CY * p(ctype.dbName, ctype.fallback) +
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
        <div className="space-y-0">
          {/* Plastic Edging — Vendor + Type per line (material from picked type; labor per line) */}
          {(() => {
            const opts = sectionOptions('Edging', edgingVendor.plastic, EDGING_TYPES)
            const t = resolveType(edgingType.plastic, opts, EDGING_TYPES)
            const rate = p(t.dbName, t.fallback)
            return (
              <LabeledRow
                label="Plastic Edging"
                note={
                  n(plasticEdgingLF) > 0 ? `$${(n(plasticEdgingLF) * rate).toFixed(2)} mat` : null
                }
              >
                <select
                  className="input text-sm py-1.5 w-32"
                  value={edgingVendor.plastic || 'House'}
                  onChange={e => {
                    const v = e.target.value
                    setEdgingVendor(ev => ({ ...ev, plastic: v }))
                    const first = sectionOptions('Edging', v, EDGING_TYPES)[0]?.label
                    if (first) setEdgingType(et => ({ ...et, plastic: first }))
                  }}
                  title="Vendor"
                >
                  <option value="House">Unspecified</option>
                  {vendorsForCategory('Edging').map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
                <select
                  className="input text-sm py-1.5"
                  value={edgingType.plastic}
                  onChange={e => setEdgingType(et => ({ ...et, plastic: e.target.value }))}
                  title="Type"
                >
                  {opts.map(o => (
                    <option key={o.label} value={o.label}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <NumInput
                  value={plasticEdgingLF}
                  onChange={setPlasticEdgingLF}
                  placeholder="LF"
                  className="w-28"
                />
                <span className="text-xs text-gray-400 inline-flex items-center gap-1">
                  ${rate.toFixed(2)}/LF
                  <RateEditPopover
                    table="material_rates"
                    name={t.dbName}
                    category="Ground Treatments"
                    unitLabel="LF"
                    currentValue={rate}
                    onSaved={refreshAllRates}
                  />
                  <RateEditPopover
                    table="labor_rates"
                    name={GT_RATES.plasticEdgingLab.dbName}
                    category="Ground Treatments"
                    mode="coefficient"
                    unitLabel="hrs/LF"
                    currentValue={p(
                      GT_RATES.plasticEdgingLab.dbName,
                      GT_RATES.plasticEdgingLab.fallback
                    )}
                    onSaved={refreshAllRates}
                  />
                </span>
              </LabeledRow>
            )
          })()}

          {/* Metal Edging — Vendor + Type per line (material from picked type; labor per line) */}
          {(() => {
            const opts = sectionOptions('Edging', edgingVendor.metal, EDGING_TYPES)
            const t = resolveType(edgingType.metal, opts, EDGING_TYPES)
            const rate = p(t.dbName, t.fallback)
            return (
              <LabeledRow
                label="Metal Edging"
                note={n(metalEdgingLF) > 0 ? `$${(n(metalEdgingLF) * rate).toFixed(2)} mat` : null}
              >
                <select
                  className="input text-sm py-1.5 w-32"
                  value={edgingVendor.metal || 'House'}
                  onChange={e => {
                    const v = e.target.value
                    setEdgingVendor(ev => ({ ...ev, metal: v }))
                    const first = sectionOptions('Edging', v, EDGING_TYPES)[0]?.label
                    if (first) setEdgingType(et => ({ ...et, metal: first }))
                  }}
                  title="Vendor"
                >
                  <option value="House">Unspecified</option>
                  {vendorsForCategory('Edging').map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
                <select
                  className="input text-sm py-1.5"
                  value={edgingType.metal}
                  onChange={e => setEdgingType(et => ({ ...et, metal: e.target.value }))}
                  title="Type"
                >
                  {opts.map(o => (
                    <option key={o.label} value={o.label}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <NumInput
                  value={metalEdgingLF}
                  onChange={setMetalEdgingLF}
                  placeholder="LF"
                  className="w-28"
                />
                <span className="text-xs text-gray-400 inline-flex items-center gap-1">
                  ${rate.toFixed(2)}/LF
                  <RateEditPopover
                    table="material_rates"
                    name={t.dbName}
                    category="Ground Treatments"
                    unitLabel="LF"
                    currentValue={rate}
                    onSaved={refreshAllRates}
                  />
                  <RateEditPopover
                    table="labor_rates"
                    name={GT_RATES.metalEdgingLab.dbName}
                    category="Ground Treatments"
                    mode="coefficient"
                    unitLabel="hrs/LF"
                    currentValue={p(
                      GT_RATES.metalEdgingLab.dbName,
                      GT_RATES.metalEdgingLab.fallback
                    )}
                    onSaved={refreshAllRates}
                  />
                </span>
              </LabeledRow>
            )
          })()}
        </div>
      </div>

      {/* ── Steppers ── */}
      <div>
        <SectionHeader title="Steppers" />
        <p className="text-xs text-gray-400 mb-2">
          Each stone splits into a Soil Set and a Concrete Set line. "Concrete Set" differs only by a
          (slower) editable labor rate — no automatic concrete/mortar material is added (TBD).
          tons = SF / 80; material = tons × per-ton rate (shared per stone).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1 pr-2 font-medium">Vendor</th>
                <th className="text-left pb-1 pr-2 font-medium">Type</th>
                <th className="text-left pb-1 pr-2 font-medium">Line</th>
                <th className="text-left pb-1 pr-2 font-medium">Area (SF)</th>
                <th className="text-left pb-1 pr-2 font-medium">Labor</th>
                <th className="text-left pb-1 pr-2 font-medium">$/Ton</th>
                <th className="text-right pb-1 pr-2 font-medium text-gray-400">Tons</th>
                <th className="text-right pb-1 font-medium text-gray-400">Material $</th>
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
                const rowOpts = sectionOptions('Steppers', stepperVendor[row.key], STEPPER_TYPES)
                const st = resolveType(stepperType[row.key], rowOpts, STEPPER_TYPES)
                const sfPerDay = p(row.labRate.dbName, row.labRate.fallback)
                const perTon = p(st.dbName, st.fallback)
                const sfN = n(row.sf)
                const tons = sfN / 80
                const mat = tons * perTon
                const hrs = sfPerDay > 0 ? (sfN / sfPerDay) * 8 : 0
                return (
                  <tr key={row.key} className="border-b border-gray-100">
                    <td className="py-1 pr-2">
                      <select
                        className="input text-sm py-1.5"
                        value={stepperVendor[row.key] || 'House'}
                        onChange={e => {
                          const v = e.target.value
                          setStepperVendor(sv => ({ ...sv, [row.key]: v }))
                          const first = sectionOptions('Steppers', v, STEPPER_TYPES)[0]?.label
                          if (first) setStepperType(st => ({ ...st, [row.key]: first }))
                        }}
                        title="Vendor"
                      >
                        <option value="House">Unspecified</option>
                        {vendorsForCategory('Steppers').map(v => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1 pr-2">
                      <select
                        className="input text-sm py-1.5"
                        value={stepperType[row.key] || rowOpts[0]?.label}
                        onChange={e =>
                          setStepperType(st => ({ ...st, [row.key]: e.target.value }))
                        }
                        title="Type"
                      >
                        {rowOpts.map(o => (
                          <option key={o.label} value={o.label}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1 pr-2 text-xs text-gray-700 whitespace-nowrap">{row.label}</td>
                    <td className="py-1 pr-2">
                      <NumInput value={row.sf} onChange={row.set} />
                    </td>
                    <td className="py-1 pr-2">
                      <span className="text-xs text-gray-500 inline-flex items-center gap-1 whitespace-nowrap">
                        {sfPerDay} SF/day
                        <RateEditPopover
                          table="labor_rates"
                          name={row.labRate.dbName}
                          category="Ground Treatments"
                          mode="coefficient"
                          unitLabel="SF/day"
                          currentValue={sfPerDay}
                          onSaved={refreshAllRates}
                        />
                      </span>
                    </td>
                    <td className="py-1 pr-2">
                      <span className="text-xs text-gray-500 inline-flex items-center gap-1 whitespace-nowrap">
                        ${perTon.toFixed(2)}/ton
                        <RateEditPopover
                          table="material_rates"
                          name={st.dbName}
                          category="Ground Treatments"
                          unitLabel="ton"
                          currentValue={perTon}
                          onSaved={refreshAllRates}
                        />
                      </span>
                    </td>
                    <td className="py-1 text-right text-xs text-gray-400 pr-2">
                      {sfN > 0 ? tons.toFixed(2) : '—'}
                    </td>
                    <td className="py-1 text-right text-xs text-gray-600 whitespace-nowrap">
                      {sfN > 0 ? `$${mat.toFixed(2)} · ${hrs.toFixed(2)} hrs` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Manual Entry ── */}
      <div>
        <SectionHeader title="Manual Entry" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1 pr-2 font-medium">Description</th>
                <th className="text-left pb-1 pr-2 font-medium">Hours</th>
                <th className="text-left pb-1 pr-2 font-medium">Materials $</th>
                <th className="text-left pb-1 font-medium">Sub Cost $</th>
              </tr>
            </thead>
            <tbody>
              {manualRows.map((row, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1 pr-2">
                    <input
                      className="input text-sm py-1"
                      value={row.label}
                      onChange={e => updateManual(i, 'label', e.target.value)}
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <NumInput value={row.hours} onChange={v => updateManual(i, 'hours', v)} />
                  </td>
                  <td className="py-1 pr-2">
                    <NumInput
                      value={row.materials}
                      onChange={v => updateManual(i, 'materials', v)}
                    />
                  </td>
                  <td className="py-1">
                    {' '}
                    <NumInput value={row.subCost} onChange={v => updateManual(i, 'subCost', v)} />
                  </td>
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
          {saving ? 'Saving...' : 'Add Module'}
        </button>
      </div>
    </div>
    </SubTabContext.Provider>
  )
}
