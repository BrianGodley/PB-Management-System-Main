import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

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
// Main Page — Module Assignments only
// (Equipment list + Add Equipment button live in the Equipment sidebar app)
// ─────────────────────────────────────────────────────────────────────────────
export default function MasterEquipment() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-4 flex-shrink-0">
        <h1 className="text-xl font-bold text-gray-900">Master Equipment</h1>
        <p className="text-xs text-gray-400 mt-0.5">Map estimate module fields to required equipment for work orders</p>
      </div>

      {/* Full-height module assignments */}
      <div className="flex-1 min-h-0">
        <ModuleAssignments />
      </div>
    </div>
  )
}

