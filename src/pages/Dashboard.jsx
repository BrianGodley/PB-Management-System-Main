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
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useCachedData } from '../lib/useCachedData'
import { resolveStatSeries } from '../lib/equationStat'
import AddEmployeeModal from '../components/AddEmployeeModal'
import CoursePlayer from '../components/lms/CoursePlayer'
import QuickEstimateModal from '../components/QuickEstimateModal'
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

// ── Quick-link buttons. Batch 1 wires each to its page; richer behaviour
// (auto-opening modals, the multi-step Quick Estimate flow) follows in later
// batches.
const QUICK_LINKS = [
  { label: 'Quick Estimate', icon: '📝', key: 'quick-estimate' },
  { label: 'Quick Bid', icon: '📋', to: '/bids' },
  { label: 'Quick Job Schedule', icon: '📅', to: '/jobs?tab=schedule&addSchedule=1' },
  { label: 'Quick Daily Log', icon: '🗒️', to: '/daily-logs?new=1' },
  { label: 'Continue Training', icon: '🎓', key: 'continue-training' },
  { label: 'Quick Add Employee', icon: '👤', key: 'add-employee' },
  { label: 'Quick Add Vendor/Sub', icon: '🚜', key: 'add-vendor' },
  { label: 'Quick Add Statistic', icon: '📈', to: '/statistics?new=1' },
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
function WeatherWidget({ location, onSaveLocation }) {
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
            `&timezone=auto&forecast_days=5`
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
  }, [location])

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
        <h3 className="text-sm font-bold text-gray-800 flex-shrink-0">Weather</h3>
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
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl leading-none">{wxInfo(wx.current.code)[0]}</span>
            <div>
              <p className="text-3xl font-bold text-gray-900 leading-none">{wx.current.temp}°</p>
              <p className="text-xs text-gray-500 mt-1">{wxInfo(wx.current.code)[1]}</p>
            </div>
          </div>
          {/* 5-day outlook — click a day for detail */}
          <div className="grid grid-cols-5 gap-1 border-t border-gray-100 pt-3">
            {wx.days.map((d, i) => (
              <button
                key={d.date}
                onClick={() => setDayIdx(dayIdx === i ? null : i)}
                className={`text-center rounded-lg py-1 transition-colors ${
                  dayIdx === i ? 'bg-green-50 ring-1 ring-green-200' : 'hover:bg-gray-50'
                }`}
              >
                <p className="text-[10px] font-semibold text-gray-500 uppercase">
                  {dayLabel(d.date, i)}
                </p>
                <p className="text-lg leading-tight my-0.5">{wxInfo(d.code)[0]}</p>
                <p className="text-[11px] font-semibold text-gray-800">{d.hi}°</p>
                <p className="text-[11px] text-gray-400">{d.lo}°</p>
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
                <span className="text-3xl leading-none">{wxInfo(sel.code)[0]}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {sel.hi}° / {sel.lo}°
                  </p>
                  <p className="text-xs text-gray-500">{wxInfo(sel.code)[1]}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
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
function StatMiniGraph({ stat, allStats = [] }) {
  const [points, setPoints] = useState(null)

  useEffect(() => {
    if (!stat?.id) {
      setPoints([])
      return
    }
    let alive = true
    setPoints(null)
    // resolveStatSeries handles stored stats AND computed equation stats.
    resolveStatSeries(stat, allStats)
      .then(series => {
        if (!alive) return
        const rows = series
          .slice(-26) // trailing ~6 months of weekly points
          .map(r => ({
            value: Number(r.value),
            label: new Date(r.period_date + 'T00:00:00').toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            }),
          }))
        setPoints(rows)
      })
      .catch(() => {
        if (alive) setPoints([])
      })
    return () => {
      alive = false
    }
  }, [stat?.id, allStats])

  return (
    <div className="card">
      <h3 className="text-sm font-bold text-gray-800 mb-1 truncate">
        {stat ? stat.name : 'Stat'}
      </h3>
      {!stat ? (
        <p className="text-xs text-gray-400 py-12 text-center">
          Pick a statistic in the Settings tab.
        </p>
      ) : points === null ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-700" />
        </div>
      ) : points.length === 0 ? (
        <p className="text-xs text-gray-400 py-12 text-center">No data recorded yet.</p>
      ) : (
        <>
          <p className="text-2xl font-bold text-gray-900 mb-1">
            {points[points.length - 1].value.toLocaleString()}
          </p>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={points} margin={{ top: 4, right: 6, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0ee" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                tick={{ fontSize: 9, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
                labelStyle={{ color: '#6b7280' }}
              />
              <Line type="monotone" dataKey="value" stroke={FG} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  )
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
      .select('id, name, stat_category, equation_parts')
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
// Dashboard background options. Files live in /public/backgrounds. 'none' keeps
// the default grey. The choice is saved per-browser (localStorage) and applied
// to <body> while the Dashboard is mounted, then restored when leaving.
const DASH_BACKGROUNDS = [
  { id: 'none', label: 'Default', swatch: '#eceef1', url: null },
  { id: 'waves-blue', label: 'Blue Waves', swatch: '#9cc0ec', url: '/backgrounds/waves-blue.svg' },
  { id: 'green', label: 'Forest', swatch: '#8fbf8c', url: '/backgrounds/green.svg' },
  { id: 'sunset', label: 'Sunset', swatch: '#f3a07e', url: '/backgrounds/sunset.svg' },
  { id: 'aurora', label: 'Aurora', swatch: '#23406a', url: '/backgrounds/aurora.svg' },
  { id: 'mesh', label: 'Mesh', swatch: '#e7ebf2', url: '/backgrounds/mesh.svg' },
]

function applyDashBackground(id) {
  const opt = DASH_BACKGROUNDS.find(b => b.id === id)
  const b = document.body.style
  if (opt?.url) {
    b.backgroundImage = `url('${opt.url}')`
    b.backgroundSize = 'cover'
    b.backgroundPosition = 'center'
    b.backgroundAttachment = 'fixed'
  } else {
    b.backgroundImage = ''
    b.backgroundSize = ''
    b.backgroundPosition = ''
    b.backgroundAttachment = ''
  }
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('dashboard')
  const [dashBg, setDashBg] = useState(() => localStorage.getItem('pbs:dashboardBg') || 'none')
  useEffect(() => {
    localStorage.setItem('pbs:dashboardBg', dashBg)
    applyDashBackground(dashBg)
    // Restore the default grey when navigating away from the dashboard.
    return () => applyDashBackground('none')
  }, [dashBg])
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

  const statIds = (prefs.stat_ids || []).map(Number)
  const stat1 = stats.find(s => s.id === statIds[0]) || null
  const stat2 = stats.find(s => s.id === statIds[1]) || null

  // Sync the saved per-user background from the DB once prefs load (so the
  // choice follows the user across devices). Runs once; user changes after
  // that are authoritative.
  const bgSyncedRef = useRef(false)
  useEffect(() => {
    if (bgSyncedRef.current || !data) return
    bgSyncedRef.current = true
    if (prefs.background) setDashBg(prefs.background)
  }, [data, prefs.background])

  // Persist a background choice to the user's dashboard_preferences row.
  function changeDashBg(id) {
    setDashBg(id)
    if (user?.id) {
      supabase
        .from('dashboard_preferences')
        .upsert(
          { user_id: user.id, background: id, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        )
        .then(() => {})
    }
  }

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
      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <h1 className="hidden lg:block text-xl font-bold text-gray-900">Dashboard</h1>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 flex gap-0 mb-5">
        {[
          { key: 'dashboard', label: '🏠 Dashboard' },
          { key: 'customize', label: '🎨 Customize' },
          { key: 'settings', label: '⚙️ Settings' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-green-700 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <WeatherWidget location={myWeatherLocation} onSaveLocation={saveWeatherLocation} />
            <StatMiniGraph stat={stat1} allStats={stats} />
            <StatMiniGraph stat={stat2} allStats={stats} />
          </div>

          {/* Quick Links */}
          <div className="card mt-4">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Quick Links</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {QUICK_LINKS.map(q => (
                <button
                  key={q.label}
                  onClick={() => {
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

      {tab === 'customize' && <DashboardCustomize value={dashBg} onChange={changeDashBg} />}

      {tab === 'settings' && (
        <DashboardSettings
          prefs={prefs}
          stats={stats}
          userId={user?.id}
          isAdmin={isAdmin}
          weatherLocation={weatherLocation}
          settingsId={settingsId}
          onSaved={refresh}
        />
      )}
    </div>
  )
}

// ── Customize: pick a dashboard background ────────────────────────────────────
function DashboardCustomize({ value, onChange }) {
  return (
    <div className="max-w-3xl">
      <h2 className="text-lg font-bold text-gray-900 mb-1">Dashboard background</h2>
      <p className="text-sm text-gray-500 mb-4">
        Choose a background for your dashboard. It replaces the grey behind the page and is saved
        on this device.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {DASH_BACKGROUNDS.map(bg => {
          const selected = value === bg.id
          return (
            <button
              key={bg.id}
              onClick={() => onChange(bg.id)}
              className={`group text-left rounded-xl overflow-hidden border-2 transition-all ${
                selected ? 'border-green-600 ring-2 ring-green-600/30' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div
                className="h-24 w-full"
                style={
                  bg.url
                    ? { backgroundImage: `url('${bg.url}')`, backgroundSize: 'cover', backgroundPosition: 'center' }
                    : { backgroundColor: bg.swatch }
                }
              />
              <div className="flex items-center justify-between px-3 py-2 bg-white">
                <span className="text-sm font-medium text-gray-700">{bg.label}</span>
                {selected && <span className="text-green-600 text-sm">✓</span>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// SETTINGS TAB — pick the two mini-graph stats; admins set the weather location.
// ═════════════════════════════════════════════════════════════════════════════
function DashboardSettings({ prefs, stats, userId, isAdmin, weatherLocation, settingsId, onSaved }) {
  const [s1, setS1] = useState(prefs.stat_ids?.[0] || '')
  const [s2, setS2] = useState(prefs.stat_ids?.[1] || '')
  const [savingStats, setSavingStats] = useState(false)
  const [statsMsg, setStatsMsg] = useState('')

  const [loc, setLoc] = useState(weatherLocation || '')
  const [savingLoc, setSavingLoc] = useState(false)
  const [locMsg, setLocMsg] = useState('')

  async function saveStats() {
    if (!userId) return
    setSavingStats(true)
    setStatsMsg('')
    // Stat ids are integers — coerce so they land in the bigint[] column.
    const stat_ids = [s1, s2].filter(Boolean).map(Number)
    const { error } = await supabase
      .from('dashboard_preferences')
      .upsert(
        { user_id: userId, stat_ids, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
    setSavingStats(false)
    if (error) {
      setStatsMsg(`error:${error.message}`)
      return
    }
    setStatsMsg('ok:Saved.')
    setTimeout(() => setStatsMsg(''), 3000)
    onSaved()
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
    <div className="max-w-xl space-y-5">
      {/* Mini-graph stats */}
      <div className="card">
        <h3 className="text-sm font-bold text-gray-800 mb-1">Dashboard Stats</h3>
        <p className="text-xs text-gray-500 mb-4">
          Choose two statistics to show as mini trend graphs on your dashboard.
        </p>
        <div className="space-y-3">
          {[
            { n: 1, val: s1, set: setS1, other: s2 },
            { n: 2, val: s2, set: setS2, other: s1 },
          ].map(({ n, val, set, other }) => (
            <div key={n}>
              <label className="label">Stat {n}</label>
              <select className="input" value={val} onChange={e => set(e.target.value)}>
                <option value="">— None —</option>
                {stats
                  .filter(st => st.id === val || st.id !== other)
                  .map(st => (
                    <option key={st.id} value={st.id}>
                      {st.name}
                      {st.stat_category ? ` (${st.stat_category})` : ''}
                    </option>
                  ))}
              </select>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-4">
          <button onClick={saveStats} disabled={savingStats} className="btn-primary text-sm">
            {savingStats ? 'Saving…' : 'Save Stats'}
          </button>
          <SaveMsg msg={statsMsg} />
        </div>
        {stats.length === 0 && (
          <p className="text-xs text-gray-400 mt-2">
            No statistics found yet — create some in the Statistics module first.
          </p>
        )}
      </div>

      {/* Weather location — admin only */}
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
              <button onClick={saveLocation} disabled={savingLoc} className="btn-primary text-sm">
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
    </div>
  )
}
