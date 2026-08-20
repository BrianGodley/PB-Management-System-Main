import FinancialSummaryList from './FinancialSummaryList'
import { catalogItemFor } from '../../lib/materialCatalog'
import { STRUCT_CALC } from './FirePitModule'

const STRUCT_TYPES = ['CMU', 'PIP', 'Modular', 'Brick']
const STRUCT_LABEL = { CMU: 'CMU Block', PIP: 'Poured in Place', Modular: 'Modular', Brick: 'Brick' }

// Resolve a master-list finish/cap row (sub_category=cat, Unspecified) → meta with
// its material unit + calc_meta params, mirroring the module so summary line items
// include finishes/caps added via Master Rates.
function masterFinishMeta(cat, typeLabel, materialRows) {
  const r = catalogItemFor(materialRows, cat, 'Standard', typeLabel, {
    standardRows: 'null-vendor',
    stripPrefix: true,
    fallbackFirst: false,
  })
  if (!r) return null
  const m = r.calc_meta || {}
  return {
    ...m,
    unit: m.unit || 'SF',
    labMode: m.labMode || 'perSF',
    matUnit: parseFloat(r.unit_cost) || 0,
    laborCoeff: parseFloat(m.laborCoeff) || 0,
    master: true,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FirePitSummary — read-only detail view for a saved Fire Pit module
// ─────────────────────────────────────────────────────────────────────────────

const FP_RATES = {
  fpBlock: { dbName: 'FP Block' },
  fpRebar: { dbName: 'FP Rebar' },
  fpConcrete: { dbName: 'FP Concrete' },
  fpGroutPump: { dbName: 'FP Grout Pump Setup' },
  capFlagstone: { dbName: 'FP Cap Flagstone' },
  capPrecast: { dbName: 'FP Cap Precast' },
  capPipConcrete: { dbName: 'FP Cap PIP Concrete' },
  capBullnose: { dbName: 'FP Cap Bullnose Brick' },
  sandStucco: { dbName: 'Sand Stucco - FP' },
  smoothStucco: { dbName: 'Smooth Stucco - FP' },
  ledgerstone: { dbName: 'Ledgerstone - FP' },
  stackedStone: { dbName: 'Stacked Stone - FP' },
  tile: { dbName: 'Tile - FP' },
  realFlagstone: { dbName: 'Real Flagstone - Finishes' }, // shared $/Sq Ft
  realStone: { dbName: 'Real Stone - Finishes' }, // shared $/Sq Ft
  digLab: { dbName: 'FP Dig Footing Labor Rate' },
  rebarLab: { dbName: 'FP Set Rebar Labor Rate' },
  blockLab: { dbName: 'FP Set Blocks Labor Rate' },
  handGroutLab: { dbName: 'FP Hand Grout Labor Rate' },
  pumpGroutLab: { dbName: 'FP Pump Grout Labor Rate' },
  capFlagstoneLab: { dbName: 'FP Cap Flagstone Labor Rate' },
  capPrecastLab: { dbName: 'FP Cap Precast Labor Rate' },
  capPipConcreteLab: { dbName: 'FP Cap PIP Concrete Labor Rate' },
  capBullnoseLab: { dbName: 'FP Cap Bullnose Brick Labor Rate' },
  sandStuccoLab: { dbName: 'Sand Stucco - FP Labor Rate' },
  smoothStuccoLab: { dbName: 'Smooth Stucco - FP Labor Rate' },
  ledgerstoneLab: { dbName: 'Ledgerstone - FP Labor Rate' },
  stackedStoneLab: { dbName: 'Stacked Stone - FP Labor Rate' },
  tileLab: { dbName: 'Tile - FP Labor Rate' },
  flagstoneLab: { dbName: 'Real Flagstone - FP Labor Rate' },
  realStoneLab: { dbName: 'Real Stone - FP Labor Rate' },
}

const CAP_META = {
  Flagstone: { matKey: 'capFlagstone', labKey: 'capFlagstoneLab' },
  Precast: { matKey: 'capPrecast', labKey: 'capPrecastLab' },
  'PIP Concrete': { matKey: 'capPipConcrete', labKey: 'capPipConcreteLab' },
  'Bullnose Brick': { matKey: 'capBullnose', labKey: 'capBullnoseLab' },
}

// Wall-finish master list (mirrors the module) — material unit price + labor by Type.
const WF_META = {
  'Sand Stucco': { key: 'sandStucco', labKey: 'sandStuccoLab', unit: 'SF', labMode: 'perDay' },
  'Smooth Stucco': { key: 'smoothStucco', labKey: 'smoothStuccoLab', unit: 'SF', labMode: 'perDay' },
  'Ledgerstone Veneer': { key: 'ledgerstone', labKey: 'ledgerstoneLab', unit: 'SF', labMode: 'perDay', waste: 1.1, screwPer5: 2 },
  'Stacked Stone Veneer': { key: 'stackedStone', labKey: 'stackedStoneLab', unit: 'SF', labMode: 'perDay', waste: 1.1, screwPer5: 2 },
  Tile: { key: 'tile', labKey: 'tileLab', unit: 'SF', labMode: 'perSF', adhesivePerSF: 1 },
  'Real Flagstone': { key: 'realFlagstone', labKey: 'flagstoneLab', unit: 'stone', labMode: 'perSF', delivPerSF: 1, misc: 268.75 },
  'Real Stone': { key: 'realStone', labKey: 'realStoneLab', unit: 'stone', labMode: 'perSF', delivPerSF: 2.5714, addPerSF: 1 },
}

// Gas line + gas fixture labor fallbacks (Utilities catalog, hrs per unit).

// Gas fixture + gas line material fallbacks (Utilities catalog).

const DEFAULTS = { laborRatePerHour: 35 }

const n = v => parseFloat(v) || 0
const fmt = v =>
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

export default function FirePitSummary({ module }) {
  const data = module?.data || {}
  // In-House and Sub are independent tab records (data.ihData / data.subData);
  // legacy estimates stored their inputs flat = In-House. The detail view below
  // re-derives from the In-House record; shared rate/price inputs stay top-level.
  const ih = data.ihData || data
  const sub = data.subData || {}
  const {
    difficulty = 0,
    hoursAdj = 0,
    capRows = [],
    wallFinishRows = [],
    epLineRows = [],
    epGasRows = [],
    manualRows = [],
  } = ih
  const {
    laborRatePerHour = DEFAULTS.laborRatePerHour,
    materialPrices = {},
    materialRows = [],
    calc: savedCalc = {},
  } = data
  // Reference the Sub record so it is available for future breakdown use.
  void sub

  const mp = dbName => n(materialPrices[dbName])

  // ── Structure — reuse the module's exported per-type calculators so every
  //    structure type (CMU/PIP/Modular/Brick) reprices from a single source of
  //    truth (not the old CMU-only derivation). Legacy bids stored the CMU wall
  //    flat on the In-House record → fold onto structs.CMU. ────────────────────
  const structs =
    ih.structs || {
      CMU: {
        wallLF: ih.wallLF,
        wallHeightIn: ih.wallHeightIn,
        footingWidthIn: ih.footingWidthIn,
        footingDepthIn: ih.footingDepthIn,
        rebarSpacingIn: ih.rebarSpacingIn,
        bondBeamCourses: ih.bondBeamCourses,
        pctGrouted: ih.pctGrouted,
        pctCurved: ih.pctCurved,
        useGroutPump: ih.useGroutPump,
        layoutHrs: ih.layoutHrs,
        rebarSize: ih.rebarSize ?? data.rebarSize ?? '#4',
      },
    }
  const structResults = STRUCT_TYPES.map(t => ({
    type: t,
    struct: structs[t] || {},
    ...(STRUCT_CALC[t](structs[t] || {}, materialPrices, materialRows) || { mat: 0, hrs: 0 }),
  })).filter(r => n(r.struct.wallLF) > 0)
  const structMat = structResults.reduce((s, r) => s + n(r.mat), 0)
  const structHrs = structResults.reduce((s, r) => s + n(r.hrs), 0)

  // ── Wall caps ($/LF material) ────────────────────────────────────────────────
  const capLines = (capRows || [])
    .map(r => {
      const meta = CAP_META[r.type] || masterFinishMeta('Wall Cap', r.type, materialRows)
      const lf = n(r.lf)
      if (!meta || lf <= 0) return null
      const unit = meta.master ? meta.matUnit : mp(FP_RATES[meta.matKey].dbName)
      // Labor: numeric coefficient, else the Master-Rates default-labor pointer
      // (calc_meta.labor_rate). No type fallback — an unset rate reads as 0 here
      // (read-only view; the live module surfaces the fix-it modal).
      const labName = meta.master ? meta.labor_rate : FP_RATES[meta.labKey].dbName
      const labCoef = meta.master && n(meta.laborCoeff) > 0 ? n(meta.laborCoeff) : labName ? mp(labName) : 0
      return { label: r.type, lf, mat: lf * unit, hrs: lf * labCoef }
    })
    .filter(Boolean)
  const capMat = capLines.reduce((s, c) => s + c.mat, 0)
  const capHrs = capLines.reduce((s, c) => s + c.hrs, 0)

  // ── Wall finishes ────────────────────────────────────────────────────────────
  const finishLines = (wallFinishRows || [])
    .map(r => {
      const meta = WF_META[r.type] || masterFinishMeta('Wall Finish', r.type, materialRows)
      const sf = n(r.sf)
      if (!meta || sf <= 0) return null
      const unit = meta.master ? meta.matUnit : mp(FP_RATES[meta.key].dbName)
      let mat = 0
      if (meta.unit === 'stone') {
        // Material $/Sq Ft (shared Finishes rate) + delivery $/SF + flat misc + add/SF.
        mat =
          sf * unit +
          sf * (meta.delivPerSF || 0) +
          (meta.misc || 0) +
          (meta.addPerSF ? sf * meta.addPerSF : 0)
      } else {
        mat =
          sf * unit * (meta.waste || 1) +
          (meta.screwPer5 ? (sf / 5) * meta.screwPer5 : 0) +
          (meta.adhesivePerSF ? sf * meta.adhesivePerSF : 0)
      }
      // Labor: numeric coefficient, else the default-labor pointer. No type fallback.
      const labName = meta.master ? meta.labor_rate : FP_RATES[meta.labKey].dbName
      const labRate = meta.master && n(meta.laborCoeff) > 0 ? n(meta.laborCoeff) : labName ? mp(labName) : 0
      const hrs = sf * labRate // all finish labor is hours per Sq Ft now
      return { label: r.type, sf, mat, hrs }
    })
    .filter(Boolean)
  const finishMat = finishLines.reduce((s, c) => s + c.mat, 0)
  const finishHrs = finishLines.reduce((s, c) => s + c.hrs, 0)

  // ── Gas line + gas fixtures (material fallbacks; DB rate overrides when present) ──
  const gasLineLines = (epLineRows || [])
    .map(r => {
      const lf = n(r.lf)
      if (lf <= 0) return null
      const unit = mp(r.type)
      const labCoef = mp(`${r.type} - Labor Rate`)
      return { label: r.type, qty: `${lf} Ln Ft`, mat: lf * unit, hrs: lf * labCoef }
    })
    .filter(Boolean)
  const gasFixtureLines = (epGasRows || [])
    .map(r => {
      const qty = n(r.qty)
      if (qty <= 0) return null
      const unit = mp(r.type)
      const labCoef = mp(`${r.type} - Labor Rate`)
      return { label: r.type, qty: `${qty} Each`, mat: qty * unit, hrs: qty * labCoef }
    })
    .filter(Boolean)
  const gasMat =
    gasLineLines.reduce((s, c) => s + c.mat, 0) + gasFixtureLines.reduce((s, c) => s + c.mat, 0)
  const gasHrs =
    gasLineLines.reduce((s, c) => s + c.hrs, 0) + gasFixtureLines.reduce((s, c) => s + c.hrs, 0)

  let manHrs = 0,
    manMat = 0,
    manSub = 0
  manualRows.forEach(r => {
    manHrs += n(r.hours)
    manMat += n(r.materials)
    manSub += n(r.subCost)
  })

  // Structure materials + hours come from the per-type STRUCT_CALC results above
  // (single source of truth); the old CMU-only single-struct derivation is retired.
  const baseHrs = structHrs + capHrs + finishHrs + gasHrs + manHrs
  const diffMod = 1 + n(difficulty) / 100
  const totalHrs = baseHrs * diffMod + n(hoursAdj)
  const manDays = totalHrs / 8
  const totalMat = structMat + capMat + finishMat + gasMat + manMat
  const laborCost = n(savedCalc.laborCost)
  const burden = n(savedCalc.burden)
  const gp = n(savedCalc.gp)
  const commission = n(savedCalc.commission)
  const price = n(savedCalc.price)

  const financeRows = [
    { label: 'Materials', value: fmt(totalMat) },
    { label: 'Labor', value: fmt(laborCost) },
    { label: 'Burden', value: fmt(burden) },
    { label: 'GP', value: fmt(gp) },
    { label: 'Commission', value: fmt(commission) },
    { label: 'Subs', value: fmt(manSub) },
    { label: 'Price', value: fmt(price), highlight: true },
  ]

  return (
    <div className="text-sm space-y-1">
      {/* Structure — one block per structure type (CMU/PIP/Modular/Brick) */}
      {structResults.length > 0 && (
        <>
          <SectionLabel title="Structure" />
          {structResults.map((r, i) => (
            <div key={i}>
              <LineRow
                label={`${r.type} Wall`}
                value={`${n(r.struct.wallLF)} Ln Ft × ${n(r.struct.wallHeightIn)}" high`}
              />
              {n(r.totalBlocks) > 0 && (
                <LineRow label="Blocks" value={`${n(r.totalBlocks).toFixed(0)}`} />
              )}
              {n(r.footingCY) > 0 && (
                <LineRow label="Footing" value={`${n(r.footingCY).toFixed(3)} Cu Yd`} />
              )}
              {n(r.groutCY) > 0 && (
                <LineRow label="Grout" value={`${n(r.groutCY).toFixed(3)} Cu Yd`} />
              )}
              {n(r.totalRebarLF) > 0 && (
                <LineRow label="Rebar" value={`${n(r.totalRebarLF).toFixed(0)} Ln Ft`} />
              )}
              {n(r.curveAddHrs) > 0 && (
                <LineRow label="Curve Add" value={`${n(r.curveAddHrs).toFixed(2)} hrs`} />
              )}
            </div>
          ))}
          <LineRow label="Structure Materials" value={fmt(structMat)} highlight />
        </>
      )}

      {/* Wall Caps */}
      {capLines.length > 0 && (
        <>
          <SectionLabel title="Wall Caps" />
          {capLines.map((c, i) => (
            <LineRow key={i} label={c.label} value={`${c.lf} Ln Ft`} sub={fmt(c.mat)} />
          ))}
        </>
      )}

      {/* Gas Line */}
      {gasLineLines.length > 0 && (
        <>
          <SectionLabel title="Gas Line" />
          {gasLineLines.map((c, i) => (
            <LineRow key={i} label={c.label} value={c.qty} sub={fmt(c.mat)} />
          ))}
        </>
      )}

      {/* Gas Fixtures */}
      {gasFixtureLines.length > 0 && (
        <>
          <SectionLabel title="Gas Fixtures" />
          {gasFixtureLines.map((c, i) => (
            <LineRow key={i} label={c.label} value={c.qty} sub={fmt(c.mat)} />
          ))}
        </>
      )}

      {/* Wall finishes */}
      {finishLines.length > 0 && (
        <>
          <SectionLabel title="Wall Finishes" />
          {finishLines.map((c, i) => (
            <LineRow key={i} label={c.label} value={`${c.sf} Sq Ft`} sub={fmt(c.mat)} />
          ))}
        </>
      )}

      {/* Manual */}
      {manualRows.filter(r => n(r.hours) || n(r.materials) || n(r.subCost)).length > 0 && (
        <>
          <SectionLabel title="Manual Entry" />
          {manualRows
            .filter(r => n(r.hours) || n(r.materials) || n(r.subCost))
            .map((r, i) => (
              <LineRow
                key={i}
                label={r.label || `Misc ${i + 1}`}
                value={n(r.hours) > 0 ? `${n(r.hours)} hrs` : '—'}
                sub={[
                  n(r.materials) > 0 && fmt(r.materials),
                  n(r.subCost) > 0 && `Sub: ${fmt(r.subCost)}`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              />
            ))}
        </>
      )}

      {/* Totals */}
      <SectionLabel title="Totals" />
      <LineRow label="Total Hours" value={`${totalHrs.toFixed(2)} hrs`} />
      <LineRow label="Man Days" value={`${manDays.toFixed(2)} days`} />

      <div className="mt-3">
        <FinancialSummaryList
          totalHrs={n(totalHrs)}
          manDays={n(manDays)}
          totalMat={n(totalMat)}
          laborCost={n(laborCost)}
          lrph={n(laborRatePerHour) || 35}
          burden={n(burden)}
          subCost={n(manSub)}
          gp={n(gp)}
          subGp={0}
          commission={n(commission)}
          price={n(price)}
        />
      </div>
    </div>
  )
}
