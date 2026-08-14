import FinancialSummaryList from './FinancialSummaryList'

// ─────────────────────────────────────────────────────────────────────────────
// GroundTreatmentsSummary — read-only detail view for a saved Ground Treatments module
// ─────────────────────────────────────────────────────────────────────────────

const MULCH_TYPES = [
  { label: 'Premium Mulch', dbName: 'Mulch - Premium' },
  { label: 'Brown Shredded', dbName: 'Mulch - Brown Shredded' },
  { label: 'Flower Bed Mulch', dbName: 'Mulch - Flower Bed' },
  { label: 'Shredded Cedar / Gorilla Hair', dbName: 'Mulch - Shredded Cedar' },
  { label: 'Forest Moss', dbName: 'Mulch - Forest Moss' },
  { label: 'Black Dyed Chips', dbName: 'Mulch - Black Dyed Chips' },
  { label: 'Brown Dyed Chips', dbName: 'Mulch - Brown Dyed Chips' },
  { label: 'Red Dyed Chips', dbName: 'Mulch - Red Dyed Chips' },
  { label: 'Playground Chips', dbName: 'Mulch - Playground Chips' },
  { label: 'Walk On Bark', dbName: 'Mulch - Walk On Bark' },
  { label: 'Small Bark Nugget', dbName: 'Mulch - Small Bark Nugget' },
  { label: 'Medium Bark Nugget', dbName: 'Mulch - Medium Bark Nugget' },
]

const GT_RATES = {
  mulchPerCY: { dbName: 'Mulch' },
  mulchDelivery: { dbName: 'Mulch Delivery Fee' },
  mulchLab: { dbName: 'Mulch - Labor Rate' }, // CY/day
  plasticEdgingMat: { dbName: 'Plastic Edging' },
  plasticEdgingLab: { dbName: 'Plastic Edging - Labor Rate' },
  metalEdgingMat: { dbName: 'Metal Edging' },
  metalEdgingLab: { dbName: 'Metal Edging - Labor Rate' },
  soilPrepMat: { dbName: 'Soil Prep' },
  soilPrepLab: { dbName: 'Soil Prep - Labor Rate' },
  soilPrepHandAdd: { dbName: 'Soil Prep - Hand Add' },
  sodPrepMat: { dbName: 'Sod Soil Prep' },
  sodPrepLab: { dbName: 'Sod Soil Prep - Labor Rate' },
  // Tilling (Planter Prep + Sod Prep) — per-SF labor added on top of the base
  // prep labor by tilling method (mirror of the module).
  tillHandLab: { dbName: 'GT - Till Hand Labor Rate' },
  tillTillerLab: { dbName: 'GT - Till Tiller Labor Rate' },
  sodMarathonMat: { dbName: 'Sod - Marathon' },
  sodStAugMat: { dbName: 'Sod - St. Augustine' },
  fertilizerSFPerBag: { dbName: 'Fertilizer - SF Per Bag' },
  sodLab: { dbName: 'Sod - Labor Rate' },
  flagstonePerTon: { dbName: 'Flagstone Steppers' },
  flagstoneSoilLab: { dbName: 'Flagstone Steppers - Soil Labor' },
  flagstoneConcreteLab: { dbName: 'Flagstone Steppers - Concrete Labor' },
  precastPerTon: { dbName: 'Precast Steppers' },
  precastSoilLab: { dbName: 'Precast Steppers - Soil Labor' },
  precastConcreteLab: { dbName: 'Precast Steppers - Concrete Labor' },
  dgPerTon: { dbName: 'Decomposed Granite' },
  dgCementPerTon: { dbName: 'DG Cement Mix' },
  dgHandLab: { dbName: 'DG - Hand Labor Rate' },
  dgMachineLab: { dbName: 'DG - Machine Labor Rate' },
  gravelFabricMat: { dbName: 'Gravel Fabric' },
  gravelFabricLab: { dbName: 'Gravel Fabric - Labor Rate' },
  gravelMachineLab: { dbName: 'Gravel - Machine Labor Rate' },
  gravelHandLab: { dbName: 'Gravel - Hand Labor Rate' },
}

// Gravel material types — mirror of the module. Legacy modules may instead have a
// row.costPerCY; the summary falls back to that when no type is present.
const GRAVEL_TYPES = [
  { label: 'Crushed Pea Gravel', dbName: 'Gravel - Crushed Pea Gravel' },
  { label: '3/4" Crushed Gravel', dbName: 'Gravel - 3/4" Crushed Gravel' },
  { label: 'Del Rio', dbName: 'Gravel - Del Rio' },
  { label: 'Black River Rock 1" minus', dbName: 'Gravel - Black River Rock 1in minus' },
  { label: 'Black River Rock 1"-2"', dbName: 'Gravel - Black River Rock 1in-2in' },
  { label: 'Black River Rock 2" to 3"', dbName: 'Gravel - Black River Rock 2in-3in' },
  { label: '3/8" Crushed Pea Gravel', dbName: 'Gravel - 3/8in Crushed Pea Gravel' },
  { label: '1 1/2" Crushed Gravel',   dbName: 'Gravel - 1.5in Crushed Gravel' },
  { label: 'Misc Aggregate (3/4")',   dbName: 'Gravel - Misc Aggregate' },
  { label: 'Black Lava',              dbName: 'Gravel - Black Lava' },
  { label: 'Burgundy Lava 3/8"',      dbName: 'Gravel - Burgundy Lava 3/8in' },
  { label: 'Burgundy Lava 3/4"',      dbName: 'Gravel - Burgundy Lava 3/4in' },
  { label: 'California Gold 3/8"',    dbName: 'Gravel - California Gold 3/8in' },
  { label: 'California Gold 3/4"',    dbName: 'Gravel - California Gold 3/4in' },
  { label: 'Eagle Mountain',          dbName: 'Gravel - Eagle Mountain' },
  { label: 'Honey Quartz',            dbName: 'Gravel - Honey Quartz' },
  { label: 'Las Vegas Rainbow',       dbName: 'Gravel - Las Vegas Rainbow' },
  { label: 'Pearl White',             dbName: 'Gravel - Pearl White' },
  { label: 'Tuscan Rose',             dbName: 'Gravel - Tuscan Rose' },
]

