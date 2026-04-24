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
function CrewGroup({ moduleType, workOrders, equipment, onStatusChange }) {
  const crewWOs = workOrders.filter(wo => !wo.is_subcontractor)
  const subWOs  = workOrders.filter(wo =>  wo.is_subcontractor)

  const totalMD    = crewWOs.reduce((s, w) => s + parseFloat(w.man_days || 0), 0)
  const totalHrs   = crewWOs.reduce((s, w) => s + parseFloat(w.labor_hours || 0), 0)
  const totalMat   = crewWOs.reduce((s, w) => s + parseFloat(w.material_cost || 0), 0)
  const totalSub   = subWOs.reduce((s,  w) => s + parseFloat(w.sub_cost || 0), 0)

  return (
    <div className="mb-6">
      {/* Group header */}
      <div className="flex items-center gap-3 mb-3">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">{moduleType}</h3>
        <div className="flex gap-3 text-xs text-gray-400">
          {totalMD  > 0 && <span>{fmtDays(totalMD)} total</span>}
          {totalHrs > 0 && <span>{fmtHrs(totalHrs)} total</span>}
          {totalMat > 0 && <span>Mat {fmt(totalMat)}</span>}
          {totalSub > 0 && <span className="text-orange-600">Sub {fmt(totalSub)}</span>}
        </div>
        <div className="flex-1 border-t border-gray-200" />
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {crewWOs.map(wo => (
          <WorkOrderCard
            key={wo.id}
            wo={wo}
            equipment={equipment}
            onStatusChange={onStatusChange}
          />
        ))}
        {subWOs.map(wo => (
          <WorkOrderCard
            key={wo.id}
            wo={wo}
            equipment={[]}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function WorkOrders({ jobs, selectedJob }) {
  const [workOrders,    setWorkOrders]    = useState([])
  const [equipmentMap,  setEquipmentMap]  = useState({}) // moduleType → [equipment]
  const [loading,       setLoading]       = useState(true)
  const [statusFilter,  setStatusFilter]  = useState('all')

  const jobId = selectedJob === 'all' ? null : selectedJob

  useEffect(() => {
    if (!jobId) {
      setWorkOrders([])
      setLoading(false)
      return
    }
    fetchAll()
  }, [jobId])

  async function fetchAll() {
    setLoading(true)

    const [{ data: wos }, { data: maps }, { data: equip }] = await Promise.all([
      supabase.from('work_orders').select('*').eq('job_id', jobId).order('module_type').order('is_subcontractor'),
      supabase.from('module_equipment_map').select('module_type, equipment_id'),
      supabase.from('master_equipment').select('*'),
    ])

    if (wos) setWorkOrders(wos)

    // Build moduleType → equipment[] lookup
    if (maps && equip) {
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

  function handleStatusChange(woId, newStatus) {
    setWorkOrders(prev => prev.map(w => w.id === woId ? { ...w, status: newStatus } : w))
  }

  // Filter
  const filtered = statusFilter === 'all'
    ? workOrders
    : workOrders.filter(w => w.status === statusFilter)

  // Group by module_type
  const moduleTypes = [...new Set(filtered.map(w => w.module_type))].sort()

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

  if (workOrders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20">
        <p className="text-4xl mb-3">📋</p>
        <p className="text-sm font-medium text-gray-500">No work orders for this job yet.</p>
        <p className="text-xs mt-1 text-gray-400">Work orders are generated automatically when a bid is marked sold.</p>
      </div>
    )
  }

  // Summary totals
  const totalMD  = workOrders.filter(w => !w.is_subcontractor).reduce((s, w) => s + parseFloat(w.man_days || 0), 0)
  const totalMat = workOrders.filter(w => !w.is_subcontractor).reduce((s, w) => s + parseFloat(w.material_cost || 0), 0)
  const totalSub = workOrders.filter(w =>  w.is_subcontractor).reduce((s, w) => s + parseFloat(w.sub_cost || 0), 0)
  const complete = workOrders.filter(w => w.status === 'complete').length

  return (
    <div>
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-4 mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm">
        <div>
          <span className="text-xs text-gray-400 block">Total Man Days</span>
          <span className="font-bold text-gray-800">{fmtDays(totalMD)}</span>
        </div>
        <div>
          <span className="text-xs text-gray-400 block">Materials</span>
          <span className="font-bold text-gray-800">{fmt(totalMat)}</span>
        </div>
        {totalSub > 0 && (
          <div>
            <span className="text-xs text-gray-400 block">Sub Costs</span>
            <span className="font-bold text-orange-700">{fmt(totalSub)}</span>
          </div>
        )}
        <div>
          <span className="text-xs text-gray-400 block">Completion</span>
          <span className="font-bold text-gray-800">{complete} / {workOrders.length} complete</span>
        </div>

        {/* Status filter */}
        <div className="ml-auto flex gap-1.5">
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

      {/* Groups */}
      {moduleTypes.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-10">No work orders match this filter.</p>
      ) : (
        moduleTypes.map(moduleType => (
          <CrewGroup
            key={moduleType}
            moduleType={moduleType}
            workOrders={filtered.filter(w => w.module_type === moduleType)}
            equipment={equipmentMap[moduleType] || []}
            onStatusChange={handleStatusChange}
          />
        ))
      )}
    </div>
  )
}
