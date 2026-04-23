import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import NewEstimateModal from '../components/NewEstimateModal'

// Match exactly the badge colours used in Bids.jsx
const BID_STATUS_STYLES = {
  pending:   'bg-yellow-50  text-yellow-800 border border-yellow-300',
  presented: 'bg-blue-50    text-blue-800   border border-blue-300',
  sold:      'bg-green-50   text-green-800  border border-green-400',
  lost:      'bg-red-50     text-red-800    border border-red-300',
}

// Display name: "Last, First" when available, else legacy name field
function displayName(c) {
  if (!c) return ''
  if (c.last_name || c.first_name) {
    return [c.last_name, c.first_name].filter(Boolean).join(', ')
  }
  return c.name || ''
}

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client,    setClient]    = useState(null)
  const [estimates, setEstimates] = useState([])
  const [bids,      setBids]      = useState([])
  const [soldJobs,  setSoldJobs]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showEstimateModal, setShowEstimateModal] = useState(false)
  const [editing,  setEditing]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [form,     setForm]     = useState({})

  const US_STATES = [
    'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
    'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
    'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
    'VA','WA','WV','WI','WY',
  ]

  useEffect(() => { fetchData() }, [id])

  async function fetchData() {
    setLoading(true)

    const { data: clientData } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single()

    if (clientData) {
      setClient(clientData)
      setForm(clientData)

      // Fetch estimates for this client with nested module financials
      const { data: estData } = await supabase
        .from('estimates')
        .select(`
          id, estimate_name, type, status, created_at,
          estimate_projects (
            estimate_modules (
              man_days, material_cost,
              labor_cost, labor_burden, gross_profit, sub_cost, total_price
            )
          )
        `)
        .eq('client_name', clientData.name)
        .order('created_at', { ascending: false })

      if (estData) setEstimates(estData)

      // Fetch bids from the bids table — same source as the Bids page
      const { data: bidsData } = await supabase
        .from('bids')
        .select('id, client_name, status, bid_amount, estimate_id, date_submitted, projects, gross_profit, gpmd')
        .eq('client_name', clientData.name)
        .order('date_submitted', { ascending: false })

      if (bidsData) setBids(bidsData)

      // Fetch jobs (sold/active work)
      const { data: jobsData } = await supabase
        .from('jobs')
        .select('*')
        .eq('client_name', clientData.name)
        .order('sold_date', { ascending: false })

      if (jobsData) setSoldJobs(jobsData)
    }

    setLoading(false)
  }

  // ── Client editing ──────────────────────────────────────────────────────────
  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const combined = [form.first_name?.trim(), form.last_name?.trim()].filter(Boolean).join(' ')
    const { error } = await supabase.from('clients').update({
      first_name:       form.first_name?.trim()       || null,
      last_name:        form.last_name?.trim()        || null,
      name:             combined || form.name?.trim(),   // keep for backward compat
      company_name:     form.company_name?.trim()     || null,
      company_position: form.company_position?.trim() || null,
      email:            form.email?.trim()            || null,
      phone:            form.phone?.trim()            || null,
      street:           form.street?.trim()           || null,
      city:             form.city?.trim()             || null,
      state:            form.state                    || null,
      zip:              form.zip?.trim()              || null,
      notes:            form.notes?.trim()            || null,
    }).eq('id', id)
    setSaving(false)
    if (!error) {
      const updated = { ...client, ...form, name: combined || form.name?.trim() }
      setClient(updated)
      setEditing(false)
    }
  }

  // ── New estimate ────────────────────────────────────────────────────────────
  async function handleEstimateNext(data) {
    const { data: est, error } = await supabase
      .from('estimates')
      .insert({
        estimate_name: data.name,
        type:          data.type,
        client_name:   client.name,
        client_id:     client.id,
        status:        'pending',
      })
      .select()
      .single()
    if (error) {
      alert(`Error creating estimate: ${error.message}\n\nMake sure you have run supabase-update-7.sql in Supabase.`)
      return
    }
    if (est) {
      setShowEstimateModal(false)
      navigate(`/estimates/${est.id}`)
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete ${client.name}? This cannot be undone.`)) return
    await supabase.from('clients').delete().eq('id', id)
    navigate('/clients')
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function sumModules(est, field) {
    return (est.estimate_projects || []).reduce((s, proj) =>
      s + (proj.estimate_modules || []).reduce((ms, mod) =>
        ms + parseFloat(mod[field] || 0), 0), 0)
  }

  function estimateTotals(est) {
    const man_days     = sumModules(est, 'man_days')
    const labor_burden = sumModules(est, 'labor_burden')
    const material_cost= sumModules(est, 'material_cost')
    const sub_cost     = sumModules(est, 'sub_cost')
    const gross_profit = sumModules(est, 'gross_profit')
    const total_price  = sumModules(est, 'total_price')
    const gpmd         = man_days > 0 ? gross_profit / man_days : 0
    return { man_days, labor_burden, material_cost, sub_cost, gross_profit, total_price, gpmd }
  }

  const fmt  = (v) => `$${Math.round(v).toLocaleString()}`
  const fmt2 = (v) => `$${parseFloat(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-700"></div>
    </div>
  )
  if (!client) return <div className="card text-center py-12 text-gray-500">Client not found.</div>

  const totalRevenue  = soldJobs.reduce((s, j) => s + parseFloat(j.total_price   || 0), 0)
  const totalGP       = soldJobs.reduce((s, j) => s + parseFloat(j.gross_profit  || 0), 0)

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-5 text-sm">
        <Link to="/clients" className="text-gray-400 hover:text-gray-600">← Clients</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-medium">{displayName(client) || client.name}</span>
      </div>

      {/* ── Client Info Card ── */}
      <div className="card mb-4">
        {editing ? (
          <form onSubmit={handleSave} className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="label text-xs">First Name</label>
              <input className="input text-sm" value={form.first_name || ''} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} placeholder="First name" />
            </div>
            <div>
              <label className="label text-xs">Last Name *</label>
              <input className="input text-sm" value={form.last_name || ''} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} placeholder="Last name" required />
            </div>
            <div />
            <div>
              <label className="label text-xs">Company Name</label>
              <input className="input text-sm" value={form.company_name || ''} onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))} placeholder="Company or organization" />
            </div>
            <div>
              <label className="label text-xs">Company Position</label>
              <input className="input text-sm" value={form.company_position || ''} onChange={e => setForm(p => ({ ...p, company_position: e.target.value }))} placeholder="Title or role" />
            </div>
            <div />
            <div>
              <label className="label text-xs">Email</label>
              <input className="input text-sm" type="email" value={form.email || ''} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <label className="label text-xs">Phone</label>
              <input className="input text-sm" value={form.phone || ''} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div />
            <div>
              <label className="label text-xs">Street</label>
              <input className="input text-sm" value={form.street || ''} onChange={e => setForm(p => ({ ...p, street: e.target.value }))} />
            </div>
            <div>
              <label className="label text-xs">City</label>
              <input className="input text-sm" value={form.city || ''} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label text-xs">State</label>
                <select className="input text-sm" value={form.state || ''} onChange={e => setForm(p => ({ ...p, state: e.target.value }))}>
                  <option value="">--</option>
                  {US_STATES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label text-xs">Zip</label>
                <input className="input text-sm" value={form.zip || ''} onChange={e => setForm(p => ({ ...p, zip: e.target.value }))} />
              </div>
            </div>
            <div className="col-span-2 md:col-span-3">
              <label className="label text-xs">Notes</label>
              <textarea className="input text-sm resize-none" rows={2} value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <div className="col-span-2 md:col-span-3 flex gap-2">
              <button type="submit" disabled={saving} className="btn-primary text-sm">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="btn-secondary text-sm">Cancel</button>
            </div>
          </form>
        ) : (
          <div className="flex items-center gap-4 flex-wrap">

            {/* Avatar + Name */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-xl font-bold text-green-700 flex-shrink-0">
                {(client.last_name || client.first_name || client.name || '?')[0].toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 leading-tight">{displayName(client) || client.name}</h2>
                {client.company_name && (
                  <p className="text-sm text-gray-500">
                    {client.company_name}{client.company_position ? ` · ${client.company_position}` : ''}
                  </p>
                )}
              </div>
            </div>

            {/* Contact info — centered */}
            <div className="flex-1 flex items-center justify-center gap-6 flex-wrap">
              {client.email && (
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <span>✉️</span>
                  <a href={`mailto:${client.email}`} className="hover:underline text-green-700">{client.email}</a>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <span>📞</span>
                  <a href={`tel:${client.phone}`} className="hover:underline">{client.phone}</a>
                </div>
              )}
              {(client.street || client.city) && (
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <span>📍</span>
                  <span>{[client.street, client.city, client.state, client.zip].filter(Boolean).join(', ')}</span>
                </div>
              )}
              {client.notes && (
                <div className="flex items-center gap-1.5 text-sm text-gray-500 italic">
                  <span>📝</span>
                  <span>{client.notes}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => setEditing(true)} className="btn-secondary text-xs px-3 py-1.5">✏️ Edit</button>
              <button onClick={handleDelete} className="text-red-400 hover:text-red-600 text-xs px-2">Delete</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Stats Bar ── */}
      <div className="bg-white rounded-xl border border-gray-200 mb-6 overflow-hidden">
        <div className="grid grid-cols-3 md:grid-cols-6 divide-x divide-gray-100">
          {[
            { label: 'Estimates',         value: estimates.length,  fmt: v => v,          color: 'text-gray-900' },
            { label: 'Bids',              value: bids.length,       fmt: v => v,          color: 'text-gray-900' },
            { label: 'Total Revenue',     value: totalRevenue,      fmt: v => fmt(v),     color: 'text-gray-900' },
            { label: 'Total GP',          value: totalGP,           fmt: v => fmt(v),     color: 'text-green-700' },
            { label: 'Actual Gross Profit', value: null,            fmt: () => '—',       color: 'text-gray-400' },
            { label: 'Actual GPMD',       value: null,              fmt: () => '—',       color: 'text-gray-400' },
          ].map(stat => (
            <div key={stat.label} className="px-4 py-4 text-center">
              <p className="text-xs text-gray-500 mb-1 leading-tight">{stat.label}</p>
              <p className={`text-lg font-bold ${stat.color}`}>{stat.fmt(stat.value)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tables: full width ── */}
      <div className="space-y-6">

          {/* ── Estimates ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-900 text-lg">Estimates</h2>
              <button onClick={() => setShowEstimateModal(true)} className="btn-primary text-sm">
                + New Estimate
              </button>
            </div>

            {estimates.length === 0 ? (
              <div className="card text-center py-8 text-gray-400">
                <p className="mb-3">No estimates yet for this client.</p>
                <button onClick={() => setShowEstimateModal(true)} className="btn-primary text-sm inline-block">
                  Create First Estimate
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      <th className="px-4 py-2.5 text-left">Estimate</th>
                      <th className="px-3 py-2.5 text-right">Man Days</th>
                      <th className="px-3 py-2.5 text-right">Labor Burden</th>
                      <th className="px-3 py-2.5 text-right">Materials</th>
                      <th className="px-3 py-2.5 text-right">Sub Cost</th>
                      <th className="px-3 py-2.5 text-right">Gross Profit</th>
                      <th className="px-3 py-2.5 text-right">GPMD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {estimates.map(est => {
                      const t = estimateTotals(est)
                      return (
                        <tr key={est.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <Link
                              to={`/estimates/${est.id}`}
                              className="font-semibold text-green-700 hover:underline"
                            >
                              {est.estimate_name}
                            </Link>
                            {est.type && (
                              <p className="text-xs text-gray-400 mt-0.5">{est.type}</p>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right text-gray-700">{t.man_days.toFixed(1)}</td>
                          <td className="px-3 py-3 text-right text-gray-600">{fmt(t.labor_burden)}</td>
                          <td className="px-3 py-3 text-right text-gray-700">{fmt(t.material_cost)}</td>
                          <td className="px-3 py-3 text-right text-gray-600">{t.sub_cost > 0 ? fmt(t.sub_cost) : '—'}</td>
                          <td className="px-3 py-3 text-right font-medium text-green-700">{t.gross_profit > 0 ? fmt(t.gross_profit) : '—'}</td>
                          <td className="px-3 py-3 text-right text-gray-600">
                            {t.gpmd > 0 ? `$${Math.round(t.gpmd).toLocaleString()}` : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Bids ── */}
          <div>
            <h2 className="font-bold text-gray-900 text-lg mb-3">Bids</h2>

            {bids.length === 0 ? (
              <div className="card text-center py-6 text-gray-400 text-sm">
                No bids yet for this client.
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                <table className="w-full text-sm min-w-[500px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      <th className="px-4 py-2.5 text-left">Bid</th>
                      <th className="px-3 py-2.5 text-right">Date</th>
                      <th className="px-3 py-2.5 text-right">Gross Profit</th>
                      <th className="px-3 py-2.5 text-right">Bid Amount</th>
                      <th className="px-3 py-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {bids.map(bid => {
                      const status = bid.status || 'pending'
                      return (
                        <tr key={bid.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            {bid.estimate_id ? (
                              <Link to={`/estimates/${bid.estimate_id}`}
                                className="font-semibold text-green-700 hover:underline">
                                {bid.client_name}
                              </Link>
                            ) : (
                              <p className="font-semibold text-gray-800">{bid.client_name}</p>
                            )}
                            {bid.projects && bid.projects.length > 0 && (
                              <p className="text-xs text-gray-400 mt-0.5">{bid.projects.join(', ')}</p>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right text-gray-500 text-xs whitespace-nowrap">
                            {bid.date_submitted ? new Date(bid.date_submitted).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-3 py-3 text-right font-medium text-green-700">
                            {bid.gross_profit > 0 ? `$${Math.round(bid.gross_profit).toLocaleString()}` : '—'}
                          </td>
                          <td className="px-3 py-3 text-right font-bold text-gray-900 whitespace-nowrap">
                            ${parseFloat(bid.bid_amount || 0).toLocaleString()}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${BID_STATUS_STYLES[status] || BID_STATUS_STYLES.pending}`}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Jobs ── */}
          <div>
            <h2 className="font-bold text-gray-900 text-lg mb-3">Jobs</h2>

            {soldJobs.length === 0 ? (
              <div className="card text-center py-6 text-gray-400 text-sm">
                No jobs yet for this client.
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                <table className="w-full text-sm min-w-[560px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      <th className="px-4 py-2.5 text-left">Job Name</th>
                      <th className="px-3 py-2.5 text-right">Sold Date</th>
                      <th className="px-3 py-2.5 text-right">Man Days</th>
                      <th className="px-3 py-2.5 text-right">Materials</th>
                      <th className="px-3 py-2.5 text-right">Gross Profit</th>
                      <th className="px-3 py-2.5 text-right">Total Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {soldJobs.map(job => (
                      <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-gray-800">{job.name}</td>
                        <td className="px-3 py-3 text-right text-gray-500 text-xs whitespace-nowrap">
                          {job.sold_date ? new Date(job.sold_date).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-3 py-3 text-right text-gray-700">
                          {parseFloat(job.total_man_days || 0).toFixed(1)}
                        </td>
                        <td className="px-3 py-3 text-right text-gray-700">{fmt(job.material_cost)}</td>
                        <td className="px-3 py-3 text-right font-medium text-green-700">{fmt(job.gross_profit)}</td>
                        <td className="px-3 py-3 text-right font-bold text-gray-900">{fmt(job.total_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                  {soldJobs.length > 1 && (
                    <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                      <tr className="text-xs font-semibold text-gray-600">
                        <td className="px-4 py-2.5" colSpan={2}>Totals</td>
                        <td className="px-3 py-2.5 text-right">
                          {soldJobs.reduce((s, j) => s + parseFloat(j.total_man_days || 0), 0).toFixed(1)}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {fmt(soldJobs.reduce((s, j) => s + parseFloat(j.material_cost || 0), 0))}
                        </td>
                        <td className="px-3 py-2.5 text-right text-green-700">{fmt(totalGP)}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-gray-900">{fmt(totalRevenue)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>

          {/* ── Change Orders ── */}
          <div>
            <h2 className="font-bold text-gray-900 text-lg mb-3">Change Orders</h2>
            <div className="bg-white rounded-xl border border-gray-200 border-dashed text-center py-8 text-gray-400 text-sm">
              Change Orders coming soon.
            </div>
          </div>

        </div>
      </div>

      {/* New Estimate modal */}
      {showEstimateModal && (
        <NewEstimateModal
          client={client}
          onClose={() => setShowEstimateModal(false)}
          onNext={handleEstimateNext}
        />
      )}
    </div>
  )
}
