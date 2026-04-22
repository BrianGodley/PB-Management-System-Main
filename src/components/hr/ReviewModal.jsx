// ─────────────────────────────────────────────────────────────────────────────
// ReviewModal — conduct a performance review for an employee
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

function StarRating({ value, onChange, disabled }) {
  const [hovered, setHovered] = useState(null)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          onMouseEnter={() => !disabled && setHovered(n)}
          onMouseLeave={() => setHovered(null)}
          className={`text-2xl transition-colors ${
            n <= (hovered ?? value ?? 0) ? 'text-yellow-400' : 'text-gray-200'
          } ${disabled ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
        >
          ★
        </button>
      ))}
      {value && <span className="text-sm text-gray-500 ml-2 self-center">{value}/5</span>}
    </div>
  )
}

export default function ReviewModal({ employee, reviewForms, onSave, onClose }) {
  const [selectedFormId, setSelectedFormId] = useState(reviewForms[0]?.id || '')
  const [reviewerName,   setReviewerName]   = useState('')
  const [reviewDate,     setReviewDate]     = useState(new Date().toISOString().split('T')[0])
  const [responses,      setResponses]      = useState({})
  const [overallRating,  setOverallRating]  = useState(null)
  const [notes,          setNotes]          = useState('')
  const [saving,         setSaving]         = useState(false)
  const [error,          setError]          = useState('')

  const selectedForm = reviewForms.find(f => f.id === selectedFormId)
  const fields       = selectedForm?.fields || []

  function setResponse(fieldId, value) {
    setResponses(prev => ({ ...prev, [fieldId]: value }))
  }

  async function handleSave() {
    if (!selectedFormId) { setError('Select a review form'); return }
    if (!reviewerName.trim()) { setError('Reviewer name is required'); return }

    // Check required fields
    const missing = fields.filter(f => f.required && f.type !== 'header' && !responses[f.id])
    if (missing.length) { setError(`Please fill in: ${missing.map(f => f.label).join(', ')}`); return }

    setSaving(true)
    const { error: err } = await supabase.from('hr_reviews').insert({
      employee_id:    employee.id,
      review_form_id: selectedFormId,
      reviewer_name:  reviewerName.trim(),
      review_date:    reviewDate,
      responses,
      overall_rating: overallRating,
      notes:          notes.trim() || null,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Performance Review</h2>
            <p className="text-sm text-gray-500">{employee.first_name} {employee.last_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          {/* Setup */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Review Form *</label>
              <select
                value={selectedFormId}
                onChange={e => { setSelectedFormId(e.target.value); setResponses({}) }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              >
                {reviewForms.length === 0 && <option value="">No forms available</option>}
                {reviewForms.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Review Date</label>
              <input
                type="date"
                value={reviewDate}
                onChange={e => setReviewDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Reviewer Name *</label>
              <input
                type="text"
                value={reviewerName}
                onChange={e => setReviewerName(e.target.value)}
                placeholder="Your name"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              />
            </div>
          </div>

          {/* Form fields */}
          {fields.length > 0 && (
            <div className="space-y-5">
              <h3 className="font-semibold text-gray-800 border-b border-gray-100 pb-2">{selectedForm?.title}</h3>
              {fields.map(field => (
                <div key={field.id}>
                  {field.type === 'header' ? (
                    <div className="pt-2">
                      <p className="font-semibold text-gray-700 text-sm uppercase tracking-wide">{field.label}</p>
                      <div className="border-t border-gray-200 mt-1" />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>

                      {field.type === 'rating' && (
                        <StarRating
                          value={responses[field.id] || 0}
                          onChange={v => setResponse(field.id, v)}
                        />
                      )}

                      {field.type === 'text' && (
                        <textarea
                          value={responses[field.id] || ''}
                          onChange={e => setResponse(field.id, e.target.value)}
                          rows={3}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 resize-none"
                          placeholder="Enter response…"
                        />
                      )}

                      {field.type === 'yesno' && (
                        <div className="flex gap-3">
                          {['Yes', 'No'].map(opt => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setResponse(field.id, opt)}
                              className={`px-5 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                                responses[field.id] === opt
                                  ? opt === 'Yes' ? 'bg-green-700 text-white border-green-700' : 'bg-red-500 text-white border-red-500'
                                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}

                      {field.type === 'number' && (
                        <input
                          type="number"
                          value={responses[field.id] || ''}
                          onChange={e => setResponse(field.id, e.target.value)}
                          className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                          placeholder="0"
                        />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Overall rating + notes */}
          <div className="border-t border-gray-100 pt-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Overall Rating</label>
              <StarRating value={overallRating} onChange={setOverallRating} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 resize-none"
                placeholder="General comments, goals for next period, etc."
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex gap-3 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-800 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Review'}
          </button>
        </div>
      </div>
    </div>
  )
}
