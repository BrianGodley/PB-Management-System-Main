import { useState } from 'react'
import { createPortal } from 'react-dom'
import { setMaterialPrice } from '../lib/materialCatalog'

// ─────────────────────────────────────────────────────────────────────────────
// MissingPriceModal — pops when a user selects a catalog material that has no
// price. Explains that the choice won't add a material cost, and lets the user
// type a price that is written straight to the catalog (material_price for the
// selected vendor, or the Standard price when no vendor is given).
//
// Props:
//   name       — the material's display name
//   materialId — the `material` row id (required to save)
//   vendorId   — vendor id, or null/'Standard' → the Standard (universal) price
//   vendorLabel— optional label shown in the message (e.g. 'Angelus')
//   onClose    — () => void
//   onSaved    — async () => void  (host re-fetches its catalog so the new price shows)
// ─────────────────────────────────────────────────────────────────────────────

export default function MissingPriceModal({ name, materialId, vendorId, vendorLabel, onClose, onSaved }) {
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    const v = parseFloat(draft)
    if (!Number.isFinite(v) || v < 0) {
      setError('Enter a price of 0 or more.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await setMaterialPrice(materialId, vendorId, v)
    } catch (e) {
      setError(e?.message || 'Save failed.')
      setSaving(false)
      return
    }
    setSaving(false)
    if (onSaved) {
      try {
        await onSaved()
      } catch {
        /* non-fatal */
      }
    }
    onClose?.()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      <div
        className="bg-white border border-gray-200 rounded-xl shadow-2xl w-full max-w-sm p-5 relative"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xl flex-shrink-0">
            !
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold text-gray-900 leading-tight">No price on file</p>
            <p className="text-xs text-gray-500 mt-0.5">{name}</p>
          </div>
        </div>

        <p className="text-sm text-gray-700 mb-4">
          <strong>{name}</strong>
          {vendorLabel ? ` (${vendorLabel})` : ''} doesn't have a price yet, so it
          won't add any material cost to this estimate. Enter a price below to save it to the
          catalog — it will be used everywhere this material is priced.
        </p>

        <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          Price
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            $
          </span>
          <input
            type="number"
            step="0.001"
            min="0"
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !saving) save()
            }}
            className="input text-base w-full pl-7"
            placeholder="0.00"
          />
        </div>
        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="flex-1 py-2 rounded-lg bg-green-700 text-white text-sm font-semibold hover:bg-green-800 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save price'}
          </button>
        </div>
        <p className="text-[11px] text-gray-400 mt-3 italic text-center">
          Updates the catalog price everywhere it's used.
        </p>
      </div>
    </div>,
    document.body
  )
}
