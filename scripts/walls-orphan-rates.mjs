#!/usr/bin/env node
/**
 * Walls — find NON-ACTIONABLE View Rates entries: rates the View Rates table
 * surfaces (WALLS_RATE_SCOPE: full `Walls` + borrowed Demo/Drainage/Basic
 * Materials/Concrete subs) that no field in the module actually consumes.
 *
 * CONSUMED set = every `db: '…'` in WALL_RATE_SPECS plus every mp['…'] literal
 * read, extracted statically from WallsModule.jsx + wallsStruct.js. SURFACED set
 * is live DB data — paste the scoped rate names (one per line) into
 * scripts/walls-surfaced-rates.txt and re-run. Anything surfaced but not
 * consumed is a non-actionable (orphan) row.
 *
 * Surfaced list (Supabase, Walls scope):
 *   select name from labor_rates
 *    where category='Walls'
 *       or (category='Basic Materials' and sub_category in ('Aggregate & Concrete','Grout','Reinforcement'))
 *       or (category='Concrete' and sub_category='Concrete Mix')
 *       or (category='Drainage' and sub_category in ('French Drain','French Drain Pipe'))
 *       or (category='Demo' and sub_category in ('Hand Demo','Mini Skid Steer Demo','Skid Steer Demo'))
 *   union select name from misc_rates where category='Walls';
 *
 * Run:  node scripts/walls-orphan-rates.mjs
 */
import { readFileSync, existsSync } from 'node:fs'

const files = ['src/components/modules/WallsModule.jsx', 'src/components/modules/wallsStruct.js']
const consumed = new Set()
for (const f of files) {
  const src = readFileSync(f, 'utf8')
  for (const re of [/\bdb:\s*'([^']+)'/g, /\bmp\[\s*'([^']+)'\s*\]/g]) {
    for (const m of src.matchAll(re)) consumed.add(m[1])
  }
}

console.log(`Module CONSUMES ${consumed.size} named rates (View-Rates-actionable):`)
;[...consumed].sort().forEach(nm => console.log(`  • ${nm}`))

const surfacedFile = 'scripts/walls-surfaced-rates.txt'
if (!existsSync(surfacedFile)) {
  console.log(
    `\nNo ${surfacedFile} yet — paste the Walls View Rates rate names there (one per\n` +
      `line) and re-run to list any NON-ACTIONABLE (surfaced but unused) entries.`
  )
  process.exit(0)
}
const surfaced = readFileSync(surfacedFile, 'utf8')
  .split('\n')
  .map(s => s.trim())
  .filter(s => s && !s.startsWith('#'))
const orphans = surfaced.filter(nm => !consumed.has(nm))
console.log(`\nSurfaced in View Rates: ${surfaced.length}. Non-actionable (surfaced, not consumed): ${orphans.length}`)
orphans.forEach(nm => console.log(`  ✗ ${nm}`))
console.log(
  orphans.length
    ? `\nFAIL — ${orphans.length} View Rates entr(ies) map to no module field. Narrow the scope or move the row.`
    : '\nPASS — every surfaced rate maps to a module field.'
)
process.exit(orphans.length ? 1 : 0)
