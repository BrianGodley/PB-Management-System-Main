// src/components/CODetailModal.jsx
//
// Lightweight Change Order detail modal. Shows + edits:
//   - Title
//   - Scope of Work (rich-ish text, stored as HTML in scope_of_work_html)
//   - CO ID# (per-job sequential, set on first save)
//   - Attachments (job_files rows with bid_id set)
//   - Pricing summary + link to open the modular estimator panel
//   - Approve flow → SignatureModal → saves signature data
//   - Print / Email / Text actions
//
// The modular estimator (COEstimatePanel) is opened via the parent's
// onOpenEstimator callback so it can render full-page outside this modal.
//
// Props:
//   co         — { id, co_name, custom_co_id, scope_of_work_html, bid_amount,
//                  gross_profit, gpmd, status, signed_at, signed_by_name, ... }
//                Pass null to open in "new CO" mode.
//   job        — the parent job row { id, name, client_name }
//   onClose    — () => void
//   onSaved    — (savedCO) => void   called after every save with refreshed row
//   onDeleted  — (coId) => void
//   onOpenEstimator — (co) => void   opens the modular estimator for pricing
//   onSent     — () => void          called when the user emails/prints/texts the CO

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import SignatureModal from './SignatureModal'
import CONotifyDialog from './CONotifyDialog'

const STORAGE_BUCKET = 'job-files'

