import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

const FG = '#3A5038'
const PAGE = 100

// Admin → Code Changes. A read-only, searchable history of every code update,
// populated from git commit history by scripts/import-code-changes.mjs. Git is the
// single source of truth; there is no add/edit here by design.
export default function CodeChangesTab() {
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(null)
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('') // debounced
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [expanded, setExpanded] = useState(null)
  const [error, setError] = useState('')

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(q.trim())
      setPage(0)
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    let sel = supabase
      .from('code_changes')
      .select('id, commit_hash, committed_at, author, subject, body, files_changed', {
        count: 'exact',
      })
      .order('committed_at', { ascending: false })
      .range(page * PAGE, page * PAGE + PAGE - 1)
    if (query) sel = sel.or(`subject.ilike.%${query}%,body.ilike.%${query}%,author.ilike.%${query}%`)
    const { data, count, error } = await sel
    if (error) {
      // 42P01 = table missing (SQL not run yet)
      setError(
        error.code === '42P01' || /does not exist/i.test(error.message || '')
          ? 'The code_changes table does not exist yet. Run supabase-code-changes.sql, then the importer.'
          : error.message
      )
      setRows([])
      setTotal(0)
    } else {
      setRows(data || [])
      setTotal(count ?? 0)
    }
    setLoading(false)
  }, [page, query])

  useEffect(() => {
    load()
  }, [load])

  const fmtDate = iso =>
    new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })

  const pages = total ? Math.ceil(total / PAGE) : 0

  return (
    <div className="space-y-4">
      {/* Header + search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Code Changes</h2>
          <p className="text-sm text-gray-500">
            Every code update, newest first — pulled from git commit history.
            {total != null && !error && (
              <span className="ml-1 text-gray-400">({total.toLocaleString()} total)</span>
            )}
          </p>
        </div>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search descriptions, author, hash…"
          className="w-full sm:w-80 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
        />
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl">
          ⚠️ {error}
        </div>
      )}

      {/* Table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left font-semibold px-4 py-2.5 w-28">Date</th>
              <th className="text-left font-semibold px-4 py-2.5">Description</th>
              <th className="text-left font-semibold px-4 py-2.5 w-32 hidden md:table-cell">Author</th>
              <th className="text-left font-semibold px-4 py-2.5 w-24 hidden sm:table-cell">Commit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-green-700" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-gray-400">
                  {error ? 'No data.' : query ? 'No changes match your search.' : 'No changes recorded yet.'}
                </td>
              </tr>
            ) : (
              rows.map(r => {
                const open = expanded === r.id
                const hasBody = r.body && r.body.trim().length > 0
                return (
                  <tr
                    key={r.id}
                    className={hasBody ? 'cursor-pointer hover:bg-gray-50' : ''}
                    onClick={() => hasBody && setExpanded(open ? null : r.id)}
                  >
                    <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap align-top">
                      {fmtDate(r.committed_at)}
                    </td>
                    <td className="px-4 py-2.5 text-gray-800 align-top">
                      <div className="flex items-start gap-2">
                        {hasBody && (
                          <span className="text-gray-400 mt-0.5 select-none">{open ? '▾' : '▸'}</span>
                        )}
                        <div>
                          <div>{r.subject}</div>
                          {open && hasBody && (
                            <pre className="mt-2 whitespace-pre-wrap text-xs text-gray-500 font-sans bg-gray-50 rounded-lg p-3 border border-gray-100">
                              {r.body}
                            </pre>
                          )}
                          {r.files_changed > 0 && (
                            <span className="text-xs text-gray-400">
                              {r.files_changed} file{r.files_changed === 1 ? '' : 's'} changed
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 align-top hidden md:table-cell">
                      {r.author || '—'}
                    </td>
                    <td className="px-4 py-2.5 align-top hidden sm:table-cell">
                      <span className="font-mono text-xs text-gray-400">
                        {(r.commit_hash || '').slice(0, 7)}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0 || loading}
            className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            ← Newer
          </button>
          <span className="text-gray-500">
            Page {page + 1} of {pages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(pages - 1, p + 1))}
            disabled={page >= pages - 1 || loading}
            className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            style={{ borderColor: page < pages - 1 ? FG : undefined }}
          >
            Older →
          </button>
        </div>
      )}
    </div>
  )
}
