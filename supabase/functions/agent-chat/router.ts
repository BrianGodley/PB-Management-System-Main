// supabase/functions/agent-chat/router.ts
//
// Model router. All LLM calls flow through callLLM(taskType, ...). Today
// every task routes to Claude Sonnet via the Anthropic Messages API, but
// adding cheaper models (Haiku) or other providers later is a one-line
// change in MODEL_BY_TASK — no caller changes.
//
// Why a router and not a direct SDK call:
//   - Centralised cost/latency telemetry
//   - Can swap a slow flagship for a fast classifier per task
//   - Failover to a backup provider lives in one place
//   - Persona prompt + tool list normalisation happens here, once

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'

// Available task tags. Add more as we expand Sam's capabilities.
export type TaskType =
  | 'analyst_chat'    // primary conversational analyst (Sam in the chat panel)
  | 'quick_classify'  // short, low-stakes classification — should be cheap
  | 'email_draft'     // longer-form writing tasks
  | 'pdf_extract'     // future: vision tasks

// Map tasks → model. Cheap models for cheap tasks.
const MODEL_BY_TASK: Record<TaskType, string> = {
  analyst_chat:   'claude-sonnet-4-5',
  quick_classify: 'claude-haiku-4-5-20251001',
  email_draft:    'claude-sonnet-4-5',
  pdf_extract:    'claude-sonnet-4-5',
}

// Hard caps per task — defence-in-depth against runaway responses.
const MAX_TOKENS_BY_TASK: Record<TaskType, number> = {
  analyst_chat:   2048,
  quick_classify: 256,
  email_draft:    1500,
  pdf_extract:    4096,
}

// ── Public types ───────────────────────────────────────────────────────────
// We mirror the Anthropic Messages API shape because that's what we route
// to today. If we add a second provider, normalize at the boundary.

export type LLMMessage = {
  role: 'user' | 'assistant'
  content: string | Array<unknown>
}

export type LLMTool = {
  name: string
  description: string
  input_schema: Record<string, unknown>
}

export type LLMResponse = {
  model: string
  stop_reason: string
  content: Array<unknown>      // mix of text + tool_use blocks
  usage: {
    input_tokens: number
    output_tokens: number
    // Present when prompt caching is active. cache_read_input_tokens is the
    // number billed at ~10% — if it is 0 on repeat calls the prefix is varying.
    cache_creation_input_tokens?: number
    cache_read_input_tokens?: number
  }
}

// ── callLLM ────────────────────────────────────────────────────────────────
export async function callLLM(args: {
  task: TaskType
  system: string
  messages: LLMMessage[]
  tools?: LLMTool[]
}): Promise<LLMResponse> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set in Supabase Edge Function secrets.')
  }
  const model = MODEL_BY_TASK[args.task]
  const max_tokens = MAX_TOKENS_BY_TASK[args.task]

  // ── Prompt caching ──────────────────────────────────────────────────────
  // Sam's persona is ~30KB and the tool schemas ride in front of it on every
  // call. Uncached, that static prefix is re-billed at the full input rate each
  // time; a cache read costs roughly a tenth of that.
  //
  // Caching is a PREFIX match in render order tools → system → messages, so a
  // breakpoint on the system block covers the tool schemas too. Everything
  // volatile (the conversation) sits after it and is billed normally.
  //
  // The prefix must be byte-identical between calls or the cache silently
  // misses — so nothing per-request (timestamps, user ids, tenant names) may be
  // interpolated into `system` upstream of here. Verify with
  // usage.cache_read_input_tokens: if it stays 0 across repeated calls,
  // something in the prefix is varying.
  const body: Record<string, unknown> = {
    model,
    max_tokens,
    system: [
      { type: 'text', text: args.system, cache_control: { type: 'ephemeral' } },
    ],
    messages: args.messages,
  }
  if (args.tools && args.tools.length > 0) {
    body.tools = args.tools
  }

  // ── Retry with exponential backoff for transient overload / rate-limit ──
  // Anthropic returns 529 ("overloaded") when their service is momentarily
  // hot and 429 ("rate_limited") when our key has burst above its quota.
  // Both almost always succeed on retry. Without this loop, a single 529
  // would surface as a red error bubble in Sam — we'd rather wait a beat
  // and try again. Cap at 3 retries (1s, 2s, 4s) so we don't sit forever
  // if Anthropic is genuinely down.
  const MAX_RETRIES = 3
  let lastError: { status: number; text: string } | null = null
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      const parsed = await res.json() as LLMResponse
      // One line per call so cache effectiveness is observable in the function
      // logs without extra tooling. A healthy steady state shows `read` climbing
      // and `write` only on the first call after a persona or tool change.
      const u = parsed.usage
      console.log(
        `[llm] ${model} in=${u?.input_tokens ?? 0} out=${u?.output_tokens ?? 0} ` +
        `cache_write=${u?.cache_creation_input_tokens ?? 0} cache_read=${u?.cache_read_input_tokens ?? 0}`
      )
      return parsed
    }

    const text = await res.text()
    lastError = { status: res.status, text }

    // Only retry on transient classes — 5xx and 429. Hard errors (400 bad
    // request, 401 auth, 404 not found) won't fix themselves; throw fast.
    const isTransient = res.status === 529 || res.status === 429 || (res.status >= 500 && res.status < 600)
    if (!isTransient || attempt === MAX_RETRIES) {
      throw new Error(`Anthropic ${res.status}: ${text.slice(0, 500)}`)
    }

    const waitMs = 1000 * Math.pow(2, attempt) // 1s, 2s, 4s
    console.warn(`[router] Anthropic ${res.status} on attempt ${attempt + 1}; retrying in ${waitMs}ms`)
    await new Promise(r => setTimeout(r, waitMs))
  }

  // Should be unreachable — loop either returns success or throws.
  throw new Error(`Anthropic retries exhausted: ${lastError?.status} ${lastError?.text.slice(0, 200) || ''}`)
}
