import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'

// Module → Category(s) mapping manager. Each estimator module owns one or more
// categories; the map drives the data-driven View Rates and the prompt to assign
// any unmapped category to a module. Categories are the shared namespace (see
// categorySync) so the picker lists the material `category` table.
export const MODULE_TYPES = [
  'Hand Demo',
  'Skid Steer Demo',
  'Mini Skid Steer Demo',
  'Concrete',
  'Drainage',
  'Utilities',
  'Irrigation',
  'Planting',
  'Artificial Turf',
  'Pavers',
  'Columns',
  'Ground Treatments',
  'Outdoor Kitchen',
  'Fire Pit',
  'Walls',
  'Finishes',
  'Steps',
  'Pool',
  'Lighting',
  'Weed Abatement',
]

export default function ModuleCategoryMap() {
  const [rows, setRows] = useState([])
  const [cats, setCats] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [mapRes, catRes] = await Promise.all([
      supabase.from('module_category_map').select('id, module_type, category_name'),
      supabase.from('category').select('name').order('name'),
    ])
    setRows(mapRes.data || [])
    setCats(Array.from(new Set((catRes.data || []).map(c => c.name).filter(Boolean))).sort())
    setLoading(false)
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const byModule = useMemo(() => {
    const m = {}
    MODULE_TYPES.forEach(mt => (m[mt] = []))
    rows.forEach(r => {
      ;(m[r.module_type] = m[r.module_type] || []).push(r)
    })
    return m
  }, [rows])

  // Categories not linked to ANY module — surfaced as a prompt to assign.
  const mappedCats = useMemo(() => new Set(rows.map(r => r.category_name)), [rows])
  const unmapped = useMemo(() => cats.filter(c => !mappedCats.has(c)), [cats, mappedCats])

  const addLink = async (moduleType, categoryName) => {
    if (!moduleType || !categoryName) return
    const { data } = await supabase
      .from('module_category_map')
      .insert({ module_type: moduleType, category_name: categoryName })
      .select('id, module_type, category_name')
    if (data && data[0]) setRows(p => [...p, data[0]])
  }
  const removeLink = async id => {
    await supabase.from('module_category_map').delete().eq('id', id)
    setRows(p => p.filter(r => r.id !== id))
  }

  if (loading) return <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>

  return (
    <div className="space-y-4">
      {unmapped.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <p className="font-semibold mb-1">
            {unmapped.length} categor{unmapped.length === 1 ? 'y is' : 'ies are'} not assigned to any module:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {unmapped.map(c => (
              <span key={c} className="px-2 py-0.5 rounded-full bg-white border border-amber-300 text-amber-700">
                {c}
              </span>
            ))}
          </div>
          <p className="mt-1 text-amber-600">Assign each below so its rates flow into a module's View Rates.</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs font-semibold text-gray-600 uppercase">
              <th className="px-3 py-2 w-48">Module</th>
              <th className="px-3 py-2">Categories</th>
              <th className="px-3 py-2 w-56">Add category</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {MODULE_TYPES.map(mt => {
              const links = byModule[mt] || []
              const linkedNames = new Set(links.map(l => l.category_name))
              const addable = cats.filter(c => !linkedNames.has(c))
              return (
                <tr key={mt} className="hover:bg-gray-50 align-top">
                  <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">{mt}</td>
                  <td className="px-3 py-2">
                    {links.length === 0 ? (
                      <span className="text-gray-300 italic text-xs">none</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {links
                          .slice()
                          .sort((a, b) => a.category_name.localeCompare(b.category_name))
                          .map(l => (
                            <span
                              key={l.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 text-xs"
                            >
                              {l.category_name}
                              <button
                                onClick={() => removeLink(l.id)}
                                className="text-green-500 hover:text-red-500 leading-none"
                                title="Remove"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value=""
                      onChange={e => {
                        addLink(mt, e.target.value)
                        e.target.value = ''
                      }}
                      className="w-full border border-gray-200 rounded-md px-2 py-1 text-xs bg-white"
                    >
                      <option value="">+ Add…</option>
                      {addable.map(c => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
