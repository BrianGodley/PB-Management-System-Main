#!/usr/bin/env node
/**
 * Pool — consumed-rate manifest (checklist Goals 2 & 3 input). Static, no DB.
 *
 * Pool reads everything live (labor_rates / misc_rates / subcontractor_rates + the Pool
 * catalog) — NO hardcoded rate fallbacks (unset ⇒ 0; a few 27 cf/cy math conversions stay
 * inline). Rates consumed:
 *   • excavation labor:  labor_rates['Excavation - …'] (hrs per Cu Yd), one per equipment type.
 *   • tunable coefficients (misc_rates): 'Pool Avg Depth Ratio', 'Pool Excavation Swell
 *     Factor', 'Pool Shotcrete Shell Thickness', 'Pool Shotcrete Swell Factor', 'Pool Tile
 *     SF per LF' — geometry/coverage assumptions.
 *   • subcontractor_rates (category Pool): Shotcrete Material/Labor/Minimum, Interior Finish,
 *     Plumbing, Excavation sub, etc.
 *   • ITEM-DRIVEN labor: waterline tile, coping, spillways, raised surfaces, water features,
 *     and the gas/electrical utility lines all ride on each catalog item's calc_meta.labor_rate
 *     (resolved live via resolveUtilRow / poolStdItem). Material = the item's vendor-first price.
 *   • equipment + water-feature material: the Pool catalog sub_categories (Equipment, Water
 *     Features, Waterline Tile, Coping, Spillway, Raised, plus the shared Utilities lines).
 * DB-health SQL verifies each is priced + flags orphans.
 *
 * Run:  node scripts/pool-rate-coverage.mjs
 */
import { readFileSync } from 'node:fs'
const calc = readFileSync('src/components/modules/poolCalc.js', 'utf8')
const uniq = a => [...new Set(a)].filter(Boolean).sort()

// Named rates read from the maps: materialPrices['…'] (misc), laborRates['…'], subRates['…'].
const mpNames = uniq([...calc.matchAll(/materialPrices\[\s*'([^']+)'\s*\]/g)].map(m => m[1]))
const subNames = uniq([...calc.matchAll(/subRates\[\s*'([^']+)'\s*\]/g)].map(m => m[1]))
// Excavation labor names (EXCAVATION_LABOR_NAME values).
const excavLabor = uniq([...calc.matchAll(/:\s*'(Excavation - [^']+)'/g)].map(m => m[1]))
// Catalog sub_categories the calc resolves items from (poolStdItem / resolveUtilRow / UTIL_CAT).
const utilCats = uniq([...calc.matchAll(/UTIL_CAT\s*=\s*\{([^}]*)\}/g)].flatMap(m => [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1])))

const show = (t, a) => { console.log(`\n${t} (${a.length})`); a.forEach(k => console.log(`  - ${k}`)) }
console.log(`Pool consumes ${excavLabor.length} excavation labor rates + ${mpNames.length} tunable misc coefficients + ${subNames.length} subcontractor rates, plus ITEM-DRIVEN labor (calc_meta.labor_rate) for tile/coping/spillway/raised/water-features/utilities and vendor-first catalog material.`)
show('labor_rates — excavation equipment (hrs per Cu Yd)', excavLabor)
show("misc_rates — tunable Pool coefficients (geometry / coverage / swell)", mpNames)
show('subcontractor_rates — category Pool (shotcrete/interior/plumbing/excavation sub)', subNames)
show('catalog sub_categories — shared Utilities lines (Electrical Pipe / Gas Pipe / Wiring / Fixtures)', utilCats)
console.log('\nItem-driven sections (Waterline Tile / Coping / Spillway / Raised Surface / Water Features / Equipment,')
console.log('sub_categories under category "Pool") resolve material vendor-first + labor via each item\'s calc_meta.')
console.log('labor_rate. Unpriced ⇒ $0 / 0 hrs + surfaced in laborUnset. NO constants. Verify with DB-health SQL.')
