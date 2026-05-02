// ─────────────────────────────────────────────────────────────────────────────
// EmployeeDetail — full employee profile page
// Tabs: Profile | User | Permissions | Documents | Certifications | Training | Reviews | Testing
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import ReviewModal from '../components/hr/ReviewModal'
import { sendSMS } from '../lib/notify'

function generatePassword(len = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%'
  return Array.from(crypto.getRandomValues(new Uint8Array(len)))
    .map(b => chars[b % chars.length]).join('')
}

const DEPARTMENTS = ['Operations', 'Landscaping', 'Pool', 'Admin', 'Sales', 'Other']
const LANGUAGES   = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español (Spanish)' },
]

// Permission groups and defaults (copied from Admin.jsx)
const PERM_GROUPS = [
  {
    label: 'Statistics',
    icon:  '📈',
    perms: [
      { key: 'can_create_stats',      label: 'Create statistics' },
      { key: 'can_share_stats',       label: 'Share statistics with other users' },
      { key: 'can_make_stats_public', label: 'Mark statistics as public' },
    ],
  },
  {
    label: 'Financial',
    icon:  '💰',
    perms: [
      { key: 'can_view_financials', label: 'View collections & invoicing' },
      { key: 'can_view_reports',    label: 'View financial reports' },
    ],
  },
  {
    label: 'Jobs & Bids',
    icon:  '🔨',
    perms: [
      { key: 'can_create_jobs', label: 'Create new jobs' },
      { key: 'can_edit_jobs',   label: 'Edit existing jobs' },
      { key: 'can_delete_jobs', label: 'Delete jobs' },
      { key: 'can_create_bids', label: 'Create bids' },
      { key: 'can_edit_bids',   label: 'Edit bids' },
    ],
  },
  {
    label: 'Module Access',
    icon:  '🗂️',
    perms: [
      { key: 'access_tracker',      label: 'Tracker' },
      { key: 'access_collections',  label: 'Collections' },
      { key: 'access_statistics',   label: 'Statistics' },
      { key: 'access_master_rates', label: 'Master Rates' },
      { key: 'access_admin',        label: 'Admin panel' },
    ],
  },
]

const DEFAULT_PERMS = {
  can_create_stats: true,  can_share_stats: false, can_make_stats_public: false,
  can_view_financials: true, can_view_reports: false,
  can_create_jobs: true, can_edit_jobs: true, can_delete_jobs: false,
  can_create_bids: true, can_edit_bids: true,
  access_tracker: true, access_collections: true, access_statistics: true,
  access_master_rates: false, access_admin: false,
}
const DOC_CATEGORIES = [
  { key: 'records', label: 'Personnel Records', icon: '📁' },
  { key: 'id',      label: 'ID Documents',      icon: '🪪' },
  { key: 'other',   label: 'Other',             icon: '📎' },
]

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function isExpired(date) {
  if (!date) return false
  return new Date(date) < new Date()
}

