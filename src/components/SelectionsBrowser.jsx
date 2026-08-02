// src/components/SelectionsBrowser.jsx
//
// The Design → Selections browser: a tenant-scoped catalog of choosable
// design items (plants, lighting, BBQ, hardscape, …) grouped by category and
// sub-category, each with an adaptive detail view driven off the flexible
// `attributes` jsonb column. Supports search, add / edit (with photo upload to
// the rate-photos bucket) and delete.
//
// DB: table `selections` — RLS is tenant-scoped and tenant_id is set by a
// trigger, so we NEVER send tenant_id.

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import VendorCombo from './VendorCombo'

const FG = '#3A5038'

// ---- helpers --------------------------------------------------------------

const fmtPrice = v =>
  v == null || v === ''
    ? null
    : `$${(Number(v) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// sun_exposure → "Sun exposure"
function humanize(key) {
  if (!key) return ''
  return String(key)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\w/, c => c.toUpperCase())
}

// A tiny neutral placeholder emoji per category so cards without a photo still
// read as something. Falls back to the category's first letter.
const CATEGORY_EMOJI = {
  plants: '🌿',
  plant: '🌿',
  planting: '🌿',
  trees: '🌳',
  tree: '🌳',
  lighting: '💡',
  light: '💡',
  bbq: '🍖',
  grill: '🍖',
  outdoor: '🪑',
  furniture: '🪑',
  hardscape: '🧱',
  pavers: '🧱',
  stone: '🪨',
  water: '💧',
  pool: '🏊',
  fire: '🔥',
  firepit: '🔥',
  irrigation: '🚿',
  turf: '🌱',
}

function categoryGlyph(category) {
  const key = (category || '').toLowerCase().trim()
  if (CATEGORY_EMOJI[key]) return CATEGORY_EMOJI[key]
  // try a loose contains match
  for (const k of Object.keys(CATEGORY_EMOJI)) {
    if (key.includes(k)) return CATEGORY_EMOJI[k]
  }
  return (category || '?').trim().charAt(0).toUpperCase() || '?'
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

// ---- main component -------------------------------------------------------

export default function SelectionsBrowser() {
  const [items, setItems] = useState([])
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)

  const [category, setCategory] = useState('All')
  const [subCategory, setSubCategory] = useState('All')
  const [search, setSearch] = useState('')

  const [detail, setDetail] = useState(null) // selection row shown in detail
  const [editing, setEditing] = useState(null) // row being edited, or 'new'

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: sel }, { data: vs }] = await Promise.all([
      supabase.from('selections').select('*').order('name'),
      supabase.from('subs_vendors').select('id, company_name, type').order('company_name'),
    ])
    setItems(sel || [])
    setVendors((vs || []).filter(v => !v.type || v.type === 'vendor'))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const vendorName = useCallback(
    id => vendors.find(v => v.id === id)?.company_name || null,
    [vendors],
  )

  // Category tabs = distinct non-empty categories, sorted, "All" first.
  const categories = useMemo(() => {
    const set = new Set(items.map(i => (i.category || '').trim()).filter(Boolean))
    return ['All', ...Array.from(set).sort((a, b) => a.localeCompare(b))]
  }, [items])

  // Sub-category sub-tabs within the selected category.
  const subCategories = useMemo(() => {
    if (category === 'All') return []
    const set = new Set(
      items
        .filter(i => (i.category || '').trim() === category)
        .map(i => (i.sub_category || '').trim())
        .filter(Boolean),
    )
    return ['All', ...Array.from(set).sort((a, b) => a.localeCompare(b))]
  }, [items, category])

  // Reset sub-category whenever the category changes.
  useEffect(() => { setSubCategory('All') }, [category])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter(i => {
      if (category !== 'All' && (i.category || '').trim() !== category) return false
      if (subCategory !== 'All' && (i.sub_category || '').trim() !== subCategory) return false
      if (q) {
        const hay = [i.name, i.description, i.sku, i.sub_category]
          .map(x => (x || '').toLowerCase())
          .join(' ')
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [items, category, subCategory, search])

  async function handleDelete(row) {
    if (!confirm(`Delete "${row.name}"? This cannot be undone.`)) return
    const { error } = await supabase.from('selections').delete().eq('id', row.id)
    if (error) { alert('Delete failed: ' + error.message); return }
    setDetail(null)
    load()
  }

  return (
    <div className="flex flex-col mt-4">
      {/* Tabs + search + new */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <div className="flex flex-wrap gap-1">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                category === c
                  ? 'bg-green-700 border-green-700 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {c === 'All' ? 'All' : c}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <input
            type="text"
            placeholder="Search selections…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700/30 focus:border-green-700 w-56"
          />
          <button
            onClick={() => setEditing('new')}
            className="text-sm font-bold text-white px-4 py-1.5 rounded-lg whitespace-nowrap"
            style={{ backgroundColor: FG }}
          >
            + New Selection
          </button>
        </div>
      </div>

      {/* Sub-category sub-tabs */}
      {category !== 'All' && subCategories.length > 1 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {subCategories.map(s => (
            <button
              key={s}
              onClick={() => setSubCategory(s)}
              className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
                subCategory === s
                  ? 'bg-green-50 border-green-600 text-green-700'
                  : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {s === 'All' ? 'All' : s}
            </button>
          ))}
        </div>
      )}

      {/* Card grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-700"></div>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center max-w-2xl mx-auto mt-4">
          <p className="text-4xl mb-2">🎨</p>
          <h2 className="text-base font-semibold text-gray-800 mb-1">No selections yet</h2>
          <p className="text-sm text-gray-500">Import a vendor catalog or add one with “+ New Selection”.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-16 text-sm">No selections match your filters.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map(it => (
            <SelectionCard
              key={it.id}
              item={it}
              vendorName={vendorName(it.vendor_id)}
              onClick={() => setDetail(it)}
            />
          ))}
        </div>
      )}

      {/* Detail modal */}
      {detail && (
        <SelectionDetail
          item={detail}
          vendorName={vendorName(detail.vendor_id)}
          onClose={() => setDetail(null)}
          onEdit={() => { setEditing(detail); setDetail(null) }}
          onDelete={() => handleDelete(detail)}
        />
      )}

      {/* Add / Edit form */}
      {editing && (
        <SelectionForm
          row={editing === 'new' ? null : editing}
          vendors={vendors}
          categories={categories.filter(c => c !== 'All')}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load() }}
        />
      )}
    </div>
  )
}

// ---- card -----------------------------------------------------------------

function SelectionCard({ item, vendorName, onClick }) {
  const price = fmtPrice(item.price)
  return (
    <button
      onClick={onClick}
      className="text-left bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-md hover:border-green-600 transition-all"
    >
      <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
        {item.photo_url ? (
          <img src={item.photo_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-4xl text-gray-400 select-none">{categoryGlyph(item.category)}</span>
        )}
      </div>
      <div className="p-3">
        <div className="text-sm font-semibold text-gray-800 truncate" title={item.name}>{item.name}</div>
        {item.sub_category && (
          <div className="text-xs text-gray-400 truncate">{item.sub_category}</div>
        )}
        <div className="flex items-center justify-between mt-1 gap-2">
          <span className="text-xs text-gray-500 truncate">{vendorName || ' '}</span>
          {price && <span className="text-xs font-semibold text-green-700 whitespace-nowrap">{price}</span>}
        </div>
      </div>
    </button>
  )
}

// ---- detail ---------------------------------------------------------------

function SelectionDetail({ item, vendorName, onClose, onEdit, onDelete }) {
  const [lightbox, setLightbox] = useState(false)

  const specs = useMemo(() => {
    const a = item.attributes
    if (!a || typeof a !== 'object' || Array.isArray(a)) return []
    return Object.entries(a).filter(([, v]) => v != null && v !== '')
  }, [item.attributes])

  const price = fmtPrice(item.price)

  return createPortal(
    <div className="fixed inset-0 z-[9998] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Photo */}
        <div className="relative">
          <div className="aspect-video bg-gray-100 flex items-center justify-center overflow-hidden rounded-t-2xl">
            {item.photo_url ? (
              <img
                src={item.photo_url}
                alt=""
                onClick={() => setLightbox(true)}
                className="w-full h-full object-cover cursor-zoom-in"
              />
            ) : (
              <span className="text-6xl text-gray-300 select-none">{categoryGlyph(item.category)}</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 bg-white/90 hover:bg-white text-gray-600 rounded-full w-8 h-8 flex items-center justify-center shadow"
          >
            ✕
          </button>
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{item.name}</h2>
              <div className="text-xs text-gray-400 mt-0.5">
                {[item.category, item.sub_category].filter(Boolean).join(' · ') || '—'}
              </div>
            </div>
            {price && (
              <div className="text-right whitespace-nowrap">
                <div className="text-lg font-bold text-green-700">{price}</div>
                {item.unit && <div className="text-xs text-gray-400">per {item.unit}</div>}
              </div>
            )}
          </div>

          {/* meta line */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-sm">
            {vendorName && (
              <div><span className="text-gray-400">Vendor:</span> <span className="text-gray-700">{vendorName}</span></div>
            )}
            {item.sku && (
              <div><span className="text-gray-400">SKU:</span> <span className="text-gray-700">{item.sku}</span></div>
            )}
            {item.type && (
              <div><span className="text-gray-400">Type:</span> <span className="text-gray-700">{item.type}</span></div>
            )}
          </div>

          {item.description && (
            <p className="mt-4 text-sm text-gray-700 whitespace-pre-wrap">{item.description}</p>
          )}

          {/* Spec list from attributes */}
          {specs.length > 0 && (
            <div className="mt-5">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Specifications</h3>
              <dl className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                {specs.map(([k, v]) => (
                  <div key={k} className="flex px-3 py-2 text-sm">
                    <dt className="w-2/5 text-gray-500">{humanize(k)}</dt>
                    <dd className="w-3/5 text-gray-800 break-words">
                      {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={onDelete}
              className="px-4 py-2 text-sm font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
            >
              Delete
            </button>
            <button
              onClick={onEdit}
              className="px-4 py-2 text-sm font-semibold text-white rounded-lg"
              style={{ backgroundColor: FG }}
            >
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* full lightbox */}
      {lightbox &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-6 cursor-zoom-out"
            onClick={() => setLightbox(false)}
          >
            <img
              src={item.photo_url}
              alt=""
              className="max-w-full max-h-full rounded-lg shadow-2xl"
              onClick={e => e.stopPropagation()}
            />
          </div>,
          document.body,
        )}
    </div>,
    document.body,
  )
}

// ---- add / edit form ------------------------------------------------------

function SelectionForm({ row, vendors, categories, onClose, onSaved }) {
  const isEdit = !!row
  const [name, setName] = useState(row?.name || '')
  const [category, setCategory] = useState(row?.category || '')
  const [subCategory, setSubCategory] = useState(row?.sub_category || '')
  const [vendorId, setVendorId] = useState(row?.vendor_id || '')
  const [unit, setUnit] = useState(row?.unit || '')
  const [price, setPrice] = useState(row?.price ?? '')
  const [sku, setSku] = useState(row?.sku || '')
  const [description, setDescription] = useState(row?.description || '')
  const [photoUrl, setPhotoUrl] = useState(row?.photo_url || '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  // Attributes as an editable list of {key, value} rows.
  const [attrRows, setAttrRows] = useState(() => {
    const a = row?.attributes
    if (a && typeof a === 'object' && !Array.isArray(a)) {
      return Object.entries(a).map(([k, v]) => ({
        key: k,
        value: typeof v === 'object' ? JSON.stringify(v) : String(v),
      }))
    }
    return []
  })

  function setAttr(i, field, val) {
    setAttrRows(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }
  function addAttr() { setAttrRows(rows => [...rows, { key: '', value: '' }]) }
  function removeAttr(i) { setAttrRows(rows => rows.filter((_, idx) => idx !== i)) }

  async function handleFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setUploading(true)
    const url = await uploadPhoto(f)
    setUploading(false)
    if (url) setPhotoUrl(url)
    e.target.value = ''
  }

  async function handleSave() {
    setErr('')
    if (!name.trim()) { setErr('Name is required.'); return }
    setSaving(true)

    // Assemble attributes jsonb from non-empty keys.
    const attributes = {}
    for (const r of attrRows) {
      const k = r.key.trim()
      if (k) attributes[k] = r.value
    }

    const payload = {
      name: name.trim(),
      category: category.trim() || null,
      sub_category: subCategory.trim() || null,
      vendor_id: vendorId || null,
      unit: unit.trim() || null,
      price: price === '' ? null : Number(price),
      sku: sku.trim() || null,
      description: description.trim() || null,
      photo_url: photoUrl || null,
      attributes: Object.keys(attributes).length ? attributes : {},
    }

    let error
    if (isEdit) {
      ({ error } = await supabase.from('selections').update(payload).eq('id', row.id))
    } else {
      // source 'manual' on create; never send tenant_id (set by trigger).
      ({ error } = await supabase.from('selections').insert({ ...payload, source: 'manual' }))
    }
    setSaving(false)
    if (error) { setErr(error.message); return }
    onSaved()
  }

  const inputCls =
    'w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700/30 focus:border-green-700'

  return createPortal(
    <div className="fixed inset-0 z-[9998] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-base font-bold text-gray-800">{isEdit ? 'Edit Selection' : 'New Selection'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>

        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="e.g. Japanese Maple" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Category</label>
              <input
                value={category}
                onChange={e => setCategory(e.target.value)}
                className={inputCls}
                list="selection-categories"
                placeholder="e.g. Plants"
              />
              <datalist id="selection-categories">
                {categories.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Sub category</label>
              <input value={subCategory} onChange={e => setSubCategory(e.target.value)} className={inputCls} placeholder="e.g. Trees" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Vendor</label>
            <VendorCombo vendors={vendors} value={vendorId} onChange={setVendorId} allowNone placeholder="Search vendor…" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Unit</label>
              <input value={unit} onChange={e => setUnit(e.target.value)} className={inputCls} placeholder="ea" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Price</label>
              <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className={inputCls} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">SKU</label>
              <input value={sku} onChange={e => setSku(e.target.value)} className={inputCls} placeholder="—" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className={inputCls} />
          </div>

          {/* Photo */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Photo</label>
            <div className="flex items-center gap-3">
              <div className="w-20 h-20 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                {photoUrl ? (
                  <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl text-gray-300">{categoryGlyph(category)}</span>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-green-700 border border-green-200 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-green-50 text-center">
                  {uploading ? 'Uploading…' : photoUrl ? 'Replace photo' : 'Upload photo'}
                  <input type="file" accept="image/*" onChange={handleFile} className="hidden" disabled={uploading} />
                </label>
                {photoUrl && (
                  <button onClick={() => setPhotoUrl('')} className="text-xs text-red-500 hover:underline">Remove</button>
                )}
              </div>
            </div>
          </div>

          {/* Attributes */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-500">Attributes / Specs</label>
              <button onClick={addAttr} className="text-xs font-semibold text-green-700 hover:underline">+ Add row</button>
            </div>
            {attrRows.length === 0 ? (
              <p className="text-xs text-gray-400">No attributes. Add rows like “Sun exposure” → “Full sun”.</p>
            ) : (
              <div className="space-y-1.5">
                {attrRows.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={r.key}
                      onChange={e => setAttr(i, 'key', e.target.value)}
                      placeholder="Key (e.g. sun_exposure)"
                      className={inputCls + ' flex-1'}
                    />
                    <input
                      value={r.value}
                      onChange={e => setAttr(i, 'value', e.target.value)}
                      placeholder="Value"
                      className={inputCls + ' flex-1'}
                    />
                    <button onClick={() => removeAttr(i)} className="text-gray-400 hover:text-red-500 px-1">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {err && <p className="text-sm text-red-600">{err}</p>}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200 sticky bottom-0 bg-white rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60"
            style={{ backgroundColor: FG }}
          >
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
