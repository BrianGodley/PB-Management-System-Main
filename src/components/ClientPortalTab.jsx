// src/components/ClientPortalTab.jsx
//
// Staff-side control panel for a client's portal — rendered as the
// "Client Portal" tab inside JobInfoModal.
//
// One client_portals row per client (keyed by client_id). Staff use this tab
// to set the portal up, send the activation invite email, watch activation
// status, and toggle which sections the client may see. The actual
// client-facing portal lives under /portal.
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { sendClientPortalInvite } from '../lib/notify'

// The seven permission flags, in display order. Payments are Phase 2 — their
// toggles exist now so access can be pre-configured, but the portal pages for
// them are built later.
const PERMISSIONS = [
  { key: 'perm_schedule', label: 'Schedule', hint: 'View the job schedule' },
  { key: 'perm_daily_logs', label: 'Daily Logs', hint: 'View daily job logs and photos' },
  { key: 'perm_change_orders', label: 'Change Orders', hint: 'View change orders' },
  { key: 'perm_files', label: 'Files', hint: 'View and download job files' },
  { key: 'perm_invoices', label: 'Invoices', hint: 'View invoices (Phase 2)' },
  { key: 'perm_pay_ach', label: 'Pay by ACH', hint: 'Pay invoices via bank transfer (Phase 2)' },
  { key: 'perm_pay_card', label: 'Pay by Card', hint: 'Pay invoices via credit card (Phase 2)' },
]

// 64-char URL-safe invite token. crypto.randomUUID is available in every
// browser this app targets; the Math.random path is a defensive fallback.
function genToken() {
  const r = () =>
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
  return (r() + r()).replace(/-/g, '')
}

