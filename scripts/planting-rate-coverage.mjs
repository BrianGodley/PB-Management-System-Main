#!/usr/bin/env node
/**
 * Planting — consumed-rate manifest (checklist Goals 2 & 3 input). Static, no DB.
 *
 * Planting consumes rates several ways (all hrs-per-unit / name-keyed, NO fallbacks):
 *   • per-plant install labor:  ITEM-DRIVEN — each Plants Item points to its own
 *     labor_rates row via `calc_meta.labor_rate` (resolved live; hrs per plant). Unset
 *     ⇒ 0 hrs AND the plant surfaces in `laborUnset` (no constant). Because the labor
 *     key lives in DB calc_meta, per-item coverage is proven by the DB-health SQL, not
 *     enumerable from code.
 *   • till labor:  labor_rates['Till - Soil Move Rate' | 'Till - Tilling Rate' |
 *     'Till - Amend Rate'] (hrs per Cu Yd / Sq Ft). All three must be > 0 or till = 0.
 *   • add-on labor:  labor_rates[ADDON_META.labKey] (hrs per unit; perDay, or perMin ÷60).
 *   • plant material:  the row's vendor-defaulted unit price (Plants sub_category,
 *     vendor-first → Standard). Add-on material:  material_price[ADDON_META.matKey]
 *     (Amendments sub_category, vendor-first → Standard).
 * DB-health SQL verifies every one of these is priced + flags orphans.
 *
 * Run:  node scripts/planting-rate-coverage.mjs
 */
import { readFileSync } from 'node:fs'
const calc = readFileSync('src/components/modules/plantingCalc.js', 'utf8')
const uniq = a => [...new Set(a)].filter(Boolean).sort()
const grab = re => uniq([...calc.matchAll(re)].map(m => m[1]))

// Add-on labor + material keys come straight out of ADDON_META in the calc source.
const addonLabor = grab(/labKey:\s*'([^']+)'/g)
const addonMat = grab(/matKey:\s*'([^']+)'/g)
// Direct labor_rates the calc reads by name (Till section).
const tillLabor = grab(/lr\(laborRates,\s*'([^']+)'\)/g)

const laborRates = uniq([...tillLabor, ...addonLabor])
const show = (t, a) => { console.log(`\n${t} (${a.length})`); a.forEach(k => console.log(`  - ${k}`)) }
console.log(`Planting consumes ${laborRates.length} name-keyed labor rates + per-plant ITEM-DRIVEN labor (calc_meta.labor_rate) + ${addonMat.length} add-on materials, plus plant material via the Plants sub_category (vendor-first → Standard).`)
show('labor_rates — Till + add-on install rates (category Planting)', laborRates)
show('material_price / misc — add-on materials (Amendments sub_category, vendor-first → Standard)', addonMat)
console.log('\nper-plant install labor: ITEM-DRIVEN via each Plants Item\'s calc_meta.labor_rate (hrs per plant).')
console.log('plant material: the picked Plants Item\'s vendor-defaulted unit price. Unset labor → 0 hrs + laborUnset;')
console.log('unpriced material → $0. NO constants. Per-item coverage verified by the DB-health SQL.')
