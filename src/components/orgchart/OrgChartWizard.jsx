// Org Chart Wizard — a guided, multi-step builder. The user answers a few
// structured questions (with optional "Ask Sam" suggestions at each step); the
// app then builds the starting chart deterministically from those answers.
//
// Output: a template-shaped snapshot ({ nodes, edges } with local `ref`s and
// position titles) handed to onComplete, so OrgChartV2 can reuse its existing
// instantiate-from-template path (which also runs the add-missing-HR-positions
// step).

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { CONTAINER_COLORS } from './palette.js'

const FG = '#16491b'

// The "Sam" assistant icon (same mark as the app header), for inline use on
// buttons. A faint border keeps the white circle visible on light backgrounds.
function SamIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      <circle cx="20" cy="20" r="19" fill="#FFFFFF" stroke="#E2E8F0" />
      <rect x="6" y="9" width="28" height="18" rx="5" fill="#FAC775" />
      <path d="M11 26 L9 32 L17 27 Z" fill="#FAC775" />
      <text
        x="20"
        y="22"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontWeight="700"
        fontSize="11"
        fill="#412402"
      >
        Sam
      </text>
    </svg>
  )
}

// Ask Sam (the agent-chat edge function) a one-shot question; returns the reply.
async function askSam(message) {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const jwt = session?.access_token
  if (!jwt) throw new Error('Not signed in.')
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ message, attachments: [] }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
  return data.reply || ''
}

// Pull the first JSON array out of a free-text reply.
function parseJsonArray(text) {
  if (!text) return null
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start === -1 || end === -1 || end < start) return null
  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch {
    return null
  }
}

function blankDivision() {
  return { name: '', lead: '', juniors: '' }
}

