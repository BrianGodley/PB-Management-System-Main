#!/usr/bin/env node
/**
 * Catalog-pricing guardrail.
 *
 * Invariant this protects: in a Vendor -> Type catalog picker, a MATERIAL item's
 * price AND description must resolve from the SELECTED catalog row (material +
 * material_price, keyed by sub_category + vendor; Standard = null-vendor). A
 * hardcoded constant / built-in *_TYPES / name-keyed map must NEVER win over the
 * catalog. (This is the class of bug that let Concrete's MIX_TYPES override the
 * catalog price in Aug 2026.)
 *
 * The script looks for the REGRESSION SIGNATURE of that bug — a material cost /
 * unit price being read with a hardcoded fallback that could beat the catalog:
 *
 *   matCost = ...   ?? <UPPER_CONST> / ?? R.<materialConst> / ?? *_TYPES[..].<price>
 *   const <x>Cost/<x>PerCY/<x>PerLF = <catalogRead> ?? <hardcodedMaterialConst>
 *
 * Labor rates and tunable coefficients legitimately keep `?? CONST` fallbacks and
 * are NOT flagged. Lines whose fallback is literally the selected catalog row's
 * unit cost (o.row.unit_cost / vrow.unit_cost) are the correct pattern and pass.
 *
 * FIXED-ENUM modules (Irrigation zone/timer, Planting plant sizes, Pool
 * spillway/coping/raised/equipment) are NOT Vendor->Type catalog pickers; they
 * are fixed functional lists that carry paired labor coefficients and
 * rate-editor-seeded material defaults. Their literal defaults are a separate
 * product decision (pending Brian's call), so they are listed under DEFERRED and
 * do not fail the gate.
 *
 * Run:  node scripts/audit-catalog-pricing.mjs   (exit 1 if a real regression is found)
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const MOD_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'components', 'modules')

// Known fixed-enum files whose hardcoded material defaults are an accepted,
// separately-tracked exception (not Vendor->Type catalog pickers).
const DEFERRED_FILES = new Set([
  'IrrigationModule.jsx',
  'IrrigationSummary.jsx',
  'PlantingModule.jsx',
  'PlantingSummary.jsx',
  'PoolModule.jsx', // spillway / coping / raised / equipment fixed enums
])

// LABOR / tunable-coefficient reads — allowed to keep `?? CONST`. Labor is read
// from the labor_rates map (lr[...]) or subcontractor map (sr[...]); coefficient
// vars carry these tokens in their name.
const LABOR_HINT =
  /\blr\[|\bsr\[|laborRates|\bhrs\b|Hrs|SFPer|PerHr|perDay|coeff|Coeff|divisor|Divisor|Sec\/Ft|LFPerHr|\.hrs\b|SFPerHr|Complexity|Burden|\bPH\b|_PH\b|Mins?PerCF|MINS?_PER|min\/cf|laborPer|LaborPer|Trench.*Rate|TrenchRate|SubTrench|Sub Trench|LF\/hr/
// Conversion / production COEFFICIENTS (not material $): LF/SF, SF/gal, roll width,
// bag/roll coverage, swell factor, capacity.
const COEFF_HINT =
  /LfPerSf|LF\/SF|SF\/gal|SFPerGal|PerSf|LfPer|Roll Width|RollWidth|_FT\b|Swell|Removal Swell|per Roll|perRoll|per Bag|SF per|Capacity|CY\)|swellFactor/i

// The fallback is the selected catalog row's unit cost — the CORRECT pattern.
const CATALOG_OK = /\.row\.unit_cost|\bvrow\b|n\(vrow|catalogItemFor|catalogOptions/

// Regression signature A: a Standard-map catalog read (mr[..] / materialPrices[..]
// / mp[..]) that falls back to a hardcoded constant which could beat the catalog.
// `?? 0` is a valid "unseeded = $0" fallback (the accepted convention), so a bare
// zero does NOT count — only a NON-zero literal or a named constant does.
const CATALOG_READ_HARDCODED =
  /\b(mr|materialPrices|mp)\[[^\]]+\]\s*\?\?\s*(R\.[A-Za-z]|[A-Z_][A-Za-z0-9_]{2,}\b|[1-9][\d.]*|0\.\d*[1-9])/
// Regression signature B: a material fallback baked into a resolver (matFallback,
// builtIn?.fallback) or a `?? BUILTIN[..].price` literal read.
const RESOLVER_HARDCODED =
  /\?\?\s*[A-Z_][A-Z0-9_]{2,}\[[^\]]*\]\??\.(mat|price|fallback|per|cost)|matFallback:\s*[\d.]|\bprice:\s*[\d.]/

const HARD_FALLBACK = line => CATALOG_READ_HARDCODED.test(line) || RESOLVER_HARDCODED.test(line)

let regressions = 0
const deferredHits = []
const files = readdirSync(MOD_DIR).filter(f => f.endsWith('.jsx') && !f.startsWith('.fuse'))

for (const file of files) {
  const lines = readFileSync(join(MOD_DIR, file), 'utf8').split('\n')
  const hits = []
  lines.forEach((line, i) => {
    const t = line.trim()
    if (t.startsWith('//') || t.startsWith('*')) return
    if (!HARD_FALLBACK(line)) return
    if (LABOR_HINT.test(line)) return // labor/coeff fallback — allowed
    if (COEFF_HINT.test(line)) return // conversion coefficient — allowed
    if (CATALOG_OK.test(line)) return // fallback is the catalog row — correct
    hits.push({ n: i + 1, line: t })
  })
  if (!hits.length) continue
  if (DEFERRED_FILES.has(file)) {
    deferredHits.push({ file, hits })
  } else {
    console.log(`\n${file}  ← REGRESSION: hardcoded material fallback in a catalog picker`)
    for (const h of hits) {
      regressions++
      console.log(`  ${h.n}: ${h.line}`)
    }
  }
}

if (deferredHits.length) {
  console.log('\n── DEFERRED (fixed-enum modules; literal defaults accepted, tracked separately) ──')
  for (const { file, hits } of deferredHits) console.log(`  ${file}: ${hits.length} literal default line(s)`)
}

console.log(
  regressions === 0
    ? '\nPASS — no hardcoded material fallback beats the catalog in any Vendor->Type picker.'
    : `\nFAIL — ${regressions} catalog picker(s) fall back to a hardcoded material price.`
)
process.exit(regressions > 0 ? 1 : 0)
