// src/components/EmailTemplatesManager.jsx
//
// Settings -> E-Mail Templates. Edits the company-wide email message templates
// stored on the single-row company_settings table.
//
// Today this is the Invoice Notification Email — the "standard message"
// emailed to a client when staff send them an invoice. It is pre-filled in the
// invoice Send dialog, where staff can adjust or add to it before sending.
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { DEFAULT_INVOICE_EMAIL_SUBJECT, DEFAULT_INVOICE_EMAIL_BODY } from '../lib/companyDefaults'

export default function EmailTemplatesManager() {
  const [invSubject, setInvSubject] = useState(DEFAULT_INVOICE_EMAIL_SUBJECT)
  const [invBody, setInvBody] = useState(DEFAULT_INVOICE_EMAIL_BODY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data } = await supabase
        .from('company_settings')
        .select('invoice_email_subject, invoice_email_body')
        .maybeSingle()
      if (!alive) return
      if (data?.invoice_email_subject) setInvSubject(data.invoice_email_subject)
      if (data?.invoice_email_body) setInvBody(data.invoice_email_body)
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [])

  async function save() {
    setSaving(true)
    setMsg('')
    const { data: existing } = await supabase.from('company_settings').select('id').maybeSingle()
    let error
    if (existing?.id) {
      ;({ error } = await supabase
        .from('company_settings')
        .update({
          invoice_email_subject: invSubject.trim(),
          invoice_email_body: invBody.trim(),
        })
        .eq('id', existing.id))
    } else {
      ;({ error } = await supabase.from('company_settings').insert({
        invoice_email_subject: invSubject.trim(),
        invoice_email_body: invBody.trim(),
      }))
    }
    setSaving(false)
    setMsg(error ? 'error:' + error.message : 'ok:Invoice email template saved.')
    setTimeout(() => setMsg(''), 4000)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-green-700" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-bold text-gray-800 mb-1">Invoice Notification Email</h2>
        <p className="text-sm text-gray-500 mb-4">
          The standard message emailed to a client when staff send them an invoice. It is
          pre-filled in the invoice Send dialog, where staff can adjust or add to it before
          sending.
        </p>
        <div className="space-y-4">
          <div>
            <label className="label">Subject</label>
            <input
              type="text"
              className="input text-sm"
              value={invSubject}
              onChange={e => setInvSubject(e.target.value)}
              placeholder={DEFAULT_INVOICE_EMAIL_SUBJECT}
            />
          </div>
          <div>
            <label className="label">Message</label>
            <textarea
              rows={10}
              className="input text-sm"
              value={invBody}
              onChange={e => setInvBody(e.target.value)}
              placeholder={DEFAULT_INVOICE_EMAIL_BODY}
            />
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
            <p className="text-xs font-medium text-gray-600 mb-1">Placeholders you can use:</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              <code>{'{{client_name}}'}</code> &middot; <code>{'{{invoice_number}}'}</code>{' '}
              &middot; <code>{'{{amount}}'}</code> &middot; <code>{'{{due_date}}'}</code> &middot;{' '}
              <code>{'{{company_name}}'}</code>
              <br />
              They are filled in automatically for each invoice. A summary box and a "View Invoice
              in Portal" button are added to every email.
            </p>
          </div>
          {msg && (
            <div
              className={`text-sm px-3 py-2 rounded-lg border ${
                msg.startsWith('ok:')
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              {msg.startsWith('ok:') ? '✓ ' + msg.slice(3) : '⚠️ ' + msg.slice(6)}
            </div>
          )}
          <button onClick={save} disabled={saving} className="btn-primary text-sm px-4 py-2">
            {saving ? 'Saving…' : 'Save Template'}
          </button>
        </div>
      </div>
    </div>
  )
}
