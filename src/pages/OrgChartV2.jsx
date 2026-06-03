// OrgChart v2 — tier-based snap layout, three node kinds (custom,
// position, container), orthogonal arrows (down/across, never up,
// never diagonal). Replaces OrgChart.jsx at /org-chart.

import { useEffect, useMemo, useState, useCallback } from 'react'
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
  const [holders, setHolders] = useState([])

  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState(null)
  const [connectMode, setConnectMode] = useState(false)
  const [connectSource, setConnectSource] = useState(null)
  const [dialog, setDialog] = useState(null) // { mode, parentId, existing }
  const [busy, setBusy] = useState(false)
  const [editingChartName, setEditingChartName] = useState(false)
  const [chartNameDraft, setChartNameDraft] = useState('')

  // ── Loaders ─────────────────────────────────────────────────────────
  useEffect(() => {
    ;(async () => {
      const [chartsRes, positionsRes, holdersRes] = await Promise.all([
        supabase.from('org_charts').select('*').order('created_at'),
        supabase.from('positions').select('id, title').order('title'),
        supabase.from('position_holders').select('*'),
      ])
      setCharts(chartsRes.data || [])
      setPositions(positionsRes.data || [])
      setHolders(holdersRes.data || [])
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
    const [n, e, t] = await Promise.all([
      supabase.from('org_nodes').select('*').eq('chart_id', chart.id),
      supabase.from('org_edges').select('*').eq('chart_id', chart.id),
      supabase.from('org_node_types').select('*').eq('chart_id', chart.id),
    ])
    setNodes(n.data || [])
    setEdges(e.data || [])
    setNodeTypes(t.data || [])
  }

  const holderMap = useMemo(() => {
    const m = new Map()
    for (const h of holders) {
      m.set(h.position_id, {
        positionTitle: h.position_title,
        displayName: h.display_name,
      })
    }
    return m
  }, [holders])

  // ── Chart mutations ─────────────────────────────────────────────────
  async function createChart() {
    const { data, error } = await supabase
      .from('org_charts')
      .insert({ name: `Chart ${new Date().toLocaleDateString()}`, created_by: user?.id })
      .select()
      .single()
    if (error) return alert(error.message)
    setCharts(prev => [...prev, data])
    selectChart(data)
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
    if (
      !confirm(
        `Delete chart "${chartName}"? Every node, edge and node-type inside it will be removed. This cannot be undone.`,
      )
    )
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

  // ── Node mutations ──────────────────────────────────────────────────
  async function addNode(payload) {
    if (!chartId) return
    setBusy(true)
    try {
      // tier resolution:
      //   parentId   → new node lands a tier BELOW the parent (child)
      //   seniorOf   → new node lands a tier ABOVE the referent (senior)
      //   neither    → new node lands at tier 0 (or the chart's current
      //                top tier if nothing exists yet)
      let tier = 0
      let tier_order = 0
      if (payload.parentId) {
        const parent = nodes.find(n => n.id === payload.parentId)
        if (parent) {
          tier = (parent.tier ?? 0) + 1
          tier_order = nodes
            .filter(n => (n.tier ?? 0) === tier)
            .reduce((max, n) => Math.max(max, (n.tier_order ?? 0) + 1), 0)
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
        heading: payload.heading || null,
        bg_color: payload.bg_color || null,
        container_mode: payload.container_mode || null,
        width: payload.width || 110,
        height: payload.height || 40,
        x: 0,
        y: 0,
        tier,
        tier_order,
      }
      const { data, error } = await supabase
        .from('org_nodes')
        .insert(insert)
        .select()
        .single()
      if (error) throw error
      setNodes(prev => [...prev, data])
      if (payload.parentId) {
        const { data: edge, error: edgeErr } = await supabase
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
        if (edgeErr) console.warn('Edge insert failed', edgeErr)
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
    if (!confirm('Delete this node? Connected arrows will be removed too.')) return
    setBusy(true)
    try {
      await supabase
        .from('org_edges')
        .delete()
        .or(`source_id.eq.${selectedNodeId},target_id.eq.${selectedNodeId}`)
      await supabase.from('org_nodes').delete().eq('id', selectedNodeId)
      setEdges(prev =>
        prev.filter(e => e.source_id !== selectedNodeId && e.target_id !== selectedNodeId),
      )
      setNodes(prev => prev.filter(n => n.id !== selectedNodeId))
      setSelectedNodeId(null)
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

  // Visually nudge a node left/right by adjusting x_offset on the
  // node row. Layout engine adds this to the auto-computed x so the
  // node slides without disrupting tier flow. Holding shift takes
  // bigger steps.
  async function moveNodeHoriz(direction, big = false) {
    if (!selectedNodeId) return
    const node = nodes.find(n => n.id === selectedNodeId)
    if (!node) return
    const step = big ? 40 : 10
    const cur = Number.isFinite(node.x_offset) ? node.x_offset : 0
    const next = direction === 'left' ? cur - step : cur + step
    setNodes(prev => prev.map(n => (n.id === node.id ? { ...n, x_offset: next } : n)))
    try {
      const { error } = await supabase
        .from('org_nodes')
        .update({ x_offset: next })
        .eq('id', node.id)
      if (error) throw error
    } catch (e) {
      alert('Move failed: ' + (e.message || e))
    }
  }

  // Reset a node's x_offset to 0 (snap it back into the tier flow).
  async function resetNodeOffset() {
    if (!selectedNodeId) return
    setNodes(prev =>
      prev.map(n => (n.id === selectedNodeId ? { ...n, x_offset: 0 } : n)),
    )
    try {
      await supabase
        .from('org_nodes')
        .update({ x_offset: 0 })
        .eq('id', selectedNodeId)
    } catch (e) {
      alert('Reset failed: ' + (e.message || e))
    }
  }

  // Connect-mode handling
  const onNodeClick = useCallback(
    nodeId => {
      if (connectMode) {
        if (!connectSource) {
          setConnectSource(nodeId)
        } else if (connectSource !== nodeId) {
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
    },
    [connectMode, connectSource, nodes, chartId],
  )

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || null

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 shrink-0">
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
            className="text-sm border border-blue-400 rounded-md px-2 py-1 min-w-[14rem]"
          />
        ) : (
          <select
            value={chartId || ''}
            onChange={e => {
              const c = charts.find(x => x.id === e.target.value)
              if (c) selectChart(c)
            }}
            className="text-sm border border-slate-300 rounded-md px-2 py-1"
          >
            <option value="">— Pick a chart —</option>
            {charts.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        {chartId && !editingChartName && (
          <>
            <button
              type="button"
              onClick={() => {
                setChartNameDraft(chartName)
                setEditingChartName(true)
              }}
              className="text-xs text-slate-500 hover:text-slate-800 underline"
            >
              rename
            </button>
            <button
              type="button"
              onClick={deleteChart}
              disabled={busy}
              className="text-xs text-red-500 hover:text-red-700 underline"
            >
              delete
            </button>
          </>
        )}
        <button
          type="button"
          onClick={createChart}
          className="text-sm px-3 py-1 rounded-md text-white"
          style={{ background: FG }}
        >
          + Chart
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setDialog({ mode: 'new', parentId: null })}
          disabled={!chartId}
          className="text-sm px-3 py-1 rounded-md bg-blue-600 text-white disabled:opacity-50"
        >
          + Node
        </button>
        {selectedNodeId && (
          <>
            <button
              type="button"
              onClick={() => setDialog({ mode: 'child', parentId: selectedNodeId })}
              className="text-sm px-3 py-1 rounded-md bg-blue-100 text-blue-700"
            >
              + Child of selected
            </button>
            <button
              type="button"
              onClick={() => setDialog({ mode: 'senior', seniorOf: selectedNodeId })}
              className="text-sm px-3 py-1 rounded-md bg-indigo-100 text-indigo-700"
              title="Add a senior node a tier above the selected one"
            >
              + Senior of selected
            </button>
            <button
              type="button"
              onClick={() => setDialog({ mode: 'edit', existing: selectedNode })}
              className="text-sm px-3 py-1 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={e => moveNodeHoriz('left', e.shiftKey)}
              className="text-sm px-2 py-1 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200"
              title="Nudge left (Shift = larger step)"
            >
              ←
            </button>
            <button
              type="button"
              onClick={e => moveNodeHoriz('right', e.shiftKey)}
              className="text-sm px-2 py-1 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200"
              title="Nudge right (Shift = larger step)"
            >
              →
            </button>
            <button
              type="button"
              onClick={resetNodeOffset}
              className="text-xs px-2 py-1 rounded-md bg-slate-50 text-slate-500 hover:bg-slate-100"
              title="Reset horizontal position"
            >
              reset
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => {
            setConnectMode(m => !m)
            setConnectSource(null)
          }}
          className={`text-sm px-3 py-1 rounded-md ${
            connectMode
              ? 'bg-orange-500 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          {connectMode ? 'Cancel connect' : 'Connect →'}
        </button>
        {selectedNodeId && (
          <button
            type="button"
            onClick={deleteSelectedNode}
            disabled={busy}
            className="text-sm px-3 py-1 rounded-md bg-red-100 text-red-700"
          >
            Delete node
          </button>
        )}
        {selectedEdgeId && (
          <button
            type="button"
            onClick={deleteSelectedEdge}
            disabled={busy}
            className="text-sm px-3 py-1 rounded-md bg-red-100 text-red-700"
          >
            Delete connection
          </button>
        )}
      </div>

      {connectMode && (
        <div className="bg-orange-50 border-b border-orange-200 px-4 py-1.5 text-xs text-orange-800">
          {connectSource ? 'Click the second node to connect.' : 'Click the source node first.'}
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {chartId ? (
          <TierCanvas
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}            positionHolders={holderMap}
            selectedNodeId={selectedNodeId}
            selectedEdgeId={selectedEdgeId}
            onNodeClick={onNodeClick}
            onEdgeClick={id => {
              setSelectedEdgeId(id)
              setSelectedNodeId(null)
            }}
            onBackgroundClick={() => {
              setSelectedNodeId(null)
              setSelectedEdgeId(null)
            }}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500">
            Pick a chart above or click <b>+ Chart</b> to create one.
          </div>
        )}
      </div>

      {dialog && (
        <AddNodeDialog
          mode={dialog.mode}
          parentId={dialog.parentId}
          seniorOf={dialog.seniorOf}
          existing={dialog.existing}
          positions={positions}
          onSubmit={payload => (payload.isEdit ? saveNode(payload) : addNode(payload))}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}
