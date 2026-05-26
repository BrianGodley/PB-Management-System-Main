// src/components/JobMaterialCostsTab.jsx
//
// Material Costs sub-tab of the job Finance tab. Read-only, PAGINATED list
// of every QuickBooks-imported expense line (Bill, Check, Credit Card
// Charge, Item Receipt) that's been auto-linked to this job via the
// match_qb_customer_to_job() fuzzy matcher.
//
// Reads from v_job_material_costs — a UNION ALL view over the four
// acct_*_lines tables that exposes a uniform shape: source_type, txn_date,
// vendor_name, ref_number, line_type, item_or_account, description,
// quantity, unit_price, amount, plus the job_id link.
//
// In the all-jobs view (job == null) the table spans every job and shows
// a Job column. Source-type filter, vendor search, server-side paging.
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const PAGE_SIZE = 100

const num = v => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const money = v => num(v).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
const dateStr = v => {
  if (!v) return '—'
  const d = new Date(v)
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Display labels + per-type colours for the source_type badge.
const SOURCE_META = {
  bill:              { label: 'Bill',         cls: 'bg-amber-100 text-amber-700' },
  check:             { label: 'Check',        cls: 'bg-blue-100 text-blue-700' },
  credit_card_charge:{ label: 'CC Charge',    cls: 'bg-purple-100 text-purple-700' },
  item_receipt:      { label: 'Item Receipt', cls: 'bg-gray-100 text-gray-700' },
}

const SOURCE_FILTERS = [
  { key: 'all',                label: 'All' },
  { key: 'bill',               label: 'Bills' },
  { key: 'check',              label: 'Checks' },
  { key: 'credit_card_charge', label: 'CC Charges' },
  { key: 'item_receipt',       label: 'Item Receipts' },
]

export default function JobMaterialCostsTab({ job, refreshKey = 0 }) {
  const allJobs = !job?.id
  const [loading, setLoading]               = useState(true)
  const [rows, setRows]                     = useState([])
  const [jobNames, setJobNames]             = useState({})
  const [count, setCount]                   = useState(0)
  const [page, setPage]                     = useState(0)
  const [sourceFilter, setSourceFilter]     = useState('all')
  const [search, setSearch]                 = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [error, setError]                   = useState('')
  const [grandTotal, setGrandTotal]         = useState(null)

  // Debounced search so we don't fire a query on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  // Reset to page 1 whenever a filter changes.
  useEffect(() => {
    setPage(0)
  }, [job?.id, refreshKey, debouncedSearch, sourceFilter])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const from = page * PAGE_SIZE
    let q = supabase
      .from('v_job_material_costs')
      .select('*', { count: 'exact' })
      .order('txn_date', { ascending: false, nullsFirst: false })

    if (!allJobs) q = q.eq('job_id', job.id)
    if (sourceFilter !== 'all') q = q.eq('source_type', sourceFilter)

    const term = debouncedSearch.trim().replace(/[%,()*]/g, ' ').trim()
    if (term) {
      // Search across vendor, item/account, description, and ref number.
      q = q.or([
        `vendor_name.ilike.*${term}*`,
        `item_or_account.ilike.*${term}*`,
        `description.ilike.*${term}*`,
        `ref_number.ilike.*${term}*`,
      ].join(','))
    }

    q = q.range(from, from + PAGE_SIZE - 1)
    const { data, error: e, count: c } = await q
    if (e) {
      setError(e.message)
      setRows([])
      setLoading(false)
      return
    }
    const list = data || []
    setRows(list)
    setCount(c || 0)

    // In all-jobs view, resolve job names for the Job column.
    if (allJobs) {
      const ids = [...new Set(list.map(r => r.job_id).filter(Boolean))]
      const missing = ids.filter(id => !jobNames[id])
      if (missing.length) {
        const { data: jb } = await supabase
          .from('jobs')
          .select('id, name, client_name')
          .in('id', missing)
        setJobNames(prev => ({
          ...prev,
          ...Object.fromEntries((jb || []).map(j => [j.id, j.name || j.client_name || '—'])),
        }))
      }
    }
    setLoading(false)
  }, [allJobs, job?.id, page, debouncedSearch, sourceFilter, jobNames])

  useEffect(() => { load() }, [load, refreshKey])

  // Grand total across the current filter (not just this page). We sum
  // `amount` server-side via a head-only aggregate when possible; if the
  // view doesn't support that nicely we fall back to summing the visible
  // page only, with a "(page total)" label.
  useEffect(() => {
    let cancelled = false
    setGrandTotal(null)
    async function fetchTotal() {
      // PostgREST doesn't expose SUM() over views via the standard API,
      // so we pull just the `amount` column for the active filter and
      // sum client-side. Capped at 5000 rows to stay snappy; if the
      // count exceeds that we show "5000+ shown" so the user knows.
      let q = supabase
        .from('v_job_material_costs')
        .select('amount', { count: 'exact' })
        .limit(5000)
      if (!allJobs) q = q.eq('job_id', job.id)
      if (sourceFilter !== 'all') q = q.eq('source_type', sourceFilter)
      const term = debouncedSearch.trim().replace(/[%,()*]/g, ' ').trim()
      if (term) {
        q = q.or([
          `vendor_name.ilike.*${term}*`,
          `item_or_account.ilike.*${term}*`,
          `description.ilike.*${term}*`,
          `ref_number.ilike.*${term}*`,
        ].join(','))
      }
      const { data, count: c, error: e } = await q
      if (cancelled || e) return
      const sum = (data || []).reduce((s, r) => s + num(r.amount), 0)
      setGrandTotal({ sum, exact: (c ?? 0) <= 5000, count: c ?? 0 })
    }
    fetchTotal()
    return () => { cancelled = true }
  }, [allJobs, job?.id, debouncedSearch, sourceFilter, refreshKey])

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages - 1)

  return (
    <div className="flex h-full flex-col">
      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-5 py-3">
        <div className="flex gap-1 flex-wrap">
          {SOURCE_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setSourceFilter(f.key)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                sourceFilter === f.key
                  ? 'bg-green-700 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search vendor, item, description, ref #…"
          className="ml-auto w-full max-w-xs rounded-lg border border-gray-200 px-3 py-1.5 text-xs"
        />
      </div>

      {/* Grand total banner */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-2 text-xs">
        <span className="text-gray-500">
          {grandTotal == null
            ? 'Calculating total…'
            : grandTotal.exact
              ? <>Total: <b className="text-gray-900">{money(grandTotal.sum)}</b> across {grandTotal.count.toLocaleString()} line{grandTotal.count === 1 ? '' : 's'}</>
              : <>Page-capped total (first 5,000 of {grandTotal.count.toLocaleString()} lines): <b className="text-gray-900">{money(grandTotal.sum)}</b> — narrow with a filter for an exact figure</>}
        </span>
        {count > 0 && (
          <span className="text-gray-400">
            Page {safePage + 1} of {totalPages.toLocaleString()} · {count.toLocaleString()} total
          </span>
        )}
      </div>

      {/* Table */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {error && (
          <div className="m-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white shadow-sm z-10">
            <tr className="border-b border-gray-100 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              <th className="px-5 py-2">Date</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Vendor / Payee</th>
              <th className="px-3 py-2">Ref #</th>
              <th className="px-3 py-2">Item / Account</th>
              <th className="px-3 py-2">Description</th>
              {allJobs && <th className="px-3 py-2">Job</th>}
              <th className="px-3 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && (
              <tr><td colSpan={allJobs ? 8 : 7} className="px-5 py-10 text-center text-gray-400">Loading…</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={allJobs ? 8 : 7} className="px-5 py-10 text-center text-gray-400">
                  {sourceFilter === 'all' && !debouncedSearch
                    ? 'No QuickBooks-imported material costs are linked to this job yet.'
                    : 'No matches with current filter.'}
                </td>
              </tr>
            )}
            {!loading && rows.map(r => {
              const meta = SOURCE_META[r.source_type] || { label: r.source_type, cls: 'bg-gray-100 text-gray-700' }
              return (
                <tr key={r.line_id} className="hover:bg-gray-50">
                  <td className="px-5 py-2 text-xs text-gray-500 whitespace-nowrap">{dateStr(r.txn_date)}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${meta.cls}`}>
                      {meta.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-medium text-gray-800 max-w-[180px] truncate">
                    {r.vendor_name || '—'}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-500 whitespace-nowrap">
                    {r.ref_number || '—'}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-700 max-w-[220px] truncate" title={r.item_or_account || ''}>
                    {r.item_or_account || '—'}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500 max-w-[260px] truncate" title={r.description || ''}>
                    {r.description || ''}
                  </td>
                  {allJobs && (
                    <td className="px-3 py-2 text-xs text-gray-600 max-w-[160px] truncate">
                      {jobNames[r.job_id] || '—'}
                    </td>
                  )}
                  <td className="px-3 py-2 text-right font-semibold text-gray-800 whitespace-nowrap">
                    {money(r.amount)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {count > PAGE_SIZE && (
        <div className="flex flex-shrink-0 items-center gap-3 border-t border-gray-100 bg-white px-5 py-2 text-xs text-gray-500">
          <button
            onClick={() => setPage(Math.max(0, safePage - 1))}
            disabled={safePage === 0}
            className="rounded border border-gray-200 px-2.5 py-1 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ‹ Prev
          </button>
          <span>
            Page {safePage + 1} of {totalPages.toLocaleString()}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}
            disabled={safePage >= totalPages - 1}
            className="rounded border border-gray-200 px-2.5 py-1 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next ›
          </button>
        </div>
      )}
    </div>
  )
}
