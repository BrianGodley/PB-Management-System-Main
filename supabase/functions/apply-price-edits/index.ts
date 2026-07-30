// supabase/functions/apply-price-edits/index.ts
//
// Applies a plain-language edit instruction to a set of already-extracted
// price-sheet rows and returns the modified rows. Used by the price-sheet
// importer's "Description" custom-change box, e.g.
//   "the ones with Plastic in the name → set unit to roll".
// Extraction/transform only — no DB writes; the app merges the result and the
// admin still approves before anything is saved.
//
// Request (POST): { instruction: string, rows: [{ item, unit, unit_price, notes }] }
// Response (200): { rows: [{ item, unit, unit_price, notes }] }  // only changed rows
//
// Auth: requires the caller's Supabase session JWT.
// Deploy: supabase functions deploy apply-price-edits
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

const TOOL = {
  name: 'return_edits',
  description: 'Return ONLY the rows that the instruction changes, with their new values.',
  input_schema: {
    type: 'object',
    properties: {
      rows: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            item: { type: 'string', description: 'The item name, matching the input exactly (used to map the edit back).' },
            unit: { type: 'string', description: 'New unit, if changed.' },
            unit_price: { type: 'number', description: 'New unit price, if changed.' },
            notes: { type: 'string', description: 'New notes, if changed.' },
          },
          required: ['item'],
        },
      },
    },
    required: ['rows'],
  },
}

const SYSTEM = `You edit a list of price-sheet line items according to a plain-language instruction from the user.

Rules:
- Apply the instruction ONLY to the items it clearly targets. Leave everything else alone.
- Return ONLY the items you changed, each with its item name (copied EXACTLY from the input so it can be matched back) and the fields you changed (unit, unit_price, and/or notes).
- Never invent items. Never change an item the instruction doesn't clearly refer to.
- Prices are plain numbers (no symbols).
- Always return via the return_edits tool. Emit no prose.`

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  try {
    const { instruction, rows } = await req.json().catch(() => ({}))
    if (!instruction || !String(instruction).trim()) return json({ error: 'Provide an instruction.' }, 400)
    if (!Array.isArray(rows) || rows.length === 0) return json({ error: 'No rows to edit.' }, 400)

    const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    const { data: userData } = await admin.auth.getUser(jwt)
    if (!userData?.user) return json({ error: 'Not signed in.' }, 401)

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) return json({ error: 'AI is not configured (ANTHROPIC_API_KEY missing).' }, 500)

    const body = {
      model: MODEL,
      max_tokens: 8192,
      system: SYSTEM,
      tools: [TOOL],
      tool_choice: { type: 'tool', name: 'return_edits' },
      messages: [
        {
          role: 'user',
          content:
            `INSTRUCTION:\n${String(instruction).slice(0, 2000)}\n\n` +
            `ITEMS (JSON):\n${JSON.stringify(rows).slice(0, 60000)}\n\n` +
            `Return only the changed items via the return_edits tool.`,
        },
      ],
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
      lastErr = `${res.status}: ${(await res.text()).slice(0, 300)}`
      const transient = res.status === 529 || res.status === 429 || res.status >= 500
      if (!transient || attempt === 3) return json({ error: `AI error ${lastErr}` }, 502)
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)))
    }

    const toolBlock = (data?.content || []).find((b: any) => b?.type === 'tool_use' && b?.name === 'return_edits')
    const out = toolBlock?.input
    if (!out || !Array.isArray(out.rows)) return json({ error: 'The AI did not return usable edits.' }, 502)

    const edits = out.rows
      .filter((r: any) => r && r.item)
      .map((r: any) => ({
        item: String(r.item).trim().slice(0, 200),
        unit: r.unit != null ? String(r.unit).trim().slice(0, 40) : undefined,
        unit_price: r.unit_price != null ? Number(r.unit_price) : undefined,
        notes: r.notes != null ? String(r.notes).trim().slice(0, 200) : undefined,
      }))

    return json({ rows: edits })
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500)
  }
})
