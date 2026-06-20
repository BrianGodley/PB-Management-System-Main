// ─────────────────────────────────────────────────────────────────────────────
// SalesCalendar — Sales hub → Calendar tab
// Month grid + Week time-slot views of sales appointments (a consultant/employee
// meeting a prospect). Filter by consultant, color-coded by person. Click a day
// or time slot to book; click an appointment to edit. Backed by the
// sales_appointments table (see supabase-sales-appointments.sql).
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ── small date helpers (no external lib) ────────────────────────────────────
const pad = n => String(n).padStart(2, '0')
const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1)
const startOfWeek = d => addDays(startOfDay(d), -startOfDay(d).getDay()) // Sunday
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
const toDateInput = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const toTimeInput = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEK_START_HOUR = 7
const WEEK_END_HOUR = 19 // 7am–7pm rows

const PALETTE = ['#3A5038', '#2563eb', '#db2777', '#d97706', '#0891b2', '#7c3aed', '#16a34a', '#dc2626', '#0d9488', '#9333ea']
const colorFor = id => PALETTE[[...String(id || 'x')].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length]

const clientName = c =>
  !c ? '' : c.client_type === 'company'
    ? (c.company_name || c.name || 'Company')
    : (`${c.first_name || ''} ${c.last_name || ''}`.trim() || c.name || 'Unnamed')
const empName = e =>
  !e ? 'Unassigned' : (`${e.first_name || ''} ${e.last_name || ''}`.trim() || e.email || 'Employee')

const STATUSES = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'canceled', label: 'Canceled' },
  { value: 'no_show', label: 'No-show' },
]

export default function SalesCalendar() {
  const { user } = useAuth()
  const [view, setView] = useState('month') // 'month' | 'week'
  const [cursor, setCursor] = useState(() => startOfDay(new Date()))
  const [filterEmp, setFilterEmp] = useState('all')

  const [appts, setAppts] = useState([])
  const [clients, setClients] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(false)

  const [editing, setEditing] = useState(null) // null | appointment record | {} for new
  const [showConsultants, setShowConsultants] = useState(false)

  const empById = useMemo(() => Object.fromEntries(employees.map(e => [e.id, e])), [employees])
  const clientById = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c])), [clients])

  // ── visible range for the query ──────────────────────────────────────────
  const range = useMemo(() => {
    if (view === 'week') {
      const s = startOfWeek(cursor)
      return { start: s, end: addDays(s, 7) }
    }
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const gridStart = startOfWeek(first)
    return { start: gridStart, end: addDays(gridStart, 42) }
  }, [view, cursor])

  // ── load reference data once ───────────────────────────────────────────────
  useEffect(() => {
    supabase
      .from('clients')
      .select('id, client_type, first_name, last_name, company_name, name')
      .then(({ data }) => setClients(data || []))
    supabase
      .from('employees')
      .select('id, first_name, last_name, email, status, is_consultant')
      .eq('status', 'active')
      .order('last_name')
      .then(({ data }) => setEmployees(data || []))
  }, [])

  const loadAppts = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('sales_appointments')
      .select('*')
      .gte('starts_at', range.start.toISOString())
      .lt('starts_at', range.end.toISOString())
      .order('starts_at')
    setAppts(data || [])
    setLoading(false)
  }, [range.start, range.end])

  useEffect(() => { loadAppts() }, [loadAppts])

  const visibleAppts = useMemo(
    () => (filterEmp === 'all' ? appts : appts.filter(a => a.employee_id === filterEmp)),
    [appts, filterEmp]
  )
  const apptsForDay = d =>
    visibleAppts
      .filter(a => sameDay(new Date(a.starts_at), d))
      .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))

  // ── consultants first, then other employees (for pickers + filter) ─────────
  const consultants = employees.filter(e => e.is_consultant)
  const others = employees.filter(e => !e.is_consultant)

  // ── navigation ─────────────────────────────────────────────────────────────
  const go = dir => setCursor(c => (view === 'week' ? addDays(c, 7 * dir) : addMonths(c, dir)))
  const today = () => setCursor(startOfDay(new Date()))

  const periodLabel =
    view === 'week'
      ? (() => {
          const s = startOfWeek(cursor)
          const e = addDays(s, 6)
          const sameMonth = s.getMonth() === e.getMonth()
          return sameMonth
            ? `${MONTHS[s.getMonth()]} ${s.getDate()}–${e.getDate()}, ${e.getFullYear()}`
            : `${MONTHS[s.getMonth()].slice(0, 3)} ${s.getDate()} – ${MONTHS[e.getMonth()].slice(0, 3)} ${e.getDate()}, ${e.getFullYear()}`
        })()
      : `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`

  const openNew = (date, hour) => {
    const start = new Date(date)
    start.setHours(hour != null ? hour : 9, 0, 0, 0)
    const end = new Date(start)
    end.setHours(start.getHours() + 1)
    setEditing({ _new: true, starts_at: start.toISOString(), ends_at: end.toISOString() })
  }

  return (
    <div className="mt-3 flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-3 flex-shrink-0">
        <div className="flex items-center rounded-xl border border-gray-200 overflow-hidden">
          <button onClick={() => go(-1)} className="px-3 py-1.5 text-gray-500 hover:bg-gray-50">‹</button>
          <button onClick={today} className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 border-x border-gray-200">Today</button>
          <button onClick={() => go(1)} className="px-3 py-1.5 text-gray-500 hover:bg-gray-50">›</button>
        </div>
        <h3 className="font-semibold text-gray-800 text-base min-w-[12rem]">{periodLabel}</h3>

        <div className="flex items-center rounded-xl bg-gray-100 p-1">
          {['month', 'week'].map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 rounded-lg text-sm font-medium capitalize transition-colors ${view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {v}
            </button>
          ))}
        </div>

        <select
          value={filterEmp}
          onChange={e => setFilterEmp(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-green-500"
        >
          <option value="all">All consultants</option>
          {consultants.length > 0 && (
            <optgroup label="Consultants">
              {consultants.map(e => <option key={e.id} value={e.id}>{empName(e)}</option>)}
            </optgroup>
          )}
          {others.length > 0 && (
            <optgroup label="Other employees">
              {others.map(e => <option key={e.id} value={e.id}>{empName(e)}</option>)}
            </optgroup>
          )}
        </select>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowConsultants(true)}
            className="px-3 py-1.5 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            👥 Consultants
          </button>
          <button
            onClick={() => openNew(cursor)}
            className="px-4 py-1.5 bg-green-700 text-white text-sm rounded-xl font-medium hover:bg-green-800"
          >
            + New Appointment
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-2xl border border-gray-200 bg-white">
        {view === 'month' ? (
          <MonthGrid
            cursor={cursor}
            gridStart={range.start}
            apptsForDay={apptsForDay}
            empById={empById}
            clientById={clientById}
            onDayClick={openNew}
            onApptClick={setEditing}
          />
        ) : (
          <WeekGrid
            cursor={cursor}
            apptsForDay={apptsForDay}
            empById={empById}
            clientById={clientById}
            onSlotClick={openNew}
            onApptClick={setEditing}
          />
        )}
      </div>

      {loading && <p className="text-xs text-gray-400 mt-2">Loading…</p>}

      {editing && (
        <AppointmentModal
          record={editing}
          clients={clients}
          consultants={consultants}
          others={others}
          userEmail={user?.email}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); loadAppts() }}
        />
      )}

      {showConsultants && (
        <ConsultantsModal
          employees={employees}
          onClose={() => setShowConsultants(false)}
          onSaved={emps => { setEmployees(emps); setShowConsultants(false) }}
        />
      )}
    </div>
  )
}

