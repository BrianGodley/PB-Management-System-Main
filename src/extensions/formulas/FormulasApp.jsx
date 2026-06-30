// src/extensions/formulas/FormulasApp.jsx
//
// Formulas extension UI. Two kinds of formula, mirroring the legacy Softcake
// module:
//   * Statistic formulas  — pick a stat, the engine classifies its 1/6/12-week
//                            trend into a condition, then you record handling steps.
//   * Non-statistic        — "optional" formulas: pick a condition manually, give
//     (optional) formulas    it a title, and record handling steps (no stat/trend).
//
// Three tabs: Formulas for Statistics, Formulas for Non Statistics, Settings.
// Settings hosts the condition manager (edit standard/custom conditions + steps).
//
// Reads core: public.statistics, public.statistic_values.
// Reads/writes ext_formulas_* (gated by RLS + the 'formulas' entitlement).
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { computeTrends, CONDITION_META, TREND_LABELS } from './lib/condition.js'
import ConditionManager from './ConditionManager.jsx'

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600'

function ConditionBadge({ slug, size = 'sm' }) {
  const meta = CONDITION_META[slug]
  if (!slug || !meta) return <span className="text-xs text-gray-400 italic">—</span>
  const pad = size === 'lg' ? 'text-sm px-3 py-1' : 'text-xs px-2.5 py-0.5'
  return (
    <span className={`inline-block font-semibold rounded-full ${pad}`} style={{ color: meta.color, background: meta.bg }}>
      {meta.label}
    </span>
  )
}

