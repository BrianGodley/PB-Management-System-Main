import WorkTypeChooser from './WorkTypeChooser'
import CrewTypeBar from './CrewTypeBar'
import ModuleHeaderSlot from './ModuleHeaderSlot'
import { useState, useEffect, useCallback, useContext } from 'react'
import { SubTabContext, subSectionTitle } from './subTabContext'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'
import RateEditPopover from '../RateEditPopover'
import DropdownSelect from '../DropdownSelect'
import { fetchSalesTaxRate } from '../../lib/companyDefaults'
import { calcWalkAccessLabor } from '../../lib/walkAccess'
import { groutCuFtPerBlock } from '../../lib/cmuGrout'
import { catalogItemFor, catalogOptions, fetchModuleCatalog, fetchStandardRateMap } from '../../lib/materialCatalog'

const CATALOG_OPTS = { standardRows: 'exclude', stripPrefix: true }

// ─────────────────────────────────────────────────────────────────────────────
// Outdoor Kitchen (BBQ) Module — based on BBQ Module tab in Excel estimator
// Covers: BBQ wall structure, countertop, appliances/services, wall finishes,
//         manual entry
// ─────────────────────────────────────────────────────────────────────────────

const OK_RATES = {
  // ── Material costs ──────────────────────────────────────────────────────────
  bbqBlock: { dbName: 'BBQ Block' }, // $/block
  bbqRebar: { dbName: 'BBQ Rebar' }, // $/LF
  bbqConcrete: { dbName: 'BBQ Concrete' }, // $/CY (footing & counter)
  bbqSubWallLF: { dbName: 'BBQ Sub Wall LF' }, // $/LF flat sub price (BBQ wall)
  bbqSubBackLF: { dbName: 'BBQ Sub Backsplash LF' }, // $/LF flat sub price (backsplash)
  applianceHardware: { dbName: 'BBQ Appliance Hardware' }, // $/appliance (misc hardware)
  gficOutlet: { dbName: 'GFIC Outlet - BBQ' }, // $/outlet
  sinkPlumbing: { dbName: 'Sink Plumbing - BBQ' }, // $ flat
  gasPipe: { dbName: 'Gas Pipe - BBQ' }, // $/LF
  sandStucco: { dbName: 'Sand Stucco - BBQ' }, // $/SF
  smoothStucco: { dbName: 'Smooth Stucco - BBQ' }, // $/SF
  ledgerstone: { dbName: 'Ledgerstone - BBQ' }, // $/SF
  stackedStone: { dbName: 'Stacked Stone - BBQ' }, // $/SF
  tile: { dbName: 'Tile - BBQ' }, // $/SF
  realFlagstone: { dbName: 'Real Flagstone - BBQ' }, // $/ton (default editable)
  realStone: { dbName: 'Real Stone - BBQ' }, // $/ton (default editable)

  // ── Labor productivity rates ────────────────────────────────────────────────
  excavateLab: { dbName: 'BBQ Excavate Labor Rate' }, // CF/hr
  rebarLab: { dbName: 'BBQ Rebar Labor Rate' }, // LF/hr (was 146 LF/day ÷ 8)
  pourFootingLab: { dbName: 'BBQ Pour Footing Labor Rate' }, // hrs/CY
  installBlockLab: { dbName: 'BBQ Block Install Labor Rate' }, // blocks/hr (was 60 blk/day ÷ 8)
  fillBlockLab: { dbName: 'BBQ Fill Block Labor Rate' }, // blocks/hr (was 146 blk/day ÷ 8; ×80/75 factor in calc)
  counterFormLab: { dbName: 'BBQ Counter Form Labor Rate' }, // LF of form/hr (×2 LF/SF in calc)
  counterPourLab: { dbName: 'BBQ Counter Pour Labor Rate' }, // SF/hr (was 50 SF/day ÷ 8)
  counterBroomLab: { dbName: 'BBQ Counter Broom Labor Rate' }, // SF/hr (was 60 SF/day ÷ 8)
  counterPolishLab: { dbName: 'BBQ Counter Polish Labor Rate' }, // SF/hr (was 18 SF/day ÷ 8)
  counterTrowelLab: { dbName: 'BBQ Counter Trowel Labor Rate' }, // SF/hr (45 SF/day ÷ 8)
  applianceLab: { dbName: 'BBQ Appliance Labor Rate' }, // appliances/day (legacy)
  applianceInstallHrs: { dbName: 'BBQ Appliance Install Hrs' }, // hrs per appliance (install labor coefficient)
  gficLab: { dbName: 'BBQ GFIC Labor Rate' }, // hrs/unit
  sinkLab: { dbName: 'BBQ Sink Labor Rate' }, // hrs flat
  gasTrenchLab: { dbName: 'BBQ Gas Trench Labor Rate' }, // LF/day
  sandStuccoLab: { dbName: 'Sand Stucco - BBQ Labor Rate' }, // SF/day
  smoothStuccoLab: { dbName: 'Smooth Stucco - BBQ Labor Rate' }, // SF/day
  ledgerstoneLab: { dbName: 'Ledgerstone - BBQ Labor Rate' }, // SF/day
  stackedStoneLab: { dbName: 'Stacked Stone - BBQ Labor Rate' }, // SF/day
  tileLab: { dbName: 'Tile - BBQ Labor Rate' }, // hrs/SF (layout+install combined)
  flagstoneLab: { dbName: 'Real Flagstone - BBQ Labor Rate' }, // hrs/SF (delivery+install+seal)
  realStoneLab: { dbName: 'Real Stone - BBQ Labor Rate' }, // hrs/SF (transport+install+seal)
}

const DEFAULTS = {
  laborRatePerHour: 35,
  laborBurdenPct: 0.29,
  gpmd: 425,
}

const COUNTER_FINISHES = ['Broom Finish', 'Polished Finish', 'Trowel Finish']

// Canonical size-based rebar catalog. Rebar is priced per Ln Ft from Basic
// Materials → Reinforcement rows named 'Rebar #<size>'. Default #4.
const REBAR_SIZES = ['#3', '#4', '#5', '#6', '#8']

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
const EQUIP_ROW = () => ({ vendor: 'Standard', type: '', qty: '0', unitCost: '', clientProvided: false, hours: '' })
const SINK_ROW = () => ({ vendor: 'Standard', type: '', qty: '0', unitCost: '', clientProvided: false, hours: '' })

