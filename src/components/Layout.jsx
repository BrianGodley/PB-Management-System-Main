import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLang } from '../contexts/LanguageContext'
import { supabase } from '../lib/supabase'
import {
  applyBackgroundForPath,
  readModuleBackgrounds,
  MODULE_BG_LS_KEY,
  SIDEBAR_KEY,
  SIDEBAR_ICONS_KEY,
  SIDEBAR_FONT_KEY,
  MENU_POS_KEY,
  MENU_GROUPS_KEY,
  buildMenuStructure,
  sidebarFontStyle,
  sidebarNavColor,
  HEADER_KEY,
  HEADER_DEFAULT,
  headerNavColor,
  bgIdForPath,
  BACKGROUNDS,
  withDefaults,
} from '../lib/dashboardBackgrounds'
import SamChat from './SamChat'
import ReportIssueModal from './ReportIssueModal'
import CONavModal from './CONavModal'
import ScheduleModal from './ScheduleModal'
import SkidSteerIcon from './icons/SkidSteerIcon'
import OrgChartIcon from './icons/OrgChartIcon'
import OpportunitiesIcon from './icons/OpportunitiesIcon'
import WeeklyFPIcon from './icons/WeeklyFPIcon'
import AccountingIcon from './icons/AccountingIcon'
import ContactsIcon from './icons/ContactsIcon'
import DashboardIcon from './icons/DashboardIcon'
import HRIcon from './icons/HRIcon'

const navItems = [
  { path: '/', label: 'Dashboard', icon: <DashboardIcon /> },
  { path: '/org-chart', label: 'Org Chart', icon: <OrgChartIcon /> },
  { path: '/hr', label: 'HR', icon: <HRIcon /> },
  { path: '/training', label: 'Training', icon: '🎓' },
  { path: '/contacts', label: 'Contacts', icon: <ContactsIcon /> },
  { path: '/clients', label: 'Opportunities', icon: <OpportunitiesIcon /> },
  { path: '/edocuments', label: 'Documents', icon: '📄' },
  { path: '/accounting', label: 'Accounting', icon: <AccountingIcon /> },
  { path: '/collections', label: 'Weekly FP', icon: <WeeklyFPIcon /> },
  { path: '/design', label: 'Design', icon: '📐' },
  { path: '/bids', label: 'Bids', icon: '📋' },
  { path: '/jobs', label: 'Jobs', icon: '🏡' },
  { path: '/equipment-tracking', label: 'Equipment', icon: <SkidSteerIcon /> },
  { path: '/portal/subs', label: 'Subs & Vendors', icon: '🧑‍🔧' },
  { path: '/statistics', label: 'Statistics', icon: '📈' },
]

// Dock and main menu labels are computed inside the component via t()
// so they update when the user's language changes.

const forestGreen = '#4E7B4C'
const forestGreenDark = '#3A5038'

