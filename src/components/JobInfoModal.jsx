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

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import ClientPortalTab from './ClientPortalTab'
import ReopenJobModal from './ReopenJobModal'

// Same list ClientDetail uses for its state dropdown — keep them in sync.
const US_STATES = [
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DE',
  'FL',
  'GA',
  'HI',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY',
]

// Per-job role assignments rendered on the Employees tab.
//   key       — column on the jobs table
//   label     — human label
//   pillCls   — Tailwind classes for the (initials) pill next to the name
//   stateKey  — local-state key in JobInfoModal (matches setter name pair)
export const JOB_ROLES = [
  {
    key: 'consultant',
    label: 'Consultant',
    pillCls: 'bg-blue-100 text-blue-700 border border-blue-200',
  },
  {
    key: 'design_review',
    label: 'Design Review',
    pillCls: 'bg-purple-100 text-purple-700 border border-purple-200',
  },
  {
    key: 'permit_engineering_coordinator',
    label: 'Permit & Engineering Coordinator',
    pillCls: 'bg-orange-100 text-orange-700 border border-orange-200',
  },
  {
    key: 'final_review',
    label: 'Final Review',
    pillCls: 'bg-pink-100 text-pink-700 border border-pink-200',
  },
  {
    key: 'job_supervisor',
    label: 'Job Supervisor',
    pillCls: 'bg-green-100 text-green-700 border border-green-200',
  },
  {
    key: 'production_manager',
    label: 'Production Manager',
    pillCls: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  },
  {
    key: 'quality_control_supervisor',
    label: 'Quality Control Supervisor',
    pillCls: 'bg-teal-100 text-teal-700 border border-teal-200',
  },
  {
    key: 'finance_manager',
    label: 'Finance Manager',
    pillCls: 'bg-amber-100 text-amber-700 border border-amber-200',
  },
  {
    key: 'success_supervisor',
    label: 'Success Supervisor',
    pillCls: 'bg-red-100 text-red-700 border border-red-200',
  },
]

