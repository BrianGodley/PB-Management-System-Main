import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import MasterRates from './MasterRates'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY'
]

// Column definitions — key matches the render switch below
const COLUMNS = [
  { key: 'name',             label: 'Name',           always: true,  defaultOn: true  },
  { key: 'type',             label: 'Type',           always: false, defaultOn: true  },
  { key: 'company_name',     label: 'Company',        always: false, defaultOn: true  },
  { key: 'phone',            label: 'Phone',          always: false, defaultOn: true  },
  { key: 'email',            label: 'Email',          always: false, defaultOn: true  },
  { key: 'street',           label: 'Street',         always: false, defaultOn: true  },
  { key: 'city_state',       label: 'City / State',   always: false, defaultOn: true  },
  { key: 'notes',            label: 'Notes',          always: false, defaultOn: false },
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
function ContactPicker({ contacts, search, setSearch, dropdownOpen, setDropdownOpen, selectedId, onSelect, onClear, pickerRef, placeholder }) {
  const display = selectedId
    ? contacts.find(c => c.id === selectedId)
    : null
  const displayLabel = display
    ? ([display.last_name, display.first_name].filter(Boolean).join(', ') || display.company_name || '—')
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
          onChange={e => { setSearch(e.target.value); setDropdownOpen(true) }}
          onFocus={() => setDropdownOpen(true)}
          className="w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:border-green-500 pr-7"
        />
        {(selectedId || search) && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-lg leading-none"
          >×</button>
        )}
        {dropdownOpen && (
          <div className="absolute left-0 right-0 top-full mt-1 z-20 max-h-56 overflow-y-auto border border-gray-200 rounded-md bg-white shadow-lg divide-y divide-gray-100">
            {(() => {
              const q = search.trim().toLowerCase()
              const list = q
                ? contacts.filter(c => {
                    const hay = [c.first_name, c.last_name, c.company_name, c.email, c.phone].filter(Boolean).join(' ').toLowerCase()
                    return hay.includes(q)
                  })
                : contacts
              if (list.length === 0) return (
                <p className="px-3 py-3 text-xs text-gray-400">{search ? 'No matches.' : 'No records yet.'}</p>
              )
              return list.slice(0, 50).map(c => {
                const label = [c.last_name, c.first_name].filter(Boolean).join(', ') || c.company_name || '—'
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { onSelect(c); setDropdownOpen(false) }}
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
    first_name: '', last_name: '',
    spouse_first_name: '', spouse_last_name: '',
    street: '', city: '', state: '', zip: '',
    email: '', phone: '',
    other_email: '', other_address: '',
    notes: '',
  })
  const [mode, setMode]               = useState('scratch')
  const [contacts, setContacts]       = useState([])
  const [search, setSearch]           = useState('')
  const [selectedId, setSelectedId]   = useState(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [saving, setSaving]           = useState(false)
  const [saveError, setSaveError]     = useState('')
  const pickerRef = useRef(null)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // Load contacts once when "From a contact" is chosen
  useEffect(() => {
    if (mode !== 'contact' || contacts.length > 0) return
    supabase.from('contacts')
      .select('id, first_name, last_name, email, phone, cell, street_address, city, state, zip, secondary_first_name, secondary_last_name')
      .order('last_name')
      .then(({ data }) => setContacts(data || []))
  }, [mode])

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return
    const handler = e => { if (pickerRef.current && !pickerRef.current.contains(e.target)) setDropdownOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

  function applyContact(c) {
    setSelectedId(c.id)
    setForm({
      first_name:        c.first_name              || '',
      last_name:         c.last_name               || '',
      spouse_first_name: c.secondary_first_name    || '',
      spouse_last_name:  c.secondary_last_name     || '',
      street:            c.street_address          || '',
      city:              c.city                    || '',
      state:             c.state                   || '',
      zip:               c.zip                     || '',
      email:             c.email                   || '',
      phone:             c.phone || c.cell         || '',
      other_email:       '',
      other_address:     '',
      notes:             '',
    })
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.last_name.trim() && !form.first_name.trim()) {
      setSaveError('First or last name is required.')
      return
    }
    setSaving(true); setSaveError('')
    const name = [form.first_name.trim(), form.last_name.trim()].filter(Boolean).join(' ')
    const { error } = await supabase.from('clients').insert({
      client_type:       'individual',
      first_name:        form.first_name.trim(),
      last_name:         form.last_name.trim(),
      name,
      spouse_first_name: form.spouse_first_name.trim() || null,
      spouse_last_name:  form.spouse_last_name.trim()  || null,
      email:             form.email.trim()             || null,
      phone:             form.phone.trim()             || null,
      other_email:       form.other_email.trim()       || null,
      other_address:     form.other_address.trim()     || null,
      street:            form.street.trim()            || null,
      city:              form.city.trim()              || null,
      state:             form.state                   || null,
      zip:               form.zip.trim()              || null,
      notes:             form.notes.trim()             || null,
      created_by:        user?.id,
    })
    setSaving(false)
    if (error) { setSaveError(error.message) } else { onSave() }
  }

  const inp = 'w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:border-green-500'
  const lbl = 'block text-xs font-medium text-gray-600 mb-0.5'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Add Individual Client</h2>
            <p className="text-xs text-gray-400 mt-0.5">Person or household</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1">×</button>
        </div>

        <form onSubmit={handleSave} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {/* Source toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase">Source:</span>
            {[{ key: 'scratch', label: 'From Scratch' }, { key: 'contact', label: 'From Contact' }].map(o => (
              <button key={o.key} type="button"
                onClick={() => { setMode(o.key); setSelectedId(null); setSearch('') }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-colors ${
                  mode === o.key ? 'border-green-700 bg-green-50 text-green-800' : 'border-gray-200 text-gray-500 hover:border-green-500'
                }`}
              >{o.label}</button>
            ))}
          </div>

          {mode === 'contact' && (
            <ContactPicker
              contacts={contacts} search={search} setSearch={setSearch}
              dropdownOpen={dropdownOpen} setDropdownOpen={setDropdownOpen}
              selectedId={selectedId}
              onSelect={applyContact}
              onClear={() => { setSelectedId(null); setSearch('') }}
              pickerRef={pickerRef}
              placeholder="Search individual contacts"
            />
          )}

          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>First Name</label><input className={inp} value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="First name" /></div>
            <div><label className={lbl}>Last Name *</label><input className={inp} value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Last name" required /></div>
          </div>

          {/* Spouse / Partner */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Spouse / Partner</p>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl}>First Name</label><input className={inp} value={form.spouse_first_name} onChange={e => set('spouse_first_name', e.target.value)} placeholder="Spouse first" /></div>
              <div><label className={lbl}>Last Name</label><input className={inp} value={form.spouse_last_name} onChange={e => set('spouse_last_name', e.target.value)} placeholder="Spouse last" /></div>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className={lbl}>Street Address</label>
            <input className={inp} value={form.street} onChange={e => set('street', e.target.value)} placeholder="123 Main St" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={lbl}>City</label><input className={inp} value={form.city} onChange={e => set('city', e.target.value)} placeholder="City" /></div>
            <div>
              <label className={lbl}>State</label>
              <select className={inp} value={form.state} onChange={e => set('state', e.target.value)}>
                <option value="">—</option>
                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div><label className={lbl}>Zip</label><input className={inp} value={form.zip} onChange={e => set('zip', e.target.value)} placeholder="00000" maxLength={10} /></div>
          </div>

          {/* Contact info */}
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Email</label><input className={inp} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" /></div>
            <div><label className={lbl}>Cell Phone</label><input className={inp} type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 555-5555" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Other Email</label><input className={inp} type="email" value={form.other_email} onChange={e => set('other_email', e.target.value)} placeholder="other@example.com" /></div>
            <div><label className={lbl}>Other Address</label><input className={inp} value={form.other_address} onChange={e => set('other_address', e.target.value)} placeholder="Mailing / vacation address" /></div>
          </div>

          {/* Notes */}
          <div>
            <label className={lbl}>Notes</label>
            <textarea className={`${inp} resize-none`} rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any notes about this client…" />
          </div>

          {saveError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">⚠️ {saveError}</div>
          )}
        </form>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 rounded-lg bg-green-700 text-white text-sm font-semibold hover:bg-green-800 disabled:opacity-50 transition-colors"
          >{saving ? 'Saving…' : 'Save Individual Client'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Add Company Client Modal ──────────────────────────────────────────────────
function AddCompanyModal({ onSave, onClose, user }) {
  const [form, setForm] = useState({
    company_name: '',
    street: '', city: '', state: '', zip: '',
    phone: '', email: '', website: '',
    notes: '',
  })
  const [compContacts, setCompContacts] = useState([])
  const [mode, setMode]                 = useState('scratch')
  const [companies, setCompanies]       = useState([])
  const [search, setSearch]             = useState('')
  const [selectedId, setSelectedId]     = useState(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [saving, setSaving]             = useState(false)
  const [saveError, setSaveError]       = useState('')
  const pickerRef = useRef(null)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (mode !== 'contact' || companies.length > 0) return
    supabase.from('companies')
      .select('id, company_name, email, phone, company_street, company_city, company_state, company_zip, company_contacts')
      .order('company_name')
      .then(({ data }) => setCompanies(data || []))
  }, [mode])

  useEffect(() => {
    if (!dropdownOpen) return
    const handler = e => { if (pickerRef.current && !pickerRef.current.contains(e.target)) setDropdownOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

  function applyCompany(c) {
    setSelectedId(c.id)
    setForm({
      company_name: c.company_name  || '',
      street:       c.company_street || '',
      city:         c.company_city   || '',
      state:        c.company_state  || '',
      zip:          c.company_zip    || '',
      phone:        c.phone          || '',
      email:        c.email          || '',
      website:      '',
      notes:        '',
    })
    setCompContacts(Array.isArray(c.company_contacts) ? c.company_contacts : [])
  }

  function addContact() {
    setCompContacts(prev => [...prev, { first_name: '', last_name: '', position: '', phone: '', email: '' }])
  }
  function updateContact(i, field, val) {
    setCompContacts(prev => prev.map((cc, idx) => idx === i ? { ...cc, [field]: val } : cc))
  }
  function removeContact(i) {
    setCompContacts(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.company_name.trim()) { setSaveError('Company name is required.'); return }
    setSaving(true); setSaveError('')
    const { error } = await supabase.from('clients').insert({
      client_type:      'company',
      company_name:     form.company_name.trim(),
      name:             form.company_name.trim(),
      first_name:       null,
      last_name:        null,
      email:            form.email.trim()   || null,
      phone:            form.phone.trim()   || null,
      website:          form.website.trim() || null,
      street:           form.street.trim()  || null,
      city:             form.city.trim()    || null,
      state:            form.state          || null,
      zip:              form.zip.trim()     || null,
      notes:            form.notes.trim()   || null,
      company_contacts: compContacts.length ? compContacts : null,
      created_by:       user?.id,
    })
    setSaving(false)
    if (error) { setSaveError(error.message) } else { onSave() }
  }

  const inp = 'w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:border-green-500'
  const lbl = 'block text-xs font-medium text-gray-600 mb-0.5'
  const smInp = 'w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-green-500'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Add Company Client</h2>
            <p className="text-xs text-gray-400 mt-0.5">Business or organization</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1">×</button>
        </div>

        <form onSubmit={handleSave} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {/* Source toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase">Source:</span>
            {[{ key: 'scratch', label: 'From Scratch' }, { key: 'contact', label: 'From Company Contact' }].map(o => (
              <button key={o.key} type="button"
                onClick={() => { setMode(o.key); setSelectedId(null); setSearch('') }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-colors ${
                  mode === o.key ? 'border-green-700 bg-green-50 text-green-800' : 'border-gray-200 text-gray-500 hover:border-green-500'
                }`}
              >{o.label}</button>
            ))}
          </div>

          {mode === 'contact' && (
            <ContactPicker
              contacts={companies.map(c => ({ ...c, last_name: null, first_name: null }))}
              search={search} setSearch={setSearch}
              dropdownOpen={dropdownOpen} setDropdownOpen={setDropdownOpen}
              selectedId={selectedId}
              onSelect={c => applyCompany(companies.find(x => x.id === c.id) || c)}
              onClear={() => { setSelectedId(null); setSearch('') }}
              pickerRef={pickerRef}
              placeholder="Search company contacts"
            />
          )}

          {/* Company name */}
          <div>
            <label className={lbl}>Company Name *</label>
            <input className={inp} value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="Acme Landscaping Co." required />
          </div>

          {/* Address */}
          <div>
            <label className={lbl}>Street Address</label>
            <input className={inp} value={form.street} onChange={e => set('street', e.target.value)} placeholder="123 Main St" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={lbl}>City</label><input className={inp} value={form.city} onChange={e => set('city', e.target.value)} placeholder="City" /></div>
            <div>
              <label className={lbl}>State</label>
              <select className={inp} value={form.state} onChange={e => set('state', e.target.value)}>
                <option value="">—</option>
                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div><label className={lbl}>Zip</label><input className={inp} value={form.zip} onChange={e => set('zip', e.target.value)} placeholder="00000" maxLength={10} /></div>
          </div>

          {/* Contact info */}
          <div className="grid grid-cols-3 gap-3">
            <div><label className={lbl}>Main Phone</label><input className={inp} type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 555-5555" /></div>
            <div><label className={lbl}>Main Email</label><input className={inp} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="info@company.com" /></div>
            <div><label className={lbl}>Website</label><input className={inp} value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://example.com" /></div>
          </div>

          {/* Company Contacts */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Company Contacts</p>
              <button type="button" onClick={addContact}
                className="text-xs text-green-700 font-semibold hover:text-green-900 flex items-center gap-1">
                <span className="text-base leading-none">+</span> Add Contact
              </button>
            </div>
            {compContacts.length === 0 && (
              <p className="text-xs text-gray-400 italic py-2">No company contacts added yet.</p>
            )}
            {compContacts.map((cc, i) => (
              <div key={i} className="grid grid-cols-5 gap-2 mb-2 bg-gray-50 rounded-lg p-2 border border-gray-100">
                <input className={smInp} placeholder="First" value={cc.first_name} onChange={e => updateContact(i, 'first_name', e.target.value)} />
                <input className={smInp} placeholder="Last" value={cc.last_name} onChange={e => updateContact(i, 'last_name', e.target.value)} />
                <input className={smInp} placeholder="Position" value={cc.position} onChange={e => updateContact(i, 'position', e.target.value)} />
                <input className={smInp} placeholder="Phone" value={cc.phone} onChange={e => updateContact(i, 'phone', e.target.value)} />
                <div className="flex gap-1">
                  <input className={`${smInp} flex-1`} placeholder="Email" value={cc.email} onChange={e => updateContact(i, 'email', e.target.value)} />
                  <button type="button" onClick={() => removeContact(i)}
                    className="text-red-300 hover:text-red-500 text-base leading-none flex-shrink-0">×</button>
                </div>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div>
            <label className={lbl}>Notes</label>
            <textarea className={`${inp} resize-none`} rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any notes about this client…" />
          </div>

          {saveError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">⚠️ {saveError}</div>
          )}
        </form>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 rounded-lg bg-green-700 text-white text-sm font-semibold hover:bg-green-800 disabled:opacity-50 transition-colors"
          >{saving ? 'Saving…' : 'Save Company Client'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Main Clients component ────────────────────────────────────────────────────
export default function Clients() {
  const { user } = useAuth()
  const [clients,    setClients]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [clientModal, setClientModal] = useState(null) // null | 'individual' | 'company'
  const [search,     setSearch]     = useState('')
  const [tab,        setTab]        = useState('active')
  const [clientSettingsTab, setClientSettingsTab] = useState('general')
  const [visibleCols, setVisibleCols] = useState(DEFAULT_VISIBLE)
  const [colPickerOpen, setColPickerOpen] = useState(false)
  const colPickerRef = useRef(null)

  // Cascade delete modal: { client, estCount, bidCount, woCount, onConfirm }
  const [deleteModal, setDeleteModal] = useState(null)

  useEffect(() => { fetchClients() }, [])

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
    setLoading(true)
    const { data, error } = await supabase.from('clients').select('*')
    if (error) console.error('fetchClients error:', error.message)
    setClients(data || [])
    setLoading(false)
  }

  async function deleteClient(id) {
    const client = clients.find(c => c.id === id)
    const clientName = client ? (client.name || [client.first_name, client.last_name].filter(Boolean).join(' ')) : ''

    const [{ data: ests }, { data: bidsData }, { data: jobsData }] = await Promise.all([
      supabase.from('estimates').select('id').or(`client_name.eq.${clientName},client_id.eq.${id}`),
      supabase.from('bids').select('id').eq('client_name', clientName),
      supabase.from('jobs').select('id').eq('client_name', clientName),
    ])
    const estCount = ests?.length || 0
    const bidCount = bidsData?.length || 0
    let woCount = 0
    if (jobsData?.length) {
      const { count } = await supabase.from('work_orders').select('id', { count: 'exact', head: true }).in('job_id', jobsData.map(j => j.id))
      woCount = count || 0
    }

    setDeleteModal({
      client,
      estCount,
      bidCount,
      woCount,
      onConfirm: async () => {
        if (jobsData?.length) await supabase.from('work_orders').delete().in('job_id', jobsData.map(j => j.id))
        if (bidsData?.length) await supabase.from('bids').delete().in('id', bidsData.map(b => b.id))
        if (ests?.length) await supabase.from('estimates').delete().in('id', ests.map(e => e.id))
        await supabase.from('clients').delete().eq('id', id)
        setDeleteModal(null)
        fetchClients()
      },
    })
  }

  async function setClientStatus(id, status) {
    await supabase.from('clients').update({ status }).eq('id', id)
    fetchClients()
  }

  function toggleCol(key) {
    setVisibleCols(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  // Sort: company name (for companies) or last_name → first_name
  const sorted = [...clients].sort((a, b) => {
    const la = (a.client_type === 'company' ? (a.company_name || '') : (a.last_name || a.name || '')).toLowerCase()
    const lb = (b.client_type === 'company' ? (b.company_name || '') : (b.last_name || b.name || '')).toLowerCase()
    if (la !== lb) return la.localeCompare(lb)
    return (a.first_name || '').toLowerCase().localeCompare((b.first_name || '').toLowerCase())
  })

  const tabClients = sorted.filter(c => (c.status || 'active') === tab)

  const filtered = tabClients.filter(c => {
    const q = search.toLowerCase()
    return (
      displayName(c).toLowerCase().includes(q) ||
      (c.company_name || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(search) ||
      (c.city || '').toLowerCase().includes(q)
    )
  })

  const activeCols = COLUMNS.filter(c => c.always || visibleCols.has(c.key))

  function cellContent(col, client) {
    switch (col.key) {
      case 'name':
        return (
          <Link to={`/clients/${client.id}`} className="font-semibold text-green-700 hover:text-green-900 hover:underline truncate block">
            {displayName(client)}
          </Link>
        )
      case 'type':
        return client.client_type === 'company'
          ? <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5">🏢 Company</span>
          : <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5">👤 Individual</span>
      case 'company_name':
        return client.company_name
          ? <span className="text-gray-600 truncate block">{client.company_name}</span>
          : <span className="text-gray-300">—</span>
      case 'phone':
        return client.phone
          ? <a href={`tel:${client.phone}`} className="text-gray-600 hover:text-green-700">{client.phone}</a>
          : <span className="text-gray-300">—</span>
      case 'email':
        return client.email
          ? <a href={`mailto:${client.email}`} className="text-gray-600 hover:text-green-700 truncate block">{client.email}</a>
          : <span className="text-gray-300">—</span>
      case 'street':
        return <span className="text-gray-600 truncate block">{client.street || <span className="text-gray-300">—</span>}</span>
      case 'city_state':
        return <span className="text-gray-600 truncate block">
          {client.city ? `${client.city}${client.state ? ', ' + client.state : ''}` : '—'}
        </span>
      case 'notes':
        return <span className="text-gray-400 italic truncate block">{client.notes || '—'}</span>
      default:
        return null
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-700" />
    </div>
  )

  return (
    <div>
      {/* ── Client Delete Cascade Modal ── */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">⚠️</span>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Delete Client?</h2>
                <p className="text-sm text-gray-500">This cannot be undone.</p>
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm space-y-1.5">
              <p className="text-gray-700 font-medium">
                Deleting <span className="text-gray-900">{displayName(deleteModal.client)}</span> will permanently remove all associated data:
              </p>
              <ul className="text-red-700 space-y-0.5 mt-2">
                {deleteModal.estCount > 0 && <li>• {deleteModal.estCount} Estimate{deleteModal.estCount !== 1 ? 's' : ''}</li>}
                {deleteModal.bidCount > 0 && <li>• {deleteModal.bidCount} Bid{deleteModal.bidCount !== 1 ? 's' : ''}</li>}
                {deleteModal.woCount > 0 && <li>• {deleteModal.woCount} Work Order{deleteModal.woCount !== 1 ? 's' : ''}</li>}
                {deleteModal.estCount === 0 && deleteModal.bidCount === 0 && deleteModal.woCount === 0 && (
                  <li className="text-gray-500">No associated estimates, bids, or work orders.</li>
                )}
              </ul>
              <p className="text-xs text-red-600 font-semibold mt-2">There is no option to keep any of this data if the client is deleted.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal(null)} className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-600 font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={deleteModal.onConfirm} className="flex-1 bg-red-600 text-white font-semibold py-2 rounded-lg hover:bg-red-700 transition-colors">Delete Everything</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Client Modals ── */}
      {clientModal === 'individual' && (
        <AddIndividualModal
          user={user}
          onSave={() => { setClientModal(null); fetchClients() }}
          onClose={() => setClientModal(null)}
        />
      )}
      {clientModal === 'company' && (
        <AddCompanyModal
          user={user}
          onSave={() => { setClientModal(null); fetchClients() }}
          onClose={() => setClientModal(null)}
        />
      )}

      {/* Page header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0 gap-3">
        <h1 className="text-xl font-bold text-gray-900">Clients</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setClientModal('individual')}
            className="text-sm px-3 py-1.5 rounded-lg border-2 border-green-700 text-green-700 font-semibold hover:bg-green-50 transition-colors"
          >
            + Individual
          </button>
          <button
            onClick={() => setClientModal('company')}
            className="btn-primary text-sm px-3 py-1.5"
          >
            + Company
          </button>
        </div>
      </div>

      {/* ── Active / Inactive / Settings tabs ── */}
      <div className="bg-white border-b border-gray-200 flex gap-0 flex-shrink-0">
        {[
          { key: 'active',   label: '✅ Current', count: sorted.filter(c => (c.status || 'active') === 'active').length },
          { key: 'inactive', label: '📦 Past',     count: sorted.filter(c => (c.status || 'active') === 'inactive').length },
          { key: 'settings', label: '⚙️ Settings', count: null },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setSearch('') }}
            className={`flex items-center gap-1.5 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-green-700 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            {t.count !== null && <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
              tab === t.key ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* ── Settings tab ── */}
      {tab === 'settings' && (
        <div className="-mx-6 mt-3">
          <div className="flex border-b border-gray-200 bg-white px-6 flex-nowrap overflow-x-auto flex-shrink-0">
            {[
              { key: 'general', label: '⚙️ General' },
              { key: 'rates',   label: '📊 Master Rates' },
            ].map(t => (
              <button key={t.key} onClick={() => setClientSettingsTab(t.key)}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                  clientSettingsTab === t.key ? 'border-green-700 text-green-800' : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >{t.label}</button>
            ))}
          </div>
          <div className="bg-gray-50 px-6 py-6">
            {clientSettingsTab === 'general' && (
              <div className="flex items-center justify-center py-20 text-center">
                <div>
                  <p className="text-4xl mb-3">⚙️</p>
                  <h2 className="text-base font-semibold text-gray-800 mb-1">Clients Settings</h2>
                  <p className="text-sm text-gray-500">Configuration options will be available here.</p>
                </div>
              </div>
            )}
            {clientSettingsTab === 'rates' && (
              <MasterRates />
            )}
          </div>
        </div>
      )}

      {tab !== 'settings' && <>
        {/* ── Search + Column picker ── */}
        <div className="flex items-center justify-between mb-3 gap-3 mt-4">
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
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Columns
              <svg className={`w-3 h-3 transition-transform ${colPickerOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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
                      col.always ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'
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
        {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">👥</p>
          <p className="text-gray-500 mb-4">
            {search
              ? 'No results match your search.'
              : tab === 'inactive'
              ? 'No past clients.'
              : clients.length === 0 ? 'No clients yet.' : 'No current clients.'}
          </p>
          {tab === 'active' && clients.length === 0 && (
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => setClientModal('individual')} className="btn-secondary">Add Individual Client</button>
              <button onClick={() => setClientModal('company')} className="btn-primary">Add Company Client</button>
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
              {filtered.map(client => (
                <tr key={client.id} className="group hover:bg-gray-50 transition-colors cursor-pointer">
                  {activeCols.map((col, ci) => (
                    <td key={col.key} className={`px-4 py-2 min-w-0 max-w-0 overflow-hidden text-gray-600 ${ci === 0 ? 'sticky left-0 bg-white group-hover:bg-gray-50 z-10 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]' : ''}`}>
                      {cellContent(col, client)}
                    </td>
                  ))}
                  <td className="px-4 py-2 w-28">
                    <div className="flex items-center justify-end gap-2">
                      <Link to={`/clients/${client.id}`} className="text-gray-500 hover:text-gray-700 whitespace-nowrap text-xs">
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
                          <button onClick={() => deleteClient(client.id)} className="text-red-300 hover:text-red-500 text-xs">✕</button>
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
      </>}
    </div>
  )
}

function colWidth(key) {
  switch (key) {
    case 'name':         return '16%'
    case 'type':         return '9%'
    case 'company_name': return '14%'
    case 'phone':        return '11%'
    case 'email':        return '16%'
    case 'street':       return '14%'
    case 'city_state':   return '10%'
    case 'notes':        return '18%'
    default:             return 'auto'
  }
}
