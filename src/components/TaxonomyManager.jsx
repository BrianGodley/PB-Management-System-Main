import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import TaxonomyDetailModal from './TaxonomyDetailModal'

// ─────────────────────────────────────────────────────────────────────────────
// TaxonomyManager — Category or Sub-Category table (kind = 'category' |
// 'subcategory'). Mirrors the material table: the name is a hyperlink that opens
// a detail modal for editing / deleting (delete reassigns connected items).
// ─────────────────────────────────────────────────────────────────────────────

export default function TaxonomyManager({ kind = 'category' }) {
  const isCat = kind === 'category'
  const [cats, setCats] = useState([])
  const [subs, setSubs] = useState([])
  const [materials, setMaterials] = useState([])
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // { row } | { row: null } (add)

  const load = useCallback(async () => {
    setLoading(true)
    const [c, s, m, v] = await Promise.all([
      supabase.from('category').select('id, code, name').order('name'),
      supabase.from('subcategory').select('id, code, name, category_id, default_vendor_id').order('name'),
      supabase.from('material').select('id, category_id, subcategory_id'),
      supabase.from('subs_vendors').select('id, company_name').order('company_name'),
    ])
    setCats(c.data || [])
    setSubs(s.data || [])
    setMaterials(m.data || [])
    setVendors(v.data || [])
    setLoading(false)
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const catName = id => cats.find(c => c.id === id)?.name || '—'
  const vendName = id => vendors.find(v => v.id === id)?.company_name || 'Standard'
  const itemCount = row =>
    materials.filter(m => (isCat ? m.category_id : m.subcategory_id) === row.id).length
  const subCount = row => (isCat ? subs.filter(s => s.category_id === row.id).length : 0)

  const rows = isCat ? cats : subs

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
                {!isCat && <th className="px-3 py-2 font-semibold">Category</th>}
                <th className="px-3 py-2 font-semibold">Code</th>
                <th className="px-3 py-2 font-semibold">Name</th>
                {!isCat && <th className="px-3 py-2 font-semibold">Default Vendor</th>}
                <th className="px-3 py-2 font-semibold text-right">Items</th>
                {isCat && <th className="px-3 py-2 font-semibold text-right">Sub-Cats</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : (
                rows.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    {!isCat && <td className="px-3 py-1.5 text-gray-600">{catName(row.category_id)}</td>}
                    <td className="px-3 py-1.5 font-mono text-gray-500">{row.code}</td>
                    <td className="px-3 py-1.5">
                      <button
                        onClick={() => setModal({ row })}
                        className="text-green-700 hover:text-green-900 hover:underline font-medium"
                        title="View / edit"
                      >
                        {row.name}
                      </button>
                    </td>
                    {!isCat && (
                      <td className="px-3 py-1.5 text-gray-600">
                        {row.default_vendor_id ? vendName(row.default_vendor_id) : 'Standard'}
                      </td>
                    )}
                    <td className="px-3 py-1.5 text-right text-gray-500">{itemCount(row)}</td>
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
