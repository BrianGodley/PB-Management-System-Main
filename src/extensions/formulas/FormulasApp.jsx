// src/extensions/formulas/FormulasApp.jsx
//
// Formulas extension UI. Three tabs:
//   * Formulas for Statistics     — pick a stat, see a large graph with the
//     1/6/12-week conditions across the top; click a period to record its
//     handling steps (each period can be a different condition).
//   * Formulas for Non Statistics — "optional" formulas: a title + a manually
//     chosen condition + handling steps (no stat/trend).
//   * Settings                    — manage conditions, handling steps & access.
//
// Restricted conditions (the lower conditions) are hidden from the Non-Statistics
// picker/list unless the current user is granted access (or is an admin).
//
// Reads core: public.statistics, public.statistic_values.
// Reads/writes ext_formulas_* (gated by RLS + the 'formulas' entitlement).
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { computeTrends, CONDITION_META } from './lib/condition.js'
import StatGraph from './StatGraph.jsx'
import ConditionModal from './ConditionModal.jsx'
import ConditionManager from './ConditionManager.jsx'

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600'
const newBtnCls = 'bg-green-700 text-white font-semibold px-4 py-1.5 rounded-lg hover:bg-green-800 text-sm whitespace-nowrap'

const PERIODS = [
  { key: 'one_week', label: '1-Week', size: 2 },
  { key: 'six_week', label: '6-Week', size: 7 },
  { key: 'twelve_week', label: '12-Week', size: 13 },
]
const PERIOD_SHORT = { one_week: '1 week', six_week: '6 week', twelve_week: '12 week' }

