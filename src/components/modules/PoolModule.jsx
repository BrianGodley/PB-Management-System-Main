import WorkTypeChooser from './WorkTypeChooser'
import CrewTypeBar from './CrewTypeBar'
import ModuleHeaderSlot from './ModuleHeaderSlot'
import { useState, useEffect, useCallback, useContext } from 'react'
import { SubTabContext, subSectionTitle } from './subTabContext'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import { SubRateOverrideProvider } from '../SubRateOverrideContext.jsx'
import { fetchSalesTaxRate } from '../../lib/companyDefaults'
import { calcWalkAccessLabor } from '../../lib/walkAccess'
import { catalogItemFor, catalogOptions, fetchModuleCatalog, fetchStandardRateMap , fetchLaborRateMap } from '../../lib/materialCatalog'
import { resolveUtilRow } from '../../lib/utilRow'
import { calcPool } from './poolCalc'
import UnpricedItemModal from '../UnpricedItemModal'

// ─────────────────────────────────────────────────────────────────────────────
// Pool Module
// Material prices → material_rates (category = 'Pool') keyed by name
// Labor rates     → labor_rates    (category = 'Pool') keyed by name
// ─────────────────────────────────────────────────────────────────────────────


// ── Tile install types — labor hrs/LF live in labor_rates as 'Tile - <type>' ─
const TILE_INSTALL_TYPES = [
  '6" Squares',
  '3" Squares',
  '2" Squares',
  '1" Squares',
  'Segmental',
  'Multi-Piece',
  'Glass Tile',
]

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

// ── Coping types — labor ('Coping - <type>' in labor_rates) + material
//    ('Coping Mat - <type>' in misc_rates) read live from the rate maps.
const COPING_TYPES = [
  'Paver Bullnose',
  'Travertine 12"x12"',
  'Precast Concrete',
  'Arizona Flagstone Eased',
  'Other Flagstone',
  'Pacific Clay',
  'Pour In Place Sand Finish',
]


// ── Interior finish types ($/SF sub — 'Interior Finish - <type>' in subs) ────
const INTERIOR_TYPES = ['White Plaster', 'Quartzscapes', 'Stonescapes']

// ── Raised surface types — labor ('Raised - <type>') + material
//    ('Raised Mat - <type>') read live from the rate maps.
const RAISED_SURFACE_TYPES = [
  '6" Square Tile',
  '3" Square Tile',
  '2" Square Tile',
  '1" Square Tile',
  'Segmental Tile',
  'Multi-Piece Tile',
  'Glass Tile',
  'MSI Ledgerstone',
  'Flat Flagstone Arizona',
  'Flat Flagstone Other',
  'Stucco',
  'Integral Color Stucco',
]

// ── Excavation equipment — excavation labor now maps to the Skid Steer module's
//    shared 'Skid - Soil' rate (hrs/CY), so 'Skid Steer' is the only equipment.
const EXCAVATION_LABOR_NAME = {
  'Skid Steer': 'Skid - Soil',
}
const EXCAVATION_TYPES = Object.keys(EXCAVATION_LABOR_NAME)

// ── Plumbing base configuration types — flat sub cost lives in
//    subcontractor_rates keyed by 'Plumbing <type>' (read live).
const PLUMBING_BASE_TYPES = ['Pool Only', 'Pool + Spa']

// ── Equipment catalog — identity only. Each model's unit price is read live
//    from materialPrices[model] (misc_rates, category 'Pool'); no hardcoded
//    price. 'Other' is a manual-entry placeholder.
const EQUIPMENT_CATALOG = {
  Pump: [{ model: 'VSHP270AUT' }, { model: 'VSHP33AUT' }, { model: 'Other' }],
  Filter: [{ model: 'CV340' }, { model: 'CV460' }, { model: 'CV580' }, { model: 'Other' }],
  Heater: [{ model: 'VersaTemp' }, { model: 'JXi400N' }, { model: 'Other' }],
  'Salt Sanitizer': [{ model: 'APUREM' }, { model: 'Other' }],
  'Sheer Descent': [
    { model: '1\' - 1" Lip' },
    { model: '2\' - 1" Lip' },
    { model: '3\' - 1" Lip' },
    { model: '4\' - 1" Lip' },
    { model: '5\' - 1" Lip' },
    { model: '6\' - 1" Lip' },
    { model: '1\' - 6" Lip' },
    { model: '2\' - 6" Lip' },
    { model: '3\' - 6" Lip' },
    { model: '4\' - 6" Lip' },
    { model: '5\' - 6" Lip' },
    { model: '6\' - 6" Lip' },
    { model: '1\' - 12" Lip' },
    { model: '2\' - 12" Lip' },
    { model: '3\' - 12" Lip' },
    { model: '4\' - 12" Lip' },
    { model: '5\' - 12" Lip' },
    { model: '6\' - 12" Lip' },
    { model: 'Other' },
  ],
  Lighting: [{ model: "RGBW 50'" }, { model: "RGBW 100'" }, { model: 'Other' }],
  Automation: [
    { model: 'RS-P4' },
    { model: 'RS-PS4' },
    { model: 'RS-P6' },
    { model: 'RS-PS6' },
    { model: 'RS-PS8' },
    { model: 'Other' },
  ],
}
const EQUIPMENT_CATEGORIES = Object.keys(EQUIPMENT_CATALOG)

const n = v => parseFloat(v) || 0

// ── Pool Equipment now lives in master material rates (sub-category 'Equipment',
//    category 'Pool', supplied by Heritage Pools). Each item carries its equipment
//    category + labor pointer on calc_meta ({ pool_equip_category, labor_rate }).
//    These helpers drive the Vendor → Category → Model pickers off the material
//    rows — no hardcoded model list, no name-keyed pricing/labor.
const POOL_EQUIP_SUBCAT = 'Equipment'
function equipOptions(materialRows, vendorSel) {
  return catalogOptions(materialRows, POOL_EQUIP_SUBCAT, vendorSel || 'Standard', {
    standardRows: 'null-vendor',
    stripPrefix: true,
    category: 'Pool',
  })
}
// Vendors that actually carry Equipment items (drives the Vendor picker).
function equipVendorIds(materialRows) {
  return [
    ...new Set(
      (materialRows || [])
        .filter(r => r.category === 'Pool' && r.sub_category === POOL_EQUIP_SUBCAT && r.vendor_id)
        .map(r => r.vendor_id)
    ),
  ]
}
// Default equipment vendor (first vendor carrying Equipment items — Heritage Pools).
function defaultEquipVendor(materialRows) {
  return equipVendorIds(materialRows)[0] || 'Standard'
}
function equipCategories(materialRows, vendorSel) {
  const seen = new Set()
  equipOptions(materialRows, vendorSel).forEach(o => {
    const c = o.row.calc_meta?.pool_equip_category
    if (c) seen.add(c)
  })
  return [...seen].sort()
}
function equipModels(materialRows, vendorSel, cat) {
  return equipOptions(materialRows, vendorSel).filter(
    o => (o.row.calc_meta?.pool_equip_category || '') === cat
  )
}

// ── Coping now lives in master material rates (sub-category 'Coping', category
//    'Pool'). Precast Concrete is supplied by Bellecrete; the rest are Standard.
//    Each item's labor rides on calc_meta.labor_rate ('Coping - <type>').
const COPING_SUBCAT = 'Coping'
function copingOptions(materialRows, vendorSel) {
  return catalogOptions(materialRows, COPING_SUBCAT, vendorSel || 'Standard', {
    standardRows: 'null-vendor',
    stripPrefix: true,
    category: 'Pool',
  })
}
// Real vendors (non-Standard) carrying Coping items — drives the Vendor picker.
function copingVendorIds(materialRows) {
  return [
    ...new Set(
      (materialRows || [])
        .filter(r => r.category === 'Pool' && r.sub_category === COPING_SUBCAT && r.vendor_id)
        .map(r => r.vendor_id)
    ),
  ]
}

