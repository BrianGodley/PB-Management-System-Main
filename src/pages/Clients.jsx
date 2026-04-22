import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY'
]

export default function Clients() {
  const { user } = useAuth()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({
    name: '', email: '', phone: '',
    street: '', city: '', state: '', zip: '',
    notes: ''
  })

  useEffect(() => { fetchClients() }, [])

  async function fetchClients() {
    setLoading(true)
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name')
    if (error) console.error('fetchClients error:', error.message)
    if (data) setClients(data)
    setLoading(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    setSaveError('')
    const { error } = await supabase.from('clients').insert({
      name:   form.name.trim(),
      email:  form.email.trim(),
      phone:  form.phone.trim(),
      street: form.street.trim(),
      city:   form.city.trim(),
      state:  form.state,
      zip:    form.zip.trim(),
      notes:  form.notes.trim(),
      created_by: user?.id,
    })
    setSaving(false)
    if (error) {
      setSaveError(error.message)
    } else {
      setForm({ name: '', email: '', phone: '', street: '', city: '', state: '', zip: '', notes: '' })
      setShowForm(false)
      setSaveError('')
      fetchClients()
    }
  }

  async function deleteClient(id) {
    if (!confirm('Delete this client? This will not delete their jobs.')) return
    await supabase.from('clients').delete().eq('id', id)
    fetchClients()
  }

  const fullAddress = (c) => [c.street, c.city, c.state, c.zip].filter(Boolean).join(', ')

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search) ||
    (c.city || '').toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-700"></div></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-shrink-0 gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-0.5">{clients.length} total clients</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm px-3 py-1.5">
          {showForm ? 'Cancel' : '+ Add Client'}
        </button>
      </div>

      {/* Add client form */}
      {showForm && (
        <form onSubmit={handleSave} className="card mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">New Client</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Name */}
            <div className="sm:col-span-2">
              <label className="label">Client Name *</label>
              <input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Full name or company" required />
            </div>

            {/* Email + Phone */}
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="(555) 555-5555" />
            </div>

            {/* Street */}
            <div className="sm:col-span-2">
              <label className="label">Street Address</label>
              <input className="input" value={form.street} onChange={e => setForm(p => ({ ...p, street: e.target.value }))} placeholder="123 Main St" />
            </div>

            {/* City */}
            <div>
              <label className="label">City</label>
              <input className="input" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="City" />
            </div>

            {/* State + Zip */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">State</label>
                <select className="input" value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))}>
                  <option value="">-- State --</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Zip Code</label>
                <input className="input" value={form.zip} onChange={e => setForm(p => ({ ...p, zip: e.target.value }))} placeholder="00000" maxLength={10} />
              </div>
            </div>

            {/* Notes */}
            <div className="sm:col-span-2">
              <label className="label">Notes</label>
              <textarea className="input resize-none" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any notes about this client..." />
            </div>
          </div>

          {saveError && (
            <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              ⚠️ {saveError}
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save Client'}</button>
          </div>
        </form>
      )}

      {/* Search */}
      <input
        type="text"
        placeholder="Search by name, email, phone or city..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="input mb-4 max-w-sm"
      />

      {/* Client list */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">👥</p>
          <p className="text-gray-500 mb-4">No clients yet.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">Add Your First Client</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <div className="col-span-2">Name</div>
            <div className="col-span-2">Phone</div>
            <div className="col-span-2">Email</div>
            <div className="col-span-3">Street</div>
            <div className="col-span-1">City</div>
            <div className="col-span-1">ST</div>
            <div className="col-span-1"></div>
          </div>

          {/* Rows */}
          {filtered.map((client, i) => (
            <div
              key={client.id}
              className={`grid grid-cols-12 gap-3 px-4 py-3 items-center hover:bg-gray-50 transition-colors ${i !== filtered.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              <div className="col-span-2 min-w-0">
                <Link to={`/clients/${client.id}`} className="font-semibold text-green-700 hover:underline truncate block">{client.name}</Link>
                {client.notes && <p className="text-xs text-gray-400 italic truncate">{client.notes}</p>}
              </div>
              <div className="col-span-2 min-w-0">
                <p className="text-sm text-gray-600 truncate">{client.phone || '—'}</p>
              </div>
              <div className="col-span-2 min-w-0">
                <p className="text-sm text-gray-600 truncate">{client.email || '—'}</p>
              </div>
              <div className="col-span-3 min-w-0">
                <p className="text-sm text-gray-500 truncate">{client.street || '—'}</p>
              </div>
              <div className="col-span-1 min-w-0">
                <p className="text-sm text-gray-500 truncate">{client.city || '—'}</p>
              </div>
              <div className="col-span-1">
                <p className="text-sm text-gray-500">{client.state || '—'}</p>
              </div>
              <div className="col-span-1 flex items-center justify-end gap-2">
                <Link to={`/clients/${client.id}`} className="text-xs text-gray-500 hover:text-gray-700 whitespace-nowrap">
                  View →
                </Link>
                <button onClick={() => deleteClient(client.id)} className="text-red-300 hover:text-red-500 text-xs">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
