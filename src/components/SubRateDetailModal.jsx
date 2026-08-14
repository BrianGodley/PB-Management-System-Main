import { useState } from 'react'
import { supabase } from '../lib/supabase'

// Detail modal for a Master Subcontractor Rates row — mirrors the material detail
// modal. Assign the item to a sub (subs_vendors), edit the rate, or delete.
//   row  — a subcontractor_rates row (id, vendor_id, company_name, category,
//          sub_category, trade, unit, rate) + optional `code` for the header.
//   subs — list of subs to choose from ({ id, company_name }).
export default function SubRateDetailModal({ row, code, subs = [], category, onClose, onSaved, onDeleted }) {
  const [vendorId, setVendorId] = useState(row.vendor_id || '')
  const [rate, setRate] = useState(row.rate ?? '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [showAll, setShowAll] = useState(false)

  // Subs whose trades (divisions) cover this rate's category — lenient match.
  const cat = (category || '').trim().toLowerCase()
  const coversCat = s =>
    !cat ||
    (s.divisions || []).some(d => {
      const x = (d || '').trim().toLowerCase()
      return x === cat || x.includes(cat) || cat.includes(x)
    })
  const matched = subs.filter(coversCat)
  // Show category-matched subs by default; fall back to all if none match or the
  // user asks. Always include the currently-assigned sub so it stays selectable.
  const pickList = (showAll || matched.length === 0 ? subs : matched).slice()
  if (vendorId && !pickList.some(s => s.id === vendorId)) {
    const cur = subs.find(s => s.id === vendorId)
    if (cur) pickList.unshift(cur)
  }
  const filtering = !showAll && matched.length > 0 && matched.length < subs.length

  async function save() {
    setSaving(true)
    setErr('')
    const sub = subs.find(s => s.id === vendorId)
    const { error } = await supabase
      .from('subcontractor_rates')
      .update({
        vendor_id: vendorId || null,
        company_name: sub ? sub.company_name : null,
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
    if (!confirm('Delete this subcontractor rate? This cannot be undone.')) return
    const { error } = await supabase.from('subcontractor_rates').delete().eq('id', row.id)
    if (error) {
      setErr(error.message)
      return
    }
    onDeleted?.()
    onClose?.()
  }

  const field = 'w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white'
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <div>
            <h3 className="text-sm font-bold text-gray-800">{row.trade || 'Subcontractor Rate'}</h3>
            {code && <span className="font-mono text-xs text-gray-400">{code}</span>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-lg leading-none">
            ×
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-gray-500 mb-0.5">Category</div>
            <div className="text-gray-800">{row.category || '—'}</div>
          </div>
          <div>
            <div className="text-gray-500 mb-0.5">Sub-Category</div>
            <div className="text-gray-800">{row.sub_category || '—'}</div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-gray-600">Subcontractor</label>
            {(filtering || showAll) && (
              <button
                type="button"
                onClick={() => setShowAll(v => !v)}
                className="text-[11px] text-green-700 hover:underline"
              >
                {showAll ? `Only ${category} subs` : 'Show all subs'}
              </button>
            )}
          </div>
          <select className={field} value={vendorId} onChange={e => setVendorId(e.target.value)}>
            <option value="">Unassigned</option>
            {pickList.map(s => (
              <option key={s.id} value={s.id}>
                {s.company_name}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-gray-400 mt-1">
            {filtering
              ? `Showing subs whose trades cover ${category}. More than one sub can price the same item.`
              : 'More than one sub can price the same item — add another row for each in Master Rates.'}
          </p>
        </div>

        <div className="mt-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Unit Price{row.unit ? ` (per ${row.unit})` : ''}
          </label>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input
              type="number"
              step="0.01"
              value={rate}
              onChange={e => setRate(e.target.value)}
              className={`${field} pl-5`}
            />
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
