import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Always return 200 so supabase.functions.invoke puts the body in `data`
  // and we can read success/error cleanly on the client side.
  const respond = (payload: object) =>
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_ANON_KEY         = Deno.env.get('SUPABASE_ANON_KEY')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const authHeader = req.headers.get('Authorization') ?? ''
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth:   { autoRefreshToken: false, persistSession: false },
    })

    const { data: { user }, error: userErr } = await userClient.auth.getUser()
    if (userErr || !user) return respond({ success: false, error: 'Not authenticated.' })

    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (callerProfile?.role !== 'admin') {
      return respond({ success: false, error: 'Admin access required.' })
    }

    const { userId } = await req.json()
    if (!userId)            return respond({ success: false, error: 'userId is required.' })
    if (userId === user.id) return respond({ success: false, error: 'You cannot delete your own account.' })

    const { error: deleteErr } = await adminClient.auth.admin.deleteUser(userId)
    if (deleteErr) return respond({ success: false, error: deleteErr.message })

    return respond({ success: true })

  } catch (err) {
    return respond({ success: false, error: err.message ?? 'Unexpected error.' })
  }
})
