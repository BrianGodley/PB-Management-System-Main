// ─────────────────────────────────────────────────────────────────────────────
// HR — Human Resources main page
// Tabs: Employees | Applicants | Review Forms
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ReviewBuilder from '../components/hr/ReviewBuilder'

const DEPARTMENTS = ['Operations', 'Landscaping', 'Pool', 'Admin', 'Sales', 'Other']
const APPLICANT_STATUSES = ['new', 'reviewing', 'interview', 'offered', 'hired', 'rejected']

const STATUS_COLORS = {
  new:        'bg-blue-100 text-blue-700',
  reviewing:  'bg-yellow-100 text-yellow-700',
  interview:  'bg-purple-100 text-purple-700',
  offered:    'bg-orange-100 text-orange-700',
  hired:      'bg-green-100 text-green-700',
  rejected:   'bg-red-100 text-red-700',
}

const STATUS_LABELS = {
  new: 'New', reviewing: 'Reviewing', interview: 'Interview',
  offered: 'Offered', hired: 'Hired', rejected: 'Rejected',
}

// ── Add Employee Modal ────────────────────────────────────────────────────────
function AddEmployeeModal({ onSave, onClose }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    job_title: '', department: '', start_date: '', pay_rate: '', pay_type: 'hourly',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  async function handleSave() {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('First and last name are required')
      return
    }
    setSaving(true)
    const { error: err } = await supabase.from('employees').insert({
      ...form,
      pay_rate: form.pay_rate ? parseFloat(form.pay_rate) : null,
      start_date: form.start_date || null,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Employee</h3>
        {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">First Name *</label>
            <input value={form.first_name} onChange={e => set('first_name', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Last Name *</label>
            <input value={form.last_name} onChange={e => set('last_name', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Job Title</label>
            <input value={form.job_title} onChange={e => set('job_title', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
            <select value={form.department} onChange={e => set('department', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500">
              <option value="">Select…</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
            <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Pay Rate</label>
            <div className="flex gap-2">
              <input type="number" value={form.pay_rate} onChange={e => set('pay_rate', e.target.value)}
                placeholder="0.00"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
              <select value={form.pay_type} onChange={e => set('pay_type', e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-green-500">
                <option value="hourly">hr</option>
                <option value="salary">yr</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-800 disabled:opacity-50">
            {saving ? 'Adding…' : 'Add Employee'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Add Applicant Modal ───────────────────────────────────────────────────────
function AddApplicantModal({ onSave, onClose }) {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', position_applied: '' })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  async function handleSave() {
    if (!form.first_name.trim() || !form.last_name.trim()) { setError('Name required'); return }
    setSaving(true)
    const { error: err } = await supabase.from('applicants').insert(form)
    setSaving(false)
    if (err) { setError(err.message); return }
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Add Applicant</h3>
        {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">First Name *</label>
              <input value={form.first_name} onChange={e => set('first_name', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Last Name *</label>
              <input value={form.last_name} onChange={e => set('last_name', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Position Applying For</label>
            <input value={form.position_applied} onChange={e => set('position_applied', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-800 disabled:opacity-50">
            {saving ? 'Adding…' : 'Add Applicant'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main HR Component ─────────────────────────────────────────────────────────
export default function HR() {
  const navigate = useNavigate()

  const [tab,           setTab]           = useState('employees')
  const [employees,     setEmployees]     = useState([])
  const [applicants,    setApplicants]    = useState([])
  const [reviewForms,   setReviewForms]   = useState([])
  const [loading,       setLoading]       = useState(true)
  const [empFilter,     setEmpFilter]     = useState('active')  // active | archived | all
  const [appFilter,     setAppFilter]     = useState('all')
  const [search,        setSearch]        = useState('')
  const [showAddEmp,    setShowAddEmp]    = useState(false)
  const [showAddApp,    setShowAddApp]    = useState(false)
  const [showBuilder,   setShowBuilder]   = useState(false)
  const [editForm,      setEditForm]      = useState(null)
  const [linkCopied,    setLinkCopied]    = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: eData }, { data: aData }, { data: fData }] = await Promise.all([
      supabase.from('employees').select('*').order('last_name'),
      supabase.from('applicants').select('*').order('applied_at', { ascending: false }),
      supabase.from('hr_review_forms').select('*').order('created_at', { ascending: false }),
    ])
    setEmployees(eData || [])
    setApplicants(aData || [])
    setReviewForms(fData || [])
    setLoading(false)
  }

  function copyApplicationLink() {
    const url = `${window.location.origin}/apply`
    navigator.clipboard.writeText(url)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  // ── Filtered lists ──────────────────────────────────────────────────────────
  const filteredEmps = employees
    .filter(e => empFilter === 'all' || e.status === empFilter)
    .filter(e => search === '' ||
      `${e.first_name} ${e.last_name} ${e.job_title} ${e.department}`.toLowerCase().includes(search.toLowerCase())
    )

  const filteredApps = applicants
    .filter(a => appFilter === 'all' || a.status === appFilter)
    .filter(a => search === '' ||
      `${a.first_name} ${a.last_name} ${a.position_applied}`.toLowerCase().includes(search.toLowerCase())
    )

  function tenure(startDate) {
    if (!startDate) return '—'
    const months = Math.floor((Date.now() - new Date(startDate)) / (1000 * 60 * 60 * 24 * 30.5))
    if (months < 12) return `${months}mo`
    return `${Math.floor(months / 12)}yr ${months % 12}mo`
  }

  async function deleteReviewForm(id) {
    if (!confirm('Delete this review form?')) return
    await supabase.from('hr_review_forms').delete().eq('id', id)
    fetchAll()
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0 gap-3">
        <h1 className="text-xl font-bold text-gray-900">Human Resources</h1>
        <div className="flex gap-2">
          {tab === 'employees' && (
            <button onClick={() => setShowAddEmp(true)} className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-800">
              + Add Employee
            </button>
          )}
          {tab === 'applicants' && (
            <>
              <button
                onClick={copyApplicationLink}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${linkCopied ? 'bg-green-700 text-white border-green-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                {linkCopied ? '✓ Link Copied!' : '🔗 Copy Apply Link'}
              </button>
              <button onClick={() => setShowAddApp(true)} className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-800">
                + Add Applicant
              </button>
            </>
          )}
          {tab === 'forms' && (
            <button onClick={() => { setEditForm(null); setShowBuilder(true) }} className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-800">
              + New Review Form
            </button>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 px-6 flex gap-0 flex-shrink-0">
        {[
          { key: 'employees', label: `Employees (${employees.filter(e => e.status === 'active').length})`, icon: '👤' },
          { key: 'applicants', label: `Applicants (${applicants.length})`, icon: '📋' },
          { key: 'forms', label: `Review Forms (${reviewForms.length})`, icon: '⭐' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setSearch('') }}
            className={`flex items-center gap-1.5 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-green-700 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Search + filter bar */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex items-center gap-3 flex-shrink-0">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={tab === 'employees' ? 'Search employees…' : tab === 'applicants' ? 'Search applicants…' : ''}
          className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-green-500"
        />

        {tab === 'employees' && (
          <div className="flex gap-1">
            {[['active', 'Active'], ['archived', 'Archived'], ['all', 'All']].map(([val, label]) => (
              <button key={val} onClick={() => setEmpFilter(val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${empFilter === val ? 'bg-green-700 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {label}
              </button>
            ))}
          </div>
        )}

        {tab === 'applicants' && (
          <div className="flex gap-1 flex-wrap">
            <button onClick={() => setAppFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${appFilter === 'all' ? 'bg-green-700 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              All
            </button>
            {APPLICANT_STATUSES.map(s => (
              <button key={s} onClick={() => setAppFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${appFilter === s ? 'bg-green-700 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {STATUS_LABELS[s]} ({applicants.filter(a => a.status === s).length})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-400">Loading…</div>
        ) : (

          /* ── EMPLOYEES TAB ── */
          tab === 'employees' ? (
            filteredEmps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <p className="text-4xl mb-3">👤</p>
                <p className="font-medium">No employees found</p>
                <button onClick={() => setShowAddEmp(true)} className="mt-3 px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium">
                  Add First Employee
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEmps.map(emp => (
                  <div
                    key={emp.id}
                    onClick={() => navigate(`/hr/employee/${emp.id}`)}
                    className="bg-white rounded-xl border border-gray-200 p-5 cursor-pointer hover:border-green-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      {emp.avatar_url ? (
                        <img src={emp.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-lg flex-shrink-0">
                          {emp.first_name?.[0]}{emp.last_name?.[0]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900">{emp.first_name} {emp.last_name}</p>
                        <p className="text-xs text-gray-500 truncate">{emp.job_title || '—'}</p>
                      </div>
                      {emp.status === 'archived' && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Archived</span>
                      )}
                    </div>
                    <div className="space-y-1 text-xs text-gray-500">
                      {emp.department && <p>🏢 {emp.department}</p>}
                      {emp.email    && <p>✉️ {emp.email}</p>}
                      {emp.phone    && <p>📞 {emp.phone}</p>}
                      {emp.start_date && (
                        <p>📅 {tenure(emp.start_date)} tenure</p>
                      )}
                      {emp.pay_rate && (
                        <p>💵 ${emp.pay_rate.toLocaleString()}/{emp.pay_type === 'salary' ? 'yr' : 'hr'}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )

          /* ── APPLICANTS TAB ── */
          ) : tab === 'applicants' ? (
            filteredApps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <p className="text-4xl mb-3">📋</p>
                <p className="font-medium">No applicants found</p>
                <div className="flex gap-3 mt-3">
                  <button onClick={copyApplicationLink} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
                    🔗 Copy Apply Link
                  </button>
                  <button onClick={() => setShowAddApp(true)} className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium">
                    + Add Manually
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-w-3xl">
                {filteredApps.map(app => (
                  <div
                    key={app.id}
                    onClick={() => navigate(`/hr/applicant/${app.id}`)}
                    className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:border-green-300 hover:shadow-sm transition-all flex items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                      {app.first_name?.[0]}{app.last_name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{app.first_name} {app.last_name}</p>
                      <p className="text-xs text-gray-500">{app.position_applied || 'No position specified'}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[app.status]}`}>
                        {STATUS_LABELS[app.status]}
                      </span>
                      <p className="text-xs text-gray-400 mt-1">
                        {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )

          /* ── REVIEW FORMS TAB ── */
          ) : (
            reviewForms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <p className="text-4xl mb-3">⭐</p>
                <p className="font-medium">No review forms yet</p>
                <button onClick={() => setShowBuilder(true)} className="mt-3 px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium">
                  Create First Form
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-w-2xl">
                {reviewForms.map(form => (
                  <div key={form.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{form.title}</p>
                      {form.description && <p className="text-sm text-gray-500 mt-0.5">{form.description}</p>}
                      <p className="text-xs text-gray-400 mt-1">{(form.fields || []).length} fields</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEditForm(form); setShowBuilder(true) }}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => deleteReviewForm(form.id)}
                        className="px-3 py-1.5 border border-red-200 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )
        )}
      </div>

      {/* Modals */}
      {showAddEmp && <AddEmployeeModal onSave={() => { setShowAddEmp(false); fetchAll() }} onClose={() => setShowAddEmp(false)} />}
      {showAddApp && <AddApplicantModal onSave={() => { setShowAddApp(false); fetchAll() }} onClose={() => setShowAddApp(false)} />}
      {showBuilder && (
        <ReviewBuilder
          form={editForm}
          onSave={() => { setShowBuilder(false); setEditForm(null); fetchAll() }}
          onClose={() => { setShowBuilder(false); setEditForm(null) }}
        />
      )}
    </div>
  )
}
