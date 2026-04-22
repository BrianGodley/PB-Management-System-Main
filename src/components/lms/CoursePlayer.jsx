// ─────────────────────────────────────────────────────────────────────────────
// CoursePlayer — step-by-step course taking UI for employees
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'

export default function CoursePlayer({
  assignment,
  courseSteps,
  existingCompletions,
  onClose,
  onComplete,
}) {
  const completedIds = new Set(existingCompletions.map(c => c.step_id))
  const firstIncomplete = courseSteps.findIndex(s => !completedIds.has(s.id))

  const [currentIdx,    setCurrentIdx]    = useState(firstIncomplete >= 0 ? firstIncomplete : 0)
  const [completed,     setCompleted]     = useState(new Set(completedIds))
  const [checkedItems,  setCheckedItems]  = useState({})   // stepId → Set of item.id
  const [quizAnswer,    setQuizAnswer]    = useState(null)
  const [quizResult,    setQuizResult]    = useState(null) // 'correct' | 'wrong'
  const [photoFile,     setPhotoFile]     = useState(null)
  const [saving,        setSaving]        = useState(false)
  const fileInputRef = useRef()

  const step       = courseSteps[currentIdx]
  const totalSteps = courseSteps.length
  const doneCount  = completed.size
  const progress   = totalSteps > 0 ? (doneCount / totalSteps) * 100 : 0
  const isStepDone = step ? completed.has(step.id) : false
  const allDone    = doneCount >= totalSteps
  const isLast     = currentIdx === totalSteps - 1

  // ── helpers ───────────────────────────────────────────────────────────────
  async function markDone(responseData = {}) {
    if (!step || completed.has(step.id)) return
    setSaving(true)
    await supabase.from('lms_step_completions').upsert(
      { assignment_id: assignment.id, step_id: step.id, response_data: responseData },
      { onConflict: 'assignment_id,step_id' }
    )
    setCompleted(prev => new Set([...prev, step.id]))
    setSaving(false)
  }

  function goToStep(idx) {
    setCurrentIdx(idx)
    setQuizAnswer(null)
    setQuizResult(null)
    setPhotoFile(null)
  }

  function handleNext() {
    if (!isLast) goToStep(currentIdx + 1)
    else onComplete()
  }

  // ── step-type handlers ────────────────────────────────────────────────────
  const handleTextComplete = () => markDone({ type: 'text' })

  async function handleChecklistComplete() {
    const items   = step.checklist_items || []
    const checked = checkedItems[step.id] || new Set()
    if (checked.size < items.length) return
    await markDone({ type: 'checklist', checkedItems: [...checked] })
  }

  const handlePhotoComplete = () => markDone({ type: 'photo', filename: photoFile?.name || 'uploaded' })

  async function handleQuizSubmit() {
    if (quizAnswer === null) return
    const correct = quizAnswer === step.quiz_correct_index
    setQuizResult(correct ? 'correct' : 'wrong')
    if (correct) await markDone({ type: 'quiz', answer: quizAnswer })
  }

  function toggleChecklistItem(stepId, itemId) {
    setCheckedItems(prev => {
      const set = new Set(prev[stepId] || [])
      set.has(itemId) ? set.delete(itemId) : set.add(itemId)
      return { ...prev, [stepId]: set }
    })
  }

  // ── checklist readiness ───────────────────────────────────────────────────
  const checklistItems   = step?.step_type === 'checklist' ? (step.checklist_items || []) : []
  const checkedForStep   = checkedItems[step?.id] || new Set()
  const allItemsChecked  = checkedForStep.size >= checklistItems.length && checklistItems.length > 0

  if (!step && !allDone) return null

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex">
      <div className="flex-1 flex flex-col bg-white max-w-2xl mx-auto w-full shadow-2xl overflow-hidden">

        {/* ── Header / progress ────────────────────────────────────────────── */}
        <div className="bg-green-700 text-white px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-green-200 mb-0.5">Training Course</p>
              <h2 className="font-bold text-lg leading-tight">
                {assignment.lms_courses?.title || 'Course'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-lg leading-none"
            >
              ✕
            </button>
          </div>
          <div className="h-2 bg-green-800/60 rounded-full">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <p className="text-xs text-green-200">
              {allDone ? 'All steps complete!' : `Step ${currentIdx + 1} of ${totalSteps}`}
            </p>
            <p className="text-xs text-green-200">{doneCount} / {totalSteps} done</p>
          </div>
        </div>

        {/* ── Step breadcrumb dots ──────────────────────────────────────────── */}
        <div className="flex gap-1.5 px-4 py-2 bg-gray-50 border-b border-gray-200 overflow-x-auto">
          {courseSteps.map((s, i) => (
            <button
              key={s.id}
              onClick={() => goToStep(i)}
              title={s.title}
              className={`flex-shrink-0 w-7 h-7 rounded-full text-xs font-bold transition-colors ${
                i === currentIdx
                  ? 'bg-green-700 text-white'
                  : completed.has(s.id)
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {completed.has(s.id) && i !== currentIdx ? '✓' : i + 1}
            </button>
          ))}
        </div>

        {/* ── Step content ──────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6">

          {allDone ? (
            /* ── All done screen ── */
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Course Complete!</h3>
              <p className="text-gray-500 mb-6">You've finished all {totalSteps} steps.</p>
              <button
                onClick={onComplete}
                className="px-6 py-3 bg-green-700 text-white rounded-xl font-semibold hover:bg-green-800"
              >
                Finish &amp; Close
              </button>
            </div>
          ) : (
            <div className="space-y-5">

              {/* Step title + type badge */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    {{ text: '📄 Instructions', checklist: '✅ Checklist', photo: '📷 Photo Upload', quiz: '❓ Quiz' }[step.step_type]}
                  </span>
                  {isStepDone && (
                    <span className="text-xs text-green-700 font-medium">✓ Completed</span>
                  )}
                </div>
                <h3 className="text-xl font-bold text-gray-900">{step.title}</h3>
              </div>

              {/* ── TEXT step ── */}
              {step.step_type === 'text' && (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {step.content || 'Read this step and mark it complete when ready.'}
                  </div>
                  {!isStepDone && (
                    <button
                      onClick={handleTextComplete}
                      disabled={saving}
                      className="w-full py-3 bg-green-700 text-white rounded-xl font-semibold hover:bg-green-800 disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : '✓ Mark Complete'}
                    </button>
                  )}
                </div>
              )}

              {/* ── CHECKLIST step ── */}
              {step.step_type === 'checklist' && (
                <div className="space-y-4">
                  {step.content && (
                    <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed">
                      {step.content}
                    </div>
                  )}
                  <div className="space-y-2">
                    {checklistItems.map(item => {
                      const checked = checkedForStep.has(item.id)
                      return (
                        <label
                          key={item.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                            checked ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200 hover:border-gray-300'
                          } ${isStepDone ? 'pointer-events-none' : ''}`}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            checked ? 'bg-green-700 border-green-700' : 'border-gray-300'
                          }`}>
                            {checked && <span className="text-white text-xs font-bold">✓</span>}
                          </div>
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={checked}
                            onChange={() => !isStepDone && toggleChecklistItem(step.id, item.id)}
                          />
                          <span className={`text-sm ${checked ? 'text-green-700 line-through' : 'text-gray-700'}`}>
                            {item.label}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                  {!isStepDone && (
                    <button
                      onClick={handleChecklistComplete}
                      disabled={!allItemsChecked || saving}
                      className="w-full py-3 bg-green-700 text-white rounded-xl font-semibold hover:bg-green-800 disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : `✓ All Checked — Mark Complete`}
                    </button>
                  )}
                </div>
              )}

              {/* ── PHOTO step ── */}
              {step.step_type === 'photo' && (
                <div className="space-y-4">
                  {step.content && (
                    <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed">
                      {step.content}
                    </div>
                  )}
                  {!isStepDone ? (
                    <>
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center justify-center h-40 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors"
                      >
                        {photoFile ? (
                          <div className="text-center">
                            <p className="text-3xl mb-1">📎</p>
                            <p className="text-sm font-medium text-gray-700">{photoFile.name}</p>
                            <p className="text-xs text-gray-400 mt-1">Click to change</p>
                          </div>
                        ) : (
                          <div className="text-center text-gray-400">
                            <p className="text-3xl mb-1">📷</p>
                            <p className="text-sm">Click to upload photo or file</p>
                          </div>
                        )}
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="sr-only"
                        onChange={e => setPhotoFile(e.target.files?.[0] || null)}
                      />
                      <button
                        onClick={handlePhotoComplete}
                        disabled={!photoFile || saving}
                        className="w-full py-3 bg-green-700 text-white rounded-xl font-semibold hover:bg-green-800 disabled:opacity-50"
                      >
                        {saving ? 'Saving…' : '✓ Submit & Complete'}
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-xl p-4">
                      <span className="text-lg">✓</span>
                      <span className="text-sm font-medium">Photo submitted successfully</span>
                    </div>
                  )}
                </div>
              )}

              {/* ── QUIZ step ── */}
              {step.step_type === 'quiz' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 rounded-xl p-4 text-sm font-semibold text-blue-900">
                    {step.quiz_question || 'Answer the following question:'}
                  </div>
                  <div className="space-y-2">
                    {(step.quiz_options || []).filter(o => o.trim()).map((opt, i) => {
                      const isSelected = quizAnswer === i
                      const isCorrect  = step.quiz_correct_index === i
                      const showResult = quizResult !== null

                      let cls = 'bg-white border-gray-200'
                      if (!showResult && isSelected)          cls = 'bg-blue-50 border-blue-400'
                      if (showResult  && isCorrect)           cls = 'bg-green-50 border-green-500'
                      if (showResult  && isSelected && !isCorrect) cls = 'bg-red-50 border-red-400'

                      return (
                        <button
                          key={i}
                          onClick={() => !quizResult && !isStepDone && setQuizAnswer(i)}
                          disabled={!!quizResult || isStepDone}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-colors ${cls}`}
                        >
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                            !showResult && isSelected                   ? 'border-blue-500 bg-blue-500 text-white' :
                            showResult  && isCorrect                    ? 'border-green-500 bg-green-500 text-white' :
                            showResult  && isSelected && !isCorrect     ? 'border-red-400 bg-red-400 text-white' :
                            'border-gray-300 text-gray-500'
                          }`}>
                            {showResult && isCorrect             ? '✓'
                             : showResult && isSelected          ? '✕'
                             : String.fromCharCode(65 + i)}
                          </div>
                          <span className="text-sm text-gray-800">{opt}</span>
                        </button>
                      )
                    })}
                  </div>

                  {quizResult === 'correct' && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 font-medium">
                      🎉 Correct! Great job.
                    </div>
                  )}
                  {quizResult === 'wrong' && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center justify-between">
                      <span>✕ Not quite — try again.</span>
                      <button
                        onClick={() => { setQuizAnswer(null); setQuizResult(null) }}
                        className="underline font-medium ml-3"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {!quizResult && !isStepDone && (
                    <button
                      onClick={handleQuizSubmit}
                      disabled={quizAnswer === null || saving}
                      className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50"
                    >
                      Submit Answer
                    </button>
                  )}
                </div>
              )}

            </div>
          )}
        </div>

        {/* ── Footer navigation ─────────────────────────────────────────────── */}
        {!allDone && (
          <div className="px-6 py-4 bg-white border-t border-gray-200 flex items-center justify-between flex-shrink-0">
            <button
              onClick={() => goToStep(Math.max(0, currentIdx - 1))}
              disabled={currentIdx === 0}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-30"
            >
              ← Previous
            </button>
            <span className="text-xs text-gray-400">{currentIdx + 1} / {totalSteps}</span>
            <button
              onClick={handleNext}
              disabled={!isStepDone}
              className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-800 disabled:opacity-30"
            >
              {isLast ? 'Finish ✓' : 'Next →'}
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
