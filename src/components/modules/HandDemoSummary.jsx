// ─────────────────────────────────────────────────────────────────────────────
// HandDemoSummary — read-only detail view for a saved Hand Demo module
// All rates pulled from the saved laborRates snapshot (lr[]) with fallbacks.
// ─────────────────────────────────────────────────────────────────────────────

const DUMP_FEE_DEFAULTS = {
  'Dump Fee - Concrete':    36.21,
  'Dump Fee - Dirt':        36.21,
  'Dump Fee - Green Waste': 72.19,
  'Dump Fee - Tree/Stump':  125.33,
}

const ACCESS_LEVELS = { Poor: 0.5, OK: 0.667, Full: 1.0 }

const R = {
  concrete:   0.75,
  grass:      0.75,
  importBase: 5.0,
  bucket:     0.38,
  jj:         1.75,
  rebarMin:   0.25,
  shrub:      0.75,
  stumpFst:   2.5,
  stumpAdd:   0.75,
  treeSmall:  0.1,
  treeMed:    0.17,
  treeLarge:  0.23,
}

const n = (v) => parseFloat(v) || 0
const sfToTons = (sf, depthIn) => (n(sf) / 200) * n(depthIn)

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
      <span className={`text-xs flex-1 pr-2 ${highlight ? 'text-gray-800' : 'text-gray-600'}`}>{label}</span>
      <div className="text-right shrink-0">
        <span className={`text-xs ${highlight ? 'text-gray-900 font-semibold' : 'text-gray-700'}`}>{value}</span>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  )
}

import FinancialSummaryList from './FinancialSummaryList'

