// ─────────────────────────────────────────────────────────────────────────────
// GpmdBar — shared summary bar
//
// Two modes:
//   PROJECT mode  — pass onGpmdSave={fn}  → GPMD cell is editable
//                   GP is computed as manDays × gpmd (prop)
//
//   ESTIMATE mode — omit onGpmdSave, pass directGp={number}
//                   GP = directGp (sum of all project GPs)
//                   GPMD displayed = directGp / manDays (derived, read-only)
//
// Sub GP:
//   subGp = subCost × subMarkupRate (default 20%)
//   onSubMarkupSave — if provided, the Sub % cell is editable
//
// Commission:
//   effectiveComm = (effectiveGp + subGp) × 12%  ← includes sub GP in base
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react'

const fmt = v => `$${Math.round(v || 0).toLocaleString()}`
const fmt2 = v =>
  `$${(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fnum = v =>
  (v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function GpmdBar({
  totalMat = 0,
  totalHrs = 0,
  manDays = 0,
  laborCost = 0,
  laborRatePerHour = 35,
  burden = 0,
  gpmd = 425, // PROJECT mode: GP = manDays × gpmd
  directGp = null, // ESTIMATE mode: actual GP total; GPMD is derived
  subCost = 0,
  onGpmdSave = null, // if provided → PROJECT mode (editable GPMD)
  subMarkupRate = 0.2, // Sub GP = subCost × subMarkupRate
  onSubMarkupSave = null, // if provided → Sub % cell is editable
  sticky = false, // when true: renders with sticky positioning (handled by parent wrapper)
  // 'full' (default) shows every column — used by the project + estimate
  //   aggregate bars, which combine In-House and Subcontractor totals.
  // 'inhouse' hides Sub Cost + Sub GP (module In-House tab).
  // 'sub' hides Labor Hours, Man Days, GPMD, Crew Labor, Labor Burden (module Sub tab).
  variant = 'full',
}) {
  const isSubView = variant === 'sub'
  const isInhouseView = variant === 'inhouse'
  const [editingGpmd, setEditingGpmd] = useState(false)
  const [draftGpmd, setDraftGpmd] = useState('')
  const [editingSubPct, setEditingSubPct] = useState(false)
  const [draftSubPct, setDraftSubPct] = useState('')
  // On phones the bar collapses to just GPMD / Gross Profit / Total Price; the
  // rest reveal via the More toggle (and wrap onto extra rows). Desktop (lg)
  // always shows everything.
  const [expanded, setExpanded] = useState(false)

  // Previously: `if (price <= 0) return null` — but the module-level
  // sticky wrapper has its own padding, so returning null left a thin
  // empty dark strip on initial load before any quantities were entered.
  // Now we always render with $0 placeholders so the bar's layout is
  // stable from the moment the module opens.

  // ── Core calculations ──────────────────────────────────────────────────────
  const effectiveGp = directGp != null ? directGp : manDays * gpmd
  const displayGpmd = directGp != null ? (manDays > 0 ? Math.round(directGp / manDays) : 0) : gpmd
  const subGp = (subCost || 0) * (subMarkupRate || 0)
  const displaySubPct = Math.round((subMarkupRate || 0) * 100)
  // Commission + Total Price are variant-specific so each module tab shows only
  // ITS side's total: In-House = labour+burden+materials+GP; Sub = subCost+SubGP.
  // 'full' (project/estimate) combines everything.
  const commBase = isSubView ? subGp : isInhouseView ? effectiveGp : effectiveGp + subGp
  const effectiveComm = commBase * 0.12
  const effectivePrice = isSubView
    ? (subCost || 0) + subGp + effectiveComm
    : isInhouseView
      ? laborCost + burden + totalMat + effectiveGp + effectiveComm
      : laborCost + burden + totalMat + (subCost || 0) + effectiveGp + subGp + effectiveComm

  // ── GPMD edit handlers ─────────────────────────────────────────────────────
  function startGpmdEdit() {
    if (!onGpmdSave) return
    setDraftGpmd(String(gpmd))
    setEditingGpmd(true)
  }
  function commitGpmdEdit() {
    const val = parseFloat(draftGpmd)
    if (!isNaN(val) && val > 0) onGpmdSave(val)
    setEditingGpmd(false)
  }

  // ── Sub % edit handlers ────────────────────────────────────────────────────
  function startSubEdit() {
    if (!onSubMarkupSave) return
    setDraftSubPct(String(displaySubPct))
    setEditingSubPct(true)
  }
  function commitSubEdit() {
    const val = parseFloat(draftSubPct)
    if (!isNaN(val) && val >= 0) onSubMarkupSave(val / 100)
    setEditingSubPct(false)
  }

  // ── GPMD cell ──────────────────────────────────────────────────────────────
  function GpmdCell() {
    if (onGpmdSave && editingGpmd) {
      return (
        <div className="rounded-lg bg-amber-500/20 border border-amber-400/50 px-3 py-1 text-center min-w-[68px]">
          <p className="text-xs mb-0.5 whitespace-nowrap text-amber-300">GPMD</p>
          <input
            autoFocus
            value={draftGpmd}
            onChange={e => setDraftGpmd(e.target.value)}
            onBlur={commitGpmdEdit}
            onKeyDown={e => {
              if (e.key === 'Enter') commitGpmdEdit()
              if (e.key === 'Escape') setEditingGpmd(false)
            }}
            className="w-16 bg-gray-800 border border-amber-400 rounded text-amber-200 text-sm font-bold text-center tabular-nums outline-none px-1"
          />
        </div>
      )
    }
    return (
      <div
        className={`rounded-lg bg-amber-500/20 border border-amber-400/30 px-3 py-1 text-center min-w-[68px] ${onGpmdSave ? 'cursor-pointer hover:bg-amber-500/30 transition-colors' : ''}`}
        onClick={startGpmdEdit}
        title={onGpmdSave ? 'Click to edit GPMD' : undefined}
      >
        <p className="text-xs mb-0.5 whitespace-nowrap text-amber-300">
          GPMD{onGpmdSave && <span className="text-amber-500 text-[10px] ml-1">✎</span>}
        </p>
        <p className="font-bold tabular-nums text-sm text-amber-200">
          ${displayGpmd.toLocaleString()}
        </p>
      </div>
    )
  }

  // ── Sub % cell ─────────────────────────────────────────────────────────────
  const cols = [
    { label: 'Labor Hours', value: fnum(totalHrs), dim: 'hrs' },
    { label: 'Man Days', value: fnum(manDays), dim: 'MD' },
    { label: 'Materials', value: fmt2(totalMat), dim: null },
    {
      label: 'Crew Labor',
      value: fmt(laborCost),
      dim: `@ $${parseFloat(laborRatePerHour).toFixed(0)}/hr`,
    },
    { label: 'Labor Burden', value: fmt(burden), dim: '29%' },
    { label: 'Sub Cost', value: subCost > 0 ? fmt(subCost) : '—', dim: null },
    { label: 'Commission', value: fmt(effectiveComm), dim: '12%' },
    { label: 'Gross Profit', value: fmt(effectiveGp), dim: null, green: true },
    { label: 'Total Price', value: fmt(effectivePrice), dim: null, blue: true, big: true },
  ]

  // ── Sub GP box — styled like the GPMD box (amber), rate inline-editable ────
  function SubGpCol() {
    return (
      <div className={`px-1 shrink-0 self-center ${expanded ? '' : 'hidden lg:block'}`}>
        <div className="rounded-lg bg-amber-500/20 border border-amber-400/30 px-3 py-1 text-center min-w-[68px]">
          <p className="text-xs mb-0.5 whitespace-nowrap text-amber-300">Sub GP</p>
          <p className="font-bold tabular-nums text-sm text-amber-200">
            {subGp > 0 ? fmt(subGp) : '—'}
          </p>
          {/* Editable rate shown below the value */}
          {editingSubPct ? (
            <div className="flex items-center justify-center gap-0.5 mt-0.5">
              <input
                autoFocus
                value={draftSubPct}
                onChange={e => setDraftSubPct(e.target.value)}
                onBlur={commitSubEdit}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitSubEdit()
                  if (e.key === 'Escape') setEditingSubPct(false)
                }}
                className="w-8 bg-gray-800 border border-amber-400 rounded text-amber-200 text-xs font-bold text-center tabular-nums outline-none px-0.5"
              />
              <span className="text-amber-300 text-xs font-bold">%</span>
            </div>
          ) : (
            <p
              className={`text-xs text-amber-400/70 whitespace-nowrap mt-0.5 ${onSubMarkupSave ? 'cursor-pointer hover:text-amber-300 transition-colors' : ''}`}
              onClick={onSubMarkupSave ? startSubEdit : undefined}
              title={onSubMarkupSave ? 'Click to edit Sub GP markup rate' : undefined}
            >
              {displaySubPct}%{onSubMarkupSave && <span className="ml-1 text-amber-500">✎</span>}
            </p>
          )}
        </div>
      </div>
    )
  }

  const containerCls = sticky
    ? 'bg-gray-900 text-white py-1 px-2'
    : 'bg-gray-900 text-white rounded-xl p-3 mt-2'

  return (
    <div className={containerCls}>
      <div className="flex gap-0 divide-x divide-white/10 flex-wrap">
        {/* Data columns — filtered by variant. In-house drops Sub Cost;
            Sub view drops the labour/man-day/GPMD columns.
            The Sub GP + GPMD boxes are inserted just before Commission so the
            order reads: … Sub GP, GPMD, Commission, Gross Profit, Total Price. */}
        {cols
          .filter(col => {
            if (isSubView)
              return ![
                'Labor Hours',
                'Man Days',
                'Crew Labor',
                'Labor Burden',
                'Materials',
                'Gross Profit',
              ].includes(col.label)
            if (isInhouseView) return col.label !== 'Sub Cost'
            return true // full: show everything
          })
          .map(col => {
          // Sub GP + GPMD boxes are inserted immediately before the Commission
          // column, so both sit to the left of Gross Profit.
          const insertBoxes = col.label === 'Commission'
          // Always visible (even collapsed on mobile): Gross Profit + Total Price.
          const essential = col.label === 'Gross Profit' || col.label === 'Total Price'
          const hideCls = essential || expanded ? '' : 'hidden lg:block'
          // Use a keyed Fragment so React stops warning about missing keys
          // on this iterator (shorthand <> can't accept a key prop).
          return (
            <React.Fragment key={col.label}>
              {insertBoxes && !isInhouseView && <SubGpCol />}
              {insertBoxes && !isSubView && (
                <div className="px-1 shrink-0 self-center">
                  <GpmdCell />
                </div>
              )}
              <div className={`px-1.5 flex-1 min-w-0 text-center ${hideCls}`}>
                <p className="text-[10px] text-gray-400 truncate mb-0.5">{col.label}</p>
                <p
                  className={`font-bold tabular-nums truncate ${
                    col.big
                      ? 'text-base text-blue-400'
                      : col.green
                        ? 'text-sm text-green-400'
                        : 'text-sm text-white'
                  }`}
                >
                  {col.value}
                </p>
                {col.dim && <p className="text-[10px] text-gray-500 truncate">{col.dim}</p>}
              </div>
            </React.Fragment>
          )
        })}

        {/* Mobile-only expand/collapse toggle */}
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="lg:hidden shrink-0 self-center ml-1 px-2 py-1 text-[10px] font-semibold text-gray-200 hover:text-white rounded-md border border-white/25"
        >
          {expanded ? 'Less ▴' : 'More ▾'}
        </button>
      </div>
    </div>
  )
}
