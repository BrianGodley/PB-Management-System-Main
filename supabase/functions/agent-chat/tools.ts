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
  userJwt:         string
  userId:          string
  conversationId?: string  // current conversation, used by log_feature_request to link the request back to the chat
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

// ── Date helpers (used by several tools) ───────────────────────────────────
function fmt(d: Date): string { return d.toISOString().slice(0, 10) }
function defaultRange(days = 90): { from: string; to: string } {
  const t = new Date()
  const f = new Date(t); f.setDate(f.getDate() - days)
  return { from: fmt(f), to: fmt(t) }
}

// ──────────────────────────────────────────────────────────────────────────
// Tool: today
// ──────────────────────────────────────────────────────────────────────────
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
// Tool: list_stats
// ──────────────────────────────────────────────────────────────────────────
const list_stats_def: ToolDefinition = {
  name: 'list_stats',
  description:
    'List statistics the current user can see (own + shared). Returns id, ' +
    'name, tracking ("daily"|"weekly"|"monthly"|"quarterly"|"yearly"), ' +
    'stat_type, stat_category, archived flag, and owner_user_id. Use this ' +
    'to discover what stats exist before fetching values.',
  input_schema: {
    type: 'object',
    properties: {
      include_archived: { type: 'boolean', description: 'Include archived stats. Default false.' },
      name_contains:    { type: 'string',  description: 'Optional substring match on the stat name (case-insensitive).' },
    },
  },
}
const list_stats_run: ToolExecutor = async (args, ctx) => {
  const sb = userClient(ctx)
  let q = sb.from('statistics')
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
const get_stat_values_def: ToolDefinition = {
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
      stat_id:   { type: 'integer', description: 'The statistics.id of the stat to fetch.' },
      from_date: { type: 'string',  description: 'Inclusive start date in YYYY-MM-DD. Defaults to 90 days ago.' },
      to_date:   { type: 'string',  description: 'Inclusive end date in YYYY-MM-DD. Defaults to today.' },
    },
  },
}
const get_stat_values_run: ToolExecutor = async (args, ctx) => {
  const sb = userClient(ctx)
  if (typeof args?.stat_id !== 'number') throw new Error('stat_id is required')

  const r = defaultRange(90)
  const from = args.from_date || r.from
  const to   = args.to_date   || r.to

  const { data: stat, error: sErr } = await sb
    .from('statistics')
    .select('id, name, tracking, stat_type, stat_category')
    .eq('id', args.stat_id)
    .maybeSingle()
  if (sErr) throw new Error(sErr.message)
  if (!stat) throw new Error('Stat not found or not accessible to you.')

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
        count: nums.length, sum,
        avg: sum / nums.length,
        min: Math.min(...nums), max: Math.max(...nums),
        first: { period_date: all[0].period_date, value: all[0].value },
        last:  { period_date: all[all.length - 1].period_date, value: all[all.length - 1].value },
      }
  return { stat, from_date: from, to_date: to, values: all, summary }
}

// ──────────────────────────────────────────────────────────────────────────
// Tool: list_bids
// ──────────────────────────────────────────────────────────────────────────
const list_bids_def: ToolDefinition = {
  name: 'list_bids',
  description:
    'List bids over a date range, optionally filtered by status or client. ' +
    'Returns id, client_name, job_address, status (pending/presented/sold/' +
    'lost), date_submitted, bid_amount, gross_profit, gpmd, salesperson, ' +
    'created_by, estimate_id. Cap is 200 rows; use a tighter date range or ' +
    'filter to narrow.',
  input_schema: {
    type: 'object',
    properties: {
      from_date:     { type: 'string', description: 'Inclusive start (YYYY-MM-DD). Defaults to 90 days ago.' },
      to_date:       { type: 'string', description: 'Inclusive end (YYYY-MM-DD). Defaults to today.' },
      status:        { type: 'string', description: 'Filter by status — pending, presented, sold, or lost.' },
      client_name:   { type: 'string', description: 'Substring match on client_name (case-insensitive).' },
    },
  },
}
const list_bids_run: ToolExecutor = async (args, ctx) => {
  const sb = userClient(ctx)
  const r  = defaultRange(90)
  const from = args?.from_date || r.from
  const to   = args?.to_date   || r.to

  let q = sb.from('bids')
    .select('id, client_name, job_address, status, date_submitted, bid_amount, gross_profit, gpmd, salesperson, created_by, estimate_id, record_type')
    .eq('record_type', 'bid')
    .gte('date_submitted', from)
    .lte('date_submitted', to)
    .order('date_submitted', { ascending: false })
    .limit(200)
  if (args?.status)      q = q.eq('status', args.status)
  if (args?.client_name) q = q.ilike('client_name', `%${args.client_name}%`)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return { from_date: from, to_date: to, count: data?.length ?? 0, bids: data || [] }
}

