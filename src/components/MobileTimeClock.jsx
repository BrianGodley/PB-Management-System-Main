// src/components/MobileTimeClock.jsx
//
// Mobile time-clock experience (rendered by TimeClockPage on phones).
// Flow:
//   • No open shift  -> clock-in screen: job picker + "Clock In" / "Clock In
//     Multiple" (multiple gated by HR time-clock permissions).
//   • Open shift     -> running page: live elapsed, Clock Out, Lunch (30) /
//     Short (15) breaks (fixed, auto-resume), Switch Job (recent + open).
//   • Multiple       -> setup screen (crew auto-fill slots) and a running
//     "View Multiple" with a clock per employee.
//
// Jobs offered are OPEN only. Breaks subtract from elapsed via time_clock_breaks.

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { fetchAllPaginated } from '../lib/fetchAll'
import { useAuth } from '../contexts/AuthContext'

const todayStr = () => new Date().toISOString().split('T')[0]
// Local YYYY-MM-DD (avoids the UTC shift that toISOString would introduce).
const dStr = d => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${da}`
}
const hhmm = d => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
// "07:56:00" / "07:56" -> "7:56 AM"
const fmt12h = t => {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ap = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ap}`
}
// time_in may come back as "HH:MM" or "HH:MM:SS" (Postgres time) — don't append
// seconds (that would make an invalid date and yield NaN elapsed).
const entryStartMs = e => new Date(`${e.date}T${e.time_in || '00:00'}`).getTime()
const jobIsOpen = j => {
  const s = j?.status || 'active'
  return s === 'active' || s === 'on_hold'
}
// Live elapsed with seconds: "1h 04m 09s".
function fmtHMS(ms) {
  if (!Number.isFinite(ms) || ms < 0) ms = 0
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
}
function fmtDur(ms) {
  if (!Number.isFinite(ms) || ms < 0) ms = 0
  const totalMin = Math.floor(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${h}h ${String(m).padStart(2, '0')}m`
}
// Minutes between two HH:MM strings (handles past-midnight).
function diffMins(tin, tout) {
  if (!tin || !tout) return 0
  const [h1, m1] = tin.split(':').map(Number)
  const [h2, m2] = tout.split(':').map(Number)
  let mins = h2 * 60 + m2 - (h1 * 60 + m1)
  if (mins < 0) mins += 24 * 60
  return mins
}
function fmtHm(mins) {
  const m = Math.max(0, Math.round(mins))
  return `${Math.floor(m / 60)}h ${m % 60}m`
}
// Week range containing today, given the configured start day (0=Sun … 6=Sat).
function getWeekRange(startDay) {
  const today = new Date()
  const diff = (today.getDay() - startDay + 7) % 7
  const start = new Date(today)
  start.setDate(today.getDate() - diff)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return { weekStart: start, weekEnd: end }
}

// Total break time to subtract, and any currently-active break.
function breakInfo(breaks, nowMs) {
  let deduct = 0
  let active = null
  for (const b of breaks) {
    const start = new Date(b.started_at).getTime()
    const fullMs = (b.minutes || 0) * 60000
    const elapsed = nowMs - start
    deduct += Math.max(0, Math.min(elapsed, fullMs))
    if (elapsed < fullMs) active = { ...b, endsMs: start + fullMs }
  }
  return { deduct, active }
}

export default function MobileTimeClock() {
  const { user } = useAuth()
  const [meId, setMeId] = useState(null)
  const [meName, setMeName] = useState('')
  const [jobs, setJobs] = useState([])
  const [employees, setEmployees] = useState([])
  const [crewMemberIds, setCrewMemberIds] = useState([]) // my crew (if I'm a chief)
  const [chiefIds, setChiefIds] = useState(new Set())
  const [canManager, setCanManager] = useState(false)
  const [canChief, setCanChief] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [dayMins, setDayMins] = useState(0)
  const [weekMins, setWeekMins] = useState(0)
  const [myEntry, setMyEntry] = useState(null)
  const [myBreaks, setMyBreaks] = useState([])
  const [multiEntries, setMultiEntries] = useState([])
  const [screen, setScreen] = useState('clockin') // clockin|pick-job|running|switch|multi-setup|multi-view
  const [clockInJob, setClockInJob] = useState('') // job prefilled / chosen on the clock-in screen
  const [recentJobIds, setRecentJobIds] = useState([]) // this user's recent (open) jobs, newest first
  const [now, setNow] = useState(Date.now())
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')

  const canMultiple = canManager || canChief || isAdmin
  const openJobs = useMemo(() => jobs.filter(jobIsOpen), [jobs])
  const empById = useMemo(() => Object.fromEntries(employees.map(e => [e.id, e])), [employees])
  const jobName = id => {
    const j = jobs.find(x => x.id === id)
    return j ? j.name || j.client_name : 'Job'
  }
  const empName = e => `${e.first_name} ${e.last_name}`

  // Live ticking clock.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  // Initial load.
  useEffect(() => {
    if (!user?.id) return
    let alive = true
    ;(async () => {
     try {
      const [{ data: prof }, { data: emp }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('employees').select('id').eq('user_id', user.id).maybeSingle(),
      ])
      if (!alive) return
      const admin = prof?.role === 'admin' || prof?.role === 'super_admin'
      setIsAdmin(admin)
      const name =
        (prof &&
          ([prof.first_name, prof.last_name].filter(Boolean).join(' ') ||
            prof.full_name ||
            prof.display_name ||
            prof.name)) ||
        user.email ||
        'Unknown'
      setMeName(name)
      const eid = emp?.id || null
      setMeId(eid)

      const [{ data: js }, { data: emps }, { data: crews }, { data: permRow }] = await Promise.all([
        fetchAllPaginated(() => supabase.from('jobs').select('id, name, client_name, status').order('name')),
        supabase
          .from('employees')
          .select('id, first_name, last_name, job_title, status')
          .eq('status', 'active')
          .order('last_name'),
        supabase.from('crews').select('crew_chief_id, journeyman_id, laborer_1_id, laborer_2_id, laborer_3_id'),
        eid
          ? supabase.from('time_clock_permissions').select('*').eq('employee_id', eid).maybeSingle()
          : Promise.resolve({ data: null }),
      ])
      if (!alive) return
      setJobs(js || [])
      setEmployees(emps || [])
      const chiefs = new Set((crews || []).map(c => c.crew_chief_id).filter(Boolean))
      setChiefIds(chiefs)
      // My crew members (where I'm the chief).
      const mine = []
      for (const c of crews || []) {
        if (c.crew_chief_id === eid) {
          for (const k of ['journeyman_id', 'laborer_1_id', 'laborer_2_id', 'laborer_3_id']) {
            if (c[k]) mine.push(c[k])
          }
        }
      }
      setCrewMemberIds([...new Set(mine)])
      const isChief = chiefs.has(eid)
      setCanManager(!!permRow?.clock_in_multiple_manager)
      setCanChief(permRow ? !!permRow.clock_in_multiple_crew_chief : isChief)

      await refreshEntries(eid, name)

      // Recent jobs this user has clocked into (OPEN only, newest first).
      let recQ = supabase.from('time_entries').select('job_id, date, time_in')
      recQ = eid ? recQ.eq('employee_id', eid) : recQ.eq('employee_name', name)
      const { data: recRows } = await recQ
        .order('date', { ascending: false })
        .order('time_in', { ascending: false })
        .limit(60)
      const openSet = new Set((js || []).filter(jobIsOpen).map(j => j.id))
      const seen = []
      for (const r of recRows || []) {
        if (r.job_id && openSet.has(r.job_id) && !seen.includes(r.job_id)) seen.push(r.job_id)
      }
      if (alive) {
        setRecentJobIds(seen)
        setClockInJob(prev => prev || seen[0] || '') // prefill last job
      }

      // Day + week hours so far (completed shifts).
      await refreshTotals(eid)
     } catch (err) {
       if (alive) setError(err?.message || 'Failed to load time clock.')
     } finally {
       if (alive) setReady(true)
     }
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Recompute Day's / Weekly totals from completed shifts (call after clock-out).
  async function refreshTotals(eidArg) {
    const eid = eidArg !== undefined ? eidArg : meId
    const { data: cs } = await supabase
      .from('company_settings')
      .select('payroll_week_start')
      .maybeSingle()
    const weekStartDay = cs?.payroll_week_start ?? 0
    const { weekStart, weekEnd } = getWeekRange(weekStartDay)
    let totQ = supabase.from('time_entries').select('date, time_in, time_out')
    totQ = eid ? totQ.eq('employee_id', eid) : totQ.eq('created_by', user.id)
    const { data: totRows } = await totQ.gte('date', dStr(weekStart)).lte('date', dStr(weekEnd))
    const today = dStr(new Date())
    let dMin = 0
    let wMin = 0
    for (const r of totRows || []) {
      const mins = diffMins(r.time_in, r.time_out)
      wMin += mins
      if (r.date === today) dMin += mins
    }
    setDayMins(dMin)
    setWeekMins(wMin)
  }

  async function refreshEntries(eid, name) {
    const d = todayStr()
    // My own open shift.
    let mine = null
    if (eid) {
      const { data } = await supabase
        .from('time_entries')
        .select('*')
        .eq('employee_id', eid)
        .is('time_out', null)
        .eq('date', d)
        .order('time_in', { ascending: false })
        .limit(1)
      mine = data?.[0] || null
    }
    if (!mine && name) {
      const { data } = await supabase
        .from('time_entries')
        .select('*')
        .eq('employee_name', name)
        .is('time_out', null)
        .eq('date', d)
        .order('time_in', { ascending: false })
        .limit(1)
      mine = data?.[0] || null
    }
    setMyEntry(mine)
    if (mine) {
      const { data: brk } = await supabase
        .from('time_clock_breaks')
        .select('*')
        .eq('time_entry_id', mine.id)
      setMyBreaks(brk || [])
    } else {
      setMyBreaks([])
    }
    // Others I clocked in (still open today).
    const { data: others } = await supabase
      .from('time_entries')
      .select('*')
      .eq('created_by', user.id)
      .is('time_out', null)
      .eq('date', d)
    const filteredOthers = (others || []).filter(e => (eid ? e.employee_id !== eid : e.employee_name !== name))
    setMultiEntries(filteredOthers)
    setScreen(mine ? 'running' : 'clockin')
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  // Insert a clock-in row. Falls back to omitting employee_id if that column
  // isn't present yet (migration not run), so clock-in still works.
  async function insertEntry(extra) {
    const d = new Date()
    const base = {
      employee_name: meName,
      job_id: extra.job_id,
      date: todayStr(),
      time_in: hhmm(d),
      time_out: null,
      created_by: user.id,
      updated_at: d.toISOString(),
      ...extra,
    }
    let res = await supabase.from('time_entries').insert({ employee_id: meId, ...base }).select().single()
    if (res.error && /employee_id/.test(res.error.message || '')) {
      // Column missing — retry without it.
      const { employee_id, ...noEid } = { employee_id: meId, ...base }
      res = await supabase.from('time_entries').insert(noEid).select().single()
    }
    return res
  }

  async function clockIn(jobId) {
    if (!jobId) return
    setBusy(true)
    setError('')
    const { data, error: e } = await insertEntry({ job_id: jobId })
    if (e) {
      setError(e.message || 'Could not clock in.')
      setBusy(false)
      return
    }
    setMyEntry(data)
    setMyBreaks([])
    setScreen('running')
    setBusy(false)
  }

  async function clockOut() {
    if (!myEntry) return
    setBusy(true)
    const d = new Date()
    await supabase
      .from('time_entries')
      .update({ time_out: hhmm(d), updated_at: d.toISOString() })
      .eq('id', myEntry.id)
    setMyEntry(null)
    setMyBreaks([])
    setScreen('clockin')
    await refreshTotals() // fold the just-finished shift into Day's/Weekly totals
    setBusy(false)
  }

  async function switchJob(jobId) {
    if (!myEntry || !jobId) return
    setBusy(true)
    const d = new Date()
    await supabase
      .from('time_entries')
      .update({ time_out: hhmm(d), updated_at: d.toISOString() })
      .eq('id', myEntry.id)
    const { data } = await supabase
      .from('time_entries')
      .insert({
        employee_name: meName,
        employee_id: meId,
        job_id: jobId,
        date: todayStr(),
        time_in: hhmm(d),
        time_out: null,
        created_by: user.id,
        updated_at: d.toISOString(),
      })
      .select()
      .single()
    setMyEntry(data)
    setMyBreaks([])
    setBusy(false)
  }

  async function takeBreak(kind) {
    if (!myEntry) return
    const minutes = kind === 'lunch' ? 30 : 15
    const { data } = await supabase
      .from('time_clock_breaks')
      .insert({ time_entry_id: myEntry.id, kind, minutes, started_at: new Date().toISOString() })
      .select()
      .single()
    if (data) setMyBreaks(b => [...b, data])
  }

  // Clock in a list of employee ids onto a job (multi).
  async function clockInMany(jobId, employeeIds) {
    setBusy(true)
    setError('')
    const d = new Date()
    const rows = (employeeIds || [])
      .filter(Boolean)
      .map(id => {
        const e = empById[id]
        return {
          employee_name: e ? `${e.first_name} ${e.last_name}` : 'Employee',
          employee_id: id,
          job_id: jobId,
          date: todayStr(),
          time_in: hhmm(d),
          time_out: null,
          created_by: user.id,
          updated_at: d.toISOString(),
        }
      })
    if (!rows.length) {
      setBusy(false)
      return
    }
    let { error: e } = await supabase.from('time_entries').insert(rows)
    if (e && /employee_id/.test(e.message || '')) {
      // employee_id column not present yet — retry without it.
      const rows2 = rows.map(({ employee_id, ...r }) => r)
      ;({ error: e } = await supabase.from('time_entries').insert(rows2))
    }
    setBusy(false)
    if (e) {
      alert('Could not clock in: ' + e.message)
      return
    }
    await refreshEntries(meId, meName)
    setScreen('multi-view') // show who's now on the clock
  }

  async function clockOutOther(entryId) {
    const d = new Date()
    await supabase
      .from('time_entries')
      .update({ time_out: hhmm(d), updated_at: d.toISOString() })
      .eq('id', entryId)
    setMultiEntries(list => list.filter(e => e.id !== entryId))
  }

  if (!ready) {
    return <p className="py-16 text-center text-sm text-gray-400">Loading…</p>
  }

  // ── Screens ─────────────────────────────────────────────────────────────
  if (screen === 'multi-setup') {
    const mJobId = myEntry?.job_id || clockInJob || ''
    return (
      <MultiSetup
        jobId={mJobId}
        jobName={jobName(mJobId)}
        employees={employees}
        empName={empName}
        meId={meId}
        myEntry={myEntry}
        crewMemberIds={crewMemberIds}
        chiefIds={chiefIds}
        canManager={canManager || isAdmin}
        onCancel={() => setScreen(myEntry ? 'running' : 'clockin')}
        busy={busy}
        onClockIn={async ids => {
          await clockInMany(mJobId, ids)
        }}
      />
    )
  }

  if (screen === 'multi-view') {
    return (
      <MultiView
        entries={multiEntries}
        jobName={jobName}
        now={now}
        onBack={() => setScreen(myEntry ? 'running' : 'clockin')}
        onClockOut={clockOutOther}
        onAdd={() => setScreen('multi-setup')}
      />
    )
  }

  if (screen === 'running' && myEntry) {
    const { deduct, active } = breakInfo(myBreaks, now)
    const worked = now - entryStartMs(myEntry) - deduct
    return (
      <div className="max-w-md mx-auto py-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">On the clock</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{jobName(myEntry.job_id)}</p>
          <p className="text-4xl font-extrabold text-green-700 mt-4 tabular-nums">
            {fmtHMS(worked)}
          </p>
          {active ? (
            <p className="mt-2 text-sm font-semibold text-amber-600">
              On {active.kind === 'lunch' ? 'lunch' : 'short'} break · resumes in{' '}
              {Math.max(0, Math.ceil((active.endsMs - now) / 60000))} min
            </p>
          ) : (
            <p className="mt-2 text-xs text-gray-400">
              Clocked in at {fmt12h(myEntry.time_in)}
              {deduct > 0 && ` · ${Math.round(deduct / 60000)} min break`}
            </p>
          )}

          <button
            onClick={clockOut}
            disabled={busy}
            className="w-full mt-5 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-50"
          >
            Clock Out
          </button>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              onClick={() => takeBreak('lunch')}
              disabled={!!active}
              className="py-2.5 rounded-xl border border-amber-300 text-amber-700 text-sm font-semibold hover:bg-amber-50 disabled:opacity-40"
            >
              🍔 Lunch (30)
            </button>
            <button
              onClick={() => takeBreak('short')}
              disabled={!!active}
              className="py-2.5 rounded-xl border border-amber-300 text-amber-700 text-sm font-semibold hover:bg-amber-50 disabled:opacity-40"
            >
              ☕ Short (15)
            </button>
          </div>

          <button
            onClick={() => setScreen('switch')}
            className="w-full mt-2 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50"
          >
            🔁 Switch Job
          </button>

          {canMultiple && (
            <button
              onClick={() => setScreen('multi-setup')}
              className="w-full mt-2 py-2.5 rounded-xl border border-indigo-300 text-indigo-700 text-sm font-semibold hover:bg-indigo-50"
            >
              👥 Clock In Others
            </button>
          )}
        </div>

        {multiEntries.length > 0 && (
          <button
            onClick={() => setScreen('multi-view')}
            className="w-full mt-3 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700"
          >
            View Multiple ({multiEntries.length})
          </button>
        )}
      </div>
    )
  }

  if (screen === 'switch' && myEntry) {
    return (
      <JobPickerScreen
        title="Switch Job"
        openJobs={openJobs}
        recentJobIds={recentJobIds}
        onCancel={() => setScreen('running')}
        busy={busy}
        onPick={async jobId => {
          await switchJob(jobId)
          setScreen('running')
        }}
      />
    )
  }

  // Job-selection screen for the clock-in field (search + recent-first list,
  // filling the whole screen).
  if (screen === 'pick-job') {
    return (
      <div className="flex flex-col h-full max-w-md mx-auto py-4">
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <p className="text-base font-bold text-gray-900">Select Job</p>
          <button onClick={() => setScreen('clockin')} className="text-sm text-gray-500">
            Cancel
          </button>
        </div>
        <JobSearchPicker
          fill
          openJobs={openJobs}
          value={clockInJob}
          recentJobIds={recentJobIds}
          onChange={jobId => {
            setClockInJob(jobId)
            setScreen('clockin')
          }}
        />
      </div>
    )
  }

  // Default: clock-in screen with the last job prefilled in the field.
  return (
    <ClockInScreen
      jobLabel={clockInJob ? jobName(clockInJob) : ''}
      hasJob={!!clockInJob}
      busy={busy}
      error={error}
      canMultiple={canMultiple}
      multiCount={multiEntries.length}
      dayMins={dayMins}
      weekMins={weekMins}
      onPickJob={() => setScreen('pick-job')}
      onClockIn={() => clockIn(clockInJob)}
      onMulti={() => setScreen('multi-setup')}
      onViewMulti={() => setScreen('multi-view')}
    />
  )
}

// ── Searchable open-job picker (shared) ─────────────────────────────────────
function JobSearchPicker({ openJobs, value, onChange, recentJobIds = [], fill = false }) {
  const [q, setQ] = useState('')
  const ql = q.trim().toLowerCase()
  const recent = recentJobIds
    .map(id => openJobs.find(j => j.id === id))
    .filter(Boolean)
  const base = ql
    ? openJobs.filter(j => (j.name || j.client_name || '').toLowerCase().includes(ql))
    : [...recent, ...openJobs.filter(j => !recentJobIds.includes(j.id))]
  return (
    <div className={fill ? 'flex flex-col flex-1 min-h-0' : ''}>
      <input
        type="text"
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Search open jobs…"
        className="input text-sm w-full mb-2 flex-shrink-0"
      />
      <div
        className={`overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100 ${
          fill ? 'flex-1 min-h-0' : 'max-h-64'
        }`}
      >
        {base.slice(0, 80).map(j => (
          <button
            key={j.id}
            onClick={() => onChange(j.id)}
            className={`w-full text-left px-3 py-2.5 text-sm ${
              value === j.id ? 'bg-green-50 text-green-800 font-semibold' : 'hover:bg-gray-50'
            }`}
          >
            {j.name || j.client_name}
            {recentJobIds.includes(j.id) && !ql && (
              <span className="ml-2 text-[10px] uppercase text-gray-400">recent</span>
            )}
          </button>
        ))}
        {base.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-gray-400">No open jobs</p>
        )}
      </div>
    </div>
  )
}

function ClockInScreen({
  jobLabel,
  hasJob,
  busy,
  error,
  canMultiple,
  multiCount,
  dayMins,
  weekMins,
  onPickJob,
  onClockIn,
  onMulti,
  onViewMulti,
}) {
  return (
    <div className="max-w-md mx-auto py-4">
      <p className="text-sm font-semibold text-gray-500 text-center mb-3">Not clocked in</p>

      {/* Hours so far — today and this week (Sun–Sat or per HR setting) */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-center">
          <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
            Day's Total
          </p>
          <p className="text-lg font-bold text-gray-900 mt-0.5">{fmtHm(dayMins)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-center">
          <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
            Weekly Total
          </p>
          <p className="text-lg font-bold text-gray-900 mt-0.5">{fmtHm(weekMins)}</p>
        </div>
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Job</p>
      {/* The field shows the last job clocked into; tap it to choose another. */}
      <button
        onClick={onPickJob}
        className="w-full flex items-center justify-between px-3 py-3 rounded-xl border border-gray-300 bg-white text-left"
      >
        <span className={`truncate ${hasJob ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
          {jobLabel || 'Tap to select a job'}
        </span>
        <span className="text-gray-400 text-lg flex-shrink-0 ml-2">▾</span>
      </button>

      {error && (
        <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        onClick={onClockIn}
        disabled={!hasJob || busy}
        className="w-full mt-4 py-3 rounded-xl bg-green-700 text-white font-bold hover:bg-green-800 disabled:opacity-40"
      >
        {busy ? 'Clocking in…' : 'Clock In'}
      </button>
      {canMultiple && (
        <button
          onClick={onMulti}
          disabled={!hasJob}
          title={!hasJob ? 'Pick a job first' : undefined}
          className="w-full mt-2 py-3 rounded-xl border border-indigo-300 text-indigo-700 font-bold hover:bg-indigo-50 disabled:opacity-40"
        >
          👥 Clock In Multiple
        </button>
      )}
      {multiCount > 0 && (
        <button
          onClick={onViewMulti}
          className="w-full mt-2 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700"
        >
          View Multiple ({multiCount})
        </button>
      )}
    </div>
  )
}

function JobPickerScreen({ title, openJobs, recentJobIds, onCancel, onPick, busy }) {
  const [jobId, setJobId] = useState('')
  return (
    <div className="max-w-md mx-auto py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-base font-bold text-gray-900">{title}</p>
        <button onClick={onCancel} className="text-sm text-gray-500">
          Cancel
        </button>
      </div>
      <JobSearchPicker
        openJobs={openJobs}
        value={jobId}
        onChange={setJobId}
        recentJobIds={recentJobIds}
      />
      <button
        onClick={() => onPick(jobId)}
        disabled={!jobId || busy}
        className="w-full mt-4 py-3 rounded-xl bg-green-700 text-white font-bold hover:bg-green-800 disabled:opacity-40"
      >
        {title}
      </button>
    </div>
  )
}

// ── Multi clock-in setup ────────────────────────────────────────────────────
// Job is chosen on the previous screen (shown as small text here). Selected
// employees appear as removable chips; tap names in the list below to add them.
function MultiSetup({
  jobId,
  jobName,
  employees,
  empName,
  meId,
  myEntry,
  crewMemberIds,
  chiefIds,
  canManager,
  onCancel,
  onClockIn,
  busy,
}) {
  // Pre-select the chief's crew (+ self when not already clocked in).
  const [selected, setSelected] = useState(() => {
    const ids = [...(meId && !myEntry ? [meId] : []), ...crewMemberIds]
    return [...new Set(ids)]
  })
  const [q, setQ] = useState('')

  // Who can be picked: managers/admins see everyone; crew chiefs see their
  // crew + other chiefs.
  const pickable = useMemo(() => {
    const list = canManager
      ? employees
      : employees.filter(e =>
          new Set([...(meId ? [meId] : []), ...crewMemberIds, ...chiefIds]).has(e.id)
        )
    const ql = q.trim().toLowerCase()
    return ql ? list.filter(e => empName(e).toLowerCase().includes(ql)) : list
  }, [employees, canManager, crewMemberIds, chiefIds, meId, q, empName])

  function toggle(id) {
    setSelected(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]))
  }
  const selectedSet = new Set(selected)

  return (
    <div className="flex flex-col h-full max-w-md mx-auto py-4">
      {/* Action docked at the top (it doubles as the screen label). */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => onClockIn(selected)}
          disabled={busy || selected.length === 0}
          className="flex-1 py-2.5 rounded-xl bg-green-700 text-white font-bold hover:bg-green-800 disabled:opacity-40"
        >
          Clock In {selected.length || ''} {selected.length === 1 ? 'Person' : 'People'}
        </button>
      </div>
      {/* Job (chosen on the previous screen) */}
      <p className="text-xs text-purple-600 font-medium mt-2 flex-shrink-0">{jobName || 'Job'}</p>

      {/* Selected employees — removable chips */}
      <div className="flex flex-wrap gap-2 mt-3 flex-shrink-0">
        {selected.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No one selected yet — tap names below.</p>
        ) : (
          selected.map(id => {
            const e = employees.find(x => x.id === id)
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-800 rounded-full pl-3 pr-1.5 py-1 text-sm font-medium"
              >
                {e ? empName(e) : 'Employee'}
                {id === meId ? ' (me)' : ''}
                <button
                  onClick={() => toggle(id)}
                  className="w-5 h-5 rounded-full hover:bg-green-200 flex items-center justify-center text-green-700"
                >
                  ✕
                </button>
              </span>
            )
          })
        )}
      </div>

      {/* Employee list (tap to select) */}
      <input
        type="text"
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Search employees…"
        className="input text-sm w-full mt-3 mb-2 flex-shrink-0"
      />
      <div className="flex-1 min-h-0 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
        {pickable.map(e => {
          const on = selectedSet.has(e.id)
          return (
            <button
              key={e.id}
              onClick={() => toggle(e.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm text-left ${
                on ? 'bg-green-50' : 'hover:bg-gray-50'
              }`}
            >
              <span className={on ? 'text-green-800 font-semibold' : 'text-gray-800'}>
                {empName(e)}
                {e.id === meId ? ' (me)' : ''}
              </span>
              <span
                className={`w-5 h-5 rounded border flex items-center justify-center text-xs ${
                  on ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300 text-transparent'
                }`}
              >
                ✓
              </span>
            </button>
          )
        })}
        {pickable.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-gray-400">No employees</p>
        )}
      </div>
    </div>
  )
}

// ── View multiple running clocks ────────────────────────────────────────────
function MultiView({ entries, jobName, now, onBack, onClockOut, onAdd }) {
  return (
    <div className="max-w-md mx-auto py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-base font-bold text-gray-900">On the Clock</p>
        <button onClick={onBack} className="text-sm text-gray-500">
          Back
        </button>
      </div>
      {entries.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">No one currently clocked in.</p>
      ) : (
        <div className="space-y-2">
          {entries.map(e => {
            const worked = now - entryStartMs(e)
            return (
              <div
                key={e.id}
                className="flex items-center justify-between gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{e.employee_name}</p>
                  <p className="text-xs text-gray-500 truncate">{jobName(e.job_id)}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm font-bold text-green-700 tabular-nums">
                    {fmtDur(worked)}
                  </span>
                  <button
                    onClick={() => onClockOut(e.id)}
                    className="text-xs font-semibold text-red-600 border border-red-200 rounded-lg px-2 py-1 hover:bg-red-50"
                  >
                    Out
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <button
        onClick={onAdd}
        className="w-full mt-4 py-3 rounded-xl border border-indigo-300 text-indigo-700 font-bold hover:bg-indigo-50"
      >
        + Add employee
      </button>
    </div>
  )
}
