import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ── Constants ────────────────────────────────────────────────
const PERMISSION_OPTIONS = [
  { key: 'internal', label: 'Internal',     icon: '👥' },
  { key: 'client',   label: 'Client',       icon: '🏠' },
  { key: 'subs',     label: 'Subs/Vendors', icon: '🔧' },
  { key: 'private',  label: 'Private',      icon: '🔒' },
]

const PERM_COLORS = {
  internal: 'bg-blue-50 text-blue-700 border-blue-200',
  client:   'bg-green-50 text-green-700 border-green-200',
  subs:     'bg-orange-50 text-orange-700 border-orange-200',
  private:  'bg-gray-100 text-gray-600 border-gray-200',
}

function today() { return new Date().toISOString().split('T')[0] }

const EMPTY_FORM = {
  date:               today(),
  title:              '',
  notes:              '',
  permissions:        ['internal'],
  weather_conditions: false,
  weather_notes:      '',
}

// ── Helpers ──────────────────────────────────────────────────
function formatDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

function getPublicUrl(path) {
  const { data } = supabase.storage.from('daily-log-photos').getPublicUrl(path)
  return data.publicUrl
}

// ── Main Component ───────────────────────────────────────────
export default function DailyLogs({ jobs = [], selectedJob }) {
  const { user } = useAuth()
  const [logs,     setLogs]     = useState([])
  const [profiles, setProfiles] = useState({})
  const [loading,  setLoading]  = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editLog,   setEditLog]   = useState(null)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [photoFiles,    setPhotoFiles]    = useState([])
  const [photoPreviews, setPhotoPreviews] = useState([])
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [lightbox, setLightbox] = useState(null)  // { photos, index }
  const fileRef = useRef(null)

  const jobMap = Object.fromEntries(jobs.map(j => [j.id, j.name || j.client_name]))

  useEffect(() => { fetchProfiles() }, [])
  useEffect(() => { fetchLogs() }, [selectedJob])

  async function fetchProfiles() {
    const { data } = await supabase.from('profiles').select('id, full_name, email')
    if (data) setProfiles(Object.fromEntries(data.map(p => [p.id, p.full_name || p.email || 'Unknown'])))
  }

  async function fetchLogs() {
    setLoading(true)
    let q = supabase
      .from('daily_logs')
      .select('*, daily_log_photos(*)')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (selectedJob !== 'all') q = q.eq('job_id', selectedJob)

    const { data, error } = await q
    if (error) console.error('fetchLogs:', error)
    if (data) setLogs(data)
    setLoading(false)
  }

  // ── Modal open/close ───────────────────────────────────────
  function openNew() {
    setEditLog(null)
    setForm({ ...EMPTY_FORM, date: today() })
    setPhotoFiles([])
    setPhotoPreviews([])
    setError('')
    setShowModal(true)
  }

  function openEdit(log) {
    setEditLog(log)
    setForm({
      date:               log.date,
      title:              log.title || '',
      notes:              log.notes || '',
      permissions:        log.permissions || ['internal'],
      weather_conditions: log.weather_conditions || false,
      weather_notes:      log.weather_notes || '',
    })
    setPhotoFiles([])
    setPhotoPreviews([])
    setError('')
    setShowModal(true)
  }

  function closeModal() { setShowModal(false); setEditLog(null) }

  // ── Photo handling ─────────────────────────────────────────
  function handlePhotoSelect(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setPhotoFiles(prev => [...prev, ...files])
    setPhotoPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))])
    e.target.value = ''
  }

  function removeNewPhoto(idx) {
    setPhotoFiles(prev => prev.filter((_, i) => i !== idx))
    setPhotoPreviews(prev => {
      URL.revokeObjectURL(prev[idx])
      return prev.filter((_, i) => i !== idx)
    })
  }

  function togglePermission(key) {
    setForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter(p => p !== key)
        : [...prev.permissions, key],
    }))
  }

  // ── Save ───────────────────────────────────────────────────
  async function saveLog() {
    if (!form.notes.trim() && photoFiles.length === 0) {
      setError('Please add notes or at least one photo.')
      return
    }
    setSaving(true)
    setError('')

    const jobId = selectedJob !== 'all' ? selectedJob : null

    try {
      let logId

      if (editLog) {
        // Update existing
        const { error } = await supabase.from('daily_logs').update({
          date:               form.date,
          title:              form.title.trim() || null,
          notes:              form.notes.trim() || null,
          permissions:        form.permissions,
          weather_conditions: form.weather_conditions,
          weather_notes:      form.weather_notes.trim() || null,
          updated_at:         new Date().toISOString(),
        }).eq('id', editLog.id)
        if (error) throw error
        logId = editLog.id
      } else {
        // Insert new
        const { data, error } = await supabase.from('daily_logs').insert({
          job_id:             jobId,
          date:               form.date,
          title:              form.title.trim() || null,
          notes:              form.notes.trim() || null,
          created_by:         user?.id,
          permissions:        form.permissions,
          weather_conditions: form.weather_conditions,
          weather_notes:      form.weather_notes.trim() || null,
          source:             'web',
        }).select().single()
        if (error) throw error
        logId = data.id
      }

      // Upload new photos
      for (const file of photoFiles) {
        const ext = file.name.split('.').pop().toLowerCase()
        const path = `${logId}/${crypto.randomUUID()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('daily-log-photos').upload(path, file)
        if (!upErr) {
          await supabase.from('daily_log_photos').insert({
            log_id: logId, storage_path: path,
            file_name: file.name, mime_type: file.type,
          })
        }
      }

      closeModal()
      fetchLogs()
    } catch (err) {
      console.error('saveLog:', err)
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ─────────────────────────────────────────────────
  async function deleteLog(log) {
    if (!confirm('Delete this daily log entry? This cannot be undone.')) return
    if (log.daily_log_photos?.length) {
      await supabase.storage.from('daily-log-photos')
        .remove(log.daily_log_photos.map(p => p.storage_path))
    }
    await supabase.from('daily_logs').delete().eq('id', log.id)
    setLogs(prev => prev.filter(l => l.id !== log.id))
  }

  async function deletePhoto(log, photo) {
    if (!confirm('Remove this photo?')) return
    await supabase.storage.from('daily-log-photos').remove([photo.storage_path])
    await supabase.from('daily_log_photos').delete().eq('id', photo.id)
    setLogs(prev => prev.map(l =>
      l.id === log.id
        ? { ...l, daily_log_photos: l.daily_log_photos.filter(p => p.id !== photo.id) }
        : l
    ))
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h2 className="text-sm font-semibold text-gray-700">
          Daily Logs {logs.length > 0 && <span className="text-gray-400 font-normal">({logs.length})</span>}
        </h2>
        <button onClick={openNew} className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Log
        </button>
      </div>

      {/* Log list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-green-700" />
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-gray-400 py-20">
          <p className="text-5xl mb-3">📋</p>
          <p className="text-sm font-medium text-gray-500">No daily logs yet</p>
          <p className="text-xs mt-1 mb-4 text-gray-400">Start documenting job progress</p>
          <button onClick={openNew} className="btn-primary text-sm px-4 py-2">Create First Log</button>
        </div>
      ) : (
        <div className="space-y-4 overflow-y-auto flex-1">
          {logs.map(log => (
            <LogCard
              key={log.id}
              log={log}
              author={profiles[log.created_by] || 'Unknown'}
              jobName={selectedJob === 'all' ? jobMap[log.job_id] : null}
              onEdit={() => openEdit(log)}
              onDelete={() => deleteLog(log)}
              onDeletePhoto={(photo) => deletePhoto(log, photo)}
              onPhotoClick={(photos, idx) => setLightbox({ photos, idx })}
            />
          ))}
        </div>
      )}

      {/* New / Edit Log Modal */}
      {showModal && (
        <LogModal
          form={form}
          setForm={setForm}
          isEdit={!!editLog}
          existingPhotos={editLog?.daily_log_photos || []}
          photoPreviews={photoPreviews}
          photoFiles={photoFiles}
          onPhotoSelect={handlePhotoSelect}
          onRemoveNew={removeNewPhoto}
          togglePermission={togglePermission}
          onSave={saveLog}
          onClose={closeModal}
          saving={saving}
          error={error}
          fileRef={fileRef}
          selectedJob={selectedJob}
          jobs={jobs}
        />
      )}

      {/* Lightbox */}
      {lightbox && (
        <Lightbox
          photos={lightbox.photos}
          index={lightbox.idx}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  )
}

// ── Log Card ─────────────────────────────────────────────────
function LogCard({ log, author, jobName, onEdit, onDelete, onDeletePhoto, onPhotoClick }) {
  const photos = log.daily_log_photos || []
  const visiblePhotos = photos.slice(0, 5)
  const extraCount = photos.length - 5

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">

      {/* Card header */}
      <div className="flex items-start justify-between px-4 pt-4 pb-2">
        <div>
          <p className="text-base font-bold text-gray-900">{formatDate(log.date)}</p>
          {log.title && <p className="text-sm text-gray-600 mt-0.5">{log.title}</p>}
        </div>
        <div className="flex items-center gap-1 ml-2">
          <button onClick={onEdit}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            title="Edit log">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z" />
            </svg>
          </button>
          <button onClick={onDelete}
            className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
            title="Delete log">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Author + permissions + job */}
      <div className="flex flex-wrap items-center gap-1.5 px-4 pb-2">
        <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-medium">
          <span className="w-4 h-4 rounded-full bg-green-700 text-white inline-flex items-center justify-center text-[9px] font-bold">
            {author.charAt(0).toUpperCase()}
          </span>
          {author}
        </span>
        {(log.permissions || []).map(p => {
          const opt = PERMISSION_OPTIONS.find(o => o.key === p)
          return opt ? (
            <span key={p} className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PERM_COLORS[p] || 'bg-gray-100 text-gray-600'}`}>
              {opt.icon} {opt.label}
            </span>
          ) : null
        })}
        {jobName && (
          <span className="text-xs px-2 py-0.5 rounded-full border border-purple-200 bg-purple-50 text-purple-700 font-medium">
            {jobName}
          </span>
        )}
        <span className="text-[10px] text-gray-400 ml-auto">
          {new Date(log.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </span>
      </div>

      {/* Notes */}
      {log.notes && (
        <div className="px-4 pb-3">
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{log.notes}</p>
        </div>
      )}

      {/* Weather */}
      {(log.weather_conditions || log.weather_notes) && (
        <div className="mx-4 mb-3 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-xs font-medium text-blue-700 mb-0.5">🌤 Weather</p>
          {log.weather_notes && <p className="text-xs text-blue-600">{log.weather_notes}</p>}
        </div>
      )}

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="px-4 pb-4">
          <div className="grid grid-cols-5 gap-1 rounded-lg overflow-hidden">
            {visiblePhotos.map((photo, idx) => {
              const isLast = idx === 4 && extraCount > 0
              return (
                <div
                  key={photo.id}
                  className="relative aspect-square bg-gray-100 cursor-pointer overflow-hidden rounded"
                  onClick={() => onPhotoClick(photos, idx)}
                >
                  <img
                    src={getPublicUrl(photo.storage_path)}
                    alt={photo.file_name || 'Log photo'}
                    className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                    loading="lazy"
                  />
                  {isLast && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white text-lg font-bold">+{extraCount + 1}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {photos.length > 0 && (
            <p className="text-[10px] text-gray-400 mt-1">{photos.length} photo{photos.length !== 1 ? 's' : ''}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── New/Edit Log Modal ───────────────────────────────────────
function LogModal({
  form, setForm, isEdit, existingPhotos,
  photoPreviews, photoFiles,
  onPhotoSelect, onRemoveNew,
  togglePermission, onSave, onClose,
  saving, error, fileRef,
  selectedJob, jobs,
}) {
  const cameraRef = useRef(null)
  const jobMap = Object.fromEntries(jobs.map(j => [j.id, j.name || j.client_name]))

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-[680px] max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden">

        {/* ── Header — always visible ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">{isEdit ? 'Edit Daily Log' : 'Daily Log'}</h2>
            {selectedJob !== 'all' && (
              <p className="text-xs text-green-700 font-medium mt-0.5">{jobMap[selectedJob]}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 p-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col sm:flex-row sm:min-h-full">

            {/* Left column */}
            <div className="w-full sm:w-64 flex-shrink-0 px-5 py-4 border-b sm:border-b-0 sm:border-r border-gray-100 space-y-4">

              {/* Job selector (all-jobs mode) */}
              {selectedJob === 'all' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Job</label>
                  <select
                    value={form.job_id || ''}
                    onChange={e => setForm(f => ({ ...f, job_id: e.target.value || null }))}
                    className="input text-sm w-full"
                  >
                    <option value="">— select job —</option>
                    {jobs.map(j => (
                      <option key={j.id} value={j.id}>{j.name || j.client_name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date <span className="text-red-400">*</span></label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="input text-sm w-full"
                />
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Optional title…"
                  className="input text-sm w-full"
                />
              </div>

              {/* Permissions */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Permissions</label>
                <div className="space-y-1">
                  {PERMISSION_OPTIONS.map(opt => (
                    <label key={opt.key} className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                      form.permissions.includes(opt.key) ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-transparent hover:bg-gray-100'
                    }`}>
                      <span className="text-sm text-gray-700">{opt.icon} {opt.label}</span>
                      <input
                        type="checkbox"
                        checked={form.permissions.includes(opt.key)}
                        onChange={() => togglePermission(opt.key)}
                        className="accent-green-700 w-4 h-4"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Weather */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Weather</label>
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={form.weather_conditions}
                    onChange={e => setForm(f => ({ ...f, weather_conditions: e.target.checked }))}
                    className="accent-green-700 w-4 h-4"
                  />
                  <span className="text-sm text-gray-600">Include weather conditions</span>
                </label>
                {form.weather_conditions && (
                  <input
                    type="text"
                    value={form.weather_notes}
                    onChange={e => setForm(f => ({ ...f, weather_notes: e.target.value }))}
                    placeholder="e.g. Sunny, 78°F"
                    className="input text-sm w-full"
                  />
                )}
              </div>
            </div>

            {/* Right column */}
            <div className="flex-1 flex flex-col px-5 py-4 space-y-4">

              {/* Photos — mobile gets Camera + Library buttons */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-600">Photos</p>
                  <div className="flex gap-2">
                    {/* Camera button — mobile only */}
                    <button
                      onClick={() => cameraRef.current?.click()}
                      className="sm:hidden text-xs px-3 py-1.5 rounded-lg bg-green-700 text-white active:bg-green-800 transition-colors flex items-center gap-1"
                    >
                      📷 Camera
                    </button>
                    {/* Gallery / file picker */}
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                    >
                      <span className="sm:hidden">🖼 Library</span>
                      <span className="hidden sm:inline">+ Add Photos</span>
                    </button>
                  </div>
                </div>

                {/* Hidden inputs */}
                <input
                  ref={cameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={onPhotoSelect}
                />
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={onPhotoSelect}
                />

                {/* Existing photos */}
                {existingPhotos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {existingPhotos.map(photo => (
                      <div key={photo.id} className="relative w-16 h-16 rounded-lg overflow-hidden group">
                        <img src={getPublicUrl(photo.storage_path)} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}

                {/* New previews */}
                {photoPreviews.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {photoPreviews.map((url, idx) => (
                      <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => onRemoveNew(idx)}
                          className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center"
                        >✕</button>
                      </div>
                    ))}
                  </div>
                ) : existingPhotos.length === 0 && (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-200 rounded-xl py-6 text-center text-xs text-gray-400 hover:border-green-300 hover:text-green-600 transition-colors"
                  >
                    <p className="text-2xl mb-1">📷</p>
                    <span className="hidden sm:inline">Click or drag to add photos</span>
                    <span className="sm:hidden">Tap Camera or Library above</span>
                  </button>
                )}
              </div>

              {/* Notes */}
              <div className="flex flex-col">
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Describe today's work, observations, materials used…"
                  rows={6}
                  className="input text-sm resize-none leading-relaxed"
                />
              </div>

              {/* Error */}
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          </div>
        </div>

        {/* ── Footer — always visible, never scrolls away ── */}
        <div className="px-5 py-4 flex gap-2 flex-shrink-0 border-t border-gray-100 bg-white">
          <button
            onClick={onSave}
            disabled={saving}
            className="flex-1 btn-primary text-sm py-3 disabled:opacity-50"
          >
            {saving ? 'Saving…' : isEdit ? 'Update Log' : 'Save Log'}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-3 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Lightbox ─────────────────────────────────────────────────
function Lightbox({ photos, index, onClose }) {
  const [cur, setCur] = useState(index)

  function prev() { setCur(i => (i - 1 + photos.length) % photos.length) }
  function next() { setCur(i => (i + 1) % photos.length) }

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowLeft')  prev()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'Escape')     onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      <button onClick={e => { e.stopPropagation(); prev() }}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white p-2 text-3xl">‹</button>

      <img
        src={getPublicUrl(photos[cur].storage_path)}
        alt={photos[cur].file_name || ''}
        className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
        onClick={e => e.stopPropagation()}
      />

      <button onClick={e => { e.stopPropagation(); next() }}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white p-2 text-3xl">›</button>

      <button onClick={onClose}
        className="absolute top-4 right-4 text-white/60 hover:text-white text-2xl p-2">✕</button>

      <p className="absolute bottom-4 text-white/50 text-sm">{cur + 1} / {photos.length}</p>
    </div>
  )
}
