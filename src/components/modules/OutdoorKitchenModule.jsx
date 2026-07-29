import WorkTypeChooser from './WorkTypeChooser'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import ModuleNotesField from './ModuleNotesField'
import RateEditPopover from '../RateEditPopover'
import { fetchSalesTaxRate } from '../../lib/companyDefaults'
import { calcWalkAccessLabor, DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN } from '../../lib/walkAccess'

// ─────────────────────────────────────────────────────────────────────────────
// Outdoor Kitchen (BBQ) Module — based on BBQ Module tab in Excel estimator
// Covers: BBQ wall structure, countertop, appliances/services, wall finishes,
//         manual entry
// ─────────────────────────────────────────────────────────────────────────────

const OK_RATES = {
  // ── Material costs ──────────────────────────────────────────────────────────
  bbqBlock: { dbName: 'BBQ Block', fallback: 2.5 }, // $/block
  bbqRebar: { dbName: 'BBQ Rebar', fallback: 0.4 }, // $/LF
  bbqConcrete: { dbName: 'BBQ Concrete', fallback: 149.5 }, // $/CY (footing & counter)
  bbqFillMat: { dbName: 'BBQ Fill Material', fallback: 60.0 }, // $/CY grout/fill
  applianceHardware: { dbName: 'BBQ Appliance Hardware', fallback: 3.0 }, // $/appliance (misc hardware)
  gficOutlet: { dbName: 'GFIC Outlet - BBQ', fallback: 80.0 }, // $/outlet
  sinkPlumbing: { dbName: 'Sink Plumbing - BBQ', fallback: 115.0 }, // $ flat
  gasPipe: { dbName: 'Gas Pipe - BBQ', fallback: 3.0 }, // $/LF
  sandStucco: { dbName: 'Sand Stucco - BBQ', fallback: 0.0 }, // $/SF
  smoothStucco: { dbName: 'Smooth Stucco - BBQ', fallback: 0.0 }, // $/SF
  ledgerstone: { dbName: 'Ledgerstone - BBQ', fallback: 10.0 }, // $/SF
  stackedStone: { dbName: 'Stacked Stone - BBQ', fallback: 10.0 }, // $/SF
  tile: { dbName: 'Tile - BBQ', fallback: 6.5 }, // $/SF
  realFlagstone: { dbName: 'Real Flagstone - BBQ', fallback: 400.0 }, // $/ton (default editable)
  realStone: { dbName: 'Real Stone - BBQ', fallback: 400.0 }, // $/ton (default editable)

  // ── Labor productivity rates ────────────────────────────────────────────────
  excavateLab: { dbName: 'BBQ Excavate Labor Rate', fallback: 5 }, // CF/hr
  rebarLab: { dbName: 'BBQ Rebar Labor Rate', fallback: 146 }, // LF/day
  pourFootingLab: { dbName: 'BBQ Pour Footing Labor Rate', fallback: 4 }, // hrs/CY
  installBlockLab: { dbName: 'BBQ Block Install Labor Rate', fallback: 60 }, // blocks/day
  fillBlockLab: { dbName: 'BBQ Fill Block Labor Rate', fallback: 146 }, // blocks/day (×80/75 factor in calc)
  counterFormLab: { dbName: 'BBQ Counter Form Labor Rate', fallback: 20 }, // LF of form/hr (×2 LF/SF in calc)
  counterPourLab: { dbName: 'BBQ Counter Pour Labor Rate', fallback: 50 }, // SF/day
  counterBroomLab: { dbName: 'BBQ Counter Broom Labor Rate', fallback: 60 }, // SF/day
  counterPolishLab: { dbName: 'BBQ Counter Polish Labor Rate', fallback: 18 }, // SF/day
  applianceLab: { dbName: 'BBQ Appliance Labor Rate', fallback: 2.75 }, // appliances/day
  gficLab: { dbName: 'BBQ GFIC Labor Rate', fallback: 2 }, // hrs/unit
  sinkLab: { dbName: 'BBQ Sink Labor Rate', fallback: 4 }, // hrs flat
  gasTrenchLab: { dbName: 'BBQ Gas Trench Labor Rate', fallback: 35 }, // LF/day
  sandStuccoLab: { dbName: 'Sand Stucco - BBQ Labor Rate', fallback: 92 }, // SF/day
  smoothStuccoLab: { dbName: 'Smooth Stucco - BBQ Labor Rate', fallback: 65 }, // SF/day
  ledgerstoneLab: { dbName: 'Ledgerstone - BBQ Labor Rate', fallback: 24 }, // SF/day
  stackedStoneLab: { dbName: 'Stacked Stone - BBQ Labor Rate', fallback: 24 }, // SF/day
  tileLab: { dbName: 'Tile - BBQ Labor Rate', fallback: 0.2867 }, // hrs/SF (layout+install combined)
  flagstoneLab: { dbName: 'Real Flagstone - BBQ Labor Rate', fallback: 0.4487 }, // hrs/SF (delivery+install+seal)
  realStoneLab: { dbName: 'Real Stone - BBQ Labor Rate', fallback: 0.8954 }, // hrs/SF (transport+install+seal)
}

const DEFAULTS = {
  laborRatePerHour: 35,
  laborBurdenPct: 0.29,
  gpmd: 425,
  commissionRate: 0.12,
}

const COUNTER_FINISHES = ['Broom Finish', 'Polished Finish']

