// ─────────────────────────────────────────────────────────────────────────────
// PlantingSummary — read-only detail view for a saved Planting module.
//
// Consumes the row-based catalog shape (ihData / subData holding smallPlantRows /
// largePlantRows / addonRows + otherAddons). Recomputes each row's material /
// labor from the saved rate + vendor-catalog snapshots so lines show
// Vendor · Item · qty · Material (+ hrs on In-House, flat $ on Sub). Falls back
// gracefully to legacy flat saves (top-level fields + `addons` object) so old
// estimates never crash.
// ─────────────────────────────────────────────────────────────────────────────

import FinancialSummaryList from './FinancialSummaryList'
import { resolveMaterialPrice } from '../../lib/materialCatalog'

const SMALL_PLANT_DEFAULTS = {
  'Flats of Groundcover': { perDay: 25, price: 18.0 },
  'Flats of 4" pots': { perDay: 20, price: 20.0 },
  '4" pots standard': { perDay: 280, price: 0.0 },
  '4" pots succulents': { perDay: 280, price: 7.0 },
  '6" pots standard': { perDay: 180, price: 0.0 },
  '6" pots succulents': { perDay: 180, price: 12.0 },
  '1 gallon standard': { perDay: 70, price: 6.5 },
  '1 gallon premium': { perDay: 70, price: 8.0 },
  '1 gallon succulents': { perDay: 70, price: 18.0 },
  '3 gallon standard': { perDay: 70, price: 7.0 },
  '5 gallon standard': { perDay: 40, price: 17.0 },
  '5 gallon premium': { perDay: 40, price: 35.0 },
  '5 gallon succulents': { perDay: 40, price: 39.0 },
  '5 gallon bamboo': { perDay: 40, price: 40.0 },
  '5 gallon palm': { perDay: 40, price: 50.0 },
}

const LARGE_PLANT_DEFAULTS = {
  '15 gallon standard': { perDay: 15, price: 52.0 },
  '15 gallon premium': { perDay: 15, price: 90.0 },
  '15 gallon succulents': { perDay: 15, price: 225.0 },
  '15 gallon fruit': { perDay: 15, price: 145.0 },
  '15 gallon palms': { perDay: 15, price: 175.0 },
  '24" box standard': { perDay: 4, price: 185.0 },
  '24" box premium': { perDay: 4, price: 250.0 },
  '24" box fruit': { perDay: 4, price: 0.0 },
  '24" box palm': { perDay: 4, price: 0.0 },
  '36" box standard': { perDay: 0.75, price: 450.0 },
  '36" box premium': { perDay: 0.75, price: 600.0 },
  '36" box fruit': { perDay: 0.75, price: 0.0 },
  '36" box palm': { perDay: 0.75, price: 0.0 },
  '48" box standard': { perDay: 0.3, price: 800.0 },
  '48" box premium': { perDay: 0.3, price: 0.0 },
  '48" box fruit': { perDay: 0.3, price: 0.0 },
  '48" box palm': { perDay: 0.3, price: 0.0 },
}

const LABOR_DEFAULTS = {
  'Till - Soil Move Rate': 39,
  'Till - Tilling Rate': 3600,
  'Till - Amend Rate': 900,
  'Tree Stakes - Install Rate': 24,
  'Root Barrier - Install Rate': 20,
  'Gopher Basket - Install Rate': 2,
  'Mesh Flat - Install Rate': 0.7,
  'Jute Fabric - Install Rate': 1.1,
}

const ADDON_MAT_DEFAULTS = {
  'Tree Stake': 8.5,
  'Root Barrier 12in': 5.0,
  'Root Barrier 24in': 7.0,
  'Gopher Basket 1 Gal': 3.42,
  'Gopher Basket 5 Gal': 7.78,
  'Gopher Basket 15 Gal': 10.5,
  'Mesh Flat': 1.0,
  'Jute Fabric': 0.4,
}

