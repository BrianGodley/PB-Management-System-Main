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
  const [manufacturer, setManufacturer] = useState(item?.manufacturer || '')
  const [model,        setModel]        = useState(item?.model        || '')
  const [type,         setType]         = useState(item?.type         || 'Vehicle')
  const [year,         setYear]         = useState(item?.year         || '')
  const [condition,    setCondition]    = useState(item?.condition    || 4)
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState('')

  async function handleSave() {
    if (!model.trim()) { setError('Model is required.'); return }
    setSaving(true)
    setError('')
    try {
      if (isNew) {
        const newId = generateEquipmentId(type, allEquipment)
        const { data, error: err } = await supabase
          .from('master_equipment')
          .insert({ manufacturer: manufacturer.trim(), model: model.trim(), type, equipment_id: newId, year: year || null, condition })
          .select().single()
        if (err) throw err
        onSave(data)
      } else {
        const { data, error: err } = await supabase
          .from('master_equipment')
          .update({ manufacturer: manufacturer.trim(), model: model.trim(), type, year: year || null, condition })
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Manufacturer</label>
              <input
                value={manufacturer}
                onChange={e => setManufacturer(e.target.value)}
                className="input w-full"
                placeholder="e.g. Caterpillar, John Deere"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Model *</label>
              <input
                value={model}
                onChange={e => setModel(e.target.value)}
                className="input w-full"
                placeholder="e.g. 299D3, 310L"
              />
            </div>
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
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function toLabel(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
    .trim()
}

function hasDisplayValue(v) {
  if (v === undefined || v === null || v === '' || v === false) return false
  if (typeof v === 'object') return false
  return true
}

// ─────────────────────────────────────────────────────────────────────────────
// Field Row — one estimate field → equipment assignment
// ─────────────────────────────────────────────────────────────────────────────
function FieldRow({ fieldKey, sampleValue, mapping, saved, onSave }) {
  const [val, setVal] = useState(mapping?.equipment_type || '')
  const label = toLabel(fieldKey)
  const displaySample = hasDisplayValue(sampleValue) ? String(sampleValue) : null

  // Sync if mapping changes externally (e.g. module type switch)
  useState(() => { setVal(mapping?.equipment_type || '') }, [mapping])

  function handleBlur() {
    const trimmed = val.trim()
    const prev    = (mapping?.equipment_type || '').trim()
    if (trimmed !== prev) onSave(trimmed)
  }

  return (
    <div className="grid grid-cols-[1fr_44px_1fr] items-center gap-3 py-3 border-b border-gray-100 last:border-0">

      {/* LEFT — estimate input field preview */}
      <div>
        <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</div>
        <div className="border-2 border-dashed border-gray-200 rounded-lg px-3 py-2 bg-gray-50 min-h-[34px] flex items-center">
          {displaySample
            ? <span className="text-xs text-gray-500">{displaySample}</span>
            : <span className="text-xs text-gray-300 italic">estimator enters value here</span>
          }
        </div>
      </div>

      {/* ARROW */}
      <div className="flex flex-col items-center justify-end pb-1">
        <div className="w-px h-4 bg-green-300 mb-0.5" />
        <span className="text-green-600 font-bold text-base leading-none">→</span>
      </div>

      {/* RIGHT — equipment assignment input */}
      <div>
        <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-2">
          Required Equipment
          {saved && <span className="text-green-600 font-semibold normal-case text-[10px]">✓ saved</span>}
        </div>
        <input
          value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={handleBlur}
          className="input text-xs w-full"
          placeholder="e.g. Plate Compactor, Skid Steer…"
        />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Module Assignments Tab
// ─────────────────────────────────────────────────────────────────────────────
function ModuleAssignments() {
  const [moduleTypes,   setModuleTypes]   = useState([])
  const [selected,      setSelected]      = useState(null)
  const [fields,        setFields]        = useState({})   // fieldKey → sampleValue
  const [mappings,      setMappings]      = useState({})   // { [mt]: { [fieldKey]: { id, equipment_type } } }
  const [savedKeys,     setSavedKeys]     = useState(new Set())
  const [loadingTypes,  setLoadingTypes]  = useState(true)
  const [loadingFields, setLoadingFields] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [{ data: mods }, { data: maps }] = await Promise.all([
      supabase.from('estimate_modules').select('module_type').order('module_type'),
      supabase.from('module_field_equipment_map').select('*'),
    ])

    const unique = [...new Set((mods || []).map(m => m.module_type).filter(Boolean))].sort()
    setModuleTypes(unique)

    const obj = {}
    for (const m of maps || []) {
      if (!obj[m.module_type]) obj[m.module_type] = {}
      obj[m.module_type][m.field_key] = { id: m.id, equipment_type: m.equipment_type, field_label: m.field_label }
    }
    setMappings(obj)
    setLoadingTypes(false)

    if (unique.length > 0) fetchFields(unique[0])
  }

  async function fetchFields(mt) {
    setSelected(mt)
    setFields({})
    setLoadingFields(true)

    const { data: samples } = await supabase
      .from('estimate_modules')
      .select('data')
      .eq('module_type', mt)
      .limit(20)

    // Aggregate all unique primitive-valued keys from all samples (exclude calc)
    const extracted = {}
    for (const s of samples || []) {
      const d = s.data || {}
      for (const [k, v] of Object.entries(d)) {
        if (k === 'calc' || k.startsWith('_')) continue
        if (typeof v === 'object' && v !== null && !Array.isArray(v)) continue
        if (!(k in extracted)) extracted[k] = v
      }
    }
    setFields(extracted)
    setLoadingFields(false)
  }

  async function saveMapping(fieldKey, equipmentType) {
    const existing = mappings[selected]?.[fieldKey]
    const label    = toLabel(fieldKey)

    if (existing?.id) {
      if (!equipmentType) {
        await supabase.from('module_field_equipment_map').delete().eq('id', existing.id)
        setMappings(prev => {
          const updated = { ...(prev[selected] || {}) }
          delete updated[fieldKey]
          return { ...prev, [selected]: updated }
        })
      } else {
        const { data } = await supabase
          .from('module_field_equipment_map')
          .update({ equipment_type: equipmentType, field_label: label })
          .eq('id', existing.id).select().single()
        if (data) setMappings(prev => ({
          ...prev,
          [selected]: { ...(prev[selected] || {}), [fieldKey]: { id: data.id, equipment_type: data.equipment_type, field_label: data.field_label } }
        }))
      }
    } else if (equipmentType) {
      const { data } = await supabase
        .from('module_field_equipment_map')
        .insert({ module_type: selected, field_key: fieldKey, field_label: label, equipment_type: equipmentType })
        .select().single()
      if (data) setMappings(prev => ({
        ...prev,
        [selected]: { ...(prev[selected] || {}), [fieldKey]: { id: data.id, equipment_type: data.equipment_type, field_label: data.field_label } }
      }))
    }

    // Flash saved badge
    setSavedKeys(prev => new Set([...prev, fieldKey]))
    setTimeout(() => setSavedKeys(prev => { const s = new Set(prev); s.delete(fieldKey); return s }), 1800)
  }

  if (loadingTypes) return (
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

  const fieldEntries = Object.entries(fields)
  const assignedCount = mt => Object.values(mappings[mt] || {}).filter(m => m?.equipment_type).length

  return (
    <div className="flex gap-4 h-full min-h-0">

      {/* ── Left: module type list ── */}
      <div className="w-52 flex-shrink-0 flex flex-col border border-gray-200 rounded-xl overflow-hidden bg-white">
        <div className="px-3 py-2.5 bg-gray-50 border-b border-gray-100 flex-shrink-0">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Module Types</p>
        </div>
        <div className="overflow-y-auto flex-1">
          {moduleTypes.map(mt => {
            const cnt = assignedCount(mt)
            const isActive = selected === mt
            return (
              <button
                key={mt}
                onClick={() => fetchFields(mt)}
                className={`w-full text-left px-3 py-2.5 text-sm flex items-center justify-between border-b border-gray-50 transition-colors ${
                  isActive
                    ? 'bg-green-50 text-green-800 font-semibold border-l-2 border-l-green-700'
                    : 'text-gray-700 hover:bg-gray-50 border-l-2 border-l-transparent'
                }`}
              >
                <span className="truncate">{mt}</span>
                {cnt > 0 && (
                  <span className="ml-1 flex-shrink-0 text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                    {cnt}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Right: field mapping editor ── */}
      <div className="flex-1 flex flex-col border-2 border-green-700 rounded-xl overflow-hidden bg-white min-w-0">

        {/* Header accent */}
        <div className="h-1 bg-green-700 w-full flex-shrink-0" />

        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-center p-6">
            <div>
              <p className="text-2xl mb-2">←</p>
              <p className="text-sm">Select a module type to configure field mappings</p>
            </div>
          </div>
        ) : (
          <>
            {/* Panel header */}
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex-shrink-0">
              <span className="text-sm font-bold text-gray-900">{selected}</span>
              <span className="text-xs text-gray-400 ml-2">— click any equipment field and type a name, then tab away to save</span>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-[1fr_44px_1fr] gap-3 px-4 py-2 bg-green-50 border-b border-green-100 flex-shrink-0">
              <div>
                <p className="text-[10px] font-bold text-green-800 uppercase tracking-wide">Estimate Input Field</p>
                <p className="text-[10px] text-green-600 mt-0.5">What the estimator fills in</p>
              </div>
              <div />
              <div>
                <p className="text-[10px] font-bold text-green-800 uppercase tracking-wide">Required Equipment</p>
                <p className="text-[10px] text-green-600 mt-0.5">Shown on work order when field has data</p>
              </div>
            </div>

            {/* Field rows */}
            {loadingFields ? (
              <div className="flex-1 flex justify-center items-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-700" />
              </div>
            ) : fieldEntries.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-center p-6 text-gray-400">
                <div>
                  <p className="text-sm">No field data found for <strong className="text-gray-600">{selected}</strong>.</p>
                  <p className="text-xs mt-1">Create some estimates using this module type first, then return here.</p>
                </div>
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 px-4">
                {fieldEntries.map(([key, sampleVal]) => (
                  <FieldRow
                    key={`${selected}-${key}`}
                    fieldKey={key}
                    sampleValue={sampleVal}
                    mapping={mappings[selected]?.[key]}
                    saved={savedKeys.has(key)}
                    onSave={eq => saveMapping(key, eq)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
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

  const filtered = equipment.filter(e => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      e.manufacturer?.toLowerCase().includes(q) ||
      e.model?.toLowerCase().includes(q) ||
      e.name?.toLowerCase().includes(q) ||
      e.equipment_id?.toLowerCase().includes(q) ||
      e.type?.toLowerCase().includes(q)
    )
  })

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
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Manufacturer</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Model</th>
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
                      {/* Manufacturer */}
                      <td className="px-4 py-3 text-gray-600">{item.manufacturer || <span className="text-gray-300 italic text-xs">—</span>}</td>

                      {/* Model */}
                      <td className="px-4 py-3 font-medium text-gray-900">{item.model || item.name}</td>

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
          <ModuleAssignments />
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
