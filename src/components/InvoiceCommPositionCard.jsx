// src/components/InvoiceCommPositionCard.jsx
//
// Jobs > Settings > General card: pick which HR position handles client
// invoice communication. Saved to company_settings.invoice_comm_position_id.
//
// When a client leaves a comment on an invoice in their portal, every active
// employee holding this position is emailed (see the invoice-comment edge
// function).
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function InvoiceCommPositionCard() {
  const [positions, setPositions] = useState([])
  const [positionId, setPositionId] = useState('')
  const [counts, setCounts] = useState({}) // lowercased title -> active employee count
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [posRes, setRes, empRes] = await Promise.all([
      supabase.from('positions').select('id, title').order('title'),
      supabase.from('company_settings').select('invoice_comm_position_id').maybeSingle(),
      supabase.from('employees').select('job_title').eq('status', 'active'),
    ])
    setPositions(posRes.data || [])
    const cur = setRes.data?.invoice_comm_position_id
    setPositionId(cur != null ? String(cur) : '')
    const c = {}
    for (const e of empRes.data || []) {
      const t = (e.job_title || '').trim().toLowerCase()
      if (t) c[t] = (c[t] || 0) + 1
    }
    setCounts(c)
    setLoading(false)
  }

  async function save() {
    setSaving(true)
    setSavedMsg('')
    const { error } = await supabase
      .from('company_settings')
      .update({ invoice_comm_position_id: positionId ? Number(positionId) : null })
      .not('id', 'is', null)
    setSaving(false)
    if (error) {
      setSavedMsg('Error: ' + error.message)
      return
    }
    setSavedMsg('✓ Saved')
    setTimeout(() => setSavedMsg(''), 2000)
  }

  const selectedPos = positions.find(p => String(p.id) === positionId)
  const recipientCount = selectedPos
    ? counts[(selectedPos.title || '').trim().toLowerCase()] || 0
    : 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-base font-bold text-gray-800 mb-1">📨 Invoice Communication</h2>
      <p className="text-sm text-gray-500 mb-4">
        Pick the HR position responsible for client invoice communication. When a client
        leaves a comment on an invoice in their portal, every active employee holding this
        position is emailed (and the comment is logged to the job's daily log).
      </p>

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-700" />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4 flex-wrap">
            <select
              value={positionId}
              onChange={e => setPositionId(e.target.value)}
              className="input text-sm"
            >
              <option value="">— None —</option>
              {positions.map(p => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            <button
              onClick={save}
              disabled={saving}
              className="text-sm px-4 py-2 rounded-lg bg-green-700 text-white font-semibold hover:bg-green-800 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            {savedMsg && (
              <span
                className={`text-xs font-semibold ${
                  savedMsg.startsWith('Error') ? 'text-red-600' : 'text-green-700'
                }`}
              >
                {savedMsg}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            {!positionId
              ? 'No position selected — invoice comments will still be logged, but no email is sent.'
              : recipientCount > 0
                ? `${recipientCount} active employee${recipientCount === 1 ? '' : 's'} in this position will receive comment emails.`
                : 'No active employees currently hold this position — comments will be logged but not emailed.'}
          </p>
          {positions.length === 0 && (
            <p className="text-xs text-gray-400 italic mt-2">
              No positions defined. Add positions in HR → Positions first.
            </p>
          )}
        </>
      )}
    </div>
  )
}
