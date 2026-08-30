#!/usr/bin/env node
/**
 * Pre-commit guard for a production schema dump.
 *
 * `supabase db dump` is schema-only and excludes the vault schema, so it should
 * contain no credentials — but function bodies, DEFAULTs, ALTER DATABASE ... SET
 * and COMMENTs are all dumped verbatim, and those are exactly where an API key
 * or a connection string gets hardcoded. Run this before committing the dump so
 * production secrets never enter git history.
 *
 * Run:  node scripts/scan-dump-secrets.mjs supabase/migrations/<file>.sql
 * Exit: 0 clean, 1 findings.
 */
import { readFileSync, existsSync } from 'node:fs'

const file = process.argv[2]
if (!file) {
  console.error('usage: node scripts/scan-dump-secrets.mjs <dump.sql>')
  process.exit(2)
}
if (!existsSync(file)) {
  console.error(`no such file: ${file}`)
  process.exit(2)
}

const PATTERNS = [
  [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./g, 'JWT (supabase anon/service_role legacy key)'],
  [/sb_secret_[A-Za-z0-9_-]{10,}/g, 'Supabase secret key'],
  [/sb_publishable_[A-Za-z0-9_-]{10,}/g, 'Supabase publishable key'],
  [/service_role_key|SUPABASE_SERVICE_ROLE/gi, 'service_role reference'],
  [/postgres(?:ql)?:\/\/[^\s'"]*:[^\s'":@]+@/gi, 'Postgres connection string with password'],
  [/https:\/\/[a-z]{20}\.supabase\.co/g, 'hardcoded Supabase project URL'],
  [/\bAKIA[0-9A-Z]{16}\b/g, 'AWS access key id'],
  [/\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]{10,}/g, 'Stripe-style API key'],
  [/\bghp_[A-Za-z0-9]{20,}/g, 'GitHub token'],
  [/\bxox[baprs]-[A-Za-z0-9-]{10,}/g, 'Slack token'],
  [/\bBearer\s+[A-Za-z0-9._-]{20,}/g, 'hardcoded bearer token'],
  [/(?:api[_-]?key|apikey|secret|token|passwd|password)\s*(?:=|:=|=>|:)\s*'[^']{8,}'/gi, 'inline secret assignment'],
  [/ALTER\s+DATABASE\s+\S+\s+SET\s+["']?app\./gi, 'ALTER DATABASE ... SET app.* (may carry a secret GUC)'],
]

// A dump legitimately mentions these words in identifiers; only flag a line when
// it carries an actual value, so the guard stays worth reading.
const IDENTIFIER_ONLY = /^\s*(--|CREATE (TABLE|INDEX|TRIGGER|POLICY)|ALTER TABLE|COMMENT ON (COLUMN|TABLE)|\s*"?[a-z_]+"? (text|uuid|jsonb|boolean|timestamp))/i

const lines = readFileSync(file, 'utf8').split('\n')
const findings = []

lines.forEach((line, i) => {
  for (const [re, label] of PATTERNS) {
    re.lastIndex = 0
    const m = re.exec(line)
    if (!m) continue
    if (label === 'service_role reference' && IDENTIFIER_ONLY.test(line)) continue
    findings.push({
      line: i + 1,
      label,
      excerpt: line.trim().slice(0, 160),
      match: m[0].slice(0, 24),
    })
  }
})

console.log(`\nscanned ${file} — ${lines.length} lines\n`)

if (!findings.length) {
  console.log('  CLEAN — no credential-shaped strings found. Safe to commit.\n')
  process.exit(0)
}

console.log(`  ${findings.length} POTENTIAL SECRET(S) — review each before committing:\n`)
for (const f of findings) {
  console.log(`  ${file}:${f.line}  [${f.label}]`)
  console.log(`      matched: ${f.match}…`)
  console.log(`      line:    ${f.excerpt}\n`)
}
console.log('  Redact these (or drop the object from the dump) before `git add`.\n')
process.exit(1)
