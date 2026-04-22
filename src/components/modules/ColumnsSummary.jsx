import FinancialSummaryList from './FinancialSummaryList'

// ─────────────────────────────────────────────────────────────────────────────
// ColumnsSummary — read-only detail view for a saved Columns module
// ─────────────────────────────────────────────────────────────────────────────

const FINISH_TYPES = {
  'Sand Stucco':               { costPerSF: 0,      unit: 'SF',  dbName: 'Sand Stucco',               laborDbName: 'Sand Stucco - Labor Rate',               laborHrsPerSF: 0.05  },
  'Smooth Stucco':             { costPerSF: 0,      unit: 'SF',  dbName: 'Smooth Stucco',             laborDbName: 'Smooth Stucco - Labor Rate',             laborHrsPerSF: 0.05  },
  'Ledgerstone Veneer Panels': { costPerSF: 10.00,  unit: 'SF',  dbName: 'Ledgerstone Veneer Panels', laborDbName: 'Ledgerstone Veneer Panels - Labor Rate', laborHrsPerSF: 0.10  },
  'Stacked Stone Veneer':      { costPerSF: 10.00,  unit: 'SF',  dbName: 'Stacked Stone Veneer',      laborDbName: 'Stacked Stone Veneer - Labor Rate',      laborHrsPerSF: 0.10  },
  'Tile':                      { costPerSF: 6.50,   unit: 'SF',  dbName: 'Tile - Columns',            laborDbName: 'Tile - Columns - Labor Rate',            laborHrsPerSF: 0.125 },
  'Real Flagstone, Flat':      { costPerTon: 400.0, unit: 'ton', dbName: 'Real Flagstone Flat',       laborDbName: 'Real Flagstone Flat - Labor Rate',       laborHrsPer: 0.5     },
  'Real Stone':                { costPerTon: 400.0, unit: 'ton', dbName: 'Real Stone - Columns',      laborDbName: 'Real Stone - Columns - Labor Rate',      laborHrsPer: 0.5     },
}

const BLOCK_RATES = {
  blockMatCost:    { dbName: 'CMU Block',              fallback: 2.50  },
  rebarMatCost:    { dbName: 'Rebar - Columns',        fallback: 0.80  },
  fillMatCost:     { dbName: 'Fill Block / Grout',     fallback: 0.75  },
  installLaborHrs: { dbName: 'CMU Install Labor',      fallback: 0.083 },
  excavateLaborHrs:{ dbName: 'Excavate Footing Labor', fallback: 0.5   },
  pourLaborHrs:    { dbName: 'Pour Footing Labor',     fallback: 0.25  },
  fillLaborHrs:    { dbName: 'Fill Labor',             fallback: 0.05  },
}

const MISC_RATES = {
  bbqBlock:        { dbName: 'BBQ Block',        matCost: 5.00, laborHrs: 0.10, label: 'BBQ Block'        },
  backsplashBlock: { dbName: 'Backsplash Block', matCost: 3.50, laborHrs: 0.05, label: 'Backsplash Block' },
}

function columnGeometry(heightIn, widthIn) {
  const n = (v) => parseFloat(v) || 0
  const courses         = Math.ceil(n(heightIn) / 8)
  const blocksWide      = Math.ceil(n(widthIn)  / 8)
  const blocksPerCourse = blocksWide * blocksWide
  const totalBlocks     = courses * blocksPerCourse
  const rebarLF         = (n(heightIn) / 12) * (blocksWide > 1 ? 4 : 1)
  const footingArea     = Math.pow((n(widthIn) / 12) + 1, 2)
  return { courses, blocksWide, blocksPerCourse, totalBlocks, rebarLF, footingArea }
}

const n = (v) => parseFloat(v) || 0

function SectionLabel({ title }) {
  return (
    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-4 mb-1 border-t border-gray-100 pt-3">
      {title}
    </p>
  )
}

function LineRow({ label, value, sub, highlight }) {
  return (
    <div className={`flex items-start justify-between py-1 border-b border-gray-50 ${highlight ? 'font-semibold' : ''}`}>
      <span className={`text-xs ${highlight ? 'text-gray-800' : 'text-gray-600'} flex-1 pr-2`}>{label}</span>
      <div className="text-right shrink-0">
        <span className={`text-xs ${highlight ? 'text-gray-900 font-semibold' : 'text-gray-700'}`}>{value}</span>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  )
}

