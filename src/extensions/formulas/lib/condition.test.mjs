// Standalone tests for the condition engine. Run: node src/extensions/formulas/lib/condition.test.mjs
import {
  classify,
  invert,
  computeWindow,
  computeCondition,
  computeOneWeek,
  computeConditionSized,
  computeTrends,
} from './condition.js'

let pass = 0,
  fail = 0
const eq = (name, a, b) => {
  if (a === b) pass++
  else {
    fail++
    console.log(`FAIL ${name}: got ${a} expected ${b}`)
  }
}
const near = (name, a, b) => {
  if (Math.abs(a - b) < 1e-9) pass++
  else {
    fail++
    console.log(`FAIL ${name}: got ${a} expected ${b}`)
  }
}

// classifier thresholds (graphRange=100 so pct == weekRange)
eq('zero/zero -> non_existence', classify(0, 0, 0, 0), 'non_existence')
eq('normal mid (pct15)', classify(100, 0, 15, 0), 'normal')
eq('normal lower edge (pct2)', classify(100, 0, 2, 0), 'normal')
eq('affluence (pct50)', classify(100, 0, 50, 0), 'affluence')
eq('affluence cap (pct100)', classify(100, 0, 100, 0), 'affluence')
eq('non_existence big drop (pct-70)', classify(100, 0, 30, 100), 'non_existence')
eq('non_existence current0', classify(100, 0, 0, 40), 'non_existence')
eq('danger (pct-40)', classify(100, 0, 60, 100), 'danger')
eq('emergency flat nonzero', classify(100, 0, 50, 50), 'emergency')
eq('emergency small move (pct1)', classify(100, 0, 50, 49), 'emergency')
eq('emergency tiny drop (pct-5)', classify(100, 0, 45, 50), 'emergency')

// invert map
eq('invert danger', invert('danger'), 'affluence')
eq('invert affluence', invert('affluence'), 'danger')
eq('invert normal', invert('normal'), 'emergency')
eq('invert non_existence', invert('non_existence'), 'affluence')

// windowing (legacy parity for n>=7 six-week: 4-and-4, shared midpoint)
{
  const w = computeWindow([1, 2, 3, 4, 5, 6, 7], 'static')
  near('static baseline 2.5', w.baseline, 2.5)
  near('static current 5.5', w.current, 5.5)
  near('static max 7', w.maxValue, 7)
  near('static low 1', w.lowValue, 1)
}
{
  const w = computeWindow([100, 1, 2, 3, 4, 5, 6, 7], 'static') // most recent 7
  near('recent7 baseline 2.5', w.baseline, 2.5)
  near('recent7 current 5.5', w.current, 5.5)
}

// end-to-end six-week
{
  const r = computeCondition([1, 2, 3, 4, 5, 6, 7])
  eq('rising -> affluence', r.slug, 'affluence')
  near('pct ~50', Math.round(r.pct), 50)
}
eq('rising upside_down -> danger', computeCondition([1, 2, 3, 4, 5, 6, 7], { upsideDown: true }).slug, 'danger')
eq('flat -> emergency', computeCondition([5, 5, 5, 5, 5, 5, 5]).slug, 'emergency')
eq('falling pct-50 -> danger', computeCondition([7, 6, 5, 4, 3, 2, 1]).slug, 'danger')
eq('steep fall -> non_existence', computeCondition([100, 100, 100, 100, 10, 5, 0]).slug, 'non_existence')

// one-week trend: newest vs prior period
eq('1wk rising -> affluence', computeOneWeek([10, 10, 10, 10, 10, 10, 20]).slug, 'affluence')
eq('1wk flat -> emergency', computeOneWeek([10, 10, 10, 10, 10, 10, 10]).slug, 'emergency')
eq('1wk drop -> non_existence', computeOneWeek([20, 20, 20, 20, 20, 20, 0]).slug, 'non_existence')

// sized windows: six (7) vs twelve (13)
{
  const s = Array.from({ length: 13 }, (_, i) => i + 1) // 1..13 rising
  eq('6wk(7) rising -> affluence', computeConditionSized(s, 7).slug, 'affluence')
  eq('12wk(13) rising -> affluence', computeConditionSized(s, 13).slug, 'affluence')
}

// computeTrends bundles all three
{
  const t = computeTrends([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13])
  eq('trends has one_week', !!t.one_week, true)
  eq('trends six_week affluence', t.six_week.slug, 'affluence')
  eq('trends twelve_week affluence', t.twelve_week.slug, 'affluence')
}
eq(
  '12wk upside rising -> danger',
  computeConditionSized([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], 13, { upsideDown: true }).slug,
  'danger'
)

console.log(`\nRESULT: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
