import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createCatalogItem } from '../lib/materialCatalog'

// ─────────────────────────────────────────────────────────────────────────────
// NewCatalogItemModal — shown when a picker's Category → Sub-category is an empty
// set (no items to choose). Lets the user create an item for that exact
// sub-category inline (name + unit + price), writing it to the catalog (material
// + material_price, Standard unless a vendor is passed) so the picker is
// immediately populated. No hardcoded item lists anywhere.
//
// Props:
//   target  : { category, subCategory, label?, unit?, vendorId? }  (category+subCategory required)
//   onClose : () => void
//   onSaved : (materialId) => void | Promise  — parent refreshes its catalog after this
// ─────────────────────────────────────────────────────────────────────────────
export default function NewCatalogItemModal({ target, onClose, onSaved }) {
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('')
  const [price, setPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    setName('')
    setUnit(target?.unit || '')
    setPrice('')
    setErr('')
  }, [target?.category, target?.subCategory])

  if (!target) return null

  const save = async () => {
    if (!name.trim()) {
      setErr('Enter an item name.')
      return
    }
    const raw = String(price).replace(/[$,]/g, '')
    const v = raw === '' ? null : parseFloat(raw)
    if (v != null && (!Number.isFinite(v) || v < 0)) {
      setErr('Enter a valid price (or leave blank).')
      return
    }
    setSaving(true)
    setErr('')
    try {
      const id = await createCatalogItem({
        name: name.trim(),
        category: target.category,
        subCategory: target.subCategory,
        unit: unit.trim() || null,
        price: v,
        vendorId: target.vendorId || null,
      })
      await onSaved?.(id)
      onClose?.()
    } catch (e) {
      setErr(e?.message || 'Save failed.')
      setSaving(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="border-b border-gray-200 px-5 py-3">
          <h3 className="text-base font-semibold text-gray-900">Add an item</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            {target.label || target.subCategory}
            {target.category ? ` · ${target.category}` : ''}
          </p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-gray-600">
            This sub-category has no items yet. Create one — it’s saved to the catalog and available in
            every estimate.
          </p>
          <label className="block">
            <span className="text-xs font-medium text-gray-500">Item name</span>
            <input
              autoFocus
              className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 outline-none focus:border-blue-500"
              placeholder="e.g. Class II Roadbase"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </label>
          <div className="flex gap-3">
            <label className="block w-1/3">
              <span className="text-xs font-medium text-gray-500">Unit</span>
              <input
                className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 outline-none focus:border-blue-500"
                placeholder="ea / LF / SF"
                value={unit}
                onChange={e => setUnit(e.target.value)}
              />
            </label>
            <label className="block flex-1">
              <span className="text-xs font-medium text-gray-500">Price{unit ? ` (per ${unit})` : ''}</span>
              <div className="mt-1 flex items-center rounded-md border border-gray-300 focus-within:border-blue-500">
                <span className="pl-3 text-gray-500">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  className="w-full rounded-md px-2 py-2 outline-none"
                  placeholder="0.00"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && save()}
                />
              </div>
            </label>
          </div>
          {err ? <p className="text-sm text-red-600">{err}</p> : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3">
          <button
            className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            onClick={save}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Add item'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
