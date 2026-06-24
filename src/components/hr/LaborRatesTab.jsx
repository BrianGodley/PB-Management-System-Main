// ─────────────────────────────────────────────────────────────────────────────
// LaborRatesTab — HR → Settings → Labor Rates
// Builds the company's fully-burdened crew labor cost and pushes it into the
// rates the rest of the system already reads:
//   • company_settings.labor_rate_per_hour     → the estimator (all modules)
//   • company_settings.labor_rate_per_man_day  → job / work-order tracking (= ×8)
//
// Total Avg Crew Member Labor Cost ($/hr) =
//   base avg hourly crew rate
//   + base × (FICA + Medicare + FUTA + SUTA + Work Comp + SDI + GL)%   ← burden
//   + average PTO $/hr across crew employees
//       where per-employee PTO $/hr = (pto_days × 8 × hourly) / 1920
//
// "Crew" employees = those whose job title is Crew Chief or Crew Member.
// Health insurance is captured on the employee but NOT included here.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'

const WORK_HOURS_YEAR = 1920 // 40 hr/wk × 48 working weeks — spreads PTO across worked hours
const num = v => {
  const n = parseFloat(v)
  return isNaN(n) ? 0 : n
}
const money = n => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const hourlyOf = e => (e.pay_type === 'salary' ? num(e.pay_rate) / 2080 : num(e.pay_rate))
const isCrew = e => {
  const t = (e.job_title || '').toLowerCase()
  return t.includes('crew chief') || t.includes('crew member')
}

const BURDENS = [
  ['burden_fica_rate', 'FICA Rate'],
  ['burden_medicare_rate', 'Medicare Rate'],
  ['burden_futa_rate', 'Federal Unemployment Rate'],
  ['burden_suta_rate', 'State Unemployment Rate'],
  ['burden_workcomp_rate', 'Workers Comp Rate'],
  ['burden_sdi_rate', 'State Disability Rate'],
  ['burden_gl_rate', 'General Liability Rate'],
]

