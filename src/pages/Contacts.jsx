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
  { value: 'bt_import',    label: 'BT Import',     cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'ghl_import',   label: 'GHL Import',    cls: 'bg-sky-50 text-sky-700 border-sky-200' },
]
const stageMap = Object.fromEntries(STAGES.map(s => [s.value, s]))

const EMPTY_FORM = {
  first_name: '', last_name: '', company_name: '',
  secondary_first_name: '', secondary_last_name: '',
  phone: '', cell: '', email: '',
  street_address: '', city: '', state: '', zip: '',
  company_street: '', company_city: '', company_state: '', company_zip: '',
  stage: 'new_lead', contact_type: '', source: '', project_description: '',
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
        first_name:           form.first_name.trim(),
        last_name:            form.last_name.trim(),
        company_name:         form.company_name.trim() || null,
        secondary_first_name: form.secondary_first_name.trim() || null,
        secondary_last_name:  form.secondary_last_name.trim() || null,
        phone:                form.phone.trim() || null,
        cell:                 form.cell.trim() || null,
        email:                form.email.trim() || null,
        street_address:       form.street_address.trim() || null,
        city:                 form.city.trim() || null,
        state:                form.state.trim() || null,
        zip:                  form.zip.trim() || null,
        company_street:       form.company_street.trim() || null,
        company_city:         form.company_city.trim() || null,
        company_state:        form.company_state.trim() || null,
        company_zip:          form.company_zip.trim() || null,
        stage:                form.stage,
        contact_type:         form.contact_type || null,
        source:               form.source.trim() || null,
        project_description:  form.project_description.trim() || null,
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
              <label className={label}>Spouse / Partner First</label>
              <input className={input} value={form.secondary_first_name} onChange={e => set('secondary_first_name', e.target.value)} placeholder="First" />
            </div>
            <div>
              <label className={label}>Spouse / Partner Last</label>
              <input className={input} value={form.secondary_last_name} onChange={e => set('secondary_last_name', e.target.value)} placeholder="Last" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={label}>Phone</label>
              <input className={input} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 000-0000" />
            </div>
            <div>
              <label className={label}>Cell</label>
              <input className={input} value={form.cell} onChange={e => set('cell', e.target.value)} placeholder="(555) 000-0000" />
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

          {form.company_name.trim() && (
            <div className="border border-gray-200 rounded-xl p-3 bg-gray-50">
              <p className="text-xs font-semibold text-gray-500 mb-2">Company Address</p>
              <div className="space-y-2">
                <input className={input} value={form.company_street} onChange={e => set('company_street', e.target.value)} placeholder="Company Street Address" />
                <div className="grid grid-cols-3 gap-2">
                  <input className={input + ' col-span-1'} value={form.company_city} onChange={e => set('company_city', e.target.value)} placeholder="City" />
                  <input className={input} value={form.company_state} onChange={e => set('company_state', e.target.value)} placeholder="ST" maxLength={2} />
                  <input className={input} value={form.company_zip} onChange={e => set('company_zip', e.target.value)} placeholder="Zip" />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={label}>Stage</label>
              <select className={input} value={form.stage} onChange={e => set('stage', e.target.value)}>
                {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Contact Type</label>
              <select className={input} value={form.contact_type} onChange={e => set('contact_type', e.target.value)}>
                <option value="">— None —</option>
                <option value="Residential">Residential</option>
                <option value="Commercial">Commercial</option>
                <option value="Public Works">Public Works</option>
              </select>
            </div>
            <div>
              <label className={label}>Contact Source</label>
              <input className={input} value={form.source} onChange={e => set('source', e.target.value)} placeholder="Referral, Google…" />
            </div>
          </div>

          <div>
            <label className={label}>Project Description</label>
            <textarea className={input + ' resize-none'} rows={3} value={form.project_description} onChange={e => set('project_description', e.target.value)} placeholder="Describe the project or work needed…" />
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
  const PAGE_SIZE = 50

  const [contacts,    setContacts]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [search,      setSearch]      = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  // Mobile-only filter modal — replaces the inline pill row on phones.
  const [showMobileFilter, setShowMobileFilter] = useState(false)
  const [showAdd,     setShowAdd]     = useState(false)
  const [showImport,  setShowImport]  = useState(false)
  const [showExport,  setShowExport]  = useState(false)
  const [sortField,   setSortField]   = useState('last_name')
  const [sortAsc,     setSortAsc]     = useState(true)
  const [page,        setPage]        = useState(0)

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

  useEffect(() => { fetchContacts() }, [])

  // Reset to first page when filters change
  useEffect(() => { setPage(0) }, [search, stageFilter])

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
        (c.cell || '').toLowerCase().includes(q) ||
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

  const totalPages  = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated   = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const rangeStart  = filtered.length === 0 ? 0 : page * PAGE_SIZE + 1
  const rangeEnd    = Math.min((page + 1) * PAGE_SIZE, filtered.length)

  const thCls = 'text-left px-4 py-2 font-semibold text-gray-600 uppercase cursor-pointer select-none hover:text-gray-800 transition-colors'
  const arrow = field => sortField === field ? (sortAsc ? ' ↑' : ' ↓') : ''

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
            onClick={() => setShowImport(true)}
            className="hidden sm:flex px-3 py-2 border border-gray-200 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 transition-colors items-center gap-1.5"
          >
            ⬆ Import
          </button>
          <button
            onClick={() => setShowExport(true)}
            className="hidden sm:flex px-3 py-2 border border-gray-200 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 transition-colors items-center gap-1.5"
          >
            ⬇ Export
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="hidden sm:flex px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-800 transition-colors"
          >
            + Add Contact
          </button>
        </div>
      </div>

      {/* Mobile: full-width Add Contact button sits directly above the search field. */}
      <button
        onClick={() => setShowAdd(true)}
        className="sm:hidden w-full mb-3 py-2.5 bg-green-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
      >
        + Add Contact
      </button>

      {/* Stage filter pills — desktop only; mobile uses the Filter modal */}
      <div className="hidden sm:flex flex-wrap gap-2 mb-4">
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
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-xs min-w-[900px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className={`${thCls} sticky left-0 bg-gray-50 z-10 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]`} onClick={() => toggleSort('last_name')}>Name{arrow('last_name')}</th>
                <th className={thCls} onClick={() => toggleSort('company_name')}>Company{arrow('company_name')}</th>
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
                  <td className="px-4 py-2 text-gray-600">{c.company_name || <span className="text-gray-300">—</span>}</td>
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
      )}

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-gray-400">
            {rangeStart}–{rangeEnd} of {filtered.length.toLocaleString()} contact{filtered.length !== 1 ? 's' : ''}
            {contacts.length !== filtered.length && ` (${contacts.length.toLocaleString()} total)`}
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
                <span>All contacts</span>
                <span className="text-xs opacity-70">{contacts.length}</span>
              </button>
              {STAGES.map(s => (
                <button
                  key={s.value}
                  onClick={() => { setStageFilter(s.value); setShowMobileFilter(false) }}
                  className={`w-full flex items-center justify-between px-3 py-3 rounded-lg border text-sm font-semibold transition-colors ${stageFilter === s.value ? s.cls + ' ring-2 ring-current' : 'bg-white text-gray-600 border-gray-200'}`}
                >
                  <span>{s.label}</span>
                  <span className="text-xs opacity-60">{contacts.filter(c => c.stage === s.value).length}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
