// src/extensions/formulas/ConditionManager.jsx
//
// Settings screen for the Formulas extension: view the standard (read-only)
// conditions and their handling steps, create/edit/delete custom conditions,
// and control per-user access to RESTRICTED conditions (e.g. the lower
// conditions Liability/Doubt/Enemy/Treason/Confusion).
//
// Standard conditions are read-only (no step customization). Tenants add their
// own custom conditions instead.
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { CONDITION_META } from './lib/condition.js'
import ConditionAccessModal from './ConditionAccessModal.jsx'

const slugify = s =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'condition'

function Badge({ slug }) {
  const m = CONDITION_META[slug]
  if (!m) return null
  return (
    <span className="inline-block text-[11px] font-semibold rounded-full px-2 py-0.5" style={{ color: m.color, background: m.bg }}>
      {m.label}
    </span>
  )
}

export default function ConditionManager() {
  const [conditions, setConditions] = useState([])
  const [stepsByCond, setStepsByCond] = useState({})
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // { id?, name, slug, isNew, steps:[{text}] }
  const [access, setAccess] = useState(null)   // { conditionId, name } | null
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  async function load() {
    setLoading(true)
    let { data: conds, error: cerr } = await supabase
      .from('ext_formulas_conditions')
      .select('id, name, slug, tenant_id, read_only, restricted, sort_order')
      .order('sort_order')
    if (cerr) {
      // `restricted` column not present yet (migration not applied) — fall back.
      const r = await supabase
        .from('ext_formulas_conditions')
        .select('id, name, slug, tenant_id, read_only, sort_order')
        .order('sort_order')
      conds = r.data
    }
    const list = conds || []
    const { data: steps } = await supabase
      .from('ext_formulas_condition_steps')
      .select('id, condition_id, seq, text')
      .order('seq')
    const map = {}
    for (const s of steps || []) (map[s.condition_id] = map[s.condition_id] || []).push(s)
    setConditions(list)
    setStepsByCond(map)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const tenantSlugs = new Set(conditions.filter(c => c.tenant_id).map(c => c.slug))

  function startNew() {
    setErr(null)
    setEditing({ name: '', slug: '', isNew: true, steps: [{ text: '' }] })
  }
  function startEdit(c) {
    setErr(null)
    const steps = (stepsByCond[c.id] || []).map(s => ({ text: s.text }))
    setEditing({ id: c.id, name: c.name, slug: c.slug, isNew: false, steps: steps.length ? steps : [{ text: '' }] })
  }

  async function remove(c) {
    if (!confirm(`Delete the custom condition "${c.name}"?`)) return
    setBusy(true)
    await supabase.from('ext_formulas_conditions').delete().eq('id', c.id)
    setBusy(false)
    load()
  }

  async function toggleRestricted(c) {
    setBusy(true)
    await supabase.from('ext_formulas_conditions').update({ restricted: !c.restricted }).eq('id', c.id)
    setBusy(false)
    load()
  }

  async function save() {
    if (!editing) return
    const name = editing.name.trim()
    if (!name) { setErr('Name is required.'); return }
    const slug = editing.slug.trim() || slugify(name)
    const cleanSteps = editing.steps.map(s => s.text.trim()).filter(Boolean)
    setBusy(true)
    setErr(null)
    let condId = editing.id
    if (editing.isNew) {
      const maxSort = Math.max(0, ...conditions.map(c => c.sort_order || 0))
      const { data, error } = await supabase
        .from('ext_formulas_conditions')
        .insert({ name, slug, sort_order: maxSort + 1, is_default: false, read_only: false })
        .select()
        .single()
      if (error) { setErr(error.message); setBusy(false); return }
      condId = data.id
    } else {
      const { error } = await supabase.from('ext_formulas_conditions').update({ name, slug }).eq('id', condId)
      if (error) { setErr(error.message); setBusy(false); return }
    }
    await supabase.from('ext_formulas_condition_steps').delete().eq('condition_id', condId)
    if (cleanSteps.length) {
      const rows = cleanSteps.map((text, i) => ({ condition_id: condId, seq: i + 1, text }))
      const { error: se } = await supabase.from('ext_formulas_condition_steps').insert(rows)
      if (se) { setErr(se.message); setBusy(false); return }
    }
    setBusy(false)
    setEditing(null)
    load()
  }

  const setStepText = (i, v) => setEditing(e => ({ ...e, steps: e.steps.map((s, j) => (j === i ? { text: v } : s)) }))
  const addStep = () => setEditing(e => ({ ...e, steps: [...e.steps, { text: '' }] }))
  const removeStep = i => setEditing(e => ({ ...e, steps: e.steps.filter((_, j) => j !== i) }))

  const input = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600'

  if (editing) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
        <h2 className="text-sm font-bold text-gray-900">{editing.isNew ? 'New custom condition' : `Edit “${editing.name}”`}</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Name</label>
            <input className={input} value={editing.name} onChange={e => setEditing(s => ({ ...s, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Key</label>
            <input className={input} value={editing.slug} placeholder={slugify(editing.name)} onChange={e => setEditing(s => ({ ...s, slug: e.target.value }))} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-2">Handling steps</label>
          <div className="space-y-2">
            {editing.steps.map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-xs text-gray-400 pt-2.5 w-5 text-right">{i + 1}.</span>
                <textarea rows={1} className={input} value={s.text} onChange={e => setStepText(i, e.target.value)} placeholder="Step text…" />
                <button onClick={() => removeStep(i)} className="text-red-300 hover:text-red-500 text-sm pt-2">✕</button>
              </div>
            ))}
          </div>
          <button onClick={addStep} className="mt-2 text-xs text-green-700 font-medium hover:text-green-900">+ Add step</button>
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={() => setEditing(null)} className="text-sm px-4 py-2 border border-gray-200 rounded-lg">Cancel</button>
          <button onClick={save} disabled={busy} className="bg-green-700 text-white font-semibold px-5 py-2 rounded-lg hover:bg-green-800 text-sm disabled:opacity-50">
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end items-center">
        <button onClick={startNew} className="text-sm bg-green-700 text-white font-semibold px-4 py-2 rounded-lg hover:bg-green-800">+ New Condition</button>
      </div>
      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        conditions.map(c => {
          const isDefault = !c.tenant_id
          const overridden = isDefault && tenantSlugs.has(c.slug)
          if (overridden) return null
          const steps = stepsByCond[c.id] || []
          return (
            <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-800">{c.name}</span>
                  <Badge slug={c.slug} />
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isDefault ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                    {isDefault ? 'Standard' : 'Custom'}
                  </span>
                  {c.restricted && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">🔒 Restricted</span>
                  )}
                </div>
                <div className="flex gap-3 items-center">
                  {c.restricted && (
                    <button onClick={() => setAccess({ conditionId: c.id, name: c.name })} className="text-xs text-green-700 font-medium hover:text-green-900">Manage access</button>
                  )}
                  {!isDefault && (
                    <>
                      <button onClick={() => toggleRestricted(c)} disabled={busy} className="text-xs text-gray-500 hover:text-gray-700">
                        {c.restricted ? 'Make open' : 'Make restricted'}
                      </button>
                      <button onClick={() => startEdit(c)} className="text-xs text-green-700 font-medium hover:text-green-900">Edit</button>
                      <button onClick={() => remove(c)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
                    </>
                  )}
                </div>
              </div>
              <ol className="text-sm text-gray-600 space-y-0.5 list-decimal ml-5">
                {steps.length ? steps.map(s => <li key={s.id}>{s.text}</li>) : <li className="list-none text-gray-400 italic">No steps</li>}
              </ol>
            </div>
          )
        })
      )}

      {access && (
        <ConditionAccessModal
          conditionId={access.conditionId}
          conditionName={access.name}
          onClose={() => setAccess(null)}
        />
      )}
    </div>
  )
}
