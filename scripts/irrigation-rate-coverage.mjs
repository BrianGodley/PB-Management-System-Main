#!/usr/bin/env node
/**
 * Irrigation — consumed-rate manifest (checklist Goals 2 & 3 input). Static, no DB.
 *
 * Irrigation consumes rates four ways (all hrs-per-unit / name-keyed, NO fallbacks):
 *   • zone labor:  labor_rates['Irrigation - <Zone> Trench' | '<Zone> Hand'] — one Trench
 *                  and one Hand key per zone assembly (hrs per zone; ZONE_TYPES in
 *                  src/lib/irrigationZones.js). Unset → 0 hrs (no constant).
 *   • timer labor: labor_rates['Irrigation - Timer Install'] (hrs per timer).
 *   • timer material: material_price['Irrigation Timer - <N> Station'] (vendor-first,
 *                  else Standard) per TIMER_TYPES matKey.
 *   • zone material:  each zone's bill-of-materials product (IRR_PRODUCTS) priced live via
 *                  makeBomPrice (materialRows vendor line, else Standard). Missing → the
 *                  row's `missing` list (surfaced in the module), $0 added — never a constant.
 * DB-health SQL verifies every one of these is priced + flags orphans.
 *
 * Run:  node scripts/irrigation-rate-coverage.mjs
 */
import { readFileSync } from 'node:fs'
const calc = readFileSync('src/components/modules/irrigationCalc.js', 'utf8')
const zones = readFileSync('src/lib/irrigationZones.js', 'utf8')
const uniq = a => [...new Set(a)].filter(k => k && !k.includes('...')).sort()
const grabFrom = (src, re) => uniq([...src.matchAll(re)].map(m => m[1]))

// Zone labor keys: laborTrench / laborHand string values in ZONE_TYPES.
const zoneLabor = grabFrom(zones, /labor(?:Trench|Hand):\s*'([^']+)'/g)
// Direct labor_rates the calc reads by name.
const directLabor = grabFrom(calc, /lr\[\s*'([^']+)'\s*\]/g)
// Timer material keys: matKey values in TIMER_TYPES.
const timerMat = grabFrom(calc, /matKey:\s*'([^']+)'/g)
// Zone BOM product names: IRR_PRODUCTS values (single- or double-quoted / backtick).
const bomMat = uniq([
  ...[...zones.matchAll(/^\s*[A-Z0-9]+:\s*'([^']+)'/gm)].map(m => m[1]),
  ...[...zones.matchAll(/^\s*[A-Z0-9]+:\s*"([^"]+)"/gm)].map(m => m[1]),
  ...[...zones.matchAll(/^\s*[A-Z0-9]+:\s*`([^`]+)`/gm)].map(m => m[1]),
])

const show = (t, a) => { console.log(`\n${t} (${a.length})`); a.forEach(k => console.log(`  - ${k}`)) }
const labor = uniq([...zoneLabor, ...directLabor])
console.log(`Irrigation consumes ${labor.length} labor rates + ${timerMat.length} timer materials + ${bomMat.length} zone-BOM materials.`)
show('labor_rates — zone (Trench/Hand per zone) + timer/config (category Irrigation)', labor)
show('material_price — timer units (Irrigation Timer - N Station)', timerMat)
show('material_price — zone bill-of-materials products (IRR_PRODUCTS)', bomMat)
console.log('\nAll resolve live (labor by name; material vendor-first → Standard). Unset labor → 0 hrs;')
console.log('unpriced BOM line → row `missing` (module surfaces it) + $0. NO constants. Verify with DB-health SQL.')
