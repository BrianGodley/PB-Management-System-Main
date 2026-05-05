// src/pages/Info.jsx
//
// "Info" page reachable from the mobile dock's ℹ️ Info button.
//
// Layout deliberately mirrors the Jobs page's first view:
//   - Page title ("Info")
//   - Mobile job-selector dropdown
//   - Inline info card rendered below once a job is picked
//
// The address row carries a small Google Maps icon that opens the address
// in Google Maps (the OS picks the maps app on phones, the website on
// desktop).
//
// Editable fields — saving patches the same `jobs` columns as the
// JobInfoModal (status, name, address, consultant, project_manager).

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const FG = '#3A5038'

// Build a Google Maps search URL from any combination of address parts.
// On phones this hands off to the Google Maps app (if installed) or the
// default maps app; on desktop it opens google.com/maps in the browser.
function googleMapsUrl({ address, city, state, zip }) {
  const parts = [address, city, state, zip].map(s => (s || '').trim()).filter(Boolean)
  if (!parts.length) return null
  const q = encodeURIComponent(parts.join(', '))
  return `https://www.google.com/maps/search/?api=1&query=${q}`
}

export default function Info() {
  const [jobs,            setJobs]            = useState([])
  const [loading,         setLoading]         = useState(true)
  const [employees,       setEmployees]       = useState([])
  const [selectedId,      setSelectedId]      = useState('')
  const [activeTab,       setActiveTab]       = useState('info')
  const [saving,          setSaving]          = useState(false)
  const [saveError,       setSaveError]       = useState('')

  // Editable fields for the currently selected job. We hydrate these
  // whenever the picker changes.
  const [status,         setStatus]         = useState('active')
  const [jobTitle,       setJobTitle]       = useState('')
  const [address,        setAddress]        = useState('')
  const [city,           setCity]           = useState('')
  const [state,          setState]          = useState('')
  const [zip,            setZip]            = useState('')
  const [consultant,     setConsultant]     = useState('')
  const [projectManager, setProjectManager] = useState('')

  // Load the user's jobs once on mount. Active jobs are surfaced first,
  // then alpha-by-name. Limit 500 — same as the dock picker had.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    supabase
      .from('jobs')
      .select('id, name, client_name, status, job_address, job_city, job_state, job_zip, consultant, project_manager')
      .order('status', { ascending: true })
      .order('name',   { ascending: true })
      .limit(500)
      .then(({ data }) => {
        if (cancelled) return
        setJobs(data || [])
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  // Active employees populate the consultant + project-manager pickers.
  useEffect(() => {
    supabase
      .from('employees')
      .select('id, first_name, last_name')
      .eq('status', 'active')
      .order('last_name')
      .then(({ data }) => { if (data) setEmployees(data) })
  }, [])

  // Hydrate the editable fields when the picker changes.
  const selectedJob = selectedId
    ? jobs.find(j => String(j.id) === String(selectedId)) || null
    : null

  useEffect(() => {
    if (!selectedJob) return
    setStatus(selectedJob.status || 'active')
    setJobTitle(selectedJob.name || selectedJob.client_name || '')
    setAddress(selectedJob.job_address || '')
    setCity(selectedJob.job_city || '')
    setState(selectedJob.job_state || '')
    setZip(selectedJob.job_zip || '')
    setConsultant(selectedJob.consultant || '')
    setProjectManager(selectedJob.project_manager || '')
    setSaveError('')
    setActiveTab('info')
  }, [selectedJob?.id])

  const employeeOptions = employees.map(e => ({
    value: `${e.first_name} ${e.last_name}`.trim(),
    label: `${e.last_name}, ${e.first_name}`.trim(),
  }))

  async function handleSave() {
    if (!selectedJob) return
    if (!jobTitle.trim()) { setSaveError('Job title cannot be empty.'); return }
    setSaving(true)
    setSaveError('')
    const updates = {
      name:            jobTitle.trim(),
      status,
      job_address:     address.trim(),
      job_city:        city.trim(),
      job_state:       state.trim(),
      job_zip:         zip.trim(),
      consultant:      consultant || null,
      project_manager: projectManager || null,
    }
    const { error } = await supabase.from('jobs').update(updates).eq('id', selectedJob.id)
    setSaving(false)
    if (error) { setSaveError('Failed to save. Please try again.'); return }
    // Reflect locally so the dropdown label updates if the title changed.
    setJobs(prev => prev.map(j => j.id === selectedJob.id ? { ...j, ...updates } : j))
  }

  const mapsUrl = googleMapsUrl({ address, city, state, zip })

  const TABS = [
    { key: 'info',      label: 'Job Info' },
    { key: 'client',    label: 'Client' },
    { key: 'employees', label: 'Employees' },
  ]

  return (
    <div className="flex flex-col h-full">

      {/* ── Page title — mirrors Jobs ─────────────────────────── */}
      <div className="mb-4 flex-shrink-0">
        <h1 className="text-xl font-bold text-gray-900">Info</h1>
      </div>

      {/* ── Job selector ─────────────────────────────────────── */}
      <div className="mb-3 flex-shrink-0">
        <select
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          className="input text-sm w-full max-w-md"
          disabled={loading}
        >
          <option value="">{loading ? 'Loading jobs…' : 'Select a job…'}</option>
          {jobs.map(job => (
            <option key={job.id} value={job.id}>
              {job.name || job.client_name || `Job ${job.id}`}
            </option>
          ))}
        </select>
      </div>

      {/* ── Info card ─────────────────────────────────────────── */}
      {!selectedJob ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-400">
          Pick a job above to see its info.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col max-w-2xl">

          {/* Header */}
          <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-start justify-between flex-shrink-0">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">Job</p>
              <h2 className="text-lg font-bold text-gray-900 truncate">
                {selectedJob.name || selectedJob.client_name}
              </h2>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100 px-5 flex-shrink-0">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-2.5 mr-5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-green-600 text-green-700'
                    : 'border-transparent text-gray-400 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1">

            {/* Job Info tab */}
            {activeTab === 'info' && (
              <div className="px-5 py-4 space-y-5">

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Main Details</p>
                  <div className="space-y-3">

                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Status</label>
                      <select
                        value={status}
                        onChange={e => setStatus(e.target.value)}
                        className="input text-sm w-full"
                      >
                        <option value="active">Open</option>
                        <option value="completed">Closed</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Job Title</label>
                      <input
                        type="text"
                        value={jobTitle}
                        onChange={e => { setJobTitle(e.target.value); setSaveError('') }}
                        className="input text-sm w-full"
                        placeholder="Job name"
                      />
                    </div>

                    {/* Address row with Google Maps pin */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Street Address</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={address}
                          onChange={e => setAddress(e.target.value)}
                          className="input text-sm flex-1"
                          placeholder="123 Main St"
                        />
                        {mapsUrl ? (
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open in Google Maps"
                            className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-sm hover:opacity-90 transition-opacity"
                            style={{ backgroundColor: FG }}
                          >
                            {/* Map-pin icon */}
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0z"/>
                              <circle cx="12" cy="10" r="3"/>
                            </svg>
                          </a>
                        ) : (
                          <button
                            type="button"
                            disabled
                            title="Add an address to enable Maps"
                            className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-gray-300 border border-gray-200 cursor-not-allowed"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0z"/>
                              <circle cx="12" cy="10" r="3"/>
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">City</label>
                        <input
                          type="text"
                          value={city}
                          onChange={e => setCity(e.target.value)}
                          className="input text-sm w-full"
                          placeholder="City"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">State</label>
                        <input
                          type="text"
                          value={state}
                          onChange={e => setState(e.target.value)}
                          className="input text-sm w-full"
                          placeholder="CA"
                          maxLength={2}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Zip</label>
                        <input
                          type="text"
                          value={zip}
                          onChange={e => setZip(e.target.value)}
                          className="input text-sm w-full"
                          placeholder="90210"
                          maxLength={10}
                        />
                      </div>
                    </div>

                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">More Details</p>
                  <div className="space-y-3">

                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Consultant</label>
                      <select
                        value={consultant}
                        onChange={e => setConsultant(e.target.value)}
                        className="input text-sm w-full"
                      >
                        <option value="">— Select consultant —</option>
                        {employeeOptions.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Project Manager</label>
                      <select
                        value={projectManager}
                        onChange={e => setProjectManager(e.target.value)}
                        className="input text-sm w-full"
                      >
                        <option value="">— Select project manager —</option>
                        {employeeOptions.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>

                  </div>
                </div>

                {saveError && <p className="text-xs text-red-500">{saveError}</p>}
              </div>
            )}

            {/* Client tab */}
            {activeTab === 'client' && (
              <div className="px-5 py-4 space-y-3">
                {selectedJob.client_name && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Client</p>
                    <p className="text-sm font-medium text-gray-800">{selectedJob.client_name}</p>
                  </div>
                )}
                {address && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Job Address</p>
                    <p className="text-sm text-gray-700">{address}</p>
                  </div>
                )}
                <p className="text-xs text-gray-400 italic pt-2">Additional client details coming soon.</p>
              </div>
            )}

            {/* Employees tab */}
            {activeTab === 'employees' && (
              <div className="px-5 py-4">
                {(consultant || projectManager) ? (
                  <div className="space-y-3">
                    {consultant && (
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Consultant</p>
                        <p className="text-sm font-medium text-gray-800">{consultant}</p>
                      </div>
                    )}
                    {projectManager && (
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Project Manager</p>
                        <p className="text-sm font-medium text-gray-800">{projectManager}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No employees assigned yet. Set them in the Job Info tab.</p>
                )}
                <p className="text-xs text-gray-400 italic pt-4">Full employee assignment coming soon.</p>
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-gray-100 flex gap-2 flex-shrink-0">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary text-sm py-2 px-4 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => setSelectedId('')}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
