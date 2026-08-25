// Money input with the $*.** structure — a leading "$" adornment and 2-decimal
// formatting on blur. Used for the true DOLLAR fields in the Master Rates add/edit
// modals + the item Detail modal (material Standard/vendor price, misc $ adders,
// subcontractor rates). Stores/returns a plain numeric STRING (the parents
// Number()-coerce on save), so it's a drop-in for the old
// `<input type="number">` price fields. Not for hours-per-unit labor coefficients.
export default function PriceInput({
  value,
  onChange,
  className = '',
  placeholder = '0.00',
  decimals = 2,
  ...rest
}) {
  const format = () => {
    const s = String(value ?? '').replace(/[$,\s]/g, '').trim()
    if (s === '') return
    const num = Number(s)
    if (Number.isFinite(num)) onChange(num.toFixed(decimals))
  }
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-sm text-gray-500">$</span>
      <input
        type="text"
        inputMode="decimal"
        value={value ?? ''}
        onChange={e => onChange(e.target.value.replace(/[$,]/g, ''))}
        onBlur={format}
        placeholder={placeholder}
        className={`pl-6 ${className}`}
        {...rest}
      />
    </div>
  )
}
