import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ScheduleCalendar from '../components/ScheduleCalendar'
import DailyLogs from '../components/DailyLogs'

function lastName(name = '') {
  const t = name.trim()
  if (t.includes(',')) return t.split(',')[0].trim().toLowerCase()
  const parts = t.split(/\s+/)
  return (parts[parts.length - 1] || '').toLowerCase()
}

const ALL_JOBS = '__all__'

export default function JobsList() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedJob, setSelectedJob] = useState(ALL_JOBS)
  const [tab, setTab] = useState('jobs')
  const [jobModal, setJobModal] = useState(null)   // job object being viewed/edited
  const [search, setSearch] = useState('')

  useEffect(() => { fetchJobs() }, [])

  async function fetchJobs() {
    setLoading(true)
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('sold_date', { ascending: false })
    if (error) console.error('JobsList fetch error:', error)
    if (data) setJobs(data)
    setLoading(false)
  }

  async function deleteJob(id, name) {
    if (!confirm(`Delete job "${name}"? This cannot be undone.`)) return
    await supabase.from('jobs').delete().eq('id', id)
    setJobs(prev => prev.filter(j => j.id !== id))
    if (selectedJob === id) setSelectedJob(ALL_JOBS)
  }

  async function updateJobName(id, newName) {
    const { error } = await supabase.from('jobs').update({ name: newName }).eq('id', id)
    if (error) { console.error('updateJobName:', error); return false }
    setJobs(prev => prev.map(j => j.id === id ? { ...j, name: newName } : j))
    setJobModal(prev => prev ? { ...prev, name: newName } : prev)
    return true
  }

  const price = j => parseFloat(j.total_price || j.contract_price || 0)

  const underConstruction = jobs.filter(j => (j.status || 'active') === 'active').reduce((s, j) => s + price(j), 0)
  const allOpen           = jobs.filter(j => ['active', 'on_hold'].includes(j.status || 'active')).reduce((s, j) => s + price(j), 0)
  const completedTotal    = jobs.filter(j => j.status === 'completed').reduce((s, j) => s + price(j), 0)

  const sorted = [...jobs]
    .filter(j => {
      const q = search.toLowerCase()
      return !q || (j.name || '').toLowerCase().includes(q) || (j.client_name || '').toLowerCase().includes(q)
    })
    .sort((a, b) => {
      const la = lastName(a.name || a.client_name || '')
      const lb = lastName(b.name || b.client_name || '')
      return la.localeCompare(lb) || (a.name || a.client_name || '').localeCompare(b.name || b.client_name || '')
    })

  const mgmtItems = []

  const isMgmt = false
  const selectedJobObj = selectedJob === ALL_JOBS ? null : jobs.find(j => j.id === selectedJob) || null

  return (
    // h-full + flex-col so the layout fills the viewport and the bottom section can flex-1
    <div className="flex flex-col h-full">

      {/* ── Summary stats ─────────────────────────────────────── */}
      <div className="flex gap-2 mb-3 flex-shrink-0">
        {[
          { label: 'Under Construction', value: underConstruction, count: jobs.filter(j => (j.status||'active')==='active').length,    color: 'text-green-700' },
          { label: 'All Open Jobs',       value: allOpen,           count: jobs.filter(j => ['active','on_hold'].includes(j.status||'active')).length, color: 'text-blue-700'  },
          { label: 'Completed',           value: completedTotal,    count: jobs.filter(j => j.status==='completed').length,              color: 'text-gray-600'  },
        ].map(s => (
          <div key={s.label} className="flex-1 flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm">
            <span className="text-xs text-gray-600 font-medium">{s.label}</span>
            <div className="text-right">
              <span className={`text-sm font-bold ${s.color}`}>${s.value.toLocaleString()}</span>
              <span className="text-xs text-gray-500 ml-1.5">({s.count})</span>
            </div>
          </div>
        ))}
        <Link to="/jobs/new" className="btn-primary text-sm px-3 flex items-center whitespace-nowrap">+ Add Job</Link>
      </div>

      {/* ── Menu bar ──────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-gray-200 mb-4 pb-0 flex-shrink-0">
        <button
          onClick={() => setTab('jobs')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
            tab === 'jobs' ? 'border-green-700 text-green-700 bg-green-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          Jobs
        </button>

        <button
          onClick={() => setTab('schedule')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
            tab === 'schedule' ? 'border-green-700 text-green-700 bg-green-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          Schedule
        </button>

        <button
          onClick={() => setTab('daily-logs')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
            tab === 'daily-logs' ? 'border-green-700 text-green-700 bg-green-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          Daily Logs
        </button>

        <button
          onClick={() => setTab('tasks')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
            tab === 'tasks' ? 'border-green-700 text-green-700 bg-green-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          Tasks
        </button>

        <button
          onClick={() => setTab('files')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
            tab === 'files' ? 'border-green-700 text-green-700 bg-green-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          Files
        </button>

        <button
          onClick={() => setTab('tracking')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
            tab === 'tracking' ? 'border-green-700 text-green-700 bg-green-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          Tracking
        </button>

        <button
          onClick={() => setTab('templates')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
            tab === 'templates' ? 'border-green-700 text-green-700 bg-green-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          Templates
        </button>
      </div>

      {/* ── Main content: sidebar + right panel ───────────────── */}
      {/*
        flex-1 min-h-0 = fills remaining viewport height and allows children to shrink/scroll.
        The sidebar and right panel each manage their own vertical scroll.
        The page itself does NOT scroll — only the right panel does.
      */}
      <div className="flex gap-2 flex-1 min-h-0">

        {/* Jobs sidebar — pulls left to cancel main's padding, pl-1 keeps a tiny gap from the app nav border */}
        <div className="w-52 flex-shrink-0 flex flex-col min-h-0 -ml-4 lg:-ml-6 pl-3">
          <input
            type="text"
            placeholder="Search jobs…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input text-xs mb-2 py-1.5 flex-shrink-0"
          />
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-700" />
            </div>
          ) : (
            <div className="overflow-y-auto flex-1 space-y-0.5">
              <button
                onClick={() => setSelectedJob(ALL_JOBS)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                  selectedJob === ALL_JOBS ? 'bg-green-50 border-green-200 text-green-800' : 'border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}
              >
                All Jobs
              </button>
              <div className="border-t border-gray-100 my-1" />
              {sorted.map(job => (
                <div
                  key={job.id}
                  className={`flex items-center gap-1 rounded-lg transition-colors ${
                    selectedJob === job.id ? 'bg-green-50 border border-green-200' : 'hover:bg-gray-100 border border-transparent'
                  }`}
                >
                  <button
                    onClick={() => setSelectedJob(job.id)}
                    className="flex-1 text-left pl-2 pr-1 py-2 text-sm min-w-0"
                  >
                    <p className={`font-medium truncate ${selectedJob === job.id ? 'text-green-800' : 'text-gray-700'}`}>
                      {job.name || job.client_name}
                    </p>
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setJobModal(job) }}
                    className={`flex-shrink-0 p-1.5 mr-1 rounded transition-colors ${
                      selectedJob === job.id
                        ? 'text-green-500 hover:text-green-800 hover:bg-green-100'
                        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200'
                    }`}
                    title="View / edit job"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z" />
                    </svg>
                  </button>
                </div>
              ))}
              {sorted.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-6">No jobs found.</p>
              )}
            </div>
          )}
        </div>

        {/* Right panel — this is the ONLY thing that scrolls. Negative right margin cancels main's padding so content + scrollbar reach the window edge */}
        <div className="flex-1 min-w-0 overflow-y-auto -mr-4 lg:-mr-6">

          {tab === 'jobs' && (
            selectedJobObj ? (
              <JobDetail job={selectedJobObj} onDelete={deleteJob} price={price} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20">
                <p className="text-4xl mb-3">👈</p>
                <p className="text-sm">
                  {selectedJob === ALL_JOBS ? 'Select a job from the list to view details' : 'Select a job from the list'}
                </p>
              </div>
            )
          )}

          {tab === 'schedule' && (
            <ScheduleCalendar
              jobs={jobs}
              selectedJob={selectedJob === ALL_JOBS ? 'all' : selectedJob}
            />
          )}

          {tab === 'daily-logs' && (
            <DailyLogs
              jobs={jobs}
              selectedJob={selectedJob === ALL_JOBS ? 'all' : selectedJob}
            />
          )}
          {tab === 'tasks'      && <ComingSoon label="Tasks" />}
          {tab === 'files'      && <ComingSoon label="Files" />}
          {tab === 'templates'  && <ComingSoon label="Templates" />}
          {tab === 'tracking'   && (
            selectedJobObj ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <p className="text-5xl">📊</p>
                <h2 className="text-lg font-bold text-gray-800">{selectedJobObj.name || selectedJobObj.client_name}</h2>
                <p className="text-sm text-gray-400">Open the full tracker for this job</p>
                <Link
                  to={`/jobs/${selectedJobObj.id}/tracker`}
                  className="btn-primary px-6 py-2.5 text-sm rounded-lg"
                >
                  Open Tracker
                </Link>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20">
                <p className="text-4xl mb-3">👈</p>
                <p className="text-sm">Select a job from the list to open tracking</p>
              </div>
            )
          )}
        </div>
      </div>

      {/* ── Job Info Modal ─────────────────────────────────────── */}
      {jobModal && (
        <JobInfoModal
          job={jobModal}
          onClose={() => setJobModal(null)}
          onSaveName={updateJobName}
        />
      )}
    </div>
  )
}

