import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const PAYMENT_METHODS = ['Check', 'Credit Card', 'ACH / Bank Transfer', 'Cash', 'Other']
const COLLECTION_STATUSES = ['outstanding', 'partial', 'paid', 'overdue']

const STATUS_STYLES = {
  outstanding: 'bg-yellow-100 text-yellow-800',
  partial:     'bg-blue-100 text-blue-800',
  paid:        'bg-green-100 text-green-800',
  overdue:     'bg-red-100 text-red-800',
}

export default function Collections() {
  const { user } = useAuth()
  const [collections, setCollections] = useState([])
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('all')
  const [form, setForm] = useState({
    job_id: '', invoice_number: '', amount_billed: '',
    amount_received: '0', due_date: '', date_received: '',
    payment_method: 'Check', status: 'outstanding', notes: ''
  })

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const [collectionsRes, jobsRes] = await Promise.all([
      supabase.from('collections').select('*, jobs(client_name, job_address)').order('due_date'),
      supabase.from('jobs').select('id, client_name, job_address, contract_price').eq('status', 'active').order('client_name')
    ])
    if (collectionsRes.data) setCollections(collectionsRes.data)
    if (jobsRes.data) setJobs(jobsRes.data)
    setLoading(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.amount_billed) return
    setSaving(true)
    const amountBilled = parseFloat(form.amount_billed) || 0
    const amountReceived = parseFloat(form.amount_received) || 0
    let status = form.status
    if (amountReceived >= amountBilled) status = 'paid'
    else if (amountReceived > 0) status = 'partial'

    const { error } = await supabase.from('collections').insert({
      job_id: form.job_id || null,
      invoice_number: form.invoice_number.trim(),
      amount_billed: amountBilled,
      amount_received: amountReceived,
      due_date: form.due_date || null,
      date_received: form.date_received || null,
      payment_method: form.payment_method,
      status,
      notes: form.notes.trim(),
      created_by: user?.id,
    })
    setSaving(false)
    if (!error) {
      setForm({ job_id: '', invoice_number: '', amount_billed: '', amount_received: '0', due_date: '', date_received: '', payment_method: 'Check', status: 'outstanding', notes: '' })
      setShowForm(false)
      fetchData()
    }
  }

  async function recordPayment(col) {
    const amount = prompt(`Record payment for ${col.jobs?.client_name || 'this invoice'}.\nAmount received ($):`)
    if (!amount || isNaN(parseFloat(amount))) return
    const newReceived = parseFloat(col.amount_received || 0) + parseFloat(amount)
    const newStatus = newReceived >= parseFloat(col.amount_billed) ? 'paid' : 'partial'
    await supabase.from('collections').update({
      amount_received: newReceived,
      status: newStatus,
      date_received: new Date().toISOString().split('T')[0],
    }).eq('id', col.id)
    fetchData()
  }

  async function deleteCollection(id) {
    if (!confirm('Delete this invoice record?')) return
    await supabase.from('collections').delete().eq('id', id)
    fetchData()
  }

  const filtered = filter === 'all' ? collections : collections.filter(c => c.status === filter)

  const totalBilled = collections.reduce((s, c) => s + parseFloat(c.amount_billed || 0), 0)
  const totalReceived = collections.reduce((s, c) => s + parseFloat(c.amount_received || 0), 0)
  const totalOutstanding = totalBilled - totalReceived
  const overdueCount = collections.filter(c => c.status === 'overdue').length

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-700"></div></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Collections</h1>
          <p className="text-sm text-gray-500 mt-0.5">{collections.length} invoices</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : '+ New Invoice'}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="card text-center">
          <p className="text-xs text-gray-500 mb-1">Total Billed</p>
          <p className="font-bold text-gray-900">${totalBilled.toLocaleString()}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500 mb-1">Collected</p>
          <p className="font-bold text-green-700">${totalReceived.toLocaleString()}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500 mb-1">Outstanding</p>
          <p className="font-bold text-yellow-700">${totalOutstanding.toLocaleString()}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500 mb-1">Overdue</p>
          <p className={`font-bold ${overdueCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>{overdueCount}</p>
        </div>
      </div>

      {/* New invoice form */}
      {showForm && (
        <form onSubmit={handleSave} className="card mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">New Invoice</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Linked Job (optional)</label>
              <select className="input" value={form.job_id} onChange={e => setForm(p => ({ ...p, job_id: e.target.value }))}>
                <option value="">-- Select a job --</option>
                {jobs.map(j => <option key={j.id} value={j.id}>{j.client_name} — {j.job_address}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Invoice Number</label>
              <input className="input" value={form.invoice_number} onChange={e => setForm(p => ({ ...p, invoice_number: e.target.value }))} placeholder="INV-001" />
            </div>
            <div>
              <label className="label">Amount Billed ($) *</label>
              <input className="input" type="number" step="0.01" value={form.amount_billed} onChange={e => setForm(p => ({ ...p, amount_billed: e.target.value }))} placeholder="0.00" required />
            </div>
            <div>
              <label className="label">Amount Received ($)</label>
              <input className="input" type="number" step="0.01" value={form.amount_received} onChange={e => setForm(p => ({ ...p, amount_received: e.target.value }))} placeholder="0.00" />
            </div>
            <div>
              <label className="label">Due Date</label>
              <input className="input" type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Date Received</label>
              <input className="input" type="date" value={form.date_received} onChange={e => setForm(p => ({ ...p, date_received: e.target.value }))} />
            </div>
            <div>
              <label className="label">Payment Method</label>
              <select className="input" value={form.payment_method} onChange={e => setForm(p => ({ ...p, payment_method: e.target.value }))}>
                {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                {COLLECTION_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notes</label>
              <textarea className="input resize-none" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Notes..." />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save Invoice'}</button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex gap-1 flex-wrap mb-4">
        {['all', ...COLLECTION_STATUSES].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
              filter === s ? 'bg-green-700 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Collections list */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">💰</p>
          <p className="text-gray-500 mb-4">No invoices found.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">Create First Invoice</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(col => {
            const billed = parseFloat(col.amount_billed || 0)
            const received = parseFloat(col.amount_received || 0)
            const balance = billed - received
            const pct = billed > 0 ? (received / billed) * 100 : 0
            return (
              <div key={col.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 truncate">
                      {col.jobs?.client_name || 'No linked job'}
                    </p>
                    {col.invoice_number && <p className="text-xs text-gray-500">{col.invoice_number}</p>}
                    {col.jobs?.job_address && <p className="text-xs text-gray-400 truncate">{col.jobs.job_address}</p>}
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[col.status]}`}>
                      {col.status.charAt(0).toUpperCase() + col.status.slice(1)}
                    </span>
                    <button onClick={() => deleteCollection(col.id)} className="text-red-300 hover:text-red-500 text-xs">✕</button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className={`h-2 rounded-full ${pct >= 100 ? 'bg-green-500' : pct > 0 ? 'bg-blue-500' : 'bg-gray-300'}`} style={{ width: `${Math.min(pct, 100)}%` }}></div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-xs text-gray-400">Billed</p>
                    <p className="font-semibold text-gray-800 text-sm">${billed.toLocaleString()}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2">
                    <p className="text-xs text-gray-400">Received</p>
                    <p className="font-semibold text-green-700 text-sm">${received.toLocaleString()}</p>
                  </div>
                  <div className={`rounded-lg p-2 ${balance > 0 ? 'bg-yellow-50' : 'bg-gray-50'}`}>
                    <p className="text-xs text-gray-400">Balance</p>
                    <p className={`font-semibold text-sm ${balance > 0 ? 'text-yellow-700' : 'text-gray-400'}`}>${balance.toLocaleString()}</p>
                  </div>
                </div>

                <div className="text-xs text-gray-500 mb-3 space-y-0.5">
                  {col.due_date && <p>📅 Due: {new Date(col.due_date).toLocaleDateString()}</p>}
                  {col.date_received && <p>✅ Paid: {new Date(col.date_received).toLocaleDateString()}</p>}
                  {col.payment_method && <p>💳 {col.payment_method}</p>}
                </div>

                {col.status !== 'paid' && (
                  <button onClick={() => recordPayment(col)} className="btn-primary w-full text-sm">
                    💰 Record Payment
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
