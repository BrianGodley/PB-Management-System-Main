#!/usr/bin/env node
/**
 * Weed Abatement — consumed-rate manifest (checklist Goals 2 & 3 input). Static, no DB.
 *
 * Weed Abatement consumes 4 name-keyed rates (category 'Weed Abatement'), all read live
 * from state.rates (labor_rates for the hour coefficients + misc_rates for the material
 * cost). A missing row contributes 0 — NO fallback:
 *   • labor_rates['Weed Abatement - Travel hr/visit']  (flat hrs per visit)
 *   • labor_rates['Weed Abatement - Flat']             (hrs per Sq Ft, flat area)
 *   • labor_rates['Weed Abatement - Hillside']         (hrs per Sq Ft, hillside area)
 *   • misc_rates ['Weed Abatement - Material $/1k SF'] ($ per 1,000 Sq Ft)
 * The Sub tab is STRICT $/SF entered per estimate (no rate row). DB-health SQL verifies
 * each of these is priced + flags orphans.
 *
 * Run:  node scripts/weed-rate-coverage.mjs
 */
import { readFileSync } from 'node:fs'
const calc = readFileSync('src/components/modules/weedCalc.js', 'utf8')
const names = [...calc.matchAll(/'(Weed Abatement - [^']+)'/g)].map(m => m[1])
const uniq = a => [...new Set(a)].filter(Boolean).sort()
const all = uniq(names)
const labor = all.filter(k => !/Material/.test(k))
const material = all.filter(k => /Material/.test(k))

const show = (t, a) => { console.log(`\n${t} (${a.length})`); a.forEach(k => console.log(`  - ${k}`)) }
console.log(`Weed Abatement consumes ${labor.length} labor coefficients + ${material.length} material rate (category Weed Abatement).`)
show('labor_rates — travel + flat/hillside install coefficients (hrs per unit)', labor)
show('misc_rates — material $ per 1,000 Sq Ft', material)
console.log('\nAll read live from state.rates by name; a missing row ⇒ 0 (NO fallback). The Sub tab is a')
console.log('strict per-estimate $/SF (no rate row). Verify each priced with the DB-health SQL.')