export default function LaborRatesTab() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [settingsId, setSettingsId] = useState(null)
  const [crew, setCrew] = useState([])

  const [form, setForm] = useState({
    avg_hourly_crew_rate: '',
    burden_fica_rate: '6.2',
    burden_medicare_rate: '1.45',
    burden_futa_rate: '0.6',
    burden_suta_rate: '0',
    burden_workcomp_rate: '0',
    burden_sdi_rate: '0',
    burden_gl_rate: '0',
    avg_pto_days: '10',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    ;(async () => {
      const [cs, emps] = await Promise.all([
        supabase
          .from('company_settings')
          .select(
            'id, avg_hourly_crew_rate, burden_fica_rate, burden_medicare_rate, burden_futa_rate, burden_suta_rate, burden_workcomp_rate, burden_sdi_rate, burden_gl_rate, avg_pto_days'
          )
          .maybeSingle(),
        supabase
          .from('employees')
          .select('id, first_name, last_name, job_title, pay_rate, pay_type, pto_days, status')
          .eq('status', 'active'),
      ])
      const crewEmps = (emps.data || []).filter(isCrew)
      const ptoVals = crewEmps.map(e => num(e.pto_days)).filter(d => d > 0)
      const empPtoAvg = ptoVals.length ? Math.round(ptoVals.reduce((a, b) => a + b, 0) / ptoVals.length) : null
      if (cs.data) {
        setSettingsId(cs.data.id)
        setForm(f => ({
          ...f,
          avg_hourly_crew_rate: cs.data.avg_hourly_crew_rate != null ? String(cs.data.avg_hourly_crew_rate) : '',
          burden_fica_rate: String(cs.data.burden_fica_rate ?? '6.2'),
          burden_medicare_rate: String(cs.data.burden_medicare_rate ?? '1.45'),
          burden_futa_rate: String(cs.data.burden_futa_rate ?? '0.6'),
          burden_suta_rate: String(cs.data.burden_suta_rate ?? '0'),
          burden_workcomp_rate: String(cs.data.burden_workcomp_rate ?? '0'),
          burden_sdi_rate: String(cs.data.burden_sdi_rate ?? '0'),
          burden_gl_rate: String(cs.data.burden_gl_rate ?? '0'),
          avg_pto_days:
            cs.data.avg_pto_days != null ? String(cs.data.avg_pto_days) : empPtoAvg != null ? String(empPtoAvg) : '10',
        }))
      } else if (empPtoAvg != null) {
        setForm(f => ({ ...f, avg_pto_days: String(empPtoAvg) }))
      }
      setCrew(crewEmps)
      setLoading(false)
    })()
  }, [])

  // ── derived numbers ─────────────────────────────────────────────────────────
  const computedAvg = useMemo(() => {
    const rates = crew.map(hourlyOf).filter(r => r > 0)
    return rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : 0
  }, [crew])

  const base = num(form.avg_hourly_crew_rate)
  const otherBurdenPct = BURDENS.reduce((s, [k]) => s + num(form[k]), 0)

  // Paid Time Off as a labor-burden %: PTO hours ÷ annual working hours.
  //   days × 8 (hr/day) = PTO hours;  ÷ 1920 working hr/yr = fraction of wages.
  const ptoDays = num(form.avg_pto_days)
  const ptoPct = ((ptoDays * 8) / WORK_HOURS_YEAR) * 100

  // PTO now lives inside the burden total (it's just another burden line).
  const burdenPct = otherBurdenPct + ptoPct
  const burdenPerHour = base * (burdenPct / 100)
  const total = base + burdenPerHour

  const save = async () => {
    setMsg('')
    if (!(base > 0)) {
      setMsg('error:Enter an average hourly crew rate first.')
      return
    }
    if (!settingsId) {
      setMsg('error:Company settings row not found.')
      return
    }
    setSaving(true)
    const totalRounded = Math.round(total * 100) / 100
    // Burden + PTO expressed as ONE fraction of the base wage, so the estimator
    // can keep a separate Labor line (wage) and Burden line (wage × fraction)
    // in the GPMD bar. wage + wage×fraction == the fully-loaded Total.
    const burdenFraction = burdenPct / 100 // burdenPct already includes the PTO %
    const payload = {
      avg_hourly_crew_rate: base,
      burden_fica_rate: num(form.burden_fica_rate),
      burden_medicare_rate: num(form.burden_medicare_rate),
      burden_futa_rate: num(form.burden_futa_rate),
      burden_suta_rate: num(form.burden_suta_rate),
      burden_workcomp_rate: num(form.burden_workcomp_rate),
      burden_sdi_rate: num(form.burden_sdi_rate),
      burden_gl_rate: num(form.burden_gl_rate),
      avg_pto_days: ptoDays,
      // Estimator pulls these two SEPARATELY (Labor vs Burden for the GPMD bar):
      labor_rate_per_hour: Math.round(base * 100) / 100, // base crew wage
      labor_burden_pct: Math.round(burdenFraction * 10000) / 10000, // all burden + PTO, as fraction
      // Job / work-order tracking: one fully-loaded man-day rate.
      labor_rate_per_man_day: Math.round(totalRounded * 8 * 100) / 100,
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('company_settings').update(payload).eq('id', settingsId)
    setSaving(false)
    setMsg(
      error
        ? 'error:' + error.message
        : `ok:Saved. Estimator uses ${money(base)}/hr wage + ${(burdenFraction * 100).toFixed(1)}% burden = ${money(totalRounded)}/hr loaded (${money(totalRounded * 8)}/man-day for job tracking).`
    )
  }

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>

  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600'
  const lbl = 'block text-xs font-semibold text-gray-600 mb-1'
  const lblGreen = 'block text-xs font-semibold text-green-700 mb-1'
  const inpGreen = `${inp} text-green-700 font-semibold`

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h3 className="font-semibold text-gray-900">Labor Rates</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Builds your fully-burdened crew labor cost. Saving updates the rate the estimator and job
          tracking use everywhere.
        </p>
      </div>

      {/* Base rate + computed actual */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 grid sm:grid-cols-2 gap-4">
        <div>
          <label className={lblGreen}>
            Average Hourly Crew Rate <span className="font-normal">(User Entered for System Calculation)</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600 text-sm">$</span>
            <input
              type="number" step="0.01"
              value={form.avg_hourly_crew_rate}
              onChange={e => set('avg_hourly_crew_rate', e.target.value)}
              placeholder="0.00"
              className={`${inpGreen} pl-7`}
            />
          </div>
          <p className="text-[11px] text-gray-400 mt-1">The base crew wage used in the calculation.</p>
        </div>
        <div>
          <label className={lbl}>
            Average Hourly Crew Rate <span className="font-normal text-gray-400">(Auto Pulled From Files for Comparison)</span>
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-800">
              {computedAvg > 0 ? money(computedAvg) : '—'}
            </div>
            <button
              type="button"
              onClick={() => set('avg_hourly_crew_rate', computedAvg ? computedAvg.toFixed(2) : '')}
              disabled={!computedAvg}
              className="px-3 py-2 text-xs font-semibold rounded-lg border border-green-600 text-green-700 hover:bg-green-50 disabled:opacity-40"
            >
              Use
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            Live average of pay rates for {crew.length} employee{crew.length !== 1 ? 's' : ''} titled “Crew
            Chief” / “Crew Member.”
          </p>
        </div>
      </div>

      {/* Burden rates */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <p className="text-sm font-semibold text-gray-700 mb-3">Labor Burden Rates <span className="font-normal text-gray-400">(% of wages)</span></p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {BURDENS.map(([k, label]) => (
            <div key={k}>
              <label className={lblGreen}>{label}</label>
              <div className="relative">
                <input
                  type="number" step="0.01"
                  value={form[k]}
                  onChange={e => set(k, e.target.value)}
                  className={`${inpGreen} pr-7`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600 text-sm">%</span>
              </div>
            </div>
          ))}

          {/* Paid Time Off — entered as days, shown as a burden % */}
          <div>
            <label className={lblGreen}>Average PTO Days</label>
            <input
              type="number" step="1" min="0"
              value={form.avg_pto_days}
              onChange={e => set('avg_pto_days', e.target.value)}
              className={inpGreen}
            />
            <p className="text-[10px] text-gray-400 mt-0.5">Avg paid days off per year.</p>
          </div>
          <div>
            <label className={lblGreen}>Paid Time Off Rate</label>
            <div className="relative">
              <div className="w-full border border-green-200 bg-green-50 rounded-lg px-3 py-2 text-sm font-semibold text-green-700">
                {ptoPct.toFixed(2)}
              </div>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600 text-sm">%</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">PTO days × 8 ÷ {WORK_HOURS_YEAR} working hrs.</p>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-500">
          Total burden (incl. PTO): <span className="font-semibold text-gray-700">{burdenPct.toFixed(2)}%</span> ={' '}
          <span className="font-semibold text-gray-700">{money(burdenPerHour)}/hr</span> on the base rate.
        </div>
      </div>

      {/* Total */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-gray-900">Total Average Crew Member Labor Cost</p>
            <p className="text-[11px] text-gray-400">Base wage + burden (incl. PTO). The estimator pulls the wage and burden % separately (keeps the GPMD Labor/Burden split); job tracking uses the loaded man-day rate.</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-green-700">{money(total)}<span className="text-sm font-medium text-gray-400">/hr</span></p>
            <p className="text-[11px] text-gray-400">{money(total * 8)}/man-day</p>
          </div>
        </div>
      </div>

      {msg && (
        <p className={`text-sm rounded-xl px-3 py-2 ${msg.startsWith('error:') ? 'text-red-600 bg-red-50 border border-red-200' : 'text-green-700 bg-green-50 border border-green-200'}`}>
          {msg.slice(msg.indexOf(':') + 1)}
        </p>
      )}

      <button
        onClick={save}
        disabled={saving}
        className="px-5 py-2.5 bg-green-700 text-white rounded-xl font-semibold hover:bg-green-800 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save Labor Rates'}
      </button>
    </div>
  )
}
