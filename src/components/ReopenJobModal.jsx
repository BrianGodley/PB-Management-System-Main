// src/components/ReopenJobModal.jsx
//
// Modal shown when reopening a closed job. Asks the user to pick:
//   1) which stage the job re-enters into
//   2) which employee is responsible for it going forward
//
// On confirm, the parent receives { stageId, employeeId, employeeName } and
// is responsible for writing the actual update (status='active' plus the
// picks). Loads its own employees + stages so it can be dropped in anywhere.
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function ReopenJobModal({ jobName, onCancel, onConfirm }) {
  const [employees, setEmployees] = useState([])
  const [stages, setStages] = useState([])
  const [loading, setLoading] = useState(true)
  const [stageId, setStageId] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [{ data: emps }, { data: stgs }] = await Promise.all([
        supabase
          .from('employees')
          .select('id, first_name, last_name')
          .eq('status', 'active')
          .order('first_name'),
        supabase.from('job_stages').select('id, name, sort_order').order('sort_order'),
      ])
      if (cancelled) return
      setEmployees(emps || [])
      setStages(stgs || [])
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const filteredEmployees = employees.filter(e => {
    if (!search.trim()) return true
    const full = `${e.first_name || ''} ${e.last_name || ''}`.toLowerCase()
    return full.includes(search.toLowerCase())
  })

  const selectedEmployee = employees.find(e => e.id === employeeId) || null

  const canConfirm = !!stageId && !!employeeId && !saving

  async function handleConfirm() {
    if (!canConfirm) return
    setSaving(true)
    const empName = selectedEmployee
      ? `${selectedEmployee.first_name || ''} ${selectedEmployee.last_name || ''}`.trim()
      : null
    try {
      await onConfirm({ stageId, employeeId, employeeName: empName })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <h3 className="text-sm font-bold text-gray-900">Reopen job</h3>
          {jobName && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{jobName}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Pick which stage the job re-enters and who's responsible for it.
          </p>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          {/* Stage picker */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Re-enter into stage
            </label>
            <select
              value={stageId}
              onChange={e => setStageId(e.target.value)}
              disabled={loading}
              className="input text-sm w-full"
            >
              <option value="">— Select a stage —</option>
              {stages.map(s => (
                <option key={s.id} value={s.id}>
                  {s.sort_order ? `${s.sort_order} - ${s.name}` : s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Employee picker */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Responsible employee
            </label>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search employees…"
              className="input text-sm w-full mb-2"
              disabled={loading}
            />
            <div className="border border-gray-200 rounded-md max-h-48 overflow-y-auto divide-y divide-gray-100">
              {loading && (
                <p className="text-center text-xs text-gray-400 py-4">Loading…</p>
              )}
              {!loading && filteredEmployees.length === 0 && (
                <p className="text-center text-xs text-gray-400 py-4">
                  No matching active employees.
                </p>
              )}
              {filteredEmployees.map(e => {
                const isSel = employeeId === e.id
                return (
                  <button
                    key={e.id}
                    onClick={() => setEmployeeId(e.id)}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${
                      isSel ? 'bg-green-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span
                      className={`inline-block w-4 h-4 rounded-full border ${
                        isSel ? 'bg-green-600 border-green-700' : 'border-gray-300'
                      }`}
                    />
                    <span className="flex-1 truncate">
                      {e.first_name} {e.last_name}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-end gap-2 flex-shrink-0">
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`px-3 py-1.5 text-sm rounded-md font-medium ${
              canConfirm
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {saving ? 'Reopening…' : 'Reopen job'}
          </button>
        </div>
      </div>
    </div>
  )
}
