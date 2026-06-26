// src/components/settings/SubscriptionTab.jsx
// Subscription level + included apps + add-on catalog, plus the trial clock and
// the cancel/extend lifecycle (Admin → Subscription).

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { moduleName } from './appsCatalog'
import AppsCatalogModal from './AppsCatalogModal'

const DAY = 86400000

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

function statusBadge(sub) {
  const s = sub?.status
  if (s === 'trialing') return { text: 'Free trial', cls: 'bg-blue-100 text-blue-700' }
  if (s === 'active') return { text: 'Active', cls: 'bg-green-100 text-green-700' }
  if (s === 'past_due') return { text: 'Past due', cls: 'bg-red-100 text-red-700' }
  if (s === 'canceled') return { text: 'Canceled', cls: 'bg-gray-200 text-gray-600' }
  return { text: s || 'Active', cls: 'bg-gray-100 text-gray-600' }
}

function trialMath(sub) {
  const end = sub.trial_ends_at ? new Date(sub.trial_ends_at).getTime() : null
  if (!end) return null
  const start = sub.trial_started_at ? new Date(sub.trial_started_at).getTime() : end - 14 * DAY
  const total = Math.max(1, Math.round((end - start) / DAY))
  const left = Math.max(0, Math.ceil((end - Date.now()) / DAY))
  const used = Math.min(total, Math.max(0, total - left))
  return { total, left, used, end: new Date(end), pct: Math.min(100, Math.round((used / total) * 100)) }
}

