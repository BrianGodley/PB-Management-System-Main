import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const EQUIPMENT_TYPES = ['Vehicle', 'Trailer', 'Large Power', 'Small Power', 'Hand Tool']

const TYPE_PREFIX = {
  'Vehicle':     'V',
  'Trailer':     'T',
  'Large Power': 'L',
  'Small Power': 'S',
  'Hand Tool':   'H',
}

const TYPE_COLORS = {
  'Vehicle':     'bg-blue-100 text-blue-800 border-blue-200',
  'Trailer':     'bg-orange-100 text-orange-800 border-orange-200',
  'Large Power': 'bg-red-100 text-red-800 border-red-200',
  'Small Power': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Hand Tool':   'bg-green-100 text-green-800 border-green-200',
}

const CONDITION_LABELS = { 4: '4 — Best', 3: '3 — Good', 2: '2 — Fair', 1: '1 — Poor' }
const CONDITION_COLORS = {
  4: 'bg-green-100 text-green-800',
  3: 'bg-yellow-100 text-yellow-800',
  2: 'bg-orange-100 text-orange-800',
  1: 'bg-red-100 text-red-800',
}

// ─────────────────────────────────────────────────────────────────────────────
// Generate Equipment ID (e.g. V100, T101)
// ─────────────────────────────────────────────────────────────────────────────
function generateEquipmentId(type, existingItems) {
  const prefix = TYPE_PREFIX[type]
  const nums = existingItems
    .filter(e => e.equipment_id?.startsWith(prefix))
    .map(e => parseInt(e.equipment_id.slice(prefix.length), 10))
    .filter(n => !isNaN(n))
  const maxNum = nums.length > 0 ? Math.max(...nums) : 99
  return `${prefix}${maxNum + 1}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Add / Edit Equipment Modal
// ─────────────────────────────────────────────────────────────────────────────
function EquipmentModal({ item, allEquipment, onClose, onSave }) {
  const isNew = !item?.id
  const [name,       setName]       = useState(item?.name || '')
  const [type,       setType]       = useState(item?.type || 'Vehicle')
  const [year,       setYear]       = useState(item?.year || '')
  const [condition,  setCondition]  = useState(item?.condition || 4)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')

  async function handleSave() {
    if (!name.trim()) { setError('Equipment name is required.'); return }
    setSaving(true)
    setError('')
    try {
      if (isNew) {
        const newId = generateEquipmentId(type, allEquipment)
        const { data, error: err } = await supabase
          .from('master_equipment')
          .insert({ name: name.trim(), type, equipment_id: newId, year: year || null, condition })
          .select().single()
        if (err) throw err
        onSave(data)
      } else {
        const { data, error: err } = await supabase
          .from('master_equipment')
          .update({ name: name.trim(), type, year: year || null, condition })
          .eq('id', item.id)
          .select().single()
        if (err) throw err
        onSave(data)
      }
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">{isNew ? 'Add Equipment' : 'Edit Equipment'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Equipment Name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="input w-full"
              placeholder="e.g. Skid Steer, Dump Truck, Plate Compactor"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Equipment Type *</label>
            <select value={type} onChange={e => setType(e.target.value)} className="input w-full">
              {EQUIPMENT_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Year</label>
              <input
                type="number"
                value={year}
                onChange={e => setYear(e.target.value)}
                className="input w-full"
                placeholder="e.g. 2019"
                min="1950"
                max={new Date().getFullYear() + 1}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Condition</label>
              <select value={condition} onChange={e => setCondition(Number(e.target.value))} className="input w-full">
                {[4, 3, 2, 1].map(c => (
                  <option key={c} value={c}>{CONDITION_LABELS[c]}</option>
                ))}
              </select>
            </div>
          </div>

          {isNew && (
            <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
              Equipment ID will be auto-generated as <strong>{TYPE_PREFIX[type]}100+</strong> when saved.
            </p>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost text-sm px-4 py-2 rounded-lg">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary text-sm px-5 py-2 rounded-lg"
          >
            {saving ? 'Saving…' : isNew ? 'Add Equipment' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Maintenance Edit Modal (inline for last 3 columns)
// ─────────────────────────────────────────────────────────────────────────────
function MaintenanceModal({ item, onClose, onSave }) {
  const [date,    setDate]    = useState(item?.last_maintenance_date || '')
  const [summary, setSummary] = useState(item?.maintenance_summary || '')
  const [saving,  setSaving]  = useState(false)

  async function handleSave() {
    setSaving(true)
    const { data, error } = await supabase
      .from('master_equipment')
      .update({ last_maintenance_date: date || null, maintenance_summary: summary || null })
      .eq('id', item.id)
      .select().single()
    setSaving(false)
    if (!error) onSave(data)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Maintenance — {item.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Last Repair / Maintenance Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input w-full" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Repair / Maintenance Summary</label>
            <textarea
              value={summary}
              onChange={e => setSummary(e.target.value)}
              rows={4}
              className="input w-full"
              placeholder="Describe what was repaired or serviced…"
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost text-sm px-4 py-2 rounded-lg">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm px-5 py-2 rounded-lg">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Module Assignment Tab
// ─────────────────────────────────────────────────────────────────────────────
function ModuleAssignments({ equipment }) {
  const [moduleTypes,  setModuleTypes]  = useState([])
  const [assignments,  setAssignments]  = useState([]) // { id, module_type, equipment_id }
  const [loading,      setLoading]      = useState(true)
  const [addingFor,    setAddingFor]    = useState(null) // module_type string
  const [pickValue,    setPickValue]    = useState('')
  const [saving,       setSaving]       = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('estimate_modules').select('module_type').order('module_type'),
      supabase.from('module_equipment_map').select('*'),
    ]).then(([{ data: mods }, { data: maps }]) => {
      if (mods) {
        const unique = [...new Set(mods.map(m => m.module_type).filter(Boolean))].sort()
        setModuleTypes(unique)
      }
      if (maps) setAssignments(maps)
      setLoading(false)
    })
  }, [])

  function assignedTo(moduleType) {
    return assignments
      .filter(a => a.module_type === moduleType)
      .map(a => equipment.find(e => e.id === a.equipment_id))
      .filter(Boolean)
  }

  function unassignedFor(moduleType) {
    const ids = assignments.filter(a => a.module_type === moduleType).map(a => a.equipment_id)
    return equipment.filter(e => !ids.includes(e.id))
  }

  async function addAssignment(moduleType, equipmentId) {
    if (!equipmentId) return
    setSaving(true)
    const { data, error } = await supabase
      .from('module_equipment_map')
      .insert({ module_type: moduleType, equipment_id: equipmentId })
      .select().single()
    if (!error && data) setAssignments(prev => [...prev, data])
    setAddingFor(null)
    setPickValue('')
    setSaving(false)
  }

  async function removeAssignment(assignmentId) {
    await supabase.from('module_equipment_map').delete().eq('id', assignmentId)
    setAssignments(prev => prev.filter(a => a.id !== assignmentId))
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-green-700" />
    </div>
  )

  if (moduleTypes.length === 0) return (
    <div className="text-center py-16 text-gray-400">
      <p className="text-3xl mb-2">📦</p>
      <p className="text-sm">No estimate modules found yet. Create estimates with modules first.</p>
    </div>
  )

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400 mb-4">
        Assign equipment to each module type. Work orders for that module type will automatically list these items.
      </p>
      {moduleTypes.map(moduleType => {
        const assigned = assignedTo(moduleType)
        const available = unassignedFor(moduleType)
        const isAdding = addingFor === moduleType

        return (
          <div key={moduleType} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-800">{moduleType}</span>
              {!isAdding && available.length > 0 && (
                <button
                  onClick={() => { setAddingFor(moduleType); setPickValue('') }}
                  className="text-xs text-green-700 font-semibold hover:underline"
                >
                  + Add Equipment
                </button>
              )}
            </div>

            {/* Assigned equipment chips */}
            <div className="flex flex-wrap gap-2 mb-2">
              {assigned.length === 0 && !isAdding && (
                <span className="text-xs text-gray-400 italic">No equipment assigned</span>
              )}
              {assigned.map(equip => {
                const mapRow = assignments.find(a => a.module_type === moduleType && a.equipment_id === equip.id)
                return (
                  <span
                    key={equip.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200"
                  >
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${TYPE_COLORS[equip.type]}`}>
                      {equip.equipment_id}
                    </span>
                    {equip.name}
                    <button
                      onClick={() => removeAssignment(mapRow?.id)}
                      className="ml-0.5 text-gray-400 hover:text-red-500 leading-none"
                    >
                      ×
                    </button>
                  </span>
                )
              })}
            </div>

            {/* Add picker */}
            {isAdding && (
              <div className="flex items-center gap-2 mt-2">
                <select
                  value={pickValue}
                  onChange={e => setPickValue(e.target.value)}
                  className="input text-sm flex-1"
                  autoFocus
                >
                  <option value="">— Select equipment —</option>
                  {available.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.equipment_id} — {e.name} ({e.type})
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => addAssignment(moduleType, pickValue)}
                  disabled={!pickValue || saving}
                  className="btn-primary text-xs px-3 py-2 rounded-lg"
                >
                  Add
                </button>
                <button
                  onClick={() => { setAddingFor(null); setPickValue('') }}
                  className="btn-ghost text-xs px-3 py-2 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function MasterEquipment() {
  const [equipment,    setEquipment]    = useState([])
  const [loading,      setLoading]      = useState(true)
  const [tab,          setTab]          = useState('equipment')
  const [showModal,    setShowModal]    = useState(false)
  const [editItem,     setEditItem]     = useState(null)
  const [maintItem,    setMaintItem]    = useState(null)
  const [deleteId,     setDeleteId]     = useState(null)
  const [search,       setSearch]       = useState('')

  useEffect(() => { fetchEquipment() }, [])

  async function fetchEquipment() {
    const { data } = await supabase
      .from('master_equipment')
      .select('*')
      .order('type')
      .order('equipment_id')
    if (data) setEquipment(data)
    setLoading(false)
  }

  function handleSaved(item) {
    setEquipment(prev => {
      const exists = prev.find(e => e.id === item.id)
      return exists ? prev.map(e => e.id === item.id ? item : e) : [...prev, item]
    })
    setShowModal(false)
    setEditItem(null)
  }

  function handleMaintSaved(item) {
    setEquipment(prev => prev.map(e => e.id === item.id ? item : e))
    setMaintItem(null)
  }

  async function handleDelete(id) {
    await supabase.from('master_equipment').delete().eq('id', id)
    setEquipment(prev => prev.filter(e => e.id !== id))
    setDeleteId(null)
  }

  const filtered = equipment.filter(e =>
    !search ||
    e.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.equipment_id?.toLowerCase().includes(search.toLowerCase()) ||
    e.type?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h1 className="text-xl font-bold text-gray-900">Master Equipment</h1>
        {tab === 'equipment' && (
          <button
            onClick={() => { setEditItem(null); setShowModal(true) }}
            className="btn-primary text-sm px-4 py-2 rounded-lg"
          >
            + Add Equipment
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4 flex-shrink-0">
        {[
          { key: 'equipment',    label: 'Equipment List' },
          { key: 'assignments',  label: 'Module Assignments' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-green-700 text-green-700 bg-green-50'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Equipment List Tab ── */}
      {tab === 'equipment' && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* Search */}
          <div className="mb-3">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input text-sm w-full max-w-xs"
              placeholder="Search equipment…"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-green-700" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-2">🚜</p>
              <p className="text-sm">{search ? 'No equipment matches your search.' : 'No equipment yet. Click + Add Equipment to get started.'}</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Equipment Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Equipment ID</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Year</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Condition</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Last Maintenance</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide min-w-[180px]">Maintenance Summary</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50 group">
                      {/* Name */}
                      <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>

                      {/* Type */}
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${TYPE_COLORS[item.type]}`}>
                          {item.type}
                        </span>
                      </td>

                      {/* Equipment ID */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded">
                          {item.equipment_id}
                        </span>
                      </td>

                      {/* Year */}
                      <td className="px-4 py-3 text-gray-700">{item.year || '—'}</td>

                      {/* Condition */}
                      <td className="px-4 py-3">
                        {item.condition ? (
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${CONDITION_COLORS[item.condition]}`}>
                            {CONDITION_LABELS[item.condition]}
                          </span>
                        ) : '—'}
                      </td>

                      {/* Last Maintenance Date — clickable to edit */}
                      <td
                        className="px-4 py-3 text-gray-600 cursor-pointer hover:text-green-700"
                        onClick={() => setMaintItem(item)}
                      >
                        {item.last_maintenance_date
                          ? new Date(item.last_maintenance_date + 'T00:00:00').toLocaleDateString()
                          : <span className="text-gray-300 italic text-xs">Click to set</span>
                        }
                      </td>

                      {/* Maintenance Summary — clickable to edit */}
                      <td
                        className="px-4 py-3 text-gray-600 max-w-[220px] cursor-pointer hover:text-green-700"
                        onClick={() => setMaintItem(item)}
                      >
                        {item.maintenance_summary
                          ? <span className="line-clamp-2 text-xs">{item.maintenance_summary}</span>
                          : <span className="text-gray-300 italic text-xs">Click to add notes</span>
                        }
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setEditItem(item); setShowModal(true) }}
                            className="text-xs text-gray-500 hover:text-blue-600 font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteId(item.id)}
                            className="text-xs text-gray-400 hover:text-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Module Assignments Tab ── */}
      {tab === 'assignments' && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <ModuleAssignments equipment={equipment} />
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <EquipmentModal
          item={editItem}
          allEquipment={equipment}
          onClose={() => { setShowModal(false); setEditItem(null) }}
          onSave={handleSaved}
        />
      )}

      {/* ── Maintenance Modal ── */}
      {maintItem && (
        <MaintenanceModal
          item={maintItem}
          onClose={() => setMaintItem(null)}
          onSave={handleMaintSaved}
        />
      )}

      {/* ── Delete Confirm ── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 text-center">
            <p className="text-3xl mb-3">🗑️</p>
            <p className="text-sm font-semibold text-gray-800 mb-1">Delete this equipment?</p>
            <p className="text-xs text-gray-500 mb-5">This will also remove it from all module assignments.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setDeleteId(null)} className="btn-ghost px-5 py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} className="bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
