// src/components/FunnelsBoard.jsx
//
// Sales Funnels — a pipeline builder. Users create named funnels, add named
// stages, and drag opportunity tiles (from the clients table) across stages.
//
// Data: funnels / funnel_stages / funnel_cards (see supabase-funnels.sql).
// Drag-and-drop uses native HTML5 DnD (desktop); every tile also has a "move to
// stage" select so it works on touch devices.

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function clientLabel(c) {
  if (!c) return '—'
  if (c.client_type === 'company') return c.company_name || c.name || 'Company'
  return c.name || [c.first_name, c.last_name].filter(Boolean).join(' ') || c.company_name || '—'
}

// ── Small reusable text-prompt modal (new/rename funnel, add/rename stage) ──
function TextModal({ open, title, label, initial = '', confirmLabel = 'Save', onConfirm, onClose }) {
  const [val, setVal] = useState(initial)
  useEffect(() => { if (open) setVal(initial) }, [open, initial])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5">
        <h3 className="text-base font-bold text-gray-900 mb-3">{title}</h3>
        <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
        <input
          autoFocus
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && val.trim()) { onConfirm(val.trim()); } }}
          className="input w-full text-sm"
          placeholder={label}
        />
        <div className="flex gap-2 mt-4">
          <button onClick={() => val.trim() && onConfirm(val.trim())} className="btn-primary text-sm py-2 flex-1">{confirmLabel}</button>
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Add-opportunity picker ──────────────────────────────────────────────────
function AddOpportunityModal({ open, excludeIds, onPick, onClose }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!open) return
    setLoading(true)
    supabase
      .from('clients')
      .select('id, name, first_name, last_name, company_name, client_type, status')
      .or('status.eq.active,status.is.null')
      .order('name')
      .limit(1000)
      .then(({ data }) => { setRows(data || []); setLoading(false) })
  }, [open])

  if (!open) return null
  const ex = new Set(excludeIds)
  const filtered = rows
    .filter(r => !ex.has(r.id))
    .filter(r => {
      if (!q.trim()) return true
      const hay = `${clientLabel(r)} ${r.company_name || ''}`.toLowerCase()
      return hay.includes(q.toLowerCase())
    })
    .slice(0, 200)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900 mb-2">Add opportunity to funnel</h3>
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} className="input w-full text-sm" placeholder="Search opportunities…" />
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-8">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No opportunities found.</p>
          ) : (
            filtered.map(r => (
              <button
                key={r.id}
                onClick={() => onPick(r)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg hover:bg-green-50 text-left"
              >
                <span className="text-sm text-gray-800 truncate">{clientLabel(r)}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${r.client_type === 'company' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                  {r.client_type === 'company' ? 'Company' : 'Individual'}
                </span>
              </button>
            ))
          )}
        </div>
        <div className="p-3 border-t border-gray-100 text-right">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Done</button>
        </div>
      </div>
    </div>
  )
}

