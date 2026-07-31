import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import InvoiceImportModal from './InvoiceImportModal'

// Vendors → Invoicing tab: a table of every imported invoice, plus the
// "Import & Review" entry point (top-right). Each row: vendor, a view icon to
// open the original file, invoice date, # of line items, and the total.

const fmt = v =>
  v == null ? '—' : `$${(Number(v) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function VendorInvoicing({ vendors = [] }) {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showImport, setShowImport] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('vendor_invoices')
      .select('id, invoice_no, invoice_date, total, file_url, vendor_id, subs_vendors(company_name), vendor_invoice_lines(count)')
      .order('invoice_date', { ascending: false })
    setInvoices(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function viewFile(path) {
    if (!path) return
    const { data, error } = await supabase.storage.from('vendor-invoices').createSignedUrl(path, 120)
    if (error || !data?.signedUrl) return alert('Could not open the file.')
    window.open(data.signedUrl, '_blank', 'noopener')
  }

  return (
    <div className="flex-1 flex flex-col mt-3">
      {showImport && (
        <InvoiceImportModal
          vendors={vendors}
          onClose={() => setShowImport(false)}
          onPosted={load}
        />
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-bold text-gray-700">Imported Invoices</h3>
          <button
            onClick={() => setShowImport(true)}
            className="text-sm bg-green-600 text-white font-semibold rounded px-4 py-1.5 hover:bg-green-700"
          >
            Import &amp; Review
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase">
                <th className="px-3 py-2">Vendor</th>
                <th className="px-3 py-2 w-12">View</th>
                <th className="px-3 py-2">Invoice date</th>
                <th className="px-3 py-2 text-right">Items</th>
                <th className="px-3 py-2 text-right">Invoice total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No invoices imported yet.</td></tr>
              ) : (
                invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-800">
                      {inv.subs_vendors?.company_name || '—'}
                      {inv.invoice_no && <span className="text-gray-400 font-normal"> · #{inv.invoice_no}</span>}
                    </td>
                    <td className="px-3 py-2">
                      {inv.file_url ? (
                        <button onClick={() => viewFile(inv.file_url)} title="View invoice" className="text-gray-500 hover:text-green-700 text-base">
                          📄
                        </button>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-700">{inv.invoice_date || '—'}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{inv.vendor_invoice_lines?.[0]?.count ?? 0}</td>
                    <td className="px-3 py-2 text-right font-semibold text-gray-800">{fmt(inv.total)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
