import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ── Time helpers ─────────────────────────────────────────────
function fmt12h(t) {
  if (!t) return '—'
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

function fmt24h(t) {
  if (!t) return ''
  return t.slice(0, 5)
}

function diffMins(timeIn, timeOut) {
  if (!timeIn || !timeOut) return null
  const [h1, m1] = timeIn.split(':').map(Number)
  const [h2, m2] = timeOut.split(':').map(Number)
  const diff = (h2 * 60 + m2) - (h1 * 60 + m1)
  return diff > 0 ? diff : null
}

function fmtMins(mins) {
  if (mins == null) return '—'
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
}

function calcTimes(timeIn, timeOut) {
  const total = diffMins(timeIn, timeOut)
  if (total == null) return { total: null, regular: null, ot: null }
  const regular = Math.min(total, 480)   // 8 hours = 480 minutes
  const ot = Math.max(0, total - 480)
  return { total, regular, ot }
}

function todayDate() {
  return new Date().toISOString().split('T')[0]
}

function fmtDateLabel(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

const EMPTY_FORM = {
  employee_name: '',
  job_id: '',
  date: todayDate(),
  time_in: '',
  time_out: '',
  notes: '',
}

// Returns "Xh Ym" elapsed from a time_in string to a Date object
function calcElapsed(timeIn, now) {
  if (!timeIn) return ''
  const [h, m] = timeIn.split(':').map(Number)
  const start = new Date(now)
  start.setHours(h, m, 0, 0)
  const mins = Math.max(0, Math.floor((now - start) / 60000))
  const hh = Math.floor(mins / 60)
  const mm = mins % 60
  return hh > 0 ? `${hh}h ${mm}m` : `${mm}m`
}

// Compute week start/end dates given a start-day (0=Sun … 6=Sat)
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

function fmtWeekRange(start, end) {
  const fmt = d => d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })
  return `${fmt(start)} – ${fmt(end)}`
}

