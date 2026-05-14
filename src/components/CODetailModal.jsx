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

const STORAGE_BUCKET = 'job-files'

export default function CODetailModal({ co, job, onClose, onSaved, onDeleted, onOpenEstimator, onSent }) {
  const { user } = useAuth()
  const isNew = !co?.id
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')
  const [showSig,   setShowSig]   = useState(false)
  const [showSendMenu, setShowSendMenu] = useState(false)

  // Editable fields
  const [title,    setTitle]    = useState(co?.co_name || '')
  const [scope,    setScope]    = useState(co?.scope_of_work_html || '')
  const [bidAmount, setBidAmount] = useState(co?.bid_amount || 0)

  // Local copy of co for live updates (after save / approve)
  const [coState, setCoState] = useState(co)

  // Attachments
  const [attachments, setAttachments] = useState([])
  const [uploading,   setUploading]   = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => { if (coState?.id) loadAttachments(coState.id) }, [coState?.id])

  async function loadAttachments(bidId) {
    const { data } = await supabase.from('job_files')
      .select('id, file_name, file_type, file_size, storage_path, uploaded_at')
      .eq('bid_id', bidId)
      .order('uploaded_at', { ascending: false })
    setAttachments(data || [])
  }

  // Compute the next custom_co_id for this job (max + 1, defaults to 1).
  async function nextCustomCoId() {
    const { data } = await supabase.from('bids')
      .select('custom_co_id').eq('linked_job_id', job.id).eq('record_type', 'change_order')
      .order('custom_co_id', { ascending: false }).limit(1)
    return ((data?.[0]?.custom_co_id || 0) + 1)
  }

  // Save creates the CO if new (with paired estimate), otherwise updates.
  async function handleSave() {
    if (!title.trim()) { setError('Title is required.'); return }
    setSaving(true); setError('')
    try {
      if (isNew) {
        // 1. Create paired estimate
        const { data: est, error: eErr } = await supabase.from('estimates')
          .insert({
            estimate_name: title.trim(),
            client_name:   job.client_name || job.name || '',
            status:        'draft',
            created_by:    user?.id,
          }).select('id').single()
        if (eErr) throw new Error(eErr.message)

        // 2. Create the CO bid
        const customCoId = await nextCustomCoId()
        const { data: bid, error: bErr } = await supabase.from('bids').insert({
          record_type:        'change_order',
          linked_job_id:      job.id,
          co_name:            title.trim(),
          scope_of_work_html: scope || null,
          custom_co_id:       customCoId,
          client_name:        job.client_name || job.name || '',
          bid_amount:         parseFloat(bidAmount) || 0,
          gross_profit:       0,
          gpmd:               0,
          date_submitted:     new Date().toISOString().slice(0, 10),
          status:             'pending',
          estimate_id:        est.id,
          notes:              '',
          projects:           [],
          created_by:         user?.id,
        }).select('*').single()
        if (bErr) throw new Error(bErr.message)
        setCoState(bid)
        onSaved && onSaved(bid)
      } else {
        // Update existing
        const { data: bid, error: bErr } = await supabase.from('bids').update({
          co_name:            title.trim(),
          scope_of_work_html: scope || null,
          bid_amount:         parseFloat(bidAmount) || 0,
        }).eq('id', coState.id).select('*').single()
        if (bErr) throw new Error(bErr.message)
        setCoState(bid)
        onSaved && onSaved(bid)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!coState?.id) return
    if (!confirm(`Delete change order #${coState.custom_co_id || '?'} ("${coState.co_name}")?`)) return
    if (coState.estimate_id) await supabase.from('estimates').delete().eq('id', coState.estimate_id)
    await supabase.from('bids').delete().eq('id', coState.id)
    onDeleted && onDeleted(coState.id)
    onClose()
  }

  // Approve flow: opens signature modal, then on confirm writes signature
  // fields + flips status to 'sold' (which represents "approved" for COs)
  async function handleSignatureComplete({ dataUrl, signedByName }) {
    setShowSig(false)
    setSaving(true); setError('')
    try {
      const { data: bid, error: bErr } = await supabase.from('bids').update({
        status:             'sold',
        signed_at:          new Date().toISOString(),
        signed_by_name:     signedByName || null,
        signature_data_url: dataUrl,
      }).eq('id', coState.id).select('*').single()
      if (bErr) throw new Error(bErr.message)
      setCoState(bid)
      onSaved && onSaved(bid)
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
    setUploading(true); setError('')
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `co-attachments/${coState.id}/${Date.now()}_${safeName}`
      const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      })
      if (upErr) throw new Error(upErr.message)
      const { error: insErr } = await supabase.from('job_files').insert({
        job_id:        job.id,
        bid_id:        coState.id,
        file_name:     file.name,
        file_type:     file.type,
        file_category: 'document',
        storage_path:  path,
        file_size:     file.size,
        uploaded_by:   user?.id,
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
    const { data } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(att.storage_path, 60 * 5)
    return data?.signedUrl
  }

  // ── Print: opens a new window with a printable CO layout ─────────────────
  function handlePrint() {
    if (!coState) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) { alert('Pop-up blocked — allow popups to print.'); return }
    printWindow.document.write(buildPrintableHtml(coState, job))
    printWindow.document.close()
    setTimeout(() => { printWindow.print() }, 300)
    onSent && onSent()
  }

  // ── Email: send-email edge function with the same printable HTML ─────────
  async function handleEmail() {
    if (!coState) return
    const to = prompt('Email address to send to:')
    if (!to || !to.includes('@')) return
    setSaving(true); setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          subject: `Change Order #${coState.custom_co_id || ''}: ${coState.co_name}`,
          html:    buildPrintableHtml(coState, job),
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
    setSaving(true); setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sms`
      const body = `${job.client_name || job.name}: Change Order #${coState.custom_co_id || ''} — "${coState.co_name}" — Amount: $${Number(coState.bid_amount || 0).toLocaleString()}.`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
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

  const isApproved = coState?.status === 'sold'
  const formattedAmount = coState ? `$${Number(coState.bid_amount || bidAmount || 0).toLocaleString()}` : `$${Number(bidAmount || 0).toLocaleString()}`

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">

          {/* Header */}
          <div className="px-6 pt-5 pb-3 border-b border-gray-100 flex items-start justify-between flex-shrink-0">
            <div className="min-w-0">
              <p className="text-xs uppercase font-semibold text-gray-400 tracking-wide">Change Order</p>
              <h2 className="text-lg font-bold text-gray-900 truncate">
                {coState?.custom_co_id ? `#${coState.custom_co_id} · ` : isNew ? 'New · ' : '#? · '}
                {title || coState?.co_name || 'Untitled'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{job.client_name || job.name}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {isApproved && (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-green-50 text-green-800 border border-green-300">
                  ✓ Approved
                </span>
              )}
              <button onClick={onClose} className="text-gray-300 hover:text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
                type="text" value={title}
                onChange={e => { setTitle(e.target.value); setError('') }}
                disabled={isApproved}
                className="input text-sm w-full"
                placeholder="e.g. Add planter wall along driveway"
              />
            </div>

            {/* Scope of Work */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Scope of Work</label>
              <textarea
                rows={6}
                value={stripHtmlForEdit(scope)}
                onChange={e => setScope(e.target.value)}
                disabled={isApproved}
                className="input text-sm w-full"
                placeholder="Describe what's being added, modified, or credited…"
              />
              {coState?.scope_of_work_html && /<\w+/.test(coState.scope_of_work_html) && (
                <details className="mt-2">
                  <summary className="text-[11px] text-gray-400 cursor-pointer hover:text-gray-700">Show original BT-formatted version</summary>
                  <div className="mt-2 p-3 border border-gray-200 rounded-lg bg-gray-50 text-xs prose-sm max-h-72 overflow-auto"
                       dangerouslySetInnerHTML={{ __html: coState.scope_of_work_html }} />
                </details>
              )}
            </div>

            {/* Pricing — link out to the modular estimator */}
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-600">Pricing</label>
                {coState?.id && onOpenEstimator && (
                  <button
                    onClick={() => onOpenEstimator(coState)}
                    disabled={isApproved}
                    className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 underline disabled:opacity-40"
                  >
                    Open detailed estimator →
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-[10px] uppercase text-gray-500 font-semibold">Owner price</p>
                  <input
                    type="number" step="0.01" min="0"
                    value={bidAmount}
                    onChange={e => setBidAmount(e.target.value)}
                    disabled={isApproved}
                    className="input text-sm w-full mt-1"
                  />
                </div>
                <div>
                  <p className="text-[10px] uppercase text-gray-500 font-semibold">Gross profit</p>
                  <p className="text-sm font-bold text-gray-800 mt-1.5">${Number(coState?.gross_profit || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-gray-500 font-semibold">GPMD</p>
                  <p className="text-sm font-bold text-gray-800 mt-1.5">${Number(coState?.gpmd || 0).toLocaleString()}</p>
                </div>
              </div>
              <p className="text-[11px] text-gray-400 mt-2 italic">
                For module-level pricing breakdown, click "Open detailed estimator" above. The owner price field here is overwritten by what the estimator computes when it's saved.
              </p>
            </div>

            {/* Attachments */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-600">
                  Attachments {attachments.length > 0 && <span className="text-gray-400">({attachments.length})</span>}
                </label>
                {coState?.id && (
                  <>
                    <input ref={fileInputRef} type="file" onChange={handleAttachmentUpload} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploading || isApproved}
                      className="text-xs font-semibold text-green-700 hover:text-green-900 underline disabled:opacity-40">
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
                      <span className="text-[10px] text-gray-400 flex-shrink-0">{Math.round((att.file_size || 0) / 1024)} KB</span>
                      {!isApproved && (
                        <button onClick={() => handleAttachmentDelete(att)}
                          className="text-red-300 hover:text-red-600 text-xs">✕</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Signature info if approved */}
            {isApproved && coState.signature_data_url && (
              <div className="border border-green-200 bg-green-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-green-800 mb-1">
                  ✓ Approved {coState.signed_at && `on ${new Date(coState.signed_at).toLocaleDateString()}`}
                  {coState.signed_by_name && ` by ${coState.signed_by_name}`}
                </p>
                <img src={coState.signature_data_url} alt="Signature" className="border border-green-300 rounded bg-white max-h-24 mt-1" />
              </div>
            )}

            {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          </div>

          {/* Footer actions */}
          <div className="px-6 py-4 border-t border-gray-100 flex flex-wrap items-center gap-2 flex-shrink-0">
            {!isApproved && (
              <button onClick={handleSave} disabled={saving || !title.trim()}
                className="flex-1 min-w-[120px] py-2.5 bg-green-700 text-white text-sm font-semibold rounded-xl hover:bg-green-800 disabled:opacity-40">
                {saving ? 'Saving…' : isNew ? 'Create CO' : 'Save'}
              </button>
            )}
            {coState?.id && !isApproved && (
              <button onClick={() => setShowSig(true)}
                className="flex-1 min-w-[120px] py-2.5 bg-indigo-700 text-white text-sm font-semibold rounded-xl hover:bg-indigo-800">
                ✓ Approve
              </button>
            )}
            {coState?.id && (
              <div className="relative">
                <button onClick={() => setShowSendMenu(v => !v)}
                  className="px-3 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm hover:bg-gray-50">
                  Send / Print ▾
                </button>
                {showSendMenu && (
                  <div className="absolute right-0 bottom-full mb-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[140px]">
                    <button onClick={() => { setShowSendMenu(false); handlePrint() }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">🖨️ Print</button>
                    <button onClick={() => { setShowSendMenu(false); handleEmail() }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">✉️ Email</button>
                    <button onClick={() => { setShowSendMenu(false); handleText() }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">📱 Text</button>
                    <button disabled
                      className="w-full text-left px-3 py-2 text-sm text-gray-300 cursor-not-allowed">🌐 Send to client portal (soon)</button>
                  </div>
                )}
              </div>
            )}
            {coState?.id && (
              <button onClick={handleDelete}
                className="px-3 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm hover:bg-red-50">
                Delete
              </button>
            )}
          </div>
        </div>
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
  const esc = s => String(s || '').replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))
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
