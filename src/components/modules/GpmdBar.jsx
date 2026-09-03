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
  directSubGp = null, // full aggregate bars: summed module Sub GP
  directCommission = null, // full aggregate bars: summed module commission
  directPrice = null, // full aggregate bars: summed module total_price (authoritative)
  subCost = 0,
  onGpmdSave = null, // if provided → PROJECT mode (editable GPMD)
  subMarkupRate = 0.2, // Sub GP = subCost × subMarkupRate
  onSubMarkupSave = null, // if provided → Sub % cell is editable
  // Materials group (full layout only). Mirrors the Sub markup, but defaults to
  // 0% — no markup is a real, deliberate state here (materials sold at cost),
  // not a missing rate, so it displays as 0% and $0 rather than a dash.
  materialMarkupRate = 0, // Material GP = totalMat × materialMarkupRate
  onMaterialMarkupSave = null, // if provided → Material % cell is editable
  directMaterialGp = null, // aggregate bars: summed module material GP
  sticky = false, // when true: renders with sticky positioning (handled by parent wrapper)
  // 'full' (default) shows every column — used by the project + estimate
  //   aggregate bars, which combine In-House and Subcontractor totals.
  // 'inhouse' hides Sub Cost + Sub GP (module In-House tab).
  // 'sub' shows the subcontractor side only (module Sub tab) — no labour columns.
  variant = 'full',
  // Group headings for the full (Project/Estimate) layout.
  inHouseLabel = 'In House Labor',
  subLabel = 'Subcontractor',
  materialsLabel = 'Materials',
  totalsLabel = 'Totals',
}) {
  const isSubView = variant === 'sub'
  const isInhouseView = variant === 'inhouse'
  const [editingGpmd, setEditingGpmd] = useState(false)
  const [draftGpmd, setDraftGpmd] = useState('')
  const [editingSubPct, setEditingSubPct] = useState(false)
  const [draftSubPct, setDraftSubPct] = useState('')
  const [editingMatPct, setEditingMatPct] = useState(false)
  const [draftMatPct, setDraftMatPct] = useState('')

  // Previously: `if (price <= 0) return null` — but the module-level
  // sticky wrapper has its own padding, so returning null left a thin
  // empty dark strip on initial load before any quantities were entered.
  // Now we always render with $0 placeholders so the bar's layout is
  // stable from the moment the module opens.

  // ── Core calculations ──────────────────────────────────────────────────────
  const effectiveGp = directGp != null ? directGp : manDays * gpmd
  const displayGpmd = directGp != null ? (manDays > 0 ? Math.round(directGp / manDays) : 0) : gpmd
  // Aggregate bars pass directSubGp / directCommission / directPrice = the summed
  // module values, so the project/estimate totals equal the sum of the modules
  // exactly (module GP/markup conventions vary and can't be re-derived here).
  const subGp = directSubGp != null ? directSubGp : (subCost || 0) * (subMarkupRate || 0)
  // When the Markup box is editable, show the markup SETTING being edited so the
  // value "sticks" after a change. Read-only aggregate bars show the effective
  // blended rate derived from the summed Sub GP. Shown to one decimal place.
  const pct1 = x => Math.round((x || 0) * 1000) / 10
  const displaySubPct = onSubMarkupSave
    ? pct1(subMarkupRate)
    : directSubGp != null && (subCost || 0) > 0
      ? pct1(directSubGp / subCost)
      : pct1(subMarkupRate)
  // Materials mirror the Sub group, with one difference: there is no default
  // rate. Both stay null when nothing is set, and the cells render "—".
  const materialGp =
    directMaterialGp != null ? directMaterialGp : (totalMat || 0) * (materialMarkupRate || 0)
  const displayMatPct = onMaterialMarkupSave
    ? pct1(materialMarkupRate || 0)
    : directMaterialGp != null && (totalMat || 0) > 0
      ? pct1(directMaterialGp / totalMat)
      : pct1(materialMarkupRate || 0)
  // Commission + Total Price are variant-specific so each module tab shows only
  // ITS side's total: In-House = labour+burden+materials+GP; Sub = subCost+SubGP.
  // 'full' (project/estimate) combines everything.
  const commBase = isSubView ? subGp : isInhouseView ? effectiveGp : effectiveGp + subGp
  // Commission is passed in by every module (sourced from company_settings);
  // no hardcoded rate here — absent value contributes 0.
  const effectiveComm = directCommission != null ? directCommission : 0
  const effectivePrice = directPrice != null
    ? directPrice
    : isSubView
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

  // ── Material % edit handlers ──────────────────────────────────────────────
  function startMatEdit() {
    if (!onMaterialMarkupSave) return
    setDraftMatPct(String(displayMatPct))
    setEditingMatPct(true)
  }
  function commitMatEdit() {
    const val = parseFloat(draftMatPct)
    if (!isNaN(val) && val >= 0) onMaterialMarkupSave(val / 100)
    setEditingMatPct(false)
  }

  // ── GLPMD cell ─────────────────────────────────────────────────────────────
  // Gross Labor Profit per Man Day. Light yellow: the blue it used to wear now
  // belongs to Total Price, and yellow keeps it distinct from the orange markup
  // boxes and the green profit figures either side of it.
  function GpmdCell() {
    if (onGpmdSave && editingGpmd) {
      return (
        <div className="rounded-lg bg-yellow-400/20 border border-yellow-300/50 px-3 py-1 text-center min-w-[68px]">
          <p className="text-xs mb-0.5 whitespace-nowrap text-yellow-200">GLPMD</p>
          <input
            autoFocus
            value={draftGpmd}
            onChange={e => setDraftGpmd(e.target.value)}
            onBlur={commitGpmdEdit}
            onKeyDown={e => {
              if (e.key === 'Enter') commitGpmdEdit()
              if (e.key === 'Escape') setEditingGpmd(false)
            }}
            className="w-16 bg-gray-800 border border-yellow-300 rounded text-yellow-100 text-sm font-bold text-center tabular-nums outline-none px-1"
          />
        </div>
      )
    }
    return (
      <div
        className={`rounded-lg bg-yellow-400/20 border border-yellow-300/30 px-3 py-1 text-center min-w-[68px] ${onGpmdSave ? 'cursor-pointer hover:bg-yellow-400/30 transition-colors' : ''}`}
        onClick={startGpmdEdit}
        title={onGpmdSave ? 'Click to edit GLPMD' : undefined}
      >
        <p className="text-xs mb-0.5 whitespace-nowrap text-yellow-200">
          GLPMD
          <span className={`text-yellow-400 text-[10px] ml-1 ${onGpmdSave ? '' : 'invisible'}`}>✎</span>
        </p>
        <p className="font-bold tabular-nums text-sm text-yellow-100">
          ${displayGpmd.toLocaleString()}
        </p>
      </div>
    )
  }



  const containerCls = sticky
    ? 'bg-gray-900 text-white py-1 px-2'
    : 'bg-gray-900 text-white rounded-xl p-3 mt-2'

  // ── Plain value cell used by the grouped (full) layout ─────────────────────
  function Cell({ label, value, dim, color = 'text-white', big = false, cls = 'flex-1 min-w-0' }) {
    return (
      <div className={`px-1 min-w-0 text-center self-center ${cls}`}>
        <p className="text-[10px] text-gray-400 leading-tight mb-0.5">
          {label}
          {dim && <span className="ml-1 text-gray-500">{dim}</span>}
        </p>
        <p className={`font-bold tabular-nums truncate ${big ? 'text-base' : 'text-sm'} ${color}`}>
          {value}
        </p>
      </div>
    )
  }

  // ── Markup box — editable Sub GP % (orange, styled like the GPMD box) ──────
  function MarkupBox() {
    if (onSubMarkupSave && editingSubPct) {
      return (
        <div className="rounded-lg bg-orange-500/20 border border-orange-400/50 px-3 py-1 text-center min-w-[64px]">
          <p className="text-xs mb-0.5 whitespace-nowrap text-orange-300">Markup</p>
          <div className="flex items-center justify-center gap-0.5">
            <input
              autoFocus
              value={draftSubPct}
              onChange={e => setDraftSubPct(e.target.value)}
              onBlur={commitSubEdit}
              onKeyDown={e => {
                if (e.key === 'Enter') commitSubEdit()
                if (e.key === 'Escape') setEditingSubPct(false)
              }}
              className="w-10 bg-gray-800 border border-orange-400 rounded text-orange-200 text-sm font-bold text-center tabular-nums outline-none px-1"
            />
            <span className="text-orange-300 text-sm font-bold">%</span>
          </div>
        </div>
      )
    }
    return (
      <div
        className={`rounded-lg bg-orange-500/20 border border-orange-400/30 px-3 py-1 text-center min-w-[64px] ${onSubMarkupSave ? 'cursor-pointer hover:bg-orange-500/30 transition-colors' : ''}`}
        onClick={onSubMarkupSave ? startSubEdit : undefined}
        title={onSubMarkupSave ? 'Click to edit Sub GP markup %' : undefined}
      >
        <p className="text-xs mb-0.5 whitespace-nowrap text-orange-300">
          Markup
          <span className={`text-orange-500 text-[10px] ml-1 ${onSubMarkupSave ? '' : 'invisible'}`}>✎</span>
        </p>
        <p className="font-bold tabular-nums text-sm text-orange-200">{displaySubPct}%</p>
      </div>
    )
  }

  // ── Material markup box — orange, mirrors MarkupBox. Renders "—" when the
  //    rate is unset so an unpriced materials line reads as missing, not 0%.
  function MaterialMarkupBox() {
    if (onMaterialMarkupSave && editingMatPct) {
      return (
        <div className="rounded-lg bg-orange-500/20 border border-orange-400/50 px-2 py-1 text-center min-w-[56px]">
          <p className="text-xs mb-0.5 whitespace-nowrap text-orange-300">Markup</p>
          <div className="flex items-center justify-center gap-0.5">
            <input
              autoFocus
              value={draftMatPct}
              onChange={e => setDraftMatPct(e.target.value)}
              onBlur={commitMatEdit}
              onKeyDown={e => {
                if (e.key === 'Enter') commitMatEdit()
                if (e.key === 'Escape') setEditingMatPct(false)
              }}
              className="w-10 bg-gray-800 border border-orange-400 rounded text-orange-200 text-sm font-bold text-center tabular-nums outline-none px-1"
            />
            <span className="text-orange-300 text-sm font-bold">%</span>
          </div>
        </div>
      )
    }
    return (
      <div
        className={`rounded-lg bg-orange-500/20 border border-orange-400/30 px-2 py-1 text-center min-w-[56px] ${onMaterialMarkupSave ? 'cursor-pointer hover:bg-orange-500/30 transition-colors' : ''}`}
        onClick={onMaterialMarkupSave ? startMatEdit : undefined}
        title={onMaterialMarkupSave ? 'Click to edit material markup %' : undefined}
      >
        <p className="text-xs mb-0.5 whitespace-nowrap text-orange-300">
          Markup
          <span className={`text-orange-500 text-[10px] ml-1 ${onMaterialMarkupSave ? '' : 'invisible'}`}>✎</span>
        </p>
        <p className="font-bold tabular-nums text-sm text-orange-200">{displayMatPct}%</p>
      </div>
    )
  }

  // ── Total price box — green, same treatment as the GLPMD and Markup boxes.
  //    Read-only: the price is the sum of everything left of it, never typed.
  function TotalPriceBox() {
    return (
      <div className="rounded-lg bg-green-500/20 border border-green-400/30 px-3 py-1 text-center min-w-[76px]">
        <p className="text-xs mb-0.5 whitespace-nowrap text-green-300">TOTAL PRICE</p>
        <p className="font-bold tabular-nums text-base text-green-200">{fmt(effectivePrice)}</p>
      </div>
    )
  }

  // ── Grouped layout — Project & Estimate (full) bars ────────────────────────
  // Four groups, left to right:
  //   In House Labor (blue)   labour hours/man-days/crew cost/burden + GPMD + GP
  //   Subcontractor (orange)  sub cost · markup · GP
  //   Materials (orange)      material cost · markup · GP   ← mirrors Sub
  //   Totals (green)          commission · total GP · total price
  // Materials moved out of the In-House group so labour profit and material
  // profit are tracked as separate verticals rather than one blended number.
  if (variant === 'full') {
    return (
      <div className="mt-2 overflow-x-auto">
        <div className="flex flex-col lg:flex-row gap-2 items-stretch">
          {/* In House Labor group — 6 columns (grows proportionally) */}
          <div className="min-w-0 flex flex-col lg:flex-[6_1_0%]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700 mb-1 px-1 text-center truncate">
              {inHouseLabel}
            </p>
            <div className="flex-1 flex items-stretch gap-0 divide-x divide-white/10 rounded-lg border border-blue-400/70 bg-gray-900 py-1.5 px-1">
              <Cell label="Labor Hours" value={fnum(totalHrs)} />
              <Cell label="Man Days" value={fnum(manDays)} />
              <Cell
                label="Labor Cost"
                value={fmt(laborCost)}
                dim={`@ $${parseFloat(laborRatePerHour).toFixed(0)}/hr`}
              />
              <Cell label="Labor Burden" value={fmt(burden)} dim="29%" />
              <div className="flex-1 min-w-0 self-center flex justify-center">
                <GpmdCell />
              </div>
              <Cell label="Gross Profit" value={fmt(effectiveGp)} color="text-green-400" />
            </div>
          </div>

          {/* Subcontractor group — 3 columns */}
          <div className="min-w-0 flex flex-col lg:flex-[3_1_0%]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600 mb-1 px-1 text-center truncate">
              {subLabel}
            </p>
            <div className="flex-1 flex items-stretch gap-0 divide-x divide-white/10 rounded-lg border border-orange-400/70 bg-gray-900 py-1.5 px-1">
              <Cell label="Sub Cost" value={subCost > 0 ? fmt(subCost) : '—'} />
              <div className="flex-1 min-w-0 self-center flex justify-center">
                <MarkupBox />
              </div>
              <Cell label="Gross Profit" value={fmt(subGp)} color="text-green-400" />
            </div>
          </div>

          {/* Materials group — 3 columns, mirrors Subcontractor */}
          <div className="min-w-0 flex flex-col lg:flex-[3_1_0%]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600 mb-1 px-1 text-center truncate">
              {materialsLabel}
            </p>
            <div className="flex-1 flex items-stretch gap-0 divide-x divide-white/10 rounded-lg border border-orange-400/70 bg-gray-900 py-1.5 px-1">
              <Cell label="Materials" value={fmt2(totalMat)} />
              <div className="flex-1 min-w-0 self-center flex justify-center">
                <MaterialMarkupBox />
              </div>
              <Cell label="Gross Profit" value={fmt(materialGp)} color="text-green-400" />
            </div>
          </div>

          {/* Totals group — 3 columns */}
          <div className="min-w-0 flex flex-col lg:flex-[3_1_0%]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-green-700 mb-1 px-1 text-center truncate">
              {totalsLabel}
            </p>
            <div className="flex-1 flex items-stretch gap-0 divide-x divide-white/10 rounded-lg border border-green-400/70 bg-gray-900 py-1.5 px-1">
              <Cell label="Commission" value={fmt(effectiveComm)} dim="12%" />
              <Cell label="Total Gross Profit" value={fmt(effectiveGp + subGp)} />
              <div className="flex-1 min-w-0 self-center flex justify-center">
              <TotalPriceBox />
            </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Module tabs — two unlabelled bars, same shape as the estimate bar ──────
  // Sub tab:      [ sub cost · markup · gross profit ] [ commission · total ]
  // In-House tab: [ hours · days · labor · burden · GLPMD · GP ] [ materials ·
  //               GP · total ]
  // No group headings here: the tab the user is already on says which side of
  // the job this is, so a label would only repeat it.
  const barCls =
    'min-w-0 flex items-stretch gap-0 divide-x divide-white/10 rounded-lg bg-gray-900 py-1.5 px-1'

  if (isSubView) {
    return (
      <div className={containerCls}>
        <div className="flex flex-col lg:flex-row gap-2 items-stretch">
          <div className={`${barCls} lg:flex-[6_1_0%] border border-orange-400/70`}>
            <Cell label="Sub Cost" value={subCost > 0 ? fmt(subCost) : '—'} />
            <div className="flex-1 min-w-0 self-center flex justify-center">
              <MarkupBox />
            </div>
            <Cell label="Gross Profit" value={fmt(subGp)} color="text-green-400" />
          </div>
          <div className={`${barCls} lg:flex-[3_1_0%] border border-green-400/70`}>
            <div className="flex-1 min-w-0 self-center flex justify-center">
              <TotalPriceBox />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={containerCls}>
      <div className="flex flex-col lg:flex-row gap-2 items-stretch">
        <div className={`${barCls} lg:flex-[6_1_0%] border border-blue-400/70`}>
          <Cell label="Labor Hours" value={fnum(totalHrs)} />
          <Cell label="Man Days" value={fnum(manDays)} />
          <Cell
            label="Labor Cost"
            value={fmt(laborCost)}
            dim={`@ $${parseFloat(laborRatePerHour).toFixed(0)}/hr`}
          />
          <Cell label="Labor Burden" value={fmt(burden)} dim="29%" />
          <div className="flex-1 min-w-0 self-center flex justify-center">
            <GpmdCell />
          </div>
          <Cell label="Gross Profit" value={fmt(effectiveGp)} color="text-green-400" />
        </div>
        <div className={`${barCls} lg:flex-[3_1_0%] border border-orange-400/70`}>
          <Cell label="Materials" value={fmt2(totalMat)} />
          <Cell label="Gross Profit" value={fmt(materialGp)} color="text-green-400" />
          <div className="flex-1 min-w-0 self-center flex justify-center">
              <TotalPriceBox />
            </div>
        </div>
      </div>
    </div>
  )
}
