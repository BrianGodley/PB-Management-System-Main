import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ExportModal, ImportModal } from '../components/ContactImportExport'

// ── Stage config ──────────────────────────────────────────────────────────────
const STAGES = [
  { value: 'new_lead',     label: 'New Lead',      cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'warm_lead',    label: 'Warm Lead',     cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  { value: 'consultation', label: 'Consultation',  cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'quoted',       label: 'Quoted',        cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  { value: 'won',          label: 'Won',           cls: 'bg-green-50 text-green-700 border-green-200' },
  { value: 'lost',         label: 'Lost',          cls: 'bg-red-50 text-red-600 border-red-200' },
  { value: 'nurture',      label: 'Nurture',       cls: 'bg-teal-50 text-teal-700 border-teal-200' },
]
const stageMap = Object.fromEntries(STAGES.map(s => [s.value, s]))

const EMPTY_FORM = {
  first_name: '', last_name: '', company_name: '',
  phone: '', email: '',
  street_address: '', city: '', state: '', zip: '',
  stage: 'new_lead', source: '',
}

// ── Add Contact Modal ─────────────────────────────────────────────────────────
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
        first_name:     form.first_name.trim(),
        last_name:      form.last_name.trim(),
        company_name:   form.company_name.trim() || null,
        phone:          form.phone.trim() || null,
        email:          form.email.trim() || null,
        street_address: form.street_address.trim() || null,
        city:           form.city.trim() || null,
        state:          form.state.trim() || null,
        zip:            form.zip.trim() || null,
        stage:          form.stage,
        source:         form.source.trim() || null,
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
          <h2 className="text-lg font-bold text-gray-900">New Contact</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>First Name</label>
              <input className={input} value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="First" />
            </div>
            <div>
              <label className={label}>Last Name <span className="text-red-400">*</span></label>
              <input className={input} value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Last" autoFocus />
            </div>
          </div>

          <div>
            <label className={label}>Company Name</label>
            <input className={input} value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="Optional" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Phone</label>
              <input className={input} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 000-0000" />
            </div>
            <div>
              <label className={label}>Email</label>
              <input className={input} value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" type="email" />
            </div>
          </div>

          <div>
            <label className={label}>Street Address</label>
            <input className={input} value={form.street_address} onChange={e => set('street_address', e.target.value)} placeholder="123 Main St" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className={label}>City</label>
              <input className={input} value={form.city} onChange={e => set('city', e.target.value)} placeholder="City" />
            </div>
            <div>
              <label className={label}>State</label>
              <input className={input} value={form.state} onChange={e => set('state', e.target.value)} placeholder="CA" maxLength={2} />
            </div>
            <div>
              <label className={label}>Zip</label>
              <input className={input} value={form.zip} onChange={e => set('zip', e.target.value)} placeholder="90210" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Stage</label>
              <select className={input} value={form.stage} onChange={e => set('stage', e.target.value)}>
                {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Lead Source</label>
              <input className={input} value={form.source} onChange={e => set('source', e.target.value)} placeholder="Referral, Google…" />
            </div>
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

// ── Main Contacts List ────────────────────────────────────────────────────────
export default function Contacts() {
  const navigate = useNavigate()
  const [contacts,    setContacts]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [search,      setSearch]      = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [showAdd,     setShowAdd]     = useState(false)
  const [showImport,  setShowImport]  = useState(false)
  const [showExport,  setShowExport]  = useState(false)
  const [sortField,   setSortField]   = useState('last_name')
  const [sortAsc,     setSortAsc]     = useState(true)

  async function fetchContacts() {
    setLoading(true)
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true })
    if (error) setError(error.message)
    else setContacts(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchContacts() }, [])

  // Filter + sort
  const q = search.toLowerCase()
  const filtered = contacts
    .filter(c => {
      if (stageFilter !== 'all' && c.stage !== stageFilter) return false
      if (!q) return true
      return (
        `${c.last_name} ${c.first_name}`.toLowerCase().includes(q) ||
        (c.company_name || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        (c.city || '').toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      let av = a[sortField] || '', bv = b[sortField] || ''
      return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av)
    })

  function toggleSort(field) {
    if (sortField === field) setSortAsc(v => !v)
    else { setSortField(field); setSortAsc(true) }
  }

  const thCls = 'text-left px-4 py-2 font-semibold text-gray-600 uppercase cursor-pointer select-none hover:text-gray-800 transition-colors'
  const arrow = field => sortField === field ? (sortAsc ? ' ↑' : ' ↓') : ''

  return (
    <div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0 gap-3">
        <h1 className="text-xl font-bold text-gray-900">Contacts</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="px-3 py-2 border border-gray-200 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5"
          >
            ⬆ Import
          </button>
          <button
            onClick={() => setShowExport(true)}
            className="px-3 py-2 border border-gray-200 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5"
          >
            ⬇ Export
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-800 transition-colors"
          >
            + Add Contact
          </button>
        </div>
      </div>

      {/* Stage filter pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setStageFilter('all')}
          className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${stageFilter === 'all' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
        >
          All
        </button>
        {STAGES.map(s => (
          <button
            key={s.value}
            onClick={() => setStageFilter(stageFilter === s.value ? 'all' : s.value)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${stageFilter === s.value ? s.cls + ' ring-2 ring-offset-1 ring-current' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}
          >
            {s.label}
            <span className="ml-1.5 opacity-60">{contacts.filter(c => c.stage === s.value).length}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name, company, email, phone, city…"
          className="w-full max-w-md border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">Loading…</div>
      ) : error ? (
        <div className="text-red-500 text-sm py-8 text-center">{error}</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="table-fixed w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className={thCls} onClick={() => toggleSort('last_name')}>Name{arrow('last_name')}</th>
                <th className={thCls} onClick={() => toggleSort('company_name')}>Company{arrow('company_name')}</th>
                <th className={thCls}>Phone</th>
                <th className={thCls}>Email</th>
                <th className={thCls} onClick={() => toggleSort('street_address')}>Address{arrow('street_address')}</th>
                <th className={thCls} onClick={() => toggleSort('city')}>City / State{arrow('city')}</th>
                <th className={thCls} onClick={() => toggleSort('stage')}>Stage{arrow('stage')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                    {search || stageFilter !== 'all' ? 'No contacts match your filters.' : 'No contacts yet — add your first one.'}
                  </td>
                </tr>
              ) : filtered.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2">
                    <button
                      onClick={() => navigate(`/contacts/${c.id}`)}
                      className="font-semibold text-green-700 hover:text-green-900 hover:underline text-left"
                    >
                      {c.last_name}{c.first_name ? `, ${c.first_name}` : ''}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-gray-600">{c.company_name || <span className="text-gray-300">—</span>}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > 0 && (
        <p className="text-xs text-gray-400 mt-2">{filtered.length} of {contacts.length} contacts</p>
      )}

      {showAdd && (
        <AddContactModal
          onSave={c => { setContacts(p => [c, ...p]); setShowAdd(false) }}
          onClose={() => setShowAdd(false)}
        />
      )}

      {showImport && (
        <ImportModal
          onDone={() => fetchContacts()}
          onClose={() => setShowImport(false)}
        />
      )}

      {showExport && (
        <ExportModal
          contacts={filtered}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  )
}
