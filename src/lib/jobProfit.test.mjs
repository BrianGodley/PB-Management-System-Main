// Acceptance tests for job profit — the labour/sub gross profit actually produced.
//   GLPA   = (CP × GLPE) − (RLC − CP × ELC_total)
//   GLPMDA = GLPA ÷ actual man days
// The six-module table in the design doc is reproduced verbatim below; if any of
// those numbers move, the formula changed and the doc is stale.
// Run: node --test src/lib/jobProfit.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  resolveRates,
  splitHours,
  completionAsOf,
  jobProfitAsOf,
  dailySeries,
  attributeHoursByModule,
  weekDates,
} from './jobProfit.js'

const RATES = { hourlyRate: 32, otMultiplier: 1.5 }
const near = (a, b, tol = 0.01) =>
  assert.ok(Math.abs(a - b) < tol, `expected ${b}, got ${a}`)

// A module priced at `glpe` over `emd` man days.
const mod = (id, emd, glpe, subGp = 0) => ({
  id,
  module_name: id,
  man_days: emd,
  gross_profit: glpe,
  sub_cost: 0,
  data: { calc: { subGp } },
})
// `crew` people × `hours` each, on `date`.
const day = (date, crew, hours) =>
  Array.from({ length: crew }, (_, i) => ({
    date,
    employee_id: `e${i}`,
    time_in: '08:00:00',
    time_out: `${String(8 + hours).padStart(2, '0')}:00:00`,
  }))
const cp = (id, date, value) => ({ estimate_module_id: id, entry_date: date, completion_pct: value })

// ── Rates ────────────────────────────────────────────────────────────────────
test('NO-FALLBACK: an unset rate returns null rather than a default', () => {
  assert.equal(resolveRates(null), null)
  assert.equal(resolveRates({ avg_hourly_crew_rate: null, overtime_multiplier: 1.5 }), null)
  assert.equal(resolveRates({ avg_hourly_crew_rate: 32, overtime_multiplier: null }), null)
  assert.equal(resolveRates({ avg_hourly_crew_rate: 0, overtime_multiplier: 1.5 }), null)
  assert.deepEqual(resolveRates({ avg_hourly_crew_rate: '32', overtime_multiplier: '1.5' }), {
    hourlyRate: 32,
    otMultiplier: 1.5,
  })
})

test('a job with no rates produces no figures at all', () => {
  assert.equal(jobProfitAsOf({ modules: [mod('m', 60, 27000)], rates: null }), null)
})

// ── Overtime ─────────────────────────────────────────────────────────────────
test('overtime is per person per day, not per job', () => {
  // Three people × 8h on one day = 24 job hours but ZERO overtime.
  const h = splitHours(day('2026-09-01', 3, 8))
  near(h.standard, 24)
  near(h.overtime, 0)
})

test('hours past 8 in one person-day are overtime', () => {
  const h = splitHours(day('2026-09-05', 3, 11))
  near(h.standard, 24)
  near(h.overtime, 9)
})

test('imported BuilderTrend hours are taken as given', () => {
  const h = splitHours([{ date: '2026-01-01', bt_hours_regular: 8, bt_hours_overtime: 2 }])
  near(h.standard, 8)
  near(h.overtime, 2)
})

// ── Completion readings ──────────────────────────────────────────────────────
test('completion is the latest reading, never a sum', () => {
  const c = completionAsOf([cp('m', '2026-09-01', 10), cp('m', '2026-09-02', 20)])
  near(c.get('m'), 0.2)
})

test('a reading after the cutoff is ignored', () => {
  const c = completionAsOf([cp('m', '2026-09-01', 10), cp('m', '2026-09-05', 90)], '2026-09-02')
  near(c.get('m'), 0.1)
})

test('a PM can restate downward when a mistake is found', () => {
  const c = completionAsOf([cp('m', '2026-09-01', 40), cp('m', '2026-09-02', 25)])
  near(c.get('m'), 0.25)
})

// ── The Jones example from the design doc ────────────────────────────────────
test('Jones at day 5: 20% complete, 129 hours, GLPA $4,200', () => {
  const modules = [mod('jones', 60, 27000)]
  const completions = [cp('jones', '2026-09-05', 20)]
  const timeEntries = [
    ...day('2026-09-01', 3, 8),
    ...day('2026-09-02', 3, 8),
    ...day('2026-09-03', 3, 8),
    ...day('2026-09-04', 3, 8),
    ...day('2026-09-05', 3, 11), // 3 hours overtime each
  ]
  const r = jobProfitAsOf({ modules, completions, timeEntries, rates: RATES })
  near(r.hours.standard, 120)
  near(r.hours.overtime, 9)
  near(r.rlc, 4272) // 120×32 + 9×48
  near(r.earned, 5400) // 20% × 27,000
  near(r.elcToDate, 3072) // 20% × (480 × 32)
  near(r.costVariance, 1200)
  near(r.glpa, 4200)
  near(r.glpmda, 260.4651, 0.001)
})

