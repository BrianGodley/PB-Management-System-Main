// ─────────────────────────────────────────────────────────────────────────────
// Job profit — labour and subcontractor gross profit actually produced.
//
// Three verticals, three instruments (see the production design doc):
//   Labour  estimate man-days · the timeclock · the PM's completion %
//   Sub     estimated sub GP  · the PM's completion %
//   Material  NOT here — job-level and deductive, settled when the bills land.
//
// The one formula everything else hangs off:
//
//   RLC    = standard hours × rate  +  overtime hours × (rate × OT multiplier)
//   GLPA   = (CP × GLPE)  −  (RLC − CP × ELC_total)
//   GLPMDA = GLPA ÷ actual man days
//
// In words: the profit the finished work is worth, minus what it cost extra to
// get there. Both terms sit on the completion percentage, so the equation has
// one denominator rather than two.
//
// The rejected alternative was an effort-based base — GLPMDE × actual man days.
// It fails on a checkable point: that base grows at GLPMDE/8 per hour while cost
// grows at the wage rate, so every extra hour RAISES reported profit and a job
// that runs long reports more profit than it sold for.
//
// NO FALLBACKS. Rates come from company_settings. A missing rate returns null
// and the caller surfaces it — it never silently resolves to a constant, or an
// unpriced job would quietly report profit it cannot support.
// ─────────────────────────────────────────────────────────────────────────────

const HOURS_PER_MAN_DAY = 8

