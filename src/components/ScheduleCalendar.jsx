import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { COLOR_PALETTE } from '../pages/JobsList'

// ── Color Dropdown Picker ─────────────────────────────────────
function ColorDropdown({ value, onChange, allowClear = false }) {
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
        className="flex items-center gap-2 px-2.5 py-1.5 border border-gray-300 rounded-lg bg-white hover:border-gray-400 transition-colors text-sm"
      >
        {value
          ? <span className="w-5 h-5 rounded-full border border-gray-200 flex-shrink-0" style={{ backgroundColor: value }} />
          : <span className="w-5 h-5 rounded-full border-2 border-dashed border-gray-300 flex-shrink-0" />}
        <span className="font-mono text-gray-700 text-xs">{value || 'None'}</span>
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
            {allowClear && (
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false) }}
                className="w-6 h-6 rounded-full border-2 border-dashed border-gray-300 text-gray-400 text-[9px] flex items-center justify-center hover:border-gray-500 transition-colors"
                title="No color"
              >✕</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Constants ────────────────────────────────────────────────
const COLORS = [
  { label: 'Green',  value: '#15803d' },
  { label: 'Blue',   value: '#3b82f6' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Red',    value: '#ef4444' },
  { label: 'Teal',   value: '#14b8a6' },
  { label: 'Yellow', value: '#eab308' },
  { label: 'Pink',   value: '#ec4899' },
]
const REMINDERS  = ['None', '1 day before', '2 days before', '3 days before', '1 week before']
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_NAMES   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

const DAY_H = 30  // height of the day-number header row in px

// ── Date helpers ─────────────────────────────────────────────
function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate() }
function firstDayOfMonth(y, m) { return new Date(y, m, 1).getDay() }

function dateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

// Returns true if the date counts as a working day given exceptions + per-item weekend flags
function isWorkingDay(date, exceptions = [], includeSat = false, includeSun = false) {
  const dow = date.getDay()
  if (dow === 6 && !includeSat) return false
  if (dow === 0 && !includeSun) return false
  const ds = dateStr(date)
  return !exceptions.some(ex => {
    if (ex.type === 'day_of_week') return ex.day_of_week === dow
    if (ex.type === 'specific_date') {
      const end = ex.exception_date_end || ex.exception_date
      return ds >= ex.exception_date && ds <= end
    }
    return false
  })
}

function addWorkDays(startDate, workDays, exceptions = [], includeSat = false, includeSun = false) {
  if (!workDays || workDays < 1) return startDate
  let d = new Date(startDate), added = 0
  while (added < workDays - 1) {
    d.setDate(d.getDate() + 1)
    if (isWorkingDay(d, exceptions, includeSat, includeSun)) added++
  }
  return d
}

// Parse a date string or Date to local midnight (avoids UTC-offset off-by-one)
function toLocalDate(s) {
  if (!s) return null
  if (s instanceof Date) return s
  return new Date(s + 'T00:00:00')
}

function countWorkDays(start, end, exceptions = [], includeSat = false, includeSun = false) {
  if (!start || !end) return 0
  let d = toLocalDate(start), e = toLocalDate(end), count = 0
  while (d <= e) {
    if (isWorkingDay(d, exceptions, includeSat, includeSun)) count++
    d.setDate(d.getDate() + 1)
  }
  return count
}

// Returns true if a calendar cell should be shaded as a non-work day (for display)
function isCellException(date, exceptions) {
  if (!date) return false
  const dow = date.getDay()
  if (dow === 0 || dow === 6) return true   // weekends always shaded by default
  const ds = dateStr(date)
  return exceptions.some(ex => {
    if (ex.type === 'day_of_week') return ex.day_of_week === dow
    if (ex.type === 'specific_date') {
      const end = ex.exception_date_end || ex.exception_date
      return ds >= ex.exception_date && ds <= end
    }
    return false
  })
}

