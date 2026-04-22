// ─────────────────────────────────────────────────────────────────────────────
// LMS — Learning Management System (v2)
// Admin section (role-gated): Checksheets, content libraries, assignments, progress
// Employee section: My assigned courses with rich progress cards
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import ChecksheetBuilder from '../components/lms/ChecksheetBuilder'
import CoursePlayer from '../components/lms/CoursePlayer'
import ReadItemsManager from '../components/lms/admin/ReadItemsManager'
import LearningDrillsManager from '../components/lms/admin/LearningDrillsManager'
import QuizzesManager from '../components/lms/admin/QuizzesManager'
import TestsManager from '../components/lms/admin/TestsManager'
import ActionsManager from '../components/lms/admin/ActionsManager'
import CourseAssignmentsManager from '../components/lms/admin/CourseAssignmentsManager'

const ADMIN_TABS = [
  { key: 'checksheets',  label: 'Checksheets',       icon: '📋' },
  { key: 'assignments',  label: 'Course Assignments', icon: '🎯' },
  { key: 'read_items',   label: 'Read Items',         icon: '📖' },
  { key: 'drills',       label: 'Learning Drills',    icon: '🔁' },
  { key: 'quizzes',      label: 'Quizzes',            icon: '📝' },
  { key: 'tests',        label: 'Final Tests',        icon: '🎓' },
  { key: 'actions',      label: 'Actions',            icon: '⚡' },
  { key: 'progress',     label: 'Progress',           icon: '📊' },
]

