// ─────────────────────────────────────────────────────────────────────────────
// StatMiniGraph — the shared statistic mini-graph used by the Statistics Group
// View, the Dashboard stat cards, and the Weekly FP solvency graph. It renders a
// compact card with:
//   • a circle-handle date-range scrubber (live centered date readout)
//   • a window that opens on the stat's default_periods count, anchored to the
//     most recent data point
//   • an angular (linear) recharts line
//   • click-to-expand into a large detail modal
//
// Props:
//   stat          — statistics row ({ name, tracking, stat_type, default_periods })
//   values        — array of { period_date, value } rows for this stat
//   weekEndingDay — 0=Sun … 6=Sat (optional; self-fetched from company_settings
//                   when not provided, so weekly bucketing stays correct)
//   height        — chart pixel height (default 285)
//   onExpand      — optional external expand handler (Statistics passes its own,
//                   which drives a shared modal). When omitted and expandable is
//                   true, the component manages its own internal expand modal.
//   expandable    — enable the built-in expand modal (default true)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo, useRef } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { supabase } from '../lib/supabase'

const FG = '#3A5038'

// ── formatting + date helpers (kept in-sync with Statistics.jsx) ─────────────
function fmt(value, statType) {
  if (value == null) return ''
  const n = Number(value)
  if (statType === 'currency')
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (statType === 'percentage') return n.toFixed(2) + '%'
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

function fmtShort(v, statType) {
  if (v == null) return ''
  const n = Number(v)
  const abs = Math.abs(n)
  if (abs >= 1_000_000)
    return (statType === 'currency' ? '$' : '') + (n / 1_000_000).toFixed(1) + 'M'
  if (abs >= 1_000) return (statType === 'currency' ? '$' : '') + (n / 1_000).toFixed(0) + 'k'
  if (statType === 'currency') return '$' + n.toFixed(0)
  if (statType === 'percentage') return n.toFixed(1) + '%'
  return n.toLocaleString('en-US', { maximumFractionDigits: 1 })
}

function isoDate(d) {
  return d ? d.toISOString().slice(0, 10) : ''
}
function today() {
  return isoDate(new Date())
}
function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return isoDate(d)
}

function periodLabel(dateStr, tracking) {
  const d = new Date(dateStr + 'T00:00:00')
  if (tracking === 'yearly') return d.getFullYear().toString()
  if (tracking === 'quarterly') {
    const q = Math.floor(d.getMonth() / 3) + 1
    return `Q${q} ${d.getFullYear()}`
  }
  if (tracking === 'monthly')
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getWeekEndingDate(dateStr, weekEndingDay) {
  const d = new Date(dateStr + 'T00:00:00')
  const diff = (weekEndingDay - d.getDay() + 7) % 7
  d.setDate(d.getDate() + diff)
  return isoDate(d)
}

function generatePeriods(fromDate, toDate, tracking, weekEndingDay) {
  const periods = []
  const end = new Date(toDate + 'T00:00:00')
  let cur = new Date(fromDate + 'T00:00:00')

  if (tracking === 'daily') {
    while (cur <= end) {
      periods.push(isoDate(cur))
      cur.setDate(cur.getDate() + 1)
    }
  } else if (tracking === 'weekly') {
    const diff = (weekEndingDay - cur.getDay() + 7) % 7
    cur.setDate(cur.getDate() + diff)
    while (cur <= end) {
      periods.push(isoDate(cur))
      cur.setDate(cur.getDate() + 7)
    }
  } else if (tracking === 'monthly') {
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 0)
    while (cur <= end) {
      periods.push(isoDate(cur))
      cur = new Date(cur.getFullYear(), cur.getMonth() + 2, 0)
    }
  } else if (tracking === 'quarterly') {
    const quarterEnd = (year, q) => new Date(year, q * 3 + 3, 0)
    let q = Math.floor(cur.getMonth() / 3)
    cur = quarterEnd(cur.getFullYear(), q)
    while (cur <= end) {
      periods.push(isoDate(cur))
      q++
      const y = cur.getFullYear() + Math.floor(q / 4)
      cur = quarterEnd(y, q % 4)
    }
  } else if (tracking === 'yearly') {
    cur = new Date(cur.getFullYear(), 11, 31)
    while (cur <= end) {
      periods.push(isoDate(cur))
      cur = new Date(cur.getFullYear() + 1, 11, 31)
    }
  }
  return periods
}

