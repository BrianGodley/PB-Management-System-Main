import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

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

const LANE_H    = 24   // px per item lane
const DAY_H     = 30   // px reserved for the day-number strip at top of each row
const ROW_PAD   = 8    // extra padding below items
const MIN_ROW_H = 160  // minimum row height so empty weeks still look like a real calendar

// ── Date helpers ─────────────────────────────────────────────
function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate() }
function firstDayOfMonth(y, m) { return new Date(y, m, 1).getDay() }

function dateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function addWorkDays(startDate, workDays) {
  if (!workDays || workDays < 1) return startDate
  let d = new Date(startDate), added = 0
  while (added < workDays - 1) {
    d.setDate(d.getDate() + 1)
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) added++
  }
  return d
}

function countWorkDays(start, end) {
  if (!start || !end) return 0
  let d = new Date(start), e = new Date(end), count = 0
  while (d <= e) {
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) count++
    d.setDate(d.getDate() + 1)
  }
  return count
}

const EMPTY_FORM = {
  title: '', display_color: '#15803d', assignees: '',
  start_date: '', end_date: '', work_days: '', progress: 0, reminder: 'None', notes: '',
}

// ── WeekRow: renders one 7-day row with spanning item bars ───
function WeekRow({ weekDays, year, month, items, selectedJob, jobMap, todayStr, onDayClick, onItemClick }) {
  // Build actual Date objects for each column (null for padding cells)
  const weekDates = weekDays.map(day => day ? new Date(year, month, day) : null)
  const validDates = weekDates.filter(Boolean)
  if (validDates.length === 0) return null

  const weekMinMs = Math.min(...validDates.map(d => d.getTime()))
  const weekMaxMs = Math.max(...validDates.map(d => d.getTime()))

  // Filter items overlapping this week, sorted by start date
  const weekItems = items
    .filter(item => {
      const s = new Date(item.start_date + 'T00:00:00').getTime()
      const e = new Date(item.end_date   + 'T00:00:00').getTime()
      return s <= weekMaxMs && e >= weekMinMs
    })
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))

  // Compute startCol / endCol / lane for each item
  const itemInfo = {}
  const laneRanges = [] // laneRanges[l] = [{s, e}]

  weekItems.forEach(item => {
    const iStart = new Date(item.start_date + 'T00:00:00')
    const iEnd   = new Date(item.end_date   + 'T00:00:00')

    let startCol = -1, endCol = -1
    weekDates.forEach((date, col) => {
      if (!date) return
      if (date >= iStart && date <= iEnd) {
        if (startCol === -1) startCol = col
        endCol = col
      }
    })
    if (startCol === -1) return

    // Assign to first lane with no column overlap
    let lane = 0
    while (true) {
      const occupied = laneRanges[lane] || []
      const conflict = occupied.some(r => !(endCol < r.s || startCol > r.e))
      if (!conflict) {
        if (!laneRanges[lane]) laneRanges[lane] = []
        laneRanges[lane].push({ s: startCol, e: endCol })
        break
      }
      lane++
    }
    itemInfo[item.id] = { startCol, endCol, lane }
  })

  const numLanes = laneRanges.length
  const rowH = Math.max(MIN_ROW_H, DAY_H + numLanes * LANE_H + ROW_PAD)

  return (
    <div className="relative border-b border-gray-200" style={{ height: rowH }}>

      {/* ── Day cells (background + day numbers + click target) ── */}
      <div className="absolute inset-0 grid grid-cols-7">
        {weekDays.map((day, col) => {
          const ds = day
            ? `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
            : null
          const isToday = ds === todayStr
          return (
            <div
              key={col}
              onClick={() => day && onDayClick(day)}
              className={`border-r border-gray-200 pt-1 px-1 select-none
                ${day ? 'hover:bg-green-50 cursor-pointer' : 'bg-gray-50 cursor-default'}`}
            >
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

      {/* ── Spanning item bars ─────────────────────────────────── */}
      <div className="absolute inset-x-0 pointer-events-none" style={{ top: DAY_H }}>
        {weekItems.map(item => {
          const info = itemInfo[item.id]
          if (!info) return null
          const { startCol, endCol, lane } = info

          // Rounded corners only at true item start/end, flat where it continues across week boundary
          const iStart     = new Date(item.start_date + 'T00:00:00')
          const iEnd       = new Date(item.end_date   + 'T00:00:00')
          const cellStart  = weekDates[startCol]
          const cellEnd    = weekDates[endCol]
          const isItemStart = cellStart && iStart.getTime() === cellStart.getTime()
          const isItemEnd   = cellEnd   && iEnd.getTime()   === cellEnd.getTime()

          const leftPct  = startCol / 7 * 100
          const widthPct = (endCol - startCol + 1) / 7 * 100

          const radius = isItemStart && isItemEnd ? '4px'
            : isItemStart ? '4px 0 0 4px'
            : isItemEnd   ? '0 4px 4px 0'
            : '0'

          return (
            <div
              key={item.id}
              onClick={e => { e.stopPropagation(); onItemClick(e, item) }}
              style={{
                position:        'absolute',
                left:            `calc(${leftPct}% + 3px)`,
                width:           `calc(${widthPct}% - 6px)`,
                top:             lane * LANE_H + 2,
                height:          LANE_H - 4,
                backgroundColor: item.display_color,
                borderRadius:    radius,
                pointerEvents:   'auto',
              }}
              className="flex items-center px-1.5 text-white text-[10px] font-medium cursor-pointer hover:opacity-80 overflow-hidden whitespace-nowrap"
              title={item.title + (selectedJob === 'all' ? ` — ${jobMap[item.job_id] || ''}` : '')}
            >
              {item.title}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main calendar component ──────────────────────────────────
export default function ScheduleCalendar({ jobs = [], selectedJob }) {
  const today = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  const [phase,       setPhase]       = useState(null)  // null | 'job-select' | 'details'
  const [clickedDate, setClickedDate] = useState(null)
  const [editItem,    setEditItem]    = useState(null)
  const [form,        setForm]        = useState(EMPTY_FORM)
  const [modalJobId,  setModalJobId]  = useState(null)
  const [saving,      setSaving]      = useState(false)

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
    setForm({ ...EMPTY_FORM, start_date: ds, end_date: ds, work_days: 1 })
    setEditItem(null)
    if (selectedJob === 'all') {
      setModalJobId(null); setPhase('job-select')
    } else {
      setModalJobId(selectedJob); setPhase('details')
    }
  }

  function handleItemClick(e, item) {
    e.stopPropagation()
    setEditItem(item)
    setModalJobId(item.job_id)
    setForm({
      title:         item.title         || '',
      display_color: item.display_color || '#15803d',
      assignees:     item.assignees     || '',
      start_date:    item.start_date    || '',
      end_date:      item.end_date      || '',
      work_days:     item.work_days     ?? '',
      progress:      item.progress      ?? 0,
      reminder:      item.reminder      || 'None',
      notes:         item.notes         || '',
    })
    setPhase('details')
  }

  function closeModal() {
    setPhase(null); setEditItem(null); setForm(EMPTY_FORM); setModalJobId(null)
  }

  function updateField(key, val) {
    setForm(prev => {
      const next = { ...prev, [key]: val }
      if (key === 'start_date' && next.work_days && +next.work_days > 0) {
        next.end_date = dateStr(addWorkDays(new Date(next.start_date), +next.work_days))
      }
      if (key === 'work_days' && next.start_date && +val > 0) {
        next.end_date = dateStr(addWorkDays(new Date(next.start_date), +val))
      }
      if (key === 'end_date' && next.start_date) {
        next.work_days = countWorkDays(next.start_date, val)
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

  // Build week rows
  const firstDay = firstDayOfMonth(year, month)
  const numDays  = daysInMonth(year, month)
  const cells    = Array.from({ length: firstDay + numDays }, (_, i) => i < firstDay ? null : i - firstDay + 1)
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  const jobMap   = Object.fromEntries(jobs.map(j => [j.id, j.name || j.client_name]))
  const todayStr = dateStr(today)

  return (
    <div className="flex flex-col select-none">

      {/* ── Month navigation + day headers — sticky ───────────── */}
      <div className="sticky top-0 z-10 bg-white pb-0">
        <div className="flex items-center justify-between mb-2">
          <button onClick={prevMonth} className="p-1.5 rounded hover:bg-gray-100 text-gray-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h3 className="text-sm font-bold text-gray-800">{MONTH_NAMES[month]} {year}</h3>
          <button onClick={nextMonth} className="p-1.5 rounded hover:bg-gray-100 text-gray-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Day-of-week header */}
        <div className="grid grid-cols-7 border-l border-t border-gray-200">
          {DAY_NAMES.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1.5 border-r border-b border-gray-200 bg-white">
              {d}
            </div>
          ))}
        </div>
      </div>

      {/* ── Week rows — grow to natural height ────────────────── */}
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
            />
          ))}
        </div>
      )}

      {/* ── Modal: Job Selector ───────────────────────────────── */}
      {phase === 'job-select' && (
        <ModalOverlay onClose={closeModal}>
          <div className="bg-white rounded-xl shadow-xl w-80 p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-1">Select a Job</h3>
            <p className="text-xs text-gray-400 mb-3">{clickedDate}</p>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {jobs.map(j => (
                <button
                  key={j.id}
                  onClick={() => { setModalJobId(j.id); setPhase('details') }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-green-50 hover:text-green-700 transition-colors text-gray-700 border border-transparent hover:border-green-200"
                >
                  {j.name || j.client_name}
                </button>
              ))}
            </div>
            <button onClick={closeModal} className="mt-3 text-xs text-gray-400 hover:text-gray-600 w-full text-center">Cancel</button>
          </div>
        </ModalOverlay>
      )}

      {/* ── Modal: Schedule Item Details ─────────────────────── */}
      {phase === 'details' && (
        <ModalOverlay onClose={closeModal}>
          <div className="bg-white rounded-xl shadow-xl w-[420px] max-h-[90vh] overflow-y-auto">
            <div className="px-5 pt-5 pb-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800">
                {editItem ? 'Edit Schedule Item' : 'Schedule Item Details'}
              </h3>
              {modalJobId && (
                <p className="text-xs text-green-700 font-medium mt-0.5">{jobMap[modalJobId]}</p>
              )}
            </div>

            <div className="px-5 py-4 space-y-3">
              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Title <span className="text-red-400">*</span></label>
                <input type="text" value={form.title} onChange={e => updateField('title', e.target.value)}
                  placeholder="e.g. Install pavers" className="input text-sm w-full" autoFocus />
              </div>

              {/* Display Color */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Display Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c.value} onClick={() => updateField('display_color', c.value)}
                      style={{ backgroundColor: c.value }}
                      className={`w-7 h-7 rounded-full transition-transform ${form.display_color === c.value ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                      title={c.label} />
                  ))}
                </div>
              </div>

              {/* Assignees */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Assignees</label>
                <input type="text" value={form.assignees} onChange={e => updateField('assignees', e.target.value)}
                  placeholder="e.g. Mike, Sarah" className="input text-sm w-full" />
              </div>

              {/* Start / Work Days / End */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                  <input type="date" value={form.start_date} onChange={e => updateField('start_date', e.target.value)} className="input text-sm w-full" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Work Days</label>
                  <input type="number" min="1" value={form.work_days} onChange={e => updateField('work_days', e.target.value)} className="input text-sm w-full" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                  <input type="date" value={form.end_date} onChange={e => updateField('end_date', e.target.value)} className="input text-sm w-full" />
                </div>
              </div>

              {/* Progress */}
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

              {/* Reminder */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Reminder</label>
                <select value={form.reminder} onChange={e => updateField('reminder', e.target.value)} className="input text-sm w-full">
                  {REMINDERS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => updateField('notes', e.target.value)}
                  rows={2} placeholder="Optional notes…" className="input text-sm w-full resize-none" />
              </div>
            </div>

            <div className="px-5 pb-5 flex items-center gap-2">
              <button onClick={saveItem} disabled={saving || !form.title.trim()}
                className="flex-1 btn-primary text-sm py-2 disabled:opacity-50">
                {saving ? 'Saving…' : editItem ? 'Update' : 'Save'}
              </button>
              <button onClick={closeModal} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              {editItem && (
                <button onClick={deleteItem} className="px-3 py-2 text-sm rounded-lg border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      {children}
    </div>
  )
}
