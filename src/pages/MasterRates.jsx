import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'

// ── Universal Sub Markup — pinned first row in Subs panel ──────
function UniversalSubMarkup({ markupRate, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(markupRate)
  const pct = parseFloat(markupRate) * 100 || 35

  function handleSave() {
    onSave(draft)
    setEditing(false)
  }

  return (
    <div className="border-b-2 border-green-200 bg-green-50">
      {editing ? (
        <div className="px-3 py-2 space-y-1.5">
          <label className="text-xs font-semibold text-green-700">Universal Sub Markup (%)</label>
          <input
            type="number"
            step="1"
            min="0"
            max="100"
            className="input text-sm py-1"
            value={Math.round((parseFloat(draft) || 0) * 100)}
            onChange={e => setDraft((parseFloat(e.target.value) || 0) / 100)}
            autoFocus
          />
          <p className="text-xs text-gray-500">Applied as GP markup on all sub dump costs</p>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => {
                setDraft(markupRate)
                setEditing(false)
              }}
              className="btn-secondary text-xs py-1 flex-1"
            >
              Cancel
            </button>
            <button onClick={handleSave} className="btn-primary text-xs py-1 flex-1">
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between px-3 py-2.5 group">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
              <p className="text-sm font-semibold text-green-900">Universal Sub Markup</p>
            </div>
            <p className="text-xs text-green-700 mt-0.5 pl-4">
              {pct.toFixed(0)}% of sub cost added to GP
            </p>
          </div>
          <button
            onClick={() => {
              setDraft(markupRate)
              setEditing(true)
            }}
            className="text-xs text-gray-400 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            Edit
          </button>
        </div>
      )}
    </div>
  )
}

// ── Universal Labor Rate — pinned first row in Labor Rates panel ──
function UniversalLaborRate({ hourlyRate, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(hourlyRate)
  const dayRate = (parseFloat(hourlyRate) || 0) * 8

  function handleSave() {
    onSave(draft)
    setEditing(false)
  }

  return (
    <div className="border-b-2 border-green-200 bg-green-50">
      {editing ? (
        <div className="px-3 py-2 space-y-1.5">
          <label className="text-xs font-semibold text-green-700">
            Universal Labor Rate ($/hr)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="input text-sm py-1"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            autoFocus
          />
          <p className="text-xs text-gray-500">
            = ${((parseFloat(draft) || 0) * 8).toFixed(2)} per man day (8 hrs)
          </p>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => {
                setDraft(hourlyRate)
                setEditing(false)
              }}
              className="btn-secondary text-xs py-1 flex-1"
            >
              Cancel
            </button>
            <button onClick={handleSave} className="btn-primary text-xs py-1 flex-1">
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between px-3 py-2.5 group">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
              <p className="text-sm font-semibold text-green-900">Universal Labor Rate</p>
            </div>
            <p className="text-xs text-green-700 mt-0.5 pl-4">
              ${parseFloat(hourlyRate || 0).toFixed(2)}/hr &nbsp;·&nbsp; ${dayRate.toFixed(2)}/man
              day
            </p>
          </div>
          <button
            onClick={() => {
              setDraft(hourlyRate)
              setEditing(true)
            }}
            className="text-xs text-gray-400 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            Edit
          </button>
        </div>
      )}
    </div>
  )
}

