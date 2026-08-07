import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import MaterialDetailModal from '../components/MaterialDetailModal'

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
  const [view, setView] = useState('standard') // 'standard' | 'vendor'
  const [materials, setMaterials] = useState([])
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [cat, setCat] = useState('All')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState(null) // { priceId|null, materialId, vendorId, value }
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState(null) // row shown in the detail modal
  const [sort, setSort] = useState({ key: 'description', dir: 'asc' })
  const toggleSort = key =>
    setSort(s => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))

  const load = useCallback(async () => {
    setLoading(true)
    const [matRes, venRes] = await Promise.all([
      supabase
        .from('material')
        .select(
          `id, description, unit, is_default, collection, category_id, subcategory_id,
           category:category_id ( code, name ),
           subcategory:subcategory_id ( code, name ),
           prices:material_price ( id, price, vendor_id, effective_end )`
        )
        .order('description'),
      supabase.from('subs_vendors').select('id, company_name'),
    ])
    setMaterials(matRes.data || [])
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
    materials.filter(match).forEach(m => {
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
        opens
          .filter(p => p.vendor_id && p.vendor_id !== standardVendorId)
          .forEach(p =>
            out.push({
              key: p.id,
              m,
              priceId: p.id,
              vendorId: p.vendor_id,
              price: p.price,
              code: codeFor(m, vendorName(p.vendor_id)),
              vName: vendorName(p.vendor_id),
            })
          )
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

  // ── Save a price (update the open row, or insert one for Standard) ─────────
  const savePrice = async r => {
    setSaving(true)
    const val = n(editing.value)
    if (r.priceId) {
      await supabase.from('material_price').update({ price: val }).eq('id', r.priceId)
    } else if (r.vendorId) {
      await supabase.from('material_price').insert({
        material_id: r.m.id,
        vendor_id: r.vendorId,
        price: val,
        source: 'manual',
      })
    }
    setEditing(null)
    setSaving(false)
    load()
  }

  const setDefault = async m => {
    if (!m.subcategory_id) return
    // Only one default per sub-category: clear the sub-category, then set this one.
    await supabase.from('material').update({ is_default: false }).eq('subcategory_id', m.subcategory_id)
    await supabase.from('material').update({ is_default: true }).eq('id', m.id)
    load()
  }

  const isVendorView = view === 'vendor'

  return (
    <div className="mt-3">
      {/* View toggle */}
      <div className="mb-3">
        <div className="flex justify-center items-center gap-2">
          {[
            { k: 'vendor', l: 'Vendor' },
            { k: 'standard', l: 'Standard' },
          ].map(t => (
            <button
              key={t.k}
              onClick={() => setView(t.k)}
              className={`px-8 py-2.5 text-sm font-semibold rounded-lg border transition-colors ${
                view === t.k
                  ? 'bg-green-700 text-white border-green-700'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {t.l}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 text-center mt-1">
          {view === 'standard'
            ? 'One row per product, at the Standard price.'
            : 'One row per vendor-specific price.'}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-3 py-2 bg-gray-50 border-b border-gray-200">
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
          <span className="ml-auto text-xs text-gray-400">{rows.length} items</span>
        </div>

        <div className="overflow-auto max-h-[calc(100vh-16rem)]">
          <table className="w-full text-xs min-w-[820px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-gray-600 uppercase">
                <Th k="code" sort={sort} onSort={toggleSort}>Code</Th>
                {isVendorView && <Th k="vendor" sort={sort} onSort={toggleSort}>Vendor</Th>}
                <Th k="category" sort={sort} onSort={toggleSort}>Category</Th>
                <Th k="subcat" sort={sort} onSort={toggleSort}>Sub-Category</Th>
                <Th k="description" sort={sort} onSort={toggleSort}>Description</Th>
                <Th k="unit" sort={sort} onSort={toggleSort}>Unit</Th>
                <Th k="price" sort={sort} onSort={toggleSort} align="right">Price</Th>
                {!isVendorView && <th className="px-3 py-2 font-semibold text-center">Default</th>}
                <th className="px-3 py-2 w-20" />
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
                  const isEd = editing && editing.key === r.key
                  return (
                    <tr key={r.key} className="hover:bg-gray-50 group">
                      <td className="px-3 py-1.5 font-mono text-[11px] whitespace-nowrap">
                        <button
                          onClick={() => setDetail(r)}
                          className="text-green-700 hover:text-green-900 hover:underline"
                          title="View / edit product"
                        >
                          {r.code}
                        </button>
                      </td>
                      {isVendorView && (
                        <td className="px-3 py-1.5 text-gray-700 whitespace-nowrap">{r.vName}</td>
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
                      <td className="px-3 py-1.5 text-gray-500 whitespace-nowrap">{r.m.unit || '—'}</td>
                      <td className="px-3 py-1.5 text-right whitespace-nowrap">
                        {isEd ? (
                          <input
                            autoFocus
                            type="number"
                            step="0.01"
                            className="w-24 border border-green-300 rounded-md px-2 py-1 text-xs text-right"
                            value={editing.value}
                            onChange={e => setEditing({ ...editing, value: e.target.value })}
                            onKeyDown={e => {
                              if (e.key === 'Enter') savePrice(r)
                              if (e.key === 'Escape') setEditing(null)
                            }}
                          />
                        ) : (
                          <span className={r.price == null ? 'text-gray-300' : 'text-gray-800 font-semibold'}>
                            {money(r.price)}
                          </span>
                        )}
                      </td>
                      {!isVendorView && (
                        <td className="px-3 py-1.5 text-center">
                          <button
                            title={r.m.is_default ? 'Default for its sub-category' : 'Set as sub-category default'}
                            onClick={() => setDefault(r.m)}
                            className={r.m.is_default ? 'text-amber-500' : 'text-gray-300 hover:text-amber-400'}
                          >
                            ★
                          </button>
                        </td>
                      )}
                      <td className="px-3 py-1.5 text-right whitespace-nowrap">
                        {isEd ? (
                          <>
                            <button
                              onClick={() => savePrice(r)}
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
                          <button
                            onClick={() => setEditing({ key: r.key, value: r.price ?? '' })}
                            className="text-gray-500 hover:text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            {r.price == null ? 'Set price' : 'Edit'}
                          </button>
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

      {detail && (
        <MaterialDetailModal
          row={detail}
          onClose={() => setDetail(null)}
          onSaved={load}
          onDeleted={load}
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
