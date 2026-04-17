import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import ModuleTrackerRow from '../components/ModuleTrackerRow'
import GPSummaryCard from '../components/GPSummaryCard'

export default function JobTracker() {
  const { id } = useParams()
  const { user } = useAuth()
  const [job, setJob] = useState(null)
  const [laborRate, setLaborRate] = useState(400)
  const [loading, setLoading] = useState(true)
  const [logTarget, setLogTarget] = useState(null) // module to log entry for
  const [logForm, setLogForm] = useState({ actual_man_days: '', actual_material_cost: '', entry_date: new Date().toISOString().split('T')[0], notes: '' })
  const [savingLog, setSavingLog] = useState(false)
  const [showHistory, setShowHistory] = useState({}) // moduleId -> bool

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
            actual_entries ( * )
          )
        ),
        change_orders (*)
      `).eq('id', id).single()
    ])
    if (settingsRes.data) setLaborRate(parseFloat(settingsRes.data.labor_rate_per_man_day) || 400)
    if (jobRes.data) setJob(jobRes.data)
    setLoading(false)
  }

  async function saveLogEntry(e) {
    e.preventDefault()
    if (!logTarget) return
    setSavingLog(true)
    const { error } = await supabase.from('actual_entries').insert({
      module_id: logTarget.id,
      entry_date: logForm.entry_date || new Date().toISOString().split('T')[0],
      actual_man_days: parseFloat(logForm.actual_man_days) || 0,
      actual_material_cost: parseFloat(logForm.actual_material_cost) || 0,
      notes: logForm.notes.trim(),
      created_by: user?.id,
    })
    setSavingLog(false)
    if (!error) {
      setLogTarget(null)
      setLogForm({ actual_man_days: '', actual_material_cost: '', entry_date: new Date().toISOString().split('T')[0], notes: '' })
      fetchData()
    }
  }

  async function deleteEntry(entryId) {
    if (!confirm('Delete this entry?')) return
    await supabase.from('actual_entries').delete().eq('id', entryId)
    fetchData()
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-700"></div></div>
  if (!job) return <div className="card text-center py-12 text-gray-500">Job not found.</div>

  // ---- Calculations ----
  let estManDays = 0, estMaterials = 0
  let actualManDays = 0, actualMaterials = 0

  for (const p of job.projects || []) {
    for (const m of p.modules || []) {
      estManDays += parseFloat(m.estimated_man_days || 0)
      estMaterials += parseFloat(m.estimated_material_cost || 0)
      for (const e of m.actual_entries || []) {
        actualManDays += parseFloat(e.actual_man_days || 0)
        actualMaterials += parseFloat(e.actual_material_cost || 0)
      }
    }
  }

  const coRevenue = (job.change_orders || []).reduce((s, co) => s + parseFloat(co.additional_contract_price || 0), 0)
  const coManDays = (job.change_orders || []).reduce((s, co) => s + parseFloat(co.additional_man_days || 0), 0)
  const coMaterials = (job.change_orders || []).reduce((s, co) => s + parseFloat(co.additional_material_cost || 0), 0)

  const totalRevenue = parseFloat(job.contract_price || 0) + coRevenue
  const totalEstMD = estManDays + coManDays
  const totalEstMat = estMaterials + coMaterials
  const totalEstLaborCost = totalEstMD * laborRate
  const totalEstCost = totalEstLaborCost + totalEstMat
  const estGP = totalRevenue - totalEstCost
  const estGPPct = totalRevenue > 0 ? (estGP / totalRevenue) * 100 : 0

  const totalActualLaborCost = actualManDays * laborRate
  const totalActualCost = totalActualLaborCost + actualMaterials
  const actualGP = totalRevenue - totalActualCost
  const actualGPPct = totalRevenue > 0 ? (actualGP / totalRevenue) * 100 : 0

  const overallPct = totalEstCost > 0 ? Math.min(100, (totalActualCost / totalEstCost) * 100) : 0
  const gpTrend = actualGP > estGP ? '📈' : actualGP < estGP ? '📉' : '➡️'

  const crewColors = {
    General: 'bg-gray-100 text-gray-700',
    Demo: 'bg-orange-100 text-orange-700',
    Concrete: 'bg-stone-100 text-stone-700',
    Irrigation: 'bg-blue-100 text-blue-700',
    Planting: 'bg-green-100 text-green-700',
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 text-sm">
        <Link to="/" className="text-gray-400 hover:text-gray-600">Jobs</Link>
        <span className="text-gray-300">/</span>
        <Link to={`/jobs/${id}`} className="text-gray-400 hover:text-gray-600 truncate max-w-[120px]">{job.client_name}</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-medium">Tracker</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Job Tracker</h1>
      <p className="text-gray-500 text-sm mb-5">{job.client_name} — {job.job_address}</p>

      {/* Overall progress bar */}
      <div className="card mb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="font-semibold text-gray-800">Overall Cost Progress</p>
          <span className={`text-sm font-bold ${overallPct > 100 ? 'text-red-600' : 'text-gray-700'}`}>{overallPct.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3 mb-1">
          <div
            className={`h-3 rounded-full transition-all ${overallPct > 100 ? 'bg-red-500' : overallPct > 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
            style={{ width: `${Math.min(overallPct, 100)}%` }}
          ></div>
        </div>
        <p className="text-xs text-gray-500">Actual cost vs. estimated cost budget</p>
      </div>

      {/* GP Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <GPSummaryCard label="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} color="blue" />
        <GPSummaryCard label="Est. Gross Profit" value={`$${estGP.toLocaleString()}`} sub={`${estGPPct.toFixed(1)}% margin`} color={estGPPct >= 25 ? 'green' : estGPPct >= 10 ? 'yellow' : 'red'} />
        <GPSummaryCard label={`Running GP ${gpTrend}`} value={`$${actualGP.toLocaleString()}`} sub={`${actualGPPct.toFixed(1)}% margin`} color={actualGPPct >= 25 ? 'green' : actualGPPct >= 10 ? 'yellow' : 'red'} large />
        <GPSummaryCard label="GP Variance" value={`${actualGP - estGP >= 0 ? '+' : ''}$${(actualGP - estGP).toLocaleString()}`} sub="vs. estimate" color={actualGP >= estGP ? 'green' : 'red'} />
      </div>

      {/* Detailed breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3">Estimated Budget</h3>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              <tr><td className="py-1.5 text-gray-500">Contract Price</td><td className="text-right font-medium">${parseFloat(job.contract_price || 0).toLocaleString()}</td></tr>
              {coRevenue > 0 && <tr><td className="py-1.5 text-gray-500">Change Orders</td><td className="text-right font-medium text-blue-600">+${coRevenue.toLocaleString()}</td></tr>}
              <tr><td className="py-1.5 text-gray-500">Total Revenue</td><td className="text-right font-bold">${totalRevenue.toLocaleString()}</td></tr>
              <tr><td className="py-1.5 text-gray-500">Est. Labor ({totalEstMD.toFixed(1)} MD × ${laborRate})</td><td className="text-right text-red-600">-${totalEstLaborCost.toLocaleString()}</td></tr>
              <tr><td className="py-1.5 text-gray-500">Est. Materials</td><td className="text-right text-red-600">-${totalEstMat.toLocaleString()}</td></tr>
              <tr className="border-t-2 border-gray-200"><td className="py-2 font-semibold">Est. Gross Profit</td><td className={`text-right font-bold text-lg ${estGP >= 0 ? 'text-green-700' : 'text-red-600'}`}>${estGP.toLocaleString()}</td></tr>
            </tbody>
          </table>
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3">Actual to Date</h3>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              <tr><td className="py-1.5 text-gray-500">Total Revenue</td><td className="text-right font-medium">${totalRevenue.toLocaleString()}</td></tr>
              <tr><td className="py-1.5 text-gray-500">Actual Labor ({actualManDays.toFixed(1)} MD × ${laborRate})</td><td className="text-right text-red-600">-${totalActualLaborCost.toLocaleString()}</td></tr>
              <tr><td className="py-1.5 text-gray-500">Actual Materials</td><td className="text-right text-red-600">-${actualMaterials.toLocaleString()}</td></tr>
              <tr className="border-t-2 border-gray-200"><td className="py-2 font-semibold">Running GP</td><td className={`text-right font-bold text-lg ${actualGP >= 0 ? 'text-green-700' : 'text-red-600'}`}>${actualGP.toLocaleString()}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Change Orders summary */}
      {(job.change_orders || []).length > 0 && (
        <div className="card mb-5">
          <h3 className="font-semibold text-gray-800 mb-2">Change Orders</h3>
          <div className="space-y-2">
            {job.change_orders.map(co => (
              <div key={co.id} className="flex items-center justify-between text-sm p-2 bg-blue-50 rounded-lg">
                <span className="text-gray-700">{co.description}</span>
                <span className="text-blue-700 font-medium ml-2">+${parseFloat(co.additional_contract_price || 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Log Entry Modal */}
      {logTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-900">Log Entry</h3>
                  <p className="text-sm text-gray-500">{logTarget.module_name}</p>
                </div>
                <button onClick={() => setLogTarget(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
              </div>
              <form onSubmit={saveLogEntry} className="space-y-3">
                <div>
                  <label className="label">Date</label>
                  <input className="input" type="date" value={logForm.entry_date} onChange={e => setLogForm(p => ({ ...p, entry_date: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Man Days Worked (1 MD = 8 hrs)</label>
                  <input className="input" type="number" step="0.25" min="0" value={logForm.actual_man_days} onChange={e => setLogForm(p => ({ ...p, actual_man_days: e.target.value }))} placeholder="e.g. 2.5" />
                  {logForm.actual_man_days && <p className="text-xs text-gray-400 mt-1">= {(parseFloat(logForm.actual_man_days) * 8).toFixed(1)} hours | Cost: ${(parseFloat(logForm.actual_man_days) * laborRate).toLocaleString()}</p>}
                </div>
                <div>
                  <label className="label">Material Cost ($)</label>
                  <input className="input" type="number" step="0.01" min="0" value={logForm.actual_material_cost} onChange={e => setLogForm(p => ({ ...p, actual_material_cost: e.target.value }))} placeholder="0.00" />
                </div>
                <div>
                  <label className="label">Notes (optional)</label>
                  <textarea className="input resize-none" rows={2} value={logForm.notes} onChange={e => setLogForm(p => ({ ...p, notes: e.target.value }))} placeholder="What was done today..." />
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setLogTarget(null)} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" disabled={savingLog} className="btn-primary flex-1">{savingLog ? 'Saving...' : 'Save Entry'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Per-project module tracker */}
      <div>
        <h2 className="font-semibold text-gray-900 text-lg mb-3">Module Breakdown</h2>
        {(job.projects || []).map(project => (
          <div key={project.id} className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-green-800">{project.project_name}</h3>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{project.project_type}</span>
            </div>
            {(project.modules || []).map(mod => (
              <div key={mod.id}>
                <ModuleTrackerRow
                  module={mod}
                  laborRate={laborRate}
                  onLogEntry={(m) => {
                    setLogTarget(m)
                    setLogForm({ actual_man_days: '', actual_material_cost: '', entry_date: new Date().toISOString().split('T')[0], notes: '' })
                  }}
                />

                {/* Entry history toggle */}
                {(mod.actual_entries || []).length > 0 && (
                  <div className="mb-3 -mt-2">
                    <button
                      onClick={() => setShowHistory(prev => ({ ...prev, [mod.id]: !prev[mod.id] }))}
                      className="text-xs text-green-700 font-medium hover:underline px-4"
                    >
                      {showHistory[mod.id] ? '▲ Hide' : '▼ Show'} {mod.actual_entries.length} entr{mod.actual_entries.length === 1 ? 'y' : 'ies'}
                    </button>

                    {showHistory[mod.id] && (
                      <div className="mt-2 mx-1 border border-gray-100 rounded-lg overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left py-2 px-3 text-gray-500">Date</th>
                              <th className="text-right py-2 px-3 text-gray-500">Man Days</th>
                              <th className="text-right py-2 px-3 text-gray-500">Materials</th>
                              <th className="text-right py-2 px-3 text-gray-500">Notes</th>
                              <th className="py-2 px-3"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {mod.actual_entries.sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date)).map(entry => (
                              <tr key={entry.id} className="bg-white hover:bg-gray-50">
                                <td className="py-2 px-3 text-gray-700">{new Date(entry.entry_date).toLocaleDateString()}</td>
                                <td className="py-2 px-3 text-right text-gray-700">{parseFloat(entry.actual_man_days || 0).toFixed(2)}</td>
                                <td className="py-2 px-3 text-right text-gray-700">${parseFloat(entry.actual_material_cost || 0).toLocaleString()}</td>
                                <td className="py-2 px-3 text-right text-gray-400 max-w-[100px] truncate">{entry.notes || '-'}</td>
                                <td className="py-2 px-3">
                                  <button onClick={() => deleteEntry(entry.id)} className="text-red-400 hover:text-red-600">✕</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
