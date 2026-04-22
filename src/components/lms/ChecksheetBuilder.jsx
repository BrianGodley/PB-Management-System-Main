// ─────────────────────────────────────────────────────────────────────────────
// ChecksheetBuilder — full-screen modal for creating/editing checksheets
// 7 step types: read, watch, special_drill, learning_drill, quiz, final_test, action
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

const STEP_TYPES = [
  { value: 'read',           label: 'Read',           icon: '📖', color: 'bg-blue-100 text-blue-700' },
  { value: 'watch',          label: 'Watch',          icon: '▶️',  color: 'bg-red-100 text-red-700' },
  { value: 'special_drill',  label: 'Special Drill',  icon: '🔧', color: 'bg-orange-100 text-orange-700' },
  { value: 'learning_drill', label: 'Learning Drill', icon: '🔁', color: 'bg-purple-100 text-purple-700' },
  { value: 'quiz',           label: 'Quiz',           icon: '📝', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'final_test',     label: 'Final Test',     icon: '🎓', color: 'bg-green-100 text-green-700' },
  { value: 'action',         label: 'Action',         icon: '⚡', color: 'bg-pink-100 text-pink-700' },
]

const typeInfo = Object.fromEntries(STEP_TYPES.map(t => [t.value, t]))

function StepBadge({ type }) {
  const t = typeInfo[type] || {}
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${t.color || 'bg-gray-100 text-gray-600'}`}>
      {t.icon} {t.label}
    </span>
  )
}

export default function ChecksheetBuilder({ course: initialCourse, onClose, onSaved }) {
  const { user } = useAuth()

  const [title, setTitle] = useState(initialCourse?.title || '')
  const [description, setDescription] = useState(initialCourse?.description || '')
  const [category, setCategory] = useState(initialCourse?.category || 'General')
  const [steps, setSteps] = useState([])

  const [readItems, setReadItems] = useState([])
  const [drills, setDrills]       = useState([])
  const [quizzes, setQuizzes]     = useState([])
  const [tests, setTests]         = useState([])
  const [actions, setActions]     = useState([])
  const [loadingLibs, setLoadingLibs] = useState(true)

  const [editingStep, setEditingStep] = useState(null)
  const [stepForm, setStepForm] = useState({})
  const [uploadFile, setUploadFile] = useState(null)   // direct doc upload for Read steps
  const [uploadMode, setUploadMode] = useState('library') // 'library' | 'upload'
  const [savingStep, setSavingStep] = useState(false)
  const [stepError, setStepError] = useState('')
  const uploadRef = useRef()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadAll = async () => {
      setLoadingLibs(true)
      const [ri, dr, qu, te, ac] = await Promise.all([
        supabase.from('lms_read_items').select('id, title').order('title'),
        supabase.from('lms_learning_drills').select('id, title').order('title'),
        supabase.from('lms_quizzes').select('id, title').order('title'),
        supabase.from('lms_tests').select('id, title').order('title'),
        supabase.from('lms_actions').select('id, title').order('title'),
      ])
      setReadItems(ri.data || [])
      setDrills(dr.data || [])
      setQuizzes(qu.data || [])
      setTests(te.data || [])
      setActions(ac.data || [])

      if (initialCourse?.id) {
        const { data } = await supabase.from('lms_steps')
          .select('*').eq('course_id', initialCourse.id).order('step_order')
        setSteps(data || [])
      }
      setLoadingLibs(false)
    }
    loadAll()
  }, [initialCourse?.id])

  const blankStepForm = () => ({
    step_type: 'read', title: '', youtube_url: '', instructions: '',
    read_item_id: '', learning_drill_id: '', quiz_id: '', test_id: '', action_id: '',
  })

  const openNewStep = () => {
    setStepForm(blankStepForm())
    setUploadFile(null)
    setUploadMode('library')
    setEditingStep({})
  }

  const openEditStep = (step) => {
    setStepForm({
      step_type: step.step_type, title: step.title,
      youtube_url: step.youtube_url || '', instructions: step.instructions || '',
      read_item_id: step.read_item_id || '', learning_drill_id: step.learning_drill_id || '',
      quiz_id: step.quiz_id || '', test_id: step.test_id || '', action_id: step.action_id || '',
    })
    setUploadFile(null)
    setUploadMode('library')
    setStepError('')
    setEditingStep(step)
  }

  const saveStep = async () => {
    if (!stepForm.title.trim()) return
    setSavingStep(true)
    setStepError('')

    let read_item_id = stepForm.read_item_id || null

    // Direct file upload — create a Read Item automatically
    if (stepForm.step_type === 'read' && uploadMode === 'upload' && uploadFile) {
      try {
        const path = `read-items/${Date.now()}_${uploadFile.name}`
        const { error: upErr } = await supabase.storage.from('lms-documents').upload(path, uploadFile, { upsert: false })
        if (upErr) throw new Error(`Upload failed: ${upErr.message}`)

        const { data: urlData } = supabase.storage.from('lms-documents').getPublicUrl(path)
        const publicUrl = urlData?.publicUrl
        if (!publicUrl) throw new Error('Could not get public URL for the uploaded file.')

        const { data: newItem, error: insertErr } = await supabase.from('lms_read_items').insert({
          title: stepForm.title,
          doc_url: publicUrl,
          file_name: uploadFile.name,
          created_by_email: user?.email,
        }).select('id').single()
        if (insertErr) throw new Error(`Could not save document record: ${insertErr.message}`)

        read_item_id = newItem?.id || null

        // Refresh library list
        const { data: ri } = await supabase.from('lms_read_items').select('id, title').order('title')
        setReadItems(ri || [])
      } catch (err) {
        setStepError(err.message || 'Upload failed. Check that the lms-documents storage bucket exists.')
        setSavingStep(false)
        return
      }
    }

    const payload = {
      ...stepForm,
      read_item_id,
      learning_drill_id: stepForm.learning_drill_id || null,
      quiz_id: stepForm.quiz_id || null,
      test_id: stepForm.test_id || null,
      action_id: stepForm.action_id || null,
    }

    if (editingStep?.id) {
      setSteps(prev => prev.map(s => s.id === editingStep.id ? { ...s, ...payload } : s))
    } else {
      setSteps(prev => [...prev, { ...payload, id: crypto.randomUUID(), _new: true, step_order: prev.length }])
    }
    setSavingStep(false)
    setUploadFile(null)
    setUploadMode('library')
    setStepError('')
    setEditingStep(null)
  }

  const removeStep = (id) => setSteps(prev => prev.filter(s => s.id !== id))

  const moveStep = (idx, dir) => {
    const arr = [...steps]
    const swap = idx + dir
    if (swap < 0 || swap >= arr.length) return
    ;[arr[idx], arr[swap]] = [arr[swap], arr[idx]]
    setSteps(arr)
  }

  const saveChecksheet = async () => {
    if (!title.trim()) return
    setSaving(true)
    let courseId = initialCourse?.id
    if (courseId) {
      await supabase.from('lms_courses').update({ title, description, category, updated_at: new Date().toISOString() }).eq('id', courseId)
    } else {
      const { data } = await supabase.from('lms_courses').insert({ title, description, category, created_by_email: user?.email }).select('id').single()
      courseId = data?.id
    }
    if (!courseId) { setSaving(false); return }

    await supabase.from('lms_steps').delete().eq('course_id', courseId)
    if (steps.length > 0) {
      await supabase.from('lms_steps').insert(steps.map((s, i) => ({
        course_id: courseId, step_order: i, step_type: s.step_type, title: s.title,
        youtube_url: s.youtube_url || null, instructions: s.instructions || null,
        read_item_id: s.read_item_id || null, learning_drill_id: s.learning_drill_id || null,
        quiz_id: s.quiz_id || null, test_id: s.test_id || null, action_id: s.action_id || null,
      })))
    }
    setSaving(false)
    onSaved?.()
    onClose()
  }

  const setSF = (k, v) => setStepForm(f => ({ ...f, [k]: v }))

  const renderStepFields = () => {
    const sf = stepForm
    const warn = (msg) => <p className="text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">{msg}</p>
    switch (sf.step_type) {
      case 'read':
        return (
          <div className="space-y-3">
            {/* Mode toggle */}
            <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
              <button type="button" onClick={() => { setUploadMode('upload'); setSF('read_item_id', '') }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${uploadMode === 'upload' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                📎 Upload Document
              </button>
              <button type="button" onClick={() => { setUploadMode('library'); setUploadFile(null) }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${uploadMode === 'library' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                📚 Pick from Library
              </button>
            </div>

            {uploadMode === 'upload' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Attach Document *</label>
                <div
                  onClick={() => uploadRef.current?.click()}
                  className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors"
                >
                  {uploadFile ? (
                    <div className="text-center">
                      <p className="text-2xl mb-0.5">📄</p>
                      <p className="text-sm font-medium text-gray-800">{uploadFile.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Click to change</p>
                    </div>
                  ) : (
                    <div className="text-center text-gray-400">
                      <p className="text-3xl mb-1">📁</p>
                      <p className="text-sm">Click to upload (PDF, DOC, DOCX…)</p>
                    </div>
                  )}
                </div>
                <input ref={uploadRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt" className="sr-only"
                  onChange={e => setUploadFile(e.target.files?.[0] || null)} />
                {uploadFile && (
                  <p className="text-xs text-green-600 mt-1.5">✓ Document will be saved when you click "Add Step"</p>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Read Item *</label>
                {readItems.length === 0
                  ? warn('No read items yet — upload a document above, or create items in the Read Items tab.')
                  : <select value={sf.read_item_id} onChange={e => setSF('read_item_id', e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500">
                      <option value="">— Select a Read Item —</option>
                      {readItems.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                    </select>
                }
              </div>
            )}
          </div>
        )
      case 'watch':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">YouTube URL *</label>
            <input value={sf.youtube_url} onChange={e => setSF('youtube_url', e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
          </div>
        )
      case 'special_drill':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Drill Instructions *</label>
            <textarea value={sf.instructions} onChange={e => setSF('instructions', e.target.value)} rows={4}
              placeholder="Describe exactly what the employee should practice or drill…"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 resize-none" />
          </div>
        )
      case 'learning_drill':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Learning Drill *</label>
            {drills.length === 0 ? warn('No learning drills yet — create some in the Learning Drills tab first.') :
              <select value={sf.learning_drill_id} onChange={e => setSF('learning_drill_id', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500">
                <option value="">— Select a Learning Drill —</option>
                {drills.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
              </select>}
          </div>
        )
      case 'quiz':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quiz *</label>
            {quizzes.length === 0 ? warn('No quizzes yet — create some in the Quizzes tab first.') :
              <select value={sf.quiz_id} onChange={e => setSF('quiz_id', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500">
                <option value="">— Select a Quiz —</option>
                {quizzes.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}
              </select>}
          </div>
        )
      case 'final_test':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Final Test *</label>
            {tests.length === 0 ? warn('No final tests yet — create some in the Final Tests tab first.') :
              <select value={sf.test_id} onChange={e => setSF('test_id', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500">
                <option value="">— Select a Final Test —</option>
                {tests.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>}
          </div>
        )
      case 'action':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action *</label>
            {actions.length === 0 ? warn('No actions yet — create some in the Actions tab first.') :
              <select value={sf.action_id} onChange={e => setSF('action_id', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500">
                <option value="">— Select an Action —</option>
                {actions.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
              </select>}
          </div>
        )
      default: return null
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">←</button>
        <div className="flex-1">
          <h2 className="font-bold text-gray-900 text-lg">{initialCourse?.id ? 'Edit Checksheet' : 'New Checksheet'}</h2>
          <p className="text-xs text-gray-500">Build a step-by-step training course</p>
        </div>
        <button onClick={saveChecksheet} disabled={saving || !title.trim()}
          className="px-5 py-2 bg-green-700 text-white rounded-xl font-semibold hover:bg-green-800 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Checksheet'}
        </button>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar: course details */}
        <div className="w-72 bg-white border-r border-gray-200 p-5 space-y-4 overflow-y-auto flex-shrink-0">
          <h3 className="font-semibold text-gray-700 text-sm">Course Details</h3>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Irrigation Basics"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
            <input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Safety, Installation…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
              placeholder="What will employees learn?"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500 resize-none" />
          </div>
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-400">{steps.length} step{steps.length !== 1 ? 's' : ''} added</p>
          </div>
        </div>

        {/* Main: steps */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-800">Steps</h3>
              <button onClick={openNewStep}
                className="px-4 py-2 bg-green-700 text-white text-sm rounded-xl hover:bg-green-800 font-medium">
                + Add Step
              </button>
            </div>

            {loadingLibs && <p className="text-sm text-gray-400">Loading libraries…</p>}

            {!loadingLibs && steps.length === 0 && (
              <div className="text-center py-16 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
                <div className="text-5xl mb-3">📋</div>
                <p className="font-medium">No steps yet</p>
                <p className="text-sm mt-1">Click "+ Add Step" to start building this checksheet</p>
              </div>
            )}

            {steps.map((step, idx) => (
              <div key={step.id} className="bg-white border border-gray-200 rounded-2xl p-4 flex items-start gap-4">
                <div className="flex flex-col items-center gap-1 pt-0.5">
                  <button onClick={() => moveStep(idx, -1)} disabled={idx === 0}
                    className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs">▲</button>
                  <span className="text-xs font-bold text-gray-400">{idx + 1}</span>
                  <button onClick={() => moveStep(idx, 1)} disabled={idx === steps.length - 1}
                    className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs">▼</button>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <StepBadge type={step.step_type} />
                  </div>
                  <p className="font-medium text-gray-900 text-sm">{step.title}</p>
                  {step.step_type === 'watch' && step.youtube_url && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{step.youtube_url}</p>
                  )}
                  {step.step_type === 'special_drill' && step.instructions && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{step.instructions}</p>
                  )}
                </div>
                <div className="flex gap-3 flex-shrink-0">
                  <button onClick={() => openEditStep(step)} className="text-xs text-blue-600 hover:underline">Edit</button>
                  <button onClick={() => removeStep(step.id)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step editor overlay */}
      {editingStep !== null && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-gray-900 text-lg">{editingStep?.id ? 'Edit Step' : 'New Step'}</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Step Type</label>
              <div className="grid grid-cols-2 gap-2">
                {STEP_TYPES.map(t => (
                  <button key={t.value} onClick={() => setSF('step_type', t.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                      stepForm.step_type === t.value
                        ? 'border-green-500 bg-green-50 text-green-800'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}>
                    <span>{t.icon}</span> {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Step Title *</label>
              <input value={stepForm.title} onChange={e => setSF('title', e.target.value)}
                placeholder="e.g. Read the safety manual"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
            </div>

            {renderStepFields()}

            {stepError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{stepError}</p>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={saveStep} disabled={!stepForm.title.trim() || savingStep}
                className="flex-1 py-2.5 bg-green-700 text-white rounded-xl font-medium hover:bg-green-800 disabled:opacity-50">
                {savingStep ? 'Uploading…' : editingStep?.id ? 'Update Step' : 'Add Step'}
              </button>
              <button onClick={() => { setEditingStep(null); setStepError('') }} disabled={savingStep}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 disabled:opacity-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
