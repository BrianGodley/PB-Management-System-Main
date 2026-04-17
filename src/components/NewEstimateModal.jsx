import { useState } from 'react'

export default function NewEstimateModal({ client, onClose, onNext }) {
  const [form, setForm] = useState({ name: '', type: '' })
  const [error, setError] = useState('')

  function handleNext() {
    if (!form.name.trim()) {
      setError('Please enter a name for this estimate.')
      return
    }
    if (!form.type) {
      setError('Please select a type.')
      return
    }
    setError('')
    onNext({ ...form, clientId: client.id, clientName: client.name })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">

        {/* Header */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-0.5">New Estimate</p>
          <h2 className="text-xl font-bold text-gray-900">{client.name}</h2>
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estimate Name <span className="text-red-500">*</span>
            </label>
            <input
              className="input"
              placeholder="e.g. Backyard, Front Yard, Pool Area..."
              value={form.name}
              onChange={e => { setForm(p => ({ ...p, name: e.target.value })); setError('') }}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type <span className="text-red-500">*</span>
            </label>
            <select
              className="input"
              value={form.type}
              onChange={e => { setForm(p => ({ ...p, type: e.target.value })); setError('') }}
            >
              <option value="">-- Select Type --</option>
              <option value="Residential">Residential</option>
              <option value="Commercial">Commercial</option>
              <option value="Public Works">Public Works</option>
            </select>
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {/* Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="btn-primary flex-1"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}
