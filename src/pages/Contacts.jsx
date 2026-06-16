import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ExportModal, ImportModal } from '../components/ContactImportExport'
import { fetchAssignableEmployees } from '../lib/assignableEmployees'

// ── Stage config ──────────────────────────────────────────────────────────────
const STAGES = [
  { value: 'new_lead', label: 'New Lead', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'warm_lead', label: 'Warm Lead', cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  {
    value: 'consultation',
    label: 'Consultation',
    cls: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  { value: 'quoted', label: 'Quoted', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  { value: 'won', label: 'Won', cls: 'bg-green-50 text-green-700 border-green-200' },
  { value: 'lost', label: 'Lost', cls: 'bg-red-50 text-red-600 border-red-200' },
  { value: 'nurture', label: 'Nurture', cls: 'bg-teal-50 text-teal-700 border-teal-200' },
  { value: 'bt_import', label: 'BT Import', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'ghl_import', label: 'GHL Import', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
]
const stageMap = Object.fromEntries(STAGES.map(s => [s.value, s]))

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  secondary_first_name: '',
  secondary_last_name: '',
  phone: '',
  cell: '',
  email: '',
  _additionalEmailsRaw: '',
  _additionalPhonesRaw: '',
  street_address: '',
  city: '',
  state: '',
  zip: '',
  ghl_assigned_to: '',
  consultation_type: '',
  date_of_birth: '',
  notes: '',
  project_description: '',
  stage: 'new_lead',
  contact_type: 'Residential',
  source: '',
  campaign: '',
  how_did_you_hear: '',
  interest_1: '',
  interest_2: '',
  interest_3: '',
  call_center_notes: '',
}

const PROJECT_TYPES = [
  'Artificial Turf',
  'Concrete',
  'Columns',
  'Demo/Excavation',
  'Drainage',
  'Finishes',
  'Fire Pit',
  'Ground Treatments',
  'Irrigation',
  'Lighting',
  'Outdoor Kitchen/BBQ',
  'Pavers',
  'Planting/Landscaping',
  'Pool',
  'Retaining Walls',
  'Steps',
  'Utilities',
  'Other',
]

const EMPTY_COMPANY_FORM = {
  company_name: '',
  company_street: '',
  company_city: '',
  company_state: '',
  company_zip: '',
  phone: '',
  email: '',
  website: '',
  ghl_assigned_to: '',
  stage: 'new_lead',
  contact_type: 'Residential',
  source: '',
  campaign: '',
  how_did_you_hear: '',
  notes: '',
  project_description: '',
  call_center_notes: '',
  company_contacts: [],
}

// ── Add Individual Contact Modal ──────────────────────────────────────────────
function AddContactModal({ onSave, onClose, assignees = [] }) {
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
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        secondary_first_name: form.secondary_first_name.trim() || null,
        secondary_last_name: form.secondary_last_name.trim() || null,
        phone: form.phone.trim() || null,
        cell: form.cell.trim() || null,
        email: form.email.trim() || null,
        additional_emails: form._additionalEmailsRaw
          ? form._additionalEmailsRaw
              .split(/[\n,]+/)
              .map(e => e.trim())
              .filter(Boolean)
          : null,
        additional_phones: form._additionalPhonesRaw
          ? form._additionalPhonesRaw
              .split(/[\n,]+/)
              .map(p => p.trim())
              .filter(Boolean)
          : null,
        street_address: form.street_address.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        zip: form.zip.trim() || null,
        ghl_assigned_to: form.ghl_assigned_to.trim() || null,
        consultation_type: form.consultation_type || null,
        stage: form.stage,
        contact_type: form.contact_type || null,
        source: form.source.trim() || null,
        campaign: form.campaign.trim() || null,
        how_did_you_hear: form.how_did_you_hear.trim() || null,
        date_of_birth: form.date_of_birth || null,
        notes: form.notes.trim() || null,
        project_description: form.project_description.trim() || null,
        interest_1: form.interest_1 || null,
        interest_2: form.interest_2 || null,
        interest_3: form.interest_3 || null,
        call_center_notes: form.call_center_notes.trim() || null,
      })
      .select()
      .single()
    setSaving(false)
    if (error) {
      setSaveError(error.message)
      return
    }
    if (data) onSave(data)
  }

  const input =
    'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600'
  const label = 'block text-xs font-semibold text-gray-500 mb-1'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">New Individual Contact</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
            ✕
          </button>
        </div>

        <div className="space-y-3">
          {/* ── Name ── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>First Name</label>
              <input
                className={input}
                value={form.first_name}
                onChange={e => set('first_name', e.target.value)}
                placeholder="First"
                autoFocus
              />
            </div>
            <div>
              <label className={label}>
                Last Name <span className="text-red-400">*</span>
              </label>
              <input
                className={input}
                value={form.last_name}
                onChange={e => set('last_name', e.target.value)}
                placeholder="Last"
              />
            </div>
          </div>

          {/* ── Spouse / Partner ── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Spouse / Partner First</label>
              <input
                className={input}
                value={form.secondary_first_name}
                onChange={e => set('secondary_first_name', e.target.value)}
                placeholder="First"
              />
            </div>
            <div>
              <label className={label}>Spouse / Partner Last</label>
              <input
                className={input}
                value={form.secondary_last_name}
                onChange={e => set('secondary_last_name', e.target.value)}
                placeholder="Last"
              />
            </div>
          </div>

          {/* ── Contact Info ── */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={label}>Phone</label>
              <input
                className={input}
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="(555) 000-0000"
              />
            </div>
            <div>
              <label className={label}>Cell</label>
              <input
                className={input}
                value={form.cell}
                onChange={e => set('cell', e.target.value)}
                placeholder="(555) 000-0000"
              />
            </div>
            <div>
              <label className={label}>Email</label>
              <input
                className={input}
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="email@example.com"
                type="email"
              />
            </div>
          </div>
          <div>
            <label className={label}>
              Additional Emails <span className="font-normal text-gray-400">(one per line)</span>
            </label>
            <textarea
              className={input + ' resize-none'}
              rows={2}
              value={form._additionalEmailsRaw}
              onChange={e => set('_additionalEmailsRaw', e.target.value)}
              placeholder="extra@email.com"
            />
          </div>
          <div>
            <label className={label}>
              Additional Phones <span className="font-normal text-gray-400">(one per line)</span>
            </label>
            <textarea
              className={input + ' resize-none'}
              rows={2}
              value={form._additionalPhonesRaw}
              onChange={e => set('_additionalPhonesRaw', e.target.value)}
              placeholder="+1 (555) 000-0000"
            />
          </div>

          {/* ── Home Address ── */}
          <div>
            <label className={label}>Street Address</label>
            <input
              className={input}
              value={form.street_address}
              onChange={e => set('street_address', e.target.value)}
              placeholder="123 Main St"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={label}>City</label>
              <input
                className={input}
                value={form.city}
                onChange={e => set('city', e.target.value)}
                placeholder="City"
              />
            </div>
            <div>
              <label className={label}>State</label>
              <input
                className={input}
                value={form.state}
                onChange={e => set('state', e.target.value)}
                placeholder="CA"
                maxLength={2}
              />
            </div>
            <div>
              <label className={label}>Zip</label>
              <input
                className={input}
                value={form.zip}
                onChange={e => set('zip', e.target.value)}
                placeholder="90210"
              />
            </div>
          </div>

          {/* ── Date of Birth ── */}
          <div>
            <label className={label}>Date of Birth</label>
            <input
              className={input}
              type="date"
              value={form.date_of_birth}
              onChange={e => set('date_of_birth', e.target.value)}
            />
          </div>

          {/* ── Assignment ── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Assigned To</label>
              <select
                className={input}
                value={form.ghl_assigned_to}
                onChange={e => set('ghl_assigned_to', e.target.value)}
              >
                <option value="">— Unassigned —</option>
                {assignees.map(e => (
                  <option key={e.id} value={`${e.first_name} ${e.last_name}`}>
                    {e.first_name} {e.last_name}
                    {e.job_title ? ` — ${e.job_title}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Consultation Type</label>
              <select
                className={input}
                value={form.consultation_type}
                onChange={e => set('consultation_type', e.target.value)}
              >
                <option value="">— None —</option>
                <option value="Design">Design</option>
                <option value="Estimate">Estimate</option>
              </select>
            </div>
          </div>
          <div>
            <label className={label}>Stage</label>
            <select
              className={input}
              value={form.stage}
              onChange={e => set('stage', e.target.value)}
            >
              {STAGES.map(s => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Notes</label>
            <textarea
              className={input + ' resize-none'}
              rows={3}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Internal notes…"
            />
          </div>
          <div>
            <label className={label}>Project Description</label>
            <textarea
              className={input + ' resize-none'}
              rows={3}
              value={form.project_description}
              onChange={e => set('project_description', e.target.value)}
              placeholder="Describe the project or work needed…"
            />
          </div>

          {/* Marketing */}
          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wide">
              Marketing
            </p>
            <div className="space-y-3">
              <div>
                <label className={label}>Contact Type</label>
                <select
                  className={input}
                  value={form.contact_type}
                  onChange={e => set('contact_type', e.target.value)}
                >
                  <option value="">— None —</option>
                  <option value="Residential">Residential</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Public Works">Public Works</option>
                </select>
              </div>
              <div>
                <label className={label}>Source Type</label>
                <input
                  className={input}
                  value={form.source}
                  onChange={e => set('source', e.target.value)}
                  placeholder="e.g. Google, Referral…"
                />
              </div>
              <div>
                <label className={label}>Campaign</label>
                <input
                  className={input}
                  value={form.campaign}
                  onChange={e => set('campaign', e.target.value)}
                  placeholder="e.g. Spring Promo, Google Ads…"
                />
              </div>
              <div>
                <label className={label}>Source Origin</label>
                <input
                  className={input}
                  value={form.how_did_you_hear}
                  onChange={e => set('how_did_you_hear', e.target.value)}
                  placeholder="How did they hear about us?"
                />
              </div>
              {[
                { key: 'interest_1', fieldLabel: 'Interested In #1' },
                { key: 'interest_2', fieldLabel: 'Interested In #2' },
                { key: 'interest_3', fieldLabel: 'Interested In #3' },
              ].map(({ key, fieldLabel }) => (
                <div key={key}>
                  <label className={label}>{fieldLabel}</label>
                  <select
                    className={input}
                    value={form[key]}
                    onChange={e => set(key, e.target.value)}
                  >
                    <option value="">— None —</option>
                    {PROJECT_TYPES.map(pt => (
                      <option key={pt} value={pt}>
                        {pt}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-3 border-t border-gray-100">
            <label className={label}>Call Center Notes</label>
            <textarea
              className={input + ' resize-none'}
              rows={3}
              value={form.call_center_notes}
              onChange={e => set('call_center_notes', e.target.value)}
              placeholder="Notes from call center…"
            />
          </div>
        </div>

        {saveError && (
          <div className="mt-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
            {saveError}
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
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
        <div>
          <label className={lbl}>First Name</label>
          <input
            className={inp}
            value={contact.first_name || ''}
            onChange={e => onChange({ ...contact, first_name: e.target.value })}
            placeholder="First"
          />
        </div>
        <div>
          <label className={lbl}>Last Name</label>
          <input
            className={inp}
            value={contact.last_name || ''}
            onChange={e => onChange({ ...contact, last_name: e.target.value })}
            placeholder="Last"
          />
        </div>
      </div>
      <div>
        <label className={lbl}>Position / Title</label>
        <input
          className={inp}
          value={contact.position || ''}
          onChange={e => onChange({ ...contact, position: e.target.value })}
          placeholder="e.g. Project Manager"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={lbl}>Phone</label>
          <input
            className={inp}
            value={contact.phone || ''}
            onChange={e => onChange({ ...contact, phone: e.target.value })}
            placeholder="(555) 000-0000"
          />
        </div>
        <div>
          <label className={lbl}>Email</label>
          <input
            className={inp}
            value={contact.email || ''}
            onChange={e => onChange({ ...contact, email: e.target.value })}
            placeholder="email@example.com"
          />
        </div>
      </div>
      <button type="button" onClick={onRemove} className="text-xs text-red-500 hover:text-red-700">
        Remove contact
      </button>
    </div>
  )
}

function AddCompanyModal({ onSave, onClose, assignees = [] }) {
  const [form, setForm] = useState(EMPTY_COMPANY_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const input =
    'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600'
  const label = 'block text-xs font-semibold text-gray-500 mb-1'

  function addCompanyContact() {
    set('company_contacts', [
      ...form.company_contacts,
      { first_name: '', last_name: '', position: '', phone: '', email: '' },
    ])
  }
  function updateCompanyContact(i, val) {
    const arr = [...form.company_contacts]
    arr[i] = val
    set('company_contacts', arr)
  }
  function removeCompanyContact(i) {
    set(
      'company_contacts',
      form.company_contacts.filter((_, idx) => idx !== i)
    )
  }

  async function handleSave() {
    if (!form.company_name.trim()) return
    setSaving(true)
    setSaveError(null)
    const { data, error } = await supabase
      .from('companies')
      .insert({
        company_name: form.company_name.trim(),
        company_street: form.company_street.trim() || null,
        company_city: form.company_city.trim() || null,
        company_state: form.company_state.trim() || null,
        company_zip: form.company_zip.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        website: form.website.trim() || null,
        stage: form.stage || 'new_lead',
        contact_type: form.contact_type || null,
        source: form.source.trim() || null,
        campaign: form.campaign.trim() || null,
        how_did_you_hear: form.how_did_you_hear.trim() || null,
        ghl_assigned_to: form.ghl_assigned_to.trim() || null,
        notes: form.notes.trim() || null,
        project_description: form.project_description.trim() || null,
        call_center_notes: form.call_center_notes.trim() || null,
        company_contacts: form.company_contacts.filter(
          c => c.first_name || c.last_name || c.email || c.phone
        ),
      })
      .select()
      .single()
    setSaving(false)
    if (error) {
      setSaveError(error.message)
      return
    }
    if (data) onSave(data)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">New Company Contact</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
            ✕
          </button>
        </div>

        <div className="space-y-3">
          {/* ── Company Name ── */}
          <div>
            <label className={label}>
              Company Name <span className="text-red-400">*</span>
            </label>
            <input
              className={input}
              value={form.company_name}
              onChange={e => set('company_name', e.target.value)}
              placeholder="Company name"
              autoFocus
            />
          </div>

          {/* ── Company Address ── */}
          <div className="border border-gray-200 rounded-xl p-3 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 mb-2">Company Address</p>
            <div className="space-y-2">
              <input
                className={input}
                value={form.company_street}
                onChange={e => set('company_street', e.target.value)}
                placeholder="Street Address"
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  className={input}
                  value={form.company_city}
                  onChange={e => set('company_city', e.target.value)}
                  placeholder="City"
                />
                <input
                  className={input}
                  value={form.company_state}
                  onChange={e => set('company_state', e.target.value)}
                  placeholder="ST"
                  maxLength={2}
                />
                <input
                  className={input}
                  value={form.company_zip}
                  onChange={e => set('company_zip', e.target.value)}
                  placeholder="Zip"
                />
              </div>
            </div>
          </div>

          {/* ── Main Contact Info ── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Main Phone</label>
              <input
                className={input}
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="(555) 000-0000"
              />
            </div>
            <div>
              <label className={label}>Main Email</label>
              <input
                className={input}
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="email@example.com"
                type="email"
              />
            </div>
          </div>
          <div>
            <label className={label}>Website</label>
            <input
              className={input}
              value={form.website}
              onChange={e => set('website', e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          {/* ── Company Contacts ── */}
          <div className="border border-gray-200 rounded-xl p-3 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500">Company Contacts</p>
              <button
                type="button"
                onClick={addCompanyContact}
                className="text-xs font-semibold text-green-700 hover:text-green-900"
              >
                + Add Person
              </button>
            </div>
            {form.company_contacts.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No contacts added yet.</p>
            ) : (
              <div className="space-y-2">
                {form.company_contacts.map((c, i) => (
                  <CompanyContactRow
                    key={i}
                    contact={c}
                    onChange={val => updateCompanyContact(i, val)}
                    onRemove={() => removeCompanyContact(i)}
                    inp={input}
                    lbl={label}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Assignment ── */}
          <div>
            <label className={label}>Assigned To</label>
            <select
              className={input}
              value={form.ghl_assigned_to}
              onChange={e => set('ghl_assigned_to', e.target.value)}
            >
              <option value="">— Unassigned —</option>
              {assignees.map(e => (
                <option key={e.id} value={`${e.first_name} ${e.last_name}`}>
                  {e.first_name} {e.last_name}
                  {e.job_title ? ` — ${e.job_title}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* ── Stage ── */}
          <div>
            <label className={label}>Stage</label>
            <select
              className={input}
              value={form.stage}
              onChange={e => set('stage', e.target.value)}
            >
              {STAGES.map(s => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={label}>Notes</label>
            <textarea
              className={input + ' resize-none'}
              rows={3}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Internal notes…"
            />
          </div>
          <div>
            <label className={label}>Project Description</label>
            <textarea
              className={input + ' resize-none'}
              rows={3}
              value={form.project_description}
              onChange={e => set('project_description', e.target.value)}
              placeholder="Describe the project or work needed…"
            />
          </div>

          {/* ── Marketing ── */}
          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wide">
              Marketing
            </p>
            <div className="space-y-3">
              <div>
                <label className={label}>Contact Type</label>
                <select
                  className={input}
                  value={form.contact_type}
                  onChange={e => set('contact_type', e.target.value)}
                >
                  <option value="">— None —</option>
                  <option value="Residential">Residential</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Public Works">Public Works</option>
                </select>
              </div>
              <div>
                <label className={label}>Source Type</label>
                <input
                  className={input}
                  value={form.source}
                  onChange={e => set('source', e.target.value)}
                  placeholder="e.g. Google, Referral…"
                />
              </div>
              <div>
                <label className={label}>Campaign</label>
                <input
                  className={input}
                  value={form.campaign}
                  onChange={e => set('campaign', e.target.value)}
                  placeholder="e.g. Spring Promo, Google Ads…"
                />
              </div>
              <div>
                <label className={label}>Source Origin</label>
                <input
                  className={input}
                  value={form.how_did_you_hear}
                  onChange={e => set('how_did_you_hear', e.target.value)}
                  placeholder="How did they hear about us?"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100">
            <label className={label}>Call Center Notes</label>
            <textarea
              className={input + ' resize-none'}
              rows={3}
              value={form.call_center_notes}
              onChange={e => set('call_center_notes', e.target.value)}
              placeholder="Notes from call center…"
            />
          </div>
        </div>

        {saveError && (
          <div className="mt-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
            {saveError}
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
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
  const PAGE_SIZE = 200

  const [activeTab, setActiveTab] = useState('individuals') // 'individuals' | 'companies' | 'settings'
  const [settingsSubTab, setSettingsSubTab] = useState('import') // 'import' | 'export'

  // ── Individuals state ──
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // ── Companies state ──
  const [companies, setCompanies] = useState([])
  const [companiesLoading, setCompaniesLoading] = useState(true)
  const [companiesError, setCompaniesError] = useState(null)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [sortField, setSortField] = useState('last_name')
  const [sortAsc, setSortAsc] = useState(true)
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [contactsTotal, setContactsTotal] = useState(0)
  const [companiesTotal, setCompaniesTotal] = useState(0)
  const [exportContacts, setExportContacts] = useState([])
  const [assignees, setAssignees] = useState([])
  const reqId = useRef(0)

  // Column show/hide picker (shared across both tabs).
  const [visibleCols, setVisibleCols] = useState(
    () => new Set(['cell', 'phone', 'email', 'address', 'city_state', 'stage', 'assigned', 'created'])
  )
  const [colPickerOpen, setColPickerOpen] = useState(false)
  const colPickerRef = useRef(null)
  function toggleCol(key) {
    setVisibleCols(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }
  useEffect(() => {
    if (!colPickerOpen) return
    const handler = e => {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target)) setColPickerOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [colPickerOpen])

  async function fetchContacts() {
    const myReq = ++reqId.current
    setLoading(true)
    const from = page * PAGE_SIZE
    const sortCol = [
      'last_name',
      'first_name',
      'ghl_assigned_to',
      'street_address',
      'city',
      'stage',
      'created_at',
    ].includes(sortField)
      ? sortField
      : 'last_name'

    let q = supabase.from('contacts').select('*', { count: 'exact' })
    for (const raw of debouncedSearch.trim().split(/[\s,]+/)) {
      const t = raw.replace(/[%(),*]/g, '').trim()
      if (!t) continue
      q = q.or(
        `first_name.ilike.%${t}%,last_name.ilike.%${t}%,email.ilike.%${t}%,` +
          `street_address.ilike.%${t}%,city.ilike.%${t}%,state.ilike.%${t}%,zip.ilike.%${t}%,` +
          `phone.ilike.%${t}%,cell.ilike.%${t}%`
      )
    }

    const { data, count, error } = await q
      .order(sortCol, { ascending: sortAsc })
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (myReq !== reqId.current) return
    if (error) {
      setError(error.message)
    } else {
      setError(null)
      setContacts(data || [])
      setTotalCount(count || 0)
    }
    setLoading(false)
  }

  async function fetchCompanies() {
    const myReq = ++reqId.current
    setCompaniesLoading(true)
    const from = page * PAGE_SIZE
    const sortCol = [
      'company_name',
      'ghl_assigned_to',
      'company_city',
      'stage',
      'created_at',
    ].includes(sortField)
      ? sortField
      : 'company_name'

    let q = supabase
      .from('companies')
      .select(
        'id,company_name,company_city,company_state,phone,email,stage,contact_type,ghl_assigned_to,created_at',
        { count: 'exact' }
      )
    for (const raw of debouncedSearch.trim().split(/[\s,]+/)) {
      const t = raw.replace(/[%(),*]/g, '').trim()
      if (!t) continue
      q = q.or(
        `company_name.ilike.%${t}%,email.ilike.%${t}%,` +
          `company_street.ilike.%${t}%,company_city.ilike.%${t}%,company_state.ilike.%${t}%,company_zip.ilike.%${t}%,` +
          `phone.ilike.%${t}%`
      )
    }

    const { data, count, error } = await q
      .order(sortCol, { ascending: sortAsc })
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (myReq !== reqId.current) return
    if (error) {
      setCompaniesError(error.message)
    } else {
      setCompaniesError(null)
      setCompanies(data || [])
      setTotalCount(count || 0)
    }
    setCompaniesLoading(false)
  }

  async function fetchCounts() {
    const [cRes, coRes] = await Promise.all([
      supabase.from('contacts').select('id', { count: 'exact', head: true }),
      supabase.from('companies').select('id', { count: 'exact', head: true }),
    ])
    setContactsTotal(cRes.count || 0)
    setCompaniesTotal(coRes.count || 0)
  }

  useEffect(() => {
    fetchAssignableEmployees().then(setAssignees)
    fetchCounts()
  }, [])

  // Debounce the search box so we don't query on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  // Reset to the first page when the tab, search, or sort changes.
  useEffect(() => {
    setPage(0)
  }, [debouncedSearch, activeTab, sortField, sortAsc])

  // Fetch the active tab's current page from the server.
  useEffect(() => {
    if (activeTab === 'individuals') fetchContacts()
    else if (activeTab === 'companies') fetchCompanies()
  }, [activeTab, debouncedSearch, page, sortField, sortAsc])

  // When the Export tab opens, load the full contact list for the export file.
  useEffect(() => {
    if (activeTab !== 'settings' || settingsSubTab !== 'export') return
    let alive = true
    ;(async () => {
      let all = []
      let from = 0
      const BATCH = 1000
      while (true) {
        const { data } = await supabase
          .from('contacts')
          .select('*')
          .order('last_name', { ascending: true })
          .range(from, from + BATCH - 1)
        all = all.concat(data || [])
        if (!data || data.length < BATCH) break
        from += BATCH
      }
      if (alive) setExportContacts(all)
    })()
    return () => {
      alive = false
    }
  }, [activeTab, settingsSubTab])

  function toggleSort(field) {
    if (sortField === field) setSortAsc(v => !v)
    else {
      setSortField(field)
      setSortAsc(true)
    }
  }

  // Server-side paging — `contacts`/`companies` already hold just the current page.
  const paginated = activeTab === 'companies' ? companies : contacts
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const rangeStart = totalCount === 0 ? 0 : page * PAGE_SIZE + 1
  const rangeEnd = Math.min((page + 1) * PAGE_SIZE, totalCount)

  const thCls =
    'text-left px-4 py-2 font-semibold text-gray-600 uppercase cursor-pointer select-none hover:text-gray-800 transition-colors'
  const arrow = field => (sortField === field ? (sortAsc ? ' ↑' : ' ↓') : '')

  const isIndividuals = activeTab === 'individuals'

  // ── Column show/hide (like Opportunities) ──────────────────────────────────
  // Columns flagged mobileHide collapse on phones (class-based) regardless of
  // this picker, which governs desktop visibility. `always` columns can't be
  // hidden. The two tabs have different column sets but share a visibility set;
  // shared keys (email, stage, …) toggle together.
  const dash = <span className="text-gray-300">—</span>
  const emailCell = c =>
    c.email ? (
      <a
        href={`mailto:${c.email}`}
        className="hover:text-green-700 truncate max-w-[180px] block"
      >
        {c.email}
      </a>
    ) : (
      dash
    )
  const stageCell = c =>
    stageMap[c.stage] ? (
      <span
        className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${stageMap[c.stage].cls}`}
      >
        {stageMap[c.stage].label}
      </span>
    ) : (
      '—'
    )
  const createdCell = c => (
    <span className="text-gray-400 whitespace-nowrap">
      {c.created_at
        ? new Date(c.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : '—'}
    </span>
  )

  const indCols = [
    {
      key: 'name',
      label: 'Name',
      always: true,
      sort: 'last_name',
      render: c => (
        <button
          onClick={() => navigate(`/contacts/${c.id}`)}
          className="font-semibold text-green-700 hover:text-green-900 hover:underline text-left"
        >
          {c.last_name}
          {c.first_name ? `, ${c.first_name}` : ''}
        </button>
      ),
    },
    {
      key: 'cell',
      label: 'Cell Phone',
      render: c =>
        c.cell ? (
          <a href={`tel:${c.cell}`} className="hover:text-green-700">
            {c.cell}
          </a>
        ) : (
          dash
        ),
    },
    { key: 'email', label: 'Email', mobileHide: true, render: emailCell },
    {
      key: 'address',
      label: 'Address',
      mobileHide: true,
      sort: 'street_address',
      render: c => c.street_address || dash,
    },
    {
      key: 'city_state',
      label: 'City / State',
      mobileHide: true,
      sort: 'city',
      render: c => [c.city, c.state].filter(Boolean).join(', ') || dash,
    },
    { key: 'stage', label: 'Stage', mobileHide: true, sort: 'stage', render: stageCell },
    {
      key: 'assigned',
      label: 'Assigned To',
      mobileHide: true,
      sort: 'ghl_assigned_to',
      render: c => c.ghl_assigned_to || dash,
    },
    { key: 'created', label: 'Created', mobileHide: true, sort: 'created_at', render: createdCell },
  ]

  const coCols = [
    {
      key: 'name',
      label: 'Name',
      always: true,
      sort: 'company_name',
      render: c => (
        <button
          onClick={() => navigate(`/companies/${c.id}`)}
          className="font-semibold text-green-700 hover:text-green-900 hover:underline text-left"
        >
          {c.company_name}
        </button>
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      render: c =>
        c.phone ? (
          <a href={`tel:${c.phone}`} className="hover:text-green-700">
            {c.phone}
          </a>
        ) : (
          dash
        ),
    },
    { key: 'email', label: 'Email', mobileHide: true, render: emailCell },
    {
      key: 'city_state',
      label: 'City / State',
      mobileHide: true,
      sort: 'company_city',
      render: c => [c.company_city, c.company_state].filter(Boolean).join(', ') || dash,
    },
    { key: 'stage', label: 'Stage', mobileHide: true, sort: 'stage', render: stageCell },
    {
      key: 'assigned',
      label: 'Assigned To',
      mobileHide: true,
      sort: 'ghl_assigned_to',
      render: c => c.ghl_assigned_to || dash,
    },
    { key: 'created', label: 'Created', mobileHide: true, sort: 'created_at', render: createdCell },
  ]

  const colDefs = isIndividuals ? indCols : coCols
  const tableClass = isIndividuals ? 'contacts-ind-table' : 'contacts-co-table'
  const minWClass = isIndividuals ? 'lg:min-w-[900px]' : 'lg:min-w-[700px]'
  const activeCols = colDefs.filter(c => c.always || visibleCols.has(c.key))

  function renderTable(rows) {
    return (
      <div className="thin-scroll bg-white rounded-xl border border-gray-200 flex-1 min-h-0 overflow-x-hidden overflow-y-auto lg:overflow-auto overscroll-contain">
        <table className={`${tableClass} w-full text-xs table-fixed ${minWClass}`}>
          <thead className="sticky top-0 z-20">
            <tr className="bg-gray-50 border-b border-gray-200">
              {activeCols.map((col, ci) => (
                <th
                  key={col.key}
                  onClick={col.sort ? () => toggleSort(col.sort) : undefined}
                  className={`${thCls} bg-gray-50 ${col.sort ? '' : 'cursor-default hover:text-gray-600'} ${
                    col.mobileHide ? 'hidden lg:table-cell ' : ''
                  }${ci === 0 ? 'lg:sticky lg:left-0 z-30 lg:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]' : ''}`}
                >
                  {col.label}
                  {col.sort ? arrow(col.sort) : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={activeCols.length} className="px-4 py-10 text-center text-gray-400">
                  {search
                    ? `No ${isIndividuals ? 'contacts' : 'companies'} match your search.`
                    : `No ${isIndividuals ? 'contacts' : 'companies'} yet — add your first one.`}
                </td>
              </tr>
            ) : (
              rows.map(c => (
                <tr key={c.id} className="group hover:bg-gray-50 transition-colors">
                  {activeCols.map((col, ci) => (
                    <td
                      key={col.key}
                      className={`px-4 py-2 ${col.mobileHide ? 'hidden lg:table-cell ' : ''}${
                        ci === 0
                          ? 'lg:sticky lg:left-0 bg-white group-hover:bg-gray-50 z-10 lg:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]'
                          : 'text-gray-600'
                      }`}
                    >
                      {col.render(c)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0 gap-3">
        <h1 className="hidden lg:block text-xl font-bold text-gray-900">Contacts</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdd(true)}
            className="hidden sm:flex btn-primary text-sm px-3 py-1.5"
          >
            + {isIndividuals ? 'Add Contact' : 'Add Company'}
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 flex justify-center gap-0 flex-shrink-0 rounded-xl">
        {[
          { id: 'individuals', label: `👤 Individuals (${contactsTotal.toLocaleString()})` },
          { id: 'companies', label: `🏢 Companies (${companiesTotal.toLocaleString()})` },
          { id: 'settings', label: '⚙️ Settings' },
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id)
              setSearch('')
              setSortField(tab.id === 'companies' ? 'company_name' : 'last_name')
              setSortAsc(true)
            }}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-green-700 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Settings panel */}
      {activeTab === 'settings' && (
        <div className="mt-3 flex-1 flex flex-col overflow-hidden">
          <div className="flex border border-gray-200 bg-white px-6 flex-nowrap overflow-x-auto flex-shrink-0 rounded-xl mb-3">
            {[
              { id: 'import', label: '⬆ Import' },
              { id: 'export', label: '⬇ Export' },
            ].map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSettingsSubTab(t.id)}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                  settingsSubTab === t.id
                    ? 'border-green-700 text-green-800'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="bg-gray-50 px-6 py-6 flex-1 overflow-y-auto rounded-xl">
            {settingsSubTab === 'import' && (
              <div className="max-w-2xl">
                <ImportModal
                  inline
                  onDone={() => {
                    fetchContacts()
                    fetchCompanies()
                    fetchCounts()
                  }}
                  onClose={null}
                />
              </div>
            )}

            {settingsSubTab === 'export' && (
              <div className="max-w-lg">
                <ExportModal inline contacts={exportContacts} onClose={null} />
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab !== 'settings' && (
        <>
          {/* Mobile: full-width Add button sits directly above the search field. */}
          <button
            onClick={() => setShowAdd(true)}
            className="sm:hidden w-full mb-3 mt-4 py-2.5 bg-green-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 flex-shrink-0"
          >
            + {isIndividuals ? 'Add Contact' : 'Add Company'}
          </button>

          {/* Search + column picker */}
          <div className="mb-4 mt-4 flex-shrink-0 flex items-center justify-between gap-3">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={
                isIndividuals
                  ? 'Search name, email, phone, city…'
                  : 'Search company name, email, phone, city…'
              }
              className="flex-1 max-w-md border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600"
            />

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
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <span className="hidden sm:inline">Columns</span>
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
                  {colDefs.map(col => (
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

          {/* Scrollable table + pagination */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Table */}
            {isIndividuals ? (
              loading ? (
                <div className="flex items-center justify-center py-20 text-gray-400">Loading…</div>
              ) : error ? (
                <div className="text-red-500 text-sm py-8 text-center">{error}</div>
              ) : (
                renderTable(paginated)
              )
            ) : companiesLoading ? (
              <div className="flex items-center justify-center py-20 text-gray-400">Loading…</div>
            ) : companiesError ? (
              <div className="text-red-500 text-sm py-8 text-center">{companiesError}</div>
            ) : (
              renderTable(paginated)
            )}

            {/* Pagination */}
            {totalCount > 0 && (
              <div className="flex items-center justify-between mt-3 flex-shrink-0">
                <p className="text-xs text-gray-400">
                  {rangeStart}–{rangeEnd} of {totalCount.toLocaleString()}{' '}
                  {isIndividuals ? 'contact' : 'compan'}
                  {isIndividuals
                    ? totalCount !== 1
                      ? 's'
                      : ''
                    : totalCount !== 1
                      ? 'ies'
                      : 'y'}
                  {isIndividuals &&
                    totalCount !== contactsTotal &&
                    ` (${contactsTotal.toLocaleString()} total)`}
                  {!isIndividuals &&
                    totalCount !== companiesTotal &&
                    ` (${companiesTotal.toLocaleString()} total)`}
                </p>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    {/* First */}
                    <button
                      onClick={() => setPage(0)}
                      disabled={page === 0}
                      className="px-2 py-1 rounded text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-default"
                      title="First page"
                    >
                      «
                    </button>

                    {/* Prev */}
                    <button
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="px-2 py-1 rounded text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-default"
                    >
                      ‹ Prev
                    </button>

                    {/* Page number pills */}
                    {(() => {
                      const pages = []
                      const delta = 2
                      const left = Math.max(0, page - delta)
                      const right = Math.min(totalPages - 1, page + delta)
                      if (left > 0) pages.push(0, left > 1 ? '…' : null)
                      for (let i = left; i <= right; i++) pages.push(i)
                      if (right < totalPages - 1)
                        pages.push(right < totalPages - 2 ? '…' : null, totalPages - 1)
                      return pages
                        .filter((v, i, a) => v !== null && a.indexOf(v) === i)
                        .map((p, i) =>
                          p === '…' ? (
                            <span key={`ellipsis-${i}`} className="px-1 text-xs text-gray-300">
                              …
                            </span>
                          ) : (
                            <button
                              key={p}
                              onClick={() => setPage(p)}
                              className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                                page === p
                                  ? 'bg-green-700 text-white'
                                  : 'text-gray-500 hover:bg-gray-100'
                              }`}
                            >
                              {p + 1}
                            </button>
                          )
                        )
                    })()}

                    {/* Next */}
                    <button
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="px-2 py-1 rounded text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-default"
                    >
                      Next ›
                    </button>

                    {/* Last */}
                    <button
                      onClick={() => setPage(totalPages - 1)}
                      disabled={page >= totalPages - 1}
                      className="px-2 py-1 rounded text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-default"
                      title="Last page"
                    >
                      »
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          {/* end scrollable */}

          {showAdd && isIndividuals && (
            <AddContactModal
              assignees={assignees}
              onSave={c => {
                setContacts(p => [c, ...p])
                setShowAdd(false)
              }}
              onClose={() => setShowAdd(false)}
            />
          )}

          {showAdd && !isIndividuals && (
            <AddCompanyModal
              assignees={assignees}
              onSave={c => {
                setCompanies(p => [c, ...p])
                setShowAdd(false)
              }}
              onClose={() => setShowAdd(false)}
            />
          )}
        </>
      )}
    </div>
  )
}