// Pebble material types — mirror of the module.
const PEBBLE_TYPES = [
  { label: 'Arizona River Rock', dbName: 'Pebble - Arizona River Rock' },
  { label: 'Cinnamon',           dbName: 'Pebble - Cinnamon' },
  { label: 'Del Rio Pebble',     dbName: 'Pebble - Del Rio' },
  { label: 'Leopard Granite',    dbName: 'Pebble - Leopard Granite' },
  { label: 'White River Pebble', dbName: 'Pebble - White River' },
  { label: 'Yosemite',           dbName: 'Pebble - Yosemite' },
  { label: 'Yuba (Salt & Pepper)', dbName: 'Pebble - Yuba' },
  { label: 'Baja (Beach)',       dbName: 'Pebble - Baja' },
  { label: 'Black (Beach)',      dbName: 'Pebble - Black' },
  { label: 'Buff (Beach)',       dbName: 'Pebble - Buff' },
  { label: 'Mixed (Beach)',      dbName: 'Pebble - Mixed' },
  { label: 'Red (Beach)',        dbName: 'Pebble - Red' },
  { label: 'Sonora (Beach)',     dbName: 'Pebble - Sonora' },
]

// Cobbles & Boulders material types — mirror of the module.
const COBBLE_TYPES = [
  { label: 'Granite River Rock', dbName: 'Cobble - Granite River Rock' },
  { label: 'Arizona',            dbName: 'Cobble - Arizona' },
  { label: 'Auburn Brown',       dbName: 'Cobble - Auburn Brown' },
  { label: 'Cresta',             dbName: 'Cobble - Cresta' },
  { label: 'Las Vegas Rainbow',  dbName: 'Cobble - Las Vegas Rainbow' },
  { label: 'Miners Gold',        dbName: 'Cobble - Miners Gold' },
  { label: 'Miners Pink',        dbName: 'Cobble - Miners Pink' },
]

// D.G. product types (material_rates, per TON). Mirror of the module. Legacy
// modules without dgType fall through to the first entry (Decomposed Granite).
const DG_TYPES = [
  { label: 'Decomposed Granite', dbName: 'Decomposed Granite' },
  { label: 'Stabilized DG', dbName: 'DG - Stabilized' },
  { label: 'Rock Dust - Grey', dbName: 'DG - Rock Dust Grey' },
  { label: 'Grey Stabilized Rock Dust', dbName: 'DG - Grey Stabilized Rock Dust' },
]

// Stepper stone types (material_rates, per TON) — mirror of the module. Legacy
// modules without stepperType/stepperVendor fall back to the fixed per-stone rate.
const STEPPER_TYPES = [
  { label: 'Flagstone', dbName: 'Flagstone Steppers' },
  { label: 'Precast',   dbName: 'Precast Steppers' },
]
// Edging types (material_rates, per LF) — mirror of the module. Legacy modules
// without edgingType/edgingVendor fall back to the fixed Plastic/Metal rate.
const EDGING_TYPES = [
  { label: 'Plastic', dbName: 'Plastic Edging' },
  { label: 'Metal',   dbName: 'Metal Edging' },
]

// Sod varieties + fertilizer — mirror of the module.
const SOD_TYPES = [
  { label: 'Marathon', dbName: 'Sod - Marathon' },
  { label: 'Marathon II', dbName: 'Sod - Marathon II' },
  { label: 'Marathon Lite', dbName: 'Sod - Marathon Lite' },
  { label: 'Marathon II Lite', dbName: 'Sod - Marathon II Lite' },
  { label: 'PureBlue Lite', dbName: 'Sod - PureBlue Lite' },
  { label: 'GreenWave Lite', dbName: 'Sod - GreenWave Lite' },
  { label: 'Hybrid Bermuda', dbName: 'Sod - Hybrid Bermuda' },
  { label: 'St. Augustine', dbName: 'Sod - St. Augustine' },
]
const FERTILIZER_TYPES = [
  { label: 'None', dbName: null },
  { label: 'Marathon All Season (24-2-4)', dbName: 'Fertilizer - Marathon All Season' },
  { label: 'Sod & Seed Starter (15-15-15)', dbName: 'Fertilizer - Sod Seed Starter' },
]
const SOIL_PREP_TYPES = [
  { label: 'Soil Prep', dbName: GT_RATES.soilPrepMat.dbName },
]

