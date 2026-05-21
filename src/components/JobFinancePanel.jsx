// src/components/JobFinancePanel.jsx
//
// The job's main Finance tab — a thin shell with two sub-tabs:
//   Invoices  → JobFinanceTab  (percentage-of-completion billing + invoice list)
//   Payments  → JobPaymentsTab (payments received against this job's invoices)
import { useState } from 'react'
import JobFinanceTab from './JobFinanceTab'
import JobPaymentsTab from './JobPaymentsTab'

const SUBTABS = [
  { key: 'invoices', label: 'Invoices' },
  { key: 'payments', label: 'Payments' },
]

export default function JobFinancePanel({ job }) {
  const [section, setSection] = useState('invoices')
  return (
    <div>
      <div className="flex gap-1 border-b border-gray-200 px-5 pt-3">
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
      {section === 'invoices' && <JobFinanceTab job={job} />}
      {section === 'payments' && <JobPaymentsTab job={job} />}
    </div>
  )
}
