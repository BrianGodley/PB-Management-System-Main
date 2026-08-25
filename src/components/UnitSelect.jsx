import { useState } from 'react'
import { UNIT_PRESETS } from '../lib/units'

// Unit picker for the Master Rates add/edit modals + the item Detail modal
// (materials + misc rates). A REAL <select> dropdown of the canonical presets
// (Per Each / Per Ton / Per Cu Yd / Per Sq Ft / Per Ln Ft / Per Cu Ft), with a
// "Custom…" option that reveals a text input for the odd unit misc rates use
// ('Per Visit' / 'Per Bag'). A <select> (not a datalist <input>) is used on
// purpose: the app's autofill guard marks every text input readonly until first
// focus, which made the old datalist field look un-editable, and a datalist
// doesn't render as an obvious dropdown. `value` is the raw stored unit string.
const CUSTOM = '__custom__'

export default function UnitSelect({ value, onChange, className, placeholder = 'Select unit…', ...rest }) {
  // A stored value that isn't one of the presets is a custom unit → start in the
  // text-input mode so it shows and stays editable.
  const [custom, setCustom] = useState(!!value && !UNIT_PRESETS.includes(value))

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
          // Empty → fall back to the dropdown so the user isn't stuck.
          if (!e.target.value.trim()) setCustom(false)
        }}
        {...rest}
      />
    )
  }

  return (
    <select
      value={UNIT_PRESETS.includes(value) ? value : ''}
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
      {UNIT_PRESETS.map(u => (
        <option key={u} value={u}>
          {u}
        </option>
      ))}
      <option value={CUSTOM}>Custom…</option>
    </select>
  )
}
