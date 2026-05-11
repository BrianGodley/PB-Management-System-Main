import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ── Stage config ──────────────────────────────────────────────────────────────
const STAGES = [
  { value: 'new_lead',     label: 'New Lead',      cls: 'bg-blue-50 text-blue-700 border-blue-200',     dot: 'bg-blue-500' },
  { value: 'warm_lead',    label: 'Warm Lead',     cls: 'bg-yellow-50 text-yellow-700 border-yellow-200', dot: 'bg-yellow-400' },
  { value: 'consultation', label: 'Consultation',  cls: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  { value: 'quoted',       label: 'Quoted',        cls: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-400' },
  { value: 'won',          label: 'Won',           cls: 'bg-green-50 text-green-700 border-green-200',   dot: 'bg-green-500' },
  { value: 'lost',         label: 'Lost',          cls: 'bg-red-50 text-red-600 border-red-200',         dot: 'bg-red-500' },
  { value: 'nurture',      label: 'Nurture',       cls: 'bg-teal-50 text-teal-700 border-teal-200',      dot: 'bg-teal-500' },
  { value: 'bt_import',    label: 'BT Import',     cls: 'bg-amber-50 text-amber-700 border-amber-200',   dot: 'bg-amber-500' },
  { value: 'ghl_import',   label: 'GHL Import',    cls: 'bg-sky-50 text-sky-700 border-sky-200',         dot: 'bg-sky-500' },
]
const stageMap = Object.fromEntries(STAGES.map(s => [s.value, s]))

const PROJECT_TYPES = [
  'Artificial Turf','Concrete','Columns','Demo/Excavation','Drainage',
  'Finishes','Fire Pit','Ground Treatments','Irrigation','Lighting',
  'Outdoor Kitchen/BBQ','Pavers','Planting/Landscaping','Pool',
  'Retaining Walls','Steps','Utilities','Other',
]

function fmtDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Edit Company Modal ────────────────────────────────────────────────────────
function EditCompanyModal({ company, onSave, onClose }) {
  const [form, setForm] = useState({ ...company })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  function addCompanyContact() {
    const arr = Array.isArray(form.company_contacts) ? form.company_contacts : []
    set('company_contacts', [...arr, { first_name: '', last_name: '', phone: '', email: '' }])
  }
  function updateCompanyContact(i, val) {
    const arr = [...(form.company_contacts || [])]
    arr[i] = val
    set('company_contacts', arr)
  }
  function removeCompanyContact(i) {
    set('company_contacts', (form.company_contacts || []).filter((_, idx) => idx !== i))
  }

  async function handleSave() {
    setSaving(true)
    const { data, error } = await supabase
      .from('companies')
      .update({
        company_name:        form.company_name?.trim() || '',
        company_street:      form.company_street?.trim() || null,
        company_city:        form.company_city?.trim() || null,
        company_state:       form.company_state?.trim() || null,
        company_zip:         form.company_zip?.trim() || null,
        phone:               form.phone?.trim() || null,
        email:               form.email?.trim() || null,
        website:             form.website?.trim() || null,
        stage:               form.stage || 'new_lead',
        contact_type:        form.contact_type || null,
        source:              form.source?.trim() || null,
        campaign:            form.campaign?.trim() || null,
        how_did_you_hear:    form.how_did_you_hear?.trim() || null,
        ghl_assigned_to:     form.ghl_assigned_to?.trim() || null,
        notes:               form.notes?.trim() || null,
        project_description: form.project_description?.trim() || null,
        call_center_notes:   form.call_center_notes?.trim() || null,
        company_contacts:    (form.company_contacts || []).filter(c => c.first_name || c.last_name || c.email || c.phone),
      })
      .eq('id', company.id)
      .select()
      .single()
    setSaving(false)
    if (!error && data) onSave(data)
  }

  const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600'
  const lbl = 'block text-xs font-semibold text-gray-500 mb-1'
  const contacts = Array.isArray(form.company_contacts) ? form.company_contacts : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Edit Company</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="space-y-3">
          {/* Company Name */}
          <div><label className={lbl}>Company Name <span className="text-red-400">*</span></label>
            <input className={inp} value={form.company_name || ''} onChange={e => set('company_name', e.target.value)} /></div>

          {/* Company Address */}
          <div className="border border-gray-200 rounded-xl p-3 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 mb-2">Company Address</p>
            <div className="space-y-2">
              <input className={inp} value={form.company_street || ''} onChange={e => set('company_street', e.target.value)} placeholder="Street Address" />
              <div className="grid grid-cols-3 gap-2">
                <input className={inp} value={form.company_city || ''} onChange={e => set('company_city', e.target.value)} placeholder="City" />
                <input className={inp} value={form.company_state || ''} onChange={e => set('company_state', e.target.value)} placeholder="ST" maxLength={2} />
                <input className={inp} value={form.company_zip || ''} onChange={e => set('company_zip', e.target.value)} placeholder="Zip" />
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Phone</label><input className={inp} value={form.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="(555) 000-0000" /></div>
            <div><label className={lbl}>Email</label><input className={inp} value={form.email || ''} onChange={e => set('email', e.target.value)} placeholder="email@example.com" type="email" /></div>
          </div>
          <div><label className={lbl}>Website</label><input className={inp} value={form.website || ''} onChange={e => set('website', e.target.value)} placeholder="https://example.com" /></div>

          {/* Company Contacts */}
          <div className="border border-gray-200 rounded-xl p-3 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500">Company Contacts</p>
              <button type="button" onClick={addCompanyContact} className="text-xs font-semibold text-green-700 hover:text-green-900">+ Add Person</button>
            </div>
            {contacts.length === 0
              ? <p className="text-xs text-gray-400 italic">No contacts added yet.</p>
              : <div className="space-y-2">
                  {contacts.map((c, i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div><label className={lbl}>First Name</label><input className={inp} value={c.first_name || ''} onChange={e => updateCompanyContact(i, { ...c, first_name: e.target.value })} placeholder="First" /></div>
                        <div><label className={lbl}>Last Name</label><input className={inp} value={c.last_name || ''} onChange={e => updateCompanyContact(i, { ...c, last_name: e.target.value })} placeholder="Last" /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div><label className={lbl}>Phone</label><input className={inp} value={c.phone || ''} onChange={e => updateCompanyContact(i, { ...c, phone: e.target.value })} placeholder="(555) 000-0000" /></div>
                        <div><label className={lbl}>Email</label><input className={inp} value={c.email || ''} onChange={e => updateCompanyContact(i, { ...c, email: e.target.value })} placeholder="email@example.com" /></div>
                      </div>
                      <button type="button" onClick={() => removeCompanyContact(i)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                    </div>
                  ))}
                </div>
            }
          </div>

          {/* Assignment & Stage */}
          <div><label className={lbl}>Assigned To</label><input className={inp} value={form.ghl_assigned_to || ''} onChange={e => set('ghl_assigned_to', e.target.value)} placeholder="Assignee name" /></div>
          <div>
            <label className={lbl}>Stage</label>
            <select className={inp} value={form.stage || 'new_lead'} onChange={e => set('stage', e.target.value)}>
              {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {/* Notes */}
          <div><label className={lbl}>Notes</label><textarea className={inp + ' resize-none'} rows={3} value={form.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="Internal notes…" /></div>
          <div><label className={lbl}>Project Description</label><textarea className={inp + ' resize-none'} rows={3} value={form.project_description || ''} onChange={e => set('project_description', e.target.value)} placeholder="Describe the project or work needed…" /></div>

          {/* Marketing */}
          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wide">Marketing</p>
            <div className="space-y-3">
              <div>
                <label className={lbl}>Contact Type</label>
                <select className={inp} value={form.contact_type || ''} onChange={e => set('contact_type', e.target.value)}>
                  <option value="">— None —</option>
                  <option value="Residential">Residential</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Public Works">Public Works</option>
                </select>
              </div>
              <div><label className={lbl}>Source Type</label><input className={inp} value={form.source || ''} onChange={e => set('source', e.target.value)} placeholder="e.g. Google, Referral…" /></div>
              <div><label className={lbl}>Campaign</label><input className={inp} value={form.campaign || ''} onChange={e => set('campaign', e.target.value)} placeholder="e.g. Spring Promo…" /></div>
              <div><label className={lbl}>Source Origin</label><input className={inp} value={form.how_did_you_hear || ''} onChange={e => set('how_did_you_hear', e.target.value)} placeholder="How did they hear about us?" /></div>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100">
            <label className={lbl}>Call Center Notes</label>
            <textarea className={inp + ' resize-none'} rows={3} value={form.call_center_notes || ''} onChange={e => set('call_center_notes', e.target.value)} placeholder="Notes from call center…" />
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.company_name?.trim()}
            className="flex-1 py-2 rounded-lg bg-green-700 text-white text-sm font-semibold hover:bg-green-800 disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Field display helpers ─────────────────────────────────────────────────────
function Field({ label, value, href, type }) {
  const display = value
    ? (href ? <a href={href} className="text-green-700 hover:underline">{value}</a> : <span>{value}</span>)
    : <span className="text-gray-300">—</span>
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-gray-800">{display}</p>
    </div>
  )
}

// ── Main CompanyDetail page ───────────────────────────────────────────────────
export default function CompanyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [company,    setCompany]    = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [activeTab,  setActiveTab]  = useState('main')
  const [showEdit,   setShowEdit]   = useState(false)
  const [stageOpen,  setStageOpen]  = useState(false)
  const stageRef = useRef(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error } = await supabase.from('companies').select('*').eq('id', id).single()
      if (error) setError(error.message)
      else setCompany(data)
      setLoading(false)
    }
    load()
  }, [id])

  useEffect(() => {
    function handleClick(e) {
      if (stageRef.current && !stageRef.current.contains(e.target)) setStageOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function changeStage(newStage) {
    setStageOpen(false)
    const prev = company
    setCompany(c => ({ ...c, stage: newStage }))
    const { error } = await supabase.from('companies').update({ stage: newStage }).eq('id', id)
    if (error) setCompany(prev)
  }

  if (loading) return <div className="flex items-center justify-center py-24 text-gray-400">Loading…</div>
  if (error)   return <div className="text-red-500 text-sm py-8 text-center">{error}</div>
  if (!company) return null

  const stage = stageMap[company.stage]
  const contacts = Array.isArray(company.company_contacts) ? company.company_contacts : []

  const addressLine = [company.company_street, company.company_city, company.company_state, company.company_zip].filter(Boolean).join(', ')

  const TABS = ['main', 'contacts', 'notes']

  return (
    <div className="max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
        <Link to="/contacts" className="hover:text-gray-600">Contacts</Link>
        <span>/</span>
        <span className="text-gray-600 font-medium">Companies</span>
        <span>/</span>
        <span className="text-gray-800 font-semibold truncate">{company.company_name}</span>
      </div>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-xl bg-green-700 flex items-center justify-center text-2xl font-bold text-white flex-shrink-0 select-none">
            {(company.company_name || 'C').charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">{company.company_name}</h1>
            {company.website && (
              <a href={company.website} target="_blank" rel="noreferrer" className="text-sm text-green-700 hover:underline">{company.website}</a>
            )}

            {/* Stage badge + dropdown */}
            <div className="mt-3 relative inline-block" ref={stageRef}>
              <button
                onClick={() => setStageOpen(v => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${stage?.cls || 'bg-gray-50 text-gray-500 border-gray-200'}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${stage?.dot || 'bg-gray-400'}`} />
                {stage?.label || company.stage || 'Unknown'}
                <span className="opacity-60 ml-0.5">▾</span>
              </button>
              {stageOpen && (
                <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[160px]">
                  {STAGES.map(s => (
                    <button key={s.value} onClick={() => changeStage(s.value)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold hover:bg-gray-50 ${company.stage === s.value ? 'text-green-700' : 'text-gray-700'}`}>
                      <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowEdit(true)}
            className="flex-shrink-0 px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-800 transition-colors"
          >
            Edit
          </button>
        </div>

        {/* Quick info strip */}
        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          {company.phone && (
            <div>
              <p className="text-xs text-gray-400 font-semibold">Phone</p>
              <a href={`tel:${company.phone}`} className="text-green-700 hover:underline">{company.phone}</a>
            </div>
          )}
          {company.email && (
            <div>
              <p className="text-xs text-gray-400 font-semibold">Email</p>
              <a href={`mailto:${company.email}`} className="text-green-700 hover:underline truncate block">{company.email}</a>
            </div>
          )}
          {addressLine && (
            <div>
              <p className="text-xs text-gray-400 font-semibold">Address</p>
              <p className="text-gray-800">{addressLine}</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {TABS.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2 text-sm font-semibold capitalize border-b-2 transition-colors -mb-px ${activeTab === t ? 'border-green-700 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t === 'contacts' ? `Contacts (${contacts.length})` : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab: Main */}
      {activeTab === 'main' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            <Field label="Company Name" value={company.company_name} />
            <Field label="Phone" value={company.phone} href={company.phone ? `tel:${company.phone}` : null} />
            <Field label="Email" value={company.email} href={company.email ? `mailto:${company.email}` : null} />
            <Field label="Website" value={company.website} href={company.website} />

            <div className="sm:col-span-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Company Address</p>
              <p className="text-sm text-gray-800">{addressLine || <span className="text-gray-300">—</span>}</p>
            </div>

            <Field label="Assigned To" value={company.ghl_assigned_to} />
            <Field label="Contact Type" value={company.contact_type} />
            <Field label="Stage" value={stage?.label || company.stage} />
            <Field label="Source Type" value={company.source} />
            <Field label="Campaign" value={company.campaign} />
            <Field label="Source Origin" value={company.how_did_you_hear} />

            <div className="sm:col-span-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Project Description</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{company.project_description || <span className="text-gray-300">—</span>}</p>
            </div>

            <Field label="Created" value={fmtDate(company.created_at)} />
            <Field label="Last Updated" value={fmtDate(company.updated_at)} />
          </div>
        </div>
      )}

      {/* Tab: Contacts */}
      {activeTab === 'contacts' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-800">Company Contacts</h2>
            <button
              onClick={() => setShowEdit(true)}
              className="text-xs font-semibold text-green-700 hover:text-green-900"
            >Edit to add contacts</button>
          </div>

          {contacts.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No contacts on file for this company.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {contacts.map((c, i) => (
                <div key={i} className="py-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <p className="text-xs text-gray-400 font-semibold mb-0.5">Name</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {[c.first_name, c.last_name].filter(Boolean).join(' ') || <span className="text-gray-300">—</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold mb-0.5">Phone</p>
                    <p className="text-sm text-gray-800">
                      {c.phone ? <a href={`tel:${c.phone}`} className="text-green-700 hover:underline">{c.phone}</a> : <span className="text-gray-300">—</span>}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs text-gray-400 font-semibold mb-0.5">Email</p>
                    <p className="text-sm text-gray-800">
                      {c.email ? <a href={`mailto:${c.email}`} className="text-green-700 hover:underline">{c.email}</a> : <span className="text-gray-300">—</span>}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Notes */}
      {activeTab === 'notes' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Notes</p>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{company.notes || <span className="text-gray-300 not-italic">No notes on file.</span>}</p>
          </div>
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Call Center Notes</p>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{company.call_center_notes || <span className="text-gray-300">—</span>}</p>
          </div>
        </div>
      )}

      {showEdit && (
        <EditCompanyModal
          company={company}
          onSave={updated => { setCompany(updated); setShowEdit(false) }}
          onClose={() => setShowEdit(false)}
        />
      )}
    </div>
  )
}
