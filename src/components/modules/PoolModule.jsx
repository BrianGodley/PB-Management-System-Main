import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import ModuleNotesField from './ModuleNotesField'
import RateEditPopover from '../RateEditPopover'
import { fetchSalesTaxRate } from '../../lib/companyDefaults'
import { calcWalkAccessLabor, DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN } from '../../lib/walkAccess'

// ─────────────────────────────────────────────────────────────────────────────
// Pool Module
// Material prices → material_rates (category = 'Pool') keyed by name
// Labor rates     → labor_rates    (category = 'Pool') keyed by name
// ─────────────────────────────────────────────────────────────────────────────

const LABOR_BURDEN = 0.29
const COMMISSION_RATE = 0.12

// ── Tile install rates (hrs/LF) — from Master Rates labor_rates ───────────
const TILE_INSTALL_DEFAULTS = {
  '6" Squares': 0.356,
  '3" Squares': 0.4,
  '2" Squares': 0.421,
  '1" Squares': 0.457,
  Segmental: 0.533,
  'Multi-Piece': 0.457,
  'Glass Tile': 0.533,
}
const TILE_INSTALL_TYPES = Object.keys(TILE_INSTALL_DEFAULTS)

// ── Tile material price options ($/SF) ───────────────────────────────────────
const TILE_MAT_OPTIONS = [
  '2.50',
  '3.00',
  '4.00',
  '5.00',
  '6.00',
  '7.00',
  '8.00',
  '10.00',
  '12.00',
  '15.00',
  '20.00',
]

// ── Coping defaults (mat $/LF, hrs/LF) ──────────────────────────────────────
const COPING_DEFAULTS = {
  'Paver Bullnose': { mat: 8.5, hrs: 0.4 },
  'Travertine 12"x12"': { mat: 13.0, hrs: 0.444 },
  'Precast Concrete': { mat: 50.0, hrs: 0.444 },
  'Arizona Flagstone Eased': { mat: 13.0, hrs: 0.5 },
  'Other Flagstone': { mat: 18.0, hrs: 0.533 },
  'Pacific Clay': { mat: 12.0, hrs: 0.41 },
  'Pour In Place Sand Finish': { mat: 7.5, hrs: 0.727 },
}
const COPING_TYPES = Object.keys(COPING_DEFAULTS)

// ── Spillway defaults (mat $/LF, hrs/LF) ─────────────────────────────────────
const SPILLWAY_DEFAULTS = {
  TILE: { mat: 30.0, hrs: 1.25 },
  FLAGSTONE: { mat: 24.0, hrs: 0.5 },
}
const SPILLWAY_TYPES = Object.keys(SPILLWAY_DEFAULTS)

// ── Interior finish defaults ($/SF — sub cost) ───────────────────────────────
const INTERIOR_DEFAULTS = {
  'White Plaster': 45,
  Quartzscapes: 87,
  Stonescapes: 83,
}
const INTERIOR_TYPES = Object.keys(INTERIOR_DEFAULTS)

// ── Raised surface defaults (mat $/SF, flat hrs/SF) ─────────────────────────
const RAISED_SURFACE_DEFAULTS = {
  '6" Square Tile': { mat: 6.5, hrs: 0.356 },
  '3" Square Tile': { mat: 6.5, hrs: 0.4 },
  '2" Square Tile': { mat: 6.5, hrs: 0.421 },
  '1" Square Tile': { mat: 6.5, hrs: 0.457 },
  'Segmental Tile': { mat: 6.5, hrs: 0.533 },
  'Multi-Piece Tile': { mat: 6.5, hrs: 0.457 },
  'Glass Tile': { mat: 12.0, hrs: 0.533 },
  'MSI Ledgerstone': { mat: 5.5, hrs: 0.2 },
  'Flat Flagstone Arizona': { mat: 4.5, hrs: 0.22 },
  'Flat Flagstone Other': { mat: 6.0, hrs: 0.22 },
  Stucco: { mat: 0.5, hrs: 0.1 },
  'Integral Color Stucco': { mat: 0.75, hrs: 0.11 },
}
const RAISED_SURFACE_TYPES = Object.keys(RAISED_SURFACE_DEFAULTS)

// ── Excavation equipment rates (CY/hr net) ───────────────────────────────────
// Each entry maps to a labor_rates row so the inline calculator icon next to
// the equipment dropdown can edit the CY/hr rate. Names match seed SQL.
const EXCAVATION_RATES = {
  'IH - Bobcat 72"': 7.33,
  'IH - Bobcat 64"': 7.14,
  'Rental 48"': 7.33,
  'Rental 42"': 7.33,
  'Medium Excavator': 29.75,
  'Large Excavator': 25.5,
  'Hand Dig': 0.5,
  'Sub Bobcat / Mini Bob': 0,
}
const EXCAVATION_LABOR_NAME = {
  'IH - Bobcat 72"': 'Excavation - IH Bobcat 72',
  'IH - Bobcat 64"': 'Excavation - IH Bobcat 64',
  'Rental 48"': 'Excavation - Rental 48',
  'Rental 42"': 'Excavation - Rental 42',
  'Medium Excavator': 'Excavation - Medium Excavator',
  'Large Excavator': 'Excavation - Large Excavator',
  'Hand Dig': 'Excavation - Hand Dig',
  'Sub Bobcat / Mini Bob': null, // sub cost, not a labor rate
}
const EXCAVATION_TYPES = Object.keys(EXCAVATION_RATES)

// ── Shotcrete defaults ────────────────────────────────────────────────────────
const SHOTCRETE_MAT_PER_CY = 200
const SHOTCRETE_LABOR_PER_CY = 85
const SHOTCRETE_LABOR_MIN = 3500

// ── Plumbing defaults ─────────────────────────────────────────────────────────
const PLUMBING_BASES = { 'Pool Only': 4500, 'Pool + Spa': 6000 }

// ── Equipment catalog ─────────────────────────────────────────────────────────
const EQUIPMENT_CATALOG = {
  Pump: [
    { model: 'VSHP270AUT', price: 1498 },
    { model: 'VSHP33AUT', price: 1650 },
    { model: 'Other', price: 0 },
  ],
  Filter: [
    { model: 'CV340', price: 1139 },
    { model: 'CV460', price: 1259 },
    { model: 'CV580', price: 1462 },
    { model: 'Other', price: 0 },
  ],
  Heater: [
    { model: 'VersaTemp', price: 4180 },
    { model: 'JXi400N', price: 2980 },
    { model: 'Other', price: 0 },
  ],
  'Salt Sanitizer': [
    { model: 'APUREM', price: 2047 },
    { model: 'Other', price: 0 },
  ],
  'Sheer Descent': [
    { model: '1\' - 1" Lip', price: 289 },
    { model: '2\' - 1" Lip', price: 349 },
    { model: '3\' - 1" Lip', price: 429 },
    { model: '4\' - 1" Lip', price: 559 },
    { model: '5\' - 1" Lip', price: 699 },
    { model: '6\' - 1" Lip', price: 899 },
    { model: '1\' - 6" Lip', price: 329 },
    { model: '2\' - 6" Lip', price: 399 },
    { model: '3\' - 6" Lip', price: 479 },
    { model: '4\' - 6" Lip', price: 609 },
    { model: '5\' - 6" Lip', price: 749 },
    { model: '6\' - 6" Lip', price: 949 },
    { model: '1\' - 12" Lip', price: 369 },
    { model: '2\' - 12" Lip', price: 449 },
    { model: '3\' - 12" Lip', price: 529 },
    { model: '4\' - 12" Lip', price: 659 },
    { model: '5\' - 12" Lip', price: 799 },
    { model: '6\' - 12" Lip', price: 999 },
    { model: 'Other', price: 0 },
  ],
  Lighting: [
    { model: "RGBW 50'", price: 634 },
    { model: "RGBW 100'", price: 743 },
    { model: 'Other', price: 0 },
  ],
  Automation: [
    { model: 'RS-P4', price: 2113 },
    { model: 'RS-PS4', price: 2024 },
    { model: 'RS-P6', price: 3048 },
    { model: 'RS-PS6', price: 3048 },
    { model: 'RS-PS8', price: 3853 },
    { model: 'Other', price: 0 },
  ],
}
const EQUIPMENT_CATEGORIES = Object.keys(EQUIPMENT_CATALOG)

