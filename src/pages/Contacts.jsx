import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ExportModal, ImportModal } from '../components/ContactImportExport'
import { fetchAssignableEmployees } from '../lib/assignableEmployees'

// ── Stage config ──────────────────────────────────────────────────────────────
const STAGES = [
  { value: 'new_lead',     label: 'New Lead',      cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'warm_lead',    label: 'Warm Lead',     cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  { value: 'consultation', label: 'Consultation',  cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'quoted',       label: 'Quoted',        cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  { value: 'won',          label: 'Won',           cls: 'bg-green-50 text-green-700 border-green-200' },
  { value: 'lost',         label: 'Lost',          cls: 'bg-red-50 text-red-600 border-red-200' },
  { value: 'nurture',      label: 'Nurture',       cls: 'bg-teal-50 text-teal-700 border-teal-200' },
  { value: 'bt_import',    label: 'BT Import',     cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'ghl_import',   label: 'GHL Import',    cls: 'bg-sky-50 text-sky-700 border-sky-200' },
]
const stageMap = Object.fromEntries(STAGES.map(s => [s.value, s]))

const EMPTY_FORM = {
  first_name: '', last_name: '',
  secondary_first_name: '', secondary_last_name: '',
  phone: '', cell: '', email: '',
  _additionalEmailsRaw: '', _additionalPhonesRaw: '',
  street_address: '', city: '', state: '', zip: '',
  ghl_assigned_to: '', consultation_type: '',
  date_of_birth: '', notes: '', project_description: '',
  stage: 'new_lead', contact_type: 'Residential',
  source: '', campaign: '', how_did_you_hear: '',
  interest_1: '', interest_2: '', interest_3: '',
  call_center_notes: '',
}

const PROJECT_TYPES = [
  'Artificial Turf','Concrete','Columns','Demo/Excavation','Drainage',
  'Finishes','Fire Pit','Ground Treatments','Irrigation','Lighting',
  'Outdoor Kitchen/BBQ','Pavers','Planting/Landscaping','Pool',
  'Retaining Walls','Steps','Utilities','Other',
]

const EMPTY_COMPANY_FORM = {
  company_name: '',
  company_street: '', company_city: '', company_state: '', company_zip: '',
  phone: '', email: '', website: '',
  ghl_assigned_to: '',
  stage: 'new_lead', contact_type: 'Residential',
  source: '', campaign: '', how_did_you_hear: '',
  notes: '', project_description: '', call_center_notes: '',
  company_contacts: [],
}

// ── Add Individual Contact Modal ──────────────────────────────────────────────
function AddContactModal({ onSave, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function handleSave() {
    if (!form.last_name.trim() && !form.first_name.trim()) return
    setSaving(true)
    setSaveError(null)
    const { data, error } = await supabase
      .from('contacts')
      .insert({
        first_name:           form.first_name.trim(),
        last_name:            form.last_name.trim(),
        secondary_first_name: form.secondary_first_name.trim() || null,
        secondary_last_name:  form.secondary_last_name.trim() || null,
        phone:                form.phone.trim() || null,
        cell:                 form.cell.trim() || null,
        email:                form.email.trim() || null,
        additional_emails:    form._additionalEmailsRaw
          ? form._additionalEmailsRaw.split(/[\n,]+/).map(e => e.trim()).filter(Boolean)
          : null,
        additional_phones:    form._additionalPhonesRaw
          ? form._additionalPhonesRaw.split(/[\n,]+/).map(p => p.trim()).filter(Boolean)
          : null,
        street_address:       form.street_address.trim() || null,
        city:                 form.city.trim() || null,
        state:                form.state.trim() || null,
        zip:                  form.zip.trim() || null,
        ghl_assigned_to:      form.ghl_assigned_to.trim() || null,
        consultation_type:    form.consultation_type || null,
        stage:                form.stage,
        contact_type:         form.contact_type || null,
        source:               form.source.trim() || null,
        campaign:             form.campaign.trim() || null,
        how_did_you_hear:     form.how_did_you_hear.trim() || null,
        date_of_birth:        form.date_of_birth || null,
        notes:                form.notes.trim() || null,
        project_description:  form.project_description.trim() || null,
        interest_1:           form.interest_1 || null,
        interest_2:           form.interest_2 || null,
        interest_3:           form.interest_3 || null,
        call_center_notes:    form.call_center_notes.trim() || null,
      })
      .select()
      .single()
    setSaving(false)
    if (error) { setSaveError(error.message); return }
    if (data) onSave(data)
  }

  const input = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600'
  const label = 'block text-xs font-semibold text-gray-500 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">New Individual Contact</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="space-y-3">
          {/* ── Name ── */}
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>First Name</label><input className={input} value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="First" autoFocus /></div>
            <div><label className={label}>Last Name <span className="text-red-400">*</span></label><input className={input} value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Last" /></div>
          </div>

          {/* ── Spouse / Partner ── */}
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Spouse / Partner First</label><input className={input} value={form.secondary_first_name} onChange={e => set('secondary_first_name', e.target.value)} placeholder="First" /></div>
            <div><label className={label}>Spouse / Partner Last</label><input className={input} value={form.secondary_last_name} onChange={e => set('secondary_last_name', e.target.value)} placeholder="Last" /></div>
          </div>

          {/* ── Contact Info ── */}
          <div className="grid grid-cols-3 gap-3">
            <div><label className={label}>Phone</label><input className={input} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 000-0000" /></div>
            <div><label className={label}>Cell</label><input className={input} value={form.cell} onChange={e => set('cell', e.target.value)} placeholder="(555) 000-0000" /></div>
            <div><label className={label}>Email</label><input className={input} value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" type="email" /></div>
          </div>
          <div>
            <label className={label}>Additional Emails <span className="font-normal text-gray-400">(one per line)</span></label>
            <textarea className={input + ' resize-none'} rows={2} value={form._additionalEmailsRaw} onChange={e => set('_additionalEmailsRaw', e.target.value)} placeholder="extra@email.com" />
          </div>
          <div>
            <label className={label}>Additional Phones <span className="font-normal text-gray-400">(one per line)</span></label>
            <textarea className={input + ' resize-none'} rows={2} value={form._additionalPhonesRaw} onChange={e => set('_additionalPhonesRaw', e.target.value)} placeholder="+1 (555) 000-0000" />
          </div>

          {/* ── Home Address ── */}
          <div><label className={label}>Street Address</label><input className={input} value={form.street_address} onChange={e => set('street_address', e.target.value)} placeholder="123 Main St" /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={label}>City</label><input className={input} value={form.city} onChange={e => set('city', e.target.value)} placeholder="City" /></div>
            <div><label className={label}>State</label><input className={input} value={form.state} onChange={e => set('state', e.target.value)} placeholder="CA" maxLength={2} /></div>
            <div><label className={label}>Zip</label><input className={input} value={form.zip} onChange={e => set('zip', e.target.value)} placeholder="90210" /></div>
          </div>

          {/* ── Date of Birth ── */}
          <div><label className={label}>Date of Birth</label><input className={input} type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} /></div>

          {/* ── Assignment ── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Assigned To</label>
              <select className={input} value={form.ghl_assigned_to} onChange={e => set('ghl_assigned_to', e.target.value)}>
                <option value="">— Unassigned —</option>
                {assignees.map(e => (
                  <option key={e.id} value={`${e.first_name} ${e.last_name}`}>
                    {e.first_name} {e.last_name}{e.job_title ? ` — ${e.job_title}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Consultation Type</label>
              <select className={input} value={form.consultation_type} onChange={e => set('consultation_type', e.target.value)}>
                <option value="">— None —</option>
                <option value="Design">Design</option>
                <option value="Estimate">Estimate</option>
              </select>
            </div>
          </div>
          <div>
            <label className={label}>Stage</label>
            <select className={input} value={form.stage} onChange={e => set('stage', e.target.value)}>
              {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div><label className={label}>Notes</label><textarea className={input + ' resize-none'} rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Internal notes…" /></div>
          <div><label className={label}>Project Description</label><textarea className={input + ' resize-none'} rows={3} value={form.project_description} onChange={e => set('project_description', e.target.value)} placeholder="Describe the project or work needed…" /></div>

          {/* Marketing */}
          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wide">Marketing</p>
            <div className="space-y-3">
              <div>
                <label className={label}>Contact Type</label>
                <select className={input} value={form.contact_type} onChange={e => set('contact_type', e.target.value)}>
                  <option value="">— None —</option>
                  <option value="Residential">Residential</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Public Works">Public Works</option>
                </select>
              </div>
              <div><label className={label}>Source Type</label><input className={input} value={form.source} onChange={e => set('source', e.target.value)} placeholder="e.g. Google, Referral…" /></div>
              <div><label className={label}>Campaign</label><input className={input} value={form.campaign} onChange={e => set('campaign', e.target.value)} placeholder="e.g. Spring Promo, Google Ads…" /></div>
              <div><label className={label}>Source Origin</label><input className={input} value={form.how_did_you_hear} onChange={e => set('how_did_you_hear', e.target.value)} placeholder="How did they hear about us?" /></div>
              {[
                { key: 'interest_1', fieldLabel: 'Interested In #1' },
                { key: 'interest_2', fieldLabel: 'Interested In #2' },
                { key: 'interest_3', fieldLabel: 'Interested In #3' },
              ].map(({ key, fieldLabel }) => (
                <div key={key}>
                  <label className={label}>{fieldLabel}</label>
                  <select className={input} value={form[key]} onChange={e => set(key, e.target.value)}>
                    <option value="">— None —</option>
                    {PROJECT_TYPES.map(pt => <option key={pt} value={pt}>{pt}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-3 border-t border-gray-100">
            <label className={label}>Call Center Notes</label>
            <textarea className={input + ' resize-none'} rows={3} value={form.call_center_notes} onChange={e => set('call_center_notes', e.target.value)} placeholder="Notes from call center…" />
          </div>
        </div>

        {saveError && (
          <div className="mt-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
            {saveError}
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || (!form.last_name.trim() && !form.first_name.trim())}
            className="flex-1 py-2 rounded-lg bg-green-700 text-white text-sm font-semibold hover:bg-green-800 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Add Contact'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Add Company Modal ─────────────────────────────────────────────────────────
function CompanyContactRow({ contact, onChange, onRemove, inp, lbl }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div><label className={lbl}>First Name</label><input className={inp} value={contact.first_name || ''} onChange={e => onChange({ ...contact, first_name: e.target.value })} placeholder="First" /></div>
        <div><label className={lbl}>Last Name</label><input className={inp} value={contact.last_name || ''} onChange={e => onChange({ ...contact, last_name: e.target.value })} placeholder="Last" /></div>
      </div>
      <div><label className={lbl}>Position / Title</label><input className={inp} value={contact.position || ''} onChange={e => onChange({ ...contact, position: e.target.value })} placeholder="e.g. Project Manager" /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className={lbl}>Phone</label><input className={inp} value={contact.phone || ''} onChange={e => onChange({ ...contact, phone: e.target.value })} placeholder="(555) 000-0000" /></div>
        <div><label className={lbl}>Email</label><input className={inp} value={contact.email || ''} onChange={e => onChange({ ...contact, email: e.target.value })} placeholder="email@example.com" /></div>
      </div>
      <button type="button" onClick={onRemove} className="text-xs text-red-500 hover:text-red-700">Remove contact</button>
    </div>
  )
}

function AddCompanyModal({ onSave, onClose }) {
  const [form, setForm] = useState(EMPTY_COMPANY_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const input = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600'
  const label = 'block text-xs font-semibold text-gray-500 mb-1'

  function addCompanyContact() {
    set('company_contacts', [...form.company_contacts, { first_name: '', last_name: '', position: '', phone: '', email: '' }])
  }
  function updateCompanyContact(i, val) {
    const arr = [...form.company_contacts]
    arr[i] = val
    set('company_contacts', arr)
  }
  function removeCompanyContact(i) {
    set('company_contacts', form.company_contacts.filter((_, idx) => idx !== i))
  }

  async function handleSave() {
    if (!form.company_name.trim()) return
    setSaving(true)
    setSaveError(null)
    const { data, error } = await supabase
      .from('companies')
      .insert({
        company_name:    form.company_name.trim(),
        company_street:  form.company_street.trim() || null,
        company_city:    form.company_city.trim() || null,
        company_state:   form.company_state.trim() || null,
        company_zip:     form.company_zip.trim() || null,
        phone:           form.phone.trim() || null,
        email:           form.email.trim() || null,
        website:         form.website.trim() || null,
        stage:           form.stage || 'new_lead',
        contact_type:    form.contact_type || null,
        source:          form.source.trim() || null,
        campaign:        form.campaign.trim() || null,
        how_did_you_hear: form.how_did_you_hear.trim() || null,
        ghl_assigned_to: form.ghl_assigned_to.trim() || null,
        notes:           form.notes.trim() || null,
        project_description: form.project_description.trim() || null,
        call_center_notes:   form.call_center_notes.trim() || null,
        company_contacts: form.company_contacts.filter(c => c.first_name || c.last_name || c.email || c.phone),
      })
      .select()
      .single()
    setSaving(false)
    if (error) { setSaveError(error.message); return }
    if (data) onSave(data)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">New Company Contact</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="space-y-3">
          {/* ── Company Name ── */}
          <div><label className={label}>Company Name <span className="text-red-400">*</span></label><input className={input} value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="Company name" autoFocus /></div>

          {/* ── Company Address ── */}
          <div className="border border-gray-200 rounded-xl p-3 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 mb-2">Company Address</p>
            <div className="space-y-2">
              <input className={input} value={form.company_street} onChange={e => set('company_street', e.target.value)} placeholder="Street Address" />
              <div className="grid grid-cols-3 gap-2">
                <input className={input} value={form.company_city} onChange={e => set('company_city', e.target.value)} placeholder="City" />
                <input className={input} value={form.company_state} onChange={e => set('company_state', e.target.value)} placeholder="ST" maxLength={2} />
                <input className={input} value={form.company_zip} onChange={e => set('company_zip', e.target.value)} placeholder="Zip" />
              </div>
            </div>
          </div>

          {/* ── Main Contact Info ── */}
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Main Phone</label><input className={input} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 000-0000" /></div>
            <div><label className={label}>Main Email</label><input className={input} value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" type="email" /></div>
          </div>
          <div><label className={label}>Website</label><input className={input} value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://example.com" /></div>

          {/* ── Company Contacts ── */}
          <div className="border border-gray-200 rounded-xl p-3 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500">Company Contacts</p>
              <button type="button" onClick={addCompanyContact} className="text-xs font-semibold text-green-700 hover:text-green-900">+ Add Person</button>
            </div>
            {form.company_contacts.length === 0
              ? <p className="text-xs text-gray-400 italic">No contacts added yet.</p>
              : <div className="space-y-2">
                  {form.company_contacts.map((c, i) => (
                    <CompanyContactRow key={i} contact={c}
                      onChange={val => updateCompanyContact(i, val)}
                      onRemove={() => removeCompanyContact(i)}
                      inp={input} lbl={label}
                    />
                  ))}
                </div>
            }
          </div>

          {/* ── Assignment ── */}
          <div>
            <label className={label}>Assigned To</label>
            <select className={input} value={form.ghl_assigned_to} onChange={e => set('ghl_assigned_to', e.target.value)}>
              <option value="">— Unassigned —</option>
              {assignees.map(e => (
                <option key={e.id} value={`${e.first_name} ${e.last_name}`}>
                  {e.first_name} {e.last_name}{e.job_title ? ` — ${e.job_title}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* ── Stage ── */}
          <div>
            <label className={label}>Stage</label>
            <select className={input} value={form.stage} onChange={e => set('stage', e.target.value)}>
              {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          <div><label className={label}>Notes</label><textarea className={input + ' resize-none'} rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Internal notes…" /></div>
          <div><label className={label}>Project Description</label><textarea className={input + ' resize-none'} rows={3} value={form.project_description} onChange={e => set('project_description', e.target.value)} placeholder="Describe the project or work needed…" /></div>

          {/* ── Marketing ── */}
          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wide">Marketing</p>
            <div className="space-y-3">
              <div>
                <label className={label}>Contact Type</label>
                <select className={input} value={form.contact_type} onChange={e => set('contact_type', e.target.value)}>
                  <option value="">— None —</option>
                  <option value="Residential">Residential</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Public Works">Public Works</option>
                </select>
              </div>
              <div><label className={label}>Source Type</label><input className={input} value={form.source} onChange={e => set('source', e.target.value)} placeholder="e.g. Google, Referral…" /></div>
              <div><label className={label}>Campaign</label><input className={input} value={form.campaign} onChange={e => set('campaign', e.target.value)} placeholder="e.g. Spring Promo, Google Ads…" /></div>
              <div><label className={label}>Source Origin</label><input className={input} value={form.how_did_you_hear} onChange={e => set('how_did_you_hear', e.target.value)} placeholder="How did they hear about us?" /></div>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100">
            <label className={label}>Call Center Notes</label>
            <textarea className={input + ' resize-none'} rows={3} value={form.call_center_notes} onChange={e => set('call_center_notes', e.target.value)} placeholder="Notes from call center…" />
          </div>
        </div>

        {saveError && (
          <div className="mt-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
            {saveError}
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !form.company_name.trim()}
            className="flex-1 py-2 rounded-lg bg-green-700 text-white text-sm font-semibold hover:bg-green-800 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Add Company'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Contacts List ────────────────────────────────────────────────────────
export default function Contacts() {
  const navigate = useNavigate()
  const PAGE_SIZE = 50

  const [activeTab,   setActiveTab]   = useState('individuals') // 'individuals' | 'companies' | 'settings'
  const [settingsSubTab, setSettingsSubTab] = useState('import') // 'import' | 'export'

  // ── Individuals state ──
  const [contacts,    setContacts]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)

  // ── Companies state ──
  const [companies,        setCompanies]        = useState([])
  const [companiesLoading, setCompaniesLoading] = useState(true)
  const [companiesError,   setCompaniesError]   = useState(null)

  const [search,      setSearch]      = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  // Mobile-only filter modal — replaces the inline pill row on phones.
  const [showMobileFilter, setShowMobileFilter] = useState(false)
  const [showAdd,     setShowAdd]     = useState(false)
  const [sortField,   setSortField]   = useState('last_name')
  const [sortAsc,     setSortAsc]     = useState(true)
  const [page,        setPage]        = useState(0)
  const [assignees,   setAssignees]   = useState([])

  async function fetchContacts() {
    setLoading(true)
    // Fetch in pages of 1000 to bypass Supabase's default row cap
    let all = []
    let from = 0
    const BATCH = 1000
    while (true) {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('last_name', { ascending: true })
        .order('first_name', { ascending: true })
        .range(from, from + BATCH - 1)
      if (error) { setError(error.message); break }
      all = [...all, ...(data || [])]
      if (!data || data.length < BATCH) break
      from += BATCH
    }
    setContacts(all)
    setLoading(false)
  }

  async function fetchCompanies() {
    setCompaniesLoading(true)
    let all = []
    let from = 0
    const BATCH = 1000
    while (true) {
      const { data, error } = await supabase
        .from('companies')
        .select('id,company_name,company_city,company_state,phone,email,stage,contact_type,ghl_assigned_to,created_at')
        .order('company_name', { ascending: true })
        .range(from, from + BATCH - 1)
      if (error) { setCompaniesError(error.message); break }
      all = [...all, ...(data || [])]
      if (!data || data.length < BATCH) break
      from += BATCH
    }
    setCompanies(all)
    setCompaniesLoading(false)
  }

  useEffect(() => {
    fetchContacts()
    fetchCompanies()
    fetchAssignableEmployees().then(setAssignees)
  }, [])

  // Reset to first page when filters change
  useEffect(() => { setPage(0) }, [search, stageFilter, activeTab])

  // Filter + sort
  const q = search.toLowerCase()
  const filtered = contacts
    .filter(c => {
      if (stageFilter !== 'all' && c.stage !== stageFilter) return false
      if (!q) return true
      return (
        `${c.last_name} ${c.first_name}`.toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        (c.cell || '').toLowerCase().includes(q) ||
        (c.city || '').toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      let av = a[sortField] || '', bv = b[sortField] || ''
      return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av)
    })

  const filteredCompanies = companies
    .filter(c => {
      if (stageFilter !== 'all' && c.stage !== stageFilter) return false
      if (!q) return true
      return (
        (c.company_name || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        (c.company_city || '').toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      const sf = sortField === 'last_name' ? 'company_name' : sortField
      let av = a[sf] || '', bv = b[sf] || ''
      return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av)
    })

  function toggleSort(field) {
    if (sortField === field) setSortAsc(v => !v)
    else { setSortField(field); setSortAsc(true) }
  }

  const activeList  = activeTab === 'individuals' ? filtered : filteredCompanies
  const totalPages  = Math.ceil(activeList.length / PAGE_SIZE)
  const paginated   = activeList.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const rangeStart  = activeList.length === 0 ? 0 : page * PAGE_SIZE + 1
  const rangeEnd    = Math.min((page + 1) * PAGE_SIZE, activeList.length)

  const thCls = 'text-left px-4 py-2 font-semibold text-gray-600 uppercase cursor-pointer select-none hover:text-gray-800 transition-colors'
  const arrow = field => sortField === field ? (sortAsc ? ' ↑' : ' ↓') : ''

  const isIndividuals = activeTab === 'individuals'

  return (
    <div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0 gap-3">
        <h1 className="text-xl font-bold text-gray-900">Contacts</h1>
        <div className="flex items-center gap-2">
          {/* Filter — mobile-only entry to the new filter modal. */}
          <button
            onClick={() => setShowMobileFilter(true)}
            className="sm:hidden px-3 py-2 border border-gray-200 text-sm font-medium text-gray-700 rounded-lg flex items-center gap-1.5"
          >
            🔎 Filter
            {stageFilter !== 'all' && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-700 text-white text-[10px] font-bold">1</span>
            )}
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="hidden sm:flex px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-800 transition-colors"
          >
            + {isIndividuals ? 'Add Contact' : 'Add Company'}
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 flex gap-0 flex-shrink-0">
        {[
          { id: 'individuals', label: `👤 Individuals (${contacts.length.toLocaleString()})` },
          { id: 'companies',   label: `🏢 Companies (${companies.length.toLocaleString()})` },
          { id: 'settings',    label: '⚙️ Settings' },
        ].map(tab => (
          <button key={tab.id} type="button"
            onClick={() => { setActiveTab(tab.id); setSearch(''); setStageFilter('all') }}
            className={`flex items-center gap-1.5 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-green-700 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >{tab.label}</button>
        ))}
      </div>

      {/* Settings panel */}
      {activeTab === 'settings' && (
        <div className="-mx-6 mt-6">
          <div className="flex border-b border-gray-200 bg-white px-6 flex-nowrap overflow-x-auto flex-shrink-0">
            {[
              { id: 'import', label: '⬆ Import' },
              { id: 'export', label: '⬇ Export' },
            ].map(t => (
              <button key={t.id} type="button"
                onClick={() => setSettingsSubTab(t.id)}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                  settingsSubTab === t.id
                    ? 'border-green-700 text-green-800'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >{t.label}</button>
            ))}
          </div>
          <div className="bg-gray-50 px-6 py-6">
            {settingsSubTab === 'import' && (
              <div className="max-w-2xl">
                <ImportModal
                  inline
                  onDone={() => { fetchContacts(); fetchCompanies() }}
                  onClose={null}
                />
              </div>
            )}

            {settingsSubTab === 'export' && (
              <div className="max-w-lg">
                <ExportModal
                  inline
                  contacts={contacts}
                  onClose={null}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab !== 'settings' && <>
      {/* Mobile: full-width Add button sits directly above the search field. */}
      <button
        onClick={() => setShowAdd(true)}
        className="sm:hidden w-full mb-3 mt-4 py-2.5 bg-green-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
      >
        + {isIndividuals ? 'Add Contact' : 'Add Company'}
      </button>

      {/* Stage filter pills — desktop only; mobile uses the Filter modal */}
      <div className="hidden sm:flex flex-wrap gap-2 mb-4 mt-4">
        <button
          onClick={() => setStageFilter('all')}
          className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${stageFilter === 'all' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
        >
          All
        </button>
        {STAGES.map(s => {
          const src = isIndividuals ? contacts : companies
          return (
            <button
              key={s.value}
              onClick={() => setStageFilter(stageFilter === s.value ? 'all' : s.value)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${stageFilter === s.value ? s.cls + ' ring-2 ring-offset-1 ring-current' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}
            >
              {s.label}
              <span className="ml-1.5 opacity-60">{src.filter(c => c.stage === s.value).length}</span>
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={isIndividuals ? 'Search name, email, phone, city…' : 'Search company name, email, phone, city…'}
          className="w-full max-w-md border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600"
        />
      </div>

      {/* Table */}
      {isIndividuals ? (
        loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">Loading…</div>
        ) : error ? (
          <div className="text-red-500 text-sm py-8 text-center">{error}</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-xs min-w-[900px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className={`${thCls} sticky left-0 bg-gray-50 z-10 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]`} onClick={() => toggleSort('last_name')}>Name{arrow('last_name')}</th>
                  <th className={thCls} onClick={() => toggleSort('ghl_assigned_to')}>Assigned To{arrow('ghl_assigned_to')}</th>
                  <th className={thCls}>Phone</th>
                  <th className={thCls}>Cell</th>
                  <th className={thCls}>Email</th>
                  <th className={thCls} onClick={() => toggleSort('street_address')}>Address{arrow('street_address')}</th>
                  <th className={thCls} onClick={() => toggleSort('city')}>City / State{arrow('city')}</th>
                  <th className={thCls} onClick={() => toggleSort('stage')}>Stage{arrow('stage')}</th>
                  <th className={thCls} onClick={() => toggleSort('created_at')}>Created{arrow('created_at')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                      {search || stageFilter !== 'all' ? 'No contacts match your filters.' : 'No contacts yet — add your first one.'}
                    </td>
                  </tr>
                ) : paginated.map(c => (
                  <tr key={c.id} className="group hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2 sticky left-0 bg-white group-hover:bg-gray-50 z-10 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                      <button
                        onClick={() => navigate(`/contacts/${c.id}`)}
                        className="font-semibold text-green-700 hover:text-green-900 hover:underline text-left"
                      >
                        {c.last_name}{c.first_name ? `, ${c.first_name}` : ''}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-gray-600">{c.ghl_assigned_to || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-2 text-gray-600">
                      {c.phone
                        ? <a href={`tel:${c.phone}`} className="hover:text-green-700">{c.phone}</a>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {c.cell
                        ? <a href={`tel:${c.cell}`} className="hover:text-green-700">{c.cell}</a>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {c.email
                        ? <a href={`mailto:${c.email}`} className="hover:text-green-700 truncate max-w-[180px] block">{c.email}</a>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{c.street_address || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-2 text-gray-600">
                      {[c.city, c.state].filter(Boolean).join(', ') || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2">
                      {stageMap[c.stage] ? (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${stageMap[c.stage].cls}`}>
                          {stageMap[c.stage].label}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2 text-gray-400 whitespace-nowrap">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        companiesLoading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">Loading…</div>
        ) : companiesError ? (
          <div className="text-red-500 text-sm py-8 text-center">{companiesError}</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-xs min-w-[700px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className={`${thCls} sticky left-0 bg-gray-50 z-10 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]`} onClick={() => toggleSort('company_name')}>Company Name{arrow('company_name')}</th>
                  <th className={thCls} onClick={() => toggleSort('ghl_assigned_to')}>Assigned To{arrow('ghl_assigned_to')}</th>
                  <th className={thCls}>Phone</th>
                  <th className={thCls}>Email</th>
                  <th className={thCls} onClick={() => toggleSort('company_city')}>City / State{arrow('company_city')}</th>
                  <th className={thCls} onClick={() => toggleSort('stage')}>Stage{arrow('stage')}</th>
                  <th className={thCls} onClick={() => toggleSort('created_at')}>Created{arrow('created_at')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCompanies.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                      {search || stageFilter !== 'all' ? 'No companies match your filters.' : 'No companies yet — add your first one.'}
                    </td>
                  </tr>
                ) : paginated.map(c => (
                  <tr key={c.id} className="group hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2 sticky left-0 bg-white group-hover:bg-gray-50 z-10 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                      <button
                        onClick={() => navigate(`/companies/${c.id}`)}
                        className="font-semibold text-green-700 hover:text-green-900 hover:underline text-left"
                      >
                        {c.company_name}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-gray-600">{c.ghl_assigned_to || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-2 text-gray-600">
                      {c.phone
                        ? <a href={`tel:${c.phone}`} className="hover:text-green-700">{c.phone}</a>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {c.email
                        ? <a href={`mailto:${c.email}`} className="hover:text-green-700 truncate max-w-[180px] block">{c.email}</a>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {[c.company_city, c.company_state].filter(Boolean).join(', ') || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2">
                      {stageMap[c.stage] ? (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${stageMap[c.stage].cls}`}>
                          {stageMap[c.stage].label}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2 text-gray-400 whitespace-nowrap">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Pagination */}
      {activeList.length > 0 && (
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-gray-400">
            {rangeStart}–{rangeEnd} of {activeList.length.toLocaleString()} {isIndividuals ? 'contact' : 'compan'}{isIndividuals ? (activeList.length !== 1 ? 's' : '') : (activeList.length !== 1 ? 'ies' : 'y')}
            {isIndividuals && contacts.length !== filtered.length && ` (${contacts.length.toLocaleString()} total)`}
            {!isIndividuals && companies.length !== filteredCompanies.length && ` (${companies.length.toLocaleString()} total)`}
          </p>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              {/* First */}
              <button
                onClick={() => setPage(0)}
                disabled={page === 0}
                className="px-2 py-1 rounded text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-default"
                title="First page"
              >«</button>

              {/* Prev */}
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-2 py-1 rounded text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-default"
              >‹ Prev</button>

              {/* Page number pills */}
              {(() => {
                const pages = []
                const delta = 2
                const left  = Math.max(0, page - delta)
                const right = Math.min(totalPages - 1, page + delta)
                if (left > 0)  pages.push(0, left > 1 ? '…' : null)
                for (let i = left; i <= right; i++) pages.push(i)
                if (right < totalPages - 1) pages.push(right < totalPages - 2 ? '…' : null, totalPages - 1)
                return pages.filter((v, i, a) => v !== null && a.indexOf(v) === i).map((p, i) =>
                  p === '…'
                    ? <span key={`ellipsis-${i}`} className="px-1 text-xs text-gray-300">…</span>
                    : <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                          page === p
                            ? 'bg-green-700 text-white'
                            : 'text-gray-500 hover:bg-gray-100'
                        }`}
                      >{p + 1}</button>
                )
              })()}

              {/* Next */}
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-2 py-1 rounded text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-default"
              >Next ›</button>

              {/* Last */}
              <button
                onClick={() => setPage(totalPages - 1)}
                disabled={page >= totalPages - 1}
                className="px-2 py-1 rounded text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-default"
                title="Last page"
              >»</button>
            </div>
          )}
        </div>
      )}

      {showAdd && isIndividuals && (
        <AddContactModal
          onSave={c => { setContacts(p => [c, ...p]); setShowAdd(false) }}
          onClose={() => setShowAdd(false)}
        />
      )}

      {showAdd && !isIndividuals && (
        <AddCompanyModal
          onSave={c => { setCompanies(p => [c, ...p]); setShowAdd(false) }}
          onClose={() => setShowAdd(false)}
        />
      )}


      {/* Mobile filter modal — picks the stage filter and closes. */}
      {showMobileFilter && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-start sm:items-center justify-center p-4 pt-16 sm:pt-4 sm:hidden"
          onClick={() => setShowMobileFilter(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-800">Filter contacts</h2>
              <button onClick={() => setShowMobileFilter(false)} className="text-gray-400 text-xl leading-none px-1">✕</button>
            </div>
            <div className="p-3 space-y-2 max-h-[60vh] overflow-y-auto">
              <button
                onClick={() => { setStageFilter('all'); setShowMobileFilter(false) }}
                className={`w-full flex items-center justify-between px-3 py-3 rounded-lg border text-sm font-semibold transition-colors ${stageFilter === 'all' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-700 border-gray-200'}`}
              >
                <span>All {isIndividuals ? 'contacts' : 'companies'}</span>
                <span className="text-xs opacity-70">{isIndividuals ? contacts.length : companies.length}</span>
              </button>
              {STAGES.map(s => {
                const src = isIndividuals ? contacts : companies
                return (
                  <button
                    key={s.value}
                    onClick={() => { setStageFilter(s.value); setShowMobileFilter(false) }}
                    className={`w-full flex items-center justify-between px-3 py-3 rounded-lg border text-sm font-semibold transition-colors ${stageFilter === s.value ? s.cls + ' ring-2 ring-current' : 'bg-white text-gray-600 border-gray-200'}`}
                  >
                    <span>{s.label}</span>
                    <span className="text-xs opacity-60">{src.filter(c => c.stage === s.value).length}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
      </>}
    </div>
  )
}
