// supabase/functions/agent-chat/index.ts
//
// Entry point for Sam's chat. Receives a user message, runs the agentic
// tool-use loop with Claude, persists the conversation, and returns the
// final assistant reply.
//
// Request body (POST JSON):
//   {
//     conversation_id?: uuid,   // omit to start a new thread
//     message:          string, // the user's prompt
//   }
//
// Response:
//   {
//     conversation_id: uuid,
//     reply:           string,  // the rendered assistant text
//     usage:           { input_tokens, output_tokens },
//   }

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

import { SYSTEM_PROMPT } from './persona.ts'
import { callLLM, LLMMessage } from './router.ts'
import {
  TOOL_DEFINITIONS,
  TOOL_EXECUTORS,
  ToolContext,
} from './tools.ts'

// ── CORS ───────────────────────────────────────────────────────────────────
const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

// ── Helpers ────────────────────────────────────────────────────────────────
// Server-role client for writes that must bypass RLS (we still scope every
// write by the authenticated user_id).
function adminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
}

// Extract the auth user from the incoming JWT.
async function authFromRequest(req: Request): Promise<{ userId: string; jwt: string }> {
  const auth = req.headers.get('Authorization') || ''
  const jwt  = auth.replace(/^Bearer\s+/i, '')
  if (!jwt) throw new Error('Missing Authorization header.')
  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: `Bearer ${jwt}` } } },
  )
  const { data, error } = await sb.auth.getUser()
  if (error || !data?.user) throw new Error('Invalid auth token.')
  return { userId: data.user.id, jwt }
}

// ── Conversation helpers ───────────────────────────────────────────────────
async function getOrCreateConversation(
  admin: ReturnType<typeof adminClient>,
  userId: string,
  conversationId?: string,
) {
  if (conversationId) {
    const { data, error } = await admin
      .from('agent_conversations')
      .select('id, user_id')
      .eq('id', conversationId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data || data.user_id !== userId) throw new Error('Conversation not found.')
    return data.id as string
  }
  const { data, error } = await admin
    .from('agent_conversations')
    .insert({ user_id: userId })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  return data.id as string
}

