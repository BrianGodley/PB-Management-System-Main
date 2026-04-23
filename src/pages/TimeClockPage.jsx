import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import TimeClock from '../components/TimeClock'

export default function TimeClockPage() {
  const [jobs,        setJobs]        = useState([])
  const [selectedJob, setSelectedJob] = useState('all')
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    supabase.from('jobs').select('*').order('sold_date', { ascending: false })
      .then(({ data }) => { if (data) setJobs(data); setLoading(false) })
  }, [])

  return (
    <div className="flex flex-col h-full">

      {/* Minimal header with job filter */}
      <div className="flex-shrink-0 mb-4">
        <h1 className="text-lg font-bold text-gray-900 mb-3">Time Clock</h1>
        {!loading && (
          <select
            value={selectedJob}
            onChange={e => setSelectedJob(e.target.value)}
            className="input text-sm w-full"
          >
            <option value="all">All Jobs</option>
            {jobs.map(j => (
              <option key={j.id} value={j.id}>{j.name || j.client_name}</option>
            ))}
          </select>
        )}
      </div>

      {/* TimeClock component */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-green-700" />
          </div>
        ) : (
          <TimeClock jobs={jobs} selectedJob={selectedJob} />
        )}
      </div>
    </div>
  )
}
