import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import GpmdBar from './GpmdBar'

// ─────────────────────────────────────────────────────────────────────────────
// Planting Module
// Material prices  → material_rates  (category = 'Planting')  keyed by name
// Labor rates      → labor_rates     (category = 'Planting')  keyed by name
//   Plant types:   rate = plants per man-day
//   Till - Soil Move Rate:           rate = CY/day
//   Till - Tilling Rate:             rate = sqft/day
//   Till - Amend Rate:               rate = sqft/day
//   Tree Stakes - Install Rate:      rate = stakes/day
//   Root Barrier - Install Rate:     rate = min/LF
//   Gopher Basket - Install Rate:    rate = min/basket
//   Mesh Flat - Install Rate:        rate = min/sqft
//   Jute Fabric - Install Rate:      rate = min/sqft
// ─────────────────────────────────────────────────────────────────────────────

// Hardcoded fallbacks (used when DB row not present yet)
const SMALL_PLANT_DEFAULTS = {
  'Flats of Groundcover': { perDay: 25,  price: 18.00 },
  'Flats of 4" pots':     { perDay: 20,  price: 20.00 },
  '4" pots standard':     { perDay: 280, price: 0.00  },
  '4" pots succulents':   { perDay: 280, price: 7.00  },
  '6" pots standard':     { perDay: 180, price: 0.00  },
  '6" pots succulents':   { perDay: 180, price: 12.00 },
  '1 gallon standard':    { perDay: 70,  price: 6.50  },
  '1 gallon premium':     { perDay: 70,  price: 8.00  },
  '1 gallon succulents':  { perDay: 70,  price: 18.00 },
  '3 gallon standard':    { perDay: 70,  price: 7.00  },
  '5 gallon standard':    { perDay: 40,  price: 17.00 },
  '5 gallon premium':     { perDay: 40,  price: 35.00 },
  '5 gallon succulents':  { perDay: 40,  price: 39.00 },
  '5 gallon bamboo':      { perDay: 40,  price: 40.00 },
  '5 gallon palm':        { perDay: 40,  price: 50.00 },
}

const LARGE_PLANT_DEFAULTS = {
  '15 gallon standard':   { perDay: 15,   price: 52.00  },
  '15 gallon premium':    { perDay: 15,   price: 90.00  },
  '15 gallon succulents': { perDay: 15,   price: 225.00 },
  '15 gallon fruit':      { perDay: 15,   price: 145.00 },
  '15 gallon palms':      { perDay: 15,   price: 175.00 },
  '24" box standard':     { perDay: 4,    price: 185.00 },
  '24" box premium':      { perDay: 4,    price: 250.00 },
  '24" box fruit':        { perDay: 4,    price: 0.00   },
  '24" box palm':         { perDay: 4,    price: 0.00   },
  '36" box standard':     { perDay: 0.75, price: 450.00 },
  '36" box premium':      { perDay: 0.75, price: 600.00 },
  '36" box fruit':        { perDay: 0.75, price: 0.00   },
  '36" box palm':         { perDay: 0.75, price: 0.00   },
  '48" box standard':     { perDay: 0.3,  price: 800.00 },
  '48" box premium':      { perDay: 0.3,  price: 0.00   },
  '48" box fruit':        { perDay: 0.3,  price: 0.00   },
  '48" box palm':         { perDay: 0.3,  price: 0.00   },
}

// Fallback labor rate defaults for add-ons and till
const LABOR_DEFAULTS = {
  'Till - Soil Move Rate':        39,    // CY/day
  'Till - Tilling Rate':          3600,  // sqft/day
  'Till - Amend Rate':            900,   // sqft/day
  'Tree Stakes - Install Rate':   24,    // stakes/day
  'Root Barrier - Install Rate':  20,    // min/LF
  'Gopher Basket - Install Rate': 2,     // min/basket
  'Mesh Flat - Install Rate':     0.7,   // min/sqft
  'Jute Fabric - Install Rate':   1.1,   // min/sqft
}

// Add-on material fallback prices
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

const WORKER_DEFAULTS = {
  laborRatePerHour: 35,
  laborBurdenPct:   0.29,
  gpmd:             425,
  commissionRate:   0.12,
}

