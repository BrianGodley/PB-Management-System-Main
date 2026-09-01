// Which Supabase project is this build pointed at?
//
// Production is identified by project ref rather than by an "is production"
// env flag on purpose. A flag that someone forgets to set would make a staging
// build look exactly like production — the one failure that actually costs
// something. Pinning the prod ref inverts that: anything we don't positively
// recognise as production is labelled, so the warning shows by default.
//
// The ref is not a secret; it already appears in every API URL the app calls.
const PROD_PROJECT_REF = 'jjlnpywpmoukgwmwczbz'

// The project ref out of VITE_SUPABASE_URL, or null if it is unset/malformed
// (which we treat as "not production").
export function projectRef() {
  try {
    return new URL(import.meta.env.VITE_SUPABASE_URL).hostname.split('.')[0]
  } catch {
    return null
  }
}

export function isProduction() {
  return projectRef() === PROD_PROJECT_REF
}

// null in production, a short prefix everywhere else.
export function envLabel() {
  return isProduction() ? null : 'STAGING'
}
