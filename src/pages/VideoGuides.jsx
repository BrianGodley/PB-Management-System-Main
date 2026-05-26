// src/pages/VideoGuides.jsx
//
// User-facing Video Guides page (route /video-guides). Anyone signed in
// can browse here. Lists categories (help_video_categories) and the
// videos uploaded by admins (via Help Desk → Manage Support Videos).
//
// Click a video tile to open a modal with an inline <video> player using
// a fresh signed URL from the help-resources bucket.
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function VideoGuides() {
  const [categories, setCategories] = useState([])
  const [videos, setVideos]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [openCats, setOpenCats]     = useState({})
  const [playing, setPlaying]       = useState(null) // { video, url } | null

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const [{ data: cats }, { data: rows }] = await Promise.all([
          supabase.from('help_video_categories').select('*').order('sort_order').order('name'),
          supabase.from('help_videos').select('*').order('sort_order').order('created_at'),
        ])
        if (cancelled) return
        setCategories(cats || [])
        setVideos(rows || [])
        const initOpen = {}
        for (const c of cats || []) initOpen[c.id] = true
        initOpen['uncat'] = true
        setOpenCats(initOpen)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  async function playVideo(v) {
    const { data, error } = await supabase
      .storage
      .from('help-resources')
      .createSignedUrl(v.storage_path, 3600)
    if (error || !data?.signedUrl) {
      alert('Could not load video: ' + (error?.message || 'no signed URL returned'))
      return
    }
    setPlaying({ video: v, url: data.signedUrl })
  }

  const videosByCat = {}
  for (const v of videos) {
    const k = v.category_id || 'uncat'
    if (!videosByCat[k]) videosByCat[k] = []
    videosByCat[k].push(v)
  }

  const buckets = [
    ...categories.map(c => ({ id: c.id, name: c.name, videos: videosByCat[c.id] || [] })),
    ...(videosByCat['uncat']?.length
      ? [{ id: 'uncat', name: 'Uncategorised', videos: videosByCat['uncat'] }]
      : []),
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <span>🎬</span> Video Guides
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Walkthroughs and training videos for PBS — browse by category and click to play.
        </p>
      </div>

      {loading && <p className="text-sm text-gray-400 text-center py-12">Loading…</p>}

      {!loading && buckets.length === 0 && (
        <div className="text-center py-16 bg-white border border-dashed border-gray-300 rounded-xl">
          <p className="text-5xl mb-3">🎬</p>
          <p className="text-lg font-semibold text-gray-700">No videos yet</p>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
            An admin can add categories and upload videos from the Help Desk.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {buckets.map(b => (
          <div key={b.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setOpenCats(o => ({ ...o, [b.id]: !o[b.id] }))}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 border-b border-gray-200"
            >
              <span className="font-semibold text-gray-800 flex items-center gap-2">
                {b.name}
                <span className="text-xs font-normal text-gray-400">({b.videos.length})</span>
              </span>
              <span className="text-gray-400 text-sm">{openCats[b.id] ? '▾' : '▸'}</span>
            </button>
            {openCats[b.id] && (
              b.videos.length === 0 ? (
                <p className="text-xs text-gray-400 italic px-4 py-3">No videos in this category.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-3">
                  {b.videos.map(v => (
                    <button
                      key={v.id}
                      onClick={() => playVideo(v)}
                      className="text-left rounded-lg border border-gray-200 overflow-hidden hover:border-green-700 transition-colors"
                    >
                      <div className="bg-gray-100 aspect-video flex items-center justify-center text-gray-400">
                        <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-medium text-gray-800 truncate">{v.title}</p>
                        {v.description && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">{v.description}</p>
                        )}
                        <p className="text-[10px] text-gray-400 mt-1">
                          {(v.size_bytes / 1024 / 1024).toFixed(1)} MB
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )
            )}
          </div>
        ))}
      </div>

      {/* Player modal */}
      {playing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPlaying(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{playing.video.title}</p>
                {playing.video.description && (
                  <p className="text-xs text-gray-500 truncate">{playing.video.description}</p>
                )}
              </div>
              <button
                onClick={() => setPlaying(null)}
                className="text-gray-400 hover:text-gray-700 text-xl leading-none flex-shrink-0 ml-3"
                aria-label="Close player"
              >×</button>
            </div>
            <div className="bg-black">
              <video
                src={playing.url}
                controls
                autoPlay
                className="w-full max-h-[75vh]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
