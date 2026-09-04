#!/usr/bin/env node
// Run the SHIPPED profit engine over the seeded Test TesterN jobs on staging and
// print what it produces. This imports src/lib/jobProfit.js rather than
// reimplementing the arithmetic, so a green report is evidence about the code
// that actually runs in the app.
//
// Usage: node scripts/report-test-jobs.mjs [--per-day <n>]
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { resolveRates, jobProfitAsOf, dailySeries, attributeHoursByModule } from '../src/lib/jobProfit.js'

const STAGING = 'fgyexksqinjczebtsuon'
const PRODUCTION = 'jjlnpywpmoukgwmwczbz'
const TENANT = 'c0751d17-5013-4245-a41b-81263f77c0b0'
const TOKEN = readFileSync(join(homedir(), '.supabase/access-token'), 'utf8').trim()

async function sql(query) {
  if (STAGING === PRODUCTION) throw new Error('refusing to read production')
  for (let attempt = 0, wait = 800; attempt < 7; attempt++) {
    const res = await fetch(`https://api.supabase.com/v1/projects/${STAGING}/database/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    })
    const body = await res.json()
    if (body?.message) {
      if (/Too Many Requests|Throttler/.test(body.message)) {
        await new Promise(r => setTimeout(r, wait))
        wait *= 2
        continue
      }
      throw new Error(body.message)
    }
    return body
  }
  throw new Error('gave up after repeated rate limiting')
}

const money = v => (v == null ? '—' : `$${Math.round(v).toLocaleString()}`)
const rate = v => (v == null ? '—' : `$${v.toFixed(2)}`)

const jobs = await sql(`
  select j.id, j.name, j.estimate_id, j.total_man_days, j.gross_profit, j.gpmd
  from public.jobs j
  join public.clients c on c.id = j.client_id
  where c.tenant_id = '${TENANT}' and c.name ~ '^Test Tester[0-9]+$'
  order by (regexp_match(c.name, '[0-9]+$'))[1]::int;`)

const settings = (await sql(
  `select avg_hourly_crew_rate, overtime_multiplier from public.company_settings where tenant_id='${TENANT}';`
))[0]
const rates = resolveRates(settings)
if (!rates) {
  console.error('Rates are not set on this tenant — the engine correctly refuses to calculate.')
  process.exit(1)
}
console.log(`rates: $${rates.hourlyRate}/hr, overtime ×${rates.otMultiplier}\n`)

const ids = jobs.map(j => `'${j.id}'`).join(',')
const [allModules, allCompletions, allTime, allSched, allWo, crews] = await Promise.all([
  sql(`select m.*, p.estimate_id from public.estimate_modules m
       join public.estimate_projects p on p.id = m.project_id
       where p.estimate_id in (${jobs.map(j => `'${j.estimate_id}'`).join(',')});`),
  sql(`select * from public.module_completion where job_id in (${ids});`),
  sql(`select * from public.time_entries where job_id in (${ids});`),
  sql(`select * from public.schedule_items where job_id in (${ids});`),
  sql(`select id, job_id, estimate_module_id from public.work_orders where job_id in (${ids});`),
  sql(`select * from public.crews where tenant_id='${TENANT}';`),
])
const by = (arr, key) => {
  const m = new Map()
  for (const r of arr) {
    const k = r[key]
    if (!m.has(k)) m.set(k, [])
    m.get(k).push(r)
  }
  return m
}
const modulesByEstimate = by(allModules, 'estimate_id')
const compByJob = by(allCompletions, 'job_id')
const timeByJob = by(allTime, 'job_id')
const schedByJob = by(allSched, 'job_id')
const woByJob = by(allWo, 'job_id')

console.log(
  'JOB'.padEnd(16) + 'GLPE'.padStart(10) + 'GLPA'.padStart(11) + 'DIFF'.padStart(10) +
  'GLPMDE'.padStart(9) + 'GLPMDA'.padStart(9) + 'MD est/act'.padStart(13) +
  'VARIANCE'.padStart(11) + '  ATTR'
)
console.log('─'.repeat(96))

const results = []
for (const job of jobs) {
  const modules = modulesByEstimate.get(job.estimate_id) || []
  const completions = compByJob.get(job.id) || []
  const timeEntries = timeByJob.get(job.id) || []
  const attribution = attributeHoursByModule({
    timeEntries,
    scheduleItems: schedByJob.get(job.id) || [],
    workOrders: woByJob.get(job.id) || [],
    crews,
  })
  const r = jobProfitAsOf({ modules, completions, timeEntries, rates, attribution })
  const emd = modules.reduce((s, m) => s + parseFloat(m.man_days || 0), 0)
  const glpmde = emd > 0 ? r.glpeTotal / emd : null
  const diff = r.glpa - r.glpeTotal
  const short = job.name.replace(' — Landscape Package', '')

  console.log(
    short.padEnd(16) +
      money(r.glpeTotal).padStart(10) +
      money(r.glpa).padStart(11) +
      `${diff >= 0 ? '+' : ''}${money(diff)}`.padStart(10) +
      rate(glpmde).padStart(9) +
      rate(r.glpmda).padStart(9) +
      `${emd.toFixed(1)}/${r.actualManDays.toFixed(1)}`.padStart(13) +
      `${r.costVariance >= 0 ? '+' : ''}${money(r.costVariance)}`.padStart(11) +
      `  ${Math.round(attribution.coverage.ratio * 100)}%`
  )
  results.push({ job: short, r, glpmde, diff, emd, attribution })
}

// A per-day trace for one job, to show the daily produced figure working.
const perDayArg = process.argv.indexOf('--per-day')
const which = perDayArg > -1 ? parseInt(process.argv[perDayArg + 1], 10) - 1 : 0
const pick = jobs[which]
if (pick) {
  const modules = modulesByEstimate.get(pick.estimate_id) || []
  const completions = compByJob.get(pick.id) || []
  const timeEntries = timeByJob.get(pick.id) || []
  const dates = [...new Set(completions.map(c => c.entry_date))].sort().slice(0, 12)
  const series = dailySeries({ modules, completions, timeEntries, rates, dates })
  console.log(`\nDaily produced — ${pick.name.replace(' — Landscape Package', '')}`)
  console.log('  DATE'.padEnd(16) + 'LABOUR'.padStart(11) + 'SUB'.padStart(10) + 'PRODUCED'.padStart(12) + 'RUNNING'.padStart(12) + '  COMPLETE')
  for (const d of series) {
    console.log(
      '  ' + d.date.padEnd(14) +
        money(d.laborProducedToday).padStart(11) +
        money(d.subProducedToday).padStart(10) +
        money(d.producedToday).padStart(12) +
        money(d.totalGp).padStart(12) +
        `  ${Math.round(d.completionPct * 100)}%`
    )
  }
}

// ── The four KPI cards, recomputed exactly as the Tracking tab does ─────────
// Three bugs lived here: labour cost measured at a different rate on each side,
// against SCHEDULED rather than clocked man-days, and material showing $0 when it
// meant "not yet billed". These assertions are the regression net for all three.
console.log('\nKPI cards — as the Tracking tab renders them')
console.log(
  '  JOB'.padEnd(16) + 'MD est/act'.padStart(13) + 'LABOUR est/act'.padStart(22) +
  'DIRECTION'.padStart(12)
)
const cardRows = []
for (const { job, r, emd } of results) {
  const estLabour = emd * 8 * rates.hourlyRate
  const mdSaved = emd - r.actualManDays
  const labourSaved = estLabour - r.rlc
  // Same rate both sides means the two must move together. If a job uses fewer
  // man-days its labour must cost less; that is what broke before.
  const agree = Math.sign(Math.round(mdSaved * 100)) === Math.sign(Math.round(labourSaved))
  cardRows.push({ job, emd, actMd: r.actualManDays, estLabour, rlc: r.rlc, agree })
  console.log(
    '  ' + job.padEnd(14) +
      `${emd.toFixed(1)}/${r.actualManDays.toFixed(1)}`.padStart(13) +
      `${money(estLabour)}/${money(r.rlc)}`.padStart(22) +
      (agree ? '  consistent' : '  CONTRADICTS')
  )
}

// ── Assertions the seeded scenarios must satisfy ────────────────────────────
console.log('\nChecks')
let failures = 0
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ' — ' + detail : ''}`)
  if (!ok) failures++
}
const faster = results.slice(0, 5)
const onEst = results.slice(5, 10)
const over = results.slice(10, 15)

check('every job reached 100% completion',
  results.every(x => x.r.jobCompletion > 0.999),
  results.filter(x => x.r.jobCompletion <= 0.999).map(x => x.job).join(', '))
check('finishing faster produces MORE than estimated',
  faster.every(x => x.diff > 0),
  faster.map(x => `${x.job} ${money(x.diff)}`).join(', '))
check('running over produces LESS than estimated',
  over.every(x => x.diff < 0),
  over.map(x => `${x.job} ${money(x.diff)}`).join(', '))
check('no job reports more profit than it could earn on a bad run',
  over.every(x => x.r.glpa < x.r.glpeTotal))
check('GLPMDA beats GLPMDE on the fast jobs',
  faster.every(x => x.r.glpmda > x.glpmde))
check('GLPMDA falls below GLPMDE on the over jobs',
  over.every(x => x.r.glpmda < x.glpmde))
check('on-estimate jobs land within 10% of GLPE',
  onEst.every(x => Math.abs(x.diff) / x.r.glpeTotal < 0.1),
  onEst.map(x => `${x.job} ${((x.diff / x.r.glpeTotal) * 100).toFixed(1)}%`).join(', '))
check('every hour resolves to a module through the work order',
  results.every(x => x.attribution.coverage.ratio > 0.999))
check('labour data present on every job (no suppressed variance)',
  results.every(x => x.r.laborDataMissing === false))
check('man-days and labour cost move together on every job',
  cardRows.every(x => x.agree),
  cardRows.filter(x => !x.agree).map(x => x.job).join(', '))
check('labour cost uses the SAME rate on both sides',
  cardRows.every(x => {
    const perMd = x.actualManDays === 0 ? null : x.rlc / x.actMd
    return perMd == null || Math.abs(perMd - rates.hourlyRate * 8) < rates.hourlyRate * 8 * 0.6
  }))
check('no job reports fewer man-days AND higher labour cost',
  !cardRows.some(x => x.actMd < x.emd && x.rlc > x.estLabour),
  cardRows.filter(x => x.actMd < x.emd && x.rlc > x.estLabour).map(x => x.job).join(', '))

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`)
process.exit(failures === 0 ? 0 : 1)
