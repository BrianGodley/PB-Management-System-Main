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
  const [jobCOs,    setJobCOs]    = useState({}) // map: job_id -> CO[]
  const [loading,   setLoading]   = useState(true)
  const [showEstimateModal, setShowEstimateModal] = useState(false)
  const [editing,  setEditing]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [form,     setForm]     = useState({})
  const [deleteModal, setDeleteModal] = useState(null)

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

      // Fetch bids (record_type = 'bid' only)
      const { data: bidsData } = await supabase
        .from('bids')
        .select('id, client_name, status, bid_amount, estimate_id, date_submitted, projects, gross_profit, gpmd')
        .eq('client_name', clientData.name)
        .in('record_type', ['bid'])
        .order('date_submitted', { ascending: false })

      if (bidsData) setBids(bidsData)

      // Fetch jobs (sold/active work)
      const { data: jobsData } = await supabase
        .from('jobs')
        .select('*')
        .eq('client_name', clientData.name)
        .order('sold_date', { ascending: false })

      if (jobsData) {
        setSoldJobs(jobsData)

        // Fetch COs linked to these jobs, then filter CO estimates out of the estimates list
        let coEstimateIds = new Set()
        if (jobsData.length > 0) {
          const jobIds = jobsData.map(j => j.id)
          const { data: coData } = await supabase
            .from('bids')
            .select('id, co_name, co_type, status, bid_amount, gross_profit, date_submitted, linked_job_id, estimate_id')
            .eq('record_type', 'change_order')
            .in('linked_job_id', jobIds)
            .order('date_submitted', { ascending: false })

          if (coData) {
            coEstimateIds = new Set(coData.map(co => co.estimate_id).filter(Boolean))
            const coMap = {}
            coData.forEach(co => {
              if (!coMap[co.linked_job_id]) coMap[co.linked_job_id] = []
              coMap[co.linked_job_id].push(co)
            })
            setJobCOs(coMap)
          }
        }

        // Set estimates excluding any that back a change order, and any
        // blank / orphaned rows (no name) that can be left behind by partial
        // creation flows or interrupted deletes — those have no meaningful
        // display and shouldn't show up in the count or table.
        if (estData) setEstimates(
          estData.filter(e =>
            !coEstimateIds.has(e.id) &&
            (e.estimate_name || '').trim() !== ''
          )
        )
      } else {
        // No jobs — still set estimates (nothing to exclude), but still drop
        // blank / orphaned rows for the same reason as above.
        if (estData) setEstimates(
          estData.filter(e => (e.estimate_name || '').trim() !== '')
        )
      }
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
    const clientName = client.name || [client.first_name, client.last_name].filter(Boolean).join(' ')

    // Gather associated data counts
    const [{ data: ests }, { data: bidsData }, { data: jobsData }] = await Promise.all([
      supabase.from('estimates').select('id').or(`client_name.eq.${clientName},client_id.eq.${id}`),
      supabase.from('bids').select('id').eq('client_name', clientName),
      supabase.from('jobs').select('id').eq('client_name', clientName),
    ])
    const estCount = ests?.length || 0
    const bidCount = bidsData?.length || 0
    let woCount = 0
    if (jobsData?.length) {
      const { count } = await supabase
        .from('work_orders').select('id', { count: 'exact', head: true })
        .in('job_id', jobsData.map(j => j.id))
      woCount = count || 0
    }

    setDeleteModal({
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
        navigate('/clients')
      },
    })
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

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-700"></div>
    </div>
  )
  if (!client) return <div className="card text-center py-12 text-gray-500">Client not found.</div>

  const totalRevenue  = soldJobs.reduce((s, j) => s + parseFloat(j.total_price   || 0), 0)
  const totalGP       = soldJobs.reduce((s, j) => s + parseFloat(j.gross_profit  || 0), 0)
  const totalCOs      = Object.values(jobCOs).flat().length

  return (
    <div>
      {/* ── Client Delete Cascade Modal ── */}
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
                Deleting <span className="text-gray-900 font-bold">{displayName(client) || client.name}</span> will permanently remove all associated data:
              </p>
              <ul className="text-red-700 space-y-0.5 mt-2">
                {deleteModal.estCount > 0 && (
                  <li>• {deleteModal.estCount} Estimate{deleteModal.estCount !== 1 ? 's' : ''}</li>
                )}
                {deleteModal.bidCount > 0 && (
                  <li>• {deleteModal.bidCount} Bid{deleteModal.bidCount !== 1 ? 's' : ''}</li>
                )}
                {deleteModal.woCount > 0 && (
                  <li>• {deleteModal.woCount} Work Order{deleteModal.woCount !== 1 ? 's' : ''}</li>
                )}
                {deleteModal.estCount === 0 && deleteModal.bidCount === 0 && deleteModal.woCount === 0 && (
                  <li className="text-gray-500">No associated estimates, bids, or work orders.</li>
                )}
              </ul>
              <p className="text-xs text-red-600 font-semibold mt-2">There is no option to keep any of this data if the client is deleted.</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={deleteModal.onConfirm}
                className="flex-1 bg-red-600 text-white font-semibold py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 text-sm">
        <Link to="/clients" className="text-gray-400 hover:text-gray-600">← Clients</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-medium">{displayName(client) || client.name}</span>
      </div>

      {/* ── Client Info Card ── */}
      <div className="card mb-4 border-2 border-green-700 bg-blue-50">
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
      <div className="bg-white rounded-xl border border-gray-200 mb-4 overflow-hidden">
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

      {/* ── Tables ── */}
      <div className="space-y-4">

        {/* ── Estimates ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
              Estimates
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">{estimates.length}</span>
            </h2>
            <button onClick={() => setShowEstimateModal(true)} className="btn-primary text-xs px-3 py-1.5">
              + New Estimate
            </button>
          </div>

          {estimates.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-green-700 text-center py-6 text-gray-400 text-sm">
              <p className="mb-3">No estimates yet.</p>
              <button onClick={() => setShowEstimateModal(true)} className="btn-primary text-sm inline-block">
                Create First Estimate
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border-2 border-green-700 overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-2 text-left">Estimate</th>
                    <th className="px-3 py-2 text-right">Man Days</th>
                    <th className="px-3 py-2 text-right">Labor Burden</th>
                    <th className="px-3 py-2 text-right">Materials</th>
                    <th className="px-3 py-2 text-right">Sub Cost</th>
                    <th className="px-3 py-2 text-right">Gross Profit</th>
                    <th className="px-3 py-2 text-right">GPMD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {estimates.map(est => {
                    const t = estimateTotals(est)
                    return (
                      <tr key={est.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-1.5">
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
                        <td className="px-3 py-1.5 text-right text-gray-700">{t.man_days.toFixed(1)}</td>
                        <td className="px-3 py-1.5 text-right text-gray-600">{fmt(t.labor_burden)}</td>
                        <td className="px-3 py-1.5 text-right text-gray-700">{fmt(t.material_cost)}</td>
                        <td className="px-3 py-1.5 text-right text-gray-600">{t.sub_cost > 0 ? fmt(t.sub_cost) : '—'}</td>
                        <td className="px-3 py-1.5 text-right font-medium text-green-700">{t.gross_profit > 0 ? fmt(t.gross_profit) : '—'}</td>
                        <td className="px-3 py-1.5 text-right text-gray-600">
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
          <div className="flex items-center gap-2 mb-2">
            <h2 className="font-semibold text-gray-800 text-sm">Bids</h2>
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">{bids.length}</span>
          </div>

          {bids.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-green-700 text-center py-6 text-gray-400 text-sm">
              No bids yet for this client.
            </div>
          ) : (
            <div className="bg-white rounded-xl border-2 border-green-700 overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-2 text-left">Bid</th>
                    <th className="px-3 py-2 text-right">Date</th>
                    <th className="px-3 py-2 text-right">Gross Profit</th>
                    <th className="px-3 py-2 text-right">Bid Amount</th>
                    <th className="px-3 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bids.map(bid => {
                    const status = bid.status || 'pending'
                    return (
                      <tr key={bid.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-1.5">
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
                        <td className="px-3 py-1.5 text-right text-gray-500 text-xs whitespace-nowrap">
                          {bid.date_submitted ? new Date(bid.date_submitted).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-3 py-1.5 text-right font-medium text-green-700">
                          {bid.gross_profit > 0 ? `$${Math.round(bid.gross_profit).toLocaleString()}` : '—'}
                        </td>
                        <td className="px-3 py-1.5 text-right font-bold text-gray-900 whitespace-nowrap">
                          ${parseFloat(bid.bid_amount || 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-1.5 text-center">
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

        {/* ── Jobs / COs ── */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h2 className="font-semibold text-gray-800 text-sm">Jobs / COs</h2>
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
              {soldJobs.length}{totalCOs > 0 ? ` · ${totalCOs} CO${totalCOs !== 1 ? 's' : ''}` : ''}
            </span>
          </div>

          {soldJobs.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-green-700 text-center py-6 text-gray-400 text-sm">
              No jobs yet for this client.
            </div>
          ) : (
            <div className="bg-white rounded-xl border-2 border-green-700 overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-2 text-left">Job / Change Order</th>
                    <th className="px-3 py-2 text-right">Date</th>
                    <th className="px-3 py-2 text-right">Man Days</th>
                    <th className="px-3 py-2 text-right">Materials</th>
                    <th className="px-3 py-2 text-right">Gross Profit</th>
                    <th className="px-3 py-2 text-right">Total Price</th>
                    <th className="px-3 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {soldJobs.map(job => {
                    const cos = jobCOs[job.id] || []
                    return (
                      <>
                        {/* Job row */}
                        <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-1.5 font-semibold">
                            <Link
                              to={`/jobs/${job.id}`}
                              className="text-green-700 hover:underline"
                            >
                              {job.name}
                            </Link>
                          </td>
                          <td className="px-3 py-1.5 text-right text-gray-500 text-xs whitespace-nowrap">
                            {job.sold_date ? new Date(job.sold_date).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-3 py-1.5 text-right text-gray-700">
                            {parseFloat(job.total_man_days || 0).toFixed(1)}
                          </td>
                          <td className="px-3 py-1.5 text-right text-gray-700">{fmt(job.material_cost)}</td>
                          <td className="px-3 py-1.5 text-right font-medium text-green-700">{fmt(job.gross_profit)}</td>
                          <td className="px-3 py-1.5 text-right font-bold text-gray-900">{fmt(job.total_price)}</td>
                          <td className="px-3 py-1.5 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              job.status === 'active'    ? 'bg-green-50 text-green-800 border border-green-300' :
                              job.status === 'complete'  ? 'bg-blue-50 text-blue-800 border border-blue-300' :
                              job.status === 'on_hold'   ? 'bg-yellow-50 text-yellow-800 border border-yellow-300' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {job.status ? job.status.charAt(0).toUpperCase() + job.status.slice(1).replace('_', ' ') : '—'}
                            </span>
                          </td>
                        </tr>

                        {/* CO sub-rows */}
                        {cos.map(co => {
                          const coStatus = co.status || 'pending'
                          return (
                            <tr key={co.id} className="bg-blue-50/40 hover:bg-blue-50 transition-colors border-b border-blue-100/60">
                              <td className="pl-8 pr-3 py-1.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-blue-300 text-xs">↳</span>
                                  {co.estimate_id ? (
                                    <Link
                                      to={`/estimates/${co.estimate_id}?co=1&job_id=${co.linked_job_id || ''}&co_name=${encodeURIComponent(co.co_name || '')}&co_type=${encodeURIComponent(co.co_type || '')}`}
                                      className="text-xs font-medium text-blue-700 hover:underline"
                                    >
                                      {co.co_name || '—'}
                                    </Link>
                                  ) : (
                                    <span className="text-xs font-medium text-blue-700">{co.co_name || '—'}</span>
                                  )}
                                  {co.co_type && (
                                    <span className="text-[10px] text-blue-400">{co.co_type}</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-1.5 text-right text-gray-400 text-xs whitespace-nowrap">
                                {co.date_submitted ? new Date(co.date_submitted).toLocaleDateString() : '—'}
                              </td>
                              <td className="px-3 py-1.5 text-right text-gray-400 text-xs">—</td>
                              <td className="px-3 py-1.5 text-right text-gray-400 text-xs">—</td>
                              <td className="px-3 py-1.5 text-right text-xs font-medium text-green-600">
                                {co.gross_profit > 0 ? `$${Math.round(co.gross_profit).toLocaleString()}` : '—'}
                              </td>
                              <td className="px-3 py-1.5 text-right text-xs font-semibold text-gray-700">
                                ${parseFloat(co.bid_amount || 0).toLocaleString()}
                              </td>
                              <td className="px-3 py-1.5 text-center">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BID_STATUS_STYLES[coStatus] || BID_STATUS_STYLES.pending}`}>
                                  {coStatus.charAt(0).toUpperCase() + coStatus.slice(1)}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </>
                    )
                  })}
                </tbody>
                {soldJobs.length > 1 && (
                  <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                    <tr className="text-xs font-semibold text-gray-600">
                      <td className="px-4 py-2" colSpan={2}>Totals</td>
                      <td className="px-3 py-2 text-right">
                        {soldJobs.reduce((s, j) => s + parseFloat(j.total_man_days || 0), 0).toFixed(1)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {fmt(soldJobs.reduce((s, j) => s + parseFloat(j.material_cost || 0), 0))}
                      </td>
                      <td className="px-3 py-2 text-right text-green-700">{fmt(totalGP)}</td>
                      <td className="px-3 py-2 text-right font-bold text-gray-900">{fmt(totalRevenue)}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
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
