import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase'

/**
 * CONavModal — change-order quick navigator (opened from the mobile dock).
 *
 * Flow:
 *  1. Pick "View Existing" or "Create New".
 *  2. Pick a job (searchable picker).
 *  3. If "Create New": also pick Manual vs Estimator.
 *  4. Press Go.
 *
 * Navigation targets (handled by parent via onNavigate):
 *   existing  -> /jobs?tab=change-orders&job=<id>
 *   new       -> /jobs?tab=change-orders&job=<id>&newco=manual|estimator
 */
export default function CONavModal({ onClose, onNavigate }) {
  const [mode, setMode] = useState('existing') // 'existing' | 'new'
  const [method, setMethod] = useState('manual') // 'manual' | 'estimator'
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [jobId, setJobId] = useState('')
  const searchRef = useRef(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data } = await supabase
        .from('jobs')
        .select('id, name, client_name, status')
        .order('name', { ascending: true })
      if (!alive) return
      // Current (open) jobs first, then the rest.
      const rows = data || []
      const isOpen = j => j.status === 'active' || j.status === 'on_hold' || !j.status
      rows.sort((a, b) => {
        const oa = isOpen(a) ? 0 : 1
        const ob = isOpen(b) ? 0 : 1
        if (oa !== ob) return oa - ob
        return (a.name || '').localeCompare(b.name || '')
      })
      setJobs(rows)
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return jobs
    return jobs.filter(
      j =>
        (j.name || '').toLowerCase().includes(q) ||
        (j.client_name || '').toLowerCase().includes(q)
    )
  }, [jobs, query])

  const selectedJob = jobs.find(j => j.id === jobId)
  const canGo = !!jobId

  function handleGo() {
    if (!canGo) return
    if (mode === 'existing') {
      onNavigate(`/jobs?tab=change-orders&job=${jobId}`)
    } else {
      onNavigate(`/jobs?tab=change-orders&job=${jobId}&newco=${method}`)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92dvh] flex flex-col"
        onClick={e => e.stopPropagation()}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-base font-bold text-gray-900">🔄 Change Orders</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-gray-400 hover:bg-gray-100 flex items-center justify-center text-lg"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Mode toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMode('existing')}
              className={`py-3 rounded-xl border text-sm font-semibold transition-colors ${
                mode === 'existing'
                  ? 'border-green-600 bg-green-50 text-green-800'
                  : 'border-gray-200 text-gray-600'
              }`}
            >
              View Existing
            </button>
            <button
              onClick={() => setMode('new')}
              className={`py-3 rounded-xl border text-sm font-semibold transition-colors ${
                mode === 'new'
                  ? 'border-green-600 bg-green-50 text-green-800'
                  : 'border-gray-200 text-gray-600'
              }`}
            >
              Create New
            </button>
          </div>

          {/* Job picker (search + list) */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Select Job
            </label>
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by job or client…"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <div className="max-h-52 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
              {loading ? (
                <div className="py-8 text-center text-sm text-gray-400">Loading jobs…</div>
              ) : filtered.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-400">No jobs found</div>
              ) : (
                filtered.map(j => (
                  <button
                    key={j.id}
                    onClick={() => setJobId(j.id)}
                    className={`w-full text-left px-3 py-2.5 transition-colors ${
                      jobId === j.id ? 'bg-green-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-800 truncate">
                        {j.name || '(unnamed job)'}
                      </span>
                      {jobId === j.id && <span className="text-green-600 text-sm">✓</span>}
                    </div>
                    {j.client_name && (
                      <span className="text-xs text-gray-500 truncate block">{j.client_name}</span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Method choice (only for new) */}
          {mode === 'new' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Change Order Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setMethod('manual')}
                  className={`py-3 px-2 rounded-xl border text-sm font-semibold transition-colors ${
                    method === 'manual'
                      ? 'border-blue-600 bg-blue-50 text-blue-800'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  ✍️ Manual
                </button>
                <button
                  onClick={() => setMethod('estimator')}
                  className={`py-3 px-2 rounded-xl border text-sm font-semibold transition-colors ${
                    method === 'estimator'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-800'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  📐 Estimator
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200">
          <button
            onClick={handleGo}
            disabled={!canGo}
            className="w-full py-3 rounded-xl bg-green-700 text-white text-sm font-bold hover:bg-green-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {mode === 'existing'
              ? selectedJob
                ? `Go to ${selectedJob.name || 'job'} →`
                : 'Go →'
              : `Create ${method === 'manual' ? 'Manual' : 'Estimator'} CO →`}
          </button>
        </div>
      </div>
    </div>
  )
}
