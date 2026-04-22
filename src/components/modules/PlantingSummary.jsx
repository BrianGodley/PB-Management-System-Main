// ─────────────────────────────────────────────────────────────────────────────
// PlantingSummary — read-only detail view for a saved Planting module
// Uses materialPrices + laborRates snapshots saved at module-save time
// ─────────────────────────────────────────────────────────────────────────────

import FinancialSummaryList from './FinancialSummaryList'

const SMALL_PLANT_DEFAULTS = {
  'Flats of Groundcover': { perDay: 25  },
  'Flats of 4" pots':     { perDay: 20  },
  '4" pots standard':     { perDay: 280 },
  '4" pots succulents':   { perDay: 280 },
  '6" pots standard':     { perDay: 180 },
  '6" pots succulents':   { perDay: 180 },
  '1 gallon standard':    { perDay: 70  },
  '1 gallon premium':     { perDay: 70  },
  '1 gallon succulents':  { perDay: 70  },
  '3 gallon standard':    { perDay: 70  },
  '5 gallon standard':    { perDay: 40  },
  '5 gallon premium':     { perDay: 40  },
  '5 gallon succulents':  { perDay: 40  },
  '5 gallon bamboo':      { perDay: 40  },
  '5 gallon palm':        { perDay: 40  },
}

const LARGE_PLANT_DEFAULTS = {
  '15 gallon standard':   { perDay: 15   },
  '15 gallon premium':    { perDay: 15   },
  '15 gallon succulents': { perDay: 15   },
  '15 gallon fruit':      { perDay: 15   },
  '15 gallon palms':      { perDay: 15   },
  '24" box standard':     { perDay: 4    },
  '24" box premium':      { perDay: 4    },
  '24" box fruit':        { perDay: 4    },
  '24" box palm':         { perDay: 4    },
  '36" box standard':     { perDay: 0.75 },
  '36" box premium':      { perDay: 0.75 },
  '36" box fruit':        { perDay: 0.75 },
  '36" box palm':         { perDay: 0.75 },
  '48" box standard':     { perDay: 0.3  },
  '48" box premium':      { perDay: 0.3  },
  '48" box fruit':        { perDay: 0.3  },
  '48" box palm':         { perDay: 0.3  },
}

const LABOR_DEFAULTS = {
  'Till - Soil Move Rate':        39,
  'Till - Tilling Rate':          3600,
  'Till - Amend Rate':            900,
  'Tree Stakes - Install Rate':   24,
  'Root Barrier - Install Rate':  20,
  'Gopher Basket - Install Rate': 2,
  'Mesh Flat - Install Rate':     0.7,
  'Jute Fabric - Install Rate':   1.1,
}

const ADDON_MAT_DEFAULTS = {
  'Tree Stake':           8.50,
  'Root Barrier 12in':    5.00,
  'Root Barrier 24in':    7.00,
  'Gopher Basket 1 Gal':  3.42,
  'Gopher Basket 5 Gal':  7.78,
  'Gopher Basket 15 Gal': 10.50,
  'Mesh Flat':            1.00,
  'Jute Fabric':          0.40,
}

const n = (v) => parseFloat(v) || 0
const lr = (rates, key) => rates[key] ?? LABOR_DEFAULTS[key] ?? 0
const mp = (prices, key) => prices[key] ?? ADDON_MAT_DEFAULTS[key] ?? 0

function SectionLabel({ title }) {
  return (
    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-4 mb-1 border-t border-gray-100 pt-3">
      {title}
    </p>
  )
}

function LineRow({ label, value, sub }) {
  return (
    <div className="flex items-start justify-between py-1 border-b border-gray-50">
      <span className="text-xs text-gray-600 flex-1 pr-2">{label}</span>
      <div className="text-right shrink-0">
        <span className="text-xs text-gray-700">{value}</span>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  )
}

