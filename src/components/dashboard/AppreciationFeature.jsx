// Appreciation dashboard feature — quick "grateful for" lines the user types
// each day, saved per-day to the dashboard_appreciations table so history is
// searchable. Plus a button to send a note of appreciation to a coworker
// (opens the user's own email/text app prefilled — no backend send).
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const todayStr = () => new Date().toISOString().slice(0, 10)

export default function AppreciationFeature({ userId, lineCount = 3, style, expanded = false }) {
  const n = Math.max(1, Number(lineCount) || 3)
  const [lines, setLines] = useState(() => Array.from({ length: n }, () => ''))
  const [showSend, setShowSend] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  // Load today's entry from the DB, fit to the configured line count.
  useEffect(() => {
    if (!userId) return
    let alive = true
    supabase
      .from('dashboard_appreciations')
      .select('lines')
      .eq('user_id', userId)
      .eq('entry_date', todayStr())
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return
        const saved = Array.isArray(data?.lines) ? data.lines : []
        setLines(Array.from({ length: n }, (_, i) => saved[i] || ''))
      })
    return () => {
      alive = false
    }
  }, [userId, n])

  const setLine = (i, v) => setLines(prev => prev.map((l, idx) => (idx === i ? v : l)))
  // Persist today's lines to the DB (used by the Save button and on blur).
  const commit = async () => {
    if (!userId) return
    setSaving(true)
    const { error } = await supabase.from('dashboard_appreciations').upsert(
      { user_id: userId, entry_date: todayStr(), lines, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,entry_date' }
    )
    setSaving(false)
    if (!error) {
      setSavedMsg('Saved ✓')
      setTimeout(() => setSavedMsg(''), 2500)
    } else {
      setSavedMsg('Save failed')
    }
  }

  return (
    <div className="card flex flex-col" style={style}>
      <h3 className="text-sm font-bold text-gray-800 mb-1">🙏 Appreciation</h3>
      <p className="text-xs text-gray-400 mb-3">Things you’re grateful for today.</p>
      <div className="space-y-2 flex-1">
        {lines.map((l, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-green-600 text-sm leading-none">•</span>
            <input
              value={l}
              onChange={e => setLine(i, e.target.value)}
              onBlur={commit}
              placeholder="I’m grateful for…"
              className="input flex-1 text-sm py-1.5"
            />
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={commit}
          disabled={saving || !userId}
          className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-green-700 hover:bg-green-800 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {savedMsg && <span className="text-xs font-medium text-green-700">{savedMsg}</span>}
      </div>
      <button
        type="button"
        onClick={() => setShowSend(true)}
        className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-green-700 hover:bg-green-800 transition-colors"
      >
        💌 Send Appreciation
      </button>
      {expanded && <AppreciationHistory userId={userId} />}
      {showSend && <SendModal onClose={() => setShowSend(false)} />}
    </div>
  )
}

// History browser (expanded view): pick a past date and see what was written.
function AppreciationHistory({ userId }) {
  const [date, setDate] = useState(() => todayStr())
  const [entries, setEntries] = useState(null) // null = loading

  useEffect(() => {
    if (!userId) return
    let alive = true
    setEntries(null)
    supabase
      .from('dashboard_appreciations')
      .select('lines')
      .eq('user_id', userId)
      .eq('entry_date', date)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return
        setEntries(Array.isArray(data?.lines) ? data.lines.filter(Boolean) : [])
      })
    return () => {
      alive = false
    }
  }, [userId, date])

  return (
    <div className="mt-5 pt-4 border-t border-gray-100">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h4 className="text-xs font-bold text-gray-700">History</h4>
        <input
          type="date"
          value={date}
          max={todayStr()}
          onChange={e => setDate(e.target.value)}
          className="input text-xs py-1 w-40"
        />
      </div>
      {entries === null ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-700" />
        </div>
      ) : entries.length === 0 ? (
        <p className="text-xs text-gray-400">No appreciations written on this day.</p>
      ) : (
        <ul className="space-y-1.5">
          {entries.map((l, i) => (
            <li key={i} className="flex gap-2 text-sm text-gray-700">
              <span className="text-green-600 leading-none">•</span>
              <span>{l}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Send-a-note modal ────────────────────────────────────────────────────────
function SendModal({ onClose }) {
  const [emps, setEmps] = useState([])
  const [sel, setSel] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    let alive = true
    supabase
      .from('employees')
      .select('id, first_name, last_name, email, phone, status')
      .order('last_name')
      .then(({ data }) => {
        if (!alive) return
        setEmps((data || []).filter(e => e.email || e.phone))
      })
    return () => {
      alive = false
    }
  }, [])

  const emp = emps.find(e => String(e.id) === sel)
  const name = emp ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() : ''
  const subject = 'A note of appreciation'

  const sendEmail = () => {
    if (!emp?.email) return
    window.location.href = `mailto:${emp.email}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(msg)}`
    onClose()
  }
  const sendText = () => {
    if (!emp?.phone) return
    const num = emp.phone.replace(/[^\d+]/g, '')
    window.location.href = `sms:${num}?body=${encodeURIComponent(msg)}`
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">Send a Note of Appreciation</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            title="Close"
          >
            ✕
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="label">To</label>
            <select className="input" value={sel} onChange={e => setSel(e.target.value)}>
              <option value="">— Choose an employee —</option>
              {emps.map(e => (
                <option key={e.id} value={e.id}>
                  {`${e.first_name || ''} ${e.last_name || ''}`.trim()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Message</label>
            <textarea
              value={msg}
              onChange={e => setMsg(e.target.value)}
              rows={4}
              placeholder={name ? `Hi ${name.split(' ')[0]}, I really appreciate…` : 'Write your note…'}
              className="input text-sm"
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={sendEmail}
              disabled={!emp?.email}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-green-700 hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed"
              title={emp && !emp.email ? 'No email on file' : ''}
            >
              ✉️ Email
            </button>
            <button
              onClick={sendText}
              disabled={!emp?.phone}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-green-700 hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed"
              title={emp && !emp.phone ? 'No phone on file' : ''}
            >
              💬 Text
            </button>
          </div>
          <p className="text-[11px] text-gray-400">
            Opens your own email or texting app with the note prefilled.
          </p>
        </div>
      </div>
    </div>
  )
}
