import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { sendWelcomeEmail } from '../lib/notify'

const FG = '#3A5038'

// ── Password generator ────────────────────────────────────────────────────────
function generatePassword(len = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%'
  return Array.from(crypto.getRandomValues(new Uint8Array(len)))
    .map(b => chars[b % chars.length]).join('')
}

// ── UserEditModal ─────────────────────────────────────────────────────────────
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

function UserEditModal({ profile, currentUserId, onClose, onSaved }) {
  const [tab, setTab] = useState('profile')

  // ── Profile state ──────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    full_name:     profile.full_name     || '',
    username:      profile.username      || '',
    email:         profile.email         || '',
    role:          profile.role          || 'user',
    phone_cell:    profile.phone_cell    || '',
    address_line1: profile.address_line1 || '',
    address_line2: profile.address_line2 || '',
    city:          profile.city          || '',
    state:         profile.state         || '',
    zip_code:      profile.zip_code      || '',
  })
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg,    setProfileMsg]    = useState('')

  // ── Password reset ─────────────────────────────────────────────────────────
  const [resetSending, setResetSending] = useState(false)
  const [resetMsg,     setResetMsg]     = useState('')

  // ── Permissions state ──────────────────────────────────────────────────────
  const [perms,        setPerms]        = useState(DEFAULT_PERMS)
  const [loadingPerms, setLoadingPerms] = useState(true)
  const [savingPerms,  setSavingPerms]  = useState(false)
  const [permsMsg,     setPermsMsg]     = useState('')

  const isMe = profile.id === currentUserId
  const set  = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => { loadPerms() }, [profile.id])

  async function loadPerms() {
    setLoadingPerms(true)
    const { data } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', profile.id)
      .single()
    if (data) setPerms(prev => ({ ...prev, ...data }))
    setLoadingPerms(false)
  }

  async function saveProfile() {
    setSavingProfile(true); setProfileMsg('')
    const username = form.username.trim().toLowerCase().replace(/\s+/g, '.') || null

    // Check username uniqueness if changed
    if (username && username !== (profile.username || '')) {
      const { data: taken } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .neq('id', profile.id)
        .maybeSingle()
      if (taken) {
        setProfileMsg('error:That username is already taken.')
        setSavingProfile(false); return
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name:     form.full_name.trim(),
        username,
        email:         form.email.trim().toLowerCase(),
        role:          form.role,
        phone_cell:    form.phone_cell.trim()    || null,
        address_line1: form.address_line1.trim() || null,
        address_line2: form.address_line2.trim() || null,
        city:          form.city.trim()          || null,
        state:         form.state                || null,
        zip_code:      form.zip_code.trim()      || null,
      })
      .eq('id', profile.id)

    setProfileMsg(error ? 'error:' + error.message : 'ok:Profile saved.')
    setSavingProfile(false)
    if (!error) onSaved()
  }

  async function sendPasswordReset() {
    setResetSending(true); setResetMsg('')
    const emailToReset = form.email.trim() || profile.email
    const { error } = await supabase.auth.resetPasswordForEmail(emailToReset, {
      redirectTo: window.location.origin + '/reset-password',
    })
    setResetMsg(error ? 'error:' + error.message : 'ok:Reset email sent to ' + emailToReset)
    setResetSending(false)
  }

  async function savePerms() {
    setSavingPerms(true); setPermsMsg('')
    const { error } = await supabase
      .from('user_permissions')
      .upsert({ ...perms, user_id: profile.id, updated_by: currentUserId },
               { onConflict: 'user_id' })
    setPermsMsg(error ? 'error:' + error.message : 'ok:Permissions saved.')
    setSavingPerms(false)
  }

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600'
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1'

  const Msg = ({ msg }) => msg ? (
    <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border ${
      msg.startsWith('ok:')
        ? 'bg-green-50 border-green-200 text-green-800'
        : 'bg-red-50 border-red-200 text-red-700'
    }`}>
      {msg.startsWith('ok:') ? '✅' : '⚠️'} {msg.slice(3)}
    </div>
  ) : null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                 style={{ backgroundColor: FG }}>
              {(profile.full_name || profile.email || '?')[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 leading-tight">
                {profile.full_name || profile.email}
              </h2>
              <p className="text-xs text-gray-400">{profile.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none ml-4">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6 flex-shrink-0">
          {['profile', 'permissions', 'danger'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t && t !== 'danger'
                  ? 'border-green-700 text-green-800'
                  : tab === t && t === 'danger'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'profile' ? '👤 Profile' : t === 'permissions' ? '🔐 Permissions' : '⚠️ Danger'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── PROFILE TAB ─────────────────────────────────────────────── */}
          {tab === 'profile' && (
            <div className="p-6 space-y-4">

              {/* Full name */}
              <div>
                <label className={labelCls}>Full Name</label>
                <input className={inputCls} value={form.full_name}
                  onChange={e => set('full_name', e.target.value)} placeholder="Full name" />
              </div>

              {/* Username */}
              <div>
                <label className={labelCls}>Username</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
                  <input className={inputCls + ' pl-7'} value={form.username}
                    onChange={e => set('username', e.target.value.toLowerCase().replace(/\s+/g, '.'))}
                    placeholder="username" />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className={labelCls}>Email Address</label>
                <input type="email" className={inputCls} value={form.email}
                  onChange={e => set('email', e.target.value)} placeholder="user@company.com" />
                <p className="text-xs text-gray-400 mt-1">
                  Updates the login lookup email. Auth email changes require the Supabase dashboard.
                </p>
              </div>

              {/* Role */}
              <div>
                <label className={labelCls}>Role</label>
                <div className="flex gap-4">
                  {['user', 'admin'].map(r => (
                    <label key={r} className={`flex items-center gap-2 text-sm cursor-pointer ${isMe && r !== form.role ? 'opacity-50' : ''}`}>
                      <input type="radio" name="edit-role" checked={form.role === r}
                        onChange={() => !isMe && set('role', r)}
                        disabled={isMe}
                        className="accent-green-700" />
                      {r === 'admin' ? '🛡️ Admin' : '👤 User'}
                    </label>
                  ))}
                </div>
                {isMe && <p className="text-xs text-gray-400 mt-1">You cannot change your own role.</p>}
              </div>

              {/* Phone */}
              <div>
                <label className={labelCls}>Cell Phone <span className="text-gray-400 font-normal">(for texting)</span></label>
                <input type="tel" className={inputCls} value={form.phone_cell}
                  onChange={e => set('phone_cell', e.target.value)} placeholder="(555) 867-5309" />
              </div>

              {/* Address */}
              <div className="border-t border-gray-100 pt-4">
                <p className={labelCls + ' mb-3'}>Address</p>
                <div className="space-y-3">
                  <input className={inputCls} value={form.address_line1}
                    onChange={e => set('address_line1', e.target.value)} placeholder="Address Line 1" />
                  <input className={inputCls} value={form.address_line2}
                    onChange={e => set('address_line2', e.target.value)} placeholder="Address Line 2 (apt, suite…)" />
                  <div className="grid grid-cols-3 gap-2">
                    <input className={inputCls + ' col-span-1'} value={form.city}
                      onChange={e => set('city', e.target.value)} placeholder="City" />
                    <select className={inputCls} value={form.state} onChange={e => set('state', e.target.value)}>
                      <option value="">State</option>
                      {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <input className={inputCls} value={form.zip_code}
                      onChange={e => set('zip_code', e.target.value)} placeholder="Zip" maxLength={10} />
                  </div>
                </div>
              </div>

              {profileMsg && <Msg msg={profileMsg} />}

              <button onClick={saveProfile} disabled={savingProfile}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60"
                style={{ backgroundColor: FG }}>
                {savingProfile ? 'Saving…' : 'Save Profile'}
              </button>

              {/* Password Reset */}
              <div className="border-t border-gray-100 pt-4">
                <label className={labelCls}>Password Reset</label>
                <p className="text-xs text-gray-500 mb-3">
                  Send a password reset link to <strong>{form.email || profile.email}</strong>.
                  The user clicks the link to set a new password.
                </p>
                {resetMsg && <div className="mb-2"><Msg msg={resetMsg} /></div>}
                <button onClick={sendPasswordReset} disabled={resetSending}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                  {resetSending ? 'Sending…' : '📧 Send Password Reset Email'}
                </button>
              </div>
            </div>
          )}

          {/* ── PERMISSIONS TAB ─────────────────────────────────────────── */}
          {tab === 'permissions' && (
            <div className="p-6 space-y-5">
              {profile.role === 'admin' && (
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

                  {permsMsg && <Msg msg={permsMsg} />}

                  <button onClick={savePerms} disabled={savingPerms}
                    className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60"
                    style={{ backgroundColor: FG }}>
                    {savingPerms ? 'Saving…' : 'Save Permissions'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── DANGER ZONE TAB ─────────────────────────────────────────── */}
          {tab === 'danger' && (
            <DangerZone
              profile={profile}
              currentUserId={currentUserId}
              onClose={onClose}
              onSaved={onSaved}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ── DangerZone (used inside UserEditModal) ────────────────────────────────────
function DangerZone({ profile, currentUserId, onClose, onSaved }) {
  const isMe        = profile.id === currentUserId
  const isArchived  = !!profile.archived_at

  const [archiving, setArchiving] = useState(false)
  const [deleting,  setDeleting]  = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [msg, setMsg] = useState('')

  async function toggleArchive() {
    setArchiving(true); setMsg('')
    const { error } = await supabase
      .from('profiles')
      .update({ archived_at: isArchived ? null : new Date().toISOString() })
      .eq('id', profile.id)
    if (error) setMsg('error:' + error.message)
    else { setMsg(isArchived ? 'ok:User restored.' : 'ok:User archived.'); onSaved() }
    setArchiving(false)
  }

  async function deleteUser() {
    setDeleting(true); setMsg('')
    const { data, error } = await supabase.functions.invoke('delete-user', {
      body: { userId: profile.id },
    })
    if (error) {
      setMsg('error:' + (error.message || 'Delete failed.'))
      setDeleting(false)
      return
    }
    if (!data?.success) {
      setMsg('error:' + (data?.error || 'Delete failed.'))
      setDeleting(false)
      return
    }
    onSaved()
    onClose()
  }

  const Msg = ({ msg }) => msg ? (
    <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border ${
      msg.startsWith('ok:')
        ? 'bg-green-50 border-green-200 text-green-800'
        : 'bg-red-50 border-red-200 text-red-700'
    }`}>
      {msg.startsWith('ok:') ? '✅' : '⚠️'} {msg.slice(3)}
    </div>
  ) : null

  return (
    <div className="p-6 space-y-5">
      {isMe && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl">
          ⚠️ You cannot archive or delete your own account.
        </div>
      )}

      {msg && <Msg msg={msg} />}

      {/* Archive / Restore */}
      <div className="border border-gray-200 rounded-xl p-4">
        <h3 className="font-semibold text-gray-800 mb-1">
          {isArchived ? '📦 Restore User' : '📦 Archive User'}
        </h3>
        <p className="text-sm text-gray-500 mb-3">
          {isArchived
            ? 'Restoring this user will make them active again. They will be able to log in.'
            : 'Archiving hides this user from the active list. They will still exist in the database but cannot be assigned to new work.'}
        </p>
        <button
          onClick={toggleArchive}
          disabled={archiving || isMe}
          className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
        >
          {archiving ? 'Saving…' : isArchived ? 'Restore User' : 'Archive User'}
        </button>
      </div>

      {/* Delete */}
      <div className="border border-red-200 rounded-xl p-4 bg-red-50/50">
        <h3 className="font-semibold text-red-700 mb-1">🗑️ Delete User</h3>
        <p className="text-sm text-red-600/80 mb-3">
          Permanently deletes this user from Supabase Auth and all associated data.
          <strong> This cannot be undone.</strong>
        </p>

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={isMe}
            className="px-4 py-2 rounded-lg border border-red-300 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-40"
          >
            Delete User…
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-red-700">
              Are you sure? This will permanently delete <strong>{profile.full_name || profile.email}</strong>.
            </p>
            <div className="flex gap-2">
              <button
                onClick={deleteUser}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Yes, Delete Permanently'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── AddUserModal ──────────────────────────────────────────────────────────────
