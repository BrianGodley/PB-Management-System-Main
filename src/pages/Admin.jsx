import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { sendWelcomeEmail, sendSMS } from '../lib/notify'

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

function UserEditModal({ profile, currentUserId, currentUserRole, onClose, onSaved }) {
  const [tab, setTab] = useState('profile')

  const callerIsAdmin      = currentUserRole === 'admin' || currentUserRole === 'super_admin'
  const callerIsSuperAdmin = currentUserRole === 'super_admin'

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
  const [resetSending,     setResetSending]     = useState(false)
  const [resetMsg,         setResetMsg]         = useState('')

  // ── Sam SMS password ───────────────────────────────────────────────────────
  const [smsSending,       setSmsSending]       = useState(false)
  const [resetTextSending, setResetTextSending] = useState(false)
  const [smsMsg,           setSmsMsg]           = useState('')

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

  // ── Sam SMS helpers ────────────────────────────────────────────────────────
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

  async function sendPasswordViaSMS() {
    const phone = formatPhone(form.phone_cell || profile.phone_cell || '')
    if (!phone || phone === '+') { setSmsMsg('error:No cell phone number on file for this user.'); return }
    if (!profile.temp_password) { setSmsMsg('error:No stored password found. Use "Reset & Text New Password" instead.'); return }
    setSmsSending(true); setSmsMsg('')
    const firstName = (profile.full_name || '').split(' ')[0]
    const { error } = await sendSMS({
      to:      phone,
      message: samMessage(firstName, profile.email, profile.temp_password),
    })
    setSmsMsg(error ? 'error:SMS failed — ' + error.message : 'ok:Password texted to ' + phone)
    setSmsSending(false)
  }

  async function resetAndTextPassword() {
    const phone = formatPhone(form.phone_cell || profile.phone_cell || '')
    if (!phone || phone === '+') { setSmsMsg('error:No cell phone number on file for this user.'); return }
    if (!confirm(`Generate a new password for ${profile.full_name || profile.email} and text it to ${phone}?`)) return
    setResetTextSending(true); setSmsMsg('')
    const newPw = generatePassword()

    // Save new password to profile so it's stored for reference
    await supabase.from('profiles').update({ temp_password: newPw }).eq('id', profile.id)

    // Try Edge Function to reset auth password (optional — may not be deployed)
    try {
      const { data: resetData, error: resetErr } = await supabase.functions.invoke('reset-user-password', {
        body: { userId: profile.id, newPassword: newPw },
      })
      if (resetErr || resetData?.error) console.warn('Edge Function unavailable:', resetData?.error || resetErr?.message)
    } catch (e) {
      console.warn('reset-user-password Edge Function not available:', e)
    }

    // Text the new password as Sam regardless
    const firstName = (profile.full_name || '').split(' ')[0]
    const { error: smsErr } = await sendSMS({
      to:      phone,
      message: samMessage(firstName, profile.email, newPw, true),
    })
    setSmsMsg(smsErr
      ? 'error:SMS failed — ' + smsErr.message
      : 'ok:New password texted to ' + phone + '. If their login does not work, also send a password reset email.'
    )
    setResetTextSending(false)
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
          {[
            { key: 'profile',     label: '👤 Profile' },
            { key: 'permissions', label: '🔐 Permissions' },
            { key: 'account',     label: '🔑 Access and Roles' },
            ...(callerIsAdmin ? [{ key: 'danger', label: '⚠️ Danger' }] : []),
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key && t.key !== 'danger'
                  ? 'border-green-700 text-green-800'
                  : tab === t.key && t.key === 'danger'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
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
                {callerIsSuperAdmin && !isMe ? (
                  <div className="flex gap-4 flex-wrap">
                    {['user', 'admin', 'super_admin'].map(r => (
                      <label key={r} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" name="edit-role" checked={form.role === r}
                          onChange={() => set('role', r)}
                          className="accent-green-700" />
                        {r === 'super_admin' ? '👑 Super Admin' : r === 'admin' ? '🛡️ Admin' : '👤 User'}
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                      form.role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                      form.role === 'admin' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {form.role === 'super_admin' ? '👑 Super Admin' : form.role === 'admin' ? '🛡️ Admin' : '👤 User'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {isMe ? 'You cannot change your own role.' : 'Only the super admin can change roles.'}
                    </span>
                  </div>
                )}
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
            </div>
          )}

          {/* ── PERMISSIONS TAB ─────────────────────────────────────────── */}
          {tab === 'permissions' && (
            <div className="p-6 space-y-5">
              {(profile.role === 'admin' || profile.role === 'super_admin') && (
                <div className={`border text-sm px-4 py-3 rounded-xl ${profile.role === 'super_admin' ? 'bg-purple-50 border-purple-200 text-purple-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
                  {profile.role === 'super_admin' ? '👑' : '🛡️'} This user is a <strong>{profile.role === 'super_admin' ? 'Super Admin' : 'Admin'}</strong> — they have full access to everything regardless of these settings.
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

          {/* ── ACCOUNT TAB ─────────────────────────────────────────────── */}
          {tab === 'account' && (
            <div className="p-6 space-y-4">

              {/* Password Reset */}
              <div>
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

              {/* Text Password via Sam */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-base">🤖</span>
                  <label className={labelCls} style={{ margin: 0 }}>Text Password via Sam</label>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Sam, the AI assistant, will text the user their credentials via SMS.
                  {!(form.phone_cell || profile.phone_cell) && (
                    <span className="text-amber-600 font-medium"> No cell phone number on file — add one in the Profile tab.</span>
                  )}
                </p>
                {smsMsg && <div className="mb-3"><Msg msg={smsMsg} /></div>}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={sendPasswordViaSMS}
                    disabled={smsSending || !(form.phone_cell || profile.phone_cell)}
                    className="px-4 py-2 rounded-lg border border-blue-200 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-40"
                  >
                    {smsSending ? 'Sending…' : '📱 Text Current Password'}
                  </button>
                  <button
                    onClick={resetAndTextPassword}
                    disabled={resetTextSending || !(form.phone_cell || profile.phone_cell)}
                    className="px-4 py-2 rounded-lg border border-green-200 text-sm font-medium text-green-700 hover:bg-green-50 disabled:opacity-40"
                  >
                    {resetTextSending ? 'Resetting…' : '🔄 Reset & Text New Password'}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  "Text Current Password" sends the last admin-set password.
                  "Reset & Text" generates a new password, resets their account, and texts it.
                </p>
              </div>
            </div>
          )}

          {/* ── DANGER ZONE TAB ─────────────────────────────────────────── */}
          {tab === 'danger' && (
            <DangerZone
              profile={profile}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
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
function DangerZone({ profile, currentUserId, currentUserRole, onClose, onSaved }) {
  const isMe             = profile.id === currentUserId
  const isArchived       = !!profile.archived_at
  const targetIsPriv     = profile.role === 'admin' || profile.role === 'super_admin'
  const callerIsSuperAdmin = currentUserRole === 'super_admin'
  const canDelete        = !isMe && (!targetIsPriv || callerIsSuperAdmin)

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

        {!canDelete ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-3 py-2.5 rounded-lg">
            {isMe
              ? '⚠️ You cannot delete your own account.'
              : '🔒 Only the super admin can delete admin or super admin accounts.'}
          </div>
        ) : !confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-4 py-2 rounded-lg border border-red-300 text-sm font-medium text-red-700 hover:bg-red-100"
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
          temp_password: form.password,            // stored so Sam can text it later
        }, { onConflict: 'id' })

      if (profileErr) {
        // Surface the real error so we can diagnose it
        throw new Error(`User created but profile setup failed: ${profileErr.message}`)
      }

      // Send welcome email — non-blocking but surface Resend errors in UI
      const { error: emailErr } = await sendWelcomeEmail({
        to:       form.email.trim().toLowerCase(),
        fullName: form.full_name.trim(),
        username: form.username.trim().toLowerCase(),
        password: form.password,
        loginUrl: window.location.origin + '/login',
      })

      if (emailErr) {
        setSuccess(
          `✅ User "${form.full_name}" created! ` +
          `⚠️ Welcome email could not be sent — ${emailErr.message}. ` +
          `Please share the password manually.`
        )
      } else {
        setSuccess(`✅ User "${form.full_name}" created! A welcome email with their credentials has been sent to ${form.email}.`)
      }
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

  // ── Week ending day (Statistics) ─────────────────────────────────────────
  const [weekEndingDay, setWeekEndingDay] = useState(null)
  const [pendingDay,    setPendingDay]    = useState(null)
  const [savingDay,     setSavingDay]     = useState(false)
  const [dayMsg,        setDayMsg]        = useState('')

  // ── Company week ending day (Finance) ─────────────────────────────────────
  const [companyWeekDay,        setCompanyWeekDay]        = useState(null)
  const [pendingCompanyWeekDay, setPendingCompanyWeekDay] = useState(null)
  const [savingCompanyWeekDay,  setSavingCompanyWeekDay]  = useState(false)
  const [companyWeekMsg,        setCompanyWeekMsg]        = useState('')

  // ── Company logo ──────────────────────────────────────────────────────────
  const [logoUrl,      setLogoUrl]      = useState(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoMsg,      setLogoMsg]      = useState('')
  const logoInputRef = useRef(null)

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
      const cwd = data.company_week_ending_day ?? 5
      setCompanyWeekDay(cwd)
      setPendingCompanyWeekDay(cwd)
      if (data.logo_url) setLogoUrl(data.logo_url)
    }
    setLoadingCompany(false)
  }

  async function uploadLogo(file) {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['png','jpg','jpeg','gif','svg','webp'].includes(ext)) {
      setLogoMsg('error:Please upload a PNG, JPG, SVG, or WebP image.')
      return
    }
    setUploadingLogo(true); setLogoMsg('')
    const { error: upErr } = await supabase.storage
      .from('company-assets')
      .upload('logo', file, { upsert: true, contentType: file.type })
    if (upErr) { setLogoMsg('error:' + upErr.message); setUploadingLogo(false); return }
    const { data: { publicUrl } } = supabase.storage.from('company-assets').getPublicUrl('logo')
    // append cache-buster so browser picks up the new image
    const urlWithBust = publicUrl + '?t=' + Date.now()
    const { data: existing } = await supabase.from('company_settings').select('id').maybeSingle()
    const { error: dbErr } = await supabase.from('company_settings').upsert(
      { id: existing?.id || 1, logo_url: urlWithBust, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    )
    if (dbErr) { setLogoMsg('error:' + dbErr.message); setUploadingLogo(false); return }
    setLogoUrl(urlWithBust)
    window.dispatchEvent(new Event('company-logo-updated'))
    setLogoMsg('ok:Logo uploaded and applied.')
    setUploadingLogo(false)
    setTimeout(() => setLogoMsg(''), 4000)
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

  async function saveCompanyWeekDay() {
    if (pendingCompanyWeekDay === null) return
    setSavingCompanyWeekDay(true); setCompanyWeekMsg('')
    const { data: existing } = await supabase.from('company_settings').select('id').maybeSingle()
    const { error } = await supabase.from('company_settings').upsert(
      { id: existing?.id || 1, company_week_ending_day: pendingCompanyWeekDay },
      { onConflict: 'id' }
    )
    if (error) {
      setCompanyWeekMsg('error:' + error.message)
    } else {
      setCompanyWeekDay(pendingCompanyWeekDay)
      setCompanyWeekMsg('ok:Company week ending day saved.')
    }
    setSavingCompanyWeekDay(false)
    setTimeout(() => setCompanyWeekMsg(''), 4000)
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

      {/* ── Company week ending day ──────────────────────────────────────── */}
      <div className="card">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-semibold text-gray-800">📅 Company Week — Week Ending Day</h3>
          {companyWeekDay === null
            ? <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Not configured</span>
            : <span className="text-xs font-semibold bg-green-100 text-green-800 px-2 py-0.5 rounded-full">{WEEK_DAYS[companyWeekDay]?.label}</span>
          }
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Sets the last day of the company work week. Used by the Finance module to determine week-ending dates for collections and payables tracking.
        </p>

        <div className="grid grid-cols-7 gap-1.5 mb-4">
          {WEEK_DAYS.map(d => (
            <button
              key={d.value}
              disabled={!currentUserIsAdmin}
              onClick={() => setPendingCompanyWeekDay(d.value)}
              className={`py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                pendingCompanyWeekDay === d.value
                  ? 'text-white border-transparent'
                  : currentUserIsAdmin
                    ? 'border-gray-200 text-gray-600 hover:border-green-400 hover:text-green-700'
                    : 'border-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              style={pendingCompanyWeekDay === d.value ? { backgroundColor: FG, borderColor: FG } : {}}
            >
              {d.short}
            </button>
          ))}
        </div>

        {companyWeekMsg && <div className="mb-3"><Msg m={companyWeekMsg} /></div>}

        {currentUserIsAdmin && (
          <button
            onClick={saveCompanyWeekDay}
            disabled={savingCompanyWeekDay || pendingCompanyWeekDay === null || pendingCompanyWeekDay === companyWeekDay}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40"
            style={{ backgroundColor: FG }}
          >
            {savingCompanyWeekDay ? 'Saving…' : 'Save Setting'}
          </button>
        )}
        {currentUserIsAdmin && pendingCompanyWeekDay !== null && pendingCompanyWeekDay === companyWeekDay && !companyWeekMsg && (
          <p className="text-xs text-gray-400 mt-2">No changes to save.</p>
        )}
      </div>

      {/* ── Company Logo ─────────────────────────────────────────────────── */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-1">🖼️ Company Logo</h3>
        <p className="text-sm text-gray-500 mb-4">Used as the app icon (favicon) in the browser tab. PNG, JPG, SVG or WebP recommended.</p>
        <div className="flex items-center gap-4">
          {logoUrl ? (
            <img src={logoUrl} alt="Company logo" className="h-16 w-16 object-contain rounded-lg border border-gray-200 bg-gray-50 p-1" />
          ) : (
            <div className="h-16 w-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-300 text-2xl">🖼️</div>
          )}
          <div className="flex-1">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/svg+xml,image/webp"
              className="hidden"
              onChange={e => uploadLogo(e.target.files?.[0])}
              disabled={!currentUserIsAdmin}
            />
            {currentUserIsAdmin && (
              <button
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{ backgroundColor: FG }}
              >
                {uploadingLogo ? 'Uploading…' : logoUrl ? 'Replace Logo' : 'Upload Logo'}
              </button>
            )}
            {logoMsg && <div className="mt-2"><Msg m={logoMsg} /></div>}
          </div>
        </div>
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

// ── EmailSettings ─────────────────────────────────────────────────────────────
const EMAIL_PROVIDERS = [
  {
    key: 'resend',
    label: 'Resend',
    logo: '📨',
    url: 'https://resend.com',
    fields: [
      { key: 'api_key',    label: 'API Key',    type: 'password', placeholder: 're_••••••••••••••••••••••••' },
      { key: 'from_email', label: 'From Email', type: 'text',     placeholder: 'noreply@yourdomain.com' },
    ],
  },
  {
    key: 'sendgrid',
    label: 'SendGrid',
    logo: '📧',
    url: 'https://app.sendgrid.com',
    fields: [
      { key: 'api_key',    label: 'API Key',    type: 'password', placeholder: 'SG.••••••••••••••••••••••••' },
      { key: 'from_email', label: 'From Email', type: 'text',     placeholder: 'noreply@yourdomain.com' },
    ],
  },
  {
    key: 'mailgun',
    label: 'Mailgun',
    logo: '🔫',
    url: 'https://app.mailgun.com',
    fields: [
      { key: 'api_key',    label: 'API Key',    type: 'password', placeholder: '••••••••••••••••••••••••••••••••' },
      { key: 'domain',     label: 'Domain',     type: 'text',     placeholder: 'mg.yourdomain.com' },
      { key: 'from_email', label: 'From Email', type: 'text',     placeholder: 'noreply@mg.yourdomain.com' },
    ],
  },
  {
    key: 'postmark',
    label: 'Postmark',
    logo: '📮',
    url: 'https://account.postmarkapp.com',
    fields: [
      { key: 'server_token', label: 'Server Token', type: 'password', placeholder: '••••••••-••••-••••-••••-••••••••••••' },
      { key: 'from_email',   label: 'From Email',   type: 'text',     placeholder: 'noreply@yourdomain.com' },
    ],
  },
  {
    key: 'smtp',
    label: 'SMTP (Generic)',
    logo: '🌐',
    url: '',
    fields: [
      { key: 'host',       label: 'SMTP Host',  type: 'text',     placeholder: 'smtp.yourdomain.com' },
      { key: 'port',       label: 'Port',       type: 'text',     placeholder: '587' },
      { key: 'username',   label: 'Username',   type: 'text',     placeholder: 'user@yourdomain.com' },
      { key: 'password',   label: 'Password',   type: 'password', placeholder: '••••••••••••••••' },
      { key: 'from_email', label: 'From Email', type: 'text',     placeholder: 'noreply@yourdomain.com' },
    ],
  },
]

function EmailSettings() {
  const [activeKey,   setActiveKey]   = useState('resend')
  const [credentials, setCredentials] = useState({})
  const [testTo,      setTestTo]      = useState('')
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [testing,     setTesting]     = useState(false)
  const [saveMsg,     setSaveMsg]     = useState('')
  const [testResult,  setTestResult]  = useState('')
  const [showSecrets, setShowSecrets] = useState({})

  useEffect(() => { loadConfig() }, [])

  async function loadConfig() {
    setLoading(true)
    const { data } = await supabase.from('company_settings').select('email_config').maybeSingle()
    if (data?.email_config) {
      const cfg = data.email_config
      setActiveKey(cfg.active_provider || 'resend')
      setCredentials(cfg.providers || {})
    }
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true); setSaveMsg('')
    const cfg = { active_provider: activeKey, providers: credentials }
    const { data: existing } = await supabase.from('company_settings').select('id').maybeSingle()
    let error
    if (existing?.id) {
      ({ error } = await supabase.from('company_settings').update({ email_config: cfg }).eq('id', existing.id))
    } else {
      ({ error } = await supabase.from('company_settings').insert({ email_config: cfg }))
    }
    setSaving(false)
    setSaveMsg(error ? '⚠️ ' + error.message : '✓ Email settings saved')
    setTimeout(() => setSaveMsg(''), 4000)
  }

  async function handleTest() {
    if (!testTo.trim()) { setTestResult('⚠️ Enter an email address first.'); return }
    setTesting(true); setTestResult('')
    try {
      const { sendEmail } = await import('../lib/notify')
      const { error } = await sendEmail({
        to: testTo.trim(),
        subject: 'Test Email from Picture Build System',
        html: '<p>This is a test email from your Picture Build System. Email is configured correctly!</p>',
      })
      setTestResult(error ? '⚠️ ' + error.message : '✓ Test email sent! Check your inbox.')
    } catch (e) {
      setTestResult('⚠️ ' + e.message)
    }
    setTesting(false)
    setTimeout(() => setTestResult(''), 8000)
  }

  function setCred(providerKey, field, value) {
    setCredentials(prev => ({
      ...prev,
      [providerKey]: { ...(prev[providerKey] || {}), [field]: value },
    }))
  }

  function toggleShow(providerKey, field) {
    const k = providerKey + '.' + field
    setShowSecrets(prev => ({ ...prev, [k]: !prev[k] }))
  }

  const activeProvider = EMAIL_PROVIDERS.find(p => p.key === activeKey)

  if (loading) return <div className="text-gray-400 text-sm py-8 text-center">Loading email settings…</div>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Email Provider</h2>
        <p className="text-sm text-gray-500 mt-0.5">Choose your email sending service and enter credentials. Currently active: <strong>{activeProvider?.label}</strong></p>
      </div>

      {/* Active provider credentials */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">{activeProvider?.logo}</span>
          <div>
            <p className="font-semibold text-gray-800">{activeProvider?.label}</p>
            {activeProvider?.url && (
              <a href={activeProvider.url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">{activeProvider.url}</a>
            )}
          </div>
          <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Active</span>
        </div>
        <div className="space-y-3">
          {activeProvider?.fields.map(f => {
            const showKey = activeKey + '.' + f.key
            const isSecret = f.type === 'password'
            const showing = showSecrets[showKey]
            return (
              <div key={f.key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                <div className="flex gap-2">
                  <input
                    type={isSecret && !showing ? 'password' : 'text'}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder={f.placeholder}
                    value={credentials[activeKey]?.[f.key] || ''}
                    onChange={e => setCred(activeKey, f.key, e.target.value)}
                  />
                  {isSecret && (
                    <button onClick={() => toggleShow(activeKey, f.key)}
                      className="px-3 py-2 text-xs border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50">
                      {showing ? 'Hide' : 'Show'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 bg-green-700 text-white text-sm font-medium rounded-lg hover:bg-green-800 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
          {saveMsg && <span className={`text-sm font-medium ${saveMsg.startsWith('⚠️') ? 'text-red-600' : 'text-green-600'}`}>{saveMsg}</span>}
        </div>
      </div>

      {/* Test email */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <p className="text-sm font-semibold text-gray-700 mb-3">Send Test Email</p>
        <div className="flex gap-2">
          <input
            type="email"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="recipient@example.com"
            value={testTo}
            onChange={e => setTestTo(e.target.value)}
          />
          <button onClick={handleTest} disabled={testing}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {testing ? 'Sending…' : 'Send Test'}
          </button>
        </div>
        {testResult && (
          <p className={`text-sm mt-2 font-medium ${testResult.startsWith('⚠️') ? 'text-red-600' : 'text-green-600'}`}>{testResult}</p>
        )}
      </div>

      {/* Switch provider */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <p className="text-sm font-semibold text-gray-700 mb-3">Switch Provider</p>
        <div className="grid grid-cols-2 gap-2">
          {EMAIL_PROVIDERS.filter(p => p.key !== activeKey).map(p => (
            <button key={p.key}
              onClick={() => setActiveKey(p.key)}
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
              <span className="text-xl">{p.logo}</span>
              <span className="text-sm text-gray-700 font-medium">{p.label}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">Switching providers here changes the active sender. Save after switching to apply.</p>
      </div>
    </div>
  )
}

// ── SmsSettings ───────────────────────────────────────────────────────────────
const SMS_PROVIDERS = [
  {
    key: 'twilio',
    label: 'Twilio',
    logo: '🟥',
    url: 'https://console.twilio.com',
    fields: [
      { key: 'account_sid',  label: 'Account SID',  type: 'text',     placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
      { key: 'auth_token',   label: 'Auth Token',   type: 'password', placeholder: '••••••••••••••••••••••••••••••••' },
      { key: 'from_number',  label: 'From Number',  type: 'text',     placeholder: '+15551234567' },
    ],
  },
  {
    key: 'telnyx',
    label: 'Telnyx',
    logo: '🟦',
    url: 'https://portal.telnyx.com',
    fields: [
      { key: 'api_key',      label: 'API Key',      type: 'password', placeholder: 'KEY••••••••••••••••••' },
      { key: 'from_number',  label: 'From Number',  type: 'text',     placeholder: '+15551234567' },
    ],
  },
  {
    key: 'vonage',
    label: 'Vonage (Nexmo)',
    logo: '🟪',
    url: 'https://dashboard.nexmo.com',
    fields: [
      { key: 'api_key',      label: 'API Key',      type: 'text',     placeholder: 'a1b2c3d4' },
      { key: 'api_secret',   label: 'API Secret',   type: 'password', placeholder: '••••••••••••••••' },
      { key: 'from_number',  label: 'From / Sender', type: 'text',    placeholder: '+15551234567 or MyBrand' },
    ],
  },
  {
    key: 'sinch',
    label: 'Sinch',
    logo: '🟧',
    url: 'https://dashboard.sinch.com',
    fields: [
      { key: 'service_plan_id', label: 'Service Plan ID', type: 'text',     placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
      { key: 'api_token',       label: 'API Token',       type: 'password', placeholder: '••••••••••••••••••••••••••••••••' },
      { key: 'from_number',     label: 'From Number',     type: 'text',     placeholder: '+15551234567' },
    ],
  },
  {
    key: 'messagebird',
    label: 'MessageBird',
    logo: '🐦',
    url: 'https://dashboard.messagebird.com',
    fields: [
      { key: 'api_key',      label: 'API Key',            type: 'password', placeholder: 'live_••••••••••••••••••••' },
      { key: 'from_number',  label: 'Originator (From)',  type: 'text',     placeholder: '+15551234567 or MyBrand' },
    ],
  },
  {
    key: 'simpletexting',
    label: 'SimpleTexting',
    logo: '💬',
    url: 'https://app.simpletexting.com',
    fields: [
      { key: 'api_key',      label: 'API Key',      type: 'password', placeholder: '••••••••••••••••••••••••••••••••' },
      { key: 'from_number',  label: 'From Number',  type: 'text',     placeholder: '+15551234567' },
    ],
  },
]

function SmsSettings() {
  const [config,        setConfig]        = useState(null)   // loaded from DB
  const [activeKey,     setActiveKey]     = useState('simpletexting')
  const [credentials,   setCredentials]   = useState({})     // { [providerKey]: { [field]: value } }
  const [testNumber,    setTestNumber]    = useState('')
  const [testMsg,       setTestMsg]       = useState('This is a test SMS from Picture Build System.')
  const [loading,       setLoading]       = useState(true)
  const [saving,        setSaving]        = useState(false)
  const [testing,       setTesting]       = useState(false)
  const [saveMsg,       setSaveMsg]       = useState('')
  const [testResult,    setTestResult]    = useState('')
  const [showSecrets,   setShowSecrets]   = useState({})     // { [providerKey+field]: bool }

  useEffect(() => { loadConfig() }, [])

  async function loadConfig() {
    setLoading(true)
    const { data } = await supabase.from('company_settings').select('sms_config').maybeSingle()
    if (data?.sms_config) {
      const cfg = data.sms_config
      setActiveKey(cfg.active_provider || 'twilio')
      setCredentials(cfg.providers || {})
    }
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true); setSaveMsg('')
    const cfg = { active_provider: activeKey, providers: credentials }
    const { data: existing } = await supabase.from('company_settings').select('id').maybeSingle()
    let error
    if (existing?.id) {
      ({ error } = await supabase.from('company_settings').update({ sms_config: cfg }).eq('id', existing.id))
    } else {
      ({ error } = await supabase.from('company_settings').insert({ sms_config: cfg }))
    }
    setSaving(false)
    setSaveMsg(error ? '⚠️ ' + error.message : '✓ SMS settings saved')
    setTimeout(() => setSaveMsg(''), 4000)
  }

  async function handleTest() {
    if (!testNumber.trim()) { setTestResult('⚠️ Enter a phone number first.'); return }
    setTesting(true); setTestResult('')
    try {
      const { sendSMS } = await import('../lib/notify')
      const { data, error } = await sendSMS({ to: testNumber.trim(), message: testMsg })
      if (error) {
        const raw  = data?.raw  ? ' raw:'  + JSON.stringify(data.raw)  : ''
        const sent = data?.sent ? ' sent:' + JSON.stringify(data.sent) : ''
        setTestResult('⚠️ ' + error.message + raw + sent)
      } else {
        setTestResult('✓ Test SMS sent! Check your phone.')
      }
    } catch (e) {
      setTestResult('⚠️ ' + e.message)
    }
    setTesting(false)
    setTimeout(() => setTestResult(''), 15000)
  }

  function setCred(providerKey, field, value) {
    setCredentials(prev => ({
      ...prev,
      [providerKey]: { ...(prev[providerKey] || {}), [field]: value },
    }))
  }

  function toggleShow(providerKey, field) {
    const k = providerKey + '_' + field
    setShowSecrets(prev => ({ ...prev, [k]: !prev[k] }))
  }

  const activeProvider = SMS_PROVIDERS.find(p => p.key === activeKey)
  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 bg-white font-mono'

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" /></div>

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Current provider banner */}
      <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-3 flex items-center gap-3">
        <span className="text-xl">{activeProvider?.logo}</span>
        <div>
          <p className="text-sm font-bold text-green-800">Active SMS Provider: {activeProvider?.label}</p>
          <p className="text-xs text-green-700">Messages are sent through this service. Save credentials below, then update your Edge Function to use them.</p>
        </div>
      </div>

      {/* Provider selector */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Select Provider</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SMS_PROVIDERS.map(p => (
            <button
              key={p.key}
              onClick={() => setActiveKey(p.key)}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                activeKey === p.key
                  ? 'border-green-600 bg-green-50 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <span className="text-lg leading-none">{p.logo}</span>
              <span className={`text-sm font-semibold ${activeKey === p.key ? 'text-green-800' : 'text-gray-700'}`}>
                {p.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Credential fields for active provider */}
      {activeProvider && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
              {activeProvider.logo} {activeProvider.label} Credentials
            </h3>
            <a href={activeProvider.url} target="_blank" rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-800 underline">
              Open Dashboard ↗
            </a>
          </div>
          {/* SimpleTexting-specific setup hint */}
          {activeProvider.key === 'simpletexting' && (
            <div className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 leading-relaxed">
              Find your <strong>API Key</strong> in SimpleTexting → Settings → API (top right).
              Your <strong>From Number</strong> is the 10-digit number on your account (e.g. <code>+15551234567</code>).
            </div>
          )}
          {activeProvider.fields.map(f => {
            const showKey = activeProvider.key + '_' + f.key
            const isSecret = f.type === 'password'
            const val = credentials[activeProvider.key]?.[f.key] || ''
            return (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  {f.label}
                </label>
                <div className="relative">
                  <input
                    type={isSecret && !showSecrets[showKey] ? 'password' : 'text'}
                    value={val}
                    onChange={e => setCred(activeProvider.key, f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className={inp}
                  />
                  {isSecret && (
                    <button
                      type="button"
                      onClick={() => toggleShow(activeProvider.key, f.key)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                    >
                      {showSecrets[showKey] ? 'Hide' : 'Show'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Credentials for other providers (collapsed) */}
      <details className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <summary className="px-5 py-3 text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-50 select-none">
          Configure other providers (stored, not active)
        </summary>
        <div className="px-5 pb-5 space-y-5 border-t border-gray-100 pt-4">
          {SMS_PROVIDERS.filter(p => p.key !== activeKey).map(p => (
            <div key={p.key}>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{p.logo} {p.label}</p>
              {p.fields.map(f => {
                const showKey = p.key + '_' + f.key
                const isSecret = f.type === 'password'
                const val = credentials[p.key]?.[f.key] || ''
                return (
                  <div key={f.key} className="mb-2">
                    <label className="block text-xs text-gray-400 mb-0.5">{f.label}</label>
                    <div className="relative">
                      <input
                        type={isSecret && !showSecrets[showKey] ? 'password' : 'text'}
                        value={val}
                        onChange={e => setCred(p.key, f.key, e.target.value)}
                        placeholder={f.placeholder}
                        className={inp + ' text-xs'}
                      />
                      {isSecret && (
                        <button type="button" onClick={() => toggleShow(p.key, f.key)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">
                          {showSecrets[showKey] ? 'Hide' : 'Show'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </details>

      {/* Save */}
      <div className="flex items-center gap-4">
        <button onClick={handleSave} disabled={saving}
          className="px-6 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-50"
          style={{ backgroundColor: FG }}>
          {saving ? 'Saving…' : 'Save SMS Settings'}
        </button>
        {saveMsg && (
          <span className={`text-sm font-medium ${saveMsg.startsWith('⚠️') ? 'text-red-600' : 'text-green-700'}`}>
            {saveMsg}
          </span>
        )}
      </div>

      {/* Test SMS */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Test SMS</h3>
        <p className="text-xs text-gray-400">
          Sends a real SMS via the <strong>send-sms</strong> Edge Function (currently wired to Twilio).
          To activate a different provider, update the Edge Function to read <code className="bg-gray-100 px-1 rounded">sms_config</code> from company settings.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">To Phone Number</label>
            <input type="tel" value={testNumber} onChange={e => setTestNumber(e.target.value)}
              placeholder="+15551234567"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 font-mono" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Message</label>
            <input type="text" value={testMsg} onChange={e => setTestMsg(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={handleTest} disabled={testing}
            className="px-5 py-2 rounded-lg text-sm font-bold border border-green-700 text-green-800 hover:bg-green-50 disabled:opacity-50">
            {testing ? 'Sending…' : '📱 Send Test SMS'}
          </button>
          {testResult && (
            <span className={`text-sm font-medium ${testResult.startsWith('⚠️') ? 'text-red-600' : 'text-green-700'}`}>
              {testResult}
            </span>
          )}
        </div>
      </div>

      {/* Edge Function note */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800 space-y-1.5">
        <p className="font-bold">📋 To activate a new provider in production:</p>
        <ol className="list-decimal list-inside space-y-1 text-xs text-amber-700">
          <li>Save credentials above</li>
          <li>Open your Supabase project → Edge Functions → <code className="bg-amber-100 px-1 rounded">send-sms</code></li>
          <li>Update the function to read <code className="bg-amber-100 px-1 rounded">sms_config</code> from <code className="bg-amber-100 px-1 rounded">company_settings</code> and route to the active provider's API</li>
          <li>Redeploy the function</li>
        </ol>
      </div>

    </div>
  )
}

// ── IntegrationsSettings ───────────────────────────────────────────────────────
function IntegrationsSettings() {
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [saveMsg,  setSaveMsg]  = useState('')
  const [activeTab, setActiveTab] = useState('qbo') // 'qbo' | 'qbd' | 'ghl'

  // QuickBooks Online
  const [qbo, setQbo] = useState({
    enabled:       false,
    environment:   'sandbox',
    client_id:     '',
    client_secret: '',
    realm_id:      '',
    oauth_status:  'not_connected',
  })

  // QuickBooks Desktop
  const [qbd, setQbd] = useState({
    enabled:         false,
    connector_url:   '',
    username:        '',
    password:        '',
    company_file:    '',
  })

  // GoHighLevel — separate from QBO/QBD because it lives in its own
  // tables (ghl_connections, ghl_sync_state) and is gated by an admin
  // role check on the server side.
  const [ghl, setGhl] = useState({
    connected:    false,
    location_id:  '',
    company_id:   '',
    contacts_enabled:      true,
    opportunities_enabled: true,
    appointments_enabled:  true,
    notes_enabled:         true,
  })
  // The Private Integration Token is never read back from the server
  // for security; user re-enters it only when they want to (re)connect.
  const [ghlToken,    setGhlToken]    = useState('')
  const [ghlLocation, setGhlLocation] = useState('')
  const [ghlBusy,     setGhlBusy]     = useState(false)
  const [ghlMsg,      setGhlMsg]      = useState('')
  const [ghlMsgError, setGhlMsgError] = useState(false)
  const [ghlSyncState, setGhlSyncState] = useState([])  // rows from ghl_sync_state

  const [showSecrets, setShowSecrets] = useState({}) // { field: bool }

  useEffect(() => { loadConfig() }, [])

  async function loadConfig() {
    setLoading(true)
    const { data } = await supabase.from('company_settings').select('integrations_config').maybeSingle()
    if (data?.integrations_config) {
      const cfg = data.integrations_config
      if (cfg.qbo) setQbo(q => ({ ...q, ...cfg.qbo }))
      if (cfg.qbd) setQbd(q => ({ ...q, ...cfg.qbd }))
    }
    setLoading(false)
  }

  // Load GHL connection metadata + sync state. Note: we do NOT fetch
  // the access_token — the column is admin-only and the token never
  // round-trips through the browser after the initial save.
  useEffect(() => { loadGhl() }, [])
  async function loadGhl() {
    const [{ data: conn }, { data: syncRows }] = await Promise.all([
      supabase.from('ghl_connections')
        .select('location_id, company_id, contacts_enabled, opportunities_enabled, appointments_enabled, notes_enabled, created_at')
        .maybeSingle(),
      supabase.from('ghl_sync_state').select('*'),
    ])
    if (conn) {
      setGhl({
        connected:             true,
        location_id:           conn.location_id || '',
        company_id:            conn.company_id  || '',
        contacts_enabled:      !!conn.contacts_enabled,
        opportunities_enabled: !!conn.opportunities_enabled,
        appointments_enabled:  !!conn.appointments_enabled,
        notes_enabled:         !!conn.notes_enabled,
      })
      setGhlLocation(conn.location_id || '')
    }
    setGhlSyncState(syncRows || [])
  }

  // Save the per-object enabled flags directly (these aren't secret).
  async function saveGhlToggles(next) {
    setGhl(g => ({ ...g, ...next }))
    await supabase.from('ghl_connections').update(next).eq('singleton', true)
  }

  // Test the pasted token + location_id and save the connection on success.
  async function connectGhl() {
    if (!ghlToken.trim() || !ghlLocation.trim()) {
      setGhlMsgError(true); setGhlMsg('Token and Location ID are both required.')
      return
    }
    setGhlBusy(true); setGhlMsg(''); setGhlMsgError(false)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const jwt = session?.access_token
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ghl-test-connection`,
        {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${jwt}`,
          },
          body: JSON.stringify({
            access_token: ghlToken.trim(),
            location_id:  ghlLocation.trim(),
            save:         true,
          }),
        }
      )
      const body = await res.json()
      if (!res.ok || !body.ok) {
        setGhlMsgError(true)
        setGhlMsg(body.message || body.error || `HTTP ${res.status}`)
      } else {
        setGhlMsgError(false)
        setGhlMsg(`✓ Connected to ${body.location?.name || 'GHL'}.`)
        setGhlToken('') // never keep the token in component state after save
        await loadGhl()
      }
    } catch (e) {
      setGhlMsgError(true); setGhlMsg(e?.message || 'Connection failed.')
    } finally {
      setGhlBusy(false)
    }
  }

  async function disconnectGhl() {
    if (!confirm('Disconnect GoHighLevel? Sync will stop. Local data is preserved.')) return
    await supabase.from('ghl_connections').delete().eq('singleton', true)
    setGhl(g => ({ ...g, connected: false, location_id: '', company_id: '' }))
    setGhlMsg('Disconnected.'); setGhlMsgError(false)
    setGhlLocation('')
  }

  async function handleSave() {
    setSaving(true); setSaveMsg('')
    const cfg = { qbo, qbd }
    const { data: existing } = await supabase.from('company_settings').select('id').maybeSingle()
    let error
    if (existing?.id) {
      ;({ error } = await supabase.from('company_settings').update({ integrations_config: cfg }).eq('id', existing.id))
    } else {
      ;({ error } = await supabase.from('company_settings').insert({ integrations_config: cfg }))
    }
    setSaving(false)
    setSaveMsg(error ? '⚠️ ' + error.message : '✓ Integration settings saved')
    setTimeout(() => setSaveMsg(''), 4000)
  }

  const toggleSecret = (k) => setShowSecrets(s => ({ ...s, [k]: !s[k] }))
  const secretInput = (val, onChange, field, placeholder) => (
    <div className="relative">
      <input
        type={showSecrets[field] ? 'text' : 'password'}
        value={val}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm pr-16 focus:outline-none focus:ring-2 focus:ring-green-600"
      />
      <button type="button" onClick={() => toggleSecret(field)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-700 font-medium">
        {showSecrets[field] ? 'Hide' : 'Show'}
      </button>
    </div>
  )

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-700"></div>
    </div>
  )

  const tabBtnCls = (k) => `px-5 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
    activeTab === k ? 'border-green-700 text-green-800' : 'border-transparent text-gray-500 hover:text-gray-800'
  }`

  const lbl = 'block text-xs font-semibold text-gray-600 mb-1'
  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600'

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900">Integrations</h2>
        <p className="text-sm text-gray-500 mt-0.5">Connect external apps. Configuration only — actual sync will be enabled in a future release.</p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        <button className={tabBtnCls('qbo')} onClick={() => setActiveTab('qbo')}>
          QuickBooks Online
        </button>
        <button className={tabBtnCls('qbd')} onClick={() => setActiveTab('qbd')}>
          QuickBooks Desktop
        </button>
        <button className={tabBtnCls('ghl')} onClick={() => setActiveTab('ghl')}>
          GoHighLevel
        </button>
      </div>

      {/* ── QuickBooks Online ── */}
      {activeTab === 'qbo' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div>
              <p className="text-sm font-semibold text-gray-800">Enable QuickBooks Online</p>
              <p className="text-xs text-gray-500 mt-0.5">Connect via OAuth 2.0 to sync jobs, invoices, and payments.</p>
            </div>
            <button type="button"
              onClick={() => setQbo(q => ({ ...q, enabled: !q.enabled }))}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                qbo.enabled ? 'bg-green-600' : 'bg-gray-300'
              }`}>
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                qbo.enabled ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* OAuth status badge */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              qbo.oauth_status === 'connected'
                ? 'bg-green-100 text-green-800'
                : 'bg-amber-100 text-amber-800'
            }`}>
              {qbo.oauth_status === 'connected' ? '● Connected' : '○ Not Connected'}
            </span>
            <span className="text-xs text-gray-500">
              {qbo.oauth_status === 'connected'
                ? 'OAuth token is active. Sync is authorized.'
                : 'OAuth not yet authorized. Enter credentials below and complete OAuth flow.'}
            </span>
          </div>

          <div>
            <label className={lbl}>Environment</label>
            <select value={qbo.environment} onChange={e => setQbo(q => ({ ...q, environment: e.target.value }))} className={inp}>
              <option value="sandbox">Sandbox (Testing)</option>
              <option value="production">Production</option>
            </select>
          </div>

          <div>
            <label className={lbl}>Client ID</label>
            <input type="text" value={qbo.client_id}
              onChange={e => setQbo(q => ({ ...q, client_id: e.target.value }))}
              placeholder="From your Intuit Developer app"
              className={inp} />
          </div>

          <div>
            <label className={lbl}>Client Secret</label>
            {secretInput(
              qbo.client_secret,
              e => setQbo(q => ({ ...q, client_secret: e.target.value })),
              'qbo_secret',
              'From your Intuit Developer app'
            )}
          </div>

          <div>
            <label className={lbl}>Realm ID (Company ID)</label>
            <input type="text" value={qbo.realm_id}
              onChange={e => setQbo(q => ({ ...q, realm_id: e.target.value }))}
              placeholder="Found in QuickBooks Online URL after login"
              className={inp} />
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 space-y-1">
            <p className="font-semibold">How to get your credentials:</p>
            <ol className="list-decimal list-inside space-y-0.5 text-blue-700">
              <li>Go to <a href="https://developer.intuit.com" target="_blank" rel="noopener noreferrer" className="underline">developer.intuit.com</a> and sign in</li>
              <li>Create an app → select "Accounting" scope</li>
              <li>Copy the Client ID and Client Secret from "Keys & credentials"</li>
              <li>Your Realm ID appears in your QBO URL: quickbooks.intuit.com/app/qbo?&realmid=<strong>XXXXXXXXX</strong></li>
            </ol>
          </div>
        </div>
      )}

      {/* ── QuickBooks Desktop ── */}
      {activeTab === 'qbd' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div>
              <p className="text-sm font-semibold text-gray-800">Enable QuickBooks Desktop</p>
              <p className="text-xs text-gray-500 mt-0.5">Connect via QuickBooks Web Connector (QBWC) to sync with a local QB file.</p>
            </div>
            <button type="button"
              onClick={() => setQbd(q => ({ ...q, enabled: !q.enabled }))}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                qbd.enabled ? 'bg-green-600' : 'bg-gray-300'
              }`}>
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                qbd.enabled ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          <div>
            <label className={lbl}>Web Connector Endpoint URL</label>
            <input type="url" value={qbd.connector_url}
              onChange={e => setQbd(q => ({ ...q, connector_url: e.target.value }))}
              placeholder="https://yourdomain.com/qbwc"
              className={inp} />
          </div>

          <div>
            <label className={lbl}>Web Connector Username</label>
            <input type="text" value={qbd.username}
              onChange={e => setQbd(q => ({ ...q, username: e.target.value }))}
              placeholder="Username configured in QBWC"
              className={inp} />
          </div>

          <div>
            <label className={lbl}>Web Connector Password</label>
            {secretInput(
              qbd.password,
              e => setQbd(q => ({ ...q, password: e.target.value })),
              'qbd_password',
              'Password configured in QBWC'
            )}
          </div>

          <div>
            <label className={lbl}>Company File Path (optional)</label>
            <input type="text" value={qbd.company_file}
              onChange={e => setQbd(q => ({ ...q, company_file: e.target.value }))}
              placeholder="C:\Users\...\Company.qbw"
              className={inp} />
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 space-y-1">
            <p className="font-semibold">Setup instructions:</p>
            <ol className="list-decimal list-inside space-y-0.5 text-blue-700">
              <li>Download and install the QuickBooks Web Connector on the computer running QB Desktop</li>
              <li>Enter the endpoint URL above (provided by your Picture Build server admin)</li>
              <li>Open QBWC, add a new application, and paste this URL</li>
              <li>Enter the username and password configured here</li>
              <li>Open your QB Desktop company file and authorize the connection</li>
            </ol>
          </div>
        </div>
      )}

      {/* ── GoHighLevel ── */}
      {activeTab === 'ghl' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div>
              <p className="text-sm font-semibold text-gray-800">GoHighLevel Connection</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Two-way sync of contacts, opportunities, appointments, and notes.
                Uses a Private Integration Token — generate one in GHL under
                <em> Settings → Private Integrations</em>.
              </p>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
              ghl.connected
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'bg-gray-100 text-gray-500 border border-gray-300'
            }`}>
              {ghl.connected ? 'Connected' : 'Not connected'}
            </span>
          </div>

          <div>
            <label className={lbl}>Private Integration Token</label>
            {secretInput(
              ghlToken,
              e => setGhlToken(e.target.value),
              'ghl_token',
              ghl.connected ? '••• saved … paste a new token to replace' : 'pit-xxxxxxxxxxxxxxxx',
            )}
            <p className="text-[11px] text-gray-400 mt-1">
              The token is verified against GHL before saving and never echoed back to the browser.
            </p>
          </div>

          <div>
            <label className={lbl}>Location ID</label>
            <input type="text" value={ghlLocation}
              onChange={e => setGhlLocation(e.target.value)}
              placeholder="e.g. abc1234DefGhi5678JKL"
              className={inp} />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button type="button" onClick={connectGhl} disabled={ghlBusy}
              className="px-5 py-2 text-sm font-bold text-white rounded-lg disabled:opacity-50"
              style={{ backgroundColor: FG }}>
              {ghlBusy ? 'Testing…' : (ghl.connected ? 'Replace Connection' : 'Test & Save Connection')}
            </button>
            {ghl.connected && (
              <button type="button" onClick={disconnectGhl}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50">
                Disconnect
              </button>
            )}
            {ghlMsg && (
              <span className={`text-sm font-medium ${ghlMsgError ? 'text-red-600' : 'text-green-700'}`}>
                {ghlMsg}
              </span>
            )}
          </div>

          {/* Per-object sync toggles — only meaningful while connected */}
          {ghl.connected && (
            <div className="mt-4 p-4 bg-white border border-gray-200 rounded-xl space-y-3">
              <p className="text-sm font-semibold text-gray-800">What to sync</p>
              {[
                ['contacts_enabled',      'Contacts',     'contacts'],
                ['opportunities_enabled', 'Opportunities','opportunities'],
                ['appointments_enabled',  'Appointments', 'appointments'],
                ['notes_enabled',         'Notes',        'notes'],
              ].map(([key, label, objType]) => {
                const state = ghlSyncState.find(s => s.object_type === objType)
                return (
                  <div key={key} className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-800">{label}</p>
                      <p className="text-[11px] text-gray-400">
                        Last run: {state?.last_run_at ? new Date(state.last_run_at).toLocaleString() : 'never'}
                        {state?.last_run_status && ` · ${state.last_run_status}`}
                      </p>
                    </div>
                    <button type="button"
                      onClick={() => saveGhlToggles({ [key]: !ghl[key] })}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                        ghl[key] ? 'bg-green-600' : 'bg-gray-300'
                      }`}>
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        ghl[key] ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                )
              })}
              <p className="text-[11px] text-gray-400 pt-1">
                Sync runs on a schedule (Phase 7). Manual “Sync now” buttons land in a later phase.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Save */}
      <div className="mt-6 flex items-center gap-4">
        <button onClick={handleSave} disabled={saving}
          className="px-6 py-2.5 text-sm font-bold text-white rounded-lg disabled:opacity-50 transition-colors"
          style={{ backgroundColor: FG }}>
          {saving ? 'Saving…' : 'Save Integration Settings'}
        </button>
        {saveMsg && (
          <span className={`text-sm font-medium ${saveMsg.startsWith('⚠️') ? 'text-red-600' : 'text-green-700'}`}>
            {saveMsg}
          </span>
        )}
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

  const [currentUserRole, setCurrentUserRole] = useState('user')

  // ── Fetch on mount ─────────────────────────────────────────────────────────
  useEffect(() => { fetchOverview() }, [])

  // Track current user's full role
  useEffect(() => {
    if (!user?.id) return
    supabase.from('profiles').select('role').eq('id', user.id).single()
      .then(({ data }) => { if (data) setCurrentUserRole(data.role || 'user') })
  }, [user?.id])

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

  // ── Tabs ───────────────────────────────────────────────────────────────────
  const currentUserIsAdmin = currentUserRole === 'admin' || currentUserRole === 'super_admin'

  const tabs = [
    { key: 'overview',      label: 'Overview' },
    { key: 'settings',      label: 'Company Settings' },
    { key: 'sms',           label: '📱 SMS Settings' },
    { key: 'email',         label: '✉️ Email Settings' },
    { key: 'integrations',  label: '🔗 Integrations' },
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

      {/* ── SETTINGS TAB ──────────────────────────────────────────────────── */}
      {tab === 'settings' && (
        <CompanySettings currentUserIsAdmin={currentUserIsAdmin} />
      )}

      {tab === 'sms' && (
        <SmsSettings />
      )}

      {tab === 'email' && (
        <EmailSettings />
      )}

      {tab === 'integrations' && (
        <IntegrationsSettings />
      )}

    </div>
  )
}
