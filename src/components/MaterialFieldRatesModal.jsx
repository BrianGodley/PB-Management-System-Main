import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'

// ─────────────────────────────────────────────────────────────────────────────
// MaterialFieldRatesModal — opened from a material "Edit Rates" pencil. Given
// any product id from the field, it resolves that product's (category,
// sub-category) and lists EVERY material + price available for that field
// (Standard + each vendor), so the user can adjust any one. Writes material_price.
// ─────────────────────────────────────────────────────────────────────────────

const money = v =>
  v == null || v === ''
    ? '—'
    : `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const isStd = s => ['standard', 'unspecified'].includes((s || '').trim().toLowerCase())

export default function MaterialFieldRatesModal({ materialId, onClose, onSaved }) {
  const [rows, setRows] = useState([])
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState(null) // { key, value }
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: base } = await supabase
      .from('material')
      .select('subcategory_id, category:category_id(name), subcategory:subcategory_id(name)')
      .eq('id', materialId)
      .single()
    if (!base) {
      setLoading(false)
      return
    }
    setTitle(`${base.category?.name || ''} › ${base.subcategory?.name || ''}`)
    const [{ data: prods }, { data: vends }] = await Promise.all([
      supabase
        .from('material')
        .select('id, description, prices:material_price(id, price, vendor_id, effective_end)')
        .eq('subcategory_id', base.subcategory_id)
        .order('description'),
      supabase.from('subs_vendors').select('id, company_name'),
    ])
    const stdId = (vends || []).find(v => isStd(v.company_name))?.id
    const vname = id => (id === stdId ? 'Standard' : (vends || []).find(v => v.id === id)?.company_name || '—')
    const out = []
    ;(prods || []).forEach(m => {
      const open = (m.prices || []).filter(p => p.effective_end == null)
      if (open.length) {
        open.forEach(pr =>
          out.push({
            key: pr.id,
            materialId: m.id,
            description: m.description,
            vendorId: pr.vendor_id,
            vendorName: vname(pr.vendor_id),
            priceId: pr.id,
            price: pr.price,
          })
        )
      } else {
        // product with no price yet → offer a Standard row to set one
        out.push({
          key: m.id + ':new',
          materialId: m.id,
          description: m.description,
          vendorId: stdId,
          vendorName: 'Standard',
          priceId: null,
          price: null,
        })
      }
    })
    out.sort((a, b) => a.description.localeCompare(b.description) || a.vendorName.localeCompare(b.vendorName))
    setRows(out)
    setLoading(false)
  }, [materialId])
  useEffect(() => {
    load()
  }, [load])

  const save = async r => {
    setSaving(true)
    const val = editing.value === '' ? null : parseFloat(editing.value)
    if (r.priceId) {
      await supabase.from('material_price').update({ price: val }).eq('id', r.priceId)
    } else if (r.vendorId) {
      await supabase
        .from('material_price')
        .insert({ material_id: r.materialId, vendor_id: r.vendorId, price: val, source: 'manual' })
    }
    setEditing(null)
    setSaving(false)
    await load()
    onSaved?.()
  }

  const shown = rows.filter(
    r => !q || r.description.toLowerCase().includes(q.toLowerCase()) || r.vendorName.toLowerCase().includes(q.toLowerCase())
  )

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-4" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Edit Rates — this field</p>
            <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">
            ✕
          </button>
        </div>
        <div className="px-4 py-2 border-b border-gray-100">
          <input
            className="border border-gray-200 rounded-md px-2 py-1 text-xs w-full"
            placeholder="Search materials / vendors…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>
        <div className="overflow-auto flex-1">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr className="text-left text-gray-600 uppercase border-b border-gray-200">
                <th className="px-4 py-2 font-semibold">Material</th>
                <th className="px-4 py-2 font-semibold">Vendor</th>
                <th className="px-4 py-2 font-semibold text-right">Price</th>
                <th className="px-4 py-2 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : shown.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                    No materials for this field yet.
                  </td>
                </tr>
              ) : (
                shown.map(r => {
                  const ed = editing && editing.key === r.key
                  return (
                    <tr key={r.key} className="hover:bg-gray-50 group">
                      <td className="px-4 py-1.5 text-gray-900 font-medium">{r.description}</td>
                      <td className="px-4 py-1.5 text-gray-600 whitespace-nowrap">{r.vendorName}</td>
                      <td className="px-4 py-1.5 text-right whitespace-nowrap">
                        {ed ? (
                          <input
                            autoFocus
                            type="number"
                            step="0.01"
                            className="w-24 border border-green-300 rounded-md px-2 py-1 text-xs text-right"
                            value={editing.value}
                            onChange={e => setEditing({ ...editing, value: e.target.value })}
                            onKeyDown={e => {
                              if (e.key === 'Enter') save(r)
                              if (e.key === 'Escape') setEditing(null)
                            }}
                          />
                        ) : (
                          <span className={r.price == null ? 'text-gray-300' : 'text-gray-800 font-semibold'}>
                            {money(r.price)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-1.5 text-right whitespace-nowrap">
                        {ed ? (
                          <>
                            <button onClick={() => save(r)} disabled={saving} className="text-green-700 font-semibold mr-2">
                              Save
                            </button>
                            <button onClick={() => setEditing(null)} className="text-gray-400">
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setEditing({ key: r.key, value: r.price ?? '' })}
                            className="text-gray-500 hover:text-gray-800 opacity-0 group-hover:opacity-100"
                          >
                            {r.price == null ? 'Set' : 'Edit'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 text-right">
          <button onClick={onClose} className="text-sm bg-green-700 text-white px-4 py-1.5 rounded-lg font-semibold">
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