function matchesPeriod(valueDate, periodDate, tracking, weekEndingDay) {
  const v = new Date(valueDate + 'T00:00:00')
  const p = new Date(periodDate + 'T00:00:00')
  if (tracking === 'daily') return valueDate === periodDate
  if (tracking === 'weekly')
    return getWeekEndingDate(valueDate, weekEndingDay) === getWeekEndingDate(periodDate, weekEndingDay)
  if (tracking === 'monthly')
    return v.getFullYear() === p.getFullYear() && v.getMonth() === p.getMonth()
  if (tracking === 'quarterly')
    return (
      v.getFullYear() === p.getFullYear() &&
      Math.floor(v.getMonth() / 3) === Math.floor(p.getMonth() / 3)
    )
  if (tracking === 'yearly') return v.getFullYear() === p.getFullYear()
  return false
}

// Step count-1 periods back from an anchor end date.
function periodsBackFrom(endDateStr, count, tracking, wed) {
  const wday = wed ?? 5
  const back = Math.max(0, (count || 1) - 1)
  const base = new Date(endDateStr + 'T00:00:00')
  if (tracking === 'daily') {
    const d = new Date(base)
    d.setDate(d.getDate() - back)
    return isoDate(d)
  } else if (tracking === 'weekly') {
    const we = new Date(getWeekEndingDate(endDateStr, wday) + 'T00:00:00')
    we.setDate(we.getDate() - back * 7)
    return isoDate(we)
  } else if (tracking === 'monthly') {
    return isoDate(new Date(base.getFullYear(), base.getMonth() - back, 1))
  } else if (tracking === 'quarterly') {
    return isoDate(new Date(base.getFullYear(), base.getMonth() - back * 3, 1))
  }
  return `${base.getFullYear() - back}-01-01`
}

// ── Company week-ending-day (self-fetched once, cached) ──────────────────────
let _wedPromise = null
function fetchCompanyWed() {
  if (!_wedPromise) {
    _wedPromise = supabase
      .from('company_settings')
      .select('week_ending_day')
      .maybeSingle()
      .then(r => r?.data?.week_ending_day ?? 5)
      .catch(() => 5)
  }
  return _wedPromise
}
function useEffectiveWed(passed) {
  const [wed, setWed] = useState(passed == null ? null : passed)
  useEffect(() => {
    if (passed != null) {
      setWed(passed)
      return
    }
    let alive = true
    fetchCompanyWed().then(v => {
      if (alive) setWed(v)
    })
    return () => {
      alive = false
    }
  }, [passed])
  return wed ?? 5
}

