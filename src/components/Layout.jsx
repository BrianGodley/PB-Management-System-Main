import { useState, useRef, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const navItems = [
  { path: '/',              label: 'Dashboard',    icon: '🏠' },
  { path: '/clients',       label: 'Clients',      icon: '👥' },
  { path: '/bids',          label: 'Bids',         icon: '📋' },
  { path: '/jobs',          label: 'Jobs',         icon: '🔨' },
  { path: '/collections',   label: 'Finance',      icon: '🏦' },
  { path: '/statistics',    label: 'Statistics',   icon: '📈' },
  { path: '/portal/subs',   label: 'Subs & Vendors', icon: '🔧' },
  { path: '/training',      label: 'Training',       icon: '🎓' },
  { path: '/hr',            label: 'HR',             icon: '🏢' },
]

const forestGreen = '#3A5038'
const forestGreenDark = '#2E4030'
const forestGreenHover = '#4A6347'

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
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen,  setMobileMenuOpen]  = useState(false)
  const [showUserMenu,    setShowUserMenu]    = useState(false)
  const [isAdmin,         setIsAdmin]         = useState(false)
  const [avatarUrl,       setAvatarUrl]       = useState(null)
  const [companyLogoUrl,  setCompanyLogoUrl]  = useState(null)
  const userMenuRef = useRef(null)

  // Fetch profile (admin status + avatar)
  const fetchProfile = () => {
    if (!user?.id) return
    supabase.from('profiles').select('role, avatar_url').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) {
          setIsAdmin(data.role === 'admin')
          setAvatarUrl(data.avatar_url || null)
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

  // Listen for logo updates from Admin
  useEffect(() => {
    const handler = () => fetchCompanyLogo()
    window.addEventListener('company-logo-updated', handler)
    return () => window.removeEventListener('company-logo-updated', handler)
  }, [])

  // Re-fetch when Profile page signals an update
  useEffect(() => {
    const handler = () => fetchProfile()
    window.addEventListener('profile-updated', handler)
    return () => window.removeEventListener('profile-updated', handler)
  }, [user?.id])

  useEffect(() => {
    function handleClickOutside(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">

      {/* ── TOP BAR: full width across entire screen ── */}
      <header
        style={{ backgroundColor: forestGreen }}
        className="w-full sticky top-0 z-50 shadow-md"
      >
        {/* Main top row */}
        <div className="flex items-center h-14 px-4 gap-4">

          {/* Logo + system name */}
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
            <img
              src={companyLogoUrl || '/logo.png'}
              alt="Logo"
              className="h-9 w-9 object-contain rounded"
              onError={e => { e.target.style.display = 'none' }}
            />
            <span className="text-white font-semibold text-sm tracking-wide hidden sm:inline">
              Picture Build System
            </span>
          </Link>

          {/* Top bar is screen-specific — nav lives in the left sidebar */}
          <div className="flex-1" />

          {/* Right side: portal links + Admin + user */}
          <div className="flex items-center gap-1 ml-auto">
            <Link
              to="/admin"
              style={isActive('/admin') ? { backgroundColor: forestGreenDark } : {}}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-white/80 hover:text-white hover:bg-black/20 transition-colors"
            >
              🛡️ <span className="hidden sm:inline">Admin</span>
            </Link>
            {/* User avatar dropdown */}
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
                  <Link
                    to="/profile"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    👤 Profile
                  </Link>
                  <Link
                    to="/master-rates"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    📊 Master Rates
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

            {/* Mobile hamburger */}
            <button
              className="lg:hidden p-2 rounded-md text-white/80 hover:text-white hover:bg-black/20 transition-colors ml-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <div className="space-y-1.5">
                <span className={`block w-5 h-0.5 bg-white transition-transform ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
                <span className={`block w-5 h-0.5 bg-white transition-opacity ${mobileMenuOpen ? 'opacity-0' : ''}`}></span>
                <span className={`block w-5 h-0.5 bg-white transition-transform ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
              </div>
            </button>
          </div>
        </div>

        {/* Mobile dropdown nav */}
        {mobileMenuOpen && (
          <div
            style={{ backgroundColor: forestGreenDark, borderTop: '1px solid rgba(255,255,255,0.1)' }}
            className="lg:hidden px-4 py-2 space-y-0.5"
          >
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                style={isActive(item.path) ? { backgroundColor: forestGreen } : {}}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-white/80 hover:text-white transition-colors"
              >
                <span>{item.icon}</span> {item.label}
              </Link>
            ))}
            <div className="pt-1 border-t border-white/10 mt-1 space-y-0.5">
              <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-white/70 hover:text-white">🛡️ Admin</Link>
              <button onClick={handleSignOut} className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-white/70 hover:text-white">🚪 Sign Out</button>
            </div>
          </div>
        )}
      </header>

      {/* ── BODY: sidebar + content ── */}
      <div className="flex flex-1 min-h-0">

        {/* LEFT SIDEBAR — white, no color */}
        <aside className="hidden lg:flex flex-col w-32 bg-white border-r border-gray-200 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
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

          {/* Sidebar footer */}
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
        <main className="flex-1 min-w-0 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
