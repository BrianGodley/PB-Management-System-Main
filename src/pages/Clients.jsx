import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import MasterRates from './MasterRates'
import { DEFAULT_ESTIMATE_GPMD, DEFAULT_SALES_TAX_RATE } from '../lib/companyDefaults'
import ConsultantPicker from '../components/ConsultantPicker'

// Opportunities list is fetched one page at a time (server-side paging).
const CLIENTS_PER_PAGE = 200

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

// Column definitions — key matches the render switch below
const COLUMNS = [
  { key: 'name', label: 'Name', always: true, defaultOn: true },
  { key: 'type', label: 'Type', always: false, defaultOn: true },
  { key: 'company_name', label: 'Company', always: false, defaultOn: true },
  { key: 'phone', label: 'Phone', always: false, defaultOn: true },
  { key: 'email', label: 'Email', always: false, defaultOn: true },
  { key: 'street', label: 'Street', always: false, defaultOn: true },
  { key: 'city_state', label: 'City / State', always: false, defaultOn: true },
  { key: 'notes', label: 'Notes', always: false, defaultOn: false },
]

const DEFAULT_VISIBLE = new Set(COLUMNS.filter(c => c.defaultOn).map(c => c.key))

// Display name: "Last, First" or company name
function displayName(c) {
  if (c.client_type === 'company') return c.company_name || c.name || '—'
  if (c.last_name || c.first_name) {
    return [c.last_name, c.first_name].filter(Boolean).join(', ')
  }
  return c.name || c.company_name || '—'
}

