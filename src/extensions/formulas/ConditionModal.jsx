// src/extensions/formulas/ConditionModal.jsx
//
// Modal for a single formula's condition + handling steps. Uses:
//   create-stat     : condition fixed by a trend period (1/6/12-week)
//   create-optional : user gives a title and picks a condition manually
//   edit            : load a saved formula, edit its actions, mark completed
//
// Each handling step can hold MULTIPLE actions (action_text + due date + assign).
// Restricted conditions are filtered out of the optional picker unless allowed.
//
// Reads/writes ext_formulas_* (gated by RLS + the 'formulas' entitlement).
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { CONDITION_META } from './lib/condition.js'

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600'

const PERIOD_LABEL = { one_week: '1-week', six_week: '6-week', twelve_week: '12-week' }
const emptyAction = () => ({ action_text: '', due_date: '', assign: false })

function Badge({ slug, size = 'sm' }) {
  const m = CONDITION_META[slug]
  if (!slug || !m) return <span className="text-xs text-gray-400 italic">—</span>
  const pad = size === 'lg' ? 'text-sm px-3 py-1' : 'text-xs px-2.5 py-0.5'
  return (
    <span className={`inline-block font-semibold rounded-full ${pad}`} style={{ color: m.color, background: m.bg }}>
      {m.label}
    </span>
  )
}

