// src/components/JobFinancePanel.jsx
//
// The job's main Finance tab — Invoices / Payments sub-tabs plus a +Invoice
// menu (Progress Invoice / Manual Invoice) that opens JobInvoiceCreateModal.
//
// Layout: the sub-tab row + +Invoice button are a CONSTANT header that never
// scrolls; the active sub-tab fills the remaining height and scrolls on its
// own. When no job is selected ("All Jobs") the tables show every job's rows
// and +Invoice is disabled — a new invoice needs one specific job.
import { useEffect, useRef, useState } from 'react'
import JobFinanceTab from './JobFinanceTab'
import JobPaymentsTab from './JobPaymentsTab'
import JobInvoiceCreateModal from './JobInvoiceCreateModal'

const SUBTABS = [
  { key: 'invoices', label: 'Invoices' },
  { key: 'payments', label: 'Payments' },
]

export default function JobFinancePanel({ job }) {
  const [section, setSection] = useState('invoices')
  const [menuOpen, setMenuOpen] = useState(false)
  const [createMode, setCreateMode] = useState(null) // 'progress' | 'manual' | null
  const [refreshKey, setRefreshKey] = useState(0)
  const [toast, setToast] = useState('')
  const menuRef = useRef(null)
  const hasJob = !!job?.id

  // Close the +Invoice menu on any outside click.
  useEffect(() => {
    if (!menuOpen) return
    const onDoc = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuOpen])

  // Auto-dismiss the success toast.
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 6000)
    return () => clearTimeout(t)
  }, [toast])

  return (
    <div className="flex h-full flex-col">
      {/* Constant header — sub-tabs + +Invoice. Never scrolls. */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-5 pt-3">
        <div className="flex gap-1">
          {SUBTABS.map(t => (
            <button
              key={t.key}
              onClick={() => setSection(t.key)}
              className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
                section === t.key
                  ? 'border-b-2 border-green-600 text-green-700'
                  : 'border-b-2 border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative pb-2" ref={menuRef}>
          <button
            onClick={() => hasJob && setMenuOpen(o => !o)}
            disabled={!hasJob}
            title={hasJob ? 'Create an invoice' : 'Select a job to create an invoice'}
            className="rounded-lg bg-green-700 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            + Invoice
          </button>
          {menuOpen && hasJob && (
            <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
              <button
                onClick={() => {
                  setMenuOpen(false)
                  setCreateMode('progress')
                }}
                className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                Progress Invoice
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false)
                  setCreateMode('manual')
                }}
                className="block w-full border-t border-gray-100 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                Manual Invoice
              </button>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="mx-5 mt-3 flex-shrink-0 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
          {toast}
        </div>
      )}

      {/* Scrolling content region — the sub-tab component owns its own scroll. */}
      <div className="min-h-0 flex-1">
        {section === 'invoices' && <JobFinanceTab job={job} refreshKey={refreshKey} />}
        {section === 'payments' && <JobPaymentsTab job={job} />}
      </div>

      {createMode && job?.id && (
        <JobInvoiceCreateModal
          job={job}
          mode={createMode}
          onClose={() => setCreateMode(null)}
          onCreated={msg => {
            setCreateMode(null)
            setSection('invoices')
            setRefreshKey(k => k + 1)
            setToast(msg || 'Invoice created.')
          }}
        />
      )}
    </div>
  )
}
