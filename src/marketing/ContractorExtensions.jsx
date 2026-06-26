// src/marketing/ContractorExtensions.jsx
//
// Dedicated public page for the optional Contractor Extension Package.
// Linked from the marketing landing page; route: /contractor-extensions.

import { Link } from 'react-router-dom'
import { PLATFORM_BRAND } from '../lib/brand'
import { CONTRACTOR_FEATURES } from './MarketingLanding'

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

export default function ContractorExtensions() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center rounded-xl overflow-hidden shadow w-9 h-9" style={{ backgroundColor: FG_DARK }}>
              <img src={PLATFORM_BRAND.logo} alt={PLATFORM_BRAND.name} className="w-full h-full object-contain p-1" />
            </span>
            <span className="font-bold text-lg tracking-tight">{PLATFORM_BRAND.name}</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm font-semibold text-gray-600 hover:text-gray-900 px-3 py-2">← Back to home</Link>
            <Link to="/signup" className="text-sm font-bold text-white rounded-xl px-4 py-2.5 shadow-sm hover:opacity-90 transition-opacity" style={{ backgroundColor: FG }}>
              Start free trial
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${FG_DARK} 0%, ${FG} 55%, ${FG_LIGHT} 100%)` }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-block text-xs font-semibold tracking-wide uppercase text-blue-100/90 bg-white/10 rounded-full px-3 py-1 mb-5">
              Optional add-on · +$149/mo
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.05]">
              Contractor Extension Package
            </h1>
            <p className="mt-5 text-lg text-blue-50/90 max-w-xl">
              Run projects, job sites and field crews end to end — added on top of any {PLATFORM_BRAND.name} Tier 2 or Tier 3 plan.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link to="/signup" className="text-base font-bold rounded-xl px-7 py-3.5 shadow-lg hover:opacity-90 transition-opacity" style={{ backgroundColor: 'white', color: FG_DARK }}>
                Add it at signup
              </Link>
              <a href="#features" className="text-base font-semibold text-white border border-white/30 rounded-xl px-7 py-3.5 hover:bg-white/10 transition-colors text-center">
                See everything included
              </a>
            </div>
          </div>
          <div className="rounded-3xl overflow-hidden shadow-2xl bg-white/10 aspect-[4/3]">
            <img
              src="/marketing/contractor.jpg"
              alt="Contractors reviewing plans on the job site"
              className="w-full h-full object-cover"
              onError={e => { e.currentTarget.style.display = 'none' }}
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Everything in the package</h2>
          <p className="mt-4 text-gray-600">
            Each tool connects to the rest of {PLATFORM_BRAND.name} — your contacts, documents, people and money.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {CONTRACTOR_FEATURES.map(([name, desc]) => (
            <div key={name} className="flex gap-4 border border-gray-200 rounded-2xl p-5 bg-gray-50/60">
              <span style={{ color: FG }}><Check /></span>
              <div>
                <h3 className="font-bold text-gray-900">{name}</h3>
                <p className="text-sm text-gray-600 mt-1">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing strip */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Simple add-on pricing</h2>
          <div className="mt-4">
            <span className="text-5xl font-extrabold" style={{ color: FG }}>+$149</span>
            <span className="text-gray-400 font-medium">/mo</span>
          </div>
          <p className="mt-2 text-gray-600">Added to any Tier 2 ($229/mo) or Tier 3 ($389/mo) plan. Unlimited users. Cancel anytime.</p>
          <Link to="/signup" className="inline-block mt-7 text-base font-bold rounded-xl px-8 py-3.5 text-white shadow-lg hover:opacity-90 transition-opacity" style={{ backgroundColor: FG }}>
            Start your free trial
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-semibold text-gray-800">{PLATFORM_BRAND.name}</span>
          <nav className="flex items-center gap-6 text-sm text-gray-500">
            <Link to="/" className="hover:text-gray-800">Home</Link>
            <Link to="/#pricing" className="hover:text-gray-800">Pricing</Link>
            <Link to="/login" className="hover:text-gray-800">Log in</Link>
          </nav>
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} {PLATFORM_BRAND.name}</p>
        </div>
      </footer>
    </div>
  )
}
