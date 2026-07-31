import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import VendorCombo from './VendorCombo'
import QuickAddVendorModal from './QuickAddVendorModal'

// ─────────────────────────────────────────────────────────────────────────────
// InvoiceImportModal — upload a vendor invoice for a job. Sam extracts the
// header + line items; each line is matched to the master price list and
// price-checked against the master price in effect on the invoice date. On
// approval it posts the invoice, its lines (with the variance recorded), and a
// job_expenses row per included line (queued for QuickBooks sync).
// Requires: supabase-invoices-migration.sql + process-invoice function.
// ─────────────────────────────────────────────────────────────────────────────

const VARIANCE_FLAG = 5 // percent — highlight lines priced this far off master

const norm = s =>
  String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

const fmt = v => `$${(Number(v) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function InvoiceImportModal({ jobId: jobIdProp, jobName: jobNameProp, vendors = [], onClose, onPosted }) {
  const today = new Date().toISOString().slice(0, 10)
  const [step, setStep] = useState('form') // form | review | done
  const [file, setFile] = useState(null)
  const [vendorId, setVendorId] = useState('')
  // Job may come from a prop (opened on a Job page) or be picked here (opened
  // from Vendors → Invoicing). jobList is used for the searchable picker.
  const [pickJobId, setPickJobId] = useState('')
  const [jobList, setJobList] = useState([])
  const jobId = jobIdProp || pickJobId
  const jobName = jobNameProp || (jobList.find(j => j.id === jobId)?.company_name || '')
  useEffect(() => {
    if (jobIdProp) return
    supabase
      .from('jobs')
      .select('id, client_name, job_address')
      .order('client_name')
      .then(({ data }) =>
        setJobList((data || []).map(j => ({ id: j.id, company_name: `${j.client_name}${j.job_address ? ' — ' + j.job_address : ''}` })))
      )
  }, [jobIdProp])
  const [filePath, setFilePath] = useState('')
  const [header, setHeader] = useState({ invoice_no: '', invoice_date: today, subtotal: null, total: null, vendor_name: '' })
  const [rows, setRows] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(() => new Set())
  const [search, setSearch] = useState('')
  const [bulkCat, setBulkCat] = useState('')
  const [bulkUnit, setBulkUnit] = useState('')

  const matchesSearch = r => {
    const q = norm(search)
    if (!q) return true
    return norm(`${r.description} ${r.matchName || ''} ${r.unit || ''} ${r.category || ''}`).includes(q)
  }
  const toggleSel = i =>
    setSelected(s => {
      const n = new Set(s)
      n.has(i) ? n.delete(i) : n.add(i)
      return n
    })
  const selectWhere = pred =>
    setSelected(new Set(rows.map((r, i) => (pred(r) && matchesSearch(r) ? i : -1)).filter(i => i >= 0)))
  const applyToSelected = patch =>
    setRows(rs => rs.map((r, i) => (selected.has(i) ? { ...r, ...patch } : r)))

  const [extraVendors, setExtraVendors] = useState([])
  const [showNewVendor, setShowNewVendor] = useState(false)
  const allVendors = [...(vendors || []), ...extraVendors]
  const vendorList = allVendors.filter(v => !v.type || v.type === 'vendor')
  const vendorName = useMemo(() => allVendors.find(v => v.id === vendorId)?.company_name || '', [allVendors, vendorId])

  // Match each extracted line to a material for the chosen vendor + price-check.
  async function matchAndCheck(vId, extracted, invDate) {
    if (!vId) {
      return extracted.map(r => ({ ...r, matchId: null, matchName: '', category: '', master: null, variance: null, include: true }))
    }
    const { data: mats } = await supabase
      .from('material_rates')
      .select('id, name, category, unit_cost')
      .eq('vendor_id', vId)
    const byNorm = new Map((mats || []).map(m => [norm(m.name), m]))
    const out = []
    for (const r of extracted) {
      const hit = byNorm.get(norm(r.description)) || null
      let master = null
      if (hit) {
        const { data: pa } = await supabase.rpc('price_as_of', { p_rate_id: hit.id, p_date: invDate })
        master = pa != null ? Number(pa) : Number(hit.unit_cost)
      }
      const unit_price = r.unit_price != null ? Number(r.unit_price) : null
      const variance = master && master !== 0 && unit_price != null ? ((unit_price - master) / master) * 100 : null
      out.push({
        ...r,
        matchId: hit?.id || null,
        matchName: hit?.name || '',
        category: hit?.category || '',
        master,
        variance,
        include: true,
      })
    }
    return out
  }

  async function extract() {
    setError('')
    if (!file) return setError('Choose an invoice file (PDF or image).')
    setBusy(true)
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_')
      const path = `${jobId || 'inbox'}/${Date.now()}-${safe}`
      const { error: upErr } = await supabase.storage.from('vendor-invoices').upload(path, file)
      if (upErr) throw new Error(`Upload failed: ${upErr.message}`)
      setFilePath(path)

      const { data, error: fnErr } = await supabase.functions.invoke('process-invoice', {
        body: { file_path: path },
      })
      if (fnErr) throw new Error(fnErr.message || 'Extraction failed.')
      if (data?.error) throw new Error(data.error)
      const extracted = data?.rows || []
      if (!extracted.length) throw new Error('No line items were found on that invoice.')

      const invDate = data.invoice_date || today
      const hdr = {
        invoice_no: data.invoice_no || '',
        invoice_date: invDate,
        subtotal: data.subtotal,
        total: data.total,
        vendor_name: data.vendor_name || '',
      }
      setHeader(hdr)

      // Auto-match vendor by name.
      let vId = vendorId
      if (!vId && data.vendor_name) {
        const vn = norm(data.vendor_name)
        const found = vendorList.find(v => {
          const c = norm(v.company_name)
          return c === vn || c.includes(vn) || vn.includes(c)
        })
        if (found) vId = found.id
      }
      setVendorId(vId)
      setRows(await matchAndCheck(vId, extracted, invDate))
      setStep('review')
    } catch (e) {
      setError(String(e.message || e))
    } finally {
      setBusy(false)
    }
  }

  async function changeVendor(vId) {
    setVendorId(vId)
    setBusy(true)
    try {
      setRows(await matchAndCheck(vId, rows, header.invoice_date))
    } finally {
      setBusy(false)
    }
  }

  function setRow(i, patch) {
    setRows(rs => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  const totals = useMemo(() => {
    const included = rows.filter(r => r.include)
    const sum = included.reduce((a, r) => a + (Number(r.amount) || 0), 0)
    const flagged = included.filter(r => r.variance != null && Math.abs(r.variance) >= VARIANCE_FLAG).length
    return { count: included.length, sum, flagged }
  }, [rows])

  async function post() {
    setError('')
    if (!jobId) return setError('Pick a job to post these expenses to.')
    setBusy(true)
    try {
      const { data: inv, error: invErr } = await supabase
        .from('vendor_invoices')
        .insert({
          job_id: jobId,
          vendor_id: vendorId || null,
          invoice_no: header.invoice_no || null,
          invoice_date: header.invoice_date,
          file_url: filePath || null,
          subtotal: header.subtotal,
          total: header.total,
          status: 'posted',
        })
        .select()
        .single()
      if (invErr) throw new Error(`Could not save invoice: ${invErr.message}`)
      const invoiceId = inv.id

      const lineRows = rows.map(r => ({
        invoice_id: invoiceId,
        material_rate_id: r.matchId || null,
        description: r.description,
        qty: r.qty,
        unit: r.unit,
        unit_price: r.unit_price,
        amount: r.amount,
        master_price: r.master,
        variance_pct: r.variance,
        matched: !!r.matchId,
      }))
      if (lineRows.length) {
        const { error: lErr } = await supabase.from('vendor_invoice_lines').insert(lineRows)
        if (lErr) throw new Error(`Could not save invoice lines: ${lErr.message}`)
      }

      const expenseRows = rows
        .filter(r => r.include)
        .map(r => ({
          job_id: jobId,
          vendor_id: vendorId || null,
          invoice_id: invoiceId,
          description: r.description,
          category: r.category || null,
          qty: r.qty,
          unit: r.unit,
          unit_cost: r.unit_price,
          amount: Number(r.amount) || 0,
          expense_date: header.invoice_date,
          source: 'invoice',
          qb_sync_status: 'pending',
        }))
      if (expenseRows.length) {
        const { error: eErr } = await supabase.from('job_expenses').insert(expenseRows)
        if (eErr) throw new Error(`Could not post expenses: ${eErr.message}`)
      }

      setStep('done')
      onPosted?.()
    } catch (e) {
      setError(String(e.message || e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto">
      {showNewVendor && (
        <QuickAddVendorModal
          onClose={() => setShowNewVendor(false)}
          onCreated={v => { setExtraVendors(a => [...a, v]); setVendorId(v.id); setShowNewVendor(false) }}
        />
      )}
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl my-8">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
            Import Invoice{jobName ? ` — ${jobName}` : ''}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-lg leading-none">×</button>
        </div>

        {error && (
          <div className="mx-5 mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>
        )}

        {step === 'form' && (
          <div className="p-5 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs text-gray-500">Vendor (optional — auto-detected if blank)</label>
                <button type="button" onClick={() => setShowNewVendor(true)} className="text-xs text-green-700 font-semibold hover:underline">+ New vendor</button>
              </div>
              <VendorCombo
                vendors={vendorList}
                value={vendorId}
                onChange={setVendorId}
                allowNone
                noneLabel="— Auto-detect from invoice —"
                placeholder="Auto-detect, or search vendor…"
              />
            </div>
            {!jobIdProp && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Job (expenses post here)</label>
                <VendorCombo vendors={jobList} value={pickJobId} onChange={setPickJobId} placeholder="Search job…" />
              </div>
            )}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Invoice file (PDF or image)</label>
              <input
                type="file"
                accept="application/pdf,image/*"
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-gray-600 file:mr-3 file:rounded file:border-0 file:bg-green-50 file:px-3 file:py-1.5 file:text-green-700 file:font-semibold"
              />
              <p className="text-[11px] text-gray-400 mt-1">Sam reads the invoice, matches each line to your price list, and flags anything priced off. Nothing posts until you approve.</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={onClose} className="text-sm text-gray-500 px-3 py-1.5">Cancel</button>
              <button onClick={extract} disabled={busy} className="text-sm bg-green-600 text-white font-semibold rounded px-4 py-1.5 disabled:opacity-50">
                {busy ? 'Reading invoice…' : 'Extract & Review'}
              </button>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
              <div>
                <label className="block text-[11px] text-gray-500 mb-0.5">Vendor</label>
                <VendorCombo vendors={vendorList} value={vendorId} onChange={changeVendor} allowNone placeholder="Search vendor…" />
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-0.5">Invoice #</label>
                <input value={header.invoice_no} onChange={e => setHeader(h => ({ ...h, invoice_no: e.target.value }))} className="input w-full text-xs py-1" />
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-0.5">Invoice date</label>
                <input type="date" value={header.invoice_date} onChange={e => setHeader(h => ({ ...h, invoice_date: e.target.value }))} className="input w-full text-xs py-1" />
              </div>
              <div className="text-right self-end text-xs text-gray-500">
                {totals.count} lines · {fmt(totals.sum)}
                {totals.flagged > 0 && <span className="text-red-600"> · {totals.flagged} flagged</span>}
              </div>
            </div>

            {/* Two-step bulk editor: (1) pick which rows, (2) change them together */}
            <div className="mb-3 border border-gray-200 rounded-lg overflow-hidden text-xs">
              <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
                <span className="font-bold text-gray-800">Step 1 · Pick rows</span>
                <span className="text-gray-600 ml-1">Filter</span>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="type to narrow, e.g. gravel"
                  className="border border-gray-300 rounded px-2 py-1 w-44"
                />
                <span className="text-gray-600">Select</span>
                {[
                  ['Matched only', () => selectWhere(r => !!r.matchId)],
                  ['Unmatched only', () => selectWhere(r => !r.matchId)],
                  ['Flagged only', () => selectWhere(r => r.variance != null && Math.abs(r.variance) >= VARIANCE_FLAG)],
                  ['All shown', () => selectWhere(() => true)],
                  ['None', () => setSelected(new Set())],
                ].map(([label, fn]) => (
                  <button key={label} onClick={fn} className="px-2 py-1 border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-100">
                    {label}
                  </button>
                ))}
                <span className="ml-auto font-bold text-green-700">{selected.size} selected</span>
              </div>
              <div className={`px-3 py-2 ${selected.size ? '' : 'opacity-50 pointer-events-none'}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-gray-800">Step 2 · Change selected</span>
                  <span className="text-gray-600 ml-1">Include on job?</span>
                  <button onClick={() => applyToSelected({ include: true })} className="px-2 py-1 border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-100">Include</button>
                  <button onClick={() => applyToSelected({ include: false })} className="px-2 py-1 border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-100">Exclude</button>
                  <span className="mx-1 h-4 w-px bg-gray-300" />
                  <span className="text-gray-600">Set value</span>
                  <input value={bulkCat} onChange={e => setBulkCat(e.target.value)} placeholder="Category" className="border border-gray-300 rounded px-2 py-1 w-36" />
                  <button onClick={() => applyToSelected({ category: bulkCat })} className="px-2 py-1 bg-gray-800 text-white rounded hover:bg-gray-900">Apply →</button>
                  <input value={bulkUnit} onChange={e => setBulkUnit(e.target.value)} placeholder="Unit" list="inv-units" className="border border-gray-300 rounded px-2 py-1 w-24" />
                  <button onClick={() => applyToSelected({ unit: bulkUnit })} className="px-2 py-1 bg-gray-800 text-white rounded hover:bg-gray-900">Apply →</button>
                </div>
                <datalist id="inv-units">
                  {['each', 'roll', 'yard', 'CY', 'ton', 'LF', 'linear ft', 'SF', 'sqft', 'bag', 'pallet', 'gallon', 'hour', 'box'].map(u => (
                    <option key={u} value={u} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-[52vh]">
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
                    <th className="px-2 py-2 font-semibold">Incl</th>
                    <th className="px-2 py-2 font-semibold">Line</th>
                    <th className="px-2 py-2 font-semibold">Unit</th>
                    <th className="px-2 py-2 font-semibold text-right">Qty</th>
                    <th className="px-2 py-2 font-semibold text-right">Inv $</th>
                    <th className="px-2 py-2 font-semibold text-right">Master $</th>
                    <th className="px-2 py-2 font-semibold text-right">Δ</th>
                    <th className="px-2 py-2 font-semibold text-right">Amount</th>
                    <th className="px-2 py-2 font-semibold">Category</th>
                    <th className="px-2 py-2 font-semibold">Matched item</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((r, i) => {
                    if (!matchesSearch(r)) return null
                    const flagged = r.variance != null && Math.abs(r.variance) >= VARIANCE_FLAG
                    return (
                      <tr key={i} className={selected.has(i) ? 'bg-green-50' : ''}>
                        <td className="px-2 py-1.5">
                          <input type="checkbox" checked={selected.has(i)} onChange={() => toggleSel(i)} />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="checkbox" checked={r.include} onChange={e => setRow(i, { include: e.target.checked })} />
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="font-medium text-gray-800">{r.description}</div>
                        </td>
                        <td className="px-2 py-1.5">
                          <input value={r.unit || ''} onChange={e => setRow(i, { unit: e.target.value })} list="inv-units" className="border border-gray-200 rounded px-1.5 py-1 w-24" />
                        </td>
                        <td className="px-2 py-1.5 text-right text-gray-700">{r.qty ?? '—'}</td>
                        <td className="px-2 py-1.5 text-right text-gray-800">{r.unit_price != null ? fmt(r.unit_price) : '—'}</td>
                        <td className="px-2 py-1.5 text-right text-gray-700">{r.master != null ? fmt(r.master) : <span className="text-amber-600">no match</span>}</td>
                        <td className={`px-2 py-1.5 text-right ${flagged ? 'font-semibold text-red-600' : r.variance < 0 ? 'text-green-600' : 'text-gray-500'}`}>
                          {r.variance == null ? '—' : `${r.variance > 0 ? '+' : ''}${r.variance.toFixed(0)}%`}
                        </td>
                        <td className="px-2 py-1.5 text-right font-semibold text-gray-800">{r.amount != null ? fmt(r.amount) : '—'}</td>
                        <td className="px-2 py-1.5">
                          <input value={r.category || ''} onChange={e => setRow(i, { category: e.target.value })} placeholder="—" className="border border-gray-200 rounded px-1.5 py-1 w-32" />
                        </td>
                        <td className="px-2 py-1.5 text-gray-800">{r.matchName || <span className="text-amber-600">—</span>}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-gray-500 mt-2">Lines priced ≥{VARIANCE_FLAG}% off the master price are flagged in red. Untick <strong>Incl</strong> to leave a line off the job expenses.</p>
            <div className="flex justify-end gap-2 pt-3">
              <button onClick={() => setStep('form')} className="text-sm text-gray-500 px-3 py-1.5">Back</button>
              <button onClick={post} disabled={busy} className="text-sm bg-green-600 text-white font-semibold rounded px-4 py-1.5 disabled:opacity-50">
                {busy ? 'Posting…' : `Post ${totals.count} to job`}
              </button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-700 mb-1 font-semibold">Invoice posted</p>
            <p className="text-xs text-gray-500 mb-4">
              {totals.count} expense line(s) totalling {fmt(totals.sum)} posted to {jobName || 'the job'} and queued for QuickBooks sync.
            </p>
            <button onClick={onClose} className="text-sm bg-gray-800 text-white font-semibold rounded px-4 py-1.5">Done</button>
          </div>
        )}
      </div>
    </div>
  )
}
