// src/components/ScheduleModal.jsx
//
// Mobile schedule viewer opened from the bottom dock. A job picker sits on top,
// then a small Month / List-by-Day toggle.
//   • Month     — requires a single job; shows a mini month calendar of that
//                 job's schedule_items.
//   • List by Day — sticky day-section list (CSS sticky headers give the
//                 "day bar captures until the next supersedes it" behavior);
//                 defaults scrolled to today.

import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fetchAllPaginated } from '../lib/fetchAll'

const WD_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function dStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${da}`
}
function addDays(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
function parseDate(s) {
  return new Date(s + 'T00:00:00')
}
function dayLabel(s) {
  return parseDate(s).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

export default function ScheduleModal({ onClose }) {
  const navigate = useNavigate()
  const [view, setView] = useState('list') // 'list' | 'month'
  const [jobs, setJobs] = useState([])
  const [crews, setCrews] = useState([])
  const [subs, setSubs] = useState([])
  const [activeItem, setActiveItem] = useState(null) // tapped schedule item
  const [selectedJob, setSelectedJob] = useState('all')
  const [jobStatusFilter, setJobStatusFilter] = useState('open') // 'open' | 'closed'
  const [pickerOpen, setPickerOpen] = useState(false)
  const [jobQuery, setJobQuery] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [monthCursor, setMonthCursor] = useState(() => {
    const n = new Date()
    return new Date(n.getFullYear(), n.getMonth(), 1)
  })
  const todayStr = dStr(new Date())
  const todayRef = useRef(null)
  const scrollRef = useRef(null)

  // Jobs (incl. address for the map), crews + subs for name lookups.
  // Paginated — the jobs table exceeds the 1k row cap, so a plain select would
  // miss most jobs (and the open ones with it).
  useEffect(() => {
    fetchAllPaginated(() =>
      supabase
        .from('jobs')
        .select('id, name, client_name, status, job_address, job_city, job_state, job_zip, lat, lon')
        .order('name')
    ).then(({ data }) => setJobs(data || []))
    supabase
      .from('crews')
      .select('id, label')
      .then(({ data }) => setCrews(data || []))
    supabase
      .from('subs_vendors')
      .select('id, company_name')
      .eq('type', 'sub')
      .then(({ data }) => setSubs(data || []))
  }, [])
  const jobMap = useMemo(() => {
    const m = {}
    for (const j of jobs) m[j.id] = j.name || j.client_name || 'Job'
    return m
  }, [jobs])
  const jobById = useMemo(() => Object.fromEntries(jobs.map(j => [j.id, j])), [jobs])
  const crewById = useMemo(() => Object.fromEntries(crews.map(c => [c.id, c])), [crews])
  const subById = useMemo(() => Object.fromEntries(subs.map(s => [s.id, s])), [subs])

  const jobIsOpen = j => j.status === 'active' || j.status === 'on_hold' || !j.status
  const pickerJobs = useMemo(() => {
    const q = jobQuery.trim().toLowerCase()
    return jobs.filter(j => {
      if (jobStatusFilter === 'open' && !jobIsOpen(j)) return false
      if (jobStatusFilter === 'closed' && jobIsOpen(j)) return false
      // 'all' => no status filter
      if (!q) return true
      return (
        (j.name || '').toLowerCase().includes(q) ||
        (j.client_name || '').toLowerCase().includes(q)
      )
    })
  }, [jobs, jobQuery, jobStatusFilter])
  const selectedJobLabel = selectedJob === 'all' ? 'All Jobs' : jobMap[selectedJob] || 'Select job'

  // Fetch schedule items for the active range.
  useEffect(() => {
    let alive = true
    setLoading(true)
    let startOf, endOf
    if (view === 'month') {
      const y = monthCursor.getFullYear()
      const m = monthCursor.getMonth()
      startOf = dStr(new Date(y, m, 1))
      endOf = dStr(new Date(y, m + 1, 0))
    } else {
      const t = new Date()
      startOf = dStr(addDays(t, -30))
      endOf = dStr(addDays(t, 120))
    }
    let q = supabase
      .from('schedule_items')
      .select('*')
      .lte('start_date', endOf)
      .gte('end_date', startOf)
      .order('start_date')
    if (selectedJob !== 'all') q = q.eq('job_id', selectedJob)
    q.then(({ data }) => {
      if (alive) {
        setItems(data || [])
        setLoading(false)
      }
    })
    return () => {
      alive = false
    }
  }, [view, selectedJob, monthCursor])

  // Default-scroll List view to today once items have loaded.
  useEffect(() => {
    if (view === 'list' && !loading && todayRef.current) {
      todayRef.current.scrollIntoView({ block: 'start' })
    }
  }, [view, loading])

  function itemsOnDay(dayStr) {
    return items
      .filter(it => it.start_date <= dayStr && it.end_date >= dayStr)
      .sort((a, b) => (a.title || '').localeCompare(b.title || ''))
  }

  // List view: the days to show = every day with at least one item, plus today.
  const listDays = useMemo(() => {
    const set = new Set([todayStr])
    for (const it of items) {
      // include each day the item spans within the window
      let d = parseDate(it.start_date)
      const end = parseDate(it.end_date)
      let guard = 0
      while (d <= end && guard < 400) {
        set.add(dStr(d))
        d = addDays(d, 1)
        guard++
      }
    }
    return Array.from(set).sort()
  }, [items, todayStr])

  return (
    <div className="fixed inset-0 z-[70] bg-white flex flex-col" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Header — green bar with the screen name centered in white */}
      <div
        className="relative flex items-center justify-center px-4 h-11 flex-shrink-0 shadow-md"
        style={{ backgroundColor: '#4E7B4C' }}
      >
        <h2 className="text-base font-semibold text-white">Schedule</h2>
        <button
          onClick={onClose}
          className="absolute right-3 w-8 h-8 rounded-full text-white/80 hover:bg-black/15 flex items-center justify-center text-lg"
        >
          ✕
        </button>
      </div>

      {/* Open / Closed / All job filter (above the picker) */}
      <div className="px-4 pt-3 flex-shrink-0 relative z-20">
        <div className="flex gap-2 mb-2">
          {[
            { k: 'open', label: 'Open Jobs' },
            { k: 'closed', label: 'Closed Jobs' },
            { k: 'all', label: 'All Jobs' },
          ].map(o => (
            <button
              key={o.k}
              onClick={() => setJobStatusFilter(o.k)}
              className={`flex-1 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
                jobStatusFilter === o.k
                  ? 'bg-green-700 text-white border-green-700'
                  : 'bg-gray-50 text-gray-600 border-gray-200'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* Searchable job picker — dropdown is absolutely positioned so it
            overlays content instead of pushing the Month / List toggle down. */}
        <div className="relative">
          <button
            onClick={() => setPickerOpen(v => !v)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white"
          >
            <span className="truncate text-gray-800">{selectedJobLabel}</span>
            <span className="text-gray-400">{pickerOpen ? '▲' : '▼'}</span>
          </button>
          {pickerOpen && (
            <div className="absolute left-0 right-0 mt-1 rounded-lg border border-gray-200 shadow-lg bg-white z-30">
            <input
              autoFocus
              type="text"
              value={jobQuery}
              onChange={e => setJobQuery(e.target.value)}
              placeholder="Search jobs…"
              className="w-full px-3 py-2 border-b border-gray-100 text-sm focus:outline-none"
            />
            <div className="max-h-56 overflow-y-auto divide-y divide-gray-100">
              <button
                onClick={() => {
                  setSelectedJob('all')
                  setPickerOpen(false)
                  setJobQuery('')
                }}
                className={`w-full text-left px-3 py-2 text-sm ${
                  selectedJob === 'all' ? 'bg-green-50 text-green-800' : 'hover:bg-gray-50'
                }`}
              >
                All Jobs
              </button>
              {pickerJobs.map(j => (
                <button
                  key={j.id}
                  onClick={() => {
                    setSelectedJob(j.id)
                    setPickerOpen(false)
                    setJobQuery('')
                  }}
                  className={`w-full text-left px-3 py-2 text-sm ${
                    selectedJob === j.id ? 'bg-green-50 text-green-800' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className="block truncate">{j.name || j.client_name}</span>
                  {j.client_name && j.name && (
                    <span className="block text-xs text-gray-400 truncate">{j.client_name}</span>
                  )}
                </button>
              ))}
              {pickerJobs.length === 0 && (
                <p className="px-3 py-3 text-sm text-gray-400 text-center">No jobs found</p>
              )}
            </div>
          </div>
          )}
        </div>
      </div>

      {/* View toggle — small docked buttons */}
      <div className="px-4 py-3 flex-shrink-0">
        <div className="flex gap-2">
          <button
            onClick={() => setView('month')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              view === 'month'
                ? 'bg-green-700 text-white border-green-700'
                : 'bg-gray-50 text-gray-600 border-gray-200'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setView('list')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              view === 'list'
                ? 'bg-green-700 text-white border-green-700'
                : 'bg-gray-50 text-gray-600 border-gray-200'
            }`}
          >
            List by Day
          </button>
        </div>
      </div>

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain">
        {loading ? (
          <p className="py-12 text-center text-sm text-gray-400">Loading…</p>
        ) : view === 'month' ? (
          <MonthView
            monthCursor={monthCursor}
            setMonthCursor={setMonthCursor}
            selectedJob={selectedJob}
            itemsOnDay={itemsOnDay}
            todayStr={todayStr}
          />
        ) : (
          <ListView
            listDays={listDays}
            itemsOnDay={itemsOnDay}
            jobMap={jobMap}
            todayStr={todayStr}
            todayRef={todayRef}
            selectedJob={selectedJob}
            onItemClick={setActiveItem}
          />
        )}
      </div>

      {/* Day Schedule item detail */}
      {activeItem && (
        <DayItemModal
          item={activeItem}
          job={jobById[activeItem.job_id]}
          crew={activeItem.crew_id ? crewById[activeItem.crew_id] : null}
          sub={activeItem.sub_id ? subById[activeItem.sub_id] : null}
          onClose={() => setActiveItem(null)}
          onGo={url => {
            setActiveItem(null)
            onClose()
            navigate(url)
          }}
        />
      )}
    </div>
  )
}

// ── Month mini-calendar (single job required) ──────────────────────────────
function MonthView({ monthCursor, setMonthCursor, selectedJob, itemsOnDay, todayStr }) {
  if (selectedJob === 'all') {
    return (
      <div className="px-6 py-16 text-center text-gray-400">
        <p className="text-4xl mb-3">📅</p>
        <p className="text-sm font-medium text-gray-500">Pick a single job</p>
        <p className="text-xs mt-1">The month calendar shows one job at a time.</p>
      </div>
    )
  }
  const y = monthCursor.getFullYear()
  const m = monthCursor.getMonth()
  const monthName = monthCursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const firstDow = new Date(y, m, 1).getDay()
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="px-3 pb-6">
      <div className="flex items-center justify-between mb-2 px-1">
        <button
          onClick={() => setMonthCursor(new Date(y, m - 1, 1))}
          className="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-500 text-lg"
        >
          ‹
        </button>
        <p className="text-sm font-bold text-gray-800">{monthName}</p>
        <button
          onClick={() => setMonthCursor(new Date(y, m + 1, 1))}
          className="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-500 text-lg"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[10px] font-bold text-gray-400 mb-1">
        {WD_SHORT.map(d => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={`b${i}`} />
          const ds = dStr(new Date(y, m, d))
          const dayItems = itemsOnDay(ds)
          const isToday = ds === todayStr
          return (
            <div
              key={ds}
              className={`min-h-[52px] rounded-lg border p-1 ${
                isToday ? 'border-green-500 bg-green-50' : 'border-gray-100 bg-gray-50/50'
              }`}
            >
              <div className={`text-[10px] font-semibold ${isToday ? 'text-green-700' : 'text-gray-500'}`}>
                {d}
              </div>
              <div className="space-y-0.5 mt-0.5">
                {dayItems.slice(0, 3).map(it => (
                  <div
                    key={it.id}
                    className="h-1.5 rounded-full"
                    style={{
                      backgroundColor: it.needs_crew
                        ? '#b45309'
                        : it.scheduling_type === 'yard_check'
                          ? '#3b82f6'
                          : it.display_color || '#15803d',
                    }}
                    title={it.title}
                  />
                ))}
                {dayItems.length > 3 && (
                  <div className="text-[8px] text-gray-400 leading-none">+{dayItems.length - 3}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── List by Day (sticky day sections) ──────────────────────────────────────
function ListView({ listDays, itemsOnDay, jobMap, todayStr, todayRef, selectedJob, onItemClick }) {
  if (listDays.length === 0) {
    return <p className="py-12 text-center text-sm text-gray-400">No scheduled work.</p>
  }
  return (
    <div className="pb-10">
      {listDays.map(ds => {
        const dayItems = itemsOnDay(ds)
        const isToday = ds === todayStr
        return (
          <div key={ds} ref={isToday ? todayRef : null}>
            {/* Sticky day bar — captures at the top until the next day supersedes it */}
            <div
              className={`sticky top-0 z-10 px-4 py-2 text-sm font-bold border-b ${
                isToday
                  ? 'bg-green-700 text-white border-green-700'
                  : 'bg-gray-100 text-gray-700 border-gray-200'
              }`}
            >
              {dayLabel(ds)}
              {isToday && <span className="ml-2 text-[10px] font-semibold uppercase">Today</span>}
            </div>
            <div className="px-3 py-2 space-y-2">
              {dayItems.length === 0 ? (
                <p className="text-xs text-gray-400 italic px-1 py-1">No jobs scheduled.</p>
              ) : (
                dayItems.map(it => (
                  <button
                    key={it.id}
                    onClick={() => onItemClick(it)}
                    className={`w-full text-left bg-white rounded-xl p-3 shadow-sm flex items-start gap-3 active:bg-gray-50 ${
                      it.needs_crew ? 'border-2 border-amber-400 bg-amber-50' : 'border border-gray-200'
                    }`}
                  >
                    <div
                      className="w-1.5 self-stretch rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: it.needs_crew
                          ? '#b45309'
                          : it.scheduling_type === 'yard_check'
                            ? '#3b82f6'
                            : it.display_color || '#15803d',
                        minHeight: 36,
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      {it.needs_crew && (
                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide mb-0.5">
                          Crew Not Assigned
                        </p>
                      )}
                      {/* Job name is the headline when the item is tied to a
                          job; the crew/title shows underneath. Crew-only items
                          (no job_id) just show their title. */}
                      {jobMap[it.job_id] ? (
                        <>
                          <p className="font-semibold text-gray-900 text-sm leading-tight">
                            {jobMap[it.job_id]}
                          </p>
                          {it.title && (
                            <p className="text-xs text-purple-600 mt-0.5 font-medium">
                              {it.title}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="font-semibold text-gray-900 text-sm leading-tight">
                          {it.title || '(untitled)'}
                        </p>
                      )}
                      {it.start_date !== it.end_date && (
                        <p className="text-xs text-gray-500 mt-1">
                          {parseDate(it.start_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}{' '}
                          –{' '}
                          {parseDate(it.end_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Day Schedule item detail (crew/subs, job, map, time clock, daily log) ───
function jobMapHref(job) {
  if (!job) return null
  if (job.lat != null && job.lon != null) {
    return `https://www.google.com/maps/?q=${job.lat},${job.lon}`
  }
  const addr = [job.job_address, job.job_city, job.job_state, job.job_zip]
    .filter(Boolean)
    .join(', ')
  return addr ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}` : null
}

function DayItemModal({ item, job, crew, sub, onClose, onGo }) {
  const jobName = job ? job.name || job.client_name : 'Job'
  const mapHref = jobMapHref(job)
  const crewSub = crew ? `Crew ${crew.label}` : sub ? sub.company_name : null

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl"
        onClick={e => e.stopPropagation()}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Header: crew / subs + assignees */}
        <div className="px-5 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-lg font-bold text-gray-900 leading-tight">
                {crewSub || item.title || 'Scheduled work'}
              </p>
              {item.assignees && (
                <p className="text-sm text-gray-600 mt-0.5">{item.assignees}</p>
              )}
              {/* Small-font job name */}
              <p className="text-xs text-purple-600 font-medium mt-1">{jobName}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex-shrink-0 rounded-full text-gray-400 hover:bg-gray-100 flex items-center justify-center text-lg"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 space-y-2">
          <button
            onClick={() => mapHref && window.open(mapHref, '_blank')}
            disabled={!mapHref}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            <span className="text-lg">🗺️</span> View on map
          </button>
          <button
            onClick={() => onGo(`/timeclock?job=${item.job_id}`)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <span className="text-lg">⏱️</span> Time clock
          </button>
          <button
            onClick={() => onGo(`/daily-logs?new=1&job=${item.job_id}`)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <span className="text-lg">📝</span> Add daily log
          </button>
        </div>
      </div>
    </div>
  )
}
