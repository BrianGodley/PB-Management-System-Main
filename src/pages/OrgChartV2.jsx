// OrgChart v2 — tier-based snap layout, three Item kinds (Custom, Org
// Position, Org Chart Area), orthogonal arrows, drag-and-drop, edit
// mode toggle, contextual item menu.

import { useEffect, useMemo, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import TierCanvas from '../components/orgchart/TierCanvas.jsx'
import AddNodeDialog from '../components/orgchart/AddNodeDialog.jsx'
import { CANVAS_PAD_X, CANVAS_PAD_Y, NODE_GAP, TIER_GAP } from '../components/orgchart/layout.js'

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
  const [employeePositions, setEmployeePositions] = useState([]) // [{employee_id, position_id}]

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
  // Per-row (per-tier) spacing overrides for the current chart, keyed by
  // tier number. Empty = use the system default for every row.
  const [rowSpacing, setRowSpacing] = useState({})
  const [rowSpacingOpen, setRowSpacingOpen] = useState(false)
  // Per-row horizontal gap between items, keyed by tier. When set, items in
  // that row auto-space from the left and ignore manual x_offset.
  const [colSpacing, setColSpacing] = useState({})
  const [colSpacingOpen, setColSpacingOpen] = useState(false)
  const [chartPickerOpen, setChartPickerOpen] = useState(false)
  // Change-mode state machine for rewiring existing connections.
  // type: 'change_senior' | 'change_child' | 'change_connection' | null
  // itemId   : the item whose connection is being changed
  // edgeId   : (for change_child / change_connection) the specific
  //            outgoing edge to rewire when the item has multiple
  const [changeMode, setChangeMode] = useState(null)

  // ── Loaders ─────────────────────────────────────────────────────────
  useEffect(() => {
    ;(async () => {
      const [chartsRes, positionsRes, employeesRes, epRes] = await Promise.all([
        supabase.from('org_charts').select('*').order('created_at'),
        supabase.from('positions').select('id, title').order('title'),
        supabase
          .from('employees')
          .select('id, first_name, last_name, status')
          .order('last_name', { ascending: true })
          .order('first_name', { ascending: true }),
        supabase.from('employee_positions').select('employee_id, position_id'),
      ])
      const chartList = chartsRes.data || []
      setCharts(chartList)
      setPositions(positionsRes.data || [])
      setEmployees(employeesRes.data || [])
      setEmployeePositions(epRes.data || [])
      // TEMP DIAGNOSTIC — remove once holder resolution is confirmed.
      console.log('[OrgChart debug]', {
        employees: employeesRes.data?.length,
        employeePositions: epRes.data?.length,
        epError: epRes.error?.message || null,
        sampleEmployeePosition: epRes.data?.[0],
        samplePosition: positionsRes.data?.[0],
        sampleEmployee: employeesRes.data?.[0]
          ? {
              id: employeesRes.data[0].id,
              idType: typeof employeesRes.data[0].id,
              name: employeesRes.data[0].first_name,
            }
          : null,
      })
      // Open the default chart (falls back to the first one).
      if (chartList.length) selectChart(chartList.find(c => c.is_default) || chartList[0])
    })()
  }, [])

  // Update the spacing (gap below) for one row/tier and persist it.
  async function updateRowSpacing(tier, value) {
    const next = { ...rowSpacing, [tier]: value }
    setRowSpacing(next)
    try {
      await supabase.from('org_charts').update({ row_spacing: next }).eq('id', chartId)
    } catch (e) {
      alert('Could not save row spacing: ' + (e.message || e))
    }
  }

  // Column-spacing config per tier, stored as { gap, auto } (a bare number
  // counts as auto for backward compatibility).
  function readColCfg(t) {
    const c = colSpacing[t]
    if (c == null) return { gap: '', auto: false }
    if (typeof c === 'number') return { gap: c, auto: true }
    return { gap: c.gap ?? '', auto: !!c.auto }
  }
  async function setColCfg(tier, cfg) {
    const next = { ...colSpacing, [tier]: cfg }
    setColSpacing(next)
    try {
      await supabase.from('org_charts').update({ col_spacing: next }).eq('id', chartId)
    } catch (e) {
      alert('Could not save column spacing: ' + (e.message || e))
    }
  }
  // One-time apply (non-auto): write x_offsets so the row spaces by `gap`
  // starting from the leftmost item, after which items can be dragged freely.
  async function applyColSpacingOnce(tier) {
    const { gap } = readColCfg(tier)
    if (!Number.isFinite(gap)) return
    const rowItems = nodes
      .filter(n => (n.tier ?? 0) === tier && !n.parent_container_id && n.kind !== 'assistant')
      .sort((a, b) => (a.tier_order ?? 0) - (b.tier_order ?? 0))
    if (!rowItems.length) return
    let naturalX = CANVAS_PAD_X
    let cursorTarget = 0
    const updates = []
    rowItems.forEach((n, i) => {
      const w = n.width || 110
      const targetX =
        i === 0 ? naturalX + (Number.isFinite(n.x_offset) ? n.x_offset : 0) : cursorTarget + gap
      updates.push({ id: n.id, x_offset: Math.round(targetX - naturalX) })
      cursorTarget = targetX + w
      naturalX += w + NODE_GAP
    })
    setNodes(prev =>
      prev.map(p => {
        const u = updates.find(x => x.id === p.id)
        return u ? { ...p, x_offset: u.x_offset } : p
      }),
    )
    try {
      await Promise.all(
        updates.map(u =>
          supabase.from('org_nodes').update({ x_offset: u.x_offset }).eq('id', u.id),
        ),
      )
    } catch (e) {
      alert('Apply failed: ' + (e.message || e))
    }
  }

  // The tiers (rows) currently present, top to bottom, for the spacing panel.
  const presentTiers = useMemo(() => {
    const set = new Set(
      nodes
        .filter(n => !n.parent_container_id && n.kind !== 'assistant')
        .map(n => (Number.isInteger(n.tier) ? n.tier : 0)),
    )
    return [...set].sort((a, b) => a - b)
  }, [nodes])

  // Tiers that anchor an assistant — their gap is split into a senior→assistant
  // part and an assistant→next-row part in the Row Spacing panel.
  const assistantAnchorTiers = useMemo(() => {
    const set = new Set()
    for (const n of nodes) {
      if (n.kind !== 'assistant' || !n.attached_to_node_id) continue
      const a = nodes.find(x => x.id === n.attached_to_node_id)
      if (a) set.add(Number.isInteger(a.tier) ? a.tier : 0)
    }
    return set
  }, [nodes])

  // The ordered list of adjustable spacing gaps shown in the Row Spacing
  // panel — Top→Row 1, then each row→row gap, with assistant rows split into
  // senior→assistant and assistant→next-row entries.
  const spacingEntries = useMemo(() => {
    const entries = []
    presentTiers.forEach((t, idx) => {
      if (idx === 0) {
        entries.push({ key: 'top', label: `From Top to Row ${t + 1}`, fallback: CANVAS_PAD_Y })
      }
      const next = presentTiers[idx + 1]
      if (assistantAnchorTiers.has(t)) {
        entries.push({ key: `${t}_a`, label: `Row ${t + 1} to Assistant`, fallback: TIER_GAP / 2 })
        entries.push({
          key: `${t}_b`,
          label: next != null ? `Assistant to Row ${next + 1}` : 'Assistant to bottom',
          fallback: TIER_GAP / 2,
        })
      } else if (next != null) {
        entries.push({ key: t, label: `Row ${t + 1} to Row ${next + 1}`, fallback: TIER_GAP })
      }
    })
    return entries
  }, [presentTiers, assistantAnchorTiers])

  // Mark a chart as the single default that opens with the module.
  async function setDefaultChart(chart) {
    setCharts(prev => prev.map(c => ({ ...c, is_default: c.id === chart.id })))
    try {
      await supabase.from('org_charts').update({ is_default: false }).neq('id', chart.id)
      await supabase.from('org_charts').update({ is_default: true }).eq('id', chart.id)
    } catch (e) {
      alert('Could not set default: ' + (e.message || e))
    }
  }

  async function selectChart(chart) {
    setChartId(chart.id)
    setChartName(chart.name)
    setRowSpacing(chart.row_spacing || {})
    setRowSpacingOpen(false)
    setColSpacing(chart.col_spacing || {})
    setColSpacingOpen(false)
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
    // TEMP DIAGNOSTIC — remove once holder resolution is confirmed.
    console.log(
      '[OrgChart debug] position nodes',
      (n.data || [])
        .filter(x => x.kind === 'position')
        .slice(0, 5)
        .map(x => ({
          label: x.label,
          position_id: x.position_id,
          position_id_type: typeof x.position_id,
          employee_id: x.employee_id,
        })),
    )
  }

  // Build position_id → employees[] using the employee_positions join.
  // PBS stores the relationship many-to-many: one employee can hold
  // multiple positions, and one position can be held by multiple
  // employees. "active" is derived from employees.status.
  const employeesByPosition = useMemo(() => {
    const empById = new Map(employees.map(e => [String(e.id), e]))
    const m = new Map()
    for (const ep of employeePositions) {
      const e = empById.get(String(ep.employee_id))
      if (!e) continue
      // Normalize the position_id key to a Number so lookups match
      // regardless of whether Supabase returns bigint ids as strings.
      const posKey = Number(ep.position_id)
      const arr = m.get(posKey) || []
      arr.push({
        id: e.id,
        firstName: e.first_name,
        lastName: e.last_name,
        active: (e.status || 'active') === 'active',
        displayName: `${e.first_name || ''} ${e.last_name || ''}`.trim() || '(unnamed)',
      })
      m.set(posKey, arr)
    }
    for (const arr of m.values()) arr.sort((a, b) => Number(b.active) - Number(a.active))
    return m
  }, [employees, employeePositions])

  // resolves both position-kind and container-kind nodes (containers
  // have an optional position_id "in charge")
  const resolveNodeHolder = node => {
    if (!node?.position_id) return null
    const pos = positions.find(p => Number(p.id) === Number(node.position_id))
    if (!pos) return null
    const candidates = employeesByPosition.get(Number(pos.id)) || []
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
    // The first chart (or any time there's no default yet) becomes the default.
    const makeDefault = !charts.some(c => c.is_default)
    const { data, error } = await supabase
      .from('org_charts')
      .insert({
        name: `Chart ${new Date().toLocaleDateString()}`,
        created_by: user?.id,
        is_default: makeDefault,
      })
      .select()
      .single()
    if (error) return alert(error.message)
    setCharts(prev => [...prev, data])
    setChartPickerOpen(false)
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
      // Helper: natural left edge X of a node at (tier, tier_order),
      // ignoring its own x_offset. Sums prev siblings' widths + gaps.
      const naturalXAt = (tierNum, tierOrderNum) => {
        const sibs = nodes
          .filter(n => (n.tier ?? 0) === tierNum && !n.parent_container_id)
          .sort((a, b) => (a.tier_order ?? 0) - (b.tier_order ?? 0))
        let x = CANVAS_PAD_X
        for (const s of sibs) {
          if ((s.tier_order ?? 0) < tierOrderNum) x += (s.width || 110) + NODE_GAP
        }
        return x
      }
      // Helper: display X of an existing node (natural + its x_offset).
      const displayX = node => {
        const nx = naturalXAt(node.tier ?? 0, node.tier_order ?? 0)
        return nx + (Number.isFinite(node.x_offset) ? node.x_offset : 0)
      }

      let tier = 0
      let tier_order = 0
      let parent_container_id = null
      let x_offset = 0
      let centerUnder = null // existing node whose center we want to align with
      const newWidth = payload.width || 110
      if (payload.parentId) {
        const parent = nodes.find(n => n.id === payload.parentId)
        if (parent) {
          // "Attach directly" under an Area: the new item becomes a sub-item
          // column INSIDE the parent (centered, auto-sized by the column
          // layout) instead of a separate child a tier below with an arrow.
          if (payload.attachDirect && parent.kind === 'container') {
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
            centerUnder = parent
          }
        }
      } else if (payload.seniorOf) {
        const ref = nodes.find(n => n.id === payload.seniorOf)
        if (ref) {
          tier = (ref.tier ?? 0) - 1
          tier_order = nodes
            .filter(n => (n.tier ?? 0) === tier && !n.parent_container_id)
            .reduce((max, n) => Math.max(max, (n.tier_order ?? 0) + 1), 0)
          centerUnder = ref
        }
      } else {
        tier_order = nodes
          .filter(n => (n.tier ?? 0) === 0)
          .reduce((max, n) => Math.max(max, (n.tier_order ?? 0) + 1), 0)
      }
      // Center the new item under its parent (or above its junior, for
      // senior items) so the connector line is a single straight
      // vertical. Skipped for sub-items (the container's column layout
      // owns their position).
      if (centerUnder && !parent_container_id) {
        const parentCenterX = displayX(centerUnder) + (centerUnder.width || 110) / 2
        const newNaturalX = naturalXAt(tier, tier_order)
        x_offset = Math.round(parentCenterX - newNaturalX - newWidth / 2)
      }
      // Honor an explicit Level chosen in the dialog. The item is placed at
      // the far-right of that level (skipped for container sub-items, whose
      // position is owned by the container's column layout).
      if (Number.isInteger(payload.tier) && !parent_container_id) {
        tier = payload.tier
        tier_order = nodes
          .filter(n => (n.tier ?? 0) === tier && !n.parent_container_id)
          .reduce((max, n) => Math.max(max, (n.tier_order ?? 0) + 1), 0)
        x_offset = 0
      }
      const insert = {
        chart_id: chartId,
        kind: payload.kind,
        label: payload.label || '',
        position_id: payload.position_id || null,
        employee_id: payload.employee_id || null,
        heading: payload.heading || null,
        bg_color: payload.bg_color || null,
        box_style: payload.box_style || {},
        container_mode: payload.container_mode || null,
        parent_container_id,
        attached_to_node_id: payload.attached_to_node_id || null,
        attachment_side: payload.attachment_side || null,
        width: payload.width || 110,
        height: payload.height || 40,
        font_sizes: payload.font_sizes || {},
        text_styles: payload.text_styles || {},
        x_offset,
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
        box_style: payload.box_style || {},
        container_mode: payload.container_mode || null,
        attached_to_node_id: payload.attached_to_node_id || null,
        attachment_side: payload.attachment_side || null,
        width: payload.width || 110,
        height: payload.height || 40,
        font_sizes: payload.font_sizes || {},
        text_styles: payload.text_styles || {},
      }
      // Apply an explicit Level change. When the level actually changes,
      // move the item to the far-right of the new level and reset its
      // horizontal nudge so it lands cleanly in that row.
      if (Number.isInteger(payload.tier)) {
        update.tier = payload.tier
        const current = nodes.find(n => n.id === payload.id)
        if ((current?.tier ?? 0) !== payload.tier) {
          update.tier_order = nodes
            .filter(n => n.id !== payload.id && (n.tier ?? 0) === payload.tier && !n.parent_container_id)
            .reduce((max, n) => Math.max(max, (n.tier_order ?? 0) + 1), 0)
          update.x_offset = 0
        }
      }
      const { data, error } = await supabase
        .from('org_nodes')
        .update(update)
        .eq('id', payload.id)
        .select()
        .single()
      if (error) throw error
      setNodes(prev => prev.map(n => (n.id === data.id ? data : n)))
      // Per-row height: when an item's height changes, every other item on
      // the same row adopts that exact height (even if smaller), so the row
      // matches the edited item rather than the tallest one.
      const prevNode = nodes.find(n => n.id === payload.id)
      const newHeight = payload.height || 40
      if ((prevNode?.height ?? 40) !== newHeight) {
        const rowTier = update.tier ?? prevNode?.tier ?? 0
        const sibIds = nodes
          .filter(
            n =>
              n.id !== payload.id &&
              !n.parent_container_id &&
              n.kind !== 'assistant' &&
              (n.tier ?? 0) === rowTier,
          )
          .map(n => n.id)
        if (sibIds.length) {
          setNodes(prev =>
            prev.map(p => (sibIds.includes(p.id) ? { ...p, height: newHeight } : p)),
          )
          await supabase.from('org_nodes').update({ height: newHeight }).in('id', sibIds)
        }
      }
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

  // Persist a dragged connection line's vertical bus offset.
  async function updateEdgeBus(edgeId, offset) {
    setEdges(prev => prev.map(e => (e.id === edgeId ? { ...e, bus_offset: offset } : e)))
    try {
      await supabase.from('org_edges').update({ bus_offset: offset }).eq('id', edgeId)
    } catch (e) {
      alert('Could not save line position: ' + (e.message || e))
    }
  }

  async function handleNodeDropped(nodeId, newTier, newTierOrder, newXOffset) {
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return
    // Assistants live beside their anchor, not in a tier row — a drag only
    // changes their horizontal offset. Skip the tier-sibling reordering.
    if (node.kind === 'assistant') {
      setNodes(prev => prev.map(p => (p.id === nodeId ? { ...p, x_offset: newXOffset } : p)))
      try {
        await supabase.from('org_nodes').update({ x_offset: newXOffset }).eq('id', nodeId)
      } catch (e) {
        alert('Move failed: ' + (e.message || e))
      }
      return
    }
    const otherSibs = nodes
      .filter(
        n =>
          n.id !== nodeId &&
          (n.tier ?? 0) === newTier &&
          !n.parent_container_id &&
          n.kind !== 'assistant',
      )
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

  // ── Connection change operations ────────────────────────────────────
  // Each operation puts the chart into a "pick target" mode. The next
  // node click is interpreted as the destination of the rewire, with
  // conflict resolution if the new target already has a constraining
  // edge.

  async function rewireSenior(itemId, newSeniorId) {
    if (newSeniorId === itemId) return alert('An item cannot be its own senior.')
    setBusy(true)
    try {
      // delete all incoming edges to itemId
      await supabase.from('org_edges').delete().eq('target_id', itemId)
      // create new senior edge
      const { data: edge } = await supabase
        .from('org_edges')
        .insert({
          chart_id: chartId,
          source_id: newSeniorId,
          target_id: itemId,
          relationship: 'reports_to',
          style: 'solid',
        })
        .select()
        .single()
      setEdges(prev => {
        const without = prev.filter(e => e.target_id !== itemId)
        return edge ? [...without, edge] : without
      })
    } catch (e) {
      alert('Change senior failed: ' + (e.message || e))
    } finally {
      setBusy(false)
    }
  }

  async function rewireChild(itemId, oldChildId, newChildId, edgeId) {
    if (newChildId === itemId) return alert('An item cannot be its own junior.')
    // Conflict check: does the new child already have a senior other
    // than `itemId`? If so, ask the user what to do with that edge.
    const conflicting = edges.filter(
      e => e.target_id === newChildId && e.source_id !== itemId,
    )
    if (conflicting.length > 0) {
      const proceed = confirm(
        'The new junior already has a senior. Disconnect that existing senior?\n\n' +
          'OK = disconnect existing senior(s) and make this the new senior.\n' +
          'Cancel = keep both seniors (will leave a tangled chart).',
      )
      if (proceed) {
        for (const c of conflicting) {
          await supabase.from('org_edges').delete().eq('id', c.id)
        }
        setEdges(prev => prev.filter(e => !conflicting.some(c => c.id === e.id)))
      }
    }
    setBusy(true)
    try {
      // Delete the specific outgoing edge being changed (or all out from itemId
      // if no edgeId given)
      if (edgeId) {
        await supabase.from('org_edges').delete().eq('id', edgeId)
        setEdges(prev => prev.filter(e => e.id !== edgeId))
      } else if (oldChildId) {
        await supabase
          .from('org_edges')
          .delete()
          .eq('source_id', itemId)
          .eq('target_id', oldChildId)
        setEdges(prev => prev.filter(e => !(e.source_id === itemId && e.target_id === oldChildId)))
      }
      const { data: edge } = await supabase
        .from('org_edges')
        .insert({
          chart_id: chartId,
          source_id: itemId,
          target_id: newChildId,
          relationship: 'reports_to',
          style: 'solid',
        })
        .select()
        .single()
      if (edge) setEdges(prev => [...prev, edge])
    } catch (e) {
      alert('Change junior failed: ' + (e.message || e))
    } finally {
      setBusy(false)
    }
  }

  function startChangeMode(type, item) {
    if (!item) return
    if (type === 'change_child' || type === 'change_connection') {
      const outgoing = edges.filter(e => e.source_id === item.id)
      let edgeId = null
      if (outgoing.length > 1) {
        const list = outgoing
          .map((e, i) => {
            const tgt = nodes.find(n => n.id === e.target_id)
            return `${i + 1}. ${tgt?.label || tgt?.id?.slice(0, 6) || '?'}`
          })
          .join('\n')
        const choice = prompt(
          `This item has ${outgoing.length} outgoing connections. Which one to change?\n${list}\n\nEnter number:`,
          '1',
        )
        const idx = Number(choice) - 1
        if (Number.isInteger(idx) && idx >= 0 && idx < outgoing.length) {
          edgeId = outgoing[idx].id
        } else {
          return
        }
      } else if (outgoing.length === 1) {
        edgeId = outgoing[0].id
      } else if (type === 'change_child') {
        return alert('This item has no junior to change. Use Add Junior Item instead.')
      }
      setChangeMode({ type, itemId: item.id, edgeId })
    } else if (type === 'change_senior') {
      setChangeMode({ type, itemId: item.id })
    }
    setDialog(null)
    setContextMenu(null)
    setSelectedNodeId(null) // source shows red via change-mode highlight, not blue
  }

  async function applyChangeMode(targetId) {
    if (!changeMode) return
    const { type, itemId, edgeId } = changeMode
    if (type === 'change_senior') {
      await rewireSenior(itemId, targetId)
    } else if (type === 'change_child' || type === 'change_connection') {
      const old = edges.find(e => e.id === edgeId)
      await rewireChild(itemId, old?.target_id, targetId, edgeId)
    }
    setChangeMode(null)
  }

  const onNodeClick = useCallback(
    (nodeId, screenRect) => {
      if (changeMode) {
        // Pick the new target (don't apply yet) — the user confirms via the
        // "Save new …" button in the banner. The regular menu stays hidden.
        if (nodeId !== changeMode.itemId) {
          setChangeMode(prev => ({ ...prev, targetId: nodeId }))
        }
        return
      }
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
    [changeMode, connectMode, connectSource, nodes, chartId, editMode],
  )

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || null

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* TEMP DIAGNOSTIC — remove once holder resolution is confirmed. */}
      <div className="bg-yellow-50 border-b border-yellow-300 px-3 py-2 text-[11px] text-yellow-900 font-mono whitespace-pre-wrap">
        {(() => {
          const posNodes = nodes.filter(n => n.kind === 'position')
          const lines = [
            `employee_positions rows loaded: ${employeePositions.length}  |  employees: ${employees.length}  |  positions: ${positions.length}`,
            `sample employee_position: ${JSON.stringify(employeePositions[0] || null)}`,
            `sample position: ${JSON.stringify(positions[0] || null)}`,
          ]
          posNodes.slice(0, 6).forEach(n => {
            const pos = positions.find(p => Number(p.id) === Number(n.position_id))
            const cands = pos ? employeesByPosition.get(Number(pos.id)) || [] : []
            lines.push(
              `node "${n.label || '?'}": position_id=${JSON.stringify(n.position_id)} posFound=${!!pos} holders=${cands.length}${cands[0] ? ' → ' + cands[0].displayName : ''}`,
            )
          })
          return lines.join('\n')
        })()}
      </div>
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
                <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 shadow-lg rounded-md z-50 min-w-[18rem] max-h-80 overflow-y-auto py-1">
                  {charts.length === 0 ? (
                    <p className="text-xs text-slate-400 px-3 py-2">
                      No charts yet — use + New Chart below.
                    </p>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 px-3 pb-1 text-[10px] uppercase tracking-wide text-slate-400">
                        <span className="w-8 text-center">Default</span>
                        <span>Chart</span>
                      </div>
                      {charts.map(c => (
                        <div
                          key={c.id}
                          className={`flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-slate-50 ${
                            c.id === chartId ? 'bg-slate-50' : ''
                          }`}
                        >
                          <span className="w-8 flex justify-center">
                            <input
                              type="radio"
                              name="default-chart"
                              checked={!!c.is_default}
                              onChange={() => setDefaultChart(c)}
                              title="Make this the default chart"
                              className="accent-green-700 cursor-pointer"
                            />
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              selectChart(c)
                              setChartPickerOpen(false)
                            }}
                            className={`flex-1 text-left ${c.id === chartId ? 'font-medium' : ''}`}
                          >
                            {c.name}
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <button
                      type="button"
                      onClick={createChart}
                      className="block w-full text-left px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
                      style={{ color: FG }}
                    >
                      + New Chart
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
          {editMode && chartId && (
            <>
              <button
                type="button"
                onClick={() => setDialog({ mode: 'new', parentId: null, fixedKind: 'position' })}
                className="text-sm px-3 py-1 rounded-md bg-blue-600 text-white whitespace-nowrap"
              >
                + Position
              </button>
              <button
                type="button"
                onClick={() => setDialog({ mode: 'new', parentId: null, fixedKind: 'container' })}
                className="text-sm px-3 py-1 rounded-md bg-indigo-600 text-white whitespace-nowrap"
              >
                + Area
              </button>
              <button
                type="button"
                onClick={() => setDialog({ mode: 'new', parentId: null, fixedKind: 'assistant' })}
                className="text-sm px-3 py-1 rounded-md bg-sky-600 text-white whitespace-nowrap"
              >
                + Assistant
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setRowSpacingOpen(v => !v)}
                  className="text-sm px-3 py-1 rounded-md bg-slate-200 text-slate-700 hover:bg-slate-300 whitespace-nowrap"
                >
                  Row Spacing ▾
                </button>
                {rowSpacingOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 shadow-lg rounded-md z-50 w-56 py-2 px-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-500">Row spacing (px)</span>
                      <button
                        type="button"
                        onClick={() => setRowSpacingOpen(false)}
                        className="text-slate-400 hover:text-slate-700 text-sm leading-none"
                      >
                        ✕
                      </button>
                    </div>
                    {spacingEntries.length === 0 ? (
                      <p className="text-xs text-slate-400 py-1">No rows yet.</p>
                    ) : (
                      spacingEntries.map(e => (
                        <div key={e.key} className="flex items-center justify-between gap-2 py-1">
                          <span className="text-xs text-slate-600">{e.label}</span>
                          <input
                            type="number"
                            min={0}
                            max={600}
                            value={
                              rowSpacing[e.key] === ''
                                ? ''
                                : Number.isFinite(rowSpacing[e.key])
                                  ? rowSpacing[e.key]
                                  : e.fallback
                            }
                            onChange={ev =>
                              updateRowSpacing(e.key, ev.target.value === '' ? '' : Number(ev.target.value))
                            }
                            className="no-spin w-20 border border-slate-300 rounded-md px-1 py-0.5 text-xs"
                          />
                        </div>
                      ))
                    )}
                    <p className="mt-1 text-[10px] text-slate-400 leading-snug">
                      Adjusts each vertical gap — connection lines and the rows
                      move closer or farther apart.
                    </p>
                  </div>
                )}
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setColSpacingOpen(v => !v)}
                  className="text-sm px-3 py-1 rounded-md bg-slate-200 text-slate-700 hover:bg-slate-300 whitespace-nowrap"
                >
                  Column Spacing ▾
                </button>
                {colSpacingOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 shadow-lg rounded-md z-50 w-60 py-2 px-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-500">Item spacing per row (px)</span>
                      <button
                        type="button"
                        onClick={() => setColSpacingOpen(false)}
                        className="text-slate-400 hover:text-slate-700 text-sm leading-none"
                      >
                        ✕
                      </button>
                    </div>
                    {presentTiers.length === 0 ? (
                      <p className="text-xs text-slate-400 py-1">No rows yet.</p>
                    ) : (
                      presentTiers.map(t => {
                        const { gap, auto } = readColCfg(t)
                        return (
                          <div key={t} className="py-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs text-slate-600">Row {t + 1}</span>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={0}
                                  max={400}
                                  value={gap === '' ? '' : gap}
                                  placeholder={String(NODE_GAP)}
                                  onChange={ev =>
                                    setColCfg(t, {
                                      gap: ev.target.value === '' ? '' : Number(ev.target.value),
                                      auto,
                                    })
                                  }
                                  className="no-spin w-16 border border-slate-300 rounded-md px-1 py-0.5 text-xs"
                                />
                                <button
                                  type="button"
                                  onClick={() => setColCfg(t, { gap, auto: !auto })}
                                  title="Auto-space continuously from the leftmost item"
                                  className={`px-1.5 py-0.5 rounded border text-[11px] ${
                                    auto
                                      ? 'border-green-600 bg-green-50 text-green-700 font-semibold'
                                      : 'border-slate-300 text-slate-500'
                                  }`}
                                >
                                  Auto
                                </button>
                              </div>
                            </div>
                            {!auto && Number.isFinite(gap) && (
                              <div className="flex justify-end mt-0.5">
                                <button
                                  type="button"
                                  onClick={() => applyColSpacingOnce(t)}
                                  className="text-[11px] text-blue-600 hover:underline"
                                >
                                  Apply once
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                    <p className="mt-1 text-[10px] text-slate-400 leading-snug">
                      Spacing starts from the leftmost item. <b>Auto</b> keeps re-spacing as you
                      move that item; otherwise click <b>Apply once</b>, then drag freely.
                    </p>
                  </div>
                )}
              </div>
            </>
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
          {chartId && (
            <button
              type="button"
              onClick={() => {
                setEditMode(v => !v)
                setContextMenu(null)
                setConnectMode(false)
                setConnectSource(null)
                setChartPickerOpen(false)
              }}
              className={`ml-2 text-sm px-3 py-1 rounded-md whitespace-nowrap ${
                editMode
                  ? 'bg-amber-500 text-white hover:bg-amber-600'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {editMode ? 'Save' : 'Edit'}
            </button>
          )}
        </div>
      </div>

      {connectMode && (
        <div className="bg-orange-50 border-b border-orange-200 px-4 py-1.5 text-xs text-orange-800 flex items-center justify-between">
          <span>
            {connectSource ? 'Click the second item to connect.' : 'Click the source item first.'}
          </span>
          <button
            type="button"
            onClick={() => {
              setConnectMode(false)
              setConnectSource(null)
            }}
            className="text-orange-700 underline"
          >
            cancel
          </button>
        </div>
      )}
      {changeMode && (() => {
        const what =
          changeMode.type === 'change_senior'
            ? 'senior'
            : changeMode.type === 'change_child'
              ? 'junior'
              : 'connection'
        const tgt = changeMode.targetId
          ? nodes.find(n => n.id === changeMode.targetId)
          : null
        return (
          <div className="bg-red-50 border-b border-red-200 px-4 py-1.5 text-xs text-red-800 flex items-center justify-between gap-2">
            <span>
              {!changeMode.targetId
                ? `Select the new ${what} item.`
                : `New ${what}: ${tgt?.label || 'selected item'} — click Save to apply.`}
            </span>
            <div className="flex items-center gap-3">
              {changeMode.targetId && (
                <button
                  type="button"
                  onClick={() => applyChangeMode(changeMode.targetId)}
                  className="px-2 py-0.5 rounded bg-red-600 text-white font-medium hover:bg-red-700"
                >
                  Save new {what}
                </button>
              )}
              <button
                type="button"
                onClick={() => setChangeMode(null)}
                className="text-red-700 underline"
              >
                cancel
              </button>
            </div>
          </div>
        )
      })()}

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
            onNodeDoubleClick={nodeId => {
              const n = nodes.find(x => x.id === nodeId)
              if (!n) return
              setSelectedNodeId(nodeId)
              setContextMenu(null)
              setDialog({ mode: 'edit', existing: n })
            }}
            onNodeDropped={handleNodeDropped}
            onEdgeBusChange={updateEdgeBus}
            rowSpacing={rowSpacing}
            colSpacing={colSpacing}
            redNodeIds={changeMode ? [changeMode.itemId, changeMode.targetId].filter(Boolean) : []}
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
          <div className="h-full flex flex-col items-center justify-center text-center gap-4 px-6">
            <p className="text-2xl font-semibold text-slate-600">No org chart yet</p>
            <p className="text-sm text-slate-400 max-w-sm">
              You don't have a saved org chart. Click the button below to create one —
              it becomes your default and opens automatically next time.
            </p>
            <button
              type="button"
              onClick={createChart}
              className="text-lg px-8 py-4 rounded-xl text-white font-semibold shadow-md hover:opacity-90"
              style={{ background: FG }}
            >
              + Chart
            </button>
          </div>
        )}
      </div>

      {editMode && contextMenu && selectedNode &&
        createPortal(
          <ItemContextMenu
            screenRect={contextMenu.screenRect}
            kind={selectedNode.kind}
            onClose={() => setContextMenu(null)}
            onConnect={() => {
              setConnectMode(true)
              setConnectSource(selectedNode.id)
              setContextMenu(null)
            }}
            onAddJuniorPosition={() => {
              setDialog({ mode: 'child', parentId: selectedNode.id, fixedKind: 'position' })
              setContextMenu(null)
            }}
            onAddJuniorArea={() => {
              setDialog({ mode: 'child', parentId: selectedNode.id, fixedKind: 'container' })
              setContextMenu(null)
            }}
            onAddAssistant={() => {
              setDialog({ mode: 'new', fixedKind: 'assistant', anchorId: selectedNode.id })
              setContextMenu(null)
            }}
            onChangeSenior={() => startChangeMode('change_senior', selectedNode)}
            onChangeChild={() => startChangeMode('change_child', selectedNode)}
            onChangeConnection={() => startChangeMode('change_connection', selectedNode)}
            onEdit={() => {
              setDialog({ mode: 'edit', existing: selectedNode })
              setContextMenu(null)
            }}
            onDelete={() => {
              deleteSelectedNode()
            }}
          />,
          document.body,
        )}

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
          fixedKind={dialog.fixedKind}
          anchorId={dialog.anchorId}
          existing={dialog.existing}
          positions={positions}
          employeesByPosition={employeesByPosition}
          allItems={nodes}
          onSubmit={payload => (payload.isEdit ? saveNode(payload) : addNode(payload))}
          onClose={() => setDialog(null)}
          onAddChild={existing => {
            setDialog({ mode: 'child', parentId: existing.id })
          }}
          onAddSenior={existing => {
            setDialog({ mode: 'senior', seniorOf: existing.id })
          }}
          onConnect={existing => {
            setSelectedNodeId(existing.id)
            setConnectMode(true)
            setConnectSource(existing.id)
            setDialog(null)
          }}
          onChangeSenior={existing => startChangeMode('change_senior', existing)}
          onChangeChild={existing => startChangeMode('change_child', existing)}
          onChangeConnection={existing => startChangeMode('change_connection', existing)}
          onDelete={existing => {
            setSelectedNodeId(existing.id)
            setDialog(null)
            setTimeout(() => deleteSelectedNode(), 0)
          }}
        />
      )}
    </div>
  )
}

function ItemContextMenu({
  screenRect,
  kind,
  onClose,
  onConnect,
  onAddJuniorPosition,
  onAddJuniorArea,
  onAddAssistant,
  onChangeSenior,
  onChangeChild,
  onChangeConnection,
  onEdit,
  onDelete,
}) {
  const menuWidth = 180
  const margin = 8
  let left = screenRect.right + margin
  if (left + menuWidth > window.innerWidth - 8) {
    left = Math.max(8, screenRect.left - menuWidth - margin)
  }
  const top = Math.max(8, Math.min(window.innerHeight - 260, screenRect.top))
  return (
    <div
      className="fixed z-[1000] bg-white border border-slate-200 shadow-xl rounded-lg py-1 text-sm"
      style={{ top, left, width: menuWidth }}
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-3 py-1 border-b border-slate-100">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Item
        </span>
        <button
          type="button"
          onClick={onClose}
          title="Close"
          className="text-slate-400 hover:text-slate-700 leading-none px-1"
        >
          ✕
        </button>
      </div>
      <MenuItem label="Edit" onClick={onEdit} />
      <MenuItem label="New Item Connection" onClick={onConnect} />
      <MenuItem label="Change Connection" onClick={onChangeConnection} />
      <MenuItem label="Add Junior Position" onClick={onAddJuniorPosition} />
      <MenuItem label="Add Junior Area" onClick={onAddJuniorArea} />
      {kind !== 'container' && <MenuItem label="Add Assistant" onClick={onAddAssistant} />}
      <div className="border-t border-slate-100 my-1" />
      <MenuItem label="Change Senior" onClick={onChangeSenior} />
      <MenuItem label="Change Junior" onClick={onChangeChild} />
      <MenuItem label="Delete" onClick={onDelete} danger />
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
