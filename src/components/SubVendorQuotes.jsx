// ─────────────────────────────────────────────────────────────────────────────
// SubVendorQuotes — the "Quotes" sub-tab of Subs & Vendors.
//
// • Table of all quotes (requests we send out + quotes received).
// • "Add Quote" opens a builder:
//     - optional vendor (with inline "add new vendor"),
//     - the job the quote is for,
//     - a line-item spreadsheet (10 rows by default, add more): item, part/stock
//       number, qty, unit type (preset list + free-typed custom), unit price
//       (may be left blank for the vendor to fill) and an auto line total.
//     - Save, or Save & Send (choose text / email / both; email/sms open
//       pre-addressed to the vendor).
//     - "Received" mode: pick/add a vendor, hand-enter the lines and/or attach
//       the received quote document (viewable in the in-app viewer).
//
// Requires: table `sub_vendor_quotes` + the `sub-vendor-files` storage bucket.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import DocViewerModal from './DocViewerModal'

const UNITS = ['Each', 'Sq Foot', 'Pallet', 'Yard', 'Scoop', 'Cubic Yard', 'Linear Feet']
const money = v =>
  `$${(Number(v) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const lineTotal = r => (Number(r.qty) || 0) * (Number(r.unit_price) || 0)
const quoteTotal = rows => rows.reduce((s, r) => s + lineTotal(r), 0)
const blankRow = () => ({ name: '', part: '', qty: '', unit: 'Each', unit_price: '' })
const emptyRows = (n = 10) => Array.from({ length: n }, blankRow)

const jobLabel = j =>
  j ? [j.client_name, j.job_address].filter(Boolean).join(' — ') || j.client_name || 'Job' : ''
const splitEmails = s =>
  String(s || '')
    .split(/[,;\s]+/)
    .map(x => x.trim())
    .filter(x => x.includes('@'))

const STATUS_BADGE = {
  draft: 'bg-gray-100 text-gray-600 border-gray-200',
  sent: 'bg-blue-50 text-blue-700 border-blue-200',
  received: 'bg-green-50 text-green-700 border-green-200',
}

// ── Send-method modal ─────────────────────────────────────────────────────────
function SendModal({ vendor, emailBody, smsBody, subject, onCancel, onConfirm }) {
  const emails = vendor ? splitEmails(vendor.email) : []
  const cell = vendor?.cell || vendor?.phone || ''
  const [method, setMethod] = useState(emails.length ? 'email' : cell ? 'text' : 'email')
  const [picked, setPicked] = useState(() => new Set(emails.slice(0, 1)))

  const toggleEmail = e =>
    setPicked(p => {
      const n = new Set(p)
      n.has(e) ? n.delete(e) : n.add(e)
      return n
    })

  function go() {
    const chosenEmails = [...picked]
    if ((method === 'email' || method === 'both') && chosenEmails.length) {
      const href = `mailto:${chosenEmails.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`
      window.open(href, '_self')
    }
    if ((method === 'text' || method === 'both') && cell) {
      const href = `sms:${cell.replace(/[^\d+]/g, '')}?&body=${encodeURIComponent(smsBody)}`
      // Open after a tick so the mail handler (if any) fires first.
      setTimeout(() => window.open(href, '_self'), 300)
    }
    onConfirm(method)
  }

  return (
    <div
      className="fixed inset-x-0 top-0 h-[100dvh] z-[70] flex items-center justify-center bg-black/50 px-4"
      onMouseDown={e => e.target === e.currentTarget && onCancel()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5">
        <h3 className="text-base font-bold text-gray-900 mb-3">Send Quote Request</h3>

        <div className="flex gap-2 mb-4">
          {[
            { k: 'text', l: 'Text' },
            { k: 'email', l: 'Email' },
            { k: 'both', l: 'Both' },
          ].map(o => (
            <button
              key={o.k}
              onClick={() => setMethod(o.k)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                method === o.k
                  ? 'border-green-700 bg-green-50 text-green-800'
                  : 'border-gray-200 text-gray-500 hover:border-green-400'
              }`}
            >
              {o.l}
            </button>
          ))}
        </div>

        {(method === 'email' || method === 'both') && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-gray-500 mb-1">Email to</p>
            {emails.length === 0 ? (
              <p className="text-xs text-red-500">No email on file for this vendor.</p>
            ) : (
              emails.map(e => (
                <label key={e} className="flex items-center gap-2 text-sm py-0.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={picked.has(e)}
                    onChange={() => toggleEmail(e)}
                    className="rounded accent-green-600"
                  />
                  {e}
                </label>
              ))
            )}
          </div>
        )}
        {(method === 'text' || method === 'both') && (
          <p className="text-xs text-gray-500 mb-3">
            Text to: {cell ? cell : <span className="text-red-500">no cell on file</span>}
          </p>
        )}

        <div className="flex gap-2">
          <button onClick={go} className="flex-1 btn-primary text-sm py-2.5">
            Send & Save
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Add / Edit quote modal ────────────────────────────────────────────────────
function QuoteModal({ parties, jobs, estimates = [], onClose, onSaved, onVendorAdded }) {
  const [direction, setDirection] = useState('request') // 'request' | 'received'
  const [partyId, setPartyId] = useState('')
  const [jobId, setJobId] = useState('')
  const [estimateId, setEstimateId] = useState('')
  const [rows, setRows] = useState(emptyRows(10))
  const [notes, setNotes] = useState('')
  const [attachFile, setAttachFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [sendOpen, setSendOpen] = useState(false)
  const [showAddVendor, setShowAddVendor] = useState(false)
  const [newVendor, setNewVendor] = useState({ company_name: '', email: '', cell: '' })
  const fileRef = useRef(null)

  const party = parties.find(p => p.id === partyId)
  const job = jobs.find(j => j.id === jobId)
  const estimate = estimates.find(e => e.id === estimateId)
  const estLabel = e => [e.estimate_name, e.client_name].filter(Boolean).join(' — ') || 'Estimate'
  const total = quoteTotal(rows)

  const setRow = (i, patch) => setRows(rs => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const addRow = () => setRows(rs => [...rs, blankRow()])
  const removeRow = i => setRows(rs => (rs.length > 1 ? rs.filter((_, idx) => idx !== i) : rs))

  const grouped = {
    vendor: parties.filter(p => p.type === 'vendor'),
    sub: parties.filter(p => p.type === 'sub'),
  }

  async function createVendor() {
    if (!newVendor.company_name.trim()) return
    const { data, error: e } = await supabase
      .from('subs_vendors')
      .insert({
        type: 'vendor',
        company_name: newVendor.company_name.trim(),
        email: newVendor.email.trim() || null,
        cell: newVendor.cell.trim() || null,
        status: 'no_email',
      })
      .select('id, company_name, email, cell, phone, type')
      .single()
    if (e) {
      setError('Could not add vendor: ' + e.message)
      return
    }
    onVendorAdded(data)
    setPartyId(data.id)
    setShowAddVendor(false)
    setNewVendor({ company_name: '', email: '', cell: '' })
  }

  function cleanRows() {
    return rows
      .filter(r => r.name.trim())
      .map(r => ({
        name: r.name.trim(),
        part: r.part.trim() || null,
        qty: r.qty === '' ? null : Number(r.qty),
        unit: r.unit || null,
        unit_price: r.unit_price === '' ? null : Number(r.unit_price),
        total: lineTotal(r),
      }))
  }

  async function persist(status, sentMethod) {
    const items = cleanRows()
    if (direction === 'received' && !partyId) {
      setError('Pick (or add) the vendor this quote is from.')
      return null
    }
    if (items.length === 0 && !attachFile) {
      setError('Add at least one line item, or attach a quote document.')
      return null
    }

    let filePath = null
    let fileName = null
    if (attachFile) {
      const safe = attachFile.name.replace(/[^\w.\-]+/g, '_')
      filePath = `quotes/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`
      const { error: upErr } = await supabase.storage
        .from('sub-vendor-files')
        .upload(filePath, attachFile, { upsert: false, contentType: attachFile.type })
      if (upErr) {
        setError('Attachment upload failed: ' + upErr.message)
        return null
      }
      fileName = attachFile.name
    }

    const payload = {
      sub_vendor_id: partyId || null,
      vendor_name: party?.company_name || null,
      job_id: jobId || null,
      job_name: job ? jobLabel(job) : null,
      estimate_id: estimateId || null,
      estimate_name: estimate ? estLabel(estimate) : null,
      direction,
      line_items: items,
      total,
      status,
      sent_method: sentMethod || null,
      sent_at: status === 'sent' ? new Date().toISOString() : null,
      file_path: filePath,
      file_name: fileName,
      notes: notes.trim() || null,
      updated_at: new Date().toISOString(),
    }
    const { error: insErr } = await supabase.from('sub_vendor_quotes').insert(payload)
    if (insErr) {
      setError('Save failed: ' + insErr.message)
      return null
    }
    return true
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    const ok = await persist(direction === 'received' ? 'received' : 'draft', null)
    setSaving(false)
    if (ok) onSaved()
  }

  function handleSaveSend() {
    setError('')
    if (cleanRows().length === 0) {
      setError('Add at least one line item before sending.')
      return
    }
    setSendOpen(true)
  }

  async function confirmSend(method) {
    setSendOpen(false)
    setSaving(true)
    const ok = await persist('sent', method)
    setSaving(false)
    if (ok) onSaved()
  }

  // Email / SMS bodies built from the line items.
  const itemLines = rows
    .filter(r => r.name.trim())
    .map(
      r =>
        `- ${r.name}${r.part ? ` (PN ${r.part})` : ''}: ${r.qty || '?'} ${r.unit}${
          r.unit_price ? ` @ ${money(r.unit_price)}` : ''
        }`
    )
    .join('\n')
  const subject = `Quote Request${job ? ` — ${jobLabel(job)}` : ''}`
  const emailBody = `Hello${party ? ` ${party.company_name}` : ''},\n\nPlease provide a quote for the following${
    job ? ` for ${jobLabel(job)}` : ''
  }:\n\n${itemLines}\n\nThank you.`
  const smsBody = `Quote request${job ? ` for ${jobLabel(job)}` : ''}: ${rows
    .filter(r => r.name.trim())
    .map(r => `${r.qty || ''} ${r.unit} ${r.name}`.trim())
    .join('; ')}`

  return (
    <div
      className="fixed inset-x-0 top-0 h-[100dvh] z-[60] flex items-end sm:items-center justify-center bg-black/50"
      onMouseDown={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-3xl mx-0 sm:mx-4 flex flex-col max-h-[95dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900">New Quote</h2>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-2xl leading-none px-1">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-5 space-y-5">
          {/* Direction */}
          <div className="flex gap-2">
            {[
              { k: 'request', l: '📤 Request a quote' },
              { k: 'received', l: '📥 Record a received quote' },
            ].map(o => (
              <button
                key={o.k}
                onClick={() => setDirection(o.k)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                  direction === o.k
                    ? 'border-green-700 bg-green-50 text-green-800'
                    : 'border-gray-200 text-gray-500 hover:border-green-400'
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>

          {/* Vendor */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-gray-600">
                Vendor{' '}
                <span className="font-normal text-gray-400">
                  {direction === 'request' ? '(optional)' : ''}
                </span>
              </label>
              <button
                type="button"
                onClick={() => setShowAddVendor(v => !v)}
                className="text-xs font-semibold text-green-700 hover:text-green-900"
              >
                {showAddVendor ? 'Cancel' : '+ New vendor'}
              </button>
            </div>
            {showAddVendor ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                <input
                  value={newVendor.company_name}
                  onChange={e => setNewVendor(v => ({ ...v, company_name: e.target.value }))}
                  placeholder="Vendor name *"
                  className="input text-sm w-full"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={newVendor.email}
                    onChange={e => setNewVendor(v => ({ ...v, email: e.target.value }))}
                    placeholder="Email"
                    className="input text-sm w-full"
                  />
                  <input
                    value={newVendor.cell}
                    onChange={e => setNewVendor(v => ({ ...v, cell: e.target.value }))}
                    placeholder="Cell"
                    className="input text-sm w-full"
                  />
                </div>
                <button
                  type="button"
                  onClick={createVendor}
                  className="btn-primary text-xs px-3 py-1.5"
                >
                  Create vendor
                </button>
              </div>
            ) : (
              <select
                value={partyId}
                onChange={e => setPartyId(e.target.value)}
                className="input text-sm w-full"
              >
                <option value="">Select a vendor…</option>
                {grouped.vendor.length > 0 && (
                  <optgroup label="Vendors">
                    {grouped.vendor.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.company_name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {grouped.sub.length > 0 && (
                  <optgroup label="Subcontractors">
                    {grouped.sub.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.company_name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            )}
          </div>

          {/* Job */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Job{' '}
              <span className="font-normal text-gray-400">
                {direction === 'received' ? '(optional)' : ''}
              </span>
            </label>
            <select
              value={jobId}
              onChange={e => setJobId(e.target.value)}
              className="input text-sm w-full"
            >
              <option value="">Select a job…</option>
              {jobs.map(j => (
                <option key={j.id} value={j.id}>
                  {jobLabel(j)}
                </option>
              ))}
            </select>
          </div>

          {/* Estimate (optional) */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Attach to Estimate <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <select
              value={estimateId}
              onChange={e => setEstimateId(e.target.value)}
              className="input text-sm w-full"
            >
              <option value="">None</option>
              {estimates.map(e => (
                <option key={e.id} value={e.id}>
                  {estLabel(e)}
                </option>
              ))}
            </select>
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Items
              </label>
              <button
                type="button"
                onClick={addRow}
                className="text-xs font-semibold text-green-700 hover:text-green-900"
              >
                + Add Row
              </button>
            </div>

            <div className="hidden sm:grid grid-cols-12 gap-2 px-1 mb-1 text-[10px] font-semibold uppercase text-gray-400">
              <span className="col-span-4">Item / Material</span>
              <span className="col-span-2">Part #</span>
              <span className="col-span-1">Qty</span>
              <span className="col-span-2">Unit</span>
              <span className="col-span-1">Price</span>
              <span className="col-span-2 text-right">Total</span>
            </div>

            <datalist id="quote-units">
              {UNITS.map(u => (
                <option key={u} value={u} />
              ))}
            </datalist>

            <div className="space-y-2">
              {rows.map((r, i) => (
                <div
                  key={i}
                  className="grid grid-cols-12 gap-2 items-center bg-gray-50 sm:bg-transparent rounded-lg sm:rounded-none p-2 sm:p-0"
                >
                  <input
                    value={r.name}
                    onChange={e => setRow(i, { name: e.target.value })}
                    placeholder="Item / material"
                    className="input text-sm col-span-12 sm:col-span-4"
                  />
                  <input
                    value={r.part}
                    onChange={e => setRow(i, { part: e.target.value })}
                    placeholder="Part #"
                    className="input text-sm col-span-6 sm:col-span-2"
                  />
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={r.qty}
                    onChange={e => setRow(i, { qty: e.target.value })}
                    placeholder="Qty"
                    className="input text-sm col-span-6 sm:col-span-1"
                  />
                  <input
                    list="quote-units"
                    value={r.unit}
                    onChange={e => setRow(i, { unit: e.target.value })}
                    placeholder="Unit"
                    className="input text-sm col-span-6 sm:col-span-2"
                  />
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={r.unit_price}
                    onChange={e => setRow(i, { unit_price: e.target.value })}
                    placeholder="$ / unit"
                    className="input text-sm col-span-4 sm:col-span-1"
                  />
                  <div className="col-span-2 text-right text-sm font-semibold text-gray-700 tabular-nums">
                    {r.unit_price === '' ? '—' : money(lineTotal(r))}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="col-span-12 sm:hidden text-right text-red-300 hover:text-red-500 text-xs"
                  >
                    Remove row
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end items-center gap-3 mt-3 pt-3 border-t border-gray-200">
              <span className="text-sm font-semibold text-gray-500">Quote Total</span>
              <span className="text-lg font-bold text-green-700 tabular-nums">{money(total)}</span>
            </div>
          </div>

          {/* Attachment (received) */}
          {direction === 'received' && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Attach received quote{' '}
                <span className="font-normal text-gray-400">(PDF, Word, Excel, image)</span>
              </label>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                onChange={e => setAttachFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full border border-dashed border-gray-300 rounded-lg py-2.5 text-sm font-medium text-gray-500 hover:border-green-500 hover:text-green-700"
              >
                {attachFile ? `📎 ${attachFile.name}` : '⬆ Attach quote file'}
              </button>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Optional notes…"
              className="input text-sm w-full resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 flex gap-2 flex-shrink-0 border-t border-gray-100">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 rounded-lg border border-green-700 text-green-700 text-sm font-semibold hover:bg-green-50 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          {direction === 'request' && (
            <button
              onClick={handleSaveSend}
              disabled={saving}
              className="flex-1 btn-primary text-sm py-3 disabled:opacity-50"
            >
              Save & Send
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-3 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>

      {sendOpen && (
        <SendModal
          vendor={party}
          subject={subject}
          emailBody={emailBody}
          smsBody={smsBody}
          onCancel={() => setSendOpen(false)}
          onConfirm={confirmSend}
        />
      )}
    </div>
  )
}

// ── View a quote ──────────────────────────────────────────────────────────────
function QuoteViewModal({ quote, onClose }) {
  const rows = Array.isArray(quote.line_items) ? quote.line_items : []
  return (
    <div
      className="fixed inset-x-0 top-0 h-[100dvh] z-[60] flex items-end sm:items-center justify-center bg-black/50"
      onMouseDown={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl mx-0 sm:mx-4 flex flex-col max-h-[95dvh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-gray-900 truncate">
              Quote — {quote.vendor_name || 'Vendor'}
            </h2>
            <p className="text-xs text-gray-400">{quote.job_name || '—'}</p>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-2xl leading-none px-1">
            ✕
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-5 space-y-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase text-gray-400 border-b border-gray-200">
                <th className="py-1.5">Item</th>
                <th className="py-1.5">Part #</th>
                <th className="py-1.5 text-right">Qty</th>
                <th className="py-1.5">Unit</th>
                <th className="py-1.5 text-right">Price</th>
                <th className="py-1.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="py-1.5 pr-2">{r.name}</td>
                  <td className="py-1.5 text-gray-500">{r.part || '—'}</td>
                  <td className="py-1.5 text-right tabular-nums">{r.qty ?? '—'}</td>
                  <td className="py-1.5">{r.unit}</td>
                  <td className="py-1.5 text-right tabular-nums">
                    {r.unit_price == null ? '—' : money(r.unit_price)}
                  </td>
                  <td className="py-1.5 text-right tabular-nums font-semibold">
                    {r.unit_price == null ? '—' : money(r.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
            <span className="text-sm font-semibold text-gray-500">Total</span>
            <span className="text-lg font-bold text-green-700 tabular-nums">{money(quote.total)}</span>
          </div>
          {quote.notes && <p className="text-sm text-gray-600 whitespace-pre-wrap">{quote.notes}</p>}
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SubVendorQuotes() {
  const [quotes, setQuotes] = useState([])
  const [parties, setParties] = useState([])
  const [jobs, setJobs] = useState([])
  const [estimates, setEstimates] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [viewQuote, setViewQuote] = useState(null)
  const [viewDoc, setViewDoc] = useState(null)

  async function load() {
    setLoading(true)
    const [qRes, pRes, jRes, eRes] = await Promise.all([
      supabase.from('sub_vendor_quotes').select('*').order('created_at', { ascending: false }),
      supabase
        .from('subs_vendors')
        .select('id, company_name, email, cell, phone, type')
        .order('company_name'),
      supabase.from('jobs').select('id, client_name, job_address, status').order('client_name'),
      supabase.from('estimates').select('id, estimate_name, client_name, status').order('created_at', { ascending: false }),
    ])
    setQuotes(qRes.data || [])
    setParties(pRes.data || [])
    const openJobs = (jRes.data || []).filter(
      j => j.status === 'active' || j.status === 'on_hold' || !j.status
    )
    setJobs(openJobs)
    setEstimates((eRes.data || []).filter(e => e.status !== 'archived'))
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [])

  async function openQuote(q) {
    if (q.file_path) {
      const { data } = await supabase.storage
        .from('sub-vendor-files')
        .createSignedUrl(q.file_path, 3600)
      if (data?.signedUrl) {
        setViewDoc({ name: q.file_name || 'Quote', url: data.signedUrl })
        return
      }
    }
    setViewQuote(q)
  }

  async function deleteQuote(q) {
    if (!confirm(`Delete this quote${q.vendor_name ? ` for ${q.vendor_name}` : ''}?`)) return
    if (q.file_path) await supabase.storage.from('sub-vendor-files').remove([q.file_path])
    await supabase.from('sub_vendor_quotes').delete().eq('id', q.id)
    load()
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 flex-shrink-0">
        <p className="text-sm font-semibold text-gray-700">
          Quotes {quotes.length > 0 && <span className="text-gray-400">({quotes.length})</span>}
        </p>
        <button
          onClick={() => setShowAdd(true)}
          className="btn-primary text-sm px-3 py-1.5 whitespace-nowrap"
        >
          + Add Quote
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 pb-6">
        {loading ? (
          <div className="flex justify-center py-16 text-gray-400 text-sm">Loading…</div>
        ) : quotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
            <p className="text-4xl mb-3">🧾</p>
            <p className="font-medium text-gray-500">No quotes yet</p>
            <p className="text-sm mt-1">Click “Add Quote” to request or record one.</p>
          </div>
        ) : (
          <div className="bg-white -mx-2 sm:mx-0 sm:rounded-xl border-y sm:border border-gray-200 overflow-x-hidden lg:overflow-x-auto">
            <table className="w-full text-xs table-fixed lg:table-auto lg:min-w-[720px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left text-gray-600 uppercase">
                  <th className="px-4 py-2 font-semibold">Vendor</th>
                  <th className="px-4 py-2 font-semibold hidden lg:table-cell">Job</th>
                  <th className="px-4 py-2 font-semibold text-right">Total</th>
                  <th className="px-4 py-2 font-semibold">Status</th>
                  <th className="px-4 py-2 font-semibold hidden lg:table-cell">Date</th>
                  <th className="px-4 py-2 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {quotes.map(q => (
                  <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2">
                      <button
                        onClick={() => openQuote(q)}
                        className="font-semibold text-green-700 hover:underline text-left"
                      >
                        {q.vendor_name || '—'}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-gray-600 hidden lg:table-cell truncate">
                      {q.job_name || '—'}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-gray-700">
                      {money(q.total)}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${
                          STATUS_BADGE[q.status] || STATUS_BADGE.draft
                        }`}
                      >
                        {q.status}
                        {q.file_path ? ' 📎' : ''}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-500 whitespace-nowrap hidden lg:table-cell">
                      {new Date(q.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => deleteQuote(q)}
                        className="text-gray-300 hover:text-red-500"
                        title="Delete quote"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && (
        <QuoteModal
          parties={parties}
          jobs={jobs}
          estimates={estimates}
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false)
            load()
          }}
          onVendorAdded={v => setParties(p => [...p, v].sort((a, b) => (a.company_name || '').localeCompare(b.company_name || '')))}
        />
      )}
      {viewQuote && <QuoteViewModal quote={viewQuote} onClose={() => setViewQuote(null)} />}
      {viewDoc && <DocViewerModal name={viewDoc.name} url={viewDoc.url} onClose={() => setViewDoc(null)} />}
    </div>
  )
}
