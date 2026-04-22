// ─────────────────────────────────────────────────────────────────────────────
// LMS — Learning Management System
// Admin: create/edit checksheets, assign to employees, view completion stats
// Employee Progress: per-employee training history
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import ChecksheetBuilder from '../components/lms/ChecksheetBuilder'
import CoursePlayer from '../components/lms/CoursePlayer'

const CATEGORIES = ['All', 'Safety / OSHA', 'Onboarding', 'Skills / Trade', 'Equipment', 'Administrative', 'General']

const CAT_COLORS = {
  'Safety / OSHA':   'bg-red-100 text-red-700 border-red-200',
  'Onboarding':      'bg-blue-100 text-blue-700 border-blue-200',
  'Skills / Trade':  'bg-green-100 text-green-700 border-green-200',
  'Equipment':       'bg-orange-100 text-orange-700 border-orange-200',
  'Administrative':  'bg-purple-100 text-purple-700 border-purple-200',
  'General':         'bg-gray-100 text-gray-600 border-gray-200',
}

export default function LMS() {
  const [courses,     setCourses]     = useState([])
  const [stepMap,     setStepMap]     = useState({})        // courseId → steps[]
  const [assignments, setAssignments] = useState([])
  const [completions, setCompletions] = useState([])
  const [employees,   setEmployees]   = useState([])
  const [loading,     setLoading]     = useState(true)

  const [tab,         setTab]         = useState('courses') // 'courses' | 'employees'
  const [catFilter,   setCatFilter]   = useState('All')
  const [selected,    setSelected]    = useState(null)      // selected course obj

  const [showBuilder, setShowBuilder] = useState(false)
  const [editCourse,  setEditCourse]  = useState(null)
  const [showPlayer,  setShowPlayer]  = useState(null)      // {assignment, courseSteps}

  const [showAssign,  setShowAssign]  = useState(false)
  const [assignEmpId, setAssignEmpId] = useState('')
  const [assignDue,   setAssignDue]   = useState('')
  const [assignSaving,setAssignSaving]= useState(false)

  const [empSearch,   setEmpSearch]   = useState('')
  const [expandedEmp, setExpandedEmp] = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [
      { data: cData },
      { data: stData },
      { data: aData },
      { data: cmpData },
      { data: eData },
    ] = await Promise.all([
      supabase.from('lms_courses').select('*').order('created_at', { ascending: false }),
      supabase.from('lms_steps').select('*').order('order_index'),
      supabase.from('lms_assignments').select('*, employees(id, first_name, last_name), lms_courses(title)'),
      supabase.from('lms_step_completions').select('*'),
      supabase.from('employees').select('id, first_name, last_name').order('last_name'),
    ])

    setCourses(cData || [])

    const map = {}
    ;(stData || []).forEach(s => {
      if (!map[s.course_id]) map[s.course_id] = []
      map[s.course_id].push(s)
    })
    setStepMap(map)

    setAssignments(aData || [])
    setCompletions(cmpData || [])
    setEmployees(eData || [])
    setLoading(false)
  }

  // ── course helpers ────────────────────────────────────────────────────────
  function courseStats(courseId) {
    const ca         = assignments.filter(a => a.course_id === courseId)
    const steps      = stepMap[courseId] || []
    const totalSteps = steps.length

    let totalPct = 0
    ca.forEach(a => {
      const done = completions.filter(c => c.assignment_id === a.id).length
      totalPct += totalSteps > 0 ? done / totalSteps : 0
    })

    const avgPct   = ca.length > 0 ? Math.round((totalPct / ca.length) * 100) : 0
    const finished = ca.filter(a => {
      const done = completions.filter(c => c.assignment_id === a.id).length
      return totalSteps > 0 && done >= totalSteps
    }).length

    return { assigned: ca.length, avgPct, finished, totalSteps }
  }

  function stepProgress(assignmentId, courseId) {
    const total = (stepMap[courseId] || []).length
    const done  = completions.filter(c => c.assignment_id === assignmentId).length
    return { done, total, pct: total > 0 ? Math.round(done / total * 100) : 0 }
  }

  const filtered = catFilter === 'All'
    ? courses
    : courses.filter(c => c.category === catFilter)

  const selectedAssignments = selected
    ? assignments.filter(a => a.course_id === selected.id)
    : []

  // ── assign ────────────────────────────────────────────────────────────────
  async function handleAssign() {
    if (!assignEmpId || !selected) return
    setAssignSaving(true)
    await supabase.from('lms_assignments').upsert(
      { course_id: selected.id, employee_id: assignEmpId, due_date: assignDue || null },
      { onConflict: 'course_id,employee_id' }
    )
    setShowAssign(false)
    setAssignEmpId('')
    setAssignDue('')
    setAssignSaving(false)
    fetchAll()
  }

  async function handleDeleteCourse(courseId) {
    if (!confirm('Delete this checksheet and all assignments?')) return
    await supabase.from('lms_courses').delete().eq('id', courseId)
    setSelected(null)
    fetchAll()
  }

  function handleBuilderSave() {
    setShowBuilder(false)
    setEditCourse(null)
    fetchAll()
  }

  // ── employee progress helpers ─────────────────────────────────────────────
  const filteredEmps = employees.filter(e =>
    `${e.first_name} ${e.last_name}`.toLowerCase().includes(empSearch.toLowerCase())
  )

  function empSummary(empId) {
    const ea       = assignments.filter(a => a.employee_id === empId)
    const finished = ea.filter(a => {
      const steps = stepMap[a.course_id] || []
      const done  = completions.filter(c => c.assignment_id === a.id).length
      return steps.length > 0 && done >= steps.length
    }).length
    return { total: ea.length, finished, assignments: ea }
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col">

      {/* ── Page header ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎓</span>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Training &amp; Checksheets</h1>
            <p className="text-xs text-gray-500">{courses.length} course{courses.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTab(tab === 'employees' ? 'courses' : 'employees')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'employees' ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            👤 Employee Progress
          </button>
          <button
            onClick={() => { setShowBuilder(true); setEditCourse(null) }}
            className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-800"
          >
            + New Checksheet
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      {tab === 'courses' ? (

        <div className="flex flex-1 min-h-0">

          {/* LEFT: course list */}
          <div className="w-80 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col">

            {/* Category filter */}
            <div className="px-3 py-2 border-b border-gray-100 overflow-x-auto">
              <div className="flex gap-1 min-w-max">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCatFilter(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                      catFilter === cat ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12 text-gray-400">Loading…</div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <p className="text-3xl mb-2">📋</p>
                  <p className="text-sm">No checksheets yet</p>
                  <button
                    onClick={() => setShowBuilder(true)}
                    className="mt-3 px-3 py-1.5 bg-green-700 text-white rounded-lg text-xs font-medium"
                  >
                    Create one
                  </button>
                </div>
              ) : (
                filtered.map(course => {
                  const stats      = courseStats(course.id)
                  const isSelected = selected?.id === course.id
                  return (
                    <div
                      key={course.id}
                      onClick={() => setSelected(course)}
                      className={`px-4 py-3 border-b border-gray-100 cursor-pointer transition-colors border-l-4 ${
                        isSelected
                          ? 'bg-green-50 border-l-green-700'
                          : 'hover:bg-gray-50 border-l-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-semibold text-sm text-gray-900 leading-tight">{course.title}</p>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border whitespace-nowrap flex-shrink-0 ${CAT_COLORS[course.category] || CAT_COLORS['General']}`}>
                          {course.category}
                        </span>
                      </div>
                      {course.description && (
                        <p className="text-xs text-gray-500 mb-1 line-clamp-2">{course.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>📝 {stats.totalSteps} steps</span>
                        <span>👤 {stats.assigned}</span>
                        {stats.assigned > 0 && (
                          <span className="text-green-600">✓ {stats.finished}</span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* RIGHT: course detail */}
          <div className="flex-1 overflow-y-auto bg-gray-50">
            {!selected ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <p className="text-5xl mb-3">📋</p>
                <p className="text-lg font-medium">Select a checksheet</p>
                <p className="text-sm mt-1">or create a new one</p>
              </div>
            ) : (
              <div className="p-6 space-y-5">

                {/* Course header card */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${CAT_COLORS[selected.category] || CAT_COLORS['General']}`}>
                        {selected.category}
                      </span>
                      <h2 className="text-xl font-bold text-gray-900 mt-1">{selected.title}</h2>
                      {selected.description && (
                        <p className="text-sm text-gray-500 mt-1">{selected.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => { setEditCourse(selected); setShowBuilder(true) }}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCourse(selected.id)}
                        className="px-3 py-1.5 border border-red-200 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>

                  {/* Stats strip */}
                  {(() => {
                    const s = courseStats(selected.id)
                    return (
                      <div className="flex gap-6 pt-3 border-t border-gray-100">
                        {[
                          { label: 'Steps',      val: s.totalSteps, color: 'text-gray-900' },
                          { label: 'Assigned',   val: s.assigned,   color: 'text-gray-900' },
                          { label: 'Completed',  val: s.finished,   color: 'text-green-700' },
                          { label: 'Avg Progress', val: `${s.avgPct}%`, color: 'text-blue-600' },
                        ].map(item => (
                          <div key={item.label} className="text-center">
                            <p className={`text-2xl font-bold ${item.color}`}>{item.val}</p>
                            <p className="text-xs text-gray-500">{item.label}</p>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>

                {/* Steps list */}
                <div className="bg-white rounded-xl border border-gray-200">
                  <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800">Steps</h3>
                    <span className="text-xs text-gray-400">{(stepMap[selected.id] || []).length} steps</span>
                  </div>
                  {(stepMap[selected.id] || []).length === 0 ? (
                    <div className="px-5 py-8 text-center text-sm text-gray-400">
                      No steps yet.{' '}
                      <button
                        className="text-green-700 underline"
                        onClick={() => { setEditCourse(selected); setShowBuilder(true) }}
                      >
                        Add steps
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {(stepMap[selected.id] || []).map((step, i) => {
                        const typeIcon = { text: '📄', checklist: '✅', photo: '📷', quiz: '❓' }[step.step_type] || '📄'
                        return (
                          <div key={step.id} className="px-5 py-3 flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                              {i + 1}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-gray-800">{step.title}</p>
                                <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                                  {typeIcon} {step.step_type}
                                </span>
                              </div>
                              {step.content && (
                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{step.content}</p>
                              )}
                              {step.step_type === 'checklist' && step.checklist_items?.length > 0 && (
                                <p className="text-xs text-gray-400 mt-0.5">{step.checklist_items.length} items to check</p>
                              )}
                              {step.step_type === 'quiz' && step.quiz_question && (
                                <p className="text-xs text-gray-400 mt-0.5 italic">{step.quiz_question}</p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Assigned employees */}
                <div className="bg-white rounded-xl border border-gray-200">
                  <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800">Assigned Employees</h3>
                    <button
                      onClick={() => setShowAssign(true)}
                      className="px-3 py-1 bg-green-700 text-white rounded-lg text-xs font-semibold hover:bg-green-800"
                    >
                      + Assign
                    </button>
                  </div>
                  {selectedAssignments.length === 0 ? (
                    <div className="px-5 py-8 text-center text-sm text-gray-400">
                      No employees assigned yet.
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {selectedAssignments.map(a => {
                        const prog    = stepProgress(a.id, selected.id)
                        const emp     = a.employees
                        const isDone  = prog.done >= prog.total && prog.total > 0
                        return (
                          <div key={a.id} className="px-5 py-3 flex items-center gap-4">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                              {emp?.first_name?.[0]}{emp?.last_name?.[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800">
                                {emp?.first_name} {emp?.last_name}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1 h-1.5 bg-gray-100 rounded-full">
                                  <div
                                    className={`h-full rounded-full ${isDone ? 'bg-green-500' : 'bg-blue-400'}`}
                                    style={{ width: `${prog.pct}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-400 whitespace-nowrap">{prog.done}/{prog.total}</span>
                              </div>
                            </div>
                            {isDone ? (
                              <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full">✓ Done</span>
                            ) : (
                              <button
                                onClick={() => setShowPlayer({
                                  assignment:  a,
                                  courseSteps: stepMap[selected.id] || [],
                                })}
                                className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-full hover:bg-blue-100"
                              >
                                ▶ Start
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>

      ) : (

        /* ── Employee Progress tab ── */
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <div className="mb-4 flex items-center gap-3">
              <button onClick={() => setTab('courses')} className="text-xs text-gray-500 hover:text-gray-700">
                ← Back to Courses
              </button>
              <h2 className="text-lg font-bold text-gray-900">Employee Training Progress</h2>
            </div>

            <input
              type="text"
              placeholder="Search employees…"
              value={empSearch}
              onChange={e => setEmpSearch(e.target.value)}
              className="w-full mb-4 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-green-500 bg-white"
            />

            {loading ? (
              <div className="text-center py-12 text-gray-400">Loading…</div>
            ) : filteredEmps.length === 0 ? (
              <div className="text-center py-12 text-gray-400">No employees found</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredEmps.map(emp => {
                  const { total, finished, assignments: ea } = empSummary(emp.id)
                  const isExpanded = expandedEmp === emp.id
                  const overallPct = total > 0 ? Math.round(finished / total * 100) : 0

                  return (
                    <div
                      key={emp.id}
                      className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:border-green-300 transition-colors"
                      onClick={() => setExpandedEmp(isExpanded ? null : emp.id)}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-sm font-bold text-green-700 flex-shrink-0">
                          {emp.first_name?.[0]}{emp.last_name?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900">{emp.first_name} {emp.last_name}</p>
                          <p className="text-xs text-gray-500">
                            {total === 0 ? 'No courses assigned' : `${finished}/${total} courses complete`}
                          </p>
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                          total === 0      ? 'bg-gray-100 text-gray-400' :
                          overallPct === 100 ? 'bg-green-100 text-green-700' :
                          overallPct > 50  ? 'bg-blue-100 text-blue-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {total === 0 ? '—' : `${overallPct}%`}
                        </span>
                      </div>

                      {total > 0 && (
                        <div className="h-1.5 bg-gray-100 rounded-full mb-3">
                          <div
                            className="h-full bg-green-500 rounded-full transition-all"
                            style={{ width: `${overallPct}%` }}
                          />
                        </div>
                      )}

                      {isExpanded && (
                        <div className="border-t border-gray-100 pt-3 space-y-2">
                          {ea.length === 0 ? (
                            <p className="text-xs text-gray-400">No courses assigned</p>
                          ) : (
                            ea.map(a => {
                              const course = courses.find(c => c.id === a.course_id)
                              const prog   = stepProgress(a.id, a.course_id)
                              const isDone = prog.done >= prog.total && prog.total > 0
                              return (
                                <div key={a.id} className="flex items-center gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="text-xs font-medium text-gray-700 truncate">
                                        {course?.title || 'Unknown Course'}
                                      </p>
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${CAT_COLORS[course?.category] || CAT_COLORS['General']}`}>
                                        {course?.category}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                      <div className="flex-1 h-1 bg-gray-100 rounded-full">
                                        <div
                                          className={`h-full rounded-full ${isDone ? 'bg-green-500' : 'bg-blue-400'}`}
                                          style={{ width: `${prog.pct}%` }}
                                        />
                                      </div>
                                      <span className="text-xs text-gray-400 whitespace-nowrap">{prog.done}/{prog.total}</span>
                                    </div>
                                  </div>
                                  {isDone && <span className="text-xs text-green-600 flex-shrink-0">✓</span>}
                                </div>
                              )
                            })
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Assign Modal ── */}
      {showAssign && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Assign Course</h3>
            <p className="text-sm text-gray-500 mb-4">"{selected?.title}"</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                <select
                  value={assignEmpId}
                  onChange={e => setAssignEmpId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                >
                  <option value="">Select employee…</option>
                  {employees
                    .filter(e => !selectedAssignments.some(a => a.employee_id === e.id))
                    .map(e => (
                      <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
                    ))
                  }
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date (optional)</label>
                <input
                  type="date"
                  value={assignDue}
                  onChange={e => setAssignDue(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowAssign(false); setAssignEmpId(''); setAssignDue('') }}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={!assignEmpId || assignSaving}
                className="flex-1 py-2 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-800 disabled:opacity-50"
              >
                {assignSaving ? 'Assigning…' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Checksheet Builder ── */}
      {showBuilder && (
        <ChecksheetBuilder
          course={editCourse}
          onSave={handleBuilderSave}
          onClose={() => { setShowBuilder(false); setEditCourse(null) }}
        />
      )}

      {/* ── Course Player ── */}
      {showPlayer && (
        <CoursePlayer
          assignment={showPlayer.assignment}
          courseSteps={showPlayer.courseSteps}
          existingCompletions={completions.filter(c => c.assignment_id === showPlayer.assignment.id)}
          onClose={() => setShowPlayer(null)}
          onComplete={() => { setShowPlayer(null); fetchAll() }}
        />
      )}

    </div>
  )
}
