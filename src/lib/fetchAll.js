// src/lib/fetchAll.js
//
// Pagination helper for Supabase queries that need to fetch more than the
// project's PostgREST max-rows cap (default 1,000 in many Supabase projects).
//
// Usage:
//   const all = await fetchAllPaginated(() =>
//     supabase.from('jobs').select('*').order('sold_date', { ascending: false })
//   )
//
// The argument is a FUNCTION that returns a FRESH query each call — because
// PostgrestFilterBuilder is mutable, we rebuild it per page.

const PAGE_SIZE = 1000

export async function fetchAllPaginated(buildQuery, opts = {}) {
  const max = opts.max ?? 100000  // safety cap so we don't accidentally pull millions
  let all = []
  for (let offset = 0; offset < max; offset += PAGE_SIZE) {
    const { data, error } = await buildQuery().range(offset, offset + PAGE_SIZE - 1)
    if (error) {
      // Return what we have plus the error — caller decides how to handle
      return { data: all, error }
    }
    if (!data || data.length === 0) break
    all = all.concat(data)
    if (data.length < PAGE_SIZE) break
  }
  return { data: all, error: null }
}
