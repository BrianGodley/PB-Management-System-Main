// OrgChart v2 — tier-based snap layout, three Item kinds (Custom, Org
// Position, Org Chart Area), orthogonal arrows, drag-and-drop, edit
// mode toggle, contextual item menu.

import { useEffect, useMemo, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import TierCanvas from '../components/orgchart/TierCanvas.jsx'
import AddNodeDialog from '../components/orgchart/AddNodeDialog.jsx'

const FG = '#3A5038'

export default function OrgChartV2() {
  const { user } = useAuth()

  const [charts, setCharts] = useState([])
  const [chartId, setChartId] = useState(null)
  const [chartName, setChartName] = useState('')

  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [nodeTypes, setNodeTypes] = useState([])

  const [positions, setPositions] = useState([])
  const [employees, setEmployees] = useState([])

  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState(null)
  const [connectMode, setConnectMode] = useState(false)
  const [connectSource, setConnectSource] = useState(null)
  const [dialog, setDialog] = useState(null)
  const [busy, setBusy] = useState(false)
  const [editingChartName, setEditingChartName] = useState(false)
  const [chartNameDraft, setChartNameDraft] = useState('')
  const [zoom, setZoom] = useState(1)
  const [editMode, setEditMode] = useState(false)
  const [contextMenu, setContextMenu] = useState(null)
  const [chartPickerOpen, setChartPickerOpen] = useState(false)

  // ── Loaders ─────────────────────────────────────────────────────────
  useEffect(() => {
    ;(async () => {
      const [chartsRes, positionsRes, employeesRes] = await Promise.all([
        supabase.from('org_charts').select('*').order('created_at'),
        supabase.from('positions').select('id, title').order('title'),
        supabase
          .from('employees')
          .select('id, first_name, last_name, position_id, active')
          .not('position_id', 'is', null)
          .order('last_name', { ascending: true })
          .order('first_name', { ascending: true }),
      ])
      setCharts(chartsRes.data || [])
      setPositions(positionsRes.data || [])
      setEmployees(employeesRes.data || [])
      if (chartsRes.data?.length) selectChart(chartsRes.data[0])
    })()
  }, [])

  async function selectChart(chart) {
    setChartId(chart.id)
    setChartName(chart.name)
    setSelectedNodeId(null)
    setSelectedEdgeId(null)
    setConnectMode(false)
    setConnectSource(null)
    setContextMenu(null)
    setEditMode(false) // open existing charts locked
    const [n, e, t] = await Promise.all([
      supabase.from('org_nodes').select('*').eq('chart_id', chart.id),
      supabase.from('org_edges').select('*').eq('chart_id', chart.id),
      supabase.from('org_node_types').select('*').eq('chart_id', chart.id),
    ])
    setNodes(n.data || [])
    setEdges(e.data || [])
    setNodeTypes(t.data || [])
  }

  const employeesByPosition = useMemo(() => {
    const m = new Map()
    for (const e of employees) {
      if (!e.position_id) continue
      const arr = m.get(e.position_id) || []
      arr.push({
        id: e.id,
        firstName: e.first_name,
        lastName: e.last_name,
        active: e.active !== false,
        displayName: `${e.first_name || ''} ${e.last_name || ''}`.trim() || '(unnamed)',
      })
      m.set(e.position_id, arr)
    }
    for (const arr of m.values()) arr.sort((a, b) => Number(b.active) - Number(a.active))
    return m
  }, [employees])

  // resolves both position-kind and container-kind nodes (containers
  // have an optional position_id "in charge")
  const resolveNodeHolder = node => {
    if (!node?.position_id) return null
    const pos = positions.find(p => Number(p.id) === Number(node.position_id))
    if (!pos) return null
    const candidates = employeesByPosition.get(pos.id) || []
    let chosen = null
    if (node.employee_id) chosen = candidates.find(c => c.id === node.employee_id) || null
    if (!chosen) chosen = candidates.find(c => c.active) || candidates[0] || null
    return {
      positionTitle: pos.title,
      displayName: chosen ? chosen.displayName : 'Held from Above',
      candidates,
    }
  }

  // ── Chart mutations ─────────────────────────────────────────────────
  async function createChart() {
    const { data, error } = await supabase
      .from('org_charts')
      .insert({ name: `Chart ${new Date().toLocaleDateString()}`, created_by: user?.id })
      .select()
      .single()
    if (error) return alert(error.message)
    setCharts(prev => [...prev, data])
    setChartId(data.id)
    setChartName(data.name)
    setNodes([])
    setEdges([])
    setNodeTypes([])
    setSelectedNodeId(null)
    setSelectedEdgeId(null)
    setContextMenu(null)
    setEditMode(true) // brand new charts start unlocked
  }

  async function renameChart(newName) {
    const trimmed = (newName || '').trim()
    if (!chartId || !trimmed || trimmed === chartName) {
      setEditingChartName(false)
      return
    }
    setBusy(true)
    const { error } = await supabase
      .from('org_charts')
      .update({ name: trimmed })
      .eq('id', chartId)
    setBusy(false)
    setEditingChartName(false)
    if (error) return alert(error.message)
    setChartName(trimmed)
    setCharts(prev => prev.map(c => (c.id === chartId ? { ...c, name: trimmed } : c)))
  }

  async function deleteChart() {
    if (!chartId) return
    if (!confirm(`Delete chart "${chartName}"? Every item inside will be removed. This cannot be undone.`))
      return
    setBusy(true)
    try {
      await supabase.from('org_edges').delete().eq('chart_id', chartId)
      await supabase.from('org_nodes').delete().eq('chart_id', chartId)
      await supabase.from('org_node_types').delete().eq('chart_id', chartId)
      await supabase.from('org_charts').delete().eq('id', chartId)
      const remaining = charts.filter(c => c.id !== chartId)
      setCharts(remaining)
      setNodes([])
      setEdges([])
      setNodeTypes([])
      setSelectedNodeId(null)
      setSelectedEdgeId(null)
      if (remaining.length) selectChart(remaining[0])
      else {
        setChartId(null)
        setChartName('')
      }
    } catch (e) {
      alert(e.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  // ── Node (Item) mutations ──────────────────────────────────────────
  async function addNode(payload) {
    if (!chartId) return
    setBusy(true)
    try {
      let tier = 0
      let tier_order = 0
      let parent_container_id = null
      if (payload.parentId) {
        const parent = nodes.find(n => n.id === payload.parentId)
        if (parent) {
          // Special case: if the parent is an implicit container, the new
          // item becomes a sub-item INSIDE it (column layout) instead of
          // a child node a tier below.
          if (parent.kind === 'container' && parent.container_mode === 'implicit') {
            parent_container_id = parent.id
            tier = parent.tier ?? 0
            tier_order = nodes
              .filter(n => n.parent_container_id === parent.id)
              .reduce((max, n) => Math.max(max, (n.tier_order ?? 0) + 1), 0)
          } else {
            tier = (parent.tier ?? 0) + 1
            tier_order = nodes
              .filter(n => (n.tier ?? 0) === tier && !n.parent_container_id)
              .reduce((max, n) => Math.max(max, (n.tier_order ?? 0) + 1), 0)
          }
        }
      } else if (payload.seniorOf) {
        const ref = nodes.find(n => n.id === payload.seniorOf)
        if (ref) {
          tier = (ref.tier ?? 0) - 1
          tier_order = nodes
            .filter(n => (n.tier ?? 0) === tier)
            .reduce((max, n) => Math.max(max, (n.tier_order ?? 0) + 1), 0)
        }
      } else {
        tier_order = nodes
          .filter(n => (n.tier ?? 0) === 0)
          .reduce((max, n) => Math.max(max, (n.tier_order ?? 0) + 1), 0)
      }
      const insert = {
        chart_id: chartId,
        kind: payload.kind,
        label: payload.label || '',
        position_id: payload.position_id || null,
        employee_id: payload.employee_id || null,
        heading: payload.heading || null,
        bg_color: payload.bg_color || null,
        container_mode: payload.container_mode || null,
        parent_container_id,
        width: payload.width || 110,
        height: payload.height || 40,
        x: 0,
        y: 0,
        tier,
        tier_order,
      }
      const { data, error } = await supabase.from('org_nodes').insert(insert).select().single()
      if (error) throw error
      setNodes(prev => [...prev, data])
      // Skip the auto-edge when the new item is a sub-item inside an
      // implicit container — the container itself implies ownership.
      if (payload.parentId && !parent_container_id) {
        const { data: edge } = await supabase
          .from('org_edges')
          .insert({
            chart_id: chartId,
            source_id: payload.parentId,
            target_id: data.id,
            relationship: 'reports_to',
            style: 'solid',
          })
          .select()
          .single()
        if (edge) setEdges(prev => [...prev, edge])
      }
      setDialog(null)
    } catch (e) {
      alert(e.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  async function saveNode(payload) {
    if (!payload.id) return
    setBusy(true)
    try {
      const update = {
        label: payload.label,
        position_id: payload.position_id || null,
        employee_id: payload.employee_id || null,
        heading: payload.heading || null,
        bg_color: payload.bg_color || null,
        container_mode: payload.container_mode || null,
        width: payload.width || 110,
        height: payload.height || 40,
      }
      const { data, error } = await supabase
        .from('org_nodes')
        .update(update)
        .eq('id', payload.id)
        .select()
        .single()
      if (error) throw error
      setNodes(prev => prev.map(n => (n.id === data.id ? data : n)))
      setDialog(null)
    } catch (e) {
      alert(e.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  async function deleteSelectedNode() {
    if (!selectedNodeId) return
    if (!confirm('Delete this item? Connected arrows will be removed too.')) return
    setBusy(true)
    try {
      await supabase
        .from('org_edges')
        .delete()
        .or(`source_id.eq.${selectedNodeId},target_id.eq.${selectedNodeId}`)
      await supabase.from('org_nodes').delete().eq('id', selectedNodeId)
      setEdges(prev => prev.filter(e => e.source_id !== selectedNodeId && e.target_id !== selectedNodeId))
      setNodes(prev => prev.filter(n => n.id !== selectedNodeId))
      setSelectedNodeId(null)
      setContextMenu(null)
    } catch (e) {
      alert(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function deleteSelectedEdge() {
    if (!selectedEdgeId) return
    if (!confirm('Delete this connection?')) return
    setBusy(true)
    try {
      await supabase.from('org_edges').delete().eq('id', selectedEdgeId)
      setEdges(prev => prev.filter(e => e.id !== selectedEdgeId))
      setSelectedEdgeId(null)
    } catch (e) {
      alert(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleNodeDropped(nodeId, newTier, newTierOrder, newXOffset) {
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return
    const otherSibs = nodes
      .filter(n => n.id !== nodeId && (n.tier ?? 0) === newTier)
      .sort((a, b) => (a.tier_order ?? 0) - (b.tier_order ?? 0))
    const reordered = [
      ...otherSibs.slice(0, newTierOrder),
      node,
      ...otherSibs.slice(newTierOrder),
    ]
    const updates = reordered.map((n, i) => ({ id: n.id, tier_order: i }))
    setNodes(prev =>
      prev.map(p => {
        const u = updates.find(x => x.id === p.id)
        if (!u) return p
        if (p.id === nodeId)
          return { ...p, tier: newTier, tier_order: u.tier_order, x_offset: newXOffset || 0 }
        return { ...p, tier_order: u.tier_order }
      }),
    )
    try {
      await Promise.all(
        updates.map(u => {
          if (u.id === nodeId) {
            return supabase
              .from('org_nodes')
              .update({ tier: newTier, tier_order: u.tier_order, x_offset: newXOffset || 0 })
              .eq('id', u.id)
          }
          return supabase
            .from('org_nodes')
            .update({ tier_order: u.tier_order })
            .eq('id', u.id)
        }),
      )
    } catch (e) {
      alert('Drop failed: ' + (e.message || e))
    }
  }

  const onNodeClick = useCallback(
    (nodeId, screenRect) => {
      if (connectMode) {
        if (!connectSource) setConnectSource(nodeId)
        else if (connectSource !== nodeId) {
          const src = nodes.find(n => n.id === connectSource)
          const tgt = nodes.find(n => n.id === nodeId)
          if (src && tgt) {
            const st = src.tier ?? 0
            const tt = tgt.tier ?? 0
            const [from, to] = st > tt ? [tgt, src] : [src, tgt]
            ;(async () => {
              const { data } = await supabase
                .from('org_edges')
                .insert({
                  chart_id: chartId,
                  source_id: from.id,
                  target_id: to.id,
                  relationship: (from.tier ?? 0) === (to.tier ?? 0) ? 'sibling' : 'reports_to',
                  style: 'solid',
                })
                .select()
                .single()
              if (data) setEdges(prev => [...prev, data])
            })()
          }
          setConnectSource(null)
          setConnectMode(false)
        }
        return
      }
      setSelectedNodeId(nodeId)
      setSelectedEdgeId(null)
      // Show contextual menu only in edit mode
      if (editMode && screenRect) setContextMenu({ nodeId, screenRect })
      else setContextMenu(null)
    },
    [connectMode, connectSource, nodes, chartId, editMode],
  )

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || null

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Top bar:
            LEFT   — view mode: Select-charts popover
                     edit mode: + Item
            CENTER — chart name + Edit/Save (and rename/delete in edit mode)
            RIGHT  — zoom + + Chart (view mode only) */}
      <div className="grid grid-cols-3 items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 shrink-0">
        {/* LEFT */}
        <div className="flex items-center gap-2 relative">
          {!editMode && (
            <>
              <button
                type="button"
                onClick={() => setChartPickerOpen(v => !v)}
                className="text-sm px-3 py-1 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 whitespace-nowrap"
              >
                Select ▾
              </button>
              {chartPickerOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 shadow-lg rounded-md z-50 min-w-[16rem] max-h-72 overflow-y-auto py-1">
                  {charts.length === 0 ? (
                    <p className="text-xs text-slate-400 px-3 py-2">
                      No charts yet — use + Chart on the right.
                    </p>
                  ) : (
                    charts.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          selectChart(c)
                          setChartPickerOpen(false)
                        }}
                        className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 ${
                          c.id === chartId ? 'bg-slate-50 font-medium' : ''
                        }`}
                      >
                        {c.name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </>
          )}
          {editMode && chartId && (
            <button
              type="button"
              onClick={() => setDialog({ mode: 'new', parentId: null })}
              className="text-sm px-3 py-1 rounded-md bg-blue-600 text-white whitespace-nowrap"
            >
              + Item
            </button>
          )}
        </div>

        {/* CENTER */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {editingChartName ? (
            <input
              autoFocus
              value={chartNameDraft}
              onChange={e => setChartNameDraft(e.target.value)}
              onBlur={() => renameChart(chartNameDraft)}
              onKeyDown={e => {
                if (e.key === 'Enter') renameChart(chartNameDraft)
                else if (e.key === 'Escape') setEditingChartName(false)
              }}
              className="text-base text-center font-semibold border border-blue-400 rounded-md px-3 py-1 min-w-[18rem]"
            />
          ) : (
            <h1 className="text-base font-semibold text-slate-800 truncate max-w-[26rem] text-center">
              {chartName || '—'}
            </h1>
          )}
          {chartId && !editingChartName && (
            <button
              type="button"
              onClick={() => {
                setEditMode(v => !v)
                setContextMenu(null)
                setConnectMode(false)
                setConnectSource(null)
                setChartPickerOpen(false)
              }}
              className={`text-xs px-2 py-1 rounded-md whitespace-nowrap ${
                editMode
                  ? 'bg-amber-500 text-white hover:bg-amber-600'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {editMode ? 'Save' : 'Edit'}
            </button>
          )}
          {editMode && chartId && !editingChartName && (
            <>
              <button
                type="button"
                onClick={() => {
                  setChartNameDraft(chartName)
                  setEditingChartName(true)
                }}
                className="text-xs text-slate-500 hover:text-slate-800 underline whitespace-nowrap"
              >
                rename
              </button>
              <button
                type="button"
                onClick={deleteChart}
                disabled={busy}
                className="text-xs text-red-500 hover:text-red-700 underline whitespace-nowrap"
              >
                delete
              </button>
            </>
          )}
        </div>

        {/* RIGHT — zoom always; + Chart in view mode only */}
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => setZoom(z => Math.max(0.2, +(z - 0.1).toFixed(2)))}
            className="text-sm px-2 py-1 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200"
            title="Zoom out"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="text-xs px-2 py-1 rounded-md bg-slate-50 text-slate-600 hover:bg-slate-100 min-w-[3.25rem]"
            title="Reset zoom to 100%"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={() => setZoom(z => Math.min(3, +(z + 0.1).toFixed(2)))}
            className="text-sm px-2 py-1 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200"
            title="Zoom in"
          >
            +
          </button>
          {!editMode && (
            <button
              type="button"
              onClick={createChart}
              className="ml-2 text-sm px-3 py-1 rounded-md text-white whitespace-nowrap"
              style={{ background: FG }}
            >
              + Chart
            </button>
          )}
        </div>
      </div>

      {connectMode && (
        <div className="bg-orange-50 border-b border-orange-200 px-4 py-1.5 text-xs text-orange-800">
          {connectSource ? 'Click the second item to connect.' : 'Click the source item first.'}
        </div>
      )}

      <div className="flex-1 overflow-auto relative">
        {chartId ? (
          <TierCanvas
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            resolveNodeHolder={resolveNodeHolder}
            zoom={zoom}
            editable={editMode}
            selectedNodeId={selectedNodeId}
            selectedEdgeId={selectedEdgeId}
            onNodeClick={onNodeClick}
            onNodeDropped={handleNodeDropped}
            onEdgeClick={id => {
              if (!editMode) return
              setSelectedEdgeId(id)
              setSelectedNodeId(null)
              setContextMenu(null)
            }}
            onBackgroundClick={() => {
              setSelectedNodeId(null)
              setSelectedEdgeId(null)
              setContextMenu(null)
            }}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500">
            Pick a chart above or click <b>+ Chart</b> to create one.
          </div>
        )}
      </div>

      {/* Contextual item menu — only in edit mode, only when a node is
          selected and we have its screen rect. */}
      {editMode && contextMenu && selectedNode &&
        createPortal(
          <ItemContextMenu
            screenRect={contextMenu.screenRect}
            onClose={() => setContextMenu(null)}
            onConnect={() => {
              setConnectMode(true)
              setConnectSource(selectedNode.id)
              setContextMenu(null)
            }}
            onAddChild={() => {
              setDialog({ mode: 'child', parentId: selectedNode.id })
              setContextMenu(null)
            }}
            onAddSenior={() => {
              setDialog({ mode: 'senior', seniorOf: selectedNode.id })
              setContextMenu(null)
            }}
            onEdit={() => {
              setDialog({ mode: 'edit', existing: selectedNode })
              setContextMenu(null)
            }}
            onDelete={() => {
              deleteSelectedNode()
            }}
            canDeleteEdge={!!selectedEdgeId}
            onDeleteEdge={deleteSelectedEdge}
          />,
          document.body,
        )}

      {/* Edge actions float at top when an edge is selected (no specific node anchor) */}
      {editMode && selectedEdgeId && !contextMenu && (
        <div className="fixed top-20 right-6 z-50 bg-white border border-slate-200 shadow-lg rounded-md px-2 py-1.5 flex items-center gap-2">
          <span className="text-xs text-slate-500">Connection selected</span>
          <button
            type="button"
            onClick={deleteSelectedEdge}
            className="text-xs px-2 py-1 rounded bg-red-100 text-red-700"
          >
            Delete
          </button>
        </div>
      )}

      {dialog && (
        <AddNodeDialog
          mode={dialog.mode}
          parentId={dialog.parentId}
          seniorOf={dialog.seniorOf}
          existing={dialog.existing}
          positions={positions}
          employeesByPosition={employeesByPosition}
          onSubmit={payload => (payload.isEdit ? saveNode(payload) : addNode(payload))}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}

// Floating context menu shown next to a selected item.
function ItemContextMenu({
  screenRect,
  onClose,
  onConnect,
  onAddChild,
  onAddSenior,
  onEdit,
  onDelete,
}) {
  const menuWidth = 170
  const margin = 8
  let left = screenRect.right + margin
  if (left + menuWidth > window.innerWidth - 8) {
    left = Math.max(8, screenRect.left - menuWidth - margin)
  }
  const top = Math.max(8, Math.min(window.innerHeight - 220, screenRect.top))
  return (
    <div
      className="fixed z-[1000] bg-white border border-slate-200 shadow-xl rounded-lg py-1 text-sm"
      onClick={e => e.stopPropagation()}
    >
      <MenuItem label="Connect Item" onClick={onConnect} />
      <MenuItem label="Add Child" onClick={onAddChild} />
      <MenuItem label="Add Senior" onClick={onAddSenior} />
      <MenuItem label="Edit" onClick={onEdit} />
      <div className="border-t border-slate-100 my-1" />
      <MenuItem label="Delete" onClick={onDelete} danger />
      <div className="border-t border-slate-100 my-1" />
      <MenuItem label="Cancel" onClick={onClose} muted />
    </div>
  )
}

function MenuItem({ label, onClick, danger, muted }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 ${
        danger ? 'text-red-600' : muted ? 'text-slate-500' : 'text-slate-700'
      }`}
    >
      {label}
    </button>
  )
}
