// OrgChart v2 — tier-based snap layout, three Item kinds (Custom, Org
// Position, Org Chart Area), orthogonal arrows, drag-and-drop, edit
// mode toggle, contextual item menu.

import { useEffect, useMemo, useState, useCallback, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import TierCanvas from '../components/orgchart/TierCanvas.jsx'
import AddNodeDialog from '../components/orgchart/AddNodeDialog.jsx'
import ItemInfoModal from '../components/orgchart/InfoModals.jsx'
import OrgChartWizard from '../components/orgchart/OrgChartWizard.jsx'
import {
  NewChartModal,
  RenameChartModal,
  CreateTemplateModal,
  ChartNameMenu,
  RecategorizeChartModal,
  TemplatesSettingsView,
} from '../components/orgchart/OrgChartTemplates.jsx'
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
  // Item-info modal: clicking an item (in either mode) opens a read-only info
  // view. For positions it shows the holder + assigned stats; for areas it
  // shows an expanded view with drill-down into junior items.
  const [infoNodeId, setInfoNodeId] = useState(null)

  // ── Template library state ──────────────────────────────────────────
  const [templates, setTemplates] = useState([])
  const [templateCategories, setTemplateCategories] = useState([])
  const [templateSubcategories, setTemplateSubcategories] = useState([])
  const [wizardExamples, setWizardExamples] = useState([]) // recent accepted wizard structures (for Sam grounding)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showNewChartModal, setShowNewChartModal] = useState(false)
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false)
  const [showTemplateSettings, setShowTemplateSettings] = useState(false)
  const [chartNameMenu, setChartNameMenu] = useState(null) // { anchorRect }
  const [showRecategorize, setShowRecategorize] = useState(false)
  const [pendingDefaultChart, setPendingDefaultChart] = useState(null) // chart awaiting default-change confirm
  const [wizardName, setWizardName] = useState(null) // non-null = wizard open, carries the chart name
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
      const [
        chartsRes,
        positionsRes,
        employeesRes,
        epRes,
        tplRes,
        catRes,
        subcatRes,
        profRes,
        wizRes,
      ] = await Promise.all([
          supabase.from('org_charts').select('*').order('created_at'),
          supabase.from('positions').select('id, title').order('title'),
          supabase
            .from('employees')
            .select('id, first_name, last_name, status, job_title')
            .order('last_name', { ascending: true })
            .order('first_name', { ascending: true }),
          supabase.from('employee_positions').select('employee_id, position_id'),
          supabase.from('org_chart_templates').select('*').order('name'),
          supabase.from('org_chart_template_categories').select('*').order('name'),
          supabase.from('org_chart_template_subcategories').select('*').order('name'),
          user?.id
            ? supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
            : Promise.resolve({ data: null }),
          supabase
            .from('org_chart_wizard_feedback')
            .select('description, final')
            .order('created_at', { ascending: false })
            .limit(3),
        ])
      const chartList = chartsRes.data || []
      setCharts(chartList)
      setPositions(positionsRes.data || [])
      setEmployees(employeesRes.data || [])
      setEmployeePositions(epRes.data || [])
      setTemplates(tplRes.data || [])
      setTemplateCategories(catRes.data || [])
      setTemplateSubcategories(subcatRes.data || [])
      setWizardExamples((wizRes.data || []).map(r => r.final).filter(Boolean))
      setIsAdmin((profRes.data?.role || '').toLowerCase() === 'admin')
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
    let candidates = employeesByPosition.get(Number(pos.id)) || []
    // Fallback: some setups have duplicate position records (same title,
    // different id). If the exact position has nobody assigned, look for any
    // same-titled position that does.
    if (candidates.length === 0 && pos.title) {
      for (const p of positions) {
        if (p.title !== pos.title || Number(p.id) === Number(pos.id)) continue
        const c = employeesByPosition.get(Number(p.id))
        if (c && c.length) {
          candidates = c
          break
        }
      }
    }
    // Fallback: many roles are recorded as the employee's free-text job_title
    // rather than a structured employee_positions row. Match those by title.
    if (candidates.length === 0 && pos.title) {
      const t = pos.title.trim().toLowerCase()
      candidates = employees
        .filter(e => (e.job_title || '').trim().toLowerCase() === t)
        .map(e => ({
          id: e.id,
          active: (e.status || 'active') === 'active',
          displayName: `${e.first_name || ''} ${e.last_name || ''}`.trim() || '(unnamed)',
        }))
    }
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
  async function createChart(nameArg, extra = {}) {
    // The first chart (or any time there's no default yet) becomes the default.
    const makeDefault = !charts.some(c => c.is_default)
    const { data, error } = await supabase
      .from('org_charts')
      .insert({
        name: (nameArg && nameArg.trim()) || `Chart ${new Date().toLocaleDateString()}`,
        created_by: user?.id,
        is_default: makeDefault,
        category_id: extra.categoryId ?? null,
        subcategory_id: extra.subcategoryId ?? null,
      })
      .select()
      .single()
    if (error) {
      alert(error.message)
      return null
    }
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
    return data
  }

  // New Chart modal submit: blank chart, or a chart instantiated from a template.
  async function handleCreateChart({ name, source, template, categoryId, subcategoryId }) {
    setShowNewChartModal(false)
    if (source === 'wizard') {
      // Defer chart creation to the wizard's completion step.
      setWizardName(name)
      return
    }
    const chart = await createChart(name, { categoryId, subcategoryId })
    if (!chart) return
    if (source === 'template' && template) {
      await instantiateFromTemplate(chart.id, template, {
        isMain: !!chart.is_default,
        chartName: chart.name,
      })
    }
  }

  // Wizard finished — build the chart from the snapshot it produced (reusing
  // the template instantiation path, which also handles HR position sync).
  async function handleWizardComplete(name, snapshot, feedback) {
    setWizardName(null)
    const chart = await createChart(name, {
      categoryId: feedback?.categoryId ?? null,
      subcategoryId: feedback?.subcategoryId ?? null,
    })
    if (!chart) return
    await instantiateFromTemplate(
      chart.id,
      { data: snapshot },
      { isMain: !!chart.is_default, chartName: chart.name },
    )
    // Store the draft-vs-final so Sam can learn from the edits next time.
    if (feedback) {
      try {
        await supabase.from('org_chart_wizard_feedback').insert({
          description: feedback.description || null,
          draft: feedback.draft || null,
          final: feedback.final || null,
          created_by: user?.id,
        })
        if (feedback.final) setWizardExamples(prev => [feedback.final, ...prev].slice(0, 3))
      } catch {
        /* non-fatal */
      }
    }
  }

  // ── Template helpers ────────────────────────────────────────────────
  // Snapshot the current chart's nodes/edges into a portable template payload.
  // Employees are stripped; positions are stored by TITLE (not id) so the
  // template is portable and we can match/create positions on instantiation.
  function buildTemplateSnapshot() {
    const titleById = new Map(positions.map(p => [Number(p.id), p.title]))
    const tplNodes = nodes.map(n => ({
      ref: n.id, // local reference for remapping parent/attachment/edges
      kind: n.kind,
      label: n.label || '',
      position_title: n.position_id ? titleById.get(Number(n.position_id)) || null : null,
      heading: n.heading || null,
      bg_color: n.bg_color || null,
      box_style: n.box_style || {},
      container_mode: n.container_mode || null,
      parent_ref: n.parent_container_id || null,
      attached_ref: n.attached_to_node_id || null,
      attachment_side: n.attachment_side || null,
      width: n.width || null,
      height: n.height || null,
      font_sizes: n.font_sizes || {},
      text_styles: n.text_styles || {},
      x_offset: n.x_offset || 0,
      tier: n.tier ?? 0,
      tier_order: n.tier_order ?? 0,
    }))
    const tplEdges = edges.map(e => ({
      source_ref: e.source_id,
      target_ref: e.target_id,
      relationship: e.relationship || 'reports_to',
      style: e.style || 'solid',
      bus_offset: e.bus_offset ?? null,
    }))
    return { nodes: tplNodes, edges: tplEdges }
  }

  async function createTemplateFromCurrentChart({
    name,
    description,
    categoryId,
    newCategoryName,
    subcategoryId,
    newSubcategoryName,
  }) {
    setShowCreateTemplateModal(false)
    try {
      let catId = categoryId
      if (!catId && newCategoryName) {
        const { data: cat, error: cErr } = await supabase
          .from('org_chart_template_categories')
          .insert({ name: newCategoryName, created_by: user?.id })
          .select()
          .single()
        if (cErr) throw cErr
        catId = cat.id
        setTemplateCategories(prev => [...prev, cat])
      }
      let subId = subcategoryId
      if (!subId && newSubcategoryName && catId) {
        const { data: sub, error: sErr } = await supabase
          .from('org_chart_template_subcategories')
          .insert({ name: newSubcategoryName, category_id: catId, created_by: user?.id })
          .select()
          .single()
        if (sErr) throw sErr
        subId = sub.id
        setTemplateSubcategories(prev => [...prev, sub])
      }
      const payload = {
        name,
        description: description || null,
        category_id: catId || null,
        subcategory_id: subId || null,
        data: buildTemplateSnapshot(),
        created_by: user?.id,
      }
      const { data, error } = await supabase
        .from('org_chart_templates')
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      setTemplates(prev => [...prev, data])
      alert(`Template "${name}" created.`)
    } catch (e) {
      alert(e.message || String(e))
    }
  }

  // Build a chart from a template: ensure positions exist (add missing ones,
  // after telling the user), insert nodes (remapping local refs to new ids),
  // patch parent/attachment links, then insert edges.
  async function instantiateFromTemplate(newChartId, template, opts = {}) {
    const { isMain = false, chartName = 'this chart' } = opts
    const data = template?.data || {}
    const tplNodes = data.nodes || []
    const tplEdges = data.edges || []
    const lower = x => String(x || '').toLowerCase().trim()

    // 1) Positions.
    const titles = [...new Set(tplNodes.map(n => n.position_title).filter(Boolean))]
    const byTitle = new Map()
    if (isMain) {
      // The main (first/default) chart draws from the MAIN positions list:
      // reuse existing main positions and add any missing ones to it.
      positions
        .filter(p => !p.source_chart_id)
        .forEach(p => byTitle.set(lower(p.title), p))
      const missing = titles.filter(t => !byTitle.has(lower(t)))
      if (missing.length) {
        const ok = confirm(
          `These positions will be added to your main HR positions list:\n\n` +
            missing.join('\n') +
            `\n\nContinue?`,
        )
        if (!ok) return
        const { data: created, error } = await supabase
          .from('positions')
          .insert(missing.map(t => ({ title: t })))
          .select()
        if (error) {
          alert(error.message)
          return
        }
        setPositions(prev => [...prev, ...(created || [])])
        for (const p of created || []) byTitle.set(lower(p.title), p)
      }
    } else {
      // Every additional chart gets its OWN positions list (a separate sub-tab
      // in HR > Positions named after the chart). It does not touch Main.
      if (titles.length) {
        const ok = confirm(
          `A separate positions list will be created for this chart.\n\n` +
            `You'll find it in HR → Positions → "${chartName}". It won't change your ` +
            `main positions list.\n\nContinue?`,
        )
        if (!ok) return
        const { data: created, error } = await supabase
          .from('positions')
          .insert(titles.map(t => ({ title: t, source_chart_id: newChartId })))
          .select()
        if (error) {
          alert(error.message)
          return
        }
        setPositions(prev => [...prev, ...(created || [])])
        for (const p of created || []) byTitle.set(lower(p.title), p)
      }
    }
    const posIdForTitle = t => (t ? byTitle.get(lower(t))?.id || null : null)

    // 2) Insert nodes (links nulled for now), tracking ref → new id.
    const refToId = new Map()
    const insertedNodes = []
    for (const n of tplNodes) {
      const { data: row, error } = await supabase
        .from('org_nodes')
        .insert({
          chart_id: newChartId,
          kind: n.kind,
          label: n.label || '',
          position_id: posIdForTitle(n.position_title),
          employee_id: null,
          heading: n.heading || null,
          bg_color: n.bg_color || null,
          box_style: n.box_style || {},
          container_mode: n.container_mode || null,
          parent_container_id: null,
          attached_to_node_id: null,
          attachment_side: n.attachment_side || null,
          width: n.width || 110,
          height: n.height || 40,
          font_sizes: n.font_sizes || {},
          text_styles: n.text_styles || {},
          x_offset: n.x_offset || 0,
          x: 0,
          y: 0,
          tier: n.tier ?? 0,
          tier_order: n.tier_order ?? 0,
        })
        .select()
        .single()
      if (error) {
        alert(error.message)
        return
      }
      refToId.set(n.ref, row.id)
      insertedNodes.push({ row, src: n })
    }

    // 3) Patch parent_container_id / attached_to_node_id using the ref map.
    for (const { row, src } of insertedNodes) {
      const patch = {}
      if (src.parent_ref && refToId.has(src.parent_ref))
        patch.parent_container_id = refToId.get(src.parent_ref)
      if (src.attached_ref && refToId.has(src.attached_ref))
        patch.attached_to_node_id = refToId.get(src.attached_ref)
      if (Object.keys(patch).length) {
        await supabase.from('org_nodes').update(patch).eq('id', row.id)
        Object.assign(row, patch)
      }
    }

    // 4) Insert edges with remapped endpoints.
    const edgeRows = []
    for (const e of tplEdges) {
      const source_id = refToId.get(e.source_ref)
      const target_id = refToId.get(e.target_ref)
      if (!source_id || !target_id) continue
      const { data: edge } = await supabase
        .from('org_edges')
        .insert({
          chart_id: newChartId,
          source_id,
          target_id,
          relationship: e.relationship || 'reports_to',
          style: e.style || 'solid',
          bus_offset: e.bus_offset ?? null,
        })
        .select()
        .single()
      if (edge) edgeRows.push(edge)
    }

    setNodes(insertedNodes.map(x => x.row))
    setEdges(edgeRows)
  }

  // Template / category CRUD used by the admin Settings modal.
  async function deleteTemplate(id) {
    await supabase.from('org_chart_templates').delete().eq('id', id)
    setTemplates(prev => prev.filter(t => t.id !== id))
  }
  async function renameTemplate(id, name) {
    await supabase.from('org_chart_templates').update({ name }).eq('id', id)
    setTemplates(prev => prev.map(t => (t.id === id ? { ...t, name } : t)))
  }
  async function changeTemplateCategory(id, category_id) {
    await supabase.from('org_chart_templates').update({ category_id }).eq('id', id)
    setTemplates(prev => prev.map(t => (t.id === id ? { ...t, category_id } : t)))
  }
  // Edit any of a template's fields from the row edit modal.
  async function updateTemplate(id, fields) {
    const patch = {
      name: fields.name,
      description: fields.description ?? null,
      category_id: fields.category_id ?? null,
      subcategory_id: fields.subcategory_id ?? null,
    }
    await supabase.from('org_chart_templates').update(patch).eq('id', id)
    setTemplates(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)))
  }
  async function addTemplateCategory(name) {
    const { data } = await supabase
      .from('org_chart_template_categories')
      .insert({ name, created_by: user?.id })
      .select()
      .single()
    if (data) setTemplateCategories(prev => [...prev, data])
  }
  async function renameTemplateCategory(id, name) {
    await supabase.from('org_chart_template_categories').update({ name }).eq('id', id)
    setTemplateCategories(prev => prev.map(c => (c.id === id ? { ...c, name } : c)))
  }
  async function deleteTemplateCategory(id) {
    await supabase.from('org_chart_template_categories').delete().eq('id', id)
    setTemplateCategories(prev => prev.filter(c => c.id !== id))
    // Subcategories cascade-delete in the DB; mirror that locally and detach
    // any templates that pointed at this category or its subcategories.
    const goneSubIds = templateSubcategories.filter(s => s.category_id === id).map(s => s.id)
    setTemplateSubcategories(prev => prev.filter(s => s.category_id !== id))
    setTemplates(prev =>
      prev.map(t =>
        t.category_id === id || goneSubIds.includes(t.subcategory_id)
          ? { ...t, category_id: t.category_id === id ? null : t.category_id, subcategory_id: null }
          : t,
      ),
    )
  }
  async function addTemplateSubcategory(categoryId, name) {
    const { data } = await supabase
      .from('org_chart_template_subcategories')
      .insert({ name, category_id: categoryId, created_by: user?.id })
      .select()
      .single()
    if (data) setTemplateSubcategories(prev => [...prev, data])
  }
  async function renameTemplateSubcategory(id, name) {
    await supabase.from('org_chart_template_subcategories').update({ name }).eq('id', id)
    setTemplateSubcategories(prev => prev.map(s => (s.id === id ? { ...s, name } : s)))
  }
  async function deleteTemplateSubcategory(id) {
    await supabase.from('org_chart_template_subcategories').delete().eq('id', id)
    setTemplateSubcategories(prev => prev.filter(s => s.id !== id))
    setTemplates(prev => prev.map(t => (t.subcategory_id === id ? { ...t, subcategory_id: null } : t)))
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

  // Update the current chart's industry category / sub-sector.
  async function recategorizeChart({ category_id, subcategory_id }) {
    if (!chartId) return
    const { error } = await supabase
      .from('org_charts')
      .update({ category_id, subcategory_id })
      .eq('id', chartId)
    if (error) return alert(error.message)
    setCharts(prev =>
      prev.map(c => (c.id === chartId ? { ...c, category_id, subcategory_id } : c)),
    )
  }

  async function deleteChart() {
    if (!chartId) return
    const current = charts.find(c => c.id === chartId)
    const isMainChart = !!current?.is_default
    const ownedPositions = positions.filter(p => p.source_chart_id === chartId)
    // Build a confirmation that explains what happens to this chart's positions.
    let msg = `Delete chart "${chartName}"? Every item inside will be removed. This cannot be undone.`
    if (isMainChart) {
      msg +=
        `\n\nNote: your MAIN positions list will NOT be deleted — it stays because it is ` +
        `linked to your Statistics. Only the chart itself is removed.`
    } else if (ownedPositions.length) {
      msg +=
        `\n\nThis chart's separate positions list (HR → Positions → "${chartName}", ` +
        `${ownedPositions.length} position${ownedPositions.length !== 1 ? 's' : ''}) will also be deleted.`
    }
    if (!confirm(msg)) return
    setBusy(true)
    try {
      await supabase.from('org_edges').delete().eq('chart_id', chartId)
      await supabase.from('org_nodes').delete().eq('chart_id', chartId)
      await supabase.from('org_node_types').delete().eq('chart_id', chartId)
      // Delete this chart's OWN positions list (and their assignments) — but
      // never the main list (those have no source_chart_id). Done BEFORE the
      // chart delete so the FK doesn't just null them back into Main.
      if (!isMainChart && ownedPositions.length) {
        const ids = ownedPositions.map(p => p.id)
        await supabase.from('employee_positions').delete().in('position_id', ids)
        await supabase.from('positions').delete().eq('source_chart_id', chartId)
        setPositions(prev => prev.filter(p => p.source_chart_id !== chartId))
      }
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
            // Store one tier below the parent so the Level reads correctly and
            // keeps incrementing as junior areas are nested. (Attached areas are
            // positioned by their parent link, not by tier, so this is safe.)
            tier = (parent.tier ?? 0) + 1
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
      // Only row items propagate height. Junior areas (sub-items) and
      // assistants share a tier with their parent/anchor but aren't in the
      // row, so editing their height must NOT resize the main area or row.
      if (
        prevNode &&
        !prevNode.parent_container_id &&
        prevNode.kind !== 'assistant' &&
        (prevNode.height ?? 40) !== newHeight
      ) {
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
      // Attached junior areas form their own shared row: editing one junior's
      // height applies to every junior whose parent is in the same tier.
      if (
        prevNode &&
        prevNode.parent_container_id &&
        (prevNode.height ?? 40) !== newHeight
      ) {
        const parent = nodes.find(n => n.id === prevNode.parent_container_id)
        const parentTier = parent?.tier ?? 0
        const sibIds = nodes
          .filter(n => {
            if (n.id === payload.id || !n.parent_container_id) return false
            const p = nodes.find(x => x.id === n.parent_container_id)
            return (p?.tier ?? 0) === parentTier
          })
          .map(n => n.id)
        if (sibIds.length) {
          setNodes(prev =>
            prev.map(p => (sibIds.includes(p.id) ? { ...p, height: newHeight } : p)),
          )
          await supabase.from('org_nodes').update({ height: newHeight }).in('id', sibIds)
        }
      }

      // Per-row WIDTH: when a position/area width changes, every other object
      // on the same main row adopts that exact width. Junior areas are sized
      // automatically by the layout, so they're not part of width propagation.
      const newWidth = payload.width || 110
      if (
        prevNode &&
        !prevNode.parent_container_id &&
        prevNode.kind !== 'assistant' &&
        (prevNode.width ?? 110) !== newWidth
      ) {
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
          setNodes(prev => prev.map(p => (sibIds.includes(p.id) ? { ...p, width: newWidth } : p)))
          await supabase.from('org_nodes').update({ width: newWidth }).in('id', sibIds)
        }
      }

      // Per-row border THICKNESS: when an area's border thickness changes,
      // every other AREA sharing its row adopts the same thickness — both the
      // main row and, for attached juniors, the shared junior-area row. Each
      // sibling keeps the rest of its box_style (fill, etc.); only borderWidth
      // is overwritten.
      const newThickness = payload.box_style ? payload.box_style.borderWidth : undefined
      if (
        prevNode &&
        Number.isFinite(newThickness) &&
        (prevNode.box_style?.borderWidth) !== newThickness
      ) {
        let sibs
        if (!prevNode.parent_container_id) {
          const rowTier = update.tier ?? prevNode?.tier ?? 0
          sibs = nodes.filter(
            n =>
              n.id !== payload.id &&
              !n.parent_container_id &&
              (n.tier ?? 0) === rowTier,
          )
        } else {
          const parent = nodes.find(n => n.id === prevNode.parent_container_id)
          const parentTier = parent?.tier ?? 0
          sibs = nodes.filter(n => {
            if (n.id === payload.id || !n.parent_container_id) return false
            const p = nodes.find(x => x.id === n.parent_container_id)
            return (p?.tier ?? 0) === parentTier
          })
        }
        sibs = sibs.filter(n => n.kind === 'container')
        if (sibs.length) {
          const updated = sibs.map(n => ({
            id: n.id,
            box_style: { ...(n.box_style || {}), borderWidth: newThickness },
          }))
          setNodes(prev =>
            prev.map(p => {
              const u = updated.find(x => x.id === p.id)
              return u ? { ...p, box_style: u.box_style } : p
            }),
          )
          for (const u of updated) {
            await supabase.from('org_nodes').update({ box_style: u.box_style }).eq('id', u.id)
          }
        }
      }

      // Per-row FONTS & ORIENTATION: changing an area's font sizes, families,
      // bold/italic, or vertical/horizontal title orientation makes every other
      // AREA on the same row match it exactly (main row, and the shared
      // junior-area row for attached juniors).
      const newFontSizes = payload.font_sizes || {}
      const newTextStyles = payload.text_styles || {}
      const fontsChanged =
        JSON.stringify(prevNode?.font_sizes || {}) !== JSON.stringify(newFontSizes) ||
        JSON.stringify(prevNode?.text_styles || {}) !== JSON.stringify(newTextStyles)
      if (prevNode && prevNode.kind === 'container' && fontsChanged) {
        let sibs
        if (!prevNode.parent_container_id) {
          const rowTier = update.tier ?? prevNode?.tier ?? 0
          sibs = nodes.filter(
            n =>
              n.id !== payload.id &&
              !n.parent_container_id &&
              n.kind === 'container' &&
              (n.tier ?? 0) === rowTier,
          )
        } else {
          const parent = nodes.find(n => n.id === prevNode.parent_container_id)
          const parentTier = parent?.tier ?? 0
          sibs = nodes.filter(n => {
            if (n.id === payload.id || !n.parent_container_id || n.kind !== 'container') return false
            const p = nodes.find(x => x.id === n.parent_container_id)
            return (p?.tier ?? 0) === parentTier
          })
        }
        if (sibs.length) {
          const sibIds = sibs.map(s => s.id)
          setNodes(prev =>
            prev.map(p =>
              sibIds.includes(p.id)
                ? { ...p, font_sizes: newFontSizes, text_styles: newTextStyles }
                : p,
            ),
          )
          await supabase
            .from('org_nodes')
            .update({ font_sizes: newFontSizes, text_styles: newTextStyles })
            .in('id', sibIds)
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
      setContextMenu(null)
      // In edit mode a plain click opens the edit detail modal directly. In
      // view mode it opens the read-only expanded info popup. (The pencil icon
      // still opens the context menu for the other actions.)
      if (editMode) {
        const n = nodes.find(x => x.id === nodeId)
        if (n) setDialog({ mode: 'edit', existing: n })
      } else {
        setInfoNodeId(nodeId)
      }
    },
    [changeMode, connectMode, connectSource, nodes, chartId, editMode],
  )

  // Pencil-icon click (edit mode only): open the item's edit/context menu.
  const onNodeEditIconClick = useCallback((nodeId, screenRect) => {
    setSelectedNodeId(nodeId)
    setSelectedEdgeId(null)
    setInfoNodeId(null)
    if (screenRect) setContextMenu({ nodeId, screenRect })
  }, [])

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
                              onChange={() => setPendingDefaultChart(c)}
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
                      onClick={() => {
                        setChartPickerOpen(false)
                        setShowNewChartModal(true)
                      }}
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
            <button
              type="button"
              title="Chart options"
              onClick={e =>
                setChartNameMenu({ anchorRect: e.currentTarget.getBoundingClientRect() })
              }
              className="text-slate-400 hover:text-slate-700 border border-slate-200 rounded-md px-1.5 py-0.5 text-xs leading-none"
            >
              ✎
            </button>
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
          {isAdmin && (
            <button
              type="button"
              title="Template settings"
              onClick={() => setShowTemplateSettings(true)}
              className="text-slate-500 hover:text-slate-800 text-base px-2 py-1 rounded-md hover:bg-slate-100"
            >
              ⚙️
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

      {showTemplateSettings && isAdmin ? (
        <TemplatesSettingsView
          templates={templates}
          categories={templateCategories}
          subcategories={templateSubcategories}
          onClose={() => setShowTemplateSettings(false)}
          onDeleteTemplate={deleteTemplate}
          onUpdateTemplate={updateTemplate}
          onAddCategory={addTemplateCategory}
          onRenameCategory={renameTemplateCategory}
          onDeleteCategory={deleteTemplateCategory}
          onAddSubcategory={addTemplateSubcategory}
          onRenameSubcategory={renameTemplateSubcategory}
          onDeleteSubcategory={deleteTemplateSubcategory}
        />
      ) : (
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
            onNodeEditIconClick={onNodeEditIconClick}
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
              onClick={() => setShowNewChartModal(true)}
              className="text-lg px-8 py-4 rounded-xl text-white font-semibold shadow-md hover:opacity-90"
              style={{ background: FG }}
            >
              + Chart
            </button>
          </div>
        )}
      </div>
      )}

      {editMode && contextMenu && selectedNode &&
        createPortal(
          <ItemContextMenu
            screenRect={contextMenu.screenRect}
            nodeId={contextMenu.nodeId}
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

      {infoNodeId != null &&
        (() => {
          const infoNode = nodes.find(n => n.id === infoNodeId)
          if (!infoNode) return null
          return createPortal(
            <ItemInfoModal
              node={infoNode}
              nodes={nodes}
              resolveNodeHolder={resolveNodeHolder}
              onClose={() => setInfoNodeId(null)}
            />,
            document.body,
          )
        })()}

      {showNewChartModal && (
        <NewChartModal
          templates={templates}
          categories={templateCategories}
          subcategories={templateSubcategories}
          onClose={() => setShowNewChartModal(false)}
          onCreate={handleCreateChart}
        />
      )}

      {wizardName != null &&
        createPortal(
          <OrgChartWizard
            initialName={wizardName}
            positionTitles={positions.map(p => p.title).filter(Boolean)}
            priorExamples={wizardExamples}
            industries={templateCategories}
            subcategories={templateSubcategories}
            onClose={() => setWizardName(null)}
            onComplete={handleWizardComplete}
          />,
          document.body,
        )}

      {showRenameModal && (
        <RenameChartModal
          initialName={chartName}
          onClose={() => setShowRenameModal(false)}
          onSave={name => {
            setShowRenameModal(false)
            renameChart(name)
          }}
        />
      )}

      {showRecategorize &&
        (() => {
          const c = charts.find(x => x.id === chartId)
          return (
            <RecategorizeChartModal
              initialCategoryId={c?.category_id ?? null}
              initialSubcategoryId={c?.subcategory_id ?? null}
              categories={templateCategories}
              subcategories={templateSubcategories}
              onClose={() => setShowRecategorize(false)}
              onSave={fields => {
                setShowRecategorize(false)
                recategorizeChart(fields)
              }}
            />
          )
        })()}

      {showCreateTemplateModal && (
        <CreateTemplateModal
          categories={templateCategories}
          subcategories={templateSubcategories}
          onClose={() => setShowCreateTemplateModal(false)}
          onSave={createTemplateFromCurrentChart}
        />
      )}

      {chartNameMenu &&
        createPortal(
          <ChartNameMenu
            anchorRect={chartNameMenu.anchorRect}
            onClose={() => setChartNameMenu(null)}
            onRename={() => {
              setChartNameMenu(null)
              setShowRenameModal(true)
            }}
            onRecategorize={() => {
              setChartNameMenu(null)
              setShowRecategorize(true)
            }}
            onCreateTemplate={() => {
              setChartNameMenu(null)
              setShowCreateTemplateModal(true)
            }}
            onDelete={() => {
              setChartNameMenu(null)
              deleteChart()
            }}
          />,
          document.body,
        )}

      {pendingDefaultChart &&
        createPortal(
          <div
            className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center p-4"
            onClick={() => setPendingDefaultChart(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="px-5 py-3 bg-amber-500">
                <h2 className="text-base font-bold text-white">⚠️ Change default chart?</h2>
              </div>
              <div className="px-5 py-4 text-sm text-slate-700 space-y-2">
                <p>
                  When you change the default chart, you must ensure that <b>all positions on
                  the new default chart exist in the Human Resources positions table.</b>
                </p>
                <p>
                  Any positions you create to accommodate the new chart may duplicate the
                  function of positions already in the table.
                </p>
                <p className="font-semibold">
                  Are you sure you want to make “{pendingDefaultChart.name}” the default chart?
                </p>
              </div>
              <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPendingDefaultChart(null)}
                  className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const c = pendingDefaultChart
                    setPendingDefaultChart(null)
                    setDefaultChart(c)
                  }}
                  className="px-3 py-1.5 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-md"
                >
                  Change
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

    </div>
  )
}

function ItemContextMenu({
  screenRect,
  nodeId,
  kind,
  onClose,
  onConnect,
  onAddJuniorPosition,
  onAddJuniorArea,
  onAddAssistant,
  onChangeSenior,
  onChangeChild,
  onChangeConnection,
}) {
  const menuWidth = 180
  const margin = 8
  const menuRef = useRef(null)
  const [pos, setPos] = useState({ top: screenRect.top, left: screenRect.right + margin })

  // Keep the menu pinned to its item: recompute position from the item's live
  // on-screen rect whenever the page/canvas scrolls or resizes (so the menu
  // tracks the item), and clamp it vertically so a menu near the bottom of a
  // tall chart is nudged up to stay fully on screen.
  useLayoutEffect(() => {
    const reposition = () => {
      let rect = screenRect
      if (nodeId != null) {
        const el = document.querySelector(`[data-node-id="${nodeId}"]`)
        if (el) rect = el.getBoundingClientRect()
      }
      let left = rect.right + margin
      if (left + menuWidth > window.innerWidth - 8) {
        left = Math.max(8, rect.left - menuWidth - margin)
      }
      const h = menuRef.current?.offsetHeight || 260
      let top = rect.top
      if (top + h > window.innerHeight - 8) top = window.innerHeight - h - 8
      if (top < 8) top = 8
      setPos({ top, left })
    }
    reposition()
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [nodeId, screenRect])

  return (
    <div
      ref={menuRef}
      className="fixed z-[1000] bg-white border border-slate-200 shadow-xl rounded-lg py-1 text-sm"
      style={{ top: pos.top, left: pos.left, width: menuWidth }}
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
      <MenuItem label="New Item Connection" onClick={onConnect} />
      <MenuItem label="Change Connection" onClick={onChangeConnection} />
      <MenuItem label="Add Junior Position" onClick={onAddJuniorPosition} />
      <MenuItem label="Add Junior Area" onClick={onAddJuniorArea} />
      {kind !== 'container' && <MenuItem label="Add Assistant" onClick={onAddAssistant} />}
      <div className="border-t border-slate-100 my-1" />
      <MenuItem label="Change Senior" onClick={onChangeSenior} />
      <MenuItem label="Change Junior" onClick={onChangeChild} />
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
