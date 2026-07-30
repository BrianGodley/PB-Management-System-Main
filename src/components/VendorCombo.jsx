import { useState, useEffect } from 'react'

// Searchable vendor picker: a text input that filters a dropdown of vendors.
// Type to search, click to select. `value` is the vendor id, onChange(id).
export default function VendorCombo({
  vendors = [],
  value,
  onChange,
  placeholder = 'Search vendor…',
  allowNone = false,
  noneLabel = '— none —',
  className = '',
}) {
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)

  const selName = vendors.find(v => v.id === value)?.company_name || ''
  // Resync the displayed text whenever the selected value changes externally
  // (e.g. invoice vendor auto-detection).
  useEffect(() => {
    setText(selName)
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  const q = text.trim().toLowerCase()
  const filtered = vendors.filter(v => !q || (v.company_name || '').toLowerCase().includes(q))

  function pick(v) {
    onChange(v ? v.id : '')
    setText(v ? v.company_name : '')
    setOpen(false)
  }

  return (
    <div className={`relative ${className}`}>
      <input
        className="input w-full text-sm py-1.5"
        value={text}
        placeholder={placeholder}
        onChange={e => {
          setText(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Let a click on an option register first, then close + resync display.
          setTimeout(() => {
            setOpen(false)
            setText(vendors.find(v => v.id === value)?.company_name || '')
          }, 150)
        }}
      />
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-56 overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg text-sm">
          {allowNone && (
            <button
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => pick(null)}
              className="block w-full text-left px-3 py-1.5 hover:bg-gray-100 text-gray-500"
            >
              {noneLabel}
            </button>
          )}
          {filtered.length === 0 && <div className="px-3 py-2 text-gray-400">No matches</div>}
          {filtered.map(v => (
            <button
              key={v.id}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => pick(v)}
              className={`block w-full text-left px-3 py-1.5 hover:bg-gray-100 ${v.id === value ? 'bg-green-50 font-semibold text-gray-900' : 'text-gray-700'}`}
            >
              {v.company_name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
