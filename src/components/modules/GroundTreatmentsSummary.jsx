import FinancialSummaryList from './FinancialSummaryList'

// ─────────────────────────────────────────────────────────────────────────────
// GroundTreatmentsSummary — read-only detail view for a saved Ground Treatments module
// ─────────────────────────────────────────────────────────────────────────────

const MULCH_TYPES = [
  { label: 'Premium Mulch', dbName: 'Mulch - Premium', fallback: 20 },
  { label: 'Brown Shredded', dbName: 'Mulch - Brown Shredded', fallback: 20 },
  { label: 'Flower Bed Mulch', dbName: 'Mulch - Flower Bed', fallback: 28 },
  { label: 'Shredded Cedar / Gorilla Hair', dbName: 'Mulch - Shredded Cedar', fallback: 80 },
  { label: 'Forest Moss', dbName: 'Mulch - Forest Moss', fallback: 80 },
  { label: 'Black Dyed Chips', dbName: 'Mulch - Black Dyed Chips', fallback: 32 },
  { label: 'Brown Dyed Chips', dbName: 'Mulch - Brown Dyed Chips', fallback: 32 },
  { label: 'Red Dyed Chips', dbName: 'Mulch - Red Dyed Chips', fallback: 32 },
  { label: 'Playground Chips', dbName: 'Mulch - Playground Chips', fallback: 60 },
  { label: 'Walk On Bark', dbName: 'Mulch - Walk On Bark', fallback: 85 },
  { label: 'Small Bark Nugget', dbName: 'Mulch - Small Bark Nugget', fallback: 85 },
  { label: 'Medium Bark Nugget', dbName: 'Mulch - Medium Bark Nugget', fallback: 85 },
]

const GT_RATES = {
  mulchPerCY: { dbName: 'Mulch', fallback: 25.0 },
  mulchDelivery: { dbName: 'Mulch Delivery Fee', fallback: 75.0 },
  mulchLab: { dbName: 'Mulch - Labor Rate', fallback: 15 }, // CY/day
  plasticEdgingMat: { dbName: 'Plastic Edging', fallback: 1.2 },
  plasticEdgingLab: { dbName: 'Plastic Edging - Labor Rate', fallback: 0.09 },
  metalEdgingMat: { dbName: 'Metal Edging', fallback: 4.0 },
  metalEdgingLab: { dbName: 'Metal Edging - Labor Rate', fallback: 0.17 },
  soilPrepMat: { dbName: 'Soil Prep', fallback: 0.1558 },
  soilPrepLab: { dbName: 'Soil Prep - Labor Rate', fallback: 0.012 },
  sodMarathonMat: { dbName: 'Sod - Marathon', fallback: 1.2 },
  sodStAugMat: { dbName: 'Sod - St. Augustine', fallback: 1.97 },
  sodLab: { dbName: 'Sod - Labor Rate', fallback: 0.01143 },
  flagstonePerTon: { dbName: 'Flagstone Steppers', fallback: 500.0 },
  flagstoneSoilLab: { dbName: 'Flagstone Steppers - Soil Labor', fallback: 35 },
  flagstoneConcreteLab: { dbName: 'Flagstone Steppers - Concrete Labor', fallback: 25 },
  precastPerTon: { dbName: 'Precast Steppers', fallback: 200.0 },
  precastSoilLab: { dbName: 'Precast Steppers - Soil Labor', fallback: 50 },
  precastConcreteLab: { dbName: 'Precast Steppers - Concrete Labor', fallback: 35 },
  dgPerTon: { dbName: 'Decomposed Granite', fallback: 50.0 },
  dgCementPerTon: { dbName: 'DG Cement Mix', fallback: 20.0 },
  dgHandLab: { dbName: 'DG - Hand Labor Rate', fallback: 0.5 },
  dgMachineLab: { dbName: 'DG - Machine Labor Rate', fallback: 12 },
  gravelFabricMat: { dbName: 'Gravel Fabric', fallback: 0.1 },
  gravelFabricLab: { dbName: 'Gravel Fabric - Labor Rate', fallback: 0.024 },
  gravelMachineLab: { dbName: 'Gravel - Machine Labor Rate', fallback: 12 },
  gravelHandLab: { dbName: 'Gravel - Hand Labor Rate', fallback: 4 },
}

// Gravel material types — mirror of the module. Legacy modules may instead have a
// row.costPerCY; the summary falls back to that when no type is present.
const GRAVEL_TYPES = [
  { label: 'Crushed Pea Gravel', dbName: 'Gravel - Crushed Pea Gravel', fallback: 130 },
  { label: '3/4" Crushed Gravel', dbName: 'Gravel - 3/4" Crushed Gravel', fallback: 130 },
  { label: 'Del Rio', dbName: 'Gravel - Del Rio', fallback: 130 },
  { label: 'Black River Rock 1" minus', dbName: 'Gravel - Black River Rock 1in minus', fallback: 130 },
  { label: 'Black River Rock 1"-2"', dbName: 'Gravel - Black River Rock 1in-2in', fallback: 130 },
  { label: 'Black River Rock 2" to 3"', dbName: 'Gravel - Black River Rock 2in-3in', fallback: 130 },
]

