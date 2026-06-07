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

import { useState } from 'react'
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

  const [heading, setHeading] = useState(isEdit ? existing.heading || '' : '')
  const [bgColor, setBgColor] = useState(
    isEdit && existing.bg_color ? existing.bg_color : CONTAINER_COLORS[0].bg,
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
  const fieldStyle = (field, base) => {
    const st = textStyles[field] || {}
    const patch = p => setTextStyles(prev => ({ ...prev, [field]: { ...(prev[field] || {}), ...p } }))
    const toggleCls = on =>
      `px-1.5 py-0.5 rounded border text-[11px] ${
        on ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold' : 'border-gray-300 text-gray-500'
      }`
    return (
      <div className="flex items-center gap-1 shrink-0">
        <select
          value={st.family || 'sans'}
          onChange={e => patch({ family: e.target.value })}
          title="Font type"
          className="border border-gray-300 rounded-md px-1 py-0.5 text-[11px] text-gray-600 bg-white"
        >
          <option value="sans">Sans</option>
          <option value="serif">Serif</option>
          <option value="mono">Mono</option>
        </select>
        <button type="button" onClick={() => patch({ bold: !st.bold })} title="Bold" className={toggleCls(st.bold)}>
          B
        </button>
        <button
          type="button"
          onClick={() => patch({ italic: !st.italic })}
          title="Italic"
          className={`${toggleCls(st.italic)} italic`}
        >
          I
        </button>
        <input
          type="number"
          min={6}
          max={48}
          value={fontSizes[field] ?? base}
          onChange={e => setFontSizes(prev => ({ ...prev, [field]: Number(e.target.value) || base }))}
          title="Font size (points)"
          className="no-spin w-14 border border-gray-300 rounded-md px-1 py-0.5 text-[11px] text-gray-600 bg-white"
        />
      </div>
    )
  }
  const [width, setWidth] = useState(isEdit ? existing.width || 220 : 220)
  const [height, setHeight] = useState(isEdit ? existing.height || 90 : 90)
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
      const p = positions.find(x => String(x.id) === String(positionId))
      onSubmit({
        ...base,
        position_id: Number(positionId),
        employee_id: employeeId || null,
        label: p?.title || '',
        width: width || 110,
        height: height || 40,
      })
    } else if (kind === 'container') {
      onSubmit({
        ...base,
        label: label.trim() || 'Untitled',
        heading: heading.trim() || null,
        bg_color: bgColor,
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
              {fieldStyle('title', 9)}
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
                {fieldStyle('name', 8)}
              </div>
            </div>
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
              <p className="col-span-2 mt-1 text-[11px] leading-snug text-amber-600">
                Note: height applies to the whole level — every item on the same row will match this height, even if it's smaller than the others.
              </p>
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
                Area name
              </label>
              <div className="flex items-center gap-2">
                <input
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder="Operations"
                  className="flex-1 min-w-0 border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                />
                {fieldStyle('label', 14)}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Second title (optional)
              </label>
              <div className="flex items-center gap-2">
                <input
                  value={heading}
                  onChange={e => setHeading(e.target.value)}
                  placeholder="e.g. Department"
                  className="flex-1 min-w-0 border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                />
                {fieldStyle('heading', 12)}
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
                {fieldStyle('title', 10)}
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
                  {fieldStyle('name', 8)}
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
              <p className="col-span-2 mt-1 text-[11px] leading-snug text-amber-600">
                Note: height applies to the whole level — every item on the same row will match this height, even if it's smaller than the others.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setWidth(220)
                setHeight(90)
              }}
              className="text-xs text-blue-600 hover:underline"
            >
              Reset to default Org Chart Area size (220 × 90)
            </button>
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

        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md">Cancel</button>
          <button type="button" onClick={handleSubmit} className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md">{isEdit ? 'Save' : 'Add'}</button>
        </div>
      </div>
    </div>
  )
}