const ADDON_META = {
  'Tree Stake': { matKey: 'Tree Stake', labKey: 'Tree Stakes - Install Rate', mode: 'perDay', unit: 'ea' },
  'Root Barrier 12"': { matKey: 'Root Barrier 12in', labKey: 'Root Barrier - Install Rate', mode: 'perMin', unit: 'LF' },
  'Root Barrier 24"': { matKey: 'Root Barrier 24in', labKey: 'Root Barrier - Install Rate', mode: 'perMin', unit: 'LF' },
  'Gopher Basket 1 gal': { matKey: 'Gopher Basket 1 Gal', labKey: 'Gopher Basket - Install Rate', mode: 'perMin', unit: 'ea' },
  'Gopher Basket 5 gal': { matKey: 'Gopher Basket 5 Gal', labKey: 'Gopher Basket - Install Rate', mode: 'perMin', unit: 'ea' },
  'Gopher Basket 15 gal': { matKey: 'Gopher Basket 15 Gal', labKey: 'Gopher Basket - Install Rate', mode: 'perMin', unit: 'ea' },
  'Mesh Flat': { matKey: 'Mesh Flat', labKey: 'Mesh Flat - Install Rate', mode: 'perMin', unit: 'SF' },
  'Jute Fabric': { matKey: 'Jute Fabric', labKey: 'Jute Fabric - Install Rate', mode: 'perMin', unit: 'SF' },
}

// Legacy `addons` field → new Item type, for old flat saves.
const LEGACY_ADDON_MAP = [
  ['Tree Stake', 'treeStakes'],
  ['Root Barrier 12"', 'rootBarrier12'],
  ['Root Barrier 24"', 'rootBarrier24'],
  ['Gopher Basket 1 gal', 'gopherBaskets1'],
  ['Gopher Basket 5 gal', 'gopherBaskets5'],
  ['Gopher Basket 15 gal', 'gopherBaskets15'],
  ['Mesh Flat', 'meshFlat'],
  ['Jute Fabric', 'juteFabric'],
]

const n = v => parseFloat(v) || 0
const lr = (rates, key) => rates[key] ?? LABOR_DEFAULTS[key] ?? 0

