// src/marketing/Customization.jsx
//
// Public marketing page describing the SoftCake extensions / customization model.
// Linked from the landing-page top nav ("Customization"); route: /customization.

import { Link } from 'react-router-dom'
import { PLATFORM_BRAND } from '../lib/brand'
import SamWidget from './SamWidget'

const FG = '#2E8BC9'
const FG_DARK = '#1B5E8C'
const FG_LIGHT = '#5BB3E4'

const QUOTE_MAILTO =
  'mailto:extensions@softcake.com?subject=Custom%20Extension%20Quote%20Request&body=Tell%20us%20about%20your%20business%20and%20what%20you%27d%20like%20to%20customize%20or%20build%3A%0A%0A'

function Check() {
  return (
    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M5 10.5l3.5 3.5L15 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const KINDS = [
  {
    icon: '🛠️',
    title: 'Customize existing features',
    blurb: 'Shape the tools you already use to match exactly how your team works.',
    items: [
      'Adjust fields, forms and layouts',
      'Tailor workflows, approvals and statuses',
      'Change calculations, rates and reports',
      'Rename and re-organize modules for your industry',
    ],
  },
  {
    icon: '✨',
    title: 'Add brand-new features',
    blurb: 'Need something that doesn’t exist yet? We build it into your workspace.',
    items: [
      'Purpose-built modules for your industry',
      'New tools that connect to your existing data',
      'Custom integrations with the software you already use',
      'Automations unique to your process',
    ],
  },
]

const STEPS = [
  ['Tell us what you need', 'Share the problem or the workflow you want to improve — no tech spec required.'],
  ['We scope & quote it', 'We map it to {brand} and send a clear, free quote and timeline.'],
  ['We build & deploy', 'Your extension is built and turned on right inside your workspace.'],
  ['It stays connected', 'Your custom tools work alongside the rest of {brand} — one login, one system.'],
]

export default function Customization() {
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
            <a href={QUOTE_MAILTO} className="text-sm font-bold text-white rounded-xl px-4 py-2.5 shadow-sm hover:opacity-90 transition-opacity" style={{ backgroundColor: FG }}>
              Request a free quote
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${FG_DARK} 0%, ${FG} 55%, ${FG_LIGHT} 100%)` }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20 sm:py-24 text-center">
          <span className="inline-block text-xs font-semibold tracking-wide uppercase text-blue-100/90 bg-white/10 rounded-full px-3 py-1 mb-5">
            Customization & Extensions
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.05]">
            Make {PLATFORM_BRAND.name} fit your business — exactly
          </h1>
          <p className="mt-5 text-lg text-blue-50/90 max-w-2xl mx-auto">
            {PLATFORM_BRAND.name} is built to be extended. Whatever your industry, we can tailor the
            features you already have or build entirely new ones — so the system works the way your
            company does, not the other way around.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href={QUOTE_MAILTO} className="w-full sm:w-auto text-base font-bold rounded-xl px-7 py-3.5 shadow-lg hover:opacity-90 transition-opacity" style={{ backgroundColor: 'white', color: FG_DARK }}>
              Request a free quote
            </a>
            <a href="#how" className="w-full sm:w-auto text-base font-semibold text-white border border-white/30 rounded-xl px-7 py-3.5 hover:bg-white/10 transition-colors">
              How it works
            </a>
          </div>
        </div>
      </section>

      {/* Two kinds of extensions */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Two ways we extend the platform</h2>
          <p className="mt-4 text-gray-600">
            An extension can refine what’s already there, or add something completely new — for any
            type of business.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {KINDS.map(k => (
            <div key={k.title} className="border border-gray-200 rounded-2xl p-7 bg-gray-50/60">
              <div className="text-3xl">{k.icon}</div>
              <h3 className="text-xl font-bold mt-3">{k.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{k.blurb}</p>
              <ul className="mt-5 space-y-3">
                {k.items.map(it => (
                  <li key={it} className="flex gap-3 text-sm text-gray-700">
                    <span style={{ color: FG }}><Check /></span>
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Built for many industries */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Built for many types of businesses</h2>
          <p className="mt-4 text-gray-600">
            From field services and contracting to professional services, retail, healthcare, non-profits
            and more — if your business has a process, we can model it in {PLATFORM_BRAND.name}. The
            Contractor Extension Package is just one example of what a tailored extension can look like.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">How a custom extension happens</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map(([title, body], i) => (
            <div key={title} className="rounded-2xl border border-gray-200 p-5">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: FG }}>
                {i + 1}
              </div>
              <h3 className="font-bold mt-3">{title}</h3>
              <p className="text-sm text-gray-600 mt-1">{body.replaceAll('{brand}', PLATFORM_BRAND.name)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quote CTA */}
      <section className="px-4 sm:px-6 pb-20">
        <div className="max-w-5xl mx-auto rounded-3xl px-6 py-14 sm:py-16 text-center" style={{ background: `linear-gradient(135deg, ${FG_DARK} 0%, ${FG} 60%, ${FG_LIGHT} 100%)` }}>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Have something in mind?</h2>
          <p className="mt-3 text-blue-50/90 max-w-xl mx-auto">
            Tell us what you’d like to customize or build. Quotes are always free, with no obligation.
          </p>
          <a href={QUOTE_MAILTO} className="inline-block mt-7 text-base font-bold rounded-xl px-8 py-3.5 shadow-lg hover:opacity-90 transition-opacity" style={{ backgroundColor: 'white', color: FG_DARK }}>
            Request a free quote
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-semibold text-gray-800">{PLATFORM_BRAND.name}</span>
          <nav className="flex items-center gap-6 text-sm text-gray-500">
            <Link to="/" className="hover:text-gray-800">Home</Link>
            <Link to="/#pricing" className="hover:text-gray-800">Pricing</Link>
            <Link to="/contractor-extensions" className="hover:text-gray-800">Contractor extensions</Link>
            <Link to="/login" className="hover:text-gray-800">Log in</Link>
          </nav>
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} {PLATFORM_BRAND.name}</p>
        </div>
      </footer>

      <SamWidget />
    </div>
  )
}
