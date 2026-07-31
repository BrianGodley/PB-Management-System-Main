import { useState } from 'react'
import { supabase } from '../lib/supabase'

// Minimal "add a vendor" dialog used from the import screens. Creates a
// subs_vendors row (type='vendor') and hands the new row back so the caller
// can drop it into the vendor picker and select it. Full details can be filled
// in later under Vendors → Directory.
export default function QuickAddVendorModal({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (!name.trim()) return setError('Enter a vendor name.')
    setBusy(true)
    setError('')
    const { data, error: e } = await supabase
      .from('subs_vendors')
      .insert({ company_name: name.trim(), type: 'vendor' })
      .select()
      .single()
    setBusy(false)
    if (e) return setError(e.message)
    onCreated?.(data)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-bold text-gray-800">New Vendor</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-lg leading-none">×</button>
        </div>
        <div className="p-4 space-y-3">
          {error && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>
          )}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Vendor name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && save()}
              className="input w-full text-sm py-1.5"
              placeholder="e.g. Acme Supply"
            />
          </div>
          <p className="text-[11px] text-gray-400">Add contact details, categories, etc. later in Vendors → Directory.</p>
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="text-sm text-gray-500 px-3 py-1.5">Cancel</button>
            <button onClick={save} disabled={busy} className="text-sm bg-green-600 text-white font-semibold rounded px-4 py-1.5 disabled:opacity-50">
              {busy ? 'Saving…' : 'Save vendor'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
