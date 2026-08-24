import WorkTypeChooser from './WorkTypeChooser'
import CrewTypeBar from './CrewTypeBar'
import ModuleHeaderSlot from './ModuleHeaderSlot'
import { useState, useEffect, useCallback, useContext } from 'react'
import { SubTabContext, subSectionTitle } from './subTabContext'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import { fetchSalesTaxRate } from '../../lib/companyDefaults'
import { calcWalkAccessLabor } from '../../lib/walkAccess'
import { groutCuFtPerBlock } from '../../lib/cmuGrout'
import { catalogItemFor, catalogOptions, fetchModuleCatalog, fetchStandardRateMap } from '../../lib/materialCatalog'
import { computeCapRow, computeFinishRow, WF_META, WF_LIST } from './firePitCalc'
import { FINISH_TYPE_REFKEY, CAP_TYPE_REFKEY } from './finishesCalc'
import { MAT } from '../../lib/materialRefs'
import { TRENCH_LABOR_RATE_NAME, trenchHours, trenchRowHrs } from '../../lib/trench'
import { STRUCT_CALC } from './firePitStruct'
import { resolveUtilRow } from '../../lib/utilRow'
import UnpricedItemModal from '../UnpricedItemModal'

// One-picker scheme: Standard sources & prices from the item's null-vendor
// catalog record; a real vendor from its own. Matches Concrete/OK/Drainage.
const CATALOG_OPTS = { standardRows: 'null-vendor', stripPrefix: true }

// ─────────────────────────────────────────────────────────────────────────────
// Fire Pit Module — based on Fire Pit Module tab in Excel estimator
// Covers: CMU block walls, wall caps, gas line + gas fixtures, wall finishes,
//         manual entry. Wall finishes + caps + gas use the same vendor·type
//         picker patterns ported from the Outdoor Kitchen module.
// Standard CMU block: 16"L × 8"H × 8"W
// ─────────────────────────────────────────────────────────────────────────────

// User-selectable rebar size. Rebar is priced per Ln Ft off the canonical
// Basic Materials → Reinforcement rows ('Rebar #3' … 'Rebar #8'). The picked
// size resolves the material name; labor stays on the FP Set Rebar rate.
const REBAR_SIZES = ['#3', '#4', '#5', '#6', '#8']

const FP_RATES = {
  // ── Structural material costs ───────────────────────────────────────────────
  // `ref` = frozen material ref_key (M7): Standard price reads by ref_key first
  // (rename-safe), dbName fallback. Caps ('FP Cap *') + FP Rebar are misc rates (not
  // catalog materials) so they stay name-keyed.
  fpBlock: { dbName: 'FP Block', ref: MAT.FP_BLOCK }, // $/block
  fpRebar: { dbName: 'FP Rebar' }, // $/LF (fallback price only; name now size-based)
  fpConcrete: { dbName: 'FP Concrete', ref: MAT.FP_CONCRETE }, // $/CY (footing & grout)
  fpGroutPump: { dbName: 'FP Grout Pump Setup', ref: MAT.FP_GROUT_PUMP_SETUP }, // flat fee when pump used

  // ── Subcontractor flat structure rates (Sub tab only) ───────────────────────
  // On the Sub tab the itemized block/rebar/footing/grout takeoff is replaced by
  // a flat price: wall perimeter × $/LF + wall face area × $/SF. This covers the
  // wall build AND cap install labor.
  fpSubStructLF: { dbName: 'FP Sub Structure $/LF' }, // $/LF wall build
  fpSubStructHtSF: { dbName: 'FP Sub Structure Ht $/SF' }, // $/SF wall face

  // ── Wall cap costs — simple $/LF master rate + hrs/LF labor coefficient per
  //    cap type, resolved by Type like the OK finishes (vendor-overridable).
  capFlagstone: { dbName: 'FP Cap Flagstone' }, // $/LF
  capPrecast: { dbName: 'FP Cap Precast' }, // $/LF
  capPipConcrete: { dbName: 'FP Cap PIP Concrete' }, // $/LF
  capBullnose: { dbName: 'FP Cap Bullnose Brick' }, // $/LF
  capFlagstoneLab: { dbName: 'FP Cap Flagstone Labor Rate' }, // hrs/LF
  capPrecastLab: { dbName: 'FP Cap Precast Labor Rate' }, // hrs/LF
  capPipConcreteLab: { dbName: 'FP Cap PIP Concrete Labor Rate' }, // hrs/LF
  capBullnoseLab: { dbName: 'FP Cap Bullnose Brick Labor Rate' }, // hrs/LF

  // ── Wall finish material costs — SHARED with the Finishes module (one record
  //    per finish, across all modules). Canonical: '<Type> - Finishes'. ──────────
  sandStucco: { dbName: 'Sand Stucco - Finishes', ref: MAT.SAND_STUCCO }, // $/SF
  smoothStucco: { dbName: 'Smooth Stucco - Finishes', ref: MAT.SMOOTH_STUCCO }, // $/SF
  ledgerstone: { dbName: 'Ledgerstone - Finishes', ref: MAT.LEDGERSTONE }, // $/SF panel
  stackedStone: { dbName: 'Stacked Stone - Finishes', ref: MAT.STACKED_STONE }, // $/SF panel
  tile: { dbName: 'Tile - Finishes', ref: MAT.TILE_FINISH }, // $/SF
  realFlagstone: { dbName: 'Real Flagstone - Finishes', ref: MAT.REAL_FLAGSTONE }, // shared $/Sq Ft (Finishes)
  realStone: { dbName: 'Real Stone - Finishes', ref: MAT.REAL_STONE }, // shared $/Sq Ft (Finishes)

  // ── Labor productivity rates ────────────────────────────────────────────────
  digLab: { dbName: 'FP Dig Footing Labor Rate' }, // CF/hr
  footingPourLab: { dbName: 'Wall Hand Pour Footing Labor Rate' }, // CY/hr — BORROWED from Walls (hand pour footing)
  rebarLab: { dbName: 'FP Set Rebar Labor Rate' }, // LF/hr
  blockLab: { dbName: 'FP Set Blocks Labor Rate' }, // blocks/hr
  handGroutLab: { dbName: 'FP Hand Grout Labor Rate' }, // CF/hr
  pumpGroutLab: { dbName: 'FP Pump Grout Labor Rate' }, // CF/hr
  // Finish LABOR — SHARED with Finishes (one labor rate per finish, all modules).
  sandStuccoLab: { dbName: 'Sand Stucco - Finishes Labor Rate' }, // SF/day
  smoothStuccoLab: { dbName: 'Smooth Stucco - Finishes Labor Rate' }, // SF/day
  ledgerstoneLab: { dbName: 'Ledgerstone - Finishes Labor Rate' }, // SF/day
  stackedStoneLab: { dbName: 'Stacked Stone - Finishes Labor Rate' }, // SF/day
  tileLab: { dbName: 'Tile - Finishes Labor Rate' }, // hrs/SF
  flagstoneLab: { dbName: 'Real Flagstone - Finishes Labor Rate' }, // hrs/SF
  realStoneLab: { dbName: 'Real Stone - Finishes Labor Rate' }, // hrs/SF
}

const DEFAULTS = {
  laborRatePerHour: 35,
  laborBurdenPct: 0.29,
  gpmd: 425,
}

const n = v => parseFloat(v) || 0

// Standard CMU block dimensions (inches)
const BLOCK_LENGTH_IN = 16
const BLOCK_HEIGHT_IN = 8
const BLOCK_WIDTH_IN = 8
// Grout fill per block — standardized cu-ft/block model shared across all CMU
// modules (8x8x16 = 0.5 cu ft). Priced at the concrete rate (fpConcrete).
const GROUT_CF_PER_BLOCK = groutCuFtPerBlock(BLOCK_WIDTH_IN, BLOCK_HEIGHT_IN)

// ── Structure-type tabs (mirror ColumnsModule / WallsModule wall types) ─────────
// A fire-pit structure is a LINEAR WALL, so each type mirrors the matching Walls
// wall math (wallLF × wallHeightIn) rather than a column footprint. CMU keeps the
// exact legacy FP block/grout/rebar/footing math; the other three add poured,
// modular-stack and brick-face math.
const STRUCT_TYPE_TABS = [
  { key: 'CMU', label: 'CMU Block' },
  { key: 'PIP', label: 'Poured in Place' },
  { key: 'Modular', label: 'Modular' },
  { key: 'Brick', label: 'Brick' },
]
// Per-type Type-picker catalog sub-categories (vendor-first, id-linked — the same
// products the matching Walls / Concrete tabs use). CMU shares the dimensioned
// 'Wall Block' products (same as Columns CMU); Modular/Brick share the Walls
// Modular/Brick sub-categories; PIP pours a 'Concrete Mix' product.
const CMU_BLOCK_SUBCAT = 'Wall Block'
const MODULAR_SUBCAT = 'Modular Wall'
const BRICK_SUBCAT = 'Brick'
const CONC_MIX_SUBCAT = 'Concrete Mix'
const SUBCAT_FOR = { CMU: CMU_BLOCK_SUBCAT, PIP: CONC_MIX_SUBCAT, Modular: MODULAR_SUBCAT, Brick: BRICK_SUBCAT }
const TYPE_LABEL = { CMU: 'Block Type', PIP: 'Concrete Mix', Modular: 'Block Type', Brick: 'Brick Type' }

