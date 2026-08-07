// src/components/modules/WorkTypeChooser.jsx
//
// Shared In House / Subcontractor button chooser, shown above the Crew Type field
// in every estimator module. Two wide, centered buttons; defaults to In House.
// `value` is the module's In-House/Sub state ('In-House' | 'Subcontractor').
export default function WorkTypeChooser({ value, onChange, compact = false }) {
  const current = value || 'In-House'
  return (
    <div className={compact ? 'flex' : 'flex justify-center mb-2'}>
      <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
        {['In-House', 'Subcontractor'].map(opt => (
          // Rendered as a div (not a button) so the tab stays clickable even
          // inside a disabled <fieldset> — lets you switch In House/Sub while
          // viewing a saved estimate read-only.
          <div
            key={opt}
            role="button"
            tabIndex={0}
            onClick={() => onChange(opt)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onChange(opt)
              }
            }}
            className={`cursor-pointer select-none font-semibold transition-colors ${
              compact ? 'px-4 py-1 text-xs' : 'px-12 py-2 text-sm'
            } ${current === opt ? 'bg-green-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            {opt === 'In-House' ? 'In House' : 'Subcontractor'}
          </div>
        ))}
      </div>
    </div>
  )
}
