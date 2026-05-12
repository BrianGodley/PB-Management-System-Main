import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY'
]

const BID_STATUS = {
  pending:   'bg-yellow-50 text-yellow-800 border border-yellow-300',
  presented: 'bg-blue-50   text-blue-800   border border-blue-300',
  sold:      'bg-green-50  text-green-800  border border-green-400',
  lost:      'bg-red-50    text-red-800    border border-red-300',
}

const EST_STATUS = {
  draft:     'bg-gray-50   text-gray-600   border border-gray-300',
  complete:  'bg-green-50  text-green-800  border border-green-300',
  archived:  'bg-slate-50  text-slate-600  border border-slate-300',
}

const JOB_STATUS = {
  active:    'bg-green-50  text-green-800  border border-green-300',
  complete:  'bg-blue-50   text-blue-800   border border-blue-300',
  hold:      'bg-yellow-50 text-yellow-800 border border-yellow-300',
  cancelled: 'bg-red-50    text-red-800    border border-red-300',
}

// Display name: "Last, First" or legacy name
function displayName(c) {
  if (c.last_name || c.first_name) {
    return [c.last_name, c.first_name].filter(Boolean).join(', ')
  }
  return c.name || '—'
}

function fmt(n) {
  if (!n && n !== 0) return '—'
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function Avatar({ client }) {
  const first = (client.first_name || client.name || '?')[0].toUpperCase()
  const last  = (client.last_name || '')[0]?.toUpperCase() || ''
  return (
    <div className="w-10 h-10 rounded-full bg-green-100 border border-green-200 flex items-center justify-center flex-shrink-0">
      <span className="text-sm font-bold text-green-800">{first}{last}</span>
    </div>
  )
}

export default function Clients() {
  const { user } = useAuth()
  const [clients,    setClients]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [saveError,  setSaveError]  = useState('')
  const [search,     setSearch]     = useState('')
  const [tab,        setTab]        = useState('active')

  // Records grouped by client name
  const [estimates, setEstimates] = useState({}) // { clientName: [] }
  const [bids,      setBids]      = useState({})
  const [jobs,      setJobs]      = useState({})
  const [cos,       setCos]       = useState({}) // keyed by job_id then linked back to clientName

  const [deleteModal, setDeleteModal] = useState(null)

  const [form, setForm] = useState({
    first_name: '', last_name: '',
    company_name: '', company_position: '',
    email: '', phone: '',
    street: '', city: '', state: '', zip: '',
    notes: ''
  })

  // ── Contact-import flow ────────────────────────────────────────────────────
  const [newClientMode,       setNewClientMode]       = useState('scratch')
  const [contactsForImport,   setContactsForImport]   = useState([])
  const [contactImportSearch, setContactImportSearch] = useState('')
  const [selectedContactId,   setSelectedContactId]   = useState(null)
  const [contactDropdownOpen, setContactDropdownOpen] = useState(false)
  const contactPickerRef = useRef(null)

  useEffect(() => { fetchAll() }, [])

  useEffect(() => {
    if (!showForm || contactsForImport.length > 0) return
    supabase.from('contacts')
      .select('id, first_name, last_name, company_name, email, phone, cell, street_address, city, state, zip')
      .order('last_name')
      .then(({ data, error }) => {
        if (error) console.error('Failed to load contacts for import:', error)
        setContactsForImport(data || [])
      })
  }, [showForm])

  useEffect(() => {
    function onDown(e) {
      if (!contactPickerRef.current) return
      if (!contactPickerRef.current.contains(e.target)) setContactDropdownOpen(false)
    }
    if (contactDropdownOpen) document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [contactDropdownOpen])

  function applyContactToForm(contactId) {
    const c = contactsForImport.find(x => x.id === contactId)
    if (!c) return
    setSelectedContactId(contactId)
    setForm({
      first_name:       c.first_name       || '',
      last_name:        c.last_name        || '',
      company_name:     c.company_name     || '',
      company_position: '',
      email:            c.email            || '',
      phone:            c.phone            || c.cell || '',
      street:           c.street_address   || '',
      city:             c.city             || '',
      state:            c.state            || '',
      zip:              c.zip              || '',
      notes:            '',
    })
  }

  async function fetchAll() {
    setLoading(true)
    const { data: clientData } = await supabase.from('clients').select('*')
    setClients(clientData || [])

    // Fetch all records in parallel — then group by client_name client-side
    const [
      { data: estData  },
      { data: bidsData },
      { data: jobsData },
    ] = await Promise.all([
      supabase.from('estimates')
        .select('id, client_name, estimate_name, status, created_at')
        .order('created_at', { ascending: false }),
      supabase.from('bids')
        .select('id, client_name, status, bid_amount, date_submitted, projects')
        .in('record_type', ['bid'])
        .order('date_submitted', { ascending: false }),
      supabase.from('jobs')
        .select('id, client_name, job_name, status, sold_date, contract_amount')
        .order('sold_date', { ascending: false }),
    ])

    // Group estimates by client_name, filtering blank/orphaned rows
    const estMap = {}
    for (const e of (estData || [])) {
      if (!(e.estimate_name || '').trim()) continue
      if (!estMap[e.client_name]) estMap[e.client_name] = []
      estMap[e.client_name].push(e)
    }
    setEstimates(estMap)

    // Group bids by client_name
    const bidMap = {}
    for (const b of (bidsData || [])) {
      if (!bidMap[b.client_name]) bidMap[b.client_name] = []
      bidMap[b.client_name].push(b)
    }
    setBids(bidMap)

    // Group jobs by client_name, and also fetch COs linked to those jobs
    const jobMap = {}
    for (const j of (jobsData || [])) {
      if (!jobMap[j.client_name]) jobMap[j.client_name] = []
      jobMap[j.client_name].push(j)
    }
    setJobs(jobMap)

    // Fetch COs linked to known jobs
    if (jobsData?.length) {
      const allJobIds = jobsData.map(j => j.id)
      const { data: coData } = await supabase
        .from('bids')
        .select('id, co_name, status, bid_amount, date_submitted, linked_job_id')
        .eq('record_type', 'change_order')
        .in('linked_job_id', allJobIds)
        .order('date_submitted', { ascending: false })

      // Map COs back to client name via the job
      const jobClientMap = {}
      for (const j of (jobsData || [])) jobClientMap[j.id] = j.client_name

      const coMap = {}
      for (const co of (coData || [])) {
        const clientName = jobClientMap[co.linked_job_id]
        if (!clientName) continue
        if (!coMap[clientName]) coMap[clientName] = []
        coMap[clientName].push(co)
      }
      setCos(coMap)
    }

    setLoading(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.last_name.trim() && !form.first_name.trim()) return
    setSaving(true); setSaveError('')
    const combined = [form.first_name.trim(), form.last_name.trim()].filter(Boolean).join(' ')
    const { error } = await supabase.from('clients').insert({
      first_name:       form.first_name.trim(),
      last_name:        form.last_name.trim(),
      name:             combined,
      company_name:     form.company_name.trim(),
      company_position: form.company_position.trim(),
      email:            form.email.trim(),
      phone:            form.phone.trim(),
      street:           form.street.trim(),
      city:             form.city.trim(),
      state:            form.state,
      zip:              form.zip.trim(),
      notes:            form.notes.trim(),
      created_by:       user?.id,
    })
    setSaving(false)
    if (error) {
      setSaveError(error.message)
    } else {
      setForm({ first_name:'', last_name:'', company_name:'', company_position:'', email:'', phone:'', street:'', city:'', state:'', zip:'', notes:'' })
      setShowForm(false); setSaveError(''); fetchAll()
      setNewClientMode('scratch'); setSelectedContactId(null); setContactImportSearch(''); setContactDropdownOpen(false)
    }
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
      const jobIds = jobsData.map(j => j.id)
      const { count } = await supabase.from('work_orders').select('id', { count: 'exact', head: true }).in('job_id', jobIds)
      woCount = count || 0
    }

    setDeleteModal({
      client,
      estCount, bidCount, woCount,
      onConfirm: async () => {
        if (jobsData?.length) {
          await supabase.from('work_orders').delete().in('job_id', jobsData.map(j => j.id))
        }
        if (bidsData?.length) {
          await supabase.from('bids').delete().in('id', bidsData.map(b => b.id))
        }
        if (ests?.length) {
          await supabase.from('estimates').delete().in('id', ests.map(e => e.id))
        }
        await supabase.from('clients').delete().eq('id', id)
        setDeleteModal(null)
        fetchAll()
      },
    })
  }

  async function setClientStatus(id, status) {
    await supabase.from('clients').update({ status }).eq('id', id)
    fetchAll()
  }

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const sorted = [...clients].sort((a, b) => {
    const la = (a.last_name || a.name || '').toLowerCase()
    const lb = (b.last_name || b.name || '').toLowerCase()
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

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-700" />
    </div>
  )

  return (
    <div>
      {/* ── Delete Modal ── */}
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
                {deleteModal.woCount > 0  && <li>• {deleteModal.woCount} Work Order{deleteModal.woCount !== 1 ? 's' : ''}</li>}
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

      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0 gap-3">
        <h1 className="text-xl font-bold text-gray-900">Clients</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm px-3 py-1.5">
          {showForm ? 'Cancel' : '+ Add Client'}
        </button>
      </div>

      {/* ── Active / Past tabs ── */}
      <div className="flex border-b border-gray-200 mb-4 gap-1">
        {[
          { key: 'active',   label: 'Current', count: sorted.filter(c => (c.status || 'active') === 'active').length },
          { key: 'inactive', label: 'Past',    count: sorted.filter(c => (c.status || 'active') === 'inactive').length },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setSearch('') }}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors flex items-center gap-1.5 ${
              tab === t.key
                ? 'border-green-700 text-green-700 bg-green-50'
                : 'border-transparent text-gray-900 hover:text-black hover:bg-gray-50'
            }`}
          >
            {t.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
              tab === t.key ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* ── New client form ── */}
      {showForm && (
        <form onSubmit={handleSave} className="card mb-6">
          <h2 className="font-semibold text-gray-900 mb-3">New Client</h2>

          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase">Source:</span>
            {[{ key: 'scratch', label: 'From scratch' }, { key: 'contact', label: 'From a contact' }].map(o => (
              <button key={o.key} type="button" onClick={() => setNewClientMode(o.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-colors ${
                  newClientMode === o.key ? 'border-green-700 bg-green-50 text-green-800' : 'border-gray-200 text-gray-500 hover:border-green-500'
                }`}>{o.label}</button>
            ))}
          </div>

          {newClientMode === 'contact' && (
            <div ref={contactPickerRef} className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <label className="label">Pick a contact to import</label>
              <div className="relative">
                <input type="text" placeholder="Click to browse, or type a name…"
                  value={contactImportSearch}
                  onChange={e => { setContactImportSearch(e.target.value); setContactDropdownOpen(true) }}
                  onFocus={() => setContactDropdownOpen(true)}
                  className="input pr-7"
                />
                {(selectedContactId || contactImportSearch) && (
                  <button type="button" onClick={() => { setSelectedContactId(null); setContactImportSearch(''); setContactDropdownOpen(false) }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-lg leading-none">×</button>
                )}
                {contactDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-20 max-h-56 overflow-y-auto border border-gray-200 rounded-md bg-white shadow-lg divide-y divide-gray-100">
                    {(() => {
                      const q   = contactImportSearch.trim().toLowerCase()
                      const list = q
                        ? contactsForImport.filter(c => {
                            const hay = [c.first_name, c.last_name, c.company_name, c.email, c.phone].filter(Boolean).join(' ').toLowerCase()
                            return hay.includes(q)
                          })
                        : contactsForImport
                      if (list.length === 0) return <p className="px-3 py-3 text-xs text-gray-400">{contactImportSearch ? 'No matches.' : 'No contacts yet.'}</p>
                      return list.slice(0, 50).map(c => {
                        const isSelected = c.id === selectedContactId
                        const display = `${c.last_name || ''}${c.first_name ? `, ${c.first_name}` : ''}`.trim() || c.company_name || '—'
                        return (
                          <button key={c.id} type="button"
                            onClick={() => { applyContactToForm(c.id); setContactImportSearch(display); setContactDropdownOpen(false) }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-green-50 ${isSelected ? 'bg-green-50' : ''}`}>
                            <p className="font-semibold text-gray-800">{display}</p>
                            <p className="text-xs text-gray-500 truncate">{[c.company_name, c.email, c.phone].filter(Boolean).join(' · ') || '—'}</p>
                          </button>
                        )
                      })
                    })()}
                  </div>
                )}
              </div>
              {selectedContactId && <p className="text-[11px] text-green-700 mt-2">✓ Imported into the form below — you can still edit any field before saving.</p>}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">First Name</label><input className="input" value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="First name" /></div>
            <div><label className="label">Last Name *</label><input className="input" value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Last name" required /></div>
            <div><label className="label">Company Name</label><input className="input" value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="Company or organization" /></div>
            <div><label className="label">Company Position</label><input className="input" value={form.company_position} onChange={e => set('company_position', e.target.value)} placeholder="Title or role" /></div>
            <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" /></div>
            <div><label className="label">Phone</label><input className="input" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 555-5555" /></div>
            <div className="sm:col-span-2"><label className="label">Street Address</label><input className="input" value={form.street} onChange={e => set('street', e.target.value)} placeholder="123 Main St" /></div>
            <div><label className="label">City</label><input className="input" value={form.city} onChange={e => set('city', e.target.value)} placeholder="City" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">State</label>
                <select className="input" value={form.state} onChange={e => set('state', e.target.value)}>
                  <option value="">-- State --</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div><label className="label">Zip Code</label><input className="input" value={form.zip} onChange={e => set('zip', e.target.value)} placeholder="00000" maxLength={10} /></div>
            </div>
            <div className="sm:col-span-2"><label className="label">Notes</label><textarea className="input resize-none" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any notes about this client..." /></div>
          </div>

          {saveError && <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">⚠️ {saveError}</div>}
          <div className="flex gap-2 mt-4">
            <button type="button" onClick={() => { setShowForm(false); setNewClientMode('scratch'); setSelectedContactId(null); setContactImportSearch('') }}
              className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save Client'}</button>
          </div>
        </form>
      )}

      {/* ── Search ── */}
      <div className="mb-4">
        <input type="text" placeholder="Search by name, company, email, phone or city..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="input max-w-sm" />
      </div>

      {/* ── Client cards ── */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">👥</p>
          <p className="text-gray-500 mb-4">
            {search ? 'No results match your search.'
              : tab === 'inactive' ? 'No past clients.'
              : clients.length === 0 ? 'No clients yet.' : 'No current clients.'}
          </p>
          {tab === 'active' && clients.length === 0 && (
            <button onClick={() => setShowForm(true)} className="btn-primary">Add Your First Client</button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(client => {
            const clientName = client.name || [client.first_name, client.last_name].filter(Boolean).join(' ')
            const clientEsts = estimates[clientName] || []
            const clientBids = bids[clientName] || []
            const clientJobs = jobs[clientName] || []
            const clientCOs  = cos[clientName]  || []

            const estCount = clientEsts.length
            const bidCount = clientBids.length
            const jobCount = clientJobs.length
            const coCount  = clientCOs.length

            // Total sold (bids with status=sold)
            const totalSold = clientBids
              .filter(b => b.status === 'sold')
              .reduce((s, b) => s + (b.bid_amount || 0), 0)

            return (
              <div key={client.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="grid" style={{ gridTemplateColumns: '18rem 1fr' }}>

                  {/* ── LEFT: identity + stats ── */}
                  <div className="border-r border-gray-100 p-4 flex flex-col gap-3">

                    {/* Name + avatar */}
                    <div className="flex items-start gap-3">
                      <Avatar client={client} />
                      <div className="min-w-0">
                        <Link to={`/clients/${client.id}`}
                          className="text-sm font-bold text-green-700 hover:text-green-900 hover:underline leading-tight block">
                          {displayName(client)}
                        </Link>
                        {client.company_name && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">{client.company_name}
                            {client.company_position ? ` · ${client.company_position}` : ''}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Address / phone / email */}
                    <div className="space-y-1 text-xs">
                      {(client.street || client.city) && (
                        <div className="flex items-start gap-1.5 text-gray-600">
                          <span className="mt-0.5 flex-shrink-0">📍</span>
                          <span className="font-semibold">
                            {[client.street, [client.city, client.state, client.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')}
                          </span>
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center gap-1.5">
                          <span className="flex-shrink-0">📞</span>
                          <a href={`tel:${client.phone}`} className="font-semibold text-gray-800 hover:text-green-700">{client.phone}</a>
                        </div>
                      )}
                      {client.email && (
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="flex-shrink-0">✉️</span>
                          <a href={`mailto:${client.email}`} className="font-semibold text-gray-800 hover:text-green-700 truncate">{client.email}</a>
                        </div>
                      )}
                    </div>

                    {/* Stats bar */}
                    <div className="pt-2 border-t border-gray-100">
                      <div className="grid grid-cols-4 gap-1">
                        {[
                          { label: 'Ests',  count: estCount, color: 'bg-gray-50  text-gray-700  border-gray-200' },
                          { label: 'Bids',  count: bidCount, color: 'bg-blue-50  text-blue-700  border-blue-200' },
                          { label: 'Jobs',  count: jobCount, color: 'bg-green-50 text-green-800 border-green-200' },
                          { label: 'C/Os',  count: coCount,  color: 'bg-orange-50 text-orange-700 border-orange-200' },
                        ].map(s => (
                          <div key={s.label} className={`flex flex-col items-center py-1.5 rounded-lg border text-center ${s.color}`}>
                            <span className="text-base font-bold leading-none">{s.count}</span>
                            <span className="text-[9px] font-semibold uppercase tracking-wide mt-0.5 opacity-70">{s.label}</span>
                          </div>
                        ))}
                      </div>
                      {totalSold > 0 && (
                        <p className="text-[10px] text-gray-400 text-center mt-1.5">
                          <span className="font-semibold text-green-700">{fmt(totalSold)}</span> sold
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      <Link to={`/clients/${client.id}`}
                        className="flex-1 text-center text-xs font-semibold px-2 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors">
                        View Detail →
                      </Link>
                      {tab === 'active' ? (
                        <button onClick={() => setClientStatus(client.id, 'inactive')}
                          className="text-xs text-gray-400 hover:text-yellow-600 px-2 py-1.5 rounded-lg border border-gray-200 hover:border-yellow-300 transition-colors">
                          Deactivate
                        </button>
                      ) : (
                        <>
                          <button onClick={() => setClientStatus(client.id, 'active')}
                            className="text-xs text-green-600 hover:text-green-800 px-2 py-1.5 rounded-lg border border-green-200 hover:bg-green-50 transition-colors">
                            Reactivate
                          </button>
                          <button onClick={() => deleteClient(client.id)}
                            className="text-xs text-red-300 hover:text-red-500 px-2 py-1.5 rounded-lg border border-gray-200 hover:border-red-300 transition-colors">✕</button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* ── RIGHT: records ── */}
                  <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-4 content-start" style={{ gridTemplateColumns: '1fr 1fr' }}>

                    {/* Estimates */}
                    <RecordSection title="Estimates" count={estCount} emptyLabel="No estimates">
                      {clientEsts.slice(0, 5).map(e => (
                        <RecordRow key={e.id}
                          label={e.estimate_name}
                          badge={e.status}
                          badgeCls={EST_STATUS[e.status] || 'bg-gray-50 text-gray-600 border border-gray-200'}
                          date={e.created_at}
                        />
                      ))}
                      {estCount > 5 && <MoreLink to={`/clients/${client.id}`} count={estCount - 5} />}
                    </RecordSection>

                    {/* Bids */}
                    <RecordSection title="Bids" count={bidCount} emptyLabel="No bids">
                      {clientBids.slice(0, 5).map(b => (
                        <RecordRow key={b.id}
                          label={b.projects || '(untitled bid)'}
                          badge={b.status}
                          badgeCls={BID_STATUS[b.status] || 'bg-gray-50 text-gray-600 border border-gray-200'}
                          amount={b.bid_amount}
                          date={b.date_submitted}
                        />
                      ))}
                      {bidCount > 5 && <MoreLink to={`/clients/${client.id}`} count={bidCount - 5} />}
                    </RecordSection>

                    {/* Jobs */}
                    <RecordSection title="Jobs" count={jobCount} emptyLabel="No jobs">
                      {clientJobs.slice(0, 5).map(j => (
                        <RecordRow key={j.id}
                          label={j.job_name || '(untitled job)'}
                          badge={j.status}
                          badgeCls={JOB_STATUS[j.status] || 'bg-gray-50 text-gray-600 border border-gray-200'}
                          amount={j.contract_amount}
                          date={j.sold_date}
                        />
                      ))}
                      {jobCount > 5 && <MoreLink to={`/clients/${client.id}`} count={jobCount - 5} />}
                    </RecordSection>

                    {/* Change Orders */}
                    <RecordSection title="Change Orders" count={coCount} emptyLabel="No change orders">
                      {clientCOs.slice(0, 5).map(co => (
                        <RecordRow key={co.id}
                          label={co.co_name || '(untitled C/O)'}
                          badge={co.status}
                          badgeCls={BID_STATUS[co.status] || 'bg-gray-50 text-gray-600 border border-gray-200'}
                          amount={co.bid_amount}
                          date={co.date_submitted}
                        />
                      ))}
                      {coCount > 5 && <MoreLink to={`/clients/${client.id}`} count={coCount - 5} />}
                    </RecordSection>

                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function RecordSection({ title, count, emptyLabel, children }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">{title}</h3>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold">{count}</span>
      </div>
      {count === 0 ? (
        <p className="text-xs text-gray-300 italic">{emptyLabel}</p>
      ) : (
        <div className="space-y-1">{children}</div>
      )}
    </div>
  )
}

function RecordRow({ label, badge, badgeCls, amount, date }) {
  const dateStr = date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : null
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className={`flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded-full font-semibold border capitalize ${badgeCls}`}>
        {badge || '—'}
      </span>
      <span className="text-xs text-gray-700 font-semibold truncate flex-1 min-w-0">{label}</span>
      {amount != null && amount > 0 && (
        <span className="text-xs font-bold text-gray-900 flex-shrink-0">{fmt(amount)}</span>
      )}
      {dateStr && <span className="text-[10px] text-gray-400 flex-shrink-0">{dateStr}</span>}
    </div>
  )
}

function MoreLink({ to, count }) {
  return (
    <Link to={to} className="text-[10px] text-green-600 hover:text-green-800 font-semibold">
      +{count} more →
    </Link>
  )
}