// Node factory with sensible defaults.
function mk(over) {
  return {
    ref: '',
    kind: 'position',
    label: '',
    position_title: null,
    heading: null,
    bg_color: null,
    box_style: {},
    container_mode: null,
    parent_ref: null,
    attached_ref: null,
    attachment_side: null,
    width: 110,
    height: 40,
    font_sizes: {},
    text_styles: {},
    x_offset: 0,
    tier: 0,
    tier_order: 0,
    ...over,
  }
}
const areaBox = i => ({
  kind: 'container',
  bg_color: CONTAINER_COLORS[i % CONTAINER_COLORS.length].bg,
  box_style: { fill: 'border', borderWidth: 2 },
  container_mode: 'independent',
  width: 210,
  height: 90,
})
const splitJuniors = j =>
  (j || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

// Build the template-shaped snapshot from the collected answers, honoring the
// chosen chart type: 'positions' (people only), 'areas' (business functions
// only), or 'combination' (areas led by positions, with junior roles).
function buildSnapshot(chartType, { topTitle, divisions }) {
  const nodes = []
  const edges = []
  const rows = divisions.filter(d => (d.name || '').trim() || (d.lead || '').trim())
  const topRef = 'top'

  if (chartType === 'areas') {
    nodes.push(mk({ ref: topRef, ...areaBox(0), label: (topTitle || '').trim() || 'Organization', tier: 0 }))
  } else {
    nodes.push(mk({ ref: topRef, kind: 'position', position_title: (topTitle || '').trim() || 'Leader', tier: 0 }))
  }

  rows.forEach((d, i) => {
    const dref = `n${i}`
    if (chartType === 'positions') {
      nodes.push(
        mk({ ref: dref, kind: 'position', position_title: (d.name || d.lead || '').trim(), tier: 1, tier_order: i }),
      )
      edges.push({ source_ref: topRef, target_ref: dref, relationship: 'reports_to', style: 'solid', bus_offset: null })
      splitJuniors(d.juniors).forEach((j, k) => {
        const jref = `${dref}_j${k}`
        nodes.push(mk({ ref: jref, kind: 'position', position_title: j, tier: 2, tier_order: k }))
        // Positions-only: juniors connect by a reports-to line (no container).
        edges.push({ source_ref: dref, target_ref: jref, relationship: 'reports_to', style: 'solid', bus_offset: null })
      })
    } else if (chartType === 'areas') {
      nodes.push(mk({ ref: dref, ...areaBox(i), label: (d.name || '').trim(), tier: 1, tier_order: i }))
      edges.push({ source_ref: topRef, target_ref: dref, relationship: 'reports_to', style: 'solid', bus_offset: null })
      splitJuniors(d.juniors).forEach((j, k) => {
        // Areas-only: sub-functions are junior areas attached beneath.
        nodes.push(mk({ ref: `${dref}_j${k}`, ...areaBox(i), label: j, parent_ref: dref, tier: 2, tier_order: k }))
      })
    } else {
      // combination
      nodes.push(
        mk({ ref: dref, ...areaBox(i), label: (d.name || '').trim(), position_title: (d.lead || '').trim() || null, tier: 1, tier_order: i }),
      )
      edges.push({ source_ref: topRef, target_ref: dref, relationship: 'reports_to', style: 'solid', bus_offset: null })
      splitJuniors(d.juniors).forEach((j, k) => {
        nodes.push(mk({ ref: `${dref}_j${k}`, kind: 'position', position_title: j, parent_ref: dref, tier: 2, tier_order: k }))
      })
    }
  })
  return { nodes, edges }
}

export default function OrgChartWizard({
  initialName,
  positionTitles = [],
  priorExamples = [],
  industries = [], // [{ id, name }]
  subcategories = [], // [{ id, name, category_id }]
  onClose,
  onComplete,
}) {
  const [step, setStep] = useState(1)
  const [name, setName] = useState(initialName || '')
  const [industryId, setIndustryId] = useState('') // selected category id (string)
  const [subcategoryId, setSubcategoryId] = useState('') // selected subcategory id (string)
  const [description, setDescription] = useState('')
  const [chartType, setChartType] = useState('combination') // 'positions' | 'areas' | 'combination'

  const industryName = industries.find(c => String(c.id) === industryId)?.name || ''
  const subsForIndustry = industryId
    ? subcategories.filter(s => String(s.category_id) === industryId)
    : []
  const subName = subsForIndustry.find(s => String(s.id) === subcategoryId)?.name || ''
  const [topTitle, setTopTitle] = useState('')
  const [divisions, setDivisions] = useState([blankDivision()])
  const [samBusy, setSamBusy] = useState(false)
  const [samError, setSamError] = useState('')
  // The last structure Sam drafted — used both for the in-session "refine"
  // step and stored alongside the user's final answers so Sam can learn from
  // the corrections next time.
  const [lastDraft, setLastDraft] = useState(null)

  // Keep Sam industry-agnostic — this is a general-purpose SaaS org-chart tool,
  // so it must not assume any particular business (e.g. landscaping) and should
  // rely only on the user's description. Also tells Sam the chosen chart type.
  const genericPreamble = () => {
    const typeLine = {
      positions:
        'Chart type: POSITIONS ONLY — list job positions and reporting lines. For each item use {"name":"Position title","juniors":["Subordinate position", ...]} and omit "lead".',
      areas:
        'Chart type: FUNCTIONS/AREAS ONLY — list areas of the business (no individual people). For each item use {"name":"Function/Area name","juniors":["Sub-function", ...]} and omit "lead".',
      combination:
        'Chart type: COMBINATION — business areas, each led by a manager position, with junior roles. For each item use {"name":"Area name","lead":"Manager position title","juniors":["Role", ...]}.',
    }[chartType]
    const industryLine = industryName
      ? `The business operates in the "${industryName}" industry${
          subName ? `, specifically the "${subName}" sub-sector` : ''
        } — tailor names to that ${subName ? 'sub-sector' : 'industry'} while keeping them ` +
        `professional and widely understood.`
      : `Do NOT assume any specific industry; rely only on the description the user provides and keep titles generic.`
    return (
      `You are helping design an organizational chart in a general-purpose org-chart product. ` +
      `${industryLine}\n${typeLine}`
    )
  }

  // Grounding context handed to Sam so its suggestions reuse your real position
  // titles and follow how you've structured past charts.
  const groundingContext = () => {
    const parts = [genericPreamble()]
    if (positionTitles.length) {
      parts.push(
        `Reuse these EXISTING position titles verbatim wherever they fit (avoid near-duplicates): ${positionTitles
          .slice(0, 60)
          .join(', ')}.`,
      )
    }
    if (priorExamples.length) {
      parts.push(
        `Here are org structures this company has accepted before — match their naming and style:\n${JSON.stringify(
          priorExamples.slice(0, 3),
        )}`,
      )
    }
    return parts.join('\n')
  }

  const setDiv = (i, patch) =>
    setDivisions(prev => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)))
  const addDiv = () => setDivisions(prev => [...prev, blankDivision()])
  const removeDiv = i => setDivisions(prev => prev.filter((_, idx) => idx !== i))

  // Ask Sam to propose a top leader title from the description.
  async function samSuggestTop() {
    setSamBusy(true)
    setSamError('')
    try {
      const sector = subName
        ? `${industryName} (${subName})`
        : industryName
      const reply = await askSam(
        `For a business${sector ? ` in the "${sector}" sector` : ''} described as ` +
          `"${description || 'a company'}", what is the single most senior ` +
          `${chartType === 'areas' ? 'top-level area/function name' : 'leadership position title'} ` +
          `at the top of its org chart?${sector ? '' : ' Do not assume any specific industry.'} ` +
          `Reply with ONLY the name, no extra words.`,
      )
      const t = reply.split('\n')[0].replace(/[".]/g, '').trim()
      if (t) setTopTitle(t)
    } catch (e) {
      setSamError(e.message || 'Sam unavailable')
    } finally {
      setSamBusy(false)
    }
  }

  const toDivisions = arr =>
    arr.map(d => ({
      name: String(d.name || '').trim(),
      lead: String(d.lead || '').trim(),
      juniors: Array.isArray(d.juniors) ? d.juniors.join(', ') : String(d.juniors || ''),
    }))

  // Ask Sam to draft the divisions + leads + junior roles (grounded in your
  // existing positions and past accepted structures).
  async function samDraftDivisions() {
    setSamBusy(true)
    setSamError('')
    try {
      const reply = await askSam(
        `Propose a simple starting org structure for ${description || 'this company'}. ` +
          `Return ONLY a JSON array (no prose) of 3-7 divisions, each like ` +
          `{"name":"Division name","lead":"Manager title","juniors":["Role 1","Role 2"]}.\n` +
          groundingContext(),
      )
      const arr = parseJsonArray(reply)
      if (Array.isArray(arr) && arr.length) {
        const next = toDivisions(arr)
        setDivisions(next)
        setLastDraft({ topTitle, divisions: next })
      } else {
        setSamError("Couldn't read Sam's suggestion — please fill the divisions in manually.")
      }
    } catch (e) {
      setSamError(e.message || 'Sam unavailable')
    } finally {
      setSamBusy(false)
    }
  }

  // In-session learning: send Sam its draft + your edits and ask it to refine
  // the whole structure consistently with the changes you made.
  async function samRefineDivisions() {
    setSamBusy(true)
    setSamError('')
    try {
      const current = divisions.filter(d => (d.name || '').trim())
      const reply = await askSam(
        `You previously drafted this org structure:\n${JSON.stringify(lastDraft?.divisions || [])}\n` +
          `The user edited it to:\n${JSON.stringify(current)}\n` +
          `Learn from their edits and return an improved, consistent FULL structure as ONLY a ` +
          `JSON array of {"name","lead","juniors":[...]} — keep their changes, apply the same ` +
          `naming style everywhere, and fill any obvious gaps.\n` +
          groundingContext(),
      )
      const arr = parseJsonArray(reply)
      if (Array.isArray(arr) && arr.length) {
        const next = toDivisions(arr)
        setDivisions(next)
        setLastDraft({ topTitle, divisions: next })
      } else {
        setSamError("Couldn't read Sam's refinement — your edits are unchanged.")
      }
    } catch (e) {
      setSamError(e.message || 'Sam unavailable')
    } finally {
      setSamBusy(false)
    }
  }

  const filledDivisions = divisions.filter(d => (d.name || '').trim() || (d.lead || '').trim())
  const canFinish = !!name.trim() && !!topTitle.trim() && filledDivisions.length > 0

  const finish = () => {
    if (!canFinish) return
    const finalStruct = {
      chartType,
      industry: industryName || null,
      subcategory: subName || null,
      topTitle: topTitle.trim(),
      divisions: filledDivisions,
    }
    // Pass the draft-vs-final feedback (for learning) plus the chosen
    // category/subcategory ids so the new chart can be classified.
    onComplete(name.trim(), buildSnapshot(chartType, { topTitle, divisions }), {
      description: description.trim() || null,
      draft: lastDraft,
      final: finalStruct,
      categoryId: industryId ? Number(industryId) : null,
      subcategoryId: subcategoryId ? Number(subcategoryId) : null,
    })
  }

  const TOTAL = 7
  const canProceed =
    step === 2
      ? !!name.trim()
      : step === 5
        ? !!topTitle.trim()
        : step === 6
          ? filledDivisions.length > 0
          : true

  // Shared big-lettering styles for the one-question-per-step modals.
  const qHeading = 'text-2xl font-bold text-slate-800'
  const qHelp = 'mt-3 text-base text-slate-500 leading-snug'
  const bigInput =
    'w-full border-2 border-slate-300 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-green-600'

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl min-h-[72vh] max-h-[94vh] flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4" style={{ backgroundColor: FG }}>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <SamIcon size={22} /> Org Chart Wizard
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/80">
              Step {step} of {TOTAL}
            </span>
            <button onClick={onClose} className="text-white/70 hover:text-white text-2xl leading-none">
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-8">
          {/* Step 1 — kind of chart */}
          {step === 1 && (
            <div>
              <h3 className={qHeading}>What kind of chart do you want?</h3>
              <div className="mt-5 space-y-3">
                {[
                  ['positions', 'Positions only', 'A hierarchy of job positions connected by reporting lines.'],
                  ['areas', 'Functions / areas only', 'Boxes for the areas/functions of the business — no individual positions.'],
                  ['combination', 'Combination', 'Business areas, each led by a position, with junior roles inside.'],
                ].map(([v, lab, desc]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setChartType(v)}
                    className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-colors ${
                      chartType === v
                        ? 'border-green-600 bg-green-50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`block text-lg font-semibold ${
                        chartType === v ? 'text-green-800' : 'text-slate-800'
                      }`}
                    >
                      {lab}
                    </span>
                    <span className="block text-sm text-slate-500 mt-0.5">{desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2 — chart name */}
          {step === 2 && (
            <div>
              <h3 className={qHeading}>What should we name this chart?</h3>
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && canProceed && setStep(s => s + 1)}
                placeholder="e.g. Operations 2026"
                className={`mt-5 ${bigInput}`}
              />
            </div>
          )}

          {/* Step 3 — industry + sub-sector */}
          {step === 3 && (
            <div>
              <h3 className={qHeading}>What industry is this for?</h3>
              <p className={qHelp}>Helps Sam tailor its suggestions. Optional.</p>
              {industries.length === 0 ? (
                <p className="mt-5 text-base text-slate-400 italic">
                  No industries set up yet — you can add them in Org Chart → Settings.
                </p>
              ) : (
                <div className="mt-5 space-y-4">
                  <div>
                    <label className="block text-base font-semibold text-slate-700 mb-1">Industry</label>
                    <select
                      value={industryId}
                      onChange={e => {
                        setIndustryId(e.target.value)
                        setSubcategoryId('')
                      }}
                      className={bigInput}
                    >
                      <option value="">— Any / not specified —</option>
                      {industries.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-base font-semibold text-slate-700 mb-1">
                      Sub-sector
                    </label>
                    <select
                      value={subcategoryId}
                      onChange={e => setSubcategoryId(e.target.value)}
                      disabled={!industryId || subsForIndustry.length === 0}
                      className={`${bigInput} disabled:bg-slate-50 disabled:text-slate-400`}
                    >
                      <option value="">
                        {!industryId
                          ? '— Pick an industry first —'
                          : subsForIndustry.length === 0
                            ? '— None available —'
                            : '— Any / not specified —'}
                      </option>
                      {subsForIndustry.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4 — description */}
          {step === 4 && (
            <div>
              <h3 className={qHeading}>Describe your business</h3>
              <p className={qHelp}>
                A sentence or two gives Sam context for its suggestions. Optional.
              </p>
              <textarea
                autoFocus
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
                placeholder="e.g. a mid-sized firm of about 40 staff with field crews and an office team"
                className={`mt-5 ${bigInput}`}
              />
            </div>
          )}

          {/* Step 5 — top of the org */}
          {step === 5 && (
            <div>
              <h3 className={qHeading}>
                {chartType === 'areas' ? 'What is the top area / function?' : 'Who is at the top?'}
              </h3>
              <div className="mt-5 flex gap-3">
                <input
                  autoFocus
                  value={topTitle}
                  onChange={e => setTopTitle(e.target.value)}
                  placeholder={chartType === 'areas' ? 'e.g. Organization' : 'e.g. President'}
                  className={`flex-1 ${bigInput}`}
                />
                <button
                  type="button"
                  onClick={samSuggestTop}
                  disabled={samBusy}
                  className="px-4 rounded-xl border-2 border-green-600 text-green-700 hover:bg-green-50 disabled:opacity-50 whitespace-nowrap inline-flex items-center gap-2 text-base font-medium"
                >
                  <SamIcon size={20} /> Ask Sam
                </button>
              </div>
            </div>
          )}

          {/* Step 6 — divisions / roles */}
          {step === 6 && (
            <div>
              <div className="flex items-start justify-between gap-3">
                <h3 className={qHeading}>
                  {chartType === 'positions'
                    ? 'Positions & reporting'
                    : chartType === 'areas'
                      ? 'Functions / areas'
                      : 'Divisions & roles'}
                </h3>
                <div className="flex gap-2 flex-shrink-0">
                  {lastDraft && (
                    <button
                      type="button"
                      onClick={samRefineDivisions}
                      disabled={samBusy}
                      className="px-3 py-2 text-sm rounded-md border border-green-600 text-green-700 hover:bg-green-50 disabled:opacity-50 inline-flex items-center gap-1.5"
                      title="Send Sam your edits and let it refine the whole structure"
                    >
                      <SamIcon size={16} /> Refine with my changes
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={samDraftDivisions}
                    disabled={samBusy}
                    className="px-3 py-2 text-sm rounded-md border border-green-600 text-green-700 hover:bg-green-50 disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <SamIcon size={16} /> {samBusy ? 'Asking Sam…' : 'Ask Sam to draft these'}
                  </button>
                </div>
              </div>
              <p className={qHelp}>
                {chartType === 'positions'
                  ? 'Each row is a position reporting to the top. List the positions reporting to it (comma-separated).'
                  : chartType === 'areas'
                    ? 'Each row is a business function/area. List its sub-functions (comma-separated).'
                    : 'Each division becomes an area led by the manager you name, with its junior roles attached beneath it (comma-separated).'}
              </p>
              <div className="mt-4 space-y-3">
                {divisions.map((d, i) => (
                  <div key={i} className="border border-slate-200 rounded-lg p-3 space-y-2">
                    <div className="flex gap-2">
                      <input
                        value={d.name}
                        onChange={e => setDiv(i, { name: e.target.value })}
                        placeholder={
                          chartType === 'positions'
                            ? 'Position title (e.g. Operations Manager)'
                            : chartType === 'areas'
                              ? 'Function / area name (e.g. Operations)'
                              : 'Division / area name (e.g. Operations)'
                        }
                        className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-base"
                      />
                      <button
                        type="button"
                        onClick={() => removeDiv(i)}
                        className="text-red-500 hover:text-red-700 text-sm px-2"
                      >
                        Remove
                      </button>
                    </div>
                    {chartType === 'combination' && (
                      <input
                        value={d.lead}
                        onChange={e => setDiv(i, { lead: e.target.value })}
                        placeholder="Lead position (e.g. Operations Manager)"
                        className="w-full border border-slate-300 rounded-md px-3 py-2 text-base"
                      />
                    )}
                    <input
                      value={d.juniors}
                      onChange={e => setDiv(i, { juniors: e.target.value })}
                      placeholder={
                        chartType === 'positions'
                          ? 'Reports to this position, comma-separated (e.g. Foreman, Crew Lead)'
                          : chartType === 'areas'
                            ? 'Sub-functions, comma-separated (e.g. Scheduling, Dispatch)'
                            : 'Junior roles, comma-separated (e.g. Foreman, Crew Lead)'
                      }
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-base"
                    />
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addDiv}
                className="mt-3 text-base font-medium hover:underline"
                style={{ color: FG }}
              >
                {chartType === 'positions'
                  ? '+ Add position'
                  : chartType === 'areas'
                    ? '+ Add function'
                    : '+ Add division'}
              </button>
            </div>
          )}

          {/* Step 7 — review */}
          {step === 7 && (
            <div>
              <h3 className={qHeading}>Review &amp; create</h3>
              <div className="mt-5 text-base text-slate-700 space-y-2">
                <p>
                  <span className="text-slate-400">Chart:</span> <b>{name || '(unnamed)'}</b>
                </p>
                <p>
                  <span className="text-slate-400">Top:</span> <b>{topTitle || '(none)'}</b>
                </p>
                <ul className="border border-slate-200 rounded-md divide-y divide-slate-100">
                  {filledDivisions.map((d, i) => (
                    <li key={i} className="px-3 py-2">
                      <p className="font-medium text-slate-800">
                        {d.name}
                        {d.lead ? <span className="text-slate-500"> — {d.lead}</span> : null}
                      </p>
                      {d.juniors?.trim() && <p className="text-sm text-slate-500">{d.juniors}</p>}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-4 text-sm text-amber-600 leading-snug">
                When the chart is created, any positions here that aren't in your HR positions
                list will be added (you'll get a confirmation first).
              </p>
            </div>
          )}

          {samError && <p className="mt-4 text-sm text-amber-600">{samError}</p>}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => (step === 1 ? onClose() : setStep(s => s - 1))}
            className="px-4 py-2 text-base text-slate-600 hover:bg-slate-100 rounded-md"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          {step < TOTAL ? (
            <button
              type="button"
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed}
              className="px-6 py-2 text-base bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              disabled={!canFinish}
              className="px-6 py-2 text-base text-white rounded-md disabled:opacity-50"
              style={{ backgroundColor: FG }}
            >
              Create Chart
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