// ── The six-module table, reproduced exactly ─────────────────────────────────
// Each runs to completion (CP 100%) so GLPA reconciles against what was sold.
const SIX = [
  // name        emd  glpe    actual man-days   OT hours   expect GLPA  GLPMDA
  ['Alvarez', 40, 18000, 34, 0, 19536, 574.5882],
  ['Whitfield', 60, 27000, 52, 0, 29048, 558.6154],
  ['Delgado', 30, 13500, 30, 0, 13500, 450.0],
  ['Okafor', 25, 12500, 25, 0, 12500, 500.0],
  ['Jones', 60, 27000, 78, 40, 21752, 278.8718],
  ['Bianchi', 24, 10800, 31, 56, 8112, 261.6774],
]

for (const [name, emd, glpe, actMd, otHours, expGlpa, expGlpmda] of SIX) {
  test(`${name}: ${emd} MD estimated, ${actMd} actual → GLPA ${expGlpa}`, () => {
    const totalHours = actMd * 8
    const stdHours = totalHours - otHours
    // One synthetic entry pair carrying the exact standard/overtime split.
    const timeEntries = [
      { date: '2026-09-01', bt_hours_regular: stdHours, bt_hours_overtime: otHours },
    ]
    const r = jobProfitAsOf({
      modules: [mod(name, emd, glpe)],
      completions: [cp(name, '2026-09-01', 100)],
      timeEntries,
      rates: RATES,
    })
    near(r.glpa, expGlpa, 0.5)
    near(r.glpmda, expGlpmda, 0.01)
  })
}

test('beating the estimate reports MORE profit than estimated — the upside is real', () => {
  const r = jobProfitAsOf({
    modules: [mod('Alvarez', 40, 18000)],
    completions: [cp('Alvarez', '2026-09-01', 100)],
    timeEntries: [{ date: '2026-09-01', bt_hours_regular: 272, bt_hours_overtime: 0 }],
    rates: RATES,
  })
  assert.ok(r.glpa > 18000, 'a crew that spent less than budget banks the difference')
  near(r.costVariance, -1536)
})

test('running long never reports more profit than the module sold for', () => {
  // The rejected effort-based formula returned $31,001 here.
  const r = jobProfitAsOf({
    modules: [mod('Jones', 60, 27000)],
    completions: [cp('Jones', '2026-09-01', 100)],
    timeEntries: [{ date: '2026-09-01', bt_hours_regular: 645, bt_hours_overtime: 0 }],
    rates: RATES,
  })
  assert.ok(r.glpa < 27000, `expected under 27,000, got ${r.glpa}`)
})

test('zero variance lands exactly on the estimate', () => {
  const r = jobProfitAsOf({
    modules: [mod('Delgado', 30, 13500)],
    completions: [cp('Delgado', '2026-09-01', 100)],
    timeEntries: [{ date: '2026-09-01', bt_hours_regular: 240, bt_hours_overtime: 0 }],
    rates: RATES,
  })
  near(r.glpa, 13500)
  near(r.glpmda, 450)
})

// ── Subcontractor ────────────────────────────────────────────────────────────
test('sub GP is completion × estimated sub GP, with no cost variance', () => {
  const r = jobProfitAsOf({
    modules: [mod('m', 10, 4500, 2000)],
    completions: [cp('m', '2026-09-01', 50)],
    timeEntries: [],
    rates: RATES,
  })
  near(r.subEarned, 1000)
  near(r.subTotal, 2000)
})

// ── Daily series ─────────────────────────────────────────────────────────────
test('each day is the change in the running total', () => {
  const modules = [mod('m', 10, 4500)]
  const completions = [cp('m', '2026-09-01', 20), cp('m', '2026-09-02', 50)]
  const s = dailySeries({
    modules,
    completions,
    timeEntries: [],
    rates: RATES,
    dates: ['2026-09-01', '2026-09-02'],
  })
  near(s[0].laborProducedToday, 900) // 20% of 4,500
  near(s[1].laborProducedToday, 1350) // 50% − 20% = 30%
  near(s[1].laborGp, 2250) // running total
})