const n = v => parseFloat(v) || 0
const fmt2 = v =>
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

export default function GroundTreatmentsSummary({ module }) {
  const data = module?.data || {}
  const {
    difficulty = 0,
    hoursAdj = 0,
    mulchSF = 0,
    mulchDepth = 2,
    mulchType = 'Premium Mulch',
    plasticEdgingLF = 0,
    metalEdgingLF = 0,
    soilPrepSF = 0,
    sodSF = 0,
    sodType = 'Marathon I/II',
    flagstoneSF = 0,
    flagstoneRate,
    precastSF = 0,
    precastRate,
    flagstoneSoilSF = 0,
    flagstoneConcreteSF = 0,
    precastSoilSF = 0,
    precastConcreteSF = 0,
    dgSF = 0,
    dgDepth = 3.5,
    dgMethod = 'Machine',
    dgCement = 'Yes',
    gravelRows = [],
    manualRows = [],
    laborRatePerHour = 35,
    materialPrices = {},
    calc = null,
  } = data

  const mp = (dbName, fallback) =>
    materialPrices[dbName] != null ? materialPrices[dbName] : fallback

  // ── Soil Prep ────────────────────────────────────────────────────────────────
  let soilPrepLine = null
  if (n(soilPrepSF) > 0) {
    const mat = n(soilPrepSF) * mp(GT_RATES.soilPrepMat.dbName, GT_RATES.soilPrepMat.fallback)
    const hrs = n(soilPrepSF) * mp(GT_RATES.soilPrepLab.dbName, GT_RATES.soilPrepLab.fallback)
    soilPrepLine = {
      label: `Soil Prep — ${n(soilPrepSF).toLocaleString()} SF`,
      value: fmt2(mat),
      sub: `${hrs.toFixed(2)} hrs`,
    }
  }

  // ── Sod ──────────────────────────────────────────────────────────────────────
  let sodLine = null
  if (n(sodSF) > 0) {
    const rate =
      sodType === 'St. Augustine'
        ? mp(GT_RATES.sodStAugMat.dbName, GT_RATES.sodStAugMat.fallback)
        : mp(GT_RATES.sodMarathonMat.dbName, GT_RATES.sodMarathonMat.fallback)
    const mat = n(sodSF) * rate
    const hrs = n(sodSF) * mp(GT_RATES.sodLab.dbName, GT_RATES.sodLab.fallback)
    sodLine = {
      label: `Sod (${sodType}) — ${n(sodSF).toLocaleString()} SF`,
      value: fmt2(mat),
      sub: `${hrs.toFixed(2)} hrs · ${fmt2(rate)}/SF`,
    }
  }

  // ── Mulch ─────────────────────────────────────────────────────────────────────
  let mulchLine = null
  if (n(mulchSF) > 0) {
    const CY = (n(mulchSF) * (n(mulchDepth) / 12)) / 27
    const mt = MULCH_TYPES.find(t => t.label === mulchType) || MULCH_TYPES[0]
    const mat =
      CY * mp(mt.dbName, mt.fallback) +
      mp(GT_RATES.mulchDelivery.dbName, GT_RATES.mulchDelivery.fallback)
    const mulchCYPerDay = mp(GT_RATES.mulchLab.dbName, GT_RATES.mulchLab.fallback)
    const hrs = (CY / mulchCYPerDay) * 8 + (n(mulchSF) / 3200) * 8
    mulchLine = {
      label: `${mulchType || 'Mulch'} — ${n(mulchSF).toLocaleString()} SF × ${n(mulchDepth)}"`,
      value: fmt2(mat),
      sub: `${hrs.toFixed(2)} hrs · ${CY.toFixed(2)} CY`,
    }
  }

  // ── DG ────────────────────────────────────────────────────────────────────────
  let dgLine = null
  if (n(dgSF) > 0) {
    const tons = (n(dgSF) * n(dgDepth)) / 200
    const cement = dgCement === 'Yes'
    const matBase =
      tons * mp(GT_RATES.dgPerTon.dbName, GT_RATES.dgPerTon.fallback) +
      (cement ? tons * mp(GT_RATES.dgCementPerTon.dbName, GT_RATES.dgCementPerTon.fallback) : 0)
    const mat = matBase * 1.1
    const dgHandRate = mp(GT_RATES.dgHandLab.dbName, GT_RATES.dgHandLab.fallback)
    const dgMachineRate = mp(GT_RATES.dgMachineLab.dbName, GT_RATES.dgMachineLab.fallback)
    const baseHrs =
      dgMethod === 'Hand'
        ? (tons * 1.62) / dgHandRate + (n(dgSF) / 1000) * 8 + tons
        : ((tons * 1.62) / dgMachineRate) * 8 + (n(dgSF) / 1000) * 8 + tons
    const hrs = baseHrs + (cement ? tons * 1.25 : 0)
    dgLine = {
      label: `D.G. — ${n(dgSF).toLocaleString()} SF × ${n(dgDepth)}" (${dgMethod}${cement ? ', cement' : ''})`,
      value: fmt2(mat),
      sub: `${hrs.toFixed(2)} hrs · ${tons.toFixed(2)} tons`,
    }
  }

  // ── Gravel ────────────────────────────────────────────────────────────────────
  const gravelLines = gravelRows
    .map((r, i) => {
      if (!n(r.sf)) return null
      const CY = (n(r.sf) * (n(r.depthIn) / 12)) / 27
      // New modules store row.type (drives $/CY via material_rates); legacy
      // modules store a manual row.costPerCY — fall back to that.
      const gtype = r.type ? GRAVEL_TYPES.find(t => t.label === r.type) : null
      const costPerCY = gtype ? mp(gtype.dbName, gtype.fallback) : n(r.costPerCY) || 130
      const mat =
        CY * costPerCY +
        n(r.sf) * mp(GT_RATES.gravelFabricMat.dbName, GT_RATES.gravelFabricMat.fallback)
      const machineRate = mp(GT_RATES.gravelMachineLab.dbName, GT_RATES.gravelMachineLab.fallback)
      const handRate = mp(GT_RATES.gravelHandLab.dbName, GT_RATES.gravelHandLab.fallback)
      const excavLab =
        r.method === 'Machine' ? ((CY * 1.62) / machineRate) * 8 : ((CY * 1.62) / handRate) * 8
      const fabricLab =
        n(r.sf) * mp(GT_RATES.gravelFabricLab.dbName, GT_RATES.gravelFabricLab.fallback)
      const hrs = excavLab + fabricLab
      return {
        key: i,
        label: `Gravel #${i + 1}${r.type ? ` (${r.type})` : ''} — ${n(r.sf).toLocaleString()} SF × ${n(r.depthIn)}" (${r.method})`,
        value: fmt2(mat),
        sub: `${hrs.toFixed(2)} hrs · ${CY.toFixed(2)} CY · $${costPerCY.toFixed ? costPerCY.toFixed(2) : costPerCY}/CY`,
      }
    })
    .filter(Boolean)

  // ── Edging ────────────────────────────────────────────────────────────────────
  const edgingLines = []

  if (n(plasticEdgingLF) > 0) {
    const mat =
      n(plasticEdgingLF) * mp(GT_RATES.plasticEdgingMat.dbName, GT_RATES.plasticEdgingMat.fallback)
    const hrs =
      n(plasticEdgingLF) * mp(GT_RATES.plasticEdgingLab.dbName, GT_RATES.plasticEdgingLab.fallback)
    edgingLines.push({
      label: `Plastic Edging — ${n(plasticEdgingLF).toLocaleString()} LF`,
      value: fmt2(mat),
      sub: `${hrs.toFixed(2)} hrs`,
    })
  }

  if (n(metalEdgingLF) > 0) {
    const mat =
      n(metalEdgingLF) * mp(GT_RATES.metalEdgingMat.dbName, GT_RATES.metalEdgingMat.fallback)
    const hrs =
      n(metalEdgingLF) * mp(GT_RATES.metalEdgingLab.dbName, GT_RATES.metalEdgingLab.fallback)
    edgingLines.push({
      label: `Metal Edging — ${n(metalEdgingLF).toLocaleString()} LF`,
      value: fmt2(mat),
      sub: `${hrs.toFixed(2)} hrs`,
    })
  }

  // ── Steppers ─────────────────────────────────────────────────────────────────
  // Each stone (Flagstone / Precast) splits into a Soil Set and a Concrete Set
  // line — same per-ton material rate, different (slower) concrete labor rate.
  // Legacy modules stored a single flagstoneSF/precastSF (+ optional
  // flagstoneRate/precastRate); those fall through to the soil-set line.
  const stepperLines = []
  const stepperDefs = [
    {
      label: 'Flagstone Steppers (Soil Set)',
      sf: n(flagstoneSoilSF) || n(flagstoneSF),
      matRate: GT_RATES.flagstonePerTon,
      matOverride: flagstoneRate,
      labRate: GT_RATES.flagstoneSoilLab,
    },
    {
      label: 'Flagstone Steppers (Concrete Set)',
      sf: n(flagstoneConcreteSF),
      matRate: GT_RATES.flagstonePerTon,
      labRate: GT_RATES.flagstoneConcreteLab,
    },
    {
      label: 'Precast Steppers (Soil Set)',
      sf: n(precastSoilSF) || n(precastSF),
      matRate: GT_RATES.precastPerTon,
      matOverride: precastRate,
      labRate: GT_RATES.precastSoilLab,
    },
    {
      label: 'Precast Steppers (Concrete Set)',
      sf: n(precastConcreteSF),
      matRate: GT_RATES.precastPerTon,
      labRate: GT_RATES.precastConcreteLab,
    },
  ]
  stepperDefs.forEach(def => {
    if (def.sf <= 0) return
    const tons = def.sf / 80
    const rate = n(def.matOverride) || mp(def.matRate.dbName, def.matRate.fallback)
    const sfPerDay = mp(def.labRate.dbName, def.labRate.fallback)
    const mat = tons * rate
    const hrs = sfPerDay > 0 ? (def.sf / sfPerDay) * 8 : 0
    stepperLines.push({
      label: `${def.label} — ${def.sf.toLocaleString()} SF`,
      value: fmt2(mat),
      sub: `${hrs.toFixed(2)} hrs · ${tons.toFixed(2)} tons · ${fmt2(rate)}/ton`,
    })
  })

  // ── Manual rows ────────────────────────────────────────────────────────────────
  const manualLines = (manualRows || []).filter(
    r => n(r.hours) > 0 || n(r.materials) > 0 || n(r.subCost) > 0
  )

  const hasAnyLines =
    soilPrepLine ||
    sodLine ||
    mulchLine ||
    dgLine ||
    gravelLines.length ||
    edgingLines.length ||
    stepperLines.length ||
    manualLines.length

  // ── Financials ────────────────────────────────────────────────────────────────
  const savedCalc = calc || {}
  const totalHrs = n(savedCalc.totalHrs)
  const manDays = n(savedCalc.manDays) || n(module.man_days)
  const totalMat = n(savedCalc.totalMat) || n(module.material_cost)
  const laborCost = n(savedCalc.laborCost) || totalHrs * n(laborRatePerHour)
  const burden = n(savedCalc.burden)
  const gp = n(savedCalc.gp)
  const commission = n(savedCalc.commission) || gp * 0.12
  const subCost = n(savedCalc.subCost)
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
          <span className="font-semibold">
            {n(hoursAdj) > 0 ? '+' : ''}
            {n(hoursAdj).toFixed(1)} hrs
          </span>
        </div>
      )}

      {!hasAnyLines ? (
        <p className="text-xs text-gray-400 text-center py-4">No line items entered.</p>
      ) : (
        <>
          {soilPrepLine && (
            <>
              <SectionLabel title="Soil Prep" />
              <LineRow
                label={soilPrepLine.label}
                value={soilPrepLine.value}
                sub={soilPrepLine.sub}
              />
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
              {gravelLines.map(l => (
                <LineRow key={l.key} label={l.label} value={l.value} sub={l.sub} />
              ))}
            </>
          )}

          {edgingLines.length > 0 && (
            <>
              <SectionLabel title="Edging" />
              {edgingLines.map((l, i) => (
                <LineRow key={i} label={l.label} value={l.value} sub={l.sub} />
              ))}
            </>
          )}

          {stepperLines.length > 0 && (
            <>
              <SectionLabel title="Steppers" />
              {stepperLines.map((l, i) => (
                <LineRow key={i} label={l.label} value={l.value} sub={l.sub} />
              ))}
            </>
          )}

          {manualLines.length > 0 && (
            <>
              <SectionLabel title="Manual Entry" />
              {manualLines.map((r, i) => (
                <div key={i} className="py-1 border-b border-gray-50">
                  <p className="text-xs font-medium text-gray-700">{r.label}</p>
                  <div className="flex gap-3 mt-0.5">
                    {n(r.hours) > 0 && (
                      <span className="text-xs text-gray-500">{n(r.hours).toFixed(1)} hrs</span>
                    )}
                    {n(r.materials) > 0 && (
                      <span className="text-xs text-gray-500">{fmt2(r.materials)} mat.</span>
                    )}
                    {n(r.subCost) > 0 && (
                      <span className="text-xs text-gray-500">{fmt2(r.subCost)} sub</span>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </>
      )}

      <FinancialSummaryList
        totalHrs={totalHrs}
        manDays={manDays}
        totalMat={totalMat}
        laborCost={laborCost}
        lrph={n(laborRatePerHour)}
        burden={burden}
        subCost={subCost}
        gp={gp}
        commission={commission}
        price={priceTotal}
      />
    </div>
  )
}
