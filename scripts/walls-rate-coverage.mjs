#!/usr/bin/env node
/**
 * Walls — enumerate every rate the module uses and the CATEGORY / sub-category it
 * lives in, from the (currently dead) WALL_RATE_SPECS registry + catalog subcats.
 * This is the set an explicit Walls RATE_SCOPE must cover to make Walls View Rates
 * behave like Fire Pit's (surfacing all shared rates, not just the module_category_map
 * default). Static — runs in the sandbox, no DB.
 *
 * Run:  node scripts/walls-rate-coverage.mjs
 */
import { readFileSync } from 'node:fs'

const src = readFileSync('src/components/modules/WallsModule.jsx', 'utf8')
const block = src.match(/const WALL_RATE_SPECS = \[([\s\S]*?)\n\]/)
if (!block) {
  console.error('Could not find WALL_RATE_SPECS')
  process.exit(2)
}

// Walk each group: capture group name, catalogSubcat, and [key,label,category,…] items.
const byCat = new Map() // category -> Set(labels)
const subcats = new Set() // Walls material sub-categories (catalogSubcat)
let group = null
for (const line of block[1].split('\n')) {
  const g = line.match(/group:\s*'([^']+)'/)
  if (g) group = g[1]
  const cs = line.match(/catalogSubcat:\s*'([^']+)'/)
  if (cs) subcats.add(cs[1])
  const item = line.match(/\[\s*'[^']+',\s*'([^']+)',\s*'([^']+)'/)
  if (item) {
    const [, label, category] = item
    if (!byCat.has(category)) byCat.set(category, new Set())
    byCat.get(category).add(label)
  }
}

console.log('Walls uses rates from these CATEGORIES (View Rates must surface each):\n')
for (const [cat, labels] of [...byCat.entries()].sort()) {
  console.log(`  ${cat}  (${labels.size} rate${labels.size === 1 ? '' : 's'})`)
  ;[...labels].sort().forEach(l => console.log(`      - ${l}`))
}
console.log('\nWalls MATERIAL sub-categories (own catalog pickers):')
;[...subcats].sort().forEach(s => console.log(`  • ${s}`))

// ── Coverage check: does WALLS_RATE_SCOPE cover every category the module uses? ──
const scopeBlock = src.match(/const WALLS_RATE_SCOPE = \[([\s\S]*?)\n\]/)
const scopeCats = new Set(
  scopeBlock
    ? [...scopeBlock[1].matchAll(/category:\s*'([^']+)'/g)].map(m => m[1])
    : []
)
const consumedCats = [...byCat.keys()]
const uncovered = consumedCats.filter(c => !scopeCats.has(c))
console.log('\nWALLS_RATE_SCOPE covers categories:', [...scopeCats].sort().join(', ') || '(none — not wired yet)')
console.log(
  uncovered.length
    ? `\nFAIL — categories used but NOT in WALLS_RATE_SCOPE: ${uncovered.join(', ')}`
    : '\nPASS — every category Walls uses is in WALLS_RATE_SCOPE (View Rates will surface them).'
)
process.exit(uncovered.length ? 1 : 0)
