#!/usr/bin/env node
/**
 * Lighting — consumed-rate manifest (checklist Goals 2 & 3 input). Static, no DB.
 *
 * Lighting is fully catalog-driven (material_rates, category 'Lighting'):
 *   • sections:   three sub_categories — 'Light Fixture' | 'Transformer' | 'Wire'.
 *                 Each row picks a catalog item (vendor-first → Standard = vendor_id
 *                 NULL). MATERIAL = qty × item.unit_cost (from the price ledger when
 *                 supplied, else the row's unit_cost).
 *   • labor:      ITEM-DRIVEN — hrs = qty × labor_rates[item.calc_meta.labor_rate]
 *                 (hrs-per-unit). No section-fixed labor name in code; each catalog item
 *                 points at its own labor row (Fixture / Transformer / Bistro / Wire
 *                 Labor). Unset ⇒ 0 hrs + the item is pushed to `laborUnset` (fix-it).
 *   • markup:     misc_rates 'Lighting - Material Markup' (category 'Lighting'), a
 *                 fraction; missing ⇒ 0 (no hardcoded fallback).
 * Because the labor keys live in each item's calc_meta (DB), not in code, the DB-health
 * SQL is what proves coverage: every Lighting item's calc_meta.labor_rate resolves to a
 * priced labor_rates row, and the markup row exists.
 *
 * Run:  node scripts/lighting-rate-coverage.mjs
 */
import { readFileSync } from 'node:fs'
const calc = readFileSync('src/components/modules/lightingCalc.js', 'utf8')
const uniq = a => [...new Set(a)].filter(Boolean).sort()
const grab = re => uniq([...calc.matchAll(re)].map(m => m[1]))

const subcats = grab(/(?:fixture|transformer|wire):\s*'([^']+)'/g)
const miscNames = grab(/MATERIAL_MARKUP_NAME = '([^']+)'/g)

const show = (t, a) => { console.log(`\n${t} (${a.length})`); a.forEach(k => console.log(`  - ${k}`)) }
console.log('Lighting is catalog-driven: material + labor both resolve per-item from material_rates.')
show('material_rates sub_categories (category Lighting)', subcats)
show('misc_rates — material markup (category Lighting)', miscNames)
console.log('\nInstall labor is item-driven: hrs = qty × labor_rates[item.calc_meta.labor_rate]')
console.log('(Fixture / Transformer / Bistro / Wire Labor). Unset ⇒ 0 hrs + laborUnset flag —')
console.log('NO code fallback. DB-health SQL verifies every item\'s calc_meta.labor_rate is priced.')
