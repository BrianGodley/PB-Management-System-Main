import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

// ── Constants ────────────────────────────────────────────────
const DIVISION_OPTIONS = [
  'Carpentry', 'Concrete Pumper', 'Crane Equipment', 'Demo / Excavation',
  'Design', 'Electrical', 'Engineering', 'Fencing', 'Framing',
  'Grading', 'HVAC', 'Landscaping', 'Masonry / Paving Stone',
  'Painting', 'Plumbing', 'Pool Construction', 'Pool Coping',
  'Pool Equipment', 'Pool Finishing', 'Pool Steel', 'Roofing',
  'Shotcrete', 'Stucco', 'Tile', 'Waterproofing', 'Other',
]

const STATUS_OPTIONS = [
  { value: 'no_email',  label: 'No Email',       cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  { value: 'ready',     label: 'Ready to Invite', cls: 'bg-teal-50 text-teal-700 border-teal-200'  },
  { value: 'active',    label: 'Active',          cls: 'bg-green-50 text-green-700 border-green-200' },
  { value: 'inactive',  label: 'Inactive',        cls: 'bg-red-50 text-red-600 border-red-200'     },
]

function statusInfo(val) {
  return STATUS_OPTIONS.find(s => s.value === val) || STATUS_OPTIONS[0]
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function isExpired(d) {
  if (!d) return false
  return new Date(d) < new Date()
}

function isSoonExpiring(d) {
  if (!d) return false
  const diff = (new Date(d) - new Date()) / (1000 * 60 * 60 * 24)
  return diff >= 0 && diff <= 30
}

const EMPTY_FORM = {
  company_name: '', divisions: [], status: 'no_email',
  primary_contact: '', email: '', cell: '', phone: '',
  trade_agreement_status: '', liability_exp: '', workers_comp_exp: '', notes: '',
}

// ── Main Page ────────────────────────────────────────────────
export default function SubsVendors() {
  const [subs,      setSubs]      = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [filter,    setFilter]    = useState('all')   // 'all' | status value
  const [showModal, setShowModal] = useState(false)
  const [editSub,   setEditSub]   = useState(null)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')
  const [sortDir,     setSortDir]     = useState('asc')
  const [selected,    setSelected]    = useState(new Set())
  const [showImport,  setShowImport]  = useState(false)
  const [importRows,  setImportRows]  = useState([])
  const [importError, setImportError] = useState('')
  const [importing,   setImporting]   = useState(false)
  const importFileRef = useRef(null)

  useEffect(() => { fetchSubs() }, [])

  async function fetchSubs() {
    setLoading(true)
    const { data, error } = await supabase
      .from('subs_vendors')
      .select('*')
      .order('company_name')
    if (error) console.error('fetchSubs:', error)
    if (data) setSubs(data)
    setLoading(false)
  }

  function openNew() {
    setEditSub(null)
    setForm(EMPTY_FORM)
    setError('')
    setShowModal(true)
  }

  function openEdit(sub) {
    setEditSub(sub)
    setForm({
      company_name:           sub.company_name || '',
      divisions:              sub.divisions || [],
      status:                 sub.status || 'no_email',
      primary_contact:        sub.primary_contact || '',
      email:                  sub.email || '',
      cell:                   sub.cell || '',
      phone:                  sub.phone || '',
      trade_agreement_status: sub.trade_agreement_status || '',
      liability_exp:          sub.liability_exp || '',
      workers_comp_exp:       sub.workers_comp_exp || '',
      notes:                  sub.notes || '',
    })
    setError('')
    setShowModal(true)
  }

  function closeModal() { setShowModal(false); setEditSub(null) }

  function toggleDivision(div) {
    setForm(f => ({
      ...f,
      divisions: f.divisions.includes(div)
        ? f.divisions.filter(d => d !== div)
        : [...f.divisions, div],
    }))
  }

  async function saveSub() {
    if (!form.company_name.trim()) { setError('Company name is required.'); return }
    setSaving(true)
    setError('')
    const payload = {
      company_name:           form.company_name.trim(),
      divisions:              form.divisions,
      status:                 form.status,
      primary_contact:        form.primary_contact.trim() || null,
      email:                  form.email.trim() || null,
      cell:                   form.cell.trim() || null,
      phone:                  form.phone.trim() || null,
      trade_agreement_status: form.trade_agreement_status.trim() || null,
      liability_exp:          form.liability_exp || null,
      workers_comp_exp:       form.workers_comp_exp || null,
      notes:                  form.notes.trim() || null,
      updated_at:             new Date().toISOString(),
    }
    const { error } = editSub
      ? await supabase.from('subs_vendors').update(payload).eq('id', editSub.id)
      : await supabase.from('subs_vendors').insert(payload)
    if (error) { console.error(error); setError('Failed to save. Try again.'); setSaving(false); return }
    setSaving(false)
    closeModal()
    fetchSubs()
  }

  async function deleteSub(sub) {
    if (!confirm(`Delete "${sub.company_name}"? This cannot be undone.`)) return
    await supabase.from('subs_vendors').delete().eq('id', sub.id)
    setSubs(prev => prev.filter(s => s.id !== sub.id))
    setSelected(prev => { const n = new Set(prev); n.delete(sub.id); return n })
  }

  // ── Export ─────────────────────────────────────────────────
  function exportCSV() {
    const headers = [
      'Company Name', 'Divisions', 'Status', 'Primary Contact',
      'Email', 'Cell', 'Phone', 'Trade Agreement Status',
      'Liability Exp Date', 'Workers Comp Exp Date', 'Notes',
    ]
    const escape = v => {
      if (v == null || v === '') return ''
      const s = String(v)
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s
    }
    const rows = [
      headers.join(','),
      ...filtered.map(s => [
        escape(s.company_name),
        escape((s.divisions || []).join('|')),
        escape(s.status),
        escape(s.primary_contact),
        escape(s.email),
        escape(s.cell),
        escape(s.phone),
        escape(s.trade_agreement_status),
        escape(s.liability_exp),
        escape(s.workers_comp_exp),
        escape(s.notes),
      ].join(',')),
    ]
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `subs-vendors-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Import ─────────────────────────────────────────────────
  function parseCSV(text) {
    const lines = text.trim().split('\n')
    if (lines.length < 2) return []

    // Parse a single CSV line respecting quoted fields
    function parseLine(line) {
      const fields = []
      let cur = '', inQuote = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (ch === '"') {
          if (inQuote && line[i + 1] === '"') { cur += '"'; i++ }
          else inQuote = !inQuote
        } else if (ch === ',' && !inQuote) {
          fields.push(cur.trim()); cur = ''
        } else {
          cur += ch
        }
      }
      fields.push(cur.trim())
      return fields
    }

    const headers = parseLine(lines[0]).map(h => h.toLowerCase().trim())

    // Flexible column mapping
    const col = name => {
      const aliases = {
        company_name:           ['company name', 'company', 'name'],
        divisions:              ['divisions', 'division', 'trade', 'trades'],
        status:                 ['status'],
        primary_contact:        ['primary contact', 'contact', 'contact name'],
        email:                  ['email', 'e-mail'],
        cell:                   ['cell', 'mobile', 'cell phone'],
        phone:                  ['phone', 'phone number', 'office phone'],
        trade_agreement_status: ['trade agreement status', 'trade agreement'],
        liability_exp:          ['liability exp date', 'liability exp', 'liability expiration'],
        workers_comp_exp:       ['workers comp exp date', "worker's comp exp date", 'workers comp exp', 'workers comp'],
        notes:                  ['notes', 'note'],
      }
      const list = aliases[name] || [name]
      for (const alias of list) {
        const idx = headers.indexOf(alias)
        if (idx !== -1) return idx
      }
      return -1
    }

    const get = (fields, name) => {
      const idx = col(name)
      return idx >= 0 ? (fields[idx] || '').trim() : ''
    }

    return lines.slice(1).filter(l => l.trim()).map((line, i) => {
      const f = parseLine(line)
      const company = get(f, 'company_name')
      if (!company) return null

      // Parse divisions — pipe or semicolon separated
      const rawDivs = get(f, 'divisions')
      const divisions = rawDivs
        ? rawDivs.split(/[|;]/).map(d => d.trim()).filter(Boolean)
        : []

      // Normalize status
      const rawStatus = get(f, 'status').toLowerCase()
      const status = ['no_email','ready','active','inactive'].find(s => rawStatus.includes(s.replace('_',''))) || 'no_email'

      return {
        _row: i + 2,
        company_name:           company,
        divisions,
        status,
        primary_contact:        get(f, 'primary_contact') || null,
        email:                  get(f, 'email') || null,
        cell:                   get(f, 'cell') || null,
        phone:                  get(f, 'phone') || null,
        trade_agreement_status: get(f, 'trade_agreement_status') || null,
        liability_exp:          get(f, 'liability_exp') || null,
        workers_comp_exp:       get(f, 'workers_comp_exp') || null,
        notes:                  get(f, 'notes') || null,
      }
    }).filter(Boolean)
  }

  function handleImportFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError('')
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const rows = parseCSV(ev.target.result)
        if (rows.length === 0) { setImportError('No valid rows found. Check your CSV format.'); return }
        setImportRows(rows)
        setShowImport(true)
      } catch (err) {
        setImportError('Could not parse file. Make sure it is a valid CSV.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function confirmImport() {
    setImporting(true)
    const payload = importRows.map(({ _row, ...row }) => row)
    const { error } = await supabase.from('subs_vendors').insert(payload)
    if (error) {
      console.error(error)
      setImportError('Import failed: ' + error.message)
      setImporting(false)
      return
    }
    setImporting(false)
    setShowImport(false)
    setImportRows([])
    fetchSubs()
  }

  // Filter + search
  const filtered = subs
    .filter(s => filter === 'all' || s.status === filter)
    .filter(s => {
      const q = search.toLowerCase()
      return !q
        || (s.company_name || '').toLowerCase().includes(q)
        || (s.primary_contact || '').toLowerCase().includes(q)
        || (s.divisions || []).some(d => d.toLowerCase().includes(q))
        || (s.cell || '').includes(q)
        || (s.phone || '').includes(q)
    })
    .sort((a, b) => {
      const cmp = (a.company_name || '').localeCompare(b.company_name || '')
      return sortDir === 'asc' ? cmp : -cmp
    })

  const toggleSelect = id => setSelected(prev => {
    const n = new Set(prev)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })
  const toggleAll = () => setSelected(
    selected.size === filtered.length ? new Set() : new Set(filtered.map(s => s.id))
  )

  return (
    <div className="flex flex-col h-full">

      {/* ── Page header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0 gap-3">
        <h1 className="text-xl font-bold text-gray-900">Subs / Vendors</h1>
        <div className="flex items-center gap-2 ml-auto">
          {/* Filter tabs */}
          <div className="hidden sm:flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {[{ v: 'all', l: 'All' }, ...STATUS_OPTIONS.map(s => ({ v: s.value, l: s.label }))].map(opt => (
              <button
                key={opt.v}
                onClick={() => setFilter(opt.v)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  filter === opt.v ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {opt.l}
              </button>
            ))}
          </div>
          {/* Import */}
          <button
            onClick={() => importFileRef.current?.click()}
            className="text-sm px-3 py-1.5 flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import
          </button>
          <input ref={importFileRef} type="file" accept=".csv" className="hidden" onChange={handleImportFile} />

          {/* Export */}
          <button
            onClick={exportCSV}
            className="text-sm px-3 py-1.5 flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>

          {/* Add */}
          <button
            onClick={openNew}
            className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1.5 whitespace-nowrap"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            + Sub/Vendor
          </button>
        </div>
      </div>

      {/* ── Search bar ──────────────────────────────────────── */}
      <div className="mb-3 flex-shrink-0">
        <input
          type="text"
          placeholder="Search by company, contact, division, or phone…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input text-sm w-full max-w-md"
        />
      </div>

      {/* ── Stats row ───────────────────────────────────────── */}
      <div className="flex gap-2 mb-4 flex-shrink-0 overflow-x-auto pb-1">
        {[
          { label: 'Total',      count: subs.length,                                                  color: 'text-gray-700' },
          { label: 'Active',     count: subs.filter(s => s.status === 'active').length,               color: 'text-green-700' },
          { label: 'Ready',      count: subs.filter(s => s.status === 'ready').length,                color: 'text-teal-700' },
          { label: 'No Email',   count: subs.filter(s => s.status === 'no_email').length,             color: 'text-gray-500' },
          { label: 'Ins. Expiring', count: subs.filter(s => isSoonExpiring(s.liability_exp) || isSoonExpiring(s.workers_comp_exp)).length, color: 'text-orange-600' },
        ].map(s => (
          <div key={s.label} className="flex-shrink-0 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm flex items-center gap-2">
            <span className="text-xs text-gray-500">{s.label}</span>
            <span className={`text-sm font-bold ${s.color}`}>{s.count}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-green-700" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-gray-400 py-20">
          <p className="text-5xl mb-3">🔧</p>
          <p className="text-sm font-medium text-gray-500">{search ? 'No results found' : 'No subs or vendors yet'}</p>
          {!search && <button onClick={openNew} className="btn-primary text-sm px-4 py-2 mt-4">Add First Entry</button>}
        </div>
      ) : (
        <>
          {/* ── Desktop table ─────────────────────────────────── */}
          <div className="hidden lg:block overflow-auto rounded-xl border border-gray-200 shadow-sm flex-1">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-3 w-8">
                    <input type="checkbox"
                      checked={selected.size === filtered.length && filtered.length > 0}
                      onChange={toggleAll}
                      className="accent-green-700" />
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-800 select-none"
                    onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                  >
                    Company Name {sortDir === 'asc' ? '↑' : '↓'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Divisions</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Primary Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Liability Exp.</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">W/C Exp.</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Cell</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filtered.map(sub => {
                  const st = statusInfo(sub.status)
                  const liabExp = isExpired(sub.liability_exp)
                  const liabSoon = isSoonExpiring(sub.liability_exp)
                  const wcExp = isExpired(sub.workers_comp_exp)
                  const wcSoon = isSoonExpiring(sub.workers_comp_exp)
                  return (
                    <tr key={sub.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-3 py-3">
                        <input type="checkbox"
                          checked={selected.has(sub.id)}
                          onChange={() => toggleSelect(sub.id)}
                          className="accent-green-700" />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openEdit(sub)}
                          className="text-blue-600 hover:text-blue-800 font-medium text-left hover:underline"
                        >
                          {sub.company_name}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-[200px]">
                        <span className="truncate block">{(sub.divisions || []).join(', ') || <span className="text-gray-300 italic">—</span>}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${st.cls}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{sub.primary_contact || <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${liabExp ? 'text-red-600' : liabSoon ? 'text-orange-500' : 'text-gray-600'}`}>
                          {fmtDate(sub.liability_exp)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${wcExp ? 'text-red-600' : wcSoon ? 'text-orange-500' : 'text-gray-600'}`}>
                          {fmtDate(sub.workers_comp_exp)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{sub.cell || <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{sub.phone || <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(sub)}
                            className="p-1.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z" />
                            </svg>
                          </button>
                          <button onClick={() => deleteSub(sub)}
                            className="p-1.5 rounded hover:bg-red-100 text-gray-400 hover:text-red-500">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* ── Mobile card list ───────────────────────────────── */}
          <div className="lg:hidden space-y-3 overflow-y-auto flex-1 pb-4">
            {filtered.map(sub => {
              const st = statusInfo(sub.status)
              const liabExp = isExpired(sub.liability_exp)
              const wcExp = isExpired(sub.workers_comp_exp)
              return (
                <div key={sub.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
                  onClick={() => openEdit(sub)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-blue-600 text-sm truncate">{sub.company_name}</p>
                      {sub.primary_contact && <p className="text-xs text-gray-500 mt-0.5">{sub.primary_contact}</p>}
                      {(sub.divisions || []).length > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5">{sub.divisions.join(', ')}</p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${st.cls}`}>
                      {st.label}
                    </span>
                  </div>
                  <div className="flex gap-4 mt-3 text-xs text-gray-500">
                    {sub.cell && <span>📱 {sub.cell}</span>}
                    {sub.phone && <span>📞 {sub.phone}</span>}
                  </div>
                  {(liabExp || wcExp) && (
                    <p className="text-xs text-red-500 mt-2 font-medium">
                      ⚠️ {liabExp && 'Liability'}{liabExp && wcExp && ' & '}{wcExp && "Worker's Comp"} insurance expired
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Count footer */}
      {filtered.length > 0 && (
        <div className="flex-shrink-0 pt-2 text-xs text-gray-400">
          Showing {filtered.length} of {subs.length} {subs.length === 1 ? 'entry' : 'entries'}
          {selected.size > 0 && <span className="ml-2 text-green-700 font-medium">· {selected.size} selected</span>}
        </div>
      )}

      {/* Import Preview Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-[720px] flex flex-col max-h-[92vh]">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
              <div>
                <h2 className="text-base font-bold text-gray-900">Import Preview</h2>
                <p className="text-xs text-gray-400 mt-0.5">{importRows.length} rows ready to import</p>
              </div>
              <button onClick={() => { setShowImport(false); setImportRows([]) }}
                className="text-gray-300 hover:text-gray-500 p-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Preview table */}
            <div className="flex-1 overflow-auto px-5 py-4">
              {importError && <p className="text-xs text-red-500 mb-3">{importError}</p>}
              <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['Company Name', 'Divisions', 'Status', 'Contact', 'Email', 'Cell', 'Liability Exp', 'W/C Exp'].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {importRows.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-800 max-w-[180px] truncate">{row.company_name}</td>
                      <td className="px-3 py-2 text-gray-500 max-w-[140px] truncate">{(row.divisions || []).join(', ') || '—'}</td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded-full border text-[10px] font-medium ${statusInfo(row.status).cls}`}>
                          {statusInfo(row.status).label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-600">{row.primary_contact || '—'}</td>
                      <td className="px-3 py-2 text-gray-500 max-w-[140px] truncate">{row.email || '—'}</td>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{row.cell || '—'}</td>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{row.liability_exp || '—'}</td>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{row.workers_comp_exp || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 flex gap-2 flex-shrink-0 border-t border-gray-100">
              <button onClick={confirmImport} disabled={importing}
                className="flex-1 btn-primary text-sm py-3 disabled:opacity-50">
                {importing ? 'Importing…' : `Import ${importRows.length} Records`}
              </button>
              <button onClick={() => { setShowImport(false); setImportRows([]) }}
                className="px-5 py-3 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <SubModal
          form={form}
          setForm={setForm}
          isEdit={!!editSub}
          onSave={saveSub}
          onClose={closeModal}
          onDelete={editSub ? () => { deleteSub(editSub); closeModal() } : null}
          saving={saving}
          error={error}
          toggleDivision={toggleDivision}
        />
      )}
    </div>
  )
}

// ── Add / Edit Modal ─────────────────────────────────────────
function SubModal({ form, setForm, isEdit, onSave, onClose, onDelete, saving, error, toggleDivision }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-[560px] flex flex-col max-h-[95vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900">
            {isEdit ? 'Edit Sub / Vendor' : 'Add Sub / Vendor'}
          </h2>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 p-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

          {/* Company name */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Company Name <span className="text-red-400">*</span></label>
            <input type="text" value={form.company_name}
              onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
              placeholder="e.g. SUB - ABC Electric" className="input text-sm w-full" autoFocus />
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className="input text-sm w-full">
              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {/* Divisions */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Divisions / Trades</label>
            <div className="flex flex-wrap gap-1.5">
              {DIVISION_OPTIONS.map(div => (
                <button
                  key={div}
                  type="button"
                  onClick={() => toggleDivision(div)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    form.divisions.includes(div)
                      ? 'bg-green-700 text-white border-green-700'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-green-400 hover:text-green-700'
                  }`}
                >
                  {div}
                </button>
              ))}
            </div>
          </div>

          {/* Contact info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Primary Contact</label>
              <input type="text" value={form.primary_contact}
                onChange={e => setForm(f => ({ ...f, primary_contact: e.target.value }))}
                placeholder="Full name" className="input text-sm w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input type="email" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="email@example.com" className="input text-sm w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cell</label>
              <input type="tel" value={form.cell}
                onChange={e => setForm(f => ({ ...f, cell: e.target.value }))}
                placeholder="+1 818-555-0000" className="input text-sm w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
              <input type="tel" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="818-555-0000" className="input text-sm w-full" />
            </div>
          </div>

          {/* Insurance */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Insurance</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Liability Exp. Date</label>
                <input type="date" value={form.liability_exp}
                  onChange={e => setForm(f => ({ ...f, liability_exp: e.target.value }))}
                  className="input text-sm w-full" />
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Worker's Comp Exp. Date</label>
                <input type="date" value={form.workers_comp_exp}
                  onChange={e => setForm(f => ({ ...f, workers_comp_exp: e.target.value }))}
                  className="input text-sm w-full" />
              </div>
            </div>
          </div>

          {/* Trade agreement status */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Trade Agreement Status</label>
            <input type="text" value={form.trade_agreement_status}
              onChange={e => setForm(f => ({ ...f, trade_agreement_status: e.target.value }))}
              placeholder="e.g. Signed, Pending, Not required" className="input text-sm w-full" />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3} placeholder="Optional notes…" className="input text-sm w-full resize-none" />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 flex gap-2 flex-shrink-0 border-t border-gray-100">
          <button onClick={onSave} disabled={saving}
            className="flex-1 btn-primary text-sm py-3 disabled:opacity-50">
            {saving ? 'Saving…' : isEdit ? 'Update' : 'Save'}
          </button>
          <button onClick={onClose}
            className="px-5 py-3 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          {onDelete && (
            <button onClick={onDelete}
              className="px-3 py-3 text-sm rounded-lg border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600">
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
