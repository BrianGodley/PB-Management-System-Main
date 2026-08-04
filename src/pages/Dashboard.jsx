// ─────────────────────────────────────────────────────────────────────────────
// Dashboard — the app's main landing page.
//
// Phase 1: a per-user dashboard with a company weather widget, two user-chosen
// stat mini-graphs, and a Settings tab where the user picks those stats (and an
// admin sets the company weather location). The Quick Links action section is
// added in a later phase.
//
// Data model:
//   • dashboard_preferences  — per-user row: { user_id, stat_ids[], layout }
//   • company_settings.weather_location — company-wide weather location (text)
// Run the SQL provided alongside this file before using the Settings tab.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useCachedData } from '../lib/useCachedData'
import { resolveStatSeries } from '../lib/equationStat'
import StatMiniGraphShared from '../components/StatMiniGraph'
import InspirationFeature from '../components/dashboard/InspirationFeature'
import AppreciationFeature from '../components/dashboard/AppreciationFeature'
import AddEmployeeModal from '../components/AddEmployeeModal'
import CoursePlayer from '../components/lms/CoursePlayer'
import QuickEstimateModal from '../components/QuickEstimateModal'
import { useEntitlements, isModuleEnabled } from '../platform'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'

const FG = '#3A5038' // forest green

// ── Dashboard Features ───────────────────────────────────────────────────────
// Each dashboard item is a "Feature": a typed card with its own size (percent of
// default) and, for stat features, a chosen statistic. The ordered list lives
// per-user in dashboard_preferences.layout.features.
const FEATURE_TYPES = [
  {
    type: 'weather',
    label: 'Weather',
    icon: '🌤️',
    desc: 'Current conditions and a 5-day forecast for your location.',
    customizable: false,
  },
  {
    type: 'stat',
    label: 'Stat Graphs',
    icon: '📈',
    desc: 'Mini trend graphs for the statistics you choose.',
    customizable: true,
  },
  {
    type: 'inspirations',
    label: 'Inspiration',
    icon: '✨',
    desc: 'A fresh inspirational quote featured every day.',
    customizable: false,
  },
  {
    type: 'appreciation',
    label: 'Appreciation',
    icon: '🙏',
    desc: 'Note what you’re grateful for and send appreciation to a coworker.',
    customizable: true,
  },
  {
    type: 'quickLinks',
    label: 'Quick Links',
    icon: '⚡',
    desc: 'One-tap shortcuts to common actions and pages.',
    customizable: true,
  },
]

function newFeatureId() {
  return 'f' + Math.random().toString(36).slice(2, 9)
}

// Alignment snapping: given the moving feature's candidate edges on one axis and
// the edges of every other feature, find the nearest match. Within SNAP px it's
// "aligned" (snap + solid guide); within the wider NEAR band it shows a dotted
// guide without snapping. Returns { delta, pos, aligned } or null.
function snapAxis(draggedEdges, otherEdges, SNAP = 6, NEAR = 16) {
  let best = null
  for (const de of draggedEdges) {
    for (const oe of otherEdges) {
      const diff = oe - de
      const ad = Math.abs(diff)
      if (ad <= NEAR && (best == null || ad < best.ad)) best = { diff, pos: oe, ad }
    }
  }
  if (!best) return null
  return { delta: best.diff, pos: best.pos, aligned: best.ad <= SNAP }
}

// Build the feature list from saved prefs. Uses layout.features when present;
// otherwise migrates the legacy shape (weather + one card per stat_id) so
// existing dashboards keep working.
function buildFeatures(prefs) {
  const layout = prefs?.layout || {}
  const rawList =
    Array.isArray(layout.features) && layout.features.length
      ? layout.features
      : (() => {
          const w = Number(layout.statW) || 100
          const h = Number(layout.statH) || 100
          const f = [{ type: 'weather', w, h }]
          const ids = (prefs?.stat_ids || []).map(Number)
          if (ids.length) f.push({ type: 'stat', statIds: ids, w, h })
          f.push({ type: 'quickLinks', w: 100, h: 100 })
          return f
        })()

  // Collapse to at most one feature per type. All stat graphs are ONE feature,
  // so merge any legacy per-stat features into a single statIds list.
  const byType = new Map()
  for (const f of rawList) {
    const type = f.type || 'stat'
    if (!byType.has(type)) byType.set(type, { ...f, type })
    if (type === 'stat') {
      const cur = byType.get('stat')
      const ids = new Set((cur.statIds || []).map(Number))
      if (Array.isArray(f.statIds)) f.statIds.forEach(id => ids.add(Number(id)))
      if (f.statId != null) ids.add(Number(f.statId))
      cur.statIds = [...ids]
    }
  }

  // Normalize + assign default positions for anything without x/y.
  let i = 0
  const out = []
  for (const f of byType.values()) {
    const col = i % 3
    const row = Math.floor(i / 3)
    out.push({
      id: f.id || newFeatureId(),
      type: f.type,
      w: Number(f.w) || 100,
      h: Number(f.h) || 100,
      x: Number.isFinite(f.x) ? f.x : col * 356,
      y: Number.isFinite(f.y) ? f.y : row * 340,
      statIds: f.type === 'stat' ? (f.statIds || []).map(Number) : undefined,
      lines: f.type === 'appreciation' ? Number(f.lines) || 3 : undefined,
      links: f.type === 'quickLinks' && Array.isArray(f.links) ? f.links : undefined,
    })
    i++
  }
  return out
}

// ── Quick-link buttons. Batch 1 wires each to its page; richer behaviour
// (auto-opening modals, the multi-step Quick Estimate flow) follows in later
// batches.
// `module` (when set) gates the action to a plan/package; untagged = always shown.
const QUICK_LINKS = [
  { label: 'Quick Estimate', icon: '📝', key: 'quick-estimate', module: '/bids' },
  { label: 'Quick Bid', icon: '📋', to: '/bids', module: '/bids' },
  { label: 'Quick Job Schedule', icon: '📅', to: '/jobs?tab=schedule&addSchedule=1', module: '/jobs' },
  { label: 'Quick Daily Log', icon: '🗒️', to: '/daily-logs?new=1', module: '/jobs' },
  { label: 'Continue Training', icon: '🎓', key: 'continue-training', module: '/training' },
  { label: 'Quick Add Employee', icon: '👤', key: 'add-employee', module: '/hr' },
  { label: 'Quick Add Vendor/Sub', icon: '🚜', key: 'add-vendor', module: '/portal/subs' },
  { label: 'Quick Add Statistic', icon: '📈', to: '/statistics?new=1', module: '/statistics' },
]

