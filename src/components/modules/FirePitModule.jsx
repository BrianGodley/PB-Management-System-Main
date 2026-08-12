import WorkTypeChooser from './WorkTypeChooser'
import CrewTypeBar from './CrewTypeBar'
import ModuleHeaderSlot from './ModuleHeaderSlot'
import { useState, useEffect, useCallback, useContext } from 'react'
import { SubTabContext, subSectionTitle } from './subTabContext'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import { fetchSalesTaxRate } from '../../lib/companyDefaults'
import { calcWalkAccessLabor, DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN } from '../../lib/walkAccess'
import { groutCuFtPerBlock } from '../../lib/cmuGrout'
import { catalogItemFor, catalogOptions, fetchModuleCatalog, fetchStandardRateMap } from '../../lib/materialCatalog'

const CATALOG_OPTS = { standardRows: 'exclude', stripPrefix: true }

// ─────────────────────────────────────────────────────────────────────────────
// Fire Pit Module — based on Fire Pit Module tab in Excel estimator
// Covers: CMU block walls, wall caps, gas line + gas fixtures, wall finishes,
//         manual entry. Wall finishes + caps + gas use the same vendor·type
//         picker patterns ported from the Outdoor Kitchen module.
// Standard CMU block: 16"L × 8"H × 8"W
// ─────────────────────────────────────────────────────────────────────────────

const FP_RATES = {
  // ── Structural material costs ───────────────────────────────────────────────
  fpBlock: { dbName: 'FP Block', fallback: 2.5 }, // $/block
  fpRebar: { dbName: 'FP Rebar', fallback: 0.5 }, // $/LF
  fpConcrete: { dbName: 'FP Concrete', fallback: 149.5 }, // $/CY (footing & grout)
  fpGroutPump: { dbName: 'FP Grout Pump Setup', fallback: 150.0 }, // flat fee when pump used

  // ── Subcontractor flat structure rates (Sub tab only) ───────────────────────
  // On the Sub tab the itemized block/rebar/footing/grout takeoff is replaced by
  // a flat price: wall perimeter × $/LF + wall face area × $/SF. This covers the
  // wall build AND cap install labor.
  fpSubStructLF: { dbName: 'FP Sub Structure $/LF', fallback: 0 }, // $/LF wall build
  fpSubStructHtSF: { dbName: 'FP Sub Structure Ht $/SF', fallback: 0 }, // $/SF wall face

  // ── Wall cap costs — simple $/LF master rate + hrs/LF labor coefficient per
  //    cap type, resolved by Type like the OK finishes (vendor-overridable).
  capFlagstone: { dbName: 'FP Cap Flagstone', fallback: 18.0 }, // $/LF
  capPrecast: { dbName: 'FP Cap Precast', fallback: 12.0 }, // $/LF
  capPipConcrete: { dbName: 'FP Cap PIP Concrete', fallback: 10.0 }, // $/LF
  capBullnose: { dbName: 'FP Cap Bullnose Brick', fallback: 5.0 }, // $/LF
  capFlagstoneLab: { dbName: 'FP Cap Flagstone Labor Rate', fallback: 0.25 }, // hrs/LF
  capPrecastLab: { dbName: 'FP Cap Precast Labor Rate', fallback: 0.2 }, // hrs/LF
  capPipConcreteLab: { dbName: 'FP Cap PIP Concrete Labor Rate', fallback: 0.15 }, // hrs/LF
  capBullnoseLab: { dbName: 'FP Cap Bullnose Brick Labor Rate', fallback: 0.08 }, // hrs/LF

  // ── Wall finish material costs ──────────────────────────────────────────────
  sandStucco: { dbName: 'Sand Stucco - FP', fallback: 0.0 }, // $/SF (labor only by default)
  smoothStucco: { dbName: 'Smooth Stucco - FP', fallback: 0.0 }, // $/SF
  ledgerstone: { dbName: 'Ledgerstone - FP', fallback: 10.0 }, // $/SF panel
  stackedStone: { dbName: 'Stacked Stone - FP', fallback: 10.0 }, // $/SF panel
  tile: { dbName: 'Tile - FP', fallback: 6.5 }, // $/SF
  realFlagstone: { dbName: 'Real Flagstone - FP', fallback: 400.0 }, // $/ton (editable per-job)
  realStone: { dbName: 'Real Stone - FP', fallback: 400.0 }, // $/ton (editable per-job)

  // ── Labor productivity rates ────────────────────────────────────────────────
  digLab: { dbName: 'FP Dig Footing Labor Rate', fallback: 4.0 }, // CF/hr
  rebarLab: { dbName: 'FP Set Rebar Labor Rate', fallback: 35.0 }, // LF/hr
  blockLab: { dbName: 'FP Set Blocks Labor Rate', fallback: 10.4 }, // blocks/hr
  handGroutLab: { dbName: 'FP Hand Grout Labor Rate', fallback: 5.5 }, // CF/hr
  pumpGroutLab: { dbName: 'FP Pump Grout Labor Rate', fallback: 81.0 }, // CF/hr
  sandStuccoLab: { dbName: 'Sand Stucco - FP Labor Rate', fallback: 92 }, // SF/day
  smoothStuccoLab: { dbName: 'Smooth Stucco - FP Labor Rate', fallback: 65 }, // SF/day
  ledgerstoneLab: { dbName: 'Ledgerstone - FP Labor Rate', fallback: 24 }, // SF/day
  stackedStoneLab: { dbName: 'Stacked Stone - FP Labor Rate', fallback: 24 }, // SF/day
  tileLab: { dbName: 'Tile - FP Labor Rate', fallback: 0.2867 }, // hrs/SF (layout+install)
  flagstoneLab: { dbName: 'Real Flagstone - FP Labor Rate', fallback: 0.4487 }, // hrs/SF (delivery+install+seal)
  realStoneLab: { dbName: 'Real Stone - FP Labor Rate', fallback: 0.8954 }, // hrs/SF (transport+install+seal)
}