function fmtDate(ds) {
  return new Date(ds + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const EMPTY_FORM = {
  title: '', display_color: '#15803d', assignee_color: '', assignees: '',
  start_date: '', end_date: '', work_days: '', progress: 0, reminder: 'None', notes: '',
  crew_id: '', sub_id: '',
  include_saturday: false, include_sunday: false,
}

const DOW_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

// ── WeekRow: renders one 7-day row with spanning item bars ───
// Bars skip over exception days — rendered as multiple segments
// so gaps appear on weekends / holidays instead of solid spans.
function WeekRow({ weekDays, year, month, items, selectedJob, jobMap, todayStr, onDayClick, onItemClick, exceptions = [] }) {
  const weekDates = weekDays.map(day => day ? new Date(year, month, day) : null)
  const validDates = weekDates.filter(Boolean)
  if (validDates.length === 0) return null

  const weekMinMs = Math.min(...validDates.map(d => d.getTime()))
  const weekMaxMs = Math.max(...validDates.map(d => d.getTime()))

  const weekItems = items
    .filter(item => {
      const s = new Date(item.start_date + 'T00:00:00').getTime()
      const e = new Date(item.end_date   + 'T00:00:00').getTime()
      return s <= weekMaxMs && e >= weekMinMs
    })
    .sort((a, b) => (a.title || '').localeCompare(b.title || ''))

  const itemInfo = {}
  const laneRanges = []

  weekItems.forEach(item => {
    const iStart = new Date(item.start_date + 'T00:00:00')
    const iEnd   = new Date(item.end_date   + 'T00:00:00')
    const incSat = item.include_saturday || false
    const incSun = item.include_sunday   || false

    // Build contiguous working-day segments within this week row.
    // Exception days (and non-working days) break the bar — no rendering on those cols.
    const segments = []
    let segStart = -1, lastWorkingCol = -1

    weekDates.forEach((date, col) => {
      if (!date) {
        if (segStart !== -1) { segments.push({ startCol: segStart, endCol: lastWorkingCol }); segStart = -1 }
        return
      }
      const inRange   = date >= iStart && date <= iEnd
      const isWorking = inRange && isWorkingDay(date, exceptions, incSat, incSun)
      if (isWorking) {
        if (segStart === -1) segStart = col
        lastWorkingCol = col
      } else {
        if (segStart !== -1) { segments.push({ startCol: segStart, endCol: lastWorkingCol }); segStart = -1 }
      }
    })
    if (segStart !== -1) segments.push({ startCol: segStart, endCol: lastWorkingCol })
    if (segments.length === 0) return

    // Use overall first→last col for lane conflict detection
    const overallStart = segments[0].startCol
    const overallEnd   = segments[segments.length - 1].endCol

    let lane = 0
    while (true) {
      const occupied = laneRanges[lane] || []
      const conflict = occupied.some(r => !(overallEnd < r.s || overallStart > r.e))
      if (!conflict) {
        if (!laneRanges[lane]) laneRanges[lane] = []
        laneRanges[lane].push({ s: overallStart, e: overallEnd })
        break
      }
      lane++
    }

    // isItemStart/End: does this week's first/last segment touch the item's actual start/end date?
    const firstSegDate = weekDates[segments[0].startCol]
    const lastSegDate  = weekDates[segments[segments.length - 1].endCol]
    itemInfo[item.id] = {
      segments,
      lane,
      isItemStart: firstSegDate && firstSegDate.getTime() === iStart.getTime(),
      isItemEnd:   lastSegDate  && lastSegDate.getTime()  === iEnd.getTime(),
    }
  })

  return (
    <div className="relative border-b border-gray-200">

      {/* ── Layer 1: day cell backgrounds + click targets (absolute, fills full row height) ── */}
      <div className="absolute inset-0 grid grid-cols-7">
        {weekDays.map((day, col) => {
          const cellDate = day ? new Date(year, month, day) : null
          const isExcept = cellDate ? isCellException(cellDate, exceptions) : false
          return (
            <div
              key={col}
              onClick={() => day && onDayClick(day)}
              className={`border-r border-gray-200
                ${!day     ? 'bg-white cursor-default'
                : isExcept ? 'bg-gray-100 cursor-pointer'
                :             'bg-white hover:bg-green-50 cursor-pointer'}`}
            />
          )
        })}
      </div>

      {/* ── Layer 2: day number headers (normal flow — sets the top DAY_H px of the row) ── */}
      <div className="relative grid grid-cols-7 pointer-events-none" style={{ height: DAY_H }}>
        {weekDays.map((day, col) => {
          const ds = day
            ? `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
            : null
          const isToday = ds === todayStr
          return (
            <div key={col} className="pt-1 px-1">
              {day && (
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-medium
                  ${isToday ? 'bg-green-700 text-white' : 'text-gray-500'}`}>
                  {day}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Layer 3: bars — CSS grid, rows auto-size so every bar is fully visible ── */}
      <div
        className="relative pointer-events-none"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gridAutoRows: 'minmax(30px, auto)',
          rowGap: '3px',
          paddingBottom: '10px',
        }}
      >
        {weekItems.flatMap(item => {
          const info = itemInfo[item.id]
          if (!info) return []
          const { segments, lane, isItemStart, isItemEnd } = info

          const clientName  = jobMap[item.job_id] || ''
          const displayText = clientName ? `${item.title} (${clientName})` : item.title

          return segments.map((seg, segIdx) => {
            const isFirst = segIdx === 0
            const isLast  = segIdx === segments.length - 1

            const roundLeft  = isFirst && isItemStart
            const roundRight = isLast  && isItemEnd
            const radius = roundLeft && roundRight ? '4px'
              : roundLeft  ? '4px 0 0 4px'
              : roundRight ? '0 4px 4px 0'
              : '0'

            return (
              <div
                key={`${item.id}-s${segIdx}`}
                onClick={e => { e.stopPropagation(); onItemClick(e, item) }}
                style={{
                  gridRow:         lane + 1,
                  gridColumn:      `${seg.startCol + 1} / ${seg.endCol + 2}`,
                  backgroundColor: item.needs_crew ? '#b45309' : item.display_color,
                  backgroundImage: item.needs_crew
                    ? 'repeating-linear-gradient(45deg,rgba(0,0,0,0.12),rgba(0,0,0,0.12) 3px,transparent 3px,transparent 10px)'
                    : 'none',
                  borderRadius:    radius,
                  margin:          '0 3px',
                  minHeight:       24,
                  pointerEvents:   'auto',
                  alignSelf:       'stretch',
                  border:          item.needs_crew ? '2px dashed rgba(255,200,0,0.6)' : 'none',
                }}
                className="flex items-start gap-1.5 px-2 pt-1.5 pb-1.5 text-white text-sm font-semibold cursor-pointer hover:opacity-80 leading-snug"
                title={item.needs_crew ? `${displayText} — Crew not assigned` : displayText}
              >
                {isFirst && (
                  <>
                    {item.needs_crew
                      ? null
                      : item.assignee_color
                        ? <span className="flex-shrink-0 w-4 h-4 rounded-full border border-white/50 mt-0.5"
                                style={{ backgroundColor: item.assignee_color }} />
                        : null
                    }
                    <span className="min-w-0 break-words">
                      {displayText}
                      {item.needs_crew && <span className="ml-1 font-normal text-yellow-200 text-[10px]">— Assign Crew</span>}
                    </span>
                  </>
                )}
              </div>
            )
          })
        })}
      </div>

    </div>
  )
}

// ── Mobile schedule item card ────────────────────────────────
function MobileScheduleCard({ item, jobName, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl p-4 shadow-sm active:bg-gray-50 cursor-pointer ${
        item.needs_crew ? 'border-2 border-amber-400 bg-amber-50' : 'border border-gray-200'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-1.5 self-stretch rounded-full flex-shrink-0"
          style={{ backgroundColor: item.needs_crew ? '#b45309' : (item.display_color || '#15803d'), minHeight: 40 }}
        />
        <div className="flex-1 min-w-0">
          {item.needs_crew && (
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide mb-0.5">Crew Not Assigned</p>
          )}
          <p className="font-semibold text-gray-900 text-sm leading-tight">{item.title}</p>
          {jobName && (
            <p className="text-xs text-purple-600 mt-0.5 font-medium">{jobName}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            {fmtDate(item.start_date)}
            {item.start_date !== item.end_date && <> – {fmtDate(item.end_date)}</>}
            {item.work_days > 0 && <span className="text-gray-400"> · {item.work_days} day{item.work_days !== 1 ? 's' : ''}</span>}
          </p>
          {item.assignees && (
            <p className="text-xs text-gray-400 mt-0.5">👤 {item.assignees}</p>
          )}
          {item.progress > 0 && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] text-gray-400">Progress</span>
                <span className="text-[10px] font-semibold text-gray-600">{item.progress}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-1.5 rounded-full"
                  style={{ width: `${item.progress}%`, backgroundColor: item.display_color || '#15803d' }}
                />
              </div>
            </div>
          )}
        </div>
        <svg className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  )
}

// ── Main calendar component ──────────────────────────────────
// ── Searchable picker used for both Crew and Sub selection ───────────────────
function CrewSubPicker({ label, emptyMsg, options, selectedId, onSelect }) {
  const [search, setSearch] = useState('')
  const [open,   setOpen]   = useState(false)

  const filtered = options.filter(o =>
    !search || o.searchText.includes(search.toLowerCase()) ||
    o.primary.toLowerCase().includes(search.toLowerCase())
  )

  const selected = options.find(o => o.id === selectedId)

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</p>
      {options.length === 0 ? (
        <p className="text-sm text-gray-400 italic py-3 text-center">{emptyMsg}</p>
      ) : (
        <div className="relative">
          <input
            type="text"
            value={search || (selected && !open ? selected.primary : '')}
            onChange={e => { setSearch(e.target.value); setOpen(true) }}
            onFocus={() => { setSearch(''); setOpen(true) }}
            onBlur={() => setTimeout(() => setOpen(false), 200)}
            placeholder={`Search ${label.toLowerCase()}…`}
            className="input text-sm w-full"
          />
          {selected && !open && (
            <div className="mt-1.5 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-semibold text-green-800">{selected.primary}</p>
              {selected.secondary && <p className="text-xs text-gray-500 mt-0.5">{selected.secondary}</p>}
            </div>
          )}
          {open && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-sm text-gray-400 px-4 py-3 italic">No results match "{search}"</p>
              ) : filtered.map(opt => (
                <button key={opt.id}
                  onMouseDown={() => { onSelect(opt); setSearch(''); setOpen(false) }}
                  className={`w-full text-left px-4 py-2.5 hover:bg-green-50 border-b border-gray-50 last:border-0 transition-colors ${selectedId === opt.id ? 'bg-green-50' : ''}`}>
                  <p className={`text-sm font-semibold ${selectedId === opt.id ? 'text-green-800' : 'text-gray-800'}`}>
                    {opt.primary}
                  </p>
                  {opt.secondary && <p className="text-xs text-gray-400 mt-0.5 truncate">{opt.secondary}</p>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── US Holiday helpers ────────────────────────────────────────
function findNthWeekday(year, month, weekday, nth) {
  let d = new Date(year, month, 1), count = 0
  while (d.getMonth() === month) {
    if (d.getDay() === weekday && ++count === nth) return new Date(d)
    d.setDate(d.getDate() + 1)
  }
  return null
}
function findLastWeekday(year, month, weekday) {
  let d = new Date(year, month + 1, 0)
  while (d.getDay() !== weekday) d.setDate(d.getDate() - 1)
  return new Date(d)
}
const US_HOLIDAYS = [
  { name: "New Year's Day",         getDate: y => new Date(y, 0, 1) },
  { name: 'Martin Luther King Day', getDate: y => findNthWeekday(y, 0, 1, 3) },
  { name: "Presidents' Day",        getDate: y => findNthWeekday(y, 1, 1, 3) },
  { name: 'Memorial Day',           getDate: y => findLastWeekday(y, 4, 1) },
  { name: 'Juneteenth',             getDate: y => new Date(y, 5, 19) },
  { name: 'Independence Day',       getDate: y => new Date(y, 6, 4) },
  { name: 'Labor Day',              getDate: y => findNthWeekday(y, 8, 1, 1) },
  { name: 'Columbus Day',           getDate: y => findNthWeekday(y, 9, 1, 2) },
  { name: 'Veterans Day',           getDate: y => new Date(y, 10, 11) },
  { name: 'Thanksgiving',           getDate: y => findNthWeekday(y, 10, 4, 4) },
  { name: 'Christmas Day',          getDate: y => new Date(y, 11, 25) },
]
const NON_RECOGNIZED_HOLIDAYS = [
  { name: "Christmas Eve",  getDate: y => new Date(y, 11, 24) },
  { name: "New Year's Eve", getDate: y => new Date(y, 11, 31) },
]

// ── Workday Exceptions Modal ──────────────────────────────────
function WorkdayExceptionsModal({ exceptions, onAdd, onDelete, onClose, recalculating }) {
  const [type,            setType]            = useState('day_of_week')
  const [dayOfWeek,       setDayOfWeek]       = useState(1)
  const [dateStart,       setDateStart]       = useState('')
  const [dateEnd,         setDateEnd]         = useState('')
  const [label,           setLabel]           = useState('')
  const [saving,          setSaving]          = useState(false)
  const [togglingHoliday, setTogglingHoliday] = useState(null)

  const curYear = new Date().getFullYear()

  function isHolidayActive(name) {
    return exceptions.some(e => e.type === 'specific_date' && e.label === name)
  }

  async function toggleHoliday(holiday) {
    const active = isHolidayActive(holiday.name)
    setTogglingHoliday(holiday.name)
    if (active) {
      const toRemove = exceptions.filter(e => e.type === 'specific_date' && e.label === holiday.name)
      for (const ex of toRemove) await onDelete(ex.id)
    } else {
      for (let y = curYear; y <= curYear + 2; y++) {
        const d = holiday.getDate(y)
        if (d) await onAdd({
          type:               'specific_date',
          day_of_week:        null,
          exception_date:     dateStr(d),
          exception_date_end: null,
          label:              holiday.name,
        })
      }
    }
    setTogglingHoliday(null)
  }

  async function handleAdd() {
    if (type === 'specific_date' && !dateStart) return
    setSaving(true)
    await onAdd({
      type,
      day_of_week:        type === 'day_of_week'   ? +dayOfWeek  : null,
      exception_date:     type === 'specific_date' ? dateStart    : null,
      exception_date_end: type === 'specific_date' && dateEnd && dateEnd > dateStart ? dateEnd : null,
      label: label.trim() || null,
    })
    setSaving(false)
    setDateStart(''); setDateEnd(''); setLabel('')
  }

  const recurring = exceptions.filter(e => e.type === 'day_of_week')
  const specific  = exceptions.filter(e => e.type === 'specific_date')

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col" style={{ maxHeight: '92vh' }}>

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-base font-bold text-gray-800">Workday Exceptions</h3>
            <p className="text-xs text-gray-400 mt-0.5">Days that are greyed out and skipped in scheduling</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-4">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Info note */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5 text-xs text-blue-700">
            Saturday and Sunday are excluded by default. You can override them per schedule item using the "Include Saturdays / Sundays" toggle in each item's details.
          </div>

          {/* Add form */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Add Exception</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                <select value={type} onChange={e => setType(e.target.value)} className="input text-sm w-full">
                  <option value="day_of_week">Recurring Day</option>
                  <option value="specific_date">Specific Date</option>
                </select>
              </div>
              {type === 'day_of_week' ? (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Day of Week</label>
                  <select value={dayOfWeek} onChange={e => setDayOfWeek(+e.target.value)} className="input text-sm w-full">
                    {DOW_NAMES.map((n, i) => <option key={i} value={i}>{n}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                  <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className="input text-sm w-full" />
                </div>
              )}
            </div>

            {type === 'specific_date' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  End Date <span className="text-gray-400 font-normal">(optional — leave blank for single day)</span>
                </label>
                <input type="date" value={dateEnd} min={dateStart}
                  onChange={e => setDateEnd(e.target.value)} className="input text-sm w-full" />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Label <span className="text-gray-400 font-normal">(optional)</span></label>
              <input type="text" value={label} onChange={e => setLabel(e.target.value)}
                placeholder="e.g. Holiday, Company day off…" className="input text-sm w-full" />
            </div>

            <div className="flex items-center gap-3">
              <button onClick={handleAdd} disabled={saving || (type === 'specific_date' && !dateStart)}
                className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
                {saving ? 'Adding…' : 'Add Exception'}
              </button>
              {recalculating && (
                <span className="text-xs text-gray-400 flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  Updating schedule items…
                </span>
              )}
            </div>
          </div>

          {/* Recurring exceptions */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recurring Days</p>
            {recurring.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-2">None added — Sat & Sun are always excluded by default.</p>
            ) : (
              <div className="space-y-1.5">
                {recurring.map(ex => (
                  <div key={ex.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Every {DOW_NAMES[ex.day_of_week]}</p>
                      {ex.label && <p className="text-xs text-gray-500">{ex.label}</p>}
                    </div>
                    <button onClick={() => onDelete(ex.id)} className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* US National Holidays */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">🇺🇸 US National Holidays</p>
              <span className="text-xs text-gray-400">{curYear}–{curYear + 2}</span>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Select holidays to block them out on the calendar. Each checked holiday is added as an exception for {curYear}, {curYear + 1}, and {curYear + 2}.
            </p>
            <div className="rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
              {US_HOLIDAYS.map(holiday => {
                const active   = isHolidayActive(holiday.name)
                const toggling = togglingHoliday === holiday.name
                const d        = holiday.getDate(curYear)
                return (
                  <label
                    key={holiday.name}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                      active   ? 'bg-red-50'
                      : toggling ? 'bg-gray-50 opacity-60'
                      : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      disabled={!!togglingHoliday || recalculating}
                      onChange={() => toggleHoliday(holiday)}
                      className="w-4 h-4 flex-shrink-0 accent-red-600"
                    />
                    <span className={`flex-1 text-sm font-medium ${active ? 'text-red-700' : 'text-gray-700'}`}>
                      {holiday.name}
                    </span>
                    <span className="text-xs text-gray-400 flex-shrink-0 tabular-nums">
                      {d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                    </span>
                    {toggling && (
                      <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin flex-shrink-0" />
                    )}
                  </label>
                )
              })}
            </div>
          </div>

          {/* Non-Recognized Holidays */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">🎄 Other Common Closures</p>
              <span className="text-xs text-gray-400">{curYear}–{curYear + 2}</span>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Commonly observed but not federally recognized. Added as exceptions for {curYear}, {curYear + 1}, and {curYear + 2}.
            </p>
            <div className="rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
              {NON_RECOGNIZED_HOLIDAYS.map(holiday => {
                const active   = isHolidayActive(holiday.name)
                const toggling = togglingHoliday === holiday.name
                const d        = holiday.getDate(curYear)
                return (
                  <label
                    key={holiday.name}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                      active   ? 'bg-orange-50'
                      : toggling ? 'bg-gray-50 opacity-60'
                      : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      disabled={!!togglingHoliday || recalculating}
                      onChange={() => toggleHoliday(holiday)}
                      className="w-4 h-4 flex-shrink-0 accent-orange-500"
                    />
                    <span className={`flex-1 text-sm font-medium ${active ? 'text-orange-700' : 'text-gray-700'}`}>
                      {holiday.name}
                    </span>
                    <span className="text-xs text-gray-400 flex-shrink-0 tabular-nums">
                      {d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                    </span>
                    {toggling && (
                      <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin flex-shrink-0" />
                    )}
                  </label>
                )
              })}
            </div>
          </div>

          {/* Specific date exceptions */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Specific Dates</p>
            {specific.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-2">No specific dates added.</p>
            ) : (
              <div className="space-y-1.5">
                {specific.map(ex => (
                  <div key={ex.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {ex.exception_date_end
                          ? `${fmtDate(ex.exception_date)} – ${fmtDate(ex.exception_date_end)}`
                          : fmtDate(ex.exception_date)}
                      </p>
                      {ex.label && <p className="text-xs text-gray-500">{ex.label}</p>}
                    </div>
                    <button onClick={() => onDelete(ex.id)} className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </ModalOverlay>
  )
}

export default function ScheduleCalendar({ jobs = [], selectedJob, showExceptionsExternal, onSetShowExceptions, onExceptionsLoaded, addScheduleTrigger = 0 }) {
  const today = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  const [phase,       setPhase]       = useState(null)
  const [clickedDate, setClickedDate] = useState(null)
  const [editItem,    setEditItem]    = useState(null)
  const [form,        setForm]        = useState(EMPTY_FORM)
  const [modalJobId,  setModalJobId]  = useState(null)
  const [saving,      setSaving]      = useState(false)
  const [entryMode,          setEntryMode]          = useState('crew')
  const [crews,              setCrews]              = useState([])
  const [employees,          setEmployees]          = useState([])
  const [subs,               setSubs]               = useState([])
  const [defaultSchedColor,  setDefaultSchedColor]  = useState('#15803d')
  const [exceptions,         setExceptions]         = useState([])
  const [localShowExceptions, setLocalShowExceptions] = useState(false)
  const [recalculating,      setRecalculating]      = useState(false)

  // ── Work Order scheduling state ───────────────────────────────
  const [schedType,    setSchedType]    = useState(null)    // 'crew_type' | 'work_order'
  const [workOrders,     setWorkOrders]     = useState([])
  const [scheduledWOIds, setScheduledWOIds] = useState(new Set()) // WO IDs already on the calendar
  const [selectedWOs,    setSelectedWOs]    = useState(new Set())
  // Per-WO crew assignment: { [woId]: { mode: 'crew'|'sub'|'none', crewId: string, subId: string } }
  const [woAssignments, setWoAssignments] = useState({})
  const [woStartDate,  setWoStartDate]  = useState('')
  const [woLoading,    setWoLoading]    = useState(false)
  const [woSaving,     setWoSaving]     = useState(false)

  // Support controlled (from parent sidebar button) or uncontrolled mode
  const showExceptions    = showExceptionsExternal !== undefined ? showExceptionsExternal : localShowExceptions
  const setShowExceptions = onSetShowExceptions    !== undefined ? onSetShowExceptions    : setLocalShowExceptions

  // crew color lookup: { crewId: hexColor }
  const crewColorMap = Object.fromEntries(crews.map(c => [c.id, c.color || '#15803d']))

  // Returns number of people in a crew (default 3 if unknown)
  function getCrewSize(crewId) {
    const crew = crews.find(c => c.id === crewId)
    if (!crew) return 3
    return [crew.crew_chief_id, crew.journeyman_id, crew.laborer_1_id, crew.laborer_2_id, crew.laborer_3_id]
      .filter(Boolean).length || 3
  }

  // Calendar days = ceil(totalManDays / crewSize). No crew → default 3 men.
  function calcScheduleDays(totalManDays, crewId) {
    const size = crewId ? getCrewSize(crewId) : 3
    return Math.max(1, Math.ceil(totalManDays / size))
  }

  async function fetchPendingWOs(jobId) {
    setWoLoading(true)

    // Fetch work orders and existing schedule items in parallel
    const [woRes, schedRes] = await Promise.all([
      supabase.from('work_orders').select('*').eq('job_id', jobId).in('status', ['pending', 'in_progress']).order('module_type'),
      supabase.from('schedule_items').select('work_order_ids').eq('job_id', jobId).eq('scheduling_type', 'work_order'),
    ])

    // Build the set of already-scheduled WO IDs from all schedule items for this job
    const alreadyScheduled = new Set(
      (schedRes.data || []).flatMap(item => item.work_order_ids || [])
    )
    setScheduledWOIds(alreadyScheduled)
    setWorkOrders(woRes.data || [])
    setWoLoading(false)
  }

  // Fetch crews, employees, subs, default color, and workday exceptions on mount
  useEffect(() => {
    supabase.from('crews').select('*').order('label')
      .then(({ data }) => { if (data) setCrews(data) })
    supabase.from('employees').select('id, first_name, last_name, nickname')
      .eq('status', 'active').order('last_name')
      .then(({ data }) => { if (data) setEmployees(data) })
    supabase.from('subs_vendors').select('id, company_name, divisions, status')
      .eq('type', 'sub').order('company_name')
      .then(({ data }) => { if (data) setSubs(data) })
    supabase.from('company_settings').select('value').eq('key', 'default_schedule_color').single()
      .then(({ data }) => { if (data?.value) setDefaultSchedColor(data.value) })
    fetchExceptions()
  }, [])

  async function fetchExceptions() {
    const { data } = await supabase.from('workday_exceptions').select('*').order('created_at')
    if (data) {
      setExceptions(data)
      onExceptionsLoaded?.(data.length)
    }
  }

  async function recalculateScheduleItems(updatedExceptions) {
    setRecalculating(true)
    const { data: allItems } = await supabase.from('schedule_items').select('*')
    if (!allItems) { setRecalculating(false); return }

    const updates = allItems
      .map(item => {
        if (!item.start_date || !item.work_days) return null
        const newEnd = dateStr(addWorkDays(
          new Date(item.start_date + 'T00:00:00'),
          item.work_days,
          updatedExceptions,
          item.include_saturday || false,
          item.include_sunday   || false,
        ))
        return newEnd !== item.end_date ? { id: item.id, end_date: newEnd } : null
      })
      .filter(Boolean)

    await Promise.all(updates.map(u =>
      supabase.from('schedule_items').update({ end_date: u.end_date }).eq('id', u.id)
    ))
    setRecalculating(false)
    fetchItems()
  }

  async function addException(payload) {
    const { data } = await supabase.from('workday_exceptions').insert(payload).select().single()
    if (data) {
      const updated = [...exceptions, data]
      setExceptions(updated)
      onExceptionsLoaded?.(updated.length)
      recalculateScheduleItems(updated)
    }
  }

  async function deleteException(id) {
    await supabase.from('workday_exceptions').delete().eq('id', id)
    const updated = exceptions.filter(e => e.id !== id)
    setExceptions(updated)
    onExceptionsLoaded?.(updated.length)
    recalculateScheduleItems(updated)
  }

  useEffect(() => { fetchItems() }, [year, month, selectedJob])

  async function fetchItems() {
    setLoading(true)
    const startOf = `${year}-${String(month+1).padStart(2,'0')}-01`
    const endOf   = `${year}-${String(month+1).padStart(2,'0')}-${String(daysInMonth(year, month)).padStart(2,'0')}`

    let q = supabase
      .from('schedule_items')
      .select('*')
      .lte('start_date', endOf)
      .gte('end_date',   startOf)
      .order('start_date')

    if (selectedJob !== 'all') q = q.eq('job_id', selectedJob)

    const { data, error } = await q
    if (error) console.error('schedule fetch:', error)
    if (data)  setItems(data)
    setLoading(false)
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  function handleDayClick(day) {
    const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    setClickedDate(ds)
    setWoStartDate(ds)
    setForm({ ...EMPTY_FORM, display_color: defaultSchedColor, start_date: ds, end_date: ds, work_days: 1 })
    setEditItem(null)
    if (selectedJob === 'all') {
      setModalJobId(null); setPhase('job-select')
    } else {
      setModalJobId(selectedJob); setPhase('type-select')
    }
  }

  function handleAddNew() {
    const ds = dateStr(today)
    setClickedDate(ds)
    setWoStartDate(ds)
    setForm({ ...EMPTY_FORM, display_color: defaultSchedColor, start_date: ds, end_date: ds, work_days: 1 })
    setEditItem(null)
    if (selectedJob === 'all') {
      setModalJobId(null); setPhase('job-select')
    } else {
      setModalJobId(selectedJob); setPhase('type-select')
    }
  }

  // Respond to external "Add Schedule" button in parent sidebar
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (addScheduleTrigger > 0) handleAddNew() }, [addScheduleTrigger])

  function handleItemClick(e, item) {
    if (e) e.stopPropagation()
    setEditItem(item)
    setModalJobId(item.job_id)
    // For needs_crew WO items: default to Crew entry so user can immediately assign one
    const mode = item.needs_crew ? 'crew' : item.crew_id ? 'crew' : item.sub_id ? 'sub' : 'custom'
    setEntryMode(mode)
    setForm({
      title:          item.title          || '',
      display_color:  item.display_color  || defaultSchedColor,
      assignee_color: item.assignee_color || '',
      assignees:      item.assignees      || '',
      start_date:     item.start_date     || '',
      end_date:       item.end_date       || '',
      work_days:      item.work_days      ?? '',
      progress:       item.progress       ?? 0,
      reminder:       item.reminder       || 'None',
      notes:          item.notes          || '',
      crew_id:          item.crew_id          || '',
      sub_id:           item.sub_id           || '',
      include_saturday: item.include_saturday || false,
      include_sunday:   item.include_sunday   || false,
    })
    setPhase('details')
  }

  function closeModal() {
    setPhase(null); setEditItem(null); setForm(EMPTY_FORM); setModalJobId(null); setEntryMode('crew')
    setSchedType(null); setWorkOrders([]); setSelectedWOs(new Set())
    setWoAssignments({}); setWoStartDate('')
  }

  function updateField(key, val) {
    setForm(prev => {
      const next = { ...prev, [key]: val }
      const excs   = exceptions
      const incSat = key === 'include_saturday' ? val : next.include_saturday
      const incSun = key === 'include_sunday'   ? val : next.include_sunday
      if ((key === 'start_date' || key === 'include_saturday' || key === 'include_sunday') && next.work_days && +next.work_days > 0 && next.start_date) {
        next.end_date = dateStr(addWorkDays(toLocalDate(next.start_date), +next.work_days, excs, incSat, incSun))
      }
      if (key === 'work_days' && next.start_date && +val > 0) {
        next.end_date = dateStr(addWorkDays(toLocalDate(next.start_date), +val, excs, incSat, incSun))
      }
      if (key === 'end_date' && next.start_date) {
        next.work_days = countWorkDays(next.start_date, val, excs, incSat, incSun)
      }
      return next
    })
  }

  async function saveItem() {
    if (!form.title.trim()) return
    setSaving(true)
    const payload = {
      job_id:        modalJobId,
      title:         form.title.trim(),
      display_color: form.display_color,
      assignees:     form.assignees,
      start_date:    form.start_date,
      end_date:      form.end_date || form.start_date,
      work_days:     +form.work_days || 1,
      progress:      +form.progress  || 0,
      reminder:      form.reminder,
      notes:         form.notes,
      crew_id:          entryMode === 'crew' ? (form.crew_id || null) : null,
      sub_id:           entryMode === 'sub'  ? (form.sub_id  || null) : null,
      assignee_color:   form.assignee_color || null,
      include_saturday: form.include_saturday || false,
      include_sunday:   form.include_sunday   || false,
      // Clear needs_crew when a crew or sub is assigned on edit
      needs_crew: editItem?.needs_crew
        ? !(form.crew_id || form.sub_id)
        : (editItem?.needs_crew ?? false),
    }
    const { error } = editItem
      ? await supabase.from('schedule_items').update(payload).eq('id', editItem.id)
      : await supabase.from('schedule_items').insert(payload)
    if (error) { console.error(error); setSaving(false); return }
    setSaving(false); closeModal(); fetchItems()
  }

  async function deleteItem() {
    if (!editItem || !confirm(`Delete "${editItem.title}"?`)) return
    await supabase.from('schedule_items').delete().eq('id', editItem.id)
    closeModal(); fetchItems()
  }

  async function saveWorkOrderSchedule() {
    const selWOs = workOrders.filter(w => selectedWOs.has(w.id))
    if (selWOs.length === 0 || !woStartDate || !modalJobId) return

    setWoSaving(true)

    // Build one schedule_item per selected WO, each with its own crew
    const schedulePayloads = selWOs.map(wo => {
      const asgn     = woAssignments[wo.id] || { mode: 'none', crewId: '', subId: '' }
      const manDays  = parseFloat(wo.man_days || 0) || 1
      const crewId   = asgn.mode === 'crew' ? asgn.crewId : null
      const subId    = asgn.mode === 'sub'  ? asgn.subId  : null
      const needsCrew = asgn.mode === 'none'
      const workDays = calcScheduleDays(manDays, crewId)
      const endDate  = dateStr(addWorkDays(toLocalDate(woStartDate), workDays, exceptions, false, false))

      const crew = crews.find(c => c.id === crewId)
      const sub  = subs.find(s => s.id === subId)

      let title = wo.module_type
      if (asgn.mode === 'crew' && crew) title = `Crew ${crew.label} — ${wo.module_type}`
      else if (asgn.mode === 'sub' && sub) title = `${sub.company_name} — ${wo.module_type}`

      return {
        job_id:           modalJobId,
        title,
        display_color:    defaultSchedColor,
        assignee_color:   asgn.mode === 'crew' ? (crewColorMap[crewId] || null)
                        : asgn.mode === 'sub'  ? '#000000'
                        : null,
        assignees:        '',
        start_date:       woStartDate,
        end_date:         endDate,
        work_days:        workDays,
        progress:         0,
        reminder:         'None',
        notes:            `${manDays.toFixed(1)} man-days`,
        crew_id:          crewId || null,
        sub_id:           subId  || null,
        include_saturday: false,
        include_sunday:   false,
        scheduling_type:  'work_order',
        work_order_ids:   [wo.id],
        needs_crew:       needsCrew,
      }
    })

    // Insert all schedule items
    const { error: schedErr } = await supabase.from('schedule_items').insert(schedulePayloads)
    if (schedErr) { console.error('WO schedule save:', schedErr); setWoSaving(false); return }

    // Stamp each work_order with its scheduled crew/sub
    await Promise.all(selWOs.map(wo => {
      const asgn = woAssignments[wo.id] || { mode: 'none', crewId: '', subId: '' }
      return supabase.from('work_orders').update({
        scheduled_crew_id: asgn.mode === 'crew' ? (asgn.crewId || null) : null,
        scheduled_sub_id:  asgn.mode === 'sub'  ? (asgn.subId  || null) : null,
      }).eq('id', wo.id)
    }))

    setWoSaving(false)
    closeModal()
    fetchItems()
  }

  // Build week rows (desktop only)
  const firstDay = firstDayOfMonth(year, month)
  const numDays  = daysInMonth(year, month)
  const cells    = Array.from({ length: firstDay + numDays }, (_, i) => i < firstDay ? null : i - firstDay + 1)
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  const jobMap   = Object.fromEntries(jobs.map(j => [j.id, j.name || j.client_name]))
  const todayStr = dateStr(today)

  // Month navigation header (shared between mobile and desktop)
  const MonthNav = () => (
    <div className="flex items-center justify-between mb-3">
      <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h3 className="text-sm font-bold text-gray-800">{MONTH_NAMES[month]} {year}</h3>
      <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )

  return (
    <div className="flex flex-col select-none">

      {/* ══════════════════════════════════════════════════════
          MOBILE VIEW — hidden on lg+ screens
      ══════════════════════════════════════════════════════ */}
      <div className="lg:hidden flex flex-col">
        <MonthNav />

        {/* Add button */}
        <button
          onClick={handleAddNew}
          className="w-full flex items-center justify-center gap-2 py-3 mb-4 rounded-xl border-2 border-dashed border-green-300 text-green-700 font-medium text-sm hover:bg-green-50 active:bg-green-100 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Schedule Item
        </button>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-700" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <p className="text-4xl mb-3">📅</p>
            <p className="text-sm font-medium text-gray-500">No items this month</p>
            <p className="text-xs mt-1 text-gray-400">Tap above to add a schedule item</p>
          </div>
        ) : (
          <div className="space-y-3 pb-4">
            {items.map(item => (
              <MobileScheduleCard
                key={item.id}
                item={item}
                jobName={selectedJob === 'all' ? jobMap[item.job_id] : null}
                onClick={() => handleItemClick(null, item)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          DESKTOP VIEW — hidden on mobile, shown on lg+
      ══════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:flex-col">

        {/* Month navigation + day headers — sticky */}
        <div className="sticky top-0 z-10 bg-white pb-0">
          <div className="flex items-center justify-between mb-2 gap-2">
            <button onClick={prevMonth} className="p-1.5 rounded hover:bg-gray-100 text-gray-600 flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h3 className="text-sm font-bold text-gray-800">{MONTH_NAMES[month]} {year}</h3>
            <button onClick={nextMonth} className="p-1.5 rounded hover:bg-gray-100 text-gray-600 flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 border-l border-t border-gray-200">
            {DAY_NAMES.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1.5 border-r border-b border-gray-200 bg-white">
                {d}
              </div>
            ))}
          </div>
        </div>

        {/* Week rows */}
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-700" />
          </div>
        ) : (
          <div className="border-l border-gray-200">
            {weeks.map((weekDays, idx) => (
              <WeekRow
                key={idx}
                weekDays={weekDays}
                year={year}
                month={month}
                items={items}
                selectedJob={selectedJob}
                jobMap={jobMap}
                todayStr={todayStr}
                onDayClick={handleDayClick}
                onItemClick={handleItemClick}
                exceptions={exceptions}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Modals (shared by both mobile and desktop) ────────── */}

      {/* Workday Exceptions */}
      {showExceptions && (
        <WorkdayExceptionsModal
          exceptions={exceptions}
          onAdd={addException}
          onDelete={deleteException}
          onClose={() => setShowExceptions(false)}
          recalculating={recalculating}
        />
      )}

      {/* Job Selector */}
      {phase === 'job-select' && (
        <ModalOverlay onClose={closeModal}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-1">Select a Job</h3>
            <p className="text-xs text-gray-400 mb-3">{clickedDate}</p>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {jobs.map(j => (
                <button
                  key={j.id}
                  onClick={() => { setModalJobId(j.id); setPhase('type-select') }}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm hover:bg-green-50 hover:text-green-700 transition-colors text-gray-700 border border-transparent hover:border-green-200"
                >
                  {j.name || j.client_name}
                </button>
              ))}
            </div>
            <button onClick={closeModal} className="mt-3 text-xs text-gray-400 hover:text-gray-600 w-full text-center">Cancel</button>
          </div>
        </ModalOverlay>
      )}

      {/* ── Scheduling Type Selector ──────────────────────────── */}
      {phase === 'type-select' && (
        <ModalOverlay onClose={closeModal}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-0.5">How would you like to schedule?</h3>
            {modalJobId && (
              <p className="text-xs text-green-700 font-medium mb-4">{jobMap[modalJobId]}</p>
            )}
            <div className="space-y-3">
              <button
                onClick={() => { setSchedType('work_order'); fetchPendingWOs(modalJobId); setPhase('wo-select') }}
                className="w-full flex items-start gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 text-left transition-colors group"
              >
                <span className="text-2xl mt-0.5">📋</span>
                <div>
                  <p className="text-sm font-bold text-gray-800 group-hover:text-green-800">Work Order</p>
                  <p className="text-xs text-gray-500 mt-0.5">Schedule by pending work orders. Auto-calculates work days from man-days ÷ crew size.</p>
                </div>
              </button>
              <button
                onClick={() => { setSchedType('crew_type'); setPhase('details') }}
                className="w-full flex items-start gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 text-left transition-colors group"
              >
                <span className="text-2xl mt-0.5">👷</span>
                <div>
                  <p className="text-sm font-bold text-gray-800 group-hover:text-green-800">Crew Type Only</p>
                  <p className="text-xs text-gray-500 mt-0.5">Manually set dates, crew, and details — standard scheduling flow.</p>
                </div>
              </button>
            </div>
            <button onClick={closeModal} className="mt-4 text-xs text-gray-400 hover:text-gray-600 w-full text-center">Cancel</button>
          </div>
        </ModalOverlay>
      )}

      {/* ── Work Order Selection + Per-WO Crew Assignment ───────── */}
      {phase === 'wo-select' && (() => {
        const selWOList = workOrders.filter(w => selectedWOs.has(w.id))
        const totalMD   = selWOList.reduce((s, w) => s + parseFloat(w.man_days || 0), 0)

        // Helper: label for a crew option
        const empName = id => {
          const e = employees.find(em => em.id === id)
          return e ? (e.nickname?.trim() || e.first_name) : null
        }
        const crewOptionLabel = c => {
          const names = [c.crew_chief_id, c.journeyman_id, c.laborer_1_id, c.laborer_2_id, c.laborer_3_id]
            .filter(Boolean).map(empName).filter(Boolean)
          return `Crew ${c.label} — ${names.join(', ')} (${names.length})`
        }

        // Helper: get or default assignment for a WO
        const getAsgn = woId => woAssignments[woId] || { mode: 'none', crewId: '', subId: '' }
        const setAsgn = (woId, patch) => setWoAssignments(prev => ({
          ...prev, [woId]: { ...getAsgn(woId), ...patch }
        }))

        // Per-WO day preview
        const woPreview = selWOList.map(wo => {
          const asgn    = getAsgn(wo.id)
          const md      = parseFloat(wo.man_days || 0) || 1
          const crewId  = asgn.mode === 'crew' ? asgn.crewId : null
          const days    = calcScheduleDays(md, crewId)
          const crewSz  = crewId ? getCrewSize(crewId) : 3
          return { wo, asgn, md, days, crewSz }
        })

        // Summary counts
        const totalDays   = woPreview.reduce((s, p) => s + p.days, 0)
        const needsCrewCt = woPreview.filter(p => p.asgn.mode === 'none').length

        return (
          <ModalOverlay onClose={closeModal}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 flex flex-col" style={{ maxHeight: '94vh' }}>

              {/* Header */}
              <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-gray-800">Schedule by Work Order</h3>
                    {modalJobId && <p className="text-xs text-green-700 font-medium mt-0.5">{jobMap[modalJobId]}</p>}
                  </div>
                  <button onClick={() => setPhase('type-select')} className="text-xs text-gray-400 hover:text-gray-600">← Back</button>
                </div>
              </div>

              <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

                {/* ── Step 1: Select WOs ── */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">1 · Select Work Orders</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setSelectedWOs(new Set(workOrders.filter(w => !scheduledWOIds.has(w.id)).map(w => w.id)))}
                        className="text-xs text-green-700 hover:underline"
                      >Select All</button>
                      {selectedWOs.size > 0 && (
                        <button onClick={() => { setSelectedWOs(new Set()); setWoAssignments({}) }}
                          className="text-xs text-gray-400 hover:underline">Clear</button>
                      )}
                    </div>
                  </div>

                  {woLoading ? (
                    <div className="flex justify-center py-6">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-700" />
                    </div>
                  ) : workOrders.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                      <p className="text-2xl mb-1">📋</p>
                      <p className="text-sm font-medium text-gray-500">No pending work orders</p>
                      <p className="text-xs mt-1">Add work orders in the Work Orders tab first.</p>
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      {workOrders.map((wo, idx) => {
                        const checked    = selectedWOs.has(wo.id)
                        const isScheduled = scheduledWOIds.has(wo.id)
                        return (
                          <div
                            key={wo.id}
                            className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${idx > 0 ? 'border-t border-gray-100' : ''} ${
                              isScheduled
                                ? 'bg-gray-50 opacity-60 cursor-not-allowed'
                                : checked
                                  ? 'bg-green-50 cursor-pointer'
                                  : 'hover:bg-gray-50 cursor-pointer'
                            }`}
                            onClick={() => {
                              if (isScheduled) return
                              setSelectedWOs(prev => {
                                const next = new Set(prev)
                                if (next.has(wo.id)) { next.delete(wo.id); setAsgn(wo.id, { mode: 'none', crewId: '', subId: '' }) }
                                else next.add(wo.id)
                                return next
                              })
                            }}
                          >
                            {isScheduled
                              ? <span className="w-4 h-4 flex-shrink-0 text-gray-400 text-[10px]">✓</span>
                              : <input type="checkbox" readOnly checked={checked} className="w-4 h-4 rounded accent-green-600 flex-shrink-0" />
                            }
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold truncate ${isScheduled ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{wo.module_type}</p>
                              {wo.project_name && <p className="text-xs text-gray-400 truncate">{wo.project_name}</p>}
                              {wo.crew_type && !isScheduled && (
                                <p className="text-[10px] text-purple-600 font-medium mt-0.5">Crew type: {wo.crew_type}</p>
                              )}
                            </div>
                            {isScheduled ? (
                              <span className="flex-shrink-0 text-[10px] font-semibold text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">Scheduled</span>
                            ) : parseFloat(wo.man_days) > 0 ? (
                              <span className="flex-shrink-0 text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                                {parseFloat(wo.man_days).toFixed(1)} MD
                              </span>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {selWOList.length > 0 && (
                    <p className="text-xs text-gray-400 mt-1.5 text-right">
                      {selWOList.length} selected · {totalMD.toFixed(1)} total man-days
                    </p>
                  )}
                </div>

                {/* ── Step 2: Per-WO crew assignment ── */}
                {selWOList.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">2 · Assign Crew per Module</p>
                      {/* Quick-apply: apply one crew to all */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400">Apply to all:</span>
                        <select
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-green-500"
                          defaultValue=""
                          onChange={e => {
                            const val = e.target.value
                            if (!val) return
                            const [mode, id] = val.split(':')
                            selWOList.forEach(wo => setAsgn(wo.id, {
                              mode,
                              crewId: mode === 'crew' ? id : '',
                              subId:  mode === 'sub'  ? id : '',
                            }))
                            e.target.value = ''
                          }}
                        >
                          <option value="">— pick —</option>
                          <optgroup label="Crews">
                            {crews.map(c => <option key={c.id} value={`crew:${c.id}`}>{`Crew ${c.label}`}</option>)}
                          </optgroup>
                          <optgroup label="Subcontractors">
                            {subs.map(s => <option key={s.id} value={`sub:${s.id}`}>{s.company_name}</option>)}
                          </optgroup>
                          <option value="none:">Skip all</option>
                        </select>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      {woPreview.map(({ wo, asgn, md, days, crewSz }, idx) => (
                        <div key={wo.id} className={`px-3 py-3 space-y-2 ${idx > 0 ? 'border-t border-gray-100' : ''}`}>
                          {/* WO header row */}
                          <div className="flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-semibold text-gray-800">{wo.module_type}</span>
                              {wo.crew_type && (
                                <span className="ml-2 text-[10px] font-medium text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                                  {wo.crew_type}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-400 flex-shrink-0">{md.toFixed(1)} MD</span>
                            {woStartDate && (
                              <span className="text-[10px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full flex-shrink-0">
                                {days} day{days !== 1 ? 's' : ''} ({crewSz} men)
                              </span>
                            )}
                          </div>

                          {/* Crew / Sub / None selector row */}
                          <div className="flex gap-1.5 items-center">
                            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-[11px] font-semibold flex-shrink-0">
                              {[
                                { key: 'crew', label: '👷' },
                                { key: 'sub',  label: '🏢' },
                                { key: 'none', label: '—' },
                              ].map(opt => (
                                <button
                                  key={opt.key}
                                  onClick={() => setAsgn(wo.id, { mode: opt.key, crewId: '', subId: '' })}
                                  className={`px-2.5 py-1.5 transition-colors ${asgn.mode === opt.key ? 'bg-green-700 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                                  title={{ crew: 'Assign Crew', sub: 'Assign Sub', none: 'Skip' }[opt.key]}
                                >{opt.label}</button>
                              ))}
                            </div>

                            {asgn.mode === 'crew' && (
                              <select
                                value={asgn.crewId}
                                onChange={e => setAsgn(wo.id, { crewId: e.target.value })}
                                className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-green-500"
                              >
                                <option value="">— Select crew —</option>
                                {crews.map(c => <option key={c.id} value={c.id}>{crewOptionLabel(c)}</option>)}
                              </select>
                            )}
                            {asgn.mode === 'sub' && (
                              <select
                                value={asgn.subId}
                                onChange={e => setAsgn(wo.id, { subId: e.target.value })}
                                className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-green-500"
                              >
                                <option value="">— Select sub —</option>
                                {subs.map(s => <option key={s.id} value={s.id}>{s.company_name}</option>)}
                              </select>
                            )}
                            {asgn.mode === 'none' && (
                              <span className="text-xs text-amber-600 ml-1">Will show "Assign Crew" on calendar</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Step 3: Start date + summary ── */}
                {selWOList.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">3 · Start Date</p>
                    <input
                      type="date"
                      value={woStartDate}
                      onChange={e => setWoStartDate(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600"
                    />

                    {woStartDate && (
                      <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                        <p className="text-xs font-semibold text-gray-600 mb-2">Summary — {selWOList.length} calendar item{selWOList.length !== 1 ? 's' : ''} will be created</p>
                        <div className="space-y-1">
                          {woPreview.map(({ wo, asgn, days }) => {
                            const crew = crews.find(c => c.id === asgn.crewId)
                            const sub  = subs.find(s => s.id === asgn.subId)
                            const end  = dateStr(addWorkDays(toLocalDate(woStartDate), days, exceptions, false, false))
                            return (
                              <div key={wo.id} className="flex items-center gap-2 text-xs">
                                <span className="truncate font-medium text-gray-700 flex-1">{wo.module_type}</span>
                                <span className="text-gray-400 flex-shrink-0">{fmtDate(woStartDate)}→{fmtDate(end)}</span>
                                {asgn.mode === 'crew' && crew && (
                                  <span className="text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded font-semibold flex-shrink-0">Crew {crew.label}</span>
                                )}
                                {asgn.mode === 'sub' && sub && (
                                  <span className="text-[10px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-semibold flex-shrink-0">{sub.company_name}</span>
                                )}
                                {asgn.mode === 'none' && (
                                  <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold flex-shrink-0">No Crew</span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                        {needsCrewCt > 0 && (
                          <p className="text-[10px] text-amber-600 mt-2">
                            {needsCrewCt} item{needsCrewCt !== 1 ? 's' : ''} will show "Assign Crew" on the calendar.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 pb-5 pt-3 border-t border-gray-100 flex gap-3 flex-shrink-0">
                <button
                  onClick={saveWorkOrderSchedule}
                  disabled={woSaving || selWOList.length === 0 || !woStartDate}
                  className="flex-1 py-2.5 bg-green-700 text-white rounded-xl text-sm font-semibold hover:bg-green-800 disabled:opacity-50 transition-colors"
                >
                  {woSaving ? 'Scheduling…' : `Create ${selWOList.length} Schedule Item${selWOList.length !== 1 ? 's' : ''}`}
                </button>
                <button onClick={closeModal} className="px-4 py-2.5 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          </ModalOverlay>
        )
      })()}

      {/* Schedule Item Details */}
      {phase === 'details' && (
        <ModalOverlay onClose={closeModal}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 flex flex-col" style={{ maxHeight: '92vh' }}>

            {/* Header */}
            <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
              <h3 className="text-base font-bold text-gray-800">
                {editItem ? 'Edit Schedule Item' : 'New Schedule Item'}
              </h3>
              {modalJobId && (
                <p className="text-xs text-green-700 font-medium mt-0.5">{jobMap[modalJobId]}</p>
              )}
              {editItem?.needs_crew && (
                <div className="mt-2 px-3 py-2 bg-amber-50 border border-amber-300 rounded-lg flex items-center gap-2">
                  <span className="text-amber-500">⚠</span>
                  <p className="text-xs font-semibold text-amber-700">Crew not yet assigned — select a crew below and save to update the calendar.</p>
                </div>
              )}
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

              {/* ── Mode selector ── */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Select Entry Type</p>
                <div className="flex gap-2">
                  {[
                    { key: 'crew', label: 'Crew' },
                    { key: 'sub',  label: 'Subcontractor' },
                    { key: 'custom', label: 'Custom' },
                  ].map(opt => (
                    <button key={opt.key} onClick={() => {
                      setEntryMode(opt.key)
                      updateField('crew_id', '')
                      updateField('sub_id', '')
                      if (opt.key !== 'custom') updateField('title', '')
                    }}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                        entryMode === opt.key
                          ? 'bg-green-700 text-white border-green-700'
                          : 'border-gray-200 text-gray-500 hover:border-green-400 hover:text-green-700'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Crew searchable dropdown ── */}
              {entryMode === 'crew' && (() => {
                // nickname || first_name for calendar display
                const empDisplay = id => {
                  const e = employees.find(em => em.id === id)
                  return e ? (e.nickname?.trim() || e.first_name) : null
                }
                const empFull = id => {
                  const e = employees.find(em => em.id === id)
                  return e ? `${e.first_name} ${e.last_name}` : null
                }
                const crewLabel = crew => {
                  const names = [
                    crew.crew_chief_id, crew.journeyman_id,
                    crew.laborer_1_id, crew.laborer_2_id, crew.laborer_3_id
                  ].filter(Boolean).map(empDisplay).filter(Boolean)
                  return `${crew.label} - ${names.join(', ')}`
                }
                const crewSearch = crew => {
                  const allNames = [
                    crew.crew_chief_id, crew.journeyman_id,
                    crew.laborer_1_id, crew.laborer_2_id, crew.laborer_3_id
                  ].filter(Boolean).map(empFull).filter(Boolean).join(' ')
                  return `${crew.label} ${allNames}`.toLowerCase()
                }

                return (
                  <CrewSubPicker
                    label="Select Crew"
                    emptyMsg="No crews built yet. Add crews in Master Crews."
                    options={crews.map(c => ({
                      id: c.id,
                      primary: `Crew ${c.label}`,
                      secondary: (() => {
                        const members = [
                          c.crew_chief_id && { role: 'Chief',      name: empFull(c.crew_chief_id) },
                          c.journeyman_id && { role: 'Journeyman', name: empFull(c.journeyman_id) },
                          c.laborer_1_id  && { role: 'Laborer 1',  name: empFull(c.laborer_1_id) },
                          c.laborer_2_id  && { role: 'Laborer 2',  name: empFull(c.laborer_2_id) },
                          c.laborer_3_id  && { role: 'Laborer 3',  name: empFull(c.laborer_3_id) },
                        ].filter(m => m && m.name)
                        return members.map(m => `${m.role}: ${m.name}`).join('  ·  ')
                      })(),
                      searchText: crewSearch(c),
                      autoTitle: crewLabel(c),
                    }))}
                    selectedId={form.crew_id}
                    onSelect={opt => {
                      updateField('crew_id', opt.id)
                      updateField('sub_id', '')
                      updateField('title', opt.autoTitle)
                      updateField('assignee_color', crewColorMap[opt.id] || '#15803d')
                    }}
                  />
                )
              })()}
              {entryMode === 'crew' && form.crew_id && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Schedule Item Label <span className="text-gray-400 font-normal">(auto-filled, editable)</span>
                  </label>
                  <input type="text" value={form.title}
                    onChange={e => updateField('title', e.target.value)}
                    className="input text-sm w-full" />
                </div>
              )}

              {/* ── Subcontractor searchable dropdown ── */}
              {entryMode === 'sub' && (
                <>
                  <CrewSubPicker
                    label="Select Subcontractor"
                    emptyMsg="No subcontractors found. Add them in Subs & Vendors."
                    options={subs.map(s => ({
                      id: s.id,
                      primary: s.company_name,
                      secondary: s.divisions?.join(' · ') || '',
                      searchText: `${s.company_name} ${(s.divisions||[]).join(' ')}`.toLowerCase(),
                      autoTitle: `S - ${s.company_name}`,
                    }))}
                    selectedId={form.sub_id}
                    onSelect={opt => {
                      updateField('sub_id', opt.id)
                      updateField('crew_id', '')
                      updateField('title', opt.autoTitle)
                      updateField('assignee_color', '#000000')
                    }}
                  />
                  {form.sub_id && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Schedule Item Label <span className="text-gray-400 font-normal">(auto-filled, editable)</span>
                      </label>
                      <input type="text" value={form.title}
                        onChange={e => updateField('title', e.target.value)}
                        className="input text-sm w-full" />
                    </div>
                  )}
                </>
              )}

              {/* ── Custom entry ── */}
              {entryMode === 'custom' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Schedule Item Label <span className="text-red-400">*</span>
                  </label>
                  <input type="text" value={form.title}
                    onChange={e => updateField('title', e.target.value)}
                    placeholder="e.g. Install pavers, Concrete pour, Site prep…"
                    className="input text-sm w-full" autoFocus />
                </div>
              )}

              {/* ── Schedule Details ── */}
              <div className="border-t border-gray-100 pt-4 grid grid-cols-2 gap-4">

                {/* Left column */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Display Color</label>
                    <ColorDropdown value={form.display_color} onChange={c => updateField('display_color', c)} />
                  </div>

                  {/* Assignee Color */}
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <label className="text-xs font-medium text-gray-600">Assignee Color</label>
                      {entryMode === 'sub' && (
                        <span className="text-[10px] text-gray-400">Auto: black for subs</span>
                      )}
                      {entryMode === 'crew' && form.crew_id && (
                        <span className="text-[10px] text-gray-400">Auto: crew color</span>
                      )}
                    </div>
                    <ColorDropdown value={form.assignee_color} onChange={c => updateField('assignee_color', c)} allowClear />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Assignees</label>
                    <input type="text" value={form.assignees} onChange={e => updateField('assignees', e.target.value)}
                      placeholder="e.g. Mike, Sarah" className="input text-sm w-full" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Reminder</label>
                    <select value={form.reminder} onChange={e => updateField('reminder', e.target.value)} className="input text-sm w-full">
                      {REMINDERS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>

                {/* Right column */}
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Start</label>
                      <input type="date" value={form.start_date} onChange={e => updateField('start_date', e.target.value)} className="input text-sm w-full" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Days</label>
                      <input type="number" min="1" value={form.work_days} onChange={e => updateField('work_days', e.target.value)} className="input text-sm w-full" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">End</label>
                      <input type="date" value={form.end_date} onChange={e => updateField('end_date', e.target.value)} className="input text-sm w-full" />
                    </div>
                  </div>

                  {/* Weekend overrides */}
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
                      <input type="checkbox" checked={!!form.include_saturday}
                        onChange={e => updateField('include_saturday', e.target.checked)}
                        className="rounded border-gray-300 text-green-700 focus:ring-green-600" />
                      Include Saturdays
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
                      <input type="checkbox" checked={!!form.include_sunday}
                        onChange={e => updateField('include_sunday', e.target.checked)}
                        className="rounded border-gray-300 text-green-700 focus:ring-green-600" />
                      Include Sundays
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Progress — <span className="text-green-700 font-bold">{form.progress}%</span>
                    </label>
                    <input type="range" min="0" max="100" step="5" value={form.progress}
                      onChange={e => updateField('progress', e.target.value)} className="w-full accent-green-700" />
                    <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                      <span>0%</span><span>50%</span><span>100%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                    <textarea value={form.notes} onChange={e => updateField('notes', e.target.value)}
                      rows={3} placeholder="Optional notes…" className="input text-sm w-full resize-none" />
                  </div>
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-5 pt-3 border-t border-gray-100 flex items-center gap-2 flex-shrink-0">
              <button onClick={saveItem} disabled={saving || !form.title.trim()}
                className="flex-1 btn-primary text-sm py-2.5 disabled:opacity-50">
                {saving ? 'Saving…' : editItem ? 'Update' : 'Save'}
              </button>
              <button onClick={closeModal} className="px-4 py-2.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              {editItem && (
                <button onClick={deleteItem} className="px-3 py-2.5 text-sm rounded-lg border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600">
                  Delete
                </button>
              )}
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}

function ModalOverlay({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-0 sm:px-4"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      {children}
    </div>
  )
}