function fmt(dateStr) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Rich My Training card ──────────────────────────────────────────────────
function TrainingCard({ a, onStart }) {
  const pct = a.total_steps > 0 ? Math.round((a.done_steps / a.total_steps) * 100) : 0
  const done = pct === 100
  const started = !!a.started_at

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
      {/* Card header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 truncate">{a.course?.title}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{a.course?.category || 'General'}</p>
          </div>
          {done && <span className="text-green-600 text-xl flex-shrink-0">✅</span>}
        </div>

        {/* Progress bar */}
        <div className="mt-4 mb-1">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-gray-500">{a.done_steps} of {a.total_steps} steps complete</span>
            <span className={`font-bold ${done ? 'text-green-600' : 'text-gray-700'}`}>{pct}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${done ? 'bg-green-500' : 'bg-green-400'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Scores section */}
      {(a.quiz_results?.length > 0 || a.test_results?.length > 0) && (
        <div className="px-5 pb-4 space-y-3">
          {a.quiz_results?.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3">
              <p className="text-xs font-semibold text-yellow-800 mb-2">📝 Quizzes Passed</p>
              <div className="space-y-1.5">
                {a.quiz_results.map((q, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 truncate mr-2">{q.title}</span>
                    <span className="text-xs font-bold text-green-700 flex-shrink-0 bg-green-100 px-2 py-0.5 rounded-full">
                      {q.score}% ✓
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {a.test_results?.length > 0 && (
            <div className="bg-green-50 border border-green-100 rounded-xl p-3">
              <p className="text-xs font-semibold text-green-800 mb-2">🎓 Final Test</p>
              <div className="space-y-1.5">
                {a.test_results.map((t, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 truncate mr-2">{t.title}</span>
                    <span className="text-xs font-bold text-green-700 flex-shrink-0 bg-green-100 px-2 py-0.5 rounded-full">
                      {t.score}% ✓
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dates + CTA */}
      <div className="border-t border-gray-100 px-5 py-4 flex items-end justify-between gap-4">
        <div className="space-y-0.5">
          {a.started_at ? (
            <>
              <p className="text-xs text-gray-400">📅 Started {fmt(a.started_at)}</p>
              {a.last_activity && a.last_activity !== a.started_at && (
                <p className="text-xs text-gray-400">🕐 Last activity {fmt(a.last_activity)}</p>
              )}
            </>
          ) : (
            <p className="text-xs text-gray-400 italic">Not started yet</p>
          )}
        </div>
        <button
          onClick={() => onStart(a)}
          className={`flex-shrink-0 px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${
            !started
              ? 'bg-green-700 text-white hover:bg-green-800'
              : done
              ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              : 'bg-green-700 text-white hover:bg-green-800'
          }`}
        >
          {!started ? 'Start Course' : done ? 'Review' : 'Continue →'}
        </button>
      </div>
    </div>
  )
}

// ── Main LMS page ───────────────────────────────────────────────────────────
export default function LMS() {
  const { user } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [mainTab, setMainTab] = useState('training')
  const [adminTab, setAdminTab] = useState('checksheets')

  // Admin: checksheets list
  const [courses, setCourses] = useState([])
  const [coursesLoading, setCoursesLoading] = useState(false)

  // Admin: progress view
  const [progressEmployees, setProgressEmployees] = useState([])
  const [allAssignments, setAllAssignments] = useState([])
  const [allCompletions, setAllCompletions] = useState([])

  // My Training
  const [assignments, setAssignments] = useState([])
  const [myEmployee, setMyEmployee] = useState(null)
  const [trainingLoading, setTrainingLoading] = useState(false)

  // Modals
  const [showBuilder, setShowBuilder] = useState(false)
  const [editCourse, setEditCourse] = useState(null)
  const [showPlayer, setShowPlayer] = useState(null)
  const [showAssign, setShowAssign] = useState(null)
  const [assignEmployee, setAssignEmployee] = useState('')
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    supabase.from('profiles').select('role').eq('id', user.id).single()
      .then(({ data }) => { if (data?.role === 'admin') setIsAdmin(true) })
  }, [user?.id])

  useEffect(() => {
    if (mainTab === 'admin' && adminTab === 'checksheets') loadCourses()
    if (mainTab === 'admin' && adminTab === 'progress') loadProgress()
  }, [mainTab, adminTab])

  useEffect(() => {
    if (mainTab === 'training') loadMyTraining()
  }, [mainTab, user?.email])

  const loadCourses = async () => {
    setCoursesLoading(true)
    const { data } = await supabase.from('lms_courses').select('*').order('created_at', { ascending: false })
    if (data?.length) {
      const counts = await Promise.all(
        data.map(c => supabase.from('lms_steps').select('id', { count: 'exact', head: true }).eq('course_id', c.id))
      )
      setCourses(data.map((c, i) => ({ ...c, step_count: counts[i].count || 0 })))
    } else {
      setCourses([])
    }
    setCoursesLoading(false)
  }

  const loadProgress = async () => {
    const [empRes, assRes, compRes] = await Promise.all([
      supabase.from('employees').select('id, first_name, last_name').eq('status', 'active').order('last_name'),
      supabase.from('lms_assignments').select('*, course:lms_courses(title)').order('assigned_at', { ascending: false }),
      supabase.from('lms_step_completions').select('assignment_id, step_id'),
    ])
    setProgressEmployees(empRes.data || [])
    setAllAssignments(assRes.data || [])
    setAllCompletions(compRes.data || [])
  }

  const loadMyTraining = async () => {
    setTrainingLoading(true)
    const { data: emp } = await supabase.from('employees').select('id, first_name, last_name').eq('email', user?.email).maybeSingle()
    setMyEmployee(emp || null)

    if (!emp) { setTrainingLoading(false); return }

    const { data: asgn } = await supabase.from('lms_assignments')
      .select('*, course:lms_courses(*)')
      .eq('employee_id', emp.id)
      .order('assigned_at', { ascending: false })

    if (!asgn?.length) { setAssignments([]); setTrainingLoading(false); return }

    const assignmentIds = asgn.map(a => a.id)
    const courseIds = [...new Set(asgn.map(a => a.course_id))]

    // Batch load all needed data
    const [stepsRes, compsRes, attemptsRes] = await Promise.all([
      supabase.from('lms_steps').select('id, course_id, step_type, title').in('course_id', courseIds).order('step_order'),
      supabase.from('lms_step_completions').select('*').in('assignment_id', assignmentIds),
      supabase.from('lms_quiz_attempts').select('*').in('assignment_id', assignmentIds),
    ])

    const allSteps    = stepsRes.data    || []
    const allComps    = compsRes.data    || []
    const allAttempts = attemptsRes.data || []

    const enriched = asgn.map(a => {
      const steps = allSteps.filter(s => s.course_id === a.course_id)
      const comps = allComps.filter(c => c.assignment_id === a.id)
      const atts  = allAttempts.filter(at => at.assignment_id === a.id)

      // Quiz and test completions (with scores)
      const quizResults = steps
        .filter(s => s.step_type === 'quiz')
        .map(s => { const c = comps.find(c => c.step_id === s.id); return c ? { title: s.title, score: c.score } : null })
        .filter(Boolean)

      const testResults = steps
        .filter(s => s.step_type === 'final_test')
        .map(s => { const c = comps.find(c => c.step_id === s.id); return c ? { title: s.title, score: c.score } : null })
        .filter(Boolean)

      // Activity timestamps
      const allTs = [
        ...comps.map(c => c.completed_at),
        ...atts.map(at => at.attempted_at),
      ].filter(Boolean).sort()

      return {
        ...a,
        total_steps:  steps.length,
        done_steps:   comps.length,
        quiz_results: quizResults,
        test_results: testResults,
        started_at:   allTs[0] || null,
        last_activity: allTs[allTs.length - 1] || null,
      }
    })

    setAssignments(enriched)
    setTrainingLoading(false)
  }

  const deleteCourse = async (id) => {
    if (!confirm('Delete this checksheet and all its steps?')) return
    await supabase.from('lms_courses').delete().eq('id', id)
    loadCourses()
  }

  const assignFromChecksheets = async () => {
    if (!assignEmployee || !showAssign) return
    setAssigning(true)
    await supabase.from('lms_assignments').upsert({ course_id: showAssign.id, employee_id: assignEmployee }, { onConflict: 'course_id,employee_id' })
    setAssigning(false)
    setShowAssign(null)
    setAssignEmployee('')
  }

  // ── Admin: Checksheets ──────────────────────────────────────────────────────
  const renderChecksheets = () => (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-semibold text-gray-800">Checksheets</h3>
          <p className="text-xs text-gray-500 mt-0.5">Build step-by-step training courses for employees.</p>
        </div>
        <button onClick={() => { setEditCourse(null); setShowBuilder(true) }}
          className="px-4 py-2 bg-green-700 text-white rounded-xl font-medium hover:bg-green-800">
          + New Checksheet
        </button>
      </div>

      {coursesLoading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : courses.length === 0 ? (
        <div className="text-center py-14 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
          <div className="text-5xl mb-3">📋</div>
          <p className="font-medium">No checksheets yet</p>
          <p className="text-sm mt-1">Click "+ New Checksheet" to create the first one.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">Checksheet</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">Category</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">Steps</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">Created By</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">Date</th>
                <th className="py-2.5 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {courses.map(course => (
                <tr key={course.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <p className="font-medium text-gray-900">{course.title}</p>
                    {course.description && <p className="text-xs text-gray-400 truncate max-w-xs">{course.description}</p>}
                  </td>
                  <td className="py-3 px-4 text-gray-500 text-xs">{course.category || '—'}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                      {course.step_count} step{course.step_count !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-400 text-xs">{course.created_by_email || '—'}</td>
                  <td className="py-3 px-4 text-gray-400 text-xs">{new Date(course.created_at).toLocaleDateString()}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-3">
                      <button onClick={() => { setEditCourse(course); setShowBuilder(true) }}
                        className="text-xs text-blue-600 hover:underline">Edit</button>
                      <button onClick={() => setShowAssign(course)}
                        className="text-xs text-green-700 hover:underline">Assign</button>
                      <button onClick={() => deleteCourse(course.id)}
                        className="text-xs text-red-400 hover:text-red-600">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  // ── Admin: Progress ─────────────────────────────────────────────────────────
  const renderProgress = () => {
    const getProgress = (empId) => {
      return allAssignments.filter(a => a.employee_id === empId).map(a => ({
        ...a,
        done: allCompletions.filter(c => c.assignment_id === a.id).length,
      }))
    }
    return (
      <div>
        <h3 className="font-semibold text-gray-800 mb-4">Employee Training Progress</h3>
        {progressEmployees.length === 0 ? (
          <p className="text-sm text-gray-400">No active employees found.</p>
        ) : (
          <div className="space-y-4">
            {progressEmployees.map(emp => {
              const empProgress = getProgress(emp.id)
              return (
                <div key={emp.id} className="bg-white border border-gray-200 rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-sm font-bold text-green-700">
                      {emp.first_name?.[0]}{emp.last_name?.[0]}
                    </div>
                    <p className="font-medium text-gray-900">{emp.first_name} {emp.last_name}</p>
                    <span className="ml-auto text-xs text-gray-400">{empProgress.length} course{empProgress.length !== 1 ? 's' : ''} assigned</span>
                  </div>
                  {empProgress.length === 0 ? (
                    <p className="text-xs text-gray-400 pl-12">No courses assigned</p>
                  ) : (
                    <div className="space-y-2 pl-12">
                      {empProgress.map(a => (
                        <div key={a.id} className="flex items-center gap-3">
                          <span className="text-xs text-gray-700 flex-1 truncate">{a.course?.title}</span>
                          <span className="text-xs text-gray-400">{a.done} steps done</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── My Training ─────────────────────────────────────────────────────────────
  const renderMyTraining = () => {
    if (trainingLoading) return <p className="text-sm text-gray-400 py-6">Loading your courses…</p>

    if (!myEmployee) {
      return (
        <div className="text-center py-14 text-gray-400">
          <div className="text-5xl mb-3">🔍</div>
          <p className="font-medium text-gray-700">No employee record found</p>
          <p className="text-sm mt-2">Your account ({user?.email}) isn't linked to an employee profile yet. Ask an admin to set it up.</p>
        </div>
      )
    }

    if (assignments.length === 0) {
      return (
        <div className="text-center py-14 text-gray-400">
          <div className="text-5xl mb-3">🎓</div>
          <p className="font-medium">No courses assigned yet</p>
          <p className="text-sm mt-1">Your trainer will assign checksheets when you're ready.</p>
        </div>
      )
    }

    return (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {assignments.map(a => (
          <TrainingCard key={a.id} a={a} onStart={setShowPlayer} />
        ))}
      </div>
    )
  }

  // ── Quick-assign modal (from Checksheets tab) ────────────────────────────
  const QuickAssignModal = () => {
    const [empList, setEmpList] = useState([])
    useEffect(() => {
      supabase.from('employees').select('id, first_name, last_name').eq('status', 'active').order('last_name')
        .then(({ data }) => setEmpList(data || []))
    }, [])
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
          <h3 className="font-bold text-gray-900 text-lg">Assign: {showAssign?.title}</h3>
          <p className="text-xs text-gray-500">To manage all assignments at once, use the Course Assignments tab.</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
            <select value={assignEmployee} onChange={e => setAssignEmployee(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500">
              <option value="">— Select Employee —</option>
              {empList.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <button onClick={assignFromChecksheets} disabled={!assignEmployee || assigning}
              className="flex-1 py-2.5 bg-green-700 text-white rounded-xl font-medium hover:bg-green-800 disabled:opacity-50">
              {assigning ? 'Assigning…' : 'Assign Course'}
            </button>
            <button onClick={() => { setShowAssign(null); setAssignEmployee('') }}
              className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200">
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Page header */}
      <div className="flex items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Training</h1>
          <p className="text-sm text-gray-500 mt-0.5">Learning Management System</p>
        </div>
        {isAdmin && (
          <div className="ml-auto flex gap-2 bg-gray-100 rounded-xl p-1">
            <button onClick={() => setMainTab('admin')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mainTab === 'admin' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
              🛡️ Admin
            </button>
            <button onClick={() => setMainTab('training')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mainTab === 'training' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
              🎓 My Training
            </button>
          </div>
        )}
      </div>

      {/* Admin section */}
      {mainTab === 'admin' && isAdmin && (
        <div className="flex gap-6">
          <div className="w-52 flex-shrink-0">
            <nav className="space-y-0.5">
              {ADMIN_TABS.map(tab => (
                <button key={tab.key} onClick={() => setAdminTab(tab.key)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-colors ${
                    adminTab === tab.key ? 'bg-green-50 text-green-800' : 'text-gray-600 hover:bg-gray-50'
                  }`}>
                  <span>{tab.icon}</span> {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex-1 min-w-0 bg-white rounded-2xl border border-gray-200 p-6">
            {adminTab === 'checksheets'  && renderChecksheets()}
            {adminTab === 'assignments'  && <CourseAssignmentsManager />}
            {adminTab === 'read_items'   && <ReadItemsManager />}
            {adminTab === 'drills'       && <LearningDrillsManager />}
            {adminTab === 'quizzes'      && <QuizzesManager />}
            {adminTab === 'tests'        && <TestsManager />}
            {adminTab === 'actions'      && <ActionsManager />}
            {adminTab === 'progress'     && renderProgress()}
          </div>
        </div>
      )}

      {/* My Training */}
      {mainTab === 'training' && (
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-5">
            {myEmployee ? `${myEmployee.first_name}'s Courses` : 'My Courses'}
          </h2>
          {renderMyTraining()}
        </div>
      )}

      {/* Checksheet builder */}
      {showBuilder && (
        <ChecksheetBuilder
          course={editCourse}
          onClose={() => { setShowBuilder(false); setEditCourse(null) }}
          onSaved={loadCourses}
        />
      )}

      {/* Course player */}
      {showPlayer && (
        <CoursePlayer
          assignment={showPlayer}
          onClose={() => { setShowPlayer(null); loadMyTraining() }}
        />
      )}

      {/* Quick-assign modal from Checksheets tab */}
      {showAssign && <QuickAssignModal />}
    </div>
  )
}
