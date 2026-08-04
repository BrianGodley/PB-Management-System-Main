// Appreciation dashboard feature — three quick "grateful for" lines the user
// can type right on the dashboard (persisted per-user in localStorage), plus a
// button to send a note of appreciation to a coworker. Sending opens the user's
// own email (mailto:) or texting (sms:) app with the note prefilled — no backend.
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function AppreciationFeature({ userId, style }) {
  const key = userId ? `dashboard:appreciation:${userId}` : null
  const [lines, setLines] = useState(['', '', ''])
  const [showSend, setShowSend] = useState(false)

  useEffect(() => {
    if (!key) return
    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        const a = JSON.parse(raw)
        if (Array.isArray(a)) setLines([a[0] || '', a[1] || '', a[2] || ''])
      }
    } catch {
      /* ignore */
    }
  }, [key])

  const setLine = (i, v) => {
    const next = lines.map((l, idx) => (idx === i ? v : l))
    setLines(next)
    if (key) {
      try {
        localStorage.setItem(key, JSON.stringify(next))
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <div className="card flex flex-col" style={style}>
      <h3 className="text-sm font-bold text-gray-800 mb-1">🙏 Appreciation</h3>
      <p className="text-xs text-gray-400 mb-3">Three things you’re grateful for today.</p>
      <div className="space-y-2 flex-1">
        {lines.map((l, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-green-600 text-sm leading-none">•</span>
            <input
              value={l}
              onChange={e => setLine(i, e.target.value)}
              placeholder="I’m grateful for…"
              className="input flex-1 text-sm py-1.5"
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setShowSend(true)}
        className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-green-700 hover:bg-green-800 transition-colors"
      >
        💌 Send Appreciation
      </button>
      {showSend && <SendModal onClose={() => setShowSend(false)} />}
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
