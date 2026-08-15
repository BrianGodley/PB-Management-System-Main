import { useState, useEffect, useCallback } from 'react'
import { detectCategoryDrift, syncAllCategories } from '../lib/categorySync'

// Shows when the category lists across Material / Labor / Subcontractor have
// drifted apart, with one click to copy every missing category into whichever
// system lacks it. Renders nothing when the three lists already align.
const LABELS = {
  category: 'Material',
  labor_category: 'Labor',
  subcontractor_category: 'Subcontractor',
}

export default function CategorySyncBanner({ onSynced }) {
  const [drift, setDrift] = useState(null)
  const [busy, setBusy] = useState(false)

  const check = useCallback(async () => {
    try {
      setDrift(await detectCategoryDrift())
    } catch {
      setDrift(null)
    }
  }, [])
  useEffect(() => {
    check()
  }, [check])

  if (!drift || drift.aligned) return null

  const sync = async () => {
    setBusy(true)
    await syncAllCategories()
    await check()
    setBusy(false)
    onSynced?.()
  }

  return (
    <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <p className="font-semibold">
          Category lists are out of sync across Material, Labor &amp; Subcontractor.
        </p>
        <ul className="mt-1 list-disc list-inside text-amber-700">
          {Object.entries(drift.missing).map(([t, names]) => (
            <li key={t}>
              <b>{LABELS[t] || t}</b> is missing: {names.join(', ')}
            </li>
          ))}
        </ul>
      </div>
      <button
        onClick={sync}
        disabled={busy}
        className="shrink-0 bg-amber-600 text-white font-semibold px-3 py-1.5 rounded-md hover:bg-amber-700 disabled:opacity-60"
      >
        {busy ? 'Syncing…' : 'Sync now'}
      </button>
    </div>
  )
}
