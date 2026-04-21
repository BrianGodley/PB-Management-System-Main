import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// ── Constants ─────────────────────────────────────────────────────────────────
const COLL_SECTIONS = [
  { key:'current',   label:'Current Collections',   prevLabel:'Prev Delivered', balLabel:'Starting Balance', endLabel:'New Balance' },
  { key:'punchlist', label:'Punchlist Collections', prevLabel:'$ Delivered',    balLabel:'Open Balance',     endLabel:'New Balance' },
  { key:'long_term', label:'Long-Term Collections', prevLabel:'$ Delivered',    balLabel:'Open Balance',     endLabel:'New Balance' },
]
const DAYS = ['mon','tue','wed','thu','fri']
const DAY_LABELS = { mon:'Monday', tue:'Tuesday', wed:'Wednesday', thu:'Thursday', fri:'Friday' }

const PAY_CATS = [
  { key:'prelim',         label:'Prelims',         cols:['payee','amount_current'],                            subtotalCol:'amount_current' },
  { key:'credit_card',    label:'Credit Cards/Lines', cols:['payee','amount_current','due_date','rate'],        subtotalCol:'amount_current' },
  { key:'credit_account', label:'Credit Vendors',  cols:['payee','amount_current','amount_future','due_date'], subtotalCol:['amount_current','amount_future'], colLabels:{ amount_current:'Current', amount_future:'Future' } },
  { key:'non_credit',     label:'Standard Vendors',cols:['payee','amount_current','amount_future','due_date'], subtotalCol:['amount_current','amount_future'], colLabels:{ amount_current:'Current', amount_future:'Future' } },
]

const FIN_SECTIONS = [
  { key:'cash_on_hand',   label:'1 — Cash On Hand',         allowAdd: true  },
  { key:'auto_alloc',     label:'2 — Auto Allocations',     allowAdd: true  },
  { key:'payroll',        label:'3 — Payroll Allocations',  allowAdd: false },
  { key:'payables_alloc', label:'4 — Payables Allocations', allowAdd: true  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtC(n) {
  const v = parseFloat(n)
  if (isNaN(v) || v === 0) return '—'
  const s = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 })
  return v < 0 ? `($${s})` : `$${s}`
}

function calcEnd(row) {
  const start = parseFloat(row.starting_balance) || 0
  let inv = 0, dep = 0
  DAYS.forEach(d => { inv += parseFloat(row[`${d}_inv`]) || 0; dep += parseFloat(row[`${d}_dep`]) || 0 })
  return start + inv - dep
}

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

// Returns the ISO date of the week-start (6 days before week-ending day)
function prevWeekStart(weekEndISO, weekEndingDay) {
  const d = new Date(weekEndISO + 'T12:00:00')
  d.setDate(d.getDate() - 6)
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric' })
}