// ── Tile / Spillway / Raised Surface now live in master material rates (Standard,
//    no vendor picker). Each item carries its labor pointer on calc_meta.labor_rate
//    ('Tile - <type>' / 'Spillway - <type>' / 'Raised - <type>'). Tile's material
//    $/SF stays a per-row figure; Spillway/Raised material comes from the item.
const TILE_SUBCAT = 'Tile'
const SPILLWAY_SUBCAT = 'Spillway'
const RAISED_SUBCAT = 'Raised Surface'
// Water Features (sheer descents / curtain waterfalls, etc.) — a master material
// rates sub-category (Pool / 'Water Features'). Each item's material = price × qty,
// labor = qty × labor_rates[item.calc_meta.labor_rate]. Extensible: any new item
// added to the sub-category shows up here automatically with its own labor pointer.
const WATER_FEATURE_SUBCAT = 'Water Features'
// Fixed, ordered Type groupings within Water Features. Each catalog item is tagged
// with one of these via calc_meta.water_feature_type; the Type dropdown filters the
// Feature picker to that group. Add a new type here + tag items to extend.
const WATER_FEATURE_TYPES = ['Sheer Descents', 'Fire/Water Bowls', 'Deck Jets', 'Water Slides']
// Steel = rebar picked from the shared Basic Materials → Reinforcement rows
// ('Rebar #3'…'Rebar #8', priced per Ln Ft). In-House install labor rides on the
// Pool 'Steel - Install' labor rate (per Ln Ft; seed empty). Rebar LF = shell SF ×
// a per-row LF/SF factor.
const BASIC_CATEGORY = 'Basic Materials'
const REINFORCEMENT_SUBCAT = 'Reinforcement'
const POOL_STEEL_LABOR = 'Steel - Install'

// View Rates scope (mirrors WALLS_RATE_SCOPE): the exact (category, sub) pairs the
// Pool calc consumes, so buildViewRates surfaces ONLY those instead of dumping the
// whole borrowed Utilities category. Own category 'Pool' covers all tile/spillway/
// coping/raised/water-feature/equipment catalog materials + every Pool labor/misc/
// subcontractor rate. Borrowed: whole Utilities (E&P material + '<item> - Labor Rate'
// labor + trench excavation misc), the shared Skid excavation rate, rebar, and the
// shared Concrete Mix catalog (In-House shotcrete material).
const POOL_RATE_SCOPE = [
  { category: 'Pool' },
  { category: 'Utilities' }, // E&P materials + per-item labor rates + trench excavation coeffs
  { category: 'Demo', sub: 'Skid Steer', only: ['Skid - Soil'] }, // shared excavation hrs per Cu Yd
  { category: 'Basic Materials', sub: 'Reinforcement' }, // rebar #3–#8 (steel material)
  { category: 'Concrete', sub: 'Concrete Mix' }, // In-House shotcrete mix material
]
function poolStdOptions(materialRows, subcat, vendorSel = 'Standard') {
  return catalogOptions(materialRows, subcat, vendorSel, {
    standardRows: 'null-vendor',
    stripPrefix: true,
    category: 'Pool',
  })
}
function poolStdItem(materialRows, subcat, key, vendorSel = 'Standard') {
  return catalogItemFor(materialRows, subcat, vendorSel, key, {
    standardRows: 'null-vendor',
    category: 'Pool',
    stripPrefix: true,
    fallbackFirst: false,
  })
}
// Real vendors (non-Standard) carrying items in a Pool sub-category — drives the
// per-row Vendor picker (Standard + whichever vendors stock that sub-category).
function poolSubVendorIds(materialRows, subcat) {
  return [
    ...new Set(
      (materialRows || [])
        .filter(r => r.category === 'Pool' && r.sub_category === subcat && r.vendor_id)
        .map(r => r.vendor_id)
    ),
  ]
}
// Default vendor for a sub-category whose items are vendor-priced (not Standard) —
// e.g. Water Features (Heritage). Falls back to Standard if none carry it.
function defaultSubVendor(materialRows, subcat) {
  return poolSubVendorIds(materialRows, subcat)[0] || 'Standard'
}
// Water Features options for a vendor, filtered to one Type group (calc_meta.water_feature_type).
function waterFeatureOptions(materialRows, vendorSel, wfType) {
  return poolStdOptions(materialRows, WATER_FEATURE_SUBCAT, vendorSel).filter(
    o => (o.row.calc_meta?.water_feature_type || '') === wfType
  )
}


