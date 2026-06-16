// src/components/AllJobsTasks.jsx
//
// All-Jobs view for the Jobs > Tasks tab. One editable table — the same
// columns and inline editing as the per-job Tasks panel — with a separator
// row per client/job and a frozen column header. A filter bar (My / All x
// Open / Closed / Both) scopes which tasks are shown. Paginated at 100 jobs
// per page; each page's tasks are fetched server-side. Click a client
// separator to open that job.
import { useState, useEffect, useMemo, Fragment } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { fetchAllPaginated } from '../lib/fetchAll'

const JOBS_PER_PAGE = 100

// Filter bar — scope (whose tasks) x status. A task is "open" until completed.
const TASK_FILTERS = [
  { key: 'my-open', label: 'My Tasks Open', scope: 'my', status: 'open' },
  { key: 'my-closed', label: 'My Tasks Closed', scope: 'my', status: 'closed' },
  { key: 'my-both', label: 'My Tasks Both', scope: 'my', status: 'both' },
  { key: 'all-open', label: 'All Open Tasks', scope: 'all', status: 'open' },
  { key: 'all-closed', label: 'All Closed Tasks', scope: 'all', status: 'closed' },
  { key: 'all-both', label: 'All Both', scope: 'all', status: 'both' },
]

function isJobOpen(j) {
  const s = j?.status || 'active'
  return s === 'active' || s === 'on_hold'
}

// Apply the active task filter (status + assignee) to a job_tasks query.
function applyTaskFilter(query, filterDef, myEmployeeId) {
  let q = query
  if (filterDef.status === 'open') q = q.neq('status', 'completed')
  else if (filterDef.status === 'closed') q = q.eq('status', 'completed')
  if (filterDef.scope === 'my') q = q.eq('assignee_id', myEmployeeId)
  return q
}

const DESC_LIST_ID = 'all-jobs-task-desc-suggestions'