// Searchable inline employee combobox used in the JobInfoModal header.
// Renders as an input that filters the dropdown list as the user types.
// Clicking an option calls onPick(employee_id) and closes the panel; the
// parent saves immediately. Click-outside closes without saving.
function ResponsibleEmployeePicker({ employees, currentEmployeeId, currentName, onPick }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  // Resolve the current selection — prefer FK; fall back to matching
  // the legacy job_supervisor text back to an employee.
  const currentEmp = (() => {
    if (currentEmployeeId) {
      return employees.find(e => e.id === currentEmployeeId) || null
    }
    const txt = (currentName || '').trim().toLowerCase()
    if (!txt) return null
    return (
      employees.find(
        e =>
          `${e.first_name || ''} ${e.last_name || ''}`.trim().toLowerCase() === txt,
      ) || null
    )
  })()

  const displayName = currentEmp
    ? `${currentEmp.first_name || ''} ${currentEmp.last_name || ''}`.trim()
    : currentName || ''

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const onDoc = e => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const filtered = employees.filter(e => {
    if (!query.trim()) return true
    const full = `${e.first_name || ''} ${e.last_name || ''}`.toLowerCase()
    return full.includes(query.toLowerCase())
  })

  async function pick(empId) {
    if (saving) return
    setSaving(true)
    try {
      await onPick(empId)
    } finally {
      setSaving(false)
      setOpen(false)
      setQuery('')
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <input
        ref={inputRef}
        type="text"
        value={open ? query : displayName}
        placeholder={displayName || 'Search employees…'}
        onFocus={() => setOpen(true)}
        onChange={e => {
          setQuery(e.target.value)
          if (!open) setOpen(true)
        }}
        onKeyDown={e => {
          if (e.key === 'Escape') {
            setOpen(false)
            setQuery('')
            inputRef.current?.blur()
          }
        }}
        className="text-sm border border-gray-300 rounded-md px-2 py-0.5 focus:outline-none focus:border-green-600 w-56"
      />
      {open && (
        <div className="absolute z-50 mt-1 w-64 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-lg">
          <button
            type="button"
            onClick={() => pick(null)}
            className="w-full text-left px-3 py-1.5 text-xs text-gray-500 italic hover:bg-gray-50 border-b border-gray-100"
          >
            — Unassigned —
          </button>
          {filtered.length === 0 ? (
            <p className="text-xs text-gray-400 italic px-3 py-2">No matches.</p>
          ) : (
            filtered.map(e => {
              const isCurrent = currentEmp?.id === e.id
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => pick(e.id)}
                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-green-50 ${
                    isCurrent ? 'bg-green-50 font-semibold text-green-800' : 'text-gray-700'
                  }`}
                >
                  {e.first_name} {e.last_name}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

// "John Smith" → "JS" · single-word names → first 2 chars uppercased.
export function nameInitials(full) {
  if (!full) return ''
  const parts = String(full).trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// `inline` (default false): when true, render the same content without the
// fixed-overlay modal chrome — used by JobsList's Info tab to host the same
// UI directly inside the right panel. Hides the X / Close buttons since the
// user navigates away by clicking another tab.
export default function JobInfoModal({ job, onClose, onSave, onDelete, inline = false }) {
  const [activeTab, setActiveTab] = useState('info')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [employees, setEmployees] = useState([])
  // Joined client + contact data for the Client tab. Loaded once on mount.
  const [clientData, setClientData] = useState(null)
  const [contactData, setContactData] = useState(null)
  const [loadingClient, setLoadingClient] = useState(false)
  // Client form buffer — auto-seeded from clientData by the effect below.
  // The Client tab renders these inputs always-editable; the global Save
  // button writes them back via handleSave().
  const [clientForm, setClientForm] = useState({})
  // Site Access fields (live on jobs). Editable.
  const [gateCode, setGateCode] = useState(job.gate_code || '')
  const [hasDog, setHasDog] = useState(!!job.has_dog)
  const [accessNotes, setAccessNotes] = useState(job.access_notes || '')

  // Job Info tab fields
  const [status, setStatus] = useState(job.status || 'active')
  const [jobTitle, setJobTitle] = useState(job.name || job.client_name || '')
  const [address, setAddress] = useState(job.job_address || '')
  const [city, setCity] = useState(job.job_city || '')
  const [state, setState] = useState(job.job_state || '')
  const [zip, setZip] = useState(job.job_zip || '')
  // Contract price prefers the modern total_price column, falls back to the
  // legacy contract_price for older job rows. Stored as a string while editing
  // so we don't fight the input over partial values like "12500." or "".
  const [contractPrice, setContractPrice] = useState(() => {
    const v = job.total_price ?? job.contract_price ?? ''
    return v === '' || v === null || v === undefined ? '' : String(v)
  })
  const [permitNumber, setPermitNumber] = useState(job.permit_number || '')
  const [consultant, setConsultant] = useState(job.consultant || '')
  // projectManager state removed — Job Supervisor lives on the Assignments
  // tab as `jobSupervisor` (writes to job_supervisor; the legacy
  // project_manager column was dropped).

  // Assignments tab — role assignments, each storing the employee's full
  // name. `consultant` and `jobSupervisor` were moved here from the
  // (former) Job Details Assignments section.
  const [designReview, setDesignReview] = useState(job.design_review || '')
  const [permitCoordinator, setPermitCoordinator] = useState(
    job.permit_engineering_coordinator || ''
  )
  const [finalReview, setFinalReview] = useState(job.final_review || '')
  const [jobSupervisor, setJobSupervisor] = useState(
    job.job_supervisor || ''
  )
  const [productionManager, setProductionManager] = useState(job.production_manager || '')
  const [qcSupervisor, setQcSupervisor] = useState(job.quality_control_supervisor || '')
  const [financeManager, setFinanceManager] = useState(job.finance_manager || '')
  const [successSupervisor, setSuccessSupervisor] = useState(job.success_supervisor || '')

  // Per-tab edit toggles. Both tabs default to read-only; user clicks Edit
  // to switch into the input form. (Will become permission-driven later.)
  // editingDetails now drives the combined Job-Details + Client + Site
  // Access form since the Client tab was folded into Job Details (2026-05-28).
  const [editingDetails, setEditingDetails] = useState(false)
  const [editingEmployees, setEditingEmployees] = useState(false)

  // Revert all Job Details state back to whatever's on the job prop. Used by
  // Cancel in the Details tab. Also reverts the merged Client + Site Access
  // form since they share the Edit toggle now.
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
    // Consultant + Job Supervisor moved to Assignments tab — handled by resetEmployeesForm.
    resetClientForm()
    setError('')
  }

  // Revert Client tab + Site Access state back to last-loaded values. Used
  // by Cancel in the Client tab.
  function resetClientForm() {
    if (clientData) {
      setClientForm({
        first_name: clientData.first_name || '',
        last_name: clientData.last_name || '',
        spouse_first_name: clientData.spouse_first_name || '',
        spouse_last_name: clientData.spouse_last_name || '',
        company_name: clientData.company_name || '',
        company_position: clientData.company_position || '',
        email: clientData.email || '',
        phone: clientData.phone || '',
        cell: clientData.cell || '',
        _additionalEmailsRaw: Array.isArray(clientData.additional_emails)
          ? clientData.additional_emails.join('\n')
          : '',
        _additionalPhonesRaw: Array.isArray(clientData.additional_phones)
          ? clientData.additional_phones.join('\n')
          : '',
        street: clientData.street || '',
        city: clientData.city || '',
        state: clientData.state || '',
        zip: clientData.zip || '',
        other_email: clientData.other_email || '',
        other_address: clientData.other_address || '',
        website: clientData.website || '',
        notes: clientData.notes || '',
      })
    }
    setGateCode(job.gate_code || '')
    setHasDog(!!job.has_dog)
    setAccessNotes(job.access_notes || '')
  }

  // Revert all 9 Employees-tab role assignments to whatever's on the job.
  function resetEmployeesForm() {
    setConsultant(job.consultant || '')
    setDesignReview(job.design_review || '')
    setPermitCoordinator(job.permit_engineering_coordinator || '')
    setFinalReview(job.final_review || '')
    setJobSupervisor(job.job_supervisor || '')
    setProductionManager(job.production_manager || '')
    setQcSupervisor(job.quality_control_supervisor || '')
    setFinanceManager(job.finance_manager || '')
    setSuccessSupervisor(job.success_supervisor || '')
  }

  // Save the role columns.
  async function handleSaveEmployees() {
    setSaving(true)
    setError('')
    const ok = await onSave(job.id, {
      consultant: consultant || null,
      design_review: designReview || null,
      permit_engineering_coordinator: permitCoordinator || null,
      final_review: finalReview || null,
      job_supervisor: jobSupervisor || null,
      production_manager: productionManager || null,
      quality_control_supervisor: qcSupervisor || null,
      finance_manager: financeManager || null,
      success_supervisor: successSupervisor || null,
    })
    setSaving(false)
    if (!ok) setError('Failed to save employee assignments.')
    else setEditingEmployees(false)
  }

  useEffect(() => {
    supabase
      .from('employees')
      .select('id, first_name, last_name')
      .eq('status', 'active')
      .order('last_name')
      .then(({ data }) => {
        if (data) setEmployees(data)
      })
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
        const { data } = await supabase
          .from('clients')
          .select('*')
          .eq('id', job.client_id)
          .maybeSingle()
        client = data || null
      }
      if (!client && job.client_name) {
        const { data: matches } = await supabase
          .from('clients')
          .select('*')
          .ilike('name', job.client_name.trim())
          .limit(2)
        if (matches?.length === 1) client = matches[0]
      }

      let contact = null
      if (client) {
        const { data } = await supabase
          .from('contacts')
          .select(
            'id, first_name, last_name, phone, cell, email, source, how_did_you_hear, campaign, project_description, tags'
          )
          .eq('client_id', client.id)
          .maybeSingle()
        contact = data || null
      }

      if (!cancelled) {
        setClientData(client)
        setContactData(contact)
        setLoadingClient(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [job.id, job.client_id, job.client_name])

  // Detect unsaved Client-tab edits — used to skip auto-refresh below so
  // we don't clobber what the user is typing.
  function isClientFormDirty() {
    if (!clientData) return false
    const f = clientForm
    const scalarKeys = [
      'first_name',
      'last_name',
      'spouse_first_name',
      'spouse_last_name',
      'company_name',
      'company_position',
      'email',
      'phone',
      'cell',
      'street',
      'city',
      'state',
      'zip',
      'other_email',
      'other_address',
      'website',
      'notes',
    ]
    if (scalarKeys.some(k => (f[k] || '') !== (clientData[k] || ''))) return true
    const eRaw = Array.isArray(clientData.additional_emails)
      ? clientData.additional_emails.join('\n')
      : ''
    const pRaw = Array.isArray(clientData.additional_phones)
      ? clientData.additional_phones.join('\n')
      : ''
    return (f._additionalEmailsRaw || '') !== eRaw || (f._additionalPhonesRaw || '') !== pRaw
  }

  // When the user switches INTO the Job Details tab, re-fetch the client
  // row so any external edits (Clients page, ClientDetail, etc.) show up
  // here. Skip if the form is dirty so we don't lose unsaved edits.
  // (Was 'client' tab pre-2026-05-28 — folded into Job Details since.)
  useEffect(() => {
    if (activeTab !== 'info' || !clientData?.id) return
    if (isClientFormDirty()) return
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientData.id)
        .maybeSingle()
      if (!cancelled && data) setClientData(data)
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, clientData?.id])

  // Whenever clientData changes (initial load or after a save), reseed the
  // form buffer so the always-editable inputs in the Client tab stay in sync
  // with the latest server state. This also handles the reverse-sync case:
  // if the client was changed elsewhere and we re-fetch, the inputs update.
  useEffect(() => {
    if (!clientData) return
    setClientForm({
      first_name: clientData.first_name || '',
      last_name: clientData.last_name || '',
      spouse_first_name: clientData.spouse_first_name || '',
      spouse_last_name: clientData.spouse_last_name || '',
      company_name: clientData.company_name || '',
      company_position: clientData.company_position || '',
      email: clientData.email || '',
      phone: clientData.phone || '',
      cell: clientData.cell || '',
      _additionalEmailsRaw: Array.isArray(clientData.additional_emails)
        ? clientData.additional_emails.join('\n')
        : '',
      _additionalPhonesRaw: Array.isArray(clientData.additional_phones)
        ? clientData.additional_phones.join('\n')
        : '',
      street: clientData.street || '',
      city: clientData.city || '',
      state: clientData.state || '',
      zip: clientData.zip || '',
      other_email: clientData.other_email || '',
      other_address: clientData.other_address || '',
      website: clientData.website || '',
      notes: clientData.notes || '',
    })
  }, [clientData])

  const employeeOptions = employees.map(e => ({
    value: `${e.first_name} ${e.last_name}`.trim(),
    label: `${e.last_name}, ${e.first_name}`.trim(),
  }))

  // ReopenJobModal state — set when the user changes status from
  // completed → active on save, blocking the save until they pick a
  // stage + responsible employee.
  const [showReopenModal, setShowReopenModal] = useState(false)

  // Combined save for the Job Details tab. Writes:
  //   1. The jobs row (name/status/address/contract/permit + site-access)
  //   2. The linked clients row (identity, contact, address, website, notes)
  // The Client tab was folded into Job Details on 2026-05-28, so a single
  // Save commits everything visible on the tab.
  //
  // Special transition: reopening (completed → active) routes through
  // the ReopenJobModal so the user picks a new stage + responsible
  // employee before the status flips. Closing keeps every assignment
  // field intact — the JobsList display layer hides the (initials)
  // suffix for closed jobs without touching the data.
  async function handleSaveDetails() {
    if (!jobTitle.trim()) {
      setError('Job title cannot be empty.')
      return
    }
    // Reopen path — defer the save until the modal returns picks.
    const wasClosed = job.status && job.status !== 'active' && job.status !== 'on_hold'
    const nowOpen = status === 'active' || status === 'on_hold'
    if (wasClosed && nowOpen) {
      setShowReopenModal(true)
      return
    }

    setSaving(true)
    setError('')
    const cpNum = contractPrice === '' ? null : parseFloat(contractPrice)
    // 1. Jobs row — main fields + site access bundled together.
    const ok = await onSave(job.id, {
      name: jobTitle.trim(),
      status,
      job_address: address.trim(),
      job_city: city.trim(),
      job_state: state.trim(),
      job_zip: zip.trim(),
      total_price: Number.isFinite(cpNum) ? cpNum : null,
      permit_number: permitNumber.trim() || null,
      gate_code: gateCode.trim() || null,
      has_dog: !!hasDog,
      access_notes: accessNotes.trim() || null,
    })

    // 2. Linked clients row — only if we resolved one in the load effect.
    let clientOk = true
    if (clientData?.id) {
      const f = clientForm
      const fullName = [f.first_name, f.last_name].filter(Boolean).join(' ').trim()
      const splitMulti = raw =>
        raw
          ? raw
              .split(/[\n,]+/)
              .map(s => s.trim())
              .filter(Boolean)
          : null
      const addlEmails = splitMulti(f._additionalEmailsRaw)
      const addlPhones = splitMulti(f._additionalPhonesRaw)
      const updates = {
        first_name: f.first_name?.trim() || null,
        last_name: f.last_name?.trim() || null,
        spouse_first_name: f.spouse_first_name?.trim() || null,
        spouse_last_name: f.spouse_last_name?.trim() || null,
        name: fullName || clientData.name,
        company_name: f.company_name?.trim() || null,
        company_position: f.company_position?.trim() || null,
        email: f.email?.trim() || null,
        phone: f.phone?.trim() || null,
        cell: f.cell?.trim() || null,
        additional_emails: addlEmails && addlEmails.length ? addlEmails : null,
        additional_phones: addlPhones && addlPhones.length ? addlPhones : null,
        street: f.street?.trim() || null,
        city: f.city?.trim() || null,
        state: f.state || null,
        zip: f.zip?.trim() || null,
        other_email: f.other_email?.trim() || null,
        other_address: f.other_address?.trim() || null,
        website: f.website?.trim() || null,
        notes: f.notes?.trim() || null,
      }
      const { data, error: clientErr } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', clientData.id)
        .select()
        .single()
      if (clientErr) {
        clientOk = false
      } else if (data) {
        setClientData(data)
      }
    }

    setSaving(false)
    if (!ok) setError('Failed to save the job. Please try again.')
    else if (!clientOk) setError('Job saved, but the client update failed.')
    else setEditingDetails(false)
  }

  // Client tab was folded into Job Details on 2026-05-28 — Site Access,
  // Client / Company details, and the client-address subsection all render
  // inline below Main Details. The Edit / Save / Cancel toolbar on Job
  // Details now saves the jobs row AND the linked clients row in one go.
  const TABS = [
    { key: 'info', label: 'Job Details' },
    { key: 'client_portal', label: 'Client Portal' },
    { key: 'employees', label: 'Assignments' },
  ]

  // Shared inner content block. Wrapped differently below depending on
  // whether we're rendering as a modal or as an inline panel.
  const innerContent = (
    <>
      {/* Header — job name + inline searchable responsible-employee picker.
          Type to filter; pick from the dropdown to save immediately. Writes
          both job_supervisor (text — drives the (XX) initials) and
          responsible_employee_id (FK) to keep the two in lockstep. */}
      <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-start justify-between flex-shrink-0">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-gray-900 truncate">
            {job.name || job.client_name}
          </h2>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
              Assigned to
            </span>
            <ResponsibleEmployeePicker
              employees={employees}
              currentEmployeeId={job.responsible_employee_id}
              currentName={job.job_supervisor}
              onPick={async empId => {
                const picked = empId ? employees.find(x => x.id === empId) : null
                const name = picked
                  ? `${picked.first_name || ''} ${picked.last_name || ''}`.trim()
                  : null
                await onSave(job.id, {
                  responsible_employee_id: empId,
                  job_supervisor: name,
                })
              }}
            />
            {job.job_supervisor && (
              <span className="text-[11px] text-gray-400">
                Currently: {job.job_supervisor}
              </span>
            )}
          </div>
        </div>
        {!inline && (
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-gray-500 ml-3 mt-0.5 flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
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
                  <button
                    onClick={() => {
                      resetDetailsForm()
                      setEditingDetails(false)
                    }}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveDetails}
                    disabled={saving}
                    className="px-3 py-1.5 rounded-lg bg-green-700 text-white text-xs font-semibold hover:bg-green-800 disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingDetails(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-green-700 text-xs font-semibold text-green-700 hover:bg-green-50"
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M11.5 1.5a1.414 1.414 0 0 1 2 2L5 12l-3 1 1-3 8.5-8.5z"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Edit
                </button>
              )}
            </div>

            {/* Main Details — same layout in read and edit; inputs are
                   simply disabled when editingDetails is false. */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Main Details
              </p>

              {/* Row 1: Status + Job Title */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    disabled={!editingDetails}
                    className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
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
                    onChange={e => {
                      setJobTitle(e.target.value)
                      setError('')
                    }}
                    disabled={!editingDetails}
                    className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                    placeholder="Job name"
                  />
                </div>
              </div>

              {/* Row 2: Street Address */}
              <div className="mb-3">
                <label className="block text-xs text-gray-500 mb-1">Job Street Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  disabled={!editingDetails}
                  className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                  placeholder="123 Main St"
                />
              </div>

              {/* Row 3: City, State, Zip */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Job City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    disabled={!editingDetails}
                    className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Job State</label>
                  <input
                    type="text"
                    value={state}
                    onChange={e => setState(e.target.value)}
                    disabled={!editingDetails}
                    className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                    placeholder="CA"
                    maxLength={2}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Job Zip Code</label>
                  <input
                    type="text"
                    value={zip}
                    onChange={e => setZip(e.target.value)}
                    disabled={!editingDetails}
                    className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                    placeholder="90210"
                    maxLength={10}
                  />
                </div>
              </div>

              {/* Row 4: Contract Price + Permit # */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Job Total Contract Price
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={contractPrice}
                      onChange={e => setContractPrice(e.target.value)}
                      disabled={!editingDetails}
                      className="input text-sm w-full pl-7 disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                      placeholder="0.00"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Pulled from the sold bid; edit if the contract has changed.
                  </p>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Permit #</label>
                  <input
                    type="text"
                    value={permitNumber}
                    onChange={e => setPermitNumber(e.target.value)}
                    disabled={!editingDetails}
                    className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                    placeholder="e.g. BLD-2026-00123"
                  />
                </div>
              </div>
            </div>

            {/* Consultant + Job Supervisor moved to the Assignments tab. */}

            {/* ── Site Access ─────────────────────────────────────────
                 Lives on the jobs row. Saved together with Main Details
                 by handleSaveDetails. */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Site Access
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Gate code</label>
                  <input
                    type="text"
                    value={gateCode}
                    onChange={e => setGateCode(e.target.value)}
                    disabled={!editingDetails}
                    className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                    placeholder="e.g. 1234#"
                  />
                </div>
                <div className="flex items-end pb-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      id="has-dog"
                      type="checkbox"
                      checked={hasDog}
                      onChange={e => setHasDog(e.target.checked)}
                      disabled={!editingDetails}
                      className="w-4 h-4 rounded accent-amber-600 disabled:cursor-default"
                    />
                    <label
                      htmlFor="has-dog"
                      className={`text-sm ${editingDetails ? 'text-gray-700 cursor-pointer' : 'text-gray-700 cursor-default'}`}
                    >
                      🐕 Dog on premises
                    </label>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Access notes</label>
                <textarea
                  rows={3}
                  value={accessNotes}
                  onChange={e => setAccessNotes(e.target.value)}
                  disabled={!editingDetails}
                  className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                  placeholder="e.g. Keys with neighbor at #45 · Park on the street · Side gate sticks"
                />
              </div>
            </div>

            {/* ── Client / Company Details ────────────────────────────
                 Folded in from the former Client tab on 2026-05-28.
                 Header flips to "Company Details" when the linked
                 clients row has client_type='company' (the result of an
                 Opportunity → Estimate → Bid → Job pipeline where the
                 lead was a company, not an individual). Person fields
                 (first/last/spouse) are hidden in that case; company
                 fields + website + notes take their place. */}
            {loadingClient ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-700" />
              </div>
            ) : !clientData ? (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Client Details
                </p>
                <div className="text-sm text-gray-500 space-y-2">
                  <p>
                    <span className="font-semibold text-gray-800">
                      {job.client_name || 'Unknown client'}
                    </span>
                  </p>
                  <p className="text-xs text-gray-400 italic">
                    No matching opportunity record found. This usually means the job was
                    imported from BuilderTrend or the customer name on the job doesn't exactly
                    match a record in the Opportunities module. Open the contact or
                    opportunity manually to fill in details.
                  </p>
                </div>
              </div>
            ) : (
              (() => {
                const isCompany = clientData.client_type === 'company'
                // "Same as Job Address" check — collapse the Client Address
                // subsection to a one-liner when the client row has no address
                // or it matches the job address exactly (trim-insensitive).
                const cf = clientForm
                const clientAddressEmpty = !(
                  (cf.street || '').trim() ||
                  (cf.city || '').trim() ||
                  (cf.state || '').trim() ||
                  (cf.zip || '').trim()
                )
                const clientAddressMatches =
                  (cf.street || '').trim() === (address || '').trim() &&
                  (cf.city || '').trim() === (city || '').trim() &&
                  (cf.state || '').trim() === (state || '').trim() &&
                  (cf.zip || '').trim() === (zip || '').trim()
                const showSameAsJob =
                  !editingDetails && (clientAddressEmpty || clientAddressMatches)

                return (
                  <>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                        {isCompany ? 'Company Details' : 'Client Details'}
                      </p>

                      {/* Identity row — companies show Company + Position only;
                          individuals get first/last/company + spouse fields. */}
                      {isCompany ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">
                              Company Name
                            </label>
                            <input
                              type="text"
                              value={clientForm.company_name || ''}
                              onChange={e =>
                                setClientForm(p => ({ ...p, company_name: e.target.value }))
                              }
                              disabled={!editingDetails}
                              className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                              placeholder="Company name"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Position</label>
                            <input
                              type="text"
                              value={clientForm.company_position || ''}
                              onChange={e =>
                                setClientForm(p => ({
                                  ...p,
                                  company_position: e.target.value,
                                }))
                              }
                              disabled={!editingDetails}
                              className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                              placeholder="Position / title"
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">
                                First Name
                              </label>
                              <input
                                type="text"
                                value={clientForm.first_name || ''}
                                onChange={e =>
                                  setClientForm(p => ({ ...p, first_name: e.target.value }))
                                }
                                disabled={!editingDetails}
                                className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                                placeholder="First name"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">
                                Last Name
                              </label>
                              <input
                                type="text"
                                value={clientForm.last_name || ''}
                                onChange={e =>
                                  setClientForm(p => ({ ...p, last_name: e.target.value }))
                                }
                                disabled={!editingDetails}
                                className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                                placeholder="Last name"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">
                                Company
                              </label>
                              <input
                                type="text"
                                value={clientForm.company_name || ''}
                                onChange={e =>
                                  setClientForm(p => ({ ...p, company_name: e.target.value }))
                                }
                                disabled={!editingDetails}
                                className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                                placeholder="Company name"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">
                                Position
                              </label>
                              <input
                                type="text"
                                value={clientForm.company_position || ''}
                                onChange={e =>
                                  setClientForm(p => ({
                                    ...p,
                                    company_position: e.target.value,
                                  }))
                                }
                                disabled={!editingDetails}
                                className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                                placeholder="Position / title"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">
                                Spouse / Partner First
                              </label>
                              <input
                                type="text"
                                value={clientForm.spouse_first_name || ''}
                                onChange={e =>
                                  setClientForm(p => ({
                                    ...p,
                                    spouse_first_name: e.target.value,
                                  }))
                                }
                                disabled={!editingDetails}
                                className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                                placeholder="First"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">
                                Spouse / Partner Last
                              </label>
                              <input
                                type="text"
                                value={clientForm.spouse_last_name || ''}
                                onChange={e =>
                                  setClientForm(p => ({
                                    ...p,
                                    spouse_last_name: e.target.value,
                                  }))
                                }
                                disabled={!editingDetails}
                                className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                                placeholder="Last"
                              />
                            </div>
                          </div>
                        </>
                      )}

                      {/* Phone / Cell / Email — no separate "Contact Info" header;
                          these read as part of Client/Company Details now. */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Phone</label>
                          <input
                            type="tel"
                            value={clientForm.phone || ''}
                            onChange={e =>
                              setClientForm(p => ({ ...p, phone: e.target.value }))
                            }
                            disabled={!editingDetails}
                            className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                            placeholder="(555) 555-5555"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Cell</label>
                          <input
                            type="tel"
                            value={clientForm.cell || ''}
                            onChange={e =>
                              setClientForm(p => ({ ...p, cell: e.target.value }))
                            }
                            disabled={!editingDetails}
                            className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                            placeholder="(555) 555-5555"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Email</label>
                          <input
                            type="email"
                            value={clientForm.email || ''}
                            onChange={e =>
                              setClientForm(p => ({ ...p, email: e.target.value }))
                            }
                            disabled={!editingDetails}
                            className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                            placeholder="email@example.com"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">
                            Additional Emails{' '}
                            <span className="font-normal text-gray-400">(one per line)</span>
                          </label>
                          <textarea
                            rows={2}
                            value={clientForm._additionalEmailsRaw || ''}
                            onChange={e =>
                              setClientForm(p => ({
                                ...p,
                                _additionalEmailsRaw: e.target.value,
                              }))
                            }
                            disabled={!editingDetails}
                            className="input text-sm w-full resize-none disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                            placeholder="extra@example.com"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">
                            Additional Phones{' '}
                            <span className="font-normal text-gray-400">(one per line)</span>
                          </label>
                          <textarea
                            rows={2}
                            value={clientForm._additionalPhonesRaw || ''}
                            onChange={e =>
                              setClientForm(p => ({
                                ...p,
                                _additionalPhonesRaw: e.target.value,
                              }))
                            }
                            disabled={!editingDetails}
                            className="input text-sm w-full resize-none disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                            placeholder="(555) 555-5555"
                          />
                        </div>
                      </div>

                      {/* Website + Notes live in the same section for both
                          individuals and companies — for companies the user
                          asked these to come along with the merged data. */}
                      <div className="mb-3">
                        <label className="block text-xs text-gray-500 mb-1">Website</label>
                        <input
                          type="text"
                          value={clientForm.website || ''}
                          onChange={e =>
                            setClientForm(p => ({ ...p, website: e.target.value }))
                          }
                          disabled={!editingDetails}
                          className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                          placeholder="https://example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Notes</label>
                        <textarea
                          rows={3}
                          value={clientForm.notes || ''}
                          onChange={e =>
                            setClientForm(p => ({ ...p, notes: e.target.value }))
                          }
                          disabled={!editingDetails}
                          className="input text-sm w-full resize-none disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                          placeholder="Notes about this opportunity…"
                        />
                      </div>
                    </div>

                    {/* ── Client Address (If different than Job Address) ──
                         Collapsed to a one-line "Same as Job Address" when
                         the client address is empty or matches the job
                         address exactly. In Edit mode the fields are always
                         visible so the user can fill in a different address. */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                        Client Address{' '}
                        <span className="font-normal normal-case text-gray-400">
                          (If different than Job Address)
                        </span>
                      </p>
                      {showSameAsJob ? (
                        <p className="text-sm text-gray-500 italic">Same as Job Address</p>
                      ) : (
                        <>
                          <div className="mb-3">
                            <label className="block text-xs text-gray-500 mb-1">Street</label>
                            <input
                              type="text"
                              value={clientForm.street || ''}
                              onChange={e =>
                                setClientForm(p => ({ ...p, street: e.target.value }))
                              }
                              disabled={!editingDetails}
                              className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                              placeholder="123 Main St"
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">City</label>
                              <input
                                type="text"
                                value={clientForm.city || ''}
                                onChange={e =>
                                  setClientForm(p => ({ ...p, city: e.target.value }))
                                }
                                disabled={!editingDetails}
                                className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                                placeholder="City"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">State</label>
                              <select
                                value={clientForm.state || ''}
                                onChange={e =>
                                  setClientForm(p => ({ ...p, state: e.target.value }))
                                }
                                disabled={!editingDetails}
                                className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                              >
                                <option value="">—</option>
                                {US_STATES.map(s => (
                                  <option key={s}>{s}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Zip</label>
                              <input
                                type="text"
                                value={clientForm.zip || ''}
                                onChange={e =>
                                  setClientForm(p => ({ ...p, zip: e.target.value }))
                                }
                                disabled={!editingDetails}
                                className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                                placeholder="00000"
                                maxLength={10}
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Company contacts — only render for company clients
                        (or any client row that happens to have entries). */}
                    {(isCompany || (clientData.company_contacts || []).length > 0) && (
                      <Section title="Company contacts">
                        {(clientData.company_contacts || []).length === 0 ? (
                          <p className="text-xs text-gray-400 italic">
                            No company contacts listed.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {clientData.company_contacts.map((cc, i) => (
                              <div
                                key={i}
                                className="border border-gray-200 rounded-lg p-2.5"
                              >
                                <p className="text-sm font-semibold text-gray-800">
                                  {`${cc.first_name || ''} ${cc.last_name || ''}`.trim() ||
                                    '—'}
                                  {cc.position && (
                                    <span className="text-xs text-gray-500 font-normal ml-2">
                                      · {cc.position}
                                    </span>
                                  )}
                                </p>
                                {(cc.phone || cc.email) && (
                                  <p className="text-xs text-gray-600 mt-0.5 flex gap-3">
                                    {cc.phone && (
                                      <a
                                        href={`tel:${cc.phone}`}
                                        className="hover:text-green-700"
                                      >
                                        {cc.phone}
                                      </a>
                                    )}
                                    {cc.email && (
                                      <a
                                        href={`mailto:${cc.email}`}
                                        className="hover:text-green-700"
                                      >
                                        {cc.email}
                                      </a>
                                    )}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </Section>
                    )}

                    {/* Read-only fields pulled from the linked contacts row.
                        Editing happens in the Contacts module. */}
                    {(contactData?.secondary_first_name ||
                      contactData?.source ||
                      contactData?.how_did_you_hear ||
                      contactData?.campaign ||
                      contactData?.project_description) && (
                      <Section title="From the contact record">
                        <Field
                          label="Secondary contact"
                          value={`${contactData?.secondary_first_name || ''} ${contactData?.secondary_last_name || ''}`.trim()}
                        />
                        <Field label="Source" value={contactData?.source} />
                        <Field
                          label="How did you hear?"
                          value={contactData?.how_did_you_hear}
                        />
                        <Field label="Campaign" value={contactData?.campaign} />
                        {contactData?.project_description && (
                          <div className="pt-2 border-t border-slate-100">
                            <p className="text-xs text-gray-400 mb-1">Project description</p>
                            <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                              {contactData.project_description}
                            </p>
                          </div>
                        )}
                      </Section>
                    )}
                  </>
                )
              })()
            )}

            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        )}

        {/* Former Client tab content was folded into Job Details above on
            2026-05-28. */}

        {/* ── Employees tab — 9 role assignments, edit-on-toggle. ── */}
        {activeTab === 'employees' &&
          (() => {
            // Map state values to each role so we can drive everything
            // from JOB_ROLES without repeating boilerplate.
            const roleValueMap = {
              consultant: consultant,
              design_review: designReview,
              permit_engineering_coordinator: permitCoordinator,
              final_review: finalReview,
              job_supervisor: jobSupervisor,
              production_manager: productionManager,
              quality_control_supervisor: qcSupervisor,
              finance_manager: financeManager,
              success_supervisor: successSupervisor,
            }
            const roleSetterMap = {
              consultant: setConsultant,
              design_review: setDesignReview,
              permit_engineering_coordinator: setPermitCoordinator,
              final_review: setFinalReview,
              job_supervisor: setJobSupervisor,
              production_manager: setProductionManager,
              quality_control_supervisor: setQcSupervisor,
              finance_manager: setFinanceManager,
              success_supervisor: setSuccessSupervisor,
            }
            return (
              <div className="px-5 py-4 space-y-5">
                {/* Edit / Save / Cancel toolbar */}
                <div className="flex items-center justify-between flex-shrink-0 -mb-2">
                  <p className="text-xs text-gray-400">
                    {editingEmployees
                      ? 'Editing employee assignments'
                      : 'Read-only — click Edit to make changes'}
                  </p>
                  {editingEmployees ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          resetEmployeesForm()
                          setEditingEmployees(false)
                        }}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEmployees}
                        disabled={saving}
                        className="px-3 py-1.5 rounded-lg bg-green-700 text-white text-xs font-semibold hover:bg-green-800 disabled:opacity-50"
                      >
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingEmployees(true)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-green-700 text-xs font-semibold text-green-700 hover:bg-green-50"
                    >
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M11.5 1.5a1.414 1.414 0 0 1 2 2L5 12l-3 1 1-3 8.5-8.5z"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Edit
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {JOB_ROLES.map(role => {
                    const value = roleValueMap[role.key]
                    const setter = roleSetterMap[role.key]
                    const initials = nameInitials(value)
                    return (
                      <div key={role.key}>
                        <label className="block text-xs text-gray-500 mb-1">{role.label}</label>
                        <div className="flex items-center gap-2">
                          <select
                            value={value || ''}
                            onChange={e => setter(e.target.value)}
                            disabled={!editingEmployees}
                            className="input text-sm flex-1 disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default"
                          >
                            <option value="">— Unassigned —</option>
                            {employeeOptions.map(o => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                          {value && (
                            <span
                              className={`text-[11px] font-bold rounded-full px-2 py-0.5 flex-shrink-0 ${role.pillCls}`}
                              title={value}
                            >
                              ({initials})
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {error && <p className="text-xs text-red-500">{error}</p>}
              </div>
            )
          })()}

        {activeTab === 'client_portal' && (
          <ClientPortalTab clientId={clientData?.id} clientData={clientData} />
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

  // ReopenJobModal — fires when the user changes Status from Closed →
  // Open on the Job Details tab. Waits for the user to pick a stage +
  // responsible employee, then commits the save with everything.
  const reopenModal = showReopenModal ? (
    <ReopenJobModal
      jobName={jobTitle || job.name || job.client_name || ''}
      onCancel={() => setShowReopenModal(false)}
      onConfirm={async ({ stageId, employeeId, employeeName }) => {
        setSaving(true)
        setError('')
        const cpNum = contractPrice === '' ? null : parseFloat(contractPrice)
        const ok = await onSave(job.id, {
          name: jobTitle.trim(),
          status: 'active',
          job_address: address.trim(),
          job_city: city.trim(),
          job_state: state.trim(),
          job_zip: zip.trim(),
          total_price: Number.isFinite(cpNum) ? cpNum : null,
          permit_number: permitNumber.trim() || null,
          stage_id: stageId,
          responsible_employee_id: employeeId,
          job_supervisor: employeeName,
        })
        setSaving(false)
        setShowReopenModal(false)
        if (!ok) setError('Failed to reopen the job. Please try again.')
        else setEditingDetails(false)
      }}
    />
  ) : null

  // Inline mode: render directly into the parent panel without overlay chrome.
  if (inline) {
    return (
      <>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col h-full">
          {innerContent}
        </div>
        {reopenModal}
      </>
    )
  }

  // Modal mode (default): fixed overlay with click-outside-to-close.
  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
        onMouseDown={e => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <div
          className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col"
          style={{ maxHeight: '90vh' }}
        >
          {innerContent}
        </div>
      </div>
      {reopenModal}
    </>
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
  const valEl = isEmpty ? (
    <span className="text-sm text-gray-300">—</span>
  ) : link ? (
    <a
      href={link}
      className="text-sm text-gray-800 hover:text-green-700 underline-offset-2 hover:underline"
    >
      {value}
    </a>
  ) : (
    <span className={`text-sm text-gray-800 ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
  )
  return (
    <div className="grid grid-cols-3 gap-2">
      <span className="text-xs text-gray-400 col-span-1">{label}</span>
      <div className="col-span-2 min-w-0 truncate">{valEl}</div>
    </div>
  )
}
