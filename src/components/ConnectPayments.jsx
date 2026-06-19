// src/components/ConnectPayments.jsx
//
// Tenant onboarding for accepting THEIR OWN clients' payments (Layer 2). Starts
// a Helcim partner "connected account" registration and shows live status.
// The actual processing token is captured server-side by the helcim-connect
// webhook — never exposed to the browser.
//
// Config (set once you're enrolled as a Helcim Integration Partner):
//   VITE_HELCIM_REGISTRATION_URL  – your partner registration base URL
//   VITE_HELCIM_PARTNER_ID        – your partner identifier
// Until those are set, the button is disabled ("setup pending").

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const REG_URL = import.meta.env.VITE_HELCIM_REGISTRATION_URL || ''
const PARTNER_ID = import.meta.env.VITE_HELCIM_PARTNER_ID || ''

export default function ConnectPayments() {
  const [status, setStatus] = useState('loading') // loading|none|pending|connected|failed
  const [accountId, setAccountId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function load() {
    const { data, error } = await supabase.rpc('my_payment_connection')
    if (error) return setStatus('none')
    setStatus(data?.status || 'none')
    setAccountId(data?.account_id || null)
  }
  useEffect(() => {
    load()
  }, [])

  async function connect() {
    setErr('')
    if (!REG_URL || !PARTNER_ID) {
      setErr('Payment onboarding isn’t configured yet (partner setup pending).')
      return
    }
    setBusy(true)
    try {
      const { data: ref, error } = await supabase.rpc('start_payment_connection')
      if (error) throw error
      // Send the tenant to Helcim to complete merchant signup, tagged with our
      // ref so the approval webhook links the token back to this tenant.
      const url = `${REG_URL}?partner=${encodeURIComponent(PARTNER_ID)}&ref=${encodeURIComponent(ref)}`
      window.location.href = url
    } catch (e) {
      setErr(e?.message || 'Could not start the connection.')
      setBusy(false)
    }
  }

  const configured = !!REG_URL && !!PARTNER_ID

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 max-w-lg">
      <h3 className="text-base font-bold text-gray-900 mb-1">Accept payments from your clients</h3>
      <p className="text-sm text-gray-500 mb-4">
        Connect your Helcim merchant account to collect invoice payments and deposits. Funds go to
        your account; setup takes a few minutes.
      </p>

      {status === 'loading' ? (
        <div className="text-sm text-gray-400">Checking status…</div>
      ) : status === 'connected' ? (
        <div className="flex items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium">
            ✓ Connected
          </span>
          {accountId && <span className="text-gray-500">Account {accountId}</span>}
        </div>
      ) : status === 'pending' ? (
        <div className="text-sm">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
            ⏳ Application in review
          </span>
          <p className="text-xs text-gray-500 mt-2">
            We’ll switch this to Connected automatically once Helcim approves your account.
          </p>
          <button onClick={load} className="text-xs text-green-700 hover:underline mt-2">Refresh status</button>
        </div>
      ) : (
        <>
          <button
            onClick={connect}
            disabled={busy || !configured}
            className="btn-primary text-sm px-4 py-2 disabled:opacity-50"
            title={configured ? '' : 'Partner setup pending'}
          >
            {busy ? 'Starting…' : 'Connect Helcim'}
          </button>
          {status === 'failed' && (
            <p className="text-xs text-red-600 mt-2">The last attempt didn’t complete — try again.</p>
          )}
          {!configured && (
            <p className="text-xs text-gray-400 mt-2">
              Payment onboarding will turn on once the platform’s Helcim partner setup is complete.
            </p>
          )}
        </>
      )}
      {err && <p className="text-xs text-red-600 mt-3">{err}</p>}
    </div>
  )
}
