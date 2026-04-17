import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ── Time helpers ─────────────────────────────────────────────
function fmt12h(t) {
  if (!t) return '—'
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

function fmt24h(t) {
  if (!t) return ''
  return t.slice(0, 5)
}

function diffMins(timeIn, timeOut) {
  if (!timeIn || !timeOut) return null
  const [h1, m1] = timeIn.split(':').map(Number)
  const [h2, m2] = timeOut.split(':').map(Number)
  const diff = (h2 * 60 + m2) - (h1 * 60 + m1)
  return diff > 0 ? diff : null
}

function fmtMins(mins) {
  if (mins == null) return '—'
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
}

function calcTimes(timeIn, timeOut) {
  const total = diffMins(timeIn, timeOut)
  if (total == null) return { total: null, regular: null, ot: null }
  const regular = Math.min(total, 480)   // 8 hours = 480 minutes
  const ot = Math.max(0, total - 480)
  return { total, regular, ot }
}

function todayDate() {
  return new Date().toISOString().split('T')[0]
}

function fmtDateLabel(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

const EMPTY_FORM = {
  employee_name: '',
  job_id: '',
  date: todayDate(),
  time_in: '',
  time_out: '',
  notes: '',
}

// ── Main Component ───────────────────────────────────────────
export default function TimeClock({ jobs = [], selectedJob }) {
  const { user } = useAuth()
  const [entries,   setEntries]   = useState([])
  const [loading,   setLoading]   = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editEntry, setEditEntry] = useState(null)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  const jobMap = Object.fromEntries(jobs.map(j => [j.id, j.name || j.client_name]))

  useEffect(() => { fetchEntries() }, [selectedJob])

  async function fetchEntries() {
    setLoading(true)
    let q = supabase
      .from('time_entries')
      .select('*')
      .order('date', { ascending: false })
      .order('time_in', { ascending: true })

    if (selectedJob !== 'all') q = q.eq('job_id', selectedJob)

    const { data, error } = await q
    if (error) console.error('fetchEntries:', error)
    if (data) setEntries(data)
    setLoading(false)
  }

  function openNew() {
    setEditEntry(null)
    setForm({
      ...EMPTY_FORM,
      job_id: selectedJob !== 'all' ? selectedJob : '',
      date: todayDate(),
    })
    setError('')
    setShowModal(true)
  }

  function openEdit(entry) {
    setEditEntry(entry)
    setForm({
      employee_name: entry.employee_name || '',
      job_id:        entry.job_id || '',
      date:          entry.date || todayDate(),
      time_in:       fmt24h(entry.time_in),
      time_out:      fmt24h(entry.time_out || ''),
      notes:         entry.notes || '',
    })
    setError('')
    setShowModal(true)
  }

  function closeModal() { setShowModal(false); setEditEntry(null) }

  async function saveEntry() {
    if (!form.employee_name.trim()) { setError('Employee name is required.'); return }
    if (!form.time_in) { setError('Time In is required.'); return }
    setSaving(true)
    setError('')

    const payload = {
      employee_name: form.employee_name.trim(),
      job_id:        form.job_id || null,
      date:          form.date,
      time_in:       form.time_in,
      time_out:      form.time_out || null,
      notes:         form.notes.trim() || null,
      created_by:    user?.id,
      updated_at:    new Date().toISOString(),
    }

    const { error } = editEntry
      ? await supabase.from('time_entries').update(payload).eq('id', editEntry.id)
      : await supabase.from('time_entries').insert(payload)

    if (error) {
      console.error(error)
      setError('Failed to save. Please try again.')
      setSaving(false)
      return
    }
    setSaving(false)
    closeModal()
    fetchEntries()
  }

  async function deleteEntry(entry) {
    if (!confirm(`Delete time entry for ${entry.employee_name}?`)) return
    await supabase.from('time_entries').delete().eq('id', entry.id)
    setEntries(prev => prev.filter(e => e.id !== entry.id))
  }

  // Group by date for mobile cards
  const grouped = entries.reduce((acc, e) => {
    if (!acc[e.date]) acc[e.date] = []
    acc[e.date].push(e)
    return acc
  }, {})
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h2 className="text-sm font-semibold text-gray-700">
          Time Clock {entries.length > 0 && <span className="text-gray-400 font-normal">({entries.length} entries)</span>}
        </h2>
        <button onClick={openNew} className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Entry
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-green-700" />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-gray-400 py-20">
          <p className="text-5xl mb-3">⏱️</p>
          <p className="text-sm font-medium text-gray-500">No time entries yet</p>
          <p className="text-xs mt-1 mb-4">Track employee hours by job</p>
          <button onClick={openNew} className="btn-primary text-sm px-4 py-2">Add First Entry</button>
        </div>
      ) : (
        <>
          {/* ── Desktop table ─────────────────────────────────── */}
          <div className="hidden lg:block overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['Date', 'Name', 'Time In', 'Time Out', 'Regular', 'OT', 'Total', 'Job', ''].map(h => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${
                      ['Regular','OT','Total'].includes(h) ? 'text-right' : 'text-left'
                    }`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {entries.map((entry, idx) => {
                  const { total, regular, ot } = calcTimes(entry.time_in, entry.time_out)
                  const showDate = idx === 0 || entries[idx - 1].date !== entry.date
                  return (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-4 py-3 whitespace-nowrap">
                        {showDate
                          ? <span className="text-blue-600 font-medium text-xs">{fmtDateLabel(entry.date)}</span>
                          : null}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">{entry.employee_name}</td>
                      <td className="px-4 py-3 text-gray-600">{fmt12h(entry.time_in)}</td>
                      <td className="px-4 py-3 text-gray-600">{fmt12h(entry.time_out)}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-700">{fmtMins(regular)}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        <span className={ot > 0 ? 'text-orange-600 font-semibold' : 'text-gray-300'}>
                          {ot > 0 ? fmtMins(ot) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-gray-800">{fmtMins(total)}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">
                        {jobMap[entry.job_id] || <span className="text-gray-300 italic text-xs">No job</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(entry)}
                            className="p-1.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z" />
                            </svg>
                          </button>
                          <button onClick={() => deleteEntry(entry)}
                            className="p-1.5 rounded hover:bg-red-100 text-gray-400 hover:text-red-500">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* ── Mobile card list ───────────────────────────────── */}
          <div className="lg:hidden space-y-4 overflow-y-auto flex-1 pb-4">
            {dates.map(date => (
              <div key={date}>
                <p className="text-xs font-semibold text-blue-600 mb-2 px-1">{fmtDateLabel(date)}</p>
                <div className="space-y-2">
                  {grouped[date].map(entry => {
                    const { total, regular, ot } = calcTimes(entry.time_in, entry.time_out)
                    return (
                      <div key={entry.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 text-sm">{entry.employee_name}</p>
                            {entry.job_id && (
                              <p className="text-xs text-green-700 mt-0.5 truncate">{jobMap[entry.job_id]}</p>
                            )}
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => openEdit(entry)}
                              className="p-2 rounded-lg bg-gray-100 text-gray-500 active:bg-gray-200">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-3">
                          <div className="bg-gray-50 rounded-lg px-3 py-2">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Time In</p>
                            <p className="text-sm font-semibold text-gray-800">{fmt12h(entry.time_in)}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg px-3 py-2">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Time Out</p>
                            <p className="text-sm font-semibold text-gray-800">{fmt12h(entry.time_out)}</p>
                          </div>
                        </div>

                        {total != null && (
                          <div className="flex gap-3 mt-2 pt-2 border-t border-gray-100">
                            <span className="text-xs text-gray-500">
                              Regular: <span className="font-mono font-semibold text-gray-700">{fmtMins(regular)}</span>
                            </span>
                            {ot > 0 && (
                              <span className="text-xs font-semibold text-orange-600">
                                OT: <span className="font-mono">{fmtMins(ot)}</span>
                              </span>
                            )}
                            <span className="text-xs text-gray-500 ml-auto">
                              Total: <span className="font-mono font-bold text-gray-800">{fmtMins(total)}</span>
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <TimeEntryModal
          form={form}
          setForm={setForm}
          isEdit={!!editEntry}
          jobs={jobs}
          onSave={saveEntry}
          onClose={closeModal}
          saving={saving}
          error={error}
          onDelete={editEntry ? () => { deleteEntry(editEntry); closeModal() } : null}
        />
      )}
    </div>
  )
}

// ── Add / Edit Modal ─────────────────────────────────────────
function TimeEntryModal({ form, setForm, isEdit, jobs, onSave, onClose, saving, error, onDelete }) {
  const { total, regular, ot } = calcTimes(form.time_in, form.time_out)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-[440px] flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900">
            {isEdit ? 'Edit Time Entry' : 'Add Time Entry'}
          </h2>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 p-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

          {/* Employee name */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Employee Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.employee_name}
              onChange={e => setForm(f => ({ ...f, employee_name: e.target.value }))}
              placeholder="e.g. Hugo Guzman"
              className="input text-sm w-full"
              autoFocus
            />
          </div>

          {/* Job */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Job</label>
            <select
              value={form.job_id}
              onChange={e => setForm(f => ({ ...f, job_id: e.target.value }))}
              className="input text-sm w-full"
            >
              <option value="">— No job assigned —</option>
              {jobs.map(j => (
                <option key={j.id} value={j.id}>{j.name || j.client_name}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className="input text-sm w-full"
            />
          </div>

          {/* Time In / Time Out */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Time In <span className="text-red-400">*</span>
              </label>
              <input
                type="time"
                value={form.time_in}
                onChange={e => setForm(f => ({ ...f, time_in: e.target.value }))}
                className="input text-sm w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Time Out</label>
              <input
                type="time"
                value={form.time_out}
                onChange={e => setForm(f => ({ ...f, time_out: e.target.value }))}
                className="input text-sm w-full"
              />
            </div>
          </div>

          {/* Live preview of computed times */}
          {total != null && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Regular</p>
                <p className="text-sm font-mono font-bold text-gray-800">{fmtMins(regular)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">OT</p>
                <p className={`text-sm font-mono font-bold ${ot > 0 ? 'text-orange-600' : 'text-gray-300'}`}>
                  {fmtMins(ot)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Total</p>
                <p className="text-sm font-mono font-bold text-gray-800">{fmtMins(total)}</p>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Optional…"
              rows={2}
              className="input text-sm w-full resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        {/* Footer — always visible */}
        <div className="px-5 py-4 flex gap-2 flex-shrink-0 border-t border-gray-100">
          <button
            onClick={onSave}
            disabled={saving}
            className="flex-1 btn-primary text-sm py-3 disabled:opacity-50"
          >
            {saving ? 'Saving…' : isEdit ? 'Update Entry' : 'Save Entry'}
          </button>
          <button onClick={onClose}
            className="px-5 py-3 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          {onDelete && (
            <button onClick={onDelete}
              className="px-3 py-3 text-sm rounded-lg border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600">
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
