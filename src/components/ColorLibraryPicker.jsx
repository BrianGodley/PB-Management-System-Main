// Single-button color picker. Click the button to open a modal showing
// the full 110-color library at a comfortable size; select a swatch to
// dismiss the modal and apply the new value. The button shows the
// current selection (swatch + id + hex) so the caller's form reflects
// the choice before save.
//
// Props:
//   value      — current hex (e.g. '#F54927')
//   onChange   — (hex) => void
//   label      — optional small label above the button
//   buttonSize — 'sm' | 'md' (default 'md')
//
// Usage:
//   <ColorLibraryPicker value={color} onChange={setColor} label="Color" />

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { COLOR_LIBRARY, findColor, pickTextColor } from '../lib/colorLibrary.js'

export default function ColorLibraryPicker({
  value,
  onChange,
  label,
  buttonSize = 'md',
}) {
  const [open, setOpen] = useState(false)
  const c = findColor(value)
  const swatchClass = buttonSize === 'sm' ? 'w-5 h-5' : 'w-7 h-7'
  const textColor = pickTextColor(value || '#FFFFFF')

  return (
    <div>
      {label && (
        <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      )}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-2 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-xs"
      >
        <span
          className={`${swatchClass} rounded-sm border border-gray-200 shrink-0`}
          style={{ backgroundColor: value || '#FFFFFF' }}
        />
        <span className="font-mono text-gray-700">{value || '—'}</span>
        {c && (
          <span className="text-gray-500">
            ({c.id})
          </span>
        )}
        <span className="text-gray-400 ml-1">▾</span>
      </button>
      {open &&
        createPortal(
          <ColorModal
            value={value}
            onSelect={hex => {
              onChange?.(hex)
              setOpen(false)
            }}
            onClose={() => setOpen(false)}
          />,
          document.body,
        )}
    </div>
  )
}

function ColorModal({ value, onSelect, onClose }) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl p-5 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-800">Pick a color</h3>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500">Current:</span>
            <span
              className="w-5 h-5 rounded-sm border border-gray-200"
              style={{ backgroundColor: value || '#FFFFFF' }}
            />
            <span className="font-mono text-gray-700">{value || '—'}</span>
          </div>
        </div>
        <div className="space-y-2">
          {COLOR_LIBRARY.map(fam => (
            <div key={fam.family} className="flex items-center gap-3">
              <span className="w-16 text-[11px] uppercase tracking-wide text-gray-500 font-medium">
                {fam.family}
              </span>
              <div className="flex gap-1">
                {fam.shades.map(s => {
                  const isSelected =
                    (value || '').toLowerCase() === s.hex.toLowerCase()
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onSelect(s.hex)}
                      title={`${s.id} • ${s.hex}`}
                      style={{ backgroundColor: s.hex, color: s.textColor }}
                      className={`w-10 h-10 rounded-md border flex items-center justify-center text-[10px] font-medium transition-transform hover:scale-105 ${
                        isSelected
                          ? 'border-blue-600 ring-2 ring-blue-400'
                          : 'border-gray-200'
                      }`}
                    >
                      {s.level}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}