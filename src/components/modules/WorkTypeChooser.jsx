// src/components/modules/WorkTypeChooser.jsx
//
// Shared In House / Subcontractor button chooser, shown above the Crew Type field
// in every estimator module. Two wide, centered buttons; defaults to In House.
// `value` is the module's In-House/Sub state ('In-House' | 'Subcontractor').
export default function WorkTypeChooser({ value, onChange }) {
  const current = value || 'In-House'
  return (
    <div className="flex justify-center mb-2">
      <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
        {['In-House', 'Subcontractor'].map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`px-12 py-2 text-sm font-semibold transition-colors ${
              current === opt ? 'bg-green-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {opt === 'In-House' ? 'In House' : 'Subcontractor'}
          </button>
        ))}
      </div>
    </div>
  )
}
