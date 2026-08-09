import { useState } from 'react'
import { useRateIcons } from '../../contexts/RateIconsContext'
import ViewRatesModal from './ViewRatesModal'

// ─────────────────────────────────────────────────────────────────────────────
// CrewTypeBar — shared bar that used to be a copy-pasted "Crew Type" select in
// every module. Now also hosts:
//   • the "In-Line Edit Rates" toggle (shows/hides the inline rate-edit pencils),
//     moved here from the estimate modal header.
//   • a "View Rates" link that opens a popup listing every rate for the module
//     (editable regardless of the inline toggle).
//
// Props:
//   crewType, onCrewTypeChange — the select value + handler
//   crewOptions — option list (defaults to the standard five)
//   title       — module name, shown in the View Rates popup header
//   rates       — array of rate items / groups for the View Rates popup
//   refreshAllRates — re-fetch handler after an edit
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_CREW_OPTIONS = ['Demo', 'Landscape', 'Masonry', 'Paver', 'Specialty']

export default function CrewTypeBar({
  crewType,
  onCrewTypeChange,
  crewOptions = DEFAULT_CREW_OPTIONS,
  title = 'Module',
  rates = [],
  refreshAllRates,
  // When false, hide the "In-Line Edit Rates" toggle (keep only View Rates).
  showInlineToggle = true,
  // Label for the primary crew select (e.g. Walls uses "Main Wall Installation
  // Crew Type"). Defaults to the shared "Crew Type".
  crewLabel = 'Crew Type',
  // Additional crew selectors rendered after the primary one (Walls only):
  //   [{ label, value, onChange }] — each uses the same crewOptions.
  extraCrews = [],
}) {
  const { showRateIcons, toggleRateIcons, canAccessRates } = useRateIcons()
  const [showRates, setShowRates] = useState(false)
  const hasRates = Array.isArray(rates) && rates.length > 0

  return (
    <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-2.5 border border-gray-200 flex-wrap">
      <label className="text-sm font-medium text-gray-700 whitespace-nowrap">{crewLabel}</label>
      <select
        value={crewType}
        onChange={e => onCrewTypeChange(e.target.value)}
        className="input text-sm py-1 w-36"
      >
        {crewOptions.map(o => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>

      {extraCrews.map((c, i) => (
        <span key={i} className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">{c.label}</label>
          <select
            value={c.value}
            onChange={e => c.onChange(e.target.value)}
            className="input text-sm py-1 w-36"
          >
            {crewOptions.map(o => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </span>
      ))}

      <div className="flex items-center gap-3 ml-auto">
        {canAccessRates && showInlineToggle && (
          <button
            type="button"
            onClick={toggleRateIcons}
            title={
              showRateIcons
                ? 'Hide the inline rate-edit icons'
                : 'Show the inline rate-edit icons next to fields'
            }
            className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md border transition-colors ${
              showRateIcons
                ? 'bg-green-600 border-green-500 text-white hover:bg-green-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
            }`}
          >
            In-Line Edit Rates
            <span
              className={`text-[10px] uppercase tracking-wide ${
                showRateIcons ? 'text-green-100' : 'text-gray-500'
              }`}
            >
              {showRateIcons ? 'on' : 'off'}
            </span>
          </button>
        )}
        {canAccessRates && hasRates && (
          <button
            type="button"
            onClick={() => setShowRates(true)}
            className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 underline underline-offset-2"
          >
            View Rates
          </button>
        )}
      </div>

      {showRates && (
        <ViewRatesModal
          title={title}
          rates={rates}
          refreshAllRates={refreshAllRates}
          onClose={() => setShowRates(false)}
        />
      )}
    </div>
  )
}
