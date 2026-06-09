// Modal dialog for adding or editing a node ("Item" in the UI).
// Switches form based on selected kind. Returns the new/updated payload
// via onSubmit({...}).
//
// Kinds (DB → UI label):
//   position  → "Org Position"
//   container → "Org Chart Area"
//   custom    → "Custom Item"
//
// Props:
//   - mode: 'new' | 'child' | 'senior' | 'edit'
//   - parentId / seniorOf  (used by child / senior modes)
//   - existing             (used by edit mode; pre-fills form)
//   - positions            ([{ id, title }])
//   - employeesByPosition  (Map<position_id, [{ id, displayName, active }]>)
//   - onSubmit(payload), onClose

import { useState, useMemo, useEffect } from 'react'
import { CONTAINER_COLORS } from './palette.js'
import ColorLibraryPicker from '../ColorLibraryPicker.jsx'

const KIND_LABEL = {
  position: 'Org Position',
  container: 'Org Chart Area',
  custom: 'Custom Item',
  assistant: 'Assistant',
}

// Shorter labels used in modal titles ("Add Position", "Edit Area", …).
const TITLE_LABEL = {
  position: 'Position',
  container: 'Area',
  custom: 'Item',
  assistant: 'Assistant',
}

export default function AddNodeDialog({
  mode,
  parentId,
  seniorOf,
  fixedKind,
  anchorId,
  existing,
  positions,
  employeesByPosition,
  allItems,
  onSubmit,
  onClose,
  onConnect,
  onDelete,
  onAddSenior,
  onAddChild,
  onChangeSenior,
  onChangeChild,
  onChangeConnection,
}) {
  const isEdit = mode === 'edit' && existing
  const [kind, setKind] = useState(isEdit ? existing.kind || 'custom' : fixedKind || 'position')
  // The kind picker only shows for Junior/Senior add flows that DON'T come
  // with a fixedKind. Menu items like "Add Junior Position" pass a fixedKind
  // so they skip the picker; top-level adds and edits also skip it.
  const showKindPicker = (mode === 'child' || mode === 'senior') && !fixedKind

  const [label, setLabel] = useState(isEdit ? existing.label || '' : '')

  const [positionId, setPositionId] = useState(
    isEdit && existing.position_id ? String(existing.position_id) : '',
  )
  const [employeeId, setEmployeeId] = useState(
    isEdit && existing.employee_id ? String(existing.employee_id) : '',
  )

  // A Position is either Independent (top-level) or Contained in an Area (drawn
  // inside that area's box). "Contained" = the position's parent_container_id
  // points to the chosen area.
  const areaOptions = (allItems || []).filter(n => n.kind === 'container')
  // Group the picker by row (tier). Each group is headed by the common first
  // word of that row's Area Descriptions (e.g. "Divisions", "Depts"), or the
  // level number when the row's areas don't share a common title.
  const areaGroups = (() => {
    const byTier = new Map()
    for (const a of areaOptions) {
      const t = Number.isInteger(a.tier) ? a.tier : 0
      if (!byTier.has(t)) byTier.set(t, [])
      byTier.get(t).push(a)
    }
    const groupLabel = (areas, tier) => {
      const words = areas
        .map(a => (a.label || '').trim().split(/\s+/)[0].replace(/[^A-Za-z]/g, ''))
        .filter(Boolean)
      const same = words.length && words.every(w => w.toLowerCase() === words[0].toLowerCase())
      if (same) {
        let w = words[0].charAt(0).toUpperCase() + words[0].slice(1)
        if (!/s$/i.test(w)) w += 's'
        return `${w} (Level ${tier + 1})`
      }
      return `Level ${tier + 1}`
    }
    return [...byTier.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([tier, areas]) => ({
        tier,
        label: groupLabel(areas, tier),
        // Sort each section alphanumerically by Area Description (e.g. Dept. 1,
        // Dept. 2, … Dept. 10), numeric-aware so 10 follows 2.
        areas: [...areas].sort((x, y) =>
          String(x.label || '').localeCompare(String(y.label || ''), undefined, {
            numeric: true,
            sensitivity: 'base',
          }),
        ),
      }))
  })()
  const [posPlacement, setPosPlacement] = useState(
    isEdit && existing.parent_container_id ? 'contained' : 'independent',
  )
  const [containedAreaId, setContainedAreaId] = useState(
    isEdit && existing.parent_container_id ? String(existing.parent_container_id) : '',
  )
  // For a contained position whose HR position has multiple assigned employees:
  // optionally add one box per chosen employee.
  const [multiContained, setMultiContained] = useState(false)
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([])

  const [heading, setHeading] = useState(isEdit ? existing.heading || '' : '')
  // A new junior area inherits its parent (senior) area's color by default.
  const parentArea =
    !isEdit && mode === 'child' && parentId
      ? (allItems || []).find(n => n.id === parentId && n.kind === 'container')
      : null
  const [bgColor, setBgColor] = useState(
    isEdit && existing.bg_color
      ? existing.bg_color
      : parentArea?.bg_color || CONTAINER_COLORS[0].bg,
  )
  // Area fill style: 'solid' (colored fill) or 'border' (white fill + colored
  // border of borderWidth). Defaults to border.
  const [boxStyle, setBoxStyle] = useState(
    isEdit && existing.box_style && Object.keys(existing.box_style).length
      ? existing.box_style
      : parentArea?.box_style && Object.keys(parentArea.box_style).length
        ? { ...parentArea.box_style }
        : { fill: 'border', borderWidth: 2 },
  )
  const [containerMode, setContainerMode] = useState(
    isEdit ? existing.container_mode || 'independent' : 'independent',
  )
  // For junior Areas: 'direct' = contained column under the parent area,
  // 'arrow' = a separate child connected by a reports-to arrow.
  const [attachMode, setAttachMode] = useState('direct')

  // Per-field font sizes in points. Keys: 'label' (area name), 'title'
  // (position title), 'name' (employee name). Each defaults to that field's
  // base size until the user types a different number.
  const [fontSizes, setFontSizes] = useState(
    isEdit && existing.font_sizes ? existing.font_sizes : {},
  )
  // Per-field font family / bold / italic, e.g. { label: { family, bold, italic } }.
  const [textStyles, setTextStyles] = useState(
    isEdit && existing.text_styles ? existing.text_styles : {},
  )
  // Combined inline style controls for one displayed-text field: font family,
  // bold, italic and size. `base` is the field's default point size.
  const fieldStyle = (field, base, defFamily = 'sans', defBold = false, defItalic = false) => {
    const st = textStyles[field] || {}
    const bold = st.bold ?? defBold
    const italic = st.italic ?? defItalic
    const patch = p => setTextStyles(prev => ({ ...prev, [field]: { ...(prev[field] || {}), ...p } }))
    const toggleCls = on =>
      `px-1.5 py-0.5 rounded border text-[11px] ${
        on ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold' : 'border-gray-300 text-gray-500'
      }`
    return (
      <div className="flex items-center gap-1 shrink-0">
        <select
          value={st.family || defFamily}
          onChange={e => patch({ family: e.target.value })}
          title="Font type"
          className="border border-gray-300 rounded-md px-1 py-0.5 text-[11px] text-gray-600 bg-white"
        >
          <option value="sans">Sans</option>
          <option value="serif">Serif</option>
          <option value="mono">Mono</option>
          <option value="arial">Arial</option>
          <option value="helvetica">Helvetica</option>
          <option value="verdana">Verdana</option>
          <option value="tahoma">Tahoma</option>
          <option value="trebuchet">Trebuchet</option>
          <option value="calibri">Calibri</option>
          <option value="times">Times New Roman</option>
          <option value="georgia">Georgia</option>
          <option value="garamond">Garamond</option>
          <option value="palatino">Palatino</option>
          <option value="courier">Courier</option>
          <option value="comic">Comic Sans</option>
          <option value="impact">Impact</option>
        </select>
        <button type="button" onClick={() => patch({ bold: !bold })} title="Bold" className={toggleCls(bold)}>
          B
        </button>
        <button
          type="button"
          onClick={() => patch({ italic: !italic })}
          title="Italic"
          className={`${toggleCls(italic)} italic`}
        >
          I
        </button>
        <input
          type="number"
          min={6}
          max={48}
          value={fontSizes[field] ?? base}
          onChange={e =>
            setFontSizes(prev => ({
              ...prev,
              [field]: e.target.value === '' ? '' : Number(e.target.value),
            }))
          }
          title="Font size (points)"
          className="no-spin w-14 border border-gray-300 rounded-md px-1 py-0.5 text-[11px] text-gray-600 bg-white"
        />
      </div>
    )
  }
  // Horizontal/Vertical toggle for an area title. Choosing vertical for a
  // junior (attached) area bumps its height to 180 so the rotated text fits.
  const orientToggle = field => {
    const vert = !!(textStyles[field] && textStyles[field].vertical)
    return (
      <button
        type="button"
        onClick={() => {
          const next = !vert
          setTextStyles(prev => ({ ...prev, [field]: { ...(prev[field] || {}), vertical: next } }))
          // Junior (attached) areas need extra height for vertical text.
          const isJuniorArea =
            kind === 'container' && (mode === 'child' || !!existing?.parent_container_id)
          if (isJuniorArea) {
            if (next && (height === 90 || height === '')) setHeight(180)
            else if (!next && height === 180) {
              const other = field === 'label' ? 'heading' : 'label'
              if (!(textStyles[other] && textStyles[other].vertical)) setHeight(90)
            }
          }
        }}
        title="Display this title vertically"
        className={`px-1.5 py-0.5 rounded border text-[11px] shrink-0 ${
          vert
            ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
            : 'border-gray-300 text-gray-500'
        }`}
      >
        {vert ? 'Vertical' : 'Horizontal'}
      </button>
    )
  }
  // Default box size by kind: areas 210×90, assistants 130×44, positions 110×40.
  const sizeKind = isEdit ? existing?.kind : fixedKind
  const defaultSize =
    sizeKind === 'container'
      ? { w: 210, h: 90 }
      : sizeKind === 'assistant'
        ? { w: 130, h: 44 }
        : { w: 110, h: 40 }
  const [width, setWidth] = useState(isEdit ? existing.width || defaultSize.w : defaultSize.w)
  const [height, setHeight] = useState(isEdit ? existing.height || defaultSize.h : defaultSize.h)
  // Assistant kind state
  const [attachedToNodeId, setAttachedToNodeId] = useState(
    isEdit && existing.attached_to_node_id
      ? existing.attached_to_node_id
      : anchorId || '',
  )
  const [attachmentSide, setAttachmentSide] = useState(
    isEdit ? existing.attachment_side || 'right' : 'right',
  )

  // Level (row) the item sits on. Stored 0-based as `tier`; shown 1-based.
  // New items default to a sensible level based on their parent/senior.
  const [tier, setTier] = useState(() => {
    if (isEdit) return existing.tier ?? 0
    if (mode === 'child' && parentId) {
      const p = (allItems || []).find(n => n.id === parentId)
      return (p?.tier ?? 0) + 1
    }
    if (mode === 'senior' && seniorOf) {
      const r = (allItems || []).find(n => n.id === seniorOf)
      return Math.max(0, (r?.tier ?? 0) - 1)
    }
    return 0
  })

  // When adding a NEW item to a row that already has items of the same kind,
  // the modal defaults to that row's existing parameters — font sizes /
  // families / bold / italic / orientation, box width & height, and (for
  // areas) solid-vs-border fill and border thickness. We pick a representative
  // row-mate as the template; for a junior area with no sibling juniors yet we
  // fall back to its parent area (so it still inherits the parent's look).
  const newKind = fixedKind || kind
  const rowTemplate = useMemo(() => {
    if (isEdit) return null
    const items = allItems || []
    if (mode === 'child' && parentId) {
      const parent = items.find(n => n.id === parentId)
      const pTier = parent?.tier ?? 0
      const sibling = items.find(n => {
        if (!n.parent_container_id || n.kind !== newKind) return false
        const par = items.find(x => x.id === n.parent_container_id)
        return (par?.tier ?? 0) === pTier
      })
      return sibling || (parent?.kind === 'container' ? parent : null)
    }
    // Top-level add: a same-kind item already sitting on the chosen row.
    return (
      items.find(
        n => !n.parent_container_id && n.kind === newKind && (n.tier ?? 0) === tier,
      ) || null
    )
  }, [isEdit, allItems, mode, parentId, newKind, tier])

  // Apply the row template's styling to the new item (style only — never its
  // label / position / employee). Re-runs if the chosen row changes (e.g. the
  // user edits the Level field), so the defaults track the target row.
  useEffect(() => {
    if (isEdit || !rowTemplate) return
    if (rowTemplate.font_sizes) setFontSizes(rowTemplate.font_sizes)
    if (rowTemplate.text_styles) setTextStyles(rowTemplate.text_styles)
    if (rowTemplate.width) setWidth(rowTemplate.width)
    if (rowTemplate.height) setHeight(rowTemplate.height)
    // Coloring for a junior area is always drawn from its parent (handled by the
    // parentArea-based initial state), so we DON'T copy the row's bg_color in
    // child mode — only top-level new areas adopt the row's color.
    if (rowTemplate.bg_color && mode !== 'child') setBgColor(rowTemplate.bg_color)
    if (rowTemplate.box_style && Object.keys(rowTemplate.box_style).length) {
      setBoxStyle({ ...rowTemplate.box_style })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowTemplate?.id])

  function handleSubmit() {
    const base = {
      kind,
      parentId: mode === 'child' ? parentId : null,
      seniorOf: mode === 'senior' ? seniorOf : null,
      isEdit,
      id: existing?.id,
      tier,
      font_sizes: fontSizes,
      text_styles: textStyles,
    }
    if (kind === 'position') {
      if (!positionId) return alert('Pick a position.')
      if (posPlacement === 'contained' && !containedAreaId)
        return alert('Pick an area to contain this position in.')
      const p = positions.find(x => String(x.id) === String(positionId))
      // Resolve the real id types from the source objects (node ids and
      // employee ids may not be plain numbers — never coerce with Number()).
      const containedArea =
        posPlacement === 'contained' && containedAreaId
          ? areaOptions.find(a => String(a.id) === String(containedAreaId))
          : null
      const empCandidates = employeesByPosition?.get(Number(positionId)) || []
      const chosenEmpIds =
        posPlacement === 'contained' && multiContained && selectedEmployeeIds.length
          ? empCandidates
              .filter(e => selectedEmployeeIds.includes(String(e.id)))
              .map(e => e.id)
          : null
      onSubmit({
        ...base,
        position_id: Number(positionId),
        employee_id: employeeId || null,
        label: p?.title || '',
        width: width || 110,
        height: height || 40,
        contained_in_area_id: containedArea ? containedArea.id : null,
        employee_ids: chosenEmpIds,
      })
    } else if (kind === 'container') {
      onSubmit({
        ...base,
        label: label.trim() || 'Untitled',
        heading: heading.trim() || null,
        bg_color: bgColor,
        box_style: boxStyle,
        container_mode: containerMode,
        position_id: positionId ? Number(positionId) : null,
        employee_id: employeeId || null,
        width,
        height,
        attachDirect: mode === 'child' && attachMode === 'direct',
      })
    } else if (kind === 'assistant') {
      if (!attachedToNodeId) return alert('Pick an item to assist.')
      const p = positionId
        ? positions.find(x => String(x.id) === String(positionId))
        : null
      onSubmit({
        ...base,
        label: p?.title || label.trim() || 'Assistant',
        position_id: positionId ? Number(positionId) : null,
        employee_id: employeeId || null,
        attached_to_node_id: attachedToNodeId,
        attachment_side: attachmentSide,
        width: 130,
        height: 44,
      })
    } else {
      onSubmit({
        ...base,
        label: label.trim() || 'Untitled',
        width: 110,
        height: 40,
      })
    }
  }

  // Re-used: position-in-charge picker (used by both position and
  // container kinds). Returns the form rows.
  function renderPositionPicker(showAutoUnassigned = true) {
    const candidates = employeesByPosition?.get(Number(positionId)) || []
    if (!positionId) {
      return showAutoUnassigned ? (
        <p className="text-xs text-gray-500">
          Pick a position; the assigned employee fills in automatically.
        </p>
      ) : null
    }
    if (candidates.length === 0) {
      return (
        <p className="text-xs text-amber-600">
          No employees are currently assigned to this position. The card will
          show "Held from Above".
        </p>
      )
    }
    if (candidates.length === 1) {
      return (
        <p className="text-xs text-gray-500">
          Holder: <span className="font-medium text-gray-700">
            {candidates[0].displayName}
          </span>
        </p>
      )
    }
    return (
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Employee to show ({candidates.length} assigned)
        </label>
        <select
          value={employeeId}
          onChange={e => setEmployeeId(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
        >
          <option value="">— Auto (first active) —</option>
          {candidates.map(c => (
            <option key={c.id} value={c.id}>
              {c.displayName}
              {c.active ? '' : ' (inactive)'}
            </option>
          ))}
        </select>
      </div>
    )
  }

  // Auto-resolved holder name for the chosen position (read-only display),
  // mirroring how the chart picks the holder.
  const holderName = (() => {
    if (!positionId) return ''
    const candidates = employeesByPosition?.get(Number(positionId)) || []
    const chosen = employeeId
      ? candidates.find(c => String(c.id) === String(employeeId))
      : null
    return (
      (chosen || candidates.find(c => c.active) || candidates[0])?.displayName ||
      'Held from Above'
    )
  })()

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-5 max-h-[90vh] overflow-y-auto">
        <h3 className="text-base font-semibold mb-3">
          {mode === 'edit'
            ? `Edit ${TITLE_LABEL[kind] || 'Item'}`
            : mode === 'child'
              ? fixedKind
                ? `Add Junior ${TITLE_LABEL[kind] || 'Item'}`
                : 'Add Junior Item'
              : mode === 'senior'
                ? 'Add Senior Item'
                : `Add ${TITLE_LABEL[kind] || 'Item'}`}
        </h3>

        {showKindPicker && (
          <div className="flex gap-2 mb-4 text-sm">
            {['position', 'container', 'assistant'].map(k => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`flex-1 py-1.5 rounded-md border ${
                  kind === k
                    ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                }`}
              >
                {KIND_LABEL[k]}
              </button>
            ))}
          </div>
        )}

        {(kind === 'position' || kind === 'container') && (
          <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-700">
            Note: changes to fonts (size, family, bold/italic, and vertical/horizontal
            orientation), border thickness, and box height and width apply to the whole
            level — every item on the same row is made to match.
          </div>
        )}

        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-500 mb-1">Level (row)</label>
          <input
            type="number"
            min={1}
            value={tier + 1}
            onChange={e => setTier(Math.max(0, (Number(e.target.value) || 1) - 1))}
            className="no-spin w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
          />
          <p className="mt-1 text-[11px] leading-snug text-gray-400">
            Level 1 is the top row. Items can only be dragged left and right — change the level here to move an item up or down.
          </p>
        </div>

        {kind === 'position' && (
          <div>
            {/* Independent vs Contained-in-Area placement. */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">Placement</label>
              <div className="flex gap-2">
                {[
                  { v: 'independent', label: 'Independent Position' },
                  { v: 'contained', label: 'Contained in Area' },
                ].map(opt => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setPosPlacement(opt.v)}
                    className={`flex-1 px-3 py-1.5 rounded-md text-sm border ${
                      posPlacement === opt.v
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-medium'
                        : 'border-gray-300 text-gray-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {posPlacement === 'contained' && (
                <div className="mt-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Area to contain this position in
                  </label>
                  <select
                    value={containedAreaId}
                    onChange={e => setContainedAreaId(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                  >
                    <option value="">— Pick an area —</option>
                    {areaGroups.map(g => (
                      <optgroup key={g.tier} label={g.label}>
                        {g.areas.map(a => {
                          const title = (a.label || '').trim() // Area Description, e.g. "Dept. 1"
                          const name = (a.heading || '').trim() // Area Name, e.g. "Communications"
                          return (
                            <option key={a.id} value={a.id}>
                              {title && name ? `${title} — ${name}` : name || title || '(untitled area)'}
                            </option>
                          )
                        })}
                      </optgroup>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] leading-snug text-gray-400">
                    The position will appear inside the selected area's box.
                  </p>
                </div>
              )}
            </div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Position</label>
            <div className="flex items-center gap-2">
              <select
                value={positionId}
                onChange={e => {
                  setPositionId(e.target.value)
                  setEmployeeId('')
                }}
                className="flex-1 min-w-0 border border-gray-300 rounded-md px-2 py-1.5 text-sm"
              >
                <option value="">— Pick a position —</option>
                {positions.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
              {fieldStyle('title', 12, 'palatino')}
            </div>
            <p className="text-[11px] text-gray-500 mt-2">
              Don't see the position you need?{' '}
              <a
                href="/hr?addPosition=1"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 font-medium hover:underline"
              >
                Add It In the HR Module
              </a>
            </p>
            <div className="mt-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Holder</label>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={positionId ? holderName : ''}
                  placeholder="Auto from position"
                  className="flex-1 min-w-0 border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-gray-50 text-gray-600"
                />
                {fieldStyle('name', 10, 'sans')}
              </div>
            </div>
            {/* Contained positions can be added once per assigned employee when
                the HR position has more than one person in it. */}
            {posPlacement === 'contained' && positionId && (() => {
              const emps = employeesByPosition?.get(Number(positionId)) || []
              if (emps.length < 2) return null
              return (
                <div className="mt-3 rounded-md border border-gray-200 p-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={multiContained}
                      onChange={e => {
                        setMultiContained(e.target.checked)
                        if (!e.target.checked) setSelectedEmployeeIds([])
                      }}
                    />
                    Add more than one of this position
                  </label>
                  {multiContained && (
                    <div className="mt-2">
                      <p className="text-[11px] text-gray-500 mb-1">
                        Pick the employees to add — one box is created for each:
                      </p>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {emps.map(emp => {
                          const checked = selectedEmployeeIds.includes(String(emp.id))
                          return (
                            <label key={emp.id} className="flex items-center gap-2 text-sm text-gray-700">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={e =>
                                  setSelectedEmployeeIds(prev =>
                                    e.target.checked
                                      ? [...prev, String(emp.id)]
                                      : prev.filter(x => x !== String(emp.id)),
                                  )
                                }
                              />
                              {emp.displayName}
                              {emp.active ? '' : ' (inactive)'}
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Box Width</label>
                <input
                  type="number"
                  value={width}
                  onChange={e => setWidth(e.target.value === '' ? '' : Number(e.target.value))}
                  className="no-spin w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                  min={60}
                  max={600}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Box Height</label>
                <input
                  type="number"
                  value={height}
                  onChange={e => setHeight(e.target.value === '' ? '' : Number(e.target.value))}
                  className="no-spin w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                  min={30}
                  max={300}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setWidth(110)
                setHeight(40)
              }}
              className="text-xs text-blue-600 hover:underline mt-1"
            >
              Reset to default Position size (110 × 40)
            </button>
          </div>
        )}

        {kind === 'container' && (
          <div className="space-y-3">
            {mode === 'child' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  How to attach this junior area
                </label>
                <div className="flex gap-2">
                  {[
                    { v: 'direct', label: 'Attach directly' },
                    { v: 'arrow', label: 'Connection arrow' },
                  ].map(opt => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setAttachMode(opt.v)}
                      className={`flex-1 py-1.5 rounded-md border text-xs ${
                        attachMode === opt.v
                          ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-gray-400">
                  {attachMode === 'direct'
                    ? 'Sits as a column contained under the parent area, centered (shifts as more are added).'
                    : 'Appears as a separate area linked to the parent with a connection arrow.'}
                </p>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Area Description
              </label>
              <div className="flex items-center gap-2">
                <input
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder="Department"
                  className="flex-1 min-w-0 border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                />
                {fieldStyle('label', 12, 'arial')}
                {orientToggle('label')}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Area Name (optional)
              </label>
              <div className="flex items-center gap-2">
                <input
                  value={heading}
                  onChange={e => setHeading(e.target.value)}
                  placeholder="Operations"
                  className="flex-1 min-w-0 border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                />
                {fieldStyle('heading', 14, 'sans', true)}
                {orientToggle('heading')}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Position in charge (optional)
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={positionId}
                  onChange={e => {
                    setPositionId(e.target.value)
                    setEmployeeId('')
                  }}
                  className="flex-1 min-w-0 border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                >
                  <option value="">— None —</option>
                  {positions.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
                {fieldStyle('title', 10, 'sans')}
              </div>
            </div>
            {positionId && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Holder</label>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={holderName}
                    placeholder="Auto from position"
                    className="flex-1 min-w-0 border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-gray-50 text-gray-600"
                  />
                  {fieldStyle('name', 10, 'sans')}
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Color</label>
              <div className="flex items-center gap-2">
                {bgColor !== 'none' && (
                  <ColorLibraryPicker value={bgColor} onChange={setBgColor} />
                )}
                <button
                  type="button"
                  onClick={() =>
                    setBgColor(bgColor === 'none' ? CONTAINER_COLORS[0].bg : 'none')
                  }
                  className={`px-2 py-1.5 rounded-md border text-xs ${
                    bgColor === 'none'
                      ? 'border-gray-800 bg-white text-gray-800 font-medium'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  {bgColor === 'none' ? '✓ No color (outline only)' : 'No color'}
                </button>
              </div>
              {bgColor === 'none' && (
                <p className="mt-1 text-[11px] text-gray-400">
                  The area shows as a black outline with no fill.
                </p>
              )}
            </div>
            {bgColor !== 'none' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Fill style</label>
                <div className="flex items-center gap-2">
                  {[
                    { v: 'solid', label: 'Solid' },
                    { v: 'border', label: 'Border' },
                  ].map(o => (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => setBoxStyle(s => ({ ...s, fill: o.v }))}
                      className={`flex-1 py-1.5 rounded-md border text-xs ${
                        boxStyle.fill === o.v
                          ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                  {boxStyle.fill === 'border' && (
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[11px] text-gray-500">Thickness</span>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={boxStyle.borderWidth ?? 2}
                        onChange={e =>
                          setBoxStyle(s => ({
                            ...s,
                            borderWidth: e.target.value === '' ? '' : Number(e.target.value),
                          }))
                        }
                        className="no-spin w-14 border border-gray-300 rounded-md px-1 py-0.5 text-[11px] text-gray-600 bg-white"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Box Width</label>
                <input
                  type="number"
                  value={width}
                  onChange={e => setWidth(e.target.value === '' ? '' : Number(e.target.value))}
                  className="no-spin w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                  min={80}
                  max={1200}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Box Height</label>
                <input
                  type="number"
                  value={height}
                  onChange={e => setHeight(e.target.value === '' ? '' : Number(e.target.value))}
                  className="no-spin w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                  min={30}
                  max={600}
                />
              </div>
            </div>
          </div>
        )}

        {kind === 'custom' && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            />
          </div>
        )}

        {kind === 'assistant' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Item to assist
              </label>
              <select
                value={attachedToNodeId}
                onChange={e => setAttachedToNodeId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
              >
                <option value="">— Pick an item —</option>
                {(allItems || [])
                  .filter(it => it.kind !== 'assistant' && it.id !== existing?.id)
                  .map(it => (
                    <option key={it.id} value={it.id}>
                      {it.label || '(untitled)'}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Side</label>
              <div className="flex gap-2">
                {['left', 'right'].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setAttachmentSide(s)}
                    className={`flex-1 py-1.5 rounded-md border text-sm ${
                      attachmentSide === s
                        ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    {s[0].toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Position (optional)
              </label>
              <select
                value={positionId}
                onChange={e => {
                  setPositionId(e.target.value)
                  setEmployeeId('')
                }}
                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm mb-2"
              >
                <option value="">— None (use custom title) —</option>
                {positions.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
              {positionId && renderPositionPicker(false)}
            </div>
            {!positionId && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                <input
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder="Assistant to…"
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                />
              </div>
            )}
          </div>
        )}

        <div className="flex items-center mt-5">
          {isEdit && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(existing)}
              className="px-3 py-1.5 text-sm text-red-600 border border-red-200 hover:bg-red-50 rounded-md"
            >
              Delete
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md">Cancel</button>
            <button type="button" onClick={handleSubmit} className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md">{isEdit ? 'Save' : 'Add'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
