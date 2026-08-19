#!/usr/bin/env node
/**
 * Rate-chain validator.
 *
 * Fails the build if the estimator's rate wiring has drifted out of sync:
 *   1. BROKEN POINTER  — a live material's calc_meta.labor_rate doesn't resolve
 *                        to a labor_rates row (exact case). This is the class
 *                        that caused $0 labor / crashes (e.g. Spillway - Tile
 *                        vs Spillway - TILE). Case-only misses are surfaced with
 *                        the intended row so the fix is obvious.
 *   2. DUPLICATE ROWS  — two labor_rates rows whose names collide case/spacing-
 *                        insensitively (e.g. Excavation - IH Bobcat 64 vs 64").
 *
 * Read-only. Uses the same Supabase creds as the app (VITE_SUPABASE_*).
 * Run:  node scripts/validate-rate-chain.mjs        (exit 1 on hard failures)
 *       node scripts/validate-rate-chain.mjs --warn (never exit non-zero)
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// --- minimal .env loader (no dep): .env.local overrides .env ---------------
function loadEnv() {
  const env = { ...process.env }
  for (const f of ['.env', '.env.local']) {
    const p = join(root, f)
    if (!existsSync(p)) continue
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
    }
  }
  return env
}
const env = loadEnv()
const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL
const key = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  // No DB creds (e.g. CI without the secrets configured) → skip, don't fail.
  // This is a convenience guardrail, not a gate; add the secrets to enable it.
  console.log('validate-rate-chain: skipped (no VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)')
  process.exit(0)
}
const supabase = createClient(url, key, { auth: { persistSession: false } })

// --- paged fetch (Supabase caps at 1000 rows/request) ----------------------
async function fetchAll(table, columns) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    rows.push(...data)
    if (data.length < 1000) break
  }
  return rows
}

const norm = s => (s || '').toLowerCase().replace(/\s+/g, ' ').replace(/["']/g, '').trim()

async function main() {
  const warnOnly = process.argv.includes('--warn')
  const labor = await fetchAll('labor_rates', 'name')
  const material = await fetchAll('material', 'id, description, calc_meta, archived_at')

  const laborExact = new Set(labor.map(r => r.name))
  const laborByNorm = new Map()
  for (const r of labor) if (!laborByNorm.has(norm(r.name))) laborByNorm.set(norm(r.name), r.name)

  // 1) broken pointers on live material
  const broken = []
  for (const m of material) {
    if (m.archived_at) continue
    const ptr = m.calc_meta && m.calc_meta.labor_rate
    if (!ptr) continue
    if (laborExact.has(ptr)) continue
    const near = laborByNorm.get(norm(ptr))
    broken.push({ desc: m.description, ptr, near: near || null })
  }

  // 2) duplicate labor rows (case/space/quote-insensitive collision)
  const seen = new Map()
  const dups = []
  for (const r of labor) {
    const k = norm(r.name)
    if (seen.has(k) && seen.get(k) !== r.name) dups.push([seen.get(k), r.name])
    else seen.set(k, r.name)
  }

  console.log(`\nRate-chain validation — ${material.length} material, ${labor.length} labor rows\n`)
  if (broken.length) {
    console.log(`BROKEN POINTERS (${broken.length}) — material.calc_meta.labor_rate with no labor row:`)
    for (const b of broken)
      console.log(`  • ${b.desc}: "${b.ptr}"` + (b.near ? `  → did you mean "${b.near}"? (case mismatch)` : `  (no match)`))
  } else console.log('BROKEN POINTERS: none ✓')

  if (dups.length) {
    console.log(`\nDUPLICATE LABOR ROWS (${dups.length}) — collide ignoring case/spacing/quotes:`)
    for (const [a, b] of dups) console.log(`  • "${a}"  ↔  "${b}"`)
  } else console.log('\nDUPLICATE LABOR ROWS: none ✓')

  const hardFail = broken.length > 0
  console.log('')
  if (hardFail && !warnOnly) {
    console.error('validate-rate-chain: FAILED (broken pointers). Fix the pointers or rename the labor rows.')
    process.exit(1)
  }
  console.log('validate-rate-chain: ' + (hardFail ? 'warnings only (--warn)' : 'passed ✓'))
}
main().catch(e => {
  console.error(e)
  // In advisory mode a runtime error (network/DB hiccup) shouldn't fail the run.
  process.exit(process.argv.includes('--warn') ? 0 : 2)
})