function TypeBadge({ type }) {
  const optional = type === 'optional'
  return (
    <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full ${optional ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
      {optional ? 'Custom' : 'Based on stat'}
    </span>
  )
}

function TrendBadges({ trends }) {
  if (!trends) return null
  return (
    <div className="flex flex-wrap gap-4">
      {['one_week', 'six_week', 'twelve_week'].map(k => (
        <div key={k} className="text-center">
          <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">{TREND_LABELS[k]}</div>
          <ConditionBadge slug={trends[k]?.slug} />
        </div>
      ))}
    </div>
  )
}

function Sparkline({ values = [] }) {
  if (!values.length) return null
  const w = 160, h = 36, min = Math.min(...values), max = Math.max(...values), range = max - min || 1
  const pts = values
    .map((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * (w - 4) + 2
      const y = h - 2 - ((v - min) / range) * (h - 4)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke="#16a34a" strokeWidth="1.5" />
    </svg>
  )
}

function fmtDate(d) {
  if (!d) return '—'
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return String(d)
  return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

// Shared editor for a condition's handling steps.
function HandlingSteps({ steps, setStep }) {
  return (
    <div className="space-y-3">
      {steps.map((s, i) => (
        <div key={s.condition_step_id || i} className="border border-gray-100 rounded-lg p-3">
          <p className="text-sm text-gray-800 mb-2"><span className="font-semibold text-gray-500 mr-1">{s.seq}.</span>{s.text}</p>
          <div className="grid sm:grid-cols-[1fr_140px_auto] gap-2 items-center">
            <input className={inputCls} placeholder="Action to take…" value={s.action_text} onChange={e => setStep(i, 'action_text', e.target.value)} />
            <input type="date" className={inputCls} value={s.due_date} onChange={e => setStep(i, 'due_date', e.target.value)} />
            <label className="inline-flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer whitespace-nowrap">
              <input type="checkbox" checked={s.assign} onChange={e => setStep(i, 'assign', e.target.checked)} className="w-4 h-4 rounded accent-green-600" />
              Assign
            </label>
          </div>
        </div>
      ))}
    </div>
  )
}

// Table of saved formulas. kind = 'stats' (show statistic) | 'optional' (show title).
function FormulaTable({ rows, kind, loading }) {
  if (loading) return <p className="text-sm text-gray-400">Loading…</p>
  if (!rows.length) {
    return (
      <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl">
        <div className="text-4xl mb-2">🧮</div>
        <p className="text-sm text-gray-500">No formulas yet — add your first one.</p>
      </div>
    )
  }
  const nameHeader = kind === 'optional' ? 'Title' : 'Statistic'
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
            <th className="px-4 py-2 font-semibold">Date</th>
            <th className="px-4 py-2 font-semibold">{nameHeader}</th>
            <th className="px-4 py-2 font-semibold">Condition</th>
            <th className="px-4 py-2 font-semibold">Type</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(f => (
            <tr key={f.id} className="border-b border-gray-50 last:border-0">
              <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(f.evaluated_on || f.created_at)}</td>
              <td className="px-4 py-3 font-semibold text-gray-800">
                {kind === 'optional' ? (f.title || '—') : (f.statistics?.name || '—')}
              </td>
              <td className="px-4 py-3"><ConditionBadge slug={f.ext_formulas_conditions?.slug} /></td>
              <td className="px-4 py-3"><TypeBadge type={f.type} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const TABS = [
  { key: 'stats', label: 'Formulas for Statistics' },
  { key: 'optional', label: 'Formulas for Non Statistics' },
  { key: 'settings', label: 'Settings' },
]

export default function FormulasApp() {
  const { user } = useAuth()
  const [tab, setTab] = useState('stats')   // 'stats' | 'optional' | 'settings'
  const [mode, setMode] = useState('list')  // 'list' | 'new'
  const [formulas, setFormulas] = useState([])
  const [loading, setLoading] = useState(true)

  async function loadFormulas() {
    setLoading(true)
    const { data } = await supabase
      .from('ext_formulas_formulas')
      .select('id, evaluated_on, created_at, type, title, statistic_id, status, statistics(name), ext_formulas_conditions(name, slug)')
      .order('created_at', { ascending: false })
    setFormulas(data || [])
    setLoading(false)
  }
  useEffect(() => {
    loadFormulas()
  }, [])

  const statFormulas = formulas.filter(f => (f.type || 'stat') === 'stat')
  const optionalFormulas = formulas.filter(f => f.type === 'optional')

  function switchTab(t) {
    setTab(t)
    setMode('list')
  }
  const onSaved = () => {
    setMode('list')
    loadFormulas()
  }
  const isFormulaTab = tab === 'stats' || tab === 'optional'

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">🧮 Formulas</h1>
        <p className="text-sm text-gray-500">
          Classify a statistic’s trend into a condition — or apply a condition directly — and record the handling steps.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 mb-5">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => switchTab(t.key)}
            className={`px-4 py-2 text-sm font-semibold -mb-px border-b-2 transition-colors ${
              tab === t.key ? 'border-green-700 text-green-800' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'settings' ? (
        <ConditionManager />
      ) : mode === 'new' ? (
        <div className="space-y-4">
          <button onClick={() => setMode('list')} className="text-sm text-gray-600 border border-gray-200 rounded-lg px-4 py-2 hover:bg-gray-50">
            ← Back
          </button>
          {tab === 'stats' ? (
            <NewStatFormula userId={user?.id} onSaved={onSaved} />
          ) : (
            <NewOptionalFormula userId={user?.id} onSaved={onSaved} />
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setMode('new')} className="bg-green-700 text-white font-semibold px-4 py-2 rounded-lg hover:bg-green-800 text-sm">
              + New Formula
            </button>
          </div>
          <FormulaTable
            rows={tab === 'stats' ? statFormulas : optionalFormulas}
            kind={tab === 'stats' ? 'stats' : 'optional'}
            loading={loading}
          />
        </div>
      )}
    </div>
  )
}

// Distinct conditions for a manual picker: one per slug, preferring tenant-owned.
function useConditionOptions() {
  const [conditions, setConditions] = useState([])
  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from('ext_formulas_conditions')
        .select('id, name, slug, tenant_id, sort_order')
        .order('sort_order')
      setConditions(data || [])
    })()
  }, [])
  const options = useMemo(() => {
    const bySlug = {}
    for (const c of conditions) {
      if (!bySlug[c.slug] || c.tenant_id) bySlug[c.slug] = c // prefer tenant-customized
    }
    return Object.values(bySlug)
  }, [conditions])
  return { conditions, options }
}

async function loadConditionSteps(conditionId) {
  const { data } = await supabase
    .from('ext_formulas_condition_steps')
    .select('id, seq, text')
    .eq('condition_id', conditionId)
    .order('seq')
  return (data || []).map(st => ({
    condition_step_id: st.id, seq: st.seq, text: st.text, action_text: '', due_date: '', assign: false,
  }))
}

function stepsToRows(formulaId, steps) {
  return steps.map(s => ({
    formula_id: formulaId, condition_step_id: s.condition_step_id, seq: s.seq,
    action_text: (s.action_text || '').trim() || null, due_date: s.due_date || null, assign: !!s.assign,
  }))
}

const assignNote = (
  <p className="text-[11px] text-gray-400">
    Assigned steps are recorded now; they’ll create tasks automatically once the Action Manager module ships.
  </p>
)

// ---- Statistic formula (stat-driven condition) -----------------------------
function NewStatFormula({ userId, onSaved }) {
  const [stats, setStats] = useState([])
  const { conditions } = useConditionOptions()
  const [statId, setStatId] = useState('')
  const [series, setSeries] = useState([])
  const [stat, setStat] = useState(null)
  const [steps, setSteps] = useState([])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  useEffect(() => {
    ;(async () => {
      const { data: s } = await supabase
        .from('statistics')
        .select('id, name, upside_down, tracking, archived, stat_category')
        .order('name')
      setStats((s || []).filter(x => !x.archived && !['overlay', 'target'].includes(x.stat_category)))
    })()
  }, [])

  useEffect(() => {
    if (!statId) { setSeries([]); setStat(null); return }
    const chosen = stats.find(s => String(s.id) === String(statId)) || null
    setStat(chosen)
    ;(async () => {
      const { data } = await supabase
        .from('statistic_values')
        .select('value, period_date')
        .eq('statistic_id', statId)
        .order('period_date', { ascending: true })
      setSeries((data || []).map(r => Number(r.value)).filter(v => !Number.isNaN(v)))
    })()
  }, [statId, stats])

  const trends = useMemo(
    () => computeTrends(series, { upsideDown: !!stat?.upside_down }),
    [series, stat]
  )
  // The six-week condition is the primary one that drives handling steps.
  const result = trends?.six_week
  const matchedCondition = useMemo(() => {
    if (!result?.slug) return null
    const matches = conditions.filter(c => c.slug === result.slug)
    return matches.find(c => c.tenant_id) || matches[0] || null // prefer tenant-customized
  }, [result, conditions])

  useEffect(() => {
    if (!matchedCondition) { setSteps([]); return }
    ;(async () => setSteps(await loadConditionSteps(matchedCondition.id)))()
  }, [matchedCondition])

  const setStep = (i, k, v) => setSteps(p => p.map((s, j) => (j === i ? { ...s, [k]: v } : s)))

  async function save() {
    if (!statId || !matchedCondition) return
    setSaving(true)
    setErr(null)
    const { data: f, error } = await supabase
      .from('ext_formulas_formulas')
      .insert({ type: 'stat', statistic_id: Number(statId), condition_id: matchedCondition.id, window_mode: 'static', created_by: userId || null })
      .select()
      .single()
    if (error) { setErr(error.message); setSaving(false); return }
    if (steps.length) {
      const { error: se } = await supabase.from('ext_formulas_steps').insert(stepsToRows(f.id, steps))
      if (se) { setErr(se.message); setSaving(false); return }
    }
    setSaving(false)
    onSaved()
  }

  return (
    <div className="space-y-5">
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <label className="block text-xs font-semibold text-gray-500 mb-1">Statistic</label>
        <select className={inputCls} value={statId} onChange={e => setStatId(e.target.value)}>
          <option value="">— Choose a statistic —</option>
          {stats.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {statId && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          {series.length < 2 ? (
            <p className="text-sm text-gray-500">
              Not enough data points on this statistic to compute a condition (need at least 2 periods).
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                  <Sparkline values={result?.window || []} />
                  <div className="text-xs text-gray-500">
                    <div>Baseline avg: <b>{result?.baseline?.toFixed(2)}</b></div>
                    <div>Current avg: <b>{result?.current?.toFixed(2)}</b></div>
                    {result?.pct != null && <div>6-wk change: <b>{result.pct.toFixed(1)}%</b> of range</div>}
                  </div>
                </div>
                <TrendBadges trends={trends} />
              </div>
              {stat?.upside_down && (
                <p className="text-[11px] text-gray-400">This statistic is marked “down is better” — conditions are inverted accordingly.</p>
              )}
            </div>
          )}
        </div>
      )}

      {matchedCondition && steps.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-2">
            {matchedCondition.name} formula <span className="text-gray-400 font-normal">(6-week condition)</span>
          </p>
          <p className="text-xs text-gray-400 mb-3">Handling steps — fill in actions and assign as needed.</p>
          <HandlingSteps steps={steps} setStep={setStep} />
        </div>
      )}

      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="flex justify-end gap-2">
        <button disabled={!statId || !matchedCondition || saving} onClick={save} className="bg-green-700 text-white font-semibold px-5 py-2 rounded-lg hover:bg-green-800 text-sm disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Formula'}
        </button>
      </div>
      {assignNote}
    </div>
  )
}

// ---- Non-statistic ("optional") formula — manual condition -----------------
function NewOptionalFormula({ userId, onSaved }) {
  const { options } = useConditionOptions()
  const [title, setTitle] = useState('')
  const [condId, setCondId] = useState('')
  const [steps, setSteps] = useState([])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  const condition = useMemo(() => options.find(c => String(c.id) === String(condId)) || null, [options, condId])

  useEffect(() => {
    if (!condId) { setSteps([]); return }
    ;(async () => setSteps(await loadConditionSteps(condId)))()
  }, [condId])

  const setStep = (i, k, v) => setSteps(p => p.map((s, j) => (j === i ? { ...s, [k]: v } : s)))

  async function save() {
    if (!condId) return
    setSaving(true)
    setErr(null)
    const { data: f, error } = await supabase
      .from('ext_formulas_formulas')
      .insert({ type: 'optional', statistic_id: null, title: title.trim() || null, condition_id: condId, window_mode: 'static', created_by: userId || null })
      .select()
      .single()
    if (error) { setErr(error.message); setSaving(false); return }
    if (steps.length) {
      const { error: se } = await supabase.from('ext_formulas_steps').insert(stepsToRows(f.id, steps))
      if (se) { setErr(se.message); setSaving(false); return }
    }
    setSaving(false)
    onSaved()
  }

  return (
    <div className="space-y-5">
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Title</label>
          <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Q3 hiring push" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Condition</label>
          <select className={inputCls} value={condId} onChange={e => setCondId(e.target.value)}>
            <option value="">— Choose a condition —</option>
            {options.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <p className="text-[11px] text-gray-400 mt-1">No statistic is analyzed — you pick the condition directly.</p>
        </div>
      </div>

      {condition && steps.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-2">
            {condition.name} formula <ConditionBadge slug={condition.slug} />
          </p>
          <p className="text-xs text-gray-400 mb-3">Handling steps — fill in actions and assign as needed.</p>
          <HandlingSteps steps={steps} setStep={setStep} />
        </div>
      )}

      {condition && steps.length === 0 && (
        <p className="text-sm text-gray-500">This condition has no handling steps yet — add some under the Settings tab.</p>
      )}

      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="flex justify-end gap-2">
        <button disabled={!condId || saving} onClick={save} className="bg-green-700 text-white font-semibold px-5 py-2 rounded-lg hover:bg-green-800 text-sm disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Formula'}
        </button>
      </div>
      {assignNote}
    </div>
  )
}
