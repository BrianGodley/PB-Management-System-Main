// src/extensions/formulas/FormulasApp.jsx
//
// Formulas extension UI. Lets a user apply a condition/trend analysis to one of
// their statistics: pick a stat, see its computed condition (via the ported
// engine), and record the canned handling steps (with optional assignment).
//
// Reads core: public.statistics, public.statistic_values.
// Reads/writes ext_formulas_* (gated by RLS + the 'formulas' entitlement).
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { computeCondition, CONDITION_META } from './lib/condition.js'

function ConditionBadge({ slug }) {
  const meta = CONDITION_META[slug]
  if (!slug || !meta)
    return <span className="text-xs text-gray-400 italic">No condition</span>
  return (
    <span
      className="inline-block text-xs font-semibold rounded-full px-2.5 py-0.5"
      style={{ color: meta.color, background: meta.bg }}
    >
      {meta.label}
    </span>
  )
}

// Tiny inline sparkline of the window values.
function Sparkline({ values = [] }) {
  if (!values.length) return null
  const w = 160,
    h = 36,
    min = Math.min(...values),
    max = Math.max(...values),
    range = max - min || 1
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
  const [view, setView] = useState('list') // 'list' | 'new'
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
          <button
            onClick={() => setView('new')}
            className="bg-green-700 text-white font-semibold px-4 py-2 rounded-lg hover:bg-green-800 text-sm"
          >
            + New Formula
          </button>
        ) : (
          <button
            onClick={() => setView('list')}
            className="text-sm text-gray-600 border border-gray-200 rounded-lg px-4 py-2 hover:bg-gray-50"
          >
            ← Back
          </button>
        )}
      </div>

      {view === 'new' ? (
        <NewFormula
          userId={user?.id}
          onSaved={() => {
            setView('list')
            loadFormulas()
          }}
        />
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
            <div
              key={f.id}
              className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {f.statistics?.name || 'Statistic'}
                </p>
                <p className="text-xs text-gray-400">
                  {f.evaluated_on} · {f.window_mode === 'dynamic' ? 'All periods' : 'Last 7 periods'}
                </p>
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
  const [mode, setMode] = useState('static')
  const [series, setSeries] = useState([])
  const [stat, setStat] = useState(null)
  const [steps, setSteps] = useState([]) // { condition_step_id, seq, text, action_text, due_date, assign }
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  // Load the user's stats + the visible conditions once.
  useEffect(() => {
    ;(async () => {
      const [{ data: s }, { data: c }] = await Promise.all([
        supabase
          .from('statistics')
          .select('id, name, upside_down, tracking, week_ending_day')
          .eq('archived', false)
          .order('name'),
        supabase.from('ext_formulas_conditions').select('id, name, slug').order('sort_order'),
      ])
      setStats(s || [])
      setConditions(c || [])
    })()
  }, [])

  // When a stat is chosen, load its periodized values (oldest -> newest).
  useEffect(() => {
    if (!statId) {
      setSeries([])
      setStat(null)
      return
    }
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

  const result = useMemo(
    () => computeCondition(series, { mode, upsideDown: !!stat?.upside_down }),
    [series, mode, stat]
  )
  const matchedCondition = useMemo(
    () => (result?.slug ? conditions.find(c => c.slug === result.slug) : null),
    [result, conditions]
  )

  // Load the canned steps for the matched condition.
  useEffect(() => {
    if (!matchedCondition) {
      setSteps([])
      return
    }
    ;(async () => {
      const { data } = await supabase
        .from('ext_formulas_condition_steps')
        .select('id, seq, text')
        .eq('condition_id', matchedCondition.id)
        .order('seq')
      setSteps(
        (data || []).map(st => ({
          condition_step_id: st.id,
          seq: st.seq,
          text: st.text,
          action_text: '',
          due_date: '',
          assign: false,
        }))
      )
    })()
  }, [matchedCondition])

  const setStep = (i, k, v) => setSteps(p => p.map((s, j) => (j === i ? { ...s, [k]: v } : s)))

  async function save() {
    if (!statId || !matchedCondition) return
    setSaving(true)
    setErr(null)
    const { data: f, error } = await supabase
      .from('ext_formulas_formulas')
      .insert({
        statistic_id: Number(statId),
        condition_id: matchedCondition.id,
        window_mode: mode,
        created_by: userId || null,
      })
      .select()
      .single()
    if (error) {
      setErr(error.message)
      setSaving(false)
      return
    }
    if (steps.length) {
      const rows = steps.map(s => ({
        formula_id: f.id,
        condition_step_id: s.condition_step_id,
        seq: s.seq,
        action_text: s.action_text.trim() || null,
        due_date: s.due_date || null,
        assign: !!s.assign,
      }))
      const { error: se } = await supabase.from('ext_formulas_steps').insert(rows)
      if (se) {
        setErr(se.message)
        setSaving(false)
        return
      }
    }
    setSaving(false)
    onSaved()
  }

  const input =
    'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600'

  return (
    <div className="space-y-5">
      {/* Step 1 — pick the stat + window */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Statistic</label>
            <select className={input} value={statId} onChange={e => setStatId(e.target.value)}>
              <option value="">— Choose a statistic —</option>
              {stats.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Trend window</label>
            <div className="flex gap-2">
              {[
                ['static', 'Last 7 periods'],
                ['dynamic', 'All periods'],
              ].map(([val, lbl]) => (
                <button
                  key={val}
                  onClick={() => setMode(val)}
                  className={`flex-1 text-sm rounded-lg border px-3 py-2 transition-colors ${
                    mode === val
                      ? 'border-green-700 text-green-700 bg-green-50 font-medium'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Step 2 — computed condition */}
      {statId && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          {series.length < 2 ? (
            <p className="text-sm text-gray-500">
              Not enough data points on this statistic to compute a condition (need at least 2
              periods).
            </p>
          ) : (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <Sparkline values={result?.window || []} />
                <div className="text-xs text-gray-500">
                  <div>
                    Baseline avg: <b>{result?.baseline?.toFixed(2)}</b>
                  </div>
                  <div>
                    Current avg: <b>{result?.current?.toFixed(2)}</b>
                  </div>
                  {result?.pct != null && (
                    <div>
                      Change: <b>{result.pct.toFixed(1)}%</b> of range
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">
                  Condition{stat?.upside_down ? ' (inverted stat)' : ''}
                </div>
                <ConditionBadge slug={result?.slug} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3 — handling steps */}
      {matchedCondition && steps.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-800 mb-3">
            {matchedCondition.name} formula — handling steps
          </p>
          <div className="space-y-3">
            {steps.map((s, i) => (
              <div key={s.condition_step_id} className="border border-gray-100 rounded-lg p-3">
                <p className="text-sm text-gray-800 mb-2">
                  <span className="font-semibold text-gray-500 mr-1">{s.seq}.</span>
                  {s.text}
                </p>
                <div className="grid sm:grid-cols-[1fr_140px_auto] gap-2 items-center">
                  <input
                    className={input}
                    placeholder="Action to take…"
                    value={s.action_text}
                    onChange={e => setStep(i, 'action_text', e.target.value)}
                  />
                  <input
                    type="date"
                    className={input}
                    value={s.due_date}
                    onChange={e => setStep(i, 'due_date', e.target.value)}
                  />
                  <label className="inline-flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={s.assign}
                      onChange={e => setStep(i, 'assign', e.target.checked)}
                      className="w-4 h-4 rounded accent-green-600"
                    />
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
        <button
          disabled={!statId || !matchedCondition || saving}
          onClick={save}
          className="bg-green-700 text-white font-semibold px-5 py-2 rounded-lg hover:bg-green-800 text-sm disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Formula'}
        </button>
      </div>
      <p className="text-[11px] text-gray-400">
        Assigned steps are recorded now; they’ll create tasks automatically once the Action Manager
        module ships.
      </p>
    </div>
  )
}
