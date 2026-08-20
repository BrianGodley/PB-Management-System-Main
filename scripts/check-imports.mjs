#!/usr/bin/env node
/**
 * Build guard — fail if any src file imports a RELATIVE path that doesn't resolve
 * to a real, GIT-TRACKED file. Catches the class of bug where a file is created +
 * imported locally but never `git add`ed, so it parses/tests fine here but the
 * Vercel build (which builds from git) errors: "Could not resolve './foo'".
 *
 * Runs in prebuild alongside no-fallback-rates. On Vercel everything is tracked
 * (git checkout), so it's a no-op there; locally it blocks the bad push.
 *
 * Run:  node scripts/check-imports.mjs
 */
import { readFileSync, existsSync, statSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { dirname, resolve, relative } from 'node:path'

// All git-tracked paths (repo-relative, forward slashes) as a fast lookup set.
// If git is unavailable (e.g. a CI container without it), degrade gracefully:
// skip the tracked check but still flag imports that resolve to NO file.
let tracked = null
let files = []
try {
  tracked = new Set(execSync('git ls-files', { encoding: 'utf8' }).split('\n').map(s => s.trim()).filter(Boolean))
  files = execSync('git ls-files src; git ls-files --others --exclude-standard src', { encoding: 'utf8' })
    .split('\n')
    .map(s => s.trim())
    .filter(f => /\.(jsx?|mjs)$/.test(f) && existsSync(f))
} catch {
  // No git: fall back to a filesystem walk of src.
  const walk = d =>
    execSync(`find ${d} -type f \\( -name '*.js' -o -name '*.jsx' -o -name '*.mjs' \\)`, { encoding: 'utf8' })
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
  try {
    files = walk('src')
  } catch {
    console.log('SKIP — cannot enumerate src files (no git, no find).')
    process.exit(0)
  }
}

const EXTS = ['', '.js', '.jsx', '.mjs', '.ts', '.tsx', '.json', '/index.js', '/index.jsx', '/index.ts']
const isFile = p => existsSync(p) && statSync(p).isFile()
const importRe = /(?:import|export)\s[^'"]*?from\s*['"](\.[^'"]+)['"]|import\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g

// Strip block + line comments so example/dynamic imports in docs don't false-flag
// (e.g. `() => import('./hooks/...')`). Not preceded by ':' avoids URLs (https://).
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

const problems = []
for (const f of files) {
  const src = stripComments(readFileSync(f, 'utf8'))
  for (const m of src.matchAll(importRe)) {
    const spec = m[1] || m[2]
    if (!spec) continue
    const absNoExt = resolve(dirname(f), spec)
    let hit = null
    for (const ext of EXTS) {
      if (isFile(absNoExt + ext)) {
        hit = relative('.', absNoExt + ext).split('\\').join('/')
        break
      }
    }
    if (!hit) problems.push(`${f}: import "${spec}" resolves to NO file on disk`)
    else if (tracked && !tracked.has(hit)) problems.push(`${f}: import "${spec}" → ${hit} exists but is NOT git-tracked (git add it)`)
  }
}

if (problems.length) {
  console.error(`\nFAIL — ${problems.length} unresolved/untracked relative import(s):`)
  problems.forEach(p => console.error(`  ✗ ${p}`))
  console.error('\nCommit the missing file(s) or fix the path before pushing (this is what broke the Vercel build).')
  process.exit(1)
}
console.log('PASS — every relative import in src resolves to a git-tracked file.')
