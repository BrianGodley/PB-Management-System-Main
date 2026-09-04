import { Link } from 'react-router-dom'

// ─────────────────────────────────────────────────────────────────────────────
// The tab strip shared by every view of a job.
//
// Tracker lives on its own route (/jobs/:id/tracker) because it is a working
// surface a PM opens directly and links to, while Projects / Change Orders /
// Documents are panels within the job page. Rendering the SAME strip on both
// keeps that split invisible: the tabs behave like peers, and the user never
// lands somewhere with no way back except the breadcrumb.
//
// The three in-page tabs are addressable as ?tab=<key>, so a tab is linkable
// from the tracker and survives a refresh.
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'projects', label: '🏗 Projects' },
  { key: 'change_orders', label: '📋 Change Orders' },
  { key: 'tracker', label: '📊 Tracker' },
  { key: 'documents', label: '📁 Documents' },
]

export default function JobTabs({ jobId, active, onSelect = null }) {
  const cls = key =>
    `px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap ${
      active === key
        ? 'border-green-700 text-green-800'
        : 'border-transparent text-gray-500 hover:text-gray-700'
    }`

  return (
    <div className="flex gap-0 border-b border-gray-200 mb-4 overflow-x-auto thin-scroll">
      {TABS.map(t => {
        // Tracker is always a route. The rest are in-page when a handler is
        // supplied (we're on the job page) and links when it isn't (we're on
        // the tracker, so selecting one has to navigate back).
        if (t.key === 'tracker') {
          return (
            <Link key={t.key} to={`/jobs/${jobId}/tracker`} className={cls(t.key)}>
              {t.label}
            </Link>
          )
        }
        return onSelect ? (
          <button key={t.key} type="button" onClick={() => onSelect(t.key)} className={cls(t.key)}>
            {t.label}
          </button>
        ) : (
          <Link key={t.key} to={`/jobs/${jobId}?tab=${t.key}`} className={cls(t.key)}>
            {t.label}
          </Link>
        )
      })}
    </div>
  )
}
