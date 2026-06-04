// Modal dialog for adding or editing a node. One dialog, switches form
// based on selected node kind. Returns the new/updated payload via
// onSubmit({...}).
//
// Props:
//   - mode: 'new' | 'child' | 'edit'
//   - parentId: string | null   (used when mode === 'child')
//   - existing: node row | null (used when mode === 'edit'; pre-fills form)
//   - positions: [{ id, title }]
//   - onSubmit(payload), onClose

import { useState } from 'react'
import { CONTAINER_COLORS } from './palette.js'
import ColorLibraryPicker from '../ColorLibraryPicker.jsx'

export default function AddNodeDialog({
  mode,
  parentId,
  seniorOf,
  existing,
  positions,
  employeesByPosition,
  onSubmit,
  onClose,
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
  const [width, setWidth] = useState(isEdit ? existing.width || 180 : 180)
  const [height, setHeight] = useState(isEdit ? existing.height || 70 : 70)

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
        width: 110,
        height: 40,
      })
    } else if (kind === 'container') {
      onSubmit({
        ...base,
        label: label.trim() || 'Untitled',
        heading: heading.trim() || null,
        bg_color: bgColor,
        container_mode: containerMode,
        width,
        height,
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

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5">
        <h3 className="text-base font-semibold mb-3">
          {mode === 'edit'
            ? 'Edit node'
            : mode === 'child'
              ? 'Add child node'
              : mode === 'senior'
                ? 'Add senior node'
                : 'Add node'}
        </h3>

        <div className="flex gap-2 mb-4 text-sm">
          {['position', 'container', 'custom'].map(k => (
            <button
              key={k}
              type="button"
              onClick={() => !isEdit && setKind(k)}
              disabled={isEdit}
              title={isEdit ? "Can't change kind on an existing node" : ''}
              className={`flex-1 py-1.5 rounded-md border ${
                kind === k
                  ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                  : 'border-gray-200 hover:bg-gray-50 text-gray-600'
              } ${isEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {k[0].toUpperCase() + k.slice(1)}
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
                setEmployeeId('') // reset employee pick when position changes
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
            {(() => {
              const candidates =
                employeesByPosition?.get(Number(positionId)) || []
              if (!positionId) {
                return (
                  <p className="text-xs text-gray-500">
                    Pick a position; the assigned employee fills in automatically.
                  </p>
                )
              }
              if (candidates.length === 0) {
                return (
                  <p className="text-xs text-amber-600">
                    No employees are currently assigned to this position. The card
                    will show "(unassigned)".
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
            })()}
          </div>
        )}

        {kind === 'container' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Heading</label>
              <input
                value={heading}
                onChange={e => setHeading(e.target.value)}
                placeholder="Department / Division / Section…"
                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
              <input
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="Operations"
                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Color</label>
              <ColorLibraryPicker value={bgColor} onChange={setBgColor} compact />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Width (px)</label>
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
                <label className="block text-xs font-medium text-gray-500 mb-1">Height (px)</label>
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
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Grouping</label>
              <div className="flex gap-2">
                {[
                  { v: 'independent', label: 'Independent (decoration)' },
                  { v: 'implicit', label: 'Implicit (owns nodes inside)' },
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
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Color</label>
              <ColorLibraryPicker value={bgColor} onChange={setBgColor} compact />
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

        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md"
          >
            {isEdit ? 'Save' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  )
}
