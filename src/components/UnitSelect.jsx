import { useState } from 'react'
import { UNIT_PRESETS } from '../lib/units'

// Unit picker for the Master Rates add/edit modals + the item Detail modal
// (materials + misc rates). A REAL <select> dropdown that ALWAYS lists the
// canonical presets (Per Each / Per Ton / Per Cu Yd / Per Sq Ft / Per Ln Ft /
// Per Cu Ft). The row's current stored unit — which may be a legacy/abbreviated
// value like 'CY' / 'SF' / 'ton' that isn't a preset — is kept as its own option
// at the top so it stays selected and visible; picking a preset overwrites it.
// A "Custom…" option opens a free-text input for the odd units misc rates use
// ('Per Visit' / 'Per Bag'). A <select> (not a datalist <input>) is used on
// purpose: the app's autofill guard marks text inputs readonly until first focus,
// which made the old field look un-editable.
const CUSTOM = '__custom__'

export default function UnitSelect({ value, onChange, className, placeholder = 'Select unit…', ...rest }) {
  // Custom text entry is OPT-IN only (chosen from the dropdown) — never the
  // default, or every legacy non-preset unit would open as a bare text box.
  const [custom, setCustom] = useState(false)

  if (custom) {
    return (
      <input
        type="text"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className={className}
        placeholder="Custom unit (e.g. Per Visit)"
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
        onBlur={e => {
          // Empty → return to the dropdown so the user isn't stranded.
          if (!e.target.value.trim()) setCustom(false)
        }}
        {...rest}
      />
    )
  }

  const presetHas = !!value && UNIT_PRESETS.includes(value)
  return (
    <select
      value={value || ''}
      onChange={e => {
        if (e.target.value === CUSTOM) {
          setCustom(true)
          onChange('')
        } else {
          onChange(e.target.value)
        }
      }}
      className={className}
      {...rest}
    >
      <option value="">{placeholder}</option>
      {/* Preserve a legacy / non-preset current value so it stays selected. */}
      {value && !presetHas && <option value={value}>{value}</option>}
      {UNIT_PRESETS.map(u => (
        <option key={u} value={u}>
          {u}
        </option>
      ))}
      <option value={CUSTOM}>Custom…</option>
    </select>
  )
}
