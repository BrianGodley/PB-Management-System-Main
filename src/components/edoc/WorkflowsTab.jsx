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
import html2canvas from 'html2canvas'
import { supabase } from '../../lib/supabase'

const escHtml = s =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

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
  { id: 'merge', label: 'Merge' },
  { id: 'delay', label: 'Delay' },
  { id: 'datastore', label: 'Data Storage' },
]

// Default workflow type names, seeded per tenant on first load (then fully
// user-editable in Settings).
const DEFAULT_TYPE_NAMES = ['Document', 'Decision', 'Installation', 'Maintenance', 'Pilot', 'Sales', 'Finance', 'Other']

// The "large list of objects" users pick from when defining a type's template
// or adding steps. Each maps to one of the base render shapes (`kind`) and
// carries an icon + a short hint the user can override with their own purpose.
const OBJECT_CATALOG = [
  // People
  { id: 'person', label: 'Person', kind: 'person', icon: '👤', hint: 'A specific person in the flow.' },
  { id: 'employee', label: 'Employee', kind: 'person', icon: '👷', hint: 'An internal team member.' },
  { id: 'client', label: 'Client', kind: 'person', icon: '🧑‍💼', hint: 'A customer / client.' },
  { id: 'vendor', label: 'Vendor', kind: 'person', icon: '🏷️', hint: 'A supplier or vendor.' },
  { id: 'subcontractor', label: 'Subcontractor', kind: 'person', icon: '🔧', hint: 'A subcontractor.' },
  // Documents
  { id: 'document', label: 'Document', kind: 'document', icon: '📄', hint: 'A single document.' },
  { id: 'form', label: 'Form', kind: 'document', icon: '📝', hint: 'A form to fill out.' },
  { id: 'contract', label: 'Contract', kind: 'document', icon: '📑', hint: 'A contract or agreement.' },
  { id: 'report', label: 'Report', kind: 'document', icon: '📊', hint: 'A generated report.' },
  // Organization
  { id: 'organization', label: 'Organization', kind: 'organization', icon: '🏢', hint: 'A division, area, or company.' },
  // Decisions / gates
  { id: 'decision', label: 'Decision', kind: 'decision', icon: '❓', hint: 'A yes/no branch.' },
  { id: 'approval', label: 'Approval', kind: 'decision', icon: '✅', hint: 'An approve / reject gate.' },
  { id: 'signoff', label: 'Sign-off', kind: 'decision', icon: '✍️', hint: 'A required signature.' },
  { id: 'review', label: 'Review', kind: 'decision', icon: '🔍', hint: 'A review checkpoint.' },
  { id: 'condition', label: 'Condition', kind: 'decision', icon: '⚖️', hint: 'A conditional rule.' },
  // Flow control
  { id: 'merge', label: 'Merge', kind: 'merge', icon: '🔀', hint: 'Merge multiple paths into one.' },
  { id: 'delay', label: 'Delay', kind: 'delay', icon: '⏳', hint: 'A wait / delay.' },
  { id: 'timer', label: 'Timer', kind: 'delay', icon: '⏰', hint: 'A timed wait or deadline.' },
  // Actions (generic)
  { id: 'task', label: 'Task', kind: 'action', icon: '☑️', hint: 'A task someone must complete.' },
  { id: 'notification', label: 'Notification', kind: 'action', icon: '🔔', hint: 'Send a notification.' },
  { id: 'email', label: 'Email', kind: 'action', icon: '✉️', hint: 'Send an email.' },
  { id: 'integration', label: 'Integration', kind: 'action', icon: '🔌', hint: 'Call another system or module.' },
  // Data
  { id: 'datastore', label: 'Data Storage', kind: 'datastore', icon: '🗄️', hint: 'Store or record data.' },
]
const CATALOG_BY_ID = Object.fromEntries(OBJECT_CATALOG.map(o => [o.id, o]))

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
        <span className="text-lg">{step.icon || '🏢'}</span>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-green-800 leading-tight truncate">{label}</div>
          {step.orgType && <div className="text-[9px] uppercase text-green-600 tracking-wide">{ORG_LABEL[step.orgType] || step.orgType}</div>}
        </div>
      </div>
    )
  }
  if (step.kind === 'merge') {
    // Upward triangle merge symbol.
    return (
      <div className="relative w-32 h-24 flex items-end justify-center">
        <svg viewBox="0 0 100 80" className="absolute inset-0 w-full h-full">
          <polygon points="50,4 96,76 4,76" fill="#fef3c7" stroke="#d97706" strokeWidth="3" />
        </svg>
        <span className="relative text-[10px] font-semibold text-amber-800 text-center px-2 pb-1 leading-tight">{label}</span>
      </div>
    )
  }
  if (step.kind === 'delay') {
    // Rectangle with a curved right edge (D-shape).
    return (
      <div
        className="h-14 w-40 bg-white border-2 border-purple-500 flex items-center gap-2 pl-3 pr-6"
        style={{ borderRadius: '6px 28px 28px 6px' }}
      >
        <span className="text-lg">⏳</span>
        <span className="text-sm font-semibold text-purple-800 leading-tight truncate">{label}</span>
      </div>
    )
  }
  if (step.kind === 'datastore') {
    // Database cylinder.
    return (
      <div className="relative w-32 h-[88px]">
        <svg viewBox="0 0 100 80" className="absolute inset-0 w-full h-full">
          <path d="M8 14 V66 A42 12 0 0 0 92 66 V14" fill="#e0f2fe" stroke="#0284c7" strokeWidth="3" />
          <ellipse cx="50" cy="14" rx="42" ry="12" fill="#e0f2fe" stroke="#0284c7" strokeWidth="3" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-sky-800 text-center px-3 pt-3 leading-tight">{label}</span>
      </div>
    )
  }
  if (step.kind === 'action') {
    // Generic action: rounded rect with the object's own icon.
    return (
      <div className="w-52 rounded-lg border-2 border-indigo-500 bg-indigo-50 px-3 py-2 flex items-center gap-2">
        <span className="text-lg">{step.icon || '⚙️'}</span>
        <div className="text-sm font-semibold text-indigo-800 leading-tight truncate">{label}</div>
      </div>
    )
  }
  // person
  return (
    <div className="w-52 rounded-xl border-2 border-blue-500 bg-blue-50 px-3 py-2 flex items-center gap-2">
      <span className="text-lg">{step.icon || '👤'}</span>
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
  merge: { w: 128, h: 96 },
  delay: { w: 168, h: 56 },
  datastore: { w: 128, h: 88 },
  action: { w: 208, h: 56 },
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
function FlowCanvas({ steps, positions, setPositions, readOnly = false }) {
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
            onMouseDown={readOnly ? undefined : e => startDrag(e, s.id)}
            className={`absolute select-none ${readOnly ? '' : 'cursor-move'}`}
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
function WorkflowBuilder({ workflow, userId, types = [], onClose, onSaved }) {
  const [name, setName] = useState(workflow?.name || '')
  const [type, setType] = useState(workflow?.type || '')
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
  // New workflows open straight into editing; existing ones open in view mode
  // (diagram only) until the user clicks Edit.
  const [editMode, setEditMode] = useState(!workflow)
  const [savedId, setSavedId] = useState(workflow?.id || null)
  const [printing, setPrinting] = useState(false)
  const diagramRef = useRef(null)

  // Print / Save-as-PDF: snapshot the flow diagram, drop it into a clean print
  // window with the workflow header, and open the browser print dialog (which
  // offers "Save as PDF" as a destination).
  async function printWorkflow() {
    setPrinting(true)
    try {
      let imgHtml = ''
      const el = diagramRef.current
      if (el) {
        const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
        imgHtml = `<img src="${canvas.toDataURL('image/png')}" style="max-width:100%;height:auto;border:1px solid #e5e7eb;border-radius:8px;" />`
      }
      const mods = (modules || []).join(', ')
      const w = window.open('', '_blank', 'width=900,height=1000')
      if (!w) { alert('Please allow pop-ups to print this workflow.'); return }
      w.document.write(`<!doctype html><html><head><meta charset="utf-8"/>
        <title>${escHtml(name) || 'Workflow'}</title>
        <style>
          *{box-sizing:border-box} body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111827;margin:32px;}
          h1{font-size:22px;margin:0 0 4px;} .meta{color:#6b7280;font-size:13px;margin:2px 0;}
          .badge{display:inline-block;background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;border-radius:999px;padding:1px 10px;font-size:12px;font-weight:600;}
          .notes{margin:8px 0 16px;font-size:14px;color:#374151;}
          @media print{ body{margin:12mm;} }
        </style></head><body>
        ${type ? `<div class="meta"><span class="badge">${escHtml(type)}</span></div>` : ''}
        <h1>${escHtml(name) || 'Untitled Workflow'}</h1>
        ${notes ? `<div class="notes">${escHtml(notes)}</div>` : ''}
        ${mods ? `<div class="meta"><strong>Modules:</strong> ${escHtml(mods)}</div>` : ''}
        <div class="meta" style="margin-bottom:16px;">${steps.length} step${steps.length === 1 ? '' : 's'}</div>
        ${imgHtml || '<p style="color:#9ca3af;">No diagram to print.</p>'}
        </body></html>`)
      w.document.close()
      w.focus()
      setTimeout(() => { try { w.print() } catch { /* ignore */ } }, 350)
    } catch (e) {
      alert('Could not prepare the printout: ' + (e?.message || e))
    } finally {
      setPrinting(false)
    }
  }

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

  // Choosing a type for a brand-new, empty workflow pre-loads that type's
  // template objects as starting steps.
  const chooseType = nm => {
    setType(nm)
    if (!workflow && steps.length === 0) {
      const t = types.find(x => x.name === nm)
      const objs = Array.isArray(t?.objects) ? t.objects : []
      if (objs.length) {
        setSteps(
          objs.map(o => ({
            id: newId(),
            kind: o.kind || 'person',
            label: o.label || '',
            icon: o.icon,
            multi: false,
            entityType: 'employee',
            orgType: 'division',
            next: [],
          }))
        )
      }
    }
  }
  const addStep = kind =>
    setSteps(prev => {
      // Decisions get a sequential default name (Decision 1, 2, 3…) so they're
      // easy to follow on the chart and in the connection chooser lists.
      const label = kind === 'decision' ? `Decision ${prev.filter(s => s.kind === 'decision').length + 1}` : ''
      return [
        ...prev,
        {
          id: newId(),
          kind,
          label,
          multi: false,
          entityType: 'employee',
          orgType: 'division',
          // No connection by default — the user adds connections between items.
          next: [],
        },
      ]
    })
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
    if (!type) {
      alert('Please choose a workflow Type.')
      return
    }
    setSaving(true)
    const payload = {
      name: name.trim() || 'Untitled Workflow',
      type,
      notes,
      module_integrations: modules,
      steps,
      graph: { positions },
      updated_at: new Date().toISOString(),
    }
    const id = workflow?.id || savedId
    let error
    if (id) {
      ;({ error } = await supabase.from('edoc_workflows').update(payload).eq('id', id))
    } else {
      const res = await supabase
        .from('edoc_workflows')
        .insert({ ...payload, created_by: userId || null })
        .select('id')
        .single()
      error = res.error
      if (res.data?.id) setSavedId(res.data.id)
    }
    setSaving(false)
    if (error) {
      alert('Save failed: ' + error.message)
      return
    }
    // Stay open in view mode (button flips to Edit); refresh the table behind.
    setEditMode(false)
    onSaved?.()
  }

  return (
    <div>
      <datalist id="wf-people">
        {people.map(n => <option key={n} value={n} />)}
      </datalist>
      <div className="flex items-center justify-between mb-3">
        <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">← Back to workflows</button>
        <div className="flex items-center gap-2">
          <button
            onClick={printWorkflow}
            disabled={printing}
            title="Print or save this workflow as a PDF"
            className="text-sm border border-gray-300 text-gray-700 font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {printing ? 'Preparing…' : '🖨 Print / PDF'}
          </button>
          {editMode ? (
            <button
              onClick={save}
              disabled={saving}
              className="text-sm bg-green-700 text-white font-semibold px-5 py-2 rounded-lg hover:bg-green-800 disabled:opacity-50"
            >
              {saving ? 'Saving…' : '💾 Save Workflow'}
            </button>
          ) : (
            <button
              onClick={() => setEditMode(true)}
              className="text-sm bg-green-700 text-white font-semibold px-5 py-2 rounded-lg hover:bg-green-800"
            >
              ✎ Edit
            </button>
          )}
        </div>
      </div>

      {/* View mode: show the workflow name as a heading (wizard hidden). */}
      {!editMode && (
        <h2 className="text-lg font-bold text-gray-900 mb-1">{name || 'Untitled Workflow'}</h2>
      )}
      {!editMode && notes && <p className="text-sm text-gray-500 mb-3">{notes}</p>}

      {/* Typed wizard — only in edit mode */}
      {editMode && (
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
        <div className="grid md:grid-cols-3 gap-4">
          <label className="block">
            <span className="text-[11px] font-semibold text-gray-500 uppercase">
              Type <span className="text-red-500">*</span>
            </span>
            <select value={type} onChange={e => chooseType(e.target.value)} className="input text-sm py-1.5 w-full mt-1">
              <option value="">Select type…</option>
              {types.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
          </label>
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
      )}

      {/* Visual diagram — always shown; draggable only while editing */}
      <div ref={diagramRef} className="bg-gray-50 border border-gray-200 rounded-xl p-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] font-semibold text-gray-500 uppercase">
            {editMode ? 'Flow diagram — drag nodes to arrange' : 'Flow diagram'}
          </p>
          {editMode && steps.length > 0 && (
            <button
              onClick={() => setPositions(autoLayout(steps))}
              className="text-[11px] px-2 py-1 rounded-lg border border-gray-300 text-gray-600 hover:bg-white"
            >
              ⤢ Auto-arrange
            </button>
          )}
        </div>
        <FlowCanvas steps={steps} positions={positions} setPositions={setPositions} readOnly={!editMode} />
      </div>
    </div>
  )
}

// ── Settings: manage workflow Types (reusable templates) ──
function WorkflowSettings({ types, onChange }) {
  const [selId, setSelId] = useState(types[0]?.id || null)
  const sel = types.find(t => t.id === selId) || null
  const [name, setName] = useState('')
  const [objects, setObjects] = useState([])
  const [saving, setSaving] = useState(false)
  const [showCatalog, setShowCatalog] = useState(false)

  useEffect(() => {
    setName(sel?.name || '')
    setObjects(Array.isArray(sel?.objects) ? sel.objects : [])
    setShowCatalog(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selId])

  async function addType() {
    const nm = window.prompt('New workflow type name:')
    if (!nm || !nm.trim()) return
    const max = Math.max(0, ...types.map(t => t.sort_order || 0))
    const { data, error } = await supabase
      .from('workflow_types')
      .insert({ name: nm.trim(), sort_order: max + 1, objects: [] })
      .select('id')
      .single()
    if (error) { alert('Could not add type: ' + error.message); return }
    await onChange?.()
    if (data?.id) setSelId(data.id)
  }
  async function deleteType() {
    if (!sel) return
    if (!window.confirm(`Delete the "${sel.name}" type? Existing workflows keep their data.`)) return
    const { error } = await supabase.from('workflow_types').delete().eq('id', sel.id)
    if (error) { alert('Delete failed: ' + error.message); return }
    setSelId(null)
    onChange?.()
  }
  async function saveType() {
    if (!sel) return
    if (!name.trim()) { alert('Type name is required.'); return }
    setSaving(true)
    const { error } = await supabase
      .from('workflow_types')
      .update({ name: name.trim(), objects, updated_at: new Date().toISOString() })
      .eq('id', sel.id)
    setSaving(false)
    if (error) { alert('Save failed: ' + error.message); return }
    onChange?.()
  }

  const addObject = cat =>
    setObjects(prev => [...prev, { id: newId(), catId: cat.id, kind: cat.kind, label: cat.label, icon: cat.icon, purpose: cat.hint }])
  const updateObject = (id, patch) => setObjects(prev => prev.map(o => (o.id === id ? { ...o, ...patch } : o)))
  const removeObject = id => setObjects(prev => prev.filter(o => o.id !== id))
  const moveObject = (id, dir) =>
    setObjects(prev => {
      const i = prev.findIndex(o => o.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const n = [...prev]
      ;[n[i], n[j]] = [n[j], n[i]]
      return n
    })

  return (
    <div className="grid md:grid-cols-[220px_1fr] gap-4">
      {/* Type list */}
      <div className="border border-gray-200 rounded-xl p-2 bg-white self-start">
        <div className="flex items-center justify-between px-1 pb-2">
          <span className="text-[11px] font-semibold text-gray-500 uppercase">Workflow Types</span>
          <button onClick={addType} className="text-xs text-green-700 font-semibold hover:underline">+ New</button>
        </div>
        {types.length === 0 ? (
          <p className="text-xs text-gray-400 px-1 py-2">No types yet.</p>
        ) : (
          types.map(t => (
            <button
              key={t.id}
              onClick={() => setSelId(t.id)}
              className={`w-full text-left text-sm px-2 py-1.5 rounded-lg ${selId === t.id ? 'bg-green-50 text-green-800 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              {t.name}
              <span className="text-[10px] text-gray-400 ml-1">{Array.isArray(t.objects) ? t.objects.length : 0} obj</span>
            </button>
          ))
        )}
      </div>

      {/* Editor */}
      {!sel ? (
        <div className="border border-gray-200 rounded-xl p-6 text-center text-sm text-gray-400 bg-white">
          Select a type to edit, or add a new one.
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl p-4 bg-white">
          <div className="flex items-center gap-2 mb-4">
            <input value={name} onChange={e => setName(e.target.value)} className="input text-sm py-1.5 flex-1" placeholder="Type name" />
            <button onClick={saveType} disabled={saving} className="text-sm bg-green-700 text-white font-semibold px-4 py-2 rounded-lg hover:bg-green-800 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={deleteType} className="text-sm border border-red-100 text-red-500 px-3 py-2 rounded-lg hover:bg-red-50">Delete</button>
          </div>

          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-gray-500 uppercase">Template objects</span>
            <button onClick={() => setShowCatalog(v => !v)} className="text-xs px-2.5 py-1 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">＋ Add object</button>
          </div>

          {showCatalog && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
              {OBJECT_CATALOG.map(c => (
                <button
                  key={c.id}
                  onClick={() => addObject(c)}
                  title={c.hint}
                  className="flex items-center gap-1.5 text-left text-xs px-2 py-1.5 rounded-lg bg-white border border-gray-200 hover:border-green-400"
                >
                  <span>{c.icon}</span>
                  <span className="truncate">{c.label}</span>
                </button>
              ))}
            </div>
          )}

          {objects.length === 0 ? (
            <p className="text-xs text-gray-400 py-3">No objects yet. Add objects from the catalog to build this type's template.</p>
          ) : (
            <div className="space-y-2">
              {objects.map(o => (
                <div key={o.id} className="border border-gray-200 rounded-lg p-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{o.icon}</span>
                    <input value={o.label} onChange={e => updateObject(o.id, { label: e.target.value })} className="input text-xs py-1 flex-1" placeholder="Object name" />
                    <span className="text-[10px] uppercase text-gray-400">{o.kind}</span>
                    <button onClick={() => moveObject(o.id, -1)} className="text-gray-400 hover:text-gray-700 px-1" title="Move up">↑</button>
                    <button onClick={() => moveObject(o.id, 1)} className="text-gray-400 hover:text-gray-700 px-1" title="Move down">↓</button>
                    <button onClick={() => removeObject(o.id)} className="text-gray-400 hover:text-red-600 px-1" title="Remove">×</button>
                  </div>
                  <input
                    value={o.purpose || ''}
                    onChange={e => updateObject(o.id, { purpose: e.target.value })}
                    placeholder="What is this object for?"
                    className="input text-[11px] py-1 w-full mt-1.5"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function WorkflowsTab({ userId }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // workflow object | 'new' | null
  const [tab, setTab] = useState('workflows') // 'workflows' | 'settings'
  const [types, setTypes] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('edoc_workflows')
      .select('*')
      .order('created_at', { ascending: false })
    setRows(data || [])
    setLoading(false)
  }, [])

  // Load the tenant's workflow types; self-seed the defaults on first use so
  // every tenant starts with the familiar set (then fully editable in Settings).
  const loadTypes = useCallback(async () => {
    const { data } = await supabase.from('workflow_types').select('*').order('sort_order')
    let list = data || []
    if (list.length === 0) {
      await supabase
        .from('workflow_types')
        .insert(DEFAULT_TYPE_NAMES.map((name, i) => ({ name, sort_order: i + 1, objects: [] })))
      const res = await supabase.from('workflow_types').select('*').order('sort_order')
      list = res.data || []
    }
    setTypes(list)
  }, [])

  useEffect(() => {
    load()
    loadTypes()
  }, [load, loadTypes])

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
        types={types}
        onClose={() => setEditing(null)}
        onSaved={() => load()}
      />
    )
  }

  return (
    <div>
      <div className="flex items-center gap-1 border-b border-gray-200 mb-4">
        {[['workflows', '🔀 Workflows'], ['settings', '⚙️ Settings']].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${tab === k ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === 'settings' ? (
        <WorkflowSettings types={types} onChange={loadTypes} />
      ) : (
      <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">
          Multi-step approval &amp; routing flows for documents (e.g. secondary approval before sending, or policy → review → distribute → acknowledge).
        </p>
        <button
          onClick={() => setEditing('new')}
          className="text-xs px-3 py-1.5 rounded-lg bg-green-700 text-white font-semibold hover:bg-green-800 whitespace-nowrap"
        >
          ＋ New Workflow
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
                <th className="px-4 py-2 text-left font-semibold">Type</th>
                <th className="px-3 py-2 text-left font-semibold">Name</th>
                <th className="px-3 py-2 text-left font-semibold">Creation Date</th>
                <th className="px-3 py-2 text-left font-semibold">Module Integrations</th>
                <th className="px-3 py-2 text-left font-semibold">Notes</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(w => (
                <tr key={w.id} onClick={() => setEditing(w)} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-4 py-2">
                    {w.type ? (
                      <span className="inline-block text-[11px] font-semibold bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5">
                        {w.type}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-medium text-gray-800">{w.name}</td>
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
      </>
      )}
    </div>
  )
}
