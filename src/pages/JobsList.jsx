import { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import ScheduleCalendar from '../components/ScheduleCalendar'
import DailyLogs from '../components/DailyLogs'
import TimeClock from '../components/TimeClock'
import WorkOrders from '../components/WorkOrders'
import JobComparison from '../components/JobComparison'
import TemplatesManager from '../components/TemplatesManager'
import EmailTemplatesManager from '../components/EmailTemplatesManager'
import AllJobsTracking from '../components/AllJobsTracking'
import AllJobsTasks from '../components/AllJobsTasks'
import AllJobsChangeOrders from '../components/AllJobsChangeOrders'
import MasterCrews from './MasterCrews'
import COEstimatePanel from '../components/COEstimatePanel'
import CODetailModal from '../components/CODetailModal'
import JobInfoModal, { nameInitials, JOB_ROLES } from '../components/JobInfoModal'
import JobFinancePanel from '../components/JobFinancePanel'
import StartLocationsCard from '../components/StartLocationsCard'
import SupervisorPositionsCard from '../components/SupervisorPositionsCard'
import InvoiceCommPositionCard from '../components/InvoiceCommPositionCard'
import { fetchAllPaginated } from '../lib/fetchAll'

function MoveJobModal({ job, stages, onMove, onClose }) {
  const [selected, setSelected] = useState(job.stage_id || '__none__')
  const [saving, setSaving] = useState(false)

  async function handleMove() {
    setSaving(true)
    await onMove(job.id, selected === '__none__' ? null : selected)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-xs p-5"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-sm font-bold text-gray-900 mb-1">Move Job</h3>
        <p className="text-xs text-gray-500 mb-4 truncate">{job.name || job.client_name}</p>

        <div className="space-y-1 mb-5">
          <label
            className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${selected === '__none__' ? 'bg-green-50' : 'hover:bg-gray-50'}`}
          >
            <input
              type="radio"
              name="stage"
              value="__none__"
              checked={selected === '__none__'}
              onChange={() => setSelected('__none__')}
              className="accent-green-700"
            />
            <span className="text-xs font-medium text-gray-600">Unassigned</span>
          </label>
          {stages.map(s => (
            <label
              key={s.id}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${selected === s.id ? 'bg-green-50' : 'hover:bg-gray-50'}`}
            >
              <input
                type="radio"
                name="stage"
                value={s.id}
                checked={selected === s.id}
                onChange={() => setSelected(s.id)}
                className="accent-green-700"
              />
              <span className="text-xs font-medium text-gray-700">{s.name}</span>
            </label>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 text-xs px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
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

function JobItem({
  job,
  stages,
  selectedJob,
  setSelectedJob,
  setTab,
  onMove,
  clientPhoneMap = { byId: {}, byName: {} },
  respInitials = '',
}) {
  const [showMoveModal, setShowMoveModal] = useState(false)
  // Mouse-tracking tooltip state: { x, y } when active, null when hidden.
  const [hoverPos, setHoverPos] = useState(null)

  // Resolve the client phone for this job. Prefer client_id; fall back to
  // a case-insensitive name match for older imports where client_id is null.
  const clientPhone = (() => {
    if (job.client_id && clientPhoneMap.byId[job.client_id])
      return clientPhoneMap.byId[job.client_id]
    const key = (job.client_name || '').trim().toLowerCase()
    return key ? clientPhoneMap.byName[key] || '' : ''
  })()

  const addressLine = [job.job_city, job.job_state, job.job_zip].filter(Boolean).join(', ')
  const hasAnyDetail = job.job_address || addressLine || clientPhone

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
        onClick={() => {
          setSelectedJob(job.id)
          // Picking a specific job from the sidebar always jumps to Info —
          // mirrors the user's mental model of "open this job's details".
          if (typeof setTab === 'function') setTab('info')
        }}
        className={`flex items-center rounded-lg cursor-pointer transition-colors ${
          selectedJob === job.id
            ? 'bg-green-50 border border-green-200'
            : 'hover:bg-gray-100 border border-transparent'
        }`}
      >
        <button
          className="flex-1 px-2 py-1.5 text-xs min-w-0 text-left"
          onMouseEnter={e => setHoverPos({ x: e.clientX, y: e.clientY })}
          onMouseMove={e => setHoverPos({ x: e.clientX, y: e.clientY })}
          onMouseLeave={() => setHoverPos(null)}
        >
          <p
            className={`font-bold truncate ${selectedJob === job.id ? 'text-green-800' : 'text-gray-800'}`}
          >
            {/* Strip any trailing "(XX)" of 1–3 letters from the stored
                name — some legacy rows already have initials baked into
                jobs.name, which would otherwise show as "(XX) (YY)". */}
            {(job.name || job.client_name || '').replace(/\s*\([A-Za-z]{1,3}\)\s*$/, '')}
            {/* Hide the (initials) suffix for closed jobs — the data on
                the row stays intact, but the display is clean. Open
                statuses are 'active' and 'on_hold'. */}
            {respInitials &&
              (job.status === 'active' || job.status === 'on_hold' || !job.status) && (
                <span className="ml-1 text-gray-500 font-normal">({respInitials})</span>
              )}
          </p>
        </button>

        {/* Mouse-following info tooltip — fixed so it floats above everything */}
        {hoverPos && hasAnyDetail && (
          <div
            className="fixed z-[100] pointer-events-none bg-white border border-gray-200 shadow-xl rounded-lg px-3 py-2 text-xs max-w-xs"
            style={{
              left: Math.min(hoverPos.x + 14, window.innerWidth - 260),
              top: Math.min(hoverPos.y + 14, window.innerHeight - 110),
            }}
          >
            <p className="font-bold text-gray-900 truncate">{job.name || job.client_name}</p>
            {job.job_address && <p className="text-gray-700 mt-0.5 truncate">{job.job_address}</p>}
            {addressLine && <p className="text-gray-700 truncate">{addressLine}</p>}
            {clientPhone && <p className="text-gray-600 mt-1">📱 {clientPhone}</p>}
          </div>
        )}
        {/* Move stage button */}
        <button
          onClick={e => {
            e.stopPropagation()
            setShowMoveModal(true)
          }}
          className="flex-shrink-0 p-1 rounded transition-colors text-blue-500 hover:text-blue-700 hover:bg-blue-100"
          title="Move to stage"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
            />
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
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedJob, setSelectedJob] = useState(ALL_JOBS)
  // Default landing tab is Schedule (combined with selectedJob=ALL_JOBS this
  // gives the user "Schedule > All Jobs" on first arrival). A ?tab= URL param
  // still wins for deep-links from elsewhere in the app.
  const [tab, setTab] = useState(() => searchParams.get('tab') || 'schedule')
  // DOM node for the shared green app-header centre slot; the tab bar is
  // portalled into it. Resolved after mount so the portal never gets null.
  const [headerSlot, setHeaderSlot] = useState(null)
  const [jobModal, setJobModal] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('open') // 'open' | 'closed'
  // Auto-open trigger for the CO modal when the user deep-links from
  // ClientDetail like ?tab=change-orders&job=<jobId>&co=<coId>.
  // Bumped each time the URL param changes so JobChangeOrdersPanel knows
  // to re-open even if the same coId arrives twice in a row.
  const [coDeepLink, setCoDeepLink] = useState(null) // { coId, ts } | null
  // Deep-link for the Finance tab — clicking a job name in the all-jobs
  // invoice table jumps to that job and opens the specific invoice.
  const [financeDeepLink, setFinanceDeepLink] = useState(null) // { invoiceId, ts } | null

  // ── Sidebar scroll preservation ─────────────────────────────────────────────
  // The jobs sidebar list (left column) is its own scroll container, but
  // certain re-renders (job-click, tab-switch, child remounts) were resetting
  // its scrollTop to 0. We capture the latest position in a ref on every scroll
  // and re-apply it via useLayoutEffect after each render so the user stays
  // pinned to wherever they last were in the list — even when navigating
  // between jobs or job-detail tabs.
  const jobsListRef = useRef(null)
  const jobsScrollTop = useRef(0)
  // One-shot guard so a ?addSchedule=1 deep-link opens the new-schedule modal
  // only once, even though the URL-param effect re-runs when jobs load.
  const addSchedFired = useRef(false)
  const onJobsListScroll = e => {
    jobsScrollTop.current = e.currentTarget.scrollTop
  }
  useLayoutEffect(() => {
    const el = jobsListRef.current
    if (el && el.scrollTop !== jobsScrollTop.current) {
      el.scrollTop = jobsScrollTop.current
    }
  })

  // Per-user collapsed-state for the sidebar stage groups. Persisted in
  // localStorage keyed by the signed-in user so each user keeps their own
  // view across reloads. Set of stageId strings (or '__none__' for the
  // Unassigned bucket).
  const collapsedKey = user?.id ? `pbs:jobsList:collapsedStages:${user.id}` : null
  const [collapsedStages, setCollapsedStages] = useState(() => {
    if (typeof window === 'undefined' || !collapsedKey) return new Set()
    try {
      const raw = window.localStorage.getItem(collapsedKey)
      return raw ? new Set(JSON.parse(raw)) : new Set()
    } catch {
      return new Set()
    }
  })
  // If the user changes (login/logout) re-hydrate from their key.
  useEffect(() => {
    if (!collapsedKey) {
      setCollapsedStages(new Set())
      return
    }
    try {
      const raw = window.localStorage.getItem(collapsedKey)
      setCollapsedStages(raw ? new Set(JSON.parse(raw)) : new Set())
    } catch {
      setCollapsedStages(new Set())
    }
  }, [collapsedKey])
  // Persist every change.
  useEffect(() => {
    if (!collapsedKey) return
    try {
      window.localStorage.setItem(collapsedKey, JSON.stringify([...collapsedStages]))
    } catch {}
  }, [collapsedKey, collapsedStages])
  function toggleStageCollapsed(stageId) {
    setCollapsedStages(prev => {
      const next = new Set(prev)
      if (next.has(stageId)) next.delete(stageId)
      else next.add(stageId)
      return next
    })
  }

  // ── User-specific Jobs filter (2026-05-28) ──────────────────────────────
  // Two independent dimensions, both persisted per user in localStorage:
  //  1. filterRole — when set, the sidebar shows ONLY jobs where
  //     job[role_key] matches the signed-in user's full name. Stage section
  //     headers collapse into a single flat list.
  //  2. hiddenStages — Set of stage IDs the user has chosen to hide. Works
  //     independently of #1 (you can hide stages with no role filter).
  const filterRoleKey = user?.id ? `pbs:jobsList:filterRole:${user.id}` : null
  const filterEmployeeKey = user?.id ? `pbs:jobsList:filterEmployee:${user.id}` : null
  const hiddenStagesKey = user?.id ? `pbs:jobsList:hiddenStages:${user.id}` : null
  const [filterRole, setFilterRole] = useState(() => {
    if (typeof window === 'undefined' || !filterRoleKey) return null
    try {
      const raw = window.localStorage.getItem(filterRoleKey)
      return raw || null
    } catch {
      return null
    }
  })
  const [filterEmployee, setFilterEmployee] = useState(() => {
    if (typeof window === 'undefined' || !filterEmployeeKey) return ''
    try {
      const raw = window.localStorage.getItem(filterEmployeeKey)
      return raw || ''
    } catch {
      return ''
    }
  })
  const [hiddenStages, setHiddenStages] = useState(() => {
    if (typeof window === 'undefined' || !hiddenStagesKey) return new Set()
    try {
      const raw = window.localStorage.getItem(hiddenStagesKey)
      return raw ? new Set(JSON.parse(raw)) : new Set()
    } catch {
      return new Set()
    }
  })
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false)
  // Re-hydrate on user change.
  useEffect(() => {
    if (!filterRoleKey) {
      setFilterRole(null)
      setFilterEmployee('')
      setHiddenStages(new Set())
      return
    }
    try {
      const r = window.localStorage.getItem(filterRoleKey)
      setFilterRole(r || null)
      const e = window.localStorage.getItem(filterEmployeeKey)
      setFilterEmployee(e || '')
      const h = window.localStorage.getItem(hiddenStagesKey)
      setHiddenStages(h ? new Set(JSON.parse(h)) : new Set())
    } catch {
      setFilterRole(null)
      setFilterEmployee('')
      setHiddenStages(new Set())
    }
  }, [filterRoleKey, filterEmployeeKey, hiddenStagesKey])
  // Persist on change.
  useEffect(() => {
    if (!filterRoleKey) return
    try {
      if (filterRole) window.localStorage.setItem(filterRoleKey, filterRole)
      else window.localStorage.removeItem(filterRoleKey)
    } catch {}
  }, [filterRoleKey, filterRole])
  useEffect(() => {
    if (!filterEmployeeKey) return
    try {
      if (filterEmployee) window.localStorage.setItem(filterEmployeeKey, filterEmployee)
      else window.localStorage.removeItem(filterEmployeeKey)
    } catch {}
  }, [filterEmployeeKey, filterEmployee])
  useEffect(() => {
    if (!hiddenStagesKey) return
    try {
      window.localStorage.setItem(hiddenStagesKey, JSON.stringify([...hiddenStages]))
    } catch {}
  }, [hiddenStagesKey, hiddenStages])
  function toggleHiddenStage(stageId) {
    setHiddenStages(prev => {
      const next = new Set(prev)
      if (next.has(stageId)) next.delete(stageId)
      else next.add(stageId)
      return next
    })
  }

  const [stages, setStages] = useState([])
  const [dragOverStage, setDragOverStage] = useState(null)
  const [dragJobId, setDragJobId] = useState(null)
  // All active employees — used to (a) render the (initials) suffix on each
  // job name in the sidebar and (b) populate the EmployeePicker modal that
  // fires on every stage change.
  const [activeEmployees, setActiveEmployees] = useState([])
  // EmployeePicker modal state: when set, the modal renders and waits for
  // the user to pick an employee before the stage move actually commits.
  // Shape: { jobId, targetStageId } | null. targetStageId may be null for
  // the Unassigned bucket.
  const [assignPicker, setAssignPicker] = useState(null)
  const [showExceptions, setShowExceptions] = useState(false)
  const [exceptionsCount, setExceptionsCount] = useState(0)
  const [addScheduleTrigger, setAddScheduleTrigger] = useState(0)
  // Schedule Assistance modal: null when closed, or the chosen mode key.
  // Phase 1 just opens the picker; running optimization arrives in Phase 2/3.
  const [schedAssistMode, setSchedAssistMode] = useState(null) // null | 'supervisor' | 'yard' | 'warranty' | 'both'
  const [showSchedAssist, setShowSchedAssist] = useState(false)
  // Multi-step wizard view inside the Schedule Assistance modal:
  //   'mode'      → pick which optimization to run (the existing screen)
  //   'configure' → set start location + dates + which jobs to include
  //   'result'    → review the optimized route, edit order, apply
  const [schedAssistView, setSchedAssistView] = useState('mode')
  const [startLocations, setStartLocations] = useState([])
  const [defaultStartId, setDefaultStartId] = useState('')
  const [pickedStartId, setPickedStartId] = useState('')
  const [optStartDate, setOptStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  })
  const [optDaysToSpread, setOptDaysToSpread] = useState(1)
  const [eligibleJobs, setEligibleJobs] = useState([])
  const [eligibleLoading, setEligibleLoading] = useState(false)
  const [excludedJobIds, setExcludedJobIds] = useState(() => new Set())
  const [yardCheckTotal, setYardCheckTotal] = useState(4)
  const [optimizing, setOptimizing] = useState(false)
  const [optResult, setOptResult] = useState(null) // { ordered_jobs, legs, totals }
  const [optError, setOptError] = useState('')
  const [applying, setApplying] = useState(false)
  // Supervisor optimization state
  const [supervisors, setSupervisors] = useState([]) // [{id, name, job_title, included}]
  const [supLoading, setSupLoading] = useState(false)
  const [supResult, setSupResult] = useState(null) // { supervisors: [{id, name, jobs:[]}] }
  const [supRunning, setSupRunning] = useState(false)
  const [supApplying, setSupApplying] = useState(false)
  // Which stages to include in supervisor optimization. Set of stage ids
  // (UUIDs from job_stages) plus the literal '__none__' for Unassigned jobs.
  const [supStageIds, setSupStageIds] = useState(() => new Set())
  // Per-job include/exclude for the optimizer. After stages are picked we
  // pre-load every eligible job; the user can untick specific ones.
  const [supEligibleJobs, setSupEligibleJobs] = useState([])
  const [supEligibleLoading, setSupEligibleLoading] = useState(false)
  const [supExcludedJobIds, setSupExcludedJobIds] = useState(() => new Set())
  // Geocoding readiness state for the Schedule Assistance modal
  const [geoStats, setGeoStats] = useState({ ok: 0, pending: 0, not_found: 0, error: 0, total: 0 })
  const [geocoding, setGeocoding] = useState(false)
  const [geoMsg, setGeoMsg] = useState('')

  // Pull geocoding status for the Schedule Assistance dashboard
  async function refreshGeoStats() {
    const queries = [
      supabase.from('jobs').select('id', { count: 'exact', head: true }),
      supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('geocode_status', 'ok'),
      supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .eq('geocode_status', 'pending'),
      supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .eq('geocode_status', 'not_found'),
      supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .eq('geocode_status', 'error'),
    ]
    const [total, ok, pending, notFound, error] = await Promise.all(queries)
    setGeoStats({
      total: total.count || 0,
      ok: ok.count || 0,
      pending: pending.count || 0,
      not_found: notFound.count || 0,
      error: error.count || 0,
    })
  }

  // Loop through batches until there's nothing left to geocode (or we hit an error).
  // Each call processes up to 200 jobs, so 1k+ jobs = ~5-7 calls. We surface live
  // progress to the modal so the user knows it's working.
  async function runGeocoder() {
    setGeocoding(true)
    setGeoMsg('')
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        setGeoMsg('Not signed in.')
        setGeocoding(false)
        return
      }

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/geocode-jobs`
      let totalOk = 0,
        totalNotFound = 0,
        totalError = 0
      // Safety cap: don't loop more than 20 times even if something goes weird
      for (let i = 0; i < 20; i++) {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ limit: 200 }),
        })
        const data = await res.json()
        if (!res.ok || data.error) {
          setGeoMsg('Error: ' + (data.error || `HTTP ${res.status}`))
          break
        }
        const c = data.counts || {}
        totalOk += c.ok || 0
        totalNotFound += c.not_found || 0
        totalError += c.error || 0
        setGeoMsg(
          `Batch ${i + 1}: ${c.processed} processed (${c.ok || 0} ok). Total geocoded: ${totalOk}.`
        )
        await refreshGeoStats()
        if (!c.processed) break // nothing left to do
      }
      if (!geoMsg.startsWith('Error')) {
        setGeoMsg(`Done. Geocoded ${totalOk}, not found ${totalNotFound}, errors ${totalError}.`)
      }
    } catch (e) {
      setGeoMsg('Error: ' + (e instanceof Error ? e.message : String(e)))
    }
    setGeocoding(false)
  }

  // Refresh geo stats + load start locations + yard check default whenever
  // the Schedule Assistance modal opens.
  useEffect(() => {
    if (!showSchedAssist) return
    refreshGeoStats()
    ;(async () => {
      const { data } = await supabase
        .from('company_settings')
        .select('start_locations, default_start_location_id, yard_check_default_total')
        .maybeSingle()
      const locs = Array.isArray(data?.start_locations) ? data.start_locations : []
      setStartLocations(locs)
      setDefaultStartId(data?.default_start_location_id || '')
      setPickedStartId(data?.default_start_location_id || locs[0]?.id || '')
      setYardCheckTotal(data?.yard_check_default_total || 4)
    })()
  }, [showSchedAssist])

  // When the user picks a mode AND there's a start location set, fetch the
  // eligible jobs for that mode (Yard Check stage, Warranty stage, or both).
  // For Yard Checks we filter out jobs that already have N yard checks
  // scheduled (where N = yard_check_default_total).
  async function loadEligibleJobs(mode) {
    setEligibleLoading(true)
    setEligibleJobs([])
    setExcludedJobIds(new Set())
    try {
      // Find the matching stage IDs by name
      const targetNames =
        mode === 'yard'
          ? ['yard']
          : mode === 'warranty'
            ? ['warranty']
            : mode === 'both'
              ? ['yard', 'warranty']
              : []
      const ors = targetNames.map(n => `name.ilike.%${n}%`).join(',')
      const { data: stageRows } = await supabase.from('job_stages').select('id, name').or(ors)
      const stageIds = (stageRows || []).map(s => s.id)
      if (stageIds.length === 0) {
        setEligibleJobs([])
        setEligibleLoading(false)
        return
      }

      // Pull jobs in those stages with lat/lon
      const { data: jobs } = await supabase
        .from('jobs')
        .select(
          'id, name, client_name, job_address, job_city, job_state, job_zip, lat, lon, stage_id, geocode_status'
        )
        .in('stage_id', stageIds)
        .not('lat', 'is', null)
        .order('client_name')

      // For yard mode (and the yard portion of 'both'), check how many yard
      // checks each job already has scheduled and filter out the completed ones.
      let result = jobs || []
      if (mode === 'yard' || mode === 'both') {
        const ids = result.map(j => j.id)
        const { data: ycRows } = await supabase
          .from('schedule_items')
          .select('job_id')
          .in('job_id', ids)
          .eq('scheduling_type', 'yard_check')
        const countByJob = {}
        for (const r of ycRows || []) {
          countByJob[r.job_id] = (countByJob[r.job_id] || 0) + 1
        }
        // Tag each job with how many checks it's had + how many are remaining.
        // For 'both' we only filter out yard-stage jobs that are done; warranty-stage jobs pass through untouched.
        const yardStageIds = new Set(
          (stageRows || []).filter(s => /yard/i.test(s.name || '')).map(s => s.id)
        )
        result = result.filter(j => {
          if (!yardStageIds.has(j.stage_id)) return true
          const used = countByJob[j.id] || 0
          j._yard_checks_used = used
          j._yard_checks_remaining = Math.max(0, yardCheckTotal - used)
          return used < yardCheckTotal
        })
      }

      setEligibleJobs(result)
    } catch (e) {
      console.error(e)
    }
    setEligibleLoading(false)
  }

  // Call the optimize-route edge function with the picked start location +
  // the selected (not-excluded) eligible jobs.
  async function runOptimization() {
    setOptimizing(true)
    setOptError('')
    setOptResult(null)
    try {
      const start = startLocations.find(l => l.id === pickedStartId)
      if (!start) {
        setOptError('Pick a start location first.')
        setOptimizing(false)
        return
      }
      const jobIds = eligibleJobs.filter(j => !excludedJobIds.has(j.id)).map(j => j.id)
      if (jobIds.length === 0) {
        setOptError('Pick at least one job to optimize.')
        setOptimizing(false)
        return
      }
      if (jobIds.length > 50) {
        setOptError(
          `Too many jobs (${jobIds.length}). The optimizer caps at 50 per run — deselect some and try again.`
        )
        setOptimizing(false)
        return
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/optimize-route`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_ids: jobIds,
          start: { lat: Number(start.lat), lon: Number(start.lon), label: start.label },
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setOptError(data.error || `HTTP ${res.status}`)
        setOptimizing(false)
        return
      }

      // Reorder eligibleJobs to match the optimizer's order
      const byId = Object.fromEntries(eligibleJobs.map(j => [j.id, j]))
      const orderedJobs = data.ordered_job_ids.map(id => byId[id]).filter(Boolean)
      setOptResult({ ordered_jobs: orderedJobs, legs: data.legs, totals: data.totals, start })
      setSchedAssistView('result')
    } catch (e) {
      setOptError(e instanceof Error ? e.message : String(e))
    }
    setOptimizing(false)
  }

  // Load active employees whose job_title contains "supervisor". User can
  // deselect any of them in the configure view before running the optimizer.
  async function loadSupervisors() {
    setSupLoading(true)

    // Resolve supervisor titles using the configured positions in
    // company_settings.supervisor_position_ids. Falls back to the legacy
    // substring match on "supervisor" if nothing is configured (so existing
    // installs keep working).
    const { data: settings } = await supabase
      .from('company_settings')
      .select('supervisor_position_ids')
      .maybeSingle()
    const positionIds = Array.isArray(settings?.supervisor_position_ids)
      ? settings.supervisor_position_ids
      : []

    let titles = []
    if (positionIds.length > 0) {
      const { data: posRows } = await supabase
        .from('positions')
        .select('title')
        .in('id', positionIds)
      titles = (posRows || []).map(p => (p.title || '').trim()).filter(Boolean)
    }

    let q = supabase
      .from('employees')
      .select('id, first_name, last_name, job_title')
      .eq('status', 'active')
      .order('first_name')
    if (titles.length > 0) {
      q = q.in('job_title', titles)
    } else {
      q = q.ilike('job_title', '%supervisor%')
    }
    const { data } = await q

    const sups = (data || []).map(e => ({ ...e, included: true }))
    setSupervisors(sups)
    // Default: only the production-ready stages — Pre-Install, Job, Yard Check,
    // Warranty. Earlier stages (Design, Install Sales, Permits, etc.) usually
    // don't need supervisor assignment yet. User can tick more if needed.
    const isDefault = name => {
      const n = (name || '').trim().toLowerCase()
      return (
        n === 'job' ||
        n === 'pre-install' ||
        n === 'pre install' ||
        n.includes('yard check') ||
        n.includes('warrant')
      )
    }
    setSupStageIds(new Set(stages.filter(s => isDefault(s.name)).map(s => s.id)))
    setSupLoading(false)
  }

  // Fetch every eligible job in the currently-selected stages, so the user
  // can untick individual jobs before running the optimizer. Open + geocoded.
  async function loadSupEligibleJobs(stageIdSet) {
    if (!stageIdSet || stageIdSet.size === 0) {
      setSupEligibleJobs([])
      setSupExcludedJobIds(new Set())
      return
    }
    setSupEligibleLoading(true)
    let q = supabase
      .from('jobs')
      .select('id, name, client_name, job_address, job_city, stage_id')
      .not('lat', 'is', null)
      .in('status', ['active', 'on_hold'])
      .order('client_name')
    const realIds = [...stageIdSet].filter(s => s !== '__none__')
    const incNull = stageIdSet.has('__none__')
    if (realIds.length > 0 && incNull) {
      const list = realIds.map(id => `"${id}"`).join(',')
      q = q.or(`stage_id.in.(${list}),stage_id.is.null`)
    } else if (realIds.length > 0) {
      q = q.in('stage_id', realIds)
    } else if (incNull) {
      q = q.is('stage_id', null)
    }
    const { data } = await q
    setSupEligibleJobs(data || [])
    // Re-tick any jobs that were excluded but no longer in the list
    setSupExcludedJobIds(prev => {
      const present = new Set((data || []).map(j => j.id))
      return new Set([...prev].filter(id => present.has(id)))
    })
    setSupEligibleLoading(false)
  }

  // Refresh eligible jobs whenever the stage selection changes (only while
  // the user is actually on the supervisor-config view).
  useEffect(() => {
    if (schedAssistView === 'supervisor-config') loadSupEligibleJobs(supStageIds)
  }, [supStageIds, schedAssistView])

  // Call the assign-supervisors edge function with the picked supervisors.
  async function runSupervisorOptimization() {
    setSupRunning(true)
    setOptError('')
    setSupResult(null)
    try {
      const ids = supervisors.filter(s => s.included).map(s => s.id)
      if (ids.length === 0) {
        setOptError('Pick at least one supervisor.')
        setSupRunning(false)
        return
      }

      // Use the per-job include list (eligibles minus user's exclusions) so
      // the optimizer respects both the stage filter AND any individual jobs
      // the user unchecked.
      const includedJobIds = supEligibleJobs
        .filter(j => !supExcludedJobIds.has(j.id))
        .map(j => j.id)
      if (includedJobIds.length === 0) {
        setOptError('No jobs left after filters — pick at least one stage and one job.')
        setSupRunning(false)
        return
      }
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assign-supervisors`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supervisor_employee_ids: ids,
          job_ids: includedJobIds,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setOptError(data.error || `HTTP ${res.status}`)
        setSupRunning(false)
        return
      }

      setSupResult(data)
      setSchedAssistView('supervisor-result')
    } catch (e) {
      setOptError(e instanceof Error ? e.message : String(e))
    }
    setSupRunning(false)
  }

  // Move one job from one supervisor's bucket to another (UI edit).
  function moveJobBetweenSupervisors(jobId, fromSupId, toSupId) {
    if (fromSupId === toSupId) return
    setSupResult(prev => {
      if (!prev) return prev
      const next = {
        ...prev,
        supervisors: prev.supervisors.map(s => ({ ...s, jobs: [...s.jobs] })),
      }
      const fromSup = next.supervisors.find(s => s.id === fromSupId)
      const toSup = next.supervisors.find(s => s.id === toSupId)
      if (!fromSup || !toSup) return prev
      const idx = fromSup.jobs.findIndex(j => j.id === jobId)
      if (idx < 0) return prev
      const [job] = fromSup.jobs.splice(idx, 1)
      toSup.jobs.push(job)
      return next
    })
  }

  // Apply the supervisor assignments — write the supervisor's name to
  // each job's job_supervisor column.
  async function applySupervisorAssignments() {
    if (!supResult) return
    setSupApplying(true)
    try {
      const updates = []
      for (const sup of supResult.supervisors) {
        for (const job of sup.jobs) {
          // Skip if this job already has the right supervisor (saves writes)
          if (job.current_pm === sup.name) continue
          updates.push({ id: job.id, job_supervisor: sup.name })
        }
      }
      // Process updates in parallel batches of 10 to keep things fast but
      // not pound Supabase too hard
      const CONC = 10
      for (let i = 0; i < updates.length; i += CONC) {
        await Promise.all(
          updates
            .slice(i, i + CONC)
            .map(u =>
              supabase
                .from('jobs')
                .update({ job_supervisor: u.job_supervisor })
                .eq('id', u.id)
            )
        )
      }
      // Refresh the local jobs list so the new supervisors reflect immediately
      await fetchJobs()
      setShowSchedAssist(false)
      setSchedAssistView('mode')
      setSupResult(null)
      setSchedAssistMode(null)
    } catch (e) {
      alert('Error applying assignments: ' + (e instanceof Error ? e.message : String(e)))
    }
    setSupApplying(false)
  }

  // Move a job up/down within the ordered route (manual edit of the result).
  function reorderRouteJob(idx, delta) {
    setOptResult(prev => {
      if (!prev) return prev
      const next = [...prev.ordered_jobs]
      const j = idx + delta
      if (j < 0 || j >= next.length) return prev
      const tmp = next[idx]
      next[idx] = next[j]
      next[j] = tmp
      return { ...prev, ordered_jobs: next }
    })
  }

  // Create schedule_items in the optimized route order, distributed across
  // the requested number of days. For yard checks, auto-numbers each visit
  // (based on existing count per job).
  async function applyOptimization() {
    if (!optResult) return
    setApplying(true)
    try {
      const jobs = optResult.ordered_jobs
      const days = Math.max(1, Math.min(parseInt(optDaysToSpread) || 1, jobs.length))
      const jobsPerDay = Math.ceil(jobs.length / days)
      const baseDate = new Date(optStartDate + 'T00:00:00')

      // Re-fetch yard-check counts at apply-time so the numbers reflect any
      // changes since the modal opened
      const yardJobIds = jobs.filter(j => j._yard_checks_remaining !== undefined).map(j => j.id)
      const { data: ycRows } = await supabase
        .from('schedule_items')
        .select('job_id')
        .in('job_id', yardJobIds.length ? yardJobIds : ['00000000-0000-0000-0000-000000000000'])
        .eq('scheduling_type', 'yard_check')
      const countByJob = {}
      for (const r of ycRows || []) {
        countByJob[r.job_id] = (countByJob[r.job_id] || 0) + 1
      }

      const items = jobs.map((job, i) => {
        const dayIdx = Math.floor(i / jobsPerDay)
        const d = new Date(baseDate)
        d.setDate(baseDate.getDate() + dayIdx)
        const ds = d.toISOString().slice(0, 10)
        const isYard = job._yard_checks_remaining !== undefined
        const nextNum = isYard ? (countByJob[job.id] || 0) + 1 : null
        return {
          job_id: job.id,
          title: isYard ? `Yard Check #${nextNum}` : 'Warranty Check',
          start_date: ds,
          end_date: ds,
          work_days: 1,
          scheduling_type: isYard ? 'yard_check' : 'warranty',
          notes: isYard
            ? `Yard Check ${nextNum} of ${yardCheckTotal} · Route stop ${i + 1} of ${jobs.length}`
            : `Warranty visit · Route stop ${i + 1} of ${jobs.length}`,
          progress: 0,
          reminder: 'None',
          display_color: isYard ? '#3b82f6' : '#a855f7',
          assignee_color: null,
          assignees: '',
          crew_id: null,
          sub_id: null,
          include_saturday: false,
          include_sunday: false,
          needs_crew: false,
          work_order_ids: [],
        }
      })

      const { error } = await supabase.from('schedule_items').insert(items)
      if (error) {
        alert('Failed to create schedule items: ' + error.message)
        setApplying(false)
        return
      }

      // Done — close the modal and bump the schedule trigger so the calendar
      // refreshes if the user navigates there.
      setShowSchedAssist(false)
      setSchedAssistView('mode')
      setOptResult(null)
      setSchedAssistMode(null)
      setAddScheduleTrigger(v => v + 1)
    } catch (e) {
      alert('Error applying optimization: ' + (e instanceof Error ? e.message : String(e)))
    }
    setApplying(false)
  }
  // When a job is moved into the Yard Check stage we bump this so the
  // ScheduleCalendar auto-opens the yard check config modal for that job.
  const [yardCheckTrigger, setYardCheckTrigger] = useState(null) // { jobId, ts } | null
  // Lookup tables for the hover tooltip on job names. Built once after
  // fetching clients. byId is keyed by clients.id; byName is keyed by a
  // normalized client name (lowercased + trimmed) so older BT-imported
  // jobs without a client_id still resolve.
  const [clientPhoneMap, setClientPhoneMap] = useState({ byId: {}, byName: {} })
  const [isAdmin, setIsAdmin] = useState(false)
  // Current user's full_name from profiles — used by the "my jobs" role
  // filter (we match job[role] text against this string).
  const [myFullName, setMyFullName] = useState('')

  useEffect(() => {
    fetchJobs()
    fetchStages()
    fetchClientPhones()
  }, [])

  // Resolve the green app-header centre slot once mounted, so the tab bar
  // can be portalled into it.
  useEffect(() => {
    setHeaderSlot(document.getElementById('app-header-center'))
  }, [])

  // Build phone lookup maps for the JobItem hover tooltip. We only need a
  // few fields so the query stays light even with thousands of clients.
  async function fetchClientPhones() {
    // Project's max-rows is 1k server-side; paginate to get all 1.6k+ clients.
    const { data } = await fetchAllPaginated(() =>
      supabase.from('clients').select('id, name, first_name, last_name, phone')
    )
    if (!data) return
    const byId = {}
    const byName = {}
    for (const c of data) {
      const phone = c.phone || ''
      if (!phone) continue
      byId[c.id] = phone
      const full = (c.name || `${c.first_name || ''} ${c.last_name || ''}`).trim().toLowerCase()
      if (full) byName[full] = phone
    }
    setClientPhoneMap({ byId, byName })
  }

  // Gate Settings tab to admin / super_admin only — and pick up the user's
  // full_name in the same fetch so the role filter knows who "me" is.
  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setIsAdmin(data?.role === 'admin' || data?.role === 'super_admin')
        setMyFullName((data?.full_name || '').trim())
      })
  }, [user?.id])

  // Sync tab when dock link changes the ?tab= URL param.
  // Also handle ?job=<id>&co=<id> deep links from ClientDetail's CO rows
  // — select the job, flip the Open/Closed filter to match its status,
  // and arm the CO modal trigger.
  useEffect(() => {
    const t = searchParams.get('tab')
    const jobParam = searchParams.get('job')
    const coParam = searchParams.get('co')
    if (t) setTab(t)
    if (jobParam) {
      setSelectedJob(jobParam)
      // Match the sidebar filter to wherever the job lives so it's visible.
      const jobObj = jobs.find(j => j.id === jobParam)
      if (jobObj) {
        const isOpen = jobObj.status === 'active' || jobObj.status === 'on_hold' || !jobObj.status
        setStatusFilter(isOpen ? 'open' : 'closed')
      }
    }
    if (coParam) setCoDeepLink({ coId: coParam, ts: Date.now() })
    // Dashboard "Add Schedule" quick-link: open the new-schedule modal once.
    if (searchParams.get('addSchedule') === '1' && !addSchedFired.current) {
      addSchedFired.current = true
      setAddScheduleTrigger(n => n + 1)
    }
  }, [searchParams, jobs])

  async function fetchStages() {
    const { data } = await supabase.from('job_stages').select('*').order('sort_order')
    if (data) setStages(data)
  }

  // Load every active employee — needed for the (initials) suffix on each
  // job name and for the EmployeePicker that fires on every stage change.
  async function fetchActiveEmployees() {
    const { data } = await supabase
      .from('employees')
      .select('id, first_name, last_name')
      .eq('status', 'active')
      .order('first_name')
    if (data) setActiveEmployees(data)
  }

  useEffect(() => {
    fetchActiveEmployees()
  }, [])

  // Lookup map: employee_id → "JD" — used to render the (initials) suffix
  // on every job name in the sidebar list.
  const initialsByEmpId = useMemo(() => {
    const m = {}
    for (const e of activeEmployees) m[e.id] = empInitials(e)
    return m
  }, [activeEmployees])

  async function addStage(name) {
    const maxOrder = stages.reduce((m, s) => Math.max(m, s.sort_order), 0)
    const { data } = await supabase
      .from('job_stages')
      .insert({ name, sort_order: maxOrder + 1 })
      .select()
      .single()
    if (data) setStages(prev => [...prev, data])
  }

  async function updateStage(id, name) {
    await supabase.from('job_stages').update({ name }).eq('id', id)
    setStages(prev => prev.map(s => (s.id === id ? { ...s, name } : s)))
  }

  async function deleteStage(id) {
    if (!confirm('Delete this stage? Jobs in this stage will become unassigned.')) return
    await supabase.from('jobs').update({ stage_id: null }).eq('stage_id', id)
    await supabase.from('job_stages').delete().eq('id', id)
    const remaining = stages.filter(s => s.id !== id)
    setStages(remaining)
    setJobs(prev => prev.map(j => (j.stage_id === id ? { ...j, stage_id: null } : j)))
    // Renumber remaining stages so sort_order stays contiguous (1..N)
    await Promise.all(
      remaining.map((s, i) =>
        supabase
          .from('job_stages')
          .update({ sort_order: i + 1 })
          .eq('id', s.id)
      )
    )
  }

  async function reorderStages(reordered) {
    setStages(reordered)
    await Promise.all(
      reordered.map((s, i) =>
        supabase
          .from('job_stages')
          .update({ sort_order: i + 1 })
          .eq('id', s.id)
      )
    )
  }

  // Public entry: every stage change goes through here. Instead of writing
  // directly, we open the EmployeePicker — Brian wants the responsible
  // employee re-confirmed on every stage move. The actual write happens in
  // commitMoveJobToStage below once the user picks.
  function moveJobToStage(jobId, stageId) {
    setAssignPicker({ jobId, targetStageId: stageId ?? null })
  }

  async function commitMoveJobToStage(jobId, stageId, employeeId) {
    // Detect whether the destination is a Yard Check stage BEFORE we mutate
    // anything, so we can fire the auto-trigger after the DB write succeeds.
    const targetStage = stages.find(s => s.id === stageId)
    const isYardCheck = !!targetStage && /yard\s*check/i.test(targetStage.name || '')

    // Resolve "First Last" text for the picked employee so we can write
    // it into job_supervisor (the field the user edits manually in
    // Job > Info > Assignments). Keeps every UI in sync regardless of
    // which one made the most recent edit.
    const picked = activeEmployees.find(e => e.id === employeeId)
    const supervisorName = picked
      ? `${picked.first_name || ''} ${picked.last_name || ''}`.trim()
      : null

    const updates = {
      stage_id: stageId,
      responsible_employee_id: employeeId,
      job_supervisor: supervisorName,
    }
    await supabase.from('jobs').update(updates).eq('id', jobId)
    setJobs(prev =>
      prev.map(j => (j.id === jobId ? { ...j, ...updates } : j)),
    )

    if (isYardCheck) {
      // Make sure the Schedule tab is visible so the modal can render, then
      // bump the trigger. The user can close the modal to skip scheduling.
      setTab('schedule')
      setYardCheckTrigger({ jobId, ts: Date.now() })
    }
  }

  async function fetchJobs() {
    setLoading(true)
    // Supabase project has max-rows hard-capped at 1k server-side, so .range()
    // alone isn't enough. fetchAllPaginated loops until all rows are fetched.
    const { data, error } = await fetchAllPaginated(() =>
      supabase.from('jobs').select('*').order('sold_date', { ascending: false })
    )
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
    if (error) {
      console.error('updateJobName:', error)
      return false
    }
    setJobs(prev => prev.map(j => (j.id === id ? { ...j, name: newName } : j)))
    setJobModal(prev => (prev ? { ...prev, name: newName } : prev))
    return true
  }

  async function updateJob(id, fields) {
    const { error } = await supabase.from('jobs').update(fields).eq('id', id)
    if (error) {
      console.error('updateJob:', error)
      return false
    }
    setJobs(prev => prev.map(j => (j.id === id ? { ...j, ...fields } : j)))
    setJobModal(prev => (prev ? { ...prev, ...fields } : prev))
    return true
  }

  // Role + employee filter — only jobs where the chosen role's text column
  // matches the chosen employee's full name (case-insensitive trim).
  // filterRole is the jobs-table column name (e.g. 'job_supervisor');
  // filterEmployee is the picked employee's full name. Both must be set
  // for the filter to apply.
  const filterActive = Boolean(filterRole && filterEmployee)
  const filterEmpLc = (filterEmployee || '').trim().toLowerCase()
  const sorted = [...jobs]
    .filter(j => {
      const status = j.status || 'active'
      const isOpen = status === 'active' || status === 'on_hold'
      return statusFilter === 'closed' ? !isOpen : isOpen
    })
    .filter(j => {
      if (!filterActive) return true
      return ((j[filterRole] || '').trim().toLowerCase()) === filterEmpLc
    })
    .filter(j => {
      const q = search.toLowerCase()
      return (
        !q ||
        (j.name || '').toLowerCase().includes(q) ||
        (j.client_name || '').toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      const la = lastName(a.name || a.client_name || '')
      const lb = lastName(b.name || b.client_name || '')
      return (
        la.localeCompare(lb) ||
        (a.name || a.client_name || '').localeCompare(b.name || b.client_name || '')
      )
    })

  const selectedJobObj =
    selectedJob === ALL_JOBS ? null : jobs.find(j => j.id === selectedJob) || null

  const TABS = [
    { key: 'info', label: 'ℹ️ Info' },
    { key: 'schedule', label: '📅 Schedule' },
    { key: 'work-orders', label: '📋 Work Orders' },
    { key: 'tracking', label: '🎯 Tracking' },
    { key: 'timeclock', label: '⏱️ Time Clock' },
    { key: 'daily-logs', label: '📝 Daily Logs' },
    { key: 'tasks', label: '✅ Tasks' },
    { key: 'change-orders', label: '🔄 Change Orders' },
    { key: 'finance', label: '💰 Finance' },
    { key: 'files', label: '📁 Files' },
    ...(isAdmin ? [{ key: 'settings', label: '⚙️ Settings' }] : []),
  ]
  // Active tab's label without the leading emoji — used in the breadcrumb.
  const tabName = (TABS.find(t => t.key === tab)?.label || '').replace(/^\S+\s+/, '')

  return (
    <div className="flex flex-col h-full">
      {/* ── Breadcrumb: Jobs / <tab> / <selection> ──────────────── */}
      <div className="mb-4 flex-shrink-0 flex items-baseline gap-2 min-w-0">
        <h1 className="text-xl font-bold text-gray-900 flex-shrink-0">Jobs</h1>
        <span className="text-gray-300 flex-shrink-0">/</span>
        <span className="text-lg font-semibold text-gray-500 flex-shrink-0">{tabName}</span>
        {tab !== 'settings' && (
          <>
            <span className="text-gray-300 flex-shrink-0">/</span>
            <span className="text-lg font-semibold text-green-700 truncate">
              {selectedJob === ALL_JOBS
                ? 'All Jobs'
                : selectedJobObj?.name || selectedJobObj?.client_name || '—'}
            </span>
          </>
        )}
      </div>

      {/* ── Mobile: job selector dropdown ─────────────────────── */}
      <div className="lg:hidden mb-2 flex-shrink-0">
        <select
          value={selectedJob}
          onChange={e => {
            const v = e.target.value
            setSelectedJob(v)
            // Mirror the sidebar behavior — picking a specific job from the
            // mobile dropdown also jumps to Info.
            if (v !== ALL_JOBS) setTab('info')
          }}
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

      {/* ── Tabs — portalled into the green app header bar ── */}
      {headerSlot &&
        createPortal(
          <div className="flex items-center gap-0.5 overflow-x-auto max-w-full">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-2 sm:px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-colors ${
                  tab === t.key
                    ? 'bg-black/20 text-white'
                    : 'text-white/80 hover:text-white hover:bg-black/15'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>,
          headerSlot
        )}

      {/* Settings panel — full-width, no sidebar */}
      {tab === 'settings' && (
        <div className="-mb-6 mt-3 flex-1 flex flex-col overflow-hidden">
          <JobScheduleSettings
            stages={stages}
            onAddStage={addStage}
            onUpdateStage={updateStage}
            onDeleteStage={deleteStage}
            onReorderStages={reorderStages}
          />
        </div>
      )}

      {/* Main content: sidebar + right panel (non-settings tabs) */}
      {tab !== 'settings' && (
        <div className="flex gap-2 flex-1 min-h-0 pt-2">
          {/* Jobs sidebar — desktop only */}
          <div className="hidden lg:flex w-64 flex-shrink-0 flex-col min-h-0 bg-white border-r border-gray-200">
            {/* Inner column: 90% wide, centered */}
            <div className="flex flex-col w-[90%] mx-auto mt-2 flex-shrink-0">
              {/* ── User-specific Filter button (above Open/Closed) ──────
                   Two sections in the popover:
                   - "Show only jobs assigned to me as …" radio list (filterRole)
                   - "Hide stages" checkbox list (hiddenStages)
                   Active state (any filter on) flips the button to filled. */}
              <div className="relative mb-2">
                <button
                  onClick={() => setFilterPopoverOpen(o => !o)}
                  className={`w-full flex items-center justify-between text-[11px] font-semibold px-2 py-1 rounded-md border transition-colors ${
                    filterActive || hiddenStages.size > 0
                      ? 'bg-green-700 text-white border-green-700 hover:bg-green-800'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-800'
                  }`}
                  title={
                    filterActive || hiddenStages.size > 0
                      ? 'Filter is on — click to adjust'
                      : 'Filter is off — click to set up'
                  }
                >
                  <span className="flex items-center gap-1">
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                      />
                    </svg>
                    Filter
                  </span>
                  <span className="text-[10px] opacity-80">
                    {filterActive || hiddenStages.size > 0 ? 'On' : 'Off'}
                  </span>
                </button>
                {filterPopoverOpen && (
                  <>
                    {/* Click-outside catcher */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setFilterPopoverOpen(false)}
                    />
                    <div className="absolute left-0 top-full mt-1 w-72 z-50 bg-white border border-gray-200 rounded-lg shadow-xl p-3">
                      {/* Section A — pick a role */}
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">
                        Filter by role
                      </p>
                      <div className="space-y-1 mb-3 max-h-48 overflow-y-auto pr-1">
                        <label
                          className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-xs ${
                            !filterRole ? 'bg-gray-50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="filterRole"
                            checked={!filterRole}
                            onChange={() => {
                              setFilterRole(null)
                              setFilterEmployee('')
                            }}
                            className="accent-green-700"
                          />
                          <span className="italic text-gray-500">(Off)</span>
                        </label>
                        {JOB_ROLES.map(role => (
                          <label
                            key={role.key}
                            className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-xs ${
                              filterRole === role.key
                                ? 'bg-green-50'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name="filterRole"
                              checked={filterRole === role.key}
                              onChange={() => setFilterRole(role.key)}
                              className="accent-green-700"
                            />
                            <span className="text-gray-700">{role.label}</span>
                          </label>
                        ))}
                      </div>

                      {/* Section A2 — pick the assigned employee for that role */}
                      {filterRole && (
                        <div className="mb-3 pt-2 border-t border-gray-100">
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">
                            Assigned to
                          </p>
                          <select
                            value={filterEmployee}
                            onChange={e => setFilterEmployee(e.target.value)}
                            className="w-full text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:border-green-600"
                          >
                            <option value="">— Select an employee —</option>
                            {[...activeEmployees]
                              .sort((a, b) =>
                                (a.last_name || '').localeCompare(b.last_name || '') ||
                                (a.first_name || '').localeCompare(b.first_name || '')
                              )
                              .map(emp => {
                                const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim()
                                return (
                                  <option key={emp.id} value={fullName}>
                                    {emp.last_name}, {emp.first_name}
                                  </option>
                                )
                              })}
                          </select>
                          {!filterEmployee && (
                            <p className="text-[10px] text-gray-400 italic mt-1">
                              Pick someone to apply the filter.
                            </p>
                          )}
                        </div>
                      )}

                      {/* Section B — hide stages */}
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2 pt-2 border-t border-gray-100">
                        Hide stages
                      </p>
                      <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                        <label className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-xs hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={hiddenStages.has('__none__')}
                            onChange={() => toggleHiddenStage('__none__')}
                            className="accent-green-700"
                          />
                          <span className="italic text-gray-500">Unassigned</span>
                        </label>
                        {stages.map(s => (
                          <label
                            key={s.id}
                            className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-xs hover:bg-gray-50"
                          >
                            <input
                              type="checkbox"
                              checked={hiddenStages.has(s.id)}
                              onChange={() => toggleHiddenStage(s.id)}
                              className="accent-green-700"
                            />
                            <span className="text-gray-700">{s.name}</span>
                          </label>
                        ))}
                      </div>

                      {/* Footer — clear all + close */}
                      <div className="flex gap-2 mt-3 pt-2 border-t border-gray-100">
                        <button
                          onClick={() => {
                            setFilterRole(null)
                            setFilterEmployee('')
                            setHiddenStages(new Set())
                          }}
                          disabled={
                            !filterRole &&
                            !filterEmployee &&
                            hiddenStages.size === 0
                          }
                          className="flex-1 text-[11px] px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Clear all
                        </button>
                        <button
                          onClick={() => setFilterPopoverOpen(false)}
                          className="flex-1 text-[11px] px-2 py-1 rounded bg-green-700 text-white font-semibold hover:bg-green-800"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Open / Closed filter */}
              <div className="flex gap-1 mb-2 flex-shrink-0">
                {[
                  { key: 'open', label: 'Open' },
                  { key: 'closed', label: 'Closed' },
                ].map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setStatusFilter(opt.key)}
                    className={`flex-1 text-[11px] font-semibold px-2 py-1 rounded-md border transition-colors ${
                      statusFilter === opt.key
                        ? 'bg-green-700 text-white border-green-700'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Search jobs…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input text-xs mb-2 py-1.5 flex-shrink-0 text-center"
              />

              {/* All Jobs — frozen above the scrolling list so it stays reachable */}
              <button
                onClick={() => setSelectedJob(ALL_JOBS)}
                className={`w-full text-center px-3 h-[25px] rounded-lg text-xs font-medium transition-colors border mb-1 flex-shrink-0 ${
                  selectedJob === ALL_JOBS
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}
              >
                All Jobs
              </button>
            </div>
            {/* end centered controls column */}

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-700" />
              </div>
            ) : (
              <div
                ref={jobsListRef}
                onScroll={onJobsListScroll}
                className="overflow-y-auto flex-1 w-[90%] mx-auto"
              >
                {/* Stage groups */}
                {(() => {
                  // Build lookup: stageId → jobs, then alpha-numeric sort within each stage
                  const byStage = {}
                  stages.forEach(s => {
                    byStage[s.id] = []
                  })
                  byStage['__none__'] = []
                  sorted.forEach(job => {
                    const key = job.stage_id && byStage[job.stage_id] ? job.stage_id : '__none__'
                    byStage[key].push(job)
                  })
                  Object.keys(byStage).forEach(key => {
                    byStage[key].sort((a, b) =>
                      (a.name || a.client_name || '').localeCompare(
                        b.name || b.client_name || '',
                        undefined,
                        { numeric: true, sensitivity: 'base' }
                      )
                    )
                  })

                  const StageSection = ({ stageId, label }) => {
                    const stageJobs = byStage[stageId] || []
                    const isOver = dragOverStage === stageId && dragJobId
                    const collapsed = collapsedStages.has(stageId)
                    return (
                      <div
                        onDragOver={e => {
                          e.preventDefault()
                          setDragOverStage(stageId)
                        }}
                        onDragLeave={e => {
                          if (!e.currentTarget.contains(e.relatedTarget)) setDragOverStage(null)
                        }}
                        onDrop={e => {
                          e.preventDefault()
                          if (dragJobId)
                            moveJobToStage(dragJobId, stageId === '__none__' ? null : stageId)
                          setDragJobId(null)
                          setDragOverStage(null)
                        }}
                        className={`mb-1 rounded-lg transition-colors ${isOver ? 'bg-green-50 ring-1 ring-green-300' : ''}`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleStageCollapsed(stageId)}
                          title={collapsed ? 'Expand' : 'Collapse'}
                          className="w-full flex items-center gap-1.5 px-2 py-0 text-[11px] font-bold text-gray-500 uppercase tracking-wide truncate bg-gray-100 border border-gray-300 rounded leading-tight hover:bg-gray-200 transition-colors text-left"
                        >
                          <svg
                            className={`w-3 h-3 flex-shrink-0 text-gray-400 transition-transform ${collapsed ? '' : 'rotate-90'}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2.5}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                          <span className="truncate flex-1">
                            {label}{' '}
                            <span className="text-gray-400 font-normal normal-case">
                              · {stageJobs.length}
                            </span>
                          </span>
                        </button>
                        {!collapsed && (
                          <div className="space-y-0.5 px-0.5 min-h-[4px]">
                            {stageJobs.map(job => (
                              <JobItem
                                key={job.id}
                                job={job}
                                stages={stages}
                                selectedJob={selectedJob}
                                setSelectedJob={setSelectedJob}
                                setTab={setTab}
                                setJobModal={setJobModal}
                                onMove={moveJobToStage}
                                clientPhoneMap={clientPhoneMap}
                                respInitials={
                                  /* job_supervisor is the text field the
                                     user edits in Job > Info; it's the
                                     authoritative source. Fall back to the
                                     FK lookup only if there's no text. */
                                  supervisorInitials(job.job_supervisor) ||
                                  initialsByEmpId[job.responsible_employee_id] ||
                                  ''
                                }
                              />
                            ))}
                            {stageJobs.length === 0 && isOver && (
                              <div className="h-6 rounded border-2 border-dashed border-green-300 mx-1" />
                            )}
                          </div>
                        )}
                      </div>
                    )
                  }

                  // When the role+employee filter is active, render a flat
                  // list — no per-stage headers (per Brian's spec on
                  // 2026-05-28: the "job status bars do not [display]"
                  // while filtering).
                  if (filterActive) {
                    const roleLabel =
                      (JOB_ROLES.find(r => r.key === filterRole) || {}).label ||
                      filterRole
                    return (
                      <>
                        <div className="mb-1 rounded-lg">
                          <div className="flex items-center gap-1.5 px-2 py-0">
                            <span className="text-[11px] font-bold text-green-700 uppercase tracking-wide truncate flex-1 bg-green-50 border border-green-200 rounded px-2 py-0 leading-tight">
                              {roleLabel}: {filterEmployee}{' '}
                              <span className="text-green-500 font-normal normal-case">
                                · {sorted.length}
                              </span>
                            </span>
                          </div>
                          <div className="space-y-0.5 px-0.5">
                            {sorted.map(job => (
                              <JobItem
                                key={job.id}
                                job={job}
                                stages={stages}
                                selectedJob={selectedJob}
                                setSelectedJob={setSelectedJob}
                                setTab={setTab}
                                setJobModal={setJobModal}
                                onMove={moveJobToStage}
                                clientPhoneMap={clientPhoneMap}
                                respInitials={
                                  supervisorInitials(job.job_supervisor) ||
                                  initialsByEmpId[job.responsible_employee_id] ||
                                  ''
                                }
                              />
                            ))}
                          </div>
                        </div>
                        {sorted.length === 0 && (
                          <p className="text-xs text-gray-400 text-center py-6">
                            No jobs where {filterEmployee} is {roleLabel}.
                          </p>
                        )}
                      </>
                    )
                  }

                  // In Closed view, show every closed job under one fixed
                  // "Closed" header — no per-stage grouping and no drop targets.
                  if (statusFilter === 'closed') {
                    return (
                      <>
                        <div className="mb-1 rounded-lg">
                          <div className="flex items-center gap-1.5 px-2 py-0">
                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide truncate flex-1 bg-gray-100 border border-gray-300 rounded px-2 py-0 leading-tight">
                              Closed{' '}
                              <span className="text-gray-400 font-normal normal-case">
                                · {sorted.length}
                              </span>
                            </span>
                          </div>
                          <div className="space-y-0.5 px-0.5">
                            {sorted.map(job => (
                              <JobItem
                                key={job.id}
                                job={job}
                                stages={stages}
                                selectedJob={selectedJob}
                                setSelectedJob={setSelectedJob}
                                setTab={setTab}
                                setJobModal={setJobModal}
                                onMove={moveJobToStage}
                                clientPhoneMap={clientPhoneMap}
                                respInitials={
                                  /* job_supervisor is the text field the
                                     user edits in Job > Info; it's the
                                     authoritative source. Fall back to the
                                     FK lookup only if there's no text. */
                                  supervisorInitials(job.job_supervisor) ||
                                  initialsByEmpId[job.responsible_employee_id] ||
                                  ''
                                }
                              />
                            ))}
                          </div>
                        </div>
                        {sorted.length === 0 && (
                          <p className="text-xs text-gray-400 text-center py-6">No closed jobs.</p>
                        )}
                      </>
                    )
                  }

                  return (
                    <>
                      {byStage['__none__'].length > 0 && !hiddenStages.has('__none__') && (
                        <StageSection stageId="__none__" label="Unassigned" />
                      )}
                      {stages
                        .filter(s => !hiddenStages.has(s.id))
                        .map((s, idx) => (
                          <StageSection
                            key={s.id}
                            stageId={s.id}
                            label={`${idx + 1} - ${s.name}`}
                          />
                        ))}
                      {sorted.length === 0 && (
                        <p className="text-xs text-gray-400 text-center py-6">No jobs found.</p>
                      )}
                    </>
                  )
                })()}
              </div>
            )}
          </div>

          {/* Right panel — only thing that scrolls. overflow-x-hidden traps any
            tiny horizontal overflow from inner cards on mobile. */}
          <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden lg:-mr-6">
            {tab === 'info' &&
              (selectedJobObj ? (
                <JobInfoModal
                  key={selectedJobObj.id}
                  job={selectedJobObj}
                  inline
                  onSave={updateJob}
                  onDelete={async (id, name) => {
                    await deleteJob(id, name)
                  }}
                  onClose={() => {}}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20">
                  <p className="text-4xl mb-3">ℹ️</p>
                  <p className="text-sm">Select a job to view its info</p>
                </div>
              ))}

            {tab === 'schedule' && (
              <ScheduleCalendar
                jobs={jobs}
                selectedJob={selectedJob === ALL_JOBS ? 'all' : selectedJob}
                showExceptionsExternal={showExceptions}
                onSetShowExceptions={setShowExceptions}
                onExceptionsLoaded={setExceptionsCount}
                exceptionsCount={exceptionsCount}
                addScheduleTrigger={addScheduleTrigger}
                yardCheckTrigger={yardCheckTrigger}
                statusFilter={statusFilter}
                stages={stages}
                onOpenScheduleAssist={() => {
                  setSchedAssistMode(null)
                  setShowSchedAssist(true)
                }}
                onReopenJob={() => {
                  // Reopen now writes stage_id, responsible_employee_id, and
                  // job_supervisor in addition to status. Refetch the full
                  // list so all fields land in local state.
                  fetchJobs()
                }}
              />
            )}

            {tab === 'work-orders' && (
              <WorkOrders
                jobs={jobs}
                selectedJob={selectedJob === ALL_JOBS ? 'all' : selectedJob}
                jobStatusFilter={statusFilter}
              />
            )}

            {tab === 'tracking' &&
              (selectedJobObj ? (
                <JobComparison job={selectedJobObj} />
              ) : (
                <AllJobsTracking
                  jobs={jobs}
                  statusFilter={statusFilter}
                  onSelectJob={setSelectedJob}
                />
              ))}

            {tab === 'timeclock' && (
              <TimeClock
                jobs={jobs}
                selectedJob={selectedJob === ALL_JOBS ? 'all' : selectedJob}
                statusFilter={statusFilter}
              />
            )}

            {tab === 'daily-logs' && (
              <DailyLogs
                jobs={jobs}
                selectedJob={selectedJob === ALL_JOBS ? 'all' : selectedJob}
                statusFilter={statusFilter}
              />
            )}
            {tab === 'tasks' &&
              (selectedJobObj ? (
                <JobTasksPanel job={selectedJobObj} />
              ) : (
                <AllJobsTasks
                  jobs={jobs}
                  statusFilter={statusFilter}
                  onSelectJob={setSelectedJob}
                />
              ))}
            {tab === 'change-orders' &&
              (selectedJobObj ? (
                <JobChangeOrdersPanel job={selectedJobObj} coDeepLink={coDeepLink} />
              ) : (
                <AllJobsChangeOrders
                  jobs={jobs}
                  statusFilter={statusFilter}
                  onSelectJob={setSelectedJob}
                />
              ))}
            {tab === 'finance' && (
              <JobFinancePanel
                job={selectedJobObj}
                invoiceDeepLink={financeDeepLink}
                onOpenJobInvoice={(jobId, invoiceId) => {
                  setSelectedJob(jobId)
                  setFinanceDeepLink({ invoiceId, ts: Date.now() })
                }}
              />
            )}
            {tab === 'files' && <JobFilesPanel job={selectedJobObj} />}
          </div>
        </div>
      )}

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

      {/* ── Schedule Assistance: mode picker (Phase 1) ───────────
           Picks which optimization to run; Phase 2/3 wire the
           actual optimizer + apply flow. ───────────────────────── */}
      {showSchedAssist && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={e => {
            if (e.target === e.currentTarget) {
              setShowSchedAssist(false)
              setSchedAssistView('mode')
              setOptResult(null)
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-start justify-between p-6 pb-3 flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900">✨ Schedule Assistance</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {schedAssistView === 'mode' && 'Pick which optimization to run.'}
                  {schedAssistView === 'configure' &&
                    'Choose start location, dates, and which jobs to include.'}
                  {schedAssistView === 'result' &&
                    'Review the route — edit order if needed — then apply.'}
                  {schedAssistView === 'supervisor-config' &&
                    'Pick the supervisors to include in the assignment.'}
                  {schedAssistView === 'supervisor-result' &&
                    'Review the proposed assignments — drag jobs between supervisors if needed — then apply.'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowSchedAssist(false)
                  setSchedAssistView('mode')
                  setOptResult(null)
                }}
                className="text-gray-300 hover:text-gray-500"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="px-6 pb-6 overflow-y-auto flex-1">
              {/* ════ MODE PICKER VIEW ════ */}
              {schedAssistView === 'mode' && (
                <>
                  {/* Geocoding status — optimization can't run without lat/lon */}
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-xs font-semibold text-gray-700">Geocoding status</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {geoStats.total > 0 ? (
                            <>
                              <span className="font-semibold text-gray-700">{geoStats.ok}</span> of{' '}
                              {geoStats.total} jobs geocoded
                              {geoStats.pending > 0 && (
                                <>
                                  {' '}
                                  ·{' '}
                                  <span className="text-amber-700">{geoStats.pending} pending</span>
                                </>
                              )}
                              {geoStats.not_found > 0 && (
                                <>
                                  {' '}
                                  ·{' '}
                                  <span className="text-gray-500">
                                    {geoStats.not_found} not found
                                  </span>
                                </>
                              )}
                              {geoStats.error > 0 && (
                                <>
                                  {' '}
                                  · <span className="text-red-600">{geoStats.error} errors</span>
                                </>
                              )}
                            </>
                          ) : (
                            'Loading…'
                          )}
                        </p>
                      </div>
                      <button
                        onClick={runGeocoder}
                        disabled={geocoding || geoStats.pending === 0}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-700 text-white hover:bg-indigo-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                      >
                        {geocoding
                          ? 'Geocoding…'
                          : geoStats.pending === 0
                            ? 'All set'
                            : 'Geocode pending jobs'}
                      </button>
                    </div>
                    {geoStats.total > 0 && (
                      <div className="bg-gray-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-green-600 h-1.5 transition-all"
                          style={{ width: `${Math.round((geoStats.ok / geoStats.total) * 100)}%` }}
                        />
                      </div>
                    )}
                    {geoMsg && (
                      <p
                        className={`text-[11px] mt-2 ${geoMsg.startsWith('Error') ? 'text-red-600' : 'text-gray-500'}`}
                      >
                        {geoMsg}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    {[
                      {
                        key: 'supervisor',
                        emoji: '👥',
                        title: 'Optimize Job Supervisor Assignment',
                        desc: 'Cluster open jobs by location and balance them across your Job Supervisors with equal job count.',
                      },
                      {
                        key: 'yard',
                        emoji: '🌿',
                        title: 'Optimize Yard Checks',
                        desc: 'Route a single person efficiently through all jobs currently in the Yard Check stage. Respects yard check #s.',
                      },
                      {
                        key: 'warranty',
                        emoji: '🛡️',
                        title: 'Optimize Warranties',
                        desc: 'Same idea, but for jobs in the Warranty stage.',
                      },
                      {
                        key: 'both',
                        emoji: '🌿🛡️',
                        title: 'Optimize Yard Checks + Warranties',
                        desc: 'Combined route across both Yard Check and Warranty jobs.',
                      },
                    ].map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => setSchedAssistMode(opt.key)}
                        className={`w-full flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-colors ${
                          schedAssistMode === opt.key
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/40'
                        }`}
                      >
                        <span className="text-2xl mt-0.5">{opt.emoji}</span>
                        <div>
                          <p
                            className={`text-sm font-bold ${schedAssistMode === opt.key ? 'text-indigo-900' : 'text-gray-800'}`}
                          >
                            {opt.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="mt-5 flex items-center gap-2">
                    <button
                      disabled={!schedAssistMode}
                      onClick={() => {
                        if (schedAssistMode === 'supervisor') {
                          loadSupervisors()
                          setSchedAssistView('supervisor-config')
                        } else {
                          loadEligibleJobs(schedAssistMode)
                          setSchedAssistView('configure')
                        }
                      }}
                      className="flex-1 py-2.5 bg-indigo-700 text-white text-sm font-semibold rounded-xl hover:bg-indigo-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Next →
                    </button>
                    <button
                      onClick={() => {
                        setShowSchedAssist(false)
                        setSchedAssistMode(null)
                      }}
                      className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}

              {/* ════ CONFIGURE VIEW ════ */}
              {schedAssistView === 'configure' && (
                <>
                  <div className="space-y-4">
                    {/* Start location */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Start location
                      </label>
                      {startLocations.length === 0 ? (
                        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          No start locations saved. Go to Jobs → Settings → Start Locations to add
                          one first.
                        </div>
                      ) : (
                        <select
                          value={pickedStartId}
                          onChange={e => setPickedStartId(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {startLocations.map(l => (
                            <option key={l.id} value={l.id}>
                              {l.label} — {l.address} {l.id === defaultStartId ? '★' : ''}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Start date
                        </label>
                        <input
                          type="date"
                          value={optStartDate}
                          onChange={e => setOptStartDate(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Spread across days
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={optDaysToSpread}
                          onChange={e => {
                            // Accept only digits; let user clear the field while typing.
                            const v = e.target.value.replace(/\D/g, '')
                            setOptDaysToSpread(
                              v === '' ? '' : Math.max(1, Math.min(parseInt(v), 30))
                            )
                          }}
                          onBlur={e => {
                            // Snap back to 1 if the user left the field empty.
                            if (e.target.value === '' || parseInt(e.target.value) < 1)
                              setOptDaysToSpread(1)
                          }}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Eligible jobs */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-semibold text-gray-600">
                          Eligible jobs ({eligibleJobs.length - excludedJobIds.size} selected of{' '}
                          {eligibleJobs.length})
                        </label>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setExcludedJobIds(new Set())}
                            className="text-xs text-indigo-700 hover:underline"
                          >
                            Select all
                          </button>
                          <button
                            onClick={() => setExcludedJobIds(new Set(eligibleJobs.map(j => j.id)))}
                            className="text-xs text-gray-400 hover:underline"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      {eligibleLoading ? (
                        <div className="flex justify-center py-8">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-700" />
                        </div>
                      ) : eligibleJobs.length === 0 ? (
                        <p className="text-xs text-gray-400 italic text-center py-4 bg-gray-50 rounded-lg">
                          No eligible geocoded jobs found for this mode.
                        </p>
                      ) : (
                        <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                          {eligibleJobs.map(j => {
                            const excluded = excludedJobIds.has(j.id)
                            return (
                              <label
                                key={j.id}
                                className={`flex items-center gap-2 px-3 py-1.5 text-sm border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 ${excluded ? 'opacity-50' : ''}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={!excluded}
                                  onChange={() =>
                                    setExcludedJobIds(prev => {
                                      const next = new Set(prev)
                                      if (next.has(j.id)) next.delete(j.id)
                                      else next.add(j.id)
                                      return next
                                    })
                                  }
                                  className="accent-indigo-600 flex-shrink-0"
                                />
                                <span className="flex-1 truncate text-gray-700">
                                  {j.name || j.client_name}
                                </span>
                                {j._yard_checks_used !== undefined && (
                                  <span className="text-[10px] font-mono text-gray-400 flex-shrink-0">
                                    YC {j._yard_checks_used}/{yardCheckTotal}
                                  </span>
                                )}
                              </label>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {optError && <p className="text-xs text-red-600">{optError}</p>}
                  </div>

                  <div className="mt-5 flex items-center gap-2">
                    <button
                      disabled={
                        optimizing ||
                        eligibleJobs.length - excludedJobIds.size === 0 ||
                        !pickedStartId
                      }
                      onClick={runOptimization}
                      className="flex-1 py-2.5 bg-indigo-700 text-white text-sm font-semibold rounded-xl hover:bg-indigo-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {optimizing ? 'Optimizing route…' : 'Run optimization'}
                    </button>
                    <button
                      onClick={() => {
                        setSchedAssistView('mode')
                        setOptError('')
                      }}
                      className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50"
                    >
                      ← Back
                    </button>
                  </div>
                </>
              )}

              {/* ════ RESULT VIEW ════ */}
              {schedAssistView === 'result' && optResult && (
                <>
                  {/* Totals summary */}
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 mb-4 grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-xs text-indigo-700">Stops</p>
                      <p className="text-xl font-bold text-indigo-900">{optResult.totals.stops}</p>
                    </div>
                    <div>
                      <p className="text-xs text-indigo-700">Drive time</p>
                      <p className="text-xl font-bold text-indigo-900">
                        {optResult.totals.drive_minutes} min
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-indigo-700">Distance</p>
                      <p className="text-xl font-bold text-indigo-900">
                        {optResult.totals.drive_miles} mi
                      </p>
                    </div>
                  </div>

                  {/* Ordered route — grouped by day so user sees the spread */}
                  {(() => {
                    const days = Math.max(
                      1,
                      Math.min(parseInt(optDaysToSpread) || 1, optResult.ordered_jobs.length)
                    )
                    const jobsPerDay = Math.ceil(optResult.ordered_jobs.length / days)
                    // Build day buckets
                    const buckets = []
                    for (let d = 0; d < days; d++) {
                      const startIdx = d * jobsPerDay
                      const endIdx = Math.min(startIdx + jobsPerDay, optResult.ordered_jobs.length)
                      if (startIdx >= optResult.ordered_jobs.length) break
                      const date = new Date(optStartDate + 'T00:00:00')
                      date.setDate(date.getDate() + d)
                      buckets.push({
                        dayNum: d + 1,
                        date,
                        dateStr: date.toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        }),
                        stops: optResult.ordered_jobs
                          .slice(startIdx, endIdx)
                          .map((job, i) => ({ job, globalIdx: startIdx + i })),
                      })
                    }
                    return (
                      <div className="space-y-3">
                        <p className="text-xs text-gray-500">
                          Starting from{' '}
                          <span className="font-semibold text-gray-700">
                            {optResult.start.label}
                          </span>
                        </p>
                        {buckets.map(bucket => (
                          <div
                            key={bucket.dayNum}
                            className="border border-gray-200 rounded-xl overflow-hidden"
                          >
                            <div className="bg-indigo-50 border-b border-indigo-200 px-3 py-2 flex items-center justify-between">
                              <span className="text-xs font-bold text-indigo-900 uppercase tracking-wide">
                                Day {bucket.dayNum} · {bucket.dateStr}
                              </span>
                              <span className="text-[11px] text-indigo-700 font-semibold">
                                {bucket.stops.length} stop{bucket.stops.length === 1 ? '' : 's'}
                              </span>
                            </div>
                            <div className="divide-y divide-gray-100">
                              {bucket.stops.map(({ job, globalIdx }) => {
                                const leg = optResult.legs[globalIdx]
                                return (
                                  <div key={job.id} className="flex items-center gap-2 px-3 py-2">
                                    <span className="w-6 text-center text-xs font-bold text-indigo-700 flex-shrink-0">
                                      #{globalIdx + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-gray-800 truncate">
                                        {job.name || job.client_name}
                                      </p>
                                      <p className="text-[11px] text-gray-500 truncate">
                                        {leg ? `${Math.round(leg.minutes)} min drive` : ''}
                                        {job._yard_checks_used !== undefined &&
                                          ` · Next yard check #${(job._yard_checks_used || 0) + 1}`}
                                      </p>
                                    </div>
                                    <div className="flex flex-col flex-shrink-0">
                                      <button
                                        onClick={() => reorderRouteJob(globalIdx, -1)}
                                        disabled={globalIdx === 0}
                                        className="text-gray-300 hover:text-indigo-600 disabled:opacity-30 text-xs leading-none p-0.5"
                                      >
                                        ▲
                                      </button>
                                      <button
                                        onClick={() => reorderRouteJob(globalIdx, 1)}
                                        disabled={globalIdx === optResult.ordered_jobs.length - 1}
                                        className="text-gray-300 hover:text-indigo-600 disabled:opacity-30 text-xs leading-none p-0.5"
                                      >
                                        ▼
                                      </button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })()}

                  <p className="text-[11px] text-gray-400 mt-3 italic">
                    Applying will create {optResult.ordered_jobs.length} schedule item
                    {optResult.ordered_jobs.length === 1 ? '' : 's'} starting {optStartDate},
                    distributed across {optDaysToSpread} day{optDaysToSpread === 1 ? '' : 's'}.
                  </p>

                  <div className="mt-5 flex items-center gap-2">
                    <button
                      disabled={applying}
                      onClick={applyOptimization}
                      className="flex-1 py-2.5 bg-green-700 text-white text-sm font-semibold rounded-xl hover:bg-green-800 disabled:opacity-40 transition-colors"
                    >
                      {applying ? 'Applying…' : '✓ Apply & Schedule'}
                    </button>
                    <button
                      onClick={() => setSchedAssistView('configure')}
                      className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50"
                    >
                      ← Back
                    </button>
                  </div>
                </>
              )}

              {/* ════ SUPERVISOR CONFIGURE VIEW ════ */}
              {schedAssistView === 'supervisor-config' && (
                <>
                  <div className="space-y-4">
                    {/* Stage filter — only assign supervisors for jobs that
                      are actually ready for production (Pre-Install onward,
                      typically). User picks which stages count. */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-semibold text-gray-600">
                          Job stages to include ({supStageIds.size} of {stages.length + 1})
                        </label>
                        <div className="flex gap-3">
                          <button
                            onClick={() =>
                              setSupStageIds(new Set([...stages.map(s => s.id), '__none__']))
                            }
                            className="text-xs text-indigo-700 hover:underline"
                          >
                            Select all
                          </button>
                          <button
                            onClick={() => setSupStageIds(new Set())}
                            className="text-xs text-gray-400 hover:underline"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      <div className="border border-gray-200 rounded-lg max-h-44 overflow-y-auto">
                        {/* Real stages, in their sort order */}
                        {stages.map((s, idx) => {
                          const checked = supStageIds.has(s.id)
                          return (
                            <label
                              key={s.id}
                              className={`flex items-center gap-2 px-3 py-1.5 text-sm border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 ${!checked ? 'opacity-50' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  setSupStageIds(prev => {
                                    const next = new Set(prev)
                                    if (next.has(s.id)) next.delete(s.id)
                                    else next.add(s.id)
                                    return next
                                  })
                                }
                                className="accent-indigo-600 flex-shrink-0"
                              />
                              <span className="text-xs font-bold text-gray-400 w-5">{idx + 1}</span>
                              <span className="flex-1 text-gray-700">{s.name}</span>
                            </label>
                          )
                        })}
                        {/* Unassigned bucket — jobs with no stage_id */}
                        <label
                          className={`flex items-center gap-2 px-3 py-1.5 text-sm border-t border-gray-200 cursor-pointer hover:bg-gray-50 ${!supStageIds.has('__none__') ? 'opacity-50' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={supStageIds.has('__none__')}
                            onChange={() =>
                              setSupStageIds(prev => {
                                const next = new Set(prev)
                                if (next.has('__none__')) next.delete('__none__')
                                else next.add('__none__')
                                return next
                              })
                            }
                            className="accent-indigo-600 flex-shrink-0"
                          />
                          <span className="text-xs font-bold text-gray-400 w-5">—</span>
                          <span className="flex-1 text-gray-700 italic">Unassigned</span>
                        </label>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">
                        Untick stages where jobs aren't ready for supervisor assignment yet (Design,
                        Permits, etc.).
                      </p>
                    </div>

                    {/* Eligible jobs preview — user can untick any individual job */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-semibold text-gray-600">
                          Jobs to include ({supEligibleJobs.length - supExcludedJobIds.size} of{' '}
                          {supEligibleJobs.length})
                        </label>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setSupExcludedJobIds(new Set())}
                            className="text-xs text-indigo-700 hover:underline"
                          >
                            Select all
                          </button>
                          <button
                            onClick={() =>
                              setSupExcludedJobIds(new Set(supEligibleJobs.map(j => j.id)))
                            }
                            className="text-xs text-gray-400 hover:underline"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      {supEligibleLoading ? (
                        <div className="flex justify-center py-6">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-700" />
                        </div>
                      ) : supEligibleJobs.length === 0 ? (
                        <p className="text-xs text-gray-400 italic text-center py-3 bg-gray-50 rounded-lg">
                          {supStageIds.size === 0
                            ? 'Pick at least one stage above.'
                            : 'No open geocoded jobs in those stages.'}
                        </p>
                      ) : (
                        <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                          {supEligibleJobs.map(j => {
                            const excluded = supExcludedJobIds.has(j.id)
                            const stageName =
                              stages.find(s => s.id === j.stage_id)?.name || 'Unassigned'
                            return (
                              <label
                                key={j.id}
                                className={`flex items-center gap-2 px-3 py-1.5 text-sm border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 ${excluded ? 'opacity-50' : ''}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={!excluded}
                                  onChange={() =>
                                    setSupExcludedJobIds(prev => {
                                      const next = new Set(prev)
                                      if (next.has(j.id)) next.delete(j.id)
                                      else next.add(j.id)
                                      return next
                                    })
                                  }
                                  className="accent-indigo-600 flex-shrink-0"
                                />
                                <span className="flex-1 truncate text-gray-700">
                                  {j.name || j.client_name}
                                </span>
                                <span className="text-[10px] text-gray-400 flex-shrink-0">
                                  {stageName}
                                </span>
                              </label>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-gray-500">
                      Pick the supervisors to include in the assignment. Default: every active
                      employee whose position contains "supervisor".
                    </p>
                    {supLoading ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-700" />
                      </div>
                    ) : supervisors.length === 0 ? (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        No active employees have a position containing "supervisor". Add or rename a
                        position in HR → Positions, then assign at least one employee to it.
                      </p>
                    ) : (
                      <div className="border border-gray-200 rounded-lg max-h-72 overflow-y-auto">
                        {supervisors.map(s => (
                          <label
                            key={s.id}
                            className={`flex items-center gap-2 px-3 py-2 text-sm border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 ${!s.included ? 'opacity-50' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={s.included}
                              onChange={() =>
                                setSupervisors(prev =>
                                  prev.map(p =>
                                    p.id === s.id ? { ...p, included: !p.included } : p
                                  )
                                )
                              }
                              className="accent-indigo-600 flex-shrink-0"
                            />
                            <span className="flex-1 text-gray-800 font-medium">
                              {s.first_name} {s.last_name}
                            </span>
                            <span className="text-[11px] text-gray-400">{s.job_title}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    <p className="text-[11px] text-gray-400">
                      The optimizer will cluster all open geocoded jobs by location and assign each
                      cluster to one supervisor, balancing for equal job count.
                    </p>
                    {optError && <p className="text-xs text-red-600">{optError}</p>}
                  </div>

                  <div className="mt-5 flex items-center gap-2">
                    <button
                      disabled={supRunning || supervisors.filter(s => s.included).length === 0}
                      onClick={runSupervisorOptimization}
                      className="flex-1 py-2.5 bg-indigo-700 text-white text-sm font-semibold rounded-xl hover:bg-indigo-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {supRunning ? 'Running…' : 'Run optimization'}
                    </button>
                    <button
                      onClick={() => {
                        setSchedAssistView('mode')
                        setOptError('')
                      }}
                      className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50"
                    >
                      ← Back
                    </button>
                  </div>
                </>
              )}

              {/* ════ SUPERVISOR RESULT VIEW ════ */}
              {schedAssistView === 'supervisor-result' && supResult && (
                <>
                  {/* Summary */}
                  {(() => {
                    const counts = supResult.supervisors.map(s => s.jobs.length)
                    const total = counts.reduce((a, b) => a + b, 0)
                    const min = Math.min(...counts),
                      max = Math.max(...counts)
                    return (
                      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 mb-4 grid grid-cols-3 gap-3 text-center">
                        <div>
                          <p className="text-xs text-indigo-700">Supervisors</p>
                          <p className="text-xl font-bold text-indigo-900">
                            {supResult.supervisors.length}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-indigo-700">Jobs assigned</p>
                          <p className="text-xl font-bold text-indigo-900">{total}</p>
                        </div>
                        <div>
                          <p className="text-xs text-indigo-700">Per-supervisor range</p>
                          <p className="text-xl font-bold text-indigo-900">
                            {min}–{max}
                          </p>
                        </div>
                      </div>
                    )
                  })()}

                  <p className="text-[11px] text-gray-500 mb-2 italic">
                    Each job's "Move to" dropdown lets you reassign manually before applying.
                  </p>

                  <div className="space-y-3">
                    {supResult.supervisors.map(sup => (
                      <div
                        key={sup.id}
                        className="border border-gray-200 rounded-xl overflow-hidden"
                      >
                        <div className="bg-indigo-50 border-b border-indigo-200 px-3 py-2 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-indigo-900">
                              {sup.name || '(unnamed)'}
                            </p>
                            {sup.job_title && (
                              <p className="text-[10px] text-indigo-700">{sup.job_title}</p>
                            )}
                          </div>
                          <span className="text-xs font-semibold text-indigo-700">
                            {sup.jobs.length} job{sup.jobs.length === 1 ? '' : 's'}
                          </span>
                        </div>
                        <div className="divide-y divide-gray-100 max-h-56 overflow-y-auto">
                          {sup.jobs.length === 0 ? (
                            <p className="text-xs text-gray-400 italic text-center py-4">
                              No jobs assigned to this supervisor.
                            </p>
                          ) : (
                            sup.jobs.map(job => (
                              <div
                                key={job.id}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-800 truncate">
                                    {job.name || job.client_name}
                                  </p>
                                  <p className="text-[10px] text-gray-400 truncate">
                                    {[job.job_address, job.job_city].filter(Boolean).join(', ')}
                                  </p>
                                </div>
                                <select
                                  value={sup.id}
                                  onChange={e =>
                                    moveJobBetweenSupervisors(job.id, sup.id, e.target.value)
                                  }
                                  className="text-[11px] border border-gray-200 rounded px-1.5 py-0.5 bg-white text-gray-600 max-w-[120px]"
                                  title="Move to other supervisor"
                                >
                                  {supResult.supervisors.map(s => (
                                    <option key={s.id} value={s.id}>
                                      {s.name || '(unnamed)'}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-[11px] text-gray-400 mt-3 italic">
                    Applying will set <code className="text-gray-600">job_supervisor</code> on
                    every assigned job to the supervisor's name.
                  </p>

                  <div className="mt-5 flex items-center gap-2">
                    <button
                      disabled={supApplying}
                      onClick={applySupervisorAssignments}
                      className="flex-1 py-2.5 bg-green-700 text-white text-sm font-semibold rounded-xl hover:bg-green-800 disabled:opacity-40 transition-colors"
                    >
                      {supApplying ? 'Applying…' : '✓ Apply assignments'}
                    </button>
                    <button
                      onClick={() => setSchedAssistView('supervisor-config')}
                      className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50"
                    >
                      ← Back
                    </button>
                  </div>
                </>
              )}
            </div>
            {/* end scroll body */}
          </div>
        </div>
      )}

      {/* EmployeePicker — fires on every stage move (drag-drop or move modal).
          User picks the responsible employee, then we write stage_id and
          responsible_employee_id together. Pre-selects the job's current
          responsible employee. */}
      {assignPicker && (
        <EmployeePicker
          employees={activeEmployees}
          currentEmployeeId={
            jobs.find(j => j.id === assignPicker.jobId)?.responsible_employee_id || null
          }
          targetStageName={
            assignPicker.targetStageId
              ? stages.find(s => s.id === assignPicker.targetStageId)?.name || 'this stage'
              : 'Unassigned'
          }
          onCancel={() => setAssignPicker(null)}
          onPick={empId => {
            const { jobId, targetStageId } = assignPicker
            setAssignPicker(null)
            commitMoveJobToStage(jobId, targetStageId, empId)
          }}
        />
      )}
    </div>
  )
}

// EmployeePicker — small centered modal that lists every active employee.
// Used by JobsList to (re)assign the responsible employee on every stage
// change. Pre-selects whatever employee is currently responsible.
function EmployeePicker({ employees, currentEmployeeId, targetStageName, onCancel, onPick }) {
  const [selectedId, setSelectedId] = useState(currentEmployeeId || '')
  const [search, setSearch] = useState('')
  const filtered = employees.filter(e => {
    if (!search.trim()) return true
    const full = `${e.first_name || ''} ${e.last_name || ''}`.toLowerCase()
    return full.includes(search.toLowerCase())
  })
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-bold text-gray-900">Assign responsible employee</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Moving to <span className="font-medium text-gray-700">{targetStageName}</span>
          </p>
        </div>
        <div className="p-3 border-b border-gray-100">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search employees…"
            className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            autoFocus
          />
        </div>
        <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
          {filtered.length === 0 && (
            <p className="text-center text-xs text-gray-400 py-6">No matching employees.</p>
          )}
          {filtered.map(e => {
            const isSel = selectedId === e.id
            return (
              <button
                key={e.id}
                onClick={() => setSelectedId(e.id)}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${
                  isSel ? 'bg-green-50' : 'hover:bg-gray-50'
                }`}
              >
                <span
                  className={`inline-block w-4 h-4 rounded-full border ${
                    isSel ? 'bg-green-600 border-green-700' : 'border-gray-300'
                  }`}
                />
                <span className="flex-1 truncate">
                  {e.first_name} {e.last_name}
                </span>
                <span className="text-xs text-gray-400 font-mono">
                  {empInitials(e)}
                </span>
              </button>
            )
          })}
        </div>
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onPick(selectedId || null)}
            disabled={!selectedId}
            className={`px-3 py-1.5 text-sm rounded-md font-medium ${
              selectedId
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Assign &amp; move
          </button>
        </div>
      </div>
    </div>
  )
}

// Compute initials like "JD" from an employee row. Falls back to first
// letter only if last_name is missing.
function empInitials(emp) {
  if (!emp) return ''
  const f = (emp.first_name || '').trim()
  const l = (emp.last_name || '').trim()
  if (!f && !l) return ''
  return `${f.charAt(0)}${l.charAt(0)}`.toUpperCase()
}

// Robust initials from a text name. Handles "First Last", "Last, First",
// and ignores trailing parenthesized junk like "John Smith (JS)" so it
// returns "JS" regardless of which format the user entered.
function supervisorInitials(raw) {
  if (!raw) return ''
  let s = String(raw).trim().replace(/\s*\([^)]*\)\s*$/, '').trim()
  if (!s) return ''
  if (s.includes(',')) {
    // "Last, First" → take first letter of "First" then first letter of "Last"
    const [last, first = ''] = s.split(',').map(p => p.trim())
    if (first && last) return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
    return last.slice(0, 2).toUpperCase()
  }
  const parts = s.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase()
}

function JobDetail({ job, onDelete, price, onEdit }) {
  const statusInfo = {
    active: { label: 'Active', cls: 'bg-green-100 text-green-800 border border-green-300' },
    completed: { label: 'Completed', cls: 'bg-gray-100 text-gray-700 border border-gray-300' },
    on_hold: { label: 'On Hold', cls: 'bg-yellow-100 text-yellow-800 border border-yellow-300' },
    cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-700 border border-red-300' },
  }[job.status] || { label: 'Active', cls: 'bg-green-100 text-green-800 border border-green-300' }

  return (
    <div className="card bg-blue-50">
      <div className="flex items-start justify-between mb-4 gap-2">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
            {job.name || job.client_name}
          </h2>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusInfo.cls}`}>
            {statusInfo.label}
          </span>
          <Link
            to={`/jobs/${job.id}`}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Full View
          </Link>
          <Link
            to={`/jobs/${job.id}/tracker`}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-green-700 text-white hover:bg-green-800 transition-colors"
          >
            Track
          </Link>
          <button
            onClick={() => onDelete(job.id, job.name || job.client_name)}
            className="text-xs px-2 py-1.5 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            ✕
          </button>
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
            <p className="font-bold text-green-700">
              ${Math.round(job.gross_profit).toLocaleString()}
            </p>
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
            <p className="font-medium text-gray-700">
              {new Date(job.sold_date).toLocaleDateString()}
            </p>
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
  '#ef4444',
  '#dc2626',
  '#b91c1c',
  '#f97316',
  '#ea580c',
  '#c2410c',
  '#f59e0b',
  '#d97706',
  '#b45309',
  '#eab308',
  '#ca8a04',
  '#92400e',
  '#84cc16',
  '#65a30d',
  '#4d7c0f',
  '#22c55e',
  '#16a34a',
  '#166534',
  '#10b981',
  '#059669',
  '#065f46',
  '#14b8a6',
  '#0d9488',
  '#0f766e',
  '#06b6d4',
  '#0891b2',
  '#155e75',
  '#0ea5e9',
  '#0284c7',
  '#075985',
  '#3b82f6',
  '#2563eb',
  '#1d4ed8',
  '#6366f1',
  '#4f46e5',
  '#4338ca',
  '#8b5cf6',
  '#7c3aed',
  '#6d28d9',
  '#a855f7',
  '#9333ea',
  '#7e22ce',
  '#d946ef',
  '#c026d3',
  '#a21caf',
  '#ec4899',
  '#db2777',
  '#be185d',
  '#f43f5e',
  '#000000',
]

// ── Color Dropdown Picker ─────────────────────────────────────────────────────
function ColorDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
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
        <span
          className="w-5 h-5 rounded-full border border-gray-200 flex-shrink-0"
          style={{ backgroundColor: value }}
        />
        <span className="font-mono text-gray-700 text-xs">{value}</span>
        <svg
          className="w-3.5 h-3.5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
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
                onClick={() => {
                  onChange(c)
                  setOpen(false)
                }}
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

const WEEK_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function getWeekRangeStr(startDay) {
  const today = new Date()
  const diff = (today.getDay() - startDay + 7) % 7
  const start = new Date(today)
  start.setDate(today.getDate() - diff)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const fmt = d =>
    d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })
  return `${fmt(start)} – ${fmt(end)}`
}

// ── Task Lists Settings ───────────────────────────────────────────────────────
// Manages two predefined lists used by the Tasks panel: Task Categories and
// Task Descriptions. Each is a simple add / rename / delete CRUD over its own
// table. Categories drive the first column dropdown; descriptions drive
// autocomplete suggestions for the second column.
// ── Scheduling Assistance Settings ───────────────────────────────────────────
// Parent settings panel with two sub-tabs:
//   - Start Locations         (saved start addresses for the route optimizer)
//   - Supervisor Assignment   (which HR positions count as supervisors)
function SchedulingAssistanceSettings() {
  const [tab, setTab] = useState('start-locations')
  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex border-b border-gray-200">
        {[
          { key: 'start-locations', label: '📍 Start Locations' },
          { key: 'supervisor-positions', label: '👥 Supervisor Assignment' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-green-700 text-green-800'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'start-locations' && <StartLocationsCard currentUserIsAdmin={true} />}
      {tab === 'supervisor-positions' && <SupervisorPositionsCard />}
    </div>
  )
}

function TaskListsSettings() {
  const [tab, setTab] = useState('categories') // 'categories' | 'descriptions'
  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex border-b border-gray-200">
        {[
          { key: 'categories', label: 'Task Categories' },
          { key: 'descriptions', label: 'Task Descriptions' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-green-700 text-green-800'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'categories' && (
        <SimpleListEditor
          table="task_categories"
          title="Task Categories"
          helper="Categories appear in the first column dropdown when creating tasks."
        />
      )}
      {tab === 'descriptions' && (
        <SimpleListEditor
          table="task_descriptions"
          title="Task Descriptions"
          helper="Descriptions appear as autocomplete suggestions in the task description column. Users can also type custom descriptions."
        />
      )}
    </div>
  )
}

// ── SimpleListEditor ──────────────────────────────────────────────────────────
// Reusable add / rename / delete editor for a flat name+sort_order table.
// Used by Task Categories and Task Descriptions in Settings → Task Lists.
function SimpleListEditor({ table, title, helper }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')

  useEffect(() => {
    fetchItems()
  }, [table])

  async function fetchItems() {
    setLoading(true)
    const { data } = await supabase.from(table).select('*').order('sort_order').order('name')
    setItems(data || [])
    setLoading(false)
  }

  async function add() {
    const name = newName.trim()
    if (!name) return
    const maxOrder = items.reduce((m, i) => Math.max(m, i.sort_order || 0), 0)
    const { data, error } = await supabase
      .from(table)
      .insert({ name, sort_order: maxOrder + 1 })
      .select()
      .single()
    if (error) {
      alert(error.message)
      return
    }
    setItems(prev => [...prev, data])
    setNewName('')
  }

  async function rename(id, name) {
    const trimmed = name.trim()
    if (!trimmed) {
      setEditingId(null)
      return
    }
    await supabase.from(table).update({ name: trimmed }).eq('id', id)
    setItems(prev => prev.map(i => (i.id === id ? { ...i, name: trimmed } : i)))
    setEditingId(null)
  }

  async function remove(id) {
    if (!confirm(`Delete this ${title.toLowerCase().replace(/s$/, '')}?`)) return
    await supabase.from(table).delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-base font-bold text-gray-800 mb-1">{title}</h2>
      {helper && <p className="text-sm text-gray-500 mb-4">{helper}</p>}

      {/* Add new */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') add()
          }}
          placeholder={`New ${title.toLowerCase().replace(/s$/, '')}…`}
          className="input text-sm flex-1"
        />
        <button onClick={add} className="btn-primary text-sm px-4 py-2">
          Add
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-700" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-400 italic text-center py-4">None yet — add one above.</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span className="text-xs font-bold text-blue-900 w-6 text-center flex-shrink-0 bg-blue-50 border border-blue-200 rounded px-1 py-0.5">
                {idx + 1}
              </span>
              {editingId === item.id ? (
                <input
                  autoFocus
                  type="text"
                  value={editingName}
                  onChange={e => setEditingName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') rename(item.id, editingName)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  onBlur={() => rename(item.id, editingName)}
                  className="input text-sm flex-1 py-0.5"
                />
              ) : (
                <span className="flex-1 text-sm font-medium text-gray-700">{item.name}</span>
              )}
              <button
                onClick={() => {
                  setEditingId(item.id)
                  setEditingName(item.name)
                }}
                className="text-gray-400 hover:text-gray-700 p-1 rounded hover:bg-gray-200"
                title="Rename"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z"
                  />
                </svg>
              </button>
              <button
                onClick={() => remove(item.id)}
                className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50"
                title="Delete"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Job Schedule Settings ─────────────────────────────────────────────────────
function JobScheduleSettings({
  stages = [],
  onAddStage,
  onUpdateStage,
  onDeleteStage,
  onReorderStages,
}) {
  const [settingsTab, setSettingsTab] = useState('general')
  const [defaultColor, setDefaultColor] = useState('#15803d')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [payrollWeekStart, setPayrollWeekStart] = useState(0)
  const [savingPayroll, setSavingPayroll] = useState(false)
  const [savedPayroll, setSavedPayroll] = useState(false)
  const [newStage, setNewStage] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [dragIdx, setDragIdx] = useState(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)

  useEffect(() => {
    supabase
      .from('company_settings')
      .select('default_schedule_color')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.default_schedule_color) setDefaultColor(data.default_schedule_color)
      })
    supabase
      .from('company_settings')
      .select('payroll_week_start')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.payroll_week_start != null) setPayrollWeekStart(data.payroll_week_start)
      })
  }, [])

  async function handleSaveColor() {
    setSaving(true)
    setSaved(false)
    await supabase
      .from('company_settings')
      .update({ default_schedule_color: defaultColor })
      .not('id', 'is', null)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleSavePayroll() {
    setSavingPayroll(true)
    setSavedPayroll(false)
    await supabase
      .from('company_settings')
      .update({ payroll_week_start: payrollWeekStart })
      .not('id', 'is', null)
    setSavingPayroll(false)
    setSavedPayroll(true)
    setTimeout(() => setSavedPayroll(false), 2000)
  }

  function handleStageDragStart(idx) {
    setDragIdx(idx)
  }

  function handleStageDrop(toIdx) {
    if (dragIdx === null || dragIdx === toIdx) return
    const reordered = [...stages]
    const [moved] = reordered.splice(dragIdx, 1)
    reordered.splice(toIdx, 0, moved)
    onReorderStages(reordered)
    setDragIdx(null)
    setDragOverIdx(null)
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* White sub-tab bar */}
      <div className="flex border-b border-gray-200 bg-white px-6 flex-nowrap overflow-x-auto flex-shrink-0">
        {[
          { key: 'general', label: '⚙️ General' },
          { key: 'stages', label: '🪜 Job Stages' },
          { key: 'task-lists', label: '✅ Task Lists' },
          { key: 'scheduling-assistance', label: '✨ Scheduling Assistance' },
          { key: 'templates', label: '📋 Job Templates' },
          { key: 'email-templates', label: '✉️ E-Mail Templates' },
          { key: 'crews', label: '👷 Master Crews' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setSettingsTab(t.key)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
              settingsTab === t.key
                ? 'border-green-700 text-green-800'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="bg-gray-50 px-6 py-6 flex-1 overflow-y-auto">
        {settingsTab === 'templates' && <TemplatesManager />}

        {settingsTab === 'email-templates' && <EmailTemplatesManager />}

        {settingsTab === 'crews' && <MasterCrews />}

        {settingsTab === 'general' && (
          <div className="max-w-2xl space-y-6">
            {/* Default color */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-bold text-gray-800 mb-1">
                Schedule Item Default Color
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Default background color for new schedule items.
              </p>
              <div className="flex items-center gap-4">
                <ColorDropdown value={defaultColor} onChange={setDefaultColor} />
                <button
                  onClick={handleSaveColor}
                  disabled={saving}
                  className="btn-primary text-sm px-4 py-2 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
                </button>
              </div>
            </div>

            {/* Payroll Week */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-bold text-gray-800 mb-1">Payroll Week</h2>
              <p className="text-sm text-gray-500 mb-4">
                Select the day your work week begins. Weekly hour totals on the time clock are
                calculated from this day.
              </p>
              <div className="flex items-center gap-4 flex-wrap">
                <select
                  value={payrollWeekStart}
                  onChange={e => setPayrollWeekStart(Number(e.target.value))}
                  className="input text-sm"
                >
                  {WEEK_DAYS.map((d, i) => (
                    <option key={i} value={i}>
                      {d}
                    </option>
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
                Current week:{' '}
                <span className="font-medium text-gray-600">
                  {getWeekRangeStr(payrollWeekStart)}
                </span>
              </p>
            </div>

            {/* Invoice communication position */}
            <InvoiceCommPositionCard />
          </div>
        )}

        {settingsTab === 'task-lists' && <TaskListsSettings />}

        {settingsTab === 'scheduling-assistance' && <SchedulingAssistanceSettings />}

        {settingsTab === 'stages' && (
          <div className="max-w-2xl space-y-6">
            {/* Job Stages */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-bold text-gray-800 mb-1">Job Stages</h2>
              <p className="text-sm text-gray-500 mb-4">
                Stages group jobs in the sidebar. Drag to reorder — numbers (1, 2, 3, …)
                automatically update to match the new order.
              </p>

              {/* Add new stage */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newStage}
                  onChange={e => setNewStage(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newStage.trim()) {
                      onAddStage(newStage.trim())
                      setNewStage('')
                    }
                  }}
                  placeholder="New stage name…"
                  className="input text-sm flex-1"
                />
                <button
                  onClick={() => {
                    if (newStage.trim()) {
                      onAddStage(newStage.trim())
                      setNewStage('')
                    }
                  }}
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
                    onDragOver={e => {
                      e.preventDefault()
                      setDragOverIdx(idx)
                    }}
                    onDragLeave={() => setDragOverIdx(null)}
                    onDrop={() => handleStageDrop(idx)}
                    onDragEnd={() => {
                      setDragIdx(null)
                      setDragOverIdx(null)
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                      dragOverIdx === idx && dragIdx !== idx
                        ? 'border-green-400 bg-green-50'
                        : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                    } ${dragIdx === idx ? 'opacity-40' : ''}`}
                  >
                    {/* Drag handle */}
                    <span
                      className="text-gray-300 cursor-grab active:cursor-grabbing flex-shrink-0"
                      title="Drag to reorder"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 8h16M4 16h16"
                        />
                      </svg>
                    </span>

                    {/* Sort order badge — auto-updates with drag order */}
                    <span className="text-xs font-bold text-blue-900 w-6 text-center flex-shrink-0 bg-blue-50 border border-blue-200 rounded px-1 py-0.5">
                      {idx + 1}
                    </span>

                    {/* Name / edit field */}
                    {editingId === stage.id ? (
                      <input
                        autoFocus
                        type="text"
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            onUpdateStage(stage.id, editingName.trim())
                            setEditingId(null)
                          }
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        onBlur={() => {
                          onUpdateStage(stage.id, editingName.trim())
                          setEditingId(null)
                        }}
                        className="input text-sm flex-1 py-0.5"
                      />
                    ) : (
                      <span className="flex-1 text-sm font-medium text-gray-700">{stage.name}</span>
                    )}

                    {/* Edit / Delete */}
                    <button
                      onClick={() => {
                        setEditingId(stage.id)
                        setEditingName(stage.name)
                      }}
                      className="text-gray-400 hover:text-gray-700 p-1 rounded hover:bg-gray-200 transition-colors"
                      title="Rename"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => onDeleteStage(stage.id)}
                      className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
                {stages.length === 0 && (
                  <p className="text-sm text-gray-400 italic text-center py-4">
                    No stages yet — add one above.
                  </p>
                )}
              </div>
            </div>
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

// ── Apply Template Modal ──────────────────────────────────────────────────────
function ApplyTemplateModal({ job, onClose, onApplied }) {
  const [templates, setTemplates] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [preview, setPreview] = useState(null)
  const [checks, setChecks] = useState({ doc: {}, photo: {}, tasks: {} })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase
      .from('job_templates')
      .select('id, name, auto_trigger, template_folders(*), template_tasks(*)')
      .order('name')
      .then(({ data }) => {
        if (data) setTemplates(data)
      })
  }, [])

  function handleSelectTemplate(id) {
    setSelectedId(id)
    if (!id) {
      setPreview(null)
      return
    }
    const tmpl = templates.find(t => t.id === id)
    const docFolders = (tmpl?.template_folders || [])
      .filter(f => f.folder_type !== 'photo_video')
      .sort((a, b) => a.sort_order - b.sort_order)
    const photoFolders = (tmpl?.template_folders || [])
      .filter(f => f.folder_type === 'photo_video')
      .sort((a, b) => a.sort_order - b.sort_order)
    const tasks = (tmpl?.template_tasks || []).sort((a, b) => a.sort_order - b.sort_order)
    setPreview({ docFolders, photoFolders, tasks, tmplId: id })
    const cd = {}
    docFolders.forEach(f => {
      cd[f.id] = true
    })
    const cp = {}
    photoFolders.forEach(f => {
      cp[f.id] = true
    })
    const ct = {}
    tasks.forEach(t => {
      ct[t.id] = true
    })
    setChecks({ doc: cd, photo: cp, tasks: ct })
  }

  function toggle(section, id) {
    setChecks(prev => ({ ...prev, [section]: { ...prev[section], [id]: !prev[section][id] } }))
  }

  function toggleAll(section, items, idField) {
    const allChecked = items.every(x => checks[section][x[idField]])
    const next = {}
    items.forEach(x => {
      next[x[idField]] = !allChecked
    })
    setChecks(prev => ({ ...prev, [section]: next }))
  }

  const selectedCount = preview
    ? Object.values(checks.doc).filter(Boolean).length +
      Object.values(checks.photo).filter(Boolean).length +
      Object.values(checks.tasks).filter(Boolean).length
    : 0

  async function handleSave() {
    if (!preview || !job?.id) return
    setSaving(true)

    const docToCreate = preview.docFolders.filter(f => checks.doc[f.id])
    const photoToCreate = preview.photoFolders.filter(f => checks.photo[f.id])
    const tasksToCreate = preview.tasks.filter(t => checks.tasks[t.id])

    const folderInserts = [
      ...docToCreate.map((f, i) => ({
        job_id: job.id,
        folder_name: f.folder_name,
        folder_type: 'document',
        template_id: preview.tmplId,
        sort_order: i,
      })),
      ...photoToCreate.map((f, i) => ({
        job_id: job.id,
        folder_name: f.folder_name,
        folder_type: 'photo_video',
        template_id: preview.tmplId,
        sort_order: i,
      })),
    ]
    if (folderInserts.length) await supabase.from('job_folders').insert(folderInserts)
    if (tasksToCreate.length) {
      await supabase.from('job_tasks').insert(
        tasksToCreate.map((t, i) => ({
          job_id: job.id,
          task_name: t.task_name,
          template_id: preview.tmplId,
          sort_order: i,
          status: 'pending',
        }))
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
          <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">
            {icon}{' '}
            {section === 'doc'
              ? 'Document Folders'
              : section === 'photo'
                ? 'Photo / Video Folders'
                : 'Tasks'}
          </p>
          <button
            onClick={() => toggleAll(section, items, idField)}
            className="text-[11px] text-blue-500 hover:text-blue-700"
          >
            {allChecked ? 'Uncheck all' : 'Check all'}
          </button>
        </div>
        <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
          {items.map((item, i) => (
            <label
              key={item[idField]}
              className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-white transition-colors ${i < items.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              <input
                type="checkbox"
                checked={!!checks[section][item[idField]]}
                onChange={() => toggle(section, item[idField])}
                className="accent-green-700 w-4 h-4 flex-shrink-0 rounded"
              />
              <span className="text-sm text-gray-700">
                {icon === '📁' || icon === '📸' ? '📁 ' : ''}
                {item[nameField]}
              </span>
            </label>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden"
        style={{ maxHeight: '88vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-green-700 px-6 py-4 flex-shrink-0">
          <h2 className="text-white font-bold text-lg">Apply Job Template</h2>
          <p className="text-green-200 text-xs mt-0.5">
            Select what to create for{' '}
            <span className="font-semibold text-white">{job?.name || job?.client_name}</span>
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
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.auto_trigger === 'sold_bid' ? ' (Auto)' : ''}
                </option>
              ))}
            </select>
            {templates.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">
                No templates yet — create one in Jobs → Settings → Templates.
              </p>
            )}
          </div>

          {/* Preview with checkboxes */}
          {preview && (
            <>
              {preview.docFolders.length === 0 &&
              preview.photoFolders.length === 0 &&
              preview.tasks.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4 bg-gray-50 rounded-xl">
                  This template has no folders or tasks defined.
                </p>
              ) : (
                <>
                  <CheckList
                    items={preview.docFolders}
                    section="doc"
                    idField="id"
                    nameField="folder_name"
                    icon="📄"
                  />
                  <CheckList
                    items={preview.photoFolders}
                    section="photo"
                    idField="id"
                    nameField="folder_name"
                    icon="📸"
                  />
                  <CheckList
                    items={preview.tasks}
                    section="tasks"
                    idField="id"
                    nameField="task_name"
                    icon="✅"
                  />
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !preview || selectedCount === 0}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-green-700 hover:bg-green-800 disabled:opacity-50"
          >
            {saving
              ? 'Creating…'
              : selectedCount > 0
                ? `Create ${selectedCount} Item${selectedCount !== 1 ? 's' : ''}`
                : 'Nothing Selected'}
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
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 10C4 8.343 5.343 7 7 7H18.586C19.116 7 19.625 7.211 20 7.586L23.414 11H41C42.657 11 44 12.343 44 14V38C44 39.657 42.657 41 41 41H7C5.343 41 4 39.657 4 38V10Z"
        fill={color}
      />
      <path
        d="M4 18C4 16.343 5.343 15 7 15H41C42.657 15 44 16.343 44 18V38C44 39.657 42.657 41 41 41H7C5.343 41 4 39.657 4 38V18Z"
        fill={color === '#f59e0b' ? '#fbbf24' : color === '#60a5fa' ? '#93c5fd' : '#fbbf24'}
      />
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
          <img
            src={f.publicUrl}
            alt={f.file_name}
            className="w-full h-28 object-cover hover:opacity-90 transition-opacity"
          />
        </a>
      ) : (
        <div className="w-full h-28 bg-gray-50 flex items-center justify-center text-4xl">
          {f.file_type?.startsWith('video/')
            ? '🎥'
            : f.file_type === 'application/pdf'
              ? '📄'
              : '📎'}
        </div>
      )}
      <div className="p-2.5">
        <p className="text-xs font-medium text-gray-800 truncate" title={f.file_name}>
          {f.file_name}
        </p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-gray-400">{fmtSize(f.file_size)}</span>
          <div className="flex items-center gap-1.5">
            {f.publicUrl && (
              <a
                href={f.publicUrl}
                download={f.file_name}
                className="text-[10px] text-blue-600 hover:text-blue-800 font-medium"
              >
                ⬇
              </a>
            )}
            <button
              onClick={() => onDelete(f)}
              className="text-[10px] text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ✕
            </button>
          </div>
        </div>
        {f.source === 'buildertrend' && (
          <span className="text-[9px] text-purple-500 font-medium">BuilderTrend</span>
        )}
      </div>
    </div>
  )
}

function JobFilesPanel({ job }) {
  const { user } = useAuth()
  const [subTab, setSubTab] = useState('documents')
  const [files, setFiles] = useState([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [folders, setFolders] = useState([])
  const [uploading, setUploading] = useState(false)
  const [addingFolder, setAddingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [savingFolder, setSavingFolder] = useState(false)
  const [showModal, setShowModal] = useState(false)
  // folder navigation stack: [{id, name}] — empty = root
  const [folderStack, setFolderStack] = useState([])

  // Current folder id (null = root)
  const currentFolderId = folderStack.length > 0 ? folderStack[folderStack.length - 1].id : null

  useEffect(() => {
    if (job?.id) {
      fetchFiles(job.id)
      fetchFolders(job.id)
    } else {
      setFiles([])
      setFolders([])
    }
    setFolderStack([])
  }, [job?.id])

  // Reset folder stack when switching sub-tabs
  useEffect(() => {
    setFolderStack([])
  }, [subTab])

  async function fetchFiles(jobId) {
    setFilesLoading(true)
    const { data } = await supabase
      .from('job_files')
      .select('*')
      .eq('job_id', jobId)
      .order('uploaded_at', { ascending: false })
    if (data)
      setFiles(
        data.map(f => ({
          ...f,
          publicUrl:
            supabase.storage.from('job-files').getPublicUrl(f.storage_path).data?.publicUrl || null,
        }))
      )
    setFilesLoading(false)
  }

  async function fetchFolders(jobId) {
    const { data } = await supabase
      .from('job_folders')
      .select('*')
      .eq('job_id', jobId)
      .order('sort_order')
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
    const existing = folders.filter(
      f => f.parent_folder_id === currentFolderId && f.folder_type === folderType
    ).length
    const { data } = await supabase
      .from('job_folders')
      .insert({
        job_id: job.id,
        folder_name: newFolderName.trim(),
        folder_type: folderType,
        sort_order: existing,
        parent_folder_id: currentFolderId || null,
      })
      .select()
      .single()
    if (data) setFolders(prev => [...prev, data])
    setNewFolderName('')
    setAddingFolder(false)
    setSavingFolder(false)
  }

  async function handleRemoveFolder(id) {
    if (!confirm('Remove this folder? Files inside will become unorganized.')) return
    await supabase.from('job_folders').delete().eq('id', id)
    setFolders(prev => prev.filter(f => f.id !== id))
    // If removed folder is in our stack, pop back to parent
    if (folderStack.some(f => f.id === id)) {
      setFolderStack(prev =>
        prev.slice(
          0,
          prev.findIndex(f => f.id === id)
        )
      )
    }
  }

  function fmtSize(bytes) {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  const isMedia = f => f.file_type?.startsWith('image/') || f.file_type?.startsWith('video/')
  const uploadAccept =
    subTab === 'documents' ? '.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip' : 'image/*,video/*'
  const folderIconColor = subTab === 'documents' ? '#f59e0b' : '#60a5fa'

  // Folders visible at current depth
  const activeFolders = folders.filter(
    f =>
      (f.folder_type !== 'photo_video') === (subTab === 'documents') &&
      (f.parent_folder_id ?? null) === currentFolderId
  )

  // Files scoped to current view
  const allTabFiles = files.filter(f => (subTab === 'documents' ? !isMedia(f) : isMedia(f)))
  const visibleFiles = currentFolderId
    ? allTabFiles.filter(f => f.folder_id === currentFolderId)
    : allTabFiles.filter(f => !f.folder_id)

  const rootIsEmpty = !filesLoading && activeFolders.length === 0 && visibleFiles.length === 0
  const folderIsEmpty = !filesLoading && visibleFiles.length === 0

  if (!job)
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20">
        <p className="text-4xl mb-3">📁</p>
        <p className="text-lg font-semibold text-gray-500">Select a job to view files</p>
        <p className="text-sm mt-1">Choose a job from the sidebar</p>
      </div>
    )

  return (
    <div>
      {showModal && (
        <ApplyTemplateModal
          job={job}
          onClose={() => setShowModal(false)}
          onApplied={() => {
            setShowModal(false)
            fetchFolders(job.id)
            fetchFiles(job.id)
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">Files</h2>
      </div>

      {/* Sub-tabs + root toolbar (same horizontal row) */}
      <div className="flex items-center justify-between border-b border-gray-200 mb-4">
        <div className="flex gap-1">
          {[
            { key: 'documents', label: '📄 Documents' },
            { key: 'photos', label: '📸 Photos / Videos' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => {
                setSubTab(t.key)
                setAddingFolder(false)
                setNewFolderName('')
              }}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                subTab === t.key
                  ? 'border-green-700 text-green-800 bg-green-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {folderStack.length === 0 && (
          <div className="flex items-center gap-2 pb-1.5 flex-wrap mr-6">
            {/* Upload Document — left */}
            <label
              className={`cursor-pointer text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${uploading ? 'bg-gray-200 text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
              {uploading
                ? 'Uploading…'
                : `+ Upload ${subTab === 'documents' ? 'Document' : 'Photo / Video'}`}
              <input
                type="file"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
                accept={uploadAccept}
              />
            </label>
            {/* Add Folder — right */}
            <button
              onClick={() => {
                setAddingFolder(a => !a)
                setNewFolderName('')
              }}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors font-medium"
            >
              {addingFolder ? '✕ Cancel' : '+ Add Folder'}
            </button>
          </div>
        )}
      </div>

      {/* Breadcrumb / back nav */}
      {folderStack.length > 0 && (
        <div className="flex items-center gap-1.5 mb-4 flex-wrap">
          {/* Root link */}
          <button
            onClick={() => {
              setFolderStack([])
              setAddingFolder(false)
            }}
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
                    onClick={() => {
                      setFolderStack(prev => prev.slice(0, idx + 1))
                      setAddingFolder(false)
                    }}
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
          >
            Delete folder
          </button>
        </div>
      )}

      {/* Inline add-folder input */}
      {addingFolder && (
        <div className="flex gap-2 mb-4">
          <input
            autoFocus
            type="text"
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAddFolder()
              if (e.key === 'Escape') {
                setAddingFolder(false)
                setNewFolderName('')
              }
            }}
            placeholder="Folder name…"
            className="input text-sm flex-1"
          />
          <button
            onClick={handleAddFolder}
            disabled={!newFolderName.trim() || savingFolder}
            className="px-3 py-1.5 rounded-lg bg-green-700 text-white text-sm font-medium hover:bg-green-800 disabled:opacity-40 transition-colors"
          >
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
              onClick={() => {
                setAddingFolder(a => !a)
                setNewFolderName('')
              }}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors font-medium"
            >
              {addingFolder ? '✕ Cancel' : '+ Add Subfolder'}
            </button>
            <label
              className={`cursor-pointer text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${uploading ? 'bg-gray-200 text-gray-400' : 'bg-green-700 text-white hover:bg-green-800'}`}
            >
              {uploading
                ? 'Uploading…'
                : `+ Upload ${subTab === 'documents' ? 'Document' : 'Photo / Video'}`}
              <input
                type="file"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
                accept={uploadAccept}
              />
            </label>
          </div>

          {/* Subfolders */}
          {activeFolders.length > 0 && (
            <div className="mb-6">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Subfolders
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {activeFolders.map(f => {
                  const count = allTabFiles.filter(x => x.folder_id === f.id).length
                  return (
                    <button
                      key={f.id}
                      onClick={() => {
                        setFolderStack(prev => [...prev, { id: f.id, name: f.folder_name }])
                        setAddingFolder(false)
                      }}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-gray-100 transition-colors group relative text-center"
                      title={f.folder_name}
                    >
                      <FolderIcon color={folderIconColor} size={52} />
                      <span className="text-xs font-medium text-gray-700 leading-tight line-clamp-2 w-full text-center">
                        {f.folder_name}
                      </span>
                      {count > 0 && (
                        <span className="text-[10px] text-gray-400">
                          {count} file{count !== 1 ? 's' : ''}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {folderIsEmpty && activeFolders.length === 0 && (
            <div className="flex flex-col items-center py-12 text-gray-400">
              <div className="mb-3 opacity-40">
                <FolderIcon color={folderIconColor} size={56} />
              </div>
              <p className="text-sm font-medium text-gray-500">This folder is empty</p>
              <p className="text-xs mt-1 text-center max-w-xs">
                Upload a file above or add a subfolder to organize content here.
              </p>
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
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Folders
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {activeFolders.map(f => {
                  const folderFileCount = allTabFiles.filter(x => x.folder_id === f.id).length
                  return (
                    <button
                      key={f.id}
                      onClick={() => {
                        setFolderStack([{ id: f.id, name: f.folder_name }])
                        setAddingFolder(false)
                      }}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-gray-100 transition-colors group relative text-center"
                      title={f.folder_name}
                    >
                      <FolderIcon color={folderIconColor} size={52} />
                      <span className="text-xs font-medium text-gray-700 leading-tight line-clamp-2 w-full text-center">
                        {f.folder_name}
                      </span>
                      {folderFileCount > 0 && (
                        <span className="text-[10px] text-gray-400">
                          {folderFileCount} file{folderFileCount !== 1 ? 's' : ''}
                        </span>
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
                Add a folder manually above, upload a file, or apply a template to set up your
                folder structure automatically.
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
// Layout: ID# | Title | Created | Attachments | GP | Amount | Status | Delete
// Click a row → CODetailModal. Detailed pricing still uses COEstimatePanel
// via the "Open detailed estimator" link inside the modal.
const CO_STATUS_STYLE = {
  pending: 'border-yellow-400 text-yellow-800 bg-yellow-50',
  presented: 'border-blue-400   text-blue-800   bg-blue-50',
  sold: 'border-green-500  text-green-800  bg-green-50',
  lost: 'border-red-400    text-red-800    bg-red-50',
}
// CO-context labels — underlying status values stay 'sold'/'lost' but
// display reads more naturally as "Approved"/"Declined" for change orders.
const CO_STATUS_LABEL = {
  pending: 'Pending',
  presented: 'Sent',
  sold: 'Approved',
  lost: 'Declined',
}

function JobChangeOrdersPanel({ job, coDeepLink = null }) {
  const [cos, setCos] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeCo, setActiveCo] = useState(null) // { id, ... } when modal is open; { id: null } for new
  // Counts of attachments per CO id, keyed by bid id
  const [attCounts, setAttCounts] = useState({})
  // Track which deep-link timestamps we've already auto-opened so opening a
  // CO once and closing it doesn't immediately re-open on next render.
  const lastOpenedDeepLinkTs = useRef(null)
  // When the user clicks "Open detailed estimator" inside the modal, we
  // route to the existing COEstimatePanel full-page view. Same state shape
  // as before so behavior stays identical.
  const [openEstimateId, setOpenEstimateId] = useState(null)
  const [openBidId, setOpenBidId] = useState(null)
  const [openCoName, setOpenCoName] = useState('')
  const [openCoType, setOpenCoType] = useState('')

  useEffect(() => {
    if (job?.id) fetchCOs(job.id)
    else {
      setCos([])
      setActiveCo(null)
    }
  }, [job?.id])

  // When a deep-link arrives (clicked a CO from ClientDetail) and the matching
  // CO is loaded into `cos`, open the detail modal automatically. Tracked by
  // timestamp so opening + closing doesn't get re-triggered on re-render.
  useEffect(() => {
    if (!coDeepLink?.coId) return
    if (lastOpenedDeepLinkTs.current === coDeepLink.ts) return
    const target = cos.find(c => c.id === coDeepLink.coId)
    if (target) {
      setActiveCo(target)
      lastOpenedDeepLinkTs.current = coDeepLink.ts
    }
  }, [coDeepLink, cos])

  async function fetchCOs(jobId) {
    setLoading(true)
    const { data } = await supabase
      .from('bids')
      .select('*')
      .eq('record_type', 'change_order')
      .eq('linked_job_id', jobId)
      .order('custom_co_id', { ascending: false, nullsFirst: false })
      .order('date_submitted', { ascending: false })
    setCos(data || [])

    // Attachment counts in one round-trip (group by bid_id client-side)
    if (data && data.length > 0) {
      const ids = data.map(c => c.id)
      const { data: files } = await supabase.from('job_files').select('bid_id').in('bid_id', ids)
      const counts = {}
      for (const f of files || []) counts[f.bid_id] = (counts[f.bid_id] || 0) + 1
      setAttCounts(counts)
    } else {
      setAttCounts({})
    }
    setLoading(false)
  }

  function openEstimator(estimateId, bidId, coName, coType) {
    setOpenEstimateId(estimateId)
    setOpenBidId(bidId || null)
    setOpenCoName(coName || '')
    setOpenCoType(coType || '')
  }
  function closeEstimator() {
    setOpenEstimateId(null)
    setOpenBidId(null)
    setOpenCoName('')
    setOpenCoType('')
    if (job?.id) fetchCOs(job.id)
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

  function handleCoDeleted(coId) {
    setCos(prev => prev.filter(c => c.id !== coId))
    setAttCounts(prev => {
      const n = { ...prev }
      delete n[coId]
      return n
    })
  }

  // From the detail modal, route to the full estimator
  function handleOpenEstimator(co) {
    if (!co?.estimate_id) {
      alert('This CO has no underlying estimate.')
      return
    }
    setActiveCo(null)
    openEstimator(co.estimate_id, co.id, co.co_name, co.co_type)
  }

  const fmt = v => '$' + Math.round(parseFloat(v || 0)).toLocaleString()

  if (!job)
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20">
        <p className="text-4xl mb-3">📋</p>
        <p className="text-lg font-semibold text-gray-500">Select a job to view change orders</p>
      </div>
    )

  // Detailed estimator full-page (route here from the modal's "Open detailed estimator" link)
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

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700">Change Orders</h2>
        <button
          onClick={() => setActiveCo({})}
          className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors mr-6"
        >
          + New Change Order
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
          <p className="text-xs mt-1 mb-5 text-center max-w-xs">
            Click "+ New Change Order" to add one.
          </p>
          <button
            onClick={() => setActiveCo({})}
            className="text-sm px-4 py-2 rounded-lg bg-blue-700 text-white font-medium hover:bg-blue-800 transition-colors"
          >
            + New Change Order
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-3 py-3 font-semibold text-gray-700 w-16">CO #</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-700">Title</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-700 w-28">Created</th>
                <th className="text-center px-3 py-3 font-semibold text-gray-700 w-20">Files</th>
                <th className="text-right px-3 py-3 font-semibold text-gray-700 w-28">
                  Gross Profit
                </th>
                <th className="text-right px-3 py-3 font-semibold text-gray-700 w-28">Amount</th>
                <th className="text-center px-3 py-3 font-semibold text-gray-700 w-28">Status</th>
                <th className="text-center px-3 py-3 font-semibold text-gray-700 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {cos.map((co, i) => {
                const status = co.status || 'pending'
                const ac = attCounts[co.id] || 0
                return (
                  <tr
                    key={co.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}
                    onClick={() => setActiveCo(co)}
                  >
                    <td className="px-3 py-3 font-mono text-xs font-bold text-indigo-700">
                      {co.custom_co_id ? (
                        `#${co.custom_co_id}`
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-semibold text-gray-800">
                        {co.co_name || '(untitled)'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-500 whitespace-nowrap text-xs">
                      {co.date_submitted ? new Date(co.date_submitted).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {ac > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-700">
                          📎<span className="font-bold">{ac}</span>
                        </span>
                      ) : (
                        <span className="text-gray-200">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap font-semibold text-green-700 text-xs">
                      {co.gross_profit > 0 ? (
                        fmt(co.gross_profit)
                      ) : (
                        <span className="text-gray-300 font-normal">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-gray-900 whitespace-nowrap">
                      {fmt(co.bid_amount)}
                    </td>
                    <td className="px-3 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${CO_STATUS_STYLE[status] || CO_STATUS_STYLE.pending}`}
                      >
                        {status === 'sold' && '✓ '}
                        {CO_STATUS_LABEL[status] || status}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-center text-gray-300 text-lg">›</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeCo && (
        <CODetailModal
          co={activeCo.id ? activeCo : null}
          job={job}
          onClose={() => setActiveCo(null)}
          onSaved={saved => {
            handleCoSaved(saved)
            setActiveCo(saved)
          }}
          onDeleted={handleCoDeleted}
          onOpenEstimator={handleOpenEstimator}
          onSent={() => {
            /* hook for analytics later */
          }}
        />
      )}
    </div>
  )
}

// ── Job Tasks Panel ───────────────────────────────────────────────────────────
// Table-based tasks for a single job. Columns: ✓ status, Category, Description,
// Assignee, Due Date. Each cell is inline-editable; changes autosave on blur.
// "+ Add Task" inserts an empty editable row.
//
// Lookup data:
//   - Category    → task_categories table
//   - Description → free-text input with autocomplete suggestions from task_descriptions
//   - Assignee    → active employees
function JobTasksPanel({ job }) {
  const [tasks, setTasks] = useState([])
  const [categories, setCategories] = useState([])
  const [descPresets, setDescPresets] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (job?.id) {
      fetchTasks(job.id)
      fetchLookups()
    } else {
      setTasks([])
    }
  }, [job?.id])

  async function fetchLookups() {
    const [cats, descs, emps] = await Promise.all([
      supabase.from('task_categories').select('*').order('sort_order').order('name'),
      supabase.from('task_descriptions').select('*').order('sort_order').order('name'),
      supabase
        .from('employees')
        .select('id, first_name, last_name')
        .eq('status', 'active')
        .order('first_name'),
    ])
    setCategories(cats.data || [])
    setDescPresets(descs.data || [])
    setEmployees(emps.data || [])
  }

  async function fetchTasks(jobId) {
    setLoading(true)
    const { data } = await supabase
      .from('job_tasks')
      .select('*')
      .eq('job_id', jobId)
      .order('sort_order')
      .order('created_at')
    setTasks(data || [])
    setLoading(false)
  }

  async function addTask() {
    if (!job?.id || adding) return
    setAdding(true)
    // New tasks go to the TOP of the list — give them a sort_order below
    // every existing task so there's no scrolling down to the new row.
    const minOrder = tasks.length ? Math.min(...tasks.map(t => t.sort_order ?? 0)) : 0
    const { data } = await supabase
      .from('job_tasks')
      .insert({
        job_id: job.id,
        task_name: '',
        status: 'pending',
        sort_order: minOrder - 1,
      })
      .select()
      .single()
    if (data) setTasks(prev => [data, ...prev])
    setAdding(false)
  }

  // Autosave one field on a task row
  async function patchTask(id, patch) {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)))
    await supabase
      .from('job_tasks')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
  }

  async function toggleStatus(task) {
    const next = task.status === 'completed' ? 'pending' : 'completed'
    await patchTask(task.id, { status: next })
  }

  async function deleteTask(id) {
    if (!confirm('Remove this task?')) return
    await supabase.from('job_tasks').delete().eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  if (!job)
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20">
        <p className="text-4xl mb-3">✅</p>
        <p className="text-lg font-semibold text-gray-500">Select a job to view tasks</p>
        <p className="text-sm mt-1">Choose a job from the sidebar</p>
      </div>
    )

  const completed = tasks.filter(t => t.status === 'completed').length
  const empName = e => `${e.first_name} ${e.last_name}`.trim()

  // Stable id for the description datalist (one per panel render)
  const descListId = 'task-desc-suggestions'

  return (
    <div>
      {showModal && (
        <ApplyTemplateModal
          job={job}
          onClose={() => setShowModal(false)}
          onApplied={() => {
            setShowModal(false)
            fetchTasks(job.id)
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700">
          Tasks{' '}
          {tasks.length > 0 && (
            <span className="text-gray-400 font-normal">
              ({completed}/{tasks.length})
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2 mr-6">
          {tasks.length > 0 && (
            <button
              onClick={() => setShowModal(true)}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 hover:text-gray-800 transition-colors"
            >
              📋 Apply Template
            </button>
          )}
          <button
            onClick={addTask}
            disabled={adding}
            className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {adding ? 'Adding…' : '+ Add Task'}
          </button>
        </div>
      </div>

      {/* Shared datalist for description autocomplete */}
      <datalist id={descListId}>
        {descPresets.map(d => (
          <option key={d.id} value={d.name} />
        ))}
      </datalist>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-gray-400">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-sm font-medium text-gray-500">No tasks yet</p>
          <p className="text-xs mt-1 mb-5 text-center max-w-xs">
            Click "+ Add Task" to start, or apply a template to create folders and tasks all at
            once.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-green-700 text-white font-medium hover:bg-green-800 transition-colors"
          >
            <span>📋</span> Apply Template
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white border border-gray-200 rounded-xl">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                <th className="px-3 py-2 w-10  text-center font-semibold">✓</th>
                <th className="px-3 py-2 w-40  text-left   font-semibold">Category</th>
                <th className="px-3 py-2       text-left   font-semibold">Description</th>
                <th className="px-3 py-2 w-44  text-left   font-semibold">Notes</th>
                <th className="px-3 py-2 w-24  text-left   font-semibold">Priority</th>
                <th className="px-3 py-2 w-44  text-left   font-semibold">Assignee</th>
                <th className="px-3 py-2 w-36  text-left   font-semibold">Due Date</th>
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => {
                const isDone = task.status === 'completed'
                return (
                  <tr
                    key={task.id}
                    className={`border-b border-gray-100 hover:bg-gray-50/70 group transition-colors ${isDone ? 'bg-green-50/30' : ''}`}
                  >
                    {/* Status checkbox */}
                    <td className="px-3 py-1.5 text-center">
                      <button
                        onClick={() => toggleStatus(task)}
                        className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center transition-colors ${
                          isDone
                            ? 'bg-green-600 border-green-600 text-white'
                            : 'border-gray-300 hover:border-green-500'
                        }`}
                        title={isDone ? 'Mark pending' : 'Mark complete'}
                      >
                        {isDone && (
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </button>
                    </td>

                    {/* Category dropdown */}
                    <td className="px-2 py-1">
                      <select
                        value={task.category_id || ''}
                        onChange={e => patchTask(task.id, { category_id: e.target.value || null })}
                        className={`w-full text-xs bg-transparent border border-transparent hover:border-gray-200 focus:border-green-500 focus:outline-none rounded px-1.5 py-1 ${isDone ? 'text-gray-400' : 'text-gray-700'}`}
                      >
                        <option value="">— Select —</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Description — text with datalist autocomplete */}
                    <td className="px-2 py-1">
                      <input
                        type="text"
                        list={descListId}
                        defaultValue={task.task_name || ''}
                        placeholder="Type or pick…"
                        onBlur={e => {
                          const v = e.target.value
                          if (v !== task.task_name) patchTask(task.id, { task_name: v })
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') e.target.blur()
                        }}
                        className={`w-full text-sm bg-transparent border border-transparent hover:border-gray-200 focus:border-green-500 focus:outline-none rounded px-1.5 py-1 ${isDone ? 'line-through text-gray-400' : 'text-gray-800'}`}
                      />
                    </td>

                    {/* Notes — short text input, hover for full content */}
                    <td className="px-2 py-1">
                      <input
                        type="text"
                        defaultValue={task.notes || ''}
                        placeholder="—"
                        title={task.notes || ''}
                        onBlur={e => {
                          const v = e.target.value
                          if (v !== (task.notes || '')) patchTask(task.id, { notes: v || null })
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') e.target.blur()
                        }}
                        className={`w-full text-xs bg-transparent border border-transparent hover:border-gray-200 focus:border-green-500 focus:outline-none rounded px-1.5 py-1 ${isDone ? 'text-gray-400' : 'text-gray-700'}`}
                      />
                    </td>

                    {/* Priority — small chip for high/highest, plain text for low/none */}
                    <td className="px-2 py-1">
                      <select
                        value={task.priority || ''}
                        onChange={e => patchTask(task.id, { priority: e.target.value || null })}
                        className={`w-full text-[11px] font-semibold uppercase border border-transparent hover:border-gray-200 focus:border-green-500 focus:outline-none rounded px-1.5 py-1 ${
                          task.priority === 'highest'
                            ? 'bg-red-100 text-red-700'
                            : task.priority === 'high'
                              ? 'bg-orange-100 text-orange-700'
                              : task.priority === 'low'
                                ? 'text-gray-400'
                                : 'bg-transparent text-gray-400'
                        } ${isDone ? 'opacity-60' : ''}`}
                      >
                        <option value="">—</option>
                        <option value="highest">Highest</option>
                        <option value="high">High</option>
                        <option value="low">Low</option>
                      </select>
                    </td>

                    {/* Assignee — dropdown of active employees, with fallback
                        to BT-imported name when there's no FK match */}
                    <td className="px-2 py-1">
                      <select
                        value={task.assignee_id || ''}
                        onChange={e => patchTask(task.id, { assignee_id: e.target.value || null })}
                        className={`w-full text-xs bg-transparent border border-transparent hover:border-gray-200 focus:border-green-500 focus:outline-none rounded px-1.5 py-1 ${isDone ? 'text-gray-400' : 'text-gray-700'}`}
                        title={
                          !task.assignee_id && task.assignee_name
                            ? `BT name: ${task.assignee_name}`
                            : undefined
                        }
                      >
                        <option value="">
                          {task.assignee_name ? `(BT) ${task.assignee_name}` : '— Unassigned —'}
                        </option>
                        {employees.map(e => (
                          <option key={e.id} value={e.id}>
                            {empName(e)}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Due date picker */}
                    <td className="px-2 py-1">
                      <input
                        type="date"
                        value={task.due_date || ''}
                        onChange={e => patchTask(task.id, { due_date: e.target.value || null })}
                        className={`w-full text-xs bg-transparent border border-transparent hover:border-gray-200 focus:border-green-500 focus:outline-none rounded px-1.5 py-1 ${isDone ? 'text-gray-400' : 'text-gray-700'}`}
                      />
                    </td>

                    {/* Delete */}
                    <td className="px-2 py-1 text-center">
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="text-red-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity text-xs p-1"
                        title="Delete task"
                      >
                        ✕
                      </button>
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
