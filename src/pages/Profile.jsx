import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
]

export default function Profile() {
  const { user } = useAuth()
  const fileInputRef = useRef(null)

  // ── Profile data ─────────────────────────────────────────────────────────────
  const [profile,        setProfile]        = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  // ── Avatar ───────────────────────────────────────────────────────────────────
  const [avatarPreview,  setAvatarPreview]  = useState(null)   // local blob URL
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoMsg,       setPhotoMsg]       = useState(null)

  // ── Name ─────────────────────────────────────────────────────────────────────
  const [editingName, setEditingName] = useState(false)
  const [nameValue,   setNameValue]   = useState('')
  const [savingName,  setSavingName]  = useState(false)
  const [nameMsg,     setNameMsg]     = useState(null)

  // ── Phone ─────────────────────────────────────────────────────────────────────
  const [phoneCell,   setPhoneCell]   = useState('')
  const [savingPhone, setSavingPhone] = useState(false)
  const [phoneMsg,    setPhoneMsg]    = useState(null)

  // ── Address ──────────────────────────────────────────────────────────────────
  const [addr, setAddr] = useState({
    address_line1: '', address_line2: '', city: '', state: '', zip_code: '',
  })
  const [savingAddr, setSavingAddr] = useState(false)
  const [addrMsg,    setAddrMsg]    = useState(null)

  // ── Password ─────────────────────────────────────────────────────────────────
  const [showPwForm,  setShowPwForm]  = useState(false)
  const [currentPw,   setCurrentPw]  = useState('')
  const [newPw,       setNewPw]      = useState('')
  const [confirmPw,   setConfirmPw]  = useState('')
  const [showCurrent, setShowCurrent]= useState(false)
  const [showNew,     setShowNew]    = useState(false)
  const [showConfirm, setShowConfirm]= useState(false)
  const [savingPw,    setSavingPw]   = useState(false)
  const [pwMsg,       setPwMsg]      = useState(null)

  useEffect(() => {
    if (!user?.id) return
    loadProfile()
  }, [user?.id])

  async function loadProfile() {
    setLoadingProfile(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    const p = data || {}
    setProfile(p)
    setNameValue(p.full_name || p.name || '')
    setPhoneCell(p.phone_cell || '')
    setAddr({
      address_line1: p.address_line1 || '',
      address_line2: p.address_line2 || '',
      city:          p.city          || '',
      state:         p.state         || '',
      zip_code:      p.zip_code      || '',
    })
    setLoadingProfile(false)
  }

  // ── Photo upload ──────────────────────────────────────────────────────────────
  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setPhotoMsg({ type: 'error', text: 'Please select an image file.' })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoMsg({ type: 'error', text: 'Image must be under 5 MB.' })
      return
    }
    const preview = URL.createObjectURL(file)
    setAvatarPreview(preview)
    uploadPhoto(file)
  }

  async function uploadPhoto(file) {
    setUploadingPhoto(true)
    setPhotoMsg(null)

    const ext  = file.name.split('.').pop()
    const path = `${user.id}/avatar.${ext}`

    const { error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadErr) {
      setPhotoMsg({ type: 'error', text: 'Upload failed: ' + uploadErr.message })
      setUploadingPhoto(false)
      return
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
    const publicUrl = urlData.publicUrl + '?t=' + Date.now()   // bust cache

    const { error: dbErr } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id)

    if (dbErr) {
      setPhotoMsg({ type: 'error', text: 'Saved image but could not update profile: ' + dbErr.message })
    } else {
      setProfile(p => ({ ...p, avatar_url: publicUrl }))
      setPhotoMsg({ type: 'success', text: 'Photo updated!' })
      setTimeout(() => setPhotoMsg(null), 3000)
      // Broadcast so Layout re-fetches
      window.dispatchEvent(new Event('profile-updated'))
    }
    setUploadingPhoto(false)
  }

  async function removePhoto() {
    setUploadingPhoto(true)
    await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id)
    setProfile(p => ({ ...p, avatar_url: null }))
    setAvatarPreview(null)
    setPhotoMsg({ type: 'success', text: 'Photo removed.' })
    setTimeout(() => setPhotoMsg(null), 3000)
    window.dispatchEvent(new Event('profile-updated'))
    setUploadingPhoto(false)
  }

  // ── Save name ─────────────────────────────────────────────────────────────────
  async function handleSaveName() {
    setSavingName(true); setNameMsg(null)
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: nameValue.trim() })
      .eq('id', user.id)
    if (error) {
      setNameMsg({ type: 'error', text: 'Could not save name: ' + error.message })
    } else {
      setProfile(p => ({ ...p, full_name: nameValue.trim() }))
      setEditingName(false)
      setNameMsg({ type: 'success', text: 'Name updated.' })
      setTimeout(() => setNameMsg(null), 3000)
    }
    setSavingName(false)
  }

  // ── Save phone ────────────────────────────────────────────────────────────────
  async function handleSavePhone() {
    setSavingPhone(true); setPhoneMsg(null)
    const { error } = await supabase
      .from('profiles')
      .update({ phone_cell: phoneCell.trim() || null })
      .eq('id', user.id)
    if (error) {
      setPhoneMsg({ type: 'error', text: 'Could not save phone: ' + error.message })
    } else {
      setProfile(p => ({ ...p, phone_cell: phoneCell.trim() || null }))
      setPhoneMsg({ type: 'success', text: 'Phone number saved.' })
      setTimeout(() => setPhoneMsg(null), 3000)
    }
    setSavingPhone(false)
  }

  // ── Save address ──────────────────────────────────────────────────────────────
  async function handleSaveAddress() {
    setSavingAddr(true); setAddrMsg(null)
    const { error } = await supabase
      .from('profiles')
      .update(addr)
      .eq('id', user.id)
    if (error) {
      setAddrMsg({ type: 'error', text: 'Could not save address: ' + error.message })
    } else {
      setProfile(p => ({ ...p, ...addr }))
      setAddrMsg({ type: 'success', text: 'Address saved.' })
      setTimeout(() => setAddrMsg(null), 3000)
    }
    setSavingAddr(false)
  }

  // ── Change password ───────────────────────────────────────────────────────────
  async function handleChangePassword(e) {
    e.preventDefault(); setPwMsg(null)
    if (!currentPw)        { setPwMsg({ type: 'error', text: 'Please enter your current password.' }); return }
    if (newPw.length < 8)  { setPwMsg({ type: 'error', text: 'New password must be at least 8 characters.' }); return }
    if (newPw !== confirmPw){ setPwMsg({ type: 'error', text: 'New passwords do not match.' }); return }
    setSavingPw(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email, password: currentPw,
    })
    if (signInError) {
      setPwMsg({ type: 'error', text: 'Current password is incorrect.' })
      setSavingPw(false); return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPw })
    if (updateError) {
      setPwMsg({ type: 'error', text: 'Could not update password: ' + updateError.message })
    } else {
      setPwMsg({ type: 'success', text: 'Password changed successfully!' })
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
      setTimeout(() => { setPwMsg(null); setShowPwForm(false) }, 3000)
    }
    setSavingPw(false)
  }

  function cancelPassword() {
    setShowPwForm(false); setCurrentPw(''); setNewPw(''); setConfirmPw(''); setPwMsg(null)
  }

  const currentAvatar = avatarPreview || profile?.avatar_url
  const displayName   = profile?.full_name || profile?.name || '—'
  const initials      = (profile?.full_name || user?.email || 'U')[0].toUpperCase()

  const inputCls = 'input w-full'
  const Msg = ({ m }) => m ? (
    <p className={`text-sm mt-2 ${m.type === 'success' ? 'text-green-700' : 'text-red-600'}`}>{m.text}</p>
  ) : null

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your account details</p>
        </div>
      </div>

      {loadingProfile ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-700"></div>
        </div>
      ) : (
        <div className="max-w-lg space-y-4">

          {/* ── Photo ───────────────────────────────────────────────────────── */}
          <div className="card">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-3">Profile Photo</p>
            <div className="flex items-center gap-4">
              {/* Avatar circle */}
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-100 flex items-center justify-center">
                  {currentAvatar ? (
                    <img src={currentAvatar} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-white"
                      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)', color: '#3A5038' }}>
                      {initials}
                    </span>
                  )}
                </div>
                {uploadingPhoto && (
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                  </div>
                )}
              </div>

              {/* Upload controls */}
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="btn-primary text-sm px-3 py-1.5 disabled:opacity-50"
                  >
                    {uploadingPhoto ? 'Uploading…' : currentAvatar ? 'Change Photo' : 'Upload Photo'}
                  </button>
                  {currentAvatar && !uploadingPhoto && (
                    <button
                      onClick={removePhoto}
                      className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-2">JPG, PNG, or GIF · Max 5 MB</p>
                <Msg m={photoMsg} />
              </div>
            </div>
          </div>

          {/* ── Full Name ────────────────────────────────────────────────────── */}
          <div className="card">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-3">Full Name</p>
            {editingName ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={nameValue}
                  onChange={e => setNameValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false) }}
                  placeholder="Your full name"
                  autoFocus
                  className={inputCls}
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveName}
                    disabled={savingName || !nameValue.trim()}
                    className="btn-primary text-sm px-3 py-1.5 disabled:opacity-50"
                  >
                    {savingName ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => { setEditingName(false); setNameValue(profile?.full_name || '') }}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-base font-medium text-gray-900">{displayName}</span>
                <button onClick={() => setEditingName(true)} className="text-sm text-green-700 hover:text-green-800 font-medium">
                  Edit
                </button>
              </div>
            )}
            <Msg m={nameMsg} />
          </div>

          {/* ── Email ────────────────────────────────────────────────────────── */}
          <div className="card">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-3">Email Address</p>
            <p className="text-base font-medium text-gray-900">{user?.email}</p>
            <p className="text-xs text-gray-400 mt-1">Contact your administrator to change your email.</p>
          </div>

          {/* ── Phone ───────────────────────────────────────────────────────── */}
          <div className="card">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-3">Cell Phone <span className="normal-case font-normal text-gray-400">(for texting)</span></p>
            <div className="flex items-center gap-2">
              <input
                type="tel"
                value={phoneCell}
                onChange={e => setPhoneCell(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSavePhone()}
                placeholder="(555) 867-5309"
                className={inputCls}
              />
              <button
                onClick={handleSavePhone}
                disabled={savingPhone}
                className="btn-primary text-sm px-3 py-1.5 disabled:opacity-50 flex-shrink-0"
              >
                {savingPhone ? 'Saving…' : 'Save'}
              </button>
            </div>
            <Msg m={phoneMsg} />
          </div>

          {/* ── Address ──────────────────────────────────────────────────────── */}
          <div className="card">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-3">Address</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Address Line 1</label>
                <input
                  type="text"
                  value={addr.address_line1}
                  onChange={e => setAddr(a => ({ ...a, address_line1: e.target.value }))}
                  placeholder="123 Main St"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Address Line 2</label>
                <input
                  type="text"
                  value={addr.address_line2}
                  onChange={e => setAddr(a => ({ ...a, address_line2: e.target.value }))}
                  placeholder="Apt, suite, unit, etc. (optional)"
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs text-gray-500 mb-1">City</label>
                  <input
                    type="text"
                    value={addr.city}
                    onChange={e => setAddr(a => ({ ...a, city: e.target.value }))}
                    placeholder="City"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">State</label>
                  <select
                    value={addr.state}
                    onChange={e => setAddr(a => ({ ...a, state: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="">—</option>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Zip Code</label>
                  <input
                    type="text"
                    value={addr.zip_code}
                    onChange={e => setAddr(a => ({ ...a, zip_code: e.target.value }))}
                    placeholder="12345"
                    className={inputCls}
                    maxLength={10}
                  />
                </div>
              </div>

              <Msg m={addrMsg} />

              <button
                onClick={handleSaveAddress}
                disabled={savingAddr}
                className="btn-primary text-sm px-3 py-1.5 disabled:opacity-50"
              >
                {savingAddr ? 'Saving…' : 'Save Address'}
              </button>
            </div>
          </div>

          {/* ── Password ─────────────────────────────────────────────────────── */}
          <div className="card">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-3">Password</p>
            {!showPwForm ? (
              <div className="flex items-center justify-between">
                <span className="text-base font-medium text-gray-900 tracking-widest">••••••••</span>
                <button onClick={() => setShowPwForm(true)} className="text-sm text-green-700 hover:text-green-800 font-medium">
                  Change Password
                </button>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-3">
                {/* Current password */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Current Password</label>
                  <div className="relative">
                    <input type={showCurrent ? 'text' : 'password'} value={currentPw}
                      onChange={e => setCurrentPw(e.target.value)}
                      placeholder="Enter current password" autoFocus className={inputCls + ' pr-10'} />
                    <button type="button" onClick={() => setShowCurrent(v => !v)} tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
                      {showCurrent ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                {/* New password */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">New Password</label>
                  <div className="relative">
                    <input type={showNew ? 'text' : 'password'} value={newPw}
                      onChange={e => setNewPw(e.target.value)}
                      placeholder="At least 8 characters" className={inputCls + ' pr-10'} />
                    <button type="button" onClick={() => setShowNew(v => !v)} tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
                      {showNew ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                {/* Confirm */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Confirm New Password</label>
                  <div className="relative">
                    <input type={showConfirm ? 'text' : 'password'} value={confirmPw}
                      onChange={e => setConfirmPw(e.target.value)}
                      placeholder="Repeat new password" className={inputCls + ' pr-10'} />
                    <button type="button" onClick={() => setShowConfirm(v => !v)} tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
                      {showConfirm ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                <Msg m={pwMsg} />
                <div className="flex items-center gap-2 pt-1">
                  <button type="submit" disabled={savingPw}
                    className="btn-primary text-sm px-3 py-1.5 disabled:opacity-50">
                    {savingPw ? 'Saving…' : 'Update Password'}
                  </button>
                  <button type="button" onClick={cancelPassword} className="text-sm text-gray-500 hover:text-gray-700">
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
