import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'

// ─────────────────────────────────────────────────────────────────────────────
// TaxonomyManager — list / add / edit / delete the Category or Sub-Category
// tables (kind = 'category' | 'subcategory'). Deleting either first opens a
// reassign modal so every connected sub-category / material is moved to a chosen
// target before the row is removed (no orphans).
// ─────────────────────────────────────────────────────────────────────────────

export default function TaxonomyManager({ kind = 'category' }) {
  const isCat = kind === 'category'
  const [cats, setCats] = useState([])
  const [subs, setSubs] = useState([])
  const [materials, setMaterials] = useState([]) // {id, category_id, subcategory_id}
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({})
  const [reassign, setReassign] = useState(null) // { row, targetId }
  const [busy, setBusy] = useState(false)

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
  const vendName = id => vendors.find(v => v.id === id)?.company_name || '—'

  // counts of connected items
  const itemCount = row =>
    isCat
      ? materials.filter(m => m.category_id === row.id).length
      : materials.filter(m => m.subcategory_id === row.id).length
  const subCount = row => (isCat ? subs.filter(s => s.category_id === row.id).length : 0)

  const rows = isCat ? cats : subs

  const startAdd = () => {
    setEditId(null)
    setAdding(true)
    setForm(isCat ? { code: '', name: '' } : { category_id: cats[0]?.id || '', code: '', name: '', default_vendor_id: '' })
  }
  const startEdit = row => {
    setAdding(false)
    setEditId(row.id)
    setForm({ ...row })
  }
  const cancel = () => {
    setAdding(false)
    setEditId(null)
    setForm({})
  }
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    setBusy(true)
    const table = isCat ? 'category' : 'subcategory'
    const payload = isCat
      ? { code: form.code, name: form.name }
      : {
          category_id: form.category_id,
          code: form.code,
          name: form.name,
          default_vendor_id: form.default_vendor_id || null,
        }
    if (editId) await supabase.from(table).update(payload).eq('id', editId)
    else await supabase.from(table).insert(payload)
    setBusy(false)
    cancel()
    load()
  }

  // ── Delete → reassign flow ────────────────────────────────────────────────
  const targets = useMemo(() => {
    if (!reassign) return []
    if (isCat) return cats.filter(c => c.id !== reassign.row.id)
    return subs.filter(s => s.id !== reassign.row.id)
  }, [reassign, cats, subs, isCat])

  const doDelete = async () => {
    setBusy(true)
    const { row, targetId } = reassign
    if (isCat) {
      // move sub-categories + materials to the target category, then delete
      if (targetId) {
        await supabase.from('subcategory').update({ category_id: targetId }).eq('category_id', row.id)
        await supabase.from('material').update({ category_id: targetId }).eq('category_id', row.id)
      }
      await supabase.from('category').delete().eq('id', row.id)
    } else {
      const target = subs.find(s => s.id === targetId)
      if (target) {
        await supabase
          .from('material')
          .update({ subcategory_id: target.id, category_id: target.category_id })
          .eq('subcategory_id', row.id)
      }
      await supabase.from('subcategory').delete().eq('id', row.id)
    }
    setBusy(false)
    setReassign(null)
    load()
  }

  const askDelete = row => {
    const items = itemCount(row)
    const nSub = subCount(row)
    if (items === 0 && nSub === 0) {
      // nothing connected — allow a straight delete via the same modal (no target needed)
      setReassign({ row, targetId: '' })
    } else {
      setReassign({ row, targetId: '' })
    }
  }

  return (
    <div className="mt-3">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700">
            {isCat ? 'Categories' : 'Sub-Categories'}
          </h3>
          <button
            onClick={startAdd}
            className="ml-auto text-sm text-green-700 font-semibold hover:underline"
          >
            + Add {isCat ? 'Category' : 'Sub-Category'}
          </button>
          <span className="text-xs text-gray-400">{rows.length}</span>
        </div>

        <div className="overflow-auto max-h-[calc(100vh-16rem)]">
          <table className="w-full text-xs min-w-[640px]">
            <thead className="sticky top-0 z-10 bg-gray-50">
              <tr className="border-b border-gray-200 text-left text-gray-600 uppercase">
                {!isCat && <th className="px-3 py-2 font-semibold">Category</th>}
                <th className="px-3 py-2 font-semibold">Code</th>
                <th className="px-3 py-2 font-semibold">Name</th>
                {!isCat && <th className="px-3 py-2 font-semibold">Default Vendor</th>}
                <th className="px-3 py-2 font-semibold text-right">Items</th>
                {isCat && <th className="px-3 py-2 font-semibold text-right">Sub-Cats</th>}
                <th className="px-3 py-2 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {adding && (
                <EditRow
                  isCat={isCat}
                  cats={cats}
                  vendors={vendors}
                  form={form}
                  setF={setF}
                  onSave={save}
                  onCancel={cancel}
                  busy={busy}
                />
              )}
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : (
                rows.map(row =>
                  editId === row.id ? (
                    <EditRow
                      key={row.id}
                      isCat={isCat}
                      cats={cats}
                      vendors={vendors}
                      form={form}
                      setF={setF}
                      onSave={save}
                      onCancel={cancel}
                      busy={busy}
                    />
                  ) : (
                    <tr key={row.id} className="hover:bg-gray-50 group">
                      {!isCat && (
                        <td className="px-3 py-1.5 text-gray-600">{catName(row.category_id)}</td>
                      )}
                      <td className="px-3 py-1.5 font-mono text-gray-500">{row.code}</td>
                      <td className="px-3 py-1.5 text-gray-900 font-medium">{row.name}</td>
                      {!isCat && (
                        <td className="px-3 py-1.5 text-gray-600">
                          {row.default_vendor_id ? vendName(row.default_vendor_id) : 'Standard'}
                        </td>
                      )}
                      <td className="px-3 py-1.5 text-right text-gray-500">{itemCount(row)}</td>
                      {isCat && (
                        <td className="px-3 py-1.5 text-right text-gray-500">{subCount(row)}</td>
                      )}
                      <td className="px-3 py-1.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => startEdit(row)}
                          className="text-gray-500 hover:text-gray-800 opacity-0 group-hover:opacity-100 mr-2"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => askDelete(row)}
                          className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100"
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
      </div>

      {reassign &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4"
            onClick={() => setReassign(null)}
          >
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
              <h4 className="font-bold text-gray-900 mb-1">
                Delete {isCat ? 'category' : 'sub-category'} “{reassign.row.name}”?
              </h4>
              {(() => {
                const items = itemCount(reassign.row)
                const nSub = subCount(reassign.row)
                const connected = items > 0 || nSub > 0
                return (
                  <>
                    <p className="text-sm text-gray-600 mb-3">
                      {connected ? (
                        <>
                          {isCat ? (
                            <>
                              This category has <b>{nSub}</b> sub-categor{nSub === 1 ? 'y' : 'ies'} and{' '}
                              <b>{items}</b> item{items === 1 ? '' : 's'}. They’ll be moved to the category
                              you pick.
                            </>
                          ) : (
                            <>
                              This sub-category has <b>{items}</b> item{items === 1 ? '' : 's'}. They’ll be
                              moved to the sub-category you pick.
                            </>
                          )}
                        </>
                      ) : (
                        <>Nothing is connected to it — it can be removed directly.</>
                      )}
                    </p>
                    {connected && (
                      <label className="block mb-4">
                        <span className="text-xs text-gray-500">
                          Reassign to {isCat ? 'category' : 'sub-category'}
                        </span>
                        <select
                          className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white"
                          value={reassign.targetId}
                          onChange={e => setReassign(r => ({ ...r, targetId: e.target.value }))}
                        >
                          <option value="">— select —</option>
                          {targets.map(t => (
                            <option key={t.id} value={t.id}>
                              {isCat ? t.name : `${catName(t.category_id)} › ${t.name}`}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setReassign(null)} className="text-sm text-gray-500 px-3 py-1.5">
                        Cancel
                      </button>
                      <button
                        onClick={doDelete}
                        disabled={busy || (connected && !reassign.targetId)}
                        className="text-sm bg-red-600 text-white px-4 py-1.5 rounded-lg font-semibold disabled:opacity-50"
                      >
                        {busy ? 'Working…' : connected ? 'Reassign & Delete' : 'Delete'}
                      </button>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}

function EditRow({ isCat, cats, vendors, form, setF, onSave, onCancel, busy }) {
  return (
    <tr className="bg-green-50">
      {!isCat && (
        <td className="px-3 py-1.5">
          <select
            className="w-full border border-gray-200 rounded-md px-2 py-1 text-xs bg-white"
            value={form.category_id || ''}
            onChange={e => setF('category_id', e.target.value)}
          >
            {cats.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </td>
      )}
      <td className="px-3 py-1.5">
        <input
          className="w-24 border border-gray-200 rounded-md px-2 py-1 text-xs"
          value={form.code || ''}
          placeholder="CODE"
          onChange={e => setF('code', e.target.value.toUpperCase())}
        />
      </td>
      <td className="px-3 py-1.5">
        <input
          className="w-full border border-gray-200 rounded-md px-2 py-1 text-xs"
          value={form.name || ''}
          placeholder="Name"
          onChange={e => setF('name', e.target.value)}
        />
      </td>
      {!isCat && (
        <td className="px-3 py-1.5">
          <select
            className="w-full border border-gray-200 rounded-md px-2 py-1 text-xs bg-white"
            value={form.default_vendor_id || ''}
            onChange={e => setF('default_vendor_id', e.target.value)}
          >
            <option value="">Standard</option>
            {vendors.map(v => (
              <option key={v.id} value={v.id}>
                {v.company_name}
              </option>
            ))}
          </select>
        </td>
      )}
      <td className="px-3 py-1.5 text-right text-gray-300">—</td>
      {isCat && <td className="px-3 py-1.5 text-right text-gray-300">—</td>}
      <td className="px-3 py-1.5 text-right whitespace-nowrap">
        <button
          onClick={onSave}
          disabled={busy || !form.name || !form.code}
          className="text-green-700 font-semibold mr-2 disabled:opacity-50"
        >
          Save
        </button>
        <button onClick={onCancel} className="text-gray-400">
          Cancel
        </button>
      </td>
    </tr>
  )
}
