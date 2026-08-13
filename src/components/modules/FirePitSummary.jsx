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
  fpBlock: { dbName: 'FP Block', fallback: 2.5 },
  fpRebar: { dbName: 'FP Rebar', fallback: 0.5 },
  fpConcrete: { dbName: 'FP Concrete', fallback: 149.5 },
  fpGroutPump: { dbName: 'FP Grout Pump Setup', fallback: 150.0 },
  capFlagstone: { dbName: 'FP Cap Flagstone', fallback: 18.0 },
  capPrecast: { dbName: 'FP Cap Precast', fallback: 12.0 },
  capPipConcrete: { dbName: 'FP Cap PIP Concrete', fallback: 10.0 },
  capBullnose: { dbName: 'FP Cap Bullnose Brick', fallback: 5.0 },
  sandStucco: { dbName: 'Sand Stucco - FP', fallback: 0.0 },
  smoothStucco: { dbName: 'Smooth Stucco - FP', fallback: 0.0 },
  ledgerstone: { dbName: 'Ledgerstone - FP', fallback: 10.0 },
  stackedStone: { dbName: 'Stacked Stone - FP', fallback: 10.0 },
  tile: { dbName: 'Tile - FP', fallback: 6.5 },
  realFlagstone: { dbName: 'Real Flagstone - FP', fallback: 400.0 },
  realStone: { dbName: 'Real Stone - FP', fallback: 400.0 },
  digLab: { dbName: 'FP Dig Footing Labor Rate', fallback: 4.0 },
  rebarLab: { dbName: 'FP Set Rebar Labor Rate', fallback: 35.0 },
  blockLab: { dbName: 'FP Set Blocks Labor Rate', fallback: 10.4 },
  handGroutLab: { dbName: 'FP Hand Grout Labor Rate', fallback: 5.5 },
  pumpGroutLab: { dbName: 'FP Pump Grout Labor Rate', fallback: 81.0 },
  capFlagstoneLab: { dbName: 'FP Cap Flagstone Labor Rate', fallback: 0.25 },
  capPrecastLab: { dbName: 'FP Cap Precast Labor Rate', fallback: 0.2 },
  capPipConcreteLab: { dbName: 'FP Cap PIP Concrete Labor Rate', fallback: 0.15 },
  capBullnoseLab: { dbName: 'FP Cap Bullnose Brick Labor Rate', fallback: 0.08 },
  sandStuccoLab: { dbName: 'Sand Stucco - FP Labor Rate', fallback: 92 },
  smoothStuccoLab: { dbName: 'Smooth Stucco - FP Labor Rate', fallback: 65 },
  ledgerstoneLab: { dbName: 'Ledgerstone - FP Labor Rate', fallback: 24 },
  stackedStoneLab: { dbName: 'Stacked Stone - FP Labor Rate', fallback: 24 },
  tileLab: { dbName: 'Tile - FP Labor Rate', fallback: 0.2867 },
  flagstoneLab: { dbName: 'Real Flagstone - FP Labor Rate', fallback: 0.4487 },
  realStoneLab: { dbName: 'Real Stone - FP Labor Rate', fallback: 0.8954 },
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
  'Real Flagstone': { key: 'realFlagstone', labKey: 'flagstoneLab', unit: 'ton', tonPerSF: 80, labMode: 'perSF', delivPerTon: 80, misc: 268.75 },
  'Real Stone': { key: 'realStone', labKey: 'realStoneLab', unit: 'ton', tonPerSF: 70, labMode: 'perSF', delivPerTon: 180, addPerSF: 1 },
}

// Gas line + gas fixture labor fallbacks (Utilities catalog, hrs per unit).
const GAS_LINE_LAB_FALLBACK = {
  '1-1/2" Poly Gas Pipe': 0.05,
  '1" Black Iron Gas Pipe': 0.15,
  '1-1/2" Black Iron Gas Pipe': 0.2,
  '2" Black Iron Gas Pipe': 0.25,
}
const GAS_FIXTURE_LAB_FALLBACK = {
  '12" Single Gas Ring': 2,
  '18" Single Gas Ring': 2,
  '24" Single Gas Ring': 2,
  '24" Double Gas Ring': 2,
  "2' Straight Gas Bar": 2,
  "3' Straight Gas Bar": 2.5,
  "4' Straight Gas Bar": 3,
  'Gas Shut-Off Valve': 2,
}

// Gas fixture + gas line material fallbacks (Utilities catalog).
const GAS_FIXTURE_FALLBACK = {
  '12" Single Gas Ring': 61.75,
  '18" Single Gas Ring': 84.75,
  '24" Single Gas Ring': 107.75,
  '24" Double Gas Ring': 163.25,
  "2' Straight Gas Bar": 35.5,
  "3' Straight Gas Bar": 56.0,
  "4' Straight Gas Bar": 68.5,
  'Gas Shut-Off Valve': 89.7,
}
const GAS_LINE_FALLBACK = {
  '1-1/2" Poly Gas Pipe': 4.25,
  '1" Black Iron Gas Pipe': 2.76,
  '1-1/2" Black Iron Gas Pipe': 4.23,
  '2" Black Iron Gas Pipe': 5.72,
}

