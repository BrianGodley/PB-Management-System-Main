#!/usr/bin/env node
/**
 * Mini Skid Steer Demo — consumed-rate manifest (checklist Goals 2 & 3 input). Static, no DB.
 *
 * Demo View Rates is DATA-DRIVEN: buildViewRates('Mini Skid Steer Demo') surfaces every
 * category='Demo' row from the DB, so "is this rate editable?" is a DATABASE question,
 * not a source-literal one. This script therefore just enumerates every rate the calc
 * CONSUMES, grouped by the table it must live in, so the DB-health SQL can verify:
 *   • coverage (Goal 2): every consumed key exists + is priced in the DB, and
 *   • orphan   (Goal 3): every category='Demo' DB row is in this consumed set.
 *
 * Run:  node scripts/mini-skid-rate-coverage.mjs
 */
import { readFileSync } from 'node:fs'

const calc = readFileSync('src/components/modules/miniSkidCalc.js', 'utf8')
const grab = re => [...new Set([...calc.matchAll(re)].map(m => m[1]))].sort()

const lr = grab(/\blr\['([^']+)'\]/g) // labor_rates / misc_rates (category Demo)
const sr = grab(/\bsr\['([^']+)'\]/g) // subcontractor_rates (category Demo)
const mp = grab(/\bmp\['([^']+)'\]/g) // material (+ material_price)

const show = (title, arr) => {
  console.log(`\n${title} (${arr.length})`)
  arr.forEach(k => console.log(`  - ${k}`))
}
console.log(`Mini Skid Steer Demo consumes ${lr.length + sr.length + mp.length} distinct rate keys.`)
show('labor_rates / misc_rates  (category Demo)', lr)
show('subcontractor_rates  (category Demo)', sr)
show('material (+ material_price)', mp)
console.log('\nVerify each exists + is priced with scripts/… DB-health SQL (mini-skid-db-health.sql).')
