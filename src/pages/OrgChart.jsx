import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const FG = '#3A5038' // Forest green

export default function OrgChart() {
  const { user } = useAuth()
  const svgRef = useRef(null)

  // Charts state
  const [charts, setCharts] = useState([])
  const [selectedChartId, setSelectedChartId] = useState(null)
  const [chartName, setChartName] = useState('')
  const [editingName, setEditingName] = useState(false)

  // Chart contents
  const [nodeTypes, setNodeTypes] = useState([])
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const nodesRef = useRef([])

  // Interaction state
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState(null)
  const [connectMode, setConnectMode] = useState(false)
  const [connectSource, setConnectSource] = useState(null)

  // Dragging
  const dragRef = useRef(null)

  // UI state
  const [showAddType, setShowAddType] = useState(false)
  const [newTypeName, setNewTypeName] = useState('')
  const [newTypeColor, setNewTypeColor] = useState('#2563EB')
  const [showAddNode, setShowAddNode] = useState(false)
  const [newNodeLabel, setNewNodeLabel] = useState('')
  const [newNodeSubtitle, setNewNodeSubtitle] = useState('')
  const [newNodeTypeId, setNewNodeTypeId] = useState('')

  // Edit selected node
  const [editLabel, setEditLabel] = useState('')
  const [editSubtitle, setEditSubtitle] = useState('')
  const [editTypeId, setEditTypeId] = useState('')

  // Edit selected edge
  const [editEdgeLabel, setEditEdgeLabel] = useState('')
  const [editEdgeRel, setEditEdgeRel] = useState('')
  const [editEdgeStyle, setEditEdgeStyle] = useState('solid')

  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  // Keep nodesRef in sync
  useEffect(() => { nodesRef.current = nodes }, [nodes])

  // ── Data fetching ────────────────────────────────────────────────────────

  async function loadCharts() {
    try {
      const { data } = await supabase.from('org_charts').select('*').order('created_at')
      setCharts(data || [])
      if (data?.length && !selectedChartId) {
        selectChart(data[0].id, data[0].name)
      }
    } catch (err) {
      console.error('Error loading charts:', err)
    }
  }

  async function loadChart(chartId) {
    try {
      setLoading(true)
      const [typesRes, nodesRes, edgesRes] = await Promise.all([
        supabase.from('org_node_types').select('*').eq('chart_id', chartId).order('created_at'),
        supabase.from('org_nodes').select('*').eq('chart_id', chartId).order('created_at'),
        supabase.from('org_edges').select('*').eq('chart_id', chartId).order('created_at'),
      ])
      setNodeTypes(typesRes.data || [])
      setNodes(nodesRes.data || [])
      setEdges(edgesRes.data || [])
    } catch (err) {
      console.error('Error loading chart:', err)
    } finally {
      setLoading(false)
    }
  }

  function selectChart(id, name) {
    setSelectedChartId(id)
    setChartName(name)
    setSelectedNodeId(null)
    setSelectedEdgeId(null)
    setConnectMode(false)
    setConnectSource(null)
    loadChart(id)
  }

  useEffect(() => { loadCharts() }, [])

  // ── Chart management ────────────────────────────────────────────────────

  async function createNewChart() {
    try {
      setSaving(true)
      const { data, error } = await supabase.from('org_charts')
        .insert({ name: `New Org Chart ${new Date().toLocaleDateString()}`, created_by: user?.id })
        .select()
      if (error) throw error
      if (data?.[0]) {
        selectChart(data[0].id, data[0].name)
        await loadCharts()
      }
    } catch (err) {
      console.error('Error creating chart:', err)
    } finally {
      setSaving(false)
    }
  }

  async function updateChartName(newName) {
    if (!selectedChartId || !newName.trim()) return
    try {
      setSaving(true)
      await supabase.from('org_charts').update({ name: newName }).eq('id', selectedChartId)
      setChartName(newName)
      await loadCharts()
    } catch (err) {
      console.error('Error updating chart name:', err)
    } finally {
      setSaving(false)
      setEditingName(false)
    }
  }

  // ── Node type management ─────────────────────────────────────────────────

  async function addNodeType() {
    if (!selectedChartId || !newTypeName.trim()) return
    try {
      setSaving(true)
      const { error } = await supabase.from('org_node_types').insert({
        chart_id: selectedChartId,
        name: newTypeName,
        color: newTypeColor,
        text_color: '#FFFFFF',
      })
      if (error) throw error
      setNewTypeName('')
      setNewTypeColor('#2563EB')
      setShowAddType(false)
      await loadChart(selectedChartId)
    } catch (err) {
      console.error('Error adding node type:', err)
    } finally {
      setSaving(false)
    }
  }

  async function deleteNodeType(typeId) {
    if (!confirm('Delete this node type?')) return
    try {
      setSaving(true)
      await supabase.from('org_node_types').delete().eq('id', typeId)
      await loadChart(selectedChartId)
    } catch (err) {
      console.error('Error deleting node type:', err)
    } finally {
      setSaving(false)
    }
  }

  // ── Node management ──────────────────────────────────────────────────────

  async function addNode() {
    if (!selectedChartId || !newNodeLabel.trim()) return
    try {
      setSaving(true)
      const x = 200 + Math.random() * 400
      const y = 200 + Math.random() * 300
      const { error } = await supabase.from('org_nodes').insert({
        chart_id: selectedChartId,
        type_id: newNodeTypeId || null,
        label: newNodeLabel,
        subtitle: newNodeSubtitle,
        x,
        y,
        width: 180,
        height: 64,
      })
      if (error) throw error
      setNewNodeLabel('')
      setNewNodeSubtitle('')
      setNewNodeTypeId('')
      setShowAddNode(false)
      await loadChart(selectedChartId)
    } catch (err) {
      console.error('Error adding node:', err)
    } finally {
      setSaving(false)
    }
  }

  async function saveSelectedNode() {
    if (!selectedNodeId) return
    try {
      setSaving(true)
      await supabase.from('org_nodes').update({
        label: editLabel,
        subtitle: editSubtitle,
        type_id: editTypeId || null,
      }).eq('id', selectedNodeId)
      await loadChart(selectedChartId)
      setSelectedNodeId(null)
    } catch (err) {
      console.error('Error saving node:', err)
    } finally {
      setSaving(false)
    }
  }

  async function deleteSelectedNode() {
    if (!selectedNodeId || !confirm('Delete this node?')) return
    try {
      setSaving(true)
      await supabase.from('org_nodes').delete().eq('id', selectedNodeId)
      await loadChart(selectedChartId)
      setSelectedNodeId(null)
    } catch (err) {
      console.error('Error deleting node:', err)
    } finally {
      setSaving(false)
    }
  }

  // ── Edge management ──────────────────────────────────────────────────────

  async function createEdge(sourceId, targetId) {
    if (!selectedChartId) return
    try {
      setSaving(true)
      const { error } = await supabase.from('org_edges').insert({
        chart_id: selectedChartId,
        source_id: sourceId,
        target_id: targetId,
        relationship: 'reports_to',
        style: 'solid',
      })
      if (error) throw error
      await loadChart(selectedChartId)
      setConnectMode(false)
      setConnectSource(null)
    } catch (err) {
      console.error('Error creating edge:', err)
    } finally {
      setSaving(false)
    }
  }

  async function saveSelectedEdge() {
    if (!selectedEdgeId) return
    try {
      setSaving(true)
      await supabase.from('org_edges').update({
        relationship: editEdgeRel,
        label: editEdgeLabel,
        style: editEdgeStyle,
      }).eq('id', selectedEdgeId)
      await loadChart(selectedChartId)
      setSelectedEdgeId(null)
    } catch (err) {
      console.error('Error saving edge:', err)
    } finally {
      setSaving(false)
    }
  }

  async function deleteSelectedEdge() {
    if (!selectedEdgeId || !confirm('Delete this edge?')) return
    try {
      setSaving(true)
      await supabase.from('org_edges').delete().eq('id', selectedEdgeId)
      await loadChart(selectedChartId)
      setSelectedEdgeId(null)
    } catch (err) {
      console.error('Error deleting edge:', err)
    } finally {
      setSaving(false)
    }
  }

  // ── SVG rendering helpers ────────────────────────────────────────────────

  function getNodeColor(node) {
    if (node.type_id) {
      const type = nodeTypes.find(t => t.id === node.type_id)
      return type?.color || '#64748B'
    }
    return '#64748B'
  }

  function edgePath(src, tgt) {
    const x1 = src.x + src.width / 2
    const y1 = src.y + src.height
    const x2 = tgt.x + tgt.width / 2
    const y2 = tgt.y
    const cy = (y1 + y2) / 2
    return `M ${x1} ${y1} C ${x1} ${cy} ${x2} ${cy} ${x2} ${y2}`
  }

  function edgeMidpoint(src, tgt) {
    const x1 = src.x + src.width / 2
    const y1 = src.y + src.height
    const x2 = tgt.x + tgt.width / 2
    const y2 = tgt.y
    return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 }
  }

  // ── Canvas interaction ───────────────────────────────────────────────────

  const onNodeMouseDown = useCallback((e, nodeId) => {
    if (connectMode) return
    e.stopPropagation()
    const svg = svgRef.current
    if (!svg) return
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse())
    const node = nodes.find(n => n.id === nodeId)
    dragRef.current = { nodeId, startMx: svgPt.x, startMy: svgPt.y, origX: node.x, origY: node.y }
    setSelectedNodeId(nodeId)
    setSelectedEdgeId(null)
  }, [connectMode, nodes])

  const onSvgMouseMove = useCallback((e) => {
    if (!dragRef.current) return
    const svg = svgRef.current
    if (!svg) return
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse())
    const { nodeId, startMx, startMy, origX, origY } = dragRef.current
    const dx = svgPt.x - startMx
    const dy = svgPt.y - startMy
    setNodes(prev => prev.map(n =>
      n.id === nodeId ? { ...n, x: origX + dx, y: origY + dy } : n
    ))
  }, [])

  const onSvgMouseUp = useCallback(() => {
    if (!dragRef.current) return
    const { nodeId } = dragRef.current
    dragRef.current = null
    const node = nodesRef.current.find(n => n.id === nodeId)
    if (node) {
      supabase.from('org_nodes').update({ x: node.x, y: node.y }).eq('id', nodeId).catch(err => console.error(err))
    }
  }, [])

  function onNodeClick(e, nodeId) {
    if (connectMode) {
      e.stopPropagation()
      if (!connectSource) {
        setConnectSource(nodeId)
      } else if (connectSource !== nodeId) {
        createEdge(connectSource, nodeId)
      }
      return
    }
    const node = nodes.find(n => n.id === nodeId)
    if (node) {
      setSelectedNodeId(nodeId)
      setSelectedEdgeId(null)
      setEditLabel(node.label)
      setEditSubtitle(node.subtitle || '')
      setEditTypeId(node.type_id || '')
    }
  }

  function onEdgeClick(edgeId) {
    const edge = edges.find(e => e.id === edgeId)
    if (edge) {
      setSelectedEdgeId(edgeId)
      setSelectedNodeId(null)
      setEditEdgeLabel(edge.label || '')
      setEditEdgeRel(edge.relationship || 'reports_to')
      setEditEdgeStyle(edge.style || 'solid')
    }
  }

  function onSvgClick(e) {
    if (e.target === svgRef.current && !connectMode) {
      setSelectedNodeId(null)
      setSelectedEdgeId(null)
    }
  }

  // ── Welcome state ────────────────────────────────────────────────────────

  if (!selectedChartId) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-800 mb-4">No Org Charts Yet</p>
          <p className="text-gray-600 mb-6">Create your first org chart to get started.</p>
          <button
            onClick={createNewChart}
            disabled={saving}
            style={{ backgroundColor: FG }}
            className="px-6 py-3 rounded-lg text-white font-medium hover:opacity-90 disabled:opacity-50"
          >
            + Create Org Chart
          </button>
        </div>
      </div>
    )
  }

  // ── Main render ──────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col bg-gray-50">

      {/* TOP BAR: Chart picker + controls */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
        <select
          value={selectedChartId || ''}
          onChange={(e) => {
            const id = e.target.value
            const chart = charts.find(c => c.id === id)
            if (chart) selectChart(id, chart.name)
          }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          {charts.map(chart => (
            <option key={chart.id} value={chart.id}>
              {chart.name}
            </option>
          ))}
        </select>

        {editingName ? (
          <input
            type="text"
            value={chartName}
            onChange={(e) => setChartName(e.target.value)}
            onBlur={() => updateChartName(chartName)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') updateChartName(chartName)
            }}
            autoFocus
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm flex-1 max-w-xs"
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Rename
          </button>
        )}

        <button
          onClick={createNewChart}
          disabled={saving}
          style={{ backgroundColor: FG }}
          className="ml-auto px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          + New Chart
        </button>
      </div>

      {/* BODY: left panel + canvas */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* LEFT PANEL */}
        <div className="w-60 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto flex flex-col">

          {/* NODE TYPES SECTION */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Node Types</h3>
              <button
                onClick={() => setShowAddType(!showAddType)}
                style={{ color: FG }}
                className="text-lg leading-none hover:opacity-70"
              >
                +
              </button>
            </div>

            {showAddType && (
              <div className="mb-3 p-3 bg-gray-50 rounded-lg space-y-2">
                <input
                  type="text"
                  placeholder="Type name"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newTypeColor}
                    onChange={(e) => setNewTypeColor(e.target.value)}
                    className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                  />
                  <span className="text-xs text-gray-600">{newTypeColor}</span>
                </div>
                <button
                  onClick={addNodeType}
                  disabled={saving}
                  style={{ backgroundColor: FG }}
                  className="w-full px-2 py-1 rounded text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  Add Type
                </button>
              </div>
            )}

            <div className="space-y-1.5">
              {nodeTypes.map(type => (
                <div key={type.id} className="flex items-center gap-2 text-xs">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: type.color }}
                  />
                  <span className="text-gray-700 flex-1">{type.name}</span>
                  <button
                    onClick={() => deleteNodeType(type.id)}
                    disabled={saving}
                    className="text-gray-400 hover:text-red-500 text-lg leading-none"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ADD NODE SECTION */}
          <div className="px-4 py-3 border-b border-gray-100">
            <button
              onClick={() => setShowAddNode(!showAddNode)}
              style={{ color: FG }}
              className="text-xs font-bold uppercase tracking-wider hover:opacity-70"
            >
              {showAddNode ? '▼ Add Node' : '▶ Add Node'}
            </button>

            {showAddNode && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Type</label>
                  <select
                    value={newNodeTypeId}
                    onChange={(e) => setNewNodeTypeId(e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  >
                    <option value="">No Type</option>
                    {nodeTypes.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Label</label>
                  <input
                    type="text"
                    placeholder="Node label"
                    value={newNodeLabel}
                    onChange={(e) => setNewNodeLabel(e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Subtitle</label>
                  <input
                    type="text"
                    placeholder="Optional subtitle"
                    value={newNodeSubtitle}
                    onChange={(e) => setNewNodeSubtitle(e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  />
                </div>
                <button
                  onClick={addNode}
                  disabled={saving}
                  style={{ backgroundColor: FG }}
                  className="w-full px-2 py-1.5 rounded text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  Add to Chart
                </button>
              </div>
            )}
          </div>

          {/* CONNECT BUTTON */}
          <div className="px-4 py-3 border-b border-gray-100">
            <button
              onClick={() => {
                setConnectMode(!connectMode)
                if (connectMode) setConnectSource(null)
              }}
              style={{
                backgroundColor: connectMode ? '#16a34a' : '#e5e7eb',
                color: connectMode ? 'white' : '#374151',
              }}
              className="w-full px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
            >
              {connectMode ? 'Cancel Connect' : 'Connect Nodes'}
            </button>
            {connectMode && (
              <p className="text-xs text-gray-500 mt-2 text-center">
                Click source node, then target node
              </p>
            )}
          </div>

          {/* SELECTED NODE PANEL */}
          {selectedNodeId && (
            <div className="px-4 py-3 border-b border-gray-100 space-y-2">
              <h4 className="text-xs font-bold text-gray-700 uppercase">Edit Node</h4>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Label</label>
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Subtitle</label>
                <input
                  type="text"
                  value={editSubtitle}
                  onChange={(e) => setEditSubtitle(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Type</label>
                <select
                  value={editTypeId}
                  onChange={(e) => setEditTypeId(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                >
                  <option value="">No Type</option>
                  {nodeTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={saveSelectedNode}
                  disabled={saving}
                  style={{ backgroundColor: FG }}
                  className="flex-1 px-2 py-1.5 rounded text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={deleteSelectedNode}
                  disabled={saving}
                  className="flex-1 px-2 py-1.5 rounded text-xs font-medium text-white bg-red-500 hover:opacity-90 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          )}

          {/* SELECTED EDGE PANEL */}
          {selectedEdgeId && (
            <div className="px-4 py-3 border-b border-gray-100 space-y-2">
              <h4 className="text-xs font-bold text-gray-700 uppercase">Edit Edge</h4>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Relationship</label>
                <div className="space-y-1 mb-2">
                  {['reports to', 'peer', 'manages', 'supports', 'dotted line'].map(rel => (
                    <button
                      key={rel}
                      onClick={() => setEditEdgeRel(rel)}
                      className={`block w-full px-2 py-1 text-xs rounded border transition-colors ${
                        editEdgeRel === rel
                          ? 'bg-green-50 border-green-300 text-green-800'
                          : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {rel}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Custom relationship"
                  value={editEdgeRel}
                  onChange={(e) => setEditEdgeRel(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Label</label>
                <input
                  type="text"
                  placeholder="Optional label"
                  value={editEdgeLabel}
                  onChange={(e) => setEditEdgeLabel(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Style</label>
                <select
                  value={editEdgeStyle}
                  onChange={(e) => setEditEdgeStyle(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                >
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={saveSelectedEdge}
                  disabled={saving}
                  style={{ backgroundColor: FG }}
                  className="flex-1 px-2 py-1.5 rounded text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={deleteSelectedEdge}
                  disabled={saving}
                  className="flex-1 px-2 py-1.5 rounded text-xs font-medium text-white bg-red-500 hover:opacity-90 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>

        {/* CANVAS */}
        <div className="flex-1 overflow-auto bg-gray-100">
          <svg
            ref={svgRef}
            width={2400}
            height={1600}
            onMouseMove={onSvgMouseMove}
            onMouseUp={onSvgMouseUp}
            onMouseLeave={onSvgMouseUp}
            onClick={onSvgClick}
            className="cursor-grab active:cursor-grabbing"
            style={{ backgroundColor: '#F3F4F6' }}
          >
            {/* Edges */}
            {edges.map(edge => {
              const src = nodes.find(n => n.id === edge.source_id)
              const tgt = nodes.find(n => n.id === edge.target_id)
              if (!src || !tgt) return null
              return (
                <g key={edge.id}>
                  <path
                    d={edgePath(src, tgt)}
                    stroke={selectedEdgeId === edge.id ? '#16a34a' : '#94A3B8'}
                    strokeWidth={selectedEdgeId === edge.id ? 2.5 : 2}
                    fill="none"
                    strokeDasharray={edge.style === 'dashed' ? '5 5' : 'none'}
                    pointerEvents="none"
                  />
                  <path
                    d={edgePath(src, tgt)}
                    stroke="transparent"
                    strokeWidth={8}
                    fill="none"
                    pointerEvents="auto"
                    onClick={() => onEdgeClick(edge.id)}
                    style={{ cursor: 'pointer' }}
                  />
                  {edge.label && (
                    <g>
                      <rect
                        x={edgeMidpoint(src, tgt).x - 30}
                        y={edgeMidpoint(src, tgt).y - 8}
                        width={60}
                        height={16}
                        rx={2}
                        fill="white"
                        stroke={selectedEdgeId === edge.id ? '#16a34a' : '#94A3B8'}
                        strokeWidth={1}
                      />
                      <text
                        x={edgeMidpoint(src, tgt).x}
                        y={edgeMidpoint(src, tgt).y + 3}
                        textAnchor="middle"
                        fontSize="11"
                        fill={selectedEdgeId === edge.id ? '#16a34a' : '#64748B'}
                        fontWeight="500"
                        pointerEvents="none"
                      >
                        {edge.label}
                      </text>
                    </g>
                  )}
                </g>
              )
            })}

            {/* Nodes */}
            {nodes.map(node => (
              <g key={node.id}>
                {/* Node rect */}
                <rect
                  x={node.x}
                  y={node.y}
                  width={node.width}
                  height={node.height}
                  rx={8}
                  fill={getNodeColor(node)}
                  stroke={selectedNodeId === node.id ? '#16a34a' : 'none'}
                  strokeWidth={2.5}
                  onMouseDown={(e) => onNodeMouseDown(e, node.id)}
                  onClick={(e) => onNodeClick(e, node.id)}
                  style={{ cursor: 'pointer' }}
                />

                {/* Pulsing ring if connectSource */}
                {connectSource === node.id && (
                  <rect
                    x={node.x - 4}
                    y={node.y - 4}
                    width={node.width + 8}
                    height={node.height + 8}
                    rx={8}
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    style={{
                      animation: 'pulse 2s infinite',
                      pointerEvents: 'none',
                    }}
                  />
                )}

                {/* Label */}
                <text
                  x={node.x + node.width / 2}
                  y={node.y + 22}
                  textAnchor="middle"
                  fontSize="14"
                  fill="white"
                  fontWeight="bold"
                  pointerEvents="none"
                >
                  {node.label}
                </text>

                {/* Subtitle */}
                {node.subtitle && (
                  <text
                    x={node.x + node.width / 2}
                    y={node.y + 40}
                    textAnchor="middle"
                    fontSize="11"
                    fill="white"
                    opacity="0.8"
                    pointerEvents="none"
                  >
                    {node.subtitle}
                  </text>
                )}
              </g>
            ))}
          </svg>

          {/* Loading indicator */}
          {loading && (
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: FG }} />
            </div>
          )}
        </div>
      </div>

      {/* CSS for pulsing animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
