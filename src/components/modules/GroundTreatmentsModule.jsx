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
import { calcGroundTreatments } from './groundTreatmentsCalc'
import UnpricedItemModal from '../UnpricedItemModal'

// Estimator repoint: Ground Treatments material pickers now read from the rebuilt
// catalog (material + material_price), filtered by (Ground Treatments, sub-cat).
// The taxonomy sub-category name equals each section's marker except D.G., whose
// sub-category is named "Decomposed Granite" — remap it back to the "DG" marker.
const GT_MARKER_REMAP = { 'Decomposed Granite': 'DG' }

// View Rates scope (mirrors WALLS_RATE_SCOPE): own 'Ground Treatments' covers every
// GT material sub + all GT labor/misc/sub rates (incl. DG Cement Mix, which stays in
// GT). Borrowed from Basic Materials: the shared Decomposed Granite base materials
// (remapped to the DG picker) and the single shared Weed Fabric barrier.
const GT_RATE_SCOPE = [
  { category: 'Ground Treatments' },
  { category: 'Basic Materials', sub: 'Decomposed Granite' }, // shared DG base ($/Cu Yd)
  { category: 'Basic Materials', sub: 'Barriers', only: ['Weed Fabric'] }, // shared weed fabric ($/SF)
]
async function fetchGtRows() {
  // DG base materials were consolidated company-wide into Basic Materials →
  // 'Decomposed Granite' (priced per Cu Yd) and MOVED out of Ground Treatments.
  // Fetch Basic Materials alongside GT, but merge in ONLY its 'Decomposed
  // Granite' rows so the DG picker/price resolves them — no other Basic
  // Materials sub-categories leak into the Mulch/Gravel/etc. pickers. The rows
  // then flow through the existing 'Decomposed Granite' → 'DG' marker remap, so
  // the DG resolver (which filters by sub_category, not category) is unchanged.
  const [gtRows, basicRows] = await Promise.all([
    fetchModuleCatalog(['Ground Treatments']),
    fetchModuleCatalog(['Basic Materials']),
  ])
  // Also merge the canonical 'Weed Fabric' (Basic Materials → 'Barriers'), the
  // company-wide weed-fabric material every module now shares (like Class II /
  // Decomposed Granite). 'Barriers' isn't a GT section sub-category, so it never
  // leaks into a section picker — it just lands in the price map by name.
  const sharedFromBasic = (basicRows || []).filter(
    r => r.sub_category === 'Decomposed Granite' || r.sub_category === 'Barriers'
  )
  return [...(gtRows || []), ...sharedFromBasic].map(r => ({
    ...r,
    sub_category: GT_MARKER_REMAP[r.sub_category] || r.sub_category,
  }))
}