function StarDisplay({ value }) {
  return (
    <span className="text-yellow-400">
      {'★'.repeat(Math.round(value || 0))}
      <span className="text-gray-200">{'★'.repeat(5 - Math.round(value || 0))}</span>
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function EmployeeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [employee,      setEmployee]      = useState(null)
  const [linkedProfile, setLinkedProfile] = useState(null)
  const [docs,          setDocs]          = useState([])
  const [certs,         setCerts]         = useState([])
  const [training,      setTraining]      = useState([])  // lms_assignments with steps
  const [reviews,       setReviews]       = useState([])
  const [reviewForms,   setReviewForms]   = useState([])
  const [loading,       setLoading]       = useState(true)
  const [tab,           setTab]           = useState('profile')

  // Profile edit state
  const [editing,   setEditing]   = useState(false)
  const [draft,     setDraft]     = useState({})
  const [saving,    setSaving]    = useState(false)

  // Doc state
  const [showDocAdd,   setShowDocAdd]   = useState(false)
  const [docCategory,  setDocCategory]  = useState('records')
  const [docName,      setDocName]      = useState('')
  const [docUrl,       setDocUrl]       = useState('')
  const [docFile,      setDocFile]      = useState(null)
  const [docSaving,    setDocSaving]    = useState(false)
  const docFileRef = useRef()

  // Cert state
  const [showCertAdd, setShowCertAdd]  = useState(false)
  const [certDraft,   setCertDraft]    = useState({ cert_name: '', cert_number: '', issued_date: '', expiry_date: '', file_url: '' })
  const [certSaving,  setCertSaving]   = useState(false)

  // Review state
  const [showReview,  setShowReview]   = useState(false)

  // User tab state
  const [userRole,         setUserRole]         = useState('user')
  const [savingRole,       setSavingRole]       = useState(false)
  const [roleMsg,          setRoleMsg]          = useState('')
  const [resetSending,     setResetSending]     = useState(false)
  const [resetMsg,         setResetMsg]         = useState('')
  const [smsSending,       setSmsSending]       = useState(false)
  const [resetTextSending, setResetTextSending] = useState(false)
  const [smsMsg,           setSmsMsg]           = useState('')

  // Create system account state (used when no linkedProfile)
  const [createEmail,    setCreateEmail]    = useState('')
  const [createPassword, setCreatePassword] = useState(() => generatePassword())
  const [createRole,     setCreateRole]     = useState('user')
  const [showCreatePw,   setShowCreatePw]   = useState(false)
  const [creating,       setCreating]       = useState(false)
  const [createError,    setCreateError]    = useState('')

  // Permissions tab state
  const [perms,         setPerms]         = useState(DEFAULT_PERMS)
  const [loadingPerms,  setLoadingPerms]  = useState(true)
  const [savingPerms,   setSavingPerms]   = useState(false)
  const [permsMsg,      setPermsMsg]      = useState('')

  // Avatar
  const avatarInputRef = useRef()

  // ── Password / SMS helpers (same as Admin UserEditModal) ──────────────────
  function formatPhone(raw) {
    const digits = (raw || '').replace(/\D/g, '')
    if (digits.length === 10) return '+1' + digits
    if (digits.length === 11 && digits.startsWith('1')) return '+' + digits
    return '+' + digits
  }

  function samMessage(firstName, email, password, isReset = false) {
    const greeting = firstName ? `Hi ${firstName}, ` : 'Hi there, '
    const action   = isReset ? 'your password has been reset' : 'here are your login credentials'
    return (
      `${greeting}this is Sam, the AI assistant from the Picture Build System — ${action}.\n\n` +
      `Email: ${email}\n` +
      `Password: ${password}\n\n` +
      `Log in at: ${window.location.origin}/login\n\n` +
      `For your security, please update your password after logging in.`
    )
  }

  // ── Create a new system account for an employee who doesn't have one ────────
  async function createSystemAccount() {
    const email = createEmail.trim().toLowerCase()
    if (!email) { setCreateError('Email is required.'); return }
    if (!createPassword) { setCreateError('Password is required.'); return }

    setCreating(true)
    setCreateError('')
    try {
      // Use a temp client so the current admin session is not replaced
      const tempClient = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { auth: { storageKey: 'admin-emp-create-tmp', persistSession: false } }
      )

      const { data, error: signUpErr } = await tempClient.auth.signUp({
        email,
        password: createPassword,
        options:  { data: { full_name: `${employee.first_name} ${employee.last_name}` }, emailRedirectTo: null },
      })

      if (signUpErr) {
        if (signUpErr.message?.includes('already registered') || signUpErr.message?.includes('already been registered')) {
          // Account exists — find and link the existing profile
          const { data: existingProf } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', email)
            .maybeSingle()
          if (existingProf) {
            await supabase.from('employees').update({ user_id: existingProf.id }).eq('id', employee.id)
            setLinkedProfile(existingProf)
            setUserRole(existingProf.role || 'user')
            setCreating(false)
            return
          }
          setCreateError('That email already has an account but no matching profile was found. Contact a super admin.')
        } else {
          setCreateError(signUpErr.message || 'Failed to create account.')
        }
        setCreating(false)
        return
      }
      if (!data?.user) { setCreateError('Account creation returned no data.'); setCreating(false); return }

      const newUserId = data.user.id

      // Wait for the DB trigger to create the profile row
      await new Promise(r => setTimeout(r, 1200))

      // Upsert profile with correct name/role and store temp password
      await supabase.from('profiles').upsert({
        id:            newUserId,
        email,
        full_name:     `${employee.first_name} ${employee.last_name}`,
        role:          createRole,
        temp_password: createPassword,
      }, { onConflict: 'id' })

      // Link employee row to the new auth user
      await supabase.from('employees').update({ user_id: newUserId }).eq('id', employee.id)

      // Reload the linked profile so the tab switches to the full account view
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', newUserId).single()
      if (prof) { setLinkedProfile(prof); setUserRole(prof.role || 'user') }
    } catch (e) {
      setCreateError(e.message || 'Unexpected error.')
    }
    setCreating(false)
  }

  // ── Link an existing system account to this employee by email ────────────────
  async function linkExistingAccount() {
    const email = createEmail.trim().toLowerCase()
    if (!email) { setCreateError('Enter the email address of the existing account.'); return }
    setCreating(true); setCreateError('')
    const { data: existingProf } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle()
    if (!existingProf) {
      setCreateError('No system account found with that email address.')
      setCreating(false)
      return
    }
    await supabase.from('employees').update({ user_id: existingProf.id }).eq('id', employee.id)
    setLinkedProfile(existingProf)
    setUserRole(existingProf.role || 'user')
    setCreating(false)
  }

  async function sendPasswordReset() {
    if (!linkedProfile) return
    setResetSending(true); setResetMsg('')
    const emailToReset = linkedProfile.email || employee?.email || ''
    const { error } = await supabase.auth.resetPasswordForEmail(emailToReset, {
      redirectTo: window.location.origin + '/reset-password',
    })
    setResetMsg(error ? 'error:' + error.message : 'ok:Reset email sent to ' + emailToReset)
    setResetSending(false)
  }

  function validateSmsPhone(phone) {
    const digits = phone.replace(/\D/g, '')
    if (digits.length === 10) return true
    if (digits.length === 11 && digits.startsWith('1')) return true
    return false
  }

  async function sendPasswordViaSMS() {
    if (!linkedProfile) return
    const phone = formatPhone(employee?.cell_phone || linkedProfile.phone_cell || '')
    if (!phone || phone === '+') { setSmsMsg('error:No cell phone number on file for this employee.'); return }
    if (!validateSmsPhone(phone)) { setSmsMsg('error:Phone number "' + (employee?.cell_phone || '') + '" is not a valid 10-digit US number. Please update the phone number in the Profile tab.'); return }
    if (!linkedProfile.temp_password) { setSmsMsg('error:No stored password found. Use "Reset & Text New Password" instead.'); return }
    setSmsSending(true); setSmsMsg('')
    const firstName = employee?.first_name || (linkedProfile.full_name || '').split(' ')[0]
    const { error } = await sendSMS({
      to:      phone,
      message: samMessage(firstName, linkedProfile.email, linkedProfile.temp_password),
    })
    setSmsMsg(error ? 'error:SMS failed — ' + error.message + ' (sent to ' + phone + ')' : 'ok:Password texted to ' + phone)
    setSmsSending(false)
  }

  async function resetAndTextPassword() {
    if (!linkedProfile) return
    const phone = formatPhone(employee?.cell_phone || linkedProfile.phone_cell || '')
    if (!phone || phone === '+') { setSmsMsg('error:No cell phone number on file for this employee.'); return }
    if (!validateSmsPhone(phone)) { setSmsMsg('error:Phone number "' + (employee?.cell_phone || '') + '" is not a valid 10-digit US number. Please update the phone number in the Profile tab.'); return }
    if (!confirm(`Generate a new password for ${employee?.first_name || linkedProfile.full_name} and text it to ${phone}?`)) return
    setResetTextSending(true); setSmsMsg('')
    const newPw = generatePassword()
    await supabase.from('profiles').update({ temp_password: newPw }).eq('id', linkedProfile.id)
    try {
      const { data: resetData, error: resetErr } = await supabase.functions.invoke('reset-user-password', {
        body: { userId: linkedProfile.id, newPassword: newPw },
      })
      if (resetErr || resetData?.error) console.warn('Edge Function unavailable:', resetData?.error || resetErr?.message)
    } catch (e) {
      console.warn('reset-user-password Edge Function not available:', e)
    }
    const firstName = employee?.first_name || (linkedProfile.full_name || '').split(' ')[0]
    const { error: smsErr } = await sendSMS({
      to:      phone,
      message: samMessage(firstName, linkedProfile.email, newPw, true),
    })
    setSmsMsg(smsErr
      ? 'error:SMS failed — ' + smsErr.message
      : 'ok:New password texted to ' + phone + '. If their login does not work, also send a password reset email.'
    )
    setResetTextSending(false)
  }

  useEffect(() => { fetchAll() }, [id])

  async function fetchAll() {
    setLoading(true)
    const [
      { data: emp },
      { data: docsData },
      { data: certsData },
      { data: trainingData },
      { data: reviewsData },
      { data: formsData },
    ] = await Promise.all([
      supabase.from('employees').select('*').eq('id', id).single(),
      supabase.from('employee_documents').select('*').eq('employee_id', id).order('created_at', { ascending: false }),
      supabase.from('employee_certifications').select('*').eq('employee_id', id).order('expiry_date'),
      supabase.from('lms_assignments').select('*, lms_courses(title, category), lms_step_completions(id)').eq('employee_id', id),
      supabase.from('hr_reviews').select('*, hr_review_forms(title)').eq('employee_id', id).order('review_date', { ascending: false }),
      supabase.from('hr_review_forms').select('*').order('title'),
    ])
    setEmployee(emp)
    setDraft(emp || {})
    if (emp?.email) setCreateEmail(emp.email)
    setDocs(docsData || [])
    setCerts(certsData || [])
    setTraining(trainingData || [])
    setReviews(reviewsData || [])
    setReviewForms(formsData || [])

    // Fetch linked profile by email
    if (emp?.email) {
      const { data: prof } = await supabase.from('profiles').select('*').eq('email', emp.email).single()
      if (prof) {
        setLinkedProfile(prof)
        setUserRole(prof.role || 'user')
        // Fetch permissions
        const { data: permsData } = await supabase
          .from('user_permissions')
          .select('*')
          .eq('user_id', prof.id)
          .single()
        if (permsData) setPerms(prev => ({ ...prev, ...permsData }))
      }
    }

    setLoadingPerms(false)
    setLoading(false)
  }

  // ── Avatar upload ─────────────────────────────────────────────────────────
  async function handleAvatarUpload(file) {
    if (!file) return
    const ext  = file.name.split('.').pop()
    const path = `avatars/${id}.${ext}`
    const { error: upErr } = await supabase.storage.from('employee-files').upload(path, file, { upsert: true })
    if (upErr) { alert('Upload failed: ' + upErr.message); return }
    const { data: { publicUrl } } = supabase.storage.from('employee-files').getPublicUrl(path)
    await supabase.from('employees').update({ avatar_url: publicUrl }).eq('id', id)
    fetchAll()
  }

  // ── Profile save ──────────────────────────────────────────────────────────
  async function handleProfileSave() {
    setSaving(true)
    const { error: err } = await supabase.from('employees').update({
      ...draft,
      pay_rate:   draft.pay_rate   ? parseFloat(draft.pay_rate)   : null,
      start_date: draft.start_date || null,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    if (err) { setSaving(false); alert(err.message); return }

    // Sync preferred_language to the linked auth profile so the UI updates
    if (linkedProfile?.id && draft.preferred_language) {
      await supabase.from('profiles')
        .update({ preferred_language: draft.preferred_language })
        .eq('id', linkedProfile.id)
    }

    setSaving(false)
    setEditing(false)
    fetchAll()
  }

  // ── Archive / delete ──────────────────────────────────────────────────────
  async function toggleArchive() {
    const newStatus = employee.status === 'active' ? 'archived' : 'active'
    if (!confirm(`${newStatus === 'archived' ? 'Archive' : 'Restore'} this employee?`)) return
    await supabase.from('employees').update({ status: newStatus }).eq('id', id)
    fetchAll()
  }

  async function handleDelete() {
    if (!confirm('Permanently delete this employee record? This cannot be undone.')) return
    await supabase.from('employees').delete().eq('id', id)
    navigate('/hr')
  }

  // ── Document add ──────────────────────────────────────────────────────────
  async function handleDocAdd() {
    if (!docName.trim()) return
    setDocSaving(true)
    let url = docUrl

    if (docFile) {
      const path = `docs/${id}/${Date.now()}_${docFile.name}`
      const { error: upErr } = await supabase.storage.from('employee-files').upload(path, docFile)
      if (!upErr) {
        const { data: { publicUrl } } = supabase.storage.from('employee-files').getPublicUrl(path)
        url = publicUrl
      }
    }

    if (!url) { alert('Provide a file or URL'); setDocSaving(false); return }

    await supabase.from('employee_documents').insert({
      employee_id: id, doc_name: docName.trim(), doc_url: url,
      category: docCategory, file_type: docFile?.type || 'link',
    })
    setDocSaving(false)
    setShowDocAdd(false)
    setDocName(''); setDocUrl(''); setDocFile(null)
    fetchAll()
  }

  // ── Cert add ──────────────────────────────────────────────────────────────
  async function handleCertAdd() {
    if (!certDraft.cert_name.trim()) return
    setCertSaving(true)
    await supabase.from('employee_certifications').insert({
      employee_id: id,
      ...certDraft,
      issued_date: certDraft.issued_date || null,
      expiry_date: certDraft.expiry_date || null,
    })
    setCertSaving(false)
    setShowCertAdd(false)
    setCertDraft({ cert_name: '', cert_number: '', issued_date: '', expiry_date: '', file_url: '' })
    fetchAll()
  }

  async function deleteCert(certId) {
    if (!confirm('Delete this certification?')) return
    await supabase.from('employee_certifications').delete().eq('id', certId)
    fetchAll()
  }

  async function deleteDoc(docId) {
    if (!confirm('Remove this document?')) return
    await supabase.from('employee_documents').delete().eq('id', docId)
    fetchAll()
  }

  const set = (k, v) => setDraft(prev => ({ ...prev, [k]: v }))

  if (loading) return (
    <div className="flex items-center justify-center h-full text-gray-400">Loading…</div>
  )
  if (!employee) return (
    <div className="flex items-center justify-center h-full text-gray-400">Employee not found</div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col">

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 flex-shrink-0">
        <button onClick={() => navigate('/hr')} className="text-sm text-gray-500 hover:text-gray-700">← HR</button>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-gray-800">{employee.first_name} {employee.last_name}</span>
      </div>

      {/* ── Hero section ── */}
      <div className="bg-white border-b border-gray-200 px-8 py-6 flex items-center gap-6 flex-shrink-0">
        {/* Large avatar */}
        <div className="relative flex-shrink-0">
          <div
            onClick={() => avatarInputRef.current?.click()}
            className="w-24 h-24 rounded-full overflow-hidden cursor-pointer group bg-green-100 flex items-center justify-center"
          >
            {employee.avatar_url ? (
              <img src={employee.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-green-700">
                {employee.first_name?.[0]}{employee.last_name?.[0]}
              </span>
            )}
            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <span className="text-white text-xs font-medium">📷 Change</span>
            </div>
          </div>
          <input ref={avatarInputRef} type="file" accept="image/*" className="sr-only"
            onChange={e => handleAvatarUpload(e.target.files?.[0])} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">{employee.first_name} {employee.last_name}</h1>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${employee.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {employee.status === 'active' ? 'Active' : 'Archived'}
            </span>
          </div>
          <p className="text-gray-600">{employee.job_title || '—'}</p>
          {employee.department && <p className="text-sm text-gray-400">{employee.department}</p>}
          {employee.start_date && <p className="text-sm text-gray-400 mt-1">📅 Since {formatDate(employee.start_date)}</p>}
        </div>

        {/* Archive + Delete buttons */}
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={toggleArchive}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            {employee.status === 'active' ? '📦 Archive' : '✅ Restore'}
          </button>
          <button onClick={handleDelete}
            className="px-4 py-2 border border-red-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
            🗑️ Delete
          </button>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="bg-white border-b border-gray-200 px-6 flex gap-0 flex-shrink-0 overflow-x-auto">
        {[
          { key: 'profile',      label: 'Profile',       icon: '👤' },
          { key: 'user',         label: 'Access and Roles', icon: '🔑' },
          { key: 'permissions',  label: 'Permissions',   icon: '🔑' },
          { key: 'docs',         label: `Documents (${docs.length})`,     icon: '📁' },
          { key: 'certs',        label: `Certifications (${certs.length})`, icon: '🏅' },
          { key: 'training',     label: `Training (${training.length})`,  icon: '🎓' },
          { key: 'reviews',      label: `Reviews (${reviews.length})`,   icon: '⭐' },
          { key: 'testing',      label: 'Testing',       icon: '🔬' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t.key ? 'border-green-700 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">

        {/* ── PROFILE ── */}
        {tab === 'profile' && (
          <div className="max-w-6xl space-y-5">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-gray-800">Employee Info</h3>
                {!editing ? (
                  <button onClick={() => setEditing(true)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50">
                    ✏️ Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => { setEditing(false); setDraft(employee) }} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50">
                      Cancel
                    </button>
                    <button onClick={handleProfileSave} disabled={saving} className="px-3 py-1.5 bg-green-700 text-white rounded-lg text-xs font-semibold hover:bg-green-800 disabled:opacity-50">
                      {saving ? 'Saving…' : '💾 Save'}
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-5">
                {/* Personal */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Personal</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['first_name', 'First Name'], ['last_name', 'Last Name'],
                      ['email', 'Email'], ['phone', 'Phone (Home/Work)'], ['cell_phone', 'Cell Phone'],
                    ].map(([key, label]) => (
                      <Field key={key} label={label} value={draft[key]} editing={editing} onChange={v => set(key, v)} />
                    ))}
                    <div className="col-span-2">
                      <Field label="Nickname (used on crew schedule labels)" value={draft.nickname} editing={editing} onChange={v => set('nickname', v)} />
                    </div>
                    <div className="col-span-2">
                      <Field label="Address" value={draft.address} editing={editing} onChange={v => set('address', v)} />
                    </div>
                    <Field label="City" value={draft.city} editing={editing} onChange={v => set('city', v)} />
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="State" value={draft.state} editing={editing} onChange={v => set('state', v)} />
                      <Field label="Zip" value={draft.zip} editing={editing} onChange={v => set('zip', v)} />
                    </div>
                  </div>
                </div>

                {/* Employment */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Employment</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Job Title" value={draft.job_title} editing={editing} onChange={v => set('job_title', v)} />
                    {editing ? (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
                        <select value={draft.department || ''} onChange={e => set('department', e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500">
                          <option value="">Select…</option>
                          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                    ) : (
                      <Field label="Department" value={draft.department} editing={false} onChange={() => {}} />
                    )}
                    {/* Preferred Language */}
                    {editing ? (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Preferred Language</label>
                        <select value={draft.preferred_language || 'en'} onChange={e => set('preferred_language', e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500">
                          {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                        </select>
                      </div>
                    ) : (
                      <Field
                        label="Preferred Language"
                        value={LANGUAGES.find(l => l.value === (draft.preferred_language || 'en'))?.label}
                        editing={false}
                        onChange={() => {}}
                      />
                    )}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                      {editing
                        ? <input type="date" value={draft.start_date || ''} onChange={e => set('start_date', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
                        : <p className="text-sm text-gray-800 py-2">{formatDate(draft.start_date)}</p>
                      }
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Pay Rate</label>
                      {editing ? (
                        <div className="flex gap-2">
                          <input type="number" value={draft.pay_rate || ''} onChange={e => set('pay_rate', e.target.value)} placeholder="0.00"
                            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
                          <select value={draft.pay_type || 'hourly'} onChange={e => set('pay_type', e.target.value)}
                            className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-green-500">
                            <option value="hourly">hr</option>
                            <option value="salary">yr</option>
                          </select>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-800 py-2">
                          {draft.pay_rate ? `$${Number(draft.pay_rate).toLocaleString()}/${draft.pay_type === 'salary' ? 'yr' : 'hr'}` : '—'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Emergency Contact</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Name" value={draft.emergency_contact_name} editing={editing} onChange={v => set('emergency_contact_name', v)} />
                    <Field label="Relationship" value={draft.emergency_contact_relation} editing={editing} onChange={v => set('emergency_contact_relation', v)} />
                    <div className="col-span-2">
                      <Field label="Phone" value={draft.emergency_contact_phone} editing={editing} onChange={v => set('emergency_contact_phone', v)} />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Notes</p>
                  {editing
                    ? <textarea value={draft.notes || ''} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Internal notes…"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 resize-none" />
                    : <p className="text-sm text-gray-600 whitespace-pre-wrap">{draft.notes || <span className="text-gray-400 italic">No notes</span>}</p>
                  }
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── USER ── */}
        {tab === 'user' && (
          <div className="max-w-2xl">
            {linkedProfile ? (
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
                <h3 className="font-semibold text-gray-800">System Account</h3>

                {/* Current role */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">Current Role</label>
                  <div className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold" style={{
                    backgroundColor: userRole === 'admin' ? '#dcfce7' : '#f3f4f6',
                    color: userRole === 'admin' ? '#166534' : '#374151',
                  }}>
                    {userRole === 'admin' ? '🛡️ Admin' : '👤 User'}
                  </div>
                </div>

                {/* Role change */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-3">Change Role</label>
                  <div className="flex gap-3">
                    {['user', 'admin'].map(r => (
                      <label key={r} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" name="user-role" checked={userRole === r}
                          onChange={() => setUserRole(r)}
                          className="accent-green-700" />
                        {r === 'admin' ? '🛡️ Admin' : '👤 User'}
                      </label>
                    ))}
                  </div>
                </div>

                {roleMsg && (
                  <div className={`text-sm px-3 py-2.5 rounded-lg border ${
                    roleMsg.startsWith('ok:')
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}>
                    {roleMsg.startsWith('ok:') ? '✅' : '⚠️'} {roleMsg.slice(3)}
                  </div>
                )}

                {userRole !== linkedProfile.role && (
                  <button onClick={async () => {
                    setSavingRole(true)
                    setRoleMsg('')
                    const { error } = await supabase.from('profiles').update({ role: userRole }).eq('id', linkedProfile.id)
                    if (error) {
                      setRoleMsg('error:' + error.message)
                    } else {
                      setRoleMsg('ok:Role updated.')
                      setLinkedProfile(p => ({ ...p, role: userRole }))
                    }
                    setSavingRole(false)
                  }} disabled={savingRole}
                    className="px-4 py-2.5 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-800 disabled:opacity-50">
                    {savingRole ? 'Saving…' : 'Save Role'}
                  </button>
                )}

                {/* ── Password Reset ── */}
                <div className="border-t border-gray-100 pt-5">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Password Reset</p>
                  <p className="text-xs text-gray-500 mb-3">
                    Send a password reset link to <strong>{linkedProfile.email}</strong>. The user clicks the link to set a new password.
                  </p>
                  {resetMsg && (
                    <div className={`text-sm px-3 py-2 rounded-lg border mb-2 ${resetMsg.startsWith('ok:') ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
                      {resetMsg.startsWith('ok:') ? '✅' : '⚠️'} {resetMsg.slice(3)}
                    </div>
                  )}
                  <button onClick={sendPasswordReset} disabled={resetSending}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                    {resetSending ? 'Sending…' : '📧 Send Password Reset Email'}
                  </button>
                </div>

                {/* ── Text Password via Sam ── */}
                <div className="border-t border-gray-100 pt-5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-base">🤖</span>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Text Password via Sam</p>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    Sam, the AI assistant, will text the employee their credentials via SMS.
                    {!employee?.cell_phone && (
                      <span className="text-amber-600 font-medium"> No cell phone on file — add one in the Profile tab.</span>
                    )}
                  </p>
                  {smsMsg && (
                    <div className={`text-sm px-3 py-2 rounded-lg border mb-3 ${smsMsg.startsWith('ok:') ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
                      {smsMsg.startsWith('ok:') ? '✅' : '⚠️'} {smsMsg.slice(3)}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button onClick={sendPasswordViaSMS}
                      disabled={smsSending || !employee?.cell_phone}
                      className="px-4 py-2 rounded-lg border border-blue-200 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-40">
                      {smsSending ? 'Sending…' : '📱 Text Current Password'}
                    </button>
                    <button onClick={resetAndTextPassword}
                      disabled={resetTextSending || !employee?.cell_phone}
                      className="px-4 py-2 rounded-lg border border-green-200 text-sm font-medium text-green-700 hover:bg-green-50 disabled:opacity-40">
                      {resetTextSending ? 'Resetting…' : '🔄 Reset & Text New Password'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    "Text Current Password" sends the last admin-set password. "Reset &amp; Text" generates a new password and texts it.
                  </p>
                </div>

              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
                <div>
                  <h3 className="font-semibold text-gray-800">Create System Account</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    This employee doesn't have a login yet. Fill in the details below to create one.
                  </p>
                </div>

                {createError && (
                  <div className="text-sm px-3 py-2.5 rounded-lg border bg-red-50 border-red-200 text-red-700">
                    ⚠️ {createError}
                  </div>
                )}

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={createEmail}
                    onChange={e => setCreateEmail(e.target.value)}
                    placeholder={employee?.email || 'employee@example.com'}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                  {employee?.email && createEmail === '' && (
                    <button
                      onClick={() => setCreateEmail(employee.email)}
                      className="mt-1 text-xs text-blue-600 hover:underline"
                    >
                      Use {employee.email}
                    </button>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">Initial Password</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showCreatePw ? 'text' : 'password'}
                        value={createPassword}
                        onChange={e => setCreatePassword(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-600 pr-10"
                      />
                      <button
                        onClick={() => setShowCreatePw(v => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-xs"
                      >
                        {showCreatePw ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    <button
                      onClick={() => setCreatePassword(generatePassword())}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50"
                      title="Generate new password"
                    >
                      🔄
                    </button>
                    <button
                      onClick={() => navigator.clipboard.writeText(createPassword)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50"
                      title="Copy to clipboard"
                    >
                      📋
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    This password will be stored so you can text it to the employee later.
                  </p>
                </div>

                {/* Role */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">Role</label>
                  <div className="flex gap-4">
                    {['user', 'admin'].map(r => (
                      <label key={r} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="radio"
                          name="create-role"
                          checked={createRole === r}
                          onChange={() => setCreateRole(r)}
                          className="accent-green-700"
                        />
                        {r === 'admin' ? '🛡️ Admin' : '👤 User'}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={createSystemAccount}
                    disabled={creating}
                    className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#3A5038' }}
                  >
                    {creating ? '⏳ Creating account…' : '✅ Create System Account'}
                  </button>
                  <button
                    onClick={linkExistingAccount}
                    disabled={creating || !createEmail.trim()}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold border border-blue-300 text-blue-700 hover:bg-blue-50 disabled:opacity-40"
                  >
                    🔗 Link Existing Account by Email
                  </button>
                  <p className="text-xs text-gray-400 text-center">
                    Use "Link" if this employee already has a login — it connects their existing account without creating a new one.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PERMISSIONS ── */}
        {tab === 'permissions' && (
          <div className="max-w-2xl">
            {linkedProfile ? (
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
                {linkedProfile.role === 'admin' && (
                  <div className="bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 rounded-xl">
                    🛡️ This user is an <strong>Admin</strong> — they have full access to everything regardless of these settings.
                  </div>
                )}

                {loadingPerms ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-700"></div>
                  </div>
                ) : (
                  <>
                    {PERM_GROUPS.map(group => (
                      <div key={group.label}>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          {group.icon} {group.label}
                        </h3>
                        <div className="space-y-2 pl-1">
                          {group.perms.map(p => (
                            <label key={p.key} className="flex items-center gap-3 cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={!!perms[p.key]}
                                onChange={e => setPerms(prev => ({ ...prev, [p.key]: e.target.checked }))}
                                className="w-4 h-4 rounded accent-green-700"
                              />
                              <span className="text-sm text-gray-700 group-hover:text-gray-900">{p.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}

                    {permsMsg && (
                      <div className={`text-sm px-3 py-2.5 rounded-lg border ${
                        permsMsg.startsWith('ok:')
                          ? 'bg-green-50 border-green-200 text-green-800'
                          : 'bg-red-50 border-red-200 text-red-700'
                      }`}>
                        {permsMsg.startsWith('ok:') ? '✅' : '⚠️'} {permsMsg.slice(3)}
                      </div>
                    )}

                    <button onClick={async () => {
                      setSavingPerms(true)
                      setPermsMsg('')
                      const { error } = await supabase
                        .from('user_permissions')
                        .upsert({ ...perms, user_id: linkedProfile.id },
                                 { onConflict: 'user_id' })
                      setPermsMsg(error ? 'error:' + error.message : 'ok:Permissions saved.')
                      setSavingPerms(false)
                    }} disabled={savingPerms}
                      className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-green-700 hover:bg-green-800 disabled:opacity-50">
                      {savingPerms ? 'Saving…' : 'Save Permissions'}
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <p className="text-gray-600 mb-3">This employee does not have a system account</p>
                <p className="text-sm text-gray-500">Add one from the Admin panel to manage permissions.</p>
              </div>
            )}
          </div>
        )}

        {/* ── DOCUMENTS ── */}
        {tab === 'docs' && (
          <div className="max-w-3xl space-y-5">
            {DOC_CATEGORIES.map(cat => {
              const catDocs = docs.filter(d => d.category === cat.key)
              return (
                <div key={cat.key} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                      {cat.icon} {cat.label}
                      <span className="text-xs text-gray-400 font-normal">({catDocs.length})</span>
                    </h3>
                    <button
                      onClick={() => { setDocCategory(cat.key); setShowDocAdd(true) }}
                      className="text-xs font-medium text-green-700 hover:underline"
                    >
                      + Add
                    </button>
                  </div>
                  {catDocs.length === 0 ? (
                    <div className="px-5 py-6 text-center text-sm text-gray-400">No documents in this folder</div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {catDocs.map(doc => (
                        <div key={doc.id} className="flex items-center gap-3 px-5 py-3">
                          <span className="text-lg">📄</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{doc.doc_name}</p>
                            <p className="text-xs text-gray-400">{formatDate(doc.created_at)}</p>
                          </div>
                          <a href={doc.doc_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs font-medium text-blue-600 hover:underline flex-shrink-0">
                            Open ↗
                          </a>
                          <button onClick={() => deleteDoc(doc.id)} className="text-xs text-red-400 hover:text-red-600 flex-shrink-0">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Add document modal */}
            {showDocAdd && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Add Document</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Document Name *</label>
                      <input value={docName} onChange={e => setDocName(e.target.value)} placeholder="e.g. W-4 Form 2024"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                      <select value={docCategory} onChange={e => setDocCategory(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500">
                        {DOC_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Upload File</label>
                      <div onClick={() => docFileRef.current?.click()}
                        className="flex items-center gap-2 h-12 border-2 border-dashed border-gray-300 rounded-lg px-3 cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors">
                        <span className="text-gray-400 text-sm">{docFile ? `📎 ${docFile.name}` : '📁 Click to upload'}</span>
                      </div>
                      <input ref={docFileRef} type="file" className="sr-only" onChange={e => { setDocFile(e.target.files?.[0] || null); setDocUrl('') }} />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 border-t border-gray-200" />
                      <span className="text-xs text-gray-400">or paste a link</span>
                      <div className="flex-1 border-t border-gray-200" />
                    </div>
                    <div>
                      <input value={docUrl} onChange={e => { setDocUrl(e.target.value); setDocFile(null) }}
                        placeholder="https://drive.google.com/…"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-5">
                    <button onClick={() => { setShowDocAdd(false); setDocName(''); setDocUrl(''); setDocFile(null) }}
                      className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
                    <button onClick={handleDocAdd} disabled={docSaving} className="flex-1 py-2 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-800 disabled:opacity-50">
                      {docSaving ? 'Saving…' : 'Add Document'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CERTIFICATIONS ── */}
        {tab === 'certs' && (
          <div className="max-w-2xl">
            <div className="flex justify-end mb-4">
              <button onClick={() => setShowCertAdd(true)} className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-800">
                + Add Certification
              </button>
            </div>

            {certs.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
                <p className="text-3xl mb-2">🏅</p>
                <p>No certifications on file</p>
              </div>
            ) : (
              <div className="space-y-3">
                {certs.map(cert => {
                  const expired = isExpired(cert.expiry_date)
                  const expiringSoon = !expired && cert.expiry_date &&
                    new Date(cert.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                  return (
                    <div key={cert.id} className={`bg-white rounded-xl border p-5 ${expired ? 'border-red-300 bg-red-50' : expiringSoon ? 'border-orange-300 bg-orange-50' : 'border-gray-200'}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900">{cert.cert_name}</p>
                            {expired && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Expired</span>}
                            {expiringSoon && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">Expiring Soon</span>}
                          </div>
                          {cert.cert_number && <p className="text-sm text-gray-500 mt-0.5">#{cert.cert_number}</p>}
                          <div className="flex gap-4 mt-2 text-xs text-gray-500">
                            {cert.issued_date && <span>Issued: {formatDate(cert.issued_date)}</span>}
                            {cert.expiry_date && <span className={expired ? 'text-red-600 font-medium' : ''}>Expires: {formatDate(cert.expiry_date)}</span>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {cert.file_url && (
                            <a href={cert.file_url} target="_blank" rel="noopener noreferrer"
                              className="text-xs font-medium text-blue-600 hover:underline">View ↗</a>
                          )}
                          <button onClick={() => deleteCert(cert.id)} className="text-xs text-red-400 hover:text-red-600">✕</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {showCertAdd && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Add Certification</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Certification Name *</label>
                      <input value={certDraft.cert_name} onChange={e => setCertDraft(p => ({...p, cert_name: e.target.value}))}
                        placeholder="e.g. OSHA 10 Card"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Cert Number / ID</label>
                      <input value={certDraft.cert_number} onChange={e => setCertDraft(p => ({...p, cert_number: e.target.value}))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Issued Date</label>
                        <input type="date" value={certDraft.issued_date} onChange={e => setCertDraft(p => ({...p, issued_date: e.target.value}))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Expiry Date</label>
                        <input type="date" value={certDraft.expiry_date} onChange={e => setCertDraft(p => ({...p, expiry_date: e.target.value}))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">File URL (optional)</label>
                      <input value={certDraft.file_url} onChange={e => setCertDraft(p => ({...p, file_url: e.target.value}))}
                        placeholder="Link to certificate document"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-5">
                    <button onClick={() => setShowCertAdd(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
                    <button onClick={handleCertAdd} disabled={certSaving} className="flex-1 py-2 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-800 disabled:opacity-50">
                      {certSaving ? 'Saving…' : 'Add Certification'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TRAINING ── */}
        {tab === 'training' && (
          <div className="max-w-2xl">
            {training.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
                <p className="text-3xl mb-2">🎓</p>
                <p>No training courses assigned</p>
                <p className="text-sm mt-1">Assign courses in the <a href="/training" className="text-green-700 underline">Training module</a></p>
              </div>
            ) : (
              <div className="space-y-3">
                {training.map(a => {
                  const stepsDone  = (a.lms_step_completions || []).length
                  const course     = a.lms_courses
                  const isDone     = false // Would need total steps count — simplified here
                  return (
                    <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{course?.title || 'Unknown Course'}</p>
                        <p className="text-xs text-gray-400">{course?.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-700">{stepsDone} steps done</p>
                        <p className="text-xs text-gray-400">Assigned {formatDate(a.assigned_at)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── REVIEWS ── */}
        {tab === 'reviews' && (
          <div className="max-w-2xl">
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowReview(true)}
                disabled={reviewForms.length === 0}
                className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-800 disabled:opacity-50"
                title={reviewForms.length === 0 ? 'Create a review form first in HR → Review Forms' : ''}
              >
                + New Review
              </button>
            </div>
            {reviewForms.length === 0 && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                No review forms yet. <a href="/hr" className="underline font-medium">Create one in HR → Review Forms tab</a>
              </div>
            )}
            {reviews.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
                <p className="text-3xl mb-2">⭐</p>
                <p>No reviews on file</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map(r => (
                  <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">{r.hr_review_forms?.title || 'Review'}</p>
                        <p className="text-xs text-gray-500">By {r.reviewer_name} · {formatDate(r.review_date)}</p>
                      </div>
                      {r.overall_rating && <StarDisplay value={r.overall_rating} />}
                    </div>
                    {r.notes && <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{r.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TESTING ── */}
        {tab === 'testing' && (
          <div className="max-w-2xl">
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
              <p className="text-5xl mb-4">🔬</p>
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Testing — Coming Soon</h3>
              <p className="text-sm">Testing links and assessments will be added here in a future update.</p>
            </div>
          </div>
        )}

      </div>

      {/* Review modal */}
      {showReview && (
        <ReviewModal
          employee={employee}
          reviewForms={reviewForms}
          onSave={() => { setShowReview(false); fetchAll() }}
          onClose={() => setShowReview(false)}
        />
      )}

    </div>
  )
}

// ── Field helper ──────────────────────────────────────────────────────────────
function Field({ label, value, editing, onChange }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {editing
        ? <input value={value || ''} onChange={e => onChange(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
        : <p className="text-sm text-gray-800 py-2">{value || <span className="text-gray-400 italic">—</span>}</p>
      }
    </div>
  )
}
