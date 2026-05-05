import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import ScheduleCalendar from '../components/ScheduleCalendar'
import DailyLogs from '../components/DailyLogs'
import TimeClock from '../components/TimeClock'
import WorkOrders from '../components/WorkOrders'
import JobComparison from '../components/JobComparison'
import TemplatesManager from '../components/TemplatesManager'
import COEstimatePanel  from '../components/COEstimatePanel'
import JobInfoModal     from '../components/JobInfoModal'

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
          <p className={`font-bold truncate ${selectedJob === job.id ? 'text-green-800' : 'text-gray-800'}`}>
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
  const [showExceptions,    setShowExceptions]    = useState(false)
  const [exceptionsCount,   setExceptionsCount]   = useState(0)
  const [addScheduleTrigger, setAddScheduleTrigger] = useState(0)

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
      {/* `flex-nowrap` + `overflow-x-auto` lets the tab row scroll horizontally
          on mobile instead of squishing the underlines together. Each tab has
          breathing room so the active underline always looks distinct. */}
      <div className="flex flex-nowrap border-b border-gray-200 mb-4 pb-0 flex-shrink-0 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-thin">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
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
        <div className="hidden lg:flex w-56 flex-shrink-0 flex-col min-h-0 -ml-6 pl-3 bg-white border-r border-gray-200">
          {/* Add Schedule button — only visible on Schedule tab */}
          {tab === 'schedule' && (
            <button
              onClick={() => setAddScheduleTrigger(v => v + 1)}
              className="w-full flex items-center gap-1.5 px-2.5 py-1.5 mb-2 rounded-lg bg-green-700 text-white text-xs font-semibold hover:bg-green-800 transition-colors flex-shrink-0"
            >
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="flex-1 text-left">Add Schedule</span>
            </button>
          )}

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
                      <div className="flex items-center gap-1.5 px-2 pt-1.5 pb-1">
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide truncate flex-1 bg-gray-100 rounded px-2 py-0.5">{label}</span>
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

        {/* Right panel — only thing that scrolls. overflow-x-hidden traps any
            tiny horizontal overflow from inner cards on mobile. */}
        <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden lg:-mr-6">

          {tab === 'schedule' && (
            <ScheduleCalendar
              jobs={jobs}
              selectedJob={selectedJob === ALL_JOBS ? 'all' : selectedJob}
              showExceptionsExternal={showExceptions}
              onSetShowExceptions={setShowExceptions}
              onExceptionsLoaded={setExceptionsCount}
              addScheduleTrigger={addScheduleTrigger}
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
              <JobComparison job={selectedJobObj} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20">
                <p className="text-4xl mb-3">📊</p>
                <p className="text-sm">Select a job to view the comparison</p>
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
          {tab === 'tasks'          && <JobTasksPanel job={selectedJobObj} />}
          {tab === 'change-orders'  && <JobChangeOrdersPanel job={selectedJobObj} />}
          {tab === 'finance'        && <ComingSoon label="Finance" />}
          {tab === 'files'          && <JobFilesPanel job={selectedJobObj} />}
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
    <div className="card bg-blue-50">
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
        <div className="bg-white rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-0.5">Job Total</p>
          <p className="font-bold text-gray-900">${price(job).toLocaleString()}</p>
        </div>
        {job.gross_profit > 0 && (
          <div className="bg-white rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-0.5">Gross Profit</p>
            <p className="font-bold text-green-700">${Math.round(job.gross_profit).toLocaleString()}</p>
          </div>
        )}
        {job.gpmd > 0 && (
          <div className="bg-white rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-0.5">GPMD</p>
            <p className="font-bold text-gray-700">${Math.round(job.gpmd).toLocaleString()}</p>
          </div>
        )}
        {job.sold_date && (
          <div className="bg-white rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-0.5">Sold Date</p>
            <p className="font-medium text-gray-700">{new Date(job.sold_date).toLocaleDateString()}</p>
          </div>
        )}
        {job.total_man_days > 0 && (
          <div className="bg-white rounded-lg p-3">
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
  const [settingsTab,     setSettingsTab]     = useState('general')
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
    <div className="space-y-4">
      {/* Settings sub-tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-2">
        {[
          { key: 'general',   label: '⚙️ General'   },
          { key: 'templates', label: '📋 Templates'  },
        ].map(t => (
          <button key={t.key} onClick={() => setSettingsTab(t.key)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              settingsTab === t.key ? 'border-green-700 text-green-800' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >{t.label}</button>
        ))}
      </div>

      {settingsTab === 'templates' && <TemplatesManager />}

      {settingsTab === 'general' && <div className="max-w-2xl space-y-6">

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

      </div>}
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

// ── Apply Template Modal ──────────────────────────────────────────────────────
function ApplyTemplateModal({ job, onClose, onApplied }) {
  const [templates,   setTemplates]   = useState([])
  const [selectedId,  setSelectedId]  = useState('')
  const [preview,     setPreview]     = useState(null)
  const [checks,      setChecks]      = useState({ doc: {}, photo: {}, tasks: {} })
  const [saving,      setSaving]      = useState(false)

  useEffect(() => {
    supabase.from('job_templates')
      .select('id, name, auto_trigger, template_folders(*), template_tasks(*)')
      .order('name')
      .then(({ data }) => { if (data) setTemplates(data) })
  }, [])

  function handleSelectTemplate(id) {
    setSelectedId(id)
    if (!id) { setPreview(null); return }
    const tmpl = templates.find(t => t.id === id)
    const docFolders   = (tmpl?.template_folders || []).filter(f => f.folder_type !== 'photo_video').sort((a, b) => a.sort_order - b.sort_order)
    const photoFolders = (tmpl?.template_folders || []).filter(f => f.folder_type === 'photo_video').sort((a, b) => a.sort_order - b.sort_order)
    const tasks        = (tmpl?.template_tasks   || []).sort((a, b) => a.sort_order - b.sort_order)
    setPreview({ docFolders, photoFolders, tasks, tmplId: id })
    const cd = {}; docFolders.forEach(f => { cd[f.id] = true })
    const cp = {}; photoFolders.forEach(f => { cp[f.id] = true })
    const ct = {}; tasks.forEach(t => { ct[t.id] = true })
    setChecks({ doc: cd, photo: cp, tasks: ct })
  }

  function toggle(section, id) {
    setChecks(prev => ({ ...prev, [section]: { ...prev[section], [id]: !prev[section][id] } }))
  }

  function toggleAll(section, items, idField) {
    const allChecked = items.every(x => checks[section][x[idField]])
    const next = {}
    items.forEach(x => { next[x[idField]] = !allChecked })
    setChecks(prev => ({ ...prev, [section]: next }))
  }

  const selectedCount = preview
    ? Object.values(checks.doc).filter(Boolean).length
    + Object.values(checks.photo).filter(Boolean).length
    + Object.values(checks.tasks).filter(Boolean).length
    : 0

  async function handleSave() {
    if (!preview || !job?.id) return
    setSaving(true)

    const docToCreate   = preview.docFolders.filter(f => checks.doc[f.id])
    const photoToCreate = preview.photoFolders.filter(f => checks.photo[f.id])
    const tasksToCreate = preview.tasks.filter(t => checks.tasks[t.id])

    const folderInserts = [
      ...docToCreate.map((f, i)   => ({ job_id: job.id, folder_name: f.folder_name, folder_type: 'document',   template_id: preview.tmplId, sort_order: i })),
      ...photoToCreate.map((f, i) => ({ job_id: job.id, folder_name: f.folder_name, folder_type: 'photo_video', template_id: preview.tmplId, sort_order: i })),
    ]
    if (folderInserts.length) await supabase.from('job_folders').insert(folderInserts)
    if (tasksToCreate.length) {
      await supabase.from('job_tasks').insert(
        tasksToCreate.map((t, i) => ({ job_id: job.id, task_name: t.task_name, template_id: preview.tmplId, sort_order: i, status: 'pending' }))
      )
    }
    setSaving(false)
    onApplied()
  }

  const CheckList = ({ items, section, idField, nameField, icon }) => {
    if (!items.length) return null
    const allChecked = items.every(x => checks[section][x[idField]])
    return (
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">{icon} {section === 'doc' ? 'Document Folders' : section === 'photo' ? 'Photo / Video Folders' : 'Tasks'}</p>
          <button onClick={() => toggleAll(section, items, idField)} className="text-[11px] text-blue-500 hover:text-blue-700">
            {allChecked ? 'Uncheck all' : 'Check all'}
          </button>
        </div>
        <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
          {items.map((item, i) => (
            <label key={item[idField]} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-white transition-colors ${i < items.length - 1 ? 'border-b border-gray-100' : ''}`}>
              <input
                type="checkbox"
                checked={!!checks[section][item[idField]]}
                onChange={() => toggle(section, item[idField])}
                className="accent-green-700 w-4 h-4 flex-shrink-0 rounded"
              />
              <span className="text-sm text-gray-700">{icon === '📁' || icon === '📸' ? '📁 ' : ''}{item[nameField]}</span>
            </label>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden" style={{ maxHeight: '88vh' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="bg-green-700 px-6 py-4 flex-shrink-0">
          <h2 className="text-white font-bold text-lg">Apply Job Template</h2>
          <p className="text-green-200 text-xs mt-0.5">
            Select what to create for <span className="font-semibold text-white">{job?.name || job?.client_name}</span>
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Template selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Template</label>
            <select
              value={selectedId}
              onChange={e => handleSelectTemplate(e.target.value)}
              className="input w-full"
            >
              <option value="">Choose a template…</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name}{t.auto_trigger === 'sold_bid' ? ' (Auto)' : ''}</option>
              ))}
            </select>
            {templates.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">No templates yet — create one in Jobs → Settings → Templates.</p>
            )}
          </div>

          {/* Preview with checkboxes */}
          {preview && (
            <>
              {preview.docFolders.length === 0 && preview.photoFolders.length === 0 && preview.tasks.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4 bg-gray-50 rounded-xl">This template has no folders or tasks defined.</p>
              ) : (
                <>
                  <CheckList items={preview.docFolders}   section="doc"   idField="id" nameField="folder_name" icon="📄" />
                  <CheckList items={preview.photoFolders} section="photo" idField="id" nameField="folder_name" icon="📸" />
                  <CheckList items={preview.tasks}        section="tasks" idField="id" nameField="task_name"   icon="✅" />
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !preview || selectedCount === 0}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-green-700 hover:bg-green-800 disabled:opacity-50"
          >
            {saving ? 'Creating…' : selectedCount > 0 ? `Create ${selectedCount} Item${selectedCount !== 1 ? 's' : ''}` : 'Nothing Selected'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Job Files Panel ─────────────────────────────────── Documents + Photos tabs
// ── Folder SVG icon ───────────────────────────────────────────────────────────
function FolderIcon({ color = '#f59e0b', size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 10C4 8.343 5.343 7 7 7H18.586C19.116 7 19.625 7.211 20 7.586L23.414 11H41C42.657 11 44 12.343 44 14V38C44 39.657 42.657 41 41 41H7C5.343 41 4 39.657 4 38V10Z"
        fill={color} />
      <path d="M4 18C4 16.343 5.343 15 7 15H41C42.657 15 44 16.343 44 18V38C44 39.657 42.657 41 41 41H7C5.343 41 4 39.657 4 38V18Z"
        fill={color === '#f59e0b' ? '#fbbf24' : color === '#60a5fa' ? '#93c5fd' : '#fbbf24'} />
    </svg>
  )
}

// ── File card ─────────────────────────────────────────────────────────────────
function FileCard({ f, onDelete, fmtSize }) {
  const isImg = f.file_type?.startsWith('image/')
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm group">
      {isImg && f.publicUrl ? (
        <a href={f.publicUrl} target="_blank" rel="noopener noreferrer">
          <img src={f.publicUrl} alt={f.file_name} className="w-full h-28 object-cover hover:opacity-90 transition-opacity" />
        </a>
      ) : (
        <div className="w-full h-28 bg-gray-50 flex items-center justify-center text-4xl">
          {f.file_type?.startsWith('video/') ? '🎥' : f.file_type === 'application/pdf' ? '📄' : '📎'}
        </div>
      )}
      <div className="p-2.5">
        <p className="text-xs font-medium text-gray-800 truncate" title={f.file_name}>{f.file_name}</p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-gray-400">{fmtSize(f.file_size)}</span>
          <div className="flex items-center gap-1.5">
            {f.publicUrl && (
              <a href={f.publicUrl} download={f.file_name} className="text-[10px] text-blue-600 hover:text-blue-800 font-medium">⬇</a>
            )}
            <button onClick={() => onDelete(f)} className="text-[10px] text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
          </div>
        </div>
        {f.source === 'buildertrend' && <span className="text-[9px] text-purple-500 font-medium">BuilderTrend</span>}
      </div>
    </div>
  )
}

function JobFilesPanel({ job }) {
  const { user } = useAuth()
  const [subTab,        setSubTab]        = useState('documents')
  const [files,         setFiles]         = useState([])
  const [filesLoading,  setFilesLoading]  = useState(false)
  const [folders,       setFolders]       = useState([])
  const [uploading,     setUploading]     = useState(false)
  const [addingFolder,  setAddingFolder]  = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [savingFolder,  setSavingFolder]  = useState(false)
  const [showModal,     setShowModal]     = useState(false)
  // folder navigation stack: [{id, name}] — empty = root
  const [folderStack,   setFolderStack]   = useState([])

  // Current folder id (null = root)
  const currentFolderId = folderStack.length > 0 ? folderStack[folderStack.length - 1].id : null

  useEffect(() => {
    if (job?.id) { fetchFiles(job.id); fetchFolders(job.id) }
    else { setFiles([]); setFolders([]) }
    setFolderStack([])
  }, [job?.id])

  // Reset folder stack when switching sub-tabs
  useEffect(() => { setFolderStack([]) }, [subTab])

  async function fetchFiles(jobId) {
    setFilesLoading(true)
    const { data } = await supabase.from('job_files').select('*').eq('job_id', jobId).order('uploaded_at', { ascending: false })
    if (data) setFiles(data.map(f => ({
      ...f,
      publicUrl: supabase.storage.from('job-files').getPublicUrl(f.storage_path).data?.publicUrl || null,
    })))
    setFilesLoading(false)
  }

  async function fetchFolders(jobId) {
    const { data } = await supabase.from('job_folders').select('*').eq('job_id', jobId).order('sort_order')
    if (data) setFolders(data)
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file || !job?.id) return
    setUploading(true)
    const path = `jobs/${job.id}/${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from('job-files').upload(path, file)
    if (!error) {
      const isMedia = file.type?.startsWith('image/') || file.type?.startsWith('video/')
      await supabase.from('job_files').insert({
        job_id: job.id,
        file_name: file.name,
        file_type: file.type,
        file_category: isMedia ? 'photo' : 'document',
        storage_path: path,
        file_size: file.size,
        source: 'manual',
        uploaded_by: user?.id,
        folder_id: currentFolderId || null,
      })
      fetchFiles(job.id)
    }
    setUploading(false)
    e.target.value = ''
  }

  async function handleDeleteFile(f) {
    if (!confirm(`Delete "${f.file_name}"?`)) return
    await supabase.storage.from('job-files').remove([f.storage_path])
    await supabase.from('job_files').delete().eq('id', f.id)
    setFiles(prev => prev.filter(x => x.id !== f.id))
  }

  async function handleAddFolder() {
    if (!newFolderName.trim() || !job?.id) return
    setSavingFolder(true)
    const folderType = subTab === 'documents' ? 'document' : 'photo_video'
    const existing   = folders.filter(f => f.parent_folder_id === currentFolderId && f.folder_type === folderType).length
    const { data } = await supabase.from('job_folders').insert({
      job_id: job.id,
      folder_name: newFolderName.trim(),
      folder_type: folderType,
      sort_order: existing,
      parent_folder_id: currentFolderId || null,
    }).select().single()
    if (data) setFolders(prev => [...prev, data])
    setNewFolderName(''); setAddingFolder(false); setSavingFolder(false)
  }

  async function handleRemoveFolder(id) {
    if (!confirm('Remove this folder? Files inside will become unorganized.')) return
    await supabase.from('job_folders').delete().eq('id', id)
    setFolders(prev => prev.filter(f => f.id !== id))
    // If removed folder is in our stack, pop back to parent
    if (folderStack.some(f => f.id === id)) {
      setFolderStack(prev => prev.slice(0, prev.findIndex(f => f.id === id)))
    }
  }

  function fmtSize(bytes) {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  const isMedia      = f => f.file_type?.startsWith('image/') || f.file_type?.startsWith('video/')
  const uploadAccept  = subTab === 'documents' ? '.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip' : 'image/*,video/*'
  const folderIconColor = subTab === 'documents' ? '#f59e0b' : '#60a5fa'

  // Folders visible at current depth
  const activeFolders = folders.filter(f =>
    f.folder_type !== 'photo_video' === (subTab === 'documents') &&
    (f.parent_folder_id ?? null) === currentFolderId
  )

  // Files scoped to current view
  const allTabFiles  = files.filter(f => subTab === 'documents' ? !isMedia(f) : isMedia(f))
  const visibleFiles = currentFolderId
    ? allTabFiles.filter(f => f.folder_id === currentFolderId)
    : allTabFiles.filter(f => !f.folder_id)

  const rootIsEmpty   = !filesLoading && activeFolders.length === 0 && visibleFiles.length === 0
  const folderIsEmpty = !filesLoading && visibleFiles.length === 0

  if (!job) return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20">
      <p className="text-4xl mb-3">📁</p>
      <p className="text-lg font-semibold text-gray-500">Select a job to view files</p>
      <p className="text-sm mt-1">Choose a job from the sidebar</p>
    </div>
  )

  return (
    <div className="p-4">
      {showModal && (
        <ApplyTemplateModal
          job={job}
          onClose={() => setShowModal(false)}
          onApplied={() => { setShowModal(false); fetchFolders(job.id); fetchFiles(job.id) }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Files</h2>
          <p className="text-xs text-gray-400">{job.client_name || job.name}</p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-4">
        {[{ key: 'documents', label: '📄 Documents' }, { key: 'photos', label: '📸 Photos / Videos' }].map(t => (
          <button key={t.key}
            onClick={() => { setSubTab(t.key); setAddingFolder(false); setNewFolderName('') }}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              subTab === t.key ? 'border-green-700 text-green-800 bg-green-50' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >{t.label}</button>
        ))}
      </div>

      {/* Breadcrumb / back nav */}
      {folderStack.length > 0 ? (
        <div className="flex items-center gap-1.5 mb-4 flex-wrap">
          {/* Root link */}
          <button
            onClick={() => { setFolderStack([]); setAddingFolder(false) }}
            className="text-sm text-green-700 hover:text-green-900 font-medium transition-colors"
          >
            📁 All Folders
          </button>
          {/* Intermediate crumbs */}
          {folderStack.map((crumb, idx) => {
            const isLast = idx === folderStack.length - 1
            return (
              <span key={crumb.id} className="flex items-center gap-1.5">
                <span className="text-gray-300">/</span>
                {isLast ? (
                  <span className="text-sm font-semibold text-gray-800">{crumb.name}</span>
                ) : (
                  <button
                    onClick={() => { setFolderStack(prev => prev.slice(0, idx + 1)); setAddingFolder(false) }}
                    className="text-sm text-green-700 hover:text-green-900 font-medium transition-colors"
                  >
                    {crumb.name}
                  </button>
                )}
              </span>
            )
          })}
          {/* Delete current folder */}
          <button
            onClick={() => handleRemoveFolder(currentFolderId)}
            className="ml-auto text-xs text-red-400 hover:text-red-600 transition-colors"
            title="Delete folder"
          >Delete folder</button>
        </div>
      ) : (
        /* Toolbar — root view only */
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <button
            onClick={() => { setAddingFolder(a => !a); setNewFolderName('') }}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors font-medium"
          >{addingFolder ? '✕ Cancel' : '+ Add Folder'}</button>
          <label className={`cursor-pointer text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${uploading ? 'bg-gray-200 text-gray-400' : 'bg-green-700 text-white hover:bg-green-800'}`}>
            {uploading ? 'Uploading…' : `+ Upload ${subTab === 'documents' ? 'Document' : 'Photo / Video'}`}
            <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} accept={uploadAccept} />
          </label>
        </div>
      )}

      {/* Inline add-folder input */}
      {addingFolder && (
        <div className="flex gap-2 mb-4">
          <input autoFocus type="text" value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddFolder(); if (e.key === 'Escape') { setAddingFolder(false); setNewFolderName('') } }}
            placeholder="Folder name…" className="input text-sm flex-1"
          />
          <button onClick={handleAddFolder} disabled={!newFolderName.trim() || savingFolder}
            className="px-3 py-1.5 rounded-lg bg-green-700 text-white text-sm font-medium hover:bg-green-800 disabled:opacity-40 transition-colors">
            {savingFolder ? '…' : 'Create'}
          </button>
        </div>
      )}

      {filesLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
        </div>
      ) : currentFolderId ? (
        /* ── FOLDER VIEW ─────────────────────────────────────────── */
        <>
          {/* Upload + subfolder toolbar inside folder */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <button
              onClick={() => { setAddingFolder(a => !a); setNewFolderName('') }}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors font-medium"
            >{addingFolder ? '✕ Cancel' : '+ Add Subfolder'}</button>
            <label className={`cursor-pointer text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${uploading ? 'bg-gray-200 text-gray-400' : 'bg-green-700 text-white hover:bg-green-800'}`}>
              {uploading ? 'Uploading…' : `+ Upload ${subTab === 'documents' ? 'Document' : 'Photo / Video'}`}
              <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} accept={uploadAccept} />
            </label>
          </div>

          {/* Subfolders */}
          {activeFolders.length > 0 && (
            <div className="mb-6">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Subfolders</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {activeFolders.map(f => {
                  const count = allTabFiles.filter(x => x.folder_id === f.id).length
                  return (
                    <button
                      key={f.id}
                      onClick={() => { setFolderStack(prev => [...prev, { id: f.id, name: f.folder_name }]); setAddingFolder(false) }}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-gray-100 transition-colors group relative text-center"
                      title={f.folder_name}
                    >
                      <FolderIcon color={folderIconColor} size={52} />
                      <span className="text-xs font-medium text-gray-700 leading-tight line-clamp-2 w-full text-center">{f.folder_name}</span>
                      {count > 0 && <span className="text-[10px] text-gray-400">{count} file{count !== 1 ? 's' : ''}</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {folderIsEmpty && activeFolders.length === 0 && (
            <div className="flex flex-col items-center py-12 text-gray-400">
              <div className="mb-3 opacity-40"><FolderIcon color={folderIconColor} size={56} /></div>
              <p className="text-sm font-medium text-gray-500">This folder is empty</p>
              <p className="text-xs mt-1 text-center max-w-xs">Upload a file above or add a subfolder to organize content here.</p>
            </div>
          )}
          {visibleFiles.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {visibleFiles.map(f => (
                <FileCard key={f.id} f={f} onDelete={handleDeleteFile} fmtSize={fmtSize} />
              ))}
            </div>
          )}
        </>
      ) : (
        /* ── ROOT VIEW ───────────────────────────────────────────── */
        <>
          {/* Folder grid */}
          {activeFolders.length > 0 && (
            <div className="mb-6">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Folders</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {activeFolders.map(f => {
                  const folderFileCount = allTabFiles.filter(x => x.folder_id === f.id).length
                  return (
                    <button
                      key={f.id}
                      onClick={() => { setFolderStack([{ id: f.id, name: f.folder_name }]); setAddingFolder(false) }}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-gray-100 transition-colors group relative text-center"
                      title={f.folder_name}
                    >
                      <FolderIcon color={folderIconColor} size={52} />
                      <span className="text-xs font-medium text-gray-700 leading-tight line-clamp-2 w-full text-center">{f.folder_name}</span>
                      {folderFileCount > 0 && (
                        <span className="text-[10px] text-gray-400">{folderFileCount} file{folderFileCount !== 1 ? 's' : ''}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Unorganized files at root */}
          {visibleFiles.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                {activeFolders.length > 0 ? 'Unorganized Files' : 'Files'}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {visibleFiles.map(f => (
                  <FileCard key={f.id} f={f} onDelete={handleDeleteFile} fmtSize={fmtSize} />
                ))}
              </div>
            </div>
          )}

          {rootIsEmpty && (
            <div className="flex flex-col items-center py-12 text-gray-400">
              <p className="text-4xl mb-3">{subTab === 'documents' ? '📄' : '📸'}</p>
              <p className="text-sm font-medium text-gray-500">
                No {subTab === 'documents' ? 'documents' : 'photos or videos'} yet
              </p>
              <p className="text-xs mt-1 mb-5 text-center max-w-xs">
                Add a folder manually above, upload a file, or apply a template to set up your folder structure automatically.
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-green-700 text-white font-medium hover:bg-green-800 transition-colors"
              >
                <span>📋</span> Apply Template
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Job Change Orders Panel ───────────────────────────────────────────────────
const CO_STATUSES     = ['pending', 'presented', 'sold', 'lost']
const CO_STATUS_STYLE = {
  pending:   'border-yellow-400 text-yellow-800 bg-yellow-50',
  presented: 'border-blue-400   text-blue-800   bg-blue-50',
  sold:      'border-green-500  text-green-800  bg-green-50',
  lost:      'border-red-400    text-red-800    bg-red-50',
}

function JobChangeOrdersPanel({ job }) {
  const [cos,        setCos]        = useState([])
  const [loading,    setLoading]    = useState(false)
  const [creatingCO, setCreatingCO] = useState(false)
  const [updatingId, setUpdatingId] = useState(null)

  // Inline estimator state
  const [openEstimateId, setOpenEstimateId] = useState(null)
  const [openBidId,      setOpenBidId]      = useState(null)
  const [openCoName,     setOpenCoName]     = useState('')
  const [openCoType,     setOpenCoType]     = useState('')

  useEffect(() => {
    if (job?.id) fetchCOs(job.id)
    else { setCos([]); closeEstimator() }
  }, [job?.id])

  function closeEstimator() {
    setOpenEstimateId(null)
    setOpenBidId(null)
    setOpenCoName('')
    setOpenCoType('')
  }

  function openEstimator(estimateId, bidId, coName, coType) {
    setOpenEstimateId(estimateId)
    setOpenBidId(bidId || null)
    setOpenCoName(coName || '')
    setOpenCoType(coType || '')
  }

  async function fetchCOs(jobId) {
    setLoading(true)
    const { data } = await supabase
      .from('bids')
      .select('*')
      .eq('record_type', 'change_order')
      .eq('linked_job_id', jobId)
      .order('date_submitted', { ascending: false })
    if (data) setCos(data)
    setLoading(false)
  }

  async function handleNewCO() {
    setCreatingCO(true)
    const clientName = job.client_name || job.name || ''
    const { data: est, error } = await supabase
      .from('estimates')
      .insert({ estimate_name: '', client_name: clientName, status: 'pending' })
      .select().single()
    setCreatingCO(false)
    if (error) { alert('Error creating estimate: ' + error.message); return }
    // Open inline estimator with empty description — user fills it in the panel
    openEstimator(est.id, null, '', '')
  }

  function handleCoSaved(bid) {
    if (!bid) return
    setCos(prev => {
      const idx = prev.findIndex(c => c.id === bid.id)
      if (idx >= 0) {
        const updated = [...prev]
        updated[idx] = { ...prev[idx], ...bid }
        return updated
      }
      return [bid, ...prev]
    })
  }

  async function handleStatusChange(id, status) {
    setUpdatingId(id)
    await supabase.from('bids').update({ status }).eq('id', id)
    setCos(prev => prev.map(c => c.id === id ? { ...c, status } : c))
    setUpdatingId(null)
  }

  async function handleDelete(co) {
    if (!confirm(`Delete change order "${co.co_name}"?`)) return
    if (co.estimate_id) await supabase.from('estimates').delete().eq('id', co.estimate_id)
    await supabase.from('bids').delete().eq('id', co.id)
    setCos(prev => prev.filter(c => c.id !== co.id))
  }

  const fmt = v => '$' + Math.round(parseFloat(v || 0)).toLocaleString()

  if (!job) return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20">
      <p className="text-4xl mb-3">📋</p>
      <p className="text-lg font-semibold text-gray-500">Select a job to view change orders</p>
    </div>
  )

  // ── Inline estimator view ────────────────────────────────────────────────
  if (openEstimateId) {
    return (
      <div className="p-4 flex flex-col h-full">
        <COEstimatePanel
          estimateId={openEstimateId}
          bidId={openBidId}
          coName={openCoName}
          coType={openCoType}
          jobId={job.id}
          clientName={job.client_name || job.name || ''}
          onClose={closeEstimator}
          onSaved={handleCoSaved}
        />
      </div>
    )
  }

  // ── CO list view ─────────────────────────────────────────────────────────
  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Change Orders</h2>
          <p className="text-xs text-gray-400">{job.client_name || job.name}</p>
        </div>
        <button onClick={handleNewCO} disabled={creatingCO}
          className="text-xs px-3 py-1.5 rounded-lg bg-blue-700 text-white font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50">
          {creatingCO ? 'Creating…' : '+ New Change Order'}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" />
        </div>
      ) : cos.length === 0 ? (
        <div className="flex flex-col items-center py-14 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-sm font-medium text-gray-500">No change orders yet for this job</p>
          <p className="text-xs mt-1 mb-5 text-center max-w-xs">Click "+ New Change Order" to build a priced change order using the estimating interface.</p>
          <button onClick={handleNewCO} disabled={creatingCO}
            className="text-sm px-4 py-2 rounded-lg bg-blue-700 text-white font-medium hover:bg-blue-800 transition-colors disabled:opacity-50">
            {creatingCO ? 'Creating…' : '+ New Change Order'}
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Change Order</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Created</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Gross Profit</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Amount</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Status</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Delete</th>
              </tr>
            </thead>
            <tbody>
              {cos.map((co, i) => {
                const status = co.status || 'pending'
                return (
                  <tr key={co.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                    <td className="px-4 py-3">
                      {co.estimate_id ? (
                        <button
                          onClick={() => openEstimator(co.estimate_id, co.id, co.co_name, co.co_type)}
                          className="font-semibold text-blue-700 hover:underline text-left"
                        >
                          {co.co_name || '—'}
                        </button>
                      ) : (
                        <span className="font-semibold text-gray-800">{co.co_name || '—'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{co.co_type || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {co.date_submitted ? new Date(co.date_submitted).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap font-semibold text-green-700">
                      {co.gross_profit > 0 ? fmt(co.gross_profit) : <span className="text-gray-300 font-normal">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900 whitespace-nowrap">
                      {fmt(co.bid_amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <select
                        value={status}
                        disabled={updatingId === co.id}
                        onChange={e => handleStatusChange(co.id, e.target.value)}
                        className={`text-xs font-semibold rounded-full px-3 py-1 border-2 cursor-pointer appearance-none text-center transition-colors focus:outline-none disabled:opacity-40 ${CO_STATUS_STYLE[status] || CO_STATUS_STYLE.pending}`}
                      >
                        {CO_STATUSES.map(s => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleDelete(co)}
                        className="text-xs px-2 py-1 rounded border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors">✕</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Job Tasks Panel ───────────────────────────────────────────────────────────
function JobTasksPanel({ job }) {
  const [tasks,       setTasks]       = useState([])
  const [loading,     setLoading]     = useState(false)
  const [addingTask,  setAddingTask]  = useState(false)
  const [newTaskName, setNewTaskName] = useState('')
  const [saving,      setSaving]      = useState(false)
  const [showModal,   setShowModal]   = useState(false)

  useEffect(() => {
    if (job?.id) fetchTasks(job.id)
    else setTasks([])
  }, [job?.id])

  async function fetchTasks(jobId) {
    setLoading(true)
    const { data } = await supabase.from('job_tasks').select('*').eq('job_id', jobId).order('sort_order')
    if (data) setTasks(data)
    setLoading(false)
  }

  async function handleAddTask() {
    if (!newTaskName.trim() || !job?.id) return
    setSaving(true)
    const { data } = await supabase.from('job_tasks').insert({
      job_id: job.id, task_name: newTaskName.trim(), status: 'pending', sort_order: tasks.length,
    }).select().single()
    if (data) setTasks(prev => [...prev, data])
    setNewTaskName(''); setAddingTask(false); setSaving(false)
  }

  async function toggleTask(task) {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed'
    await supabase.from('job_tasks').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', task.id)
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
  }

  async function deleteTask(id) {
    if (!confirm('Remove this task?')) return
    await supabase.from('job_tasks').delete().eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  if (!job) return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20">
      <p className="text-4xl mb-3">✅</p>
      <p className="text-lg font-semibold text-gray-500">Select a job to view tasks</p>
      <p className="text-sm mt-1">Choose a job from the sidebar</p>
    </div>
  )

  const completed = tasks.filter(t => t.status === 'completed').length

  return (
    <div className="p-4 max-w-2xl">
      {showModal && (
        <ApplyTemplateModal
          job={job}
          onClose={() => setShowModal(false)}
          onApplied={() => { setShowModal(false); fetchTasks(job.id) }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Tasks</h2>
          <p className="text-xs text-gray-400">{job.client_name || job.name}</p>
        </div>
        <button
          onClick={() => { setAddingTask(a => !a); setNewTaskName('') }}
          className="text-xs px-3 py-1.5 rounded-lg bg-green-700 text-white font-medium hover:bg-green-800 transition-colors"
        >{addingTask ? '✕ Cancel' : '+ Add Task'}</button>
      </div>

      {/* Add task input */}
      {addingTask && (
        <div className="flex gap-2 mb-4">
          <input autoFocus type="text" value={newTaskName}
            onChange={e => setNewTaskName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddTask(); if (e.key === 'Escape') { setAddingTask(false); setNewTaskName('') } }}
            placeholder="Task name…" className="input text-sm flex-1"
          />
          <button onClick={handleAddTask} disabled={!newTaskName.trim() || saving}
            className="px-3 py-1.5 rounded-lg bg-green-700 text-white text-sm font-medium hover:bg-green-800 disabled:opacity-40">
            {saving ? '…' : 'Add'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-gray-400">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-sm font-medium text-gray-500">No tasks yet</p>
          <p className="text-xs mt-1 mb-5 text-center max-w-xs">Add tasks manually above, or apply a template to create folders and tasks all at once.</p>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-green-700 text-white font-medium hover:bg-green-800 transition-colors"
          >
            <span>📋</span> Apply Template
          </button>
        </div>
      ) : (
        <div>
          {/* Progress bar */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 bg-gray-100 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${tasks.length > 0 ? (completed / tasks.length) * 100 : 0}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-gray-500 flex-shrink-0">{completed}/{tasks.length} done</span>
          </div>

          {/* Task list */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {tasks.map((task, i) => (
              <div key={task.id}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 group transition-colors ${i < tasks.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                <button
                  onClick={() => toggleTask(task)}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    task.status === 'completed' ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300 hover:border-green-500'
                  }`}
                >
                  {task.status === 'completed' && (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <span className={`flex-1 text-sm ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                  {task.task_name}
                </span>
                <button onClick={() => deleteTask(task.id)}
                  className="text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-xs p-1">✕</button>
              </div>
            ))}
          </div>

          {/* Apply more from template */}
          <div className="mt-3 text-center">
            <button onClick={() => setShowModal(true)} className="text-xs text-gray-400 hover:text-green-700 transition-colors">
              + Apply template to add more
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
