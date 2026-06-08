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

// Build the template-shaped snapshot from the collected answers.
function buildSnapshot({ topTitle, divisions }) {
  const nodes = []
  const edges = []
  nodes.push({
    ref: 'top',
    kind: 'position',
    label: '',
    position_title: (topTitle || '').trim() || 'Leader',
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
  })
  divisions
    .filter(d => (d.name || '').trim())
    .forEach((d, i) => {
      const dref = `div${i}`
      nodes.push({
        ref: dref,
        kind: 'container',
        label: d.name.trim(),
        position_title: (d.lead || '').trim() || null,
        heading: null,
        bg_color: CONTAINER_COLORS[i % CONTAINER_COLORS.length].bg,
        box_style: { fill: 'border', borderWidth: 2 },
        container_mode: 'independent',
        parent_ref: null,
        attached_ref: null,
        attachment_side: null,
        width: 210,
        height: 90,
        font_sizes: {},
        text_styles: {},
        x_offset: 0,
        tier: 1,
        tier_order: i,
      })
      edges.push({
        source_ref: 'top',
        target_ref: dref,
        relationship: 'reports_to',
        style: 'solid',
        bus_offset: null,
      })
      ;(d.juniors || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .forEach((j, k) => {
          nodes.push({
            ref: `${dref}_j${k}`,
            kind: 'position',
            label: '',
            position_title: j,
            heading: null,
            bg_color: null,
            box_style: {},
            container_mode: null,
            parent_ref: dref,
            attached_ref: null,
            attachment_side: null,
            width: 110,
            height: 40,
            font_sizes: {},
            text_styles: {},
            x_offset: 0,
            tier: 2,
            tier_order: k,
          })
        })
    })
  return { nodes, edges }
}

export default function OrgChartWizard({
  initialName,
  positionTitles = [],
  priorExamples = [],
  onClose,
  onComplete,
}) {
  const [step, setStep] = useState(1)
  const [name, setName] = useState(initialName || '')
  const [description, setDescription] = useState('')
  const [topTitle, setTopTitle] = useState('')
  const [divisions, setDivisions] = useState([blankDivision()])
  const [samBusy, setSamBusy] = useState(false)
  const [samError, setSamError] = useState('')
  // The last structure Sam drafted — used both for the in-session "refine"
  // step and stored alongside the user's final answers so Sam can learn from
  // the corrections next time.
  const [lastDraft, setLastDraft] = useState(null)

  // Grounding context handed to Sam so its suggestions reuse your real position
  // titles and follow how you've structured past charts.
  const groundingContext = () => {
    const parts = []
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
      const reply = await askSam(
        `For ${description || 'this company'}, what is the single most senior leadership ` +
          `position title at the top of its org chart? Reply with ONLY the title, no extra words.`,
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

  const filledDivisions = divisions.filter(d => (d.name || '').trim())
  const canFinish = !!name.trim() && !!topTitle.trim() && filledDivisions.length > 0

  const finish = () => {
    if (!canFinish) return
    const finalStruct = { topTitle: topTitle.trim(), divisions: filledDivisions }
    // Pass the draft-vs-final feedback so it can be stored for future learning.
    onComplete(name.trim(), buildSnapshot({ topTitle, divisions }), {
      description: description.trim() || null,
      draft: lastDraft,
      final: finalStruct,
    })
  }

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-3" style={{ backgroundColor: FG }}>
          <h2 className="text-base font-bold text-white">🧭 Org Chart Wizard — Step {step} of 3</h2>
          <button onClick={onClose} className="text-white/70 hover:text-white text-xl leading-none">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {step === 1 && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Chart name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Describe your company (helps Sam suggest a structure)
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                  placeholder="e.g. a residential landscaping company with ~40 staff"
                  className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Top leadership position
                </label>
                <div className="flex gap-2">
                  <input
                    value={topTitle}
                    onChange={e => setTopTitle(e.target.value)}
                    placeholder="e.g. President"
                    className="flex-1 border border-slate-300 rounded-md px-2 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={samSuggestTop}
                    disabled={samBusy}
                    className="px-3 py-1.5 text-sm rounded-md border border-green-600 text-green-700 hover:bg-green-50 disabled:opacity-50 whitespace-nowrap"
                  >
                    🤖 Ask Sam
                  </button>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-700">Divisions &amp; roles</p>
                <div className="flex gap-2">
                  {lastDraft && (
                    <button
                      type="button"
                      onClick={samRefineDivisions}
                      disabled={samBusy}
                      className="px-3 py-1.5 text-sm rounded-md border border-green-600 text-green-700 hover:bg-green-50 disabled:opacity-50"
                      title="Send Sam your edits and let it refine the whole structure"
                    >
                      🤖 Refine with my changes
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={samDraftDivisions}
                    disabled={samBusy}
                    className="px-3 py-1.5 text-sm rounded-md border border-green-600 text-green-700 hover:bg-green-50 disabled:opacity-50"
                  >
                    {samBusy ? 'Asking Sam…' : '🤖 Ask Sam to draft these'}
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                Each division becomes an area led by the manager you name, with its junior roles
                attached beneath it. Separate junior roles with commas.
              </p>
              <div className="space-y-3">
                {divisions.map((d, i) => (
                  <div key={i} className="border border-slate-200 rounded-lg p-3 space-y-2">
                    <div className="flex gap-2">
                      <input
                        value={d.name}
                        onChange={e => setDiv(i, { name: e.target.value })}
                        placeholder="Division / area name (e.g. Operations)"
                        className="flex-1 border border-slate-300 rounded-md px-2 py-1.5 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeDiv(i)}
                        className="text-red-500 hover:text-red-700 text-xs px-2"
                      >
                        Remove
                      </button>
                    </div>
                    <input
                      value={d.lead}
                      onChange={e => setDiv(i, { lead: e.target.value })}
                      placeholder="Lead position (e.g. Operations Manager)"
                      className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm"
                    />
                    <input
                      value={d.juniors}
                      onChange={e => setDiv(i, { juniors: e.target.value })}
                      placeholder="Junior roles, comma-separated (e.g. Foreman, Crew Lead)"
                      className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm"
                    />
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addDiv}
                className="text-sm font-medium hover:underline"
                style={{ color: FG }}
              >
                + Add division
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-sm font-semibold text-slate-700">Review</p>
              <div className="text-sm text-slate-700 space-y-2">
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
                      {d.juniors?.trim() && (
                        <p className="text-xs text-slate-500">{d.juniors}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-[11px] text-amber-600 leading-snug">
                When the chart is created, any positions here that aren't in your HR positions
                list will be added (you'll get a confirmation first).
              </p>
            </>
          )}

          {samError && <p className="text-xs text-amber-600">{samError}</p>}
        </div>

        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => (step === 1 ? onClose() : setStep(s => s - 1))}
            className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-md"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep(s => s + 1)}
              disabled={step === 1 && (!name.trim() || !topTitle.trim())}
              className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              disabled={!canFinish}
              className="px-4 py-1.5 text-sm text-white rounded-md disabled:opacity-50"
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
