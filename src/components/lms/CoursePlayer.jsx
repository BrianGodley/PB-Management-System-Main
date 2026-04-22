// ─────────────────────────────────────────────────────────────────────────────
// CoursePlayer — employee-facing step-by-step course player
// Handles all 7 step types with appropriate viewer UIs
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

// Extract YouTube video ID from various URL formats
function getYouTubeId(url) {
  if (!url) return null
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/)
  return m ? m[1] : null
}

// ── Step type badge ─────────────────────────────────────────────────────────
const TYPE_META = {
  read:           { label: 'Read',           icon: '📖', color: 'bg-blue-100 text-blue-700' },
  watch:          { label: 'Watch',          icon: '▶️',  color: 'bg-red-100 text-red-700' },
  special_drill:  { label: 'Special Drill',  icon: '🔧', color: 'bg-orange-100 text-orange-700' },
  learning_drill: { label: 'Learning Drill', icon: '🔁', color: 'bg-purple-100 text-purple-700' },
  quiz:           { label: 'Quiz',           icon: '📝', color: 'bg-yellow-100 text-yellow-700' },
  final_test:     { label: 'Final Test',     icon: '🎓', color: 'bg-green-100 text-green-700' },
  action:         { label: 'Action',         icon: '⚡', color: 'bg-pink-100 text-pink-700' },
}

