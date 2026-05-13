// supabase/functions/assign-supervisors/index.ts
//
// Cluster geocoded open jobs across supervisors with equal-job-count balancing.
// No Google API calls — pure haversine + k-means runs cheaply on the edge.
//
// Body (all optional):
//   {
//     supervisor_employee_ids?: string[],   // override; default = all active employees with job_title ILIKE '%supervisor%'
//     job_ids?: string[],                   // override; default = all open (active/on_hold) geocoded jobs
//     stage_ids?: string[],                 // when set, only include jobs whose stage_id is in this list.
//                                           //   Pass the literal string "__none__" inside the list to also include
//                                           //   jobs with stage_id IS NULL (Unassigned).
//   }
//
// Response:
//   {
//     ok: true,
//     supervisors: [
//       { id, name, job_title, jobs: [{ id, name, client_name, lat, lon }] }
//     ],
//     unassigned: [...]   // jobs that couldn't be placed (shouldn't happen in normal use)
//   }
//
// Auth: requires Bearer token. Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

// ── Geo helpers ────────────────────────────────────────────────────────────
type Pt = { lat: number; lon: number }

// Haversine distance between two lat/lon points, in km.
function haversine(a: Pt, b: Pt): number {
  const R = 6371
  const toRad = (deg: number) => deg * Math.PI / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat), lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// Mean of a list of points (for re-centering clusters)
function mean(points: Pt[]): Pt {
  if (points.length === 0) return { lat: 0, lon: 0 }
  const sum = points.reduce((s, p) => ({ lat: s.lat + p.lat, lon: s.lon + p.lon }), { lat: 0, lon: 0 })
  return { lat: sum.lat / points.length, lon: sum.lon / points.length }
}

// ── K-means++ seeding ─────────────────────────────────────────────────────
// Picks initial centers that are spread out, much better than random for
// converging fast.
function seedCenters(jobs: Pt[], k: number): Pt[] {
  if (jobs.length === 0 || k <= 0) return []
  const centers: Pt[] = []
  // First center: pick a random job
  centers.push(jobs[Math.floor(Math.random() * jobs.length)])
  while (centers.length < k) {
    // For each job, distance to nearest existing center, squared
    const dists = jobs.map(j => {
      let min = Infinity
      for (const c of centers) min = Math.min(min, haversine(j, c) ** 2)
      return min
    })
    const total = dists.reduce((a, b) => a + b, 0)
    if (total === 0) {
      // All remaining jobs are at existing centers; just pick the next one
      centers.push(jobs[centers.length % jobs.length])
      continue
    }
    // Weighted random pick proportional to dist²
    let r = Math.random() * total
    for (let i = 0; i < jobs.length; i++) {
      r -= dists[i]
      if (r <= 0) { centers.push(jobs[i]); break }
    }
  }
  return centers
}

// ── Plain k-means (unbalanced) ────────────────────────────────────────────
function kmeans(jobs: Pt[], k: number, maxIter = 30): number[] {
  const N = jobs.length
  if (N === 0 || k <= 0) return []
  let centers = seedCenters(jobs, k)
  let assignments = new Array(N).fill(0)

  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false
    // Assign each job to nearest center
    for (let i = 0; i < N; i++) {
      let bestC = 0, bestD = Infinity
      for (let c = 0; c < k; c++) {
        const d = haversine(jobs[i], centers[c])
        if (d < bestD) { bestD = d; bestC = c }
      }
      if (assignments[i] !== bestC) { assignments[i] = bestC; changed = true }
    }
    // Re-center
    const newCenters: Pt[] = []
    for (let c = 0; c < k; c++) {
      const cluster = jobs.filter((_, i) => assignments[i] === c)
      newCenters.push(cluster.length > 0 ? mean(cluster) : centers[c])
    }
    centers = newCenters
    if (!changed) break
  }
  return assignments
}

// ── Balance cluster sizes via swaps ───────────────────────────────────────
// After plain k-means we may have wildly different cluster sizes. We move
// the "least-cost-to-relocate" jobs from oversized clusters to undersized
// ones until everyone is within ±1 of the target size.
function balance(jobs: Pt[], assignments: number[], k: number): number[] {
  const N = jobs.length
  const target = Math.ceil(N / k)
  const minTarget = Math.floor(N / k)

  // Recompute current centers
  const computeCenters = () => {
    const out: Pt[] = []
    for (let c = 0; c < k; c++) {
      const cluster = jobs.filter((_, i) => assignments[i] === c)
      out.push(cluster.length > 0 ? mean(cluster) : { lat: 0, lon: 0 })
    }
    return out
  }
  let centers = computeCenters()

  // Loop a bounded number of iterations
  for (let iter = 0; iter < 200; iter++) {
    const sizes = new Array(k).fill(0)
    for (const a of assignments) sizes[a]++

    // Find oversized and undersized clusters
    const oversize = []
    const undersize = []
    for (let c = 0; c < k; c++) {
      if (sizes[c] > target) oversize.push(c)
      if (sizes[c] < minTarget) undersize.push(c)
    }
    if (oversize.length === 0 || undersize.length === 0) break

    // Pick a job in oversize cluster that's geographically closest to an
    // undersize cluster's center → relocate it
    let bestJob = -1, bestFrom = -1, bestTo = -1, bestDelta = Infinity
    for (const from of oversize) {
      for (let i = 0; i < N; i++) {
        if (assignments[i] !== from) continue
        const distHome = haversine(jobs[i], centers[from])
        for (const to of undersize) {
          const distNew = haversine(jobs[i], centers[to])
          const delta = distNew - distHome
          if (delta < bestDelta) { bestDelta = delta; bestJob = i; bestFrom = from; bestTo = to }
        }
      }
    }
    if (bestJob < 0) break
    assignments[bestJob] = bestTo
    centers = computeCenters()
  }
  return assignments
}