// Mobile screen titles shown centered in the green bar. Longest path prefix
// wins (so /portal/subs beats /portal). '/' matches Dashboard exactly.
const SCREEN_TITLES = [
  ['/portal/subs', 'Subs & Vendors'],
  ['/daily-logs', 'Daily Logs'],
  ['/timeclock', 'Time Clock'],
  ['/contacts', 'Contacts'],
  ['/clients', 'Opportunities'],
  ['/collections', 'Weekly FP'],
  ['/edocuments', 'Documents'],
  ['/statistics', 'Statistics'],
  ['/design', 'Design'],
  ['/bids', 'Bids'],
  ['/jobs', 'Jobs'],
  ['/info', 'Job Info'],
  ['/hr', 'Employees'],
  ['/org-chart', 'Org Chart'],
  ['/training', 'Training'],
  ['/accounting', 'Accounting'],
  ['/equipment-tracking', 'Equipment'],
  ['/admin', 'Admin'],
  ['/customize', 'Customize'],
  ['/help', 'Help Desk'],
]
function screenTitle(path) {
  if (path === '/') return 'Dashboard'
  let best = null
  let bestLen = 0
  for (const [p, title] of SCREEN_TITLES) {
    if ((path === p || path.startsWith(p + '/')) && p.length > bestLen) {
      best = title
      bestLen = p.length
    }
  }
  return best
}

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
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showHelpMenu, setShowHelpMenu] = useState(false)
  const [showReportIssue, setShowReportIssue] = useState(false)
  // The left nav's collapsed/expanded state is the user's choice alone:
  // it defaults to expanded and only changes when the user clicks the
  // collapse toggle — navigation (including entering /jobs) never touches
  // it. The preference is persisted in localStorage so it survives reloads.
  // A dedicated key guarantees everyone starts expanded until they opt in.
  const [navCollapsed, setNavCollapsed] = useState(() => {
    try {
      return localStorage.getItem('navCollapsedPref') === '1'
    } catch {
      return false
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem('navCollapsedPref', navCollapsed ? '1' : '0')
    } catch {}
  }, [navCollapsed])

  // Tooltip for the collapsed nav. Lives at the document.body level via
  // a React portal so it can poke out past the sidebar's overflow-y-auto
  // (which would otherwise clip any absolutely-positioned child).
  const [navTip, setNavTip] = useState(null) // { label, top } | null

  // Change-order quick-nav + schedule modals (opened from the dock / More)
  const [showCONav, setShowCONav] = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)

  // Translated dock + main-menu items (re-computed whenever t() changes)
  const DOCK_ITEMS = [
    { key: 'schedule', label: 'Schedule', icon: '📅', onClick: () => setShowSchedule(true) },
    { to: '/timeclock', label: t('timeClock'), icon: '⏱️' },
    { to: '/jobs', label: t('jobs'), icon: '🏡' },
    { to: '/daily-logs', label: t('dailyLogs'), icon: '📋' },
    { key: 'main', label: 'More', icon: '⊞', onClick: () => setShowMainMenu(v => !v) },
  ]

  const [userRole, setUserRole] = useState(null)
  const isAdmin = userRole === 'admin' || userRole === 'super_admin'
  const MAIN_MENU_ITEMS = [
    { path: '/', label: 'Dashboard', icon: <DashboardIcon /> },
    { path: '/info', label: 'Job Info', icon: 'ℹ️' },
    { key: 'change-orders', label: 'Change Orders', icon: '🔄', onClick: () => setShowCONav(true) },
    { path: '/contacts', label: 'Contacts', icon: <ContactsIcon /> },
    { path: '/clients', label: t('clients'), icon: '👥' },
    { path: '/design', label: 'Design', icon: '📐' },
    { path: '/bids', label: 'Bids', icon: '📋' },
    { path: '/statistics', label: t('statistics'), icon: '📈' },
    { path: '/portal/subs', label: t('subsVendors'), icon: '🧑‍🔧' },
    { path: '/hr', label: 'Employees', icon: '🏢' },
  ]
  const [showMainMenu, setShowMainMenu] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(null)
  // Left menu bar color (from the per-user appearance map; null = transparent).
  const [sidebarBg, setSidebarBg] = useState(() => {
    try {
      return readModuleBackgrounds()[SIDEBAR_KEY] || null
    } catch {
      return null
    }
  })
  // Whether the left menu shows icons (default true).
  const [sidebarIcons, setSidebarIcons] = useState(() => {
    try {
      return readModuleBackgrounds()[SIDEBAR_ICONS_KEY] !== false
    } catch {
      return true
    }
  })
  // Left menu font settings { family, size, bold, italic }.
  const [sidebarFont, setSidebarFont] = useState(() => {
    try {
      return readModuleBackgrounds()[SIDEBAR_FONT_KEY] || null
    } catch {
      return null
    }
  })
  // Top header bar color. Undefined in the map = never set → default green.
  const [headerBg, setHeaderBg] = useState(() => {
    try {
      const m = readModuleBackgrounds()
      return m[HEADER_KEY] !== undefined ? m[HEADER_KEY] : HEADER_DEFAULT
    } catch {
      return HEADER_DEFAULT
    }
  })
  // Desktop menu position: 'left' | 'top' | 'right' | 'bottom'.
  const [menuPos, setMenuPos] = useState(() => {
    try {
      return readModuleBackgrounds()[MENU_POS_KEY] || 'left'
    } catch {
      return 'left'
    }
  })
  // User-defined menu groups (empty = built-in layout per position).
  const [menuGroups, setMenuGroups] = useState(() => {
    try {
      return readModuleBackgrounds()[MENU_GROUPS_KEY] || []
    } catch {
      return []
    }
  })
  // Collapsed state of sidebar groups, keyed by group id (default expanded).
  const [collapsedGroups, setCollapsedGroups] = useState({})
  const isGroupOpen = id => !collapsedGroups[id]
  const toggleGroup = id => setCollapsedGroups(s => ({ ...s, [id]: !s[id] }))
  // Which header nav group dropdown is open (Top menu mode).
  const [openNavGroup, setOpenNavGroup] = useState(null)
  // Background id of the current route's module (for nav contrast when the
  // sidebar is Clear and showing the page background).
  const [currentBgId, setCurrentBgId] = useState('none')
  const [companyLogoUrl, setCompanyLogoUrl] = useState(null)
  const userMenuRef = useRef(null)
  const helpMenuRef = useRef(null)
  const mainMenuRef = useRef(null)
  const navGroupRef = useRef(null)

  // Fetch profile (admin status + avatar)
  const fetchProfile = () => {
    if (!user?.id) return
    supabase
      .from('profiles')
      .select('role, avatar_url')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setAvatarUrl(data.avatar_url || null)
          setUserRole(data.role || null)
        }
      })
  }

  // Fetch company logo and apply as favicon
  const fetchCompanyLogo = () => {
    supabase
      .from('company_settings')
      .select('logo_url')
      .maybeSingle()
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

  // Per-module page backgrounds: load the user's saved route→background map
  // into localStorage, then apply the current route's background.
  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('dashboard_preferences')
      .select('module_backgrounds')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        const map = withDefaults(data?.module_backgrounds || {})
        try {
          localStorage.setItem(MODULE_BG_LS_KEY, JSON.stringify(map))
        } catch {
          /* ignore */
        }
        applyBackgroundForPath(window.location.pathname, map)
        setSidebarBg(map[SIDEBAR_KEY] || null)
        setHeaderBg(map[HEADER_KEY] !== undefined ? map[HEADER_KEY] : HEADER_DEFAULT)
        setSidebarIcons(map[SIDEBAR_ICONS_KEY] !== false); setSidebarFont(map[SIDEBAR_FONT_KEY] || null)
        setMenuPos(map[MENU_POS_KEY] || 'left')
        setMenuGroups(map[MENU_GROUPS_KEY] || [])
        setCurrentBgId(bgIdForPath(window.location.pathname, map))
      })
  }, [user?.id])

  // Re-apply on every route change + when the Customize page saves (it writes
  // localStorage and dispatches 'module-backgrounds-updated').
  useEffect(() => {
    const map = readModuleBackgrounds()
    applyBackgroundForPath(location.pathname, map)
    setSidebarBg(map[SIDEBAR_KEY] || null)
    setHeaderBg(map[HEADER_KEY] !== undefined ? map[HEADER_KEY] : HEADER_DEFAULT)
    setSidebarIcons(map[SIDEBAR_ICONS_KEY] !== false); setSidebarFont(map[SIDEBAR_FONT_KEY] || null)
    setMenuPos(map[MENU_POS_KEY] || 'left')
    setMenuGroups(map[MENU_GROUPS_KEY] || [])
    setCurrentBgId(bgIdForPath(location.pathname, map))
  }, [location.pathname])
  useEffect(() => {
    const handler = () => {
      const map = readModuleBackgrounds()
      applyBackgroundForPath(window.location.pathname, map)
      setSidebarBg(map[SIDEBAR_KEY] || null)
      setHeaderBg(map[HEADER_KEY] !== undefined ? map[HEADER_KEY] : HEADER_DEFAULT)
      setSidebarIcons(map[SIDEBAR_ICONS_KEY] !== false); setSidebarFont(map[SIDEBAR_FONT_KEY] || null)
      setMenuPos(map[MENU_POS_KEY] || 'left')
      setMenuGroups(map[MENU_GROUPS_KEY] || [])
      setCurrentBgId(bgIdForPath(window.location.pathname, map))
    }
    window.addEventListener('module-backgrounds-updated', handler)
    return () => window.removeEventListener('module-backgrounds-updated', handler)
  }, [])

  // Auto nav text/tint: from the sidebar color if set, else from the page
  // background's darkness when the sidebar is Clear.
  const navTheme = sidebarBg
    ? sidebarNavColor(sidebarBg)
    : BACKGROUNDS.find(b => b.id === currentBgId)?.dark
      ? { text: '#f9fafb', dark: true }
      : { text: undefined, dark: false }
  const navActivePill = navTheme.dark ? 'bg-white/20' : 'bg-black/10'
  const navHoverPill = navTheme.dark ? 'hover:bg-white/15' : 'hover:bg-black/5'
  const navTextStyle = navTheme.text ? { color: navTheme.text } : undefined
  const navFontStyle = sidebarFontStyle(sidebarFont)
  const navItemStyle =
    navTextStyle || navFontStyle ? { ...navTextStyle, ...navFontStyle } : undefined

  // Desktop menu-position derived flags.
  const menuOnRight = menuPos === 'right'
  const menuOnTop = menuPos === 'top'
  const menuOnBottom = menuPos === 'bottom'
  const showSidebar = menuPos === 'left' || menuOnRight // vertical sidebar modes
  const desktopTitle = screenTitle(location.pathname)

  // User-defined menu groups. When present they drive every menu position;
  // otherwise each position falls back to its built-in layout.
  const useCustomGroups = Array.isArray(menuGroups) && menuGroups.length > 0
  const menuStructure = buildMenuStructure(navItems, menuGroups)
  // Top-position entries: driven entirely by the user's Menu grouping. With no
  // groups defined every item shows flat (no hard-coded preset groups).
  const topEntries = menuStructure

  // In Top menu mode the nav lives in the header, so the Menu Background color
  // colors the header bar itself (falling back to the Header bar color when no
  // menu color is set). Other positions just use the Header bar color.
  const headerColor = menuOnTop && sidebarBg ? sidebarBg : headerBg

  // Auto header text/tint: from the header color if set, else (Clear) from the
  // page background's darkness. Mirrors the sidebar's auto-contrast.
  const headerTheme = headerColor
    ? headerNavColor(headerColor)
    : BACKGROUNDS.find(b => b.id === currentBgId)?.dark
      ? { text: '#f9fafb', dark: true }
      : { text: '#1f2937', dark: false }
  const headerText = headerTheme.text || '#ffffff'
  const headerTextStyle = { color: headerText }
  const headerActiveBg = headerTheme.dark ? 'rgba(0,0,0,0.28)' : 'rgba(0,0,0,0.10)'
  const headerHoverPill = headerTheme.dark ? 'hover:bg-black/20' : 'hover:bg-black/10'

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

  // ── Keep the Supabase connection warm ───────────────────────────────────────
  // After ~1–2 idle minutes the browser closes its HTTP/2 connection to
  // Supabase. The next burst of queries then stalls ~3s waiting for a fresh TLS
  // handshake (visible as "Stalled" time in DevTools). A cheap HEAD request
  // every 45s — plus an immediate one whenever the tab regains focus — keeps the
  // connection and the backend warm so navigation stays instant.
  useEffect(() => {
    let stopped = false
    const ping = () => {
      if (stopped) return
      supabase
        .from('company_settings')
        .select('id', { head: true, count: 'exact' })
        .then(
          () => {},
          () => {}
        )
    }
    const id = setInterval(ping, 45000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') ping()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      stopped = true
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  // Close user menu on outside click
  useEffect(() => {
    function handleClick(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Close help menu on outside click
  useEffect(() => {
    if (!showHelpMenu) return
    function handleClick(e) {
      if (helpMenuRef.current && !helpMenuRef.current.contains(e.target)) setShowHelpMenu(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showHelpMenu])

  // Close the Top-menu nav-group dropdown on outside click.
  useEffect(() => {
    if (!openNavGroup) return
    function handleClick(e) {
      if (navGroupRef.current && !navGroupRef.current.contains(e.target)) setOpenNavGroup(null)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [openNavGroup])

  // Close main menu on outside click
  useEffect(() => {
    function handleClick(e) {
      if (mainMenuRef.current && !mainMenuRef.current.contains(e.target)) setShowMainMenu(false)
    }
    if (showMainMenu) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showMainMenu])

  // Close main menu on route change
  useEffect(() => {
    setShowMainMenu(false)
  }, [location.pathname])

  // Turn off the browser's autofill / contact-suggestion overlay on every form
  // field in the app (it kept popping up over inputs on mobile). Applies to
  // fields that exist now and any added later (e.g. modals). Login lives
  // outside this Layout, so its autofill is unaffected.
  useEffect(() => {
    // Text-like inputs that browsers try to autofill (name/email/phone/etc.).
    const TEXTY = new Set(['', 'text', 'email', 'tel', 'url', 'search', 'number', 'password'])
    const off = el => {
      if (el.dataset.autofillOff) return
      el.dataset.autofillOff = '1'
      // Attribute hints (history + password managers).
      el.setAttribute('autocomplete', 'off')
      el.setAttribute('autocorrect', 'off')
      el.setAttribute('autocapitalize', 'off')
      el.setAttribute('data-lpignore', 'true') // LastPass
      el.setAttribute('data-1p-ignore', 'true') // 1Password
      el.setAttribute('data-bwignore', 'true') // Bitwarden
      el.setAttribute('data-form-type', 'other') // Dashlane

      // Readonly-until-focus: the browser's native contact/address autofill
      // ignores autocomplete="off", but it NEVER autofills a readonly field.
      // We add readonly up front and remove it the moment the field is focused,
      // so by the time the user can type it's a normal editable input — but the
      // autofill overlay never gets a chance to appear. Skip if the field is
      // already focused (e.g. autoFocus) so we don't trap it.
      const isText =
        el.tagName === 'TEXTAREA' ||
        (el.tagName === 'INPUT' && TEXTY.has((el.getAttribute('type') || '').toLowerCase()))
      if (isText && document.activeElement !== el) {
        el.setAttribute('readonly', '')
        const wake = () => el.removeAttribute('readonly')
        // focus fires for taps, clicks and keyboard tabbing; removing readonly
        // here keeps the keyboard/caret working normally.
        el.addEventListener('focus', wake, { once: true })
      }
    }
    const scan = node => {
      if (!node || node.nodeType !== 1) return
      if (node.matches?.('input, textarea, select')) off(node)
      node.querySelectorAll?.('input, textarea, select').forEach(off)
    }
    scan(document.body)
    const obs = new MutationObserver(muts => {
      for (const m of muts) m.addedNodes.forEach(scan)
    })
    obs.observe(document.body, { childList: true, subtree: true })
    return () => obs.disconnect()
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const isActive = path => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  // Dock active state
  const dockActive = to => {
    if (!to) return false
    if (to === '/jobs') return location.pathname === '/jobs'
    return location.pathname === to
  }

  // A single sidebar nav link (shared by the flat list and grouped sections).
  const renderNavLink = (item, indent = false) => (
    <Link
      key={item.path}
      to={item.path}
      onMouseEnter={e => {
        if (!navCollapsed) return
        const r = e.currentTarget.getBoundingClientRect()
        setNavTip({ label: item.label, top: r.top + r.height / 2 })
      }}
      onMouseLeave={() => setNavTip(null)}
      style={navItemStyle}
      className={`flex items-center ${navCollapsed ? 'justify-center' : 'gap-2'} ${
        indent && !navCollapsed ? 'pl-5' : ''
      } px-2 py-2 rounded-lg text-xs font-semibold text-gray-800 transition-colors ${
        isActive(item.path) ? navActivePill : navHoverPill
      }`}
    >
      {(sidebarIcons || navCollapsed) && <span className="text-sm">{item.icon}</span>}
      {!navCollapsed && item.label}
    </Link>
  )

  return (
    /* 100dvh (dynamic viewport height) matches the *visible* area on mobile, so
       the page itself never scrolls and drags the header — only <main> scrolls.
       Inline style wins on modern browsers; the h-screen class is the fallback
       where dvh isn't supported. */
    <div id="app-shell" className="h-screen flex flex-col bg-gray-100" style={{ height: '100dvh' }}>
      {/* Floating tooltip portal — attached to <body> so the sidebar's
          overflow-y-auto can't clip it. Driven by hover on each collapsed
          nav item. left: 56 = w-12 sidebar (48px) + 8px margin. */}
      {navTip &&
        navCollapsed &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              left: 56,
              top: navTip.top,
              transform: 'translateY(-50%)',
              zIndex: 9999,
            }}
            className="px-2 py-1 rounded-md bg-gray-900 text-white text-[11px] font-semibold whitespace-nowrap shadow-lg pointer-events-none"
          >
            {navTip.label}
          </div>,
          document.body
        )}

      {/* ── TOP BAR ── */}
      <header
        style={{ backgroundColor: headerColor || 'transparent' }}
        className={`w-full flex-shrink-0 sticky top-0 z-50 ${headerColor ? 'shadow-md' : ''}`}
      >
        <div className="relative flex items-center h-11 px-4 gap-4">
          {/* Logo + system name — desktop only (mobile shows Sam in this spot). */}
          <Link to="/" className="hidden lg:flex items-center gap-2.5 flex-shrink-0">
            <img
              src={companyLogoUrl || '/logo.png'}
              alt="Logo"
              className="h-6 w-6 object-contain rounded"
              onError={e => {
                e.target.style.display = 'none'
              }}
            />
            <span
              style={headerTextStyle}
              className="font-semibold text-sm tracking-wide hidden sm:inline"
            >
              Picture Build System
            </span>
          </Link>

          {/* Sam — AI assistant trigger (shown on all sizes; on mobile it sits
              top-left in place of the logo/Dashboard link). */}
          <SamChat />

          {/* Mobile: screen name truly centered across the full bar (absolute so
              it doesn't shift with the left/right button widths). */}
          {screenTitle(location.pathname) && (
            <span
              style={headerTextStyle}
              className="lg:hidden absolute left-1/2 -translate-x-1/2 font-semibold text-sm truncate max-w-[60%] text-center pointer-events-none"
            >
              {screenTitle(location.pathname)}
            </span>
          )}

          {/* Desktop page title — for Left/Right/Bottom menu positions the page
              title moves up into the header, center-justified. */}
          {!menuOnTop && desktopTitle && (
            <span
              style={headerTextStyle}
              className="hidden lg:block absolute left-1/2 -translate-x-1/2 text-xl font-bold text-center pointer-events-none truncate max-w-[40%]"
            >
              {desktopTitle}
            </span>
          )}

          {/* Top menu position — grouped nav lives centered in the header.
              Groups open their dropdown on hover; the dropdown is flush under
              the label so the cursor can travel into it. */}
          {menuOnTop && (
            <nav
              ref={navGroupRef}
              className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center gap-1"
            >
              {topEntries.map(g => {
                if (g.type === 'single') {
                  const it = g.item
                  if (!it) return null
                  return (
                    <Link
                      key={it.path}
                      to={it.path}
                      style={{
                        color: headerText,
                        ...navFontStyle,
                        ...(isActive(it.path) ? { backgroundColor: headerActiveBg } : {}),
                      }}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-lg font-semibold whitespace-nowrap ${headerHoverPill}`}
                    >
                      {it.label}
                    </Link>
                  )
                }
                const groupActive = g.items.some(it => isActive(it.path))
                return (
                  <div key={g.id || g.label} className="relative group">
                    <button
                      style={{
                        color: headerText,
                        ...navFontStyle,
                        ...(groupActive ? { backgroundColor: headerActiveBg } : {}),
                      }}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-lg font-semibold whitespace-nowrap ${headerHoverPill}`}
                    >
                      {g.label}
                      <span className="text-sm opacity-50">▾</span>
                    </button>
                    <div className="hidden group-hover:block absolute left-1/2 -translate-x-1/2 top-full w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
                      {g.items.map(it => (
                        <Link
                          key={it.path}
                          to={it.path}
                          style={navFontStyle}
                          className={`flex items-center gap-2.5 px-4 py-2.5 text-base hover:bg-gray-50 ${
                            isActive(it.path)
                              ? 'text-green-700 font-semibold bg-green-50'
                              : 'text-gray-700'
                          }`}
                        >
                          <span className="w-5 inline-flex justify-center">{it.icon}</span>
                          {it.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )
              })}
            </nav>
          )}

          {/* Centre slot — pages portal content here (desktop). */}
          <div className="flex-1 flex justify-center items-center min-w-0" id="app-header-center" />

          {/* Right: mobile close (X) for screens with a green-bar title */}
          {screenTitle(location.pathname) && (
            <button
              onClick={() => navigate(-1)}
              aria-label="Close"
              style={headerTextStyle}
              className="lg:hidden ml-auto w-8 h-8 rounded-full hover:bg-black/15 flex items-center justify-center text-lg flex-shrink-0"
            >
              ✕
            </button>
          )}

          {/* Right: Admin + user dropdown (desktop) */}
          <div className="flex items-center gap-1 ml-auto">
            {/* Top-bar Admin link — desktop only. On mobile, Admin lives in
                the main menu (gated by isAdmin). */}
            <Link
              to="/admin"
              style={{ color: headerText, ...(isActive('/admin') ? { backgroundColor: headerActiveBg } : {}) }}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${headerHoverPill}`}
            >
              🛡️ <span className="hidden sm:inline">Admin</span>
            </Link>

            {/* Help dropdown — Documentation, Video Guides, Report Issue,
                and (admins only) Help Desk for ticket administration. */}
            <div ref={helpMenuRef} className="relative hidden sm:block">
              <button
                onClick={() => setShowHelpMenu(v => !v)}
                style={{ color: headerText, ...(isActive('/help') || isActive('/documentation') || isActive('/video-guides')
                  ? { backgroundColor: headerActiveBg } : {}) }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${headerHoverPill}`}
                aria-haspopup="true"
                aria-expanded={showHelpMenu}
              >
                🛟 <span className="hidden sm:inline">Help</span>
                <span className="text-[10px] opacity-50">▾</span>
              </button>
              {showHelpMenu && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
                  <Link
                    to="/documentation"
                    onClick={() => setShowHelpMenu(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    📘 Documentation
                  </Link>
                  <Link
                    to="/video-guides"
                    onClick={() => setShowHelpMenu(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    🎬 Video Guides
                  </Link>
                  <button
                    onClick={() => { setShowHelpMenu(false); setShowReportIssue(true) }}
                    className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    🎫 Report Issue
                  </button>
                  {isAdmin && (
                    <>
                      <div className="border-t border-gray-100 my-1" />
                      <Link
                        to="/help"
                        onClick={() => setShowHelpMenu(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        🛟 Help Desk
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* User avatar dropdown — desktop only */}
            <div
              ref={userMenuRef}
              className="relative hidden md:block pl-3 ml-1 border-l border-white/20"
            >
              <button
                onClick={() => setShowUserMenu(v => !v)}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <div
                  style={!avatarUrl ? { backgroundColor: forestGreenDark } : {}}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white overflow-hidden flex-shrink-0"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    user?.email?.[0]?.toUpperCase() || 'U'
                  )}
                </div>
                <span style={headerTextStyle} className="text-xs truncate max-w-[140px] opacity-80">{user?.email}</span>
                <span style={headerTextStyle} className="text-xs opacity-50">▾</span>
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
                    to="/customize"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    🎨 Customize
                  </Link>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={() => {
                      setShowUserMenu(false)
                      handleSignOut()
                    }}
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
      <div className={`flex flex-1 min-h-0 ${menuOnBottom ? 'flex-col' : ''}`}>
        {/* SIDEBAR — desktop only, shown for Left/Right menu positions.
            order-last shifts it to the right edge when menuPos === 'right'. */}
        <aside
          style={sidebarBg ? { backgroundColor: sidebarBg } : undefined}
          className={`group ${showSidebar ? 'hidden lg:flex' : 'hidden'} ${
            menuOnRight ? 'order-last' : ''
          } flex-col bg-transparent sticky top-11 h-[calc(100vh-2.75rem)] overflow-y-auto transition-[width] duration-200 ${
            navCollapsed ? 'w-12' : 'w-32'
          }`}
        >
          {/* Collapse / expand toggle */}
          <button
            onClick={() => setNavCollapsed(v => !v)}
            title={navCollapsed ? 'Expand menu' : 'Collapse menu'}
            style={navTextStyle}
            className={`self-end m-1 p-1 rounded-md text-gray-400 ${navHoverPill} opacity-0 group-hover:opacity-100 transition-opacity`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {navCollapsed ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              )}
            </svg>
          </button>

          <nav className="flex-1 px-1.5 py-1 space-y-0.5">
            {useCustomGroups && !navCollapsed
              ? menuStructure.map(e =>
                  e.type === 'single' ? (
                    renderNavLink(e.item)
                  ) : (
                    <div key={e.id}>
                      <button
                        onClick={() => toggleGroup(e.id)}
                        style={navItemStyle}
                        className={`w-full flex items-center justify-between px-2 py-2 rounded-lg text-xs font-semibold text-gray-800 transition-colors ${navHoverPill}`}
                      >
                        <span className="truncate">{e.label}</span>
                        <span className="text-[10px] opacity-60 ml-1">{isGroupOpen(e.id) ? '▾' : '▸'}</span>
                      </button>
                      {isGroupOpen(e.id) && (
                        <div className="space-y-0.5 mt-0.5">
                          {e.items.map(it => renderNavLink(it, true))}
                        </div>
                      )}
                    </div>
                  )
                )
              : navItems.map(item => renderNavLink(item))}
          </nav>
          <div className={`px-1.5 py-3 border-t ${navTheme.dark ? 'border-white/20' : 'border-black/10'}`}>
            <button
              onClick={handleSignOut}
              onMouseEnter={e => {
                if (!navCollapsed) return
                const r = e.currentTarget.getBoundingClientRect()
                setNavTip({ label: 'Sign Out', top: r.top + r.height / 2 })
              }}
              onMouseLeave={() => setNavTip(null)}
              style={navTextStyle}
              className={`w-full flex items-center ${navCollapsed ? 'justify-center' : 'gap-2'} px-2 py-2 rounded-lg text-xs font-semibold text-gray-800 transition-colors ${navHoverPill}`}
            >
              <span>🚪</span>
              {!navCollapsed && <span>Sign Out</span>}
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        {/* overflow-x-hidden: a too-wide page (e.g. a detail view) can't push the
            layout — and the fixed bottom dock — wider than the screen.
            overscroll-none: the scroll box stops rubber-banding off the header. */}
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden overscroll-none p-2 pb-24 lg:px-6 lg:pb-6 lg:pt-9">
          <Outlet />
        </main>

        {/* DESKTOP BOTTOM NAV — horizontal menu bar for the Bottom position.
            With custom groups, each group becomes an "up" dropdown that opens
            above the bar; overflow stays visible so it isn't clipped. */}
        {menuOnBottom && (
          <nav
            style={sidebarBg ? { backgroundColor: sidebarBg } : undefined}
            className={`hidden lg:flex flex-shrink-0 items-center gap-1 border-t border-black/10 px-3 py-1.5 ${
              useCustomGroups ? 'overflow-visible flex-wrap' : 'overflow-x-auto'
            }`}
          >
            {(useCustomGroups
              ? menuStructure.map(e =>
                  e.type === 'single' ? (
                    <Link
                      key={e.item.path}
                      to={e.item.path}
                      style={navItemStyle}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex-shrink-0 text-gray-800 transition-colors ${
                        isActive(e.item.path) ? navActivePill : navHoverPill
                      }`}
                    >
                      {sidebarIcons && <span className="text-sm">{e.item.icon}</span>}
                      {e.item.label}
                    </Link>
                  ) : (
                    <div key={e.id} className="relative group flex-shrink-0">
                      <button
                        style={navItemStyle}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap text-gray-800 transition-colors ${
                          e.items.some(it => isActive(it.path)) ? navActivePill : navHoverPill
                        }`}
                      >
                        {e.label}
                        <span className="text-[10px] opacity-60">▴</span>
                      </button>
                      <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-52 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
                        {e.items.map(it => (
                          <Link
                            key={it.path}
                            to={it.path}
                            className={`flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-gray-50 ${
                              isActive(it.path) ? 'text-green-700 font-semibold bg-green-50' : 'text-gray-700'
                            }`}
                          >
                            {sidebarIcons && <span className="w-5 inline-flex justify-center">{it.icon}</span>}
                            {it.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )
                )
              : navItems.map(item => (
                  <Link
                    key={item.path}
                    to={item.path}
                    style={navItemStyle}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex-shrink-0 text-gray-800 transition-colors ${
                      isActive(item.path) ? navActivePill : navHoverPill
                    }`}
                  >
                    {sidebarIcons && <span className="text-sm">{item.icon}</span>}
                    {item.label}
                  </Link>
                )))}
            <button
              onClick={handleSignOut}
              style={navTextStyle}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex-shrink-0 text-gray-800 transition-colors ${navHoverPill}`}
            >
              <span>🚪</span> Sign Out
            </button>
          </nav>
        )}
      </div>

      {/* ── MOBILE BOTTOM DOCK ──
           z-40 (not z-50): sits above page content but BELOW standard modals
           (z-50+), so a modal's bottom confirm buttons are never covered by the
           dock. The More-menu sheet below is z-50, so it still floats above. */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 flex"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {DOCK_ITEMS.map(item => {
          if (item.onClick) {
            const active =
              (item.key === 'main' && showMainMenu) ||
              (item.key === 'schedule' && showSchedule)
            return (
              <button
                key={item.key}
                onClick={item.onClick}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors ${
                  active ? 'text-green-700 bg-green-50' : 'text-gray-500'
                }`}
              >
                <span className="text-lg leading-none">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            )
          }
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors ${
                dockActive(item.to)
                  ? 'text-green-700 bg-green-50'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
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
            {/* Close (X) — upper right */}
            <button
              onClick={() => setShowMainMenu(false)}
              aria-label="Close menu"
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">
              {t('mainMenu')}
            </p>

            <div className="grid grid-cols-3 gap-3">
              {MAIN_MENU_ITEMS.map(item => {
                const tileClass = `flex flex-col items-center gap-1.5 py-4 rounded-2xl border text-center transition-colors ${
                  item.path && isActive(item.path)
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-gray-50 border-gray-200 text-gray-700 active:bg-gray-100'
                }`
                // Action tiles (e.g. Change Orders) run an onClick instead of navigating.
                if (item.onClick) {
                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        setShowMainMenu(false)
                        item.onClick()
                      }}
                      className={tileClass}
                    >
                      <span className="text-2xl leading-none">{item.icon}</span>
                      <span className="text-xs font-semibold leading-tight">{item.label}</span>
                    </button>
                  )
                }
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setShowMainMenu(false)}
                    className={tileClass}
                  >
                    <span className="text-2xl leading-none">{item.icon}</span>
                    <span className="text-xs font-semibold leading-tight">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Schedule modal — opened from the mobile dock. */}
      {showSchedule && <ScheduleModal onClose={() => setShowSchedule(false)} />}

      {/* Change-order quick-nav modal — opened from the mobile dock. */}
      {showCONav && (
        <CONavModal
          onClose={() => setShowCONav(false)}
          onNavigate={url => {
            setShowCONav(false)
            navigate(url)
          }}
        />
      )}

      {/* Report Issue modal — opened from the Help dropdown. */}
      {showReportIssue && user && (
        <ReportIssueModal
          user={user}
          onClose={() => setShowReportIssue(false)}
          onCreated={() => setShowReportIssue(false)}
        />
      )}

    </div>
  )
}
