import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import { materialUsage, archiveMaterial, restoreMaterial } from '../lib/materialCatalog'

// ─────────────────────────────────────────────────────────────────────────────
// MaterialDetailModal — opened from the code hyperlink in Master Material Rates.
// View a product; Edit its category / sub-category / description / unit / price;
// or Delete it (cascades its prices). `row` is a display row from
// MasterMaterialRates ({ m, priceId, vendorId, price, code, vName }).
// ─────────────────────────────────────────────────────────────────────────────

const money = v =>
  v == null || v === '' ? '—' : `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function MaterialDetailModal({ row, onClose, onSaved, onDeleted }) {
  const m = row.m
  const [cats, setCats] = useState([])
  const [subs, setSubs] = useState([])
  const [mode, setMode] = useState('view') // 'view' | 'edit'
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [confirmDel, setConfirmDel] = useState(false)
  const [usage, setUsage] = useState(null) // { priceCount, refCount } once loaded
  const [archived, setArchived] = useState(!!m.archived_at)
  const [form, setForm] = useState({
    category_id: m.category_id,
    subcategory_id: m.subcategory_id,
    description: m.description || '',
    unit: m.unit || '',
    price: row.price ?? '',
  })

  useEffect(() => {
    Promise.all([
      supabase.from('category').select('id, code, name').order('name'),
      supabase.from('subcategory').select('id, code, name, category_id').order('name'),
    ]).then(([c, s]) => {
      setCats(c.data || [])
      setSubs(s.data || [])
    })
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const subsForCat = useMemo(
    () => subs.filter(s => s.category_id === form.category_id),
    [subs, form.category_id]
  )

  const save = async () => {
    setBusy(true)
    setErr('')
    // 1) product attributes
    const { error: mErr } = await supabase
      .from('material')
      .update({
        category_id: form.category_id,
        subcategory_id: form.subcategory_id,
        description: form.description,
        unit: form.unit || null,
      })
      .eq('id', m.id)
    if (mErr) {
      setBusy(false)
      setErr(
        mErr.code === '23505' || /duplicate|unique/i.test(mErr.message)
          ? 'A product with this name already exists in that category / sub-category. Rename this one, or delete the duplicate first.'
          : mErr.message
      )
      return
    }
    // 2) price for this row's vendor (update open period, or insert one)
    const price = form.price === '' ? null : parseFloat(form.price)
    if (row.priceId) {
      await supabase.from('material_price').update({ price }).eq('id', row.priceId)
    } else if (row.vendorId) {
      await supabase
        .from('material_price')
        .insert({ material_id: m.id, vendor_id: row.vendorId, price, source: 'manual' })
    }
    setBusy(false)
    onSaved?.()
    onClose?.()
  }

  // When the delete confirm opens, check what depends on this product so we can
  // block a destructive delete and steer to Archive instead.
  const openConfirm = async () => {
    setConfirmDel(true)
    setUsage(null)
    const u = await materialUsage(m.id, m.description)
    setUsage(u)
  }

  const protectedItem = usage && (usage.priceCount > 0 || usage.refCount > 0)

  const del = async () => {
    setBusy(true)
    await supabase.from('material').delete().eq('id', m.id) // cascades material_price
    setBusy(false)
    setConfirmDel(false)
    onDeleted?.()
    onClose?.()
  }

  const archive = async () => {
    setBusy(true)
    await archiveMaterial(m.id)
    setBusy(false)
    setConfirmDel(false)
    setArchived(true)
    onDeleted?.() // refresh the list; archived items drop out of pickers
    onClose?.()
  }

  const restore = async () => {
    setBusy(true)
    await restoreMaterial(m.id)
    setBusy(false)
    setArchived(false)
    onSaved?.()
    onClose?.()
  }

  const catName = id => cats.find(c => c.id === id)?.name || '—'
  const subName = id => subs.find(s => s.id === id)?.name || '—'

  return createPortal(
    <div
      className="fixed inset-0 z-[9998] bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div>
            <p className="font-mono text-xs text-gray-500">{row.code}</p>
            <h3 className="text-sm font-bold text-gray-900">{m.description}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-lg leading-none">
            ✕
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 text-sm">
          {archived && (
            <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              This product is <b>archived</b> — hidden from all pickers and selection lists. Its price
              history is preserved. Use Restore to bring it back.
            </div>
          )}
          {mode === 'view' ? (
            <>
              <Field label="Category" value={catName(m.category_id)} />
              <Field label="Sub-Category" value={subName(m.subcategory_id)} />
              <Field label="Description" value={m.description} />
              <Field label="Unit" value={m.unit || '—'} />
              {row.vName && <Field label="Vendor" value={row.vName} />}
              <Field label={row.vName ? 'Vendor Price' : 'Standard Price'} value={money(row.price)} />
              {m.collection && <Field label="Collection / Style" value={m.collection} />}
            </>
          ) : (
            <>
              <label className="block">
                <span className="text-xs text-gray-500">Category</span>
                <select
                  className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white"
                  value={form.category_id || ''}
                  onChange={e => {
                    set('category_id', e.target.value)
                    // reset subcategory if it no longer belongs
                    const stillValid = subs.some(
                      s => s.id === form.subcategory_id && s.category_id === e.target.value
                    )
                    if (!stillValid) set('subcategory_id', '')
                  }}
                >
                  {cats.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">Sub-Category</span>
                <select
                  className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white"
                  value={form.subcategory_id || ''}
                  onChange={e => set('subcategory_id', e.target.value)}
                >
                  <option value="">— select —</option>
                  {subsForCat.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">Description</span>
                <input
                  className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm"
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-gray-500">Unit</span>
                  <input
                    className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm"
                    value={form.unit}
                    onChange={e => set('unit', e.target.value)}
                    placeholder="e.g. sqft, LF, each"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-500">
                    {row.vName ? `${row.vName} Price` : 'Standard Price'}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm"
                    value={form.price}
                    onChange={e => set('price', e.target.value)}
                  />
                </label>
              </div>
            </>
          )}
        </div>

        {err && (
          <div className="px-5 py-2 text-xs text-red-600 bg-red-50 border-t border-red-100">{err}</div>
        )}
        <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          {mode === 'view' ? (
            <>
              {archived ? (
                <button
                  onClick={restore}
                  disabled={busy}
                  className="text-sm text-green-700 hover:text-green-900 font-medium disabled:opacity-50"
                >
                  {busy ? 'Restoring…' : '↩ Restore'}
                </button>
              ) : (
                <button
                  onClick={openConfirm}
                  className="text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Delete
                </button>
              )}
              <div className="flex gap-2">
                <button onClick={onClose} className="text-sm text-gray-500 px-3 py-1.5">
                  Close
                </button>
                <button
                  onClick={() => setMode('edit')}
                  className="text-sm bg-green-700 text-white px-4 py-1.5 rounded-lg font-semibold"
                >
                  Edit
                </button>
              </div>
            </>
          ) : (
            <>
              <button onClick={() => setMode('view')} className="text-sm text-gray-500 px-3 py-1.5">
                Cancel
              </button>
              <button
                onClick={save}
                disabled={busy || !form.subcategory_id || !form.description.trim()}
                className="text-sm bg-green-700 text-white px-4 py-1.5 rounded-lg font-semibold disabled:opacity-50"
              >
                {busy ? 'Saving…' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>

      {confirmDel &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4"
            onClick={() => setConfirmDel(false)}
          >
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5"
              onClick={e => e.stopPropagation()}
            >
              {usage == null ? (
                <p className="text-sm text-gray-500 py-4 text-center">Checking where this product is used…</p>
              ) : protectedItem ? (
                <>
                  <h4 className="font-bold text-gray-900 mb-1">Archive this product?</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    “{m.description}” can’t be permanently deleted because doing so would break live
                    selections and erase its price history:
                  </p>
                  <ul className="text-sm text-gray-700 mb-3 space-y-1">
                    {usage.refCount > 0 && (
                      <li>
                        • Used in <b>{usage.refCount}</b> saved estimate
                        {usage.refCount === 1 ? '' : 's'} — deleting would orphan those selections.
                      </li>
                    )}
                    {usage.priceCount > 0 && (
                      <li>
                        • Has <b>{usage.priceCount}</b> price record{usage.priceCount === 1 ? '' : 's'}{' '}
                        (vendor prices + history) that would be lost.
                      </li>
                    )}
                  </ul>
                  <p className="text-sm text-gray-600 mb-4">
                    Archiving hides it from all pickers and selection lists but keeps the product and
                    its full price ledger intact. You can restore it anytime.
                  </p>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setConfirmDel(false)}
                      className="text-sm text-gray-500 px-3 py-1.5"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={archive}
                      disabled={busy}
                      className="text-sm bg-amber-600 text-white px-4 py-1.5 rounded-lg font-semibold disabled:opacity-50"
                    >
                      {busy ? 'Archiving…' : 'Archive'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h4 className="font-bold text-gray-900 mb-1">Delete this product?</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    “{m.description}” isn’t used in any saved estimate and has no price history, so it
                    can be permanently removed. This can’t be undone.
                  </p>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setConfirmDel(false)}
                      className="text-sm text-gray-500 px-3 py-1.5"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={archive}
                      disabled={busy}
                      className="text-sm border border-amber-500 text-amber-700 px-3 py-1.5 rounded-lg font-semibold disabled:opacity-50"
                    >
                      Archive
                    </button>
                    <button
                      onClick={del}
                      disabled={busy}
                      className="text-sm bg-red-600 text-white px-4 py-1.5 rounded-lg font-semibold disabled:opacity-50"
                    >
                      {busy ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>,
    document.body
  )
}

function Field({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-gray-100 pb-1.5">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm text-gray-900 text-right">{value || '—'}</span>
    </div>
  )
}
