import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { fetchAssignableEmployees } from '../lib/assignableEmployees'

// ── Stage config ──────────────────────────────────────────────────────────────
const STAGES = [
  {
    value: 'new_lead',
    label: 'New Lead',
    cls: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
  {
    value: 'warm_lead',
    label: 'Warm Lead',
    cls: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    dot: 'bg-yellow-400',
  },
  {
    value: 'consultation',
    label: 'Consultation',
    cls: 'bg-purple-50 text-purple-700 border-purple-200',
    dot: 'bg-purple-500',
  },
  {
    value: 'quoted',
    label: 'Quoted',
    cls: 'bg-orange-50 text-orange-700 border-orange-200',
    dot: 'bg-orange-400',
  },
  {
    value: 'won',
    label: 'Won',
    cls: 'bg-green-50 text-green-700 border-green-200',
    dot: 'bg-green-500',
  },
  { value: 'lost', label: 'Lost', cls: 'bg-red-50 text-red-600 border-red-200', dot: 'bg-red-500' },
  {
    value: 'nurture',
    label: 'Nurture',
    cls: 'bg-teal-50 text-teal-700 border-teal-200',
    dot: 'bg-teal-500',
  },
  {
    value: 'bt_import',
    label: 'BT Import',
    cls: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  {
    value: 'ghl_import',
    label: 'GHL Import',
    cls: 'bg-sky-50 text-sky-700 border-sky-200',
    dot: 'bg-sky-500',
  },
]
const stageMap = Object.fromEntries(STAGES.map(s => [s.value, s]))

const COMM_TYPES = [
  { value: 'note', label: 'Note', icon: '📝' },
  { value: 'call', label: 'Call', icon: '📞' },
  { value: 'email', label: 'Email', icon: '✉️' },
  { value: 'text', label: 'Text', icon: '💬' },
]
const commTypeMap = Object.fromEntries(COMM_TYPES.map(t => [t.value, t]))
const systemIcon = { stage_change: '🔄', system: '⚙️' }

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function fmtDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// ── Shared: Company Contacts Editor ──────────────────────────────────────────
// ── Edit Contact Modal (Individual) ──────────────────────────────────────────
function EditContactModal({ contact, onSave, onClose }) {
  const [form, setForm] = useState({ ...contact })
  const [saving, setSaving] = useState(false)
  const [assignees, setAssignees] = useState([])
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    fetchAssignableEmployees().then(setAssignees)
  }, [])

  async function handleSave() {
    setSaving(true)
    const { data, error } = await supabase
      .from('contacts')
      .update({
        first_name: form.first_name?.trim() || '',
        last_name: form.last_name?.trim() || '',
        secondary_first_name: form.secondary_first_name?.trim() || null,
        secondary_last_name: form.secondary_last_name?.trim() || null,
        phone: form.phone?.trim() || null,
        cell: form.cell?.trim() || null,
        email: form.email?.trim() || null,
        street_address: form.street_address?.trim() || null,
        city: form.city?.trim() || null,
        state: form.state?.trim() || null,
        zip: form.zip?.trim() || null,
        contact_type: form.contact_type || null,
        source: form.source?.trim() || null,
        campaign: form.campaign?.trim() || null,
        how_did_you_hear: form.how_did_you_hear?.trim() || null,
        date_of_birth: form.date_of_birth || null,
        notes: form.notes?.trim() || null,
        project_description: form.project_description?.trim() || null,
        ghl_assigned_to: form.ghl_assigned_to?.trim() || null,
        consultation_type: form.consultation_type || null,
        call_center_notes: form.call_center_notes?.trim() || null,
        interest_1: form.interest_1 || null,
        interest_2: form.interest_2 || null,
        interest_3: form.interest_3 || null,
        additional_emails: form._additionalEmailsRaw
          ? form._additionalEmailsRaw
              .split(/[\n,]+/)
              .map(e => e.trim())
              .filter(Boolean)
          : form.additional_emails || null,
        additional_phones: form._additionalPhonesRaw
          ? form._additionalPhonesRaw
              .split(/[\n,]+/)
              .map(p => p.trim())
              .filter(Boolean)
          : form.additional_phones || null,
      })
      .eq('id', contact.id)
      .select()
      .single()
    setSaving(false)
    if (!error && data) onSave(data)
  }

  const inp =
    'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600'
  const lbl = 'block text-xs font-semibold text-gray-500 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Edit Contact</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
            ✕
          </button>
        </div>
        <div className="space-y-3">
          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>First Name</label>
              <input
                className={inp}
                value={form.first_name || ''}
                onChange={e => set('first_name', e.target.value)}
              />
            </div>
            <div>
              <label className={lbl}>Last Name</label>
              <input
                className={inp}
                value={form.last_name || ''}
                onChange={e => set('last_name', e.target.value)}
              />
            </div>
          </div>
          {/* Spouse / Partner */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Spouse / Partner First</label>
              <input
                className={inp}
                value={form.secondary_first_name || ''}
                onChange={e => set('secondary_first_name', e.target.value)}
                placeholder="First"
              />
            </div>
            <div>
              <label className={lbl}>Spouse / Partner Last</label>
              <input
                className={inp}
                value={form.secondary_last_name || ''}
                onChange={e => set('secondary_last_name', e.target.value)}
                placeholder="Last"
              />
            </div>
          </div>
          {/* Phone / Cell / Email */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={lbl}>Phone</label>
              <input
                className={inp}
                value={form.phone || ''}
                onChange={e => set('phone', e.target.value)}
              />
            </div>
            <div>
              <label className={lbl}>Cell</label>
              <input
                className={inp}
                value={form.cell || ''}
                onChange={e => set('cell', e.target.value)}
              />
            </div>
            <div>
              <label className={lbl}>Email</label>
              <input
                className={inp}
                value={form.email || ''}
                onChange={e => set('email', e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className={lbl}>
              Additional Emails <span className="font-normal text-gray-400">(one per line)</span>
            </label>
            <textarea
              className={inp + ' resize-none'}
              rows={2}
              value={form._additionalEmailsRaw ?? (form.additional_emails || []).join('\n')}
              onChange={e => set('_additionalEmailsRaw', e.target.value)}
              placeholder="extra@email.com"
            />
          </div>
          <div>
            <label className={lbl}>
              Additional Phones <span className="font-normal text-gray-400">(one per line)</span>
            </label>
            <textarea
              className={inp + ' resize-none'}
              rows={2}
              value={form._additionalPhonesRaw ?? (form.additional_phones || []).join('\n')}
              onChange={e => set('_additionalPhonesRaw', e.target.value)}
              placeholder="+1 (555) 000-0000"
            />
          </div>
          {/* Address */}
          <div>
            <label className={lbl}>Street Address</label>
            <input
              className={inp}
              value={form.street_address || ''}
              onChange={e => set('street_address', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={lbl}>City</label>
              <input
                className={inp}
                value={form.city || ''}
                onChange={e => set('city', e.target.value)}
              />
            </div>
            <div>
              <label className={lbl}>State</label>
              <input
                className={inp}
                value={form.state || ''}
                onChange={e => set('state', e.target.value)}
                maxLength={2}
              />
            </div>
            <div>
              <label className={lbl}>Zip</label>
              <input
                className={inp}
                value={form.zip || ''}
                onChange={e => set('zip', e.target.value)}
              />
            </div>
          </div>
          {/* Assigned To / Consultation Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Assigned To</label>
              <select
                className={inp}
                value={form.ghl_assigned_to || ''}
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
              <label className={lbl}>Consultation Type</label>
              <select
                className={inp}
                value={form.consultation_type || ''}
                onChange={e => set('consultation_type', e.target.value)}
              >
                <option value="">— None —</option>
                <option value="Design">Design</option>
                <option value="Estimate">Estimate</option>
              </select>
            </div>
          </div>
          <div>
            <label className={lbl}>Notes</label>
            <textarea
              className={inp + ' resize-none'}
              rows={3}
              value={form.notes || ''}
              onChange={e => set('notes', e.target.value)}
              placeholder="Internal notes…"
            />
          </div>
          <div>
            <label className={lbl}>Project Description</label>
            <textarea
              className={inp + ' resize-none'}
              rows={3}
              value={form.project_description || ''}
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
                <label className={lbl}>Contact Type</label>
                <select
                  className={inp}
                  value={form.contact_type || ''}
                  onChange={e => set('contact_type', e.target.value)}
                >
                  <option value="">— None —</option>
                  <option value="Residential">Residential</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Public Works">Public Works</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Source Type</label>
                <input
                  className={inp}
                  value={form.source || ''}
                  onChange={e => set('source', e.target.value)}
                  placeholder="e.g. Google, Referral…"
                />
              </div>
              <div>
                <label className={lbl}>Campaign</label>
                <input
                  className={inp}
                  value={form.campaign || ''}
                  onChange={e => set('campaign', e.target.value)}
                  placeholder="e.g. Spring Promo, Google Ads…"
                />
              </div>
              <div>
                <label className={lbl}>Source Origin</label>
                <input
                  className={inp}
                  value={form.how_did_you_hear || ''}
                  onChange={e => set('how_did_you_hear', e.target.value)}
                  placeholder="How did they hear about us?"
                />
              </div>
              {[
                { key: 'interest_1', label: 'Interested In #1' },
                { key: 'interest_2', label: 'Interested In #2' },
                { key: 'interest_3', label: 'Interested In #3' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className={lbl}>{label}</label>
                  <select
                    className={inp}
                    value={form[key] || ''}
                    onChange={e => set(key, e.target.value)}
                  >
                    <option value="">— None —</option>
                    {[
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
                    ].map(pt => (
                      <option key={pt} value={pt}>
                        {pt}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
          {/* Call Center Notes */}
          <div className="pt-3 border-t border-gray-100">
            <label className={lbl}>Call Center Notes</label>
            <textarea
              className={inp + ' resize-none'}
              rows={3}
              value={form.call_center_notes || ''}
              onChange={e => set('call_center_notes', e.target.value)}
              placeholder="Notes from call center…"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 rounded-lg bg-green-700 text-white text-sm font-semibold hover:bg-green-800 disabled:opacity-50"
          >
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

  const [contact, setContact] = useState(null)
  const [comms, setComms] = useState([])
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showMove, setShowMove] = useState(false)
  const [moving, setMoving] = useState(false)
  const [addingAsClient, setAddingAsClient] = useState(false)
  const [clientAdded, setClientAdded] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [leftTab, setLeftTab] = useState('main') // 'main' | 'dnd' | 'tags'
  const [tagInput, setTagInput] = useState('')

  // New communication entry
  const [commType, setCommType] = useState('note')
  const [commDir, setCommDir] = useState('inbound')
  const [commContent, setCommContent] = useState('')
  const [sending, setSending] = useState(false)
  const commsEndRef = useRef(null)

  async function fetchAll() {
    setLoading(true)
    const [{ data: c }, { data: commsData }] = await Promise.all([
      supabase.from('contacts').select('*').eq('id', id).single(),
      supabase
        .from('contact_communications')
        .select('*')
        .eq('contact_id', id)
        .order('created_at', { ascending: true }),
    ])
    setContact(c)
    setComms(commsData || [])
    if (c?.client_id) {
      const { data: cl } = await supabase
        .from('clients')
        .select('id, name')
        .eq('id', c.client_id)
        .single()
      setClient(cl)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchAll()
  }, [id])

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
    const { data: newComm } = await supabase
      .from('contact_communications')
      .insert(entry)
      .select()
      .single()
    if (newComm) setComms(p => [...p, newComm])
  }

  async function handleDelete() {
    setDeleting(true)
    await supabase.from('contact_communications').delete().eq('contact_id', id)
    await supabase.from('contacts').delete().eq('id', id)
    navigate('/contacts')
  }

  async function handleMoveToCompany() {
    setMoving(true)
    const c = contact
    const companyName = [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Unnamed'

    // Only pass contact_type values that pass the companies check constraint
    const VALID_COMPANY_TYPES = ['Residential', 'Commercial', 'HOA', 'Government', 'Other']
    const safeType = VALID_COMPANY_TYPES.includes(c.contact_type) ? c.contact_type : null

    const { data: newCompany, error } = await supabase
      .from('companies')
      .insert({
        company_name: companyName,
        company_street: c.street_address || null,
        company_city: c.city || null,
        company_state: c.state || null,
        company_zip: c.zip || null,
        phone: c.phone || c.cell || null,
        email: c.email || null,
        ghl_assigned_to: c.ghl_assigned_to || null,
        stage: c.stage || 'new_lead',
        contact_type: safeType,
        source: c.source || null,
        campaign: c.campaign || null,
        how_did_you_hear: c.how_did_you_hear || null,
        notes: c.notes || null,
        project_description: c.project_description || null,
        call_center_notes: c.call_center_notes || null,
        company_contacts: [],
      })
      .select()
      .single()

    if (error || !newCompany) {
      setMoving(false)
      alert('Move failed: ' + (error?.message || 'unknown error'))
      return
    }

    // Migrate communication history
    if (comms.length > 0) {
      const migratedComms = comms.map(({ id: _id, contact_id: _cid, ...rest }) => ({
        ...rest,
        company_id: newCompany.id,
      }))
      await supabase.from('company_communications').insert(migratedComms)
    }

    // Remove original individual record
    await supabase.from('contact_communications').delete().eq('contact_id', id)
    await supabase.from('contacts').delete().eq('id', id)

    navigate(`/companies/${newCompany.id}`)
  }

  async function handleAddAsClient() {
    setAddingAsClient(true)
    const c = contact
    const name = [c.first_name, c.last_name].filter(Boolean).join(' ')
    // Capture the new client's id (.select().single()) so we can write it
    // back to contacts.client_id below — this makes the contact↔client
    // link bidirectional and lets the Job's Client tab join across both.
    const { data: newClient, error } = await supabase
      .from('clients')
      .insert({
        client_type: 'individual',
        first_name: c.first_name || null,
        last_name: c.last_name || null,
        name,
        spouse_first_name: c.secondary_first_name || null,
        spouse_last_name: c.secondary_last_name || null,
        email: c.email || null,
        phone: c.phone || null,
        cell: c.cell || null,
        additional_emails:
          Array.isArray(c.additional_emails) && c.additional_emails.length
            ? c.additional_emails
            : null,
        additional_phones:
          Array.isArray(c.additional_phones) && c.additional_phones.length
            ? c.additional_phones
            : null,
        street: c.street_address || null,
        city: c.city || null,
        state: c.state || null,
        zip: c.zip || null,
        notes: c.notes || null,
        created_by: user?.id,
      })
      .select('id')
      .single()

    if (!error && newClient?.id) {
      // Stamp the new client's id on the contact so the reverse link works.
      await supabase.from('contacts').update({ client_id: newClient.id }).eq('id', id)
      setContact(p => ({ ...p, client_id: newClient.id }))
    }
    setAddingAsClient(false)
    if (!error) setClientAdded(true)
  }

  async function handleContactTypeChange(newType) {
    setContact(p => ({ ...p, contact_type: newType }))
    await supabase.from('contacts').update({ contact_type: newType }).eq('id', id)
  }

  async function handleDndToggle(field) {
    const newVal = !contact[field]
    setContact(p => ({ ...p, [field]: newVal }))
    await supabase
      .from('contacts')
      .update({ [field]: newVal })
      .eq('id', id)
  }

  async function handleTagAdd(e) {
    if (e.key !== 'Enter') return
    const tag = tagInput.trim()
    if (!tag) return
    const existing = contact.tags || []
    if (existing.includes(tag)) {
      setTagInput('')
      return
    }
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
      type: commType,
      content: commContent.trim(),
      direction: commType === 'note' ? null : commDir,
      created_by: user?.id || null,
    }
    const { data: newComm } = await supabase
      .from('contact_communications')
      .insert(entry)
      .select()
      .single()
    if (newComm) {
      setComms(p => [...p, newComm])
      setCommContent('')
      setTimeout(() => commsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
    setSending(false)
  }

  if (loading)
    return <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>
  if (!contact)
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <p className="text-lg font-semibold mb-2">Contact not found</p>
        <button
          onClick={() => navigate('/contacts')}
          className="text-green-700 text-sm hover:underline"
        >
          ← Back to Contacts
        </button>
      </div>
    )

  const stage = stageMap[contact.stage] || STAGES[0]
  const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(' ')
  const displayName = contact.last_name
    ? `${contact.last_name}${contact.first_name ? ', ' + contact.first_name : ''}`
    : contact.first_name || 'Unnamed'

  return (
    <div className="flex flex-col h-full">
      {/* Top nav bar — sits on the main page background */}
      <div className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl flex-shrink-0 mx-3 mt-3">
        <button
          onClick={() => navigate('/contacts')}
          className="text-gray-900 hover:text-gray-600 text-sm font-medium"
        >
          Contacts
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-900">Individual Contact</span>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-semibold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md">
          {fullName || 'Unnamed'}
        </span>
      </div>

      {/* Padded wrapper — exposes the main background around the slate block */}
      <div className="flex-1 min-h-0 p-3">
        {/* Rounded slate container */}
        <div className="h-full bg-slate-200 rounded-xl overflow-y-auto lg:overflow-hidden">
          {/* 3-column on desktop; stacks to a single scrolling column on mobile
              (the fixed 3-col widths were wider than a phone, cutting off the
              right side). */}
          <div className="grid grid-cols-1 lg:grid-cols-[23rem_minmax(0,1fr)_15rem] lg:h-full lg:overflow-hidden">
            {/* ── LEFT COLUMN ───────────────────────────────────────────────── */}
            <div className="lg:border-r border-slate-300 bg-slate-200 lg:overflow-y-auto">
              <div className="p-3 space-y-2">
                {/* Card 1: Identity */}
                <div className="bg-white border border-slate-300 rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center text-green-800 font-bold text-lg flex-shrink-0">
                        {(contact.first_name?.[0] || contact.last_name?.[0] || '?').toUpperCase()}
                      </div>
                      <h2 className="text-base font-bold text-gray-900 leading-tight">
                        {fullName || 'Unnamed'}
                      </h2>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setShowEdit(true)}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-slate-200 transition-colors"
                        title="Edit contact"
                      >
                        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M11.5 1.5a1.414 1.414 0 0 1 2 2L5 12l-3 1 1-3 8.5-8.5z"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => setShowMove(true)}
                        className="text-gray-400 hover:text-blue-500 p-1 rounded hover:bg-blue-50 transition-colors"
                        title="Convert to Company"
                      >
                        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M2 5h9M8 2l3 3-3 3M14 11H5M8 8l-3 3 3 3"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => setShowDelete(true)}
                        className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
                        title="Delete contact"
                      >
                        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-9"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                        Spouse / Partner
                      </p>
                      <p className="font-semibold text-gray-900">
                        {[contact.secondary_first_name, contact.secondary_last_name]
                          .filter(Boolean)
                          .join(' ') || <span className="text-gray-300">—</span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                        Address
                      </p>
                      {contact.street_address || contact.city || contact.state || contact.zip ? (
                        <>
                          <p className="font-semibold text-gray-900">{contact.street_address}</p>
                          <p className="font-semibold text-gray-900">
                            {[contact.city, contact.state, contact.zip].filter(Boolean).join(', ')}
                          </p>
                        </>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                          Phone
                        </p>
                        {contact.phone ? (
                          <a
                            href={`tel:${contact.phone}`}
                            className="font-semibold text-gray-900 hover:text-green-700"
                          >
                            {contact.phone}
                          </a>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                          Cell
                        </p>
                        {contact.cell ? (
                          <a
                            href={`tel:${contact.cell}`}
                            className="font-semibold text-gray-900 hover:text-green-700"
                          >
                            {contact.cell}
                          </a>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                        Email
                      </p>
                      {contact.email ? (
                        <a
                          href={`mailto:${contact.email}`}
                          className="font-semibold text-gray-900 hover:text-green-700 break-all"
                        >
                          {contact.email}
                        </a>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card 2: Stage */}
                <div className="bg-white border border-slate-300 rounded-xl p-3 shadow-sm">
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Stage
                  </label>
                  <select
                    value={contact.stage}
                    onChange={e => handleStageChange(e.target.value)}
                    className={`w-full border rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none cursor-pointer ${stage.cls}`}
                  >
                    {STAGES.map(s => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tab bar — sits on the slate-100 background */}
                <div className="flex px-1 border-b border-slate-300">
                  {[
                    { key: 'main', label: 'More Info' },
                    { key: 'marketing', label: 'Marketing' },
                    { key: 'dnd', label: 'DND' },
                    { key: 'tags', label: 'Tags' },
                  ].map(t => (
                    <button
                      key={t.key}
                      onClick={() => setLeftTab(t.key)}
                      className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                        leftTab === t.key
                          ? 'border-green-600 text-green-700'
                          : 'border-transparent text-gray-900 hover:text-black'
                      }`}
                    >
                      {t.label}
                      {t.key === 'dnd' &&
                        (contact.dnd_phone || contact.dnd_email || contact.dnd_sms) && (
                          <span className="ml-1 w-1.5 h-1.5 rounded-full bg-red-500 inline-block align-middle" />
                        )}
                      {t.key === 'tags' && contact.tags?.length > 0 && (
                        <span className="ml-1 text-[10px] bg-slate-200 text-gray-600 rounded-full px-1">
                          {contact.tags.length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Card 3: Tab content */}
                <div className="bg-white border border-slate-300 rounded-xl p-4 shadow-sm">
                  {/* MAIN TAB */}
                  {leftTab === 'main' && (
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                          Additional Emails
                        </p>
                        {contact.additional_emails?.length > 0 ? (
                          contact.additional_emails.map((e, i) => (
                            <a
                              key={i}
                              href={`mailto:${e}`}
                              className="block font-semibold text-gray-900 hover:text-green-700 break-all"
                            >
                              {e}
                            </a>
                          ))
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                          Additional Phones
                        </p>
                        {contact.additional_phones?.length > 0 ? (
                          contact.additional_phones.map((p, i) => (
                            <a
                              key={i}
                              href={`tel:${p}`}
                              className="block font-semibold text-gray-900 hover:text-green-700"
                            >
                              {p}
                            </a>
                          ))
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                          Assigned To
                        </p>
                        <p className="font-semibold text-gray-900">
                          {contact.ghl_assigned_to || <span className="text-gray-300">—</span>}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                          Consultation Type
                        </p>
                        <p className="font-semibold text-gray-900">
                          {contact.consultation_type || <span className="text-gray-300">—</span>}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                          Date of Birth
                        </p>
                        <p className="font-semibold text-gray-900">
                          {contact.date_of_birth ? (
                            new Date(contact.date_of_birth + 'T00:00:00').toLocaleDateString(
                              'en-US',
                              { month: 'long', day: 'numeric', year: 'numeric' }
                            )
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                          Project Description
                        </p>
                        {contact.project_description ? (
                          <p className="font-semibold text-gray-900 text-xs leading-relaxed whitespace-pre-wrap">
                            {contact.project_description}
                          </p>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* MARKETING TAB */}
                  {leftTab === 'marketing' && (
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                          Contact Type
                        </p>
                        <select
                          value={contact.contact_type || 'Residential'}
                          onChange={e => handleContactTypeChange(e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600 bg-white cursor-pointer"
                        >
                          <option value="Residential">Residential</option>
                          <option value="Commercial">Commercial</option>
                          <option value="Public Works">Public Works</option>
                        </select>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                          Source Type
                        </p>
                        <p className="font-semibold text-gray-900">
                          {contact.source || <span className="text-gray-300">—</span>}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                          Campaign
                        </p>
                        <p className="font-semibold text-gray-900">
                          {contact.campaign || <span className="text-gray-300">—</span>}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                          Source Origin
                        </p>
                        <p className="font-semibold text-gray-900">
                          {contact.how_did_you_hear || <span className="text-gray-300">—</span>}
                        </p>
                      </div>
                      <div className="pt-2 border-t border-slate-100">
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                          Project Interests
                        </p>
                        <div className="space-y-1.5">
                          {[
                            { label: '#1', val: contact.interest_1 },
                            { label: '#2', val: contact.interest_2 },
                            { label: '#3', val: contact.interest_3 },
                          ].map(({ label, val }) => (
                            <div key={label} className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-400 w-4 flex-shrink-0">
                                {label}
                              </span>
                              {val ? (
                                <span className="text-xs font-medium text-gray-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5">
                                  {val}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-300">—</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* DND TAB */}
                  {leftTab === 'dnd' && (
                    <div className="space-y-1">
                      <p className="text-xs text-gray-400 mb-3">
                        Toggle channels to stop all outreach on that medium. Changes save instantly.
                      </p>
                      {[
                        {
                          field: 'dnd_phone',
                          label: 'Phone Calls',
                          icon: '📞',
                          desc: 'No outbound calls',
                        },
                        {
                          field: 'dnd_email',
                          label: 'Email',
                          icon: '✉️',
                          desc: 'No marketing emails',
                        },
                        {
                          field: 'dnd_sms',
                          label: 'SMS / Text',
                          icon: '💬',
                          desc: 'No text messages',
                        },
                      ].map(({ field, label, icon, desc }) => (
                        <div
                          key={field}
                          onClick={() => handleDndToggle(field)}
                          className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                            contact[field]
                              ? 'bg-red-50 border-red-200'
                              : 'bg-slate-50 border-slate-300 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-base">{icon}</span>
                            <div>
                              <p
                                className={`text-xs font-semibold ${contact[field] ? 'text-red-700' : 'text-gray-700'}`}
                              >
                                {label}
                              </p>
                              <p className="text-[10px] text-gray-400">
                                {contact[field] ? 'DND active' : desc}
                              </p>
                            </div>
                          </div>
                          <div
                            className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${contact[field] ? 'bg-red-500' : 'bg-gray-300'}`}
                          >
                            <div
                              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${contact[field] ? 'translate-x-4' : 'translate-x-0.5'}`}
                            />
                          </div>
                        </div>
                      ))}
                      {(contact.dnd_phone || contact.dnd_email || contact.dnd_sms) && (
                        <div className="mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-xs font-semibold text-red-700">⚠ DND Active</p>
                          <p className="text-[10px] text-red-500 mt-0.5">
                            {[
                              contact.dnd_phone && 'Phone',
                              contact.dnd_email && 'Email',
                              contact.dnd_sms && 'SMS',
                            ]
                              .filter(Boolean)
                              .join(', ')}{' '}
                            restricted
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAGS TAB */}
                  {leftTab === 'tags' && (
                    <div>
                      <p className="text-xs text-gray-400 mb-3">
                        Type a tag and press Enter to add it.
                      </p>
                      <input
                        type="text"
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyDown={handleTagAdd}
                        placeholder="Add tag…"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600"
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
                </div>

                {/* Card 4: Notes + Linked Opportunity + Meta */}
                <div className="bg-white border border-slate-300 rounded-xl p-4 shadow-sm space-y-3">
                  <div>
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Linked Opportunity
                    </p>
                    {client ? (
                      <Link
                        to={`/clients/${client.id}`}
                        className="flex items-center gap-2 text-sm text-green-700 hover:text-green-900 font-medium hover:underline"
                      >
                        <span>👥</span> {client.name}
                      </Link>
                    ) : (
                      <p className="text-xs text-gray-400 italic">No opportunity linked yet</p>
                    )}
                  </div>
                  {contact.call_center_notes && (
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        Call Center Notes
                      </p>
                      <p className="font-semibold text-gray-900 text-xs leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {contact.call_center_notes}
                      </p>
                    </div>
                  )}
                  {contact.notes && (
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        Notes
                      </p>
                      <p className="font-semibold text-gray-900 text-xs leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {contact.notes}
                      </p>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-100 text-xs text-gray-400 space-y-0.5">
                    <p>Created: {fmtDate(contact.created_at)}</p>
                    {contact.updated_at !== contact.created_at && (
                      <p>Updated: {fmtDate(contact.updated_at)}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── MIDDLE COLUMN: Communication Log ──────────────────────────── */}
            <div className="flex flex-col bg-slate-200 p-3 min-h-[70vh] lg:min-h-0">
              {/* Rounded card — same style as pipeline/activity cards */}
              <div className="flex flex-col flex-1 min-h-0 bg-white border border-slate-300 rounded-xl shadow-sm overflow-hidden">
                {/* Title + type selector buttons in the header */}
                <div className="flex-shrink-0 px-4 pt-3 pb-2.5 border-b border-slate-200">
                  <div className="flex items-center justify-between mb-2.5">
                    <div>
                      <h3 className="text-sm font-bold text-gray-700">Communication Log</h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Notes, calls, emails, texts and updates
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {COMM_TYPES.map(t => (
                      <button
                        key={t.value}
                        onClick={() => setCommType(t.value)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                          commType === t.value
                            ? 'bg-green-700 text-white border-green-700'
                            : 'bg-slate-50 text-gray-500 border-slate-300 hover:border-slate-400'
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
                              commDir === d
                                ? 'bg-gray-800 text-white border-gray-800'
                                : 'bg-slate-50 text-gray-500 border-slate-300 hover:border-slate-400'
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Messages — scrollable middle */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50">
                  {comms.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                      <p className="text-4xl mb-2">💬</p>
                      <p className="text-sm">No communications yet — add the first entry below.</p>
                    </div>
                  )}
                  {comms.map(comm => {
                    const isSystem = comm.type === 'stage_change' || comm.type === 'system'
                    if (isSystem)
                      return (
                        <div
                          key={comm.id}
                          className="flex items-center gap-2 text-xs text-gray-400 py-1"
                        >
                          <span>{systemIcon[comm.type] || '⚙️'}</span>
                          <span>{comm.content}</span>
                          <span className="ml-auto flex-shrink-0">{timeAgo(comm.created_at)}</span>
                        </div>
                      )
                    const t = commTypeMap[comm.type] || { icon: '📝', label: 'Note' }
                    const isOut = comm.direction === 'outbound'
                    return (
                      <div
                        key={comm.id}
                        className={`flex gap-3 ${isOut ? 'flex-row-reverse' : ''}`}
                      >
                        <div className="w-7 h-7 rounded-full bg-white border border-slate-300 flex items-center justify-center text-sm flex-shrink-0">
                          {t.icon}
                        </div>
                        <div
                          className={`max-w-[75%] ${isOut ? 'items-end' : 'items-start'} flex flex-col`}
                        >
                          <div
                            className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                              isOut
                                ? 'bg-green-700 text-white rounded-tr-sm'
                                : 'bg-white text-gray-800 border border-slate-300 rounded-tl-sm'
                            }`}
                          >
                            <p className="whitespace-pre-wrap leading-relaxed">{comm.content}</p>
                          </div>
                          <div
                            className={`flex items-center gap-2 mt-1 ${isOut ? 'flex-row-reverse' : ''}`}
                          >
                            <span className="text-[10px] text-gray-400">{t.label}</span>
                            {comm.direction && <span className="text-[10px] text-gray-300">·</span>}
                            {comm.direction && (
                              <span className="text-[10px] text-gray-400 capitalize">
                                {comm.direction}
                              </span>
                            )}
                            <span className="text-[10px] text-gray-300">·</span>
                            <span className="text-[10px] text-gray-400">
                              {timeAgo(comm.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={commsEndRef} />
                </div>

                {/* Input — fixed at bottom, inside the card */}
                <div className="flex-shrink-0 px-4 py-3 border-t border-slate-200 bg-white">
                  <div className="flex gap-2">
                    <textarea
                      value={commContent}
                      onChange={e => setCommContent(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleAddComm()
                        }
                      }}
                      placeholder={`Add a ${commType}… (Enter to send)`}
                      rows={2}
                      className="flex-1 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600 resize-none bg-slate-50"
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
            </div>

            {/* ── RIGHT COLUMN: Pipeline & Activity ─────────────────────────── */}
            <div className="lg:border-l border-slate-300 bg-slate-200 lg:overflow-y-auto">
              <div className="p-3 space-y-2">
                {/* Pipeline card */}
                <div className="bg-white border border-slate-300 rounded-xl p-3 shadow-sm">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Pipeline
                  </p>
                  <div className="space-y-1">
                    {STAGES.map((s, i) => {
                      const isActive = contact.stage === s.value
                      const stageOrder = STAGES.findIndex(x => x.value === contact.stage)
                      const isPast =
                        i < stageOrder && s.value !== 'lost' && contact.stage !== 'lost'
                      return (
                        <button
                          key={s.value}
                          onClick={() => handleStageChange(s.value)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors text-left ${
                            isActive
                              ? s.cls + ' ring-1 ring-current'
                              : isPast
                                ? 'bg-slate-50 text-gray-400 border border-transparent'
                                : 'hover:bg-slate-50 text-gray-400 border border-transparent hover:border-slate-300'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? s.dot : isPast ? 'bg-gray-300' : 'bg-gray-200'}`}
                          />
                          {s.label}
                          {isActive && (
                            <span className="ml-auto text-[9px] opacity-60">CURRENT</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Activity card */}
                <div className="bg-white border border-slate-300 rounded-xl p-3 shadow-sm">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Recent Activity
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                        ✓
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-700">Contact Created</p>
                        <p className="text-[10px] text-gray-400">{fmtDate(contact.created_at)}</p>
                      </div>
                    </div>
                    {[...comms]
                      .filter(c => c.type === 'stage_change')
                      .reverse()
                      .slice(0, 5)
                      .map(c => (
                        <div key={c.id} className="flex items-start gap-2.5">
                          <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                            🔄
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-700">{c.content}</p>
                            <p className="text-[10px] text-gray-400">{timeAgo(c.created_at)}</p>
                          </div>
                        </div>
                      ))}
                    {comms.filter(c => c.type !== 'stage_change' && c.type !== 'system').length >
                      0 &&
                      (() => {
                        const last = [...comms]
                          .filter(c => c.type !== 'stage_change' && c.type !== 'system')
                          .at(-1)
                        const t = commTypeMap[last.type] || { icon: '📝', label: 'Note' }
                        return (
                          <div className="flex items-start gap-2.5">
                            <div className="w-6 h-6 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                              {t.icon}
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-700">Last {t.label}</p>
                              <p className="text-[10px] text-gray-500 truncate max-w-[120px]">
                                {last.content}
                              </p>
                              <p className="text-[10px] text-gray-400">
                                {timeAgo(last.created_at)}
                              </p>
                            </div>
                          </div>
                        )
                      })()}
                    {comms.length === 0 && (
                      <p className="text-xs text-gray-400 italic">No activity yet</p>
                    )}
                  </div>
                </div>

                {/* Add as Opportunity card */}
                <div className="bg-white border border-slate-300 rounded-xl p-3 shadow-sm">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Opportunities
                  </p>
                  {clientAdded ? (
                    <div className="flex items-center gap-2 py-1">
                      <span className="text-green-600 text-sm">✓</span>
                      <p className="text-xs text-green-700 font-semibold">Added as opportunity!</p>
                    </div>
                  ) : (
                    <button
                      onClick={handleAddAsClient}
                      disabled={addingAsClient}
                      className="w-full py-2 rounded-lg bg-green-700 text-white text-xs font-semibold hover:bg-green-800 disabled:opacity-50 transition-colors"
                    >
                      {addingAsClient ? 'Adding…' : '+ Add as Opportunity'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* end rounded slate container */}
      </div>
      {/* end padded wrapper */}

      {showEdit && (
        <EditContactModal
          contact={contact}
          onSave={updated => {
            setContact(updated)
            setShowEdit(false)
          }}
          onClose={() => setShowEdit(false)}
        />
      )}

      {showMove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M2 5h9M8 2l3 3-3 3M14 11H5M8 8l-3 3 3 3"
                    stroke="#3b82f6"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Convert to Company</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  This will move the record to Companies
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              <span className="font-semibold text-gray-800">{displayName}</span> will become a
              Company record named{' '}
              <span className="font-semibold text-gray-800">
                {[contact.first_name, contact.last_name].filter(Boolean).join(' ')}
              </span>
              . All communication history will be carried over.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowMove(false)}
                disabled={moving}
                className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleMoveToCompany}
                disabled={moving}
                className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {moving ? 'Converting…' : 'Convert to Company'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-9"
                    stroke="#ef4444"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Delete Contact</h3>
                <p className="text-xs text-gray-400 mt-0.5">This cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-gray-800">{displayName}</span>? All communication
              history for this contact will also be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDelete(false)}
                disabled={deleting}
                className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? 'Deleting…' : 'Delete Contact'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