// ── DateRangeScrubber (copied from Statistics.jsx) ───────────────────────────
function DateRangeScrubber({ minDate, maxDate, fromDate, toDate, onFromChange, onToChange, compact }) {
  const trackRef = useRef(null)
  const draggingRef = useRef(null)
  const stateRef = useRef({})

  const toMs = d => new Date(d + 'T00:00:00').getTime()
  const minMs = toMs(minDate)
  const maxMs = toMs(maxDate)
  const span = Math.max(maxMs - minMs, 1)
  const pct = d => Math.max(0, Math.min(100, ((toMs(d) - minMs) / span) * 100))

  stateRef.current = { fromDate, toDate, onFromChange, onToChange }

  useEffect(() => {
    const moveTo = clientX => {
      if (!draggingRef.current || !trackRef.current) return
      const rect = trackRef.current.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      const ms = minMs + ratio * span
      const date = isoDate(new Date(ms))
      const { fromDate: fd, toDate: td, onFromChange: ofc, onToChange: otc } = stateRef.current
      if (draggingRef.current === 'from' && date < td) ofc(date)
      if (draggingRef.current === 'to' && date > fd) otc(date)
    }
    const onMouseMove = e => moveTo(e.clientX)
    const onTouchMove = e => {
      if (!draggingRef.current) return
      if (e.cancelable) e.preventDefault()
      const t = e.touches[0]
      if (t) moveTo(t.clientX)
    }
    const onUp = () => {
      draggingRef.current = null
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onUp)
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', onUp)
    document.addEventListener('touchcancel', onUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onUp)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onUp)
      document.removeEventListener('touchcancel', onUp)
    }
  }, [minMs, span])

  const leftPct = pct(fromDate)
  const rightPct = pct(toDate)

  const fmtLabel = d =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

  const startFrom = e => {
    e.preventDefault?.()
    draggingRef.current = 'from'
  }
  const startTo = e => {
    e.preventDefault?.()
    draggingRef.current = 'to'
  }

  if (compact) {
    return (
      <div className="px-3 pt-1 pb-1.5 select-none flex-shrink-0">
        <div ref={trackRef} className="relative h-4 flex items-center select-none">
          <div className="absolute inset-x-0 h-1.5 bg-gray-200 rounded-full" />
          <div
            className="absolute h-1.5 rounded-full bg-green-100 border border-green-200"
            style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
          />
          <div
            onMouseDown={startFrom}
            onTouchStart={startFrom}
            className="absolute w-3.5 h-3.5 rounded-full border-2 bg-white z-20 cursor-grab active:cursor-grabbing touch-none shadow-sm"
            style={{ left: `${leftPct}%`, transform: 'translateX(-50%)', borderColor: FG }}
            title="Drag to change start date"
          />
          <div
            onMouseDown={startTo}
            onTouchStart={startTo}
            className="absolute w-3.5 h-3.5 rounded-full border-2 bg-white z-20 cursor-grab active:cursor-grabbing touch-none shadow-sm"
            style={{ left: `${rightPct}%`, transform: 'translateX(-50%)', borderColor: FG }}
            title="Drag to change end date"
          />
        </div>
        <div className="text-center text-[10px] text-gray-500 mt-1 tabular-nums">
          {fmtLabel(fromDate)} – {fmtLabel(toDate)}
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 sm:px-6 pt-0 pb-2 sm:py-3 bg-white border-t border-gray-100 flex-shrink-0">
      <div className="hidden sm:flex justify-between text-[11px] text-gray-400 mb-1 px-0.5">
        <span>{fmtLabel(minDate)}</span>
        <span>{fmtLabel(maxDate)}</span>
      </div>
      <div ref={trackRef} className="relative h-9 flex items-center select-none">
        <div className="absolute inset-x-0 h-2 bg-gray-200 rounded-full" />
        <div
          className="absolute h-2 rounded-full bg-green-100 border border-green-200"
          style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
        />
        <div
          aria-hidden
          className="absolute w-3 h-3 rounded-full border-2 bg-white pointer-events-none z-10"
          style={{ left: `${leftPct}%`, transform: 'translateX(-50%)', borderColor: FG }}
        />
        <button
          type="button"
          onMouseDown={startFrom}
          onTouchStart={startFrom}
          className="absolute h-8 px-2 flex items-center text-[11px] font-semibold text-green-800 whitespace-nowrap rounded-l-md cursor-grab active:cursor-grabbing z-20 shadow-sm touch-none select-none border border-green-600 bg-green-50 hover:bg-green-100"
          style={{ left: `${leftPct}%`, transform: 'translateX(-100%)' }}
          title="Drag to change start date"
        >
          {fmtLabel(fromDate)}
        </button>
        <div
          aria-hidden
          className="absolute w-3 h-3 rounded-full border-2 bg-white pointer-events-none z-10"
          style={{ left: `${rightPct}%`, transform: 'translateX(-50%)', borderColor: FG }}
        />
        <button
          type="button"
          onMouseDown={startTo}
          onTouchStart={startTo}
          className="absolute h-8 px-2 flex items-center text-[11px] font-semibold text-green-800 whitespace-nowrap rounded-r-md cursor-grab active:cursor-grabbing z-20 shadow-sm touch-none select-none border border-green-600 bg-green-50 hover:bg-green-100"
          style={{ left: `${rightPct}%`, transform: 'translateX(0)' }}
          title="Drag to change end date"
        >
          {fmtLabel(toDate)}
        </button>
      </div>
    </div>
  )
}

