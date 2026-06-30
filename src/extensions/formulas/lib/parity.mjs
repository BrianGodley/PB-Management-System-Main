// Parity harness: clean engine vs a faithful port of the legacy Softcake
// windowing. Run: node src/extensions/formulas/lib/parity.mjs
//
// Legacy (FormulasViewUtil + Formulas.php getSixWeekValue) builds the value
// array NEWEST-FIRST, pads to 13 points with older zeros, array_reverses to
// oldest->newest, takes the most-recent 7, and splits 4/4 (shared midpoint),
// each divided by 4. The classifier (thresholds) is identical to ours — so this
// harness isolates *windowing* differences. Both sides use the same classify().
import { classify, invert, computeCondition } from './condition.js'

// ---- Faithful legacy six-week (static) condition, input = chronological -------
function legacyCondition(chrono, { upsideDown = false } = {}) {
  if (chrono.length < 2) return null
  // condition_data is built newest-first in legacy:
  let cd = [...chrono].reverse() // newest -> oldest
  // pad to 13 with older zeros (legacy pushes zeros for earlier dates):
  while (cd.length < 13) cd.push(0)
  const count = cd.length
  let i = count < 7 ? 1 : count - 7
  const rcd = [...cd].reverse() // array_reverse -> oldest -> newest
  let first = 0,
    last = 0,
    seven = [],
    c = 1
  while (i < rcd.length) {
    seven.push(rcd[i])
    if (c === 1 || c === 2 || c === 3) first += rcd[i]
    else if (c === 4) {
      first += rcd[i]
      last += rcd[i]
    } else if (c === 5 || c === 6 || c === 7) last += rcd[i]
    i++
    c++
  }
  first /= 4
  last /= 4
  const max = Math.max(...seven),
    min = Math.min(...seven)
  let slug = classify(max, min, last, first) // thisWeek=last(newer), lastWeek=first(older)
  if (slug && upsideDown) slug = invert(slug)
  return slug
}

const cleanCond = (chrono, opts) => computeCondition(chrono, { mode: 'static', ...opts })?.slug ?? null

// ---- Battery -----------------------------------------------------------------
function rand(n, lo, hi) {
  return Array.from({ length: n }, () => Math.round(lo + Math.random() * (hi - lo)))
}
function trend(n, start, step, noise) {
  return Array.from({ length: n }, (_, i) => Math.max(0, Math.round(start + i * step + (Math.random() - 0.5) * noise)))
}

const buckets = {} // length-bucket -> { total, agree }
let total = 0,
  agree = 0
const disagreements = []

function check(series, label) {
  const a = cleanCond(series)
  const b = legacyCondition(series)
  total++
  const len = series.length
  const key = len >= 7 ? '>=7' : `${len}`
  buckets[key] = buckets[key] || { total: 0, agree: 0 }
  buckets[key].total++
  if (a === b) {
    agree++
    buckets[key].agree++
  } else if (disagreements.length < 12) {
    disagreements.push({ label, len, clean: a, legacy: b, series })
  }
}

// Randomized series of many shapes/lengths.
for (let t = 0; t < 4000; t++) {
  const n = 3 + Math.floor(Math.random() * 28) // 3..30
  const shape = t % 4
  let s
  if (shape === 0) s = rand(n, 0, 100)
  else if (shape === 1) s = trend(n, 10, 5, 8) // rising
  else if (shape === 2) s = trend(n, 100, -6, 8) // falling
  else s = rand(n, 40, 60) // flat-ish
  check(s, `rand#${t}`)
}

// Deterministic edge cases.
check([1, 2, 3, 4, 5, 6, 7], 'rising-7')
check([7, 6, 5, 4, 3, 2, 1], 'falling-7')
check([5, 5, 5, 5, 5, 5, 5], 'flat-7')
check([0, 0, 0, 0, 0, 0, 0], 'zeros-7')
check([10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130], 'rising-13')

// ---- Report ------------------------------------------------------------------
console.log(`\nParity: clean engine vs legacy algorithm`)
console.log(`Total cases: ${total}  |  Agree: ${agree}  (${((agree / total) * 100).toFixed(2)}%)`)
console.log(`\nBy series length (real periods):`)
for (const k of Object.keys(buckets).sort((a, b) => (a === '>=7' ? 1 : b === '>=7' ? -1 : a - b))) {
  const x = buckets[k]
  console.log(`  len ${k.padEnd(4)} : ${x.agree}/${x.total} agree (${((x.agree / x.total) * 100).toFixed(1)}%)`)
}
if (disagreements.length) {
  console.log(`\nSample divergences (expected only for <7 real periods, legacy zero-pads):`)
  for (const d of disagreements.slice(0, 8)) {
    console.log(`  len ${d.len}: clean=${d.clean} legacy=${d.legacy}  series=[${d.series.join(',')}]`)
  }
}

// Assert the key guarantee: full parity for stats with >= 7 real periods.
const big = buckets['>=7']
if (big && big.agree === big.total) {
  console.log(`\n✓ GUARANTEE HOLDS: 100% parity for all stats with >= 7 periods (${big.total} cases).`)
  process.exit(0)
} else {
  console.log(`\n✗ Parity gap at >=7 periods — investigate.`)
  process.exit(1)
}
