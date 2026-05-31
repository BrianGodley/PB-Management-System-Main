// supabase/functions/agent-chat/tools.ts
//
// Sam's tool registry. Each tool has:
//   - definition: JSON-schema input the model sees (advertised capability)
//   - execute:    Deno function that runs the tool and returns a JSON result
//
// Executors run with a Supabase client built from the user's JWT so RLS is
// enforced — Sam can only read what the user themselves can read. Service
// role is never used here.

import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2'

export type ToolContext = {
  userJwt:         string
  userId:          string
  conversationId?: string  // current conversation, used by log_feature_request to link the request back to the chat
  appOrigin?:      string  // browser origin that made the request (e.g. "https://pbs.picturebuild.com"), used to build absolute URLs in emails
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
    'they confirm "yes" to your offer to log one. ' +
    'IMPORTANT: any photos or files the user attached to this conversation are AUTOMATICALLY ' +
    'copied to the ticket so admins can see them — you do NOT need a separate attachment ' +
    'parameter. File the ticket confidently even when attachments are present; never refuse or ' +
    'apologise saying you "can only forward text" because attachments are handled for you. ' +
    'NEVER tell the user a request was logged unless you actually called this tool. The request ' +
    'is saved to the feature_requests table and an email goes to the product owner.',
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

  // Auto-attach every file the user uploaded in this conversation. Mirrors
  // the rows in agent_message_attachments into feature_request_attachments
  // so admins reviewing the ticket in Help center see them inline. Both
  // tables reference the same object in the sam-attachments bucket — no
  // file duplication. Non-fatal: a failure here just means the ticket
  // lands without attachments, which is recoverable manually.
  if (ctx.conversationId) {
    try {
      const { data: convAtts } = await sb
        .from('agent_message_attachments')
        .select('id, storage_path, file_name, mime_type, size_bytes, kind')
        .eq('conversation_id', ctx.conversationId)
      if (convAtts && convAtts.length) {
        const toInsert = convAtts.map((a: any) => ({
          feature_request_id:           row.id,
          source_message_attachment_id: a.id,
          user_id:                      ctx.userId,
          storage_path:                 a.storage_path,
          file_name:                    a.file_name,
          mime_type:                    a.mime_type,
          size_bytes:                   a.size_bytes,
          kind:                         a.kind,
        }))
        const { error: attErr } = await sb.from('feature_request_attachments').insert(toInsert)
        if (attErr) console.warn('feature_request_attachments insert failed:', attErr.message)
      }
    } catch (e) {
      console.warn('feature_request_attachments copy failed:', e instanceof Error ? e.message : e)
    }
  }

  // Look up reporter profile — name for the admin notification's prose,
  // email for the reporter's own confirmation email below.
  let reporter = 'a user'
  let reporterEmail: string | null = null
  try {
    const { data: prof } = await sb.from('profiles')
      .select('full_name, email').eq('id', ctx.userId).maybeSingle()
    if (prof?.full_name) reporter = prof.full_name
    else if (prof?.email) reporter = prof.email
    reporterEmail = (prof?.email as string) || null
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

  // Reporter confirmation email — uses the SAME branded layout as the
  // status-change email (sendFeedbackStatusEmail in src/lib/notify.js) so
  // the reporter sees a consistent look for both the "we got it" and "it's
  // done" messages. Failures are swallowed so they never block the chat.
  if (reporterEmail) {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
      const escapeHtml = (s: string) => s.replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]!))
      const brandColor = '#3A5038'
      // Help-page button URL. Priority:
      //   1. ctx.appOrigin — the actual browser origin that initiated the
      //      chat request (sent automatically as the Origin/Referer header).
      //   2. APP_URL env var — manual override for cases where Origin isn't
      //      reliable (e.g. mobile clients without a Referer policy).
      //   3. Empty → button is omitted so we never ship a broken link.
      const appUrl  = (ctx.appOrigin || Deno.env.get('APP_URL') || '').replace(/\/$/, '')
      const helpUrl = appUrl ? `${appUrl}/help` : ''
      // Category pill colors (mirror the BUCKET_BADGE_STYLE swatches in Help.jsx).
      const badge = (() => {
        switch (category) {
          case 'feature':     return { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af', label: 'Feature Request' }
          case 'bug':         return { bg: '#fef2f2', border: '#fecaca', text: '#991b1b', label: 'Bug Report' }
          case 'enhancement': return { bg: '#faf5ff', border: '#e9d5ff', text: '#6b21a8', label: 'Enhancement' }
          default:            return { bg: '#f3f4f6', border: '#d1d5db', text: '#374151', label: 'Request' }
        }
      })()
      const subject = `We got your ${badge.label.toLowerCase()}: ${title}`

      // Body uses the exact same shape as the status-change email's body
      // (intro prose → bold title → pill badge → gray notes box →
      // closing prose), then baseTemplate wraps it with the green header,
      // h1, optional button, and footer.
      const innerBody = `
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 12px;">
      Thanks for the heads up — Sam logged the following and the team has been notified:
    </p>
    <p style="color:#111827;font-size:16px;font-weight:600;margin:0 0 16px;">
      ${escapeHtml(title)}
    </p>
    <div style="display:inline-block;background:${badge.bg};border:1px solid ${badge.border};
                color:${badge.text};padding:8px 20px;border-radius:8px;font-weight:700;font-size:15px;margin-bottom:16px;">
      ${badge.label}
    </div>
    <p style="color:#6b7280;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.4px;margin:20px 0 6px;">
      What you sent us
    </p>
    <p style="color:#374151;font-size:14px;line-height:1.6;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:14px;white-space:pre-wrap;margin:0;">
      ${escapeHtml(body)}
    </p>
    <p style="color:#6b7280;font-size:13px;margin:20px 0 0;">
      You'll get another email when the team moves this to In Progress or Completed. You can see all your open and resolved requests in the Help section of PBS.
    </p>`

      // Mirror of baseTemplate() from src/lib/notify.js — kept inline here
      // because Edge Functions can't import from src/.
      const ackHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Request Received</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:${brandColor};padding:28px 32px;text-align:center;">
            <span style="font-size:28px;">🌿</span>
            <p style="margin:8px 0 0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">
              Picture Build System
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111827;">Request Received</h1>
            ${innerBody}
            ${helpUrl ? `
            <div style="margin-top:28px;text-align:center;">
              <a href="${helpUrl}"
                 style="display:inline-block;background:${brandColor};color:#ffffff;text-decoration:none;
                        padding:12px 28px;border-radius:10px;font-weight:700;font-size:15px;">
                Open Help &amp; Support
              </a>
            </div>` : ''}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f3f4f6;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              Picture Build System<br>
              You're receiving this because you have an account on this system.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`.trim()

      await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ctx.userJwt}` },
        body: JSON.stringify({
          to:      reporterEmail,
          subject,
          html:    ackHtml,
          text:    `Thanks — your ${badge.label.toLowerCase()} has been logged.\n\nTitle: ${title}\n\nWhat you sent us:\n${body}\n\nYou'll get another email when the status changes. Reference: ${row.id}`,
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
// Tool: list_feature_requests
// ──────────────────────────────────────────────────────────────────────────
// Returns the user's own tickets so Sam can help them find an earlier one
// to reference or amend. Admin-filed status / notes are NOT exposed here —
// users only see their own rows by RLS anyway.
const list_feature_requests_def: ToolDefinition = {
  name: 'list_feature_requests',
  description:
    'List the current user\'s OWN feature requests, bug reports, and ' +
    'enhancement ideas so they can reference or amend an earlier one. ' +
    'Returns id, title, category, status, created_at, updated_at, and an ' +
    'attachment count per ticket. Use when the user asks things like ' +
    '"what did I file last week", "show me my open bugs", or "find that ' +
    'ticket about the calendar". Filter by category, status, or recency ' +
    'to keep the list short.',
  input_schema: {
    type: 'object',
    properties: {
      category:  { type: 'string', enum: ['feature','bug','enhancement','other'], description: 'Optional category filter.' },
      status:    { type: 'string', enum: ['new','triaged','in_progress','done','declined'], description: 'Optional status filter (DB values).' },
      days_back: { type: 'number', description: 'Only return tickets created in the last N days. Default 90.' },
      search:    { type: 'string', description: 'Optional case-insensitive substring match on title or body.' },
      limit:     { type: 'number', description: 'Cap results. Default 20, max 100.' },
    },
  },
}
const list_feature_requests_run: ToolExecutor = async (args, ctx) => {
  const sb = userClient(ctx)
  const limit = Math.max(1, Math.min(Number(args?.limit) || 20, 100))
  const days  = Math.max(1, Math.min(Number(args?.days_back) || 90, 365))
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  let q = sb
    .from('feature_requests')
    .select('id, title, body, category, status, created_at, updated_at')
    .eq('user_id', ctx.userId)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (args?.category) q = q.eq('category', args.category)
  if (args?.status)   q = q.eq('status',   args.status)
  if (args?.search) {
    const term = String(args.search).replace(/[%,()*]/g, ' ').trim()
    if (term) q = q.or(`title.ilike.*${term}*,body.ilike.*${term}*`)
  }
  const { data, error } = await q
  if (error) throw new Error('Could not list tickets: ' + error.message)

  // Attachment counts — one round trip across all returned ids.
  const ids = (data || []).map(r => r.id)
  const attCounts: Record<string, number> = {}
  if (ids.length) {
    const { data: atts } = await sb
      .from('feature_request_attachments')
      .select('feature_request_id')
      .in('feature_request_id', ids)
    for (const a of atts || []) {
      attCounts[a.feature_request_id] = (attCounts[a.feature_request_id] || 0) + 1
    }
  }

  return {
    count: data?.length || 0,
    tickets: (data || []).map(r => ({
      id:               r.id,
      short_id:         r.id.slice(0, 8),
      title:            r.title,
      body_preview:     (r.body || '').slice(0, 200),
      category:         r.category,
      status:           r.status,
      created_at:       r.created_at,
      updated_at:       r.updated_at,
      attachment_count: attCounts[r.id] || 0,
    })),
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Tool: get_feature_request
// ──────────────────────────────────────────────────────────────────────────
// Full details for one ticket the user owns. Includes the attachment list
// so Sam can mention by name what's already on the ticket.
const get_feature_request_def: ToolDefinition = {
  name: 'get_feature_request',
  description:
    'Get the full details of a single feature request / bug / enhancement ' +
    'ticket the user owns. Returns title, body, category, status, created ' +
    'and updated timestamps, and the list of attachments by filename. Use ' +
    'after list_feature_requests once the user has picked which ticket to ' +
    'amend or discuss. Accepts the full UUID or the short 8-char id from ' +
    'list_feature_requests.',
  input_schema: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', description: 'Ticket UUID, or the short 8-char id from list_feature_requests.' },
    },
  },
}
const get_feature_request_run: ToolExecutor = async (args, ctx) => {
  const sb = userClient(ctx)
  const id = String(args?.id || '').trim()
  if (!id) throw new Error('id is required')

  // Allow short ids by matching with a LIKE prefix; RLS still restricts to
  // the user's own rows so this is safe.
  const isFull = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  let q = sb
    .from('feature_requests')
    .select('id, title, body, category, status, priority, created_at, updated_at')
    .eq('user_id', ctx.userId)
    .limit(2)
  q = isFull ? q.eq('id', id) : q.ilike('id::text', `${id}%`)
  const { data, error } = await q
  if (error) throw new Error('Could not load ticket: ' + error.message)
  if (!data || data.length === 0) throw new Error(`No ticket found for id "${id}"`)
  if (data.length > 1) throw new Error(`Short id "${id}" matched multiple tickets — please use the full id.`)
  const row = data[0]

  const { data: atts } = await sb
    .from('feature_request_attachments')
    .select('id, file_name, mime_type, size_bytes, kind, created_at')
    .eq('feature_request_id', row.id)
    .order('created_at', { ascending: true })

  return {
    id:          row.id,
    short_id:    row.id.slice(0, 8),
    title:       row.title,
    body:        row.body,
    category:    row.category,
    status:      row.status,
    priority:    row.priority,
    created_at:  row.created_at,
    updated_at:  row.updated_at,
    attachments: (atts || []).map((a: any) => ({
      file_name: a.file_name,
      kind:      a.kind,
      size_kb:   Math.round((a.size_bytes || 0) / 1024),
    })),
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Tool: update_feature_request
// ──────────────────────────────────────────────────────────────────────────
// Lets the user amend their own ticket — title, body, and/or category.
// Status / priority / admin_notes are intentionally NOT exposed: those are
// admin-controlled workflow fields. Any attachments the user has added to
// this conversation that aren't already on the ticket also get linked.
const update_feature_request_def: ToolDefinition = {
  name: 'update_feature_request',
  description:
    'Amend an existing ticket the user owns. You can change the title, ' +
    'body (description), and/or category — pass only the fields the user ' +
    'wants changed. STATUS and PRIORITY are admin-controlled and not ' +
    'editable through this tool; refuse politely if the user asks to change ' +
    'either ("Status is moved by an admin from the Help center"). Any new ' +
    'photos/files the user has attached to this conversation that aren\'t ' +
    'already on the ticket will be added automatically.',
  input_schema: {
    type: 'object',
    required: ['id'],
    properties: {
      id:       { type: 'string', description: 'Ticket UUID or short 8-char id.' },
      title:    { type: 'string', description: 'New title. Optional.' },
      body:     { type: 'string', description: 'New body / description. Optional.' },
      category: { type: 'string', enum: ['feature','bug','enhancement','other'], description: 'New category. Optional.' },
    },
  },
}
const update_feature_request_run: ToolExecutor = async (args, ctx) => {
  const sb = userClient(ctx)
  const id = String(args?.id || '').trim()
  if (!id) throw new Error('id is required')

  // Resolve short id → full id (RLS scopes to user's own rows).
  const isFull = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  let lookup = sb
    .from('feature_requests')
    .select('id, title, body, category')
    .eq('user_id', ctx.userId)
    .limit(2)
  lookup = isFull ? lookup.eq('id', id) : lookup.ilike('id::text', `${id}%`)
  const { data: existing, error: lookupErr } = await lookup
  if (lookupErr) throw new Error('Could not look up ticket: ' + lookupErr.message)
  if (!existing || existing.length === 0) throw new Error(`No ticket found for id "${id}"`)
  if (existing.length > 1) throw new Error(`Short id "${id}" matched multiple tickets — please use the full id.`)
  const fullId = existing[0].id

  // Build patch — only fields the model explicitly set.
  const patch: Record<string, unknown> = {}
  if (typeof args?.title === 'string'    && args.title.trim())    patch.title    = args.title.trim().slice(0, 200)
  if (typeof args?.body === 'string'     && args.body.trim())     patch.body     = args.body.trim().slice(0, 5000)
  if (typeof args?.category === 'string' && args.category.trim()) patch.category = args.category.trim().toLowerCase()
  if (Object.keys(patch).length === 0 && !ctx.conversationId) {
    throw new Error('Nothing to update — provide at least one of title, body, or category.')
  }

  if (Object.keys(patch).length > 0) {
    const { error: upErr } = await sb
      .from('feature_requests')
      .update(patch)
      .eq('id', fullId)
    if (upErr) throw new Error('Could not save changes: ' + upErr.message)
  }

  // Auto-attach any new files from this conversation that aren't already
  // linked to this ticket. Dedupe by source_message_attachment_id.
  let newAttachmentsLinked = 0
  if (ctx.conversationId) {
    const { data: convAtts } = await sb
      .from('agent_message_attachments')
      .select('id, storage_path, file_name, mime_type, size_bytes, kind')
      .eq('conversation_id', ctx.conversationId)
    if (convAtts && convAtts.length) {
      const { data: alreadyLinked } = await sb
        .from('feature_request_attachments')
        .select('source_message_attachment_id')
        .eq('feature_request_id', fullId)
      const linkedSet = new Set(
        (alreadyLinked || []).map((r: any) => r.source_message_attachment_id).filter(Boolean)
      )
      const toAdd = convAtts.filter((a: any) => !linkedSet.has(a.id))
      if (toAdd.length) {
        const rows = toAdd.map((a: any) => ({
          feature_request_id:           fullId,
          source_message_attachment_id: a.id,
          user_id:                      ctx.userId,
          storage_path:                 a.storage_path,
          file_name:                    a.file_name,
          mime_type:                    a.mime_type,
          size_bytes:                   a.size_bytes,
          kind:                         a.kind,
        }))
        const { error: attErr } = await sb.from('feature_request_attachments').insert(rows)
        if (!attErr) newAttachmentsLinked = rows.length
        else console.warn('amendment attachment insert failed:', attErr.message)
      }
    }
  }

  const { data: refreshed } = await sb
    .from('feature_requests')
    .select('id, title, body, category, status, updated_at')
    .eq('id', fullId)
    .maybeSingle()

  return {
    saved: true,
    request_id: fullId,
    short_id: fullId.slice(0, 8),
    fields_updated: Object.keys(patch),
    new_attachments_linked: newAttachmentsLinked,
    current: refreshed,
    confirmation:
      `Updated ticket #${fullId.slice(0, 8)}` +
      (Object.keys(patch).length ? ` (${Object.keys(patch).join(', ')})` : '') +
      (newAttachmentsLinked ? ` and linked ${newAttachmentsLinked} new attachment${newAttachmentsLinked === 1 ? '' : 's'}` : '') +
      '.',
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Tool: create_estimate_from_takeoff
// ──────────────────────────────────────────────────────────────────────────
// Allowed module_type values. MUST match the strings the Estimator UI uses
// (see MODULE_GROUPS in src/pages/EstimateDetail.jsx). If you add a new
// module type to the estimator, add it here too.
const ALLOWED_MODULE_TYPES = [
  'Hand Demo', 'Mini Skid Steer Demo', 'Skid Steer Demo',
  'Utilities', 'Drainage',
  'Concrete', 'Pavers', 'Artificial Turf', 'Ground Treatments', 'Steps',
  'Pool', 'Outdoor Kitchen', 'Fire Pit', 'Walls', 'Columns',
  'Water Features', 'Lighting', 'Finishes',
  'Irrigation', 'Planting',
] as const

const create_estimate_from_takeoff_def: ToolDefinition = {
  name: 'create_estimate_from_takeoff',
  description:
    "Create a new estimate in PBS from a plan-set takeoff. Use AFTER you've " +
    'produced a structured takeoff and the user has confirmed they want it ' +
    'pushed into the Estimator (e.g. "yes, create the estimate" / "go ahead"). ' +
    'Creates a pending Residential/Commercial/Public Works estimate with one ' +
    'project containing one module per category from your takeoff. Each module ' +
    "starts empty (man_days=0, no rates) but its 'notes' field is pre-filled " +
    "with your takeoff text for that section so the user can type the actual " +
    "values in. Returns the new estimate id and a URL the user can click to " +
    "open it. DO NOT call this without an explicit yes from the user.",
  input_schema: {
    type: 'object',
    required: ['estimate_name', 'type', 'modules'],
    properties: {
      estimate_name: { type: 'string', description: 'Short estimate name (e.g. "Backyard").' },
      type: {
        type: 'string',
        enum: ['Residential', 'Commercial', 'Public Works'],
        description: 'Project type. Default Residential unless plan/context says otherwise.',
      },
      client_id: { type: 'string', description: 'UUID of an existing client from list_clients. Optional.' },
      client_name: { type: 'string', description: 'Free-text client name when client_id is unknown.' },
      project_name: {
        type: 'string',
        description: "Project container name. Defaults to 'Auto Takeoff'.",
      },
      modules: {
        type: 'array',
        minItems: 1,
        description: 'One entry per category in your takeoff that has actual scope.',
        items: {
          type: 'object',
          required: ['module_type', 'notes'],
          properties: {
            module_type: {
              type: 'string',
              enum: [...ALLOWED_MODULE_TYPES],
              description: 'Exact estimator module name ("Pavers" not "Paver", "Hand Demo" not "HandDemo").',
            },
            module_name: { type: 'string', description: 'Optional label (e.g. "Front Walkway").' },
            notes: {
              type: 'string',
              description: 'Self-contained takeoff text — quantities + assumptions + plan refs.',
            },
          },
        },
      },
    },
  },
}

const create_estimate_from_takeoff_run: ToolExecutor = async (args, ctx) => {
  const sb = userClient(ctx)
  const estimateName = String(args?.estimate_name || '').trim()
  if (!estimateName) throw new Error('estimate_name is required.')
  const type = String(args?.type || '').trim()
  if (!['Residential', 'Commercial', 'Public Works'].includes(type)) {
    throw new Error('type must be Residential, Commercial, or Public Works.')
  }
  const modulesIn = Array.isArray(args?.modules) ? args.modules : []
  if (!modulesIn.length) throw new Error('modules must have at least one entry.')

  const allowed = new Set<string>(ALLOWED_MODULE_TYPES as readonly string[])
  for (const m of modulesIn) {
    if (!m || typeof m !== 'object') throw new Error('Each module must be an object.')
    if (!allowed.has(m.module_type)) {
      throw new Error(`Unknown module_type "${m.module_type}". Allowed: ${[...allowed].join(', ')}.`)
    }
    if (!String(m.notes || '').trim()) {
      throw new Error(`Module "${m.module_type}" is missing notes (the takeoff content).`)
    }
  }

  // Resolve client_id from client_name when Sam only gave us a name.
  // Without a client_id the estimate appears at the top-level Estimates
  // tab but NOT under Opportunity → Estimates (that view filters by
  // client_name eq <opp name>, which won't match a stray "Griefer
  // Residence" against an opp recorded as just "Griefer"). We do a
  // case-insensitive fuzzy match against name/first/last/company; if
  // exactly one client matches we use them, multiples get returned to
  // Sam so she can ask the user which.
  let resolvedClientId: string | null = args?.client_id || null
  let resolvedClientName: string | null = args?.client_name || null
  let resolveAmbiguous: { id: string; label: string }[] = []
  if (!resolvedClientId && resolvedClientName) {
    const needle = resolvedClientName.trim().replace(/['"%(),]/g, '')
    if (needle) {
      const tokens = needle.split(/\s+/).filter(t => t.length >= 3)
      const searchTerm = tokens.length ? tokens[0] : needle
      const { data: candidates } = await sb
        .from('clients')
        .select('id, name, first_name, last_name, company_name')
        .or(
          `name.ilike.%${searchTerm}%,` +
          `first_name.ilike.%${searchTerm}%,` +
          `last_name.ilike.%${searchTerm}%,` +
          `company_name.ilike.%${searchTerm}%`
        )
        .limit(10)
      const cands = candidates || []
      if (cands.length === 1) {
        const c = cands[0]
        resolvedClientId = c.id
        resolvedClientName =
          c.name ||
          [c.last_name, c.first_name].filter(Boolean).join(', ') ||
          c.company_name ||
          resolvedClientName
      } else if (cands.length > 1) {
        resolveAmbiguous = cands.map(c => ({
          id: c.id,
          label:
            c.name ||
            [c.last_name, c.first_name].filter(Boolean).join(', ') ||
            c.company_name ||
            '(unnamed)',
        }))
      }
    }
  }

  const { data: estimate, error: estErr } = await sb
    .from('estimates')
    .insert({
      estimate_name:  estimateName,
      type,
      status:         'pending',
      client_id:      resolvedClientId,
      client_name:    resolvedClientName,
      created_by:     ctx.userId,
    })
    .select('id, estimate_name, type, client_id, client_name, status, created_at')
    .single()
  if (estErr) throw new Error(`Could not create estimate: ${estErr.message}`)

  const projectName = String(args?.project_name || '').trim() || 'Auto Takeoff'
  const { data: project, error: projErr } = await sb
    .from('estimate_projects')
    .insert({ estimate_id: estimate.id, project_name: projectName })
    .select('id, project_name')
    .single()
  if (projErr) {
    await sb.from('estimates').delete().eq('id', estimate.id)
    throw new Error(`Could not create project: ${projErr.message}`)
  }

  const rows = modulesIn.map((m: any) => ({
    project_id:    project.id,
    module_type:   m.module_type,
    module_name:   (m.module_name || '').trim() || m.module_type,
    man_days:      0,
    material_cost: 0,
    labor_cost:    0,
    labor_burden:  0,
    gross_profit:  0,
    sub_cost:      0,
    total_price:   0,
    data:          null,
    notes:         String(m.notes).trim(),
  }))
  const { data: modules, error: modErr } = await sb
    .from('estimate_modules')
    .insert(rows)
    .select('id, module_type, module_name, notes')
  if (modErr) {
    await sb.from('estimate_projects').delete().eq('id', project.id)
    await sb.from('estimates').delete().eq('id', estimate.id)
    throw new Error(`Could not create modules: ${modErr.message}`)
  }

  const appUrl = (ctx.appOrigin || Deno.env.get('APP_URL') || '').replace(/\/$/, '')
  const estimateUrl = appUrl ? `${appUrl}/estimates/${estimate.id}` : null

  const clientResolution =
    args?.client_id
      ? 'caller_supplied'
      : resolvedClientId
        ? 'auto_matched'
        : resolveAmbiguous.length
          ? 'ambiguous'
          : args?.client_name
            ? 'no_match'
            : 'not_provided'

  return {
    saved: true,
    estimate,
    project,
    modules: modules || [],
    url: estimateUrl,
    client_resolution: clientResolution,
    ambiguous_clients: resolveAmbiguous,
    confirmation:
      `Created estimate "${estimate.estimate_name}" with ${rows.length} module${rows.length === 1 ? '' : 's'}` +
      (estimateUrl ? `. Open it here: ${estimateUrl}` : '. Open it from the Estimator tab.'),
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
  { definition: log_feature_request_def,    execute: log_feature_request_run },
  { definition: list_feature_requests_def,  execute: list_feature_requests_run },
  { definition: get_feature_request_def,    execute: get_feature_request_run },
  { definition: update_feature_request_def, execute: update_feature_request_run },
  { definition: create_estimate_from_takeoff_def,   execute: create_estimate_from_takeoff_run },
]

export const TOOL_DEFINITIONS = TOOLS.map(t => t.definition)
export const TOOL_EXECUTORS: Record<string, ToolExecutor> = Object.fromEntries(
  TOOLS.map(t => [t.definition.name, t.execute]),
)
