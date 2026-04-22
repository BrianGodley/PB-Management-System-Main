// ─────────────────────────────────────────────────────────────────────────────
// CourseAssignmentsManager — Admin tab for assigning courses to employees
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

export default function CourseAssignmentsManager() {
  const [employees, setEmployees] = useState([])
  const [courses, setCourses] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)

  const [selEmployee, setSelEmployee] = useState('')
  const [selCourse, setSelCourse] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState('')

  const load = async () => {
    setLoading(true)
    const [empRes, courseRes, asnRes] = await Promise.all([
      supabase.from('employees').select('id, first_name, last_name, job_title').eq('status', 'active').order('last_name'),
      supabase.from('lms_courses').select('id, title, category').order('title'),
      supabase.from('lms_assignments')
        .select('id, assigned_at, employee_id, course_id')
        .order('assigned_at', { ascending: false }),
    ])
    setEmployees(empRes.data || [])
    setCourses(courseRes.data || [])

    // Enrich assignments with names
    const emps = empRes.data || []
    const crs = courseRes.data || []
    const enriched = (asnRes.data || []).map(a => ({
      ...a,
      employee: emps.find(e => e.id === a.employee_id),
      course: crs.find(c => c.id === a.course_id),
    }))
    setAssignments(enriched)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const assign = async () => {
    if (!selEmployee || !selCourse) return
    setAssignError('')
    setAssigning(true)
    const { error } = await supabase.from('lms_assignments')
      .upsert({ employee_id: selEmployee, course_id: selCourse }, { onConflict: 'course_id,employee_id' })
    setAssigning(false)
    if (error) {
      setAssignError('Assignment failed. This employee may already be assigned to that course.')
    } else {
      setSelEmployee('')
      setSelCourse('')
      load()
    }
  }

  const remove = async (id) => {
    if (!confirm('Remove this course assignment? The employee\'s progress will also be deleted.')) return
    await supabase.from('lms_assignments').delete().eq('id', id)
    load()
  }

  const empById = (id) => employees.find(e => e.id === id)
  const groupByEmployee = () => {
    const map = {}
    assignments.forEach(a => {
      const key = a.employee_id
      if (!map[key]) map[key] = { employee: a.employee, courses: [] }
      if (a.course) map[key].courses.push(a)
    })
    return Object.values(map)
  }

  return (
    <div>
      <div className="mb-6">
        <h3 className="font-semibold text-gray-800">Course Assignments</h3>
        <p className="text-xs text-gray-500 mt-0.5">Assign one or more courses to an employee. Assigned courses appear in their Training module.</p>
      </div>

      {/* Assignment form */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-6">
        <p className="text-sm font-semibold text-gray-700 mb-4">Assign a Course</p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Employee</label>
            <select value={selEmployee} onChange={e => setSelEmployee(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-green-500">
              <option value="">— Select Employee —</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.first_name} {e.last_name}{e.job_title ? ` — ${e.job_title}` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Course / Checksheet</label>
            <select value={selCourse} onChange={e => setSelCourse(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-green-500">
              <option value="">— Select Course —</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.title}{c.category ? ` (${c.category})` : ''}</option>
              ))}
            </select>
          </div>
        </div>
        {assignError && (
          <p className="text-xs text-red-600 mb-3">{assignError}</p>
        )}
        <button
          onClick={assign}
          disabled={!selEmployee || !selCourse || assigning}
          className="px-5 py-2.5 bg-green-700 text-white rounded-xl font-medium hover:bg-green-800 disabled:opacity-50 text-sm"
        >
          {assigning ? 'Assigning…' : '+ Assign Course'}
        </button>
      </div>

      {/* Existing assignments */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3">Current Assignments</p>
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : assignments.length === 0 ? (
          <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
            <div className="text-4xl mb-2">📋</div>
            <p className="text-sm">No assignments yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupByEmployee().map(({ employee, courses: empCourses }) => (
              <div key={employee?.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                {/* Employee header */}
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-700">
                    {employee?.first_name?.[0]}{employee?.last_name?.[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{employee?.first_name} {employee?.last_name}</p>
                    {employee?.job_title && <p className="text-xs text-gray-400">{employee.job_title}</p>}
                  </div>
                  <span className="ml-auto text-xs text-gray-400">{empCourses.length} course{empCourses.length !== 1 ? 's' : ''}</span>
                </div>
                {/* Course rows */}
                {empCourses.map(a => (
                  <div key={a.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-800 flex-1">{a.course?.title}</span>
                    {a.course?.category && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{a.course.category}</span>
                    )}
                    <span className="text-xs text-gray-400">{new Date(a.assigned_at).toLocaleDateString()}</span>
                    <button onClick={() => remove(a.id)} className="text-xs text-red-400 hover:text-red-600 ml-2">Remove</button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
