// ─────────────────────────────────────────────────────────────────────────────
// PartyHistory — list of a sub/vendor's quotes or contracts.
// Rendered inside the Subs & Vendors detail modal (Quotes / Contracts tabs).
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import DocViewerModal from './DocViewerModal'

const money = v =>
  `$${(Number(v) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function PartyHistory({ partyId, kind }) {
  const table = kind === 'quotes' ? 'sub_vendor_quotes' : 'sub_vendor_contracts'
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewDoc, setViewDoc] = useState(null)

  useEffect(() => {
    if (!partyId) {
      setRows([])
      setLoading(false)
      return
    }
    let alive = true
    setLoading(true)
    supabase
      .from(table)
      .select('*')
      .eq('sub_vendor_id', partyId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!alive) return
        setRows(data || [])
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [partyId, table])

  async function openFile(r) {
    const { data } = await supabase.storage
      .from('sub-vendor-files')
      .createSignedUrl(r.file_path, 3600)
    if (data?.signedUrl)
      setViewDoc({ name: r.file_name || (kind === 'quotes' ? 'Quote' : 'Contract'), url: data.signedUrl })
  }

  if (loading) return <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>
  if (rows.length === 0)
    return (
      <p className="text-sm text-gray-400 py-8 text-center">
        No {kind === 'quotes' ? 'quotes' : 'contracts'} yet for this{' '}
        {kind === 'quotes' ? 'vendor' : 'subcontractor'}.
      </p>
    )

  return (
    <div className="space-y-2">
      {rows.map(r => {
        const title =
          kind === 'quotes'
            ? r.direction === 'received'
              ? 'Received quote'
              : 'Quote request'
            : 'Contract'
        const sub = [
          r.job_name || null,
          r.estimate_name || null,
        ]
          .filter(Boolean)
          .join(' · ')
        return (
          <div
            key={r.id}
            className="flex items-center justify-between gap-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">
                {title}
                {sub ? <span className="font-normal text-gray-500"> — {sub}</span> : ''}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(r.created_at).toLocaleDateString()} · {money(r.total)}
                {kind === 'quotes' && r.status ? <span className="capitalize"> · {r.status}</span> : ''}
              </p>
            </div>
            {r.file_path ? (
              <button
                onClick={() => openFile(r)}
                className="text-xs font-semibold text-green-700 hover:underline flex-shrink-0"
              >
                View file
              </button>
            ) : (
              <span className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">
                {(Array.isArray(r.line_items) ? r.line_items.length : 0)} items
              </span>
            )}
          </div>
        )
      })}
      {viewDoc && (
        <DocViewerModal name={viewDoc.name} url={viewDoc.url} onClose={() => setViewDoc(null)} />
      )}
    </div>
  )
}
