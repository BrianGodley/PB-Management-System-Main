import { useState, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import { setMaterialPrice, restoreMaterial } from '../lib/materialCatalog'
import MaterialDetailModal, { MoveMaterialModal, CopyMaterialModal } from '../components/MaterialDetailModal'
import TaxonomyManager from '../components/TaxonomyManager'
import CategorySyncBanner from '../components/CategorySyncBanner'
import ModuleCategoryMap from '../components/ModuleCategoryMap'
import { formatUnit } from '../lib/units'

// ─────────────────────────────────────────────────────────────────────────────
// Master Material Rates — the two-view catalog on the NEW pricing model
// (`material` product + `material_price` per product×vendor). Replaces the old
// material_rates-backed Master Rates tab under Vendors.
//
//   • Standard view — one row per product, showing its Standard price. No vendor
//     column (vendor is always Standard here).
//   • Vendor view   — one row per vendor-specific price, with a Vendor column.
//
// Identity code is generated on demand (never stored):
//   <CatCode>-<SubCode>-<STD|VendorCode>-<NNNN>   e.g. TURF-TMAT-STD-0005
// where NNNN is the product's stable index within its sub-category.
// ─────────────────────────────────────────────────────────────────────────────

const n = v => (v === '' || v == null ? null : parseFloat(v))
const money = v =>
  v == null ? '—' : `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const isStandardName = s => ['standard', 'unspecified'].includes((s || '').trim().toLowerCase())

// Short vendor code for the identity string (first 4 alphanumerics, upper).
const vendorCode = name =>
  isStandardName(name) ? 'STD' : (name || '').replace(/[^a-z0-9]/gi, '').slice(0, 4).toUpperCase() || 'VEN'

export default function MasterMaterialRates() {
  const [view, setView] = useState('vendor') // 'vendor' | 'standard' | 'misc' | 'cat' | 'sub' | 'archived'
  const [materials, setMaterials] = useState([])
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [cat, setCat] = useState('All')
  const [q, setQ] = useState('')
  const [detail, setDetail] = useState(null) // row shown in the detail modal
  const [adding, setAdding] = useState(null) // 'standard' | 'vendor' → AddMaterialModal
  const [sort, setSort] = useState({ key: 'description', dir: 'asc' })
  const toggleSort = key =>
    setSort(s => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))

  const load = useCallback(async () => {
    setLoading(true)
    // Page through `material` — PostgREST caps a single request at ~1000 rows, so
    // once the catalog exceeds 1000 products the newest/last-sorted rows would be
    // silently truncated (a just-added material would never appear). Fetch in
    // 1000-row blocks so every product shows.
    const PAGE = 1000
    const sel = `id, description, unit, is_default, collection, category_id, subcategory_id, archived_at,
           category:category_id ( code, name ),
           subcategory:subcategory_id ( code, name ),
           prices:material_price ( id, price, vendor_id, effective_end )`
    const [matData, venRes] = await Promise.all([
      (async () => {
        const all = []
        for (let from = 0; ; from += PAGE) {
          const { data, error } = await supabase
            .from('material')
            .select(sel)
            .order('description')
            .range(from, from + PAGE - 1)
          if (error) break
          all.push(...(data || []))
          if (!data || data.length < PAGE) break
        }
        return all
      })(),
      supabase.from('subs_vendors').select('id, company_name'),
    ])
    setMaterials(matData)
    setVendors(venRes.data || [])
    setLoading(false)
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const vendorName = useCallback(
    id => vendors.find(v => v.id === id)?.company_name || '—',
    [vendors]
  )
  const standardVendorId = useMemo(
    () => vendors.find(v => isStandardName(v.company_name))?.id || null,
    [vendors]
  )

  // Stable per-sub-category index → the NNNN in the identity code.
  const seqOf = useMemo(() => {
    const bySub = {}
    const map = {}
    ;[...materials]
      .sort((a, b) => (a.description || '').localeCompare(b.description || ''))
      .forEach(m => {
        const k = m.subcategory?.code || '?'
        bySub[k] = (bySub[k] || 0) + 1
        map[m.id] = String(bySub[k]).padStart(4, '0')
      })
    return map
  }, [materials])

  const codeFor = (m, vName) =>
    `${m.category?.code || '?'}-${m.subcategory?.code || '?'}-${vendorCode(vName)}-${seqOf[m.id] || '0000'}`

  const openPrices = m => (m.prices || []).filter(p => p.effective_end == null)

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(materials.map(m => m.category?.name).filter(Boolean))).sort()],
    [materials]
  )

  // ── Build display rows for the active view ────────────────────────────────
  const rows = useMemo(() => {
    const match = m =>
      (cat === 'All' || m.category?.name === cat) &&
      (!q ||
        [m.description, m.category?.name, m.subcategory?.name, m.collection]
          .filter(Boolean)
          .some(s => s.toLowerCase().includes(q.toLowerCase())))
    const out = []
    // Archived view — one row per soft-deleted product, regardless of price/vendor.
    if (view === 'archived') {
      materials
        .filter(m => m.archived_at != null)
        .filter(match)
        .forEach(m => {
          const sp = openPrices(m).find(p => p.vendor_id === standardVendorId)
          out.push({
            key: m.id,
            m,
            priceId: sp?.id ?? null,
            vendorId: standardVendorId,
            price: sp?.price ?? null,
            code: codeFor(m, 'Standard'),
            archived: true,
          })
        })
      return out
    }
    // Normal views exclude archived products.
    materials.filter(m => !m.archived_at).filter(match).forEach(m => {
      const opens = openPrices(m)
      if (view === 'standard') {
        const sp = opens.find(p => p.vendor_id === standardVendorId)
        if (!sp) return // only list products that actually have a Standard price
        out.push({
          key: m.id,
          m,
          priceId: sp.id,
          vendorId: standardVendorId,
          price: sp.price ?? null,
          code: codeFor(m, 'Standard'),
        })
      } else {
        const vendorPrices = opens.filter(p => p.vendor_id && p.vendor_id !== standardVendorId)
        vendorPrices.forEach(p =>
          out.push({
            key: p.id,
            m,
            priceId: p.id,
            vendorId: p.vendor_id,
            price: p.price,
            code: codeFor(m, vendorName(p.vendor_id)),
            vName: vendorName(p.vendor_id),
            noPrice: p.price == null || p.price === '',
          })
        )
        // A product with no vendor price AND no usable Standard price — easy to
        // create with Add Material and the price left blank — is otherwise invisible.
        // Surface it once flagged "No price", tied to its existing (empty) price row
        // so clicking opens it ready to price.
        const hasUsablePrice = opens.some(p => p.price != null && p.price !== '')
        if (vendorPrices.length === 0 && !hasUsablePrice) {
          const std = opens.find(p => p.vendor_id === standardVendorId) || null
          out.push({
            key: m.id,
            m,
            priceId: std?.id ?? null,
            vendorId: std?.vendor_id ?? standardVendorId,
            price: null,
            code: codeFor(m, 'Standard'),
            vName: vendorName(standardVendorId) || 'Standard',
            noPrice: true,
          })
        }
      }
    })
    return out
  }, [materials, view, cat, q, standardVendorId, seqOf, vendorName])

  // ── Sorting ────────────────────────────────────────────────────────────────
  const sortVal = (r, key) => {
    switch (key) {
      case 'code': return r.code || ''
      case 'vendor': return r.vName || ''
      case 'category': return r.m.category?.name || ''
      case 'subcat': return r.m.subcategory?.name || ''
      case 'description': return r.m.description || ''
      case 'unit': return r.m.unit || ''
      case 'price': return r.price == null ? -Infinity : Number(r.price)
      default: return ''
    }
  }
  const sortedRows = useMemo(() => {
    const arr = [...rows]
    const { key, dir } = sort
    arr.sort((a, b) => {
      const av = sortVal(a, key)
      const bv = sortVal(b, key)
      let c
      if (typeof av === 'number' && typeof bv === 'number') c = av - bv
      else c = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' })
      return dir === 'asc' ? c : -c
    })
    return arr
  }, [rows, sort])

  const setDefault = async m => {
    if (!m.subcategory_id) return
    // Only one default per sub-category: clear the sub-category, then set this one.
    await supabase.from('material').update({ is_default: false }).eq('subcategory_id', m.subcategory_id)
    await supabase.from('material').update({ is_default: true }).eq('id', m.id)
    load()
  }

  const isVendorView = view === 'vendor'
  const isArchivedView = view === 'archived'

  const restore = async r => {
    await restoreMaterial(r.m.id)
    await load()
  }

  return (
    <div className="mt-3 flex-1 min-h-0 flex flex-col">
      {/* View toggle (frozen above the scrolling table) — white sub-tab bar to
          match Sales → Settings and the Labor / Subcontractor rate tables. */}
      <div className="flex border border-gray-200 bg-white px-6 flex-nowrap overflow-x-auto flex-shrink-0 rounded-xl mb-3">
        {[
          { k: 'vendor', l: 'Vendor' },
          { k: 'standard', l: 'Standard' },
          { k: 'misc', l: 'Misc' },
          { k: 'cat', l: 'Categories' },
          { k: 'sub', l: 'Sub-Categories' },
          { k: 'modmap', l: 'Module Mapping' },
          { k: 'archived', l: 'Archived' },
        ].map(t => (
          <button
            key={t.k}
            onClick={() => setView(t.k)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
              view === t.k
                ? 'border-green-700 text-green-800'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.l}
          </button>
        ))}
      </div>

      <CategorySyncBanner onSynced={load} />

      {view === 'misc' ? (
        <MiscRatesPanel />
      ) : view === 'cat' ? (
        // TaxonomyManager has its own scroll region — no extra overflow wrapper
        // (that caused a double scrollbar on the taller Sub-Categories list).
        <TaxonomyManager scope="material" kind="category" />
      ) : view === 'sub' ? (
        <TaxonomyManager scope="material" kind="subcategory" />
      ) : view === 'modmap' ? (
        <div className="flex-1 overflow-y-auto">
          <ModuleCategoryMap />
        </div>
      ) : (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="flex flex-wrap items-center gap-3 px-3 py-2 bg-gray-50 border-b border-gray-200 flex-shrink-0">
          <select
            className="border border-gray-200 rounded-md px-2 py-1 text-xs bg-white"
            value={cat}
            onChange={e => setCat(e.target.value)}
          >
            {categories.map(c => (
              <option key={c} value={c}>
                {c === 'All' ? 'All Categories' : c}
              </option>
            ))}
          </select>
          <input
            className="border border-gray-200 rounded-md px-2 py-1 text-xs w-56"
            placeholder="Search description / category…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          <div className="ml-auto flex items-center gap-2">
            {!isArchivedView && (
              <button
                onClick={() => setAdding(isVendorView ? 'vendor' : 'standard')}
                className="text-sm text-green-700 font-semibold hover:underline whitespace-nowrap"
              >
                + Add {isVendorView ? 'Vendor Material' : 'Standard Material'}
              </button>
            )}
            <span className="text-xs text-gray-400">{rows.length} items</span>
          </div>
        </div>

        <div className="overflow-auto flex-1 min-h-0">
          <table className="w-full text-xs min-w-[820px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-gray-600 uppercase">
                <Th k="code" sort={sort} onSort={toggleSort}>Code</Th>
                {!isArchivedView && <Th k="vendor" sort={sort} onSort={toggleSort}>Vendor</Th>}
                <Th k="category" sort={sort} onSort={toggleSort}>Category</Th>
                <Th k="subcat" sort={sort} onSort={toggleSort}>Sub-Category</Th>
                <Th k="description" sort={sort} onSort={toggleSort}>Description</Th>
                <Th k="unit" sort={sort} onSort={toggleSort}>Unit</Th>
                <Th k="price" sort={sort} onSort={toggleSort} align="right">Price</Th>
                <th className="px-3 py-2 w-36" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                    No items.
                  </td>
                </tr>
              ) : (
                sortedRows.map(r => {
                  return (
                    <tr
                      key={r.key}
                      onClick={() => setDetail(r)}
                      className="hover:bg-gray-50 group cursor-pointer"
                      title="View / edit product"
                    >
                      <td className="px-3 py-1.5 font-mono text-[11px] whitespace-nowrap">
                        <span className="text-green-700 group-hover:text-green-900 group-hover:underline">
                          {r.code}
                        </span>
                      </td>
                      {!isArchivedView && (
                        <td className="px-3 py-1.5 text-gray-700 whitespace-nowrap">
                          {isVendorView ? r.vName : 'Standard'}
                        </td>
                      )}
                      <td className="px-3 py-1.5 text-gray-600 whitespace-nowrap">
                        {r.m.category?.name || '—'}
                      </td>
                      <td className="px-3 py-1.5 text-gray-600 whitespace-nowrap">
                        {r.m.subcategory?.name || '—'}
                      </td>
                      <td className="px-3 py-1.5 text-gray-900 font-medium">
                        {r.m.description}
                        {r.m.collection && (
                          <span className="ml-1.5 text-[10px] px-1 py-0.5 rounded bg-gray-100 text-gray-500">
                            {r.m.collection}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-gray-500 whitespace-nowrap">{r.m.unit ? formatUnit(r.m.unit) : '—'}</td>
                      <td className="px-3 py-1.5 text-right whitespace-nowrap">
                        {r.noPrice ? (
                          <span className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            No price
                          </span>
                        ) : (
                          <span className={r.price == null ? 'text-gray-300' : 'text-gray-800 font-semibold'}>
                            {money(r.price)}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-right whitespace-nowrap">
                        {isArchivedView ? (
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              restore(r)
                            }}
                            className="text-green-700 font-semibold hover:text-green-900"
                          >
                            Restore
                          </button>
                        ) : (
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] text-gray-400">
                            Edit ›
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {detail && (
        <MaterialDetailModal
          row={detail}
          onClose={() => setDetail(null)}
          onSaved={load}
          onDeleted={load}
        />
      )}

      {adding && (
        <AddMaterialModal
          mode={adding}
          vendors={vendors}
          onClose={() => setAdding(null)}
          onSaved={() => {
            setAdding(null)
            load()
          }}
        />
      )}

    </div>
  )
}

// ── Add Material modal ────────────────────────────────────────────────────────
// Creates a new `material` (category/sub-category/description/unit) plus an
// initial price. mode 'standard' → price on the Standard vendor; mode 'vendor'
// → price on a chosen vendor.
function AddMaterialModal({ mode, vendors, onClose, onSaved }) {
  const isVendor = mode === 'vendor'
  const [cats, setCats] = useState([])
  const [subs, setSubs] = useState([])
  const [catId, setCatId] = useState('')
  const [subId, setSubId] = useState('')
  const [description, setDescription] = useState('')
  const [unit, setUnit] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [price, setPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('category').select('id, name').order('name'),
      supabase.from('subcategory').select('id, name, category_id').order('name'),
    ]).then(([c, s]) => {
      setCats(c.data || [])
      setSubs(s.data || [])
    })
  }, [])

  const subOpts = subs.filter(s => s.category_id === catId)
  // Real vendors only (exclude Standard/Unspecified — that's the Standard button).
  const vendorOpts = (vendors || []).filter(v => !isStandardName(v.company_name))

  async function save() {
    setErr('')
    if (!description.trim()) return setErr('Description is required.')
    if (!catId) return setErr('Category is required.')
    if (!subId) return setErr('Sub-category is required.')
    if (isVendor && !vendorId) return setErr('Pick a vendor.')
    setSaving(true)
    const { data, error } = await supabase
      .from('material')
      .insert({
        description: description.trim(),
        category_id: catId,
        subcategory_id: subId,
        unit: unit.trim() || null,
      })
      .select('id')
      .single()
    if (error) {
      setErr(error.message)
      setSaving(false)
      return
    }
    if (price !== '' && price != null) {
      try {
        await setMaterialPrice(data.id, isVendor ? vendorId : null, Number(price))
      } catch (e) {
        setErr(e?.message || 'Price save failed.')
        setSaving(false)
        return
      }
    }
    setSaving(false)
    onSaved()
  }

  const inputCls =
    'w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700/30 focus:border-green-700'

  return createPortal(
    <div className="fixed inset-0 z-[9998] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h2 className="text-base font-bold text-gray-800">
            {isVendor ? 'Add Vendor Material' : 'Add Standard Material'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">
            ✕
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Category *</label>
              <select
                value={catId}
                onChange={e => {
                  setCatId(e.target.value)
                  setSubId('')
                }}
                className={inputCls}
              >
                <option value="">Select…</option>
                {cats.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Sub-Category *</label>
              <select value={subId} onChange={e => setSubId(e.target.value)} className={inputCls} disabled={!catId}>
                <option value="">Select…</option>
                {subOpts.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Description *</label>
            <input value={description} onChange={e => setDescription(e.target.value)} className={inputCls} placeholder="Product name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Unit</label>
              <input value={unit} onChange={e => setUnit(e.target.value)} className={inputCls} placeholder="Each / Sq Ft / Ln Ft…" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Price{isVendor ? '' : ' (Standard)'}
              </label>
              <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className={inputCls} placeholder="0.00" />
            </div>
          </div>
          {isVendor && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Vendor *</label>
              <select value={vendorId} onChange={e => setVendorId(e.target.value)} className={inputCls}>
                <option value="">Select vendor…</option>
                {vendorOpts.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.company_name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {err && <p className="text-xs text-red-600">{err}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 py-2 rounded-lg bg-green-700 text-white text-sm font-semibold hover:bg-green-800 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Add Material'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Misc rates tab ────────────────────────────────────────────────────────────
// Simple CRUD over the misc_rates table (name · rate · category). Misc values can
// be flat fees OR coefficients/markups, so the rate is shown as a plain number
// (no $) to avoid implying dollars.
const num4 = v => (v == null || v === '' ? '—' : Number(v).toLocaleString(undefined, { maximumFractionDigits: 4 }))

function MiscRatesPanel() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('All')
  const [editing, setEditing] = useState(null) // { id, value }
  const [saving, setSaving] = useState(false)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ category: '', name: '', rate: '' })
  const [moveCopy, setMoveCopy] = useState(null) // { source, mode:'move'|'copy' } → Move/Copy modal

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('misc_rates')
      .select('id, name, rate, category')
      .order('category')
      .order('name')
    setRows(data || [])
    setLoading(false)
  }, [])

  // Identity code per misc rate: MISC-<CAT>-NNNN, where NNNN is the row's stable
  // index within its category (sorted by name) — mirrors the Vendor/Standard code.
  const miscSeq = useMemo(() => {
    const byCat = {}
    const map = {}
    ;[...rows]
      .sort(
        (a, b) =>
          (a.category || '').localeCompare(b.category || '') || (a.name || '').localeCompare(b.name || '')
      )
      .forEach(r => {
        const k = r.category || 'GEN'
        byCat[k] = (byCat[k] || 0) + 1
        map[r.id] = String(byCat[k]).padStart(4, '0')
      })
    return map
  }, [rows])
  const miscCatCode = c => ((c || 'GEN').replace(/[^a-z0-9]/gi, '').slice(0, 4).toUpperCase() || 'GEN')
  const miscCodeFor = r => `MISC-${miscCatCode(r.category)}-${miscSeq[r.id] || '0000'}`
  useEffect(() => {
    load()
  }, [load])

  // Category dropdown options (mirrors the Vendor/Standard views' category filter).
  const categories = useMemo(
    () => ['All', ...Array.from(new Set(rows.map(r => r.category).filter(Boolean))).sort()],
    [rows]
  )

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return rows.filter(r => {
      if (cat !== 'All' && (r.category || '') !== cat) return false
      if (s && ![r.name, r.category].filter(Boolean).some(x => x.toLowerCase().includes(s))) return false
      return true
    })
  }, [rows, q, cat])

  const sortRows = arr =>
    [...arr].sort(
      (a, b) => (a.category || '').localeCompare(b.category || '') || (a.name || '').localeCompare(b.name || '')
    )

  const saveRate = async id => {
    setSaving(true)
    const val = n(editing.value)
    await supabase.from('misc_rates').update({ rate: val }).eq('id', id)
    setRows(rs => rs.map(r => (r.id === id ? { ...r, rate: val } : r)))
    setEditing(null)
    setSaving(false)
  }

  const addRow = async () => {
    if (!draft.name.trim()) return
    const payload = { name: draft.name.trim(), rate: n(draft.rate) ?? 0 }
    if (draft.category.trim()) payload.category = draft.category.trim()
    const { data, error } = await supabase
      .from('misc_rates')
      .insert(payload)
      .select('id, name, rate, category')
      .single()
    if (error) {
      alert('Add failed: ' + error.message)
      return
    }
    if (data) setRows(rs => sortRows([...rs, data]))
    setDraft({ category: '', name: '', rate: '' })
    setAdding(false)
  }

  const delRow = async id => {
    if (!confirm('Delete this misc rate?')) return
    await supabase.from('misc_rates').delete().eq('id', id)
    setRows(rs => rs.filter(r => r.id !== id))
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex-1 min-h-0 flex flex-col">
      <div className="flex flex-wrap items-center gap-3 px-3 py-2 bg-gray-50 border-b border-gray-200 flex-shrink-0">
        <select
          className="border border-gray-200 rounded-md px-2 py-1 text-xs bg-white"
          value={cat}
          onChange={e => setCat(e.target.value)}
        >
          {categories.map(c => (
            <option key={c} value={c}>
              {c === 'All' ? 'All Categories' : c}
            </option>
          ))}
        </select>
        <input
          className="border border-gray-200 rounded-md px-2 py-1 text-xs w-56"
          placeholder="Search name / category…"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setAdding(a => !a)}
            className="text-sm text-green-700 font-semibold hover:underline whitespace-nowrap"
          >
            {adding ? 'Cancel' : '+ Add Misc Material'}
          </button>
          <span className="text-xs text-gray-400">{filtered.length} items</span>
        </div>
      </div>

      <div className="overflow-auto flex-1 min-h-0">
        <table className="w-full text-xs min-w-[560px]">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-50 border-b border-gray-200 text-left text-gray-600 uppercase">
              <th className="px-3 py-2 font-semibold">Code</th>
              <th className="px-3 py-2 font-semibold">Category</th>
              <th className="px-3 py-2 font-semibold">Name</th>
              <th className="px-3 py-2 font-semibold text-right">Rate</th>
              <th className="px-3 py-2 w-36" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {adding && (
              <tr className="bg-green-50/40">
                <td className="px-3 py-1.5 text-gray-300 font-mono text-[11px]">—</td>
                <td className="px-3 py-1.5">
                  <input
                    className="w-28 border border-gray-300 rounded px-2 py-1 text-xs"
                    placeholder="Category"
                    value={draft.category}
                    onChange={e => setDraft({ ...draft, category: e.target.value })}
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    className="w-56 border border-gray-300 rounded px-2 py-1 text-xs"
                    placeholder="Name"
                    value={draft.name}
                    onChange={e => setDraft({ ...draft, name: e.target.value })}
                  />
                </td>
                <td className="px-3 py-1.5 text-right">
                  <input
                    type="number"
                    step="0.0001"
                    className="w-24 border border-gray-300 rounded px-2 py-1 text-xs text-right"
                    placeholder="0"
                    value={draft.rate}
                    onChange={e => setDraft({ ...draft, rate: e.target.value })}
                    onKeyDown={e => {
                      if (e.key === 'Enter') addRow()
                    }}
                  />
                </td>
                <td className="px-3 py-1.5 text-right">
                  <button onClick={addRow} className="text-green-700 font-semibold">
                    Save
                  </button>
                </td>
              </tr>
            )}
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No misc rates.
                </td>
              </tr>
            ) : (
              filtered.map(r => {
                const isEd = editing && editing.id === r.id
                return (
                  <tr key={r.id} className="hover:bg-gray-50 group">
                    <td className="px-3 py-1.5 font-mono text-[11px] text-gray-600 whitespace-nowrap">
                      {miscCodeFor(r)}
                    </td>
                    <td className="px-3 py-1.5 text-gray-600 whitespace-nowrap">{r.category || '—'}</td>
                    <td className="px-3 py-1.5 text-gray-900 font-medium">{r.name}</td>
                    <td className="px-3 py-1.5 text-right whitespace-nowrap">
                      {isEd ? (
                        <input
                          autoFocus
                          type="number"
                          step="0.0001"
                          className="w-24 border border-green-300 rounded-md px-2 py-1 text-xs text-right"
                          value={editing.value}
                          onChange={e => setEditing({ ...editing, value: e.target.value })}
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveRate(r.id)
                            if (e.key === 'Escape') setEditing(null)
                          }}
                        />
                      ) : (
                        <span className="text-gray-800 font-semibold">{num4(r.rate)}</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-right whitespace-nowrap">
                      {isEd ? (
                        <>
                          <button
                            onClick={() => saveRate(r.id)}
                            disabled={saving}
                            className="text-green-700 font-semibold mr-2"
                          >
                            Save
                          </button>
                          <button onClick={() => setEditing(null)} className="text-gray-400">
                            Cancel
                          </button>
                        </>
                      ) : (
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          <button
                            onClick={() => setEditing({ id: r.id, value: r.rate ?? '' })}
                            className="text-gray-500 hover:text-gray-800 mr-2"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() =>
                              setMoveCopy({
                                mode: 'move',
                                source: { kind: 'misc', miscId: r.id, name: r.name, rate: r.rate, category: r.category },
                              })
                            }
                            className="text-blue-600 hover:text-blue-800 mr-2"
                          >
                            Move
                          </button>
                          <button
                            onClick={() =>
                              setMoveCopy({
                                mode: 'copy',
                                source: { kind: 'misc', miscId: r.id, name: r.name, rate: r.rate, category: r.category },
                              })
                            }
                            className="text-blue-600 hover:text-blue-800 mr-2"
                          >
                            Copy
                          </button>
                          <button onClick={() => delRow(r.id)} className="text-red-400 hover:text-red-600">
                            Delete
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {moveCopy && moveCopy.mode === 'move' && (
        <MoveMaterialModal
          source={moveCopy.source}
          onClose={() => setMoveCopy(null)}
          onDone={() => {
            setMoveCopy(null)
            load()
          }}
        />
      )}
      {moveCopy && moveCopy.mode === 'copy' && (
        <CopyMaterialModal
          source={moveCopy.source}
          onClose={() => setMoveCopy(null)}
          onDone={() => {
            setMoveCopy(null)
            load()
          }}
        />
      )}
    </div>
  )
}

// Sortable header cell — click to sort, click again to flip direction.
function Th({ k, sort, onSort, align = 'left', children }) {
  const active = sort.key === k
  return (
    <th
      onClick={() => onSort(k)}
      className={`px-3 py-2 font-semibold cursor-pointer select-none hover:bg-gray-100 ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <span className={active ? 'text-gray-700' : 'text-gray-300'}>
          {active ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      </span>
    </th>
  )
}
