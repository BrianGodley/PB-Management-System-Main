#!/usr/bin/env node
/**
 * Concrete — consumed-rate manifest (checklist Goals 2 & 3 input). Static, no DB.
 *
 * Concrete's View Rates is data-driven (category 'Concrete' + shared Basic Materials/
 * sub rows). This enumerates every rate the pure calc CONSUMES so the DB-health SQL can
 * verify coverage (every consumed key exists + priced) and orphans (every category
 * 'Concrete' DB row is consumed). Concrete resolves rates two ways:
 *   • R.mat('Name', …) / R.labor('Name', …) / R.sub('Name', …)  — the makeModuleRates reader
 *   • direct  lr['Name'] / mr['Name'] / sr['Name']              — legacy name reads
 * Both patterns are captured below.
 *
 * Run:  node scripts/concrete-rate-coverage.mjs
 */
import { readFileSync } from 'node:fs'

const calc = readFileSync('src/components/modules/concreteCalc.js', 'utf8')
// Drop placeholder fragments that leak from comment strings (e.g. 'Concrete - Base ...').
const uniq = arr => [...new Set(arr)].filter(k => !k.includes('...')).sort()
const grab = re => uniq([...calc.matchAll(re)].map(m => m[1]))

// makeModuleRates reader calls
const rMat = grab(/\bR\.mat\(\s*['"]([^'"]+)['"]/g)
const rLab = grab(/\bR\.labor\(\s*['"]([^'"]+)['"]/g)
const rSub = grab(/\bR\.sub\(\s*['"]([^'"]+)['"]/g)
// direct name reads (base-method labor is lr[BASE_METHOD_LABOR_NAME[...]] — a dynamic
// lookup, so the literal rate names live in BASE_METHOD_LABOR_NAME / INSTALL_TIERS below)
const lrLit = grab(/\blr\[\s*['"]([^'"]+)['"]/g)
const mrLit = grab(/\bmr\[\s*['"]([^'"]+)['"]/g)
const srLit = grab(/\bsr\[\s*['"]([^'"]+)['"]/g)
// rate names embedded in the dynamic maps (dropdown-driven)
const mapNames = grab(/rateName:\s*['"]([^'"]+)['"]/g)
const baseLabor = grab(/['"](Concrete - Base [^'"]+)['"]/g)

const labor = uniq([...rLab, ...lrLit, ...mapNames, ...baseLabor])
const material = uniq([...rMat, ...mrLit])
const sub = uniq([...rSub, ...srLit])

const show = (title, arr) => {
  console.log(`\n${title} (${arr.length})`)
  arr.forEach(k => console.log(`  - ${k}`))
}
console.log(`Concrete consumes ${labor.length + material.length + sub.length} distinct rate keys.`)
show('labor_rates  (category Concrete)', labor)
show('material (+ material_price)', material)
show('subcontractor_rates  (category Concrete)', sub)
console.log('\nNote: base-method labor is a dynamic lr[BASE_METHOD_LABOR_NAME[method]] read;')
console.log('the literal names (Concrete - Base Skid Steer / Mini Skid Steer / Wheelbarrow) are captured above.')
console.log('Verify each exists + is priced with the Concrete DB-health SQL.')