// ── WMO weather codes → [emoji, label] ───────────────────────────────────────
const WX_CODES = {
  0: ['☀️', 'Clear'],
  1: ['🌤️', 'Mainly clear'],
  2: ['⛅', 'Partly cloudy'],
  3: ['☁️', 'Overcast'],
  45: ['🌫️', 'Fog'],
  48: ['🌫️', 'Rime fog'],
  51: ['🌦️', 'Light drizzle'],
  53: ['🌦️', 'Drizzle'],
  55: ['🌦️', 'Heavy drizzle'],
  56: ['🌧️', 'Freezing drizzle'],
  57: ['🌧️', 'Freezing drizzle'],
  61: ['🌦️', 'Light rain'],
  63: ['🌧️', 'Rain'],
  65: ['🌧️', 'Heavy rain'],
  66: ['🌧️', 'Freezing rain'],
  67: ['🌧️', 'Freezing rain'],
  71: ['🌨️', 'Light snow'],
  73: ['🌨️', 'Snow'],
  75: ['❄️', 'Heavy snow'],
  77: ['🌨️', 'Snow grains'],
  80: ['🌦️', 'Light showers'],
  81: ['🌧️', 'Showers'],
  82: ['⛈️', 'Violent showers'],
  85: ['🌨️', 'Snow showers'],
  86: ['🌨️', 'Snow showers'],
  95: ['⛈️', 'Thunderstorm'],
  96: ['⛈️', 'Thunderstorm w/ hail'],
  99: ['⛈️', 'Thunderstorm w/ hail'],
}
const wxInfo = code => WX_CODES[code] || ['🌡️', '—']

