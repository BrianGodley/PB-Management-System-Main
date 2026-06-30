// src/extensions/formulas/FormulasApp.jsx
//
// Formulas extension UI. Apply a condition/trend analysis to a statistic: pick a
// stat, see its 1/6/12-week conditions (via the ported engine), and record the
// canned handling steps (with optional assignment). The six-week condition is the
// primary one that drives the handling steps.
//
// Reads core: public.statistics, public.statistic_values.
// Reads/writes ext_formulas_* (gated by RLS + the 'formulas' entitlement).
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { computeTrends, CONDITION_META, TREND_LABELS } from './lib/condition.js'
import ConditionManager from './ConditionManager.jsx'

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

export default function FormulasApp() {
  const { user } = useAuth()
  const [view, setView] = useState('list')
  const [formulas, setFormulas] = useState([])
  const [loading, setLoading] = useState(true)

  async function loadFormulas() {
    setLoading(true)
    const { data } = await supabase
      .from('ext_formulas_formulas')
      .select('id, evaluated_on, window_mode, status, statistics(name), ext_formulas_conditions(name, slug)')
      .order('created_at', { ascending: false })
    setFormulas(data || [])
    setLoading(false)
  }
  useEffect(() => {
    loadFormulas()
  }, [])

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">🧮 Formulas</h1>
          <p className="text-sm text-gray-500">
            Classify a statistic’s trend into a condition and record the handling steps.
          </p>
        </div>
        {view === 'list' ? (
          <div className="flex gap-2">
            <button onClick={() => setView('conditions')} className="text-sm text-gray-700 border border-gray-200 rounded-lg px-4 py-2 hover:bg-gray-50">
              Manage Conditions
            </button>
            <button onClick={() => setView('new')} className="bg-green-700 text-white font-semibold px-4 py-2 rounded-lg hover:bg-green-800 text-sm">
              + New Formula
            </button>
          </div>
        ) : (
          <button onClick={() => setView('list')} className="text-sm text-gray-600 border border-gray-200 rounded-lg px-4 py-2 hover:bg-gray-50">
            ← Back
          </button>
        )}
      </div>

      {view === 'conditions' ? (
        <ConditionManager />
      ) : view === 'new' ? (
        <NewFormula userId={user?.id} onSaved={() => { setView('list'); loadFormulas() }} />
      ) : loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : formulas.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl">
          <div className="text-4xl mb-2">🧮</div>
          <p className="text-sm text-gray-500">No formulas yet — add your first one.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {formulas.map(f => (
            <div key={f.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-0">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{f.statistics?.name || 'Statistic'}</p>
                <p className="text-xs text-gray-400">{f.evaluated_on}</p>
              </div>
              <ConditionBadge slug={f.ext_formulas_conditions?.slug} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function NewFormula({ userId, onSaved }) {
  const [stats, setStats] = useState([])
  const [conditions, setConditions] = useState([])
  const [statId, setStatId] = useState('')
  const [series, setSeries] = useState([])
  const [stat, setStat] = useState(null)
  const [steps, setSteps] = useState([])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  useEffect(() => {
    ;(async () => {
      const [{ data: s }, { data: c }] = await Promise.all([
        supabase.from('statistics').select('id, name, upside_down, tracking, week_ending_day').eq('archived', false).order('name'),
        supabase.from('ext_formulas_conditions').select('id, name, slug, tenant_id').order('sort_order'),
      ])
      setStats(s || [])
      setConditions(c || [])
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
    ;(async () => {
      const { data } = await supabase
        .from('ext_formulas_condition_steps')
        .select('id, seq, text')
        .eq('condition_id', matchedCondition.id)
        .order('seq')
      setSteps((data || []).map(st => ({
        condition_step_id: st.id, seq: st.seq, text: st.text, action_text: '', due_date: '', assign: false,
      })))
    })()
  }, [matchedCondition])

  const setStep = (i, k, v) => setSteps(p => p.map((s, j) => (j === i ? { ...s, [k]: v } : s)))

  async function save() {
    if (!statId || !matchedCondition) return
    setSaving(true)
    setErr(null)
    const { data: f, error } = await supabase
      .from('ext_formulas_formulas')
      .insert({ statistic_id: Number(statId), condition_id: matchedCondition.id, window_mode: 'static', created_by: userId || null })
      .select()
      .single()
    if (error) { setErr(error.message); setSaving(false); return }
    if (steps.length) {
      const rows = steps.map(s => ({
        formula_id: f.id, condition_step_id: s.condition_step_id, seq: s.seq,
        action_text: s.action_text.trim() || null, due_date: s.due_date || null, assign: !!s.assign,
      }))
      const { error: se } = await supabase.from('ext_formulas_steps').insert(rows)
      if (se) { setErr(se.message); setSaving(false); return }
    }
    setSaving(false)
    onSaved()
  }

  const input = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600'

  return (
    <div className="space-y-5">
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <label className="block text-xs font-semibold text-gray-500 mb-1">Statistic</label>
        <select className={input} value={statId} onChange={e => setStatId(e.target.value)}>
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
          <div className="space-y-3">
            {steps.map((s, i) => (
              <div key={s.condition_step_id} className="border border-gray-100 rounded-lg p-3">
                <p className="text-sm text-gray-800 mb-2"><span className="font-semibold text-gray-500 mr-1">{s.seq}.</span>{s.text}</p>
                <div className="grid sm:grid-cols-[1fr_140px_auto] gap-2 items-center">
                  <input className={input} placeholder="Action to take…" value={s.action_text} onChange={e => setStep(i, 'action_text', e.target.value)} />
                  <input type="date" className={input} value={s.due_date} onChange={e => setStep(i, 'due_date', e.target.value)} />
                  <label className="inline-flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer whitespace-nowrap">
                    <input type="checkbox" checked={s.assign} onChange={e => setStep(i, 'assign', e.target.checked)} className="w-4 h-4 rounded accent-green-600" />
                    Assign
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="flex justify-end gap-2">
        <button disabled={!statId || !matchedCondition || saving} onClick={save} className="bg-green-700 text-white font-semibold px-5 py-2 rounded-lg hover:bg-green-800 text-sm disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Formula'}
        </button>
      </div>
      <p className="text-[11px] text-gray-400">
        Assigned steps are recorded now; they’ll create tasks automatically once the Action Manager module ships.
      </p>
    </div>
  )
}
