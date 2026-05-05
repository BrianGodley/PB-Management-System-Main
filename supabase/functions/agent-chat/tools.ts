// supabase/functions/agent-chat/tools.ts
//
// Sam's tool registry. Each tool has:
//   - definition: JSON-schema input the model sees (advertised capability)
//   - execute:    Deno function that runs the tool and returns a JSON result
//
// Executors run with a Supabase client built from the user's JWT so RLS is
// enforced — Sam can only read what the user themselves can read. Service
// role is never used here.

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export type ToolContext = {
  userJwt: string
  userId:  string
}

export type ToolDefinition = {
  name: string
  description: string
  input_schema: Record<string, unknown>
}

export type ToolExecutor = (args: any, ctx: ToolContext) => Promise<unknown>

// ── Helper: build a Supabase client that runs queries AS the user ──────────
function userClient(ctx: ToolContext): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: `Bearer ${ctx.userJwt}` } } },
  )
}

// ──────────────────────────────────────────────────────────────────────────
// Tool: list_stats
// ──────────────────────────────────────────────────────────────────────────
const list_stats: ToolDefinition = {
  name: 'list_stats',
  description:
    'List statistics the current user can see (own + shared). Returns id, ' +
    'name, tracking ("daily"|"weekly"|"monthly"|"quarterly"|"yearly"), ' +
    'stat_type, stat_category, archived flag, and owner_user_id. Use this ' +
    'to discover what stats exist before fetching values.',
  input_schema: {
    type: 'object',
    properties: {
      include_archived: {
        type: 'boolean',
        description: 'Include archived stats. Default false.',
      },
      name_contains: {
        type: 'string',
        description: 'Optional substring match on the stat name (case-insensitive).',
      },
    },
  },
}

const list_stats_run: ToolExecutor = async (args, ctx) => {
  const sb = userClient(ctx)
  let q = sb
    .from('statistics')
    .select('id, name, tracking, stat_type, stat_category, archived, owner_user_id')
    .order('name')
  if (!args?.include_archived) q = q.eq('archived', false)
  if (args?.name_contains) q = q.ilike('name', `%${args.name_contains}%`)
  const { data, error } = await q.limit(200)
  if (error) throw new Error(error.message)
  return { stats: data || [] }
}

// ──────────────────────────────────────────────────────────────────────────
// Tool: get_stat_values
// ──────────────────────────────────────────────────────────────────────────
const get_stat_values: ToolDefinition = {
  name: 'get_stat_values',
  description:
    'Fetch the recorded values for one statistic over a date range. Returns ' +
    'an array of { period_date, value } sorted oldest → newest, plus a ' +
    'summary (count, sum, avg, min, max). Use after list_stats to identify ' +
    'the stat_id.',
  input_schema: {
    type: 'object',
    required: ['stat_id'],
    properties: {
      stat_id: {
        type: 'integer',
        description: 'The statistics.id of the stat to fetch.',
      },
      from_date: {
        type: 'string',
        description: 'Inclusive start date in YYYY-MM-DD. Defaults to 90 days ago.',
      },
      to_date: {
        type: 'string',
        description: 'Inclusive end date in YYYY-MM-DD. Defaults to today.',
      },
    },
  },
}

const get_stat_values_run: ToolExecutor = async (args, ctx) => {
  const sb = userClient(ctx)
  if (typeof args?.stat_id !== 'number') throw new Error('stat_id is required')

  const today = new Date()
  const dflt  = new Date(today); dflt.setDate(dflt.getDate() - 90)
  const fmt   = (d: Date) => d.toISOString().slice(0, 10)
  const from  = args.from_date || fmt(dflt)
  const to    = args.to_date   || fmt(today)

  // Fetch the stat itself first so we can return name + tracking alongside values.
  const { data: stat, error: sErr } = await sb
    .from('statistics')
    .select('id, name, tracking, stat_type, stat_category')
    .eq('id', args.stat_id)
    .maybeSingle()
  if (sErr) throw new Error(sErr.message)
  if (!stat) throw new Error('Stat not found or not accessible to you.')

  // Page through values — Supabase caps at 1000 per request.
  const PAGE = 1000
  const all: Array<{ period_date: string; value: number }> = []
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await sb
      .from('statistic_values')
      .select('period_date, value')
      .eq('statistic_id', args.stat_id)
      .gte('period_date', from)
      .lte('period_date', to)
      .order('period_date', { ascending: true })
      .range(offset, offset + PAGE - 1)
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < PAGE) break
  }

  const nums = all.map(v => Number(v.value)).filter(n => Number.isFinite(n))
  const sum  = nums.reduce((s, n) => s + n, 0)
  const summary = nums.length === 0
    ? { count: 0 }
    : {
        count: nums.length,
        sum,
        avg:   sum / nums.length,
        min:   Math.min(...nums),
        max:   Math.max(...nums),
        first: { period_date: all[0].period_date,                value: all[0].value },
        last:  { period_date: all[all.length - 1].period_date,    value: all[all.length - 1].value },
      }

  return { stat, from_date: from, to_date: to, values: all, summary }
}

// ──────────────────────────────────────────────────────────────────────────
// Tool: today
// ──────────────────────────────────────────────────────────────────────────
// Tiny but vital — gives Sam a known anchor date so it doesn't guess the
// current calendar week / month. The date is the server's UTC date; for
// landscape-job-tracker this is acceptable since the app is single-timezone.
const today_def: ToolDefinition = {
  name: 'today',
  description:
    'Returns the current date so you can compute relative ranges like ' +
    '"last week" or "this month". Always call this once when the user asks ' +
    'about a relative time period, never guess the date.',
  input_schema: { type: 'object', properties: {} },
}

const today_run: ToolExecutor = async () => {
  const d = new Date()
  return {
    iso:        d.toISOString(),
    date:       d.toISOString().slice(0, 10),
    iso_weekday: ((d.getUTCDay() + 6) % 7) + 1, // 1=Mon … 7=Sun
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Registry
// ──────────────────────────────────────────────────────────────────────────
export const TOOLS: Array<{
  definition: ToolDefinition
  execute:    ToolExecutor
}> = [
  { definition: today_def,        execute: today_run },
  { definition: list_stats,       execute: list_stats_run },
  { definition: get_stat_values,  execute: get_stat_values_run },
]

export const TOOL_DEFINITIONS = TOOLS.map(t => t.definition)
export const TOOL_EXECUTORS: Record<string, ToolExecutor> = Object.fromEntries(
  TOOLS.map(t => [t.definition.name, t.execute]),
)
