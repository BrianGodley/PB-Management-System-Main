import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

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
  searchable = false,
  // When true the menu is rendered in a body-level portal (fixed-positioned at the
  // trigger) so it escapes any overflow/scroll container — no clipping, no weird
  // scrolling inside a section frame.
  portal = false,
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [rect, setRect] = useState(null)
  const rootRef = useRef(null)
  const listRef = useRef(null)
  const searchRef = useRef(null)

  // Measure the trigger so a portaled menu can position itself at it.
  const place = useCallback(() => {
    if (!rootRef.current) return
    const r = rootRef.current.getBoundingClientRect()
    setRect({ top: r.bottom, left: r.left, width: r.width })
  }, [])

  // Open by measuring the trigger FIRST, then flipping open — both state updates
  // batch into one render, so a portaled menu is fixed-positioned on its very first
  // paint. Without this, the first-ever open renders one frame with rect=null: the
  // menu falls back to normal document flow and the on-open scrollIntoView then
  // scrolls the whole page (e.g. Lighting fixtures → jumps down to Transformer).
  const openMenu = useCallback(() => {
    place()
    setOpen(true)
  }, [place])

  // eslint-disable-next-line eqeqeq
  const selected = options.find(o => o.value == value)
  const label = selected ? selected.label : placeholder

  const close = useCallback(() => setOpen(false), [])

  // Close on outside click / Escape. A portaled menu lives outside rootRef, so
  // also treat clicks inside the menu (listRef) as "inside".
  useEffect(() => {
    if (!open) return
    const inside = t =>
      (rootRef.current && rootRef.current.contains(t)) ||
      (listRef.current && listRef.current.contains(t))
    const onDoc = e => {
      if (!inside(e.target)) close()
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

  // When opening, position the (portaled) menu, scroll the selected option into
  // view, reset + focus search. When portaled, keep it pinned to the trigger on
  // scroll/resize.
  useEffect(() => {
    if (!open) return
    setQuery('')
    place()
    if (searchable && searchRef.current) searchRef.current.focus()
    if (listRef.current) {
      const el = listRef.current.querySelector('[data-selected="true"]')
      if (el) el.scrollIntoView({ block: 'nearest' })
    }
    if (!portal) return
    const onMove = () => place()
    window.addEventListener('scroll', onMove, true)
    window.addEventListener('resize', onMove)
    return () => {
      window.removeEventListener('scroll', onMove, true)
      window.removeEventListener('resize', onMove)
    }
  }, [open, searchable, portal, place])

  const pick = o => {
    if (o.disabled) return
    onChange?.(o.value)
    close()
  }

  const shown =
    searchable && query.trim()
      ? options.filter(o => String(o.label).toLowerCase().includes(query.trim().toLowerCase()))
      : options

  // Portal a fixed-positioned menu to <body> so it escapes clipping AND any
  // transformed ancestor — a CSS transform makes position:fixed relative to that
  // ancestor, which dropped the menu far below its trigger. Body-level = truly
  // viewport-fixed at the measured rect.
  const wrap = node => (portal && rect ? createPortal(node, document.body) : node)

  return (
    // The caller's className (width / flex-1 / the `input` visual style) lives on
    // the WRAPPER so the control grows to fill its flex row. The button is a
    // transparent, full-width layer inside it.
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && (open ? close() : openMenu())}
        onKeyDown={e => {
          if (disabled) return
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
            e.preventDefault()
            openMenu()
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

      {open && wrap(
        <div
          ref={listRef}
          style={
            portal && rect
              ? { position: 'fixed', top: rect.top + 4, left: rect.left, width: rect.width }
              : undefined
          }
          className={`${
            portal ? 'z-[100]' : 'absolute z-50 top-full left-0 mt-1 w-full'
          } max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg py-1 ${menuClassName}`}
        >
          {searchable && (
            <div className="sticky top-0 bg-white px-2 pt-1 pb-2 border-b border-gray-100">
              <input
                ref={searchRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.stopPropagation()}
                placeholder="Search…"
                className="w-full rounded-md border border-gray-200 px-2 py-1 text-sm outline-none focus:border-blue-400"
              />
            </div>
          )}
          {shown.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">No options</div>
          ) : (
            shown.map((o, i) => {
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
