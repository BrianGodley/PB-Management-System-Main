import WorkTypeChooser from './WorkTypeChooser'
import CrewTypeBar from './CrewTypeBar'
import ModuleHeaderSlot from './ModuleHeaderSlot'
import { useState, useEffect, useCallback, useContext } from 'react'
import { SubTabContext, subSectionTitle } from './subTabContext'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import { SubRateOverrideProvider } from '../SubRateOverrideContext.jsx'
import { fetchSalesTaxRate } from '../../lib/companyDefaults'
import { calcWalkAccessLabor, DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN } from '../../lib/walkAccess'
import { catalogItemFor, catalogOptions, fetchModuleCatalog, fetchStandardRateMap } from '../../lib/materialCatalog'

const CATALOG_OPTS = { standardRows: 'exclude', stripPrefix: true }

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


// ── Electrical & Plumbing catalog (ported from the Utilities module) ──────────
// Rates live in material_rates / labor_rates under category 'Utilities' so they
// stay a single source of truth shared with the Utilities module. Fallbacks
// below are used only when the DB row is absent. A vendor overrides ONLY the
// material price for the selected item; labor always comes from the built-in.
const UTILITY_LINE_TYPES = {
  'PVC Conduit with Electrical': { costPerLF: 1.92, dbName: 'PVC Conduit with Electrical', laborPerLF: 0.05, laborDbName: 'PVC Conduit with Electrical - Labor Rate' },
  '1-1/2" Poly Gas Pipe': { costPerLF: 4.25, dbName: '1-1/2" Poly Gas Pipe', laborPerLF: 0.05, laborDbName: '1-1/2" Poly Gas Pipe - Labor Rate' },
  '1" Black Iron Gas Pipe': { costPerLF: 2.76, dbName: '1" Black Iron Gas Pipe', laborPerLF: 0.15, laborDbName: '1" Black Iron Gas Pipe - Labor Rate' },
  '1-1/2" Black Iron Gas Pipe': { costPerLF: 4.23, dbName: '1-1/2" Black Iron Gas Pipe', laborPerLF: 0.2, laborDbName: '1-1/2" Black Iron Gas Pipe - Labor Rate' },
  '2" Black Iron Gas Pipe': { costPerLF: 5.72, dbName: '2" Black Iron Gas Pipe', laborPerLF: 0.25, laborDbName: '2" Black Iron Gas Pipe - Labor Rate' },
}
const GAS_FIXTURE_TYPES = {
  '12" Single Gas Ring': { cost: 61.75, dbName: '12" Single Gas Ring', laborHrs: 2, laborDbName: '12" Single Gas Ring - Labor Rate' },
  '18" Single Gas Ring': { cost: 84.75, dbName: '18" Single Gas Ring', laborHrs: 2, laborDbName: '18" Single Gas Ring - Labor Rate' },
  '24" Single Gas Ring': { cost: 107.75, dbName: '24" Single Gas Ring', laborHrs: 2, laborDbName: '24" Single Gas Ring - Labor Rate' },
  '24" Double Gas Ring': { cost: 163.25, dbName: '24" Double Gas Ring', laborHrs: 2, laborDbName: '24" Double Gas Ring - Labor Rate' },
  "2' Straight Gas Bar": { cost: 35.5, dbName: "2' Straight Gas Bar", laborHrs: 2, laborDbName: "2' Straight Gas Bar - Labor Rate" },
  "3' Straight Gas Bar": { cost: 56.0, dbName: "3' Straight Gas Bar", laborHrs: 2.5, laborDbName: "3' Straight Gas Bar - Labor Rate" },
  "4' Straight Gas Bar": { cost: 68.5, dbName: "4' Straight Gas Bar", laborHrs: 3, laborDbName: "4' Straight Gas Bar - Labor Rate" },
  'Gas Shut-Off Valve': { cost: 89.7, dbName: 'Gas Shut-Off Valve', laborHrs: 2, laborDbName: 'Gas Shut-Off Valve - Labor Rate' },
}
const ELECTRICAL_FIXTURE_TYPES = {
  'Electric Sub-panel': { cost: 300, dbName: 'Electric Sub-panel', laborHrs: 4.5, laborDbName: 'Electric Sub-panel - Labor Rate' },
  'Electric Disconnect': { cost: 150, dbName: 'Electric Disconnect', laborHrs: 2.5, laborDbName: 'Electric Disconnect - Labor Rate' },
  'GFCI Protected Receptacles': { cost: 86.25, dbName: 'GFCI Protected Receptacles', laborHrs: 2, laborDbName: 'GFCI Protected Receptacles - Labor Rate' },
  'Bubble Covers for Receptacles': { cost: 19.19, dbName: 'Bubble Covers for Receptacles', laborHrs: 0.25, laborDbName: 'Bubble Covers for Receptacles - Labor Rate' },
  'Infratech W2024SS 2000W 240V Heater (Stainless)': { cost: 725.22, dbName: 'Infratech W2024SS 2000W 240V Heater (Stainless)', laborHrs: 6, laborDbName: 'Infratech W2024SS 2000W 240V Heater (Stainless) - Labor Rate' },
  'Infratech W39 Flush Mount Frame': { cost: 572.26, dbName: 'Infratech W39 Flush Mount Frame', laborHrs: 2, laborDbName: 'Infratech W39 Flush Mount Frame - Labor Rate' },
  'Infratech Single Duplex Switch in Surface Mount Gang Box': { cost: 206.11, dbName: 'Infratech Single Duplex Switch in Surface Mount Gang Box', laborHrs: 2, laborDbName: 'Infratech Single Duplex Switch in Surface Mount Gang Box - Labor Rate' },
}
const LINE_TYPE_ARR = Object.entries(UTILITY_LINE_TYPES).map(([label, t]) => ({ label, dbName: t.dbName, fallback: t.costPerLF, laborDbName: t.laborDbName, laborFallback: t.laborPerLF }))
const GAS_TYPE_ARR = Object.entries(GAS_FIXTURE_TYPES).map(([label, t]) => ({ label, dbName: t.dbName, fallback: t.cost, laborDbName: t.laborDbName, laborFallback: t.laborHrs }))
const ELEC_TYPE_ARR = Object.entries(ELECTRICAL_FIXTURE_TYPES).map(([label, t]) => ({ label, dbName: t.dbName, fallback: t.cost, laborDbName: t.laborDbName, laborFallback: t.laborHrs }))
const UTIL_CAT = { line: 'Utility Lines', gas: 'Gas Fixtures', elec: 'Electrical Fixtures' }
// Vendor-first Type list: Standard/unset → null-vendor Items merged with built-ins;
// a real vendor → ONLY that vendor's Items (built-ins fall away).
function mergedUtilTypes(cat, builtInArr, materialRows, vendorSel = 'Standard') {
  const isStd = !vendorSel || vendorSel === 'Standard' || vendorSel === 'auto'
  if (isStd) {
    const extra = catalogOptions(materialRows, cat, 'Standard', { standardRows: 'null-vendor', stripPrefix: true })
      .filter(o => !builtInArr.some(b => b.label === o.label))
      .map(o => ({
        label: o.label,
        dbName: o.row.name,
        fallback: n(o.row.unit_cost),
        laborDbName: `${o.label} - Labor Rate`,
        laborFallback: 0,
        fromMaster: true,
      }))
    return extra.length ? [...builtInArr, ...extra] : builtInArr
  }
  const catRows = catalogOptions(materialRows, cat, vendorSel, { standardRows: 'null-vendor', stripPrefix: true })
  if (!catRows.length) return []
  return catRows.map(o => {
    const bi = builtInArr.find(b => b.dbName === o.row.name || b.label === o.label)
    return {
      label: o.label,
      dbName: o.row.name,
      fallback: n(o.row.unit_cost),
      laborDbName: bi?.laborDbName ?? `${o.label} - Labor Rate`,
      laborFallback: bi?.laborFallback ?? 0,
      fromMaster: !bi,
    }
  })
}
function resolveUtilRow(cat, row, houseArr, materialRows, mp) {
  const vsel = row.vendor && row.vendor !== 'auto' ? row.vendor : 'Standard'
  const merged = mergedUtilTypes(cat, houseArr, materialRows, vsel)
  const builtIn = merged.find(o => o.label === row.type) || merged[0]
  const laborVal = mp[builtIn?.laborDbName] ?? builtIn?.laborFallback ?? 0
  let matDbName = builtIn?.dbName
  let matFallback = builtIn?.fallback ?? 0
  const vrow = catalogItemFor(materialRows, cat, vsel, builtIn?.label, {
    ...CATALOG_OPTS,
    fallbackFirst: false,
  })
  if (vrow) {
    matDbName = vrow.name
    matFallback = n(vrow.unit_cost)
  }
  // Selected vendor's catalog row wins; only fall back to the Standard name-map (mp)
  // when there is no catalog row for the selection.
  const matCost = vrow ? n(vrow.unit_cost) : (mp[matDbName] ?? matFallback)
  const matOpt = { label: builtIn?.label, dbName: matDbName, fallback: matFallback }
  return { opts: merged, matOpt, matCost, laborVal, laborBuiltIn: builtIn }
}
const EP_LINE_ROW = () => ({ type: 'PVC Conduit with Electrical', lf: '', vendor: 'Standard' })
const EP_GAS_ROW = () => ({ type: '12" Single Gas Ring', qty: '', vendor: 'Standard' })
const EP_ELEC_ROW = () => ({ type: 'GFCI Protected Receptacles', qty: '', vendor: 'Standard' })

