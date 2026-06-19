import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import NewEstimateModal from '../components/NewEstimateModal'
import { IfModule } from '../platform'
import BidDocViewerModal from '../components/BidDocViewerModal'
import ConsultantPicker from '../components/ConsultantPicker'
import EDocuments from './EDocuments'
import { useAuth } from '../contexts/AuthContext'

const BID_STATUS_STYLES = {
  pending: 'bg-yellow-50  text-yellow-800 border border-yellow-300',
  presented: 'bg-blue-50    text-blue-800   border border-blue-300',
  sold: 'bg-green-50   text-green-800  border border-green-400',
  lost: 'bg-red-50     text-red-800    border border-red-300',
}

function displayName(c) {
  if (!c) return ''
  if (c.last_name || c.first_name) return [c.last_name, c.first_name].filter(Boolean).join(', ')
  return c.name || ''
}

const US_STATES = [
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DE',
  'FL',
  'GA',
  'HI',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY',
]

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [client, setClient] = useState(null)
  const [estimates, setEstimates] = useState([])
  const [bids, setBids] = useState([])
  const [soldJobs, setSoldJobs] = useState([])
  const [jobCOs, setJobCOs] = useState({})
  const [loading, setLoading] = useState(true)
  const [showEstimateModal, setShowEstimateModal] = useState(false)
  const [viewingBid, setViewingBid] = useState(null)
  const [profiles, setProfiles] = useState({})
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({})
  const [deleteModal, setDeleteModal] = useState(null)
  // Resolved consultant employee (for the read-only display card). Loaded
  // alongside the client whenever consultant_employee_id is set.
  const [consultantEmp, setConsultantEmp] = useState(null)
  // Consultant-prompt modal — set when the user kicks off a new estimate
  // on an opportunity that doesn't yet have a consultant. Holds the
  // estimate-creation data so we can resume after the user picks.
  // Shape: { estimateData, suggestedEmployeeId } | null
  const [consultantPrompt, setConsultantPrompt] = useState(null)
  const [promptPick, setPromptPick] = useState(null)
  const [promptSaving, setPromptSaving] = useState(false)

  useEffect(() => {
    fetchData()
  }, [id])

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, email')
      if (!data) return
      const map = {}
      for (const p of data) map[p.id] = p.full_name || (p.email ? p.email.split('@')[0] : '—')
      setProfiles(map)
    })()
  }, [])

  async function fetchData() {
    setLoading(true)
    const { data: clientData } = await supabase.from('clients').select('*').eq('id', id).single()
    if (clientData) {
      setClient(clientData)
      setForm(clientData)

      // Resolve consultant employee (id → name) so the display card has a
      // value without a join. Clears when no consultant is assigned.
      if (clientData.consultant_employee_id) {
        const { data: emp } = await supabase
          .from('employees')
          .select('id, first_name, last_name')
          .eq('id', clientData.consultant_employee_id)
          .maybeSingle()
        setConsultantEmp(emp || null)
      } else {
        setConsultantEmp(null)
      }

      const { data: estData } = await supabase
        .from('estimates')
        .select(
          `id, estimate_name, type, status, created_at, version, parent_estimate_id,
          estimate_projects(sub_gp_markup_rate, estimate_modules(man_days,material_cost,labor_cost,labor_burden,gross_profit,sub_cost,total_price))`
        )
        .eq('client_name', clientData.name)
        .order('created_at', { ascending: false })

      const { data: bidsData } = await supabase
        .from('bids')
        .select(
          'id, client_name, status, bid_amount, estimate_id, date_submitted, projects, gross_profit, gpmd, estimates(estimate_name, created_by)'
        )
        .eq('client_name', clientData.name)
        .in('record_type', ['bid'])
        .order('date_submitted', { ascending: false })

      if (bidsData) setBids(bidsData)

      const { data: jobsData } = await supabase
        .from('jobs')
        .select('*')
        .eq('client_name', clientData.name)
        .order('sold_date', { ascending: false })

      if (jobsData) {
        setSoldJobs(jobsData)
        let coEstimateIds = new Set()
        if (jobsData.length > 0) {
          const { data: coData } = await supabase
            .from('bids')
            .select(
              'id, co_name, co_type, status, bid_amount, gross_profit, date_submitted, linked_job_id, estimate_id'
            )
            .eq('record_type', 'change_order')
            .in(
              'linked_job_id',
              jobsData.map(j => j.id)
            )
            .order('date_submitted', { ascending: false })
          if (coData) {
            coEstimateIds = new Set(coData.map(co => co.estimate_id).filter(Boolean))
            const coMap = {}
            coData.forEach(co => {
              if (!coMap[co.linked_job_id]) coMap[co.linked_job_id] = []
              coMap[co.linked_job_id].push(co)
            })
            setJobCOs(coMap)
          }
        }
        if (estData)
          setEstimates(
            estData.filter(e => !coEstimateIds.has(e.id) && (e.estimate_name || '').trim() !== '')
          )
      } else {
        if (estData) setEstimates(estData.filter(e => (e.estimate_name || '').trim() !== ''))
      }
    }
    setLoading(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const combined = [form.first_name?.trim(), form.last_name?.trim()].filter(Boolean).join(' ')
    const splitMulti = raw =>
      raw
        ? raw
            .split(/[\n,]+/)
            .map(s => s.trim())
            .filter(Boolean)
        : null
    const addlEmails = splitMulti(form._additionalEmailsRaw)
    const addlPhones = splitMulti(form._additionalPhonesRaw)
    const { error } = await supabase
      .from('clients')
      .update({
        first_name: form.first_name?.trim() || null,
        last_name: form.last_name?.trim() || null,
        spouse_first_name: form.spouse_first_name?.trim() || null,
        spouse_last_name: form.spouse_last_name?.trim() || null,
        name: combined || form.name?.trim(),
        company_name: form.company_name?.trim() || null,
        company_position: form.company_position?.trim() || null,
        email: form.email?.trim() || null,
        phone: form.phone?.trim() || null,
        cell: form.cell?.trim() || null,
        additional_emails: addlEmails && addlEmails.length ? addlEmails : null,
        additional_phones: addlPhones && addlPhones.length ? addlPhones : null,
        street: form.street?.trim() || null,
        city: form.city?.trim() || null,
        state: form.state || null,
        zip: form.zip?.trim() || null,
        notes: form.notes?.trim() || null,
        consultant_employee_id: form.consultant_employee_id ?? null,
      })
      .eq('id', id)
    setSaving(false)
    if (!error) {
      setClient({
        ...client,
        ...form,
        name: combined || form.name?.trim(),
        // Reflect the parsed arrays in local state (form holds raw strings).
        additional_emails: addlEmails && addlEmails.length ? addlEmails : null,
        additional_phones: addlPhones && addlPhones.length ? addlPhones : null,
        cell: form.cell?.trim() || null,
      })
      // Refresh the resolved consultant employee for the display card —
      // the user may have just changed it.
      const newConsultantId = form.consultant_employee_id ?? null
      if (newConsultantId) {
        const { data: emp } = await supabase
          .from('employees')
          .select('id, first_name, last_name')
          .eq('id', newConsultantId)
          .maybeSingle()
        setConsultantEmp(emp || null)
      } else {
        setConsultantEmp(null)
      }
      setEditing(false)
    }
  }

  // Estimate "Next" — if the opportunity already has a consultant, jump
  // straight to creating the estimate. If not, open the consultant prompt
  // first; the user must assign someone before the estimate is created.
  async function handleEstimateNext(data) {
    if (client.consultant_employee_id) {
      return createEstimateRow(data)
    }
    // Default the prompt to the logged-in user — but only if they're a
    // Design or Installation Consultant themselves. Otherwise the picker
    // opens with no selection and the user picks manually.
    let suggestedEmployeeId = null
    if (user?.id) {
      const { data: myEmp } = await supabase
        .from('employees')
        .select('id, status, employee_positions(positions(title))')
        .eq('user_id', user.id)
        .maybeSingle()
      const titles = (myEmp?.employee_positions || [])
        .map(r => r.positions?.title)
        .filter(Boolean)
      const isConsultant = titles.some(
        t => t === 'Design Consultant' || t === 'Installation Consultant',
      )
      if (myEmp?.id && myEmp.status === 'active' && isConsultant) {
        suggestedEmployeeId = myEmp.id
      }
    }
    setPromptPick(suggestedEmployeeId)
    setConsultantPrompt({ estimateData: data, suggestedEmployeeId })
  }

  // Actually insert the estimate row + navigate. Used both for the no-prompt
  // path and after the consultant prompt resolves.
  async function createEstimateRow(data) {
    const { data: est, error } = await supabase
      .from('estimates')
      .insert({
        estimate_name: data.name,
        type: data.type,
        client_name: client.name,
        client_id: client.id,
        status: 'pending',
      })
      .select()
      .single()
    if (error) {
      alert(`Error: ${error.message}`)
      return
    }
    if (est) {
      setShowEstimateModal(false)
      navigate(`/estimates/${est.id}`)
    }
  }

  // Save the picked consultant onto the client, refresh local state, then
  // resume the estimate creation we paused in handleEstimateNext.
  async function confirmConsultantPrompt() {
    if (!promptPick || !consultantPrompt) return
    setPromptSaving(true)
    const { error } = await supabase
      .from('clients')
      .update({ consultant_employee_id: promptPick })
      .eq('id', id)
    if (error) {
      setPromptSaving(false)
      alert(`Could not save consultant: ${error.message}`)
      return
    }
    // Refresh local client + display card
    setClient(prev => ({ ...prev, consultant_employee_id: promptPick }))
    const { data: emp } = await supabase
      .from('employees')
      .select('id, first_name, last_name')
      .eq('id', promptPick)
      .maybeSingle()
    setConsultantEmp(emp || null)
    setPromptSaving(false)
    const { estimateData } = consultantPrompt
    setConsultantPrompt(null)
    setPromptPick(null)
    await createEstimateRow(estimateData)
  }

  async function handleDelete() {
    const clientName =
      client.name || [client.first_name, client.last_name].filter(Boolean).join(' ')
    const [{ data: ests }, { data: bidsData }, { data: jobsData }] = await Promise.all([
      supabase.from('estimates').select('id').or(`client_name.eq.${clientName},client_id.eq.${id}`),
      supabase.from('bids').select('id').eq('client_name', clientName),
      supabase.from('jobs').select('id').eq('client_name', clientName),
    ])
    let woCount = 0
    if (jobsData?.length) {
      const { count } = await supabase
        .from('work_orders')
        .select('id', { count: 'exact', head: true })
        .in(
          'job_id',
          jobsData.map(j => j.id)
        )
      woCount = count || 0
    }
    setDeleteModal({
      estCount: ests?.length || 0,
      bidCount: bidsData?.length || 0,
      woCount,
      onConfirm: async () => {
        if (jobsData?.length)
          await supabase
            .from('work_orders')
            .delete()
            .in(
              'job_id',
              jobsData.map(j => j.id)
            )
        if (bidsData?.length)
          await supabase
            .from('bids')
            .delete()
            .in(
              'id',
              bidsData.map(b => b.id)
            )
        if (ests?.length)
          await supabase
            .from('estimates')
            .delete()
            .in(
              'id',
              ests.map(e => e.id)
            )
        await supabase.from('clients').delete().eq('id', id)
        navigate('/clients')
      },
    })
  }

  function sumModules(est, field) {
    return (est.estimate_projects || []).reduce(
      (s, proj) =>
        s + (proj.estimate_modules || []).reduce((ms, mod) => ms + parseFloat(mod[field] || 0), 0),
      0
    )
  }

  function estimateTotals(est) {
    const man_days = sumModules(est, 'man_days')
    const labor_burden = sumModules(est, 'labor_burden')
    const material_cost = sumModules(est, 'material_cost')
    const sub_cost = sumModules(est, 'sub_cost')
    const moduleGp = sumModules(est, 'gross_profit')
    const moduleTotal = sumModules(est, 'total_price')

    // Per-project sub-GP markup (default 20%). The module-level total_price
    // doesn't carry this — it's added at the project level — so we add it
    // back here so the row matches the Estimate Totals bar in EstimateDetail.
    const subGp = (est.estimate_projects || []).reduce((s, proj) => {
      const projSub = (proj.estimate_modules || []).reduce(
        (ms, mod) => ms + parseFloat(mod.sub_cost || 0),
        0
      )
      const rate = proj.sub_gp_markup_rate ?? 0.2
      return s + projSub * rate
    }, 0)
    const subGpCommission = subGp * 0.12

    const gross_profit = moduleGp + subGp
    const total_price = moduleTotal + subGp + subGpCommission
    const gpmd = man_days > 0 ? gross_profit / man_days : 0
    return { man_days, labor_burden, material_cost, sub_cost, gross_profit, total_price, gpmd }
  }

  const fmt = v => `$${Math.round(v).toLocaleString()}`

  if (loading)
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-700" />
      </div>
    )
  if (!client)
    return <div className="card text-center py-12 text-gray-500">Opportunity not found.</div>

  // Change-order rollups across every CO on every job. COs are additive on
  // top of the original job revenue / gross profit.
  const allCOs = Object.values(jobCOs).flat()
  const coRevenue = allCOs.reduce((s, co) => s + parseFloat(co.bid_amount || 0), 0)
  const coGP = allCOs.reduce((s, co) => s + parseFloat(co.gross_profit || 0), 0)
  const totalRevenue = soldJobs.reduce((s, j) => s + parseFloat(j.total_price || 0), 0) + coRevenue
  const totalGP = soldJobs.reduce((s, j) => s + parseFloat(j.gross_profit || 0), 0) + coGP
  const totalCOs = allCOs.length
  const initials = (
    (client.first_name || client.last_name || client.name || '?')[0] + (client.last_name?.[0] || '')
  ).toUpperCase()

  return (
    <div className="flex flex-col h-full">
      {/* ── Delete Modal ── */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">⚠️</span>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Delete Opportunity?</h2>
                <p className="text-sm text-gray-500">This cannot be undone.</p>
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm space-y-1.5">
              <p className="text-gray-700 font-medium">
                Deleting{' '}
                <span className="font-bold text-gray-900">
                  {displayName(client) || client.name}
                </span>{' '}
                will permanently remove:
              </p>
              <ul className="text-red-700 space-y-0.5 mt-2">
                {deleteModal.estCount > 0 && (
                  <li>
                    • {deleteModal.estCount} Estimate{deleteModal.estCount !== 1 ? 's' : ''}
                  </li>
                )}
                {deleteModal.bidCount > 0 && (
                  <li>
                    • {deleteModal.bidCount} Bid{deleteModal.bidCount !== 1 ? 's' : ''}
                  </li>
                )}
                {deleteModal.woCount > 0 && (
                  <li>
                    • {deleteModal.woCount} Work Order{deleteModal.woCount !== 1 ? 's' : ''}
                  </li>
                )}
                {!deleteModal.estCount && !deleteModal.bidCount && !deleteModal.woCount && (
                  <li className="text-gray-500">No associated estimates, bids, or work orders.</li>
                )}
              </ul>
              <p className="text-xs text-red-600 font-semibold mt-2">This cannot be undone.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-600 font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={deleteModal.onConfirm}
                className="flex-1 bg-red-600 text-white font-semibold py-2 rounded-lg hover:bg-red-700"
              >
                Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Top nav bar ── */}
      <div className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl flex-shrink-0 mx-3 mt-3">
        <button
          onClick={() => navigate('/clients')}
          className="text-gray-900 hover:text-gray-600 text-sm font-medium"
        >
          Opportunities
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-semibold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md">
          {[client.first_name, client.last_name].filter(Boolean).join(' ') ||
            client.name ||
            'Unnamed'}
        </span>
      </div>

      {/* ── Padded wrapper → rounded slate block ── */}
      <div className="flex-1 min-h-0 p-3">
        <div className="h-full bg-slate-200 rounded-xl overflow-hidden">
          <div className="h-full grid grid-cols-1 lg:grid-cols-[20rem_1fr] overflow-y-auto lg:overflow-hidden">
            {/* ══ LEFT COLUMN ══════════════════════════════════════════════ */}
            <div className="lg:border-r border-slate-300 bg-slate-200 lg:overflow-y-auto">
              <div className="p-3 space-y-2">
                {/* Identity card */}
                <div className="bg-white border border-slate-300 rounded-xl p-4 shadow-sm">
                  {editing ? (
                    <form onSubmit={handleSave} className="space-y-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                          Edit Opportunity
                        </p>
                        <button
                          type="button"
                          onClick={() => setEditing(false)}
                          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
                        >
                          ✕
                        </button>
                      </div>
                      {[
                        { label: 'First Name', key: 'first_name', type: 'text' },
                        { label: 'Last Name', key: 'last_name', type: 'text' },
                        { label: 'Spouse / Partner First', key: 'spouse_first_name', type: 'text' },
                        { label: 'Spouse / Partner Last', key: 'spouse_last_name', type: 'text' },
                        { label: 'Company', key: 'company_name', type: 'text' },
                        { label: 'Position', key: 'company_position', type: 'text' },
                        { label: 'Email', key: 'email', type: 'email' },
                        { label: 'Phone', key: 'phone', type: 'tel' },
                        { label: 'Cell', key: 'cell', type: 'tel' },
                        { label: 'Street', key: 'street', type: 'text' },
                        { label: 'City', key: 'city', type: 'text' },
                        { label: 'Zip', key: 'zip', type: 'text' },
                      ].map(f => (
                        <div key={f.key}>
                          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                            {f.label}
                          </label>
                          <input
                            type={f.type}
                            className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600"
                            value={form[f.key] || ''}
                            onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                          />
                        </div>
                      ))}
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                          Additional Emails{' '}
                          <span className="font-normal normal-case text-gray-400">
                            (one per line)
                          </span>
                        </label>
                        <textarea
                          className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-600/30"
                          rows={2}
                          value={form._additionalEmailsRaw || ''}
                          onChange={e =>
                            setForm(p => ({ ...p, _additionalEmailsRaw: e.target.value }))
                          }
                          placeholder="extra@example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                          Additional Phones{' '}
                          <span className="font-normal normal-case text-gray-400">
                            (one per line)
                          </span>
                        </label>
                        <textarea
                          className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-600/30"
                          rows={2}
                          value={form._additionalPhonesRaw || ''}
                          onChange={e =>
                            setForm(p => ({ ...p, _additionalPhonesRaw: e.target.value }))
                          }
                          placeholder="(555) 555-5555"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                          State
                        </label>
                        <select
                          className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/30"
                          value={form.state || ''}
                          onChange={e => setForm(p => ({ ...p, state: e.target.value }))}
                        >
                          <option value="">-- State --</option>
                          {US_STATES.map(s => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                          Notes
                        </label>
                        <textarea
                          className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-600/30"
                          rows={2}
                          value={form.notes || ''}
                          onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                        />
                      </div>
                      {/* Assigned Consultant — Design or Installation Consultant */}
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                          Assigned Consultant
                        </label>
                        <ConsultantPicker
                          value={form.consultant_employee_id || null}
                          onChange={empId =>
                            setForm(p => ({ ...p, consultant_employee_id: empId }))
                          }
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          type="submit"
                          disabled={saving}
                          className="flex-1 py-1.5 rounded-lg bg-green-700 text-white text-xs font-semibold hover:bg-green-800 disabled:opacity-50"
                        >
                          {saving ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing(false)}
                          className="flex-1 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full bg-green-100 border border-green-200 flex items-center justify-center text-green-800 font-bold text-base flex-shrink-0">
                            {initials}
                          </div>
                          <div>
                            <h2 className="text-base font-bold text-gray-900 leading-tight">
                              {displayName(client) || client.name}
                            </h2>
                            {(client.spouse_first_name || client.spouse_last_name) && (
                              <p className="text-xs text-gray-700 mt-0.5">
                                &amp;{' '}
                                {[client.spouse_first_name, client.spouse_last_name]
                                  .filter(Boolean)
                                  .join(' ')}
                              </p>
                            )}
                            {client.company_name && (
                              <p className="text-xs text-gray-500 mt-0.5">
                                {client.company_name}
                                {client.company_position ? ` · ${client.company_position}` : ''}
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            // Hydrate textarea-backed fields from the array columns.
                            setForm(() => ({
                              ...client,
                              _additionalEmailsRaw: Array.isArray(client.additional_emails)
                                ? client.additional_emails.join('\n')
                                : '',
                              _additionalPhonesRaw: Array.isArray(client.additional_phones)
                                ? client.additional_phones.join('\n')
                                : '',
                            }))
                            setEditing(true)
                          }}
                          className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-slate-100 transition-colors"
                          title="Edit"
                        >
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <path
                              d="M11.5 1.5a1.414 1.414 0 0 1 2 2L5 12l-3 1 1-3 8.5-8.5z"
                              stroke="currentColor"
                              strokeWidth="1.4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        {(client.street || client.city) && (
                          <div className="flex items-start gap-1.5 text-gray-700">
                            <span className="flex-shrink-0 mt-0.5">📍</span>
                            <span className="font-semibold">
                              {[
                                client.street,
                                [client.city, client.state, client.zip].filter(Boolean).join(' '),
                              ]
                                .filter(Boolean)
                                .join(', ')}
                            </span>
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center gap-1.5">
                            <span>📞</span>
                            <a
                              href={`tel:${client.phone}`}
                              className="font-semibold text-gray-900 hover:text-green-700"
                            >
                              {client.phone}
                            </a>
                          </div>
                        )}
                        {client.cell && (
                          <div className="flex items-center gap-1.5">
                            <span>📱</span>
                            <a
                              href={`tel:${client.cell}`}
                              className="font-semibold text-gray-900 hover:text-green-700"
                            >
                              {client.cell}
                            </a>
                          </div>
                        )}
                        {Array.isArray(client.additional_phones) &&
                          client.additional_phones.filter(Boolean).map((p, i) => (
                            <div key={`phn-${i}`} className="flex items-center gap-1.5">
                              <span>📞</span>
                              <a
                                href={`tel:${p}`}
                                className="font-semibold text-gray-700 hover:text-green-700"
                              >
                                {p}
                              </a>
                            </div>
                          ))}
                        {client.email && (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="flex-shrink-0">✉️</span>
                            <a
                              href={`mailto:${client.email}`}
                              className="font-semibold text-gray-900 hover:text-green-700 truncate"
                            >
                              {client.email}
                            </a>
                          </div>
                        )}
                        {Array.isArray(client.additional_emails) &&
                          client.additional_emails.filter(Boolean).map((e, i) => (
                            <div key={`em-${i}`} className="flex items-center gap-1.5 min-w-0">
                              <span className="flex-shrink-0">✉️</span>
                              <a
                                href={`mailto:${e}`}
                                className="font-semibold text-gray-700 hover:text-green-700 truncate"
                              >
                                {e}
                              </a>
                            </div>
                          ))}
                        {client.notes && (
                          <div className="pt-2 border-t border-slate-100">
                            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                              Notes
                            </p>
                            <p className="font-semibold text-gray-700 leading-relaxed">
                              {client.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Consultant card — sits below the identity card. Shows
                    the employee currently assigned as this opportunity's
                    consultant; edit via the identity card's pencil icon. */}
                <div className="bg-white border border-slate-300 rounded-xl p-4 shadow-sm">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Consultant
                  </p>
                  {consultantEmp ? (
                    <p className="text-sm font-semibold text-gray-800">
                      {[consultantEmp.first_name, consultantEmp.last_name]
                        .filter(Boolean)
                        .join(' ')}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 italic">
                      No consultant assigned. Click the pencil on the card above to assign one.
                    </p>
                  )}
                </div>

                {/* Stats card */}
                {/* Summary (estimates/bids/jobs/COs/revenue) — Contractor package */}
                <IfModule module={['/bids', '/jobs']}>
                <div className="bg-white border border-slate-300 rounded-xl p-4 shadow-sm">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2.5">
                    Summary
                  </p>
                  <div className="grid grid-cols-4 gap-1.5 mb-3">
                    {[
                      {
                        label: 'Ests',
                        count: estimates.length,
                        color: 'bg-gray-50   text-gray-700  border-gray-200',
                      },
                      {
                        label: 'Bids',
                        count: bids.length,
                        color: 'bg-blue-50   text-blue-700  border-blue-200',
                      },
                      {
                        label: 'Jobs',
                        count: soldJobs.length,
                        color: 'bg-green-50  text-green-800 border-green-200',
                      },
                      {
                        label: 'C/Os',
                        count: totalCOs,
                        color: 'bg-orange-50 text-orange-700 border-orange-200',
                      },
                    ].map(s => (
                      <div
                        key={s.label}
                        className={`flex flex-col items-center py-2 rounded-lg border text-center ${s.color}`}
                      >
                        <span className="text-lg font-bold leading-none">{s.count}</span>
                        <span className="text-[9px] font-semibold uppercase tracking-wide mt-0.5 opacity-70">
                          {s.label}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1.5 border-t border-slate-100 pt-2.5">
                    {[
                      { label: 'Total Revenue', value: fmt(totalRevenue), highlight: false },
                      { label: 'Total GP', value: fmt(totalGP), highlight: true },
                    ].map(r => (
                      <div key={r.label} className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">{r.label}</span>
                        <span
                          className={`font-bold ${r.highlight ? 'text-green-700' : 'text-gray-900'}`}
                        >
                          {r.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                </IfModule>

                {/* Actions card — "+ New Estimate" was removed from here
                    because the Estimates section on the right already has
                    its own + New Estimate button. */}
                <div className="bg-white border border-slate-300 rounded-xl p-3 shadow-sm">
                  <button
                    onClick={handleDelete}
                    className="w-full py-2 rounded-lg border border-red-200 text-red-500 text-xs font-semibold hover:bg-red-50 hover:border-red-300 transition-colors"
                  >
                    Delete Opportunity
                  </button>
                </div>
              </div>
            </div>

            {/* ══ RIGHT COLUMN ═════════════════════════════════════════════ */}
            <div className="bg-slate-200 lg:overflow-y-auto">
              <div className="p-3 space-y-3">
                {/* ── Estimates ── (Contractor package) */}
                <IfModule module={['/bids', '/jobs']}>
                <div className="bg-white border border-slate-300 rounded-xl shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-gray-700">Estimates</h3>
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold">
                        {estimates.length}
                      </span>
                    </div>
                    {/* Estimating belongs to the Contractor package; hide the
                        action for tenants without it (Opportunities stays as CRM). */}
                    <IfModule module={['/bids', '/jobs']}>
                      <button
                        onClick={() => setShowEstimateModal(true)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-green-700 text-white font-semibold hover:bg-green-800 transition-colors"
                      >
                        + New Estimate
                      </button>
                    </IfModule>
                  </div>
                  {estimates.length === 0 ? (
                    <p className="text-center text-sm text-gray-400 py-8">No estimates yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs min-w-[600px]">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase tracking-wide">
                            <th className="px-4 py-2 text-left font-semibold">Estimate</th>
                            <th className="px-3 py-2 text-right font-semibold">Man Days</th>
                            <th className="px-3 py-2 text-right font-semibold">Labor Burden</th>
                            <th className="px-3 py-2 text-right font-semibold">Materials</th>
                            <th className="px-3 py-2 text-right font-semibold">Sub Cost</th>
                            <th className="px-3 py-2 text-right font-semibold">Gross Profit</th>
                            <th className="px-3 py-2 text-right font-semibold">GPMD</th>
                            <th className="px-3 py-2 text-right font-semibold">Total Price</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {(() => {
                            // Build version tree: originals + their child versions.
                            // An estimate is "original" if it has no parent_estimate_id.
                            // Versions hang off via parent_estimate_id.
                            const byParent = {}
                            const originals = []
                            for (const est of estimates) {
                              if (est.parent_estimate_id) {
                                if (!byParent[est.parent_estimate_id])
                                  byParent[est.parent_estimate_id] = []
                                byParent[est.parent_estimate_id].push(est)
                              } else {
                                originals.push(est)
                              }
                            }
                            // Sort children by version asc
                            for (const k of Object.keys(byParent)) {
                              byParent[k].sort((a, b) => (a.version || 1) - (b.version || 1))
                            }
                            const renderRow = (est, isVersion = false) => {
                              const t = estimateTotals(est)
                              const versionN = est.version || (isVersion ? 2 : 1)
                              // Originals: green badge. Versions: blue badge, indented row,
                              // light-blue background, with a chunky ↳ glyph to mirror the
                              // Jobs/Change Orders pattern but at a larger font (text-sm
                              // vs the CO row's text-[10px]).
                              const linkCls = isVersion
                                ? 'text-sm font-semibold text-blue-700 hover:underline'
                                : 'text-sm font-semibold text-green-700 hover:underline'
                              const rowCls = isVersion
                                ? 'bg-blue-50/60 hover:bg-blue-100/60 border-b border-blue-100/60 transition-colors'
                                : 'hover:bg-gray-50 transition-colors'
                              const badgeCls = isVersion
                                ? 'inline-block ml-2 text-[11px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 bg-blue-100 text-blue-700 border border-blue-200'
                                : 'inline-block ml-2 text-[11px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 bg-green-100 text-green-700 border border-green-200'
                              return (
                                <tr key={est.id} className={rowCls}>
                                  <td className={isVersion ? 'pl-10 pr-3 py-2' : 'px-4 py-2'}>
                                    <div className="flex items-center gap-2">
                                      {isVersion && (
                                        <span className="text-blue-400 text-base font-bold">↳</span>
                                      )}
                                      <Link to={`/estimates/${est.id}`} className={linkCls}>
                                        {est.estimate_name}
                                      </Link>
                                      <span className={badgeCls}>Estimate {versionN}</span>
                                    </div>
                                    {est.type && (
                                      <p className="text-[10px] text-gray-400 mt-0.5">{est.type}</p>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-right text-gray-700">
                                    {t.man_days.toFixed(1)}
                                  </td>
                                  <td className="px-3 py-2 text-right text-gray-600">
                                    {fmt(t.labor_burden)}
                                  </td>
                                  <td className="px-3 py-2 text-right text-gray-700">
                                    {fmt(t.material_cost)}
                                  </td>
                                  <td className="px-3 py-2 text-right text-gray-600">
                                    {t.sub_cost > 0 ? fmt(t.sub_cost) : '—'}
                                  </td>
                                  <td className="px-3 py-2 text-right font-semibold text-green-700">
                                    {t.gross_profit > 0 ? fmt(t.gross_profit) : '—'}
                                  </td>
                                  <td className="px-3 py-2 text-right text-gray-600">
                                    {t.gpmd > 0 ? `$${Math.round(t.gpmd).toLocaleString()}` : '—'}
                                  </td>
                                  <td className="px-3 py-2 text-right font-bold text-gray-900">
                                    {t.total_price > 0 ? fmt(t.total_price) : '—'}
                                  </td>
                                </tr>
                              )
                            }
                            return originals.flatMap(est => [
                              renderRow(est, false),
                              ...(byParent[est.id] || []).map(v => renderRow(v, true)),
                            ])
                          })()}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                </IfModule>

                {/* ── E-Documents ── */}
                <div className="bg-white border border-slate-300 rounded-xl shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200">
                    <h3 className="text-sm font-bold text-gray-700">E-Documents</h3>
                  </div>
                  <div className="p-3">
                    <EDocuments clientId={id} embedded />
                  </div>
                </div>

                {/* ── Bids ── (Contractor package) */}
                <IfModule module={['/bids', '/jobs']}>
                <div className="bg-white border border-slate-300 rounded-xl shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200">
                    <h3 className="text-sm font-bold text-gray-700">Bids</h3>
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold">
                      {bids.length}
                    </span>
                  </div>
                  {bids.length === 0 ? (
                    <p className="text-center text-sm text-gray-400 py-8">No bids yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs min-w-[500px]">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase tracking-wide">
                            <th className="px-4 py-2 text-left font-semibold">Bid</th>
                            <th className="px-3 py-2 text-right font-semibold">Date</th>
                            <th className="px-3 py-2 text-left font-semibold">Est. By</th>
                            <th className="px-3 py-2 text-center font-semibold">Doc</th>
                            <th className="px-3 py-2 text-right font-semibold">Gross Profit</th>
                            <th className="px-3 py-2 text-right font-semibold">Bid Amount</th>
                            <th className="px-3 py-2 text-center font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {bids.map(bid => {
                            const status = bid.status || 'pending'
                            return (
                              <tr key={bid.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-2">
                                  {bid.estimate_id ? (
                                    <Link
                                      to={`/estimates/${bid.estimate_id}`}
                                      className="font-semibold text-green-700 hover:underline"
                                    >
                                      {bid.estimates?.estimate_name || bid.client_name}
                                    </Link>
                                  ) : (
                                    <p className="font-semibold text-gray-800">
                                      {bid.estimates?.estimate_name || bid.client_name}
                                    </p>
                                  )}
                                  {bid.projects?.length > 0 && (
                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                      {bid.projects.join(', ')}
                                    </p>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right text-gray-500 whitespace-nowrap">
                                  {bid.date_submitted
                                    ? new Date(bid.date_submitted).toLocaleDateString()
                                    : '—'}
                                </td>
                                <td className="px-3 py-2 text-left text-gray-600 whitespace-nowrap">
                                  {bid.estimates?.created_by
                                    ? profiles[bid.estimates.created_by] || '—'
                                    : '—'}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <button
                                    onClick={() => setViewingBid(bid)}
                                    disabled={!bid.estimate_id}
                                    className="inline-flex items-center justify-center w-6 h-6 rounded border border-gray-200 text-gray-400 hover:border-green-400 hover:text-green-600 hover:bg-green-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                  >
                                    <span className="text-xs">📄</span>
                                  </button>
                                </td>
                                <td className="px-3 py-2 text-right font-semibold text-green-700">
                                  {bid.gross_profit > 0
                                    ? `$${Math.round(bid.gross_profit).toLocaleString()}`
                                    : '—'}
                                </td>
                                <td className="px-3 py-2 text-right font-bold text-gray-900 whitespace-nowrap">
                                  ${parseFloat(bid.bid_amount || 0).toLocaleString()}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <span
                                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${BID_STATUS_STYLES[status] || BID_STATUS_STYLES.pending}`}
                                  >
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                  </span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                </IfModule>

                {/* ── Jobs / COs ── (Contractor package) */}
                <IfModule module={['/bids', '/jobs']}>
                <div className="bg-white border border-slate-300 rounded-xl shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200">
                    <h3 className="text-sm font-bold text-gray-700">Jobs / Change Orders</h3>
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold">
                      {soldJobs.length}
                      {totalCOs > 0 ? ` · ${totalCOs} CO${totalCOs !== 1 ? 's' : ''}` : ''}
                    </span>
                  </div>
                  {soldJobs.length === 0 ? (
                    <p className="text-center text-sm text-gray-400 py-8">No jobs yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs min-w-[560px]">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase tracking-wide">
                            <th className="px-4 py-2 text-left font-semibold">
                              Job / Change Order
                            </th>
                            <th className="px-3 py-2 text-right font-semibold">Date</th>
                            <th className="px-3 py-2 text-right font-semibold">Man Days</th>
                            <th className="px-3 py-2 text-right font-semibold">Materials</th>
                            <th className="px-3 py-2 text-right font-semibold">Gross Profit</th>
                            <th className="px-3 py-2 text-right font-semibold">Total Price</th>
                            <th className="px-3 py-2 text-center font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {soldJobs.map(job => {
                            const cos = jobCOs[job.id] || []
                            return (
                              <>
                                <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-4 py-2 font-semibold">
                                    <Link
                                      to={`/jobs?tab=info&job=${job.id}`}
                                      className="text-green-700 hover:underline"
                                    >
                                      {job.name}
                                    </Link>
                                  </td>
                                  <td className="px-3 py-2 text-right text-gray-500 whitespace-nowrap">
                                    {job.sold_date
                                      ? new Date(job.sold_date).toLocaleDateString()
                                      : '—'}
                                  </td>
                                  <td className="px-3 py-2 text-right text-gray-700">
                                    {parseFloat(job.total_man_days || 0).toFixed(1)}
                                  </td>
                                  <td className="px-3 py-2 text-right text-gray-700">
                                    {fmt(job.material_cost)}
                                  </td>
                                  <td className="px-3 py-2 text-right font-semibold text-green-700">
                                    {fmt(job.gross_profit)}
                                  </td>
                                  <td className="px-3 py-2 text-right font-bold text-gray-900">
                                    {fmt(job.total_price)}
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <span
                                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                        job.status === 'active'
                                          ? 'bg-green-50 text-green-800 border border-green-300'
                                          : job.status === 'complete'
                                            ? 'bg-blue-50 text-blue-800 border border-blue-300'
                                            : job.status === 'on_hold'
                                              ? 'bg-yellow-50 text-yellow-800 border border-yellow-300'
                                              : 'bg-gray-100 text-gray-600'
                                      }`}
                                    >
                                      {job.status
                                        ? job.status.charAt(0).toUpperCase() +
                                          job.status.slice(1).replace('_', ' ')
                                        : '—'}
                                    </span>
                                  </td>
                                </tr>
                                {cos.map(co => (
                                  <tr
                                    key={co.id}
                                    className="bg-blue-50/40 hover:bg-blue-50 border-b border-blue-100/60 transition-colors"
                                  >
                                    <td className="pl-8 pr-3 py-1.5">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-blue-300 text-xs">↳</span>
                                        {co.linked_job_id ? (
                                          <Link
                                            to={`/jobs?tab=change-orders&job=${co.linked_job_id}&co=${co.id}`}
                                            className="text-[10px] font-semibold text-blue-700 hover:underline"
                                          >
                                            {co.co_name || '—'}
                                          </Link>
                                        ) : (
                                          <span className="text-[10px] font-semibold text-blue-700">
                                            {co.co_name || '—'}
                                          </span>
                                        )}
                                        {co.co_type && (
                                          <span className="text-[9px] text-blue-400">
                                            {co.co_type}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-3 py-1.5 text-right text-gray-400 whitespace-nowrap">
                                      {co.date_submitted
                                        ? new Date(co.date_submitted).toLocaleDateString()
                                        : '—'}
                                    </td>
                                    <td className="px-3 py-1.5 text-right text-gray-400">—</td>
                                    <td className="px-3 py-1.5 text-right text-gray-400">—</td>
                                    <td className="px-3 py-1.5 text-right font-semibold text-green-600">
                                      {co.gross_profit > 0
                                        ? `$${Math.round(co.gross_profit).toLocaleString()}`
                                        : '—'}
                                    </td>
                                    <td className="px-3 py-1.5 text-right font-semibold text-gray-700">
                                      ${parseFloat(co.bid_amount || 0).toLocaleString()}
                                    </td>
                                    <td className="px-3 py-1.5 text-center">
                                      <span
                                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${BID_STATUS_STYLES[co.status || 'pending'] || BID_STATUS_STYLES.pending}`}
                                      >
                                        {(co.status || 'pending').charAt(0).toUpperCase() +
                                          (co.status || 'pending').slice(1)}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </>
                            )
                          })}
                        </tbody>
                        {soldJobs.length > 1 && (
                          <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                            <tr className="text-xs font-semibold text-gray-600">
                              <td className="px-4 py-2" colSpan={2}>
                                Totals
                              </td>
                              <td className="px-3 py-2 text-right">
                                {soldJobs
                                  .reduce((s, j) => s + parseFloat(j.total_man_days || 0), 0)
                                  .toFixed(1)}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {fmt(
                                  soldJobs.reduce((s, j) => s + parseFloat(j.material_cost || 0), 0)
                                )}
                              </td>
                              <td className="px-3 py-2 text-right text-green-700">
                                {fmt(totalGP)}
                              </td>
                              <td className="px-3 py-2 text-right font-bold text-gray-900">
                                {fmt(totalRevenue)}
                              </td>
                              <td />
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  )}
                </div>
                </IfModule>
              </div>
            </div>
            {/* ═══════════════════════════════════════════════════════════════ */}
          </div>
        </div>
      </div>

      {showEstimateModal && (
        <NewEstimateModal
          client={client}
          onClose={() => setShowEstimateModal(false)}
          onNext={handleEstimateNext}
        />
      )}

      {/* Consultant prompt — fires when the user starts a new estimate on
          an opportunity that doesn't have a consultant yet. Required choice
          before the estimate is created. */}
      {consultantPrompt && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-900">Assign a consultant</h3>
              <p className="text-xs text-gray-500 mt-1">
                This opportunity doesn't have a consultant yet. Pick one to continue creating
                the estimate — the choice is saved to the opportunity for future use.
              </p>
            </div>
            <div className="px-5 py-4">
              <ConsultantPicker value={promptPick} onChange={setPromptPick} />
            </div>
            <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setConsultantPrompt(null)
                  setPromptPick(null)
                }}
                disabled={promptSaving}
                className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmConsultantPrompt}
                disabled={!promptPick || promptSaving}
                className={`px-3 py-1.5 text-sm rounded-md font-medium ${
                  promptPick && !promptSaving
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {promptSaving ? 'Saving…' : 'Save & Create Estimate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingBid && <BidDocViewerModal bid={viewingBid} onClose={() => setViewingBid(null)} />}
    </div>
  )
}