function fmtHours(mins) {
  if (!mins) return '0h 0m'
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

// ── Main Component ───────────────────────────────────────────
export default function TimeClock({ jobs = [], selectedJob }) {
  const { user } = useAuth()
  const [entries,     setEntries]     = useState([])
  const [loading,     setLoading]     = useState(false)
  const [showModal,   setShowModal]   = useState(false)
  const [editEntry,   setEditEntry]   = useState(null)
  const [form,        setForm]        = useState(EMPTY_FORM)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')
  const [profileName,      setProfileName]      = useState('')
  const [nowTime,          setNowTime]          = useState(new Date())
  const [payrollWeekStart, setPayrollWeekStart] = useState(0)   // 0=Sunday
  const [myWeekEntries,    setMyWeekEntries]    = useState([])

  const jobMap = Object.fromEntries(jobs.map(j => [j.id, j.name || j.client_name]))

  // Fetch current user's display name for clock-in
  useEffect(() => {
    if (!user?.id) return
    supabase.from('profiles').select('*').eq('id', user.id).single()
      .then(({ data }) => {
        const name = (data && (
          [data.first_name, data.last_name].filter(Boolean).join(' ') ||
          data.full_name || data.display_name || data.name
        )) || user.email || 'Unknown'
        setProfileName(name)
      })
  }, [user?.id])

  // Load payroll week start from company_settings
  useEffect(() => {
    supabase.from('company_settings').select('payroll_week_start').maybeSingle()
      .then(({ data }) => { if (data?.payroll_week_start != null) setPayrollWeekStart(data.payroll_week_start) })
  }, [])

  // Fetch this user's time entries for the current payroll week (all jobs)
  useEffect(() => {
    if (!user?.id) return
    const { weekStart, weekEnd } = getWeekRange(payrollWeekStart)
    const start = weekStart.toISOString().split('T')[0]
    const end   = weekEnd.toISOString().split('T')[0]
    supabase.from('time_entries')
      .select('*')
      .eq('created_by', user.id)
      .gte('date', start)
      .lte('date', end)
      .then(({ data }) => { if (data) setMyWeekEntries(data) })
  }, [user?.id, payrollWeekStart])

  // Live elapsed timer — updates every 30 s while clocked in
  useEffect(() => {
    const t = setInterval(() => setNowTime(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => { fetchEntries() }, [selectedJob])

  // Derive the current user's open (not yet clocked-out) entry for today
  const myOpenEntry = entries.find(
    e => e.created_by === user?.id && !e.time_out && e.date === todayDate()
  )
  const isClockedIn = !!myOpenEntry

  // Personal time stats for mobile UI
  const { weekStart, weekEnd } = getWeekRange(payrollWeekStart)
  const weekRangeLabel = fmtWeekRange(weekStart, weekEnd)

  const myTodayMins = myWeekEntries
    .filter(e => e.date === todayDate() && e.time_out)
    .reduce((sum, e) => sum + (diffMins(e.time_in, e.time_out) || 0), 0)

  const myWeekMins = myWeekEntries
    .filter(e => e.time_out)
    .reduce((sum, e) => sum + (diffMins(e.time_in, e.time_out) || 0), 0)

  async function fetchEntries() {
    setLoading(true)
    let q = supabase
      .from('time_entries')
      .select('*')
      .order('date', { ascending: false })
      .order('time_in', { ascending: true })

    if (selectedJob !== 'all') q = q.eq('job_id', selectedJob)

    const { data, error } = await q
    if (error) console.error('fetchEntries:', error)
    if (data) setEntries(data)
    setLoading(false)

    // Also refresh personal week totals
    if (user?.id) {
      const { weekStart: ws, weekEnd: we } = getWeekRange(payrollWeekStart)
      const { data: wd } = await supabase.from('time_entries')
        .select('*')
        .eq('created_by', user.id)
        .gte('date', ws.toISOString().split('T')[0])
        .lte('date', we.toISOString().split('T')[0])
      if (wd) setMyWeekEntries(wd)
    }
  }

  function openNew() {
    setEditEntry(null)
    setForm({
      ...EMPTY_FORM,
      job_id: selectedJob !== 'all' ? selectedJob : '',
      date: todayDate(),
    })
    setError('')
    setShowModal(true)
  }

  function openEdit(entry) {
    setEditEntry(entry)
    setForm({
      employee_name: entry.employee_name || '',
      job_id:        entry.job_id || '',
      date:          entry.date || todayDate(),
      time_in:       fmt24h(entry.time_in),
      time_out:      fmt24h(entry.time_out || ''),
      notes:         entry.notes || '',
    })
    setError('')
    setShowModal(true)
  }

  function closeModal() { setShowModal(false); setEditEntry(null) }

  async function saveEntry() {
    if (!form.employee_name.trim()) { setError('Employee name is required.'); return }
    if (!form.time_in) { setError('Time In is required.'); return }
    setSaving(true)
    setError('')

    const payload = {
      employee_name: form.employee_name.trim(),
      job_id:        form.job_id || null,
      date:          form.date,
      time_in:       form.time_in,
      time_out:      form.time_out || null,
      notes:         form.notes.trim() || null,
      created_by:    user?.id,
      updated_at:    new Date().toISOString(),
    }

    const { error } = editEntry
      ? await supabase.from('time_entries').update(payload).eq('id', editEntry.id)
      : await supabase.from('time_entries').insert(payload)

    if (error) {
      console.error(error)
      setError('Failed to save. Please try again.')
      setSaving(false)
      return
    }
    setSaving(false)
    closeModal()
    fetchEntries()
  }

  async function deleteEntry(entry) {
    if (!confirm(`Delete time entry for ${entry.employee_name}?`)) return
    await supabase.from('time_entries').delete().eq('id', entry.id)
    setEntries(prev => prev.filter(e => e.id !== entry.id))
  }

  async function clockOut(entry) {
    const now = new Date()
    const timeOut = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
    await supabase.from('time_entries')
      .update({ time_out: timeOut, updated_at: now.toISOString() })
      .eq('id', entry.id)
    fetchEntries()
  }

  // ── Personal clock-in / clock-out button handlers ─────────
  // jobId is required — mobile hero enforces selection before calling this
  async function handleClockIn(jobId) {
    const resolvedJobId = jobId || (selectedJob !== 'all' ? selectedJob : null)
    if (!resolvedJobId) return   // safety guard — should never reach this on mobile
    const now = new Date()
    const timeIn = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
    await supabase.from('time_entries').insert({
      employee_name: profileName,
      job_id:        resolvedJobId,
      date:          todayDate(),
      time_in:       timeIn,
      time_out:      null,
      created_by:    user?.id,
      updated_at:    now.toISOString(),
    })
    fetchEntries()
  }

  async function handleClockOut() {
    if (!myOpenEntry) return
    const now = new Date()
    const timeOut = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
    await supabase.from('time_entries')
      .update({ time_out: timeOut, updated_at: now.toISOString() })
      .eq('id', myOpenEntry.id)
    fetchEntries()
  }

  // Group by date for mobile cards
  const grouped = entries.reduce((acc, e) => {
    if (!acc[e.date]) acc[e.date] = []
    acc[e.date].push(e)
    return acc
  }, {})
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0 gap-4 flex-wrap">

        {/* Left: title + entry count */}
        <h2 className="text-sm font-semibold text-gray-700 flex-shrink-0">
          Time Clock {entries.length > 0 && <span className="text-gray-400 font-normal">({entries.length} entries)</span>}
        </h2>

        {/* Right: clock-in/out button + manual add — desktop only (mobile uses the hero button) */}
        <div className="hidden lg:flex items-center gap-3 ml-auto">

          {/* Live status when clocked in */}
          {isClockedIn && myOpenEntry && (
            <div className="text-xs text-gray-500">
              In at <span className="font-semibold text-green-700">{fmt12h(myOpenEntry.time_in)}</span>
              <span className="mx-1.5 text-gray-300">·</span>
              <span className="font-mono text-gray-600">{calcElapsed(myOpenEntry.time_in, nowTime)}</span>
            </div>
          )}

          {/* The dynamic Clock In / Clock Out button */}
          <button
            onClick={isClockedIn ? handleClockOut : handleClockIn}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold shadow-sm transition-all ${
              isClockedIn
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-700 hover:bg-green-800 text-white'
            }`}
          >
            <span className={`w-2 h-2 rounded-full bg-white ${isClockedIn ? 'animate-pulse' : ''}`} />
            {isClockedIn ? 'Clock Out' : 'Clock In'}
          </button>

          {/* Manual Shift button */}
          <button onClick={openNew} className="btn-secondary text-sm px-3 py-1.5 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Manual Shift
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-green-700" />
        </div>
      ) : entries.length === 0 ? (
        <>
          {/* Mobile hero shown even with no entries */}
          <MobileHero
            isClockedIn={isClockedIn}
            myOpenEntry={myOpenEntry}
            nowTime={nowTime}
            myTodayMins={myTodayMins}
            myWeekMins={myWeekMins}
            weekRangeLabel={weekRangeLabel}
            myWeekEntries={myWeekEntries}
            jobMap={jobMap}
            jobs={jobs}
            selectedJob={selectedJob}
            onClockIn={handleClockIn}
            onClockOut={handleClockOut}
            onManualShift={openNew}
          />
          <div className="hidden lg:flex flex-col items-center justify-center flex-1 text-gray-400 py-20">
            <p className="text-5xl mb-3">⏱️</p>
            <p className="text-sm font-medium text-gray-500">No time entries yet</p>
            <p className="text-xs mt-1 mb-4">Track employee hours by job</p>
            <button onClick={openNew} className="btn-primary text-sm px-4 py-2">Add First Entry</button>
          </div>
        </>
      ) : (
        <>
          {/* ── Desktop table ─────────────────────────────────── */}
          <div className="hidden lg:block overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">Date</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">Employee</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">Job</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">Time In</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">Time Out</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Total</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Overtime</th>
                  <th className="px-4 py-3 w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {entries.map((entry, idx) => {
                  const { total, ot } = calcTimes(entry.time_in, entry.time_out)
                  const showDate = idx === 0 || entries[idx - 1].date !== entry.date
                  const isClockedIn = !entry.time_out
                  return (
                    <tr key={entry.id} className={`transition-colors group ${isClockedIn ? 'bg-green-50/40' : 'hover:bg-gray-50'}`}>

                      {/* Date */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {showDate
                          ? <span className="text-blue-600 font-medium text-xs">{fmtDateLabel(entry.date)}</span>
                          : <span className="text-gray-200 text-xs select-none">″</span>}
                      </td>

                      {/* Employee */}
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {entry.employee_name}
                        {isClockedIn && (
                          <span className="ml-2 text-[10px] font-semibold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">
                            Active
                          </span>
                        )}
                      </td>

                      {/* Job */}
                      <td className="px-4 py-3 text-gray-500 max-w-[180px] truncate">
                        {jobMap[entry.job_id] || <span className="text-gray-300 italic text-xs">No job</span>}
                      </td>

                      {/* Time In */}
                      <td className="px-4 py-3 text-gray-700 font-mono text-sm">{fmt12h(entry.time_in)}</td>

                      {/* Time Out — or Clock Out link */}
                      <td className="px-4 py-3">
                        {isClockedIn ? (
                          <button
                            onClick={() => clockOut(entry)}
                            className="text-xs font-semibold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md px-2.5 py-1 transition-colors"
                          >
                            Clock Out
                          </button>
                        ) : (
                          <span className="text-gray-700 font-mono text-sm">{fmt12h(entry.time_out)}</span>
                        )}
                      </td>

                      {/* Total */}
                      <td className="px-4 py-3 text-right font-mono font-semibold text-gray-800">
                        {isClockedIn ? <span className="text-gray-300">—</span> : fmtMins(total)}
                      </td>

                      {/* Overtime */}
                      <td className="px-4 py-3 text-right font-mono">
                        {isClockedIn ? (
                          <span className="text-gray-300">—</span>
                        ) : ot > 0 ? (
                          <span className="text-orange-600 font-semibold">{fmtMins(ot)}</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(entry)}
                            className="p-1.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700"
                            title="Edit">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z" />
                            </svg>
                          </button>
                          <button onClick={() => deleteEntry(entry)}
                            className="p-1.5 rounded hover:bg-red-100 text-gray-400 hover:text-red-500"
                            title="Delete">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* ── Mobile UI ─────────────────────────────────────── */}
          <MobileHero
            isClockedIn={isClockedIn}
            myOpenEntry={myOpenEntry}
            nowTime={nowTime}
            myTodayMins={myTodayMins}
            myWeekMins={myWeekMins}
            weekRangeLabel={weekRangeLabel}
            myWeekEntries={myWeekEntries}
            jobMap={jobMap}
            jobs={jobs}
            selectedJob={selectedJob}
            onClockIn={handleClockIn}
            onClockOut={handleClockOut}
            onManualShift={openNew}
          />
        </>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <TimeEntryModal
          form={form}
          setForm={setForm}
          isEdit={!!editEntry}
          jobs={jobs}
          onSave={saveEntry}
          onClose={closeModal}
          saving={saving}
          error={error}
          onDelete={editEntry ? () => { deleteEntry(editEntry); closeModal() } : null}
        />
      )}
    </div>
  )
}

// ── Mobile Hero — big clock button + stats ───────────────────
function MobileHero({
  isClockedIn, myOpenEntry, nowTime,
  myTodayMins, myWeekMins, weekRangeLabel,
  myWeekEntries, jobMap, jobs = [], selectedJob,
  onClockIn, onClockOut, onManualShift,
}) {
  // Local job selection — pre-fill from selectedJob if a specific job is already chosen
  const [pickedJobId, setPickedJobId] = useState(
    selectedJob && selectedJob !== 'all' ? selectedJob : ''
  )
  const noJobPicked = !pickedJobId

  // If user was clocked in, show which job they clocked into
  const clockedInJobName = myOpenEntry?.job_id ? jobMap[myOpenEntry.job_id] : null

  return (
    <div className="lg:hidden flex flex-col gap-4">

      {/* Job picker — required before clock in, hidden once clocked in */}
      {!isClockedIn && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Select Job <span className="text-red-400">*</span>
          </label>
          <select
            value={pickedJobId}
            onChange={e => setPickedJobId(e.target.value)}
            className={`w-full rounded-xl border px-4 py-3 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-green-500 ${
              noJobPicked ? 'border-red-300 text-gray-400' : 'border-gray-300 text-gray-900'
            }`}
          >
            <option value="">— Choose a job to clock in —</option>
            {jobs.map(j => (
              <option key={j.id} value={j.id}>{j.name || j.client_name}</option>
            ))}
          </select>
          {noJobPicked && (
            <p className="text-xs text-red-500 mt-1 px-1">A job must be selected before clocking in.</p>
          )}
        </div>
      )}

      {/* Big clock button */}
      <button
        onClick={isClockedIn ? onClockOut : () => { if (!noJobPicked) onClockIn(pickedJobId) }}
        disabled={!isClockedIn && noJobPicked}
        className={`w-full py-10 rounded-2xl text-2xl font-black shadow-lg flex flex-col items-center gap-2 transition-all select-none ${
          isClockedIn
            ? 'bg-red-600 text-white active:scale-95'
            : noJobPicked
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-green-700 text-white active:scale-95'
        }`}
      >
        <span className={`w-4 h-4 rounded-full ${isClockedIn ? 'bg-white/70 animate-pulse' : noJobPicked ? 'bg-gray-300' : 'bg-white/70'}`} />
        {isClockedIn ? 'Clock Out' : 'Clock In'}
        {isClockedIn && myOpenEntry && (
          <span className="text-sm font-normal text-white/80 mt-1 text-center px-4">
            {clockedInJobName && <span className="block font-semibold text-white">{clockedInJobName}</span>}
            In at {fmt12h(myOpenEntry.time_in)} · {calcElapsed(myOpenEntry.time_in, nowTime)} elapsed
          </span>
        )}
      </button>

      {/* Stats: Today + This Week */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center shadow-sm">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Today</p>
          <p className="text-3xl font-black text-gray-900">{fmtHours(myTodayMins)}</p>
          <p className="text-[10px] text-gray-400 mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center shadow-sm">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">This Week</p>
          <p className={`text-3xl font-black ${myWeekMins >= 2400 ? 'text-orange-600' : 'text-gray-900'}`}>
            {fmtHours(myWeekMins)}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">{weekRangeLabel}</p>
        </div>
      </div>

      {/* Recent shifts this week */}
      {myWeekEntries.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">My Shifts This Week</p>
          <div className="space-y-2">
            {[...myWeekEntries]
              .sort((a, b) => b.date.localeCompare(a.date) || (b.time_in || '').localeCompare(a.time_in || ''))
              .slice(0, 7)
              .map(entry => {
                const { total, ot } = calcTimes(entry.time_in, entry.time_out)
                return (
                  <div key={entry.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-blue-600">{fmtDateLabel(entry.date)}</p>
                      {entry.job_id && (
                        <p className="text-xs text-green-700 truncate">{jobMap[entry.job_id]}</p>
                      )}
                      <p className="text-sm text-gray-600 mt-0.5">
                        {fmt12h(entry.time_in)}
                        {' – '}
                        {entry.time_out
                          ? fmt12h(entry.time_out)
                          : <span className="text-green-700 font-semibold">Active</span>
                        }
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {total != null ? (
                        <>
                          <p className="text-base font-bold text-gray-900">{fmtMins(total)}</p>
                          {ot > 0 && <p className="text-[10px] text-orange-600 font-semibold">OT {fmtMins(ot)}</p>}
                        </>
                      ) : (
                        <span className="text-xs text-green-700 font-semibold">In progress</span>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Manual Shift shortcut */}
      <button
        onClick={onManualShift}
        className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-sm font-medium text-gray-500 hover:border-green-400 hover:text-green-700 transition-colors"
      >
        + Manual Shift
      </button>
    </div>
  )
}

// ── Add / Edit Modal ─────────────────────────────────────────
function TimeEntryModal({ form, setForm, isEdit, jobs, onSave, onClose, saving, error, onDelete }) {
  const { total, regular, ot } = calcTimes(form.time_in, form.time_out)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-[440px] flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900">
            {isEdit ? 'Edit Time Entry' : 'Add Time Entry'}
          </h2>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 p-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

          {/* Employee name */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Employee Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.employee_name}
              onChange={e => setForm(f => ({ ...f, employee_name: e.target.value }))}
              placeholder="e.g. Hugo Guzman"
              className="input text-sm w-full"
              autoFocus
            />
          </div>

          {/* Job */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Job</label>
            <select
              value={form.job_id}
              onChange={e => setForm(f => ({ ...f, job_id: e.target.value }))}
              className="input text-sm w-full"
            >
              <option value="">— No job assigned —</option>
              {jobs.map(j => (
                <option key={j.id} value={j.id}>{j.name || j.client_name}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className="input text-sm w-full"
            />
          </div>

          {/* Time In / Time Out */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Time In <span className="text-red-400">*</span>
              </label>
              <input
                type="time"
                value={form.time_in}
                onChange={e => setForm(f => ({ ...f, time_in: e.target.value }))}
                className="input text-sm w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Time Out</label>
              <input
                type="time"
                value={form.time_out}
                onChange={e => setForm(f => ({ ...f, time_out: e.target.value }))}
                className="input text-sm w-full"
              />
            </div>
          </div>

          {/* Live preview of computed times */}
          {total != null && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Regular</p>
                <p className="text-sm font-mono font-bold text-gray-800">{fmtMins(regular)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">OT</p>
                <p className={`text-sm font-mono font-bold ${ot > 0 ? 'text-orange-600' : 'text-gray-300'}`}>
                  {fmtMins(ot)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Total</p>
                <p className="text-sm font-mono font-bold text-gray-800">{fmtMins(total)}</p>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Optional…"
              rows={2}
              className="input text-sm w-full resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        {/* Footer — always visible */}
        <div className="px-5 py-4 flex gap-2 flex-shrink-0 border-t border-gray-100">
          <button
            onClick={onSave}
            disabled={saving}
            className="flex-1 btn-primary text-sm py-3 disabled:opacity-50"
          >
            {saving ? 'Saving…' : isEdit ? 'Update Entry' : 'Save Entry'}
          </button>
          <button onClick={onClose}
            className="px-5 py-3 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          {onDelete && (
            <button onClick={onDelete}
              className="px-3 py-3 text-sm rounded-lg border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600">
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
