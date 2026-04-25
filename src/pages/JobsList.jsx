import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ScheduleCalendar from '../components/ScheduleCalendar'
import DailyLogs from '../components/DailyLogs'
import TimeClock from '../components/TimeClock'
import WorkOrders from '../components/WorkOrders'

function MoveJobModal({ job, stages, onMove, onClose }) {
  const [selected, setSelected] = useState(job.stage_id || '__none__')
  const [saving, setSaving] = useState(false)

  async function handleMove() {
    setSaving(true)
    await onMove(job.id, selected === '__none__' ? null : selected)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xs p-5" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-bold text-gray-900 mb-1">Move Job</h3>
        <p className="text-xs text-gray-500 mb-4 truncate">{job.name || job.client_name}</p>

        <div className="space-y-1 mb-5">
          <label className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${selected === '__none__' ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
            <input type="radio" name="stage" value="__none__" checked={selected === '__none__'} onChange={() => setSelected('__none__')} className="accent-green-700" />
            <span className="text-xs font-medium text-gray-600">Unassigned</span>
          </label>
          {stages.map(s => (
            <label key={s.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${selected === s.id ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
              <input type="radio" name="stage" value={s.id} checked={selected === s.id} onChange={() => setSelected(s.id)} className="accent-green-700" />
              <span className="text-xs font-medium text-gray-700">{s.name}</span>
            </label>
          ))}
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 text-xs px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleMove}
            disabled={saving}
            className="flex-1 text-xs px-3 py-2 rounded-lg bg-green-700 text-white font-semibold hover:bg-green-800 transition-colors disabled:opacity-50"
          >
            {saving ? 'Moving…' : 'Move'}
          </button>
        </div>
      </div>
    </div>
  )
}

function JobItem({ job, stages, selectedJob, setSelectedJob, setJobModal, onMove }) {
  const [showMoveModal, setShowMoveModal] = useState(false)
  const btnCls = `flex-shrink-0 p-1 rounded transition-colors ${
    selectedJob === job.id ? 'text-green-500 hover:text-green-800 hover:bg-green-100' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-200'
  }`

  return (
    <>
      {showMoveModal && (
        <MoveJobModal
          job={job}
          stages={stages}
          onMove={onMove}
          onClose={() => setShowMoveModal(false)}
        />
      )}
      <div
        onClick={() => setSelectedJob(job.id)}
        className={`flex items-center gap-0.5 rounded-lg cursor-pointer transition-colors ${
          selectedJob === job.id ? 'bg-green-50 border border-green-200' : 'hover:bg-gray-100 border border-transparent'
        }`}
      >
        <button className="flex-1 text-left px-2 py-1.5 text-xs min-w-0">
          <p className={`font-medium truncate ${selectedJob === job.id ? 'text-green-800' : 'text-gray-700'}`}>
            {job.name || job.client_name}
          </p>
        </button>
        {/* Move stage button */}
        <button
          onClick={e => { e.stopPropagation(); setShowMoveModal(true) }}
          className={btnCls}
          title="Move to stage"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </button>
        {/* Edit button */}
        <button
          onClick={e => { e.stopPropagation(); setJobModal(job) }}
          className={`${btnCls} mr-1`}
          title="Edit job"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z" />
          </svg>
        </button>
      </div>
    </>
  )
}

function lastName(name = '') {
  const t = name.trim()
  if (t.includes(',')) return t.split(',')[0].trim().toLowerCase()
  const parts = t.split(/\s+/)
  return (parts[parts.length - 1] || '').toLowerCase()
}

const ALL_JOBS = '__all__'

export default function JobsList() {
  const [searchParams] = useSearchParams()
  const [jobs,       setJobs]       = useState([])
  const [loading,    setLoading]    = useState(true)
  const [selectedJob,setSelectedJob]= useState(ALL_JOBS)
  const [tab,        setTab]        = useState(() => searchParams.get('tab') || 'schedule')
  const [jobModal,   setJobModal]   = useState(null)
  const [search,     setSearch]     = useState('')
  const [stages,          setStages]          = useState([])
  const [dragOverStage,   setDragOverStage]   = useState(null)
  const [showExceptions,  setShowExceptions]  = useState(false)
  const [exceptionsCount, setExceptionsCount] = useState(0)

  useEffect(() => { fetchJobs(); fetchStages() }, [])

  // Sync tab when dock link changes the ?tab= URL param
  useEffect(() => {
    const t = searchParams.get('tab')
    if (t) setTab(t)
  }, [searchParams])

  async function fetchStages() {
    const { data } = await supabase.from('job_stages').select('*').order('sort_order')
    if (data) setStages(data)
  }

  async function addStage(name) {
    const maxOrder = stages.reduce((m, s) => Math.max(m, s.sort_order), 0)
    const { data } = await supabase.from('job_stages').insert({ name, sort_order: maxOrder + 1 }).select().single()
    if (data) setStages(prev => [...prev, data])
  }

  async function updateStage(id, name) {
    await supabase.from('job_stages').update({ name }).eq('id', id)
    setStages(prev => prev.map(s => s.id === id ? { ...s, name } : s))
  }

  async function deleteStage(id) {
    if (!confirm('Delete this stage? Jobs in this stage will become unassigned.')) return
    await supabase.from('jobs').update({ stage_id: null }).eq('stage_id', id)
    await supabase.from('job_stages').delete().eq('id', id)
    setStages(prev => prev.filter(s => s.id !== id))
    setJobs(prev => prev.map(j => j.stage_id === id ? { ...j, stage_id: null } : j))
  }

  async function reorderStages(reordered) {
    setStages(reordered)
    await Promise.all(reordered.map((s, i) =>
      supabase.from('job_stages').update({ sort_order: i + 1 }).eq('id', s.id)
    ))
  }

  async function moveJobToStage(jobId, stageId) {
    await supabase.from('jobs').update({ stage_id: stageId }).eq('id', jobId)
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, stage_id: stageId } : j))
  }

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

  async function updateJob(id, fields) {
    const { error } = await supabase.from('jobs').update(fields).eq('id', id)
    if (error) { console.error('updateJob:', error); return false }
    setJobs(prev => prev.map(j => j.id === id ? { ...j, ...fields } : j))
    setJobModal(prev => prev ? { ...prev, ...fields } : prev)
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

  const selectedJobObj = selectedJob === ALL_JOBS ? null : jobs.find(j => j.id === selectedJob) || null

  const TABS = [
    { key: 'schedule',      label: 'Schedule'      },
    { key: 'work-orders',   label: 'Work Orders'   },
    { key: 'tracking',      label: 'Tracking'      },
    { key: 'timeclock',     label: 'Time Clock'    },
    { key: 'daily-logs',    label: 'Daily Logs'    },
    { key: 'tasks',         label: 'Tasks'         },
    { key: 'change-orders', label: 'Change Orders' },
    { key: 'finance',       label: 'Finance'       },
    { key: 'files',         label: 'Files'         },
    { key: 'templates',     label: 'Templates'     },
    { key: 'settings',      label: '⚙️ Settings'   },
  ]

  return (
    <div className="flex flex-col h-full">

      {/* ── Page title ────────────────────────────────────────── */}
      <div className="mb-4 flex-shrink-0">
        <h1 className="text-xl font-bold text-gray-900">Jobs</h1>
      </div>

      {/* ── Mobile: job selector dropdown ─────────────────────── */}
      <div className="lg:hidden mb-2 flex-shrink-0">
        <select
          value={selectedJob}
          onChange={e => setSelectedJob(e.target.value)}
          className="input text-sm w-full"
        >
          <option value={ALL_JOBS}>All Jobs</option>
          {sorted.map(job => (
            <option key={job.id} value={job.id}>
              {job.name || job.client_name}
            </option>
          ))}
        </select>
      </div>

      {/* ── Menu bar ──────────────────────────────────────────── */}
      <div className="flex border-b border-gray-200 mb-4 pb-0 flex-shrink-0 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
              tab === t.key
                ? 'border-green-700 text-green-700 bg-green-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Main content: sidebar (desktop only) + right panel ── */}
      <div className="flex gap-2 flex-1 min-h-0">

        {/* Jobs sidebar — desktop only */}
        <div className="hidden lg:flex w-56 flex-shrink-0 flex-col min-h-0 -ml-6 pl-3">
          {/* Workday Exceptions button */}
          <button
            onClick={() => setShowExceptions(true)}
            className="w-full flex items-center gap-1.5 px-2.5 py-1.5 mb-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors flex-shrink-0"
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            <span className="flex-1 text-left">Workday Exceptions</span>
            {exceptionsCount > 0 && (
              <span className="bg-gray-200 text-gray-700 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none">
                {exceptionsCount}
              </span>
            )}
          </button>

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
            <div className="overflow-y-auto flex-1">
              {/* All Jobs button */}
              <button
                onClick={() => setSelectedJob(ALL_JOBS)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors border mb-1 ${
                  selectedJob === ALL_JOBS ? 'bg-green-50 border-green-200 text-green-800' : 'border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}
              >
                All Jobs
              </button>

              {/* Stage groups */}
              {(() => {
                // Build lookup: stageId → jobs, then alpha-numeric sort within each stage
                const byStage = {}
                stages.forEach(s => { byStage[s.id] = [] })
                byStage['__none__'] = []
                sorted.forEach(job => {
                  const key = job.stage_id && byStage[job.stage_id] ? job.stage_id : '__none__'
                  byStage[key].push(job)
                })
                Object.keys(byStage).forEach(key => {
                  byStage[key].sort((a, b) =>
                    (a.name || a.client_name || '').localeCompare(
                      b.name || b.client_name || '', undefined, { numeric: true, sensitivity: 'base' }
                    )
                  )
                })


                const StageSection = ({ stageId, label }) => {
                  const stageJobs = byStage[stageId] || []
                  const isOver = dragOverStage === stageId && dragJobId
                  return (
                    <div
                      onDragOver={e => { e.preventDefault(); setDragOverStage(stageId) }}
                      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverStage(null) }}
                      onDrop={e => {
                        e.preventDefault()
                        if (dragJobId) moveJobToStage(dragJobId, stageId === '__none__' ? null : stageId)
                        setDragJobId(null); setDragOverStage(null)
                      }}
                      className={`mb-1 rounded-lg transition-colors ${isOver ? 'bg-green-50 ring-1 ring-green-300' : ''}`}
                    >
                      <div className="flex items-center gap-1.5 px-2 pt-2 pb-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide truncate flex-1">{label}</span>
                        {stageJobs.length > 0 && (
                          <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5 leading-none">{stageJobs.length}</span>
                        )}
                      </div>
                      <div className="space-y-0.5 px-0.5 min-h-[4px]">
                        {stageJobs.map(job => (
                          <JobItem
                            key={job.id}
                            job={job}
                            stages={stages}
                            selectedJob={selectedJob}
                            setSelectedJob={setSelectedJob}
                            setJobModal={setJobModal}
                            onMove={moveJobToStage}
                          />
                        ))}
                        {stageJobs.length === 0 && isOver && (
                          <div className="h-6 rounded border-2 border-dashed border-green-300 mx-1" />
                        )}
                      </div>
                    </div>
                  )
                }

                return (
                  <>
                    {byStage['__none__'].length > 0 && <StageSection stageId="__none__" label="Unassigned" />}
                    {stages.map(s => <StageSection key={s.id} stageId={s.id} label={s.name} />)}
                    {sorted.length === 0 && <p className="text-xs text-gray-400 text-center py-6">No jobs found.</p>}
                  </>
                )
              })()}
            </div>
          )}
        </div>

        {/* Right panel — only thing that scrolls */}
        <div className="flex-1 min-w-0 overflow-y-auto lg:-mr-6">

          {tab === 'schedule' && (
            <ScheduleCalendar
              jobs={jobs}
              selectedJob={selectedJob === ALL_JOBS ? 'all' : selectedJob}
              showExceptionsExternal={showExceptions}
              onSetShowExceptions={setShowExceptions}
              onExceptionsLoaded={setExceptionsCount}
            />
          )}

          {tab === 'work-orders' && (
            <WorkOrders
              jobs={jobs}
              selectedJob={selectedJob === ALL_JOBS ? 'all' : selectedJob}
            />
          )}

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
                <p className="text-4xl mb-3">👆</p>
                <p className="text-sm">Select a job from the list to open tracking</p>
              </div>
            )
          )}

          {tab === 'timeclock'  && (
            <TimeClock
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
          {tab === 'tasks'          && <ComingSoon label="Tasks" />}
          {tab === 'change-orders'  && <ComingSoon label="Change Orders" />}
          {tab === 'finance'        && <ComingSoon label="Finance" />}
          {tab === 'files'          && <ComingSoon label="Files" />}
          {tab === 'templates'      && <ComingSoon label="Templates" />}
          {tab === 'settings'       && (
            <JobScheduleSettings
              stages={stages}
              onAddStage={addStage}
              onUpdateStage={updateStage}
              onDeleteStage={deleteStage}
              onReorderStages={reorderStages}
            />
          )}
        </div>
      </div>

      {/* ── Job Info Modal ─────────────────────────────────────── */}
      {jobModal && (
        <JobInfoModal
          job={jobModal}
          onClose={() => setJobModal(null)}
          onSave={updateJob}
          onDelete={async (id, name) => {
            await deleteJob(id, name)
            setJobModal(null)
          }}
        />
      )}
    </div>
  )
}