export default function ColumnsSummary({ module }) {
  const data = module?.data || {}
  const {
    difficulty      = 0,
    hoursAdj        = 0,
    qty             = 0,
    heightIn        = 0,
    widthIn         = 0,
    finishRows      = [],
    miscQty         = {},
    manualRows      = [],
    laborRatePerHour = 35,
    materialPrices  = {},
    calc            = null,
  } = data

  const price = (dbName, fallback) =>
    materialPrices[dbName] != null ? materialPrices[dbName] : fallback

  const fmt2 = (v) => `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  // ── Column Install ───────────────────────────────────────────────────────────
  let installSection = null
  if (n(qty) > 0 && n(heightIn) > 0 && n(widthIn) > 0) {
    const geo        = columnGeometry(heightIn, widthIn)
    const totalBlocks = geo.totalBlocks * n(qty)
    const totalRebar  = geo.rebarLF    * n(qty)

    const blockCost   = price(BLOCK_RATES.blockMatCost.dbName,     BLOCK_RATES.blockMatCost.fallback)
    const fillCost    = price(BLOCK_RATES.fillMatCost.dbName,      BLOCK_RATES.fillMatCost.fallback)
    const rebarCost   = price(BLOCK_RATES.rebarMatCost.dbName,     BLOCK_RATES.rebarMatCost.fallback)
    const excavateLab = price(BLOCK_RATES.excavateLaborHrs.dbName, BLOCK_RATES.excavateLaborHrs.fallback)
    const pourLab     = price(BLOCK_RATES.pourLaborHrs.dbName,     BLOCK_RATES.pourLaborHrs.fallback)
    const installLab  = price(BLOCK_RATES.installLaborHrs.dbName,  BLOCK_RATES.installLaborHrs.fallback)
    const fillLab     = price(BLOCK_RATES.fillLaborHrs.dbName,     BLOCK_RATES.fillLaborHrs.fallback)

    const matTotal    = totalBlocks * blockCost + totalBlocks * fillCost + totalRebar * rebarCost
    const hrsTotal    = n(qty) * excavateLab + n(qty) * pourLab + totalBlocks * installLab + totalBlocks * fillLab

    installSection = (
      <>
        <SectionLabel title="Column Install" />
        <div className="bg-green-50 rounded-lg px-3 py-2 mb-1 grid grid-cols-2 gap-x-4 gap-y-0.5">
          <span className="text-xs text-gray-600">Columns: <strong>{n(qty)}</strong></span>
          <span className="text-xs text-gray-600">Courses: <strong>{geo.courses}</strong></span>
          <span className="text-xs text-gray-600">Blocks/course: <strong>{geo.blocksPerCourse}</strong></span>
          <span className="text-xs text-gray-600">Total blocks: <strong>{totalBlocks}</strong></span>
          <span className="text-xs text-gray-600">Rebar total: <strong>{totalRebar.toFixed(1)} LF</strong></span>
          <span className="text-xs text-gray-600">Height × Width: <strong>{n(heightIn)}" × {n(widthIn)}"</strong></span>
        </div>
        <LineRow label="CMU Blocks + Fill + Grout" value={fmt2(matTotal)} sub={`${hrsTotal.toFixed(2)} hrs labor`} />
      </>
    )
  }

  // ── Finishes ─────────────────────────────────────────────────────────────────
  const finishLines = finishRows
    .map((r, i) => {
      const rate = FINISH_TYPES[r.type]
      if (!rate || !n(r.qty)) return null
      const isTon  = rate.unit === 'ton'
      const cost   = price(rate.dbName, isTon ? rate.costPerTon : rate.costPerSF)
      const labHrs = price(rate.laborDbName, isTon ? rate.laborHrsPer : rate.laborHrsPerSF)
      const mat    = n(r.qty) * cost
      const hrs    = n(r.qty) * labHrs
      return {
        key: i,
        label: `${r.type} — ${n(r.qty)} ${rate.unit}`,
        value: fmt2(mat),
        sub: `${hrs.toFixed(2)} hrs labor  ·  ${fmt2(cost)}/${rate.unit}`,
      }
    })
    .filter(Boolean)

  // ── Additional Items ─────────────────────────────────────────────────────────
  const miscLines = Object.entries(MISC_RATES)
    .map(([key, rate]) => {
      const q = n(miscQty[`${key}Qty`])
      if (!q) return null
      const matCostEa = price(rate.dbName, rate.matCost)
      return {
        key,
        label: `${rate.label} × ${q}`,
        value: fmt2(q * matCostEa),
        sub: `${(q * rate.laborHrs).toFixed(2)} hrs labor  ·  ${fmt2(matCostEa)}/ea`,
      }
    })
    .filter(Boolean)

  // ── Manual rows ──────────────────────────────────────────────────────────────
  const manualLines = (manualRows || []).filter(r => n(r.hours) > 0 || n(r.materials) > 0 || n(r.subCost) > 0)

  // ── Financials from saved calc ───────────────────────────────────────────────
  const savedCalc  = calc || {}
  const totalHrs   = n(savedCalc.totalHrs)
  const manDays    = n(savedCalc.manDays)    || n(module.man_days)
  const totalMat   = n(savedCalc.totalMat)   || n(module.material_cost)
  const laborCost  = n(savedCalc.laborCost)  || (totalHrs * n(laborRatePerHour))
  const burden     = n(savedCalc.burden)
  const gp         = n(savedCalc.gp)
  const commission = n(savedCalc.commission) || gp * 0.12
  const subCost    = n(savedCalc.subCost)
  const priceTotal = n(savedCalc.price)

  const hasAnyLines = (n(qty) > 0 && n(heightIn) > 0 && n(widthIn) > 0)
    || finishLines.length || miscLines.length || manualLines.length

  return (
    <div className="space-y-1 text-sm">

      {/* Top stat bar */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-0.5">Man Days</p>
          <p className="text-xl font-bold text-gray-900">{manDays.toFixed(2)}</p>
          <p className="text-xs text-gray-400">{totalHrs.toFixed(1)} hrs</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-0.5">Materials</p>
          <p className="text-xl font-bold text-gray-900">{fmt2(totalMat)}</p>
        </div>
      </div>

      {n(difficulty) > 0 && (
        <div className="flex items-center justify-between text-xs text-amber-700 bg-amber-50 rounded px-3 py-1.5">
          <span>Difficulty modifier applied</span>
          <span className="font-semibold">+{difficulty}%</span>
        </div>
      )}
      {n(hoursAdj) !== 0 && (
        <div className="flex items-center justify-between text-xs text-blue-700 bg-blue-50 rounded px-3 py-1.5">
          <span>Hours adjustment</span>
          <span className="font-semibold">{n(hoursAdj) > 0 ? '+' : ''}{n(hoursAdj).toFixed(1)} hrs</span>
        </div>
      )}

      {!hasAnyLines ? (
        <p className="text-xs text-gray-400 text-center py-4">No line items entered.</p>
      ) : (
        <>
          {installSection}

          {finishLines.length > 0 && (
            <>
              <SectionLabel title="Finishes" />
              {finishLines.map(l => <LineRow key={l.key} label={l.label} value={l.value} sub={l.sub} />)}
            </>
          )}

          {miscLines.length > 0 && (
            <>
              <SectionLabel title="Additional Items" />
              {miscLines.map(l => <LineRow key={l.key} label={l.label} value={l.value} sub={l.sub} />)}
            </>
          )}

          {manualLines.length > 0 && (
            <>
              <SectionLabel title="Manual Entry" />
              {manualLines.map((r, i) => (
                <div key={i} className="py-1 border-b border-gray-50">
                  <p className="text-xs font-medium text-gray-700">{r.label}</p>
                  <div className="flex gap-3 mt-0.5">
                    {n(r.hours)     > 0 && <span className="text-xs text-gray-500">{n(r.hours).toFixed(1)} hrs</span>}
                    {n(r.materials) > 0 && <span className="text-xs text-gray-500">{fmt2(r.materials)} mat.</span>}
                    {n(r.subCost)   > 0 && <span className="text-xs text-gray-500">{fmt2(r.subCost)} sub</span>}
                  </div>
                </div>
              ))}
            </>
          )}
        </>
      )}

      <FinancialSummaryList
        totalHrs={totalHrs} manDays={manDays} totalMat={totalMat}
        laborCost={laborCost} lrph={n(laborRatePerHour)} burden={burden}
        subCost={subCost} gp={gp} commission={commission} price={priceTotal}
      />
    </div>
  )
}
