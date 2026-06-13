import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fetchAllPaginated } from '../lib/fetchAll'
import { useLang } from '../contexts/LanguageContext'
import DailyLogs from '../components/DailyLogs'

export default function DailyLogsPage() {
  const { t } = useLang()
  const [searchParams] = useSearchParams()
  const [jobs, setJobs] = useState([])
  const [selectedJob, setSelectedJob] = useState(searchParams.get('job') || 'all')
  const [loading, setLoading] = useState(true)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [jobQuery, setJobQuery] = useState('')

  useEffect(() => {
    // Server max-rows is 1k; paginate to get all 2k+ jobs.
    fetchAllPaginated(() =>
      supabase.from('jobs').select('*').order('sold_date', { ascending: false })
    ).then(({ data }) => {
      if (data) setJobs(data)
      setLoading(false)
    })
  }, [])

  const jobLabel = j => j.name || j.client_name || 'Untitled job'
  const selectedLabel =
    selectedJob === 'all' ? t('allJobs') : jobs.find(j => j.id === selectedJob)
      ? jobLabel(jobs.find(j => j.id === selectedJob))
      : 'Select job'
  const pickerJobs = useMemo(() => {
    const q = jobQuery.trim().toLowerCase()
    if (!q) return jobs
    return jobs.filter(j => jobLabel(j).toLowerCase().includes(q))
  }, [jobs, jobQuery])

  return (
    <div className="flex flex-col h-full">
      {/* Minimal header with searchable job picker (dropdown + search) */}
      <div className="flex-shrink-0 mb-4">
        <h1 className="hidden lg:block text-lg font-bold text-gray-900 mb-3">{t('dailyLogsTitle')}</h1>
        {!loading && (
          <div className="relative">
            <button
              onClick={() => setPickerOpen(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white"
            >
              <span className="truncate text-gray-800">{selectedLabel}</span>
              <span className="text-gray-400">{pickerOpen ? '▲' : '▼'}</span>
            </button>
            {pickerOpen && (
              <div className="absolute left-0 right-0 mt-1 rounded-lg border border-gray-200 shadow-lg bg-white z-30">
                <input
                  autoFocus
                  type="text"
                  value={jobQuery}
                  onChange={e => setJobQuery(e.target.value)}
                  placeholder="Search jobs…"
                  className="w-full px-3 py-2 border-b border-gray-100 text-sm focus:outline-none"
                />
                <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                  <button
                    onClick={() => {
                      setSelectedJob('all')
                      setPickerOpen(false)
                      setJobQuery('')
                    }}
                    className={`w-full text-left px-3 py-2 text-sm ${
                      selectedJob === 'all' ? 'bg-green-50 text-green-800' : 'hover:bg-gray-50'
                    }`}
                  >
                    {t('allJobs')}
                  </button>
                  {pickerJobs.slice(0, 100).map(j => (
                    <button
                      key={j.id}
                      onClick={() => {
                        setSelectedJob(j.id)
                        setPickerOpen(false)
                        setJobQuery('')
                      }}
                      className={`w-full text-left px-3 py-2 text-sm ${
                        selectedJob === j.id ? 'bg-green-50 text-green-800' : 'hover:bg-gray-50'
                      }`}
                    >
                      {jobLabel(j)}
                    </button>
                  ))}
                  {pickerJobs.length === 0 && (
                    <p className="px-3 py-3 text-sm text-gray-400 text-center">No jobs found</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* DailyLogs component */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-green-700" />
          </div>
        ) : (
          <DailyLogs
            jobs={jobs}
            selectedJob={selectedJob}
            newLogTrigger={searchParams.get('new') === '1'}
          />
        )}
      </div>
    </div>
  )
}