function clientDisplayName(c) {
  if (!c) return 'this client'
  const full = [c.first_name, c.last_name].filter(Boolean).join(' ').trim()
  return c.name || full || c.company_name || c.email || 'this client'
}

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// Small on/off switch.
function Toggle({ checked, disabled, onChange }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors ${
        checked ? 'bg-green-600' : 'bg-gray-300'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
      aria-pressed={checked}
    >
      <span
        className={`mt-0.5 inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

const STATUS_BADGE = {
  none: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Not set up' },
  inactive: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Inactive' },
  invited: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Invite sent' },
  active: { bg: 'bg-green-100', text: 'text-green-700', label: 'Active' },
  disabled: { bg: 'bg-red-100', text: 'text-red-600', label: 'Disabled' },
}

export default function ClientPortalTab({ clientId, clientData }) {
  const [loading, setLoading] = useState(true)
  const [portal, setPortal] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')

  useEffect(() => {
    if (!clientId) {
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      const { data, error: e } = await supabase
        .from('client_portals')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle()
      if (cancelled) return
      if (e) setError(e.message)
      setPortal(data || null)
      setInviteEmail(data?.invite_email || clientData?.email || '')
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [clientId, clientData?.email])

  async function setUpPortal() {
    setBusy(true)
    setError('')
    setMsg('')
    const { data, error: e } = await supabase
      .from('client_portals')
      .insert({ client_id: clientId, status: 'inactive' })
      .select()
      .single()
    setBusy(false)
    if (e) {
      setError(e.message)
      return
    }
    setPortal(data)
    setMsg('Portal created. Set permissions below, then send the invite.')
  }

  async function updatePerm(key, value) {
    if (!portal) return
    setMsg('')
    setError('')
    setPortal(p => ({ ...p, [key]: value }))
    const { error: e } = await supabase
      .from('client_portals')
      .update({ [key]: value })
      .eq('id', portal.id)
    if (e) {
      setError(`Could not save that permission: ${e.message}`)
      setPortal(p => ({ ...p, [key]: !value })) // revert optimistic update
    }
  }

  async function sendInvite() {
    const email = inviteEmail.trim()
    if (!email) {
      setError('Enter an email address to send the invite to.')
      return
    }
    setBusy(true)
    setError('')
    setMsg('')
    const token = genToken()
    const expires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    const { data, error: e } = await supabase
      .from('client_portals')
      .update({
        status: 'invited',
        invite_token: token,
        invite_token_expires_at: expires,
        invite_sent_at: new Date().toISOString(),
        invite_email: email,
      })
      .eq('id', portal.id)
      .select()
      .single()
    if (e) {
      setBusy(false)
      setError(e.message)
      return
    }
    const activateUrl = `${window.location.origin}/client-portal/activate?token=${token}`
    const { error: mailErr } = await sendClientPortalInvite({
      to: email,
      clientName: clientDisplayName(clientData),
      activateUrl,
    })
    setBusy(false)
    setPortal(data)
    if (mailErr) {
      setError(`Portal marked invited, but the email failed to send: ${mailErr.message}`)
    } else {
      setMsg(`Invite email sent to ${email}.`)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  if (!clientId) {
    return (
      <div className="px-5 py-8 text-center">
        <p className="text-sm text-gray-500">
          This job isn&apos;t linked to a client yet.
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Link a client on the Client tab to set up a portal.
        </p>
      </div>
    )
  }

  if (loading) {
    return <div className="px-5 py-8 text-center text-sm text-gray-400">Loading portal…</div>
  }

  const status = portal?.status || 'none'
  const badge = STATUS_BADGE[status] || STATUS_BADGE.none
  const canInvite = status === 'inactive' || status === 'invited'

  return (
    <div className="space-y-5 px-5 py-4">
      {/* Status header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            Client Portal — {clientDisplayName(clientData)}
          </p>
          <p className="mt-0.5 text-xs text-gray-400">
            Lets this client log in to view their jobs at a separate portal.
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.bg} ${badge.text}`}>
          {badge.label}
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </div>
      )}
      {msg && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
          {msg}
        </div>
      )}

      {/* Not set up yet */}
      {!portal && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-5 text-center">
          <p className="text-sm text-gray-600">No portal has been created for this client.</p>
          <button
            onClick={setUpPortal}
            disabled={busy}
            className="mt-3 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
          >
            {busy ? 'Setting up…' : 'Set Up Client Portal'}
          </button>
        </div>
      )}

      {portal && (
        <>
          {/* Activation / invite */}
          <div className="rounded-xl border border-gray-200 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Activation
            </p>

            {status === 'active' ? (
              <div className="space-y-1 text-sm text-gray-700">
                <p>
                  Portal is <span className="font-semibold text-green-700">active</span>
                  {portal.account_name ? (
                    <>
                      {' '}
                      — account <span className="font-semibold">{portal.account_name}</span>
                    </>
                  ) : null}
                  .
                </p>
                {portal.invite_email && (
                  <p className="text-xs text-gray-500">Login email: {portal.invite_email}</p>
                )}
                {portal.activated_at && (
                  <p className="text-xs text-gray-500">
                    Activated {fmtDate(portal.activated_at)}
                  </p>
                )}
                <p className="text-xs text-gray-400">
                  Client signs in at {window.location.origin}/client-portal
                </p>
              </div>
            ) : (
              <>
                {status === 'invited' && portal.invite_sent_at && (
                  <p className="mb-2 text-xs text-amber-700">
                    Invite sent to {portal.invite_email} on {fmtDate(portal.invite_sent_at)}. The
                    client hasn&apos;t activated their account yet.
                  </p>
                )}
                <label className="mb-1 block text-xs text-gray-400">
                  Send activation invite to
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="client@example.com"
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/30"
                  />
                  <button
                    onClick={sendInvite}
                    disabled={busy}
                    className="whitespace-nowrap rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
                  >
                    {busy
                      ? 'Sending…'
                      : status === 'invited'
                        ? 'Resend Invite'
                        : 'Activate & Send Invite'}
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-gray-400">
                  The client receives an email with a link to create their own account name and
                  password. The link is valid for 14 days.
                </p>
              </>
            )}
          </div>

          {/* Permissions */}
          <div className="rounded-xl border border-gray-200 p-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Permissions
            </p>
            <p className="mb-3 text-xs text-gray-400">
              Controls which sections this client sees once they log in. Changes save
              immediately.
            </p>
            <div className="divide-y divide-gray-100">
              {PERMISSIONS.map(perm => (
                <div key={perm.key} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0 pr-3">
                    <p className="text-sm font-medium text-gray-800">{perm.label}</p>
                    <p className="text-xs text-gray-400">{perm.hint}</p>
                  </div>
                  <Toggle
                    checked={!!portal[perm.key]}
                    onChange={v => updatePerm(perm.key, v)}
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
