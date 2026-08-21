#!/usr/bin/env node
/**
 * Outdoor Kitchen — static rate-wiring audit (MODULE-TEST-CHECKLIST Layer B).
 * Verifies the finish rates the module consumes are the SHARED Finishes records
 * (OK_RATES finish material '<Type> - Finishes' + labor '<Type> - Finishes Labor
 * Rate'), that the finish picker sources sub 'Finish Material' under category
 * 'Finishes', and that both the material AND labor fetch scopes reach 'Finishes'
 * (fetch-scope coverage). Static — no DB, runs in the sandbox.
 *
 * Run:  node scripts/outdoor-kitchen-rate-coverage.mjs
 */
import { readFileSync } from 'node:fs'

const src = readFileSync('src/components/modules/OutdoorKitchenModule.jsx', 'utf8')

const fails = []
const ok = (cond, msg) => {
  console.log((cond ? '  ✓ ' : '  ✗ ') + msg)
  if (!cond) fails.push(msg)
}

const FINISH_MAT = ['sandStucco', 'smoothStucco', 'ledgerstone', 'stackedStone', 'tile', 'realFlagstone', 'realStone']
// Labor keys are named per-type (note: flagstone labor key is `flagstoneLab`, not
// `realFlagstoneLab`), so list them explicitly rather than derive from the material keys.
const FINISH_LAB = ['sandStuccoLab', 'smoothStuccoLab', 'ledgerstoneLab', 'stackedStoneLab', 'tileLab', 'flagstoneLab', 'realStoneLab']

const dbNameOf = key => {
  const m = src.match(new RegExp(`\\b${key}:\\s*\\{\\s*dbName:\\s*'([^']+)'`))
  return m ? m[1] : null
}

console.log('Outdoor Kitchen — finish rate wiring:\n')

const mats = FINISH_MAT.map(dbNameOf)
const labs = FINISH_LAB.map(dbNameOf)

ok(mats.every(Boolean), `all 7 finish material keys resolve a dbName [missing: ${FINISH_MAT.filter((k, i) => !mats[i]).join(', ') || 'none'}]`)
ok(
  mats.filter(Boolean).every(x => / - Finishes$/.test(x)),
  `every finish MATERIAL is a shared '- Finishes' record [bad: ${mats.filter(x => x && !/ - Finishes$/.test(x)).join(', ') || 'none'}]`
)
ok(labs.every(Boolean), `all 7 finish labor keys resolve a dbName [missing: ${FINISH_LAB.filter((k, i) => !labs[i]).join(', ') || 'none'}]`)
ok(
  labs.filter(Boolean).every(x => / - Finishes Labor Rate$/.test(x)),
  `every finish LABOR is a shared '- Finishes Labor Rate' [bad: ${labs.filter(x => x && !/ - Finishes Labor Rate$/.test(x)).join(', ') || 'none'}]`
)

console.log('\nSourcing + fetch scope:\n')
ok(/const WF_CAT = 'Finish Material'/.test(src), "finish picker sub-category WF_CAT === 'Finish Material'")
ok(/masterWallMeta\(WF_CAT, [^)]*'Finishes'/.test(src), "finish meta scoped to category 'Finishes'")
ok(/fetchStandardRateMap\(\[[^\]]*'Finishes'/.test(src), "material fetch scope includes 'Finishes'")
ok(
  /\.in\('category',\s*\[[^\]]*'Finishes'\]\)/.test(src),
  "labor fetch scope (.in('category', …)) includes 'Finishes'"
)

console.log(
  fails.length
    ? `\nFAIL — ${fails.length} issue(s); Outdoor Kitchen finishes are not fully on the shared source.`
    : '\nPASS — Outdoor Kitchen finishes are shared + fetched (material + labor).'
)
process.exit(fails.length ? 1 : 0)