// ── Small inline save-status pill ────────────────────────────────────────────
function SaveMsg({ msg }) {
  if (!msg) return null
  const ok = msg.startsWith('ok:')
  return (
    <span
      className={`text-xs px-2 py-1 rounded ${
        ok
          ? 'text-green-800 bg-green-50 border border-green-200'
          : 'text-red-700 bg-red-50 border border-red-200'
      }`}
    >
      {msg.slice(msg.indexOf(':') + 1)}
    </span>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// WEATHER WIDGET — current conditions + 5-day outlook from the keyless
// Open-Meteo API. `location` is a free-text place name (city/state or ZIP).
// ═════════════════════════════════════════════════════════════════════════════
function WeatherWidget({ location, onSaveLocation, forecastDays = 5 }) {
  const [wx, setWx] = useState({ status: 'loading', current: null, days: [], place: '' })
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [dayIdx, setDayIdx] = useState(null) // selected 5-day index, or null

  useEffect(() => {
    const loc = (location || '').trim()
    if (!loc) {
      setWx({ status: 'no-location', current: null, days: [], place: '' })
      return
    }
    let alive = true
    setWx(w => ({ ...w, status: 'loading' }))
    setDayIdx(null)
    ;(async () => {
      try {
        const geo = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
            loc
          )}&count=1&language=en&format=json`
        ).then(r => r.json())
        const place = geo?.results?.[0]
        if (!place) throw new Error('not-found')
        const fc = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
            `&current=temperature_2m,weather_code` +
            `&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,` +
            `apparent_temperature_min,precipitation_sum,precipitation_probability_max,` +
            `wind_speed_10m_max,wind_gusts_10m_max,uv_index_max,sunrise,sunset` +
            `&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch` +
            `&timezone=auto&forecast_days=${forecastDays}`
        ).then(r => r.json())
        if (!alive) return
        const d = fc.daily || {}
        const at = (arr, i) => (arr && arr[i] != null ? arr[i] : null)
        const days = (d.time || []).map((t, i) => ({
          date: t,
          code: at(d.weather_code, i) ?? 0,
          hi: Math.round(at(d.temperature_2m_max, i) ?? 0),
          lo: Math.round(at(d.temperature_2m_min, i) ?? 0),
          feelsHi: Math.round(at(d.apparent_temperature_max, i) ?? 0),
          feelsLo: Math.round(at(d.apparent_temperature_min, i) ?? 0),
          precip: at(d.precipitation_sum, i) ?? 0,
          precipChance: at(d.precipitation_probability_max, i) ?? 0,
          wind: Math.round(at(d.wind_speed_10m_max, i) ?? 0),
          gust: Math.round(at(d.wind_gusts_10m_max, i) ?? 0),
          uv: Math.round(at(d.uv_index_max, i) ?? 0),
          sunrise: at(d.sunrise, i),
          sunset: at(d.sunset, i),
        }))
        setWx({
          status: 'ok',
          current: {
            temp: Math.round(fc.current?.temperature_2m ?? 0),
            code: fc.current?.weather_code ?? 0,
          },
          days,
          place: place.admin1 ? `${place.name}, ${place.admin1}` : place.name,
        })
      } catch {
        if (alive) setWx({ status: 'error', current: null, days: [], place: '' })
      }
    })()
    return () => {
      alive = false
    }
  }, [location, forecastDays])

  const dayLabel = (iso, idx) => {
    if (idx === 0) return 'Today'
    return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })
  }
  const fullDay = iso =>
    new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    })
  const clockTime = iso => {
    if (!iso) return '—'
    const d = new Date(iso)
    return isNaN(d.getTime())
      ? '—'
      : d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  function commitEdit() {
    const v = draft.trim()
    setEditing(false)
    if (v && v !== (location || '').trim() && onSaveLocation) onSaveLocation(v)
  }

  const sel = dayIdx != null ? wx.days[dayIdx] : null

  return (
    <div className="card">
      {/* Header — title + editable per-user location */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <h3 className="text-base font-bold text-gray-800 flex-shrink-0">Weather</h3>
        {editing ? (
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <input
              autoFocus
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') commitEdit()
                if (e.key === 'Escape') setEditing(false)
              }}
              placeholder="City, State or ZIP"
              className="input text-xs py-1 flex-1 min-w-0"
            />
            <button
              onClick={commitEdit}
              className="text-xs font-semibold text-green-700 hover:text-green-800 px-1"
            >
              Save
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setDraft(location || '')
              setEditing(true)
            }}
            title="Change location"
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-green-700 min-w-0"
          >
            <span className="truncate">{wx.place || location || 'Set location'}</span>
            <span aria-hidden="true">✎</span>
          </button>
        )}
      </div>

      {wx.status === 'loading' && (
        <div className="flex items-center justify-center py-10">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-700" />
        </div>
      )}

      {wx.status === 'no-location' && (
        <p className="text-xs text-gray-400 py-10 text-center">
          No location set — use the pencil above to choose one.
        </p>
      )}

      {wx.status === 'error' && (
        <p className="text-xs text-gray-400 py-10 text-center">
          Couldn't load weather — try a different location above.
        </p>
      )}

      {wx.status === 'ok' && wx.current && (
        <>
          {/* Current conditions */}
          <div className="flex items-center gap-4 mb-5">
            <span className="text-6xl leading-none">{wxInfo(wx.current.code)[0]}</span>
            <div>
              <p className="text-5xl font-bold text-gray-900 leading-none">{wx.current.temp}°</p>
              <p className="text-base text-gray-600 mt-1.5">{wxInfo(wx.current.code)[1]}</p>
            </div>
          </div>
          {/* 5-day outlook — click a day for detail */}
          <div className="grid grid-cols-5 gap-1 border-t border-gray-100 pt-3">
            {wx.days.map((d, i) => (
              <button
                key={d.date}
                onClick={() => setDayIdx(dayIdx === i ? null : i)}
                className={`text-center rounded-lg py-1.5 transition-colors ${
                  dayIdx === i ? 'bg-green-50 ring-1 ring-green-200' : 'hover:bg-gray-50'
                }`}
              >
                <p className="text-xs font-semibold text-gray-500 uppercase">
                  {dayLabel(d.date, i)}
                </p>
                <p className="text-2xl leading-tight my-1">{wxInfo(d.code)[0]}</p>
                <p className="text-sm font-semibold text-gray-800">{d.hi}°</p>
                <p className="text-sm text-gray-400">{d.lo}°</p>
              </button>
            ))}
          </div>

          {/* Selected-day detail */}
          {sel && (
            <div className="mt-3 border-t border-gray-100 pt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-800">{fullDay(sel.date)}</p>
                <button
                  onClick={() => setDayIdx(null)}
                  className="text-gray-300 hover:text-gray-600 text-sm leading-none"
                >
                  ✕
                </button>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-4xl leading-none">{wxInfo(sel.code)[0]}</span>
                <div>
                  <p className="text-base font-semibold text-gray-800">
                    {sel.hi}° / {sel.lo}°
                  </p>
                  <p className="text-sm text-gray-500">{wxInfo(sel.code)[1]}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                {[
                  ['Feels like', `${sel.feelsHi}° / ${sel.feelsLo}°`],
                  ['Rain chance', `${sel.precipChance}%`],
                  ['Precipitation', `${sel.precip.toFixed(2)} in`],
                  ['Wind', `${sel.wind} mph`],
                  ['Wind gusts', `${sel.gust} mph`],
                  ['UV index', `${sel.uv}`],
                  ['Sunrise', clockTime(sel.sunrise)],
                  ['Sunset', clockTime(sel.sunset)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-gray-500">{k}</span>
                    <span className="font-medium text-gray-800">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// STAT MINI-GRAPH — a small trend line for one statistic from the stat system.
// ═════════════════════════════════════════════════════════════════════════════
// Dashboard stat card — loads the stat's series (stored or computed equation
// stat) and renders the SHARED StatMiniGraph so it matches the Statistics Group
// View config exactly (circle-handle scrubber, default_periods window, angular
// line, click-to-expand). weekEndingDay is self-fetched by the shared component.
function StatMiniGraph({ stat, allStats = [], height }) {
  const [values, setValues] = useState(null)

  useEffect(() => {
    if (!stat?.id) {
      setValues([])
      return
    }
    let alive = true
    setValues(null)
    // resolveStatSeries handles stored stats AND computed equation stats.
    resolveStatSeries(stat, allStats)
      .then(series => {
        if (!alive) return
        setValues(
          (series || []).map(r => ({ period_date: r.period_date, value: Number(r.value) }))
        )
      })
      .catch(() => {
        if (alive) setValues([])
      })
    return () => {
      alive = false
    }
  }, [stat?.id, allStats])

  if (!stat) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
        <div className="px-3 pt-2 pb-1 border-b border-gray-100">
          <div className="text-xs font-semibold text-gray-800">Stat</div>
        </div>
        <p className="text-xs text-gray-400 py-16 text-center">
          Pick a statistic in the Settings tab.
        </p>
      </div>
    )
  }
  if (values === null) {
    return (
      <div
        className="bg-white border border-gray-200 rounded-xl flex items-center justify-center"
        style={{ minHeight: 220 }}
      >
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-700" />
      </div>
    )
  }
  return <StatMiniGraphShared stat={stat} values={values} height={height} />
}

// ═════════════════════════════════════════════════════════════════════════════
// CONTINUE TRAINING — picker for the user's in-progress LMS checksheets.
// ═════════════════════════════════════════════════════════════════════════════
async function fetchInProgressTraining(email) {
  if (!email) return []
  const { data: emp } = await supabase
    .from('employees')
    .select('id')
    .eq('email', email)
    .maybeSingle()
  if (!emp) return []
  const { data: asgn } = await supabase
    .from('lms_assignments')
    .select('*, course:lms_courses(*)')
    .eq('employee_id', emp.id)
    .order('assigned_at', { ascending: false })
  if (!asgn?.length) return []
  const courseIds = [...new Set(asgn.map(a => a.course_id))]
  const assignmentIds = asgn.map(a => a.id)
  const [stepsRes, compsRes] = await Promise.all([
    supabase.from('lms_steps').select('id, course_id').in('course_id', courseIds),
    supabase
      .from('lms_step_completions')
      .select('assignment_id, step_id')
      .in('assignment_id', assignmentIds),
  ])
  const steps = stepsRes.data || []
  const comps = compsRes.data || []
  return asgn
    .map(a => ({
      ...a,
      total_steps: steps.filter(s => s.course_id === a.course_id).length,
      done_steps: comps.filter(c => c.assignment_id === a.id).length,
    }))
    .filter(a => a.done_steps > 0 && a.done_steps < a.total_steps)
}

function ContinueTrainingModal({ email, onPick, onClose }) {
  const [list, setList] = useState(null)

  useEffect(() => {
    let alive = true
    fetchInProgressTraining(email).then(r => {
      if (alive) setList(r)
    })
    return () => {
      alive = false
    }
  }, [email])

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Continue Training</h3>
        <p className="text-xs text-gray-500 mb-4">Checksheets you have in progress.</p>
        {list === null ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-700" />
          </div>
        ) : list.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">
            Nothing in progress — you're all caught up.
          </p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {list.map(a => {
              const pct = a.total_steps ? Math.round((a.done_steps / a.total_steps) * 100) : 0
              return (
                <button
                  key={a.id}
                  onClick={() => onPick(a)}
                  className="w-full text-left rounded-xl border border-gray-200 px-4 py-3 hover:border-green-300 hover:bg-green-50 transition-colors"
                >
                  <p className="text-sm font-semibold text-gray-800">
                    {a.course?.title || 'Untitled course'}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">
                      {a.done_steps}/{a.total_steps}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
        <button
          onClick={onClose}
          className="mt-4 w-full py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          Close
        </button>
      </div>
    </div>
  )
}

// ── Data fetch (cached) ──────────────────────────────────────────────────────
// Tolerant of a not-yet-created dashboard_preferences table / weather_location
// column — the dashboard still renders with defaults until the SQL is run.
async function fetchDashboardData(userId) {
  const [prefsRes, settingsRes, statsRes, profRes, posRes] = await Promise.all([
    supabase.from('dashboard_preferences').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('company_settings').select('id, weather_location').maybeSingle(),
    supabase
      .from('statistics')
      .select('id, name, stat_category, equation_parts, tracking, stat_type, default_periods')
      .eq('archived', false)
      .order('name'),
    supabase.from('profiles').select('role').eq('id', userId).maybeSingle(),
    supabase.from('positions').select('id, title').order('title'),
  ])
  return {
    prefs: prefsRes.data || { user_id: userId, stat_ids: [], layout: {} },
    settingsId: settingsRes.data?.id ?? null,
    weatherLocation: settingsRes.data?.weather_location || '',
    stats: statsRes.data || [],
    role: profRes.data?.role || null,
    positions: posRes.data || [],
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { moduleKeys } = useEntitlements()
  const quickLinks = QUICK_LINKS.filter(q => !q.module || isModuleEnabled(moduleKeys, q.module))
  const [tab, setTab] = useState('dashboard')
  // Page backgrounds are applied app-wide by Layout (per module, via the
  // Customize page); the Dashboard no longer manages backgrounds.
  const [showAddEmp, setShowAddEmp] = useState(false)
  const [showTraining, setShowTraining] = useState(false)
  const [trainingAssignment, setTrainingAssignment] = useState(null)
  const [showQuickEst, setShowQuickEst] = useState(false)
  const [showVendorChoose, setShowVendorChoose] = useState(false)

  const { data, loading, refresh } = useCachedData(
    user?.id ? `dashboard:${user.id}` : 'dashboard:anon',
    () => fetchDashboardData(user?.id)
  )

  const prefs = data?.prefs || { stat_ids: [], layout: {} }
  const stats = data?.stats || []
  const weatherLocation = data?.weatherLocation || ''
  // Effective weather location for the widget: this user's own pick overrides
  // the company-wide default.
  const myWeatherLocation = prefs.weather_location || weatherLocation
  const settingsId = data?.settingsId ?? null
  const isAdmin = data?.role === 'admin' || data?.role === 'super_admin'
  const positions = data?.positions || []

  // ── Dashboard Features (typed, resizable, drag-to-reorder) ─────────────────
  // Live feature list, seeded from saved prefs and re-synced whenever the
  // dashboard data reloads (e.g. after saving in Settings).
  const savedFeatures = useMemo(() => buildFeatures(prefs), [data])
  const [features, setFeatures] = useState(savedFeatures)
  useEffect(() => {
    setFeatures(savedFeatures)
  }, [savedFeatures])

  // Persist the ordered feature list (+ derived stat_ids for compatibility).
  async function persistFeatures(feats) {
    if (!user?.id) return
    const nextLayout = { ...(prefs.layout || {}), features: feats }
    const stat_ids = feats
      .filter(f => f.type === 'stat')
      .flatMap(f => f.statIds || [])
      .map(Number)
    await supabase.from('dashboard_preferences').upsert(
      { user_id: user.id, stat_ids, layout: nextLayout, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
  }

  // Edit mode: when on, features can be freely positioned (right-click hold to
  // drag) and resized by a corner handle. Off = normal read-only dashboard.
  const [editMode, setEditMode] = useState(false)
  // Clicking a feature's expand control opens an enlarged modal (like stats).
  const [expanded, setExpanded] = useState(null)
  // Alignment guide lines shown while dragging/resizing ([] when idle).
  const [guides, setGuides] = useState([])

  const clampPct = v => Math.max(40, Math.min(300, v))
  const BASE_W = 340
  const BASE_H = 285

  // Canvas box (left/top/right/bottom in px) for a feature.
  const boxOf = f => {
    const d = featureDims(f)
    const l = Number(f.x) || 0
    const t = Number(f.y) || 0
    return { l, t, r: l + d.pxWidth, b: t + d.blockHeight }
  }

  // Free-position drag — like the Workflows graph. Click-and-hold a card, drag
  // it anywhere, release to drop. Shows green alignment guides vs other cards.
  function onMoveStart(e, i) {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startY = e.clientY
    const f0 = features[i]
    const ox = Number(f0.x) || 0
    const oy = Number(f0.y) || 0
    const dims = featureDims(f0)
    const w = dims.pxWidth
    const h = dims.blockHeight
    const others = features.filter((_, idx) => idx !== i).map(boxOf)
    const xEdges = others.flatMap(o => [o.l, o.r])
    const yEdges = others.flatMap(o => [o.t, o.b])
    const move = ev => {
      let nx = Math.max(0, ox + (ev.clientX - startX))
      let ny = Math.max(0, oy + (ev.clientY - startY))
      const gs = []
      const sx = snapAxis([nx, nx + w], xEdges)
      if (sx) {
        if (sx.aligned) nx += sx.delta
        gs.push({ o: 'v', pos: sx.pos, aligned: sx.aligned })
      }
      const sy = snapAxis([ny, ny + h], yEdges)
      if (sy) {
        if (sy.aligned) ny += sy.delta
        gs.push({ o: 'h', pos: sy.pos, aligned: sy.aligned })
      }
      setFeatures(prev => prev.map((ff, idx) => (idx === i ? { ...ff, x: nx, y: ny } : ff)))
      setGuides(gs)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      setGuides([])
      setFeatures(prev => {
        persistFeatures(prev)
        return prev
      })
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  // Corner-handle resize with the same alignment guides (right + bottom edges).
  function onResizeStart(e, i) {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startY = e.clientY
    const f0 = features[i]
    const startW = Number(f0.w) || 100
    const startH = Number(f0.h) || 100
    const left = Number(f0.x) || 0
    const top = Number(f0.y) || 0
    const count = f0.type === 'stat' ? Math.max(1, (f0.statIds || []).length) : 1
    // Convert between the dragged "scaled" height and the on-canvas bottom edge.
    const scaledToBottom = s => (f0.type === 'stat' ? top + (s + 130) * count + 16 : top + s + 40)
    const bottomToScaled = b => (f0.type === 'stat' ? (b - top - 16) / count - 130 : b - top - 40)
    const others = features.filter((_, idx) => idx !== i).map(boxOf)
    const xEdges = others.flatMap(o => [o.l, o.r])
    const yEdges = others.flatMap(o => [o.t, o.b])
    const move = ev => {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      let wpx = (BASE_W * startW) / 100 + dx
      let scaledH = (BASE_H * startH) / 100 + dy
      const gs = []
      const sx = snapAxis([left + wpx], xEdges)
      if (sx) {
        if (sx.aligned) wpx = sx.pos - left
        gs.push({ o: 'v', pos: sx.pos, aligned: sx.aligned })
      }
      const sy = snapAxis([scaledToBottom(scaledH)], yEdges)
      if (sy) {
        if (sy.aligned) scaledH = bottomToScaled(sy.pos)
        gs.push({ o: 'h', pos: sy.pos, aligned: sy.aligned })
      }
      const newW = sx?.aligned
        ? clampPct(Math.round((wpx / BASE_W) * 100))
        : clampPct(Math.round((wpx / BASE_W) * 100 / 5) * 5)
      const newH = sy?.aligned
        ? clampPct(Math.round((scaledH / BASE_H) * 100))
        : clampPct(Math.round((scaledH / BASE_H) * 100 / 5) * 5)
      setFeatures(prev => prev.map((ff, idx) => (idx === i ? { ...ff, w: newW, h: newH } : ff)))
      setGuides(gs)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      setGuides([])
      setFeatures(prev => {
        persistFeatures(prev)
        return prev
      })
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  function featureDims(f) {
    const pxWidth = Math.round(340 * ((Number(f.w) || 100) / 100))
    const scaled = Math.round(285 * ((Number(f.h) || 100) / 100))
    return {
      pxWidth,
      width: `${pxWidth}px`,
      statHeight: scaled,
      minHeight: scaled,
      // Rough on-canvas block height (card chrome + body) for sizing the canvas.
      // The stat feature stacks one graph per selected statistic.
      blockHeight:
        f.type === 'stat'
          ? (scaled + 130) * Math.max(1, (f.statIds || []).length) + 16
          : scaled + 40,
    }
  }

  // Total canvas height so absolutely-positioned features always fit.
  const canvasHeight = Math.max(
    420,
    ...features.map(f => (Number(f.y) || 0) + featureDims(f).blockHeight + 24)
  )

  // Sync the saved per-user background from the DB once prefs load (so the
  // choice follows the user across devices). Runs once; user changes after
  // that are authoritative.

  // Persist this user's chosen weather location (per-user, in dashboard_preferences).
  async function saveWeatherLocation(loc) {
    if (!user?.id) return
    await supabase.from('dashboard_preferences').upsert(
      {
        user_id: user.id,
        weather_location: (loc || '').trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    refresh()
  }

  if (loading)
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-700" />
      </div>
    )

  return (
    <div>
      {/* Tab bar */}
      <div className="relative bg-white border-b border-gray-200 flex justify-center gap-0 mb-5 rounded-xl">
        {[
          { key: 'dashboard', label: '🏠 Dashboard' },
          { key: 'settings', label: '⚙️ Settings' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-green-700 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
        {/* Edit / Done — drag + resize dashboard features. */}
        {tab === 'dashboard' && (
          <button
            onClick={() => {
              if (editMode) persistFeatures(features)
              setEditMode(v => !v)
            }}
            className={`absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
              editMode
                ? 'bg-green-700 text-white border-green-700 hover:bg-green-800'
                : 'border-gray-300 text-gray-600 bg-white hover:bg-gray-50'
            }`}
          >
            {editMode ? '✓ Done' : '✎ Edit'}
          </button>
        )}
      </div>

      {tab === 'dashboard' && (
        <>
          {editMode && (
            <p className="text-xs text-gray-500 mb-3">
              <span className="font-semibold">Click and hold</span> a feature to drag it anywhere,
              then release to drop. Drag the corner handle to resize.
            </p>
          )}
          <div className="relative" style={{ minHeight: canvasHeight }}>
            {features.map((f, i) => {
              const dims = featureDims(f)
              return (
                <div
                  key={f.id}
                  style={{
                    position: 'absolute',
                    left: Number(f.x) || 0,
                    top: Number(f.y) || 0,
                    width: dims.width,
                    touchAction: editMode ? 'none' : undefined,
                  }}
                  onPointerDown={editMode ? e => onMoveStart(e, i) : undefined}
                  className={`group ${
                    editMode ? 'ring-2 ring-green-300 rounded-xl select-none cursor-move' : ''
                  }`}
                >
                  {/* Enlarge — view mode. Stat cards have their own built-in expand. */}
                  {!editMode && f.type !== 'stat' && (
                    <button
                      type="button"
                      onClick={() => setExpanded(f)}
                      title="Enlarge"
                      className="absolute -top-2 -right-2 z-30 w-6 h-6 flex items-center justify-center rounded-full bg-white border border-gray-200 shadow-sm text-gray-400 hover:text-green-700 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 3 21 3 21 9" />
                        <polyline points="9 21 3 21 3 15" />
                        <line x1="21" y1="3" x2="14" y2="10" />
                        <line x1="3" y1="21" x2="10" y2="14" />
                      </svg>
                    </button>
                  )}
                  {f.type === 'weather' && (
                    <WeatherWidget
                      location={myWeatherLocation}
                      onSaveLocation={saveWeatherLocation}
                    />
                  )}
                  {f.type === 'stat' && (
                    <div className="flex flex-col gap-4">
                      {(f.statIds || []).map(id => (
                        <StatMiniGraph
                          key={id}
                          stat={stats.find(s => s.id === id) || null}
                          allStats={stats}
                          height={dims.statHeight}
                        />
                      ))}
                      {(!f.statIds || f.statIds.length === 0) && (
                        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center text-xs text-gray-400">
                          No statistics yet — use Customize on the Stat Graphs feature.
                        </div>
                      )}
                    </div>
                  )}
                  {f.type === 'inspirations' && (
                    <InspirationFeature style={{ minHeight: dims.minHeight }} />
                  )}
                  {f.type === 'appreciation' && (
                    <AppreciationFeature
                      userId={user?.id}
                      lineCount={f.lines || 3}
                      style={{ minHeight: dims.minHeight }}
                    />
                  )}
                  {f.type === 'quickLinks' && (
                    <div className="card" style={{ minHeight: dims.minHeight }}>
                      <h3 className="text-sm font-bold text-gray-800 mb-3">Quick Links</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {(f.links
                          ? quickLinks.filter(q => f.links.includes(q.key || q.to || q.label))
                          : quickLinks
                        ).map(q => (
                          <button
                            key={q.label}
                            onClick={() => {
                              if (editMode) return
                              if (q.key === 'add-employee') setShowAddEmp(true)
                              else if (q.key === 'continue-training') setShowTraining(true)
                              else if (q.key === 'quick-estimate') setShowQuickEst(true)
                              else if (q.key === 'add-vendor') setShowVendorChoose(true)
                              else navigate(q.to)
                            }}
                            className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-4 hover:border-green-300 hover:bg-green-50 transition-colors"
                          >
                            <span className="text-2xl leading-none">{q.icon}</span>
                            <span className="text-xs font-medium text-gray-700 text-center leading-tight">
                              {q.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Resize handle — edit mode only; drag the corner like an image. */}
                  {editMode && (
                    <div
                      onPointerDown={e => onResizeStart(e, i)}
                      title="Drag to resize"
                      className="absolute -bottom-1.5 -right-1.5 z-30 w-4 h-4 rounded-sm bg-green-700 border-2 border-white shadow cursor-nwse-resize"
                    />
                  )}
                </div>
              )
            })}

            {/* Alignment guides — dotted when near another card's edge, solid
                green when aligned (and snapped). */}
            {guides.map((g, gi) =>
              g.o === 'v' ? (
                <div
                  key={`g${gi}`}
                  className="pointer-events-none absolute top-0 bottom-0 z-40"
                  style={{
                    left: g.pos,
                    width: 0,
                    borderLeft: g.aligned ? '2px solid #16a34a' : '1px dashed #9ca3af',
                  }}
                />
              ) : (
                <div
                  key={`g${gi}`}
                  className="pointer-events-none absolute left-0 right-0 z-40"
                  style={{
                    top: g.pos,
                    height: 0,
                    borderTop: g.aligned ? '2px solid #16a34a' : '1px dashed #9ca3af',
                  }}
                />
              )
            )}
          </div>

          {/* Enlarged feature modal (click a card's ⤢ to open) */}
          {expanded && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              onClick={() => setExpanded(null)}
            >
              <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-gray-900">
                    {FEATURE_TYPES.find(t => t.type === expanded.type)?.label || 'Feature'}
                  </h3>
                  <button
                    onClick={() => setExpanded(null)}
                    title="Close"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-4">
                  {expanded.type === 'weather' && (
                    <WeatherWidget
                      location={myWeatherLocation}
                      onSaveLocation={saveWeatherLocation}
                      forecastDays={10}
                    />
                  )}
                  {expanded.type === 'stat' && (
                    <div className="flex flex-col gap-4">
                      {(expanded.statIds || []).map(id => (
                        <StatMiniGraph
                          key={id}
                          stat={stats.find(s => s.id === id) || null}
                          allStats={stats}
                          height={460}
                        />
                      ))}
                    </div>
                  )}
                  {expanded.type === 'inspirations' && (
                    <InspirationFeature style={{ minHeight: 320 }} />
                  )}
                  {expanded.type === 'appreciation' && (
                    <AppreciationFeature
                      userId={user?.id}
                      lineCount={expanded.lines || 3}
                      style={{ minHeight: 320 }}
                      expanded
                    />
                  )}
                  {expanded.type === 'quickLinks' && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {(expanded.links
                        ? quickLinks.filter(q => expanded.links.includes(q.key || q.to || q.label))
                        : quickLinks
                      ).map(q => (
                        <button
                          key={q.label}
                          onClick={() => {
                            setExpanded(null)
                            if (q.key === 'add-employee') setShowAddEmp(true)
                            else if (q.key === 'continue-training') setShowTraining(true)
                            else if (q.key === 'quick-estimate') setShowQuickEst(true)
                            else if (q.key === 'add-vendor') setShowVendorChoose(true)
                            else navigate(q.to)
                          }}
                          className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-5 hover:border-green-300 hover:bg-green-50 transition-colors"
                        >
                          <span className="text-3xl leading-none">{q.icon}</span>
                          <span className="text-sm font-medium text-gray-700 text-center leading-tight">
                            {q.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {showAddEmp && (
            <AddEmployeeModal
              positions={positions}
              onClose={() => setShowAddEmp(false)}
              onSave={() => setShowAddEmp(false)}
            />
          )}

          {showTraining && (
            <ContinueTrainingModal
              email={user?.email}
              onPick={a => {
                setShowTraining(false)
                setTrainingAssignment(a)
              }}
              onClose={() => setShowTraining(false)}
            />
          )}
          {trainingAssignment && (
            <CoursePlayer
              assignment={trainingAssignment}
              onClose={() => setTrainingAssignment(null)}
            />
          )}
          {showQuickEst && <QuickEstimateModal onClose={() => setShowQuickEst(false)} />}

          {showVendorChoose && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/40"
                onClick={() => setShowVendorChoose(false)}
              />
              <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-xs mx-4 p-6">
                <h2 className="text-base font-bold text-gray-900 mb-1">Add New</h2>
                <p className="text-xs text-gray-500 mb-4">Subcontractor or vendor?</p>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setShowVendorChoose(false)
                      navigate('/portal/subs?new=sub')
                    }}
                    className="block w-full rounded-xl border border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-800 hover:border-green-300 hover:bg-green-50"
                  >
                    🚜 Subcontractor
                  </button>
                  <button
                    onClick={() => {
                      setShowVendorChoose(false)
                      navigate('/portal/subs?new=vendor')
                    }}
                    className="block w-full rounded-xl border border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-800 hover:border-green-300 hover:bg-green-50"
                  >
                    🛒 Vendor
                  </button>
                </div>
                <button
                  onClick={() => setShowVendorChoose(false)}
                  className="mt-4 w-full py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'settings' && (
        <DashboardSettings
          prefs={prefs}
          stats={stats}
          userId={user?.id}
          isAdmin={isAdmin}
          weatherLocation={weatherLocation}
          settingsId={settingsId}
          initialFeatures={features}
          onSaveFeatures={feats => {
            setFeatures(feats)
            persistFeatures(feats)
          }}
          onSaved={refresh}
        />
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Feature customize modal — per-feature options (stat list, appreciation lines,
// quick-link selection). Edits the draft feature via onPatch; committed on Save.
// ═════════════════════════════════════════════════════════════════════════════
function FeatureCustomizeModal({ type, feature, stats, onPatch, onClose }) {
  const meta = FEATURE_TYPES.find(t => t.type === type)
  const linkId = q => q.key || q.to || q.label

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">
            Customize {meta ? `${meta.icon} ${meta.label}` : type}
          </h3>
          <button
            onClick={onClose}
            title="Done"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>
        <div className="p-4 space-y-3">
          {type === 'stat' &&
            (() => {
              const selected = feature?.statIds || []
              const available = stats.filter(s => !selected.includes(s.id))
              return (
                <>
                  <p className="text-xs text-gray-500">
                    Choose which statistics show in this feature. They stack top to bottom.
                  </p>
                  <div className="space-y-2">
                    {selected.length === 0 && (
                      <p className="text-xs text-gray-400">No statistics selected yet.</p>
                    )}
                    {selected.map(id => {
                      const st = stats.find(s => s.id === id)
                      return (
                        <div
                          key={id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2"
                        >
                          <span className="text-sm text-gray-800 truncate">
                            {st ? st.name : `Stat #${id}`}
                          </span>
                          <button
                            type="button"
                            onClick={() => onPatch({ statIds: selected.filter(x => x !== id) })}
                            className="flex-shrink-0 text-gray-400 hover:text-red-600"
                            title="Remove"
                          >
                            ✕
                          </button>
                        </div>
                      )
                    })}
                  </div>
                  <select
                    className="input w-full"
                    value=""
                    onChange={e => {
                      const id = Number(e.target.value)
                      if (id) onPatch({ statIds: [...selected, id] })
                    }}
                  >
                    <option value="">+ Add a statistic…</option>
                    {available.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.stat_category ? ` (${s.stat_category})` : ''}
                      </option>
                    ))}
                  </select>
                </>
              )
            })()}

          {type === 'appreciation' &&
            (() => {
              const lines = feature?.lines || 3
              return (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Number of lines</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onPatch({ lines: Math.max(1, lines - 1) })}
                      className="w-8 h-8 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-semibold">{lines}</span>
                    <button
                      type="button"
                      onClick={() => onPatch({ lines: Math.min(10, lines + 1) })}
                      className="w-8 h-8 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                    >
                      +
                    </button>
                  </div>
                </div>
              )
            })()}

          {type === 'quickLinks' &&
            (() => {
              const links = feature?.links // undefined = show all
              const isOn = q => (links ? links.includes(linkId(q)) : true)
              const toggle = q => {
                const cur = links ?? QUICK_LINKS.map(linkId)
                const id = linkId(q)
                const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]
                onPatch({ links: next })
              }
              return (
                <>
                  <p className="text-xs text-gray-500">Choose which quick links to show.</p>
                  <div className="space-y-1.5">
                    {QUICK_LINKS.map(q => (
                      <label
                        key={linkId(q)}
                        className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isOn(q)}
                          onChange={() => toggle(q)}
                          className="accent-green-700"
                        />
                        <span>
                          {q.icon} {q.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </>
              )
            })()}
        </div>
        <div className="px-4 py-3 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-green-700 text-white hover:bg-green-800"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// SETTINGS TAB — Features Selection + Weather Location sub-tabs.
// ═════════════════════════════════════════════════════════════════════════════
function DashboardSettings({
  prefs,
  stats,
  userId,
  isAdmin,
  weatherLocation,
  settingsId,
  initialFeatures,
  onSaveFeatures,
  onSaved,
}) {
  // Draft copy of the feature list, edited here and committed on Save.
  const [draft, setDraft] = useState(initialFeatures || [])
  const [subTab, setSubTab] = useState('selection') // 'selection' | 'weather'
  const [customizing, setCustomizing] = useState(null) // feature type being customized
  const [savingStats, setSavingStats] = useState(false)
  const [statsMsg, setStatsMsg] = useState('')

  const [loc, setLoc] = useState(weatherLocation || '')
  const [savingLoc, setSavingLoc] = useState(false)
  const [locMsg, setLocMsg] = useState('')

  // Merge a patch into the single feature of a given type.
  const patchType = (type, patch) =>
    setDraft(prev => prev.map(f => (f.type === type ? { ...f, ...patch } : f)))
  const addFeature = type =>
    setDraft(prev => [
      ...prev,
      {
        id: newFeatureId(),
        type,
        w: 100,
        h: 100,
        x: (prev.length % 3) * 356,
        y: Math.floor(prev.length / 3) * 340,
        statIds: type === 'stat' ? [] : undefined,
        lines: type === 'appreciation' ? 3 : undefined,
        links: type === 'quickLinks' ? undefined : undefined,
      },
    ])
  const removeAllOfType = type => setDraft(prev => prev.filter(f => f.type !== type))
  const isTypePresent = type => draft.some(f => f.type === type)
  const toggleType = type => (isTypePresent(type) ? removeAllOfType(type) : addFeature(type))
  const featureOfType = type => draft.find(f => f.type === type) || null

  async function saveStats() {
    if (!userId) return
    setSavingStats(true)
    setStatsMsg('')
    try {
      await onSaveFeatures(draft)
      setStatsMsg('ok:Saved.')
      setTimeout(() => setStatsMsg(''), 3000)
    } catch (e) {
      setStatsMsg(`error:${e?.message || 'Save failed'}`)
    } finally {
      setSavingStats(false)
    }
  }

  async function saveLocation() {
    setSavingLoc(true)
    setLocMsg('')
    const value = loc.trim()
    const { error } =
      settingsId != null
        ? await supabase.from('company_settings').update({ weather_location: value }).eq('id', settingsId)
        : await supabase.from('company_settings').insert({ weather_location: value })
    setSavingLoc(false)
    if (error) {
      setLocMsg(`error:${error.message}`)
      return
    }
    setLocMsg('ok:Saved.')
    setTimeout(() => setLocMsg(''), 3000)
    onSaved()
  }

  return (
    <div className="w-full">
      {/* Sub-tab bar — styled like the main tabs / other modules. */}
      <div className="bg-white border-b border-gray-200 flex justify-center gap-0 mb-5 rounded-xl">
        {[
          { key: 'selection', label: 'Features Selection' },
          { key: 'weather', label: 'Weather Location' },
        ].map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setSubTab(t.key)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              subTab === t.key
                ? 'border-green-700 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Features Selection ── */}
      {subTab === 'selection' && (
        <div className="card">
          <p className="text-xs text-gray-500 mb-4">
            Pick which features appear on your dashboard. Selected features are highlighted in
            green. Use <span className="font-semibold">Customize</span> to configure a feature.
          </p>
          <div className="flex flex-wrap gap-4">
            {FEATURE_TYPES.map(t => {
              const on = isTypePresent(t.type)
              return (
                <div
                  key={t.type}
                  className={`w-72 h-72 flex-shrink-0 rounded-2xl border-2 flex flex-col items-center text-center p-5 transition-colors ${
                    on ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  <span className="text-5xl mt-3 leading-none">{t.icon}</span>
                  <p className="mt-3 text-base font-bold text-gray-800">{t.label}</p>
                  <p className="mt-1 text-xs text-gray-500 px-1">{t.desc}</p>
                  <div className="mt-auto flex flex-col items-center gap-2 w-full">
                    {on && t.customizable && (
                      <button
                        type="button"
                        onClick={() => setCustomizing(t.type)}
                        className="px-8 py-2 rounded-lg text-sm font-semibold border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                      >
                        Customize
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleType(t.type)}
                      className={`px-8 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                        on
                          ? 'border-red-300 text-red-600 bg-white hover:bg-red-50'
                          : 'border-green-600 text-green-700 bg-green-50 hover:bg-green-100'
                      }`}
                    >
                      {on ? 'Remove' : 'Add'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-3 mt-5 pt-4 border-t border-gray-100">
            <button onClick={saveStats} disabled={savingStats} className="btn-primary text-sm">
              {savingStats ? 'Saving…' : 'Save Features'}
            </button>
            <SaveMsg msg={statsMsg} />
          </div>
        </div>
      )}

      {/* ── Feature customize modal ── */}
      {customizing && (
        <FeatureCustomizeModal
          type={customizing}
          feature={featureOfType(customizing)}
          stats={stats}
          onPatch={patch => patchType(customizing, patch)}
          onClose={() => setCustomizing(null)}
        />
      )}

      {/* ── Weather Location (company-wide) ── */}
      {subTab === 'weather' && (
        <div className="card">
          <h3 className="text-sm font-bold text-gray-800 mb-1">Weather Location</h3>
          {isAdmin ? (
            <>
              <p className="text-xs text-gray-500 mb-4">
                The company-wide default weather location. Each user can override it on their own
                dashboard using the pencil on the weather widget. Enter a city, e.g.{' '}
                <em>Anaheim, CA</em>, or a ZIP code.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  className="input max-w-xs"
                  value={loc}
                  onChange={e => setLoc(e.target.value)}
                  placeholder="City, State or ZIP"
                />
                <button
                  onClick={saveLocation}
                  disabled={savingLoc}
                  className="btn-primary text-sm"
                >
                  {savingLoc ? 'Saving…' : 'Save'}
                </button>
                <SaveMsg msg={locMsg} />
              </div>
            </>
          ) : (
            <p className="text-xs text-gray-500">
              {weatherLocation
                ? `Currently set to "${weatherLocation}". Only an admin can change this.`
                : 'No location set yet. Ask an admin to set the company weather location.'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
