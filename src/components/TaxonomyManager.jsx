import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import TaxonomyDetailModal from './TaxonomyDetailModal'

// ─────────────────────────────────────────────────────────────────────────────
// TaxonomyManager — Category or Sub-Category table (kind = 'category' |
// 'subcategory'). Mirrors the material table: the name is a hyperlink that opens
// a detail modal for editing / deleting (delete reassigns connected items).
//
// Categories table columns:   Code · Category · Sub-Categories · Items · Default Vendor
// Sub-Categories table cols:  Code · Sub Category · Category · Items · Default Vendor
// The Sub-Categories count (on Categories) and the Items count (both tables) are
// clickable and open a list modal.
//
// scope = 'material' (default) → category / subcategory tables, tied to the
//   material catalog (item counts, per-cat/sub default vendor).
// scope = 'general' | 'labor' | 'sub' → standalone lists, no material links/vendor.
// ─────────────────────────────────────────────────────────────────────────────

const SCOPES = {
  material: { catTable: 'category', subTable: 'subcategory', hasMaterials: true, hasVendor: true },
  general: {
    catTable: 'general_category',
    subTable: 'general_subcategory',
    hasMaterials: false,
    hasVendor: false,
  },
  labor: {
    catTable: 'labor_category',
    subTable: 'labor_subcategory',
    hasMaterials: false,
    hasVendor: false,
  },
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
  const [listModal, setListModal] = useState(null) // { title, items:[{label,code}] }
  const [q, setQ] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    // Both tables carry default_vendor_id in the material scope now.
    const catCols = cfg.hasVendor ? 'id, code, name, default_vendor_id' : 'id, code, name'
    const subCols = cfg.hasVendor
      ? 'id, code, name, category_id, default_vendor_id'
      : 'id, code, name, category_id'
    const [c, s, m, v] = await Promise.all([
      supabase.from(cfg.catTable).select(catCols).order('name'),
      supabase.from(cfg.subTable).select(subCols).order('name'),
      cfg.hasMaterials
        ? supabase.from('material').select('id, description, category_id, subcategory_id')
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

  const openSubList = row =>
    setListModal({
      title: `Sub-Categories · ${row.name}`,
      items: subs
        .filter(s => s.category_id === row.id)
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        .map(s => ({ label: s.name, code: s.code })),
    })
  const openItemsList = row =>
    setListModal({
      title: `Items · ${row.name}`,
      items: materials
        .filter(m => (isCat ? m.category_id : m.subcategory_id) === row.id)
        .sort((a, b) => (a.description || '').localeCompare(b.description || ''))
        .map(m => ({ label: m.description })),
    })

  const rows = isCat ? cats : subs
  // Code + (Category|Sub Category) + (Category on sub / Sub-Cats on cat) + Items + Vendor
  const colCount = 3 + (cfg.hasMaterials ? 1 : 0) + (cfg.hasVendor ? 1 : 0)

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
  // Text search over name + code + (sub-categories') parent category name.
  const visibleRows = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return sortedRows
    return sortedRows.filter(r =>
      [r.name, r.code, !isCat ? catName(r.category_id) : '']
        .filter(Boolean)
        .some(x => x.toLowerCase().includes(s))
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedRows, q, cats])

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
  // Clickable count cell (Sub-Categories / Items) — opens the list modal.
  const CountCell = ({ n, onClick }) => (
    <td className="px-3 py-1.5 text-center">
      {n > 0 ? (
        <button onClick={onClick} className="text-green-700 hover:text-green-900 hover:underline font-medium">
          {n}
        </button>
      ) : (
        <span className="text-gray-300">0</span>
      )}
    </td>
  )

  return (
    <div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-3 py-2 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 whitespace-nowrap">
            {isCat ? 'Categories' : 'Sub-Categories'}
          </h3>
          <input
            className="border border-gray-200 rounded-md px-2 py-1 text-xs w-56"
            placeholder={isCat ? 'Search name / code…' : 'Search name / code / category…'}
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          <button
            onClick={() => setModal({ row: null })}
            className="ml-auto text-sm text-green-700 font-semibold hover:underline whitespace-nowrap"
          >
            + Add {isCat ? 'Category' : 'Sub-Category'}
          </button>
          <span className="text-xs text-gray-400">{visibleRows.length}</span>
        </div>

        <div className="overflow-auto max-h-[calc(100vh-16rem)]">
          <table className="w-full text-xs min-w-[560px] table-fixed">
            {/* Shared column-width template so Categories + Sub-Categories line up
                and the Items count sits evenly between the 3rd column and Vendor. */}
            <colgroup>
              <col style={{ width: cfg.hasMaterials ? '12%' : '16%' }} />
              <col style={{ width: cfg.hasMaterials ? '30%' : '52%' }} />
              <col style={{ width: cfg.hasMaterials ? '22%' : '32%' }} />
              {cfg.hasMaterials && <col style={{ width: '16%' }} />}
              {cfg.hasVendor && <col style={{ width: '20%' }} />}
            </colgroup>
            <thead className="sticky top-0 z-10 bg-gray-50">
              <tr className="border-b border-gray-200 text-left text-gray-600 uppercase">
                <Th k="code" label="Code" align="center" />
                <Th k="name" label={isCat ? 'Category' : 'Sub Category'} />
                {isCat && <Th k="subcats" label="Sub-Categories" align="center" />}
                {!isCat && <Th k="category" label="Category" />}
                {cfg.hasMaterials && <Th k="items" label="Items" align="center" />}
                {cfg.hasVendor && <th className="px-3 py-2 font-semibold text-left">Vendor</th>}
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
                visibleRows.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-3 py-1.5 font-mono text-gray-500 text-center">{row.code}</td>
                    <td className="px-3 py-1.5">
                      <button
                        onClick={() => setModal({ row })}
                        className="text-green-700 hover:text-green-900 hover:underline font-medium"
                        title="View / edit"
                      >
                        {row.name}
                      </button>
                    </td>
                    {isCat && <CountCell n={subCount(row)} onClick={() => openSubList(row)} />}
                    {!isCat && <td className="px-3 py-1.5 text-gray-600">{catName(row.category_id)}</td>}
                    {cfg.hasMaterials && <CountCell n={itemCount(row)} onClick={() => openItemsList(row)} />}
                    {cfg.hasVendor && <td className="px-3 py-1.5 text-gray-600">Standard</td>}
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

      {listModal && <ListModal {...listModal} onClose={() => setListModal(null)} />}
    </div>
  )
}

// Simple read-only list popup for the Sub-Categories / Items counts.
function ListModal({ title, items, onClose }) {
  return createPortal(
    <div className="fixed inset-0 z-[9998] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          <span className="ml-auto mr-3 text-xs text-gray-400">{items.length}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-lg leading-none">
            ✕
          </button>
        </div>
        <div className="overflow-auto p-2">
          {items.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">None.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {items.map((it, i) => (
                <li key={i} className="px-3 py-1.5 text-sm text-gray-800 flex items-center gap-2">
                  {it.code && <span className="font-mono text-[11px] text-gray-400">{it.code}</span>}
                  <span>{it.label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
