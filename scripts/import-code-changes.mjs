#!/usr/bin/env node
/**
 * Import git commit history into the `code_changes` table (Admin -> Code Changes).
 *
 * Idempotent: upserts on commit_hash, so re-running only adds new commits. Run it
 * whenever you want the table in sync — manually, from a git post-commit hook, or
 * in CI after a push:
 *
 *   node scripts/import-code-changes.mjs            # sync missing commits (fast)
 *   node scripts/import-code-changes.mjs --all      # re-upsert every commit
 *   node scripts/import-code-changes.mjs --stats    # also compute files-changed
 *   node scripts/import-code-changes.mjs --dry-run  # parse only, no DB write
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (from .env). The service role
 * is used because code_changes is written only server-side; reads are open to any
 * authenticated user via RLS.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const US = '\x1f' // unit separator between fields
const RS = '\x1e' // record separator between commits

// ── minimal .env loader (.env then .env.local overrides) ─────────────────────
function loadEnv() {
  const env = { ...process.env }
  for (const f of ['.env', '.env.local']) {
    try {
      for (const line of readFileSync(f, 'utf8').split('\n')) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
        if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
      }
    } catch {
      /* file may not exist */
    }
  }
  return env
}

// ── read commit metadata from git ────────────────────────────────────────────
function readCommits() {
  const fmt = ['%H', '%aI', '%an', '%s', '%b'].join(US) + RS
  const raw = execFileSync('git', ['log', '--no-merges', `--pretty=format:${fmt}`], {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  })
  const commits = []
  for (const rec of raw.split(RS)) {
    const r = rec.replace(/^\s+/, '')
    if (!r) continue
    const [hash, iso, author, subject, ...bodyParts] = r.split(US)
    if (!hash || !iso) continue
    commits.push({
      commit_hash: hash.trim(),
      committed_at: iso.trim(),
      author: (author || '').trim() || null,
      subject: (subject || '').trim() || '(no message)',
      body: (bodyParts.join(US) || '').trim() || null,
      files_changed: 0,
    })
  }
  return commits
}

// ── files-changed count per commit (best-effort via --shortstat) ─────────────
function readFileCounts() {
  const raw = execFileSync('git', ['log', '--no-merges', '--shortstat', '--pretty=format:%H'], {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  })
  const counts = {}
  let cur = null
  for (const line of raw.split('\n')) {
    const h = line.match(/^([0-9a-f]{40})$/)
    if (h) {
      cur = h[1]
      continue
    }
    const c = line.match(/(\d+) files? changed/)
    if (c && cur) counts[cur] = parseInt(c[1], 10)
  }
  return counts
}

async function main() {
  const args = new Set(process.argv.slice(2))
  const dryRun = args.has('--dry-run')
  const all = args.has('--all')
  const env = loadEnv()

  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!dryRun && (!url || !key)) {
    console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env')
    process.exit(1)
  }

  const commits = readCommits()
  // files-changed requires a slow --shortstat pass over all commits; opt in with
  // --stats. Without it, files_changed stays 0 (the subject/body is the record).
  if (args.has('--stats')) {
    const counts = readFileCounts()
    for (const c of commits) c.files_changed = counts[c.commit_hash] || 0
  }
  console.log(`Parsed ${commits.length} commits from git.`)

  if (dryRun) {
    for (const c of commits.slice(0, 5)) {
      console.log(`  ${c.committed_at.slice(0, 10)}  ${c.commit_hash.slice(0, 7)}  ${c.subject}`)
    }
    console.log('Dry run — nothing written.')
    return
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } })

  // Incremental by default: skip commits already stored (unless --all).
  let toWrite = commits
  if (!all) {
    const known = new Set()
    const pageSize = 1000
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from('code_changes')
        .select('commit_hash')
        .range(from, from + pageSize - 1)
      if (error) {
        console.error('Read error (does the table exist? run supabase-code-changes.sql):', error.message)
        process.exit(1)
      }
      if (!data || data.length === 0) break
      data.forEach(r => known.add(r.commit_hash))
      if (data.length < pageSize) break
    }
    toWrite = commits.filter(c => !known.has(c.commit_hash))
    console.log(`${known.size} already stored; ${toWrite.length} new to upsert.`)
  }

  let written = 0
  const chunk = 500
  for (let i = 0; i < toWrite.length; i += chunk) {
    const batch = toWrite.slice(i, i + chunk)
    const { error } = await supabase.from('code_changes').upsert(batch, { onConflict: 'commit_hash' })
    if (error) {
      console.error('Upsert error:', error.message)
      process.exit(1)
    }
    written += batch.length
    process.stdout.write(`\rUpserted ${written}/${toWrite.length}`)
  }
  console.log(`\nDone. ${written} row(s) written.`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