const n = v => parseFloat(v) || 0

// ── Default state factories ────────────────────────────────────────────────────
const defaultStruct = (enabled = false) => ({
  enabled,
  waterSF: '',
  perimLF: '',
  maxDepth: '',
  stepBenchLF: '',
  damWallLF: '',
})
const defaultTileStruct = () => ({
  lf: '',
  installType: '6" Squares',
  matPricePerSF: '2.50',
  waterproof: false,
})
const defaultInteriorStruct = () => ({ type: 'White Plaster', subCost: '' })
const newSpillway = () => ({ struct: 'Pool', type: 'TILE', qty: '1', lf: '' })
const newCopingRow = () => ({ struct: 'Pool', type: 'Paver Bullnose', lf: '', sided: 'single' })
const newRaisedSurface = () => ({ matType: '6" Square Tile', sqft: '', curvePct: '', corners: '' })
const newEquipRow = () => ({ category: 'Pump', model: 'VSHP270AUT', qty: '1', unitCost: '' })
const newManualRow = () => ({ label: '', hours: '', materials: '', subCost: '' })

function makeInitial(data = {}) {
  return {
    hoursAdj: data.hoursAdj ?? '',
    difficulty: data.difficulty ?? '',
    pool: data.pool ?? defaultStruct(true),
    spa: data.spa ?? defaultStruct(),
    basin: data.basin ?? defaultStruct(),
    vault: data.vault ?? defaultStruct(),
    excavation: data.excavation ?? {
      equipment: 'IH - Bobcat 72"',
      fromTrucksLF: '',
      toDumpMiles: '',
      subCost: '',
    },
    shotcrete: data.shotcrete ?? { manualSubCost: '' },
    tile: data.tile ?? {
      Pool: defaultTileStruct(),
      Spa: defaultTileStruct(),
      'Infinity Basin': defaultTileStruct(),
      'Cover Vault': defaultTileStruct(),
    },
    spillways: data.spillways ?? [newSpillway()],
    copingRows: data.copingRows ?? [newCopingRow()],
    raisedSurfaces: data.raisedSurfaces ?? [],
    interiorFinish: data.interiorFinish ?? {
      Pool: defaultInteriorStruct(),
      Spa: defaultInteriorStruct(),
      'Infinity Basin': defaultInteriorStruct(),
      'Cover Vault': defaultInteriorStruct(),
    },
    equipment: data.equipment ?? [],
    plumbing: data.plumbing ?? {
      baseType: 'Pool Only',
      over20ft: false,
      remodel: false,
      extraLights: '',
      sheerDescents: '',
      manualSubCost: '',
    },
    steel: data.steel ?? { manualSubCost: '' },
    manualRows: data.manualRows ?? [newManualRow()],
    laborRatePerHour: data.laborRatePerHour ?? 35,
    gpmd: data.gpmd ?? 425,
    crewType: data.crewType ?? 'Specialty',
  }
}