// ── Generic editable row component ──────────────────────────
function RateRow({ row, columns, onSave, onDelete, primaryKey, skipKeys }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(row)

  async function handleSave() {
    await onSave(form)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="px-3 py-2 bg-green-50 border-b border-green-100">
        <div className="space-y-1.5 mb-2">
          {columns.map(col => (
            <div key={col.key}>
              <label className="text-xs text-gray-500">{col.label}</label>
              {col.type === 'select' ? (
                <select
                  className="input text-sm py-1"
                  value={form[col.key] || ''}
                  onChange={e => setForm(p => ({ ...p, [col.key]: e.target.value }))}
                >
                  {!col.options.some(o => (typeof o === 'object' ? o.value : o) === '') && (
                    <option value="">--</option>
                  )}
                  {col.options.map(o => {
                    const val = typeof o === 'object' ? o.value : o
                    const lab = typeof o === 'object' ? o.label : o
                    return (
                      <option key={val} value={val}>
                        {lab}
                      </option>
                    )
                  })}
                </select>
              ) : (
                <input
                  className="input text-sm py-1"
                  type={col.type || 'text'}
                  step={col.step}
                  value={form[col.key] || ''}
                  onChange={e => setForm(p => ({ ...p, [col.key]: e.target.value }))}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditing(false)} className="btn-secondary text-xs py-1 flex-1">
            Cancel
          </button>
          <button onClick={handleSave} className="btn-primary text-xs py-1 flex-1">
            Save
          </button>
        </div>
      </div>
    )
  }

  // ── Single-line "table" row ────────────────────────────────────────────────
  // Primary label (first column, or an explicit primaryKey when the first column
  // is used as the group header). All other columns render as compact inline
  // cells on the SAME line (no wrapping); rate+unit are merged.
  const primary = primaryKey || columns[0].key
  const skip = new Set(skipKeys || [])
  const cellText = col => {
    if (col.type === 'select' && col.options?.some(o => typeof o === 'object')) {
      return (
        col.options.find(o => typeof o === 'object' && o.value === (row[col.key] || ''))?.label ||
        row[col.key] ||
        ''
      )
    }
    if (col.type === 'number') {
      return `${col.prefix || ''}${parseFloat(row[col.key] || 0).toLocaleString(undefined, { maximumFractionDigits: 4 })}${col.suffix || ''}`
    }
    return row[col.key] || ''
  }
  const cells = []
  let mergeSkip = false
  columns.forEach((col, i) => {
    if (col.key === primary || skip.has(col.key)) return
    if (mergeSkip) {
      mergeSkip = false
      return
    }
    const next = columns[i + 1]
    if (col.key === 'rate' && next?.key === 'unit') {
      const rateVal = parseFloat(row.rate || 0)
      cells.push({
        key: 'rate-unit',
        text: `${rateVal.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${row.unit || ''}`.trim(),
      })
      mergeSkip = true
    } else {
      cells.push({ key: col.key, text: cellText(col) })
    }
  })

  return (
    <div className="flex items-center gap-3 px-3 py-1 border-b border-gray-100 hover:bg-gray-50 group text-xs">
      <span className="flex-1 min-w-0 truncate font-medium text-gray-800">
        {row[primary] || '—'}
      </span>
      {cells
        .filter(c => c.text !== '' && c.text != null)
        .map(c => (
          <span key={c.key} className="shrink-0 whitespace-nowrap text-gray-500">
            {c.text}
          </span>
        ))}
      <span className="shrink-0 flex gap-2 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => setEditing(true)} className="text-gray-500 hover:text-gray-800">
          Edit
        </button>
        <button onClick={() => onDelete(row.id)} className="text-red-400 hover:text-red-600">
          ✕
        </button>
      </span>
    </div>
  )
}

// ── Generic add-row form ─────────────────────────────────────
function AddRowForm({ columns, onSave, onCancel }) {
  const initial = Object.fromEntries(columns.map(c => [c.key, '']))
  const [form, setForm] = useState(initial)

  return (
    <div className="px-3 py-2 bg-green-50 border-t border-green-100">
      <div className="space-y-1.5 mb-2">
        {columns.map(col => (
          <div key={col.key}>
            <label className="text-xs text-gray-500">{col.label}</label>
            {col.type === 'select' ? (
              <select
                className="input text-sm py-1"
                value={form[col.key] || ''}
                onChange={e => setForm(p => ({ ...p, [col.key]: e.target.value }))}
              >
                {!col.options.some(o => (typeof o === 'object' ? o.value : o) === '') && (
                  <option value="">--</option>
                )}
                {col.options.map(o => {
                  const val = typeof o === 'object' ? o.value : o
                  const lab = typeof o === 'object' ? o.label : o
                  return (
                    <option key={val} value={val}>
                      {lab}
                    </option>
                  )
                })}
              </select>
            ) : (
              <input
                className="input text-sm py-1"
                type={col.type || 'text'}
                step={col.step}
                placeholder={col.placeholder || ''}
                value={form[col.key] || ''}
                onChange={e => setForm(p => ({ ...p, [col.key]: e.target.value }))}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} className="btn-secondary text-xs py-1 flex-1">
          Cancel
        </button>
        <button onClick={() => onSave(form)} className="btn-primary text-xs py-1 flex-1">
          Add
        </button>
      </div>
    </div>
  )
}

// ── Panel wrapper ────────────────────────────────────────────
function RatesPanel({
  title,
  rows,
  columns,
  onAdd,
  onSave,
  onDelete,
  loading,
  pinnedHeader,
  groupBy,
  primaryKey,
  skipKeys,
}) {
  const [showAdd, setShowAdd] = useState(false)

  // Group rows (e.g. Materials by vendor, Subs by subcontractor). Without a
  // groupBy the whole list is a single unlabeled group. House sorts first.
  const groups = useMemo(() => {
    if (!groupBy) return [{ key: '__all__', label: null, rows }]
    const map = new Map()
    rows.forEach(r => {
      const g = groupBy(r)
      if (!map.has(g.key)) map.set(g.key, { key: g.key, label: g.label, rows: [] })
      map.get(g.key).rows.push(r)
    })
    return Array.from(map.values()).sort((a, b) => {
      if (a.label === 'House') return -1
      if (b.label === 'House') return 1
      return String(a.label || '').localeCompare(String(b.label || ''))
    })
  }, [rows, groupBy])

  async function handleAdd(form) {
    await onAdd(form)
    setShowAdd(false)
  }

  return (
    <div
      className="flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden"
      style={{ minHeight: '500px' }}
    >
      {/* Header */}
      <div className="relative px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900 text-center">{title}</h2>
        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-green-700 font-semibold hover:underline"
          >
            + Add Row
          </button>
        )}
      </div>

      {/* Pinned header slot (e.g. Universal Labor Rate) */}
      {pinnedHeader}

      {/* Add form — appears at top of list */}
      {showAdd && (
        <AddRowForm columns={columns} onSave={handleAdd} onCancel={() => setShowAdd(false)} />
      )}

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-700"></div>
          </div>
        ) : rows.length === 0 && !showAdd ? (
          <div className="p-6 text-center text-gray-400 text-sm">
            <p className="mb-3">No entries yet.</p>
            <button onClick={() => setShowAdd(true)} className="btn-primary text-xs">
              + Add First Row
            </button>
          </div>
        ) : (
          groups.map(g => (
            <div key={g.key}>
              {g.label != null && (
                <div className="px-3 py-1 bg-gray-100 border-b border-gray-200 text-[11px] font-bold uppercase tracking-wide text-gray-600 sticky top-0 z-[1]">
                  {g.label} <span className="text-gray-400 font-normal">({g.rows.length})</span>
                </div>
              )}
              {g.rows.map(row => (
                <RateRow
                  key={row.id}
                  row={row}
                  columns={columns}
                  primaryKey={primaryKey}
                  skipKeys={skipKeys}
                  onSave={onSave}
                  onDelete={onDelete}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ── Column definitions ───────────────────────────────────────
const MATERIAL_COLUMNS = [
  { key: 'name', label: 'Material Name', placeholder: 'e.g. Decomposed Granite' },
  {
    key: 'unit',
    label: 'Unit',
    type: 'select',
    options: [
      'sqft',
      'linear ft',
      'cubic yard',
      'ton',
      'each',
      'bag',
      'pallet',
      'gallon',
      '5gal',
      'roll',
      'LF',
      'per zone',
      'per unit',
    ],
  },
  { key: 'unit_cost', label: 'Unit Cost ($)', type: 'number', step: '0.0001', prefix: '$' },
  { key: 'category', label: 'Category', placeholder: 'e.g. Hardscape, Irrigation' },
]

const LABOR_CATEGORY_OPTIONS = [
  'Artificial Turf',
  'Columns',
  'Concrete',
  'Demo',
  'Finishes',
  'Fire Pit',
  'General',
  'Ground Treatments',
  'Irrigation',
  'Outdoor Kitchen',
  'Planting',
  'Pool',
  'Steps',
  'Utilities',
  'Walls',
]

const LABOR_UNIT_OPTIONS = [
  'per day',
  'per hour',
  'hrs/ea',
  'hrs/ft',
  'hrs/linear ft',
  'hrs/sq ft',
  'hrs/ton',
  'hrs/zone',
  'tons/hr',
  'min/sq ft',
  'min/ea',
  'min/LF',
  'SF/hr',
  'LF/hr',
  'plants/day',
  'sqft/day',
  'CY/day',
  '$/CY',
  '$/SF',
  '$/LF',
  '$/ton',
  '$/5gal',
  '$/unit',
  '$/400SF',
  '$',
]

const LABOR_COLUMNS = [
  { key: 'name', label: 'Description', placeholder: 'e.g. Demo - Tree Small' },
  { key: 'rate', label: 'Rate', type: 'number', step: '0.0001', prefix: '' },
  { key: 'unit', label: 'Per / Unit', type: 'select', options: LABOR_UNIT_OPTIONS },
  { key: 'category', label: 'Category', type: 'select', options: LABOR_CATEGORY_OPTIONS },
  { key: 'notes', label: 'Notes', placeholder: 'Optional notes' },
]

const SUB_CATEGORY_OPTIONS = ['Concrete', 'Demo', 'General', 'Pool', 'Sub Haul']

const SUB_COLUMNS = [
  { key: 'company_name', label: 'Company / Name', placeholder: 'e.g. ABC Concrete Co.' },
  { key: 'trade', label: 'Trade', placeholder: 'e.g. Concrete, Irrigation' },
  { key: 'rate', label: 'Rate ($)', type: 'number', step: '0.01', prefix: '$' },
  {
    key: 'unit',
    label: 'Unit',
    type: 'select',
    options: [
      'per day',
      'per hour',
      'per sqft',
      'per linear ft',
      'per unit',
      'per cubic yard',
      'per 400 sqft',
      'lump sum',
      '$/SF',
      '$/CY',
      '$/LF',
      '$/ea',
      'each',
      '$/1.5T',
    ],
  },
  { key: 'category', label: 'Category', type: 'select', options: SUB_CATEGORY_OPTIONS },
]

// ── Paver Prices Panel ───────────────────────────────────────
function PaverPriceRow({ row, brands, onSave, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(row)

  async function handleSave() {
    await onSave(form)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="px-3 py-2 bg-green-50 border-b border-green-100">
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          <div>
            <label className="text-xs text-gray-500">Paver Brand</label>
            <input
              list="paver-brands-list"
              className="input text-sm py-1"
              value={form.brand || ''}
              onChange={e => setForm(p => ({ ...p, brand: e.target.value }))}
              placeholder="e.g. Belgard"
            />
            <datalist id="paver-brands-list">
              {brands.map(b => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="text-xs text-gray-500">Paver Type / Model</label>
            <input
              className="input text-sm py-1"
              value={form.name || ''}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Cambridge Cobble 6x9"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Price per SF ($)</label>
            <input
              type="number"
              step="0.0001"
              min="0"
              className="input text-sm py-1"
              value={form.price_per_sf || ''}
              onChange={e => setForm(p => ({ ...p, price_per_sf: e.target.value }))}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">SF per Pallet</label>
            <input
              type="number"
              step="0.5"
              min="0"
              className="input text-sm py-1"
              value={form.sf_per_pallet || ''}
              onChange={e => setForm(p => ({ ...p, sf_per_pallet: e.target.value }))}
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">
              Price per LF Vert ($) <span className="text-gray-400">optional</span>
            </label>
            <input
              type="number"
              step="0.0001"
              min="0"
              className="input text-sm py-1"
              value={form.price_per_lf_vert || ''}
              onChange={e => setForm(p => ({ ...p, price_per_lf_vert: e.target.value }))}
              placeholder="0.00"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditing(false)} className="btn-secondary text-xs py-1 flex-1">
            Cancel
          </button>
          <button onClick={handleSave} className="btn-primary text-xs py-1 flex-1">
            Save
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 hover:bg-gray-50 group text-xs">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{row.name}</p>
        <p className="text-gray-400">
          ${parseFloat(row.price_per_sf || 0).toFixed(2)}/SF
          {row.sf_per_pallet > 0 && ` · ${row.sf_per_pallet} SF/pallet`}
          {row.price_per_lf_vert > 0 &&
            ` · $${parseFloat(row.price_per_lf_vert).toFixed(2)}/LF vert`}
        </p>
      </div>
      <div className="flex gap-2 ml-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-gray-500 hover:text-gray-800"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(row.id)}
          className="text-xs text-red-400 hover:text-red-600"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

function PaverPricesPanel({ paverPrices, loading, onAdd, onSave, onDelete }) {
  const [brandFilter, setBrandFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({
    brand: '',
    name: '',
    price_per_sf: '',
    sf_per_pallet: '',
    price_per_lf_vert: '',
  })

  const brands = [
    'All',
    ...Array.from(new Set(paverPrices.map(p => p.brand).filter(Boolean))).sort(),
  ]
  const brandOptions = brands.filter(b => b !== 'All')

  const visible = paverPrices.filter(p => {
    if (brandFilter !== 'All' && p.brand !== brandFilter) return false
    if (search && !p.name?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  async function handleAdd() {
    await onAdd(addForm)
    setAddForm({ brand: '', name: '', price_per_sf: '', sf_per_pallet: '', price_per_lf_vert: '' })
    setShowAdd(false)
  }

  return (
    <div className="flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden flex-1">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h2 className="font-semibold text-gray-900 text-sm">Paver Prices</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{paverPrices.length} entries</span>
          {!showAdd && (
            <button
              onClick={() => setShowAdd(true)}
              className="text-xs text-green-700 font-semibold hover:underline"
            >
              + Add Paver
            </button>
          )}
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="px-3 py-3 bg-green-50 border-b border-green-100">
          <p className="text-xs font-semibold text-green-700 mb-2">New Paver Entry</p>
          <div className="space-y-1.5 mb-2">
            <div>
              <label className="text-xs text-gray-500">Paver Brand</label>
              <input
                list="paver-brands-add"
                className="input text-sm py-1"
                value={addForm.brand}
                onChange={e => setAddForm(p => ({ ...p, brand: e.target.value }))}
                placeholder="e.g. Belgard"
              />
              <datalist id="paver-brands-add">
                {brandOptions.map(b => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="text-xs text-gray-500">Paver Type / Model</label>
              <input
                className="input text-sm py-1"
                value={addForm.name}
                onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Cambridge Cobble 6x9 (60mm)"
              />
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <div>
                <label className="text-xs text-gray-500">$/SF</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  className="input text-sm py-1"
                  value={addForm.price_per_sf}
                  onChange={e => setAddForm(p => ({ ...p, price_per_sf: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">SF/Pallet</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  className="input text-sm py-1"
                  value={addForm.sf_per_pallet}
                  onChange={e => setAddForm(p => ({ ...p, sf_per_pallet: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">$/LF Vert</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  className="input text-sm py-1"
                  value={addForm.price_per_lf_vert}
                  onChange={e => setAddForm(p => ({ ...p, price_per_lf_vert: e.target.value }))}
                  placeholder="opt."
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAdd(false)} className="btn-secondary text-xs py-1 flex-1">
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!addForm.brand || !addForm.name}
              className="btn-primary text-xs py-1 flex-1 disabled:opacity-40"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Brand filter + search */}
      <div className="px-3 py-2 border-b border-gray-100 space-y-1.5">
        <div className="flex gap-1 flex-wrap">
          {brands.map(b => (
            <button
              key={b}
              onClick={() => setBrandFilter(b)}
              className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
                brandFilter === b
                  ? 'bg-green-700 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {b}
              {b !== 'All' && (
                <span className="ml-1 opacity-70">
                  ({paverPrices.filter(p => p.brand === b).length})
                </span>
              )}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search paver type…"
          className="w-full border border-gray-200 rounded-md px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-700" />
          </div>
        ) : visible.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">No pavers found.</div>
        ) : (
          visible.map(row => (
            <PaverPriceRow
              key={row.id}
              row={row}
              brands={brandOptions}
              onSave={onSave}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────
export default function MasterRates() {
  const [materials, setMaterials] = useState([])
  const [labor, setLabor] = useState([])
  const [subs, setSubs] = useState([])
  const [vendors, setVendors] = useState([])
  const [materialCategories, setMaterialCategories] = useState([])
  const [paverPrices, setPaverPrices] = useState([])
  const [loading, setLoading] = useState(true)
  const [laborRatePerHour, setLaborRatePerHour] = useState('35')
  const [subMarkupRate, setSubMarkupRate] = useState(0.35)
  const [matCategory, setMatCategory] = useState('All')
  const [materialVendorFilter, setMaterialVendorFilter] = useState('')
  const [labCategory, setLabCategory] = useState('All')
  const [subCategory, setSubCategory] = useState('All')

  // Vendor select options for the material rows (null vendor === "House")
  const vendorOptions = useMemo(
    () => [
      { value: '', label: 'House (unassigned)' },
      ...vendors.map(v => ({ value: v.id, label: v.company_name })),
    ],
    [vendors]
  )

  // Category select options for the material rows (value === category name,
  // matching how `subcategory` is stored on material_rates).
  const categoryOptions = useMemo(
    () => [
      { value: '', label: '— none —' },
      ...materialCategories.map(c => ({ value: c.name, label: c.name })),
    ],
    [materialCategories]
  )

  // Materials columns are built inside the component so the Vendor select can
  // close over the fetched vendor list.
  const materialColumns = useMemo(
    () => [
      ...MATERIAL_COLUMNS,
      { key: 'vendor_id', label: 'Vendor', type: 'select', options: vendorOptions },
      { key: 'subcategory', label: 'Category', type: 'select', options: categoryOptions },
    ],
    [vendorOptions, categoryOptions]
  )

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    const [matRes, labRes, subRes, vendorRes, catRes, settingsRes, paverRes] = await Promise.all([
      supabase.from('material_rates').select('*').order('name'),
      supabase.from('labor_rates').select('*').order('name'),
      supabase.from('subcontractor_rates').select('*').order('company_name'),
      supabase.from('subs_vendors').select('id, company_name').order('company_name'),
      supabase.from('material_categories').select('id, name').order('name'),
      supabase.from('company_settings').select('labor_rate_per_hour, sub_markup_rate').single(),
      supabase.from('paver_prices').select('*').order('brand').order('name'),
    ])
    if (matRes.data) setMaterials(matRes.data)
    if (labRes.data) setLabor(labRes.data)
    if (subRes.data) setSubs(subRes.data)
    if (vendorRes.data) setVendors(vendorRes.data)
    setMaterialCategories(catRes.data || [])
    if (paverRes.data) setPaverPrices(paverRes.data)
    if (settingsRes.data?.labor_rate_per_hour != null)
      setLaborRatePerHour(settingsRes.data.labor_rate_per_hour.toString())
    if (settingsRes.data?.sub_markup_rate != null)
      setSubMarkupRate(parseFloat(settingsRes.data.sub_markup_rate))
    setLoading(false)
  }

  async function saveLaborRatePerHour(newVal) {
    const val = parseFloat(newVal) || 35
    await supabase
      .from('company_settings')
      .update({ labor_rate_per_hour: val, updated_at: new Date().toISOString() })
      .eq('id', 1)
    setLaborRatePerHour(val.toString())
  }

  async function saveSubMarkupRate(newVal) {
    const val = parseFloat(newVal) || 0.35
    await supabase
      .from('company_settings')
      .update({ sub_markup_rate: val, updated_at: new Date().toISOString() })
      .eq('id', 1)
    setSubMarkupRate(val)
  }

  // ── Materials CRUD ──
  async function addMaterial(form) {
    const { data } = await supabase
      .from('material_rates')
      .insert({
        name: form.name?.trim(),
        unit: form.unit,
        unit_cost: parseFloat(form.unit_cost) || 0,
        category: form.category?.trim(),
        vendor_id: form.vendor_id || null,
        subcategory: form.subcategory?.trim() || null,
      })
      .select()
      .single()
    if (data) setMaterials(p => [...p, data].sort((a, b) => a.name.localeCompare(b.name)))
  }
  async function saveMaterial(form) {
    const { data } = await supabase
      .from('material_rates')
      .update({
        name: form.name?.trim(),
        unit: form.unit,
        unit_cost: parseFloat(form.unit_cost) || 0,
        category: form.category?.trim(),
        vendor_id: form.vendor_id || null,
        subcategory: form.subcategory?.trim() || null,
      })
      .eq('id', form.id)
      .select()
      .single()
    if (data) setMaterials(p => p.map(r => (r.id === data.id ? data : r)))
  }
  async function deleteMaterial(id) {
    if (!confirm('Delete this material rate?')) return
    await supabase.from('material_rates').delete().eq('id', id)
    setMaterials(p => p.filter(r => r.id !== id))
  }

  // ── Labor CRUD ──
  async function addLabor(form) {
    const { data } = await supabase
      .from('labor_rates')
      .insert({
        name: form.name?.trim(),
        rate: parseFloat(form.rate) || 0,
        unit: form.unit || 'per day',
        category: form.category?.trim() || 'General',
        rate_per_day: parseFloat(form.rate) || 0, // keep legacy column in sync
        notes: form.notes?.trim(),
      })
      .select()
      .single()
    if (data) setLabor(p => [...p, data].sort((a, b) => a.name.localeCompare(b.name)))
  }
  async function saveLabor(form) {
    const { data } = await supabase
      .from('labor_rates')
      .update({
        name: form.name?.trim(),
        rate: parseFloat(form.rate) || 0,
        unit: form.unit || 'per day',
        category: form.category?.trim() || 'General',
        rate_per_day: parseFloat(form.rate) || 0, // keep legacy column in sync
        notes: form.notes?.trim(),
      })
      .eq('id', form.id)
      .select()
      .single()
    if (data) setLabor(p => p.map(r => (r.id === data.id ? data : r)))
  }
  async function deleteLabor(id) {
    if (!confirm('Delete this labor rate?')) return
    await supabase.from('labor_rates').delete().eq('id', id)
    setLabor(p => p.filter(r => r.id !== id))
  }

  // ── Subcontractor CRUD ──
  async function addSub(form) {
    const { data } = await supabase
      .from('subcontractor_rates')
      .insert({
        company_name: form.company_name?.trim(),
        trade: form.trade?.trim(),
        rate: parseFloat(form.rate) || 0,
        unit: form.unit,
        category: form.category?.trim() || 'General',
      })
      .select()
      .single()
    if (data)
      setSubs(p => [...p, data].sort((a, b) => a.company_name.localeCompare(b.company_name)))
  }
  async function saveSub(form) {
    const { data } = await supabase
      .from('subcontractor_rates')
      .update({
        company_name: form.company_name?.trim(),
        trade: form.trade?.trim(),
        rate: parseFloat(form.rate) || 0,
        unit: form.unit,
        category: form.category?.trim() || 'General',
      })
      .eq('id', form.id)
      .select()
      .single()
    if (data) setSubs(p => p.map(r => (r.id === data.id ? data : r)))
  }
  async function deleteSub(id) {
    if (!confirm('Delete this subcontractor rate?')) return
    await supabase.from('subcontractor_rates').delete().eq('id', id)
    setSubs(p => p.filter(r => r.id !== id))
  }

  // ── Paver Prices CRUD ──
  async function addPaverPrice(form) {
    const { data } = await supabase
      .from('paver_prices')
      .insert({
        brand: form.brand?.trim(),
        name: form.name?.trim(),
        price_per_sf: parseFloat(form.price_per_sf) || 0,
        sf_per_pallet: parseFloat(form.sf_per_pallet) || 0,
        price_per_lf_vert: parseFloat(form.price_per_lf_vert) || 0,
      })
      .select()
      .single()
    if (data)
      setPaverPrices(p =>
        [...p, data].sort((a, b) => a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name))
      )
  }
  async function savePaverPrice(form) {
    const { data } = await supabase
      .from('paver_prices')
      .update({
        brand: form.brand?.trim(),
        name: form.name?.trim(),
        price_per_sf: parseFloat(form.price_per_sf) || 0,
        sf_per_pallet: parseFloat(form.sf_per_pallet) || 0,
        price_per_lf_vert: parseFloat(form.price_per_lf_vert) || 0,
      })
      .eq('id', form.id)
      .select()
      .single()
    if (data) setPaverPrices(p => p.map(r => (r.id === data.id ? data : r)))
  }
  async function deletePaverPrice(id) {
    if (!confirm('Delete this paver entry?')) return
    await supabase.from('paver_prices').delete().eq('id', id)
    setPaverPrices(p => p.filter(r => r.id !== id))
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0 gap-3">
        <h1 className="text-xl font-bold text-gray-900">Master Rates</h1>
      </div>

      {/* Three-panel layout
          Row 1 (auto-height): all three filter bars in the same grid row so they
          stretch to match the tallest one, ensuring panels always start at the
          same vertical position regardless of how many category pills each has.
          Row 2: the three panel cards. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-4 gap-y-0">
        {/* ── Filter dropdown: Materials ── */}
        {(() => {
          const matCats = Array.from(new Set(materials.map(m => m.category).filter(Boolean))).sort()
          const cats = ['All', ...matCats, 'Pavers']
          return (
            <div className="pb-2">
              <select
                value={matCategory}
                onChange={e => setMatCategory(e.target.value)}
                className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-green-400"
              >
                {cats.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'All'
                      ? 'All materials'
                      : cat === 'Pavers'
                        ? `Pavers (${paverPrices.length})`
                        : `${cat} (${materials.filter(m => m.category === cat).length})`}
                  </option>
                ))}
              </select>
            </div>
          )
        })()}

        {/* ── Filter dropdown: Labor ── */}
        {(() => {
          const cats = [
            'All',
            ...Array.from(new Set(labor.map(r => r.category).filter(Boolean))).sort(),
          ]
          return (
            <div className="pb-2">
              <select
                value={labCategory}
                onChange={e => setLabCategory(e.target.value)}
                className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-green-400"
              >
                {cats.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'All'
                      ? 'All categories'
                      : `${cat} (${labor.filter(r => r.category === cat).length})`}
                  </option>
                ))}
              </select>
            </div>
          )
        })()}

        {/* ── Filter dropdown: Subs ── */}
        {(() => {
          const cats = [
            'All',
            ...Array.from(new Set(subs.map(r => r.category).filter(Boolean))).sort(),
          ]
          return (
            <div className="pb-2">
              <select
                value={subCategory}
                onChange={e => setSubCategory(e.target.value)}
                className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-green-400"
              >
                {cats.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'All'
                      ? 'All categories'
                      : `${cat} (${subs.filter(r => r.category === cat).length})`}
                  </option>
                ))}
              </select>
            </div>
          )
        })()}

        {/* ── Panel: Materials ── */}
        <div className="flex flex-col" style={{ minHeight: '500px' }}>
          {matCategory === 'Pavers' ? (
            <PaverPricesPanel
              paverPrices={paverPrices}
              loading={loading}
              onAdd={addPaverPrice}
              onSave={savePaverPrice}
              onDelete={deletePaverPrice}
            />
          ) : (
            <RatesPanel
              title="Materials"
              rows={materials.filter(m => {
                if (matCategory !== 'All' && m.category !== matCategory) return false
                return true
              })}
              columns={materialColumns}
              onAdd={addMaterial}
              onSave={saveMaterial}
              onDelete={deleteMaterial}
              loading={loading}
              skipKeys={['vendor_id']}
              groupBy={m => ({
                key: m.vendor_id || '__house__',
                label: m.vendor_id
                  ? vendors.find(v => v.id === m.vendor_id)?.company_name || 'Vendor'
                  : 'House',
              })}
            />
          )}
        </div>

        {/* ── Panel: Labor ── */}
        <div className="flex flex-col" style={{ minHeight: '500px' }}>
          <RatesPanel
            title="Labor Rates & Amounts"
            rows={labCategory === 'All' ? labor : labor.filter(r => r.category === labCategory)}
            columns={LABOR_COLUMNS}
            onAdd={addLabor}
            onSave={saveLabor}
            onDelete={deleteLabor}
            loading={loading}
          />
        </div>

        {/* ── Panel: Subs (grouped by subcontractor) ── */}
        <div className="flex flex-col" style={{ minHeight: '500px' }}>
          <RatesPanel
            title="Subcontractor Pricing"
            rows={subCategory === 'All' ? subs : subs.filter(r => r.category === subCategory)}
            columns={SUB_COLUMNS}
            onAdd={addSub}
            onSave={saveSub}
            onDelete={deleteSub}
            loading={loading}
            primaryKey="trade"
            skipKeys={['company_name']}
            groupBy={s => ({ key: s.company_name || '—', label: s.company_name || '—' })}
          />
        </div>
      </div>
    </div>
  )
}