// New per-type material lines resolve ONLY from the catalog ($0 if unpriced) —
// no hardcoded material fallback (mirrors Columns). Mortar + form lumber.
const MORTAR_NAME = 'Mortar'
const FORM_LUMBER_NAME = 'FP Form Lumber'
// Brick + PIP-form labor are SHARED with the Walls module (one rate each, edited
// once) — Fire Pit brick laying = building a brick wall; Fire Pit PIP form =
// poured-in-place wall install. Pour + caps stay Fire-Pit-specific.
const FP_BRICK_LAY = { dbName: 'Wall Brick Lay Labor' } // hrs / SF of brick face (shared w/ Walls)
const FP_FORM_LAB = { dbName: 'Wall PIP Install Labor' } // hrs / SF of form (shared w/ Walls PIP)
const FP_POUR_LAB = { dbName: 'FP Pour Concrete Labor Rate' } // hrs / CY poured

// Resolve a picked catalog product row by its frozen ref_key (preferred) or id.
// The block picker stores ref_key so a selection survives a catalog rename; a
// legacy id-saved row still resolves.
function catalogRowById(materialRows, key) {
  return (materialRows || []).find(r => (r.ref_key && r.ref_key === key) || r.id === key) || null
}
// Block dims from a catalog row's calc_meta (fallback to legacy cols / default).
function blockDims(row, def = { w: 8, h: 8, l: 16 }) {
  const cm = row && row.calc_meta ? row.calc_meta : {}
  return {
    w: n(cm.block_w_in) || n(row && row.block_w_in) || def.w,
    h: n(cm.block_h_in) || n(row && row.block_h_in) || def.h,
    l: n(cm.block_l_in) || n(row && row.block_l_in) || def.l,
  }
}
// Vendor options (Standard + vendors carrying a product) for a sub-category.
function subcatVendorOptions(materialRows, subcat, vendorNames = {}) {
  const rows = (materialRows || []).filter(r => r.sub_category === subcat)
  const ids = [...new Set(rows.filter(r => r.vendor_id).map(r => r.vendor_id))]
  const out = ids
    .map(id => ({ value: id, label: vendorNames[id] || 'Vendor' }))
    .sort((a, b) => a.label.localeCompare(b.label))
  out.unshift({ value: 'Standard', label: 'Standard' })
  return out
}
// Product options for a sub-category filtered by the chosen vendor (vendor-first).
function subcatProductOptions(materialRows, subcat, vendorSel) {
  const isStd = !vendorSel || vendorSel === 'Standard'
  return (materialRows || [])
    .filter(r => r.sub_category === subcat && (isStd ? r.vendor_id == null : r.vendor_id === vendorSel))
    // Option VALUE = the item's frozen ref_key (picker stores it, rename-proof);
    // catalogRowById resolves ref_key or a legacy id save.
    .map(r => ({ value: r.ref_key || r.id, label: r.name, row: r }))
}
function labelWithDims(row) {
  const d = blockDims(row, { w: 0, h: 0, l: 0 })
  return d.w ? `${row.name} — ${d.w}×${d.h}×${d.l}` : row.name
}

// ── Wall-finish vendor catalog (ported from Outdoor Kitchen) ──────────────────
// A real vendor overrides ONLY the material unit price for a finish (matched by
// its Type label in the vendor's catalog under the given sub_category); Standard
// keeps the built-in per-estimate / master-rate price. Labor is never affected.
// Wall finishes are now SHARED: the picker + vendor override read the canonical
// Finishes module records (category 'Finishes', sub-category 'Finish Material'),
// not per-module 'Wall Finish' copies. One product + one labor rate per finish.
const WF_CAT = 'Finish Material'
const WF_CATEGORY = 'Finishes'
const CAP_CAT = 'Wall Cap'
function wfVendorPrice(vendorSel, typeLabel, materialRows, cat = WF_CAT, opts = {}) {
  // fallbackFirst:false so a non-matching type returns null (→ the built-in
  // master rate) instead of mis-pricing to the first catalog option.
  const base = { ...CATALOG_OPTS, fallbackFirst: false, ...opts }
  // Match the built-in finish/cap by its FROZEN material ref_key first (survives a
  // catalog rename), then fall back to the TYPE label (master/unmapped types, e.g.
  // the PIP Concrete cap which has no material record). Finish vs cap labels never
  // collide, so a single combined lookup is safe.
  const refKey = FINISH_TYPE_REFKEY[typeLabel] || CAP_TYPE_REFKEY[typeLabel] || null
  const row =
    (refKey && catalogItemFor(materialRows, cat, vendorSel, refKey, base)) ||
    catalogItemFor(materialRows, cat, vendorSel, typeLabel, base)
  // Only treat a catalog price as an override when it's a real positive number.
  // A placeholder/null-vendor product with 0/blank unit_cost (price lives in the
  // built-in master rate) must return null so `?? houseUnit` falls back instead of
  // zeroing material.
  return row && n(row.unit_cost) > 0 ? n(row.unit_cost) : null
}
// WF_META / WF_LIST (the 7 canonical finishes + their FP_RATES material/labor keys)
// now live in firePitCalc.js so the finish-option contract is pure-unit-testable and
// the TYPE dropdown, the calc, and the tests all share ONE source. Imported above.
const WF_ROW = () => ({ vendor: 'Standard', type: '', sf: '' })

// ── Wall cap catalog ──────────────────────────────────────────────────────────
// Caps are measured in LINEAR FEET. Each Type resolves a $/LF master material
// rate (vendor-overridable) + an hrs/LF labor coefficient, mirroring how the
// wall finishes resolve material + labor by type.
const CAP_META = {
  Flagstone: { matKey: 'capFlagstone', labKey: 'capFlagstoneLab' },
  Precast: { matKey: 'capPrecast', labKey: 'capPrecastLab' },
  'PIP Concrete': { matKey: 'capPipConcrete', labKey: 'capPipConcreteLab' },
  'Bullnose Brick': { matKey: 'capBullnose', labKey: 'capBullnoseLab' },
}
const CAP_LIST = Object.keys(CAP_META)
const CAP_ROW = () => ({ vendor: 'Standard', type: '', lf: '' })

// ── Master-list finish/cap support ───────────────────────────────────────────
// A material_rates row tagged sub_category=cat (Unspecified) becomes a selectable
// finish/cap Type. Its material unit is the row's unit_cost; every other calc
// parameter (unit mode, labMode, waste, tonPerSF, laborCoeff, …) comes from its
// calc_meta JSON. Built-in types keep their exact WF_META/FP_RATES path unchanged.
function masterWallMeta(cat, typeLabel, materialRows, category = null, vendorSel = 'Standard') {
  // Resolve the product row for this Type: the selected vendor's row first, else
  // the Standard (null-vendor) row. A VENDOR-ONLY product (e.g. a Bellecrete cap
  // with no Standard counterpart) still resolves its calc_meta + unit_cost, so it
  // prices and computes labor instead of silently zeroing.
  const opts = { standardRows: 'null-vendor', stripPrefix: true, fallbackFirst: false, category }
  const r =
    (vendorSel && vendorSel !== 'Standard' && vendorSel !== 'auto'
      ? catalogItemFor(materialRows, cat, vendorSel, typeLabel, opts)
      : null) || catalogItemFor(materialRows, cat, 'Standard', typeLabel, opts)
  if (!r) return null
  const m = r.calc_meta || {}
  return {
    ...m,
    unit: m.unit || 'SF',
    labMode: m.labMode || 'perSF',
    matUnit: n(r.unit_cost),
    laborCoeff: n(m.laborCoeff),
    dbName: r.name,
    master: true,
  }
}
// Section Type options — VENDOR-FIRST (like Paver/Utilities). The row's selected
// Vendor filters the Type list: Standard/unset → the null-vendor (Standard)
// catalog items merged with the built-in labels (built-in fallback); a real
// vendor → ONLY that vendor's catalog items. Category scoping (e.g. Fire Pit vs
// Outdoor Kitchen Wall Finish) is combined with the vendor filter.
function masterWallOptions(cat, builtInList, materialRows, category = null, vendorSel = 'Standard') {
  const isStd = !vendorSel || vendorSel === 'Standard' || vendorSel === 'auto'
  if (!isStd) {
    // Real vendor → only that vendor's catalog items (no built-in fallback).
    return catalogOptions(materialRows, cat, vendorSel, { standardRows: 'null-vendor', stripPrefix: true, category })
      .map(o => o.label)
  }
  // Catalog-only: Standard/unset → the null-vendor (Standard) catalog items.
  // Built-in list no longer injected as options (single source of truth); an
  // unseeded sub-category yields an empty list (picker shows its placeholder).
  return catalogOptions(materialRows, cat, 'Standard', { standardRows: 'null-vendor', stripPrefix: true, category })
    .map(o => o.label)
}