function JobDetail({ job, onDelete, price }) {
  const statusInfo = {
    active:    { label: 'Active',    cls: 'bg-green-100 text-green-800 border border-green-300' },
    completed: { label: 'Completed', cls: 'bg-gray-100 text-gray-700 border border-gray-300'   },
    on_hold:   { label: 'On Hold',   cls: 'bg-yellow-100 text-yellow-800 border border-yellow-300' },
    cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-700 border border-red-300'      },
  }[job.status] || { label: 'Active', cls: 'bg-green-100 text-green-800 border border-green-300' }

  return (
    <div className="card h-full overflow-y-auto">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{job.name || job.client_name}</h2>
          <p className="text-sm text-gray-500">{job.client_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusInfo.cls}`}>{statusInfo.label}</span>
          <Link to={`/jobs/${job.id}`} className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors">Full View</Link>
          <Link to={`/jobs/${job.id}/tracker`} className="text-xs px-3 py-1.5 rounded-lg bg-green-700 text-white hover:bg-green-800 transition-colors">Track</Link>
          <button
            onClick={() => onDelete(job.id, job.name || job.client_name)}
            className="text-xs px-2 py-1.5 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
          >✕</button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-0.5">Job Total</p>
          <p className="font-bold text-gray-900">${price(job).toLocaleString()}</p>
        </div>
        {job.gross_profit > 0 && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-0.5">Gross Profit</p>
            <p className="font-bold text-green-700">${Math.round(job.gross_profit).toLocaleString()}</p>
          </div>
        )}
        {job.gpmd > 0 && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-0.5">GPMD</p>
            <p className="font-bold text-gray-700">${Math.round(job.gpmd).toLocaleString()}</p>
          </div>
        )}
        {job.sold_date && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-0.5">Sold Date</p>
            <p className="font-medium text-gray-700">{new Date(job.sold_date).toLocaleDateString()}</p>
          </div>
        )}
        {job.total_man_days > 0 && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-0.5">Man Days</p>
            <p className="font-medium text-gray-700">{parseFloat(job.total_man_days).toFixed(1)}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function ComingSoon({ label }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20">
      <p className="text-4xl mb-3">🚧</p>
      <p className="text-lg font-semibold text-gray-500">{label}</p>
      <p className="text-sm mt-1">Coming soon</p>
    </div>
  )
}

// ── Job Info / Edit Modal ─────────────────────────────────────
function JobInfoModal({ job, onClose, onSaveName }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(job.name || job.client_name || '')
  const [saving, setSaving]   = useState(false)
  const [error,  setError]    = useState('')

  // GPMD gauge: target $500/day is green zone
  const gpmd    = parseFloat(job.gpmd) || 0
  const target  = 500
  const pct     = Math.min(100, Math.round((gpmd / target) * 100))
  const barColor = pct >= 80 ? '#22c55e' : pct >= 50 ? '#eab308' : '#ef4444'

  async function handleSave() {
    const name = draft.trim()
    if (!name) { setError('Name cannot be empty.'); return }
    setSaving(true)
    const ok = await onSaveName(job.id, name)
    setSaving(false)
    if (ok) { setEditing(false); setError('') }
    else setError('Failed to save. Please try again.')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl shadow-xl w-[420px] overflow-hidden">

        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-gray-100 flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Job Info</p>
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  type="text"
                  value={draft}
                  onChange={e => { setDraft(e.target.value); setError('') }}
                  onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setEditing(false); setDraft(job.name || job.client_name || '') } }}
                  className="input text-base font-bold text-gray-900 py-1"
                />
              </div>
            ) : (
              <h2 className="text-lg font-bold text-gray-900">{job.name || job.client_name}</h2>
            )}
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 ml-3 mt-0.5">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">

          {/* Client name */}
          {job.client_name && job.client_name !== (job.name || '') && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Client</p>
              <p className="text-sm text-gray-700">{job.client_name}</p>
            </div>
          )}

          {/* Address */}
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Job Address</p>
            <p className="text-sm text-gray-700">{job.job_address || <span className="text-gray-300 italic">Not set</span>}</p>
          </div>

          {/* GPMD bar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-400">Estimated GPMD</p>
              <p className="text-sm font-bold text-gray-800">
                {gpmd > 0 ? `$${Math.round(gpmd).toLocaleString()} / day` : '—'}
              </p>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
              <div
                className="h-3 rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: barColor }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
              <span>$0</span>
              <span className="text-gray-300">Target: $500/day</span>
              <span>$500+</span>
            </div>
          </div>

          {/* Sold date + status */}
          <div className="flex gap-3">
            {job.sold_date && (
              <div className="flex-1 bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-0.5">Sold Date</p>
                <p className="text-sm font-medium text-gray-700">{new Date(job.sold_date).toLocaleDateString()}</p>
              </div>
            )}
            <div className="flex-1 bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-0.5">Status</p>
              <p className="text-sm font-medium text-gray-700 capitalize">{(job.status || 'active').replace('_', ' ')}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2">
          {editing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 btn-primary text-sm py-2 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Name'}
              </button>
              <button
                onClick={() => { setEditing(false); setDraft(job.name || job.client_name || ''); setError('') }}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => { setDraft(job.name || job.client_name || ''); setEditing(true) }}
                className="flex-1 btn-primary text-sm py-2"
              >
                Edit Name
              </button>
              <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
