import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import { fetchAllMaterialsAdmin, resolveTaxonomyIds, setMaterialPrice } from '../lib/materialCatalog'
import PriceSheetImportModal from '../components/PriceSheetImportModal'
import VendorCatalogImportModal from '../components/VendorCatalogImportModal'
import MergeDuplicatesModal from '../components/MergeDuplicatesModal'
import { fetchProductTypes, validateCalcMeta, indexProductTypes } from '../lib/productTypes'
import TaxonomyManager from '../components/TaxonomyManager'

// ── Identity code per labor / subcontractor rate (generated on the fly, never
// stored — mirrors the material + misc-rate codes). Format:
//   <PREFIX>-<CatCode>-<SubCode>-<NNNN>  (SubCode omitted when no sub-category)
// CatCode / SubCode come from the taxonomy tables, matched by name; if a name
// isn't in the taxonomy yet, a 6-char alphanumeric slug of the text is used.
// NNNN is the row's stable 1-based index within its (category, sub-category)
// group, sorted by name. Returns a Map(id → code).
function buildRateCodeMap(rows, cats, subs, prefix, nameField) {
  const slug = s => ((s || '').replace(/[^a-z0-9]/gi, '').slice(0, 6).toUpperCase()) || 'GEN'
  const catCode = name => cats.find(c => c.name === name)?.code || slug(name)
  const subCode = (catName, subName) => {
    if (!subName) return null
    const cat = cats.find(c => c.name === catName)
    const s = subs.find(x => x.name === subName && (!cat || x.category_id === cat.id))
    return s?.code || slug(subName)
  }
  const seq = {}
  const counters = {}
  ;[...rows]
    .sort((a, b) => String(a[nameField] || '').localeCompare(String(b[nameField] || '')))
    .forEach(r => {
      const key = `${r.category || ''}|${r.sub_category || ''}`
      counters[key] = (counters[key] || 0) + 1
      seq[r.id] = counters[key]
    })
  const map = new Map()
  rows.forEach(r => {
    const cc = catCode(r.category)
    const sc = subCode(r.category, r.sub_category)
    const nnnn = String(seq[r.id] || 0).padStart(4, '0')
    map.set(r.id, sc ? `${prefix}-${cc}-${sc}-${nnnn}` : `${prefix}-${cc}-${nnnn}`)
  })
  return map
}

// ── Which estimate modules consume a given rate ──────────────────────────────
// Most rates carry a `category` that IS the module; a few categories / vendor
// subcategories are shared across modules.
const CATEGORY_MODULES = {
  'Artificial Turf': ['Artificial Turf'],
  Columns: ['Columns'],
  Concrete: ['Concrete'],
  Demo: ['Hand Demo', 'Skid Steer Demo', 'Mini Skid Steer Demo'],
  Drainage: ['Drainage'],
  Finishes: ['Finishes'],
  'Fire Pit': ['Fire Pit'],
  General: [],
  'Ground Treatments': ['Ground Treatments'],
  Irrigation: ['Irrigation'],
  'Outdoor Kitchen': ['Outdoor Kitchen'],
  Paver: ['Paver', 'Steps'],
  Planting: ['Planting'],
  Pool: ['Pool'],
  Steps: ['Steps'],
  Utilities: ['Utilities', 'Outdoor Kitchen', 'Fire Pit'],
  Walls: ['Walls', 'Fire Pit'],
}
// Vendor-catalog subcategories map to specific modules regardless of category.
const SUBCAT_MODULES = {
  'Paver Material': ['Paver', 'Steps'],
  'Base Material': ['Paver'],
  'Wall Finish': ['Outdoor Kitchen', 'Fire Pit'],
  'Wall Cap': ['Fire Pit'],
  Tile: ['Steps'],
  Flagstone: ['Steps'],
  Brick: ['Steps'],
  'Utility Lines': ['Utilities', 'Outdoor Kitchen', 'Fire Pit'],
  'Gas Fixtures': ['Utilities', 'Outdoor Kitchen', 'Fire Pit'],
  'Electrical Fixtures': ['Utilities', 'Outdoor Kitchen'],
}
function estimateModules(category, subcategory) {
  if (subcategory && SUBCAT_MODULES[subcategory]) return SUBCAT_MODULES[subcategory]
  if (category && CATEGORY_MODULES[category]) return CATEGORY_MODULES[category]
  return category ? [category] : []
}