test('no hours clocked must not book the unspent budget as profit', () => {
  // 20% complete, nothing on the timeclock. The raw formula would call the whole
  // $512 budget a favourable variance and report $1,412 against $900 earned.
  const r = jobProfitAsOf({
    modules: [mod('m', 10, 4500)],
    completions: [cp('m', '2026-09-01', 20)],
    timeEntries: [],
    rates: RATES,
  })
  near(r.earned, 900)
  near(r.costVariance, 0)
  near(r.glpa, 900)
  assert.equal(r.laborDataMissing, true)
  near(r.laborCoverage, 0)
})

test('a real underspend still books its gain', () => {
  // Hours ARE recorded and came in under budget — that gain is evidence, not a gap.
  const r = jobProfitAsOf({
    modules: [mod('m', 10, 4500)],
    completions: [cp('m', '2026-09-01', 100)],
    timeEntries: [{ date: '2026-09-01', bt_hours_regular: 64, bt_hours_overtime: 0 }],
    rates: RATES,
  })
  near(r.costVariance, -512) // 64h × $32 = $2,048 against a $2,560 budget
  near(r.glpa, 5012)
  assert.equal(r.laborDataMissing, false)
})

test('a day with hours but no completion movement produces NEGATIVE profit', () => {
  const modules = [mod('m', 10, 4500)]
  const completions = [cp('m', '2026-09-01', 20)] // no reading on day 2
  const s = dailySeries({
    modules,
    completions,
    timeEntries: [...day('2026-09-01', 2, 8), ...day('2026-09-02', 2, 8)],
    rates: RATES,
    dates: ['2026-09-01', '2026-09-02'],
  })
  assert.ok(s[1].producedToday < 0, `expected a loss, got ${s[1].producedToday}`)
  near(s[1].producedToday, -512) // 16 hours × $32, no earned profit against it
})

// ── Module attribution via the work order ────────────────────────────────────
const CREW = { id: 'c1', crew_chief_id: 'e0', journeyman_id: 'e1', laborer_1_id: 'e2' }

test('hours resolve to a module through crew → schedule item → work order', () => {
  const a = attributeHoursByModule({
    timeEntries: day('2026-09-01', 3, 8),
    scheduleItems: [
      { crew_id: 'c1', start_date: '2026-09-01', end_date: '2026-09-05', work_order_ids: ['w1'] },
    ],
    workOrders: [{ id: 'w1', estimate_module_id: 'mod-a' }],
    crews: [CREW],
  })
  near(a.byModule.get('mod-a').standard, 24)
  near(a.coverage.ratio, 1)
})

test('unresolvable hours are reported, never guessed at', () => {
  // No employee_id — the shape of every imported BuilderTrend row.
  const a = attributeHoursByModule({
    timeEntries: [{ date: '2026-09-01', bt_hours_regular: 8 }],
    scheduleItems: [],
    workOrders: [],
    crews: [CREW],
  })
  assert.equal(a.byModule.size, 0)
  near(a.unattributed.standard, 8)
  near(a.coverage.ratio, 0)
})

test('a crew on two modules the same day splits, and says so', () => {
  const a = attributeHoursByModule({
    timeEntries: day('2026-09-01', 3, 8),
    scheduleItems: [
      {
        crew_id: 'c1',
        start_date: '2026-09-01',
        end_date: '2026-09-01',
        work_order_ids: ['w1', 'w2'],
      },
    ],
    workOrders: [
      { id: 'w1', estimate_module_id: 'mod-a' },
      { id: 'w2', estimate_module_id: 'mod-b' },
    ],
    crews: [CREW],
  })
  near(a.byModule.get('mod-a').standard, 12)
  near(a.byModule.get('mod-b').standard, 12)
  assert.equal(a.byModule.get('mod-a').apportioned, true, 'apportioned hours must be flagged')
})

test('a module with no attributed hours reports earned profit but no variance', () => {
  const r = jobProfitAsOf({
    modules: [mod('m', 10, 4500)],
    completions: [cp('m', '2026-09-01', 50)],
    timeEntries: [],
    rates: RATES,
    attribution: { byModule: new Map() },
  })
  near(r.rows[0].earnedLaborGp, 2250)
  assert.equal(r.rows[0].glpa, null)
  assert.equal(r.rows[0].glpmda, null)
})

// ── Week helper ──────────────────────────────────────────────────────────────
test('the week runs Sunday to Saturday', () => {
  const w = weekDates('2026-09-04') // a Friday
  assert.equal(w.length, 7)
  assert.equal(w[0], '2026-08-30') // Sunday
  assert.equal(w[6], '2026-09-05') // Saturday
  assert.ok(w.includes('2026-09-04'))
})
