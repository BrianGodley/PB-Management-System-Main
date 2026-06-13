import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { fetchAllPaginated } from '../lib/fetchAll'
import { useAuth } from '../contexts/AuthContext'
import CODetailModal from './CODetailModal'
import COEstimatePanel from './COEstimatePanel'

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
  const { user } = useAuth()
  const [mode, setMode] = useState('existing') // 'existing' | 'new'
  const [method, setMethod] = useState('manual') // 'manual' | 'estimator'
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [jobId, setJobId] = useState('')
  const [statusFilter, setStatusFilter] = useState('open') // 'open' | 'closed'
  const [creating, setCreating] = useState(null) // null | 'manual' | 'estimator'
  const [estCO, setEstCO] = useState(null) // { estimateId, bidId, coName, coType }
  const [starting, setStarting] = useState(false)
  const searchRef = useRef(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      // Paginated — the jobs table exceeds the 1k row cap, so a plain select
      // would stop partway through the alphabet.
      const { data } = await fetchAllPaginated(() =>
        supabase.from('jobs').select('id, name, client_name, status').order('name', { ascending: true })
      )
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

  const isOpen = j => j.status === 'active' || j.status === 'on_hold' || !j.status
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return jobs.filter(j => {
      if (statusFilter === 'open' ? !isOpen(j) : isOpen(j)) return false
      if (!q) return true
      return (
        (j.name || '').toLowerCase().includes(q) ||
        (j.client_name || '').toLowerCase().includes(q)
      )
    })
  }, [jobs, query, statusFilter])

  const selectedJob = jobs.find(j => j.id === jobId)
  const canGo = !!jobId

  async function handleGo() {
    if (!canGo) return
    if (mode === 'existing') {
      setCreating('existing') // its own screen, not the Jobs tab
      return
    }
    // Create flows open as their own screens here (no Jobs-area detour).
    if (method === 'manual') {
      setCreating('manual')
    } else {
      await startEstimator(selectedJob)
    }
  }

  // Estimator CO: create the paired draft estimate + the CO bid, then open the
  // estimator builder right here.
  async function startEstimator(job) {
    if (!job || starting) return
    setStarting(true)
    try {
      const clientName = job.client_name || job.name || ''
      const { data: est, error: eErr } = await supabase
        .from('estimates')
        .insert({ estimate_name: 'Change Order', client_name: clientName, status: 'draft', created_by: user?.id || null })
        .select('id')
        .single()
      if (eErr) throw new Error(eErr.message)
      const { data: maxRows } = await supabase
        .from('bids')
        .select('custom_co_id')
        .eq('linked_job_id', job.id)
        .eq('record_type', 'change_order')
        .order('custom_co_id', { ascending: false })
        .limit(1)
      const customCoId = (maxRows?.[0]?.custom_co_id || 0) + 1
      const { data: bid, error: bErr } = await supabase
        .from('bids')
        .insert({
          record_type: 'change_order',
          linked_job_id: job.id,
          co_name: 'Change Order',
          custom_co_id: customCoId,
          client_name: clientName,
          bid_amount: 0,
          gross_profit: 0,
          gpmd: 0,
          date_submitted: new Date().toISOString().slice(0, 10),
          status: 'unreleased',
          estimate_id: est.id,
          notes: '',
          projects: [],
          co_method: 'estimator',
          created_by: user?.id || null,
        })
        .select('*')
        .single()
      if (bErr) throw new Error(bErr.message)
      setEstCO({ estimateId: est.id, bidId: bid.id, coName: bid.co_name, coType: bid.co_type || '' })
      setCreating('estimator')
    } catch (err) {
      alert('Could not start change order: ' + (err?.message || err))
    }
    setStarting(false)
  }

  // ── Standalone create screens ─────────────────────────────────────────────
  if (creating === 'manual' && selectedJob) {
    return (
      <div className="fixed inset-0 z-[70] bg-black/40">
        <CODetailModal
          co={null}
          job={selectedJob}
          onClose={onClose}
          onSaved={() => {}}
          onDeleted={onClose}
          onSent={() => {}}
        />
      </div>
    )
  }

  if (creating === 'estimator' && estCO && selectedJob) {
    return (
      <div
        className="fixed inset-0 z-[70] bg-white flex flex-col p-3"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <COEstimatePanel
          estimateId={estCO.estimateId}
          bidId={estCO.bidId}
          coName={estCO.coName}
          coType={estCO.coType}
          jobId={selectedJob.id}
          clientName={selectedJob.client_name || selectedJob.name || ''}
          isNew
          onClose={onClose}
          onSaved={() => {}}
          onDeleted={onClose}
        />
      </div>
    )
  }

  // ── Standalone "view existing" screen (its own screen, not the Jobs tab) ────
  if (creating === 'existing' && selectedJob) {
    return (
      <ExistingCOScreen
        job={selectedJob}
        starting={starting}
        onClose={onClose}
        onManual={() => setCreating('manual')}
        onEstimator={() => startEstimator(selectedJob)}
      />
    )
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-stretch sm:items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full h-[100dvh] sm:h-auto sm:max-w-md bg-white sm:rounded-2xl shadow-2xl sm:max-h-[92dvh] flex flex-col"
        onClick={e => e.stopPropagation()}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Header — green bar with the screen name centered in white */}
        <div
          className="relative flex items-center justify-center px-4 h-11 flex-shrink-0 shadow-md sm:rounded-t-2xl"
          style={{ backgroundColor: '#4E7B4C' }}
        >
          <h2 className="text-base font-semibold text-white">Change Orders</h2>
          <button
            onClick={onClose}
            className="absolute right-3 w-8 h-8 rounded-full text-white/80 hover:bg-black/15 flex items-center justify-center text-lg"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 flex flex-col min-h-0 px-4 py-4 gap-3">
          {/* Mode toggle */}
          <div className="grid grid-cols-2 gap-2 flex-shrink-0">
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

          {/* Method choice (only for new) — above the list so the list fills */}
          {mode === 'new' && (
            <div className="flex-shrink-0">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Change Order Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setMethod('manual')}
                  className={`py-3 px-2 rounded-xl border text-