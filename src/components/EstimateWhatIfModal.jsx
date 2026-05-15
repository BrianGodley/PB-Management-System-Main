// ─────────────────────────────────────────────────────────────────────────────
// EstimateWhatIfModal — pure scratchpad. Doesn't write anything to the
// database. The user can explore three independent what-if scenarios:
//
//   1) Override the estimate-wide GPMD       → see a recomputed GpmdBar
//   2) Override the overall price            → see a recomputed GpmdBar
//   3) Override individual project + module  → see cascading recompute
//      GPMDs                                    of project totals + estimate total
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react'
import GpmdBar from './modules/GpmdBar'

const fmt = v => '$' + Math.round(v || 0).toLocaleString()

export default function EstimateWhatIfModal({
  projects = [],
  et,                  // { manDays, materialCost, laborCost, burden, subCost, gp, price }
  derivedEstSubRate,   // blended sub markup
  adjustedEstimateGP,  // current effective GP across all projects (post-overrides)
  onClose,
}) {
  const baseCost   = et.materialCost + et.laborCost + et.burden + et.subCost
  const subGp      = et.subCost * (derivedEstSubRate || 0)
  // The "natural" estimate GPMD derived from the post-override GP
  const naturalGpmd = et.manDays > 0 ? Math.round(adjustedEstimateGP / et.manDays) : 0

  // ── Section 1: try a new estimate-wide GPMD ────────────────────────────────
  const [s1Draft, setS1Draft] = useState(String(naturalGpmd || ''))
  const s1Num = parseFloat(s1Draft)
  const s1Has = Number.isFinite(s1Num) && s1Num >= 0
  const s1Gp  = s1Has ? et.manDays * s1Num : adjustedEstimateGP

  // ── Section 2: try a new overall price ─────────────────────────────────────
  const [s2Draft, setS2Draft] = useState(String(Math.round(et.price) || ''))
  const s2Num = parseFloat(s2Draft)
  const s2Has = Number.isFinite(s2Num) && s2Num > 0
  const s2Gp  = s2Has ? Math.max(0, (s2Num - baseCost) / 1.12 - subGp) : adjustedEstimateGP
  const s2Gpmd = et.manDays > 0 ? Math.round(s2Gp / et.manDays) : 0

  // ── Section 3: per-project / per-module GPMD overrides ─────────────────────
  // Build the natural GPMD per module + per project so the inputs are prefilled.
  const projTable = useMemo(() => projects.map(proj => {
    const mods = proj.estimate_modules || []
    const projManDays  = mods.reduce((s, m) => s + parseFloat(m.man_days || 0), 0)
    const projMatCost  = mods.reduce((s, m) => s + parseFloat(m.material_cost || 0), 0)
    const projLabor    = mods.reduce((s, m) => s + parseFloat(m.labor_cost || m.data?.calc?.laborCost || 0), 0)
    const projBurden   = mods.reduce((s, m) => s + parseFloat(m.labor_burden || m.data?.calc?.burden || 0), 0)
    const projSubCost  = mods.reduce((s, m) => s + parseFloat(m.sub_cost || m.data?.calc?.subCost || 0), 0)
    const projNatGp    = mods.reduce((s, m) => s + parseFloat(m.gross_profit || m.data?.calc?.gp || 0), 0)
    const projNatGpmd  = projManDays > 0 ? Math.round(projNatGp / projManDays) : 0
    const projSubRate  = proj.sub_gp_markup_rate ?? 0.20
    const projSubGp    = projSubCost * projSubRate
    const projBaseCost = projMatCost + projLabor + projBurden + projSubCost
    const moduleRows = mods.map(m => {
      const md = parseFloat(m.man_days || 0)
      const gp = parseFloat(m.gross_profit || m.data?.calc?.gp || 0)
      return {
        id: m.id,
        name: m.module_name || m.notes || m.data?.module_name || '(module)',
        manDays: md,
        natGp: gp,
        natGpmd: md > 0 ? Math.round(gp / md) : 0,
      }
    })
    return {
      id: proj.id,
      name: proj.project_name || '(project)',
      manDays: projManDays,
      baseCost: projBaseCost,
      subGp: projSubGp,
      natGp: projNatGp,
      natGpmd: projNatGpmd,
      modules: moduleRows,
    }
  }), [projects])

  // Drafts keyed by id. Empty string = "use natural".
  const [projDrafts, setProjDrafts] = useState({})
  const [modDrafts,  setModDrafts]  = useState({})

  const setProj = (id, v) => setProjDrafts(p => ({ ...p, [id]: v }))
  const setMod  = (id, v) => setModDrafts(p  => ({ ...p, [id]: v }))

  // For each project compute effective GP using either the project override
  // (wins over modules) or the per-module overrides.
  const s3Rows = projTable.map(proj => {
    const projOv = parseFloat(projDrafts[proj.id])
    const projOvOk = Number.isFinite(projOv) && projOv >= 0
    let projGp
    let modUsed = []
    if (projOvOk) {
      projGp = proj.manDays * projOv
      modUsed = proj.modules.map(m => ({ ...m, eff: m.natGp }))   // module rows are display-only here
    } else {
      modUsed = proj.modules.map(m => {
        const ov = parseFloat(modDrafts[m.id])
        const ovOk = Number.isFinite(ov) && ov >= 0
        const eff = ovOk ? m.manDays * ov : m.natGp
        return { ...m, eff }
      })
      projGp = modUsed.reduce((s, m) => s + m.eff, 0)
    }
    const projGpmd  = proj.manDays > 0 ? Math.round(projGp / proj.manDays) : 0
    const projPrice = proj.baseCost + (projGp + proj.subGp) * 1.12
    return { ...proj, projOvOk, projGp, projGpmd, projPrice, modUsed }
  })

  const s3TotalGp    = s3Rows.reduce((s, r) => s + r.projGp, 0)
  const s3TotalPrice = s3Rows.reduce((s, r) => s + r.projPrice, 0)
  const s3TotalGpmd  = et.manDays > 0 ? Math.round(s3TotalGp / et.manDays) : 0

  function resetSection3() {
    setProjDrafts({})
    setModDrafts({})
  }

  // ── shared GpmdBar props (everything except directGp / price) ──────────────
  const sharedBarProps = {
    totalMat:         et.materialCost,
    totalHrs:         et.manDays * 8,
    manDays:          et.manDays,
    laborCost:        et.laborCost,
    laborRatePerHour: et.manDays > 0 && et.laborCost > 0 ? et.laborCost / (et.manDays * 8) : 35,
    burden:           et.burden,
    subCost:          et.subCost,
    subMarkupRate:    derivedEstSubRate,
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col" style={{ maxHeight: '92vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">💡 What If? — Estimate Scratchpad</h2>
            <p className="text-xs text-gray-400 mt-0.5">Explore alternative GPMD / pricing without changing the estimate.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1">×</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-8">

          {/* ── SECTION 1: Try a different GPMD ── */}
          <section>
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="text-sm font-bold text-gray-800">1. Try a different overall GPMD</h3>
              <p className="text-xs text-gray-400">Current: <span className="font-semibold text-gray-600">${naturalGpmd.toLocaleString()}</span></p>
            </div>
            <div className="flex items-end gap-3 mb-3">
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">New GPMD</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">$</span>
                  <input type="number" min="0" step="1" value={s1Draft}
                    onChange={e => setS1Draft(e.target.value)}
                    className="input text-sm pl-7 w-32" />
                </div>
              </div>
              <p className="text-xs text-gray-600">
                New GP: <span className="font-semibold text-gray-900">{fmt(s1Gp)}</span>
                {' · '}
                Δ: <span className={`font-semibold ${s1Gp - adjustedEstimateGP >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {s1Gp - adjustedEstimateGP >= 0 ? '+' : ''}{fmt(s1Gp - adjustedEstimateGP)}
                </span>
              </p>
            </div>
            <GpmdBar {...sharedBarProps} directGp={s1Gp} price={baseCost + (s1Gp + subGp) * 1.12} />
          </section>

          {/* ── SECTION 2: Try a different overall price ── */}
          <section>
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="text-sm font-bold text-gray-800">2. Try a different overall price</h3>
              <p className="text-xs text-gray-400">Current: <span className="font-semibold text-gray-600">{fmt(et.price)}</span></p>
            </div>
            <div className="flex items-end gap-3 mb-3">
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">New total price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">$</span>
                  <input type="number" min="0" step="0.01" value={s2Draft}
                    onChange={e => setS2Draft(e.target.value)}
                    className="input text-sm pl-7 w-44" />
                </div>
              </div>
              <p className="text-xs text-gray-600">
                New GP: <span className="font-semibold text-gray-900">{fmt(s2Gp)}</span>
                {' · '}
                New GPMD: <span className="font-semibold text-gray-900">${s2Gpmd.toLocaleString()}</span>
                {' · '}
                Δ profit: <span className={`font-semibold ${s2Gp - adjustedEstimateGP >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {s2Gp - adjustedEstimateGP >= 0 ? '+' : ''}{fmt(s2Gp - adjustedEstimateGP)}
                </span>
              </p>
            </div>
            <GpmdBar {...sharedBarProps} directGp={s2Gp} price={s2Has ? s2Num : et.price} />
          </section>

          {/* ── SECTION 3: per-project / per-module overrides ── */}
          <section>
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="text-sm font-bold text-gray-800">3. Tweak individual projects &amp; modules</h3>
              <button onClick={resetSection3}
                className="text-[11px] text-gray-400 hover:text-gray-700 underline">Reset all</button>
            </div>
            <p className="text-[11px] text-gray-500 mb-3">
              Editing a project's GPMD overrides any module-level edits inside it. Leave blank to use the natural value.
            </p>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">Project / Module</th>
                    <th className="text-right px-3 py-2 font-semibold">Man-days</th>
                    <th className="text-right px-3 py-2 font-semibold">Natural GPMD</th>
                    <th className="text-right px-3 py-2 font-semibold">New GPMD</th>
                    <th className="text-right px-3 py-2 font-semibold">New GP</th>
                    <th className="text-right px-3 py-2 font-semibold">New Price</th>
                  </tr>
                </thead>
                <tbody>
                  {s3Rows.map(row => (
                    <FragmentRows key={row.id} row={row}
                      projDraft={projDrafts[row.id] || ''}
                      onProjChange={v => setProj(row.id, v)}
                      modDrafts={modDrafts}
                      onModChange={setMod} />
                  ))}
                  <tr className="bg-amber-50 border-t-2 border-amber-200 font-semibold text-gray-800">
                    <td className="px-3 py-2">ESTIMATE TOTAL</td>
                    <td className="px-3 py-2 text-right">{et.manDays.toFixed(1)}</td>
                    <td className="px-3 py-2 text-right text-gray-500">${naturalGpmd.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-amber-700">${s3TotalGpmd.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-amber-700">{fmt(s3TotalGp)}</td>
                    <td className="px-3 py-2 text-right text-amber-700">{fmt(s3TotalPrice)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 flex-shrink-0">
          <p className="text-[11px] text-gray-400 italic">
            Scratchpad only — closing this modal discards every what-if change.
          </p>
          <button onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-gray-800 text-white text-xs font-semibold hover:bg-gray-900">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// One project's row + its module sub-rows.
function FragmentRows({ row, projDraft, onProjChange, modDrafts, onModChange }) {
  return (
    <>
      <tr className="bg-white border-t border-gray-100">
        <td className="px-3 py-2 font-semibold text-gray-800">{row.name}</td>
        <td className="px-3 py-2 text-right text-gray-700">{row.manDays.toFixed(1)}</td>
        <td className="px-3 py-2 text-right text-gray-500">${row.natGpmd.toLocaleString()}</td>
        <td className="px-3 py-2 text-right">
          <div className="relative inline-block">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">$</span>
            <input type="number" min="0" step="1"
              value={projDraft}
              onChange={e => onProjChange(e.target.value)}
              placeholder={String(row.natGpmd)}
              className="input text-xs pl-5 py-1 w-24 text-right" />
          </div>
        </td>
        <td className="px-3 py-2 text-right font-semibold text-gray-800">${Math.round(row.projGp).toLocaleString()}</td>
        <td className="px-3 py-2 text-right font-bold text-gray-900">${Math.round(row.projPrice).toLocaleString()}</td>
      </tr>
      {row.modules.map(m => {
        const draft = modDrafts[m.id] || ''
        const projOverrides = row.projOvOk
        return (
          <tr key={m.id} className={`border-t border-gray-50 ${projOverrides ? 'opacity-50' : ''}`}>
            <td className="pl-8 pr-3 py-1.5 text-gray-600">↳ {m.name}</td>
            <td className="px-3 py-1.5 text-right text-gray-500">{m.manDays.toFixed(1)}</td>
            <td className="px-3 py-1.5 text-right text-gray-400">${m.natGpmd.toLocaleString()}</td>
            <td className="px-3 py-1.5 text-right">
              <div className="relative inline-block">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">$</span>
                <input type="number" min="0" step="1"
                  value={draft}
                  disabled={projOverrides}
                  onChange={e => onModChange(m.id, e.target.value)}
                  placeholder={String(m.natGpmd)}
                  className="input text-xs pl-5 py-1 w-20 text-right disabled:bg-gray-50 disabled:text-gray-400" />
              </div>
            </td>
            <td className="px-3 py-1.5 text-right text-gray-700">${Math.round(m.eff).toLocaleString()}</td>
            <td className="px-3 py-1.5 text-right text-gray-300">—</td>
          </tr>
        )
      })}
    </>
  )
}
