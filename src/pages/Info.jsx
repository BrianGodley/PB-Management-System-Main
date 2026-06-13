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
  const [jobFilter, setJobFilter] = useState('open') // 'open' | 'closed'
  const [query, setQuery] = useState('') // type-to-search text
  const [showList, setShowList] = useState(false) // dropdown open

  // Open = active jobs; Closed = everything else (completed, etc.).
  const visibleJobs = jobs.filter(j =>
    jobFilter === 'open' ? j.status === 'active' : j.status !== 'active',
  )

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

  const jobLabel = j => {
    const base = j.name || j.client_name || 'Untitled job'
    return j.status && j.status !== 'active' ? base + ' (' + j.status + ')' : base
  }

  // Searchable picker: filter the visible jobs by the typed query.
  const matches = query.trim()
    ? visibleJobs.filter(j => jobLabel(j).toLowerCase().includes(query.trim().toLowerCase()))
    : visibleJobs

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="hidden lg:block text-xl font-bold mb-4" style={{ color: FG }}>
        Job Info
      </h1>

      {/* Open / Closed job filter */}
      <div className="mb-3 flex gap-2">
        {[
          { v: 'open', label: 'Open Jobs' },
          { v: 'closed', label: 'Closed Jobs' },
        ].map(opt => (
          <button
            key={opt.v}
            type="button"
            onClick={() => {
              if (opt.v === jobFilter) return
              setJobFilter(opt.v)
              setSelectedId('') // lists are disjoint — clear the picked job
              setQuery('')
              setShowList(false)
            }}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold border ${
              jobFilter === opt.v
                ? 'border-green-700 bg-green-50 text-green-800'
                : 'border-gray-300 text-gray-600'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="mb-4 relative">
        <label className="block text-xs font-medium text-gray-500 mb-1">Search a job</label>
        <input
          type="text"
          value={query}
          onChange={e => {
            setQuery(e.target.value)
            setShowList(true)
            if (selectedId) setSelectedId('')
          }}
          onFocus={() => setShowList(true)}
          onBlur={() => setTimeout(() => setShowList(false), 150)}
          placeholder={loading ? 'Loading jobs…' : 'Type to search ' + jobFilter + ' jobs…'}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
        />
        {showList && (
          <ul className="absolute z-20 left-0 right-0 mt-1 max-h-72 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
            {matches.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-400">
                {loading ? 'Loading…' : 'No ' + jobFilter + ' jobs match'}
              </li>
            ) : (
              matches.map(j => (
                <li key={j.id}>
                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => {
                      setSelectedId(j.id)
                      setQuery(jobLabel(j))
                      setShowList(false)
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-green-50 ${
                      String(selectedId) === String(j.id) ? 'bg-green-50 font-semibold' : ''
                    }`}
                  >
                    {jobLabel(j)}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
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
