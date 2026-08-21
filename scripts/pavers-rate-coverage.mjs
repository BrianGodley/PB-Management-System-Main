#!/usr/bin/env node
/**
 * Pavers — consumed-rate manifest (checklist Goals 2 & 3 input). Static, no DB.
 *
 * Paver View Rates is data-driven (category 'Paver' labor/misc + shared Paver Material /
 * Base Material catalog). This enumerates every rate the pure calc CONSUMES so the
 * DB-health SQL can verify coverage (every consumed key exists + priced) and orphans
 * (every category 'Paver' DB row is consumed). Paver reads rates by NAME:
 *   • lr['Name']  — labor_rates (category Paver)
 *   • mr['Name']  — misc/material rates
 * (paver + base MATERIAL prices come from the catalog via paverItemFor, not a name key.)
 *
 * Run:  node scripts/pavers-rate-coverage.mjs
 */
import { readFileSync } from 'node:fs'
const calc = readFileSync('src/components/modules/paverCalc.js', 'utf8')
const grab = re => [...new Set([...calc.matchAll(re)].map(m => m[1]))].filter(k => !k.includes('...')).sort()
const lr = grab(/\blr\[\s*['"]([^'"]+)['"]/g)
const mr = grab(/\bmr\[\s*['"]([^'"]+)['"]/g)
const show = (t, a) => { console.log(`\n${t} (${a.length})`); a.forEach(k => console.log(`  - ${k}`)) }
console.log(`Pavers consumes ${lr.length + mr.length} distinct name-keyed rates (+ catalog Paver/Base Material via paverItemFor).`)
show('labor_rates  (category Paver)', lr)
show('misc / material rates (name-keyed)', mr)
console.log('\nPaver + Base MATERIAL prices resolve from the catalog (Paver Material / Base Material sub-cats).')
console.log('Verify each name key exists + is priced with the Pavers DB-health SQL.')
