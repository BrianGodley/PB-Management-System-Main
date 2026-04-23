import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// ── Universal Sub Markup — pinned first row in Subs panel ──────
function UniversalSubMarkup({ markupRate, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(markupRate)
  const pct = (parseFloat(markupRate) * 100) || 35

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
            type="number" step="1" min="0" max="100"
            className="input text-sm py-1"
            value={Math.round((parseFloat(draft) || 0) * 100)}
            onChange={e => setDraft((parseFloat(e.target.value) || 0) / 100)}
            autoFocus
          />
          <p className="text-xs text-gray-500">Applied as GP markup on all sub dump costs</p>
          <div className="flex gap-2 pt-1">
            <button onClick={() => { setDraft(markupRate); setEditing(false) }} className="btn-secondary text-xs py-1 flex-1">Cancel</button>
            <button onClick={handleSave} className="btn-primary text-xs py-1 flex-1">Save</button>
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
            onClick={() => { setDraft(markupRate); setEditing(true) }}
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
  const [editing,  setEditing]  = useState(false)
  const [draft,    setDraft]    = useState(hourlyRate)
  const dayRate = (parseFloat(hourlyRate) || 0) * 8

  function handleSave() {
    onSave(draft)
    setEditing(false)
  }

  return (
    <div className="border-b-2 border-green-200 bg-green-50">
      {editing ? (
        <div className="px-3 py-2 space-y-1.5">
          <label className="text-xs font-semibold text-green-700">Universal Labor Rate ($/hr)</label>
          <input
            type="number" step="0.01" min="0"
            className="input text-sm py-1"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            autoFocus
          />
          <p className="text-xs text-gray-500">= ${((parseFloat(draft) || 0) * 8).toFixed(2)} per man day (8 hrs)</p>
          <div className="flex gap-2 pt-1">
            <button onClick={() => { setDraft(hourlyRate); setEditing(false) }} className="btn-secondary text-xs py-1 flex-1">Cancel</button>
            <button onClick={handleSave} className="btn-primary text-xs py-1 flex-1">Save</button>
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
              ${parseFloat(hourlyRate || 0).toFixed(2)}/hr &nbsp;·&nbsp; ${dayRate.toFixed(2)}/man day
            </p>
          </div>
          <button
            onClick={() => { setDraft(hourlyRate); setEditing(true) }}
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
function RateRow({ row, columns, onSave, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm]       = useState(row)

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
                  <option value="">--</option>
                  {col.options.map(o => <option key={o}>{o}</option>)}
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
          <button onClick={() => setEditing(false)} className="btn-secondary text-xs py-1 flex-1">Cancel</button>
          <button onClick={handleSave} className="btn-primary text-xs py-1 flex-1">Save</button>
        </div>
      </div>
    )
  }

  // Build display lines: merge consecutive 'rate'+'unit' sibling columns into one line
  const displayLines = []
  let skip = false
  columns.forEach((col, i) => {
    if (skip) { skip = false; return }
    const next = columns[i + 1]
    if (col.key === 'rate' && next?.key === 'unit') {
      // Combine: "0.75 hrs/ea"
      const rateVal = parseFloat(row['rate'] || 0)
      const unitVal = row['unit'] || ''
      displayLines.push({ combined: true, value: `${rateVal.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${unitVal}`.trim() })
      skip = true
    } else {
      displayLines.push({ col, i })
    }
  })

  return (
    <div className="flex items-start justify-between px-3 py-2.5 border-b border-gray-100 hover:bg-gray-50 group">
      <div className="flex-1 min-w-0">
        {displayLines.map((line, idx) => {
          if (line.combined) {
            return <p key="rate-unit" className="text-xs text-gray-500 truncate">{line.value}</p>
          }
          const { col, i } = line
          return (
            <div key={col.key}>
              {i === 0
                ? <p className="text-sm font-medium text-gray-900 truncate">{row[col.key] || '—'}</p>
                : <p className="text-xs text-gray-500 truncate">
                    {col.prefix}{col.type === 'number' ? parseFloat(row[col.key] || 0).toLocaleString() : row[col.key] || '—'}{col.suffix}
                  </p>
              }
            </div>
          )
        })}
      </div>
      <div className="flex gap-2 ml-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={() => setEditing(true)} className="text-xs text-gray-500 hover:text-gray-800">Edit</button>
        <button onClick={() => onDelete(row.id)} className="text-xs text-red-400 hover:text-red-600">✕</button>
      </div>
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
                <option value="">--</option>
                {col.options.map(o => <option key={o}>{o}</option>)}
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
        <button onClick={onCancel} className="btn-secondary text-xs py-1 flex-1">Cancel</button>
        <button onClick={() => onSave(form)} className="btn-primary text-xs py-1 flex-1">Add</button>
      </div>
    </div>
  )
}

// ── Panel wrapper ────────────────────────────────────────────
function RatesPanel({ title, rows, columns, onAdd, onSave, onDelete, loading, pinnedHeader }) {
  const [showAdd, setShowAdd] = useState(false)

  async function handleAdd(form) {
    await onAdd(form)
    setShowAdd(false)
  }

  return (
    <div className="flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ minHeight: '500px' }}>
      {/* Header */}
      <div className="relative px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900 text-center">{title}</h2>
        {!showAdd && (
          <button onClick={() => setShowAdd(true)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-green-700 font-semibold hover:underline">
            + Add Row
          </button>
        )}
      </div>

      {/* Pinned header slot (e.g. Universal Labor Rate) */}
      {pinnedHeader}

      {/* Add form — appears at top of list */}
      {showAdd && (
        <AddRowForm
          columns={columns}
          onSave={handleAdd}
          onCancel={() => setShowAdd(false)}
        />
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
            <button onClick={() => setShowAdd(true)} className="btn-primary text-xs">+ Add First Row</button>
          </div>
        ) : (
          rows.map(row => (
            <RateRow
              key={row.id}
              row={row}
              columns={columns}
              onSave={onSave}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ── Column definitions ───────────────────────────────────────
const MATERIAL_COLUMNS = [
  { key: 'name',      label: 'Material Name',  placeholder: 'e.g. Decomposed Granite' },
  { key: 'unit',      label: 'Unit',           type: 'select', options: ['sqft', 'linear ft', 'cubic yard', 'ton', 'each', 'bag', 'pallet', 'gallon', '5gal', 'roll', 'LF', 'per zone', 'per unit'] },
  { key: 'unit_cost', label: 'Unit Cost ($)',  type: 'number', step: '0.0001', prefix: '$' },
  { key: 'category',  label: 'Category',       placeholder: 'e.g. Hardscape, Irrigation' },
]

const LABOR_CATEGORY_OPTIONS = ['Artificial Turf', 'Columns', 'Concrete', 'Demo', 'Finishes', 'Fire Pit', 'General', 'Ground Treatments', 'Irrigation', 'Outdoor Kitchen', 'Planting', 'Pool', 'Steps', 'Utilities', 'Walls']

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
  { key: 'name',     label: 'Description',  placeholder: 'e.g. Demo - Tree Small' },
  { key: 'rate',     label: 'Rate',         type: 'number', step: '0.0001', prefix: '' },
  { key: 'unit',     label: 'Per / Unit',   type: 'select', options: LABOR_UNIT_OPTIONS },
  { key: 'category', label: 'Category',     type: 'select', options: LABOR_CATEGORY_OPTIONS },
  { key: 'notes',    label: 'Notes',        placeholder: 'Optional notes' },
]

const SUB_CATEGORY_OPTIONS = ['Concrete', 'Demo', 'General', 'Pool', 'Sub Haul']

const SUB_COLUMNS = [
  { key: 'company_name', label: 'Company / Name', placeholder: 'e.g. ABC Concrete Co.' },
  { key: 'trade',        label: 'Trade',          placeholder: 'e.g. Concrete, Irrigation' },
  { key: 'rate',         label: 'Rate ($)',        type: 'number', step: '0.01', prefix: '$' },
  { key: 'unit',         label: 'Unit',            type: 'select', options: ['per day', 'per hour', 'per sqft', 'per linear ft', 'per unit', 'per cubic yard', 'per 400 sqft', 'lump sum', '$/SF', '$/CY', '$/LF', '$/ea', 'each', '$/1.5T'] },
  { key: 'category',     label: 'Category',        type: 'select', options: SUB_CATEGORY_OPTIONS },
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
            <input list="paver-brands-list" className="input text-sm py-1" value={form.brand || ''}
              onChange={e => setForm(p => ({ ...p, brand: e.target.value }))} placeholder="e.g. Belgard" />
            <datalist id="paver-brands-list">
              {brands.map(b => <option key={b} value={b} />)}
            </datalist>
          </div>
          <div>
            <label className="text-xs text-gray-500">Paver Type / Model</label>
            <input className="input text-sm py-1" value={form.name || ''}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Cambridge Cobble 6x9" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Price per SF ($)</label>
            <input type="number" step="0.0001" min="0" className="input text-sm py-1" value={form.price_per_sf || ''}
              onChange={e => setForm(p => ({ ...p, price_per_sf: e.target.value }))} placeholder="0.00" />
          </div>
          <div>
            <label className="text-xs text-gray-500">SF per Pallet</label>
            <input type="number" step="0.5" min="0" className="input text-sm py-1" value={form.sf_per_pallet || ''}
              onChange={e => setForm(p => ({ ...p, sf_per_pallet: e.target.value }))} placeholder="0" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Price per LF Vert ($) <span className="text-gray-400">optional</span></label>
            <input type="number" step="0.0001" min="0" className="input text-sm py-1" value={form.price_per_lf_vert || ''}
              onChange={e => setForm(p => ({ ...p, price_per_lf_vert: e.target.value }))} placeholder="0.00" />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditing(false)} className="btn-secondary text-xs py-1 flex-1">Cancel</button>
          <button onClick={handleSave} className="btn-primary text-xs py-1 flex-1">Save</button>
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
          {row.price_per_lf_vert > 0 && ` · $${parseFloat(row.price_per_lf_vert).toFixed(2)}/LF vert`}
        </p>
      </div>
      <div className="flex gap-2 ml-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={() => setEditing(true)} className="text-xs text-gray-500 hover:text-gray-800">Edit</button>
        <button onClick={() => onDelete(row.id)} className="text-xs text-red-400 hover:text-red-600">✕</button>
      </div>
    </div>
  )
}

function PaverPricesPanel({ paverPrices, loading, onAdd, onSave, onDelete }) {
  const [brandFilter, setBrandFilter] = useState('All')
  const [search, setSearch]           = useState('')
  const [showAdd, setShowAdd]         = useState(false)
  const [addForm, setAddForm]         = useState({ brand: '', name: '', price_per_sf: '', sf_per_pallet: '', price_per_lf_vert: '' })

  const brands = ['All', ...Array.from(new Set(paverPrices.map(p => p.brand).filter(Boolean))).sort()]
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
            <button onClick={() => setShowAdd(true)} className="text-xs text-green-700 font-semibold hover:underline">
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
              <input list="paver-brands-add" className="input text-sm py-1" value={addForm.brand}
                onChange={e => setAddForm(p => ({ ...p, brand: e.target.value }))} placeholder="e.g. Belgard" />
              <datalist id="paver-brands-add">
                {brandOptions.map(b => <option key={b} value={b} />)}
              </datalist>
            </div>
            <div>
              <label className="text-xs text-gray-500">Paver Type / Model</label>
              <input className="input text-sm py-1" value={addForm.name}
                onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Cambridge Cobble 6x9 (60mm)" />
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <div>
                <label className="text-xs text-gray-500">$/SF</label>
                <input type="number" step="0.0001" min="0" className="input text-sm py-1" value={addForm.price_per_sf}
                  onChange={e => setAddForm(p => ({ ...p, price_per_sf: e.target.value }))} placeholder="0.00" />
              </div>
              <div>
                <label className="text-xs text-gray-500">SF/Pallet</label>
                <input type="number" step="0.5" min="0" className="input text-sm py-1" value={addForm.sf_per_pallet}
                  onChange={e => setAddForm(p => ({ ...p, sf_per_pallet: e.target.value }))} placeholder="0" />
              </div>
              <div>
                <label className="text-xs text-gray-500">$/LF Vert</label>
                <input type="number" step="0.0001" min="0" className="input text-sm py-1" value={addForm.price_per_lf_vert}
                  onChange={e => setAddForm(p => ({ ...p, price_per_lf_vert: e.target.value }))} placeholder="opt." />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAdd(false)} className="btn-secondary text-xs py-1 flex-1">Cancel</button>
            <button onClick={handleAdd} disabled={!addForm.brand || !addForm.name}
              className="btn-primary text-xs py-1 flex-1 disabled:opacity-40">Add</button>
          </div>
        </div>
      )}

      {/* Brand filter + search */}
      <div className="px-3 py-2 border-b border-gray-100 space-y-1.5">
        <div className="flex gap-1 flex-wrap">
          {brands.map(b => (
            <button key={b} onClick={() => setBrandFilter(b)}
              className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
                brandFilter === b ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {b}{b !== 'All' && <span className="ml-1 opacity-70">({paverPrices.filter(p => p.brand === b).length})</span>}
            </button>
          ))}
        </div>
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
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
            <PaverPriceRow key={row.id} row={row} brands={brandOptions} onSave={onSave} onDelete={onDelete} />
          ))
        )}
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────
export default function MasterRates() {
  const [materials,        setMaterials]        = useState([])
  const [labor,            setLabor]            = useState([])
  const [subs,             setSubs]             = useState([])
  const [paverPrices,      setPaverPrices]      = useState([])
  const [loading,          setLoading]          = useState(true)
  const [laborRatePerHour, setLaborRatePerHour] = useState('35')
  const [subMarkupRate,    setSubMarkupRate]     = useState(0.35)
  const [matCategory,      setMatCategory]      = useState('All')
  const [labCategory,      setLabCategory]      = useState('All')
  const [subCategory,      setSubCategory]      = useState('All')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [matRes, labRes, subRes, settingsRes, paverRes] = await Promise.all([
      supabase.from('material_rates').select('*').order('name'),
      supabase.from('labor_rates').select('*').order('name'),
      supabase.from('subcontractor_rates').select('*').order('company_name'),
      supabase.from('company_settings').select('labor_rate_per_hour, sub_markup_rate').single(),
      supabase.from('paver_prices').select('*').order('brand').order('name'),
    ])
    if (matRes.data)   setMaterials(matRes.data)
    if (labRes.data)   setLabor(labRes.data)
    if (subRes.data)   setSubs(subRes.data)
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
    const { data } = await supabase.from('material_rates').insert({
      name: form.name?.trim(), unit: form.unit, unit_cost: parseFloat(form.unit_cost) || 0, category: form.category?.trim(),
    }).select().single()
    if (data) setMaterials(p => [...p, data].sort((a, b) => a.name.localeCompare(b.name)))
  }
  async function saveMaterial(form) {
    const { data } = await supabase.from('material_rates').update({
      name: form.name?.trim(), unit: form.unit, unit_cost: parseFloat(form.unit_cost) || 0, category: form.category?.trim(),
    }).eq('id', form.id).select().single()
    if (data) setMaterials(p => p.map(r => r.id === data.id ? data : r))
  }
  async function deleteMaterial(id) {
    if (!confirm('Delete this material rate?')) return
    await supabase.from('material_rates').delete().eq('id', id)
    setMaterials(p => p.filter(r => r.id !== id))
  }

  // ── Labor CRUD ──
  async function addLabor(form) {
    const { data } = await supabase.from('labor_rates').insert({
      name:         form.name?.trim(),
      rate:         parseFloat(form.rate) || 0,
      unit:         form.unit || 'per day',
      category:     form.category?.trim() || 'General',
      rate_per_day: parseFloat(form.rate) || 0,   // keep legacy column in sync
      notes:        form.notes?.trim(),
    }).select().single()
    if (data) setLabor(p => [...p, data].sort((a, b) => a.name.localeCompare(b.name)))
  }
  async function saveLabor(form) {
    const { data } = await supabase.from('labor_rates').update({
      name:         form.name?.trim(),
      rate:         parseFloat(form.rate) || 0,
      unit:         form.unit || 'per day',
      category:     form.category?.trim() || 'General',
      rate_per_day: parseFloat(form.rate) || 0,   // keep legacy column in sync
      notes:        form.notes?.trim(),
    }).eq('id', form.id).select().single()
    if (data) setLabor(p => p.map(r => r.id === data.id ? data : r))
  }
  async function deleteLabor(id) {
    if (!confirm('Delete this labor rate?')) return
    await supabase.from('labor_rates').delete().eq('id', id)
    setLabor(p => p.filter(r => r.id !== id))
  }

  // ── Subcontractor CRUD ──
  async function addSub(form) {
    const { data } = await supabase.from('subcontractor_rates').insert({
      company_name: form.company_name?.trim(), trade: form.trade?.trim(),
      rate: parseFloat(form.rate) || 0, unit: form.unit,
      category: form.category?.trim() || 'General',
    }).select().single()
    if (data) setSubs(p => [...p, data].sort((a, b) => a.company_name.localeCompare(b.company_name)))
  }
  async function saveSub(form) {
    const { data } = await supabase.from('subcontractor_rates').update({
      company_name: form.company_name?.trim(), trade: form.trade?.trim(),
      rate: parseFloat(form.rate) || 0, unit: form.unit,
      category: form.category?.trim() || 'General',
    }).eq('id', form.id).select().single()
    if (data) setSubs(p => p.map(r => r.id === data.id ? data : r))
  }
  async function deleteSub(id) {
    if (!confirm('Delete this subcontractor rate?')) return
    await supabase.from('subcontractor_rates').delete().eq('id', id)
    setSubs(p => p.filter(r => r.id !== id))
  }

  // ── Paver Prices CRUD ──
  async function addPaverPrice(form) {
    const { data } = await supabase.from('paver_prices').insert({
      brand:             form.brand?.trim(),
      name:              form.name?.trim(),
      price_per_sf:      parseFloat(form.price_per_sf)      || 0,
      sf_per_pallet:     parseFloat(form.sf_per_pallet)     || 0,
      price_per_lf_vert: parseFloat(form.price_per_lf_vert) || 0,
    }).select().single()
    if (data) setPaverPrices(p => [...p, data].sort((a, b) => a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name)))
  }
  async function savePaverPrice(form) {
    const { data } = await supabase.from('paver_prices').update({
      brand:             form.brand?.trim(),
      name:              form.name?.trim(),
      price_per_sf:      parseFloat(form.price_per_sf)      || 0,
      sf_per_pallet:     parseFloat(form.sf_per_pallet)     || 0,
      price_per_lf_vert: parseFloat(form.price_per_lf_vert) || 0,
    }).eq('id', form.id).select().single()
    if (data) setPaverPrices(p => p.map(r => r.id === data.id ? data : r))
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

        {/* ── Filter bar: Materials ── */}
        {(() => {
          const matCats = Array.from(new Set(materials.map(m => m.category).filter(Boolean))).sort()
          const cats = ['All', ...matCats, 'Pavers']
          return (
            <div className="flex gap-1 flex-wrap pb-2 items-start content-start">
              {cats.map(cat => (
                <button
                  key={cat}
                  onClick={() => setMatCategory(cat)}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                    matCategory === cat
                      ? 'bg-green-700 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                  {cat === 'Pavers' && <span className="ml-1 opacity-70">({paverPrices.length})</span>}
                  {cat !== 'All' && cat !== 'Pavers' && (
                    <span className="ml-1 opacity-70">({materials.filter(m => m.category === cat).length})</span>
                  )}
                </button>
              ))}
            </div>
          )
        })()}

        {/* ── Filter bar: Labor ── */}
        {(() => {
          const cats = ['All', ...Array.from(new Set(labor.map(r => r.category).filter(Boolean))).sort()]
          return (
            <div className="flex gap-1 flex-wrap pb-2 items-start content-start">
              {cats.map(cat => (
                <button
                  key={cat}
                  onClick={() => setLabCategory(cat)}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                    labCategory === cat
                      ? 'bg-green-700 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                  {cat !== 'All' && (
                    <span className="ml-1 opacity-70">({labor.filter(r => r.category === cat).length})</span>
                  )}
                </button>
              ))}
            </div>
          )
        })()}

        {/* ── Filter bar: Subs ── */}
        {(() => {
          const cats = ['All', ...Array.from(new Set(subs.map(r => r.category).filter(Boolean))).sort()]
          return (
            <div className="flex gap-1 flex-wrap pb-2 items-start content-start">
              {cats.map(cat => (
                <button key={cat} onClick={() => setSubCategory(cat)}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                    subCategory === cat ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {cat}
                  {cat !== 'All' && <span className="ml-1 opacity-70">({subs.filter(r => r.category === cat).length})</span>}
                </button>
              ))}
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
              rows={matCategory === 'All' ? materials : materials.filter(m => m.category === matCategory)}
              columns={MATERIAL_COLUMNS}
              onAdd={addMaterial}
              onSave={saveMaterial}
              onDelete={deleteMaterial}
              loading={loading}
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
            pinnedHeader={
              <UniversalLaborRate
                hourlyRate={laborRatePerHour}
                onSave={saveLaborRatePerHour}
              />
            }
          />
        </div>

        {/* ── Panel: Subs ── */}
        <div className="flex flex-col" style={{ minHeight: '500px' }}>
          <RatesPanel
            title="Subcontractor Pricing"
            rows={subCategory === 'All' ? subs : subs.filter(r => r.category === subCategory)}
            columns={SUB_COLUMNS}
            onAdd={addSub}
            onSave={saveSub}
            onDelete={deleteSub}
            loading={loading}
            pinnedHeader={
              <UniversalSubMarkup
                markupRate={subMarkupRate}
                onSave={saveSubMarkupRate}
              />
            }
          />
        </div>

      </div>

    </div>
  )
}
