// Modal dialog for adding a new node (or child node). One dialog,
// switches form based on the selected node kind. Returns the new node
// payload via onSubmit({...}).
//
// Props:
//   - mode: 'new' | 'child'        (child: passes parentId for edge auto-create)
//   - parentId: string | null
//   - positions: [{ id, title }]   for the position-node dropdown
//   - onSubmit(payload), onClose

import { useState } from 'react'
import { CONTAINER_COLORS } from './palette.js'

export default function AddNodeDialog({ mode, parentId, positions, onSubmit, onClose }) {
  const [kind, setKind] = useState('position')

  // shared
  const [label, setLabel] = useState('')

  // position
  const [positionId, setPositionId] = useState('')

  // container
  const [heading, setHeading] = useState('Department')
  const [bgColor, setBgColor] = useState(CONTAINER_COLORS[0].bg)
  const [containerMode, setContainerMode] = useState('independent')
  const [width, setWidth] = useState(360)
  const [height, setHeight] = useState(140)

  function handleSubmit() {
    const base = { kind, parentId: mode === 'child' ? parentId : null }
    if (kind === 'position') {
      if (!positionId) return alert('Pick a position.')
      const p = positions.find(x => String(x.id) === String(positionId))
      onSubmit({
        ...base,
        position_id: Number(positionId),
        label: p?.title || '',
        width: 200,
        height: 72,
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
        width: 200,
        height: 72,
      })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5">
        <h3 className="text-base font-semibold mb-3">
          {mode === 'child' ? 'Add child node' : 'Add node'}
        </h3>

        <div className="flex gap-2 mb-4 text-sm">
          {['position', 'container', 'custom'].map(k => (
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
              {k[0].toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>

        {kind === 'position' && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Position</label>
            <select
              value={positionId}
              onChange={e => setPositionId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm mb-2"
            >
              <option value="">— Pick a position —</option>
              {positions.map(p => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">
              The assigned employee's name fills in automatically.
            </p>
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
              <div className="flex flex-wrap gap-1.5">
                {CONTAINER_COLORS.map(c => (
                  <button
                    key={c.bg}
                    type="button"
                    onClick={() => setBgColor(c.bg)}
                    title={c.name}
                    style={{ backgroundColor: c.bg }}
                    className={`w-7 h-7 rounded-md border-2 ${
                      bgColor === c.bg ? 'border-blue-600' : 'border-transparent'
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Width (px)</label>
                <input
                  type="number"
                  value={width}
                  onChange={e => setWidth(Number(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                  min={120}
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
                  min={48}
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
            Add
          </button>
        </div>
      </div>
    </div>
  )
}
