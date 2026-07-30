// supabase/functions/process-price-sheet/index.ts
//
// Sam reads an uploaded vendor price sheet (PDF or image, or pre-extracted
// text) and returns its priced line items as structured rows. This function
// ONLY extracts — it never writes to the database. The app shows the rows in a
// review/diff screen and the admin approves before anything touches
// material_rates or material_price_history (the actual write happens under the
// user's own RLS session).
//
// Request (POST):
//   { file_path?: string,   // path in the 'price-sheets' storage bucket
//     text?: string,        // OR pre-extracted text (e.g. CSV/xlsx → text)
//     vendor_name?: string, // optional hint
//     effective_date?: string }
// Response (200):
//   { rows: [{ item, unit, unit_price, sku, notes }], vendor_name, effective_date }
//
// Auth: requires the caller's Supabase session JWT.
// Deploy: supabase functions deploy process-price-sheet
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'content-type': 'application/json' },
  })
}

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'
const MODEL = 'claude-sonnet-4-5'
const MAX_TEXT = 80_000

const TOOL = {
  name: 'extract_price_sheet',
  description: 'Return every priced line item found on the vendor price sheet.',
  input_schema: {
    type: 'object',
    properties: {
      rows: {
        type: 'array',
        description: 'One entry per priced material/product line on the sheet.',
        items: {
          type: 'object',
          properties: {
            item: { type: 'string', description: 'Product/material name exactly as printed.' },
            unit: { type: 'string', description: 'Pricing unit, e.g. ton, each, sqft, LF, yard, bag, pallet, roll.' },
            unit_price: { type: 'number', description: 'Numeric price per unit (no currency symbol).' },
            sku: { type: 'string', description: 'SKU / item code if shown, else omit.' },
            notes: { type: 'string', description: 'Any size/color/qualifier that distinguishes this line, else omit.' },
          },
          required: ['item', 'unit_price'],
        },
      },
      vendor_name: { type: 'string', description: 'Vendor/supplier name printed on the sheet, if present.' },
      effective_date: { type: 'string', description: 'Effective/quote date on the sheet in YYYY-MM-DD, if present.' },
    },
    required: ['rows'],
  },
}

const SYSTEM = `You are a data-extraction assistant for a landscaping/construction company. You receive a vendor PRICE SHEET (as an image, PDF, or plain text) and must extract every priced line item.

Rules:
- One row per priced material/product. Capture the item name exactly as printed.
- unit_price is the numeric price per unit — strip currency symbols and commas.
- unit is the pricing unit (ton, each/ea, sqft, LF, yard/CY, bag, pallet, roll, etc.). If not explicit, infer the most likely unit; if truly unknown use "each".
- Include a size/color/grade qualifier in notes when it distinguishes otherwise-similar lines.
- Ignore headers, subtotals, totals, terms, freight/delivery notes, and page furniture — only real priced products.
- Do not invent items or prices. If a line has no clear price, skip it.
- Always return the result by calling the extract_price_sheet tool. Emit no prose.`

function mediaTypeFor(path: string): string | null {
  const p = path.toLowerCase()
  if (p.endsWith('.pdf')) return 'application/pdf'
  if (p.endsWith('.png')) return 'image/png'
  if (p.endsWith('.jpg') || p.endsWith('.jpeg')) return 'image/jpeg'
  if (p.endsWith('.webp')) return 'image/webp'
  if (p.endsWith('.gif')) return 'image/gif'
  return null
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  try {
    const { file_path, text, vendor_name, effective_date } = await req.json().catch(() => ({}))

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    const { data: userData } = await admin.auth.getUser(jwt)
    if (!userData?.user) return json({ error: 'Not signed in.' }, 401)

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) return json({ error: 'AI is not configured (ANTHROPIC_API_KEY missing).' }, 500)

    // ── Build the user content: a document/image block or plain text ──────────
    const content: Array<Record<string, unknown>> = []
    if (file_path) {
      const media = mediaTypeFor(String(file_path))
      if (!media) return json({ error: 'Unsupported file type. Upload a PDF or image, or send extracted text.' }, 400)
      const { data: blob, error: dlErr } = await admin.storage.from('price-sheets').download(String(file_path))
      if (dlErr || !blob) return json({ error: `Could not read the uploaded file: ${dlErr?.message || 'not found'}` }, 400)
      const b64 = toBase64(new Uint8Array(await blob.arrayBuffer()))
      if (media === 'application/pdf') {
        content.push({ type: 'document', source: { type: 'base64', media_type: media, data: b64 } })
      } else {
        content.push({ type: 'image', source: { type: 'base64', media_type: media, data: b64 } })
      }
    } else if (text && String(text).trim()) {
      content.push({ type: 'text', text: `=== PRICE SHEET (text) ===\n${String(text).slice(0, MAX_TEXT)}` })
    } else {
      return json({ error: 'Provide a file_path or text to extract.' }, 400)
    }
    const hints: string[] = []
    if (vendor_name) hints.push(`Vendor hint: ${vendor_name}`)
    if (effective_date) hints.push(`Effective date hint: ${effective_date}`)
    hints.push('Extract every priced line item now by calling the extract_price_sheet tool.')
    content.push({ type: 'text', text: hints.join('\n') })

    const body = {
      model: MODEL,
      max_tokens: 8192,
      system: SYSTEM,
      tools: [TOOL],
      tool_choice: { type: 'tool', name: 'extract_price_sheet' },
      messages: [{ role: 'user', content }],
    }

    let data: any = null
    let lastErr = ''
    for (let attempt = 0; attempt <= 3; attempt++) {
      const res = await fetch(ANTHROPIC_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        data = await res.json()
        break
      }
      lastErr = `${res.status}: ${(await res.text()).slice(0, 300)}`
      const transient = res.status === 529 || res.status === 429 || res.status >= 500
      if (!transient || attempt === 3) return json({ error: `AI error ${lastErr}` }, 502)
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)))
    }

    const toolBlock = (data?.content || []).find(
      (b: any) => b?.type === 'tool_use' && b?.name === 'extract_price_sheet'
    )
    const out = toolBlock?.input
    if (!out || !Array.isArray(out.rows))
      return json({ error: 'The AI did not return usable rows. Try a clearer scan or send the text.' }, 502)

    const rows = out.rows
      .filter((r: any) => r && r.item && (r.unit_price != null && r.unit_price !== ''))
      .map((r: any) => ({
        item: String(r.item).trim().slice(0, 200),
        unit: String(r.unit || 'each').trim().slice(0, 40),
        unit_price: Number(r.unit_price) || 0,
        sku: r.sku ? String(r.sku).trim().slice(0, 80) : null,
        notes: r.notes ? String(r.notes).trim().slice(0, 200) : null,
      }))

    return json({
      rows,
      vendor_name: out.vendor_name ? String(out.vendor_name).slice(0, 120) : (vendor_name || null),
      effective_date: out.effective_date ? String(out.effective_date).slice(0, 10) : (effective_date || null),
    })
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500)
  }
})
