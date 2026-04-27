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

// ── Edit Contact Modal ────────────────────────────────────────────────────────
function EditContactModal({ contact, onSave, onClose }) {
  const [form, setForm] = useState({ ...contact })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function handleSave() {
    setSaving(true)
    const { data, error } = await supabase
      .from('contacts')
      .update({
        first_name:           form.first_name?.trim() || '',
        last_name:            form.last_name?.trim()  || '',
        company_name:         form.company_name?.trim() || null,
        secondary_first_name: form.secondary_first_name?.trim() || null,
        secondary_last_name:  form.secondary_last_name?.trim() || null,
        phone:                form.phone?.trim() || null,
        cell:                 form.cell?.trim() || null,
        email:                form.email?.trim() || null,
        street_address:       form.street_address?.trim() || null,
        city:                 form.city?.trim() || null,
        state:                form.state?.trim() || null,
        zip:                  form.zip?.trim() || null,
        company_street:       form.company_street?.trim() || null,
        company_city:         form.company_city?.trim() || null,
        company_state:        form.company_state?.trim() || null,
        company_zip:          form.company_zip?.trim() || null,
        contact_type:         form.contact_type || null,
        source:               form.source?.trim() || null,
        date_of_birth:        form.date_of_birth || null,
        notes:                form.notes?.trim() || null,
        project_description:  form.project_description?.trim() || null,
      })
      .eq('id', contact.id)
      .select()
      .single()
    setSaving(false)
    if (!error && data) onSave(data)
  }

  const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600'
  const lbl = 'block text-xs font-semibold text-gray-500 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Edit Contact</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>First Name</label><input className={inp} value={form.first_name || ''} onChange={e => set('first_name', e.target.value)} /></div>
            <div><label className={lbl}>Last Name</label><input className={inp} value={form.last_name || ''} onChange={e => set('last_name', e.target.value)} /></div>
          </div>
          <div><label className={lbl}>Company</label><input className={inp} value={form.company_name || ''} onChange={e => set('company_name', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Spouse / Partner First</label><input className={inp} value={form.secondary_first_name || ''} onChange={e => set('secondary_first_name', e.target.value)} placeholder="First" /></div>
            <div><label className={lbl}>Spouse / Partner Last</label><input className={inp} value={form.secondary_last_name || ''} onChange={e => set('secondary_last_name', e.target.value)} placeholder="Last" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={lbl}>Phone</label><input className={inp} value={form.phone || ''} onChange={e => set('phone', e.target.value)} /></div>
            <div><label className={lbl}>Cell</label><input className={inp} value={form.cell || ''} onChange={e => set('cell', e.target.value)} /></div>
            <div><label className={lbl}>Email</label><input className={inp} value={form.email || ''} onChange={e => set('email', e.target.value)} /></div>
          </div>
          <div><label className={lbl}>Street Address</label><input className={inp} value={form.street_address || ''} onChange={e => set('street_address', e.target.value)} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={lbl}>City</label><input className={inp} value={form.city || ''} onChange={e => set('city', e.target.value)} /></div>
            <div><label className={lbl}>State</label><input className={inp} value={form.state || ''} onChange={e => set('state', e.target.value)} maxLength={2} /></div>
            <div><label className={lbl}>Zip</label><input className={inp} value={form.zip || ''} onChange={e => set('zip', e.target.value)} /></div>
          </div>
          {form.company_name?.trim() && (
            <div className="border border-gray-200 rounded-xl p-3 bg-gray-50">
              <p className="text-xs font-semibold text-gray-500 mb-2">Company Address</p>
              <div className="space-y-2">
                <input className={inp} value={form.company_street || ''} onChange={e => set('company_street', e.target.value)} placeholder="Company Street Address" />
                <div className="grid grid-cols-3 gap-2">
                  <input className={inp + ' col-span-1'} value={form.company_city || ''} onChange={e => set('company_city', e.target.value)} placeholder="City" />
                  <input className={inp} value={form.company_state || ''} onChange={e => set('company_state', e.target.value)} placeholder="ST" maxLength={2} />
                  <input className={inp} value={form.company_zip || ''} onChange={e => set('company_zip', e.target.value)} placeholder="Zip" />
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Contact Type</label>
              <select className={inp} value={form.contact_type || ''} onChange={e => set('contact_type', e.target.value)}>
                <option value="">— None —</option>
                <option value="Residential">Residential</option>
                <option value="Commercial">Commercial</option>
                <option value="Public Works">Public Works</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Date of Birth</label>
              <input className={inp} type="date" value={form.date_of_birth || ''} onChange={e => set('date_of_birth', e.target.value)} />
            </div>
          </div>
          <div><label className={lbl}>Contact Source</label><input className={inp} value={form.source || ''} onChange={e => set('source', e.target.value)} /></div>
          <div>
            <label className={lbl}>Notes</label>
            <textarea className={inp + ' resize-none'} rows={3} value={form.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="Internal notes…" />
          </div>
          <div>
            <label className={lbl}>Project Description</label>
            <textarea className={inp + ' resize-none'} rows={3} value={form.project_description || ''} onChange={e => set('project_description', e.target.value)} placeholder="Describe the project or work needed…" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2 rounded-lg bg-green-700 text-white text-sm font-semibold hover:bg-green-800 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Detail Page ──────────────────────────────────────────────────────────
export default function ContactDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [contact,  setContact]  = useState(null)
  const [comms,    setComms]    = useState([])
  const [client,   setClient]   = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [leftTab,  setLeftTab]  = useState('main')   // 'main' | 'dnd' | 'tags'
  const [tagInput, setTagInput] = useState('')

  // New communication entry
  const [commType,    setCommType]    = useState('note')
  const [commDir,     setCommDir]     = useState('inbound')
  const [commContent, setCommContent] = useState('')
  const [sending,     setSending]     = useState(false)
  const commsEndRef = useRef(null)

  async function fetchAll() {
    setLoading(true)
    const [{ data: c }, { data: commsData }] = await Promise.all([
      supabase.from('contacts').select('*').eq('id', id).single(),
      supabase.from('contact_communications').select('*').eq('contact_id', id).order('created_at', { ascending: true }),
    ])
    setContact(c)
    setComms(commsData || [])
    if (c?.client_id) {
      const { data: cl } = await supabase.from('clients').select('id, name').eq('id', c.client_id).single()
      setClient(cl)
    }
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [id])

  async function handleStageChange(newStage) {
    const old = contact.stage
    setContact(p => ({ ...p, stage: newStage }))
    await supabase.from('contacts').update({ stage: newStage }).eq('id', id)
    // Log the stage change
    const entry = {
      contact_id: id,
      type: 'stage_change',
      content: `Stage changed from ${stageMap[old]?.label || old} → ${stageMap[newStage]?.label || newStage}`,
      created_by: user?.id || null,
    }
    const { data: newComm } = await supabase.from('contact_communications').insert(entry).select().single()
    if (newComm) setComms(p => [...p, newComm])
  }

  async function handleDndToggle(field) {
    const newVal = !contact[field]
    setContact(p => ({ ...p, [field]: newVal }))
    await supabase.from('contacts').update({ [field]: newVal }).eq('id', id)
  }

  async function handleTagAdd(e) {
    if (e.key !== 'Enter') return
    const tag = tagInput.trim()
    if (!tag) return
    const existing = contact.tags || []
    if (existing.includes(tag)) { setTagInput(''); return }
    const newTags = [...existing, tag]
    setContact(p => ({ ...p, tags: newTags }))
    setTagInput('')
    await supabase.from('contacts').update({ tags: newTags }).eq('id', id)
  }

  async function handleTagRemove(tag) {
    const newTags = (contact.tags || []).filter(t => t !== tag)
    setContact(p => ({ ...p, tags: newTags }))
    await supabase.from('contacts').update({ tags: newTags }).eq('id', id)
  }

  async function handleAddComm() {
    if (!commContent.trim()) return
    setSending(true)
    const entry = {
      contact_id: id,
      type:       commType,
      content:    commContent.trim(),
      direction:  commType === 'note' ? null : commDir,
      created_by: user?.id || null,
    }
    const { data: newComm } = await supabase.from('contact_communications').insert(entry).select().single()
    if (newComm) {
      setComms(p => [...p, newComm])
      setCommContent('')
      setTimeout(() => commsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
    setSending(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>
  )
  if (!contact) return (
    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
      <p className="text-lg font-semibold mb-2">Contact not found</p>
      <button onClick={() => navigate('/contacts')} className="text-green-700 text-sm hover:underline">← Back to Contacts</button>
    </div>
  )

  const stage = stageMap[contact.stage] || STAGES[0]
  const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(' ')
  const displayName = contact.last_name
    ? `${contact.last_name}${contact.first_name ? ', ' + contact.first_name : ''}`
    : contact.first_name || 'Unnamed'

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-6 py-3 bg-white border-b border-gray-200 flex-shrink-0">
        <button onClick={() => navigate('/contacts')} className="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1">
          ← Contacts
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-semibold text-gray-700">{displayName}</span>
      </div>

      {/* 3-column layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── LEFT COLUMN: Contact Details ──────────────────────────────── */}
        <div className="w-72 flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
          <div className="p-5">

            {/* Avatar + name */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-800 font-bold text-lg flex-shrink-0">
                  {(contact.first_name?.[0] || contact.last_name?.[0] || '?').toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 leading-tight">{fullName || 'Unnamed'}</h2>
                  {contact.company_name && <p className="text-xs text-gray-500 mt-0.5">{contact.company_name}</p>}
                </div>
              </div>
              <button
                onClick={() => setShowEdit(true)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors"
                title="Edit contact"
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <path d="M11.5 1.5a1.414 1.414 0 0 1 2 2L5 12l-3 1 1-3 8.5-8.5z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Stage selector */}
            <div className="mb-4">
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Stage</label>
              <select
                value={contact.stage}
                onChange={e => handleStageChange(e.target.value)}
                className={`w-full border rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none cursor-pointer ${stage.cls}`}
              >
                {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            {/* ── Tab bar ── */}
            <div className="flex border-b border-gray-200 mb-4 -mx-5 px-5">
              {[
                { key: 'main', label: 'Main' },
                { key: 'dnd',  label: 'DND'  },
                { key: 'tags', label: 'Tags' },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setLeftTab(t.key)}
                  className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                    leftTab === t.key
                      ? 'border-green-600 text-green-700'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {t.label}
                  {t.key === 'dnd' && (contact.dnd_phone || contact.dnd_email || contact.dnd_sms) && (
                    <span className="ml-1 w-1.5 h-1.5 rounded-full bg-red-500 inline-block align-middle" />
                  )}
                  {t.key === 'tags' && (contact.tags?.length > 0) && (
                    <span className="ml-1 text-[10px] bg-gray-100 text-gray-500 rounded-full px-1">{contact.tags.length}</span>
                  )}
                </button>
              ))}
            </div>

            {/* ── MAIN TAB ── */}
            {leftTab === 'main' && (
              <div className="space-y-3 text-sm">
                {(contact.secondary_first_name || contact.secondary_last_name) && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Spouse / Partner</p>
                    <p className="text-gray-700">
                      {[contact.secondary_first_name, contact.secondary_last_name].filter(Boolean).join(' ')}
                    </p>
                  </div>
                )}
                {contact.contact_type && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Contact Type</p>
                    <p className="text-gray-700">{contact.contact_type}</p>
                  </div>
                )}
                {contact.phone && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Phone</p>
                    <a href={`tel:${contact.phone}`} className="text-gray-700 hover:text-green-700">{contact.phone}</a>
                  </div>
                )}
                {contact.cell && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Cell</p>
                    <a href={`tel:${contact.cell}`} className="text-gray-700 hover:text-green-700">{contact.cell}</a>
                  </div>
                )}
                {contact.email && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Email</p>
                    <a href={`mailto:${contact.email}`} className="text-gray-700 hover:text-green-700 break-all">{contact.email}</a>
                  </div>
                )}
                {(contact.street_address || contact.city) && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Address</p>
                    {contact.street_address && <p className="text-gray-700">{contact.street_address}</p>}
                    <p className="text-gray-700">{[contact.city, contact.state, contact.zip].filter(Boolean).join(', ')}</p>
                  </div>
                )}
                {contact.company_name && (contact.company_street || contact.company_city) && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Company Address</p>
                    {contact.company_street && <p className="text-gray-700">{contact.company_street}</p>}
                    <p className="text-gray-700">{[contact.company_city, contact.company_state, contact.company_zip].filter(Boolean).join(', ')}</p>
                  </div>
                )}
                {contact.date_of_birth && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Date of Birth</p>
                    <p className="text-gray-700">{new Date(contact.date_of_birth + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                )}
                {contact.source && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Contact Source</p>
                    <p className="text-gray-700">{contact.source}</p>
                  </div>
                )}
                {contact.notes && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Notes</p>
                    <p className="text-gray-600 text-xs leading-relaxed whitespace-pre-wrap">{contact.notes}</p>
                  </div>
                )}
                {contact.project_description && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Project Description</p>
                    <p className="text-gray-600 text-xs leading-relaxed whitespace-pre-wrap">{contact.project_description}</p>
                  </div>
                )}
              </div>
            )}

            {/* ── DND TAB ── */}
            {leftTab === 'dnd' && (
              <div className="space-y-1">
                <p className="text-xs text-gray-400 mb-3">Toggle channels to stop all outreach on that medium. Changes save instantly.</p>
                {[
                  { field: 'dnd_phone', label: 'Phone Calls',  icon: '📞', desc: 'No outbound calls' },
                  { field: 'dnd_email', label: 'Email',        icon: '✉️', desc: 'No marketing emails' },
                  { field: 'dnd_sms',   label: 'SMS / Text',   icon: '💬', desc: 'No text messages' },
                ].map(({ field, label, icon, desc }) => (
                  <div
                    key={field}
                    onClick={() => handleDndToggle(field)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                      contact[field]
                        ? 'bg-red-50 border-red-200'
                        : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{icon}</span>
                      <div>
                        <p className={`text-xs font-semibold ${contact[field] ? 'text-red-700' : 'text-gray-700'}`}>{label}</p>
                        <p className="text-[10px] text-gray-400">{contact[field] ? 'DND active' : desc}</p>
                      </div>
                    </div>
                    {/* Toggle switch */}
                    <div className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${contact[field] ? 'bg-red-500' : 'bg-gray-300'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${contact[field] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </div>
                  </div>
                ))}
                {(contact.dnd_phone || contact.dnd_email || contact.dnd_sms) && (
                  <div className="mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs font-semibold text-red-700">⚠ DND Active</p>
                    <p className="text-[10px] text-red-500 mt-0.5">
                      {[contact.dnd_phone && 'Phone', contact.dnd_email && 'Email', contact.dnd_sms && 'SMS'].filter(Boolean).join(', ')} restricted
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── TAGS TAB ── */}
            {leftTab === 'tags' && (
              <div>
                <p className="text-xs text-gray-400 mb-3">Type a tag and press Enter to add it.</p>
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleTagAdd}
                  placeholder="Add tag…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600"
                />
                {contact.tags?.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {contact.tags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 border border-green-200 text-green-800 text-xs font-medium rounded-full"
                      >
                        {tag}
                        <button
                          onClick={() => handleTagRemove(tag)}
                          className="text-green-500 hover:text-red-500 transition-colors leading-none"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic text-center py-4">No tags yet</p>
                )}
              </div>
            )}

            {/* Linked client */}
            <div className="mt-5 pt-4 border-t border-gray-100">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Linked Client</p>
              {client ? (
                <Link to={`/clients/${client.id}`} className="flex items-center gap-2 text-sm text-green-700 hover:text-green-900 font-medium hover:underline">
                  <span>👥</span> {client.name}
                </Link>
              ) : (
                <p className="text-xs text-gray-400 italic">No client linked yet</p>
              )}
            </div>

            {/* Meta */}
            <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400 space-y-1">
              <p>Created: {fmtDate(contact.created_at)}</p>
              {contact.updated_at !== contact.created_at && <p>Updated: {fmtDate(contact.updated_at)}</p>}
            </div>
          </div>
        </div>

        {/* ── MIDDLE COLUMN: Communication Log ──────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 bg-gray-50">

          {/* Log header */}
          <div className="px-5 py-3 bg-white border-b border-gray-200 flex-shrink-0">
            <h3 className="text-sm font-bold text-gray-700">Communication Log</h3>
            <p className="text-xs text-gray-400 mt-0.5">Notes, calls, emails, texts and updates</p>
          </div>

          {/* Messages */}
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

          {/* Add entry form */}
          <div className="flex-shrink-0 bg-white border-t border-gray-200 px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              {COMM_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setCommType(t.value)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    commType === t.value
                      ? 'bg-green-700 text-white border-green-700'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <span>{t.icon}</span> {t.label}
                </button>
              ))}
              {commType !== 'note' && (
                <div className="ml-auto flex items-center gap-2">
                  {['inbound', 'outbound'].map(d => (
                    <button
                      key={d}
                      onClick={() => setCommDir(d)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors capitalize ${
                        commDir === d ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                      }`}
                    >
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
              <button
                onClick={handleAddComm}
                disabled={sending || !commContent.trim()}
                className="px-4 py-2 bg-green-700 text-white rounded-xl text-sm font-semibold hover:bg-green-800 disabled:opacity-40 transition-colors self-end"
              >
                {sending ? '…' : 'Send'}
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Activity & Pipeline ─────────────────────────── */}
        <div className="w-64 flex-shrink-0 border-l border-gray-200 bg-white overflow-y-auto">
          <div className="p-5">

            {/* Pipeline stages */}
            <div className="mb-6">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Pipeline</p>
              <div className="space-y-1">
                {STAGES.map((s, i) => {
                  const isActive = contact.stage === s.value
                  const stageOrder = STAGES.findIndex(x => x.value === contact.stage)
                  const isPast = i < stageOrder && s.value !== 'lost' && contact.stage !== 'lost'
                  return (
                    <button
                      key={s.value}
                      onClick={() => handleStageChange(s.value)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors text-left ${
                        isActive
                          ? s.cls + ' ring-1 ring-current'
                          : isPast
                          ? 'bg-gray-50 text-gray-400 border border-transparent'
                          : 'hover:bg-gray-50 text-gray-400 border border-transparent hover:border-gray-200'
                      }`}
                    >
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
                {/* Contact created */}
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">✓</div>
                  <div>
                    <p className="text-xs font-medium text-gray-700">Contact Created</p>
                    <p className="text-[10px] text-gray-400">{fmtDate(contact.created_at)}</p>
                  </div>
                </div>

                {/* Stage changes from comms log */}
                {[...comms]
                  .filter(c => c.type === 'stage_change')
                  .reverse()
                  .slice(0, 5)
                  .map(c => (
                    <div key={c.id} className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">🔄</div>
                      <div>
                        <p className="text-xs font-medium text-gray-700">{c.content}</p>
                        <p className="text-[10px] text-gray-400">{timeAgo(c.created_at)}</p>
                      </div>
                    </div>
                  ))
                }

                {/* Last communication */}
                {comms.filter(c => c.type !== 'stage_change' && c.type !== 'system').length > 0 && (() => {
                  const last = [...comms].filter(c => c.type !== 'stage_change' && c.type !== 'system').at(-1)
                  const t = commTypeMap[last.type] || { icon: '📝', label: 'Note' }
                  return (
                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">{t.icon}</div>
                      <div>
                        <p className="text-xs font-medium text-gray-700">Last {t.label}</p>
                        <p className="text-[10px] text-gray-500 truncate max-w-[140px]">{last.content}</p>
                        <p className="text-[10px] text-gray-400">{timeAgo(last.created_at)}</p>
                      </div>
                    </div>
                  )
                })()}

                {comms.length === 0 && (
                  <p className="text-xs text-gray-400 italic">No activity yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showEdit && (
        <EditContactModal
          contact={contact}
          onSave={updated => { setContact(updated); setShowEdit(false) }}
          onClose={() => setShowEdit(false)}
        />
      )}
    </div>
  )
}
