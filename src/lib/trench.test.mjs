// Shared trenching math — used by BOTH Utilities (canonical) and Fire Pit, so this
// locks that they compute identical values. cf = LF × (W/12) × (D/12); hrs = cf×rate.
import test from 'node:test'
import assert from 'node:assert/strict'
import { trenchRowHrs, trenchHours, TRENCH_LABOR_RATE_NAME } from './trench.js'

const near = (a, b, why) => assert.ok(Math.abs(a - b) < 1e-4, `${why}: got ${a}, expected ${b}`)
const MP = { 'Utilities Trench Excavation': 0.05, 'Utilities Hand Excavation': 0.2 } // hrs / Cu Ft

test('one trench row — cf and hrs (Trench method)', () => {
  const { cf, hrs } = trenchRowHrs({ equipment: 'Trench', lf: 20, width: 6, depth: 24 }, MP)
  near(cf, 20 * (6 / 12) * (24 / 12), 'cf = 20 × 0.5 × 2')
  near(cf, 20, 'exact')
  near(hrs, 20 * 0.05, 'cf × Trench rate')
})

test('Hand method uses the hand excavation rate', () => {
  const t = trenchRowHrs({ equipment: 'Hand', lf: 20, width: 6, depth: 24 }, MP)
  near(t.hrs, 20 * 0.2, 'cf × Hand rate')
})

test('incomplete dimensions = 0', () => {
  near(trenchRowHrs({ equipment: 'Trench', lf: 20, width: 0, depth: 24 }, MP).hrs, 0, 'no width')
  near(trenchRowHrs({ equipment: 'Trench', lf: 0, width: 6, depth: 24 }, MP).hrs, 0, 'no lf')
})

test('trenchHours sums rows', () => {
  const rows = [
    { equipment: 'Trench', lf: 20, width: 6, depth: 24 },
    { equipment: 'Hand', lf: 10, width: 6, depth: 12 },
  ]
  const expected = 20 * 0.05 + 10 * (6 / 12) * (12 / 12) * 0.2
  near(trenchHours(rows, MP), expected, 'sum of both rows')
})

test('rate edit reflects (Trench rate doubles → hrs doubles)', () => {
  const base = trenchHours([{ equipment: 'Trench', lf: 20, width: 6, depth: 24 }], MP)
  const up = trenchHours([{ equipment: 'Trench', lf: 20, width: 6, depth: 24 }], { ...MP, 'Utilities Trench Excavation': 0.1 })
  near(up, base * 2, 'doubling the shared rate doubles the hours')
})

test('rate names point at the shared Utilities labor rows', () => {
  assert.equal(TRENCH_LABOR_RATE_NAME.Trench, 'Utilities Trench Excavation')
  assert.equal(TRENCH_LABOR_RATE_NAME.Hand, 'Utilities Hand Excavation')
})
