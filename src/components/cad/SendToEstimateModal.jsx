// src/components/cad/SendToEstimateModal.jsx
//
// Push a CAD takeoff into an estimate. The user picks a destination estimate +
// project, maps each takeoff group to an estimator module type (or Skip), and
// we create the modules pre-loaded:
//   • Area (SF)   → Pavers   → data.areaRows[].sf         (structured)
//   • Linear (LF) → Walls    → data.ihData.cmuWalls[].lf  (structured; height 36")
//   • anything else / placed selections → written into the module's `notes`
//     (the pattern the estimator already reads), since forcing counts into
//     planting rows with unmatched material types is unreliable.
//
// Modules re-open with initialData = { ...module.data }, so structured
// quantities land on the In-House tab; the user opens + Saves to run the calc.

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const FG = '#3A5038'

// Must match the estimator's module_type strings (ALLOWED_MODULE_TYPES).
const MODULE_TYPES = [
  'Hand Demo', 'Mini Skid Steer Demo', 'Skid Steer Demo',
  'Utilities', 'Drainage',
  'Concrete', 'Pavers', 'Artificial Turf', 'Ground Treatments', 'Steps',
  'Pool', 'Outdoor Kitchen', 'Fire Pit', 'Walls', 'Columns',
  'Water Features', 'Lighting', 'Finishes',
  'Irrigation', 'Planting',
]

// Heuristic default target from a layer/category name.
function guessArea(name) {
  const s = (name || '').toLowerCase()
  if (/turf|synthetic|lawn/.test(s)) return 'Artificial Turf'
  if (/concrete|slab/.test(s)) return 'Concrete'
  if (/gravel|mulch|ground|dg|decomposed/.test(s)) return 'Ground Treatments'
  return 'Pavers'
}
function guessLinear(name) {
  const s = (name || '').toLowerCase()
  if (/drain|pipe/.test(s)) return 'Drainage'
  if (/irrig|valve|lateral/.test(s)) return 'Irrigation'
  if (/light|wire/.test(s)) return 'Lighting'
  return 'Walls'
}
function guessSelection(category) {
  const s = (category || '').toLowerCase()
  if (/light/.test(s)) return 'Lighting'
  if (/paver|hardscape/.test(s)) return 'Pavers'
  return 'Planting'
}

