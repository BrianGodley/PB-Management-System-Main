#!/usr/bin/env node
/**
 * Artificial Turf — consumed-rate manifest (checklist Goals 2 & 3 input). Static, no DB.
 *
 * Turf consumes rates several ways (all read live; NO hardcoded rate fallbacks — a missing
 * row ⇒ 0; a few geometry SPECS have documented coefficient fallbacks: roll width 15',
 * Class II depth 3", DG depth 1"):
 *   • demo labor: labor_rates[DEMO_METHODS[].matKey] (hrs per Ton) + misc_rates dump fees
 *     (Dump Fee - Concrete/Dirt/Green Waste) + 'Turf - Demo Tons Divisor' (SF·in per Ton).
 *   • base labor + coefficients: misc_rates 'Turf - Base Install' / 'Turf - DG Base Install' /
 *     'Turf - Weed Fabric Install' (hrs/SF) + 'Turf - Class II Depth In' / 'Turf - DG Depth In'.
 *   • base material: the base Type's shared-catalog price (Base Material / Decomposed Granite /
 *     Barriers sub_categories, vendor-first → Standard).
 *   • turf install labor: labor_rates 'Turf - Turf Install' / 'Turf - Strip Install' (hrs/SF, hrs/LF).
 *   • turf material: the brand's catalog price (sub_category 'Turf Material', vendor-first).
 *   • turf consumables (misc_rates): 'Turf - Install Materials', 'Turf - Cut/Staple/Seam',
 *     'Turf - Infill SF per Bag', 'Turf - Infill ZeoFill', 'Turf - Infill Durafill', roll width.
 *   • Sub tab (subcontractor_rates): 'Turf Sub - Install Per SF', 'Turf Sub - Strip Per LF'.
 * DB-health SQL verifies each of these is priced + flags orphans.
 *
 * Run:  node scripts/turf-rate-coverage.mjs
 */
import { readFileSync } from 'node:fs'
const calc = readFileSync('src/components/modules/artificialTurfCalc.js', 'utf8')
const uniq = a => [...new Set(a)].filter(Boolean).sort()

// Demo method labor keys (matKey) + dump-fee keys.
const demoLabor = uniq([...calc.matchAll(/matKey:\s*'([^']+)'/g)].map(m => m[1]))
const dumpKeys = uniq([...calc.matchAll(/dumpKey:\s*'([^']+)'/g)].map(m => m[1]))
// Everything the calc reads by name from mp (misc) / lr (labor) / subRates.
const mpKeys = uniq([...calc.matchAll(/mp\[\s*'([^']+)'\s*\]/g)].map(m => m[1]))
const lrKeys = uniq([...calc.matchAll(/lr\[\s*'([^']+)'\s*\]/g)].map(m => m[1]))
const subKeys = uniq([...calc.matchAll(/subRates\[\s*'([^']+)'\s*\]/g)].map(m => m[1]))

const labor = uniq([...demoLabor, ...lrKeys])
const show = (t, a) => { console.log(`\n${t} (${a.length})`); a.forEach(k => console.log(`  - ${k}`)) }
console.log(`Artificial Turf consumes ${labor.length} labor rates + ${mpKeys.length} misc coefficients/consumables + ${dumpKeys.length} dump fees + ${subKeys.length} subcontractor rates, plus base + turf-brand material from the catalog (vendor-first → Standard).`)
show('labor_rates — demo method (hrs/Ton) + turf/strip install (hrs/SF, hrs/LF)', labor)
show('misc_rates — install/geometry coefficients + turf consumables', mpKeys)
show('misc_rates — demo dump fees', dumpKeys)
show('subcontractor_rates — Sub tab flat $/SF + $/LF', subKeys)
console.log('\nBase material: base Type shared-catalog price (Base Material / Decomposed Granite / Barriers, vendor-first).')
console.log('Turf material: brand catalog price (sub_category Turf Material, vendor-first). Unpriced ⇒ $0. NO')
console.log('rate constants (roll width / depths are documented geometry-spec fallbacks). Verify with DB-health SQL.')
