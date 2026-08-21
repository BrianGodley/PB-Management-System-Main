#!/usr/bin/env node
/**
 * Steps — consumed-rate manifest (checklist Goals 2 & 3 input). Static, no DB.
 *
 * Steps consumes rates four ways (all hrs-per-unit / name-keyed, NO fallbacks):
 *   • paver/brick/tile/flag labor:  labor_rates['Steps - <Form>'] (hrs per Ln Ft;
 *                  STEP_FORMS). Unset → 0 hrs (no constant).
 *   • paver/brick/tile/flag material:  the picked catalog item's unit_cost, sourced
 *                  vendor-first from material_price for MAT_SECTIONS sub_categories
 *                  (Paver Material / Brick / Tile / Flagstone), else the Standard
 *                  (null-vendor) row. Unresolved → $0 (no hidden constant).
 *   • concrete labor:  labor_rates['Steps - Conc <BaseType> Hrs per Sq Ft'] +
 *                  ['Steps - Finish <Finish> Hrs per Sq Ft'], × ['Steps - Conc Form <Form>'].
 *   • concrete material:  material_rates['Steps - Conc <Type> $ per Sq Ft'] +
 *                  ['Steps - Finish <Finish> $ per Sq Ft'] (color affects material only).
 *   • sub (flat $/Ln Ft):  per-section base ('Steps - Sub <Mat> Base') + form/grouted/
 *                  type/finish modifiers — no labor hours.
 * DB-health SQL verifies every one of these is priced + flags orphans.
 *
 * Run:  node scripts/steps-rate-coverage.mjs
 */
import { readFileSync } from 'node:fs'
const calc = readFileSync('src/components/modules/stepsCalc.js', 'utf8')
const uniq = a => [...new Set(a)].filter(Boolean).sort()

// Pull the option arrays verbatim from the calc source so this manifest never drifts.
const arr = name => {
  const m = calc.match(new RegExp(`const ${name}\\s*=\\s*\\[([^\\]]*)\\]`))
  return m ? [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]) : []
}
const STEP_FORMS = arr('STEP_FORMS')
const CONC_TYPES = arr('CONC_TYPES')
const CONC_BASE_TYPES = arr('CONC_BASE_TYPES')
const CONC_FINISHES = arr('CONC_FINISHES')
// MAT_SECTIONS: catalog sub_categories + their sub base keys.
const matCats = [...calc.matchAll(/cat:\s*'([^']+)'/g)].map(m => m[1])
const subBaseKeys = [...calc.matchAll(/baseKey:\s*(?:'([^']+)'|(kSubPaverBase))/g)].map(m => m[1] || 'Steps - Sub Paver Base')

// Rate-key templates (mirror the calc's builders exactly).
const laborRates = uniq([
  ...STEP_FORMS.map(f => `Steps - ${f}`),                         // paver/brick/tile/flag labor (hrs/LnFt)
  ...CONC_BASE_TYPES.map(t => `Steps - Conc ${t} Hrs per Sq Ft`), // concrete type labor
  ...CONC_FINISHES.map(f => `Steps - Finish ${f} Hrs per Sq Ft`), // concrete finish labor
  ...STEP_FORMS.map(f => `Steps - Conc Form ${f}`),               // concrete form multiplier
])
const concMat = uniq([
  ...CONC_TYPES.map(t => `Steps - Conc ${t} $ per Sq Ft`),        // concrete type material (color included)
  ...CONC_FINISHES.map(f => `Steps - Finish ${f} $ per Sq Ft`),   // concrete finish material
])
const subRates = uniq([
  'Steps - Sub Conc Base',
  ...subBaseKeys,                                                 // per-section base $/LF
  ...STEP_FORMS.map(f => `Steps - Sub Form ${f}`),
  'Steps - Sub Grouted',
  ...CONC_TYPES.map(t => `Steps - Sub Type ${t}`),
  ...CONC_FINISHES.map(f => `Steps - Sub Finish ${f}`),
])
const catalogCats = uniq(matCats)

const show = (t, a) => { console.log(`\n${t} (${a.length})`); a.forEach(k => console.log(`  - ${k}`)) }
console.log(`Steps consumes ${laborRates.length} labor rates + ${concMat.length} concrete materials + ${subRates.length} sub $/LF rates across ${catalogCats.length} catalog sub_categories.`)
show('labor_rates — paver/brick/tile/flag form + concrete type/finish/form (category Steps)', laborRates)
show('material_rates — concrete type + finish $ per Sq Ft (category Steps)', concMat)
show('material_rates — subcontractor flat $ per Ln Ft (category Steps)', subRates)
show('material_price — In-House step material sub_categories (vendor-first → Standard; per-item)', catalogCats)
console.log('\nAll resolve live (labor/sub by name; step material vendor-first → Standard). Unset labor → 0 hrs;')
console.log('unresolved step material → $0 + surfaced in the module. NO constants. Verify with DB-health SQL.')