// Soil products — mirror of the module ($/CY).
const SOIL_TYPES = [
  { label: 'Topsoil (Sandy Loam)', dbName: 'Soil - Topsoil' },
  { label: 'Compost', dbName: 'Soil - Compost' },
  { label: 'Seed Cover', dbName: 'Soil - Seed Cover' },
  { label: 'Veggie/Flower Mix', dbName: 'Soil - Veggie Flower Mix' },
  { label: '50/50 Planter Mix', dbName: 'Soil - 50-50 Planter Mix' },
  { label: '70/30 Topsoil Mix', dbName: 'Soil - 70-30 Topsoil Mix' },
  { label: '30/70 Compost Mix', dbName: 'Soil - 30-70 Compost Mix' },
  { label: 'Nursery Mix', dbName: 'Soil - Nursery Mix' },
  { label: 'Nursery Mix w/ Pumice', dbName: 'Soil - Nursery Mix Pumice' },
  { label: 'Cactus Mix', dbName: 'Soil - Cactus Mix' },
  { label: 'Can Mix', dbName: 'Soil - Can Mix' },
  { label: 'Color Mix', dbName: 'Soil - Color Mix' },
  { label: 'Bioswale Mix', dbName: 'Soil - Bioswale Mix' },
  { label: 'Pump Mix', dbName: 'Soil - Pump Mix' },
]

