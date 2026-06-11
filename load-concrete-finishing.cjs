#!/usr/bin/env node
/*
 * Bulk-loads the curated concrete-finishing VIDEOS (YouTube links) and
 * DOCUMENTS (article/PDF links) into the Training libraries under the
 * "Concrete Finishing" category.
 *
 * Run from the repo root:   node load-concrete-finishing.cjs
 * Requires .env with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (already present).
 * Idempotent — skips any item whose title already exists in the category.
 *
 * Note: rows insert via the service-role key (bypasses RLS). For staff to SEE
 * them in the app, run supabase-lms-rls-fix.sql first (adds the read policy).
 */
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const CATEGORY = 'Concrete Finishing'

const VIDEOS = [
  ['How to Bull Float and Edge Concrete', 'https://www.youtube.com/watch?v=7-ywC9gA-G4', 'Bull floating then edging fresh flatwork.'],
  ['How to Finish Concrete with a Bull Float', 'https://www.youtube.com/watch?v=XekTgFFojqA', 'Using the bull float to flatten and smooth.'],
  ['When to Finish Concrete After the Pour (Float vs Trowel)', 'https://www.youtube.com/watch?v=n927TQBJy28', 'Reading bleed water and timing each step.'],
  ['Mag Float & Steel Trowel Concrete Edges', 'https://www.youtube.com/watch?v=4td36zwdRyU', 'Floating and troweling clean edges.'],
  ['Concrete Float Types Explained', 'https://www.youtube.com/watch?v=xpQM9DshibY', 'Bull/mag/fresno floats and when to use each.'],
  ['Pour & Finish for Exposed Aggregate (Full Process)', 'https://www.youtube.com/watch?v=zBNmAUYrbQ4', 'Screed → float → trowel → exposed-aggregate finish.'],
  ['Tips on Finishing Exposed Concrete', 'https://www.youtube.com/watch?v=AwX3Lwno7Ug', 'Exposing aggregate with retarder / wash technique.'],
  ['Machine Trowel on Exposed Concrete', 'https://www.youtube.com/watch?v=FZA2IxqKy1I', 'Power-troweling technique.'],
  ['The RIGHT Way to Broom Finish Concrete', 'https://m.youtube.com/shorts/XXi8PJgZdQ4', 'Quick broom-finish demonstration.'],
  ['Mike Day Concrete — Finishing Channel', 'https://www.youtube.com/c/MikeDayConcrete/videos', 'Deep library of pro concrete-finishing how-tos.'],
]

const DOCS = [
  ['CIP 14 — Finishing Concrete Flatwork (NRMCA)', 'https://www.nrmca.org/wp-content/uploads/2021/01/14pr.pdf', 'What finishing is and the correct sequence.'],
  ['Industry Recommendation for Exterior Concrete Flatwork (Ohio Concrete)', 'https://www.ohioconcrete.org/wp-content/uploads/2015/06/Industry-Recommendation-for-Exterior-Flatwork-Final.pdf', 'Exterior flatwork placement/finishing/curing standards.'],
  ['Residential Exterior Concrete Guidelines (Platte River)', 'https://platteriverconcrete.com/wp-content/uploads/2020/07/PRCC-Residential-Guidelines.pdf', 'Homeowner/crew-facing exterior concrete guidelines.'],
  ['Placing & Finishing Concrete — Chapter 11', 'https://scetcivil.weebly.com/uploads/5/3/9/5/5395830/compaction_and_curing_concrete.pdf', 'Placing, compaction, finishing and curing fundamentals.'],
  ['ACI 308R-16 — Guide to External Curing of Concrete (preview)', 'https://www.concrete.org/portals/0/files/pdf/previews/308r_16_preview.pdf', 'Curing methods and timing.'],
  ['How to Finish Concrete — 6 Steps (Concrete Network)', 'https://www.concretenetwork.com/concrete/concrete_tools/overview.htm', 'Step-by-step finishing overview.'],
  ['Broom Finish — When & How (Concrete Network)', 'https://www.concretenetwork.com/slip-resistant-coatings/broom-finish.html', 'Producing a slip-resistant broom finish.'],
  ['How to Expose Aggregate — 3 Ways (Concrete Network)', 'https://www.concretenetwork.com/concrete/exposedaggregate/how_to_expose.html', 'Methods for exposing aggregate.'],
  ['9 Expert Tips for Exposed Aggregate (Brickform)', 'https://www.brickform.com/blog/9-expert-tips-for-mastering-exposed-aggregate-finishes/', 'Pro tips for exposed-aggregate consistency.'],
  ['Avoid Surface Defects on Exterior Slabs (For Construction Pros)', 'https://www.forconstructionpros.com/concrete/equipment-products/power-trowels/article/10257543/twining-inc-avoid-surface-defects-on-exterior-slabs', 'Preventing scaling, dusting, crazing.'],
  ['Top-Cast Surface Retarder (Dayton Superior)', 'https://www.daytonsuperior.com/products/chemicals?name=TOPCAST', 'Product + how-to for the TopCast exposed-aggregate finish used on the La Cañada bid.'],
]

function loadEnv() {
  const env = {}
  for (const l of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n')) {
    const i = l.indexOf('='); if (i < 0) continue
    env[l.slice(0, i).trim()] = l.slice(i + 1).trim()
  }
  return env
}

;(async () => {
  const env = loadEnv()
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env'); process.exit(1)
  }
  const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  // 1) Ensure the category exists
  const { error: catErr } = await sb.from('lms_categories').upsert({ name: CATEGORY, sort_order: 50 }, { onConflict: 'name' })
  if (catErr) { console.error('Could not ensure category:', catErr.message); process.exit(1) }
  console.log(`Category ready: ${CATEGORY}`)

  // 2) Videos → lms_videos (YouTube/link entries: video_url set, no file_name)
  const { data: existV } = await sb.from('lms_videos').select('title').eq('category', CATEGORY)
  const haveV = new Set((existV || []).map(v => v.title.toLowerCase()))
  let vOk = 0, vSkip = 0
  for (const [title, url, desc] of VIDEOS) {
    if (haveV.has(title.toLowerCase())) { vSkip++; continue }
    const { error } = await sb.from('lms_videos').insert({ title, description: desc, category: CATEGORY, video_url: url })
    if (error) { console.error(`  ✗ video "${title}": ${error.message}`) } else { vOk++; console.log(`  ✓ video: ${title}`) }
  }

  // 3) Documents → lms_read_items (link entries: doc_url set, no uploaded file)
  const { data: existD } = await sb.from('lms_read_items').select('title').eq('category', CATEGORY)
  const haveD = new Set((existD || []).map(d => d.title.toLowerCase()))
  let dOk = 0, dSkip = 0
  for (const [title, url, desc] of DOCS) {
    if (haveD.has(title.toLowerCase())) { dSkip++; continue }
    const { error } = await sb.from('lms_read_items').insert({ title, description: desc, category: CATEGORY, doc_url: url, mime_type: 'link' })
    if (error) { console.error(`  ✗ doc "${title}": ${error.message}`) } else { dOk++; console.log(`  ✓ doc: ${title}`) }
  }

  console.log(`\nDone. Videos: ${vOk} added, ${vSkip} skipped. Documents: ${dOk} added, ${dSkip} skipped.`)
})()
