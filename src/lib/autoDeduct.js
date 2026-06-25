// src/lib/autoDeduct.js
// Daily auto-deduction of unpaid break time from clock-in totals.
// Rule (set in HR → Settings → Time Clock → Auto Deduction): deduct N minutes
// for every H hours worked, applied to a DAY's combined total. Default 30 min
// per 6 hrs. settings = { enabled, minutes, perHours }.

// Minutes to deduct from a single day's worked minutes.
export function deductionMinsForDay(dayWorkedMins, settings) {
  if (!settings?.enabled) return 0
  const perHours = parseFloat(settings.perHours) || 0
  const minutes = parseFloat(settings.minutes) || 0
  if (perHours <= 0 || minutes <= 0 || dayWorkedMins <= 0) return 0
  const blocks = Math.floor(dayWorkedMins / 60 / perHours)
  return Math.min(dayWorkedMins, blocks * minutes)
}

// Net minutes for one day after the deduction.
export function netDayMins(dayWorkedMins, settings) {
  return Math.max(0, dayWorkedMins - deductionMinsForDay(dayWorkedMins, settings))
}

// Sum net minutes across many entries, applying the deduction PER CALENDAR DAY
// (combined daily total) rather than per entry. `workedMinsOf(entry)` returns
// that entry's worked minutes (already net of breaks); entries carry `.date`.
export function netMinsWithDeduction(entries, workedMinsOf, settings) {
  const byDay = {}
  for (const e of entries || []) {
    const m = workedMinsOf(e) || 0
    if (m <= 0) continue
    byDay[e.date] = (byDay[e.date] || 0) + m
  }
  let total = 0
  for (const day in byDay) total += netDayMins(byDay[day], settings)
  return total
}