const num = v => {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * Rates the calculation cannot proceed without.
 * Returns { hourlyRate, otMultiplier } or null when either is unset.
 */
export function resolveRates(settings) {
  if (!settings) return null
  // avg_hourly_crew_rate is the burdened cost of an hour in the field — the
  // number that belongs here. labor_rate_per_hour is the estimating rate and is
  // deliberately NOT substituted for it.
  const hourlyRate = parseFloat(settings.avg_hourly_crew_rate)
  const otMultiplier = parseFloat(settings.overtime_multiplier)
  if (!Number.isFinite(hourlyRate) || hourlyRate <= 0) return null
  if (!Number.isFinite(otMultiplier) || otMultiplier <= 0) return null
  return { hourlyRate, otMultiplier }
}

/**
 * Hours worked on a job, split standard vs overtime.
 *
 * Overtime is anything past 8 hours by ONE person on ONE day, so entries are
 * grouped by employee and date before the split. Summing the job's hours first
 * and cutting at 8 would call almost everything overtime.
 *
 * Imported BuilderTrend rows carry bt_hours_regular / bt_hours_overtime; those
 * are authoritative when present because the old system already made the call.
 */
export function splitHours(entries, upToDate = null) {
  const perPersonDay = new Map()
  let standard = 0
  let overtime = 0

  for (const e of entries || []) {
    const date = e.date
    if (!date) continue
    if (upToDate && date > upToDate) continue

    if (e.bt_hours_regular != null || e.bt_hours_overtime != null) {
      standard += num(e.bt_hours_regular)
      overtime += num(e.bt_hours_overtime)
      continue
    }
    if (!e.time_in || !e.time_out) continue
    const start = new Date(`1970-01-01T${e.time_in}`)
    const end = new Date(`1970-01-01T${e.time_out}`)
    let hours = (end - start) / 3_600_000
    if (!Number.isFinite(hours) || hours <= 0) continue
    hours -= num(e.bt_break_time) / 60

    const key = `${e.employee_id || e.employee_name || 'unknown'}|${date}`
    perPersonDay.set(key, (perPersonDay.get(key) || 0) + hours)
  }

  for (const total of perPersonDay.values()) {
    standard += Math.min(total, HOURS_PER_MAN_DAY)
    overtime += Math.max(0, total - HOURS_PER_MAN_DAY)
  }
  return { standard, overtime, total: standard + overtime }
}

/**
 * The cumulative completion percentage for each module as at a date.
 * Readings are cumulative, so the answer is the latest reading on or before the
 * cutoff — not a sum. Absent reading = 0%, which is the honest starting state.
 */
export function completionAsOf(completions, upToDate = null) {
  const latest = new Map()
  for (const c of completions || []) {
    if (!c.estimate_module_id || !c.entry_date) continue
    if (upToDate && c.entry_date > upToDate) continue
    const prev = latest.get(c.estimate_module_id)
    if (!prev || c.entry_date > prev.entry_date) latest.set(c.estimate_module_id, c)
  }
  const out = new Map()
  for (const [id, c] of latest) out.set(id, num(c.completion_pct) / 100)
  return out
}

/**
 * Per-module estimate figures pulled straight off estimate_modules.
 * GLPE is the module's gross_profit — the same number the estimator's In House
 * Labor group shows. Sub GP comes from the stored calc, never re-derived.
 */
export function moduleEstimate(mod) {
  const emd = num(mod.man_days)
  const glpe = num(mod.gross_profit)
  return {
    id: mod.id,
    name: mod.module_name || mod.module_type || 'Module',
    emd,
    emhrs: emd * HOURS_PER_MAN_DAY,
    glpe,
    glpmde: emd > 0 ? glpe / emd : null,
    subGp: num(mod.data?.calc?.subGp),
    subCost: num(mod.sub_cost),
  }
}

/**
 * The whole picture for one job as at a date (null = everything to now).
 *
 * Module rows carry the EARNED side only. Cost variance is job-level because
 * the timeclock records hours against a job, not a module — until a clock-in
 * names its module, splitting RLC across modules would be invention.
 */
export function jobProfitAsOf({
  modules,
  completions,
  timeEntries,
  rates,
  upToDate = null,
  attribution = null,
}) {
  if (!rates) return null
  const { hourlyRate, otMultiplier } = rates
  const cp = completionAsOf(completions, upToDate)

  let glpeTotal = 0
  let earned = 0
  let elcToDate = 0
  let elcTotal = 0
  let subEarned = 0
  let subTotal = 0
  const rows = []

  for (const mod of modules || []) {
    const est = moduleEstimate(mod)
    const pct = cp.get(est.id) || 0
    const elcModule = est.emhrs * hourlyRate

    glpeTotal += est.glpe
    elcTotal += elcModule
    earned += pct * est.glpe
    elcToDate += pct * elcModule
    subEarned += pct * est.subGp
    subTotal += est.subGp

    // Module-level cost variance only exists where the work order chain resolved
    // this module's hours. Where it did not, rlc/glpa stay null and the UI shows
    // the earned figure alone rather than a variance built on apportioned guesswork.
    const modHours = attribution?.byModule?.get(est.id) || null
    const modRlc = modHours
      ? modHours.standard * hourlyRate + modHours.overtime * hourlyRate * otMultiplier
      : null
    const modManDays = modHours
      ? (modHours.standard + modHours.overtime) / HOURS_PER_MAN_DAY
      : null
    const modGlpa = modRlc == null ? null : pct * est.glpe - (modRlc - pct * elcModule)

    rows.push({
      ...est,
      completionPct: pct,
      earnedLaborGp: pct * est.glpe,
      earnedSubGp: pct * est.subGp,
      rlc: modRlc,
      actualManDays: modManDays,
      glpa: modGlpa,
      glpmda: modGlpa != null && modManDays > 0 ? modGlpa / modManDays : null,
      apportioned: modHours?.apportioned || false,
    })
  }

  const hours = splitHours(timeEntries, upToDate)
  const rlc = hours.standard * hourlyRate + hours.overtime * hourlyRate * otMultiplier
  const actualManDays = hours.total / HOURS_PER_MAN_DAY

  // A favourable variance has to be EVIDENCE of spending less, not the absence
  // of data. With completion entered and no hours clocked, the raw formula books
  // the whole unspent budget as profit — so a job nobody clocked into looks like
  // the most profitable on the board. Suppress the variance in that case and say
  // why; the earned figure still stands, because the work really was done.
  const laborDataMissing = hours.total === 0 && earned > 0
  const costVariance = laborDataMissing ? 0 : rlc - elcToDate // positive = over budget
  const glpa = earned - costVariance
  const glpmda = actualManDays > 0 ? glpa / actualManDays : null

  // Partial data is the same hazard in weaker form: half a week of clock-ins
  // against a week of progress still reads as efficiency. Expose how much of the
  // expected labour actually got recorded so the UI can mark the figure suspect.
  const expectedManDaysToDate = elcToDate / hourlyRate / HOURS_PER_MAN_DAY
  const laborCoverage =
    expectedManDaysToDate > 0 ? actualManDays / expectedManDaysToDate : actualManDays > 0 ? 1 : 0

  // Weighted by profit, so a big module moves the job's percentage more than a
  // small one — the same weighting the earned figure already uses.
  const jobCompletion = glpeTotal > 0 ? earned / glpeTotal : 0

  return {
    rows,
    glpeTotal,
    glpmdeTotal: null, // set by the caller when man-days are known job-wide
    earned,
    elcToDate,
    elcTotal,
    rlc,
    hours,
    actualManDays,
    costVariance,
    glpa,
    glpmda,
    laborDataMissing,
    laborCoverage,
    subEarned,
    subTotal,
    jobCompletion,
    totalGpProduced: glpa + subEarned,
  }
}

/**
 * Attribute a job's hours to individual modules, so labour profit can be
 * compared crew-against-crew on similar work.
 *
 * The chain, all of it already in the schema:
 *
 *   time_entry.employee_id → crews (5 member slots)
 *                          → schedule_items covering that crew on that date
 *                          → schedule_items.work_order_ids
 *                          → work_orders.estimate_module_id
 *
 * DEGRADES ON PURPOSE. Any hour the chain cannot resolve is returned as
 * `unattributed` rather than guessed at, and the caller reports labour variance
 * at job level for those. Three links are empty on historical data — work orders
 * carry no crew, nothing is scheduled forward, and imported BuilderTrend rows
 * identify the worker by name with no employee_id — so old jobs resolve nothing
 * and that is the correct answer for them, not a failure.
 *
 * A crew sitting on several modules the same day splits its hours evenly across
 * them. That is an assumption, not a measurement: `coverage.split` counts those
 * hours so the UI can mark the figure as apportioned rather than observed.
 */
export function attributeHoursByModule({
  timeEntries,
  scheduleItems,
  workOrders,
  crews,
  upToDate = null,
}) {
  // employee → crew
  const crewOf = new Map()
  for (const c of crews || []) {
    for (const slot of [
      c.crew_chief_id,
      c.journeyman_id,
      c.laborer_1_id,
      c.laborer_2_id,
      c.laborer_3_id,
    ]) {
      if (slot) crewOf.set(slot, c.id)
    }
  }
  // work order → module
  const moduleOfWorkOrder = new Map()
  for (const w of workOrders || []) {
    if (w.id && w.estimate_module_id) moduleOfWorkOrder.set(w.id, w.estimate_module_id)
  }

  const modulesForCrewOnDate = (crewId, date) => {
    const found = new Set()
    for (const si of scheduleItems || []) {
      if (!si.crew_id || si.crew_id !== crewId) continue
      const from = si.start_date
      const to = si.end_date || si.start_date
      if (!from || date < from || date > to) continue
      for (const woId of si.work_order_ids || []) {
        const modId = moduleOfWorkOrder.get(woId)
        if (modId) found.add(modId)
      }
    }
    return [...found]
  }

  const byModule = new Map()
  const unattributed = { standard: 0, overtime: 0 }
  const coverage = { attributed: 0, unattributed: 0, split: 0 }

  // Hours are split per person per day BEFORE attribution, because overtime is
  // a property of one person's day — not of a module or a job.
  const perPersonDay = new Map()
  for (const e of timeEntries || []) {
    if (!e.date) continue
    if (upToDate && e.date > upToDate) continue
    const key = `${e.employee_id || ''}|${e.date}`
    const acc = perPersonDay.get(key) || { employeeId: e.employee_id, date: e.date, hours: 0 }
    if (e.bt_hours_regular != null || e.bt_hours_overtime != null) {
      acc.hours += num(e.bt_hours_regular) + num(e.bt_hours_overtime)
    } else if (e.time_in && e.time_out) {
      const h =
        (new Date(`1970-01-01T${e.time_out}`) - new Date(`1970-01-01T${e.time_in}`)) / 3_600_000
      if (Number.isFinite(h) && h > 0) acc.hours += h - num(e.bt_break_time) / 60
    }
    perPersonDay.set(key, acc)
  }

  for (const { employeeId, date, hours } of perPersonDay.values()) {
    if (hours <= 0) continue
    const standard = Math.min(hours, HOURS_PER_MAN_DAY)
    const overtime = Math.max(0, hours - HOURS_PER_MAN_DAY)

    const crewId = employeeId ? crewOf.get(employeeId) : null
    const mods = crewId ? modulesForCrewOnDate(crewId, date) : []

    if (mods.length === 0) {
      unattributed.standard += standard
      unattributed.overtime += overtime
      coverage.unattributed += hours
      continue
    }
    if (mods.length > 1) coverage.split += hours
    coverage.attributed += hours
    const share = 1 / mods.length
    for (const modId of mods) {
      const acc = byModule.get(modId) || { standard: 0, overtime: 0, apportioned: mods.length > 1 }
      acc.standard += standard * share
      acc.overtime += overtime * share
      acc.apportioned = acc.apportioned || mods.length > 1
      byModule.set(modId, acc)
    }
  }

  const totalHours = coverage.attributed + coverage.unattributed
  coverage.ratio = totalHours > 0 ? coverage.attributed / totalHours : 0
  return { byModule, unattributed, coverage }
}

/**
 * A day-by-day series of produced gross profit.
 *
 * Each day's figure is the difference between two running totals, never a
 * separately computed amount — so a PM restating an earlier percentage
 * recomputes every total after it and the daily figures fall out of the new
 * series rather than contradicting it.
 *
 * A day CAN come out negative, and should: hours burned with no completion
 * movement add cost against no earned profit. That is the signal, not a bug.
 */
export function dailySeries({ modules, completions, timeEntries, rates, dates }) {
  if (!rates) return []
  let prevLabor = 0
  let prevSub = 0
  const out = []

  for (const date of dates) {
    const snap = jobProfitAsOf({ modules, completions, timeEntries, rates, upToDate: date })
    out.push({
      date,
      laborGp: snap.glpa,
      subGp: snap.subEarned,
      totalGp: snap.totalGpProduced,
      laborProducedToday: snap.glpa - prevLabor,
      subProducedToday: snap.subEarned - prevSub,
      producedToday: snap.glpa + snap.subEarned - prevLabor - prevSub,
      completionPct: snap.jobCompletion,
    })
    prevLabor = snap.glpa
    prevSub = snap.subEarned
  }
  return out
}

/** Sunday-to-Saturday dates for the week containing `date`. */
export function weekDates(date) {
  const d = new Date(`${date}T00:00:00`)
  const sunday = new Date(d)
  sunday.setDate(d.getDate() - d.getDay())
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(sunday)
    x.setDate(sunday.getDate() + i)
    return x.toISOString().slice(0, 10)
  })
}

export const HOURS_PER_DAY = HOURS_PER_MAN_DAY
