import { useState } from 'react'
import { createPortal } from 'react-dom'
import RateEditPopover from '../RateEditPopover'
import { formatUnit } from '../../lib/units'

// ─────────────────────────────────────────────────────────────────────────────
// ViewRatesModal — a single popup listing EVERY rate a module uses so the user
// can review them all in one place. Each row is editable (the edit control is
// forced visible regardless of the inline "In-Line Edit Rates" toggle).
//
// Layout: three side-by-side columns — Labor Rates · Materials Rates ·
// Subcontractor Rates. Under each, sub-categories (blue header) list their items.
//   • Labor    = labor coefficients (section 'labor' or mode 'coefficient')
//   • Materials = material prices (currency, In-House)
//   • Sub       = subcontractor_rates / section 'sub'
//
// `rates` is an array of groups OR flat rate items:
//   group: { group: 'Category · Subcategory', items: [ rateItem, … ], hideKey? }
//   rateItem: { label, value, unitLabel, table, name, category, mode,
//               valueField, materialId, vendorId, section, hideKey? }
//
// Hide/unhide (opt-in): when `onToggleHide` is provided, each group and item with
// a `hideKey` gets a hide/show control; `hidden` is a Set of hidden keys. A
// "Show hidden" toggle reveals hidden rows (dimmed) so they can be restored.
// ─────────────────────────────────────────────────────────────────────────────

function fmtVal(item) {
  const v = item.value
  if (v == null || v === '') return '—'
  const num = typeof v === 'number' ? v : parseFloat(v)
  if (Number.isNaN(num)) return String(v)
  const u = item.unitLabel ? formatUnit(item.unitLabel) : ''
  if (item.mode === 'coefficient') return `${num}${u ? ` ${u}` : ''}`
  return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${
    u ? ` per ${u}` : ''
  }`
}

const isSubItem = it => it.section === 'sub' || it.table === 'subcontractor_rates'
const isLaborItem = it => !isSubItem(it) && (it.section === 'labor' || it.mode === 'coefficient')
const isMaterialItem = it => !isSubItem(it) && !isLaborItem(it)

function HideBtn({ hidden, onClick }) {
  return (
    <button
      onClick={onClick}
      title={hidden ? 'Show' : 'Hide'}
      className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${
        hidden ? 'text-green-700 hover:bg-green-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
      }`}
    >
      {hidden ? 'show' : 'hide'}
    </button>
  )
}

function Row({ it, i, refreshAllRates, hidden, onToggleHide }) {
  return (
    <div key={i} className={`flex items-center gap-2 px-3 py-2 ${hidden ? 'opacity-50' : ''}`}>
      <span className="text-sm text-gray-700 flex-1 min-w-0">{it.label}</span>
      <span className="text-sm font-medium text-gray-900 tabular-nums whitespace-nowrap">{fmtVal(it)}</span>
      {onToggleHide && it.hideKey && <HideBtn hidden={hidden} onClick={() => onToggleHide(it.hideKey)} />}
      <RateEditPopover
        forceShow
        inlineMaterialPrice
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
  )
}

// One sub-category card: blue header + its items (no Labor/Materials sub-tags —
// the column already scopes the type).
function GroupBlock({ g, gi, refreshAllRates, hiddenSet, onToggleHide }) {
  const groupHidden = !!(g.hideKey && hiddenSet && hiddenSet.has(g.hideKey))
  return (
    <div key={gi} className="mb-3 rounded-lg border border-gray-200 overflow-hidden">
      {g.group && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border-b border-blue-100">
          <p className={`text-[11px] font-semibold uppercase tracking-wide flex-1 ${groupHidden ? 'text-gray-400' : 'text-gray-800'}`}>
            {g.group}
          </p>
          {onToggleHide && g.hideKey && <HideBtn hidden={groupHidden} onClick={() => onToggleHide(g.hideKey)} />}
        </div>
      )}
      <div className="divide-y divide-gray-100">
        {g.items.map((it, i) => (
          <Row
            key={i}
            it={it}
            i={i}
            refreshAllRates={refreshAllRates}
            hidden={!!(it.hideKey && hiddenSet && hiddenSet.has(it.hideKey))}
            onToggleHide={onToggleHide}
          />
        ))}
      </div>
    </div>
  )
}

function Column({ heading, groups, refreshAllRates, hiddenSet, onToggleHide }) {
  return (
    <div className="min-w-0">
      <p className="text-sm font-bold text-gray-900 text-center mb-2 sticky top-0 bg-white pb-1 border-b border-gray-100">
        {heading}
      </p>
      {groups.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">None.</p>
      ) : (
        groups.map((g, gi) => (
          <GroupBlock
            key={gi}
            g={g}
            gi={gi}
            refreshAllRates={refreshAllRates}
            hiddenSet={hiddenSet}
            onToggleHide={onToggleHide}
          />
        ))
      )}
    </div>
  )
}

export default function ViewRatesModal({
  title = 'Rates',
  rates = [],
  onClose,
  refreshAllRates,
  hidden = null,
  onToggleHide = null,
}) {
  const [query, setQuery] = useState('')
  const [showHidden, setShowHidden] = useState(false)
  const hiddenSet = hidden || new Set()

  const groups =
    Array.isArray(rates) && rates.length && rates[0] && rates[0].items ? rates : [{ group: '', items: rates }]

  const q = query.trim().toLowerCase()
  const isHidden = key => !!(key && hiddenSet.has(key))

  const filtered = groups
    .filter(g => showHidden || !isHidden(g.hideKey))
    .map(g => ({
      ...g,
      items: (g.items || [])
        .filter(it => !q || (it.label || '').toLowerCase().includes(q))
        .filter(it => showHidden || !isHidden(it.hideKey)),
    }))
    .filter(g => g.items.length)

  // Split each group's items into the three columns, keeping groups that have
  // items for that column.
  const columnGroups = filterFn =>
    filtered.map(g => ({ ...g, items: g.items.filter(filterFn) })).filter(g => g.items.length)
  const laborGroups = columnGroups(isLaborItem)
  const materialGroups = columnGroups(isMaterialItem)
  const subGroups = columnGroups(isSubItem)

  const hiddenCount = hiddenSet.size

  return createPortal(
    <div className="fixed inset-0 z-[9998] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full sm:max-w-[75rem] flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50 rounded-t-2xl">
          <h3 className="text-sm font-bold text-gray-900">{title} — All Rates</h3>
          <div className="flex items-center gap-3">
            {onToggleHide && hiddenCount > 0 && (
              <button
                onClick={() => setShowHidden(s => !s)}
                className="text-xs font-semibold text-gray-700 hover:text-gray-900"
              >
                {showHidden ? 'Hide hidden' : `Show hidden (${hiddenCount})`}
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-lg leading-none">
              ✕
            </button>
          </div>
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
          {laborGroups.length === 0 && materialGroups.length === 0 && subGroups.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No rates.</p>
          ) : (
            <div className="grid grid-cols-3 gap-5">
              <Column
                heading="Labor Rates"
                groups={laborGroups}
                refreshAllRates={refreshAllRates}
                hiddenSet={hiddenSet}
                onToggleHide={onToggleHide}
              />
              <Column
                heading="Materials Rates"
                groups={materialGroups}
                refreshAllRates={refreshAllRates}
                hiddenSet={hiddenSet}
                onToggleHide={onToggleHide}
              />
              <Column
                heading="Subcontractor Rates"
                groups={subGroups}
                refreshAllRates={refreshAllRates}
                hiddenSet={hiddenSet}
                onToggleHide={onToggleHide}
              />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
