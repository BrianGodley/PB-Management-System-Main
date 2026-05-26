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
  usage: { input_tokens: number; output_tokens: number }
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

  const body: Record<string, unknown> = {
    model,
    max_tokens,
    system: args.system,
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
      return await res.json() as LLMResponse
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
