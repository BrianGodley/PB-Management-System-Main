import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const CREW_TYPES = ['General', 'Demo', 'Concrete', 'Irrigation', 'Planting']

const STATUS_LABELS = {
  active: 'badge-active',
  completed: 'badge-completed',
  on_hold: 'badge-hold',
  cancelled: 'badge-cancelled',
}

export default function JobDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [job, setJob] = useState(null)
  const [laborRate, setLaborRate] = useState(400)
  const [loading, setLoading] = useState(true)
  const [showCOForm, setShowCOForm] = useState(false)
  const [savingCO, setSavingCO] = useState(false)
  const [editingStatus, setEditingStatus] = useState(false)

  const [coForm, setCOForm] = useState({
    description: '', additional_contract_price: '', additional_man_days: '', additional_material_cost: '', notes: '', date_added: new Date().toISOString().split('T')[0]
  })

  useEffect(() => { fetchData() }, [id])

  async function fetchData() {
    setLoading(true)
    const [settingsRes, jobRes] = await Promise.all([
      supabase.from('company_settings').select('*').single(),
      supabase.from('jobs').select(`
        *,
        projects (
          *,
          modules (
            *,
            actual_entries (*)
          )
        ),
        change_orders (*)
      `).eq('id', id).single()
    ])
    if (settingsRes.data) setLaborRate(parseFloat(settingsRes.data.labor_rate_per_man_day) || 400)
    if (jobRes.data) setJob(jobRes.data)
    setLoading(false)
  }

  async function updateStatus(status) {
    await supabase.from('jobs').update({ status }).eq('id', id)
    setJob(prev => ({ ...prev, status }))
    setEditingStatus(false)
  }

  async function saveCO(e) {
    e.preventDefault()
    if (!coForm.description.trim()) return
    setSavingCO(true)
    const { error } = await supabase.from('change_orders').insert({
      job_id: id,
      description: coForm.description.trim(),
      additional_contract_price: parseFloat(coForm.additional_contract_price) || 0,
      additional_man_days: parseFloat(coForm.additional_man_days) || 0,
      additional_material_cost: parseFloat(coForm.additional_material_cost) || 0,
      notes: coForm.notes.trim(),
      date_added: coForm.date_added || new Date().toISOString().split('T')[0],
      created_by: user?.id,
    })
    setSavingCO(false)
    if (!error) {
      setCOForm({ description: '', additional_contract_price: '', additional_man_days: '', additional_material_cost: '', notes: '', date_added: new Date().toISOString().split('T')[0] })
      setShowCOForm(false)
      fetchData()
    }
  }

  async function deleteCO(coId) {
    if (!confirm('Delete this change order?')) return
    await supabase.from('change_orders').delete().eq('id', coId)
    fetchData()
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-700"></div></div>
  if (!job) return <div className="card text-center py-12 text-gray-500">Job not found.</div>

  const changeOrderRevenue = (job.change_orders || []).reduce((s, co) => s + parseFloat(co.additional_contract_price || 0), 0)
  const totalRevenue = parseFloat(job.contract_price || 0) + changeOrderRevenue

  let totalEstMD = 0, totalEstMat = 0
  for (const p of job.projects || []) {
    for (const m of p.modules || []) {
      totalEstMD += parseFloat(m.estimated_man_days || 0)
      totalEstMat += parseFloat(m.estimated_material_cost || 0)
    }
  }
  const coMD = (job.change_orders || []).reduce((s, co) => s + parseFloat(co.additional_man_days || 0), 0)
  const coMat = (job.change_orders || []).reduce((s, co) => s + parseFloat(co.additional_material_cost || 0), 0)
  const totalEstLabor = (totalEstMD + coMD) * laborRate
  const totalEstGP = totalRevenue - totalEstLabor - (totalEstMat + coMat)
  const totalEstGPPct = totalRevenue > 0 ? (totalEstGP / totalRevenue) * 100 : 0

  const crewColors = {
    General: 'bg-gray-100 text-gray-700',
    Demo: 'bg-orange-100 text-orange-700',
    Concrete: 'bg-stone-100 text-stone-700',
    Irrigation: 'bg-blue-100 text-blue-700',
    Planting: 'bg-green-100 text-green-700',
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link to="/" className="text-gray-400 hover:text-gray-600 text-sm">← Jobs</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-medium truncate">{job.client_name}</span>
      </div>

      {/* Job header card */}
      <div className="card mb-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{job.client_name}</h1>
            <p className="text-gray-500 text-sm">{job.job_address}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {editingStatus ? (
              <select
                className="input text-sm w-32"
                value={job.status}
                onChange={e => updateStatus(e.target.value)}
                onBlur={() => setEditingStatus(false)}
                autoFocus
              >
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            ) : (
              <button onClick={() => setEditingStatus(true)} className={STATUS_LABELS[job.status] || 'badge-active'}>
                {job.status === 'on_hold' ? 'On Hold' : job.status?.charAt(0).toUpperCase() + job.status?.slice(1)} ✏️
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm text-gray-600 mb-4">
          {job.salesperson && <div><span className="font-medium text-gray-500 text-xs block">Salesperson</span>{job.salesperson}</div>}
          {job.date_sold && <div><span className="font-medium text-gray-500 text-xs block">Date Sold</span>{new Date(job.date_sold).toLocaleDateString()}</div>}
          {job.start_date && <div><span className="font-medium text-gray-500 text-xs block">Start Date</span>{new Date(job.start_date).toLocaleDateString()}</div>}
          {job.estimated_completion && <div><span className="font-medium text-gray-500 text-xs block">Est. Completion</span>{new Date(job.estimated_completion).toLocaleDateString()}</div>}
        </div>

        {/* Financial summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Contract</p>
            <p className="font-bold text-gray-900">${parseFloat(job.contract_price || 0).toLocaleString()}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Change Orders</p>
            <p className="font-bold text-blue-700">+${changeOrderRevenue.toLocaleString()}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Total Revenue</p>
            <p className="font-bold text-gray-900">${totalRevenue.toLocaleString()}</p>
          </div>
          <div className={`rounded-lg p-3 text-center ${totalEstGPPct >= 25 ? 'bg-green-50' : totalEstGPPct >= 10 ? 'bg-yellow-50' : 'bg-red-50'}`}>
            <p className="text-xs text-gray-500">Est. GP</p>
            <p className={`font-bold ${totalEstGPPct >= 25 ? 'text-green-700' : totalEstGPPct >= 10 ? 'text-yellow-700' : 'text-red-700'}`}>
              {totalEstGPPct.toFixed(1)}%
            </p>
          </div>
        </div>

        {job.notes && <p className="mt-3 text-sm text-gray-500 italic">{job.notes}</p>}

        <div className="mt-4">
          <Link to={`/jobs/${id}/tracker`} className="btn-primary w-full text-center block">
            📊 Open Job Tracker
          </Link>
        </div>
      </div>

      {/* Projects */}
      <div className="mb-4">
        <h2 className="font-semibold text-gray-900 mb-3 text-lg">Projects & Modules</h2>
        {(job.projects || []).length === 0 ? (
          <div className="card text-center text-gray-400 py-8">No projects added.</div>
        ) : (
          (job.projects || []).map(project => (
            <div key={project.id} className="card mb-3">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{project.project_name}</h3>
                  <span className="text-xs text-gray-400">{project.project_type}</span>
                </div>
              </div>
              {(project.modules || []).map(mod => {
                const actualMD = (mod.actual_entries || []).reduce((s, e) => s + parseFloat(e.actual_man_days || 0), 0)
                const actualMat = (mod.actual_entries || []).reduce((s, e) => s + parseFloat(e.actual_material_cost || 0), 0)
                return (
                  <div key={mod.id} className="bg-gray-50 rounded-lg p-3 mb-2">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-gray-800 text-sm">{mod.module_name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${crewColors[mod.crew_type] || crewColors.General}`}>{mod.crew_type}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 text-xs text-gray-600">
                      <span>Est. Man Days: <b>{parseFloat(mod.estimated_man_days || 0).toFixed(1)}</b></span>
                      <span>Act. Man Days: <b>{actualMD.toFixed(1)}</b></span>
                      <span>Est. Materials: <b>${parseFloat(mod.estimated_material_cost || 0).toLocaleString()}</b></span>
                      <span>Act. Materials: <b>${actualMat.toLocaleString()}</b></span>
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>

      {/* Change Orders */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900 text-lg">Change Orders</h2>
          <button onClick={() => setShowCOForm(!showCOForm)} className="btn-secondary text-sm">
            {showCOForm ? 'Cancel' : '+ Add Change Order'}
          </button>
        </div>

        {showCOForm && (
          <form onSubmit={saveCO} className="card mb-3">
            <h3 className="font-medium text-gray-900 mb-3">New Change Order</h3>
            <div className="space-y-3">
              <div>
                <label className="label">Description *</label>
                <input className="input" value={coForm.description} onChange={e => setCOForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe the change..." required />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label text-xs">Add. Price ($)</label>
                  <input className="input text-sm" type="number" step="0.01" value={coForm.additional_contract_price} onChange={e => setCOForm(p => ({ ...p, additional_contract_price: e.target.value }))} placeholder="0.00" />
                </div>
                <div>
                  <label className="label text-xs">Add. Man Days</label>
                  <input className="input text-sm" type="number" step="0.25" value={coForm.additional_man_days} onChange={e => setCOForm(p => ({ ...p, additional_man_days: e.target.value }))} placeholder="0.0" />
                </div>
                <div>
                  <label className="label text-xs">Add. Materials ($)</label>
                  <input className="input text-sm" type="number" step="0.01" value={coForm.additional_material_cost} onChange={e => setCOForm(p => ({ ...p, additional_material_cost: e.target.value }))} placeholder="0.00" />
                </div>
              </div>
              <div>
                <label className="label">Date</label>
                <input className="input" type="date" value={coForm.date_added} onChange={e => setCOForm(p => ({ ...p, date_added: e.target.value }))} />
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input resize-none" rows={2} value={coForm.notes} onChange={e => setCOForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes..." />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowCOForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={savingCO} className="btn-primary flex-1">{savingCO ? 'Saving...' : 'Save Change Order'}</button>
              </div>
            </div>
          </form>
        )}

        {(job.change_orders || []).length === 0 && !showCOForm ? (
          <div className="card text-center text-gray-400 py-6 text-sm">No change orders yet.</div>
        ) : (
          (job.change_orders || []).map(co => (
            <div key={co.id} className="card mb-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900">{co.description}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{new Date(co.date_added).toLocaleDateString()}</p>
                </div>
                <button onClick={() => deleteCO(co.id)} className="text-red-400 hover:text-red-600 text-xs ml-2">Delete</button>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-gray-600">
                <span>+${parseFloat(co.additional_contract_price || 0).toLocaleString()} revenue</span>
                <span>+{parseFloat(co.additional_man_days || 0).toFixed(1)} man days</span>
                <span>+${parseFloat(co.additional_material_cost || 0).toLocaleString()} materials</span>
              </div>
              {co.notes && <p className="text-xs text-gray-400 mt-1 italic">{co.notes}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