// ── Quiz / Test player ──────────────────────────────────────────────────────
function QuizPlayer({ questions, passingScore, maxAttempts, attemptsUsed, onPass, onFail }) {
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(null)
  const [passed, setPassed] = useState(false)

  const attemptsLeft = maxAttempts - attemptsUsed
  const canAttempt = attemptsLeft > 0

  const submit = async () => {
    const correct = questions.filter((q, i) => answers[i] === q.correct_index).length
    const pct = Math.round((correct / questions.length) * 100)
    const didPass = pct >= passingScore
    setScore(pct)
    setPassed(didPass)
    setSubmitted(true)
    if (didPass) onPass(pct)
    else onFail(pct)
  }

  const retry = () => {
    setAnswers({})
    setSubmitted(false)
    setScore(null)
    setPassed(false)
  }

  if (!canAttempt && !submitted) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-3">🚫</div>
        <h3 className="font-bold text-gray-900 text-lg mb-2">No attempts remaining</h3>
        <p className="text-gray-500 text-sm">You've used all {maxAttempts} attempt{maxAttempts !== 1 ? 's' : ''}. Please speak with your trainer.</p>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">{passed ? '🎉' : '😔'}</div>
        <h3 className="font-bold text-gray-900 text-xl mb-1">
          {passed ? 'Passed!' : 'Not quite'}
        </h3>
        <p className="text-gray-500 mb-2">Your score: <span className={`font-bold text-lg ${passed ? 'text-green-600' : 'text-red-500'}`}>{score}%</span></p>
        <p className="text-gray-400 text-sm mb-6">Passing score: {passingScore}%</p>
        {!passed && attemptsLeft - 1 > 0 && (
          <button onClick={retry}
            className="px-6 py-2.5 bg-green-700 text-white rounded-xl font-medium hover:bg-green-800">
            Try Again ({attemptsLeft - 1} attempt{attemptsLeft - 1 !== 1 ? 's' : ''} left)
          </button>
        )}
        {!passed && attemptsLeft - 1 <= 0 && (
          <p className="text-sm text-red-500">No more attempts remaining.</p>
        )}
      </div>
    )
  }

  const allAnswered = questions.every((_, i) => answers[i] !== undefined)

  return (
    <div className="space-y-6">
      {attemptsUsed > 0 && (
        <p className="text-xs text-orange-600 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
          Attempt {attemptsUsed + 1} of {maxAttempts} — Passing score: {passingScore}%
        </p>
      )}
      {questions.map((q, qi) => (
        <div key={qi} className="bg-gray-50 rounded-2xl p-5">
          <p className="font-semibold text-gray-900 mb-4">{qi + 1}. {q.question}</p>
          <div className="space-y-2">
            {q.options.filter(o => o.trim()).map((opt, oi) => (
              <label key={oi}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${
                  answers[qi] === oi
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}>
                <input type="radio" name={`q${qi}`} checked={answers[qi] === oi}
                  onChange={() => setAnswers(a => ({ ...a, [qi]: oi }))}
                  className="accent-green-600" />
                <span className="text-sm text-gray-800">{opt}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
      <button onClick={submit} disabled={!allAnswered}
        className="w-full py-3.5 bg-green-700 text-white rounded-2xl font-bold hover:bg-green-800 disabled:opacity-40">
        Submit Answers
      </button>
    </div>
  )
}

// ── Document viewer modal ───────────────────────────────────────────────────
function DocViewer({ readItem, onRead, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-[70] flex flex-col">
      <div className="flex items-center gap-3 px-5 py-3 bg-white border-b border-gray-200 flex-shrink-0">
        <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-lg">✕</button>
        <h3 className="font-semibold text-gray-900 flex-1 truncate">{readItem.title}</h3>
        <a href={readItem.doc_url} target="_blank" rel="noreferrer"
          className="text-xs text-blue-600 hover:underline flex-shrink-0">Open in new tab ↗</a>
      </div>
      <div className="flex-1 min-h-0">
        <iframe src={readItem.doc_url} className="w-full h-full border-0" title={readItem.title} />
      </div>
      <div className="p-4 bg-white border-t border-gray-200 flex-shrink-0">
        <button onClick={onRead}
          className="w-full py-3.5 bg-green-700 text-white rounded-2xl font-bold text-lg hover:bg-green-800">
          ✓ I have read this document
        </button>
      </div>
    </div>
  )
}

// ── YouTube viewer modal ────────────────────────────────────────────────────
function VideoViewer({ step, onComplete, onClose }) {
  const videoId = getYouTubeId(step.youtube_url)
  return (
    <div className="fixed inset-0 bg-black/90 z-[70] flex flex-col">
      <div className="flex items-center gap-3 px-5 py-3 bg-black/50 flex-shrink-0">
        <button onClick={onClose} className="text-white/70 hover:text-white text-lg">✕</button>
        <h3 className="font-semibold text-white flex-1 truncate">{step.title}</h3>
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center p-4">
        {videoId ? (
          <iframe
            className="w-full max-w-4xl rounded-xl"
            style={{ aspectRatio: '16/9' }}
            src={`https://www.youtube.com/embed/${videoId}?rel=0`}
            title={step.title}
            allowFullScreen
          />
        ) : (
          <div className="text-center text-white/60">
            <p className="mb-2">Could not load video.</p>
            <a href={step.youtube_url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Open on YouTube ↗</a>
          </div>
        )}
      </div>
      <div className="p-4 flex-shrink-0">
        <button onClick={onComplete}
          className="w-full py-3.5 bg-green-600 text-white rounded-2xl font-bold text-lg hover:bg-green-700">
          ✓ Video Watched — Mark Complete
        </button>
      </div>
    </div>
  )
}

// ── Main CoursePlayer ───────────────────────────────────────────────────────
export default function CoursePlayer({ assignment, onClose }) {
  const [steps, setSteps] = useState([])
  const [completions, setCompletions] = useState([])  // set of step_ids
  const [attempts, setAttempts] = useState([])         // all attempt rows
  const [currentIdx, setCurrentIdx] = useState(0)
  const [loading, setLoading] = useState(true)

  // Viewer states
  const [showDocViewer, setShowDocViewer] = useState(false)
  const [showVideoViewer, setShowVideoViewer] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      // Load steps with all linked library items via Supabase FK select
      const { data: stepsData } = await supabase.from('lms_steps')
        .select(`*,
          read_item:lms_read_items(*),
          learning_drill:lms_learning_drills(*),
          quiz:lms_quizzes(*),
          test:lms_tests(*),
          action:lms_actions(*)
        `)
        .eq('course_id', assignment.course_id)
        .order('step_order')

      // Load completions
      const { data: compData } = await supabase.from('lms_step_completions')
        .select('step_id').eq('assignment_id', assignment.id)

      // Load attempt history
      const { data: attData } = await supabase.from('lms_quiz_attempts')
        .select('*').eq('assignment_id', assignment.id)

      setSteps(stepsData || [])
      setCompletions(new Set((compData || []).map(c => c.step_id)))
      setAttempts(attData || [])

      // Advance to first incomplete step
      const incomplete = (stepsData || []).findIndex(s => !(compData || []).some(c => c.step_id === s.id))
      setCurrentIdx(incomplete >= 0 ? incomplete : 0)
      setLoading(false)
    }
    load()
  }, [assignment.id, assignment.course_id])

  const completeStep = async (stepId, score = null) => {
    await supabase.from('lms_step_completions').upsert({ assignment_id: assignment.id, step_id: stepId, score }, { onConflict: 'assignment_id,step_id' })
    setCompletions(prev => new Set([...prev, stepId]))
    if (currentIdx < steps.length - 1) {
      setCurrentIdx(currentIdx + 1)
    }
  }

  const recordAttempt = async (stepId, score, passed) => {
    const { data } = await supabase.from('lms_quiz_attempts').insert({ assignment_id: assignment.id, step_id: stepId, score, passed }).select()
    if (data?.[0]) setAttempts(prev => [...prev, data[0]])
  }

  const isComplete = (stepId) => completions.has(stepId)
  const allDone = steps.length > 0 && steps.every(s => isComplete(s.id))

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-50 z-50 flex items-center justify-center">
        <p className="text-gray-400">Loading course…</p>
      </div>
    )
  }

  if (allDone) {
    return (
      <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col items-center justify-center p-8">
        <div className="text-7xl mb-4">🏆</div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Course Complete!</h2>
        <p className="text-gray-500 mb-8 text-center">You've completed all steps in this checksheet.</p>
        <button onClick={onClose} className="px-8 py-3 bg-green-700 text-white rounded-2xl font-bold text-lg hover:bg-green-800">
          Done
        </button>
      </div>
    )
  }

  const step = steps[currentIdx]
  if (!step) return null

  const stepDone = isComplete(step.id)
  const stepAttempts = attempts.filter(a => a.step_id === step.id)
  const tm = TYPE_META[step.step_type] || {}

  const renderStepContent = () => {
    switch (step.step_type) {
      case 'read':
        return (
          <div className="space-y-6">
            {step.read_item?.description && (
              <p className="text-gray-600">{step.read_item.description}</p>
            )}
            {step.read_item?.doc_url ? (
              <button onClick={() => setShowDocViewer(true)}
                className="w-full flex items-center gap-4 p-5 bg-blue-50 border-2 border-blue-200 rounded-2xl hover:border-blue-400 transition-colors text-left">
                <span className="text-4xl">📄</span>
                <div>
                  <p className="font-semibold text-blue-800">{step.read_item?.title || 'Open Document'}</p>
                  <p className="text-sm text-blue-600 mt-0.5">Click to open and read — then mark as read</p>
                </div>
              </button>
            ) : (
              <p className="text-sm text-gray-400 italic">No document attached to this read item.</p>
            )}
            {!stepDone && step.read_item?.doc_url && (
              <p className="text-xs text-gray-400 text-center">Open the document above, then click "I have read this document" at the bottom.</p>
            )}
          </div>
        )

      case 'watch':
        return (
          <div className="space-y-6">
            <button onClick={() => setShowVideoViewer(true)}
              className="w-full flex items-center gap-4 p-5 bg-red-50 border-2 border-red-200 rounded-2xl hover:border-red-400 transition-colors text-left">
              <span className="text-4xl">▶️</span>
              <div>
                <p className="font-semibold text-red-800">Watch Video</p>
                <p className="text-sm text-red-600 mt-0.5">Click to open the video player</p>
              </div>
            </button>
          </div>
        )

      case 'special_drill':
        return (
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
              <p className="font-semibold text-orange-800 mb-2">🔧 Drill Instructions</p>
              <p className="text-gray-700 whitespace-pre-wrap">{step.instructions}</p>
            </div>
            {!stepDone && (
              <button onClick={() => completeStep(step.id)}
                className="w-full py-3.5 bg-orange-600 text-white rounded-2xl font-bold text-lg hover:bg-orange-700">
                ✓ Drill Complete — Mark Done
              </button>
            )}
          </div>
        )

      case 'learning_drill':
        return (
          <div className="space-y-4">
            {step.learning_drill?.description && (
              <p className="text-gray-500 text-sm">{step.learning_drill.description}</p>
            )}
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5">
              <p className="text-gray-800 whitespace-pre-wrap">{step.learning_drill?.content || 'No content available.'}</p>
            </div>
            {!stepDone && (
              <button onClick={() => completeStep(step.id)}
                className="w-full py-3.5 bg-purple-600 text-white rounded-2xl font-bold text-lg hover:bg-purple-700">
                ✓ Drill Complete — Mark Done
              </button>
            )}
          </div>
        )

      case 'quiz':
      case 'final_test': {
        const item = step.step_type === 'quiz' ? step.quiz : step.test
        if (!item) return <p className="text-gray-400">Quiz/test not found.</p>
        if (stepDone) return (
          <div className="text-center py-10">
            <div className="text-5xl mb-3">✅</div>
            <p className="font-bold text-green-700 text-lg">Passed!</p>
            <p className="text-gray-400 text-sm mt-1">Score: {stepAttempts.find(a => a.passed)?.score ?? '—'}%</p>
          </div>
        )
        return (
          <QuizPlayer
            questions={item.questions || []}
            passingScore={item.passing_score}
            maxAttempts={item.max_attempts}
            attemptsUsed={stepAttempts.length}
            onPass={async (score) => {
              await recordAttempt(step.id, score, true)
              await completeStep(step.id, score)
            }}
            onFail={async (score) => {
              await recordAttempt(step.id, score, false)
            }}
          />
        )
      }

      case 'action':
        return (
          <div className="space-y-4">
            <div className="bg-pink-50 border border-pink-200 rounded-2xl p-5">
              <p className="font-semibold text-pink-800 mb-2">⚡ Your Action</p>
              <p className="text-gray-700 whitespace-pre-wrap">{step.action?.instructions || 'No instructions provided.'}</p>
            </div>
            {!stepDone && (
              <button onClick={() => completeStep(step.id)}
                className="w-full py-3.5 bg-pink-600 text-white rounded-2xl font-bold text-lg hover:bg-pink-700">
                ✓ Action Complete — Mark Done
              </button>
            )}
          </div>
        )

      default: return <p className="text-gray-400">Unknown step type.</p>
    }
  }

  const progressPct = steps.length > 0 ? Math.round((completions.size / steps.length) * 100) : 0

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center gap-4 mb-3">
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
          <div className="flex-1">
            <h2 className="font-bold text-gray-900">{assignment.course?.title || 'Course'}</h2>
            <p className="text-xs text-gray-500">{completions.size} of {steps.length} steps complete</p>
          </div>
          <span className="text-sm font-bold text-green-700">{progressPct}%</span>
        </div>
        {/* Progress bar */}
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-green-600 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
        </div>
        {/* Step dots */}
        <div className="flex gap-1.5 mt-3 flex-wrap">
          {steps.map((s, i) => (
            <button key={s.id} onClick={() => setCurrentIdx(i)}
              className={`w-6 h-6 rounded-full text-xs font-bold transition-all ${
                isComplete(s.id) ? 'bg-green-600 text-white'
                : i === currentIdx ? 'bg-green-200 text-green-800 ring-2 ring-green-500'
                : 'bg-gray-200 text-gray-400'
              }`}>
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          {/* Step header */}
          <div className="mb-6">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${tm.color || 'bg-gray-100 text-gray-600'}`}>
              {tm.icon} {tm.label}
            </span>
            <h3 className="text-2xl font-bold text-gray-900 mt-3">{step.title}</h3>
            {stepDone && step.step_type !== 'quiz' && step.step_type !== 'final_test' && (
              <div className="flex items-center gap-2 mt-2 text-green-600">
                <span className="text-lg">✅</span>
                <span className="text-sm font-medium">Completed</span>
              </div>
            )}
          </div>

          {renderStepContent()}

          {/* Next step button when done */}
          {stepDone && currentIdx < steps.length - 1 && (
            <div className="mt-6">
              <button onClick={() => setCurrentIdx(currentIdx + 1)}
                className="w-full py-3.5 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800">
                Next Step →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Document viewer modal */}
      {showDocViewer && step.read_item?.doc_url && (
        <DocViewer
          readItem={step.read_item}
          onClose={() => setShowDocViewer(false)}
          onRead={() => {
            setShowDocViewer(false)
            completeStep(step.id)
          }}
        />
      )}

      {/* Video viewer modal */}
      {showVideoViewer && (
        <VideoViewer
          step={step}
          onClose={() => setShowVideoViewer(false)}
          onComplete={() => {
            setShowVideoViewer(false)
            completeStep(step.id)
          }}
        />
      )}
    </div>
  )
}
