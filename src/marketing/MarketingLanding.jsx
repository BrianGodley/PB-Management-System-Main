// src/marketing/MarketingLanding.jsx
//
// Public marketing site — the logged-out face of the app. Served at "/" when
// there's no authenticated user (see App.jsx). CTAs route into the app's
// /signup and /login. Single-page scroll with anchor nav.
//
// Branding: SoftCake, blue palette (matches the cloud logo), /logo.png with a
// ☁️ fallback.

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { PLATFORM_BRAND } from '../lib/brand'

const FG = '#2E8BC9'       // SoftCake blue (primary)
const FG_DARK = '#1B5E8C'  // deep blue (gradients)
const FG_LIGHT = '#5BB3E4' // light sky blue

// ── Content ──────────────────────────────────────────────────────────────────
const FEATURE_GROUPS = [
  {
    icon: '🏢',
    title: 'Run the business',
    blurb: 'The back office your crew leaders never had.',
    items: [
      ['Dashboard', 'A live pulse on jobs, people and money the moment you log in.'],
      ['Org Chart', 'Map every position, area and reporting line — then drill into each.'],
      ['HR', 'Employees, applicants, time clock, document files and onboarding templates.'],
      ['Statistics', 'Track the numbers that matter by position and by person.'],
    ],
  },
  {
    icon: '📈',
    title: 'Win & manage work',
    blurb: 'From first call to signed contract.',
    items: [
      ['Sales & Marketing', 'A CRM built around how contractors actually sell — funnels, calendar and campaigns.'],
      ['Training (LMS)', 'Assign courses, track completion, build a competent team.'],
      ['Workflows', 'Repeatable document and approval flows that run themselves.'],
      ['Documents & E-Docs', 'Files, photos, videos, a doc creator, and e-signature.'],
    ],
  },
  {
    icon: '💵',
    title: 'Control the money',
    blurb: 'Real finance, not just bookkeeping.',
    items: [
      ['Accounting', 'Invoices, bills and journals — tagged to the work they belong to.'],
      ['Weekly Financial Planning', 'Plan the week around real cash and statistics.'],
      ['Equipment & Assets', 'Know where your assets are and what they cost you.'],
      ['Client Portal', 'Give clients a clean window into their work and approvals.'],
    ],
  },
]

// The optional Contractor Extension Package — surfaced on the landing page and
// the dedicated /contractor-extensions page.
export const CONTRACTOR_FEATURES = [
  ['Jobs', 'Scheduling, daily logs, tasks, work orders and on-site time tracking.'],
  ['Estimating & Bids', 'Module-based estimates with gross-profit analysis and polished, branded bid documents.'],
  ['Change Orders', 'Create, release, approve and e-sign change orders that flow straight into the job.'],
  ['Design', 'Tie design work to the opportunity and the job it belongs to.'],
  ['Subs & Vendors', 'A directory plus contracts and quotes, linked to your jobs.'],
  ['Client Portal for jobs', 'Give clients a window into their project, approvals and payments.'],
]

const TIERS = [
  {
    id: 'tier1',
    name: 'Tier 1 — Base',
    price: 79,
    tagline: 'The essentials to organize your company.',
    includes: ['Dashboard', 'Org Chart', 'HR', 'Statistics', 'Documents & E-Docs'],
  },
  {
    id: 'tier2',
    name: 'Tier 2',
    price: 229,
    featured: true,
    tagline: 'Win and manage work, end to end.',
    includes: ['Everything in Tier 1', 'Training (LMS)', 'Sales', 'Marketing', 'Workflows'],
  },
  {
    id: 'tier3',
    name: 'Tier 3',
    price: 389,
    tagline: 'Full financial and operational control.',
    includes: ['Everything in Tier 2', 'Accounting', 'Weekly Financial Planning', 'Subs & Vendors', 'Equipment Tracking'],
  },
]

const FAQS = [
  ['Is it really unlimited users?', 'Yes. Every plan includes unlimited users at no extra cost — add your whole team, office and field, without per-seat fees.'],
  ['How does the free trial work?', 'You get 14 days free. Pick a plan, set up your company in under a minute, and explore everything. You can change or cancel before the trial ends.'],
  ['What is the Contractor Extension Package?', 'An optional add-on for companies that run projects, job sites or field crews. It turns on Jobs, Estimating & Bids, Design, change orders and more on top of any Tier 2 or Tier 3 plan for an extra $149/mo. Most businesses never need it — see the contractor extensions page for the full list.'],
  ['Can I change plans later?', 'Anytime. Move up or down a tier, or add the Contractor Package, and your modules update immediately. You only ever see the features your plan includes.'],
  ['Is my data secure and private?', 'Each company is fully isolated — your records are only ever visible to your team. We use row-level security so one company can never see another’s data.'],
  ['Do you charge setup or cancellation fees?', 'No setup fees and no cancellation fees. It’s month-to-month.'],
]

