import { useState } from 'react'

const CO_TYPES = ['Residential', 'Commercial', 'Public Works']

// job prop is optional. When provided the job picker is skipped.
export default function NewChangeOrderModal({ client, job, onClose, onNext }) {
  const [form,  setForm]  = useState({ name: '', type: '' })
  const [error, setError] = useState('')

  function handleNext() {
    if (!form.name.trim()) { setError('Please enter a Change Order name.'); return }
    if (!form.type)         { setError('Please select a type.'); return }
    setError('')
    onNext({ ...form, jobId: job?.id || null, jobName: job?.name || '' })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">

        <div className="mb-5">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-0.5">New Change Order</p>
          <h2 className="text-xl font-bold text-gray-900">
            {job ? (job.name || job.client_name) : (client?.name || '')}
          </h2>
          {job && <p className="text-xs text-gray-400 mt-0.5">Change order will be linked to this job</p>}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Change Order Name <span className="text-red-500">*</span>
            </label>
            <input
              className="input"
              placeholder="e.g. Add Patio Extension, Lighting Upgrade…"
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
              {CO_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="button" onClick={handleNext} className="btn-primary flex-1">Next →</button>
        </div>
      </div>
    </div>
  )
}
