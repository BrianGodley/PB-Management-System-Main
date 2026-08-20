#!/usr/bin/env node
/**
 * Fire Pit View-Rates parity audit (Part A of the "match View Rates to the module"
 * goal). Static check — runs in the sandbox, no DB.
 *
 * The Fire Pit module reads its rate price-map from a set of CATEGORIES
 * (fetchStandardRateMap([...])). Its View Rates popup is driven by RATE_SCOPE.
 * buildViewRates rules:
 *   • MATERIAL lines appear for every (category, sub) in RATE_SCOPE.
 *   • LABOR / MISC lines appear ONLY for FULL categories in RATE_SCOPE (no `sub`).
 * So a rate the module READS is only editable in View Rates if its category is in
 * RATE_SCOPE — and its labor/misc only if that category is scoped FULL.
 *
 * FAIL (hard gap): a category the module reads is absent from RATE_SCOPE entirely
 *   → those rates can't be surfaced or edited from Fire Pit View Rates at all.
 * WARN (soft gap): a read category is only material-sub-scoped → its LABOR/MISC
 *   (e.g. gas-line labor under Utilities) isn't editable from Fire Pit View Rates.
 *
 * Run:  node scripts/firepit-rate-parity.mjs
 */
import { readFileSync } from 'node:fs'

const src = readFileSync('src/components/modules/FirePitModule.jsx', 'utf8')

// Categories the module READS its price map from.
const mp = src.match(/fetchStandardRateMap\(\[([^\]]+)\]/)
if (!mp) {
  console.error('Could not find fetchStandardRateMap([...]) in FirePitModule.jsx')
  process.exit(2)
}
const readCats = [...mp[1].matchAll(/'([^']+)'/g)].map(m => m[1])

// RATE_SCOPE entries → { category, full }.
const scopeBlock = src.match(/const RATE_SCOPE = \[([\s\S]*?)\n\]/)
if (!scopeBlock) {
  console.error('Could not find const RATE_SCOPE = [...] in FirePitModule.jsx')
  process.exit(2)
}
const scope = scopeBlock[1]
  .split('\n')
  .filter(l => l.includes('category:'))
  .map(l => ({
    category: (l.match(/category:\s*'([^']+)'/) || [])[1],
    full: !/\bsub:/.test(l),
  }))
  .filter(s => s.category)

const allCats = [...new Set(scope.map(s => s.category))]
const fullCats = [...new Set(scope.filter(s => s.full).map(s => s.category))]

const hardGaps = readCats.filter(c => !allCats.includes(c))
const softGaps = readCats.filter(c => allCats.includes(c) && !fullCats.includes(c))

console.log('Module reads price-map categories:', readCats.join(', '))
console.log('View Rates surfaces materials for :', allCats.join(', '))
console.log('View Rates surfaces labor/misc for:', fullCats.join(', '))

if (softGaps.length) {
  // buildViewRates now surfaces borrowed-sub LABOR + SUB (filtered by sub_category),
  // so those ARE editable. Only MISC can't be scoped to a borrowed sub (misc_rates
  // has no sub_category), so misc from these categories stays home-module-only.
  console.log('\n── NOTE — borrowed sub-categories (labor + sub now editable; misc stays in the home module) ──')
  for (const c of softGaps) console.log(`  ${c}`)
}
if (hardGaps.length) {
  console.log('\n── FAIL — category read by the module but ABSENT from RATE_SCOPE ──')
  for (const c of hardGaps) console.log(`  ${c} (rates here can't be surfaced or edited from Fire Pit View Rates)`)
}

console.log(
  hardGaps.length
    ? `\nFAIL — ${hardGaps.length} category(ies) read but not surfaced in View Rates.`
    : '\nPASS — every read category is represented in RATE_SCOPE.'
)
process.exit(hardGaps.length ? 1 : 0)