// Display-only: strip words that duplicate the row's category from the item
// name (the underlying DB name is unchanged so module rate lookups still work).
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
function stripCategory(name, category) {
  if (!name || !category) return name || ''
  let out = name
  // Remove the full category phrase first, then each individual word.
  ;[category, ...category.split(/\s+/)].forEach(w => {
    if (w) out = out.replace(new RegExp(`\\b${escapeRe(w)}\\b`, 'gi'), '')
  })
  out = out
    .replace(/^[\s\-–—:]+|[\s\-–—:]+$/g, '') // trim leading/trailing separators
    .replace(/\s*[-–—]\s*/g, ' - ') // normalize dashes
    .replace(/\s{2,}/g, ' ')
    .replace(/^[-–—\s]+|[-–—\s]+$/g, '')
    .trim()
  return out || name // if everything was stripped, keep the original
}

// ── Option lists ─────────────────────────────────────────────────────────────
const MATERIAL_UNIT_OPTIONS = [
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
  'per plant',
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
const SUB_CATEGORY_OPTIONS = ['Concrete', 'Demo', 'General', 'Pool', 'Sub Haul']
const SUB_UNIT_OPTIONS = [
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
]

// ── Generic full-width editable rate table ───────────────────────────────────
// Clean item text for the Item column: drop the "<subcategory> - " prefix
// (e.g. "Paver Material - ") and, if the collection leads the remaining text,
// drop it too (it's shown in the Sub Category column). Falls back to the
// generic category-word strip for rows without a subcategory prefix.
function displayItem(row, v) {
  let out = v || ''
  const pfx = row.sub_category ? `${row.sub_category} - ` : ''
  if (pfx && out.startsWith(pfx)) out = out.slice(pfx.length)
  else out = stripCategory(out, row.category)
  // Drop the collection (sub_category) wherever it appears in the item —
  // it lives in its own Sub Category column, so it shouldn't repeat here.
  const sc = row.sub_category
  if (sc) {
    out = out.replace(new RegExp(`\\b${escapeRe(sc)}\\b`, 'gi'), '')
  }
  // Drop the standalone word "Material" from the displayed item
  out = out
    .replace(/\bMaterial\b/gi, '')
    .replace(/\s*[-–—]\s*/g, ' - ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s\-–—:]+|[\s\-–—:]+$/g, '')
    .trim()
  return out || v || ''
}

function displayCell(row, col) {
  const v = row[col.key]
  if (col.stripCat) return displayItem(row, v) || '—'
  if (col.type === 'select' && Array.isArray(col.options) && col.options.some(o => typeof o === 'object')) {
    const opt = col.options.find(o => typeof o === 'object' && o.value === (v || ''))
    return opt ? opt.label : v || '—'
  }
  if (col.type === 'number') {
    if (v === '' || v == null) return '—'
    return `${col.prefix || ''}${parseFloat(v || 0).toLocaleString(undefined, { maximumFractionDigits: 4 })}${col.suffix || ''}`
  }
  return v || '—'
}

async function uploadPhoto(file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('rate-photos').upload(path, file, { upsert: false })
  if (error) {
    alert('Photo upload failed: ' + error.message)
    return null
  }
  return supabase.storage.from('rate-photos').getPublicUrl(path).data.publicUrl
}

// Parse a calc-metadata form value (JSON string, object, or blank) into a
// plain object or null for storage in the material_rates.calc_meta jsonb column.
function parseCalcMeta(v) {
  if (v == null || v === '') return null
  if (typeof v === 'object') return v
  try {
    const o = JSON.parse(v)
    return o && typeof o === 'object' ? o : null
  } catch {
    return null
  }
}

function RateTable({ columns, rows, onAdd, onSave, onDelete, addTemplate, loading, addLabel = 'Add Row', filters = null, count = null }) {
  const [editingId, setEditingId] = useState(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({})
  const [lightbox, setLightbox] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [sort, setSort] = useState({ key: 'category', dir: 'asc' })

  function toggleSort(key) {
    setSort(s => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))
  }
  // Comparable value for a column: numeric for number columns, otherwise the
  // displayed text (so sorting matches what the user sees), '—' treated empty.
  function sortValue(row, col) {
    if (col.type === 'number') return parseFloat(row[col.key]) || 0
    const s = displayCell(row, col)
    return s == null || s === '—' ? '' : String(s)
  }
  const sortedRows = useMemo(() => {
    if (!sort.key) return rows
    const col = columns.find(c => c.key === sort.key)
    if (!col) return rows
    const arr = [...rows]
    arr.sort((ra, rb) => {
      const va = sortValue(ra, col)
      const vb = sortValue(rb, col)
      let cmp
      if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb
      else cmp = String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: 'base' })
      return sort.dir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [rows, sort, columns])

  function startEdit(row) {
    const f = { ...row }
    // JSON columns (e.g. calc_meta) are stored as objects; edit them as text.
    columns.forEach(c => {
      if (c.json && f[c.key] && typeof f[c.key] === 'object') f[c.key] = JSON.stringify(f[c.key])
    })
    setForm(f)
    setEditingId(row.id)
    setAdding(false)
  }
  function startAdd() {
    setForm(addTemplate())
    setAdding(true)
    setEditingId(null)
  }
  function cancel() {
    setEditingId(null)
    setAdding(false)
  }
  async function save() {
    if (adding) await onAdd(form)
    else await onSave(form)
    cancel()
  }
  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const editCells = columns.map(col => (
    <td key={col.key} className="px-3 py-1.5 align-top">
      {col.photo ? (
        <div className="flex items-center gap-2">
          {form[col.key] && (
            <img src={form[col.key]} alt="" className="w-8 h-8 object-cover rounded border border-gray-200" />
          )}
          <label className="text-[11px] text-green-700 font-semibold cursor-pointer hover:underline">
            {uploading ? 'Uploading…' : form[col.key] ? 'Replace' : 'Upload'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async e => {
                const f = e.target.files?.[0]
                if (!f) return
                setUploading(true)
                const url = await uploadPhoto(f)
                setUploading(false)
                if (url) setField(col.key, url)
              }}
            />
          </label>
          {form[col.key] && (
            <button
              type="button"
              onClick={() => setField(col.key, '')}
              className="text-[11px] text-red-400 hover:text-red-600"
            >
              remove
            </button>
          )}
        </div>
      ) : col.editable === false ? (
        <span className="text-gray-400">{col.render ? col.render(form) : '—'}</span>
      ) : col.type === 'select' ? (
        <select
          className="w-full border border-gray-200 rounded-md px-2 py-1 text-xs bg-white"
          value={form[col.key] ?? ''}
          onChange={e => setField(col.key, e.target.value)}
        >
          {col.placeholder && <option value="">{col.placeholder}</option>}
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
          className="w-full border border-gray-200 rounded-md px-2 py-1 text-xs"
          type={col.type || 'text'}
          step={col.step}
          value={form[col.key] ?? ''}
          placeholder={col.placeholder || ''}
          onChange={e => setField(col.key, e.target.value)}
        />
      )}
    </td>
  ))

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 px-3 py-2 bg-gray-50 border-b border-gray-200">
        {filters}
        <div className="ml-auto flex items-center gap-3">
          {!adding && (
            <button
              onClick={startAdd}
              className="text-sm text-green-700 font-semibold hover:underline"
            >
              + {addLabel}
            </button>
          )}
          {count != null && <span className="text-xs text-gray-400">{count} items</span>}
        </div>
      </div>
      <div className="overflow-auto max-h-[calc(100vh-15rem)]">
        <table className="w-full text-xs min-w-[820px]">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-50 border-b border-gray-200">
              {columns.map(col => {
                const active = sort.key === col.key
                return (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col.key)}
                    title="Sort"
                    className="px-3 py-2 text-left font-semibold text-gray-600 uppercase whitespace-nowrap cursor-pointer select-none bg-gray-50 hover:bg-gray-100"
                    style={col.width ? { width: col.width } : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      <span className={active ? 'text-gray-700' : 'text-gray-300'}>
                        {active ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </span>
                  </th>
                )
              })}
              <th className="px-3 py-2 w-24 bg-gray-50" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {adding && (
              <tr className="bg-green-50">
                {editCells}
                <td className="px-3 py-1.5 text-right whitespace-nowrap">
                  <button onClick={save} className="text-green-700 font-semibold mr-2">
                    Save
                  </button>
                  <button onClick={cancel} className="text-gray-400">
                    Cancel
                  </button>
                </td>
              </tr>
            )}
            {loading ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 && !adding ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-gray-400">
                  No entries.
                </td>
              </tr>
            ) : (
              sortedRows.map(row =>
                editingId === row.id ? (
                  <tr key={row.id} className="bg-green-50">
                    {editCells}
                    <td className="px-3 py-1.5 text-right whitespace-nowrap">
                      <button onClick={save} className="text-green-700 font-semibold mr-2">
                        Save
                      </button>
                      <button onClick={cancel} className="text-gray-400">
                        Cancel
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={row.id} className="hover:bg-gray-50 group">
                    {columns.map(col => (
                      <td
                        key={col.key}
                        className={`px-3 py-1.5 whitespace-nowrap ${col.bold ? 'font-semibold text-gray-900' : 'text-gray-600'}`}
                      >
                        {col.photo ? (
                          row[col.key] ? (
                            <img
                              src={row[col.key]}
                              alt=""
                              onClick={() => setLightbox(row[col.key])}
                              className="w-8 h-8 object-cover rounded border border-gray-200 cursor-pointer hover:ring-2 hover:ring-green-400"
                            />
                          ) : (
                            <span className="text-gray-300">—</span>
                          )
                        ) : col.render ? (
                          col.render(row)
                        ) : (
                          displayCell(row, col)
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-1.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => startEdit(row)}
                        className="text-gray-500 hover:text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity mr-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(row.id)}
                        className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                )
              )
            )}
          </tbody>
        </table>
      </div>
      {lightbox &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-6 cursor-zoom-out"
            onClick={() => setLightbox(null)}
          >
            <img
              src={lightbox}
              alt=""
              className="max-w-full max-h-full rounded-lg shadow-2xl"
              onClick={e => e.stopPropagation()}
            />
          </div>,
          document.body
        )}
    </div>
  )
}

function ModuleTags({ modules }) {
  if (!modules.length) return <span className="text-gray-300">—</span>
  return (
    <span className="flex flex-wrap gap-1">
      {modules.map(m => (
        <span
          key={m}
          className="inline-block px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-medium whitespace-nowrap"
        >
          {m}
        </span>
      ))}
    </span>
  )
}

// ── Main page ────────────────────────────────────────────────
const TABS = [
  { key: 'materials', label: 'Materials' },
  { key: 'labor', label: 'Labor Rates' },
  { key: 'labor_cat', label: 'Labor Categories' },
  { key: 'labor_sub', label: 'Labor Sub-Cats' },
  { key: 'subs', label: 'Subcontractors' },
  { key: 'sub_cat', label: 'Sub Categories' },
  { key: 'sub_sub', label: 'Sub Sub-Cats' },
]

export default function MasterRates({ only } = {}) {
  // `only` = 'materials' | 'labor' | 'subs' renders just that one table (used
  // when embedded as a tab under Vendors / Subcontractors / Jobs settings).
  const [activeTabState, setActiveTab] = useState('materials')
  const activeTab = only || activeTabState
  // Embedded (only=…) views hide the top tab bar, so surface the taxonomy via a
  // small inner Rates / Categories toggle. Scope follows the embedded table.
  const embedScope = only === 'subs' ? 'sub' : only === 'labor' ? 'labor' : null
  const [embeddedView, setEmbeddedView] = useState('rates') // 'rates' | 'tax'
  const showRateTable = !only || embeddedView === 'rates'
  const [showImport, setShowImport] = useState(false)
  const [showMerge, setShowMerge] = useState(false)
  const [showCatalog, setShowCatalog] = useState(false)
  const [materials, setMaterials] = useState([])
  const [productTypes, setProductTypes] = useState([])
  const [labor, setLabor] = useState([])
  const [subs, setSubs] = useState([])
  const [vendors, setVendors] = useState([])
  // Labor / subcontractor taxonomy (for generated codes; tables may not exist yet)
  const [laborCats, setLaborCats] = useState([])
  const [laborSubcats, setLaborSubcats] = useState([])
  const [subTaxCats, setSubTaxCats] = useState([])
  const [subTaxSubcats, setSubTaxSubcats] = useState([])
  const [loading, setLoading] = useState(true)
  const [matCategory, setMatCategory] = useState('All')
  const [matVendor, setMatVendor] = useState('All')
  const [labCategory, setLabCategory] = useState('All')
  const [subCategory, setSubCategory] = useState('All')
  const [subCompany, setSubCompany] = useState('All')

  // Unassigned material rates show as "Unspecified". The permanent Unspecified
  // vendor record is filtered OUT of the explicit vendor list so the picker
  // shows a single "Unspecified" choice (the value='' / unassigned option),
  // never a duplicate.
  const isUnspecifiedVendor = v =>
    ['unspecified', 'standard'].includes((v?.company_name || '').trim().toLowerCase())
  const vendorOptions = useMemo(
    () => [
      { value: '', label: 'Standard' },
      ...vendors.filter(v => !isUnspecifiedVendor(v)).map(v => ({ value: v.id, label: v.company_name })),
    ],
    [vendors]
  )
  const vendorName = id => vendors.find(v => v.id === id)?.company_name || 'Standard'

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    const [mats, labRes, subRes, vendorRes, lc, ls, sc, ss] = await Promise.all([
      fetchAllMaterialsAdmin(),
      supabase.from('labor_rates').select('*').order('name'),
      supabase.from('subcontractor_rates').select('*').order('company_name'),
      supabase.from('subs_vendors').select('id, company_name, type').order('company_name'),
      // Taxonomy tables (may not exist yet → data null → [] → codes fall back to slug)
      supabase.from('labor_category').select('id, code, name'),
      supabase.from('labor_subcategory').select('id, code, name, category_id'),
      supabase.from('subcontractor_category').select('id, code, name'),
      supabase.from('subcontractor_subcategory').select('id, code, name, category_id'),
    ])
    if (mats) setMaterials(mats)
    if (labRes.data) setLabor(labRes.data)
    if (subRes.data) setSubs(subRes.data)
    if (vendorRes.data) setVendors(vendorRes.data)
    setLaborCats(lc.data || [])
    setLaborSubcats(ls.data || [])
    setSubTaxCats(sc.data || [])
    setSubTaxSubcats(ss.data || [])
    // Product types are reference data; tolerant of the table not existing yet.
    setProductTypes(await fetchProductTypes())
    setLoading(false)
  }

  // ── Materials CRUD (new model: material + material_price) ──
  async function addMaterial(form) {
    const subCat =
      form.sub_category?.trim() ||
      (form.category?.trim() === 'Paver' && form.vendor_id ? 'Paver Material' : null)
    const { category_id, subcategory_id, error: taxErr } = await resolveTaxonomyIds(form.category, subCat)
    if (taxErr) { alert(taxErr); return }
    const { data, error } = await supabase
      .from('material')
      .insert({
        description: form.name?.trim(),
        unit: form.unit,
        category_id,
        subcategory_id,
        calc_meta: parseCalcMeta(form.calc_meta),
        photo_url: form.photo_url || null,
      })
      .select('id')
      .single()
    if (error) { alert('Add failed: ' + error.message); return }
    if (form.unit_cost !== '' && form.unit_cost != null) {
      await setMaterialPrice(data.id, form.vendor_id || null, parseFloat(form.unit_cost) || 0)
    }
    await fetchAll()
  }
  async function saveMaterial(form) {
    const subCat =
      form.sub_category?.trim() ||
      (form.category?.trim() === 'Paver' && form.vendor_id ? 'Paver Material' : null)
    const { category_id, subcategory_id, error: taxErr } = await resolveTaxonomyIds(form.category, subCat)
    if (taxErr) { alert(taxErr); return }
    const { error } = await supabase
      .from('material')
      .update({
        description: form.name?.trim(),
        unit: form.unit,
        category_id,
        subcategory_id,
        calc_meta: parseCalcMeta(form.calc_meta),
        photo_url: form.photo_url || null,
      })
      .eq('id', form.id)
    if (error) { alert('Save failed: ' + error.message); return }
    if (form.unit_cost !== '' && form.unit_cost != null) {
      await setMaterialPrice(form.id, form.vendor_id || null, parseFloat(form.unit_cost) || 0)
    }
    await fetchAll()
  }
  async function deleteMaterial(id) {
    if (!confirm('Delete this material? Its prices are removed too.')) return
    await supabase.from('material').delete().eq('id', id) // cascades material_price
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
        rate_per_day: parseFloat(form.rate) || 0,
        notes: form.notes?.trim(),
        sub_category: form.sub_category?.trim() || null,
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
        rate_per_day: parseFloat(form.rate) || 0,
        notes: form.notes?.trim(),
        sub_category: form.sub_category?.trim() || null,
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
        sub_category: form.sub_category?.trim() || null,
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
        sub_category: form.sub_category?.trim() || null,
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

  // ── Column configs ──
  const ptById = useMemo(() => indexProductTypes(productTypes).byId, [productTypes])
  const materialColumns = [
    { key: 'category', label: 'Category', placeholder: 'e.g. Hardscape' },
    {
      key: 'vendor_id',
      label: 'Vendor',
      type: 'select',
      options: vendorOptions,
      render: r => vendorName(r.vendor_id),
    },
    { key: 'sub_category', label: 'Sub Category', placeholder: 'describe…' },
    { key: 'name', label: 'Item', bold: true, stripCat: true, placeholder: 'e.g. Decomposed Granite' },
    { key: 'photo_url', label: 'Photo', photo: true },
    { key: 'unit', label: 'Unit', type: 'select', options: MATERIAL_UNIT_OPTIONS },
    { key: 'unit_cost', label: 'Price', type: 'number', step: '0.0001', prefix: '$' },
    {
      key: '__ptype',
      label: 'Type',
      editable: false,
      render: r => ptById[r.product_type_id]?.label || '—',
    },
    {
      key: 'calc_meta',
      label: 'Calc Meta (JSON)',
      json: true,
      placeholder: '{"laborPerLF":0.05}',
      render: r => {
        const t = ptById[r.product_type_id]
        const v = t ? validateCalcMeta(t.attribute_schema, r.calc_meta) : null
        if (v && v.missing.length) return `⚠ needs: ${v.missing.join(', ')}`
        return r.calc_meta ? JSON.stringify(r.calc_meta) : '—'
      },
    },
    {
      key: '__modules',
      label: 'Estimate Module',
      editable: false,
      render: r => <ModuleTags modules={estimateModules(r.category, r.sub_category)} />,
    },
  ]
  // Generated identity codes for labor / subcontractor rows (like materials).
  const laborCodeMap = useMemo(
    () => buildRateCodeMap(labor, laborCats, laborSubcats, 'LAB', 'name'),
    [labor, laborCats, laborSubcats]
  )
  const subCodeMap = useMemo(
    () => buildRateCodeMap(subs, subTaxCats, subTaxSubcats, 'SUB', 'trade'),
    [subs, subTaxCats, subTaxSubcats]
  )
  const codeCell = map => r => (
    <span className="font-mono text-xs text-gray-500">{map.get(r.id) || '—'}</span>
  )
  // Category / Sub-Category dropdown options = managed taxonomy (from the new
  // Categories tabs) merged with the built-in defaults and any value already on
  // a row, so nothing existing disappears and newly-added categories show up.
  const uniqSorted = arr => Array.from(new Set(arr.filter(Boolean))).sort()
  const laborCatOptions = useMemo(
    () => uniqSorted([...LABOR_CATEGORY_OPTIONS, ...laborCats.map(c => c.name), ...labor.map(r => r.category)]),
    [laborCats, labor]
  )
  const laborSubOptions = useMemo(
    () => uniqSorted([...laborSubcats.map(x => x.name), ...labor.map(r => r.sub_category)]),
    [laborSubcats, labor]
  )
  const subCatOptions = useMemo(
    () => uniqSorted([...SUB_CATEGORY_OPTIONS, ...subTaxCats.map(c => c.name), ...subs.map(r => r.category)]),
    [subTaxCats, subs]
  )
  const subSubOptions = useMemo(
    () => uniqSorted([...subTaxSubcats.map(x => x.name), ...subs.map(r => r.sub_category)]),
    [subTaxSubcats, subs]
  )
  const laborColumns = [
    { key: 'code', label: 'Code', editable: false, render: codeCell(laborCodeMap) },
    { key: 'category', label: 'Category', type: 'select', options: laborCatOptions },
    { key: 'sub_category', label: 'Sub Category', type: 'select', options: laborSubOptions, placeholder: 'describe…' },
    { key: 'name', label: 'Item', bold: true, stripCat: true, placeholder: 'e.g. Demo - Tree Small' },
    { key: 'notes', label: 'Labor Description', placeholder: 'Optional notes' },
    { key: 'unit', label: 'Unit', type: 'select', options: LABOR_UNIT_OPTIONS },
    { key: 'rate', label: 'Rate', type: 'number', step: '0.0001' },
    {
      key: '__modules',
      label: 'Estimate Module',
      editable: false,
      render: r => <ModuleTags modules={estimateModules(r.category)} />,
    },
  ]
  const subColumns = [
    { key: 'code', label: 'Code', editable: false, render: codeCell(subCodeMap) },
    { key: 'category', label: 'Category', type: 'select', options: subCatOptions },
    { key: 'company_name', label: 'Subcontractor', placeholder: 'e.g. ABC Concrete Co.' },
    { key: 'sub_category', label: 'Sub Category', type: 'select', options: subSubOptions, placeholder: 'describe…' },
    { key: 'trade', label: 'Item', bold: true, stripCat: true, placeholder: 'e.g. Flatwork Pour' },
    { key: 'unit', label: 'Unit', type: 'select', options: SUB_UNIT_OPTIONS },
    { key: 'rate', label: 'Unit Price', type: 'number', step: '0.01', prefix: '$' },
    {
      key: '__modules',
      label: 'Estimate Module',
      editable: false,
      render: r => <ModuleTags modules={estimateModules(r.category)} />,
    },
  ]

  const matCats = ['All', ...Array.from(new Set(materials.map(m => m.category).filter(Boolean))).sort()]
  const labCats = ['All', ...Array.from(new Set(labor.map(r => r.category).filter(Boolean))).sort()]
  const subCats = ['All', ...Array.from(new Set(subs.map(r => r.category).filter(Boolean))).sort()]
  const subCompanies = ['All', ...Array.from(new Set(subs.map(r => r.company_name).filter(Boolean))).sort()]

  const visibleMaterials = materials.filter(m => {
    if (matCategory !== 'All' && m.category !== matCategory) return false
    if (matVendor === '__HOUSE__') return m.vendor_id == null
    if (matVendor !== 'All') return m.vendor_id === matVendor
    return true
  })
  const visibleLabor = labCategory === 'All' ? labor : labor.filter(r => r.category === labCategory)
  const visibleSubs = subs.filter(r => {
    if (subCategory !== 'All' && r.category !== subCategory) return false
    if (subCompany !== 'All' && (r.company_name || '') !== subCompany) return false
    return true
  })

  const filterSelect = 'border border-gray-200 rounded-md px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-green-400'

  return (
    <div>
      {(!only || activeTab === 'materials') && (
        <div className="flex items-center justify-between mb-4">
          {!only ? <h1 className="text-xl font-bold text-gray-900">Master Rates</h1> : <span />}
          {activeTab === 'materials' && (
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => setShowMerge(true)}
                className="text-sm bg-white border border-green-600 text-green-700 font-semibold rounded px-4 py-1.5 hover:bg-green-50"
              >
                🔀 Merge duplicates
              </button>
              <button
                onClick={() => setShowCatalog(true)}
                className="text-sm bg-white border border-green-600 text-green-700 font-semibold rounded px-4 py-1.5 hover:bg-green-50"
              >
                Import Catalog
              </button>
              <button
                onClick={() => setShowImport(true)}
                className="text-sm bg-green-600 text-white font-semibold rounded px-4 py-1.5 hover:bg-green-700"
              >
                Import Price Sheet
              </button>
            </div>
          )}
        </div>
      )}
      {showImport && (
        <PriceSheetImportModal
          vendors={vendors}
          onClose={() => setShowImport(false)}
          onApplied={fetchAll}
        />
      )}
      {showCatalog && (
        <VendorCatalogImportModal
          vendors={vendors}
          onClose={() => setShowCatalog(false)}
          onImported={fetchAll}
        />
      )}
      {showMerge && (
        <MergeDuplicatesModal onClose={() => setShowMerge(false)} onMerged={fetchAll} />
      )}

      {/* Tabs (hidden when embedded as a single-table view) */}
      {!only && (
        <div className="flex gap-1 border-b border-gray-200 mb-3">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                activeTab === t.key
                  ? 'border-green-700 text-green-800'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Embedded views (only=…) hide the tab bar — surface Categories here. */}
      {only && embedScope && (
        <div className="flex gap-1 border-b border-gray-200 mb-3">
          {[
            { key: 'rates', label: only === 'labor' ? 'Labor Rates' : 'Subcontractor Rates' },
            { key: 'cat', label: 'Categories' },
            { key: 'sub', label: 'Sub-Categories' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setEmbeddedView(t.key)}
              className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                embeddedView === t.key
                  ? 'border-green-700 text-green-800'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Embedded taxonomy — Categories and Sub-Categories are independent tabs. */}
      {only && embedScope && embeddedView === 'cat' && (
        <TaxonomyManager scope={embedScope} kind="category" />
      )}
      {only && embedScope && embeddedView === 'sub' && (
        <TaxonomyManager scope={embedScope} kind="subcategory" />
      )}

      {/* Materials */}
      {showRateTable && activeTab === 'materials' && (
        <div>
          <RateTable
            addLabel="Add Material"
            count={visibleMaterials.length}
            filters={
              <>
                <div className="flex items-center gap-1.5">
                  <label className="text-xs text-gray-500">Category</label>
                  <select value={matCategory} onChange={e => setMatCategory(e.target.value)} className={filterSelect}>
                    {matCats.map(c => (
                      <option key={c} value={c}>
                        {c === 'All' ? 'All categories' : c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="text-xs text-gray-500">Vendor</label>
                  <select value={matVendor} onChange={e => setMatVendor(e.target.value)} className={filterSelect}>
                    <option value="All">All vendors</option>
                    <option value="__HOUSE__">Standard</option>
                    {vendors.filter(v => !isUnspecifiedVendor(v)).map(v => (
                      <option key={v.id} value={v.id}>
                        {v.company_name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            }
            columns={materialColumns}
            rows={visibleMaterials}
            onAdd={addMaterial}
            onSave={saveMaterial}
            onDelete={deleteMaterial}
            addTemplate={() => ({
              name: '',
              vendor_id: '',
              category: matCategory !== 'All' ? matCategory : '',
              sub_category: '',
              unit: 'each',
              unit_cost: '',
              calc_meta: '',
              photo_url: '',
            })}
            loading={loading}
          />
        </div>
      )}

      {/* Labor */}
      {showRateTable && activeTab === 'labor' && (
        <div>
          <RateTable
            addLabel="Add Labor Rate"
            count={visibleLabor.length}
            filters={
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-gray-500">Category</label>
                <select value={labCategory} onChange={e => setLabCategory(e.target.value)} className={filterSelect}>
                  {labCats.map(c => (
                    <option key={c} value={c}>
                      {c === 'All' ? 'All categories' : c}
                    </option>
                  ))}
                </select>
              </div>
            }
            columns={laborColumns}
            rows={visibleLabor}
            onAdd={addLabor}
            onSave={saveLabor}
            onDelete={deleteLabor}
            addTemplate={() => ({
              name: '',
              category: labCategory !== 'All' ? labCategory : 'General',
              sub_category: '',
              unit: 'per day',
              rate: '',
              notes: '',
            })}
            loading={loading}
          />
        </div>
      )}

      {/* Subs */}
      {showRateTable && activeTab === 'subs' && (
        <div>
          <RateTable
            addLabel="Add Subcontractor"
            count={visibleSubs.length}
            filters={
              <>
                <div className="flex items-center gap-1.5">
                  <label className="text-xs text-gray-500">Subcontractor</label>
                  <select value={subCompany} onChange={e => setSubCompany(e.target.value)} className={filterSelect}>
                    {subCompanies.map(c => (
                      <option key={c} value={c}>
                        {c === 'All' ? 'All subcontractors' : c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="text-xs text-gray-500">Category</label>
                  <select value={subCategory} onChange={e => setSubCategory(e.target.value)} className={filterSelect}>
                    {subCats.map(c => (
                      <option key={c} value={c}>
                        {c === 'All' ? 'All categories' : c}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            }
            columns={subColumns}
            rows={visibleSubs}
            onAdd={addSub}
            onSave={saveSub}
            onDelete={deleteSub}
            addTemplate={() => ({
              company_name: '',
              trade: '',
              category: subCategory !== 'All' ? subCategory : 'General',
              sub_category: '',
              unit: 'per day',
              rate: '',
            })}
            loading={loading}
          />
        </div>
      )}

      {/* Labor taxonomy — Categories and Sub-Categories as independent tabs. */}
      {activeTab === 'labor_cat' && <TaxonomyManager scope="labor" kind="category" />}
      {activeTab === 'labor_sub' && <TaxonomyManager scope="labor" kind="subcategory" />}

      {/* Subcontractor taxonomy — Categories and Sub-Categories as independent tabs. */}
      {activeTab === 'sub_cat' && <TaxonomyManager scope="sub" kind="category" />}
      {activeTab === 'sub_sub' && <TaxonomyManager scope="sub" kind="subcategory" />}
    </div>
  )
}