export default function HandDemoSummary({ module }) {
  const data = module?.data || {}
  const {
    access           = 'OK',
    dumpType         = 'Self Haul',
    difficulty       = 0,
    hoursAdj         = 0,
    concSF = 0,   concDepth  = 4,
    dirtSF = 0,   dirtDepth  = 6,
    baseSF = 0,   baseDepth  = 4,
    grassSF = 0,  grassDepth = 2,
    rebarSF          = 0,
    miscFlatRows     = [],
    miscVertRows     = [],
    footingRows      = [],
    bucketRows       = [],
    gradeCutSF = 0,  gradeCutDepth  = 3,
    gradeFillSF = 0, gradeFillDepth = 3,
    jjSF = 0,        jjDepth        = 3,
    shrubQty         = 0,
    stumpFirstQty    = 0,
    stumpAddQty      = 0,
    treeRows         = [],
    manualRows       = [],
    laborRatePerHour = 35,
    materialPrices   = {},
    laborRates       = {},
    calc             = null,
  } = data

  const mp = materialPrices || {}
  const lr = laborRates    || {}

  // ── Resolve rates from saved snapshot (lr) ────────────────────────────────
  const rateConc      = lr['Demo - Hand Concrete/Dirt'] ?? R.concrete
  const rateGrass     = lr['Demo - Hand Grass']         ?? R.grass
  const rateBase      = lr['Demo - Hand Import Base']   ?? R.importBase
  const rateBucket    = lr['Demo - Hand Bucket']        ?? R.bucket
  const rateJJ        = lr['Demo - JJ Compaction']      ?? R.jj
  const rebarMinPerSF = lr['Demo - Hand Rebar']         ?? R.rebarMin
  const shrubRate     = lr['Demo - Shrub']              ?? R.shrub
  const stumpFstRate  = lr['Demo - Stump 1st']          ?? R.stumpFst
  const stumpAddRate  = lr['Demo - Stump Additional']   ?? R.stumpAdd
  const treeSmall     = lr['Demo - Tree Small']         ?? R.treeSmall
  const treeMed       = lr['Demo - Tree Medium']        ?? R.treeMed
  const treeLarge     = lr['Demo - Tree Large']         ?? R.treeLarge

  const dumpConc  = mp['Dump Fee - Concrete']    ?? DUMP_FEE_DEFAULTS['Dump Fee - Concrete']
  const dumpDirt  = mp['Dump Fee - Dirt']         ?? DUMP_FEE_DEFAULTS['Dump Fee - Dirt']
  const dumpGreen = mp['Dump Fee - Green Waste']  ?? DUMP_FEE_DEFAULTS['Dump Fee - Green Waste']
  const dumpTree  = mp['Dump Fee - Tree/Stump']  ?? DUMP_FEE_DEFAULTS['Dump Fee - Tree/Stump']

  const accessMult = ACCESS_LEVELS[access] || 0.667
  const isSelf     = dumpType === 'Self Haul'

  // ── Re-derive line items ──────────────────────────────────────────────────
  function flat(sf, depthIn, baseRate, dumpFeePerTon = 0) {
    const tons = sfToTons(sf, depthIn)
    if (!tons) return { tons: 0, hours: 0, dumpFee: 0 }
    return {
      tons,
      hours:   isSelf ? tons / (baseRate * accessMult) : 0,
      dumpFee: isSelf ? tons * dumpFeePerTon : 0,
    }
  }

  function vert(lf, heightIn, widthIn, baseRate, dumpFeePerTon = 0) {
    const cf   = n(lf) * (n(heightIn) / 12) * (n(widthIn) / 12)
    const tons = (cf * 150) / 2000
    if (!tons) return { tons: 0, cf: 0, hours: 0, dumpFee: 0 }
    return {
      tons, cf,
      hours:   isSelf ? tons / (baseRate * accessMult) : 0,
      dumpFee: isSelf ? tons * dumpFeePerTon : 0,
    }
  }

  const conc  = flat(concSF,  concDepth  || 4, rateConc,  dumpConc)
  const dirt  = flat(dirtSF,  dirtDepth  || 6, rateConc,  dumpDirt)
  const base  = flat(baseSF,  baseDepth  || 4, rateBase,  0)
  const grass = flat(grassSF, grassDepth || 2, rateGrass, dumpGreen)

  const miscFlatCalc = miscFlatRows.map(r => flat(r.sf, r.depth || 4, rateConc, 0))
  const miscVertCalc = miscVertRows.map(r => vert(r.lf, r.heightIn || 0, r.widthIn || 8, rateConc, 0))
  const footingCalc  = footingRows.map(r  => flat(r.sf, r.depth || 12, rateConc, 0))
  const bucketCalc   = bucketRows.map(r   => flat(r.sf, r.depth || 4,  rateBucket, dumpDirt))

  const gradeCut  = flat(gradeCutSF,  gradeCutDepth  || 3, rateConc, dumpDirt)
  const gradeFill = flat(gradeFillSF, gradeFillDepth || 3, rateBase, 0)

  const jjTons = sfToTons(jjSF, jjDepth || 3)
  const jjHrs  = jjTons > 0 ? jjTons / rateJJ : 0

  const rebarHrs     = n(rebarSF) * (rebarMinPerSF / 60)
  const shrubHrs     = n(shrubQty)      * accessMult * shrubRate
  const stumpFstHrs  = n(stumpFirstQty) * accessMult * stumpFstRate
  const stumpAddHrs  = n(stumpAddQty)   * accessMult * stumpAddRate

  const treeCalc = treeRows.map(r => {
    const qty = n(r.qty), height = n(r.height) || 10
    const mult = r.size === 'Large' ? treeLarge : r.size === 'Medium' ? treeMed : treeSmall
    const hrs     = qty * height * accessMult * mult
    const tons    = qty * (height / 10) * 0.25
    const dumpFee = isSelf ? tons * dumpTree : 0
    return { hrs, tons, dumpFee }
  })

  const manualFiltered = manualRows.filter(r => n(r.hours) > 0 || n(r.materials) > 0 || n(r.subCost) > 0)

  // Use saved calc snapshot for financials
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

  const fmt  = v => `$${Math.round(v).toLocaleString()}`
  const fmt2 = v => `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const fh   = v => v > 0 ? `${v.toFixed(2)} hrs` : null

  const hasLines = conc.tons || dirt.tons || base.tons || grass.tons ||
    n(rebarSF) ||
    miscFlatCalc.some(r => r.tons) || miscVertCalc.some(r => r.tons) ||
    footingCalc.some(r => r.tons)  || bucketCalc.some(r => r.tons) ||
    gradeCut.tons || gradeFill.tons || jjTons ||
    n(shrubQty) || treeCalc.some(r => r.hrs) ||
    manualFiltered.length

  return (
    <div className="space-y-1 text-sm">

      {/* Stat bar */}
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

      {/* Settings badges */}
      <div className="flex gap-2 flex-wrap mb-1">
        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{access} access ({accessMult}×)</span>
        <span className={`text-xs px-2 py-0.5 rounded ${isSelf ? 'bg-gray-100 text-gray-700' : 'bg-amber-50 text-amber-700'}`}>{dumpType}</span>
        {n(difficulty) > 0 && <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded">+{difficulty}% difficulty</span>}
        {n(hoursAdj) !== 0 && <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded">{n(hoursAdj)>0?'+':''}{hoursAdj} hrs adj</span>}
      </div>

      {!hasLines ? (
        <p className="text-xs text-gray-400 text-center py-4">No line items entered.</p>
      ) : (
        <>
          {/* Demolition */}
          {(conc.tons || dirt.tons || base.tons || grass.tons) > 0 && (
            <>
              <SectionLabel title="Demolition" />
              {[
                { label: 'Concrete',    r: conc,  fee: dumpConc  },
                { label: 'Dirt / Rock', r: dirt,  fee: dumpDirt  },
                { label: 'Import Base', r: base,  fee: 0         },
                { label: 'Grass / Sod', r: grass, fee: dumpGreen },
              ].map(({ label, r, fee }) => r.tons > 0 && (
                <LineRow key={label} label={label} value={fh(r.hours) || '—'}
                  sub={`${r.tons.toFixed(1)} tons${isSelf && fee > 0 ? `  ·  dump ${fmt2(r.dumpFee)}` : ''}`} />
              ))}
            </>
          )}

          {/* Rebar */}
          {rebarHrs > 0 && (
            <>
              <SectionLabel title="Rebar Add-On" />
              <LineRow label={`Rebar — ${n(rebarSF).toLocaleString()} SF`} value={fh(rebarHrs) || '—'}
                sub={`${rebarMinPerSF} min/SF (hand)`} />
            </>
          )}

          {/* Misc flat */}
          {miscFlatCalc.some(r => r.tons > 0) && (
            <>
              <SectionLabel title="Misc Flat Demo" />
              {miscFlatRows.map((r, i) => {
                const cr = miscFlatCalc[i]
                if (!cr || !cr.tons) return null
                return <LineRow key={i} label={r.label || `Item ${i + 1}`} value={fh(cr.hours) || '—'}
                  sub={`${n(r.sf)} SF × ${r.depth || 4}"  ·  ${cr.tons.toFixed(1)} tons`} />
              })}
            </>
          )}

          {/* Misc vertical */}
          {miscVertCalc.some(r => r.tons > 0) && (
            <>
              <SectionLabel title="Misc Vertical Demo" />
              {miscVertRows.map((r, i) => {
                const cr = miscVertCalc[i]
                if (!cr || !cr.tons) return null
                return <LineRow key={i} label={r.label || `Item ${i + 1}`} value={fh(cr.hours) || '—'}
                  sub={`${n(r.lf)} LF × ${r.heightIn || 0}" × ${r.widthIn || 8}"  ·  ${cr.tons.toFixed(2)} tons`} />
              })}
            </>
          )}

          {/* Footings */}
          {footingCalc.some(r => r.tons > 0) && (
            <>
              <SectionLabel title="Footing Demo" />
              {footingRows.map((r, i) => {
                const cr = footingCalc[i]
                if (!cr || !cr.tons) return null
                return <LineRow key={i} label={r.label || `Footing ${i + 1}`} value={fh(cr.hours) || '—'}
                  sub={`${n(r.sf)} SF × ${r.depth || 12}"  ·  ${cr.tons.toFixed(2)} tons`} />
              })}
            </>
          )}

          {/* Hand Bucket Areas */}
          {bucketCalc.some(r => r.tons > 0) && (
            <>
              <SectionLabel title="Hand Bucket Areas" />
              {bucketRows.map((r, i) => {
                const cr = bucketCalc[i]
                if (!cr || !cr.tons) return null
                return <LineRow key={i} label={r.label || `Area ${i + 1}`} value={fh(cr.hours) || '—'}
                  sub={`${n(r.sf)} SF × ${r.depth || 4}"  ·  ${cr.tons.toFixed(1)} tons  ·  ${rateBucket} t/hr`} />
              })}
            </>
          )}

          {/* Grading */}
          {(gradeCut.tons || gradeFill.tons || jjTons) > 0 && (
            <>
              <SectionLabel title="Grading" />
              {gradeCut.tons  > 0 && <LineRow label="Grade Cut"    value={fh(gradeCut.hours) || '—'}  sub={`${gradeCut.tons.toFixed(1)} tons  ·  ${rateConc} t/hr`} />}
              {gradeFill.tons > 0 && <LineRow label="Grade Fill"   value={fh(gradeFill.hours) || '—'} sub={`${gradeFill.tons.toFixed(1)} tons  ·  ${rateBase} t/hr`} />}
              {jjTons         > 0 && <LineRow label="Jumping Jack" value={fh(jjHrs) || '—'}           sub={`${jjTons.toFixed(1)} tons  ·  ${rateJJ} t/hr`} />}
            </>
          )}

          {/* Vegetation */}
          {(n(shrubQty) || n(stumpFirstQty) || n(stumpAddQty) || treeCalc.some(r => r.hrs > 0)) && (
            <>
              <SectionLabel title="Shrub / Stump / Tree" />
              {n(shrubQty)      > 0 && <LineRow label={`Shrubs × ${shrubQty}`}                value={fh(shrubHrs) || '—'}    sub={`${accessMult}× × ${shrubRate} hrs/ea`} />}
              {n(stumpFirstQty) > 0 && <LineRow label={`Stump Grind 1st × ${stumpFirstQty}`} value={fh(stumpFstHrs) || '—'} sub={`${accessMult}× × ${stumpFstRate} hrs`} />}
              {n(stumpAddQty)   > 0 && <LineRow label={`Stump Add'l × ${stumpAddQty}`}       value={fh(stumpAddHrs) || '—'} sub={`${accessMult}× × ${stumpAddRate} hrs`} />}
              {treeRows.map((r, i) => {
                const cr = treeCalc[i]
                if (!cr || !cr.hrs) return null
                const mult = r.size === 'Large' ? treeLarge : r.size === 'Medium' ? treeMed : treeSmall
                return <LineRow key={i} label={`${r.size} Trees × ${r.qty} @ ${r.height}ft`} value={fh(cr.hrs) || '—'}
                  sub={`${accessMult}× × ${mult} hrs/ft${isSelf && cr.dumpFee > 0 ? `  ·  dump ${fmt2(cr.dumpFee)}` : ''}`} />
              })}
            </>
          )}

          {/* Sub dump */}
          {!isSelf && subCost > 0 && (
            <>
              <SectionLabel title="Sub Dump Cost" />
              <LineRow label="Sub hauls all material" value={fmt(subCost)} sub="Based on SF × sub rates" highlight />
            </>
          )}

          {/* Manual */}
          {manualFiltered.length > 0 && (
            <>
              <SectionLabel title="Manual Entry" />
              {manualFiltered.map((r, i) => (
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
