import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const CO_TYPES = ['Residential', 'Commercial', 'Public Works']

export default function NewChangeOrderModal({ client, onClose, onNext }) {
  const [form,     setForm]     = useState({ name: '', type: '', jobId: '' })
  const [jobs,     setJobs]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')

  useEffect(() => {
    // Fetch active/on-hold jobs for this client
    supabase
      .from('jobs')
      .select('id, name, client_name')
      .in('status', ['active', 'on_hold'])
      .order('name')
      .then(({ data }) => {
        setJobs(data || [])
        setLoading(false)
      })
  }, [])

  function handleNext() {
    if (!form.name.trim()) { setError('Please enter a Change Order name.'); return }
    if (!form.type)         { setError('Please select a type.'); return }
    if (!form.jobId)        { setError('Please select a job.'); return }
    setError('')
    const selectedJob = jobs.find(j => j.id === form.jobId)
    onNext({ ...form, clientId: client.id, clientName: client.name, jobName: selectedJob?.name || '' })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">

        <div className="mb-5">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-0.5">New Change Order</p>
          <h2 className="text-xl font-bold text-gray-900">{client.name}</h2>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Link to Job <span className="text-red-500">*</span>
            </label>
            {loading ? (
              <p className="text-sm text-gray-400">Loading jobs…</p>
            ) : jobs.length === 0 ? (
              <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                No active jobs found. Create a job first by marking a bid as Sold.
              </p>
            ) : (
              <select
                className="input"
                value={form.jobId}
                onChange={e => { setForm(p => ({ ...p, jobId: e.target.value })); setError('') }}
              >
                <option value="">-- Select a Job --</option>
                {jobs.map(j => (
                  <option key={j.id} value={j.id}>{j.name || j.client_name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            type="button"
            onClick={handleNext}
            disabled={jobs.length === 0 && !loading}
            className="btn-primary flex-1 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}
