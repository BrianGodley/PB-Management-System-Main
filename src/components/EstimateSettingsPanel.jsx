import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// ─────────────────────────────────────────────────────────────────────────────
// EstimateSettingsPanel — one consolidated home (Sales → Settings → General) for
// every company-wide estimating rate/coefficient. All values live on the single
// company_settings row; the estimator modules read them from here (no code
// defaults). Percentages are stored as fractions (0.29) but edited as percents
// (29) for readability. Money / pace values are stored as-entered.
//
// Fields ↔ columns:
//   Labor Rate ($/hr) ........ labor_rate_per_hour
//   Labor Burden (%) ......... labor_burden_pct           (fraction)
//   Target GPMD ($/man-day) .. estimate_gpmd_default
//   Commission (%) ........... commission_rate            (fraction, NEW column)
//   Sub GP Markup (%) ........ sub_gp_markup_rate         (fraction)
//   Sales Tax (%) ............ sales_tax_rate             (fraction)
//   Walk-Access Pace (Ln Ft/min) .. walk_access_pace_lf_per_min
// ─────────────────────────────────────────────────────────────────────────────

// field descriptor: [key, column, label, kind ('money'|'pct'|'num'), suffix?]
const SECTIONS = [
  {
    title: 'Labor & Production',
    icon: '👷',
    fields: [
      ['laborRate', 'labor_rate_per_hour', 'Labor Rate', 'money', '/ hr'],
      ['burden', 'labor_burden_pct', 'Labor Burden', 'pct'],
      ['gpmd', 'estimate_gpmd_default', 'Target GPMD', 'money', '/ man-day'],
    ],
  },
  {
    title: 'Margins & Markup',
    icon: '📈',
    fields: [
      ['commission', 'commission_rate', 'Commission', 'pct'],
      ['subMarkup', 'sub_gp_markup_rate', 'Subcontractor GP Markup', 'pct'],
    ],
  },
  {
    title: 'Estimating Rules',
    icon: '⚙️',
    fields: [
      ['salesTax', 'sales_tax_rate', 'Sales Tax', 'pct'],
      ['walkPace', 'walk_access_pace_lf_per_min', 'Walk-Access Pace', 'num', 'Ln Ft / min'],
    ],
  },
]
const ALL_FIELDS = SECTIONS.flatMap(s => s.fields)

const toDisplay = (kind, raw) => {
  const n = parseFloat(raw)
  if (!Number.isFinite(n)) return ''
  return kind === 'pct' ? String(+(n * 100).toFixed(4)) : String(n)
}
const toStored = (kind, disp) => {
  const n = parseFloat(disp)
  if (!Number.isFinite(n)) return null
  return kind === 'pct' ? n / 100 : n
}

export default function EstimateSettingsPanel() {
  const [form, setForm] = useState({})
  const [orig, setOrig] = useState({})
  const [rowId, setRowId] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      const { data } = await supabase.from('company_settings').select('*').maybeSingle()
      if (!alive) return
      if (data?.id) setRowId(data.id)
      const next = {}
      ALL_FIELDS.forEach(([key, col, , kind]) => {
        next[key] = data ? toDisplay(kind, data[col]) : ''
      })
      setForm(next)
      setOrig(next)
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [])

  const setField = (key, v) => {
    setForm(f => ({ ...f, [key]: v }))
    if (msg) setMsg('')
  }
  const dirty = ALL_FIELDS.some(([key]) => form[key] !== orig[key])

  async function save() {
    setSaving(true)
    setMsg('')
    const payload = { id: rowId, updated_at: new Date().toISOString() }
    for (const [key, col, label, kind] of ALL_FIELDS) {
      const disp = form[key]
      if (disp === '' || disp == null) continue // leave unset fields alone
      const stored = toStored(kind, disp)
      if (stored == null || stored < 0) {
        setMsg(`error:Enter a valid number for ${label}.`)
        setSaving(false)
        return
      }
      payload[col] = stored
    }
    const { error } = await supabase.from('company_settings').upsert(payload, { onConflict: 'id' })
    if (error) {
      setMsg('error:' + error.message)
    } else {
      setOrig(form)
      setMsg('ok:Estimate settings saved. Newly opened estimates use these values.')
      setTimeout(() => setMsg(''), 5000)
    }
    setSaving(false)
  }

  return (
    <div className="w-full max-w-3xl">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4 mb-1">
          <h2 className="text-base font-semibold text-gray-800">Estimate Settings</h2>
          <div className="flex items-center gap-2">
            {msg && (
              <span
                className={`text-xs px-2 py-1 rounded ${
                  msg.startsWith('ok:')
                    ? 'text-green-800 bg-green-50 border border-green-200'
                    : 'text-red-700 bg-red-50 border border-red-200'
                }`}
              >
                {msg.slice(msg.indexOf(':') + 1)}
              </span>
            )}
            <button
              onClick={save}
              disabled={!dirty || saving}
              className="text-sm font-semibold text-white bg-green-700 hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Company-wide rates every estimate is built from. Changing a value affects estimates opened
          after you save; existing estimates keep the values they were created with.
        </p>

        {loading ? (
          <div className="py-10 text-center text-gray-400 text-sm">Loading…</div>
        ) : (
          <div className="space-y-6">
            {SECTIONS.map(sec => (
              <div key={sec.title}>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span>{sec.icon}</span> {sec.title}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {sec.fields.map(([key, , label, kind, suffix]) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                      <div className="flex items-stretch">
                        {kind === 'money' && (
                          <span className="inline-flex items-center px-2.5 text-sm text-gray-500 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg">
                            $
                          </span>
                        )}
                        <input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          min="0"
                          value={form[key] ?? ''}
                          onChange={e => setField(key, e.target.value)}
                          className={`w-full min-w-0 text-sm border border-gray-300 px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                            kind === 'money' ? '' : 'rounded-l-lg'
                          } ${kind === 'pct' || suffix ? '' : 'rounded-r-lg'}`}
                        />
                        {kind === 'pct' && (
                          <span className="inline-flex items-center px-2.5 text-sm text-gray-500 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg">
                            %
                          </span>
                        )}
                        {kind !== 'pct' && suffix && (
                          <span className="inline-flex items-center px-2.5 text-xs text-gray-500 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg whitespace-nowrap">
                            {suffix}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 leading-relaxed">
          <strong>Heads up:</strong> these are the baseline values for <em>new</em> estimates. Existing
          modules keep whatever they were created with; reprice them via the project's GPMD override or
          the What If? modal.
        </div>
      </div>
    </div>
  )
}
