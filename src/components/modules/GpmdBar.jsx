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
import { useState } from 'react'

const fmt  = v => `$${Math.round(v || 0).toLocaleString()}`
const fmt2 = v => `$${(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fnum = v => (v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function GpmdBar({
  totalMat         = 0,
  totalHrs         = 0,
  manDays          = 0,
  laborCost        = 0,
  laborRatePerHour = 35,
  burden           = 0,
  gpmd             = 425,   // PROJECT mode: GP = manDays × gpmd
  directGp         = null,  // ESTIMATE mode: actual GP total; GPMD is derived
  subCost          = 0,
  price            = 0,
  onGpmdSave       = null,  // if provided → PROJECT mode (editable GPMD)
  subMarkupRate    = 0.20,  // Sub GP = subCost × subMarkupRate
  onSubMarkupSave  = null,  // if provided → Sub % cell is editable
}) {
  const [editingGpmd,    setEditingGpmd]    = useState(false)
  const [draftGpmd,      setDraftGpmd]      = useState('')
  const [editingSubPct,  setEditingSubPct]  = useState(false)
  const [draftSubPct,    setDraftSubPct]    = useState('')

  if (price <= 0) return null

  // ── Core calculations ──────────────────────────────────────────────────────
  const effectiveGp    = directGp != null ? directGp : manDays * gpmd
  const displayGpmd    = directGp != null
    ? (manDays > 0 ? Math.round(directGp / manDays) : 0)
    : gpmd
  const subGp          = (subCost || 0) * (subMarkupRate || 0)
  const displaySubPct  = Math.round((subMarkupRate || 0) * 100)
  const effectiveComm  = (effectiveGp + subGp) * 0.12
  const effectivePrice = laborCost + burden + totalMat + (subCost || 0) + effectiveGp + subGp + effectiveComm

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
        <div className="rounded-lg bg-amber-500/20 border border-amber-400/50 px-3 py-1 text-center min-w-[90px]">
          <p className="text-xs mb-0.5 whitespace-nowrap text-amber-300">GPMD</p>
          <input
            autoFocus
            value={draftGpmd}
            onChange={e => setDraftGpmd(e.target.value)}
            onBlur={commitGpmdEdit}
            onKeyDown={e => { if (e.key === 'Enter') commitGpmdEdit(); if (e.key === 'Escape') setEditingGpmd(false) }}
            className="w-16 bg-gray-800 border border-amber-400 rounded text-amber-200 text-sm font-bold text-center tabular-nums outline-none px-1"
          />
        </div>
      )
    }
    return (
      <div
        className={`rounded-lg bg-amber-500/20 border border-amber-400/30 px-3 py-1 text-center min-w-[90px] ${onGpmdSave ? 'cursor-pointer hover:bg-amber-500/30 transition-colors' : ''}`}
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
  function SubMarkupCell() {
    if (onSubMarkupSave && editingSubPct) {
      return (
        <div className="rounded-lg bg-blue-500/20 border border-blue-400/50 px-3 py-1 text-center min-w-[72px]">
          <p className="text-xs mb-0.5 whitespace-nowrap text-blue-300">Sub %</p>
          <div className="flex items-center justify-center gap-0.5">
            <input
              autoFocus
              value={draftSubPct}
              onChange={e => setDraftSubPct(e.target.value)}
              onBlur={commitSubEdit}
              onKeyDown={e => { if (e.key === 'Enter') commitSubEdit(); if (e.key === 'Escape') setEditingSubPct(false) }}
              className="w-10 bg-gray-800 border border-blue-400 rounded text-blue-200 text-sm font-bold text-center tabular-nums outline-none px-1"
            />
            <span className="text-blue-300 text-sm font-bold">%</span>
          </div>
        </div>
      )
    }
    return (
      <div
        className={`rounded-lg bg-blue-500/20 border border-blue-400/30 px-3 py-1 text-center min-w-[72px] ${onSubMarkupSave ? 'cursor-pointer hover:bg-blue-500/30 transition-colors' : ''}`}
        onClick={startSubEdit}
        title={onSubMarkupSave ? 'Click to edit Sub GP markup rate' : undefined}
      >
        <p className="text-xs mb-0.5 whitespace-nowrap text-blue-300">
          Sub %{onSubMarkupSave && <span className="text-blue-500 text-[10px] ml-1">✎</span>}
        </p>
        <p className="font-bold tabular-nums text-sm text-blue-200">
          {displaySubPct}%
        </p>
      </div>
    )
  }

  const cols = [
    { label: 'Labor Hours',  value: fnum(totalHrs),                    dim: 'hrs'                                         },
    { label: 'Man Days',     value: fnum(manDays),                     dim: 'MD'                                          },
    { label: 'Materials',    value: fmt2(totalMat),                    dim: null                                          },
    { label: 'Crew Labor',   value: fmt(laborCost),                    dim: `@ $${parseFloat(laborRatePerHour).toFixed(0)}/hr` },
    { label: 'Labor Burden', value: fmt(burden),                       dim: '29%'                                         },
    { label: 'Sub Cost',     value: subCost > 0 ? fmt(subCost) : '—', dim: null                                          },
    { label: 'Gross Profit', value: fmt(effectiveGp),                  dim: null,  green: true                           },
    { label: 'Commission',   value: fmt(effectiveComm),                dim: '12%'                                         },
    { label: 'Total Price',  value: fmt(effectivePrice),               dim: null,  green: true, big: true                },
  ]

  // ── Sub GP column — rendered separately so the rate is inline-editable ─────
  function SubGpCol() {
    return (
      <div className="px-3 flex-1 min-w-[80px] text-center">
        <p className="text-xs text-gray-400 whitespace-nowrap mb-0.5">Sub GP</p>
        <p className="font-bold whitespace-nowrap tabular-nums text-sm text-blue-400">
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
              onKeyDown={e => { if (e.key === 'Enter') commitSubEdit(); if (e.key === 'Escape') setEditingSubPct(false) }}
              className="w-8 bg-gray-800 border border-blue-400 rounded text-blue-200 text-xs font-bold text-center tabular-nums outline-none px-0.5"
            />
            <span className="text-blue-300 text-xs font-bold">%</span>
          </div>
        ) : (
          <p
            className={`text-xs text-gray-500 whitespace-nowrap mt-0.5 ${onSubMarkupSave ? 'cursor-pointer hover:text-blue-400 transition-colors' : ''}`}
            onClick={onSubMarkupSave ? startSubEdit : undefined}
            title={onSubMarkupSave ? 'Click to edit Sub GP markup rate' : undefined}
          >
            {displaySubPct}%{onSubMarkupSave && <span className="ml-1 text-gray-600">✎</span>}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="bg-gray-900 text-white rounded-xl p-4 mt-2">
      <div className="overflow-x-auto">
        <div className="flex gap-0 min-w-max divide-x divide-white/10">

          {/* Left: GPMD editable cell */}
          <div className="pr-3">
            <GpmdCell />
          </div>

          {/* Data columns */}
          {cols.map((col, i) => {
            const isAfterSubCost = col.label === 'Gross Profit'
            return (
              <>
                {/* Inject Sub GP column right after Sub Cost */}
                {isAfterSubCost && (
                  <SubGpCol key="sub-gp" />
                )}
                <div
                  key={col.label}
                  className={`px-3 flex-1 min-w-[80px] text-center ${i === cols.length - 1 ? 'pl-4' : ''}`}
                >
                  <p className="text-xs text-gray-400 whitespace-nowrap mb-0.5">{col.label}</p>
                  <p className={`font-bold whitespace-nowrap tabular-nums ${
                    col.big   ? 'text-lg text-green-400' :
                    col.green ? 'text-sm text-green-400' :
                                'text-sm text-white'
                  }`}>
                    {col.value}
                  </p>
                  {col.dim && <p className="text-xs text-gray-500 whitespace-nowrap">{col.dim}</p>}
                </div>
              </>
            )
          })}

        </div>
      </div>
    </div>
  )
}
