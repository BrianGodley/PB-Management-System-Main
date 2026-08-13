import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'

// ─────────────────────────────────────────────────────────────────────────────
// TaxonomyDetailModal — view / edit / add / delete a Category or Sub-Category,
// opened from the name hyperlink (mirrors MaterialDetailModal). Delete first
// reassigns every connected sub-category / material to a chosen target so no
// item is orphaned.  kind = 'category' | 'subcategory'.  row = null → add mode.
// ─────────────────────────────────────────────────────────────────────────────

const SCOPE_TABLES = {
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

export default function TaxonomyDetailModal({
  kind = 'category',
  scope = 'material',
  row = null,
  cats = [],
  subs = [],
  vendors = [],
  materials = [],
  onClose,
  onChanged,
}) {
  const cfg = SCOPE_TABLES[scope] || SCOPE_TABLES.material
  const isCat = kind === 'category'
  const adding = !row
  const [mode, setMode] = useState(adding ? 'edit' : 'view')
  const [busy, setBusy] = useState(false)
  const [del, setDel] = useState(false) // delete/reassign overlay
  const [targetId, setTargetId] = useState('')
  const [form, setForm] = useState(
    adding
      ? { category_id: cats[0]?.id || '', code: '', name: '', default_vendor_id: '' }
      : { ...row }
  )
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const catName = id => cats.find(c => c.id === id)?.name || '—'
  const vendName = id => vendors.find(v => v.id === id)?.company_name || 'Standard'
  const itemCount = row ? materials.filter(m => (isCat ? m.category_id : m.subcategory_id) === row.id).length : 0
  const subCnt = row && isCat ? subs.filter(s => s.category_id === row.id).length : 0
  const connected = itemCount > 0 || subCnt > 0

  const targets = useMemo(
    () => (isCat ? cats : subs).filter(t => !row || t.id !== row.id),
    [isCat, cats, subs, row]
  )

  const save = async () => {
    setBusy(true)
    const table = isCat ? cfg.catTable : cfg.subTable
    const payload = isCat
      ? { code: form.code, name: form.name }
      : {
          category_id: form.category_id,
          code: form.code,
          name: form.name,
          ...(cfg.hasVendor ? { default_vendor_id: form.default_vendor_id || null } : {}),
        }
    if (row) await supabase.from(table).update(payload).eq('id', row.id)
    else await supabase.from(table).insert(payload)
    setBusy(false)
    onChanged?.()
    onClose?.()
  }

  const doDelete = async () => {
    setBusy(true)
    if (isCat) {
      if (targetId) {
        await supabase.from(cfg.subTable).update({ category_id: targetId }).eq('category_id', row.id)
        if (cfg.hasMaterials)
          await supabase.from('material').update({ category_id: targetId }).eq('category_id', row.id)
      }
      await supabase.from(cfg.catTable).delete().eq('id', row.id)
    } else {
      const t = subs.find(s => s.id === targetId)
      if (t && cfg.hasMaterials) {
        await supabase
          .from('material')
          .update({ subcategory_id: t.id, category_id: t.category_id })
          .eq('subcategory_id', row.id)
      }
      await supabase.from(cfg.subTable).delete().eq('id', row.id)
    }
    setBusy(false)
    onChanged?.()
    onClose?.()
  }

  const title = isCat ? 'Category' : 'Sub-Category'

  return createPortal(
    <div className="fixed inset-0 z-[9998] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div>
            <p className="font-mono text-xs text-gray-500">{adding ? `New ${title}` : row.code}</p>
            <h3 className="text-sm font-bold text-gray-900">{adding ? '' : row.name}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-lg leading-none">
            ✕
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 text-sm">
          {mode === 'view' ? (
            <>
              {!isCat && <Field label="Category" value={catName(row.category_id)} />}
              <Field label="Code" value={row.code} />
              <Field label="Name" value={row.name} />
              {!isCat && cfg.hasVendor && <Field label="Default Vendor" value={row.default_vendor_id ? vendName(row.default_vendor_id) : 'Standard'} />}
              {cfg.hasMaterials && <Field label="Items" value={String(itemCount)} />}
              {isCat && <Field label="Sub-Categories" value={String(subCnt)} />}
            </>
          ) : (
            <>
              {!isCat && (
                <label className="block">
                  <span className="text-xs text-gray-500">Category</span>
                  <select
                    className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white"
                    value={form.category_id || ''}
                    onChange={e => setF('category_id', e.target.value)}
                  >
                    {cats.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div className="grid grid-cols-3 gap-3">
                <label className="block">
                  <span className="text-xs text-gray-500">Code</span>
                  <input
                    className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm"
                    value={form.code || ''}
                    onChange={e => setF('code', e.target.value.toUpperCase())}
                    placeholder="CODE"
                  />
                </label>
                <label className="block col-span-2">
                  <span className="text-xs text-gray-500">Name</span>
                  <input
                    className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm"
                    value={form.name || ''}
                    onChange={e => setF('name', e.target.value)}
                  />
                </label>
              </div>
              {!isCat && cfg.hasVendor && (
                <label className="block">
                  <span className="text-xs text-gray-500">Default Vendor</span>
                  <select
                    className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white"
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
                </label>
              )}
            </>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          {mode === 'view' ? (
            <>
              <button onClick={() => setDel(true)} className="text-sm text-red-600 hover:text-red-800 font-medium">
                Delete
              </button>
              <div className="flex gap-2">
                <button onClick={onClose} className="text-sm text-gray-500 px-3 py-1.5">
                  Close
                </button>
                <button onClick={() => setMode('edit')} className="text-sm bg-green-700 text-white px-4 py-1.5 rounded-lg font-semibold">
                  Edit
                </button>
              </div>
            </>
          ) : (
            <>
              <button onClick={adding ? onClose : () => setMode('view')} className="text-sm text-gray-500 px-3 py-1.5">
                Cancel
              </button>
              <button
                onClick={save}
                disabled={busy || !form.name?.trim() || !form.code?.trim() || (!isCat && !form.category_id)}
                className="text-sm bg-green-700 text-white px-4 py-1.5 rounded-lg font-semibold disabled:opacity-50"
              >
                {busy ? 'Saving…' : adding ? 'Add' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>

      {del &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4" onClick={() => setDel(false)}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
              <h4 className="font-bold text-gray-900 mb-1">
                Delete {isCat ? 'category' : 'sub-category'} “{row.name}”?
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                {connected ? (
                  isCat ? (
                    <>
                      This category has <b>{subCnt}</b> sub-categor{subCnt === 1 ? 'y' : 'ies'} and <b>{itemCount}</b> item
                      {itemCount === 1 ? '' : 's'}. They’ll be moved to the category you pick.
                    </>
                  ) : (
                    <>
                      This sub-category has <b>{itemCount}</b> item{itemCount === 1 ? '' : 's'}. They’ll be moved to the
                      sub-category you pick.
                    </>
                  )
                ) : (
                  <>Nothing is connected to it — it can be removed directly.</>
                )}
              </p>
              {connected && (
                <label className="block mb-4">
                  <span className="text-xs text-gray-500">Reassign to {isCat ? 'category' : 'sub-category'}</span>
                  <select
                    className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white"
                    value={targetId}
                    onChange={e => setTargetId(e.target.value)}
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
                <button onClick={() => setDel(false)} className="text-sm text-gray-500 px-3 py-1.5">
                  Cancel
                </button>
                <button
                  onClick={doDelete}
                  disabled={busy || (connected && !targetId)}
                  className="text-sm bg-red-600 text-white px-4 py-1.5 rounded-lg font-semibold disabled:opacity-50"
                >
                  {busy ? 'Working…' : connected ? 'Reassign & Delete' : 'Delete'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>,
    document.body
  )
}

function Field({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-gray-100 pb-1.5">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm text-gray-900 text-right">{value || '—'}</span>
    </div>
  )
}
