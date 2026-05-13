// supabase/functions/optimize-route/index.ts
//
// Route optimizer for the Schedule Assistant. Takes a starting point
// (lat/lon) and a list of jobs (also already geocoded) and returns the
// best one-day route using real Google driving times.
//
// Algorithm:
//   1) Pull lat/lon for all requested jobs from the DB.
//   2) Call Google Distance Matrix in batches (max 10x10 elements per
//      call on the free tier; 25x25 on paid). We chunk to N x N tiles
//      and reassemble a single (n+1) x (n+1) drive-minute matrix, with
//      the start point at index 0.
//   3) Nearest-neighbor heuristic to seed an initial tour starting at 0.
//   4) 2-opt improvement pass to remove obvious crossovers.
//   5) Return the ordered job ids + per-leg drive minutes/miles + totals.
//
// Body:
//   {
//     job_ids: string[],         // jobs to include (must already be geocoded)
//     start:   { lat: number, lon: number, label?: string },
//     return_to_start?: boolean  // include drive back to start in totals (default false)
//   }
//
// Auth: requires Bearer token (any authenticated user).
// Env:  GOOGLE_MAPS_API_KEY   (same secret as geocode-jobs)

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

// Distance Matrix free-tier limit: 100 elements per request, max 25 origins
// or 25 destinations. We use 10x10 tiles to stay well under any limit and
// keep latency reasonable when chunking large matrices.
const TILE = 10

// ── Distance Matrix tile fetch ────────────────────────────────────────────
type Pt = { lat: number; lon: number }
type Cell = { minutes: number; meters: number } | null

