// src/pages/Info.jsx
//
// "Info" page reachable from the mobile dock's ℹ️ Info button.
//
// Pick a job, then it renders the SAME JobInfoModal the rest of the app uses
// (in `inline` mode) — so the mobile Info screen always has the current tab
// layout and the full set of fields, instead of a hand-maintained subset that
// drifts out of date.

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import JobInfoModal from '../components/JobInfoModal'

const FG = '#3A5038'

export default function Info() {
  const [jobs, setJobs] = useState([]) // lightweight list for the picker
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState('')
  const [job, setJob] = useState(null) // full row for the selected job
  const [loadingJob, setLoadingJob] = useState(false)

  // Lightweight job list for the dropdown (active first, then alpha).
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    supabase
      .from('jobs')
      .select('id, name, client_name, status')
      .order('status', { ascending: true })
      .order('name', { ascending: true })
      .limit(500)
      .then(({ data }) => {
        if (cancelled) return
        setJobs(data || [])
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Load the FULL job row when the picker changes (JobInfoModal needs all columns).
  useEffect(() => {
    if (!selectedId) {
      setJob(null)
      return
    }
    let cancelled = false
    setLoadingJob(true)
    supabase
      .from('jobs')
      .select('*')
      .eq('id', selectedId)
      .single()
      .then(({ data }) => {
        if (cancelled) return
        setJob(data || null)
        setLoadingJob(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedId])

  // Persist edits from JobInfoModal; returns truthy on success (its contract).
  async function handleSave(jobId, updates) {
    const { error } = await supabase.from('jobs').update(updates).eq('id', jobId)
    if (error) return false
    setJob(prev => (prev && prev.id === jobId ? { ...prev, ...updates } : prev))
    setJobs(prev => prev.map(j => (j.id === jobId ? { ...j, ...updates } : j)))
    return true
  }

  const jobLabel = j =>
    `${j.name || j.client_name || 'Untitled job'}${j.status && j.status !== 'active' ? ` (${j.status})` : ''}`

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-bold mb-4" style={{ color: FG }}>
        Info
      </h1>

      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-500 mb-1">Select a job</label>
        <select
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">{loading ? 'Loading jobs…' : '— Pick a job —'}</option>
          {jobs.map(j => (
            <option key={j.id} value={j.id}>
              {jobLabel(j)}
            </option>
          ))}
        </select>
      </div>

      {!selectedId ? (
        <div className="flex flex-col items-center justify-center text-gray-400 py-20">
          <p className="text-4xl mb-3">ℹ️</p>
          <p className="text-sm">Pick a job to view its info</p>
        </div>
      ) : loadingJob || !job ? (
        <p className="text-sm text-gray-400 py-10 text-center">Loading job…</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <JobInfoModal
            key={job.id}
            job={job}
            inline
            onSave={handleSave}
            onClose={() => {}}
          />
        </div>
      )}
    </div>
  )
}
