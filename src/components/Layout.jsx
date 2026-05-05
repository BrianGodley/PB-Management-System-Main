import { useState, useRef, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLang } from '../contexts/LanguageContext'
import { supabase } from '../lib/supabase'
import SamChat from './SamChat'

const navItems = [
  { path: '/contacts',            label: 'Contacts',          icon: '🗂️' },
  { path: '/clients',             label: 'Clients',           icon: '👥' },
  { path: '/design',              label: 'Design',            icon: '📐' },
  { path: '/bids',                label: 'Bids',              icon: '📋' },
  { path: '/jobs',                label: 'Jobs',              icon: '🔨' },
  { path: '/equipment-tracking',  label: 'Equipment',         icon: '🚜' },
  { path: '/collections',         label: 'Finance',           icon: '🏦' },
  { path: '/statistics',          label: 'Statistics',        icon: '📈' },
  { path: '/org-chart',           label: 'Org Chart',         icon: '🏗️' },
  { path: '/portal/subs',         label: 'Subs & Vendors',    icon: '🔧' },
  { path: '/training',            label: 'Training',          icon: '🎓' },
  { path: '/hr',                  label: 'HR',                icon: '🏢' },
  { path: '/accounting',          label: 'Accounting',        icon: '💼' },
]

// Dock and main menu labels are computed inside the component via t()
// so they update when the user's language changes.

const forestGreen = '#4E7B4C'
const forestGreenDark = '#3A5038'

function setFavicon(url) {
  let link = document.querySelector("link[rel~='icon']")
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.href = url
}