// ──────────────────────────────────────────────────────────────────────────
// Tool: bid_summary
// ──────────────────────────────────────────────────────────────────────────
const bid_summary_def: ToolDefinition = {
  name: 'bid_summary',
  description:
    'Aggregate metrics across bids in a date range: counts by status (sent ' +
    '= every bid in the range, presented, sold, lost), total $ value of ' +
    'sold bids, total gross profit, average GPM-day rate, and win rate ' +
    '(sold ÷ presented). Use this for "how are bids/sales doing" type ' +
    'questions. Pages through every bid in the range, not just 200.',
  input_schema: {
    type: 'object',
    properties: {
      from_date:   { type: 'string', description: 'Inclusive start (YYYY-MM-DD). Defaults to 90 days ago.' },
      to_date:     { type: 'string', description: 'Inclusive end (YYYY-MM-DD). Defaults to today.' },
      salesperson: { type: 'string', description: 'Optional exact-match filter on salesperson name.' },
    },
  },
}
const bid_summary_run: ToolExecutor = async (args, ctx) => {
  const sb = userClient(ctx)
  const r  = defaultRange(90)
  const from = args?.from_date || r.from
  const to   = args?.to_date   || r.to

  const PAGE = 1000
  const all: Array<any> = []
  for (let offset = 0; ; offset += PAGE) {
    let q = sb.from('bids')
      .select('id, status, bid_amount, gross_profit, gpmd, salesperson, date_submitted')
      .eq('record_type', 'bid')
      .gte('date_submitted', from)
      .lte('date_submitted', to)
      .range(offset, offset + PAGE - 1)
    if (args?.salesperson) q = q.eq('salesperson', args.salesperson)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < PAGE) break
  }

  const sent      = all.length
  const presented = all.filter(b => b.status === 'presented' || b.status === 'sold' || b.status === 'lost').length
  const sold      = all.filter(b => b.status === 'sold').length
  const lost      = all.filter(b => b.status === 'lost').length
  const pending   = all.filter(b => b.status === 'pending' || !b.status).length
  const soldRows  = all.filter(b => b.status === 'sold')
  const soldValue = soldRows.reduce((s, b) => s + (Number(b.bid_amount) || 0), 0)
  const soldGP    = soldRows.reduce((s, b) => s + (Number(b.gross_profit) || 0), 0)
  const gpmds     = soldRows.map(b => Number(b.gpmd)).filter(n => Number.isFinite(n) && n > 0)
  const avgGpmd   = gpmds.length ? gpmds.reduce((s, n) => s + n, 0) / gpmds.length : 0
  const winRate   = presented > 0 ? sold / presented : null

  return {
    from_date: from, to_date: to,
    counts:   { sent, presented, sold, lost, pending },
    sold_total_value:   soldValue,
    sold_total_gp:      soldGP,
    sold_avg_gpm_day:   avgGpmd,
    win_rate:           winRate,
    win_rate_pct:       winRate === null ? null : Math.round(winRate * 1000) / 10,
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Tool: list_jobs
// ──────────────────────────────────────────────────────────────────────────
const list_jobs_def: ToolDefinition = {
  name: 'list_jobs',
  description:
    'List jobs over a date range (by sold_date), optionally filtered by ' +
    'status or client. Returns id, name, client_name, job_address, status, ' +
    'sold_date, total_price, gross_profit, gpmd, estimate_id. Cap 200.',
  input_schema: {
    type: 'object',
    properties: {
      from_date:   { type: 'string', description: 'Inclusive start (YYYY-MM-DD). Defaults to 365 days ago.' },
      to_date:     { type: 'string', description: 'Inclusive end (YYYY-MM-DD). Defaults to today.' },
      status:      { type: 'string', description: 'Filter by status — e.g. active, complete, on_hold, scheduled.' },
      client_name: { type: 'string', description: 'Substring match on client_name (case-insensitive).' },
    },
  },
}
const list_jobs_run: ToolExecutor = async (args, ctx) => {
  const sb = userClient(ctx)
  const r  = defaultRange(365)
  const from = args?.from_date || r.from
  const to   = args?.to_date   || r.to

  let q = sb.from('jobs')
    .select('id, name, client_name, job_address, status, sold_date, total_price, gross_profit, gpmd, estimate_id, created_at')
    .gte('sold_date', from)
    .lte('sold_date', to)
    .order('sold_date', { ascending: false })
    .limit(200)
  if (args?.status)      q = q.eq('status', args.status)
  if (args?.client_name) q = q.ilike('client_name', `%${args.client_name}%`)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return { from_date: from, to_date: to, count: data?.length ?? 0, jobs: data || [] }
}

// ──────────────────────────────────────────────────────────────────────────
// Tool: get_job
// ──────────────────────────────────────────────────────────────────────────
const get_job_def: ToolDefinition = {
  name: 'get_job',
  description:
    'Fetch a single job by id, including its projects, modules, recorded ' +
    'actual_entries (labor/material entries), and change_orders. Returns a ' +
    'compact summary: estimated vs actual hours, estimated vs actual cost, ' +
    'count of change orders. Use when the user asks about a specific job.',
  input_schema: {
    type: 'object',
    required: ['job_id'],
    properties: {
      job_id: { type: 'integer', description: 'The jobs.id of the job to fetch.' },
    },
  },
}
const get_job_run: ToolExecutor = async (args, ctx) => {
  const sb = userClient(ctx)
  if (typeof args?.job_id !== 'number') throw new Error('job_id is required')

  const { data, error } = await sb
    .from('jobs')
    .select('id, name, client_name, job_address, status, sold_date, total_price, gross_profit, gpmd, estimate_id, projects(*, modules(*, actual_entries(*))), change_orders(*)')
    .eq('id', args.job_id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data)  throw new Error('Job not found or not accessible.')

  // Roll up estimated vs actual across all modules.
  let estHours = 0, estCost = 0, actualHours = 0, actualCost = 0
  for (const p of (data.projects || [])) {
    for (const m of (p.modules || [])) {
      estHours += Number(m.man_days || 0) * 8
      estCost  += Number(m.labor_cost || 0) + Number(m.material_cost || 0) + Number(m.sub_cost || 0)
      for (const a of (m.actual_entries || [])) {
        actualHours += Number(a.hours || 0)
        actualCost  += Number(a.cost  || 0)
      }
    }
  }
  const summary = {
    estimated_hours: estHours,
    actual_hours:    actualHours,
    hours_variance:  actualHours - estHours,
    estimated_cost:  estCost,
    actual_cost:     actualCost,
    cost_variance:   actualCost - estCost,
    change_order_count: (data.change_orders || []).length,
  }
  // Strip the heavy nested arrays before returning — Sam usually only needs
  // the summary; if it asks for more we can add a get_job_modules tool later.
  const { projects: _p, change_orders: _co, ...top } = data
  return { job: top, summary }
}

// ──────────────────────────────────────────────────────────────────────────
// Tool: list_clients
// ──────────────────────────────────────────────────────────────────────────
const list_clients_def: ToolDefinition = {
  name: 'list_clients',
  description:
    'List clients with id and name. Useful for resolving "the Ramirez job" ' +
    'into a client_name string or id. Returns up to 200, ordered by name.',
  input_schema: {
    type: 'object',
    properties: {
      name_contains: { type: 'string', description: 'Optional substring match on client name.' },
    },
  },
}
const list_clients_run: ToolExecutor = async (args, ctx) => {
  const sb = userClient(ctx)
  let q = sb.from('clients')
    .select('id, name, first_name, last_name')
    .order('name')
    .limit(200)
  if (args?.name_contains) q = q.ilike('name', `%${args.name_contains}%`)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return { clients: data || [] }
}

// ──────────────────────────────────────────────────────────────────────────
// Tool: compare_periods
// ──────────────────────────────────────────────────────────────────────────
const compare_periods_def: ToolDefinition = {
  name: 'compare_periods',
  description:
    'Compare a metric across two date ranges and return both totals and ' +
    'the percentage change. Supported metrics: ' +
    '"sales" (sum of sold bids\' bid_amount), ' +
    '"gross_profit" (sum of sold bids\' gross_profit), ' +
    '"bids_sent" (count of bids), ' +
    '"bids_won" (count of bids with status=sold), ' +
    '"jobs_complete" (count of jobs with status=complete), ' +
    '"stat_value" (sum of values for a given stat_id — pass stat_id).',
  input_schema: {
    type: 'object',
    required: ['metric', 'period_a_from', 'period_a_to', 'period_b_from', 'period_b_to'],
    properties: {
      metric:        { type: 'string', enum: ['sales','gross_profit','bids_sent','bids_won','jobs_complete','stat_value'] },
      period_a_from: { type: 'string' },
      period_a_to:   { type: 'string' },
      period_b_from: { type: 'string' },
      period_b_to:   { type: 'string' },
      stat_id:       { type: 'integer', description: 'Required when metric is "stat_value".' },
    },
  },
}
async function metricInRange(sb: SupabaseClient, metric: string, from: string, to: string, statId?: number): Promise<number> {
  if (metric === 'stat_value') {
    if (typeof statId !== 'number') throw new Error('stat_id is required for metric=stat_value')
    let total = 0
    const PAGE = 1000
    for (let offset = 0; ; offset += PAGE) {
      const { data, error } = await sb.from('statistic_values')
        .select('value').eq('statistic_id', statId)
        .gte('period_date', from).lte('period_date', to)
        .range(offset, offset + PAGE - 1)
      if (error) throw new Error(error.message)
      if (!data || data.length === 0) break
      for (const v of data) total += Number(v.value) || 0
      if (data.length < PAGE) break
    }
    return total
  }
  if (metric === 'jobs_complete') {
    const { count, error } = await sb.from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'complete')
      .gte('sold_date', from).lte('sold_date', to)
    if (error) throw new Error(error.message)
    return count || 0
  }
  // bids-based metrics
  let q = sb.from('bids').select('bid_amount, gross_profit, status', { count: 'exact' })
    .eq('record_type', 'bid')
    .gte('date_submitted', from).lte('date_submitted', to)
  if (metric === 'bids_won') q = q.eq('status', 'sold')
  const { data, error } = await q.range(0, 9999)
  if (error) throw new Error(error.message)
  if (metric === 'bids_sent' || metric === 'bids_won') return (data || []).length
  if (metric === 'sales')        return (data || []).filter((b: any) => b.status === 'sold').reduce((s: number, b: any) => s + (Number(b.bid_amount) || 0), 0)
  if (metric === 'gross_profit') return (data || []).filter((b: any) => b.status === 'sold').reduce((s: number, b: any) => s + (Number(b.gross_profit) || 0), 0)
  throw new Error('Unsupported metric: ' + metric)
}
const compare_periods_run: ToolExecutor = async (args, ctx) => {
  const sb = userClient(ctx)
  if (!args?.metric) throw new Error('metric is required')
  const a = await metricInRange(sb, args.metric, args.period_a_from, args.period_a_to, args.stat_id)
  const b = await metricInRange(sb, args.metric, args.period_b_from, args.period_b_to, args.stat_id)
  const pct = a === 0 ? null : ((b - a) / a) * 100
  return {
    metric:   args.metric,
    period_a: { from: args.period_a_from, to: args.period_a_to, value: a },
    period_b: { from: args.period_b_from, to: args.period_b_to, value: b },
    delta:    b - a,
    pct_change: pct === null ? null : Math.round(pct * 10) / 10,
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Tool: remember_preference
// ──────────────────────────────────────────────────────────────────────────
// Appends a single short note to the current user's agent_user_preferences
// row. The note is then injected into Sam's system prompt on every future
// chat call so Sam acts on it without being reminded.
const remember_preference_def: ToolDefinition = {
  name: 'remember_preference',
  description:
    'Save a single short preference or fact about how the current user wants ' +
    'to work with you. Use this whenever the user expresses a lasting ' +
    'preference ("keep answers short", "always show GPM as a percentage", ' +
    '"we call estimates bids"), a personal note ("my crew is mostly Spanish-' +
    'speaking"), or a recurring shorthand ("when I say the lake job I mean ' +
    'project #4421"). Keep each note one short sentence. Do not store ' +
    'sensitive information (passwords, payment details).',
  input_schema: {
    type: 'object',
    required: ['note'],
    properties: {
      note: { type: 'string', description: 'The preference or fact to remember. One short sentence.' },
    },
  },
}
const remember_preference_run: ToolExecutor = async (args, ctx) => {
  const sb = userClient(ctx)
  const note = (args?.note ?? '').toString().trim()
  if (!note) throw new Error('note is required')
  if (note.length > 500) throw new Error('note must be 500 characters or fewer')

  const { data: row, error: rErr } = await sb
    .from('agent_user_preferences')
    .select('notes')
    .eq('user_id', ctx.userId)
    .maybeSingle()
  if (rErr) throw new Error(rErr.message)

  const list: Array<any> = Array.isArray(row?.notes) ? row.notes : []
  if (list.length >= 50) {
    throw new Error('You already have 50 saved preferences — ask the user which one to forget first.')
  }
  const entry = {
    id:         crypto.randomUUID(),
    text:       note,
    created_at: new Date().toISOString(),
  }
  const next = [...list, entry]
  const { error: uErr } = await sb
    .from('agent_user_preferences')
    .upsert({ user_id: ctx.userId, notes: next }, { onConflict: 'user_id' })
  if (uErr) throw new Error(uErr.message)
  return { saved: entry, total_preferences: next.length }
}

// ──────────────────────────────────────────────────────────────────────────
// Tool: forget_preference
// ──────────────────────────────────────────────────────────────────────────
const forget_preference_def: ToolDefinition = {
  name: 'forget_preference',
  description:
    'Remove a saved preference. Pass the id from a previous list_preferences ' +
    'or remember_preference result, or pass a substring of the note text. ' +
    'If the substring matches more than one note this returns the candidates ' +
    'instead of deleting — confirm with the user before retrying with the id.',
  input_schema: {
    type: 'object',
    properties: {
      id:    { type: 'string', description: 'Exact id of the preference to remove.' },
      match: { type: 'string', description: 'Substring of the note text (case-insensitive).' },
    },
  },
}
const forget_preference_run: ToolExecutor = async (args, ctx) => {
  const sb = userClient(ctx)
  const { data: row, error: rErr } = await sb
    .from('agent_user_preferences')
    .select('notes')
    .eq('user_id', ctx.userId)
    .maybeSingle()
  if (rErr) throw new Error(rErr.message)
  const list: Array<any> = Array.isArray(row?.notes) ? row.notes : []
  if (list.length === 0) return { removed: null, total_preferences: 0, message: 'No preferences saved yet.' }

  let toRemove: any[] = []
  if (args?.id) {
    toRemove = list.filter(n => n?.id === args.id)
  } else if (args?.match) {
    const q = String(args.match).toLowerCase()
    toRemove = list.filter(n => (n?.text || '').toLowerCase().includes(q))
  } else {
    throw new Error('Pass either id or match.')
  }
  if (toRemove.length === 0) return { removed: null, total_preferences: list.length, message: 'No matching preference.' }
  if (toRemove.length > 1 && args?.match) {
    return { removed: null, candidates: toRemove, message: 'Multiple matches — confirm which id to forget.' }
  }
  const remaining = list.filter(n => !toRemove.includes(n))
  const { error: uErr } = await sb
    .from('agent_user_preferences')
    .upsert({ user_id: ctx.userId, notes: remaining }, { onConflict: 'user_id' })
  if (uErr) throw new Error(uErr.message)
  return { removed: toRemove[0], total_preferences: remaining.length }
}

// ──────────────────────────────────────────────────────────────────────────
// Tool: list_preferences
// ──────────────────────────────────────────────────────────────────────────
const list_preferences_def: ToolDefinition = {
  name: 'list_preferences',
  description:
    'Return the current user saved preferences with their ids. Use when ' +
    'the user asks what you remember about them, or before forgetting one ' +
    'so you can show options.',
  input_schema: { type: 'object', properties: {} },
}
const list_preferences_run: ToolExecutor = async (_args, ctx) => {
  const sb = userClient(ctx)
  const { data: row, error } = await sb
    .from('agent_user_preferences')
    .select('notes, updated_at')
    .eq('user_id', ctx.userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return {
    preferences: Array.isArray(row?.notes) ? row.notes : [],
    updated_at:  row?.updated_at ?? null,
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Tool: log_feature_request
// ──────────────────────────────────────────────────────────────────────────
// Persists a feature request, bug report, or enhancement idea to the
// feature_requests table and emails Brian via the send-email function so
// he gets notified the moment one comes in. Sam should call this whenever
// the user asks "yes, log it" (or equivalent) after Sam offers to log a
// product gap. Never claim to log without invoking this tool.
const log_feature_request_def: ToolDefinition = {
  name: 'log_feature_request',
  description:
    'Log a feature request, bug report, or enhancement idea so the product team is notified. ' +
    'Call this whenever the user asks you to log/file/track a request or product gap, OR after ' +
    'they confirm "yes" to your offer to log one. NEVER tell the user a request was logged ' +
    'unless you actually called this tool. The request is saved to the feature_requests table ' +
    'and an email goes to the product owner.',
  input_schema: {
    type: 'object',
    required: ['title', 'body', 'category'],
    properties: {
      title:    { type: 'string', description: 'Short summary, ~3-10 words. Example: "GPM by salesperson breakdown"' },
      body:     { type: 'string', description: 'Full description of what the user wants, in their own words where possible. Include any context that would help an engineer understand it.' },
      category: { type: 'string', enum: ['feature','bug','enhancement','other'], description: 'feature = new capability; bug = something is broken; enhancement = small tweak to existing capability; other = anything else (e.g. UX feedback).' },
    },
  },
}
const log_feature_request_run: ToolExecutor = async (args, ctx) => {
  const sb = userClient(ctx)

  const title = (args?.title || '').toString().trim().slice(0, 200)
  const body  = (args?.body  || '').toString().trim().slice(0, 5000)

  // Normalize category. The model sometimes returns capitalized values
  // ("Enhancement", "Bug"), or close-but-not-exact terms ("improvement",
  // "issue"). Lowercase, alias common synonyms, then fall back to 'other'
  // so we never throw on an out-of-vocab category — the row still saves.
  let category = (args?.category || 'feature').toString().trim().toLowerCase()
  const aliasMap: Record<string, string> = {
    feature: 'feature', features: 'feature', request: 'feature', 'feature request': 'feature', 'new feature': 'feature',
    bug: 'bug', bugs: 'bug', issue: 'bug', error: 'bug', defect: 'bug', 'bug report': 'bug',
    enhancement: 'enhancement', enhancements: 'enhancement', improvement: 'enhancement', tweak: 'enhancement', polish: 'enhancement',
    other: 'other', misc: 'other', feedback: 'other', suggestion: 'other',
  }
  category = aliasMap[category] || 'other'

  if (!title || !body) throw new Error('title and body are required (Sam was missing one of them)')

  // Insert. RLS allows users to insert rows where user_id = auth.uid().
  const { data: row, error } = await sb.from('feature_requests').insert({
    user_id:         ctx.userId,
    conversation_id: ctx.conversationId || null,
    title,
    body,
    category,
    source:          'sam',
    status:          'new',
    priority:        'medium',
  }).select('id').single()
  if (error) throw new Error('Could not save request: ' + error.message)

  // Look up reporter name for the email
  let reporter = 'a user'
  try {
    const { data: prof } = await sb.from('profiles')
      .select('full_name, email').eq('id', ctx.userId).maybeSingle()
    if (prof?.full_name) reporter = prof.full_name
    else if (prof?.email) reporter = prof.email
  } catch { /* non-fatal */ }

  // Fire-and-forget email notification to Brian. Don't block the user reply if it fails.
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const html = `
      <p><strong>${reporter}</strong> just logged a ${category} via Sam:</p>
      <p style="font-size:18px;margin:12px 0;"><strong>${title.replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]!))}</strong></p>
      <p style="white-space:pre-wrap;">${body.replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]!))}</p>
      <hr>
      <p style="font-size:12px;color:#666;">
        Open the Admin → Feedback Inbox to triage. Request id: <code>${row.id}</code>
      </p>
    `.trim()
    await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ctx.userJwt}` },
      body: JSON.stringify({
        to:      'brian@picturebuild.com',
        subject: `[PBS feedback · ${category}] ${title}`,
        html,
        text:    `${reporter} logged a ${category}: ${title}\n\n${body}\n\nRequest id: ${row.id}`,
      }),
    })
  } catch (e) {
    console.warn('feature_request email notify failed:', e)
  }

  // Reporter confirmation email — acknowledges receipt and restates the
  // ticket so the originator can verify Sam captured it correctly. Branded
  // template mirrors the look of sendFeedbackStatusEmail in lib/notify.js
  // for consistency. Failures are swallowed so they never block the chat.
  if (reporterEmail) {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
      const esc = (s: string) => s.replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]!))
      const niceCategory = ({
        feature: 'Feature Request',
        bug: 'Bug Report',
        enhancement: 'Enhancement',
        other: 'Request',
      } as Record<string, string>)[category] || 'Request'
      const cb = ({
        feature: { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af' },
        bug:     { bg: '#fef2f2', border: '#fecaca', text: '#991b1b' },
        enhancement: { bg: '#faf5ff', border: '#e9d5ff', text: '#6b21a8' },
        other:   { bg: '#f3f4f6', border: '#d1d5db', text: '#374151' },
      } as Record<string, {bg:string;border:string;text:string}>)[category]
      const ackHtml = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#3A5038;padding:28px 32px;text-align:center;">
            <span style="font-size:28px;">🌿</span>
            <p style="margin:8px 0 0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">
              Picture Build System
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111827;">
              We got your ${niceCategory.toLowerCase()}!
            </h1>
            <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">
              Thanks ${esc(reporter)} — Sam logged your request and the team has been notified. Here's what we captured so you can confirm it's right:
            </p>
            <div style="display:inline-block;background:${cb.bg};border:1px solid ${cb.border};color:${cb.text};padding:4px 12px;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">
              ${esc(niceCategory)}
            </div>
            <p style="color:#111827;font-size:16px;font-weight:600;margin:0 0 12px;">
              ${esc(title)}
            </p>
            <p style="color:#374151;font-size:14px;line-height:1.6;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:14px;white-space:pre-wrap;margin:0 0 20px;">
              ${esc(body)}
            </p>
            <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0 0 4px;">
              You'll get another email when the team moves this to <strong>In Progress</strong> or <strong>Completed</strong>. You can also track it any time under <strong>Help &amp; Support → Support Tickets</strong>.
            </p>
            <p style="color:#9ca3af;font-size:11px;margin:20px 0 0;">
              Reference: <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;">${esc(row.id)}</code>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f3f4f6;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              Picture Build System<br>
              You're receiving this because you submitted a request through Sam.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`.trim()
      await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ctx.userJwt}` },
        body: JSON.stringify({
          to:      reporterEmail,
          subject: `We got your ${niceCategory.toLowerCase()}: ${title}`,
          html:    ackHtml,
          text:    `Thanks ${reporter} — your ${niceCategory.toLowerCase()} has been logged.\n\nTitle: ${title}\n\nDetails:\n${body}\n\nYou'll get another email when the status changes. Reference: ${row.id}`,
        }),
      })
    } catch (e) {
      console.warn('feature_request reporter confirmation email failed:', e)
    }
  }

  return {
    saved:       true,
    request_id:  row.id,
    confirmation: `Logged as ${category} #${row.id.slice(0, 8)}. Brian was notified by email.`,
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Registry
// ──────────────────────────────────────────────────────────────────────────
export const TOOLS: Array<{ definition: ToolDefinition; execute: ToolExecutor }> = [
  { definition: today_def,                execute: today_run },
  { definition: list_stats_def,           execute: list_stats_run },
  { definition: get_stat_values_def,      execute: get_stat_values_run },
  { definition: list_bids_def,            execute: list_bids_run },
  { definition: bid_summary_def,          execute: bid_summary_run },
  { definition: list_jobs_def,            execute: list_jobs_run },
  { definition: get_job_def,              execute: get_job_run },
  { definition: list_clients_def,         execute: list_clients_run },
  { definition: compare_periods_def,      execute: compare_periods_run },
  { definition: remember_preference_def,  execute: remember_preference_run },
  { definition: forget_preference_def,    execute: forget_preference_run },
  { definition: list_preferences_def,     execute: list_preferences_run },
  { definition: log_feature_request_def,  execute: log_feature_request_run },
]

export const TOOL_DEFINITIONS = TOOLS.map(t => t.definition)
export const TOOL_EXECUTORS: Record<string, ToolExecutor> = Object.fromEntries(
  TOOLS.map(t => [t.definition.name, t.execute]),
)
