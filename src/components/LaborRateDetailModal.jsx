import { useState } from 'react'
import { supabase } from '../lib/supabase'

// Detail modal for a Master Labor Rates row — mirrors the material detail modal
// theme. Edit the row's category, sub-category, item, description, unit and rate,
// or delete it.
//   row         — a labor_rates row (id, category, sub_category, name, notes, unit, rate)
//   code        — generated identity code shown in the header
//   catOptions  — category dropdown options (strings)
//   subOptions  — sub-category suggestions (strings) shown in a datalist
//   unitOptions — unit dropdown options (strings)
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
  const [category, setCategory] = useState(row.category || '')
  const [subCategory, setSubCategory] = useState(row.sub_category || '')
  const [name, setName] = useState(row.name || '')
  const [notes, setNotes] = useState(row.notes || '')
  const [unit, setUnit] = useState(row.unit || '')
  const [rate, setRate] = useState(row.rate ?? '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    if (!name.trim()) {
      setErr('Item name is required.')
      return
    }
    setSaving(true)
    setErr('')
    const { error } = await supabase
      .from('labor_rates')
      .update({
        category: category.trim() || null,
        sub_category: subCategory.trim() || null,
        name: name.trim(),
        notes: notes.trim() || null,
        unit: unit.trim() || null,
        rate: rate === '' ? null : Number(rate),
      })
      .eq('id', row.id)
    setSaving(false)
    if (error) {
      setErr(error.message)
      return
    }
    onSaved?.()
    onClose?.()
  }

  async function del() {
    if (!confirm('Delete this labor rate? This cannot be undone.')) return
    const { error } = await supabase.from('labor_rates').delete().eq('id', row.id)
    if (error) {
      setErr(error.message)
      return
    }
    onDeleted?.()
    onClose?.()
  }

  const field = 'w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white'
  const label = 'block text-xs font-medium text-gray-600 mb-1'
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md p-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <div>
            <h3 className="text-sm font-bold text-gray-800">{name || 'Labor Rate'}</h3>
            {code && <span className="font-mono text-xs text-gray-400">{code}</span>}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Category</label>
            <select className={field} value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">—</option>
              {catOptions.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Sub-Category</label>
            <input
              className={field}
              list="labor-subcat-options"
              value={subCategory}
              onChange={e => setSubCategory(e.target.value)}
              placeholder="describe…"
            />
            <datalist id="labor-subcat-options">
              {subOptions.map(s => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="mt-3">
          <label className={label}>Item</label>
          <input
            className={field}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Demo - Tree Small"
          />
        </div>

        <div className="mt-3">
          <label className={label}>Labor Description</label>
          <input
            className={field}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Optional notes"
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Unit</label>
            <select className={field} value={unit} onChange={e => setUnit(e.target.value)}>
              <option value="">—</option>
              {unitOptions.map(u => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Rate</label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                $
              </span>
              <input
                type="number"
                step="0.0001"
                value={rate}
                onChange={e => setRate(e.target.value)}
                className={`${field} pl-5`}
              />
            </div>
          </div>
        </div>

        {err && <div className="mt-3 text-xs text-red-600">{err}</div>}

        <div className="flex items-center gap-2 mt-5">
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 bg-gray-900 text-white py-2 rounded-lg text-sm font-semibold hover:bg-gray-700 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={del}
            className="border border-red-200 text-red-600 py-2 px-3 rounded-lg text-sm font-medium hover:bg-red-50"
            title="Delete rate"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