// ── Electrical & Plumbing catalog (ported from the Utilities module) ──────────
// Rates live in the catalog / labor_rates / misc_rates under category
// 'Utilities' so they stay a single source of truth shared with the Utilities
// module. Identity only here (dbName + laborDbName) — every price/coefficient is
// read live from the rate maps, no hardcoded fallback. A vendor overrides ONLY
// the material price for the selected item; labor always comes from laborDbName.
const UTILITY_LINE_TYPES = {
  'PVC Conduit with Electrical': { dbName: 'PVC Conduit with Electrical', laborDbName: 'PVC Conduit with Electrical - Labor Rate' },
  '1-1/2" Poly Gas Pipe': { dbName: '1-1/2" Poly Gas Pipe', laborDbName: '1-1/2" Poly Gas Pipe - Labor Rate' },
  '1" Black Iron Gas Pipe': { dbName: '1" Black Iron Gas Pipe', laborDbName: '1" Black Iron Gas Pipe - Labor Rate' },
  '1-1/2" Black Iron Gas Pipe': { dbName: '1-1/2" Black Iron Gas Pipe', laborDbName: '1-1/2" Black Iron Gas Pipe - Labor Rate' },
  '2" Black Iron Gas Pipe': { dbName: '2" Black Iron Gas Pipe', laborDbName: '2" Black Iron Gas Pipe - Labor Rate' },
}
const GAS_FIXTURE_TYPES = {
  '12" Single Gas Ring': { dbName: '12" Single Gas Ring', laborDbName: '12" Single Gas Ring - Labor Rate' },
  '18" Single Gas Ring': { dbName: '18" Single Gas Ring', laborDbName: '18" Single Gas Ring - Labor Rate' },
  '24" Single Gas Ring': { dbName: '24" Single Gas Ring', laborDbName: '24" Single Gas Ring - Labor Rate' },
  '24" Double Gas Ring': { dbName: '24" Double Gas Ring', laborDbName: '24" Double Gas Ring - Labor Rate' },
  "2' Straight Gas Bar": { dbName: "2' Straight Gas Bar", laborDbName: "2' Straight Gas Bar - Labor Rate" },
  "3' Straight Gas Bar": { dbName: "3' Straight Gas Bar", laborDbName: "3' Straight Gas Bar - Labor Rate" },
  "4' Straight Gas Bar": { dbName: "4' Straight Gas Bar", laborDbName: "4' Straight Gas Bar - Labor Rate" },
  'Gas Shut-Off Valve': { dbName: 'Gas Shut-Off Valve', laborDbName: 'Gas Shut-Off Valve - Labor Rate' },
}
const ELECTRICAL_FIXTURE_TYPES = {
  'Electric Sub-panel': { dbName: 'Electric Sub-panel', laborDbName: 'Electric Sub-panel - Labor Rate' },
  'Electric Disconnect': { dbName: 'Electric Disconnect', laborDbName: 'Electric Disconnect - Labor Rate' },
  'GFCI Protected Receptacles': { dbName: 'GFCI Protected Receptacles', laborDbName: 'GFCI Protected Receptacles - Labor Rate' },
  'Bubble Covers for Receptacles': { dbName: 'Bubble Covers for Receptacles', laborDbName: 'Bubble Covers for Receptacles - Labor Rate' },
  'Infratech W2024SS 2000W 240V Heater (Stainless)': { dbName: 'Infratech W2024SS 2000W 240V Heater (Stainless)', laborDbName: 'Infratech W2024SS 2000W 240V Heater (Stainless) - Labor Rate' },
  'Infratech W39 Flush Mount Frame': { dbName: 'Infratech W39 Flush Mount Frame', laborDbName: 'Infratech W39 Flush Mount Frame - Labor Rate' },
  'Infratech Single Duplex Switch in Surface Mount Gang Box': { dbName: 'Infratech Single Duplex Switch in Surface Mount Gang Box', laborDbName: 'Infratech Single Duplex Switch in Surface Mount Gang Box - Labor Rate' },
}
const LINE_TYPE_ARR = Object.entries(UTILITY_LINE_TYPES).map(([label, t]) => ({ label, dbName: t.dbName, laborDbName: t.laborDbName }))
const GAS_TYPE_ARR = Object.entries(GAS_FIXTURE_TYPES).map(([label, t]) => ({ label, dbName: t.dbName, laborDbName: t.laborDbName }))
const ELEC_TYPE_ARR = Object.entries(ELECTRICAL_FIXTURE_TYPES).map(([label, t]) => ({ label, dbName: t.dbName, laborDbName: t.laborDbName }))
// Pool Utilities sub-sections mirror the Utilities module's sub-categories so they
// share the same master material rates items + calc_meta labor mapping.
const UTIL_CAT = { line: 'Electrical Pipe', gasPipe: 'Gas Pipe', wire: 'Electrical Wiring', elec: 'Electrical Fixtures' }
const EP_LINE_ROW = () => ({ type: '', lf: '', vendor: 'Standard' }) // Electrical Pipe (LF)
const EP_GASPIPE_ROW = () => ({ type: '', lf: '', vendor: 'Standard' }) // Gas Pipe (LF)
const EP_WIRE_ROW = () => ({ type: '', lf: '', vendor: 'Standard' }) // Electrical Wiring (LF)
const EP_ELEC_ROW = () => ({ type: '', qty: '', vendor: 'Standard' }) // Electrical Fixtures (Each)
// Utility trenching (mirrors the Utilities module): method → hrs per Cu Ft.
const POOL_TRENCH_LABOR = { Trench: 'Utilities Trench Excavation', Hand: 'Utilities Hand Excavation' }
const EP_TRENCH_ROW = () => ({ equipment: 'Trench', lf: '', width: '', depth: '' })

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
  // Resolve a stored ref_key (legacy id/name too) to the item's display name for the
  // orphan-value fallback option. Strips the "<sub> - " prefix.
  const matName = key => {
    if (!key) return key
    const hit = (materialRows || []).find(r => r.ref_key === key || r.id === key || r.name === key)
    if (!hit) return key
    const dash = hit.name ? hit.name.indexOf(' - ') : -1
    return dash > 0 ? hit.name.slice(dash + 3) : hit.name
  }
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
              <th className="text-center pb-1 pr-2 font-medium">Vendor</th>
              <th className="text-center pb-1 pr-2 font-medium">Type</th>
              <th className="text-center pb-1 pr-2 font-medium">{qtyLabel}</th>
              <th className="text-center pb-1 pr-2 font-medium text-gray-400">$/{unitLabel}</th>
              <th className="text-center pb-1 font-medium text-gray-400">Material $</th>
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
                        value={row.type || ''}
                        onChange={e => upd(i, 'type', e.target.value)}
                      >
                        {!row.type && <option value="">Select type</option>}
                        {row.type && !opts.some(o => (o.ref_key || o.label) === row.type || o.label === row.type) && (
                          <option value={row.type}>{matName(row.type)}</option>
                        )}
                        {opts.map(o => (
                          <option key={o.label} value={o.ref_key || o.label}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="py-1 pr-2">
                    <NumInput value={row[qtyField]} onChange={v => upd(i, qtyField, v)} className="w-full text-center" />
                  </td>
                  <td className="py-1 text-center text-gray-400 text-xs pr-2">
                    <span className="inline-flex items-center justify-center gap-1">
                      ${matCost.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-1 text-center text-gray-600 text-xs">
                    {mat > 0 ? `$${mat.toFixed(2)}` : '—'}
                  </td>
                  <td className="py-1 text-center">
                    {rows.length > 1 && (
                      <button
                        type="button"
                        className="text-gray-500 hover:text-red-500 text-xs leading-none"
                        title="Remove row"
                        onClick={() => setRows(rs => rs.filter((_, idx) => idx !== i))}
                      >
                        ✕
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
  vendor: 'Standard',
  installType: '6" Squares',
  matPricePerSF: '2.50',
  waterproof: false,
})
const defaultInteriorStruct = () => ({ type: '', subCost: '' })
const newSpillway = () => ({ struct: 'Pool', vendor: 'Standard', type: '', qty: '1', lf: '' })
const newWaterFeature = () => ({ vendor: '', wfType: WATER_FEATURE_TYPES[0], type: '', qty: '1' })
const newCopingRow = () => ({ struct: 'Pool', vendor: 'Standard', type: '', lf: '', sided: 'single' })
const newRaisedSurface = () => ({ matType: '', sqft: '', curvePct: '', corners: '' })
const newEquipRow = () => ({ vendor: '', category: 'Pump', model: '', qty: '1', unitCost: '' })
const newManualRow = () => ({ label: '', hours: '', materials: '', subCost: '' })

// Old estimates keyed the basin's tile/interior maps under 'Infinity Basin'.
// The label is now 'Infinity Edge Basin' — carry the old value forward so a
// saved estimate doesn't lose its basin tile/interior data on reload.
function migrateStructMap(m) {
  if (!m || typeof m !== 'object') return m
  if (m['Infinity Basin'] && !m['Infinity Edge Basin']) {
    return { ...m, 'Infinity Edge Basin': m['Infinity Basin'] }
  }
  return m
}

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
    trough: data.trough ?? defaultStruct(),
    // Excavation now carries its OWN In-House / Sub toggle (independent of the
    // module-level tab). Sub mode picks a subcontractor company and auto-fills
    // that sub's Pool excavation rate (overridable). Merge over defaults so
    // older saved estimates gain the new fields. 'From Trucks' was dropped
    // (handled in Job Site Conditions).
    excavation: {
      mode: 'In House',
      equipment: 'Skid Steer',
      toDumpMiles: '',
      subVendor: 'Our Trucking',
      subVendorId: null,
      subRate: '',
      subRateUnit: '',
      subCost: '',
      ...(data.excavation || {}),
    },
    shotcrete: data.shotcrete ?? { manualSubCost: '' },
    tile: migrateStructMap(data.tile) ?? {
      Pool: defaultTileStruct(),
      Spa: defaultTileStruct(),
      'Cover Vault': defaultTileStruct(),
      'Infinity Edge Basin': defaultTileStruct(),
      'Zero Edge Trough': defaultTileStruct(),
    },
    spillways: data.spillways ?? [newSpillway()],
    waterFeatures: data.waterFeatures ?? [newWaterFeature()],
    copingRows: data.copingRows ?? [newCopingRow()],
    raisedSurfaces: data.raisedSurfaces ?? [newRaisedSurface()],
    interiorFinish: migrateStructMap(data.interiorFinish) ?? {
      Pool: defaultInteriorStruct(),
      Spa: defaultInteriorStruct(),
      'Cover Vault': defaultInteriorStruct(),
      'Infinity Edge Basin': defaultInteriorStruct(),
      'Zero Edge Trough': defaultInteriorStruct(),
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
    steel: data.steel ?? { vendor: 'Standard', rebarSize: '', sf: '', lfPerSf: '', manualSubCost: '' },
    // In-House pool plumbing — labor hours + materials $ done in-house (not a
    // sub trade). Blank strings default to the DB master rates in calcPool.
    plumbingIH: data.plumbingIH ? { hours: '', materials: '', ...data.plumbingIH } : { hours: '', materials: '' },
    epTrenchRows: data.epTrenchRows ?? [EP_TRENCH_ROW()],
    epGasPipeRows: data.epGasPipeRows ?? [EP_GASPIPE_ROW()],
    epLineRows: data.epLineRows ?? [EP_LINE_ROW()],
    epWireRows: data.epWireRows ?? [EP_WIRE_ROW()],
    epElecRows: data.epElecRows ?? [EP_ELEC_ROW()],
    manualRows: data.manualRows ?? [newManualRow()],
  }
}

function makeInitial(data = {}) {
  return {
    // Independent In-House vs Sub input records — each tab is its own calculator.
    // Legacy estimates stored their inputs flat → load them as the In-House tab.
    ihData: makeTab(data.ihData || data),
    subData: makeTab(data.subData || {}),
    // ── Shared (top-level) fields — never per-tab ──
    laborRatePerHour: data.laborRatePerHour ?? null,
    laborBurdenPct: data.laborBurdenPct ?? null,
    gpmd: data.gpmd ?? null,
    commissionRate: data.commissionRate ?? null,
    subGpMarkupRate: data.subGpMarkupRate ?? null,
    walkPace: data.walkPace ?? null,
    crewType: data.crewType ?? 'Specialty',
    subType: data.subType ?? 'In-House',
    rateOverrides: data.rateOverrides,
    walkAccess: data.walkAccess,
  }
}

// ── Main Calculation ──────────────────────────────────────────────────────────

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

function Label({ text, sub, center }) {
  return (
    <label className={`block text-xs font-medium text-gray-600 mb-0.5 ${center ? 'text-center' : ''}`}>
      {text}
      {sub && <span className="text-gray-400 font-normal ml-1">({sub})</span>}
    </label>
  )
}

function StructDims({ label, data, onChange, alwaysEnabled, oneRow }) {
  const toggle = () => onChange({ ...data, enabled: !data.enabled })
  if (!alwaysEnabled && !data.enabled) {
    return (
      <button
        type="button"
        onClick={toggle}
        className="w-full text-left px-3 py-2 rounded-lg border border-green-500 text-xs font-medium text-green-700 hover:bg-green-50 hover:border-green-600 transition-colors"
      >
        + Add {label}
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
      <div className={`grid grid-cols-2 ${oneRow ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-2`}>
        {[
          ['Water Surface', 'waterSF', 'sqft'],
          ['Perimeter', 'perimLF', 'LF'],
          ['Max Depth', 'maxDepth', 'ft'],
          ['Steps / Bench', 'stepBenchLF', 'LF'],
          // Dam Wall is spa-only (separates the spa from pool water surface).
          // Pool, Cover Vault, Infinity Edge Basin and Zero Edge Trough don't use it.
          ...(label === 'Spa' ? [['Dam Wall', 'damWallLF', 'LF']] : []),
        ].map(([lbl, key, unit]) => (
          <div key={key}>
            <Label text={lbl} sub={unit} />
            <NumInput value={data[key]} onChange={v => onChange({ ...data, [key]: v })} />
          </div>
        ))}
      </div>
      {n(data.maxDepth) > 0 && (
        <p className="text-xs text-gray-400 mt-1">
          Avg depth: {((n(data.maxDepth) * 2) / 3).toFixed(2)}′
        </p>
      )}
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
  const [laborModalItem, setLaborModalItem] = useState(null)
  const [subRates, setSubRates] = useState({})
  const [materialRows, setMaterialRows] = useState([])
  // Resolve a stored Type/model (frozen material ref_key; legacy id/name still work)
  // to the item's display name via the live catalog — used by the orphan-value
  // fallback options so a stored key never renders raw. Strips the "<sub> - " prefix.
  const matName = key => {
    if (!key) return key
    const hit = (materialRows || []).find(r => r.ref_key === key || r.id === key || r.name === key)
    if (!hit) return key
    const dash = hit.name ? hit.name.indexOf(' - ') : -1
    return dash > 0 ? hit.name.slice(dash + 3) : hit.name
  }
  const [vendors, setVendors] = useState([])
  const [subCompanies, setSubCompanies] = useState([]) // subs_vendors type='sub'
  const [subExcavRows, setSubExcavRows] = useState([]) // subcontractor_rates (Pool) w/ company
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
      .select('labor_rate_per_hour, labor_burden_pct, walk_access_pace_lf_per_min, estimate_gpmd_default, commission_rate, sub_gp_markup_rate')
      .single()
      .then(({ data }) => {
        if (!alive || !data) return
        setState(s => ({
          ...s,
          ...(data.labor_rate_per_hour != null
            ? { laborRatePerHour: parseFloat(data.labor_rate_per_hour) }
            : {}),
          ...(data.labor_burden_pct != null
            ? { laborBurdenPct: parseFloat(data.labor_burden_pct) }
            : {}),
          ...(data.estimate_gpmd_default != null
            ? { gpmd: parseFloat(data.estimate_gpmd_default) }
            : {}),
          ...(data.commission_rate != null
            ? { commissionRate: parseFloat(data.commission_rate) }
            : {}),
          ...(data.sub_gp_markup_rate != null
            ? { subGpMarkupRate: parseFloat(data.sub_gp_markup_rate) }
            : {}),
          ...(data.walk_access_pace_lf_per_min != null
            ? { walkPace: parseFloat(data.walk_access_pace_lf_per_min) }
            : {}),
        }))
      })
    return () => {
      alive = false
    }
  }, [])

  // Re-fetch all three Pool rate tables. Called on mount and after edits.
  const refreshAllRates = useCallback(async () => {
    const [mp, labMap, subRes, catRows, venRes, subCoRes] = await Promise.all([
      fetchStandardRateMap(['Pool', 'Utilities']),
      // dual-keyed (name + ref_key) + basic_labor_rates. 'Demo' for shared excavation.
      fetchLaborRateMap(['Pool', 'Utilities', 'Finishes', 'Demo']),
      supabase.from('subcontractor_rates').select('company_name,trade,rate,unit').eq('category', 'Pool'),
      // 'Concrete' loads the shared 'Concrete Mix' catalog (In-House shotcrete
      // material) — without it the shotcrete Type picker resolves $0.
      fetchModuleCatalog(['Utilities', 'Pool', 'Basic Materials', 'Concrete']),
      supabase
        .from('subs_vendors')
        .select('id, company_name')
        .eq('type', 'vendor')
        .order('company_name'),
      supabase
        .from('subs_vendors')
        .select('id, company_name')
        .eq('type', 'sub')
        .order('company_name'),
    ])
    const sr = {}
    ;(subRes.data || []).forEach(r => {
      sr[r.trade] = parseFloat(r.rate)
    })
    setMaterialPrices(mp)
    setLaborRates(labMap)
    setSubRates(sr)
    setSubExcavRows(subRes.data || [])
    setMaterialRows(catRows || [])
    setVendors(
      (venRes.data || []).map(v => ({
        id: v.id,
        name: v.company_name,
      }))
    )
    setSubCompanies(
      (subCoRes.data || []).map(v => ({
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
  // Find a subcontractor's Pool excavation rate (prefer an excavation/dig/haul/
  // demo trade line; else the first Pool rate on file for that company).
  const excavSubRateFor = name => {
    if (!name) return null
    const rows = subExcavRows.filter(r => (r.company_name || '') === name)
    if (!rows.length) return null
    const pick = rows.find(r => /excav|dig|haul|demo|dirt|remov/i.test(r.trade || '')) || rows[0]
    return { rate: parseFloat(pick.rate) || 0, unit: pick.unit || '' }
  }
  // Pick a sub company for excavation: store the company + snapshot its rate so
  // the estimate is reproducible even if the master rate later changes.
  const chooseExcavSub = name => {
    const r = excavSubRateFor(name)
    const co = subCompanies.find(c => c.name === name)
    upd('excavation', {
      ...T.excavation,
      subVendor: name,
      subVendorId: co?.id ?? null,
      subRate: r ? r.rate : '',
      subRateUnit: r ? r.unit : '',
    })
  }
  const vendorsForCategory = cat => vendors.filter(v => materialRows.some(r => r.vendor_id === v.id && (r.sub_category === cat || r.category === cat)))
  const setEpRows = key => fn => updT(key, arr => fn(arr || []))

  // Effective calc input: shared top-level fields + the active tab's inputs.
  // calcPool reads its input fields off this merged object, so the running
  // total reflects only the tab currently being edited.
  const eff = { ...state, ...T }
  const effWalkAccess = {
    ...(state.walkAccess || {}),
    paceLfPerMin: n(state.walkAccess?.paceLfPerMin) || n(state.walkPace),
  }
  const calcRaw = calcPool(eff, materialPrices, laborRates, subRates, effWalkAccess, materialRows)
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
      // Persist the catalog snapshot so the summary can resolve a row's frozen
      // material ref_key → name (live estimate re-fetches; a frozen bid reads this).
      materialRows,
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
    if (key === 'vendor') arr[i].type = ''
    upd('spillways', arr)
  }
  const removeSpillway = i =>
    upd(
      'spillways',
      T.spillways.filter((_, idx) => idx !== i)
    )

  // ── Water Features helpers ──────────────────────────────────────────────────────
  const addWaterFeature = () => upd('waterFeatures', [...T.waterFeatures, newWaterFeature()])
  const updWaterFeature = (i, key, val) => {
    const arr = [...T.waterFeatures]
    arr[i] = { ...arr[i], [key]: val }
    // Changing vendor or Type resets the picked feature (its option list changes).
    if (key === 'vendor' || key === 'wfType') arr[i].type = ''
    upd('waterFeatures', arr)
  }
  const removeWaterFeature = i =>
    upd(
      'waterFeatures',
      T.waterFeatures.filter((_, idx) => idx !== i)
    )

  // ── Coping helpers ────────────────────────────────────────────────────────────
  const addCoping = () => upd('copingRows', [...T.copingRows, newCopingRow()])
  const updCoping = (i, key, val) => {
    const arr = [...T.copingRows]
    arr[i] = { ...arr[i], [key]: val }
    // Switching vendor changes which Coping items are available — clear the type.
    if (key === 'vendor') arr[i].type = ''
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
  const equipVendorSel = eq => eq.vendor || defaultEquipVendor(materialRows)
  const addEquip = () => upd('equipment', [...T.equipment, newEquipRow()])
  const updEquip = (i, key, val) => {
    const arr = [...T.equipment]
    arr[i] = { ...arr[i], [key]: val }
    const vsel = equipVendorSel(arr[i])
    // Auto-fill Unit $ from the selected model's master material rates item
    // (no hardcoded price); blank when unpriced so the user can price it.
    const autofill = model => {
      const it = catalogItemFor(materialRows, POOL_EQUIP_SUBCAT, vsel, model, {
        standardRows: 'null-vendor',
        category: 'Pool',
        stripPrefix: true,
        fallbackFirst: false,
      })
      arr[i].unitCost = it && it.unit_cost != null ? String(it.unit_cost) : ''
    }
    if (key === 'vendor') {
      const cats = equipCategories(materialRows, val)
      arr[i].category = cats[0] || ''
      {
        const first = equipModels(materialRows, val, arr[i].category)[0]
        arr[i].model = first?.ref_key || first?.label || ''
        autofill(arr[i].model)
      }
    } else if (key === 'category') {
      const first = equipModels(materialRows, vsel, val)[0]
      arr[i].model = first?.ref_key || first?.label || ''
      autofill(arr[i].model)
    } else if (key === 'model') {
      autofill(val)
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
    ['Cover Vault', T.vault, false],
    ['Infinity Edge Basin', T.basin, false],
    ['Zero Edge Trough', T.trough, false],
  ]
    .filter(([, s, always]) => always || (s && s.enabled))
    .map(([k]) => k)

  // ── Grouped rate list for the "View Rates" popup (CrewTypeBar). Every rate
  //    that used to have an inline RateEditPopover in this module now lives here.
  // Material rows for a catalog item (matched by name) from the shared Utilities
  // catalog. One row per vendor (Standard first), each editable straight to
  // material_price — same helper shape Walls/Utilities use. The Electrical &
  // Plumbing section resolves its line/gas/electrical MATERIAL prices from this
  // catalog, so surface every vendor price alongside the labor rates.
  const vendorNames = Object.fromEntries((vendors || []).map(v => [v.id, v.name]))
  const matRows = (dbName, unit) => {
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
      { label: `Standard — ${dbName}`, table: 'material_price', name: dbName, category: 'Utilities', unitLabel: unit, mode: 'currency', value: materialPrices[dbName] },
    ]
  }

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
            subMarkupRate={n(state.subGpMarkupRate)}
          />
        </div>
        <div className="px-6 py-2">
          <CrewTypeBar
            crewType={state.crewType}
            onCrewTypeChange={v => updShared('crewType', v)}
            title="Pool"
            moduleType="Pool"
            rateScope={POOL_RATE_SCOPE}
            refreshAllRates={refreshAllRates}
            showInlineToggle={false}
          />
        </div>
      </div>

      <ModuleHeaderSlot>
        <WorkTypeChooser value={subType || 'In-House'} onChange={v => updShared('subType', v)} compact />
      </ModuleHeaderSlot>

      {calc.laborUnset && calc.laborUnset.length > 0 && (
        <div className="text-xs text-amber-800 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2">
          <span className="font-semibold">Labor rate needed</span> — these items contribute 0 labor
          hours until a rate is set. Click one to set it inline:
          <span className="ml-1 inline-flex flex-wrap gap-1 align-middle">
            {calc.laborUnset.map((u, i) =>
              u.name ? (
                <button
                  key={u.name || i}
                  type="button"
                  onClick={() => setLaborModalItem(u)}
                  className="rounded border border-amber-400 bg-white/70 px-1.5 py-0.5 font-medium text-amber-900 hover:bg-white"
                >
                  {u.label} ↗
                </button>
              ) : (
                <span key={(u.label || '') + i} className="px-1 py-0.5 text-amber-800">
                  {u.label}
                </span>
              )
            )}
          </span>
        </div>
      )}

      <UnpricedItemModal
        item={laborModalItem}
        onClose={() => setLaborModalItem(null)}
        onSaved={refreshAllRates}
      />

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
        <StructDims
          label="Pool"
          data={T.pool}
          onChange={v => updStruct('pool', v)}
          alwaysEnabled
          oneRow
        />
        <div className="mt-3 space-y-2">
          <StructDims label="Spa" data={T.spa} onChange={v => updStruct('spa', v)} />
          <StructDims
            label="Cover Vault"
            data={T.vault}
            onChange={v => updStruct('vault', v)}
          />
          <StructDims
            label="Infinity Edge Basin"
            data={T.basin}
            onChange={v => updStruct('basin', v)}
          />
          <StructDims
            label="Zero Edge Trough"
            data={T.trough}
            onChange={v => updStruct('trough', v)}
          />
        </div>
        {calc.totalExcavCY > 0 && (
          <div className="mt-2 flex gap-4 text-xs text-gray-500 px-1">
            <span>
              Excavation: <strong>{calc.totalExcavCY.toFixed(1)} Cu Yd</strong>
            </span>
            <span>
              Shotcrete shell: <strong>{calc.totalShotCY.toFixed(1)} Cu Yd</strong>
            </span>
          </div>
        )}
      </div>

      {/* ─── 2. Excavation ─── */}
      <div>
        {/* Excavation has its OWN In-House/Sub toggle (independent of the module tab):
            Sub greys out the dig; In-House shows Equipment + Haul Method. */}
        {(() => {
          // Excavation defaults to In-House: the section is In-House unless the mode
          // is explicitly 'Sub' (robust to the 'In House'/'In-House' label variants).
          const excMode = T.excavation.mode || 'In House'
          const isExcSub = excMode === 'Sub'
          return (
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex-1">
                <SectionHeader title="Excavation" />
              </div>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden shrink-0">
                {['In House', 'Sub'].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => upd('excavation', { ...T.excavation, mode: m })}
                    className={`px-3 py-1.5 text-xs font-medium ${
                      (m === 'Sub' ? isExcSub : !isExcSub) ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )
        })()}
        {(T.excavation.mode || 'In House') !== 'Sub' ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <Label text="Equipment" />
              <select
                className="input text-sm py-1.5 w-full"
                value={T.excavation.equipment}
                onChange={e => upd('excavation', { ...T.excavation, equipment: e.target.value })}
              >
                {EXCAVATION_TYPES.filter(t => t !== 'Sub Bobcat / Mini Bob').map(t => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <Label text="Haul Method" />
              <select
                className="input text-sm py-1.5 w-full"
                value={T.excavation.haulMethod || ''}
                onChange={e => upd('excavation', { ...T.excavation, haulMethod: e.target.value })}
              >
                <option value="">Select…</option>
                <option value="Containers">Containers</option>
                <option value="Sub Haul">Sub Haul</option>
              </select>
            </div>
            <div>
              <Label text="To Dump" sub="miles" />
              <NumInput
                value={T.excavation.toDumpMiles}
                onChange={v => upd('excavation', { ...T.excavation, toDumpMiles: v })}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <Label text="Subcontractor" />
              <select
                className="input text-sm py-1.5 w-full"
                value={T.excavation.subVendor || ''}
                onChange={e => chooseExcavSub(e.target.value)}
              >
                <option value="">Select…</option>
                {subCompanies.map(c => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
                {T.excavation.subVendor &&
                  !subCompanies.some(c => c.name === T.excavation.subVendor) && (
                    <option value={T.excavation.subVendor}>{T.excavation.subVendor}</option>
                  )}
              </select>
            </div>
            <div>
              <Label text="To Dump" sub="miles" />
              <NumInput
                value={T.excavation.toDumpMiles}
                onChange={v => upd('excavation', { ...T.excavation, toDumpMiles: v })}
              />
            </div>
            <div>
              <Label text="Sub Cost" sub={T.excavation.subRate ? 'auto — override' : 'enter'} />
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  $
                </span>
                <NumInput
                  value={T.excavation.subCost}
                  onChange={v => upd('excavation', { ...T.excavation, subCost: v })}
                  className="pl-6"
                  placeholder={calc.excavAutoSub ? Math.round(calc.excavAutoSub).toString() : 'cost'}
                />
              </div>
            </div>
          </div>
        )}
        {isSub && calc.excavAutoSub > 0 && (
          <p className="text-xs text-gray-500 mt-2 px-1">
            {T.excavation.subVendor || 'Sub'} rate: ${Number(T.excavation.subRate || 0).toLocaleString()}
            {/yd/i.test(T.excavation.subRateUnit || '') ? ` per Cu Yd × ${calc.totalExcavCY.toFixed(1)}` : ''} →{' '}
            <strong>${Math.round(calc.excavAutoSub).toLocaleString()}</strong>
            {n(T.excavation.subCost) > 0 ? ' (overridden)' : ' auto'}
          </p>
        )}
        {calc.excavHrs > 0 && (
          <p className="text-xs text-gray-500 mt-2 px-1">
            {calc.equipRate || '—'} hrs per Cu Yd →{' '}
            <strong>{calc.excavHrs.toFixed(1)} hrs</strong>
          </p>
        )}
        {calc.excMode !== 'Sub' && T.excavation.haulMethod && (
          <p className="text-xs text-gray-500 mt-1 px-1">
            {calc.isContainerHaul
              ? <>Containers: {calc.haulContainers} × ${calc.haulUnitRate || '—'} per container (ceil {calc.totalExcavCY.toFixed(1)} Cu Yd ÷ 10) →{' '}</>
              : <>Sub Haul: {calc.totalExcavCY.toFixed(1)} Cu Yd × ${calc.haulUnitRate || '—'} per Cu Yd →{' '}</>}
            <strong>${Math.round(calc.excavHaulMat).toLocaleString()}</strong> haul (material)
            {calc.haulUnitRate <= 0 && ` — rate "Excavation - ${calc.isContainerHaul ? 'Roll Off per Container' : 'Sub Haul per Cu Yd'}" unpriced`}
          </p>
        )}
      </div>

      {/* ─── Steel (before Shotcrete) ─── */}
      <div>
        <SectionHeader title="Steel" />
        {!isSub ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <Label text="Vendor" />
              <select
                className="input text-sm py-1.5"
                value={T.steel.vendor || 'Standard'}
                onChange={e => upd('steel', { ...T.steel, vendor: e.target.value, rebarSize: '' })}
              >
                <option value="Standard">Standard</option>
                {vendors
                  .filter(v =>
                    materialRows.some(
                      r =>
                        r.category === BASIC_CATEGORY &&
                        r.sub_category === REINFORCEMENT_SUBCAT &&
                        r.vendor_id === v.id
                    )
                  )
                  .map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
              </select>
            </div>
            <div>
              <Label text="Rebar Size" />
              <select
                className="input text-sm py-1.5"
                value={T.steel.rebarSize || ''}
                onChange={e => upd('steel', { ...T.steel, rebarSize: e.target.value })}
              >
                <option value="">Select size</option>
                {catalogOptions(materialRows, REINFORCEMENT_SUBCAT, T.steel.vendor || 'Standard', {
                  standardRows: 'null-vendor',
                  stripPrefix: true,
                  category: BASIC_CATEGORY,
                }).map(o => (
                  <option key={o.value} value={o.ref_key || o.label}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label text="Shell SF" />
              <NumInput value={T.steel.sf} onChange={v => upd('steel', { ...T.steel, sf: v })} />
            </div>
            <div>
              <Label text="LF per SF" sub="rebar factor" />
              <NumInput value={T.steel.lfPerSf} onChange={v => upd('steel', { ...T.steel, lfPerSf: v })} />
            </div>
          </div>
        ) : null}
        {!isSub && n(T.steel.sf) * n(T.steel.lfPerSf) > 0 && (
          <p className="text-xs text-gray-400 mt-2 px-1">
            {(n(T.steel.sf) * n(T.steel.lfPerSf)).toFixed(0)} LF → {fmt2(calc.steelMat)} mat · {calc.steelHrs.toFixed(1)} hrs
            {calc.steelHrs <= 0 && ` (labor rate "${POOL_STEEL_LABOR}" unpriced)`}
          </p>
        )}
        {isSub && (
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
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
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
                Auto: pool perimeter × ${n(subRates['Steel Per LF'])}/LF
                {T.spa.enabled && <> + ${n(subRates['Steel Spa Bonus'])} spa</>}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ─── 3. Shotcrete ─── */}
      <div>
        <SectionHeader title="Shotcrete" />
        {!isSub ? (
          // In-House: Vendor + Type (shared 'Concrete Mix' catalog, default Truck Mix
          // Concrete). Material = CY × Type $/CY; labor = CY × 'Pool - Shotcrete Labor'.
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label text="Vendor" />
                <select
                  className="input text-sm py-1.5 w-full"
                  value={T.shotcrete.vendor || 'Standard'}
                  onChange={e => upd('shotcrete', { ...T.shotcrete, vendor: e.target.value })}
                >
                  <option value="Standard">Standard</option>
                  {vendorsForCategory('Concrete Mix').map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label text="Type" sub="shotcrete mix" />
                <select
                  className="input text-sm py-1.5 w-full"
                  value={T.shotcrete.type || 'Truck Mix Concrete'}
                  onChange={e => upd('shotcrete', { ...T.shotcrete, type: e.target.value })}
                >
                  {catalogOptions(materialRows, 'Concrete Mix', T.shotcrete.vendor || 'Standard', { standardRows: 'null-vendor', stripPrefix: true }).map(o => (
                    <option key={o.value} value={o.ref_key || o.stored}>{o.label}</option>
                  ))}
                  {!catalogOptions(materialRows, 'Concrete Mix', T.shotcrete.vendor || 'Standard', { standardRows: 'null-vendor', stripPrefix: true }).some(o => (o.ref_key || o.stored) === (T.shotcrete.type || 'Truck Mix Concrete') || o.stored === (T.shotcrete.type || 'Truck Mix Concrete')) && (
                    <option value={T.shotcrete.type || 'Truck Mix Concrete'}>{matName(T.shotcrete.type) || 'Truck Mix Concrete'}</option>
                  )}
                </select>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2 px-1">
              {calc.totalShotCY.toFixed(1)} Cu Yd × ${calc.shotMatRate || '—'}/CY → <strong>{fmt2(calc.shotcreteMat)}</strong> mat
              {' · '}× {calc.shotLabRate || '—'} hrs/CY → <strong>{calc.shotcreteHrs.toFixed(1)} hrs</strong>
              {calc.shotLabRate <= 0 && ' (labor rate "Pool - Shotcrete Labor" unpriced)'}
            </p>
          </>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <Label text="Auto Sub Total" />
              <div className="input text-sm py-1.5 bg-gray-50 text-gray-600">
                {fmt2(calc.shotcreteSub)}
                <span className="text-xs text-gray-400 ml-1">auto</span>
              </div>
            </div>
            <div>
              <Label text="Override Sub Cost" />
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
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
                {calc.totalShotCY.toFixed(1)} Cu Yd × ${n(subRates['Shotcrete Material'])}/CY mat + max(${n(subRates['Shotcrete Minimum Labor']).toLocaleString()}, CY × ${n(subRates['Shotcrete Labor'])}/CY lab)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ─── Pool Plumbing (In-House tab only) ─── */}
      {subType !== 'Subcontractor' && (
        <div>
          <SectionHeader title="Pool Plumbing" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label text="Labor Hours" sub="hrs" />
              <div className="flex items-center gap-1">
                <NumInput
                  value={T.plumbingIH?.hours ?? ''}
                  onChange={v => upd('plumbingIH', { ...(T.plumbingIH || {}), hours: v })}
                  placeholder={`default ${n(laborRates['Pool Plumbing - Base Hours'])}`}
                  className="flex-1 min-w-0"
                />
              </div>
              {(T.plumbingIH?.hours ?? '') === '' && (
                <p className="text-[10px] text-gray-400 mt-0.5">
                  default {n(laborRates['Pool Plumbing - Base Hours'])} hrs
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
                    placeholder={`default ${n(materialPrices['Pool Plumbing - Materials'])}`}
                    className="pl-6"
                  />
                </div>
              </div>
              {(T.plumbingIH?.materials ?? '') === '' && (
                <p className="text-[10px] text-gray-400 mt-0.5">
                  default $ {n(materialPrices['Pool Plumbing - Materials'])}
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

      {/* ─── Utilities (Trenching / Gas Pipe / Electrical Pipe·Wiring·Fixtures) ─── */}
      <div>
        <SectionHeader title="Utilities" />
        <div className="space-y-4">
          {/* Trenching — method → hrs per Cu Ft (mirrors the Utilities module). */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1">Trenching</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-200">
                    <th className="text-left pb-1 pr-2 font-medium">Method</th>
                    <th className="text-center pb-1 pr-2 font-medium">Ln Ft</th>
                    <th className="text-center pb-1 pr-2 font-medium">Width (in)</th>
                    <th className="text-center pb-1 pr-2 font-medium">Depth (in)</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {(T.epTrenchRows || []).map((r, i) => {
                    const setT = setEpRows('epTrenchRows')
                    const put = (field, val) => setT(rs => rs.map((x, idx) => (idx === i ? { ...x, [field]: val } : x)))
                    return (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-1 pr-2">
                          <select
                            className="input text-sm py-1"
                            value={r.equipment}
                            onChange={e => put('equipment', e.target.value)}
                          >
                            <option>Trench</option>
                            <option>Hand</option>
                          </select>
                        </td>
                        <td className="py-1 pr-2"><NumInput value={r.lf} onChange={v => put('lf', v)} /></td>
                        <td className="py-1 pr-2"><NumInput value={r.width} onChange={v => put('width', v)} /></td>
                        <td className="py-1 pr-2"><NumInput value={r.depth} onChange={v => put('depth', v)} /></td>
                        <td className="py-1 text-right">
                          <button
                            type="button"
                            onClick={() => setT(rs => rs.filter((_, idx) => idx !== i))}
                            className="text-gray-500 hover:text-red-500 text-xs"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <button
                type="button"
                onClick={() => setEpRows('epTrenchRows')(rs => [...rs, EP_TRENCH_ROW()])}
                className="text-xs text-green-700 hover:underline mt-1"
              >
                + Add Trench
              </button>
            </div>
          </div>
          <EpTable
            title="Gas Pipe"
            rows={T.epGasPipeRows || []}
            setRows={setEpRows('epGasPipeRows')}
            arr={[]}
            cat={UTIL_CAT.gasPipe}
            qtyField="lf"
            qtyLabel="Linear Feet"
            unitLabel="LF"
            newRow={EP_GASPIPE_ROW}
            materialRows={materialRows}
            materialPrices={materialPrices}
            refreshAllRates={refreshAllRates}
            vendorsForCategory={vendorsForCategory}
          />
          <EpTable
            title="Electrical Pipe"
            rows={T.epLineRows || []}
            setRows={setEpRows('epLineRows')}
            arr={[]}
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
            title="Electrical Wiring"
            rows={T.epWireRows || []}
            setRows={setEpRows('epWireRows')}
            arr={[]}
            cat={UTIL_CAT.wire}
            qtyField="lf"
            qtyLabel="Linear Feet"
            unitLabel="LF"
            newRow={EP_WIRE_ROW}
            materialRows={materialRows}
            materialPrices={materialPrices}
            refreshAllRates={refreshAllRates}
            vendorsForCategory={vendorsForCategory}
          />
          <EpTable
            title="Electrical Fixtures"
            rows={T.epElecRows || []}
            setRows={setEpRows('epElecRows')}
            arr={[]}
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

      {/* ─── 5. Spillways (before Waterline Tile) ─── */}
      <div>
        <SectionHeader title="Spillways" />
        <div className="space-y-2">
          {T.spillways.map((sw, i) => {
            const spillOpts = poolStdOptions(materialRows, SPILLWAY_SUBCAT, sw.vendor || 'Standard')
            const spillVends = vendors.filter(v => poolSubVendorIds(materialRows, SPILLWAY_SUBCAT).includes(v.id))
            return (
            <div key={i} className="grid grid-cols-5 gap-2 items-end">
              <div>
                <Label text="Vendor" />
                <select
                  className="input text-sm py-1.5"
                  value={sw.vendor || 'Standard'}
                  onChange={e => updSpillway(i, 'vendor', e.target.value)}
                >
                  <option value="Standard">Standard</option>
                  {spillVends.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
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
                    value={sw.type || ''}
                    onChange={e => updSpillway(i, 'type', e.target.value)}
                  >
                    {!sw.type && <option value="">Select type</option>}
                    {sw.type && !spillOpts.some(o => (o.ref_key || o.label) === sw.type || o.label === sw.type) && (
                      <option value={sw.type}>{matName(sw.type)}</option>
                    )}
                    {spillOpts.map(o => (
                      <option key={o.value} value={o.ref_key || o.label}>{o.label}</option>
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
                <div className="flex items-center gap-1">
                  <NumInput value={sw.lf} onChange={v => updSpillway(i, 'lf', v)} className="flex-1 min-w-0" />
                  <button
                    type="button"
                    onClick={() => removeSpillway(i)}
                    className="text-gray-500 hover:text-red-500 text-xs leading-none shrink-0"
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
            onClick={addSpillway}
            className="text-xs text-green-700 hover:underline mt-1"
          >
            + Add Spillway
          </button>
        </div>
      </div>

      {/* ─── 5b. Water Features (sheer descents / waterfalls) ─── */}
      <div>
        <SectionHeader title="Water Features" />
        <div className="space-y-2">
          {T.waterFeatures.map((wf, i) => {
            const wfDefVendor = defaultSubVendor(materialRows, WATER_FEATURE_SUBCAT)
            const wfVendorSel = wf.vendor || wfDefVendor
            const wfTypeSel = wf.wfType || WATER_FEATURE_TYPES[0]
            const wfOpts = waterFeatureOptions(materialRows, wfVendorSel, wfTypeSel)
            const wfVends = vendors.filter(v => poolSubVendorIds(materialRows, WATER_FEATURE_SUBCAT).includes(v.id))
            // Per-row hrs + material for the end-of-row note (mirrors the calc).
            const wfItem = poolStdItem(materialRows, WATER_FEATURE_SUBCAT, wf.type, wfVendorSel)
            const wfQty = n(wf.qty)
            const wfRowHrs = wfQty * n(laborRates[wfItem?.calc_meta?.labor_rate])
            const wfRowMat = wfQty * (wfItem ? n(wfItem.unit_cost) : 0)
            return (
              <div key={i} className="grid grid-cols-5 gap-2 items-end">
                <div>
                  <Label text="Vendor" />
                  <select
                    className="input text-sm py-1.5"
                    value={wfVendorSel}
                    onChange={e => updWaterFeature(i, 'vendor', e.target.value)}
                  >
                    <option value="Standard">Standard</option>
                    {wfVends.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label text="Type" />
                  <select
                    className="input text-sm py-1.5 w-full"
                    value={wfTypeSel}
                    onChange={e => updWaterFeature(i, 'wfType', e.target.value)}
                  >
                    {WATER_FEATURE_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label text="Feature" />
                  <select
                    className="input text-sm py-1.5 w-full"
                    value={wf.type || ''}
                    onChange={e => updWaterFeature(i, 'type', e.target.value)}
                  >
                    {!wf.type && <option value="">Select feature</option>}
                    {wf.type && !wfOpts.some(o => (o.ref_key || o.label) === wf.type || o.label === wf.type) && (
                      <option value={wf.type}>{matName(wf.type)}</option>
                    )}
                    {wfOpts.map(o => (
                      <option key={o.value} value={o.ref_key || o.label}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label text="Qty" />
                  <NumInput value={wf.qty} onChange={v => updWaterFeature(i, 'qty', v)} />
                </div>
                <div>
                  <Label text="Est. Hrs / Materials" />
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-600 flex-1 min-w-0">
                      {wf.type ? `${wfRowHrs.toFixed(1)} hrs · ${fmt2(wfRowMat)} mat` : '—'}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeWaterFeature(i)}
                      className="text-gray-500 hover:text-red-500 text-xs leading-none shrink-0"
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
            onClick={addWaterFeature}
            className="text-xs text-green-700 hover:underline mt-1"
          >
            + Add Water Feature
          </button>
        </div>
      </div>

      {/* ─── 4. Waterline Tile ─── */}
      <div>
        <SectionHeader title="Waterline Tile" />
        <div className="space-y-3">
          {[
            ['Pool', T.pool],
            ['Spa', T.spa],
            ['Cover Vault', T.vault],
            ['Infinity Edge Basin', T.basin],
            ['Zero Edge Trough', T.trough],
          ]
            .filter(([, s]) => s && s.enabled)
            .map(([k]) => {
              const t = T.tile[k] || defaultTileStruct()
              return (
                <div key={k} className="border border-gray-200 rounded-lg p-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <Label text="Waterline LF" />
                      <NumInput
                        value={t.lf}
                        onChange={v => upd('tile', { ...T.tile, [k]: { ...t, lf: v } })}
                      />
                    </div>
                    <div>
                      <Label text="Vendor" />
                      <select
                        className="input text-sm py-1.5"
                        value={t.vendor || 'Standard'}
                        onChange={e =>
                          upd('tile', {
                            ...T.tile,
                            [k]: { ...t, vendor: e.target.value, installType: '' },
                          })
                        }
                      >
                        <option value="Standard">Standard</option>
                        {vendors
                          .filter(v => poolSubVendorIds(materialRows, TILE_SUBCAT).includes(v.id))
                          .map(v => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                          ))}
                      </select>
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
                          {!t.installType && <option value="">Select type</option>}
                          {t.installType &&
                            !poolStdOptions(materialRows, TILE_SUBCAT, t.vendor || 'Standard').some(o => (o.ref_key || o.label) === t.installType || o.label === t.installType) && (
                              <option value={t.installType}>{matName(t.installType)}</option>
                            )}
                          {poolStdOptions(materialRows, TILE_SUBCAT, t.vendor || 'Standard').map(o => (
                            <option key={o.value} value={o.ref_key || o.label}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <Label text="Material" sub="$ per Sq Ft" />
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
                          <option key={p}>${p} per Sq Ft</option>
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
                  {n(t.lf) > 0 &&
                    (() => {
                      const rate = n(
                        laborRates[poolStdItem(materialRows, TILE_SUBCAT, t.installType, t.vendor || 'Standard')?.calc_meta?.labor_rate]
                      )
                      return (
                        <p className="text-xs text-gray-400 mt-1">
                          {rate.toFixed(3)} hrs/LF → {(n(t.lf) * rate).toFixed(1)} hrs
                        </p>
                      )
                    })()}
                </div>
              )
            })}
        </div>
      </div>


      {/* ─── 7. Raised Surfaces (above Coping) ─── */}
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
                    value={rs.matType || ''}
                    onChange={e => updRaised(i, 'matType', e.target.value)}
                  >
                    {!rs.matType && <option value="">Select material</option>}
                    {rs.matType && !poolStdOptions(materialRows, RAISED_SUBCAT).some(o => (o.ref_key || o.label) === rs.matType || o.label === rs.matType) && (
                      <option value={rs.matType}>{matName(rs.matType)}</option>
                    )}
                    {poolStdOptions(materialRows, RAISED_SUBCAT).map(o => (
                      <option key={o.value} value={o.ref_key || o.label}>{o.label}</option>
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
                <div className="flex items-center gap-1">
                  <NumInput
                    value={rs.corners}
                    onChange={v => updRaised(i, 'corners', v)}
                    placeholder="0"
                    className="w-1/2 min-w-0"
                  />
                  <button
                    type="button"
                    onClick={() => removeRaised(i)}
                    className="text-gray-500 hover:text-red-500 text-xs leading-none shrink-0"
                  >
                    ✕
                  </button>
                </div>
              </div>
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

      {/* ─── 6. Coping ─── */}
      <div>
        <SectionHeader title="Coping" />
        <div className="space-y-2">
          {T.copingRows.map((cr, i) => {
            const copingOpts = copingOptions(materialRows, cr.vendor || 'Standard')
            const copingVends = vendors.filter(v => copingVendorIds(materialRows).includes(v.id))
            return (
            <div key={i} className="grid grid-cols-7 gap-2 items-end">
              <div>
                <Label text="Vendor" />
                <select
                  className="input text-sm py-1.5"
                  value={cr.vendor || 'Standard'}
                  onChange={e => updCoping(i, 'vendor', e.target.value)}
                >
                  <option value="Standard">Standard</option>
                  {copingVends.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
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
                    value={cr.type || ''}
                    onChange={e => updCoping(i, 'type', e.target.value)}
                  >
                    {!cr.type && <option value="">Select type</option>}
                    {cr.type && !copingOpts.some(o => (o.ref_key || o.label) === cr.type || o.label === cr.type) && (
                      <option value={cr.type}>{matName(cr.type)}</option>
                    )}
                    {copingOpts.map(o => (
                      <option key={o.value} value={o.ref_key || o.label}>{o.label}</option>
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
                className="text-gray-500 hover:text-red-500 text-xs pb-1"
              >
                ✕
              </button>
            </div>
          )})}
          <button
            type="button"
            onClick={addCoping}
            className="text-xs text-green-700 hover:underline mt-1"
          >
            + Add Coping Row
          </button>
        </div>
      </div>

      {/* ─── 9. Pool Equipment (after Coping) — "(Sub)" only on the Sub tab ─── */}
      <div>
        <SectionHeader title={`Pool Equipment${isSub ? ' (Sub)' : ''}`} />
        <div className="space-y-2">
          {T.equipment.map((eq, i) => {
            const vsel = eq.vendor || defaultEquipVendor(materialRows)
            const cats = equipCategories(materialRows, vsel)
            const models = equipModels(materialRows, vsel, eq.category)
            const equipVends = vendors.filter(v => equipVendorIds(materialRows).includes(v.id))
            return (
              <div key={i} className="grid grid-cols-8 gap-2 items-end">
                <div className="col-span-2">
                  <Label text="Vendor" />
                  <select
                    className="input text-sm py-1.5"
                    value={vsel}
                    onChange={e => updEquip(i, 'vendor', e.target.value)}
                  >
                    {equipVends.length === 0 && <option value={vsel}>Standard</option>}
                    {equipVends.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <Label text="Category" />
                  <select
                    className="input text-sm py-1.5"
                    value={eq.category}
                    onChange={e => updEquip(i, 'category', e.target.value)}
                  >
                    {eq.category && !cats.includes(eq.category) && (
                      <option value={eq.category}>{eq.category}</option>
                    )}
                    {cats.map(c => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <Label text="Model" />
                  <div className="flex items-center gap-1">
                    <select
                      className="input text-sm py-1.5 flex-1 min-w-0"
                      value={eq.model || ''}
                      onChange={e => updEquip(i, 'model', e.target.value)}
                    >
                      {!eq.model && <option value="">Select model</option>}
                      {eq.model && !models.some(m => (m.ref_key || m.label) === eq.model || m.label === eq.model) && (
                        <option value={eq.model}>{matName(eq.model)}</option>
                      )}
                      {models.map(m => (
                        <option key={m.value} value={m.ref_key || m.label}>
                          {m.label}
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
                      className="text-gray-500 hover:text-red-500 text-xs leading-none shrink-0"
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


      {/* ─── 8. Interior Finish — Sub tab only ─── */}
      {isSub && (
      <div>
        <SectionHeader title="Interior Finish (Sub)" />
        <div className="space-y-3">
          {[
            ['Pool', T.pool],
            ['Spa', T.spa],
            ['Cover Vault', T.vault],
            ['Infinity Edge Basin', T.basin],
            ['Zero Edge Trough', T.trough],
          ]
            .filter(([, s]) => s && s.enabled)
            .map(([k, s]) => {
              const fin = T.interiorFinish[k] || defaultInteriorStruct()
              const priceSF = n(subRates[`Interior Finish - ${fin.type}`])
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
                          value={fin.type || ''}
                          onChange={e =>
                            upd('interiorFinish', {
                              ...T.interiorFinish,
                              [k]: { ...fin, type: e.target.value },
                            })
                          }
                        >
                          {!fin.type && <option value="">Select finish</option>}
                          {fin.type && !INTERIOR_TYPES.includes(fin.type) && (
                            <option value={fin.type}>{fin.type}</option>
                          )}
                          {INTERIOR_TYPES.map(t => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <Label text="Auto Sub" sub={`$${priceSF} per Sq Ft`} />
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


      {/* ─── 10. Plumbing (Sub) — Sub tab only ─── */}
      {isSub && (
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
                {PLUMBING_BASE_TYPES.map(k => (
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
                &gt;20ft from equipment (+${n(subRates['Plumbing Over 20ft Add'])})
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
                Remodel (+${n(subRates['Plumbing Remodel Add'])})
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
              {n(subRates[`Plumbing ${T.plumbing.baseType}`]).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
      )}




      {/* ─── 12. Manual Entry ─── */}
      <div>
        <SectionHeader title="Manual Entry" />
        <div className="space-y-2">
          {T.manualRows.map((r, i) => (
            <div
              key={i}
              className={`grid ${isSub ? 'grid-cols-2' : 'grid-cols-3'} gap-2 items-end`}
            >
              <div>
                {i === 0 && <Label text="Description" center />}
                <input
                  className="input text-sm py-1.5 w-full"
                  placeholder="Description"
                  value={r.label}
                  onChange={e => updManual(i, 'label', e.target.value)}
                />
              </div>
              {isSub ? (
                <div>
                  {i === 0 && <Label text="Cost $" center />}
                  <div className="flex items-center gap-1">
                    <NumInput value={r.subCost} onChange={v => updManual(i, 'subCost', v)} className="text-center flex-1" />
                    {T.manualRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeManual(i)}
                        className="text-gray-300 hover:text-red-500 text-xs px-1"
                        title="Remove line"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    {i === 0 && <Label text="Hours" center />}
                    <NumInput value={r.hours} onChange={v => updManual(i, 'hours', v)} className="text-center" />
                  </div>
                  <div>
                    {i === 0 && <Label text="Materials $" center />}
                    <div className="flex items-center gap-1">
                      <NumInput value={r.materials} onChange={v => updManual(i, 'materials', v)} className="text-center flex-1" />
                      {T.manualRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeManual(i)}
                          className="text-gray-300 hover:text-red-500 text-xs px-1"
                          title="Remove line"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
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
