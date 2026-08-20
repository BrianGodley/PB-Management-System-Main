#!/usr/bin/env node
/**
 * Walls Goal 2 — COVERAGE: every labor coefficient the calc reads must be an
 * editable rate surfaced in Walls View Rates. Mirror of the orphan check:
 *   orphan   = surfaced − consumed   (walls-orphan-rates.mjs)
 *   coverage = consumed − surfaced   (this file)
 *
 * Consumed-labor set = every WALL_RATES key passed to r(...) / lab(...) across
 * WallsModule.jsx + wallsStruct.js + wallsCalc.js (literal args, incl. the two
 * ternary/dynamic install keys), resolved to its `db:` labor-rate name. Diffed
 * against the DB-scoped labor list in scripts/walls-surfaced-rates.txt.
 *
 * Static — no DB. Run: node scripts/walls-labor-coverage.mjs
 */
import { readFileSync } from 'node:fs'

const wm = readFileSync('src/components/modules/WallsModule.jsx', 'utf8')
const files = ['src/components/modules/WallsModule.jsx', 'src/components/modules/wallsStruct.js', 'src/components/modules/wallsCalc.js']

// 1) WALL_RATES key → db name
const ratesBlock = wm.match(/const WALL_RATES = \{([\s\S]*?)\n\}/)
if (!ratesBlock) {
  console.error('Could not find WALL_RATES')
  process.exit(2)
}
const keyToDb = new Map()
for (const m of ratesBlock[1].matchAll(/(\w+):\s*\{\s*db:\s*'([^']+)'/g)) keyToDb.set(m[1], m[2])

// 2) labor keys = every quoted string inside an r(...) or lab(...) call, plus
//    the install-key literals (installKey defaults/assignments feed r(installKey)).
const laborKeys = new Set()
for (const f of files) {
  const src = readFileSync(f, 'utf8')
  for (const call of src.matchAll(/\b(?:r|lab)\(([^)]*)\)/g)) {
    for (const q of call[1].matchAll(/'([^']+)'/g)) laborKeys.add(q[1])
  }
  for (const ik of src.matchAll(/installKey[:=]\s*'([^']+)'/g)) laborKeys.add(ik[1])
}

// 3) resolve to db names (only keys that are real WALL_RATES labor keys)
const consumed = new Map() // db name -> key
for (const k of laborKeys) if (keyToDb.has(k)) consumed.set(keyToDb.get(k), k)

// 4) surfaced labor/misc names (DB-scoped list)
const surfaced = new Set(
  readFileSync('scripts/walls-surfaced-rates.txt', 'utf8')
    .split('\n')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('#'))
)

const gaps = [...consumed.keys()].filter(db => !surfaced.has(db)).sort()
console.log(`Labor coefficients the calc CONSUMES: ${consumed.size}`)
console.log(`Surfaced (scoped) labor/misc rates:  ${surfaced.size}`)
if (gaps.length) {
  console.log(`\nCOVERAGE GAPS — consumed but NOT surfaced (uneditable in View Rates): ${gaps.length}`)
  gaps.forEach(db => console.log(`  ✗ ${db}   (key: ${consumed.get(db)})`))
  console.log('\nFAIL — add these to WALLS_RATE_SCOPE (or confirm they are misc/material).')
} else {
  console.log('\nPASS — every labor coefficient the module reads is surfaced/editable in Walls View Rates.')
}
process.exit(gaps.length ? 1 : 0)
