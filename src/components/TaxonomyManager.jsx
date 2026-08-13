import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import TaxonomyDetailModal from './TaxonomyDetailModal'

// ─────────────────────────────────────────────────────────────────────────────
// TaxonomyManager — Category or Sub-Category table (kind = 'category' |
// 'subcategory'). Mirrors the material table: the name is a hyperlink that opens
// a detail modal for editing / deleting (delete reassigns connected items).
//
// scope = 'material' (default) → category / subcategory tables, tied to the
//   material catalog (item counts, per-subcat default vendor).
// scope = 'general'  → general_category / general_subcategory: standalone lists
//   with no material links or default vendor.
// ─────────────────────────────────────────────────────────────────────────────

const SCOPES = {
  material: { catTable: 'category', subTable: 'subcategory', hasMaterials: true, hasVendor: true },
  general: {
    catTable: 'general_category',
    subTable: 'general_subcategory',
    hasMaterials: false,
    hasVendor: false,
  },
  // In-house labor rate taxonomy (own lists, no material links / vendor).
  labor: {
    catTable: 'labor_category',
    subTable: 'labor_subcategory',
    hasMaterials: false,
    hasVendor: false,
  },
  // Subcontractor rate taxonomy (own lists).
  sub: {
    catTable: 'subcontractor_category',
    subTable: 'subcontractor_subcategory',
    hasMaterials: false,
    hasVendor: false,
  },
}

export default function TaxonomyManager({ kind = 'category', scope = 'material' }) {
  const cfg = SCOPES[scope] || SCOPES.material
  const isCat = kind === 'category'
  const [cats, setCats] = useState([])
  const [subs, setSubs] = useState([])
  const [materials, setMaterials] = useState([])
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // { row } | { row: null } (add)

  const load = useCallback(async () => {
    setLoading(true)
    const subCols = cfg.hasVendor
      ? 'id, code, name, category_id, default_vendor_id'
      : 'id, code, name, category_id'
    const [c, s, m, v] = await Promise.all([
      supabase.from(cfg.catTable).select('id, code, name').order('name'),
      supabase.from(cfg.subTable).select(subCols).order('name'),
      cfg.hasMaterials
        ? supabase.from('material').select('id, category_id, subcategory_id')
        : Promise.resolve({ data: [] }),
      cfg.hasVendor
        ? supabase.from('subs_vendors').select('id, company_name').order('company_name')
        : Promise.resolve({ data: [] }),
    ])
    setCats(c.data || [])
    setSubs(s.data || [])
    setMaterials(m.data || [])
    setVendors(v.data || [])
    setLoading(false)
  }, [cfg])
  useEffect(() => {
    load()
  }, [load])

  const catName = id => cats.find(c => c.id === id)?.name || '—'
  const vendName = id => vendors.find(v => v.id === id)?.company_name || 'Standard'
  const itemCount = row =>
    materials.filter(m => (isCat ? m.category_id : m.subcategory_id) === row.id).length
  const subCount = row => (isCat ? subs.filter(s => s.category_id === row.id).length : 0)

  const rows = isCat ? cats : subs
  const colCount = 2 + (isCat ? 1 : 1) + (cfg.hasMaterials ? 1 : 0) + (!isCat && cfg.hasVendor ? 1 : 0)

  // ── Sorting ────────────────────────────────────────────────────────────────
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const sortValue = (row, key) => {
    switch (key) {
      case 'category':
        return catName(row.category_id).toLowerCase()
      case 'code':
        return (row.code || '').toLowerCase()
      case 'name':
        return (row.name || '').toLowerCase()
      case 'vendor':
        return (row.default_vendor_id ? vendName(row.default_vendor_id) : 'Standard').toLowerCase()
      case 'items':
        return itemCount(row)
      case 'subcats':
        return subCount(row)
      default:
        return ''
    }
  }
  const sortedRows = useMemo(() => {
    const arr = [...rows]
    arr.sort((a, b) => {
      const av = sortValue(a, sortKey)
      const bv = sortValue(b, sortKey)
      let cmp
      if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv
      else cmp = String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sortKey, sortDir, cats, subs, materials, vendors])
  const toggleSort = key =>
    setSortKey(prev => {
      if (prev === key) {
        setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
        return prev
      }
      setSortDir('asc')
      return key
    })
  const arrow = key => (sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '')
  const Th = ({ k, label, align = 'left' }) => (
    <th
      className={`px-3 py-2 font-semibold cursor-pointer select-none hover:text-gray-800 text-${align}`}
      onClick={() => toggleSort(k)}
      title="Sort"
    >
      {label}
      {arrow(k)}
    </th>
  )

  return (
    <div className="mt-3">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700">{isCat ? 'Categories' : 'Sub-Categories'}</h3>
          <button
            onClick={() => setModal({ row: null })}
            className="ml-auto text-sm text-green-700 font-semibold hover:underline"
          >
            + Add {isCat ? 'Category' : 'Sub-Category'}
          </button>
          <span className="text-xs text-gray-400">{rows.length}</span>
        </div>

        <div className="overflow-auto max-h-[calc(100vh-16rem)]">
          <table className="w-full text-xs min-w-[560px]">
            <thead className="sticky top-0 z-10 bg-gray-50">
              <tr className="border-b border-gray-200 text-left text-gray-600 uppercase">
                <Th k="name" label={isCat ? 'Category' : 'Sub Category'} />
                <Th k="code" label="Code" />
                {!isCat && <Th k="category" label="Category" />}
                {!isCat && cfg.hasVendor && <Th k="vendor" label="Default Vendor" />}
                {cfg.hasMaterials && <Th k="items" label="Items" align="right" />}
                {isCat && <Th k="subcats" label="Sub-Cats" align="right" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={colCount} className="px-4 py-8 text-center text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : (
                sortedRows.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-3 py-1.5">
                      <button
                        onClick={() => setModal({ row })}
                        className="text-green-700 hover:text-green-900 hover:underline font-medium"
                        title="View / edit"
                      >
                        {row.name}
                      </button>
                    </td>
                    <td className="px-3 py-1.5 font-mono text-gray-500">{row.code}</td>
                    {!isCat && <td className="px-3 py-1.5 text-gray-600">{catName(row.category_id)}</td>}
                    {!isCat && cfg.hasVendor && (
                      <td className="px-3 py-1.5 text-gray-600">
                        {row.default_vendor_id ? vendName(row.default_vendor_id) : 'Standard'}
                      </td>
                    )}
                    {cfg.hasMaterials && (
                      <td className="px-3 py-1.5 text-right text-gray-500">{itemCount(row)}</td>
                    )}
                    {isCat && <td className="px-3 py-1.5 text-right text-gray-500">{subCount(row)}</td>}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <TaxonomyDetailModal
          kind={kind}
          scope={scope}
          row={modal.row}
          cats={cats}
          subs={subs}
          vendors={vendors}
          materials={materials}
          onClose={() => setModal(null)}
          onChanged={load}
        />
      )}
    </div>
  )
}