const n = v => parseFloat(v) || 0

// ── Vendor-first Appliance Type picker ───────────────────────────────────────
// Mirrors baseMatOptions (ArtificialTurf) / mergedUtilTypes (this file). The
// dropdown shows the Items the ROW'S SELECTED VENDOR carries in Category
// 'Outdoor Kitchen', Sub-category 'Appliance':
//   Standard/unset/auto → the null-vendor (Standard-priced) catalog Appliance
//     Items merged with the built-in APPLIANCE_TYPES (any built-in not already
//     covered by a catalog Item is appended). When there are NO catalog Items
//     yet (pre-seed), the built-in list stands alone so nothing breaks.
//   a real vendor → ONLY that vendor's Appliance Items (built-ins fall away).
// Each option's value is its label: a built-in generic prices off the master
// `BBQ Equip - <type>` rate; a catalog Item prices off its own vendor-aware
// unit price (see applianceUnitPrice).
const OK_APPLIANCE_CAT = 'Appliance'
const OK_APPLIANCE_CATEGORY = 'Outdoor Kitchen'
function applianceTypeOptions(materialRows, vendorSel = 'Standard') {
  const isStd = !vendorSel || vendorSel === 'Standard' || vendorSel === 'auto'
  const catRows = catalogOptions(materialRows, OK_APPLIANCE_CAT, isStd ? 'Standard' : vendorSel, {
    standardRows: 'null-vendor',
    stripPrefix: true,
    category: OK_APPLIANCE_CATEGORY,
  })
  // Catalog-only: the catalog is the sole source of options. No built-in
  // APPLIANCE_TYPES fallback — an unseeded 'Appliance' sub-category yields an
  // empty list (each new row starts on its "Select …" placeholder = $0).
  return catRows.map(o => ({ value: o.label, label: o.label, name: o.row.name, fromMaster: true }))
}
// Vendor-aware unit material price for an Appliance row. A per-row $/ea override
// wins; otherwise a selected catalog Appliance Item resolves its vendor-aware
// price (Standard = the null-vendor price, a real vendor = that vendor's price);
// a built-in generic type (no catalog Item) keeps the master `BBQ Equip - <type>`
// rate. Backward-compatible: an old row storing an APPLIANCE_TYPES value resolves
// via the built-in branch unchanged.
function applianceUnitPrice(row, materialRows, p, ignoreOverride = false) {
  if (!ignoreOverride && row.unitCost !== '' && row.unitCost != null) return n(row.unitCost)
  const vsel = row.vendor && row.vendor !== 'auto' ? row.vendor : 'Standard'
  const vrow = catalogItemFor(materialRows, OK_APPLIANCE_CAT, vsel, row.type, {
    standardRows: 'null-vendor',
    stripPrefix: true,
    category: OK_APPLIANCE_CATEGORY,
    fallbackFirst: false,
  })
  if (vrow) return n(vrow.unit_cost)
  return p(applianceRateName(row.type), 0)
}

// ── Vendor-first Sink picker (Sub-category 'Sink' under 'Outdoor Kitchen') ────
// Parallel to the Appliance picker above, scoped to the catalog Sub-category
// 'Sink'. The catalog is the SOLE source — there is NO built-in fallback list,
// so if no Sink Items are seeded the picker is simply empty (each new row starts
// on an empty "Select sink" placeholder and contributes $0).
const OK_SINK_CAT = 'Sink'
function sinkTypeOptions(materialRows, vendorSel = 'Standard') {
  const isStd = !vendorSel || vendorSel === 'Standard' || vendorSel === 'auto'
  const catRows = catalogOptions(materialRows, OK_SINK_CAT, isStd ? 'Standard' : vendorSel, {
    standardRows: 'null-vendor',
    stripPrefix: true,
    category: OK_APPLIANCE_CATEGORY,
  })
  return catRows.map(o => ({ value: o.label, label: o.label, name: o.row.name, fromMaster: true }))
}
// Vendor-aware unit material price for a Sink row. A per-row $/ea override wins;
// otherwise a selected catalog Sink Item resolves its vendor-aware price
// (Standard = the null-vendor price, a real vendor = that vendor's price). An
// unselected row (empty type) resolves nothing and prices to $0.
function sinkUnitPrice(row, materialRows, p, ignoreOverride = false) {
  if (!ignoreOverride && row.unitCost !== '' && row.unitCost != null) return n(row.unitCost)
  const vsel = row.vendor && row.vendor !== 'auto' ? row.vendor : 'Standard'
  const vrow = catalogItemFor(materialRows, OK_SINK_CAT, vsel, row.type, {
    standardRows: 'null-vendor',
    stripPrefix: true,
    category: OK_APPLIANCE_CATEGORY,
    fallbackFirst: false,
  })
  if (vrow) return n(vrow.unit_cost)
  return 0
}

