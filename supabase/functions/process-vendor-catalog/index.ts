// supabase/functions/process-vendor-catalog/index.ts
//
// Sam reads an uploaded vendor CATALOG (PDF or image) and returns every product
// as a structured item, INCLUDING where each item's photo sits on the page so
// the app can crop it out and attach it. Pricing is optional (catalogs often
// have none). Extraction only — no DB writes; the app reviews + crops + saves.
//
// Request (POST): { file_path?, text?, vendor_name?, instructions? }
// Response (200):
//   { vendor_name, items: [{ name, category, sub_category, unit, unit_price,
//                            sku, description, page, photo_box:{x,y,w,h} }] }
//   photo_box is normalized 0..1 of the page (top-left origin); page is 1-based.
//
// Auth: requires the caller's Supabase session JWT.
// Deploy: supabase functions deploy process-vendor-catalog
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
const MAX_TEXT = 80_000

const TOOL = {
  name: 'extract_catalog',
  description: 'Return every product in the vendor catalog, with the location of each item photo.',
  input_schema: {
    type: 'object',
    properties: {
      vendor_name: { type: 'string', description: 'Vendor/brand name on the catalog, if present.' },
      items: {
        type: 'array',
        description: 'One entry per distinct product shown in the catalog.',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Product name exactly as printed.' },
            category: { type: 'string', description: 'Broad category if evident (e.g. Paver, Lighting, Tile), else omit.' },
            sub_category: { type: 'string', description: 'Collection / series / group if evident, else omit.' },
            unit: { type: 'string', description: 'Pricing/measure unit if shown (SF, each, LF, ton, pallet), else omit.' },
            unit_price: { type: 'number', description: 'Price per unit if the catalog shows one (many do not) — omit if absent.' },
            sku: { type: 'string', description: 'SKU / item code if shown, else omit.' },
            description: { type: 'string', description: 'A short spec/size/color note if useful, else omit.' },
            page: { type: 'integer', description: '1-based page number the item appears on.' },
            photo_box: {
              type: 'object',
              description: 'Normalized bounding box (fractions 0..1 of the page, top-left origin) tightly around THIS item\'s product photo. Omit the whole photo_box if the item has no picture.',
              properties: {
                x: { type: 'number' }, y: { type: 'number' }, w: { type: 'number' }, h: { type: 'number' },
              },
              required: ['x', 'y', 'w', 'h'],
            },
          },
          required: ['name'],
        },
      },
    },
    required: ['items'],
  },
}

