#!/usr/bin/env node
/**
 * Fire Pit — every MATERIAL and LABOR rate the module uses (its FP_RATES keys),
 * checked against what Fire Pit View Rates surfaces (RATE_SCOPE + buildViewRates
 * rules). Ensures every labor rate is in a category View Rates can EDIT.
 *
 * View Rates surfaces: materials for any (category, sub) in RATE_SCOPE; labor/sub
 * for FULL categories OR borrowed (category, sub) pairs. So a rate is editable if
 * its category is in RATE_SCOPE (material) / is full or a borrowed sub (labor).
 *
 * Category inference from the rate name (the module's own convention):
 *   • name ends "- Finishes"            → Finishes  (real flagstone/stone material)
 *   • everything else (FP …, … - FP …)  → Fire Pit
 * Gas-line/fixture labor lives in Utilities and is surfaced via the borrowed
 * Utilities sub-scopes (handled by the buildViewRates enhancement).
 *
 * Run:  node scripts/firepit-labor-coverage.mjs
 */
import { readFileSync } from 'node:fs'

const src = readFileSync('src/components/modules/FirePitModule.jsx', 'utf8')

const fpBlock = src.match(/const FP_RATES = \{([\s\S]*?)\n\}/)
if (!fpBlock) {
  console.error('Could not find FP_RATES in FirePitModule.jsx')
  process.exit(2)
}
const rates = [...fpBlock[1].matchAll(/(\w+):\s*\{\s*dbName:\s*'([^']+)'/g)].map(m => ({
  key: m[1],
  name: m[2],
  isLabor: /Labor Rate/.test(m[2]),
  category: /- Finishes$/.test(m[2]) ? 'Finishes' : 'Fire Pit',
}))

// RATE_SCOPE categories (full vs any).
const scopeBlock = src.match(/const RATE_SCOPE = \[([\s\S]*?)\n\]/)[1]
const scope = scopeBlock.split('\n').filter(l => l.includes('category:')).map(l => ({
  category: (l.match(/category:\s*'([^']+)'/) || [])[1],
  full: !/\bsub:/.test(l),
}))
const anyCats = new Set(scope.map(s => s.category))
const fullCats = new Set(scope.filter(s => s.full).map(s => s.category))

// A material is editable if its category is in RATE_SCOPE at all; a labor rate is
// editable if its category is full OR surfaced as a borrowed sub (Fire Pit = full).
const editable = r => (r.isLabor ? fullCats.has(r.category) || anyCats.has(r.category) : anyCats.has(r.category))

const materials = rates.filter(r => !r.isLabor)
const labor = rates.filter(r => r.isLabor)

const show = list => list.forEach(r => console.log(`  ${editable(r) ? '✓' : '✗'} [${r.category}] ${r.name}`))
console.log(`MATERIAL rates (${materials.length}):`)
show(materials)
console.log(`\nLABOR rates (${labor.length}):`)
show(labor)

const badLabor = labor.filter(r => !editable(r))
const badMat = materials.filter(r => !editable(r))
console.log(
  badLabor.length || badMat.length
    ? `\nFAIL — ${badMat.length} material + ${badLabor.length} labor rate(s) not editable in View Rates.`
    : `\nPASS — all ${materials.length} materials and ${labor.length} labor rates are surfaced/editable in Fire Pit View Rates.`
)
process.exit(badLabor.length || badMat.length ? 1 : 0)
