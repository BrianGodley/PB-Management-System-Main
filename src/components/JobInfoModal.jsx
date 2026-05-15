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

// Same list ClientDetail uses for its state dropdown — keep them in sync.
const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
]

// `inline` (default false): when true, render the same content without the
// fixed-overlay modal chrome — used by JobsList's Info tab to host the same
// UI directly inside the right panel. Hides the X / Close buttons since the
// user navigates away by clicking another tab.
export default function JobInfoModal({ job, onClose, onSave, onDelete, inline = false }) {
  const [activeTab, setActiveTab] = useState('info')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')
  const [employees, setEmployees] = useState([])
  // Joined client + contact data for the Client tab. Loaded once on mount.
  const [clientData,  setClientData]  = useState(null)
  const [contactData, setContactData] = useState(null)
  const [loadingClient, setLoadingClient] = useState(false)
  // Client form buffer — auto-seeded from clientData by the effect below.
  // The Client tab renders these inputs always-editable; the global Save
  // button writes them back via handleSave().
  const [clientForm, setClientForm] = useState({})
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

  // Per-tab edit toggles. Both tabs default to read-only; user clicks Edit
  // to switch into the input form. (Will become permission-driven later.)
  const [editingDetails, setEditingDetails] = useState(false)
  const [editingClient,  setEditingClient]  = useState(false)

  // Revert all Job Details state back to whatever's on the job prop. Used by
  // Cancel in the Details tab.
  function resetDetailsForm() {
    setStatus(job.status || 'active')
    setJobTitle(job.name || job.client_name || '')
    setAddress(job.job_address || '')
    setCity(job.job_city || '')
    setState(job.job_state || '')
    setZip(job.job_zip || '')
    const v = job.total_price ?? job.contract_price ?? ''
    setContractPrice(v === '' || v === null || v === undefined ? '' : String(v))
    setPermitNumber(job.permit_number || '')
    setConsultant(job.consultant || '')
    setProjectManager(job.project_manager || '')
    setError('')
  }

  // Revert Client tab + Site Access state back to last-loaded values. Used
  // by Cancel in the Client tab.
  function resetClientForm() {
    if (clientData) {
      setClientForm({
        first_name:        clientData.first_name        || '',
        last_name:         clientData.last_name         || '',
        spouse_first_name: clientData.spouse_first_name || '',
        spouse_last_name:  clientData.spouse_last_name  || '',
        company_name:      clientData.company_name      || '',
        company_position:  clientData.company_position  || '',
        email:             clientData.email             || '',
        phone:             clientData.phone             || '',
        cell:              clientData.cell              || '',
        _additionalEmailsRaw: Array.isArray(clientData.additional_emails) ? clientData.additional_emails.join('\n') : '',
        _additionalPhonesRaw: Array.isArray(clientData.additional_phones) ? clientData.additional_phones.join('\n') : '',
        street:            clientData.street            || '',
        city:              clientData.city              || '',
        state:             clientData.state             || '',
        zip:               clientData.zip               || '',
        other_email:       clientData.other_email       || '',
        other_address:     clientData.other_address     || '',
        website:           clientData.website           || '',
        notes:             clientData.notes             || '',
      })
    }
    setGateCode(job.gate_code || '')
    setHasDog(!!job.has_dog)
    setAccessNotes(job.access_notes || '')
  }

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

  // Detect unsaved Client-tab edits — used to skip auto-refresh below so
  // we don't clobber what the user is typing.
  function isClientFormDirty() {
    if (!clientData) return false
    const f = clientForm
    const scalarKeys = [
      'first_name','last_name','spouse_first_name','spouse_last_name',
      'company_name','company_position','email','phone','cell',
      'street','city','state','zip','other_email','other_address','website','notes',
    ]
    if (scalarKeys.some(k => (f[k] || '') !== (clientData[k] || ''))) return true
    const eRaw = Array.isArray(clientData.additional_emails) ? clientData.additional_emails.join('\n') : ''
    const pRaw = Array.isArray(clientData.additional_phones) ? clientData.additional_phones.join('\n') : ''
    return (f._additionalEmailsRaw || '') !== eRaw || (f._additionalPhonesRaw || '') !== pRaw
  }

  // When the user switches INTO the Client tab, re-fetch the client row so
  // any external edits (Clients page, ClientDetail, etc.) show up here.
  // Skip if the form is dirty so we don't lose unsaved edits.
  useEffect(() => {
    if (activeTab !== 'client' || !clientData?.id) return
    if (isClientFormDirty()) return
    let cancelled = false
    ;(async () => {
      const { data } = await supabase.from('clients')
        .select('*').eq('id', clientData.id).maybeSingle()
      if (!cancelled && data) setClientData(data)
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, clientData?.id])

  // Whenever clientData changes (initial load or after a save), reseed the
  // form buffer so the always-editable inputs in the Client tab stay in sync
  // with the latest server state. This also handles the reverse-sync case:
  // if the client was changed elsewhere and we re-fetch, the inputs update.
  useEffect(() => {
    if (!clientData) return
    setClientForm({
      first_name:        clientData.first_name        || '',
      last_name:         clientData.last_name         || '',
      spouse_first_name: clientData.spouse_first_name || '',
      spouse_last_name:  clientData.spouse_last_name  || '',
      company_name:      clientData.company_name      || '',
      company_position:  clientData.company_position  || '',
      email:             clientData.email             || '',
      phone:             clientData.phone             || '',
      cell:              clientData.cell              || '',
      _additionalEmailsRaw: Array.isArray(clientData.additional_emails) ? clientData.additional_emails.join('\n') : '',
      _additionalPhonesRaw: Array.isArray(clientData.additional_phones) ? clientData.additional_phones.join('\n') : '',
      street:            clientData.street            || '',
      city:              clientData.city              || '',
      state:             clientData.state             || '',
      zip:               clientData.zip               || '',
      other_email:       clientData.other_email       || '',
      other_address:     clientData.other_address     || '',
      website:           clientData.website           || '',
      notes:             clientData.notes             || '',
    })
  }, [clientData])

  const employeeOptions = employees.map(e => ({
    value: `${e.first_name} ${e.last_name}`.trim(),
    label: `${e.last_name}, ${e.first_name}`.trim(),
  }))

  // Save just the Job Details fields (status, name, address, contract,
  // permit, consultant, project manager). Site access lives on the job too
  // but is edited from the Client tab — see handleSaveClient.
  async function handleSaveDetails() {
    if (!jobTitle.trim()) { setError('Job title cannot be empty.'); return }
    setSaving(true)
    setError('')
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
      consultant:      consultant || null,
      project_manager: projectManager || null,
    })
    setSaving(false)
    if (!ok) setError('Failed to save the job. Please try again.')
    else     setEditingDetails(false)
  }

  // Save the client row plus the Site Access fields on the job.
  async function handleSaveClient() {
    setSaving(true)
    setError('')
    // Site access lives on the jobs row; bundle with this Save so the Client
    // tab is a self-contained editor.
    const jobOk = await onSave(job.id, {
      gate_code:    gateCode.trim() || null,
      has_dog:      !!hasDog,
      access_notes: accessNotes.trim() || null,
    })

    let clientOk = true
    if (clientData?.id) {
      const f = clientForm
      const fullName = [f.first_name, f.last_name].filter(Boolean).join(' ').trim()
      const splitMulti = raw => raw
        ? raw.split(/[\n,]+/).map(s => s.trim()).filter(Boolean)
        : null
      const addlEmails = splitMulti(f._additionalEmailsRaw)
      const addlPhones = splitMulti(f._additionalPhonesRaw)
      const updates = {
        first_name:        f.first_name?.trim()        || null,
        last_name:         f.last_name?.trim()         || null,
        spouse_first_name: f.spouse_first_name?.trim() || null,
        spouse_last_name:  f.spouse_last_name?.trim()  || null,
        name:              fullName || clientData.name,
        company_name:      f.company_name?.trim()      || null,
        company_position:  f.company_position?.trim()  || null,
        email:             f.email?.trim()             || null,
        phone:             f.phone?.trim()             || null,
        cell:              f.cell?.trim()              || null,
        additional_emails: addlEmails && addlEmails.length ? addlEmails : null,
        additional_phones: addlPhones && addlPhones.length ? addlPhones : null,
        street:            f.street?.trim()            || null,
        city:              f.city?.trim()              || null,
        state:             f.state                     || null,
        zip:               f.zip?.trim()               || null,
        other_email:       f.other_email?.trim()       || null,
        other_address:     f.other_address?.trim()     || null,
        website:           f.website?.trim()           || null,
        notes:             f.notes?.trim()             || null,
      }
      const { data, error: clientErr } = await supabase.from('clients')
        .update(updates).eq('id', clientData.id).select().single()
      if (clientErr) { clientOk = false }
      else if (data)  { setClientData(data) }
    }

    setSaving(false)
    if (!jobOk)         setError('Failed to save site access on the job.')
    else if (!clientOk) setError('Site access saved, but the client update failed.')
    else                setEditingClient(false)
  }

  const TABS = [
    { key: 'info',      label: 'Job Details' },
    { key: 'client',    label: 'Opportunity' },
    { key: 'employees', label: 'Employees' },
  ]

  // Shared inner content block. Wrapped differently below depending on
  // whether we're rendering as a modal or as an inline panel.
  const innerContent = (
    <>
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-start justify-between flex-shrink-0">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">Job</p>
            <h2 className="text-lg font-bold text-gray-900 truncate">{job.name || job.client_name}</h2>
          </div>
          {!inline && (
            <button onClick={onClose} className="text-gray-300 hover:text-gray-500 ml-3 mt-0.5 flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
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

          {/* ── Job Details tab ── */}
          {activeTab === 'info' && (
            <div className="px-5 py-4 space-y-5">

              {/* Edit / Save / Cancel toolbar */}
              <div className="flex items-center justify-between flex-shrink-0 -mb-2">
                <p className="text-xs text-gray-400">
                  {editingDetails ? 'Editing job details' : 'Read-only — click Edit to make changes'}
                </p>
                {editingDetails ? (
                  <div className="flex gap-2">
                    <button onClick={() => { resetDetailsForm(); setEditingDetails(false) }}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50">
                      Cancel
                    </button>
                    <button onClick={handleSaveDetails} disabled={saving}
                      className="px-3 py-1.5 rounded-lg bg-green-700 text-white text-xs font-semibold hover:bg-green-800 disabled:opacity-50">
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setEditingDetails(true)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-green-700 text-xs font-semibold text-green-700 hover:bg-green-50">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path d="M11.5 1.5a1.414 1.414 0 0 1 2 2L5 12l-3 1 1-3 8.5-8.5z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Edit
                  </button>
                )}
              </div>

              {/* Main Details — same layout in read and edit; inputs are
                   simply disabled when editingDetails is false. */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Main Details</p>

                {/* Row 1: Status + Job Title */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Status</label>
                    <select value={status} onChange={e => setStatus(e.target.value)}
                      disabled={!editingDetails}
                      className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default">
                      <option value="active">Open</option>
                      <option value="completed">Closed</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Job Name</label>
                    <input type="text" value={jobTitle}
                      onChange={e => { setJobTitle(e.target.value); setError('') }}
                      disabled={!editingDetails}
                      className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                      placeholder="Job name" />
                  </div>
                </div>

                {/* Row 2: Street Address */}
                <div className="mb-3">
                  <label className="block text-xs text-gray-500 mb-1">Job Street Address</label>
                  <input type="text" value={address} onChange={e => setAddress(e.target.value)}
                    disabled={!editingDetails}
                    className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                    placeholder="123 Main St" />
                </div>

                {/* Row 3: City, State, Zip */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Job City</label>
                    <input type="text" value={city} onChange={e => setCity(e.target.value)}
                      disabled={!editingDetails}
                      className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                      placeholder="City" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Job State</label>
                    <input type="text" value={state} onChange={e => setState(e.target.value)}
                      disabled={!editingDetails}
                      className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                      placeholder="CA" maxLength={2} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Job Zip Code</label>
                    <input type="text" value={zip} onChange={e => setZip(e.target.value)}
                      disabled={!editingDetails}
                      className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                      placeholder="90210" maxLength={10} />
                  </div>
                </div>

                {/* Row 4: Contract Price + Permit # */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Job Total Contract Price</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">$</span>
                      <input type="number" step="0.01" min="0" value={contractPrice}
                        onChange={e => setContractPrice(e.target.value)}
                        disabled={!editingDetails}
                        className="input text-sm w-full pl-7 disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                        placeholder="0.00" />
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">Pulled from the sold bid; edit if the contract has changed.</p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Permit #</label>
                    <input type="text" value={permitNumber} onChange={e => setPermitNumber(e.target.value)}
                      disabled={!editingDetails}
                      className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                      placeholder="e.g. BLD-2026-00123" />
                  </div>
                </div>
              </div>

              {/* Assignments */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Assignments</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Consultant</label>
                    <select value={consultant} onChange={e => setConsultant(e.target.value)}
                      disabled={!editingDetails}
                      className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default">
                      <option value="">— Select consultant —</option>
                      {employeeOptions.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Job Supervisor</label>
                    <select value={projectManager} onChange={e => setProjectManager(e.target.value)}
                      disabled={!editingDetails}
                      className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default">
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

          {/* ── Client tab — read-only by default, click Edit to change.
               Saving writes both the client row AND the Site Access fields
               on the job (handleSaveClient). ── */}
          {activeTab === 'client' && (
            <div className="px-5 py-4 space-y-5">
              {/* Edit / Save / Cancel toolbar */}
              {clientData && (
                <div className="flex items-center justify-between flex-shrink-0 -mb-2">
                  <p className="text-xs text-gray-400">
                    {editingClient ? 'Editing client + site access' : 'Read-only — click Edit to make changes'}
                  </p>
                  {editingClient ? (
                    <div className="flex gap-2">
                      <button onClick={() => { resetClientForm(); setEditingClient(false) }}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50">
                        Cancel
                      </button>
                      <button onClick={handleSaveClient} disabled={saving}
                        className="px-3 py-1.5 rounded-lg bg-green-700 text-white text-xs font-semibold hover:bg-green-800 disabled:opacity-50">
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setEditingClient(true)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-green-700 text-xs font-semibold text-green-700 hover:bg-green-50">
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                        <path d="M11.5 1.5a1.414 1.414 0 0 1 2 2L5 12l-3 1 1-3 8.5-8.5z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Edit
                    </button>
                  )}
                </div>
              )}

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
                    No matching opportunity record found. This usually means the job was imported from BuilderTrend or the customer name on the job doesn't exactly match a record in the Opportunities module. Open the contact or opportunity manually to fill in details.
                  </p>
                </div>
              ) : (
                <>
                  {/* Identity — same input layout in both read & edit modes;
                       inputs are simply disabled when editingClient is false. */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Identity</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">First Name</label>
                        <input type="text" value={clientForm.first_name || ''}
                          onChange={e => setClientForm(p => ({ ...p, first_name: e.target.value }))}
                          disabled={!editingClient}
                          className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                          placeholder="First name" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Last Name</label>
                        <input type="text" value={clientForm.last_name || ''}
                          onChange={e => setClientForm(p => ({ ...p, last_name: e.target.value }))}
                          disabled={!editingClient}
                          className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                          placeholder="Last name" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Company</label>
                        <input type="text" value={clientForm.company_name || ''}
                          onChange={e => setClientForm(p => ({ ...p, company_name: e.target.value }))}
                          disabled={!editingClient}
                          className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                          placeholder="Company name" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Position</label>
                        <input type="text" value={clientForm.company_position || ''}
                          onChange={e => setClientForm(p => ({ ...p, company_position: e.target.value }))}
                          disabled={!editingClient}
                          className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                          placeholder="Position / title" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Spouse / Partner First</label>
                        <input type="text" value={clientForm.spouse_first_name || ''}
                          onChange={e => setClientForm(p => ({ ...p, spouse_first_name: e.target.value }))}
                          disabled={!editingClient}
                          className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                          placeholder="First" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Spouse / Partner Last</label>
                        <input type="text" value={clientForm.spouse_last_name || ''}
                          onChange={e => setClientForm(p => ({ ...p, spouse_last_name: e.target.value }))}
                          disabled={!editingClient}
                          className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                          placeholder="Last" />
                      </div>
                    </div>
                  </div>

                  {/* Contact info */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Contact info</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Phone</label>
                        <input type="tel" value={clientForm.phone || ''}
                          onChange={e => setClientForm(p => ({ ...p, phone: e.target.value }))}
                          disabled={!editingClient}
                          className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                          placeholder="(555) 555-5555" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Cell</label>
                        <input type="tel" value={clientForm.cell || ''}
                          onChange={e => setClientForm(p => ({ ...p, cell: e.target.value }))}
                          disabled={!editingClient}
                          className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                          placeholder="(555) 555-5555" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Email</label>
                        <input type="email" value={clientForm.email || ''}
                          onChange={e => setClientForm(p => ({ ...p, email: e.target.value }))}
                          disabled={!editingClient}
                          className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                          placeholder="email@example.com" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Additional Emails <span className="font-normal text-gray-400">(one per line)</span></label>
                        <textarea rows={2} value={clientForm._additionalEmailsRaw || ''}
                          onChange={e => setClientForm(p => ({ ...p, _additionalEmailsRaw: e.target.value }))}
                          disabled={!editingClient}
                          className="input text-sm w-full resize-none disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                          placeholder="extra@example.com" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Additional Phones <span className="font-normal text-gray-400">(one per line)</span></label>
                        <textarea rows={2} value={clientForm._additionalPhonesRaw || ''}
                          onChange={e => setClientForm(p => ({ ...p, _additionalPhonesRaw: e.target.value }))}
                          disabled={!editingClient}
                          className="input text-sm w-full resize-none disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                          placeholder="(555) 555-5555" />
                      </div>
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Address</p>
                    <div className="mb-3">
                      <label className="block text-xs text-gray-500 mb-1">Street</label>
                      <input type="text" value={clientForm.street || ''}
                        onChange={e => setClientForm(p => ({ ...p, street: e.target.value }))}
                        disabled={!editingClient}
                        className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                        placeholder="123 Main St" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">City</label>
                        <input type="text" value={clientForm.city || ''}
                          onChange={e => setClientForm(p => ({ ...p, city: e.target.value }))}
                          disabled={!editingClient}
                          className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                          placeholder="City" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">State</label>
                        <select value={clientForm.state || ''}
                          onChange={e => setClientForm(p => ({ ...p, state: e.target.value }))}
                          disabled={!editingClient}
                          className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default">
                          <option value="">—</option>
                          {US_STATES.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Zip</label>
                        <input type="text" value={clientForm.zip || ''}
                          onChange={e => setClientForm(p => ({ ...p, zip: e.target.value }))}
                          disabled={!editingClient}
                          className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                          placeholder="00000" maxLength={10} />
                      </div>
                    </div>
                  </div>

                  {/* Other */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Other</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Other Email</label>
                        <input type="email" value={clientForm.other_email || ''}
                          onChange={e => setClientForm(p => ({ ...p, other_email: e.target.value }))}
                          disabled={!editingClient}
                          className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                          placeholder="other@example.com" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Other Address</label>
                        <input type="text" value={clientForm.other_address || ''}
                          onChange={e => setClientForm(p => ({ ...p, other_address: e.target.value }))}
                          disabled={!editingClient}
                          className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                          placeholder="Mailing / vacation address" />
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="block text-xs text-gray-500 mb-1">Website</label>
                      <input type="text" value={clientForm.website || ''}
                        onChange={e => setClientForm(p => ({ ...p, website: e.target.value }))}
                        disabled={!editingClient}
                        className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                        placeholder="https://example.com" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Notes</label>
                      <textarea rows={3} value={clientForm.notes || ''}
                        onChange={e => setClientForm(p => ({ ...p, notes: e.target.value }))}
                        disabled={!editingClient}
                        className="input text-sm w-full resize-none disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                        placeholder="Notes about this opportunity…" />
                    </div>
                  </div>

                  {/* Read-only contact info — these live on the contacts row,
                       not the client. Editing happens in the Contacts module. */}
                  {(contactData?.secondary_first_name || contactData?.source ||
                    contactData?.how_did_you_hear || contactData?.campaign ||
                    contactData?.project_description) && (
                    <Section title="From the contact record">
                      <Field label="Secondary contact"
                        value={`${contactData?.secondary_first_name || ''} ${contactData?.secondary_last_name || ''}`.trim()} />
                      <Field label="Source"           value={contactData?.source} />
                      <Field label="How did you hear?" value={contactData?.how_did_you_hear} />
                      <Field label="Campaign"         value={contactData?.campaign} />
                      {contactData?.project_description && (
                        <div className="pt-2 border-t border-slate-100">
                          <p className="text-xs text-gray-400 mb-1">Project description</p>
                          <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{contactData.project_description}</p>
                        </div>
                      )}
                    </Section>
                  )}

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
                </>
              )}

              {/* SITE ACCESS — same layout in read & edit; inputs disabled
                   when editingClient is false. Lives on the job row. */}
              {clientData && (
                <Section title="Site access">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Gate code</label>
                      <input
                        type="text" value={gateCode}
                        onChange={e => setGateCode(e.target.value)}
                        disabled={!editingClient}
                        className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                        placeholder="e.g. 1234#"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        id="has-dog" type="checkbox" checked={hasDog}
                        onChange={e => setHasDog(e.target.checked)}
                        disabled={!editingClient}
                        className="w-4 h-4 rounded accent-amber-600 disabled:cursor-default"
                      />
                      <label htmlFor="has-dog" className={`text-sm ${editingClient ? 'text-gray-700 cursor-pointer' : 'text-gray-700 cursor-default'}`}>🐕 Dog on premises</label>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Access notes</label>
                      <textarea
                        rows={3} value={accessNotes}
                        onChange={e => setAccessNotes(e.target.value)}
                        disabled={!editingClient}
                        className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                        placeholder="e.g. Keys with neighbor at #45 · Park on the street · Side gate sticks"
                      />
                    </div>
                    <p className="text-[11px] text-gray-400 italic">These will move into the Job Details questionnaire when that lands; safe to fill in for now.</p>
                  </div>
                </Section>
              )}
              {error && <p className="text-xs text-red-500">{error}</p>}
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

        {/* Footer — Save lives in each tab now (Edit → Save/Cancel pattern).
             Footer only carries the modal-only Close button and the
             persistent Delete affordance. */}
        {(!inline || onDelete) && (
          <div className="px-5 py-4 border-t border-gray-100 flex gap-2 flex-shrink-0 justify-end">
            {!inline && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(job.id, job.name || job.client_name)}
                className="px-4 py-2 text-sm rounded-lg border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors"
              >
                Delete
              </button>
            )}
          </div>
        )}
    </>
  )

  // Inline mode: render directly into the parent panel without overlay chrome.
  if (inline) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col h-full">
        {innerContent}
      </div>
    )
  }

  // Modal mode (default): fixed overlay with click-outside-to-close.
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col" style={{ maxHeight: '90vh' }}>
        {innerContent}
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
  const isEmpty = value === null || value === undefined || value === ''
  // Render the row even when empty — show a "—" placeholder so the user
  // can see the full data model at a glance.
  const valEl = isEmpty
    ? <span className="text-sm text-gray-300">—</span>
    : link
      ? <a href={link} className="text-sm text-gray-800 hover:text-green-700 underline-offset-2 hover:underline">{value}</a>
      : <span className={`text-sm text-gray-800 ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
  return (
    <div className="grid grid-cols-3 gap-2">
      <span className="text-xs text-gray-400 col-span-1">{label}</span>
      <div className="col-span-2 min-w-0 truncate">{valEl}</div>
    </div>
  )
}