// ── Contact picker used in both modals ───────────────────────────────────────
function ContactPicker({
  contacts,
  search,
  setSearch,
  dropdownOpen,
  setDropdownOpen,
  selectedId,
  onSelect,
  onClear,
  pickerRef,
  placeholder,
}) {
  const display = selectedId ? contacts.find(c => c.id === selectedId) : null
  const displayLabel = display
    ? [display.last_name, display.first_name].filter(Boolean).join(', ') ||
      display.company_name ||
      '—'
    : search

  return (
    <div ref={pickerRef} className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
      <label className="block text-xs font-semibold text-gray-500 mb-1.5">
        {placeholder || 'Pick a contact to import'}
      </label>
      <div className="relative">
        <input
          type="text"
          placeholder="Click to browse, or type a name…"
          value={selectedId ? displayLabel : search}
          onChange={e => {
            setSearch(e.target.value)
            setDropdownOpen(true)
          }}
          onFocus={() => setDropdownOpen(true)}
          className="w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:border-green-500 pr-7"
        />
        {(selectedId || search) && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-lg leading-none"
          >
            ×
          </button>
        )}
        {dropdownOpen && (
          <div className="absolute left-0 right-0 top-full mt-1 z-20 max-h-56 overflow-y-auto border border-gray-200 rounded-md bg-white shadow-lg divide-y divide-gray-100">
            {(() => {
              const q = search.trim().toLowerCase()
              // Same token-based matcher as the main client list so the
              // dropdown handles "john durso", "durso, john", and partials.
              const list = q
                ? contacts.filter(c => {
                    const hay = [c.first_name, c.last_name, c.company_name, c.email, c.phone]
                      .filter(Boolean)
                      .join(' ')
                      .toLowerCase()
                    const phoneDigits = (c.phone || '').replace(/\D/g, '')
                    return q
                      .split(/[\s,]+/)
                      .filter(Boolean)
                      .every(t => {
                        if (hay.includes(t)) return true
                        const td = t.replace(/\D/g, '')
                        return td.length > 0 && phoneDigits.includes(td)
                      })
                  })
                : contacts
              if (list.length === 0)
                return (
                  <p className="px-3 py-3 text-xs text-gray-400">
                    {search ? 'No matches.' : 'No records yet.'}
                  </p>
                )
              return list.slice(0, 50).map(c => {
                const label =
                  [c.last_name, c.first_name].filter(Boolean).join(', ') || c.company_name || '—'
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onSelect(c)
                      setDropdownOpen(false)
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-green-50 ${c.id === selectedId ? 'bg-green-50' : ''}`}
                  >
                    <p className="font-semibold text-gray-800">{label}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {[c.company_name, c.email, c.phone].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </button>
                )
              })
            })()}
          </div>
        )}
      </div>
      {selectedId && (
        <p className="text-[11px] text-green-700 mt-2">
          ✓ Imported into the form below — you can still edit any field before saving.
        </p>
      )}
    </div>
  )
}

// ── Add Individual Client Modal ───────────────────────────────────────────────
function AddIndividualModal({ onSave, onClose, user }) {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    spouse_first_name: '',
    spouse_last_name: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    email: '',
    phone: '',
    cell: '',
    other_email: '',
    other_address: '',
    // Raw textareas; split into arrays on save (one per line or comma-separated).
    _additionalEmailsRaw: '',
    _additionalPhonesRaw: '',
    notes: '',
  })
  const [mode, setMode] = useState('scratch')
  const [contacts, setContacts] = useState([])
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  // Optional consultant assignment (Design or Installation Consultant).
  const [consultantEmployeeId, setConsultantEmployeeId] = useState(null)
  const pickerRef = useRef(null)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // Load contacts once when "From a contact" is chosen
  useEffect(() => {
    if (mode !== 'contact' || contacts.length > 0) return
    fetchAllPaginated(() =>
      supabase
        .from('contacts')
        .select(
          'id, first_name, last_name, email, phone, cell, additional_emails, additional_phones, street_address, city, state, zip, secondary_first_name, secondary_last_name'
        )
        .order('last_name')
    ).then(({ data }) => setContacts(data || []))
  }, [mode])

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return
    const handler = e => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

  function applyContact(c) {
    setSelectedId(c.id)
    setForm({
      first_name: c.first_name || '',
      last_name: c.last_name || '',
      spouse_first_name: c.secondary_first_name || '',
      spouse_last_name: c.secondary_last_name || '',
      street: c.street_address || '',
      city: c.city || '',
      state: c.state || '',
      zip: c.zip || '',
      email: c.email || '',
      phone: c.phone || '',
      cell: c.cell || '',
      other_email: '',
      other_address: '',
      _additionalEmailsRaw: Array.isArray(c.additional_emails)
        ? c.additional_emails.join('\n')
        : '',
      _additionalPhonesRaw: Array.isArray(c.additional_phones)
        ? c.additional_phones.join('\n')
        : '',
      notes: '',
    })
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.last_name.trim() && !form.first_name.trim()) {
      setSaveError('First or last name is required.')
      return
    }
    setSaving(true)
    setSaveError('')
    const name = [form.first_name.trim(), form.last_name.trim()].filter(Boolean).join(' ')
    const splitMulti = raw =>
      raw
        ? raw
            .split(/[\n,]+/)
            .map(s => s.trim())
            .filter(Boolean)
        : null
    const addlEmails = splitMulti(form._additionalEmailsRaw)
    const addlPhones = splitMulti(form._additionalPhonesRaw)
    const { error } = await supabase.from('clients').insert({
      client_type: 'individual',
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      name,
      consultant_employee_id: consultantEmployeeId,
      spouse_first_name: form.spouse_first_name.trim() || null,
      spouse_last_name: form.spouse_last_name.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      cell: form.cell.trim() || null,
      additional_emails: addlEmails && addlEmails.length ? addlEmails : null,
      additional_phones: addlPhones && addlPhones.length ? addlPhones : null,
      other_email: form.other_email.trim() || null,
      other_address: form.other_address.trim() || null,
      street: form.street.trim() || null,
      city: form.city.trim() || null,
      state: form.state || null,
      zip: form.zip.trim() || null,
      notes: form.notes.trim() || null,
      created_by: user?.id,
    })
    setSaving(false)
    if (error) {
      setSaveError(error.message)
    } else {
      onSave()
    }
  }

  const inp =
    'w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:border-green-500'
  const lbl = 'block text-xs font-medium text-gray-600 mb-0.5'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Add Individual Opportunity</h2>
            <p className="text-xs text-gray-400 mt-0.5">Person or household</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSave} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {/* Source toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase">Source:</span>
            {[
              { key: 'scratch', label: 'From Scratch' },
              { key: 'contact', label: 'From Contact' },
            ].map(o => (
              <button
                key={o.key}
                type="button"
                onClick={() => {
                  setMode(o.key)
                  setSelectedId(null)
                  setSearch('')
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-colors ${
                  mode === o.key
                    ? 'border-green-700 bg-green-50 text-green-800'
                    : 'border-gray-200 text-gray-500 hover:border-green-500'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>

          {mode === 'contact' && (
            <ContactPicker
              contacts={contacts}
              search={search}
              setSearch={setSearch}
              dropdownOpen={dropdownOpen}
              setDropdownOpen={setDropdownOpen}
              selectedId={selectedId}
              onSelect={applyContact}
              onClear={() => {
                setSelectedId(null)
                setSearch('')
              }}
              pickerRef={pickerRef}
              placeholder="Search individual contacts"
            />
          )}

          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>First Name</label>
              <input
                className={inp}
                value={form.first_name}
                onChange={e => set('first_name', e.target.value)}
                placeholder="First name"
              />
            </div>
            <div>
              <label className={lbl}>Last Name *</label>
              <input
                className={inp}
                value={form.last_name}
                onChange={e => set('last_name', e.target.value)}
                placeholder="Last name"
                required
              />
            </div>
          </div>

          {/* Spouse / Partner */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Spouse / Partner
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>First Name</label>
                <input
                  className={inp}
                  value={form.spouse_first_name}
                  onChange={e => set('spouse_first_name', e.target.value)}
                  placeholder="Spouse first"
                />
              </div>
              <div>
                <label className={lbl}>Last Name</label>
                <input
                  className={inp}
                  value={form.spouse_last_name}
                  onChange={e => set('spouse_last_name', e.target.value)}
                  placeholder="Spouse last"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className={lbl}>Street Address</label>
            <input
              className={inp}
              value={form.street}
              onChange={e => set('street', e.target.value)}
              placeholder="123 Main St"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={lbl}>City</label>
              <input
                className={inp}
                value={form.city}
                onChange={e => set('city', e.target.value)}
                placeholder="City"
              />
            </div>
            <div>
              <label className={lbl}>State</label>
              <select
                className={inp}
                value={form.state}
                onChange={e => set('state', e.target.value)}
              >
                <option value="">—</option>
                {US_STATES.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>Zip</label>
              <input
                className={inp}
                value={form.zip}
                onChange={e => set('zip', e.target.value)}
                placeholder="00000"
                maxLength={10}
              />
            </div>
          </div>

          {/* Contact info */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={lbl}>Phone</label>
              <input
                className={inp}
                type="tel"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="(555) 555-5555"
              />
            </div>
            <div>
              <label className={lbl}>Cell</label>
              <input
                className={inp}
                type="tel"
                value={form.cell}
                onChange={e => set('cell', e.target.value)}
                placeholder="(555) 555-5555"
              />
            </div>
            <div>
              <label className={lbl}>Email</label>
              <input
                className={inp}
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="email@example.com"
              />
            </div>
          </div>
          <div>
            <label className={lbl}>
              Additional Emails <span className="font-normal text-gray-400">(one per line)</span>
            </label>
            <textarea
              className={`${inp} resize-none`}
              rows={2}
              value={form._additionalEmailsRaw}
              onChange={e => set('_additionalEmailsRaw', e.target.value)}
              placeholder="extra@email.com"
            />
          </div>
          <div>
            <label className={lbl}>
              Additional Phones <span className="font-normal text-gray-400">(one per line)</span>
            </label>
            <textarea
              className={`${inp} resize-none`}
              rows={2}
              value={form._additionalPhonesRaw}
              onChange={e => set('_additionalPhonesRaw', e.target.value)}
              placeholder="(555) 555-5555"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Other Email</label>
              <input
                className={inp}
                type="email"
                value={form.other_email}
                onChange={e => set('other_email', e.target.value)}
                placeholder="other@example.com"
              />
            </div>
            <div>
              <label className={lbl}>Other Address</label>
              <input
                className={inp}
                value={form.other_address}
                onChange={e => set('other_address', e.target.value)}
                placeholder="Mailing / vacation address"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={lbl}>Notes</label>
            <textarea
              className={`${inp} resize-none`}
              rows={2}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Any notes about this opportunity…"
            />
          </div>

          {/* Optional Consultant — Design or Installation Consultant.
              Source list = employees holding those exact positions in HR. */}
          <div>
            <label className={lbl}>
              Assigned Consultant{' '}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <ConsultantPicker
              value={consultantEmployeeId}
              onChange={setConsultantEmployeeId}
            />
          </div>

          {saveError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              ⚠️ {saveError}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 rounded-lg bg-green-700 text-white text-sm font-semibold hover:bg-green-800 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save Individual Opportunity'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Add Company Client Modal ──────────────────────────────────────────────────
function AddCompanyModal({ onSave, onClose, user }) {
  const [form, setForm] = useState({
    company_name: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    email: '',
    website: '',
    notes: '',
  })
  const [compContacts, setCompContacts] = useState([])
  const [mode, setMode] = useState('scratch')
  const [companies, setCompanies] = useState([])
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  // Optional consultant assignment (Design or Installation Consultant).
  const [consultantEmployeeId, setConsultantEmployeeId] = useState(null)
  const pickerRef = useRef(null)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (mode !== 'contact' || companies.length > 0) return
    supabase
      .from('companies')
      .select(
        'id, company_name, email, phone, company_street, company_city, company_state, company_zip, company_contacts'
      )
      .order('company_name')
      .then(({ data }) => setCompanies(data || []))
  }, [mode])

  useEffect(() => {
    if (!dropdownOpen) return
    const handler = e => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

  function applyCompany(c) {
    setSelectedId(c.id)
    setForm({
      company_name: c.company_name || '',
      street: c.company_street || '',
      city: c.company_city || '',
      state: c.company_state || '',
      zip: c.company_zip || '',
      phone: c.phone || '',
      email: c.email || '',
      website: '',
      notes: '',
    })
    setCompContacts(Array.isArray(c.company_contacts) ? c.company_contacts : [])
  }

  function addContact() {
    setCompContacts(prev => [
      ...prev,
      { first_name: '', last_name: '', position: '', phone: '', email: '' },
    ])
  }
  function updateContact(i, field, val) {
    setCompContacts(prev => prev.map((cc, idx) => (idx === i ? { ...cc, [field]: val } : cc)))
  }
  function removeContact(i) {
    setCompContacts(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.company_name.trim()) {
      setSaveError('Company name is required.')
      return
    }
    setSaving(true)
    setSaveError('')
    const { error } = await supabase.from('clients').insert({
      client_type: 'company',
      company_name: form.company_name.trim(),
      name: form.company_name.trim(),
      first_name: null,
      last_name: null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      website: form.website.trim() || null,
      street: form.street.trim() || null,
      city: form.city.trim() || null,
      state: form.state || null,
      zip: form.zip.trim() || null,
      notes: form.notes.trim() || null,
      company_contacts: compContacts.length ? compContacts : null,
      consultant_employee_id: consultantEmployeeId,
      created_by: user?.id,
    })
    setSaving(false)
    if (error) {
      setSaveError(error.message)
    } else {
      onSave()
    }
  }

  const inp =
    'w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:border-green-500'
  const lbl = 'block text-xs font-medium text-gray-600 mb-0.5'
  const smInp =
    'w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-green-500'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Add Company Opportunity</h2>
            <p className="text-xs text-gray-400 mt-0.5">Business or organization</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSave} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {/* Source toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase">Source:</span>
            {[
              { key: 'scratch', label: 'From Scratch' },
              { key: 'contact', label: 'From Company Contact' },
            ].map(o => (
              <button
                key={o.key}
                type="button"
                onClick={() => {
                  setMode(o.key)
                  setSelectedId(null)
                  setSearch('')
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-colors ${
                  mode === o.key
                    ? 'border-green-700 bg-green-50 text-green-800'
                    : 'border-gray-200 text-gray-500 hover:border-green-500'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>

          {mode === 'contact' && (
            <ContactPicker
              contacts={companies.map(c => ({ ...c, last_name: null, first_name: null }))}
              search={search}
              setSearch={setSearch}
              dropdownOpen={dropdownOpen}
              setDropdownOpen={setDropdownOpen}
              selectedId={selectedId}
              onSelect={c => applyCompany(companies.find(x => x.id === c.id) || c)}
              onClear={() => {
                setSelectedId(null)
                setSearch('')
              }}
              pickerRef={pickerRef}
              placeholder="Search company contacts"
            />
          )}

          {/* Company name */}
          <div>
            <label className={lbl}>Company Name *</label>
            <input
              className={inp}
              value={form.company_name}
              onChange={e => set('company_name', e.target.value)}
              placeholder="Acme Landscaping Co."
              required
            />
          </div>

          {/* Address */}
          <div>
            <label className={lbl}>Street Address</label>
            <input
              className={inp}
              value={form.street}
              onChange={e => set('street', e.target.value)}
              placeholder="123 Main St"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={lbl}>City</label>
              <input
                className={inp}
                value={form.city}
                onChange={e => set('city', e.target.value)}
                placeholder="City"
              />
            </div>
            <div>
              <label className={lbl}>State</label>
              <select
                className={inp}
                value={form.state}
                onChange={e => set('state', e.target.value)}
              >
                <option value="">—</option>
                {US_STATES.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>Zip</label>
              <input
                className={inp}
                value={form.zip}
                onChange={e => set('zip', e.target.value)}
                placeholder="00000"
                maxLength={10}
              />
            </div>
          </div>

          {/* Contact info */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={lbl}>Main Phone</label>
              <input
                className={inp}
                type="tel"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="(555) 555-5555"
              />
            </div>
            <div>
              <label className={lbl}>Main Email</label>
              <input
                className={inp}
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="info@company.com"
              />
            </div>
            <div>
              <label className={lbl}>Website</label>
              <input
                className={inp}
                value={form.website}
                onChange={e => set('website', e.target.value)}
                placeholder="https://example.com"
              />
            </div>
          </div>

          {/* Company Contacts */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Company Contacts
              </p>
              <button
                type="button"
                onClick={addContact}
                className="text-xs text-green-700 font-semibold hover:text-green-900 flex items-center gap-1"
              >
                <span className="text-base leading-none">+</span> Add Contact
              </button>
            </div>
            {compContacts.length === 0 && (
              <p className="text-xs text-gray-400 italic py-2">No company contacts added yet.</p>
            )}
            {compContacts.map((cc, i) => (
              <div
                key={i}
                className="grid grid-cols-5 gap-2 mb-2 bg-gray-50 rounded-lg p-2 border border-gray-100"
              >
                <input
                  className={smInp}
                  placeholder="First"
                  value={cc.first_name}
                  onChange={e => updateContact(i, 'first_name', e.target.value)}
                />
                <input
                  className={smInp}
                  placeholder="Last"
                  value={cc.last_name}
                  onChange={e => updateContact(i, 'last_name', e.target.value)}
                />
                <input
                  className={smInp}
                  placeholder="Position"
                  value={cc.position}
                  onChange={e => updateContact(i, 'position', e.target.value)}
                />
                <input
                  className={smInp}
                  placeholder="Phone"
                  value={cc.phone}
                  onChange={e => updateContact(i, 'phone', e.target.value)}
                />
                <div className="flex gap-1">
                  <input
                    className={`${smInp} flex-1`}
                    placeholder="Email"
                    value={cc.email}
                    onChange={e => updateContact(i, 'email', e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeContact(i)}
                    className="text-red-300 hover:text-red-500 text-base leading-none flex-shrink-0"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div>
            <label className={lbl}>Notes</label>
            <textarea
              className={`${inp} resize-none`}
              rows={2}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Any notes about this opportunity…"
            />
          </div>

          {/* Optional Consultant — Design or Installation Consultant.
              Source list = employees holding those exact positions in HR. */}
          <div>
            <label className={lbl}>
              Assigned Consultant{' '}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <ConsultantPicker
              value={consultantEmployeeId}
              onChange={setConsultantEmployeeId}
            />
          </div>

          {saveError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              ⚠️ {saveError}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 rounded-lg bg-green-700 text-white text-sm font-semibold hover:bg-green-800 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save Company Opportunity'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Clients component ────────────────────────────────────────────────────
export default function Clients() {
  const { user } = useAuth()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [clientModal, setClientModal] = useState(null) // null | 'individual' | 'company'
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [tabCounts, setTabCounts] = useState({ active: 0, inactive: 0 })
  const [tab, setTab] = useState('active')
  const [clientSettingsTab, setClientSettingsTab] = useState('general')
  const [visibleCols, setVisibleCols] = useState(DEFAULT_VISIBLE)
  const [colPickerOpen, setColPickerOpen] = useState(false)
  const colPickerRef = useRef(null)
  const reqId = useRef(0)

  // Cascade delete modal: { client, estCount, bidCount, woCount, onConfirm }
  const [deleteModal, setDeleteModal] = useState(null)

  // Debounce the search box so we don't query on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  // Reset to page 1 whenever the tab or search changes.
  useEffect(() => {
    setPage(1)
  }, [tab, debouncedSearch])

  // Fetch the current page from the server.
  useEffect(() => {
    if (tab !== 'settings') fetchClients()
  }, [tab, debouncedSearch, page])

  // Tab counts (Current / Past) — lightweight count-only queries.
  useEffect(() => {
    fetchTabCounts()
  }, [])

  // Close column picker on outside click
  useEffect(() => {
    if (!colPickerOpen) return
    function handleClick(e) {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target)) setColPickerOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [colPickerOpen])

  async function fetchClients() {
    const myReq = ++reqId.current
    setLoading(true)
    const from = (page - 1) * CLIENTS_PER_PAGE
    const to = from + CLIENTS_PER_PAGE - 1

    let q = supabase.from('clients').select('*', { count: 'exact' })

    // Status tab — a null status counts as 'active'.
    q = tab === 'active' ? q.or('status.eq.active,status.is.null') : q.eq('status', tab)

    // Token search — chained .or() calls are AND-ed, so every whitespace/
    // comma-delimited token must match somewhere across the listed fields.
    for (const raw of debouncedSearch.trim().split(/[\s,]+/)) {
      const t = raw.replace(/[%(),*]/g, '').trim()
      if (!t) continue
      q = q.or(
        `first_name.ilike.%${t}%,last_name.ilike.%${t}%,name.ilike.%${t}%,` +
          `company_name.ilike.%${t}%,email.ilike.%${t}%,city.ilike.%${t}%,phone.ilike.%${t}%`
      )
    }

    const { data, count, error } = await q
      .order('last_name', { ascending: true, nullsFirst: false })
      .order('first_name', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)

    // Drop results from a superseded fetch (tab/search/page changed mid-flight).
    if (myReq !== reqId.current) return
    if (error) console.error('fetchClients error:', error.message)
    if (!error) {
      setClients(data || [])
      setTotalCount(count || 0)
    }
    setLoading(false)
  }

  async function fetchTabCounts() {
    const [activeRes, inactiveRes] = await Promise.all([
      supabase
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .or('status.eq.active,status.is.null'),
      supabase.from('clients').select('id', { count: 'exact', head: true }).eq('status', 'inactive'),
    ])
    setTabCounts({ active: activeRes.count || 0, inactive: inactiveRes.count || 0 })
  }

  async function deleteClient(id) {
    const client = clients.find(c => c.id === id)
    const clientName = client
      ? client.name || [client.first_name, client.last_name].filter(Boolean).join(' ')
      : ''

    const [{ data: ests }, { data: bidsData }, { data: jobsData }] = await Promise.all([
      supabase.from('estimates').select('id').or(`client_name.eq.${clientName},client_id.eq.${id}`),
      supabase.from('bids').select('id').eq('client_name', clientName),
      supabase.from('jobs').select('id').eq('client_name', clientName),
    ])
    const estCount = ests?.length || 0
    const bidCount = bidsData?.length || 0
    let woCount = 0
    if (jobsData?.length) {
      const { count } = await supabase
        .from('work_orders')
        .select('id', { count: 'exact', head: true })
        .in(
          'job_id',
          jobsData.map(j => j.id)
        )
      woCount = count || 0
    }

    setDeleteModal({
      client,
      estCount,
      bidCount,
      woCount,
      onConfirm: async () => {
        if (jobsData?.length)
          await supabase
            .from('work_orders')
            .delete()
            .in(
              'job_id',
              jobsData.map(j => j.id)
            )
        if (bidsData?.length)
          await supabase
            .from('bids')
            .delete()
            .in(
              'id',
              bidsData.map(b => b.id)
            )
        if (ests?.length)
          await supabase
            .from('estimates')
            .delete()
            .in(
              'id',
              ests.map(e => e.id)
            )
        await supabase.from('clients').delete().eq('id', id)
        setDeleteModal(null)
        fetchClients()
        fetchTabCounts()
      },
    })
  }

  async function setClientStatus(id, status) {
    await supabase.from('clients').update({ status }).eq('id', id)
    fetchClients()
    fetchTabCounts()
  }

  function toggleCol(key) {
    setVisibleCols(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const activeCols = COLUMNS.filter(c => c.always || visibleCols.has(c.key))

  function cellContent(col, client) {
    switch (col.key) {
      case 'name':
        return (
          <Link
            to={`/clients/${client.id}`}
            className="font-semibold text-green-700 hover:text-green-900 hover:underline truncate block"
          >
            {displayName(client)}
          </Link>
        )
      case 'type':
        return client.client_type === 'company' ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5">
            🏢 Company
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5">
            👤 Individual
          </span>
        )
      case 'company_name':
        return client.company_name ? (
          <span className="text-gray-600 truncate block">{client.company_name}</span>
        ) : (
          <span className="text-gray-300">—</span>
        )
      case 'phone':
        return client.phone ? (
          <a href={`tel:${client.phone}`} className="text-gray-600 hover:text-green-700">
            {client.phone}
          </a>
        ) : (
          <span className="text-gray-300">—</span>
        )
      case 'email':
        return client.email ? (
          <a
            href={`mailto:${client.email}`}
            className="text-gray-600 hover:text-green-700 truncate block"
          >
            {client.email}
          </a>
        ) : (
          <span className="text-gray-300">—</span>
        )
      case 'street':
        return (
          <span className="text-gray-600 truncate block">
            {client.street || <span className="text-gray-300">—</span>}
          </span>
        )
      case 'city_state':
        return (
          <span className="text-gray-600 truncate block">
            {client.city ? `${client.city}${client.state ? ', ' + client.state : ''}` : '—'}
          </span>
        )
      case 'notes':
        return <span className="text-gray-400 italic truncate block">{client.notes || '—'}</span>
      default:
        return null
    }
  }

  // Server-side pagination — `clients` already holds just the current page.
  const totalPages = Math.max(1, Math.ceil(totalCount / CLIENTS_PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const pageStart = (safePage - 1) * CLIENTS_PER_PAGE

  return (
    <div className="h-full flex flex-col">
      {/* ── Opportunity Delete Cascade Modal ── */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">⚠️</span>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Delete Opportunity?</h2>
                <p className="text-sm text-gray-500">This cannot be undone.</p>
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm space-y-1.5">
              <p className="text-gray-700 font-medium">
                Deleting <span className="text-gray-900">{displayName(deleteModal.client)}</span>{' '}
                will permanently remove all associated data:
              </p>
              <ul className="text-red-700 space-y-0.5 mt-2">
                {deleteModal.estCount > 0 && (
                  <li>
                    • {deleteModal.estCount} Estimate{deleteModal.estCount !== 1 ? 's' : ''}
                  </li>
                )}
                {deleteModal.bidCount > 0 && (
                  <li>
                    • {deleteModal.bidCount} Bid{deleteModal.bidCount !== 1 ? 's' : ''}
                  </li>
                )}
                {deleteModal.woCount > 0 && (
                  <li>
                    • {deleteModal.woCount} Work Order{deleteModal.woCount !== 1 ? 's' : ''}
                  </li>
                )}
                {deleteModal.estCount === 0 &&
                  deleteModal.bidCount === 0 &&
                  deleteModal.woCount === 0 && (
                    <li className="text-gray-500">
                      No associated estimates, bids, or work orders.
                    </li>
                  )}
              </ul>
              <p className="text-xs text-red-600 font-semibold mt-2">
                There is no option to keep any of this data if the opportunity is deleted.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={deleteModal.onConfirm}
                className="flex-1 bg-red-600 text-white font-semibold py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Opportunity Modals ── */}
      {clientModal === 'individual' && (
        <AddIndividualModal
          user={user}
          onSave={() => {
            setClientModal(null)
            fetchClients()
            fetchTabCounts()
          }}
          onClose={() => setClientModal(null)}
        />
      )}
      {clientModal === 'company' && (
        <AddCompanyModal
          user={user}
          onSave={() => {
            setClientModal(null)
            fetchClients()
            fetchTabCounts()
          }}
          onClose={() => setClientModal(null)}
        />
      )}

      {/* Page header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0 gap-3">
        <h1 className="text-xl font-bold text-gray-900">Opportunities</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setClientModal('individual')}
            className="btn-primary text-sm px-3 py-1.5"
          >
            + Add Individual
          </button>
          <button
            onClick={() => setClientModal('company')}
            className="btn-primary text-sm px-3 py-1.5"
          >
            + Add Company
          </button>
        </div>
      </div>

      {/* ── Active / Inactive / Settings tabs ── */}
      <div className="bg-white border-b border-gray-200 flex gap-0 flex-shrink-0">
        {[
          { key: 'active', label: '✅ Current', count: tabCounts.active },
          { key: 'inactive', label: '📦 Past', count: tabCounts.inactive },
          { key: 'settings', label: '⚙️ Settings', count: null },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key)
              setSearch('')
            }}
            className={`flex items-center gap-1.5 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-green-700 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            {t.count !== null && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  tab === t.key ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Settings tab ── */}
      {tab === 'settings' && (
        <div className="mt-3 flex-1 flex flex-col overflow-hidden">
          <div className="flex border-b border-gray-200 bg-white px-6 flex-nowrap overflow-x-auto flex-shrink-0">
            {[
              { key: 'general', label: '⚙️ General' },
              { key: 'rates', label: '📊 Master Rates' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setClientSettingsTab(t.key)}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                  clientSettingsTab === t.key
                    ? 'border-green-700 text-green-800'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="bg-gray-50 px-6 py-6 flex-1 overflow-y-auto">
            {clientSettingsTab === 'general' && (
              <div className="space-y-4">
                <EstimateGpmdCard />
                <SalesTaxRateCard />
              </div>
            )}
            {clientSettingsTab === 'rates' && <MasterRates />}
          </div>
        </div>
      )}

      {tab !== 'settings' && (
        <>
          {/* ── Search + Column picker ── */}
          <div className="flex items-center justify-between mb-3 gap-3 mt-4 flex-shrink-0">
            <input
              type="text"
              placeholder="Search by name, company, email, phone or city..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input max-w-sm"
            />

            {/* Column picker */}
            <div className="relative flex-shrink-0" ref={colPickerRef}>
              <button
                onClick={() => setColPickerOpen(o => !o)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  colPickerOpen
                    ? 'border-green-600 text-green-700 bg-green-50'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                Columns
                <svg
                  className={`w-3 h-3 transition-transform ${colPickerOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {colPickerOpen && (
                <div className="absolute right-0 top-full mt-1.5 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-2 w-44">
                  <p className="px-3 pb-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100 mb-1">
                    Show / Hide Columns
                  </p>
                  {COLUMNS.map(col => (
                    <label
                      key={col.key}
                      className={`flex items-center gap-2.5 px-3 py-1.5 text-sm cursor-pointer select-none transition-colors ${
                        col.always
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={col.always || visibleCols.has(col.key)}
                        disabled={col.always}
                        onChange={() => !col.always && toggleCol(col.key)}
                        className="w-3.5 h-3.5 rounded accent-green-600 flex-shrink-0"
                      />
                      {col.label}
                      {col.always && <span className="ml-auto text-xs text-gray-300">always</span>}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Client table ── */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-700" />
              </div>
            ) : totalCount === 0 ? (
              <div className="card text-center py-12">
                <p className="text-4xl mb-3">👥</p>
                <p className="text-gray-500 mb-4">
                  {search
                    ? 'No results match your search.'
                    : tab === 'inactive'
                      ? 'No past opportunities.'
                      : 'No current opportunities.'}
                </p>
                {tab === 'active' && !search && (
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => setClientModal('individual')} className="btn-secondary">
                      Add Individual Opportunity
                    </button>
                    <button onClick={() => setClientModal('company')} className="btn-primary">
                      Add Company Opportunity
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                <table className="w-full text-xs min-w-[900px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {activeCols.map((col, ci) => (
                        <th
                          key={col.key}
                          className={`px-4 py-2 text-left font-semibold text-gray-600 uppercase truncate ${ci === 0 ? 'sticky left-0 bg-gray-50 z-10 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]' : ''}`}
                          style={{ width: colWidth(col.key) }}
                        >
                          {col.label}
                        </th>
                      ))}
                      <th className="px-4 py-2 w-16" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {clients.map(client => (
                      <tr
                        key={client.id}
                        className="group hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        {activeCols.map((col, ci) => (
                          <td
                            key={col.key}
                            className={`px-4 py-2 min-w-0 max-w-0 overflow-hidden text-gray-600 ${ci === 0 ? 'sticky left-0 bg-white group-hover:bg-gray-50 z-10 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]' : ''}`}
                          >
                            {cellContent(col, client)}
                          </td>
                        ))}
                        <td className="px-4 py-2 w-28">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/clients/${client.id}`}
                              className="text-gray-500 hover:text-gray-700 whitespace-nowrap text-xs"
                            >
                              View →
                            </Link>
                            {tab === 'active' ? (
                              <button
                                onClick={() => setClientStatus(client.id, 'inactive')}
                                className="text-xs text-gray-400 hover:text-yellow-600 whitespace-nowrap"
                                title="Mark inactive"
                              >
                                Deactivate
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => setClientStatus(client.id, 'active')}
                                  className="text-xs text-green-600 hover:text-green-800 whitespace-nowrap"
                                >
                                  Reactivate
                                </button>
                                <button
                                  onClick={() => deleteClient(client.id)}
                                  className="text-red-300 hover:text-red-500 text-xs"
                                >
                                  ✕
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination — controls on the left, clear of the Ask Sam button */}
          {totalCount > CLIENTS_PER_PAGE && (
            <div className="flex items-center gap-3 pt-3 mt-1 border-t border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(1, safePage - 1))}
                  disabled={safePage === 1}
                  className="px-2.5 py-1 text-xs rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ‹ Prev
                </button>
                <span className="text-xs text-gray-500 px-2">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                  disabled={safePage === totalPages}
                  className="px-2.5 py-1 text-xs rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next ›
                </button>
              </div>
              <span className="text-xs text-gray-500">
                {pageStart + 1}–{pageStart + clients.length} of {totalCount}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function colWidth(key) {
  switch (key) {
    case 'name':
      return '16%'
    case 'type':
      return '9%'
    case 'company_name':
      return '14%'
    case 'phone':
      return '11%'
    case 'email':
      return '16%'
    case 'street':
      return '14%'
    case 'city_state':
      return '10%'
    case 'notes':
      return '18%'
    default:
      return 'auto'
  }
}

// ── EstimateGpmdCard ────────────────────────────────────────────────────────
// Edits the company-wide default GPMD target used by the estimating module
// (company_settings.estimate_gpmd_default). This is the BASE rate that
// seeds every new module / project. Per-project overrides
// (estimate_projects.gpmd_override) and What-If adjustments still take
// precedence — they layer on top of this baseline.
function EstimateGpmdCard() {
  const [val, setVal] = useState('')
  const [original, setOriginal] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('') // "ok:..." or "error:..."

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        const { data } = await supabase
          .from('company_settings')
          .select('estimate_gpmd_default')
          .maybeSingle()
        if (!alive) return
        const n = parseFloat(data?.estimate_gpmd_default)
        const display = Number.isFinite(n) && n > 0 ? String(n) : String(DEFAULT_ESTIMATE_GPMD)
        setVal(display)
        setOriginal(display)
      } catch {
        if (alive) {
          setVal(String(DEFAULT_ESTIMATE_GPMD))
          setOriginal(String(DEFAULT_ESTIMATE_GPMD))
        }
      }
      if (alive) setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [])

  async function save() {
    const n = parseFloat(val)
    if (!Number.isFinite(n) || n <= 0) {
      setMsg('error:Enter a positive number.')
      return
    }
    setSaving(true)
    setMsg('')
    try {
      const { data: existing } = await supabase.from('company_settings').select('id').maybeSingle()
      const { error } = await supabase
        .from('company_settings')
        .upsert(
          { id: existing?.id || 1, estimate_gpmd_default: n, updated_at: new Date().toISOString() },
          { onConflict: 'id' }
        )
      if (error) {
        setMsg('error:' + error.message)
      } else {
        setOriginal(val)
        setMsg('ok:Estimate GPMD saved. Newly opened estimates will use this baseline.')
        setTimeout(() => setMsg(''), 5000)
      }
    } catch (err) {
      setMsg('error:' + (err?.message || 'Save failed.'))
    }
    setSaving(false)
  }

  const dirty = val !== original

  return (
    <div className="max-w-2xl">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <span>📊</span> Estimate GPMD (Global Baseline)
        </h2>
        <p className="text-sm text-gray-500 mb-5">
          The target Gross Profit per Man-Day used as the starting point for every new estimate
          module. Per-project GPMD overrides and What-If adjustments still take precedence; this
          just sets the baseline before any user changes.
        </p>

        {loading ? (
          <div className="py-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : (
          <>
            <div className="flex items-end gap-3 flex-wrap">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                  Target GPMD
                </label>
                <div className="flex items-center">
                  <span className="inline-flex items-center px-3 py-2 text-sm text-gray-600 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg">
                    $
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="1"
                    min="1"
                    value={val}
                    onChange={e => {
                      setVal(e.target.value)
                      if (msg) setMsg('')
                    }}
                    className="w-32 text-sm border border-gray-300 rounded-r-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              <button
                onClick={save}
                disabled={!dirty || saving}
                className="text-sm font-semibold text-white bg-green-700 hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              {msg && (
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    msg.startsWith('ok:')
                      ? 'text-green-800 bg-green-50 border border-green-200'
                      : 'text-red-700 bg-red-50 border border-red-200'
                  }`}
                >
                  {msg.slice(msg.indexOf(':') + 1)}
                </span>
              )}
            </div>

            <div className="mt-5 p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 leading-relaxed">
              <strong>Heads up:</strong> changing this value only affects modules opened after the
              save. Existing modules keep whatever GPMD they were created with (stored on the module
              itself); to reprice them, edit the project's GPMD override or open the What If? modal.
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── SalesTaxRateCard ────────────────────────────────────────────────────────
// Edits the company-wide sales tax rate (company_settings.sales_tax_rate).
// Stored as a fractional rate (0.095 = 9.5%) but edited in the UI as a
// percent for readability. Every estimating module applies this rate to its
// material totals when computing the final estimate price, so changing this
// value cascades into every new module calc.
function SalesTaxRateCard() {
  const [pct, setPct] = useState('')
  const [original, setOriginal] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        const { data } = await supabase
          .from('company_settings')
          .select('sales_tax_rate')
          .maybeSingle()
        if (!alive) return
        const rate = parseFloat(data?.sales_tax_rate)
        const display =
          Number.isFinite(rate) && rate >= 0
            ? String(+(rate * 100).toFixed(4))
            : String(DEFAULT_SALES_TAX_RATE * 100)
        setPct(display)
        setOriginal(display)
      } catch {
        if (alive) {
          setPct(String(DEFAULT_SALES_TAX_RATE * 100))
          setOriginal(String(DEFAULT_SALES_TAX_RATE * 100))
        }
      }
      if (alive) setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [])

  async function save() {
    const n = parseFloat(pct)
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      setMsg('error:Enter a percent between 0 and 100.')
      return
    }
    setSaving(true)
    setMsg('')
    try {
      const { data: existing } = await supabase.from('company_settings').select('id').maybeSingle()
      const { error } = await supabase
        .from('company_settings')
        .upsert(
          { id: existing?.id || 1, sales_tax_rate: n / 100, updated_at: new Date().toISOString() },
          { onConflict: 'id' }
        )
      if (error) {
        setMsg('error:' + error.message)
      } else {
        setOriginal(pct)
        setMsg(
          'ok:Sales tax saved. Open modules will reflect the new rate next time they recalculate.'
        )
        setTimeout(() => setMsg(''), 5000)
      }
    } catch (err) {
      setMsg('error:' + (err?.message || 'Save failed.'))
    }
    setSaving(false)
  }

  const dirty = pct !== original

  return (
    <div className="max-w-2xl">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <span>🧾</span> Sales Tax Rate
        </h2>
        <p className="text-sm text-gray-500 mb-5">
          Applied to every material total across every estimating module. Setting this to{' '}
          <strong>9.5%</strong> means a module with $1,000 of materials will be priced at $1,095 of
          materials in the bid. Change this rate any time and freshly-opened modules will use the
          new value.
        </p>

        {loading ? (
          <div className="py-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : (
          <>
            <div className="flex items-end gap-3 flex-wrap">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                  Rate %
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.001"
                    min="0"
                    max="100"
                    value={pct}
                    onChange={e => {
                      setPct(e.target.value)
                      if (msg) setMsg('')
                    }}
                    className="w-32 text-sm border border-gray-300 rounded-l-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <span className="inline-flex items-center px-3 py-2 text-sm text-gray-600 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg">
                    %
                  </span>
                </div>
              </div>
              <button
                onClick={save}
                disabled={!dirty || saving}
                className="text-sm font-semibold text-white bg-green-700 hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              {msg && (
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    msg.startsWith('ok:')
                      ? 'text-green-800 bg-green-50 border border-green-200'
                      : 'text-red-700 bg-red-50 border border-red-200'
                  }`}
                >
                  {msg.slice(msg.indexOf(':') + 1)}
                </span>
              )}
            </div>
            {/* Live example so admins can sanity-check the impact */}
            {(() => {
              const n = parseFloat(pct)
              if (!Number.isFinite(n) || n < 0) return null
              const mat = 1000
              const tax = Math.round(mat * (n / 100) * 100) / 100
              return (
                <div className="mt-5 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 mb-2">
                    Example
                  </p>
                  <p className="text-sm text-gray-700">
                    $1,000 of materials &nbsp;→&nbsp; tax{' '}
                    <span className="font-semibold">${tax.toLocaleString()}</span>
                    &nbsp;→&nbsp; in-bid material total{' '}
                    <span className="font-semibold text-green-800">
                      ${(mat + tax).toLocaleString()}
                    </span>
                  </p>
                </div>
              )
            })()}
          </>
        )}
      </div>
    </div>
  )
}
