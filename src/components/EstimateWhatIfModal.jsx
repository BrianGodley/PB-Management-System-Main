// ─────────────────────────────────────────────────────────────────────────────
// EstimateWhatIfModal — pure scratchpad. Doesn't write anything to the
// database unless the user clicks "Save as New Estimate".
//
// Layout:
//   • Frozen top section — a "New Overall GPMD" + "New Overall Price" field
//     side by side, and one shared GpmdBar. Editing either bulk-applies to
//     every module so the bar recomputes.
//   • Scrolling section below — a per-project / per-module table where each
//     row's GPMD *or* Price can be edited freely. Those edits feed the bar.
//   • One "Save as New Estimate" button.
//
// GPMD is the canonical override. A row's Price input keeps the raw text the
// user typed (priceDrafts) so the field is freely overwritable; the GPMD it
// converts to is stored alongside in the gpmd drafts for the calc + save.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react'
import GpmdBar from './modules/GpmdBar'

const fmt = v => '$' + Math.round(v || 0).toLocaleString()
const n = v => {
  const x = parseFloat(v)
  return Number.isFinite(x) ? x : 0
}
const omit = (obj, id) => {
  const next = { ...obj }
  delete next[id]
  return next
}

export default function EstimateWhatIfModal({
  projects = [],
  et, // { manDays, materialCost, laborCost, burden, subCost, gp, price }
  derivedEstSubRate, // blended sub markup
  adjustedEstimateGP, // current effective GP across all projects (post-overrides)
  onClose,
  // (moduleGpmds, projectGpmds) => Promise<boolean>
  onApplyAsNewVersion,
}) {
  const [savingApply, setSavingApply] = useState(false)

  const baseCost = et.materialCost + et.laborCost + et.burden + et.subCost
  const subGp = et.subCost * (derivedEstSubRate || 0)
  const naturalGpmd = et.manDays > 0 ? Math.round(adjustedEstimateGP / et.manDays) : 0

  // GP ⇄ Price (price = base + (gp + subGp) × 1.12).
  const gpFromPrice = (price, b, sg) => Math.max(0, (n(price) - b) / 1.12 - sg)

  // ── Per-project + per-module table (natural values prefilled) ──────────────
  const projTable = useMemo(
    () =>
      projects.map(proj => {
        const mods = proj.estimate_modules || []
        const projSubRate = proj.sub_gp_markup_rate ?? 0.2
        const moduleRows = mods.map(m => {
          const md = n(m.man_days)
          const gp = n(m.gross_profit || m.data?.calc?.gp)
          const mat = n(m.material_cost)
          const labor = n(m.labor_cost || m.data?.calc?.laborCost)
          const burden = n(m.labor_burden || m.data?.calc?.burden)
          const sub = n(m.sub_cost || m.data?.calc?.subCost)
          const mBase = mat + labor + burden + sub
          const mSubGp = sub * projSubRate
          return {
            id: m.id,
            name: m.module_name || m.notes || m.data?.module_name || '(module)',
            manDays: md,
            baseCost: mBase,
            subGp: mSubGp,
            natGp: gp,
            natGpmd: md > 0 ? Math.round(gp / md) : 0,
            natPrice: mBase + (gp + mSubGp) * 1.12,
          }
        })
        const projManDays = moduleRows.reduce((s, m) => s + m.manDays, 0)
        const projBaseCost = moduleRows.reduce((s, m) => s + m.baseCost, 0)
        const projSubGp = moduleRows.reduce((s, m) => s + m.subGp, 0)
        const projNatGp = moduleRows.reduce((s, m) => s + m.natGp, 0)
        return {
          id: proj.id,
          name: proj.project_name || '(project)',
          manDays: projManDays,
          baseCost: projBaseCost,
          subGp: projSubGp,
          natGp: projNatGp,
          natGpmd: projManDays > 0 ? Math.round(projNatGp / projManDays) : 0,
          natPrice: projBaseCost + (projNatGp + projSubGp) * 1.12,
          modules: moduleRows,
        }
      }),
    [projects]
  )

  const allModules = useMemo(() => projTable.flatMap(p => p.modules), [projTable])

  // GPMD drafts are canonical ('' = use natural). priceDrafts hold the raw
  // text typed into a Price input so that field stays freely overwritable.
  const [projDrafts, setProjDrafts] = useState({})
  const [modDrafts, setModDrafts] = useState({})
  const [projPriceDrafts, setProjPriceDrafts] = useState({})
  const [modPriceDrafts, setModPriceDrafts] = useState({})

  // GPMD edit → store GPMD, drop any stale price text for that row.
  const onProjGpmd = (id, v) => {
    setProjDrafts(p => ({ ...p, [id]: v }))
    setProjPriceDrafts(p => omit(p, id))
  }
  const onModGpmd = (id, v) => {
    setModDrafts(p => ({ ...p, [id]: v }))
    setModPriceDrafts(p => omit(p, id))
  }
  // Price edit → keep the raw text AND store the GPMD it converts to.
  const onProjPrice = (id, rawText, gpmd) => {
    setProjPriceDrafts(p => ({ ...p, [id]: rawText }))
    setProjDrafts(p => ({ ...p, [id]: gpmd }))
  }
  const onModPrice = (id, rawText, gpmd) => {
    setModPriceDrafts(p => ({ ...p, [id]: rawText }))
    setModDrafts(p => ({ ...p, [id]: gpmd }))
  }

  // ── Scenario rollup ────────────────────────────────────────────────────────
  const s3Rows = projTable.map(proj => {
    const projOv = parseFloat(projDrafts[proj.id])
    const projOvOk = Number.isFinite(projOv) && projOv >= 0
    let projGp
    let modUsed
    if (projOvOk) {
      projGp = proj.manDays * projOv
      modUsed = proj.modules.map(m => ({ ...m, eff: m.natGp }))
    } else {
      modUsed = proj.modules.map(m => {
        const ov = parseFloat(modDrafts[m.id])
        const ovOk = Number.isFinite(ov) && ov >= 0
        return { ...m, eff: ovOk ? m.manDays * ov : m.natGp }
      })
      projGp = modUsed.reduce((s, m) => s + m.eff, 0)
    }
    const projGpmd = proj.manDays > 0 ? Math.round(projGp / proj.manDays) : 0
    const projPrice = proj.baseCost + (projGp + proj.subGp) * 1.12
    return { ...proj, projOvOk, projGp, projGpmd, projPrice, modUsed }
  })

  const scenGp = s3Rows.reduce((s, r) => s + r.projGp, 0)
  const scenPrice = s3Rows.reduce((s, r) => s + r.projPrice, 0)
  const scenGpmd = et.manDays > 0 ? Math.round(scenGp / et.manDays) : 0

  // ── Top fields — bulk controls ─────────────────────────────────────────────
  const [topGpmd, setTopGpmd] = useState(String(naturalGpmd || ''))
  const [topPrice, setTopPrice] = useState(String(Math.round(et.price) || ''))

  function clearPriceDrafts() {
    setProjPriceDrafts({})
    setModPriceDrafts({})
  }

  function applyUniformGpmd(v) {
    setTopGpmd(v)
    const g = parseFloat(v)
    if (!Number.isFinite(g) || g < 0) return
    setProjDrafts({})
    setModDrafts(Object.fromEntries(allModules.map(m => [m.id, String(g)])))
    clearPriceDrafts()
    setTopPrice(String(Math.round(baseCost + (et.manDays * g + subGp) * 1.12)))
  }

  function applyTotalPrice(v) {
    setTopPrice(v)
    const p = parseFloat(v)
    if (!Number.isFinite(p) || p <= 0) return
    const targetGp = gpFromPrice(p, baseCost, subGp)
    setProjDrafts({})
    clearPriceDrafts()
    let next
    if (scenGp > 0) {
      const ratio = targetGp / scenGp
      next = {}
      for (const r of s3Rows) {
        for (const m of r.modUsed) {
          const effGpmd = m.manDays > 0 ? m.eff / m.manDays : 0
          next[m.id] = String(Math.round(effGpmd * ratio))
        }
      }
    } else {
      const g = et.manDays > 0 ? Math.round(targetGp / et.manDays) : 0
      next = Object.fromEntries(allModules.map(m => [m.id, String(g)]))
    }
    setModDrafts(next)
    // Reflect the ACTUAL resulting GPMD (after per-module rounding) so the
    // New Overall GPMD field matches the GPMD bar exactly.
    const resultGp = allModules.reduce((sum, m) => sum + m.manDays * n(next[m.id]), 0)
    setTopGpmd(String(et.manDays > 0 ? Math.round(resultGp / et.manDays) : 0))
  }

  function resetAll() {
    setProjDrafts({})
    setModDrafts({})
    clearPriceDrafts()
    setTopGpmd(String(naturalGpmd || ''))
    setTopPrice(String(Math.round(et.price) || ''))
  }

  async function saveAsNew() {
    const moduleOvs = {}
    const projectOvs = {}
    for (const row of s3Rows) {
      const projOv = parseFloat(projDrafts[row.id])
      if (Number.isFinite(projOv) && projOv >= 0) {
        projectOvs[row.id] = projOv
        for (const m of row.modUsed) moduleOvs[m.id] = projOv
      } else {
        projectOvs[row.id] = null
        for (const m of row.modUsed) {
          const modOv = parseFloat(modDrafts[m.id])
          if (Number.isFinite(modOv) && modOv >= 0) moduleOvs[m.id] = modOv
        }
      }
    }
    if (Object.keys(moduleOvs).length === 0) {
      alert('Enter a GPMD or price change first — in the top fields or the table below.')
      return
    }
    if (!window.confirm('Save this what-if as a new estimate version?')) return
    setSavingApply(true)
    const ok = await onApplyAsNewVersion(moduleOvs, projectOvs)
    setSavingApply(false)
    if (ok) onClose()
  }

  const sharedBarProps = {
    totalMat: et.materialCost,
    totalHrs: et.manDays * 8,
    manDays: et.manDays,
    laborCost: et.laborCost,
    laborRatePerHour: et.manDays > 0 && et.laborCost > 0 ? et.laborCost / (et.manDays * 8) : 35,
    burden: et.burden,
    subCost: et.subCost,
    subMarkupRate: derivedEstSubRate,
  }
  const deltaGp = scenGp - adjustedEstimateGP

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="flex w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl"
        style={{ maxHeight: '92vh' }}
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">💡 What If? — Estimate Scratchpad</h2>
            <p className="mt-0.5 text-xs text-gray-400">
              Explore alternative GPMD / pricing without changing the estimate.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-xl leading-none text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        {/* ── Frozen top section: two fields + the shared bar ── */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-gray-50 px-6 py-4">
          <div className="mb-3 flex flex-wrap items-end gap-4">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                New Overall GPMD
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                  $
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={topGpmd}
                  onChange={e => applyUniformGpmd(e.target.value)}
                  className="input w-36 pl-7 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                New Overall Price
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                  $
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={topPrice}
                  onChange={e => setTopPrice(e.target.value)}
                  onBlur={() => applyTotalPrice(topPrice)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') applyTotalPrice(topPrice)
                  }}
                  className="input w-44 pl-7 text-sm"
                />
              </div>
              <p className="mt-0.5 text-[9px] text-gray-400">
                Press Enter or click away to apply
              </p>
            </div>
            <p className="pb-1.5 text-xs text-gray-500">
              Current GPMD{' '}
              <span className="font-semibold text-gray-700">${naturalGpmd.toLocaleString()}</span>
              {' · '}Δ profit{' '}
              <span className={`font-semibold ${deltaGp >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {deltaGp >= 0 ? '+' : ''}
                {fmt(deltaGp)}
              </span>
            </p>
          </div>
          <GpmdBar {...sharedBarProps} directGp={scenGp} price={scenPrice} />
        </div>

        {/* ── Scrolling section: per-project / per-module tweaks ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="text-sm font-bold text-gray-800">
              Tweak individual projects &amp; modules
            </h3>
            <button
              onClick={resetAll}
              className="text-[11px] text-gray-400 underline hover:text-gray-700"
            >
              Reset all
            </button>
          </div>
          <p className="mb-3 text-[11px] text-gray-500">
            Edit a row's GPMD <em>or</em> Price — the other follows. A project's value overrides
            the modules inside it; leave a row blank to use its natural value.
          </p>

          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Project / Module</th>
                  <th className="px-3 py-2 text-right font-semibold">Man-days</th>
                  <th className="px-3 py-2 text-right font-semibold">Natural GPMD</th>
                  <th className="px-3 py-2 text-right font-semibold">New GPMD</th>
                  <th className="px-3 py-2 text-right font-semibold">New Price</th>
                  <th className="px-3 py-2 text-right font-semibold">New GP</th>
                </tr>
              </thead>
              <tbody>
                {s3Rows.map(row => (
                  <ProjectRows
                    key={row.id}
                    row={row}
                    gpFromPrice={gpFromPrice}
                    projGpmdDraft={projDrafts[row.id] || ''}
                    projPriceDraft={projPriceDrafts[row.id]}
                    onProjGpmd={onProjGpmd}
                    onProjPrice={onProjPrice}
                    modDrafts={modDrafts}
                    modPriceDrafts={modPriceDrafts}
                    onModGpmd={onModGpmd}
                    onModPrice={onModPrice}
                  />
                ))}
                <tr className="border-t-2 border-amber-200 bg-amber-50 font-semibold text-gray-800">
                  <td className="px-3 py-2">ESTIMATE TOTAL</td>
                  <td className="px-3 py-2 text-right">{et.manDays.toFixed(1)}</td>
                  <td className="px-3 py-2 text-right text-gray-500">
                    ${naturalGpmd.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right text-amber-700">
                    ${scenGpmd.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right text-amber-700">{fmt(scenPrice)}</td>
                  <td className="px-3 py-2 text-right text-amber-700">{fmt(scenGp)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer — single Save button */}
        <div className="flex flex-shrink-0 items-center justify-between border-t border-gray-100 px-6 py-3">
          <p className="text-[11px] italic text-gray-400">
            Scratchpad only — closing discards every what-if change.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg bg-gray-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-gray-900"
            >
              Close
            </button>
            {onApplyAsNewVersion && (
              <button
                onClick={saveAsNew}
                disabled={savingApply}
                className="rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {savingApply ? 'Saving…' : 'Save as New Estimate'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// One project row + its module sub-rows. Each row has a GPMD input and a
// Price input — editing either updates the row; the Price input keeps the
// raw text typed so it can be freely overwritten.
function ProjectRows({
  row,
  gpFromPrice,
  projGpmdDraft,
  projPriceDraft,
  onProjGpmd,
  onProjPrice,
  modDrafts,
  modPriceDrafts,
  onModGpmd,
  onModPrice,
}) {
  // Convert a typed price into the GPMD it implies for an entity.
  const toGpmd = (price, base, subGp, manDays) => {
    if (price === '') return ''
    const gp = gpFromPrice(price, base, subGp)
    return manDays > 0 ? String(Math.round(gp / manDays)) : '0'
  }

  const projOvOk = projGpmdDraft !== '' && Number.isFinite(parseFloat(projGpmdDraft))
  // Price field value: the raw text if the user typed a price here, else the
  // price derived from a GPMD draft, else blank (placeholder = natural).
  const projPriceVal =
    projPriceDraft !== undefined
      ? projPriceDraft
      : projOvOk
        ? String(
            Math.round(row.baseCost + (row.manDays * parseFloat(projGpmdDraft) + row.subGp) * 1.12)
          )
        : ''

  return (
    <>
      <tr className="border-t border-gray-100 bg-white">
        <td className="px-3 py-2 font-semibold text-gray-800">{row.name}</td>
        <td className="px-3 py-2 text-right text-gray-700">{row.manDays.toFixed(1)}</td>
        <td className="px-3 py-2 text-right text-gray-500">${row.natGpmd.toLocaleString()}</td>
        <td className="px-3 py-2 text-right">
          <DollarInput
            value={projGpmdDraft}
            placeholder={String(row.natGpmd)}
            onChange={v => onProjGpmd(row.id, v)}
            wide
          />
        </td>
        <td className="px-3 py-2 text-right">
          <DollarInput
            value={projPriceVal}
            placeholder={String(Math.round(row.natPrice))}
            onChange={v =>
              onProjPrice(row.id, v, toGpmd(v, row.baseCost, row.subGp, row.manDays))
            }
            wide
          />
        </td>
        <td className="px-3 py-2 text-right font-semibold text-gray-800">
          ${Math.round(row.projGp).toLocaleString()}
        </td>
      </tr>
      {row.modUsed.map(m => {
        const gpmdDraft = modDrafts[m.id] || ''
        const priceDraft = modPriceDrafts[m.id]
        const modOvOk = gpmdDraft !== '' && Number.isFinite(parseFloat(gpmdDraft))
        const modPriceVal =
          priceDraft !== undefined
            ? priceDraft
            : modOvOk
              ? String(
                  Math.round(m.baseCost + (m.manDays * parseFloat(gpmdDraft) + m.subGp) * 1.12)
                )
              : ''
        return (
          <tr key={m.id} className={`border-t border-gray-50 ${projOvOk ? 'opacity-50' : ''}`}>
            <td className="py-1.5 pl-8 pr-3 text-gray-600">↳ {m.name}</td>
            <td className="px-3 py-1.5 text-right text-gray-500">{m.manDays.toFixed(1)}</td>
            <td className="px-3 py-1.5 text-right text-gray-400">${m.natGpmd.toLocaleString()}</td>
            <td className="px-3 py-1.5 text-right">
              <DollarInput
                value={gpmdDraft}
                placeholder={String(m.natGpmd)}
                disabled={projOvOk}
                onChange={v => onModGpmd(m.id, v)}
              />
            </td>
            <td className="px-3 py-1.5 text-right">
              <DollarInput
                value={modPriceVal}
                placeholder={String(Math.round(m.natPrice))}
                disabled={projOvOk}
                onChange={v => onModPrice(m.id, v, toGpmd(v, m.baseCost, m.subGp, m.manDays))}
              />
            </td>
            <td className="px-3 py-1.5 text-right text-gray-700">
              ${Math.round(m.eff).toLocaleString()}
            </td>
          </tr>
        )
      })}
    </>
  )
}

function DollarInput({ value, placeholder, onChange, disabled, wide }) {
  return (
    <div className="relative inline-block">
      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
        $
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
        className={`input py-1 pl-5 text-right text-xs font-semibold text-gray-900 disabled:bg-gray-50 disabled:font-normal disabled:text-gray-400 ${
          wide ? 'w-24' : 'w-20'
        }`}
      />
    </div>
  )
}
