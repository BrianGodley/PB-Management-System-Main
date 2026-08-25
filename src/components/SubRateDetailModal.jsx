import { useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import PriceInput from './PriceInput'

// Detail modal for a Master Subcontractor Rates row — mirrors the Master Labor /
// Material detail modals: a view mode with labelled fields, an edit mode, Delete,
// and a Move/Copy action that can recategorize within subs OR relocate the rate
// to the labor or misc rate tables.
//   row  — a subcontractor_rates row (id, vendor_id, company_name, category,
//          sub_category, trade, item_key, unit, rate)
//   code — generated identity code shown in the header
//   subs — list of subs to choose from ({ id, company_name, divisions })
//   catOptions / subOptions / unitOptions — datalist suggestions for edit mode
export default function SubRateDetailModal({
  row,
  code,
  subs = [],
  category,
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
  const [showAll, setShowAll] = useState(false)
  // item_key (when present) is the estimator's stable reference — never edited
  // here. `trade` is the editable item description.
  const itemKey = row.item_key || ''
  const [form, setForm] = useState({
    category: row.category || '',
    sub_category: row.sub_category || '',
    trade: row.trade || '',
    unit: row.unit || '',
    rate: row.rate ?? '',
    vendorId: row.vendor_id || '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Subs whose trades (divisions) cover this rate's category — lenient match.
  const cat = (category || form.category || '').trim().toLowerCase()
  const coversCat = s =>
    !cat ||
    (s.divisions || []).some(d => {
      const x = (d || '').trim().toLowerCase()
      return x === cat || x.includes(cat) || cat.includes(x)
    })
  const matched = subs.filter(coversCat)
  const pickList = (showAll || matched.length === 0 ? subs : matched).slice()
  if (form.vendorId && !pickList.some(s => s.id === form.vendorId)) {
    const cur = subs.find(s => s.id === form.vendorId)
    if (cur) pickList.unshift(cur)
  }
  const filtering = !showAll && matched.length > 0 && matched.length < subs.length

  async function save() {
    setBusy(true)
    setErr('')
    const sub = subs.find(s => s.id === form.vendorId)
    const { error } = await supabase
      .from('subcontractor_rates')
      .update({
        category: form.category.trim() || null,
        sub_category: form.sub_category.trim() || null,
        trade: form.trade.trim() || null,
        unit: form.unit.trim() || null,
        rate: form.rate === '' ? null : Number(form.rate),
        vendor_id: form.vendorId || null,
        company_name: sub ? sub.company_name : null,
      })
      .eq('id', row.id)
    setBusy(false)
    if (error) return setErr(error.message)
    onSaved?.()
    onClose?.()
  }

  async function del() {
    setBusy(true)
    const { error } = await supabase.from('subcontractor_rates').delete().eq('id', row.id)
    setBusy(false)
    if (error) return setErr(error.message)
    onDeleted?.()
    onClose?.()
  }

  const companyName = subs.find(s => s.id === form.vendorId)?.company_name || row.company_name || 'Unassigned'
  const inputCls = 'w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white'

  return createPortal(
    <div className="fixed inset-0 z-[9998] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div>
            <p className="font-mono text-xs text-gray-500">{code}</p>
            <h3 className="text-sm font-bold text-gray-900">{form.trade || 'Subcontractor Rate'}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-lg leading-none">✕</button>
        </div>

        <div className="px-5 py-4 space-y-3 text-sm">
          {mode === 'view' ? (
            <>
              <Field label="Category" value={row.category || '—'} />
              <Field label="Sub-Category" value={row.sub_category || '—'} />
              <Field label="Subcontractor" value={companyName} />
              {itemKey && <Field label="Item (key)" value={itemKey} mono />}
              <Field label="Description" value={form.trade || '—'} />
              <Field label="Unit" value={form.unit || '—'} />
              <Field label="Unit Price" value={form.rate === '' || form.rate == null ? '—' : `$${form.rate}`} />
            </>
          ) : (
            <>
              <label className="block">
                <span className="text-xs text-gray-500">Category</span>
                <input className={inputCls} list="sub-cat-opts" value={form.category}
                  onChange={e => set('category', e.target.value)} />
                <datalist id="sub-cat-opts">{catOptions.map(c => <option key={c} value={c} />)}</datalist>
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">Sub-Category</span>
                <input className={inputCls} list="sub-sub-opts" value={form.sub_category}
                  onChange={e => set('sub_category', e.target.value)} />
                <datalist id="sub-sub-opts">{subOptions.map(s => <option key={s} value={s} />)}</datalist>
              </label>
              {itemKey && (
                <label className="block">
                  <span className="text-xs text-gray-500">Item (key) — locked</span>
                  <input className={`${inputCls} font-mono text-gray-400 bg-gray-50`} value={itemKey} disabled />
                  <span className="mt-0.5 block text-[11px] text-gray-400">The estimator's stable reference — renaming would break pricing.</span>
                </label>
              )}
              <label className="block">
                <span className="text-xs text-gray-500">Description</span>
                <input className={inputCls} value={form.trade} onChange={e => set('trade', e.target.value)}
                  placeholder="e.g. Flatwork Pour" />
              </label>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">Subcontractor</span>
                  {(filtering || showAll) && (
                    <button type="button" onClick={() => setShowAll(v => !v)} className="text-[11px] text-green-700 hover:underline">
                      {showAll ? `Only ${category || 'matching'} subs` : 'Show all subs'}
                    </button>
                  )}
                </div>
                <select className={inputCls} value={form.vendorId} onChange={e => set('vendorId', e.target.value)}>
                  <option value="">Unassigned</option>
                  {pickList.map(s => <option key={s.id} value={s.id}>{s.company_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-gray-500">Unit</span>
                  <input className={inputCls} list="sub-unit-opts" value={form.unit}
                    onChange={e => set('unit', e.target.value)} placeholder="e.g. Sq Ft, Each" />
                  <datalist id="sub-unit-opts">{unitOptions.map(u => <option key={u} value={u} />)}</datalist>
                </label>
                <label className="block">
                  <span className="text-xs text-gray-500">Unit Price</span>
                  <PriceInput className={inputCls} value={form.rate} onChange={v => set('rate', v)} />
                </label>
              </div>
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
              <button onClick={save} disabled={busy}
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
            <h4 className="font-bold text-gray-900 mb-1">Delete this subcontractor rate?</h4>
            <p className="text-sm text-gray-600 mb-4">This can't be undone.</p>
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
        <MoveCopySubBody
          mode={moveCopy}
          source={{ id: row.id, itemKey, trade: form.trade, category: form.category, sub_category: form.sub_category, unit: form.unit, rate: form.rate }}
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

// ── Move / Copy: recategorize within subs, or relocate to labor / misc ──
function MoveCopySubBody({ mode, source, catOptions = [], subOptions = [], onClose, onDone }) {
  const [dest, setDest] = useState('sub') // 'sub' | 'labor' | 'misc'
  const [category, setCategory] = useState(source.category || '')
  const [subCategory, setSubCategory] = useState(source.sub_category || '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const isCopy = mode === 'copy'
  // The estimator key for a relocated row: the frozen item_key, else the trade text.
  const keyName = source.itemKey || source.trade || 'Subcontractor Rate'

  async function submit() {
    setErr('')
    setSaving(true)
    try {
      const { data: srcRow } = await supabase.from('subcontractor_rates').select('tenant_id').eq('id', source.id).single()
      const tenant_id = srcRow?.tenant_id
      const rate = source.rate === '' || source.rate == null ? null : Number(source.rate)

      if (dest === 'sub') {
        if (isCopy) {
          const { error } = await supabase.from('subcontractor_rates').insert({
            tenant_id, item_key: source.itemKey || null, trade: source.trade ? `${source.trade} (copy)` : null,
            company_name: 'Unassigned', category: category.trim() || null, sub_category: subCategory.trim() || null,
            unit: source.unit || null, rate,
          })
          if (error) throw error
        } else {
          const { error } = await supabase.from('subcontractor_rates')
            .update({ category: category.trim() || null, sub_category: subCategory.trim() || null })
            .eq('id', source.id)
          if (error) throw error
        }
      } else if (dest === 'labor') {
        const { error } = await supabase.from('labor_rates').insert({
          tenant_id, name: keyName, label: source.trade || keyName,
          category: category.trim() || null, sub_category: subCategory.trim() || null,
          unit: source.unit || null, rate,
        })
        if (error) throw error
        if (!isCopy) {
          const { error: dErr } = await supabase.from('subcontractor_rates').delete().eq('id', source.id)
          if (dErr) throw dErr
        }
      } else if (dest === 'misc') {
        const { error } = await supabase.from('misc_rates').insert({
          tenant_id, name: keyName, label: source.trade || keyName,
          category: category.trim() || null, rate, unit: source.unit || null,
        })
        if (error) throw error
        if (!isCopy) {
          const { error: dErr } = await supabase.from('subcontractor_rates').delete().eq('id', source.id)
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
          <h3 className="text-sm font-bold text-gray-900">{isCopy ? 'Copy' : 'Move'} subcontractor rate</h3>
          <p className="text-xs text-gray-500 font-mono mt-0.5">{keyName}</p>
        </div>
        <div className="px-5 py-4 space-y-3 text-sm">
          <label className="block">
            <span className="text-xs text-gray-500">Destination table</span>
            <select className={inputCls} value={dest} onChange={e => setDest(e.target.value)}>
              <option value="sub">Subcontractor (recategorize)</option>
              <option value="labor">Labor rates</option>
              <option value="misc">Misc rates</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">Category</span>
            <input className={inputCls} list="mcs-cat" value={category} onChange={e => setCategory(e.target.value)} />
            <datalist id="mcs-cat">{catOptions.map(c => <option key={c} value={c} />)}</datalist>
          </label>
          {dest !== 'misc' && (
            <label className="block">
              <span className="text-xs text-gray-500">Sub-Category</span>
              <input className={inputCls} list="mcs-sub" value={subCategory} onChange={e => setSubCategory(e.target.value)} />
              <datalist id="mcs-sub">{subOptions.map(s => <option key={s} value={s} />)}</datalist>
            </label>
          )}
          <p className="text-[11px] text-gray-400">
            {dest === 'sub'
              ? isCopy ? 'Creates a copy in subcontractor rates (description suffixed “(copy)”).' : 'Recategorizes this rate in place.'
              : isCopy ? `Copies this rate into ${dest} rates (original stays).`
                       : `Moves this rate into ${dest} rates and removes the subcontractor row.`}
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