// ── Month grid ──────────────────────────────────────────────────────────────
function MonthGrid({ cursor, gridStart, apptsForDay, empById, clientById, onDayClick, onApptClick }) {
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  const todayD = new Date()
  return (
    <div className="min-w-[680px]">
      <div className="grid grid-cols-7 border-b border-gray-200">
        {DOW.map(d => (
          <div key={d} className="px-2 py-2 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          const inMonth = d.getMonth() === cursor.getMonth()
          const list = apptsForDay(d)
          return (
            <div
              key={i}
              onClick={() => onDayClick(d)}
              className={`min-h-[104px] border-b border-r border-gray-100 p-1.5 cursor-pointer hover:bg-green-50/40 transition-colors ${inMonth ? '' : 'bg-gray-50/60'}`}
            >
              <div className="flex justify-end">
                <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${sameDay(d, todayD) ? 'bg-green-700 text-white' : inMonth ? 'text-gray-600' : 'text-gray-300'}`}>
                  {d.getDate()}
                </span>
              </div>
              <div className="space-y-1 mt-0.5">
                {list.slice(0, 3).map(a => {
                  const c = colorFor(a.employee_id)
                  return (
                    <button
                      key={a.id}
                      onClick={e => { e.stopPropagation(); onApptClick(a) }}
                      className="w-full text-left rounded-md px-1.5 py-0.5 text-[11px] font-medium truncate text-white"
                      style={{ backgroundColor: c }}
                      title={`${a.title} · ${empName(empById[a.employee_id])}`}
                    >
                      {toTimeInput(new Date(a.starts_at))} {clientById[a.client_id] ? clientName(clientById[a.client_id]) : a.title}
                    </button>
                  )
                })}
                {list.length > 3 && (
                  <p className="text-[10px] text-gray-400 pl-1">+{list.length - 3} more</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Week grid (time slots) ──────────────────────────────────────────────────
function WeekGrid({ cursor, apptsForDay, empById, clientById, onSlotClick, onApptClick }) {
  const weekStart = startOfWeek(cursor)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const hours = Array.from({ length: WEEK_END_HOUR - WEEK_START_HOUR }, (_, i) => WEEK_START_HOUR + i)
  const ROW_H = 52 // px per hour
  const todayD = new Date()

  const blockFor = a => {
    const s = new Date(a.starts_at)
    const e = new Date(a.ends_at || a.starts_at)
    const startMins = (s.getHours() - WEEK_START_HOUR) * 60 + s.getMinutes()
    const durMins = Math.max(30, (e - s) / 60000)
    return { top: (startMins / 60) * ROW_H, height: (durMins / 60) * ROW_H }
  }

  return (
    <div className="min-w-[760px]">
      {/* header row */}
      <div className="grid sticky top-0 z-10 bg-white border-b border-gray-200" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
        <div />
        {days.map((d, i) => (
          <div key={i} className="px-2 py-2 text-center border-l border-gray-100">
            <p className="text-[11px] text-gray-400 uppercase">{DOW[d.getDay()]}</p>
            <p className={`text-sm font-semibold ${sameDay(d, todayD) ? 'text-green-700' : 'text-gray-700'}`}>{d.getDate()}</p>
          </div>
        ))}
      </div>
      {/* body */}
      <div className="grid" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
        {/* hour labels */}
        <div>
          {hours.map(h => (
            <div key={h} style={{ height: ROW_H }} className="text-[11px] text-gray-400 text-right pr-2 -mt-1.5">
              {h === 12 ? '12p' : h > 12 ? `${h - 12}p` : `${h}a`}
            </div>
          ))}
        </div>
        {/* day columns */}
        {days.map((d, i) => (
          <div key={i} className="relative border-l border-gray-100">
            {hours.map(h => (
              <div
                key={h}
                onClick={() => onSlotClick(d, h)}
                style={{ height: ROW_H }}
                className="border-b border-gray-100 hover:bg-green-50/40 cursor-pointer"
              />
            ))}
            {apptsForDay(d).map(a => {
              const { top, height } = blockFor(a)
              const c = colorFor(a.employee_id)
              return (
                <button
                  key={a.id}
                  onClick={e => { e.stopPropagation(); onApptClick(a) }}
                  className="absolute left-1 right-1 rounded-md px-1.5 py-0.5 text-[11px] text-white text-left overflow-hidden shadow-sm"
                  style={{ top, height, backgroundColor: c }}
                  title={`${a.title} · ${empName(empById[a.employee_id])}`}
                >
                  <span className="font-semibold">{toTimeInput(new Date(a.starts_at))}</span>{' '}
                  {clientById[a.client_id] ? clientName(clientById[a.client_id]) : a.title}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Appointment create/edit modal ───────────────────────────────────────────
function AppointmentModal({ record, clients, consultants, others, userEmail, onClose, onSaved }) {
  const isNew = !record.id
  const s0 = new Date(record.starts_at || Date.now())
  const e0 = new Date(record.ends_at || record.starts_at || Date.now())

  const [title, setTitle] = useState(record.title || 'Meeting')
  const [clientId, setClientId] = useState(record.client_id || '')
  const [employeeId, setEmployeeId] = useState(record.employee_id || '')
  const [date, setDate] = useState(toDateInput(s0))
  const [startTime, setStartTime] = useState(toTimeInput(s0))
  const [endTime, setEndTime] = useState(toTimeInput(e0))
  const [location, setLocation] = useState(record.location || '')
  const [notes, setNotes] = useState(record.notes || '')
  const [status, setStatus] = useState(record.status || 'scheduled')
  const [clientSearch, setClientSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const individuals = clients.filter(c => c.client_type !== 'company')
  const companies = clients.filter(c => c.client_type === 'company')
  const matches = c => clientName(c).toLowerCase().includes(clientSearch.toLowerCase())

  const save = async () => {
    setError('')
    const starts_at = new Date(`${date}T${startTime}`)
    const ends_at = new Date(`${date}T${endTime}`)
    if (isNaN(starts_at) || isNaN(ends_at)) { setError('Please set a valid date and time.'); return }
    if (ends_at <= starts_at) { setError('End time must be after the start time.'); return }
    setSaving(true)
    const payload = {
      title: title.trim() || 'Meeting',
      client_id: clientId || null,
      employee_id: employeeId || null,
      starts_at: starts_at.toISOString(),
      ends_at: ends_at.toISOString(),
      location: location.trim() || null,
      notes: notes.trim() || null,
      status,
    }
    let err
    if (isNew) {
      ;({ error: err } = await supabase
        .from('sales_appointments')
        .insert({ ...payload, created_by_email: userEmail }))
    } else {
      ;({ error: err } = await supabase
        .from('sales_appointments')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', record.id))
    }
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
  }

  const remove = async () => {
    if (!confirm('Delete this appointment?')) return
    setSaving(true)
    const { error: err } = await supabase.from('sales_appointments').delete().eq('id', record.id)
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-3 max-h-[92vh] overflow-y-auto">
        <h3 className="font-bold text-gray-900 text-lg">{isNew ? 'New Appointment' : 'Edit Appointment'}</h3>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Site walk-through"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Prospect</label>
          <input value={clientSearch} onChange={e => setClientSearch(e.target.value)} placeholder="Search prospects…"
            className="w-full border border-gray-200 rounded-xl px-3 py-1.5 text-sm mb-1.5 focus:outline-none focus:border-green-500" />
          <select value={clientId} onChange={e => setClientId(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500">
            <option value="">— No prospect —</option>
            {individuals.filter(matches).length > 0 && (
              <optgroup label="Individuals">
                {individuals.filter(matches).map(c => <option key={c.id} value={c.id}>{clientName(c)}</option>)}
              </optgroup>
            )}
            {companies.filter(matches).length > 0 && (
              <optgroup label="Companies">
                {companies.filter(matches).map(c => <option key={c.id} value={c.id}>{clientName(c)}</option>)}
              </optgroup>
            )}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Consultant / Employee</label>
          <select value={employeeId} onChange={e => setEmployeeId(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500">
            <option value="">— Unassigned —</option>
            {consultants.length > 0 && (
              <optgroup label="Consultants">
                {consultants.map(e => <option key={e.id} value={e.id}>{empName(e)}</option>)}
              </optgroup>
            )}
            {others.length > 0 && (
              <optgroup label="Other employees">
                {others.map(e => <option key={e.id} value={e.id}>{empName(e)}</option>)}
              </optgroup>
            )}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Start</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">End</label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Address or call link"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500">
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Agenda, prep, etc."
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500 resize-none" />
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button onClick={save} disabled={saving}
            className="flex-1 py-2.5 bg-green-700 text-white rounded-xl font-medium hover:bg-green-800 disabled:opacity-50">
            {saving ? 'Saving…' : isNew ? 'Book Appointment' : 'Save Changes'}
          </button>
          {!isNew && (
            <button onClick={remove} disabled={saving}
              className="px-4 py-2.5 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 disabled:opacity-50">
              Delete
            </button>
          )}
          <button onClick={onClose} disabled={saving}
            className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 disabled:opacity-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Consultants manager ─────────────────────────────────────────────────────
function ConsultantsModal({ employees, onClose, onSaved }) {
  const [local, setLocal] = useState(() => employees.map(e => ({ ...e })))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const toggle = id => setLocal(l => l.map(e => (e.id === id ? { ...e, is_consultant: !e.is_consultant } : e)))

  const save = async () => {
    setSaving(true)
    setError('')
    // Persist only the rows whose flag changed.
    const changed = local.filter(e => {
      const orig = employees.find(o => o.id === e.id)
      return orig && !!orig.is_consultant !== !!e.is_consultant
    })
    for (const e of changed) {
      const { error: err } = await supabase
        .from('employees')
        .update({ is_consultant: e.is_consultant })
        .eq('id', e.id)
      if (err) { setError(err.message); setSaving(false); return }
    }
    setSaving(false)
    onSaved(local)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-3 max-h-[85vh] overflow-y-auto">
        <h3 className="font-bold text-gray-900 text-lg">Consultants</h3>
        <p className="text-xs text-gray-500">Mark who appears at the top of the consultant lists. Everyone else stays available under “Other employees.”</p>
        <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl">
          {local.length === 0 && <p className="text-sm text-gray-400 p-3">No active employees.</p>}
          {local.map(e => (
            <label key={e.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50">
              <input type="checkbox" checked={!!e.is_consultant} onChange={() => toggle(e.id)}
                className="w-4 h-4 accent-green-700" />
              <span className="text-sm text-gray-800">{empName(e)}</span>
            </label>
          ))}
        </div>
        {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}
        <div className="flex gap-3 pt-1">
          <button onClick={save} disabled={saving}
            className="flex-1 py-2.5 bg-green-700 text-white rounded-xl font-medium hover:bg-green-800 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={onClose} disabled={saving}
            className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 disabled:opacity-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
