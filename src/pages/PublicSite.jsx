// src/pages/PublicSite.jsx
// Public, logged-out rendering of a tenant's published marketing site.
// Routes: /s/:slug (home) and /s/:slug/:pageSlug
// Loads via the get_public_site RPC (anon-safe; only returns PUBLISHED sites),
// renders the page's Puck content with <Render>, and submits the contact form
// to the website-lead edge function (→ contact + funnel card).
import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Render } from '@measured/puck'
import { supabase } from '../lib/supabase'
import { puckConfig, WebsiteRuntimeContext, EMPTY_PAGE_DATA } from '../lib/websiteBlocks'

export default function PublicSite() {
  const { slug, pageSlug } = useParams()
  const navigate = useNavigate()
  const [state, setState] = useState('loading') // loading | ok | notfound
  const [site, setSite] = useState(null)
  const [pages, setPages] = useState([])

  useEffect(() => {
    let active = true
    supabase.rpc('get_public_site', { p_slug: slug }).then(({ data, error }) => {
      if (!active) return
      if (error || !data || !data.site) { setState('notfound'); return }
      setSite(data.site)
      setPages(data.pages || [])
      setState('ok')
      document.title = data.site.name || 'Website'
    })
    return () => { active = false }
  }, [slug])

  if (state === 'loading') {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>
  }
  if (state === 'notfound') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
        <div className="text-5xl mb-3">🚧</div>
        <h1 className="text-xl font-bold text-gray-900">Site not found</h1>
        <p className="text-gray-500 mt-1">This website doesn’t exist or isn’t published yet.</p>
      </div>
    )
  }

  const home = pages.find(p => p.is_home) || pages[0]
  const current = (pageSlug ? pages.find(p => p.slug === pageSlug) : home) || home
  const navPages = pages.filter(p => p.show_in_nav)
  const primary = site.theme?.primary || '#3A5038'

  const linkTo = p => (p.is_home ? `/s/${slug}` : `/s/${slug}/${p.slug}`)

  const onLead = async form => {
    const { data, error } = await supabase.functions.invoke('website-lead', {
      body: { slug, page_slug: current?.slug || 'home', ...form },
    })
    if (error) throw new Error(error.message || 'Submission failed.')
    if (data?.error) throw new Error(data.error)
  }

  return (
    <div style={{ '--site-primary': primary }} className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to={`/s/${slug}`} className="font-bold text-gray-900 truncate">{site.name}</Link>
          <nav className="flex items-center gap-1 overflow-x-auto">
            {navPages.map(p => {
              const active = p.slug === current?.slug
              return (
                <Link key={p.slug} to={linkTo(p)}
                  className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${active ? 'font-semibold' : 'text-gray-500 hover:text-gray-800'}`}
                  style={active ? { color: primary } : undefined}>
                  {p.title}
                </Link>
              )
            })}
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1">
        {current ? (
          <WebsiteRuntimeContext.Provider value={{ mode: 'live', onLead }}>
            <Render config={puckConfig} data={current.data || EMPTY_PAGE_DATA} />
          </WebsiteRuntimeContext.Provider>
        ) : (
          <div className="p-20 text-center text-gray-400">This page is empty.</div>
        )}
      </main>
    </div>
  )
}
