// ─────────────────────────────────────────────────────────────────────────────
// ReviewBuilder — create / edit a review form template
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const FIELD_TYPES = [
  { value: 'rating',  label: 'Star Rating',     icon: '⭐', desc: '1–5 star scale'            },
  { value: 'text',    label: 'Text Response',   icon: '📝', desc: 'Open text answer'           },
  { value: 'yesno',  label: 'Yes / No',         icon: '✅', desc: 'Simple yes or no'           },
  { value: 'number',  label: 'Number',           icon: '🔢', desc: 'Numeric value'              },
  { value: 'header',  label: 'Section Header',  icon: '📌', desc: 'Divider between sections'   },
]

function newField() {
  return { id: crypto.randomUUID(), type: 'text', label: '', required: false }
}

export default function ReviewBuilder({ form, onSave, onClose }) {
  const [title,    setTitle]    = useState(form?.title       || '')
  const [desc,     setDesc]     = useState(form?.description || '')
  const [fields,   setFields]   = useState([])
  const [loading,  setLoading]  = useState(!!form)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
    if (form) {
      setFields((form.fields || []).map(f => ({ ...f, id: f.id || crypto.randomUUID() })))
      setLoading(false)
    } else {
      setLoading(false)
    }
  }, [form?.id])

  const addField   = ()          => setFields(prev => [...prev, newField()])
  const removeField = id         => setFields(prev => prev.filter(f => f.id !== id))
  const updateField = (id, patch) => setFields(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f))

  function moveField(idx, dir) {
    setFields(prev => {
      const next = [...prev]
      const swap = idx + dir
      if (swap < 0 || swap >= next.length) return next
      ;[next[idx], next[swap]] = [next[swap], next[idx]]
      return next
    })
  }

  async function handleSave() {
    if (!title.trim()) { setError('Form title is required'); return }
    setSaving(true)
    setError('')
    const payload = {
      title:       title.trim(),
      description: desc.trim() || null,
      fields,
      updated_at:  new Date().toISOString(),
    }

    if (form?.id) {
      await supabase.from('hr_review_forms').update(payload).eq('id', form.id)
    } else {
      await supabase.from('hr_review_forms').insert(payload)
    }
    setSaving(false)
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex">
      <div className="flex-1 flex flex-col bg-gray-50 max-w-2xl mx-auto w-full shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">
            {form ? 'Edit Review Form' : 'New Review Form'}
          </h2>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-800 disabled:opacity-50"
            >
              {saving ? 'Saving…' : '💾 Save Form'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Form info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h3 className="font-semibold text-gray-800">Form Info</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Annual Performance Review"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
              <textarea
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="Purpose or instructions for reviewers…"
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 resize-none"
              />
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800">Fields ({fields.length})</h3>

            {fields.length === 0 && (
              <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-400">
                <p className="text-3xl mb-2">📋</p>
                <p className="text-sm">No fields yet. Add your first field below.</p>
              </div>
            )}

            {fields.map((field, idx) => (
              <div key={field.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="text"
                    value={field.label}
                    onChange={e => updateField(field.id, { label: e.target.value })}
                    placeholder={field.type === 'header' ? 'Section title…' : 'Field label / question…'}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:border-green-500"
                  />
                  <button onClick={() => moveField(idx, -1)} disabled={idx === 0}           className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 text-sm">↑</button>
                  <button onClick={() => moveField(idx, 1)}  disabled={idx === fields.length - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 text-sm">↓</button>
                  <button onClick={() => removeField(field.id)} className="p-1 text-red-400 hover:text-red-600 text-sm">✕</button>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {FIELD_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => updateField(field.id, { type: t.value })}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                        field.type === t.value
                          ? 'bg-green-700 text-white border-green-700'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'
                      }`}
                    >
                      {t.icon} {t.label}
                    </button>
                  ))}
                  {field.type !== 'header' && (
                    <label className="flex items-center gap-1 ml-auto text-xs text-gray-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={e => updateField(field.id, { required: e.target.checked })}
                        className="accent-green-700"
                      />
                      Required
                    </label>
                  )}
                </div>

                {/* Preview of field type */}
                {field.type === 'rating' && (
                  <div className="mt-3 flex gap-1">
                    {[1,2,3,4,5].map(n => <span key={n} className="text-gray-300 text-xl">★</span>)}
                  </div>
                )}
                {field.type === 'text' && (
                  <div className="mt-3 h-12 bg-gray-50 border border-dashed border-gray-200 rounded-lg" />
                )}
                {field.type === 'yesno' && (
                  <div className="mt-3 flex gap-3">
                    <div className="px-4 py-1 border border-gray-200 rounded-lg text-sm text-gray-400">Yes</div>
                    <div className="px-4 py-1 border border-gray-200 rounded-lg text-sm text-gray-400">No</div>
                  </div>
                )}
                {field.type === 'header' && (
                  <div className="mt-3 border-t-2 border-gray-200" />
                )}
              </div>
            ))}

            <button
              onClick={addField}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-500 hover:border-green-400 hover:text-green-700 transition-colors"
            >
              + Add Field
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
