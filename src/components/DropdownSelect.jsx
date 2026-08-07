import { useState, useRef, useEffect, useCallback } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// DropdownSelect — a native-<select> replacement that ALWAYS opens downward
// with an internal scroll region, so a long option list (e.g. a vendor with
// many block types) never flips upward the way a native select does. The
// browser decides a native select's popup direction from available space; this
// component takes that control back.
//
// API (kept close to a native select so call sites stay simple):
//   value        current value (matched against option.value, compared loosely)
//   onChange     called with the selected raw value (NOT an event)
//   options      [{ value, label, disabled }]
//   placeholder  shown when nothing is selected
//   className    applied to the trigger button (defaults to the app `input`)
//   disabled     disables the whole control
//   buttonClassName / menuClassName  optional style overrides
//
// Behaviour: click to toggle; click-away or Escape closes; Enter/Space on the
// trigger opens; options are clickable; the selected option is highlighted.
// ─────────────────────────────────────────────────────────────────────────────

export default function DropdownSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select…',
  className = 'input text-sm py-1.5 w-full',
  buttonClassName = '',
  menuClassName = '',
  disabled = false,
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const listRef = useRef(null)

  // eslint-disable-next-line eqeqeq
  const selected = options.find(o => o.value == value)
  const label = selected ? selected.label : placeholder

  const close = useCallback(() => setOpen(false), [])

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return
    const onDoc = e => {
      if (rootRef.current && !rootRef.current.contains(e.target)) close()
    }
    const onKey = e => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close])

  // When opening, scroll the selected option into view.
  useEffect(() => {
    if (open && listRef.current) {
      const el = listRef.current.querySelector('[data-selected="true"]')
      if (el) el.scrollIntoView({ block: 'nearest' })
    }
  }, [open])

  const pick = o => {
    if (o.disabled) return
    onChange?.(o.value)
    close()
  }

  return (
    // The caller's className (width / flex-1 / the `input` visual style) lives on
    // the WRAPPER so the control grows to fill its flex row. The button is a
    // transparent, full-width layer inside it.
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        onKeyDown={e => {
          if (disabled) return
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
          }
        }}
        className={`w-full flex items-center justify-between text-left bg-transparent border-0 p-0 focus:outline-none ${buttonClassName} ${
          disabled ? 'cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <span className={`truncate ${selected ? '' : 'text-gray-400'}`}>{label}</span>
        <svg
          className={`ml-2 h-4 w-4 flex-none text-gray-400 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.4a.75.75 0 01-1.08 0l-4.25-4.4a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div
          ref={listRef}
          className={`absolute z-50 top-full left-0 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg py-1 ${menuClassName}`}
        >
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">No options</div>
          ) : (
            options.map((o, i) => {
              // eslint-disable-next-line eqeqeq
              const isSel = o.value == value
              return (
                <div
                  key={`${o.value}-${i}`}
                  data-selected={isSel ? 'true' : 'false'}
                  onClick={() => pick(o)}
                  className={`px-3 py-1.5 text-sm ${
                    o.disabled
                      ? 'text-gray-300 cursor-not-allowed'
                      : isSel
                      ? 'bg-green-50 text-green-800 font-medium cursor-pointer'
                      : 'text-gray-700 hover:bg-gray-100 cursor-pointer'
                  }`}
                >
                  {o.label}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
