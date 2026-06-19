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
import { createClient } from 'npm:@supabase/supabase-js@2'

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

// ── User preferences (memory) ──────────────────────────────────────────────
// Read the current user's saved preferences and append them to Sam's system
// prompt for this conversation. Empty / missing rows are fine — we just send
// the base prompt.
async function buildSystemPrompt(
  admin: ReturnType<typeof adminClient>,
  userId: string,
  basePrompt: string,
): Promise<string> {
  const { data, error } = await admin
    .from('agent_user_preferences')
    .select('notes')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) {
    console.warn('[agent-chat] prefs read failed:', error.message)
    return basePrompt
  }
  const list = Array.isArray(data?.notes) ? data.notes : []
  if (list.length === 0) return basePrompt
  const lines = list
    .map((n: any) => n?.text ? `- ${n.text}` : null)
    .filter(Boolean)
    .join('\n')
  return `${basePrompt}\n\nUSER PREFERENCES (saved by you in earlier conversations — honor these without being reminded)\n${lines}`
}

// ── Conversation helpers ───────────────────────────────────────────────────
async function getOrCreateConversation(
  admin: ReturnType<typeof adminClient>,
  userId: string,
  tenantId: string,
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
    .insert({ user_id: userId, tenant_id: tenantId })
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
  tenantId: string,
  role: 'user' | 'assistant' | 'tool',
  content: string | null,
  raw: unknown,
  usage?: { input_tokens?: number; output_tokens?: number },
) {
  const { data, error } = await admin
    .from('agent_messages')
    .insert({
      conversation_id: conversationId,
      tenant_id: tenantId,
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

// ── Attachments ───────────────────────────────────────────────────────────
// Incoming attachment shape from the client. Files are already uploaded
// to the sam-attachments bucket (path inside `storage_path`); we just
// persist the metadata and pull bytes when assembling Claude blocks.
type AttachmentInput = {
  storage_path: string
  file_name:    string
  mime_type:    string
  size_bytes:   number
  kind:         'image' | 'pdf' | 'office' | 'other'
}

const ATTACH_MAX_BYTES = 25 * 1024 * 1024

function isAcceptedAttachment(a: any): a is AttachmentInput {
  return (
    a &&
    typeof a.storage_path === 'string' && a.storage_path.length > 0 &&
    typeof a.file_name === 'string' &&
    typeof a.mime_type === 'string' &&
    typeof a.size_bytes === 'number' && a.size_bytes <= ATTACH_MAX_BYTES &&
    ['image','pdf','office','other'].includes(a.kind)
  )
}

// Insert one agent_message_attachments row per uploaded file. Rows link
// back to both the conversation and the user message that carried them.
async function persistMessageAttachments(
  admin: ReturnType<typeof adminClient>,
  conversationId: string,
  messageId: string,
  userId: string,
  tenantId: string,
  attachments: AttachmentInput[],
) {
  if (!attachments.length) return
  const rows = attachments.map(a => ({
    message_id:      messageId,
    conversation_id: conversationId,
    user_id:         userId,
    tenant_id:       tenantId,
    storage_path:    a.storage_path,
    file_name:       a.file_name,
    mime_type:       a.mime_type,
    size_bytes:      a.size_bytes,
    kind:            a.kind,
  }))
  const { error } = await admin.from('agent_message_attachments').insert(rows)
  if (error) console.warn('[agent-chat] attachment insert failed:', error.message)
}

// Pull a file out of the sam-attachments bucket and base64-encode it for
// inclusion in a Claude message block. Returns null on failure so a single
// bad file doesn't break the whole chat.
async function fetchAttachmentAsBase64(
  admin: ReturnType<typeof adminClient>,
  storagePath: string,
): Promise<string | null> {
  const { data, error } = await admin.storage.from('sam-attachments').download(storagePath)
  if (error || !data) {
    console.warn(`[agent-chat] download failed: ${storagePath}`, error?.message)
    return null
  }
  const buf = new Uint8Array(await data.arrayBuffer())
  // Chunked base64 — avoid blowing the stack on large files.
  let bin = ''
  const CHUNK = 0x8000
  for (let i = 0; i < buf.length; i += CHUNK) {
    bin += String.fromCharCode(...buf.subarray(i, i + CHUNK))
  }
  return btoa(bin)
}

// Build the user-message `content` array Claude expects, given the plain
// text and any image/PDF attachments. Images and PDFs are sent inline as
// base64 source blocks; Office docs are mentioned in text only (Claude has
// no native Office reader — the doc is still saved + visible to admins).
async function buildUserMessageBlocks(
  admin: ReturnType<typeof adminClient>,
  text: string,
  attachments: AttachmentInput[],
): Promise<Array<any>> {
  const blocks: Array<any> = []

  // 1) Images first — they read nicely above the text in Claude's reasoning.
  for (const a of attachments) {
    if (a.kind !== 'image') continue
    const b64 = await fetchAttachmentAsBase64(admin, a.storage_path)
    if (!b64) continue
    blocks.push({
      type: 'image',
      source: { type: 'base64', media_type: a.mime_type, data: b64 },
    })
  }

  // 2) PDFs as document blocks (Claude natively reads them).
  for (const a of attachments) {
    if (a.kind !== 'pdf') continue
    const b64 = await fetchAttachmentAsBase64(admin, a.storage_path)
    if (!b64) continue
    blocks.push({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: b64 },
    })
  }

  // 3) Office-doc note — Claude can't read them inline, but knowing they
  //    exist lets Sam acknowledge them and route to the human admin.
  const officeNames = attachments.filter(a => a.kind === 'office').map(a => a.file_name)
  const otherNames  = attachments.filter(a => a.kind === 'other').map(a => a.file_name)
  const trailingNote = [
    officeNames.length ? `(Attached Office docs I can't read inline, but they're saved for the support team: ${officeNames.join(', ')})` : '',
    otherNames.length  ? `(Other attachments saved for the support team: ${otherNames.join(', ')})` : '',
  ].filter(Boolean).join('\n')

  const finalText = trailingNote ? `${text}\n\n${trailingNote}` : text
  blocks.push({ type: 'text', text: finalText })
  return blocks
}

async function logToolCall(
  admin: ReturnType<typeof adminClient>,
  conversationId: string,
  tenantId: string,
  messageId: string | null,
  toolName: string,
  args: unknown,
  result: unknown,
  errorMsg: string | null,
  durationMs: number,
) {
  await admin.from('agent_tool_calls').insert({
    conversation_id: conversationId,
    tenant_id:       tenantId,
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
  tenantId: string,
  history: LLMMessage[],
  toolCtx: ToolContext,
) {
  let messages = [...history]
  let totalIn  = 0
  let totalOut = 0

  // Build the personalised system prompt once per request — it doesn't change
  // between tool-loop iterations within a single user turn.
  const personalSystem = await buildSystemPrompt(admin, toolCtx.userId, SYSTEM_PROMPT)

  for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
    const resp = await callLLM({
      task:     'analyst_chat',
      system:   personalSystem,
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
      tenantId,
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
        admin, conversationId, tenantId, assistantMsgId,
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
    await saveMessage(admin, conversationId, tenantId, 'tool', null, toolResultBlocks)

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
    const rawAttachments = Array.isArray(body?.attachments) ? body.attachments : []
    const attachments: AttachmentInput[] = rawAttachments.filter(isAcceptedAttachment)
    // Need text OR at least one attachment.
    if (!message && attachments.length === 0) {
      return json(400, { error: 'message or attachments are required' })
    }

    const admin = adminClient()
    // Service-role bypasses RLS — resolve the caller's tenant so every agent_*
    // insert is stamped with it (NOT NULL after Stage B).
    const { data: prof } = await admin.from('profiles').select('tenant_id').eq('id', userId).maybeSingle()
    const tenantId = prof?.tenant_id as string | undefined
    if (!tenantId) return json(401, { error: 'No tenant for caller' })

    const conversationId = await getOrCreateConversation(admin, userId, tenantId, body?.conversation_id)
    const history        = await loadHistory(admin, conversationId)

    // Build the rich content blocks (text + image/PDF) for this turn.
    const userBlocks = await buildUserMessageBlocks(admin, message, attachments)

    // Save the user's turn before calling the model so it survives a crash.
    // We store text-only blocks in `raw` (no base64 in the DB); attachment
    // metadata lives in agent_message_attachments, keyed by message_id.
    const rawForStorage = [{ type: 'text', text: message }]
    const userMessageId = await saveMessage(admin, conversationId, tenantId, 'user', message, rawForStorage)
    if (attachments.length > 0) {
      await persistMessageAttachments(admin, conversationId, userMessageId, userId, tenantId, attachments)
    }
    history.push({ role: 'user', content: userBlocks })

    // Origin of the browser making the chat request — preferred Origin
    // header, falling back to extracting host from Referer. Used by tools
    // (e.g. log_feature_request) to build absolute URLs in emails.
    let appOrigin = req.headers.get('origin') || ''
    if (!appOrigin) {
      const ref = req.headers.get('referer') || ''
      try { appOrigin = ref ? new URL(ref).origin : '' } catch { appOrigin = '' }
    }

    const result = await runAgenticLoop(admin, conversationId, tenantId, history, {
      userJwt: jwt,
      userId,
      conversationId,
      appOrigin,
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
