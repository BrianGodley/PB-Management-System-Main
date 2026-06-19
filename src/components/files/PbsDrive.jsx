// src/components/files/PbsDrive.jsx
//
// Google-Drive-style "PBS Drives": community shared drives with per-user
// permissions. Left rail lists the drives the user can access; the main panel
// is the FileManager scoped to that drive's storage prefix (drives/<id>/...).
// Admins get a Settings view to create/rename/delete drives and manage member
// permissions (with an email invite).
//
// Requires the supabase-pbs-drives.sql migration (pbs_drives + pbs_drive_members).
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { sendEmail } from '../../lib/notify'
import { useDriveLabel } from '../../lib/useDriveLabel'
import FileManager from './FileManager'

const PERMISSIONS = [
  { id: 'viewer', label: 'Viewer (read only)' },
  { id: 'editor', label: 'Editor (upload, edit, delete)' },
  { id: 'manager', label: 'Manager (also manage members)' },
]

export default function PbsDrive({ settingsOnly = false }) {
  const { user } = useAuth()
  const driveLabel = useDriveLabel()
  const [isAdmin, setIsAdmin] = useState(false)
  const [drives, setDrives] = useState([])
  const [myPerms, setMyPerms] = useState({}) // driveId -> permission
  const [view, setView] = useState(null) // driveId | 'settings'
  const [loading, setLoading] = useState(true)

  const loadDrives = useCallback(async () => {
    setLoading(true)
    const [{ data: prof }, { data: dr }, { data: mem }] = await Promise.all([
      supabase.from('profiles').select('role').eq('id', user?.id).maybeSingle(),
      supabase.from('pbs_drives').select('*').order('name'),
      supabase.from('pbs_drive_members').select('drive_id, permission').eq('user_id', user?.id),
    ])
    const admin = prof?.role === 'admin' || prof?.role === 'super_admin'
    setIsAdmin(admin)
    setDrives(dr || [])
    const pm = {}
    ;(mem || []).forEach(m => {
      pm[m.drive_id] = m.permission
    })
    setMyPerms(pm)
    setView(v => v || 'mydrive') // everyone starts on their personal My Drive
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    if (user?.id) loadDrives()
  }, [user?.id, loadDrives])

  const canEditDrive = id => isAdmin || ['editor', 'manager'].includes(myPerms[id])
  const activeDrive = drives.find(d => d.id === view)

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-7 w-7 animate-spin rounded-full border-b-2 border-green-700" />
      </div>
    )
  }

  // Standalone settings (rendered as the Documents → Settings tab).
  if (settingsOnly) {
    if (!isAdmin) {
      return (
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-6 text-sm text-gray-500">
          {driveLabel} settings are available to admins only.
        </div>
      )
    }
    return (
      <div className="w-full">
        <PbsDriveSettings drives={drives} onChange={loadDrives} />
      </div>
    )
  }

  return (
    <div className="flex gap-3 h-full min-h-0">
      {/* Drives rail */}
      <div className="w-[232px] flex-shrink-0 bg-white border border-gray-200 rounded-xl p-2 overflow-y-auto flex flex-col">
        {/* Personal drive — always available to every user */}
        <button
          onClick={() => setView('mydrive')}
          className={`w-full text-left text-sm px-2 py-1.5 rounded-lg truncate mb-1 ${
            view === 'mydrive' ? 'bg-green-50 text-green-800 font-semibold' : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          🏠 My Drive
        </button>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide px-2 py-1">Shared Drives</p>
        {drives.length === 0 && (
          <p className="px-2 py-3 text-xs text-gray-400">
            {isAdmin ? 'No drives yet — create one in Settings.' : 'You have no drives yet.'}
          </p>
        )}
        {drives.map(d => (
          <button
            key={d.id}
            onClick={() => setView(d.id)}
            className={`w-full text-left text-sm px-2 py-1.5 rounded-lg truncate ${
              view === d.id ? 'bg-green-50 text-green-800 font-semibold' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            👥 {d.name}
          </button>
        ))}
        {isAdmin && (
          <button
            onClick={() => setView('settings')}
            className={`mt-auto w-full text-left text-sm px-2 py-1.5 rounded-lg ${
              view === 'settings' ? 'bg-green-50 text-green-800 font-semibold' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            ⚙️ Settings
          </button>
        )}
      </div>

      {/* Main panel */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {view === 'mydrive' ? (
          <FileManager
            root={`mydrive/${user.id}`}
            rootLabel="My Drive"
            canEdit={true}
          />
        ) : view === 'settings' && isAdmin ? (
          <PbsDriveSettings drives={drives} onChange={loadDrives} />
        ) : activeDrive ? (
          <FileManager
            root={`drives/${activeDrive.id}`}
            rootLabel={activeDrive.name}
            canEdit={canEditDrive(activeDrive.id)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-sm">Select a drive on the left.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Admin settings: create/rename/delete drives + manage members ─────────────
function PbsDriveSettings({ drives, onChange }) {
  const [creating, setCreating] = useState('')
  const [busy, setBusy] = useState(false)
  const [managing, setManaging] = useState(null) // drive being member-managed
  // "Add a member to all drives" picker
  const [allUsers, setAllUsers] = useState([])
  const [bq, setBq] = useState('')
  const [bopen, setBopen] = useState(false)
  const [bsel, setBsel] = useState(null)
  const [bperm, setBperm] = useState('editor')

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, full_name, email')
      .order('full_name')
      .then(({ data }) => setAllUsers(data || []))
  }, [])

  const bName = u => u.full_name || u.email || u.id
  const bMatches = allUsers
    .filter(u => {
      const q = bq.trim().toLowerCase()
      return !q || bName(u).toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
    })
    .slice(0, 50)

  async function addToAllDrives() {
    if (!bsel || drives.length === 0) return
    setBusy(true)
    try {
      const rows = drives.map(d => ({ drive_id: d.id, user_id: bsel.id, permission: bperm }))
      const { error } = await supabase
        .from('pbs_drive_members')
        .upsert(rows, { onConflict: 'drive_id,user_id' })
      if (error) throw error
      if (bsel.email) {
        sendEmail({
          to: bsel.email,
          subject: `You've been given ${bperm} access to all ${driveLabel} drives`,
          html: `<div style="font-family:sans-serif;font-size:15px;color:#374151;">
            <p>Hi ${bsel.full_name || 'there'},</p>
            <p>You now have <strong>${bperm}</strong> access to <strong>all ${drives.length} ${driveLabel} drives</strong>.</p>
            <p>Open <strong>Documents → ${driveLabel}</strong> to see them.</p>
            <p style="margin-top:16px;"><a href="${window.location.origin}/edocuments" style="background:#3A5038;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-weight:700;">Open ${driveLabel}</a></p>
          </div>`,
        })
      }
      alert(`Added ${bName(bsel)} to all ${drives.length} drives as ${bperm}.`)
      setBsel(null)
      setBq('')
      onChange()
    } catch (e) {
      alert('Could not add to all drives: ' + e.message)
    } finally {
      setBusy(false)
    }
  }

  async function createDrive() {
    const name = creating.trim()
    if (!name) return
    setBusy(true)
    const { error } = await supabase.from('pbs_drives').insert({ name })
    setBusy(false)
    if (error) return alert('Could not create drive: ' + error.message)
    setCreating('')
    onChange()
  }
  async function renameDrive(d) {
    const name = window.prompt('Rename drive:', d.name)
    if (!name?.trim() || name.trim() === d.name) return
    const { error } = await supabase.from('pbs_drives').update({ name: name.trim() }).eq('id', d.id)
    if (error) return alert('Rename failed: ' + error.message)
    onChange()
  }
  async function deleteDrive(d) {
    if (!window.confirm(`Delete the "${d.name}" drive and remove everyone's access? (Files in storage are left intact.)`))
      return
    const { error } = await supabase.from('pbs_drives').delete().eq('id', d.id)
    if (error) return alert('Delete failed: ' + error.message)
    if (managing?.id === d.id) setManaging(null)
    onChange()
  }

  // Copy the names of the Shared Drives from the connected Google Drive into
  // PBS (creates a matching PBS drive for each new name). Uses the Google
  // access token cached by the Google Drive tab.
  async function importFromGoogle() {
    let stored
    try {
      stored = JSON.parse(localStorage.getItem('gdrive:token') || 'null')
    } catch {
      stored = null
    }
    if (!stored?.access_token || !stored.expiry || stored.expiry < Date.now()) {
      alert('Open the Google Drive tab and click “Connect Google Drive” first, then come back here.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('https://www.googleapis.com/drive/v3/drives?pageSize=100&fields=drives(name)', {
        headers: { Authorization: `Bearer ${stored.access_token}` },
      })
      if (!res.ok) throw new Error(`Google Drive error ${res.status}`)
      const data = await res.json()
      const names = (data.drives || []).map(d => d.name).filter(Boolean)
      const existing = new Set(drives.map(d => d.name.toLowerCase()))
      const toAdd = names.filter(n => !existing.has(n.toLowerCase()))
      if (!toAdd.length) {
        alert('No new Google Drive names to import (they all already exist).')
        return
      }
      const { error } = await supabase.from('pbs_drives').insert(toAdd.map(name => ({ name })))
      if (error) throw error
      alert(`Imported ${toAdd.length} drive name(s) from Google Drive.`)
      onChange()
    } catch (e) {
      alert('Import failed: ' + e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="w-full space-y-5">
      {/* Create */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-bold text-gray-800 mb-2">Create a new drive</h3>
        <div className="flex gap-2">
          <input
            value={creating}
            onChange={e => setCreating(e.target.value)}
            placeholder="Drive name (e.g. “Marketing”, “HR Shared”)"
            className="input text-sm flex-1"
            onKeyDown={e => e.key === 'Enter' && createDrive()}
          />
          <button
            onClick={createDrive}
            disabled={busy || !creating.trim()}
            className="btn-primary text-sm px-4 py-2 rounded-lg disabled:opacity-50"
          >
            + Create
          </button>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
          <button
            onClick={importFromGoogle}
            disabled={busy}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 font-semibold hover:bg-gray-50 disabled:opacity-50"
          >
            🔵 Import drive names from Google Drive
          </button>
          <span className="text-xs text-gray-400">
            Creates a matching drive for each of your Google Shared Drives.
          </span>
        </div>
      </div>

      {/* Add a member to ALL drives at once */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-bold text-gray-800 mb-2">Add a member to every drive</h3>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              value={bsel ? bName(bsel) : bq}
              onChange={e => {
                setBsel(null)
                setBq(e.target.value)
                setBopen(true)
              }}
              onFocus={() => setBopen(true)}
              onBlur={() => setTimeout(() => setBopen(false), 150)}
              placeholder="Search employees…"
              className="input text-sm w-full"
            />
            {bopen && !bsel && (
              <div className="absolute z-20 mt-1 w-full max-h-52 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                {bMatches.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-gray-400">No employees match.</p>
                ) : (
                  bMatches.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onMouseDown={() => {
                        setBsel(u)
                        setBopen(false)
                      }}
                      className="block w-full text-left px-3 py-1.5 text-sm hover:bg-green-50"
                    >
                      {bName(u)}
                      {u.email && <span className="text-gray-400"> · {u.email}</span>}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <select value={bperm} onChange={e => setBperm(e.target.value)} className="input text-sm w-40">
            {PERMISSIONS.map(p => (
              <option key={p.id} value={p.id}>
                {p.id[0].toUpperCase() + p.id.slice(1)}
              </option>
            ))}
          </select>
          <button
            onClick={addToAllDrives}
            disabled={busy || !bsel}
            className="btn-primary text-sm px-4 py-2 rounded-lg disabled:opacity-50"
          >
            Add to all
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Grants the chosen access on all {drives.length} drives and emails the user.
        </p>
      </div>

      {/* Drives list */}
      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
        {drives.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-400 text-center">No drives yet.</p>
        ) : (
          drives.map(d => (
            <div key={d.id} className="flex items-center gap-2 px-4 py-2.5">
              <span className="text-sm font-medium text-gray-800 flex-1 truncate">👥 {d.name}</span>
              <button
                onClick={() => setManaging(d)}
                className="text-xs px-3 py-1.5 rounded-lg border-2 border-green-700 text-green-700 font-semibold hover:bg-green-50"
              >
                Members
              </button>
              <button onClick={() => renameDrive(d)} className="text-xs px-2 py-1.5 text-gray-500 hover:text-gray-800">
                Rename
              </button>
              <button onClick={() => deleteDrive(d)} className="text-xs px-2 py-1.5 text-red-500 hover:text-red-700">
                Delete
              </button>
            </div>
          ))
        )}
      </div>

      {managing && <MembersModal drive={managing} onClose={() => setManaging(null)} />}
    </div>
  )
}

// ── Member management modal ───────────────────────────────────────────────────
function MembersModal({ drive, onClose }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [perm, setPerm] = useState('viewer')
  const [busy, setBusy] = useState(false)
  // Employee picker
  const [allUsers, setAllUsers] = useState([])
  const [pickQuery, setPickQuery] = useState('')
  const [pickOpen, setPickOpen] = useState(false)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, full_name, email')
      .order('full_name')
      .then(({ data }) => setAllUsers(data || []))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const { data: mem } = await supabase
      .from('pbs_drive_members')
      .select('*')
      .eq('drive_id', drive.id)
      .order('created_at')
    const ids = (mem || []).map(m => m.user_id)
    let profs = []
    if (ids.length) {
      const { data } = await supabase.from('profiles').select('id, full_name, email').in('id', ids)
      profs = data || []
    }
    const byId = Object.fromEntries(profs.map(p => [p.id, p]))
    setMembers((mem || []).map(m => ({ ...m, profile: byId[m.user_id] || {} })))
    setLoading(false)
  }, [drive.id])

  useEffect(() => {
    load()
  }, [load])

  async function addMember() {
    if (!selected) return
    setBusy(true)
    try {
      const { error } = await supabase
        .from('pbs_drive_members')
        .upsert({ drive_id: drive.id, user_id: selected.id, permission: perm }, { onConflict: 'drive_id,user_id' })
      if (error) throw error
      // Invite email (best-effort).
      if (selected.email) {
        sendEmail({
          to: selected.email,
          subject: `You've been added to the "${drive.name}" drive`,
          html: `<div style="font-family:sans-serif;font-size:15px;color:#374151;">
            <p>Hi ${selected.full_name || 'there'},</p>
            <p>You now have <strong>${perm}</strong> access to the <strong>${drive.name}</strong> drive.</p>
            <p>Open <strong>Documents → ${driveLabel}</strong> to see it.</p>
            <p style="margin-top:16px;"><a href="${window.location.origin}/edocuments" style="background:#3A5038;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-weight:700;">Open ${driveLabel}</a></p>
          </div>`,
        })
      }
      setSelected(null)
      setPickQuery('')
      await load()
    } catch (err) {
      alert('Could not add member: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  const memberIds = new Set(members.map(m => m.user_id))
  const pickName = u => u.full_name || u.email || u.id
  const pickMatches = allUsers
    .filter(u => !memberIds.has(u.id))
    .filter(u => {
      const q = pickQuery.trim().toLowerCase()
      return !q || pickName(u).toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
    })
    .slice(0, 50)

  async function changePerm(m, permission) {
    await supabase.from('pbs_drive_members').update({ permission }).eq('id', m.id)
    load()
  }
  async function removeMember(m) {
    if (!window.confirm(`Remove ${m.profile.full_name || m.profile.email || 'this user'} from "${drive.name}"?`)) return
    await supabase.from('pbs_drive_members').delete().eq('id', m.id)
    load()
  }

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4"
      onMouseDown={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[88vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900 truncate">Members · {drive.name}</h2>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-xl leading-none">✕</button>
        </div>

        {/* Add member — searchable employee picker */}
        <div className="px-5 py-3 border-b border-gray-100 flex-shrink-0 space-y-2">
          <p className="text-xs font-semibold text-gray-500">Add a member</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                value={selected ? pickName(selected) : pickQuery}
                onChange={e => {
                  setSelected(null)
                  setPickQuery(e.target.value)
                  setPickOpen(true)
                }}
                onFocus={() => setPickOpen(true)}
                onBlur={() => setTimeout(() => setPickOpen(false), 150)}
                placeholder="Search employees…"
                className="input text-sm w-full"
              />
              {pickOpen && !selected && (
                <div className="absolute z-20 mt-1 w-full max-h-52 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                  {pickMatches.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-gray-400">No employees match.</p>
                  ) : (
                    pickMatches.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onMouseDown={() => {
                          setSelected(u)
                          setPickOpen(false)
                        }}
                        className="block w-full text-left px-3 py-1.5 text-sm hover:bg-green-50"
                      >
                        {pickName(u)}
                        {u.email && <span className="text-gray-400"> · {u.email}</span>}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <select value={perm} onChange={e => setPerm(e.target.value)} className="input text-sm w-40">
              {PERMISSIONS.map(p => (
                <option key={p.id} value={p.id}>
                  {p.id[0].toUpperCase() + p.id.slice(1)}
                </option>
              ))}
            </select>
            <button onClick={addMember} disabled={busy || !selected} className="btn-primary text-sm px-4 py-2 rounded-lg disabled:opacity-50">
              Add
            </button>
          </div>
        </div>

        {/* Member list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-10"><div className="h-6 w-6 animate-spin rounded-full border-b-2 border-green-700" /></div>
          ) : members.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-400">No members yet.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {members.map(m => (
                <li key={m.id} className="flex items-center gap-2 px-5 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {m.profile.full_name || m.profile.email || m.user_id}
                    </p>
                    {m.profile.email && <p className="text-xs text-gray-400 truncate">{m.profile.email}</p>}
                  </div>
                  <select
                    value={m.permission}
                    onChange={e => changePerm(m, e.target.value)}
                    className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white"
                  >
                    {PERMISSIONS.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.id[0].toUpperCase() + p.id.slice(1)}
                      </option>
                    ))}
                  </select>
                  <button onClick={() => removeMember(m)} className="text-xs text-red-500 hover:text-red-700 px-1">
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
