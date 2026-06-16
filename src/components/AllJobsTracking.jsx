// src/components/AllJobsTracking.jsx
//
// All-Jobs view for the Jobs > Tracking tab. Shown when "All Jobs" is selected
// instead of the per-job JobComparison. Rolls every job that matches the
// sidebar Open/Closed filter into one price / cost / gross table. Click a job
// to drop into its full estimated-vs-actual comparison.
import { useMemo } from 'react'

function isJobOpen(j) {
  const s = j?.status || 'active'
  return s === 'active' || s === 'on_hold'
}

const money = v => {
  const n = Number(v)
  return Number.isFinite(n)
    ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    : '—'
}

export default function AllJobsTracking({ jobs = [], statusFilter = 'open', onSelectJob }) {
  const rows = useMemo(() => {
    return jobs
      .filter(j => (statusFilter === 'closed' ? !isJobOpen(j) : isJobOpen(j)))
      .map(j => {
        const price = Number(j.total_price ?? j.contract_price ?? j.bt_contract_price ?? 0) || 0
        const cost = Number(j.bt_total_costs ?? 0) || 0
        return {
          id: j.id,
          name: j.name || j.client_name || '—',
          price,
          cost,
          gross: price - cost,
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [jobs, statusFilter])

  const totals = rows.reduce(
    (a, r) => ({ price: a.price + r.price, cost: a.cost + r.cost, gross: a.gross + r.gross }),
    { price: 0, cost: 0, gross: 0 }
  )

  return (
    <div className="flex flex-col h-full">

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <p className="mb-2 text-4xl">📊</p>
          <p className="text-sm">No {statusFilter === 'closed' ? 'closed' : 'open'} jobs.</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm table-fixed">
            <thead className="sticky top-0 z-10 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2.5 w-[34%]">Job</th>
                <th className="px-4 py-2.5 text-right w-[22%]">Contract Price</th>
                <th className="px-4 py-2.5 text-right w-[22%]">Costs</th>
                <th className="px-4 py-2.5 text-right w-[22%]">Gross</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => onSelectJob?.(r.id)}
                      className="block w-full truncate text-left font-medium text-green-700 hover:underline"
                    >
                      {r.name}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-700 whitespace-nowrap">{money(r.price)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-700 whitespace-nowrap">{money(r.cost)}</td>
                  <td
                    className={`px-4 py-2.5 text-right font-semibold whitespace-nowrap ${
                      r.gross < 0 ? 'text-red-600' : 'text-gray-900'
                    }`}
                  >
                    {money(r.gross)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-bold text-gray-900">
                <td className="px-4 py-2.5">Total</td>
                <td className="px-4 py-2.5 text-right">{money(totals.price)}</td>
                <td className="px-4 py-2.5 text-right">{money(totals.cost)}</td>
                <td
                  className={`px-4 py-2.5 text-right ${
                    totals.gross < 0 ? 'text-red-600' : 'text-gray-900'
                  }`}
                >
                  {money(totals.gross)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <p className="mt-2 px-1 text-xs text-gray-400 flex-shrink-0">
        Costs are the recorded job costs on each job record. Click a job for its full
        estimated-vs-actual breakdown.
      </p>
    </div>
  )
}
