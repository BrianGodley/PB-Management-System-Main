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

const COMM_TYPES = [
  { value: 'note',  label: 'Note',  icon: '📝' },
  { value: 'call',  label: 'Call',  icon: '📞' },
  { value: 'email', label: 'Email', icon: '✉️' },
  { value: 'text',  label: 'Text',  icon: '💬' },
]
const commTypeMap = Object.fromEntries(COMM_TYPES.map(t => [t.value, t]))
const systemIcon = { stage_change: '🔄', system: '⚙️' }

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7)  return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

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
    set('company_contacts', [...arr, { first_name: '', last_name: '', position: '', phone: '', email: '' }])
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
          <div><label className={lbl}>Company Name <span className="text-red-400">*</span></label>
            <input className={inp} value={form.company_name || ''} onChange={e => set('company_name', e.target.value)} /></div>

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

          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Phone</label><input className={inp} value={form.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="(555) 000-0000" /></div>
            <div><label className={lbl}>Email</label><input className={inp} value={form.email || ''} onChange={e => set('email', e.target.value)} placeholder="email@example.com" type="email" /></div>
          </div>
          <div><label className={lbl}>Website</label><input className={inp} value={form.website || ''} onChange={e => set('website', e.target.value)} placeholder="https://example.com" /></div>

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
                      <div><label className={lbl}>Position / Title</label><input className={inp} value={c.position || ''} onChange={e => updateCompanyContact(i, { ...c, position: e.target.value })} placeholder="e.g. Project Manager" /></div>
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

          <div><label className={lbl}>Assigned To</label><input className={inp} value={form.ghl_assigned_to || ''} onChange={e => set('ghl_assigned_to', e.target.value)} placeholder="Assignee name" /></div>
          <div>
            <label className={lbl}>Stage</label>
            <select className={inp} value={form.stage || 'new_lead'} onChange={e => set('stage', e.target.value)}>
              {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          <div><label className={lbl}>Notes</label><textarea className={inp + ' resize-none'} rows={3} value={form.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="Internal notes…" /></div>
          <div><label className={lbl}>Project Description</label><textarea className={inp + ' resize-none'} rows={3} value={form.project_description || ''} onChange={e => set('project_description', e.target.value)} placeholder="Describe the project or work needed…" /></div>

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

// ── Main CompanyDetail page ───────────────────────────────────────────────────
export default function CompanyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [company,     setCompany]     = useState(null)
  const [comms,       setComms]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showEdit,    setShowEdit]    = useState(false)
  const [showDelete,  setShowDelete]  = useState(false)
  const [deleting,    setDeleting]    = useState(false)
  const [leftTab,     setLeftTab]     = useState('main')

  // Communication log
  const [commType,    setCommType]    = useState('note')
  const [commDir,     setCommDir]     = useState('inbound')
  const [commContent, setCommContent] = useState('')
  const [sending,     setSending]     = useState(false)
  const commsEndRef = useRef(null)

  async function fetchAll() {
    setLoading(true)
    const [{ data: c }, { data: commsData }] = await Promise.all([
      supabase.from('companies').select('*').eq('id', id).single(),
      supabase.from('company_communications').select('*').eq('company_id', id).order('created_at', { ascending: true }),
    ])
    setCompany(c)
    setComms(commsData || [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [id])

  async function handleStageChange(newStage) {
    const old = company.stage
    setCompany(p => ({ ...p, stage: newStage }))
    await supabase.from('companies').update({ stage: newStage }).eq('id', id)
    const entry = {
      company_id: id,
      type: 'stage_change',
      content: `Stage changed from ${stageMap[old]?.label || old} → ${stageMap[newStage]?.label || newStage}`,
      created_by: user?.id || null,
    }
    const { data: newComm } = await supabase.from('company_communications').insert(entry).select().single()
    if (newComm) setComms(p => [...p, newComm])
  }

  async function handleContactTypeChange(newType) {
    setCompany(p => ({ ...p, contact_type: newType }))
    await supabase.from('companies').update({ contact_type: newType }).eq('id', id)
  }

  async function handleAddComm() {
    if (!commContent.trim()) return
    setSending(true)
    const entry = {
      company_id: id,
      type:       commType,
      content:    commContent.trim(),
      direction:  commType === 'note' ? null : commDir,
      created_by: user?.id || null,
    }
    const { data: newComm } = await supabase.from('company_communications').insert(entry).select().single()
    if (newComm) {
      setComms(p => [...p, newComm])
      setCommContent('')
      setTimeout(() => commsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
    setSending(false)
  }

  async function handleDelete() {
    setDeleting(true)
    await supabase.from('company_communications').delete().eq('company_id', id)
    await supabase.from('companies').delete().eq('id', id)
    navigate('/contacts')
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>
  if (!company) return (
    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
      <p className="text-lg font-semibold mb-2">Company not found</p>
      <button onClick={() => navigate('/contacts')} className="text-green-700 text-sm hover:underline">← Back to Contacts</button>
    </div>
  )

  const stage    = stageMap[company.stage] || STAGES[0]
  const contacts = Array.isArray(company.company_contacts) ? company.company_contacts : []
  const addressLine = [company.company_street, company.company_city, company.company_state, company.company_zip].filter(Boolean).join(', ')

  const lbl = 'text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-0.5'

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-6 py-3 bg-white border-b border-gray-200 flex-shrink-0">
        <button onClick={() => navigate('/contacts')} className="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1">
          ← Contacts
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-xs text-gray-400">Companies</span>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-semibold text-gray-700 truncate">{company.company_name}</span>
      </div>

      {/* 3-column layout */}
      <div className="flex-1 min-h-0 overflow-hidden grid" style={{gridTemplateColumns: '23rem minmax(0,1fr) 15rem'}}>

        {/* ── LEFT COLUMN ───────────────────────────────────────────────── */}
        <div className="border-r border-gray-200 bg-white overflow-y-auto">
          <div className="p-5">

            {/* Avatar + name */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-green-700 flex items-center justify-center text-green-100 font-bold text-lg flex-shrink-0 select-none">
                  {(company.company_name || 'C').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 leading-tight">{company.company_name}</h2>
                  {company.website && (
                    <a href={company.website} target="_blank" rel="noreferrer" className="text-xs text-green-700 hover:underline truncate block max-w-[180px]">{company.website}</a>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setShowEdit(true)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors" title="Edit company">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <path d="M11.5 1.5a1.414 1.414 0 0 1 2 2L5 12l-3 1 1-3 8.5-8.5z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <button onClick={() => setShowDelete(true)}
                  className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors" title="Delete company">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Quick info: Address, Phone, Email above Stage */}
            <div className="space-y-2 mb-4 pb-4 border-b border-gray-100 text-sm">
              <div>
                <p className={lbl}>Company Address</p>
                {addressLine
                  ? <p className="text-gray-900">{addressLine}</p>
                  : <span className="text-gray-300">—</span>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className={lbl}>Main Phone</p>
                  {company.phone
                    ? <a href={`tel:${company.phone}`} className="text-gray-900 hover:text-green-700">{company.phone}</a>
                    : <span className="text-gray-300">—</span>}
                </div>
                <div>
                  <p className={lbl}>Main Email</p>
                  {company.email
                    ? <a href={`mailto:${company.email}`} className="text-gray-900 hover:text-green-700 break-all">{company.email}</a>
                    : <span className="text-gray-300">—</span>}
                </div>
              </div>
            </div>

            {/* Stage selector */}
            <div className="mb-4">
              <label className={`block ${lbl} mb-1.5`}>Stage</label>
              <select
                value={company.stage}
                onChange={e => handleStageChange(e.target.value)}
                className={`w-full border rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none cursor-pointer ${stage.cls}`}
              >
                {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-gray-200 mb-4 -mx-5 px-5">
              {[
                { key: 'main',      label: 'More Info' },
                { key: 'contacts',  label: `Contacts${contacts.length > 0 ? ` (${contacts.length})` : ''}` },
                { key: 'marketing', label: 'Marketing' },
                { key: 'tags',      label: 'Tags' },
              ].map(t => (
                <button key={t.key} onClick={() => setLeftTab(t.key)}
                  className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                    leftTab === t.key ? 'border-green-600 text-green-700' : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── MORE INFO TAB ── */}
            {leftTab === 'main' && (
              <div className="space-y-3 text-sm">
                <div>
                  <p className={lbl}>Assigned To</p>
                  <p className="text-gray-900">{company.ghl_assigned_to || <span className="text-gray-300">—</span>}</p>
                </div>
                <div>
                  <p className={lbl}>Contact Type</p>
                  <p className="text-gray-900">{company.contact_type || <span className="text-gray-300">—</span>}</p>
                </div>
                <div>
                  <p className={lbl}>Project Description</p>
                  {company.project_description
                    ? <p className="text-gray-800 text-xs leading-relaxed whitespace-pre-wrap">{company.project_description}</p>
                    : <span className="text-gray-300">—</span>}
                </div>
              </div>
            )}

            {/* ── CONTACTS TAB ── */}
            {leftTab === 'contacts' && (
              <div>
                {contacts.length === 0 ? (
                  <p className="text-xs text-gray-400 italic text-center py-6">No contacts on file — click edit to add.</p>
                ) : (
                  <div className="space-y-3">
                    {contacts.map((c, i) => (
                      <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-1">
                        <p className="text-sm font-semibold text-gray-900">
                          {[c.first_name, c.last_name].filter(Boolean).join(' ') || '—'}
                        </p>
                        {c.position && <p className="text-xs text-green-700 font-medium">{c.position}</p>}
                        {c.phone && <a href={`tel:${c.phone}`} className="block text-xs text-gray-900 hover:text-green-700">{c.phone}</a>}
                        {c.email && <a href={`mailto:${c.email}`} className="block text-xs text-gray-900 hover:text-green-700 break-all">{c.email}</a>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── MARKETING TAB ── */}
            {leftTab === 'marketing' && (
              <div className="space-y-3 text-sm">
                <div>
                  <p className={`${lbl} mb-1`}>Contact Type</p>
                  <select
                    value={company.contact_type || 'Residential'}
                    onChange={e => handleContactTypeChange(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600 bg-white cursor-pointer"
                  >
                    <option value="Residential">Residential</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Public Works">Public Works</option>
                  </select>
                </div>
                <div>
                  <p className={lbl}>Source Type</p>
                  <p className="text-gray-900">{company.source || <span className="text-gray-300">—</span>}</p>
                </div>
                <div>
                  <p className={lbl}>Campaign</p>
                  <p className="text-gray-900">{company.campaign || <span className="text-gray-300">—</span>}</p>
                </div>
                <div>
                  <p className={lbl}>Source Origin</p>
                  <p className="text-gray-900">{company.how_did_you_hear || <span className="text-gray-300">—</span>}</p>
                </div>
              </div>
            )}

            {/* ── TAGS TAB ── */}
            {leftTab === 'tags' && (
              <div>
                {(!company.tags || company.tags.length === 0) ? (
                  <p className="text-xs text-gray-400 italic text-center py-6">No tags on file — click edit to add.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {company.tags.map((tag, i) => (
                      <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-full bg-green-50 text-green-800 text-xs font-medium border border-green-200">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Notes + Call Center Notes + Meta — always visible at bottom */}
            {company.call_center_notes && (
              <div className="mt-5 pt-4 border-t border-gray-100">
                <p className={lbl}>Call Center Notes</p>
                <p className="text-gray-800 text-xs leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">{company.call_center_notes}</p>
              </div>
            )}
            {company.notes && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className={lbl}>Notes</p>
                <p className="text-gray-800 text-xs leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">{company.notes}</p>
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400 space-y-1">
              <p>Created: {fmtDate(company.created_at)}</p>
              {company.updated_at !== company.created_at && <p>Updated: {fmtDate(company.updated_at)}</p>}
            </div>
          </div>
        </div>

        {/* ── MIDDLE COLUMN: Communication Log ──────────────────────────── */}
        <div className="flex flex-col bg-gray-50">

          <div className="px-5 py-3 bg-white border-b border-gray-200 flex-shrink-0">
            <h3 className="text-sm font-bold text-gray-700">Communication Log</h3>
            <p className="text-xs text-gray-400 mt-0.5">Notes, calls, emails, texts and updates</p>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {comms.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-300">
                <p className="text-4xl mb-2">💬</p>
                <p className="text-sm">No communications yet — add the first entry below.</p>
              </div>
            )}
            {comms.map(comm => {
              const isSystem = comm.type === 'stage_change' || comm.type === 'system'
              if (isSystem) return (
                <div key={comm.id} className="flex items-center gap-2 text-xs text-gray-400 py-1">
                  <span>{systemIcon[comm.type] || '⚙️'}</span>
                  <span>{comm.content}</span>
                  <span className="ml-auto flex-shrink-0">{timeAgo(comm.created_at)}</span>
                </div>
              )
              const t = commTypeMap[comm.type] || { icon: '📝', label: 'Note' }
              const isOut = comm.direction === 'outbound'
              return (
                <div key={comm.id} className={`flex gap-3 ${isOut ? 'flex-row-reverse' : ''}`}>
                  <div className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center text-sm flex-shrink-0">
                    {t.icon}
                  </div>
                  <div className={`max-w-[75%] ${isOut ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                      isOut ? 'bg-green-700 text-white rounded-tr-sm' : 'bg-white text-gray-800 border border-gray-200 rounded-tl-sm'
                    }`}>
                      <p className="whitespace-pre-wrap leading-relaxed">{comm.content}</p>
                    </div>
                    <div className={`flex items-center gap-2 mt-1 ${isOut ? 'flex-row-reverse' : ''}`}>
                      <span className="text-[10px] text-gray-400">{t.label}</span>
                      {comm.direction && <span className="text-[10px] text-gray-300">·</span>}
                      {comm.direction && <span className="text-[10px] text-gray-400 capitalize">{comm.direction}</span>}
                      <span className="text-[10px] text-gray-300">·</span>
                      <span className="text-[10px] text-gray-400">{timeAgo(comm.created_at)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={commsEndRef} />
          </div>

          <div className="flex-shrink-0 bg-white border-t border-gray-200 px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              {COMM_TYPES.map(t => (
                <button key={t.value} onClick={() => setCommType(t.value)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    commType === t.value ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                  }`}>
                  <span>{t.icon}</span> {t.label}
                </button>
              ))}
              {commType !== 'note' && (
                <div className="ml-auto flex items-center gap-2">
                  {['inbound', 'outbound'].map(d => (
                    <button key={d} onClick={() => setCommDir(d)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors capitalize ${
                        commDir === d ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                      }`}>
                      {d}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <textarea
                value={commContent}
                onChange={e => setCommContent(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComm() } }}
                placeholder={`Add a ${commType}… (Enter to send)`}
                rows={2}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600 resize-none"
              />
              <button onClick={handleAddComm} disabled={sending || !commContent.trim()}
                className="px-4 py-2 bg-green-700 text-white rounded-xl text-sm font-semibold hover:bg-green-800 disabled:opacity-40 transition-colors self-end">
                {sending ? '…' : 'Send'}
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Pipeline ─────────────────────────────────────── */}
        <div className="border-l border-gray-200 bg-white overflow-y-auto">
          <div className="p-5">

            {/* Pipeline stages */}
            <div className="mb-6">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Pipeline</p>
              <div className="space-y-1">
                {STAGES.map((s, i) => {
                  const isActive = company.stage === s.value
                  const stageOrder = STAGES.findIndex(x => x.value === company.stage)
                  const isPast = i < stageOrder && s.value !== 'lost' && company.stage !== 'lost'
                  return (
                    <button key={s.value} onClick={() => handleStageChange(s.value)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors text-left ${
                        isActive ? s.cls + ' ring-1 ring-current'
                        : isPast ? 'bg-gray-50 text-gray-400 border border-transparent'
                        : 'hover:bg-gray-50 text-gray-400 border border-transparent hover:border-gray-200'
                      }`}>
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? s.dot : isPast ? 'bg-gray-300' : 'bg-gray-200'}`} />
                      {s.label}
                      {isActive && <span className="ml-auto text-[9px] opacity-60">CURRENT</span>}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Recent activity */}
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Recent Activity</p>
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">✓</div>
                  <div>
                    <p className="text-xs font-medium text-gray-700">Company Created</p>
                    <p className="text-[10px] text-gray-400">{fmtDate(company.created_at)}</p>
                  </div>
                </div>
                {[...comms].filter(c => c.type === 'stage_change').reverse().slice(0, 5).map(c => (
                  <div key={c.id} className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">🔄</div>
                    <div>
                      <p className="text-xs font-medium text-gray-700">{c.content}</p>
                      <p className="text-[10px] text-gray-400">{timeAgo(c.created_at)}</p>
                    </div>
                  </div>
                ))}
                {comms.filter(c => c.type !== 'stage_change' && c.type !== 'system').length > 0 && (() => {
                  const last = [...comms].filter(c => c.type !== 'stage_change' && c.type !== 'system').at(-1)
                  const t = commTypeMap[last.type] || { icon: '📝', label: 'Note' }
                  return (
                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">{t.icon}</div>
                      <div>
                        <p className="text-xs font-medium text-gray-700">Last {t.label}</p>
                        <p className="text-[10px] text-gray-500 truncate max-w-[120px]">{last.content}</p>
                        <p className="text-[10px] text-gray-400">{timeAgo(last.created_at)}</p>
                      </div>
                    </div>
                  )
                })()}
                {comms.length === 0 && <p className="text-xs text-gray-400 italic">No activity yet</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit modal */}
      {showEdit && (
        <EditCompanyModal
          company={company}
          onSave={updated => { setCompany(updated); setShowEdit(false) }}
          onClose={() => setShowEdit(false)}
        />
      )}

      {/* Delete confirmation */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                  <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-9" stroke="#ef4444" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Delete Company</h3>
                <p className="text-xs text-gray-400 mt-0.5">This cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Are you sure you want to delete <span className="font-semibold text-gray-800">{company.company_name}</span>? All communication history will also be permanently removed.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDelete(false)} disabled={deleting}
                className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