const plantMatPrice = resolveMaterialPrice

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
  const isSub = data.subType === 'Subcontractor'
  const tab = isSub ? data.subData || {} : data.ihData || data
  const materialPrices = data.materialPrices || {}
  const laborRates = data.laborRates || {}
  const materialRows = data.materialRows || []
  const vendorNames = data.vendorNames || {}
  const savedCalc = data.calc || {}

  const tillSqft = tab.tillSqft ?? ''
  const difficulty = tab.difficulty ?? ''
  const smallPlantRows = tab.smallPlantRows || []
  const largePlantRows = tab.largePlantRows || []
  // Add-on rows: new shape, else migrate the legacy `addons` object for display.
  const legacyAddons = tab.addons || {}
  const addonRows =
    tab.addonRows ||
    LEGACY_ADDON_MAP.filter(([, field]) => n(legacyAddons[field]) > 0).map(([type, field]) => ({
      vendor: 'House',
      type,
      qty: legacyAddons[field],
    }))
  const otherAddons = tab.otherAddons || legacyAddons
  const manualRows = tab.manualRows || []

  const totalHrs = n(savedCalc.totalHrs)
  const manDays = n(savedCalc.manDays) || n(module.man_days)
  const totalMat = n(savedCalc.totalMat) || n(module.material_cost)
  const laborRatePerHour = n(data.laborRatePerHour) || 35
  const laborCost = n(savedCalc.laborCost) || totalHrs * laborRatePerHour
  const burden = n(savedCalc.burden)
  const gp = n(savedCalc.gp)
  const subGp = n(savedCalc.subGp)
  const commission = n(savedCalc.commission) || gp * 0.12
  const subCost = n(savedCalc.subCost)
  const priceTotal = n(savedCalc.price)

  const fmt2 = v =>
    `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const vendorLabel = v => (!v || v === 'House' ? 'Unspecified' : vendorNames[v] || 'Vendor')

  // Plant lines
  function plantLines(rows, defaultsMap) {
    return rows
      .filter(r => n(r.qty) > 0)
      .map((r, i) => {
        const qty = n(r.qty)
        const perDay = laborRates[r.type] ?? defaultsMap[r.type]?.perDay ?? 0
        const unitPrice = n(r.price)
        const hrs = perDay > 0 ? (qty / perDay) * 8 : 0
        const subEach = r.subEach !== '' && r.subEach != null ? n(r.subEach) : unitPrice
        const material = isSub ? qty * subEach : perDay > 0 ? qty * unitPrice : 0
        const parts = []
        if (isSub) parts.push(`${fmt2(subEach)}/ea flat`)
        else {
          parts.push(`${hrs.toFixed(2)} hrs`)
          parts.push(`${perDay < 1 ? perDay.toFixed(2) : perDay.toLocaleString()} plants/day`)
          parts.push(`${fmt2(unitPrice)}/ea`)
        }
        return {
          key: i,
          label: `${vendorLabel(r.vendor)} · ${r.type} × ${qty}`,
          value: fmt2(material),
          sub: parts.join(' · '),
        }
      })
  }

  const smallLines = plantLines(smallPlantRows, SMALL_PLANT_DEFAULTS)
  const largeLines = plantLines(largePlantRows, LARGE_PLANT_DEFAULTS)

  // Add-on lines
  const addonLines = (addonRows || [])
    .filter(r => n(r.qty) > 0)
    .map((r, i) => {
      const meta = ADDON_META[r.type] || {}
      const qty = n(r.qty)
      const rate = lr(laborRates, meta.labKey)
      const unitPrice = plantMatPrice(
        meta.matKey,
        r.vendor,
        materialRows,
        materialPrices,
        ADDON_MAT_DEFAULTS[meta.matKey] ?? 0
      )
      let hrs = 0
      if (meta.mode === 'perDay') hrs = rate > 0 ? (qty / rate) * 8 : 0
      else if (meta.mode === 'perMin') hrs = (qty * rate) / 60
      const subEach = r.subEach !== '' && r.subEach != null ? n(r.subEach) : unitPrice
      const material = isSub ? qty * subEach : qty * unitPrice
      return {
        key: i,
        label: `${vendorLabel(r.vendor)} · ${r.type} × ${qty}`,
        value: fmt2(material),
        sub: isSub ? `${fmt2(subEach)}/${meta.unit} flat` : `${hrs.toFixed(2)} hrs`,
      }
    })

  // Other add-ons (crane / manual / delivery)
  const otherLines = [
    n(otherAddons.craneCost) > 0 && {
      key: 'crane',
      label: 'Crane',
      value: fmt2(otherAddons.craneCost),
      sub: 'Sub cost',
    },
    !isSub &&
      (n(otherAddons.addonHours) > 0 || n(otherAddons.addonMaterials) > 0) && {
        key: 'manualadd',
        label: 'Manual Add-On',
        value: fmt2(otherAddons.addonMaterials),
        sub: `${n(otherAddons.addonHours).toFixed(2)} hrs`,
      },
    !isSub &&
      n(otherAddons.deliveryCharges) > 0 && {
        key: 'delivery',
        label: 'Delivery Charges',
        value: fmt2(otherAddons.deliveryCharges),
      },
  ].filter(Boolean)

  const manualLines = manualRows.filter(
    r => n(r.hours) > 0 || n(r.materials) > 0 || n(r.subCost) > 0
  )

  const hasAny =
    smallLines.length ||
    largeLines.length ||
    addonLines.length ||
    otherLines.length ||
    manualLines.length ||
    (!isSub && n(tillSqft) > 0)

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

      {isSub && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded font-medium">
            Subcontractor
          </span>
        </div>
      )}

      {!isSub && n(difficulty) > 0 && (
        <div className="flex items-center justify-between text-xs text-amber-700 bg-amber-50 rounded px-3 py-1.5">
          <span>Difficulty modifier applied</span>
          <span className="font-semibold">+{difficulty}%</span>
        </div>
      )}

      {!hasAny ? (
        <p className="text-xs text-gray-400 text-center py-4">No line items entered.</p>
      ) : (
        <>
          {!isSub && n(tillSqft) > 0 && (
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
              {smallLines.map(l => (
                <LineRow key={l.key} label={l.label} value={l.value} sub={l.sub} />
              ))}
            </>
          )}

          {largeLines.length > 0 && (
            <>
              <SectionLabel title="Large Plants / Trees" />
              {largeLines.map(l => (
                <LineRow key={l.key} label={l.label} value={l.value} sub={l.sub} />
              ))}
            </>
          )}

          {(addonLines.length > 0 || otherLines.length > 0) && (
            <>
              <SectionLabel title="Add-Ons" />
              {addonLines.map(a => (
                <LineRow key={a.key} label={a.label} value={a.value} sub={a.sub} />
              ))}
              {otherLines.map(a => (
                <LineRow key={a.key} label={a.label} value={a.value} sub={a.sub} />
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
        lrph={laborRatePerHour}
        burden={burden}
        subCost={subCost}
        gp={gp}
        subGp={subGp}
        commission={commission}
        price={priceTotal}
      />
    </div>
  )
}