// ── StatMiniGraph ────────────────────────────────────────────────────────────
export default function StatMiniGraph({
  stat,
  values,
  weekEndingDay,
  height = 285,
  onExpand,
  expandable = true,
}) {
  const wed = useEffectiveWed(weekEndingDay)
  const large = height > 400
  const [selfExpand, setSelfExpand] = useState(false)
  // External handler wins (Statistics group view drives a shared modal); else
  // the component opens its own modal when expandable.
  const expandHandler = onExpand || (expandable ? () => setSelfExpand(true) : undefined)

  const dateExtent = useMemo(() => {
    const dates = (values || []).map(v => v.period_date).filter(Boolean).sort()
    if (!dates.length) return { min: daysAgo(90), max: today() }
    return { min: dates[0], max: dates[dates.length - 1] }
  }, [values])

  const defWindow = useMemo(() => {
    const min = dateExtent.min
    const max = dateExtent.max
    const count = stat?.default_periods
    if (!count) return { from: min, to: max }
    let f = periodsBackFrom(max, count, stat.tracking, wed)
    if (f < min) f = min
    return { from: f, to: max }
  }, [stat, wed, dateExtent.min, dateExtent.max])

  const [from, setFrom] = useState(defWindow.from)
  const [to, setTo] = useState(defWindow.to)

  useEffect(() => {
    setFrom(defWindow.from)
    setTo(defWindow.to)
  }, [defWindow.from, defWindow.to])

  const data = useMemo(() => {
    // Values that fall inside the current [from, to] window.
    const inWin = (values || []).filter(
      v => v.period_date && v.period_date >= from && v.period_date <= to
    )
    const periods = generatePeriods(from, to, stat.tracking, wed)
    if (periods.length) {
      const mapped = periods.map(p => {
        const match = inWin.find(v => matchesPeriod(v.period_date, p, stat.tracking, wed))
        return { label: periodLabel(p, stat.tracking), value: match ? Number(match.value) : null }
      })
      // If the tracking-based buckets matched at least one value (the normal
      // case), use them. Only fall back when buckets matched NOTHING despite
      // real values existing — e.g. a stat with absent/looser tracking, or dates
      // that don't land on generated period boundaries (which would otherwise
      // render a blank "No data" card).
      if (mapped.some(d => d.value != null) || inWin.length === 0) return mapped
    }
    // Fallback: plot the raw in-window values directly, by date.
    return inWin
      .slice()
      .sort((a, b) => (a.period_date < b.period_date ? -1 : 1))
      .map(v => ({
        label: periodLabel(v.period_date, stat.tracking || 'daily'),
        value: v.value == null ? null : Number(v.value),
      }))
  }, [values, from, to, stat.tracking, wed])

  const hasData = data.some(d => d.value != null)
  const fromClamped = from < dateExtent.min ? dateExtent.min : from > dateExtent.max ? dateExtent.max : from
  const toClamped = to > dateExtent.max ? dateExtent.max : to < dateExtent.min ? dateExtent.min : to

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
      <div className="px-3 pt-2 pb-1 border-b border-gray-100 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-gray-800 truncate" title={stat.name}>
            {stat.name}
          </div>
          <div className="text-[10px] text-gray-400 capitalize">{stat.tracking}</div>
        </div>
        {expandHandler && (
          <button
            type="button"
            onClick={expandHandler}
            title="Expand"
            className="flex-shrink-0 -mt-0.5 -mr-1 p-1 rounded text-gray-400 hover:text-green-700 hover:bg-green-50 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>
        )}
      </div>
      <DateRangeScrubber
        compact
        minDate={dateExtent.min}
        maxDate={dateExtent.max}
        fromDate={fromClamped}
        toDate={toClamped}
        onFromChange={setFrom}
        onToChange={setTo}
      />
      <div
        className={`px-1 pb-2 ${expandHandler ? 'cursor-zoom-in' : ''}`}
        style={{ height }}
        onClick={expandHandler}
      >
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 6, right: 10, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: large ? 11 : 8, fill: '#9ca3af' }}
                interval="preserveStartEnd"
                minTickGap={large ? 24 : 12}
                height={large ? 24 : 18}
              />
              <YAxis
                tick={{ fontSize: large ? 11 : 8, fill: '#9ca3af' }}
                width={large ? 52 : 40}
                tickFormatter={v => fmtShort(v, stat.stat_type)}
              />
              <Tooltip
                formatter={v => fmt(v, stat.stat_type)}
                labelStyle={{ fontSize: 11 }}
                contentStyle={{ fontSize: 11, padding: '4px 8px' }}
              />
              <Line
                type="linear"
                dataKey="value"
                stroke={FG}
                strokeWidth={2}
                dot={large ? { r: 2 } : false}
                connectNulls
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-[11px] text-gray-300">
            No data
          </div>
        )}
      </div>

      {/* Built-in expand modal (only when no external onExpand was supplied). */}
      {selfExpand && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelfExpand(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900 truncate" title={stat.name}>
                  {stat.name}
                </div>
                <div className="text-[11px] text-gray-400 capitalize">{stat.tracking}</div>
              </div>
              <button
                type="button"
                onClick={() => setSelfExpand(false)}
                title="Close"
                className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <StatMiniGraph
                stat={stat}
                values={values}
                weekEndingDay={wed}
                height={460}
                expandable={false}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
