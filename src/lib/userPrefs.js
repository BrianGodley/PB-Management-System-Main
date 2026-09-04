// ─────────────────────────────────────────────────────────────────────────────
// Per-user UI preferences that travel with the login.
//
// One row per user in dashboard_preferences (the table the dashboard, the
// weather location and the Customize backgrounds already use), with everything
// miscellaneous living under a single `prefs` jsonb column. A new preference is
// a new key, never a new column — that is what keeps this from growing a column
// per feature the way module_backgrounds and weather_location did.
//
// localStorage is a CACHE, not the store: it lets a page paint the saved view
// on the first frame instead of flashing the default, and it keeps a choice
// usable if the write fails. The database is what makes the preference follow
// the user to another machine.
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from './supabase'

const cacheKey = userId => `pb.userPrefs:${userId || 'anon'}`

export function readCachedPrefs(userId) {
  try {
    return JSON.parse(localStorage.getItem(cacheKey(userId)) || '{}')
  } catch {
    return {}
  }
}

function writeCache(userId, prefs) {
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify(prefs))
  } catch {
    // Private browsing or a full store. The preference still applies for this
    // session; it just will not paint instantly on the next load.
  }
}

// Returns {} rather than throwing when the column has not been added yet, so a
// screen using this keeps working ahead of the migration.
export async function fetchUserPrefs(userId) {
  if (!userId) return {}
  const { data, error } = await supabase
    .from('dashboard_preferences')
    .select('prefs')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) return readCachedPrefs(userId)
  const prefs = data?.prefs || {}
  writeCache(userId, prefs)
  return prefs
}

// Read-modify-write against the row, so two screens saving different keys do
// not overwrite each other. Resolves true when the value reached the database.
export async function saveUserPref(userId, key, value) {
  if (!userId) return false
  const current = await fetchUserPrefs(userId)
  const next = { ...current, [key]: value }
  writeCache(userId, next)
  const { error } = await supabase
    .from('dashboard_preferences')
    .upsert(
      { user_id: userId, prefs: next, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
  return !error
}
