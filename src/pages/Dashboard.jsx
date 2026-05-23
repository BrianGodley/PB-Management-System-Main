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
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useCachedData } from '../lib/useCachedData'
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
function WeatherWidget({ location }) {
  const [wx, setWx] = useState({ status: 'loading', current: null, days: [], place: '' })

  useEffect(() => {
    const loc = (location || '').trim()
    if (!loc) {
      setWx({ status: 'no-location', current: null, days: [], place: '' })
      return
    }
    let alive = true
    setWx(w => ({ ...w, status: 'loading' }))
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
            `&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min` +
            `&temperature_unit=fahrenheit&timezone=auto&forecast_days=5`
        ).then(r => r.json())
        if (!alive) return
        const days = (fc.daily?.time || []).map((t, i) => ({
          date: t,
          code: fc.daily.weather_code[i],
          hi: Math.round(fc.daily.temperature_2m_max[i]),
          lo: Math.round(fc.daily.temperature_2m_min[i]),
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
    const d = new Date(iso + 'T12:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short' })
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-800">Weather</h3>
        {wx.place && <span className="text-xs text-gray-400 truncate ml-2">{wx.place}</span>}
      </div>

      {wx.status === 'loading' && (
        <div className="flex items-center justify-center py-10">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-700" />
        </div>
      )}

      {wx.status === 'no-location' && (
        <p className="text-xs text-gray-400 py-10 text-center">
          No weather location set. An admin can set one in the Settings tab.
        </p>
      )}

      {wx.status === 'error' && (
        <p className="text-xs text-gray-400 py-10 text-center">
          Couldn't load weather — check the location in the Settings tab.
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
          {/* 5-day outlook */}
          <div className="grid grid-cols-5 gap-1 border-t border-gray-100 pt-3">
            {wx.days.map((d, i) => (
              <div key={d.date} className="text-center">
                <p className="text-[10px] font-semibold text-gray-500 uppercase">
                  {dayLabel(d.date, i)}
                </p>
                <p className="text-lg leading-tight my-0.5">{wxInfo(d.code)[0]}</p>
                <p className="text-[11px] font-semibold text-gray-800">{d.hi}°</p>
                <p className="text-[11px] text-gray-400">{d.lo}°</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// STAT MINI-GRAPH — a small trend line for one statistic from the stat system.
// ═════════════════════════════════════════════════════════════════════════════
function StatMiniGraph({ stat }) {
  const [points, setPoints] = useState(null)

  useEffect(() => {
    if (!stat?.id) {
      setPoints([])
      return
    }
    let alive = true
    setPoints(null)
    supabase
      .from('statistic_values')
      .select('period_date, value')
      .eq('statistic_id', stat.id)
      .order('period_date', { ascending: true })
      .then(({ data }) => {
        if (!alive) return
        const rows = (data || [])
          .filter(r => r.period_date != null && r.value != null)
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
    return () => {
      alive = false
    }
  }, [stat?.id])

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

// ── Data fetch (cached) ──────────────────────────────────────────────────────
// Tolerant of a not-yet-created dashboard_preferences table / weather_location
// column — the dashboard still renders with defaults until the SQL is run.
async function fetchDashboardData(userId) {
  const [prefsRes, settingsRes, statsRes, profRes] = await Promise.all([
    supabase.from('dashboard_preferences').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('company_settings').select('id, weather_location').maybeSingle(),
    supabase
      .from('statistics')
      .select('id, name, stat_category')
      .eq('archived', false)
      .order('name'),
    supabase.from('profiles').select('role').eq('id', userId).maybeSingle(),
  ])
  return {
    prefs: prefsRes.data || { user_id: userId, stat_ids: [], layout: {} },
    settingsId: settingsRes.data?.id ?? null,
    weatherLocation: settingsRes.data?.weather_location || '',
    stats: statsRes.data || [],
    role: profRes.data?.role || null,
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const { user } = useAuth()
  const [tab, setTab] = useState('dashboard')

  const { data, loading, refresh } = useCachedData(
    user?.id ? `dashboard:${user.id}` : 'dashboard:anon',
    () => fetchDashboardData(user?.id)
  )

  const prefs = data?.prefs || { stat_ids: [], layout: {} }
  const stats = data?.stats || []
  const weatherLocation = data?.weatherLocation || ''
  const settingsId = data?.settingsId ?? null
  const isAdmin = data?.role === 'admin' || data?.role === 'super_admin'

  const statIds = prefs.stat_ids || []
  const stat1 = stats.find(s => s.id === statIds[0]) || null
  const stat2 = stats.find(s => s.id === statIds[1]) || null

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
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 flex gap-0 mb-5">
        {[
          { key: 'dashboard', label: '🏠 Dashboard' },
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <WeatherWidget location={weatherLocation} />
          <StatMiniGraph stat={stat1} />
          <StatMiniGraph stat={stat2} />
        </div>
      )}

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
    const stat_ids = [s1, s2].filter(Boolean)
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
              The company-wide location shown in the dashboard weather widget. Enter a city, e.g.{' '}
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
