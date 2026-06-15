// src/components/edoc/EDocDocumentModal.jsx
// Staff-side document modal, adapts to the document's status:
//   • draft        → collect signer name/email, Send for Signature
//   • sent/viewed  → show the signing link + Resend + status
//   • completed    → signed-by/date summary + open signing link (read-only)
// Sending emails the tokenized /sign/<token> link via the send-email edge fn.
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

const STATUS_LABEL = {
  draft: 'Draft',
  sent: 'Sent — awaiting signature',
  viewed: 'Viewed by signer',
  completed: 'Completed',
  paid: 'Paid',
  declined: 'Declined',
  voided: 'Voided',
}

export default function EDocDocumentModal({ doc, onClose, onChanged }) {
  const [signerName, setSignerName] = useState(doc.signer_name || '')
  const [signerEmail, setSignerEmail] = useState(doc.signer_email || '')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(doc.status)
  const [token, setToken] = useState(doc.access_token)

  const signUrl = `${window.location.origin}/sign/${token}`

  async function emailLink(toEmail, name) {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const base = import.meta.env.VITE_SUPABASE_URL
    const res = await fetch(`${base}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.access_token || ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: toEmail,
        subject: `Please sign: ${doc.name}`,
        html: `<p>Hello${name ? ' ' + name : ''},</p>
<p>Picture Build has sent you a document to review and sign electronically.</p>
<p style="margin:18px 0"><a href="${signUrl}" style="background:#15803d;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Review &amp; Sign</a></p>
<p>Or paste this link into your browser:<br>${signUrl}</p>`,
      }),
    })
    return res.ok
  }

  async function handleSend() {
    if (!signerEmail.trim()) {
      alert('Enter the signer email address.')
      return
    }
    setBusy(true)
    try {
      // Persist signer + flip to sent. (access_token already defaults on insert.)
      const { error } = await supabase
        .from('edoc_documents')
        .update({
          signer_name: signerName.trim() || null,
          signer_email: signerEmail.trim(),
          status: 'sent',
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', doc.id)
      if (error) throw error
      const ok = await emailLink(signerEmail.trim(), signerName.trim())
      setStatus('sent')
      onChanged?.()
      if (!ok) {
        alert(
          'Document marked Sent, but the email could not be delivered. You can copy the signing link below and share it manually.'
        )
      } else {
        alert('Sent! The signer has been emailed the signing link.')
      }
    } catch (e) {
      alert('Send failed: ' + (e.message || 'unknown error'))
    } finally {
      setBusy(false)
    }
  }

  async function handleResend() {
    if (!signerEmail.trim()) {
      alert('No signer email on file.')
      return
    }
    setBusy(true)
    const ok = await emailLink(signerEmail.trim(), signerName.trim())
    setBusy(false)
    alert(ok ? 'Signing link re-sent.' : 'Could not send the email. Copy the link below instead.')
  }

  function copyLink() {
    navigator.clipboard?.writeText(signUrl)
    alert('Signing link copied to clipboard.')
  }

  const isDraft = status === 'draft'
  const isSentOrViewed = status === 'sent' || status === 'viewed'
  const isDone = status === 'completed' || status === 'paid'

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90dvh] overflow-y-auto">
        <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-gray-200">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Document</p>
            <h2 className="text-lg font-bold text-gray-900 truncate">{doc.name}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{STATUS_LABEL[status] || status}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-base">
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          {isDraft && (
            <>
              <label className="block">
                <span className="text-xs font-semibold text-gray-500 uppercase">Signer name</span>
                <input
                  value={signerName}
                  onChange={e => setSignerName(e.target.value)}
                  className="input w-full text-sm py-1.5 mt-1"
                  placeholder="Client name"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-gray-500 uppercase">Signer email</span>
                <input
                  type="email"
                  value={signerEmail}
                  onChange={e => setSignerEmail(e.target.value)}
                  className="input w-full text-sm py-1.5 mt-1"
                  placeholder="client@email.com"
                />
              </label>
              <button
                onClick={handleSend}
                disabled={busy}
                className="w-full bg-green-700 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-green-800 disabled:opacity-50"
              >
                {busy ? 'Sending…' : '📤 Send for Signature'}
              </button>
              <p className="text-[11px] text-gray-400 text-center">
                Tip: place the buyer's fields on the document first (Templates → Edit Fields).
              </p>
            </>
          )}

          {isSentOrViewed && (
            <>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
                <p className="text-gray-600">
                  Sent to <span className="font-semibold">{signerEmail || 'the signer'}</span>.
                  {status === 'viewed' && ' The signer has opened it.'}
                </p>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase">Signing link</span>
                <div className="flex gap-2 mt-1">
                  <input readOnly value={signUrl} className="input flex-1 text-xs py-1.5" />
                  <button
                    onClick={copyLink}
                    className="text-xs border border-gray-300 rounded-lg px-3 hover:bg-gray-50"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleResend}
                  disabled={busy}
                  className="flex-1 border border-green-700 text-green-700 text-sm font-semibold py-2 rounded-lg hover:bg-green-50 disabled:opacity-50"
                >
                  {busy ? 'Sending…' : '↻ Resend Email'}
                </button>
                <a
                  href={signUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 text-center border border-gray-300 text-gray-600 text-sm font-semibold py-2 rounded-lg hover:bg-gray-50"
                >
                  Open signer view
                </a>
              </div>
            </>
          )}

          {isDone && (
            <div className="text-center py-4">
              <div className="text-3xl mb-1">✅</div>
              <p className="font-semibold text-gray-800">
                Signed{doc.signer_name ? ` by ${doc.signer_name}` : ''}
              </p>
              {doc.completed_at && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(doc.completed_at).toLocaleString()}
                </p>
              )}
              <a
                href={signUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block mt-3 text-sm text-green-700 hover:underline"
              >
                View signed document →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
