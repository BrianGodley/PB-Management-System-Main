// src/components/ConsultantPicker.jsx
//
// Two-step picker for assigning a consultant to an opportunity (client):
//   1) radio buttons — Design Consultant vs Installation Consultant
//   2) employee dropdown filtered to those holding the picked position
//
// Optional field. Pass the current employee_id (or null), and a callback
// receives the new employee_id (or null when cleared). Loads the
// employees + positions data once on mount.
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const POSITION_TITLES = {
  design: 'Design Consultant',
  install: 'Installation Consultant',
}

export default function ConsultantPicker({ value = null, onChange, compact = false }) {
  const [loading, setLoading] = useState(true)
  // [{ id, first_name, last_name, position_title }]
  const [consultants, setConsultants] = useState([])
  // 'design' | 'install' — radio selection driving which list to show
  const [consultantType, setConsultantType] = useState('design')

  useEffect(() => {
    let cancelled = false
    async function load() {
      // Pull both consultant types in one query via the employee_positions
      // join. Each row carries the position title so we can split into the
      // Design vs Installation buckets without a second round-trip.
      const { data } = await supabase
        .from('employee_positions')
        .select('employee_id, positions(title), employees(id, first_name, last_name, status)')
      if (cancelled) return
      const rows = (data || [])
        .filter(r => r.employees?.status === 'active')
        .filter(r =>
          r.positions?.title === POSITION_TITLES.design ||
          r.positions?.title === POSITION_TITLES.install,
        )
        .map(r => ({
          id: r.employees.id,
          first_name: r.employees.first_name || '',
          last_name: r.employees.last_name || '',
          position_title: r.positions.title,
        }))
      // De-dupe (employee could hold both positions; keep one row per type)
      const seen = new Set()
      const deduped = []
      for (const r of rows) {
        const k = `${r.id}::${r.position_title}`
        if (seen.has(k)) continue
        seen.add(k)
        deduped.push(r)
      }
      deduped.sort((a, b) => a.first_name.localeCompare(b.first_name))
      setConsultants(deduped)

      // If a value was preset, default the radio to the type of that
      // employee. Prefer Design if they hold both.
      if (value) {
        const match = deduped.find(r => r.id === value)
        if (match) {
          setConsultantType(
            match.position_title === POSITION_TITLES.install ? 'install' : 'design',
          )
        }
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
    // value is a dep — but we only use it for initial radio default. Don't
    // re-load if it changes; the parent will pass a fresh value naturally.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const wanted = consultantType === 'install' ? POSITION_TITLES.install : POSITION_TITLES.design
    return consultants.filter(r => r.position_title === wanted)
  }, [consultants, consultantType])

  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-2'}>
      <div className="flex items-center gap-3">
        <label className="inline-flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
          <input
            type="radio"
            name="consultantType"
            value="design"
            checked={consultantType === 'design'}
            onChange={() => setConsultantType('design')}
            className="text-green-600 focus:ring-green-500"
          />
          Design Consultant
        </label>
        <label className="inline-flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
          <input
            type="radio"
            name="consultantType"
            value="install"
            checked={consultantType === 'install'}
            onChange={() => setConsultantType('install')}
            className="text-green-600 focus:ring-green-500"
          />
          Installation Consultant
        </label>
      </div>
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value || null)}
        disabled={loading}
        className="w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:border-green-500"
      >
        <option value="">— None —</option>
        {filtered.map(r => (
          <option key={r.id} value={r.id}>
            {r.first_name} {r.last_name}
          </option>
        ))}
        {/* If the current value is an employee not in the filtered list
            (e.g., they hold the other type), include them explicitly so
            the select doesn't show as blank. */}
        {value && !filtered.some(r => r.id === value) && (() => {
          const other = consultants.find(r => r.id === value)
          if (!other) return null
          return (
            <option value={other.id}>
              {other.first_name} {other.last_name} ({other.position_title})
            </option>
          )
        })()}
      </select>
      {!loading && consultants.length === 0 && (
        <p className="text-[11px] text-gray-400 italic">
          No active Design or Installation Consultants found. Assign someone to one of
          those positions in HR &gt; Employees.
        </p>
      )}
    </div>
  )
}
