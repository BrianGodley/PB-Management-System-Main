// supabase/functions/sam-public/index.ts
//
// PUBLIC, sandboxed "Chat with Sam" for the marketing site (logged-out visitors).
// This is DELIBERATELY ISOLATED from the in-app assistant (agent-chat):
//   • No tenant data, no tools, no auth — it can only answer questions about
//     SoftCake from a fixed system prompt.
//   • Service role is used ONLY for the per-IP rate-limit table.
//   • Cheap model (Haiku) + hard token/length caps + per-IP daily cap.
//   • Optional Cloudflare Turnstile check (enabled when TURNSTILE_SECRET is set).
//
// Deploy:  supabase functions deploy sam-public --no-verify-jwt
//          (and turn "Verify JWT" OFF for this function in the dashboard)
//
// SECRETS: ANTHROPIC_API_KEY (required), SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
//          (auto), TURNSTILE_SECRET (optional).

import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } })

const DAILY_CAP = 30            // messages per IP per day
const MAX_MESSAGE_CHARS = 1000  // per user message
const MAX_HISTORY = 6           // turns of context we accept from the client
const MODEL = 'claude-haiku-4-5-20251001'

// Fixed product knowledge — public Sam only knows what's here. No data sources.
const SYSTEM_PROMPT = `You are Sam, the friendly AI assistant for SoftCake — an all-in-one platform that helps any company run its whole business from one place.

You are talking to a PROSPECTIVE customer on the public marketing website. You have NO access to any account or company data. Only answer questions about SoftCake, what it does, pricing, and how to get started. If asked about anything unrelated (general knowledge, coding, other companies, personal advice, etc.), politely decline and steer back to SoftCake.

What SoftCake includes (industry-neutral, unlimited users on every plan, 14-day free trial):
- Organize the Business: Dashboard, Org Chart, HR (employees, time clock, files, onboarding), Workflows, Statistics.
- Win & manage work: Sales & Marketing CRM (funnels, booking calendar, campaigns), Training (LMS), Documents & E-Docs (files, photos, videos, doc creator, e-signature).
- Control the money: Accounting, Weekly Financial Planning, Equipment & Assets.
- Sam, the built-in AI assistant, helps across the platform (some AI abilities are still rolling out).

Pricing (per month, unlimited users):
- Tier 1 — Base: $79
- Tier 2: $229
- Tier 3: $389
- Contractor Extension Package: +$199/mo (optional add-on for companies that run projects/job sites/field crews — adds Jobs, Estimating & Bids, Design, Change Orders, Subs & Vendors, Client Portal). Requires Tier 2 or higher.
- Customization & Extensions: SoftCake can customize existing features or build entirely new ones for any type of business. Free quotes — point people to the Customization page or extensions@softcake.com.

Style: warm, concise, helpful. Keep answers short (1–3 short paragraphs). When it fits, encourage starting the 14-day free trial or requesting a free customization quote. Never invent features, integrations, or prices that aren't listed above — if you're unsure, say so and suggest they start a trial or contact the team. Never claim to access their data.`

function getIp(req: Request): string {
  const xf = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || ''
  return (xf.split(',')[0] || 'unknown').trim() || 'unknown'
}

async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = Deno.env.get('TURNSTILE_SECRET')
  if (!secret) return true // not configured → skip (stubbed)
  if (!token) return false
  const form = new URLSearchParams({ secret, response: token, remoteip: ip })
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: form,
  })
  const data = await res.json().catch(() => null)
  return !!data?.success
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json(405, { error: 'POST only' })

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return json(500, { error: 'Sam is not configured yet.' })

  const body = (await req.json().catch(() => ({}))) as {
    message?: string
    history?: Array<{ role: string; content: string }>
    turnstileToken?: string
  }

  const message = String(body.message || '').trim()
  if (!message) return json(400, { error: 'Please enter a message.' })
  if (message.length > MAX_MESSAGE_CHARS)
    return json(400, { error: 'That message is a bit long — please shorten it.' })

  const ip = getIp(req)

  // Bot challenge (only enforced when TURNSTILE_SECRET is configured).
  const okHuman = await verifyTurnstile(body.turnstileToken, ip)
  if (!okHuman) return json(403, { error: 'Please complete the verification and try again.' })

  // Per-IP daily rate limit (service role; isolated table, no tenant data).
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  )
  const today = new Date().toISOString().slice(0, 10)
  const { data: row } = await admin
    .from('sam_public_usage').select('count').eq('ip', ip).eq('day', today).maybeSingle()
  const used = row?.count || 0
  if (used >= DAILY_CAP) {
    return json(429, {
      error: "You've reached today's chat limit. Start a free 14-day trial to keep exploring SoftCake!",
    })
  }
  await admin
    .from('sam_public_usage')
    .upsert({ ip, day: today, count: used + 1, updated_at: new Date().toISOString() }, { onConflict: 'ip,day' })

  // Build a short, safe message list (text only).
  const history = Array.isArray(body.history) ? body.history.slice(-MAX_HISTORY) : []
  const messages = [
    ...history
      .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map(m => ({ role: m.role, content: String(m.content).slice(0, MAX_MESSAGE_CHARS) })),
    { role: 'user', content: message },
  ]

  // Call Anthropic (Haiku) — no tools, hard token cap.
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages,
    }),
  })

  if (!res.ok) {
    const txt = await res.text()
    console.error('[sam-public] anthropic error', res.status, txt.slice(0, 300))
    return json(502, { error: 'Sam is having a moment — please try again shortly.' })
  }

  const data = await res.json().catch(() => null)
  const reply =
    Array.isArray(data?.content)
      ? data.content.filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('\n').trim()
      : ''

  return json(200, { reply: reply || "Sorry, I didn't catch that — could you rephrase?" })
})