// Reusable Electrical & Plumbing table (Utility Lines / Gas / Electrical).
function EpTable({
  title,
  rows,
  setRows,
  arr,
  cat,
  qtyField,
  qtyLabel,
  unitLabel,
  newRow,
  materialRows,
  materialPrices,
  refreshAllRates,
  vendorsForCategory,
}) {
  const upd = (i, field, val) =>
    setRows(rs => rs.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  return (
    <div>
      <p className="text-xs font-semibold text-gray-600 mb-1">{title}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-[128px]" />
            <col />
            <col className="w-[84px]" />
            <col className="w-[96px]" />
            <col className="w-[96px]" />
            <col className="w-6" />
          </colgroup>
          <thead>
            <tr className="text-xs text-gray-500 border-b border-gray-200">
              <th className="text-left pb-1 pr-2 font-medium">Vendor</th>
              <th className="text-left pb-1 pr-2 font-medium">Type</th>
              <th className="text-left pb-1 pr-2 font-medium">{qtyLabel}</th>
              <th className="text-right pb-1 pr-2 font-medium text-gray-400">$/{unitLabel}</th>
              <th className="text-right pb-1 font-medium text-gray-400">Material $</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const { opts, matOpt, matCost } = resolveUtilRow(
                cat,
                row,
                arr,
                materialRows,
                materialPrices
              )
              const mat = n(row[qtyField]) * matCost
              return (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1 pr-2">
                    <select
                      className="input text-sm py-1 w-full"
                      value={row.vendor || 'Standard'}
                      onChange={e => upd(i, 'vendor', e.target.value)}
                      title="Vendor"
                    >
                      {vendorsForCategory(cat).map(v => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                      <option value="Standard">Standard</option>
                    </select>
                  </td>
                  <td className="py-1 pr-2">
                    <div className="flex items-center gap-1">
                      <select
                        className="input text-sm py-1 flex-1 min-w-0"
                        value={matOpt?.label}
                        onChange={e => upd(i, 'type', e.target.value)}
                      >
                        {opts.map(o => (
                          <option key={o.label} value={o.label}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="py-1 pr-2">
                    <NumInput value={row[qtyField]} onChange={v => upd(i, qtyField, v)} className="w-full" />
                  </td>
                  <td className="py-1 text-right text-gray-400 text-xs pr-2">
                    <span className="inline-flex items-center justify-end gap-1">
                      ${matCost.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-1 text-right text-gray-600 text-xs">
                    {mat > 0 ? `$${mat.toFixed(2)}` : '—'}
                  </td>
                  <td className="py-1 text-center">
                    {rows.length > 1 && (
                      <button
                        type="button"
                        className="text-gray-300 hover:text-red-500"
                        title="Remove row"
                        onClick={() => setRows(rs => rs.filter((_, idx) => idx !== i))}
                      >
                        ×
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <button
          type="button"
          className="mt-1 text-xs text-green-700 hover:text-green-900 font-medium"
          onClick={() => setRows(rs => [...rs, newRow()])}
        >
          + Add row
        </button>
      </div>
    </div>
  )
}

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

// Per-tab input record. In-House and Sub each hold their own independent copy so
// the two tabs are separate calculators. Only these user-input fields live here;
// rate maps, crew type, labor rate, etc. stay shared at the top level of state.
function makeTab(data = {}) {
  return {
    hoursAdj: data.hoursAdj ?? '',
    difficulty: data.difficulty ?? '',
    distanceLF: data.distanceLF ?? '',
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
    equipment: data.equipment ?? [newEquipRow(), newEquipRow()],
    plumbing: data.plumbing ?? {
      baseType: 'Pool Only',
      over20ft: false,
      remodel: false,
      extraLights: '',
      sheerDescents: '',
      manualSubCost: '',
    },
    steel: data.steel ?? { manualSubCost: '' },
    // In-House pool plumbing — labor hours + materials $ done in-house (not a
    // sub trade). Blank strings default to the DB master rates in calcPool.
    plumbingIH: data.plumbingIH ? { hours: '', materials: '', ...data.plumbingIH } : { hours: '', materials: '' },
    epLineRows: data.epLineRows ?? [EP_LINE_ROW(), EP_LINE_ROW()],
    epGasRows: data.epGasRows ?? [EP_GAS_ROW(), EP_GAS_ROW()],
    epElecRows: data.epElecRows ?? [EP_ELEC_ROW(), EP_ELEC_ROW()],
    manualRows: data.manualRows ?? [newManualRow(), newManualRow(), newManualRow()],
  }
}

function makeInitial(data = {}) {
  return {
    // Independent In-House vs Sub input records — each tab is its own calculator.
    // Legacy estimates stored their inputs flat → load them as the In-House tab.
    ihData: makeTab(data.ihData || data),
    subData: makeTab(data.subData || {}),
    // ── Shared (top-level) fields — never per-tab ──
    laborRatePerHour: data.laborRatePerHour ?? 35,
    laborBurdenPct: data.laborBurdenPct ?? LABOR_BURDEN,
    gpmd: data.gpmd ?? 425,
    crewType: data.crewType ?? 'Specialty',
    subType: data.subType ?? 'In-House',
    rateOverrides: data.rateOverrides,
    walkAccess: data.walkAccess,
  }
}

// ── Main Calculation ──────────────────────────────────────────────────────────
function calcPool(state, materialPrices, laborRates, subRates = {}, walkAccess = null, materialRows = []) {
  // Subcontractor rates: a one-off adjustment saved on THIS estimate
  // (state.rateOverrides) takes precedence over the master rate.
  subRates = { ...(subRates || {}) }
  Object.entries(state.rateOverrides || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && Number.isFinite(Number(v))) subRates[k] = Number(v)
  })

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
    laborBurdenPct,
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
  // Tunable estimating coefficients — table-driven via the merged rate map
  // (misc_rates), read by name with the literal only as a fallback. The fixed
  // 27 cu-ft/cu-yd conversions below are math-invariant and stay inline.
  const avgDepthRatio = materialPrices['Pool Avg Depth Ratio'] ?? 2 / 3
  const excavSwell = materialPrices['Pool Excavation Swell Factor'] ?? 1.07
  const shotShellFt = materialPrices['Pool Shotcrete Shell Thickness'] ?? 0.5
  const shotSwell = materialPrices['Pool Shotcrete Swell Factor'] ?? 1.07
  function avgDepth(s) {
    return n(s.maxDepth) * avgDepthRatio
  }

  function excavCY(s) {
    if (!n(s.waterSF)) return 0
    return ((n(s.waterSF) * avgDepth(s)) / 27) * excavSwell
  }

  function shotcreteCYFn(s) {
    if (!n(s.waterSF)) return 0
    const bot = (n(s.waterSF) * shotShellFt) / 27
    const wall = (n(s.perimLF) * avgDepth(s) * shotShellFt) / 27
    return (bot + wall) * shotSwell
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

  // Shotcrete / Interior Finish / Plumbing / Steel auto-subs apply on the Sub
  // tab ONLY. On the In-House tab their AUTO amount is not charged (done
  // in-house or entered manually). A manual sub override is still honored on
  // either tab.
  const isSubTab = state.subType === 'Subcontractor'

  // ─ Shotcrete sub (rates from subcontractor_rates, category='Pool') ─
  const shotMatCY = subRates['Shotcrete Material'] ?? SHOTCRETE_MAT_PER_CY
  const shotLabCY = subRates['Shotcrete Labor'] ?? SHOTCRETE_LABOR_PER_CY
  const shotMin = subRates['Shotcrete Minimum Labor'] ?? SHOTCRETE_LABOR_MIN
  // An override counts only when the user actually typed a value — '' means
  // "use auto", but a typed 0 is a real override that removes the auto sub.
  const hasOverride = v => v !== '' && v != null && !isNaN(parseFloat(v))
  // No pool structure → no shotcrete sub (don't apply the labor minimum to an
  // empty scope, e.g. a remodel with no new walls).
  const autoShotcreteSub =
    totalShotCY > 0 ? totalShotCY * shotMatCY + Math.max(shotMin, totalShotCY * shotLabCY) : 0
  const shotcreteSub = hasOverride(shotcrete.manualSubCost)
    ? n(shotcrete.manualSubCost)
    : (isSubTab ? autoShotcreteSub : 0)

  // ─ Waterline Tile ─
  let tileHrs = 0,
    tileMat = 0
  // Tile coverage (SF of tile per LF of waterline) — table-driven coefficient.
  const tileSfPerLf = materialPrices['Pool Tile SF per LF'] ?? 0.5
  activeStructs.forEach(({ tileKey }) => {
    const t = tile[tileKey] || {}
    const lf = n(t.lf)
    if (!lf) return
    const installRate =
      laborRates[`Tile - ${t.installType}`] ?? TILE_INSTALL_DEFAULTS[t.installType] ?? 0.356
    // tile mat = LF × (SF/LF coverage) × price/SF (waterline tile width ~6")
    const matPriceSF = n(t.matPricePerSF)
    tileHrs += lf * installRate
    tileMat += lf * tileSfPerLf * matPriceSF
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
    // Coping MATERIAL rate is keyed distinctly from the same-named labor rate so
    // the two don't collide in the merged rate map (misc_rates vs labor_rates).
    const matRate = materialPrices[`Coping Mat - ${cr.type}`] ?? def.mat
    const labRate = laborRates[`Coping - ${cr.type}`] ?? def.hrs
    copingHrs += lf * sided * labRate
    copingMat += lf * sided * matRate
  })

  // ─ Raised Surfaces ─
  let raisedHrs = 0,
    raisedMat = 0
  // Per-corner labor add and per-corner material factor — table-driven coefficients.
  const raisedCornerHrs = materialPrices['Pool Raised Corner Labor'] ?? 0.5
  const raisedCornerMatFactor = materialPrices['Pool Raised Corner Mat Factor'] ?? 0.2
  raisedSurfaces.forEach(rs => {
    const sqft = n(rs.sqft)
    const corners = n(rs.corners)
    if (!sqft) return
    const def = RAISED_SURFACE_DEFAULTS[rs.matType] || { mat: 6.5, hrs: 0.356 }
    // Raised MATERIAL rate is keyed distinctly from the same-named labor rate.
    const matRate = materialPrices[`Raised Mat - ${rs.matType}`] ?? def.mat
    const labRate = laborRates[`Raised - ${rs.matType}`] ?? def.hrs
    const curveMult = 1 + n(rs.curvePct) / 100
    raisedHrs += sqft * labRate * curveMult + corners * raisedCornerHrs
    raisedMat += sqft * matRate + corners * (def.mat * raisedCornerMatFactor)
  })

  // ─ Interior Finish (rates from subcontractor_rates, category='Pool') ─
  let interiorSub = 0
  activeStructs.forEach(({ iKey, s }) => {
    const fin = interiorFinish[iKey] || {}
    const manSub = n(fin.subCost)
    if (manSub > 0) {
      interiorSub += manSub
    } else if (isSubTab) {
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
  if (hasOverride(plumbing.manualSubCost)) {
    plumbSub = n(plumbing.manualSubCost)
  } else if (isSubTab && (n(pool.perimLF) > 0 || spa.enabled)) {
    // Only auto-charge the plumbing base when there's actual pool/spa scope,
    // and only on the Sub tab (In-House does plumbing in-house).
    plumbSub =
      plumbBaseRate +
      (plumbing.over20ft ? (subRates['Plumbing Over 20ft Add'] ?? 300) : 0) +
      (plumbing.remodel ? (subRates['Plumbing Remodel Add'] ?? 200) : 0) +
      n(plumbing.extraLights) * (subRates['Plumbing Extra Light'] ?? 150) +
      n(plumbing.sheerDescents) * (subRates['Plumbing Sheer Descent'] ?? 450)
  } else {
    plumbSub = 0
  }

  // ─ Steel (rates from subcontractor_rates, category='Pool') ─
  let steelSub
  if (hasOverride(steel.manualSubCost)) {
    steelSub = n(steel.manualSubCost)
  } else {
    // Steel is qty-driven (perimeter + spa). Auto-sub on the Sub tab only.
    const poolPerim = n(pool.perimLF)
    const steelPerLF = subRates['Steel Per LF'] ?? 8
    const steelSpaBonus = subRates['Steel Spa Bonus'] ?? 200
    steelSub = isSubTab ? poolPerim * steelPerLF + (spa.enabled ? steelSpaBonus : 0) : 0
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

  // ── Electrical & Plumbing (Utility Lines / Gas / Electrical Fixtures) ───────
  let epHrs = 0
  let epMat = 0
  ;(state.epLineRows || []).forEach(r => {
    const lf = n(r.lf)
    if (lf <= 0) return
    const { matCost, laborVal } = resolveUtilRow(UTIL_CAT.line, r, LINE_TYPE_ARR, materialRows, materialPrices)
    epMat += lf * matCost
    epHrs += lf * laborVal
  })
  ;[
    [state.epGasRows, UTIL_CAT.gas, GAS_TYPE_ARR],
    [state.epElecRows, UTIL_CAT.elec, ELEC_TYPE_ARR],
  ].forEach(([rows, cat, arr]) => {
    ;(rows || []).forEach(r => {
      const qty = n(r.qty)
      if (qty <= 0) return
      const { matCost, laborVal } = resolveUtilRow(cat, r, arr, materialRows, materialPrices)
      epMat += qty * matCost
      epHrs += qty * laborVal
    })
  })

  // ── In-House Plumbing (pool plumbing done in-house) ─────────────────────────
  // Contributes in-house labor hours + materials only (never a sub cost). The
  // section is shown on the In-House tab only, so gate on !isSubTab to be safe:
  // its fields stay blank on the Sub tab and the DB default must not silently
  // add cost there. A typed value overrides the DB default; a typed 0 => 0.
  const plumbIH = state.plumbingIH || {}
  const plumbHrsDefault = laborRates['Pool Plumbing - Base Hours'] ?? 16
  const plumbMatDefault = materialPrices['Pool Plumbing - Materials'] ?? 350
  const plumbHrsIH = isSubTab ? 0 : hasOverride(plumbIH.hours) ? n(plumbIH.hours) : plumbHrsDefault
  const plumbMatIH = isSubTab
    ? 0
    : hasOverride(plumbIH.materials)
      ? n(plumbIH.materials)
      : plumbMatDefault

  const _preWalkHrs =
    excavHrs +
    tileHrs +
    spillwayHrs +
    copingHrs +
    raisedHrs +
    equipmentHrs +
    epHrs +
    manHrs +
    plumbHrsIH +
    (parseFloat(state.hoursAdj) || 0)
  const walkHrs = calcWalkAccessLabor(_preWalkHrs, state.distanceLF, { paceLfPerMin: _pace })
  const totalHrs = _preWalkHrs + walkHrs
  const manDays = totalHrs / 8
  const totalMat = tileMat + spillwayMat + copingMat + raisedMat + epMat + manMat + plumbMatIH
  // Pool's genuine sub trades (excavation / shotcrete / interior / equipment /
  // plumbing / steel / manual-sub). These are sub costs on either tab.
  const subTradeCost =
    excavSub + shotcreteSub + interiorSub + equipmentSub + plumbSub + steelSub + manSub
  const laborCost = totalHrs * lrph
  const burden = laborCost * (n(laborBurdenPct) || LABOR_BURDEN)
  // On the Sub tab every itemized cost — the in-house-style material + labor +
  // burden (waterline tile, coping, spillways, raised surfaces, E&P, manual) AND
  // the pool sub trades — IS the subcontractor cost. Roll it all into subCost so
  // GpmdBar's 'sub' view (total = subCost + subGp + commission) captures the full
  // scope instead of silently dropping the in-house buckets it ignores. The
  // in-house GP model applies only to the In-House tab. Matches the
  // OutdoorKitchen reference; sub-trade computation above is untouched.
  const subMarkup = n(state.subGpMarkupRate) || 0.2
  let gp, subCost, subGp, commission, price
  if (isSubTab) {
    gp = 0
    subCost = totalMat + laborCost + burden + subTradeCost
    subGp = subCost * subMarkup
    commission = subGp * COMMISSION_RATE
    price = subCost + subGp + commission
  } else {
    gp = manDays * gpmdVal
    subCost = subTradeCost
    subGp = 0
    commission = gp * COMMISSION_RATE
    price = totalMat + laborCost + burden + subCost + gp + commission
  }

  return {
    totalHrs,
    manDays,
    totalMat,
    laborCost,
    burden,
    subCost,
    gp,
    subGp,
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
    plumbHrsIH, // effective in-house pool-plumbing hours (default or override)
    plumbMatIH, // effective in-house pool-plumbing materials $
    equipRate, // resolved excavation CY/hr so the icon can show + edit it
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────────
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

  // ── Active-tab selection ──────────────────────────────────────────────────
  // In-House and Sub are fully independent input records (state.ihData /
  // state.subData). `T` is the active tab's inputs; every input binding reads
  // from T and writes via updT so the two tabs never affect each other.
  const subType = state.subType || 'In-House'
  const isSub = subType === 'Subcontractor'
  const T = (isSub ? state.subData : state.ihData) || {}
  // Write a single input field to the active tab. `val` may be a value or an
  // updater fn (used by row-array helpers).
  const updT = (key, val) =>
    setState(p => {
      const k = p.subType === 'Subcontractor' ? 'subData' : 'ihData'
      const cur = p[k] || {}
      return { ...p, [k]: { ...cur, [key]: typeof val === 'function' ? val(cur[key]) : val } }
    })
  // Write a shared (top-level) field.
  const updShared = (key, val) => setState(p => ({ ...p, [key]: val }))

  // Free-text notes for this module — Sam writes auto-generated
  // takeoffs here via create_estimate_from_takeoff, and the user can
  // overwrite / append their own.
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [materialPrices, setMaterialPrices] = useState({})
  const [laborRates, setLaborRates] = useState({})
  const [subRates, setSubRates] = useState({})
  const [materialRows, setMaterialRows] = useState([])
  const [vendors, setVendors] = useState([])
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

  // Pull the company labor rate + burden % (HR → Labor Rates) into the pool's
  // state, mirroring the other modules. Skip when re-editing a saved module so
  // it keeps the rate it was built with.
  useEffect(() => {
    if (initialData?.laborRatePerHour) return
    let alive = true
    supabase
      .from('company_settings')
      .select('labor_rate_per_hour, labor_burden_pct')
      .single()
      .then(({ data }) => {
        if (!alive || !data) return
        setState(s => ({
          ...s,
          ...(data.labor_rate_per_hour != null
            ? { laborRatePerHour: parseFloat(data.labor_rate_per_hour) || 35 }
            : {}),
          ...(data.labor_burden_pct != null
            ? { laborBurdenPct: parseFloat(data.labor_burden_pct) }
            : {}),
        }))
      })
    return () => {
      alive = false
    }
  }, [])

  // Re-fetch all three Pool rate tables. Called on mount and after edits.
  const refreshAllRates = useCallback(async () => {
    const [mp, labRes, subRes, catRows, venRes] = await Promise.all([
      fetchStandardRateMap(['Pool', 'Utilities']),
      supabase.from('labor_rates').select('name,rate').in('category', ['Pool', 'Utilities']),
      supabase.from('subcontractor_rates').select('trade,rate').eq('category', 'Pool'),
      fetchModuleCatalog(['Utilities']),
      supabase
        .from('subs_vendors')
        .select('id, company_name')
        .eq('type', 'vendor')
        .order('company_name'),
    ])
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
    setMaterialRows(catRows || [])
    setVendors(
      (venRes.data || []).map(v => ({
        id: v.id,
        name: v.company_name,
      }))
    )
  }, [])

  useEffect(() => {
    refreshAllRates().finally(() => setLoadingRates(false))
  }, [refreshAllRates])

  // Generic input writers target the ACTIVE tab (all input fields are per-tab).
  const upd = (key, val) => updT(key, val)
  // One-off subcontractor rate for this estimate only (undefined clears it).
  // rateOverrides are SHARED across both tabs (top-level).
  const setOverride = (name, value) =>
    setState(p => {
      const next = { ...(p.rateOverrides || {}) }
      if (value === undefined || value === null || value === '') delete next[name]
      else next[name] = Number(value)
      return { ...p, rateOverrides: next }
    })
  const updStruct = (key, val) => updT(key, val)
  const vendorsForCategory = cat => vendors.filter(v => materialRows.some(r => r.vendor_id === v.id && (r.sub_category === cat || r.category === cat)))
  const setEpRows = key => fn => updT(key, arr => fn(arr || []))

  const subGpMarkupRate = initialData?.subGpMarkupRate ?? 0.2
  // Effective calc input: shared top-level fields + the active tab's inputs.
  // calcPool reads its input fields off this merged object, so the running
  // total reflects only the tab currently being edited.
  const eff = { ...state, ...T, subGpMarkupRate }
  const calcRaw = calcPool(eff, materialPrices, laborRates, subRates, state.walkAccess, materialRows)
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
      // state already carries both ihData & subData plus shared fields.
      // Spread the active tab's inputs flat too so legacy readers still work.
      ...state,
      ...T,
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
  const addSpillway = () => upd('spillways', [...T.spillways, newSpillway()])
  const updSpillway = (i, key, val) => {
    const arr = [...T.spillways]
    arr[i] = { ...arr[i], [key]: val }
    upd('spillways', arr)
  }
  const removeSpillway = i =>
    upd(
      'spillways',
      T.spillways.filter((_, idx) => idx !== i)
    )

  // ── Coping helpers ────────────────────────────────────────────────────────────
  const addCoping = () => upd('copingRows', [...T.copingRows, newCopingRow()])
  const updCoping = (i, key, val) => {
    const arr = [...T.copingRows]
    arr[i] = { ...arr[i], [key]: val }
    upd('copingRows', arr)
  }
  const removeCoping = i =>
    upd(
      'copingRows',
      T.copingRows.filter((_, idx) => idx !== i)
    )

  // ── Raised surface helpers ────────────────────────────────────────────────────
  const addRaised = () => upd('raisedSurfaces', [...T.raisedSurfaces, newRaisedSurface()])
  const updRaised = (i, key, val) => {
    const arr = [...T.raisedSurfaces]
    arr[i] = { ...arr[i], [key]: val }
    upd('raisedSurfaces', arr)
  }
  const removeRaised = i =>
    upd(
      'raisedSurfaces',
      T.raisedSurfaces.filter((_, idx) => idx !== i)
    )

  // ── Equipment helpers ─────────────────────────────────────────────────────────
  const addEquip = () => upd('equipment', [...T.equipment, newEquipRow()])
  const updEquip = (i, key, val) => {
    const arr = [...T.equipment]
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
      T.equipment.filter((_, idx) => idx !== i)
    )

  // ── Manual row helpers ────────────────────────────────────────────────────────
  const addManual = () => upd('manualRows', [...T.manualRows, newManualRow()])
  const updManual = (i, key, val) => {
    const arr = [...T.manualRows]
    arr[i] = { ...arr[i], [key]: val }
    upd('manualRows', arr)
  }
  const removeManual = i =>
    upd(
      'manualRows',
      T.manualRows.filter((_, idx) => idx !== i)
    )

  const activeStructList = [
    ['Pool', T.pool, true],
    ['Spa', T.spa, false],
    ['Infinity Basin', T.basin, false],
    ['Cover Vault', T.vault, false],
  ]
    .filter(([, s, always]) => always || s.enabled)
    .map(([k]) => k)

  // ── Grouped rate list for the "View Rates" popup (CrewTypeBar). Every rate
  //    that used to have an inline RateEditPopover in this module now lives here.
  // Material rows for a catalog item (matched by name) from the shared Utilities
  // catalog. One row per vendor (Standard first), each editable straight to
  // material_price — same helper shape Walls/Utilities use. The Electrical &
  // Plumbing section resolves its line/gas/electrical MATERIAL prices from this
  // catalog, so surface every vendor price alongside the labor rates.
  const vendorNames = Object.fromEntries((vendors || []).map(v => [v.id, v.name]))
  const matRows = (dbName, unit, fallback) => {
    const rows = (materialRows || []).filter(r0 => r0.name === dbName)
    if (rows.length) {
      return rows
        .filter(r0 => r0.vendor_id == null || vendorNames[r0.vendor_id])
        .sort((a, b) => {
          const va = a.vendor_id == null ? '' : vendorNames[a.vendor_id] || '~'
          const vb = b.vendor_id == null ? '' : vendorNames[b.vendor_id] || '~'
          return va.localeCompare(vb)
        })
        .map(r0 => ({
          label: `${r0.vendor_id ? vendorNames[r0.vendor_id] || 'Vendor' : 'Standard'} — ${r0.name}`,
          table: 'material_price',
          materialId: r0.id,
          vendorId: r0.vendor_id || undefined,
          category: 'Utilities',
          unitLabel: r0.unit || unit,
          mode: 'currency',
          value: n(r0.unit_cost),
        }))
    }
    return [
      { label: `Standard — ${dbName}`, table: 'material_price', name: dbName, category: 'Utilities', unitLabel: unit, mode: 'currency', value: materialPrices[dbName] ?? fallback },
    ]
  }
  const poolRateList = [
    {
      group: 'Excavation',
      items: EXCAVATION_TYPES.filter(t => EXCAVATION_LABOR_NAME[t]).map(t => ({
        label: EXCAVATION_LABOR_NAME[t],
        table: 'labor_rates',
        name: EXCAVATION_LABOR_NAME[t],
        category: 'Pool',
        mode: 'coefficient',
        unitLabel: 'CY/hr',
        value: laborRates[EXCAVATION_LABOR_NAME[t]] ?? EXCAVATION_RATES[t],
      })),
    },
    {
      group: 'Shotcrete (Sub)',
      items: [
        {
          label: 'Shotcrete Material',
          table: 'subcontractor_rates',
          name: 'Shotcrete Material',
          category: 'Pool',
          mode: 'currency',
          unitLabel: 'CY',
          value: subRates['Shotcrete Material'] ?? SHOTCRETE_MAT_PER_CY,
        },
        {
          label: 'Shotcrete Labor',
          table: 'subcontractor_rates',
          name: 'Shotcrete Labor',
          category: 'Pool',
          mode: 'currency',
          unitLabel: 'CY',
          value: subRates['Shotcrete Labor'] ?? SHOTCRETE_LABOR_PER_CY,
          section: 'labor',
        },
        {
          label: 'Shotcrete Minimum Labor',
          table: 'subcontractor_rates',
          name: 'Shotcrete Minimum Labor',
          category: 'Pool',
          mode: 'currency',
          unitLabel: 'flat',
          value: subRates['Shotcrete Minimum Labor'] ?? SHOTCRETE_LABOR_MIN,
          section: 'labor',
        },
      ],
    },
    {
      group: 'Waterline Tile',
      items: TILE_INSTALL_TYPES.map(t => ({
        label: `Tile - ${t}`,
        table: 'labor_rates',
        name: `Tile - ${t}`,
        category: 'Pool',
        mode: 'coefficient',
        unitLabel: 'hrs/LF',
        value: laborRates[`Tile - ${t}`] ?? TILE_INSTALL_DEFAULTS[t],
      })),
    },
    {
      group: 'Spillways',
      items: [
        ...SPILLWAY_TYPES.map(t => ({
          label: `Spillway - ${t}`,
          table: 'labor_rates',
          name: `Spillway - ${t}`,
          category: 'Pool',
          mode: 'coefficient',
          unitLabel: 'hrs/LF',
          value: laborRates[`Spillway - ${t}`] ?? SPILLWAY_DEFAULTS[t]?.hrs,
        })),
        ...SPILLWAY_TYPES.map(t => ({
          label: `Spillway Material - ${t}`,
          table: 'misc_rates',
          name: `Spillway ${t}`,
          category: 'Pool',
          mode: 'currency',
          unitLabel: 'LF',
          value: materialPrices[`Spillway ${t}`] ?? SPILLWAY_DEFAULTS[t]?.mat,
        })),
      ],
    },
    {
      group: 'Coping',
      items: [
        ...COPING_TYPES.map(t => ({
          label: `Coping - ${t}`,
          table: 'labor_rates',
          name: `Coping - ${t}`,
          category: 'Pool',
          mode: 'coefficient',
          unitLabel: 'hrs/LF',
          value: laborRates[`Coping - ${t}`] ?? COPING_DEFAULTS[t]?.hrs,
        })),
        ...COPING_TYPES.map(t => ({
          label: `Coping Material - ${t}`,
          table: 'misc_rates',
          name: `Coping Mat - ${t}`,
          category: 'Pool',
          mode: 'currency',
          unitLabel: 'LF',
          value: materialPrices[`Coping Mat - ${t}`] ?? COPING_DEFAULTS[t]?.mat,
        })),
      ],
    },
    {
      group: 'Raised Surfaces',
      items: [
        ...RAISED_SURFACE_TYPES.map(t => ({
          label: `Raised - ${t}`,
          table: 'labor_rates',
          name: `Raised - ${t}`,
          category: 'Pool',
          mode: 'coefficient',
          unitLabel: 'hrs/SF',
          value: laborRates[`Raised - ${t}`] ?? RAISED_SURFACE_DEFAULTS[t]?.hrs,
        })),
        ...RAISED_SURFACE_TYPES.map(t => ({
          label: `Raised Material - ${t}`,
          table: 'misc_rates',
          name: `Raised Mat - ${t}`,
          category: 'Pool',
          mode: 'currency',
          unitLabel: 'SF',
          value: materialPrices[`Raised Mat - ${t}`] ?? RAISED_SURFACE_DEFAULTS[t]?.mat,
        })),
      ],
    },
    {
      group: 'Interior Finish (Sub)',
      items: INTERIOR_TYPES.map(t => ({
        label: `Interior Finish - ${t}`,
        table: 'subcontractor_rates',
        name: `Interior Finish - ${t}`,
        category: 'Pool',
        mode: 'currency',
        unitLabel: 'SF',
        value: subRates[`Interior Finish - ${t}`] ?? INTERIOR_DEFAULTS[t],
      })),
    },
    {
      group: 'Pool Equipment',
      items: [
        ...Array.from(
          new Set(Object.values(EQUIPMENT_CATALOG).flat().map(m => m.model))
        ).map(model => ({
          label: `Equip Labor - ${model}`,
          table: 'labor_rates',
          name: `Equip Labor - ${model}`,
          category: 'Pool',
          mode: 'coefficient',
          unitLabel: 'hrs/ea',
          value: laborRates[`Equip Labor - ${model}`] ?? 0,
        })),
        // Equipment unit prices — the calc reads materialPrices[model] when a
        // row leaves its unit-cost blank. Surface each real model (skip the
        // generic 'Other' placeholder) so its price is editable here.
        ...Object.values(EQUIPMENT_CATALOG)
          .flat()
          .filter((m, i, arr) => m.model !== 'Other' && arr.findIndex(x => x.model === m.model) === i)
          .map(m => ({
            label: `Equipment Price - ${m.model}`,
            table: 'misc_rates',
            name: m.model,
            category: 'Pool',
            mode: 'currency',
            unitLabel: 'ea',
            value: materialPrices[m.model] ?? m.price,
          })),
      ],
    },
    {
      group: 'Plumbing (Sub)',
      items: [
        ...Object.keys(PLUMBING_BASES).map(k => ({
          label: `Plumbing ${k}`,
          table: 'subcontractor_rates',
          name: `Plumbing ${k}`,
          category: 'Pool',
          mode: 'currency',
          unitLabel: 'flat',
          value: subRates[`Plumbing ${k}`] ?? PLUMBING_BASES[k],
        })),
        {
          label: 'Plumbing Extra Light',
          table: 'subcontractor_rates',
          name: 'Plumbing Extra Light',
          category: 'Pool',
          mode: 'currency',
          unitLabel: 'ea',
          value: subRates['Plumbing Extra Light'] ?? 150,
        },
        {
          label: 'Plumbing Sheer Descent',
          table: 'subcontractor_rates',
          name: 'Plumbing Sheer Descent',
          category: 'Pool',
          mode: 'currency',
          unitLabel: 'ea',
          value: subRates['Plumbing Sheer Descent'] ?? 450,
        },
        {
          label: 'Plumbing Over 20ft Add',
          table: 'subcontractor_rates',
          name: 'Plumbing Over 20ft Add',
          category: 'Pool',
          mode: 'currency',
          unitLabel: 'flat',
          value: subRates['Plumbing Over 20ft Add'] ?? 300,
        },
        {
          label: 'Plumbing Remodel Add',
          table: 'subcontractor_rates',
          name: 'Plumbing Remodel Add',
          category: 'Pool',
          mode: 'currency',
          unitLabel: 'flat',
          value: subRates['Plumbing Remodel Add'] ?? 200,
        },
      ],
    },
    {
      group: 'Steel (Sub)',
      items: [
        {
          label: 'Steel Per LF',
          table: 'subcontractor_rates',
          name: 'Steel Per LF',
          category: 'Pool',
          mode: 'currency',
          unitLabel: 'LF',
          value: subRates['Steel Per LF'] ?? 8,
        },
        {
          label: 'Steel Spa Bonus',
          table: 'subcontractor_rates',
          name: 'Steel Spa Bonus',
          category: 'Pool',
          mode: 'currency',
          unitLabel: 'flat',
          value: subRates['Steel Spa Bonus'] ?? 200,
        },
      ],
    },
    {
      group: 'Electrical & Plumbing',
      items: [
        ...LINE_TYPE_ARR.map(t => ({
          label: t.laborDbName,
          table: 'labor_rates',
          name: t.laborDbName,
          category: 'Utilities',
          mode: 'coefficient',
          unitLabel: 'hrs/LF',
          value: materialPrices[t.laborDbName] ?? t.laborFallback,
        })),
        ...GAS_TYPE_ARR.map(t => ({
          label: t.laborDbName,
          table: 'labor_rates',
          name: t.laborDbName,
          category: 'Utilities',
          mode: 'coefficient',
          unitLabel: 'hrs/ea',
          value: materialPrices[t.laborDbName] ?? t.laborFallback,
        })),
        ...ELEC_TYPE_ARR.map(t => ({
          label: t.laborDbName,
          table: 'labor_rates',
          name: t.laborDbName,
          category: 'Utilities',
          mode: 'coefficient',
          unitLabel: 'hrs/ea',
          value: materialPrices[t.laborDbName] ?? t.laborFallback,
        })),
        // Material prices (per vendor, Standard first) for each line/fixture,
        // sourced from the shared Utilities catalog.
        ...LINE_TYPE_ARR.flatMap(t => matRows(t.dbName, 'LF', t.fallback)),
        ...GAS_TYPE_ARR.flatMap(t => matRows(t.dbName, 'ea', t.fallback)),
        ...ELEC_TYPE_ARR.flatMap(t => matRows(t.dbName, 'ea', t.fallback)),
      ],
    },
    {
      group: 'In-House Plumbing',
      items: [
        {
          label: 'Pool Plumbing - Base Hours',
          table: 'labor_rates',
          name: 'Pool Plumbing - Base Hours',
          category: 'Pool',
          mode: 'coefficient',
          unitLabel: 'hrs',
          value: laborRates['Pool Plumbing - Base Hours'] ?? 16,
        },
        {
          label: 'Pool Plumbing - Materials',
          table: 'misc_rates',
          name: 'Pool Plumbing - Materials',
          category: 'Pool',
          mode: 'currency',
          unitLabel: 'flat',
          value: materialPrices['Pool Plumbing - Materials'] ?? 350,
        },
      ],
    },
    {
      group: 'Estimating Coefficients',
      items: [
        {
          label: 'Pool Avg Depth Ratio',
          table: 'misc_rates',
          name: 'Pool Avg Depth Ratio',
          category: 'Pool',
          mode: 'coefficient',
          unitLabel: '× max',
          value: materialPrices['Pool Avg Depth Ratio'] ?? 2 / 3,
        },
        {
          label: 'Pool Excavation Swell Factor',
          table: 'misc_rates',
          name: 'Pool Excavation Swell Factor',
          category: 'Pool',
          mode: 'coefficient',
          unitLabel: '×',
          value: materialPrices['Pool Excavation Swell Factor'] ?? 1.07,
        },
        {
          label: 'Pool Shotcrete Shell Thickness',
          table: 'misc_rates',
          name: 'Pool Shotcrete Shell Thickness',
          category: 'Pool',
          mode: 'coefficient',
          unitLabel: 'ft',
          value: materialPrices['Pool Shotcrete Shell Thickness'] ?? 0.5,
        },
        {
          label: 'Pool Shotcrete Swell Factor',
          table: 'misc_rates',
          name: 'Pool Shotcrete Swell Factor',
          category: 'Pool',
          mode: 'coefficient',
          unitLabel: '×',
          value: materialPrices['Pool Shotcrete Swell Factor'] ?? 1.07,
        },
        {
          label: 'Pool Tile SF per LF',
          table: 'misc_rates',
          name: 'Pool Tile SF per LF',
          category: 'Pool',
          mode: 'coefficient',
          unitLabel: 'SF/LF',
          value: materialPrices['Pool Tile SF per LF'] ?? 0.5,
        },
        {
          label: 'Pool Raised Corner Labor',
          table: 'labor_rates',
          name: 'Pool Raised Corner Labor',
          category: 'Pool',
          mode: 'coefficient',
          unitLabel: 'hrs/corner',
          value: materialPrices['Pool Raised Corner Labor'] ?? 0.5,
        },
        {
          label: 'Pool Raised Corner Mat Factor',
          table: 'misc_rates',
          name: 'Pool Raised Corner Mat Factor',
          category: 'Pool',
          mode: 'coefficient',
          unitLabel: '×',
          value: materialPrices['Pool Raised Corner Mat Factor'] ?? 0.2,
        },
      ],
    },
  ]

  if (loadingRates)
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    )

  return (
    <SubTabContext.Provider value={isSub}>
    <SubRateOverrideProvider overrides={state.rateOverrides} setOverride={setOverride}>
    <div className="space-y-6 pb-6">
      {/* ── Frozen header: GPMD bar + Crew Type / View Rates bar ── */}
      <div className="sticky top-0 z-20 -mx-6 bg-white shadow-md">
        <div className="px-6 pt-1 pb-1 bg-gray-900">
          <GpmdBar
            variant={subType === 'Subcontractor' ? 'sub' : 'inhouse'}
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
        </div>
        <div className="px-6 py-2">
          <CrewTypeBar
            crewType={state.crewType}
            onCrewTypeChange={v => updShared('crewType', v)}
            title="Pool"
            rates={poolRateList}
            refreshAllRates={refreshAllRates}
            showInlineToggle={false}
          />
        </div>
      </div>

      <ModuleHeaderSlot>
        <WorkTypeChooser value={subType || 'In-House'} onChange={v => updShared('subType', v)} compact />
      </ModuleHeaderSlot>

      {/* Settings — In-House tab only */}
      {subType !== 'Subcontractor' && (
        <>
      <SectionHeader title="Job Site Conditions" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Difficulty (%)</p>
          <input
            type="number"
            step="5"
            value={T.difficulty ?? ''}
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
            value={T.distanceLF ?? ''}
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
            value={T.hoursAdj ?? ''}
            onChange={e => upd('hoursAdj', e.target.value)}
            placeholder="0"
            className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
      </div>
        </>
      )}

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
            data={T.pool}
            onChange={v => updStruct('pool', v)}
            alwaysEnabled
          />
          <StructDims label="Spa" data={T.spa} onChange={v => updStruct('spa', v)} />
          <StructDims
            label="Infinity Basin"
            data={T.basin}
            onChange={v => updStruct('basin', v)}
          />
          <StructDims
            label="Cover Vault"
            data={T.vault}
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
                value={T.excavation.equipment}
                onChange={e =>
                  upd('excavation', { ...T.excavation, equipment: e.target.value })
                }
              >
                {EXCAVATION_TYPES.map(t => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <Label text="From Trucks" sub="LF" />
            <NumInput
              value={T.excavation.fromTrucksLF}
              onChange={v => upd('excavation', { ...T.excavation, fromTrucksLF: v })}
            />
          </div>
          <div>
            <Label text="To Dump" sub="miles" />
            <NumInput
              value={T.excavation.toDumpMiles}
              onChange={v => upd('excavation', { ...T.excavation, toDumpMiles: v })}
            />
          </div>
          {T.excavation.equipment === 'Sub Bobcat / Mini Bob' && (
            <div>
              <Label text="Sub Cost" />
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  $
                </span>
                <NumInput
                  value={T.excavation.subCost}
                  onChange={v => upd('excavation', { ...T.excavation, subCost: v })}
                  className="pl-6"
                />
              </div>
            </div>
          )}
        </div>
        {calc.excavHrs > 0 && (
          <p className="text-xs text-gray-500 mt-2 px-1">
            {EXCAVATION_RATES[T.excavation.equipment] ?? '—'} CY/hr →{' '}
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
              {fmt2(calcPool(eff, materialPrices, laborRates, subRates).shotcreteSub)}
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
                value={T.shotcrete.manualSubCost}
                onChange={v => upd('shotcrete', { ...T.shotcrete, manualSubCost: v })}
                className="pl-6"
                placeholder="leave blank for auto"
              />
            </div>
          </div>
          <div className="flex items-end pb-1">
            <p className="text-xs text-gray-400 inline-flex items-center flex-wrap gap-x-1">
              {calc.totalShotCY.toFixed(1)} CY × $
              {subRates['Shotcrete Material'] ?? SHOTCRETE_MAT_PER_CY}/CY mat + max($
              {(subRates['Shotcrete Minimum Labor'] ?? SHOTCRETE_LABOR_MIN).toLocaleString()}, CY × $
              {subRates['Shotcrete Labor'] ?? SHOTCRETE_LABOR_PER_CY}/CY lab)
            </p>
          </div>
        </div>
      </div>

      {/* ─── 4. Waterline Tile ─── */}
      <div>
        <SectionHeader title="Waterline Tile" />
        <div className="space-y-3">
          {[
            ['Pool', T.pool],
            ['Spa', T.spa],
            ['Infinity Basin', T.basin],
            ['Cover Vault', T.vault],
          ]
            .filter(([, s]) => s.enabled)
            .map(([k]) => {
              const t = T.tile[k] || defaultTileStruct()
              return (
                <div key={k} className="border border-gray-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-700 mb-2">{k}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <Label text="Waterline LF" />
                      <NumInput
                        value={t.lf}
                        onChange={v => upd('tile', { ...T.tile, [k]: { ...t, lf: v } })}
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
                              ...T.tile,
                              [k]: { ...t, installType: e.target.value },
                            })
                          }
                        >
                          {TILE_INSTALL_TYPES.map(tp => (
                            <option key={tp}>{tp}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <Label text="Material" sub="$/SF" />
                      <select
                        className="input text-sm py-1.5"
                        value={t.matPricePerSF}
                        onChange={e =>
                          upd('tile', {
                            ...T.tile,
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
                              ...T.tile,
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
          {T.spillways.map((sw, i) => (
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
          {T.copingRows.map((cr, i) => (
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
          {T.raisedSurfaces.map((rs, i) => (
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

      {/* ─── 8. Interior Finish — Sub tab only ─── */}
      {isSub && (
      <div>
        <SectionHeader title="Interior Finish (Sub)" />
        <div className="space-y-3">
          {[
            ['Pool', T.pool],
            ['Spa', T.spa],
            ['Infinity Basin', T.basin],
            ['Cover Vault', T.vault],
          ]
            .filter(([, s]) => s.enabled)
            .map(([k, s]) => {
              const fin = T.interiorFinish[k] || defaultInteriorStruct()
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
                              ...T.interiorFinish,
                              [k]: { ...fin, type: e.target.value },
                            })
                          }
                        >
                          {INTERIOR_TYPES.map(t => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
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
                              ...T.interiorFinish,
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
      )}

      {/* ─── 9. Pool Equipment — "(Sub)" only on the Sub tab ─── */}
      <div>
        <SectionHeader title={`Pool Equipment${isSub ? ' (Sub)' : ''}`} />
        <div className="space-y-2">
          {T.equipment.map((eq, i) => {
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
                  </div>
                </div>
                <div>
                  <Label text="Qty" />
                  <NumInput value={eq.qty} onChange={v => updEquip(i, 'qty', v)} placeholder="1" />
                </div>
                <div>
                  <Label text="Unit $" />
                  <div className="flex items-center gap-1">
                    <div className="relative flex-1 min-w-0">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                        $
                      </span>
                      <NumInput
                        value={eq.unitCost}
                        onChange={v => updEquip(i, 'unitCost', v)}
                        className="pl-5"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeEquip(i)}
                      title="Remove row"
                      className="text-gray-300 hover:text-red-400 text-lg leading-none shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                </div>
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
                value={T.plumbing.baseType}
                onChange={e => upd('plumbing', { ...T.plumbing, baseType: e.target.value })}
              >
                {Object.keys(PLUMBING_BASES).map(k => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <Label text="Extra Lights" sub="qty" />
            <div className="flex items-center gap-1">
              <NumInput
                value={T.plumbing.extraLights}
                onChange={v => upd('plumbing', { ...T.plumbing, extraLights: v })}
              />
            </div>
          </div>
          <div>
            <Label text="Sheer Descents" sub="qty" />
            <div className="flex items-center gap-1">
              <NumInput
                value={T.plumbing.sheerDescents}
                onChange={v => upd('plumbing', { ...T.plumbing, sheerDescents: v })}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2 pt-1">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={T.plumbing.over20ft}
                onChange={e => upd('plumbing', { ...T.plumbing, over20ft: e.target.checked })}
                className="rounded"
              />
              <span className="text-xs text-gray-600">
                &gt;20ft from equipment (+${subRates['Plumbing Over 20ft Add'] ?? 300})
              </span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={T.plumbing.remodel}
                onChange={e => upd('plumbing', { ...T.plumbing, remodel: e.target.checked })}
                className="rounded"
              />
              <span className="text-xs text-gray-600">
                Remodel (+${subRates['Plumbing Remodel Add'] ?? 200})
              </span>
            </label>
          </div>
          <div>
            <Label text="Override Sub Cost" />
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                $
              </span>
              <NumInput
                value={T.plumbing.manualSubCost}
                onChange={v => upd('plumbing', { ...T.plumbing, manualSubCost: v })}
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
                subRates[`Plumbing ${T.plumbing.baseType}`] ??
                PLUMBING_BASES[T.plumbing.baseType] ??
                4500
              ).toLocaleString()}
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
                value={T.steel.manualSubCost}
                onChange={v => upd('steel', { ...T.steel, manualSubCost: v })}
                className="pl-6"
                placeholder="leave blank for auto"
              />
            </div>
          </div>
          <div className="flex items-end pb-1">
            <p className="text-xs text-gray-400 inline-flex items-center flex-wrap gap-1">
              Auto: pool perimeter × ${subRates['Steel Per LF'] ?? 8}/LF
              {T.spa.enabled && <> + ${subRates['Steel Spa Bonus'] ?? 200} spa</>}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Electrical & Plumbing (ported from Utilities) ─── */}
      <div>
        <SectionHeader title="Electrical & Plumbing" />
        <div className="space-y-4">
          <EpTable
            title="Utility Lines"
            rows={T.epLineRows || []}
            setRows={setEpRows('epLineRows')}
            arr={LINE_TYPE_ARR}
            cat={UTIL_CAT.line}
            qtyField="lf"
            qtyLabel="Linear Feet"
            unitLabel="LF"
            newRow={EP_LINE_ROW}
            materialRows={materialRows}
            materialPrices={materialPrices}
            refreshAllRates={refreshAllRates}
            vendorsForCategory={vendorsForCategory}
          />
          <EpTable
            title="Gas Fixtures"
            rows={T.epGasRows || []}
            setRows={setEpRows('epGasRows')}
            arr={GAS_TYPE_ARR}
            cat={UTIL_CAT.gas}
            qtyField="qty"
            qtyLabel="Qty"
            unitLabel="ea"
            newRow={EP_GAS_ROW}
            materialRows={materialRows}
            materialPrices={materialPrices}
            refreshAllRates={refreshAllRates}
            vendorsForCategory={vendorsForCategory}
          />
          <EpTable
            title="Electrical Fixtures"
            rows={T.epElecRows || []}
            setRows={setEpRows('epElecRows')}
            arr={ELEC_TYPE_ARR}
            cat={UTIL_CAT.elec}
            qtyField="qty"
            qtyLabel="Qty"
            unitLabel="ea"
            newRow={EP_ELEC_ROW}
            materialRows={materialRows}
            materialPrices={materialPrices}
            refreshAllRates={refreshAllRates}
            vendorsForCategory={vendorsForCategory}
          />
        </div>
      </div>

      {/* ─── In-House Plumbing (In-House tab only) ─── */}
      {subType !== 'Subcontractor' && (
        <div>
          <SectionHeader title="In-House Plumbing" />
          <p className="text-xs text-gray-400 italic mb-2">
            Pool plumbing done in-house — labor hours + materials $. Blank fields use the DB
            master rate; type a value to override (a typed 0 removes it).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label text="Labor Hours" sub="hrs" />
              <div className="flex items-center gap-1">
                <NumInput
                  value={T.plumbingIH?.hours ?? ''}
                  onChange={v => upd('plumbingIH', { ...(T.plumbingIH || {}), hours: v })}
                  placeholder={`default ${laborRates['Pool Plumbing - Base Hours'] ?? 16}`}
                  className="flex-1 min-w-0"
                />
              </div>
              {(T.plumbingIH?.hours ?? '') === '' && (
                <p className="text-[10px] text-gray-400 mt-0.5">
                  default {laborRates['Pool Plumbing - Base Hours'] ?? 16} hrs
                </p>
              )}
            </div>
            <div>
              <Label text="Materials" sub="$" />
              <div className="flex items-center gap-1">
                <div className="relative flex-1 min-w-0">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    $
                  </span>
                  <NumInput
                    value={T.plumbingIH?.materials ?? ''}
                    onChange={v => upd('plumbingIH', { ...(T.plumbingIH || {}), materials: v })}
                    placeholder={`default ${materialPrices['Pool Plumbing - Materials'] ?? 350}`}
                    className="pl-6"
                  />
                </div>
              </div>
              {(T.plumbingIH?.materials ?? '') === '' && (
                <p className="text-[10px] text-gray-400 mt-0.5">
                  default $ {materialPrices['Pool Plumbing - Materials'] ?? 350}
                </p>
              )}
            </div>
          </div>
          {(calc.plumbHrsIH > 0 || calc.plumbMatIH > 0) && (
            <p className="text-xs text-gray-500 mt-2 px-1">
              {calc.plumbHrsIH.toFixed(1)} hrs × ${n(state.laborRatePerHour)}/hr ={' '}
              <strong>{fmt2(calc.plumbHrsIH * n(state.laborRatePerHour))}</strong> labor
              {calc.plumbMatIH > 0 && (
                <>
                  {' '}
                  + <strong>{fmt2(calc.plumbMatIH)}</strong> materials
                </>
              )}
            </p>
          )}
        </div>
      )}

      {/* ─── 12. Manual Entry ─── */}
      <div>
        <SectionHeader title="Manual Entry" />
        <div className="space-y-2">
          {T.manualRows.map((r, i) => (
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
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
    </SubRateOverrideProvider>
    </SubTabContext.Provider>
  )
}
