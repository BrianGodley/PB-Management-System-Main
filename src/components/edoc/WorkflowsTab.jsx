// src/components/edoc/WorkflowsTab.jsx
// Document Workflows — multi-step approval/routing flows for documents.
// Phase 1: a typed "wizard" (name, notes, module integrations, ordered steps)
// that auto-renders a flow diagram below using four node shapes:
//   • Person   (employees, clients, vendors, subs)    — rounded rect + 👤
//   • Document (single or multiple)                   — vertical doc card 📄
//   • Organization (division/area/company)            — rect + 🏢
//   • Decision                                        — diamond
// Auto connectors link the steps top→bottom. Manual drag editing + branching
// is phase 2; positions will be saved to edoc_workflows.graph then.
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'

const fmtDate = d =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' }) : ''

// Modules a workflow can integrate with.
const MODULES = [
  'HR', 'Jobs', 'Opportunities', 'Documents', 'Accounting', 'Weekly FP',
  'Org Chart', 'Statistics', 'Subs & Vendors', 'Equipment', 'Training', 'Design', 'Bids',
]

const STEP_KINDS = [
  { id: 'person', label: 'Person' },
  { id: 'document', label: 'Document' },
  { id: 'organization', label: 'Organization' },
  { id: 'decision', label: 'Decision' },
]

const newId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 's' + Date.now() + Math.random())

// ── A single shaped node in the diagram ──
function FlowNode({ step }) {
  const label = step.label || STEP_KINDS.find(k => k.id === step.kind)?.label || 'Step'
  if (step.kind === 'decision') {
    return (
      <div className="relative w-32 h-32 flex items-center justify-center">
        <div className="absolute w-[88px] h-[88px] rotate-45 border-2 border-amber-500 bg-amber-50 rounded-sm" />
        <span className="relative text-[11px] font-semibold text-amber-800 text-center px-1 leading-tight">{label}</span>
      </div>
    )
  }
  if (step.kind === 'document') {
    return (
      <div className="relative">
        {step.multi && (
          <>
            <div className="absolute right-[-6px] top-[-6px] w-32 h-40 rounded-md border-2 border-gray-300 bg-white" />
            <div className="absolute right-[-3px] top-[-3px] w-32 h-40 rounded-md border-2 border-gray-400 bg-white" />
          </>
        )}
        <div className="relative w-32 h-40 rounded-md border-2 border-gray-500 bg-white flex flex-col items-center justify-center px-2">
          <span className="text-2xl">📄</span>
          <span className="text-[11px] font-semibold text-gray-700 text-center mt-1 leading-tight">{label}</span>
          {step.multi && <span className="text-[9px] text-gray-400 mt-0.5">multiple</span>}
        </div>
      </div>
    )
  }
  if (step.kind === 'organization') {
    return (
      <div className="w-52 rounded-md border-2 border-green-600 bg-green-50 px-3 py-2.5 flex items-center gap-2">
        <span className="text-lg">🏢</span>
        <span className="text-sm font-semibold text-green-800 leading-tight">{label}</span>
      </div>
    )
  }
  // person
  return (
    <div className="w-52 rounded-xl border-2 border-blue-500 bg-blue-50 px-3 py-2.5 flex items-center gap-2">
      <span className="text-lg">👤</span>
      <span className="text-sm font-semibold text-blue-800 leading-tight">{label}</span>
    </div>
  )
}

// Approximate node footprint (for arrow anchors + auto-layout).
const NODE_SIZE = {
  person: { w: 208, h: 56 },
  organization: { w: 208, h: 56 },
  document: { w: 128, h: 160 },
  decision: { w: 128, h: 128 },
}
const sizeOf = s => NODE_SIZE[s.kind] || NODE_SIZE.person

// Stacked vertical layout centered around x≈360.
function autoLayout(steps) {
  const pos = {}
  let y = 24
  steps.forEach(s => {
    const { w, h } = sizeOf(s)
    pos[s.id] = { x: Math.round(360 - w / 2), y }
    y += h + 56
  })
  return pos
}

