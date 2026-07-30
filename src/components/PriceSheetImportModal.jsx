import { useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'

// ─────────────────────────────────────────────────────────────────────────────
// PriceSheetImportModal — upload a vendor price sheet, let Sam extract the line
// items, review the diff against the current Master Rates, then apply:
//   • matched items → update material_rates.unit_cost + write a price-history
//     period (closing the prior period at the effective date).
//   • new items → insert into material_rates (+ opening history period).
// Nothing is written until the admin clicks Apply (review-and-approve model).
// Requires: supabase-price-history-migration.sql + process-price-sheet fn.
// ─────────────────────────────────────────────────────────────────────────────

const norm = s =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

function dayBefore(isoDate) {
  const d = new Date(isoDate + 'T00:00:00')
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

const fmt = v => `$${(Number(v) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function PriceSheetImportModal({ vendors = [], onClose, onApplied }) {
  const today = new Date().toISOString().slice(0, 10)
  const [step, setStep] = useState('form') // form | review | done
  const [vendorId, setVendorId] = useState('')
  const [effectiveDate, setEffectiveDate] = useState(today)
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [rows, setRows] = useState([]) // { item, unit, unit_price, matchId, matchName, current, action, category }
  const [applied, setApplied] = useState({ updated: 0, added: 0, skipped: 0 })
  const [selected, setSelected] = useState(() => new Set())
  const [bulkCat, setBulkCat] = useState('')
  const [bulkSub, setBulkSub] = useState('')
  const [bulkUnit, setBulkUnit] = useState('')
  const [instructions, setInstructions] = useState('')
  const [search, setSearch] = useState('')

  const matchesSearch = r => {
    const q = norm(search)
    if (!q) return true
    return norm(`${r.item} ${r.notes || ''} ${r.matchName || ''} ${r.unit || ''}`).includes(q)
  }

  const toggleSel = i =>
    setSelected(s => {
      const n = new Set(s)
      n.has(i) ? n.delete(i) : n.add(i)
      return n
    })
  // Selection respects the current text filter — only visible rows are picked.
  const selectWhere = pred =>
    setSelected(new Set(rows.map((r, i) => (pred(r) && matchesSearch(r) ? i : -1)).filter(i => i >= 0)))
  const applyToSelected = patch =>
    setRows(rs => rs.map((r, i) => (selected.has(i) ? { ...r, ...patch } : r)))

  const vendorName = useMemo(
    () => vendors.find(v => v.id === vendorId)?.company_name || '',
    [vendors, vendorId]
  )

  async function extract() {
    setError('')
    if (!vendorId) return setError('Pick a vendor first.')
    if (!file) return setError('Choose a price-sheet file (PDF or image).')
    setBusy(true)
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_')
      const path = `${vendorId}/${Date.now()}-${safe}`
      const { error: upErr } = await supabase.storage.from('price-sheets').upload(path, file)
      if (upErr) throw new Error(`Upload failed: ${upErr.message}`)

      const { data, error: fnErr } = await supabase.functions.invoke('process-price-sheet', {
        body: { file_path: path, vendor_name: vendorName, effective_date: effectiveDate, instructions },
      })
      if (fnErr) throw new Error(fnErr.message || 'Extraction failed.')
      if (data?.error) throw new Error(data.error)
      const extracted = data?.rows || []
      if (!extracted.length) throw new Error('No priced line items were found on that sheet.')

      // Current materials for this vendor → match by normalized name.
      const { data: existing } = await supabase
        .from('material_rates')
        .select('id, name, category, sub_category, unit, unit_cost')
        .eq('vendor_id', vendorId)
      const byNorm = new Map((existing || []).map(m => [norm(m.name), m]))

      const merged = extracted.map(r => {
        const key = norm(`${r.item} ${r.notes || ''}`)
        const hit = byNorm.get(norm(r.item)) || byNorm.get(key) || null
        return {
          item: r.item,
          unit: r.unit || hit?.unit || 'each',
          unit_price: r.unit_price,
          notes: r.notes || '',
          matchId: hit?.id || null,
          matchName: hit?.name || '',
          current: hit ? Number(hit.unit_cost) : null,
          category: hit?.category || '',
          sub_category: hit?.sub_category || '',
          action: hit ? 'update' : 'skip', // unmatched default to skip until a category is set
        }
      })
      setRows(merged)
      setStep('review')
    } catch (e) {
      setError(String(e.message || e))
    } finally {
      setBusy(false)
    }
  }

  function setRow(i, patch) {
    setRows(rs => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  const counts = useMemo(() => {
    let updated = 0, added = 0, skipped = 0, changed = 0
    for (const r of rows) {
      if (r.action === 'update') {
        updated++
        if (r.current == null || Number(r.current) !== Number(r.unit_price)) changed++
      } else if (r.action === 'add') added++
      else skipped++
    }
    return { updated, added, skipped, changed }
  }, [rows])

  async function apply() {
    setError('')
    // New items must have a category (it's the estimate module the rate feeds).
    const badNew = rows.find(r => r.action === 'add' && !r.category.trim())
    if (badNew) return setError(`Set a Category for new item "${badNew.item}" (or set it to Skip).`)
    setBusy(true)
    try {
      const { data: imp, error: impErr } = await supabase
        .from('price_sheet_imports')
        .insert({
          vendor_id: vendorId,
          effective_date: effectiveDate,
          status: 'applied',
          line_count: rows.length,
        })
        .select()
        .single()
      if (impErr) throw new Error(`Could not record import: ${impErr.message}`)
      const importId = imp.id
      const startDate = effectiveDate
      const priorEnd = dayBefore(effectiveDate)
      let updated = 0, added = 0, skipped = 0

      for (const r of rows) {
        if (r.action === 'skip') { skipped++; continue }

        if (r.action === 'update' && r.matchId) {
          // Only write history/price when the price actually changed.
          if (r.current != null && Number(r.current) === Number(r.unit_price)) { updated++; continue }
          const { data: openRows } = await supabase
            .from('material_price_history')
            .select('id')
            .eq('material_rate_id', r.matchId)
            .is('effective_end', null)
          if (openRows && openRows.length) {
            await supabase
              .from('material_price_history')
              .update({ effective_end: priorEnd })
              .eq('material_rate_id', r.matchId)
              .is('effective_end', null)
          } else if (r.current != null) {
            // Seed the prior price so the timeline is complete for "as of" lookups.
            await supabase.from('material_price_history').insert({
              material_rate_id: r.matchId,
              vendor_id: vendorId,
              unit_cost: r.current,
              effective_start: '2000-01-01',
              effective_end: priorEnd,
              source: 'manual',
            })
          }
          await supabase.from('material_price_history').insert({
            material_rate_id: r.matchId,
            vendor_id: vendorId,
            unit_cost: r.unit_price,
            effective_start: startDate,
            source: 'price_sheet',
            import_id: importId,
          })
          await supabase.from('material_rates').update({ unit_cost: r.unit_price, unit: r.unit }).eq('id', r.matchId)
          updated++
        } else if (r.action === 'add') {
          const { data: nm, error: addErr } = await supabase
            .from('material_rates')
            .insert({
              name: r.item,
              category: r.category.trim(),
              sub_category: r.sub_category?.trim() || null,
              vendor_id: vendorId,
              unit: r.unit,
              unit_cost: r.unit_price,
            })
            .select()
            .single()
          if (addErr) throw new Error(`Add failed for "${r.item}": ${addErr.message}`)
          await supabase.from('material_price_history').insert({
            material_rate_id: nm.id,
            vendor_id: vendorId,
            unit_cost: r.unit_price,
            effective_start: startDate,
            source: 'price_sheet',
            import_id: importId,
          })
          added++
        }
      }
      setApplied({ updated, added, skipped })
      setStep('done')
      onApplied?.()
    } catch (e) {
      setError(String(e.message || e))
    } finally {
      setBusy(false)
    }
  }

  // Accept vendors whether or not a `type` field was loaded (defensive).
  const vendorList = (vendors || []).filter(v => !v.type || v.type === 'vendor')

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl my-8">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Import Price Sheet</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-lg leading-none">×</button>
        </div>

        {error && (
          <div className="mx-5 mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </div>
        )}

        {step === 'form' && (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Vendor</label>
                <select value={vendorId} onChange={e => setVendorId(e.target.value)} className="input w-full text-sm py-1.5">
                  <option value="">— Select vendor —</option>
                  {vendorList.map(v => (
                    <option key={v.id} value={v.id}>{v.company_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Effective date</label>
                <input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} className="input w-full text-sm py-1.5" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Price sheet (PDF or image)</label>
              <input
                type="file"
                accept="application/pdf,image/*"
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-gray-600 file:mr-3 file:rounded file:border-0 file:bg-green-50 file:px-3 file:py-1.5 file:text-green-700 file:font-semibold"
              />
              <p className="text-[11px] text-gray-400 mt-1">Sam reads the sheet and lists every priced item for your review. Nothing is saved until you approve.</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Instructions for Sam (optional)</label>
              <textarea
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                rows={3}
                placeholder="e.g. The pricing unit (per LF, per roll, per SF) is printed on the right side of the item-name cell — capture it as the unit for each line."
                className="input w-full text-sm py-1.5"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={onClose} className="text-sm text-gray-500 px-3 py-1.5">Cancel</button>
              <button
                onClick={extract}
                disabled={busy}
                className="text-sm bg-green-600 text-white font-semibold rounded px-4 py-1.5 disabled:opacity-50"
              >
                {busy ? 'Reading sheet…' : 'Extract & Review'}
              </button>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="p-5">
            <div className="flex flex-wrap items-center gap-3 mb-3 text-xs">
              <span className="font-semibold text-gray-700">{vendorName}</span>
              <span className="text-gray-400">effective {effectiveDate}</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Filter items…"
                className="border border-gray-200 rounded px-2 py-1 w-48"
              />
              <button onClick={extract} disabled={busy} className="text-gray-500 hover:underline disabled:opacity-40">
                {busy ? 'Re-reading…' : '↻ Re-extract'}
              </button>
              <span className="ml-auto text-gray-500">
                {counts.updated} update ({counts.changed} price change) · {counts.added} new · {counts.skipped} skip
              </span>
            </div>

            {/* Bulk toolbar — assign action/category/sub to many rows at once */}
            <div className="flex flex-wrap items-center gap-2 mb-2 text-xs bg-gray-50 border border-gray-200 rounded px-2 py-2">
              <span className="text-gray-500 font-medium">Bulk:</span>
              <button onClick={() => selectWhere(r => !r.matchId)} className="text-green-700 hover:underline">Select all new</button>
              <button onClick={() => selectWhere(r => !!r.matchId)} className="text-green-700 hover:underline">Select all matched</button>
              <button onClick={() => selectWhere(() => true)} className="text-green-700 hover:underline">Select all</button>
              <button onClick={() => setSelected(new Set())} className="text-gray-500 hover:underline">Clear</button>
              <span className="text-gray-400">{selected.size} selected</span>
              <span className="mx-1 h-4 w-px bg-gray-300" />
              <select
                disabled={!selected.size}
                onChange={e => { if (e.target.value) applyToSelected({ action: e.target.value }); e.target.value = '' }}
                className="border border-gray-200 rounded px-1.5 py-1 bg-white disabled:opacity-50"
              >
                <option value="">Set action…</option>
                <option value="update">Update</option>
                <option value="add">Add new</option>
                <option value="skip">Skip</option>
              </select>
              <input value={bulkCat} onChange={e => setBulkCat(e.target.value)} placeholder="Category" className="border border-gray-200 rounded px-1.5 py-1 w-36" />
              <button
                disabled={!selected.size}
                onClick={() => applyToSelected({ category: bulkCat })}
                className="text-green-700 font-semibold hover:underline disabled:opacity-40"
              >
                Apply category
              </button>
              <input value={bulkSub} onChange={e => setBulkSub(e.target.value)} placeholder="Sub category" className="border border-gray-200 rounded px-1.5 py-1 w-36" />
              <button
                disabled={!selected.size}
                onClick={() => applyToSelected({ sub_category: bulkSub })}
                className="text-green-700 font-semibold hover:underline disabled:opacity-40"
              >
                Apply sub
              </button>
              <input value={bulkUnit} onChange={e => setBulkUnit(e.target.value)} placeholder="Unit" list="ps-units" className="border border-gray-200 rounded px-1.5 py-1 w-24" />
              <button
                disabled={!selected.size}
                onClick={() => applyToSelected({ unit: bulkUnit })}
                className="text-green-700 font-semibold hover:underline disabled:opacity-40"
              >
                Apply unit
              </button>
              <datalist id="ps-units">
                {['each', 'roll', 'yard', 'CY', 'ton', 'LF', 'linear ft', 'SF', 'sqft', 'bag', 'pallet', 'gallon', 'box'].map(u => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </div>
            <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-[55vh]">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr className="text-left text-gray-700">
                    <th className="px-2 py-2 font-semibold w-8">
                      <input
                        type="checkbox"
                        checked={selected.size > 0 && selected.size === rows.length}
                        onChange={e => (e.target.checked ? selectWhere(() => true) : setSelected(new Set()))}
                      />
                    </th>
                    <th className="px-2 py-2 font-semibold">On sheet</th>
                    <th className="px-2 py-2 font-semibold">Unit</th>
                    <th className="px-2 py-2 font-semibold">Matches</th>
                    <th className="px-2 py-2 font-semibold text-right">Current</th>
                    <th className="px-2 py-2 font-semibold text-right">New</th>
                    <th className="px-2 py-2 font-semibold text-right">Δ</th>
                    <th className="px-2 py-2 font-semibold">Action</th>
                    <th className="px-2 py-2 font-semibold">Category / Sub (new)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((r, i) => {
                    if (!matchesSearch(r)) return null
                    const delta =
                      r.current != null && r.current !== 0
                        ? ((r.unit_price - r.current) / r.current) * 100
                        : null
                    return (
                      <tr key={i} className={selected.has(i) ? 'bg-green-50' : ''}>
                        <td className="px-2 py-1.5">
                          <input type="checkbox" checked={selected.has(i)} onChange={() => toggleSel(i)} />
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="font-medium text-gray-800">{r.item}</div>
                          {r.notes && <div className="text-gray-600">{r.notes}</div>}
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            value={r.unit || ''}
                            onChange={e => setRow(i, { unit: e.target.value })}
                            list="ps-units"
                            className="border border-gray-200 rounded px-1.5 py-1 w-24"
                          />
                        </td>
                        <td className="px-2 py-1.5 text-gray-800">{r.matchName || <span className="text-amber-600">— new item —</span>}</td>
                        <td className="px-2 py-1.5 text-right text-gray-700">{r.current != null ? fmt(r.current) : '—'}</td>
                        <td className="px-2 py-1.5 text-right font-semibold text-gray-800">{fmt(r.unit_price)}</td>
                        <td className={`px-2 py-1.5 text-right ${delta > 0 ? 'text-red-600' : delta < 0 ? 'text-green-600' : 'text-gray-400'}`}>
                          {delta == null ? '—' : `${delta > 0 ? '+' : ''}${delta.toFixed(0)}%`}
                        </td>
                        <td className="px-2 py-1.5">
                          <select value={r.action} onChange={e => setRow(i, { action: e.target.value })} className="border border-gray-200 rounded px-1.5 py-1 bg-white">
                            {r.matchId && <option value="update">Update</option>}
                            <option value="add">Add new</option>
                            <option value="skip">Skip</option>
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          {r.action === 'add' ? (
                            <div className="flex flex-col gap-1">
                              <input
                                value={r.category}
                                onChange={e => setRow(i, { category: e.target.value })}
                                placeholder="Category (e.g. Ground Treatments)"
                                className="border border-gray-200 rounded px-1.5 py-1 w-48"
                              />
                              <input
                                value={r.sub_category}
                                onChange={e => setRow(i, { sub_category: e.target.value })}
                                placeholder="Sub category (optional)"
                                className="border border-gray-200 rounded px-1.5 py-1 w-48"
                              />
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2 pt-3">
              <button onClick={() => setStep('form')} className="text-sm text-gray-500 px-3 py-1.5">Back</button>
              <button
                onClick={apply}
                disabled={busy}
                className="text-sm bg-green-600 text-white font-semibold rounded px-4 py-1.5 disabled:opacity-50"
              >
                {busy ? 'Applying…' : 'Apply changes'}
              </button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-700 mb-1 font-semibold">Price sheet applied</p>
            <p className="text-xs text-gray-500 mb-4">
              {applied.updated} updated · {applied.added} added · {applied.skipped} skipped. A price-history period was recorded for {vendorName} effective {effectiveDate}.
            </p>
            <button onClick={onClose} className="text-sm bg-gray-800 text-white font-semibold rounded px-4 py-1.5">Done</button>
          </div>
        )}
      </div>
    </div>
  )
}
