// ─────────────────────────────────────────────────────────────────────────────
// HR — Human Resources main page
// Tabs: Employees | Applicants | Review Forms
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useCachedData } from '../lib/useCachedData'
import AddEmployeeModal from '../components/AddEmployeeModal'
import ReviewBuilder from '../components/hr/ReviewBuilder'

const APPLICANT_STATUSES = ['new', 'reviewing', 'interview', 'offered', 'hired', 'rejected']

const STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-700',
  reviewing: 'bg-yellow-100 text-yellow-700',
  interview: 'bg-purple-100 text-purple-700',
  offered: 'bg-orange-100 text-orange-700',
  hired: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

const STATUS_LABELS = {
  new: 'New',
  reviewing: 'Reviewing',
  interview: 'Interview',
  offered: 'Offered',
  hired: 'Hired',
  rejected: 'Rejected',
}

// ── Add Applicant Modal ───────────────────────────────────────────────────────
function AddApplicantModal({ onSave, onClose }) {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    position_applied: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  async function handleSave() {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('Name required')
      return
    }
    setSaving(true)
    const { error: err } = await supabase.from('applicants').insert(form)
    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Add Applicant</h3>
        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">First Name *</label>
              <input
                value={form.first_name}
                onChange={e => set('first_name', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Last Name *</label>
              <input
                value={form.last_name}
                onChange={e => set('last_name', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
            <input
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Position Applying For
            </label>
            <input
              value={form.position_applied}
              onChange={e => set('position_applied', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-800 disabled:opacity-50"
          >
            {saving ? 'Adding…' : 'Add Applicant'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Data fetch ────────────────────────────────────────────────────────────────
// One batched fetch for everything the HR page needs. The returned object is
// cached by useCachedData('hr:all', …) so revisiting HR renders instantly from
// cache and refreshes in the background. The lookup maps are built here (rather
// than in component state) so the cached value is fully self-contained.
async function fetchHrData() {
  const [
    { data: eData },
    { data: aData },
    { data: fData },
    { data: pData },
    { data: gData },
    { data: gmData },
    { data: posData },
    { data: pcData },
    { data: cData },
  ] = await Promise.all([
    supabase.from('employees').select('*').order('last_name'),
    supabase.from('applicants').select('*').order('applied_at', { ascending: false }),
    supabase.from('hr_review_forms').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, email, role'),
    supabase.from('employee_groups').select('*').order('name'),
    supabase.from('employee_group_members').select('group_id, employee_id'),
    supabase.from('positions').select('*').order('title'),
    supabase.from('position_courses').select('position_id, course_id'),
    supabase.from('lms_courses').select('id, title, category').order('title'),
  ])

  // email -> role
  const profileRoles = {}
  ;(pData || []).forEach(p => {
    if (p.email) profileRoles[p.email.toLowerCase()] = p.role
  })

  // groupId -> Set<employee_id>
  const groupMembers = {}
  ;(gmData || []).forEach(m => {
    if (!groupMembers[m.group_id]) groupMembers[m.group_id] = new Set()
    groupMembers[m.group_id].add(m.employee_id)
  })

  // positionId -> Set<course_id>
  const positionCourses = {}
  ;(pcData || []).forEach(r => {
    if (!positionCourses[r.position_id]) positionCourses[r.position_id] = new Set()
    positionCourses[r.position_id].add(r.course_id)
  })

  return {
    employees: eData || [],
    applicants: aData || [],
    reviewForms: fData || [],
    profiles: pData || [],
    profileRoles,
    groups: gData || [],
    groupMembers,
    positions: posData || [],
    positionCourses,
    courses: cData || [],
  }
}

// ── Main HR Component ─────────────────────────────────────────────────────────
export default function HR() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [tab, setTab] = useState('employees')
  const [settingsTab, setSettingsTab] = useState('employee-groups')

  // All HR data comes through the shared cache: a revisit renders instantly
  // from cache, then refreshes quietly in the background. refresh() forces a
  // refetch — called after every save/delete below.
  const { data: hrData, loading, refresh } = useCachedData('hr:all', fetchHrData)
  const employees = hrData?.employees ?? []
  const applicants = hrData?.applicants ?? []
  const reviewForms = hrData?.reviewForms ?? []
  const profiles = hrData?.profiles ?? []
  const profileRoles = hrData?.profileRoles ?? {}
  const groups = hrData?.groups ?? []
  const groupMembers = hrData?.groupMembers ?? {}
  const positions = hrData?.positions ?? []
  const positionCourses = hrData?.positionCourses ?? {}
  const courses = hrData?.courses ?? []

  const [appFilter, setAppFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showAddEmp, setShowAddEmp] = useState(false)
  const [showAddApp, setShowAddApp] = useState(false)
  const [showBuilder, setShowBuilder] = useState(false)
  const [editForm, setEditForm] = useState(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const [sortCol, setSortCol] = useState('name')
  const [sortDir, setSortDir] = useState('asc')

  // Employee Groups state
  const [editingGroup, setEditingGroup] = useState(null) // null | 'new' | group object
  const [groupForm, setGroupForm] = useState({ name: '', description: '', color: '#16a34a' })
  const [groupSaving, setGroupSaving] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState(new Set())

  // Positions state
  const [editingPosition, setEditingPosition] = useState(null) // null | 'new' | position object
  const [positionForm, setPositionForm] = useState({
    title: '',
    description: '',
    vfp: '',
    write_up_url: '',
  })
  const [positionSaving, setPositionSaving] = useState(false)
  const [selectedCourses, setSelectedCourses] = useState(new Set())
  const [posWriteUpFile, setPosWriteUpFile] = useState(null)
  const posWriteUpRef = useRef()

  const isAdmin = (profiles || []).some(
    p => p.id === user?.id && (p.role === 'admin' || p.role === 'super_admin')
  )

  // Deep link from the Org Chart "Add It In the HR Module" link. When the
  // page is opened with ?addPosition=1, auto-open the Add Position modal
  // for admins; non-admins get a rights message instead.
  const [posRightsMsg, setPosRightsMsg] = useState(false)
  const addPositionHandled = useRef(false)
  useEffect(() => {
    if (addPositionHandled.current || !hrData) return
    const params = new URLSearchParams(window.location.search)
    if (!params.get('addPosition')) return
    addPositionHandled.current = true
    if (isAdmin) openNewPosition()
    else setPosRightsMsg(true)
  }, [hrData, isAdmin])

  function openNewGroup() {
    setGroupForm({ name: '', description: '', color: '#16a34a' })
    setSelectedMembers(new Set())
    setEditingGroup('new')
  }

  function openEditGroup(group) {
    setGroupForm({
      name: group.name,
      description: group.description || '',
      color: group.color || '#16a34a',
    })
    setSelectedMembers(new Set(groupMembers[group.id] || []))
    setEditingGroup(group)
  }

  async function saveGroup() {
    if (!groupForm.name.trim()) return
    setGroupSaving(true)
    try {
      let groupId
      if (editingGroup === 'new') {
        const { data, error } = await supabase
          .from('employee_groups')
          .insert({
            name: groupForm.name.trim(),
            description: groupForm.description.trim() || null,
            color: groupForm.color,
          })
          .select()
          .single()
        if (error) throw error
        groupId = data.id
      } else {
        await supabase
          .from('employee_groups')
          .update({
            name: groupForm.name.trim(),
            description: groupForm.description.trim() || null,
            color: groupForm.color,
          })
          .eq('id', editingGroup.id)
        groupId = editingGroup.id
        await supabase.from('employee_group_members').delete().eq('group_id', groupId)
      }
      if (selectedMembers.size > 0) {
        const rows = [...selectedMembers].map(emp_id => ({
          group_id: groupId,
          employee_id: emp_id,
        }))
        await supabase.from('employee_group_members').insert(rows)
      }
      setEditingGroup(null)
      refresh()
    } catch (e) {
      console.error(e)
    }
    setGroupSaving(false)
  }

  async function deleteGroup(id) {
    if (!confirm('Delete this employee group?')) return
    await supabase.from('employee_groups').delete().eq('id', id)
    refresh()
  }

  function toggleMember(empId) {
    setSelectedMembers(prev => {
      const next = new Set(prev)
      if (next.has(empId)) next.delete(empId)
      else next.add(empId)
      return next
    })
  }

  function openNewPosition() {
    setPositionForm({ title: '', description: '', vfp: '', write_up_url: '' })
    setSelectedCourses(new Set())
    setPosWriteUpFile(null)
    setEditingPosition('new')
  }

  function openEditPosition(pos) {
    setPositionForm({
      title: pos.title,
      description: pos.description || '',
      vfp: pos.vfp || '',
      write_up_url: pos.write_up_url || '',
    })
    setSelectedCourses(new Set(positionCourses[pos.id] || []))
    setPosWriteUpFile(null)
    setEditingPosition(pos)
  }

  async function savePosition() {
    if (!positionForm.title.trim()) return
    setPositionSaving(true)
    try {
      let writeUpUrl = positionForm.write_up_url

      // Upload file if chosen
      if (posWriteUpFile) {
        const path = `positions/${Date.now()}_${posWriteUpFile.name}`
        const { error: upErr } = await supabase.storage
          .from('employee-files')
          .upload(path, posWriteUpFile)
        if (!upErr) {
          const {
            data: { publicUrl },
          } = supabase.storage.from('employee-files').getPublicUrl(path)
          writeUpUrl = publicUrl
        }
      }

      let positionId
      if (editingPosition === 'new') {
        const { data, error } = await supabase
          .from('positions')
          .insert({
            title: positionForm.title.trim(),
            description: positionForm.description.trim() || null,
            vfp: positionForm.vfp.trim() || null,
            write_up_url: writeUpUrl || null,
          })
          .select()
          .single()
        if (error) throw error
        positionId = data.id
      } else {
        await supabase
          .from('positions')
          .update({
            title: positionForm.title.trim(),
            description: positionForm.description.trim() || null,
            vfp: positionForm.vfp.trim() || null,
            write_up_url: writeUpUrl || null,
          })
          .eq('id', editingPosition.id)
        positionId = editingPosition.id
        await supabase.from('position_courses').delete().eq('position_id', positionId)
      }

      if (selectedCourses.size > 0) {
        const rows = [...selectedCourses].map(cid => ({ position_id: positionId, course_id: cid }))
        await supabase.from('position_courses').insert(rows)
      }

      setEditingPosition(null)
      refresh()
    } catch (e) {
      console.error(e)
    }
    setPositionSaving(false)
  }

  async function deletePosition(id) {
    if (!confirm('Delete this position?')) return
    await supabase.from('positions').delete().eq('id', id)
    refresh()
  }

  function toggleCourse(courseId) {
    setSelectedCourses(prev => {
      const next = new Set(prev)
      if (next.has(courseId)) next.delete(courseId)
      else next.add(courseId)
      return next
    })
  }

  function copyApplicationLink() {
    const url = `${window.location.origin}/apply`
    navigator.clipboard.writeText(url)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  // ── Sort helpers ────────────────────────────────────────────────────────────
  function toggleSort(col) {
    if (sortCol === col) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  function sortEmployees(list) {
    const dir = sortDir === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      let av, bv
      switch (sortCol) {
        case 'name':
          av = `${a.last_name || ''} ${a.first_name || ''}`.toLowerCase()
          bv = `${b.last_name || ''} ${b.first_name || ''}`.toLowerCase()
          break
        case 'address':
          av = (a.address || a.city || '').toLowerCase()
          bv = (b.address || b.city || '').toLowerCase()
          break
        case 'phone':
          av = (a.phone || '').replace(/\D/g, '')
          bv = (b.phone || '').replace(/\D/g, '')
          break
        case 'email':
          av = (a.email || '').toLowerCase()
          bv = (b.email || '').toLowerCase()
          break
        case 'position':
          av = (a.job_title || '').toLowerCase()
          bv = (b.job_title || '').toLowerCase()
          break
        case 'role':
          av = (profileRoles[a.email?.toLowerCase()] || 'zzz').toLowerCase()
          bv = (profileRoles[b.email?.toLowerCase()] || 'zzz').toLowerCase()
          break
        case 'started':
          av = a.start_date || ''
          bv = b.start_date || ''
          break
        default:
          return 0
      }
      if (av < bv) return -1 * dir
      if (av > bv) return 1 * dir
      return 0
    })
  }

  function SortIcon({ col }) {
    if (sortCol !== col) return <span className="ml-1 text-gray-300">⇅</span>
    return <span className="ml-1 text-green-700">{sortDir === 'asc' ? '▲' : '▼'}</span>
  }

  function SortTh({ col, label, className = '', sticky = false }) {
    const stickyCls = sticky
      ? 'sticky left-0 bg-gray-50 z-10 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]'
      : ''
    return (
      <th
        className={`text-left px-4 py-2 font-semibold text-gray-600 uppercase cursor-pointer select-none hover:text-green-700 transition-colors ${stickyCls} ${className}`}
        onClick={() => toggleSort(col)}
      >
        {label}
        <SortIcon col={col} />
      </th>
    )
  }

  // ── Filtered lists ──────────────────────────────────────────────────────────
  const filteredEmps = employees
    .filter(e => e.status === 'active')
    .filter(
      e =>
        search === '' ||
        `${e.first_name} ${e.last_name} ${e.job_title} ${e.department}`
          .toLowerCase()
          .includes(search.toLowerCase())
    )

  const filteredArchive = employees
    .filter(e => e.status === 'archived')
    .filter(
      e =>
        search === '' ||
        `${e.first_name} ${e.last_name} ${e.job_title} ${e.department}`
          .toLowerCase()
          .includes(search.toLowerCase())
    )

  const filteredApps = applicants
    .filter(a => appFilter === 'all' || a.status === appFilter)
    .filter(
      a =>
        search === '' ||
        `${a.first_name} ${a.last_name} ${a.position_applied}`
          .toLowerCase()
          .includes(search.toLowerCase())
    )

  async function deleteReviewForm(id) {
    if (!confirm('Delete this review form?')) return
    await supabase.from('hr_review_forms').delete().eq('id', id)
    refresh()
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col">
      {posRightsMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[2000] bg-amber-50 border border-amber-300 text-amber-800 text-sm rounded-lg shadow-lg px-4 py-3 flex items-center gap-3">
          <span>You don't have permission to add positions. Please contact an administrator.</span>
          <button
            onClick={() => setPosRightsMsg(false)}
            className="text-amber-600 hover:text-amber-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0 gap-3">
        <h1 className="text-xl font-bold text-gray-900">Human Resources</h1>
        <div className="flex gap-2">
          {tab === 'employees' && (
            <button onClick={() => setShowAddEmp(true)} className="btn-primary text-sm px-3 py-1.5">
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
              <button
                onClick={() => setShowAddApp(true)}
                className="btn-primary text-sm px-3 py-1.5"
              >
                + Add Applicant
              </button>
            </>
          )}
          {tab === 'positions' && (
            <button
              onClick={openNewPosition}
              className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-800"
            >
              + New Position
            </button>
          )}
          {tab === 'forms' && (
            <button
              onClick={() => {
                setEditForm(null)
                setShowBuilder(true)
              }}
              className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-800"
            >
              + New Review Form
            </button>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 px-6 flex gap-0 flex-shrink-0">
        {[
          {
            key: 'employees',
            label: `Employees (${employees.filter(e => e.status === 'active').length})`,
            icon: '👤',
          },
          { key: 'applicants', label: `Applicants (${applicants.length})`, icon: '📋' },
          { key: 'positions', label: `Positions (${positions.length})`, icon: '🏷️' },
          { key: 'forms', label: `Review Forms (${reviewForms.length})`, icon: '⭐' },
          {
            key: 'archive',
            label: `Archive (${employees.filter(e => e.status === 'archived').length})`,
            icon: '📦',
          },
          ...(isAdmin ? [{ key: 'settings', label: 'Settings', icon: '⚙️' }] : []),
        ].map(t => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key)
              setSearch('')
            }}
            className={`flex items-center gap-1.5 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-green-700 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Search + filter bar — hidden on Settings and Positions tabs */}
      {tab !== 'settings' && tab !== 'positions' && (
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex items-center gap-3 flex-shrink-0">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={
              tab === 'employees'
                ? 'Search employees…'
                : tab === 'archive'
                  ? 'Search archive…'
                  : tab === 'applicants'
                    ? 'Search applicants…'
                    : ''
            }
            className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-green-500"
          />

          {tab === 'applicants' && (
            <div className="flex gap-1 flex-wrap">
              <button
                onClick={() => setAppFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${appFilter === 'all' ? 'bg-green-700 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                All
              </button>
              {APPLICANT_STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => setAppFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${appFilter === s ? 'bg-green-700 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  {STATUS_LABELS[s]} ({applicants.filter(a => a.status === s).length})
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-400">Loading…</div>
        ) : /* ── EMPLOYEES TAB ── */
        tab === 'employees' ? (
          filteredEmps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <p className="text-4xl mb-3">👤</p>
              <p className="font-medium">No employees found</p>
              <button
                onClick={() => setShowAddEmp(true)}
                className="mt-3 px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium"
              >
                Add First Employee
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
              <table className="w-full text-xs min-w-[860px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <SortTh col="name" label="Name" sticky />
                    <SortTh col="address" label="Address" />
                    <SortTh col="phone" label="Cell Phone" />
                    <SortTh col="email" label="Email" />
                    <SortTh col="position" label="Position" />
                    <SortTh col="role" label="Role" />
                    <SortTh col="started" label="Started" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortEmployees(filteredEmps).map(emp => {
                    const role = profileRoles[emp.email?.toLowerCase()] || null
                    const location = emp.address
                      ? emp.address
                      : emp.city || emp.state
                        ? `${emp.city}, ${emp.state}`.replace(/^,\s*/, '').replace(/,\s*$/, '')
                        : '—'
                    return (
                      <tr
                        key={emp.id}
                        className="group hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/hr/employee/${emp.id}`)}
                      >
                        <td className="px-4 py-2 sticky left-0 bg-white group-hover:bg-gray-50 z-10 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                          <button className="text-green-700 hover:underline font-medium">
                            {emp.last_name}, {emp.first_name}
                          </button>
                        </td>
                        <td className="px-4 py-2 text-gray-600">{location}</td>
                        <td className="px-4 py-2 text-gray-600">{emp.cell_phone || '—'}</td>
                        <td className="px-4 py-2 text-gray-600">{emp.email || '—'}</td>
                        <td className="px-4 py-2 text-gray-600">{emp.job_title || '—'}</td>
                        <td className="px-4 py-2">
                          {role ? (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                role === 'admin'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {role === 'admin' ? '🛡️ Admin' : '👤 User'}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-gray-600">
                          {emp.start_date
                            ? new Date(emp.start_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: '2-digit',
                              })
                            : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : /* ── APPLICANTS TAB ── */
        tab === 'applicants' ? (
          filteredApps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <p className="text-4xl mb-3">📋</p>
              <p className="font-medium">No applicants found</p>
              <div className="flex gap-3 mt-3">
                <button
                  onClick={copyApplicationLink}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  🔗 Copy Apply Link
                </button>
                <button
                  onClick={() => setShowAddApp(true)}
                  className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium"
                >
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
                    {app.first_name?.[0]}
                    {app.last_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">
                      {app.first_name} {app.last_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {app.position_applied || 'No position specified'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[app.status]}`}
                    >
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
        ) : /* ── ARCHIVE TAB ── */
        tab === 'archive' ? (
          filteredArchive.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <p className="text-4xl mb-3">📦</p>
              <p className="font-medium">No archived employees</p>
              <p className="text-sm mt-1 text-gray-400">Archived employees will appear here.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="table-fixed w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <SortTh col="name" label="Name" />
                    <SortTh col="address" label="Address" />
                    <SortTh col="phone" label="Cell Phone" />
                    <SortTh col="email" label="Email" />
                    <SortTh col="position" label="Position" />
                    <SortTh col="started" label="Started" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortEmployees(filteredArchive).map(emp => {
                    const location = emp.address
                      ? emp.address
                      : emp.city || emp.state
                        ? `${emp.city || ''}, ${emp.state || ''}`
                            .replace(/^,\s*/, '')
                            .replace(/,\s*$/, '')
                        : '—'
                    return (
                      <tr
                        key={emp.id}
                        className="hover:bg-gray-50 transition-colors cursor-pointer opacity-70"
                        onClick={() => navigate(`/hr/employee/${emp.id}`)}
                      >
                        <td className="px-4 py-2">
                          <button className="text-green-700 hover:underline font-medium">
                            {emp.last_name}, {emp.first_name}
                          </button>
                        </td>
                        <td className="px-4 py-2 text-gray-600">{location}</td>
                        <td className="px-4 py-2 text-gray-600">{emp.cell_phone || '—'}</td>
                        <td className="px-4 py-2 text-gray-600">{emp.email || '—'}</td>
                        <td className="px-4 py-2 text-gray-600">{emp.job_title || '—'}</td>
                        <td className="px-4 py-2 text-gray-600">
                          {emp.start_date
                            ? new Date(emp.start_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: '2-digit',
                              })
                            : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : /* ── POSITIONS TAB ── */
        tab === 'positions' ? (
          <div className="max-w-4xl">
            {/* Position editor — modal overlay */}
            {editingPosition && (
              <div
                className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto"
                onClick={() => setEditingPosition(null)}
              >
                <div
                  className="bg-white border border-gray-200 rounded-xl p-5 my-8 shadow-2xl w-full max-w-2xl"
                  onClick={e => e.stopPropagation()}
                >
                <h3 className="font-semibold text-gray-900 mb-4">
                  {editingPosition === 'new' ? 'New Position' : `Edit: ${editingPosition.title}`}
                </h3>
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">
                      Position Title *
                    </label>
                    <input
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                      value={positionForm.title}
                      onChange={e => setPositionForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="e.g. Crew Leader, Sales Manager"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 resize-none"
                      value={positionForm.description}
                      onChange={e => setPositionForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Brief summary of this role…"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">
                      Valuable Final Product (VFP)
                    </label>
                    <textarea
                      rows={3}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 resize-none"
                      value={positionForm.vfp}
                      onChange={e => setPositionForm(f => ({ ...f, vfp: e.target.value }))}
                      placeholder="Describe the end result this position produces…"
                    />
                  </div>

                  {/* Position Write-Up / Hat */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">
                      Position Write-Up / Hat
                    </label>
                    {positionForm.write_up_url && !posWriteUpFile && (
                      <div className="flex items-center gap-2 mb-2">
                        <a
                          href={positionForm.write_up_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-green-700 underline truncate max-w-xs"
                        >
                          View current file
                        </a>
                        <button
                          onClick={() => setPositionForm(f => ({ ...f, write_up_url: '' }))}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={posWriteUpRef}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.txt"
                        onChange={e => setPosWriteUpFile(e.target.files?.[0] || null)}
                      />
                      <button
                        type="button"
                        onClick={() => posWriteUpRef.current?.click()}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50"
                      >
                        📎 {posWriteUpFile ? posWriteUpFile.name : 'Choose File'}
                      </button>
                      {posWriteUpFile && (
                        <button
                          onClick={() => setPosWriteUpFile(null)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      )}
                      <span className="text-xs text-gray-400">or paste URL:</span>
                      <input
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-green-500"
                        value={posWriteUpFile ? '' : positionForm.write_up_url}
                        onChange={e =>
                          setPositionForm(f => ({ ...f, write_up_url: e.target.value }))
                        }
                        placeholder="https://…"
                        disabled={!!posWriteUpFile}
                      />
                    </div>
                  </div>

                  {/* Required LMS Courses */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-2">
                      Required Training Courses{' '}
                      <span className="text-gray-400 font-normal">
                        ({selectedCourses.size} selected)
                      </span>
                    </label>
                    {courses.length === 0 ? (
                      <p className="text-sm text-gray-400 border border-gray-200 rounded-xl p-4">
                        No training courses found. Add courses in the Training module first.
                      </p>
                    ) : (
                      <div className="border border-gray-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                        <div className="divide-y divide-gray-100">
                          {courses.map(course => (
                            <label
                              key={course.id}
                              className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedCourses.has(course.id)}
                                onChange={() => toggleCourse(course.id)}
                                className="accent-green-700"
                              />
                              <div>
                                <p className="text-sm font-medium text-gray-900">{course.title}</p>
                                {course.category && (
                                  <p className="text-xs text-gray-400">{course.category}</p>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setEditingPosition(null)}
                    className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={savePosition}
                    disabled={positionSaving || !positionForm.title.trim()}
                    className="px-4 py-2 text-sm bg-green-700 text-white rounded-lg font-semibold hover:bg-green-800 disabled:opacity-50"
                  >
                    {positionSaving
                      ? 'Saving…'
                      : editingPosition === 'new'
                        ? 'Create Position'
                        : 'Save Changes'}
                  </button>
                </div>
                </div>
              </div>
            )}

            {/* Positions list */}
            {positions.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400">
                <p className="text-3xl mb-2">🏷️</p>
                <p className="font-medium">No positions yet</p>
                <p className="text-sm mt-1">
                  Create positions to define roles within your company.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {positions.map(pos => {
                  const reqCourseIds = [...(positionCourses[pos.id] || [])]
                  const reqCourses = courses.filter(c => reqCourseIds.includes(c.id))
                  const assignedCount = employees.filter(
                    e => e.status === 'active' && e.job_title === pos.title
                  ).length
                  return (
                    <div
                      key={pos.id}
                      className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <p className="font-semibold text-gray-900">{pos.title}</p>
                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                              {assignedCount} employee{assignedCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                          {pos.description && (
                            <p className="text-sm text-gray-600 mb-1 line-clamp-2">
                              {pos.description}
                            </p>
                          )}
                          {pos.vfp && (
                            <p className="text-xs text-gray-400">
                              <span className="font-medium text-gray-500">VFP:</span> {pos.vfp}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            {pos.write_up_url && (
                              <a
                                href={pos.write_up_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-green-700 underline flex items-center gap-1"
                              >
                                📄 Position Write-Up
                              </a>
                            )}
                            {reqCourses.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs text-gray-400">Required courses:</span>
                                {reqCourses.map(c => (
                                  <span
                                    key={c.id}
                                    className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium"
                                  >
                                    {c.title}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => openEditPosition(pos)}
                            className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => deletePosition(pos.id)}
                            className="px-3 py-1.5 text-xs font-medium border border-red-200 rounded-lg text-red-600 hover:bg-red-50"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : /* ── SETTINGS TAB ── */
        tab === 'settings' && isAdmin ? (
          <div className="-mx-6 -mt-3 flex flex-col">
            {/* Statistics-style white sub-tab bar */}
            <div className="flex border-b border-gray-200 bg-white px-6 flex-nowrap overflow-x-auto flex-shrink-0">
              {[{ key: 'employee-groups', label: '👥 Employee Groups' }].map(st => (
                <button
                  key={st.key}
                  onClick={() => setSettingsTab(st.key)}
                  className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                    settingsTab === st.key
                      ? 'border-green-700 text-green-800'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
            <div className="bg-gray-50 px-6 py-6 flex-1 overflow-y-auto">
              {/* ── Employee Groups ── */}
              {settingsTab === 'employee-groups' && (
                <div>
                  {/* Group editor */}
                  {editingGroup ? (
                    <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5 shadow-sm">
                      <h3 className="font-semibold text-gray-900 mb-4">
                        {editingGroup === 'new'
                          ? 'New Employee Group'
                          : `Edit: ${editingGroup.name}`}
                      </h3>
                      <div className="space-y-3 mb-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium text-gray-500 block mb-1">
                              Group Name *
                            </label>
                            <input
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                              value={groupForm.name}
                              onChange={e => setGroupForm(f => ({ ...f, name: e.target.value }))}
                              placeholder="e.g. Landscaping Crew A"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-500 block mb-1">
                              Color
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                className="w-10 h-9 border border-gray-200 rounded-lg cursor-pointer p-0.5"
                                value={groupForm.color}
                                onChange={e => setGroupForm(f => ({ ...f, color: e.target.value }))}
                              />
                              <span className="text-xs text-gray-400">{groupForm.color}</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 block mb-1">
                            Description
                          </label>
                          <input
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                            value={groupForm.description}
                            onChange={e =>
                              setGroupForm(f => ({ ...f, description: e.target.value }))
                            }
                            placeholder="Optional description"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 block mb-2">
                            Members{' '}
                            <span className="text-gray-400 font-normal">
                              ({selectedMembers.size} selected)
                            </span>
                          </label>
                          <div className="border border-gray-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                            {employees.filter(e => e.status === 'active').length === 0 ? (
                              <p className="text-sm text-gray-400 p-4">
                                No active employees found.
                              </p>
                            ) : (
                              <div className="divide-y divide-gray-100">
                                {employees
                                  .filter(e => e.status === 'active')
                                  .sort((a, b) =>
                                    `${a.last_name} ${a.first_name}`.localeCompare(
                                      `${b.last_name} ${b.first_name}`
                                    )
                                  )
                                  .map(emp => (
                                    <label
                                      key={emp.id}
                                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={selectedMembers.has(emp.id)}
                                        onChange={() => toggleMember(emp.id)}
                                        className="accent-green-700"
                                      />
                                      <div
                                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                        style={{ backgroundColor: groupForm.color }}
                                      >
                                        {emp.first_name?.[0]}
                                        {emp.last_name?.[0]}
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-gray-900">
                                          {emp.last_name}, {emp.first_name}
                                        </p>
                                        {emp.job_title && (
                                          <p className="text-xs text-gray-400">{emp.job_title}</p>
                                        )}
                                      </div>
                                    </label>
                                  ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setEditingGroup(null)}
                          className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={saveGroup}
                          disabled={groupSaving || !groupForm.name.trim()}
                          className="px-4 py-2 text-sm bg-green-700 text-white rounded-lg font-semibold hover:bg-green-800 disabled:opacity-50"
                        >
                          {groupSaving
                            ? 'Saving…'
                            : editingGroup === 'new'
                              ? 'Create Group'
                              : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-end mb-3">
                      <button
                        onClick={openNewGroup}
                        className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-800"
                      >
                        + New Group
                      </button>
                    </div>
                  )}

                  {/* Groups list */}
                  {groups.length === 0 && !editingGroup ? (
                    <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400">
                      <p className="text-3xl mb-2">👥</p>
                      <p className="font-medium">No employee groups yet</p>
                      <p className="text-sm mt-1">
                        Create a group to organize employees into crews or teams.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {groups.map(group => {
                        const members = [...(groupMembers[group.id] || [])]
                        const memberEmps = employees.filter(e => members.includes(e.id))
                        return (
                          <div
                            key={group.id}
                            className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-4 h-8 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: group.color }}
                                />
                                <div>
                                  <p className="font-semibold text-gray-900">{group.name}</p>
                                  {group.description && (
                                    <p className="text-xs text-gray-500 mt-0.5">
                                      {group.description}
                                    </p>
                                  )}
                                  <p className="text-xs text-gray-400 mt-1">
                                    {memberEmps.length} member{memberEmps.length !== 1 ? 's' : ''}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                <button
                                  onClick={() => openEditGroup(group)}
                                  className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  onClick={() => deleteGroup(group.id)}
                                  className="px-3 py-1.5 text-xs font-medium border border-red-200 rounded-lg text-red-600 hover:bg-red-50"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                            {memberEmps.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-1.5 pl-7">
                                {memberEmps
                                  .sort((a, b) =>
                                    `${a.last_name} ${a.first_name}`.localeCompare(
                                      `${b.last_name} ${b.first_name}`
                                    )
                                  )
                                  .map(emp => (
                                    <span
                                      key={emp.id}
                                      className="text-xs px-2.5 py-1 rounded-full font-medium text-white"
                                      style={{ backgroundColor: group.color }}
                                    >
                                      {emp.first_name} {emp.last_name}
                                    </span>
                                  ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* end bg-gray-50 */}
          </div>
        ) : /* ── REVIEW FORMS TAB ── */
        reviewForms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <p className="text-4xl mb-3">⭐</p>
            <p className="font-medium">No review forms yet</p>
            <button
              onClick={() => setShowBuilder(true)}
              className="mt-3 px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium"
            >
              Create First Form
            </button>
          </div>
        ) : (
          <div className="space-y-3 max-w-2xl">
            {reviewForms.map(form => (
              <div
                key={form.id}
                className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4"
              >
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{form.title}</p>
                  {form.description && (
                    <p className="text-sm text-gray-500 mt-0.5">{form.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">{(form.fields || []).length} fields</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditForm(form)
                      setShowBuilder(true)
                    }}
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
        )}
      </div>

      {/* Modals */}
      {showAddEmp && (
        <AddEmployeeModal
          onSave={() => {
            setShowAddEmp(false)
            refresh()
          }}
          onClose={() => setShowAddEmp(false)}
          positions={positions}
        />
      )}
      {showAddApp && (
        <AddApplicantModal
          onSave={() => {
            setShowAddApp(false)
            refresh()
          }}
          onClose={() => setShowAddApp(false)}
        />
      )}
      {showBuilder && (
        <ReviewBuilder
          form={editForm}
          onSave={() => {
            setShowBuilder(false)
            setEditForm(null)
            refresh()
          }}
          onClose={() => {
            setShowBuilder(false)
            setEditForm(null)
          }}
        />
      )}
    </div>
  )
}
