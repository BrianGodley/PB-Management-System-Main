import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import VendorCombo from './VendorCombo'
import QuickAddVendorModal from './QuickAddVendorModal'

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
  const [applied, setApplied] = useState({ updated: 0, added: 0, unchanged: 0 })
  const [bulkCat, setBulkCat] = useState('')
  const [bulkSub, setBulkSub] = useState('')
  const [descInstr, setDescInstr] = useState('')
  const [instructions, setInstructions] = useState('')
  // Filter Items: draft inputs vs the applied filter (applied on Search click).
  const [filterDraft, setFilterDraft] = useState({ text: '', price: '', status: 'all' })
  const [filter, setFilter] = useState({ text: '', price: '', status: 'all' })
  // Rows the user pulled OUT of the current filter result (by index); they drop
  // from this batch and stay unaccounted. Cleared on each new Search.
  const [excluded, setExcluded] = useState(() => new Set())

  const matchesFilter = r => {
    const f = filter
    if (f.status === 'new' && r.matchId) return false
    if (f.status === 'matched' && !r.matchId) return false
    if (f.status === 'unaccounted' && r.reviewed) return false
    if (f.text) {
      const q = norm(f.text)
      if (!norm(`${r.item} ${r.notes || ''} ${r.matchName || ''} ${r.unit || ''}`).includes(q)) return false
    }
    if (f.price && String(f.price).trim()) {
      const p = String(f.price).trim()
      const inNew = String(r.unit_price ?? '').includes(p)
      const inCur = r.current != null && String(r.current).includes(p)
      if (!inNew && !inCur) return false
    }
    return true
  }
  // A row is in the current batch if it matches the filter and wasn't removed.
  const inBatch = (r, i) => matchesFilter(r) && !excluded.has(i)
  const applyToVisible = patch => setRows(rs => rs.map((r, i) => (inBatch(r, i) ? { ...r, ...patch } : r)))
  const applyToVisibleMatched = patch =>
    setRows(rs => rs.map((r, i) => (inBatch(r, i) && r.matchId ? { ...r, ...patch } : r)))
  const runSearch = () => { setFilter(filterDraft); setExcluded(new Set()) }

  const vendorName = useMemo(
    () => allVendors.find(v => v.id === vendorId)?.company_name || '',
    [allVendors, vendorId]
  )

  // Existing categories / sub-categories → dropdown suggestions (you can also
  // type a brand-new value directly into any category or sub-category box).
  const [catOptions, setCatOptions] = useState([])
  const [subOptions, setSubOptions] = useState([])
  useEffect(() => {
    supabase
      .from('material_rates')
      .select('category, sub_category')
      .then(({ data }) => {
        const cats = new Set(), subs = new Set()
        for (const r of data || []) {
          if (r.category) cats.add(r.category)
          if (r.sub_category) subs.add(r.sub_category)
        }
        setCatOptions([...cats].sort())
        setSubOptions([...subs].sort())
      })
  }, [])

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
          // Suggested action; the user must still confirm every item before
          // importing. matched+same price = unchanged, matched+different =
          // update, unmatched = add (new).
          action: hit ? (Number(hit.unit_cost) === Number(r.unit_price) ? 'unchanged' : 'update') : 'add',
          reviewed: false, // becomes true once the user accounts for the row
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
    let unchanged = 0, updated = 0, added = 0, accounted = 0
    for (const r of rows) {
      if (r.action === 'add') added++
      else if (r.action === 'update') updated++
      else unchanged++
      if (r.reviewed) accounted++
    }
    return { unchanged, updated, added, accounted, total: rows.length, remaining: rows.length - accounted }
  }, [rows])

  // Description custom change — Sam applies a plain-language rule to the rows
  // currently matching the filter (e.g. "the ones with Plastic → unit = roll").
  async function applyDescription() {
    if (!descInstr.trim()) return
    setError('')
    setBusy(true)
    try {
      const target = rows.filter((r, i) => inBatch(r, i))
      const { data, error: fnErr } = await supabase.functions.invoke('apply-price-edits', {
        body: {
          instruction: descInstr,
          rows: target.map(r => ({ item: r.item, unit: r.unit, unit_price: r.unit_price, notes: r.notes })),
        },
      })
      if (fnErr) throw new Error(fnErr.message || 'Edit failed.')
      if (data?.error) throw new Error(data.error)
      const editByItem = new Map((data?.rows || []).map(e => [norm(e.item), e]))
      setRows(rs =>
        rs.map((r, i) => {
          if (!inBatch(r, i)) return r
          const e = editByItem.get(norm(r.item))
          if (!e) return r
          const newPrice = e.unit_price != null ? Number(e.unit_price) : r.unit_price
          const changed = r.matchId && r.current != null && Number(newPrice) !== Number(r.current)
          return {
            ...r,
            unit: e.unit ?? r.unit,
            unit_price: newPrice,
            notes: e.notes ?? r.notes,
            action: changed ? 'update' : r.action,
          }
        })
      )
    } catch (e) {
      setError(String(e.message || e))
    } finally {
      setBusy(false)
    }
  }

  async function apply() {
    setError('')
    // New items must have a category (it's the estimate module the rate feeds).
    const badNew = rows.find(r => r.action === 'add' && !r.category.trim())
    if (badNew) return setError(`Set a Category for new item "${badNew.item}" (or set it to Leave Unchanged to skip it).`)
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
      let updated = 0, added = 0, unchanged = 0

      for (const r of rows) {
        if (r.action !== 'update' && r.action !== 'add') { unchanged++; continue }

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
      setApplied({ updated, added, unchanged })
      setStep('done')
      onApplied?.()
    } catch (e) {
      setError(String(e.message || e))
    } finally {
      setBusy(false)
    }
  }

  // Vendors created via the quick-add modal are appended locally so they show
  // in the picker immediately without a parent refresh.
  const [extraVendors, setExtraVendors] = useState([])
  const [showNewVendor, setShowNewVendor] = useState(false)
  const allVendors = [...(vendors || []), ...extraVendors]
  // Accept vendors whether or not a `type` field was loaded (defensive).
  const vendorList = allVendors.filter(v => !v.type || v.type === 'vendor')

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto">
      {showNewVendor && (
        <QuickAddVendorModal
          onClose={() => setShowNewVendor(false)}
          onCreated={v => { setExtraVendors(a => [...a, v]); setVendorId(v.id); setShowNewVendor(false) }}
        />
      )}
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs text-gray-500">Vendor</label>
                  <button type="button" onClick={() => setShowNewVendor(true)} className="text-xs text-green-700 font-semibold hover:underline">+ New vendor</button>
                </div>
                <VendorCombo vendors={vendorList} value={vendorId} onChange={setVendorId} placeholder="Search vendor…" />
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
            <div className="flex flex-wrap items-center gap-3 mb-2 text-xs">
              <span className="font-semibold text-gray-800">{vendorName}</span>
              <span className="text-gray-600">effective {effectiveDate}</span>
              <span className="ml-auto text-gray-700">
                {counts.unchanged} unchanged · {counts.updated} updated · {counts.added} new
              </span>
            </div>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
              <span className={`font-semibold ${counts.remaining === 0 ? 'text-green-700' : 'text-amber-700'}`}>
                {counts.accounted} of {counts.total} accounted for
                {counts.remaining > 0 ? ` · ${counts.remaining} still need review` : ' · ready to import'}
              </span>
              {counts.remaining > 0 && (
                <button
                  onClick={() => { setFilterDraft(f => ({ ...f, status: 'unaccounted' })); setFilter(f => ({ ...f, status: 'unaccounted' })) }}
                  className="text-amber-700 underline"
                >
                  show unaccounted
                </button>
              )}
            </div>
            <p className="text-[11px] text-gray-600 mb-2">Filter a group, then mark them (Leave Unchanged / Update). Repeat until every item is accounted for — then Import Pricing unlocks.</p>

            <div className="mb-3 border border-gray-200 rounded-lg overflow-hidden text-xs">
              {/* Step 1 — Filter Items */}
              <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
                <span className="font-bold text-gray-800">Step 1 · Filter Items</span>
                <span className="text-gray-600 ml-1">By Text</span>
                <input
                  value={filterDraft.text}
                  onChange={e => setFilterDraft(f => ({ ...f, text: e.target.value }))}
                  placeholder="e.g. cobble"
                  className="border border-gray-300 rounded px-2 py-1 w-36"
                />
                <span className="text-gray-600">By Price</span>
                <input
                  value={filterDraft.price}
                  onChange={e => setFilterDraft(f => ({ ...f, price: e.target.value }))}
                  placeholder="e.g. 300"
                  className="border border-gray-300 rounded px-2 py-1 w-24"
                />
                <span className="text-gray-600">By Status</span>
                <select
                  value={filterDraft.status}
                  onChange={e => setFilterDraft(f => ({ ...f, status: e.target.value }))}
                  className="border border-gray-300 rounded px-2 py-1 bg-white"
                >
                  <option value="all">All</option>
                  <option value="new">New</option>
                  <option value="matched">Matched</option>
                  <option value="unaccounted">Unaccounted</option>
                </select>
                <button onClick={runSearch} className="px-3 py-1 bg-gray-800 text-white rounded hover:bg-gray-900 font-semibold">Search</button>
                <button onClick={() => { setFilterDraft({ text: '', price: '', status: 'all' }); setFilter({ text: '', price: '', status: 'all' }); setExcluded(new Set()) }} className="text-gray-500 hover:underline">Clear</button>
                <span className="ml-auto font-bold text-green-700">{rows.filter((r, i) => inBatch(r, i)).length} in batch</span>
              </div>

              {/* Step 2 — change the filtered rows */}
              <div className="px-3 py-2 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-gray-800">Step 2 · Change filtered</span>
                  <button onClick={() => applyToVisible({ action: 'unchanged' })} className="px-2 py-1 border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-100">Leave Unchanged</button>
                  <button onClick={() => applyToVisibleMatched({ action: 'update' })} className="px-2 py-1 border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-100">Update pricing (all matches)</button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-gray-600 w-16">Unit</span>
                  <select
                    onChange={e => { if (e.target.value) applyToVisible({ unit: e.target.value }); e.target.value = '' }}
                    className="border border-gray-300 rounded px-2 py-1 bg-white"
                  >
                    <option value="">Change unit to…</option>
                    {['each', 'roll', 'yard', 'CY', 'ton', 'LF', 'linear ft', 'SF', 'sqft', 'bag', 'pallet', 'gallon', 'box'].map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-gray-600 w-16">Category</span>
                  <input value={bulkCat} onChange={e => setBulkCat(e.target.value)} list="ps-cats" placeholder="pick or type new…" className="border border-gray-300 rounded px-2 py-1 w-44" />
                  <button onClick={() => applyToVisible({ category: bulkCat })} className="px-2 py-1 bg-gray-800 text-white rounded hover:bg-gray-900">Apply →</button>
                  <span className="text-gray-600 ml-2">Sub Category</span>
                  <input value={bulkSub} onChange={e => setBulkSub(e.target.value)} list="ps-subs" placeholder="pick or type new…" className="border border-gray-300 rounded px-2 py-1 w-44" />
                  <button onClick={() => applyToVisible({ sub_category: bulkSub })} className="px-2 py-1 bg-gray-800 text-white rounded hover:bg-gray-900">Apply →</button>
                </div>
                <div className="flex flex-wrap items-start gap-2">
                  <span className="text-gray-600 w-16 pt-1">Description</span>
                  <textarea
                    value={descInstr}
                    onChange={e => setDescInstr(e.target.value)}
                    rows={2}
                    placeholder='Custom change for the filtered items, e.g. "the ones with Plastic in the name → set unit to roll"'
                    className="border border-gray-300 rounded px-2 py-1 flex-1 min-w-[16rem]"
                  />
                  <button onClick={applyDescription} disabled={busy} className="px-2 py-1 bg-gray-800 text-white rounded hover:bg-gray-900 disabled:opacity-40 mt-0.5">
                    {busy ? 'Applying…' : 'Apply →'}
                  </button>
                </div>
                {/* Step 3 — commit the batch as accounted for */}
                <div className="flex flex-wrap items-center gap-2 pt-2 mt-1 border-t border-gray-200">
                  <span className="font-bold text-gray-800">Step 3 · Commit</span>
                  <span className="text-gray-600">Mark these {rows.filter((r, i) => inBatch(r, i)).length} item(s) as accounted for.</span>
                  <button
                    onClick={() => {
                      applyToVisible({ reviewed: true })
                      setExcluded(new Set())
                      // Reset every filter to no input after a commit.
                      const next = { text: '', price: '', status: 'all' }
                      setFilterDraft(next)
                      setFilter(next)
                    }}
                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 font-semibold"
                  >
                    Commit batch
                  </button>
                </div>
              </div>
            </div>
            <datalist id="ps-units">
              {['each', 'roll', 'yard', 'CY', 'ton', 'LF', 'linear ft', 'SF', 'sqft', 'bag', 'pallet', 'gallon', 'box'].map(u => (
                <option key={u} value={u} />
              ))}
            </datalist>
            <datalist id="ps-cats">
              {catOptions.map(c => <option key={c} value={c} />)}
            </datalist>
            <datalist id="ps-subs">
              {subOptions.map(s => <option key={s} value={s} />)}
            </datalist>
            <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-[50vh]">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr className="text-left text-gray-700">
                    <th className="px-2 py-2 font-semibold">On sheet</th>
                    <th className="px-2 py-2 font-semibold">Unit</th>
                    <th className="px-2 py-2 font-semibold">Matches</th>
                    <th className="px-2 py-2 font-semibold text-right">Current</th>
                    <th className="px-2 py-2 font-semibold text-right">New</th>
                    <th className="px-2 py-2 font-semibold text-right">Δ</th>
                    <th className="px-2 py-2 font-semibold">Status</th>
                    <th className="px-2 py-2 font-semibold">Category / Sub (new)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((r, i) => {
                    if (!inBatch(r, i)) return null
                    const delta =
                      r.current != null && r.current !== 0
                        ? ((r.unit_price - r.current) / r.current) * 100
                        : null
                    return (
                      <tr key={i} className={r.reviewed ? 'bg-green-50' : 'bg-amber-50'}>
                        <td className="px-2 py-1.5">
                          <div className="flex items-start gap-1">
                            <button
                              onClick={() => setExcluded(s => new Set(s).add(i))}
                              title="Remove from this batch (back to unaccounted)"
                              className="text-gray-400 hover:text-red-500 leading-none mt-0.5"
                            >
                              ✕
                            </button>
                            <div>
                              <div className="font-medium text-gray-800">{r.item}</div>
                              {r.notes && <div className="text-gray-600">{r.notes}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            value={r.unit || ''}
                            onChange={e => setRow(i, { unit: e.target.value, reviewed: true })}
                            list="ps-units"
                            className="border border-gray-200 rounded px-1.5 py-1 w-24"
                          />
                        </td>
                        <td className="px-2 py-1.5 text-gray-800">{r.matchName || <span className="text-amber-600">— new item —</span>}</td>
                        <td className="px-2 py-1.5 text-right text-gray-700">{r.current != null ? fmt(r.current) : '—'}</td>
                        <td className="px-2 py-1.5 text-right font-semibold text-gray-800">{fmt(r.unit_price)}</td>
                        <td className={`px-2 py-1.5 text-right ${delta > 0 ? 'text-red-600' : delta < 0 ? 'text-green-600' : 'text-gray-500'}`}>
                          {delta == null ? '—' : `${delta > 0 ? '+' : ''}${delta.toFixed(0)}%`}
                        </td>
                        <td className="px-2 py-1.5">
                          <select value={r.action} onChange={e => setRow(i, { action: e.target.value, reviewed: true })} className="border border-gray-200 rounded px-1.5 py-1 bg-white">
                            <option value="unchanged">Unchanged</option>
                            {r.matchId && <option value="update">Update</option>}
                            <option value="add">Add new</option>
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          {r.action === 'add' ? (
                            <div className="flex flex-col gap-1">
                              <input
                                value={r.category}
                                onChange={e => setRow(i, { category: e.target.value, reviewed: true })}
                                list="ps-cats"
                                placeholder="Category — pick or type new"
                                className="border border-gray-200 rounded px-1.5 py-1 w-48"
                              />
                              <input
                                value={r.sub_category}
                                onChange={e => setRow(i, { sub_category: e.target.value, reviewed: true })}
                                list="ps-subs"
                                placeholder="Sub category — pick or type new"
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
            <div className="flex items-center justify-end gap-3 pt-3">
              {counts.remaining > 0 && (
                <span className="text-[11px] text-amber-700">{counts.remaining} item(s) still need to be accounted for</span>
              )}
              <button onClick={() => setStep('form')} className="text-sm text-gray-500 px-3 py-1.5">Back</button>
              <button
                onClick={apply}
                disabled={busy || counts.remaining > 0}
                title={counts.remaining > 0 ? 'Account for every item first' : undefined}
                className="text-sm bg-green-600 text-white font-semibold rounded px-4 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? 'Importing…' : 'Import Pricing'}
              </button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-700 mb-1 font-semibold">Price sheet applied</p>
            <p className="text-xs text-gray-500 mb-4">
              {applied.updated} updated · {applied.added} added · {applied.unchanged} unchanged. A price-history period was recorded for {vendorName} effective {effectiveDate}.
            </p>
            <button onClick={onClose} className="text-sm bg-gray-800 text-white font-semibold rounded px-4 py-1.5">Done</button>
          </div>
        )}
      </div>
    </div>
  )
}