// Interactive canvas — drag nodes to reposition; arrows auto-route between
// consecutive steps. Positions are lifted up so they can be saved.
function FlowCanvas({ steps, positions, setPositions }) {
  const ref = useRef(null)

  function startDrag(e, id) {
    e.preventDefault()
    const start = positions[id] || { x: 0, y: 0 }
    const sx = e.clientX
    const sy = e.clientY
    function move(ev) {
      setPositions(p => ({
        ...p,
        [id]: { x: Math.max(0, start.x + (ev.clientX - sx)), y: Math.max(0, start.y + (ev.clientY - sy)) },
      }))
    }
    function up() {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  const maxY = steps.reduce((m, s) => {
    const p = positions[s.id]
    return p ? Math.max(m, p.y + sizeOf(s).h) : m
  }, 0)
  const height = Math.max(360, maxY + 40)

  const edges = []
  for (let i = 0; i < steps.length - 1; i++) {
    const a = steps[i]
    const b = steps[i + 1]
    const pa = positions[a.id]
    const pb = positions[b.id]
    if (!pa || !pb) continue
    const sa = sizeOf(a)
    const sb = sizeOf(b)
    edges.push({
      key: a.id + '_' + b.id,
      x1: pa.x + sa.w / 2,
      y1: pa.y + sa.h,
      x2: pb.x + sb.w / 2,
      y2: pb.y,
    })
  }

  if (!steps.length) {
    return (
      <p className="text-center text-sm text-gray-400 py-10">
        Add steps in the wizard above to build the flow.
      </p>
    )
  }

  return (
    <div ref={ref} className="relative w-full overflow-auto bg-white rounded-lg border border-gray-200" style={{ height }}>
      <svg className="absolute inset-0 w-full pointer-events-none" style={{ height }}>
        <defs>
          <marker id="wf-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L8,3 L0,6 Z" fill="#9ca3af" />
          </marker>
        </defs>
        {edges.map(e => (
          <line
            key={e.key}
            x1={e.x1}
            y1={e.y1}
            x2={e.x2}
            y2={e.y2}
            stroke="#9ca3af"
            strokeWidth="1.5"
            markerEnd="url(#wf-arrow)"
          />
        ))}
      </svg>
      {steps.map(s => {
        const p = positions[s.id] || { x: 0, y: 0 }
        return (
          <div
            key={s.id}
            onMouseDown={e => startDrag(e, s.id)}
            className="absolute cursor-move select-none"
            style={{ left: p.x, top: p.y }}
          >
            <FlowNode step={s} />
          </div>
        )
      })}
    </div>
  )
}

// ── Builder: typed wizard on top, visual diagram below ──
function WorkflowBuilder({ workflow, userId, onClose, onSaved }) {
  const [name, setName] = useState(workflow?.name || '')
  const [notes, setNotes] = useState(workflow?.notes || '')
  const [modules, setModules] = useState(
    Array.isArray(workflow?.module_integrations) ? workflow.module_integrations : []
  )
  const [steps, setSteps] = useState(Array.isArray(workflow?.steps) ? workflow.steps : [])
  const [positions, setPositions] = useState(
    workflow?.graph?.positions && typeof workflow.graph.positions === 'object' ? workflow.graph.positions : {}
  )
  const [saving, setSaving] = useState(false)

  // Keep a position for every step: preserve moved nodes, append new ones
  // below, drop removed ones.
  useEffect(() => {
    setPositions(prev => {
      const next = {}
      let maxY = 24
      steps.forEach(s => {
        if (prev[s.id]) {
          next[s.id] = prev[s.id]
          maxY = Math.max(maxY, prev[s.id].y + sizeOf(s).h + 56)
        }
      })
      steps.forEach(s => {
        if (!next[s.id]) {
          const { w, h } = sizeOf(s)
          next[s.id] = { x: Math.round(360 - w / 2), y: maxY }
          maxY += h + 56
        }
      })
      return next
    })
  }, [steps])

  const toggleModule = m => setModules(prev => (prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]))
  const addStep = kind => setSteps(prev => [...prev, { id: newId(), kind, label: '', multi: false }])
  const updateStep = (id, patch) => setSteps(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)))
  const removeStep = id => setSteps(prev => prev.filter(s => s.id !== id))
  const moveStep = (id, dir) =>
    setSteps(prev => {
      const i = prev.findIndex(s => s.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })

  async function save() {
    setSaving(true)
    const payload = {
      name: name.trim() || 'Untitled Workflow',
      notes,
      module_integrations: modules,
      steps,
      graph: { positions },
      updated_at: new Date().toISOString(),
    }
    let error
    if (workflow?.id) {
      ;({ error } = await supabase.from('edoc_workflows').update(payload).eq('id', workflow.id))
    } else {
      ;({ error } = await supabase
        .from('edoc_workflows')
        .insert({ ...payload, created_by: userId || null }))
    }
    setSaving(false)
    if (error) {
      alert('Save failed: ' + error.message)
      return
    }
    onSaved?.()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">← Back to workflows</button>
        <button
          onClick={save}
          disabled={saving}
          className="text-sm bg-green-700 text-white font-semibold px-5 py-2 rounded-lg hover:bg-green-800 disabled:opacity-50"
        >
          {saving ? 'Saving…' : '💾 Save Workflow'}
        </button>
      </div>

      {/* Typed wizard */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
        <div className="grid md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-[11px] font-semibold text-gray-500 uppercase">Workflow name</span>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Policy review & acknowledgment" className="input text-sm py-1.5 w-full mt-1" />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold text-gray-500 uppercase">Notes</span>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="What this workflow is for" className="input text-sm py-1.5 w-full mt-1" />
          </label>
        </div>

        <div className="mt-4">
          <span className="text-[11px] font-semibold text-gray-500 uppercase">Module integrations</span>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {MODULES.map(m => (
              <button
                key={m}
                onClick={() => toggleModule(m)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  modules.includes(m)
                    ? 'bg-green-700 text-white border-2 border-black'
                    : 'bg-white text-gray-600 border border-gray-300 hover:border-green-400'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500 uppercase">Steps</span>
            <div className="flex gap-1.5">
              {STEP_KINDS.map(k => (
                <button
                  key={k.id}
                  onClick={() => addStep(k.id)}
                  className="text-xs px-2.5 py-1 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  ＋ {k.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-2 space-y-2">
            {steps.length === 0 && (
              <p className="text-xs text-gray-400">Add a Person, Document, Organization, or Decision step.</p>
            )}
            {steps.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2 border border-gray-200 rounded-lg p-2">
                <span className="text-[11px] text-gray-400 w-5 text-center">{i + 1}</span>
                <select
                  value={s.kind}
                  onChange={e => updateStep(s.id, { kind: e.target.value })}
                  className="input text-xs py-1 w-32"
                >
                  {STEP_KINDS.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
                </select>
                <input
                  value={s.label}
                  onChange={e => updateStep(s.id, { label: e.target.value })}
                  placeholder={s.kind === 'decision' ? 'Approved?' : 'Label'}
                  className="input text-xs py-1 flex-1"
                />
                {s.kind === 'document' && (
                  <label className="flex items-center gap-1 text-[11px] text-gray-500 whitespace-nowrap">
                    <input type="checkbox" checked={!!s.multi} onChange={e => updateStep(s.id, { multi: e.target.checked })} className="accent-green-700" />
                    multiple
                  </label>
                )}
                <button onClick={() => moveStep(s.id, -1)} className="text-gray-400 hover:text-gray-700 px-1" title="Move up">↑</button>
                <button onClick={() => moveStep(s.id, 1)} className="text-gray-400 hover:text-gray-700 px-1" title="Move down">↓</button>
                <button onClick={() => removeStep(s.id)} className="text-gray-400 hover:text-red-600 px-1" title="Remove">×</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Visual diagram — drag nodes to arrange */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] font-semibold text-gray-500 uppercase">Flow diagram — drag nodes to arrange</p>
          {steps.length > 0 && (
            <button
              onClick={() => setPositions(autoLayout(steps))}
              className="text-[11px] px-2 py-1 rounded-lg border border-gray-300 text-gray-600 hover:bg-white"
            >
              ⤢ Auto-arrange
            </button>
          )}
        </div>
        <FlowCanvas steps={steps} positions={positions} setPositions={setPositions} />
      </div>
    </div>
  )
}

export default function WorkflowsTab({ userId }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // workflow object | 'new' | null

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('edoc_workflows')
      .select('*')
      .order('created_at', { ascending: false })
    setRows(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleDelete(e, w) {
    e.stopPropagation()
    if (!window.confirm(`Delete workflow "${w.name}"?`)) return
    const { error } = await supabase.from('edoc_workflows').delete().eq('id', w.id)
    if (error) {
      alert('Delete failed: ' + error.message)
      return
    }
    load()
  }

  if (editing) {
    return (
      <WorkflowBuilder
        workflow={editing === 'new' ? null : editing}
        userId={userId}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null)
          load()
        }}
      />
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">
          Multi-step approval &amp; routing flows for documents (e.g. secondary approval before sending, or policy → review → distribute → acknowledge).
        </p>
        <button
          onClick={() => setEditing('new')}
          className="text-xs px-3 py-1.5 rounded-lg bg-green-700 text-white font-semibold hover:bg-green-800 whitespace-nowrap"
        >
          ＋ Create Document Workflow
        </button>
      </div>

      {loading ? (
        <p className="text-center text-sm text-gray-400 py-8">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-8">No workflows yet. Create one to get started.</p>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wide text-xs">
                <th className="px-4 py-2 text-left font-semibold">Name</th>
                <th className="px-3 py-2 text-left font-semibold">Creation Date</th>
                <th className="px-3 py-2 text-left font-semibold">Module Integrations</th>
                <th className="px-3 py-2 text-left font-semibold">Notes</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(w => (
                <tr key={w.id} onClick={() => setEditing(w)} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-4 py-2 font-medium text-gray-800">{w.name}</td>
                  <td className="px-3 py-2 text-gray-500">{fmtDate(w.created_at)}</td>
                  <td className="px-3 py-2 text-gray-600">
                    {(Array.isArray(w.module_integrations) ? w.module_integrations : []).join(', ') || '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-500 truncate max-w-xs">{w.notes || '—'}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={e => handleDelete(e, w)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
