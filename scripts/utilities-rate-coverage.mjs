#!/usr/bin/env node
/**
 * Utilities — consumed-rate manifest (checklist Goals 2 & 3 input). Static, no DB.
 *
 * Utilities is the CANONICAL trench source. It consumes rates three ways:
 *   • trench:   the shared lib/trench TRENCH_LABOR_RATE_NAME (Trench / Hand excavation)
 *   • name-key: materialPrices['Name'] (additional items material + labor)
 *   • catalog:  line/gas/wire/fixture/sewer MATERIAL + labor come from the catalog
 *               (Utilities sub-cats) via resolveUtilRow, keyed by the built-in type maps'
 *               dbName / laborDbName — enumerated below.
 * DB-health SQL then verifies coverage (every consumed key exists + priced) + orphans.
 *
 * Run:  node scripts/utilities-rate-coverage.mjs
 */
import { readFileSync } from 'node:fs'
const calc = readFileSync('src/components/modules/utilitiesCalc.js', 'utf8')
const uniq = arr => [...new Set(arr)].filter(k => k && !k.includes('...')).sort()
const grab = re => uniq([...calc.matchAll(re)].map(m => m[1]))

// Trench excavation is the only DIRECT name-keyed labor the calc consumes (the shared
// King rates). Everything else — line / gas pipe / wire / gas fixture / elec fixture /
// sewer — resolves its MATERIAL price and per-unit LABOR from the Utilities catalog
// sub-categories via resolveUtilRow (labor rides each item's calc_meta.labor_rate),
// plus per-item additional-item rates. Those are a catalog-completeness question, not a
// fixed name list, so we enumerate the built-in TYPE LABELS (the pickers' rows) instead
// of trying to parse the inch-mark-quoted dbNames.
const trench = uniq(['Utilities Trench Excavation', 'Utilities Hand Excavation'])
// Built-in type labels: the map KEYS, e.g. `'1-1/2" Poly Gas Pipe': { … }`.
const typeLabels = grab(/^\s*'([^']*(?:Gas|Pipe|Conduit|Electric|GFCI|Ring|Bar|Valve|Sub-panel|Disconnect|Receptacle|Sewer|Wire|Cover)[^']*)':\s*\{/gm)

const show = (t, a) => { console.log(`\n${t} (${a.length})`); a.forEach(k => console.log(`  - ${k}`)) }
console.log(`Utilities: ${trench.length} direct trench rate(s) + ${typeLabels.length} catalog TYPE rows (material + calc_meta labor).`)
show('labor_rates — TRENCH (shared King, category Utilities)', trench)
show('catalog TYPE rows (Utilities sub-cats; material + per-item calc_meta labor)', typeLabels)
console.log('\nEach catalog TYPE resolves its MATERIAL from the Utilities sub-category record and its')
console.log('LABOR from that record’s calc_meta.labor_rate. Verify all exist + priced with the DB-health SQL.')
