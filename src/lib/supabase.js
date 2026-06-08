import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing Supabase environment variables. Please create a .env file based on .env.example'
  )
}

// Requests to the auth endpoint must NOT go through the refresh-and-retry
// logic below, or refreshing the token could recurse into itself.
const isAuthUrl = url => typeof url === 'string' && url.includes('/auth/v1/')

// Custom fetch that makes navigation-after-idle reliable:
//
//   1. If a data request comes back 401 because the access token expired while
//      the tab sat idle (the default token lives ~1 hour), we refresh the
//      session once and replay the request with the new token. This is what
//      eliminates the "error flashes, then the page loads" behaviour — the
//      failure is healed before it ever reaches the page.
//   2. If a GET fails outright because the HTTP/2 connection went cold after
//      idle, we retry it once after a short pause.
//
// Both paths skip auth-endpoint calls (to avoid recursion) and only retry the
// idempotent / pre-auth cases so we never double-apply a write.
const refreshingFetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input?.url
  const method = (init?.method || 'GET').toUpperCase()

  let res
  try {
    res = await fetch(input, init)
  } catch (e) {
    // Cold-connection / transient network failure — retry GETs once.
    if (method === 'GET' && !isAuthUrl(url)) {
      await new Promise(r => setTimeout(r, 350))
      return fetch(input, init)
    }
    throw e
  }

  // Expired-token 401 on a data request → refresh the session and replay once.
  if (res.status === 401 && !isAuthUrl(url)) {
    try {
      const { data } = await supabase.auth.refreshSession()
      const newToken = data?.session?.access_token
      if (newToken) {
        const headers = new Headers(init?.headers || {})
        // Only override the per-request bearer (leave the apikey header intact).
        if (headers.has('Authorization')) headers.set('Authorization', `Bearer ${newToken}`)
        return fetch(input, { ...init, headers })
      }
    } catch {
      // Refresh failed (genuinely signed out) — fall through to the original 401.
    }
  }

  return res
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: { fetch: refreshingFetch },
})
