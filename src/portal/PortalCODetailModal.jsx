// src/portal/PortalCODetailModal.jsx
//
// Client-facing change-order detail. Read-only view of a single CO with the
// price shown in bold. The client can Approve (-> signature) or Disapprove
// (-> reason). No gross profit / GPMD, no estimator link, no send/print/delete,
// and nothing is editable. Mirrors the employee CODetailModal data but stripped
// to what a client should see and do.

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import SignatureModal from '../components/SignatureModal'

const money = v => {
  const n = Number(v)
  return Number.isFinite(n) ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '—'
}
const dateStr = v => {
  if (!v) return '—'
  const d = new Date(v)
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function PortalCODetailModal({ co, onClose, onActioned }) {
  const [showSig, setShowSig] = useState(false)
  const [declining, setDeclining] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!co) return null

  const status = String(co.status || 'pending').toLowerCase()
  const isApproved = status === 'sold'
  const isDeclined = status === 'lost'
  const isPending = !isApproved && !isDeclined
  const isManual = co.co_method === 'manual'
  const lineItems = Array.isArray(co.co_line_items) ? co.co_line_items : []
  const hasHtmlScope = co.scope_of_work_html && /<\w+/.test(co.scope_of_work_html)

  async function handleApprove({ dataUrl, signedByName }) {
    setShowSig(false)
    setBusy(true)
    setError('')
    const { error: e } = await supabase.rpc('portal_approve_change_order', {
      p_co_id: co.id,
      p_signed_by: signedByName || null,
      p_signature: dataUrl || null,
    })
    setBusy(false)
    if (e) {
      setError(e.message || 'Could not approve. Please try again.')
      return
    }
    onActioned && onActioned()
    onClose()
  }

  async function handleDecline() {
    if (!reason.trim()) {
      setError('Please add a reason so your contractor knows why.')
      return
    }
    setBusy(true)
    setError('')
    const { error: e } = await supabase.rpc('portal_decline_change_order', {
      p_co_id: co.id,
      p_reason: reason.trim(),
    })
    setBusy(false)
    if (e) {
      setError(e.message || 'Could not submit. Please try again.')
      return
    }
    onActioned && onActioned()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[94dvh] flex flex-col"
        onClick={e => e.stopPropagation()}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Change Order {co.custom_co_id ? `#${co.custom_co_id}` : ''}
            </p>
            <h2 className="text-lg font-bold text-gray-900 leading-tight">
              {co.co_name || 'Change Order'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full text-gray-400 hover:bg-gray-100 flex items-center justify-center text-xl"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Status banner for already-decided COs */}
          {isApproved && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
              <p className="text-sm font-bold text-green-800">✓ Approved</p>
              <p className="text-xs text-green-700 mt-0.5">
                {co.signed_by_name ? `Signed by ${co.signed_by_name}` : 'Signed'} ·{' '}
                {dateStr(co.signed_at)}
              </p>
              {co.signature_data_url && (
                <img
                  src={co.signature_data_url}
                  alt="Signature"
                  className="mt-2 h-16 bg-white rounded border border-green-100"
                />
              )}
            </div>
          )}
          {isDeclined && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm font-bold text-red-700">Declined</p>
              {co.co_decline_reason && (
                <p className="text-xs text-red-600 mt-0.5 whitespace-pre-wrap">
                  {co.co_decline_reason}
                </p>
              )}
            </div>
          )}

          {/* Scope of Work */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
              Scope of Work
            </p>
            {hasHtmlScope ? (
              <div
                className="text-sm text-gray-800 prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: co.scope_of_work_html }}
              />
            ) : (
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {co.scope_of_work_html || '—'}
              </p>
            )}
          </div>

          {/* Manual line items (read-only) */}
          {isManual && lineItems.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
                Items
              </p>
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-100">
                    {lineItems.map((r, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-gray-800">{r.item || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Price — bold, the only figure shown */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Price</p>
            <p className="text-3xl font-extrabold text-gray-900 mt-1">{money(co.bid_amount)}</p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Decline reason entry */}
          {declining && isPending && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
                Reason for declining
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Let your contractor know why…"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Footer actions — only while pending */}
        {isPending && (
          <div className="px-5 py-4 border-t border-gray-200">
            {declining ? (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setDeclining(false)
                    setReason('')
                    setError('')
                  }}
                  disabled={busy}
                  className="flex-1 py-3 rounded-xl border border-gray-300 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleDecline}
                  disabled={busy}
                  className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50"
                >
                  {busy ? 'Submitting…' : 'Submit Decline'}
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setDeclining(true)
                    setError('')
                  }}
                  disabled={busy}
                  className="flex-1 py-3 rounded-xl border border-red-200 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Disapprove
                </button>
                <button
                  onClick={() => {
                    setError('')
                    setShowSig(true)
                  }}
                  disabled={busy}
                  className="flex-1 py-3 rounded-xl bg-green-700 text-white text-sm font-bold hover:bg-green-800 disabled:opacity-50"
                >
                  {busy ? 'Working…' : 'Approve'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showSig && (
        <SignatureModal
          defaultName={co.client_name || ''}
          onClose={() => setShowSig(false)}
          onComplete={handleApprove}
        />
      )}
    </div>
  )
}
