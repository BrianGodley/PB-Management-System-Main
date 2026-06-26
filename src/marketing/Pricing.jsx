// src/marketing/Pricing.jsx
//
// Standalone pricing page (route: /pricing). Pulls the tier + contractor data
// from MarketingLanding so there's a single source of truth.

import { Link } from 'react-router-dom'
import { PLATFORM_BRAND } from '../lib/brand'
import { TIERS, CONTRACTOR_MODULES } from './MarketingLanding'
import MarketingHeader from './MarketingHeader'
import SamWidget from './SamWidget'

const FG = '#2E8BC9'
const FG_LIGHT = '#5BB3E4'

function Check() {
  return (
    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M5 10.5l3.5 3.5L15 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Pricing() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <MarketingHeader />

      <section className="bg-gray-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-14">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Simple, flat pricing</h1>
            <p className="mt-4 text-gray-600">
              Plans stack — each tier includes the one below it. Every plan has{' '}
              <span className="font-semibold text-gray-800">unlimited users</span> and a 14-day free trial.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 items-start">
            {TIERS.map(tier => (
              <div
                key={tier.id}
                className={`rounded-2xl bg-white p-7 flex flex-col ${tier.featured ? 'ring-2 shadow-xl md:-mt-3' : 'border border-gray-200 shadow-sm'}`}
                style={tier.featured ? { boxShadow: '0 20px 40px -16px rgba(46,139,201,0.35)', ['--tw-ring-color']: FG } : undefined}
              >
                {tier.featured && (
                  <span className="self-start text-xs font-bold uppercase tracking-wide text-white rounded-full px-3 py-1 mb-3" style={{ backgroundColor: FG }}>
                    Most popular
                  </span>
                )}
                <h3 className="text-lg font-bold">{tier.name}</h3>
                <p className="text-sm text-gray-500 mt-1 min-h-[2.5rem]">{tier.tagline}</p>
                <div className="mt-4 mb-1">
                  <span className="text-4xl font-extrabold">${tier.price}</span>
                  <span className="text-gray-400 text-sm font-medium">/mo</span>
                </div>
                <p className="text-xs text-gray-400 mb-5">Unlimited users</p>
                <Link
                  to="/signup"
                  className="block text-center text-sm font-bold rounded-xl py-3 mb-6 text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: tier.featured ? FG : FG_LIGHT }}
                >
                  Start free trial
                </Link>
                <ul className="space-y-3">
                  {tier.includes.map(item => (
                    <li key={item} className="flex gap-2.5 text-sm">
                      <span style={{ color: FG }}><Check /></span>
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Contractor Extension Package */}
          <div id="contractor" className="mt-10 rounded-3xl overflow-hidden bg-white border border-gray-200 shadow-sm grid md:grid-cols-2">
            <div className="bg-blue-50 min-h-[240px] md:min-h-full">
              <img
                src="/marketing/contractor.jpg"
                alt="Contractors reviewing plans on the job site"
                loading="lazy"
                className="w-full h-full object-cover"
                onError={e => { e.currentTarget.style.display = 'none' }}
              />
            </div>
            <div className="p-7 sm:p-9">
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: FG }}>Optional add-on</span>
              <h3 className="text-2xl font-extrabold tracking-tight mt-1">Contractor Extension Package</h3>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-xl font-bold" style={{ color: FG }}>+$199/mo</span>
                <span className="text-xs text-gray-500">add to Tier 2 or Tier 3</span>
              </div>
              <p className="text-sm text-gray-600 mt-3">
                Running projects, job sites or field crews? Turn on the full contractor toolkit on top of any plan.
              </p>
              <ul className="mt-4 grid sm:grid-cols-2 gap-x-4 gap-y-2">
                {CONTRACTOR_MODULES.map(m => (
                  <li key={m.name} className="flex gap-2 text-sm text-gray-700">
                    <span style={{ color: FG }}><Check /></span>
                    <span>{m.name}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/signup" className="text-sm font-bold text-white rounded-xl px-5 py-3 hover:opacity-90 transition-opacity" style={{ backgroundColor: FG }}>
                  Add it at signup
                </Link>
                <Link to="/contractor-extensions" className="text-sm font-bold rounded-xl px-5 py-3 border-2 hover:bg-blue-50 transition-colors" style={{ borderColor: FG, color: FG }}>
                  See all contractor features →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-semibold text-gray-800">{PLATFORM_BRAND.name}</span>
          <nav className="flex items-center gap-6 text-sm text-gray-500">
            <Link to="/" className="hover:text-gray-800">Home</Link>
            <Link to="/#features" className="hover:text-gray-800">Features</Link>
            <Link to="/customization" className="hover:text-gray-800">Customization</Link>
            <Link to="/login" className="hover:text-gray-800">Log in</Link>
          </nav>
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} {PLATFORM_BRAND.name}</p>
        </div>
      </footer>

      <SamWidget />
    </div>
  )
}