export default function SendToEstimateModal({ takeoff, unit = 'ft', drawingName = '', onClose }) {
  const navigate = useNavigate()
  const areaUnit = unit === 'ft' ? 'SF' : `${unit}²`

  const [estimates, setEstimates] = useState([])
  const [loadingEst, setLoadingEst] = useState(true)
  const [search, setSearch] = useState('')
  const [estimateId, setEstimateId] = useState('')

  const [projects, setProjects] = useState([])
  const [projectId, setProjectId] = useState('')
  const [newProjectName, setNewProjectName] = useState('')

  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(null) // { count, estimateId }

  // Per-group target module type. Keyed so each row maps independently.
  const [areaTargets, setAreaTargets] = useState({})
  const [linTargets, setLinTargets] = useState({})
  const [selTargets, setSelTargets] = useState({})

  const areaRows = takeoff?.areaRows || []
  const linRows = takeoff?.linRows || []
  const blockRows = takeoff?.blockRows || []

  // Seed default targets once.
  useEffect(() => {
    const a = {}; areaRows.forEach(r => { a[r.layer] = guessArea(r.name) })
    const l = {}; linRows.forEach(r => { l[r.layer] = guessLinear(r.name) })
    const s = {}; blockRows.forEach(r => { s[r.key] = guessSelection(r.category) })
    setAreaTargets(a); setLinTargets(l); setSelTargets(s)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    (async () => {
      setLoadingEst(true)
      const { data } = await supabase
        .from('estimates')
        .select('id, estimate_name, status, client_name, created_at')
        .order('created_at', { ascending: false })
        .limit(500)
      setEstimates(data || [])
      setLoadingEst(false)
    })()
  }, [])

  // Load projects when an estimate is chosen.
  useEffect(() => {
    if (!estimateId) { setProjects([]); setProjectId(''); return }
    (async () => {
      const { data } = await supabase
        .from('estimate_projects')
        .select('id, project_name')
        .eq('estimate_id', estimateId)
        .order('sort_order', { ascending: true })
      setProjects(data || [])
      setProjectId((data && data[0]?.id) || '__new__')
      if (!data || !data.length) setNewProjectName('Takeoff')
    })()
  }, [estimateId])

  const filteredEst = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return estimates
    return estimates.filter(e =>
      (e.estimate_name || '').toLowerCase().includes(q) ||
      (e.client_name || '').toLowerCase().includes(q)
    )
  }, [estimates, search])

  const anyMapped =
    areaRows.some(r => areaTargets[r.layer] && areaTargets[r.layer] !== 'Skip') ||
    linRows.some(r => linTargets[r.layer] && linTargets[r.layer] !== 'Skip') ||
    blockRows.some(r => selTargets[r.key] && selTargets[r.key] !== 'Skip')

  function buildModules(project_id) {
    // Group mapped items by target module type.
    const groups = {} // type -> { area:[], linear:[], selection:[] }
    const ensure = t => (groups[t] || (groups[t] = { area: [], linear: [], selection: [] }))
    areaRows.forEach(r => { const t = areaTargets[r.layer]; if (t && t !== 'Skip') ensure(t).area.push(r) })
    linRows.forEach(r => { const t = linTargets[r.layer]; if (t && t !== 'Skip') ensure(t).linear.push(r) })
    blockRows.forEach(r => { const t = selTargets[r.key]; if (t && t !== 'Skip') ensure(t).selection.push(r) })

    return Object.keys(groups).map(type => {
      const g = groups[type]
      let data = null
      if (type === 'Pavers' && g.area.length) {
        data = {
          areaRows: g.area.map((a, i) => ({
            label: a.name || `Area ${i + 1}`,
            method: 'Skid OK',
            sf: Math.round(a.area),
            depth: 6,
            paverVendor: '', paverType: '', customPricePerSF: '',
            baseVendor: 'Standard', baseType: 'Class II Roadbase',
          })),
        }
      } else if (type === 'Walls' && g.linear.length) {
        data = {
          ihData: {
            cmuWalls: g.linear.map(l => ({ vendor: 'Standard', lf: Math.round(l.length), heightIn: 36 })),
          },
        }
      }
      // Human-readable notes for every mapped quantity (context + fallback).
      const lines = []
      g.area.forEach(a => lines.push(`Area — ${a.name}: ${Math.round(a.area)} ${areaUnit}`))
      g.linear.forEach(l => lines.push(`Linear — ${l.name}: ${Math.round(l.length)} Ln Ft`))
      g.selection.forEach(s => lines.push(`${s.qty}× ${s.label}${s.category ? ` (${s.category})` : ''}${s.extended != null ? ` = $${s.extended.toFixed(2)}` : ''}`))
      const notes = `From CAD takeoff "${drawingName || 'drawing'}":\n${lines.join('\n')}`

      return {
        project_id,
        module_type: type,
        module_name: type,
        man_days: 0, material_cost: 0, labor_cost: 0, labor_burden: 0,
        gross_profit: 0, sub_cost: 0, total_price: 0,
        data, notes,
      }
    })
  }

  async function handleSend() {
    setErr('')
    if (!estimateId) { setErr('Pick a destination estimate.'); return }
    setBusy(true)
    try {
      // Resolve / create the project.
      let pid = projectId
      if (!pid || pid === '__new__') {
        const name = newProjectName.trim() || 'Takeoff'
        const { data: proj, error: pErr } = await supabase
          .from('estimate_projects')
          .insert({ estimate_id: estimateId, project_name: name })
          .select('id')
          .single()
        if (pErr) throw new Error(`Could not create project: ${pErr.message}`)
        pid = proj.id
      }

      const rows = buildModules(pid)
      if (!rows.length) { setErr('Nothing mapped — choose a module for at least one group.'); setBusy(false); return }

      const { error: mErr } = await supabase.from('estimate_modules').insert(rows)
      if (mErr) throw new Error(`Could not create modules: ${mErr.message}`)

      setDone({ count: rows.length, estimateId })
    } catch (e) {
      setErr(String(e.message || e))
    } finally {
      setBusy(false)
    }
  }

  const TargetSelect = ({ value, onChange }) => (
    <select
      value={value || 'Skip'}
      onChange={e => onChange(e.target.value)}
      className="border border-gray-300 rounded px-2 py-1 text-xs bg-white"
    >
      <option value="Skip">— Skip —</option>
      {MODULE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
    </select>
  )

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200" style={{ backgroundColor: FG }}>
          <h2 className="text-base font-bold text-white">Send Takeoff to Estimate</h2>
          <button onClick={onClose} className="text-white/70 hover:text-white text-xl leading-none px-2">✕</button>
        </div>

        {done ? (
          <div className="p-8 text-center">
            <p className="text-4xl mb-2">✅</p>
            <p className="text-sm font-semibold text-gray-800 mb-1">
              Added {done.count} module{done.count === 1 ? '' : 's'} to the estimate.
            </p>
            <p className="text-xs text-gray-500 mb-5">
              Pavers get SF and Walls get LF pre-filled on the In-House tab; other groups are attached as takeoff notes. Open each module and Save to run the numbers.
            </p>
            <div className="flex justify-center gap-2">
              <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 font-medium">Close</button>
              <button
                onClick={() => navigate(`/estimates/${done.estimateId}`)}
                className="px-5 py-2 rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: FG }}
              >
                Open Estimate →
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {err && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs">{err}</div>
            )}

            {/* Destination estimate */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Destination estimate</label>
              {!estimateId ? (
                <>
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search estimates by name or client…"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-green-700/30 focus:border-green-700"
                  />
                  <div className="border border-gray-200 rounded-lg max-h-52 overflow-y-auto divide-y divide-gray-100">
                    {loadingEst ? (
                      <div className="px-3 py-6 text-center text-xs text-gray-400">Loading…</div>
                    ) : filteredEst.length === 0 ? (
                      <div className="px-3 py-6 text-center text-xs text-gray-400">No estimates found.</div>
                    ) : filteredEst.map(e => (
                      <button
                        key={e.id}
                        onClick={() => setEstimateId(e.id)}
                        className="w-full text-left px-3 py-2 hover:bg-green-50 text-sm"
                      >
                        <span className="font-medium text-gray-800">{e.estimate_name || 'Untitled'}</span>
                        <span className="text-xs text-gray-400 ml-2">
                          {e.client_name || '—'}{e.status ? ` · ${e.status}` : ''}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800">
                    {estimates.find(e => e.id === estimateId)?.estimate_name || 'Selected estimate'}
                  </span>
                  <button onClick={() => setEstimateId('')} className="text-xs text-green-700 font-semibold hover:underline">change</button>
                </div>
              )}
            </div>

            {/* Project */}
            {estimateId && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Project</label>
                <div className="flex items-center gap-2">
                  <select
                    value={projectId}
                    onChange={e => setProjectId(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                  >
                    {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
                    <option value="__new__">＋ New project…</option>
                  </select>
                  {projectId === '__new__' && (
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={e => setNewProjectName(e.target.value)}
                      placeholder="Project name"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700/30 focus:border-green-700"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Mapping */}
            {estimateId && (
              <div className="space-y-4">
                {/* Areas */}
                {areaRows.length > 0 && (
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Areas → module</div>
                    <div className="space-y-1">
                      {areaRows.map(r => (
                        <div key={r.layer} className="flex items-center gap-2 text-sm">
                          <span className="flex-1 truncate text-gray-700">{r.name} <span className="text-gray-400">· {Math.round(r.area)} {areaUnit}</span></span>
                          <TargetSelect value={areaTargets[r.layer]} onChange={v => setAreaTargets(m => ({ ...m, [r.layer]: v }))} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Linear */}
                {linRows.length > 0 && (
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Linear → module</div>
                    <div className="space-y-1">
                      {linRows.map(r => (
                        <div key={r.layer} className="flex items-center gap-2 text-sm">
                          <span className="flex-1 truncate text-gray-700">{r.name} <span className="text-gray-400">· {Math.round(r.length)} Ln Ft</span></span>
                          <TargetSelect value={linTargets[r.layer]} onChange={v => setLinTargets(m => ({ ...m, [r.layer]: v }))} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Selections */}
                {blockRows.length > 0 && (
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Placed selections → module (as notes)</div>
                    <div className="space-y-1">
                      {blockRows.map(r => (
                        <div key={r.key} className="flex items-center gap-2 text-sm">
                          <span className="flex-1 truncate text-gray-700">{r.qty}× {r.label} <span className="text-gray-400">{r.category ? `· ${r.category}` : ''}</span></span>
                          <TargetSelect value={selTargets[r.key]} onChange={v => setSelTargets(m => ({ ...m, [r.key]: v }))} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {areaRows.length === 0 && linRows.length === 0 && blockRows.length === 0 && (
                  <div className="text-xs text-gray-400 text-center py-4">Nothing to send — this drawing has no areas, lines, or placed selections yet.</div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-2">
              <p className="text-[11px] text-gray-400 max-w-sm">
                Pavers (SF) and Walls (LF) are written as quantities; everything else attaches as a takeoff note. Wall heights default to 36″ — adjust in the module.
              </p>
              <div className="flex gap-2">
                <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 font-medium">Cancel</button>
                <button
                  onClick={handleSend}
                  disabled={busy || !estimateId || !anyMapped}
                  className="px-5 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-50"
                  style={{ backgroundColor: FG }}
                >
                  {busy ? 'Sending…' : 'Send to Estimate'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