export default function SubscriptionTab() {
  const [sub, setSub] = useState(null)
  const [plans, setPlans] = useState([])
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCatalog, setShowCatalog] = useState(false)
  const [justRequested, setJustRequested] = useState(false)

  // cancel/extend modal
  const [modal, setModal] = useState(null) // 'trial' | 'subscription'
  const [feedback, setFeedback] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionMsg, setActionMsg] = useState('')
  const [actionErr, setActionErr] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [{ data: s }, { data: pl }, { data: pk }] = await Promise.all([
      supabase.rpc('get_my_subscription'),
      supabase.from('plans').select('*'),
      supabase.from('packages').select('*'),
    ])
    setSub(s || null)
    setPlans(pl || [])
    setPackages(pk || [])
    setLoading(false)
  }

  function closeModal() {
    setModal(null)
    setFeedback('')
    setActionErr('')
  }

  async function runRpc(fn, args, successMsg) {
    setBusy(true)
    setActionErr('')
    const { error } = await supabase.rpc(fn, args)
    setBusy(false)
    if (error) {
      setActionErr(error.message)
      return false
    }
    closeModal()
    setActionMsg(successMsg)
    await load()
    return true
  }

  if (loading)
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
      </div>
    )

  if (!sub)
    return (
      <div className="card">
        <p className="text-sm text-gray-600">
          No subscription is attached to this workspace yet. If you just signed up, refresh in a moment, or contact
          SoftCake for help.
        </p>
      </div>
    )

  const badge = statusBadge(sub)
  const includedKeys = sub.plan_module_keys || []
  const activePkgs = packages.filter(p => (sub.package_ids || []).includes(p.id))
  const monthly = (sub.price_monthly || 0) + activePkgs.reduce((s, p) => s + (Number(p.price_monthly) || 0), 0)
  const trialing = sub.status === 'trialing'
  const canceled = sub.status === 'canceled'
  const tm = trialing ? trialMath(sub) : null

  return (
    <div className="space-y-6">
      {actionMsg && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-sm px-3 py-2 rounded-lg">✓ {actionMsg}</div>
      )}

      {/* Trial clock */}
      {trialing && tm && (
        <div className="card bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="font-bold text-blue-900">You're on a free trial</h2>
              <p className="text-sm text-blue-800 mt-0.5">
                Day <b>{tm.used}</b> of <b>{tm.total}</b> · <b>{tm.left}</b> day{tm.left === 1 ? '' : 's'} left
                {sub.trial_extended_count > 0 && <span className="text-blue-600"> · extended</span>}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-blue-700">Trial ends</p>
              <p className="text-sm font-semibold text-blue-900">{fmtDate(tm.end)}</p>
            </div>
          </div>
          <div className="mt-3 h-2 rounded-full bg-blue-100 overflow-hidden">
            <div className="h-full bg-blue-500" style={{ width: `${tm.pct}%` }} />
          </div>
          <p className="text-xs text-blue-700 mt-3">
            When your trial ends, your card on file is charged <b>${monthly.toFixed(0)}/mo</b> and your plan continues
            automatically. Cancel anytime before then.
          </p>
          <button
            onClick={() => setModal('trial')}
            className="mt-4 text-sm font-semibold text-blue-700 hover:text-blue-900 underline"
          >
            Cancel free trial
          </button>
        </div>
      )}

      {/* Canceled notice */}
      {canceled && (
        <div className="card bg-gray-50 border-gray-200">
          <h2 className="font-bold text-gray-800">Subscription canceled</h2>
          <p className="text-sm text-gray-600 mt-1">
            Your workspace is closed, but we're keeping your data until <b>{fmtDate(sub.data_retention_until)}</b> in
            case you'd like to come back. Re-subscribe before then and everything is right where you left it.
          </p>
        </div>
      )}

      {/* Current plan */}
      <div className="card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400 font-medium">Your subscription</p>
            <h2 className="text-xl font-bold text-gray-900 mt-0.5">{sub.plan_name || 'No plan'}</h2>
            <span className={`inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full ${badge.cls}`}>
              {badge.text}
            </span>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              ${monthly.toFixed(0)}
              <span className="text-sm font-normal text-gray-400">/mo</span>
            </div>
            {activePkgs.length > 0 && (
              <p className="text-xs text-gray-400">base ${Number(sub.price_monthly || 0).toFixed(0)} + add-ons</p>
            )}
          </div>
        </div>

        <button onClick={() => setShowCatalog(true)} className="btn-primary w-full mt-5">
          Browse Available Apps
        </button>

        {/* Cancel subscription (paid / active, non-trial, non-canceled) */}
        {!trialing && !canceled && (
          <button
            onClick={() => setModal('subscription')}
            className="mt-3 w-full text-sm font-medium text-gray-500 hover:text-red-600"
          >
            Cancel subscription
          </button>
        )}
      </div>

      {/* Active add-ons */}
      {activePkgs.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3">Active Add-ons</h3>
          <div className="space-y-2">
            {activePkgs.map(p => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-800">{p.name}</span>
                <span className="text-gray-500">+${Number(p.price_monthly || 0).toFixed(0)}/mo</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Included apps */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3">Included Apps</h3>
        {includedKeys.length === 0 ? (
          <p className="text-sm text-gray-400">Your plan unlocks all modules.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {includedKeys.map(k => (
              <span key={k} className="text-xs bg-green-50 border border-green-200 text-green-800 px-2.5 py-1 rounded-full">
                {moduleName(k)}
              </span>
            ))}
            {activePkgs.flatMap(p => p.module_keys || []).map(k => (
              <span key={`pk-${k}`} className="text-xs bg-green-50 border border-green-200 text-green-800 px-2.5 py-1 rounded-full">
                {moduleName(k)}
              </span>
            ))}
          </div>
        )}
      </div>

      {justRequested && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm px-3 py-2 rounded-lg">
          ✓ Request received. We'll reach out to get your add-on enabled.
        </div>
      )}

      {showCatalog && (
        <AppsCatalogModal
          sub={sub}
          plans={plans}
          packages={packages}
          onClose={() => setShowCatalog(false)}
          onRequested={() => setJustRequested(true)}
        />
      )}

      {/* ── Cancel free trial modal ── */}
      {modal === 'trial' && (
        <Modal onClose={closeModal} title="Before you go…">
          <p className="text-sm text-gray-600">
            We'd love to know what you think of SoftCake so far — it helps us improve.
          </p>
          <textarea
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            rows={3}
            placeholder="What did you think? What was missing?"
            className="input mt-3 resize-none"
          />
          {actionErr && <p className="text-sm text-red-600 mt-2">{actionErr}</p>}

          {sub.trial_extended_count < 1 && (
            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-900">Stay 14 more days — on us</p>
              <p className="text-xs text-blue-700 mt-0.5">
                Not ready to decide? Reset your trial and take another two weeks, free.
              </p>
              <button
                onClick={() => runRpc('extend_my_trial', { p_comment: feedback }, 'Your trial was extended 14 days. Welcome back!')}
                disabled={busy}
                className="btn-primary w-full mt-3 text-sm disabled:opacity-50"
              >
                {busy ? 'Working…' : 'Keep my trial — +14 days free'}
              </button>
            </div>
          )}

          <button
            onClick={() => runRpc('cancel_my_trial', { p_comment: feedback }, 'Your trial was canceled. Your data is kept for 60 days.')}
            disabled={busy}
            className="mt-3 w-full text-sm font-medium text-gray-500 hover:text-red-600 disabled:opacity-50"
          >
            Cancel my trial anyway
          </button>
        </Modal>
      )}

      {/* ── Cancel subscription modal ── */}
      {modal === 'subscription' && (
        <Modal onClose={closeModal} title="Cancel subscription">
          <p className="text-sm text-gray-600">
            We're sorry to see you go. Could you tell us why you're canceling? Your feedback genuinely helps.
          </p>
          <textarea
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            rows={3}
            placeholder="Reason for canceling…"
            className="input mt-3 resize-none"
          />
          <div className="mt-3 rounded-xl bg-gray-50 border border-gray-200 p-3">
            <p className="text-xs text-gray-600">
              Your data stays safe for <b>60 days</b> after cancellation — re-subscribe anytime in that window and pick
              up right where you left off.
            </p>
          </div>
          {actionErr && <p className="text-sm text-red-600 mt-2">{actionErr}</p>}
          <div className="mt-4 flex gap-3">
            <button onClick={closeModal} disabled={busy} className="btn-secondary flex-1 text-sm">
              Keep my subscription
            </button>
            <button
              onClick={() =>
                runRpc('cancel_my_subscription', { p_reason: feedback }, 'Your subscription was canceled. Data kept for 60 days.')
              }
              disabled={busy || !feedback.trim()}
              className="btn-danger flex-1 text-sm disabled:opacity-50"
            >
              {busy ? 'Canceling…' : 'Confirm cancellation'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
