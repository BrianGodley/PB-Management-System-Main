#!/usr/bin/env node
/**
 * Drainage — consumed-rate manifest (checklist Goals 2 & 3 input). Static, no DB.
 *
 * Drainage consumes rates three ways:
 *   • trench:   materialPrices['Drainage Trench/Hand Excavation'] (hrs per Cu Ft)
 *   • name-key: materialPrices['Name'] for sock/burrito/gravel + labor-rate name maps
 *               (PIPE_LABOR_RATE_NAME / FRENCH_PIPE_LABOR_RATE_NAME / FIXTURE_LABOR_RATE_NAME /
 *               ADD_ITEM_LABOR_RATE_NAME) — the built-in labor fallbacks per type
 *   • catalog:  pipe / french-pipe / fixture MATERIAL + labor resolve vendor-first from
 *               the Drainage catalog sub-cats (drainMatCost + calc_meta.labor_rate)
 * DB-health SQL verifies coverage + orphans.
 *
 * Run:  node scripts/drainage-rate-coverage.mjs
 */
import { readFileSync } from 'node:fs'
const calc = readFileSync('src/components/modules/drainageCalc.js', 'utf8')
const uniq = a => [...new Set(a)].filter(k => k && !k.includes('...')).sort()
const grab = re => uniq([...calc.matchAll(re)].map(m => m[1]))
// name-keyed labor/material rates: the string values in the *_NAME / *_LABOR_RATE_NAME maps
const rateNames = grab(/:\s*'(Drainage [^']+)'/g)
const nameKeyed = grab(/materialPrices\[\s*'([^']+)'\s*\]/g)

const show = (t, a) => { console.log(`\n${t} (${a.length})`); a.forEach(k => console.log(`  - ${k}`)) }
const all = uniq([...rateNames, ...nameKeyed])
console.log(`Drainage consumes ${all.length} name-keyed rates (+ catalog pipe/french/fixture material via drainMatCost).`)
show('labor_rates / material — name-keyed (category Drainage)', all)
console.log('\nPipe / French Pipe / Fixture MATERIAL + per-LF LABOR also resolve from the Drainage')
console.log('catalog sub-cats vendor-first (material_price + calc_meta.labor_rate). Verify with DB-health SQL.')
