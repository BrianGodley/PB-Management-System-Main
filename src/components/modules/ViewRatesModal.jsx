import { useState } from 'react'
import { createPortal } from 'react-dom'
import RateEditPopover from '../RateEditPopover'

// ─────────────────────────────────────────────────────────────────────────────
// ViewRatesModal — a single popup listing EVERY rate a module uses so the user
// can review them all in one place. Each row is editable (the edit control is
// forced visible regardless of the inline "In-Line Edit Rates" toggle).
//
// `rates` is an array of groups OR flat rate items:
//   group: { group: 'Structural', items: [ rateItem, … ] }
//   rateItem: {
//     label, value, unitLabel,
//     table, name, category, mode, valueField, materialId, vendorId
//   }
// A flat array of rateItems is also accepted (rendered ungrouped).
// ─────────────────────────────────────────────────────────────────────────────

function fmtVal(item) {
  const v = item.value
  if (v == null || v === '') return '—'
  const num = typeof v === 'number' ? v : parseFloat(v)
  if (Number.isNaN(num)) return String(v)
  // Coefficients aren't dollars; currency gets a $ and 2 decimals.
  if (item.mode === 'coefficient') return `${num}${item.unitLabel ? ` ${item.unitLabel}` : ''}`
  return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${
    item.unitLabel ? `/${item.unitLabel}` : ''
  }`
}

export default function ViewRatesModal({ title = 'Rates', rates = [], onClose, refreshAllRates }) {
  const [query, setQuery] = useState('')
  // Normalize to groups.
  const groups = Array.isArray(rates) && rates.length && rates[0] && rates[0].items
    ? rates
    : [{ group: '', items: rates }]

  const q = query.trim().toLowerCase()
  const filtered = groups
    .map(g => ({
      ...g,
      items: (g.items || []).filter(it => !q || (it.label || '').toLowerCase().includes(q)),
    }))
    .filter(g => g.items.length)

  return createPortal(
    <div
      className="fixed inset-0 z-[9998] bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50 rounded-t-2xl">
          <h3 className="text-sm font-bold text-gray-900">{title} — All Rates</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-lg leading-none">
            ✕
          </button>
        </div>
        <div className="px-5 pt-3">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Filter rates…"
            className="input text-sm w-full mb-2"
          />
        </div>
        <div className="px-5 pb-4 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No rates.</p>
          ) : (
            filtered.map((g, gi) => (
              <div key={gi} className="mb-3">
                {g.group && (
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
                    {g.group}
                  </p>
                )}
                <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
                  {(() => {
                    const hasLabor = g.items.some(x => x.mode === 'coefficient')
                    const hasMaterial = g.items.some(x => x.mode !== 'coefficient')
                    const split = hasLabor && hasMaterial
                    return g.items.map((it, i) => {
                      // In a group that has both, label the Materials and Labor parts.
                      const materialStart =
                        split &&
                        it.mode !== 'coefficient' &&
                        (i === 0 || g.items[i - 1].mode === 'coefficient')
                      const labelStart =
                        it.mode === 'coefficient' && i > 0 && g.items[i - 1].mode !== 'coefficient'
                      return (
                      <div key={i}>
                        {materialStart && (
                          <div className="px-3 py-1 bg-gray-100 text-[10px] font-semibold uppercase tracking-wide text-gray-500 border-t border-gray-300">
                            Materials
                          </div>
                        )}
                        {labelStart && (
                          <div className="px-3 py-1 bg-gray-100 text-[10px] font-semibold uppercase tracking-wide text-gray-500 border-t border-gray-300">
                            Labor
                          </div>
                        )}
                        <div className="flex items-center gap-3 px-3 py-2">
                          <span className="text-sm text-gray-700 flex-1 min-w-0">{it.label}</span>
                          <span className="text-sm font-medium text-gray-900 tabular-nums whitespace-nowrap">
                            {fmtVal(it)}
                          </span>
                          <RateEditPopover
                            forceShow
                            table={it.table}
                            name={it.name}
                            category={it.category}
                            valueField={it.valueField}
                            unitLabel={it.unitLabel}
                            mode={it.mode}
                            currentValue={it.value}
                            materialId={it.materialId}
                            vendorId={it.vendorId}
                            onSaved={refreshAllRates}
                          />
                        </div>
                      </div>
                      )
                    })
                  })()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