async function fetchTile(origins: Pt[], destinations: Pt[], key: string): Promise<Cell[][]> {
  const o = origins.map(p => `${p.lat},${p.lon}`).join('|')
  const d = destinations.map(p => `${p.lat},${p.lon}`).join('|')
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(o)}&destinations=${encodeURIComponent(d)}&mode=driving&departure_time=now&key=${key}`
  const res = await fetch(url)
  const data = await res.json()
  if (data.status !== 'OK') throw new Error('Distance Matrix: ' + data.status + (data.error_message ? ' — ' + data.error_message : ''))
  return data.rows.map((row: any) =>
    row.elements.map((el: any): Cell => {
      if (el.status !== 'OK') return null
      // duration_in_traffic is only set when departure_time is provided.
      const seconds = el.duration_in_traffic?.value ?? el.duration?.value ?? 0
      return { minutes: seconds / 60, meters: el.distance?.value ?? 0 }
    })
  )
}

// Build the full (N x N) drive-time matrix for the given points by tiling.
async function buildMatrix(points: Pt[], key: string): Promise<Cell[][]> {
  const N = points.length
  const matrix: Cell[][] = Array.from({ length: N }, () => Array(N).fill(null))
  for (let i = 0; i < N; i += TILE) {
    for (let j = 0; j < N; j += TILE) {
      const oSlice = points.slice(i, i + TILE)
      const dSlice = points.slice(j, j + TILE)
      const tile = await fetchTile(oSlice, dSlice, key)
      for (let r = 0; r < oSlice.length; r++) {
        for (let c = 0; c < dSlice.length; c++) {
          matrix[i + r][j + c] = tile[r][c]
        }
      }
    }
  }
  return matrix
}

// ── Tour heuristics ──────────────────────────────────────────────────────
// Nearest-neighbor starting at index 0. Returns the visit order over all
// indices 0..N-1 with 0 fixed at the front.
function nearestNeighbor(matrix: Cell[][]): number[] {
  const N = matrix.length
  const visited = new Set<number>([0])
  const order = [0]
  let cur = 0
  while (visited.size < N) {
    let bestIdx = -1
    let bestVal = Infinity
    for (let j = 0; j < N; j++) {
      if (visited.has(j)) continue
      const c = matrix[cur][j]
      const v = c ? c.minutes : Infinity
      if (v < bestVal) { bestVal = v; bestIdx = j }
    }
    if (bestIdx < 0) break
    order.push(bestIdx)
    visited.add(bestIdx)
    cur = bestIdx
  }
  return order
}

function tourCost(order: number[], matrix: Cell[][]): number {
  let total = 0
  for (let i = 0; i < order.length - 1; i++) {
    const c = matrix[order[i]][order[i + 1]]
    total += c ? c.minutes : 99999
  }
  return total
}

// 2-opt: try reversing every contiguous sub-segment of the tour and keep
// the swap if it reduces total drive minutes. Repeats until no improvement.
// Start point (index 0) stays fixed at position 0.
function twoOpt(order: number[], matrix: Cell[][]): number[] {
  let best = order.slice()
  let improved = true
  let bestCost = tourCost(best, matrix)
  while (improved) {
    improved = false
    for (let i = 1; i < best.length - 1; i++) {
      for (let k = i + 1; k < best.length; k++) {
        const next = best.slice(0, i).concat(best.slice(i, k + 1).reverse(), best.slice(k + 1))
        const cost = tourCost(next, matrix)
        if (cost + 0.0001 < bestCost) {
          best = next
          bestCost = cost
          improved = true
        }
      }
    }
  }
  return best
}

// ── Handler ──────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY')
    if (!apiKey) return json(500, { error: 'GOOGLE_MAPS_API_KEY is not configured.' })

    const authHeader = req.headers.get('Authorization') || ''
    if (!authHeader.startsWith('Bearer ')) return json(401, { error: 'Missing Authorization header.' })

    const body = await req.json().catch(() => ({})) as any
    const jobIds: string[] = Array.isArray(body?.job_ids) ? body.job_ids : []
    const start: Pt | undefined = body?.start
    const returnToStart = body?.return_to_start === true

    if (!jobIds.length)         return json(400, { error: 'job_ids must be a non-empty array' })
    if (!start || typeof start.lat !== 'number' || typeof start.lon !== 'number') {
      return json(400, { error: 'start must be { lat, lon }' })
    }
    if (jobIds.length > 50) return json(400, { error: 'Too many jobs (max 50 per optimization run)' })

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Pull lat/lon for the requested jobs (must already be geocoded)
    const { data: jobs, error } = await admin.from('jobs')
      .select('id, name, client_name, job_address, job_city, job_state, job_zip, lat, lon, geocode_status')
      .in('id', jobIds)
    if (error) return json(500, { error: 'Failed to fetch jobs: ' + error.message })

    const ungeocoded = (jobs || []).filter(j => !j.lat || !j.lon)
    if (ungeocoded.length > 0) {
      return json(400, {
        error: 'Some jobs are not geocoded yet — run the geocoder first.',
        ungeocoded_job_ids: ungeocoded.map(j => j.id),
      })
    }

    // Order: [start, job0, job1, ...]
    const points: Pt[] = [{ lat: start.lat, lon: start.lon }, ...(jobs as any[]).map(j => ({ lat: Number(j.lat), lon: Number(j.lon) }))]
    const matrix = await buildMatrix(points, apiKey)

    // Heuristic + improvement
    const initial  = nearestNeighbor(matrix)
    const improved = twoOpt(initial, matrix)

    // Map indices back to jobs (skip the start at index 0)
    const orderedJobs = improved.slice(1).map(idx => (jobs as any[])[idx - 1])

    // Build per-leg drive info between consecutive nodes in the improved tour
    const legs: Array<{ from: string; to: string; minutes: number; meters: number }> = []
    let totalMin = 0, totalMeters = 0
    for (let i = 0; i < improved.length - 1; i++) {
      const a = improved[i], b = improved[i + 1]
      const c = matrix[a][b]
      const fromLabel = a === 0 ? (start as any).label || 'Start' : (jobs as any[])[a - 1].name || (jobs as any[])[a - 1].client_name
      const toLabel   = b === 0 ? (start as any).label || 'Start' : (jobs as any[])[b - 1].name || (jobs as any[])[b - 1].client_name
      const minutes = c ? c.minutes : 0
      const meters  = c ? c.meters  : 0
      legs.push({ from: fromLabel, to: toLabel, minutes, meters })
      totalMin    += minutes
      totalMeters += meters
    }
    if (returnToStart) {
      const last = improved[improved.length - 1]
      const c = matrix[last][0]
      if (c) {
        const fromLabel = (jobs as any[])[last - 1].name || (jobs as any[])[last - 1].client_name
        const toLabel   = (start as any).label || 'Start'
        legs.push({ from: fromLabel, to: toLabel, minutes: c.minutes, meters: c.meters })
        totalMin    += c.minutes
        totalMeters += c.meters
      }
    }

    return json(200, {
      ok: true,
      ordered_job_ids: orderedJobs.map(j => j.id),
      legs,
      totals: {
        drive_minutes: Math.round(totalMin),
        drive_miles:   Math.round((totalMeters / 1609.344) * 10) / 10,
        stops:         orderedJobs.length,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[optimize-route]', msg)
    return json(500, { error: msg })
  }
})
