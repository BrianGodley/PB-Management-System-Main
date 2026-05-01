import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Customized
} from 'recharts'

const FG = '#3A5038'
const OVERLAY_COLORS = ['#3A5038', '#2563EB', '#DC2626'] // green, blue, red — one per stat slot

// ── helpers ──────────────────────────────────────────────────────────────────
function fmt(value, statType) {
  if (value == null) return ''
  const n = Number(value)
  if (statType === 'currency')   return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (statType === 'percentage') return n.toFixed(2) + '%'
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

function isoDate(d) { return d ? d.toISOString().slice(0, 10) : '' }
function today()    { return isoDate(new Date()) }
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return isoDate(d) }

// Period labels for X axis
function periodLabel(dateStr, tracking) {
  const d = new Date(dateStr + 'T00:00:00')
  if (tracking === 'yearly')    return d.getFullYear().toString()
  if (tracking === 'quarterly') {
    const q = Math.floor(d.getMonth() / 3) + 1
    return `Q${q} ${d.getFullYear()}`
  }
  if (tracking === 'monthly')   return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  // weekly and daily — full date including year, e.g. "Sep 20, 2025"
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Given any date, find the week-ending date for that week
// weekEndingDay: 0=Sun … 6=Sat
function getWeekEndingDate(dateStr, weekEndingDay) {
  const d = new Date(dateStr + 'T00:00:00')
  const diff = (weekEndingDay - d.getDay() + 7) % 7
  d.setDate(d.getDate() + diff)
  return isoDate(d)
}

// Compute end date for target line: either a calendar date or n units after start date.
// `unit` is one of daily/weekly/monthly/quarterly/yearly and may differ from the stat's tracking.
function computeTargetEndDate(startDate, endMode, endDate, endPeriods, unit) {
  if (endMode === 'date') return endDate || startDate
  const n = parseInt(endPeriods) || 0
  if (n === 0) return startDate
  const d = new Date(startDate + 'T00:00:00')
  if      (unit === 'daily')     d.setDate(d.getDate() + n)
  else if (unit === 'weekly')    d.setDate(d.getDate() + n * 7)
  else if (unit === 'monthly')   d.setMonth(d.getMonth() + n)
  else if (unit === 'quarterly') d.setMonth(d.getMonth() + n * 3)
  else if (unit === 'yearly')    d.setFullYear(d.getFullYear() + n)
  return d.toISOString().slice(0, 10)
}

// ── PickSourceStatModal ───────────────────────────────────────────────────────
function PickSourceStatModal({ stats, onPick, onClose }) {
  const eligible = (stats || []).filter(s =>
    !s.archived && !['equation', 'overlay', 'target'].includes(s.stat_category)
  )
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-100 flex-shrink-0"
             style={{ backgroundColor: '#3A5038' }}>
          <h2 className="text-base font-bold text-white">🎯 Target Statistic — Pick Source</h2>
          <button onClick={onClose} className="text-white/70 hover:text-white text-xl leading-none">✕</button>
        </div>
        <p className="px-6 pt-4 pb-2 text-sm text-gray-500">
          Pick the statistic you want to create a target for:
        </p>
        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-1.5">
          {eligible.length === 0 && (
            <p className="text-sm text-gray-400 italic py-4 text-center">No eligible statistics found.</p>
          )}
          {eligible.map(s => (
            <button key={s.id} onClick={() => onPick(s)}
              className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:border-green-600 hover:bg-green-50 transition-colors">
              <div className="text-sm font-semibold text-gray-800">{s.name}</div>
              <div className="text-xs text-gray-500 mt-0.5 capitalize">{s.tracking} · {s.stat_type}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── TypeSelectorModal ─────────────────────────────────────────────────────────
function TypeSelectorModal({ onSelect, onClose }) {
  const types = [
    { key: 'basic',      label: 'Basic Statistic',    desc: 'Track a single numeric value over time.',   available: true  },
    { key: 'equation',   label: 'Equation Statistic',  desc: 'Combine multiple stats with a formula.',    available: true  },
    { key: 'overlay',    label: 'Overlay Statistic',   desc: 'Overlay two or more stats on one chart.',  available: true  },
    { key: 'secondary',  label: 'Secondary Statistic', desc: 'Aggregate an existing stat into a longer period (e.g. weekly → monthly).', available: true  },
    { key: 'auto',       label: 'Auto Statistic',      desc: 'Pull live data from jobs, bids, schedule, and more — auto-computed each period.',  available: true  },
  ]
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">New Statistic — Choose Type</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          {types.map(t => (
            <button
              key={t.key}
              disabled={!t.available}
              onClick={() => t.available && onSelect(t.key)}
              className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                t.available
                  ? 'border-gray-200 hover:border-green-600 hover:shadow-md cursor-pointer'
                  : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
              }`}
            >
              {!t.available && (
                <span className="absolute top-2 right-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                  Coming Soon
                </span>
              )}
              <div className="font-semibold text-gray-800 mb-1 pr-16">{t.label}</div>
              <div className="text-xs text-gray-500 leading-snug">{t.desc}</div>
            </button>
          ))}
        </div>

        {/* Target Statistic — full-width button below the grid */}
        <div className="px-6 pb-6">
          <button
            onClick={() => onSelect('target')}
            className="w-full rounded-xl border-2 border-green-600 p-4 text-left hover:shadow-md hover:bg-green-50 transition-all"
          >
            <div className="font-semibold text-green-800 mb-1">🎯 Target Statistic</div>
            <div className="text-xs text-gray-500 leading-snug">
              Mirror an existing stat and overlay a custom target line showing your goal over time.
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

// ── TargetLinesSection ───────────────────────────────────────────────────────
const PERIOD_UNITS = [
  { value: 'daily',     label: 'Days' },
  { value: 'weekly',    label: 'Weeks' },
  { value: 'monthly',   label: 'Months' },
  { value: 'quarterly', label: 'Quarters' },
  { value: 'yearly',    label: 'Years' },
]

function TargetLinesSection({ targetLines, setTargetLines, tracking }) {
  function addLine() {
    setTargetLines(prev => [...prev, {
      start_date: '', end_mode: 'date', end_date: '',
      end_periods: '', end_unit: tracking || 'monthly',
      start_value: '', end_value: '',
    }])
  }
  function removeLine(i) {
    setTargetLines(prev => prev.filter((_, idx) => idx !== i))
  }
  function updateLine(i, key, val) {
    setTargetLines(prev => prev.map((tl, idx) => idx === i ? { ...tl, [key]: val } : tl))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-700">Target Lines</span>
        <button type="button" onClick={addLine}
          className="text-xs px-2.5 py-1 rounded-lg bg-green-700 text-white font-semibold hover:bg-green-800 transition-colors">
          + Add Target Line
        </button>
      </div>
      {targetLines.length === 0 && (
        <p className="text-xs text-gray-400 italic">No target lines. Add one to draw a goal line on the chart.</p>
      )}
      <div className="space-y-3">
        {targetLines.map((tl, i) => (
          <div key={i} className="border border-gray-200 rounded-xl p-3 bg-gray-50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-green-700">Target Line {i + 1}</span>
              <button type="button" onClick={() => removeLine(i)}
                className="text-xs text-red-400 hover:text-red-600 font-semibold">Remove</button>
            </div>
            {/* Start date + start value */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-[11px] font-semibold text-gray-500 mb-0.5">Start Date</label>
                <input type="date" value={tl.start_date}
                  onChange={e => updateLine(i, 'start_date', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-600" />
              </div>
              <div className="flex-1">
                <label className="block text-[11px] font-semibold text-gray-500 mb-0.5">Start Value</label>
                <input type="number" value={tl.start_value} placeholder="0"
                  onChange={e => updateLine(i, 'start_value', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-600" />
              </div>
            </div>
            {/* End mode toggle */}
            <div className="flex gap-1">
              {[['date', 'End Date'], ['periods', '# of Periods']].map(([mode, label]) => (
                <button key={mode} type="button"
                  onClick={() => updateLine(i, 'end_mode', mode)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-semibold border transition-colors ${
                    tl.end_mode === mode
                      ? 'bg-green-700 text-white border-green-700'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-green-600'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
            {/* End date or periods + end value */}
            <div className="flex gap-2">
              <div className="flex-1">
                {tl.end_mode === 'date' ? (
                  <>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-0.5">End Date</label>
                    <input type="date" value={tl.end_date}
                      onChange={e => updateLine(i, 'end_date', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-600" />
                  </>
                ) : (
                  <>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-0.5">Number &amp; Unit</label>
                    <div className="flex gap-1">
                      <input type="number" min="1" value={tl.end_periods} placeholder="e.g. 4"
                        onChange={e => updateLine(i, 'end_periods', e.target.value)}
                        className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-600" />
                      <select
                        value={tl.end_unit || tracking || 'monthly'}
                        onChange={e => updateLine(i, 'end_unit', e.target.value)}
                        className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-600 bg-white">
                        {PERIOD_UNITS.map(u => (
                          <option key={u.value} value={u.value}>{u.label}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>
              <div className="flex-1">
                <label className="block text-[11px] font-semibold text-gray-500 mb-0.5">End Value</label>
                <input type="number" value={tl.end_value} placeholder="0"
                  onChange={e => updateLine(i, 'end_value', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-600" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── BasicStatForm ─────────────────────────────────────────────────────────────
function BasicStatForm({ initialData, profiles, onSave, onClose, onDelete, targetSource }) {
  const { user } = useAuth()

  const [form, setForm] = useState({
    name:                  initialData?.name || (targetSource ? `${targetSource.name} Target` : ''),
    stat_type:             initialData?.stat_type  || targetSource?.stat_type  || 'currency',
    tracking:              initialData?.tracking   || targetSource?.tracking   || 'monthly',
    beginning_date:        initialData?.beginning_date || daysAgo(90),
    upside_down:           initialData?.upside_down  || false,
    show_values:           initialData?.show_values  ?? false,
    owner_type:            initialData?.owner_type   || 'user',
    owner_user_id:         initialData?.owner_user_id || user?.id || '',
    owner_position_id:     initialData?.owner_position_id || '',
    default_periods:       initialData?.default_periods ?? '',
    missing_value_display: initialData?.missing_value_display || 'skip',
  })
  const [targetLines, setTargetLines] = useState(() => {
    const existing = initialData?.target_lines
    if (existing && Array.isArray(existing)) return existing
    // Pre-add one empty target line when creating a target stat
    if (targetSource) return [{ start_date: '', end_mode: 'date', end_date: '', end_periods: '', end_unit: targetSource.tracking || 'monthly', start_value: '', end_value: '' }]
    return []
  })
  const [saving,        setSaving]        = useState(false)
  const [archiving,     setArchiving]     = useState(false)
  const [deleting,      setDeleting]      = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [err,           setErr]           = useState('')

  const isEdit     = !!initialData?.id
  const isArchived = !!initialData?.archived

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim())    { setErr('Statistic Name is required.'); return }
    if (!form.default_periods || parseInt(form.default_periods) < 1) {
      setErr('Default # of Periods to Show is required.')
      return
    }
    const isTargetStat = !!(targetSource || initialData?.stat_category === 'target')
    // For target stats, derive beginning_date from the first target line start date
    let effectiveBeginningDate = form.beginning_date
    if (isTargetStat) {
      const firstLine = targetLines.find(tl => tl.start_date)
      effectiveBeginningDate = firstLine?.start_date || today()
    } else if (!form.beginning_date) {
      setErr('Beginning Date is required.')
      return
    }
    setSaving(true); setErr('')
    try {
      // Always ensure owner_user_id falls back to the current user when type = 'user'
      const resolvedOwnerUserId =
        form.owner_type === 'user'
          ? (form.owner_user_id || user?.id || null)
          : null

      const payload = {
        name:                  form.name.trim(),
        stat_type:             form.stat_type,
        tracking:              form.tracking,
        beginning_date:        effectiveBeginningDate,
        upside_down:           form.upside_down,
        show_values:           form.show_values,
        owner_type:            form.owner_type,
        owner_user_id:         resolvedOwnerUserId,
        owner_position_id:     form.owner_type === 'position' ? (form.owner_position_id || null) : null,
        is_public:             initialData?.is_public || false,
        stat_category:         isTargetStat ? 'target' : 'General',
        created_by:            user?.id || null,
        default_periods:       form.default_periods !== '' ? parseInt(form.default_periods) : null,
        missing_value_display: form.missing_value_display,
        target_lines:          targetLines.length > 0 ? targetLines : null,
      }

      console.log('[Statistics] saving payload:', payload)

      let error
      if (initialData?.id) {
        ({ error } = await supabase.from('statistics').update(payload).eq('id', initialData.id))
        console.log('[Statistics] update result — error:', error)
      } else {
        const res = await supabase.from('statistics').insert(payload)
        error = res.error
        console.log('[Statistics] insert result — error:', error, 'status:', res.status)
      }

      if (error) {
        console.error('[Statistics] save error:', error)
        throw error
      }

      console.log('[Statistics] save succeeded, calling onSave with name:', payload.name)
      await onSave(initialData?.id || null, payload.name)
    } catch (e) {
      setErr(e.message || 'Save failed — check the console for details.')
      setSaving(false)
    }
  }

  const handleArchive = async () => {
    setArchiving(true); setErr('')
    const { error } = await supabase
      .from('statistics')
      .update({ archived: !isArchived })
      .eq('id', initialData.id)
    setArchiving(false)
    if (error) { setErr(error.message); return }
    await onSave(initialData.id, initialData.name)
  }

  const handleDelete = async () => {
    setDeleting(true); setErr('')
    const { error } = await supabase
      .from('statistics')
      .delete()
      .eq('id', initialData.id)
    setDeleting(false)
    if (error) { setErr(error.message); return }
    onDelete()
  }

  const lbl = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1'
  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 bg-white'

  // Compact pill toggle for Yes/No fields
  const PillToggle = ({ name, value, onChange, options }) => (
    <div className="flex gap-1 mt-1">
      {options.map(([val, lab]) => (
        <button key={val} type="button" onClick={() => onChange(val)}
          className={`px-3 py-1 text-xs rounded-lg border font-semibold transition-colors ${
            value === val ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-600 border-gray-300 hover:border-green-500'
          }`}>
          {lab}
        </button>
      ))}
    </div>
  )

  const isTargetStat = !!(targetSource || initialData?.stat_category === 'target')

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-100 flex-shrink-0"
             style={{ backgroundColor: FG }}>
          <h2 className="text-base font-bold text-white">
            {isEdit ? 'Edit Statistic' : isTargetStat ? 'New Target Statistic' : 'New Basic Statistic'}
          </h2>
          <button onClick={onClose} className="text-white/70 hover:text-white text-xl leading-none">✕</button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">

          {isTargetStat && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-sm text-green-800 font-medium">
              🎯 Target Statistic — based on <strong>{targetSource?.name || initialData?.name}</strong>
            </div>
          )}

          {/* Name */}
          <div>
            <label className={lbl}>Statistic Name</label>
            <input
              className={inp}
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. Residential Sales — Brian G"
              autoFocus
            />
          </div>

          {/* Type | Tracking | Beginning Date — 3 col */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={lbl}>Statistic Type</label>
              <select className={inp} value={form.stat_type} onChange={e => set('stat_type', e.target.value)}>
                <option value="currency">($) Currency</option>
                <option value="numeric">(#) Numeric</option>
                <option value="percentage">(%) Percentage</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Tracking Period</label>
              <select className={inp} value={form.tracking} onChange={e => set('tracking', e.target.value)}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            {!isTargetStat && (
              <div>
                <label className={lbl}>Beginning Date</label>
                <input type="date" className={inp} value={form.beginning_date}
                  onChange={e => set('beginning_date', e.target.value)} />
              </div>
            )}
          </div>

          {/* Upside Down | Show Values | Default Periods — 3 col */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={lbl}>Upside Down Graph</label>
              <PillToggle
                value={form.upside_down ? 'yes' : 'no'}
                onChange={v => set('upside_down', v === 'yes')}
                options={[['no', 'No'], ['yes', 'Yes']]}
              />
            </div>
            <div>
              <label className={lbl}>Show Values on Graph</label>
              <PillToggle
                value={form.show_values ? 'yes' : 'no'}
                onChange={v => set('show_values', v === 'yes')}
                options={[['no', 'No'], ['yes', 'Yes']]}
              />
            </div>
            <div>
              <label className={lbl}>Default # of Periods</label>
              <input type="number" min="1" className={inp}
                value={form.default_periods}
                onChange={e => set('default_periods', e.target.value)}
                placeholder="e.g. 12" />
            </div>
          </div>

          {/* Missing Values | Assignment — 2 col */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Missing / Not-Entered Values</label>
              <PillToggle
                value={form.missing_value_display}
                onChange={v => set('missing_value_display', v)}
                options={[['skip', 'Skip (gap)'], ['zero', 'Show as Zero']]}
              />
            </div>
            <div>
              <label className={lbl}>Assigned To</label>
              <div className="flex gap-1 mt-1 mb-2">
                {[['user', 'User'], ['position', 'Position']].map(([val, lab]) => (
                  <button key={val} type="button" onClick={() => set('owner_type', val)}
                    className={`px-3 py-1 text-xs rounded-lg border font-semibold transition-colors ${
                      form.owner_type === val ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-600 border-gray-300 hover:border-green-500'
                    }`}>
                    {lab}
                  </button>
                ))}
              </div>
              {form.owner_type === 'user' ? (
                <select className={inp} value={form.owner_user_id} onChange={e => set('owner_user_id', e.target.value)}>
                  <option value="">— Select User —</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                  ))}
                </select>
              ) : (
                <div className="text-xs text-gray-400 italic px-3 py-2 border border-dashed border-gray-300 rounded-lg">
                  Position assignment coming soon
                </div>
              )}
            </div>
          </div>

          {err && <p className="text-red-600 text-sm font-medium">{err}</p>}

          {/* Target Lines Section — only for target stats */}
          {isTargetStat && (
            <div className="border-t border-gray-100 pt-3">
              <TargetLinesSection targetLines={targetLines} setTargetLines={setTargetLines} tracking={form.tracking} />
            </div>
          )}

          {/* Row 5: Archive | Delete (edit only, side by side) */}
          {isEdit && (
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-100">
              {/* Archive / Restore */}
              <div className={`rounded-xl border px-4 py-3 flex flex-col gap-2 ${isArchived ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className={`text-xs font-bold ${isArchived ? 'text-green-800' : 'text-amber-800'}`}>
                      {isArchived ? '📦 Restore' : '📦 Archive'}
                    </p>
                    <p className={`text-xs mt-0.5 ${isArchived ? 'text-green-700' : 'text-amber-700'}`}>
                      {isArchived ? 'Move back to active stats' : 'Hide — viewable under Archived'}
                    </p>
                  </div>
                  <button
                    onClick={handleArchive}
                    disabled={archiving}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border disabled:opacity-50 flex-shrink-0 ${
                      isArchived
                        ? 'border-green-400 text-green-800 hover:bg-green-100'
                        : 'border-amber-400 text-amber-800 hover:bg-amber-100'
                    }`}
                  >
                    {archiving ? '…' : isArchived ? 'Restore' : 'Archive'}
                  </button>
                </div>
              </div>

              {/* Delete */}
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-red-700">🗑️ Delete</p>
                    <p className="text-xs text-red-600 mt-0.5">Permanently removes all data</p>
                  </div>
                  {!confirmDelete && (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="px-3 py-1.5 rounded-lg border border-red-300 text-xs font-bold text-red-700 hover:bg-red-100 flex-shrink-0"
                    >
                      Delete…
                    </button>
                  )}
                </div>
                {confirmDelete && (
                  <div className="mt-2.5 space-y-2">
                    <p className="text-xs font-semibold text-red-700">Delete "<strong>{initialData.name}</strong>" permanently?</p>
                    <div className="flex gap-2">
                      <button onClick={handleDelete} disabled={deleting}
                        className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-50">
                        {deleting ? 'Deleting…' : 'Yes, Delete'}
                      </button>
                      <button onClick={() => setConfirmDelete(false)}
                        className="px-3 py-1 rounded-lg border border-gray-300 text-xs text-gray-600 hover:bg-gray-50">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-3 border-t border-gray-100 bg-gray-50 flex-shrink-0">
          <button onClick={onClose} className="px-5 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 font-medium">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-50"
            style={{ backgroundColor: FG }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Generate period dates for a tracking type ─────────────────────────────────
// weekEndingDay: 0=Sun … 6=Sat (only used when tracking === 'weekly')
function generatePeriods(fromDate, toDate, tracking, weekEndingDay) {
  const periods = []
  const end = new Date(toDate + 'T00:00:00')
  let cur = new Date(fromDate + 'T00:00:00')

  if (tracking === 'daily') {
    while (cur <= end) { periods.push(isoDate(cur)); cur.setDate(cur.getDate() + 1) }
  } else if (tracking === 'weekly') {
    // Advance cur to the first week-ending day on or after fromDate
    const diff = (weekEndingDay - cur.getDay() + 7) % 7
    cur.setDate(cur.getDate() + diff)
    while (cur <= end) { periods.push(isoDate(cur)); cur.setDate(cur.getDate() + 7) }
  } else if (tracking === 'monthly') {
    // Period date = last day of each month
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 0)  // last day of fromDate's month
    while (cur <= end) {
      periods.push(isoDate(cur))
      cur = new Date(cur.getFullYear(), cur.getMonth() + 2, 0)  // last day of next month
    }
  } else if (tracking === 'quarterly') {
    // Period date = last day of each quarter (Mar 31, Jun 30, Sep 30, Dec 31)
    const quarterEnd = (year, q) => new Date(year, q * 3 + 3, 0)  // last day of quarter q (0-indexed)
    let q = Math.floor(cur.getMonth() / 3)
    cur = quarterEnd(cur.getFullYear(), q)
    while (cur <= end) {
      periods.push(isoDate(cur))
      q++
      const y = cur.getFullYear() + Math.floor(q / 4)
      cur = quarterEnd(y, q % 4)
    }
  } else if (tracking === 'yearly') {
    // Period date = Dec 31 of each year
    cur = new Date(cur.getFullYear(), 11, 31)
    while (cur <= end) { periods.push(isoDate(cur)); cur = new Date(cur.getFullYear() + 1, 11, 31) }
  }
  return periods
}

// Match a saved value's date to a period bucket
// weekEndingDay: 0=Sun … 6=Sat (only used for 'weekly')
function matchesPeriod(valueDate, periodDate, tracking, weekEndingDay) {
  const v = new Date(valueDate + 'T00:00:00')
  const p = new Date(periodDate + 'T00:00:00')
  if (tracking === 'daily')     return valueDate === periodDate
  if (tracking === 'weekly')    return getWeekEndingDate(valueDate, weekEndingDay) === getWeekEndingDate(periodDate, weekEndingDay)
  if (tracking === 'monthly')   return v.getFullYear()===p.getFullYear() && v.getMonth()===p.getMonth()
  if (tracking === 'quarterly') return v.getFullYear()===p.getFullYear() && Math.floor(v.getMonth()/3)===Math.floor(p.getMonth()/3)
  if (tracking === 'yearly')    return v.getFullYear()===p.getFullYear()
  return false
}

// ── Step 1: Date Range Selector ───────────────────────────────────────────────
function DateRangeSelectorModal({ stat, onSelect, onClose }) {
  const [customDate, setCustomDate] = useState('')

  const presets = [
    { label: '1 Month',   months: 1  },
    { label: '3 Months',  months: 3  },
    { label: '6 Months',  months: 6  },
    { label: '1 Year',    months: 12 },
    { label: '4 Years',   months: 48 },
    { label: 'Beginning', from: stat.beginning_date },
  ]

  const pick = (from) => onSelect(from, today())

  const handlePreset = ({ months, from }) => {
    if (from) { pick(from); return }
    const d = new Date()
    d.setMonth(d.getMonth() - months)
    pick(isoDate(d))
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">How far back?</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <div className="p-5 space-y-2">
          {presets.map(p => (
            <button
              key={p.label}
              onClick={() => handlePreset(p)}
              className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 hover:border-green-600 hover:bg-green-50 text-sm font-semibold text-gray-700 hover:text-green-800 transition-all text-left"
            >
              {p.label}
            </button>
          ))}
          <div className="flex gap-2 pt-2 border-t border-gray-100 mt-2">
            <input
              type="date"
              value={customDate}
              onChange={e => setCustomDate(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            />
            <button
              onClick={() => customDate && pick(customDate)}
              disabled={!customDate}
              className="px-4 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-40 transition-opacity"
              style={{ backgroundColor: FG }}
            >
              Go →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Step 2: Edit Value History Modal ──────────────────────────────────────────
const MODAL_BLUE = '#354fa0'
const TH_BLUE    = '#c5d5e8'

function EditValueHistoryModal({ stat, fromDate, values, onClose, onRefresh, weekEndingDay }) {
  const { user }     = useAuth()
  const [isEditing,  setIsEditing]  = useState(false)
  const [drafts,     setDrafts]     = useState({})  // periodDate → string
  const [saving,     setSaving]     = useState(false)
  const [saveErr,    setSaveErr]    = useState('')

  // ── All periods in range ───────────────────────────────────────────────────
  const periods = useMemo(
    () => generatePeriods(fromDate, today(), stat.tracking, weekEndingDay),
    [fromDate, stat.tracking, weekEndingDay]
  )

  // period date → existing DB row
  const valueByPeriod = useMemo(() => {
    const map = {}
    periods.forEach(p => {
      const match = values.find(v => matchesPeriod(v.period_date, p, stat.tracking, weekEndingDay))
      if (match) map[p] = match
    })
    return map
  }, [periods, values, stat.tracking, weekEndingDay])

  // Initialise / reset drafts whenever periods change (= modal open / range change)
  useEffect(() => {
    const d = {}
    periods.forEach(p => { d[p] = valueByPeriod[p]?.value?.toString() ?? '' })
    setDrafts(d)
    setIsEditing(false)
    setSaveErr('')
  }, [periods])   // intentionally NOT on valueByPeriod to avoid resetting mid-edit

  // ── Group periods for display ──────────────────────────────────────────────
  // weekly / daily  → group by month  ("January 2026")
  // monthly / quarterly → group by year  ("2026")
  // yearly → single group
  const groups = useMemo(() => {
    const map = new Map()
    periods.forEach(p => {
      const d = new Date(p + 'T00:00:00')
      let key, label
      if (stat.tracking === 'yearly') {
        key = 'all'; label = 'All Years'
      } else if (stat.tracking === 'monthly' || stat.tracking === 'quarterly') {
        key   = String(d.getFullYear())
        label = String(d.getFullYear())
      } else {
        key   = `${d.getFullYear()}-${d.getMonth()}`
        label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      }
      if (!map.has(key)) map.set(key, { label, periods: [] })
      map.get(key).periods.push(p)
    })
    return [...map.values()]
  }, [periods, stat.tracking])

  // ── Date label inside each table row ──────────────────────────────────────
  function rowLabel(p) {
    const d = new Date(p + 'T00:00:00')
    if (stat.tracking === 'daily' || stat.tracking === 'weekly')
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    if (stat.tracking === 'monthly')
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    if (stat.tracking === 'quarterly') {
      const q = Math.floor(d.getMonth() / 3) + 1
      return `Q${q} ${d.getFullYear()}`
    }
    return String(d.getFullYear())
  }

  // ── Save all changes in one batch ──────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true); setSaveErr('')
    const toUpsert = []
    const toDelete = []

    for (const p of periods) {
      const draft    = (drafts[p] ?? '').trim()
      const existing = valueByPeriod[p]

      if (draft !== '') {
        const num = parseFloat(draft)
        if (!isNaN(num)) {
          // Delete old row first if it was stored under a different date
          if (existing && existing.period_date !== p) {
            const { error: delErr } = await supabase
              .from('statistic_values').delete().eq('id', existing.id)
            if (delErr) { setSaveErr(delErr.message); setSaving(false); return }
          }
          // Only upsert if value actually changed
          if (!existing || Number(existing.value) !== num) {
            toUpsert.push({ statistic_id: stat.id, period_date: p, value: num, entered_by: user?.id })
          }
        }
      } else if (existing) {
        toDelete.push(existing.id)
      }
    }

    if (toUpsert.length > 0) {
      const { error } = await supabase.from('statistic_values')
        .upsert(toUpsert, { onConflict: 'statistic_id,period_date' })
      if (error) { setSaveErr(error.message); setSaving(false); return }
    }
    if (toDelete.length > 0) {
      const { error } = await supabase.from('statistic_values').delete().in('id', toDelete)
      if (error) { setSaveErr(error.message); setSaving(false); return }
    }

    setSaving(false)
    setIsEditing(false)
    await onRefresh()
  }

  const handleCancel = () => {
    const d = {}
    periods.forEach(p => { d[p] = valueByPeriod[p]?.value?.toString() ?? '' })
    setDrafts(d)
    setIsEditing(false)
    setSaveErr('')
  }

  // Grid columns: 2 for weekly/daily (matches screenshot), 2 for monthly/quarterly, 1 for yearly
  const gridCls = stat.tracking === 'yearly'
    ? 'grid-cols-1 max-w-sm mx-auto'
    : 'grid-cols-1 sm:grid-cols-2'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden" style={{ maxHeight: '90vh' }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-3.5 flex-shrink-0"
             style={{ backgroundColor: MODAL_BLUE }}>
          <h2 className="text-base font-semibold text-white truncate mr-4">{stat.name}</h2>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-1.5 rounded text-sm font-bold bg-white hover:bg-gray-100 transition-colors"
                style={{ color: MODAL_BLUE }}
              >
                Edit
              </button>
            ) : (
              <>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1.5 rounded text-sm font-medium text-white border border-white/40 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-1.5 rounded text-sm font-bold bg-white hover:bg-gray-100 disabled:opacity-50 transition-colors"
                  style={{ color: MODAL_BLUE }}
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </>
            )}
            <button onClick={onClose} className="text-white/70 hover:text-white text-lg leading-none ml-1">✕</button>
          </div>
        </div>

        {/* ── Content ─────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5">
          {saveErr && (
            <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-2 rounded-lg">
              ⚠️ {saveErr}
            </div>
          )}

          {periods.length === 0 ? (
            <div className="text-center text-gray-400 py-16">No periods in this date range.</div>
          ) : (
            <div className={`grid ${gridCls} gap-5`}>
              {groups.map(group => (
                <div key={group.label}>
                  {/* Group header */}
                  <p className="text-center text-sm font-semibold text-gray-700 mb-1.5">{group.label}</p>

                  {/* Period table */}
                  <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                    <thead>
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold text-gray-700 w-1/2"
                            style={{ backgroundColor: TH_BLUE }}>Date</th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-700 w-1/2"
                            style={{ backgroundColor: TH_BLUE }}>Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {group.periods.map(p => {
                        const hasVal = (drafts[p] ?? '') !== ''
                        return (
                          <tr key={p}>
                            <td className="px-3 py-1.5 text-gray-700 whitespace-nowrap">{rowLabel(p)}</td>
                            <td className="px-3 py-1">
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={drafts[p] ?? ''}
                                  onChange={e => setDrafts(d => ({ ...d, [p]: e.target.value }))}
                                  placeholder="—"
                                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                                />
                              ) : (
                                <span className={hasVal ? 'text-gray-900 font-medium' : 'text-gray-400 italic text-xs'}>
                                  {hasVal ? fmt(Number(drafts[p]), stat.stat_type) : 'Not Entered'}
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 flex-shrink-0">
          <span className="text-xs text-gray-400 capitalize">
            {stat.tracking} · {fromDate} → {today()} · {Object.values(valueByPeriod).length} of {periods.length} entered
          </span>
          <button onClick={onClose}
            className="px-5 py-2 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Custom graph cursor: value badge at the point, date badge at bottom ──────
function GraphCursor({ points, height, payload, stat, chartData }) {
  if (!points?.length || !payload?.length) return null
  const { x } = points[0]
  const value = payload[0]?.value
  if (value == null || !isFinite(value)) return null
  const y         = points[0].y
  const dateLabel = payload[0]?.payload?.label ?? ''

  const badgeColor = FG

  // ── Value badge — centred ON the data point ───────────────────────────────
  const valText = fmt(value, stat?.stat_type)
  const valW    = Math.max(64, valText.length * 7 + 16)
  const valH    = 24
  const valBX   = x - valW / 2   // horizontally centred on point
  const valBY   = y - valH / 2   // vertically centred on point

  // ── Date badge — centred on the line at the very bottom ──────────────────
  const dateW  = Math.max(90, dateLabel.length * 7 + 16)
  const dateH  = 22
  const dateY  = height + 32   // below x-axis labels

  return (
    <g>
      {/* Dashed vertical line — extends down to the date badge */}
      <line
        x1={x} y1={0}
        x2={x} y2={dateY + dateH / 2}
        stroke="#9ca3af"
        strokeWidth={1}
        strokeDasharray="3 3"
      />

      {/* Value badge centred on the data point */}
      <rect
        x={valBX}
        y={valBY}
        width={valW}
        height={valH}
        rx={5}
        fill={badgeColor}
      />
      <text
        x={x}
        y={valBY + valH / 2 + 4}
        textAnchor="middle"
        fontSize={11}
        fontWeight={700}
        fill="white"
      >
        {valText}
      </text>

      {/* Date badge at the bottom of the line */}
      {dateLabel && (
        <>
          <rect
            x={x - dateW / 2}
            y={dateY}
            width={dateW}
            height={dateH}
            rx={5}
            fill="#0e7490"
          />
          <text
            x={x}
            y={dateY + dateH / 2 + 4}
            textAnchor="middle"
            fontSize={11}
            fontWeight={700}
            fill="white"
          >
            {dateLabel}
          </text>
        </>
      )}
    </g>
  )
}

// ── Clickable dot with note indicator ────────────────────────────────────────
function NoteDot({ cx, cy, payload, notesByDate }) {
  if (!cx || !cy || payload?.value == null) return null
  const date    = payload?.date
  const hasNote = date && notesByDate?.has(date)
  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill={FG} stroke="white" strokeWidth={2} />
      {hasNote && (
        <>
          <circle cx={cx + 5} cy={cy - 5} r={5} fill="#f59e0b" stroke="white" strokeWidth={1.5} />
          <text x={cx + 5} y={cy - 5 + 3.5} textAnchor="middle" fontSize={7} fontWeight={700} fill="white">N</text>
        </>
      )}
    </g>
  )
}

// ── Colored line segments: black = increasing, red = decreasing ───────────────
function ColoredLineSegments({ formattedGraphicalItems, stat }) {
  const points = (formattedGraphicalItems?.[0]?.props?.points ?? [])
    .filter(p => p != null && p.value != null && isFinite(p.x) && isFinite(p.y))

  if (points.length === 0) return null

  return (
    <g>
      {/* Colored segments */}
      {points.map((pt, i) => {
        if (i === 0) return null
        const prev = points[i - 1]
        const going = stat?.upside_down
          ? pt.value <= prev.value   // inverted: lower is "better" so lower = black
          : pt.value >= prev.value   // normal: higher is better so higher = black
        const color = going ? '#111111' : '#dc2626'
        return (
          <line
            key={`seg-${i}`}
            x1={prev.x} y1={prev.y}
            x2={pt.x}   y2={pt.y}
            stroke={color}
            strokeWidth={3.1}
            strokeLinecap="round"
          />
        )
      })}

      {/* Dots + optional value labels */}
      {points.map((pt, i) => {
        const prev = points[i - 1]
        const going = prev == null
          ? true
          : stat?.upside_down
            ? pt.value <= prev.value
            : pt.value >= prev.value
        const dotColor = going ? '#111111' : '#dc2626'
        return (
          <g key={`dot-${i}`}>
            <circle cx={pt.x} cy={pt.y} r={4} fill={dotColor} stroke="#fff" strokeWidth={2} />
            {stat?.show_values && (
              <text
                x={pt.x} y={pt.y - 10}
                textAnchor="middle"
                fontSize={12}
                fill="#374151"
                fontWeight={600}
              >
                {fmt(pt.value, stat?.stat_type)}
              </text>
            )}
          </g>
        )
      })}
    </g>
  )
}

// ── Target Line Segments ─────────────────────────────────────────────────────
function TargetLineSegments({ formattedGraphicalItems, yAxisMap, targetLines, displayChartData, tracking }) {
  if (!targetLines?.length || !displayChartData?.length) return null

  const yAxis = yAxisMap && Object.values(yAxisMap)[0]
  if (!yAxis?.scale) return null
  const yScale = yAxis.scale

  // Build label → x pixel position from the invisible line's rendered points
  const points = formattedGraphicalItems?.[0]?.props?.points ?? []
  const labelToX = {}
  displayChartData.forEach((d, i) => {
    if (points[i] && isFinite(points[i].x)) labelToX[d.label] = points[i].x
  })

  return (
    <g>
      {targetLines.map((tl, i) => {
        if (!tl.start_date) return null
        const endDate = computeTargetEndDate(tl.start_date, tl.end_mode, tl.end_date, tl.end_periods, tl.end_unit || tracking)
        const sLabel = periodLabel(tl.start_date, tracking)
        const eLabel = periodLabel(endDate, tracking)
        const x1 = labelToX[sLabel]
        const x2 = labelToX[eLabel]
        if (x1 === undefined || x2 === undefined) return null
        const y1 = yScale(Number(tl.start_value) || 0)
        const y2 = yScale(Number(tl.end_value) || 0)
        if (!isFinite(y1) || !isFinite(y2)) return null
        return (
          <g key={i}>
            <line x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="#16a34a" strokeWidth={1.5}
              strokeDasharray="6 3" strokeLinecap="round" opacity={0.85} />
            <circle cx={x1} cy={y1} r={3} fill="#16a34a" />
            <circle cx={x2} cy={y2} r={3} fill="#16a34a" />
          </g>
        )
      })}
    </g>
  )
}

// ── Dual-handle Date Range Scrubber ──────────────────────────────────────────
function DateRangeScrubber({ minDate, maxDate, fromDate, toDate, onFromChange, onToChange }) {
  const trackRef    = useRef(null)
  const draggingRef = useRef(null)   // 'from' | 'to'
  const stateRef    = useRef({})     // always-current values without re-registering listeners

  const toMs  = (d) => new Date(d + 'T00:00:00').getTime()
  const minMs = toMs(minDate)
  const maxMs = toMs(maxDate)
  const span  = Math.max(maxMs - minMs, 1)
  const pct   = (d) => Math.max(0, Math.min(100, ((toMs(d) - minMs) / span) * 100))

  stateRef.current = { fromDate, toDate, onFromChange, onToChange }

  useEffect(() => {
    const onMove = (e) => {
      if (!draggingRef.current || !trackRef.current) return
      const rect  = trackRef.current.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      const ms    = minMs + ratio * span
      const date  = isoDate(new Date(ms))
      const { fromDate: fd, toDate: td, onFromChange: ofc, onToChange: otc } = stateRef.current
      if (draggingRef.current === 'from' && date < td) ofc(date)
      if (draggingRef.current === 'to'   && date > fd) otc(date)
    }
    const onUp = () => { draggingRef.current = null }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup',   onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup',   onUp)
    }
  }, [minMs, span])

  const leftPct  = pct(fromDate)
  const rightPct = pct(toDate)

  const fmtLabel = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="px-6 py-3 bg-white border-t border-gray-100 flex-shrink-0">
      {/* End-date labels */}
      <div className="flex justify-between text-xs text-gray-400 mb-1 px-0.5">
        <span>{fmtLabel(minDate)}</span>
        <span>{fmtLabel(maxDate)}</span>
      </div>

      {/* Track */}
      <div ref={trackRef} className="relative h-5 flex items-center select-none">
        <div className="absolute inset-x-0 h-1.5 bg-gray-200 rounded-full" />
        <div className="absolute h-1.5 rounded-full" style={{ left: `${leftPct}%`, right: `${100 - rightPct}%`, backgroundColor: FG }} />

        {/* From handle */}
        <div
          onMouseDown={(e) => { e.preventDefault(); draggingRef.current = 'from' }}
          className="absolute w-5 h-5 rounded-full border-2 bg-white shadow-md cursor-grab active:cursor-grabbing z-10 transition-shadow hover:shadow-lg"
          style={{ left: `${leftPct}%`, transform: 'translateX(-50%)', borderColor: FG }}
        />
        {/* To handle */}
        <div
          onMouseDown={(e) => { e.preventDefault(); draggingRef.current = 'to' }}
          className="absolute w-5 h-5 rounded-full border-2 bg-white shadow-md cursor-grab active:cursor-grabbing z-10 transition-shadow hover:shadow-lg"
          style={{ left: `${rightPct}%`, transform: 'translateX(-50%)', borderColor: FG }}
        />
      </div>

      {/* Handle date labels — positioned under each handle */}
      <div className="relative h-4 mt-1">
        <span
          className="absolute text-xs font-medium text-gray-600 whitespace-nowrap transform -translate-x-1/2"
          style={{ left: `${leftPct}%` }}
        >
          {fmtLabel(fromDate)}
        </span>
        <span
          className="absolute text-xs font-medium text-gray-600 whitespace-nowrap transform -translate-x-1/2"
          style={{ left: `${rightPct}%` }}
        >
          {fmtLabel(toDate)}
        </span>
      </div>
    </div>
  )
}

// ── Multiple Entry View ───────────────────────────────────────────────────────
function MultipleEntryView({ stats, weekEndingDay }) {
  const { user } = useAuth()

  const [entryTracking, setEntryTracking] = useState('weekly')
  const [periodDate,    setPeriodDate]    = useState(null)
  const [dbValues,      setDbValues]      = useState([])
  const [drafts,        setDrafts]        = useState({})   // statId → string
  const [loading,       setLoading]       = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [saveMsg,       setSaveMsg]       = useState('')

  // Stats matching the selected tracking type (non-archived, direct-entry only), sorted A→Z
  const filteredStats = useMemo(
    () => stats
      .filter(s => !s.archived && s.tracking === entryTracking && !['equation','overlay','target'].includes(s.stat_category))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [stats, entryTracking]
  )

  // ── Period helpers ────────────────────────────────────────────────────────
  function canonicalPeriod(tracking, refDate) {
    const d = refDate ? new Date(refDate + 'T00:00:00') : new Date()
    if (tracking === 'daily')     return isoDate(d)
    if (tracking === 'weekly')    return getWeekEndingDate(isoDate(d), weekEndingDay ?? 5)
    if (tracking === 'monthly')   return isoDate(new Date(d.getFullYear(), d.getMonth() + 1, 0))
    if (tracking === 'quarterly') {
      const q = Math.floor(d.getMonth() / 3)
      return isoDate(new Date(d.getFullYear(), q * 3 + 3, 0))
    }
    return `${d.getFullYear()}-12-31`
  }

  function navigatePeriod(dir) {
    const d = new Date(periodDate + 'T00:00:00')
    if (entryTracking === 'daily')     { d.setDate(d.getDate() + dir);                   setPeriodDate(isoDate(d)) }
    else if (entryTracking === 'weekly')    { d.setDate(d.getDate() + dir * 7);               setPeriodDate(isoDate(d)) }
    else if (entryTracking === 'monthly')   { setPeriodDate(isoDate(new Date(d.getFullYear(), d.getMonth() + 1 + dir, 0))) }
    else if (entryTracking === 'quarterly') { setPeriodDate(isoDate(new Date(d.getFullYear(), d.getMonth() + 1 + dir * 3, 0))) }
    else                                    { setPeriodDate(`${d.getFullYear() + dir}-12-31`) }
  }

  function formatPeriod(dateStr, tracking) {
    if (!dateStr) return '—'
    const d = new Date(dateStr + 'T00:00:00')
    if (tracking === 'daily')     return d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
    if (tracking === 'weekly')    return 'W/E ' + d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    if (tracking === 'monthly')   return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    if (tracking === 'quarterly') return `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`
    return String(d.getFullYear())
  }

  // Reset period when tracking type changes
  useEffect(() => { setPeriodDate(canonicalPeriod(entryTracking)) }, [entryTracking, weekEndingDay])

  // Load values whenever the stat list or period changes
  useEffect(() => {
    if (!periodDate || filteredStats.length === 0) { setDbValues([]); setDrafts({}); return }
    loadValues()
  }, [filteredStats.map(s => s.id).join(','), periodDate])

  async function loadValues() {
    setLoading(true)
    const ids = filteredStats.map(s => s.id)
    const { data } = await supabase
      .from('statistic_values')
      .select('*')
      .in('statistic_id', ids)
    const rows = data || []
    setDbValues(rows)

    // Pre-fill drafts from any value matching this period
    const d = {}
    filteredStats.forEach(s => {
      const match = rows.find(v =>
        v.statistic_id === s.id &&
        matchesPeriod(v.period_date, periodDate, entryTracking, weekEndingDay)
      )
      d[s.id] = match != null ? String(match.value) : ''
    })
    setDrafts(d)
    setLoading(false)
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true); setSaveMsg('')
    const toUpsert = []
    const toDelete = []

    for (const s of filteredStats) {
      const draft    = (drafts[s.id] ?? '').trim()
      const existing = dbValues.find(v =>
        v.statistic_id === s.id &&
        matchesPeriod(v.period_date, periodDate, entryTracking, weekEndingDay)
      )
      if (draft !== '') {
        const num = parseFloat(draft)
        if (!isNaN(num)) toUpsert.push({ statistic_id: s.id, period_date: periodDate, value: num, entered_by: user?.id })
      } else if (existing) {
        toDelete.push(existing.id)
      }
    }

    if (toUpsert.length) {
      const { error } = await supabase.from('statistic_values')
        .upsert(toUpsert, { onConflict: 'statistic_id,period_date' })
      if (error) { setSaveMsg('⚠️ ' + error.message); setSaving(false); return }
    }
    if (toDelete.length) {
      const { error } = await supabase.from('statistic_values').delete().in('id', toDelete)
      if (error) { setSaveMsg('⚠️ ' + error.message); setSaving(false); return }
    }

    setSaving(false)
    const count = toUpsert.length + toDelete.length
    setSaveMsg(`✓ Saved ${toUpsert.length} value${toUpsert.length !== 1 ? 's' : ''}${toDelete.length ? `, cleared ${toDelete.length}` : ''}`)
    await loadValues()
    setTimeout(() => setSaveMsg(''), 4000)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">

      {/* ── Controls bar ──────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0 space-y-3">

        {/* Tracking type */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-20 flex-shrink-0">Type</span>
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
            {['daily', 'weekly', 'monthly', 'quarterly', 'yearly'].map(t => (
              <button
                key={t}
                onClick={() => setEntryTracking(t)}
                className={`px-4 py-1.5 text-xs font-semibold capitalize transition-colors ${
                  entryTracking === t ? 'text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
                style={entryTracking === t ? { backgroundColor: FG } : {}}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Stat group — "All Statistics" is default; more groups to be added later */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-20 flex-shrink-0">Group</span>
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
            <button
              className="px-4 py-1.5 text-xs font-semibold text-white"
              style={{ backgroundColor: FG }}
            >
              All Statistics
            </button>
          </div>
          <span className="text-xs text-gray-300 italic">More groups coming soon</span>
        </div>

        {/* Period navigator */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-20 flex-shrink-0">Period</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigatePeriod(-1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 font-bold text-xl leading-none"
            >‹</button>
            <div className="min-w-[220px] text-center">
              <span className="text-sm font-bold text-gray-800">
                {formatPeriod(periodDate, entryTracking)}
              </span>
            </div>
            <button
              onClick={() => navigatePeriod(1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 font-bold text-xl leading-none"
            >›</button>
          </div>
          <span className="text-xs text-gray-400">
            {filteredStats.length} stat{filteredStats.length !== 1 ? 's' : ''} in this group
          </span>
        </div>
      </div>

      {/* ── Entry grid — 3 columns, alphabetical ─────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex justify-center pt-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
          </div>
        ) : filteredStats.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-sm font-medium">No {entryTracking} statistics found.</p>
            <p className="text-xs mt-1 text-gray-300">Create a {entryTracking} statistic first using the Graphs view.</p>
          </div>
        ) : (() => {
          // Distribute stats evenly across 3 columns, maintaining A→Z order
          const colSize = Math.ceil(filteredStats.length / 3)
          const columns = [
            filteredStats.slice(0, colSize),
            filteredStats.slice(colSize, colSize * 2),
            filteredStats.slice(colSize * 2),
          ].filter(col => col.length > 0)

          return (
            <div className="flex gap-4 items-start">
              {columns.map((colStats, ci) => (
                <div key={ci} className="flex-1 min-w-0 bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Statistic</th>
                        <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {colStats.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-2.5">
                            <div className="font-medium text-gray-900 text-sm leading-tight">{s.name}</div>
                            <div className="text-xs text-gray-400 capitalize mt-0.5">{s.stat_type}</div>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={drafts[s.id] ?? ''}
                              onChange={e => setDrafts(d => ({ ...d, [s.id]: e.target.value }))}
                              placeholder="—"
                              className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 bg-white placeholder-gray-300"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )
        })()}
      </div>

      {/* ── Save bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-t border-gray-200 flex-shrink-0">
        <span className={`text-sm font-medium transition-opacity ${saveMsg ? 'opacity-100' : 'opacity-0'} ${saveMsg.startsWith('⚠️') ? 'text-red-600' : 'text-green-600'}`}>
          {saveMsg || '—'}
        </span>
        <button
          onClick={handleSave}
          disabled={saving || loading || filteredStats.length === 0}
          className="px-6 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-40 transition-opacity"
          style={{ backgroundColor: FG }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

// ── EquationStatForm ──────────────────────────────────────────────────────────
function EquationStatForm({ initialData, profiles, onSave, onClose, onDelete, allStats }) {
  const { user } = useAuth()

  const [form, setForm] = useState({
    name:                  initialData?.name                  || '',
    stat_type:             initialData?.stat_type             || 'currency',
    tracking:              initialData?.tracking              || 'monthly',
    beginning_date:        initialData?.beginning_date        || daysAgo(90),
    upside_down:           initialData?.upside_down           || false,
    show_values:           initialData?.show_values           ?? false,
    owner_type:            initialData?.owner_type            || 'user',
    owner_user_id:         initialData?.owner_user_id         || user?.id || '',
    owner_position_id:     initialData?.owner_position_id     || '',
    default_periods:       initialData?.default_periods       ?? '',
    missing_value_display: initialData?.missing_value_display || 'skip',
  })

  const [parts, setParts] = useState(() => {
    const existing = initialData?.equation_parts
    if (existing && Array.isArray(existing) && existing.length > 0) return existing
    return [{ stat_id: '', operator: null }]
  })

  const [saving,        setSaving]        = useState(false)
  const [archiving,     setArchiving]     = useState(false)
  const [deleting,      setDeleting]      = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [err,           setErr]           = useState('')

  const isEdit     = !!initialData?.id
  const isArchived = !!initialData?.archived
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // When tracking changes, clear all parts so the user re-selects matching stats
  function setTracking(val) {
    setForm(f => ({ ...f, tracking: val }))
    setParts([{ stat_id: '', operator: null }])
  }

  // Only non-equation stats matching the selected tracking period
  const availableStats = (allStats || []).filter(
    s => !s.archived && s.stat_category !== 'equation' &&
         s.tracking === form.tracking &&
         (!isEdit || s.id !== initialData?.id)
  )

  function addPart() {
    setParts(prev => [...prev, { stat_id: '', operator: '+' }])
  }

  function removePart(idx) {
    setParts(prev => prev.filter((_, i) => i !== idx))
  }

  function updatePart(idx, key, val) {
    setParts(prev => prev.map((p, i) => i === idx ? { ...p, [key]: val } : p))
  }

  const handleSave = async () => {
    if (!form.name.trim())    { setErr('Statistic Name is required.'); return }
    if (!form.default_periods || parseInt(form.default_periods) < 1) {
      setErr('Default # of Periods to Show is required.')
      return
    }
    if (!form.beginning_date) { setErr('Beginning Date is required.');  return }
    if (parts.length === 0 || !parts[0].stat_id) {
      setErr('At least one statistic is required in the equation.'); return
    }
    if (parts.some(p => !p.stat_id)) {
      setErr('All equation parts must have a statistic selected.'); return
    }

    setSaving(true); setErr('')

    const payload = {
      name:                  form.name.trim(),
      stat_type:             form.stat_type,
      tracking:              form.tracking,
      beginning_date:        form.beginning_date,
      upside_down:           form.upside_down,
      show_values:           form.show_values,
      owner_type:            form.owner_type,
      owner_user_id:         form.owner_type === 'user'     ? (form.owner_user_id || user?.id) : null,
      owner_position_id:     form.owner_type === 'position' ? form.owner_position_id : null,
      default_periods:       form.default_periods ? parseInt(form.default_periods) : null,
      missing_value_display: form.missing_value_display,
      stat_category:         'equation',
      equation_parts:        parts,
    }

    let savedId, savedName
    if (isEdit) {
      const { error } = await supabase.from('statistics').update(payload).eq('id', initialData.id)
      if (error) { setErr(error.message); setSaving(false); return }
      savedId = initialData.id
      savedName = payload.name
    } else {
      const { data, error } = await supabase.from('statistics')
        .insert({ ...payload, created_by: user?.id, sort_order: 0 })
        .select().single()
      if (error) { setErr(error.message); setSaving(false); return }
      savedId = data.id
      savedName = data.name
    }
    setSaving(false)
    onSave(isEdit ? savedId : null, savedName)
  }

  const handleArchive = async () => {
    setArchiving(true)
    await supabase.from('statistics').update({ archived: !isArchived }).eq('id', initialData.id)
    setArchiving(false)
    onSave(initialData.id, initialData.name)
  }

  const handleDelete = async () => {
    setDeleting(true)
    await supabase.from('statistics').delete().eq('id', initialData.id)
    setDeleting(false)
    onDelete?.()
  }

  const OPERATORS = [
    { value: '+', label: 'Add (+)'       },
    { value: '-', label: 'Subtract (-)' },
    { value: '*', label: 'Multiply (×)' },
    { value: '/', label: 'Divide (÷)'   },
  ]

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit Equation Statistic' : 'New Equation Statistic'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Statistic Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g., Total Revenue"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>

          {/* Tracking — must be chosen FIRST so stat list is filtered correctly */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Tracking Period <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              {['daily','weekly','monthly','quarterly','yearly'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTracking(t)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold border-2 capitalize transition-colors ${
                    form.tracking === t
                      ? 'text-white border-transparent'
                      : 'border-gray-200 text-gray-600 hover:border-green-500 hover:text-green-700'
                  }`}
                  style={form.tracking === t ? { backgroundColor: FG, borderColor: FG } : {}}
                >
                  {t}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Only <span className="font-semibold capitalize">{form.tracking}</span> statistics will be available to use in the equation
              {availableStats.length > 0
                ? ` — ${availableStats.length} available.`
                : ' — none found for this period yet.'}
            </p>
          </div>

          {/* Equation Builder */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Equation <span className="text-red-500">*</span>
            </label>
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-2">
              {parts.map((part, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  {idx === 0 ? (
                    <div className="w-36 flex-shrink-0 text-xs font-semibold text-gray-400 text-center uppercase tracking-wide">
                      Value
                    </div>
                  ) : (
                    <select
                      value={part.operator || '+'}
                      onChange={e => updatePart(idx, 'operator', e.target.value)}
                      className="w-36 border border-gray-300 rounded-lg px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-600 flex-shrink-0"
                    >
                      {OPERATORS.map(op => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </select>
                  )}
                  <select
                    value={part.stat_id}
                    onChange={e => updatePart(idx, 'stat_id', e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
                    disabled={availableStats.length === 0}
                  >
                    <option value="">
                      {availableStats.length === 0 ? `— no ${form.tracking} stats available —` : '— select statistic —'}
                    </option>
                    {availableStats.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  {parts.length > 1 && (
                    <button
                      onClick={() => removePart(idx)}
                      className="text-red-400 hover:text-red-600 text-lg leading-none flex-shrink-0 px-1 font-bold"
                      title="Remove"
                    >✕</button>
                  )}
                </div>
              ))}
              <button
                onClick={addPart}
                disabled={availableStats.length === 0}
                className="mt-1 text-sm font-semibold text-green-700 hover:text-green-900 flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                + Add Statistic
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Operators are applied in order, top to bottom. Periods where any component has no value are skipped.
            </p>
          </div>

          {/* Output Format */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Output Format</label>
            <select value={form.stat_type} onChange={e => set('stat_type', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600">
              <option value="currency">Currency ($)</option>
              <option value="numeric">Numeric (#)</option>
              <option value="percentage">Percentage (%)</option>
            </select>
          </div>

          {/* Beginning Date + Default Periods */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Beginning Date <span className="text-red-500">*</span>
              </label>
              <input type="date" value={form.beginning_date} onChange={e => set('beginning_date', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Default Periods</label>
              <input type="number" value={form.default_periods} onChange={e => set('default_periods', e.target.value)}
                placeholder="e.g. 12" min="1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
            </div>
          </div>

          {/* Missing Value Display */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Missing Period Display</label>
            <select value={form.missing_value_display} onChange={e => set('missing_value_display', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600">
              <option value="skip">Skip (gap in chart)</option>
              <option value="zero">Show as Zero</option>
            </select>
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-6">
            {[
              { key: 'upside_down', label: 'Inverted (lower is better)' },
              { key: 'show_values', label: 'Show Values on Chart'       },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                <button
                  type="button"
                  onClick={() => set(key, !form[key])}
                  className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${form[key] ? 'bg-green-600' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form[key] ? 'translate-x-4' : ''}`} />
                </button>
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>

          {/* Owner */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Owner</label>
            <div className="flex gap-2 mb-2">
              {['user', 'position'].map(t => (
                <button key={t} type="button" onClick={() => set('owner_type', t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-colors ${
                    form.owner_type === t ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 hover:border-green-500'
                  }`}
                  style={form.owner_type === t ? { backgroundColor: FG, borderColor: FG } : {}}
                >
                  {t === 'user' ? 'Person' : 'Position'}
                </button>
              ))}
            </div>
            {form.owner_type === 'user' && (
              <select value={form.owner_user_id} onChange={e => set('owner_user_id', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600">
                <option value="">— select person —</option>
                {(profiles || []).map(p => (
                  <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                ))}
              </select>
            )}
          </div>

          {err && <p className="text-sm text-red-600 font-medium">{err}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex-shrink-0">
          <div className="flex gap-2">
            {isEdit && (
              <>
                <button onClick={handleArchive} disabled={archiving}
                  className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50 font-medium">
                  {archiving ? '…' : isArchived ? 'Unarchive' : 'Archive'}
                </button>
                {!confirmDelete ? (
                  <button onClick={() => setConfirmDelete(true)}
                    className="px-3 py-2 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-medium">
                    Delete
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-600 font-medium">Delete permanently?</span>
                    <button onClick={handleDelete} disabled={deleting}
                      className="px-2 py-1.5 text-xs rounded-lg bg-red-600 text-white font-bold disabled:opacity-50">
                      {deleting ? '…' : 'Yes, delete'}
                    </button>
                    <button onClick={() => setConfirmDelete(false)}
                      className="px-2 py-1.5 text-xs rounded-lg bg-gray-200 text-gray-700 font-bold">
                      Cancel
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 font-medium">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2 text-sm rounded-xl font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: FG }}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Equation Stat'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── OverlayStatForm ───────────────────────────────────────────────────────────
function OverlayStatForm({ initialData, profiles, onSave, onClose, onDelete, allStats }) {
  const { user } = useAuth()
  const MAX_PARTS = 3

  const [form, setForm] = useState({
    name:                  initialData?.name                  || '',
    stat_type:             initialData?.stat_type             || 'currency',
    tracking:              initialData?.tracking              || 'monthly',
    beginning_date:        initialData?.beginning_date        || daysAgo(90),
    upside_down:           initialData?.upside_down           || false,
    show_values:           initialData?.show_values           ?? false,
    owner_type:            initialData?.owner_type            || 'user',
    owner_user_id:         initialData?.owner_user_id         || user?.id || '',
    owner_position_id:     initialData?.owner_position_id     || '',
    default_periods:       initialData?.default_periods       ?? '',
    missing_value_display: initialData?.missing_value_display || 'skip',
  })

  const [parts, setParts] = useState(() => {
    const existing = initialData?.overlay_parts
    if (existing && Array.isArray(existing) && existing.length > 0) return existing
    return [{ stat_id: '', y_min: '', y_max: '' }]
  })

  // statRanges: { [stat_id]: { min, max } } — actual data range fetched on stat select
  const [statRanges, setStatRanges] = useState({})

  const [saving,        setSaving]        = useState(false)
  const [archiving,     setArchiving]     = useState(false)
  const [deleting,      setDeleting]      = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [err,           setErr]           = useState('')

  const isEdit     = !!initialData?.id
  const isArchived = !!initialData?.archived
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // When tracking changes, clear parts (must re-select matching stats)
  function setTracking(val) {
    setForm(f => ({ ...f, tracking: val }))
    setParts([{ stat_id: '', y_min: '', y_max: '' }])
  }

  // Stats available for selection (match tracking, not overlay type, not self)
  const availableStats = (allStats || []).filter(
    s => !s.archived && s.stat_category !== 'overlay' &&
         s.tracking === form.tracking &&
         (!isEdit || s.id !== initialData?.id)
  )

  // On mount, fetch ranges for any pre-filled parts (edit mode)
  useEffect(() => {
    parts.forEach(p => {
      if (p.stat_id) loadRange(p.stat_id)
    })
  }, [])

  async function loadRange(statId) {
    if (!statId || statRanges[statId]) return
    const { data } = await supabase.from('statistic_values').select('value').eq('statistic_id', statId)
    const vals = (data || []).map(v => Number(v.value)).filter(v => isFinite(v))
    if (!vals.length) return
    setStatRanges(prev => ({
      ...prev,
      [statId]: { min: Math.min(...vals), max: Math.max(...vals) },
    }))
  }

  // When a stat is chosen in a slot: reset range fields and pre-fill from actual data
  async function handlePartStatChange(idx, statId) {
    setParts(prev => prev.map((p, i) => i === idx
      ? { ...p, stat_id: statId, y_min: '', y_max: '' }
      : p
    ))
    if (!statId) return

    const { data } = await supabase.from('statistic_values').select('value').eq('statistic_id', statId)
    const vals = (data || []).map(v => Number(v.value)).filter(v => isFinite(v))
    if (!vals.length) return

    const rangeMin = Math.min(...vals)
    const rangeMax = Math.max(...vals)
    setStatRanges(prev => ({ ...prev, [statId]: { min: rangeMin, max: rangeMax } }))

    // Pre-fill y_min / y_max (only if still blank — user might have typed something)
    setParts(prev => prev.map((p, i) => {
      if (i !== idx || p.stat_id !== statId) return p
      return {
        ...p,
        y_min: p.y_min === '' ? String(rangeMin) : p.y_min,
        y_max: p.y_max === '' ? String(rangeMax) : p.y_max,
      }
    }))
  }

  function updatePart(idx, key, val) {
    setParts(prev => prev.map((p, i) => i === idx ? { ...p, [key]: val } : p))
  }

  function addPart() {
    if (parts.length >= MAX_PARTS) return
    setParts(prev => [...prev, { stat_id: '', y_min: '', y_max: '' }])
  }

  function removePart(idx) {
    setParts(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSave = async () => {
    if (!form.name.trim())    { setErr('Statistic Name is required.'); return }
    if (!form.default_periods || parseInt(form.default_periods) < 1) {
      setErr('Default # of Periods to Show is required.')
      return
    }
    if (!form.beginning_date) { setErr('Beginning Date is required.');  return }
    if (!parts[0]?.stat_id)   { setErr('At least one statistic is required.'); return }
    if (parts.some(p => !p.stat_id)) { setErr('All slots must have a statistic selected.'); return }

    setSaving(true); setErr('')

    const payload = {
      name:                  form.name.trim(),
      stat_type:             form.stat_type,
      tracking:              form.tracking,
      beginning_date:        form.beginning_date,
      upside_down:           form.upside_down,
      show_values:           form.show_values,
      owner_type:            form.owner_type,
      owner_user_id:         form.owner_type === 'user'     ? (form.owner_user_id || user?.id) : null,
      owner_position_id:     form.owner_type === 'position' ? form.owner_position_id : null,
      default_periods:       form.default_periods ? parseInt(form.default_periods) : null,
      missing_value_display: form.missing_value_display,
      stat_category:         'overlay',
      overlay_parts:         parts.map(p => ({
        stat_id: p.stat_id,
        y_min:   p.y_min !== '' && p.y_min != null ? Number(p.y_min) : null,
        y_max:   p.y_max !== '' && p.y_max != null ? Number(p.y_max) : null,
      })),
    }

    let savedId, savedName
    if (isEdit) {
      const { error } = await supabase.from('statistics').update(payload).eq('id', initialData.id)
      if (error) { setErr(error.message); setSaving(false); return }
      savedId = initialData.id; savedName = payload.name
    } else {
      const { data, error } = await supabase.from('statistics')
        .insert({ ...payload, created_by: user?.id, sort_order: 0 })
        .select().single()
      if (error) { setErr(error.message); setSaving(false); return }
      savedId = data.id; savedName = data.name
    }
    setSaving(false)
    onSave(isEdit ? savedId : null, savedName)
  }

  const handleArchive = async () => {
    setArchiving(true)
    await supabase.from('statistics').update({ archived: !isArchived }).eq('id', initialData.id)
    setArchiving(false)
    onSave(initialData.id, initialData.name)
  }

  const handleDelete = async () => {
    setDeleting(true)
    await supabase.from('statistics').delete().eq('id', initialData.id)
    setDeleting(false)
    onDelete?.()
  }

  const COLOR_NAMES = ['Green', 'Blue', 'Red']

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit Overlay Statistic' : 'New Overlay Statistic'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Statistic Name <span className="text-red-500">*</span>
            </label>
            <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="e.g., Revenue vs. Costs"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
          </div>

          {/* Tracking period — first, so stat list is filtered */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Tracking Period <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              {['daily','weekly','monthly','quarterly','yearly'].map(t => (
                <button key={t} type="button" onClick={() => setTracking(t)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold border-2 capitalize transition-colors ${
                    form.tracking === t
                      ? 'text-white border-transparent'
                      : 'border-gray-200 text-gray-600 hover:border-green-500 hover:text-green-700'
                  }`}
                  style={form.tracking === t ? { backgroundColor: FG, borderColor: FG } : {}}
                >
                  {t}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Only <span className="font-semibold capitalize">{form.tracking}</span> statistics are shown below
              {availableStats.length > 0 ? ` — ${availableStats.length} available.` : ' — none found yet.'}
            </p>
          </div>

          {/* Stat slots */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Statistics to Overlay <span className="text-red-500">*</span>
              <span className="ml-2 text-xs font-normal text-gray-400">({parts.length} of {MAX_PARTS} slots used)</span>
            </label>

            <div className="space-y-3">
              {parts.map((part, idx) => {
                const range   = statRanges[part.stat_id]
                const color   = OVERLAY_COLORS[idx]
                const colName = COLOR_NAMES[idx]
                return (
                  <div key={idx} className="rounded-xl border border-gray-200 p-4 space-y-3 bg-gray-50">
                    {/* Slot header with color swatch */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-xs font-semibold text-gray-600">Stat {idx + 1} — {colName} line</span>
                      </div>
                      {parts.length > 1 && (
                        <button onClick={() => removePart(idx)}
                          className="text-red-400 hover:text-red-600 text-xs font-bold">
                          Remove
                        </button>
                      )}
                    </div>

                    {/* Stat selector */}
                    <select
                      value={part.stat_id}
                      onChange={e => handlePartStatChange(idx, e.target.value)}
                      disabled={availableStats.length === 0}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
                    >
                      <option value="">
                        {availableStats.length === 0
                          ? `— no ${form.tracking} stats available —`
                          : '— select statistic —'}
                      </option>
                      {availableStats.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>

                    {/* Y Range */}
                    {part.stat_id && (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Y Min</label>
                            <input
                              type="number"
                              value={part.y_min}
                              onChange={e => updatePart(idx, 'y_min', e.target.value)}
                              placeholder={range?.min != null ? String(range.min) : 'Auto'}
                              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Y Max</label>
                            <input
                              type="number"
                              value={part.y_max}
                              onChange={e => updatePart(idx, 'y_max', e.target.value)}
                              placeholder={range?.max != null ? String(range.max) : 'Auto'}
                              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                            />
                          </div>
                        </div>
                        {range && (
                          <p className="text-xs text-gray-400">
                            Actual data range: <span className="font-medium">{range.min?.toLocaleString()}</span>
                            {' '}–{' '}
                            <span className="font-medium">{range.max?.toLocaleString()}</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {parts.length < MAX_PARTS && (
              <button onClick={addPart} disabled={availableStats.length === 0}
                className="mt-2 text-sm font-semibold text-green-700 hover:text-green-900 flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed">
                + Add Another Stat
              </button>
            )}
          </div>

          {/* Output Format */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Y Axis Format</label>
            <select value={form.stat_type} onChange={e => set('stat_type', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600">
              <option value="currency">Currency ($)</option>
              <option value="numeric">Numeric (#)</option>
              <option value="percentage">Percentage (%)</option>
            </select>
          </div>

          {/* Beginning Date + Default Periods */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Beginning Date <span className="text-red-500">*</span>
              </label>
              <input type="date" value={form.beginning_date} onChange={e => set('beginning_date', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Default Periods</label>
              <input type="number" value={form.default_periods} onChange={e => set('default_periods', e.target.value)}
                placeholder="e.g. 12" min="1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
            </div>
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-6">
            {[
              { key: 'upside_down', label: 'Inverted (lower is better)' },
              { key: 'show_values', label: 'Show Values on Chart'       },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                <button type="button" onClick={() => set(key, !form[key])}
                  className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${form[key] ? 'bg-green-600' : 'bg-gray-300'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form[key] ? 'translate-x-4' : ''}`} />
                </button>
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>

          {/* Owner */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Owner</label>
            <div className="flex gap-2 mb-2">
              {['user', 'position'].map(t => (
                <button key={t} type="button" onClick={() => set('owner_type', t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-colors ${
                    form.owner_type === t ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 hover:border-green-500'
                  }`}
                  style={form.owner_type === t ? { backgroundColor: FG, borderColor: FG } : {}}>
                  {t === 'user' ? 'Person' : 'Position'}
                </button>
              ))}
            </div>
            {form.owner_type === 'user' && (
              <select value={form.owner_user_id} onChange={e => set('owner_user_id', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600">
                <option value="">— select person —</option>
                {(profiles || []).map(p => (
                  <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                ))}
              </select>
            )}
          </div>

          {err && <p className="text-sm text-red-600 font-medium">{err}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex-shrink-0">
          <div className="flex gap-2">
            {isEdit && (
              <>
                <button onClick={handleArchive} disabled={archiving}
                  className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50 font-medium">
                  {archiving ? '…' : isArchived ? 'Unarchive' : 'Archive'}
                </button>
                {!confirmDelete ? (
                  <button onClick={() => setConfirmDelete(true)}
                    className="px-3 py-2 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-medium">
                    Delete
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-600 font-medium">Delete permanently?</span>
                    <button onClick={handleDelete} disabled={deleting}
                      className="px-2 py-1.5 text-xs rounded-lg bg-red-600 text-white font-bold disabled:opacity-50">
                      {deleting ? '…' : 'Yes, delete'}
                    </button>
                    <button onClick={() => setConfirmDelete(false)}
                      className="px-2 py-1.5 text-xs rounded-lg bg-gray-200 text-gray-700 font-bold">
                      Cancel
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 font-medium">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2 text-sm rounded-xl font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: FG }}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Overlay Stat'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── SheetJS loader (CDN, loaded once on first use) ───────────────────────────
let xlsxPromise = null
function loadXLSX() {
  if (window.XLSX) return Promise.resolve(window.XLSX)
  if (!xlsxPromise) {
    xlsxPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js'
      s.onload  = () => resolve(window.XLSX)
      s.onerror = () => reject(new Error('Failed to load SheetJS'))
      document.head.appendChild(s)
    })
  }
  return xlsxPromise
}

function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ── SecondaryStatForm ─────────────────────────────────────────────────────────
// Period order for aggregation validation
const SEC_PERIOD_ORDER = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']

// Map a source period_date into its output-period bucket (returns YYYY-MM-DD string)
function getOutputPeriodKey(dateStr, outputTracking) {
  const d = new Date(dateStr + 'T00:00:00')
  if (outputTracking === 'monthly')   return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  if (outputTracking === 'quarterly') {
    const q = Math.floor(d.getMonth() / 3)
    return `${d.getFullYear()}-${String(q * 3 + 1).padStart(2, '0')}-01`
  }
  if (outputTracking === 'yearly')    return `${d.getFullYear()}-01-01`
  if (outputTracking === 'weekly') {
    // ISO week Monday
    const day = d.getDay() || 7
    d.setDate(d.getDate() - day + 1)
    return isoDate(d)
  }
  return dateStr // daily → daily
}

// Aggregate source values into output periods
function aggregateValues(sourceValues, outputTracking, method) {
  const buckets = new Map()
  for (const v of sourceValues) {
    const key = getOutputPeriodKey(v.period_date, outputTracking)
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(Number(v.value))
  }
  const result = []
  for (const [period_date, vals] of buckets) {
    let value
    if      (method === 'sum')     value = vals.reduce((a, b) => a + b, 0)
    else if (method === 'average') value = vals.reduce((a, b) => a + b, 0) / vals.length
    else if (method === 'last')    value = vals[vals.length - 1]
    else if (method === 'first')   value = vals[0]
    result.push({ period_date, value })
  }
  return result.sort((a, b) => a.period_date.localeCompare(b.period_date))
}

function SecondaryStatForm({ initialData, profiles, allStats, onSave, onClose, onDelete }) {
  const { user } = useAuth()

  // Eligible source stats: basic stats only (not secondary/equation/overlay/target)
  const eligibleSources = (allStats || []).filter(s =>
    !s.archived && !['equation', 'overlay', 'target', 'secondary'].includes(s.stat_category)
  )

  const isEdit = !!initialData?.id

  const [form, setForm] = useState({
    name:             initialData?.name || '',
    source_stat_id:   initialData?.source_stat_id || '',
    tracking:         initialData?.tracking || 'monthly',
    aggregation_method: initialData?.aggregation_method || 'sum',
    stat_type:        initialData?.stat_type || 'currency',
    owner_type:       initialData?.owner_type || 'user',
    owner_user_id:    initialData?.owner_user_id || user?.id || '',
    default_periods:  initialData?.default_periods ?? 12,
  })

  const [saving,        setSaving]        = useState(false)
  const [deleting,      setDeleting]      = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [err,           setErr]           = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // When source changes, inherit stat_type and suggest a name
  const sourceStat = eligibleSources.find(s => s.id === Number(form.source_stat_id))
  useEffect(() => {
    if (sourceStat && !isEdit) {
      set('stat_type', sourceStat.stat_type || 'currency')
      if (!form.name) set('name', `${sourceStat.name} (${form.tracking})`)
    }
  }, [form.source_stat_id])

  useEffect(() => {
    if (sourceStat && !isEdit) {
      set('name', `${sourceStat.name} (${form.tracking})`)
    }
  }, [form.tracking])

  // Valid output periods: only periods ABOVE the source's tracking
  const sourceIdx = SEC_PERIOD_ORDER.indexOf(sourceStat?.tracking || 'daily')
  const validOutputPeriods = SEC_PERIOD_ORDER.filter((_, i) => i > sourceIdx)

  const handleSave = async () => {
    if (!form.name.trim())          { setErr('Name is required.'); return }
    if (!form.source_stat_id)       { setErr('Please select a source statistic.'); return }
    if (!validOutputPeriods.includes(form.tracking)) {
      setErr('Output period must be a longer interval than the source statistic.'); return
    }
    setSaving(true); setErr('')
    try {
      const payload = {
        name:               form.name.trim(),
        stat_type:          form.stat_type,
        tracking:           form.tracking,
        stat_category:      'secondary',
        source_stat_id:     Number(form.source_stat_id),
        aggregation_method: form.aggregation_method,
        owner_type:         form.owner_type,
        owner_user_id:      form.owner_type === 'user' ? (form.owner_user_id || user?.id) : null,
        default_periods:    form.default_periods ? parseInt(form.default_periods) : 12,
        beginning_date:     today(),
        missing_value_display: 'skip',
        created_by:         user?.id || null,
      }
      let savedId, savedName
      if (isEdit) {
        const { error } = await supabase.from('statistics').update(payload).eq('id', initialData.id)
        if (error) throw error
        savedId = initialData.id; savedName = payload.name
      } else {
        const { data, error } = await supabase.from('statistics').insert({ ...payload, sort_order: 0 }).select().single()
        if (error) throw error
        savedId = data.id; savedName = data.name

        // Seed values from source stat
        const { data: srcVals } = await supabase.from('statistic_values')
          .select('period_date, value').eq('statistic_id', Number(form.source_stat_id)).order('period_date')
        if (srcVals?.length) {
          const computed = aggregateValues(srcVals, form.tracking, form.aggregation_method)
          if (computed.length) {
            // Backdate beginning_date to the earliest computed value so the scrubber has full range
            await supabase.from('statistics').update({ beginning_date: computed[0].period_date }).eq('id', savedId)
            await supabase.from('statistic_values').insert(
              computed.map(r => ({ statistic_id: savedId, period_date: r.period_date, value: r.value, entered_by: user?.id }))
            )
          }
        }
      }
      setSaving(false)
      onSave(isEdit ? savedId : null, savedName)
    } catch (e) {
      setErr(e.message || 'Save failed.')
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    await supabase.from('statistics').delete().eq('id', initialData.id)
    setDeleting(false)
    onDelete?.()
  }

  const AGG_METHODS = [
    { key: 'sum',     label: 'Sum',     desc: 'Add all values in the period (best for revenue, counts)' },
    { key: 'average', label: 'Average', desc: 'Mean of all values (best for rates, percentages)' },
    { key: 'last',    label: 'Last',    desc: 'Use the final value in the period' },
    { key: 'first',   label: 'First',   desc: 'Use the first value in the period' },
  ]

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit Secondary Statistic' : 'New Secondary Statistic'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Source stat */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Source Statistic <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-2">Pick the existing stat whose values you want to aggregate into a longer period.</p>
            <select
              value={form.source_stat_id}
              onChange={e => { set('source_stat_id', e.target.value) }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            >
              <option value="">— Select a statistic —</option>
              {eligibleSources.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.tracking})</option>
              ))}
            </select>
            {sourceStat && (
              <p className="text-xs text-green-700 mt-1.5 font-medium">
                Source tracks <span className="capitalize">{sourceStat.tracking}</span> · {sourceStat.stat_type}
              </p>
            )}
          </div>

          {/* Output period */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Output Period <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-2">Must be a longer interval than the source.</p>
            <div className="flex gap-2 flex-wrap">
              {SEC_PERIOD_ORDER.map(t => {
                const disabled = !validOutputPeriods.includes(t)
                return (
                  <button key={t} type="button"
                    disabled={disabled}
                    onClick={() => !disabled && set('tracking', t)}
                    className={`flex-1 min-w-[70px] py-2 rounded-lg text-xs font-semibold border-2 capitalize transition-colors ${
                      form.tracking === t && !disabled
                        ? 'text-white border-transparent'
                        : disabled
                          ? 'border-gray-100 text-gray-300 bg-gray-50 cursor-not-allowed'
                          : 'border-gray-200 text-gray-600 hover:border-green-500 hover:text-green-700'
                    }`}
                    style={form.tracking === t && !disabled ? { backgroundColor: FG, borderColor: FG } : {}}
                  >
                    {t}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Aggregation method */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Aggregation Method</label>
            <div className="space-y-2">
              {AGG_METHODS.map(m => (
                <label key={m.key} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                  form.aggregation_method === m.key ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input type="radio" name="agg" value={m.key} checked={form.aggregation_method === m.key}
                    onChange={() => set('aggregation_method', m.key)} className="mt-0.5 accent-green-700" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{m.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{m.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Statistic Name <span className="text-red-500">*</span>
            </label>
            <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="e.g., Gross Income (Monthly)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
          </div>

          {/* Default periods */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Default Periods to Show</label>
            <input type="number" min={1} max={120} value={form.default_periods}
              onChange={e => set('default_periods', e.target.value)}
              className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
          </div>

          {err && <p className="text-sm text-red-600 font-medium">{err}</p>}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0 flex gap-2">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors disabled:opacity-50"
            style={{ backgroundColor: FG }}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Secondary Stat'}
          </button>
          {isEdit && !confirmDelete && (
            <button onClick={() => setConfirmDelete(true)}
              className="px-4 py-2.5 border border-red-200 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-50 transition-colors">
              Delete
            </button>
          )}
          {isEdit && confirmDelete && (
            <button onClick={handleDelete} disabled={deleting}
              className="px-4 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors">
              {deleting ? 'Deleting…' : 'Confirm Delete'}
            </button>
          )}
          <button onClick={onClose}
            className="px-4 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── AUTO_SOURCES registry ──────────────────────────────────────────────────────
// Each source defines how to pull from a Supabase table and compute a metric.
// `metric`: 'count' | 'sum' | 'avg'
// `field`:  column to sum/avg (omitted for count)
// `filter`: optional {col: val} equality filters applied to the query
// `date_column`: which column on the table represents the period date
const AUTO_SOURCES = [
  {
    category: 'Jobs',
    icon: '🏗️',
    sources: [
      {
        key: 'jobs_sold_count',
        label: 'Jobs Sold — Count',
        table: 'jobs', date_column: 'sold_date', metric: 'count',
        stat_type: 'numeric',
        desc: 'Number of jobs marked as sold/active per period.',
      },
      {
        key: 'jobs_revenue',
        label: 'Jobs Revenue (Total Price)',
        table: 'jobs', date_column: 'sold_date', metric: 'sum', field: 'total_price',
        stat_type: 'currency',
        desc: 'Sum of total job price for jobs sold in the period.',
      },
      {
        key: 'jobs_gross_profit',
        label: 'Jobs Gross Profit',
        table: 'jobs', date_column: 'sold_date', metric: 'sum', field: 'gross_profit',
        stat_type: 'currency',
        desc: 'Sum of gross profit for jobs sold in the period.',
      },
      {
        key: 'jobs_avg_gpmd',
        label: 'Jobs Avg GPMD %',
        table: 'jobs', date_column: 'sold_date', metric: 'avg', field: 'gpmd',
        stat_type: 'percentage',
        desc: 'Average gross profit margin % across jobs sold in the period.',
      },
      {
        key: 'jobs_avg_price',
        label: 'Jobs Avg Price',
        table: 'jobs', date_column: 'sold_date', metric: 'avg', field: 'total_price',
        stat_type: 'currency',
        desc: 'Average job price for jobs sold in the period.',
      },
      {
        key: 'jobs_created_count',
        label: 'Jobs Created — Count',
        table: 'jobs', date_column: 'created_at', metric: 'count',
        stat_type: 'numeric',
        desc: 'Number of job records created in the period.',
      },
    ],
  },
  {
    category: 'Bids',
    icon: '📋',
    sources: [
      {
        key: 'bids_count',
        label: 'Bids Created — Count',
        table: 'bids', date_column: 'created_at', metric: 'count',
        stat_type: 'numeric',
        desc: 'Number of bids created in the period.',
      },
      {
        key: 'bids_total_value',
        label: 'Bids Total Value',
        table: 'bids', date_column: 'created_at', metric: 'sum', field: 'total_price',
        stat_type: 'currency',
        desc: 'Sum of all bid values created in the period.',
      },
      {
        key: 'bids_avg_value',
        label: 'Bids Avg Value',
        table: 'bids', date_column: 'created_at', metric: 'avg', field: 'total_price',
        stat_type: 'currency',
        desc: 'Average bid value created in the period.',
      },
      {
        key: 'bids_gross_profit',
        label: 'Bids Gross Profit',
        table: 'bids', date_column: 'created_at', metric: 'sum', field: 'gross_profit',
        stat_type: 'currency',
        desc: 'Sum of gross profit on bids created in the period.',
      },
      {
        key: 'bids_sold_count',
        label: 'Bids Won (Sold) — Count',
        table: 'bids', date_column: 'sold_date', metric: 'count',
        stat_type: 'numeric',
        desc: 'Number of bids marked as sold in the period.',
      },
      {
        key: 'bids_sold_value',
        label: 'Bids Won — Total Value',
        table: 'bids', date_column: 'sold_date', metric: 'sum', field: 'total_price',
        stat_type: 'currency',
        desc: 'Sum of total price for bids marked as sold in the period.',
      },
    ],
  },
  {
    category: 'Schedule',
    icon: '📅',
    sources: [
      {
        key: 'schedule_items_count',
        label: 'Schedule Items — Total',
        table: 'schedule_items', date_column: 'work_date', metric: 'count',
        stat_type: 'numeric',
        desc: 'Total number of scheduled items (any type) in the period.',
      },
      {
        key: 'schedule_job_count',
        label: 'Schedule Items — Jobs Only',
        table: 'schedule_items', date_column: 'work_date', metric: 'count',
        filter: { scheduling_type: 'job' },
        stat_type: 'numeric',
        desc: 'Scheduled job appearances in the period.',
      },
      {
        key: 'schedule_yard_check_count',
        label: 'Schedule Items — Yard Checks',
        table: 'schedule_items', date_column: 'work_date', metric: 'count',
        filter: { scheduling_type: 'yard_check' },
        stat_type: 'numeric',
        desc: 'Number of yard check visits scheduled in the period.',
      },
    ],
  },
  {
    category: 'Collections',
    icon: '💰',
    sources: [
      {
        key: 'collections_invoiced',
        label: 'Collections — Invoiced Amount',
        table: 'collections', date_column: 'invoice_date', metric: 'sum', field: 'amount',
        stat_type: 'currency',
        desc: 'Total dollar amount invoiced in the period.',
      },
      {
        key: 'collections_paid',
        label: 'Collections — Paid Amount',
        table: 'collections', date_column: 'paid_date', metric: 'sum', field: 'amount_paid',
        stat_type: 'currency',
        desc: 'Total dollar amount collected (paid) in the period.',
      },
      {
        key: 'collections_invoice_count',
        label: 'Collections — Invoice Count',
        table: 'collections', date_column: 'invoice_date', metric: 'count',
        stat_type: 'numeric',
        desc: 'Number of invoices created in the period.',
      },
    ],
  },
  {
    category: 'Work Orders',
    icon: '🛠️',
    sources: [
      {
        key: 'work_orders_count',
        label: 'Work Orders Created — Count',
        table: 'work_orders', date_column: 'created_at', metric: 'count',
        stat_type: 'numeric',
        desc: 'Number of work orders created in the period.',
      },
    ],
  },
  {
    category: 'Clients',
    icon: '🤝',
    sources: [
      {
        key: 'clients_count',
        label: 'New Clients — Count',
        table: 'clients', date_column: 'created_at', metric: 'count',
        stat_type: 'numeric',
        desc: 'Number of client records created in the period.',
      },
    ],
  },
]

// Flatten for quick lookup by key
const AUTO_SOURCE_MAP = Object.fromEntries(
  AUTO_SOURCES.flatMap(cat => cat.sources.map(s => [s.key, s]))
)

// ── AutoStatForm ──────────────────────────────────────────────────────────────
function AutoStatForm({ initialData, profiles, onSave, onClose, onDelete }) {
  const { user } = useAuth()
  const isEdit = !!initialData?.id

  // Parse existing data_source if editing
  const existingDs = (() => {
    try { return JSON.parse(initialData?.data_source || '{}') } catch { return {} }
  })()

  const [selectedCategory, setSelectedCategory] = useState(
    existingDs.category || AUTO_SOURCES[0].category
  )
  const [selectedKey, setSelectedKey] = useState(existingDs.key || '')
  const [form, setForm] = useState({
    name:           initialData?.name || '',
    tracking:       initialData?.tracking || 'monthly',
    stat_type:      initialData?.stat_type || 'numeric',
    owner_type:     initialData?.owner_type || 'user',
    owner_user_id:  initialData?.owner_user_id || user?.id || '',
    default_periods: initialData?.default_periods ?? 12,
  })

  const [saving,        setSaving]        = useState(false)
  const [deleting,      setDeleting]      = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [err,           setErr]           = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const categoryObj = AUTO_SOURCES.find(c => c.category === selectedCategory) || AUTO_SOURCES[0]
  const sourceDef   = AUTO_SOURCE_MAP[selectedKey] || null

  // When source changes, inherit stat_type and suggest name
  useEffect(() => {
    if (sourceDef && !isEdit) {
      set('stat_type', sourceDef.stat_type)
      if (!form.name) set('name', `${sourceDef.label} (${form.tracking})`)
    }
  }, [selectedKey])

  async function handleSave() {
    if (!selectedKey) { setErr('Please select a data source.'); return }
    if (!form.name.trim()) { setErr('Please enter a name.'); return }
    setErr(''); setSaving(true)

    const ds = JSON.stringify({ key: selectedKey, category: selectedCategory, ...sourceDef })

    const payload = {
      name: form.name.trim(),
      stat_category: 'auto',
      tracking: form.tracking,
      stat_type: form.stat_type,
      owner_type: form.owner_type,
      owner_user_id: form.owner_type === 'user' ? form.owner_user_id || null : null,
      default_periods: Number(form.default_periods) || 12,
      data_source: ds,
      beginning_date: today(),
    }

    let savedId = null
    if (isEdit) {
      const { error } = await supabase.from('statistics').update(payload).eq('id', initialData.id)
      if (error) { setErr(error.message); setSaving(false); return }
      savedId = initialData.id
    } else {
      const { data, error } = await supabase.from('statistics').insert({ ...payload, sort_order: 9999 }).select().single()
      if (error) { setErr(error.message); setSaving(false); return }
      savedId = data.id
    }

    setSaving(false)
    onSave(savedId, form.name.trim())
  }

  async function handleDelete() {
    setDeleting(true)
    await supabase.from('statistic_values').delete().eq('statistic_id', initialData.id)
    await supabase.from('statistics').delete().eq('id', initialData.id)
    setDeleting(false)
    onDelete?.()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-100 flex-shrink-0"
             style={{ backgroundColor: '#1e40af' }}>
          <h2 className="text-base font-bold text-white">⚡ Auto Statistic</h2>
          <button onClick={onClose} className="text-white/70 hover:text-white text-xl leading-none">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* Category picker */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Data Category</label>
            <div className="flex flex-wrap gap-2">
              {AUTO_SOURCES.map(cat => (
                <button key={cat.category} type="button"
                  onClick={() => { setSelectedCategory(cat.category); setSelectedKey('') }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    selectedCategory === cat.category
                      ? 'bg-blue-700 text-white border-blue-700'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                  }`}>
                  {cat.icon} {cat.category}
                </button>
              ))}
            </div>
          </div>

          {/* Source picker */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Data Source</label>
            <div className="space-y-1.5">
              {categoryObj.sources.map(src => (
                <button key={src.key} type="button"
                  onClick={() => setSelectedKey(src.key)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl border-2 transition-colors ${
                    selectedKey === src.key
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <div className="text-sm font-semibold text-gray-800">{src.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{src.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {sourceDef && (
            <>
              {/* Tracking period */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tracking Period</label>
                <div className="flex flex-wrap gap-1.5">
                  {['daily','weekly','monthly','quarterly','yearly'].map(t => (
                    <button key={t} type="button" onClick={() => set('tracking', t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border capitalize transition-colors ${
                        form.tracking === t ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 hover:border-blue-400'
                      }`}
                      style={form.tracking === t ? { backgroundColor: '#1e40af', borderColor: '#1e40af' } : {}}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stat type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Value Format</label>
                <div className="flex gap-2">
                  {[['currency','($) Currency'],['numeric','(#) Numeric'],['percentage','(%) Percentage']].map(([val,lab]) => (
                    <button key={val} type="button" onClick={() => set('stat_type', val)}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                        form.stat_type === val ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                      }`}>
                      {lab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Statistic Name <span className="text-red-500">*</span>
                </label>
                <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
                  placeholder="e.g., Monthly Jobs Sold"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
              </div>

              {/* Default periods + Owner */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Default Periods</label>
                  <input type="number" min={1} max={120} value={form.default_periods}
                    onChange={e => set('default_periods', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Assigned To</label>
                  <select value={form.owner_user_id} onChange={e => set('owner_user_id', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600">
                    <option value="">— Anyone —</option>
                    {profiles.map(p => (
                      <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {err && <p className="text-sm text-red-600 font-medium">{err}</p>}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0 flex gap-2">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#1e40af' }}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Auto Stat'}
          </button>
          {isEdit && !confirmDelete && (
            <button onClick={() => setConfirmDelete(true)}
              className="px-4 py-2.5 border border-red-200 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-50 transition-colors">
              Delete
            </button>
          )}
          {isEdit && confirmDelete && (
            <button onClick={handleDelete} disabled={deleting}
              className="px-4 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors">
              {deleting ? 'Deleting…' : 'Confirm Delete'}
            </button>
          )}
          <button onClick={onClose}
            className="px-4 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── ImportExportView ──────────────────────────────────────────────────────────
// Required fields for import
const IMPORT_FIELDS = [
  { key: 'stat_name',   label: 'Stat Name',   required: true,  desc: 'The name of the statistic'         },
  { key: 'period_date', label: 'Period Date',  required: true,  desc: 'Date of the value (YYYY-MM-DD)'    },
  { key: 'value',       label: 'Value',        required: true,  desc: 'Numeric value'                     },
  { key: 'tracking',    label: 'Tracking',     required: false, desc: 'daily/weekly/monthly/quarterly/yearly' },
  { key: 'stat_type',   label: 'Stat Type',    required: false, desc: 'numeric/currency/percentage'       },
]

// Auto-detect mapping: try to match file headers to our field keys by name similarity
function autoDetectMapping(headers) {
  const map = {}
  const aliases = {
    stat_name:   ['stat_name', 'name', 'statistic', 'stat', 'metric', 'kpi', 'title'],
    period_date: ['period_date', 'date', 'period', 'week_ending', 'week', 'month', 'day', 'timestamp', 'time'],
    value:       ['value', 'amount', 'total', 'number', 'val', 'data', 'result', 'count'],
    tracking:    ['tracking', 'frequency', 'interval', 'period_type', 'type', 'cadence'],
    stat_type:   ['stat_type', 'format', 'unit', 'data_type', 'kind'],
  }
  for (const [field, names] of Object.entries(aliases)) {
    const match = headers.find(h => names.includes(h.toLowerCase().trim().replace(/\s+/g, '_')))
    map[field] = match || ''
  }
  return map
}

function ImportExportView({ stats, user, onImported }) {
  const activeStats = stats.filter(s => !s.archived)

  // Panel: null | 'export' | 'import'
  const [panel, setPanel] = useState(null)

  // ── Export state ──────────────────────────────────────────────────────────
  const [selected,   setSelected]   = useState(new Set())
  const [exporting,  setExporting]  = useState(false)
  const [exportMsg,  setExportMsg]  = useState(null)

  // ── History state ─────────────────────────────────────────────────────────
  const [history,        setHistory]        = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [expandedLogs,   setExpandedLogs]   = useState(new Set())

  // ── Import state ──────────────────────────────────────────────────────────
  // importStep: 'upload' | 'mapping' | 'preview'
  const [importStep,     setImportStep]     = useState('upload')
  const [importFile,     setImportFile]     = useState(null)
  const [fileHeaders,    setFileHeaders]    = useState([])   // column names from file
  const [rawFileRows,    setRawFileRows]    = useState([])   // parsed rows (original keys)
  const [mapping,        setMapping]        = useState({})   // { stat_name: 'col_A', period_date: 'col_B', ... }
  const [trackingDef,    setTrackingDef]    = useState('monthly')   // default when no tracking column
  const [statTypeDef,    setStatTypeDef]    = useState('numeric')   // default when no stat_type column
  const [importPreview,  setImportPreview]  = useState(null) // [{ name, tracking, stat_type, count }]
  const [mappedRows,     setMappedRows]     = useState([])   // rows after mapping applied
  const [importing,      setImporting]      = useState(false)
  const [importMsg,      setImportMsg]      = useState(null)
  const fileRef = useRef(null)

  // ── Helpers ───────────────────────────────────────────────────────────────
  function toggleStat(id) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function selectAll()   { setSelected(new Set(activeStats.map(s => s.id))) }
  function deselectAll() { setSelected(new Set()) }

  const Msg = ({ m }) => m ? (
    <div className={`text-sm mt-3 rounded-lg px-3 py-2.5 whitespace-pre-line ${
      m.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
    }`}>
      {m.text}
    </div>
  ) : null

  function resetImport() {
    setImportStep('upload'); setImportFile(null); setFileHeaders([]); setRawFileRows([])
    setMapping({}); setImportPreview(null); setMappedRows([]); setImportMsg(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function loadHistory() {
    setHistoryLoading(true)
    const { data } = await supabase
      .from('stat_import_export_log')
      .select('*')
      .order('performed_at', { ascending: false })
      .limit(100)
    setHistory(data || [])
    setHistoryLoading(false)
  }

  // Load history on mount
  useEffect(() => { loadHistory() }, [])

  // ── Export ────────────────────────────────────────────────────────────────
  async function handleExport(format) {
    if (selected.size === 0) {
      setExportMsg({ type: 'error', text: 'Select at least one statistic to export.' }); return
    }
    setExporting(true); setExportMsg(null)

    const picks = activeStats.filter(s => selected.has(s.id))

    const { data: vals } = await supabase
      .from('statistic_values')
      .select('statistic_id, period_date, value')
      .in('statistic_id', picks.map(s => s.id))
      .order('period_date')

    const rows = []
    for (const stat of picks) {
      const statVals = (vals || []).filter(v => v.statistic_id === stat.id)
      for (const v of statVals) {
        rows.push({ stat_name: stat.name, tracking: stat.tracking, stat_type: stat.stat_type, period_date: v.period_date, value: Number(v.value) })
      }
    }

    if (rows.length === 0) {
      setExportMsg({ type: 'error', text: 'No values found for the selected statistics.' })
      setExporting(false); return
    }

    if (format === 'csv') {
      const header = 'stat_name,tracking,stat_type,period_date,value'
      const lines  = rows.map(r => `"${r.stat_name.replace(/"/g, '""')}",${r.tracking},${r.stat_type},${r.period_date},${r.value}`)
      downloadBlob([header, ...lines].join('\n'), 'statistics-export.csv', 'text/csv;charset=utf-8;')
    } else {
      try {
        const XLSX = await loadXLSX()
        const ws   = XLSX.utils.json_to_sheet(rows)
        const wb   = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Statistics')
        XLSX.writeFile(wb, 'statistics-export.xlsx')
      } catch {
        setExportMsg({ type: 'error', text: 'Could not load Excel library. Try CSV instead.' })
        setExporting(false); return
      }
    }

    setExportMsg({ type: 'success', text: `Exported ${rows.length} value${rows.length !== 1 ? 's' : ''} across ${picks.length} stat${picks.length !== 1 ? 's' : ''}.` })
    // Log the export
    const fileName = format === 'csv' ? 'statistics-export.csv' : 'statistics-export.xlsx'
    await supabase.from('stat_import_export_log').insert({
      type:        'export',
      file_name:   fileName,
      stat_names:  picks.map(s => s.name),
      stat_count:  picks.length,
      value_count: rows.length,
      performed_by: user?.id,
    })
    loadHistory()
    setExporting(false)
  }

  // ── Import Step 1: parse file, go to mapping ───────────────────────────
  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportMsg(null)

    try {
      const rows = await parseImportFile(file)
      if (!rows.length) throw new Error('No data rows found in the file.')
      const headers = Object.keys(rows[0])
      if (!headers.length) throw new Error('Could not read column headers.')
      const detected = autoDetectMapping(headers)
      setImportFile(file)
      setFileHeaders(headers)
      setRawFileRows(rows)
      setMapping(detected)
      setImportStep('mapping')
    } catch (err) {
      setImportMsg({ type: 'error', text: 'Could not read file: ' + err.message })
    }
  }

  async function parseImportFile(file) {
    const isExcel = /\.(xlsx|xls)$/i.test(file.name)
    if (isExcel) {
      const XLSX = await loadXLSX()
      const buf  = await file.arrayBuffer()
      // cellDates:true → date cells come back as JS Date objects instead of serials
      const wb   = XLSX.read(buf, { cellDates: true })
      const ws   = wb.Sheets[wb.SheetNames[0]]
      return XLSX.utils.sheet_to_json(ws, { defval: '' })
    }
    const text    = await file.text()
    const lines   = text.trim().split(/\r?\n/)
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    return lines.slice(1).filter(l => l.trim()).map(line => {
      const vals = []; let cur = ''; let inQ = false
      for (const ch of line + ',') {
        if (ch === '"') { inQ = !inQ }
        else if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = '' }
        else cur += ch
      }
      return Object.fromEntries(headers.map((h, i) => [h, (vals[i] ?? '').replace(/^"|"$/g, '')]))
    })
  }

  // Normalize any date representation → YYYY-MM-DD
  function normalizeDateStr(raw) {
    if (raw === null || raw === undefined || raw === '') return ''
    // JS Date object (from cellDates: true in SheetJS)
    if (raw instanceof Date) return isNaN(raw.getTime()) ? '' : isoDate(raw)
    const s = String(raw).trim()
    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
    // Excel numeric serial (e.g. 45367)
    if (/^\d{4,5}$/.test(s)) {
      const d = new Date(Math.round((parseInt(s) - 25569) * 86400000))
      return isNaN(d.getTime()) ? s : isoDate(d)
    }
    // M/D/YYYY or M/D/YY (common US spreadsheet format)
    const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
    if (mdy) {
      const [, m, d, y] = mdy
      const year = y.length === 2 ? (parseInt(y) > 50 ? '19' + y : '20' + y) : y
      return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
    // DD-Mon-YYYY  e.g. 15-Apr-2026
    const dmy = s.match(/^(\d{1,2})[- ]([A-Za-z]{3,9})[- ](\d{2,4})$/)
    if (dmy) {
      const months = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 }
      const mo = months[dmy[2].slice(0,3).toLowerCase()]
      if (mo) return `${dmy[3]}-${String(mo).padStart(2,'0')}-${dmy[1].padStart(2,'0')}`
    }
    // Last resort: native Date parse
    const d = new Date(s)
    return isNaN(d.getTime()) ? s : isoDate(d)
  }

  // ── Import Step 2: apply mapping, build preview ────────────────────────
  function handleApplyMapping() {
    const required = IMPORT_FIELDS.filter(f => f.required)
    for (const f of required) {
      if (!mapping[f.key]) {
        setImportMsg({ type: 'error', text: `"${f.label}" is required — please map it to a column.` }); return
      }
    }
    setImportMsg(null)

    const VALID_TRACKING  = ['daily','weekly','monthly','quarterly','yearly']
    const VALID_STAT_TYPE = ['numeric','currency','percentage']

    // Apply mapping to each raw row
    const resolved = rawFileRows.map(row => {
      const r = {}
      for (const { key } of IMPORT_FIELDS) {
        const col = mapping[key]
        if (col) {
          const raw = row[col] !== undefined ? row[col] : ''
          if (key === 'period_date') {
            r[key] = normalizeDateStr(raw)
          } else if (key === 'tracking') {
            const v = String(raw).trim().toLowerCase()
            r[key] = VALID_TRACKING.includes(v) ? v : trackingDef
          } else if (key === 'stat_type') {
            const v = String(raw).trim().toLowerCase()
            r[key] = VALID_STAT_TYPE.includes(v) ? v : statTypeDef
          } else {
            r[key] = String(raw).trim()
          }
        } else {
          r[key] = key === 'tracking' ? trackingDef : key === 'stat_type' ? statTypeDef : ''
        }
      }
      return r
    })

    // Group into preview
    const map = new Map()
    for (const r of resolved) {
      const name = r.stat_name
      if (!name || !r.period_date || r.value === '') continue
      if (!map.has(name)) map.set(name, { name, tracking: r.tracking || trackingDef, stat_type: r.stat_type || statTypeDef, count: 0 })
      map.get(name).count++
    }

    if (map.size === 0) {
      setImportMsg({ type: 'error', text: 'No valid rows found after applying the mapping. Check that the right columns are selected.' }); return
    }

    setMappedRows(resolved)
    setImportPreview([...map.values()])
    setImportStep('preview')
  }

  // ── Import Step 3: commit ──────────────────────────────────────────────
  async function handleImport() {
    if (!importPreview || !mappedRows.length) return
    setImporting(true); setImportMsg(null)

    const statNames   = [...new Set(mappedRows.map(r => r.stat_name).filter(Boolean))]
    let totalUpserted = 0
    const errors      = []    // real failures: stat creation / upsert DB errors
    const warnings    = []    // soft issues: skipped rows with bad data

    for (const name of statNames) {
      let stat = stats.find(s => s.name.toLowerCase() === name.toLowerCase())

      if (!stat) {
        const firstRow  = mappedRows.find(r => r.stat_name.toLowerCase() === name.toLowerCase())
        const statRows  = mappedRows.filter(r => r.stat_name.toLowerCase() === name.toLowerCase())
        const dates     = statRows.map(r => r.period_date).filter(Boolean).sort()
        const beginDate = dates[0] || today()
        const { data: newStat, error } = await supabase
          .from('statistics')
          .insert({
            name,
            tracking:       firstRow?.tracking  || trackingDef,
            stat_type:      firstRow?.stat_type  || statTypeDef,
            beginning_date: beginDate,
            owner_type:     'user',
            owner_user_id:  user?.id,
            created_by:     user?.id,
            sort_order:     0,
          })
          .select().single()
        if (error) {
          errors.push({ name, message: error.message || 'Failed to create statistic' })
          continue
        }
        stat = newStat
      }

      const rows       = mappedRows.filter(r => r.stat_name.toLowerCase() === name.toLowerCase())
      const rawUpserts = rows
        .filter(r => r.period_date && r.value !== '')
        .map(r => ({ statistic_id: stat.id, period_date: r.period_date, value: parseFloat(r.value), entered_by: user?.id }))
        .filter(r => !isNaN(r.value))

      // Deduplicate by period_date — keep last occurrence if file has duplicates
      const dedupMap = new Map()
      for (const r of rawUpserts) dedupMap.set(r.period_date, r)
      const upserts = [...dedupMap.values()]

      // Track skipped rows as warnings (not blocking errors)
      const skipped = rows.length - rawUpserts.length
      if (skipped > 0) warnings.push(`${name}: ${skipped} row${skipped > 1 ? 's' : ''} skipped (missing date or invalid value)`)

      if (upserts.length) {
        const { error } = await supabase
          .from('statistic_values')
          .upsert(upserts, { onConflict: 'statistic_id,period_date' })
        if (error) {
          errors.push({ name, message: error.message || 'Upsert failed' })
        } else {
          totalUpserted += upserts.length
        }
      }
    }

    // Always log and navigate if anything was successfully imported
    if (totalUpserted > 0) {
      await supabase.from('stat_import_export_log').insert({
        type:         'import',
        file_name:    importFile?.name || 'unknown',
        stat_names:   statNames,
        stat_count:   statNames.length,
        value_count:  totalUpserted,
        performed_by: user?.id,
      })
      loadHistory()
      onImported?.()  // refresh stats list and navigate to My Stats
    }

    // Show result message
    if (errors.length > 0) {
      // Real failures — show error details, keep the panel open for retry
      const detail = errors.map(e => `• ${e.name}: ${e.message}`).join('\n')
      setImportMsg({
        type: 'error',
        text: `Imported ${totalUpserted} value${totalUpserted !== 1 ? 's' : ''} with ${errors.length} error${errors.length !== 1 ? 's' : ''}:\n${detail}`,
      })
    } else if (warnings.length > 0) {
      // Soft warnings only — still a success, show what was skipped
      setImportMsg({
        type: 'success',
        text: `Imported ${totalUpserted} value${totalUpserted !== 1 ? 's' : ''} across ${statNames.length} stat${statNames.length !== 1 ? 's' : ''}.` +
              `\n\nNote — some rows were skipped:\n${warnings.map(w => `• ${w}`).join('\n')}`,
      })
      if (totalUpserted > 0) resetImport()
    } else {
      setImportMsg({ type: 'success', text: `Successfully imported ${totalUpserted} value${totalUpserted !== 1 ? 's' : ''} across ${statNames.length} stat${statNames.length !== 1 ? 's' : ''}.` })
      resetImport()
    }

    setImporting(false)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  // Breadcrumb steps for import
  const importStepLabels = { upload: 'Upload File', mapping: 'Map Fields', preview: 'Preview & Import' }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">

      {/* Top action bar */}
      <div className="flex items-center gap-3 px-6 py-4 bg-white border-b border-gray-200 flex-shrink-0">
        <h2 className="text-base font-semibold text-gray-800 mr-2">Import / Export</h2>
        <button
          onClick={() => { setPanel(panel === 'import' ? null : 'import'); resetImport(); setExportMsg(null) }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
            panel === 'import' ? 'border-green-700 text-white' : 'border-gray-300 text-gray-700 hover:border-green-600 hover:text-green-700'
          }`}
          style={panel === 'import' ? { backgroundColor: FG, borderColor: FG } : {}}
        >
          ⬆ Import Statistics
        </button>
        <button
          onClick={() => { setPanel(panel === 'export' ? null : 'export'); resetImport(); setExportMsg(null) }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
            panel === 'export' ? 'border-green-700 text-white' : 'border-gray-300 text-gray-700 hover:border-green-600 hover:text-green-700'
          }`}
          style={panel === 'export' ? { backgroundColor: FG, borderColor: FG } : {}}
        >
          ⬇ Export Statistics
        </button>
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">

        {/* ── History (always visible when no panel open) ── */}
        {!panel && (
          <div className="max-w-3xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-800">Import / Export History</h3>
                <p className="text-xs text-gray-400 mt-0.5">Every file imported or exported from this module.</p>
              </div>
              <button
                onClick={loadHistory}
                className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 rounded border border-gray-200 hover:border-gray-300 transition-colors"
              >↻ Refresh</button>
            </div>

            {historyLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
              </div>
            ) : history.length === 0 ? (
              <div className="card flex flex-col items-center justify-center py-14 text-center">
                <div className="text-4xl mb-3">📂</div>
                <p className="text-sm font-medium text-gray-500">No history yet</p>
                <p className="text-xs text-gray-400 mt-1">Files will appear here after your first import or export.</p>
              </div>
            ) : (
              <div className="card p-0 overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {history.map(entry => {
                    const isImport  = entry.type === 'import'
                    const expanded  = expandedLogs.has(entry.id)
                    const dateLabel = new Date(entry.performed_at).toLocaleString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                      hour: 'numeric', minute: '2-digit',
                    })
                    return (
                      <div key={entry.id}>
                        <button
                          onClick={() => setExpandedLogs(prev => {
                            const n = new Set(prev); n.has(entry.id) ? n.delete(entry.id) : n.add(entry.id); return n
                          })}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left transition-colors"
                        >
                          <span className="text-gray-400 text-xs w-3 flex-shrink-0">{expanded ? '▾' : '▸'}</span>
                          {/* Badge */}
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                            isImport ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {isImport ? '⬆ Import' : '⬇ Export'}
                          </span>
                          {/* File name */}
                          <span className="flex-1 text-sm font-medium text-gray-800 truncate">{entry.file_name || '—'}</span>
                          {/* Counts */}
                          <span className="text-xs text-gray-400 flex-shrink-0 w-28 text-right">
                            {entry.stat_count} stat{entry.stat_count !== 1 ? 's' : ''} · {entry.value_count} value{entry.value_count !== 1 ? 's' : ''}
                          </span>
                          {/* Date */}
                          <span className="text-xs text-gray-400 flex-shrink-0 w-40 text-right">{dateLabel}</span>
                        </button>

                        {/* Expanded: stat list */}
                        {expanded && (
                          <div className="px-10 py-3 bg-gray-50 border-t border-gray-100">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Statistics included</p>
                            {(entry.stat_names || []).length === 0 ? (
                              <p className="text-xs text-gray-400 italic">No stat names recorded.</p>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {entry.stat_names.map((name, i) => (
                                  <span key={i} className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{name}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── EXPORT PANEL ── */}
        {panel === 'export' && (
          <div className="max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-800">Select Statistics to Export</h3>
                <p className="text-xs text-gray-400 mt-0.5">Values for all selected stats will be included in the file.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={selectAll}   className="text-xs text-green-700 hover:text-green-900 font-medium underline underline-offset-2">Select All</button>
                <span className="text-gray-300">|</span>
                <button onClick={deselectAll} className="text-xs text-gray-500 hover:text-gray-700 font-medium underline underline-offset-2">Deselect All</button>
              </div>
            </div>
            <div className="card p-0 overflow-hidden mb-4">
              {activeStats.length === 0 ? (
                <p className="px-5 py-8 text-center text-gray-400 text-sm">No statistics found.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {activeStats.map(s => (
                    <label key={s.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleStat(s.id)} className="w-4 h-4 rounded accent-green-700 flex-shrink-0" />
                      <span className="flex-1 text-sm font-medium text-gray-800">{s.name}</span>
                      <span className="text-xs text-gray-400 capitalize">{s.tracking}</span>
                      <span className="text-xs text-gray-400 capitalize">{s.stat_type}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => handleExport('csv')} disabled={exporting || selected.size === 0} className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40 transition-opacity" style={{ backgroundColor: FG }}>
                {exporting ? 'Exporting…' : `Export as CSV${selected.size > 0 ? ` (${selected.size})` : ''}`}
              </button>
              <button onClick={() => handleExport('excel')} disabled={exporting || selected.size === 0} className="px-4 py-2 rounded-lg text-sm font-semibold border-2 border-gray-300 text-gray-700 hover:border-green-600 hover:text-green-700 disabled:opacity-40 transition-colors">
                Export as Excel
              </button>
            </div>
            <Msg m={exportMsg} />
          </div>
        )}

        {/* ── IMPORT PANEL ── */}
        {panel === 'import' && (
          <div className="max-w-2xl">

            {/* Step breadcrumb */}
            <div className="flex items-center gap-2 mb-5">
              {['upload', 'mapping', 'preview'].map((step, i) => (
                <div key={step} className="flex items-center gap-2">
                  {i > 0 && <span className="text-gray-300 text-sm">›</span>}
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                    importStep === step
                      ? 'text-white'
                      : ['upload','mapping','preview'].indexOf(importStep) > i
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-400'
                  }`} style={importStep === step ? { backgroundColor: FG } : {}}>
                    <span>{i + 1}</span>
                    <span>{importStepLabels[step]}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* ── STEP 1: Upload ── */}
            {importStep === 'upload' && (
              <>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-xl px-6 py-12 text-center cursor-pointer hover:border-green-500 hover:bg-green-50/30 transition-colors mb-3"
                >
                  <div className="text-4xl mb-3">📂</div>
                  <p className="text-sm font-medium text-gray-600">Click to choose a file</p>
                  <p className="text-xs text-gray-400 mt-1">CSV or Excel (.xlsx / .xls)</p>
                  <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileChange} />
                </div>
                <p className="text-xs text-gray-400 text-center">You'll map your file's columns to the right fields in the next step — any column names work.</p>
                <Msg m={importMsg} />
              </>
            )}

            {/* ── STEP 2: Map Fields ── */}
            {importStep === 'mapping' && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">📄 {importFile?.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{rawFileRows.length} rows · {fileHeaders.length} columns detected</p>
                  </div>
                  <button onClick={resetImport} className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2">Choose different file</button>
                </div>

                <div className="card p-0 overflow-hidden mb-4">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Map Your File's Columns</p>
                    <p className="text-xs text-gray-400 mt-0.5">Match each field below to a column in your file. Required fields must be mapped.</p>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {IMPORT_FIELDS.map(field => (
                      <div key={field.key} className="flex items-center gap-4 px-4 py-3">
                        {/* Field info */}
                        <div className="w-36 flex-shrink-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-gray-800">{field.label}</span>
                            {field.required && <span className="text-red-500 text-xs font-bold">*</span>}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5 leading-snug">{field.desc}</p>
                        </div>

                        {/* Arrow */}
                        <span className="text-gray-300 text-lg flex-shrink-0">←</span>

                        {/* Column selector */}
                        <div className="flex-1">
                          <select
                            value={mapping[field.key] || ''}
                            onChange={e => setMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                          >
                            <option value="">{field.required ? '— select column —' : '— not in file —'}</option>
                            {fileHeaders.map(h => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </div>

                        {/* Sample value preview */}
                        <div className="w-32 flex-shrink-0 text-xs text-gray-400 truncate">
                          {mapping[field.key] && rawFileRows[0]?.[mapping[field.key]] !== undefined
                            ? <span className="font-mono bg-gray-50 px-1.5 py-0.5 rounded text-gray-600 border border-gray-200">{String(rawFileRows[0][mapping[field.key]]).slice(0, 20)}</span>
                            : <span className="italic text-gray-300">no preview</span>
                          }
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Defaults for optional fields not mapped */}
                  {(!mapping.tracking || !mapping.stat_type) && (
                    <div className="px-4 py-3 bg-amber-50 border-t border-amber-100">
                      <p className="text-xs font-semibold text-amber-700 mb-2">Default values for unmapped optional fields</p>
                      <div className="flex items-center gap-6">
                        {!mapping.tracking && (
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-600 font-medium whitespace-nowrap">Tracking:</label>
                            <select value={trackingDef} onChange={e => setTrackingDef(e.target.value)} className="text-xs border border-gray-200 rounded px-2 py-1 bg-white">
                              {['daily','weekly','monthly','quarterly','yearly'].map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                        )}
                        {!mapping.stat_type && (
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-600 font-medium whitespace-nowrap">Stat Type:</label>
                            <select value={statTypeDef} onChange={e => setStatTypeDef(e.target.value)} className="text-xs border border-gray-200 rounded px-2 py-1 bg-white">
                              {['numeric','currency','percentage'].map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sample data preview */}
                {rawFileRows.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">File Preview (first 3 rows)</p>
                    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                      <table className="text-xs w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            {fileHeaders.map(h => (
                              <th key={h} className={`px-3 py-2 text-left font-semibold whitespace-nowrap ${
                                Object.values(mapping).includes(h) ? 'text-green-700 bg-green-50' : 'text-gray-500'
                              }`}>
                                {h}
                                {Object.entries(mapping).find(([, v]) => v === h)
                                  ? <span className="ml-1 text-green-600 font-normal">↳ {IMPORT_FIELDS.find(f => f.key === Object.entries(mapping).find(([, v]) => v === h)?.[0])?.label}</span>
                                  : null
                                }
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {rawFileRows.slice(0, 3).map((row, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              {fileHeaders.map(h => (
                                <td key={h} className={`px-3 py-1.5 font-mono whitespace-nowrap ${Object.values(mapping).includes(h) ? 'text-gray-800' : 'text-gray-400'}`}>
                                  {String(row[h]).slice(0, 30)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <Msg m={importMsg} />

                <button
                  onClick={handleApplyMapping}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ backgroundColor: FG }}
                >
                  Apply Mapping & Preview →
                </button>
              </>
            )}

            {/* ── STEP 3: Preview & Import ── */}
            {importStep === 'preview' && importPreview && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Ready to import</p>
                    <p className="text-xs text-gray-400 mt-0.5">{importPreview.length} stat{importPreview.length !== 1 ? 's' : ''} · {importPreview.reduce((s, p) => s + p.count, 0)} values</p>
                  </div>
                  <button onClick={() => { setImportStep('mapping'); setImportMsg(null) }} className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2">← Back to mapping</button>
                </div>

                <div className="card p-0 overflow-hidden mb-4">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr className="border-b border-gray-200">
                        <th className="text-left px-4 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">Stat Name</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">Tracking</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">Type</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">Values</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {importPreview.map(p => {
                        const exists = stats.some(s => s.name.toLowerCase() === p.name.toLowerCase())
                        return (
                          <tr key={p.name} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5 font-medium text-gray-800">{p.name}</td>
                            <td className="px-4 py-2.5 text-gray-500 capitalize">{p.tracking}</td>
                            <td className="px-4 py-2.5 text-gray-500 capitalize">{p.stat_type}</td>
                            <td className="px-4 py-2.5 text-right text-gray-700 font-medium">{p.count}</td>
                            <td className="px-4 py-2.5 text-right">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${exists ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                {exists ? 'Update' : 'New'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                  style={{ backgroundColor: FG }}
                >
                  {importing
                    ? <span className="flex items-center gap-2"><span className="animate-spin inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full"></span>Importing…</span>
                    : `Import ${importPreview.reduce((s, p) => s + p.count, 0)} Values`
                  }
                </button>

                <Msg m={importMsg} />
              </>
            )}

          </div>
        )}

      </div>
    </div>
  )
}

// ── StatisticsSettingsView ────────────────────────────────────────────────────
const WEEK_DAYS = [
  { value: 0, label: 'Sunday'    },
  { value: 1, label: 'Monday'    },
  { value: 2, label: 'Tuesday'   },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday'  },
  { value: 5, label: 'Friday'    },
  { value: 6, label: 'Saturday'  },
]

function StatisticsSettingsView({ weekEndingDay, onWeekEndingDayChange, stats }) {
  const [wedDay,   setWedDay]   = useState(weekEndingDay ?? 5)
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState(null)

  // View Data state
  const [viewSearch,    setViewSearch]    = useState('')
  const [viewLoading,   setViewLoading]   = useState(false)
  const [viewData,      setViewData]      = useState(null)  // Map: statId → { stat, values }
  const [expandedStats, setExpandedStats] = useState(new Set())

  const activeStats = (stats || []).filter(s => !s.archived)

  // Keep local state in sync if parent changes
  useEffect(() => { if (weekEndingDay !== null) setWedDay(weekEndingDay) }, [weekEndingDay])

  // Load view data on mount
  useEffect(() => { loadViewData() }, [])

  async function loadViewData() {
    setViewLoading(true)
    const { data: vals } = await supabase
      .from('statistic_values')
      .select('statistic_id, period_date, value')
      .order('period_date', { ascending: false })
    const map = new Map()
    for (const stat of activeStats) map.set(stat.id, { stat, values: [] })
    for (const v of (vals || [])) {
      if (map.has(v.statistic_id)) map.get(v.statistic_id).values.push(v)
    }
    setViewData(map)
    setViewLoading(false)
  }

  async function handleSave() {
    setSaving(true); setMsg(null)
    // Get the single company_settings row id first
    const { data: row } = await supabase.from('company_settings').select('id').single()
    if (!row?.id) { setMsg({ type: 'error', text: 'Could not find company settings record.' }); setSaving(false); return }
    const { error } = await supabase
      .from('company_settings')
      .update({ week_ending_day: wedDay, updated_at: new Date().toISOString() })
      .eq('id', row.id)
    setSaving(false)
    if (error) {
      setMsg({ type: 'error', text: error.message })
    } else {
      onWeekEndingDayChange(wedDay)
      setMsg({ type: 'success', text: 'Settings saved.' })
      setTimeout(() => setMsg(null), 3000)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 px-6 py-6">
      <div className="max-w-xl">
        <h2 className="text-base font-bold text-gray-800 mb-1">Statistics Settings</h2>
        <p className="text-xs text-gray-400 mb-6">Module-level configuration that applies across all statistics.</p>

        {/* ── Weekly Settings ── */}
        <div className="card mb-5">
          <h3 className="font-semibold text-gray-800 mb-0.5">Weekly Tracking</h3>
          <p className="text-xs text-gray-400 mb-4">Choose which day of the week your week-ending date falls on. This affects how weekly stat values are grouped and displayed on charts.</p>

          <label className="label">Week Ending Day</label>
          <div className="grid grid-cols-7 gap-1 mb-4">
            {WEEK_DAYS.map(d => (
              <button
                key={d.value}
                onClick={() => setWedDay(d.value)}
                className={`py-2 rounded-lg text-xs font-semibold text-center transition-colors border-2 ${
                  wedDay === d.value
                    ? 'text-white border-transparent'
                    : 'text-gray-500 border-gray-200 hover:border-green-400 hover:text-green-700'
                }`}
                style={wedDay === d.value ? { backgroundColor: FG, borderColor: FG } : {}}
              >
                {d.label.slice(0, 3)}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400">
            Currently set to: <strong>{WEEK_DAYS.find(d => d.value === wedDay)?.label ?? '—'}</strong>
            &nbsp;· Week-ending dates will be labeled "W/E {WEEK_DAYS.find(d => d.value === wedDay)?.label ?? '…'}"
          </p>
        </div>

        {/* ── How periods work ── */}
        <div className="card bg-green-50 border-green-200 mb-5">
          <h3 className="font-semibold text-green-900 mb-2">How Tracking Periods Work</h3>
          <div className="text-xs text-green-800 space-y-1.5">
            <p><strong>Daily</strong> — one value per calendar day (YYYY-MM-DD)</p>
            <p><strong>Weekly</strong> — one value per week, keyed to the week-ending day selected above</p>
            <p><strong>Monthly</strong> — one value per calendar month (first day of month)</p>
            <p><strong>Quarterly</strong> — one value per quarter (Jan 1, Apr 1, Jul 1, Oct 1)</p>
            <p><strong>Yearly</strong> — one value per year (Jan 1)</p>
            <hr className="border-green-200 my-2" />
            <p><strong>Default Periods</strong> — set per stat in Edit Statistic → controls how many periods show on the chart by default when you switch to that stat.</p>
          </div>
        </div>

        {/* ── Stat Types ── */}
        <div className="card bg-blue-50 border-blue-200 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">Stat Type Reference</h3>
          <div className="text-xs text-blue-800 space-y-1.5">
            <p><strong>Currency ($)</strong> — displayed as dollars with 2 decimal places (e.g. $48,500.00)</p>
            <p><strong>Numeric (#)</strong> — plain number with up to 2 decimal places (e.g. 1,240.5)</p>
            <p><strong>Percentage (%)</strong> — displayed with a % suffix (e.g. 94.30%)</p>
            <hr className="border-blue-200 my-2" />
            <p><strong>Inverted (↕)</strong> — reverses the good/bad color coding on the chart. Useful for stats where a lower number is better (e.g. defect rate, days overdue).</p>
          </div>
        </div>

        {/* Save */}
        {msg && (
          <div className={`text-sm mb-4 rounded-lg px-3 py-2.5 ${
            msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {msg.text}
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary px-6 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>

        {/* ── View All Data ── */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-gray-800">View All Stat Data</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {activeStats.length} stat{activeStats.length !== 1 ? 's' : ''} · click any row to expand its values
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search…"
                value={viewSearch}
                onChange={e => setViewSearch(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-40"
              />
              <button
                onClick={() => { setViewData(null); setExpandedStats(new Set()); loadViewData() }}
                className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 rounded border border-gray-200 hover:border-gray-300 transition-colors"
              >↻</button>
            </div>
          </div>

          {viewLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-green-700"></div>
            </div>
          ) : (
            <div className="card p-0 overflow-hidden">
              {activeStats.length === 0 ? (
                <p className="px-5 py-8 text-center text-gray-400 text-sm">No statistics found.</p>
              ) : (() => {
                const filtered = activeStats.filter(s =>
                  !viewSearch || s.name.toLowerCase().includes(viewSearch.toLowerCase())
                )
                if (filtered.length === 0) return (
                  <p className="px-5 py-8 text-center text-gray-400 text-sm">No stats match "{viewSearch}".</p>
                )
                return (
                  <div className="divide-y divide-gray-100">
                    {filtered.map(s => {
                      const entry    = viewData?.get(s.id)
                      const vals     = entry?.values || []
                      const expanded = expandedStats.has(s.id)
                      const oldest   = vals.length ? vals[vals.length - 1].period_date : null
                      const newest   = vals.length ? vals[0].period_date : null
                      return (
                        <div key={s.id}>
                          <button
                            onClick={() => setExpandedStats(prev => {
                              const n = new Set(prev); n.has(s.id) ? n.delete(s.id) : n.add(s.id); return n
                            })}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left transition-colors"
                          >
                            <span className="text-gray-400 text-xs w-3 flex-shrink-0">{expanded ? '▾' : '▸'}</span>
                            <span className="flex-1 text-sm font-semibold text-gray-800">{s.name}</span>
                            <span className="text-xs text-gray-400 capitalize w-20 text-center">{s.tracking}</span>
                            <span className="text-xs text-gray-400 capitalize w-20 text-center">{s.stat_type}</span>
                            <span className="text-xs text-gray-500 font-medium w-16 text-right">
                              {viewData ? `${vals.length} val${vals.length !== 1 ? 's' : ''}` : '…'}
                            </span>
                            <span className="text-xs text-gray-400 w-44 text-right">
                              {vals.length > 0 ? (oldest === newest ? oldest : `${oldest} → ${newest}`) : '—'}
                            </span>
                          </button>
                          {expanded && (
                            <div className="border-t border-gray-100 bg-gray-50/60">
                              {vals.length === 0 ? (
                                <p className="px-10 py-3 text-xs text-gray-400 italic">No values recorded yet.</p>
                              ) : (
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-gray-200">
                                      <th className="text-left px-10 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                                      <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Value</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {vals.map((v, i) => (
                                      <tr key={i} className="hover:bg-white">
                                        <td className="px-10 py-2 text-gray-600 font-mono text-xs">{v.period_date}</td>
                                        <td className="px-4 py-2 text-right font-medium text-gray-800 text-xs">{fmt(v.value, s.stat_type)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

// ── ArchivedView ──────────────────────────────────────────────────────────────
function ArchivedView({ onRestored }) {
  const [stats,       setStats]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [unarchiving, setUnarchiving] = useState(null)
  const [search,      setSearch]      = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('statistics')
      .select('id, name, tracking, stat_type, owner_user_id, updated_at')
      .eq('archived', true)
      .order('name')
    setStats(data || [])
    setLoading(false)
  }

  async function handleRestore(id) {
    setUnarchiving(id)
    await supabase.from('statistics').update({ archived: false }).eq('id', id)
    setUnarchiving(null)
    await load()
    onRestored?.()
  }

  const filtered = search.trim()
    ? stats.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    : stats

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* Header bar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-200 flex-shrink-0">
        <h2 className="text-base font-semibold text-gray-800">📦 Archived Statistics</h2>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          {stats.length} archived
        </span>
        <div className="ml-auto">
          <input
            type="text"
            placeholder="Search archived…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 w-52"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-5xl mb-4">📦</p>
            <p className="text-gray-500 font-medium">
              {stats.length === 0 ? 'No archived statistics.' : 'No results for that search.'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Archive a statistic from its Edit Statistic form.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr className="border-b border-gray-200">
                <th className="text-left px-6 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Tracking</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Last Updated</th>
                <th className="px-4 py-3 w-28"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-gray-900">{s.name}</td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{s.tracking}</td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{s.stat_type}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {s.updated_at ? new Date(s.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRestore(s.id)}
                      disabled={unarchiving === s.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50 transition-opacity"
                      style={{ backgroundColor: FG }}
                    >
                      {unarchiving === s.id ? 'Restoring…' : 'Restore'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── Main Statistics Page ──────────────────────────────────────────────────────
export default function Statistics() {
  const { user } = useAuth()

  // Data state
  const [stats,        setStats]        = useState([])
  const [values,       setValues]       = useState([])   // values for selectedStat
  const [valuesStatId, setValuesStatId] = useState(null) // which stat id the values belong to
  const [profiles,     setProfiles]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const prevDisplayRef  = useRef([])   // frozen frame — last rendered displayChartData
  const chartPrintRef   = useRef(null) // ref to chart area for printing

  // UI state
  const [viewMode,       setViewMode]       = useState('graphs')  // 'graphs'|'multiple-entry'|'print-multiple'|'comparison'|'import-export'|'archive'
  const [selectedId,     setSelectedId]     = useState(null)
  const [viewPeriod,     setViewPeriod]     = useState('weekly')
  const [fromDate,       setFromDate]       = useState(daysAgo(90))
  const [toDate,         setToDate]         = useState(today())
  const [autoMin,        setAutoMin]        = useState(true)
  const [autoMax,        setAutoMax]        = useState(true)
  const [openFolder,     setOpenFolder]     = useState('my')   // 'my'|'shared'|'public'
  const [search,         setSearch]         = useState('')
  const [showN,          setShowN]          = useState(25)

  // Drag-and-drop state
  const [dragId,     setDragId]     = useState(null)
  const [dragOverId, setDragOverId] = useState(null)

  // Quick value entry
  const [quickValue,   setQuickValue]   = useState('')
  const [quickSaving,  setQuickSaving]  = useState(false)
  const [quickSaveMsg, setQuickSaveMsg] = useState('')

  // Company settings
  const [weekEndingDay, setWeekEndingDay] = useState(null)  // null = not configured, 0-6 = day

  // Modal state
  const [showTypeSelector,    setShowTypeSelector]    = useState(false)
  const [showBasicForm,       setShowBasicForm]       = useState(false)
  const [showEquationForm,    setShowEquationForm]    = useState(false)
  const [showOverlayForm,     setShowOverlayForm]     = useState(false)
  const [showSecondaryForm,   setShowSecondaryForm]   = useState(false)
  const [showAutoForm,        setShowAutoForm]        = useState(false)
  const [editingData,         setEditingData]         = useState(null)   // null = new, obj = edit
  const [showPrintModal,      setShowPrintModal]      = useState(false)
  const [showTargetPicker,    setShowTargetPicker]    = useState(false)
  const [targetSourceStat,    setTargetSourceStat]    = useState(null)

  // Overlay chart data: array of { stat, part, values } for the selected overlay stat
  const [overlayValues,       setOverlayValues]       = useState([])
  const [showDateRangeSelector, setShowDateRangeSelector] = useState(false)
  const [showEditHistory,     setShowEditHistory]     = useState(false)
  const [editHistoryFromDate, setEditHistoryFromDate] = useState(null)
  const [weekEndingError,     setWeekEndingError]     = useState(false)  // show config warning

  // Stat notes
  const [statNotes,       setStatNotes]       = useState([])          // notes for selectedStat
  const [noteModal,       setNoteModal]       = useState(null)        // { date, label } | null
  const [noteText,        setNoteText]        = useState('')
  const [noteSaving,      setNoteSaving]      = useState(false)
  const [showNotesModal,  setShowNotesModal]  = useState(false)

  // Ref to auto-select a stat after stats list refreshes
  const pendingSelectName = useRef(null)

  // When stats list updates, check if we have a pending stat to select
  useEffect(() => {
    if (!pendingSelectName.current || stats.length === 0) return
    const found = stats.find(s => s.name === pendingSelectName.current)
    console.log('[Statistics] pendingSelect check — looking for:', pendingSelectName.current, 'found:', found, 'in', stats.map(s=>s.name))
    if (found) {
      setOpenFolder('my')
      selectStat(found.id)
      pendingSelectName.current = null
    }
  }, [stats])

  // ── Fetch profiles & stats ─────────────────────────────────────────────────
  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    const [profRes, stsRes, settingsRes] = await Promise.all([
      supabase.from('profiles').select('id, email, full_name').order('full_name'),
      supabase.from('statistics').select('*').order('sort_order', { ascending: true }).order('name'),
      supabase.from('company_settings').select('week_ending_day').maybeSingle(),
    ])
    console.log('[Statistics] fetchAll — stats result:', stsRes.data?.length ?? 'null', 'error:', stsRes.error)
    if (profRes.error) console.error('[Statistics] profiles error:', profRes.error)
    if (stsRes.error) console.error('[Statistics] statistics error:', stsRes.error)
    const freshStats = stsRes.data || []
    const freshWed   = settingsRes.data?.week_ending_day ?? null
    setProfiles(profRes.data || [])
    setStats(freshStats)
    setWeekEndingDay(freshWed)
    setLoading(false)
    // Return fresh data so callers can use it immediately without waiting for state to re-render
    return { stats: freshStats, wed: freshWed }
  }

  // ── Fetch notes when selected stat changes ────────────────────────────────
  useEffect(() => {
    if (!selectedId) { setStatNotes([]); return }
    supabase.from('stat_notes').select('*').eq('statistic_id', selectedId).order('period_date')
      .then(({ data }) => setStatNotes(data || []))
  }, [selectedId])

  async function fetchNotes() {
    if (!selectedId) return
    const { data } = await supabase.from('stat_notes').select('*').eq('statistic_id', selectedId).order('period_date')
    setStatNotes(data || [])
  }

  function openNoteModal(date, label) {
    const existing = statNotes.find(n => n.period_date === date)
    setNoteText(existing?.note || '')
    setNoteModal({ date, label })
  }

  async function saveNote() {
    if (!noteModal || !selectedId) return
    setNoteSaving(true)
    await supabase.from('stat_notes').upsert(
      { statistic_id: selectedId, period_date: noteModal.date, note: noteText, created_by: user?.id },
      { onConflict: 'statistic_id,period_date' }
    )
    await fetchNotes()
    setNoteSaving(false)
    setNoteModal(null)
  }

  async function deleteNote() {
    if (!noteModal || !selectedId) return
    setNoteSaving(true)
    await supabase.from('stat_notes').delete().eq('statistic_id', selectedId).eq('period_date', noteModal.date)
    await fetchNotes()
    setNoteSaving(false)
    setNoteModal(null)
  }

  // ── Fetch values when selected stat changes ────────────────────────────────
  useEffect(() => {
    if (!selectedId) { setValues([]); setOverlayValues([]); return }
    const stat = stats.find(s => s.id === selectedId)
    if (stat?.stat_category === 'equation') {
      setOverlayValues([])
      fetchEquationValues(stat)
    } else if (stat?.stat_category === 'overlay') {
      setValues([])
      fetchOverlayValues(stat)
    } else if (stat?.stat_category === 'secondary') {
      setOverlayValues([])
      syncSecondaryValues(stat).then(earliest => {
        fetchValues(selectedId)
        if (earliest) {
          setFromDate(earliest)
          setToDate(today())
        }
      })
    } else if (stat?.stat_category === 'auto') {
      setOverlayValues([])
      syncAutoValues(stat).then(earliest => {
        fetchValues(selectedId)
        if (earliest) {
          setFromDate(earliest)
          setToDate(today())
        }
      })
    } else {
      setOverlayValues([])
      fetchValues(selectedId)
    }
  }, [selectedId, stats])

  async function syncSecondaryValues(stat) {
    if (!stat?.source_stat_id) return null
    const { data: srcVals } = await supabase.from('statistic_values')
      .select('period_date, value').eq('statistic_id', stat.source_stat_id).order('period_date')
    if (!srcVals?.length) return null
    const computed = aggregateValues(srcVals, stat.tracking, stat.aggregation_method || 'sum')
    if (!computed.length) return null
    await supabase.from('statistic_values').upsert(
      computed.map(r => ({ statistic_id: stat.id, period_date: r.period_date, value: r.value })),
      { onConflict: 'statistic_id,period_date' }
    )
    const earliest = computed[0].period_date
    // Update DB if needed
    if (!stat.beginning_date || stat.beginning_date > earliest) {
      await supabase.from('statistics').update({ beginning_date: earliest }).eq('id', stat.id)
    }
    // Update local stats state so scrubber gets correct minDate immediately (no refetch needed)
    setStats(prev => prev.map(s =>
      s.id === stat.id ? { ...s, beginning_date: earliest } : s
    ))
    return earliest
  }

  async function syncAutoValues(stat) {
    if (!stat?.data_source) return null
    let ds
    try { ds = JSON.parse(stat.data_source) } catch { return null }
    if (!ds?.table || !ds?.date_column) return null

    // Fetch all rows from the source table
    let query = supabase.from(ds.table).select(
      ds.metric === 'count'
        ? `${ds.date_column}`
        : `${ds.date_column}, ${ds.field}`
    )
    // Apply equality filters
    if (ds.filter) {
      for (const [col, val] of Object.entries(ds.filter)) {
        query = query.eq(col, val)
      }
    }
    // Filter out nulls on the date column
    query = query.not(ds.date_column, 'is', null)
    const { data: rows, error } = await query
    if (error || !rows?.length) return null

    // Group by period
    const buckets = new Map()
    for (const row of rows) {
      const rawDate = row[ds.date_column]
      if (!rawDate) continue
      const dateStr = rawDate.slice(0, 10)
      const bucket  = getOutputPeriodKey(dateStr, stat.tracking)
      if (!buckets.has(bucket)) buckets.set(bucket, [])
      if (ds.metric !== 'count') {
        const val = Number(row[ds.field] ?? 0)
        buckets.get(bucket).push(val)
      } else {
        buckets.get(bucket).push(1)
      }
    }

    const computed = []
    for (const [period_date, vals] of buckets) {
      let value
      if      (ds.metric === 'count') value = vals.length
      else if (ds.metric === 'sum')   value = vals.reduce((a, b) => a + b, 0)
      else if (ds.metric === 'avg')   value = vals.reduce((a, b) => a + b, 0) / vals.length
      computed.push({ period_date, value })
    }
    computed.sort((a, b) => a.period_date.localeCompare(b.period_date))
    if (!computed.length) return null

    await supabase.from('statistic_values').upsert(
      computed.map(r => ({ statistic_id: stat.id, period_date: r.period_date, value: r.value })),
      { onConflict: 'statistic_id,period_date' }
    )
    const earliest = computed[0].period_date
    if (!stat.beginning_date || stat.beginning_date > earliest) {
      await supabase.from('statistics').update({ beginning_date: earliest }).eq('id', stat.id)
    }
    setStats(prev => prev.map(s =>
      s.id === stat.id ? { ...s, beginning_date: earliest } : s
    ))
    return earliest
  }

  async function fetchValues(statId) {
    const { data } = await supabase
      .from('statistic_values')
      .select('*')
      .eq('statistic_id', statId)
      .order('period_date')
    // Atomically update values AND record which stat they belong to
    setValues(data || [])
    setValuesStatId(statId)
  }

  async function fetchEquationValues(stat) {
    const parts = stat.equation_parts || []
    const statIds = [...new Set(parts.map(p => p.stat_id).filter(Boolean))]
    if (statIds.length === 0) { setValues([]); setValuesStatId(stat.id); return }

    const { data: rawVals } = await supabase
      .from('statistic_values')
      .select('statistic_id, period_date, value')
      .in('statistic_id', statIds)
      .order('period_date')

    // Build map: statId → Map<period_date, value>
    const valMap = {}
    for (const id of statIds) valMap[id] = new Map()
    for (const v of (rawVals || [])) {
      if (valMap[v.statistic_id]) valMap[v.statistic_id].set(v.period_date, Number(v.value))
    }

    // Only compute periods where ALL component stats have a value
    const firstId = parts[0]?.stat_id
    if (!firstId) { setValues([]); setValuesStatId(stat.id); return }

    const computed = []
    for (const [period] of valMap[firstId] || []) {
      const allPresent = statIds.every(id => valMap[id].has(period))
      if (!allPresent) continue

      let result = null
      for (const part of parts) {
        if (!part.stat_id) continue
        const val = valMap[part.stat_id]?.get(period) ?? 0
        if (result === null) {
          result = val
        } else {
          const op = part.operator
          if      (op === '+') result += val
          else if (op === '-') result -= val
          else if (op === '*') result *= val
          else if (op === '/') result = val !== 0 ? result / val : result
        }
      }
      if (result !== null) computed.push({ statistic_id: stat.id, period_date: period, value: result })
    }

    setValues(computed)
    setValuesStatId(stat.id)
  }

  async function fetchOverlayValues(stat) {
    const parts   = stat.overlay_parts || []
    // stat_id may be stored as a string in JSONB — normalise to number
    const statIds = parts.map(p => Number(p.stat_id)).filter(Boolean)
    if (!statIds.length) { setOverlayValues([]); setValuesStatId(stat.id); return }

    const { data: rawVals } = await supabase
      .from('statistic_values')
      .select('statistic_id, period_date, value')
      .in('statistic_id', statIds)
      .order('period_date')

    const grouped = parts
      .filter(p => p.stat_id)
      .map(p => {
        const numId = Number(p.stat_id)
        return {
          stat:   stats.find(s => s.id === numId) || null,
          part:   p,
          values: (rawVals || []).filter(v => v.statistic_id === numId),
        }
      })

    setOverlayValues(grouped)
    setValuesStatId(stat.id)
  }

  async function refreshValues() {
    if (selectedId) await fetchValues(selectedId)
    await fetchAll()
  }

  // ── Derived data ───────────────────────────────────────────────────────────
  const selectedStat = useMemo(() => stats.find(s => s.id === selectedId) || null, [stats, selectedId])

  // ── Print current chart ───────────────────────────────────────────────────
  function handlePrint() {
    if (!selectedStat) return
    setShowPrintModal(true)
  }

  function executePrint(orientation) {
    setShowPrintModal(false)
    const el = chartPrintRef.current
    if (!el || !selectedStat) return

    const title     = selectedStat.name
    const dateRange = `${fromDate} → ${toDate}`

    // Clone each SVG, preserve its content via viewBox, and make it 20% taller
    const svgEls = el.querySelectorAll('svg')
    let svgHTML = ''
    svgEls.forEach(svg => {
      const clone = svg.cloneNode(true)
      const rect  = svg.getBoundingClientRect()
      const w     = rect.width  || parseFloat(svg.getAttribute('width'))  || 800
      const h     = rect.height || parseFloat(svg.getAttribute('height')) || 400
      clone.setAttribute('viewBox', `0 0 ${w} ${h}`)
      clone.setAttribute('width',  '100%')
      clone.setAttribute('height', Math.round(h * 1.2))
      clone.style.display = 'block'
      svgHTML += clone.outerHTML
    })

    const winW = orientation === 'landscape' ? 1100 : 850
    const winH = orientation === 'landscape' ? 700  : 950
    const win  = window.open('', '_blank', `width=${winW},height=${winH}`)
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: ui-sans-serif, system-ui, sans-serif; background: #fff; padding: 28px 32px; }
    h1 { font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 4px; }
    p  { font-size: 12px; color: #6b7280; margin-bottom: 20px; }
    svg { display: block; width: 100% !important; }
    @media print {
      @page { size: ${orientation}; margin: 1.2cm; }
      body  { padding: 0; }
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>${dateRange}</p>
  ${svgHTML}
  <script>window.onload = () => { window.print(); window.close(); }<\/script>
</body>
</html>`)
    win.document.close()
  }

  // ── Quick entry: compute the most-recent canonical period for the selected stat ──
  const quickPeriod = useMemo(() => {
    if (!selectedStat) return { label: '', date: today() }
    const now = new Date()
    const wed = weekEndingDay ?? 5

    if (selectedStat.tracking === 'daily') {
      return {
        label: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        date:  today(),
      }
    }
    if (selectedStat.tracking === 'weekly') {
      const weekEnd  = new Date(getWeekEndingDate(today(), wed) + 'T00:00:00')
      const weekStart = new Date(weekEnd); weekStart.setDate(weekStart.getDate() - 6)
      const startLbl = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const endLbl   = weekEnd.toLocaleDateString('en-US',   { month: 'short', day: 'numeric', year: 'numeric' })
      return { label: `${startLbl} – ${endLbl}`, date: isoDate(weekEnd) }
    }
    if (selectedStat.tracking === 'monthly') {
      // Most recently completed month = last day of previous month
      const lastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
      return {
        label: lastMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        date:  isoDate(lastMonth),
      }
    }
    if (selectedStat.tracking === 'quarterly') {
      const curQ  = Math.floor(now.getMonth() / 3)          // 0-indexed current quarter
      const lastQ = curQ === 0 ? 3 : curQ - 1
      const lastQYear = curQ === 0 ? now.getFullYear() - 1 : now.getFullYear()
      const lastQEnd  = new Date(lastQYear, lastQ * 3 + 3, 0)
      return { label: `Q${lastQ + 1} ${lastQYear}`, date: isoDate(lastQEnd) }
    }
    // yearly — most recently completed year
    const lastYear = now.getFullYear() - 1
    return { label: String(lastYear), date: `${lastYear}-12-31` }
  }, [selectedStat, weekEndingDay])

  // Pre-fill quick entry whenever the stat or its loaded values change
  useEffect(() => {
    if (!selectedStat || !quickPeriod.date) { setQuickValue(''); return }
    const existing = values.find(v =>
      matchesPeriod(v.period_date, quickPeriod.date, selectedStat.tracking, weekEndingDay)
    )
    setQuickValue(existing != null ? String(existing.value) : '')
    setQuickSaveMsg('')
  }, [selectedId, values, quickPeriod.date])

  // Quick save handler — upsert or delete for the current period
  async function handleQuickSave() {
    if (!selectedStat) return
    setQuickSaving(true); setQuickSaveMsg('')
    const trimmed = quickValue.trim()
    const existing = values.find(v =>
      matchesPeriod(v.period_date, quickPeriod.date, selectedStat.tracking, weekEndingDay)
    )
    if (trimmed !== '') {
      const num = parseFloat(trimmed)
      if (isNaN(num)) { setQuickSaveMsg('⚠️ Invalid number'); setQuickSaving(false); return }
      const { error } = await supabase.from('statistic_values')
        .upsert({ statistic_id: selectedStat.id, period_date: quickPeriod.date, value: num, entered_by: user?.id },
                 { onConflict: 'statistic_id,period_date' })
      if (error) { setQuickSaveMsg('⚠️ ' + error.message); setQuickSaving(false); return }
    } else if (existing) {
      const { error } = await supabase.from('statistic_values').delete().eq('id', existing.id)
      if (error) { setQuickSaveMsg('⚠️ ' + error.message); setQuickSaving(false); return }
    }
    setQuickSaving(false)
    setQuickSaveMsg('✓')
    await refreshValues()
    setTimeout(() => setQuickSaveMsg(''), 3000)
  }

  // Folder groupings — archived stats are segregated into their own folder
  const myStats       = useMemo(() => stats.filter(s => !s.archived && s.owner_user_id === user?.id),              [stats, user])
  const sharedStats   = useMemo(() => stats.filter(s => !s.archived && s.owner_user_id !== user?.id && !s.is_public), [stats, user])
  const publicStats   = useMemo(() => stats.filter(s => !s.archived && s.is_public),                               [stats])
  const archivedStats = useMemo(() => stats.filter(s => s.archived),                                               [stats])

  // Flat searchable list based on open folder
  const folderStats = useMemo(() => {
    const base = openFolder === 'my'       ? myStats
               : openFolder === 'shared'   ? sharedStats
               : openFolder === 'archived' ? archivedStats
               :                             publicStats
    if (!search.trim()) return base
    const q = search.toLowerCase()
    return base.filter(s => s.name.toLowerCase().includes(q))
  }, [openFolder, myStats, sharedStats, publicStats, archivedStats, search])

  // Period hierarchy — used to determine valid aggregation options
  const PERIOD_ORDER = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']

  // Pure helper: compute the from/to date range for a stat's default_periods.
  // Returns null if the stat has no default_periods set.
  function defaultRangeFor(stat, wed) {
    if (!stat?.default_periods) return null
    const count = stat.default_periods
    const wday  = wed ?? 5
    const now   = new Date()
    let from
    if (stat.tracking === 'daily') {
      const d = new Date(); d.setDate(d.getDate() - (count - 1)); from = isoDate(d)
    } else if (stat.tracking === 'weekly') {
      const we = new Date(getWeekEndingDate(today(), wday) + 'T00:00:00')
      we.setDate(we.getDate() - (count - 1) * 7); from = isoDate(we)
    } else if (stat.tracking === 'monthly') {
      from = isoDate(new Date(now.getFullYear(), now.getMonth() - (count - 1), 1))
    } else if (stat.tracking === 'quarterly') {
      from = isoDate(new Date(now.getFullYear(), now.getMonth() - (count - 1) * 3, 1))
    } else {
      from = `${now.getFullYear() - (count - 1)}-01-01`
    }
    return { from, to: today() }
  }

  // Select a stat — sets id, clears stale values, and applies date range all
  // in one React batch so the chart never renders with mismatched data (no flash).
  function selectStat(id) {
    const stat  = stats.find(s => s.id === id) ?? null
    const range = defaultRangeFor(stat, weekEndingDay)
    setSelectedId(id)
    // Do NOT clear values here — we hold the previous frame until new data arrives
    if (range) {
      setFromDate(range.from)
      setToDate(range.to)
    }
  }

  // Reset viewPeriod to the stat's native tracking when selection changes
  // (daily stats default to weekly since there's no daily button)
  useEffect(() => {
    if (!selectedStat) return
    setViewPeriod(selectedStat.tracking)
  }, [selectedId])

  // Apply default_periods date range whenever the selected stat or its settings change
  useEffect(() => {
    if (!selectedStat) return
    if (selectedStat.stat_category === 'target') return    // target stats: date locked to target line
    if (selectedStat.stat_category === 'secondary') return // secondary stats: date set from sync
    if (selectedStat.stat_category === 'auto') return      // auto stats: date set from sync
    const range = defaultRangeFor(selectedStat, weekEndingDay)
    if (range) {
      setFromDate(range.from)
      setToDate(range.to)
    }
  }, [selectedStat?.id, selectedStat?.default_periods, weekEndingDay])

  // For target stats, lock the date range to the target line extent
  useEffect(() => {
    if (!selectedStat || selectedStat.stat_category !== 'target') return
    const tls = selectedStat.target_lines || []
    if (!tls.length) return
    const startDates = tls.map(tl => tl.start_date).filter(Boolean)
    const endDates = tls.map(tl =>
      computeTargetEndDate(tl.start_date, tl.end_mode, tl.end_date, tl.end_periods, tl.end_unit || selectedStat.tracking)
    ).filter(Boolean)
    if (!startDates.length) return
    const from = startDates.reduce((a, b) => a < b ? a : b)
    const to   = endDates.reduce((a, b) => a > b ? a : b, from)
    setFromDate(from)
    setToDate(to)
  }, [selectedStat?.id, selectedStat?.stat_category, selectedStat?.target_lines])

  // Raw chart data — native values in date range, with optional zero-fill for missing periods
  const chartData = useMemo(() => {
    if (!selectedStat) return []
    const wed = weekEndingDay ?? 5

    // Build a map of entered values keyed by canonical display date
    const entered = new Map()
    values
      .filter(v => v.period_date >= fromDate && v.period_date <= toDate)
      .forEach(v => {
        const displayDate = (selectedStat.tracking === 'weekly' && weekEndingDay !== null)
          ? getWeekEndingDate(v.period_date, weekEndingDay)
          : v.period_date
        entered.set(displayDate, Number(v.value))
      })

    if (selectedStat.missing_value_display === 'zero') {
      // Generate every period in range and fill 0 where nothing was entered
      const allPeriods = generatePeriods(fromDate, toDate, selectedStat.tracking, wed)
      return allPeriods.map(p => ({
        label: periodLabel(p, selectedStat.tracking),
        value: entered.has(p) ? entered.get(p) : 0,
        date:  p,
      }))
    }

    // Default 'skip' — only plot entered values
    return [...entered.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, value]) => ({ label: periodLabel(date, selectedStat.tracking), value, date }))
  }, [values, fromDate, toDate, selectedStat, weekEndingDay])

  // Aggregated display data — rolls up native values to viewPeriod buckets.
  // While values are in-flight for a different stat, we return the previous
  // frame (prevDisplayRef) so the chart never shows a flash or empty state.
  const displayChartData = useMemo(() => {
    // Values haven't arrived yet for the selected stat → hold previous frame
    if (valuesStatId !== selectedId) return prevDisplayRef.current

    // Values are loaded — compute fresh display data
    let result
    if (!selectedStat || !chartData.length) {
      result = chartData
    } else {
      const nativeIdx = PERIOD_ORDER.indexOf(selectedStat.tracking)
      const viewIdx   = PERIOD_ORDER.indexOf(viewPeriod)
      const isPercentage = selectedStat.stat_type === 'percentage'

      if (viewIdx <= nativeIdx) {
        result = chartData
      } else {
        const buckets = new Map()

        for (const pt of chartData) {
          const d = new Date(pt.date + 'T00:00:00')
          let key, label, sortKey

          if (viewPeriod === 'weekly') {
            const we = getWeekEndingDate(pt.date, weekEndingDay ?? 5)
            key = we; sortKey = we
            label = 'W/E ' + new Date(we + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          } else if (viewPeriod === 'monthly') {
            key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            sortKey = key
            label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
          } else if (viewPeriod === 'quarterly') {
            const q = Math.floor(d.getMonth() / 3) + 1
            key = `${d.getFullYear()}-Q${q}`
            sortKey = `${d.getFullYear()}-${String(q * 3).padStart(2, '0')}`
            label = `Q${q} ${d.getFullYear()}`
          } else {
            key = String(d.getFullYear()); sortKey = key; label = key
          }

          if (!buckets.has(key)) buckets.set(key, { label, total: 0, count: 0, sortKey })
          const b = buckets.get(key)
          b.total += pt.value
          b.count += 1
        }

        result = [...buckets.values()]
          .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
          .map(b => ({
            label: b.label,
            value: isPercentage ? b.total / b.count : b.total,
            date:  b.sortKey,
          }))
      }
    }

    // Save this as the last good frame
    prevDisplayRef.current = result
    return result
  }, [chartData, viewPeriod, selectedStat, weekEndingDay, valuesStatId, selectedId])

  // ── Chart data with target line dates included ────────────────────────────
  const chartDataWithTargets = useMemo(() => {
    const tls = selectedStat?.target_lines
    if (!tls?.length || !displayChartData.length) return displayChartData
    const tracking = selectedStat.tracking
    const extraLabels = new Set()
    tls.forEach(tl => {
      if (!tl.start_date) return
      const endDate = computeTargetEndDate(tl.start_date, tl.end_mode, tl.end_date, tl.end_periods, tl.end_unit || tracking)
      extraLabels.add(periodLabel(tl.start_date, tracking))
      extraLabels.add(periodLabel(endDate, tracking))
    })
    const existingLabels = new Set(displayChartData.map(d => d.label))
    const extras = []
    extraLabels.forEach(lbl => {
      if (!existingLabels.has(lbl)) extras.push({ label: lbl, value: null, date: lbl })
    })
    if (!extras.length) return displayChartData
    return [...displayChartData, ...extras].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  }, [displayChartData, selectedStat])

  // ── Overlay chart data ─────────────────────────────────────────────────────
  const overlayChartData = useMemo(() => {
    if (!selectedStat || selectedStat.stat_category !== 'overlay') return null
    if (!overlayValues.length) return []

    const allDates = new Set()
    overlayValues.forEach(({ values }) =>
      values
        .filter(v => v.period_date >= fromDate && v.period_date <= toDate)
        .forEach(v => allDates.add(v.period_date))
    )

    return [...allDates].sort().map(date => {
      const point = { date, label: periodLabel(date, selectedStat.tracking) }
      overlayValues.forEach(({ values }, i) => {
        const v = values.find(v => v.period_date === date)
        point[`v${i}`] = v != null ? Number(v.value) : null
      })
      return point
    })
  }, [overlayValues, fromDate, toDate, selectedStat])

  // Per-stat Y domains so each overlay line gets its own independent axis
  const overlayYDomains = useMemo(() => {
    return overlayValues.map(({ part }, i) => {
      if (!overlayChartData?.length) return ['auto', 'auto']
      const vals = overlayChartData.map(d => d[`v${i}`]).filter(v => v != null)
      if (!vals.length) return ['auto', 'auto']
      const dataMin = Math.min(...vals)
      const dataMax = Math.max(...vals)
      const lo = (part?.y_min != null) ? Number(part.y_min) : dataMin
      const hi = (part?.y_max != null) ? Number(part.y_max) : dataMax
      const range = hi - lo || Math.abs(hi) || 1
      const pad = range * 0.08
      return [lo - pad, hi + pad]
    })
  }, [overlayChartData, overlayValues])

  // Navigation through stats
  const allStatsList = folderStats
  const currentIdx   = allStatsList.findIndex(s => s.id === selectedId)
  const hasPrev      = currentIdx > 0
  const hasNext      = currentIdx < allStatsList.length - 1

  const goTo = (delta) => {
    const next = allStatsList[currentIdx + delta]
    if (next) selectStat(next.id)
  }

  // Y-axis domain + ticks: compute clean round-number intervals like the reference app
  const { yDomain, yTicks } = useMemo(() => {
    if (!displayChartData.length) return { yDomain: ['auto', 'auto'], yTicks: undefined }

    const vals   = displayChartData.map(d => d.value).filter(v => v != null && isFinite(v))
    if (!vals.length) return { yDomain: ['auto', 'auto'], yTicks: undefined }

    const dataMin = Math.min(...vals)
    const dataMax = Math.max(...vals)
    const range   = dataMax - dataMin || Math.abs(dataMax) || 1

    // Pick a "nice" interval that gives roughly 15 grid lines
    const rawStep = range / 14
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)))
    const candidates = [1, 2, 2.5, 5, 10].map(f => f * magnitude)
    const step = candidates.find(c => c >= rawStep) ?? candidates[candidates.length - 1]

    // Floor/ceil to step boundaries, then add one step of headroom above
    const rawBottom = autoMin ? Math.floor(dataMin / step) * step : 0
    const rawTop    = Math.ceil(dataMax  / step) * step + step

    // Build the tick array
    const ticks = []
    for (let t = rawBottom; t <= rawTop + step * 0.01; t = Math.round((t + step) * 1e10) / 1e10) {
      ticks.push(t)
    }

    const bottom = ticks[0]
    const top    = ticks[ticks.length - 1]

    if (selectedStat?.upside_down) {
      return { yDomain: [top, bottom], yTicks: [...ticks].reverse() }
    }
    return { yDomain: [bottom, top], yTicks: ticks }
  }, [displayChartData, autoMin, autoMax, selectedStat])

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleTypeSelect = (type) => {
    setShowTypeSelector(false)
    if (type === 'basic')     { setEditingData(null); setShowBasicForm(true)      }
    if (type === 'equation')  { setEditingData(null); setShowEquationForm(true)   }
    if (type === 'overlay')   { setEditingData(null); setShowOverlayForm(true)    }
    if (type === 'secondary') { setEditingData(null); setShowSecondaryForm(true)  }
    if (type === 'auto')      { setEditingData(null); setShowAutoForm(true)       }
    if (type === 'target')    { setShowTargetPicker(true) }
  }

  const handleSaveForm = async (editedId, savedName) => {
    setShowBasicForm(false)
    setShowEquationForm(false)
    setShowOverlayForm(false)
    setShowSecondaryForm(false)
    setShowAutoForm(false)
    setEditingData(null)
    console.log('[Statistics] handleSaveForm — editedId:', editedId, 'savedName:', savedName)

    if (editedId) {
      // Fetch fresh data first so we get the updated default_periods
      const { stats: freshStats, wed: freshWed } = await fetchAll()
      // Now compute the date range from the freshly fetched stat, not the stale closure
      const freshStat = freshStats.find(s => s.id === editedId)
      const range     = defaultRangeFor(freshStat, freshWed ?? weekEndingDay)
      setSelectedId(editedId)
      if (range) { setFromDate(range.from); setToDate(range.to) }
    } else {
      // New stat: set pending name, then fetchAll will trigger the useEffect to select it
      pendingSelectName.current = savedName
      await fetchAll()
    }
  }

  const handleEditStat = () => {
    if (!selectedStat) return
    setEditingData(selectedStat)
    if (selectedStat.stat_category === 'equation') {
      setShowEquationForm(true)
    } else if (selectedStat.stat_category === 'overlay') {
      setShowOverlayForm(true)
    } else if (selectedStat.stat_category === 'secondary') {
      setShowSecondaryForm(true)
    } else if (selectedStat.stat_category === 'auto') {
      setShowAutoForm(true)
    } else {
      setShowBasicForm(true)
    }
  }

  const handleDeleteStat = async () => {
    setShowBasicForm(false)
    setShowAutoForm(false)
    setEditingData(null)
    setSelectedId(null)
    await fetchAll()
  }

  // ── Drag-and-drop handlers ─────────────────────────────────────────────────
  const handleDragStart = (e, statId) => {
    setDragId(statId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, statId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (statId !== dragId) setDragOverId(statId)
  }

  const handleDrop = async (e, targetId) => {
    e.preventDefault()
    const sourceId = dragId
    setDragId(null)
    setDragOverId(null)
    if (!sourceId || sourceId === targetId) return

    const list     = [...folderStats]
    const fromIdx  = list.findIndex(s => s.id === sourceId)
    const toIdx    = list.findIndex(s => s.id === targetId)
    if (fromIdx === -1 || toIdx === -1) return

    const reordered = [...list]
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)

    // Optimistic local update
    const orderMap = {}
    reordered.forEach((s, i) => { orderMap[s.id] = i })
    setStats(prev =>
      prev
        .map(s => ({ ...s, sort_order: orderMap[s.id] ?? s.sort_order ?? 999 }))
        .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999))
    )

    // Persist to Supabase
    await Promise.all(
      reordered.map((s, i) =>
        supabase.from('statistics').update({ sort_order: i }).eq('id', s.id)
      )
    )
  }

  const handleDragEnd = () => {
    setDragId(null)
    setDragOverId(null)
  }

  const FolderRow = ({ id, label, count }) => (
    <button
      onClick={() => setOpenFolder(id)}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
        openFolder === id ? 'bg-green-50 text-green-800 font-semibold' : 'text-gray-600 hover:bg-gray-50'
      }`}
    >
      <span className="flex items-center gap-2">
        <span>📁</span>
        <span>{label}</span>
        <span className="text-xs text-gray-400 font-normal">({count})</span>
      </span>
    </button>
  )

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-700"></div>
    </div>
  )

  return (
    <div className="h-[calc(100vh-2.75rem)] -m-4 lg:-m-6 flex flex-col overflow-hidden bg-gray-100">

      {/* ── MODE TABS — portalled into the green app header bar ─── */}
      {createPortal(
        <div className="flex items-center gap-0.5">
          {[
            { id: 'graphs',         icon: '📈', label: 'Graphs'          },
            { id: 'multiple-entry', icon: '📝', label: 'Multiple Entry'  },
            { id: 'print-multiple', icon: '🖨️',  label: 'Print Multiple' },
            { id: 'comparison',     icon: '⚖️',  label: 'Comparison'     },
            { id: 'import-export',  icon: '↕️',  label: 'Import / Export'},
            { id: 'archive',        icon: '📦', label: 'Archive'         },
            { id: 'settings',       icon: '⚙️',  label: 'Settings'       },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setViewMode(m.id)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                viewMode === m.id
                  ? 'bg-black/20 text-white'
                  : 'text-white/70 hover:text-white hover:bg-black/15'
              }`}
            >
              <span>{m.icon}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>,
        document.getElementById('app-header-center')
      )}

      {/* ── COMBINED MODULE HEADER ───────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-6 pt-6 pb-4 bg-gray-50 border-b border-gray-200 flex-shrink-0">
        <h1 className="text-xl font-bold text-gray-900 flex-shrink-0">Statistics</h1>
        {viewMode === 'graphs' && selectedStat && (
          <>
            {/* Spacer sized to push edit links flush with the left-panel / right-panel divider */}
            <div className="w-32 xl:w-40 flex-shrink-0" />
            {!['equation','overlay'].includes(selectedStat?.stat_category) && (
              <button
                onClick={() => {
                  if (selectedStat?.tracking === 'weekly' && weekEndingDay === null) {
                    setWeekEndingError(true); return
                  }
                  setWeekEndingError(false)
                  setShowDateRangeSelector(true)
                }}
                className="text-sm font-medium text-blue-600 hover:text-blue-800 underline underline-offset-2 transition-colors flex-shrink-0"
              >
                Edit Value History
              </button>
            )}
            <button
              onClick={handleEditStat}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 underline underline-offset-2 transition-colors flex-shrink-0"
            >
              Edit Statistic
            </button>
            <button
              onClick={() => setShowNotesModal(true)}
              className="text-sm font-medium text-amber-600 hover:text-amber-800 underline underline-offset-2 transition-colors flex-shrink-0 flex items-center gap-1"
            >
              {statNotes.length > 0 && (
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold">{statNotes.length}</span>
              )}
              Notes
            </button>
          </>
        )}
        <div className="flex-1 min-w-0" />
        <button onClick={() => setShowTypeSelector(true)} className="btn-primary text-sm px-3 py-1.5 flex-shrink-0">
          + Add Statistic
        </button>
      </div>

      {/* ── NON-GRAPH VIEWS ─────────────────────────────────────────────── */}
      {viewMode === 'multiple-entry' && (
        <MultipleEntryView stats={stats} weekEndingDay={weekEndingDay} />
      )}

      {viewMode === 'archive' && (
        <ArchivedView onRestored={() => { fetchStats() }} />
      )}

      {viewMode === 'import-export' && (
        <ImportExportView
          stats={stats}
          user={user}
          onImported={async () => {
            await fetchAll()          // refresh the stats list
            setOpenFolder('my')       // open My Stats folder
            setViewMode('graphs')     // switch to Graphs so stats are visible
          }}
        />
      )}

      {viewMode === 'settings' && (
        <StatisticsSettingsView
          weekEndingDay={weekEndingDay}
          onWeekEndingDayChange={day => setWeekEndingDay(day)}
          stats={stats}
        />
      )}

      {['print-multiple', 'comparison'].includes(viewMode) && (() => {
        const views = {
          'print-multiple': { icon: '🖨️',  title: 'Print Multiple',  desc: 'Select and print multiple statistic charts in one go.'  },
          'comparison':     { icon: '⚖️',  title: 'Comparison',      desc: 'Overlay and compare two or more statistics side by side.' },
        }
        const v = views[viewMode]
        return (
          <div className="flex-1 flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <div className="text-6xl mb-5">{v.icon}</div>
              <p className="text-xl font-bold text-gray-700 mb-2">{v.title}</p>
              <p className="text-sm text-gray-400 max-w-xs">{v.desc}</p>
              <p className="mt-4 text-xs text-gray-300 italic">Coming soon</p>
            </div>
          </div>
        )
      })()}

      {/* ── BODY (Graphs mode only) ──────────────────────────────────────── */}
      {viewMode === 'graphs' && (
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT PANEL ─────────────────────────────────────────────────── */}
        <aside className="w-64 xl:w-72 flex-shrink-0 flex flex-col bg-white border-r border-gray-200 overflow-hidden">

          {/* Folder rows */}
          <div className="px-2 py-2 border-b border-gray-100 space-y-0.5">
            <FolderRow id="public"   label="Public Stats"   count={publicStats.length} />
            <FolderRow id="shared"   label="Shared Stats"   count={sharedStats.length} />
            <FolderRow id="my"       label="My Stats"       count={myStats.length} />
          </div>

          {/* Flat stat list */}
          <div className="flex-1 overflow-y-auto">
            {folderStats.slice(0, showN).map(s => (
              <div
                key={s.id}
                draggable
                onDragStart={(e) => handleDragStart(e, s.id)}
                onDragOver={(e)  => handleDragOver(e, s.id)}
                onDrop={(e)      => handleDrop(e, s.id)}
                onDragEnd={handleDragEnd}
                onClick={() => selectStat(s.id)}
                className={`w-full text-left px-3 py-2.5 text-sm border-b border-gray-50 transition-colors cursor-pointer flex items-center gap-2 ${
                  s.id === selectedId
                    ? 'bg-green-50 text-green-800 font-medium'
                    : 'text-gray-900 hover:bg-gray-50'
                } ${s.id === dragId ? 'opacity-30' : ''} ${
                  s.id === dragOverId ? 'border-t-2 border-t-green-500' : ''
                }`}
              >
                {/* Drag handle */}
                <span
                  className="text-gray-300 hover:text-gray-500 cursor-grab flex-shrink-0 select-none text-base leading-none"
                  title="Drag to reorder"
                >⠿</span>
                <div className="flex-1 min-w-0">
                  <div className="truncate flex items-center gap-1">
                    {s.name}
                    {s.stat_category === 'equation' && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-1 py-0.5 rounded font-semibold flex-shrink-0">∑</span>
                    )}
                    {s.stat_category === 'overlay' && (
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-1 py-0.5 rounded font-semibold flex-shrink-0">⊕</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 capitalize">{s.tracking} · {s.stat_type}</div>
                </div>
              </div>
            ))}
            {folderStats.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                {search ? 'No results' : 'No statistics yet'}
              </div>
            )}
          </div>

        </aside>

        {/* ── RIGHT PANEL ────────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">

          {!selectedStat ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <div className="text-5xl mb-4">📈</div>
                <p className="text-base font-medium">Select a statistic to view its chart</p>
                <p className="text-sm mt-1">or create a new one using the + New button above</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chart header: print/share + auto min/max + nav */}
              <div className="relative flex items-center px-6 py-1.5 bg-gray-100 border-b border-gray-200 flex-shrink-0">
                {/* Left — print, share, auto min/max */}
                <div className="flex-1 flex items-center gap-2">
                  <button title="Print" onClick={handlePrint} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 text-xl">🖨️</button>
                  <button title="Share" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 text-xl">🔗</button>
                  <div className="flex gap-1 ml-1">
                    {[['autoMin', autoMin, setAutoMin, 'Auto Min'], ['autoMax', autoMax, setAutoMax, 'Auto Max']].map(([k, val, setter, lbl]) => (
                      <button
                        key={k}
                        onClick={() => setter(v => !v)}
                        className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors ${
                          val
                            ? 'border-green-600 text-green-700 bg-green-50'
                            : 'border-gray-300 text-gray-400 bg-white hover:bg-gray-50'
                        }`}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Center — absolutely centered so left/right content never shifts it */}
                <span className="absolute left-1/2 -translate-x-1/2 text-lg font-bold text-gray-800 max-w-xs truncate text-center pointer-events-none">
                  {selectedStat.name}
                </span>

                {/* Right — quick entry (hidden for equation stats) + arrows flush right */}
                <div className="flex-1 flex items-center justify-end pr-2 gap-2">
                  {!['equation','overlay'].includes(selectedStat?.stat_category) && (
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
                      <span className="w-36 flex-shrink-0 text-center px-2 text-xs text-gray-400 whitespace-nowrap border-r border-gray-200 bg-gray-50 py-1.5 select-none">
                        {quickPeriod.label}
                      </span>
                      <input
                        type="number"
                        value={quickValue}
                        onChange={e => setQuickValue(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleQuickSave()}
                        placeholder="Value"
                        className="w-20 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 bg-white"
                      />
                    </div>
                    <button
                      onClick={handleQuickSave}
                      disabled={quickSaving}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50"
                      style={{ backgroundColor: FG }}
                    >
                      {quickSaving ? '…' : 'Save'}
                    </button>
                    {quickSaveMsg && (
                      <span className={`text-xs font-semibold ${quickSaveMsg.startsWith('⚠️') ? 'text-red-500' : 'text-green-600'}`}>
                        {quickSaveMsg}
                      </span>
                    )}
                    <div className="w-px h-5 bg-gray-200 mx-0.5 flex-shrink-0" />
                  </div>
                  )}
                  <div className="flex items-center gap-0">
                    <button
                      onClick={() => goTo(-1)}
                      disabled={!hasPrev}
                      className="px-1 py-0.5 rounded text-blue-500 hover:bg-blue-50 disabled:opacity-30 text-xl font-black"
                    >
                      ⬆
                    </button>
                    <button
                      onClick={() => goTo(1)}
                      disabled={!hasNext}
                      className="px-1 py-0.5 rounded text-blue-500 hover:bg-blue-50 disabled:opacity-30 text-xl font-black"
                    >
                      ⬇
                    </button>
                  </div>
                </div>
              </div>

              {selectedStat?.stat_category !== 'target' && (
                /* Period tabs + FROM/TO — centered over chart */
                <div className="flex items-center justify-center gap-2 py-2 bg-white border-b border-gray-100 flex-shrink-0 flex-wrap">
                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                    {['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'].map(p => {
                      const pid        = p.toLowerCase()
                      const nativeIdx  = PERIOD_ORDER.indexOf(selectedStat?.tracking ?? 'daily')
                      const pidIdx     = PERIOD_ORDER.indexOf(pid)
                      const isDisabled = selectedStat && pidIdx < nativeIdx
                      const isActive   = viewPeriod === pid
                      return (
                        <button
                          key={p}
                          onClick={() => !isDisabled && setViewPeriod(pid)}
                          disabled={isDisabled}
                          title={isDisabled ? `Stat tracks ${selectedStat.tracking} — can't roll up to ${p}` : p}
                          className={`px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                            isActive ? 'text-white' : 'text-gray-600 hover:bg-gray-50'
                          }`}
                          style={isActive ? { backgroundColor: FG } : {}}
                        >
                          {p}
                        </button>
                      )
                    })}
                  </div>
                  <div className="w-24 flex-shrink-0" />
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500 font-medium">FROM</span>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={e => setFromDate(e.target.value)}
                      className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-green-600"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500 font-medium">TO</span>
                    <input
                      type="date"
                      value={toDate}
                      onChange={e => setToDate(e.target.value)}
                      className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-green-600"
                    />
                  </div>
                </div>
              )}

              {/* Chart */}
              <div ref={chartPrintRef} className="flex-1 px-4 py-4 overflow-hidden relative bg-white">

                {selectedStat.stat_category === 'overlay' ? (
                  /* ── Overlay chart ─────────────────────────────────────── */
                  valuesStatId !== selectedId ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
                    </div>
                  ) : !overlayChartData || overlayChartData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <div className="text-3xl mb-2">📊</div>
                        <p className="text-sm">No data available for this overlay.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col h-full">
                      {/* Legend */}
                      <div className="flex items-center gap-5 mb-2 px-1 flex-shrink-0">
                        {overlayValues.map(({ stat }, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <div className="w-8 h-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: OVERLAY_COLORS[i] }} />
                            <span className="text-xs font-semibold text-gray-700">{stat?.name || '—'}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={overlayChartData} margin={{ top: 10, right: 24, left: 16, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis
                              dataKey="label"
                              tick={{ fontSize: 11, fill: '#111827', fontWeight: 600, angle: -45, textAnchor: 'end', dx: -4, dy: 4 }}
                              tickLine={false}
                              axisLine={{ stroke: '#d1d5db' }}
                              height={70}
                              interval="preserveStartEnd"
                            />
                            {overlayValues.map(({ stat }, i) => (
                              <YAxis
                                key={i}
                                yAxisId={`y${i}`}
                                orientation={i === 0 ? 'left' : 'right'}
                                domain={overlayYDomains[i] ?? ['auto', 'auto']}
                                tickCount={15}
                                tick={{ fontSize: 10, fill: OVERLAY_COLORS[i], fontWeight: 700 }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={v => {
                                  if (selectedStat.stat_type === 'currency')   return '$' + Number(v).toLocaleString()
                                  if (selectedStat.stat_type === 'percentage') return v + '%'
                                  return Number(v).toLocaleString()
                                }}
                                width={72}
                              />
                            ))}
                            <Tooltip
                              content={({ active, payload, label }) => {
                                if (!active || !payload?.length) return null
                                return (
                                  <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2.5 text-xs">
                                    <p className="font-bold text-gray-500 mb-1.5">{label}</p>
                                    {overlayValues.map(({ stat }, i) => {
                                      const entry = payload.find(p => p.dataKey === `v${i}`)
                                      if (!entry || entry.value == null) return null
                                      return (
                                        <div key={i} className="flex items-center gap-2 mb-0.5">
                                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: OVERLAY_COLORS[i] }} />
                                          <span className="text-gray-600">{stat?.name}:</span>
                                          <span className="font-bold text-gray-900">{fmt(entry.value, selectedStat.stat_type)}</span>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )
                              }}
                            />
                            {overlayValues.map((_, i) => (
                              <Line
                                key={i}
                                yAxisId={`y${i}`}
                                type="linear"
                                dataKey={`v${i}`}
                                stroke={OVERLAY_COLORS[i]}
                                strokeWidth={2.5}
                                dot={false}
                                activeDot={{ r: 5, fill: OVERLAY_COLORS[i] }}
                                connectNulls={false}
                                isAnimationActive={false}
                              />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )
                ) : (
                  /* ── Normal single-stat chart ───────────────────────────── */
                  valuesStatId !== selectedId && prevDisplayRef.current.length === 0 ? (
                    // First-ever load for this stat — no previous frame to hold
                    <div className="h-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
                    </div>
                  ) : displayChartData.length === 0 ? (
                    // Fully loaded, genuinely empty
                    <div className="h-full flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <div className="text-3xl mb-2">📊</div>
                        <p className="text-sm">No data in this date range.</p>
                        <p className="text-xs mt-1">Use <strong>Edit Value History</strong> to add entries.</p>
                      </div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartDataWithTargets}
                        margin={{ top: 28, right: 24, left: 16, bottom: 20 }}
                        onClick={(chartEvent) => {
                          const pt = chartEvent?.activePayload?.[0]?.payload
                          if (pt?.date) openNoteModal(pt.date, pt.label)
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 11, fill: '#111827', fontWeight: 600, angle: -45, textAnchor: 'end', dx: -4, dy: 4 }}
                          tickLine={false}
                          axisLine={{ stroke: '#d1d5db' }}
                          height={70}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          domain={yDomain}
                          ticks={yTicks}
                          tick={{ fontSize: 11, fill: '#111827', fontWeight: 600 }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={v => {
                            if (selectedStat.stat_type === 'currency')    return '$' + Number(v).toLocaleString()
                            if (selectedStat.stat_type === 'percentage')  return v + '%'
                            return Number(v).toLocaleString()
                          }}
                          width={80}
                        />
                        <Tooltip
                          cursor={<GraphCursor stat={selectedStat} chartData={displayChartData} />}
                          content={() => null}
                        />
                        {/* Invisible line — registers data with axes & tooltip */}
                        <Line
                          type="linear"
                          dataKey="value"
                          stroke="transparent"
                          dot={(dotProps) => (
                            <NoteDot
                              key={dotProps.index}
                              {...dotProps}
                              notesByDate={new Map(statNotes.map(n => [n.period_date, n]))}
                            />
                          )}
                          activeDot={{ r: 7, fill: FG, stroke: 'white', strokeWidth: 2 }}
                          isAnimationActive={false}
                          label={false}
                        />
                        {/* Colored segments: black = up, red = down */}
                        <Customized
                          component={(props) => (
                            <ColoredLineSegments {...props} stat={selectedStat} />
                          )}
                        />
                        {/* Target line segments — thin dashed green lines */}
                        {selectedStat?.target_lines?.length > 0 && (
                          <Customized
                            component={(props) => (
                              <TargetLineSegments
                                {...props}
                                targetLines={selectedStat.target_lines}
                                displayChartData={chartDataWithTargets}
                                tracking={selectedStat.tracking}
                              />
                            )}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  )
                )}
              </div>

              {/* Date range scrubber */}
              {selectedStat?.stat_category !== 'target' && (
                <DateRangeScrubber
                  minDate={selectedStat.beginning_date}
                  maxDate={today()}
                  fromDate={fromDate}
                  toDate={toDate}
                  onFromChange={setFromDate}
                  onToChange={setToDate}
                />
              )}

              {/* Week ending not configured warning */}
              {weekEndingError && selectedStat?.tracking === 'weekly' && (
                <div className="mx-6 mb-2 mt-2 px-4 py-2.5 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between gap-3 text-sm text-amber-800">
                  <span>⚠️ <strong>Week ending day not configured.</strong> Go to <strong>Admin → Company Settings</strong> to set it before entering weekly values.</span>
                  <button onClick={() => setWeekEndingError(false)} className="text-amber-500 hover:text-amber-700 font-bold text-base leading-none flex-shrink-0">✕</button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
      )} {/* end Graphs body */}

      {/* ── MODALS ──────────────────────────────────────────────────────── */}
      {showTypeSelector && (
        <TypeSelectorModal
          onSelect={handleTypeSelect}
          onClose={() => setShowTypeSelector(false)}
        />
      )}

      {showTargetPicker && (
        <PickSourceStatModal
          stats={stats}
          onClose={() => setShowTargetPicker(false)}
          onPick={(sourceStat) => {
            setShowTargetPicker(false)
            setTargetSourceStat(sourceStat)
            setEditingData(null)
            setShowBasicForm(true)
          }}
        />
      )}

      {showBasicForm && (
        <BasicStatForm
          initialData={editingData}
          profiles={profiles}
          onSave={handleSaveForm}
          onDelete={handleDeleteStat}
          onClose={() => { setShowBasicForm(false); setEditingData(null); setTargetSourceStat(null) }}
          targetSource={targetSourceStat}
        />
      )}

      {showEquationForm && (
        <EquationStatForm
          initialData={editingData}
          profiles={profiles}
          allStats={stats}
          onSave={handleSaveForm}
          onDelete={handleDeleteStat}
          onClose={() => { setShowEquationForm(false); setEditingData(null) }}
        />
      )}

      {showOverlayForm && (
        <OverlayStatForm
          initialData={editingData}
          profiles={profiles}
          allStats={stats}
          onSave={handleSaveForm}
          onDelete={handleDeleteStat}
          onClose={() => { setShowOverlayForm(false); setEditingData(null) }}
        />
      )}

      {showSecondaryForm && (
        <SecondaryStatForm
          initialData={editingData}
          profiles={profiles}
          allStats={stats}
          onSave={handleSaveForm}
          onDelete={handleDeleteStat}
          onClose={() => { setShowSecondaryForm(false); setEditingData(null) }}
        />
      )}

      {showAutoForm && (
        <AutoStatForm
          initialData={editingData}
          profiles={profiles}
          onSave={handleSaveForm}
          onDelete={handleDeleteStat}
          onClose={() => { setShowAutoForm(false); setEditingData(null) }}
        />
      )}

      {showDateRangeSelector && selectedStat && (
        <DateRangeSelectorModal
          stat={selectedStat}
          onSelect={(from) => {
            setEditHistoryFromDate(from)
            setShowDateRangeSelector(false)
            setShowEditHistory(true)
          }}
          onClose={() => setShowDateRangeSelector(false)}
        />
      )}

      {showEditHistory && selectedStat && editHistoryFromDate && (
        <EditValueHistoryModal
          stat={selectedStat}
          fromDate={editHistoryFromDate}
          values={values}
          onClose={() => setShowEditHistory(false)}
          onRefresh={refreshValues}
          weekEndingDay={weekEndingDay}
        />
      )}

      {/* Print orientation picker */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-80 flex flex-col items-center gap-6">
            <h2 className="text-lg font-bold text-gray-900">Print Orientation</h2>
            <div className="flex gap-5">
              {/* Portrait */}
              <button
                onClick={() => executePrint('portrait')}
                className="flex flex-col items-center gap-2 px-6 py-4 rounded-xl border-2 border-gray-200 hover:border-green-600 hover:bg-green-50 transition-colors group"
              >
                <svg width="40" height="54" viewBox="0 0 40 54" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="1" y="1" width="38" height="52" rx="3" stroke="currentColor" strokeWidth="2" className="text-gray-400 group-hover:text-green-600" fill="#f9fafb"/>
                  <line x1="7" y1="14" x2="33" y2="14" stroke="currentColor" strokeWidth="2" className="text-gray-300 group-hover:text-green-400"/>
                  <line x1="7" y1="21" x2="33" y2="21" stroke="currentColor" strokeWidth="1.5" className="text-gray-300 group-hover:text-green-400"/>
                  <line x1="7" y1="28" x2="33" y2="28" stroke="currentColor" strokeWidth="1.5" className="text-gray-300 group-hover:text-green-400"/>
                  <line x1="7" y1="35" x2="22" y2="35" stroke="currentColor" strokeWidth="1.5" className="text-gray-300 group-hover:text-green-400"/>
                </svg>
                <span className="text-sm font-semibold text-gray-700 group-hover:text-green-700">Portrait</span>
              </button>

              {/* Landscape */}
              <button
                onClick={() => executePrint('landscape')}
                className="flex flex-col items-center gap-2 px-6 py-4 rounded-xl border-2 border-gray-200 hover:border-green-600 hover:bg-green-50 transition-colors group"
              >
                <svg width="54" height="40" viewBox="0 0 54 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="1" y="1" width="52" height="38" rx="3" stroke="currentColor" strokeWidth="2" className="text-gray-400 group-hover:text-green-600" fill="#f9fafb"/>
                  <line x1="9" y1="10" x2="45" y2="10" stroke="currentColor" strokeWidth="2" className="text-gray-300 group-hover:text-green-400"/>
                  <line x1="9" y1="17" x2="45" y2="17" stroke="currentColor" strokeWidth="1.5" className="text-gray-300 group-hover:text-green-400"/>
                  <line x1="9" y1="24" x2="45" y2="24" stroke="currentColor" strokeWidth="1.5" className="text-gray-300 group-hover:text-green-400"/>
                  <line x1="9" y1="31" x2="30" y2="31" stroke="currentColor" strokeWidth="1.5" className="text-gray-300 group-hover:text-green-400"/>
                </svg>
                <span className="text-sm font-semibold text-gray-700 group-hover:text-green-700">Landscape</span>
              </button>
            </div>
            <button
              onClick={() => setShowPrintModal(false)}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Note entry modal ─────────────────────────────────────────────── */}
      {noteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100" style={{ backgroundColor: '#3A5038' }}>
              <div>
                <h2 className="text-sm font-bold text-white">📝 Data Point Note</h2>
                <p className="text-xs text-green-200 mt-0.5">{noteModal.label}</p>
              </div>
              <button onClick={() => setNoteModal(null)} className="text-white/70 hover:text-white text-xl leading-none">✕</button>
            </div>
            <div className="px-5 py-4">
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                rows={4}
                placeholder="Enter your note for this data point…"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600 resize-none"
                autoFocus
              />
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button
                onClick={saveNote}
                disabled={noteSaving || !noteText.trim()}
                className="flex-1 py-2.5 bg-green-700 text-white text-sm font-semibold rounded-xl hover:bg-green-800 disabled:opacity-50 transition-colors"
              >
                {noteSaving ? 'Saving…' : 'Save Note'}
              </button>
              {statNotes.find(n => n.period_date === noteModal.date) && (
                <button
                  onClick={deleteNote}
                  disabled={noteSaving}
                  className="px-4 py-2.5 border border-red-200 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  Delete
                </button>
              )}
              <button onClick={() => setNoteModal(null)} className="px-4 py-2.5 border border-gray-200 text-gray-500 text-sm rounded-xl hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Notes list modal ─────────────────────────────────────────────── */}
      {showNotesModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0" style={{ backgroundColor: '#3A5038' }}>
              <div>
                <h2 className="text-base font-bold text-white">📝 Notes — {selectedStat?.name}</h2>
                <p className="text-xs text-green-200 mt-0.5">{statNotes.length} note{statNotes.length !== 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => setShowNotesModal(false)} className="text-white/70 hover:text-white text-xl leading-none">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {statNotes.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <p className="text-3xl mb-2">📝</p>
                  <p className="text-sm font-medium text-gray-500">No notes yet</p>
                  <p className="text-xs mt-1">Click any data point on the graph to add a note.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {statNotes.map(n => (
                    <div key={n.id} className="border border-gray-200 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-1">
                            {periodLabel(n.period_date, selectedStat?.tracking)}
                          </p>
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">{n.note}</p>
                        </div>
                        <button
                          onClick={() => { openNoteModal(n.period_date, periodLabel(n.period_date, selectedStat?.tracking)); setShowNotesModal(false) }}
                          className="text-xs text-blue-600 hover:text-blue-800 underline flex-shrink-0 mt-0.5"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <button onClick={() => setShowNotesModal(false)} className="w-full py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