const SYSTEM = `You are a data-extraction assistant for a landscaping/construction company. You receive a VENDOR PRODUCT CATALOG (image or PDF) and must extract every distinct product.

Rules:
- One entry per product. Capture the name exactly as printed. Include category / sub_category (collection or series) / unit / SKU / a short description when the catalog makes them clear; otherwise omit those fields.
- Pricing is usually ABSENT in a catalog — only include unit_price when a real price is printed. Never invent a price.
- For each product that has a PRODUCT PHOTO, give its location: the 1-based page number and photo_box = a tight normalized bounding box (x, y, w, h as fractions 0..1 of that page, top-left origin) around just that item's image. If a product has no picture, omit photo_box (and still return the item).
- Ignore covers, tables of contents, legal/marketing pages, and anything that isn't a real product.
- Be terse to fit the whole catalog: omit description/sku/unit unless clearly present, and round photo_box numbers to 2 decimals. Do not repeat text.
- Always return via the extract_catalog tool. Emit no prose.`

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
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  return btoa(binary)
}
const numOrU = (v: unknown) => (v == null || v === '' ? undefined : Number(v))

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  try {
    const { file_path, text, vendor_name, instructions } = await req.json().catch(() => ({}))
    const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    const { data: userData } = await admin.auth.getUser(jwt)
    if (!userData?.user) return json({ error: 'Not signed in.' }, 401)
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) return json({ error: 'AI is not configured (ANTHROPIC_API_KEY missing).' }, 500)

    const content: Array<Record<string, unknown>> = []
    if (file_path) {
      const media = mediaTypeFor(String(file_path))
      if (!media) return json({ error: 'Unsupported file type. Upload a PDF or image.' }, 400)
      const { data: blob, error: dlErr } = await admin.storage.from('vendor-catalogs').download(String(file_path))
      if (dlErr || !blob) {
        console.error('[catalog] download failed', file_path, dlErr?.message)
        return json({ error: `Could not read the uploaded file: ${dlErr?.message || 'not found'}` }, 400)
      }
      const b64 = toBase64(new Uint8Array(await blob.arrayBuffer()))
      if (media === 'application/pdf') content.push({ type: 'document', source: { type: 'base64', media_type: media, data: b64 } })
      else content.push({ type: 'image', source: { type: 'base64', media_type: media, data: b64 } })
    } else if (text && String(text).trim()) {
      content.push({ type: 'text', text: `=== CATALOG (text) ===\n${String(text).slice(0, MAX_TEXT)}` })
    } else {
      return json({ error: 'Provide a file_path or text to extract.' }, 400)
    }
    const hints: string[] = []
    if (vendor_name) hints.push(`Vendor hint: ${vendor_name}`)
    if (instructions && String(instructions).trim()) hints.push(`User instructions: ${String(instructions).slice(0, 2000)}`)
    hints.push('Extract every product now by calling the extract_catalog tool.')
    content.push({ type: 'text', text: hints.join('\n') })

    const body = {
      model: MODEL,
      max_tokens: 32000,
      system: SYSTEM,
      tools: [TOOL],
      tool_choice: { type: 'tool', name: 'extract_catalog' },
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
      lastErr = `${res.status}: ${(await res.text()).slice(0, 500)}`
      console.error('[catalog] anthropic error', lastErr)
      const transient = res.status === 529 || res.status === 429 || res.status >= 500
      if (!transient || attempt === 3) return json({ error: `AI error ${lastErr}` }, 502)
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)))
    }

    const toolBlock = (data?.content || []).find((b: any) => b?.type === 'tool_use' && b?.name === 'extract_catalog')
    const out = toolBlock?.input
    if (!out || !Array.isArray(out.items)) {
      console.error('[catalog] no usable items; stop_reason=', data?.stop_reason, 'content=', JSON.stringify(data?.content || '').slice(0, 500))
      const tooBig = data?.stop_reason === 'max_tokens'
      return json({
        error: tooBig
          ? 'This catalog is too large to read in one pass. Split it into smaller sections (e.g. by product line or a page range) and import each separately.'
          : 'The AI did not return usable items.',
      }, 502)
    }

    const items = out.items
      .filter((r: any) => r && r.name)
      .map((r: any) => {
        const box = r.photo_box
        const validBox =
          box && [box.x, box.y, box.w, box.h].every((v: any) => typeof v === 'number' && v >= 0 && v <= 1) && box.w > 0 && box.h > 0
        return {
          name: String(r.name).trim().slice(0, 200),
          category: r.category ? String(r.category).trim().slice(0, 80) : null,
          sub_category: r.sub_category ? String(r.sub_category).trim().slice(0, 120) : null,
          unit: r.unit ? String(r.unit).trim().slice(0, 40) : null,
          unit_price: numOrU(r.unit_price) ?? null,
          sku: r.sku ? String(r.sku).trim().slice(0, 80) : null,
          description: r.description ? String(r.description).trim().slice(0, 300) : null,
          page: Number.isFinite(r.page) ? Math.max(1, Math.round(r.page)) : (validBox ? 1 : null),
          photo_box: validBox ? { x: box.x, y: box.y, w: box.w, h: box.h } : null,
        }
      })

    return json({
      vendor_name: out.vendor_name ? String(out.vendor_name).slice(0, 120) : (vendor_name || null),
      items,
    })
  } catch (e) {
    console.error('[catalog] unhandled error', String((e as Error)?.stack || e))
    return json({ error: String((e as Error)?.message || e) }, 500)
  }
})
