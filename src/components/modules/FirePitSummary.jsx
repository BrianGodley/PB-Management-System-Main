import FinancialSummaryList from './FinancialSummaryList'

// ─────────────────────────────────────────────────────────────────────────────
// FirePitSummary — read-only detail view for a saved Fire Pit module
// ─────────────────────────────────────────────────────────────────────────────

const FP_RATES = {
  fpBlock:         { dbName: 'FP Block',              fallback: 2.50   },
  fpRebar:         { dbName: 'FP Rebar',              fallback: 0.50   },
  fpConcrete:      { dbName: 'FP Concrete',           fallback: 149.50 },
  fpGroutPump:     { dbName: 'FP Grout Pump Setup',   fallback: 150.00 },
  fpGasRing:       { dbName: 'FP Gas Ring/Burner',    fallback: 25.00  },
  fpGasPipe:       { dbName: 'FP Gas Pipe',           fallback: 3.00   },
  sandStucco:      { dbName: 'Sand Stucco - FP',      fallback: 0.00   },
  smoothStucco:    { dbName: 'Smooth Stucco - FP',    fallback: 0.00   },
  ledgerstone:     { dbName: 'Ledgerstone - FP',      fallback: 10.00  },
  stackedStone:    { dbName: 'Stacked Stone - FP',    fallback: 10.00  },
  tile:            { dbName: 'Tile - FP',             fallback: 6.50   },
  realFlagstone:   { dbName: 'Real Flagstone - FP',   fallback: 400.00 },
  realStone:       { dbName: 'Real Stone - FP',       fallback: 400.00 },
  digLab:          { dbName: 'FP Dig Footing Labor Rate',      fallback: 4.0    },
  rebarLab:        { dbName: 'FP Set Rebar Labor Rate',        fallback: 35.0   },
  blockLab:        { dbName: 'FP Set Blocks Labor Rate',       fallback: 10.4   },
  handGroutLab:    { dbName: 'FP Hand Grout Labor Rate',       fallback: 5.5    },
  pumpGroutLab:    { dbName: 'FP Pump Grout Labor Rate',       fallback: 81.0   },
  gasTrenchLab:    { dbName: 'FP Gas Trench Labor Rate',       fallback: 35.0   },
  sandStuccoLab:   { dbName: 'Sand Stucco - FP Labor Rate',   fallback: 92     },
  smoothStuccoLab: { dbName: 'Smooth Stucco - FP Labor Rate', fallback: 65     },
  ledgerstoneLab:  { dbName: 'Ledgerstone - FP Labor Rate',   fallback: 24     },
  stackedStoneLab: { dbName: 'Stacked Stone - FP Labor Rate', fallback: 24     },
  tileLab:         { dbName: 'Tile - FP Labor Rate',          fallback: 0.2867 },
  flagstoneLab:    { dbName: 'Real Flagstone - FP Labor Rate',fallback: 0.4487 },
  realStoneLab:    { dbName: 'Real Stone - FP Labor Rate',    fallback: 0.8954 },
}

const BLOCK_LENGTH_IN  = 16
const BLOCK_HEIGHT_IN  = 8
const BLOCK_WIDTH_IN   = 8
const GROUT_CF_PER_BLOCK = ((BLOCK_LENGTH_IN - 2) * BLOCK_HEIGHT_IN * (BLOCK_WIDTH_IN - 2)) / 1728

const DEFAULTS = { laborRatePerHour: 35, laborBurdenPct: 0.29, gpmd: 425, commissionRate: 0.12 }

