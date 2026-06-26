// supabase/functions/migrate-storage-tenancy/index.ts
//
// ONE-TIME: the company-files bucket used to store files at un-namespaced roots
// (files/, photos/, videos/). FileManager now namespaces every tenant under
// <tenant_id>/<root>/..., so this moves the existing (Picture Build) objects
// from "<root>/..." to "<pbTenantId>/<root>/..." so PB keeps access. New tenants
// already start clean.
//
// Call once with header  x-cron-secret: <CRON_SECRET>.
// Deploy: supabase functions deploy migrate-storage-tenancy --no-verify-jwt
//
// Idempotent-ish: anything already under a tenant-id folder is skipped.

import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }
const json = (s: number, b: unknown) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'content-type': 'application/json' } })

const BUCKET = 'company-files'
const ROOTS = ['files', 'photos', 'videos']

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if ((req.headers.get('x-cron-secret') || '') !== (Deno.env.get('CRON_SECRET') || '') || !Deno.env.get('CRON_SECRET'))
    return json(401, { error: 'unauthorized' })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })

  const { data: pb } = await admin.from('tenants').select('id').eq('name', 'Picture Build').maybeSingle()
  if (!pb?.id) return json(404, { error: 'Picture Build tenant not found' })
  const tid = pb.id

  let moved = 0
  const errors: string[] = []

  // Recursively walk a prefix and move each file to <tid>/<path>.
  async function walk(prefix: string) {
    const { data, error } = await admin.storage.from(BUCKET).list(prefix, { limit: 1000 })
    if (error) { errors.push(`${prefix}: ${error.message}`); return }
    for (const e of data || []) {
      const full = prefix ? `${prefix}/${e.name}` : e.name
      if (e.id == null) {
        // folder → recurse
        await walk(full)
      } else {
        const dest = `${tid}/${full}`
        const { error: mErr } = await admin.storage.from(BUCKET).move(full, dest)
        if (mErr) errors.push(`${full} → ${dest}: ${mErr.message}`)
        else moved++
      }
    }
  }

  for (const root of ROOTS) await walk(root)

  return json(200, { ok: true, moved, errors })
})