const DEFAULTS = {
  laborRatePerHour: 35,
  laborBurdenPct: 0.29,
  gpmd: 425,
  commissionRate: 0.12,
}

const n = v => parseFloat(v) || 0

// Standard CMU block dimensions (inches)
const BLOCK_LENGTH_IN = 16
const BLOCK_HEIGHT_IN = 8
const BLOCK_WIDTH_IN = 8
// Grout fill per block — standardized cu-ft/block model shared across all CMU
// modules (8x8x16 = 0.5 cu ft). Priced at the concrete rate (fpConcrete).
const GROUT_CF_PER_BLOCK = groutCuFtPerBlock(BLOCK_WIDTH_IN, BLOCK_HEIGHT_IN)

// ── Wall-finish vendor catalog (ported from Outdoor Kitchen) ──────────────────
// A real vendor overrides ONLY the material unit price for a finish (matched by
// its Type label in the vendor's catalog under the given sub_category); Standard
// keeps the built-in per-estimate / master-rate price. Labor is never affected.
const WF_CAT = 'Wall Finish'
const CAP_CAT = 'Wall Cap'
function wfVendorPrice(vendorSel, typeLabel, materialRows, cat = WF_CAT, opts = {}) {
  const row = catalogItemFor(materialRows, cat, vendorSel, typeLabel, { ...CATALOG_OPTS, ...opts })
  return row ? n(row.unit_cost) : null
}
// Wall-finish master list. Each Type resolves a material unit price (FP_RATES
// key, vendor-overridable) + a labor rate. `unit:'SF'` prices per SF (optional
// waste / screw / adhesive add-ons); `unit:'ton'` prices per ton (SF÷tonPerSF)
// with delivery + misc. labMode 'perDay' → hrs=(SF/rate)*8, 'perSF' → hrs=SF*rate.
const WF_META = {
  'Sand Stucco': { key: 'sandStucco', labKey: 'sandStuccoLab', unit: 'SF', labMode: 'perDay' },
  'Smooth Stucco': { key: 'smoothStucco', labKey: 'smoothStuccoLab', unit: 'SF', labMode: 'perDay' },
  'Ledgerstone Veneer': { key: 'ledgerstone', labKey: 'ledgerstoneLab', unit: 'SF', labMode: 'perDay', waste: 1.1, screwPer5: 2 },
  'Stacked Stone Veneer': { key: 'stackedStone', labKey: 'stackedStoneLab', unit: 'SF', labMode: 'perDay', waste: 1.1, screwPer5: 2 },
  Tile: { key: 'tile', labKey: 'tileLab', unit: 'SF', labMode: 'perSF', adhesivePerSF: 1 },
  'Real Flagstone': { key: 'realFlagstone', labKey: 'flagstoneLab', unit: 'ton', tonPerSF: 80, labMode: 'perSF', delivPerTon: 80, misc: 268.75 },
  'Real Stone': { key: 'realStone', labKey: 'realStoneLab', unit: 'ton', tonPerSF: 70, labMode: 'perSF', delivPerTon: 180, addPerSF: 1 },
}
const WF_LIST = Object.keys(WF_META)
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
function masterWallMeta(cat, typeLabel, materialRows, category = null) {
  const r = catalogItemFor(materialRows, cat, 'Standard', typeLabel, {
    standardRows: 'null-vendor',
    stripPrefix: true,
    fallbackFirst: false,
    category,
  })
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
  const extra = catalogOptions(materialRows, cat, 'Standard', { standardRows: 'null-vendor', stripPrefix: true, category })
    .map(o => o.label)
    .filter(l => !builtInList.includes(l))
  return extra.length ? [...builtInList, ...extra] : builtInList
}

