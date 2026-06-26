// src/marketing/Features.jsx
//
// Dedicated public "Features" page (reached from the Features nav link and the
// hero "See what's inside" button). Renders the same FEATURE_GROUPS that used to
// live in a section on the landing page.

import { Link } from 'react-router-dom'
import { PLATFORM_BRAND } from '../lib/brand'
import MarketingHeader from './MarketingHeader'
import SamWidget from './SamWidget'
import { FEATURE_GROUPS } from './MarketingLanding'

const FG = '#2E8BC9'
const FG_DARK = '#1B5E8C'
const FG_LIGHT = '#5BB3E4'

function Check() {
  return (
    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M5 10.5l3.5 3.5L15 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Features() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <MarketingHeader />

      {/* Hero band */}
      <section className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${FG_DARK} 0%, ${FG} 55%, ${FG_LIGHT} 100%)` }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
          <span className="inline-block text-xs font-semibold tracking-wide uppercase text-blue-100/90 bg-white/10 rounded-full px-3 py-1 mb-5">
            Integrated Organization
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.05] max-w-3xl mx-auto">
            Robust tools for managing multiple parts of your company
          </h1>
          <p className="mt-5 text-lg text-blue-50/90 max-w-2xl mx-auto">
            Each module works on its own and connects to the rest. Start with the essentials and turn on more as you grow — you only ever see what your plan includes.
          </p>
        </div>
      </section>

      {/* Feature groups */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="grid md:grid-cols-2 gap-6">
          {FEATURE_GROUPS.map(group => (
            <div key={group.title} className="border border-gray-150 rounded-2xl p-6 bg-gray-50/60">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-2xl">{group.icon}</span>
                <h3 className="text-lg font-bold">{group.title}</h3>
              </div>
              <p className="text-sm text-gray-500 mb-5">{group.blurb}</p>
              <ul className="space-y-3.5">
                {group.items.map(([name, desc]) => (
                  <li key={name} className="flex gap-3">
                    <span style={{ color: FG }}><Check /></span>
                    <span>
                      <span className="font-semibold text-sm text-gray-900">{name}</span>
                      <span className="block text-sm text-gray-500">{desc}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contractor note + CTA */}
        <div className="mt-12 text-center">
          <p className="text-gray-600">
            Run projects, job sites or field crews?{' '}
            <Link to="/contractor-extensions" className="font-semibold hover:underline" style={{ color: FG_DARK }}>
              Add the Contractor Extension Package →
            </Link>
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/signup"
              className="w-full sm:w-auto text-base font-bold text-white rounded-xl px-7 py-3.5 shadow-lg hover:opacity-90 transition-opacity"
              style={{ backgroundColor: FG }}
            >
              Start your 14-day free trial
            </Link>
            <Link
              to="/pricing"
              className="w-full sm:w-auto text-base font-semibold rounded-xl px-7 py-3.5 border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              See pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <span>© {new Date().getFullYear()} {PLATFORM_BRAND.name}</span>
          <div className="flex items-center gap-6">
            <Link to="/" className="hover:text-gray-800">Home</Link>
            <Link to="/pricing" className="hover:text-gray-800">Pricing</Link>
            <Link to="/customization" className="hover:text-gray-800">Customization</Link>
          </div>
        </div>
      </footer>

      <SamWidget />
    </div>
  )
}
