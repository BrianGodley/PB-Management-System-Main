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

// Column definitions — key matches the render switch below
const COLUMNS = [
  { key: 'name',             label: 'Name',           always: true,  defaultOn: true  },
  { key: 'company_name',     label: 'Company',        always: false, defaultOn: true  },
  { key: 'company_position', label: 'Position',       always: false, defaultOn: false },
  { key: 'phone',            label: 'Phone',          always: false, defaultOn: true  },
  { key: 'email',            label: 'Email',          always: false, defaultOn: true  },
  { key: 'street',           label: 'Street',         always: false, defaultOn: true  },
  { key: 'city_state',       label: 'City / State',   always: false, defaultOn: true  },
  { key: 'notes',            label: 'Notes',          always: false, defaultOn: false },
]

const DEFAULT_VISIBLE = new Set(COLUMNS.filter(c => c.defaultOn).map(c => c.key))

// Display name: "Last, First" or legacy name
function displayName(c) {
  if (c.last_name || c.first_name) {
    return [c.last_name, c.first_name].filter(Boolean).join(', ')
  }
  return c.name || '—'
}

export default function Clients() {
  const { user } = useAuth()
  const [clients,    setClients]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [saveError,  setSaveError]  = useState('')
  const [search,     setSearch]     = useState('')
  const [visibleCols, setVisibleCols] = useState(DEFAULT_VISIBLE)
  const [colPickerOpen, setColPickerOpen] = useState(false)
  const colPickerRef = useRef(null)

  const [form, setForm] = useState({
    first_name: '', last_name: '',
    company_name: '', company_position: '',
    email: '', phone: '',
    street: '', city: '', state: '', zip: '',
    notes: ''
  })

  useEffect(() => { fetchClients() }, [])

  // Close column picker on outside click
  useEffect(() => {
    if (!colPickerOpen) return
    function handleClick(e) {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target)) {
        setColPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [colPickerOpen])

  async function fetchClients() {
    setLoading(true)
    const { data, error } = await supabase.from('clients').select('*')
    if (error) console.error('fetchClients error:', error.message)
    setClients(data || [])
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
      setShowForm(false); setSaveError(''); fetchClients()
    }
  }

  async function deleteClient(id) {
    if (!confirm('Delete this client? This will not delete their jobs.')) return
    await supabase.from('clients').delete().eq('id', id)
    fetchClients()
  }

  function toggleCol(key) {
    setVisibleCols(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // Sort: last_name → first_name
  const sorted = [...clients].sort((a, b) => {
    const la = (a.last_name || a.name || '').toLowerCase()
    const lb = (b.last_name || b.name || '').toLowerCase()
    if (la !== lb) return la.localeCompare(lb)
    return (a.first_name || '').toLowerCase().localeCompare((b.first_name || '').toLowerCase())
  })

  const filtered = sorted.filter(c => {
    const q = search.toLowerCase()
    return (
      displayName(c).toLowerCase().includes(q) ||
      (c.company_name || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(search) ||
      (c.city || '').toLowerCase().includes(q)
    )
  })

  // Visible columns in order (always include actions at end)
  const activeCols = COLUMNS.filter(c => c.always || visibleCols.has(c.key))

  // Render a single cell value
  function cellContent(col, client) {
    switch (col.key) {
      case 'name':
        return (
          <Link to={`/clients/${client.id}`} className="text-sm font-medium text-green-700 hover:underline truncate block">
            {displayName(client)}
          </Link>
        )
      case 'company_name':
        return client.company_name
          ? <span className="text-xs font-medium text-gray-700 truncate block">{client.company_name}</span>
          : <span className="text-xs text-gray-300">—</span>
      case 'company_position':
        return client.company_position
          ? <span className="text-xs text-gray-600 truncate block">{client.company_position}</span>
          : <span className="text-xs text-gray-300">—</span>
      case 'phone':
        return <span className="text-xs text-gray-600">{client.phone || '—'}</span>
      case 'email':
        return <span className="text-xs text-gray-600 truncate block">{client.email || '—'}</span>
      case 'street':
        return <span className="text-xs text-gray-500 truncate block">{client.street || '—'}</span>
      case 'city_state':
        return <span className="text-xs text-gray-500 truncate block">
          {client.city ? `${client.city}${client.state ? ', ' + client.state : ''}` : '—'}
        </span>
      case 'notes':
        return <span className="text-xs text-gray-400 italic truncate block">{client.notes || '—'}</span>
      default:
        return null
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-700" />
    </div>
  )

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0 gap-3">
        <h1 className="text-xl font-bold text-gray-900">Clients</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm px-3 py-1.5">
          {showForm ? 'Cancel' : '+ Add Client'}
        </button>
      </div>

      {/* ── New client form ── */}
      {showForm && (
        <form onSubmit={handleSave} className="card mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">New Client</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <div>
              <label className="label">First Name</label>
              <input className="input" value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="First name" />
            </div>
            <div>
              <label className="label">Last Name *</label>
              <input className="input" value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Last name" required />
            </div>

            <div>
              <label className="label">Company Name</label>
              <input className="input" value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="Company or organization" />
            </div>
            <div>
              <label className="label">Company Position</label>
              <input className="input" value={form.company_position} onChange={e => set('company_position', e.target.value)} placeholder="Title or role" />
            </div>

            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 555-5555" />
            </div>

            <div className="sm:col-span-2">
              <label className="label">Street Address</label>
              <input className="input" value={form.street} onChange={e => set('street', e.target.value)} placeholder="123 Main St" />
            </div>

            <div>
              <label className="label">City</label>
              <input className="input" value={form.city} onChange={e => set('city', e.target.value)} placeholder="City" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">State</label>
                <select className="input" value={form.state} onChange={e => set('state', e.target.value)}>
                  <option value="">-- State --</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Zip Code</label>
                <input className="input" value={form.zip} onChange={e => set('zip', e.target.value)} placeholder="00000" maxLength={10} />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="label">Notes</label>
              <textarea className="input resize-none" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any notes about this client..." />
            </div>
          </div>

          {saveError && (
            <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">⚠️ {saveError}</div>
          )}
          <div className="flex gap-2 mt-4">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save Client'}</button>
          </div>
        </form>
      )}

      {/* ── Search + Column picker ── */}
      <div className="flex items-center justify-between mb-3 gap-3">
        <input
          type="text"
          placeholder="Search by name, company, email, phone or city..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input max-w-sm"
        />

        {/* Column picker */}
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
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Columns
            <svg className={`w-3 h-3 transition-transform ${colPickerOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {colPickerOpen && (
            <div className="absolute right-0 top-full mt-1.5 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-2 w-44">
              <p className="px-3 pb-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100 mb-1">
                Show / Hide Columns
              </p>
              {COLUMNS.map(col => (
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

      {/* ── Client table ── */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">👥</p>
          <p className="text-gray-500 mb-4">{clients.length === 0 ? 'No clients yet.' : 'No results match your search.'}</p>
          {clients.length === 0 && <button onClick={() => setShowForm(true)} className="btn-primary">Add Your First Client</button>}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-left table-fixed">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {activeCols.map(col => (
                  <th
                    key={col.key}
                    className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide truncate"
                    style={{ width: colWidth(col.key) }}
                  >
                    {col.label}
                  </th>
                ))}
                {/* Actions column */}
                <th className="px-3 py-2 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(client => (
                <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                  {activeCols.map(col => (
                    <td key={col.key} className="px-3 py-1.5 min-w-0 max-w-0 overflow-hidden">
                      {cellContent(col, client)}
                    </td>
                  ))}
                  <td className="px-3 py-1.5 w-16">
                    <div className="flex items-center justify-end gap-2">
                      <Link to={`/clients/${client.id}`} className="text-xs text-gray-500 hover:text-gray-700 whitespace-nowrap">
                        View →
                      </Link>
                      <button onClick={() => deleteClient(client.id)} className="text-red-300 hover:text-red-500 text-xs">✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// Column width hints for table-fixed layout
function colWidth(key) {
  switch (key) {
    case 'name':             return '14%'
    case 'company_name':     return '14%'
    case 'company_position': return '12%'
    case 'phone':            return '11%'
    case 'email':            return '16%'
    case 'street':           return '15%'
    case 'city_state':       return '10%'
    case 'notes':            return '18%'
    default:                 return 'auto'
  }
}
