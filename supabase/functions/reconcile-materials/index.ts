// supabase/functions/reconcile-materials/index.ts
//
// Sam ranks whether an incoming item (e.g. a price-sheet line, or a possible
// duplicate row) is the SAME physical product as one of a small shortlist of
// candidate material_rates rows (pre-filtered client-side by fuzzy score).
// Extraction/reasoning only — it never writes to the DB. The app shows Sam's
// suggestion and the user confirms the merge.
//
// Request (POST):
//   { items: [ { index: number,
//                name: string, sku?, category?, sub_category?, unit?, price?,
//                candidates: [ { id: string, name, sku?, category?, sub_category?,
//                                unit_cost?, has_photo?: boolean } ] } ],
//     instructions?: string }
// Response (200):
//   { matches: [ { index, candidate_id: string|null, confidence: number, reason } ] }
//
// Auth: requires the caller's Supabase session JWT.
// Deploy: supabase functions deploy reconcile-materials --no-verify-jwt=false
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } })
}

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'
const MODEL = 'claude-sonnet-4-5'
const MAX_ITEMS = 80

const TOOL = {
  name: 'reconcile_matches',
  description: 'For each incoming item, pick the candidate that is the SAME physical product, or none.',
  input_schema: {
    type: 'object',
    properties: {
      matches: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            index: { type: 'integer', description: 'The item index being matched.' },
            candidate_id: { type: ['string', 'null'], description: 'The id of the matching candidate, or null if none is clearly the same product.' },
            confidence: { type: 'number', description: '0..1 confidence that candidate_id is the same product.' },
            reason: { type: 'string', description: 'Short justification (size/color/grade/brand cues).' },
          },
          required: ['index', 'candidate_id', 'confidence'],
        },
      },
    },
    required: ['matches'],
  },
}

const SYSTEM = `You are Sam, a materials data steward for a landscaping/construction company. You reconcile INCOMING items against a shortlist of CANDIDATE existing materials to find TRUE duplicates — the same physical product that should be one record.

Rules:
- Match only when the candidate is the SAME product: same base product AND same distinguishing size/dimensions/color/grade/finish. Brand prefixes (e.g. "Belgard") and filler words may differ and can be ignored.
- Do NOT match different colors, sizes, thicknesses, or grades — those are distinct products. When unsure, prefer candidate_id = null.
- An exact or near-exact SKU is strong evidence of a match.
- Give a calibrated confidence 0..1. Use >=0.85 only when size/color/grade clearly align. Use <=0.5 when it's a guess.
- Return exactly one entry per incoming item via the reconcile_matches tool. Emit no prose.`

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  try {
    const { items, instructions } = await req.json().catch(() => ({}))
    if (!Array.isArray(items) || !items.length) return json({ error: 'Provide items[] to reconcile.' }, 400)

    const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    const { data: userData } = await admin.auth.getUser(jwt)
    if (!userData?.user) return json({ error: 'Not signed in.' }, 401)
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) return json({ error: 'AI is not configured (ANTHROPIC_API_KEY missing).' }, 500)

    const trimmed = items.slice(0, MAX_ITEMS).map((it: any, i: number) => ({
      index: Number.isFinite(it.index) ? it.index : i,
      name: String(it.name || '').slice(0, 200),
      sku: it.sku ? String(it.sku).slice(0, 80) : undefined,
      category: it.category ? String(it.category).slice(0, 80) : undefined,
      sub_category: it.sub_category ? String(it.sub_category).slice(0, 120) : undefined,
      unit: it.unit ? String(it.unit).slice(0, 40) : undefined,
      price: it.price == null ? undefined : it.price,
      candidates: (Array.isArray(it.candidates) ? it.candidates : []).slice(0, 6).map((c: any) => ({
        id: String(c.id),
        name: String(c.name || '').slice(0, 200),
        sku: c.sku ? String(c.sku).slice(0, 80) : undefined,
        category: c.category ? String(c.category).slice(0, 80) : undefined,
        sub_category: c.sub_category ? String(c.sub_category).slice(0, 120) : undefined,
        unit_cost: c.unit_cost == null ? undefined : c.unit_cost,
        has_photo: !!c.has_photo,
      })),
    }))

    const hints: string[] = []
    if (instructions && String(instructions).trim()) hints.push(`User instructions: ${String(instructions).slice(0, 1000)}`)
    hints.push('Reconcile each item against its candidates now via the reconcile_matches tool.')

    const content = [
      { type: 'text', text: `=== ITEMS + CANDIDATES (JSON) ===\n${JSON.stringify(trimmed).slice(0, 100000)}` },
      { type: 'text', text: hints.join('\n') },
    ]

    const body = {
      model: MODEL,
      max_tokens: 8000,
      system: SYSTEM,
      tools: [TOOL],
      tool_choice: { type: 'tool', name: 'reconcile_matches' },
      messages: [{ role: 'user', content }],
    }

    let data: any = null
    let lastErr = ''
    for (let attempt = 0; attempt <= 3; attempt++) {
      const res = await fetch(ANTHROPIC_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': ANTHROPIC_VERSION },
        body: JSON.stringify(body),
      })
      if (res.ok) { data = await res.json(); break }
      lastErr = `${res.status}: ${(await res.text()).slice(0, 400)}`
      console.error('[reconcile] anthropic error', lastErr)
      const transient = res.status === 529 || res.status === 429 || res.status >= 500
      if (!transient || attempt === 3) return json({ error: `AI error ${lastErr}` }, 502)
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)))
    }

    const toolBlock = (data?.content || []).find((b: any) => b?.type === 'tool_use' && b?.name === 'reconcile_matches')
    const out = toolBlock?.input
    if (!out || !Array.isArray(out.matches)) {
      console.error('[reconcile] no matches; stop_reason=', data?.stop_reason)
      return json({ error: 'The AI did not return usable matches.' }, 502)
    }

    const matches = out.matches.map((m: any) => ({
      index: Number.isFinite(m.index) ? m.index : null,
      candidate_id: m.candidate_id ? String(m.candidate_id) : null,
      confidence: typeof m.confidence === 'number' ? Math.max(0, Math.min(1, m.confidence)) : 0,
      reason: m.reason ? String(m.reason).slice(0, 300) : '',
    }))

    return json({ matches })
  } catch (e) {
    console.error('[reconcile] unhandled', String((e as Error)?.stack || e))
    return json({ error: String((e as Error)?.message || e) }, 500)
  }
})