// ── Electrical & Plumbing catalog — GAS ONLY (ported from Utilities module) ────
// Rates live in material_rates / labor_rates under category 'Utilities' so they
// stay a single source of truth shared with the Utilities module. Fallbacks
// below are used only when the DB row is absent. A vendor overrides ONLY the
// material price for the selected item; labor always comes from the built-in.
const UTILITY_LINE_TYPES = {
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
const LINE_TYPE_ARR = Object.entries(UTILITY_LINE_TYPES).map(([label, t]) => ({ label, dbName: t.dbName, fallback: t.costPerLF, laborDbName: t.laborDbName, laborFallback: t.laborPerLF }))
const GAS_TYPE_ARR = Object.entries(GAS_FIXTURE_TYPES).map(([label, t]) => ({ label, dbName: t.dbName, fallback: t.cost, laborDbName: t.laborDbName, laborFallback: t.laborHrs }))
const UTIL_CAT = { line: 'Utility Lines', gas: 'Gas Fixtures' }
// Gas Type options — VENDOR-FIRST (like Utilities). Standard/unset → the
// null-vendor (Standard) catalog items merged with the built-in list (built-in
// fallback); a real vendor → ONLY that vendor's catalog items.
function mergedUtilTypes(cat, builtInArr, materialRows, vendorSel = 'Standard') {
  const isStd = !vendorSel || vendorSel === 'Standard' || vendorSel === 'auto'
  if (!isStd) {
    // Real vendor → only that vendor's catalog items (no built-in fallback).
    return catalogOptions(materialRows, cat, vendorSel, { standardRows: 'null-vendor', stripPrefix: true })
      .map(o => {
        const bi = builtInArr.find(b => b.label === o.label)
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
function resolveUtilRow(cat, row, houseArr, materialRows, mp) {
  const vsel = row.vendor && row.vendor !== 'auto' ? row.vendor : 'Standard'
  // Type options are the SELECTED VENDOR'S items (vendor-first, like Paver).
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

// ── Calculation engine ────────────────────────────────────────────────────────
function calcFirePit(
  state,
  lrph = DEFAULTS.laborRatePerHour,
  mp = {},
  gpmd = DEFAULTS.gpmd,
  walkAccess = null,
  laborBurdenPct = DEFAULTS.laborBurdenPct
) {
  const _pace = parseFloat(walkAccess?.paceLfPerMin) || DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN
  const {
    difficulty,
    hoursAdj,
    layoutHrs,
    wallLF,
    wallHeightIn,
    footingWidthIn,
    footingDepthIn,
    rebarSpacingIn,
    bondBeamCourses,
    pctGrouted,
    pctCurved,
    useGroutPump,
    capRows,
    wallFinishRows,
    epLineRows,
    epGasRows,
    manualRows,
    materialRows,
  } = state

  const p = (dbName, fallback) => mp[dbName] ?? fallback
  const isSubTab = state.subType === 'Subcontractor'

  // ── Wall finish per-row calc: material (vendor-overridable unit) + labor ──────
  const finishRowCalc = row => {
    const meta = WF_META[row.type] || masterWallMeta(WF_CAT, row.type, materialRows, 'Fire Pit')
    const sf = n(row.sf)
    if (!meta || sf <= 0) return { mat: 0, hrs: 0 }
    const houseUnit = meta.master
      ? meta.matUnit
      : p(FP_RATES[meta.key].dbName, FP_RATES[meta.key].fallback)
    const unit = wfVendorPrice(row.vendor, row.type, materialRows, WF_CAT, { category: 'Fire Pit' }) ?? houseUnit
    let mat = 0
    if (meta.unit === 'ton') {
      const tons = sf / meta.tonPerSF
      mat =
        tons * unit +
        tons * (meta.delivPerTon || 0) +
        (meta.misc || 0) +
        (meta.addPerSF ? sf * meta.addPerSF : 0)
    } else {
      mat =
        sf * unit * (meta.waste || 1) +
        (meta.screwPer5 ? (sf / 5) * meta.screwPer5 : 0) +
        (meta.adhesivePerSF ? sf * meta.adhesivePerSF : 0)
    }
    const labRate = meta.master
      ? meta.laborCoeff
      : p(FP_RATES[meta.labKey].dbName, FP_RATES[meta.labKey].fallback)
    const hrs = meta.labMode === 'perDay' ? (labRate > 0 ? (sf / labRate) * 8 : 0) : sf * labRate
    return { mat, hrs, unit }
  }
  const wallFinishCalc = (wallFinishRows || []).map(finishRowCalc)
  const finishMat = wallFinishCalc.reduce((s, c) => s + c.mat, 0)
  const finishHrs = wallFinishCalc.reduce((s, c) => s + c.hrs, 0)

  // ── Wall cap per-row calc: $/LF material (vendor-overridable) + hrs/LF labor ──
  const capRowCalc = row => {
    const meta = CAP_META[row.type] || masterWallMeta(CAP_CAT, row.type, materialRows)
    const lf = n(row.lf)
    if (!meta || lf <= 0) return { mat: 0, hrs: 0 }
    const houseUnit = meta.master
      ? meta.matUnit
      : p(FP_RATES[meta.matKey].dbName, FP_RATES[meta.matKey].fallback)
    const unit = wfVendorPrice(row.vendor, row.type, materialRows, CAP_CAT) ?? houseUnit
    const labCoef = meta.master
      ? meta.laborCoeff
      : p(FP_RATES[meta.labKey].dbName, FP_RATES[meta.labKey].fallback)
    return { mat: lf * unit, hrs: lf * labCoef, unit }
  }
  const capCalc = (capRows || []).map(capRowCalc)
  const capMat = capCalc.reduce((s, c) => s + c.mat, 0)
  // Cap install labor is billed on the In-House tab only; on the Sub tab the flat
  // structure price already covers cap install labor (cap material still counts).
  const capHrs = isSubTab ? 0 : capCalc.reduce((s, c) => s + c.hrs, 0)

  // ── Gas Line + Gas Fixtures (Utilities catalog, gas only) ─────────────────────
  // Gas Line = pipe labor + material PLUS trenching (6" wide × 24" deep per LF,
  // = 1.0 cf/LF at the Utilities trench excavation rate) — this replaces the old
  // separate Trench section. Vendor overrides only the material unit price.
  const GAS_TRENCH_CF_PER_LF = (6 / 12) * (24 / 12) // = 1.0
  const gasTrenchMinsPerCF = mp['Utilities Trench Excavation'] ?? 10
  let epHrs = 0
  let epMat = 0
  ;(epLineRows || []).forEach(r => {
    if (!r.type) return
    const lf = n(r.lf)
    if (lf <= 0) return
    const { matCost, laborVal } = resolveUtilRow(UTIL_CAT.line, r, LINE_TYPE_ARR, materialRows, mp)
    epMat += lf * matCost
    epHrs += lf * laborVal
    epHrs += (lf * GAS_TRENCH_CF_PER_LF * gasTrenchMinsPerCF) / 60 // 6"×24" trenching
  })
  ;(epGasRows || []).forEach(r => {
    if (!r.type) return
    const qty = n(r.qty)
    if (qty <= 0) return
    const { matCost, laborVal } = resolveUtilRow(UTIL_CAT.gas, r, GAS_TYPE_ARR, materialRows, mp)
    epMat += qty * matCost
    epHrs += qty * laborVal
  })

  // ── Block geometry ───────────────────────────────────────────────────────────
  const blocksPerCourse = n(wallLF) > 0 ? Math.ceil((n(wallLF) * 12) / BLOCK_LENGTH_IN) : 0
  const coursesCount = n(wallHeightIn) > 0 ? Math.ceil(n(wallHeightIn) / BLOCK_HEIGHT_IN) : 0
  const rawBlocks = blocksPerCourse * coursesCount
  const totalBlocks = rawBlocks * 1.1 // +10% waste for ordering

  // ── Footing ──────────────────────────────────────────────────────────────────
  const footingCF = (n(footingWidthIn) / 12) * (n(footingDepthIn) / 12) * n(wallLF)
  const footingCY = footingCF / 27

  // ── Grout ────────────────────────────────────────────────────────────────────
  const groutCF = rawBlocks * GROUT_CF_PER_BLOCK * (n(pctGrouted) / 100)
  const groutCY = groutCF / 27

  // ── Rebar ────────────────────────────────────────────────────────────────────
  const vertRebars = n(rebarSpacingIn) > 0 ? Math.ceil((n(wallLF) * 12) / n(rebarSpacingIn)) : 0
  const vertRebarLF = (vertRebars * (n(wallHeightIn) + n(footingDepthIn))) / 12
  const horizRebarLF = (2 + n(bondBeamCourses)) * n(wallLF) // 2 footing bars + bond beams
  const totalRebarLF = vertRebarLF + horizRebarLF

  // ── Labor hours ───────────────────────────────────────────────────────────────
  const layoutHrsN = n(layoutHrs)
  const digHrs = footingCF > 0 ? footingCF / p(FP_RATES.digLab.dbName, FP_RATES.digLab.fallback) : 0
  const rebarHrs =
    totalRebarLF > 0 ? totalRebarLF / p(FP_RATES.rebarLab.dbName, FP_RATES.rebarLab.fallback) : 0
  const setBlockHrs =
    rawBlocks > 0 ? rawBlocks / p(FP_RATES.blockLab.dbName, FP_RATES.blockLab.fallback) : 0
  const groutRate =
    useGroutPump === 'Yes'
      ? p(FP_RATES.pumpGroutLab.dbName, FP_RATES.pumpGroutLab.fallback)
      : p(FP_RATES.handGroutLab.dbName, FP_RATES.handGroutLab.fallback)
  const groutHrs = groutCF > 0 ? groutCF / groutRate : 0

  // Curved adjustment: curved sections take 25% more structural labor
  const structuralBaseHrs = digHrs + rebarHrs + setBlockHrs + groutHrs
  const curveAddHrs = structuralBaseHrs * (n(pctCurved) / 100) * 0.25

  // ── Manual ───────────────────────────────────────────────────────────────────
  let manHrs = 0,
    manMat = 0,
    manSub = 0
  manualRows.forEach(r => {
    manHrs += n(r.hours)
    manMat += n(r.materials)
    manSub += n(r.subCost)
  })

  // ── Material costs ────────────────────────────────────────────────────────────
  const blockMat = totalBlocks * p(FP_RATES.fpBlock.dbName, FP_RATES.fpBlock.fallback)
  const rebarMat = totalRebarLF * p(FP_RATES.fpRebar.dbName, FP_RATES.fpRebar.fallback)
  const footingMat = footingCY * p(FP_RATES.fpConcrete.dbName, FP_RATES.fpConcrete.fallback)
  const groutMat = groutCY * p(FP_RATES.fpConcrete.dbName, FP_RATES.fpConcrete.fallback)
  const pumpSetupMat =
    useGroutPump === 'Yes' && groutCF > 0
      ? p(FP_RATES.fpGroutPump.dbName, FP_RATES.fpGroutPump.fallback)
      : 0

  // ── Structure roll-up (In-House itemized vs Sub flat rate) ───────────────────
  // structureHrs = itemized structure labor; structureMatVal = itemized structure
  // material. Both are EXCLUDED on the Sub tab and replaced by structureSubCost, a
  // flat price driven by wall perimeter + wall face area (covers wall build + cap
  // install labor).
  const structureHrs = layoutHrsN + structuralBaseHrs + curveAddHrs
  const structureMatVal = blockMat + rebarMat + footingMat + groutMat + pumpSetupMat
  const structureSubCost = isSubTab
    ? n(wallLF) * p(FP_RATES.fpSubStructLF.dbName, FP_RATES.fpSubStructLF.fallback) +
      n(wallLF) *
        (n(wallHeightIn) / 12) *
        p(FP_RATES.fpSubStructHtSF.dbName, FP_RATES.fpSubStructHtSF.fallback)
    : 0

  // ── Totals ───────────────────────────────────────────────────────────────────
  const baseHrs =
    (isSubTab ? 0 : structureHrs) +
    capHrs +
    finishHrs +
    epHrs +
    manHrs

  const diffMod = 1 + n(difficulty) / 100
  const _preWalkHrs = baseHrs * diffMod + n(hoursAdj)
  const walkHrs = calcWalkAccessLabor(_preWalkHrs, state.distanceLF, { paceLfPerMin: _pace })
  const totalHrs = _preWalkHrs + walkHrs
  const manDays = totalHrs / 8

  const totalMat =
    (isSubTab ? 0 : structureMatVal) +
    capMat +
    finishMat +
    epMat +
    manMat

  const laborCost = totalHrs * lrph
  const burden = laborCost * (n(laborBurdenPct) || DEFAULTS.laborBurdenPct)
  // On the Sub tab the itemized scope's cost IS the subcontractor cost — labor +
  // burden + material + any manual sub — and profit is the markup (Sub GP). The
  // in-house GP model applies only to the In-House tab.
  const subMarkup = n(state.subGpMarkupRate) || 0.2
  let gp, subCost, subGp, commission, price
  if (isSubTab) {
    gp = 0
    subCost = totalMat + laborCost + burden + structureSubCost + manSub
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
    blocksPerCourse,
    coursesCount,
    rawBlocks,
    totalBlocks,
    footingCF,
    footingCY,
    groutCF,
    groutCY,
    totalRebarLF,
    curveAddHrs,
    structureMat: blockMat + rebarMat + footingMat + groutMat + pumpSetupMat + capMat,
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
    structureSubCost,
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

const DEFAULT_MANUAL_ROWS = [
  { label: 'Misc 1', hours: '', materials: '', subCost: '' },
  { label: 'Misc 2', hours: '', materials: '', subCost: '' },
  { label: 'Misc 3', hours: '', materials: '', subCost: '' },
]

// Per-tab input record. In-House and Sub each hold their own independent copy so
// the two tabs are separate calculators.
function makeTab(src = {}) {
  return {
    difficulty: src.difficulty ?? '',
    hoursAdj: src.hoursAdj ?? '',
    layoutHrs: src.layoutHrs ?? '',
    distanceLF: src.distanceLF ?? '',
    wallLF: src.wallLF ?? '',
    wallHeightIn: src.wallHeightIn ?? '40',
    footingWidthIn: src.footingWidthIn ?? '12',
    footingDepthIn: src.footingDepthIn ?? '12',
    rebarSpacingIn: src.rebarSpacingIn ?? '16',
    bondBeamCourses: src.bondBeamCourses ?? '1',
    pctGrouted: src.pctGrouted ?? '100',
    pctCurved: src.pctCurved ?? '0',
    useGroutPump: src.useGroutPump ?? 'No',
    capRows: src.capRows ?? [CAP_ROW(), CAP_ROW()],
    wallFinishRows: src.wallFinishRows ?? [WF_ROW(), WF_ROW()],
    epLineRows: src.epLineRows ?? [EP_LINE_ROW(), EP_LINE_ROW()],
    epGasRows: src.epGasRows ?? [EP_GAS_ROW(), EP_GAS_ROW()],
    manualRows: src.manualRows ?? DEFAULT_MANUAL_ROWS.map(r => ({ ...r })),
  }
}

// ── Main component ────────────────────────────────────────────────────────────
export default function FirePitModule({ onSave, onBack, saving, initialData }) {
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
      fetchStandardRateMap(['Fire Pit', 'Utilities']),
      supabase
        .from('labor_rates')
        .select('name, rate')
        .in('category', ['Fire Pit', 'Utilities']),
      fetchModuleCatalog(['Fire Pit', 'Walls', 'Utilities']),
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
    // Always refresh the catalog on open so newly-added Master Rates items appear.
    refreshAllRates().then(() => setPricesLoading(false))
  }, [refreshAllRates])

  const gpmd = initialData?.gpmd ?? DEFAULTS.gpmd
  const subGpMarkupRate = initialData?.subGpMarkupRate ?? 0.2

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
  // Derived active-tab field accessors — render bindings stay unchanged.
  const difficulty = cur.difficulty
  const setDifficulty = setField('difficulty')
  const hoursAdj = cur.hoursAdj
  const setHoursAdj = setField('hoursAdj')
  const layoutHrs = cur.layoutHrs
  const setLayoutHrs = setField('layoutHrs')
  const distanceLF = cur.distanceLF
  const setDistanceLF = setField('distanceLF')
  const wallLF = cur.wallLF
  const setWallLF = setField('wallLF')
  const wallHeightIn = cur.wallHeightIn
  const setWallHeightIn = setField('wallHeightIn')
  const footingWidthIn = cur.footingWidthIn
  const setFootingWidthIn = setField('footingWidthIn')
  const footingDepthIn = cur.footingDepthIn
  const setFootingDepthIn = setField('footingDepthIn')
  const rebarSpacingIn = cur.rebarSpacingIn
  const setRebarSpacingIn = setField('rebarSpacingIn')
  const bondBeamCourses = cur.bondBeamCourses
  const setBondBeamCourses = setField('bondBeamCourses')
  const pctGrouted = cur.pctGrouted
  const setPctGrouted = setField('pctGrouted')
  const pctCurved = cur.pctCurved
  const setPctCurved = setField('pctCurved')
  const useGroutPump = cur.useGroutPump
  const setUseGroutPump = setField('useGroutPump')
  const capRows = cur.capRows
  const setCapRows = setField('capRows')
  const wallFinishRows = cur.wallFinishRows
  const setWallFinishRows = setField('wallFinishRows')
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

  // materialRows (live catalog) intentionally NOT persisted — fetched fresh on open.
  const state = { crewType, subType, subGpMarkupRate, ...cur }
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

  const p = (dbName, fallback) => materialPrices[dbName] ?? fallback

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
  const vendorsForFinish = () => vendors.filter(v => materialRows.some(r => r.vendor_id === v.id && r.sub_category === WF_CAT && r.category === 'Fire Pit'))

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
        calc,
      },
    })
  }

  // ── Grouped rate list for the "View Rates" popup (CrewTypeBar). Each section
  //    lists its LABOR rates first, then every MATERIAL rate (per vendor from the
  //    module catalog, Standard first) — mirrors the Walls / Utilities View Rates.
  const vendorNames = Object.fromEntries((vendors || []).map(v => [v.id, v.name]))
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
  const firePitRateList = [
    {
      group: 'Structure Labor',
      items: [
        {
          label: FP_RATES.digLab.dbName,
          table: 'labor_rates',
          name: FP_RATES.digLab.dbName,
          category: 'Fire Pit',
          mode: 'coefficient',
          unitLabel: 'CF/hr',
          value: p(FP_RATES.digLab.dbName, FP_RATES.digLab.fallback),
        },
        {
          label: FP_RATES.rebarLab.dbName,
          table: 'labor_rates',
          name: FP_RATES.rebarLab.dbName,
          category: 'Fire Pit',
          mode: 'coefficient',
          unitLabel: 'LF/hr',
          value: p(FP_RATES.rebarLab.dbName, FP_RATES.rebarLab.fallback),
        },
        {
          label: FP_RATES.blockLab.dbName,
          table: 'labor_rates',
          name: FP_RATES.blockLab.dbName,
          category: 'Fire Pit',
          mode: 'coefficient',
          unitLabel: 'blk/hr',
          value: p(FP_RATES.blockLab.dbName, FP_RATES.blockLab.fallback),
        },
        {
          label: FP_RATES.handGroutLab.dbName,
          table: 'labor_rates',
          name: FP_RATES.handGroutLab.dbName,
          category: 'Fire Pit',
          mode: 'coefficient',
          unitLabel: 'CF/hr',
          value: p(FP_RATES.handGroutLab.dbName, FP_RATES.handGroutLab.fallback),
        },
        {
          label: FP_RATES.pumpGroutLab.dbName,
          table: 'labor_rates',
          name: FP_RATES.pumpGroutLab.dbName,
          category: 'Fire Pit',
          mode: 'coefficient',
          unitLabel: 'CF/hr',
          value: p(FP_RATES.pumpGroutLab.dbName, FP_RATES.pumpGroutLab.fallback),
        },
        ...matRows(FP_RATES.fpBlock.dbName, 'block', p(FP_RATES.fpBlock.dbName, FP_RATES.fpBlock.fallback)),
        ...matRows(FP_RATES.fpRebar.dbName, 'LF', p(FP_RATES.fpRebar.dbName, FP_RATES.fpRebar.fallback)),
        ...matRows(FP_RATES.fpConcrete.dbName, 'CY', p(FP_RATES.fpConcrete.dbName, FP_RATES.fpConcrete.fallback)),
        ...matRows(FP_RATES.fpGroutPump.dbName, 'flat', p(FP_RATES.fpGroutPump.dbName, FP_RATES.fpGroutPump.fallback)),
      ],
    },
    {
      group: 'Wall Caps',
      items: [
        ...CAP_LIST.map(type => {
          const labKey = CAP_META[type].labKey
          return {
            label: FP_RATES[labKey].dbName,
            table: 'labor_rates',
            name: FP_RATES[labKey].dbName,
            category: 'Fire Pit',
            mode: 'coefficient',
            unitLabel: 'hrs/LF',
            value: p(FP_RATES[labKey].dbName, FP_RATES[labKey].fallback),
          }
        }),
        // Vendor catalog cap products (Wall Cap sub-category) + each built-in
        // Standard cap $/LF rate.
        ...catalogBlockItems(CAP_CAT, 'LF'),
        ...CAP_LIST.flatMap(type => {
          const matKey = CAP_META[type].matKey
          return matRows(FP_RATES[matKey].dbName, 'LF', p(FP_RATES[matKey].dbName, FP_RATES[matKey].fallback))
        }),
      ],
    },
    {
      group: 'Wall Finishes',
      items: [
        ...WF_LIST.map(type => {
          const meta = WF_META[type]
          const labKey = meta.labKey
          return {
            label: FP_RATES[labKey].dbName,
            table: 'labor_rates',
            name: FP_RATES[labKey].dbName,
            category: 'Fire Pit',
            mode: 'coefficient',
            unitLabel: meta.labMode === 'perDay' ? 'SF/day' : 'hrs/SF',
            value: p(FP_RATES[labKey].dbName, FP_RATES[labKey].fallback),
          }
        }),
        // Vendor catalog finish products (Wall Finish sub-category) + each
        // built-in Standard finish material rate.
        ...catalogBlockItems(WF_CAT, 'SF', 'Fire Pit'),
        ...WF_LIST.flatMap(type => {
          const meta = WF_META[type]
          return matRows(FP_RATES[meta.key].dbName, meta.unit === 'ton' ? 'ton' : 'SF', p(FP_RATES[meta.key].dbName, FP_RATES[meta.key].fallback))
        }),
      ],
    },
    {
      group: 'Gas Line',
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
        ...LINE_TYPE_ARR.flatMap(t => matRows(t.dbName, 'LF', materialPrices[t.dbName] ?? t.fallback)),
      ],
    },
    {
      group: 'Gas Fixtures',
      items: [
        ...GAS_TYPE_ARR.map(t => ({
          label: t.laborDbName,
          table: 'labor_rates',
          name: t.laborDbName,
          category: 'Utilities',
          mode: 'coefficient',
          unitLabel: 'hrs/ea',
          value: materialPrices[t.laborDbName] ?? t.laborFallback,
        })),
        ...GAS_TYPE_ARR.flatMap(t => matRows(t.dbName, 'ea', materialPrices[t.dbName] ?? t.fallback)),
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
            rates={firePitRateList}
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

      {/* ── Fire Pit Structure ── */}
      <div>
        <SectionHeader title="Fire Pit Structure (CMU Block)" />
        {isSub ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-3 text-[11px] text-gray-500">
            <p className="font-semibold uppercase tracking-wide text-gray-400 mb-1">
              Subcontractor Structure Rates
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1">
                Structure ${p(FP_RATES.fpSubStructLF.dbName, 0).toFixed(2)}/LF
              </span>
              <span className="inline-flex items-center gap-1">
                Wall Face ${p(FP_RATES.fpSubStructHtSF.dbName, 0).toFixed(2)}/SF
              </span>
            </div>
            <p className="text-[10px] text-gray-400 mt-1 italic">
              Flat sub price covers the wall build and cap install labor.
            </p>
          </div>
        ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-3 text-[11px] text-gray-500">
          <p className="font-semibold uppercase tracking-wide text-gray-400 mb-1">
            FP Structural Rates (click any to edit)
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1">
              Block ${p(FP_RATES.fpBlock.dbName, 2.5).toFixed(2)}/ea
            </span>
            <span className="inline-flex items-center gap-1">
              Rebar ${p(FP_RATES.fpRebar.dbName, 0.5).toFixed(2)}/LF
            </span>
            <span className="inline-flex items-center gap-1">
              Concrete ${p(FP_RATES.fpConcrete.dbName, 149.5).toFixed(2)}/CY
            </span>
            <span className="inline-flex items-center gap-1">
              Grout pump ${p(FP_RATES.fpGroutPump.dbName, 150).toFixed(2)}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
            <span className="inline-flex items-center gap-1">
              Dig {p(FP_RATES.digLab.dbName, 4)} CF/hr
            </span>
            <span className="inline-flex items-center gap-1">
              Rebar {p(FP_RATES.rebarLab.dbName, 35)} LF/hr
            </span>
            <span className="inline-flex items-center gap-1">
              Block {p(FP_RATES.blockLab.dbName, 10.4)} blk/hr
            </span>
            <span className="inline-flex items-center gap-1">
              Hand grout {p(FP_RATES.handGroutLab.dbName, 5.5)} CF/hr
            </span>
            <span className="inline-flex items-center gap-1">
              Pump grout {p(FP_RATES.pumpGroutLab.dbName, 81)} CF/hr
            </span>
          </div>
        </div>
        )}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Wall Perimeter (LF)</label>
            <NumInput value={wallLF} onChange={setWallLF} placeholder="0" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Wall Height (inches)</label>
            <NumInput value={wallHeightIn} onChange={setWallHeightIn} placeholder="40" />
          </div>
          {!isSub && (
            <>
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
            <label className="block text-xs text-gray-500 mb-1">Bond Beam Courses</label>
            <NumInput value={bondBeamCourses} onChange={setBondBeamCourses} placeholder="1" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">% Grouted</label>
            <div className="relative">
              <NumInput value={pctGrouted} onChange={setPctGrouted} placeholder="100" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                %
              </span>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">% Curved Wall</label>
            <div className="relative">
              <NumInput value={pctCurved} onChange={setPctCurved} placeholder="0" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                %
              </span>
            </div>
          </div>
            </>
          )}
        </div>

        {!isSub && (
          <>
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

        <LabeledRow label="Layout Time (Hours)">
          <NumInput value={layoutHrs} onChange={setLayoutHrs} placeholder="0" className="w-28" />
        </LabeledRow>

        {n(wallLF) > 0 && (
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-gray-600 flex flex-wrap gap-4">
            <span>
              Blocks: <strong>{calc.totalBlocks.toFixed(0)}</strong> ({calc.blocksPerCourse} ×{' '}
              {calc.coursesCount} courses + 10% waste)
            </span>
            <span>
              Footing: <strong>{calc.footingCY.toFixed(3)} CY</strong>
            </span>
            <span>
              Grout: <strong>{calc.groutCY.toFixed(3)} CY</strong>
            </span>
            <span>
              Rebar: <strong>{calc.totalRebarLF.toFixed(0)} LF</strong>
            </span>
            {calc.curveAddHrs > 0 && (
              <span>
                Curve add: <strong>{calc.curveAddHrs.toFixed(2)} hrs</strong>
              </span>
            )}
          </div>
        )}
          </>
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
                <th className="text-center pb-1 pr-2 font-medium">LF</th>
                <th className="text-center pb-1 pr-2 font-medium text-gray-400">$/LF</th>
                <th className="text-center pb-1 font-medium text-gray-400">Material $</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {capRows.map((row, i) => {
                const meta = CAP_META[row.type] || masterWallMeta(CAP_CAT, row.type, materialRows)
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
                      {rc.unit ? `$${rc.unit.toFixed(2)}/LF` : '—'}
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

      {/* ── Wall Finishes ── */}
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
                <th className="text-center pb-1 pr-2 font-medium">SF</th>
                <th className="text-center pb-1 pr-2 font-medium text-gray-400">$/Unit</th>
                <th className="text-center pb-1 font-medium text-gray-400">Material $</th>
              </tr>
            </thead>
            <tbody>
              {wallFinishRows.map((row, i) => {
                const meta = WF_META[row.type] || masterWallMeta(WF_CAT, row.type, materialRows, 'Fire Pit')
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
                          {!row.type && <option value="">Select material</option>}
                          {row.type && !masterWallOptions(WF_CAT, WF_LIST, materialRows, 'Fire Pit', row.vendor).includes(row.type) && (
                            <option value={row.type}>{row.type}</option>
                          )}
                          {masterWallOptions(WF_CAT, WF_LIST, materialRows, 'Fire Pit', row.vendor).map(t => (
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

      {/* ── Manual Entry ── */}
      <div>
        <SectionHeader title="Manual Entry" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-center pb-1 pr-2 font-medium">Description</th>
                <th className="text-center pb-1 pr-2 font-medium">Hours</th>
                <th className="text-center pb-1 pr-2 font-medium">Materials $</th>
                <th className="text-center pb-1 font-medium">Sub Cost $</th>
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
                    <NumInput value={row.hours} onChange={v => updateManual(i, 'hours', v)} className="text-center" />
                  </td>
                  <td className="py-1 pr-2">
                    <NumInput
                      value={row.materials}
                      onChange={v => updateManual(i, 'materials', v)}
                      className="text-center"
                    />
                  </td>
                  <td className="py-1">
                    {' '}
                    <NumInput value={row.subCost} onChange={v => updateManual(i, 'subCost', v)} className="text-center" />
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
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
    </SubTabContext.Provider>
  )
}
