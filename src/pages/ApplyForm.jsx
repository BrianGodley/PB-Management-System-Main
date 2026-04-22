// ─────────────────────────────────────────────────────────────────────────────
// ApplyForm — public job application form (no auth required)
// Route: /apply
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

function newWorkExp() {
  return { id: crypto.randomUUID(), company: '', title: '', start_date: '', end_date: '', description: '' }
}
function newRef() {
  return { id: crypto.randomUUID(), name: '', phone: '', relation: '' }
}

export default function ApplyForm() {
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    address: '', city: '', state: '', zip: '',
    position_applied: '', skills: '',
  })
  const [workExp, setWorkExp] = useState([newWorkExp()])
  const [refs,    setRefs]    = useState([newRef()])
  const [resumeFile, setResumeFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted,  setSubmitted]  = useState(false)
  const [error,      setError]      = useState('')
  const resumeRef = useRef()

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  function updateWorkExp(idx, patch) {
    setWorkExp(prev => prev.map((e, i) => i === idx ? { ...e, ...patch } : e))
  }
  function updateRef(idx, patch) {
    setRefs(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('First and last name are required')
      return
    }
    setSubmitting(true)
    setError('')

    let resumeUrl = null
    if (resumeFile) {
      const path = `resumes/public/${Date.now()}_${resumeFile.name}`
      const { error: upErr } = await supabase.storage
        .from('employee-files')
        .upload(path, resumeFile, { upsert: false })
      if (!upErr) {
        const { data: { publicUrl } } = supabase.storage.from('employee-files').getPublicUrl(path)
        resumeUrl = publicUrl
      }
    }

    const { error: insertErr } = await supabase.from('applicants').insert({
      ...form,
      work_experience: workExp.filter(w => w.company.trim()),
      applicant_references:      refs.filter(r => r.name.trim()),
      resume_url:      resumeUrl,
      status:          'new',
    })

    setSubmitting(false)
    if (insertErr) { setError('Submission failed. Please try again.'); return }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
          <p className="text-gray-500">Thank you for applying. We'll be in touch soon.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🌿</div>
          <h1 className="text-3xl font-bold text-gray-900">Job Application</h1>
          <p className="text-gray-500 mt-2">Fill out the form below and we'll be in touch.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          {/* Personal Info */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-bold text-gray-800 text-lg">Personal Information</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                <input required value={form.first_name} onChange={e => set('first_name', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                <input required value={form.last_name} onChange={e => set('last_name', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input value={form.address} onChange={e => set('address', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input value={form.city} onChange={e => set('city', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input value={form.state} onChange={e => set('state', e.target.value)} maxLength={2}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zip</label>
                <input value={form.zip} onChange={e => set('zip', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Position Applying For</label>
              <input value={form.position_applied} onChange={e => set('position_applied', e.target.value)}
                placeholder="e.g. Landscape Crew Lead"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
            </div>
          </div>

          {/* Work Experience */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-lg">Work Experience</h2>
              <button type="button" onClick={() => setWorkExp(prev => [...prev, newWorkExp()])}
                className="text-sm font-medium text-green-700 hover:underline">+ Add</button>
            </div>
            {workExp.map((exp, idx) => (
              <div key={exp.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">Position {idx + 1}</p>
                  {workExp.length > 1 && (
                    <button type="button" onClick={() => setWorkExp(prev => prev.filter((_, i) => i !== idx))}
                      className="text-xs text-red-400 hover:text-red-600">Remove</button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Company</label>
                    <input value={exp.company} onChange={e => updateWorkExp(idx, { company: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Job Title</label>
                    <input value={exp.title} onChange={e => updateWorkExp(idx, { title: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                    <input type="month" value={exp.start_date} onChange={e => updateWorkExp(idx, { start_date: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">End Date (leave blank if current)</label>
                    <input type="month" value={exp.end_date} onChange={e => updateWorkExp(idx, { end_date: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Responsibilities / Description</label>
                  <textarea value={exp.description} onChange={e => updateWorkExp(idx, { description: e.target.value })} rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 resize-none" />
                </div>
              </div>
            ))}
          </div>

          {/* Skills */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-bold text-gray-800 text-lg mb-3">Skills &amp; Qualifications</h2>
            <textarea value={form.skills} onChange={e => set('skills', e.target.value)} rows={4}
              placeholder="List relevant skills, certifications, and qualifications…"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 resize-none" />
          </div>

          {/* References */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-lg">References</h2>
              <button type="button" onClick={() => setRefs(prev => [...prev, newRef()])}
                className="text-sm font-medium text-green-700 hover:underline">+ Add</button>
            </div>
            {refs.map((ref, idx) => (
              <div key={ref.id} className="grid grid-cols-3 gap-3 items-center">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                  <input value={ref.name} onChange={e => updateRef(idx, { name: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                  <input value={ref.phone} onChange={e => updateRef(idx, { phone: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
                </div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Relationship</label>
                    <input value={ref.relation} onChange={e => updateRef(idx, { relation: e.target.value })}
                      placeholder="e.g. Supervisor"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
                  </div>
                  {refs.length > 1 && (
                    <button type="button" onClick={() => setRefs(prev => prev.filter((_, i) => i !== idx))}
                      className="text-red-400 hover:text-red-600 text-sm pb-2">✕</button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Resume upload */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-bold text-gray-800 text-lg mb-3">Resume (optional)</h2>
            <div
              onClick={() => resumeRef.current?.click()}
              className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors"
            >
              {resumeFile ? (
                <div className="text-center">
                  <p className="text-2xl mb-1">📎</p>
                  <p className="text-sm font-medium text-gray-700">{resumeFile.name}</p>
                  <p className="text-xs text-gray-400 mt-1">Click to change</p>
                </div>
              ) : (
                <div className="text-center text-gray-400">
                  <p className="text-3xl mb-1">📄</p>
                  <p className="text-sm">Click to upload your resume</p>
                  <p className="text-xs mt-1">PDF, DOC, DOCX accepted</p>
                </div>
              )}
            </div>
            <input ref={resumeRef} type="file" accept=".pdf,.doc,.docx" className="sr-only"
              onChange={e => setResumeFile(e.target.files?.[0] || null)} />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-green-700 text-white rounded-2xl font-bold text-lg hover:bg-green-800 disabled:opacity-50 transition-colors shadow-lg"
          >
            {submitting ? 'Submitting…' : 'Submit Application'}
          </button>

          <p className="text-center text-xs text-gray-400 pb-4">
            Your information is kept confidential and will only be used in the hiring process.
          </p>
        </form>
      </div>
    </div>
  )
}
