import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const STATUS_LABELS = {
  active: { label: 'Active', cls: 'badge-active' },
  completed: { label: 'Completed', cls: 'badge-completed' },
  on_hold: { label: 'On Hold', cls: 'badge-hold' },
  cancelled: { label: 'Cancelled', cls: 'badge-cancelled' },
}

function calcJobGP(job) {
  const laborRate = job.labor_rate || 400
  let estManDays = 0, estMaterials = 0
  let actualManDays = 0, actualMaterials = 0
  let changeOrderPrice = 0, changeOrderMD = 0, changeOrderMat = 0

  for (const project of job.projects || []) {
    for (const mod of project.modules || []) {
      estManDays += parseFloat(mod.estimated_man_days || 0)
      estMaterials += parseFloat(mod.estimated_material_cost || 0)
      for (const entry of mod.actual_entries || []) {
        actualManDays += parseFloat(entry.actual_man_days || 0)
        actualMaterials += parseFloat(entry.actual_material_cost || 0)
      }
    }
  }
  for (const co of job.change_orders || []) {
    changeOrderPrice += parseFloat(co.additional_contract_price || 0)
    changeOrderMD += parseFloat(co.additional_man_days || 0)
    changeOrderMat += parseFloat(co.additional_material_cost || 0)
  }

  const totalRevenue = parseFloat(job.contract_price || 0) + changeOrderPrice
  const estLaborCost = (estManDays + changeOrderMD) * laborRate
  const estMaterialTotal = estMaterials + changeOrderMat
  const estGP = totalRevenue - estLaborCost - estMaterialTotal
  const estGPPct = totalRevenue > 0 ? (estGP / totalRevenue) * 100 : 0

  const actualLaborCost = actualManDays * laborRate
  const actualGP = totalRevenue - actualLaborCost - actualMaterials
  const actualGPPct = totalRevenue > 0 ? (actualGP / totalRevenue) * 100 : 0

  return { totalRevenue, estGP, estGPPct, actualGP, actualGPPct, estManDays, actualManDays }
}

export default function Dashboard() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [laborRate, setLaborRate] = useState(400)
  const [filter, setFilter] = useState('active')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    const [settingsRes, jobsRes] = await Promise.all([
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
      `).order('created_at', { ascending: false })
    ])

    if (settingsRes.data) setLaborRate(parseFloat(settingsRes.data.labor_rate_per_man_day) || 400)
    if (jobsRes.data) {
      setJobs(jobsRes.data.map(j => ({ ...j, labor_rate: parseFloat(settingsRes.data?.labor_rate_per_man_day) || 400 })))
    }
    setLoading(false)
  }

  const filteredJobs = jobs.filter(j => {
    const matchStatus = filter === 'all' || j.status === filter
    const matchSearch = j.client_name.toLowerCase().includes(search.toLowerCase()) ||
      j.job_address.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const totalActiveRevenue = jobs.filter(j => j.status === 'active').reduce((s, j) => {
    const { totalRevenue } = calcJobGP(j)
    return s + totalRevenue
  }, 0)

  const totalEstGP = jobs.filter(j => j.status === 'active').reduce((s, j) => {
    const { estGP } = calcJobGP(j)
    return s + estGP
  }, 0)

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-700"></div>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0 gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">{jobs.filter(j => j.status === 'active').length} active jobs</p>
        </div>
        <Link to="/jobs/new" className="btn-primary hidden sm:block text-sm px-3 py-1.5">+ Add Job</Link>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <div className="card">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Active Revenue</p>
          <p className="text-xl font-bold text-gray-900">${totalActiveRevenue.toLocaleString()}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Est. Gross Profit</p>
          <p className={`text-xl font-bold ${totalEstGP >= 0 ? 'text-green-700' : 'text-red-600'}`}>
            ${totalEstGP.toLocaleString()}
          </p>
        </div>
        <div className="card hidden md:block">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Active Jobs</p>
          <p className="text-xl font-bold text-gray-900">{jobs.filter(j => j.status === 'active').length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by client or address..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input sm:max-w-xs"
        />
        <div className="flex gap-1 flex-wrap">
          {['active', 'on_hold', 'completed', 'cancelled', 'all'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                filter === s ? 'bg-green-700 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {s === 'on_hold' ? 'On Hold' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Job cards */}
      {filteredJobs.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">🌿</p>
          <p className="text-gray-500 mb-4">No jobs found.</p>
          <Link to="/jobs/new" className="btn-primary inline-block">Create Your First Job</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredJobs.map(job => {
            const { totalRevenue, estGP, estGPPct, actualGP, actualGPPct } = calcJobGP(job)
            const statusInfo = STATUS_LABELS[job.status] || STATUS_LABELS.active
            const gpColor = estGPPct >= 30 ? 'text-green-700' : estGPPct >= 15 ? 'text-yellow-600' : 'text-red-600'
            const actualColor = actualGPPct >= 30 ? 'text-green-700' : actualGPPct >= 15 ? 'text-yellow-600' : 'text-red-600'

            return (
              <div key={job.id} className="card hover:shadow-md transition-shadow">
                {/* Card header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 truncate">{job.client_name}</p>
                    <p className="text-xs text-gray-500 truncate">{job.job_address}</p>
                  </div>
                  <span className={statusInfo.cls}>{statusInfo.label}</span>
                </div>

                {/* Financial summary */}
                <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-xs text-gray-500">Revenue</p>
                    <p className="text-sm font-semibold text-gray-900">${totalRevenue.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-xs text-gray-500">Est. GP</p>
                    <p className={`text-sm font-semibold ${gpColor}`}>{estGPPct.toFixed(0)}%</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-xs text-gray-500">Act. GP</p>
                    <p className={`text-sm font-semibold ${actualColor}`}>{actualGPPct.toFixed(0)}%</p>
                  </div>
                </div>

                {/* Info row */}
                <div className="text-xs text-gray-500 mb-3 space-y-0.5">
                  {job.salesperson && <p>👤 {job.salesperson}</p>}
                  {job.start_date && <p>📅 Start: {new Date(job.start_date).toLocaleDateString()}</p>}
                  <p>📁 {(job.projects || []).length} project(s)</p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Link to={`/jobs/${job.id}`} className="flex-1 btn-secondary text-center text-sm">
                    View Job
                  </Link>
                  <Link to={`/jobs/${job.id}/tracker`} className="flex-1 btn-primary text-center text-sm">
                    📊 Tracker
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