const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
]

function AddUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    full_name:     '',
    username:      '',
    email:         '',
    password:      generatePassword(),
    role:          'user',
    phone_cell:    '',
    address_line1: '',
    address_line2: '',
    city:          '',
    state:         '',
    zip_code:      '',
  })
  const [showPw,   setShowPw]   = useState(false)
  const [copied,   setCopied]   = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [err,      setErr]      = useState('')
  const [success,  setSuccess]  = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Auto-suggest username from full name
  const handleNameBlur = () => {
    if (!form.username && form.full_name.trim()) {
      const suggested = form.full_name.trim().toLowerCase()
        .replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '')
      set('username', suggested)
    }
  }

  const copyPassword = () => {
    navigator.clipboard.writeText(form.password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCreate = async () => {
    setErr('')
    if (!form.email.trim())    { setErr('Email is required.');    return }
    if (!form.password.trim()) { setErr('Password is required.'); return }
    if (!form.full_name.trim()){ setErr('Full name is required.'); return }
    setSaving(true)

    try {
      // Use a temporary isolated Supabase client so the admin's session
      // is never replaced by the newly created user's session.
      const tempClient = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { auth: { storageKey: 'admin-user-create-tmp', persistSession: false } }
      )

      const { data, error: signUpErr } = await tempClient.auth.signUp({
        email:    form.email.trim().toLowerCase(),
        password: form.password,
        options:  {
          data:          { full_name: form.full_name.trim() },
          emailRedirectTo: null,   // Don't send a confirmation email
        },
      })

      if (signUpErr) {
        if (signUpErr.message?.includes('already registered') || signUpErr.message?.includes('already been registered')) {
          throw new Error('That email address is already registered.')
        }
        if (signUpErr.message?.includes('rate limit') || signUpErr.message?.includes('email rate')) {
          throw new Error('Email rate limit reached. Go to Supabase Dashboard → Authentication → Providers → Email → turn off "Confirm email", then try again.')
        }
        throw new Error(signUpErr.message || 'Failed to create user in auth system.')
      }
      if (!data?.user) throw new Error('User creation returned no data — the email may already be registered.')

      const newUserId = data.user.id

      // Give the DB trigger time to create the profile row, then upsert
      // to guarantee the profile exists even if the trigger failed.
      await new Promise(r => setTimeout(r, 1200))

      const { error: profileErr } = await supabase
        .from('profiles')
        .upsert({
          id:            newUserId,
          email:         form.email.trim().toLowerCase(),
          full_name:     form.full_name.trim(),
          username:      form.username.trim().toLowerCase() || null,
          role:          form.role,
          phone_cell:    form.phone_cell.trim()    || null,
          address_line1: form.address_line1.trim() || null,
          address_line2: form.address_line2.trim() || null,
          city:          form.city.trim()          || null,
          state:         form.state                || null,
          zip_code:      form.zip_code.trim()      || null,
        }, { onConflict: 'id' })

      if (profileErr) {
        // Surface the real error so we can diagnose it
        throw new Error(`User created but profile setup failed: ${profileErr.message}`)
      }

      // Send welcome email (non-blocking — don't fail if email fails)
      sendWelcomeEmail({
        to:       form.email.trim().toLowerCase(),
        fullName: form.full_name.trim(),
        username: form.username.trim().toLowerCase(),
        password: form.password,
        loginUrl: window.location.origin + '/login',
      }).catch(e => console.warn('[notify] Welcome email failed:', e))

      setSuccess(`✅ User "${form.full_name}" created! A welcome email with their credentials has been sent to ${form.email}.`)
      onCreated()
    } catch (e) {
      setErr(e.message || 'Failed to create user.')
    }
    setSaving(false)
  }

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600'
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Add New User</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {success ? (
          <div className="p-6 space-y-4">
            <div className="bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 rounded-xl">
              {success}
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1">
              <p className="font-semibold text-gray-700 mb-2">Credentials to share:</p>
              <p><span className="text-gray-500">Email:</span> <span className="font-mono">{form.email}</span></p>
              {form.username && <p><span className="text-gray-500">Username:</span> <span className="font-mono">@{form.username}</span></p>}
              <p className="flex items-center gap-2">
                <span className="text-gray-500">Password:</span>
                <span className="font-mono">{form.password}</span>
                <button onClick={copyPassword} className="text-xs px-2 py-0.5 rounded bg-gray-200 hover:bg-gray-300">
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ backgroundColor: FG }}
            >
              Done
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {/* Full name */}
            <div>
              <label className={labelCls}>Full Name <span className="text-red-400">*</span></label>
              <input
                className={inputCls}
                value={form.full_name}
                onChange={e => set('full_name', e.target.value)}
                onBlur={handleNameBlur}
                placeholder="Brian Green"
                autoFocus
              />
            </div>

            {/* Username */}
            <div>
              <label className={labelCls}>Username <span className="text-gray-400 font-normal">(optional — auto-suggested from name)</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
                <input
                  className={inputCls + ' pl-7'}
                  value={form.username}
                  onChange={e => set('username', e.target.value.toLowerCase().replace(/\s+/g, '.'))}
                  placeholder="brian.green"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className={labelCls}>Email Address <span className="text-red-400">*</span></label>
              <input
                type="email"
                className={inputCls}
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="brian@company.com"
              />
            </div>

            {/* Password */}
            <div>
              <label className={labelCls}>Temporary Password <span className="text-red-400">*</span></label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showPw ? 'text' : 'password'}
                    className={inputCls + ' pr-10 font-mono'}
                    value={form.password}
                    onChange={e => set('password', e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                  >
                    {showPw ? '🙈' : '👁️'}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => set('password', generatePassword())}
                  className="px-3 py-2 rounded-lg border border-gray-300 text-xs text-gray-600 hover:bg-gray-50 whitespace-nowrap"
                >
                  🔄 Generate
                </button>
                <button
                  type="button"
                  onClick={copyPassword}
                  className="px-3 py-2 rounded-lg border border-gray-300 text-xs text-gray-600 hover:bg-gray-50"
                >
                  {copied ? '✓' : '📋'}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Share this password with the user — they can change it after logging in.</p>
            </div>

            {/* Role */}
            <div>
              <label className={labelCls}>Role</label>
              <div className="flex gap-3">
                {['user', 'admin'].map(r => (
                  <label key={r} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      checked={form.role === r}
                      onChange={() => set('role', r)}
                      className="accent-green-700"
                    />
                    <span className="capitalize">{r === 'admin' ? '🛡️ Admin' : '👤 User'}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className={labelCls}>Cell Phone <span className="text-gray-400 font-normal">(optional — for texting)</span></label>
              <input type="tel" className={inputCls} value={form.phone_cell}
                onChange={e => set('phone_cell', e.target.value)} placeholder="(555) 867-5309" />
            </div>

            {/* Address */}
            <div className="border-t border-gray-100 pt-4">
              <p className={labelCls + ' mb-3'}>Address <span className="text-gray-400 font-normal">(optional)</span></p>
              <div className="space-y-3">
                <input className={inputCls} value={form.address_line1}
                  onChange={e => set('address_line1', e.target.value)} placeholder="Address Line 1" />
                <input className={inputCls} value={form.address_line2}
                  onChange={e => set('address_line2', e.target.value)} placeholder="Address Line 2 (apt, suite…)" />
                <div className="grid grid-cols-3 gap-2">
                  <input className={inputCls + ' col-span-1'} value={form.city}
                    onChange={e => set('city', e.target.value)} placeholder="City" />
                  <select className={inputCls} value={form.state} onChange={e => set('state', e.target.value)}>
                    <option value="">State</option>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input className={inputCls} value={form.zip_code}
                    onChange={e => set('zip_code', e.target.value)} placeholder="Zip" maxLength={10} />
                </div>
              </div>
            </div>

            {err && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-xl">
                ⚠️ {err}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60"
                style={{ backgroundColor: FG }}
              >
                {saving
                  ? <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full"></span>
                      Creating…
                    </span>
                  : 'Create User'
                }
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── CompanySettings ───────────────────────────────────────────────────────────
const WEEK_DAYS = [
  { value: 0, short: 'Sun', label: 'Sunday'    },
  { value: 1, short: 'Mon', label: 'Monday'    },
  { value: 2, short: 'Tue', label: 'Tuesday'   },
  { value: 3, short: 'Wed', label: 'Wednesday' },
  { value: 4, short: 'Thu', label: 'Thursday'  },
  { value: 5, short: 'Fri', label: 'Friday'    },
  { value: 6, short: 'Sat', label: 'Saturday'  },
]

function CompanySettings({ currentUserIsAdmin }) {
  const { user } = useAuth()

  // ── Company info ──────────────────────────────────────────────────────────
  const [companyForm, setCompanyForm] = useState({
    company_name:           '',
    license_number:         '',
    labor_rate_per_man_day: '400',
  })
  const [loadingCompany, setLoadingCompany] = useState(true)
  const [savingCompany,  setSavingCompany]  = useState(false)
  const [companyMsg,     setCompanyMsg]     = useState('')

  // ── Week ending day ───────────────────────────────────────────────────────
  const [weekEndingDay, setWeekEndingDay] = useState(null)
  const [pendingDay,    setPendingDay]    = useState(null)
  const [savingDay,     setSavingDay]     = useState(false)
  const [dayMsg,        setDayMsg]        = useState('')

  useEffect(() => { loadSettings() }, [])

  async function loadSettings() {
    setLoadingCompany(true)
    const { data } = await supabase
      .from('company_settings')
      .select('*')
      .maybeSingle()
    if (data) {
      setCompanyForm({
        company_name:           data.company_name           || '',
        license_number:         data.license_number         || '',
        labor_rate_per_man_day: String(data.labor_rate_per_man_day || '400'),
      })
      const val = data.week_ending_day ?? null
      setWeekEndingDay(val)
      setPendingDay(val)
    }
    setLoadingCompany(false)
  }

  async function saveCompany(e) {
    e.preventDefault()
    const rate = parseFloat(companyForm.labor_rate_per_man_day)
    if (isNaN(rate) || rate <= 0) {
      setCompanyMsg('error:Labor rate must be a positive number.')
      return
    }
    setSavingCompany(true); setCompanyMsg('')
    const { data: existing } = await supabase.from('company_settings').select('id').maybeSingle()
    const { error } = await supabase.from('company_settings').upsert({
      id:                     existing?.id || 1,
      company_name:           companyForm.company_name.trim(),
      license_number:         companyForm.license_number.trim(),
      labor_rate_per_man_day: rate,
      updated_at:             new Date().toISOString(),
    }, { onConflict: 'id' })
    setCompanyMsg(error ? 'error:' + error.message : 'ok:Settings saved.')
    setSavingCompany(false)
    setTimeout(() => setCompanyMsg(''), 4000)
  }

  async function saveWeekDay() {
    if (pendingDay === null) return
    setSavingDay(true); setDayMsg('')
    const { data: existing } = await supabase.from('company_settings').select('id').maybeSingle()
    const { error } = await supabase.from('company_settings').upsert(
      { id: existing?.id || 1, week_ending_day: pendingDay },
      { onConflict: 'id' }
    )
    if (error) {
      setDayMsg('error:' + error.message)
    } else {
      setWeekEndingDay(pendingDay)
      setDayMsg('ok:Week ending day saved.')
    }
    setSavingDay(false)
    setTimeout(() => setDayMsg(''), 4000)
  }

  const Msg = ({ m }) => m ? (
    <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border ${
      m.startsWith('ok:')
        ? 'bg-green-50 border-green-200 text-green-800'
        : 'bg-red-50 border-red-200 text-red-700'
    }`}>
      {m.startsWith('ok:') ? '✅' : '⚠️'} {m.slice(3)}
    </div>
  ) : null

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600'
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1'
  const rate = parseFloat(companyForm.labor_rate_per_man_day || 0)

  if (loadingCompany) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
    </div>
  )

  return (
    <div className="max-w-xl space-y-4">

      {!currentUserIsAdmin && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl">
          ⚠️ Only admins can change these settings.
        </div>
      )}

      {/* ── Company info ─────────────────────────────────────────────────── */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4">🏢 Company Info</h3>
        <form onSubmit={saveCompany} className="space-y-4">
          <div>
            <label className={labelCls}>Company Name</label>
            <input className={inputCls} value={companyForm.company_name}
              onChange={e => setCompanyForm(p => ({ ...p, company_name: e.target.value }))}
              placeholder="Your Company Name" disabled={!currentUserIsAdmin} />
          </div>
          <div>
            <label className={labelCls}>License Number</label>
            <input className={inputCls} value={companyForm.license_number}
              onChange={e => setCompanyForm(p => ({ ...p, license_number: e.target.value }))}
              placeholder="e.g. CA-12345" disabled={!currentUserIsAdmin} />
          </div>
          <div>
            <label className={labelCls}>Labor Rate — Per Man Day (1 MD = 8 hrs)</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-400 text-sm">$</span>
              <input
                className={inputCls + ' pl-7'}
                type="number" min="1" step="0.01"
                value={companyForm.labor_rate_per_man_day}
                onChange={e => setCompanyForm(p => ({ ...p, labor_rate_per_man_day: e.target.value }))}
                placeholder="400.00" disabled={!currentUserIsAdmin}
              />
            </div>
            {rate > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                At ${rate.toFixed(2)}/MD that's ${(rate / 8).toFixed(2)}/hr.
              </p>
            )}
          </div>

          {companyMsg && <Msg m={companyMsg} />}

          {currentUserIsAdmin && (
            <button type="submit" disabled={savingCompany}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: FG }}>
              {savingCompany ? 'Saving…' : 'Save Company Settings'}
            </button>
          )}
        </form>
      </div>

      {/* ── GP explanation ────────────────────────────────────────────────── */}
      <div className="card bg-green-50 border-green-200">
        <h3 className="font-semibold text-green-900 mb-2">📊 How GP is Calculated</h3>
        <div className="text-sm text-green-800 space-y-1.5">
          <p><b>Revenue</b> = Contract Price + Change Order Prices</p>
          <p><b>Labor Cost</b> = Total Man Days × Rate per Man Day</p>
          <p><b>Total Cost</b> = Labor Cost + Material Cost</p>
          <p><b>Gross Profit</b> = Revenue − Total Cost</p>
          <p><b>GP %</b> = Gross Profit ÷ Revenue × 100</p>
          <hr className="border-green-200 my-2" />
          <p className="text-xs text-green-700">
            1 Man Day = 8 hours. A module with 3 man days at ${rate > 0 ? rate.toFixed(0) : 400}/MD = ${(3 * (rate > 0 ? rate : 400)).toLocaleString()} labor cost.
          </p>
        </div>
      </div>

      {/* ── Week ending day ───────────────────────────────────────────────── */}
      <div className="card">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-semibold text-gray-800">📅 Weekly Statistic — Week Ending Day</h3>
          {weekEndingDay === null
            ? <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Not configured</span>
            : <span className="text-xs font-semibold bg-green-100 text-green-800 px-2 py-0.5 rounded-full">{WEEK_DAYS[weekEndingDay]?.label}</span>
          }
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Sets the last day of each statistical week for all weekly tracking statistics.
          All users share this setting. <strong>Required</strong> before anyone can enter values for a weekly statistic.
        </p>

        <div className="grid grid-cols-7 gap-1.5 mb-4">
          {WEEK_DAYS.map(d => (
            <button
              key={d.value}
              disabled={!currentUserIsAdmin}
              onClick={() => setPendingDay(d.value)}
              className={`py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                pendingDay === d.value
                  ? 'text-white border-transparent'
                  : currentUserIsAdmin
                    ? 'border-gray-200 text-gray-600 hover:border-green-400 hover:text-green-700'
                    : 'border-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              style={pendingDay === d.value ? { backgroundColor: FG, borderColor: FG } : {}}
            >
              {d.short}
            </button>
          ))}
        </div>

        {dayMsg && <div className="mb-3"><Msg m={dayMsg} /></div>}

        {currentUserIsAdmin && (
          <button
            onClick={saveWeekDay}
            disabled={savingDay || pendingDay === null || pendingDay === weekEndingDay}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40"
            style={{ backgroundColor: FG }}
          >
            {savingDay ? 'Saving…' : 'Save Setting'}
          </button>
        )}
        {currentUserIsAdmin && pendingDay !== null && pendingDay === weekEndingDay && !dayMsg && (
          <p className="text-xs text-gray-400 mt-2">No changes to save.</p>
        )}
      </div>

      {/* ── Period reference ──────────────────────────────────────────────── */}
      <div className="card bg-gray-50 border-gray-200">
        <h3 className="font-semibold text-gray-700 mb-3 text-sm">📋 Period Reference (read-only)</h3>
        <div className="space-y-2 text-sm text-gray-600">
          {[
            ['Daily',     'Every calendar day'],
            ['Weekly',    weekEndingDay !== null ? `Week ending ${WEEK_DAYS[weekEndingDay]?.label}` : 'Not configured — set above'],
            ['Monthly',   'Last day of each calendar month'],
            ['Quarterly', 'Mar 31 · Jun 30 · Sep 30 · Dec 31'],
            ['Yearly',    'Dec 31 of each year'],
          ].map(([label, val]) => (
            <div key={label} className="flex justify-between">
              <span className="font-medium">{label}</span>
              <span className="text-gray-500">{val}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

export default function Admin() {
  const { user } = useAuth()
  const [tab, setTab] = useState('overview')

  // ── Overview state ─────────────────────────────────────────────────────────
  const [counts,  setCounts]  = useState({ jobs: 0, clients: 0, bids: 0, collections: 0, statistics: 0 })
  const [loadingOverview, setLoadingOverview] = useState(true)

  // ── Users state ────────────────────────────────────────────────────────────
  const [profiles,     setProfiles]     = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [savingId,     setSavingId]     = useState(null)   // profile id being saved
  const [editName,     setEditName]     = useState({})     // { [id]: string }
  const [editUsername, setEditUsername] = useState({})     // { [id]: string }
  const [msg,          setMsg]          = useState('')      // success/error flash

  const [currentUserIsAdmin, setCurrentUserIsAdmin] = useState(false)
  const [showAddUser,        setShowAddUser]        = useState(false)
  const [editingUser,        setEditingUser]        = useState(null)  // profile object

  // ── Fetch on mount ─────────────────────────────────────────────────────────
  useEffect(() => { fetchOverview() }, [])
  useEffect(() => { if (tab === 'users') fetchUsers() }, [tab])

  // Check current user's admin status on mount — don't wait for the users tab to load profiles
  useEffect(() => {
    if (!user?.id) return
    supabase.from('profiles').select('role').eq('id', user.id).single()
      .then(({ data }) => { if (data) setCurrentUserIsAdmin(data.role === 'admin') })
  }, [user?.id])

  // Also keep in sync if profiles list gets loaded (e.g. from Users tab)
  useEffect(() => {
    if (user?.id && profiles.length) {
      const me = profiles.find(p => p.id === user.id)
      if (me) setCurrentUserIsAdmin(me.role === 'admin')
    }
  }, [profiles, user])

  async function fetchOverview() {
    setLoadingOverview(true)
    const [jobs, clients, bids, collections, stats] = await Promise.all([
      supabase.from('jobs').select('id',        { count: 'exact', head: true }),
      supabase.from('clients').select('id',     { count: 'exact', head: true }),
      supabase.from('bids').select('id',        { count: 'exact', head: true }),
      supabase.from('collections').select('id', { count: 'exact', head: true }),
      supabase.from('statistics').select('id',  { count: 'exact', head: true }),
    ])
    setCounts({
      jobs:        jobs.count        || 0,
      clients:     clients.count     || 0,
      bids:        bids.count        || 0,
      collections: collections.count || 0,
      statistics:  stats.count       || 0,
    })
    setLoadingOverview(false)
  }

  async function fetchUsers() {
    setLoadingUsers(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at')
    if (!error) {
      setProfiles(data || [])
      const names = {}; const usernames = {}
      data?.forEach(p => { names[p.id] = p.full_name || ''; usernames[p.id] = p.username || '' })
      setEditName(names)
      setEditUsername(usernames)
    }
    setLoadingUsers(false)
  }

  async function saveRole(profileId, newRole) {
    setSavingId(profileId)
    setMsg('')
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', profileId)
    if (error) {
      setMsg('❌ ' + error.message)
    } else {
      setMsg('✅ Role updated.')
      await fetchUsers()
    }
    setSavingId(null)
    setTimeout(() => setMsg(''), 3000)
  }

  async function saveName(profileId) {
    setSavingId(profileId)
    setMsg('')
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: editName[profileId] })
      .eq('id', profileId)
    if (error) {
      setMsg('❌ ' + error.message)
    } else {
      setMsg('✅ Name updated.')
      await fetchUsers()
    }
    setSavingId(null)
    setTimeout(() => setMsg(''), 3000)
  }

  async function saveUsername(profileId) {
    setSavingId(profileId)
    setMsg('')
    const newUsername = (editUsername[profileId] || '').toLowerCase().trim().replace(/\s+/g, '.')
    if (!newUsername) { setMsg('❌ Username cannot be empty.'); setSavingId(null); return }

    // Use the set_username RPC if saving own profile, otherwise direct update for admin
    const targetProfile = profiles.find(p => p.id === profileId)
    const isOwn = profileId === user?.id

    let error
    if (isOwn) {
      const { data: result, error: rpcErr } = await supabase.rpc('set_username', { p_username: newUsername })
      error = rpcErr
      if (!rpcErr && result === 'taken') {
        setMsg('❌ That username is already taken.')
        setSavingId(null)
        setTimeout(() => setMsg(''), 3000)
        return
      }
    } else {
      // Admin updating another user's username directly
      ;({ error } = await supabase.from('profiles').update({ username: newUsername }).eq('id', profileId))
    }

    if (error) {
      setMsg('❌ ' + (error.message.includes('unique') ? 'That username is already taken.' : error.message))
    } else {
      setMsg('✅ Username updated.')
      await fetchUsers()
    }
    setSavingId(null)
    setTimeout(() => setMsg(''), 3000)
  }

  // ── Tabs ───────────────────────────────────────────────────────────────────
  const tabs = [
    { key: 'overview',  label: 'Overview' },
    { key: 'users',     label: 'Users & Roles' },
    { key: 'settings',  label: 'Company Settings' },
  ]

  const statCards = [
    { label: 'Total Jobs',       value: counts.jobs,        icon: '🔨', color: 'bg-green-50  border-green-200'  },
    { label: 'Total Clients',    value: counts.clients,     icon: '👥', color: 'bg-blue-50   border-blue-200'   },
    { label: 'Total Bids',       value: counts.bids,        icon: '📋', color: 'bg-yellow-50 border-yellow-200' },
    { label: 'Total Invoices',   value: counts.collections, icon: '💰', color: 'bg-purple-50 border-purple-200' },
    { label: 'Total Statistics', value: counts.statistics,  icon: '📈', color: 'bg-teal-50   border-teal-200'   },
  ]

  return (
    <div className="max-w-5xl mx-auto">

      {/* Page header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Admin</h1>
        <p className="text-sm text-gray-500 mt-0.5">System overview and management</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
              tab === t.key
                ? 'border-green-700 text-green-800'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ──────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        loadingOverview
          ? <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-700"></div></div>
          : (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                {statCards.map(s => (
                  <div key={s.label} className={`card border ${s.color} text-center`}>
                    <p className="text-3xl mb-2">{s.icon}</p>
                    <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Quick links */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="card">
                  <h2 className="font-semibold text-gray-900 mb-2">Supabase Dashboard</h2>
                  <p className="text-sm text-gray-500 mb-4">Manage auth users, view raw tables, and run SQL queries.</p>
                  <a
                    href="https://supabase.com/dashboard/project/jjlnpywpmoukgwmwczbz/auth/users"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    👤 Auth Users
                  </a>
                  <a
                    href="https://supabase.com/dashboard/project/jjlnpywpmoukgwmwczbz/editor"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary inline-flex items-center gap-2 ml-2"
                  >
                    🗄️ SQL Editor
                  </a>
                </div>

                <div className="card bg-gray-50 border-gray-200">
                  <h2 className="font-semibold text-gray-900 mb-3">App Info</h2>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><span className="font-medium">Supabase Project:</span> jjlnpywpmoukgwmwczbz</p>
                    <p><span className="font-medium">Version:</span> 1.0.0</p>
                    <p><span className="font-medium">Stack:</span> React + Vite + Supabase + Tailwind</p>
                    <p><span className="font-medium">Logged in as:</span> {user?.email}</p>
                  </div>
                </div>
              </div>
            </>
          )
      )}

      {/* ── USERS TAB ─────────────────────────────────────────────────────── */}
      {tab === 'users' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Users & Roles</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {currentUserIsAdmin
                  ? 'You have admin access — you can add users, update names and roles.'
                  : 'Only admins can manage users. Contact your admin for access changes.'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">{profiles.length} user{profiles.length !== 1 ? 's' : ''}</span>
              {currentUserIsAdmin && (
                <button
                  onClick={() => setShowAddUser(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                  style={{ backgroundColor: FG }}
                >
                  + Add User
                </button>
              )}
            </div>
          </div>

          {/* Flash message */}
          {msg && (
            <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm font-medium ${
              msg.startsWith('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {msg}
            </div>
          )}

          {loadingUsers ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
            </div>
          ) : (
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Name</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Username</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Email</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Role</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Joined</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {profiles.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-gray-400">No users found</td>
                    </tr>
                  )}
                  {profiles.map(p => {
                    const isMe = p.id === user?.id
                    return (
                      <tr
                        key={p.id}
                        onClick={() => currentUserIsAdmin && setEditingUser(p)}
                        className={`border-b border-gray-50 last:border-0 transition-colors ${
                          currentUserIsAdmin ? 'cursor-pointer hover:bg-green-50/40' : ''
                        } ${isMe ? 'bg-green-50/30' : ''}`}
                      >
                        {/* Name */}
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                                 style={{ backgroundColor: FG }}>
                              {(p.full_name || p.email || '?')[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 text-sm leading-tight">
                                {p.full_name || <span className="text-gray-400 italic">No name</span>}
                              </div>
                              {isMe && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">You</span>}
                            </div>
                          </div>
                        </td>

                        {/* Username */}
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm text-gray-600">
                            {p.username ? '@' + p.username : <span className="text-gray-400 italic text-xs">not set</span>}
                          </span>
                        </td>

                        {/* Email */}
                        <td className="px-4 py-3 text-gray-600 text-sm">{p.email}</td>

                        {/* Role */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            p.role === 'admin' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {p.role === 'admin' ? '🛡️ Admin' : '👤 User'}
                          </span>
                        </td>

                        {/* Joined */}
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {p.created_at ? new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </td>

                        {/* Edit chevron */}
                        <td className="px-4 py-3 text-right text-gray-300 text-sm">
                          {currentUserIsAdmin && <span>›</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-xs text-gray-400 mt-3">
            To add or remove users, use the{' '}
            <a
              href="https://supabase.com/dashboard/project/jjlnpywpmoukgwmwczbz/auth/users"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-600"
            >
              Supabase Auth dashboard
            </a>.
          </p>
        </>
      )}

      {/* ── COMPANY SETTINGS TAB ──────────────────────────────────────── */}
      {tab === 'settings' && (
        <CompanySettings currentUserIsAdmin={currentUserIsAdmin} />
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <UserEditModal
          profile={editingUser}
          currentUserId={user?.id}
          onClose={() => setEditingUser(null)}
          onSaved={() => { fetchUsers(); setEditingUser(null) }}
        />
      )}

      {/* Add User Modal */}
      {showAddUser && (
        <AddUserModal
          onClose={() => setShowAddUser(false)}
          onCreated={() => { fetchUsers() }}
        />
      )}
    </div>
  )
}
