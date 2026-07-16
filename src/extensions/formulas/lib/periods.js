// src/extensions/formulas/lib/periods.js
//
// Period helpers for the Formulas graph: aggregate a statistic's native series
// up to a coarser view period (weekly → monthly/quarterly/yearly) and label the
// trend windows with the right unit. Mirrors the Statistics module's rollup:
// sum per bucket, except percentage stats which average.
export const PERIOD_ORDER = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']
export const UNIT_SINGULAR = { daily: 'day', weekly: 'week', monthly: 'month', quarterly: 'quarter', yearly: 'year' }
export const UNIT_TITLE = { daily: 'Day', weekly: 'Week', monthly: 'Month', quarterly: 'Quarter', yearly: 'Year' }

function weekEnding(dateStr, weekEndingDay = 5) {
  const d = new Date(dateStr + 'T00:00:00')
  const diff = (weekEndingDay - d.getDay() + 7) % 7
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

// The view periods a stat can be shown at: its native period and anything coarser.
export function viewOptionsFor(nativeTracking) {
  const i = PERIOD_ORDER.indexOf(nativeTracking)
  return i < 0 ? ['weekly', 'monthly', 'quarterly', 'yearly'] : PERIOD_ORDER.slice(i)
}

// Aggregate native rows [{ value, period_date }] up to `viewPeriod`. When the
// view period is the native one (or finer), returns the input unchanged.
// Ascending by date. isPercentage → average per bucket, otherwise sum.
export function aggregateSeries(dated, nativeTracking, viewPeriod, { isPercentage = false } = {}) {
  const nativeIdx = PERIOD_ORDER.indexOf(nativeTracking)
  const viewIdx = PERIOD_ORDER.indexOf(viewPeriod)
  if (viewIdx <= nativeIdx || nativeIdx < 0 || viewIdx < 0) return (dated || []).slice()

  const buckets = new Map()
  for (const pt of dated || []) {
    const d = new Date(pt.period_date + 'T00:00:00')
    let key, date, sortKey
    if (viewPeriod === 'weekly') {
      const we = weekEnding(pt.period_date)
      key = we; date = we; sortKey = we
    } else if (viewPeriod === 'monthly') {
      const m = String(d.getMonth() + 1).padStart(2, '0')
      key = `${d.getFullYear()}-${m}`; date = `${key}-01`; sortKey = key
    } else if (viewPeriod === 'quarterly') {
      const q = Math.floor(d.getMonth() / 3) + 1
      const mm = String(q * 3).padStart(2, '0')
      key = `${d.getFullYear()}-Q${q}`; date = `${d.getFullYear()}-${mm}-01`; sortKey = `${d.getFullYear()}-${mm}`
    } else {
      key = String(d.getFullYear()); date = `${key}-01-01`; sortKey = key
    }
    if (!buckets.has(key)) buckets.set(key, { date, sortKey, total: 0, count: 0 })
    const b = buckets.get(key)
    b.total += pt.value
    b.count += 1
  }
  return [...buckets.values()]
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map(b => ({ value: isPercentage ? b.total / b.count : b.total, period_date: b.date }))
}