function JobDetail({ job, onDelete, price, onEdit }) {
  const statusInfo = {
    active:    { label: 'Active',    cls: 'bg-green-100 text-green-800 border border-green-300' },
    completed: { label: 'Completed', cls: 'bg-gray-100 text-gray-700 border border-gray-300'   },
    on_hold:   { label: 'On Hold',   cls: 'bg-yellow-100 text-yellow-800 border border-yellow-300' },
    cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-700 border border-red-300'      },
  }[job.status] || { label: 'Active', cls: 'bg-green-100 text-green-800 border border-green-300' }

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-4 gap-2">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{job.name || job.client_name}</h2>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusInfo.cls}`}>{statusInfo.label}</span>
          <Link to={`/jobs/${job.id}`} className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors">Full View</Link>
          <Link to={`/jobs/${job.id}/tracker`} className="text-xs px-2.5 py-1.5 rounded-lg bg-green-700 text-white hover:bg-green-800 transition-colors">Track</Link>
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

// ── 50-color palette (exported for use in MasterCrews + ScheduleCalendar) ────
export const COLOR_PALETTE = [
  '#ef4444','#dc2626','#b91c1c','#f97316','#ea580c','#c2410c',
  '#f59e0b','#d97706','#b45309','#eab308','#ca8a04','#92400e',
  '#84cc16','#65a30d','#4d7c0f','#22c55e','#16a34a','#166534',
  '#10b981','#059669','#065f46','#14b8a6','#0d9488','#0f766e',
  '#06b6d4','#0891b2','#155e75','#0ea5e9','#0284c7','#075985',
  '#3b82f6','#2563eb','#1d4ed8','#6366f1','#4f46e5','#4338ca',
  '#8b5cf6','#7c3aed','#6d28d9','#a855f7','#9333ea','#7e22ce',
  '#d946ef','#c026d3','#a21caf','#ec4899','#db2777','#be185d',
  '#f43f5e','#000000',
]

// ── Color Dropdown Picker ─────────────────────────────────────────────────────
function ColorDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-2.5 py-1.5 border border-gray-300 rounded-lg bg-white hover:border-gray-400 transition-colors"
      >
        <span className="w-5 h-5 rounded-full border border-gray-200 flex-shrink-0" style={{ backgroundColor: value }} />
        <span className="font-mono text-gray-700 text-xs">{value}</span>
        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 left-0 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-52">
          <div className="flex flex-wrap gap-1.5">
            {COLOR_PALETTE.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => { onChange(c); setOpen(false) }}
                style={{ backgroundColor: c }}
                className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${value === c ? 'ring-2 ring-offset-1 ring-gray-600 scale-110' : ''}`}
                title={c}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const WEEK_DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

function getWeekRangeStr(startDay) {
  const today = new Date()
  const diff = (today.getDay() - startDay + 7) % 7
  const start = new Date(today); start.setDate(today.getDate() - diff); start.setHours(0,0,0,0)
  const end   = new Date(start); end.setDate(start.getDate() + 6)
  const fmt = d => d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })
  return `${fmt(start)} – ${fmt(end)}`
}

// ── Job Schedule Settings ─────────────────────────────────────────────────────
function JobScheduleSettings({ stages = [], onAddStage, onUpdateStage, onDeleteStage, onReorderStages }) {
  const [defaultColor,    setDefaultColor]    = useState('#15803d')
  const [saving,          setSaving]          = useState(false)
  const [saved,           setSaved]           = useState(false)
  const [payrollWeekStart,setPayrollWeekStart] = useState(0)
  const [savingPayroll,   setSavingPayroll]   = useState(false)
  const [savedPayroll,    setSavedPayroll]    = useState(false)
  const [newStage,        setNewStage]        = useState('')
  const [editingId,       setEditingId]       = useState(null)
  const [editingName,     setEditingName]     = useState('')
  const [dragIdx,         setDragIdx]         = useState(null)
  const [dragOverIdx,     setDragOverIdx]     = useState(null)

  useEffect(() => {
    supabase.from('company_settings').select('value').eq('key', 'default_schedule_color').single()
      .then(({ data }) => { if (data?.value) setDefaultColor(data.value) })
    supabase.from('company_settings').select('payroll_week_start').maybeSingle()
      .then(({ data }) => { if (data?.payroll_week_start != null) setPayrollWeekStart(data.payroll_week_start) })
  }, [])

  async function handleSaveColor() {
    setSaving(true); setSaved(false)
    await supabase.from('company_settings').upsert({ key: 'default_schedule_color', value: defaultColor })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleSavePayroll() {
    setSavingPayroll(true); setSavedPayroll(false)
    await supabase.from('company_settings').update({ payroll_week_start: payrollWeekStart }).not('id', 'is', null)
    setSavingPayroll(false); setSavedPayroll(true)
    setTimeout(() => setSavedPayroll(false), 2000)
  }

  function handleStageDragStart(idx) { setDragIdx(idx) }

  function handleStageDrop(toIdx) {
    if (dragIdx === null || dragIdx === toIdx) return
    const reordered = [...stages]
    const [moved] = reordered.splice(dragIdx, 1)
    reordered.splice(toIdx, 0, moved)
    onReorderStages(reordered)
    setDragIdx(null); setDragOverIdx(null)
  }

  return (
    <div className="max-w-2xl space-y-6">

      {/* Default color */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-bold text-gray-800 mb-1">Schedule Item Default Color</h2>
        <p className="text-sm text-gray-500 mb-4">Default background color for new schedule items.</p>
        <div className="flex items-center gap-4">
          <ColorDropdown value={defaultColor} onChange={setDefaultColor} />
          <button onClick={handleSaveColor} disabled={saving}
            className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
          </button>
        </div>
      </div>

      {/* Payroll Week */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-bold text-gray-800 mb-1">Payroll Week</h2>
        <p className="text-sm text-gray-500 mb-4">
          Select the day your work week begins. Weekly hour totals on the time clock are calculated from this day.
        </p>
        <div className="flex items-center gap-4 flex-wrap">
          <select
            value={payrollWeekStart}
            onChange={e => setPayrollWeekStart(Number(e.target.value))}
            className="input text-sm"
          >
            {WEEK_DAYS.map((d, i) => (
              <option key={i} value={i}>{d}</option>
            ))}
          </select>
          <button
            onClick={handleSavePayroll}
            disabled={savingPayroll}
            className="btn-primary text-sm px-4 py-2 disabled:opacity-50"
          >
            {savingPayroll ? 'Saving…' : savedPayroll ? '✓ Saved' : 'Save'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Current week: <span className="font-medium text-gray-600">{getWeekRangeStr(payrollWeekStart)}</span>
        </p>
      </div>

      {/* Job Stages */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-bold text-gray-800 mb-1">Job Stages</h2>
        <p className="text-sm text-gray-500 mb-4">
          Stages group jobs in the sidebar. Drag to reorder.
        </p>

        {/* Add new stage */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newStage}
            onChange={e => setNewStage(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newStage.trim()) { onAddStage(newStage.trim()); setNewStage('') } }}
            placeholder="New stage name…"
            className="input text-sm flex-1"
          />
          <button
            onClick={() => { if (newStage.trim()) { onAddStage(newStage.trim()); setNewStage('') } }}
            className="btn-primary text-sm px-4 py-2"
          >
            Add
          </button>
        </div>

        {/* Stage list */}
        <div className="space-y-1.5">
          {stages.map((stage, idx) => (
            <div
              key={stage.id}
              draggable
              onDragStart={() => handleStageDragStart(idx)}
              onDragOver={e => { e.preventDefault(); setDragOverIdx(idx) }}
              onDragLeave={() => setDragOverIdx(null)}
              onDrop={() => handleStageDrop(idx)}
              onDragEnd={() => { setDragIdx(null); setDragOverIdx(null) }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                dragOverIdx === idx && dragIdx !== idx
                  ? 'border-green-400 bg-green-50'
                  : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
              } ${dragIdx === idx ? 'opacity-40' : ''}`}
            >
              {/* Drag handle */}
              <span className="text-gray-300 cursor-grab active:cursor-grabbing flex-shrink-0" title="Drag to reorder">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                </svg>
              </span>

              {/* Sort order badge */}
              <span className="text-[10px] font-bold text-gray-400 w-4 text-center flex-shrink-0">{idx + 1}</span>

              {/* Name / edit field */}
              {editingId === stage.id ? (
                <input
                  autoFocus
                  type="text"
                  value={editingName}
                  onChange={e => setEditingName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { onUpdateStage(stage.id, editingName.trim()); setEditingId(null) }
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  onBlur={() => { onUpdateStage(stage.id, editingName.trim()); setEditingId(null) }}
                  className="input text-sm flex-1 py-0.5"
                />
              ) : (
                <span className="flex-1 text-sm font-medium text-gray-700">{stage.name}</span>
              )}

              {/* Edit / Delete */}
              <button
                onClick={() => { setEditingId(stage.id); setEditingName(stage.name) }}
                className="text-gray-400 hover:text-gray-700 p-1 rounded hover:bg-gray-200 transition-colors"
                title="Rename"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z" />
                </svg>
              </button>
              <button
                onClick={() => onDeleteStage(stage.id)}
                className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                title="Delete"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          {stages.length === 0 && (
            <p className="text-sm text-gray-400 italic text-center py-4">No stages yet — add one above.</p>
          )}
        </div>
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

// ── Job Info / Edit Modal — 3-tab design ──────────────────────
function JobInfoModal({ job, onClose, onSave, onDelete }) {
  const [activeTab, setActiveTab] = useState('info')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')
  const [employees, setEmployees] = useState([])

  // Job Info tab fields
  const [status,         setStatus]         = useState(job.status || 'active')
  const [jobTitle,       setJobTitle]        = useState(job.name || job.client_name || '')
  const [address,        setAddress]         = useState(job.job_address || '')
  const [consultant,     setConsultant]      = useState(job.consultant || '')
  const [projectManager, setProjectManager]  = useState(job.project_manager || '')

  useEffect(() => {
    supabase.from('employees')
      .select('id, first_name, last_name')
      .eq('status', 'active')
      .order('last_name')
      .then(({ data }) => { if (data) setEmployees(data) })
  }, [])

  const employeeOptions = employees.map(e => ({
    value: `${e.first_name} ${e.last_name}`.trim(),
    label: `${e.last_name}, ${e.first_name}`.trim(),
  }))

  async function handleSave() {
    if (!jobTitle.trim()) { setError('Job title cannot be empty.'); return }
    setSaving(true)
    setError('')
    const ok = await onSave(job.id, {
      name:            jobTitle.trim(),
      status,
      job_address:     address.trim(),
      consultant:      consultant || null,
      project_manager: projectManager || null,
    })
    setSaving(false)
    if (!ok) setError('Failed to save. Please try again.')
  }

  const TABS = [
    { key: 'info',      label: 'Job Info' },
    { key: 'client',    label: 'Client' },
    { key: 'employees', label: 'Employees' },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-[480px] overflow-hidden flex flex-col" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-start justify-between flex-shrink-0">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">Job</p>
            <h2 className="text-lg font-bold text-gray-900 truncate">{job.name || job.client_name}</h2>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 ml-3 mt-0.5 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-gray-100 px-5 flex-shrink-0">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-2.5 mr-5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-green-600 text-green-700'
                  : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="overflow-y-auto flex-1">

          {/* ── Job Info tab ── */}
          {activeTab === 'info' && (
            <div className="px-5 py-4 space-y-5">

              {/* Main Details */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Main Details</p>
                <div className="space-y-3">

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Status</label>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value)}
                      className="input text-sm w-full"
                    >
                      <option value="active">Open</option>
                      <option value="completed">Closed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Job Title</label>
                    <input
                      type="text"
                      value={jobTitle}
                      onChange={e => { setJobTitle(e.target.value); setError('') }}
                      className="input text-sm w-full"
                      placeholder="Job name"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Address</label>
                    <input
                      type="text"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      className="input text-sm w-full"
                      placeholder="Job address"
                    />
                  </div>

                </div>
              </div>

              {/* More Details */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">More Details</p>
                <div className="space-y-3">

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Consultant</label>
                    <select
                      value={consultant}
                      onChange={e => setConsultant(e.target.value)}
                      className="input text-sm w-full"
                    >
                      <option value="">— Select consultant —</option>
                      {employeeOptions.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Project Manager</label>
                    <select
                      value={projectManager}
                      onChange={e => setProjectManager(e.target.value)}
                      className="input text-sm w-full"
                    >
                      <option value="">— Select project manager —</option>
                      {employeeOptions.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                </div>
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          )}

          {/* ── Client tab ── */}
          {activeTab === 'client' && (
            <div className="px-5 py-4 space-y-3">
              {job.client_name && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Client</p>
                  <p className="text-sm font-medium text-gray-800">{job.client_name}</p>
                </div>
              )}
              {job.job_address && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Job Address</p>
                  <p className="text-sm text-gray-700">{job.job_address}</p>
                </div>
              )}
              <p className="text-xs text-gray-400 italic pt-2">Additional client details coming soon.</p>
            </div>
          )}

          {/* ── Employees tab ── */}
          {activeTab === 'employees' && (
            <div className="px-5 py-4">
              {(consultant || projectManager) ? (
                <div className="space-y-3">
                  {consultant && (
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Consultant</p>
                      <p className="text-sm font-medium text-gray-800">{consultant}</p>
                    </div>
                  )}
                  {projectManager && (
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Project Manager</p>
                      <p className="text-sm font-medium text-gray-800">{projectManager}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No employees assigned yet. Set them in the Job Info tab.</p>
              )}
              <p className="text-xs text-gray-400 italic pt-4">Full employee assignment coming soon.</p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 flex-shrink-0">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 btn-primary text-sm py-2 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Close
          </button>
          <button
            onClick={() => onDelete(job.id, job.name || job.client_name)}
            className="px-4 py-2 text-sm rounded-lg border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