const n = (v) => parseFloat(v) || 0

// ── Helpers ───────────────────────────────────────────────────────────────────
function lr(laborRates, key)   { return laborRates[key]   ?? LABOR_DEFAULTS[key]   ?? 0 }
function mp(materialPrices, key) { return materialPrices[key] ?? ADDON_MAT_DEFAULTS[key] ?? 0 }

function getSmallPerDay(laborRates, type) {
  return laborRates[type] ?? SMALL_PLANT_DEFAULTS[type]?.perDay ?? 25
}
function getLargePerDay(laborRates, type) {
  return laborRates[type] ?? LARGE_PLANT_DEFAULTS[type]?.perDay ?? 15
}

// ── Calc ──────────────────────────────────────────────────────────────────────
function calcPlanting(state, laborRatePerHour, gpmd, materialPrices, laborRates) {
  const { tillSqft, difficulty, smallPlantRows, largePlantRows, addons, manualRows } = state

  // Till and Amend
  const sqft = n(tillSqft)
  const soilCY = (sqft * 0.167) / 27
  const soilMoveRate = lr(laborRates, 'Till - Soil Move Rate')
  const tillingRate  = lr(laborRates, 'Till - Tilling Rate')
  const amendRate    = lr(laborRates, 'Till - Amend Rate')
  const tillManDays  = sqft > 0 && soilMoveRate > 0 && tillingRate > 0 && amendRate > 0
    ? (soilCY / soilMoveRate) + (sqft / tillingRate) + (sqft / amendRate)
    : 0
  const tillHrs = tillManDays * 8

  // Small plants
  let smallHrs = 0, smallMat = 0
  smallPlantRows.forEach(r => {
    const qty = n(r.qty)
    if (qty <= 0) return
    const perDay = getSmallPerDay(laborRates, r.type)
    if (perDay <= 0) return
    smallHrs += (qty / perDay) * 8
    smallMat += qty * n(r.price)
  })

  // Large plants
  let largeHrs = 0, largeMat = 0
  largePlantRows.forEach(r => {
    const qty = n(r.qty)
    if (qty <= 0) return
    const perDay = getLargePerDay(laborRates, r.type)
    if (perDay <= 0) return
    largeHrs += (qty / perDay) * 8
    largeMat += qty * n(r.price)
  })

  const plantHrs = tillHrs + smallHrs + largeHrs

  // Add-on labor (all times in hours)
  let addonHrs = 0, addonMat = 0
  const craneSub = n(addons.craneCost)

  const stakePerDay  = lr(laborRates, 'Tree Stakes - Install Rate')
  addonHrs += stakePerDay > 0 ? (n(addons.treeStakes) / stakePerDay) * 8 : 0
  addonMat += n(addons.treeStakes) * mp(materialPrices, 'Tree Stake')

  const rbRate = lr(laborRates, 'Root Barrier - Install Rate') // min/LF
  addonHrs += (n(addons.rootBarrier12) * rbRate) / 60
  addonHrs += (n(addons.rootBarrier24) * rbRate) / 60
  addonMat += n(addons.rootBarrier12) * mp(materialPrices, 'Root Barrier 12in')
  addonMat += n(addons.rootBarrier24) * mp(materialPrices, 'Root Barrier 24in')

  const gopherRate = lr(laborRates, 'Gopher Basket - Install Rate') // min/basket
  addonHrs += (n(addons.gopherBaskets1)  * gopherRate) / 60
  addonHrs += (n(addons.gopherBaskets5)  * gopherRate) / 60
  addonHrs += (n(addons.gopherBaskets15) * gopherRate) / 60
  addonMat += n(addons.gopherBaskets1)  * mp(materialPrices, 'Gopher Basket 1 Gal')
  addonMat += n(addons.gopherBaskets5)  * mp(materialPrices, 'Gopher Basket 5 Gal')
  addonMat += n(addons.gopherBaskets15) * mp(materialPrices, 'Gopher Basket 15 Gal')

  const meshRate = lr(laborRates, 'Mesh Flat - Install Rate') // min/sqft
  addonHrs += (n(addons.meshFlat) * meshRate) / 60
  addonMat += n(addons.meshFlat) * mp(materialPrices, 'Mesh Flat')

  const juteRate = lr(laborRates, 'Jute Fabric - Install Rate') // min/sqft
  addonHrs += (n(addons.juteFabric) * juteRate) / 60
  addonMat += n(addons.juteFabric) * mp(materialPrices, 'Jute Fabric')

  addonHrs += n(addons.addonHours)
  addonMat += n(addons.addonMaterials)
  addonMat += n(addons.deliveryCharges)

  // Difficulty
  const diffPct = n(difficulty) / 100
  const diffHrs = (plantHrs + addonHrs) * diffPct

  // Manual entry
  let manHrs = 0, manMat = 0, manSub = 0
  manualRows.forEach(r => {
    manHrs += n(r.hours)
    manMat += n(r.materials)
    manSub += n(r.subCost)
  })

  const totalHrs  = plantHrs + addonHrs + diffHrs + manHrs
  const manDays   = totalHrs / 8
  const totalMat  = smallMat + largeMat + addonMat + manMat
  const laborCost = totalHrs * laborRatePerHour
  const burden    = laborCost * WORKER_DEFAULTS.laborBurdenPct
  const subCost   = craneSub + manSub
  const gp        = manDays * gpmd
  const commission = gp * WORKER_DEFAULTS.commissionRate
  const price     = totalMat + laborCost + burden + gp + commission + subCost

  return { totalHrs, manDays, totalMat, laborCost, burden, subCost, gp, commission, price,
           tillHrs, smallHrs, largeHrs, addonHrs, diffHrs }
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionHeader({ title }) {
  return (
    <div className="bg-gray-100 px-4 py-2 rounded-lg mb-2">
      <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">{title}</h3>
    </div>
  )
}

function NumInput({ value, onChange, placeholder = '0', className = '' }) {
  return (
    <input
      type="number" step="any" min="0"
      className={`input text-sm py-1.5 ${className}`}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  )
}

// ── Default state ─────────────────────────────────────────────────────────────
function newSmallRow(type = 'Flats of Groundcover', materialPrices = {}) {
  const fallback = SMALL_PLANT_DEFAULTS[type]?.price ?? 0
  return { type, qty: '', price: materialPrices[type] ?? fallback }
}
function newLargeRow(type = '15 gallon standard', materialPrices = {}) {
  const fallback = LARGE_PLANT_DEFAULTS[type]?.price ?? 0
  return { type, qty: '', price: materialPrices[type] ?? fallback }
}

const DEFAULT_SMALL_ROWS = () => [
  { type: 'Flats of Groundcover', qty: '', price: SMALL_PLANT_DEFAULTS['Flats of Groundcover'].price },
  { type: 'Flats of Groundcover', qty: '', price: SMALL_PLANT_DEFAULTS['Flats of Groundcover'].price },
  { type: 'Flats of Groundcover', qty: '', price: SMALL_PLANT_DEFAULTS['Flats of Groundcover'].price },
  { type: 'Flats of Groundcover', qty: '', price: SMALL_PLANT_DEFAULTS['Flats of Groundcover'].price },
]
const DEFAULT_LARGE_ROWS = () => [
  { type: '15 gallon standard', qty: '', price: LARGE_PLANT_DEFAULTS['15 gallon standard'].price },
  { type: '15 gallon standard', qty: '', price: LARGE_PLANT_DEFAULTS['15 gallon standard'].price },
  { type: '15 gallon standard', qty: '', price: LARGE_PLANT_DEFAULTS['15 gallon standard'].price },
  { type: '15 gallon standard', qty: '', price: LARGE_PLANT_DEFAULTS['15 gallon standard'].price },
]
const DEFAULT_ADDONS = {
  craneCost: '', treeStakes: '',
  rootBarrier12: '', rootBarrier24: '',
  addonHours: '', addonMaterials: '',
  gopherBaskets1: '', gopherBaskets5: '', gopherBaskets15: '',
  meshFlat: '', juteFabric: '', deliveryCharges: '',
}
const DEFAULT_MANUAL_ROWS = [
  { label: 'Misc 1', hours: '', materials: '', subCost: '' },
  { label: 'Misc 2', hours: '', materials: '', subCost: '' },
  { label: 'Misc 3', hours: '', materials: '', subCost: '' },
  { label: 'Misc 4', hours: '', materials: '', subCost: '' },
]

// ── Main Component ─────────────────────────────────────────────────────────────
export default function PlantingModule({ projectName, onSave, onBack, saving, initialData }) {
  const [laborRatePerHour, setLaborRatePerHour] = useState(
    initialData?.laborRatePerHour ?? WORKER_DEFAULTS.laborRatePerHour
  )
  // materialPrices: { 'Plant Name': unit_cost, ... }
  const [materialPrices, setMaterialPrices] = useState(initialData?.materialPrices ?? {})
  // laborRates: { 'Plant Name or Rate Key': rate_value, ... }
  const [laborRates,     setLaborRates]     = useState(initialData?.laborRates     ?? {})
  const [pricesLoading,  setPricesLoading]  = useState(!initialData?.materialPrices)

  useEffect(() => {
    if (!initialData?.laborRatePerHour) {
      supabase
        .from('company_settings')
        .select('value')
        .eq('key', 'labor_rate_per_hour')
        .single()
        .then(({ data }) => {
          if (data) setLaborRatePerHour(parseFloat(data.value) || WORKER_DEFAULTS.laborRatePerHour)
        })
    }

    // If editing an existing module, use the saved snapshots
    if (initialData?.materialPrices) return

    Promise.all([
      supabase.from('material_rates').select('name, unit_cost').eq('category', 'Planting'),
      supabase.from('labor_rates').select('name, rate').eq('category', 'Planting'),
    ]).then(([matRes, labRes]) => {
      if (matRes.data) {
        const mp = {}
        matRes.data.forEach(r => { mp[r.name] = parseFloat(r.unit_cost) || 0 })
        setMaterialPrices(mp)
        // Patch default plant row prices to use live DB prices
        setSmallPlantRows(rows => rows.map(r => ({
          ...r,
          price: mp[r.type] ?? SMALL_PLANT_DEFAULTS[r.type]?.price ?? 0,
        })))
        setLargePlantRows(rows => rows.map(r => ({
          ...r,
          price: mp[r.type] ?? LARGE_PLANT_DEFAULTS[r.type]?.price ?? 0,
        })))
      }
      if (labRes.data) {
        const lr = {}
        labRes.data.forEach(r => { lr[r.name] = parseFloat(r.rate) || 0 })
        setLaborRates(lr)
      }
      setPricesLoading(false)
    })
  }, [])

  const gpmd = initialData?.gpmd ?? WORKER_DEFAULTS.gpmd
  const subGpMarkupRate = initialData?.subGpMarkupRate ?? 0.20

  const [tillSqft,       setTillSqft]       = useState(initialData?.tillSqft       ?? '')
  const [difficulty,     setDifficulty]     = useState(initialData?.difficulty     ?? '')
  const [smallPlantRows, setSmallPlantRows] = useState(initialData?.smallPlantRows ?? DEFAULT_SMALL_ROWS())
  const [largePlantRows, setLargePlantRows] = useState(initialData?.largePlantRows ?? DEFAULT_LARGE_ROWS())
  const [addons,         setAddons]         = useState(initialData?.addons         ?? DEFAULT_ADDONS)
  const [manualRows,     setManualRows]     = useState(initialData?.manualRows     ?? DEFAULT_MANUAL_ROWS)

  const calc = calcPlanting(
    { tillSqft, difficulty, smallPlantRows, largePlantRows, addons, manualRows },
    laborRatePerHour, gpmd, materialPrices, laborRates,
  )

  function updateSmall(i, field, val) {
    setSmallPlantRows(rows => rows.map((r, idx) => {
      if (idx !== i) return r
      if (field === 'type') {
        const fallback = SMALL_PLANT_DEFAULTS[val]?.price ?? 0
        return { ...r, type: val, price: materialPrices[val] ?? fallback }
      }
      return { ...r, [field]: val }
    }))
  }
  function updateLarge(i, field, val) {
    setLargePlantRows(rows => rows.map((r, idx) => {
      if (idx !== i) return r
      if (field === 'type') {
        const fallback = LARGE_PLANT_DEFAULTS[val]?.price ?? 0
        return { ...r, type: val, price: materialPrices[val] ?? fallback }
      }
      return { ...r, [field]: val }
    }))
  }
  function updateManual(i, field, val) {
    setManualRows(rows => rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  }

  function handleSave() {
    onSave({
      man_days:      parseFloat(calc.manDays.toFixed(2)),
      material_cost: parseFloat(calc.totalMat.toFixed(2)),
      data: {
        tillSqft, difficulty, smallPlantRows, largePlantRows, addons, manualRows,
        laborRatePerHour, gpmd,
        materialPrices,   // snapshot so summary always reflects save-time prices
        laborRates,       // snapshot so summary always reflects save-time rates
        calc,
      },
    })
  }

  // Helper: display the live per-day rate for a plant type
  const smallPerDay = (type) => getSmallPerDay(laborRates, type)
  const largePerDay = (type) => getLargePerDay(laborRates, type)

  return (
    <div className="space-y-5">

      {pricesLoading && (
        <div className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
          Loading rates from Master Rates…
        </div>
      )}

      {/* Till & Amend + Difficulty */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Till &amp; Amend Soil (sqft)</label>
          <NumInput value={tillSqft} onChange={setTillSqft} placeholder="0" />
          {n(tillSqft) > 0 && (
            <p className="text-xs text-gray-400 mt-1">{calc.tillHrs.toFixed(2)} hrs estimated</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty Add</label>
          <div className="relative">
            <NumInput value={difficulty} onChange={setDifficulty} placeholder="0" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
          </div>
        </div>
      </div>

      {/* ── Small Plants ── */}
      <div>
        <SectionHeader title="Small Plants" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1 pr-2 font-medium">Plant Type</th>
                <th className="text-left pb-1 pr-2 font-medium w-20">Qty</th>
                <th className="text-left pb-1 pr-2 font-medium w-24">Price/Ea</th>
                <th className="text-right pb-1 font-medium text-gray-400">Plants/Day</th>
                <th className="text-right pb-1 pl-2 font-medium text-gray-400">Est. Hrs</th>
              </tr>
            </thead>
            <tbody>
              {smallPlantRows.map((row, i) => {
                const qty    = n(row.qty)
                const perDay = smallPerDay(row.type)
                const hrs    = qty > 0 && perDay > 0 ? (qty / perDay) * 8 : 0
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-2">
                      <select
                        className="input text-sm py-1 w-full"
                        value={row.type}
                        onChange={e => updateSmall(i, 'type', e.target.value)}
                      >
                        {Object.keys(SMALL_PLANT_DEFAULTS).map(t => <option key={t}>{t}</option>)}
                      </select>
                    </td>
                    <td className="py-1 pr-2">
                      <NumInput value={row.qty} onChange={v => updateSmall(i, 'qty', v)} />
                    </td>
                    <td className="py-1 pr-2">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                        <input
                          type="number" step="any" min="0"
                          className="input text-sm py-1.5 pl-5"
                          value={row.price}
                          onChange={e => updateSmall(i, 'price', e.target.value)}
                        />
                      </div>
                    </td>
                    <td className="py-1 text-right text-gray-400 text-xs">
                      {perDay.toLocaleString()}
                    </td>
                    <td className="py-1 text-right text-gray-600 text-xs pl-2">
                      {hrs > 0 ? hrs.toFixed(2) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          className="mt-2 text-xs text-green-700 hover:text-green-900 font-medium"
          onClick={() => setSmallPlantRows(rows => [...rows, newSmallRow('Flats of Groundcover', materialPrices)])}
        >
          + Add Row
        </button>
      </div>

      {/* ── Large Plants / Trees ── */}
      <div>
        <SectionHeader title="Large Plants / Trees" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1 pr-2 font-medium">Plant Type</th>
                <th className="text-left pb-1 pr-2 font-medium w-20">Qty</th>
                <th className="text-left pb-1 pr-2 font-medium w-24">Price/Ea</th>
                <th className="text-right pb-1 font-medium text-gray-400">Plants/Day</th>
                <th className="text-right pb-1 pl-2 font-medium text-gray-400">Est. Hrs</th>
              </tr>
            </thead>
            <tbody>
              {largePlantRows.map((row, i) => {
                const qty    = n(row.qty)
                const perDay = largePerDay(row.type)
                const hrs    = qty > 0 && perDay > 0 ? (qty / perDay) * 8 : 0
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-2">
                      <select
                        className="input text-sm py-1 w-full"
                        value={row.type}
                        onChange={e => updateLarge(i, 'type', e.target.value)}
                      >
                        {Object.keys(LARGE_PLANT_DEFAULTS).map(t => <option key={t}>{t}</option>)}
                      </select>
                    </td>
                    <td className="py-1 pr-2">
                      <NumInput value={row.qty} onChange={v => updateLarge(i, 'qty', v)} />
                    </td>
                    <td className="py-1 pr-2">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                        <input
                          type="number" step="any" min="0"
                          className="input text-sm py-1.5 pl-5"
                          value={row.price}
                          onChange={e => updateLarge(i, 'price', e.target.value)}
                        />
                      </div>
                    </td>
                    <td className="py-1 text-right text-gray-400 text-xs">
                      {perDay < 1 ? perDay.toFixed(2) : perDay.toLocaleString()}
                    </td>
                    <td className="py-1 text-right text-gray-600 text-xs pl-2">
                      {hrs > 0 ? hrs.toFixed(2) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          className="mt-2 text-xs text-green-700 hover:text-green-900 font-medium"
          onClick={() => setLargePlantRows(rows => [...rows, newLargeRow('15 gallon standard', materialPrices)])}
        >
          + Add Row
        </button>
      </div>

      {/* ── Planting Add-Ons ── */}
      <div>
        <SectionHeader title="Planting Add-Ons" />
        <div className="space-y-2">

          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700 w-52 shrink-0">Crane (hiring cost $)</label>
            <div className="relative w-36">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
              <NumInput value={addons.craneCost} onChange={v => setAddons(p => ({ ...p, craneCost: v }))} className="pl-5" />
            </div>
            <span className="text-xs text-gray-400">Sub cost</span>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700 w-52 shrink-0">Tree Stakes (qty)</label>
            <NumInput value={addons.treeStakes} onChange={v => setAddons(p => ({ ...p, treeStakes: v }))} className="w-36" />
            {n(addons.treeStakes) > 0 && (
              <span className="text-xs text-gray-400">
                {((n(addons.treeStakes) / (lr(laborRates,'Tree Stakes - Install Rate'))) * 8).toFixed(2)} hrs
                · ${(n(addons.treeStakes) * mp(materialPrices,'Tree Stake')).toFixed(2)} mat
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700 w-52 shrink-0">Root Barrier 12" (LF)</label>
            <NumInput value={addons.rootBarrier12} onChange={v => setAddons(p => ({ ...p, rootBarrier12: v }))} className="w-36" />
            {n(addons.rootBarrier12) > 0 && (
              <span className="text-xs text-gray-400">
                {((n(addons.rootBarrier12) * lr(laborRates,'Root Barrier - Install Rate')) / 60).toFixed(2)} hrs
                · ${(n(addons.rootBarrier12) * mp(materialPrices,'Root Barrier 12in')).toFixed(2)} mat
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700 w-52 shrink-0">Root Barrier 24" (LF)</label>
            <NumInput value={addons.rootBarrier24} onChange={v => setAddons(p => ({ ...p, rootBarrier24: v }))} className="w-36" />
            {n(addons.rootBarrier24) > 0 && (
              <span className="text-xs text-gray-400">
                {((n(addons.rootBarrier24) * lr(laborRates,'Root Barrier - Install Rate')) / 60).toFixed(2)} hrs
                · ${(n(addons.rootBarrier24) * mp(materialPrices,'Root Barrier 24in')).toFixed(2)} mat
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700 w-52 shrink-0">Gopher Baskets — 1 gal (qty)</label>
            <NumInput value={addons.gopherBaskets1} onChange={v => setAddons(p => ({ ...p, gopherBaskets1: v }))} className="w-36" />
            {n(addons.gopherBaskets1) > 0 && (
              <span className="text-xs text-gray-400">${(n(addons.gopherBaskets1) * mp(materialPrices,'Gopher Basket 1 Gal')).toFixed(2)} mat</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700 w-52 shrink-0">Gopher Baskets — 5 gal (qty)</label>
            <NumInput value={addons.gopherBaskets5} onChange={v => setAddons(p => ({ ...p, gopherBaskets5: v }))} className="w-36" />
            {n(addons.gopherBaskets5) > 0 && (
              <span className="text-xs text-gray-400">${(n(addons.gopherBaskets5) * mp(materialPrices,'Gopher Basket 5 Gal')).toFixed(2)} mat</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700 w-52 shrink-0">Gopher Baskets — 15 gal (qty)</label>
            <NumInput value={addons.gopherBaskets15} onChange={v => setAddons(p => ({ ...p, gopherBaskets15: v }))} className="w-36" />
            {n(addons.gopherBaskets15) > 0 && (
              <span className="text-xs text-gray-400">${(n(addons.gopherBaskets15) * mp(materialPrices,'Gopher Basket 15 Gal')).toFixed(2)} mat</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700 w-52 shrink-0">Mesh Flat (sqft)</label>
            <NumInput value={addons.meshFlat} onChange={v => setAddons(p => ({ ...p, meshFlat: v }))} className="w-36" />
            {n(addons.meshFlat) > 0 && (
              <span className="text-xs text-gray-400">
                {((n(addons.meshFlat) * lr(laborRates,'Mesh Flat - Install Rate')) / 60).toFixed(2)} hrs
                · ${(n(addons.meshFlat) * mp(materialPrices,'Mesh Flat')).toFixed(2)} mat
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700 w-52 shrink-0">Jute Fabric (sqft)</label>
            <NumInput value={addons.juteFabric} onChange={v => setAddons(p => ({ ...p, juteFabric: v }))} className="w-36" />
            {n(addons.juteFabric) > 0 && (
              <span className="text-xs text-gray-400">
                {((n(addons.juteFabric) * lr(laborRates,'Jute Fabric - Install Rate')) / 60).toFixed(2)} hrs
                · ${(n(addons.juteFabric) * mp(materialPrices,'Jute Fabric')).toFixed(2)} mat
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700 w-52 shrink-0">Manual Add-On (hrs)</label>
            <NumInput value={addons.addonHours} onChange={v => setAddons(p => ({ ...p, addonHours: v }))} className="w-36" />
            <div className="relative w-36">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
              <NumInput value={addons.addonMaterials} onChange={v => setAddons(p => ({ ...p, addonMaterials: v }))} className="pl-5" placeholder="Mat $" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700 w-52 shrink-0">Delivery Charges ($)</label>
            <div className="relative w-36">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
              <NumInput value={addons.deliveryCharges} onChange={v => setAddons(p => ({ ...p, deliveryCharges: v }))} className="pl-5" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Manual Entry ── */}
      <div>
        <SectionHeader title="Manual Entry" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left pb-1 pr-2 font-medium">Description</th>
                <th className="text-left pb-1 pr-2 font-medium">Hours</th>
                <th className="text-left pb-1 pr-2 font-medium">Materials $</th>
                <th className="text-left pb-1 font-medium">Sub Cost $</th>
              </tr>
            </thead>
            <tbody>
              {manualRows.map((row, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1 pr-2">
                    <input
                      className="input text-sm py-1"
                      value={row.label}
                      onChange={e => updateManual(i, 'label', e.target.value)}
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <NumInput value={row.hours}     onChange={v => updateManual(i, 'hours', v)} />
                  </td>
                  <td className="py-1 pr-2">
                    <NumInput value={row.materials} onChange={v => updateManual(i, 'materials', v)} />
                  </td>
                  <td className="py-1">
                    <NumInput value={row.subCost}   onChange={v => updateManual(i, 'subCost', v)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* GPMD summary bar */}
      <GpmdBar
        totalMat={calc.totalMat}
        totalHrs={calc.totalHrs}
        manDays={calc.manDays}
        laborCost={calc.laborCost}
        laborRatePerHour={laborRatePerHour}
        burden={calc.burden}
        gp={calc.gp}
        commission={calc.commission}
        subCost={calc.subCost}
        gpmd={gpmd}
        price={calc.price}
        subMarkupRate={subGpMarkupRate}
      />

      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="btn-secondary flex-1">← Back</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
          {saving ? 'Saving...' : 'Add Module'}
        </button>
      </div>
    </div>
  )
}
