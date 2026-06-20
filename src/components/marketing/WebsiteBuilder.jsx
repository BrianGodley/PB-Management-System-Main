// ─────────────────────────────────────────────────────────────────────────────
// WebsiteBuilder — Marketing hub → Website Builder tab
// Multi-page marketing site builder powered by Puck (@measured/puck). Manage
// pages, edit each visually with section blocks, set the public slug + brand
// color + target funnel, and publish. Published sites are served at /s/:slug
// (see PublicSite.jsx); the contact form creates a contact + funnel card.
//
// Requires:  npm install @measured/puck   (+ run supabase-website-builder.sql)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import { Puck } from '@measured/puck'
import '@measured/puck/puck.css'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { puckConfig, WebsiteRuntimeContext, STARTER_PAGE_DATA, EMPTY_PAGE_DATA } from '../../lib/websiteBlocks'

const slugify = s =>
  (s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)

export default function WebsiteBuilder() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [site, setSite] = useState(null)
  const [pages, setPages] = useState([])
  const [funnels, setFunnels] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [pageData, setPageData] = useState(EMPTY_PAGE_DATA)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [creating, setCreating] = useState(false)
  const [defaultName, setDefaultName] = useState('My Website')

  const selectedPage = pages.find(p => p.id === selectedId) || null

  // ── load ───────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    const { data: sites } = await supabase.from('websites').select('*').order('created_at').limit(1)
    const s = sites?.[0] || null
    setSite(s)
    supabase.from('funnels').select('id, name').order('name').then(({ data }) => setFunnels(data || []))
    if (s) {
      const { data: pg } = await supabase.from('website_pages').select('*').eq('website_id', s.id).order('sort_order')
      setPages(pg || [])
      const home = (pg || []).find(p => p.is_home) || (pg || [])[0]
      if (home) { setSelectedId(home.id); setPageData(home.data || EMPTY_PAGE_DATA) }
    } else {
      const { data: cs } = await supabase.from('company_settings').select('company_name').limit(1).maybeSingle()
      if (cs?.company_name) setDefaultName(cs.company_name)
    }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  // ── create site ────────────────────────────────────────────────────────────
  const createSite = async () => {
    setCreating(true)
    const baseSlug = slugify(defaultName) || `site-${Date.now().toString(36)}`
    const { data: s, error } = await supabase
      .from('websites')
      .insert({ name: defaultName, slug: baseSlug, theme: { primary: '#3A5038' }, settings: {}, created_by_email: user?.email })
      .select()
      .single()
    if (error) { alert('Could not create site: ' + error.message); setCreating(false); return }
    await supabase.from('website_pages').insert({
      website_id: s.id, title: 'Home', slug: 'home', sort_order: 0, is_home: true, show_in_nav: true, data: STARTER_PAGE_DATA,
    })
    setCreating(false)
    load()
  }

  // ── page persistence ───────────────────────────────────────────────────────
  const savePage = async () => {
    if (!selectedPage) return
    setSaving(true)
    const { error } = await supabase
      .from('website_pages')
      .update({ data: pageData, updated_at: new Date().toISOString() })
      .eq('id', selectedPage.id)
    setSaving(false)
    if (error) { alert('Save failed: ' + error.message); return }
    setPages(prev => prev.map(p => (p.id === selectedPage.id ? { ...p, data: pageData } : p)))
    setDirty(false)
  }

  const selectPage = p => {
    if (dirty && !confirm('Discard unsaved changes to this page?')) return
    setSelectedId(p.id); setPageData(p.data || EMPTY_PAGE_DATA); setDirty(false)
  }

  const addPage = async () => {
    const title = prompt('New page name (e.g. Services, About, Contact):')
    if (!title) return
    let slug = slugify(title) || `page-${pages.length + 1}`
    if (pages.some(p => p.slug === slug)) slug = `${slug}-${pages.length + 1}`
    const { data, error } = await supabase
      .from('website_pages')
      .insert({ website_id: site.id, title, slug, sort_order: pages.length, is_home: false, show_in_nav: true, data: EMPTY_PAGE_DATA })
      .select().single()
    if (error) { alert(error.message); return }
    setPages(prev => [...prev, data]); selectPage(data)
  }

  const renamePage = async p => {
    const title = prompt('Rename page:', p.title)
    if (!title) return
    await supabase.from('website_pages').update({ title }).eq('id', p.id)
    setPages(prev => prev.map(x => (x.id === p.id ? { ...x, title } : x)))
  }

  const setHome = async p => {
    await supabase.from('website_pages').update({ is_home: false }).eq('website_id', site.id)
    await supabase.from('website_pages').update({ is_home: true }).eq('id', p.id)
    setPages(prev => prev.map(x => ({ ...x, is_home: x.id === p.id })))
  }

  const toggleNav = async p => {
    await supabase.from('website_pages').update({ show_in_nav: !p.show_in_nav }).eq('id', p.id)
    setPages(prev => prev.map(x => (x.id === p.id ? { ...x, show_in_nav: !x.show_in_nav } : x)))
  }

  const movePage = async (p, dir) => {
    const idx = pages.findIndex(x => x.id === p.id)
    const j = idx + dir
    if (j < 0 || j >= pages.length) return
    const reordered = [...pages]
    ;[reordered[idx], reordered[j]] = [reordered[j], reordered[idx]]
    setPages(reordered)
    await Promise.all(reordered.map((x, i) => supabase.from('website_pages').update({ sort_order: i }).eq('id', x.id)))
  }

  const deletePage = async p => {
    if (pages.length === 1) { alert('A site needs at least one page.'); return }
    if (!confirm(`Delete the “${p.title}” page?`)) return
    await supabase.from('website_pages').delete().eq('id', p.id)
    const rest = pages.filter(x => x.id !== p.id)
    setPages(rest)
    if (selectedId === p.id && rest[0]) selectPage(rest[0])
  }

  if (loading) return <p className="text-sm text-gray-400 mt-6">Loading…</p>

  // ── empty state ────────────────────────────────────────────────────────────
  if (!site) {
    return (
      <div className="mt-6 max-w-md mx-auto text-center bg-white border border-gray-200 rounded-2xl p-8">
        <div className="text-5xl mb-3">🌐</div>
        <h3 className="font-bold text-gray-900 text-lg">Build your marketing website</h3>
        <p className="text-sm text-gray-500 mt-1.5">A multi-page, mobile-friendly site whose contact form drops new leads straight into your contacts and a sales funnel.</p>
        <input
          value={defaultName}
          onChange={e => setDefaultName(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mt-5 focus:outline-none focus:border-green-500"
          placeholder="Site name"
        />
        <button onClick={createSite} disabled={creating}
          className="w-full mt-3 py-2.5 bg-green-700 text-white rounded-xl font-semibold hover:bg-green-800 disabled:opacity-50">
          {creating ? 'Creating…' : 'Create website'}
        </button>
      </div>
    )
  }

  const publicUrl = `${window.location.origin}/s/${site.slug}`

  return (
    <div className="mt-3 flex-1 flex flex-col min-h-0">
      {/* Site toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${site.published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {site.published ? '● Live' : '○ Draft'}
        </span>
        <a href={site.published ? publicUrl : undefined} target="_blank" rel="noreferrer"
          className={`text-xs ${site.published ? 'text-blue-600 hover:underline' : 'text-gray-400 cursor-default'}`}>
          {publicUrl}
        </a>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setShowSettings(true)} className="px-3 py-1.5 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">⚙️ Site Settings</button>
          <button onClick={savePage} disabled={saving || !dirty}
            className="px-4 py-1.5 bg-green-700 text-white text-sm rounded-xl font-medium hover:bg-green-800 disabled:opacity-50">
            {saving ? 'Saving…' : dirty ? 'Save Page' : 'Saved'}
          </button>
        </div>
      </div>

      <div className="flex gap-3 flex-1 min-h-0">
        {/* Pages rail */}
        <div className="w-48 flex-shrink-0 bg-white border border-gray-200 rounded-2xl p-2 overflow-y-auto">
          <div className="flex items-center justify-between px-1.5 py-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Pages</p>
            <button onClick={addPage} className="text-green-700 text-sm font-bold hover:text-green-800">＋</button>
          </div>
          {pages.map((p, i) => (
            <div key={p.id}
              className={`group rounded-xl px-2 py-1.5 text-sm cursor-pointer ${selectedId === p.id ? 'bg-green-50 text-green-800' : 'text-gray-600 hover:bg-gray-50'}`}
              onClick={() => selectPage(p)}>
              <div className="flex items-center gap-1">
                <span className="truncate flex-1">{p.is_home ? '🏠 ' : ''}{p.title}</span>
                {!p.show_in_nav && <span title="Hidden from nav" className="text-[10px] text-gray-400">hidden</span>}
              </div>
              {selectedId === p.id && (
                <div className="flex flex-wrap gap-1.5 mt-1 text-[10px] text-gray-400">
                  <button onClick={e => { e.stopPropagation(); renamePage(p) }} className="hover:text-gray-700">rename</button>
                  {!p.is_home && <button onClick={e => { e.stopPropagation(); setHome(p) }} className="hover:text-gray-700">home</button>}
                  <button onClick={e => { e.stopPropagation(); toggleNav(p) }} className="hover:text-gray-700">{p.show_in_nav ? 'hide' : 'show'}</button>
                  <button onClick={e => { e.stopPropagation(); movePage(p, -1) }} disabled={i === 0} className="hover:text-gray-700 disabled:opacity-30">↑</button>
                  <button onClick={e => { e.stopPropagation(); movePage(p, 1) }} disabled={i === pages.length - 1} className="hover:text-gray-700 disabled:opacity-30">↓</button>
                  {!p.is_home && <button onClick={e => { e.stopPropagation(); deletePage(p) }} className="text-red-400 hover:text-red-600">delete</button>}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Puck editor */}
        <div className="flex-1 min-w-0 border border-gray-200 rounded-2xl overflow-hidden bg-white" style={{ height: '72vh' }}>
          <WebsiteRuntimeContext.Provider value={{ mode: 'edit', onLead: null }}>
            <div style={{ '--site-primary': site.theme?.primary || '#3A5038', height: '100%' }}>
              {selectedPage && (
                <Puck
                  key={selectedPage.id}
                  config={puckConfig}
                  data={pageData}
                  onChange={d => { setPageData(d); setDirty(true) }}
                  overrides={{ header: () => null }}
                />
              )}
            </div>
          </WebsiteRuntimeContext.Provider>
        </div>
      </div>

      {showSettings && (
        <SiteSettingsModal
          site={site}
          funnels={funnels}
          onClose={() => setShowSettings(false)}
          onSaved={s => { setSite(s); setShowSettings(false) }}
        />
      )}
    </div>
  )
}

// ── Site settings modal ──────────────────────────────────────────────────────
function SiteSettingsModal({ site, funnels, onClose, onSaved }) {
  const [name, setName] = useState(site.name || '')
  const [slug, setSlug] = useState(site.slug || '')
  const [primary, setPrimary] = useState(site.theme?.primary || '#3A5038')
  const [funnelId, setFunnelId] = useState(site.funnel_id || '')
  const [published, setPublished] = useState(!!site.published)
  const [biz, setBiz] = useState({
    business_name: site.settings?.business_name || '',
    phone: site.settings?.phone || '',
    email: site.settings?.email || '',
    address: site.settings?.address || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const setB = (k, v) => setBiz(b => ({ ...b, [k]: v }))

  const save = async () => {
    const cleanSlug = slugify(slug)
    if (!cleanSlug) { setError('Please enter a valid URL slug.'); return }
    if (published && !funnelId) { setError('Pick a target funnel before publishing so leads have a home.'); return }
    setSaving(true); setError('')
    const { data, error: err } = await supabase
      .from('websites')
      .update({
        name: name.trim() || 'My Website',
        slug: cleanSlug,
        theme: { ...(site.theme || {}), primary },
        settings: { ...(site.settings || {}), ...biz },
        funnel_id: funnelId || null,
        published,
        updated_at: new Date().toISOString(),
      })
      .eq('id', site.id)
      .select().single()
    setSaving(false)
    if (err) { setError(err.code === '23505' ? 'That URL is taken — choose another slug.' : err.message); return }
    onSaved(data)
  }

  const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500'
  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-3 max-h-[92vh] overflow-y-auto">
        <h3 className="font-bold text-gray-900 text-lg">Site Settings</h3>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Site name</label>
          <input className={inp} value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Public URL</label>
          <div className="flex items-center gap-1 text-sm">
            <span className="text-gray-400">/s/</span>
            <input className={inp} value={slug} onChange={e => setSlug(e.target.value)} />
          </div>
          <p className="text-[11px] text-gray-400 mt-1">{window.location.origin}/s/{slugify(slug) || '…'}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Brand color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={primary} onChange={e => setPrimary(e.target.value)} className="w-10 h-9 rounded border border-gray-200" />
              <input className={inp} value={primary} onChange={e => setPrimary(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Leads go to funnel</label>
            <select className={inp} value={funnelId} onChange={e => setFunnelId(e.target.value)}>
              <option value="">— None —</option>
              {funnels.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs font-semibold text-gray-500 mb-2">Business info (used in footer / contact)</p>
          <div className="grid grid-cols-2 gap-2">
            <input className={inp} placeholder="Business name" value={biz.business_name} onChange={e => setB('business_name', e.target.value)} />
            <input className={inp} placeholder="Phone" value={biz.phone} onChange={e => setB('phone', e.target.value)} />
            <input className={inp} placeholder="Email" value={biz.email} onChange={e => setB('email', e.target.value)} />
            <input className={inp} placeholder="Address" value={biz.address} onChange={e => setB('address', e.target.value)} />
          </div>
        </div>

        <label className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5 cursor-pointer">
          <input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} className="w-4 h-4 accent-green-700" />
          <span className="text-sm text-gray-800 font-medium">Published (live at the public URL)</span>
        </label>

        {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}
        <div className="flex gap-3 pt-1">
          <button onClick={save} disabled={saving} className="flex-1 py-2.5 bg-green-700 text-white rounded-xl font-medium hover:bg-green-800 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
          <button onClick={onClose} disabled={saving} className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 disabled:opacity-50">Cancel</button>
        </div>
      </div>
    </div>
  )
}