// ── Handler ──────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const auth = req.headers.get('Authorization') || ''
    if (!auth.startsWith('Bearer ')) return json(401, { error: 'Missing Authorization header.' })

    const body = await req.json().catch(() => ({})) as any
    const explicitSupIds: string[] | undefined = Array.isArray(body?.supervisor_employee_ids) ? body.supervisor_employee_ids : undefined
    const explicitJobIds: string[] | undefined = Array.isArray(body?.job_ids) ? body.job_ids : undefined
    const stageIds:       string[] | undefined = Array.isArray(body?.stage_ids) ? body.stage_ids : undefined

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // 1. Get supervisors. Default: any active employee whose job_title
    //    contains "supervisor" (case-insensitive). Caller can override.
    let supQuery = admin.from('employees')
      .select('id, first_name, last_name, job_title')
      .eq('status', 'active')
    if (explicitSupIds) {
      supQuery = supQuery.in('id', explicitSupIds)
    } else {
      supQuery = supQuery.ilike('job_title', '%supervisor%')
    }
    const { data: sups, error: supErr } = await supQuery
    if (supErr) return json(500, { error: 'Failed to fetch supervisors: ' + supErr.message })
    if (!sups || sups.length === 0) {
      return json(400, { error: 'No active supervisors found. Make sure at least one employee has a job_title containing "supervisor".' })
    }

    // 2. Get jobs. Default: open + geocoded. Optionally filter by stage_id.
    // The pseudo-id "__none__" means "include jobs with stage_id IS NULL (Unassigned)".
    let jobQuery = admin.from('jobs')
      .select('id, name, client_name, job_address, job_city, job_state, job_zip, lat, lon, project_manager, stage_id')
      .not('lat', 'is', null)
      .in('status', ['active', 'on_hold'])
    if (explicitJobIds) jobQuery = jobQuery.in('id', explicitJobIds)
    if (stageIds && stageIds.length > 0) {
      const realIds = stageIds.filter(s => s !== '__none__')
      const includeNull = stageIds.includes('__none__')
      if (realIds.length > 0 && includeNull) {
        // OR clause: stage_id IN (...) OR stage_id IS NULL
        const list = realIds.map(id => `"${id}"`).join(',')
        jobQuery = jobQuery.or(`stage_id.in.(${list}),stage_id.is.null`)
      } else if (realIds.length > 0) {
        jobQuery = jobQuery.in('stage_id', realIds)
      } else if (includeNull) {
        jobQuery = jobQuery.is('stage_id', null)
      }
    }
    const { data: jobs, error: jobErr } = await jobQuery
    if (jobErr) return json(500, { error: 'Failed to fetch jobs: ' + jobErr.message })
    if (!jobs || jobs.length === 0) {
      return json(400, { error: 'No open geocoded jobs found in the selected stages.' })
    }

    // 3. Run balanced k-means
    const points: Pt[] = jobs.map(j => ({ lat: Number(j.lat), lon: Number(j.lon) }))
    const k = sups.length
    let assignments = kmeans(points, k)
    assignments = balance(points, assignments, k)

    // 4. Build response: pair each cluster with a supervisor.
    //    For now we use index order (cluster c → sups[c]). This is fine
    //    when we have no info to do better; later we could match by who
    //    lives nearest to which cluster centroid.
    const supJobs = sups.map((s, c) => ({
      id:        s.id,
      name:      `${s.first_name || ''} ${s.last_name || ''}`.trim(),
      job_title: s.job_title || '',
      jobs:      jobs.filter((_, i) => assignments[i] === c).map(j => ({
        id:           j.id,
        name:         j.name,
        client_name:  j.client_name,
        job_address:  j.job_address,
        job_city:     j.job_city,
        job_state:    j.job_state,
        job_zip:      j.job_zip,
        lat:          Number(j.lat),
        lon:          Number(j.lon),
        current_pm:   j.project_manager,
      })),
    }))

    return json(200, { ok: true, supervisors: supJobs })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[assign-supervisors]', msg)
    return json(500, { error: msg })
  }
})