export default function AllJobsTasks({ jobs = [], statusFilter = 'open', onSelectJob }) {
  const { user } = useAuth()

  const [filterKey, setFilterKey] = useState('all-both')
  // undefined = not resolved yet, null = account not linked to an employee.
  const [myEmployeeId, setMyEmployeeId] = useState(undefined)
  const [jobIdsWithTasks, setJobIdsWithTasks] = useState(null) // null = loading
  const [tasksByJob, setTasksByJob] = useState({})
  const [tasksLoading, setTasksLoading] = useState(false)
  const [page, setPage] = useState(1)

  // Inline-edit lookups — task_categories / task_descriptions / employees are
  // global (not job-scoped), so one fetch serves every row in the table.
  const [categories, setCategories] = useState([])
  const [descPresets, setDescPresets] = useState([])
  const [employees, setEmployees] = useState([])

  const filterDef = TASK_FILTERS.find(f => f.key === filterKey) || TASK_FILTERS[5]

  // Resolve which employee record is the logged-in account (employees.user_id).
  useEffect(() => {
    if (!user?.id) {
      setMyEmployeeId(null)
      return
    }
    let alive = true
    ;(async () => {
      const { data } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
      if (alive) setMyEmployeeId(data?.[0]?.id || null)
    })()
    return () => {
      alive = false
    }
  }, [user?.id])

  // Inline-edit lookups — fetched once.
  useEffect(() => {
    let alive = true
    ;(async () => {
      const [cats, descs, emps] = await Promise.all([
        supabase.from('task_categories').select('*').order('sort_order').order('name'),
        supabase.from('task_descriptions').select('*').order('sort_order').order('name'),
        supabase
          .from('employees')
          .select('id, first_name, last_name')
          .eq('status', 'active')
          .order('first_name'),
      ])
      if (!alive) return
      setCategories(cats.data || [])
      setDescPresets(descs.data || [])
      setEmployees(emps.data || [])
    })()
    return () => {
      alive = false
    }
  }, [])

  // Load the set of jobs that have a task matching the current filter.
  useEffect(() => {
    // "My" filters need the employee link resolved first.
    if (filterDef.scope === 'my' && myEmployeeId === undefined) return
    if (filterDef.scope === 'my' && !myEmployeeId) {
      setJobIdsWithTasks(new Set())
      return
    }
    let alive = true
    setJobIdsWithTasks(null)
    ;(async () => {
      const { data } = await fetchAllPaginated(() =>
        applyTaskFilter(supabase.from('job_tasks').select('job_id'), filterDef, myEmployeeId)
      )
      if (alive) setJobIdsWithTasks(new Set((data || []).map(r => r.job_id)))
    })()
    return () => {
      alive = false
    }
  }, [filterKey, myEmployeeId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset to page 1 when the job filter or the task filter changes.
  useEffect(() => {
    setPage(1)
  }, [statusFilter, filterKey])

  // The full list of jobs to page through: matches the Open/Closed filter and
  // has at least one task matching the task filter. Computed from the jobs prop.
  const taskedJobs = useMemo(() => {
    if (!jobIdsWithTasks) return []
    return jobs
      .filter(j => (statusFilter === 'closed' ? !isJobOpen(j) : isJobOpen(j)))
      .filter(j => jobIdsWithTasks.has(j.id))
      .map(j => ({ id: j.id, name: j.name || j.client_name || '—' }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [jobs, statusFilter, jobIdsWithTasks])

  const totalPages = Math.max(1, Math.ceil(taskedJobs.length / JOBS_PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const pageStart = (safePage - 1) * JOBS_PER_PAGE
  const pageJobs = taskedJobs.slice(pageStart, pageStart + JOBS_PER_PAGE)

  // Fetch the current page's tasks (matching the filter), scoped to its jobs.
  const pageKey = pageJobs.map(j => j.id).join(',')
  useEffect(() => {
    if (!pageKey) {
      setTasksByJob({})
      return
    }
    let alive = true
    setTasksLoading(true)
    ;(async () => {
      const { data } = await fetchAllPaginated(() =>
        applyTaskFilter(
          supabase.from('job_tasks').select('*').in('job_id', pageKey.split(',')),
          filterDef,
          myEmployeeId
        )
          .order('sort_order')
          .order('created_at')
          .order('id')
      )
      if (!alive) return
      const byJob = {}
      for (const t of data || []) (byJob[t.job_id] = byJob[t.job_id] || []).push(t)
      setTasksByJob(byJob)
      setTasksLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [pageKey, filterKey, myEmployeeId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Inline edit — autosave one field, optimistic UI ──────────
  function patchTask(jobId, id, patch) {
    setTasksByJob(prev => ({
      ...prev,
      [jobId]: (prev[jobId] || []).map(t => (t.id === id ? { ...t, ...patch } : t)),
    }))
    supabase
      .from('job_tasks')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .then(({ error }) => {
        if (error) console.error('patchTask:', error)
      })
  }

  function toggleStatus(jobId, task) {
    patchTask(jobId, task.id, {
      status: task.status === 'completed' ? 'pending' : 'completed',
    })
  }

  async function deleteTask(jobId, id) {
    if (!confirm('Remove this task?')) return
    await supabase.from('job_tasks').delete().eq('id', id)
    setTasksByJob(prev => ({
      ...prev,
      [jobId]: (prev[jobId] || []).filter(t => t.id !== id),
    }))
  }

  const empName = e => `${e.first_name} ${e.last_name}`.trim()
  const noEmployeeLink = filterDef.scope === 'my' && myEmployeeId === null

  // Editable-cell base styling (matches the per-job Tasks panel).
  const cellInput =
    'w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-green-500 focus:outline-none rounded px-1.5 py-1'

  return (
    <div className="flex flex-col h-full">

      {/* Filter bar — My / All x Open / Closed / Both */}
      <div className="mb-3 mt-3 flex flex-wrap gap-1.5 flex-shrink-0">
        {TASK_FILTERS.map(f => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilterKey(f.key)}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
              filterKey === f.key
                ? 'bg-green-700 text-white'
                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Shared datalist for description autocomplete */}
      <datalist id={DESC_LIST_ID}>
        {descPresets.map(d => (
          <option key={d.id} value={d.name} />
        ))}
      </datalist>

      {jobIdsWithTasks === null ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-green-700" />
        </div>
      ) : taskedJobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <p className="mb-2 text-4xl">✅</p>
          <p className="text-sm">
            {noEmployeeLink
              ? 'Your login is not linked to an employee record, so there are no personal tasks to show.'
              : 'No tasks match this filter.'}
          </p>
        </div>
      ) : tasksLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-7 w-7 animate-spin rounded-full border-b-2 border-green-700" />
        </div>
      ) : (
        <>
          {/* One table — header frozen, body scrolls; a separator row per job */}
          <div className="flex-1 min-h-0 overflow-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-3 py-2 w-10 text-center font-semibold">✓</th>
                  <th className="px-3 py-2 w-40 text-left font-semibold">Category</th>
                  <th className="px-3 py-2 text-left font-semibold">Description</th>
                  <th className="px-3 py-2 w-44 text-left font-semibold">Notes</th>
                  <th className="px-3 py-2 w-24 text-left font-semibold">Priority</th>
                  <th className="px-3 py-2 w-44 text-left font-semibold">Assignee</th>
                  <th className="px-3 py-2 w-36 text-left font-semibold">Due Date</th>
                  <th className="px-3 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {pageJobs.map(g => {
                  const tasks = tasksByJob[g.id] || []
                  if (tasks.length === 0) return null
                  const done = tasks.filter(t => t.status === 'completed').length
                  return (
                    <Fragment key={g.id}>
                      {/* Client separator row */}
                      <tr className="bg-gray-100 border-y border-gray-200">
                        <td colSpan={8} className="px-3 py-1.5">
                          <button
                            type="button"
                            onClick={() => onSelectJob?.(g.id)}
                            className="text-left text-xs font-bold text-green-700 hover:underline"
                          >
                            {g.name}
                          </button>
                          <span className="ml-2 text-[11px] font-normal text-gray-400">
                            {done}/{tasks.length} done
                          </span>
                        </td>
                      </tr>

                      {tasks.map(task => {
                        const isDone = task.status === 'completed'
                        return (
                          <tr
                            key={task.id}
                            className={`border-b border-gray-100 hover:bg-gray-50/70 group transition-colors ${isDone ? 'bg-green-50/30' : ''}`}
                          >
                            {/* Status checkbox */}
                            <td className="px-3 py-1.5 text-center">
                              <button
                                onClick={() => toggleStatus(g.id, task)}
                                className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center transition-colors ${
                                  isDone
                                    ? 'bg-green-600 border-green-600 text-white'
                                    : 'border-gray-300 hover:border-green-500'
                                }`}
                                title={isDone ? 'Mark pending' : 'Mark complete'}
                              >
                                {isDone && (
                                  <svg
                                    className="w-3 h-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={3}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                )}
                              </button>
                            </td>

                            {/* Category */}
                            <td className="px-2 py-1">
                              <select
                                value={task.category_id || ''}
                                onChange={e =>
                                  patchTask(g.id, task.id, {
                                    category_id: e.target.value || null,
                                  })
                                }
                                className={`${cellInput} text-xs ${isDone ? 'text-gray-400' : 'text-gray-700'}`}
                              >
                                <option value="">— Select —</option>
                                {categories.map(c => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Description */}
                            <td className="px-2 py-1">
                              <input
                                type="text"
                                list={DESC_LIST_ID}
                                defaultValue={task.task_name || ''}
                                placeholder="Type or pick…"
                                onBlur={e => {
                                  const v = e.target.value
                                  if (v !== task.task_name)
                                    patchTask(g.id, task.id, { task_name: v })
                                }}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') e.target.blur()
                                }}
                                className={`${cellInput} text-sm ${isDone ? 'line-through text-gray-400' : 'text-gray-800'}`}
                              />
                            </td>

                            {/* Notes */}
                            <td className="px-2 py-1">
                              <input
                                type="text"
                                defaultValue={task.notes || ''}
                                placeholder="—"
                                title={task.notes || ''}
                                onBlur={e => {
                                  const v = e.target.value
                                  if (v !== (task.notes || ''))
                                    patchTask(g.id, task.id, { notes: v || null })
                                }}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') e.target.blur()
                                }}
                                className={`${cellInput} text-xs ${isDone ? 'text-gray-400' : 'text-gray-700'}`}
                              />
                            </td>

                            {/* Priority */}
                            <td className="px-2 py-1">
                              <select
                                value={task.priority || ''}
                                onChange={e =>
                                  patchTask(g.id, task.id, {
                                    priority: e.target.value || null,
                                  })
                                }
                                className={`w-full text-[11px] font-semibold uppercase border border-transparent hover:border-gray-200 focus:border-green-500 focus:outline-none rounded px-1.5 py-1 ${
                                  task.priority === 'highest'
                                    ? 'bg-red-100 text-red-700'
                                    : task.priority === 'high'
                                      ? 'bg-orange-100 text-orange-700'
                                      : task.priority === 'low'
                                        ? 'text-gray-400'
                                        : 'bg-transparent text-gray-400'
                                } ${isDone ? 'opacity-60' : ''}`}
                              >
                                <option value="">—</option>
                                <option value="highest">Highest</option>
                                <option value="high">High</option>
                                <option value="low">Low</option>
                              </select>
                            </td>

                            {/* Assignee */}
                            <td className="px-2 py-1">
                              <select
                                value={task.assignee_id || ''}
                                onChange={e =>
                                  patchTask(g.id, task.id, {
                                    assignee_id: e.target.value || null,
                                  })
                                }
                                className={`${cellInput} text-xs ${isDone ? 'text-gray-400' : 'text-gray-700'}`}
                                title={
                                  !task.assignee_id && task.assignee_name
                                    ? `BT name: ${task.assignee_name}`
                                    : undefined
                                }
                              >
                                <option value="">
                                  {task.assignee_name
                                    ? `(BT) ${task.assignee_name}`
                                    : '— Unassigned —'}
                                </option>
                                {employees.map(e => (
                                  <option key={e.id} value={e.id}>
                                    {empName(e)}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Due date */}
                            <td className="px-2 py-1">
                              <input
                                type="date"
                                value={task.due_date || ''}
                                onChange={e =>
                                  patchTask(g.id, task.id, {
                                    due_date: e.target.value || null,
                                  })
                                }
                                className={`${cellInput} text-xs ${isDone ? 'text-gray-400' : 'text-gray-700'}`}
                              />
                            </td>

                            {/* Delete */}
                            <td className="px-2 py-1 text-center">
                              <button
                                onClick={() => deleteTask(g.id, task.id)}
                                className="text-red-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity text-xs p-1"
                                title="Delete task"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination — controls on the left, clear of the Ask Sam button */}
          {taskedJobs.length > JOBS_PER_PAGE && (
            <div className="mt-3 flex items-center gap-3 border-t border-gray-100 pt-3 flex-shrink-0">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(1, safePage - 1))}
                  disabled={safePage === 1}
                  className="rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ‹ Prev
                </button>
                <span className="px-2 text-xs text-gray-500">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                  disabled={safePage === totalPages}
                  className="rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next ›
                </button>
              </div>
              <span className="text-xs text-gray-500">
                {pageStart + 1}–{pageStart + pageJobs.length} of {taskedJobs.length} jobs
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
