import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'

// Pull a YouTube video id from common URL shapes (watch, youtu.be, embed, shorts).
function getYouTubeId(url) {
  if (!url) return null
  const m = String(url).match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/)
  return m ? m[1] : null
}

// Video Library — category-driven videos (lms_videos). Each entry is either an
// uploaded file (lms-videos bucket) OR a YouTube / external video link. The
// checksheet builder pulls these in via a "watch" step.
export default function VideoLibraryManager() {
  const { user } = useAuth()
  const [cats, setCats] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ title: '', description: '', category: 'General' })
  const [sourceMode, setSourceMode] = useState('upload') // 'upload' | 'link'
  const [linkUrl, setLinkUrl] = useState('')
  const [file, setFile] = useState(null)
  const [thumb, setThumb] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [play, setPlay] = useState(null)
  const fileRef = useRef()
  const thumbRef = useRef()

  const load = useCallback(async () => {
    setLoading(true)
    const [c, v] = await Promise.all([
      supabase.from('lms_categories').select('*').order('sort_order').order('name'),
      supabase.from('lms_videos').select('*').order('created_at', { ascending: false }),
    ])
    setCats(c.data || [])
    setItems(v.data || [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  // An entry is a "link" video when it has a URL but no uploaded file_name.
  const isLink = it => !!it.video_url && !it.file_name

  const openAdd = () => {
    setEditing(null)
    setForm({ title: '', description: '', category: filter !== 'all' ? filter : (cats[0]?.name || 'General') })
    setSourceMode('upload'); setLinkUrl(''); setFile(null); setThumb(null); setShowModal(true)
  }
  const openEdit = it => {
    setEditing(it)
    setForm({ title: it.title, description: it.description || '', category: it.category || 'General' })
    const link = isLink(it)
    setSourceMode(link ? 'link' : 'upload')
    setLinkUrl(link ? it.video_url : '')
    setFile(null); setThumb(null); setShowModal(true)
  }

  const uploadTo = async (bucket, folder, f) => {
    const path = `${folder}/${Date.now()}_${f.name.replace(/[^\w.\-]+/g, '_')}`
    const { error } = await supabase.storage.from(bucket).upload(path, f, { contentType: f.type, upsert: false })
    if (error) return null
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
  }

  const save = async () => {
    if (!form.title.trim()) return
    if (sourceMode === 'link' && !linkUrl.trim()) return
    if (sourceMode === 'upload' && !file && !editing?.file_name) return
    setSaving(true)
    let video_url = editing?.video_url || null
    let file_name = editing?.file_name || null
    let mime_type = editing?.mime_type || null
    let size_bytes = editing?.size_bytes || null
    let thumbnail_url = editing?.thumbnail_url || null

    if (sourceMode === 'link') {
      // Pasted YouTube/external link — no file upload.
      video_url = linkUrl.trim(); file_name = null; mime_type = null; size_bytes = null
    }
    if (sourceMode === 'upload' && file) {
      setUploading(true)
      const url = await uploadTo('lms-videos', 'videos', file)
      if (url) { video_url = url; file_name = file.name; mime_type = file.type; size_bytes = file.size }
      setUploading(false)
    }
    if (thumb) {
      setUploading(true)
      const url = await uploadTo('lms-images', 'video-thumbs', thumb)
      if (url) thumbnail_url = url
      setUploading(false)
    }

    const payload = {
      title: form.title.trim(), description: form.description.trim() || null,
      category: form.category || 'General', video_url, file_name, mime_type, size_bytes, thumbnail_url,
    }
    if (editing) {
      await supabase.from('lms_videos').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editing.id)
    } else {
      await supabase.from('lms_videos').insert({ ...payload, created_by_email: user?.email })
    }
    setSaving(false); setShowModal(false); load()
  }

  const del = async it => {
    if (!confirm(`Delete "${it.title}"?`)) return
    if (!isLink(it) && it.video_url) {
      const p = it.video_url.split('/lms-videos/')[1]
      if (p) await supabase.storage.from('lms-videos').remove([decodeURIComponent(p)]).catch(() => {})
    }
    await supabase.from('lms_videos').delete().eq('id', it.id)
    load()
  }

  const shown = filter === 'all' ? items : items.filter(i => (i.category || 'General') === filter)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-800">Video Library</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Category-driven training videos — upload a file or paste a YouTube link — to drop into a checksheet step.
          </p>
        </div>
        <button onClick={openAdd} className="px-3 py-1.5 bg-green-700 text-white text-sm rounded-lg hover:bg-green-800">
          + Add Video
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        <Pill active={filter === 'all'} onClick={() => setFilter('all')}>All</Pill>
        {cats.map(c => <Pill key={c.id} active={filter === c.name} onClick={() => setFilter(c.name)}>{c.name}</Pill>)}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 py-4">Loading…</p>
      ) : shown.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <div className="text-4xl mb-2">🎬</div>
          <p className="text-sm">No videos here yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map(it => (
            <div key={it.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white hover:shadow-md transition-shadow">
              <button onClick={() => it.video_url && setPlay(it)} className="block w-full h-28 bg-black/80 relative">
                {it.thumbnail_url
                  ? <img src={it.thumbnail_url} alt="" className="w-full h-full object-cover opacity-80" />
                  : getYouTubeId(it.video_url)
                    ? <img src={`https://img.youtube.com/vi/${getYouTubeId(it.video_url)}/hqdefault.jpg`} alt="" className="w-full h-full object-cover opacity-80" />
                    : <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900" />}
                <span className="absolute inset-0 flex items-center justify-center text-white text-3xl">▶</span>
                {getYouTubeId(it.video_url) && (
                  <span className="absolute top-1.5 right-1.5 text-[9px] font-bold uppercase bg-red-600 text-white rounded px-1.5 py-0.5">YouTube</span>
                )}
              </button>
              <div className="p-4">
                <span className="inline-block text-[10px] font-semibold uppercase tracking-wide text-green-700 bg-green-50 rounded px-2 py-0.5 mb-1.5">
                  {it.category || 'General'}
                </span>
                <p className="font-medium text-gray-900 truncate">{it.title}</p>
                {it.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{it.description}</p>}
                <div className="flex items-center justify-end gap-3 mt-3">
                  <button onClick={() => openEdit(it)} className="text-xs text-gray-500 hover:text-gray-800">Edit</button>
                  <button onClick={() => del(it)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {play && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setPlay(null)}>
          <div className="w-full max-w-3xl" onClick={e => e.stopPropagation()}>
            {getYouTubeId(play.video_url) ? (
              <iframe
                className="w-full rounded-xl"
                style={{ aspectRatio: '16/9' }}
                src={`https://www.youtube.com/embed/${getYouTubeId(play.video_url)}?rel=0`}
                title={play.title}
                allowFullScreen
              />
            ) : (
              <video src={play.video_url} controls autoPlay className="w-full rounded-xl bg-black" />
            )}
            <p className="text-white text-sm mt-2">{play.title}</p>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <h3 className="font-bold text-gray-900 text-lg">{editing ? 'Edit Video' : 'New Video'}</h3>
            <Field label="Title *">
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
            </Field>
            <Field label="Category">
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500">
                {cats.length === 0 && <option value="General">General</option>}
                {cats.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Description">
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 resize-none" />
            </Field>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Video Source</label>
              <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-2">
                <button onClick={() => setSourceMode('upload')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${sourceMode === 'upload' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  ⬆️ Upload File
                </button>
                <button onClick={() => setSourceMode('link')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${sourceMode === 'link' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  🔗 YouTube / Link
                </button>
              </div>
              {sourceMode === 'link' ? (
                <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
              ) : (
                <>
                  {editing?.file_name && !file && <p className="text-xs text-gray-500 mb-2">Current: {editing.file_name}</p>}
                  <div onClick={() => fileRef.current?.click()}
                    className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors">
                    {file ? <div className="text-center"><p className="text-xl mb-0.5">🎬</p><p className="text-xs font-medium text-gray-700">{file.name}</p><p className="text-xs text-gray-400">Click to change</p></div>
                          : <div className="text-center text-gray-400"><p className="text-2xl mb-0.5">🎬</p><p className="text-xs">Click to upload (MP4, MOV, WebM)</p></div>}
                  </div>
                  <input ref={fileRef} type="file" accept="video/*" className="sr-only" onChange={e => setFile(e.target.files?.[0] || null)} />
                </>
              )}
            </div>

            <Field label="Thumbnail (optional)">
              <div onClick={() => thumbRef.current?.click()}
                className="flex items-center gap-2 h-12 px-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-green-400 hover:bg-green-50 text-xs text-gray-500">
                🖼️ {thumb ? thumb.name : (editing?.thumbnail_url ? 'Replace thumbnail image' : 'Click to upload an image (YouTube links auto-thumbnail)')}
              </div>
              <input ref={thumbRef} type="file" accept="image/*" className="sr-only" onChange={e => setThumb(e.target.files?.[0] || null)} />
            </Field>

            <div className="flex gap-3 pt-2">
              <button onClick={save} disabled={saving || uploading || !form.title.trim()}
                className="flex-1 py-2.5 bg-green-700 text-white rounded-xl font-medium hover:bg-green-800 disabled:opacity-50">
                {uploading ? 'Uploading…' : saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Pill({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${active ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
      {children}
    </button>
  )
}
function Field({ label, children }) {
  return (<div><label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>{children}</div>)
}