// ── Electrical & Plumbing catalog — GAS ONLY (ported from Utilities module) ────
// Rates live in material_rates / labor_rates under category 'Utilities' so they
// stay a single source of truth shared with the Utilities module. Fallbacks
// below are used only when the DB row is absent. A vendor overrides ONLY the
// material price for the selected item; labor always comes from the built-in.
const UTILITY_LINE_TYPES = {
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
const LINE_TYPE_ARR = Object.entries(UTILITY_LINE_TYPES).map(([label, t]) => ({ label, dbName: t.dbName, laborDbName: t.laborDbName }))
const GAS_TYPE_ARR = Object.entries(GAS_FIXTURE_TYPES).map(([label, t]) => ({ label, dbName: t.dbName, laborDbName: t.laborDbName }))
// Gas pipes live under the 'Gas Pipe' sub-category (Utilities module moved them
// there); Fire Pit's "Gas Line" picker + calc must match, or it resolves nothing.
const UTIL_CAT = { line: 'Gas Pipe', gas: 'Gas Fixtures' }

// Trenching — SAME section + math as the Utilities module (Utilities is the
// canonical source). Rates + calc come from the shared lib/trench helper so Fire
// Pit and Utilities can never drift; values match by construction.
const TRENCH_ROW = () => ({ equipment: 'Trench', lf: '', width: '', depth: '' })

// ── Rate scope: the ONE list of (category, sub-category) pairs Fire Pit uses ──
// This is the single source of truth for BOTH the catalog load (pickers) and the
// View Rates popup, so they can never drift. A bare `{ category }` = the whole
// category (its own rates); `{ category, sub }` = a specific material sub-category
// borrowed from another module's category (e.g. Wall Cap / Wall Block from Walls).
const RATE_SCOPE = [
  { category: 'Fire Pit' }, // own: Wall Finish, grout, labor, sub, misc
  { category: 'Walls', sub: CAP_CAT }, // Wall Cap (shared, e.g. Bellecrete)
  { category: 'Walls', sub: CMU_BLOCK_SUBCAT }, // Wall Block
  { category: 'Walls', sub: MODULAR_SUBCAT }, // Modular Wall
  { category: 'Walls', sub: BRICK_SUBCAT }, // Brick
  // Borrowed footing pour labor (hand) — surfaces as one editable line; edits the
  // same shared Walls rate. `only` keeps the rest of Walls 'Structure' out.
  { category: 'Walls', sub: 'Structure', only: ['Wall Hand Pour Footing Labor Rate'] },
  { category: 'Concrete', sub: CONC_MIX_SUBCAT }, // Concrete Mix (PIP)
  { category: 'Utilities', sub: UTIL_CAT.line }, // Gas Pipe
  { category: 'Utilities', sub: UTIL_CAT.gas }, // Gas Fixtures
  { category: 'Basic Materials', sub: 'Reinforcement' }, // Rebar
  { category: 'Finishes', sub: 'Finish Material' }, // ALL wall finishes (shared $/Sq Ft — one record per finish)
  { category: 'Finishes', sub: 'Surface Finishes' }, // shared finish LABOR rates (one per finish)
]
const RATE_SCOPE_CATS = [...new Set(RATE_SCOPE.map(s => s.category))]

const EP_LINE_ROW = () => ({ type: '', lf: '', vendor: 'Standard' })
const EP_GAS_ROW = () => ({ type: '', qty: '', vendor: 'Standard' })

// Reusable Electrical & Plumbing table (Gas Line / Gas Fixtures).
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
      {title && <p className="text-xs font-semibold text-gray-600 mb-1">{title}</p>}
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
              const { opts, matOpt, matCost, laborVal, laborBuiltIn } = resolveUtilRow(
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

// ── Per-type structure calculators (pure; shared shape used by module + summary) ─
// Each takes a per-type structure record `s` (wall takeoff + vendor + matType +
// rebarSize) and returns { mat, hrs, ...quantities }. A fire-pit structure is a
// LINEAR wall (wallLF × wallHeightIn); each type mirrors the matching Walls math.
// Material prices: picked catalog row's unit_cost, else the OK'd concrete/rebar
// fallback (CMU block/concrete/rebar) or $0 for the new catalog-only lines
// (modular block, brick, mortar, form lumber). Labor coefficients unchanged.
const structHasGeo = s => n(s?.wallLF) > 0 && n(s?.wallHeightIn) > 0

// Footing + rebar geometry shared by all four types (identical to legacy FP).
function structFootingRebar(s) {
  const wallLF = n(s.wallLF)
  const wallHeightIn = n(s.wallHeightIn)
  const footingCF = (n(s.footingWidthIn) / 12) * (n(s.footingDepthIn) / 12) * wallLF
  const footingCY = footingCF / 27
  const vertRebars = n(s.rebarSpacingIn) > 0 ? Math.ceil((wallLF * 12) / n(s.rebarSpacingIn)) : 0
  const vertRebarLF = (vertRebars * (wallHeightIn + n(s.footingDepthIn))) / 12
  const horizRebarLF = (2 + n(s.bondBeamCourses)) * wallLF // 2 footing bars + bond beams
  const totalRebarLF = vertRebarLF + horizRebarLF
  return { footingCF, footingCY, totalRebarLF }
}

// ⚠ SUPERSEDED — the LIVE STRUCT_CALC is imported from ./firePitStruct (re-exported
// above; unit-tested in firePitStruct.test.mjs). The four local copies below are dead
// code (unreferenced) kept only to keep this diff small — DO NOT EDIT them; change
// firePitStruct.js instead. Safe to delete in a follow-up cleanup.
// CMU — the EXACT legacy FP block/grout/rebar/footing math. Block price = picked
// 'Wall Block' catalog row, else the FP Block rate (preserves legacy $).
function calcCmuStruct(s, mp = {}, materialRows = []) {
  const p = (db, fb) => (mp[db] != null ? mp[db] : fb)
  if (!structHasGeo(s)) return { mat: 0, hrs: 0 }
  const wallLF = n(s.wallLF)
  const wallHeightIn = n(s.wallHeightIn)
  const blocksPerCourse = Math.ceil((wallLF * 12) / BLOCK_LENGTH_IN)
  const coursesCount = Math.ceil(wallHeightIn / BLOCK_HEIGHT_IN)
  const rawBlocks = blocksPerCourse * coursesCount
  const totalBlocks = rawBlocks * 1.1
  const { footingCF, footingCY, totalRebarLF } = structFootingRebar(s)
  const groutCF = rawBlocks * GROUT_CF_PER_BLOCK * (n(s.pctGrouted) / 100)
  const groutCY = groutCF / 27
  const digHrs = footingCF > 0 ? footingCF * p(FP_RATES.digLab.dbName, FP_RATES.digLab.fallback) : 0
  const footingPourHrs = footingCY > 0 ? footingCY * p(FP_RATES.footingPourLab.dbName) : 0
  const rebarHrs = totalRebarLF > 0 ? totalRebarLF * p(FP_RATES.rebarLab.dbName, FP_RATES.rebarLab.fallback) : 0
  const setBlockHrs = rawBlocks > 0 ? rawBlocks * p(FP_RATES.blockLab.dbName, FP_RATES.blockLab.fallback) : 0
  const groutRate = s.useGroutPump === 'Yes'
    ? p(FP_RATES.pumpGroutLab.dbName, FP_RATES.pumpGroutLab.fallback)
    : p(FP_RATES.handGroutLab.dbName, FP_RATES.handGroutLab.fallback)
  const groutHrs = groutCF > 0 ? groutCF * groutRate : 0
  const structuralBaseHrs = digHrs + footingPourHrs + rebarHrs + setBlockHrs + groutHrs
  const curveAddHrs = structuralBaseHrs * (n(s.pctCurved) / 100) * p('FP Curve Labor Factor')
  const picked = catalogRowById(materialRows, s.matType)
  const blockPrice = picked ? n(picked.unit_cost) : p(FP_RATES.fpBlock.dbName, FP_RATES.fpBlock.fallback)
  const blockMat = totalBlocks * blockPrice
  const rebarMat = totalRebarLF * p('Rebar ' + (s.rebarSize || '#4'), FP_RATES.fpRebar.fallback)
  const footingMat = footingCY * p(FP_RATES.fpConcrete.dbName, FP_RATES.fpConcrete.fallback)
  const groutMat = groutCY * p(FP_RATES.fpConcrete.dbName, FP_RATES.fpConcrete.fallback)
  const pumpSetupMat = s.useGroutPump === 'Yes' && groutCF > 0
    ? p(FP_RATES.fpGroutPump.dbName, FP_RATES.fpGroutPump.fallback)
    : 0
  const mat = blockMat + rebarMat + footingMat + groutMat + pumpSetupMat
  const hrs = n(s.layoutHrs) + structuralBaseHrs + curveAddHrs
  return { mat, hrs, blocksPerCourse, coursesCount, rawBlocks, totalBlocks, footingCF, footingCY, groutCF, groutCY, totalRebarLF, curveAddHrs, blockMat, rebarMat, footingMat, groutMat, pumpSetupMat }
}

// Poured in Place — poured volume = wallLF × (height/12) × (wall width/12) → CY ×
// mix price (picked 'Concrete Mix' row, else FP Concrete rate) + forms (2 faces ×
// face SF × form lumber, catalog-only $0) + rebar + footing.
function calcPipStruct(s, mp = {}, materialRows = []) {
  const p = (db, fb) => (mp[db] != null ? mp[db] : fb)
  if (!structHasGeo(s)) return { mat: 0, hrs: 0 }
  const wallLF = n(s.wallLF)
  const wallHt = n(s.wallHeightIn) / 12
  const wallWidthIn = n(s.wallWidthIn) || BLOCK_WIDTH_IN
  const pourCF = wallLF * wallHt * (wallWidthIn / 12)
  const pourCY = pourCF / 27
  const formSF = 2 * wallLF * wallHt
  const { footingCF, footingCY, totalRebarLF } = structFootingRebar(s)
  const picked = catalogRowById(materialRows, s.matType)
  const mixPrice = picked ? n(picked.unit_cost) : p(FP_RATES.fpConcrete.dbName, FP_RATES.fpConcrete.fallback)
  const pourMat = pourCY * mixPrice
  const formMat = formSF * p(FORM_LUMBER_NAME, 0)
  const rebarMat = totalRebarLF * p('Rebar ' + (s.rebarSize || '#4'), FP_RATES.fpRebar.fallback)
  const footingMat = footingCY * p(FP_RATES.fpConcrete.dbName, FP_RATES.fpConcrete.fallback)
  const mat = pourMat + formMat + rebarMat + footingMat
  const digHrs = footingCF > 0 ? footingCF * p(FP_RATES.digLab.dbName, FP_RATES.digLab.fallback) : 0
  const footingPourHrs = footingCY > 0 ? footingCY * p(FP_RATES.footingPourLab.dbName) : 0
  const rebarHrs = totalRebarLF > 0 ? totalRebarLF * p(FP_RATES.rebarLab.dbName, FP_RATES.rebarLab.fallback) : 0
  const pourHrs = pourCY * p(FP_POUR_LAB.dbName, FP_POUR_LAB.fallback)
  const formHrs = formSF * p(FP_FORM_LAB.dbName, FP_FORM_LAB.fallback)
  const structuralBaseHrs = digHrs + footingPourHrs + rebarHrs + pourHrs + formHrs
  const curveAddHrs = structuralBaseHrs * (n(s.pctCurved) / 100) * p('FP Curve Labor Factor')
  const hrs = n(s.layoutHrs) + structuralBaseHrs + curveAddHrs
  return { mat, hrs, pourCY, formSF, footingCF, footingCY, totalRebarLF, curveAddHrs, pourMat, formMat, rebarMat, footingMat }
}

// Modular — block stack from the picked 'Modular Wall' row's dims × price
// (catalog-only $0 if unpriced/unpicked); rebar + footing; NO grout.
function calcModularStruct(s, mp = {}, materialRows = []) {
  const p = (db, fb) => (mp[db] != null ? mp[db] : fb)
  if (!structHasGeo(s)) return { mat: 0, hrs: 0 }
  const wallLF = n(s.wallLF)
  const wallHeightIn = n(s.wallHeightIn)
  const picked = catalogRowById(materialRows, s.matType)
  const dims = picked ? blockDims(picked) : { w: 8, h: 8, l: 16 }
  const blocksPerCourse = Math.ceil((wallLF * 12) / dims.l)
  const coursesCount = Math.ceil(wallHeightIn / dims.h)
  const rawBlocks = blocksPerCourse * coursesCount
  const totalBlocks = rawBlocks * 1.1
  const { footingCF, footingCY, totalRebarLF } = structFootingRebar(s)
  const blockPrice = picked ? n(picked.unit_cost) : 0
  const blockMat = totalBlocks * blockPrice
  const rebarMat = totalRebarLF * p('Rebar ' + (s.rebarSize || '#4'), FP_RATES.fpRebar.fallback)
  const footingMat = footingCY * p(FP_RATES.fpConcrete.dbName, FP_RATES.fpConcrete.fallback)
  const mat = blockMat + rebarMat + footingMat
  const digHrs = footingCF > 0 ? footingCF * p(FP_RATES.digLab.dbName, FP_RATES.digLab.fallback) : 0
  const footingPourHrs = footingCY > 0 ? footingCY * p(FP_RATES.footingPourLab.dbName) : 0
  const rebarHrs = totalRebarLF > 0 ? totalRebarLF * p(FP_RATES.rebarLab.dbName, FP_RATES.rebarLab.fallback) : 0
  const setBlockHrs = rawBlocks > 0 ? rawBlocks * p(FP_RATES.blockLab.dbName, FP_RATES.blockLab.fallback) : 0
  const structuralBaseHrs = digHrs + footingPourHrs + rebarHrs + setBlockHrs
  const curveAddHrs = structuralBaseHrs * (n(s.pctCurved) / 100) * p('FP Curve Labor Factor')
  const hrs = n(s.layoutHrs) + structuralBaseHrs + curveAddHrs
  return { mat, hrs, blocksPerCourse, coursesCount, rawBlocks, totalBlocks, footingCF, footingCY, totalRebarLF, curveAddHrs, blockMat, rebarMat, footingMat }
}

// Brick — bricks = face SF (wallLF × height) × per_sqft (calc_meta.per_sqft,
// default 7) × $/brick (picked 'Brick' row, $0 if unpriced) + Mortar (catalog-only
// $0) + rebar + footing. Laying labor = face SF × FP Brick Lay rate.
function calcBrickStruct(s, mp = {}, materialRows = []) {
  const p = (db, fb) => (mp[db] != null ? mp[db] : fb)
  if (!structHasGeo(s)) return { mat: 0, hrs: 0 }
  const wallLF = n(s.wallLF)
  const faceSF = wallLF * (n(s.wallHeightIn) / 12)
  const picked = catalogRowById(materialRows, s.matType)
  const perSqft = n(picked && picked.calc_meta && picked.calc_meta.per_sqft) || 7
  const brickPrice = picked ? n(picked.unit_cost) : 0
  const bricks = faceSF * perSqft
  const { footingCF, footingCY, totalRebarLF } = structFootingRebar(s)
  const brickMat = bricks * brickPrice
  const mortarMat = faceSF * p(MORTAR_NAME, 0)
  const rebarMat = totalRebarLF * p('Rebar ' + (s.rebarSize || '#4'), FP_RATES.fpRebar.fallback)
  const footingMat = footingCY * p(FP_RATES.fpConcrete.dbName, FP_RATES.fpConcrete.fallback)
  const mat = brickMat + mortarMat + rebarMat + footingMat
  const digHrs = footingCF > 0 ? footingCF * p(FP_RATES.digLab.dbName, FP_RATES.digLab.fallback) : 0
  const footingPourHrs = footingCY > 0 ? footingCY * p(FP_RATES.footingPourLab.dbName) : 0
  const rebarHrs = totalRebarLF > 0 ? totalRebarLF * p(FP_RATES.rebarLab.dbName, FP_RATES.rebarLab.fallback) : 0
  const brickHrs = faceSF * p(FP_BRICK_LAY.dbName, FP_BRICK_LAY.fallback)
  const structuralBaseHrs = digHrs + footingPourHrs + rebarHrs + brickHrs
  const curveAddHrs = structuralBaseHrs * (n(s.pctCurved) / 100) * p('FP Curve Labor Factor')
  const hrs = n(s.layoutHrs) + structuralBaseHrs + curveAddHrs
  return { mat, hrs, faceSF, bricks, footingCF, footingCY, totalRebarLF, curveAddHrs, brickMat, mortarMat, rebarMat, footingMat }
}

// STRUCT_CALC now lives in the React-free ./firePitStruct (unit-tested there); it's
// imported above and re-exported here so FirePitSummary's import keeps working.
export { STRUCT_CALC }
const STRUCT_TYPES = ['CMU', 'PIP', 'Modular', 'Brick']

// ── Calculation engine ────────────────────────────────────────────────────────
function calcFirePit(
  state,
  lrph = DEFAULTS.laborRatePerHour,
  mp = {},
  gpmd = DEFAULTS.gpmd,
  walkAccess = null,
  laborBurdenPct = DEFAULTS.laborBurdenPct
) {
  const _pace = n(walkAccess?.paceLfPerMin)
  const {
    difficulty,
    hoursAdj,
    structs,
    capRows,
    wallFinishRows,
    trenchRows,
    epLineRows,
    epGasRows,
    manualRows,
    materialRows,
  } = state

  const p = dbName => n(mp[dbName])
  const isSubTab = state.subType === 'Subcontractor'

  // Unpriced labor across sections — items whose picked Type has no labor rate
  // (unset or resolves to 0). Surfaced as a fix-it modal; NEVER silently filled.
  const laborUnset = []

  // ── Wall finish per-row calc: material (vendor-overridable unit) + labor ──────
  // Math lives in the pure, unit-tested firePitCalc.js; here we resolve the catalog
  // meta + vendor price and inject them, then collect any unpriced-labor flag.
  const finishRowCalc = row => {
    const meta = WF_META[row.type] || masterWallMeta(WF_CAT, row.type, materialRows, WF_CATEGORY, row.vendor)
    const vendorUnit = wfVendorPrice(row.vendor, row.type, materialRows, WF_CAT, { category: WF_CATEGORY })
    const r = computeFinishRow(row, { meta, vendorUnit, mp, fpRates: FP_RATES })
    if (r.laborUnset) laborUnset.push(r.laborUnset)
    return r
  }
  const wallFinishCalc = (wallFinishRows || []).map(finishRowCalc)
  const finishMat = wallFinishCalc.reduce((s, c) => s + c.mat, 0)
  const finishHrs = wallFinishCalc.reduce((s, c) => s + c.hrs, 0)

  // ── Wall cap per-row calc: $/LF material (vendor-overridable) + hrs/LF labor ──
  const capRowCalc = row => {
    const meta = CAP_META[row.type] || masterWallMeta(CAP_CAT, row.type, materialRows, null, row.vendor)
    const vendorUnit = wfVendorPrice(row.vendor, row.type, materialRows, CAP_CAT)
    const r = computeCapRow(row, { meta, vendorUnit, mp, fpRates: FP_RATES })
    if (r.laborUnset) laborUnset.push(r.laborUnset)
    return r
  }
  const capCalc = (capRows || []).map(capRowCalc)
  const capMat = capCalc.reduce((s, c) => s + c.mat, 0)
  // Every section is itemized on both tabs now (mirrors Columns); the Sub tab
  // differs only in the financial roll-up (labor+burden become the sub cost).
  const capHrs = capCalc.reduce((s, c) => s + c.hrs, 0)

  // ── Trenching (shared math with Utilities via lib/trench) — own section now
  //    (was a per-LF coefficient baked into the gas line). ───────────────────────
  const trenchHrs = trenchHours(trenchRows, mp)

  // ── Gas Line + Gas Fixtures (Utilities catalog, gas only) — pipe labor +
  //    material. Trenching is handled by the Trenching section above. ───────────
  let epHrs = trenchHrs
  let epMat = 0
  // Gas line/fixture items whose picked Type has no labor rate set (calc_meta.
  // labor_rate unset or resolves to 0) are pushed to the shared laborUnset list.
  ;(epLineRows || []).forEach(r => {
    if (!r.type) return
    const lf = n(r.lf)
    if (lf <= 0) return
    const { matCost, laborVal, laborName } = resolveUtilRow(UTIL_CAT.line, r, LINE_TYPE_ARR, materialRows, mp)
    if (laborVal <= 0) laborUnset.push({ kind: 'labor', name: laborName, label: r.type, category: 'Utilities', unit: null })
    epMat += lf * matCost
    epHrs += lf * laborVal
  })
  ;(epGasRows || []).forEach(r => {
    if (!r.type) return
    const qty = n(r.qty)
    if (qty <= 0) return
    const { matCost, laborVal, laborName } = resolveUtilRow(UTIL_CAT.gas, r, GAS_TYPE_ARR, materialRows, mp)
    if (laborVal <= 0) laborUnset.push({ kind: 'labor', name: laborName, label: r.type, category: 'Utilities', unit: null })
    epMat += qty * matCost
    epHrs += qty * laborVal
  })

  // ── Structure — ALL four types contribute simultaneously (mirrors Columns /
  //    Walls: switching the visible tab never drops the other types' data). ─────
  const structCalcs = {}
  let structureHrs = 0
  let structureMatVal = 0
  STRUCT_TYPES.forEach(t => {
    const c = STRUCT_CALC[t](structs?.[t] || {}, mp, materialRows)
    structCalcs[t] = c
    structureHrs += c.hrs
    structureMatVal += c.mat
  })
  const structActive = structCalcs[state.structureType] || structCalcs.CMU || { mat: 0, hrs: 0 }

  // ── Manual ───────────────────────────────────────────────────────────────────
  let manHrs = 0,
    manMat = 0,
    manSub = 0
  manualRows.forEach(r => {
    manHrs += n(r.hours)
    manMat += n(r.materials)
    manSub += n(r.subCost)
  })

  // ── Totals — both tabs itemize; only the roll-up differs (mirrors Columns) ────
  const baseHrs = structureHrs + capHrs + finishHrs + epHrs + manHrs

  const diffMod = 1 + n(difficulty) / 100
  const _preWalkHrs = baseHrs * diffMod + n(hoursAdj)
  const walkHrs = calcWalkAccessLabor(_preWalkHrs, state.distanceLF, { paceLfPerMin: _pace })
  const totalHrs = _preWalkHrs + walkHrs
  const manDays = totalHrs / 8

  const totalMat = structureMatVal + capMat + finishMat + epMat + manMat

  const laborCost = totalHrs * lrph
  const burden = laborCost * n(laborBurdenPct)
  // On the Sub tab the itemized scope's cost IS the subcontractor cost — labor +
  // burden + material + any manual sub — and profit is the markup (Sub GP). The
  // in-house GP model applies only to the In-House tab.
  const subMarkup = n(state.subGpMarkupRate)
  let gp, subCost, subGp, commission, price
  if (isSubTab) {
    gp = 0
    subCost = totalMat + laborCost + burden + manSub
    subGp = subCost * subMarkup
    commission = subGp * n(state.commissionRate)
    price = subCost + subGp + commission
  } else {
    gp = manDays * gpmd
    subCost = manSub
    subGp = 0
    commission = gp * n(state.commissionRate)
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
    structCalcs,
    structActive,
    structureHrs,
    structureMatVal,
    // Active-type quantities surfaced for the structure info box.
    blocksPerCourse: structActive.blocksPerCourse || 0,
    coursesCount: structActive.coursesCount || 0,
    rawBlocks: structActive.rawBlocks || 0,
    totalBlocks: structActive.totalBlocks || 0,
    footingCF: structActive.footingCF || 0,
    footingCY: structActive.footingCY || 0,
    groutCF: structActive.groutCF || 0,
    groutCY: structActive.groutCY || 0,
    totalRebarLF: structActive.totalRebarLF || 0,
    curveAddHrs: structActive.curveAddHrs || 0,
    structureMat: structureMatVal + capMat,
    capMat,
    capHrs,
    capCalc,
    finishMat,
    finishHrs,
    finishesMat: finishMat,
    wallFinishCalc,
    epMat,
    epHrs,
    manMat,
    laborUnset: (() => {
      const seen = new Set()
      return laborUnset.filter(u => {
        const k = u && (u.name || u.label)
        if (!k || seen.has(k)) return false
        seen.add(k)
        return true
      })
    })(),
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
      <span className="text-xs text-gray-700 w-44 shrink-0">{label}</span>
      {children}
      {note && <span className="text-xs text-gray-400 shrink-0">{note}</span>}
    </div>
  )
}

const DEFAULT_MANUAL_ROWS = [{ label: '', hours: '', materials: '', subCost: '' }]

// Per-TYPE structure record — the wall takeoff + vendor/type picker + rebar size
// for ONE structure type. Each of the four types keeps its own copy so switching
// the visible tab never drops another type's entered data (mirrors Columns).
function makeStruct(src = {}) {
  return {
    vendor: src.vendor ?? 'Standard',
    matType: src.matType ?? '', // picked catalog product id (block / mix / brick)
    rebarSize: src.rebarSize ?? '#4',
    wallLF: src.wallLF ?? '',
    wallHeightIn: src.wallHeightIn ?? '40',
    wallWidthIn: src.wallWidthIn ?? '8', // poured-wall thickness (PIP only)
    footingWidthIn: src.footingWidthIn ?? '12',
    footingDepthIn: src.footingDepthIn ?? '12',
    rebarSpacingIn: src.rebarSpacingIn ?? '16',
    bondBeamCourses: src.bondBeamCourses ?? '1',
    pctGrouted: src.pctGrouted ?? '100',
    pctCurved: src.pctCurved ?? '0',
    useGroutPump: src.useGroutPump ?? 'No',
    layoutHrs: src.layoutHrs ?? '',
  }
}

// Per-tab input record. In-House and Sub each hold their own independent copy so
// the two tabs are separate calculators. `structs` holds the four per-type wall
// takeoffs; `structureType` is the visible tab. Legacy bids stored the CMU wall
// fields flat on the tab → fold them onto structs.CMU so totals don't move.
function makeTab(src = {}) {
  const legacyStruct =
    !src.structs && (src.wallLF != null || src.wallHeightIn != null || src.footingWidthIn != null)
      ? makeStruct({
          rebarSize: src.rebarSize,
          wallLF: src.wallLF,
          wallHeightIn: src.wallHeightIn,
          footingWidthIn: src.footingWidthIn,
          footingDepthIn: src.footingDepthIn,
          rebarSpacingIn: src.rebarSpacingIn,
          bondBeamCourses: src.bondBeamCourses,
          pctGrouted: src.pctGrouted,
          pctCurved: src.pctCurved,
          useGroutPump: src.useGroutPump,
          layoutHrs: src.layoutHrs,
        })
      : null
  const s = src.structs || {}
  return {
    difficulty: src.difficulty ?? '',
    hoursAdj: src.hoursAdj ?? '',
    distanceLF: src.distanceLF ?? '',
    structureType: src.structureType ?? 'CMU',
    structs: {
      CMU: makeStruct(s.CMU || legacyStruct || {}),
      PIP: makeStruct(s.PIP || {}),
      Modular: makeStruct(s.Modular || {}),
      Brick: makeStruct(s.Brick || {}),
    },
    capRows: src.capRows ?? [CAP_ROW(), CAP_ROW()],
    wallFinishRows: src.wallFinishRows ?? [WF_ROW(), WF_ROW()],
    trenchRows: src.trenchRows ?? [TRENCH_ROW()],
    epLineRows: src.epLineRows ?? [EP_LINE_ROW(), EP_LINE_ROW()],
    epGasRows: src.epGasRows ?? [EP_GAS_ROW(), EP_GAS_ROW()],
    manualRows: src.manualRows ?? DEFAULT_MANUAL_ROWS.map(r => ({ ...r })),
  }
}

// ── Main component ────────────────────────────────────────────────────────────
export default function FirePitModule({ onSave, onBack, saving, initialData }) {
  const [laborRatePerHour, setLaborRatePerHour] = useState(
    initialData?.laborRatePerHour ?? null
  )
  const [laborBurdenPct, setLaborBurdenPct] = useState(
    initialData?.laborBurdenPct ?? null
  )
  const [gpmd, setGpmd] = useState(initialData?.gpmd ?? null)
  const [subGpMarkupRate, setSubGpMarkupRate] = useState(initialData?.subGpMarkupRate ?? null)
  const [commissionRate, setCommissionRate] = useState(initialData?.commissionRate ?? null)

  // Free-text notes for this module — Sam writes auto-generated
  // takeoffs here via create_estimate_from_takeoff, and the user can
  // overwrite / append their own.
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [walkAccess, setWalkAccess] = useState(
    initialData?.walkAccess ?? {
      paceLfPerMin: null,
    }
  )
  const [materialPrices, setMaterialPrices] = useState(initialData?.materialPrices ?? {})
  const [pricesLoading, setPricesLoading] = useState(!initialData?.materialPrices)
  const [laborModalItem, setLaborModalItem] = useState(null)
  const [materialRows, setMaterialRows] = useState(initialData?.materialRows ?? [])
  const [vendors, setVendors] = useState([])

  // Re-fetch Fire Pit merged labor+material map + the vendor catalog. Used on
  // mount and after edit. The 'Utilities' category rates (shared with the
  // Utilities module) merge into the same price map the gas sections read.
  const refreshAllRates = useCallback(async () => {
    // material_rates retired: base map from the new model; wall-finish + cap
    // catalog comes from the shared Fire Pit / Outdoor Kitchen / Walls
    // categories ('Wall Finish' and 'Wall Cap' subcategories, unchanged names).
    const [matMap, labRes, rows, venRes] = await Promise.all([
      fetchStandardRateMap(['Fire Pit', 'Utilities', 'Basic Materials', 'Concrete', 'Walls', 'Finishes']),
      supabase
        .from('labor_rates')
        .select('name, rate')
        // 'Finishes' is REQUIRED — the shared wall-finish labor rates
        // ('<Type> - Finishes Labor Rate') live under category Finishes; without it
        // every Fire Pit wall-finish resolves to 0 labor hours.
        .in('category', ['Fire Pit', 'Utilities', 'Walls', 'Finishes']),
      fetchModuleCatalog(RATE_SCOPE_CATS),
      supabase
        .from('subs_vendors')
        .select('id, company_name')
        .eq('type', 'vendor')
        .order('company_name'),
    ])
    const prices = { ...matMap }
    ;(labRes.data || []).forEach(r => {
      prices[r.name] = parseFloat(r.rate) || 0
    })
    setMaterialPrices(initialData?.materialPrices ? { ...prices, ...initialData.materialPrices } : prices)
    setMaterialRows(rows || [])
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
        .select(
          'labor_rate_per_hour, labor_burden_pct, walk_access_pace_lf_per_min, estimate_gpmd_default, sub_gp_markup_rate, commission_rate'
        )
        .single()
        .then(({ data }) => {
          if (!data) return
          if (data.labor_rate_per_hour != null)
            setLaborRatePerHour(parseFloat(data.labor_rate_per_hour))
          if (data.labor_burden_pct != null)
            setLaborBurdenPct(parseFloat(data.labor_burden_pct))
          if (data.estimate_gpmd_default != null) setGpmd(parseFloat(data.estimate_gpmd_default))
          if (data.sub_gp_markup_rate != null)
            setSubGpMarkupRate(parseFloat(data.sub_gp_markup_rate))
          if (data.commission_rate != null) setCommissionRate(parseFloat(data.commission_rate))
          if (data.walk_access_pace_lf_per_min != null) {
            const _wpace = parseFloat(data.walk_access_pace_lf_per_min)
            setWalkAccess({
              paceLfPerMin: Number.isFinite(_wpace) && _wpace > 0 ? _wpace : null,
            })
          }
        })
    }
    // Always refresh the catalog on open so newly-added Master Rates items appear.
    refreshAllRates().then(() => setPricesLoading(false))
  }, [refreshAllRates])

  // ── State ──────────────────────────────────────────────────────────────────
  const [crewType, setCrewType] = useState(initialData?.crewType ?? 'Masonry')
  const [subType, setSubType] = useState(initialData?.subType ?? 'In-House')
  // Independent In-House vs Sub input records — each tab is its own calculator.
  const [ihTab, setIhTab] = useState(() => makeTab(initialData?.ihData || initialData))
  const [subTab, setSubTab] = useState(() => makeTab(initialData?.subData || {}))
  const isSub = subType === 'Subcontractor'
  const cur = isSub ? subTab : ihTab
  const setCur = isSub ? setSubTab : setIhTab
  // A single setter factory: accepts a value (scalar fields) or an updater fn (row arrays).
  const setField = k => v =>
    setCur(p => ({ ...p, [k]: typeof v === 'function' ? v(p[k]) : v }))
  // Derived active-tab (non-structure) field accessors.
  const difficulty = cur.difficulty
  const setDifficulty = setField('difficulty')
  const hoursAdj = cur.hoursAdj
  const setHoursAdj = setField('hoursAdj')
  const distanceLF = cur.distanceLF
  const setDistanceLF = setField('distanceLF')

  // ── Structure type + per-type struct accessors (mirror Columns colType). Every
  //    type's struct persists independently; only the active one is edited/shown. ─
  const structureType = cur.structureType ?? 'CMU'
  const setStructureType = setField('structureType')
  const activeStruct = cur.structs[structureType] || cur.structs.CMU
  // Set a field on a given type's struct (updater fn or scalar).
  const setStructField = (type, field) => v =>
    setCur(p => ({
      ...p,
      structs: {
        ...p.structs,
        [type]: {
          ...p.structs[type],
          [field]: typeof v === 'function' ? v(p.structs[type][field]) : v,
        },
      },
    }))
  // Active-struct field bindings.
  const rebarSize = activeStruct.rebarSize
  const setRebarSize = setStructField(structureType, 'rebarSize')
  const layoutHrs = activeStruct.layoutHrs
  const setLayoutHrs = setStructField(structureType, 'layoutHrs')
  const wallLF = activeStruct.wallLF
  const setWallLF = setStructField(structureType, 'wallLF')
  const wallHeightIn = activeStruct.wallHeightIn
  const setWallHeightIn = setStructField(structureType, 'wallHeightIn')
  const wallWidthIn = activeStruct.wallWidthIn
  const setWallWidthIn = setStructField(structureType, 'wallWidthIn')
  const footingWidthIn = activeStruct.footingWidthIn
  const setFootingWidthIn = setStructField(structureType, 'footingWidthIn')
  const footingDepthIn = activeStruct.footingDepthIn
  const setFootingDepthIn = setStructField(structureType, 'footingDepthIn')
  const rebarSpacingIn = activeStruct.rebarSpacingIn
  const setRebarSpacingIn = setStructField(structureType, 'rebarSpacingIn')
  const bondBeamCourses = activeStruct.bondBeamCourses
  const setBondBeamCourses = setStructField(structureType, 'bondBeamCourses')
  const pctGrouted = activeStruct.pctGrouted
  const setPctGrouted = setStructField(structureType, 'pctGrouted')
  const pctCurved = activeStruct.pctCurved
  const setPctCurved = setStructField(structureType, 'pctCurved')
  const useGroutPump = activeStruct.useGroutPump
  const setUseGroutPump = setStructField(structureType, 'useGroutPump')
  const structVendor = activeStruct.vendor
  const setStructVendor = setStructField(structureType, 'vendor')
  const structMatType = activeStruct.matType
  const setStructMatType = setStructField(structureType, 'matType')
  const capRows = cur.capRows
  const setCapRows = setField('capRows')
  const wallFinishRows = cur.wallFinishRows
  const setWallFinishRows = setField('wallFinishRows')
  const trenchRows = cur.trenchRows
  const setTrenchRows = setField('trenchRows')
  const updateTrench = (i, field, val) =>
    setTrenchRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  const epLineRows = cur.epLineRows
  const setEpLineRows = setField('epLineRows')
  const epGasRows = cur.epGasRows
  const setEpGasRows = setField('epGasRows')
  const manualRows = cur.manualRows
  const setManualRows = setField('manualRows')

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

  // materialRows MUST come from the live catalog fetch (React state), not from
  // `cur` — the calc reads state.materialRows for all vendor/catalog prices
  // (wall caps, finishes). Without this the catalog is empty and every
  // catalog-priced item resolves to $0.
  const state = { crewType, subType, subGpMarkupRate, commissionRate, ...cur, materialRows }
  const calcRaw = calcFirePit(
    state,
    laborRatePerHour,
    materialPrices,
    gpmd,
    walkAccess,
    laborBurdenPct
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

  const p = dbName => n(materialPrices[dbName])

  function updateManual(i, field, val) {
    setManualRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }

  const setCapRow = (i, field, val) =>
    setCapRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  const setWallFinishRow = (i, field, val) =>
    setWallFinishRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))

  const vendorsForCategory = cat => vendors.filter(v => materialRows.some(r => r.vendor_id === v.id && (r.sub_category === cat || r.category === cat)))
  // Wall-finish vendor list scoped to this module's own Category so it lists only
  // vendors that priced a Wall Finish product under 'Fire Pit' (not OK/Walls).
  const vendorsForFinish = () => vendors.filter(v => materialRows.some(r => r.vendor_id === v.id && r.sub_category === WF_CAT && r.category === WF_CATEGORY))

  function handleSave() {
    onSave({
      notes,
      man_days: parseFloat(calc.manDays.toFixed(2)),
      material_cost: parseFloat(calc.totalMat.toFixed(2)),
      data: {
        ...state,
        ihData: ihTab,
        subData: subTab,
        walkAccess,
        laborRatePerHour,
        laborBurdenPct,
        gpmd,
        materialPrices,
        materialRows,
        vendorNames,
        calc,
      },
    })
  }

  // ── Grouped rate list for the "View Rates" popup (CrewTypeBar). Each section
  //    lists its LABOR rates first, then every MATERIAL rate (per vendor from the
  //    module catalog, Standard first) — mirrors the Walls / Utilities View Rates.
  const vendorNames = Object.fromEntries((vendors || []).map(v => [v.id, v.name]))

  // ── Structure Type-picker option sources (vendor-first, per structure type) ──
  const structVendorOptions = type => subcatVendorOptions(materialRows, SUBCAT_FOR[type], vendorNames)
  const structTypeOptions = (type, vendorSel) =>
    subcatProductOptions(materialRows, SUBCAT_FOR[type], vendorSel).map(o => ({
      value: o.value,
      label: type === 'CMU' || type === 'Modular' ? labelWithDims(o.row) : o.label,
    }))
  // Per-type contribution badge for the sticky tab bar (has a wall entered?).
  const structTypeCount = key => (n(cur.structs?.[key]?.wallLF) > 0 ? 1 : 0)

  // Material rows for a catalog item (matched by name). One row per vendor
  // (Standard first), each editable straight to material_price; falls back to a
  // single Standard row at the current rate when no catalog row exists.
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
          category: 'Fire Pit',
          unitLabel: r0.unit || unit,
          mode: 'currency',
          value: n(r0.unit_cost),
        }))
    }
    return [
      { label: `Standard — ${dbName}`, table: 'material_price', name: dbName, category: 'Fire Pit', unitLabel: unit, mode: 'currency', value: fallback },
    ]
  }
  // Every catalog product tagged with a sub-category (Wall Cap / Wall Finish),
  // one row per vendor (Standard first) — vendor-overridable material prices.
  const catalogBlockItems = (subcat, unit, category) =>
    (materialRows || [])
      .filter(r0 => r0.sub_category === subcat && (!category || r0.category === category))
      .filter(r0 => r0.vendor_id == null || vendorNames[r0.vendor_id])
      .sort((a, b) => {
        const va = a.vendor_id == null ? '' : vendorNames[a.vendor_id] || '~'
        const vb = b.vendor_id == null ? '' : vendorNames[b.vendor_id] || '~'
        return va.localeCompare(vb) || (a.name || '').localeCompare(b.name || '')
      })
      .map(r0 => ({
        label: `${r0.vendor_id ? vendorNames[r0.vendor_id] || 'Vendor' : 'Standard'} — ${r0.name}`,
        table: 'material_price',
        materialId: r0.id,
        vendorId: r0.vendor_id || undefined,
        category: 'Fire Pit',
        unitLabel: r0.unit || unit || 'ea',
        mode: 'currency',
        value: n(r0.unit_cost),
      }))

  return (
    <SubTabContext.Provider value={isSub}>
    <div className="space-y-5">
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
        <div className="px-6 py-2">
          <CrewTypeBar
            crewType={crewType}
            onCrewTypeChange={setCrewType}
            title="Fire Pit"
            moduleType="Fire Pit"
            rateScope={RATE_SCOPE}
            refreshAllRates={refreshAllRates}
            showInlineToggle={false}
          />
        </div>
        {/* ── Frozen Structure-Type sub-tab bar (mirrors ColumnsModule). ── */}
        <div className="px-6 pb-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Structure Type</p>
          <div className="flex gap-2">
            {STRUCT_TYPE_TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setStructureType(t.key)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  structureType === t.key
                    ? 'bg-green-700 text-white border-green-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t.label}
                {structTypeCount(t.key) > 0 ? ' •' : ''}
              </button>
            ))}
          </div>
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

      {calc.laborUnset && calc.laborUnset.length > 0 && (
        <div className="text-xs text-amber-800 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2">
          <span className="font-semibold">Labor rate needed</span> — these gas/electrical items
          contribute 0 labor hours until a rate is set. Click one to set it inline:
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

      {/* ── Fire Pit Installation — per structure type (CMU/PIP/Modular/Brick) ── */}
      <div>
        <SectionHeader title="Fire Pit Installation" />

        {/* Vendor + Type material picker (vendor-first, catalog-sourced). */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Vendor</label>
            <select
              className="input text-sm py-1.5 w-full"
              value={structVendor || 'Standard'}
              onChange={e => {
                setStructVendor(e.target.value)
                setStructMatType('')
              }}
            >
              {structVendorOptions(structureType).map(o => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">{TYPE_LABEL[structureType]}</label>
            {(() => {
              const opts = structTypeOptions(structureType, structVendor)
              return (
                <select
                  className="input text-sm py-1.5 w-full"
                  value={structMatType || ''}
                  onChange={e => setStructMatType(e.target.value)}
                >
                  <option value="">{opts.length ? 'Select…' : 'No products — add in Master Rates'}</option>
                  {structMatType && !opts.some(o => o.value === structMatType) && (
                    <option value={structMatType}>
                      {catalogRowById(materialRows, structMatType)?.name || structMatType}
                    </option>
                  )}
                  {opts.map(o => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              )
            })()}
          </div>
        </div>

        {/* Wall takeoff fields. */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Wall Perimeter (LF)</label>
            <NumInput value={wallLF} onChange={setWallLF} placeholder="0" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Wall Height (inches)</label>
            <NumInput value={wallHeightIn} onChange={setWallHeightIn} placeholder="40" />
          </div>
          {structureType === 'PIP' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Wall Width / Thickness (inches)</label>
              <NumInput value={wallWidthIn} onChange={setWallWidthIn} placeholder="8" />
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Footing Width (inches)</label>
            <NumInput value={footingWidthIn} onChange={setFootingWidthIn} placeholder="12" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Footing Depth (inches)</label>
            <NumInput value={footingDepthIn} onChange={setFootingDepthIn} placeholder="12" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Rebar Spacing (inches)</label>
            <NumInput value={rebarSpacingIn} onChange={setRebarSpacingIn} placeholder="16" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Rebar Size</label>
            <select
              className="input text-sm py-1.5 w-full"
              value={rebarSize}
              onChange={e => setRebarSize(e.target.value)}
              title="Rebar bar size"
            >
              {REBAR_SIZES.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Bond Beam Courses</label>
            <NumInput value={bondBeamCourses} onChange={setBondBeamCourses} placeholder="1" />
          </div>
          {structureType === 'CMU' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">% Grouted</label>
              <div className="relative">
                <NumInput value={pctGrouted} onChange={setPctGrouted} placeholder="100" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  %
                </span>
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-500 mb-1">% Curved Wall</label>
            <div className="relative">
              <NumInput value={pctCurved} onChange={setPctCurved} placeholder="0" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                %
              </span>
            </div>
          </div>
        </div>

        {structureType === 'CMU' && (
          <LabeledRow label="Use Grout Pump?">
            <select
              className="input text-sm py-1.5 w-28"
              value={useGroutPump}
              onChange={e => setUseGroutPump(e.target.value)}
            >
              <option>No</option>
              <option>Yes</option>
            </select>
          </LabeledRow>
        )}

        <LabeledRow label="Layout Time (Hours)">
          <NumInput value={layoutHrs} onChange={setLayoutHrs} placeholder="0" className="w-28" />
        </LabeledRow>

        {n(wallLF) > 0 && (
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-gray-600 flex flex-wrap gap-4">
            {calc.structActive.totalBlocks ? (
              <span>
                Blocks: <strong>{calc.structActive.totalBlocks.toFixed(0)}</strong> ({calc.structActive.blocksPerCourse} × {calc.structActive.coursesCount} courses + 10% waste)
              </span>
            ) : null}
            {calc.structActive.bricks ? (
              <span>
                Bricks: <strong>{Math.round(calc.structActive.bricks)}</strong> ({calc.structActive.faceSF?.toFixed(0)} Sq Ft face)
              </span>
            ) : null}
            {calc.structActive.pourCY ? (
              <span>
                Concrete: <strong>{calc.structActive.pourCY.toFixed(3)} Cu Yd</strong>
              </span>
            ) : null}
            <span>
              Footing: <strong>{(calc.structActive.footingCY || 0).toFixed(3)} Cu Yd</strong>
            </span>
            {calc.structActive.groutCY ? (
              <span>
                Grout: <strong>{calc.structActive.groutCY.toFixed(3)} Cu Yd</strong>
              </span>
            ) : null}
            <span>
              Rebar: <strong>{(calc.structActive.totalRebarLF || 0).toFixed(0)} Ln Ft</strong>
            </span>
            {calc.structActive.curveAddHrs > 0 && (
              <span>
                Curve add: <strong>{calc.structActive.curveAddHrs.toFixed(2)} hrs</strong>
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Wall Caps ── */}
      <div>
        <SectionHeader title="Wall Caps" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="w-[128px]" />
              <col />
              <col className="w-[84px]" />
              <col className="w-[96px]" />
              <col className="w-[112px]" />
              <col className="w-6" />
            </colgroup>
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-center pb-1 pr-2 font-medium">Vendor</th>
                <th className="text-center pb-1 pr-2 font-medium">Type</th>
                <th className="text-center pb-1 pr-2 font-medium">Ln Ft</th>
                <th className="text-center pb-1 pr-2 font-medium text-gray-400">$ per Ln Ft</th>
                <th className="text-center pb-1 font-medium text-gray-400">Material $</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {capRows.map((row, i) => {
                const meta = CAP_META[row.type] || masterWallMeta(CAP_CAT, row.type, materialRows, null, row.vendor)
                const rc = calc.capCalc?.[i] || {}
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-2">
                      <select
                        className="border border-gray-200 rounded-md px-2 py-1.5 text-xs bg-white w-full"
                        value={row.vendor || 'Standard'}
                        onChange={e => setCapRow(i, 'vendor', e.target.value)}
                        title="Vendor — overrides material price"
                      >
                        <option value="Standard">Standard</option>
                        {vendorsForCategory(CAP_CAT).map(v => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1 pr-2">
                      <span className="flex items-center gap-1">
                        <select
                          className="border border-gray-200 rounded-md px-2 py-1.5 text-xs bg-white flex-1 min-w-0"
                          value={row.type || ''}
                          onChange={e => setCapRow(i, 'type', e.target.value)}
                        >
                          {(() => {
                            const capOpts = masterWallOptions(CAP_CAT, CAP_LIST, materialRows, null, row.vendor)
                            return (
                              <>
                                {!row.type && <option value="">Select cap</option>}
                                {row.type && !capOpts.includes(row.type) && (
                                  <option value={row.type}>{row.type}</option>
                                )}
                                {capOpts.map(t => (
                                  <option key={t} value={t}>
                                    {t}
                                  </option>
                                ))}
                              </>
                            )
                          })()}
                        </select>
                      </span>
                    </td>
                    <td className="py-1 pr-2">
                      <NumInput value={row.lf} onChange={v => setCapRow(i, 'lf', v)} className="w-full text-center" />
                    </td>
                    <td className="py-1 pr-2 text-center text-gray-400 text-xs">
                      {rc.unit ? `$${rc.unit.toFixed(2)} per Ln Ft` : '—'}
                    </td>
                    <td className="py-1 text-center text-xs text-gray-600">
                      {rc.mat > 0 ? `$${rc.mat.toFixed(2)}` : '—'}
                      {rc.hrs > 0 ? (
                        <span className="text-gray-400"> · {rc.hrs.toFixed(1)}h</span>
                      ) : null}
                    </td>
                    <td className="py-1 text-center">
                      {capRows.length > 1 && (
                        <button
                          type="button"
                          className="text-gray-300 hover:text-red-500"
                          title="Remove row"
                          onClick={() => setCapRows(rs => rs.filter((_, idx) => idx !== i))}
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
            onClick={() => setCapRows(rs => [...rs, CAP_ROW()])}
          >
            + Add row
          </button>
        </div>
      </div>

      {/* ── Trenching (mirrors Utilities) ── */}
      <div>
        <SectionHeader title="Trenching" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1 pr-2 font-medium">Method</th>
                <th className="text-left pb-1 pr-2 font-medium">Linear Feet</th>
                <th className="text-left pb-1 pr-2 font-medium">Width (In)</th>
                <th className="text-left pb-1 font-medium">Depth (In)</th>
                <th className="text-right pb-1 font-medium text-gray-400">Est. Hrs</th>
              </tr>
            </thead>
            <tbody>
              {trenchRows.map((row, i) => {
                const hrs = trenchRowHrs(row, materialPrices).hrs
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-2">
                      <select
                        className="input text-sm py-1 flex-1 min-w-0"
                        value={row.equipment}
                        onChange={e => updateTrench(i, 'equipment', e.target.value)}
                      >
                        <option>Trench</option>
                        <option>Hand</option>
                      </select>
                    </td>
                    <td className="py-1 pr-2">
                      <NumInput value={row.lf} onChange={v => updateTrench(i, 'lf', v)} />
                    </td>
                    <td className="py-1 pr-2">
                      <NumInput value={row.width} onChange={v => updateTrench(i, 'width', v)} />
                    </td>
                    <td className="py-1">
                      <NumInput value={row.depth} onChange={v => updateTrench(i, 'depth', v)} />
                    </td>
                    <td className="py-1 text-right text-gray-500 text-xs pl-2">{hrs > 0 ? hrs.toFixed(2) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <button
            type="button"
            className="mt-1 text-xs text-green-700 hover:text-green-900 font-medium"
            onClick={() => setTrenchRows(r => [...r, TRENCH_ROW()])}
          >
            + Add row
          </button>
        </div>
      </div>

      {/* ── Gas Line ── */}
      <div>
        <SectionHeader title="Gas Line" />
        <EpTable
          rows={epLineRows}
          setRows={setEpLineRows}
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
      </div>

      {/* ── Gas Fixtures ── */}
      <div>
        <SectionHeader title="Gas Fixtures" />
        <EpTable
          rows={epGasRows}
          setRows={setEpGasRows}
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
      </div>

      {/* ── Wall Finishes — CMU + PIP only (hidden on Modular + Brick). Rows are
          tab-level so entered data still prices when hidden. ── */}
      {(structureType === 'CMU' || structureType === 'PIP') && (
      <div>
        <SectionHeader title="Wall Finishes" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="w-[128px]" />
              <col />
              <col className="w-[72px]" />
              <col className="w-[96px]" />
              <col className="w-[112px]" />
            </colgroup>
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-center pb-1 pr-2 font-medium">Vendor</th>
                <th className="text-center pb-1 pr-2 font-medium">Type</th>
                <th className="text-center pb-1 pr-2 font-medium">Sq Ft</th>
                <th className="text-center pb-1 pr-2 font-medium text-gray-400">$/Unit</th>
                <th className="text-center pb-1 font-medium text-gray-400">Material $</th>
              </tr>
            </thead>
            <tbody>
              {wallFinishRows.map((row, i) => {
                const meta = WF_META[row.type] || masterWallMeta(WF_CAT, row.type, materialRows, WF_CATEGORY, row.vendor)
                const rc = calc.wallFinishCalc?.[i] || {}
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-2">
                      <select
                        className="border border-gray-200 rounded-md px-2 py-1.5 text-xs bg-white w-full"
                        value={row.vendor || 'Standard'}
                        onChange={e => setWallFinishRow(i, 'vendor', e.target.value)}
                        title="Vendor — overrides material price"
                      >
                        <option value="Standard">Standard</option>
                        {vendorsForFinish().map(v => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1 pr-2">
                      <span className="flex items-center gap-1">
                        <select
                          className="border border-gray-200 rounded-md px-2 py-1.5 text-xs bg-white flex-1 min-w-0"
                          value={row.type || ''}
                          onChange={e => setWallFinishRow(i, 'type', e.target.value)}
                        >
                          {/* Options are the canonical finishes (WF_META keys), NOT raw
                              catalog names. masterWallOptions dumped every 'Finish Material'
                              row — junk (Concrete Truck, *Flatwork) + full '<Type> - Finishes'
                              names — none of which round-trip to a WF_META key, so every
                              selectable finish dropped to masterWallMeta and zeroed
                              material+labor (Fire Pit's default type is empty, so NO finish
                              priced). Every WF_LIST option maps to WF_META → FP_RATES (shared
                              '- Finishes' record). Same fix as Outdoor Kitchen. */}
                          {!row.type && <option value="">Select material</option>}
                          {row.type && !WF_LIST.includes(row.type) && (
                            <option value={row.type}>{row.type}</option>
                          )}
                          {WF_LIST.map(t => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </span>
                    </td>
                    <td className="py-1 pr-2">
                      <NumInput value={row.sf} onChange={v => setWallFinishRow(i, 'sf', v)} className="w-full text-center" />
                    </td>
                    <td className="py-1 pr-2 text-center text-gray-400 text-xs">
                      {rc.unit ? `$${rc.unit.toFixed(2)}/${meta?.unit === 'ton' ? 'ton' : 'SF'}` : '—'}
                    </td>
                    <td className="py-1 text-center text-xs text-gray-600">
                      {rc.mat > 0 ? `$${rc.mat.toFixed(2)}` : '—'}
                      {rc.hrs > 0 ? (
                        <span className="text-gray-400"> · {rc.hrs.toFixed(1)}h</span>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
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
