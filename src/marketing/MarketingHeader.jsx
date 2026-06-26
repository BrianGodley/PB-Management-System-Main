// src/marketing/MarketingHeader.jsx
//
// Shared, locked (sticky) top nav for every public marketing page. Links route
// across pages so visitors can move back and forth from anywhere:
//   • hash links (/#features …) jump to a section on the landing page
//   • route links (/customization, /contractor-extensions) are full pages
//
// Used by MarketingLanding, Customization and ContractorExtensions.

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { PLATFORM_BRAND } from '../lib/brand'

const FG = '#2E8BC9'
const FG_DARK = '#1B5E8C'

const NAV = [
  ['Features', '/#features'],
  ['Pricing', '/pricing'],
  ['Customization', '/customization'],
  ['Contractor', '/contractor-extensions'],
  ['FAQ', '/#faq'],
]

function NavItem({ label, href, onClick, className }) {
  // Anchor links (contain #) use <a> so the browser handles hash scrolling and
  // cross-page jumps; pure routes use SPA <Link>.
  if (href.includes('#')) {
    return (
      <a href={href} onClick={onClick} className={className}>
        {label}
      </a>
    )
  }
  return (
    <Link to={href} onClick={onClick} className={className}>
      {label}
    </Link>
  )
}

export default function MarketingHeader() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <span
            className="inline-flex items-center justify-center rounded-xl overflow-hidden shadow w-9 h-9"
            style={{ backgroundColor: FG_DARK }}
          >
            <img src={PLATFORM_BRAND.logo} alt={PLATFORM_BRAND.name} className="w-full h-full object-contain p-1" />
          </span>
          <span className="font-bold text-lg tracking-tight">{PLATFORM_BRAND.name}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-gray-600">
          {NAV.map(([label, href]) => (
            <NavItem key={href} label={label} href={href} className="hover:text-gray-900 transition-colors" />
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <Link
              to="/"
              className="text-sm font-bold text-white rounded-xl px-4 py-2.5 shadow-sm hover:opacity-90 transition-opacity"
              style={{ backgroundColor: FG }}
            >
              Go to app →
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-sm font-semibold text-gray-700 hover:text-gray-900 px-3 py-2">
                Log in
              </Link>
              <Link
                to="/signup"
                className="text-sm font-bold text-white rounded-xl px-4 py-2.5 shadow-sm hover:opacity-90 transition-opacity"
                style={{ backgroundColor: FG }}
              >
                Start free trial
              </Link>
            </>
          )}
        </div>

        <button className="md:hidden p-2 -mr-2 text-gray-700" onClick={() => setOpen(v => !v)} aria-label="Menu">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
          {NAV.map(([label, href]) => (
            <NavItem
              key={href}
              label={label}
              href={href}
              onClick={() => setOpen(false)}
              className="block py-2 text-sm font-medium text-gray-700"
            />
          ))}
          <div className="flex gap-2 pt-2">
            {user ? (
              <Link to="/" className="flex-1 text-center text-sm font-bold text-white rounded-xl py-2.5" style={{ backgroundColor: FG }}>
                Go to app →
              </Link>
            ) : (
              <>
                <Link to="/login" className="flex-1 text-center text-sm font-semibold text-gray-700 border border-gray-200 rounded-xl py-2.5">
                  Log in
                </Link>
                <Link to="/signup" className="flex-1 text-center text-sm font-bold text-white rounded-xl py-2.5" style={{ backgroundColor: FG }}>
                  Start free trial
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
