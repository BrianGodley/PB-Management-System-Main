#!/usr/bin/env node
/**
 * Finishes — consumed-rate manifest (checklist Goals 2 & 3 input). Static, no DB.
 *
 * Finishes reads every price + labor coefficient LIVE from the rate map by DB name
 * (FINISHES_RATES) — no hardcoded fallbacks (a missing rate ⇒ 0). Three sections
 * (Flatwork / Wall Caps / Wall Finishes); the row's type drives the geometry + labor
 * formula, the Vendor only changes the MATERIAL $ source:
 *   • material $: name-keyed Standard price, OR — for a real vendor — that vendor's
 *     catalog Item unit_cost (FINISH_CAT_ITEM maps each rate key → catalog Item name).
 *   • labor: name-keyed rate from the SAME map (…"Labor Rate" keys), hrs per unit.
 * DB-health SQL verifies each of these is priced + flags orphans.
 *
 * Run:  node scripts/finishes-rate-coverage.mjs
 */
import { readFileSync } from 'node:fs'
const calc = readFileSync('src/components/modules/finishesCalc.js', 'utf8')
const uniq = a => [...new Set(a)].filter(Boolean).sort()
// Rate DB names live in FINISHES_RATES ({ db: '…' }).
const dbNames = uniq([...calc.matchAll(/db:\s*'([^']+)'/g)].map(m => m[1]))
const labor = dbNames.filter(k => /Labor Rate$/.test(k))
const material = dbNames.filter(k => !/Labor Rate$/.test(k))

const show = (t, a) => { console.log(`\n${t} (${a.length})`); a.forEach(k => console.log(`  - ${k}`)) }
console.log(`Finishes consumes ${material.length} material/consumable rates + ${labor.length} labor coefficients (category Finishes), all name-keyed with vendor-first material override.`)
show('material $ (Standard name-keyed; real vendor → catalog Item unit_cost)', material)
show('labor coefficients (hrs/SF, hrs/LF, hrs/ea, or SF-per-day)', labor)
console.log('\nVendor-first material: a real vendor’s catalog Item price overrides the Standard name-keyed price')
console.log('(FINISH_CAT_ITEM maps rate key → Item). Unpriced ⇒ $0 / 0 hrs. NO constants. Verify with DB-health SQL.')
