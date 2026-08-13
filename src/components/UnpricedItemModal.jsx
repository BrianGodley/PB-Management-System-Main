import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { setMaterialPrice, saveStandardNamedRate } from '../lib/materialCatalog'

// ─────────────────────────────────────────────────────────────────────────────
// UnpricedItemModal — shown when an estimate uses an item that has NO price in
// the catalog. There are NO hardcoded price fallbacks anywhere in the estimator;
// instead, an unpriced item is surfaced loudly and the user prices it inline.
// The price is written back to the catalog (Standard / null-vendor) so it is
// captured once and reused everywhere.
//
// Props:
//   item     : { name, label?, materialId?, category?, unit? }  (name is required)
//   onClose  : () => void
//   onSaved  : () => void | Promise   — parent refreshes its rate maps after this
//
// Write path: a catalog product (has materialId) sets its Standard material_price;
// a name-only item (misc/consumable, e.g. a dump fee) goes through
// saveStandardNamedRate which sets material_price if a matching product exists,
// else a misc_rates row. Labor coefficients are NOT priced here.
// ─────────────────────────────────────────────────────────────────────────────
export default function UnpricedItemModal({ item, onClose, onSaved }) {
  const [price, setPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    setPrice('')
    setErr('')
  }, [item?.name, item?.materialId])

  if (!item) return null
  const label = item.label || item.name

  const save = async () => {
    const v = parseFloat(String(price).replace(/[$,]/g, ''))
    if (!Number.isFinite(v) || v < 0) {
      setErr('Enter a valid price (0 or more).')
      return
    }
    setSaving(true)
    setErr('')
    try {
      if (item.materialId) await setMaterialPrice(item.materialId, null, v)
      else await saveStandardNamedRate(item.name, v, item.category || null)
      await onSaved?.()
      onClose?.()
    } catch (e) {
      setErr(e?.message || 'Save failed.')
      setSaving(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="border-b border-gray-200 px-5 py-3">
          <h3 className="text-base font-semibold text-gray-900">Item not priced yet</h3>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-gray-600">
            <span className="font-medium text-gray-900">{label}</span>
            {item.category ? <span className="text-gray-500"> · {item.category}</span> : null} has no
            price in the catalog. Enter its price to use it in this estimate — it will be saved to the
            catalog (Standard) and reused everywhere.
          </p>
          <label className="block">
            <span className="text-xs font-medium text-gray-500">
              Price{item.unit ? ` (per ${item.unit})` : ''}
            </span>
            <div className="mt-1 flex items-center rounded-md border border-gray-300 focus-within:border-blue-500">
              <span className="pl-3 text-gray-500">$</span>
              <input
                type="text"
                inputMode="decimal"
                autoFocus
                className="w-full rounded-md px-2 py-2 outline-none"
                placeholder="0.00"
                value={price}
                onChange={e => setPrice(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && save()}
              />
            </div>
          </label>
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
            {saving ? 'Saving…' : 'Save price'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// Small calc-side helper factory. Create one per calc pass; call priceOf(name)
// wherever a material price is needed. Missing (never-priced) names are recorded
// on `.unpriced` (a Map keyed by name) and treated as 0 for the running total, so
// the module can surface them without a hardcoded fallback ever being used.
//
//   const P = makePriceLookup(mr, materialRows)
//   const cost = P.price('Concrete - Form Lumber LF', { category: 'Concrete', unit: 'LF' })
//   ... P.unpriced  → [{ name, label, materialId, category, unit }]
export function makePriceLookup(rateMap = {}, materialRows = []) {
  const unpriced = new Map()
  const idByName = {}
  for (const r of materialRows || []) {
    // material rows expose a name/description + id; index for write-back targeting.
    const nm = r.name || r.description
    if (nm && r.id && idByName[nm] == null) idByName[nm] = r.id
  }
  return {
    unpriced,
    get unpricedList() {
      return [...unpriced.values()]
    },
    // Returns the catalog price, or 0 while recording the name as unpriced.
    price(name, meta = {}) {
      const v = rateMap?.[name]
      if (v == null || v === '') {
        if (!unpriced.has(name)) {
          unpriced.set(name, {
            name,
            label: meta.label || name,
            materialId: meta.materialId ?? idByName[name] ?? null,
            category: meta.category ?? null,
            unit: meta.unit ?? null,
          })
        }
        return 0
      }
      const num = typeof v === 'number' ? v : parseFloat(v)
      return Number.isFinite(num) ? num : 0
    },
  }
}