const n   = (v) => parseFloat(v) || 0
const fmt = (v) => `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

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

export default function FirePitSummary({ module }) {
  const data = module?.data || {}
  const {
    difficulty = 0, hoursAdj = 0, layoutHrs = 0,
    wallLF = 0, wallHeightIn = 40, footingWidthIn = 12, footingDepthIn = 12,
    rebarSpacingIn = 16, bondBeamCourses = 1, pctGrouted = 100, pctCurved = 0, useGroutPump = 'No',
    gasRingCount = 0, gasTrenchLF = 0,
    sandStuccoSF = 0, smoothStuccoSF = 0, ledgerstoneSF = 0, stackedStoneSF = 0,
    tileSF = 0, flagstoneSF = 0, flagstoneRateInput, realStoneSF = 0, realStoneRateInput,
    manualRows = [],
    laborRatePerHour = DEFAULTS.laborRatePerHour,
    gpmd = DEFAULTS.gpmd,
    materialPrices = {},
  } = data

  const mp = (dbName, fallback) => materialPrices[dbName] ?? fallback

  // ── Re-derive quantities ────────────────────────────────────────────────────
  const blocksPerCourse = n(wallLF) > 0 ? Math.ceil((n(wallLF) * 12) / BLOCK_LENGTH_IN) : 0
  const coursesCount    = n(wallHeightIn) > 0 ? Math.ceil(n(wallHeightIn) / BLOCK_HEIGHT_IN) : 0
  const rawBlocks       = blocksPerCourse * coursesCount
  const totalBlocks     = rawBlocks * 1.10

  const footingCF = (n(footingWidthIn) / 12) * (n(footingDepthIn) / 12) * n(wallLF)
  const footingCY = footingCF / 27
  const groutCF   = rawBlocks * GROUT_CF_PER_BLOCK * (n(pctGrouted) / 100)
  const groutCY   = groutCF / 27

  const vertRebars   = n(rebarSpacingIn) > 0 ? Math.ceil((n(wallLF) * 12) / n(rebarSpacingIn)) : 0
  const vertRebarLF  = vertRebars * (n(wallHeightIn) + n(footingDepthIn)) / 12
  const horizRebarLF = (2 + n(bondBeamCourses)) * n(wallLF)
  const totalRebarLF = vertRebarLF + horizRebarLF

  // Labor hours
  const layoutHrsN   = n(layoutHrs)
  const digHrs       = footingCF > 0 ? footingCF / mp(FP_RATES.digLab.dbName,   FP_RATES.digLab.fallback)   : 0
  const rebarHrs     = totalRebarLF > 0 ? totalRebarLF / mp(FP_RATES.rebarLab.dbName,  FP_RATES.rebarLab.fallback)  : 0
  const setBlockHrs  = rawBlocks > 0 ? rawBlocks / mp(FP_RATES.blockLab.dbName,  FP_RATES.blockLab.fallback)  : 0
  const groutRate    = useGroutPump === 'Yes'
    ? mp(FP_RATES.pumpGroutLab.dbName, FP_RATES.pumpGroutLab.fallback)
    : mp(FP_RATES.handGroutLab.dbName, FP_RATES.handGroutLab.fallback)
  const groutHrs     = groutCF > 0 ? groutCF / groutRate : 0
  const gasTrenchHrs = n(gasTrenchLF) > 0
    ? (n(gasTrenchLF) / mp(FP_RATES.gasTrenchLab.dbName, FP_RATES.gasTrenchLab.fallback)) * 8 : 0

  const structuralBaseHrs = digHrs + rebarHrs + setBlockHrs + groutHrs
  const curveAddHrs = structuralBaseHrs * (n(pctCurved) / 100) * 0.25

  const sandStuccoHrs   = n(sandStuccoSF)   > 0 ? (n(sandStuccoSF)   / mp(FP_RATES.sandStuccoLab.dbName,   FP_RATES.sandStuccoLab.fallback))   * 8 : 0
  const smoothStuccoHrs = n(smoothStuccoSF) > 0 ? (n(smoothStuccoSF) / mp(FP_RATES.smoothStuccoLab.dbName, FP_RATES.smoothStuccoLab.fallback)) * 8 : 0
  const ledgerstoneHrs  = n(ledgerstoneSF)  > 0 ? (n(ledgerstoneSF)  / mp(FP_RATES.ledgerstoneLab.dbName,  FP_RATES.ledgerstoneLab.fallback))  * 8 : 0
  const stackedStoneHrs = n(stackedStoneSF) > 0 ? (n(stackedStoneSF) / mp(FP_RATES.stackedStoneLab.dbName, FP_RATES.stackedStoneLab.fallback)) * 8 : 0
  const tileHrs         = n(tileSF)         > 0 ? n(tileSF)         * mp(FP_RATES.tileLab.dbName,      FP_RATES.tileLab.fallback)      : 0
  const flagstoneHrs    = n(flagstoneSF)    > 0 ? n(flagstoneSF)    * mp(FP_RATES.flagstoneLab.dbName,  FP_RATES.flagstoneLab.fallback)  : 0
  const realStoneHrs    = n(realStoneSF)    > 0 ? n(realStoneSF)    * mp(FP_RATES.realStoneLab.dbName,   FP_RATES.realStoneLab.fallback)   : 0

  let manHrs = 0, manMat = 0, manSub = 0
  manualRows.forEach(r => { manHrs += n(r.hours); manMat += n(r.materials); manSub += n(r.subCost) })

  // Materials
  const blockMat       = totalBlocks   * mp(FP_RATES.fpBlock.dbName,    FP_RATES.fpBlock.fallback)
  const rebarMat       = totalRebarLF  * mp(FP_RATES.fpRebar.dbName,    FP_RATES.fpRebar.fallback)
  const footingMat     = footingCY     * mp(FP_RATES.fpConcrete.dbName, FP_RATES.fpConcrete.fallback)
  const groutMat       = groutCY       * mp(FP_RATES.fpConcrete.dbName, FP_RATES.fpConcrete.fallback)
  const pumpSetupMat   = (useGroutPump === 'Yes' && groutCF > 0) ? mp(FP_RATES.fpGroutPump.dbName, FP_RATES.fpGroutPump.fallback) : 0
  const gasRingMat     = n(gasRingCount) * mp(FP_RATES.fpGasRing.dbName, FP_RATES.fpGasRing.fallback)
  const gasPipeMat     = n(gasTrenchLF)  * mp(FP_RATES.fpGasPipe.dbName, FP_RATES.fpGasPipe.fallback)

  const sandStuccoMat   = n(sandStuccoSF)   * mp(FP_RATES.sandStucco.dbName,   FP_RATES.sandStucco.fallback)
  const smoothStuccoMat = n(smoothStuccoSF) * mp(FP_RATES.smoothStucco.dbName, FP_RATES.smoothStucco.fallback)
  const ledgerstoneMat  = n(ledgerstoneSF)  > 0 ? n(ledgerstoneSF)  * mp(FP_RATES.ledgerstone.dbName,  FP_RATES.ledgerstone.fallback)  * 1.1 + (n(ledgerstoneSF)  / 5) * 2 : 0
  const stackedStoneMat = n(stackedStoneSF) > 0 ? n(stackedStoneSF) * mp(FP_RATES.stackedStone.dbName, FP_RATES.stackedStone.fallback) * 1.1 + (n(stackedStoneSF) / 5) * 2 : 0
  const tileMat         = n(tileSF) > 0 ? n(tileSF) * mp(FP_RATES.tile.dbName, FP_RATES.tile.fallback) + n(tileSF) : 0
  const realFlagRate    = n(flagstoneRateInput) || mp(FP_RATES.realFlagstone.dbName, FP_RATES.realFlagstone.fallback)
  const flagstoneMat    = n(flagstoneSF) > 0 ? (n(flagstoneSF) / 80) * realFlagRate + (n(flagstoneSF) / 80) * 80 + 268.75 : 0
  const realStoneRt     = n(realStoneRateInput) || mp(FP_RATES.realStone.dbName, FP_RATES.realStone.fallback)
  const realStoneMat    = n(realStoneSF) > 0 ? (n(realStoneSF) / 70) * realStoneRt + (n(realStoneSF) / 70) * 180 + n(realStoneSF) : 0

  const baseHrs  = layoutHrsN + structuralBaseHrs + curveAddHrs + gasTrenchHrs
                 + sandStuccoHrs + smoothStuccoHrs + ledgerstoneHrs + stackedStoneHrs
                 + tileHrs + flagstoneHrs + realStoneHrs + manHrs
  const diffMod  = 1 + n(difficulty) / 100
  const totalHrs = baseHrs * diffMod + n(hoursAdj)
  const manDays  = totalHrs / 8
  const totalMat = blockMat + rebarMat + footingMat + groutMat + pumpSetupMat
                 + gasRingMat + gasPipeMat
                 + sandStuccoMat + smoothStuccoMat + ledgerstoneMat + stackedStoneMat
                 + tileMat + flagstoneMat + realStoneMat + manMat
  const laborCost  = totalHrs * laborRatePerHour
  const burden     = laborCost * DEFAULTS.laborBurdenPct
  const gp         = manDays * gpmd
  const commission = gp * DEFAULTS.commissionRate
  const price      = totalMat + laborCost + burden + gp + commission + manSub

  const financeRows = [
    { label: 'Materials',   value: fmt(totalMat)  },
    { label: 'Labor',       value: fmt(laborCost) },
    { label: 'Burden',      value: fmt(burden)    },
    { label: 'GP',          value: fmt(gp)        },
    { label: 'Commission',  value: fmt(commission)},
    { label: 'Subs',        value: fmt(manSub)    },
    { label: 'Price',       value: fmt(price), highlight: true },
  ]

  return (
    <div className="text-sm space-y-1">

      {/* Structure */}
      {n(wallLF) > 0 && (
        <>
          <SectionLabel title="Structure" />
          <LineRow label="Wall Perimeter" value={`${n(wallLF)} LF × ${n(wallHeightIn)}" high`} />
          <LineRow label="Blocks" value={`${totalBlocks.toFixed(0)} (${blocksPerCourse} × ${coursesCount} courses + waste)`} />
          <LineRow label="Footing" value={`${footingCY.toFixed(3)} CY`} />
          <LineRow label="Grout" value={`${groutCY.toFixed(3)} CY (${pctGrouted}% filled)`} sub={useGroutPump === 'Yes' ? 'Pump' : 'Hand mix'} />
          <LineRow label="Rebar" value={`${totalRebarLF.toFixed(0)} LF`} />
          {curveAddHrs > 0 && <LineRow label="Curve Add" value={`${curveAddHrs.toFixed(2)} hrs`} sub={`${pctCurved}% curved`} />}
          <LineRow label="Structure Materials" value={fmt(blockMat + rebarMat + footingMat + groutMat + pumpSetupMat)} highlight />
        </>
      )}

      {/* Gas fixtures */}
      {(n(gasRingCount) > 0 || n(gasTrenchLF) > 0) && (
        <>
          <SectionLabel title="Gas Fixtures & Trench" />
          {n(gasRingCount) > 0 && <LineRow label="Gas Rings/Burners" value={`${n(gasRingCount)} openings`} sub={fmt(gasRingMat)} />}
          {n(gasTrenchLF) > 0  && <LineRow label="Gas Trench"        value={`${n(gasTrenchLF)} LF`}         sub={fmt(gasPipeMat)} />}
        </>
      )}

      {/* Wall finishes */}
      {[
        { label: 'Sand Stucco',       sf: sandStuccoSF,   mat: sandStuccoMat   },
        { label: 'Smooth Stucco',     sf: smoothStuccoSF, mat: smoothStuccoMat },
        { label: 'Ledgerstone',       sf: ledgerstoneSF,  mat: ledgerstoneMat  },
        { label: 'Stacked Stone',     sf: stackedStoneSF, mat: stackedStoneMat },
        { label: 'Tile',              sf: tileSF,         mat: tileMat         },
        { label: 'Real Flagstone',    sf: flagstoneSF,    mat: flagstoneMat    },
        { label: 'Real Stone',        sf: realStoneSF,    mat: realStoneMat    },
      ].filter(f => n(f.sf) > 0).length > 0 && (
        <>
          <SectionLabel title="Wall Finishes" />
          {[
            { label: 'Sand Stucco',    sf: sandStuccoSF,   mat: sandStuccoMat   },
            { label: 'Smooth Stucco',  sf: smoothStuccoSF, mat: smoothStuccoMat },
            { label: 'Ledgerstone',    sf: ledgerstoneSF,  mat: ledgerstoneMat  },
            { label: 'Stacked Stone',  sf: stackedStoneSF, mat: stackedStoneMat },
            { label: 'Tile',           sf: tileSF,         mat: tileMat         },
            { label: 'Real Flagstone', sf: flagstoneSF,    mat: flagstoneMat    },
            { label: 'Real Stone',     sf: realStoneSF,    mat: realStoneMat    },
          ].filter(f => n(f.sf) > 0).map(f => (
            <LineRow key={f.label} label={f.label} value={`${n(f.sf)} SF`} sub={fmt(f.mat)} />
          ))}
        </>
      )}

      {/* Manual */}
      {manualRows.filter(r => n(r.hours) || n(r.materials) || n(r.subCost)).length > 0 && (
        <>
          <SectionLabel title="Manual Entry" />
          {manualRows.filter(r => n(r.hours) || n(r.materials) || n(r.subCost)).map((r, i) => (
            <LineRow key={i} label={r.label || `Misc ${i + 1}`}
              value={n(r.hours) > 0 ? `${n(r.hours)} hrs` : '—'}
              sub={[n(r.materials) > 0 && fmt(r.materials), n(r.subCost) > 0 && `Sub: ${fmt(r.subCost)}`].filter(Boolean).join(' · ')} />
          ))}
        </>
      )}

      {/* Totals */}
      <SectionLabel title="Totals" />
      <LineRow label="Total Hours" value={`${totalHrs.toFixed(2)} hrs`} />
      <LineRow label="Man Days"    value={`${manDays.toFixed(2)} days`} />

      <div className="mt-3">
        <FinancialSummaryList rows={financeRows} />
      </div>
    </div>
  )
}