export default function PlantingSummary({ module }) {
  const data = module?.data || {}
  const {
    tillSqft       = '',
    difficulty     = '',
    smallPlantRows = [],
    largePlantRows = [],
    addons         = {},
    manualRows     = [],
    laborRatePerHour = 35,
    materialPrices = {},
    laborRates     = {},
    calc           = null,
  } = data

  const savedCalc  = calc || {}
  const totalHrs   = n(savedCalc.totalHrs)
  const manDays    = n(savedCalc.manDays)    || n(module.man_days)
  const totalMat   = n(savedCalc.totalMat)   || n(module.material_cost)
  const laborCost  = n(savedCalc.laborCost)  || totalHrs * n(laborRatePerHour)
  const burden     = n(savedCalc.burden)
  const gp         = n(savedCalc.gp)
  const commission = n(savedCalc.commission) || gp * 0.12
  const subCost    = n(savedCalc.subCost)
  const priceTotal = n(savedCalc.price)

  const fmt2 = (v) => `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  // Small plant lines
  const smallLines = smallPlantRows.filter(r => n(r.qty) > 0).map((r, i) => {
    const qty    = n(r.qty)
    const perDay = laborRates[r.type] ?? SMALL_PLANT_DEFAULTS[r.type]?.perDay ?? 25
    const hrs    = perDay > 0 ? (qty / perDay) * 8 : 0
    const mat    = qty * n(r.price)
    return {
      key: i,
      label: `${r.type} × ${qty}`,
      value: fmt2(mat),
      sub: `${hrs.toFixed(2)} hrs · ${perDay.toLocaleString()} plants/day · $${n(r.price).toFixed(2)}/ea`,
    }
  })

  // Large plant lines
  const largeLines = largePlantRows.filter(r => n(r.qty) > 0).map((r, i) => {
    const qty    = n(r.qty)
    const perDay = laborRates[r.type] ?? LARGE_PLANT_DEFAULTS[r.type]?.perDay ?? 15
    const hrs    = perDay > 0 ? (qty / perDay) * 8 : 0
    const mat    = qty * n(r.price)
    return {
      key: i,
      label: `${r.type} × ${qty}`,
      value: fmt2(mat),
      sub: `${hrs.toFixed(2)} hrs · ${perDay < 1 ? perDay.toFixed(2) : perDay} plants/day · $${n(r.price).toFixed(2)}/ea`,
    }
  })

  const manualLines = manualRows.filter(r => n(r.hours) > 0 || n(r.materials) > 0 || n(r.subCost) > 0)

  // Add-on lines
  const rbRate     = lr(laborRates, 'Root Barrier - Install Rate')
  const gopherRate = lr(laborRates, 'Gopher Basket - Install Rate')
  const meshRate   = lr(laborRates, 'Mesh Flat - Install Rate')
  const juteRate   = lr(laborRates, 'Jute Fabric - Install Rate')
  const stakeRate  = lr(laborRates, 'Tree Stakes - Install Rate')

  const addonLines = [
    n(addons.craneCost) > 0 && {
      key: 'crane', label: 'Crane', value: fmt2(addons.craneCost), sub: 'Sub cost',
    },
    n(addons.treeStakes) > 0 && {
      key: 'stakes', label: `Tree Stakes × ${addons.treeStakes}`,
      value: fmt2(n(addons.treeStakes) * mp(materialPrices, 'Tree Stake')),
      sub: `${stakeRate > 0 ? ((n(addons.treeStakes)/stakeRate)*8).toFixed(2) : '—'} hrs`,
    },
    n(addons.rootBarrier12) > 0 && {
      key: 'rb12', label: `Root Barrier 12" — ${addons.rootBarrier12} LF`,
      value: fmt2(n(addons.rootBarrier12) * mp(materialPrices, 'Root Barrier 12in')),
      sub: `${((n(addons.rootBarrier12) * rbRate) / 60).toFixed(2)} hrs`,
    },
    n(addons.rootBarrier24) > 0 && {
      key: 'rb24', label: `Root Barrier 24" — ${addons.rootBarrier24} LF`,
      value: fmt2(n(addons.rootBarrier24) * mp(materialPrices, 'Root Barrier 24in')),
      sub: `${((n(addons.rootBarrier24) * rbRate) / 60).toFixed(2)} hrs`,
    },
    n(addons.gopherBaskets1) > 0 && {
      key: 'goph1', label: `Gopher Baskets 1 gal × ${addons.gopherBaskets1}`,
      value: fmt2(n(addons.gopherBaskets1) * mp(materialPrices, 'Gopher Basket 1 Gal')),
      sub: `${((n(addons.gopherBaskets1) * gopherRate) / 60).toFixed(2)} hrs`,
    },
    n(addons.gopherBaskets5) > 0 && {
      key: 'goph5', label: `Gopher Baskets 5 gal × ${addons.gopherBaskets5}`,
      value: fmt2(n(addons.gopherBaskets5) * mp(materialPrices, 'Gopher Basket 5 Gal')),
      sub: `${((n(addons.gopherBaskets5) * gopherRate) / 60).toFixed(2)} hrs`,
    },
    n(addons.gopherBaskets15) > 0 && {
      key: 'goph15', label: `Gopher Baskets 15 gal × ${addons.gopherBaskets15}`,
      value: fmt2(n(addons.gopherBaskets15) * mp(materialPrices, 'Gopher Basket 15 Gal')),
      sub: `${((n(addons.gopherBaskets15) * gopherRate) / 60).toFixed(2)} hrs`,
    },
    n(addons.meshFlat) > 0 && {
      key: 'mesh', label: `Mesh Flat — ${addons.meshFlat} sqft`,
      value: fmt2(n(addons.meshFlat) * mp(materialPrices, 'Mesh Flat')),
      sub: `${((n(addons.meshFlat) * meshRate) / 60).toFixed(2)} hrs`,
    },
    n(addons.juteFabric) > 0 && {
      key: 'jute', label: `Jute Fabric — ${addons.juteFabric} sqft`,
      value: fmt2(n(addons.juteFabric) * mp(materialPrices, 'Jute Fabric')),
      sub: `${((n(addons.juteFabric) * juteRate) / 60).toFixed(2)} hrs`,
    },
    (n(addons.addonHours) > 0 || n(addons.addonMaterials) > 0) && {
      key: 'manualadd', label: 'Manual Add-On',
      value: fmt2(addons.addonMaterials),
      sub: `${n(addons.addonHours).toFixed(2)} hrs`,
    },
    n(addons.deliveryCharges) > 0 && {
      key: 'delivery', label: 'Delivery Charges',
      value: fmt2(addons.deliveryCharges),
    },
  ].filter(Boolean)

  const hasAny = smallLines.length || largeLines.length || addonLines.length || manualLines.length || n(tillSqft) > 0

  return (
    <div className="space-y-1 text-sm">

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

      {!hasAny ? (
        <p className="text-xs text-gray-400 text-center py-4">No line items entered.</p>
      ) : (
        <>
          {n(tillSqft) > 0 && (
            <>
              <SectionLabel title="Till & Amend" />
              <LineRow
                label={`${tillSqft} sqft`}
                value={`${n(savedCalc.tillHrs ?? 0).toFixed(2)} hrs`}
              />
            </>
          )}

          {smallLines.length > 0 && (
            <>
              <SectionLabel title="Small Plants" />
              {smallLines.map(l => <LineRow key={l.key} label={l.label} value={l.value} sub={l.sub} />)}
            </>
          )}

          {largeLines.length > 0 && (
            <>
              <SectionLabel title="Large Plants / Trees" />
              {largeLines.map(l => <LineRow key={l.key} label={l.label} value={l.value} sub={l.sub} />)}
            </>
          )}

          {addonLines.length > 0 && (
            <>
              <SectionLabel title="Add-Ons" />
              {addonLines.map(a => <LineRow key={a.key} label={a.label} value={a.value} sub={a.sub} />)}
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