// ── Wall-finish vendor catalog ───────────────────────────────────────────────
// A real vendor overrides ONLY the material unit price for a finish (matched by
// its Type label in the vendor's 'Wall Finish' catalog); Standard keeps the
// built-in per-estimate / master-rate price. Labor is never affected.
const WF_CAT = 'Wall Finish'
function wfVendorPrice(vendorSel, typeLabel, materialRows, opts = {}) {
  const row = catalogItemFor(materialRows, WF_CAT, vendorSel, typeLabel, { ...CATALOG_OPTS, ...opts })
  return row ? n(row.unit_cost) : null
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
const WF_ROW = () => ({ vendor: 'Standard', type: 'Tile', sf: '' })

// ── Master-list finish support ───────────────────────────────────────────────
// A material_rates row tagged sub_category='Wall Finish' (Unspecified) becomes a
// selectable finish Type: material unit = its unit_cost; unit mode / labMode /
// waste / tonPerSF / laborCoeff come from its calc_meta. Built-ins are unchanged.
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
// Vendor-first Type list (mirrors Paver/Utilities): the dropdown shows the Items
// the ROW'S SELECTED VENDOR carries in this Category + Sub-category. Standard/unset
// → the null-vendor (Standard-priced) Items merged with the built-in list; a real
// vendor → ONLY that vendor's Items (built-ins fall away). Category scoping (e.g.
// 'Outdoor Kitchen') is preserved and combined with the vendor filter.
function masterWallOptions(cat, builtInList, materialRows, category = null, vendorSel = 'Standard') {
  const isStd = !vendorSel || vendorSel === 'Standard' || vendorSel === 'auto'
  // Catalog-only: Standard/unset → the null-vendor (Standard) catalog items; a
  // real vendor → only that vendor's items. Built-in list no longer injected as
  // options (single source of truth); an unseeded sub-category yields empty.
  return catalogOptions(materialRows, cat, isStd ? 'Standard' : vendorSel, { standardRows: 'null-vendor', stripPrefix: true, category })
    .map(o => o.label)
}

// ── Electrical & Plumbing catalog (ported from the Utilities module) ──────────
// Rates live in material_rates / labor_rates under category 'Utilities' so they
// stay a single source of truth shared with the Utilities module. Fallbacks
// below are used only when the DB row is absent. A vendor overrides ONLY the
// material price for the selected item; labor always comes from the built-in.
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
const UTIL_CAT = { line: 'Utility Lines', gas: 'Gas Fixtures', elec: 'Electrical Fixtures' }
// Trenching for utility lines (machine trench, min/cf; from the Utilities schedule).
const OK_TRENCH_RATE_NAME = 'Utilities Trench Excavation'
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
  const laborVal = n(mp[builtIn?.laborDbName])
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
function calcOutdoorKitchen(
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
    layoutHrs,
    bbqLengthLF,
    bbqHeightIn,
    backLengthLF,
    backHeightIn,
    footingWidthIn,
    footingDepthIn,
    counterSF,
    counterFinish,
    rebarSize,
    applianceCount,
    gficCount,
    sinkYN,
    gasTrenchLF,
    manualRows,
    materialRows,
    wallFinishRows,
    equipmentRows,
    sinkRows,
    epLineRows,
    epGasRows,
    epElecRows,
  } = state

  // ── Utility Lines / Gas / Electrical Fixtures ───────────────────────────────
  // Utility Lines combine the line's install labor + material PLUS trenching for
  // a 6" wide × 24" deep trench (per LF) using the Utilities trench excavation
  // rate (min/cf). 6"×24" = 1.0 cf per LF.
  const TRENCH_CF_PER_LF = (6 / 12) * (24 / 12) // = 1.0
  const trenchMinsPerCF = n(mp[OK_TRENCH_RATE_NAME])
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

  const p = dbName => n(mp[dbName])
  // Wall finish per-row calc: material (vendor-overridable unit) + labor by type.
  const finishRowCalc = row => {
    const meta = WF_META[row.type] || masterWallMeta(WF_CAT, row.type, materialRows, 'Outdoor Kitchen')
    const sf = n(row.sf)
    if (!meta || sf <= 0) return { mat: 0, hrs: 0 }
    const houseUnit = meta.master
      ? meta.matUnit
      : p(OK_RATES[meta.key].dbName, OK_RATES[meta.key].fallback)
    const unit = wfVendorPrice(row.vendor, row.type, materialRows, { category: 'Outdoor Kitchen' }) ?? houseUnit
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
      : p(OK_RATES[meta.labKey].dbName, OK_RATES[meta.labKey].fallback)
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
  // Grout fill = block count × cu-ft/block ÷ 27 (standardized CMU model, 8x8x16
  // = 0.5 cu ft), priced at the concrete rate below.
  const fillCY = (blockRaw * groutCuFtPerBlock(8, 8)) / 27
  const counterCY = (n(counterSF) * 0.33) / 27

  // ── BBQ Install Labor Hours (all rates from DB) ──────────────────────────────
  const layoutLab = n(layoutHrs)
  const excavateHrs =
    totalLF > 0
      ? (totalLF * footingAreaSF) / p(OK_RATES.excavateLab.dbName, OK_RATES.excavateLab.fallback)
      : 0
  // Rates below are per-HOUR (LF/hr, blk/hr, SF/hr) — hours = qty / rate.
  const rebarHrs =
    rebarLF > 0 ? rebarLF / p(OK_RATES.rebarLab.dbName, OK_RATES.rebarLab.fallback) : 0
  const pourFootingHrs =
    footingCY > 0
      ? footingCY * p(OK_RATES.pourFootingLab.dbName, OK_RATES.pourFootingLab.fallback)
      : 0
  const installBlockHrs =
    blockWaste > 0
      ? blockWaste / p(OK_RATES.installBlockLab.dbName, OK_RATES.installBlockLab.fallback)
      : 0
  const fillBlockHrs =
    blockRaw > 0
      ? ((80 / 75) * blockRaw) / p(OK_RATES.fillBlockLab.dbName, OK_RATES.fillBlockLab.fallback)
      : 0
  const counterFormHrs =
    n(counterSF) > 0
      ? (n(counterSF) * 2) / p(OK_RATES.counterFormLab.dbName, OK_RATES.counterFormLab.fallback)
      : 0
  const counterPourHrs =
    n(counterSF) > 0
      ? n(counterSF) / p(OK_RATES.counterPourLab.dbName, OK_RATES.counterPourLab.fallback)
      : 0
  const counterBroomHrs =
    counterFinish === 'Broom Finish'
      ? n(counterSF) / p(OK_RATES.counterBroomLab.dbName, OK_RATES.counterBroomLab.fallback)
      : 0
  const counterPolishHrs =
    counterFinish === 'Polished Finish'
      ? n(counterSF) / p(OK_RATES.counterPolishLab.dbName, OK_RATES.counterPolishLab.fallback)
      : 0
  const counterTrowelHrs =
    counterFinish === 'Trowel Finish'
      ? n(counterSF) / p(OK_RATES.counterTrowelLab.dbName, OK_RATES.counterTrowelLab.fallback)
      : 0
  // Equipment table — per-line labor (hours entered directly, replacing the old
  // single Layout Hours field) + material from the master rate, zeroed when the
  // client provides the unit.
  // Install labor per appliance: master coefficient (hrs/ea), overridable per row
  // by typing a value in the Labor (hrs) field.
  const applianceHrsEa = p(OK_RATES.applianceInstallHrs.dbName, OK_RATES.applianceInstallHrs.fallback)
  let equipHrs = 0
  let equipMat = 0
  ;(equipmentRows || []).forEach(r => {
    // Missing qty (older estimates) counts as 1; each unit multiplies labor + material.
    const q = r.qty === undefined || r.qty === null ? 1 : n(r.qty)
    // Unit material $: the inline $/ea override if entered, else the vendor-aware
    // catalog price for a selected Appliance Item, else the built-in master rate.
    const unit = applianceUnitPrice(r, materialRows, p)
    // Labor hrs/ea: explicit override if entered, else the install coefficient.
    const hrsEa = r.hours !== '' && r.hours != null ? n(r.hours) : applianceHrsEa
    equipHrs += q * hrsEa
    if (!r.clientProvided) equipMat += q * unit
  })
  // Sinks: mirror appliances — vendor-aware catalog material + per-row install
  // labor. Default install hrs/ea comes from the master Sink labor rate; a row
  // with an empty (unselected) type prices to $0.
  const sinkInstallHrsEa = p(OK_RATES.sinkLab.dbName, OK_RATES.sinkLab.fallback)
  let sinkRowsHrs = 0
  let sinkRowsMat = 0
  ;(sinkRows || []).forEach(r => {
    const q = r.qty === undefined || r.qty === null ? 1 : n(r.qty)
    const unit = sinkUnitPrice(r, materialRows, p)
    const hrsEa = r.hours !== '' && r.hours != null ? n(r.hours) : sinkInstallHrsEa
    sinkRowsHrs += q * hrsEa
    if (!r.clientProvided) sinkRowsMat += q * unit
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
  const rebarMat = rebarLF * p('Rebar ' + (rebarSize || '#4'), OK_RATES.bbqRebar.fallback)
  const footingMat = footingCY * p(OK_RATES.bbqConcrete.dbName, OK_RATES.bbqConcrete.fallback)
  const fillMat = fillCY * p(OK_RATES.bbqConcrete.dbName, OK_RATES.bbqConcrete.fallback)
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
  const isSubTab = state.subType === 'Subcontractor'
  // BBQ structure: In-House = itemized block/footing takeoff; Sub = a flat $/LF
  // price (wall LF + backsplash LF), so the itemized structure labor + material
  // are excluded on the Sub tab and replaced by structureSubCost (added to sub cost).
  const structureHrs =
    excavateHrs + rebarHrs + pourFootingHrs + installBlockHrs + fillBlockHrs
  const structureMatVal = blockMat + rebarMat + footingMat + fillMat
  const structureSubCost = isSubTab
    ? n(bbqLengthLF) * p(OK_RATES.bbqSubWallLF.dbName, OK_RATES.bbqSubWallLF.fallback) +
      n(backLengthLF) * p(OK_RATES.bbqSubBackLF.dbName, OK_RATES.bbqSubBackLF.fallback)
    : 0
  const baseHrs =
    equipHrs +
    sinkRowsHrs +
    (isSubTab ? 0 : structureHrs) +
    counterFormHrs +
    counterPourHrs +
    counterBroomHrs +
    counterPolishHrs +
    counterTrowelHrs +
    epHrs +
    finishHrs +
    manHrs

  const diffMod = 1 + n(difficulty) / 100
  const _preWalkHrs = baseHrs * diffMod + n(hoursAdj)
  const walkHrs = calcWalkAccessLabor(_preWalkHrs, state.distanceLF, { paceLfPerMin: _pace })
  const totalHrs = _preWalkHrs + walkHrs
  const manDays = totalHrs / 8

  const totalMat =
    (isSubTab ? 0 : structureMatVal) +
    counterConcMat +
    counterPolishMat +
    equipMat +
    sinkRowsMat +
    epMat +
    finishMat +
    manMat

  const laborCost = totalHrs * lrph
  const burden = laborCost * n(laborBurdenPct)
  // On the Sub tab the itemized scope's cost IS the subcontractor cost — labor +
  // burden + material + flat BBQ structure + any manual sub — and profit is the
  // markup (Sub GP). The in-house GP model applies only to the In-House tab.
  const subMarkup = n(state.subGpMarkupRate)
  let gp, subCost, subGp, commission, price
  if (isSubTab) {
    gp = 0
    subCost = totalMat + laborCost + burden + structureSubCost + manSub
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
    servicesMat: equipMat + sinkRowsMat + epMat,
    finishesMat: finishMat,
    finishMat,
    finishHrs,
    equipMat,
    sinkRowsMat,
    epMat,
    epHrs,
    manMat,
    wallFinishCalc,
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

const DEFAULT_MANUAL_ROWS = [{ label: '', hours: '', materials: '', subCost: '' }]

// Per-tab input record. In-House and Sub each hold their own independent copy so
// the two tabs are separate calculators.
function makeTab(src = {}) {
  return {
    difficulty: src.difficulty ?? '',
    hoursAdj: src.hoursAdj ?? '',
    distanceLF: src.distanceLF ?? '',
    bbqLengthLF: src.bbqLengthLF ?? '',
    bbqHeightIn: src.bbqHeightIn ?? '48',
    backLengthLF: src.backLengthLF ?? '',
    backHeightIn: src.backHeightIn ?? '48',
    footingWidthIn: src.footingWidthIn ?? '12',
    footingDepthIn: src.footingDepthIn ?? '12',
    counterSF: src.counterSF ?? '',
    counterFinish: src.counterFinish ?? 'Broom Finish',
    equipmentRows: src.equipmentRows ?? [EQUIP_ROW(), EQUIP_ROW(), EQUIP_ROW()],
    sinkRows: src.sinkRows ?? [SINK_ROW()],
    epLineRows: src.epLineRows ?? [EP_LINE_ROW()],
    epGasRows: src.epGasRows ?? [EP_GAS_ROW()],
    epElecRows: src.epElecRows ?? [EP_ELEC_ROW()],
    wallFinishRows: src.wallFinishRows ?? [WF_ROW()],
    manualRows: src.manualRows ?? DEFAULT_MANUAL_ROWS.map(r => ({ ...r })),
  }
}

// ── Main component ────────────────────────────────────────────────────────────
export default function OutdoorKitchenModule({ onSave, onBack, saving, initialData }) {
  const [laborRatePerHour, setLaborRatePerHour] = useState(
    initialData?.laborRatePerHour ?? null
  )
  const [laborBurdenPct, setLaborBurdenPct] = useState(
    initialData?.laborBurdenPct ?? null
  )
  const [gpmd, setGpmd] = useState(initialData?.gpmd ?? null)
  const [subGpMarkupRate, setSubGpMarkupRate] = useState(initialData?.subGpMarkupRate ?? null)
  const [commissionRate, setCommissionRate] = useState(initialData?.commissionRate ?? null)
  // User-selectable rebar size (size-based canonical catalog). Shared across the
  // In-House/Sub tabs — rebar lives only on the In-House structural side.
  const [rebarSize, setRebarSize] = useState(initialData?.rebarSize ?? '#4')

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
  const [materialRows, setMaterialRows] = useState(initialData?.materialRows ?? [])
  const [vendors, setVendors] = useState([])

  // Re-fetch Outdoor Kitchen merged labor+material map. Used on mount and after save.
  const refreshAllRates = useCallback(async () => {
    // material_rates retired: base map from the new model; catalog (Wall Finish +
    // Utility Lines/Gas/Electrical Fixtures, all unchanged names) from the shared
    // Outdoor Kitchen / Utilities / Fire Pit / Walls categories.
    const [matMap, labRes, rows, venRes] = await Promise.all([
      fetchStandardRateMap(['Outdoor Kitchen', 'Utilities']),
      supabase
        .from('labor_rates')
        .select('name, rate')
        .in('category', ['Outdoor Kitchen', 'Utilities']),
      fetchModuleCatalog(['Outdoor Kitchen', 'Utilities', 'Walls']),
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
    // A saved estimate may carry its own price snapshot; let those win over the
    // fresh map, but always take the fresh catalog rows so new items appear.
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
    // Always refresh the catalog on open (even when a price snapshot exists) so
    // newly-added Master Rates items show up in older estimates' pickers.
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
  // Derived active-tab field accessors — render bindings stay unchanged.
  const difficulty = cur.difficulty
  const setDifficulty = setField('difficulty')
  const hoursAdj = cur.hoursAdj
  const setHoursAdj = setField('hoursAdj')
  const distanceLF = cur.distanceLF
  const setDistanceLF = setField('distanceLF')
  const bbqLengthLF = cur.bbqLengthLF
  const setBbqLengthLF = setField('bbqLengthLF')
  const bbqHeightIn = cur.bbqHeightIn
  const setBbqHeightIn = setField('bbqHeightIn')
  const backLengthLF = cur.backLengthLF
  const setBackLengthLF = setField('backLengthLF')
  const backHeightIn = cur.backHeightIn
  const setBackHeightIn = setField('backHeightIn')
  const footingWidthIn = cur.footingWidthIn
  const setFootingWidthIn = setField('footingWidthIn')
  const footingDepthIn = cur.footingDepthIn
  const setFootingDepthIn = setField('footingDepthIn')
  const counterSF = cur.counterSF
  const setCounterSF = setField('counterSF')
  const counterFinish = cur.counterFinish
  const setCounterFinish = setField('counterFinish')
  const equipmentRows = cur.equipmentRows
  const setEquipmentRows = setField('equipmentRows')
  const sinkRows = cur.sinkRows
  const setSinkRows = setField('sinkRows')
  const epLineRows = cur.epLineRows
  const setEpLineRows = setField('epLineRows')
  const epGasRows = cur.epGasRows
  const setEpGasRows = setField('epGasRows')
  const epElecRows = cur.epElecRows
  const setEpElecRows = setField('epElecRows')
  const wallFinishRows = cur.wallFinishRows
  const setWallFinishRows = setField('wallFinishRows')
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

  // NOTE: materialRows (the live catalog) is intentionally NOT persisted — it is
  // reference data fetched fresh on open. Freezing it into the estimate made
  // newly-added catalog items (e.g. appliances) invisible in older estimates.
  const state = { crewType, subType, subGpMarkupRate, commissionRate, ...cur, rebarSize }
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

  const p = dbName => n(materialPrices[dbName])

  function updateManual(i, field, val) {
    setManualRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }

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
        rebarSize,
        gpmd,
        materialPrices,
        calc,
      },
    })
  }

  const vendorsForCategory = cat => vendors.filter(v => materialRows.some(r => r.vendor_id === v.id && (r.sub_category === cat || r.category === cat)))
  // Wall-finish vendor list scoped to this module's own Category so it lists only
  // vendors that priced a Wall Finish product under 'Outdoor Kitchen' (not FP/Walls).
  const vendorsForFinish = () => vendors.filter(v => materialRows.some(r => r.vendor_id === v.id && r.sub_category === WF_CAT && r.category === 'Outdoor Kitchen'))
  const setWallFinishRow = (i, field, val) =>
    setWallFinishRows(rs => rs.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))

  // ── Grouped rate list for the "View Rates" popup (CrewTypeBar). Each section
  //    lists its LABOR rates first, then every MATERIAL rate (per vendor from the
  //    module catalog, Standard first) — mirrors the Walls / Utilities View Rates.
  const okLaborItem = (rateKey, unitLabel) => ({
    label: OK_RATES[rateKey].dbName,
    table: 'labor_rates',
    name: OK_RATES[rateKey].dbName,
    category: 'Outdoor Kitchen',
    mode: 'coefficient',
    unitLabel,
    value: p(OK_RATES[rateKey].dbName, OK_RATES[rateKey].fallback),
  })
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
          category: 'Outdoor Kitchen',
          unitLabel: r0.unit || unit,
          mode: 'currency',
          value: n(r0.unit_cost),
        }))
    }
    return [
      { label: `Standard — ${dbName}`, table: 'material_price', name: dbName, category: 'Outdoor Kitchen', unitLabel: unit, mode: 'currency', value: fallback },
    ]
  }
  // Every catalog product tagged with a sub-category (Wall Finish / Appliance),
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
        category: 'Outdoor Kitchen',
        unitLabel: r0.unit || unit || 'ea',
        mode: 'currency',
        value: n(r0.unit_cost),
      }))
  const outdoorKitchenRateList = [
    {
      group: 'BBQ Structure',
      items: [
        okLaborItem('excavateLab', 'CF/hr'),
        okLaborItem('rebarLab', 'LF/hr'),
        okLaborItem('pourFootingLab', 'hrs/CY'),
        okLaborItem('installBlockLab', 'blk/hr'),
        okLaborItem('fillBlockLab', 'blk/hr'),
        ...matRows(OK_RATES.bbqBlock.dbName, 'block', p(OK_RATES.bbqBlock.dbName, OK_RATES.bbqBlock.fallback)),
        ...matRows('Rebar ' + (rebarSize || '#4'), 'LF', p('Rebar ' + (rebarSize || '#4'), OK_RATES.bbqRebar.fallback)),
        ...matRows(OK_RATES.bbqConcrete.dbName, 'CY', p(OK_RATES.bbqConcrete.dbName, OK_RATES.bbqConcrete.fallback)),
      ],
    },
    {
      group: 'Concrete Countertop',
      items: [
        okLaborItem('counterFormLab', 'LF/hr'),
        okLaborItem('counterPourLab', 'SF/hr'),
        okLaborItem('counterBroomLab', 'SF/hr'),
        okLaborItem('counterPolishLab', 'SF/hr'),
        okLaborItem('counterTrowelLab', 'SF/hr'),
        // Countertop is poured from the same concrete master rate as the footing.
        ...matRows(OK_RATES.bbqConcrete.dbName, 'CY', p(OK_RATES.bbqConcrete.dbName, OK_RATES.bbqConcrete.fallback)),
      ],
    },
    {
      group: 'Appliances',
      items: [
        okLaborItem('applianceInstallHrs', 'hrs/ea'),
        // Vendor catalog appliance products + shared install hardware. The
        // hardcoded APPLIANCE_TYPES generic rates are no longer listed — the
        // catalog is the source of truth.
        ...catalogBlockItems('Appliance', 'ea', 'Outdoor Kitchen'),
        ...matRows(OK_RATES.applianceHardware.dbName, 'ea', p(OK_RATES.applianceHardware.dbName, OK_RATES.applianceHardware.fallback)),
      ],
    },
    {
      group: 'Sinks',
      items: [
        // Per-row install labor default + vendor catalog Sink products (the
        // catalog is the sole source; no hardcoded generic sink rates).
        okLaborItem('sinkLab', 'hrs/ea'),
        ...catalogBlockItems('Sink', 'ea', 'Outdoor Kitchen'),
      ],
    },
    {
      group: 'Wall Finishes',
      items: [
        ...WF_LIST.map(type => {
          const meta = WF_META[type]
          return {
            label: OK_RATES[meta.labKey].dbName,
            table: 'labor_rates',
            name: OK_RATES[meta.labKey].dbName,
            category: 'Outdoor Kitchen',
            mode: 'coefficient',
            unitLabel: meta.labMode === 'perDay' ? 'SF/day' : 'hrs/SF',
            value: p(OK_RATES[meta.labKey].dbName, OK_RATES[meta.labKey].fallback),
          }
        }),
        // Vendor catalog finish products (Wall Finish sub-category) + each
        // built-in Standard finish material rate.
        ...catalogBlockItems(WF_CAT, 'SF', 'Outdoor Kitchen'),
        ...WF_LIST.flatMap(type => {
          const meta = WF_META[type]
          return matRows(OK_RATES[meta.key].dbName, meta.unit === 'ton' ? 'ton' : 'SF', p(OK_RATES[meta.key].dbName, OK_RATES[meta.key].fallback))
        }),
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
          value: p(t.laborDbName, t.laborFallback),
        })),
        ...GAS_TYPE_ARR.map(t => ({
          label: t.laborDbName,
          table: 'labor_rates',
          name: t.laborDbName,
          category: 'Utilities',
          mode: 'coefficient',
          unitLabel: 'hrs per Each',
          value: p(t.laborDbName, t.laborFallback),
        })),
        ...ELEC_TYPE_ARR.map(t => ({
          label: t.laborDbName,
          table: 'labor_rates',
          name: t.laborDbName,
          category: 'Utilities',
          mode: 'coefficient',
          unitLabel: 'hrs per Each',
          value: p(t.laborDbName, t.laborFallback),
        })),
        // Built-in BBQ service materials + the shared utility-line / fixture
        // catalog materials (per vendor, matched by name).
        ...matRows(OK_RATES.gficOutlet.dbName, 'ea', p(OK_RATES.gficOutlet.dbName, OK_RATES.gficOutlet.fallback)),
        ...matRows(OK_RATES.sinkPlumbing.dbName, 'flat', p(OK_RATES.sinkPlumbing.dbName, OK_RATES.sinkPlumbing.fallback)),
        ...matRows(OK_RATES.gasPipe.dbName, 'LF', p(OK_RATES.gasPipe.dbName, OK_RATES.gasPipe.fallback)),
        ...LINE_TYPE_ARR.flatMap(t => matRows(t.dbName, 'LF', p(t.dbName, t.fallback))),
        ...GAS_TYPE_ARR.flatMap(t => matRows(t.dbName, 'ea', p(t.dbName, t.fallback))),
        ...ELEC_TYPE_ARR.flatMap(t => matRows(t.dbName, 'ea', p(t.dbName, t.fallback))),
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
            title="Outdoor Kitchen"
            rates={outdoorKitchenRateList}
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
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">BBQ Wall Length (LF)</label>
            <NumInput value={bbqLengthLF} onChange={setBbqLengthLF} placeholder="0" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Backsplash Wall Length (LF)</label>
            <NumInput value={backLengthLF} onChange={setBackLengthLF} placeholder="0" />
          </div>
          {!isSub && (
            <>
              <div>
                <label className="block text-xs text-gray-500 mb-1">BBQ Wall Height (inches)</label>
                <NumInput value={bbqHeightIn} onChange={setBbqHeightIn} placeholder="48" />
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
              <div>
                <label className="block text-xs text-gray-500 mb-1">Rebar Size</label>
                <select
                  className="input text-sm py-1.5 w-full"
                  value={rebarSize}
                  onChange={e => setRebarSize(e.target.value)}
                  title="Rebar size"
                >
                  {REBAR_SIZES.map(s => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
        {!isSub && (n(bbqLengthLF) > 0 || n(backLengthLF) > 0) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-gray-600 flex flex-wrap gap-4">
            <span>
              Blocks: <strong>{calc.blockOrdered.toFixed(0)}</strong>
            </span>
            <span>
              Footing: <strong>{calc.footingCY.toFixed(2)} Cu Yd</strong>
            </span>
            <span>
              Rebar: <strong>{calc.rebarLF.toFixed(0)} Ln Ft</strong>
            </span>
            <span>
              Fill: <strong>{calc.fillCY.toFixed(3)} Cu Yd</strong>
            </span>
          </div>
        )}
      </div>

      {/* ── Countertop ── */}
      <div>
        <SectionHeader title="Concrete Countertop" />
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
                <col className="w-[120px]" />
                <col />
                <col className="w-[56px]" />
                <col className="w-[80px]" />
                <col className="w-[96px]" />
                <col className="w-[80px]" />
                <col className="w-[92px]" />
                <col className="w-6" />
              </colgroup>
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-200">
                  <th className="text-center pb-1 pr-2 font-medium">Vendor</th>
                  <th className="text-center pb-1 pr-2 font-medium">Type</th>
                  <th className="text-center pb-1 pr-2 font-medium">Qty</th>
                  <th className="text-center pb-1 pr-2 font-medium">$ per Each</th>
                  <th className="text-center pb-1 pr-2 font-medium">Client Provided</th>
                  <th className="text-center pb-1 pr-2 font-medium">Labor (hrs per Each)</th>
                  <th className="text-center pb-1 pr-2 font-medium text-gray-400">Material $</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {equipmentRows.map((row, i) => {
                  const eqQty = row.qty === undefined || row.qty === null ? 1 : n(row.qty)
                  const eqUnit = applianceUnitPrice(row, materialRows, p)
                  const eqMat = row.clientProvided ? 0 : eqQty * eqUnit
                  const applOpts = applianceTypeOptions(materialRows, row.vendor)
                  const setRow = (field, val) =>
                    setEquipmentRows(rs =>
                      rs.map((r, idx) => (idx === i ? { ...r, [field]: val } : r))
                    )
                  return (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-1 pr-2">
                        <select
                          className="border border-gray-200 rounded-md px-2 py-1.5 text-xs bg-white w-full"
                          value={row.vendor || 'Standard'}
                          onChange={e => setRow('vendor', e.target.value)}
                        >
                          <option value="Standard">Standard</option>
                          {vendorsForCategory('Appliance').map(v => (
                            <option key={v.id} value={v.id}>
                              {v.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1 pr-2">
                        {/* Searchable, always-downward picker — long appliance list. */}
                        <DropdownSelect
                          searchable
                          portal
                          className="border border-gray-200 rounded-md px-2 py-1.5 text-xs bg-white w-full"
                          placeholder="Select appliance…"
                          value={row.type || ''}
                          onChange={val => setRow('type', val)}
                          options={[
                            // Backward-compat: keep a stored value not in the current
                            // (vendor-scoped) options selectable.
                            ...(row.type && !applOpts.some(o => o.value === row.type)
                              ? [{ value: row.type, label: row.type }]
                              : []),
                            ...applOpts.map(o => ({ value: o.value, label: o.label })),
                          ]}
                        />
                      </td>
                      <td className="py-1 pr-2">
                        <NumInput value={row.qty} onChange={v => setRow('qty', v)} className="w-full text-center" placeholder="0" />
                      </td>
                      <td className="py-1 pr-2">
                        <NumInput
                          value={row.unitCost}
                          onChange={v => setRow('unitCost', v)}
                          className="w-full text-center"
                          placeholder={applianceUnitPrice(row, materialRows, p, true).toFixed(2)}
                        />
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
                        <NumInput
                          value={row.hours}
                          onChange={v => setRow('hours', v)}
                          className="w-full text-center"
                          placeholder={p(
                            OK_RATES.applianceInstallHrs.dbName,
                            OK_RATES.applianceInstallHrs.fallback
                          ).toFixed(2)}
                        />
                      </td>
                      <td className="py-1 pr-2 text-center text-xs text-gray-600">
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

      {/* ── Sinks ── */}
      <div>
        <SectionHeader title="Sinks" />
        <div className="space-y-0">
          {/* Sink rows — Vendor · Type · Qty · $/ea · Client Provided · Labor · Material */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed">
              <colgroup>
                <col className="w-[120px]" />
                <col />
                <col className="w-[56px]" />
                <col className="w-[80px]" />
                <col className="w-[96px]" />
                <col className="w-[80px]" />
                <col className="w-[92px]" />
                <col className="w-6" />
              </colgroup>
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-200">
                  <th className="text-center pb-1 pr-2 font-medium">Vendor</th>
                  <th className="text-center pb-1 pr-2 font-medium">Type</th>
                  <th className="text-center pb-1 pr-2 font-medium">Qty</th>
                  <th className="text-center pb-1 pr-2 font-medium">$ per Each</th>
                  <th className="text-center pb-1 pr-2 font-medium">Client Provided</th>
                  <th className="text-center pb-1 pr-2 font-medium">Labor (hrs per Each)</th>
                  <th className="text-center pb-1 pr-2 font-medium text-gray-400">Material $</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sinkRows.map((row, i) => {
                  const skQty = row.qty === undefined || row.qty === null ? 1 : n(row.qty)
                  const skUnit = sinkUnitPrice(row, materialRows, p)
                  const skMat = row.clientProvided ? 0 : skQty * skUnit
                  const sinkOpts = sinkTypeOptions(materialRows, row.vendor)
                  const setRow = (field, val) =>
                    setSinkRows(rs =>
                      rs.map((r, idx) => (idx === i ? { ...r, [field]: val } : r))
                    )
                  return (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-1 pr-2">
                        <select
                          className="border border-gray-200 rounded-md px-2 py-1.5 text-xs bg-white w-full"
                          value={row.vendor || 'Standard'}
                          onChange={e => setRow('vendor', e.target.value)}
                        >
                          <option value="Standard">Standard</option>
                          {vendorsForCategory('Sink').map(v => (
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
                            {/* Empty new rows show a placeholder rather than a
                                hardcoded default sink. */}
                            {!row.type && <option value="">Select sink</option>}
                            {/* Backward-compat: keep a stored value that isn't in the
                                current (vendor-scoped) options selectable/visible. */}
                            {row.type && !sinkOpts.some(o => o.value === row.type) && (
                              <option value={row.type}>{row.type}</option>
                            )}
                            {sinkOpts.map(o => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </span>
                      </td>
                      <td className="py-1 pr-2">
                        <NumInput value={row.qty} onChange={v => setRow('qty', v)} className="w-full text-center" placeholder="0" />
                      </td>
                      <td className="py-1 pr-2">
                        <NumInput
                          value={row.unitCost}
                          onChange={v => setRow('unitCost', v)}
                          className="w-full text-center"
                          placeholder={sinkUnitPrice(row, materialRows, p, true).toFixed(2)}
                        />
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
                        <NumInput
                          value={row.hours}
                          onChange={v => setRow('hours', v)}
                          className="w-full text-center"
                          placeholder={p(
                            OK_RATES.sinkLab.dbName,
                            OK_RATES.sinkLab.fallback
                          ).toFixed(2)}
                        />
                      </td>
                      <td className="py-1 pr-2 text-center text-xs text-gray-600">
                        {row.clientProvided ? 'client' : skMat > 0 ? `$${skMat.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-1 text-center">
                        {sinkRows.length > 1 && (
                          <button
                            type="button"
                            className="text-gray-300 hover:text-red-500"
                            title="Remove row"
                            onClick={() => setSinkRows(rs => rs.filter((_, idx) => idx !== i))}
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
              onClick={() => setSinkRows(rs => [...rs, SINK_ROW()])}
              className="mt-2 text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              + Add sink
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
                <th className="text-center pb-1 pr-2 font-medium">Vendor</th>
                <th className="text-center pb-1 pr-2 font-medium">Type</th>
                <th className="text-center pb-1 pr-2 font-medium">Sq Ft</th>
                <th className="text-center pb-1 pr-2 font-medium text-gray-400">$/Unit</th>
                <th className="text-center pb-1 font-medium text-gray-400">Material $</th>
              </tr>
            </thead>
            <tbody>
              {wallFinishRows.map((row, i) => {
                const meta = WF_META[row.type] || masterWallMeta(WF_CAT, row.type, materialRows, 'Outdoor Kitchen')
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
                          value={row.type}
                          onChange={e => setWallFinishRow(i, 'type', e.target.value)}
                        >
                          {masterWallOptions(WF_CAT, WF_LIST, materialRows, 'Outdoor Kitchen', row.vendor || 'Standard').map(t => (
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
            onClick={() => setManualRows(rows => [...rows, { label: 'Misc 1', hours: '', materials: '', subCost: '' }])}
            className="mt-2 text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            + Add manual entry
          </button>
        </div>
      </div>

      {/* ── In House Materials Breakdown ── */}
      {subType !== 'Subcontractor' && (
        <div className="bg-gray-50 rounded-lg p-3 text-xs">
          <p className="font-semibold text-gray-600 uppercase tracking-wide text-xs mb-2">
            In House Materials Breakdown
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-gray-600">
            {calc.structureMat > 0 && (
              <span>
                Structure: <strong>${calc.structureMat.toFixed(2)}</strong>
              </span>
            )}
            {calc.counterMat > 0 && (
              <span>
                Countertop: <strong>${calc.counterMat.toFixed(2)}</strong>
              </span>
            )}
            {calc.equipMat > 0 && (
              <span>
                Appliances: <strong>${calc.equipMat.toFixed(2)}</strong>
              </span>
            )}
            {calc.sinkRowsMat > 0 && (
              <span>
                Sinks: <strong>${calc.sinkRowsMat.toFixed(2)}</strong>
              </span>
            )}
            {calc.epMat > 0 && (
              <span>
                Electrical & Plumbing: <strong>${calc.epMat.toFixed(2)}</strong>
              </span>
            )}
            {calc.finishMat > 0 && (
              <span>
                Wall Finishes: <strong>${calc.finishMat.toFixed(2)}</strong>
              </span>
            )}
            {calc.manMat > 0 && (
              <span>
                Manual: <strong>${calc.manMat.toFixed(2)}</strong>
              </span>
            )}
            {calc.salesTax > 0 && (
              <span>
                Sales Tax: <strong>${calc.salesTax.toFixed(2)}</strong>
              </span>
            )}
          </div>
          <p className="mt-2 pt-2 border-t border-gray-200 font-semibold text-gray-800">
            Total Materials: ${(calc.totalMat || 0).toFixed(2)}
          </p>
        </div>
      )}

      {/* ── Sub Materials Breakdown ── */}
      {subType === 'Subcontractor' && (
        <div className="bg-gray-50 rounded-lg p-3 text-xs">
          <p className="font-semibold text-gray-600 uppercase tracking-wide text-xs mb-2">
            Sub Materials Breakdown
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-gray-600">
            {calc.structureMat > 0 && (
              <span>
                Structure: <strong>${calc.structureMat.toFixed(2)}</strong>
              </span>
            )}
            {calc.counterMat > 0 && (
              <span>
                Countertop: <strong>${calc.counterMat.toFixed(2)}</strong>
              </span>
            )}
            {calc.equipMat > 0 && (
              <span>
                Appliances: <strong>${calc.equipMat.toFixed(2)}</strong>
              </span>
            )}
            {calc.sinkRowsMat > 0 && (
              <span>
                Sinks: <strong>${calc.sinkRowsMat.toFixed(2)}</strong>
              </span>
            )}
            {calc.epMat > 0 && (
              <span>
                Electrical & Plumbing: <strong>${calc.epMat.toFixed(2)}</strong>
              </span>
            )}
            {calc.finishMat > 0 && (
              <span>
                Wall Finishes: <strong>${calc.finishMat.toFixed(2)}</strong>
              </span>
            )}
            {calc.manMat > 0 && (
              <span>
                Manual: <strong>${calc.manMat.toFixed(2)}</strong>
              </span>
            )}
            {calc.salesTax > 0 && (
              <span>
                Sales Tax: <strong>${calc.salesTax.toFixed(2)}</strong>
              </span>
            )}
          </div>
          <p className="mt-2 pt-2 border-t border-gray-200 font-semibold text-gray-800">
            Total Materials: ${(calc.totalMat || 0).toFixed(2)}
          </p>
        </div>
      )}

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
