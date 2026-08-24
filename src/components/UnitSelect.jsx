import { UNIT_PRESETS } from '../lib/units'

// Unit picker for the Master Rates add/edit modals (materials + misc rates). Offers
// the canonical presets (Per Each / Per Ton / Per Cu Yd / Per Sq Ft / Per Ln Ft /
// Per Cu Ft) as a pick-list, while still allowing a custom value (misc rates use
// units like 'Per Visit' / 'Per Bag'). Backed by a <datalist> so it's a normal text
// input that shows the presets on focus. `value` is the raw stored unit string.
let _idSeq = 0
export default function UnitSelect({ value, onChange, className, placeholder = 'Select unit…', ...rest }) {
  // One shared datalist per mount is fine, but give each a unique id to be safe.
  const listId = `unit-presets-${(_idSeq = (_idSeq + 1) % 100000)}`
  return (
    <>
      <input
        list={listId}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className={className}
        placeholder={placeholder}
        {...rest}
      />
      <datalist id={listId}>
        {UNIT_PRESETS.map(u => (
          <option key={u} value={u} />
        ))}
      </datalist>
    </>
  )
}