// Section Type options — DB-driven from the new catalog: every Standard
// (null-vendor) product assigned to (Ground Treatments, cat) becomes an option,
// priced from material_price. The built-in `houseArray` is only a fallback for a
// sub-category that has no products yet, so nothing disappears mid-migration.
function mergedGtOpts(cat, houseArray, materialRows) {
  // Purely table-driven: options come ONLY from the catalog for this sub-category.
  // (houseArray is ignored — no hardcoded fallback list.)
  return catalogOptions(materialRows, cat, 'Standard', { standardRows: 'null-vendor', stripPrefix: true }).map(
    o => ({ label: o.label, ref_key: o.row.ref_key || null, dbName: o.row.name, fallback: parseFloat(o.row.unit_cost) || 0, id: o.row.id })
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

// Company/estimate financial settings (labor rate, burden %, GPMD, commission,
// sub GP markup) are sourced live from company_settings — no hardcoded defaults.

// Soil-prep bed material — single Standard type; vendors may supply a 'Soil Prep'
// category so the Sod section's Soil Prep line matches the Vendor|Type format.
const SOIL_PREP_TYPES = [
  { label: 'Soil Prep', dbName: GT_RATES.soilPrepMat.dbName },
]

const DG_METHODS = ['Machine', 'Hand']

const n = v => parseFloat(v) || 0

// Resolve a saved row LABEL to its matching type option {label, dbName, fallback}.
// Prefers the section's current (possibly vendor-filtered) option list, then the
// hardcoded Standard array, then the first available option — so pricing never breaks
// when a vendor is selected, a product is missing, or an old estimate is reopened.
function resolveType(label, options, houseArray) {
  // `label` may be the frozen material ref_key (converted picker) or the legacy label.
  return (
    (options || []).find(t => (t.ref_key && t.ref_key === label) || t.label === label) ||
    (houseArray || []).find(t => t.label === label) ||
    (options && options[0]) ||
    (houseArray && houseArray[0]) ||
    // Table-driven safe default when a sub-category/vendor has no products —
    // keeps the calc + render from crashing on an empty list (price resolves 0).
    { label: '', dbName: null, fallback: 0, id: null }
  )
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
  { sf: '', method: 'Hand', type: '', depthIn: '3', weedFabric: 'Yes', vendor: '' },
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
    // Edging — multi-row (Vendor + Type + LF). Backward-compat: migrate a legacy
    // single edgingVendor/edgingType/edgingLF entry into the first row.
    edgingRows:
      src.edgingRows ??
      [
        {
          vendor: typeof src.edgingVendor === 'string' ? src.edgingVendor : '',
          type: typeof src.edgingType === 'string' ? src.edgingType : '',
          lf: src.edgingLF ?? '',
        },
      ],
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
    initialData?.laborRatePerHour ?? null
  )
  const [laborBurdenPct, setLaborBurdenPct] = useState(
    initialData?.laborBurdenPct ?? null
  )
  const [gpmd, setGpmd] = useState(initialData?.gpmd ?? null)
  const [commissionRate, setCommissionRate] = useState(initialData?.commissionRate ?? null)
  const [subGpMarkupRate, setSubGpMarkupRate] = useState(initialData?.subGpMarkupRate ?? null)

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
  // Resolve a stored Type (frozen material ref_key; legacy id/name too) to the item's
  // name for the orphan-value fallback option. Strips the "<sub> - " prefix.
  const matName = key => {
    if (!key) return key
    const hit = (materialRows || []).find(r => r.ref_key === key || r.id === key || r.name === key)
    if (!hit) return key
    const dash = hit.name ? hit.name.indexOf(' - ') : -1
    return dash > 0 ? hit.name.slice(dash + 3) : hit.name
  }
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
      supabase.from('subcontractor_rates').select('item_key, rate').eq('category', 'Ground Treatments'),
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
      prices[r.item_key] = parseFloat(r.rate) || 0
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
    supabase
      .from('company_settings')
      .select('labor_rate_per_hour, labor_burden_pct, walk_access_pace_lf_per_min, estimate_gpmd_default, commission_rate, sub_gp_markup_rate')
      .single()
      .then(({ data }) => {
        if (!data) return
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
        if (!initialData?.walkAccess && data.walk_access_pace_lf_per_min != null) {
          const _wpace = parseFloat(data.walk_access_pace_lf_per_min)
          setWalkAccess({
            paceLfPerMin:
              Number.isFinite(_wpace) && _wpace > 0
                ? _wpace
                : DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN,
          })
        }
      })
    if (initialData?.materialPrices) {
      // Saved estimate: keep the price snapshot, but still load vendors + rows
      // so the per-section vendor pickers work on re-edit.
      loadVendorData()
      return
    }
    refreshAllRates().then(() => setPricesLoading(false))
  }, [refreshAllRates, loadVendorData])

  // ── State ──────────────────────────────────────────────────────────────────
  const [crewType, setCrewType] = useState(initialData?.crewType ?? 'Landscape')
  const [subType, setSubType] = useState(initialData?.subType ?? 'In-House')
  // Unpriced-labor fix-it modal target (mirrors Concrete's inline banner).
  const [unpricedItem, setUnpricedItem] = useState(null)

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
  const edgingRows = cur.edgingRows
  const setEdgingRows = setField('edgingRows')
  function updateEdging(i, field, val) {
    setEdgingRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }
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
    // standardRows moot here (Standard is handled above via mergedGtOpts); kept as
    // 'null-vendor' so every catalogOptions call in this file uses one sourcing mode.
    const opts = catalogOptions(materialRows, subcat, vendorSel, { standardRows: 'null-vendor', stripPrefix: true })
    // Table-driven: a vendor with no catalog rows for this sub-category shows an
    // empty list (no hardcoded fallback).
    return opts.map(o => ({ label: o.label || o.row.name, ref_key: o.row.ref_key || null, dbName: o.row.name, fallback: n(o.row.unit_cost), id: o.row.id }))
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
    materialRows,
    {},
    commissionRate
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

  const p = dbName =>
    n(materialPrices[dbName] ?? (dbName === 'Weed Fabric' ? materialPrices['Gravel Fabric'] : undefined))

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
      data: { ...state, ihData: ihTab, subData: subTab, walkAccess, laborRatePerHour, laborBurdenPct, gpmd, commissionRate, subGpMarkupRate, materialPrices, materialRows, calc },
    })
  }


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
            moduleType="Ground Treatments"
            rateScope={GT_RATE_SCOPE}
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

      {!pricesLoading && calc.unpriced && calc.unpriced.length > 0 && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3">
          <p className="text-sm font-medium text-red-800">
            {calc.unpriced.length} item{calc.unpriced.length > 1 ? 's have' : ' has'} no price yet —
            click to price:
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {calc.unpriced.map(it => (
              <button
                key={it.name}
                type="button"
                className="rounded-full border border-red-300 bg-white px-3 py-1 text-sm text-red-700 hover:bg-red-100"
                onClick={() => setUnpricedItem(it)}
              >
                {it.label} · $0.00
              </button>
            ))}
          </div>
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
                        {row.type && !opts.some(o => (o.ref_key || o.label) === row.type || o.label === row.type) && (
                          <option value={row.type}>{matName(row.type)}</option>
                        )}
                        {opts.map(o => (
                          <option key={o.label} value={o.ref_key || o.label}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <NumInput
                        value={row.sf}
                        onChange={v => setRows(rs => rs.map((rr, idx) => (idx === i ? { ...rr, sf: v } : rr)))}
                        placeholder="Sq Ft"
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
                <NumInput value={soilPrepSF} onChange={setSoilPrepSF} placeholder="Sq Ft" className="w-24" />
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
                  value={(() => {
                    const t = resolveType(sodType, sectionOptions('Sod', sodVendor || 'Standard', []), [])
                    return t?.ref_key || t?.label || ''
                  })()}
                  onChange={e => setSodType(e.target.value)}
                >
                  {sectionOptions('Sod', sodVendor || 'Standard', []).map(o => (
                    <option key={o.label} value={o.ref_key || o.label}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <NumInput value={sodSF} onChange={setSodSF} placeholder="Sq Ft" className="w-24" />
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
                    <NumInput value={val} onChange={set} placeholder="Ln Ft" className="w-24" />
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
                    <NumInput value={val} onChange={set} placeholder="Sq Ft" className="w-24" />
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
            ? p(GT_RATES.tillHandLab.dbName)
            : method === 'Tiller'
              ? p(GT_RATES.tillTillerLab.dbName)
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
                      <th className="text-center pb-1 pr-1 font-medium">$ per Cu Yd</th>
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
                          ? p(GT_RATES.soilPrepHandAdd.dbName)
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
                              {row.type && !rowOpts.some(o => (o.ref_key || o.label) === row.type || o.label === row.type) && (
                                <option value={row.type}>{matName(row.type)}</option>
                              )}
                              {rowOpts.map(t => (
                                <option key={t.label} value={t.ref_key || t.label}>
                                  {t.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-1 pr-1">
                            <NumInput
                              value={row.area}
                              onChange={v => upd(i, 'area', v)}
                              placeholder="Sq Ft"
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
              baseLabRate: p(GT_RATES.soilPrepLab.dbName),
            })}
            {prepSection({
              title: 'Sod Preparation',
              rows: sodPrepRows,
              setRows: setSodPrepRows,
              baseLabRate: p(GT_RATES.sodPrepLab.dbName),
            })}
          </>
        )
      })()}

      {/* ── Edging ── */}
      <div>
        <SectionHeader title="Edging" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-center pb-1 pr-1 font-medium">Vendor</th>
                <th className="text-center pb-1 pr-1 font-medium">Edging Type</th>
                <th className="text-center pb-1 pr-1 font-medium">Ln Ft</th>
                <th className="text-center pb-1 pr-1 font-medium">$ per Ln Ft</th>
                <th className="text-center pb-1 font-medium text-gray-400">Material $</th>
              </tr>
            </thead>
            <tbody>
              {edgingRows.map((row, i) => {
                // The Type picker lists both Plastic and Metal (plus vendor edging).
                // Labor keys off the picked Type.
                const opts = sectionOptions('Edging', row.vendor, [])
                const t = resolveType(row.type, opts, [])
                const rate = t.fallback
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5"
                        value={row.vendor || ''}
                        onChange={e => updateEdging(i, 'vendor', e.target.value)}
                        title="Vendor"
                      >
                        {!row.vendor && <option value="">Select</option>}
                        {row.vendor &&
                          row.vendor !== 'Standard' &&
                          !vendorsForCategory('Edging').some(v => v.id === row.vendor) && (
                            <option value={row.vendor}>{row.vendor}</option>
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
                        value={row.type || ''}
                        onChange={e => updateEdging(i, 'type', e.target.value)}
                      >
                        {!row.type && <option value="">Select edging</option>}
                        {row.type && !opts.some(o => (o.ref_key || o.label) === row.type || o.label === row.type) && (
                          <option value={row.type}>{matName(row.type)}</option>
                        )}
                        {opts.map(o => (
                          <option key={o.label} value={o.ref_key || o.label}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1 pr-1">
                      <NumInput value={row.lf} onChange={v => updateEdging(i, 'lf', v)} placeholder="Ln Ft" className="w-full text-center" />
                    </td>
                    <td className="py-1 pr-1">
                      <span className="text-xs text-gray-500 whitespace-nowrap block text-center">${rate.toFixed(2)} per Ln Ft</span>
                    </td>
                    <td className="py-1">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-xs text-gray-600 whitespace-nowrap">
                          {row.type && n(row.lf) > 0 ? `$${(n(row.lf) * rate).toFixed(2)}` : '—'}
                        </span>
                        {edgingRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setEdgingRows(rows => rows.filter((_, idx) => idx !== i))}
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
              setEdgingRows(r => [...r, { vendor: defaultVendorFor('Edging'), type: '', lf: '' }])
            }
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
                <th className="text-center pb-1 pr-1 font-medium">Cement</th>
                <th className="text-center pb-1 font-medium">$ per Cu Yd</th>
              </tr>
            </thead>
            <tbody>
              {dgRows.map((row, i) => {
                const rowOpts = sectionOptions('DG', row.vendor, [])
                const typeCost = resolveType(row.type, rowOpts, []).fallback
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
                        {row.type && !rowOpts.some(o => (o.ref_key || o.label) === row.type || o.label === row.type) && (
                          <option value={row.type}>{matName(row.type)}</option>
                        )}
                        {rowOpts.map(t => (
                          <option key={t.label} value={t.ref_key || t.label}>
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
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5"
                        value={row.cement}
                        onChange={e => updateDg(i, 'cement', e.target.value)}
                        title="Add Cement Mixture"
                      >
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </td>
                    <td className="py-1">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-xs text-gray-500 whitespace-nowrap">${typeCost.toFixed(2)}/CY</span>
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

      {/* ── Gravel (mirrors D.G. layout: Vendor | Type | Area | Depth | Weed Fabric | Method | Cement) ── */}
      <div>
        <SectionHeader title="Gravel" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-center pb-1 pr-1 font-medium">Vendor</th>
                <th className="text-center pb-1 pr-1 font-medium">Gravel Type</th>
                <th className="text-center pb-1 pr-1 font-medium">Area (SF)</th>
                <th className="text-center pb-1 pr-1 font-medium">Depth (in)</th>
                <th className="text-center pb-1 pr-1 font-medium">Weed Fabric</th>
                <th className="text-center pb-1 pr-1 font-medium">Method</th>
                <th className="text-center pb-1 font-medium">$ per Cu Yd</th>
              </tr>
            </thead>
            <tbody>
              {gravelRows.map((row, i) => {
                const rowOpts = sectionOptions('Gravel', row.vendor, [])
                const typeCost = resolveType(row.type, rowOpts, []).fallback
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
                        {!row.type && <option value="">Select Gravel</option>}
                        {row.type && !rowOpts.some(o => (o.ref_key || o.label) === row.type || o.label === row.type) && (
                          <option value={row.type}>{matName(row.type)}</option>
                        )}
                        {rowOpts.map(t => (
                          <option key={t.label} value={t.ref_key || t.label}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1 pr-1">
                      <NumInput value={row.sf} onChange={v => updateGravel(i, 'sf', v)} className="w-full text-center" />
                    </td>
                    <td className="py-1 pr-1">
                      <NumInput
                        value={row.depthIn}
                        onChange={v => updateGravel(i, 'depthIn', v)}
                        placeholder="3"
                        className="w-full text-center"
                      />
                    </td>
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5"
                        value={row.weedFabric ?? 'Yes'}
                        onChange={e => updateGravel(i, 'weedFabric', e.target.value)}
                      >
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </td>
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5"
                        value={row.method}
                        onChange={e => updateGravel(i, 'method', e.target.value)}
                      >
                        {DG_METHODS.map(m => (
                          <option key={m}>{m}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-xs text-gray-500 whitespace-nowrap">${typeCost.toFixed(2)}/CY</span>
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
                {
                  sf: '',
                  method: 'Hand',
                  type: '',
                  depthIn: '3',
                  weedFabric: 'Yes',
                  vendor: defaultVendorFor('Gravel'),
                },
              ])
            }
          >
            + Add Row
          </button>
        </div>
      </div>

      {/* ── Pebble (mirrors D.G. layout: Vendor | Type | Area | Depth | Weed Fabric | Method | Cement) ── */}
      <div>
        <SectionHeader title="Pebble" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-center pb-1 pr-1 font-medium">Vendor</th>
                <th className="text-center pb-1 pr-1 font-medium">Pebble Type</th>
                <th className="text-center pb-1 pr-1 font-medium">Area (SF)</th>
                <th className="text-center pb-1 pr-1 font-medium">Depth (in)</th>
                <th className="text-center pb-1 pr-1 font-medium">Weed Fabric</th>
                <th className="text-center pb-1 pr-1 font-medium">Method</th>
                <th className="text-center pb-1 font-medium">$ per Cu Yd</th>
              </tr>
            </thead>
            <tbody>
              {pebbleRows.map((row, i) => {
                const rowOpts = sectionOptions('Pebble', row.vendor, [])
                const typeCost = resolveType(row.type, rowOpts, []).fallback
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
                        {!row.type && <option value="">Select Pebble</option>}
                        {row.type && !rowOpts.some(o => (o.ref_key || o.label) === row.type || o.label === row.type) && (
                          <option value={row.type}>{matName(row.type)}</option>
                        )}
                        {rowOpts.map(t => (
                          <option key={t.label} value={t.ref_key || t.label}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1 pr-1">
                      <NumInput value={row.sf} onChange={v => updatePebble(i, 'sf', v)} className="w-full text-center" />
                    </td>
                    <td className="py-1 pr-1">
                      <NumInput
                        value={row.depthIn}
                        onChange={v => updatePebble(i, 'depthIn', v)}
                        placeholder="3"
                        className="w-full text-center"
                      />
                    </td>
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5"
                        value={row.weedFabric ?? 'Yes'}
                        onChange={e => updatePebble(i, 'weedFabric', e.target.value)}
                      >
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </td>
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5"
                        value={row.method}
                        onChange={e => updatePebble(i, 'method', e.target.value)}
                      >
                        {DG_METHODS.map(m => (
                          <option key={m}>{m}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-xs text-gray-500 whitespace-nowrap">${typeCost.toFixed(2)}/CY</span>
                        {pebbleRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setPebbleRows(rows => rows.filter((_, idx) => idx !== i))}
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
              setPebbleRows(r => [
                ...r,
                {
                  sf: '',
                  method: 'Hand',
                  type: '',
                  depthIn: '3',
                  weedFabric: 'Yes',
                  vendor: defaultVendorFor('Pebble'),
                },
              ])
            }
          >
            + Add Row
          </button>
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
                <th className="text-center pb-1 pr-1 font-medium">Area (SF)</th>
                <th className="text-center pb-1 pr-1 font-medium">Depth (in)</th>
                <th className="text-center pb-1 pr-1 font-medium">Weed Fabric</th>
                <th className="text-center pb-1 pr-1 font-medium">Method</th>
                <th className="text-center pb-1 font-medium">$ per Cu Yd</th>
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
                        {!row.type && <option value="">Select Cobble &amp; Boulders</option>}
                        {row.type && !rowOpts.some(o => (o.ref_key || o.label) === row.type || o.label === row.type) && (
                          <option value={row.type}>{matName(row.type)}</option>
                        )}
                        {rowOpts.map(t => (
                          <option key={t.label} value={t.ref_key || t.label}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1 pr-1">
                      <NumInput value={row.sf} onChange={v => updateCobble(i, 'sf', v)} className="w-full text-center" />
                    </td>
                    <td className="py-1 pr-1">
                      <NumInput
                        value={row.depthIn}
                        onChange={v => updateCobble(i, 'depthIn', v)}
                        placeholder="3"
                        className="w-full text-center"
                      />
                    </td>
                    <td className="py-1 pr-1">
                      <select
                        className="input text-sm py-1.5"
                        value={row.weedFabric ?? 'Yes'}
                        onChange={e => updateCobble(i, 'weedFabric', e.target.value)}
                      >
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
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
                    <td className="py-1">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-xs text-gray-500 whitespace-nowrap">${typeCost.toFixed(2)}/CY</span>
                        {cobbleRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setCobbleRows(rows => rows.filter((_, idx) => idx !== i))}
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
              setCobbleRows(r => [
                ...r,
                { sf: '', method: 'Hand', type: '', depthIn: '3', weedFabric: 'Yes', vendor: defaultVendorFor('Cobbles') },
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
                const wantFabric = (row.weedFabric ?? 'Yes') === 'Yes'
                const mat =
                  CY * ctype.fallback +
                  (wantFabric ? n(row.sf) * p(GT_RATES.gravelFabricMat.dbName) : 0)
                return (
                  <span key={i} className="text-xs text-gray-400">
                    #{i + 1}: {CY.toFixed(2)} Cu Yd · ${mat.toFixed(2)} mat
                  </span>
                )
              })}
            </div>
          )}
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
                <th className="text-center pb-1 pr-1 font-medium">Weed Fabric</th>
                <th className="text-center pb-1 font-medium">$ per Cu Yd</th>
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
                        {!row.type && <option value="">Select Mulch</option>}
                        {row.type && !rowOpts.some(o => (o.ref_key || o.label) === row.type || o.label === row.type) && (
                          <option value={row.type}>{matName(row.type)}</option>
                        )}
                        {rowOpts.map(t => (
                          <option key={t.label} value={t.ref_key || t.label}>
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
                      <select
                        className="input text-sm py-1.5"
                        value={row.weedFabric}
                        onChange={e => updateMulch(i, 'weedFabric', e.target.value)}
                      >
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </td>
                    <td className="py-1">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-xs text-gray-500 whitespace-nowrap">${typeCost.toFixed(2)}/CY</span>
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

      {/* ── Sod ── */}
      <div>
        <SectionHeader title="Sod" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-center pb-1 pr-1 font-medium">Vendor</th>
                <th className="text-center pb-1 pr-1 font-medium">Sod Type</th>
                <th className="text-center pb-1 pr-1 font-medium">Sq Ft</th>
                <th className="text-center pb-1 pr-1 font-medium">$ per Sq Ft</th>
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
                        {!row.type && <option value="">Select Sod</option>}
                        {row.type && !rowOpts.some(o => (o.ref_key || o.label) === row.type || o.label === row.type) && (
                          <option value={row.type}>{matName(row.type)}</option>
                        )}
                        {rowOpts.map(t => (
                          <option key={t.label} value={t.ref_key || t.label}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1 pr-1">
                      <NumInput
                        value={row.sf}
                        onChange={v => updateSodRow(i, 'sf', v)}
                        placeholder="Sq Ft"
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
                <th className="text-center pb-1 pr-1 font-medium">Sq Ft</th>
                <th className="text-center pb-1 font-medium text-gray-400">Coverage / Cost</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const sfPerBag = p(GT_RATES.fertilizerSFPerBag.dbName)
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
                          {!row.fertilizer && <option value="">Select Fertilizer</option>}
                          {row.fertilizer && !fertOpts.some(o => o.label === row.fertilizer) && (
                            <option value={row.fertilizer}>{row.fertilizer}</option>
                          )}
                          {fertOpts.map(t => (
                            <option key={t.label} value={t.ref_key || t.label}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1 pr-1">
                        <NumInput
                          value={row.sf}
                          onChange={v => updateSodFert(i, 'sf', v)}
                          placeholder="Sq Ft"
                          className="w-full text-center"
                        />
                      </td>
                      <td className="py-1 text-center text-xs text-gray-600 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <span>
                            {ft && ft.dbName && row.fertilizer
                              ? `$${ft.fallback.toFixed(2)}/bag · 1 bag / ${sfPerBag} Sq Ft${
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
                const sfPerDay = p(row.labRate.dbName)
                const perTon = st.fallback
                const sfN = n(row.sf)
                const tons = sfN / 80
                const mat = tons * perTon
                const hrs = sfN * sfPerDay // hrs-per-unit (hrs per Sq Ft)
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
                          <option key={o.label} value={o.ref_key || o.label}>
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
                        {sfPerDay} Hrs/Sq Ft
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

      {unpricedItem && (
        <UnpricedItemModal
          item={unpricedItem}
          onClose={() => setUnpricedItem(null)}
          onSaved={refreshAllRates}
        />
      )}
    </div>
    </SubTabContext.Provider>
  )
}
