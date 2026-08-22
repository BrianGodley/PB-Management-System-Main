#!/usr/bin/env node
/**
 * Ground Treatments — consumed-rate manifest (checklist Goals 2 & 3 input). Static, no DB.
 *
 * GT reads every price + labor coefficient LIVE from the rate map by DB name — no hardcoded
 * rate fallbacks (a missing row ⇒ 0). Section material comes from the catalog by Type
 * (vendor-first → Standard). Rates consumed:
 *   • GT_RATES DB names — per-section material $ + labor coefficients (Mulch/Edging/Prep/Sod/
 *     Fertilizer/Steppers/DG/Gravel...), all category 'Ground Treatments' (+ shared
 *     'Weed Fabric' from Basic Materials → Barriers, 'Decomposed Granite' per Cu Yd).
 *   • Tunable estimating coefficients (misc_rates 'GT - …': coverage, swell, tons denom,
 *     markup, placement labor).
 *   • Sub tab: flat subcontractor unit rates ('… Sub - $/SF', 'Edging Sub - $/LF').
 *   • Section material Type prices resolve from the catalog sub_categories: Mulch, Edging,
 *     Soils, Sod, Fertilizer, Steppers, DG, Gravel, Pebble, Cobbles.
 * DB-health SQL verifies each of these is priced + flags orphans.
 *
 * Run:  node scripts/ground-treatments-rate-coverage.mjs
 */
import { readFileSync } from 'node:fs'
const calc = readFileSync('src/components/modules/groundTreatmentsCalc.js', 'utf8')
const uniq = a => [...new Set(a)].filter(Boolean).sort()

// GT_RATES DB names (material + labor).
const gtRateNames = uniq([...calc.matchAll(/dbName:\s*'([^']+)'/g)].map(m => m[1]))
// Coefficients + sub rates read by name via p('…') / mp['…'].
const pNames = uniq([...calc.matchAll(/p\(\s*'([^']+)'\s*\)/g)].map(m => m[1]))
// Catalog sub_categories the section Type pickers resolve against (rowOpt('X', …)).
const catCats = uniq([...calc.matchAll(/rowOpt\(\s*'([^']+)'/g)].map(m => m[1]))

const coeff = pNames.filter(k => /^GT - /.test(k))
const subRates = pNames.filter(k => /Sub - \$/.test(k))
const gtLabor = gtRateNames.filter(k => /Labor|Labor Rate|SF Per Bag/.test(k))
const gtMat = gtRateNames.filter(k => !/Labor|Labor Rate|SF Per Bag/.test(k))

const show = (t, a) => { console.log(`\n${t} (${a.length})`); a.forEach(k => console.log(`  - ${k}`)) }
console.log(`Ground Treatments consumes ${gtMat.length} material/consumable rates + ${gtLabor.length} labor coefficients + ${coeff.length} tunable 'GT -' coefficients + ${subRates.length} subcontractor rates, across ${catCats.length} catalog sub_categories.`)
show('GT_RATES — material / consumable $ (category Ground Treatments; DG per Cu Yd, Weed Fabric shared)', gtMat)
show('GT_RATES — labor coefficients + fertilizer SF-per-bag', gtLabor)
show("misc_rates — tunable 'GT -' estimating coefficients (coverage/swell/markup/placement)", coeff)
show('subcontractor_rates — Sub tab flat $/SF + $/LF', subRates)
show('catalog sub_categories — section Type material sources (vendor-first → Standard)', catCats)
console.log('\nAll read live by name / from the catalog. Unpriced ⇒ $0. NO rate constants. Verify with DB-health SQL.')