// Front-page photos live in public/marketing/. A missing image degrades
// gracefully. The contractor shot anchors its own band; these three fill the
// "one system" showcase grid.
const SHOWCASE = [
  ['/marketing/marketing.jpg', 'Sales & Marketing', 'Funnels, a booking calendar, contact workflows and campaigns — built around how contractors actually sell.'],
  ['/marketing/team.jpg', 'People & operations', 'Org chart, employees, time clock and onboarding — keep the office and the field aligned.'],
  ['/marketing/hr.jpg', 'Hire & train', 'Recruiting, skill training and a full LMS so every new hire ramps up the same way.'],
]

// ── Small pieces ───────────────────────────────────────────────────────────
function Logo({ size = 36 }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-xl overflow-hidden shadow"
      style={{ width: size, height: size, backgroundColor: FG_DARK }}
    >
      <img
        src={PLATFORM_BRAND.logo}
        alt={PLATFORM_BRAND.name}
        className="w-full h-full object-contain p-1"
        onError={e => {
          e.target.style.display = 'none'
          e.target.nextSibling.style.display = 'block'
        }}
      />
      <span style={{ display: 'none', fontSize: size * 0.55, lineHeight: 1 }}>🌿</span>
    </span>
  )
}

function Check() {
  return (
    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M5 10.5l3.5 3.5L15 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function MarketingLanding() {
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState(0)

  const navLinks = [
    ['Features', '#features'],
    ['Pricing', '#pricing'],
    ['FAQ', '#faq'],
  ]

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <a href="#top" className="flex items-center gap-2.5">
            <Logo />
            <span className="font-bold text-lg tracking-tight">{PLATFORM_BRAND.name}</span>
          </a>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            {navLinks.map(([label, href]) => (
              <a key={href} href={href} className="hover:text-gray-900 transition-colors">{label}</a>
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
                <Link to="/login" className="text-sm font-semibold text-gray-700 hover:text-gray-900 px-3 py-2">Log in</Link>
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

          <button className="md:hidden p-2 -mr-2 text-gray-700" onClick={() => setMenuOpen(v => !v)} aria-label="Menu">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
            {navLinks.map(([label, href]) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)} className="block py-2 text-sm font-medium text-gray-700">{label}</a>
            ))}
            <div className="flex gap-2 pt-2">
              {user ? (
                <Link to="/" className="flex-1 text-center text-sm font-bold text-white rounded-xl py-2.5" style={{ backgroundColor: FG }}>Go to app →</Link>
              ) : (
                <>
                  <Link to="/login" className="flex-1 text-center text-sm font-semibold text-gray-700 border border-gray-200 rounded-xl py-2.5">Log in</Link>
                  <Link to="/signup" className="flex-1 text-center text-sm font-bold text-white rounded-xl py-2.5" style={{ backgroundColor: FG }}>Start free trial</Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section id="top" className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${FG_DARK} 0%, ${FG} 55%, ${FG_LIGHT} 100%)` }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
          <span className="inline-block text-xs font-semibold tracking-wide uppercase text-blue-100/90 bg-white/10 rounded-full px-3 py-1 mb-5">
            All-in-one platform to run your business
          </span>
          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.05] max-w-3xl mx-auto">
            Run your whole company from one place
          </h1>
          <p className="mt-5 text-lg sm:text-xl text-blue-50/90 max-w-2xl mx-auto">
            {PLATFORM_BRAND.name} brings your people, sales, documents and money into one connected system — the modern way to run a company, whatever you do.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/signup"
              className="w-full sm:w-auto text-base font-bold rounded-xl px-7 py-3.5 shadow-lg hover:opacity-90 transition-opacity"
              style={{ backgroundColor: 'white', color: FG_DARK }}
            >
              Start your 14-day free trial
            </Link>
            <a href="#features" className="w-full sm:w-auto text-base font-semibold text-white border border-white/30 rounded-xl px-7 py-3.5 hover:bg-white/10 transition-colors">
              See what’s inside
            </a>
          </div>
          <p className="mt-5 text-sm text-blue-100/80">
            Unlimited users · No setup fees · Cancel anytime
          </p>
        </div>
      </section>

      {/* ── Stat band ──────────────────────────────────────────────────────── */}
      <section className="border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            ['Unlimited', 'users on every plan'],
            ['15+', 'connected modules'],
            ['1 system', 'across every team'],
            ['14 days', 'free to try'],
          ].map(([big, small]) => (
            <div key={small}>
              <div className="text-2xl sm:text-3xl font-extrabold" style={{ color: FG }}>{big}</div>
              <div className="text-xs sm:text-sm text-gray-500 mt-1">{small}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Everything your company runs on</h2>
          <p className="mt-4 text-gray-600">
            Each module works on its own and connects to the rest. Start with the essentials and turn on more as you grow — you only ever see what your plan includes.
          </p>
        </div>

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
      </section>

      {/* ── One-system showcase (photos) ───────────────────────────────────── */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">One system for every part of your business</h2>
            <p className="mt-4 text-gray-600">Sell it, staff it, build it — all connected, all in one place.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {SHOWCASE.map(([src, title, body]) => (
              <div key={src} className="rounded-2xl overflow-hidden bg-white border border-gray-200 shadow-sm flex flex-col">
                <div className="aspect-[16/10] bg-blue-50">
                  <img
                    src={src}
                    alt={title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                    onError={e => { e.currentTarget.style.display = 'none' }}
                  />
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-gray-900">{title}</h3>
                  <p className="text-sm text-gray-600 mt-1.5">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────────────── */}
      <section id="pricing" className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Simple, flat pricing</h2>
            <p className="mt-4 text-gray-600">
              Plans stack — each tier includes the one below it. Every plan has <span className="font-semibold text-gray-800">unlimited users</span> and a 14-day free trial.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 items-start">
            {TIERS.map(tier => (
              <div
                key={tier.id}
                className={`rounded-2xl bg-white p-7 flex flex-col ${tier.featured ? 'ring-2 shadow-xl md:-mt-3' : 'border border-gray-200 shadow-sm'}`}
                style={tier.featured ? { boxShadow: '0 20px 40px -16px rgba(58,80,56,0.35)', ['--tw-ring-color']: FG } : undefined}
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
                  className={`block text-center text-sm font-bold rounded-xl py-3 mb-6 transition-opacity hover:opacity-90 ${tier.featured ? 'text-white' : 'text-white'}`}
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
                <span className="text-xl font-bold" style={{ color: FG }}>+$149/mo</span>
                <span className="text-xs text-gray-500">add to Tier 2 or Tier 3</span>
              </div>
              <p className="text-sm text-gray-600 mt-3">
                Running projects, job sites or field crews? Turn on the full contractor toolkit on top of any plan.
              </p>
              <ul className="mt-4 grid sm:grid-cols-2 gap-x-4 gap-y-2">
                {CONTRACTOR_FEATURES.map(([name]) => (
                  <li key={name} className="flex gap-2 text-sm text-gray-700">
                    <span style={{ color: FG }}><Check /></span>
                    <span>{name}</span>
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

      {/* ── FAQ ────────────────────────────────────────────────────────────── */}
      <section id="faq" className="max-w-3xl mx-auto px-4 sm:px-6 py-20">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-center mb-12">Questions, answered</h2>
        <div className="space-y-3">
          {FAQS.map(([q, a], i) => {
            const open = openFaq === i
            return (
              <div key={q} className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(open ? -1 : i)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="font-semibold text-sm sm:text-base text-gray-900">{q}</span>
                  <span className={`text-gray-400 transition-transform flex-shrink-0 ${open ? 'rotate-45' : ''}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M12 5v14M5 12h14" /></svg>
                  </span>
                </button>
                {open && <p className="px-5 pb-5 -mt-1 text-sm text-gray-600 leading-relaxed">{a}</p>}
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 pb-20">
        <div className="max-w-5xl mx-auto rounded-3xl px-6 py-14 sm:py-16 text-center" style={{ background: `linear-gradient(135deg, ${FG_DARK} 0%, ${FG} 60%, ${FG_LIGHT} 100%)` }}>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Ready to get organized?</h2>
          <p className="mt-3 text-blue-50/90 max-w-xl mx-auto">Set up your company in under a minute. 14 days free, unlimited users, cancel anytime.</p>
          {/* (blue theme) */}
          <Link to="/signup" className="inline-block mt-7 text-base font-bold rounded-xl px-8 py-3.5 shadow-lg hover:opacity-90 transition-opacity" style={{ backgroundColor: 'white', color: FG_DARK }}>
            Start your free trial
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Logo size={28} />
            <span className="font-semibold text-gray-800">{PLATFORM_BRAND.name}</span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-gray-500">
            <a href="#features" className="hover:text-gray-800">Features</a>
            <a href="#pricing" className="hover:text-gray-800">Pricing</a>
            <a href="#faq" className="hover:text-gray-800">FAQ</a>
            {user
              ? <Link to="/" className="hover:text-gray-800">Go to app →</Link>
              : <Link to="/login" className="hover:text-gray-800">Log in</Link>}
          </nav>
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} {PLATFORM_BRAND.name}</p>
        </div>
      </footer>
    </div>
  )
}