const n = v => parseFloat(v) || 0
const fmt2 = v =>
  `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function SectionLabel({ title }) {
  return (
    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-4 mb-1 border-t border-gray-100 pt-3">
      {title}
    </p>
  )
}

function LineRow({ label, value, sub, highlight }) {
  return (
    <div
      className={`flex items-start justify-between py-1 border-b border-gray-50 ${highlight ? 'font-semibold' : ''}`}
    >
      <span className={`text-xs ${highlight ? 'text-gray-800' : 'text-gray-600'} flex-1 pr-2`}>
        {label}
      </span>
      <div className="text-right shrink-0">
        <span className={`text-xs ${highlight ? 'text-gray-900 font-semibold' : 'text-gray-700'}`}>
          {value}
        </span>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  )
}

export default function GroundTreatmentsSummary({ module }) {
  const data = module?.data || {}
  // In-House and Sub are now independent tab records (data.ihData / data.subData),
  // with a flat-field fallback for legacy estimates. This single-column view is
  // driven by the In-House record; shared fields (rates/prices/calc) stay top-level.
  const ih = data.ihData || data
  const sub = data.subData || {}
  const {
    difficulty = 0,
    hoursAdj = 0,
    mulchSF = 0,
    mulchDepth = 2,
    mulchType = 'Premium Mulch',
    mulchWeedFabric = 'No',
    mulchRows,
    soilPrepSF = 0,
    sodSF = 0,
    sodType = 'Marathon',
    sodFertilizer = 'None',
    sodFertilizerSF = 0,
    // Multi-row sections (new model). Legacy estimates fall back to the scalars.
    planterPrepRows,
    sodPrepRows,
    sodRows,
    sodFertRows,
    flagstoneSF = 0,
    flagstoneRate,
    precastSF = 0,
    precastRate,
    flagstoneSoilSF = 0,
    flagstoneConcreteSF = 0,
    precastSoilSF = 0,
    precastConcreteSF = 0,
    dgType = 'Decomposed Granite',
    dgSF = 0,
    dgDepth = 3.5,
    dgWeedFabric = 'No',
    dgMethod = 'Machine',
    dgCement = 'Yes',
    dgRows,
    gravelRows = [],
    pebbleRows = [],
    cobbleRows = [],
    manualRows = [],
  } = ih
  // Shared fields (not per-tab) — always read from the top-level saved data.
  const { laborRatePerHour = 35, materialPrices = {}, calc = null } = data

  const mp = dbName => n(materialPrices[dbName])

  // Resolve a section product's saved per-unit price. Vendor products are stored
  // on the row by their (possibly prefix-stripped) LABEL, while the saved
  // materialPrices snapshot is keyed by the full material_rates name (dbName).
  // Order: hardcoded Standard array match → raw label as a name → reconstructed
  // "<Subcat> - <label>" name → default.
  const priceForType = (subcat, type, houseArray, defaultVal) => {
    const hit = type != null ? houseArray.find(t => t.label === type) : null
    if (hit) return mp(hit.dbName)
    if (type != null && materialPrices[type] != null) return materialPrices[type]
    if (type != null && materialPrices[`${subcat} - ${type}`] != null)
      return materialPrices[`${subcat} - ${type}`]
    return defaultVal
  }

  // Vendor-aware, per-row price. Vendor is now stored PER ROW (row.vendor). For a
  // vendor row, price by the reconstructed full material name ("<Subcat> - <label>")
  // read from the saved materialPrices snapshot, since materialRows aren't
  // snapshotted; if that (and the raw label) miss, fall back to the Standard
  // resolution. Rows without a vendor (old saves) resolve exactly as before.
  const priceForRow = (subcat, row, houseArray, defaultVal) => {
    const type = row?.type
    const vendor = row?.vendor
    if (vendor && vendor !== 'Standard') {
      if (type != null && materialPrices[`${subcat} - ${type}`] != null)
        return materialPrices[`${subcat} - ${type}`]
      if (type != null && materialPrices[type] != null) return materialPrices[type]
    }
    return priceForType(subcat, type, houseArray, defaultVal)
  }

  // ── Tilling labor coefficient (hrs/SF) by method — mirror of the module ───────
  // Added on top of the base prep labor. None = 0. Hand/Tiller each key off their
  // own DB coefficient (GT - Till Hand/Tiller Labor Rate).
  const tillLab = method =>
    method === 'Hand'
      ? mp(GT_RATES.tillHandLab.dbName)
      : method === 'Tiller'
        ? mp(GT_RATES.tillTillerLab.dbName)
        : 0

  // ── Planter Preparation (multi-row, Soils-style) ──────────────────────────────
  // Each row: Material = CY × $/CY from the picked soil/amendment (sub-category
  // 'Soils'); CY = area × (depth/12) / 27; Labor = area × (soilPrepLab base +
  // Hand-add soilPrepHandAdd + tilling coeff). This single-column view is the
  // In-House record, so the Hand-add always applies. Legacy estimates (scalar
  // fields) synthesize a one-row array.
  const _planterPrepRows =
    Array.isArray(planterPrepRows) && planterPrepRows.length
      ? planterPrepRows
      : n(soilPrepSF) > 0
        ? [
            {
              area: soilPrepSF,
              vendor: ih.prepVendor,
              type: ih.prepType,
              depthIn: ih.prepDepthIn,
              tilling: ih.prepTilling || 'Tiller',
            },
          ]
        : []
  const planterPrepLines = _planterPrepRows
    .map((r, i) => {
      if (!(n(r.area) > 0)) return null
      const baseLab = mp(GT_RATES.soilPrepLab.dbName)
      const tilling = r.tilling || 'Tiller'
      const hrs = n(r.area) * (baseLab + tillLab(tilling))
      let mat = 0
      if (r.type) {
        const CY = (n(r.area) * (n(r.depthIn) / 12)) / 27
        const rate = priceForRow('Soils', { type: r.type, vendor: r.vendor }, SOIL_TYPES, 0)
        mat = CY * rate
      }
      return {
        key: i,
        label: `Planter Prep${r.type ? ` (${r.type})` : ''}${tilling && tilling !== 'None' ? ` · ${tilling} till` : ''} — ${n(r.area).toLocaleString()} Sq Ft`,
        value: fmt2(mat),
        sub: `${hrs.toFixed(2)} hrs`,
      }
    })
    .filter(Boolean)

  // ── Sod Preparation (multi-row, Soils-style, sod-prep labor base) ─────────────
  const _sodPrepRows =
    Array.isArray(sodPrepRows) && sodPrepRows.length
      ? sodPrepRows
      : n(ih.sodPrepSF) > 0
        ? [
            {
              area: ih.sodPrepSF,
              vendor: ih.sodPrepVendor,
              type: ih.sodPrepType,
              depthIn: ih.sodPrepDepthIn,
              tilling: ih.sodPrepTilling || 'Tiller',
            },
          ]
        : []
  const sodPrepLines = _sodPrepRows
    .map((r, i) => {
      if (!(n(r.area) > 0)) return null
      const baseLab = mp(GT_RATES.sodPrepLab.dbName)
      const tilling = r.tilling || 'Tiller'
      const hrs = n(r.area) * (baseLab + tillLab(tilling))
      let mat = 0
      if (r.type) {
        const CY = (n(r.area) * (n(r.depthIn) / 12)) / 27
        const rate = priceForRow('Soils', { type: r.type, vendor: r.vendor }, SOIL_TYPES, 0)
        mat = CY * rate
      }
      return {
        key: i,
        label: `Sod Prep${r.type ? ` (${r.type})` : ''}${tilling && tilling !== 'None' ? ` · ${tilling} till` : ''} — ${n(r.area).toLocaleString()} Sq Ft`,
        value: fmt2(mat),
        sub: `${hrs.toFixed(2)} hrs`,
      }
    })
    .filter(Boolean)

  // ── Sod (multi-row) ───────────────────────────────────────────────────────────
  const _sodRows =
    Array.isArray(sodRows) && sodRows.length
      ? sodRows
      : n(sodSF) > 0
        ? [{ vendor: ih.sodVendor, type: sodType, sf: sodSF }]
        : []
  const sodLines = _sodRows
    .map((r, i) => {
      if (!(n(r.sf) > 0)) return null
      const rate = priceForRow('Sod', { type: r.type, vendor: r.vendor }, SOD_TYPES, 0)
      const mat = n(r.sf) * rate
      const hrs = n(r.sf) * mp(GT_RATES.sodLab.dbName)
      return {
        key: i,
        label: `Sod${r.type ? ` (${r.type})` : ''} — ${n(r.sf).toLocaleString()} Sq Ft`,
        value: fmt2(mat),
        sub: `${hrs.toFixed(2)} hrs · ${fmt2(rate)} per Sq Ft`,
      }
    })
    .filter(Boolean)
  const _sodSFTotal = _sodRows.reduce((a, r) => a + n(r.sf), 0)

  // ── Sod Fertilizer (multi-row — auto bags from fertilizer SF) ─────────────────
  // Vendor-aware: rate resolves from the picked Vendor+Type (Standard defaults to
  // the FERTILIZER_TYPES $/bag). Bags = ceil(SF / SF-per-bag). A row's SF defaults
  // to the total sod SF when none entered — mirror of the module.
  const _sodFertRows =
    Array.isArray(sodFertRows) && sodFertRows.length
      ? sodFertRows
      : sodFertilizer && sodFertilizer !== 'None'
        ? [{ vendor: ih.sodFertilizerVendor, fertilizer: sodFertilizer, sf: sodFertilizerSF }]
        : []
  const fertLines = _sodFertRows
    .map((r, i) => {
      const fert = r.fertilizer
      if (!fert || fert === 'None') return null
      const ft = FERTILIZER_TYPES.find(t => t.label === fert)
      const fertSF = n(r.sf) || _sodSFTotal
      if (!(fertSF > 0)) return null
      const sfPerBag = mp(GT_RATES.fertilizerSFPerBag.dbName)
      const bags = sfPerBag > 0 ? Math.ceil(fertSF / sfPerBag) : 0
      const perBag = priceForRow(
        'Fertilizer',
        { type: fert, vendor: r.vendor },
        FERTILIZER_TYPES,
        0
      )
      const mat = bags * perBag
      if (!(bags > 0 && perBag > 0)) return null
      return {
        key: i,
        label: `Fertilizer (${fert})`,
        value: fmt2(mat),
        sub: `${bags} bag${bags > 1 ? 's' : ''} · ${fmt2(perBag)}/bag`,
      }
    })
    .filter(Boolean)

  // ── Mulch (multi-row) ─────────────────────────────────────────────────────────
  // New modules store d.mulchRows; legacy modules store single mulchSF/…, which
  // we synthesize into a one-row array. Delivery fee is applied ONCE (to the first
  // non-empty row) to mirror the module's delivery-once semantics.
  const _mulchRows =
    Array.isArray(mulchRows) && mulchRows.length
      ? mulchRows
      : n(mulchSF) > 0
        ? [{ type: mulchType, sf: mulchSF, depth: mulchDepth, weedFabric: mulchWeedFabric }]
        : []
  const mulchCYPerDay = mp(GT_RATES.mulchLab.dbName)
  let _mulchDeliveryDone = false
  const mulchLines = _mulchRows
    .map((r, i) => {
      if (!(n(r.sf) > 0)) return null
      const CY = (n(r.sf) * (n(r.depth) / 12)) / 27
      const fabric = r.weedFabric === 'Yes'
      let mat = CY * priceForRow('Mulch', r, MULCH_TYPES, 0)
      if (!_mulchDeliveryDone) {
        mat += mp(GT_RATES.mulchDelivery.dbName)
        _mulchDeliveryDone = true
      }
      let hrs = (CY / mulchCYPerDay) * 8 + (n(r.sf) / 3200) * 8
      if (fabric) {
        mat += n(r.sf) * mp(GT_RATES.gravelFabricMat.dbName)
        hrs += n(r.sf) * mp(GT_RATES.gravelFabricLab.dbName)
      }
      return {
        key: i,
        label: `${r.type || 'Mulch'} — ${n(r.sf).toLocaleString()} Sq Ft × ${n(r.depth)}"${fabric ? ' · weed fabric' : ''}`,
        value: fmt2(mat),
        sub: `${hrs.toFixed(2)} hrs · ${CY.toFixed(2)} Cu Yd`,
      }
    })
    .filter(Boolean)

  // ── DG (multi-row) ──────────────────────────────────────────────────────────
  // New modules store d.dgRows; legacy modules store single dgSF/… fields, which
  // we synthesize into a one-row array.
  const _dgRows =
    Array.isArray(dgRows) && dgRows.length
      ? dgRows
      : n(dgSF) > 0
        ? [
            {
              type: dgType,
              sf: dgSF,
              depth: dgDepth,
              weedFabric: dgWeedFabric,
              method: dgMethod,
              cement: dgCement,
            },
          ]
        : []
  const dgHandRate = mp(GT_RATES.dgHandLab.dbName)
  const dgMachineRate = mp(GT_RATES.dgMachineLab.dbName)
  const dgLines = _dgRows
    .map((r, i) => {
      if (!(n(r.sf) > 0)) return null
      const tons = (n(r.sf) * n(r.depth)) / 200
      const cement = r.cement === 'Yes'
      const fabric = r.weedFabric === 'Yes'
      const perTon = priceForRow('DG', r, DG_TYPES, 0)
      const matBase =
        tons * perTon +
        (cement ? tons * mp(GT_RATES.dgCementPerTon.dbName) : 0)
      let mat = matBase * 1.1
      const baseHrs =
        r.method === 'Hand'
          ? (tons * 1.62) / dgHandRate + (n(r.sf) / 1000) * 8 + tons
          : ((tons * 1.62) / dgMachineRate) * 8 + (n(r.sf) / 1000) * 8 + tons
      let hrs = baseHrs + (cement ? tons * 1.25 : 0)
      if (fabric) {
        mat += n(r.sf) * mp(GT_RATES.gravelFabricMat.dbName)
        hrs += n(r.sf) * mp(GT_RATES.gravelFabricLab.dbName)
      }
      return {
        key: i,
        label: `${r.type || 'D.G.'} — ${n(r.sf).toLocaleString()} Sq Ft @ ${n(r.depth)}" (${r.method}${cement ? ', cement' : ''}${fabric ? ', fabric' : ''})`,
        value: fmt2(mat),
        sub: `${hrs.toFixed(2)} hrs · ${tons.toFixed(2)} Tons`,
      }
    })
    .filter(Boolean)

  // ── Gravel ────────────────────────────────────────────────────────────────────
  const gravelLines = gravelRows
    .map((r, i) => {
      if (!n(r.sf)) return null
      const CY = (n(r.sf) * (n(r.depthIn) / 12)) / 27
      // New modules store row.type (drives $/CY via material_rates); legacy
      // modules store a manual row.costPerCY — fall back to that.
      const costPerCY = priceForRow('Gravel', r, GRAVEL_TYPES, n(r.costPerCY))
      const mat =
        CY * costPerCY +
        n(r.sf) * mp(GT_RATES.gravelFabricMat.dbName)
      const machineRate = mp(GT_RATES.gravelMachineLab.dbName)
      const handRate = mp(GT_RATES.gravelHandLab.dbName)
      const excavLab =
        r.method === 'Machine' ? ((CY * 1.62) / machineRate) * 8 : ((CY * 1.62) / handRate) * 8
      const fabricLab =
        n(r.sf) * mp(GT_RATES.gravelFabricLab.dbName)
      const hrs = excavLab + fabricLab
      return {
        key: i,
        label: `Gravel #${i + 1}${r.type ? ` (${r.type})` : ''} — ${n(r.sf).toLocaleString()} Sq Ft × ${n(r.depthIn)}" (${r.method})`,
        value: fmt2(mat),
        sub: `${hrs.toFixed(2)} hrs · ${CY.toFixed(2)} Cu Yd · $${costPerCY.toFixed ? costPerCY.toFixed(2) : costPerCY} per Cu Yd`,
      }
    })
    .filter(Boolean)

  // ── Pebble (same calc/labor as Gravel; PEBBLE_TYPES material) ──────────────────
  const pebbleLines = pebbleRows
    .map((r, i) => {
      if (!n(r.sf)) return null
      const CY = (n(r.sf) * (n(r.depthIn) / 12)) / 27
      const costPerCY = priceForRow(
        'Pebble',
        r,
        PEBBLE_TYPES,
        n(r.costPerCY)
      )
      const mat =
        CY * costPerCY +
        n(r.sf) * mp(GT_RATES.gravelFabricMat.dbName)
      const machineRate = mp(GT_RATES.gravelMachineLab.dbName)
      const handRate = mp(GT_RATES.gravelHandLab.dbName)
      const excavLab =
        r.method === 'Machine' ? ((CY * 1.62) / machineRate) * 8 : ((CY * 1.62) / handRate) * 8
      const fabricLab =
        n(r.sf) * mp(GT_RATES.gravelFabricLab.dbName)
      const hrs = excavLab + fabricLab
      return {
        key: i,
        label: `Pebble #${i + 1}${r.type ? ` (${r.type})` : ''} — ${n(r.sf).toLocaleString()} Sq Ft × ${n(r.depthIn)}" (${r.method})`,
        value: fmt2(mat),
        sub: `${hrs.toFixed(2)} hrs · ${CY.toFixed(2)} Cu Yd · $${costPerCY.toFixed ? costPerCY.toFixed(2) : costPerCY} per Cu Yd`,
      }
    })
    .filter(Boolean)

  // ── Cobbles & Boulders (same calc/labor as Gravel; COBBLE_TYPES material) ──────
  const cobbleLines = cobbleRows
    .map((r, i) => {
      if (!n(r.sf)) return null
      const CY = (n(r.sf) * (n(r.depthIn) / 12)) / 27
      const costPerCY = priceForRow(
        'Cobbles',
        r,
        COBBLE_TYPES,
        n(r.costPerCY)
      )
      const mat =
        CY * costPerCY +
        n(r.sf) * mp(GT_RATES.gravelFabricMat.dbName)
      const machineRate = mp(GT_RATES.gravelMachineLab.dbName)
      const handRate = mp(GT_RATES.gravelHandLab.dbName)
      const excavLab =
        r.method === 'Machine' ? ((CY * 1.62) / machineRate) * 8 : ((CY * 1.62) / handRate) * 8
      const fabricLab =
        n(r.sf) * mp(GT_RATES.gravelFabricLab.dbName)
      const hrs = excavLab + fabricLab
      return {
        key: i,
        label: `Cobble #${i + 1}${r.type ? ` (${r.type})` : ''} — ${n(r.sf).toLocaleString()} Sq Ft × ${n(r.depthIn)}" (${r.method})`,
        value: fmt2(mat),
        sub: `${hrs.toFixed(2)} hrs · ${CY.toFixed(2)} Cu Yd · $${costPerCY.toFixed ? costPerCY.toFixed(2) : costPerCY} per Cu Yd`,
      }
    })
    .filter(Boolean)

  // ── Edging (single combined row: Vendor + Type + LF) ──────────────────────────
  // Material rate comes from the picked Vendor+Type. Labor rate keys off the Type:
  // a metal-ish type uses the Metal labor rate, otherwise the Plastic labor rate —
  // exactly as the module does. No type picked → no line ($0).
  const edgingLines = []
  if (n(ih.edgingLF) > 0 && ih.edgingType) {
    const isMetal = /metal/i.test(ih.edgingType || '')
    const rate = priceForRow(
      'Edging',
      { type: ih.edgingType, vendor: ih.edgingVendor },
      EDGING_TYPES,
      isMetal
        ? mp(GT_RATES.metalEdgingMat.dbName)
        : mp(GT_RATES.plasticEdgingMat.dbName)
    )
    const labRate = isMetal
      ? mp(GT_RATES.metalEdgingLab.dbName)
      : mp(GT_RATES.plasticEdgingLab.dbName)
    const mat = n(ih.edgingLF) * rate
    const hrs = n(ih.edgingLF) * labRate
    edgingLines.push({
      label: `${ih.edgingType} Edging — ${n(ih.edgingLF).toLocaleString()} Ln Ft`,
      value: fmt2(mat),
      sub: `${hrs.toFixed(2)} hrs · ${fmt2(rate)} per Ln Ft`,
    })
  }

  // ── Steppers ─────────────────────────────────────────────────────────────────
  // Each stone (Flagstone / Precast) splits into a Soil Set and a Concrete Set
  // line — same per-ton material rate, different (slower) concrete labor rate.
  // Legacy modules stored a single flagstoneSF/precastSF (+ optional
  // flagstoneRate/precastRate); those fall through to the soil-set line.
  // Material rate now resolves per line from the saved Vendor+Type
  // (d.stepperVendor / d.stepperType, keyed by line id). Old saves lack those
  // objects → fall back to the legacy fixed per-stone rate (matOverride /
  // matRate). Labor stays per-line (its own SF/day rate). Money still comes from
  // d.calc; these lines are the display breakdown.
  const stepperLines = []
  const _stepperVendor = ih.stepperVendor || {}
  const _stepperType = ih.stepperType || {}
  const stepperDefs = [
    {
      key: 'flagSoil',
      label: 'Flagstone Steppers (Soil Set)',
      houseType: 'Flagstone',
      sf: n(flagstoneSoilSF) || n(flagstoneSF),
      matRate: GT_RATES.flagstonePerTon,
      matOverride: flagstoneRate,
      labRate: GT_RATES.flagstoneSoilLab,
    },
    {
      key: 'flagConc',
      label: 'Flagstone Steppers (Concrete Set)',
      houseType: 'Flagstone',
      sf: n(flagstoneConcreteSF),
      matRate: GT_RATES.flagstonePerTon,
      labRate: GT_RATES.flagstoneConcreteLab,
    },
    {
      key: 'precSoil',
      label: 'Precast Steppers (Soil Set)',
      houseType: 'Precast',
      sf: n(precastSoilSF) || n(precastSF),
      matRate: GT_RATES.precastPerTon,
      matOverride: precastRate,
      labRate: GT_RATES.precastSoilLab,
    },
    {
      key: 'precConc',
      label: 'Precast Steppers (Concrete Set)',
      houseType: 'Precast',
      sf: n(precastConcreteSF),
      matRate: GT_RATES.precastPerTon,
      labRate: GT_RATES.precastConcreteLab,
    },
  ]
  stepperDefs.forEach(def => {
    if (def.sf <= 0) return
    const tons = def.sf / 80
    const savedType = _stepperType[def.key]
    const savedVendor = _stepperVendor[def.key]
    const legacyRate = n(def.matOverride) || mp(def.matRate.dbName)
    // New saves resolve the picked Vendor+Type via the material_rates snapshot;
    // Standard / old saves keep the legacy per-stone rate.
    const rate =
      savedType != null
        ? priceForRow('Steppers', { type: savedType, vendor: savedVendor }, STEPPER_TYPES, legacyRate)
        : legacyRate
    const sfPerDay = mp(def.labRate.dbName)
    const mat = tons * rate
    const hrs = sfPerDay > 0 ? (def.sf / sfPerDay) * 8 : 0
    const typeSuffix = savedType && savedType !== def.houseType ? ` · ${savedType}` : ''
    stepperLines.push({
      label: `${def.label} — ${def.sf.toLocaleString()} Sq Ft`,
      value: fmt2(mat),
      sub: `${hrs.toFixed(2)} hrs · ${tons.toFixed(2)} Tons · ${fmt2(rate)} per Tons${typeSuffix}`,
    })
  })

  // ── Manual rows ────────────────────────────────────────────────────────────────
  const manualLines = (manualRows || []).filter(
    r => n(r.hours) > 0 || n(r.materials) > 0 || n(r.subCost) > 0
  )

  const hasAnyLines =
    planterPrepLines.length ||
    sodPrepLines.length ||
    sodLines.length ||
    fertLines.length ||
    mulchLines.length ||
    dgLines.length ||
    gravelLines.length ||
    pebbleLines.length ||
    cobbleLines.length ||
    edgingLines.length ||
    stepperLines.length ||
    manualLines.length

  // ── Financials ────────────────────────────────────────────────────────────────
  const savedCalc = calc || {}
  const totalHrs = n(savedCalc.totalHrs)
  const manDays = n(savedCalc.manDays) || n(module.man_days)
  const totalMat = n(savedCalc.totalMat) || n(module.material_cost)
  const laborCost = n(savedCalc.laborCost) || totalHrs * n(laborRatePerHour)
  const burden = n(savedCalc.burden)
  const gp = n(savedCalc.gp)
  const commission = n(savedCalc.commission) || gp * 0.12
  const subCost = n(savedCalc.subCost)
  const priceTotal = n(savedCalc.price)

  return (
    <div className="space-y-1 text-sm">
      {/* Top stat bar */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-0.5">Man Days</p>
          <p className="text-xl font-bold text-gray-900">{manDays.toFixed(2)}</p>
          <p className="text-xs text-gray-400">{totalHrs.toFixed(1)} hrs</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-0.5">Materials</p>
          <p className="text-xl font-bold text-gray-900">{fmt2(totalMat)}</p>
        </div>
      </div>

      {n(difficulty) > 0 && (
        <div className="flex items-center justify-between text-xs text-amber-700 bg-amber-50 rounded px-3 py-1.5">
          <span>Difficulty modifier applied</span>
          <span className="font-semibold">+{difficulty}%</span>
        </div>
      )}
      {n(hoursAdj) !== 0 && (
        <div className="flex items-center justify-between text-xs text-blue-700 bg-blue-50 rounded px-3 py-1.5">
          <span>Hours adjustment</span>
          <span className="font-semibold">
            {n(hoursAdj) > 0 ? '+' : ''}
            {n(hoursAdj).toFixed(1)} hrs
          </span>
        </div>
      )}

      {!hasAnyLines ? (
        <p className="text-xs text-gray-400 text-center py-4">No line items entered.</p>
      ) : (
        <>
          {planterPrepLines.length > 0 && (
            <>
              <SectionLabel title="Planter Preparation" />
              {planterPrepLines.map(l => (
                <LineRow key={l.key} label={l.label} value={l.value} sub={l.sub} />
              ))}
            </>
          )}

          {sodPrepLines.length > 0 && (
            <>
              <SectionLabel title="Sod Preparation" />
              {sodPrepLines.map(l => (
                <LineRow key={l.key} label={l.label} value={l.value} sub={l.sub} />
              ))}
            </>
          )}

          {sodLines.length > 0 && (
            <>
              <SectionLabel title="Sod" />
              {sodLines.map(l => (
                <LineRow key={l.key} label={l.label} value={l.value} sub={l.sub} />
              ))}
            </>
          )}

          {fertLines.length > 0 && (
            <>
              <SectionLabel title="Sod Fertilizer" />
              {fertLines.map(l => (
                <LineRow key={l.key} label={l.label} value={l.value} sub={l.sub} />
              ))}
            </>
          )}

          {mulchLines.length > 0 && (
            <>
              <SectionLabel title="Mulch" />
              {mulchLines.map(l => (
                <LineRow key={l.key} label={l.label} value={l.value} sub={l.sub} />
              ))}
            </>
          )}

          {dgLines.length > 0 && (
            <>
              <SectionLabel title="Decomposed Granite" />
              {dgLines.map(l => (
                <LineRow key={l.key} label={l.label} value={l.value} sub={l.sub} />
              ))}
            </>
          )}

          {gravelLines.length > 0 && (
            <>
              <SectionLabel title="Gravel" />
              {gravelLines.map(l => (
                <LineRow key={l.key} label={l.label} value={l.value} sub={l.sub} />
              ))}
            </>
          )}

          {pebbleLines.length > 0 && (
            <>
              <SectionLabel title="Pebble" />
              {pebbleLines.map(l => (
                <LineRow key={l.key} label={l.label} value={l.value} sub={l.sub} />
              ))}
            </>
          )}

          {cobbleLines.length > 0 && (
            <>
              <SectionLabel title="Cobbles & Boulders" />
              {cobbleLines.map(l => (
                <LineRow key={l.key} label={l.label} value={l.value} sub={l.sub} />
              ))}
            </>
          )}

          {edgingLines.length > 0 && (
            <>
              <SectionLabel title="Edging" />
              {edgingLines.map((l, i) => (
                <LineRow key={i} label={l.label} value={l.value} sub={l.sub} />
              ))}
            </>
          )}

          {stepperLines.length > 0 && (
            <>
              <SectionLabel title="Steppers" />
              {stepperLines.map((l, i) => (
                <LineRow key={i} label={l.label} value={l.value} sub={l.sub} />
              ))}
            </>
          )}

          {manualLines.length > 0 && (
            <>
              <SectionLabel title="Manual Entry" />
              {manualLines.map((r, i) => (
                <div key={i} className="py-1 border-b border-gray-50">
                  <p className="text-xs font-medium text-gray-700">{r.label}</p>
                  <div className="flex gap-3 mt-0.5">
                    {n(r.hours) > 0 && (
                      <span className="text-xs text-gray-500">{n(r.hours).toFixed(1)} hrs</span>
                    )}
                    {n(r.materials) > 0 && (
                      <span className="text-xs text-gray-500">{fmt2(r.materials)} mat.</span>
                    )}
                    {n(r.subCost) > 0 && (
                      <span className="text-xs text-gray-500">{fmt2(r.subCost)} sub</span>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </>
      )}

      <FinancialSummaryList
        totalHrs={totalHrs}
        manDays={manDays}
        totalMat={totalMat}
        laborCost={laborCost}
        lrph={n(laborRatePerHour)}
        burden={burden}
        subCost={subCost}
        gp={gp}
        commission={commission}
        price={priceTotal}
      />
    </div>
  )
}
