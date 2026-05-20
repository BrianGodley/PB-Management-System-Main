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
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import { useRateIcons } from '../contexts/RateIconsContext'

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
  const { showRateIcons } = useRateIcons()
  const [open,    setOpen]    = useState(false)
  const [draft,   setDraft]   = useState('')
  const [loaded,  setLoaded]  = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  // Sticky confirmation message that appears in the popover after a
  // successful save. Kept separate from `error` so the user clearly sees
  // SUCCESS vs FAILURE before the popover closes.
  const [saveMsg, setSaveMsg] = useState('')
  const wrapRef   = useRef(null)

  // Whenever the popover opens, fetch the current rate from the DB so the
  // input reflects whatever is saved RIGHT NOW (not whatever stale value
  // the caller passed in). Falls back to currentValue if no row exists.
  useEffect(() => {
    if (!open) return
    setLoaded(false)
    setError('')
    setSaveMsg('')
    let q = supabase.from(table).select(`${field}, id`).eq(nameCol, name)
    // Filter by category on every table that has one (material_rates,
    // labor_rates, subcontractor_rates). The previous code only did this
    // for material_rates, so a labor_rates save could update a same-named
    // row in a DIFFERENT category and the module's refresh would miss it.
    if (category) q = q.eq('category', category)
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

  // Close on Escape only. (Outside-click closing is handled inside the
  // portal by the backdrop's onMouseDown — see the modal JSX below.)
  // Previously we ran a document-level mousedown listener that checked
  // `wrapRef.contains(e.target)`, but the modal is portal-mounted to
  // document.body so wrapRef never contains it — every click inside the
  // modal (including Save) registered as "outside" and auto-closed the
  // popover before the saveMsg banner could render.
  useEffect(() => {
    if (!open) return
    function onKey(e) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  async function save() {
    const v = parseFloat(draft)
    if (!Number.isFinite(v) || v < 0) {
      setError('Enter a number ≥ 0'); return
    }
    setSaving(true)
    setError('')
    setSaveMsg('')

    // Three-step save that self-heals when a same-named row already lives
    // in a DIFFERENT category (a common leftover from earlier seeding).
    // Without the self-heal, the in-category UPDATE finds nothing → INSERT
    // → UNIQUE-name constraint fails or two rows compete → the module's
    // category-scoped refreshAllRates never sees the change.
    try {
      // Step 1 — try to find a row in the caller's category.
      let q1 = supabase.from(table).select('id').eq(nameCol, name)
      if (category) q1 = q1.eq('category', category)
      const { data: inCat, error: selErr } = await q1.limit(1)
      if (selErr) throw new Error('Lookup failed: ' + selErr.message)

      if (inCat && inCat.length > 0) {
        // ── 1a. UPDATE every in-category row matching this name. Targeting
        // by (name, category) instead of (id) means any historical
        // duplicates all get the same new value — so the popover and the
        // module's refreshAllRates can't disagree based on which dupe gets
        // returned first. .select() so we can detect silent zero-row writes.
        let upQ = supabase.from(table).update({ [field]: v }).eq(nameCol, name)
        if (category) upQ = upQ.eq('category', category)
        const { data: upRows, error: upErr } = await upQ.select()
        if (upErr) throw new Error('Save failed: ' + upErr.message)
        if (!upRows || upRows.length === 0) {
          throw new Error('Save returned 0 rows — RLS likely blocked the write. Check Supabase Auth + your user role.')
        }
      } else {
        // Step 2 — fall back to a name-only lookup. If a wrong-category row
        // exists, UPDATE it AND reassign category so future category-scoped
        // refreshes find it. If still nothing, INSERT a fresh row.
        const { data: anyRow, error: anySelErr } = await supabase.from(table)
          .select('id, category').eq(nameCol, name).limit(1)
        if (anySelErr) throw new Error('Lookup failed: ' + anySelErr.message)

        if (anyRow && anyRow.length > 0) {
          const update = { [field]: v }
          if (category) update.category = category
          const { data: reRows, error: reErr } = await supabase.from(table)
            .update(update).eq('id', anyRow[0].id).select()
          if (reErr) throw new Error('Save failed: ' + reErr.message)
          if (!reRows || reRows.length === 0) {
            throw new Error('Save returned 0 rows — RLS likely blocked the write.')
          }
        } else {
          // Step 3 — no row at all → INSERT.
          const insertRow = { [nameCol]: name, [field]: v }
          if (category)                          insertRow.category = category
          else if (table === 'labor_rates')      insertRow.category = 'General'
          const { data: insRows, error: insErr } = await supabase.from(table).insert(insertRow).select()
          if (insErr) throw new Error('Save failed: ' + insErr.message)
          if (!insRows || insRows.length === 0) {
            throw new Error('Insert returned 0 rows — RLS likely blocked the write.')
          }
        }
      }
    } catch (e) {
      setError(e?.message || 'Save failed.')
      setSaving(false)
      return
    }

    // Success — show inline confirmation, refresh parent, then auto-close
    // after a short delay so the user sees what was saved.
    setSaving(false)
    const display = mode === 'currency'
      ? `$${v.toLocaleString(undefined, { maximumFractionDigits: 4 })}`
      : `${v}${unitLabel ? ' ' + unitLabel : ''}`
    setSaveMsg(`Saved! New rate: ${display}`)
    if (onSaved) {
      try { await onSaved() } catch { /* non-fatal */ }
    }
    // Stay open with the confirmation banner visible until the user closes
    // the popover manually (Cancel button, X, Escape, or backdrop click).
  }

  // Global toggle — when "Access/Edit Rates" is OFF, render nothing.
  // The user flips it via the button in the GpmdBar at the top of each module.
  if (!showRateIcons) return null

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

      {open && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          style={{ pointerEvents: 'auto' }}
          onMouseDown={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div
            className="bg-white border border-gray-200 rounded-xl shadow-2xl w-full max-w-sm p-5 relative z-[10000]"
            style={{ pointerEvents: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            {saveMsg ? (
              // ─── SUCCESS STATE — minimal confirmation + a single Close. ───
              // Hides the rate input and the green Save button entirely so
              // there's no ambiguity about whether the save committed.
              <>
                <div className="flex items-start justify-between mb-4">
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xl flex-shrink-0">✓</div>
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-gray-900 leading-tight">Rate updated</p>
                      <p className="text-xs text-gray-500 mt-0.5">{SOURCE_LABEL[table] || 'Master Rates'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="text-gray-300 hover:text-gray-600 text-xl leading-none p-1 -mt-1 flex-shrink-0"
                    title="Close"
                  >×</button>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1.5 mb-5">
                  <p className="text-sm text-gray-800 font-medium" title={name}>{name}</p>
                  {category && <p className="text-[11px] text-gray-500">Category: {category}</p>}
                  <p className="text-sm text-gray-700">
                    New {mode === 'coefficient' ? 'coefficient' : 'rate'}:{' '}
                    <strong className="text-green-800">
                      {saveMsg.replace(/^Saved! New rate:\s*/, '')}
                    </strong>
                  </p>
                </div>

                <button
                  onClick={() => setOpen(false)}
                  className="w-full py-2 rounded-lg bg-green-700 text-white text-sm font-semibold hover:bg-green-800"
                >
                  Close
                </button>
              </>
            ) : (
              // ─── EDIT STATE — original input + Cancel/Save row. ───
              <>
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{SOURCE_LABEL[table] || 'Master Rates'}</p>
                    <p className="text-base font-semibold text-gray-900 leading-tight" title={name}>{name}</p>
                    {category && <p className="text-xs text-gray-500 mt-0.5">Category: {category}</p>}
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="text-gray-300 hover:text-gray-600 text-xl leading-none p-1 -mt-1 flex-shrink-0"
                    title="Close"
                  >×</button>
                </div>

                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  {mode === 'coefficient'
                    ? `Coefficient${unitLabel ? ` (${unitLabel})` : ''}`
                    : `Rate${unitLabel ? ` ($/${unitLabel})` : ''}`}
                </label>
                {!loaded ? (
                  <p className="text-sm text-gray-400 py-3">Loading current value…</p>
                ) : (
                  <div className="relative">
                    {mode === 'currency' && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">$</span>
                    )}
                    <input
                      type="number" step="0.001" min="0" autoFocus
                      value={draft}
                      onChange={e => setDraft(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') save() }}
                      className={`input text-base w-full ${mode === 'currency' ? 'pl-7' : 'pl-3'} ${mode === 'coefficient' && unitLabel ? 'pr-16' : ''}`}
                    />
                    {mode === 'coefficient' && unitLabel && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">{unitLabel}</span>
                    )}
                  </div>
                )}
                {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

                <div className="flex gap-2 mt-5">
                  <button
                    onClick={() => setOpen(false)}
                    className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onMouseDown={e => {
                      e.preventDefault()
                      if (!saving && loaded) save()
                    }}
                    onPointerDown={e => {
                      e.preventDefault()
                      if (!saving && loaded) save()
                    }}
                    onClick={() => {
                      if (!saving && loaded) save()
                    }}
                    disabled={saving || !loaded}
                    className="flex-1 py-2 rounded-lg bg-green-700 text-white text-sm font-semibold hover:bg-green-800 disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </>
            )}

            <p className="text-[11px] text-gray-400 mt-3 italic text-center">
              Updates the master rate everywhere it's used.
            </p>
          </div>
        </div>,
        document.body
      )}
    </span>
  )
}
