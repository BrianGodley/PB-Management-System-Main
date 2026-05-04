import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { generateBidDoc, downloadBidDoc } from '../lib/generateBidDoc'
import BidDocViewerModal from '../components/BidDocViewerModal'

const BID_STATUSES = ['pending', 'presented', 'sold', 'lost']

const STATUS_SELECT = {
  pending:   'border-yellow-400 text-yellow-800 bg-yellow-50',
  presented: 'border-blue-400 text-blue-800 bg-blue-50',
  sold:      'border-green-500 text-green-800 bg-green-50',
  lost:      'border-red-400 text-red-800 bg-red-50',
}

const STATUS_FILTER = {
  pending:   'bg-yellow-500 text-white',
  presented: 'bg-blue-600 text-white',
  sold:      'bg-green-600 text-white',
  lost:      'bg-red-500 text-white',
}

// Parse "John Smith" → "Smith, John" for default job name
function formatJobName(clientName) {
  if (!clientName) return ''
  const trimmed = clientName.trim()
  if (trimmed.includes(',')) return trimmed // already "Last, First"
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) return parts[0]
  const last  = parts[parts.length - 1]
  const first = parts.slice(0, -1).join(' ')
  return `${last}, ${first}`
}

export default function Bids() {
  const { user } = useAuth()
  const [bids,          setBids]          = useState([])
  const [profiles,      setProfiles]      = useState({})
  const [loading,       setLoading]       = useState(true)
  const [filter,        setFilter]        = useState('all')
  const [search,        setSearch]        = useState('')
  const [updatingId,    setUpdatingId]    = useState(null)
  const [viewingBid, setViewingBid]         = useState(null)
  const [downloadingId, setDownloadingId] = useState(null)

  // Sold modal state
  const [soldModal,    setSoldModal]    = useState(null) // { bidId, bid, jobName, templateId }
  const [savingJob,    setSavingJob]    = useState(false)
  const [templates,    setTemplates]    = useState([])

  useEffect(() => {
    supabase.from('job_templates').select('id, name, auto_trigger, template_folders(*), template_tasks(*)').order('name')
      .then(({ data }) => { if (data) setTemplates(data) })
  }, [])

  // Cascade warning modal state
  const [cascadeModal, setCascadeModal] = useState(null) // { type, title, body, woCount, onConfirm }

  useEffect(() => { fetchBids(); fetchProfiles() }, [])

  async function fetchBids() {
    setLoading(true)
    const { data } = await supabase
      .from('bids')
      .select('*, estimates(estimate_name, created_by)')
      .in('record_type', ['bid'])
      .order('date_submitted', { ascending: false })
    if (data) setBids(data)
    setLoading(false)
  }

  async function fetchProfiles() {
    const { data } = await supabase.from('profiles').select('id, full_name, email')
    if (data) {
      const map = {}
      data.forEach(p => { map[p.id] = p.full_name || p.email || 'Unknown' })
      setProfiles(map)
    }
  }

  // Helper: count work orders associated with a bid via its estimate_id → jobs → work_orders
  async function getBidWOCount(bid) {
    if (!bid?.estimate_id) return 0
    const { data: jobs } = await supabase.from('jobs').select('id').eq('estimate_id', bid.estimate_id)
    if (!jobs?.length) return 0
    const { count } = await supabase
      .from('work_orders')
      .select('id', { count: 'exact', head: true })
      .in('job_id', jobs.map(j => j.id))
    return count || 0
  }

  // Helper: delete work orders for a bid's jobs
  async function deleteBidWorkOrders(bid) {
    if (!bid?.estimate_id) return
    const { data: jobs } = await supabase.from('jobs').select('id').eq('estimate_id', bid.estimate_id)
    if (!jobs?.length) return
    await supabase.from('work_orders').delete().in('job_id', jobs.map(j => j.id))
  }

  async function updateStatus(id, status) {
    if (status === 'sold') {
      // Intercept — show Sold modal to create job
      const bid = bids.find(b => b.id === id)
      const autoTemplate = templates.find(t => t.auto_trigger === 'sold_bid')
      setSoldModal({ bidId: id, bid, jobName: formatJobName(bid?.client_name || ''), templateId: autoTemplate?.id || '' })
      return
    }

    // If current bid IS sold and user is changing it to something else → cascade warning
    const bid = bids.find(b => b.id === id)
    if (bid?.status === 'sold') {
      const woCount = await getBidWOCount(bid)
      setCascadeModal({
        title: 'Mark Bid as Unsold?',
        body: `Changing this bid from Sold to "${status.charAt(0).toUpperCase() + status.slice(1)}" will remove its sold status.`,
        woCount,
        confirmLabel: 'Yes, Mark Unsold',
        onConfirm: async () => {
          if (woCount > 0) await deleteBidWorkOrders(bid)
          setUpdatingId(id)
          await supabase.from('bids').update({ status }).eq('id', id)
          setCascadeModal(null)
          setUpdatingId(null)
          await fetchBids()
        },
      })
      return
    }

    setUpdatingId(id)
    await supabase.from('bids').update({ status }).eq('id', id)
    await fetchBids()
    setUpdatingId(null)
  }

  async function handleSoldSave() {
    const { bidId, bid, jobName } = soldModal
    setSavingJob(true)

    try {
      // Create the job via RPC
      const { data: jobId, error: jobErr } = await supabase.rpc('create_job_from_bid', {
        p_estimate_id:  bid.estimate_id || null,
        p_client_id:    null,
        p_client_name:  bid.client_name || '',
        p_name:         jobName.trim(),
        p_job_address:  bid.job_address || '',
        p_sold_date:    new Date().toISOString(),
        p_total_price:  parseFloat(bid.bid_amount) || 0,
        p_gross_profit: parseFloat(bid.gross_profit) || 0,
        p_gpmd:         parseFloat(bid.gpmd) || 0,
        p_status:       'active',
      })

      if (jobErr) throw new Error(jobErr.message)
      const job = { id: jobId }

      // Apply template folders + tasks if a template was selected
      if (soldModal.templateId) {
        const tmpl = templates.find(t => t.id === soldModal.templateId)
        const folders = (tmpl?.template_folders || []).sort((a, b) => a.sort_order - b.sort_order)
        const tasks   = (tmpl?.template_tasks   || []).sort((a, b) => a.sort_order - b.sort_order)
        if (folders.length) {
          await supabase.from('job_folders').insert(
            folders.map((f, i) => ({
              job_id:      jobId,
              folder_name: f.folder_name,
              folder_type: f.folder_type || 'document',
              template_id: tmpl.id,
              sort_order:  i,
            }))
          )
        }
        if (tasks.length) {
          await supabase.from('job_tasks').insert(
            tasks.map((t, i) => ({
              job_id:      jobId,
              task_name:   t.task_name,
              template_id: tmpl.id,
              sort_order:  i,
              status:      'pending',
            }))
          )
        }
      }

      // Create projects from bid.projects array
      if (bid.projects?.length) {
        for (let i = 0; i < bid.projects.length; i++) {
          await supabase.from('projects').insert({
            job_id:       job.id,
            project_name: bid.projects[i],
            project_type: 'Landscaping',
            sort_order:   i,
          })
        }
      }

      // ── Generate work orders from estimate modules ──────────────────────────
      if (bid.estimate_id) {
        const { data: estProjects } = await supabase
          .from('estimate_projects')
          .select('id, project_name, estimate_modules(*)')
          .eq('estimate_id', bid.estimate_id)
          .order('created_at')

        if (estProjects?.length) {
          const workOrderRows = []

          for (const proj of estProjects) {
            const modules = proj.estimate_modules || []
            for (const mod of modules) {
              const calc        = mod.data?.calc || {}
              const laborHours  = parseFloat(calc.totalHrs   || 0)
              const laborCost   = parseFloat(mod.labor_cost  || calc.laborCost || 0)
              const laborBurden = parseFloat(mod.labor_burden || calc.burden   || 0)
              const manDays     = parseFloat(mod.man_days    || 0)
              const matCost     = parseFloat(mod.material_cost || calc.totalMat || 0)
              const subCost     = parseFloat(mod.sub_cost    || calc.subCost   || 0)
              const totalPrice  = parseFloat(mod.total_price || calc.price     || 0)

              // Crew work order (always create if there's any labor or material)
              if (laborCost > 0 || manDays > 0 || matCost > 0) {
                workOrderRows.push({
                  job_id:             job.id,
                  estimate_module_id: mod.id,
                  project_name:       proj.project_name,
                  module_type:        mod.module_type,
                  is_subcontractor:   false,
                  man_days:           manDays,
                  labor_hours:        laborHours,
                  material_cost:      matCost,
                  sub_cost:           0,
                  labor_cost:         laborCost,
                  labor_burden:       laborBurden,
                  total_price:        totalPrice - subCost,
                  status:             'pending',
                })
              }

              // Subcontractor work order (separate card if sub cost exists)
              if (subCost > 0) {
                workOrderRows.push({
                  job_id:             job.id,
                  estimate_module_id: mod.id,
                  project_name:       proj.project_name,
                  module_type:        mod.module_type,
                  is_subcontractor:   true,
                  man_days:           0,
                  labor_hours:        0,
                  material_cost:      0,
                  sub_cost:           subCost,
                  labor_cost:         0,
                  labor_burden:       0,
                  total_price:        subCost,
                  status:             'pending',
                })
              }
            }
          }

          if (workOrderRows.length > 0) {
            await supabase.from('work_orders').insert(workOrderRows)
          }
        }
      }
      // ── End work order generation ───────────────────────────────────────────

      // Mark bid as sold
      await supabase.from('bids').update({ status: 'sold' }).eq('id', bidId)

    } catch (err) {
      alert('Error creating job: ' + err.message)
    }

    setSoldModal(null)
    setSavingJob(false)
    await fetchBids()
  }

  async function handleSoldCancel() {
    const { bidId } = soldModal
    setSoldModal(null)
    // Revert bid to Presented
    setUpdatingId(bidId)
    await supabase.from('bids').update({ status: 'presented' }).eq('id', bidId)
    await fetchBids()
    setUpdatingId(null)
  }

  async function downloadBid(bid) {
    if (!bid.estimate_id) return alert('This bid has no linked estimate.')
    setDownloadingId(bid.id)
    try {
      const { data: est } = await supabase.from('estimates').select('*').eq('id', bid.estimate_id).single()
      const { data: projs } = await supabase
        .from('estimate_projects')
        .select('*, estimate_modules(*)')
        .eq('estimate_id', bid.estimate_id)
        .order('created_at')
      const blob = await generateBidDoc(est, projs || [], bid.job_address || '')
      const safeName = (est?.estimate_name || bid.client_name || 'Bid').replace(/[^a-z0-9]/gi, '_')
      downloadBidDoc(blob, `${safeName}_Bid_${bid.date_submitted}.docx`)
    } catch (err) {
      alert('Error generating bid doc: ' + err.message)
    }
    setDownloadingId(null)
  }

  async function deleteBid(id) {
    const bid = bids.find(b => b.id === id)
    const woCount = await getBidWOCount(bid)
    setCascadeModal({
      title: 'Delete This Bid?',
      body: 'This will permanently delete this bid. The associated job will remain in the Jobs table.',
      woCount,
      confirmLabel: 'Delete Bid',
      confirmDanger: true,
      onConfirm: async () => {
        if (woCount > 0) await deleteBidWorkOrders(bid)
        await supabase.from('bids').delete().eq('id', id)
        setCascadeModal(null)
        fetchBids()
      },
    })
  }

  const filtered = bids.filter(b => {
    const matchStatus = filter === 'all' || b.status === filter
    const matchSearch = b.client_name.toLowerCase().includes(search.toLowerCase()) ||
      (b.job_address || '').toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const totalBidValue = bids.filter(b => b.status !== 'lost').reduce((s, b) => s + parseFloat(b.bid_amount || 0), 0)
  const soldValue     = bids.filter(b => b.status === 'sold').reduce((s, b) => s + parseFloat(b.bid_amount || 0), 0)
  const decided       = bids.filter(b => b.status === 'sold' || b.status === 'lost').length
  const closeRate     = decided > 0 ? (bids.filter(b => b.status === 'sold').length / decided * 100) : 0

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-700" />
    </div>
  )

  return (
    <div>
      {/* ── Sold → Create Job Modal ─────────────────────────────────── */}
      {soldModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">🏗️</span>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Create Job from Bid</h2>
                <p className="text-sm text-gray-500">Marking this bid as <span className="text-green-700 font-semibold">Sold</span> will create a new Job.</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-4 text-sm text-gray-600 space-y-1">
              <p><span className="text-gray-400">Client:</span> {soldModal.bid?.client_name}</p>
              <p><span className="text-gray-400">Contract:</span> ${parseFloat(soldModal.bid?.bid_amount || 0).toLocaleString()}</p>
              {soldModal.bid?.projects?.length > 0 && (
                <p><span className="text-gray-400">Projects:</span> {soldModal.bid.projects.join(', ')}</p>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Job Name</label>
              <input
                type="text"
                value={soldModal.jobName}
                onChange={e => setSoldModal(prev => ({ ...prev, jobName: e.target.value }))}
                className="input w-full"
                placeholder="Smith, John"
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-1">Auto-filled as Last, First — edit freely.</p>
            </div>

            {templates.length > 0 && (
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Apply Template</label>
                <select
                  value={soldModal.templateId}
                  onChange={e => setSoldModal(prev => ({ ...prev, templateId: e.target.value }))}
                  className="input w-full"
                >
                  <option value="">No template</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}{t.auto_trigger === 'sold_bid' ? ' (Auto)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">Folders from this template will be created on the new job.</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleSoldSave}
                disabled={savingJob || !soldModal.jobName.trim()}
                className="flex-1 bg-green-700 text-white font-semibold py-2 rounded-lg hover:bg-green-800 transition-colors disabled:opacity-50"
              >
                {savingJob ? 'Creating Job…' : '✓ Save & Create Job'}
              </button>
              <div className="flex flex-col items-center gap-0.5">
                <button
                  onClick={handleSoldCancel}
                  disabled={savingJob}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <p className="text-[10px] text-gray-400 text-center leading-tight max-w-[100px]">
                  Reverts bid to Presented
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Cascade Warning Modal ─────────────────────────────────────── */}
      {cascadeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">⚠️</span>
              <h2 className="text-lg font-bold text-gray-900">{cascadeModal.title}</h2>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 space-y-2 text-sm">
              <p className="text-gray-700">{cascadeModal.body}</p>
              {cascadeModal.woCount > 0 && (
                <p className="font-semibold text-red-600">
                  ⚠️ {cascadeModal.woCount} Work Order{cascadeModal.woCount !== 1 ? 's' : ''} associated with this bid will also be deleted.
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setCascadeModal(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={cascadeModal.onConfirm}
                className={`flex-1 font-semibold py-2 rounded-lg transition-colors ${
                  cascadeModal.confirmDanger
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-amber-600 text-white hover:bg-amber-700'
                }`}
              >
                {cascadeModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4 flex-shrink-0 gap-3">
        <h1 className="text-xl font-bold text-gray-900">Bids</h1>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card text-center">
          <p className="text-xs text-gray-500 mb-1">Pipeline Value</p>
          <p className="font-bold text-gray-900">${totalBidValue.toLocaleString()}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500 mb-1">Sold Value</p>
          <p className="font-bold text-green-700">${soldValue.toLocaleString()}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500 mb-1">Close Rate</p>
          <p className="font-bold text-blue-700">{closeRate.toFixed(0)}%</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input type="text" placeholder="Search bids..." value={search}
          onChange={e => setSearch(e.target.value)} className="input sm:max-w-xs" />
        <div className="flex gap-1 flex-wrap">
          {['all', ...BID_STATUSES].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${filter === s ? (STATUS_FILTER[s] || 'bg-green-700 text-white') : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'}`}>
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-gray-500 mb-4">No bids found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Client</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Bid Doc</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 w-72" style={{ width: '288px' }}>Projects</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Created</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Estimated By</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Gross Profit</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">GPMD</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Bid Amount</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Status</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Delete</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((bid, i) => {
                const currentStatus = bid.status || 'pending'
                const isUpdating = updatingId === bid.id
                return (
                  <tr key={bid.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{bid.estimates?.estimate_name || bid.client_name}</p>
                      <p className="text-xs text-gray-500">{bid.client_name}</p>
                      {bid.job_address && <p className="text-xs text-gray-400 truncate max-w-[180px]">{bid.job_address}</p>}
                      {bid.salesperson && <p className="text-xs text-gray-400">👤 {bid.salesperson}</p>}
                      {bid.estimate_id && (
                        <Link to={`/estimates/${bid.estimate_id}`} className="text-xs text-green-700 hover:underline">📋 View Estimate</Link>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setViewingBid(bid)}
                        disabled={!bid.estimate_id}
                        title={bid.estimate_id ? 'View bid doc' : 'No linked estimate'}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-400 hover:border-green-400 hover:text-green-600 hover:bg-green-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <span className="text-base">📄</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 align-top" style={{ width: '288px', maxWidth: '288px' }}>
                      {bid.projects && bid.projects.length > 0 ? (
                        <div className="flex flex-wrap gap-1" style={{ width: '256px' }}>
                          {bid.projects.map((proj, j) => (
                            <span key={j} className="text-xs px-2 py-0.5 bg-green-50 text-green-800 border border-green-200 rounded-full break-words">{proj}</span>
                          ))}
                        </div>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(bid.date_submitted).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-sm">
                      {bid.estimates?.created_by
                        ? (profiles[bid.estimates.created_by] || '—')
                        : bid.created_by
                          ? (profiles[bid.created_by] || '—')
                          : bid.salesperson || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap font-semibold text-green-700">
                      {bid.gross_profit > 0 ? `$${Math.round(bid.gross_profit).toLocaleString()}` : <span className="text-gray-300 font-normal">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap text-gray-700">
                      {bid.gpmd > 0 ? `$${Math.round(bid.gpmd).toLocaleString()}` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900 whitespace-nowrap">
                      ${parseFloat(bid.bid_amount || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <select
                        value={currentStatus}
                        disabled={isUpdating}
                        onChange={e => updateStatus(bid.id, e.target.value)}
                        className={`text-xs font-semibold rounded-full px-3 py-1 border-2 cursor-pointer appearance-none text-center transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-40 ${STATUS_SELECT[currentStatus] || STATUS_SELECT.pending}`}
                      >
                        {BID_STATUSES.map(s => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => deleteBid(bid.id)}
                        className="text-xs px-2 py-1 rounded border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors">✕</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {viewingBid && (
        <BidDocViewerModal
          bid={viewingBid}
          onClose={() => setViewingBid(null)}
        />
      )}
    </div>
  )
}
