// src/components/JobInfoModal.jsx
//
// Shared "Job Info" modal — 3 tabs (Job Info / Client / Employees).
//
// Originally lived inside src/pages/JobsList.jsx. Promoted to a shared
// component so the mobile dock's Info link can also pop it up after the
// user picks a job from a job-picker sheet.
//
// Props:
//   job       – the job row (must have at least { id, name, ... })
//   onClose   – () => void
//   onSave    – async (jobId, updates) => boolean   (truthy = saved ok)
//   onDelete  – async (jobId, jobName) => void

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function JobInfoModal({ job, onClose, onSave, onDelete }) {
  const [activeTab, setActiveTab] = useState('info')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')
  const [employees, setEmployees] = useState([])
  // Joined client + contact data for the Client tab. Loaded once on mount.
  const [clientData,  setClientData]  = useState(null)
  const [contactData, setContactData] = useState(null)
  const [loadingClient, setLoadingClient] = useState(false)
  // Site Access fields (live on jobs). Editable.
  const [gateCode,    setGateCode]    = useState(job.gate_code || '')
  const [hasDog,      setHasDog]      = useState(!!job.has_dog)
  const [accessNotes, setAccessNotes] = useState(job.access_notes || '')

  // Job Info tab fields
  const [status,         setStatus]         = useState(job.status || 'active')
  const [jobTitle,       setJobTitle]       = useState(job.name || job.client_name || '')
  const [address,        setAddress]        = useState(job.job_address || '')
  const [city,           setCity]           = useState(job.job_city || '')
  const [state,          setState]          = useState(job.job_state || '')
  const [zip,            setZip]            = useState(job.job_zip || '')
  // Contract price prefers the modern total_price column, falls back to the
  // legacy contract_price for older job rows. Stored as a string while editing
  // so we don't fight the input over partial values like "12500." or "".
  const [contractPrice,  setContractPrice]  = useState(() => {
    const v = job.total_price ?? job.contract_price ?? ''
    return v === '' || v === null || v === undefined ? '' : String(v)
  })
  const [permitNumber,   setPermitNumber]   = useState(job.permit_number || '')
  const [consultant,     setConsultant]     = useState(job.consultant || '')
  const [projectManager, setProjectManager] = useState(job.project_manager || '')

  useEffect(() => {
    supabase.from('employees')
      .select('id, first_name, last_name')
      .eq('status', 'active')
      .order('last_name')
      .then(({ data }) => { if (data) setEmployees(data) })
  }, [])

  // Load the joined client + contact for the Client tab.
  // Tries the real FK first (job.client_id), falls back to a name match
  // for jobs created before the bid→job FK fix landed. After resolving the
  // client, we look up the contacts row that points back via contacts.client_id
  // so we can surface contact-only fields (cell, marketing source, etc.).
  useEffect(() => {
    let cancelled = false
    setLoadingClient(true)
    ;(async () => {
      let client = null

      if (job.client_id) {
        const { data } = await supabase.from('clients')
          .select('*').eq('id', job.client_id).maybeSingle()
        client = data || null
      }
      if (!client && job.client_name) {
        const { data: matches } = await supabase.from('clients')
          .select('*').ilike('name', job.client_name.trim()).limit(2)
        if (matches?.length === 1) client = matches[0]
      }

      let contact = null
      if (client) {
        const { data } = await supabase.from('contacts')
          .select('id, first_name, last_name, phone, cell, email, source, how_did_you_hear, campaign, project_description, tags')
          .eq('client_id', client.id).maybeSingle()
        contact = data || null
      }

      if (!cancelled) {
        setClientData(client)
        setContactData(contact)
        setLoadingClient(false)
      }
    })()
    return () => { cancelled = true }
  }, [job.id, job.client_id, job.client_name])

  const employeeOptions = employees.map(e => ({
    value: `${e.first_name} ${e.last_name}`.trim(),
    label: `${e.last_name}, ${e.first_name}`.trim(),
  }))

  async function handleSave() {
    if (!jobTitle.trim()) { setError('Job title cannot be empty.'); return }
    setSaving(true)
    setError('')
    // Coerce the contract price string back to a number; blank/invalid → null
    const cpNum = contractPrice === '' ? null : parseFloat(contractPrice)
    const ok = await onSave(job.id, {
      name:            jobTitle.trim(),
      status,
      job_address:     address.trim(),
      job_city:        city.trim(),
      job_state:       state.trim(),
      job_zip:         zip.trim(),
      total_price:     Number.isFinite(cpNum) ? cpNum : null,
      permit_number:   permitNumber.trim() || null,
      gate_code:       gateCode.trim() || null,
      has_dog:         !!hasDog,
      access_notes:    accessNotes.trim() || null,
      consultant:      consultant || null,
      project_manager: projectManager || null,
    })
    setSaving(false)
    if (!ok) setError('Failed to save. Please try again.')
  }

  const TABS = [
    { key: 'info',      label: 'Job Info' },
    { key: 'client',    label: 'Client' },
    { key: 'employees', label: 'Employees' },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-start justify-between flex-shrink-0">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">Job</p>
            <h2 className="text-lg font-bold text-gray-900 truncate">{job.name || job.client_name}</h2>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 ml-3 mt-0.5 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab bar */}
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
        <div className="overflow-y-auto flex-1">

          {/* ── Job Info tab ── */}
          {activeTab === 'info' && (
            <div className="px-5 py-4 space-y-5">

              {/* Main Details */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Main Details</p>

                {/* Row 1: Status + Job Title (Job Title takes 2 cols on wide screens) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
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
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Job Name</label>
                    <input
                      type="text"
                      value={jobTitle}
                      onChange={e => { setJobTitle(e.target.value); setError('') }}
                      className="input text-sm w-full"
                      placeholder="Job name"
                    />
                  </div>
                </div>

                {/* Row 2: Street Address (full width) */}
                <div className="mb-3">
                  <label className="block text-xs text-gray-500 mb-1">Job Street Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="input text-sm w-full"
                    placeholder="123 Main St"
                  />
                </div>

                {/* Row 3: City, State, Zip */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="col-span-1">
                    <label className="block text-xs text-gray-500 mb-1">Job City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      className="input text-sm w-full"
                      placeholder="City"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs text-gray-500 mb-1">Job State</label>
                    <input
                      type="text"
                      value={state}
                      onChange={e => setState(e.target.value)}
                      className="input text-sm w-full"
                      placeholder="CA"
                      maxLength={2}
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs text-gray-500 mb-1">Job Zip Code</label>
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

                {/* Row 4: Contract Price + Permit # */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Job Total Contract Price</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={contractPrice}
                        onChange={e => setContractPrice(e.target.value)}
                        className="input text-sm w-full pl-7"
                        placeholder="0.00"
                      />
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">Pulled from the sold bid; edit if the contract has changed.</p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Permit #</label>
                    <input
                      type="text"
                      value={permitNumber}
                      onChange={e => setPermitNumber(e.target.value)}
                      className="input text-sm w-full"
                      placeholder="e.g. BLD-2026-00123"
                    />
                  </div>
                </div>
              </div>

              {/* Assignments */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Assignments</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                    <label className="block text-xs text-gray-500 mb-1">Job Supervisor</label>
                    <select
                      value={projectManager}
                      onChange={e => setProjectManager(e.target.value)}
                      className="input text-sm w-full"
                    >
                      <option value="">— Select job supervisor —</option>
                      {employeeOptions.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          )}

          {/* ── Client tab ── */}
          {activeTab === 'client' && (
            <div className="px-5 py-4 space-y-5">
              {loadingClient ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-700" />
                </div>
              ) : !clientData ? (
                <div className="text-sm text-gray-500 space-y-2">
                  <p>
                    <span className="font-semibold text-gray-800">{job.client_name || 'Unknown client'}</span>
                  </p>
                  <p className="text-xs text-gray-400 italic">
                    No matching client record found. This usually means the job was imported from BuilderTrend or the client name on the job doesn't exactly match a record in the Clients module. Open the contact or client manually to fill in details.
                  </p>
                </div>
              ) : (
                <>
                  {/* IDENTITY */}
                  <Section title="Identity">
                    {clientData.client_type === 'company' || clientData.company_name ? (
                      <>
                        <Field label="Company" value={clientData.company_name || clientData.name} />
                        {clientData.company_position && <Field label="Position" value={clientData.company_position} />}
                        {(clientData.first_name || clientData.last_name) && (
                          <Field label="Primary contact" value={`${clientData.first_name || ''} ${clientData.last_name || ''}`.trim()} />
                        )}
                      </>
                    ) : (
                      <>
                        <Field label="Name" value={clientData.name || `${clientData.first_name || ''} ${clientData.last_name || ''}`.trim()} />
                        {(clientData.spouse_first_name || clientData.spouse_last_name) && (
                          <Field
                            label="Spouse / partner"
                            value={`${clientData.spouse_first_name || ''} ${clientData.spouse_last_name || ''}`.trim()}
                          />
                        )}
                        {(contactData?.secondary_first_name || contactData?.secondary_last_name) && (
                          <Field
                            label="Secondary contact (from contact)"
                            value={`${contactData.secondary_first_name || ''} ${contactData.secondary_last_name || ''}`.trim()}
                          />
                        )}
                      </>
                    )}
                    <Field label="Client type" value={clientData.client_type || 'individual'} mono />
                    {contactData?.source        && <Field label="Source"          value={contactData.source} />}
                    {contactData?.how_did_you_hear && <Field label="How did you hear?" value={contactData.how_did_you_hear} />}
                    {contactData?.campaign      && <Field label="Campaign"        value={contactData.campaign} />}
                  </Section>

                  {/* CONTACT INFO */}
                  <Section title="Contact info">
                    <Field label="Phone"        value={clientData.phone || '—'} link={clientData.phone ? `tel:${clientData.phone}` : null} />
                    {contactData?.cell && contactData.cell !== clientData.phone && (
                      <Field label="Cell"       value={contactData.cell} link={`tel:${contactData.cell}`} />
                    )}
                    <Field label="Email"        value={clientData.email || '—'} link={clientData.email ? `mailto:${clientData.email}` : null} />
                    {clientData.other_email   && <Field label="Other email"   value={clientData.other_email} link={`mailto:${clientData.other_email}`} />}
                    {clientData.website       && <Field label="Website"       value={clientData.website} link={clientData.website.startsWith('http') ? clientData.website : `https://${clientData.website}`} />}
                  </Section>

                  {/* BILLING / MAILING ADDRESS */}
                  <Section title="Billing / mailing address">
                    {(clientData.street || clientData.city || clientData.state || clientData.zip) ? (
                      <>
                        {clientData.street && <Field label="Street" value={clientData.street} />}
                        <Field label="City / State / Zip"
                          value={[clientData.city, clientData.state, clientData.zip].filter(Boolean).join(', ') || '—'} />
                        {clientData.other_address && <Field label="Other address" value={clientData.other_address} />}
                      </>
                    ) : (
                      <p className="text-xs text-gray-400 italic">No billing address on file.</p>
                    )}
                  </Section>

                  {/* COMPANY CONTACTS (only for company clients) */}
                  {(clientData.client_type === 'company' || (clientData.company_contacts || []).length > 0) && (
                    <Section title="Company contacts">
                      {(clientData.company_contacts || []).length === 0 ? (
                        <p className="text-xs text-gray-400 italic">No company contacts listed.</p>
                      ) : (
                        <div className="space-y-2">
                          {clientData.company_contacts.map((cc, i) => (
                            <div key={i} className="border border-gray-200 rounded-lg p-2.5">
                              <p className="text-sm font-semibold text-gray-800">
                                {`${cc.first_name || ''} ${cc.last_name || ''}`.trim() || '—'}
                                {cc.position && <span className="text-xs text-gray-500 font-normal ml-2">· {cc.position}</span>}
                              </p>
                              {(cc.phone || cc.email) && (
                                <p className="text-xs text-gray-600 mt-0.5 flex gap-3">
                                  {cc.phone && <a href={`tel:${cc.phone}`} className="hover:text-green-700">{cc.phone}</a>}
                                  {cc.email && <a href={`mailto:${cc.email}`} className="hover:text-green-700">{cc.email}</a>}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </Section>
                  )}

                  {/* PROJECT NOTES (from contact, when available) */}
                  {contactData?.project_description && (
                    <Section title="Project description (from contact)">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{contactData.project_description}</p>
                    </Section>
                  )}
                </>
              )}

              {/* SITE ACCESS — always editable, lives on the job row */}
              <Section title="Site access">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Gate code</label>
                    <input
                      type="text" value={gateCode}
                      onChange={e => setGateCode(e.target.value)}
                      className="input text-sm w-full"
                      placeholder="e.g. 1234#"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="has-dog" type="checkbox" checked={hasDog}
                      onChange={e => setHasDog(e.target.checked)}
                      className="w-4 h-4 rounded accent-amber-600"
                    />
                    <label htmlFor="has-dog" className="text-sm text-gray-700 cursor-pointer">🐕 Dog on premises</label>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Access notes</label>
                    <textarea
                      rows={3} value={accessNotes}
                      onChange={e => setAccessNotes(e.target.value)}
                      className="input text-sm w-full"
                      placeholder="e.g. Keys with neighbor at #45 · Park on the street · Side gate sticks"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 italic">These will move into the Job Details questionnaire when that lands; safe to fill in for now.</p>
                </div>
              </Section>
            </div>
          )}

          {/* ── Employees tab ── */}
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
                      <p className="text-xs text-gray-400 mb-0.5">Job Supervisor</p>
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
            className="flex-1 btn-primary text-sm py-2 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Close
          </button>
          {onDelete && (
            <button
              onClick={() => onDelete(job.id, job.name || job.client_name)}
              className="px-4 py-2 text-sm rounded-lg border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Small presentational helpers for the Client tab ──────────────────────────
function Section({ title, children }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function Field({ label, value, link, mono }) {
  if (value === null || value === undefined || value === '') return null
  const valEl = link
    ? <a href={link} className="text-sm text-gray-800 hover:text-green-700 underline-offset-2 hover:underline">{value}</a>
    : <span className={`text-sm text-gray-800 ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
  return (
    <div className="grid grid-cols-3 gap-2">
      <span className="text-xs text-gray-400 col-span-1">{label}</span>
      <div className="col-span-2 min-w-0 truncate">{valEl}</div>
    </div>
  )
}
