// ─────────────────────────────────────────────────────────────────────────────
// SubVendorContracts — the "Contracts" sub-tab of Subs & Vendors.
//
// • Table of all contracts signed with subs / vendors.
// • "Add Contract" → build one from a line-item form (item / qty / unit / unit
//   price / line total, with a running contract total), capture a drawn
//   signature + date, and the standard agreement language — OR upload an
//   existing contract file.
// • View a built contract in a read-only modal (printable), or open an uploaded
//   file in the in-app document viewer.
//
// Requires: table `sub_vendor_contracts` and the `sub-vendor-files` storage
// bucket (see supabase-sub-vendor-contracts.sql).
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import DocViewerModal from './DocViewerModal'
import { useModule } from '../platform'

const UNITS = ['Square Foot', 'Linear Feet', 'Each', 'Ton', 'Yard']

const money = v =>
  `$${(Number(v) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const todayISO = () => new Date().toISOString().split('T')[0]

const lineTotal = r => (Number(r.qty) || 0) * (Number(r.unit_price) || 0)
const contractTotal = rows => rows.reduce((s, r) => s + lineTotal(r), 0)

// The standard agreement clauses (snapshotted onto each contract when saved).
const AGREEMENT_CLAUSES = `1. Scope of Work
Subcontractor shall furnish all labor, materials, equipment, supervision, and services necessary to perform the Work described above in accordance with this Agreement and the Contract Documents. The Work includes all items reasonably inferable from the Contract Documents as necessary to produce the intended result, except for any stated exclusions.

2. Contract Documents
The "Contract Documents" consist of this Agreement; the plans, drawings, and specifications listed in Exhibit A; the Prime Contract to the extent applicable to the Work; and any written change orders or amendments. In the event of conflict, the order of precedence shall be: (1) this Agreement and its exhibits, (2) written change orders, (3) the plans and specifications, (4) the Prime Contract.

3. Contract Price
Contractor shall pay Subcontractor for full and complete performance of the Work the Contract Price stated above, subject to additions and deductions by written change order.

4. Payment
(a) Progress Payments. Payments are made within one week of being paid by the client for that portion of the work.
(b) Subcontractor shall perform the Work in a good and workmanlike manner, in conformance with the Contract Documents and all applicable laws, codes, permits, and regulations.
(c) Maintain a valid California contractor's license in the required classification at all times during performance.
(d) Supervise the Work with competent personnel and a designated foreman or superintendent.
(e) Comply with all applicable safety laws and regulations, including Cal/OSHA requirements, and with Contractor's site-specific safety program.
(f) Keep the site reasonably clean of debris arising from the Work and remove its rubbish upon completion.
(g) Promptly pay for all labor, materials, equipment, and sub-tier work used in performance of the Work, and indemnify Contractor against liens arising from Subcontractor's failure to pay sums Contractor has paid to Subcontractor.

8. Contractor's Obligations
(h) Make payments to Subcontractor as provided in this Agreement.
(i) Provide Subcontractor with reasonable access to the site and coordinate the work of other trades so as not to unreasonably delay or interfere with the Work.
(j) Provide project schedules, drawings, and other information reasonably necessary for performance of the Work.

9. Insurance
Before commencing the Work, Subcontractor shall procure and maintain, at its expense, Commercial General Liability, Automobile Liability, Workers' Compensation as required by California law and Employer's Liability, and, if required, Excess/Umbrella Liability. Contractor and Owner shall be named as additional insureds on the CGL policy on a primary and non-contributory basis, with a waiver of subrogation in favor of Contractor. Certificates of insurance and required endorsements shall be furnished before mobilization.