function fmtDate(d) {
  if (!d) return '—'
  const dt = new Date(String(d).length <= 10 ? d + 'T00:00:00' : d)
  if (Number.isNaN(dt.getTime())) return String(d)
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function ConditionBadge({ slug, size = 'sm' }) {
  const meta = CONDITION_META[slug]
  if (!slug || !meta) return <span className="text-xs text-gray-400 italic">—</span>
  const pad = size === 'xl' ? 'text-lg px-5 py-2' : size === 'lg' ? 'text-sm px-3 py-1' : 'text-xs px-2.5 py-0.5'
  return (
    <span className={`inline-block font-bold rounded-full ${pad}`} style={{ color: meta.color, background: meta.bg }}>
      {meta.label}
    </span>
  )
}

function StatusPill({ status }) {
  const done = status === 'completed'
  return (
    <span className={`text-xs font-semibold rounded-full px-3 py-1 border-2 ${done ? 'border-green-500 text-green-800 bg-green-50' : 'border-gray-300 text-gray-600 bg-gray-50'}`}>
      {done ? 'Completed' : 'Active'}
    </span>
  )
}

const TABS = [
  { key: 'stats', label: 'Formulas for Statistics' },
  { key: 'optional', label: 'Formulas for Non Statistics' },
  { key: 'settings', label: 'Settings' },
]

export default function FormulasApp() {
  const { user } = useAuth()
  const [tab, setTab] = useState('stats')
  const [mode, setMode] = useState('list')   // stats tab: 'list' | 'new'
  const [formulas, setFormulas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)   // ConditionModal spec or null
  const [blocked, setBlocked] = useState(new Set()) // restricted condition ids the user can't view

  async function loadFormulas() {
    setLoading(true)
    const { data } = await supabase
      .from('ext_formulas_formulas')
      .select('id, evaluated_on, created_at, type, title, statistic_id, status, period, period_start, period_end, statistics(name), ext_formulas_conditions(id, name, slug)')
      .order('created_at', { ascending: false })
    setFormulas(data || [])
    setLoading(false)
  }
  useEffect(() => { loadFormulas() }, [])

  // Compute which restricted conditions the current user cannot view.
  useEffect(() => {
    if (!user?.id) return
    ;(async () => {
      try {
        const [{ data: conds, error: ce }, { data: grants }, roleRes] = await Promise.all([
          supabase.from('ext_formulas_conditions').select('id, restricted'),
          supabase.from('ext_formulas_condition_access').select('condition_id').eq('user_id', user.id),
          supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
        ])
        if (ce) { setBlocked(new Set()); return }
        const admin = ['admin', 'owner'].includes(roleRes?.data?.role)
        const granted = new Set((grants || []).map(g => g.condition_id))
        const b = admin ? new Set() : new Set((conds || []).filter(c => c.restricted && !granted.has(c.id)).map(c => c.id))
        setBlocked(b)
      } catch { setBlocked(new Set()) }
    })()
  }, [user?.id])

  const statFormulas = formulas.filter(f => (f.type || 'stat') === 'stat')
  const optionalFormulas = formulas.filter(f => f.type === 'optional' && !blocked.has(f.ext_formulas_conditions?.id))

  function switchTab(t) { setTab(t); setMode('list') }
  const onModalSaved = () => { setModal(null); loadFormulas() }

  async function removeFormula(f) {
    if (!confirm('Delete this formula?')) return
    await supabase.from('ext_formulas_formulas').delete().eq('id', f.id)
    loadFormulas()
  }

  // The New Formula button, pinned to the tab bar's upper-right when relevant.
  const newButton =
    tab === 'settings' ? null
      : tab === 'optional'
        ? <button onClick={() => setModal({ mode: 'create', kind: 'optional', userId: user?.id, blocked })} className={newBtnCls}>+ New Formula</button>
        : mode === 'list'
          ? <button onClick={() => setMode('new')} className={newBtnCls}>+ New Formula</button>
          : null

  return (
    <div className="w-full">
      {/* Sub-tabs — shared white tab-bar look, New Formula pinned upper-right */}
      <div className="relative bg-white border-b border-gray-200 flex justify-center gap-0 flex-shrink-0 rounded-xl mb-5">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => switchTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-green-700 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
        {newButton && <div className="absolute right-2 top-1/2 -translate-y-1/2">{newButton}</div>}
      </div>

      {tab === 'settings' ? (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <ConditionManager />
        </div>
      ) : tab === 'stats' ? (
        mode === 'new' ? (
          <div className="space-y-4">
            <button onClick={() => setMode('list')} className="text-sm text-gray-600 border border-gray-200 rounded-lg px-4 py-2 hover:bg-gray-50 bg-white">← Back to list</button>
            <NewStatFormula
              userId={user?.id}
              formulas={statFormulas}
              onCreate={setModal}
              onEdit={setModal}
            />
          </div>
        ) : (
          <FormulaTable rows={statFormulas} kind="stats" loading={loading} onOpen={f => setModal({ mode: 'edit', formulaId: f.id })} onDelete={removeFormula} />
        )
      ) : (
        <FormulaTable rows={optionalFormulas} kind="optional" loading={loading} onOpen={f => setModal({ mode: 'edit', formulaId: f.id })} onDelete={removeFormula} />
      )}

      {modal && <ConditionModal spec={modal} onClose={() => setModal(null)} onSaved={onModalSaved} />}
    </div>
  )
}

// ---- Bids-style listing table (full width) --------------------------------
function FormulaTable({ rows, kind, loading, onOpen, onDelete }) {
  if (loading) return <p className="text-sm text-gray-400">Loading…</p>
  if (!rows.length) {
    return (
      <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl bg-white/70">
        <div className="text-4xl mb-2">🧮</div>
        <p className="text-sm text-gray-500">No formulas yet — add your first one.</p>
      </div>
    )
  }
  const isStats = kind === 'stats'
  return (
    <div className="thin-scroll w-full overflow-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 z-10">
          <tr className="bg-gray-50 border-b border-gray-200 text-left">
            <th className="px-4 py-3 font-semibold text-gray-700">Condition</th>
            <th className="px-4 py-3 font-semibold text-gray-700">Formula</th>
            <th className="px-4 py-3 font-semibold text-gray-700">{isStats ? 'Statistic' : 'Title'}</th>
            {isStats && <th className="px-4 py-3 font-semibold text-gray-700">Period</th>}
            <th className="px-4 py-3 font-semibold text-gray-700">Date range</th>
            <th className="px-4 py-3 font-semibold text-gray-700 text-center">Status</th>
            <th className="px-4 py-3 font-semibold text-gray-700 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((f, i) => {
            const cond = f.ext_formulas_conditions
            const range = isStats && f.period_start
              ? `${fmtDate(f.period_start)} – ${fmtDate(f.period_end)}`
              : fmtDate(f.evaluated_on || f.created_at)
            return (
              <tr key={f.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                <td className="px-4 py-3 font-bold text-gray-900">{cond?.name || '—'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => onOpen(f)} className="text-green-700 hover:text-green-900 font-semibold underline decoration-green-200 underline-offset-2">
                    View Formula
                  </button>
                </td>
                <td className="px-4 py-3 text-gray-700">{isStats ? (f.statistics?.name || '—') : (f.title || '—')}</td>
                {isStats && <td className="px-4 py-3 whitespace-nowrap text-gray-600">{PERIOD_SHORT[f.period] || '—'}</td>}
                <td className="px-4 py-3 whitespace-nowrap text-gray-500">{range}</td>
                <td className="px-4 py-3 text-center"><StatusPill status={f.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => onOpen(f)} title="Edit" className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-400 hover:border-green-400 hover:text-green-600 hover:bg-green-50 transition-colors">
                      <span className="text-sm">✎</span>
                    </button>
                    <button onClick={() => onDelete(f)} title="Delete" className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                      <span className="text-sm">✕</span>
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ---- New statistic formula: big graph + 1/6/12-week period cards ----------
function NewStatFormula({ userId, formulas, onCreate, onEdit }) {
  const [stats, setStats] = useState([])
  const [conditions, setConditions] = useState([])
  const [statId, setStatId] = useState('')
  const [dated, setDated] = useState([])   // [{ value, period_date }]
  const [stat, setStat] = useState(null)

  useEffect(() => {
    ;(async () => {
      const [{ data: s }, { data: c }] = await Promise.all([
        supabase.from('statistics').select('id, name, upside_down, tracking, stat_type, show_values, archived, stat_category').order('name'),
        supabase.from('ext_formulas_conditions').select('id, name, slug, tenant_id').order('sort_order'),
      ])
      setStats((s || []).filter(x => !x.archived && !['overlay', 'target'].includes(x.stat_category)))
      setConditions(c || [])
    })()
  }, [])

  useEffect(() => {
    if (!statId) { setDated([]); setStat(null); return }
    setStat(stats.find(s => String(s.id) === String(statId)) || null)
    ;(async () => {
      const { data } = await supabase
        .from('statistic_values')
        .select('value, period_date')
        .eq('statistic_id', statId)
        .order('period_date', { ascending: true })
      setDated((data || []).filter(r => r.value != null && !Number.isNaN(Number(r.value))).map(r => ({ value: Number(r.value), period_date: r.period_date })))
    })()
  }, [statId, stats])

  const series = useMemo(() => dated.map(d => d.value), [dated])
  const trends = useMemo(() => computeTrends(series, { upsideDown: !!stat?.upside_down }), [series, stat])

  const matchCondition = slug => {
    if (!slug) return null
    const m = conditions.filter(c => c.slug === slug)
    return m.find(c => c.tenant_id) || m[0] || null
  }
  const rangeFor = size => {
    const w = dated.slice(Math.max(0, dated.length - size))
    return { start: w[0]?.period_date || null, end: w[w.length - 1]?.period_date || null }
  }
  const existingFor = key => formulas.find(f => String(f.statistic_id) === String(statId) && f.period === key)

  function openPeriod(p) {
    const existing = existingFor(p.key)
    if (existing) { onEdit({ mode: 'edit', formulaId: existing.id }); return }
    const trend = trends?.[p.key]
    const condition = matchCondition(trend?.slug)
    if (!condition) return
    const r = rangeFor(p.size)
    onCreate({
      mode: 'create', kind: 'stat', userId,
      statisticId: Number(statId), statName: stat?.name,
      period: p.key, condition, periodStart: r.start, periodEnd: r.end,
    })
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <label className="block text-xs font-semibold text-gray-500 mb-1">Statistic</label>
        <select className={inputCls} value={statId} onChange={e => setStatId(e.target.value)}>
          <option value="">— Choose a statistic —</option>
          {stats.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {statId && dated.length < 2 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-500">Not enough data points on this statistic to compute a condition (need at least 2 periods).</p>
        </div>
      )}

      {statId && dated.length >= 2 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
          {/* 1 / 6 / 12-week condition cards across the top */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PERIODS.map(p => {
              const trend = trends?.[p.key]
              const existing = existingFor(p.key)
              return (
                <div key={p.key} className="border border-gray-200 rounded-xl p-4 flex flex-col items-center text-center gap-2">
                  <div className="text-xs uppercase tracking-wide text-gray-400 font-semibold">{p.label}</div>
                  <ConditionBadge slug={trend?.slug} size="xl" />
                  {trend?.pct != null && <div className="text-[11px] text-gray-400">{trend.pct.toFixed(1)}% of range</div>}
                  <button
                    onClick={() => openPeriod(p)}
                    disabled={!trend?.slug}
                    className={`mt-1 text-sm font-semibold px-4 py-2 rounded-lg w-full disabled:opacity-40 ${existing ? 'border border-green-300 text-green-700 hover:bg-green-50' : 'bg-green-700 text-white hover:bg-green-800'}`}
                  >
                    {existing ? '✓ View / edit formula' : 'Create formula'}
                  </button>
                </div>
              )
            })}
          </div>

          {stat?.upside_down && (
            <p className="text-[11px] text-gray-400 text-center">This statistic is marked “down is better” — conditions are inverted accordingly.</p>
          )}

          {/* Large graph — most recent 12-week window, full width */}
          <StatGraph stat={stat} series={dated} height={440} maxPoints={13} />
        </div>
      )}
    </div>
  )
}