async function loadHistory(
  admin: ReturnType<typeof adminClient>,
  conversationId: string,
): Promise<LLMMessage[]> {
  const { data, error } = await admin
    .from('agent_messages')
    .select('role, raw, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)

  const out: LLMMessage[] = []
  for (const row of data || []) {
    // Always prefer `raw` (full provider format) when present so tool_use /
    // tool_result blocks round-trip correctly. Fall back to plain text.
    const role = row.role === 'tool' ? 'user' : (row.role as 'user' | 'assistant')
    const content = row.raw ?? row.content ?? ''
    out.push({ role, content })
  }
  return out
}

async function saveMessage(
  admin: ReturnType<typeof adminClient>,
  conversationId: string,
  role: 'user' | 'assistant' | 'tool',
  content: string | null,
  raw: unknown,
  usage?: { input_tokens?: number; output_tokens?: number },
) {
  const { data, error } = await admin
    .from('agent_messages')
    .insert({
      conversation_id: conversationId,
      role,
      content,
      raw,
      input_tokens:  usage?.input_tokens  ?? null,
      output_tokens: usage?.output_tokens ?? null,
    })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  return data.id as string
}

async function logToolCall(
  admin: ReturnType<typeof adminClient>,
  conversationId: string,
  messageId: string | null,
  toolName: string,
  args: unknown,
  result: unknown,
  errorMsg: string | null,
  durationMs: number,
) {
  await admin.from('agent_tool_calls').insert({
    conversation_id: conversationId,
    message_id:      messageId,
    tool_name:       toolName,
    arguments:       args,
    result:          errorMsg ? null : result,
    error:           errorMsg,
    duration_ms:     durationMs,
  })
}

// ── Tool-use loop ──────────────────────────────────────────────────────────
// Cap iterations to prevent infinite loops in pathological cases.
const MAX_TOOL_ITERATIONS = 8

async function runAgenticLoop(
  admin: ReturnType<typeof adminClient>,
  conversationId: string,
  history: LLMMessage[],
  toolCtx: ToolContext,
) {
  let messages = [...history]
  let totalIn  = 0
  let totalOut = 0

  for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
    const resp = await callLLM({
      task:     'analyst_chat',
      system:   SYSTEM_PROMPT,
      messages,
      tools:    TOOL_DEFINITIONS,
    })
    totalIn  += resp.usage?.input_tokens  ?? 0
    totalOut += resp.usage?.output_tokens ?? 0

    // Persist the assistant turn (whatever it is — text and/or tool_use blocks).
    const textBlocks = (resp.content as Array<any>).filter(b => b?.type === 'text')
    const renderedText = textBlocks.map((b: any) => b.text).join('\n').trim() || null
    const assistantMsgId = await saveMessage(
      admin,
      conversationId,
      'assistant',
      renderedText,
      resp.content,
      resp.usage,
    )

    if (resp.stop_reason !== 'tool_use') {
      // Final answer.
      return {
        reply: renderedText ?? '',
        usage: { input_tokens: totalIn, output_tokens: totalOut },
        model: resp.model,
      }
    }

    // Resolve every tool_use block in this turn.
    const toolUses = (resp.content as Array<any>).filter(b => b?.type === 'tool_use')
    const toolResultBlocks: Array<any> = []
    for (const tu of toolUses) {
      const exec = TOOL_EXECUTORS[tu.name]
      const started = Date.now()
      let resultPayload: unknown = null
      let errMsg: string | null = null
      try {
        if (!exec) throw new Error(`Unknown tool: ${tu.name}`)
        resultPayload = await exec(tu.input, toolCtx)
      } catch (e) {
        errMsg = e instanceof Error ? e.message : String(e)
      }
      await logToolCall(
        admin, conversationId, assistantMsgId,
        tu.name, tu.input, resultPayload, errMsg,
        Date.now() - started,
      )
      toolResultBlocks.push({
        type:        'tool_result',
        tool_use_id: tu.id,
        content:     errMsg ? `Error: ${errMsg}` : JSON.stringify(resultPayload),
        is_error:    !!errMsg,
      })
    }

    // Save the tool-result message and append both turns to history for the
    // next model call.
    await saveMessage(admin, conversationId, 'tool', null, toolResultBlocks)

    messages = [
      ...messages,
      { role: 'assistant', content: resp.content },
      { role: 'user',      content: toolResultBlocks },
    ]
  }
  // Hit max iterations.
  return {
    reply: 'Sorry — I got stuck in a tool loop and stopped to be safe. Try rephrasing?',
    usage: { input_tokens: totalIn, output_tokens: totalOut },
    model: 'unknown',
  }
}

// ── HTTP entry point ───────────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST')    return json(405, { error: 'Method not allowed' })

  try {
    const { userId, jwt } = await authFromRequest(req)
    const body = await req.json().catch(() => ({}))
    const message = (body?.message ?? '').toString().trim()
    if (!message) return json(400, { error: 'message is required' })

    const admin = adminClient()
    const conversationId = await getOrCreateConversation(admin, userId, body?.conversation_id)
    const history        = await loadHistory(admin, conversationId)

    // Save the user's turn before calling the model so it survives a crash.
    await saveMessage(admin, conversationId, 'user', message, [
      { type: 'text', text: message },
    ])
    history.push({ role: 'user', content: message })

    const result = await runAgenticLoop(admin, conversationId, history, {
      userJwt: jwt,
      userId,
    })

    await admin
      .from('agent_conversations')
      .update({ model: result.model })
      .eq('id', conversationId)

    return json(200, {
      conversation_id: conversationId,
      reply:           result.reply,
      usage:           result.usage,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[agent-chat]', msg)
    return json(500, { error: msg })
  }
})