export default function ConditionModal({ spec, onClose, onSaved }) {
  const isEdit = spec?.mode === 'edit'
  const isOptional = spec?.kind === 'optional'
  const blocked = useMemo(
    () => (spec?.blocked instanceof Set ? spec.blocked : new Set(spec?.blocked || [])),
    [spec]
  )

  const [title, setTitle] = useState(spec?.title || '')
  const [condId, setCondId] = useState(spec?.condition?.id || '')
  const [condition, setCondition] = useState(spec?.condition || null)
  const [options, setOptions] = useState([])       // optional-mode condition picker
  const [steps, setSteps] = useState([])           // [{ condition_step_id, seq, text, actions:[{...}] }]
  const [status, setStatus] = useState('active')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  // Optional-create: load selectable conditions (skip restricted-and-blocked).
  useEffect(() => {
    if (isEdit || !isOptional) return
    ;(async () => {
      const { data } = await supabase
        .from('ext_formulas_conditions')
        .select('id, name, slug, tenant_id, restricted, sort_order')
        .order('sort_order')
      const bySlug = {}
      for (const c of data || []) if (!bySlug[c.slug] || c.tenant_id) bySlug[c.slug] = c
      setOptions(Object.values(bySlug).filter(c => !blocked.has(c.id)))
    })()
  }, [isEdit, isOptional, blocked])

  // Load steps (with actions) to display/edit.
  useEffect(() => {
    let cancel = false
    ;(async () => {
      setLoading(true)
      if (isEdit) {
        const { data: f } = await supabase
          .from('ext_formulas_formulas')
          .select('status, title, ext_formulas_conditions(id, name, slug)')
          .eq('id', spec.formulaId)
          .single()
        const { data: rows } = await supabase
          .from('ext_formulas_steps')
          .select('id, seq, action_seq, action_text, due_date, assign, condition_step_id, ext_formulas_condition_steps(text)')
          .eq('formula_id', spec.formulaId)
          .order('seq')
          .order('action_seq')
        if (cancel) return
        setCondition(f?.ext_formulas_conditions || null)
        setTitle(f?.title || '')
        setStatus(f?.status || 'active')
        // Group rows into steps by condition_step_id (keep step order by seq).
        const byStep = new Map()
        for (const r of rows || []) {
          const key = r.condition_step_id || `s${r.seq}`
          if (!byStep.has(key)) byStep.set(key, { condition_step_id: r.condition_step_id, seq: r.seq, text: r.ext_formulas_condition_steps?.text || '', actions: [] })
          byStep.get(key).actions.push({ action_text: r.action_text || '', due_date: r.due_date || '', assign: !!r.assign })
        }
        const list = [...byStep.values()].sort((a, b) => a.seq - b.seq)
        for (const st of list) if (!st.actions.length) st.actions.push(emptyAction())
        setSteps(list)
        setLoading(false)
        return
      }
      const cid = condId
      if (!cid) { setSteps([]); setLoading(false); return }
      const { data } = await supabase
        .from('ext_formulas_condition_steps')
        .select('id, seq, text')
        .eq('condition_id', cid)
        .order('seq')
      if (cancel) return
      setSteps((data || []).map(st => ({ condition_step_id: st.id, seq: st.seq, text: st.text, actions: [emptyAction()] })))
      setLoading(false)
    })()
    return () => { cancel = true }
  }, [isEdit, spec, condId])

  const setAction = (si, ai, k, v) =>
    setSteps(p => p.map((s, j) => j === si ? { ...s, actions: s.actions.map((a, k2) => k2 === ai ? { ...a, [k]: v } : a) } : s))
  const addAction = si => setSteps(p => p.map((s, j) => j === si ? { ...s, actions: [...s.actions, emptyAction()] } : s))
  const removeAction = (si, ai) => setSteps(p => p.map((s, j) => j === si ? { ...s, actions: s.actions.length > 1 ? s.actions.filter((_, k) => k !== ai) : s.actions } : s))

  const headerCondition = condition || spec?.condition || null

  function buildRows(formulaId) {
    const out = []
    for (const s of steps) {
      s.actions.forEach((a, ai) => {
        out.push({
          formula_id: formulaId,
          condition_step_id: s.condition_step_id,
          seq: s.seq,
          action_seq: ai + 1,
          action_text: (a.action_text || '').trim() || null,
          due_date: a.due_date || null,
          assign: !!a.assign,
        })
      })
    }
    return out
  }

  async function save() {
    setSaving(true)
    setErr(null)
    try {
      if (isEdit) {
        const { error: ue } = await supabase.from('ext_formulas_formulas').update({ status }).eq('id', spec.formulaId)
        if (ue) throw ue
        await supabase.from('ext_formulas_steps').delete().eq('formula_id', spec.formulaId)
        const rows = buildRows(spec.formulaId)
        if (rows.length) {
          const { error: se } = await supabase.from('ext_formulas_steps').insert(rows)
          if (se) throw se
        }
      } else {
        const cid = isOptional ? condId : spec.condition?.id
        if (!cid) throw new Error('Choose a condition first.')
        const insert = isOptional
          ? { type: 'optional', statistic_id: null, title: title.trim() || null, condition_id: cid, window_mode: 'static', created_by: spec.userId || null }
          : {
              type: 'stat', statistic_id: spec.statisticId, condition_id: cid, window_mode: 'static',
              period: spec.period, period_unit: spec.periodUnit || null,
              period_start: spec.periodStart || null, period_end: spec.periodEnd || null,
              created_by: spec.userId || null,
            }
        const { data: f, error } = await supabase.from('ext_formulas_formulas').insert(insert).select().single()
        if (error) throw error
        const rows = buildRows(f.id)
        if (rows.length) {
          const { error: se } = await supabase.from('ext_formulas_steps').insert(rows)
          if (se) throw se
        }
      }
      setSaving(false)
      onSaved?.()
    } catch (e) {
      setErr(e.message || String(e))
      setSaving(false)
    }
  }

  const canSave = isEdit || (isOptional ? !!condId : !!spec?.condition?.id)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              {isOptional && !isEdit ? 'New optional formula' : (spec?.statName || title || 'Formula')}
              {headerCondition && <Badge slug={headerCondition.slug} size="lg" />}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {spec?.period ? `${PERIOD_LABEL[spec.period]} condition` : isOptional ? 'No statistic — condition chosen manually' : 'Condition & handling steps'}
              {headerCondition ? ` · ${headerCondition.name}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {isOptional && !isEdit && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Title</label>
                <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Q3 hiring push" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Condition</label>
                <select className={inputCls} value={condId} onChange={e => { setCondId(e.target.value); setCondition(options.find(o => String(o.id) === String(e.target.value)) || null) }}>
                  <option value="">— Choose a condition —</option>
                  {options.map(c => <option key={c.id} value={c.id}>{c.name}{c.restricted ? ' 🔒' : ''}</option>)}
                </select>
              </div>
            </div>
          )}

          {isEdit && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-500">Status</label>
              <select className="text-sm border border-gray-200 rounded-lg px-3 py-1.5" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          )}

          {loading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : steps.length === 0 ? (
            <p className="text-sm text-gray-500">
              {canSave ? 'This condition has no handling steps yet — add some under the Settings tab.' : 'Choose a condition to see its handling steps.'}
            </p>
          ) : (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">Handling steps — add one or more actions per step.</p>
              <div className="space-y-3">
                {steps.map((s, si) => (
                  <div key={s.condition_step_id || si} className="border border-gray-100 rounded-lg p-3">
                    <p className="text-sm text-gray-800 mb-2"><span className="font-semibold text-gray-500 mr-1">{s.seq}.</span>{s.text}</p>
                    <div className="space-y-2">
                      {s.actions.map((a, ai) => (
                        <div key={ai} className="grid sm:grid-cols-[1fr_140px_auto_auto] gap-2 items-center">
                          <input className={inputCls} placeholder={`Action${s.actions.length > 1 ? ` ${ai + 1}` : ''}…`} value={a.action_text} onChange={e => setAction(si, ai, 'action_text', e.target.value)} />
                          <input type="date" className={inputCls} value={a.due_date} onChange={e => setAction(si, ai, 'due_date', e.target.value)} />
                          <label className="inline-flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer whitespace-nowrap">
                            <input type="checkbox" checked={a.assign} onChange={e => setAction(si, ai, 'assign', e.target.checked)} className="w-4 h-4 rounded accent-green-600" />
                            Assign
                          </label>
                          <button onClick={() => removeAction(si, ai)} disabled={s.actions.length <= 1} title="Remove action" className="text-red-300 hover:text-red-500 disabled:opacity-30 text-sm px-1">✕</button>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => addAction(si)} className="mt-2 text-xs text-green-700 font-medium hover:text-green-900">+ Add action</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {err && <p className="text-sm text-red-600">{err}</p>}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-2xl">
          <button onClick={onClose} className="text-sm px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          <button disabled={!canSave || saving} onClick={save} className="bg-green-700 text-white font-semibold px-5 py-2 rounded-lg hover:bg-green-800 text-sm disabled:opacity-50">
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save formula'}
          </button>
        </div>
      </div>
    </div>
  )
}
