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
import { catalogItemFor, catalogOptions, fetchModuleCatalog, fetchStandardRateMap } from '../../lib/materialCatalog'

const CATALOG_OPTS = { standardRows: 'exclude', stripPrefix: true }

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

// ── Spillway types — labor ('Spillway - <type>') + material ('Spillway <type>')
const SPILLWAY_TYPES = ['TILE', 'FLAGSTONE']

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

// ── Excavation equipment — CY/hr net rate lives in labor_rates keyed by the
//    EXCAVATION_LABOR_NAME below (read live; no hardcoded rate). 'Sub Bobcat /
//    Mini Bob' is a sub cost, not a labor rate (null name).
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
// Steel = rebar picked from the shared Basic Materials → Reinforcement rows
// ('Rebar #3'…'Rebar #8', priced per Ln Ft). In-House install labor rides on the
// Pool 'Steel - Install' labor rate (per Ln Ft; seed empty). Rebar LF = shell SF ×
// a per-row LF/SF factor.
const BASIC_CATEGORY = 'Basic Materials'
const REINFORCEMENT_SUBCAT = 'Reinforcement'
const POOL_STEEL_LABOR = 'Steel - Install'
function poolStdOptions(materialRows, subcat, vendorSel = 'Standard') {
  return catalogOptions(materialRows, subcat, vendorSel, {
    standardRows: 'null-vendor',
    stripPrefix: true,
    category: 'Pool',
  })
}
function poolStdItem(materialRows, subcat, key, vendorSel = 'Standard') {
  return catalogItemFor(materialRows, subcat, vendorSel, key, {
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
// Vendor-first Type list: Standard/unset → null-vendor Items merged with built-ins;
// a real vendor → ONLY that vendor's Items (built-ins fall away).
function mergedUtilTypes(cat, builtInArr, materialRows, vendorSel = 'Standard') {
  const isStd = !vendorSel || vendorSel === 'Standard' || vendorSel === 'auto'
  // Catalog-only: options come solely from the catalog (single source of truth).
  // Standard/unset → the null-vendor (Standard) catalog items; a real vendor →
  // only that vendor's items. The built-in array is consulted ONLY for the labor
  // db-name / labor fallback of a matching item, never to inject option rows.
  const catRows = catalogOptions(materialRows, cat, isStd ? 'Standard' : vendorSel, { standardRows: 'null-vendor', stripPrefix: true })
  if (!catRows.length) return []
  return catRows.map(o => {
    const bi = builtInArr.find(b => b.dbName === o.row.name || b.label === o.label)
    return {
      label: o.label,
      dbName: o.row.name,
      // Catalog unit_cost for this Standard/vendor option (DB-sourced, not a
      // hardcoded fallback) — used as the material price when the standard rate
      // map has no entry for the item.
      matCatalog: n(o.row.unit_cost),
      // Labor pointer = the Item's own calc_meta.labor_rate (independent
      // labor_rates row). No synthesized "<name> - Labor Rate", no built-in map,
      // no fallback — unset ⇒ the row is flagged for the user to fix.
      laborDbName: o.row.calc_meta?.labor_rate || null,
      fromMaster: !bi,
    }
  })
}
function resolveUtilRow(cat, row, houseArr, materialRows, mp) {
  const vsel = row.vendor && row.vendor !== 'auto' ? row.vendor : 'Standard'
  const merged = mergedUtilTypes(cat, houseArr, materialRows, vsel)
  const builtIn = merged.find(o => o.label === row.type) || merged[0]
  let matDbName = builtIn?.dbName
  let matCatalog = builtIn?.matCatalog ?? 0
  const vrow = catalogItemFor(materialRows, cat, vsel, builtIn?.label, {
    ...CATALOG_OPTS,
    fallbackFirst: false,
  })
  if (vrow) {
    matDbName = vrow.name
    matCatalog = n(vrow.unit_cost)
  }
  // Labor pointer = the Item's calc_meta.labor_rate, resolved live via mp. No
  // synthesized name, no built-in map, no fallback — unset ⇒ laborVal 0 and the
  // row is flagged for the user to fix.
  const laborName = vrow?.calc_meta?.labor_rate || builtIn?.laborDbName || null
  const laborVal = n(mp[laborName])
  // Selected vendor's catalog row wins; else the Standard name-map (mp) price,
  // else the item's own catalog unit_cost (both DB-sourced).
  const matCost = vrow ? n(vrow.unit_cost) : (mp[matDbName] ?? matCatalog)
  const matOpt = { label: builtIn?.label, dbName: matDbName, matCatalog }
  return { opts: merged, matOpt, matCost, laborVal, laborName, laborBuiltIn: builtIn }
}
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
                        {row.type && !opts.some(o => o.label === row.type) && (
                          <option value={row.type}>{row.type}</option>
                        )}
                        {opts.map(o => (
                          <option key={o.label} value={o.label}>
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
  vendor: 'Standard',
  installType: '6" Squares',
  matPricePerSF: '2.50',
  waterproof: false,
})
const defaultInteriorStruct = () => ({ type: '', subCost: '' })
const newSpillway = () => ({ struct: 'Pool', vendor: 'Standard', type: '', qty: '1', lf: '' })
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
      mode: 'In-House',
      equipment: 'IH - Bobcat 72"',
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
    copingRows: data.copingRows ?? [newCopingRow()],
    raisedSurfaces: data.raisedSurfaces ?? [],
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
    epGasPipeRows: data.epGasPipeRows ?? [EP_GASPIPE_ROW(), EP_GASPIPE_ROW()],
    epLineRows: data.epLineRows ?? [EP_LINE_ROW(), EP_LINE_ROW()],
    epWireRows: data.epWireRows ?? [EP_WIRE_ROW(), EP_WIRE_ROW()],
    epElecRows: data.epElecRows ?? [EP_ELEC_ROW(), EP_ELEC_ROW()],
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
function calcPool(state, materialPrices, laborRates, subRates = {}, walkAccess = null, materialRows = []) {
  // Subcontractor rates: a one-off adjustment saved on THIS estimate
  // (state.rateOverrides) takes precedence over the master rate.
  subRates = { ...(subRates || {}) }
  Object.entries(state.rateOverrides || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && Number.isFinite(Number(v))) subRates[k] = Number(v)
  })

  const _pace = parseFloat(walkAccess?.paceLfPerMin) || 0
  const {
    pool,
    spa,
    basin,
    vault,
    trough,
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
    { key: 'Cover Vault', s: vault, tileKey: 'Cover Vault', iKey: 'Cover Vault' },
    { key: 'Infinity Edge Basin', s: basin, tileKey: 'Infinity Edge Basin', iKey: 'Infinity Edge Basin' },
    { key: 'Zero Edge Trough', s: trough || {}, tileKey: 'Zero Edge Trough', iKey: 'Zero Edge Trough' },
  ].filter(x => x.s.enabled)

  // ─ Volume helpers ─
  // Tunable estimating coefficients — table-driven via the merged rate map
  // (misc_rates), read live by name with NO hardcoded fallback (seeded by
  // supabase-pool-fallbacks-seed.sql). The fixed 27 cu-ft/cu-yd conversions
  // below are math-invariant and stay inline.
  const avgDepthRatio = n(materialPrices['Pool Avg Depth Ratio'])
  const excavSwell = n(materialPrices['Pool Excavation Swell Factor'])
  const shotShellFt = n(materialPrices['Pool Shotcrete Shell Thickness'])
  const shotSwell = n(materialPrices['Pool Shotcrete Swell Factor'])
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
  const isSubExcav = excavation.mode === 'Sub'
  // CY/hr rate read live from labor_rates['Excavation - ...'] — no fallback.
  const excavLaborName = EXCAVATION_LABOR_NAME[excavation.equipment]
  const equipRate = n(excavLaborName && laborRates[excavLaborName])
  const excavHrs = !isSubExcav ? totalExcavCY * equipRate : 0 // rate is hrs per Cu Yd
  // Sub cost: auto-fill from the chosen sub's stored rate (per-CY rates are
  // multiplied by dug volume; flat/lump rates used as-is), overridable by a
  // manually entered subCost on this estimate.
  const excavAutoSub = /yd/i.test(excavation.subRateUnit || '')
    ? n(excavation.subRate) * totalExcavCY
    : n(excavation.subRate)
  const excavSub = isSubExcav ? (n(excavation.subCost) || excavAutoSub) : 0

  // Shotcrete / Interior Finish / Plumbing / Steel auto-subs apply on the Sub
  // tab ONLY. On the In-House tab their AUTO amount is not charged (done
  // in-house or entered manually). A manual sub override is still honored on
  // either tab.
  const isSubTab = state.subType === 'Subcontractor'

  // ─ Shotcrete sub (rates from subcontractor_rates, category='Pool') ─
  const shotMatCY = n(subRates['Shotcrete Material'])
  const shotLabCY = n(subRates['Shotcrete Labor'])
  const shotMin = n(subRates['Shotcrete Minimum Labor'])
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
  const tileSfPerLf = n(materialPrices['Pool Tile SF per LF'])
  activeStructs.forEach(({ tileKey }) => {
    const t = tile[tileKey] || {}
    const lf = n(t.lf)
    if (!lf) return
    // Install type is a master material rates item; labor rides on its calc_meta
    // pointer. The material $/SF stays a per-row figure (tile product is job-specific).
    const item = poolStdItem(materialRows, TILE_SUBCAT, t.installType, t.vendor || 'Standard')
    const installRate = n(laborRates[item?.calc_meta?.labor_rate])
    if (t.installType && installRate <= 0) laborUnset.push(t.installType)
    const matPriceSF = n(t.matPricePerSF)
    tileHrs += lf * installRate
    tileMat += lf * tileSfPerLf * matPriceSF
  })

  // ─ Spillways ─
  let spillwayHrs = 0,
    spillwayMat = 0
  spillways.forEach(sw => {
    if (!sw.type) return
    const qty = n(sw.qty)
    const lf = n(sw.lf)
    if (!qty || !lf) return
    const totalLF = qty * lf
    // Spillway is a master material rates item: material from the item price, labor
    // from its calc_meta pointer ('Spillway - <type>'). No name-keyed lookups.
    const item = poolStdItem(materialRows, SPILLWAY_SUBCAT, sw.type, sw.vendor || 'Standard')
    const matRate = item ? n(item.unit_cost) : 0
    const labRate = n(laborRates[item?.calc_meta?.labor_rate])
    if (labRate <= 0) laborUnset.push(sw.type)
    spillwayHrs += totalLF * labRate
    spillwayMat += totalLF * matRate
  })

  // ─ Coping ─
  let copingHrs = 0,
    copingMat = 0
  copingRows.forEach(cr => {
    if (!cr.type) return
    const lf = n(cr.lf)
    if (!lf) return
    const sided = cr.sided === 'double' ? 2 : 1
    // Coping is a master material rates item: material from the picked item's price
    // (Standard, or Bellecrete for Precast Concrete), labor from its calc_meta
    // pointer ('Coping - <type>'). No name-keyed misc/labor lookup, no fallback.
    const item = catalogItemFor(materialRows, COPING_SUBCAT, cr.vendor || 'Standard', cr.type, {
      category: 'Pool',
      stripPrefix: true,
      fallbackFirst: false,
    })
    const matRate = item ? n(item.unit_cost) : 0
    const labRate = n(laborRates[item?.calc_meta?.labor_rate])
    if (labRate <= 0) laborUnset.push(cr.type)
    copingHrs += lf * sided * labRate
    copingMat += lf * sided * matRate
  })

  // ─ Raised Surfaces ─
  let raisedHrs = 0,
    raisedMat = 0
  // Per-corner labor add and per-corner material factor — table-driven coefficients.
  const raisedCornerHrs = n(materialPrices['Pool Raised Corner Labor'])
  const raisedCornerMatFactor = n(materialPrices['Pool Raised Corner Mat Factor'])
  raisedSurfaces.forEach(rs => {
    if (!rs.matType) return
    const sqft = n(rs.sqft)
    const corners = n(rs.corners)
    if (!sqft) return
    // Raised is a master material rates item: material from the item price, labor
    // from its calc_meta pointer (tile sizes share the waterline 'Tile - <size>'
    // rate). No name-keyed lookups, no fallback.
    const item = poolStdItem(materialRows, RAISED_SUBCAT, rs.matType)
    const matRate = item ? n(item.unit_cost) : 0
    const labRate = n(laborRates[item?.calc_meta?.labor_rate])
    if (labRate <= 0) laborUnset.push(rs.matType)
    const curveMult = 1 + n(rs.curvePct) / 100
    raisedHrs += sqft * labRate * curveMult + corners * raisedCornerHrs
    raisedMat += sqft * matRate + corners * (matRate * raisedCornerMatFactor)
  })

  // ─ Interior Finish (rates from subcontractor_rates, category='Pool') ─
  let interiorSub = 0
  activeStructs.forEach(({ iKey, s }) => {
    const fin = interiorFinish[iKey] || {}
    const manSub = n(fin.subCost)
    if (manSub > 0) {
      interiorSub += manSub
    } else if (isSubTab && fin.type) {
      const sf = n(s.waterSF)
      const priceSF = n(subRates[`Interior Finish - ${fin.type}`])
      interiorSub += sf * priceSF
    }
  })

  // ─ Pool Equipment ─
  // Each equipment row has a material rate (unit cost — sub charges) and an
  // optional labor rate (in-house install hours per unit, defaults to 0).
  let equipmentSub = 0,
    equipmentHrs = 0
  const equipDefVendor = defaultEquipVendor(materialRows)
  equipment.forEach(eq => {
    const qty = n(eq.qty)
    if (!qty) return
    // Resolve the picked model to its master material rates item (Heritage Pools):
    // price from the item, install labor from the item's calc_meta.labor_rate.
    const item = catalogItemFor(materialRows, POOL_EQUIP_SUBCAT, eq.vendor || equipDefVendor, eq.model, {
      category: 'Pool',
      stripPrefix: true,
      fallbackFirst: false,
    })
    // Manual Unit $ override wins; otherwise the item's price. No name-keyed map.
    const unitCost = n(eq.unitCost) || (item ? n(item.unit_cost) : 0)
    // Equipment install labor is optional (many pieces have none), so a 0 rate is
    // not flagged — but when a rate exists it rides on the item's calc_meta pointer.
    const labHrsEa = n(laborRates[item?.calc_meta?.labor_rate])
    equipmentSub += qty * unitCost
    equipmentHrs += qty * labHrsEa
  })

  // ─ Plumbing (rates from subcontractor_rates, category='Pool') ─
  const plumbBaseRate = n(subRates[`Plumbing ${plumbing.baseType}`])
  let plumbSub
  if (hasOverride(plumbing.manualSubCost)) {
    plumbSub = n(plumbing.manualSubCost)
  } else if (isSubTab && (n(pool.perimLF) > 0 || spa.enabled)) {
    // Only auto-charge the plumbing base when there's actual pool/spa scope,
    // and only on the Sub tab (In-House does plumbing in-house).
    plumbSub =
      plumbBaseRate +
      (plumbing.over20ft ? n(subRates['Plumbing Over 20ft Add']) : 0) +
      (plumbing.remodel ? n(subRates['Plumbing Remodel Add']) : 0) +
      n(plumbing.extraLights) * n(subRates['Plumbing Extra Light']) +
      n(plumbing.sheerDescents) * n(subRates['Plumbing Sheer Descent'])
  } else {
    plumbSub = 0
  }

  // ─ Steel / Rebar ─
  // Rebar quantity = shell SF × (LF per SF factor). In-House picks a rebar size
  // from Basic Materials → Reinforcement (priced per Ln Ft) + the 'Steel - Install'
  // labor rate (per Ln Ft). The Sub tab uses a flat sub cost (manual, or the legacy
  // perimeter × 'Steel Per LF' auto-sub).
  const steelLF = n(steel.sf) * n(steel.lfPerSf)
  let steelMat = 0,
    steelHrs = 0
  if (!isSubTab && steelLF > 0) {
    const rebarItem = catalogItemFor(materialRows, REINFORCEMENT_SUBCAT, steel.vendor || 'Standard', steel.rebarSize, {
      category: BASIC_CATEGORY,
      stripPrefix: true,
      fallbackFirst: false,
    })
    steelMat = steelLF * (rebarItem ? n(rebarItem.unit_cost) : 0)
    steelHrs = steelLF * n(laborRates[POOL_STEEL_LABOR])
  }
  let steelSub
  if (hasOverride(steel.manualSubCost)) {
    steelSub = n(steel.manualSubCost)
  } else {
    // Legacy auto-sub: perimeter + spa on the Sub tab only.
    const poolPerim = n(pool.perimLF)
    const steelPerLF = n(subRates['Steel Per LF'])
    const steelSpaBonus = n(subRates['Steel Spa Bonus'])
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

  // ── Utilities (Trenching / Gas Pipe / Electrical Pipe / Electrical Wiring /
  //    Electrical Fixtures) — mirrors the Utilities module's mapping ────────────
  let epHrs = 0
  let epMat = 0
  // Items whose picked Type has no labor rate set (calc_meta.labor_rate unset or
  // resolves to 0). Surfaced as a prompt — never a fallback.
  const laborUnset = []
  // Trenching: hrs = cf × (hrs per Cu Ft) for the chosen method (Trench / Hand).
  ;(state.epTrenchRows || []).forEach(r => {
    const lf = n(r.lf),
      w = n(r.width),
      d = n(r.depth)
    if (lf > 0 && w > 0 && d > 0) {
      const cf = lf * (w / 12) * (d / 12)
      epHrs += cf * n(materialPrices[POOL_TRENCH_LABOR[r.equipment]])
    }
  })
  // Per-LF pipe/wire sections (Gas Pipe, Electrical Pipe, Electrical Wiring).
  ;[
    [state.epGasPipeRows, UTIL_CAT.gasPipe],
    [state.epLineRows, UTIL_CAT.line],
    [state.epWireRows, UTIL_CAT.wire],
  ].forEach(([rows, cat]) => {
    ;(rows || []).forEach(r => {
      if (!r.type) return
      const lf = n(r.lf)
      if (lf <= 0) return
      const { matCost, laborVal } = resolveUtilRow(cat, r, [], materialRows, materialPrices)
      if (laborVal <= 0) laborUnset.push(r.type)
      epMat += lf * matCost
      epHrs += lf * laborVal
    })
  })
  // Per-Each Electrical Fixtures.
  ;(state.epElecRows || []).forEach(r => {
    if (!r.type) return
    const qty = n(r.qty)
    if (qty <= 0) return
    const { matCost, laborVal } = resolveUtilRow(UTIL_CAT.elec, r, [], materialRows, materialPrices)
    if (laborVal <= 0) laborUnset.push(r.type)
    epMat += qty * matCost
    epHrs += qty * laborVal
  })

  // ── In-House Plumbing (pool plumbing done in-house) ─────────────────────────
  // Contributes in-house labor hours + materials only (never a sub cost). The
  // section is shown on the In-House tab only, so gate on !isSubTab to be safe:
  // its fields stay blank on the Sub tab and the DB default must not silently
  // add cost there. A typed value overrides the DB default; a typed 0 => 0.
  const plumbIH = state.plumbingIH || {}
  const plumbHrsDefault = n(laborRates['Pool Plumbing - Base Hours'])
  const plumbMatDefault = n(materialPrices['Pool Plumbing - Materials'])
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
    steelHrs +
    manHrs +
    plumbHrsIH +
    (parseFloat(state.hoursAdj) || 0)
  const walkHrs = calcWalkAccessLabor(_preWalkHrs, state.distanceLF, { paceLfPerMin: _pace })
  const totalHrs = _preWalkHrs + walkHrs
  const manDays = totalHrs / 8
  const totalMat = tileMat + spillwayMat + copingMat + raisedMat + epMat + steelMat + manMat + plumbMatIH
  // Pool's genuine sub trades (excavation / shotcrete / interior / equipment /
  // plumbing / steel / manual-sub). These are sub costs on either tab.
  const subTradeCost =
    excavSub + shotcreteSub + interiorSub + equipmentSub + plumbSub + steelSub + manSub
  const laborCost = totalHrs * lrph
  const burden = laborCost * n(laborBurdenPct)
  // On the Sub tab every itemized cost — the in-house-style material + labor +
  // burden (waterline tile, coping, spillways, raised surfaces, E&P, manual) AND
  // the pool sub trades — IS the subcontractor cost. Roll it all into subCost so
  // GpmdBar's 'sub' view (total = subCost + subGp + commission) captures the full
  // scope instead of silently dropping the in-house buckets it ignores. The
  // in-house GP model applies only to the In-House tab. Matches the
  // OutdoorKitchen reference; sub-trade computation above is untouched.
  const subMarkup = n(state.subGpMarkupRate)
  const commissionRateVal = n(state.commissionRate)
  let gp, subCost, subGp, commission, price
  if (isSubTab) {
    gp = 0
    subCost = totalMat + laborCost + burden + subTradeCost
    subGp = subCost * subMarkup
    commission = subGp * commissionRateVal
    price = subCost + subGp + commission
  } else {
    gp = manDays * gpmdVal
    subCost = subTradeCost
    subGp = 0
    commission = gp * commissionRateVal
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
    excavAutoSub,
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
    steelMat,
    steelHrs,
    steelLF,
    plumbHrsIH, // effective in-house pool-plumbing hours (default or override)
    plumbMatIH, // effective in-house pool-plumbing materials $
    equipRate, // resolved excavation CY/hr so the icon can show + edit it
    laborUnset: Array.from(new Set(laborUnset.filter(Boolean))),
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
  const [subRates, setSubRates] = useState({})
  const [materialRows, setMaterialRows] = useState([])
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
    const [mp, labRes, subRes, catRows, venRes, subCoRes] = await Promise.all([
      fetchStandardRateMap(['Pool', 'Utilities']),
      supabase.from('labor_rates').select('name,rate').in('category', ['Pool', 'Utilities', 'Finishes']),
      supabase.from('subcontractor_rates').select('company_name,trade,rate,unit').eq('category', 'Pool'),
      fetchModuleCatalog(['Utilities', 'Pool', 'Basic Materials']),
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
        category: 'Pool',
        stripPrefix: true,
        fallbackFirst: false,
      })
      arr[i].unitCost = it && it.unit_cost != null ? String(it.unit_cost) : ''
    }
    if (key === 'vendor') {
      const cats = equipCategories(materialRows, val)
      arr[i].category = cats[0] || ''
      arr[i].model = equipModels(materialRows, val, arr[i].category)[0]?.label || ''
      autofill(arr[i].model)
    } else if (key === 'category') {
      arr[i].model = equipModels(materialRows, vsel, val)[0]?.label || ''
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
  const poolRateList = [
    {
      group: 'Excavation',
      items: EXCAVATION_TYPES.filter(t => EXCAVATION_LABOR_NAME[t]).map(t => ({
        label: EXCAVATION_LABOR_NAME[t],
        table: 'labor_rates',
        name: EXCAVATION_LABOR_NAME[t],
        category: 'Pool',
        mode: 'coefficient',
        unitLabel: 'Cu Yd per hr',
        value: laborRates[EXCAVATION_LABOR_NAME[t]],
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
          unitLabel: 'Cu Yd',
          value: subRates['Shotcrete Material'],
        },
        {
          label: 'Shotcrete Labor',
          table: 'subcontractor_rates',
          name: 'Shotcrete Labor',
          category: 'Pool',
          mode: 'currency',
          unitLabel: 'Cu Yd',
          value: subRates['Shotcrete Labor'],
          section: 'labor',
        },
        {
          label: 'Shotcrete Minimum Labor',
          table: 'subcontractor_rates',
          name: 'Shotcrete Minimum Labor',
          category: 'Pool',
          mode: 'currency',
          unitLabel: 'flat',
          value: subRates['Shotcrete Minimum Labor'],
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
        unitLabel: 'hrs per Ln Ft',
        value: laborRates[`Tile - ${t}`],
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
          unitLabel: 'hrs per Ln Ft',
          value: laborRates[`Spillway - ${t}`],
        })),
        ...SPILLWAY_TYPES.map(t => ({
          label: `Spillway Material - ${t}`,
          table: 'misc_rates',
          name: `Spillway ${t}`,
          category: 'Pool',
          mode: 'currency',
          unitLabel: 'Ln Ft',
          value: materialPrices[`Spillway ${t}`],
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
          unitLabel: 'hrs per Ln Ft',
          value: laborRates[`Coping - ${t}`],
        })),
        ...COPING_TYPES.map(t => ({
          label: `Coping Material - ${t}`,
          table: 'misc_rates',
          name: `Coping Mat - ${t}`,
          category: 'Pool',
          mode: 'currency',
          unitLabel: 'Ln Ft',
          value: materialPrices[`Coping Mat - ${t}`],
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
          unitLabel: 'hrs per Sq Ft',
          value: laborRates[`Raised - ${t}`],
        })),
        ...RAISED_SURFACE_TYPES.map(t => ({
          label: `Raised Material - ${t}`,
          table: 'misc_rates',
          name: `Raised Mat - ${t}`,
          category: 'Pool',
          mode: 'currency',
          unitLabel: 'Sq Ft',
          value: materialPrices[`Raised Mat - ${t}`],
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
        unitLabel: 'Sq Ft',
        value: subRates[`Interior Finish - ${t}`],
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
          unitLabel: 'hrs per Each',
          value: laborRates[`Equip Labor - ${model}`],
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
            unitLabel: 'Each',
            value: materialPrices[m.model],
          })),
      ],
    },
    {
      group: 'Plumbing (Sub)',
      items: [
        ...PLUMBING_BASE_TYPES.map(k => ({
          label: `Plumbing ${k}`,
          table: 'subcontractor_rates',
          name: `Plumbing ${k}`,
          category: 'Pool',
          mode: 'currency',
          unitLabel: 'flat',
          value: subRates[`Plumbing ${k}`],
        })),
        {
          label: 'Plumbing Extra Light',
          table: 'subcontractor_rates',
          name: 'Plumbing Extra Light',
          category: 'Pool',
          mode: 'currency',
          unitLabel: 'Each',
          value: subRates['Plumbing Extra Light'],
        },
        {
          label: 'Plumbing Sheer Descent',
          table: 'subcontractor_rates',
          name: 'Plumbing Sheer Descent',
          category: 'Pool',
          mode: 'currency',
          unitLabel: 'Each',
          value: subRates['Plumbing Sheer Descent'],
        },
        {
          label: 'Plumbing Over 20ft Add',
          table: 'subcontractor_rates',
          name: 'Plumbing Over 20ft Add',
          category: 'Pool',
          mode: 'currency',
          unitLabel: 'flat',
          value: subRates['Plumbing Over 20ft Add'],
        },
        {
          label: 'Plumbing Remodel Add',
          table: 'subcontractor_rates',
          name: 'Plumbing Remodel Add',
          category: 'Pool',
          mode: 'currency',
          unitLabel: 'flat',
          value: subRates['Plumbing Remodel Add'],
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
          unitLabel: 'Ln Ft',
          value: subRates['Steel Per LF'],
        },
        {
          label: 'Steel Spa Bonus',
          table: 'subcontractor_rates',
          name: 'Steel Spa Bonus',
          category: 'Pool',
          mode: 'currency',
          unitLabel: 'flat',
          value: subRates['Steel Spa Bonus'],
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
          unitLabel: 'hrs per Ln Ft',
          value: materialPrices[t.laborDbName],
        })),
        ...GAS_TYPE_ARR.map(t => ({
          label: t.laborDbName,
          table: 'labor_rates',
          name: t.laborDbName,
          category: 'Utilities',
          mode: 'coefficient',
          unitLabel: 'hrs per Each',
          value: materialPrices[t.laborDbName],
        })),
        ...ELEC_TYPE_ARR.map(t => ({
          label: t.laborDbName,
          table: 'labor_rates',
          name: t.laborDbName,
          category: 'Utilities',
          mode: 'coefficient',
          unitLabel: 'hrs per Each',
          value: materialPrices[t.laborDbName],
        })),
        // Material prices (per vendor, Standard first) for each line/fixture,
        // sourced from the shared Utilities catalog.
        ...LINE_TYPE_ARR.flatMap(t => matRows(t.dbName, 'LF')),
        ...GAS_TYPE_ARR.flatMap(t => matRows(t.dbName, 'ea')),
        ...ELEC_TYPE_ARR.flatMap(t => matRows(t.dbName, 'ea')),
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
          value: laborRates['Pool Plumbing - Base Hours'],
        },
        {
          label: 'Pool Plumbing - Materials',
          table: 'misc_rates',
          name: 'Pool Plumbing - Materials',
          category: 'Pool',
          mode: 'currency',
          unitLabel: 'flat',
          value: materialPrices['Pool Plumbing - Materials'],
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
          value: materialPrices['Pool Avg Depth Ratio'],
        },
        {
          label: 'Pool Excavation Swell Factor',
          table: 'misc_rates',
          name: 'Pool Excavation Swell Factor',
          category: 'Pool',
          mode: 'coefficient',
          unitLabel: '×',
          value: materialPrices['Pool Excavation Swell Factor'],
        },
        {
          label: 'Pool Shotcrete Shell Thickness',
          table: 'misc_rates',
          name: 'Pool Shotcrete Shell Thickness',
          category: 'Pool',
          mode: 'coefficient',
          unitLabel: 'ft',
          value: materialPrices['Pool Shotcrete Shell Thickness'],
        },
        {
          label: 'Pool Shotcrete Swell Factor',
          table: 'misc_rates',
          name: 'Pool Shotcrete Swell Factor',
          category: 'Pool',
          mode: 'coefficient',
          unitLabel: '×',
          value: materialPrices['Pool Shotcrete Swell Factor'],
        },
        {
          label: 'Pool Tile SF per LF',
          table: 'misc_rates',
          name: 'Pool Tile SF per LF',
          category: 'Pool',
          mode: 'coefficient',
          unitLabel: 'Sq Ft per Ln Ft',
          value: materialPrices['Pool Tile SF per LF'],
        },
        {
          label: 'Pool Raised Corner Labor',
          table: 'labor_rates',
          name: 'Pool Raised Corner Labor',
          category: 'Pool',
          mode: 'coefficient',
          unitLabel: 'hrs per corner',
          value: materialPrices['Pool Raised Corner Labor'],
        },
        {
          label: 'Pool Raised Corner Mat Factor',
          table: 'misc_rates',
          name: 'Pool Raised Corner Mat Factor',
          category: 'Pool',
          mode: 'coefficient',
          unitLabel: '×',
          value: materialPrices['Pool Raised Corner Mat Factor'],
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
            subMarkupRate={n(state.subGpMarkupRate)}
          />
        </div>
        <div className="px-6 py-2">
          <CrewTypeBar
            crewType={state.crewType}
            onCrewTypeChange={v => updShared('crewType', v)}
            title="Pool"
            moduleType="Pool"
            rates={poolRateList}
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
          <span className="font-semibold">Labor rate needed:</span> set a Default
          Labor rate in Master Material Rates for {calc.laborUnset.join(', ')}. These
          items are contributing 0 labor hours until a labor rate is assigned.
        </div>
      )}

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
        <SectionHeader title="Excavation" />
        {/* Excavation-specific In-House / Sub toggle (independent of the
            module-level tab). Sub mode shows a subcontractor picker. */}
        <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden mb-3">
          {['In-House', 'Sub'].map(m => (
            <button
              key={m}
              type="button"
              onClick={() => upd('excavation', { ...T.excavation, mode: m })}
              className={`px-4 py-1.5 text-xs font-medium ${
                (T.excavation.mode || 'In-House') === m
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {(T.excavation.mode || 'In-House') === 'In-House' ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-3">
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
        {(T.excavation.mode || 'In-House') === 'Sub' && calc.excavAutoSub > 0 && (
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
      </div>

      {/* ─── 3. Shotcrete ─── */}
      <div>
        <SectionHeader title="Shotcrete (Sub)" />
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
              {calc.totalShotCY.toFixed(1)} Cu Yd × $
              {n(subRates['Shotcrete Material'])}/CY mat + max($
              {n(subRates['Shotcrete Minimum Labor']).toLocaleString()}, CY × $
              {n(subRates['Shotcrete Labor'])}/CY lab)
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
            ['Cover Vault', T.vault],
            ['Infinity Edge Basin', T.basin],
            ['Zero Edge Trough', T.trough],
          ]
            .filter(([, s]) => s && s.enabled)
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
                            !poolStdOptions(materialRows, TILE_SUBCAT, t.vendor || 'Standard').some(o => o.label === t.installType) && (
                              <option value={t.installType}>{t.installType}</option>
                            )}
                          {poolStdOptions(materialRows, TILE_SUBCAT, t.vendor || 'Standard').map(o => (
                            <option key={o.value} value={o.label}>{o.label}</option>
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

      {/* ─── 5. Spillways ─── */}
      <div>
        <SectionHeader title="Spillways" />
        <div className="space-y-2">
          {T.spillways.map((sw, i) => {
            const spillOpts = poolStdOptions(materialRows, SPILLWAY_SUBCAT, sw.vendor || 'Standard')
            const spillVends = vendors.filter(v => poolSubVendorIds(materialRows, SPILLWAY_SUBCAT).includes(v.id))
            return (
            <div key={i} className="grid grid-cols-6 gap-2 items-end">
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
                    {sw.type && !spillOpts.some(o => o.label === sw.type) && (
                      <option value={sw.type}>{sw.type}</option>
                    )}
                    {spillOpts.map(o => (
                      <option key={o.value} value={o.label}>{o.label}</option>
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
                className="text-gray-500 hover:text-red-500 text-sm pb-1"
              >
                ✕
              </button>
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
                    {cr.type && !copingOpts.some(o => o.label === cr.type) && (
                      <option value={cr.type}>{cr.type}</option>
                    )}
                    {copingOpts.map(o => (
                      <option key={o.value} value={o.label}>{o.label}</option>
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
                className="text-gray-500 hover:text-red-500 text-sm pb-1"
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
                    value={rs.matType || ''}
                    onChange={e => updRaised(i, 'matType', e.target.value)}
                  >
                    {!rs.matType && <option value="">Select material</option>}
                    {rs.matType && !poolStdOptions(materialRows, RAISED_SUBCAT).some(o => o.label === rs.matType) && (
                      <option value={rs.matType}>{rs.matType}</option>
                    )}
                    {poolStdOptions(materialRows, RAISED_SUBCAT).map(o => (
                      <option key={o.value} value={o.label}>{o.label}</option>
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
                className="text-gray-500 hover:text-red-500 text-sm pb-1"
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

      {/* ─── 9. Pool Equipment — "(Sub)" only on the Sub tab ─── */}
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
                      {eq.model && !models.some(m => m.label === eq.model) && (
                        <option value={eq.model}>{eq.model}</option>
                      )}
                      {models.map(m => (
                        <option key={m.value} value={m.label}>
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
                      className="text-gray-500 hover:text-red-500 text-sm leading-none shrink-0"
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

      {/* ─── 11. Steel ─── */}
      <div>
        <SectionHeader title="Steel" />
        {!isSub ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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
                  <option key={o.value} value={o.label}>{o.label}</option>
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
            <div className="flex items-end pb-1">
              <p className="text-xs text-gray-400">
                {n(T.steel.sf) * n(T.steel.lfPerSf) > 0
                  ? `${(n(T.steel.sf) * n(T.steel.lfPerSf)).toFixed(0)} LF → ${fmt2(calc.steelMat)} mat`
                  : 'enter SF × LF/SF'}
              </p>
            </div>
          </div>
        ) : (
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
      {/* end Steel */}

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
                            className="text-gray-500 hover:text-red-500 text-sm"
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

      {/* ─── In-House Plumbing (In-House tab only) ─── */}
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
                        className="text-gray-300 hover:text-red-500 text-sm px-1"
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
                          className="text-gray-300 hover:text-red-500 text-sm px-1"
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
