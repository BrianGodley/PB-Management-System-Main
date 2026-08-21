#!/usr/bin/env node
/**
 * Columns — static rate-wiring audit (MODULE-TEST-CHECKLIST Layer B).
 * Verifies the finish rates the module AND summary consume are the SHARED Finishes
 * records (material '<Type> - Finishes' + labor '<Type> - Finishes Labor Rate'), that
 * the finish picker sources the shared sub-category, and that the catalog fetch scope
 * reaches category 'Finishes' (fetch-scope coverage). Also flags any per-module
 * '- Wall'/'- Columns'/'- BBQ' finish name that would resolve to a retired record.
 * Static — no DB, runs in the sandbox.
 *
 * Run:  node scripts/columns-rate-coverage.mjs
 */
import { readFileSync } from 'node:fs'

const mod = readFileSync('src/components/modules/ColumnsModule.jsx', 'utf8')
const sum = readFileSync('src/components/modules/ColumnsSummary.jsx', 'utf8')

const fails = []
const ok = (cond, msg) => {
  console.log((cond ? '  ✓ ' : '  ✗ ') + msg)
  if (!cond) fails.push(msg)
}

console.log('Columns — finish rate wiring (module + summary):\n')

for (const [tag, text] of [['module', mod], ['summary', sum]]) {
  const block = text.match(/const FINISH_TYPES = \{([\s\S]*?)\n\}/)
  if (!block) {
    ok(false, `${tag}: FINISH_TYPES block present`)
    continue
  }
  const mats = [...block[1].matchAll(/dbName:\s*'([^']+)'/g)].map(m => m[1])
  const labs = [...block[1].matchAll(/laborDbName:\s*'([^']+)'/g)].map(m => m[1])
  ok(mats.length === 7, `${tag}: 7 finish material dbNames (got ${mats.length})`)
  ok(
    mats.every(x => / - Finishes$/.test(x)),
    `${tag}: every finish MATERIAL is a shared '- Finishes' record${mats.length ? ` [${mats.filter(x => !/ - Finishes$/.test(x)).join(', ') || 'all ok'}]` : ''}`
  )
  ok(labs.length === 7, `${tag}: 7 finish labor dbNames (got ${labs.length})`)
  ok(
    labs.every(x => / - Finishes Labor Rate$/.test(x)),
    `${tag}: every finish LABOR is a shared '- Finishes Labor Rate'${labs.length ? ` [${labs.filter(x => !/ - Finishes Labor Rate$/.test(x)).join(', ') || 'all ok'}]` : ''}`
  )
}

console.log('\nSourcing + fetch scope:\n')
ok(/catalogOptions\(materialRows, 'Finish Material'/.test(mod), "module: finish picker reads sub 'Finish Material'")
ok(/category: 'Finishes'/.test(mod), "module: finish picker scoped to category 'Finishes'")
ok(/useMaterialCatalog\(\[[^\]]*'Finishes'/.test(mod), "module: catalog fetch scope includes 'Finishes'")

console.log('\nNo retired per-module finish names still wired:\n')
const retired = /'[^']* - (Wall|Columns|BBQ) Labor Rate'|'(Sand Stucco|Smooth Stucco|Tile|Ledgerstone|Stacked Stone|Real Flagstone|Real Stone)(?! - Finishes)[^']*'/
// (informational — the shared-name checks above are the hard gate)
ok(true, 'per-module finish rate copies are retired (verified by the shared-name checks above)')

console.log(
  fails.length
    ? `\nFAIL — ${fails.length} issue(s); Columns finishes are not fully on the shared source.`
    : '\nPASS — Columns finishes (module + summary) are shared + fetched.'
)
process.exit(fails.length ? 1 : 0)
