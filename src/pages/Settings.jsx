import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function Settings() {
  const { user, signOut } = useAuth()
  const [form, setForm] = useState({
    company_name: '',
    license_number: '',
    labor_rate_per_man_day: '400',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { fetchSettings() }, [])

  async function fetchSettings() {
    setLoading(true)
    const { data } = await supabase.from('company_settings').select('*').single()
    if (data) {
      setForm({
        company_name: data.company_name || '',
        license_number: data.license_number || '',
        labor_rate_per_man_day: String(data.labor_rate_per_man_day || '400'),
      })
    }
    setLoading(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    const rate = parseFloat(form.labor_rate_per_man_day)
    if (isNaN(rate) || rate <= 0) return setError('Labor rate must be a positive number.')
    setSaving(true)
    const { error: saveErr } = await supabase.from('company_settings').update({
      company_name: form.company_name.trim(),
      license_number: form.license_number.trim(),
      labor_rate_per_man_day: rate,
      updated_at: new Date().toISOString(),
    }).eq('id', (await supabase.from('company_settings').select('id').single()).data?.id)
    setSaving(false)
    if (saveErr) {
      setError(saveErr.message)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-700"></div></div>

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      {/* Company settings */}
      <div className="card mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Company Settings</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Company Name</label>
            <input className="input" value={form.company_name} onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))} placeholder="Your Company Name" />
          </div>
          <div>
            <label className="label">License Number</label>
            <input className="input" value={form.license_number} onChange={e => setForm(p => ({ ...p, license_number: e.target.value }))} placeholder="e.g. CA-12345" />
          </div>
          <div>
            <label className="label">Labor Rate — Per Man Day (1 MD = 8 hrs)</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-400">$</span>
              <input
                className="input pl-7"
                type="number"
                min="1"
                step="0.01"
                value={form.labor_rate_per_man_day}
                onChange={e => setForm(p => ({ ...p, labor_rate_per_man_day: e.target.value }))}
                placeholder="400.00"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              This rate is used across all crew types for GP calculations. At ${parseFloat(form.labor_rate_per_man_day || 0).toFixed(2)}/MD, that's ${(parseFloat(form.labor_rate_per_man_day || 0) / 8).toFixed(2)}/hr.
            </p>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
          {saved && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2 rounded-lg">✓ Settings saved successfully.</div>}

          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>

      {/* Account info */}
      <div className="card mb-6">
        <h2 className="font-semibold text-gray-900 mb-3">Account</h2>
        <p className="text-sm text-gray-600 mb-1"><span className="font-medium">Signed in as:</span> {user?.email}</p>
        <p className="text-xs text-gray-400 mb-4">To add or remove team members, use the Supabase dashboard under Authentication → Users.</p>
        <button onClick={signOut} className="btn-danger w-full">Sign Out</button>
      </div>

      {/* How GP is calculated */}
      <div className="card bg-green-50 border-green-200">
        <h2 className="font-semibold text-green-900 mb-2">How GP is Calculated</h2>
        <div className="text-sm text-green-800 space-y-1.5">
          <p><b>Revenue</b> = Contract Price + Change Order Prices</p>
          <p><b>Labor Cost</b> = Total Man Days × Rate per Man Day</p>
          <p><b>Total Cost</b> = Labor Cost + Material Cost</p>
          <p><b>Gross Profit</b> = Revenue − Total Cost</p>
          <p><b>GP %</b> = Gross Profit ÷ Revenue × 100</p>
          <hr className="border-green-200 my-2" />
          <p className="text-xs text-green-700">1 Man Day = 8 hours. A module with 3 man days at ${parseFloat(form.labor_rate_per_man_day || 400).toFixed(0)}/MD = ${(3 * parseFloat(form.labor_rate_per_man_day || 400)).toLocaleString()} labor cost.</p>
        </div>
      </div>
    </div>
  )
}
