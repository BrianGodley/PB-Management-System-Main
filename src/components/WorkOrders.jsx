import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  pending:     'bg-yellow-50 text-yellow-800 border-yellow-300',
  in_progress: 'bg-blue-50 text-blue-800 border-blue-300',
  complete:    'bg-green-50 text-green-800 border-green-300',
}
const STATUS_LABELS = {
  pending:     'Pending',
  in_progress: 'In Progress',
  complete:    'Complete',
}
const STATUS_DOT = {
  pending:     'bg-yellow-400',
  in_progress: 'bg-blue-500',
  complete:    'bg-green-500',
}

const TYPE_COLORS = {
  'Vehicle':     'bg-blue-100 text-blue-800',
  'Trailer':     'bg-orange-100 text-orange-800',
  'Large Power': 'bg-red-100 text-red-800',
  'Small Power': 'bg-yellow-100 text-yellow-800',
  'Hand Tool':   'bg-green-100 text-green-800',
}

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0)
}
function fmtHrs(n) {
  return `${parseFloat(n || 0).toFixed(1)} hrs`
}
function fmtDays(n) {
  const v = parseFloat(n || 0)
  return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)} MD`
}

// ─────────────────────────────────────────────────────────────────────────────
// Work Order Card
// ─────────────────────────────────────────────────────────────────────────────
function WorkOrderCard({ wo, equipment, onStatusChange }) {
  const [updating, setUpdating] = useState(false)

  async function cycleStatus() {
    const next = { pending: 'in_progress', in_progress: 'complete', complete: 'pending' }
    const newStatus = next[wo.status] || 'pending'
    setUpdating(true)
    await supabase.from('work_orders').update({ status: newStatus }).eq('id', wo.id)
    onStatusChange(wo.id, newStatus)
    setUpdating(false)
  }

  return (
    <div className={`bg-white border rounded-xl overflow-hidden ${wo.is_subcontractor ? 'border-orange-200' : 'border-gray-200'}`}>
      {/* Card header */}
      <div className={`flex items-center justify-between px-4 py-3 ${wo.is_subcontractor ? 'bg-orange-50 border-b border-orange-100' : 'bg-gray-50 border-b border-gray-100'}`}>
        <div className="flex items-center gap-2 min-w-0">
          {wo.is_subcontractor && (
            <span className="flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full bg-orange-200 text-orange-900">
              🔧 SUB
            </span>
          )}
          <span className="text-sm font-bold text-gray-900 truncate">{wo.module_type}</span>
          {wo.project_name && (
            <>
              <span className="text-gray-300 flex-shrink-0">·</span>
              <span className="text-xs text-gray-500 truncate">{wo.project_name}</span>
            </>
          )}
        </div>

        {/* Status toggle */}
        <button
          onClick={cycleStatus}
          disabled={updating}
          className={`flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors ${STATUS_STYLES[wo.status]}`}
          title="Click to advance status"
        >
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[wo.status]}`} />
          {STATUS_LABELS[wo.status]}
        </button>
      </div>

      {/* Card body */}
      <div className="px-4 py-3 space-y-3">

        {/* Metrics row */}
        <div className="flex flex-wrap gap-4 text-sm">
          {!wo.is_subcontractor && (
            <>
              {parseFloat(wo.labor_hours) > 0 && (
                <div>
                  <span className="text-xs text-gray-400 block">Labor Hours</span>
                  <span className="font-semibold text-gray-800">{fmtHrs(wo.labor_hours)}</span>
                </div>
              )}
              {parseFloat(wo.man_days) > 0 && (
                <div>
                  <span className="text-xs text-gray-400 block">Man Days</span>
                  <span className="font-semibold text-gray-800">{fmtDays(wo.man_days)}</span>
                </div>
              )}
              {parseFloat(wo.labor_cost) > 0 && (
                <div>
                  <span className="text-xs text-gray-400 block">Labor Cost</span>
                  <span className="font-semibold text-gray-800">{fmt(wo.labor_cost)}</span>
                </div>
              )}
              {parseFloat(wo.material_cost) > 0 && (
                <div>
                  <span className="text-xs text-gray-400 block">Materials</span>
                  <span className="font-semibold text-gray-800">{fmt(wo.material_cost)}</span>
                </div>
              )}
            </>
          )}
          {wo.is_subcontractor && parseFloat(wo.sub_cost) > 0 && (
            <div>
              <span className="text-xs text-gray-400 block">Sub Cost</span>
              <span className="font-semibold text-orange-700">{fmt(wo.sub_cost)}</span>
            </div>
          )}
          {parseFloat(wo.total_price) > 0 && (
            <div>
              <span className="text-xs text-gray-400 block">Total Value</span>
              <span className="font-semibold text-green-700">{fmt(wo.total_price)}</span>
            </div>
          )}
        </div>

        {/* Equipment list */}
        {!wo.is_subcontractor && equipment.length > 0 && (
          <div>
            <span className="text-xs text-gray-400 block mb-1.5">Equipment</span>
            <div className="flex flex-wrap gap-1.5">
              {equipment.map(e => (
                <span
                  key={e.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200"
                >
                  <span className={`text-[10px] font-bold px-1 rounded ${TYPE_COLORS[e.type] || 'bg-gray-200 text-gray-700'}`}>
                    {e.equipment_id}
                  </span>
                  {e.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {wo.notes && (
          <p className="text-xs text-gray-500 italic border-t border-gray-100 pt-2">{wo.notes}</p>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Crew Group (all work orders of the same module_type)
// ─────────────────────────────────────────────────────────────────────────────
function CrewGroup({ moduleType, color, workOrders, equipment, onStatusChange }) {
  const crewWOs = workOrders.filter(wo => !wo.is_subcontractor)
  const subWOs  = workOrders.filter(wo =>  wo.is_subcontractor)
  const total   = crewWOs.length + subWOs.length

  const totalMD  = crewWOs.reduce((s, w) => s + parseFloat(w.man_days || 0), 0)
  const totalHrs = crewWOs.reduce((s, w) => s + parseFloat(w.labor_hours || 0), 0)
  const totalMat = crewWOs.reduce((s, w) => s + parseFloat(w.material_cost || 0), 0)
  const totalSub = subWOs.reduce((s,  w) => s + parseFloat(w.sub_cost || 0), 0)

  return (
    <div className="mb-6">
      {/* Section header bar — uniform light green */}
      <div className="flex items-center gap-3 flex-wrap px-4 py-3 rounded-xl mb-3 bg-green-50 border-l-4 border-green-700">
        <h3 className="text-sm font-bold uppercase tracking-widest text-green-900">
          {moduleType}
        </h3>
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-green-100 text-green-800">
          {total} work order{total !== 1 ? 's' : ''}
        </span>
        <div className="flex gap-3">
          {totalMD  > 0 && <span className="text-xs text-green-700">{fmtDays(totalMD)}</span>}
          {totalHrs > 0 && <span className="text-xs text-green-700">{fmtHrs(totalHrs)}</span>}
          {totalMat > 0 && <span className="text-xs text-green-700">Mat {fmt(totalMat)}</span>}
          {totalSub > 0 && <span className="text-xs font-medium text-orange-600">Sub {fmt(totalSub)}</span>}
          {total === 0  && <span className="text-xs italic text-green-400">No work orders for this job</span>}
        </div>
      </div>

      {/* Cards */}
      {total > 0 && (
        <div className="space-y-3 pl-2 mb-2">
          {crewWOs.map(wo => (
            <WorkOrderCard key={wo.id} wo={wo} equipment={equipment} onStatusChange={onStatusChange} />
          ))}
          {subWOs.map(wo => (
            <WorkOrderCard key={wo.id} wo={wo} equipment={[]} onStatusChange={onStatusChange} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function WorkOrders({ jobs, selectedJob }) {
  const [workOrders,    setWorkOrders]    = useState([])
  const [crewTypes,     setCrewTypes]     = useState([])
  const [equipmentMap,  setEquipmentMap]  = useState({})
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)
  const [statusFilter,  setStatusFilter]  = useState('all')

  const jobId = selectedJob === 'all' ? null : selectedJob

  useEffect(() => {
    if (!jobId) {
      setWorkOrders([])
      setError(null)
      setLoading(false)
      return
    }
    fetchAll()
  }, [jobId])

  async function fetchAll() {
    setLoading(true)
    setError(null)

    const [woRes, ctRes, mapRes, equipRes] = await Promise.all([
      supabase.from('work_orders').select('*').eq('job_id', jobId).order('module_type').order('is_subcontractor'),
      supabase.from('crew_types').select('*').order('sort_order').order('name'),
      supabase.from('module_equipment_map').select('module_type, equipment_id'),
      supabase.from('master_equipment').select('*'),
    ])

    if (woRes.error) {
      setError(woRes.error.message)
      setLoading(false)
      return
    }

    setWorkOrders(woRes.data || [])
    setCrewTypes(ctRes.data || [])

    // Build moduleType → equipment[] lookup
    if (!mapRes.error && !equipRes.error) {
      const maps  = mapRes.data  || []
      const equip = equipRes.data || []
      const lookup = {}
      for (const m of maps) {
        const e = equip.find(eq => eq.id === m.equipment_id)
        if (!e) continue
        if (!lookup[m.module_type]) lookup[m.module_type] = []
        lookup[m.module_type].push(e)
      }
      setEquipmentMap(lookup)
    }

    setLoading(false)
  }

  // Match a work order to a crew type name using direct field or pattern fallback
  function resolveCrewType(wo, types) {
    if (wo.crew_type) {
      const direct = types.find(ct => ct.name === wo.crew_type)
      if (direct) return direct.name
    }
    // Pattern fallback for older records
    const mt = (wo.module_type || '').toLowerCase()
    for (const ct of types) {
      const n = ct.name.toLowerCase()
      if (n === 'demolition' && (mt.includes('demo') || mt.includes('demolition'))) return ct.name
      if (n === 'masonry'    && (mt.includes('mason') || mt.includes('wall') || mt.includes('column'))) return ct.name
      if (n === 'paver'      && (mt.includes('paver') || mt.includes('turf') || mt.includes('step'))) return ct.name
      if (n === 'landscape'  && (mt.includes('landscape') || mt.includes('plant') || mt.includes('irrig') || mt.includes('drainage') || mt.includes('utili'))) return ct.name
      if (n === 'specialty') continue // catch-all, applied last
      if (mt.includes(n)) return ct.name
    }
    // Fall back to Specialty if it exists, else first type, else 'Other'
    const specialty = types.find(ct => ct.name.toLowerCase() === 'specialty')
    return specialty?.name || types[0]?.name || 'Other'
  }

  // Generate work orders from the job's estimate on demand
  async function generateFromEstimate() {
    const job = jobs?.find(j => j.id === jobId)
    if (!job?.estimate_id) {
      setError('This job has no linked estimate. Work orders can only be generated from jobs created via a sold bid.')
      return
    }
    setLoading(true)
    setError(null)

    const { data: estProjects, error: projErr } = await supabase
      .from('estimate_projects')
      .select('id, project_name, estimate_modules(*)')
      .eq('estimate_id', job.estimate_id)
      .order('created_at')

    if (projErr) { setError(projErr.message); setLoading(false); return }
    if (!estProjects?.length) {
      setError('No estimate modules found for this job\'s estimate. Make sure the estimate has projects and modules.')
      setLoading(false)
      return
    }

    const rows = []
    for (const proj of estProjects) {
      for (const mod of proj.estimate_modules || []) {
        const calc        = mod.data?.calc || {}
        const laborHours  = parseFloat(calc.totalHrs     || 0)
        const laborCost   = parseFloat(mod.labor_cost    || calc.laborCost || 0)
        const laborBurden = parseFloat(mod.labor_burden  || calc.burden    || 0)
        const manDays     = parseFloat(mod.man_days      || 0)
        const matCost     = parseFloat(mod.material_cost || calc.totalMat  || 0)
        const subCost     = parseFloat(mod.sub_cost      || calc.subCost   || 0)
        const totalPrice  = parseFloat(mod.total_price   || calc.price     || 0)

        if (laborCost > 0 || manDays > 0 || matCost > 0) {
          rows.push({
            job_id: jobId, estimate_module_id: mod.id,
            project_name: proj.project_name, module_type: mod.module_type,
            is_subcontractor: false, man_days: manDays, labor_hours: laborHours,
            material_cost: matCost, sub_cost: 0, labor_cost: laborCost,
            labor_burden: laborBurden, total_price: totalPrice - subCost, status: 'pending',
          })
        }
        if (subCost > 0) {
          rows.push({
            job_id: jobId, estimate_module_id: mod.id,
            project_name: proj.project_name, module_type: mod.module_type,
            is_subcontractor: true, man_days: 0, labor_hours: 0, material_cost: 0,
            sub_cost: subCost, labor_cost: 0, labor_burden: 0, total_price: subCost, status: 'pending',
          })
        }
      }
    }

    if (rows.length === 0) {
      setError('The linked estimate has modules but no labor, materials, or sub costs were found.')
      setLoading(false)
      return
    }

    const { error: insertErr } = await supabase.from('work_orders').insert(rows)
    if (insertErr) { setError(insertErr.message); setLoading(false); return }
    await fetchAll()
  }

  function handleStatusChange(woId, newStatus) {
    setWorkOrders(prev => prev.map(w => w.id === woId ? { ...w, status: newStatus } : w))
  }

  // Filter
  const filtered = statusFilter === 'all'
    ? workOrders
    : workOrders.filter(w => w.status === statusFilter)

  // Build sections: ALL crew types shown as headers (in DB sort_order),
  // each containing the work orders that resolve to that type
  const sections = crewTypes.map(ct => ({
    crewType: ct,
    workOrders: filtered.filter(wo => resolveCrewType(wo, crewTypes) === ct.name),
  }))

  // ── No job selected ──
  if (!jobId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20">
        <p className="text-4xl mb-3">📋</p>
        <p className="text-sm">Select a job from the list to view its work orders.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-green-700" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center px-6">
        <p className="text-4xl mb-3">⚠️</p>
        <p className="text-sm font-semibold text-red-600 mb-1">Could not load work orders</p>
        <p className="text-xs text-gray-500 max-w-sm mb-4">{error}</p>
        <button onClick={fetchAll} className="btn-ghost text-xs px-4 py-2 rounded-lg border border-gray-200">
          Try Again
        </button>
      </div>
    )
  }

  if (workOrders.length === 0) {
    const job = jobs?.find(j => j.id === jobId)
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20 text-center px-6">
        <p className="text-4xl mb-3">📋</p>
        <p className="text-sm font-medium text-gray-600 mb-1">No work orders for this job yet.</p>
        {job?.estimate_id ? (
          <>
            <p className="text-xs text-gray-400 mb-4">This job has a linked estimate. Click below to generate work orders from it now.</p>
            <button
              onClick={generateFromEstimate}
              className="btn-primary text-sm px-5 py-2 rounded-lg"
            >
              Generate Work Orders from Estimate
            </button>
          </>
        ) : (
          <p className="text-xs text-gray-400">
            Work orders are generated automatically when a bid is marked sold.<br />
            This job has no linked estimate.
          </p>
        )}
      </div>
    )
  }

  // Summary totals
  const totalMD    = workOrders.filter(w => !w.is_subcontractor).reduce((s, w) => s + parseFloat(w.man_days || 0), 0)
  const totalMat   = workOrders.filter(w => !w.is_subcontractor).reduce((s, w) => s + parseFloat(w.material_cost || 0), 0)
  const totalSub   = workOrders.filter(w =>  w.is_subcontractor).reduce((s, w) => s + parseFloat(w.sub_cost || 0), 0)
  const totalValue = workOrders.reduce((s, w) => s + parseFloat(w.total_price || 0), 0)
  const complete   = workOrders.filter(w => w.status === 'complete').length

  return (
    <div>
      {/* Summary bar */}
      <div className="mb-5 rounded-xl border-2 border-green-700 bg-white overflow-hidden shadow-sm">
        {/* Top accent strip */}
        <div className="h-1 bg-green-700 w-full" />
        <div className="flex flex-wrap items-center gap-0 divide-x divide-gray-200">
          <div className="px-5 py-3 flex-1 min-w-[120px]">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-0.5">Total Man Days</span>
            <span className="text-lg font-bold text-gray-900">{fmtDays(totalMD)}</span>
          </div>
          <div className="px-5 py-3 flex-1 min-w-[120px]">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-0.5">Materials</span>
            <span className="text-lg font-bold text-gray-900">{fmt(totalMat)}</span>
          </div>
          {totalSub > 0 && (
            <div className="px-5 py-3 flex-1 min-w-[120px]">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-0.5">Sub Costs</span>
              <span className="text-lg font-bold text-orange-600">{fmt(totalSub)}</span>
            </div>
          )}
          <div className="px-5 py-3 flex-1 min-w-[140px] bg-green-50">
            <span className="text-xs font-semibold text-green-700 uppercase tracking-wide block mb-0.5">Total Value</span>
            <span className="text-lg font-bold text-green-800">{fmt(totalValue)}</span>
          </div>
          <div className="px-5 py-3 flex-1 min-w-[140px]">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-0.5">Completion</span>
            <span className="text-lg font-bold text-gray-900">{complete} <span className="text-sm font-normal text-gray-400">/ {workOrders.length}</span></span>
          </div>
        </div>

        {/* Status filter row */}
        <div className="flex gap-1.5 px-5 py-2.5 border-t border-gray-100 bg-gray-50">
          {['all', 'pending', 'in_progress', 'complete'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-green-700 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {s === 'all' ? 'All' : s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Sections — one per crew type, always shown */}
      {sections.map(({ crewType, workOrders: sectionWOs }) => (
        <CrewGroup
          key={crewType.id}
          moduleType={crewType.name}
          color={crewType.color}
          workOrders={sectionWOs}
          equipment={equipmentMap[crewType.name] || []}
          onStatusChange={handleStatusChange}
        />
      ))}
    </div>
  )
}
