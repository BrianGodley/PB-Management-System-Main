import { useState } from 'react'
import { createPortal } from 'react-dom'
import RateEditPopover from '../RateEditPopover'
import { formatUnit } from '../../lib/units'

// ─────────────────────────────────────────────────────────────────────────────
// ViewRatesModal — a single popup listing EVERY rate a module uses so the user
// can review them all in one place. Each row is editable (the edit control is
// forced visible regardless of the inline "In-Line Edit Rates" toggle).
//
// Layout: two side-by-side columns —
//   • LEFT  = In-House rates (labor coefficients + materials)
//   • RIGHT = Subcontractor rates
// An item is Subcontractor when it targets the subcontractor_rates table or is
// explicitly flagged `section: 'sub'`; everything else is In-House.
//
// `rates` is an array of groups OR flat rate items:
//   group: { group: 'Structural', items: [ rateItem, … ], hideKey? }
//   rateItem: { label, value, unitLabel, table, name, category, mode,
//               valueField, materialId, vendorId, section, hideKey? }
//
// Hide/unhide (opt-in): when `onToggleHide` is provided, each group and item
// with a `hideKey` gets a hide/show control; `hidden` is a Set of hidden keys.
// A "Show hidden" toggle reveals hidden rows (dimmed) so they can be restored.
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

function HideBtn({ hidden, onClick }) {
  return (
    <button
      onClick={onClick}
      title={hidden ? 'Show' : 'Hide'}
      className={`text-[11px] px-1.5 py-0.5 rounded ${
        hidden ? 'text-green-700 hover:bg-green-50' : 'text-gray-300 hover:text-gray-600 hover:bg-gray-100'
      }`}
    >
      {hidden ? 'show' : 'hide'}
    </button>
  )
}

function Row({ it, i, refreshAllRates, hidden, onToggleHide }) {
  return (
    <div key={i} className={`flex items-center gap-3 px-3 py-2 ${hidden ? 'opacity-50' : ''}`}>
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

function GroupBlock({ g, gi, plain, refreshAllRates, hiddenSet, onToggleHide }) {
  const isLabor = x => (x.section || (x.mode === 'coefficient' ? 'labor' : 'material')) === 'labor'
  const groupHidden = !!(g.hideKey && hiddenSet && hiddenSet.has(g.hideKey))
  let rows
  if (plain) {
    rows = g.items
  } else {
    const labor = g.items.filter(isLabor)
    const materials = g.items.filter(x => !isLabor(x))
    rows = [
      ...(labor.length ? [{ _header: 'Labor' }, ...labor] : []),
      ...(materials.length ? [{ _header: 'Materials' }, ...materials] : []),
    ]
  }
  return (
    <div key={gi} className="mb-3">
      {g.group && (
        <div className="flex items-center gap-2 mb-1">
          <p className={`text-[11px] font-semibold uppercase tracking-wide ${groupHidden ? 'text-gray-400' : 'text-gray-900'}`}>
            {g.group}
          </p>
          {onToggleHide && g.hideKey && <HideBtn hidden={groupHidden} onClick={() => onToggleHide(g.hideKey)} />}
        </div>
      )}
      <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
        {rows.map((it, i) =>
          it._header ? (
            <div
              key={`h-${i}`}
              className="px-3 py-1 bg-gray-100 text-[10px] font-semibold uppercase tracking-wide text-gray-500"
            >
              {it._header}
            </div>
          ) : (
            <Row
              key={i}
              it={it}
              i={i}
              refreshAllRates={refreshAllRates}
              hidden={!!(it.hideKey && hiddenSet && hiddenSet.has(it.hideKey))}
              onToggleHide={onToggleHide}
            />
          )
        )}
      </div>
    </div>
  )
}

function Column({ heading, groups, plain, refreshAllRates, hiddenSet, onToggleHide }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2 sticky top-0 bg-white pb-1">
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
            plain={plain}
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

  // Normalize to groups.
  const groups =
    Array.isArray(rates) && rates.length && rates[0] && rates[0].items ? rates : [{ group: '', items: rates }]

  const q = query.trim().toLowerCase()
  const isHidden = key => !!(key && hiddenSet.has(key))

  const filtered = groups
    // Drop fully-hidden groups unless we're showing hidden.
    .filter(g => showHidden || !isHidden(g.hideKey))
    .map(g => ({
      ...g,
      items: (g.items || [])
        .filter(it => !q || (it.label || '').toLowerCase().includes(q))
        .filter(it => showHidden || !isHidden(it.hideKey)),
    }))
    .filter(g => g.items.length)

  const inHouseGroups = filtered
    .map(g => ({ ...g, items: g.items.filter(it => !isSubItem(it)) }))
    .filter(g => g.items.length)
  const subGroups = filtered
    .map(g => ({ ...g, items: g.items.filter(isSubItem) }))
    .filter(g => g.items.length)

  const hiddenCount = hiddenSet.size

  return createPortal(
    <div className="fixed inset-0 z-[9998] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50 rounded-t-2xl">
          <h3 className="text-sm font-bold text-gray-900">{title} — All Rates</h3>
          <div className="flex items-center gap-3">
            {onToggleHide && hiddenCount > 0 && (
              <button
                onClick={() => setShowHidden(s => !s)}
                className="text-xs text-gray-500 hover:text-gray-800"
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
          {inHouseGroups.length === 0 && subGroups.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No rates.</p>
          ) : (
            <div className="grid grid-cols-2 gap-5">
              <Column
                heading="In-House Rates"
                groups={inHouseGroups}
                plain={false}
                refreshAllRates={refreshAllRates}
                hiddenSet={hiddenSet}
                onToggleHide={onToggleHide}
              />
              <Column
                heading="Subcontractor Rates"
                groups={subGroups}
                plain
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
