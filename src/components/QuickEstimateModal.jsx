// ─────────────────────────────────────────────────────────────────────────────
// QuickEstimateModal — the dashboard "Quick Estimate" shortcut.
//
// Flow:
//   1. Search an existing opportunity OR an existing contact.
//   2a. Opportunity with no estimates → straight to the new-estimate form.
//   2b. Opportunity with estimates → choose "new" or open an existing one.
//   2c. Contact → confirm "add as opportunity" → create the client → new estimate.
//
// Reuses NewEstimateModal for the name/type step. The estimate insert mirrors
// ClientDetail.jsx's handleEstimateNext; the contact→client conversion mirrors
// ContactDetail.jsx's handleAddAsClient.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import NewEstimateModal from './NewEstimateModal'

const fmtDate = d => {
  if (!d) return ''
  const x = new Date(d)
  return isNaN(x.getTime())
    ? ''
    : x.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const contactName = ct =>
  [ct?.first_name, ct?.last_name].filter(Boolean).join(' ') || 'Unnamed contact'

export default function QuickEstimateModal({ onClose }) {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [mode, setMode] = useState('opportunity') // 'opportunity' | 'contact'
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [step, setStep] = useState('search') // search | estimate-choice | estimate-list | new-estimate | contact-confirm
  const [client, setClient] = useState(null) // { id, name }
  const [contact, setContact] = useState(null)
  const [estimates, setEstimates] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Debounced search — opportunities (clients) or contacts.
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setSearching(false)
      return
    }
    let alive = true
    setSearching(true)
    const t = setTimeout(async () => {
      try {
        if (mode === 'opportunity') {
          const { data } = await supabase
            .from('clients')
            .select('id, name')
            .ilike('name', `%${q}%`)
            .order('name')
            .limit(25)
          if (alive) setResults(data || [])
        } else {
          const { data } = await supabase
            .from('contacts')
            .select('id, first_name, last_name, email, client_id')
            .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
            .order('last_name')
            .limit(25)
          if (alive) setResults(data || [])
        }
      } catch {
        if (alive) setResults([])
      } finally {
        if (alive) setSearching(false)
      }
    }, 300)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [query, mode])

  function switchMode(m) {
    if (m === mode) return
    setMode(m)
    setQuery('')
    setResults([])
    setError('')
  }

  async function pickOpportunity(c) {
    setBusy(true)
    setError('')
    const { data, error: e } = await supabase
      .from('estimates')
      .select('id, estimate_name, type, status, created_at')
      .eq('client_id', c.id)
      .order('created_at', { ascending: false })
    setBusy(false)
    if (e) {
      setError(e.message)
      return
    }
    setClient({ id: c.id, name: c.name })
    const ests = data || []
    setEstimates(ests)
    setStep(ests.length ? 'estimate-choice' : 'new-estimate')
  }

  function pickContact(ct) {
    setContact(ct)
    setError('')
    setStep('contact-confirm')
  }

  // Confirm: turn the chosen contact into an opportunity, then start an estimate.
  async function confirmContact() {
    setBusy(true)
    setError('')
    try {
      // Already linked to a client? Reuse it rather than creating a duplicate.
      if (contact.client_id) {
        const { data: existing } = await supabase
          .from('clients')
          .select('id, name')
          .eq('id', contact.client_id)
          .maybeSingle()
        if (existing) {
          setClient({ id: existing.id, name: existing.name })
          setStep('new-estimate')
          return
        }
      }
      // Pull the full contact record so every field copies across.
      const { data: c, error: cErr } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contact.id)
        .single()
      if (cErr) throw cErr
      const name = [c.first_name, c.last_name].filter(Boolean).join(' ')
      const { data: newClient, error: e } = await supabase
        .from('clients')
        .insert({
          client_type: 'individual',
          first_name: c.first_name || null,
          last_name: c.last_name || null,
          name,
          spouse_first_name: c.secondary_first_name || null,
          spouse_last_name: c.secondary_last_name || null,
          email: c.email || null,
          phone: c.phone || null,
          cell: c.cell || null,
          additional_emails:
            Array.isArray(c.additional_emails) && c.additional_emails.length
              ? c.additional_emails
              : null,
          additional_phones:
            Array.isArray(c.additional_phones) && c.additional_phones.length
              ? c.additional_phones
              : null,
          street: c.street_address || null,
          city: c.city || null,
          state: c.state || null,
          zip: c.zip || null,
          notes: c.notes || null,
          created_by: user?.id,
        })
        .select('id, name')
        .single()
      if (e) {
        setError(e.message)
        return
      }
      // Stamp the new client's id on the contact so the link is bidirectional.
      await supabase.from('contacts').update({ client_id: newClient.id }).eq('id', c.id)
      setClient({ id: newClient.id, name: newClient.name })
      setStep('new-estimate')
    } catch (err) {
      setError(err.message || 'Could not add the contact as an opportunity.')
    } finally {
      setBusy(false)
    }
  }

  // Create the estimate (name/type from NewEstimateModal) and open the editor.
  async function createEstimate(data) {
    setBusy(true)
    setError('')
    const { data: est, error: e } = await supabase
      .from('estimates')
      .insert({
        estimate_name: data.name,
        type: data.type,
        client_name: client.name,
        client_id: client.id,
        status: 'pending',
      })
      .select('id')
      .single()
    setBusy(false)
    if (e) {
      setError(e.message)
      return
    }
    onClose()
    navigate(`/estimates/${est.id}`)
  }

  function openEstimate(id) {
    onClose()
    navigate(`/estimates/${id}`)
  }

  // The new-estimate step hands off entirely to NewEstimateModal.
  if (step === 'new-estimate' && client) {
    return <NewEstimateModal client={client} onClose={onClose} onNext={createEstimate} />
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4 gap-3">
          <div>
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-0.5">
              Quick Estimate
            </p>
            <h2 className="text-lg font-bold text-gray-900">
              {step === 'search' && 'Choose who to estimate'}
              {step === 'estimate-choice' && (client?.name || 'Opportunity')}
              {step === 'estimate-list' && 'Open an estimate'}
              {step === 'contact-confirm' && 'Add as opportunity'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-gray-600 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {error && (
          <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {/* ── SEARCH ── */}
        {step === 'search' && (
          <>
            <div className="flex gap-2 mb-3">
              {[
                { k: 'opportunity', label: 'Opportunity' },
                { k: 'contact', label: 'Contact' },
              ].map(m => (
                <button
                  key={m.k}
                  onClick={() => switchMode(m.k)}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    mode === m.k
                      ? 'bg-green-700 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={mode === 'opportunity' ? 'Search opportunities…' : 'Search contacts…'}
              className="input mb-2"
            />
            <div className="max-h-64 overflow-y-auto -mx-1 px-1">
              {searching ? (
                <p className="text-xs text-gray-400 py-6 text-center">Searching…</p>
              ) : query.trim().length < 2 ? (
                <p className="text-xs text-gray-400 py-6 text-center">
                  Type at least 2 characters to search.
                </p>
              ) : results.length === 0 ? (
                <p className="text-xs text-gray-400 py-6 text-center">No matches.</p>
              ) : mode === 'opportunity' ? (
                results.map(c => (
                  <button
                    key={c.id}
                    disabled={busy}
                    onClick={() => pickOpportunity(c)}
                    className="block w-full text-left rounded-lg px-3 py-2 text-sm text-gray-800 hover:bg-green-50 disabled:opacity-50"
                  >
                    {c.name || 'Unnamed opportunity'}
                  </button>
                ))
              ) : (
                results.map(ct => (
                  <button
                    key={ct.id}
                    onClick={() => pickContact(ct)}
                    className="block w-full text-left rounded-lg px-3 py-2 hover:bg-green-50"
                  >
                    <span className="text-sm text-gray-800">{contactName(ct)}</span>
                    {ct.email && <span className="block text-xs text-gray-400">{ct.email}</span>}
                  </button>
                ))
              )}
            </div>
          </>
        )}

        {/* ── ESTIMATE CHOICE ── */}
        {step === 'estimate-choice' && (
          <>
            <p className="text-sm text-gray-600 mb-4">
              {client?.name} already has {estimates.length} estimate
              {estimates.length === 1 ? '' : 's'}. What would you like to do?
            </p>
            <div className="space-y-2">
              <button
                onClick={() => setStep('new-estimate')}
                className="block w-full text-left rounded-xl border border-gray-200 px-4 py-3 hover:border-green-300 hover:bg-green-50"
              >
                <p className="text-sm font-semibold text-gray-800">+ Start a new estimate</p>
                <p className="text-xs text-gray-500">
                  Create a fresh estimate for this opportunity.
                </p>
              </button>
              <button
                onClick={() => setStep('estimate-list')}
                className="block w-full text-left rounded-xl border border-gray-200 px-4 py-3 hover:border-green-300 hover:bg-green-50"
              >
                <p className="text-sm font-semibold text-gray-800">Open an existing estimate</p>
                <p className="text-xs text-gray-500">Pick from this opportunity's estimates.</p>
              </button>
            </div>
            <button
              onClick={() => setStep('search')}
              className="mt-4 text-xs text-gray-400 hover:text-gray-700"
            >
              ← Back to search
            </button>
          </>
        )}

        {/* ── ESTIMATE LIST ── */}
        {step === 'estimate-list' && (
          <>
            <div className="max-h-72 overflow-y-auto space-y-1.5">
              {estimates.map(est => (
                <button
                  key={est.id}
                  onClick={() => openEstimate(est.id)}
                  className="block w-full text-left rounded-xl border border-gray-200 px-3 py-2 hover:border-green-300 hover:bg-green-50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-800 truncate">
                      {est.estimate_name || 'Untitled estimate'}
                    </span>
                    {est.status && (
                      <span className="text-[10px] font-semibold uppercase rounded-full bg-gray-100 text-gray-600 px-2 py-0.5 flex-shrink-0">
                        {est.status}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    {[est.type, fmtDate(est.created_at)].filter(Boolean).join(' · ')}
                  </p>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep('estimate-choice')}
              className="mt-4 text-xs text-gray-400 hover:text-gray-700"
            >
              ← Back
            </button>
          </>
        )}

        {/* ── CONTACT CONFIRM ── */}
        {step === 'contact-confirm' && (
          <>
            <p className="text-sm text-gray-600 mb-4">
              <span className="font-semibold text-gray-800">{contactName(contact)}</span> is a
              contact. Continuing will add them as an opportunity, then start a new estimate.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setStep('search')}
                disabled={busy}
                className="btn-secondary flex-1"
              >
                Back
              </button>
              <button onClick={confirmContact} disabled={busy} className="btn-primary flex-1">
                {busy ? 'Adding…' : 'Add & Continue →'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