export default function Layout() {
  const { user, signOut } = useAuth()
  const { t } = useLang()
  const location = useLocation()
  const navigate = useNavigate()
  const [showUserMenu,   setShowUserMenu]   = useState(false)

  // Translated dock + main-menu items (re-computed whenever t() changes)
  const DOCK_ITEMS = [
    { to: '/daily-logs', label: t('dailyLogs'), icon: '📋' },
    { to: '/timeclock',  label: t('timeClock'), icon: '⏱️' },
    { to: '/jobs',       label: t('info'),       icon: 'ℹ️' },
    { key: 'main',       label: t('main'),       icon: '⊞' },
  ]

  const isAdmin = userRole === 'admin' || userRole === 'super_admin'
  const MAIN_MENU_ITEMS = [
    { path: '/contacts',    label: 'Contacts',       icon: '🗂️' },
    { path: '/clients',     label: t('clients'),     icon: '👥' },
    { path: '/design',      label: 'Design',         icon: '📐' },
    { path: '/bids',        label: 'Bids',           icon: '📋' },
    { path: '/jobs',        label: t('jobs'),        icon: '🔨' },
    { path: '/statistics',  label: t('statistics'),  icon: '📈' },
    { path: '/portal/subs', label: t('subsVendors'), icon: '🔧' },
    { path: '/hr',          label: t('hr') || 'HR',  icon: '🏢' },
    // Admin tile — only present when the signed-in user is an admin. Lives
    // in the mobile main menu instead of the desktop top bar so phones get
    // a single, consistent place to find every admin tool.
    ...(isAdmin ? [{ path: '/admin', label: 'Admin', icon: '🛡️' }] : []),
  ]
  const [showMainMenu,   setShowMainMenu]   = useState(false)
  const [avatarUrl,      setAvatarUrl]      = useState(null)
  const [companyLogoUrl, setCompanyLogoUrl] = useState(null)
  const [userRole,       setUserRole]       = useState(null)
  const userMenuRef  = useRef(null)
  const mainMenuRef  = useRef(null)

  // Fetch profile (admin status + avatar)
  const fetchProfile = () => {
    if (!user?.id) return
    supabase.from('profiles').select('role, avatar_url').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) {
          setAvatarUrl(data.avatar_url || null)
          setUserRole(data.role || null)
        }
      })
  }

  // Fetch company logo and apply as favicon
  const fetchCompanyLogo = () => {
    supabase.from('company_settings').select('logo_url').maybeSingle()
      .then(({ data }) => {
        if (data?.logo_url) {
          setCompanyLogoUrl(data.logo_url)
          setFavicon(data.logo_url)
        }
      })
  }

  useEffect(() => {
    fetchProfile()
    fetchCompanyLogo()
  }, [user?.id])

  useEffect(() => {
    const handler = () => fetchCompanyLogo()
    window.addEventListener('company-logo-updated', handler)
    return () => window.removeEventListener('company-logo-updated', handler)
  }, [])

  useEffect(() => {
    const handler = () => fetchProfile()
    window.addEventListener('profile-updated', handler)
    return () => window.removeEventListener('profile-updated', handler)
  }, [user?.id])

  // Close user menu on outside click
  useEffect(() => {
    function handleClick(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Close main menu on outside click
  useEffect(() => {
    function handleClick(e) {
      if (mainMenuRef.current && !mainMenuRef.current.contains(e.target)) setShowMainMenu(false)
    }
    if (showMainMenu) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showMainMenu])

  // Close main menu on route change
  useEffect(() => { setShowMainMenu(false) }, [location.pathname])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  // Dock active state
  const dockActive = (to) => {
    if (!to) return false
    if (to === '/jobs') return location.pathname === '/jobs'
    return location.pathname === to
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">

      {/* ── TOP BAR ── */}
      <header
        style={{ backgroundColor: forestGreen }}
        className="w-full sticky top-0 z-50 shadow-md"
      >
        <div className="flex items-center h-11 px-4 gap-4">

          {/* Logo + system name */}
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
            <img
              src={companyLogoUrl || '/logo.png'}
              alt="Logo"
              className="h-6 w-6 object-contain rounded"
              onError={e => { e.target.style.display = 'none' }}
            />
            <span className="text-white font-semibold text-sm tracking-wide hidden sm:inline">
              Picture Build System
            </span>
          </Link>

          {/* Centre slot — pages can portal content here */}
          <div className="flex-1 flex justify-center items-center" id="app-header-center" />

          {/* Right: Admin + user dropdown (desktop) */}
          <div className="flex items-center gap-1 ml-auto">
            {/* Top-bar Admin link — desktop only. On mobile, Admin lives in
                the main menu (gated by isAdmin). */}
            <Link
              to="/admin"
              style={isActive('/admin') ? { backgroundColor: forestGreenDark } : {}}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-white/80 hover:text-white hover:bg-black/20 transition-colors"
            >
              🛡️ <span className="hidden sm:inline">Admin</span>
            </Link>

            {/* User avatar dropdown — desktop only */}
            <div ref={userMenuRef} className="relative hidden md:block pl-3 ml-1 border-l border-white/20">
              <button
                onClick={() => setShowUserMenu(v => !v)}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <div
                  style={!avatarUrl ? { backgroundColor: forestGreenDark } : {}}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white overflow-hidden flex-shrink-0"
                >
                  {avatarUrl
                    ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                    : (user?.email?.[0]?.toUpperCase() || 'U')
                  }
                </div>
                <span className="text-white/60 text-xs truncate max-w-[140px]">{user?.email}</span>
                <span className="text-white/40 text-xs">▾</span>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
                  <Link to="/profile" onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                    👤 Profile
                  </Link>
                  <Link to="/master-rates" onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                    📊 Master Rates
                  </Link>
                  <Link to="/master-crews" onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                    👷 Master Crews
                  </Link>
                  <Link to="/master-equipment" onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                    🚜 Master Equipment
                  </Link>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={() => { setShowUserMenu(false); handleSignOut() }}
                    className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    🚪 Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── BODY: sidebar + content ── */}
      <div className="flex flex-1 min-h-0">

        {/* LEFT SIDEBAR — desktop only */}
        <aside className="hidden lg:flex flex-col w-32 bg-white border-r border-gray-200 sticky top-11 h-[calc(100vh-2.75rem)] overflow-y-auto">
          <nav className="flex-1 px-1.5 py-3 space-y-0.5">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive(item.path)
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="text-sm">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="px-1.5 py-3 border-t border-gray-100">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors"
            >
              🚪 Sign Out
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 min-w-0 overflow-y-auto p-6 pb-24 lg:pb-6">
          <Outlet />
        </main>
      </div>

      {/* ── MOBILE BOTTOM DOCK ── */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 flex"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {DOCK_ITEMS.map(item => {
          if (item.key === 'main') {
            return (
              <button
                key="main"
                onClick={() => setShowMainMenu(v => !v)}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
                  showMainMenu ? 'text-green-700 bg-green-50' : 'text-gray-500'
                }`}
              >
                <span className="text-xl leading-none">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            )
          }
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
                dockActive(item.to) ? 'text-green-700 bg-green-50' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <span className="text-xl leading-none">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* ── MOBILE MAIN MENU SHEET ──
           Slides up from above the dock when Main is tapped.
      ── */}
      {showMainMenu && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/30"
            onClick={() => setShowMainMenu(false)}
          />

          {/* Sheet */}
          <div
            ref={mainMenuRef}
            className="lg:hidden fixed bottom-16 inset-x-0 z-50 bg-white rounded-t-2xl shadow-2xl border-t border-gray-200 px-4 pt-4 pb-6"
            style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">{t('mainMenu')}</p>

            <div className="grid grid-cols-3 gap-3">
              {MAIN_MENU_ITEMS.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setShowMainMenu(false)}
                  className={`flex flex-col items-center gap-1.5 py-4 rounded-2xl border text-center transition-colors ${
                    isActive(item.path)
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : 'bg-gray-50 border-gray-200 text-gray-700 active:bg-gray-100'
                  }`}
                >
                  <span className="text-2xl leading-none">{item.icon}</span>
                  <span className="text-xs font-semibold leading-tight">{item.label}</span>
                </Link>
              ))}
            </div>

            {/* Sign out at bottom of sheet */}
            <button
              onClick={() => { setShowMainMenu(false); handleSignOut() }}
              className="w-full mt-4 py-3 rounded-xl border border-red-100 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
            >
              🚪 {t('signOut')}
            </button>
          </div>
        </>
      )}

      {/* Sam — floating AI assistant, available on every page */}
      <SamChat />
    </div>
  )
}