const DEFAULTS = { laborRatePerHour: 35, laborBurdenPct: 0.29, gpmd: 425, commissionRate: 0.12 }

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
    gpmd = DEFAULTS.gpmd,
    materialPrices = {},
    materialRows = [],
    calc: savedCalc = null,
  } = data
  // Reference the Sub record so it is available for future breakdown use.
  void sub

  const mp = (dbName, fallback) => materialPrices[dbName] ?? fallback

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
      const unit = meta.master
        ? meta.matUnit
        : mp(FP_RATES[meta.matKey].dbName, FP_RATES[meta.matKey].fallback)
      const labCoef = meta.master
        ? meta.laborCoeff
        : mp(FP_RATES[meta.labKey].dbName, FP_RATES[meta.labKey].fallback)
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
      const unit = meta.master
        ? meta.matUnit
        : mp(FP_RATES[meta.key].dbName, FP_RATES[meta.key].fallback)
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
        : mp(FP_RATES[meta.labKey].dbName, FP_RATES[meta.labKey].fallback)
      const hrs = meta.labMode === 'perDay' ? (labRate > 0 ? (sf / labRate) * 8 : 0) : sf * labRate
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
      const unit = mp(r.type, GAS_LINE_FALLBACK[r.type] ?? 0)
      const labCoef = mp(`${r.type} - Labor Rate`, GAS_LINE_LAB_FALLBACK[r.type] ?? 0)
      return { label: r.type, qty: `${lf} LF`, mat: lf * unit, hrs: lf * labCoef }
    })
    .filter(Boolean)
  const gasFixtureLines = (epGasRows || [])
    .map(r => {
      const qty = n(r.qty)
      if (qty <= 0) return null
      const unit = mp(r.type, GAS_FIXTURE_FALLBACK[r.type] ?? 0)
      const labCoef = mp(`${r.type} - Labor Rate`, GAS_FIXTURE_LAB_FALLBACK[r.type] ?? 0)
      return { label: r.type, qty: `${qty} ea`, mat: qty * unit, hrs: qty * labCoef }
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

  // Materials
  const blockMat = totalBlocks * mp(FP_RATES.fpBlock.dbName, FP_RATES.fpBlock.fallback)
  const rebarMat = totalRebarLF * mp('Rebar ' + (rebarSize || '#4'), FP_RATES.fpRebar.fallback)
  const footingMat = footingCY * mp(FP_RATES.fpConcrete.dbName, FP_RATES.fpConcrete.fallback)
  const groutMat = groutCY * mp(FP_RATES.fpConcrete.dbName, FP_RATES.fpConcrete.fallback)
  const pumpSetupMat =
    useGroutPump === 'Yes' && groutCF > 0
      ? mp(FP_RATES.fpGroutPump.dbName, FP_RATES.fpGroutPump.fallback)
      : 0

  const baseHrs =
    layoutHrsN +
    structuralBaseHrs +
    curveAddHrs +
    capHrs +
    finishHrs +
    gasHrs +
    manHrs
  const diffMod = 1 + n(difficulty) / 100
  const totalHrs = baseHrs * diffMod + n(hoursAdj)
  const manDays = totalHrs / 8
  const totalMat =
    blockMat +
    rebarMat +
    footingMat +
    groutMat +
    pumpSetupMat +
    capMat +
    finishMat +
    gasMat +
    manMat
  const laborCost = totalHrs * laborRatePerHour
  const burden = laborCost * DEFAULTS.laborBurdenPct
  const gp = manDays * gpmd
  const commission = gp * DEFAULTS.commissionRate
  const price = totalMat + laborCost + burden + gp + commission + manSub

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
      {/* Structure */}
      {n(wallLF) > 0 && (
        <>
          <SectionLabel title="Structure" />
          <LineRow label="Wall Perimeter" value={`${n(wallLF)} LF × ${n(wallHeightIn)}" high`} />
          <LineRow
            label="Blocks"
            value={`${totalBlocks.toFixed(0)} (${blocksPerCourse} × ${coursesCount} courses + waste)`}
          />
          <LineRow label="Footing" value={`${footingCY.toFixed(3)} CY`} />
          <LineRow
            label="Grout"
            value={`${groutCY.toFixed(3)} CY (${pctGrouted}% filled)`}
            sub={useGroutPump === 'Yes' ? 'Pump' : 'Hand mix'}
          />
          <LineRow label="Rebar" value={`${totalRebarLF.toFixed(0)} LF`} />
          {curveAddHrs > 0 && (
            <LineRow
              label="Curve Add"
              value={`${curveAddHrs.toFixed(2)} hrs`}
              sub={`${pctCurved}% curved`}
            />
          )}
          <LineRow
            label="Structure Materials"
            value={fmt(blockMat + rebarMat + footingMat + groutMat + pumpSetupMat)}
            highlight
          />
        </>
      )}

      {/* Wall Caps */}
      {capLines.length > 0 && (
        <>
          <SectionLabel title="Wall Caps" />
          {capLines.map((c, i) => (
            <LineRow key={i} label={c.label} value={`${c.lf} LF`} sub={fmt(c.mat)} />
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
            <LineRow key={i} label={c.label} value={`${c.sf} SF`} sub={fmt(c.mat)} />
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
