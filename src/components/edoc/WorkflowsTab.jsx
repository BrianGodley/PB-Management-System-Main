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

// Who a Person node represents / what an Organization node represents.
const ENTITY_TYPES = [
  ['employee', 'Employee'],
  ['client', 'Client'],
  ['vendor', 'Vendor'],
  ['sub', 'Subcontractor'],
  ['other', 'Other'],
]
const ORG_TYPES = [
  ['division', 'Division'],
  ['area', 'Area'],
  ['company', 'Company'],
]
const ENTITY_LABEL = Object.fromEntries(ENTITY_TYPES)
const ORG_LABEL = Object.fromEntries(ORG_TYPES)

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
    const links = step.docLinks || []
    const multi = step.multi || links.length > 1
    const display = links.length
      ? links[0].name + (links.length > 1 ? ` +${links.length - 1}` : '')
      : label
    return (
      <div className="relative">
        {multi && (
          <>
            <div className="absolute right-[-6px] top-[-6px] w-32 h-40 rounded-md border-2 border-gray-300 bg-white" />
            <div className="absolute right-[-3px] top-[-3px] w-32 h-40 rounded-md border-2 border-gray-400 bg-white" />
          </>
        )}
        <div className="relative w-32 h-40 rounded-md border-2 border-gray-500 bg-white flex flex-col items-center justify-center px-2">
          <span className="text-2xl">📄</span>
          <span className="text-[11px] font-semibold text-gray-700 text-center mt-1 leading-tight break-words">{display}</span>
          {multi && <span className="text-[9px] text-gray-400 mt-0.5">multiple</span>}
        </div>
      </div>
    )
  }
  if (step.kind === 'organization') {
    return (
      <div className="w-52 rounded-md border-2 border-green-600 bg-green-50 px-3 py-2 flex items-center gap-2">
        <span className="text-lg">🏢</span>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-green-800 leading-tight truncate">{label}</div>
          {step.orgType && <div className="text-[9px] uppercase text-green-600 tracking-wide">{ORG_LABEL[step.orgType] || step.orgType}</div>}
        </div>
      </div>
    )
  }
  // person
  return (
    <div className="w-52 rounded-xl border-2 border-blue-500 bg-blue-50 px-3 py-2 flex items-center gap-2">
      <span className="text-lg">👤</span>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-blue-800 leading-tight truncate">{label}</div>
        {step.entityType && <div className="text-[9px] uppercase text-blue-500 tracking-wide">{ENTITY_LABEL[step.entityType] || step.entityType}</div>}
      </div>
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

// Where an arrow should attach on a node's box: the point on the perimeter in
// the direction of a target point (the other node's center). This makes start
// and end points auto-adjust as nodes are dragged around.
function edgePoint(box, towardX, towardY) {
  const cx = box.x + box.w / 2
  const cy = box.y + box.h / 2
  const dx = towardX - cx
  const dy = towardY - cy
  if (dx === 0 && dy === 0) return { x: cx, y: cy }
  const hw = box.w / 2
  const hh = box.h / 2
  const scale = 1 / Math.max(Math.abs(dx) / hw, Math.abs(dy) / hh)
  return { x: cx + dx * scale, y: cy + dy * scale }
}

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

  const byId = Object.fromEntries(steps.map(s => [s.id, s]))
  const edges = []
  const pushEdge = (a, b, label) => {
    const pa = positions[a.id]
    const pb = positions[b.id]
    if (!pa || !pb) return
    const sa = sizeOf(a)
    const sb = sizeOf(b)
    const boxA = { x: pa.x, y: pa.y, w: sa.w, h: sa.h }
    const boxB = { x: pb.x, y: pb.y, w: sb.w, h: sb.h }
    const cAx = boxA.x + boxA.w / 2
    const cAy = boxA.y + boxA.h / 2
    const cBx = boxB.x + boxB.w / 2
    const cBy = boxB.y + boxB.h / 2
    // Start on A's edge facing B; end on B's edge facing A — auto-adjusts on drag.
    const p1 = edgePoint(boxA, cBx, cBy)
    const p2 = edgePoint(boxB, cAx, cAy)
    edges.push({
      key: a.id + '_' + b.id + '_' + (label || ''),
      x1: p1.x,
      y1: p1.y,
      x2: p2.x,
      y2: p2.y,
      label,
      mx: (p1.x + p2.x) / 2,
      my: (p1.y + p2.y) / 2,
    })
  }
  // Only draw connections the user explicitly added (no auto chain).
  steps.forEach(a =>
    (a.next || []).forEach(c => {
      const b = byId[c.to]
      if (b) pushEdge(a, b, c.label)
    })
  )

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
          <g key={e.key}>
            <line
              x1={e.x1}
              y1={e.y1}
              x2={e.x2}
              y2={e.y2}
              stroke="#9ca3af"
              strokeWidth="1.5"
              markerEnd="url(#wf-arrow)"
            />
            {e.label && (
              <text
                x={e.mx}
                y={e.my}
                fontSize="10"
                textAnchor="middle"
                fill="#6b7280"
                style={{ paintOrder: 'stroke', stroke: '#fff', strokeWidth: 3 }}
              >
                {e.label}
              </text>
            )}
          </g>
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
  const [people, setPeople] = useState([]) // name suggestions (employees + clients)
  const [docs, setDocs] = useState([]) // existing documents to link (kept separate)
  const [saving, setSaving] = useState(false)

  // Existing documents a Document node can reference (they stay separate).
  useEffect(() => {
    supabase
      .from('edoc_documents')
      .select('id, name, status')
      .order('created_at', { ascending: false })
      .then(({ data }) => setDocs(data || []))
  }, [])

  // Load employee + client names for the Person picker suggestions.
  useEffect(() => {
    let cancel = false
    ;(async () => {
      const [emp, cli] = await Promise.all([
        supabase.from('employees').select('id, first_name, last_name'),
        supabase.from('clients').select('id, name'),
      ])
      if (cancel) return
      const names = []
      ;(emp.data || []).forEach(e => {
        const n = [e.first_name, e.last_name].filter(Boolean).join(' ').trim()
        if (n) names.push(n)
      })
      ;(cli.data || []).forEach(c => {
        if (c.name) names.push(c.name)
      })
      setPeople(Array.from(new Set(names)).sort())
    })()
    return () => {
      cancel = true
    }
  }, [])

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
  const addStep = kind =>
    setSteps(prev => [
      ...prev,
      {
        id: newId(),
        kind,
        label: '',
        multi: false,
        entityType: 'employee',
        orgType: 'division',
        // No connection by default — the user adds connections between items.
        next: [],
      },
    ])
  const updateStep = (id, patch) => setSteps(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)))
  const removeStep = id =>
    setSteps(prev =>
      prev
        .filter(s => s.id !== id)
        // also drop any links that pointed at the removed step
        .map(s => ({ ...s, next: (s.next || []).map(c => (c.to === id ? { ...c, to: '' } : c)) }))
    )
  const moveStep = (id, dir) =>
    setSteps(prev => {
      const i = prev.findIndex(s => s.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })

  // Per-step connections (arrows). Each entry: { to: <stepId|''>, label }.
  const addConnection = id =>
    setSteps(prev => prev.map(s => (s.id === id ? { ...s, next: [...(s.next || []), { to: '', label: '' }] } : s)))
  const updateConnection = (id, idx, patch) =>
    setSteps(prev =>
      prev.map(s => (s.id === id ? { ...s, next: (s.next || []).map((c, i) => (i === idx ? { ...c, ...patch } : c)) } : s))
    )
  const removeConnection = (id, idx) =>
    setSteps(prev => prev.map(s => (s.id === id ? { ...s, next: (s.next || []).filter((_, i) => i !== idx) } : s)))

  // Document nodes can reference existing documents (stored as { id, name }).
  const addDocLink = (id, docId) => {
    const d = docs.find(x => x.id === docId)
    if (!d) return
    setSteps(prev =>
      prev.map(s => {
        if (s.id !== id) return s
        const links = s.docLinks || []
        if (links.some(l => l.id === docId)) return s
        return { ...s, docLinks: [...links, { id: d.id, name: d.name }] }
      })
    )
  }
  const removeDocLink = (id, docId) =>
    setSteps(prev => prev.map(s => (s.id === id ? { ...s, docLinks: (s.docLinks || []).filter(l => l.id !== docId) } : s)))
  // Quick-start: link each step's first connection to the next step in order.
  const connectInSequence = () =>
    setSteps(prev =>
      prev.map((s, i) => {
        const to = prev[i + 1]?.id || ''
        const first = (s.next && s.next[0]) || { to: '', label: s.kind === 'decision' ? 'Yes' : '' }
        return { ...s, next: [{ ...first, to }, ...(s.next || []).slice(1)] }
      })
    )

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
      <datalist id="wf-people">
        {people.map(n => <option key={n} value={n} />)}
      </datalist>
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
          <div className="flex items-center justify-between flex-wrap gap-1.5">
            <span className="text-[11px] font-semibold text-gray-500 uppercase">Steps</span>
            <div className="flex gap-1.5 flex-wrap">
              {steps.length > 1 && (
                <button
                  onClick={connectInSequence}
                  className="text-xs px-2.5 py-1 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  🔗 Connect in sequence
                </button>
              )}
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
              <div key={s.id} className="border border-gray-200 rounded-lg p-2">
                <div className="flex items-center gap-2">
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
                    placeholder={s.kind === 'decision' ? 'Approved?' : s.kind === 'person' ? 'Name' : 'Label'}
                    list={s.kind === 'person' ? 'wf-people' : undefined}
                    className="input text-xs py-1 flex-1"
                  />
                  {s.kind === 'person' && (
                    <select
                      value={s.entityType || 'employee'}
                      onChange={e => updateStep(s.id, { entityType: e.target.value })}
                      className="input text-xs py-1 w-28"
                    >
                      {ENTITY_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  )}
                  {s.kind === 'organization' && (
                    <select
                      value={s.orgType || 'division'}
                      onChange={e => updateStep(s.id, { orgType: e.target.value })}
                      className="input text-xs py-1 w-28"
                    >
                      {ORG_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  )}
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

                {/* Connections (arrows out of this step) */}
                <div className="mt-1.5 pl-7 space-y-1">
                  {(s.next || []).map((c, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                      <span className="text-gray-400">→</span>
                      <input
                        value={c.label}
                        onChange={e => updateConnection(s.id, idx, { label: e.target.value })}
                        placeholder="label"
                        className="input text-[11px] py-0.5 w-24"
                      />
                      <span className="text-gray-400">to</span>
                      <select
                        value={c.to}
                        onChange={e => updateConnection(s.id, idx, { to: e.target.value })}
                        className="input text-[11px] py-0.5 flex-1"
                      >
                        <option value="">(end)</option>
                        {steps
                          .filter(o => o.id !== s.id)
                          .map(o => (
                            <option key={o.id} value={o.id}>
                              {o.label || STEP_KINDS.find(k => k.id === o.kind)?.label}
                            </option>
                          ))}
                      </select>
                      <button onClick={() => removeConnection(s.id, idx)} className="text-gray-400 hover:text-red-600 px-1">×</button>
                    </div>
                  ))}
                  <button onClick={() => addConnection(s.id)} className="text-[11px] text-green-700 hover:underline">
                    + connection
                  </button>
                </div>

                {/* Linked documents (Document nodes reference existing docs) */}
                {s.kind === 'document' && (
                  <div className="mt-1.5 pl-7 space-y-1">
                    <div className="flex flex-wrap gap-1.5">
                      {(s.docLinks || []).map(l => (
                        <span
                          key={l.id}
                          className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 border border-gray-200 rounded-full pl-2 pr-1 py-0.5 text-[11px]"
                        >
                          📄 {l.name}
                          <button onClick={() => removeDocLink(s.id, l.id)} className="hover:text-red-600">×</button>
                        </span>
                      ))}
                    </div>
                    <select
                      value=""
                      onChange={e => { if (e.target.value) addDocLink(s.id, e.target.value) }}
                      className="input text-[11px] py-0.5"
                    >
                      <option value="">+ Link existing document…</option>
                      {docs
                        .filter(d => !(s.docLinks || []).some(l => l.id === d.id))
                        .map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                )}
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
