// src/components/JobFinancePanel.jsx
//
// The job's main Finance tab — Invoices / Payments sub-tabs.
//
// The action button on the right is sub-tab aware:
//   Invoices tab → "+ Invoice"  (menu: Progress Invoice / Manual Invoice)
//   Payments tab → "+ Payment"  (record a direct credit-card / bank / check payment)
//
// When a job isn't selected ("All Jobs") the tables span every job and the
// action button is disabled — both need one specific job.
import { useEffect, useRef, useState } from 'react'
import JobFinanceTab from './JobFinanceTab'
import JobPaymentsTab from './JobPaymentsTab'
import JobInvoiceCreateModal from './JobInvoiceCreateModal'
import JobPaymentEntryModal from './JobPaymentEntryModal'

const SUBTABS = [
  { key: 'invoices', label: 'Invoices' },
  { key: 'payments', label: 'Payments' },
]

export default function JobFinancePanel({ job, onOpenJobInvoice, invoiceDeepLink }) {
  const [section, setSection] = useState('invoices')
  const [menuOpen, setMenuOpen] = useState(false)
  const [createMode, setCreateMode] = useState(null) // 'progress' | 'manual' | null
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [paymentRefreshKey, setPaymentRefreshKey] = useState(0)
  const [deepLink, setDeepLink] = useState(invoiceDeepLink || null)
  const [toast, setToast] = useState('')
  const menuRef = useRef(null)
  const hasJob = !!job?.id

  // A deep-link from the all-jobs view targets an invoice — open the Invoices tab.
  useEffect(() => {
    if (invoiceDeepLink) {
      setDeepLink(invoiceDeepLink)
      setSection('invoices')
    }
  }, [invoiceDeepLink])

  useEffect(() => {
    if (!menuOpen) return
    const onDoc = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuOpen])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 6000)
    return () => clearTimeout(t)
  }, [toast])

  return (
    <div className="flex h-full flex-col">
      {/* Constant header — sub-tabs + action button. Never scrolls. */}
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
          {section === 'invoices' ? (
            <>
              <button
                onClick={() => hasJob && setMenuOpen(o => !o)}
                disabled={!hasJob}
                title={hasJob ? 'Create an invoice' : 'Select a job to create an invoice'}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                + Add Invoice
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
            </>
          ) : (
            <button
              onClick={() => hasJob && setPaymentOpen(true)}
              disabled={!hasJob}
              title={hasJob ? 'Record a payment' : 'Select a job to record a payment'}
              className="rounded-lg bg-green-700 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              + Payment
            </button>
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
        {section === 'invoices' && (
          <JobFinanceTab
            job={job}
            refreshKey={refreshKey}
            onOpenJobInvoice={onOpenJobInvoice}
            invoiceDeepLink={deepLink}
          />
        )}
        {section === 'payments' && (
          <JobPaymentsTab job={job} refreshKey={paymentRefreshKey} />
        )}
      </div>

      {createMode && job?.id && (
        <JobInvoiceCreateModal
          job={job}
          mode={createMode}
          onClose={() => setCreateMode(null)}
          onCreated={(invoiceId, msg) => {
            setCreateMode(null)
            setSection('invoices')
            setRefreshKey(k => k + 1)
            setToast(msg || 'Invoice created.')
            // Re-open as the saved invoice so the user sees the finished record.
            if (invoiceId) setDeepLink({ invoiceId, ts: Date.now() })
          }}
        />
      )}

      {paymentOpen && job?.id && (
        <JobPaymentEntryModal
          job={job}
          onClose={() => setPaymentOpen(false)}
          onSaved={() => {
            setPaymentOpen(false)
            setSection('payments')
            setPaymentRefreshKey(k => k + 1)
            setToast('Payment recorded.')
          }}
        />
      )}
    </div>
  )
}
