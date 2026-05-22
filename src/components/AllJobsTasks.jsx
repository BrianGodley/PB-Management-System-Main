// src/components/AllJobsTasks.jsx
//
// All-Jobs view for the Jobs > Tasks tab. A card per job (with that job's
// tasks listed inside), for jobs matching the sidebar Open/Closed filter.
// A filter bar (My / All x Open / Closed / Both) scopes which tasks count.
// Paginated at 100 jobs per page; each page's tasks are fetched server-side.
// Read-only — task editing stays in the per-job panel. Click a job to open it.
import { useState, useEffect, useMemo } from 'react'
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

export default function AllJobsTasks({ jobs = [], statusFilter = 'open', onSelectJob }) {
  const { user } = useAuth()

  const [filterKey, setFilterKey] = useState('all-both')
  // undefined = not resolved yet, null = account not linked to an employee.
  const [myEmployeeId, setMyEmployeeId] = useState(undefined)
  const [jobIdsWithTasks, setJobIdsWithTasks] = useState(null) // null = loading
  const [tasksByJob, setTasksByJob] = useState({})
  const [tasksLoading, setTasksLoading] = useState(false)
  const [page, setPage] = useState(1)

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
          supabase
            .from('job_tasks')
            .select('job_id, task_name, status, sort_order, created_at')
            .in('job_id', pageKey.split(',')),
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

  const noEmployeeLink = filterDef.scope === 'my' && myEmployeeId === null

  return (
    <div className="p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-gray-900">Tasks — All Jobs</h2>
        <span className="text-xs text-gray-400">
          {taskedJobs.length.toLocaleString()} job{taskedJobs.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Filter bar — My / All x Open / Closed / Both */}
      <div className="mb-3 flex flex-wrap gap-1.5">
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
      ) : (
        <>
          {tasksLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-7 w-7 animate-spin rounded-full border-b-2 border-green-700" />
            </div>
          ) : (
            <div className="space-y-3">
              {pageJobs.map(g => {
                const tasks = tasksByJob[g.id] || []
                const done = tasks.filter(t => t.status === 'completed').length
                return (
                  <div key={g.id} className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => onSelectJob?.(g.id)}
                        className="text-left text-sm font-bold text-green-700 hover:underline"
                      >
                        {g.name}
                      </button>
                      <span className="text-xs text-gray-400">
                        {done}/{tasks.length} done
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {tasks.map((t, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <span
                            className={`h-2 w-2 flex-shrink-0 rounded-full ${
                              t.status === 'completed' ? 'bg-green-500' : 'bg-gray-300'
                            }`}
                          />
                          <span
                            className={
                              t.status === 'completed'
                                ? 'text-gray-400 line-through'
                                : 'text-gray-700'
                            }
                          >
                            {t.task_name || '(untitled task)'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination — controls on the left, clear of the Ask Sam button */}
          {taskedJobs.length > JOBS_PER_PAGE && (
            <div className="mt-3 flex items-center gap-3 border-t border-gray-100 pt-3">
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
