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

export default function AddNodeDialog({
  mode,
  parentId,
  seniorOf,
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
  const [kind, setKind] = useState(isEdit ? existing.kind || 'custom' : 'position')

  const [label, setLabel] = useState(isEdit ? existing.label || '' : '')

  const [positionId, setPositionId] = useState(
    isEdit && existing.position_id ? String(existing.position_id) : '',
  )
  const [employeeId, setEmployeeId] = useState(
    isEdit && existing.employee_id ? String(existing.employee_id) : '',
  )

  const [heading, setHeading] = useState(isEdit ? existing.heading || 'Department' : 'Department')
  const [bgColor, setBgColor] = useState(
    isEdit && existing.bg_color ? existing.bg_color : CONTAINER_COLORS[0].bg,
  )
  const [containerMode, setContainerMode] = useState(
    isEdit ? existing.container_mode || 'independent' : 'independent',
  )
  const [width, setWidth] = useState(isEdit ? existing.width || 220 : 220)
  const [height, setHeight] = useState(isEdit ? existing.height || 90 : 90)
  // Assistant kind state
  const [attachedToNodeId, setAttachedToNodeId] = useState(
    isEdit && existing.attached_to_node_id ? existing.attached_to_node_id : '',
  )
  const [attachmentSide, setAttachmentSide] = useState(
    isEdit ? existing.attachment_side || 'right' : 'right',
  )

  function handleSubmit() {
    const base = {
      kind,
      parentId: mode === 'child' ? parentId : null,
      seniorOf: mode === 'senior' ? seniorOf : null,
      isEdit,
      id: existing?.id,
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

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5">
        <h3 className="text-base font-semibold mb-3">
          {mode === 'edit'
            ? 'Edit Item'
            : mode === 'child'
              ? 'Add Junior Item'
              : mode === 'senior'
                ? 'Add Senior Item'
                : 'Add Item'}
        </h3>

        <div className="flex gap-2 mb-4 text-sm">
          {['position', 'container', 'custom', 'assistant'].map(k => (
            <button
              key={k}
              type="button"
              onClick={() => !isEdit && setKind(k)}
              disabled={isEdit}
              title={isEdit ? "Can't change kind on an existing item" : ''}
              className={`flex-1 py-1.5 rounded-md border ${
                kind === k
                  ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                  : 'border-gray-200 hover:bg-gray-50 text-gray-600'
              } ${isEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>

        {kind === 'position' && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Position</label>
            <select
              value={positionId}
              onChange={e => {
                setPositionId(e.target.value)
                setEmployeeId('')
              }}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm mb-2"
            >
              <option value="">— Pick a position —</option>
              {positions.map(p => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            {renderPositionPicker(true)}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Width</label>
                <input
                  type="number"
                  value={width}
                  onChange={e => setWidth(Number(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                  min={60}
                  max={600}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Height</label>
                <input
                  type="number"
                  value={height}
                  onChange={e => setHeight(Number(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
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
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Area name
              </label>
              <input
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="Operations"
                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Position in charge (optional)
              </label>
              <select
                value={positionId}
                onChange={e => {
                  setPositionId(e.target.value)
                  setEmployeeId('')
                }}
                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm mb-2"
              >
                <option value="">— None —</option>
                {positions.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
              {positionId && renderPositionPicker(false)}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Color</label>
              <ColorLibraryPicker value={bgColor} onChange={setBgColor} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Width</label>
                <input
                  type="number"
                  value={width}
                  onChange={e => setWidth(Number(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                  min={80}
                  max={1200}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Height</label>
                <input
                  type="number"
                  value={height}
                  onChange={e => setHeight(Number(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                  min={30}
                  max={600}
                />
              </div>
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
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Grouping</label>
              <div className="flex gap-2">
                {[
                  { v: 'independent', label: 'Independent (decoration)' },
                  { v: 'implicit', label: 'Implicit (owns items inside)' },
                ].map(opt => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setContainerMode(opt.v)}
                    className={`flex-1 py-1.5 rounded-md border text-xs ${
                      containerMode === opt.v
                        ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
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

        {isEdit && (
          <div className="mt-5 pt-3 border-t border-gray-100 flex flex-wrap gap-2 text-xs">
            {onAddChild && (
              <button type="button" onClick={() => onAddChild(existing)} className="px-2 py-1 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200">+ Add Junior Item</button>
            )}
            {onAddSenior && (
              <button type="button" onClick={() => onAddSenior(existing)} className="px-2 py-1 rounded-md bg-indigo-100 text-indigo-700 hover:bg-indigo-200">+ Add Senior Item</button>
            )}
            {onConnect && (
              <button type="button" onClick={() => onConnect(existing)} className="px-2 py-1 rounded-md bg-orange-100 text-orange-700 hover:bg-orange-200">New Item Connection</button>
            )}
            {onChangeSenior && (
              <button type="button" onClick={() => onChangeSenior(existing)} className="px-2 py-1 rounded-md bg-sky-100 text-sky-700 hover:bg-sky-200">Change Senior</button>
            )}
            {onChangeChild && (
              <button type="button" onClick={() => onChangeChild(existing)} className="px-2 py-1 rounded-md bg-cyan-100 text-cyan-700 hover:bg-cyan-200">Change Junior</button>
            )}
            {onChangeConnection && (
              <button type="button" onClick={() => onChangeConnection(existing)} className="px-2 py-1 rounded-md bg-teal-100 text-teal-700 hover:bg-teal-200">Change Connection</button>
            )}
            {onDelete && (
              <button type="button" onClick={() => onDelete(existing)} className="ml-auto px-2 py-1 rounded-md bg-red-100 text-red-700 hover:bg-red-200">Delete</button>
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
