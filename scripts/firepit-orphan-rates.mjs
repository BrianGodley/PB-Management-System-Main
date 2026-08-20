#!/usr/bin/env node
/**
 * Fire Pit — find NON-ACTIONABLE View Rates entries: rates the View Rates table
 * surfaces that no field in the module actually consumes (orphans / dead rows).
 *
 * The module's CONSUMED set is extracted statically from FirePitModule.jsx +
 * firePitStruct.js (FP_RATES dbNames, every mp['…'] / p('…') read, and dbName /
 * laborDbName literals). What View Rates SURFACES is live DB data, so paste the
 * scoped rate names (one per line) into scripts/firepit-surfaced-rates.txt and
 * re-run — anything surfaced but not consumed is a non-actionable entry.
 *
 * Get the surfaced list (run in Supabase, Fire Pit scope) e.g.:
 *   select name from labor_rates where category='Fire Pit'
 *   union select name from misc_rates  where category='Fire Pit';
 * (add the borrowed-sub labor if you want those checked too.)
 *
 * Run:  node scripts/firepit-orphan-rates.mjs
 */
import { readFileSync, existsSync } from 'node:fs'

const files = ['src/components/modules/FirePitModule.jsx', 'src/components/modules/firePitStruct.js']
const consumed = new Set()
for (const f of files) {
  const src = readFileSync(f, 'utf8')
  for (const re of [
    /dbName:\s*'([^']+)'/g,
    /laborDbName:\s*'([^']+)'/g,
    /\bmp\[\s*'([^']+)'\s*\]/g,
    /\bp\(\s*'([^']+)'/g,
  ]) {
    for (const m of src.matchAll(re)) consumed.add(m[1])
  }
}

console.log(`Module CONSUMES ${consumed.size} named rates (View-Rates-actionable):`)
;[...consumed].sort().forEach(nm => console.log(`  • ${nm}`))

const surfacedFile = 'scripts/firepit-surfaced-rates.txt'
if (!existsSync(surfacedFile)) {
  console.log(
    `\nNo ${surfacedFile} yet — paste the Fire Pit View Rates rate names there (one per\n` +
      `line) and re-run to list any NON-ACTIONABLE (surfaced but unused) entries.`
  )
  process.exit(0)
}
const surfaced = readFileSync(surfacedFile, 'utf8')
  .split('\n')
  .map(s => s.trim())
  .filter(Boolean)
const orphans = surfaced.filter(nm => !consumed.has(nm))
console.log(`\nSurfaced in View Rates: ${surfaced.length}. Non-actionable (surfaced, not consumed): ${orphans.length}`)
orphans.forEach(nm => console.log(`  ✗ ${nm}`))
console.log(
  orphans.length
    ? `\nFAIL — ${orphans.length} View Rates entr(ies) map to no module field. Hide or remove them.`
    : '\nPASS — every surfaced rate maps to a module field.'
)
process.exit(orphans.length ? 1 : 0)
