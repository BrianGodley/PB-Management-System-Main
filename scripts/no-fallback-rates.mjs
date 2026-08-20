#!/usr/bin/env node
/**
 * No-fallback rate guardrail (CLAUDE.md: "unset → modal, no fallback").
 *
 * Protects the rule that an unset/zero LABOR rate, material price, or coefficient
 * must surface the unpriced fix-it modal — never silently resolve to an inherited
 * "nearest type" value or a hardcoded constant. This is the class of bug that kept
 * recurring in Fire Pit caps/finishes (Aug 2026): a `capTypeLabor()` /
 * `finishTypeLabor()` helper inferred a labor rate from the type NAME so a
 * vendor/catalog item never prompted.
 *
 * Material-price fallbacks are covered separately by audit-catalog-pricing.mjs.
 * THIS script targets the two signatures that script intentionally allows:
 *
 *   A. Nearest-type INHERITANCE HELPERS — a fn that maps a type label to a rate:
 *        const capTypeLabor  = typeLabel => ...
 *        function finishTypeRate(t) { ... }
 *      Any identifier matching  <word>Type(Labor|Rate|Price|Coef|Unit)  used as a
 *      resolver is the banned pattern. (Legit code keys rates by the DB name, not
 *      by re-deriving them from the picked type.)
 *
 *   B. A ".fallback" numeric field baked into a rate table entry and read via
 *      `?? X.fallback` — the old FP_RATES[..].fallback constants we retired.
 *
 * Run:  node scripts/no-fallback-rates.mjs   (exit 1 if a banned pattern is found)
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')

// A. Nearest-type inheritance helper — DEFINITION named  *TypeLabor / *TypeCoef.
// (Narrow on purpose: `baseTypePrice`-style exact-name catalog resolvers that match
// `r.name === type` and return 0 when unpriced are the CORRECT pattern and are not
// flagged. Only Labor/Coeff helpers, which re-derive a RATE from the label, match.)
const TYPE_INHERIT_NAME = /\b(?:const|let|var|function)\s+\w*Type(?:Labor|Coeff?)\b/
// B. Behavioral tell of ANY nearest-type fallback, whatever the fn is called: a
// lowercased label sniffed with `.includes('literal')` in a ternary that resolves
// to a rate-key STRING (…Lab / …Labor / …Rate / …Coeff). Legit resolvers key off
// `r.name === type`, never `.includes()` keyword matching.
const KEYWORD_TO_RATEKEY =
  /\.includes\(\s*['"][^'"]+['"]\s*\)\s*\?[^?:]*['"][A-Za-z0-9 ]*(?:Lab|Labor|Rate|Coeff?)['"]/
// C. A rate-entry `.fallback` constant read as a `?? …fallback` default.
const FALLBACK_FIELD = /\?\?\s*[A-Za-z_$][\w$]*(?:\[[^\]]*\])?\.fallback\b/

const BANNED = [
  { re: TYPE_INHERIT_NAME, why: 'nearest-type labor/coeff inheritance helper (unset → modal, no fallback)' },
  { re: KEYWORD_TO_RATEKEY, why: 'label .includes() → rate-key fallback (unset → modal, no fallback)' },
  { re: FALLBACK_FIELD, why: 'hardcoded `.fallback` rate constant (unset → modal, no fallback)' },
]

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (/\.(js|jsx)$/.test(name) && !name.startsWith('.fuse')) out.push(p)
  }
  return out
}

let violations = 0
for (const file of walk(SRC)) {
  const lines = readFileSync(file, 'utf8').split('\n')
  lines.forEach((line, i) => {
    const t = line.trim()
    if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return // skip comments
    for (const { re, why } of BANNED) {
      if (re.test(line)) {
        violations++
        const rel = file.slice(file.indexOf('src'))
        console.log(`\n${rel}:${i + 1}  ← ${why}`)
        console.log(`  ${t}`)
      }
    }
  })
}

console.log(
  violations === 0
    ? '\nPASS — no nearest-type inheritance or hardcoded rate fallback found.'
    : `\nFAIL — ${violations} banned fallback pattern(s). Route unset rates to the unpriced modal instead.`
)
process.exit(violations > 0 ? 1 : 0)
