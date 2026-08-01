import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import VendorCatalogImportModal from './VendorCatalogImportModal'

// Vendors → Catalog tab: a table of every material that belongs to a vendor
// (imported from a product catalog), plus the "Import Catalog" entry point
// (top-right). Each row: vendor, a clickable photo thumbnail (opens a lightbox),
// item, category, unit, and price.

const fmt = v =>
  v == null ? '—' : `$${(Number(v) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function VendorCatalog({ vendors = [] }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showImport, setShowImport] = useState(false)
  const [lightbox, setLightbox] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('material_rates')
      .select('id, name, category, sub_category, unit, unit_cost, photo_url, vendor_id, subs_vendors(company_name)')
      .not('vendor_id', 'is', null)
      .order('name')
    const rows = (data || []).slice().sort((a, b) => {
      const av = a.subs_vendors?.company_name || ''
      const bv = b.subs_vendors?.company_name || ''
      const cmp = av.localeCompare(bv)
      return cmp !== 0 ? cmp : (a.name || '').localeCompare(b.name || '')
    })
    setItems(rows)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="flex-1 flex flex-col mt-3">
      {showImport && (
        <VendorCatalogImportModal
          vendors={vendors}
          onClose={() => setShowImport(false)}
          onImported={load}
        />
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-bold text-gray-700">Vendor Catalog</h3>
          <button
            onClick={() => setShowImport(true)}
            className="text-sm bg-green-600 text-white font-semibold rounded px-4 py-1.5 hover:bg-green-700"
          >
            Import Catalog
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase">
                <th className="px-3 py-2">Vendor</th>
                <th className="px-3 py-2 w-16">Photo</th>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Unit</th>
                <th className="px-3 py-2 text-right">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No catalog items yet. Click "Import Catalog" to add some.</td></tr>
              ) : (
                items.map(it => (
                  <tr key={it.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-800">{it.subs_vendors?.company_name || '—'}</td>
                    <td className="px-3 py-2">
                      {it.photo_url ? (
                        <img
                          src={it.photo_url}
                          alt=""
                          onClick={() => setLightbox(it.photo_url)}
                          className="w-12 h-12 object-cover rounded border border-gray-200 cursor-zoom-in"
                        />
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-800">
                      {it.name}
                      {it.sub_category && <span className="text-gray-400 font-normal"> · {it.sub_category}</span>}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{it.category || <span className="text-gray-300">—</span>}</td>
                    <td className="px-3 py-2 text-gray-600">{it.unit || <span className="text-gray-300">—</span>}</td>
                    <td className="px-3 py-2 text-right font-semibold text-gray-800">{fmt(it.unit_cost)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
