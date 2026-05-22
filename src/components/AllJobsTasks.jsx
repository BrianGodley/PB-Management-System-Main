// src/components/AllJobsTasks.jsx
//
// All-Jobs view for the Jobs > Tasks tab. Shown when "All Jobs" is selected
// instead of the per-job JobTasksPanel. Lists every job-task across the jobs
// matching the sidebar Open/Closed filter, grouped by job (read-only — task
// editing stays in the per-job panel). Click a job to open it.
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { fetchAllPaginated } from '../lib/fetchAll'

function isJobOpen(j) {
  const s = j?.status || 'active'
  return s === 'active' || s === 'on_hold'
}

export default function AllJobsTasks({ jobs = [], statusFilter = 'open', onSelectJob }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      // Paginate past the 1k-row PostgREST cap so tasks on closed/older jobs
      // aren't truncated out of the all-jobs roll-up.
      const { data } = await fetchAllPaginated(() =>
        supabase
          .from('job_tasks')
          .select('job_id, task_name, status, sort_order, created_at')
          .order('sort_order')
          .order('created_at')
          .order('id')
      )
      if (alive) {
        setTasks(data || [])
        setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  // Jobs matching the Open/Closed filter, with their tasks attached.
  const groups = useMemo(() => {
    const allowed = jobs.filter(j => (statusFilter === 'closed' ? !isJobOpen(j) : isJobOpen(j)))
    const byJob = {}
    for (const t of tasks) (byJob[t.job_id] = byJob[t.job_id] || []).push(t)
    return allowed
      .map(j => ({
        id: j.id,
        name: j.name || j.client_name || '—',
        tasks: byJob[j.id] || [],
      }))
      .filter(g => g.tasks.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [jobs, statusFilter, tasks])

  const totalTasks = groups.reduce((n, g) => n + g.tasks.length, 0)

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-green-700" />
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-gray-900">Tasks — All Jobs</h2>
        <span className="text-xs text-gray-400">
          {totalTasks} task{totalTasks === 1 ? '' : 's'} across {groups.length}{' '}
          {statusFilter === 'closed' ? 'closed' : 'open'} job{groups.length === 1 ? '' : 's'}
        </span>
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <p className="mb-2 text-4xl">✅</p>
          <p className="text-sm">
            No tasks on any {statusFilter === 'closed' ? 'closed' : 'open'} job.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(g => {
            const done = g.tasks.filter(t => t.status === 'completed').length
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
                    {done}/{g.tasks.length} done
                  </span>
                </div>
                <ul className="space-y-1">
                  {g.tasks.map((t, i) => (
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
    </div>
  )
}
