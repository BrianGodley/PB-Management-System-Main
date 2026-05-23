// ─────────────────────────────────────────────────────────────────────────────
// AddEmployeeModal — shared "Add New Employee" modal.
//
// Extracted from HR.jsx so it can also be opened from the Dashboard's Quick
// Links. Optionally creates a Supabase auth account + profile when the email
// and password fields are filled in.
//
// Props: { onSave, onClose, positions = [] }
//   onSave — called after a successful save (caller closes / refreshes)
//   positions — [{ id, title }] for the Position dropdown (optional)
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

const DEPARTMENTS = ['Operations', 'Landscaping', 'Pool', 'Admin', 'Sales', 'Other']

// ── Password generator ────────────────────────────────────────────────────────
function generatePassword(len = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%'
  return Array.from(crypto.getRandomValues(new Uint8Array(len)))
    .map(b => chars[b % chars.length])
    .join('')
}

export default function AddEmployeeModal({ onSave, onClose, positions = [] }) {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    nickname: '',
    email: '',
    phone: '',
    cell_phone: '',
    job_title: '',
    department: '',
    start_date: '',
    pay_rate: '',
    pay_type: 'hourly',
    username: '',
    password: generatePassword(),
    role: 'user',
    showPassword: false,
    user_id: null,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const copyPassword = () => {
    navigator.clipboard.writeText(form.password)
  }

  const handleNameBlur = () => {
    if (!form.username && form.first_name.trim() && form.last_name.trim()) {
      const suggested = `${form.first_name} ${form.last_name}`
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '.')
        .replace(/[^a-z0-9.]/g, '')
      set('username', suggested)
    }
  }

  async function handleSave() {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('First and last name are required')
      return
    }
    setSaving(true)
    let newUserId = null

    try {
      // Insert employee record first
      const { data: empData, error: empErr } = await supabase
        .from('employees')
        .insert({
          first_name: form.first_name,
          last_name: form.last_name,
          nickname: form.nickname,
          email: form.email,
          phone: form.phone,
          cell_phone: form.cell_phone,
          job_title: form.job_title,
          department: form.department,
          start_date: form.start_date || null,
          pay_rate: form.pay_rate ? parseFloat(form.pay_rate) : null,
          pay_type: form.pay_type,
          user_id: null,
        })
        .select()
        .single()

      if (empErr) {
        setError(empErr.message)
        setSaving(false)
        return
      }

      // If user account fields are filled, create auth user and profile
      if (form.email.trim() && form.password.trim()) {
        try {
          const tempClient = createClient(
            import.meta.env.VITE_SUPABASE_URL,
            import.meta.env.VITE_SUPABASE_ANON_KEY,
            { auth: { storageKey: 'admin-employee-create-tmp', persistSession: false } }
          )

          const { data, error: signUpErr } = await tempClient.auth.signUp({
            email: form.email.trim().toLowerCase(),
            password: form.password,
            options: {
              data: { full_name: `${form.first_name} ${form.last_name}` },
              emailRedirectTo: null,
            },
          })

          if (signUpErr) {
            if (
              signUpErr.message?.includes('already registered') ||
              signUpErr.message?.includes('already been registered')
            ) {
              setError('That email address is already registered.')
              setSaving(false)
              return
            }
            throw new Error(signUpErr.message || 'Failed to create auth user.')
          }
          if (!data?.user) throw new Error('User creation returned no data.')

          newUserId = data.user.id

          // Wait for DB trigger, then upsert profile
          await new Promise(r => setTimeout(r, 1200))

          const { error: profileErr } = await supabase.from('profiles').upsert(
            {
              id: newUserId,
              email: form.email.trim().toLowerCase(),
              full_name: `${form.first_name} ${form.last_name}`,
              username: form.username.trim().toLowerCase() || null,
              role: form.role,
            },
            { onConflict: 'id' }
          )

          if (profileErr) {
            throw new Error(`User created but profile setup failed: ${profileErr.message}`)
          }

          // Update employee with user_id
          await supabase.from('employees').update({ user_id: newUserId }).eq('id', empData.id)
        } catch (e) {
          setError(e.message || 'Failed to create system account.')
          setSaving(false)
          return
        }
      }

      setSaving(false)
      onSave()
    } catch (e) {
      setError(e.message || 'An error occurred')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Employee</h3>
        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">First Name *</label>
            <input
              value={form.first_name}
              onChange={e => set('first_name', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Last Name *</label>
            <input
              value={form.last_name}
              onChange={e => set('last_name', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Nickname{' '}
              <span className="text-gray-400 font-normal">
                (used on crew schedule labels instead of first name)
              </span>
            </label>
            <input
              value={form.nickname}
              onChange={e => set('nickname', e.target.value)}
              placeholder="e.g. Max, Papa, Chief"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cell Phone</label>
            <input
              value={form.cell_phone}
              onChange={e => set('cell_phone', e.target.value)}
              placeholder="(555) 123-4567"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Phone (Home/Work)
            </label>
            <input
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              placeholder="(555) 123-4567"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Position</label>
            <select
              value={form.job_title}
              onChange={e => set('job_title', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
            >
              <option value="">Select position…</option>
              {positions.map(p => (
                <option key={p.id} value={p.title}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
            <select
              value={form.department}
              onChange={e => set('department', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
            >
              <option value="">Select…</option>
              {DEPARTMENTS.map(d => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
            <input
              type="date"
              value={form.start_date}
              onChange={e => set('start_date', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Pay Rate</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={form.pay_rate}
                onChange={e => set('pay_rate', e.target.value)}
                placeholder="0.00"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              />
              <select
                value={form.pay_type}
                onChange={e => set('pay_type', e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-green-500"
              >
                <option value="hourly">hr</option>
                <option value="salary">yr</option>
              </select>
            </div>
          </div>

          {/* System Account Section */}
          <div className="col-span-2 border-t border-gray-100 pt-4">
            <h4 className="text-sm font-semibold text-gray-800 mb-3">System Account (optional)</h4>
            <p className="text-xs text-gray-500 mb-3">
              Leave blank to skip creating a system account.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Username</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    @
                  </span>
                  <input
                    value={form.username}
                    onChange={e =>
                      set('username', e.target.value.toLowerCase().replace(/\s+/g, '.'))
                    }
                    onBlur={handleNameBlur}
                    placeholder="auto-suggested"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 pl-7 text-sm focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                <div className="flex gap-3 mt-2">
                  {['user', 'admin'].map(r => (
                    <label key={r} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="role"
                        checked={form.role === r}
                        onChange={() => set('role', r)}
                        className="accent-green-700"
                      />
                      {r === 'admin' ? '🛡️ Admin' : '👤 User'}
                    </label>
                  ))}
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={form.showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => set('password', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-green-500"
                    />
                    <button
                      type="button"
                      onClick={() => set('showPassword', !form.showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                    >
                      {form.showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => set('password', generatePassword())}
                    className="px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 whitespace-nowrap"
                  >
                    🔄 Generate
                  </button>
                  <button
                    type="button"
                    onClick={copyPassword}
                    className="px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    📋 Copy
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-800 disabled:opacity-50"
          >
            {saving ? 'Adding…' : 'Add Employee'}
          </button>
        </div>
      </div>
    </div>
  )
}
