import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const respond = (payload: object) =>
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const body = await req.json()
    const { userId, email, newPassword } = body

    if (!newPassword) return respond({ error: 'newPassword is required' })
    if (!userId && !email) return respond({ error: 'userId or email is required' })

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    let targetUserId = userId

    // If only email provided, find the auth user id by scanning all users
    if (!targetUserId && email) {
      const normalised = email.trim().toLowerCase()

      // Page through all users until we find a match
      let found = false
      let page = 1
      while (!found) {
        const { data, error: listErr } = await adminClient.auth.admin.listUsers({
          page,
          perPage: 1000,
        })
        if (listErr) return respond({ error: listErr.message })

        const users = data?.users ?? []
        const match = users.find(u => u.email?.trim().toLowerCase() === normalised)

        if (match) {
          targetUserId = match.id
          found = true
        } else if (users.length < 1000) {
          // Last page — user not found
          break
        }
        page++
      }

      if (!targetUserId) {
        return respond({ error: `No account found for ${email}. Please contact your administrator.` })
      }
    }

    const { error } = await adminClient.auth.admin.updateUserById(targetUserId, {
      password: newPassword,
    })

    if (error) return respond({ error: error.message })

    return respond({ success: true })
  } catch (e: any) {
    return respond({ error: e.message || 'Unexpected error' })
  }
})
