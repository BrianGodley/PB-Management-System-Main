// ─────────────────────────────────────────────────────────────────────────────
// RateEditPopover — tiny calculator-icon button rendered next to a rate-driven
// cell in an estimate module. Clicking it pops a small editor over the rate's
// current value with an inline input + Save/Cancel. Saving upserts the row in
// the appropriate master-rates table and tells the caller via onSaved() so the
// caller can refresh its local price map and the cell re-renders with the new
// value.
//
// Props:
//   table         — 'material_rates' | 'labor_rates' | 'subcontractor_rates'
//   name          — the row's name column (e.g. '4" SDR 35 Pipe')
//   category      — used on insert if the rate doesn't exist yet (e.g. 'Drainage')
//   valueField    — column that stores the price (default 'unit_cost' for
//                   material_rates, 'rate' for labor_rates, etc.)
//   unitLabel     — short unit hint shown in the popover (e.g. 'LF', 'ea')
//   currentValue  — the value currently displayed in the cell
//   onSaved       — async () => void; the host should re-fetch its rate map
//
// Notes:
//   - The button is `text-gray-300 hover:text-green-700` so it stays out of
//     the way in dense module tables.
//   - The popover is absolutely positioned so it floats above the row; it
//     closes on outside click or Escape.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const DEFAULT_VALUE_FIELD = {
  material_rates:      'unit_cost',
  labor_rates:         'rate',
  subcontractor_rates: 'rate',
}

const SOURCE_LABEL = {
  material_rates:      'Master Rates → Materials',
  labor_rates:         'Master Rates → Labor',
  subcontractor_rates: 'Master Rates → Subcontractors',
}

const NAME_COLUMN = {
  material_rates:      'name',
  labor_rates:         'name',
  subcontractor_rates: 'company_name',
}

export default function RateEditPopover({
  table,
  name,
  category,
  valueField,
  unitLabel,
  currentValue,        // optional fallback if DB has no row yet
  onSaved,
  // 'currency' (default) → shows '$' prefix on the input.
  // 'coefficient'        → no prefix, shows unitLabel as a suffix inside
  //                        the input. Use for labor coefficients like
  //                        'min/cf' or 'hr/LF' where the value isn't dollars.
  mode = 'currency',
}) {
  const field    = valueField || DEFAULT_VALUE_FIELD[table] || 'unit_cost'
  const nameCol  = NAME_COLUMN[table] || 'name'
  const [open,    setOpen]    = useState(false)
  const [draft,   setDraft]   = useState('')
  const [loaded,  setLoaded]  = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const wrapRef   = useRef(null)

  // Whenever the popover opens, fetch the current rate from the DB so the
  // input reflects whatever is saved RIGHT NOW (not whatever stale value
  // the caller passed in). Falls back to currentValue if no row exists.
  useEffect(() => {
    if (!open) return
    setLoaded(false)
    setError('')
    let q = supabase.from(table).select(`${field}, id`).eq(nameCol, name)
    if (table === 'material_rates' && category) q = q.eq('category', category)
    q.limit(1).then(({ data, error: fetchErr }) => {
      if (fetchErr) { setError(fetchErr.message); setLoaded(true); return }
      if (data && data.length > 0) {
        setDraft(String(data[0][field] ?? ''))
      } else {
        setDraft(String(currentValue ?? ''))
      }
      setLoaded(true)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Close on outside click + Escape.
  useEffect(() => {
    if (!open) return
    function onDown(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    function onKey(e)  { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown',   onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown',   onKey)
    }
  }, [open])

  async function save() {
    const v = parseFloat(draft)
    if (!Number.isFinite(v) || v < 0) { setError('Enter a number ≥ 0'); return }
    setSaving(true)
    setError('')
    // Try to find an existing row by name (+ category for material_rates).
    let query = supabase.from(table).select('id').eq(nameCol, name)
    if (table === 'material_rates' && category) query = query.eq('category', category)
    const { data: matches } = await query.limit(1)
    if (matches && matches.length > 0) {
      const { error: upErr } = await supabase.from(table)
        .update({ [field]: v }).eq('id', matches[0].id)
      if (upErr) { setError(upErr.message); setSaving(false); return }
    } else {
      const insertRow = { [nameCol]: name, [field]: v }
      if (table === 'material_rates' && category) insertRow.category = category
      if (table === 'labor_rates')                 insertRow.category = category || 'General'
      const { error: insErr } = await supabase.from(table).insert(insertRow)
      if (insErr) { setError(insErr.message); setSaving(false); return }
    }
    setSaving(false)
    setOpen(false)
    if (onSaved) await onSaved()
  }

  return (
    <span ref={wrapRef} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        title={`Edit rate — ${name}`}
        className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 hover:border-green-500 transition-colors"
      >
        {/* Calculator icon — boxed in a small badge so it's easy to spot */}
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <line x1="8" y1="7" x2="16" y2="7" />
          <line x1="8" y1="11" x2="10" y2="11" />
          <line x1="13" y1="11" x2="16" y2="11" />
          <line x1="8" y1="15" x2="10" y2="15" />
          <line x1="13" y1="15" x2="16" y2="15" />
          <line x1="8" y1="19" x2="10" y2="19" />
          <line x1="13" y1="19" x2="16" y2="19" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute z-50 right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-xl p-3"
          onClick={e => e.stopPropagation()}
        >
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{SOURCE_LABEL[table] || 'Master Rates'}</p>
          <p className="text-sm font-semibold text-gray-800 truncate" title={name}>{name}</p>
          {category && <p className="text-[11px] text-gray-500 mb-2">Category: {category}</p>}
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
            {mode === 'coefficient'
              ? `Coefficient${unitLabel ? ` (${unitLabel})` : ''}`
              : `Rate${unitLabel ? ` ($/${unitLabel})` : ''}`}
          </label>
          {!loaded ? (
            <p className="text-xs text-gray-400 py-2">Loading current value…</p>
          ) : (
            <div className="relative">
              {mode === 'currency' && (
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">$</span>
              )}
              <input
                type="number" step="0.001" min="0" autoFocus
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') save() }}
                className={`input text-sm w-full ${mode === 'currency' ? 'pl-6' : 'pl-2.5'} ${mode === 'coefficient' && unitLabel ? 'pr-14' : ''}`}
              />
              {mode === 'coefficient' && unitLabel && (
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">{unitLabel}</span>
              )}
            </div>
          )}
          {error && <p className="text-[11px] text-red-600 mt-1.5">{error}</p>}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => { setDraft(String(currentValue ?? '')); setOpen(false) }}
              className="flex-1 px-2 py-1 rounded-md border border-gray-200 text-xs text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 px-2 py-1 rounded-md bg-green-700 text-white text-xs font-semibold hover:bg-green-800 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Rate'}
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-2 italic">
            Updates the master rate everywhere it's used.
          </p>
        </div>
      )}
    </span>
  )
}
