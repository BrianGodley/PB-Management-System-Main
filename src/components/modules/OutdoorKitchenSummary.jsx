import FinancialSummaryList from './FinancialSummaryList'

// ─────────────────────────────────────────────────────────────────────────────
// OutdoorKitchenSummary — read-only detail view for a saved Outdoor Kitchen module
// ─────────────────────────────────────────────────────────────────────────────

const OK_RATES = {
  bbqBlock:         { dbName: 'BBQ Block',              fallback: 2.50   },
  bbqRebar:         { dbName: 'BBQ Rebar',              fallback: 0.40   },
  bbqConcrete:      { dbName: 'BBQ Concrete',           fallback: 149.50 },
  bbqFillMat:       { dbName: 'BBQ Fill Material',      fallback: 60.00  },
  applianceHardware:{ dbName: 'BBQ Appliance Hardware', fallback: 3.00   },
  gficOutlet:       { dbName: 'GFIC Outlet - BBQ',      fallback: 80.00  },
  sinkPlumbing:     { dbName: 'Sink Plumbing - BBQ',    fallback: 115.00 },
  gasPipe:          { dbName: 'Gas Pipe - BBQ',         fallback: 3.00   },
  sandStucco:       { dbName: 'Sand Stucco - BBQ',      fallback: 0.00   },
  smoothStucco:     { dbName: 'Smooth Stucco - BBQ',    fallback: 0.00   },
  ledgerstone:      { dbName: 'Ledgerstone - BBQ',      fallback: 10.00  },
  stackedStone:     { dbName: 'Stacked Stone - BBQ',    fallback: 10.00  },
  tile:             { dbName: 'Tile - BBQ',             fallback: 6.50   },
  realFlagstone:    { dbName: 'Real Flagstone - BBQ',   fallback: 400.00 },
  realStone:        { dbName: 'Real Stone - BBQ',       fallback: 400.00 },
}