// Fixed equipment list for the Appliances table. Each priced from an editable
// master material rate `BBQ Equip - <type>` (category 'Outdoor Kitchen',
// default 0). Client-provided equipment zeroes material but keeps labor.
const APPLIANCE_TYPES = [
  'BBQ Grill',
  'Side Burner',
  'Power Burner',
  'Refrigerator',
  'Ice Bin / Cooler',
  'Kegerator',
  'Access Door',
  'Drawer Set',
  'Trash Drawer',
  'Sink',
  'Vent Hood',
  'Warming Drawer',
  'Pizza Oven',
  'Kamado / Egg',
  'Other',
]
const applianceRateName = type => `BBQ Equip - ${type}`
const EQUIP_ROW = () => ({ vendor: 'House', type: 'BBQ Grill', qty: '1', clientProvided: false, hours: '' })

const n = v => parseFloat(v) || 0

// ── Wall-finish vendor catalog ───────────────────────────────────────────────
// A real vendor overrides ONLY the material unit price for a finish (matched by
// its Type label in the vendor's 'Wall Finish' catalog); House keeps the
// built-in per-estimate / master-rate price. Labor is never affected.
const WF_CAT = 'Wall Finish'
function wfVendorPrice(vendorSel, typeLabel, materialRows) {
  if (!vendorSel || vendorSel === 'House' || vendorSel === 'auto') return null
  const prefix = `${WF_CAT} - `
  const rows = (materialRows || []).filter(
    r => r.subcategory === WF_CAT && r.vendor_id === vendorSel
  )
  if (!rows.length) return null
  const match =
    rows.find(r => {
      const label = r.name && r.name.startsWith(prefix) ? r.name.slice(prefix.length) : r.name
      return label === typeLabel
    }) || rows[0]
  return match ? n(match.unit_cost) : null
}
// Type labels used to match each finish against the vendor catalog.
const WF_TYPE_LABEL = {
  sandStucco: 'Sand Stucco',
  smoothStucco: 'Smooth Stucco',
  ledgerstone: 'Ledgerstone Veneer',
  stackedStone: 'Stacked Stone Veneer',
  tile: 'Tile',
  flagstone: 'Real Flagstone',
  realStone: 'Real Stone',
}
// Wall-finish master list. Each Type resolves a material unit price (OK_RATES
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
const WF_ROW = () => ({ vendor: 'House', type: 'Tile', sf: '' })

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
// Trenching for utility lines (machine trench, min/cf; from the Utilities schedule).
const OK_TRENCH_RATE_NAME = 'Utilities Trench Excavation'
const OK_TRENCH_FALLBACK_MIN_PER_CF = 10
function resolveUtilRow(cat, row, houseArr, materialRows, mp) {
  const builtIn = houseArr.find(o => o.label === row.type) || houseArr[0]
  const laborVal = mp[builtIn?.laborDbName] ?? builtIn?.laborFallback ?? 0
  let matDbName = builtIn?.dbName
  let matFallback = builtIn?.fallback ?? 0
  const vsel = row.vendor && row.vendor !== 'auto' ? row.vendor : 'House'
  if (vsel && vsel !== 'House') {
    const prefix = `${cat} - `
    const vrow = (materialRows || []).find(r => {
      if (r.subcategory !== cat || r.vendor_id !== vsel) return false
      const label = r.name && r.name.startsWith(prefix) ? r.name.slice(prefix.length) : r.name
      return label === builtIn?.label
    })
    if (vrow) {
      matDbName = vrow.name
      matFallback = n(vrow.unit_cost)
    }
  }
  const matCost = mp[matDbName] ?? matFallback
  const matOpt = { label: builtIn?.label, dbName: matDbName, fallback: matFallback }
  return { opts: houseArr, matOpt, matCost, laborVal, laborBuiltIn: builtIn }
}
const EP_LINE_ROW = () => ({ type: 'PVC Conduit with Electrical', lf: '', vendor: 'House' })
const EP_GAS_ROW = () => ({ type: '12" Single Gas Ring', qty: '', vendor: 'House' })
const EP_ELEC_ROW = () => ({ type: 'GFCI Protected Receptacles', qty: '', vendor: 'House' })

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
                      value={row.vendor || 'House'}
                      onChange={e => upd(i, 'vendor', e.target.value)}
                      title="Vendor"
                    >
                      {vendorsForCategory(cat).map(v => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                      <option value="House">House</option>
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
                      {laborBuiltIn && (
                        <RateEditPopover
                          table="labor_rates"
                          name={laborBuiltIn.laborDbName}
                          category="Utilities"
                          mode="coefficient"
                          unitLabel={`hrs/${unitLabel}`}
                          currentValue={laborVal}
                          onSaved={refreshAllRates}
                        />
                      )}
                    </div>
                  </td>
                  <td className="py-1 pr-2">
                    <NumInput value={row[qtyField]} onChange={v => upd(i, qtyField, v)} className="w-full" />
                  </td>
                  <td className="py-1 text-right text-gray-400 text-xs pr-2">
                    <span className="inline-flex items-center justify-end gap-1">
                      ${matCost.toFixed(2)}
                      {matOpt?.dbName && (
                        <RateEditPopover
                          table="material_rates"
                          name={matOpt.dbName}
                          category="Utilities"
                          unitLabel={unitLabel}
                          currentValue={matCost}
                          onSaved={refreshAllRates}
                        />
                      )}
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

// ── Calculation engine ────────────────────────────────────────────────────────
function calcOutdoorKitchen(
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
    bbqLengthLF,
    bbqHeightIn,
    backLengthLF,
    backHeightIn,
    footingWidthIn,
    footingDepthIn,
    counterSF,
    counterFinish,
    applianceCount,
    gficCount,
    sinkYN,
    gasTrenchLF,
    manualRows,
    materialRows,
    wallFinishRows,
    equipmentRows,
    epLineRows,
    epGasRows,
    epElecRows,
  } = state

  // ── Utility Lines / Gas / Electrical Fixtures ───────────────────────────────
  // Utility Lines combine the line's install labor + material PLUS trenching for
  // a 6" wide × 24" deep trench (per LF) using the Utilities trench excavation
  // rate (min/cf). 6"×24" = 1.0 cf per LF.
  const TRENCH_CF_PER_LF = (6 / 12) * (24 / 12) // = 1.0
  const trenchMinsPerCF = mp[OK_TRENCH_RATE_NAME] ?? OK_TRENCH_FALLBACK_MIN_PER_CF
  let epHrs = 0
  let epMat = 0
  ;(epLineRows || []).forEach(r => {
    const lf = n(r.lf)
    if (lf <= 0) return
    const { matCost, laborVal } = resolveUtilRow(UTIL_CAT.line, r, LINE_TYPE_ARR, materialRows, mp)
    epMat += lf * matCost
    epHrs += lf * laborVal
    epHrs += (lf * TRENCH_CF_PER_LF * trenchMinsPerCF) / 60 // trenching 6"×24"
  })
  ;[
    [epGasRows, UTIL_CAT.gas, GAS_TYPE_ARR],
    [epElecRows, UTIL_CAT.elec, ELEC_TYPE_ARR],
  ].forEach(([rows, cat, arr]) => {
    ;(rows || []).forEach(r => {
      const qty = n(r.qty)
      if (qty <= 0) return
      const { matCost, laborVal } = resolveUtilRow(cat, r, arr, materialRows, mp)
      epMat += qty * matCost
      epHrs += qty * laborVal
    })
  })

  const p = (dbName, fallback) => mp[dbName] ?? fallback
  // Wall finish per-row calc: material (vendor-overridable unit) + labor by type.
  const finishRowCalc = row => {
    const meta = WF_META[row.type]
    const sf = n(row.sf)
    if (!meta || sf <= 0) return { mat: 0, hrs: 0 }
    const houseUnit = p(OK_RATES[meta.key].dbName, OK_RATES[meta.key].fallback)
    const unit = wfVendorPrice(row.vendor, row.type, materialRows) ?? houseUnit
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
    const labRate = p(OK_RATES[meta.labKey].dbName, OK_RATES[meta.labKey].fallback)
    const hrs = meta.labMode === 'perDay' ? (labRate > 0 ? (sf / labRate) * 8 : 0) : sf * labRate
    return { mat, hrs, unit }
  }
  const wallFinishCalc = (wallFinishRows || []).map(finishRowCalc)
  const finishMat = wallFinishCalc.reduce((s, c) => s + c.mat, 0)
  const finishHrs = wallFinishCalc.reduce((s, c) => s + c.hrs, 0)

  // ── Structure derived quantities ────────────────────────────────────────────
  const bbqWallSF = (n(bbqHeightIn) / 12) * n(bbqLengthLF)
  const backWallSF = (n(backHeightIn) / 12) * n(backLengthLF)
  const totalWallSF = bbqWallSF + backWallSF
  const totalLF = n(bbqLengthLF) + n(backLengthLF)

  const blockRaw = totalLF > 0 ? totalWallSF / 0.888 : 0 // blocks
  const blockWaste = blockRaw * 1.1 // +10% waste (used for labor)
  const blockOrdered = blockWaste * 1.1 // +10% again for ordering material

  const footingAreaSF = (n(footingWidthIn) * n(footingDepthIn)) / 144 // SF cross-section
  const footingCY = (totalLF * footingAreaSF) / 27
  const rebarLF = totalLF * 4
  const fillCY = ((n(bbqHeightIn) / 12) * n(bbqLengthLF) * 0.25) / 27 / 2
  const counterCY = (n(counterSF) * 0.33) / 27

  // ── BBQ Install Labor Hours (all rates from DB) ──────────────────────────────
  const layoutLab = n(layoutHrs)
  const excavateHrs =
    totalLF > 0
      ? (totalLF * footingAreaSF) / p(OK_RATES.excavateLab.dbName, OK_RATES.excavateLab.fallback)
      : 0
  const rebarHrs =
    rebarLF > 0 ? (rebarLF / p(OK_RATES.rebarLab.dbName, OK_RATES.rebarLab.fallback)) * 8 : 0
  const pourFootingHrs =
    footingCY > 0
      ? footingCY * p(OK_RATES.pourFootingLab.dbName, OK_RATES.pourFootingLab.fallback)
      : 0
  const installBlockHrs =
    blockWaste > 0
      ? (blockWaste / p(OK_RATES.installBlockLab.dbName, OK_RATES.installBlockLab.fallback)) * 8
      : 0
  const fillBlockHrs =
    blockRaw > 0
      ? (((80 / 75) * blockRaw) / p(OK_RATES.fillBlockLab.dbName, OK_RATES.fillBlockLab.fallback)) *
        8
      : 0
  const counterFormHrs =
    n(counterSF) > 0
      ? (n(counterSF) * 2) / p(OK_RATES.counterFormLab.dbName, OK_RATES.counterFormLab.fallback)
      : 0
  const counterPourHrs =
    n(counterSF) > 0
      ? (n(counterSF) / p(OK_RATES.counterPourLab.dbName, OK_RATES.counterPourLab.fallback)) * 8
      : 0
  const counterBroomHrs =
    counterFinish === 'Broom Finish'
      ? (n(counterSF) / p(OK_RATES.counterBroomLab.dbName, OK_RATES.counterBroomLab.fallback)) * 8
      : 0
  const counterPolishHrs =
    counterFinish === 'Polished Finish'
      ? (n(counterSF) / p(OK_RATES.counterPolishLab.dbName, OK_RATES.counterPolishLab.fallback)) * 8
      : 0
  // Equipment table — per-line labor (hours entered directly, replacing the old
  // single Layout Hours field) + material from the master rate, zeroed when the
  // client provides the unit.
  let equipHrs = 0
  let equipMat = 0
  ;(equipmentRows || []).forEach(r => {
    // Missing qty (older estimates) counts as 1; each unit multiplies labor + material.
    const q = r.qty === undefined || r.qty === null ? 1 : n(r.qty)
    equipHrs += q * n(r.hours)
    if (!r.clientProvided) equipMat += q * p(applianceRateName(r.type), 0)
  })
  const installAppHrs =
    n(applianceCount) > 0
      ? (n(applianceCount) / p(OK_RATES.applianceLab.dbName, OK_RATES.applianceLab.fallback)) * 8
      : 0
  const gficHrs = n(gficCount) * p(OK_RATES.gficLab.dbName, OK_RATES.gficLab.fallback)
  const sinkHrs = sinkYN === 'Yes' ? p(OK_RATES.sinkLab.dbName, OK_RATES.sinkLab.fallback) : 0
  const gasHrs =
    n(gasTrenchLF) > 0
      ? (n(gasTrenchLF) / p(OK_RATES.gasTrenchLab.dbName, OK_RATES.gasTrenchLab.fallback)) * 8
      : 0

  // ── Material Costs ──────────────────────────────────────────────────────────
  const blockMat = blockOrdered * p(OK_RATES.bbqBlock.dbName, OK_RATES.bbqBlock.fallback)
  const rebarMat = rebarLF * p(OK_RATES.bbqRebar.dbName, OK_RATES.bbqRebar.fallback)
  const footingMat = footingCY * p(OK_RATES.bbqConcrete.dbName, OK_RATES.bbqConcrete.fallback)
  const fillMat = fillCY * p(OK_RATES.bbqFillMat.dbName, OK_RATES.bbqFillMat.fallback)
  const counterConcMat = counterCY * p(OK_RATES.bbqConcrete.dbName, OK_RATES.bbqConcrete.fallback)
  const counterPolishMat = counterFinish === 'Polished Finish' ? n(counterSF) : 0 // $1/SF supply
  const applianceMat =
    n(applianceCount) * p(OK_RATES.applianceHardware.dbName, OK_RATES.applianceHardware.fallback)
  const gficMat = n(gficCount) * p(OK_RATES.gficOutlet.dbName, OK_RATES.gficOutlet.fallback)
  const sinkMat =
    sinkYN === 'Yes' ? p(OK_RATES.sinkPlumbing.dbName, OK_RATES.sinkPlumbing.fallback) : 0
  const gasMat = n(gasTrenchLF) * p(OK_RATES.gasPipe.dbName, OK_RATES.gasPipe.fallback)

  // ── Manual ──────────────────────────────────────────────────────────────────
  let manHrs = 0,
    manMat = 0,
    manSub = 0
  manualRows.forEach(r => {
    manHrs += n(r.hours)
    manMat += n(r.materials)
    manSub += n(r.subCost)
  })

  // ── Totals ──────────────────────────────────────────────────────────────────
  const baseHrs =
    equipHrs +
    excavateHrs +
    rebarHrs +
    pourFootingHrs +
    installBlockHrs +
    fillBlockHrs +
    counterFormHrs +
    counterPourHrs +
    counterBroomHrs +
    counterPolishHrs +
    epHrs +
    finishHrs +
    manHrs

  const diffMod = 1 + n(difficulty) / 100
  const _preWalkHrs = baseHrs * diffMod + n(hoursAdj)
  const walkHrs = calcWalkAccessLabor(_preWalkHrs, state.distanceLF, { paceLfPerMin: _pace })
  const totalHrs = _preWalkHrs + walkHrs
  const manDays = totalHrs / 8

  const totalMat =
    blockMat +
    rebarMat +
    footingMat +
    fillMat +
    counterConcMat +
    counterPolishMat +
    equipMat +
    epMat +
    finishMat +
    manMat

  const laborCost = totalHrs * lrph
  const burden = laborCost * (n(laborBurdenPct) || DEFAULTS.laborBurdenPct)
  const gp = manDays * gpmd
  const commission = gp * DEFAULTS.commissionRate
  const subCost = manSub
  const price = totalMat + laborCost + burden + gp + commission + subCost

  return {
    walkHrs,
    totalHrs,
    manDays,
    totalMat,
    laborCost,
    burden,
    gp,
    commission,
    subCost,
    price,
    // derived quantities for display
    blockOrdered,
    blockWaste,
    blockRaw,
    footingCY,
    rebarLF,
    fillCY,
    counterCY,
    // section breakdowns
    structureMat: blockMat + rebarMat + footingMat + fillMat,
    counterMat: counterConcMat + counterPolishMat,
    servicesMat: equipMat + epMat,
    finishesMat: finishMat,
    finishMat,
    finishHrs,
    equipMat,
    epMat,
    epHrs,
    wallFinishCalc,
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────
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

const DEFAULT_MANUAL_ROWS = [
  { label: 'Misc 1', hours: '', materials: '', subCost: '' },
  { label: 'Misc 2', hours: '', materials: '', subCost: '' },
  { label: 'Misc 3', hours: '', materials: '', subCost: '' },
]

// ── Main component ────────────────────────────────────────────────────────────
export default function OutdoorKitchenModule({ onSave, onBack, saving, initialData }) {
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
  const [distanceLF, setDistanceLF] = useState(initialData?.distanceLF ?? '')
  const [walkAccess, setWalkAccess] = useState(
    initialData?.walkAccess ?? {
      paceLfPerMin: DEFAULT_WALK_ACCESS_PACE_LF_PER_MIN,
    }
  )
  const [materialPrices, setMaterialPrices] = useState(initialData?.materialPrices ?? {})
  const [pricesLoading, setPricesLoading] = useState(!initialData?.materialPrices)
  const [materialRows, setMaterialRows] = useState(initialData?.materialRows ?? [])
  const [vendors, setVendors] = useState([])

  // Re-fetch Outdoor Kitchen merged labor+material map. Used on mount and after save.
  const refreshAllRates = useCallback(async () => {
    const [matRes, labRes, matRowsRes, venRes] = await Promise.all([
      supabase
        .from('material_rates')
        .select('name, unit_cost')
        .in('category', ['Outdoor Kitchen', 'Utilities']),
      supabase
        .from('labor_rates')
        .select('name, rate')
        .in('category', ['Outdoor Kitchen', 'Utilities']),
      supabase
        .from('material_rates')
        .select('name, unit_cost, subcategory, vendor_id')
        .not('vendor_id', 'is', null),
      supabase
        .from('subs_vendors')
        .select('id, company_name, supplied_categories')
        .eq('type', 'vendor')
        .order('company_name'),
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
    if (initialData?.materialPrices) return
    refreshAllRates().then(() => setPricesLoading(false))
  }, [refreshAllRates])

  const gpmd = initialData?.gpmd ?? DEFAULTS.gpmd
  const subGpMarkupRate = initialData?.subGpMarkupRate ?? 0.2

  // ── State ──────────────────────────────────────────────────────────────────
  const [difficulty, setDifficulty] = useState(initialData?.difficulty ?? '')
  const [crewType, setCrewType] = useState(initialData?.crewType ?? 'Masonry')
  const [subType, setSubType] = useState(initialData?.subType ?? 'In-House')
  const [hoursAdj, setHoursAdj] = useState(initialData?.hoursAdj ?? '')
  const [layoutHrs, setLayoutHrs] = useState(initialData?.layoutHrs ?? '')
  // Structure
  const [bbqLengthLF, setBbqLengthLF] = useState(initialData?.bbqLengthLF ?? '')
  const [bbqHeightIn, setBbqHeightIn] = useState(initialData?.bbqHeightIn ?? '48')
  const [backLengthLF, setBackLengthLF] = useState(initialData?.backLengthLF ?? '')
  const [backHeightIn, setBackHeightIn] = useState(initialData?.backHeightIn ?? '48')
  const [footingWidthIn, setFootingWidthIn] = useState(initialData?.footingWidthIn ?? '12')
  const [footingDepthIn, setFootingDepthIn] = useState(initialData?.footingDepthIn ?? '12')
  // Countertop
  const [counterSF, setCounterSF] = useState(initialData?.counterSF ?? '')
  const [counterFinish, setCounterFinish] = useState(initialData?.counterFinish ?? 'Broom Finish')
  // Appliances / Services
  const [applianceCount, setApplianceCount] = useState(initialData?.applianceCount ?? '')
  const [gficCount, setGficCount] = useState(initialData?.gficCount ?? '')
  const [sinkYN, setSinkYN] = useState(initialData?.sinkYN ?? 'No')
  const [gasTrenchLF, setGasTrenchLF] = useState(initialData?.gasTrenchLF ?? '')
  // Appliances / Equipment
  const [equipmentRows, setEquipmentRows] = useState(
    initialData?.equipmentRows ?? [EQUIP_ROW(), EQUIP_ROW(), EQUIP_ROW(), EQUIP_ROW()]
  )
  // Electrical & Plumbing (ported from Utilities)
  const [epLineRows, setEpLineRows] = useState(
    initialData?.epLineRows ?? [EP_LINE_ROW(), EP_LINE_ROW()]
  )
  const [epGasRows, setEpGasRows] = useState(initialData?.epGasRows ?? [EP_GAS_ROW(), EP_GAS_ROW()])
  const [epElecRows, setEpElecRows] = useState(
    initialData?.epElecRows ?? [EP_ELEC_ROW(), EP_ELEC_ROW()]
  )
  // Wall Finishes — 2 rows; Type picked from the finish master list.
  const [wallFinishRows, setWallFinishRows] = useState(
    initialData?.wallFinishRows ?? [WF_ROW(), WF_ROW()]
  )
  const [manualRows, setManualRows] = useState(initialData?.manualRows ?? DEFAULT_MANUAL_ROWS)

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

  const state = {
    crewType,
    subType,
    difficulty,
    hoursAdj,
    layoutHrs,
    bbqLengthLF,
    bbqHeightIn,
    backLengthLF,
    backHeightIn,
    footingWidthIn,
    footingDepthIn,
    counterSF,
    counterFinish,
    applianceCount,
    gficCount,
    sinkYN,
    gasTrenchLF,
    wallFinishRows,
    manualRows,
    distanceLF,
    materialRows,
    equipmentRows,
    epLineRows,
    epGasRows,
    epElecRows,
  }
  const calcRaw = calcOutdoorKitchen(
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

  function handleSave() {
    onSave({
      notes,
      man_days: parseFloat(calc.manDays.toFixed(2)),
      material_cost: parseFloat(calc.totalMat.toFixed(2)),
      data: { ...state, walkAccess, laborRatePerHour, laborBurdenPct, gpmd, materialPrices, calc },
    })
  }

  const vendorsForCategory = cat => vendors.filter(v => (v.categories || []).includes(cat))
  const setWallFinishRow = (i, field, val) =>
    setWallFinishRows(rs => rs.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))

  return (
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

      {/* Settings — In-House tab only */}
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

      {/* ── BBQ Structure ── */}
      <div>
        <SectionHeader title="BBQ Structure" />
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-3 text-[11px] text-gray-500">
          <p className="font-semibold uppercase tracking-wide text-gray-400 mb-1">
            BBQ Structural Rates (click any to edit)
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1">
              Block ${p(OK_RATES.bbqBlock.dbName, 2.5).toFixed(2)}/ea
              <RateEditPopover
                table="material_rates"
                name={OK_RATES.bbqBlock.dbName}
                category="Outdoor Kitchen"
                unitLabel="ea"
                currentValue={p(OK_RATES.bbqBlock.dbName, OK_RATES.bbqBlock.fallback)}
                onSaved={refreshAllRates}
              />
            </span>
            <span className="inline-flex items-center gap-1">
              Rebar ${p(OK_RATES.bbqRebar.dbName, 0.4).toFixed(2)}/LF
              <RateEditPopover
                table="material_rates"
                name={OK_RATES.bbqRebar.dbName}
                category="Outdoor Kitchen"
                unitLabel="LF"
                currentValue={p(OK_RATES.bbqRebar.dbName, OK_RATES.bbqRebar.fallback)}
                onSaved={refreshAllRates}
              />
            </span>
            <span className="inline-flex items-center gap-1">
              Concrete ${p(OK_RATES.bbqConcrete.dbName, 149.5).toFixed(2)}/CY
              <RateEditPopover
                table="material_rates"
                name={OK_RATES.bbqConcrete.dbName}
                category="Outdoor Kitchen"
                unitLabel="CY"
                currentValue={p(OK_RATES.bbqConcrete.dbName, OK_RATES.bbqConcrete.fallback)}
                onSaved={refreshAllRates}
              />
            </span>
            <span className="inline-flex items-center gap-1">
              Fill ${p(OK_RATES.bbqFillMat.dbName, 60).toFixed(2)}/CY
              <RateEditPopover
                table="material_rates"
                name={OK_RATES.bbqFillMat.dbName}
                category="Outdoor Kitchen"
                unitLabel="CY"
                currentValue={p(OK_RATES.bbqFillMat.dbName, OK_RATES.bbqFillMat.fallback)}
                onSaved={refreshAllRates}
              />
            </span>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
            <span className="inline-flex items-center gap-1">
              Excavate {p(OK_RATES.excavateLab.dbName, 5)} CF/hr
              <RateEditPopover
                table="labor_rates"
                name={OK_RATES.excavateLab.dbName}
                category="Outdoor Kitchen"
                mode="coefficient"
                unitLabel="CF/hr"
                currentValue={p(OK_RATES.excavateLab.dbName, OK_RATES.excavateLab.fallback)}
                onSaved={refreshAllRates}
              />
            </span>
            <span className="inline-flex items-center gap-1">
              Rebar {p(OK_RATES.rebarLab.dbName, 146)} LF/day
              <RateEditPopover
                table="labor_rates"
                name={OK_RATES.rebarLab.dbName}
                category="Outdoor Kitchen"
                mode="coefficient"
                unitLabel="LF/day"
                currentValue={p(OK_RATES.rebarLab.dbName, OK_RATES.rebarLab.fallback)}
                onSaved={refreshAllRates}
              />
            </span>
            <span className="inline-flex items-center gap-1">
              Pour {p(OK_RATES.pourFootingLab.dbName, 4)} hrs/CY
              <RateEditPopover
                table="labor_rates"
                name={OK_RATES.pourFootingLab.dbName}
                category="Outdoor Kitchen"
                mode="coefficient"
                unitLabel="hrs/CY"
                currentValue={p(OK_RATES.pourFootingLab.dbName, OK_RATES.pourFootingLab.fallback)}
                onSaved={refreshAllRates}
              />
            </span>
            <span className="inline-flex items-center gap-1">
              Block {p(OK_RATES.installBlockLab.dbName, 60)} blk/day
              <RateEditPopover
                table="labor_rates"
                name={OK_RATES.installBlockLab.dbName}
                category="Outdoor Kitchen"
                mode="coefficient"
                unitLabel="blk/day"
                currentValue={p(OK_RATES.installBlockLab.dbName, OK_RATES.installBlockLab.fallback)}
                onSaved={refreshAllRates}
              />
            </span>
            <span className="inline-flex items-center gap-1">
              Fill {p(OK_RATES.fillBlockLab.dbName, 146)} blk/day
              <RateEditPopover
                table="labor_rates"
                name={OK_RATES.fillBlockLab.dbName}
                category="Outdoor Kitchen"
                mode="coefficient"
                unitLabel="blk/day"
                currentValue={p(OK_RATES.fillBlockLab.dbName, OK_RATES.fillBlockLab.fallback)}
                onSaved={refreshAllRates}
              />
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">BBQ Wall Length (LF)</label>
            <NumInput value={bbqLengthLF} onChange={setBbqLengthLF} placeholder="0" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">BBQ Wall Height (inches)</label>
            <NumInput value={bbqHeightIn} onChange={setBbqHeightIn} placeholder="48" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Backsplash Wall Length (LF)</label>
            <NumInput value={backLengthLF} onChange={setBackLengthLF} placeholder="0" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Backsplash Wall Height (inches)
            </label>
            <NumInput value={backHeightIn} onChange={setBackHeightIn} placeholder="48" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Footing Width (inches)</label>
            <NumInput value={footingWidthIn} onChange={setFootingWidthIn} placeholder="12" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Footing Depth (inches)</label>
            <NumInput value={footingDepthIn} onChange={setFootingDepthIn} placeholder="12" />
          </div>
        </div>
        {(n(bbqLengthLF) > 0 || n(backLengthLF) > 0) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-gray-600 flex flex-wrap gap-4">
            <span>
              Blocks: <strong>{calc.blockOrdered.toFixed(0)}</strong>
            </span>
            <span>
              Footing: <strong>{calc.footingCY.toFixed(2)} CY</strong>
            </span>
            <span>
              Rebar: <strong>{calc.rebarLF.toFixed(0)} LF</strong>
            </span>
            <span>
              Fill: <strong>{calc.fillCY.toFixed(3)} CY</strong>
            </span>
          </div>
        )}
      </div>

      {/* ── Countertop ── */}
      <div>
        <SectionHeader title="Concrete Countertop" />
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-2 text-[11px] text-gray-500">
          <p className="font-semibold uppercase tracking-wide text-gray-400 mb-1">
            Countertop Rates (click any to edit)
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1">
              Concrete ${p(OK_RATES.bbqConcrete.dbName, 149.5).toFixed(2)}/CY
              <RateEditPopover
                table="material_rates"
                name={OK_RATES.bbqConcrete.dbName}
                category="Outdoor Kitchen"
                unitLabel="CY"
                currentValue={p(OK_RATES.bbqConcrete.dbName, OK_RATES.bbqConcrete.fallback)}
                onSaved={refreshAllRates}
              />
            </span>
            <span className="inline-flex items-center gap-1">
              Form {p(OK_RATES.counterFormLab.dbName, 20)} LF/hr
              <RateEditPopover
                table="labor_rates"
                name={OK_RATES.counterFormLab.dbName}
                category="Outdoor Kitchen"
                mode="coefficient"
                unitLabel="LF/hr"
                currentValue={p(OK_RATES.counterFormLab.dbName, OK_RATES.counterFormLab.fallback)}
                onSaved={refreshAllRates}
              />
            </span>
            <span className="inline-flex items-center gap-1">
              Pour {p(OK_RATES.counterPourLab.dbName, 50)} SF/day
              <RateEditPopover
                table="labor_rates"
                name={OK_RATES.counterPourLab.dbName}
                category="Outdoor Kitchen"
                mode="coefficient"
                unitLabel="SF/day"
                currentValue={p(OK_RATES.counterPourLab.dbName, OK_RATES.counterPourLab.fallback)}
                onSaved={refreshAllRates}
              />
            </span>
            <span className="inline-flex items-center gap-1">
              Broom {p(OK_RATES.counterBroomLab.dbName, 60)} SF/day
              <RateEditPopover
                table="labor_rates"
                name={OK_RATES.counterBroomLab.dbName}
                category="Outdoor Kitchen"
                mode="coefficient"
                unitLabel="SF/day"
                currentValue={p(OK_RATES.counterBroomLab.dbName, OK_RATES.counterBroomLab.fallback)}
                onSaved={refreshAllRates}
              />
            </span>
            <span className="inline-flex items-center gap-1">
              Polish {p(OK_RATES.counterPolishLab.dbName, 18)} SF/day
              <RateEditPopover
                table="labor_rates"
                name={OK_RATES.counterPolishLab.dbName}
                category="Outdoor Kitchen"
                mode="coefficient"
                unitLabel="SF/day"
                currentValue={p(
                  OK_RATES.counterPolishLab.dbName,
                  OK_RATES.counterPolishLab.fallback
                )}
                onSaved={refreshAllRates}
              />
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Area (SF)</label>
            <NumInput value={counterSF} onChange={setCounterSF} placeholder="0" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Finish</label>
            <select
              className="input text-sm py-1.5"
              value={counterFinish}
              onChange={e => setCounterFinish(e.target.value)}
            >
              {COUNTER_FINISHES.map(f => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>
        {n(counterSF) > 0 && (
          <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-gray-600 flex gap-4">
            <span>
              Counter CY: <strong>{calc.counterCY.toFixed(3)}</strong>
            </span>
            <span>
              Material: <strong>${calc.counterMat.toFixed(2)}</strong>
            </span>
          </div>
        )}
      </div>

      {/* ── Appliances ── */}
      <div>
        <SectionHeader title="Appliances" />
        <div className="space-y-0">
          {/* Equipment — Vendor · Type · Client Provided · Labor · Material */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed">
              <colgroup>
                <col className="w-[128px]" />
                <col />
                <col className="w-[64px]" />
                <col className="w-[104px]" />
                <col className="w-[88px]" />
                <col className="w-[96px]" />
                <col className="w-6" />
              </colgroup>
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-200">
                  <th className="text-left pb-1 pr-2 font-medium">Vendor</th>
                  <th className="text-left pb-1 pr-2 font-medium">Type</th>
                  <th className="text-left pb-1 pr-2 font-medium">Qty</th>
                  <th className="text-left pb-1 pr-2 font-medium">Client Provided</th>
                  <th className="text-left pb-1 pr-2 font-medium">Labor (hrs)</th>
                  <th className="text-right pb-1 pr-2 font-medium text-gray-400">Material $</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {equipmentRows.map((row, i) => {
                  const eqQty = row.qty === undefined || row.qty === null ? 1 : n(row.qty)
                  const eqMat = row.clientProvided ? 0 : eqQty * p(applianceRateName(row.type), 0)
                  const setRow = (field, val) =>
                    setEquipmentRows(rs =>
                      rs.map((r, idx) => (idx === i ? { ...r, [field]: val } : r))
                    )
                  return (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-1 pr-2">
                        <select
                          className="border border-gray-200 rounded-md px-2 py-1.5 text-xs bg-white w-full"
                          value={row.vendor || 'House'}
                          onChange={e => setRow('vendor', e.target.value)}
                        >
                          <option value="House">House</option>
                          {vendorsForCategory('Appliance').map(v => (
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
                            value={row.type}
                            onChange={e => setRow('type', e.target.value)}
                          >
                            {APPLIANCE_TYPES.map(t => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                          <RateEditPopover
                            table="material_rates"
                            name={applianceRateName(row.type)}
                            category="Outdoor Kitchen"
                            unitLabel="ea"
                            currentValue={p(applianceRateName(row.type), 0)}
                            onSaved={refreshAllRates}
                          />
                        </span>
                      </td>
                      <td className="py-1 pr-2">
                        <NumInput value={row.qty} onChange={v => setRow('qty', v)} className="w-full" placeholder="1" />
                      </td>
                      <td className="py-1 pr-2">
                        <select
                          className="border border-gray-200 rounded-md px-2 py-1.5 text-xs bg-white w-full"
                          value={row.clientProvided ? 'Yes' : 'No'}
                          onChange={e => setRow('clientProvided', e.target.value === 'Yes')}
                        >
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </td>
                      <td className="py-1 pr-2">
                        <NumInput value={row.hours} onChange={v => setRow('hours', v)} className="w-full" />
                      </td>
                      <td className="py-1 pr-2 text-right text-xs text-gray-600">
                        {row.clientProvided ? 'client' : eqMat > 0 ? `$${eqMat.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-1 text-center">
                        {equipmentRows.length > 1 && (
                          <button
                            type="button"
                            className="text-gray-300 hover:text-red-500"
                            title="Remove row"
                            onClick={() => setEquipmentRows(rs => rs.filter((_, idx) => idx !== i))}
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
              onClick={() => setEquipmentRows(rs => [...rs, EQUIP_ROW()])}
              className="mt-2 text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              + Add equipment
            </button>
          </div>
        </div>
      </div>


      {/* ── Utility Lines (line labor + material + 6"×24" trenching) ── */}
      <div>
        <SectionHeader title="Utility Lines" />
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
        <p className="mt-1 text-[11px] text-gray-400 italic">
          Includes trenching for a 6" wide × 24" deep trench per linear foot.
        </p>
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

      {/* ── Electrical Fixtures ── */}
      <div>
        <SectionHeader title="Electrical Fixtures" />
        <EpTable
          rows={epElecRows}
          setRows={setEpElecRows}
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
                <th className="text-left pb-1 pr-2 font-medium">Vendor</th>
                <th className="text-left pb-1 pr-2 font-medium">Type</th>
                <th className="text-left pb-1 pr-2 font-medium">SF</th>
                <th className="text-right pb-1 pr-2 font-medium text-gray-400">$/Unit</th>
                <th className="text-right pb-1 font-medium text-gray-400">Material $</th>
              </tr>
            </thead>
            <tbody>
              {wallFinishRows.map((row, i) => {
                const meta = WF_META[row.type]
                const rc = calc.wallFinishCalc?.[i] || {}
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-2">
                      <select
                        className="border border-gray-200 rounded-md px-2 py-1.5 text-xs bg-white w-full"
                        value={row.vendor || 'House'}
                        onChange={e => setWallFinishRow(i, 'vendor', e.target.value)}
                        title="Vendor — overrides material price"
                      >
                        <option value="House">House</option>
                        {vendorsForCategory(WF_CAT).map(v => (
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
                          value={row.type}
                          onChange={e => setWallFinishRow(i, 'type', e.target.value)}
                        >
                          {WF_LIST.map(t => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                        {meta && (
                          <RateEditPopover
                            table="material_rates"
                            name={OK_RATES[meta.key].dbName}
                            category="Outdoor Kitchen"
                            unitLabel={meta.unit === 'ton' ? 'ton' : 'SF'}
                            currentValue={p(OK_RATES[meta.key].dbName, OK_RATES[meta.key].fallback)}
                            onSaved={refreshAllRates}
                          />
                        )}
                        {meta && (
                          <RateEditPopover
                            table="labor_rates"
                            name={OK_RATES[meta.labKey].dbName}
                            category="Outdoor Kitchen"
                            mode="coefficient"
                            unitLabel={meta.labMode === 'perDay' ? 'SF/day' : 'hrs/SF'}
                            currentValue={p(OK_RATES[meta.labKey].dbName, OK_RATES[meta.labKey].fallback)}
                            onSaved={refreshAllRates}
                          />
                        )}
                      </span>
                    </td>
                    <td className="py-1 pr-2">
                      <NumInput value={row.sf} onChange={v => setWallFinishRow(i, 'sf', v)} className="w-full" />
                    </td>
                    <td className="py-1 pr-2 text-right text-gray-400 text-xs">
                      {rc.unit ? `$${rc.unit.toFixed(2)}/${meta?.unit === 'ton' ? 'ton' : 'SF'}` : '—'}
                    </td>
                    <td className="py-1 text-right text-xs text-gray-600">
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
            onClick={() => setManualRows(rows => [...rows, { label: 'Misc 1', hours: '', materials: '', subCost: '' }])}
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
  )
}