10. Indemnification
To the fullest extent permitted by law, Subcontractor shall defend, indemnify, and hold harmless Contractor and Owner from claims, damages, losses, and expenses (including reasonable attorneys' fees) arising out of or resulting from performance of the Work, but only to the extent caused by the negligent acts or omissions of Subcontractor, its sub-tier subcontractors, or anyone for whose acts Subcontractor is liable. This indemnity is intended to comply with California Civil Code § 2782 et seq.

11. Warranty
Subcontractor warrants that the Work will be free from defects in materials and workmanship for the period required by the Prime Contract or applicable law. Subcontractor shall promptly correct defective Work at its own expense upon written notice.

12. Termination
(k) For Default. If Subcontractor fails to perform and does not cure within the stated notice period, Contractor may terminate this Agreement for default and complete the Work, charging the reasonable cost of completion against sums otherwise due. If Contractor fails to make payment when due and does not cure, Subcontractor may suspend the Work or terminate and recover payment for Work performed, including reasonable demobilization costs.
(l) For Convenience. Contractor may terminate this Agreement for convenience upon written notice, in which case Subcontractor shall be paid for Work properly performed to the date of termination plus reasonable, documented demobilization costs, but not anticipated profit on unperformed Work.

13. Disputes
The parties shall first attempt in good faith to resolve any dispute by direct negotiation. The prevailing party shall be entitled to recover its reasonable attorneys' fees and costs. Nothing in this section waives or limits either party's statutory rights, including mechanics lien, stop payment notice, and prompt payment rights.

14. Miscellaneous
(m) Independent Contractor. Subcontractor is an independent contractor and not an employee or agent of Contractor.
(n) Assignment. Neither party may assign this Agreement without the other party's written consent.
(o) Notices. Notices shall be in writing and delivered personally, by certified mail, or by email with confirmation.
(p) Governing Law. This Agreement is governed by the laws of the State of California.
(q) Severability. If any provision is held unenforceable, the remainder of this Agreement remains in effect.
(r) Entire Agreement. This Agreement, with its exhibits, constitutes the entire agreement between the parties regarding the Work and supersedes all prior negotiations and understandings. It may be amended only in a writing signed by both parties.`

// ── Signature pad ─────────────────────────────────────────────────────────────
function SignaturePad({ value, onChange }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const last = useRef(null)

  // Paint an existing signature (edit mode) onto the canvas once mounted.
  useEffect(() => {
    if (!value || !canvasRef.current) return
    const img = new Image()
    img.onload = () => {
      const ctx = canvasRef.current.getContext('2d')
      ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height)
    }
    img.src = value
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function point(e) {
    const c = canvasRef.current
    const r = c.getBoundingClientRect()
    const t = e.touches ? e.touches[0] : e
    return {
      x: (t.clientX - r.left) * (c.width / r.width),
      y: (t.clientY - r.top) * (c.height / r.height),
    }
  }
  function start(e) {
    e.preventDefault()
    drawing.current = true
    last.current = point(e)
  }
  function move(e) {
    if (!drawing.current) return
    e.preventDefault()
    const p = point(e)
    const ctx = canvasRef.current.getContext('2d')
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#111827'
    ctx.beginPath()
    ctx.moveTo(last.current.x, last.current.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    last.current = p
  }
  function end() {
    if (!drawing.current) return
    drawing.current = false
    onChange(canvasRef.current.toDataURL('image/png'))
  }
  function clear() {
    const c = canvasRef.current
    c.getContext('2d').clearRect(0, 0, c.width, c.height)
    onChange('')
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={600}
        height={180}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
        className="w-full h-44 bg-white border border-gray-300 rounded-lg touch-none cursor-crosshair"
        style={{ touchAction: 'none' }}
      />
      <div className="flex justify-between items-center mt-1">
        <span className="text-[11px] text-gray-400">Sign above with your finger or mouse</span>
        <button
          type="button"
          onClick={clear}
          className="text-xs text-gray-500 hover:text-red-600"
        >
          Clear
        </button>
      </div>
    </div>
  )
}

// ── Add / Edit contract modal ─────────────────────────────────────────────────
const blankRow = () => ({ item: '', qty: '', unit: 'Each', unit_price: '' })

function ContractModal({ parties, jobs, onClose, onSaved }) {
  // Linking a contract to a job/work order requires the Contractor package.
  // Without it, the optional assignment block is hidden (contracts save fine
  // standalone — job_id stays null).
  const canJobs = useModule('/jobs')
  const [mode, setMode] = useState('build') // 'build' | 'upload'
  const [partyId, setPartyId] = useState('')
  const [jobId, setJobId] = useState('')
  const [woId, setWoId] = useState('')
  const [workOrders, setWorkOrders] = useState([])
  const [woLoading, setWoLoading] = useState(false)
  const [rows, setRows] = useState([blankRow(), blankRow(), blankRow()])
  const [scope, setScope] = useState('')
  const [exclusions, setExclusions] = useState('')
  const [signature, setSignature] = useState('')
  const [signerName, setSignerName] = useState('')
  const [signedDate, setSignedDate] = useState(todayISO())
  const [uploadFile, setUploadFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const party = parties.find(p => p.id === partyId)
  const job = jobs.find(j => j.id === jobId)
  const total = contractTotal(rows)

  const jobLabel = j =>
    [j.client_name, j.job_address].filter(Boolean).join(' — ') || j.client_name || 'Job'
  const woLabel = w =>
    [w.module_type, w.project_name].filter(Boolean).join(' — ') || w.module_type || 'Work Order'

  // Load the selected job's work orders so the user can assign one.
  useEffect(() => {
    if (!jobId) {
      setWorkOrders([])
      setWoId('')
      return
    }
    let alive = true
    setWoLoading(true)
    supabase
      .from('work_orders')
      .select('id, module_type, project_name, status')
      .eq('job_id', jobId)
      .order('created_at')
      .then(({ data }) => {
        if (!alive) return
        setWorkOrders(data || [])
        setWoLoading(false)
      })
    return () => {
      alive = false
    }
  }, [jobId])

  const setRow = (i, patch) => setRows(rs => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const addRow = () => setRows(rs => [...rs, blankRow()])
  const removeRow = i => setRows(rs => (rs.length > 1 ? rs.filter((_, idx) => idx !== i) : rs))

  async function handleSave() {
    if (!partyId) {
      setError('Pick the subcontractor or vendor this contract is with.')
      return
    }
    setSaving(true)
    setError('')

    const selectedWo = workOrders.find(w => w.id === woId)
    const base = {
      sub_vendor_id: partyId,
      party_type: party?.type || null,
      party_name: party?.company_name || null,
      job_id: jobId || null,
      job_name: job ? jobLabel(job) : null,
      work_order_id: woId || null,
      work_order_label: selectedWo ? woLabel(selectedWo) : null,
      kind: mode,
      updated_at: new Date().toISOString(),
    }

    let payload
    if (mode === 'upload') {
      if (!uploadFile) {
        setError('Choose a contract file to upload.')
        setSaving(false)
        return
      }
      const safe = uploadFile.name.replace(/[^\w.\-]+/g, '_')
      const path = `contracts/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`
      const { error: upErr } = await supabase.storage
        .from('sub-vendor-files')
        .upload(path, uploadFile, { upsert: false, contentType: uploadFile.type })
      if (upErr) {
        setError('Upload failed: ' + upErr.message)
        setSaving(false)
        return
      }
      payload = { ...base, file_path: path, file_name: uploadFile.name, total: 0 }
    } else {
      const cleanRows = rows
        .filter(r => r.item.trim())
        .map(r => ({
          item: r.item.trim(),
          qty: Number(r.qty) || 0,
          unit: r.unit,
          unit_price: Number(r.unit_price) || 0,
          total: lineTotal(r),
        }))
      if (cleanRows.length === 0) {
        setError('Add at least one line item.')
        setSaving(false)
        return
      }
      payload = {
        ...base,
        line_items: cleanRows,
        total,
        scope_of_work: scope.trim() || null,
        exclusions: exclusions.trim() || null,
        agreement_text: AGREEMENT_CLAUSES,
        signature_data: signature || null,
        signer_name: signerName.trim() || null,
        signed_date: signedDate || null,
      }
    }

    const { error: insErr } = await supabase.from('sub_vendor_contracts').insert(payload)
    setSaving(false)
    if (insErr) {
      setError('Save failed: ' + insErr.message)
      return
    }
    onSaved()
  }

  const grouped = {
    sub: parties.filter(p => p.type === 'sub'),
    vendor: parties.filter(p => p.type === 'vendor'),
  }

  return (
    <div
      className="fixed inset-x-0 top-0 h-[100dvh] z-[60] flex items-end sm:items-center justify-center bg-black/50"
      onMouseDown={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-3xl mx-0 sm:mx-4 flex flex-col max-h-[95dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900">New Contract</h2>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-2xl leading-none px-1">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-5 space-y-5">
          {/* Party picker */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Contract with <span className="text-red-400">*</span>
            </label>
            <select
              value={partyId}
              onChange={e => setPartyId(e.target.value)}
              className="input text-sm w-full"
            >
              <option value="">Select a subcontractor or vendor…</option>
              {grouped.sub.length > 0 && (
                <optgroup label="Subcontractors">
                  {grouped.sub.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.company_name}
                    </option>
                  ))}
                </optgroup>
              )}
              {grouped.vendor.length > 0 && (
                <optgroup label="Vendors">
                  {grouped.vendor.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.company_name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Job + Work Order assignment — only with the Contractor package */}
          {canJobs && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Assign to Job</label>
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
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Work Order <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <select
                value={woId}
                onChange={e => setWoId(e.target.value)}
                disabled={!jobId || woLoading}
                className="input text-sm w-full disabled:bg-gray-50 disabled:text-gray-400"
              >
                <option value="">
                  {!jobId
                    ? 'Select a job first…'
                    : woLoading
                      ? 'Loading…'
                      : workOrders.length === 0
                        ? 'No work orders for this job'
                        : '— None —'}
                </option>
                {workOrders.map(w => (
                  <option key={w.id} value={w.id}>
                    {woLabel(w)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          )}

          {/* Mode toggle */}
          <div className="flex gap-2">
            {[
              { key: 'build', label: '📝 Build a contract' },
              { key: 'upload', label: '⬆ Upload a file' },
            ].map(o => (
              <button
                key={o.key}
                type="button"
                onClick={() => setMode(o.key)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                  mode === o.key
                    ? 'border-green-700 bg-green-50 text-green-800'
                    : 'border-gray-200 text-gray-500 hover:border-green-400'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>

          {mode === 'upload' ? (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Contract file (PDF, Word, etc.)
              </label>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                onChange={e => setUploadFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full border border-dashed border-gray-300 rounded-lg py-3 text-sm font-medium text-gray-500 hover:border-green-500 hover:text-green-700"
              >
                {uploadFile ? `📎 ${uploadFile.name}` : '⬆ Choose contract file'}
              </button>
            </div>
          ) : (
            <>
              {/* Line items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Contracted Items
                  </label>
                  <button
                    type="button"
                    onClick={addRow}
                    className="text-xs font-semibold text-green-700 hover:text-green-900"
                  >
                    + Add Row
                  </button>
                </div>

                {/* Column headers (desktop) */}
                <div className="hidden sm:grid grid-cols-12 gap-2 px-1 mb-1 text-[10px] font-semibold uppercase text-gray-400">
                  <span className="col-span-4">Item</span>
                  <span className="col-span-2">Qty</span>
                  <span className="col-span-2">Unit</span>
                  <span className="col-span-2">Unit Price</span>
                  <span className="col-span-2 text-right">Line Total</span>
                </div>

                <div className="space-y-2">
                  {rows.map((r, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-12 gap-2 items-center bg-gray-50 sm:bg-transparent rounded-lg sm:rounded-none p-2 sm:p-0"
                    >
                      <input
                        value={r.item}
                        onChange={e => setRow(i, { item: e.target.value })}
                        placeholder="Item / description"
                        className="input text-sm col-span-12 sm:col-span-4"
                      />
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={r.qty}
                        onChange={e => setRow(i, { qty: e.target.value })}
                        placeholder="Qty"
                        className="input text-sm col-span-3 sm:col-span-2"
                      />
                      <select
                        value={r.unit}
                        onChange={e => setRow(i, { unit: e.target.value })}
                        className="input text-sm col-span-5 sm:col-span-2"
                      >
                        {UNITS.map(u => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={r.unit_price}
                        onChange={e => setRow(i, { unit_price: e.target.value })}
                        placeholder="$"
                        className="input text-sm col-span-4 sm:col-span-2"
                      />
                      <div className="col-span-6 sm:col-span-2 text-right text-sm font-semibold text-gray-700 tabular-nums">
                        {money(lineTotal(r))}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        className="col-span-2 sm:hidden text-right text-red-300 hover:text-red-500 text-sm"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end items-center gap-3 mt-3 pt-3 border-t border-gray-200">
                  <span className="text-sm font-semibold text-gray-500">Contract Total</span>
                  <span className="text-lg font-bold text-green-700 tabular-nums">{money(total)}</span>
                </div>
              </div>

              {/* Scope + exclusions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Scope of Work</label>
                  <textarea
                    rows={3}
                    value={scope}
                    onChange={e => setScope(e.target.value)}
                    placeholder="Describe the work to be performed…"
                    className="input text-sm w-full resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Exclusions</label>
                  <textarea
                    rows={3}
                    value={exclusions}
                    onChange={e => setExclusions(e.target.value)}
                    placeholder="Anything specifically excluded…"
                    className="input text-sm w-full resize-none"
                  />
                </div>
              </div>

              {/* Signature */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Signature
                  </label>
                  <span className="text-xs text-gray-500">
                    Date:{' '}
                    <input
                      type="date"
                      value={signedDate}
                      onChange={e => setSignedDate(e.target.value)}
                      className="border border-gray-200 rounded px-1.5 py-0.5 text-xs"
                    />
                  </span>
                </div>
                <SignaturePad value={signature} onChange={setSignature} />
                <input
                  value={signerName}
                  onChange={e => setSignerName(e.target.value)}
                  placeholder="Printed name of signer"
                  className="input text-sm w-full mt-2"
                />
              </div>

              {/* Agreement language */}
              <div className="border-t border-gray-100 pt-4">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                  Agreement Terms
                </label>
                <div className="max-h-48 overflow-y-auto overscroll-contain bg-gray-50 border border-gray-200 rounded-lg p-3 text-[11px] leading-relaxed text-gray-600 whitespace-pre-wrap">
                  {AGREEMENT_CLAUSES}
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  These standard terms are saved with the contract.
                </p>
              </div>
            </>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 flex gap-2 flex-shrink-0 border-t border-gray-100">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 btn-primary text-sm py-3 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Contract'}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-3 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── View a built contract ─────────────────────────────────────────────────────
function ContractViewModal({ contract, onClose }) {
  const rows = Array.isArray(contract.line_items) ? contract.line_items : []
  return (
    <div
      className="fixed inset-x-0 top-0 h-[100dvh] z-[60] flex items-end sm:items-center justify-center bg-black/50"
      onMouseDown={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl mx-0 sm:mx-4 flex flex-col max-h-[95dvh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-gray-900 truncate">Contract — {contract.party_name}</h2>
            <p className="text-xs text-gray-400">
              {contract.signed_date ? new Date(contract.signed_date + 'T00:00:00').toLocaleDateString() : '—'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-2xl leading-none px-1">
            ✕
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-5 space-y-4">
          {(contract.job_name || contract.work_order_label) && (
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              {contract.job_name && (
                <p className="text-gray-700">
                  <span className="text-xs font-semibold text-gray-400 uppercase mr-1.5">Job</span>
                  {contract.job_name}
                </p>
              )}
              {contract.work_order_label && (
                <p className="text-gray-700">
                  <span className="text-xs font-semibold text-gray-400 uppercase mr-1.5">
                    Work Order
                  </span>
                  {contract.work_order_label}
                </p>
              )}
            </div>
          )}
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase text-gray-400 border-b border-gray-200">
                <th className="py-1.5">Item</th>
                <th className="py-1.5 text-right">Qty</th>
                <th className="py-1.5">Unit</th>
                <th className="py-1.5 text-right">Unit Price</th>
                <th className="py-1.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="py-1.5 pr-2">{r.item}</td>
                  <td className="py-1.5 text-right tabular-nums">{r.qty}</td>
                  <td className="py-1.5">{r.unit}</td>
                  <td className="py-1.5 text-right tabular-nums">{money(r.unit_price)}</td>
                  <td className="py-1.5 text-right tabular-nums font-semibold">{money(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
            <span className="text-sm font-semibold text-gray-500">Contract Total</span>
            <span className="text-lg font-bold text-green-700 tabular-nums">{money(contract.total)}</span>
          </div>

          {contract.scope_of_work && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Scope of Work</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{contract.scope_of_work}</p>
            </div>
          )}
          {contract.exclusions && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Exclusions</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{contract.exclusions}</p>
            </div>
          )}

          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Signature</p>
            {contract.signature_data ? (
              <img
                src={contract.signature_data}
                alt="Signature"
                className="h-24 bg-white border border-gray-200 rounded-lg"
              />
            ) : (
              <p className="text-sm text-gray-400 italic">Not signed.</p>
            )}
            {contract.signer_name && (
              <p className="text-sm text-gray-700 mt-1">{contract.signer_name}</p>
            )}
          </div>

          {contract.agreement_text && (
            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Agreement Terms</p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-[11px] leading-relaxed text-gray-600 whitespace-pre-wrap">
                {contract.agreement_text}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SubVendorContracts() {
  const [contracts, setContracts] = useState([])
  const [parties, setParties] = useState([])
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [viewBuilt, setViewBuilt] = useState(null)
  const [viewDoc, setViewDoc] = useState(null) // { name, url }

  async function load() {
    setLoading(true)
    const [cRes, pRes, jRes] = await Promise.all([
      supabase.from('sub_vendor_contracts').select('*').order('created_at', { ascending: false }),
      supabase.from('subs_vendors').select('id, company_name, type').order('company_name'),
      supabase.from('jobs').select('id, client_name, job_address, status').order('client_name'),
    ])
    setContracts(cRes.data || [])
    setParties(pRes.data || [])
    setJobs(
      (jRes.data || []).filter(j => j.status === 'active' || j.status === 'on_hold' || !j.status)
    )
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [])

  async function openContract(c) {
    if (c.kind === 'uploaded' && c.file_path) {
      const { data } = await supabase.storage
        .from('sub-vendor-files')
        .createSignedUrl(c.file_path, 3600)
      if (data?.signedUrl) setViewDoc({ name: c.file_name || 'Contract', url: data.signedUrl })
      return
    }
    setViewBuilt(c)
  }

  async function deleteContract(c) {
    if (!confirm(`Delete this contract with ${c.party_name}?`)) return
    if (c.file_path) await supabase.storage.from('sub-vendor-files').remove([c.file_path])
    await supabase.from('sub_vendor_contracts').delete().eq('id', c.id)
    load()
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 flex-shrink-0">
        <p className="text-sm font-semibold text-gray-700">
          Contracts {contracts.length > 0 && <span className="text-gray-400">({contracts.length})</span>}
        </p>
        <button
          onClick={() => setShowAdd(true)}
          className="btn-primary text-sm px-3 py-1.5 whitespace-nowrap"
        >
          + Add Contract
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 pb-6">
        {loading ? (
          <div className="flex justify-center py-16 text-gray-400 text-sm">Loading…</div>
        ) : contracts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
            <p className="text-4xl mb-3">📑</p>
            <p className="font-medium text-gray-500">No contracts yet</p>
            <p className="text-sm mt-1">Click “Add Contract” to create or upload one.</p>
          </div>
        ) : (
          <div className="bg-white -mx-2 sm:mx-0 sm:rounded-xl border-y sm:border border-gray-200 overflow-x-hidden lg:overflow-x-auto">
            <table className="contracts-table w-full text-xs table-fixed lg:table-auto lg:min-w-[720px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left text-gray-600 uppercase">
                  <th className="px-4 py-2 font-semibold">Party</th>
                  <th className="px-4 py-2 font-semibold">Type</th>
                  <th className="px-4 py-2 font-semibold text-right">Total</th>
                  <th className="px-4 py-2 font-semibold">Date</th>
                  <th className="px-4 py-2 font-semibold hidden lg:table-cell">Source</th>
                  <th className="px-4 py-2 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {contracts.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2">
                      <button
                        onClick={() => openContract(c)}
                        className="font-semibold text-green-700 hover:underline text-left"
                      >
                        {c.party_name || '—'}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-gray-600 capitalize">{c.party_type || '—'}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-gray-700">
                      {c.kind === 'uploaded' ? '—' : money(c.total)}
                    </td>
                    <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                      {c.signed_date
                        ? new Date(c.signed_date + 'T00:00:00').toLocaleDateString()
                        : new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 hidden lg:table-cell">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          c.kind === 'uploaded'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-green-50 text-green-700 border-green-200'
                        }`}
                      >
                        {c.kind === 'uploaded' ? '📎 Uploaded' : '📝 Built'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => deleteContract(c)}
                        className="text-gray-300 hover:text-red-500"
                        title="Delete contract"
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
        <ContractModal
          parties={parties}
          jobs={jobs}
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false)
            load()
          }}
        />
      )}
      {viewBuilt && <ContractViewModal contract={viewBuilt} onClose={() => setViewBuilt(null)} />}
      {viewDoc && (
        <DocViewerModal name={viewDoc.name} url={viewDoc.url} onClose={() => setViewDoc(null)} />
      )}
    </div>
  )
}
