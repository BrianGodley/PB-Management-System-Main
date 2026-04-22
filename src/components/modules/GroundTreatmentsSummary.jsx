import FinancialSummaryList from './FinancialSummaryList'

// ─────────────────────────────────────────────────────────────────────────────
// GroundTreatmentsSummary — read-only detail view for a saved Ground Treatments module
// ─────────────────────────────────────────────────────────────────────────────

const GT_RATES = {
  mulchPerCY:      { dbName: 'Mulch',                       fallback: 25.00  },
  mulchDelivery:   { dbName: 'Mulch Delivery Fee',          fallback: 75.00  },
  plasticEdgingMat:{ dbName: 'Plastic Edging',              fallback: 1.20   },
  plasticEdgingLab:{ dbName: 'Plastic Edging - Labor Rate', fallback: 0.09   },
  metalEdgingMat:  { dbName: 'Metal Edging',                fallback: 4.00   },
  metalEdgingLab:  { dbName: 'Metal Edging - Labor Rate',   fallback: 0.17   },
  soilPrepMat:     { dbName: 'Soil Prep',                   fallback: 0.1558 },
  soilPrepLab:     { dbName: 'Soil Prep - Labor Rate',      fallback: 0.012  },
  sodMarathonMat:  { dbName: 'Sod - Marathon',              fallback: 1.20   },
  sodStAugMat:     { dbName: 'Sod - St. Augustine',         fallback: 1.97   },
  sodLab:          { dbName: 'Sod - Labor Rate',            fallback: 0.01143 },
  flagstonePerTon: { dbName: 'Flagstone Steppers',              fallback: 500.00 },
  flagstoneLab:    { dbName: 'Flagstone Steppers - Labor Rate', fallback: 35     },
  precastPerTon:   { dbName: 'Precast Steppers',                fallback: 200.00 },
  precastLab:      { dbName: 'Precast Steppers - Labor Rate',   fallback: 50     },
  dgPerTon:        { dbName: 'Decomposed Granite',          fallback: 50.00  },
  dgCementPerTon:  { dbName: 'DG Cement Mix',               fallback: 20.00  },
  gravelFabricMat: { dbName: 'Gravel Fabric',               fallback: 0.10   },
  gravelFabricLab: { dbName: 'Gravel Fabric - Labor Rate',  fallback: 0.024  },
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

export default function GroundTreatmentsSummary({ module }) {
  const data = module?.data || {}
  const {
    difficulty = 0, hoursAdj = 0,
    mulchSF = 0, mulchDepth = 2,
    plasticEdgingLF = 0, metalEdgingLF = 0,
    soilPrepSF = 0,
    sodSF = 0, sodType = 'Marathon I/II',
    flagstoneSF = 0, flagstoneRate,
    precastSF = 0, precastRate,
    dgSF = 0, dgDepth = 3.5, dgMethod = 'Machine', dgCement = 'Yes',
    gravelRows = [],
    manualRows = [],
    laborRatePerHour = 35,
    materialPrices = {},
    calc = null,
  } = data

  const mp = (dbName, fallback) => materialPrices[dbName] != null ? materialPrices[dbName] : fallback

  // ── Soil Prep ────────────────────────────────────────────────────────────────
  let soilPrepLine = null
  if (n(soilPrepSF) > 0) {
    const mat = n(soilPrepSF) * mp(GT_RATES.soilPrepMat.dbName, GT_RATES.soilPrepMat.fallback)
    const hrs = n(soilPrepSF) * mp(GT_RATES.soilPrepLab.dbName, GT_RATES.soilPrepLab.fallback)
    soilPrepLine = { label: `Soil Prep — ${n(soilPrepSF).toLocaleString()} SF`, value: fmt2(mat), sub: `${hrs.toFixed(2)} hrs` }
  }

  // ── Sod ──────────────────────────────────────────────────────────────────────
  let sodLine = null
  if (n(sodSF) > 0) {
    const rate = sodType === 'St. Augustine'
      ? mp(GT_RATES.sodStAugMat.dbName, GT_RATES.sodStAugMat.fallback)
      : mp(GT_RATES.sodMarathonMat.dbName, GT_RATES.sodMarathonMat.fallback)
    const mat = n(sodSF) * rate
    const hrs = n(sodSF) * mp(GT_RATES.sodLab.dbName, GT_RATES.sodLab.fallback)
    sodLine = { label: `Sod (${sodType}) — ${n(sodSF).toLocaleString()} SF`, value: fmt2(mat), sub: `${hrs.toFixed(2)} hrs · ${fmt2(rate)}/SF` }
  }

  // ── Mulch ─────────────────────────────────────────────────────────────────────
  let mulchLine = null
  if (n(mulchSF) > 0) {
    const CY  = n(mulchSF) * (n(mulchDepth) / 12) / 27
    const mat = CY * mp(GT_RATES.mulchPerCY.dbName, GT_RATES.mulchPerCY.fallback)
              + mp(GT_RATES.mulchDelivery.dbName, GT_RATES.mulchDelivery.fallback)
    const hrs = (CY / 15) * 8 + (n(mulchSF) / 3200) * 8
    mulchLine = { label: `Mulch — ${n(mulchSF).toLocaleString()} SF × ${n(mulchDepth)}"`, value: fmt2(mat), sub: `${hrs.toFixed(2)} hrs · ${CY.toFixed(2)} CY` }
  }

  // ── DG ────────────────────────────────────────────────────────────────────────
  let dgLine = null
  if (n(dgSF) > 0) {
    const tons    = n(dgSF) * n(dgDepth) / 200
    const cement  = dgCement === 'Yes'
    const matBase = tons * mp(GT_RATES.dgPerTon.dbName, GT_RATES.dgPerTon.fallback)
                  + (cement ? tons * mp(GT_RATES.dgCementPerTon.dbName, GT_RATES.dgCementPerTon.fallback) : 0)
    const mat     = matBase * 1.1
    const baseHrs = dgMethod === 'Hand'
      ? (tons * 1.62) / 0.5 + (n(dgSF) / 1000) * 8 + tons
      : (tons * 1.62) / 12 * 8 + (n(dgSF) / 1000) * 8 + tons
    const hrs = baseHrs + (cement ? tons * 1.25 : 0)
    dgLine = { label: `D.G. — ${n(dgSF).toLocaleString()} SF × ${n(dgDepth)}" (${dgMethod}${cement ? ', cement' : ''})`, value: fmt2(mat), sub: `${hrs.toFixed(2)} hrs · ${tons.toFixed(2)} tons` }
  }

  // ── Gravel ────────────────────────────────────────────────────────────────────
  const gravelLines = gravelRows
    .map((r, i) => {
      if (!n(r.sf)) return null
      const CY  = n(r.sf) * (n(r.depthIn) / 12) / 27
      const mat = CY * (n(r.costPerCY) || 130)
                + n(r.sf) * mp(GT_RATES.gravelFabricMat.dbName, GT_RATES.gravelFabricMat.fallback)
      const excavLab  = r.method === 'Machine' ? CY * 1.62 / 12 * 8 : CY * 1.62 / 4 * 8
      const fabricLab = n(r.sf) * mp(GT_RATES.gravelFabricLab.dbName, GT_RATES.gravelFabricLab.fallback)
      const hrs = excavLab + fabricLab
      return { key: i, label: `Gravel #${i+1} — ${n(r.sf).toLocaleString()} SF × ${n(r.depthIn)}" (${r.method})`, value: fmt2(mat), sub: `${hrs.toFixed(2)} hrs · ${CY.toFixed(2)} CY · $${n(r.costPerCY)||130}/CY` }
    })
    .filter(Boolean)

  // ── Edging ────────────────────────────────────────────────────────────────────
  const edgingLines = []

  if (n(plasticEdgingLF) > 0) {
    const mat = n(plasticEdgingLF) * mp(GT_RATES.plasticEdgingMat.dbName, GT_RATES.plasticEdgingMat.fallback)
    const hrs = n(plasticEdgingLF) * mp(GT_RATES.plasticEdgingLab.dbName, GT_RATES.plasticEdgingLab.fallback)
    edgingLines.push({ label: `Plastic Edging — ${n(plasticEdgingLF).toLocaleString()} LF`, value: fmt2(mat), sub: `${hrs.toFixed(2)} hrs` })
  }

  if (n(metalEdgingLF) > 0) {
    const mat = n(metalEdgingLF) * mp(GT_RATES.metalEdgingMat.dbName, GT_RATES.metalEdgingMat.fallback)
    const hrs = n(metalEdgingLF) * mp(GT_RATES.metalEdgingLab.dbName, GT_RATES.metalEdgingLab.fallback)
    edgingLines.push({ label: `Metal Edging — ${n(metalEdgingLF).toLocaleString()} LF`, value: fmt2(mat), sub: `${hrs.toFixed(2)} hrs` })
  }

  // ── Steppers ─────────────────────────────────────────────────────────────────
  const stepperLines = []

  if (n(flagstoneSF) > 0) {
    const tons    = n(flagstoneSF) / 80
    const rate    = n(flagstoneRate) || mp(GT_RATES.flagstonePerTon.dbName, GT_RATES.flagstonePerTon.fallback)
    const sfPerDay = mp(GT_RATES.flagstoneLab.dbName, GT_RATES.flagstoneLab.fallback)
    const mat     = tons * rate
    const hrs     = (n(flagstoneSF) / sfPerDay) * 8
    stepperLines.push({ label: `Flagstone Steppers — ${n(flagstoneSF).toLocaleString()} SF`, value: fmt2(mat), sub: `${hrs.toFixed(2)} hrs · ${tons.toFixed(2)} tons · ${fmt2(rate)}/ton` })
  }

  if (n(precastSF) > 0) {
    const tons    = n(precastSF) / 80
    const rate    = n(precastRate) || mp(GT_RATES.precastPerTon.dbName, GT_RATES.precastPerTon.fallback)
    const sfPerDay = mp(GT_RATES.precastLab.dbName, GT_RATES.precastLab.fallback)
    const mat     = tons * rate
    const hrs     = (n(precastSF) / sfPerDay) * 8
    stepperLines.push({ label: `Precast Steppers — ${n(precastSF).toLocaleString()} SF`, value: fmt2(mat), sub: `${hrs.toFixed(2)} hrs · ${tons.toFixed(2)} tons · ${fmt2(rate)}/ton` })
  }

  // ── Manual rows ────────────────────────────────────────────────────────────────
  const manualLines = (manualRows || []).filter(r => n(r.hours) > 0 || n(r.materials) > 0 || n(r.subCost) > 0)

  const hasAnyLines = soilPrepLine || sodLine || mulchLine || dgLine || gravelLines.length || edgingLines.length || stepperLines.length || manualLines.length

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
          {soilPrepLine && (
            <>
              <SectionLabel title="Soil Prep" />
              <LineRow label={soilPrepLine.label} value={soilPrepLine.value} sub={soilPrepLine.sub} />
            </>
          )}

          {sodLine && (
            <>
              <SectionLabel title="Sod" />
              <LineRow label={sodLine.label} value={sodLine.value} sub={sodLine.sub} />
            </>
          )}

          {mulchLine && (
            <>
              <SectionLabel title="Mulch" />
              <LineRow label={mulchLine.label} value={mulchLine.value} sub={mulchLine.sub} />
            </>
          )}

          {dgLine && (
            <>
              <SectionLabel title="Decomposed Granite" />
              <LineRow label={dgLine.label} value={dgLine.value} sub={dgLine.sub} />
            </>
          )}

          {gravelLines.length > 0 && (
            <>
              <SectionLabel title="Gravel" />
              {gravelLines.map(l => <LineRow key={l.key} label={l.label} value={l.value} sub={l.sub} />)}
            </>
          )}

          {edgingLines.length > 0 && (
            <>
              <SectionLabel title="Edging" />
              {edgingLines.map((l, i) => <LineRow key={i} label={l.label} value={l.value} sub={l.sub} />)}
            </>
          )}

          {stepperLines.length > 0 && (
            <>
              <SectionLabel title="Steppers" />
              {stepperLines.map((l, i) => <LineRow key={i} label={l.label} value={l.value} sub={l.sub} />)}
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
