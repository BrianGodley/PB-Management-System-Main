// ─────────────────────────────────────────────────────────────────────────────
// ChecksheetBuilder — create / edit a course and its steps
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const CATEGORIES = [
  'Safety / OSHA',
  'Onboarding',
  'Skills / Trade',
  'Equipment',
  'Administrative',
  'General',
]

const STEP_TYPES = [
  { value: 'text',      label: 'Instructions', icon: '📄', desc: 'Text the learner reads and acknowledges' },
  { value: 'checklist', label: 'Checklist',    icon: '✅', desc: 'Sub-items that must all be checked off'  },
  { value: 'photo',     label: 'Photo Upload', icon: '📷', desc: 'Employee uploads a photo or file'        },
  { value: 'quiz',      label: 'Quiz',         icon: '❓', desc: 'Multiple-choice question'                },
]

function newStep(order) {
  return {
    _id:               crypto.randomUUID(),
    title:             '',
    step_type:         'text',
    content:           '',
    checklist_items:   [],
    quiz_question:     '',
    quiz_options:      ['', '', '', ''],
    quiz_correct_index: 0,
    order_index:       order,
  }
}

export default function ChecksheetBuilder({ course, onSave, onClose }) {
  const [title,    setTitle]    = useState(course?.title       || '')
  const [category, setCategory] = useState(course?.category    || 'Safety / OSHA')
  const [desc,     setDesc]     = useState(course?.description || '')
  const [stepList, setStepList] = useState([])
  const [loading,  setLoading]  = useState(!!course)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  // Load existing steps when editing
  useEffect(() => {
    if (!course) { setLoading(false); return }
    supabase
      .from('lms_steps')
      .select('*')
      .eq('course_id', course.id)
      .order('order_index')
      .then(({ data }) => {
        setStepList((data || []).map(s => ({
          ...s,
          _id:             s.id,
          quiz_options:    s.quiz_options    || ['', '', '', ''],
          checklist_items: s.checklist_items || [],
        })))
        setLoading(false)
      })
  }, [course?.id])

  // ── step list mutations ───────────────────────────────────────────────────
  const addStep = () =>
    setStepList(prev => [...prev, newStep(prev.length)])

  const removeStep = idx =>
    setStepList(prev => prev.filter((_, i) => i !== idx))

  const moveStep = (idx, dir) =>
    setStepList(prev => {
      const next = [...prev]
      const swap = idx + dir
      if (swap < 0 || swap >= next.length) return next
      ;[next[idx], next[swap]] = [next[swap], next[idx]]
      return next
    })

  const updateStep = (idx, patch) =>
    setStepList(prev => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)))

  const addChecklistItem = idx =>
    updateStep(idx, {
      checklist_items: [
        ...stepList[idx].checklist_items,
        { id: crypto.randomUUID(), label: '' },
      ],
    })

  const updateChecklistItem = (stepIdx, itemIdx, label) => {
    const items = [...stepList[stepIdx].checklist_items]
    items[itemIdx] = { ...items[itemIdx], label }
    updateStep(stepIdx, { checklist_items: items })
  }

  const removeChecklistItem = (stepIdx, itemIdx) =>
    updateStep(stepIdx, {
      checklist_items: stepList[stepIdx].checklist_items.filter((_, i) => i !== itemIdx),
    })

  // ── save ─────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!title.trim()) { setError('Course title is required'); return }
    if (stepList.some(s => !s.title.trim())) { setError('Every step needs a title'); return }
    setSaving(true)
    setError('')

    const coursePayload = {
      title:       title.trim(),
      category,
      description: desc.trim() || null,
      updated_at:  new Date().toISOString(),
    }

    let courseId = course?.id
    if (courseId) {
      await supabase.from('lms_courses').update(coursePayload).eq('id', courseId)
    } else {
      const { data, error: err } = await supabase
        .from('lms_courses')
        .insert(coursePayload)
        .select()
        .single()
      if (err || !data) { setError('Failed to create course'); setSaving(false); return }
      courseId = data.id
    }

    // Replace steps (delete + re-insert keeps order clean)
    await supabase.from('lms_steps').delete().eq('course_id', courseId)

    if (stepList.length > 0) {
      const stepsPayload = stepList.map((s, i) => ({
        course_id:          courseId,
        order_index:        i,
        title:              s.title.trim(),
        step_type:          s.step_type,
        content:            s.content                            || null,
        checklist_items:    s.step_type === 'checklist' ? s.checklist_items : null,
        quiz_question:      s.step_type === 'quiz'      ? s.quiz_question   : null,
        quiz_options:       s.step_type === 'quiz'      ? s.quiz_options    : null,
        quiz_correct_index: s.step_type === 'quiz'      ? s.quiz_correct_index : null,
      }))
      await supabase.from('lms_steps').insert(stepsPayload)
    }

    setSaving(false)
    onSave()
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex">
      <div className="flex-1 flex flex-col bg-gray-50 max-w-3xl mx-auto w-full shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">
            {course ? 'Edit Checksheet' : 'New Checksheet'}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-800 disabled:opacity-50"
            >
              {saving ? 'Saving…' : '💾 Save Checksheet'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading steps…</div>
          ) : (
            <>
              {/* Course info card */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                <h3 className="font-semibold text-gray-800">Course Info</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Forklift Safety Certification"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                  <textarea
                    value={desc}
                    onChange={e => setDesc(e.target.value)}
                    placeholder="Brief overview of what this course covers…"
                    rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 resize-none"
                  />
                </div>
              </div>

              {/* Steps section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800">Steps ({stepList.length})</h3>
                </div>

                {stepList.length === 0 && (
                  <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-400">
                    <p className="text-3xl mb-2">📋</p>
                    <p className="text-sm">No steps yet. Add your first step below.</p>
                  </div>
                )}

                {stepList.map((step, idx) => (
                  <StepEditor
                    key={step._id}
                    step={step}
                    index={idx}
                    total={stepList.length}
                    onUpdate={patch => updateStep(idx, patch)}
                    onMove={dir => moveStep(idx, dir)}
                    onRemove={() => removeStep(idx)}
                    onAddChecklistItem={() => addChecklistItem(idx)}
                    onUpdateChecklistItem={(itemIdx, label) => updateChecklistItem(idx, itemIdx, label)}
                    onRemoveChecklistItem={itemIdx => removeChecklistItem(idx, itemIdx)}
                  />
                ))}

                <button
                  onClick={addStep}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-500 hover:border-green-400 hover:text-green-700 transition-colors"
                >
                  + Add Step
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── StepEditor sub-component ──────────────────────────────────────────────────
function StepEditor({
  step, index, total,
  onUpdate, onMove, onRemove,
  onAddChecklistItem, onUpdateChecklistItem, onRemoveChecklistItem,
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

      {/* Step header row */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="w-6 h-6 rounded-full bg-green-700 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
          {index + 1}
        </div>
        <input
          type="text"
          value={step.title}
          onChange={e => onUpdate({ title: e.target.value })}
          placeholder="Step title…"
          className="flex-1 bg-transparent text-sm font-semibold text-gray-800 focus:outline-none placeholder-gray-400"
        />
        <div className="flex items-center gap-1">
          <button onClick={() => onMove(-1)} disabled={index === 0}            className="p-1 rounded text-gray-400 hover:text-gray-600 disabled:opacity-30 text-sm">↑</button>
          <button onClick={() => onMove(1)}  disabled={index === total - 1}    className="p-1 rounded text-gray-400 hover:text-gray-600 disabled:opacity-30 text-sm">↓</button>
          <button onClick={onRemove}                                            className="p-1 rounded text-red-400 hover:text-red-600 ml-1 text-sm">✕</button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Type selector */}
        <div className="flex gap-2 flex-wrap">
          {STEP_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => onUpdate({ step_type: t.value })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                step.step_type === t.value
                  ? 'bg-green-700 text-white border-green-700'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Content — varies by type */}

        {step.step_type === 'text' && (
          <textarea
            value={step.content}
            onChange={e => onUpdate({ content: e.target.value })}
            placeholder="Instructions or information for the learner…"
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 resize-none"
          />
        )}

        {step.step_type === 'checklist' && (
          <div className="space-y-2">
            <textarea
              value={step.content}
              onChange={e => onUpdate({ content: e.target.value })}
              placeholder="Optional instructions above the checklist…"
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 resize-none"
            />
            {step.checklist_items.map((item, i) => (
              <div key={item.id} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border border-gray-300 flex-shrink-0" />
                <input
                  type="text"
                  value={item.label}
                  onChange={e => onUpdateChecklistItem(i, e.target.value)}
                  placeholder={`Item ${i + 1}…`}
                  className="flex-1 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-green-500"
                />
                <button onClick={() => onRemoveChecklistItem(i)} className="text-red-400 hover:text-red-600 text-xs px-1">✕</button>
              </div>
            ))}
            <button
              onClick={onAddChecklistItem}
              className="text-xs text-green-700 font-medium hover:underline"
            >
              + Add item
            </button>
          </div>
        )}

        {step.step_type === 'photo' && (
          <div className="space-y-2">
            <textarea
              value={step.content}
              onChange={e => onUpdate({ content: e.target.value })}
              placeholder="Describe what photo or file the employee should upload…"
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 resize-none"
            />
            <div className="flex items-center justify-center h-14 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-gray-400 text-xs gap-2">
              📷 <span>Employee will upload a photo or file here</span>
            </div>
          </div>
        )}

        {step.step_type === 'quiz' && (
          <div className="space-y-3">
            <input
              type="text"
              value={step.quiz_question}
              onChange={e => onUpdate({ quiz_question: e.target.value })}
              placeholder="Quiz question…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
            />
            <div className="space-y-2">
              {(step.quiz_options || ['', '', '', '']).map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`quiz-correct-${step._id}`}
                    checked={step.quiz_correct_index === i}
                    onChange={() => onUpdate({ quiz_correct_index: i })}
                    className="accent-green-700 flex-shrink-0"
                    title="Mark as correct answer"
                  />
                  <input
                    type="text"
                    value={opt}
                    onChange={e => {
                      const opts = [...(step.quiz_options || ['', '', '', ''])]
                      opts[i] = e.target.value
                      onUpdate({ quiz_options: opts })
                    }}
                    placeholder={`Option ${i + 1}${step.quiz_correct_index === i ? ' ← correct' : ''}…`}
                    className="flex-1 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-green-500"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400">Select the radio button next to the correct answer.</p>
          </div>
        )}
      </div>
    </div>
  )
}
