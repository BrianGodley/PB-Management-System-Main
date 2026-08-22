import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'

// Detail modal for a Master Labor Rates row — mirrors the Master Material Rates
// detail modal: a view mode with labelled fields, an edit mode, Delete, and a
// Move/Copy action that can recategorize within labor OR relocate the rate to
// the misc or subcontractor rate tables.
//   row         — a labor_rates row (id, category, sub_category, name, label, notes, unit, rate)
//   code        — generated identity code shown in the header
//   catOptions  — category suggestions (strings)
//   subOptions  — sub-category suggestions (strings)
//   unitOptions — unit suggestions (strings)
export default function LaborRateDetailModal({
  row,
  code,
  catOptions = [],
  subOptions = [],
  unitOptions = [],
  onClose,
  onSaved,
  onDeleted,
}) {
  const [mode, setMode] = useState('view') // 'view' | 'edit'
  const [moveCopy, setMoveCopy] = useState(null) // 'move' | 'copy'
  const [confirmDel, setConfirmDel] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  // `name` is the immutable KEY the estimator modules reference — never edited
  // here (renaming it would break pricing). `label` is the editable display.
  const name = row.name || ''
  const [form, setForm] = useState({
    category: row.category || '',
    sub_category: row.sub_category || '',
    label: row.label || row.name || '',
    notes: row.notes || '',
    unit: row.unit || '',
    rate: row.rate ?? '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    if (!form.label.trim()) {
      setErr('Description is required.')
      return
    }
    setBusy(true)
    setErr('')
    // `name` (the key) is intentionally NOT written — it stays frozen so the
    // estimator modules keep resolving this rate. Only `label` is editable.
    const { error } = await supabase
      .from('labor_rates')
      .update({
        category: form.category.trim() || null,
        sub_category: form.sub_category.trim() || null,
        label: form.label.trim(),
        notes: form.notes.trim() || null,
        unit: form.unit.trim() || null,
        rate: form.rate === '' ? null : Number(form.rate),
      })
      .eq('id', row.id)
    setBusy(false)
    if (error) return setErr(error.message)
    onSaved?.()
    onClose?.()
  }

  async function del() {
    setBusy(true)
    const { error } = await supabase.from('labor_rates').delete().eq('id', row.id)
    setBusy(false)
    if (error) return setErr(error.message)
    onDeleted?.()
    onClose?.()
  }

  const inputCls = 'w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white'

  return createPortal(
    <div className="fixed inset-0 z-[9998] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div>
            <p className="font-mono text-xs text-gray-500">{code}</p>
            <h3 className="text-sm font-bold text-gray-900">{name}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-lg leading-none">✕</button>
        </div>

        <div className="px-5 py-4 space-y-3 text-sm">
          {mode === 'view' ? (
            <>
              <Field label="Category" value={row.category || '—'} />
              <Field label="Sub-Category" value={row.sub_category || '—'} />
              <Field label="Item (name / key)" value={name} mono />
              <Field label="Description" value={form.label || '—'} />
              <Field label="Unit" value={form.unit || '—'} />
              <Field label="Rate" value={form.rate === '' || form.rate == null ? '—' : String(form.rate)} />
              {form.notes && <Field label="Notes" value={form.notes} />}
            </>
          ) : (
            <>
              <label className="block">
                <span className="text-xs text-gray-500">Category</span>
                <input className={inputCls} list="labor-cat-opts" value={form.category}
                  onChange={e => set('category', e.target.value)} />
                <datalist id="labor-cat-opts">{catOptions.map(c => <option key={c} value={c} />)}</datalist>
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">Sub-Category</span>
                <input className={inputCls} list="labor-sub-opts" value={form.sub_category}
                  onChange={e => set('sub_category', e.target.value)} />
                <datalist id="labor-sub-opts">{subOptions.map(s => <option key={s} value={s} />)}</datalist>
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">Item (name / key) — locked</span>
                <input className={`${inputCls} font-mono text-gray-400 bg-gray-50`} value={name} disabled />
                <span className="mt-0.5 block text-[11px] text-gray-400">The estimator's stable reference — renaming would break pricing.</span>
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">Description</span>
                <input className={inputCls} value={form.label} onChange={e => set('label', e.target.value)} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-gray-500">Unit</span>
                  <input className={inputCls} list="labor-unit-opts" value={form.unit}
                    onChange={e => set('unit', e.target.value)} placeholder="e.g. Cu Yd, Sq Ft, Each" />
                  <datalist id="labor-unit-opts">{unitOptions.map(u => <option key={u} value={u} />)}</datalist>
                </label>
                <label className="block">
                  <span className="text-xs text-gray-500">Rate</span>
                  <input type="number" step="0.0001" className={inputCls} value={form.rate}
                    onChange={e => set('rate', e.target.value)} />
                </label>
              </div>
              <label className="block">
                <span className="text-xs text-gray-500">Notes</span>
                <input className={inputCls} value={form.notes} onChange={e => set('notes', e.target.value)} />
              </label>
            </>
          )}
        </div>

        {err && <div className="px-5 py-2 text-xs text-red-600 bg-red-50 border-t border-red-100">{err}</div>}

        <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          {mode === 'view' ? (
            <>
              <button onClick={() => setConfirmDel(true)} className="text-sm text-red-600 hover:text-red-800 font-medium">Delete</button>
              <div className="flex gap-2">
                <button onClick={onClose} className="text-sm text-gray-500 px-3 py-1.5">Close</button>
                <button onClick={() => setMoveCopy('copy')} className="text-sm border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg font-medium hover:bg-gray-100">Copy</button>
                <button onClick={() => setMoveCopy('move')} className="text-sm border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg font-medium hover:bg-gray-100">Move</button>
                <button onClick={() => setMode('edit')} className="text-sm bg-green-700 text-white px-4 py-1.5 rounded-lg font-semibold">Edit</button>
              </div>
            </>
          ) : (
            <>
              <button onClick={() => { setMode('view'); setErr('') }} className="text-sm text-gray-500 px-3 py-1.5">Cancel</button>
              <button onClick={save} disabled={busy || !form.label.trim()}
                className="text-sm bg-green-700 text-white px-4 py-1.5 rounded-lg font-semibold disabled:opacity-50">
                {busy ? 'Saving…' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>

      {confirmDel && (
        <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-4" onClick={() => setConfirmDel(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <h4 className="font-bold text-gray-900 mb-1">Delete this labor rate?</h4>
            <p className="text-sm text-gray-600 mb-4">This can't be undone. If a module references this rate by name, its pricing will surface the unpriced fix-it prompt.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDel(false)} className="text-sm text-gray-500 px-3 py-1.5">Cancel</button>
              <button onClick={del} disabled={busy} className="text-sm bg-red-600 text-white px-4 py-1.5 rounded-lg font-semibold disabled:opacity-50">
                {busy ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {moveCopy && (
        <MoveCopyLaborBody
          mode={moveCopy}
          source={{ id: row.id, name, label: form.label, category: form.category, sub_category: form.sub_category, unit: form.unit, rate: form.rate }}
          catOptions={catOptions}
          subOptions={subOptions}
          onClose={() => setMoveCopy(null)}
          onDone={() => { setMoveCopy(null); onSaved?.(); onClose?.() }}
        />
      )}
    </div>,
    document.body
  )
}

function Field({ label, value, mono }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className={`text-sm text-gray-900 text-right ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  )
}

// ── Move / Copy: recategorize within labor, or relocate to misc / subcontractor ──
function MoveCopyLaborBody({ mode, source, catOptions = [], subOptions = [], onClose, onDone }) {
  const [dest, setDest] = useState('labor') // 'labor' | 'misc' | 'sub'
  const [category, setCategory] = useState(source.category || '')
  const [subCategory, setSubCategory] = useState(source.sub_category || '')
  const [company, setCompany] = useState('Unassigned')
  const [vendors, setVendors] = useState([])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const isCopy = mode === 'copy'

  useEffect(() => {
    supabase.from('subs_vendors').select('company_name').then(({ data }) =>
      setVendors((data || []).map(v => v.company_name).filter(Boolean).sort((a, b) => a.localeCompare(b))))
  }, [])

  async function submit() {
    setErr('')
    setSaving(true)
    try {
      // tenant_id from the source row so inserts satisfy RLS.
      const { data: srcRow } = await supabase.from('labor_rates').select('tenant_id').eq('id', source.id).single()
      const tenant_id = srcRow?.tenant_id
      const rate = source.rate === '' || source.rate == null ? null : Number(source.rate)

      if (dest === 'labor') {
        if (isCopy) {
          const { error } = await supabase.from('labor_rates').insert({
            tenant_id, name: `${source.name} (copy)`, label: source.label || source.name,
            category: category.trim() || null, sub_category: subCategory.trim() || null,
            unit: source.unit || null, rate,
          })
          if (error) throw error
        } else {
          const { error } = await supabase.from('labor_rates')
            .update({ category: category.trim() || null, sub_category: subCategory.trim() || null })
            .eq('id', source.id)
          if (error) throw error
        }
      } else if (dest === 'misc') {
        const { error } = await supabase.from('misc_rates').insert({
          tenant_id, name: source.name, label: source.label || source.name,
          category: category.trim() || null, rate, unit: source.unit || null,
        })
        if (error) throw error
        if (!isCopy) {
          const { error: dErr } = await supabase.from('labor_rates').delete().eq('id', source.id)
          if (dErr) throw dErr
        }
      } else if (dest === 'sub') {
        const { error } = await supabase.from('subcontractor_rates').insert({
          tenant_id, item_key: source.name, company_name: company || 'Unassigned',
          category: category.trim() || null, sub_category: subCategory.trim() || null,
          rate, unit: source.unit || null,
        })
        if (error) throw error
        if (!isCopy) {
          const { error: dErr } = await supabase.from('labor_rates').delete().eq('id', source.id)
          if (dErr) throw dErr
        }
      }
      onDone?.()
    } catch (e) {
      setErr(e.message || String(e))
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white'
  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-bold text-gray-900">{isCopy ? 'Copy' : 'Move'} labor rate</h3>
          <p className="text-xs text-gray-500 font-mono mt-0.5">{source.name}</p>
        </div>
        <div className="px-5 py-4 space-y-3 text-sm">
          <label className="block">
            <span className="text-xs text-gray-500">Destination table</span>
            <select className={inputCls} value={dest} onChange={e => setDest(e.target.value)}>
              <option value="labor">Labor (recategorize)</option>
              <option value="misc">Misc rates</option>
              <option value="sub">Subcontractor rates</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">Category</span>
            <input className={inputCls} list="mc-cat" value={category} onChange={e => setCategory(e.target.value)} />
            <datalist id="mc-cat">{catOptions.map(c => <option key={c} value={c} />)}</datalist>
          </label>
          {dest !== 'misc' && (
            <label className="block">
              <span className="text-xs text-gray-500">Sub-Category</span>
              <input className={inputCls} list="mc-sub" value={subCategory} onChange={e => setSubCategory(e.target.value)} />
              <datalist id="mc-sub">{subOptions.map(s => <option key={s} value={s} />)}</datalist>
            </label>
          )}
          {dest === 'sub' && (
            <label className="block">
              <span className="text-xs text-gray-500">Subcontractor</span>
              <input className={inputCls} list="mc-vendor" value={company} onChange={e => setCompany(e.target.value)} />
              <datalist id="mc-vendor">{vendors.map(v => <option key={v} value={v} />)}</datalist>
            </label>
          )}
          <p className="text-[11px] text-gray-400">
            {dest === 'labor'
              ? isCopy ? 'Creates a copy in labor rates (name suffixed “(copy)”).' : 'Recategorizes this rate in place.'
              : isCopy ? `Copies this rate into ${dest === 'misc' ? 'misc' : 'subcontractor'} rates (original stays).`
                       : `Moves this rate into ${dest === 'misc' ? 'misc' : 'subcontractor'} rates and removes the labor row.`}
          </p>
        </div>
        {err && <div className="px-5 py-2 text-xs text-red-600 bg-red-50 border-t border-red-100">{err}</div>}
        <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-end gap-2 bg-gray-50">
          <button onClick={onClose} className="text-sm text-gray-500 px-3 py-1.5">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="text-sm bg-green-700 text-white px-4 py-1.5 rounded-lg font-semibold disabled:opacity-50">
            {saving ? 'Working…' : isCopy ? 'Copy' : 'Move'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
