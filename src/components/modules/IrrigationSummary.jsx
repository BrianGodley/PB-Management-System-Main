// ─────────────────────────────────────────────────────────────────────────────
// IrrigationSummary — read-only detail view for a saved Irrigation module.
//
// Consumes the row-based catalog shape (ihData / subData holding zoneRows /
// timerRows / manualRows). Recomputes each row's material / labor from the saved
// rate + vendor-catalog snapshots so lines show Vendor · Item · qty · Material
// (+ hrs on In-House, flat $ on Sub). Falls back gracefully to legacy flat saves
// (top-level zoneQtys / zoneModes / timerQtys) so old estimates never crash.
// ─────────────────────────────────────────────────────────────────────────────

import FinancialSummaryList from './FinancialSummaryList'
import { resolveMaterialPrice } from '../../lib/materialCatalog'
import { ZONE_TYPES, computeZoneRow, makeBomPrice } from '../../lib/irrigationZones'

const TIMER_TYPES = [
  { key: 'timer4', label: '4 Station', matKey: 'Timer - 4 Station' },
  { key: 'timer6', label: '6 Station', matKey: 'Timer - 6 Station' },
  { key: 'timer9', label: '9 Station', matKey: 'Timer - 9 Station' },
  { key: 'timer12', label: '12 Station', matKey: 'Timer - 12 Station' },
  { key: 'timer15', label: '15 Station', matKey: 'Timer - 15 Station' },
  { key: 'timer18', label: '18 Station', matKey: 'Timer - 18 Station' },
  { key: 'timerICC8', label: 'Hunter ICC 8 Station', matKey: 'Timer - Hunter ICC 8 Station' },
  { key: 'timerAdd8', label: 'Additional 8 Station Module', matKey: 'Timer - Additional 8 Station Module' },
]

const TIMER_BY_KEY = Object.fromEntries(TIMER_TYPES.map(t => [t.key, t]))
const timerMeta = key => TIMER_BY_KEY[key] || TIMER_TYPES[0]

const n = v => parseFloat(v) || 0

const irrMatPrice = resolveMaterialPrice

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
      <span className={`text-xs flex-1 pr-2 ${highlight ? 'text-gray-800' : 'text-gray-600'}`}>
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

// Legacy flat save → zone/timer rows (for old estimates without ihData/zoneRows).
function legacyZoneRows(src) {
  const q = src.zoneQtys || {}
  const m = src.zoneModes || {}
  return ZONE_TYPES.map(z => ({ vendor: 'Standard', type: z.key, qty: q[z.key] ?? '', mode: m[z.key] || z.defaultMode }))
}
function legacyTimerRows(src) {
  const q = src.timerQtys || {}
  return TIMER_TYPES.map(t => ({ vendor: 'Standard', type: t.key, qty: q[t.key] ?? '' }))
}

export default function IrrigationSummary({ module }) {
  const data = module?.data || {}
  const isSub = data.subType === 'Subcontractor'
  const tab = isSub ? data.subData || {} : data.ihData || data
  const mp = data.materialPrices || {}
  const lr = data.laborRates || {}
  const materialRows = data.materialRows || []
  const vendorNames = data.vendorNames || {}
  const savedCalc = data.calc || {}

  const timerHrs = n(lr['Irrigation - Timer Install'])
  const bomPrice = makeBomPrice(materialRows, mp)

  const zoneRows = tab.zoneRows || legacyZoneRows(tab)
  const timerRows = tab.timerRows || legacyTimerRows(tab)
  const manualRows = tab.manualRows || []

  const fmt2 = v =>
    `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const fh = v => (v > 0 ? `${v.toFixed(2)} hrs` : null)
  const vendorLabel = v => (!v || v === 'Standard' ? 'Standard' : vendorNames[v] || 'Vendor')

  // Zone lines — assembly (per-zone labor hours + live BOM) via the shared calc.
  const zoneLines = (zoneRows || [])
    .filter(r => n(r.qty) > 0)
    .map((r, i) => {
      const c = computeZoneRow(r, lr, bomPrice)
      const material = isSub ? c.subMat : c.mat
      return {
        key: i,
        label: `${vendorLabel(r.vendor)} · ${c.z.label} × ${c.qty}`,
        value: material > 0 ? fmt2(material) : '—',
        sub: isSub ? `${fmt2(c.subEach)}/zone flat` : `${c.mode}${fh(c.hrs) ? ` · ${fh(c.hrs)}` : ''}`,
      }
    })

  // Timer lines
  const timerLines = (timerRows || [])
    .filter(r => n(r.qty) > 0)
    .map((r, i) => {
      const t = timerMeta(r.type)
      const qty = n(r.qty)
      const hrs = qty * timerHrs
      const unitPrice = irrMatPrice(t.matKey, r.vendor, materialRows, mp)
      const subEach = r.subEach !== '' && r.subEach != null ? n(r.subEach) : unitPrice
      const material = isSub ? qty * subEach : qty * unitPrice
      return {
        key: i,
        label: `${vendorLabel(r.vendor)} · ${t.label} × ${qty}`,
        value: material > 0 ? fmt2(material) : '—',
        sub: isSub ? `${fmt2(subEach)} per Each flat` : fh(hrs) || `${timerHrs} hrs per Each`,
      }
    })

  const manualLines = (manualRows || []).filter(
    r => n(r.hours) > 0 || n(r.materials) > 0 || n(r.subCost) > 0
  )

  // Financials from the saved calc snapshot.
  const totalHrs = n(savedCalc.totalHrs)
  const manDays = n(savedCalc.manDays) || n(module.man_days)
  const totalMat = n(savedCalc.totalMat) || n(module.material_cost)
  const laborRatePerHour = n(data.laborRatePerHour) || 35
  const laborCost = n(savedCalc.laborCost)
  const burden = n(savedCalc.burden)
  const gp = n(savedCalc.gp)
  const subGp = n(savedCalc.subGp)
  const commission = n(savedCalc.commission)
  const subCost = n(savedCalc.subCost)
  const priceTotal = n(savedCalc.price)

  const hasLines = zoneLines.length || timerLines.length || manualLines.length

  return (
    <div className="space-y-1 text-sm">
      {isSub && (
        <div className="flex flex-wrap gap-2 mb-1">
          <span className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded font-medium">
            Subcontractor
          </span>
        </div>
      )}

      {!hasLines ? (
        <p className="text-xs text-gray-400 text-center py-4">No line items entered.</p>
      ) : (
        <>
          {zoneLines.length > 0 && (
            <>
              <SectionLabel title="Irrigation Zones" />
              {zoneLines.map(l => (
                <LineRow key={l.key} label={l.label} value={l.value} sub={l.sub} />
              ))}
            </>
          )}

          {timerLines.length > 0 && (
            <>
              <SectionLabel title="Controllers / Timers" />
              {timerLines.map(l => (
                <LineRow key={l.key} label={l.label} value={l.value} sub={l.sub} />
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
