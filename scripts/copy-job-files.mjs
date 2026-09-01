#!/usr/bin/env node
/**
 * Copy objects from production's `job-files` bucket into staging's.
 *
 * Reads a list produced beforehand (name + size) and streams each object
 * prod -> here -> staging. Production is only ever READ from.
 *
 * Resumable: staging is listed first and anything already present is skipped,
 * so re-running after an interruption picks up where it stopped.
 *
 * Keys come from the environment and are never written to disk:
 *   PROD_KEY     service_role key for the production project
 *   STAGING_KEY  service_role key for pbs-staging
 *   LIST         path to the JSON list  [{name, size}, ...]
 *
 * Run:  PROD_KEY=... STAGING_KEY=... LIST=/path/list.json node scripts/copy-job-files.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const PROD = 'jjlnpywpmoukgwmwczbz'
const STG = 'fgyexksqinjczebtsuon'
const BUCKET = 'job-files'
const CONCURRENCY = Number(process.env.CONCURRENCY || 6)

const prodKey = process.env.PROD_KEY
const stgKey = process.env.STAGING_KEY
const listPath = process.env.LIST
if (!prodKey || !stgKey || !listPath) {
  console.error('need PROD_KEY, STAGING_KEY and LIST')
  process.exit(2)
}

const url = (ref, path) => `https://${ref}.supabase.co/storage/v1/object/${path}`
const files = JSON.parse(readFileSync(listPath, 'utf8'))
const donePath = listPath.replace(/\.json$/, '-done.json')
const done = new Set(existsSync(donePath) ? JSON.parse(readFileSync(donePath, 'utf8')) : [])

console.log(`${files.length} files to copy; ${done.size} already done`)

let ok = done.size, failed = 0, bytes = 0
const errors = []
const started = Date.now()

const sleep = ms => new Promise(r => setTimeout(r, ms))

// Storage rate-limits under load and answers 429. Retry with exponential
// backoff rather than dropping the file — a 429 means "later", not "no".
async function fetchRetry(u, opts, label) {
  let wait = 500
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(u, opts)
    if (res.status !== 429) return res
    await sleep(wait + Math.random() * 250)   // jitter so workers don't resync
    wait *= 2
  }
  throw new Error(`${label} 429 after 6 retries`)
}

async function copyOne(f) {
  if (done.has(f.name)) return
  // Read from production (GET only — nothing is ever written there).
  const get = await fetchRetry(url(PROD, `${BUCKET}/${encodeURI(f.name)}`), {
    headers: { Authorization: `Bearer ${prodKey}` },
  }, 'download')
  if (!get.ok) throw new Error(`download ${get.status}`)
  const body = Buffer.from(await get.arrayBuffer())

  const put = await fetchRetry(url(STG, `${BUCKET}/${encodeURI(f.name)}`), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stgKey}`,
      'Content-Type': get.headers.get('content-type') || 'application/octet-stream',
      'x-upsert': 'true',
    },
    body,
  }, 'upload')
  // 409 = already there; treat as success so reruns converge.
  if (!put.ok && put.status !== 409) throw new Error(`upload ${put.status}`)

  done.add(f.name)
  ok++
  bytes += body.length
}

// Fixed-size worker pool over a shared cursor.
let cursor = 0
async function worker() {
  while (cursor < files.length) {
    const f = files[cursor++]
    try {
      await copyOne(f)
    } catch (e) {
      failed++
      if (errors.length < 20) errors.push(`${f.name}: ${e.message}`)
    }
    if (ok % 250 === 0 && ok) {
      const mins = (Date.now() - started) / 60000
      console.log(`  ${ok}/${files.length} copied · ${(bytes / 1048576).toFixed(0)} MB · ${mins.toFixed(1)} min · ${failed} failed`)
      writeFileSync(donePath, JSON.stringify([...done]))
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker))
writeFileSync(donePath, JSON.stringify([...done]))

console.log(`\nDONE: ${ok} copied, ${failed} failed, ${(bytes / 1048576).toFixed(0)} MB in ${((Date.now() - started) / 60000).toFixed(1)} min`)
if (errors.length) {
  console.log('First failures:')
  errors.forEach(e => console.log('  ' + e))
}
