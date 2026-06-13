import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fetchAllPaginated } from '../lib/fetchAll'
import { useLang } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import TimeClock from '../components/TimeClock'
import MobileTimeClock from '../components/MobileTimeClock'

const today = () => new Date().toISOString().split('T')[0]

export default function TimeClockPage() {
  const { t } = useLang()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const jobParam = searchParams.get('job')
  const [jobs, setJobs] = useState([])
  const [selectedJob, setSelectedJob] = useState(jobParam || 'all')
  const [loading, setLoading] = useState(true)

  // Searchable job picker state.
  const [query, setQuery] = useState('')
  const [showList, setShowList] = useState(false)
  // Skip the schedule-based auto-pick if a job was passed in the URL.
  const autoApplied = useRef(!!jobParam)

  const jobLabel = j => j.name || j.client_name || 'Untitled job'

  useEffect(() => {
    // Server max-rows is 1k; paginate to get all 2k+ jobs.
    fetchAllPaginated(() =>
      supabase.from('jobs').select('*').order('sold_date', { ascending: false })
    ).then(({ data }) => {
      if (data) setJobs(data)
      setLoading(false)
    })
  }, [])

  // Auto-select the job this user is scheduled on TODAY (from the calendar).
  // If they're on more than one, default to the first; the user can override
  // by picking a different job in the searchable field below.
  useEffect(() => {
    if (autoApplied.current || loading || !jobs.length || !user?.id) return
    let cancelled = false
    ;(async () => {
      // Resolve the user's display name to match schedule_items.assignees.
      const { data: prof } = await supabase
        .from('profiles')
        .select('first_name, last_name, full_name, display_name, name')
        .eq('id', user.id)
        .single()
      const name =
        (prof &&
          ([prof.first_name, prof.last_name].filter(Boolean).join(' ') ||
            prof.full_name ||
            prof.display_name ||
            prof.name)) ||
        ''
      if (cancelled || !name.trim()) return

      const d = today()
      const { data: sched } = await supabase
        .from('schedule_items')
        .select('job_id, start_date, end_date, assignees')
        .lte('start_date', d)
        .gte('end_date', d)
        .ilike('assignees', `%${name.trim()}%`)
        .order('start_date', { ascending: true })

      if (cancelled) return
      autoApplied.current = true
      const hit = (sched || []).find(s => s.job_id && jobs.some(j => j.id === s.job_id))
      // Only auto-fill if the user hasn't already chosen a job.
      if (hit && selectedJob === 'all') {
        const j = jobs.find(x => x.id === hit.job_id)
        setSelectedJob(hit.job_id)
        if (j) setQuery(jobLabel(j))
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, jobs, user?.id])

  function selectJob(j) {
    setSelectedJob(j.id)
    setQuery(jobLabel(j))
    setShowList(false)
  }

  // Clock in/out is only valid against OPEN jobs — never closed ones.
  const jobIsOpen = j => {
    const s = j?.status || 'active'
    return s === 'active' || s === 'on_hold'
  }
  const openJobs = jobs.filter(jobIsOpen)
  const q = query.trim().toLowerCase()
  const matches = (q ? openJobs.filter(j => jobLabel(j).toLowerCase().includes(q)) : openJobs).slice(
    0,
    50
  )

  return (
    <div className="flex flex-col h-full">
      {/* Title + close X are provided centrally by Layout's green bar. */}
      {/* Minimal header with searchable job picker */}
      <div className="flex-shrink-0 mb-4">
        {/* Desktop uses this page-level job picker; mobile has its own inside
            MobileTimeClock, so it's hidden on phones. */}
        {!loading && (
          <div className="relative hidden lg:block">
            <input
              type="text"
              value={query}
              onChange={e => {
                setQuery(e.target.value)
                setShowList(true)
                if (selectedJob !== 'all') setSelectedJob('all')
              }}
              onFocus={() => setShowList(true)}
              onBlur={() => setTimeout(() => setShowList(false), 150)}
              placeholder={t('selectJob') || 'Search for a job…'}
              className={`input text-sm w-full ${selectedJob === 'all' ? 'border-red-300' : ''}`}
            />
            {showList && (
              <ul className="absolute z-30 left-0 right-0 mt-1 max-h-72 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                {matches.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-gray-400">No matching jobs</li>
                ) : (
                  matches.map(j => (
                    <li key={j.id}>
                      <button
                        type="button"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => selectJob(j)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-green-50 ${
                          String(selectedJob) === String(j.id) ? 'bg-green-50 font-semibold' : ''
                        }`}
                      >
                        {jobLabel(j)}
                      </button>
                    </li>
                  ))
                )}
                {!q && openJobs.length > 50 && (
                  <li className="px-3 py-1.5 text-[11px] text-gray-400 border-t border-gray-100">
                    Showing first 50 — type to search all {openJobs.length} open jobs
                  </li>
                )}
              </ul>
            )}
            {selectedJob === 'all' && (
              <p className="text-xs text-red-500 mt-1.5 px-0.5">{t('jobRequired')}</p>
            )}
          </div>
        )}
      </div>

      {/* Desktop = full table (TimeClock); mobile = new clock-in flow. */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-green-700" />
          </div>
        ) : (
          <>
            <div className="hidden lg:block">
              <TimeClock jobs={jobs} selectedJob={selectedJob} />
            </div>
            <div className="lg:hidden h-full">
              <MobileTimeClock />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