const n = (v) => parseFloat(v) || 0
const fmt2 = (v) => `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

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

export default function OutdoorKitchenSummary({ module }) {
  const data = module?.data || {}
  const {
    difficulty = 0, hoursAdj = 0, layoutHrs = 0,
    bbqLengthLF = 0, bbqHeightIn = 48, backLengthLF = 0, backHeightIn = 48,
    footingWidthIn = 12, footingDepthIn = 12,
    counterSF = 0, counterFinish = 'Broom Finish',
    applianceCount = 0, gficCount = 0, sinkYN = 'No', gasTrenchLF = 0,
    sandStuccoSF = 0, smoothStuccoSF = 0, ledgerstoneSF = 0, stackedStoneSF = 0,
    tileSF = 0, flagstoneSF = 0, flagstoneRateInput, realStoneSF = 0, realStoneRateInput,
    manualRows = [],
    laborRatePerHour = 35,
    materialPrices = {},
    calc = null,
  } = data

  const mp = (dbName, fallback) => materialPrices[dbName] != null ? materialPrices[dbName] : fallback

  // ── Re-derive key quantities ────────────────────────────────────────────────
  const totalLF       = n(bbqLengthLF) + n(backLengthLF)
  const bbqWallSF     = (n(bbqHeightIn)/12) * n(bbqLengthLF)
  const backWallSF    = (n(backHeightIn)/12) * n(backLengthLF)
  const totalWallSF   = bbqWallSF + backWallSF
  const blockRaw      = totalLF > 0 ? totalWallSF / 0.888 : 0
  const blockWaste    = blockRaw * 1.1
  const blockOrdered  = blockWaste * 1.1
  const footingAreaSF = (n(footingWidthIn) * n(footingDepthIn)) / 144
  const footingCY     = totalLF * footingAreaSF / 27
  const rebarLF       = totalLF * 4
  const fillCY        = (n(bbqHeightIn)/12) * n(bbqLengthLF) * 0.25 / 27 / 2
  const counterCY     = n(counterSF) * 0.33 / 27

  // ── Section lines ───────────────────────────────────────────────────────────
  const structureLines = []
  if (totalLF > 0) {
    const blockMat   = blockOrdered * mp(OK_RATES.bbqBlock.dbName, OK_RATES.bbqBlock.fallback)
    const rebarMat   = rebarLF * mp(OK_RATES.bbqRebar.dbName, OK_RATES.bbqRebar.fallback)
    const footingMat = footingCY * mp(OK_RATES.bbqConcrete.dbName, OK_RATES.bbqConcrete.fallback)
    const fillMat    = fillCY * mp(OK_RATES.bbqFillMat.dbName, OK_RATES.bbqFillMat.fallback)
    const excavHrs   = (totalLF * footingAreaSF) / 5
    const rebarHrs   = (rebarLF / 146) * 8
    const pourHrs    = footingCY * 4
    const installHrs = (blockWaste / 60) * 8
    const fillHrs    = ((80/75) * blockRaw / 146) * 8
    const totalStructHrs = excavHrs + rebarHrs + pourHrs + installHrs + fillHrs
    structureLines.push({
      label: `BBQ Wall ${n(bbqLengthLF)} LF × ${n(bbqHeightIn)}"${n(backLengthLF) > 0 ? ` + Backsplash ${n(backLengthLF)} LF × ${n(backHeightIn)}"` : ''}`,
      value: fmt2(blockMat + rebarMat + footingMat + fillMat),
      sub: `${totalStructHrs.toFixed(2)} hrs · ${blockOrdered.toFixed(0)} blocks · ${footingCY.toFixed(2)} CY footing`
    })
  }

  const counterLines = []
  if (n(counterSF) > 0) {
    const concMat   = counterCY * mp(OK_RATES.bbqConcrete.dbName, OK_RATES.bbqConcrete.fallback)
    const polishMat = counterFinish === 'Polished Finish' ? n(counterSF) : 0
    const formHrs   = (n(counterSF) * 2) / 20
    const pourHrs   = (n(counterSF) / 50) * 8
    const finishHrs = counterFinish === 'Broom Finish' ? (n(counterSF)/60)*8 : (n(counterSF)/18)*8
    counterLines.push({
      label: `Counter — ${n(counterSF).toLocaleString()} SF (${counterFinish})`,
      value: fmt2(concMat + polishMat),
      sub: `${(formHrs+pourHrs+finishHrs).toFixed(2)} hrs · ${counterCY.toFixed(3)} CY`
    })
  }

  const serviceLines = []
  if (n(layoutHrs) > 0) serviceLines.push({ label: 'Layout Time', value: '—', sub: `${n(layoutHrs).toFixed(1)} hrs` })
  if (n(applianceCount) > 0) {
    const mat = n(applianceCount) * mp(OK_RATES.applianceHardware.dbName, OK_RATES.applianceHardware.fallback)
    const hrs = (n(applianceCount) / 2.75) * 8
    serviceLines.push({ label: `Appliances/Openings — ${n(applianceCount)}`, value: fmt2(mat), sub: `${hrs.toFixed(2)} hrs` })
  }
  if (n(gficCount) > 0) {
    const mat = n(gficCount) * mp(OK_RATES.gficOutlet.dbName, OK_RATES.gficOutlet.fallback)
    serviceLines.push({ label: `GFIC Outlets — ${n(gficCount)}`, value: fmt2(mat), sub: `${(n(gficCount)*2).toFixed(0)} hrs` })
  }
  if (sinkYN === 'Yes') {
    const mat = mp(OK_RATES.sinkPlumbing.dbName, OK_RATES.sinkPlumbing.fallback)
    serviceLines.push({ label: 'Sink Plumbing', value: fmt2(mat), sub: '4 hrs' })
  }
  if (n(gasTrenchLF) > 0) {
    const mat = n(gasTrenchLF) * mp(OK_RATES.gasPipe.dbName, OK_RATES.gasPipe.fallback)
    const hrs = (n(gasTrenchLF) / 35) * 8
    serviceLines.push({ label: `Gas Trench/Run — ${n(gasTrenchLF).toLocaleString()} LF`, value: fmt2(mat), sub: `${hrs.toFixed(2)} hrs` })
  }

  const finishLines = []
  if (n(sandStuccoSF) > 0) {
    const mat = n(sandStuccoSF) * mp(OK_RATES.sandStucco.dbName, OK_RATES.sandStucco.fallback)
    const hrs = (n(sandStuccoSF) / 92) * 8
    finishLines.push({ label: `Sand Stucco — ${n(sandStuccoSF).toLocaleString()} SF`, value: fmt2(mat), sub: `${hrs.toFixed(2)} hrs` })
  }
  if (n(smoothStuccoSF) > 0) {
    const mat = n(smoothStuccoSF) * mp(OK_RATES.smoothStucco.dbName, OK_RATES.smoothStucco.fallback)
    const hrs = (n(smoothStuccoSF) / 65) * 8
    finishLines.push({ label: `Smooth Stucco — ${n(smoothStuccoSF).toLocaleString()} SF`, value: fmt2(mat), sub: `${hrs.toFixed(2)} hrs` })
  }
  if (n(ledgerstoneSF) > 0) {
    const rate = mp(OK_RATES.ledgerstone.dbName, OK_RATES.ledgerstone.fallback)
    const mat  = n(ledgerstoneSF) * rate * 1.1 + (n(ledgerstoneSF)/5)*2
    const hrs  = (n(ledgerstoneSF) / 24) * 8
    finishLines.push({ label: `Ledgerstone — ${n(ledgerstoneSF).toLocaleString()} SF`, value: fmt2(mat), sub: `${hrs.toFixed(2)} hrs · ${fmt2(rate)}/SF` })
  }
  if (n(stackedStoneSF) > 0) {
    const rate = mp(OK_RATES.stackedStone.dbName, OK_RATES.stackedStone.fallback)
    const mat  = n(stackedStoneSF) * rate * 1.1 + (n(stackedStoneSF)/5)*2
    const hrs  = (n(stackedStoneSF) / 24) * 8
    finishLines.push({ label: `Stacked Stone — ${n(stackedStoneSF).toLocaleString()} SF`, value: fmt2(mat), sub: `${hrs.toFixed(2)} hrs · ${fmt2(rate)}/SF` })
  }
  if (n(tileSF) > 0) {
    const rate = mp(OK_RATES.tile.dbName, OK_RATES.tile.fallback)
    const mat  = n(tileSF) * rate + n(tileSF)
    const hrs  = (n(tileSF)/400 + n(tileSF)/30) * 8
    finishLines.push({ label: `Tile — ${n(tileSF).toLocaleString()} SF`, value: fmt2(mat), sub: `${hrs.toFixed(2)} hrs · ${fmt2(rate)}/SF` })
  }
  if (n(flagstoneSF) > 0) {
    const rate = n(flagstoneRateInput) || mp(OK_RATES.realFlagstone.dbName, OK_RATES.realFlagstone.fallback)
    const tons = n(flagstoneSF) / 80
    const mat  = tons * rate + tons * 80 + 268.75
    const hrs  = (n(flagstoneSF)/50 + n(flagstoneSF)/35 + n(flagstoneSF)/133) * 8
    finishLines.push({ label: `Real Flagstone — ${n(flagstoneSF).toLocaleString()} SF`, value: fmt2(mat), sub: `${hrs.toFixed(2)} hrs · ${tons.toFixed(2)} tons · ${fmt2(rate)}/ton` })
  }
  if (n(realStoneSF) > 0) {
    const rate = n(realStoneRateInput) || mp(OK_RATES.realStone.dbName, OK_RATES.realStone.fallback)
    const tons = n(realStoneSF) / 70
    const mat  = tons * rate + tons * 180 + n(realStoneSF)
    const hrs  = (n(realStoneSF)/40 + n(realStoneSF)/13 + n(realStoneSF)/100) * 8
    finishLines.push({ label: `Real Stone — ${n(realStoneSF).toLocaleString()} SF`, value: fmt2(mat), sub: `${hrs.toFixed(2)} hrs · ${tons.toFixed(2)} tons · ${fmt2(rate)}/ton` })
  }

  const manualLines = (manualRows || []).filter(r => n(r.hours) > 0 || n(r.materials) > 0 || n(r.subCost) > 0)

  const hasAnyLines = structureLines.length || counterLines.length || serviceLines.length || finishLines.length || manualLines.length

  // ── Financials ────────────────────────────────────────────────────────────────
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
          {structureLines.length > 0 && (
            <>
              <SectionLabel title="BBQ Structure" />
              {structureLines.map((l, i) => <LineRow key={i} label={l.label} value={l.value} sub={l.sub} />)}
            </>
          )}

          {counterLines.length > 0 && (
            <>
              <SectionLabel title="Countertop" />
              {counterLines.map((l, i) => <LineRow key={i} label={l.label} value={l.value} sub={l.sub} />)}
            </>
          )}

          {serviceLines.length > 0 && (
            <>
              <SectionLabel title="Appliances & Services" />
              {serviceLines.map((l, i) => <LineRow key={i} label={l.label} value={l.value} sub={l.sub} />)}
            </>
          )}

          {finishLines.length > 0 && (
            <>
              <SectionLabel title="Wall Finishes" />
              {finishLines.map((l, i) => <LineRow key={i} label={l.label} value={l.value} sub={l.sub} />)}
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