function fmtWeekEnd(weekEndISO) {
  const d = new Date(weekEndISO + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
}

function nextWeekEnd(weekEndingDay) {
  const d = new Date()
  const diff = (weekEndingDay - d.getDay() + 7) % 7 || 7
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

function addDays(isoDate, n) {
  const d = new Date(isoDate + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

// ── Inline cell components ────────────────────────────────────────────────────
function CellInput({ value, onSave, placeholder='', align='right' }) {
  const [local, setLocal] = useState(value ?? '')
  const [focused, setFocused] = useState(false)
  useEffect(() => setLocal(value ?? ''), [value])
  const display = !focused && local !== '' && local !== 0 && local !== '0'
    ? `$${parseFloat(local).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 })}`
    : local
  return (
    <input
      type={focused ? 'number' : 'text'}
      step="0.01"
      value={display}
      onChange={e => setLocal(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => { setFocused(false); if (String(local) !== String(value ?? '')) onSave(local) }}
      onKeyDown={e => { if (e.key==='Enter') e.target.blur() }}
      placeholder={placeholder}
      className={`w-full bg-transparent text-${align} text-xs px-1 py-0.5 focus:outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-300 rounded`}
    />
  )
}

function TextCell({ value, onSave, placeholder='', bold=false, onDelete=null }) {
  const [local, setLocal] = useState(value ?? '')
  const [focused, setFocused] = useState(false)
  useEffect(() => setLocal(value ?? ''), [value])
  return (
    <div className="relative flex items-center">
      <input
        type="text"
        value={local}
        onChange={e => setLocal(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); if (local !== (value ?? '')) onSave(local) }}
        onKeyDown={e => { if (e.key==='Enter') e.target.blur() }}
        placeholder={placeholder}
        className={`w-full bg-transparent text-xs px-1 py-0.5 focus:outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-300 rounded ${bold ? 'font-medium text-gray-800' : 'text-gray-600'} ${onDelete && focused ? 'pr-5' : ''}`}
      />
      {onDelete && focused && (
        <button
          onMouseDown={e => { e.preventDefault(); onDelete() }}
          className="absolute right-0.5 text-red-400 hover:text-red-600 text-[10px] leading-none px-0.5"
          title="Delete row"
        >✕</button>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Collections() {
  const [weeks,              setWeeks]              = useState([])
  const [weekIdx,            setWeekIdx]            = useState(0)
  const [mainTab,            setMainTab]            = useState('collections')
  const [collTab,            setCollTab]            = useState('current')
  const [rows,               setRows]               = useState([])
  const [payables,           setPayables]           = useState([])
  const [financial,          setFinancial]          = useState([])
  const [loading,            setLoading]            = useState(true)
  const [creatingWeek,       setCreatingWeek]       = useState(false)
  const [companyWeekEndDay,  setCompanyWeekEndDay]  = useState(6) // default Saturday
  const [newWeekModal,       setNewWeekModal]       = useState(null) // { lastDataWeek, nextDate }

  const selectedWeek = weeks[weekIdx] || null

  useEffect(() => {
    Promise.all([
      supabase.from('collection_weeks').select('*').order('week_ending', { ascending:false }),
      supabase.from('company_settings').select('company_week_ending_day').maybeSingle(),
    ]).then(([weeksRes, settingsRes]) => {
      if (weeksRes.data) { setWeeks(weeksRes.data); setWeekIdx(0) }
      if (settingsRes.data?.company_week_ending_day != null) {
        setCompanyWeekEndDay(settingsRes.data.company_week_ending_day)
      }
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!selectedWeek) return
    const id = selectedWeek.id
    Promise.all([
      supabase.from('collection_rows').select('*').eq('week_id', id).order('sort_order'),
      supabase.from('collection_payables').select('*').eq('week_id', id).order('sort_order'),
      supabase.from('collection_financial').select('*').eq('week_id', id).order('sort_order'),
    ]).then(([r,p,f]) => {
      if (r.data) setRows(r.data)
      if (p.data) setPayables(p.data)
      if (f.data) setFinancial(f.data)
    })
  }, [selectedWeek?.id])

  // Step 1: figure out last week with data + proposed next date, then open confirmation modal
  async function handleNewWeekClick() {
    setCreatingWeek(true)
    const { data: rowData } = await supabase
      .from('collection_rows')
      .select('week_id')
      .in('week_id', weeks.map(w => w.id))
    const weeksWithData = new Set((rowData || []).map(r => r.week_id))
    // weeks is sorted descending — first match = most recent week with any rows
    const lastDataWeek = weeks.find(w => weeksWithData.has(w.id)) || null
    // Next date = last week WITH DATA + 7 days (not just the most recent week in DB)
    const nextDate = lastDataWeek
      ? addDays(lastDataWeek.week_ending, 7)
      : nextWeekEnd(companyWeekEndDay)
    // Check if that week already exists in DB (e.g. was created but has no data yet)
    const alreadyExists = weeks.find(w => w.week_ending === nextDate) || null
    setCreatingWeek(false)
    setNewWeekModal({ lastDataWeek, nextDate, alreadyExists })
  }

  // Step 2: create (or reuse) the week and copy rows from lastDataWeek
  async function confirmCreateWeek() {
    if (!newWeekModal) return
    const { lastDataWeek, nextDate, alreadyExists } = newWeekModal
    setCreatingWeek(true)

    let targetWeek = alreadyExists
    if (!targetWeek) {
      const { data, error } = await supabase
        .from('collection_weeks').insert({ week_ending: nextDate }).select().single()
      if (error || !data) { setCreatingWeek(false); setNewWeekModal(null); return }
      targetWeek = data
      setWeeks(prev => [targetWeek, ...prev].sort((a,b) => b.week_ending.localeCompare(a.week_ending)))
    }

    if (lastDataWeek) {
      // Check if target week already has rows (avoid duplicating)
      const { data: existingRows } = await supabase
        .from('collection_rows').select('id').eq('week_id', targetWeek.id).limit(1)
      if (!existingRows?.length) {
        // ── Copy collection rows ──────────────────────────────────────────
        const { data: sourceRows } = await supabase
          .from('collection_rows').select('*').eq('week_id', lastDataWeek.id).order('sort_order')
        if (sourceRows?.length) {
          const newRows = sourceRows.map(row => ({
            week_id:          targetWeek.id,
            section:          row.section,
            manager:          row.manager,
            client_name:      row.client_name,
            sort_order:       row.sort_order,
            notes:            '',
            prev_delivered:   row.prev_delivered ?? 0,
            starting_balance: calcEnd(row), // carry New Balance → Starting Balance
            mon_inv: 0, mon_dep: 0,
            tue_inv: 0, tue_dep: 0,
            wed_inv: 0, wed_dep: 0,
            thu_inv: 0, thu_dep: 0,
            fri_inv: 0, fri_dep: 0,
          }))
          await supabase.from('collection_rows').insert(newRows)
        }

        // ── Copy payables ─────────────────────────────────────────────────
        const { data: sourcePayables } = await supabase
          .from('collection_payables').select('*').eq('week_id', lastDataWeek.id).order('sort_order')
        if (sourcePayables?.length) {
          const newPayables = sourcePayables.map(({ id, week_id, created_at, updated_at, ...rest }) => ({
            ...rest,
            week_id: targetWeek.id,
          }))
          await supabase.from('collection_payables').insert(newPayables)
        }

        // ── Copy financial planning ───────────────────────────────────────
        const { data: sourceFinancial } = await supabase
          .from('collection_financial').select('*').eq('week_id', lastDataWeek.id).order('sort_order')
        if (sourceFinancial?.length) {
          const newFinancial = sourceFinancial.map(({ id, week_id, created_at, updated_at, ...rest }) => ({
            ...rest,
            week_id: targetWeek.id,
            amount: rest.is_formula ? 0 : rest.amount, // formula rows are always computed dynamically
          }))
          await supabase.from('collection_financial').insert(newFinancial)
        }
      }
    }

    // Navigate to the target week
    setWeeks(prev => {
      const updated = alreadyExists ? prev : prev // already set above
      const idx = updated.findIndex(w => w.id === targetWeek.id)
      setWeekIdx(idx >= 0 ? idx : 0)
      return updated
    })
    setCreatingWeek(false)
    setNewWeekModal(null)
  }

  // ── Row CRUD ────────────────────────────────────────────────────────────────
  const NUM_FIELDS = ['prev_delivered','starting_balance',
    'mon_inv','mon_dep','tue_inv','tue_dep','wed_inv','wed_dep','thu_inv','thu_dep','fri_inv','fri_dep']

  async function addRow(section, manager) {
    const { data } = await supabase.from('collection_rows').insert({
      week_id: selectedWeek.id, section, manager: manager || null,
      client_name: 'New Client', sort_order: rows.filter(r => r.section === section).length,
    }).select().single()
    if (data) setRows(prev => [...prev, data])
  }

  async function updateRow(id, field, value) {
    const parsed = NUM_FIELDS.includes(field) ? (parseFloat(value) || 0) : value
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: parsed } : r))
    await supabase.from('collection_rows').update({ [field]: parsed, updated_at: new Date().toISOString() }).eq('id', id)
  }

  async function deleteRow(id) {
    if (!confirm('Delete this row?')) return
    setRows(prev => prev.filter(r => r.id !== id))
    await supabase.from('collection_rows').delete().eq('id', id)
  }

  // ── Payables CRUD ───────────────────────────────────────────────────────────
  async function addPayable(category) {
    const { data } = await supabase.from('collection_payables').insert({
      week_id: selectedWeek.id, category,
      sort_order: payables.filter(p => p.category === category).length,
    }).select().single()
    if (data) setPayables(prev => [...prev, data])
  }

  async function updatePayable(id, field, value) {
    const parsed = ['amount_current','amount_future'].includes(field) ? (parseFloat(value) || 0) : value
    setPayables(prev => prev.map(p => p.id === id ? { ...p, [field]: parsed } : p))
    await supabase.from('collection_payables').update({ [field]: parsed }).eq('id', id)
  }

  async function deletePayable(id) {
    if (!confirm('Delete this row?')) return
    setPayables(prev => prev.filter(p => p.id !== id))
    await supabase.from('collection_payables').delete().eq('id', id)
  }

  // ── Financial CRUD ──────────────────────────────────────────────────────────
  async function addFinancial(section, subsection = null) {
    const { data } = await supabase.from('collection_financial').insert({
      week_id: selectedWeek.id, section, subsection,
      sort_order: financial.filter(f => f.section === section && f.subsection === subsection).length,
    }).select().single()
    if (data) setFinancial(prev => [...prev, data])
  }

  async function addFinancialFromPayable(subsection, payable, amount) {
    const { data } = await supabase.from('collection_financial').insert({
      week_id: selectedWeek.id, section: 'payables_alloc', subsection,
      label: payable.payee, amount,
      source_payable_id: payable.id,
      sort_order: financial.filter(f => f.section === 'payables_alloc' && f.subsection === subsection).length,
    }).select().single()
    if (data) setFinancial(prev => [...prev, data])
  }

  async function updateFinancial(id, field, value) {
    const parsed = field === 'amount' ? (parseFloat(value) || 0) : value
    setFinancial(prev => prev.map(f => f.id === id ? { ...f, [field]: parsed } : f))
    await supabase.from('collection_financial').update({ [field]: parsed }).eq('id', id)
  }

  async function deleteFinancial(id) {
    if (!confirm('Delete this row?')) return
    setFinancial(prev => prev.filter(f => f.id !== id))
    await supabase.from('collection_financial').delete().eq('id', id)
  }

  // ── Summaries ───────────────────────────────────────────────────────────────
  function collSummary(section) {
    const sRows = rows.filter(r => r.section === section)
    const totDep = sRows.reduce((s,r) => { DAYS.forEach(d => { s += parseFloat(r[`${d}_dep`]) || 0 }); return s }, 0)
    const totInv = sRows.reduce((s,r) => { DAYS.forEach(d => { s += parseFloat(r[`${d}_inv`]) || 0 }); return s }, 0)
    const totEnd = sRows.reduce((s,r) => s + calcEnd(r), 0)
    return { totDep, totInv, totEnd }
  }

  function paySubtotal(cat, col = 'amount_current') {
    const cols = Array.isArray(col) ? col : [col]
    return payables.filter(p => p.category === cat).reduce((s,p) => s + cols.reduce((cs,c) => cs + (parseFloat(p[c]) || 0), 0), 0)
  }

  function finTotal(sec, refTotal = 0) {
    return financial
      .filter(f => f.section === sec)
      .reduce((s, f) => {
        if (f.formula_type === 'pct_cash_on_hand') return s + (refTotal * (f.formula_pct ?? 0.01))
        return s + (parseFloat(f.amount) || 0)
      }, 0)
  }

  const totalDeposited   = COLL_SECTIONS.reduce((s,sec) => s + collSummary(sec.key).totDep, 0)
  const totalNewInv      = COLL_SECTIONS.reduce((s,sec) => s + collSummary(sec.key).totInv, 0)
  const totalReceivables = rows.reduce((s,r) => s + calcEnd(r), 0)
  const totalPayables    = PAY_CATS.reduce((s,c) => s + paySubtotal(c.key, c.subtotalCol), 0)
  const payablesByCategory = PAY_CATS.reduce((acc,cat) => { acc[cat.key] = payables.filter(p => p.category === cat.key); return acc }, {})
  const cashOnHand       = finTotal('cash_on_hand')
  const autoAlloc        = finTotal('auto_alloc', cashOnHand)
  const payrollAlloc     = finTotal('payroll')
  const payablesAlloc    = financial.filter(f => f.section === 'payables_alloc' && !f.is_formula && f.subsection).reduce((s,f) => s + (parseFloat(f.amount) || 0), 0)
  const netTotal         = cashOnHand - autoAlloc - payrollAlloc - payablesAlloc

  if (loading) return (
    <div className="flex items-center justify-center h-full py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
    </div>
  )

  return (
    <div className="flex flex-col h-full">

      {/* ── Header & week nav ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-4 flex-shrink-0 flex-wrap">
        <h1 className="text-xl font-bold text-gray-900">Finance</h1>
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl shadow-sm px-2 py-1">
          <button
            onClick={() => setWeekIdx(i => Math.min(i+1, weeks.length-1))}
            disabled={weekIdx >= weeks.length-1}
            className="px-2 py-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30 font-bold text-lg"
          >‹</button>
          <span className="text-sm font-semibold text-gray-700 px-2 min-w-[210px] text-center">
            {selectedWeek
              ? `${prevWeekStart(selectedWeek.week_ending, companyWeekEndDay)} – ${fmtWeekEnd(selectedWeek.week_ending)}`
              : 'No weeks yet'}
          </span>
          <button
            onClick={() => setWeekIdx(i => Math.max(i-1, 0))}
            disabled={weekIdx <= 0}
            className="px-2 py-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30 font-bold text-lg"
          >›</button>
        </div>
        <div className="flex-1" />
        <button
          onClick={handleNewWeekClick} disabled={creatingWeek}
          className="text-sm px-3 py-1.5 rounded-lg bg-green-700 text-white font-medium hover:bg-green-800 disabled:opacity-50 mr-16"
        >{creatingWeek ? 'Loading…' : '+ New Week'}</button>
      </div>

      {/* ── New Week Confirmation Modal ───────────────────────────────────── */}
      {newWeekModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-green-700 px-6 py-4">
              <h2 className="text-white font-bold text-lg">Create New Weekly Period</h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Last data week */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Last Week With Data</p>
                {newWeekModal.lastDataWeek ? (
                  <p className="text-sm font-semibold text-gray-800">
                    {prevWeekStart(newWeekModal.lastDataWeek.week_ending)} – {fmtWeekEnd(newWeekModal.lastDataWeek.week_ending)}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 italic">No data found in any week</p>
                )}
              </div>
              {/* New week */}
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">New Week To Be Created</p>
                <p className="text-sm font-semibold text-green-900">
                  {prevWeekStart(newWeekModal.nextDate)} – {fmtWeekEnd(newWeekModal.nextDate)}
                </p>
              </div>
              {/* What will happen */}
              {newWeekModal.lastDataWeek && (
                <div className="text-xs text-gray-600 space-y-1.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <p className="font-semibold text-amber-800 mb-1">
                    {newWeekModal.alreadyExists ? 'This week exists but has no data — will populate it:' : 'What will be copied:'}
                  </p>
                  <p>✅ All client rows, manager groups, and sections</p>
                  <p>✅ Each row's <strong>New Balance → Starting Balance</strong> for the new week</p>
                  <p>✅ Previously Delivered carries over unchanged</p>
                  <p>✅ All Payables rows copied over as-is</p>
                  <p>✅ All Financial Planning rows copied over as-is</p>
                  <p>🔄 Invoice &amp; Deposit columns will start blank</p>
                </div>
              )}
            </div>
            <div className="px-6 pb-5 flex gap-3">
              <button
                onClick={() => setNewWeekModal(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50"
              >Cancel</button>
              <button
                onClick={confirmCreateWeek}
                disabled={creatingWeek}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-green-700 hover:bg-green-800 disabled:opacity-50"
              >{creatingWeek ? 'Creating…' : 'Create New Week'}</button>
            </div>
          </div>
        </div>
      )}

      {!selectedWeek ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-sm font-medium text-gray-500">No weeks yet — click <strong>+ New Week</strong> to start</p>
          </div>
        </div>
      ) : (
        <>
          {/* ── Main tabs ──────────────────────────────────────────────────── */}
          <div className="flex gap-0 border-b border-gray-200 mb-4 flex-shrink-0">
            {[
              { key:'collections', label:'💰 Collections'        },
              { key:'payables',    label:'💳 Payables'           },
              { key:'financial',   label:'📊 Financial Planning' },
            ].map(t => (
              <button key={t.key} onClick={() => setMainTab(t.key)}
                className={`px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                  mainTab === t.key ? 'border-green-700 text-green-800' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >{t.label}</button>
            ))}
          </div>

          {/* ── Collections ────────────────────────────────────────────────── */}
          {mainTab === 'collections' && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex items-center gap-1.5 mb-3 flex-shrink-0">
                {COLL_SECTIONS.map(s => (
                  <button key={s.key} onClick={() => setCollTab(s.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      collTab === s.key ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >{s.label}</button>
                ))}
                <div className="flex-1" />
                {(() => { const s = collSummary(collTab); return (
                  <div className="flex items-center gap-4 text-xs text-gray-600 mr-8">
                    <span>Subtotal Deposits: <strong className="text-gray-800">{fmtC(s.totDep)}</strong></span>
                    <span>Subtotal Invoices: <strong className="text-gray-800">{fmtC(s.totInv)}</strong></span>
                    <span className="text-gray-300">|</span>
                    <span>Total Deposits: <strong className="text-blue-700">{fmtC(totalDeposited)}</strong></span>
                    <span>Total Invoices: <strong className="text-blue-700">{fmtC(totalNewInv)}</strong></span>
                  </div>
                )})()}
              </div>
              {COLL_SECTIONS.filter(s => s.key === collTab).map(sec => (
                <CollectionTable
                  key={sec.key}
                  section={sec}
                  rows={rows.filter(r => r.section === sec.key)}
                  summary={collSummary(sec.key)}
                  onUpdate={updateRow}
                  onDelete={deleteRow}
                  onAdd={addRow}
                />
              ))}
            </div>
          )}

          {/* ── Payables ───────────────────────────────────────────────────── */}
          {mainTab === 'payables' && (
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-4 items-start">
                {PAY_CATS.map(cat => (
                  <PayableTable
                    key={cat.key}
                    cat={cat}
                    rows={payables.filter(p => p.category === cat.key)}
                    subtotal={paySubtotal(cat.key, cat.subtotalCol)}
                    onUpdate={updatePayable}
                    onDelete={deletePayable}
                    onAdd={() => addPayable(cat.key)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Financial Planning ─────────────────────────────────────────── */}
          {mainTab === 'financial' && (
            <div className="flex-1 overflow-y-auto">
              <div className="flex gap-4 pb-4 items-start">

                {/* Left column: sections 1, 2, 3 */}
                <div className="flex-1 flex flex-col gap-4">
                  {FIN_SECTIONS.filter(s => s.key !== 'payables_alloc').map(sec => (
                    <FinancialTable
                      key={sec.key}
                      sec={sec}
                      rows={financial.filter(f => f.section === sec.key)}
                      total={finTotal(sec.key, cashOnHand)}
                      onUpdate={updateFinancial}
                      onDelete={deleteFinancial}
                      onAdd={() => addFinancial(sec.key)}
                      canAdd={sec.allowAdd}
                      cashOnHandTotal={cashOnHand}
                    />
                  ))}
                </div>

                {/* Right column: section 4 + Totals */}
                <div className="flex-1 flex flex-col gap-4">
                  <PayablesAllocSection
                    rows={financial.filter(f => f.section === 'payables_alloc' && !f.is_formula && f.subsection)}
                    onUpdate={updateFinancial}
                    onDelete={deleteFinancial}
                    onAddFromPayable={addFinancialFromPayable}
                    paySubtotalFn={paySubtotal}
                    payablesByCategory={payablesByCategory}
                  />

                  {/* 5 — Financial Planning */}
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="bg-cyan-600 text-white px-4 py-2.5">
                      <h3 className="text-sm font-bold">5 — Financial Planning</h3>
                    </div>

                    {/* Collections Summary */}
                    <div className="px-4 py-2 bg-blue-50 border-b-2 border-blue-200">
                      <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wide mb-1.5">Collections Summary</p>
                      <div className="space-y-1">
                        {[
                          { label:'Total Deposited (all sections)',    value: totalDeposited },
                          { label:'Total New Invoices (all sections)', value: totalNewInv    },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex justify-between text-xs">
                            <span className="text-blue-700">{label}</span>
                            <span className="font-semibold text-blue-900">{fmtC(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Gap */}
                    <div className="h-2 bg-gray-100 border-y border-gray-200" />

                    {/* Allocation Summary */}
                    <div className="px-4 pt-2 pb-0 bg-blue-50 border-b border-blue-100">
                      <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wide mb-1.5">Allocation Summary</p>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {[
                        { label:'Available Cash',      value: cashOnHand,    color:'text-green-700' },
                        { label:'Auto Allocations',    value: autoAlloc,     color:'text-red-600'   },
                        { label:'Payroll Allocations', value: payrollAlloc,  color:'text-red-600'   },
                        { label:'Payable Allocations', value: payablesAlloc, color:'text-red-600'   },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="flex items-center justify-between px-4 py-2 text-xs">
                          <span className="text-gray-600">{label}</span>
                          <span className={`font-medium ${color}`}>{fmtC(value)}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50">
                        <span className="text-sm font-bold text-gray-800">Net Total</span>
                        <span className={`text-sm font-bold ${netTotal >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmtC(netTotal)}</span>
                      </div>
                    </div>

                    {/* Gap */}
                    <div className="h-2 bg-gray-100 border-y border-gray-200" />

                    {/* Solvency */}
                    <div className="px-4 pt-2 pb-0 bg-blue-50 border-b border-blue-100">
                      <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wide mb-1.5">Solvency</p>
                    </div>
                    <div className="bg-gray-50/50 px-4 py-3 space-y-1.5 text-xs">
                      {[
                        { label:'Total Receivables',    value: totalReceivables, color:'text-green-700' },
                        { label:'Total Payables',       value: totalPayables,    color:'text-red-600'   },
                        { label:'Total Cash Minus Payroll', value: cashOnHand - payrollAlloc, color: (cashOnHand - payrollAlloc) >= 0 ? 'text-green-700' : 'text-red-600' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="flex justify-between">
                          <span className="text-gray-500">{label}</span>
                          <span className={`font-semibold ${color}`}>{fmtC(value)}</span>
                        </div>
                      ))}
                      {(() => {
                        const finalTotal = cashOnHand + totalReceivables - totalPayables
                        return (
                          <div className="flex justify-between border-t-2 border-gray-300 pt-2 mt-1">
                            <span className="text-sm font-bold text-gray-800">Cash + Receivables - Payables</span>
                            <span className={`text-sm font-bold ${finalTotal >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmtC(finalTotal)}</span>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                </div>


              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Collection Table ──────────────────────────────────────────────────────────
function CollectionTable({ section, rows, summary, onUpdate, onDelete, onAdd }) {
  const [newManager, setNewManager] = useState('')
  const [editingManager, setEditingManager] = useState(null)
  const [editManagerVal, setEditManagerVal] = useState('')

  const grouped = {}
  const noManager = []
  rows.forEach(r => {
    if (r.manager) { if (!grouped[r.manager]) grouped[r.manager] = []; grouped[r.manager].push(r) }
    else noManager.push(r)
  })
  const allGroups = [...Object.entries(grouped), ...(noManager.length ? [['', noManager]] : [])]

  return (
    <div className="flex-1 overflow-auto rounded-xl border border-gray-200 shadow-sm">
      <table className="text-xs w-full table-fixed" style={{ minWidth: '1120px' }}>
        <colgroup>
          <col style={{ width:'115px' }} />
          <col style={{ width:'88px'  }} />
          <col style={{ width:'88px'  }} />
          {DAYS.flatMap(() => [<col style={{ width:'78px' }} />, <col style={{ width:'78px' }} />])}
          <col style={{ width:'90px'  }} />
          <col style={{ width:'180px' }} />
          <col style={{ width:'32px'  }} />
        </colgroup>
        <thead className="sticky top-0 z-10">
          {/* Day header row */}
          <tr className="bg-gray-50 border-b border-gray-200">
            <th rowSpan={2} className="px-3 py-2 text-center font-semibold text-gray-700 border-r border-gray-300">Client</th>
            <th rowSpan={2} className="px-2 py-2 text-center font-semibold text-gray-600 text-[11px]">Previously<br/>Delivered</th>
            <th rowSpan={2} className="px-2 py-2 text-center font-semibold text-gray-600 text-[11px] border-r border-gray-300">{section.balLabel}</th>
            {DAYS.map(d => (
              <th key={d} colSpan={2} className="px-2 py-1.5 text-center font-extrabold text-gray-700 border-l border-r border-gray-400 text-[11px] bg-gray-200">
                {DAY_LABELS[d]}
              </th>
            ))}
            <th rowSpan={2} className="px-2 py-2 text-center font-bold text-gray-700 border-l border-gray-300 text-[11px]">{section.endLabel}</th>
            <th rowSpan={2} className="px-2 py-2 text-left font-semibold text-gray-500 text-[11px] border-l border-gray-300">Notes</th>
            <th rowSpan={2} />
          </tr>
          <tr className="bg-gray-100 border-b border-gray-300">
            {DAYS.map(d => (
              <>
                <th key={d+'i'} className="px-2 py-1 text-center text-gray-600 font-semibold text-[10px] border-l border-gray-400">Invoice</th>
                <th key={d+'d'} className="px-2 py-1 text-center text-gray-600 font-semibold text-[10px] border-l border-r border-gray-400">Deposit</th>
              </>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {allGroups.length === 0 && (
            <tr>
              <td colSpan={14} className="px-4 py-6 text-center text-gray-400 text-xs">
                No clients yet — add a row below
              </td>
            </tr>
          )}
          {allGroups.map(([manager, mRows]) => (
            <>
              {manager && (
                <tr key={'mgr-'+manager} className="bg-green-50">
                  <td colSpan={14} className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-green-700 text-[10px] font-bold">▸</span>
                      {editingManager === manager ? (
                        <>
                          <input
                            autoFocus
                            value={editManagerVal}
                            onChange={e => setEditManagerVal(e.target.value)}
                            onBlur={() => {
                              const v = editManagerVal.trim()
                              if (v && v !== manager) mRows.forEach(r => onUpdate(r.id,'manager',v))
                              setEditingManager(null)
                            }}
                            onKeyDown={e => {
                              if (e.key==='Enter') e.target.blur()
                              if (e.key==='Escape') setEditingManager(null)
                            }}
                            className="text-[11px] font-bold text-green-800 uppercase tracking-wider bg-white border border-green-400 focus:border-green-600 focus:outline-none rounded px-1 py-0 w-40"
                          />
                          <button
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => { if (window.confirm(`Delete entire "${manager}" group and all its rows?`)) { mRows.forEach(r => onDelete(r.id)); setEditingManager(null) } }}
                            className="text-red-400 hover:text-red-600 text-[10px] ml-1 font-medium"
                            title="Delete group"
                          >🗑 Delete</button>
                        </>
                      ) : (
                        <>
                          <span className="text-[11px] font-bold text-green-800 uppercase tracking-wider">{manager}</span>
                          <button
                            onClick={() => { setEditingManager(manager); setEditManagerVal(manager) }}
                            className="text-green-400 hover:text-green-700 ml-0.5 text-[11px] leading-none"
                            title="Edit group name"
                          >✏</button>
                        </>
                      )}
                    </div>
                    <div className="mt-1">
                      <button onClick={() => onAdd(section.key, manager)} className="text-[10px] text-green-700 hover:text-green-900 font-medium">
                        + Add Row
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              {mRows.map(row => {
                const end = calcEnd(row)
                return (
                  <tr key={row.id} className="hover:bg-gray-50 group">
                    <td className="px-2 py-1 border-r border-gray-300 bg-gray-100">
                      <TextCell value={row.client_name} onSave={v => onUpdate(row.id,'client_name',v)} placeholder="Client" bold onDelete={() => onDelete(row.id)} />
                    </td>
                    <td className="px-1 py-1">
                      <CellInput value={row.prev_delivered||''} onSave={v => onUpdate(row.id,'prev_delivered',v)} />
                    </td>
                    <td className="px-1 py-1 border-r border-gray-300">
                      <CellInput value={row.starting_balance||''} onSave={v => onUpdate(row.id,'starting_balance',v)} />
                    </td>
                    {DAYS.map(d => (
                      <>
                        <td key={d+'i'} className="px-1 py-1 border-l border-gray-400">
                          <CellInput value={row[`${d}_inv`]||''} onSave={v => onUpdate(row.id,`${d}_inv`,v)} />
                        </td>
                        <td key={d+'d'} className="px-1 py-1 border-l border-r border-gray-400">
                          <CellInput value={row[`${d}_dep`]||''} onSave={v => onUpdate(row.id,`${d}_dep`,v)} />
                        </td>
                      </>
                    ))}
                    <td className={`px-2 py-1 text-right font-semibold border-l border-gray-100 ${end < 0 ? 'text-red-600' : end > 0 ? 'text-gray-800' : 'text-gray-400'}`}>
                      {fmtC(end)}
                    </td>
                    <td className="px-1 py-1 border-l border-gray-100">
                      <TextCell value={row.notes||''} onSave={v => onUpdate(row.id,'notes',v)} placeholder="Notes…" />
                    </td>
                    <td className="px-1 text-center">
                      <button onClick={() => onDelete(row.id)} className="text-red-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                    </td>
                  </tr>
                )
              })}
            </>
          ))}

          {/* Subtotals */}
          <tr className="bg-amber-50 font-semibold border-t-2 border-amber-200">
            <td className="px-3 py-2 text-gray-700 text-[11px] font-bold">Subtotals</td>
            <td className="px-2 py-2 text-right text-gray-600 text-[11px]">{fmtC(rows.reduce((s,r) => s + (parseFloat(r.prev_delivered)||0), 0))}</td>
            <td className="px-2 py-2 text-right text-gray-600 border-r border-amber-200 text-[11px]">{fmtC(rows.reduce((s,r) => s + (parseFloat(r.starting_balance)||0), 0))}</td>
            {DAYS.map(d => {
              const invS = rows.reduce((s,r) => s + (parseFloat(r[`${d}_inv`])||0), 0)
              const depS = rows.reduce((s,r) => s + (parseFloat(r[`${d}_dep`])||0), 0)
              return (
                <>
                  <td key={d+'i'} className="px-2 py-2 text-right text-gray-600 border-l border-amber-200 text-[11px]">{fmtC(invS)}</td>
                  <td key={d+'d'} className="px-2 py-2 text-right text-gray-600 text-[11px]">{fmtC(depS)}</td>
                </>
              )
            })}
            <td className="px-2 py-2 text-right text-gray-800 border-l border-amber-200">{fmtC(summary.totEnd)}</td>
            <td /><td />
          </tr>

          {/* New group row */}
          <tr className="bg-gray-50 border-t-2 border-gray-200">
            <td colSpan={14} className="px-3 py-2">
              <div className="flex items-center gap-2">
                <input
                  type="text" value={newManager}
                  onChange={e => setNewManager(e.target.value)}
                  onKeyDown={e => { if (e.key==='Enter' && newManager.trim()) { onAdd(section.key, newManager.trim()); setNewManager('') }}}
                  placeholder="New Group Manager Name…"
                  className="text-xs border border-gray-200 rounded px-2 py-1 w-52 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
                <button
                  onClick={() => { if (newManager.trim()) { onAdd(section.key, newManager.trim()); setNewManager('') }}}
                  disabled={!newManager.trim()}
                  className="text-xs px-2 py-1 bg-green-700 text-white rounded hover:bg-green-800 disabled:opacity-40"
                >+ Add Group & Row</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ── Payable Table ─────────────────────────────────────────────────────────────
const COL_LABELS = { payee:'Payee', amount_current:'Amount', amount_future:'Future', due_date:'Due Date', rate:'Rate' }
const AMOUNT_COLS = new Set(['amount_current','amount_future'])

function PayableTable({ cat, rows, subtotal, onUpdate, onDelete, onAdd }) {
  const getLabel = c => (cat.colLabels && cat.colLabels[c]) || COL_LABELS[c]
  const visibleRows = rows
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
      <div className="bg-green-800 text-white px-4 py-2.5 flex items-center justify-between flex-shrink-0">
        <h3 className="text-sm font-bold">{cat.label}</h3>
        <span className="text-xs font-semibold text-green-100">{fmtC(subtotal)}</span>
      </div>
      <table className="w-full text-xs">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {cat.cols.map(c => (
              <th key={c} className={`px-3 py-2 font-semibold text-gray-500 ${AMOUNT_COLS.has(c) ? 'text-center' : 'text-left'}`}>
                {getLabel(c)}
              </th>
            ))}
            <th className="w-8" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {visibleRows.map(row => (
            <tr key={row.id} className="hover:bg-gray-50 group">
              {cat.cols.map(c => (
                <td key={c} className={`px-2 py-1 ${AMOUNT_COLS.has(c) ? 'text-center' : ''}`}>
                  {AMOUNT_COLS.has(c)
                    ? <CellInput value={row[c]||''} onSave={v => onUpdate(row.id, c, v)} align="center" />
                    : <TextCell  value={row[c]||''} onSave={v => onUpdate(row.id, c, v)} placeholder={getLabel(c)} />}
                </td>
              ))}
              <td className="px-1 text-center">
                <button onClick={() => onDelete(row.id)} className="text-red-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-3 py-2 border-t border-gray-100 bg-gray-50 flex items-center justify-between flex-shrink-0">
        <button onClick={onAdd} className="text-xs text-green-700 hover:text-green-900 font-medium">+ Add row</button>
        <span className="text-xs font-semibold text-gray-700">Subtotal: {fmtC(subtotal)}</span>
      </div>
    </div>
  )
}

// ── Payables Alloc Section ────────────────────────────────────────────────────
const PAY_ALLOC_SUBS = [
  { key:'prelim',         label:'Prelims',         subtotalCol:'amount_current' },
  { key:'credit_card',    label:'Credit Cards',    subtotalCol:'amount_current' },
  { key:'credit_account', label:'Credit Vendors',  subtotalCol:['amount_current','amount_future'] },
  { key:'non_credit',     label:'Standard Vendors',subtotalCol:['amount_current','amount_future'] },
]

function PayablesAllocSection({ rows, onUpdate, onDelete, onAddFromPayable, paySubtotalFn, payablesByCategory }) {
  const [openDropdown, setOpenDropdown] = useState(null)
  const sectionTotal = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col">
      <div className="bg-blue-800 text-white px-4 py-2.5 flex items-center justify-between flex-shrink-0 rounded-t-xl">
        <h3 className="text-sm font-bold">4 — Payables Allocations</h3>
        <span className="text-xs font-semibold text-blue-100">{fmtC(sectionTotal)}</span>
      </div>
      {PAY_ALLOC_SUBS.map(sub => {
        const subRows = rows.filter(r => r.subsection === sub.key)
        const payTotal = paySubtotalFn(sub.key, sub.subtotalCol)
        const usedIds = new Set(subRows.map(r => r.source_payable_id).filter(Boolean))
        const available = (payablesByCategory[sub.key] || []).filter(p =>
          (p.payee || '').trim() && !usedIds.has(p.id)
        )
        const isOpen = openDropdown === sub.key
        return (
          <div key={sub.key} className="border-b border-gray-100 last:border-b-0">
            <div className="bg-blue-50 border-b border-blue-100 px-3 py-1.5 flex items-center justify-between relative">
              <span className="text-xs font-semibold text-blue-600">{sub.label}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setOpenDropdown(isOpen ? null : sub.key)}
                  className="w-5 h-5 flex items-center justify-center rounded-full bg-blue-200 hover:bg-blue-300 text-blue-700 font-bold text-sm leading-none"
                  title="Add from payables"
                >+</button>
              </div>
              {isOpen && (
                <div className="absolute right-0 top-full z-30 bg-white border border-gray-200 rounded-lg shadow-xl min-w-[260px]">
                  <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Select from {sub.label}</span>
                    <button onClick={() => setOpenDropdown(null)} className="text-gray-400 hover:text-gray-600 text-sm leading-none">✕</button>
                  </div>
                  {available.length === 0
                    ? <div className="px-3 py-2 text-xs text-gray-400 italic">All rows already added</div>
                    : available.map(p => {
                        const cols = Array.isArray(sub.subtotalCol) ? sub.subtotalCol : [sub.subtotalCol]
                        const amt = cols.reduce((s,c) => s + (parseFloat(p[c]) || 0), 0)
                        return (
                          <button
                            key={p.id}
                            onClick={() => { onAddFromPayable(sub.key, p, amt); setOpenDropdown(null) }}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 flex justify-between items-center gap-3 border-b border-gray-50 last:border-b-0"
                          >
                            <span className="text-gray-700">{p.payee}</span>
                            <span className="text-gray-500 font-medium shrink-0">{fmtC(amt)}</span>
                          </button>
                        )
                      })
                  }
                </div>
              )}
            </div>
            {subRows.length > 0 && (
              <table className="w-full text-xs">
                <tbody className="divide-y divide-gray-100">
                  {subRows.map(row => (
                    <tr key={row.id} className="hover:bg-gray-50 group">
                      <td className="px-3 py-1.5 text-gray-700">{row.label}</td>
                      <td className="px-2 py-1 w-28">
                        <CellInput value={row.amount||''} onSave={v => onUpdate(row.id,'amount',v)} />
                      </td>
                      <td className="px-1 text-center w-8">
                        <button onClick={() => onDelete(row.id)} className="text-red-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Financial Table ───────────────────────────────────────────────────────────
function FinancialTable({ sec, rows, total, onUpdate, onDelete, onAdd, canAdd = false, cashOnHandTotal = 0 }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
      <div className="bg-blue-800 text-white px-4 py-2.5 flex items-center justify-between flex-shrink-0">
        <h3 className="text-sm font-bold">{sec.label}</h3>
        <span className="text-xs font-semibold text-blue-100">{fmtC(total)}</span>
      </div>
      <table className="w-full text-xs">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-gray-500">Account / Type</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-500 w-28">Amount</th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(row => {
            if (row.formula_type === 'pct_cash_on_hand') {
              const pct = row.formula_pct ?? 0.01
              const pctLabel = `${parseFloat((pct * 100).toPrecision(4))}%`
              return (
                <tr key={row.id} className="bg-sky-50">
                  <td className="px-3 py-1.5 text-sky-800 font-semibold text-[11px] italic">
                    {row.label} <span className="font-normal text-sky-500">({pctLabel} of Cash On Hand)</span>
                  </td>
                  <td className="px-3 py-1.5 text-right font-bold text-sky-800 text-[11px]">{fmtC(cashOnHandTotal * pct)}</td>
                  <td />
                </tr>
              )
            }
            return (
              <tr key={row.id} className="hover:bg-gray-50 group">
                <td className="px-2 py-1"><TextCell value={row.label||''} onSave={v => onUpdate(row.id,'label',v)} placeholder="Label…" /></td>
                <td className="px-2 py-1"><CellInput value={row.amount||''} onSave={v => onUpdate(row.id,'amount',v)} /></td>
                <td className="px-1 text-center">
                  <button onClick={() => onDelete(row.id)} className="text-red-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {canAdd && (
        <div className="px-3 py-2 border-t border-gray-100 bg-gray-50 flex-shrink-0">
          <button onClick={onAdd} className="text-xs text-green-700 hover:text-green-900 font-medium">+ Add row</button>
        </div>
      )}
    </div>
  )
}