// ── Main board ──────────────────────────────────────────────────────────────
export default function FunnelsBoard() {
  const navigate = useNavigate()
  const [funnels, setFunnels] = useState([])
  const [funnelId, setFunnelId] = useState(null)
  const [stages, setStages] = useState([])
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [dragId, setDragId] = useState(null)
  const [dragOverStage, setDragOverStage] = useState(null)

  // Modals
  const [textModal, setTextModal] = useState(null)   // { kind, title, label, initial, confirmLabel }
  const [addToStage, setAddToStage] = useState(null)  // stage id when picking an opportunity

  const loadFunnels = useCallback(async () => {
    const { data } = await supabase.from('funnels').select('*').order('sort_order').order('name')
    setFunnels(data || [])
    setFunnelId(prev => prev && (data || []).some(f => f.id === prev) ? prev : (data?.[0]?.id || null))
  }, [])

  const loadBoard = useCallback(async fid => {
    if (!fid) { setStages([]); setCards([]); return }
    const [{ data: st }, { data: cd }] = await Promise.all([
      supabase.from('funnel_stages').select('*').eq('funnel_id', fid).order('sort_order'),
      supabase
        .from('funnel_cards')
        .select('id, stage_id, sort_order, client:clients(id, name, first_name, last_name, company_name, client_type)')
        .eq('funnel_id', fid),
    ])
    setStages(st || [])
    setCards(cd || [])
  }, [])

  useEffect(() => { loadFunnels().finally(() => setLoading(false)) }, [loadFunnels])
  useEffect(() => { loadBoard(funnelId) }, [funnelId, loadBoard])

  const funnel = funnels.find(f => f.id === funnelId)

  // ── Funnel CRUD ──
  async function createFunnel(name) {
    const max = Math.max(0, ...funnels.map(f => f.sort_order || 0))
    const { data, error } = await supabase.from('funnels').insert({ name, sort_order: max + 1 }).select().single()
    if (error) { alert('Could not create funnel: ' + error.message); return }
    setTextModal(null)
    await loadFunnels()
    if (data) setFunnelId(data.id)
  }
  async function renameFunnel(name) {
    await supabase.from('funnels').update({ name, updated_at: new Date().toISOString() }).eq('id', funnelId)
    setTextModal(null)
    loadFunnels()
  }
  async function deleteFunnel() {
    if (!funnel) return
    if (!confirm(`Delete the "${funnel.name}" funnel? Its stages are removed and opportunities are taken off this funnel (the opportunities themselves are not deleted).`)) return
    await supabase.from('funnels').delete().eq('id', funnelId)
    setFunnelId(null)
    loadFunnels()
  }

  // ── Stage CRUD ──
  async function createStage(name) {
    const max = Math.max(0, ...stages.map(s => s.sort_order || 0))
    const { error } = await supabase.from('funnel_stages').insert({ funnel_id: funnelId, name, sort_order: max + 1 })
    if (error) { alert('Could not add stage: ' + error.message); return }
    setTextModal(null)
    loadBoard(funnelId)
  }
  async function renameStage(stageId, name) {
    await supabase.from('funnel_stages').update({ name }).eq('id', stageId)
    setTextModal(null)
    loadBoard(funnelId)
  }
  async function deleteStage(stage) {
    const n = cards.filter(c => c.stage_id === stage.id).length
    const msg = n > 0
      ? `Delete the "${stage.name}" stage? ${n} opportunit${n === 1 ? 'y is' : 'ies are'} on it and will be removed from this funnel (not deleted).`
      : `Delete the "${stage.name}" stage?`
    if (!confirm(msg)) return
    await supabase.from('funnel_stages').delete().eq('id', stage.id)
    loadBoard(funnelId)
  }
  async function moveStage(stage, dir) {
    const idx = stages.findIndex(s => s.id === stage.id)
    const swap = stages[idx + dir]
    if (!swap) return
    await Promise.all([
      supabase.from('funnel_stages').update({ sort_order: swap.sort_order }).eq('id', stage.id),
      supabase.from('funnel_stages').update({ sort_order: stage.sort_order }).eq('id', swap.id),
    ])
    loadBoard(funnelId)
  }

  // ── Cards ──
  async function addCard(client, stageId) {
    const { error } = await supabase.from('funnel_cards').insert({ funnel_id: funnelId, stage_id: stageId, client_id: client.id })
    if (error && !/duplicate|unique/i.test(error.message)) alert('Could not add: ' + error.message)
    loadBoard(funnelId)
  }
  async function moveCard(cardId, stageId) {
    setCards(prev => prev.map(c => (c.id === cardId ? { ...c, stage_id: stageId } : c)))  // optimistic
    await supabase.from('funnel_cards').update({ stage_id: stageId }).eq('id', cardId)
  }
  async function removeCard(cardId) {
    setCards(prev => prev.filter(c => c.id !== cardId))
    await supabase.from('funnel_cards').delete().eq('id', cardId)
  }

  if (loading) {
    return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-green-700" /></div>
  }

  // Empty state — no funnels yet
  if (funnels.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center py-16 px-6">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🔻</div>
          <h2 className="text-xl font-bold text-gray-900">Build your first funnel</h2>
          <p className="text-sm text-gray-500 mt-2 mb-5">Create a named pipeline, add the stages your opportunities move through, then drag them along.</p>
          <button onClick={() => setTextModal({ kind: 'new-funnel', title: 'New funnel', label: 'Funnel name', confirmLabel: 'Create funnel' })} className="btn-primary text-sm px-5 py-2.5">
            + New funnel
          </button>
        </div>
        <TextModal
          open={!!textModal}
          title={textModal?.title}
          label={textModal?.label}
          confirmLabel={textModal?.confirmLabel}
          initial={textModal?.initial}
          onConfirm={createFunnel}
          onClose={() => setTextModal(null)}
        />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 mt-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-3 flex-shrink-0">
        <select value={funnelId || ''} onChange={e => setFunnelId(e.target.value)} className="input text-sm w-auto min-w-[12rem]">
          {funnels.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <button onClick={() => setTextModal({ kind: 'new-funnel', title: 'New funnel', label: 'Funnel name', confirmLabel: 'Create funnel' })} className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">+ New funnel</button>
        <button onClick={() => setTextModal({ kind: 'rename-funnel', title: 'Rename funnel', label: 'Funnel name', initial: funnel?.name, confirmLabel: 'Rename' })} className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">Rename</button>
        <button onClick={deleteFunnel} className="text-sm px-3 py-1.5 rounded-lg border border-red-100 text-red-500 hover:bg-red-50">Delete</button>
        <div className="flex-1" />
        <button onClick={() => setTextModal({ kind: 'new-stage', title: 'Add stage', label: 'Stage name', confirmLabel: 'Add stage' })} className="btn-primary text-sm px-3 py-1.5">+ Add stage</button>
      </div>

      {/* Board */}
      {stages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center py-16">
          <div>
            <p className="text-4xl mb-3">📊</p>
            <p className="text-sm font-medium text-gray-600">No stages yet</p>
            <p className="text-sm text-gray-400 mt-1 mb-4">Add the stages opportunities move through in this funnel.</p>
            <button onClick={() => setTextModal({ kind: 'new-stage', title: 'Add stage', label: 'Stage name', confirmLabel: 'Add stage' })} className="btn-primary text-sm px-4 py-2">+ Add stage</button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-3 h-full pb-2" style={{ minWidth: 'min-content' }}>
            {stages.map((stage, i) => {
              const stageCards = cards.filter(c => c.stage_id === stage.id)
              return (
                <div
                  key={stage.id}
                  onDragOver={e => { e.preventDefault(); setDragOverStage(stage.id) }}
                  onDragLeave={() => setDragOverStage(s => (s === stage.id ? null : s))}
                  onDrop={() => { if (dragId) moveCard(dragId, stage.id); setDragId(null); setDragOverStage(null) }}
                  className={`flex flex-col w-72 flex-shrink-0 rounded-xl border ${dragOverStage === stage.id ? 'border-green-400 bg-green-50/50' : 'border-gray-200 bg-gray-50'}`}
                >
                  {/* Stage header */}
                  <div className="flex items-center justify-between gap-1 px-3 py-2.5 border-b border-gray-200">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-semibold text-sm text-gray-800 truncate">{stage.name}</span>
                      <span className="text-xs bg-white border border-gray-200 text-gray-500 rounded-full px-1.5">{stageCards.length}</span>
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0 text-gray-400">
                      <button title="Move left" disabled={i === 0} onClick={() => moveStage(stage, -1)} className="px-1 hover:text-gray-700 disabled:opacity-30">‹</button>
                      <button title="Move right" disabled={i === stages.length - 1} onClick={() => moveStage(stage, 1)} className="px-1 hover:text-gray-700 disabled:opacity-30">›</button>
                      <button title="Rename stage" onClick={() => setTextModal({ kind: 'rename-stage', stageId: stage.id, title: 'Rename stage', label: 'Stage name', initial: stage.name, confirmLabel: 'Rename' })} className="px-1 hover:text-gray-700">✎</button>
                      <button title="Delete stage" onClick={() => deleteStage(stage)} className="px-1 hover:text-red-500">✕</button>
                    </div>
                  </div>

                  {/* Cards */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[3rem]">
                    {stageCards.map(card => (
                      <div
                        key={card.id}
                        draggable
                        onDragStart={e => { setDragId(card.id); e.dataTransfer.effectAllowed = 'move' }}
                        onDragEnd={() => { setDragId(null); setDragOverStage(null) }}
                        className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm cursor-grab active:cursor-grabbing group"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <button onClick={() => navigate(`/clients/${card.client?.id}`)} className="text-sm font-medium text-gray-800 hover:text-green-700 text-left truncate">
                            {clientLabel(card.client)}
                          </button>
                          <button onClick={() => removeCard(card.id)} title="Remove from funnel" className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 flex-shrink-0">✕</button>
                        </div>
                        <div className="flex items-center justify-between gap-1 mt-1.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${card.client?.client_type === 'company' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                            {card.client?.client_type === 'company' ? 'Company' : 'Individual'}
                          </span>
                          {/* Touch-friendly move control */}
                          <select
                            value={card.stage_id}
                            onChange={e => moveCard(card.id, e.target.value)}
                            className="text-[11px] text-gray-500 bg-transparent border-none focus:ring-0 cursor-pointer max-w-[8rem]"
                            title="Move to stage"
                          >
                            {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add opportunity */}
                  <button onClick={() => setAddToStage(stage.id)} className="m-2 mt-0 text-xs text-gray-500 hover:text-green-700 border border-dashed border-gray-300 hover:border-green-400 rounded-lg py-2 transition-colors">
                    + Add opportunity
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      <TextModal
        open={!!textModal}
        title={textModal?.title}
        label={textModal?.label}
        initial={textModal?.initial}
        confirmLabel={textModal?.confirmLabel}
        onConfirm={val => {
          if (textModal.kind === 'new-funnel') createFunnel(val)
          else if (textModal.kind === 'rename-funnel') renameFunnel(val)
          else if (textModal.kind === 'new-stage') createStage(val)
          else if (textModal.kind === 'rename-stage') renameStage(textModal.stageId, val)
        }}
        onClose={() => setTextModal(null)}
      />
      <AddOpportunityModal
        open={!!addToStage}
        excludeIds={cards.map(c => c.client?.id).filter(Boolean)}
        onPick={client => { addCard(client, addToStage); setAddToStage(null) }}
        onClose={() => setAddToStage(null)}
      />
    </div>
  )
}