// ── Main Calculation ──────────────────────────────────────────────────────────
function calcPool(state, materialPrices, laborRates, subRates = {}, walkAccess = null) {
  const _pace = parseFloat(walkAccess?.paceLfPerMin) || DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN
  const {
    pool,
    spa,
    basin,
    vault,
    excavation,
    shotcrete,
    tile,
    spillways,
    copingRows,
    raisedSurfaces,
    interiorFinish,
    equipment,
    plumbing,
    steel,
    manualRows,
    laborRatePerHour,
    gpmd,
  } = state

  const lrph = n(laborRatePerHour)
  const gpmdVal = n(gpmd)

  const activeStructs = [
    { key: 'Pool', s: pool, tileKey: 'Pool', iKey: 'Pool' },
    { key: 'Spa', s: spa, tileKey: 'Spa', iKey: 'Spa' },
    { key: 'Infinity Basin', s: basin, tileKey: 'Infinity Basin', iKey: 'Infinity Basin' },
    { key: 'Cover Vault', s: vault, tileKey: 'Cover Vault', iKey: 'Cover Vault' },
  ].filter(x => x.s.enabled)

  // ─ Volume helpers ─
  function avgDepth(s) {
    return (n(s.maxDepth) * 2) / 3
  }

  function excavCY(s) {
    if (!n(s.waterSF)) return 0
    return ((n(s.waterSF) * avgDepth(s)) / 27) * 1.07
  }

  function shotcreteCYFn(s) {
    if (!n(s.waterSF)) return 0
    const bot = (n(s.waterSF) * 0.5) / 27
    const wall = (n(s.perimLF) * avgDepth(s) * 0.5) / 27
    return (bot + wall) * 1.07
  }

  const totalExcavCY = activeStructs.reduce((s, x) => s + excavCY(x.s), 0)
  const totalShotCY = activeStructs.reduce((s, x) => s + shotcreteCYFn(x.s), 0)

  // ─ Excavation ─
  const isSubExcav = excavation.equipment === 'Sub Bobcat / Mini Bob'
  // DB value via labor_rates['Excavation - ...'] takes precedence over hardcoded fallback
  const excavLaborName = EXCAVATION_LABOR_NAME[excavation.equipment]
  const equipRate =
    (excavLaborName && laborRates[excavLaborName]) ?? EXCAVATION_RATES[excavation.equipment] ?? 7.33
  const excavHrs = !isSubExcav && equipRate > 0 ? totalExcavCY / equipRate : 0
  const excavSub = isSubExcav ? n(excavation.subCost) : 0

  // ─ Shotcrete sub (rates from subcontractor_rates, category='Pool') ─
  const shotMatCY = subRates['Shotcrete Material'] ?? SHOTCRETE_MAT_PER_CY
  const shotLabCY = subRates['Shotcrete Labor'] ?? SHOTCRETE_LABOR_PER_CY
  const shotMin = subRates['Shotcrete Minimum Labor'] ?? SHOTCRETE_LABOR_MIN
  const autoShotcreteSub = totalShotCY * shotMatCY + Math.max(shotMin, totalShotCY * shotLabCY)
  const shotcreteSub = n(shotcrete.manualSubCost) || autoShotcreteSub

  // ─ Waterline Tile ─
  let tileHrs = 0,
    tileMat = 0
  activeStructs.forEach(({ tileKey }) => {
    const t = tile[tileKey] || {}
    const lf = n(t.lf)
    if (!lf) return
    const installRate =
      laborRates[`Tile - ${t.installType}`] ?? TILE_INSTALL_DEFAULTS[t.installType] ?? 0.356
    // tile mat = LF × 0.5 SF/LF × price/SF (approximate: waterline tile width ~6")
    const matPriceSF = n(t.matPricePerSF)
    tileHrs += lf * installRate
    tileMat += lf * 0.5 * matPriceSF
  })

  // ─ Spillways ─
  let spillwayHrs = 0,
    spillwayMat = 0
  spillways.forEach(sw => {
    const qty = n(sw.qty)
    const lf = n(sw.lf)
    if (!qty || !lf) return
    const totalLF = qty * lf
    const def = SPILLWAY_DEFAULTS[sw.type] || { mat: 24, hrs: 0.5 }
    const matRate = materialPrices[`Spillway ${sw.type}`] ?? def.mat
    const labRate = laborRates[`Spillway - ${sw.type}`] ?? def.hrs
    spillwayHrs += totalLF * labRate
    spillwayMat += totalLF * matRate
  })

  // ─ Coping ─
  let copingHrs = 0,
    copingMat = 0
  copingRows.forEach(cr => {
    const lf = n(cr.lf)
    if (!lf) return
    const sided = cr.sided === 'double' ? 2 : 1
    const def = COPING_DEFAULTS[cr.type] || { mat: 8.5, hrs: 0.4 }
    const matRate = materialPrices[`Coping - ${cr.type}`] ?? def.mat
    const labRate = laborRates[`Coping - ${cr.type}`] ?? def.hrs
    copingHrs += lf * sided * labRate
    copingMat += lf * sided * matRate
  })

  // ─ Raised Surfaces ─
  let raisedHrs = 0,
    raisedMat = 0
  raisedSurfaces.forEach(rs => {
    const sqft = n(rs.sqft)
    const corners = n(rs.corners)
    if (!sqft) return
    const def = RAISED_SURFACE_DEFAULTS[rs.matType] || { mat: 6.5, hrs: 0.356 }
    const matRate = materialPrices[`Raised - ${rs.matType}`] ?? def.mat
    const labRate = laborRates[`Raised - ${rs.matType}`] ?? def.hrs
    const curveMult = 1 + n(rs.curvePct) / 100
    raisedHrs += sqft * labRate * curveMult + corners * 0.5
    raisedMat += sqft * matRate + corners * (def.mat * 0.2)
  })

  // ─ Interior Finish (rates from subcontractor_rates, category='Pool') ─
  let interiorSub = 0
  activeStructs.forEach(({ iKey, s }) => {
    const fin = interiorFinish[iKey] || {}
    const manSub = n(fin.subCost)
    if (manSub > 0) {
      interiorSub += manSub
    } else {
      const sf = n(s.waterSF)
      const priceSF = subRates[`Interior Finish - ${fin.type}`] ?? INTERIOR_DEFAULTS[fin.type] ?? 45
      interiorSub += sf * priceSF
    }
  })

  // ─ Pool Equipment ─
  // Each equipment row has a material rate (unit cost — sub charges) and an
  // optional labor rate (in-house install hours per unit, defaults to 0).
  let equipmentSub = 0,
    equipmentHrs = 0
  equipment.forEach(eq => {
    const qty = n(eq.qty)
    if (!qty) return
    const unitCost = n(eq.unitCost) || (materialPrices[eq.model] ?? 0)
    const labHrsEa = laborRates[`Equip Labor - ${eq.model}`] ?? 0
    equipmentSub += qty * unitCost
    equipmentHrs += qty * labHrsEa
  })

  // ─ Plumbing (rates from subcontractor_rates, category='Pool') ─
  const plumbBaseRate =
    subRates[`Plumbing ${plumbing.baseType}`] ?? PLUMBING_BASES[plumbing.baseType] ?? 4500
  let plumbSub
  if (n(plumbing.manualSubCost) > 0) {
    plumbSub = n(plumbing.manualSubCost)
  } else {
    plumbSub =
      plumbBaseRate +
      (plumbing.over20ft ? (subRates['Plumbing Over 20ft Add'] ?? 300) : 0) +
      (plumbing.remodel ? (subRates['Plumbing Remodel Add'] ?? 200) : 0) +
      n(plumbing.extraLights) * (subRates['Plumbing Extra Light'] ?? 150) +
      n(plumbing.sheerDescents) * (subRates['Plumbing Sheer Descent'] ?? 450)
  }

  // ─ Steel (rates from subcontractor_rates, category='Pool') ─
  let steelSub
  if (n(steel.manualSubCost) > 0) {
    steelSub = n(steel.manualSubCost)
  } else {
    const poolPerim = n(pool.perimLF)
    const steelPerLF = subRates['Steel Per LF'] ?? 8
    const steelSpaBonus = subRates['Steel Spa Bonus'] ?? 200
    steelSub = poolPerim * steelPerLF + (spa.enabled ? steelSpaBonus : 0)
  }

  // ─ Manual rows ─
  let manHrs = 0,
    manMat = 0,
    manSub = 0
  manualRows.forEach(r => {
    manHrs += n(r.hours)
    manMat += n(r.materials)
    manSub += n(r.subCost)
  })

  const _preWalkHrs =
    excavHrs +
    tileHrs +
    spillwayHrs +
    copingHrs +
    raisedHrs +
    equipmentHrs +
    manHrs +
    (parseFloat(state.hoursAdj) || 0)
  const walkHrs = calcWalkAccessLabor(_preWalkHrs, state.distanceLF, { paceLfPerMin: _pace })
  const totalHrs = _preWalkHrs + walkHrs
  const manDays = totalHrs / 8
  const totalMat = tileMat + spillwayMat + copingMat + raisedMat + manMat
  const subCost =
    excavSub + shotcreteSub + interiorSub + equipmentSub + plumbSub + steelSub + manSub
  const laborCost = totalHrs * lrph
  const burden = laborCost * LABOR_BURDEN
  const gp = manDays * gpmdVal
  const commission = gp * COMMISSION_RATE
  const price = totalMat + laborCost + burden + subCost + gp + commission

  return {
    totalHrs,
    manDays,
    totalMat,
    laborCost,
    burden,
    subCost,
    gp,
    commission,
    price,
    walkHrs,
    totalExcavCY,
    totalShotCY,
    excavHrs,
    tileHrs,
    spillwayHrs,
    copingHrs,
    raisedHrs,
    excavSub,
    shotcreteSub,
    interiorSub,
    equipmentSub,
    plumbSub,
    steelSub,
    equipRate, // resolved excavation CY/hr so the icon can show + edit it
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function SectionHeader({ title }) {
  return (
    <div className="bg-gray-50 rounded-lg px-4 py-2.5 border border-gray-200 mb-2">
      <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">{title}</h3>
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

function Label({ text, sub }) {
  return (
    <label className="block text-xs font-medium text-gray-600 mb-0.5">
      {text}
      {sub && <span className="text-gray-400 font-normal ml-1">({sub})</span>}
    </label>
  )
}

function StructDims({ label, data, onChange, alwaysEnabled }) {
  const toggle = () => onChange({ ...data, enabled: !data.enabled })
  if (!alwaysEnabled && !data.enabled) {
    return (
      <button
        type="button"
        onClick={toggle}
        className="w-full text-left px-3 py-2 rounded-lg border border-dashed border-gray-300 text-xs text-gray-400 hover:border-green-400 hover:text-green-600 transition-colors"
      >
        + Enable {label}
      </button>
    )
  }
  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-700">{label}</p>
        {!alwaysEnabled && (
          <button
            type="button"
            onClick={toggle}
            className="text-xs text-gray-400 hover:text-red-500"
          >
            Remove
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {[
          ['Water Surface', 'waterSF', 'sqft'],
          ['Perimeter', 'perimLF', 'LF'],
          ['Max Depth', 'maxDepth', 'ft'],
          ['Steps / Bench', 'stepBenchLF', 'LF'],
          // Dam Wall is spa-only (separates the spa from pool water surface).
          // Pool, Infinity Basin and Cover Vault don't use it.
          ...(label === 'Spa' ? [['Dam Wall', 'damWallLF', 'LF']] : []),
        ].map(([lbl, key, unit]) => (
          <div key={key}>
            <Label text={lbl} sub={unit} />
            <NumInput value={data[key]} onChange={v => onChange({ ...data, [key]: v })} />
          </div>
        ))}
        {n(data.maxDepth) > 0 && (
          <div className="flex items-end">
            <p className="text-xs text-gray-400 pb-2">
              Avg depth: {((n(data.maxDepth) * 2) / 3).toFixed(2)}′
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function PoolModule({ onSave, onBack, saving, initialData }) {
  const [state, setState] = useState(() => makeInitial(initialData))

  // Free-text notes for this module — Sam writes auto-generated
  // takeoffs here via create_estimate_from_takeoff, and the user can
  // overwrite / append their own.
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [materialPrices, setMaterialPrices] = useState({})
  const [laborRates, setLaborRates] = useState({})
  const [subRates, setSubRates] = useState({})
  const [loadingRates, setLoadingRates] = useState(true)

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

  // Re-fetch all three Pool rate tables. Called on mount and after edits.
  const refreshAllRates = useCallback(async () => {
    const [matRes, labRes, subRes] = await Promise.all([
      supabase.from('material_rates').select('name,unit_cost').eq('category', 'Pool'),
      supabase.from('labor_rates').select('name,rate').eq('category', 'Pool'),
      supabase.from('subcontractor_rates').select('trade,rate').eq('category', 'Pool'),
    ])
    const mp = {}
    ;(matRes.data || []).forEach(r => {
      mp[r.name] = parseFloat(r.unit_cost)
    })
    const lr = {}
    ;(labRes.data || []).forEach(r => {
      lr[r.name] = parseFloat(r.rate)
    })
    const sr = {}
    ;(subRes.data || []).forEach(r => {
      sr[r.trade] = parseFloat(r.rate)
    })
    setMaterialPrices(mp)
    setLaborRates(lr)
    setSubRates(sr)
  }, [])

  useEffect(() => {
    refreshAllRates().finally(() => setLoadingRates(false))
  }, [refreshAllRates])

  const upd = (key, val) => setState(p => ({ ...p, [key]: val }))
  const updStruct = (key, val) => setState(p => ({ ...p, [key]: val }))

  const subGpMarkupRate = initialData?.subGpMarkupRate ?? 0.2
  const calcRaw = calcPool(state, materialPrices, laborRates, subRates, state.walkAccess)
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

  function handleSave() {
    const data = {
      ...state,
      materialPrices,
      laborRates,
      subRates,
      calc,
    }
    onSave({
      notes,
      module_type: 'Pool',
      man_days: calc.manDays,
      material_cost: calc.totalMat,
      labor_cost: calc.laborCost,
      labor_burden: calc.burden,
      sub_cost: calc.subCost,
      gross_profit: calc.gp,
      total_price: calc.price,
      data,
    })
  }

  // ── Spillway helpers ──────────────────────────────────────────────────────────
  const addSpillway = () => upd('spillways', [...state.spillways, newSpillway()])
  const updSpillway = (i, key, val) => {
    const arr = [...state.spillways]
    arr[i] = { ...arr[i], [key]: val }
    upd('spillways', arr)
  }
  const removeSpillway = i =>
    upd(
      'spillways',
      state.spillways.filter((_, idx) => idx !== i)
    )

  // ── Coping helpers ────────────────────────────────────────────────────────────
  const addCoping = () => upd('copingRows', [...state.copingRows, newCopingRow()])
  const updCoping = (i, key, val) => {
    const arr = [...state.copingRows]
    arr[i] = { ...arr[i], [key]: val }
    upd('copingRows', arr)
  }
  const removeCoping = i =>
    upd(
      'copingRows',
      state.copingRows.filter((_, idx) => idx !== i)
    )

  // ── Raised surface helpers ────────────────────────────────────────────────────
  const addRaised = () => upd('raisedSurfaces', [...state.raisedSurfaces, newRaisedSurface()])
  const updRaised = (i, key, val) => {
    const arr = [...state.raisedSurfaces]
    arr[i] = { ...arr[i], [key]: val }
    upd('raisedSurfaces', arr)
  }
  const removeRaised = i =>
    upd(
      'raisedSurfaces',
      state.raisedSurfaces.filter((_, idx) => idx !== i)
    )

  // ── Equipment helpers ─────────────────────────────────────────────────────────
  const addEquip = () => upd('equipment', [...state.equipment, newEquipRow()])
  const updEquip = (i, key, val) => {
    const arr = [...state.equipment]
    arr[i] = { ...arr[i], [key]: val }
    // Auto-fill price when model changes
    if (key === 'model') {
      const models = EQUIPMENT_CATALOG[arr[i].category] || []
      const found = models.find(m => m.model === val)
      const dbPrice = materialPrices[val]
      arr[i].unitCost = (dbPrice ?? found?.price ?? '').toString()
    }
    if (key === 'category') {
      const models = EQUIPMENT_CATALOG[val] || []
      arr[i].model = models[0]?.model || ''
      const dbPrice = materialPrices[arr[i].model]
      arr[i].unitCost = (dbPrice ?? models[0]?.price ?? '').toString()
    }
    upd('equipment', arr)
  }
  const removeEquip = i =>
    upd(
      'equipment',
      state.equipment.filter((_, idx) => idx !== i)
    )

  // ── Manual row helpers ────────────────────────────────────────────────────────
  const addManual = () => upd('manualRows', [...state.manualRows, newManualRow()])
  const updManual = (i, key, val) => {
    const arr = [...state.manualRows]
    arr[i] = { ...arr[i], [key]: val }
    upd('manualRows', arr)
  }
  const removeManual = i =>
    upd(
      'manualRows',
      state.manualRows.filter((_, idx) => idx !== i)
    )

  const activeStructList = [
    ['Pool', state.pool, true],
    ['Spa', state.spa, false],
    ['Infinity Basin', state.basin, false],
    ['Cover Vault', state.vault, false],
  ]
    .filter(([, s, always]) => always || s.enabled)
    .map(([k]) => k)

  if (loadingRates)
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    )

  return (
    <div className="space-y-6 pb-6">
      {/* ── Sticky GPMD bar ── */}
      <div className="sticky top-0 z-20 -mx-6 px-6 pt-2 pb-2 bg-gray-900 shadow-lg space-y-2">
        <GpmdBar
          sticky
          totalMat={calc.totalMat}
          totalHrs={calc.totalHrs}
          manDays={calc.manDays}
          laborCost={calc.laborCost}
          lrph={n(state.laborRatePerHour)}
          burden={calc.burden}
          subCost={calc.subCost}
          gp={calc.gp}
          commission={calc.commission}
          price={calc.price}
          gpmd={n(state.gpmd)}
          subMarkupRate={subGpMarkupRate}
        />
  <ModuleNotesField value={notes} onChange={setNotes} />
            </div>

      {/* Crew Type */}
      <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-2.5 border border-gray-200">
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Crew Type</label>
        <select
          value={state.crewType}
          onChange={e => upd('crewType', e.target.value)}
          className="input text-sm py-1 w-36"
        >
          <option value="Demo">Demo</option>
          <option value="Landscape">Landscape</option>
          <option value="Masonry">Masonry</option>
          <option value="Paver">Paver</option>
          <option value="Specialty">Specialty</option>
        </select>
      </div>

      {/* Settings */}
      <SectionHeader title="Settings" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Difficulty (%)</p>
          <input
            type="number"
            step="5"
            value={state.difficulty ?? ''}
            onChange={e => upd('difficulty', e.target.value)}
            placeholder="0"
            className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
        <div>
          <p
            className="text-xs text-gray-500 mb-0.5"
            title="Average Distance from Truck to Work Area"
          >
            Truck → Work Area (Avg LF)
          </p>
          <input
            type="number"
            step="5"
            value={state.distanceLF}
            onChange={e => upd('distanceLF', e.target.value)}
            placeholder="0"
            className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          {calc.walkHrs > 0 && (
            <p className="text-[10px] text-gray-500 italic lowercase mt-0.5">
              +{calc.walkHrs.toFixed(2)} hrs walk-access
            </p>
          )}
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Hours Adj (±hrs)</p>
          <input
            type="number"
            step="0.5"
            value={state.hoursAdj ?? ''}
            onChange={e => upd('hoursAdj', e.target.value)}
            placeholder="0"
            className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
      </div>

      {/* ─── 1. Structure Dimensions ─── */}
      <div>
        <SectionHeader title="Structure Dimensions" />
        <p className="text-xs text-gray-400 italic mb-2">
          Dimensions are project measurements — no rate to adjust here. The rates that consume these
          dimensions (excavation, shotcrete, tile, coping, etc.) have their own calculator icons in
          the sections below.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <StructDims
            label="Pool"
            data={state.pool}
            onChange={v => updStruct('pool', v)}
            alwaysEnabled
          />
          <StructDims label="Spa" data={state.spa} onChange={v => updStruct('spa', v)} />
          <StructDims
            label="Infinity Basin"
            data={state.basin}
            onChange={v => updStruct('basin', v)}
          />
          <StructDims
            label="Cover Vault"
            data={state.vault}
            onChange={v => updStruct('vault', v)}
          />
        </div>
        {calc.totalExcavCY > 0 && (
          <div className="mt-2 flex gap-4 text-xs text-gray-500 px-1">
            <span>
              Excavation: <strong>{calc.totalExcavCY.toFixed(1)} CY</strong>
            </span>
            <span>
              Shotcrete shell: <strong>{calc.totalShotCY.toFixed(1)} CY</strong>
            </span>
          </div>
        )}
      </div>

      {/* ─── 2. Excavation ─── */}
      <div>
        <SectionHeader title="Excavation" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <Label text="Equipment" />
            <div className="flex items-center gap-1">
              <select
                className="input text-sm py-1.5 flex-1 min-w-0"
                value={state.excavation.equipment}
                onChange={e =>
                  upd('excavation', { ...state.excavation, equipment: e.target.value })
                }
              >
                {EXCAVATION_TYPES.map(t => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              {EXCAVATION_LABOR_NAME[state.excavation.equipment] && (
                <RateEditPopover
                  table="labor_rates"
                  name={EXCAVATION_LABOR_NAME[state.excavation.equipment]}
                  category="Pool"
                  mode="coefficient"
                  unitLabel="CY/hr"
                  currentValue={calc.equipRate}
                  onSaved={refreshAllRates}
                />
              )}
            </div>
          </div>
          <div>
            <Label text="From Trucks" sub="LF" />
            <NumInput
              value={state.excavation.fromTrucksLF}
              onChange={v => upd('excavation', { ...state.excavation, fromTrucksLF: v })}
            />
          </div>
          <div>
            <Label text="To Dump" sub="miles" />
            <NumInput
              value={state.excavation.toDumpMiles}
              onChange={v => upd('excavation', { ...state.excavation, toDumpMiles: v })}
            />
          </div>
          {state.excavation.equipment === 'Sub Bobcat / Mini Bob' && (
            <div>
              <Label text="Sub Cost" />
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  $
                </span>
                <NumInput
                  value={state.excavation.subCost}
                  onChange={v => upd('excavation', { ...state.excavation, subCost: v })}
                  className="pl-6"
                />
              </div>
            </div>
          )}
        </div>
        {calc.excavHrs > 0 && (
          <p className="text-xs text-gray-500 mt-2 px-1">
            {EXCAVATION_RATES[state.excavation.equipment] ?? '—'} CY/hr →{' '}
            <strong>{calc.excavHrs.toFixed(1)} hrs</strong>
          </p>
        )}
      </div>

      {/* ─── 3. Shotcrete ─── */}
      <div>
        <SectionHeader title="Shotcrete (Sub)" />
        <p className="text-xs text-gray-400 italic mb-2">
          Auto sub total is calculated from the three sub rates below — edit those rates via the
          calculator icons in the formula note.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <Label text="Auto Sub Total" />
            <div className="input text-sm py-1.5 bg-gray-50 text-gray-600">
              {fmt2(calcPool(state, materialPrices, laborRates, subRates).shotcreteSub)}
              <span className="text-xs text-gray-400 ml-1">auto</span>
            </div>
          </div>
          <div>
            <Label text="Override Sub Cost" />
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                $
              </span>
              <NumInput
                value={state.shotcrete.manualSubCost}
                onChange={v => upd('shotcrete', { ...state.shotcrete, manualSubCost: v })}
                className="pl-6"
                placeholder="leave blank for auto"
              />
            </div>
          </div>
          <div className="flex items-end pb-1">
            <p className="text-xs text-gray-400 inline-flex items-center flex-wrap gap-x-1">
              {calc.totalShotCY.toFixed(1)} CY × $
              {subRates['Shotcrete Material'] ?? SHOTCRETE_MAT_PER_CY}/CY mat
              <RateEditPopover
                table="subcontractor_rates"
                name="Shotcrete Material"
                category="Pool"
                unitLabel="CY"
                currentValue={subRates['Shotcrete Material'] ?? SHOTCRETE_MAT_PER_CY}
                onSaved={refreshAllRates}
              />
              + max(${(subRates['Shotcrete Minimum Labor'] ?? SHOTCRETE_LABOR_MIN).toLocaleString()}
              <RateEditPopover
                table="subcontractor_rates"
                name="Shotcrete Minimum Labor"
                category="Pool"
                unitLabel="flat"
                currentValue={subRates['Shotcrete Minimum Labor'] ?? SHOTCRETE_LABOR_MIN}
                onSaved={refreshAllRates}
              />
              , CY × ${subRates['Shotcrete Labor'] ?? SHOTCRETE_LABOR_PER_CY}/CY lab)
              <RateEditPopover
                table="subcontractor_rates"
                name="Shotcrete Labor"
                category="Pool"
                unitLabel="CY"
                currentValue={subRates['Shotcrete Labor'] ?? SHOTCRETE_LABOR_PER_CY}
                onSaved={refreshAllRates}
              />
            </p>
          </div>
        </div>
      </div>

      {/* ─── 4. Waterline Tile ─── */}
      <div>
        <SectionHeader title="Waterline Tile" />
        <div className="space-y-3">
          {[
            ['Pool', state.pool],
            ['Spa', state.spa],
            ['Infinity Basin', state.basin],
            ['Cover Vault', state.vault],
          ]
            .filter(([, s]) => s.enabled)
            .map(([k]) => {
              const t = state.tile[k] || defaultTileStruct()
              return (
                <div key={k} className="border border-gray-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-700 mb-2">{k}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <Label text="Waterline LF" />
                      <NumInput
                        value={t.lf}
                        onChange={v => upd('tile', { ...state.tile, [k]: { ...t, lf: v } })}
                      />
                    </div>
                    <div>
                      <Label text="Install Type" />
                      <div className="flex items-center gap-1">
                        <select
                          className="input text-sm py-1.5 flex-1 min-w-0"
                          value={t.installType}
                          onChange={e =>
                            upd('tile', {
                              ...state.tile,
                              [k]: { ...t, installType: e.target.value },
                            })
                          }
                        >
                          {TILE_INSTALL_TYPES.map(tp => (
                            <option key={tp}>{tp}</option>
                          ))}
                        </select>
                        <RateEditPopover
                          table="labor_rates"
                          name={`Tile - ${t.installType}`}
                          category="Pool"
                          mode="coefficient"
                          unitLabel="hrs/LF"
                          currentValue={
                            laborRates[`Tile - ${t.installType}`] ??
                            TILE_INSTALL_DEFAULTS[t.installType]
                          }
                          onSaved={refreshAllRates}
                        />
                      </div>
                    </div>
                    <div>
                      <Label text="Material" sub="$/SF" />
                      <select
                        className="input text-sm py-1.5"
                        value={t.matPricePerSF}
                        onChange={e =>
                          upd('tile', {
                            ...state.tile,
                            [k]: { ...t, matPricePerSF: e.target.value },
                          })
                        }
                      >
                        {TILE_MAT_OPTIONS.map(p => (
                          <option key={p}>${p}/SF</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end pb-1">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={t.waterproof}
                          onChange={e =>
                            upd('tile', {
                              ...state.tile,
                              [k]: { ...t, waterproof: e.target.checked },
                            })
                          }
                          className="rounded"
                        />
                        <span className="text-xs text-gray-600">Waterproofing incl.</span>
                      </label>
                    </div>
                  </div>
                  {n(t.lf) > 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      {(TILE_INSTALL_DEFAULTS[t.installType] ?? 0.356).toFixed(3)} hrs/LF →{' '}
                      {(n(t.lf) * (TILE_INSTALL_DEFAULTS[t.installType] ?? 0.356)).toFixed(1)} hrs
                    </p>
                  )}
                </div>
              )
            })}
        </div>
      </div>

      {/* ─── 5. Spillways ─── */}
      <div>
        <SectionHeader title="Spillways" />
        <div className="space-y-2">
          {state.spillways.map((sw, i) => (
            <div key={i} className="grid grid-cols-5 gap-2 items-end">
              <div>
                <Label text="Structure" />
                <select
                  className="input text-sm py-1.5"
                  value={sw.struct}
                  onChange={e => updSpillway(i, 'struct', e.target.value)}
                >
                  {activeStructList.map(s => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label text="Type" />
                <div className="flex items-center gap-1">
                  <select
                    className="input text-sm py-1.5 flex-1 min-w-0"
                    value={sw.type}
                    onChange={e => updSpillway(i, 'type', e.target.value)}
                  >
                    {SPILLWAY_TYPES.map(t => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                  <span className="text-[10px] text-gray-400 ml-1">mat</span>
                  <RateEditPopover
                    table="material_rates"
                    name={`Spillway ${sw.type}`}
                    category="Pool"
                    unitLabel="LF"
                    currentValue={
                      materialPrices[`Spillway ${sw.type}`] ?? SPILLWAY_DEFAULTS[sw.type]?.mat
                    }
                    onSaved={refreshAllRates}
                  />
                  <span className="text-[10px] text-gray-400">lab</span>
                  <RateEditPopover
                    table="labor_rates"
                    name={`Spillway - ${sw.type}`}
                    category="Pool"
                    mode="coefficient"
                    unitLabel="hrs/LF"
                    currentValue={
                      laborRates[`Spillway - ${sw.type}`] ?? SPILLWAY_DEFAULTS[sw.type]?.hrs
                    }
                    onSaved={refreshAllRates}
                  />
                </div>
              </div>
              <div>
                <Label text="Qty" />
                <NumInput value={sw.qty} onChange={v => updSpillway(i, 'qty', v)} />
              </div>
              <div>
                <Label text="LF each" />
                <NumInput value={sw.lf} onChange={v => updSpillway(i, 'lf', v)} />
              </div>
              <button
                type="button"
                onClick={() => removeSpillway(i)}
                className="text-gray-300 hover:text-red-400 text-lg pb-1"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addSpillway}
            className="text-xs text-green-700 hover:underline mt-1"
          >
            + Add Spillway
          </button>
        </div>
      </div>

      {/* ─── 6. Coping ─── */}
      <div>
        <SectionHeader title="Coping" />
        <div className="space-y-2">
          {state.copingRows.map((cr, i) => (
            <div key={i} className="grid grid-cols-5 gap-2 items-end">
              <div>
                <Label text="Structure" />
                <select
                  className="input text-sm py-1.5"
                  value={cr.struct}
                  onChange={e => updCoping(i, 'struct', e.target.value)}
                >
                  {activeStructList.map(s => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <Label text="Coping Type" />
                <div className="flex items-center gap-1">
                  <select
                    className="input text-sm py-1.5 flex-1 min-w-0"
                    value={cr.type}
                    onChange={e => updCoping(i, 'type', e.target.value)}
                  >
                    {COPING_TYPES.map(t => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                  <span className="text-[10px] text-gray-400 ml-1">mat</span>
                  <RateEditPopover
                    table="material_rates"
                    name={`Coping - ${cr.type}`}
                    category="Pool"
                    unitLabel="LF"
                    currentValue={
                      materialPrices[`Coping - ${cr.type}`] ?? COPING_DEFAULTS[cr.type]?.mat
                    }
                    onSaved={refreshAllRates}
                  />
                  <span className="text-[10px] text-gray-400">lab</span>
                  <RateEditPopover
                    table="labor_rates"
                    name={`Coping - ${cr.type}`}
                    category="Pool"
                    mode="coefficient"
                    unitLabel="hrs/LF"
                    currentValue={
                      laborRates[`Coping - ${cr.type}`] ?? COPING_DEFAULTS[cr.type]?.hrs
                    }
                    onSaved={refreshAllRates}
                  />
                </div>
              </div>
              <div>
                <Label text="LF" />
                <NumInput value={cr.lf} onChange={v => updCoping(i, 'lf', v)} />
              </div>
              <div>
                <Label text="Sided" />
                <select
                  className="input text-sm py-1.5"
                  value={cr.sided}
                  onChange={e => updCoping(i, 'sided', e.target.value)}
                >
                  <option value="single">Single</option>
                  <option value="double">Double</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => removeCoping(i)}
                className="text-gray-300 hover:text-red-400 text-lg pb-1"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addCoping}
            className="text-xs text-green-700 hover:underline mt-1"
          >
            + Add Coping Row
          </button>
        </div>
      </div>

      {/* ─── 7. Raised Surfaces ─── */}
      <div>
        <SectionHeader title="Raised Surfaces" />
        <div className="space-y-2">
          {state.raisedSurfaces.map((rs, i) => (
            <div key={i} className="grid grid-cols-5 gap-2 items-end">
              <div className="col-span-2">
                <Label text="Surface Type" />
                <div className="flex items-center gap-1">
                  <select
                    className="input text-sm py-1.5 flex-1 min-w-0"
                    value={rs.matType}
                    onChange={e => updRaised(i, 'matType', e.target.value)}
                  >
                    {RAISED_SURFACE_TYPES.map(t => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                  <span className="text-[10px] text-gray-400 ml-1">mat</span>
                  <RateEditPopover
                    table="material_rates"
                    name={`Raised - ${rs.matType}`}
                    category="Pool"
                    unitLabel="SF"
                    currentValue={
                      materialPrices[`Raised - ${rs.matType}`] ??
                      RAISED_SURFACE_DEFAULTS[rs.matType]?.mat
                    }
                    onSaved={refreshAllRates}
                  />
                  <span className="text-[10px] text-gray-400">lab</span>
                  <RateEditPopover
                    table="labor_rates"
                    name={`Raised - ${rs.matType}`}
                    category="Pool"
                    mode="coefficient"
                    unitLabel="hrs/SF"
                    currentValue={
                      laborRates[`Raised - ${rs.matType}`] ??
                      RAISED_SURFACE_DEFAULTS[rs.matType]?.hrs
                    }
                    onSaved={refreshAllRates}
                  />
                </div>
              </div>
              <div>
                <Label text="Sqft" />
                <NumInput value={rs.sqft} onChange={v => updRaised(i, 'sqft', v)} />
              </div>
              <div>
                <Label text="Curve %" />
                <NumInput
                  value={rs.curvePct}
                  onChange={v => updRaised(i, 'curvePct', v)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label text="Corners" />
                <NumInput
                  value={rs.corners}
                  onChange={v => updRaised(i, 'corners', v)}
                  placeholder="0"
                />
              </div>
              <button
                type="button"
                onClick={() => removeRaised(i)}
                className="text-gray-300 hover:text-red-400 text-lg pb-1"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addRaised}
            className="text-xs text-green-700 hover:underline mt-1"
          >
            + Add Raised Surface
          </button>
        </div>
      </div>

      {/* ─── 8. Interior Finish ─── */}
      <div>
        <SectionHeader title="Interior Finish (Sub)" />
        <div className="space-y-3">
          {[
            ['Pool', state.pool],
            ['Spa', state.spa],
            ['Infinity Basin', state.basin],
            ['Cover Vault', state.vault],
          ]
            .filter(([, s]) => s.enabled)
            .map(([k, s]) => {
              const fin = state.interiorFinish[k] || defaultInteriorStruct()
              const priceSF =
                subRates[`Interior Finish - ${fin.type}`] ?? INTERIOR_DEFAULTS[fin.type] ?? 45
              const autoSub = n(s.waterSF) * priceSF
              return (
                <div key={k} className="border border-gray-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-700 mb-2">{k}</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label text="Finish Type" />
                      <div className="flex items-center gap-1">
                        <select
                          className="input text-sm py-1.5 flex-1 min-w-0"
                          value={fin.type}
                          onChange={e =>
                            upd('interiorFinish', {
                              ...state.interiorFinish,
                              [k]: { ...fin, type: e.target.value },
                            })
                          }
                        >
                          {INTERIOR_TYPES.map(t => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
                        <RateEditPopover
                          table="subcontractor_rates"
                          name={`Interior Finish - ${fin.type}`}
                          category="Pool"
                          unitLabel="SF"
                          currentValue={priceSF}
                          onSaved={refreshAllRates}
                        />
                      </div>
                    </div>
                    <div>
                      <Label text="Auto Sub" sub={`$${priceSF}/SF`} />
                      <div className="input text-sm py-1.5 bg-gray-50 text-gray-600">
                        {autoSub > 0 ? fmt2(autoSub) : '—'}
                      </div>
                    </div>
                    <div>
                      <Label text="Override Sub Cost" />
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                          $
                        </span>
                        <NumInput
                          value={fin.subCost}
                          onChange={v =>
                            upd('interiorFinish', {
                              ...state.interiorFinish,
                              [k]: { ...fin, subCost: v },
                            })
                          }
                          className="pl-6"
                          placeholder="override"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
        </div>
      </div>

      {/* ─── 9. Pool Equipment (Sub) ─── */}
      <div>
        <SectionHeader title="Pool Equipment (Sub)" />
        <div className="space-y-2">
          {state.equipment.map((eq, i) => {
            const models = EQUIPMENT_CATALOG[eq.category] || []
            const catalogPrice = models.find(m => m.model === eq.model)?.price ?? 0
            const matRate = materialPrices[eq.model] ?? catalogPrice
            const labRate = laborRates[`Equip Labor - ${eq.model}`] ?? 0
            return (
              <div key={i} className="grid grid-cols-6 gap-2 items-end">
                <div className="col-span-2">
                  <Label text="Category" />
                  <select
                    className="input text-sm py-1.5"
                    value={eq.category}
                    onChange={e => updEquip(i, 'category', e.target.value)}
                  >
                    {EQUIPMENT_CATEGORIES.map(c => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <Label text="Model" />
                  <div className="flex items-center gap-1">
                    <select
                      className="input text-sm py-1.5 flex-1 min-w-0"
                      value={eq.model}
                      onChange={e => updEquip(i, 'model', e.target.value)}
                    >
                      {models.map(m => (
                        <option key={m.model} value={m.model}>
                          {m.model}
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-gray-400 ml-1">mat</span>
                    <RateEditPopover
                      table="material_rates"
                      name={eq.model}
                      category="Pool"
                      unitLabel="ea"
                      currentValue={matRate}
                      onSaved={refreshAllRates}
                    />
                    <span className="text-[10px] text-gray-400">lab</span>
                    <RateEditPopover
                      table="labor_rates"
                      name={`Equip Labor - ${eq.model}`}
                      category="Pool"
                      mode="coefficient"
                      unitLabel="hrs/ea"
                      currentValue={labRate}
                      onSaved={refreshAllRates}
                    />
                  </div>
                </div>
                <div>
                  <Label text="Qty" />
                  <NumInput value={eq.qty} onChange={v => updEquip(i, 'qty', v)} placeholder="1" />
                </div>
                <div>
                  <Label text="Unit $" />
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                      $
                    </span>
                    <NumInput
                      value={eq.unitCost}
                      onChange={v => updEquip(i, 'unitCost', v)}
                      className="pl-5"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeEquip(i)}
                  className="text-gray-300 hover:text-red-400 text-lg pb-1"
                >
                  ✕
                </button>
              </div>
            )
          })}
          <button
            type="button"
            onClick={addEquip}
            className="text-xs text-green-700 hover:underline mt-1"
          >
            + Add Equipment
          </button>
        </div>
      </div>

      {/* ─── 10. Plumbing (Sub) ─── */}
      <div>
        <SectionHeader title="Plumbing (Sub)" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <Label text="Base Configuration" />
            <div className="flex items-center gap-1">
              <select
                className="input text-sm py-1.5 flex-1 min-w-0"
                value={state.plumbing.baseType}
                onChange={e => upd('plumbing', { ...state.plumbing, baseType: e.target.value })}
              >
                {Object.keys(PLUMBING_BASES).map(k => (
                  <option key={k}>{k}</option>
                ))}
              </select>
              <RateEditPopover
                table="subcontractor_rates"
                name={`Plumbing ${state.plumbing.baseType}`}
                category="Pool"
                unitLabel="flat"
                currentValue={
                  subRates[`Plumbing ${state.plumbing.baseType}`] ??
                  PLUMBING_BASES[state.plumbing.baseType]
                }
                onSaved={refreshAllRates}
              />
            </div>
          </div>
          <div>
            <Label text="Extra Lights" sub="qty" />
            <div className="flex items-center gap-1">
              <NumInput
                value={state.plumbing.extraLights}
                onChange={v => upd('plumbing', { ...state.plumbing, extraLights: v })}
              />
              <RateEditPopover
                table="subcontractor_rates"
                name="Plumbing Extra Light"
                category="Pool"
                unitLabel="ea"
                currentValue={subRates['Plumbing Extra Light'] ?? 150}
                onSaved={refreshAllRates}
              />
            </div>
          </div>
          <div>
            <Label text="Sheer Descents" sub="qty" />
            <div className="flex items-center gap-1">
              <NumInput
                value={state.plumbing.sheerDescents}
                onChange={v => upd('plumbing', { ...state.plumbing, sheerDescents: v })}
              />
              <RateEditPopover
                table="subcontractor_rates"
                name="Plumbing Sheer Descent"
                category="Pool"
                unitLabel="ea"
                currentValue={subRates['Plumbing Sheer Descent'] ?? 450}
                onSaved={refreshAllRates}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2 pt-1">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={state.plumbing.over20ft}
                onChange={e => upd('plumbing', { ...state.plumbing, over20ft: e.target.checked })}
                className="rounded"
              />
              <span className="text-xs text-gray-600">
                &gt;20ft from equipment (+${subRates['Plumbing Over 20ft Add'] ?? 300})
              </span>
              <RateEditPopover
                table="subcontractor_rates"
                name="Plumbing Over 20ft Add"
                category="Pool"
                unitLabel="flat"
                currentValue={subRates['Plumbing Over 20ft Add'] ?? 300}
                onSaved={refreshAllRates}
              />
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={state.plumbing.remodel}
                onChange={e => upd('plumbing', { ...state.plumbing, remodel: e.target.checked })}
                className="rounded"
              />
              <span className="text-xs text-gray-600">
                Remodel (+${subRates['Plumbing Remodel Add'] ?? 200})
              </span>
              <RateEditPopover
                table="subcontractor_rates"
                name="Plumbing Remodel Add"
                category="Pool"
                unitLabel="flat"
                currentValue={subRates['Plumbing Remodel Add'] ?? 200}
                onSaved={refreshAllRates}
              />
            </label>
          </div>
          <div>
            <Label text="Override Sub Cost" />
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                $
              </span>
              <NumInput
                value={state.plumbing.manualSubCost}
                onChange={v => upd('plumbing', { ...state.plumbing, manualSubCost: v })}
                className="pl-6"
                placeholder="leave blank for auto"
              />
            </div>
          </div>
          <div className="flex items-end pb-1">
            <p className="text-xs text-gray-400 inline-flex items-center flex-wrap gap-1">
              Auto: {fmt2(calc.plumbSub)}
              <br />
              Base: $
              {(
                subRates[`Plumbing ${state.plumbing.baseType}`] ??
                PLUMBING_BASES[state.plumbing.baseType] ??
                4500
              ).toLocaleString()}
              <RateEditPopover
                table="subcontractor_rates"
                name={`Plumbing ${state.plumbing.baseType}`}
                category="Pool"
                unitLabel="flat"
                currentValue={
                  subRates[`Plumbing ${state.plumbing.baseType}`] ??
                  PLUMBING_BASES[state.plumbing.baseType]
                }
                onSaved={refreshAllRates}
              />
            </p>
          </div>
        </div>
      </div>

      {/* ─── 11. Steel (Sub) ─── */}
      <div>
        <SectionHeader title="Steel (Sub)" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <Label text="Auto Sub Total" />
            <div className="input text-sm py-1.5 bg-gray-50 text-gray-600">
              {fmt2(calc.steelSub)}
              <span className="text-xs text-gray-400 ml-1">auto</span>
            </div>
          </div>
          <div>
            <Label text="Override Sub Cost" />
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                $
              </span>
              <NumInput
                value={state.steel.manualSubCost}
                onChange={v => upd('steel', { ...state.steel, manualSubCost: v })}
                className="pl-6"
                placeholder="leave blank for auto"
              />
            </div>
          </div>
          <div className="flex items-end pb-1">
            <p className="text-xs text-gray-400 inline-flex items-center flex-wrap gap-1">
              Auto: pool perimeter × ${subRates['Steel Per LF'] ?? 8}/LF
              <RateEditPopover
                table="subcontractor_rates"
                name="Steel Per LF"
                category="Pool"
                unitLabel="LF"
                currentValue={subRates['Steel Per LF'] ?? 8}
                onSaved={refreshAllRates}
              />
              {state.spa.enabled && (
                <>
                  + ${subRates['Steel Spa Bonus'] ?? 200} spa
                  <RateEditPopover
                    table="subcontractor_rates"
                    name="Steel Spa Bonus"
                    category="Pool"
                    unitLabel="flat"
                    currentValue={subRates['Steel Spa Bonus'] ?? 200}
                    onSaved={refreshAllRates}
                  />
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ─── 12. Manual Entry ─── */}
      <div>
        <SectionHeader title="Manual Entry" />
        <div className="space-y-2">
          {state.manualRows.map((r, i) => (
            <div key={i} className="grid grid-cols-5 gap-2 items-end">
              <div className="col-span-2">
                {i === 0 && <Label text="Description" />}
                <input
                  className="input text-sm py-1.5"
                  placeholder="Description"
                  value={r.label}
                  onChange={e => updManual(i, 'label', e.target.value)}
                />
              </div>
              <div>
                {i === 0 && <Label text="Hours" />}
                <NumInput value={r.hours} onChange={v => updManual(i, 'hours', v)} />
              </div>
              <div>
                {i === 0 && <Label text="Materials $" />}
                <NumInput value={r.materials} onChange={v => updManual(i, 'materials', v)} />
              </div>
              <div>
                {i === 0 && <Label text="Sub Cost $" />}
                <NumInput value={r.subCost} onChange={v => updManual(i, 'subCost', v)} />
              </div>
              <button
                type="button"
                onClick={() => removeManual(i)}
                className="text-gray-300 hover:text-red-400 text-lg pb-1"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addManual}
            className="text-xs text-green-700 hover:underline mt-1"
          >
            + Add Row
          </button>
        </div>
      </div>

      {/* ─── Summary bar ─── */}

      {/* ─── Actions ─── */}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onBack} className="btn-secondary flex-1 text-sm">
          ← Back
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex-1 text-sm"
        >
          {saving ? 'Saving…' : 'Save Pool Module'}
        </button>
      </div>
    </div>
  )
}
