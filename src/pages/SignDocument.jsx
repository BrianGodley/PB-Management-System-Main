// src/pages/SignDocument.jsx
// Public, no-login signer page reached via /sign/<access_token> (DocuSign-style).
// Loads the document through the tokenized SECURITY DEFINER RPCs, lets the buyer
// fill their fields + sign, and submits. RLS never opens to anon — everything
// goes through edoc_get_by_token / edoc_mark_viewed / edoc_submit.
import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import EDocFillView from '../components/edoc/EDocFillView'
import { flattenEDoc, mergeFieldValues, downloadBytes } from '../lib/flattenEDoc'

const BUCKET = 'edocuments'

// Load Helcim's hosted HelcimPay.js once (same approach as the client portal).
function loadHelcimPay() {
  return new Promise((resolve, reject) => {
    if (window.appendHelcimPayIframe) return resolve()
    let s = document.getElementById('helcim-pay-js')
    if (!s) {
      s = document.createElement('script')
      s.id = 'helcim-pay-js'
      s.src = 'https://secure.helcim.app/helcim-pay/services/start.js'
      s.onload = () => resolve()
      s.onerror = () => reject(new Error('Could not load the secure payment window.'))
      document.body.appendChild(s)
    } else {
      resolve()
    }
  })
}

export default function SignDocument() {
  const { token } = useParams()
  const [doc, setDoc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [values, setValues] = useState({})
  const [signerName, setSignerName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [depositPaid, setDepositPaid] = useState(false)
  const [paying, setPaying] = useState(false)

  const depositNeeded = !!doc?.deposit_required && Number(doc?.deposit_amount) > 0
  const depositDue = depositNeeded && !depositPaid

  async function payDeposit() {
    setPaying(true)
    try {
      const { data, error } = await supabase.functions.invoke('helcim-checkout', {
        body: { edoc_token: token },
      })
      if (error || !data?.checkoutToken)
        throw new Error(data?.error || error?.message || 'Could not start the payment.')
      const { checkoutToken, amount } = data
      await loadHelcimPay()
      const handler = async event => {
        if (!event.data || event.data.eventName !== `helcim-pay-js-${checkoutToken}`) return
        if (event.data.eventStatus === 'ABORTED') {
          window.removeEventListener('message', handler)
          window.removeHelcimPayIframe?.()
          setPaying(false)
          return
        }
        if (event.data.eventStatus === 'SUCCESS') {
          window.removeEventListener('message', handler)
          let d = null
          try {
            const parsed = JSON.parse(event.data.eventMessage)
            d = parsed?.data?.data || parsed?.data || parsed
          } catch {
            d = null
          }
          const txnId = d?.transactionId || d?.id || null
          const { data: rec, error: re } = await supabase.rpc('edoc_record_deposit', {
            p_token: token,
            p_amount: amount,
            p_txn: txnId ? String(txnId) : null,
          })
          window.removeHelcimPayIframe?.()
          setPaying(false)
          if (re || !rec?.ok) {
            alert(
              'Your payment went through, but recording it failed — please contact Picture Build so we can reconcile it.'
            )
            return
          }
          setDepositPaid(true)
        }
      }
      window.addEventListener('message', handler)
      window.appendHelcimPayIframe(checkoutToken)
    } catch (e) {
      setPaying(false)
      alert(String(e?.message || e))
    }
  }

  async function downloadSigned() {
    if (!url) return
    setDownloading(true)
    try {
      const merged = mergeFieldValues(doc.fields || [], values)
      const bytes = await flattenEDoc(url, merged)
      downloadBytes(bytes, (doc.name || 'signed-document').replace(/[^\w.-]+/g, '_'))
    } catch (e) {
      alert('Could not generate the PDF: ' + (e.message || 'unknown error'))
    } finally {
      setDownloading(false)
    }
  }

  useEffect(() => {
    let alive = true
    async function load() {
      const { data, error } = await supabase.rpc('edoc_get_by_token', { p_token: token })
      if (!alive) return
      if (error || !data) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setDoc(data)
      setSignerName(data.signer_name || '')
      if (data.status === 'completed' || data.status === 'paid') setDone(true)
      if (data.deposit_paid_at || data.status === 'paid') setDepositPaid(true)
      // Seed any previously-entered values from the stored fields.
      const seed = {}
      ;(data.fields || []).forEach(f => {
        if (f.value != null) seed[f.id] = f.value
      })
      setValues(seed)
      setLoading(false)
      // Mark opened (sent → viewed) — fire and forget.
      supabase.rpc('edoc_mark_viewed', { p_token: token })
    }
    load()
    return () => {
      alive = false
    }
  }, [token])

  const url = useMemo(() => {
    if (!doc?.pdf_path) return null
    return supabase.storage.from(BUCKET).getPublicUrl(doc.pdf_path).data.publicUrl
  }, [doc])

  const buyerFields = (doc?.fields || []).filter(f => f.role === 'buyer')

  async function handleSubmit() {
    // Validate required buyer fields.
    const missing = buyerFields.filter(f => {
      if (!f.required) return false
      const v = values[f.id]
      if (f.type === 'checkbox') return !v
      return v == null || v === ''
    })
    if (missing.length) {
      alert(`Please complete: ${missing.map(f => f.label).join(', ')}`)
      return
    }
    if (!signerName.trim()) {
      alert('Please type your full name.')
      return
    }
    setSubmitting(true)
    // Merge values into the fields array so they persist.
    const mergedFields = (doc.fields || []).map(f => ({ ...f, value: values[f.id] ?? f.value ?? null }))
    const firstSig = buyerFields.find(f => f.type === 'signature' && values[f.id])
    const { data, error } = await supabase.rpc('edoc_submit', {
      p_token: token,
      p_fields: mergedFields,
      p_signature: firstSig ? values[firstSig.id] : null,
      p_signed_by: signerName.trim(),
    })
    setSubmitting(false)
    if (error || !data?.ok) {
      alert('Submit failed: ' + (data?.error || error?.message || 'unknown error'))
      return
    }
    setDone(true)
    window.scrollTo(0, 0)
  }

  if (loading) {
    return <CenterMsg>Loading document…</CenterMsg>
  }
  if (notFound) {
    return (
      <CenterMsg>
        This signing link is invalid or has expired. Please contact Picture Build for a new link.
      </CenterMsg>
    )
  }

  return (
    <div className="min-h-screen bg-gray-200">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">
              Picture Build · Document for signature
            </p>
            <h1 className="text-lg font-bold text-gray-900 truncate">{doc.name}</h1>
          </div>
          {!done && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-shrink-0 bg-green-700 text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-green-800 disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Finish & Sign'}
            </button>
          )}
        </div>
      </div>

      {done && depositDue ? (
        <div className="max-w-md mx-auto mt-16 bg-white rounded-2xl shadow p-8 text-center">
          <div className="text-3xl mb-2">💳</div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">One last step — your deposit</h2>
          <p className="text-sm text-gray-500 mb-1">
            Your document is signed. To lock in your contract, please pay the deposit below.
          </p>
          <p className="text-3xl font-bold text-gray-900 my-3">
            ${Number(doc.deposit_amount).toLocaleString()}
          </p>
          <button
            onClick={payDeposit}
            disabled={paying}
            className="bg-green-700 text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:bg-green-800 disabled:opacity-50"
          >
            {paying ? 'Opening secure payment…' : 'Pay deposit'}
          </button>
          <p className="text-[11px] text-gray-400 mt-3">
            Payment is processed securely by Helcim. Card or bank accepted.
          </p>
          <button
            onClick={downloadSigned}
            disabled={downloading}
            className="block mx-auto mt-4 text-xs text-gray-500 hover:underline"
          >
            {downloading ? 'Preparing…' : 'Download signed copy'}
          </button>
        </div>
      ) : done ? (
        <div className="max-w-md mx-auto mt-16 bg-white rounded-2xl shadow p-8 text-center">
          <div className="text-4xl mb-2">✅</div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Thank you — you're all set.</h2>
          <p className="text-sm text-gray-500 mb-4">
            Your document is signed{depositNeeded ? ' and your deposit is paid' : ''}. You can
            download a copy for your records.
          </p>
          <button
            onClick={downloadSigned}
            disabled={downloading}
            className="bg-green-700 text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-green-800 disabled:opacity-50"
          >
            {downloading ? 'Preparing…' : '⬇ Download signed copy'}
          </button>
        </div>
      ) : (
        <>
          <div className="max-w-4xl mx-auto px-4 pt-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-2 flex flex-wrap items-center gap-3">
              <label className="text-sm text-gray-700 font-medium">Your full name:</label>
              <input
                value={signerName}
                onChange={e => setSignerName(e.target.value)}
                placeholder="Type your full legal name"
                className="flex-1 min-w-[200px] border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-green-500"
              />
              <span className="text-xs text-gray-500">
                Click the blue fields in the document to fill and sign.
              </span>
            </div>
          </div>
          <EDocFillView
            url={url}
            numPages={doc.page_count}
            fields={doc.fields || []}
            values={values}
            setValues={setValues}
            fillRole="buyer"
          />
        </>
      )}
    </div>
  )
}

function CenterMsg({ children }) {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow p-8 max-w-md text-center text-sm text-gray-600">
        {children}
      </div>
    </div>
  )
}