export default function CODetailModal({
  co,
  job,
  onClose,
  onSaved,
  onDeleted,
  onOpenEstimator,
  onSent,
}) {
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showSig, setShowSig] = useState(false)

  // Editable fields
  const [title, setTitle] = useState(co?.co_name || '')
  // Edit plain text (stripped from any stored HTML once, on open). Running the
  // strip on every render would .trim() the value mid-typing and eat spaces.
  const [scope, setScope] = useState(stripHtmlForEdit(co?.scope_of_work_html || ''))
  const [bidAmount, setBidAmount] = useState(co?.bid_amount || '')

  // Local copy of co for live updates (after save / release / etc.)
  const [coState, setCoState] = useState(co)

  // isNew tracks "no row yet" — flips false the moment we create it, so the
  // footer switches from [Save] to the unreleased button set after first save.
  const isNew = !coState?.id

  // ── Change-order lifecycle ────────────────────────────────────────────────
  // unreleased -> (Release) -> pending -> client approves/declines in portal.
  const status = coState?.status || (isNew ? 'unreleased' : 'unreleased')
  const isApproved = status === 'sold'
  const isDeclined = status === 'lost'
  const isPending = status === 'pending' || status === 'presented'
  const isUnreleased = !isApproved && !isDeclined && !isPending // covers 'unreleased' + legacy
  const isTerminal = isApproved || isDeclined

  // Editing gate: new COs are editable; existing ones only after clicking Edit,
  // and only while unreleased (released/approved COs can't be edited).
  const [editing, setEditing] = useState(isNew)
  const canEdit = isNew || (isUnreleased && editing)

  // Release / resend notification dialog: null | 'release' | 'resend'
  const [notifyMode, setNotifyMode] = useState(null)

  // Manual vs estimator. New COs created here are always manual (estimator COs
  // are built in COEstimatePanel). Existing rows carry co_method; legacy rows
  // (null) are treated as estimator so they keep the detailed-estimator link.
  const isManual = (coState?.co_method || (isNew ? 'manual' : 'estimator')) === 'manual'

  // For estimator COs: labor hours + materials rolled up from the estimate's
  // modules (man-days × 8 = hours). Total + GP come from the saved bid.
  const [estSummary, setEstSummary] = useState({ laborHours: 0, materials: 0 })
  useEffect(() => {
    let alive = true
    if (isManual || !coState?.estimate_id) {
      setEstSummary({ laborHours: 0, materials: 0 })
      return
    }
    ;(async () => {
      const { data: projs } = await supabase
        .from('estimate_projects')
        .select('estimate_modules(man_days, material_cost)')
        .eq('estimate_id', coState.estimate_id)
      if (!alive) return
      let md = 0
      let mat = 0
      for (const p of projs || []) {
        for (const m of p.estimate_modules || []) {
          md += parseFloat(m.man_days || 0)
          mat += parseFloat(m.material_cost || 0)
        }
      }
      setEstSummary({ laborHours: md * 8, materials: mat })
    })()
    return () => {
      alive = false
    }
  }, [isManual, coState?.estimate_id])

  // Manual CO line items: [{ item, labor_hours, material_cost }]
  const [lineItems, setLineItems] = useState(() => {
    const li = co?.co_line_items
    return Array.isArray(li) && li.length
      ? li.map(r => ({
          item: r.item || '',
          labor_hours: r.labor_hours ?? '',
          material_cost: r.material_cost ?? '',
        }))
      : [{ item: '', labor_hours: '', material_cost: '' }]
  })
  function updateLineItem(i, field, value) {
    setLineItems(prev => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)))
  }
  function addLineItem() {
    setLineItems(prev => [...prev, { item: '', labor_hours: '', material_cost: '' }])
  }
  function removeLineItem(i) {
    setLineItems(prev => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)))
  }
  // Drop empty rows + coerce numbers for storage.
  function cleanLineItems() {
    return lineItems
      .filter(r => (r.item || '').trim() || r.labor_hours !== '' || r.material_cost !== '')
      .map(r => ({
        item: (r.item || '').trim(),
        labor_hours: parseFloat(r.labor_hours) || 0,
        material_cost: parseFloat(r.material_cost) || 0,
      }))
  }
  const itemsLaborTotal = lineItems.reduce((s, r) => s + (parseFloat(r.labor_hours) || 0), 0)
  const itemsMaterialTotal = lineItems.reduce((s, r) => s + (parseFloat(r.material_cost) || 0), 0)

  // When a CO is approved it becomes a single work order for the job.
  async function createWorkOrderForCO(coRow) {
    if (!coRow?.id || !job?.id) return
    try {
      const { data: existing } = await supabase
        .from('work_orders')
        .select('id')
        .eq('source_change_order_id', coRow.id)
        .limit(1)
      if (existing && existing.length) return // already created
      const items = Array.isArray(coRow.co_line_items) ? coRow.co_line_items : []
      const laborHours = items.reduce((s, r) => s + (parseFloat(r.labor_hours) || 0), 0)
      const materialCost = items.reduce((s, r) => s + (parseFloat(r.material_cost) || 0), 0)
      await supabase.from('work_orders').insert({
        job_id: job.id,
        project_name: coRow.co_name || 'Change Order',
        module_type: 'Change Order',
        is_manual: true,
        labor_hours: laborHours,
        material_cost: materialCost,
        total_price: parseFloat(coRow.bid_amount) || 0,
        status: 'pending',
        notes: `From Change Order #${coRow.custom_co_id || ''}`.trim(),
        source_change_order_id: coRow.id,
      })
    } catch {
      /* non-fatal: approval still succeeds even if work-order creation fails */
    }
  }

  // Attachments
  const [attachments, setAttachments] = useState([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (coState?.id) loadAttachments(coState.id)
  }, [coState?.id])

  async function loadAttachments(bidId) {
    const { data } = await supabase
      .from('job_files')
      .select('id, file_name, file_type, file_size, storage_path, uploaded_at')
      .eq('bid_id', bidId)
      .order('uploaded_at', { ascending: false })
    setAttachments(data || [])
  }

  // Compute the next custom_co_id for this job (max + 1, defaults to 1).
  async function nextCustomCoId() {
    const { data } = await supabase
      .from('bids')
      .select('custom_co_id')
      .eq('linked_job_id', job.id)
      .eq('record_type', 'change_order')
      .order('custom_co_id', { ascending: false })
      .limit(1)
    return (data?.[0]?.custom_co_id || 0) + 1
  }

  // Save creates the CO if new (with paired estimate), otherwise updates.
  async function handleSave() {
    if (!title.trim()) {
      setError('Title is required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      if (isNew) {
        // 1. Create paired estimate
        const { data: est, error: eErr } = await supabase
          .from('estimates')
          .insert({
            estimate_name: title.trim(),
            client_name: job.client_name || job.name || '',
            status: 'draft',
            created_by: user?.id,
          })
          .select('id')
          .single()
        if (eErr) throw new Error(eErr.message)

        // 2. Create the CO bid
        const customCoId = await nextCustomCoId()
        const { data: bid, error: bErr } = await supabase
          .from('bids')
          .insert({
            record_type: 'change_order',
            linked_job_id: job.id,
            co_name: title.trim(),
            scope_of_work_html: scope || null,
            custom_co_id: customCoId,
            client_name: job.client_name || job.name || '',
            bid_amount: parseFloat(bidAmount) || 0,
            gross_profit: 0,
            gpmd: 0,
            date_submitted: new Date().toISOString().slice(0, 10),
            status: 'unreleased',
            estimate_id: est.id,
            notes: '',
            projects: [],
            co_method: 'manual',
            co_line_items: cleanLineItems(),
            created_by: user?.id,
          })
          .select('*')
          .single()
        if (bErr) throw new Error(bErr.message)
        setCoState(bid)
        onSaved && onSaved(bid)
      } else {
        // Update existing
        const { data: bid, error: bErr } = await supabase
          .from('bids')
          .update({
            co_name: title.trim(),
            scope_of_work_html: scope || null,
            bid_amount: parseFloat(bidAmount) || 0,
            ...(isManual ? { co_line_items: cleanLineItems() } : {}),
          })
          .eq('id', coState.id)
          .select('*')
          .single()
        if (bErr) throw new Error(bErr.message)
        setCoState(bid)
        onSaved && onSaved(bid)
      }
      setEditing(false) // back to read-only after a save
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
    setSaving(false)
  }

  // Release / unrelease + notification lifecycle.
  async function setStatus(newStatus, extra = {}) {
    if (!coState?.id) return null
    const { data: bid, error: e } = await supabase
      .from('bids')
      .update({ status: newStatus, ...extra })
      .eq('id', coState.id)
      .select('*')
      .single()
    if (e) {
      setError(e.message)
      return null
    }
    setCoState(bid)
    onSaved && onSaved(bid)
    return bid
  }

  // Fetch the client's email + cell for notifications (via the job's client).
  async function fetchClientContact() {
    let clientId = job?.client_id || null
    if (!clientId && job?.id) {
      const { data: j } = await supabase.from('jobs').select('client_id').eq('id', job.id).single()
      clientId = j?.client_id || null
    }
    if (clientId) {
      const { data: c } = await supabase
        .from('clients')
        .select('email, cell, phone, name')
        .eq('id', clientId)
        .single()
      if (c) return { email: c.email || '', cell: c.cell || c.phone || '' }
    }
    return { email: '', cell: '' }
  }

  // Send the client a notification that a CO is awaiting their approval.
  async function sendClientNotification(method) {
    const { email, cell } = await fetchClientContact()
    const portalUrl = `${window.location.origin}/client-portal`
    const amount = `$${Number(coState.bid_amount || 0).toLocaleString()}`
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const base = import.meta.env.VITE_SUPABASE_URL
    const auth = { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
    const results = []
    if ((method === 'email' || method === 'both') && email) {
      const res = await fetch(`${base}/functions/v1/send-email`, {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({
          to: email,
          subject: `Change Order #${coState.custom_co_id || ''} — approval requested`,
          html:
            buildPrintableHtml(coState, job) +
            `<p style="margin-top:16px">Please review and approve this change order in your client portal: <a href="${portalUrl}">${portalUrl}</a></p>`,
        }),
      })
      results.push(res.ok)
    }
    if ((method === 'text' || method === 'both') && cell) {
      const res = await fetch(`${base}/functions/v1/send-sms`, {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({
          to: cell,
          body: `${job.client_name || job.name}: Change Order #${coState.custom_co_id || ''} (${amount}) is awaiting your approval. Review it in your client portal: ${portalUrl}`,
        }),
      })
      results.push(res.ok)
    }
    if (results.length === 0) {
      throw new Error('No client contact on file for the selected method.')
    }
  }

  // Release: notify the client + flip to pending (visible in portal). Resend:
  // notify only (status unchanged — no duplicate portal entry).
  async function handleNotifySend(method) {
    setSaving(true)
    setError('')
    try {
      await sendClientNotification(method)
      if (notifyMode === 'release') {
        await setStatus('pending')
      }
      setNotifyMode(null)
      onSent && onSent()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
    setSaving(false)
  }

  async function handleUnrelease() {
    setSaving(true)
    setError('')
    await setStatus('unreleased')
    setSaving(false)
  }

  // Office-side decline of a pending CO (mirrors the client's decline).
  async function handleDecline() {
    const reason = window.prompt('Reason for declining this change order:')
    if (reason === null) return // cancelled
    setSaving(true)
    setError('')
    await setStatus('lost', { co_decline_reason: reason.trim() || null })
    setSaving(false)
  }

  // Revert an approved CO back to pending: clear the signature and remove the
  // work order that approval created (so it isn't left orphaned on the job).
  async function handleUnapprove() {
    if (!coState?.id) return
    setSaving(true)
    setError('')
    try {
      await setStatus('pending', {
        signed_at: null,
        signed_by_name: null,
        signature_data_url: null,
      })
      await supabase.from('work_orders').delete().eq('source_change_order_id', coState.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!coState?.id) return
    if (!confirm(`Delete change order #${coState.custom_co_id || '?'} ("${coState.co_name}")?`))
      return
    if (coState.estimate_id) await supabase.from('estimates').delete().eq('id', coState.estimate_id)
    await supabase.from('bids').delete().eq('id', coState.id)
    onDeleted && onDeleted(coState.id)
    onClose()
  }

  // Approve flow: opens signature modal, then on confirm writes signature
  // fields + flips status to 'sold' (which represents "approved" for COs)
  async function handleSignatureComplete({ dataUrl, signedByName }) {
    setShowSig(false)
    setSaving(true)
    setError('')
    try {
      const { data: bid, error: bErr } = await supabase
        .from('bids')
        .update({
          status: 'sold',
          signed_at: new Date().toISOString(),
          signed_by_name: signedByName || null,
          signature_data_url: dataUrl,
        })
        .eq('id', coState.id)
        .select('*')
        .single()
      if (bErr) throw new Error(bErr.message)
      setCoState(bid)
      onSaved && onSaved(bid)
      // Approved CO becomes a single work order for the job.
      await createWorkOrderForCO(bid)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
    setSaving(false)
  }

  // Attachment upload — drops file into Supabase Storage at a deterministic
  // path, then inserts a job_files row with bid_id set so it shows up here.
  async function handleAttachmentUpload(e) {
    const file = e.target.files?.[0]
    if (!file || !coState?.id) return
    setUploading(true)
    setError('')
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `co-attachments/${coState.id}/${Date.now()}_${safeName}`
      const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      })
      if (upErr) throw new Error(upErr.message)
      const { error: insErr } = await supabase.from('job_files').insert({
        job_id: job.id,
        bid_id: coState.id,
        file_name: file.name,
        file_type: file.type,
        file_category: 'document',
        storage_path: path,
        file_size: file.size,
        uploaded_by: user?.id,
      })
      if (insErr) throw new Error(insErr.message)
      await loadAttachments(coState.id)
    } catch (err) {
      setError('Upload failed: ' + (err instanceof Error ? err.message : String(err)))
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleAttachmentDelete(att) {
    if (!confirm(`Remove "${att.file_name}"?`)) return
    await supabase.storage.from(STORAGE_BUCKET).remove([att.storage_path])
    await supabase.from('job_files').delete().eq('id', att.id)
    setAttachments(prev => prev.filter(a => a.id !== att.id))
  }

  async function attachmentDownloadUrl(att) {
    const { data } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(att.storage_path, 60 * 5)
    return data?.signedUrl
  }

  // ── Print: opens a new window with a printable CO layout ─────────────────
  function handlePrint() {
    if (!coState) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Pop-up blocked — allow popups to print.')
      return
    }
    printWindow.document.write(buildPrintableHtml(coState, job))
    printWindow.document.close()
    setTimeout(() => {
      printWindow.print()
    }, 300)
    onSent && onSent()
  }

  // ── Email: send-email edge function with the same printable HTML ─────────
  async function handleEmail() {
    if (!coState) return
    const to = prompt('Email address to send to:')
    if (!to || !to.includes('@')) return
    setSaving(true)
    setError('')
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          subject: `Change Order #${coState.custom_co_id || ''}: ${coState.co_name}`,
          html: buildPrintableHtml(coState, job),
        }),
      })
      const data = await res.json()
      if (!res.ok || data.success === false) throw new Error(data.error || `HTTP ${res.status}`)
      alert('Sent!')
      onSent && onSent()
    } catch (e) {
      setError('Email failed: ' + (e instanceof Error ? e.message : String(e)))
    }
    setSaving(false)
  }

  // ── Text: send-sms function (stub-friendly — won't crash if not deployed)
  async function handleText() {
    if (!coState) return
    const to = prompt('Phone number (e.g. +14155550100):')
    if (!to) return
    setSaving(true)
    setError('')
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sms`
      const body = `${job.client_name || job.name}: Change Order #${coState.custom_co_id || ''} — "${coState.co_name}" — Amount: $${Number(coState.bid_amount || 0).toLocaleString()}.`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to, body }),
      })
      const data = await res.json()
      if (!res.ok || data.success === false) throw new Error(data.error || `HTTP ${res.status}`)
      alert('Text sent!')
      onSent && onSent()
    } catch (e) {
      setError('Text failed: ' + (e instanceof Error ? e.message : String(e)))
    }
    setSaving(false)
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        onClick={e => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-5 pb-3 border-b border-gray-100 flex items-start justify-between flex-shrink-0">
            <div className="min-w-0">
              <p className="text-xs uppercase font-semibold text-gray-400 tracking-wide">
                Change Order
              </p>
              <h2 className="text-lg font-bold text-gray-900 truncate">
                {coState?.custom_co_id ? `#${coState.custom_co_id} · ` : isNew ? 'New · ' : '#? · '}
                {title || coState?.co_name || 'Untitled'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{job.client_name || job.name}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {!isNew && isUnreleased && (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-300">
                  Unreleased
                </span>
              )}
              {isApproved && (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-green-50 text-green-800 border border-green-300">
                  ✓ Approved
                </span>
              )}
              {isDeclined && (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-300">
                  ✕ Declined
                </span>
              )}
              {isPending && (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-800 border border-yellow-300">
                  Pending
                </span>
              )}
              <button onClick={onClose} className="text-gray-300 hover:text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Scrolling body */}
          <div className="px-6 py-5 overflow-y-auto flex-1 space-y-5">
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={e => {
                  setTitle(e.target.value)
                  setError('')
                }}
                disabled={!canEdit}
                className="input text-sm w-full"
                placeholder="e.g. Add planter wall along driveway"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Description
              </label>
              <textarea
                rows={6}
                value={scope}
                onChange={e => setScope(e.target.value)}
                disabled={!canEdit}
                className="input text-sm w-full"
                placeholder="Describe what's being added, modified, or credited…"
              />
              {coState?.scope_of_work_html && /<\w+/.test(coState.scope_of_work_html) && (
                <details className="mt-2">
                  <summary className="text-[11px] text-gray-400 cursor-pointer hover:text-gray-700">
                    Show original BT-formatted version
                  </summary>
                  <div
                    className="mt-2 p-3 border border-gray-200 rounded-lg bg-gray-50 text-xs prose-sm max-h-72 overflow-auto"
                    dangerouslySetInnerHTML={{ __html: coState.scope_of_work_html }}
                  />
                </details>
              )}
            </div>

            {/* Manual line items — labor hours + material per item (manual COs only) */}
            {isManual && (
              <div className="border border-gray-200 rounded-xl p-4 bg-white">
                <label className="block text-xs font-semibold text-gray-600 mb-2">
                  Line Items{' '}
                  <span className="font-normal text-gray-400">
                    (labor hours + material per item)
                  </span>
                </label>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[10px] uppercase text-gray-500">
                        <th className="text-left font-semibold pb-1">Item</th>
                        <th className="text-right font-semibold pb-1 w-20">Labor hrs</th>
                        <th className="text-right font-semibold pb-1 w-24">Material $</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((r, i) => (
                        <tr key={i}>
                          <td className="pr-2 py-1">
                            <input
                              type="text"
                              value={r.item}
                              onChange={e => updateLineItem(i, 'item', e.target.value)}
                              disabled={!canEdit}
                              placeholder="Description"
                              className="input text-sm w-full"
                            />
                          </td>
                          <td className="px-1 py-1">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={r.labor_hours === 0 ? '' : r.labor_hours}
                              onChange={e => updateLineItem(i, 'labor_hours', numMask(e.target.value))}
                              disabled={!canEdit}
                              placeholder="0"
                              className="input text-sm w-full text-right"
                            />
                          </td>
                          <td className="px-1 py-1">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={moneyMask(r.material_cost)}
                              onChange={e =>
                                updateLineItem(i, 'material_cost', moneyDigits(e.target.value))
                              }
                              disabled={!canEdit}
                              placeholder="$0"
                              className="input text-sm w-full text-right"
                            />
                          </td>
                          <td className="py-1 text-center">
                            {canEdit && (
                              <button
                                onClick={() => removeLineItem(i)}
                                className="text-gray-300 hover:text-red-500 text-sm"
                                title="Remove row"
                              >
                                ✕
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="text-xs font-bold text-gray-700 border-t border-gray-200">
                        <td className="pt-1.5 text-right pr-2">Totals</td>
                        <td className="pt-1.5 text-right">{itemsLaborTotal.toLocaleString()}</td>
                        <td className="pt-1.5 text-right">
                          ${itemsMaterialTotal.toLocaleString()}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {canEdit && (
                  <button
                    onClick={addLineItem}
                    className="mt-2 text-xs font-semibold text-blue-700 hover:text-blue-900"
                  >
                    + Add row
                  </button>
                )}
              </div>
            )}

            {/* Pricing — link out to the modular estimator */}
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-600">Pricing</label>
                {coState?.id && onOpenEstimator && !isManual && (
                  <button
                    onClick={() => onOpenEstimator(coState)}
                    className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 underline"
                  >
                    {canEdit ? 'Open detailed estimator →' : 'View estimator →'}
                  </button>
                )}
              </div>
              {isManual ? (
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div>
                    <p className="text-[10px] uppercase text-gray-500 font-semibold">Owner price</p>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={moneyMask(bidAmount)}
                      onChange={e => setBidAmount(moneyDigits(e.target.value))}
                      disabled={!canEdit}
                      placeholder="$0"
                      className="input text-sm w-full mt-1"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-[10px] uppercase text-gray-500 font-semibold">
                        Labor hours
                      </p>
                      <p className="text-sm font-bold text-gray-800 mt-1.5">
                        {Math.round(estSummary.laborHours).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-gray-500 font-semibold">Materials</p>
                      <p className="text-sm font-bold text-gray-800 mt-1.5">
                        ${Math.round(estSummary.materials).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-gray-500 font-semibold">Total</p>
                      <p className="text-sm font-bold text-gray-900 mt-1.5">
                        ${Number(coState?.bid_amount || 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-gray-500 font-semibold">
                        Gross profit
                      </p>
                      <p className="text-sm font-bold text-green-700 mt-1.5">
                        ${Number(coState?.gross_profit || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2 italic">
                    These figures come from the estimator. Click "Open detailed estimator" above to
                    view{canEdit ? ' or edit' : ''} the calculations.
                  </p>
                </>
              )}
            </div>

            {/* Attachments */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-600">
                  Attachments{' '}
                  {attachments.length > 0 && (
                    <span className="text-gray-400">({attachments.length})</span>
                  )}
                </label>
                {coState?.id && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleAttachmentUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || isTerminal}
                      className="text-xs font-semibold text-green-700 hover:text-green-900 underline disabled:opacity-40"
                    >
                      {uploading ? 'Uploading…' : '+ Attach file'}
                    </button>
                  </>
                )}
              </div>
              {attachments.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No attachments.</p>
              ) : (
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                  {attachments.map(att => (
                    <div key={att.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                      <span className="text-base flex-shrink-0">📎</span>
                      <button
                        onClick={async () => {
                          const url = await attachmentDownloadUrl(att)
                          if (url) window.open(url, '_blank')
                        }}
                        className="flex-1 text-left text-gray-700 hover:text-indigo-700 truncate"
                      >
                        {att.file_name}
                      </button>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">
                        {Math.round((att.file_size || 0) / 1024)} KB
                      </span>
                      {!isTerminal && (
                        <button
                          onClick={() => handleAttachmentDelete(att)}
                          className="text-red-300 hover:text-red-600 text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* BT-imported metadata (only shows when present) */}
            {(coState?.expires_at ||
              coState?.viewed_by_owner_at ||
              coState?.bt_attachment_count ||
              coState?.bt_created_by_name ||
              coState?.bt_attached_by_names) && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs grid grid-cols-2 gap-x-4 gap-y-1.5">
                {coState.bt_created_by_name && (
                  <div>
                    <span className="text-gray-400">Created by:</span>{' '}
                    <span className="text-gray-700 font-medium">{coState.bt_created_by_name}</span>
                  </div>
                )}
                {coState.expires_at && (
                  <div>
                    <span className="text-gray-400">Expires:</span>{' '}
                    <span className="text-gray-700 font-medium">
                      {new Date(coState.expires_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {coState.viewed_by_owner_at && (
                  <div>
                    <span className="text-gray-400">Viewed by owner:</span>{' '}
                    <span className="text-gray-700 font-medium">
                      {new Date(coState.viewed_by_owner_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {coState.bt_attachment_count > 0 && (
                  <div>
                    <span className="text-gray-400">BT attachments:</span>{' '}
                    <span className="text-gray-700 font-medium">
                      📎 {coState.bt_attachment_count}
                    </span>
                    {coState.bt_attached_by_names && (
                      <span className="text-gray-400"> by {coState.bt_attached_by_names}</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Signature info if approved */}
            {isApproved && coState.signature_data_url && (
              <div className="border border-green-200 bg-green-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-green-800 mb-1">
                  ✓ Approved{' '}
                  {coState.signed_at && `on ${new Date(coState.signed_at).toLocaleDateString()}`}
                  {coState.signed_by_name && ` by ${coState.signed_by_name}`}
                </p>
                <img
                  src={coState.signature_data_url}
                  alt="Signature"
                  className="border border-green-300 rounded bg-white max-h-24 mt-1"
                />
              </div>
            )}

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </div>

          {/* Footer actions — depend on lifecycle status */}
          <div className="px-6 py-4 border-t border-gray-100 flex flex-wrap items-center gap-2 flex-shrink-0">
            {/* Creating a new CO, or editing an unreleased one → Save */}
            {(isNew || (isUnreleased && editing)) && (
              <button
                onClick={handleSave}
                disabled={saving || !title.trim()}
                className="flex-1 min-w-[120px] py-2.5 bg-green-700 text-white text-sm font-semibold rounded-xl hover:bg-green-800 disabled:opacity-40"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            )}
            {/* Cancel an in-progress edit (existing unreleased CO) */}
            {!isNew && isUnreleased && editing && (
              <button
                onClick={() => {
                  setTitle(coState?.co_name || '')
                  setScope(stripHtmlForEdit(coState?.scope_of_work_html || ''))
                  setBidAmount(coState?.bid_amount || 0)
                  setLineItems(
                    Array.isArray(coState?.co_line_items) && coState.co_line_items.length
                      ? coState.co_line_items.map(r => ({
                          item: r.item || '',
                          labor_hours: r.labor_hours ?? '',
                          material_cost: r.material_cost ?? '',
                        }))
                      : [{ item: '', labor_hours: '', material_cost: '' }]
                  )
                  setError('')
                  setEditing(false)
                }}
                className="px-3 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            )}

            {/* Unreleased (not editing) → Release / Edit / Delete */}
            {!isNew && isUnreleased && !editing && (
              <>
                <button
                  onClick={() => {
                    setError('')
                    setNotifyMode('release')
                  }}
                  className="flex-1 min-w-[120px] py-2.5 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800"
                >
                  📤 Release
                </button>
                <button
                  onClick={() => setEditing(true)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="px-3 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm hover:bg-red-50"
                >
                  Delete
                </button>
              </>
            )}

            {/* Pending (released) → Approve / Print / Resend / Unrelease / Delete */}
            {isPending && (
              <>
                <button
                  onClick={() => {
                    setError('')
                    setShowSig(true)
                  }}
                  className="flex-1 min-w-[110px] py-2.5 rounded-xl bg-indigo-700 text-white text-sm font-bold hover:bg-indigo-800"
                >
                  ✍️ Approve
                </button>
                <button
                  onClick={handleDecline}
                  disabled={saving}
                  className="flex-1 min-w-[110px] py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50"
                >
                  ✕ Decline
                </button>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50"
                >
                  🖨️ Print
                </button>
                <button
                  onClick={() => {
                    setError('')
                    setNotifyMode('resend')
                  }}
                  className="px-4 py-2.5 rounded-xl border border-blue-200 text-blue-700 text-sm font-semibold hover:bg-blue-50"
                >
                  Resend Notification
                </button>
                <button
                  onClick={handleUnrelease}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl border border-amber-300 text-amber-700 text-sm font-semibold hover:bg-amber-50 disabled:opacity-40"
                >
                  Unrelease
                </button>
                <button
                  onClick={handleDelete}
                  className="px-3 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm hover:bg-red-50"
                >
                  Delete
                </button>
              </>
            )}

            {/* Approved → Print / Unapprove / Delete ; Declined → Print / Delete */}
            {isTerminal && (
              <>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50"
                >
                  🖨️ Print
                </button>
                {isApproved && (
                  <button
                    onClick={handleUnapprove}
                    disabled={saving}
                    className="px-4 py-2.5 rounded-xl border border-amber-300 text-amber-700 text-sm font-semibold hover:bg-amber-50 disabled:opacity-40"
                  >
                    Unapprove
                  </button>
                )}
                <button
                  onClick={handleDelete}
                  className="px-3 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm hover:bg-red-50"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        {/* Release / Resend notification dialog */}
        {notifyMode && (
          <CONotifyDialog
            mode={notifyMode}
            saving={saving}
            onCancel={() => setNotifyMode(null)}
            onSend={handleNotifySend}
          />
        )}
      </div>

      {showSig && (
        <SignatureModal
          onClose={() => setShowSig(false)}
          onComplete={handleSignatureComplete}
          defaultName={job.client_name || ''}
        />
      )}
    </>
  )
}

// ── Input helpers ──────────────────────────────────────────────────────────
// Currency mask: show "$1,234" as the user types whole dollars; blank when
// empty (no leading zero). Stored value is a plain number (or '').
function moneyMask(v) {
  const d = String(v ?? '').replace(/[^0-9]/g, '')
  return d ? '$' + Number(d).toLocaleString('en-US') : ''
}
function moneyDigits(v) {
  const d = String(v ?? '').replace(/[^0-9]/g, '')
  return d ? Number(d) : ''
}
// Plain number mask (no $): digits + one decimal point, blank when empty.
function numMask(v) {
  const s = String(v ?? '').replace(/[^0-9.]/g, '')
  const i = s.indexOf('.')
  return i === -1 ? s : s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, '')
}

// ── Helpers ──────────────────────────────────────────────────────────────

// Strip HTML for plain-text editing while keeping line breaks readable
function stripHtmlForEdit(html) {
  if (!html) return ''
  return String(html)
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}

// Build a printable HTML doc for print + email actions.
function buildPrintableHtml(co, job) {
  const esc = s =>
    String(s || '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c])
  const amount = `$${Number(co.bid_amount || 0).toLocaleString()}`
  const sigBlock = co.signature_data_url
    ? `<div style="margin-top:24px;padding-top:12px;border-top:1px solid #ccc">
         <p style="font-size:11px;color:#555;margin:0 0 4px">Approved by ${esc(co.signed_by_name || '')} on ${co.signed_at ? new Date(co.signed_at).toLocaleDateString() : ''}</p>
         <img src="${co.signature_data_url}" style="max-height:80px"/>
       </div>`
    : ''
  return `<!doctype html><html><head><meta charset="utf-8"/>
    <title>Change Order #${esc(co.custom_co_id || '')}</title>
    <style>
      body { font-family: Helvetica, Arial, sans-serif; max-width: 720px; margin: 24px auto; padding: 0 16px; color: #222; }
      h1 { font-size: 22px; margin: 0 0 4px }
      .meta { font-size: 12px; color: #666 }
      .scope { margin-top: 16px; line-height: 1.5; font-size: 13px }
      .price { margin-top: 24px; padding: 12px; background: #f5f5f5; border-radius: 6px; font-size: 16px; font-weight: bold }
      table { border-collapse: collapse; width: 100%; }
      td, th { border: 1px solid #ddd; padding: 4px 6px; font-size: 12px; }
    </style></head><body>
    <h1>Change Order #${esc(co.custom_co_id || '')}: ${esc(co.co_name)}</h1>
    <p class="meta">${esc(job.client_name || '')} · ${esc(job.name || '')}</p>
    <div class="scope">${co.scope_of_work_html || esc(co.notes || '')}</div>
    <div class="price">Total: ${amount}</div>
    ${sigBlock}
    </body></html>`
}
