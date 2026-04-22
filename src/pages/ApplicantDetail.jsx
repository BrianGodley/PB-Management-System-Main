// ─────────────────────────────────────────────────────────────────────────────
// ApplicantDetail — full applicant profile
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const STATUSES = ['new', 'reviewing', 'interview', 'offered', 'hired', 'rejected']
const STATUS_LABELS = { new: 'New', reviewing: 'Reviewing', interview: 'Interview', offered: 'Offered', hired: 'Hired', rejected: 'Rejected' }
const STATUS_COLORS = {
  new:       'bg-blue-100 text-blue-700 border-blue-200',
  reviewing: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  interview: 'bg-purple-100 text-purple-700 border-purple-200',
  offered:   'bg-orange-100 text-orange-700 border-orange-200',
  hired:     'bg-green-100 text-green-700 border-green-200',
  rejected:  'bg-red-100 text-red-700 border-red-200',
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function ApplicantDetail() {
  const { id }    = useParams()
  const navigate  = useNavigate()

  const [applicant, setApplicant] = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [editing,   setEditing]   = useState(false)
  const [draft,     setDraft]     = useState({})
  const [saving,    setSaving]    = useState(false)
  const [hiring,    setHiring]    = useState(false)
  const [resumeFile, setResumeFile] = useState(null)
  const resumeRef = useRef()

  useEffect(() => { fetchApplicant() }, [id])

  async function fetchApplicant() {
    setLoading(true)
    const { data } = await supabase.from('applicants').select('*').eq('id', id).single()
    setApplicant(data)
    setDraft(data ? { ...data, work_experience: data.work_experience || [], applicant_references: data.applicant_references || [] } : {})
    setLoading(false)
  }

  async function handleStatusChange(status) {
    await supabase.from('applicants').update({ status }).eq('id', id)
    fetchApplicant()
  }

  async function handleSave() {
    setSaving(true)
    let resumeUrl = draft.resume_url
    if (resumeFile) {
      const path = `resumes/${id}/${Date.now()}_${resumeFile.name}`
      const { error: upErr } = await supabase.storage.from('employee-files').upload(path, resumeFile)
      if (!upErr) {
        const { data: { publicUrl } } = supabase.storage.from('employee-files').getPublicUrl(path)
        resumeUrl = publicUrl
      }
    }
    await supabase.from('applicants').update({ ...draft, resume_url: resumeUrl }).eq('id', id)
    setSaving(false)
    setEditing(false)
    fetchApplicant()
  }

  async function handleHire() {
    if (!confirm('Convert this applicant to an employee record?')) return
    setHiring(true)
    const { data: emp } = await supabase.from('employees').insert({
      first_name: applicant.first_name,
      last_name:  applicant.last_name,
      email:      applicant.email,
      phone:      applicant.phone,
      address:    applicant.address,
      city:       applicant.city,
      state:      applicant.state,
      zip:        applicant.zip,
      start_date: new Date().toISOString().split('T')[0],
      status:     'active',
    }).select().single()
    await supabase.from('applicants').update({ status: 'hired' }).eq('id', id)
    setHiring(false)
    if (emp?.id) navigate(`/hr/employee/${emp.id}`)
    else navigate('/hr')
  }

  async function handleDelete() {
    if (!confirm('Delete this applicant record?')) return
    await supabase.from('applicants').delete().eq('id', id)
    navigate('/hr')
  }

  // Work experience helpers
  function addWorkExp() {
    setDraft(prev => ({
      ...prev,
      work_experience: [...(prev.work_experience || []), { id: crypto.randomUUID(), company: '', title: '', start_date: '', end_date: '', description: '' }]
    }))
  }
  function updateWorkExp(idx, patch) {
    setDraft(prev => ({
      ...prev,
      work_experience: (prev.work_experience || []).map((e, i) => i === idx ? { ...e, ...patch } : e)
    }))
  }
  function removeWorkExp(idx) {
    setDraft(prev => ({ ...prev, work_experience: (prev.work_experience || []).filter((_, i) => i !== idx) }))
  }

  // Reference helpers
  function addRef() {
    setDraft(prev => ({
      ...prev,
      applicant_references: [...(prev.applicant_references || []), { id: crypto.randomUUID(), name: '', phone: '', relation: '' }]
    }))
  }
  function updateRef(idx, patch) {
    setDraft(prev => ({
      ...prev,
      applicant_references: (prev.applicant_references || []).map((r, i) => i === idx ? { ...r, ...patch } : r)
    }))
  }
  function removeRef(idx) {
    setDraft(prev => ({ ...prev, applicant_references: (prev.applicant_references || []).filter((_, i) => i !== idx) }))
  }

  const set = (k, v) => setDraft(prev => ({ ...prev, [k]: v }))

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400">Loading…</div>
  if (!applicant) return <div className="flex items-center justify-center h-full text-gray-400">Applicant not found</div>

  return (
    <div className="h-full flex flex-col">

      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 flex-shrink-0">
        <button onClick={() => navigate('/hr')} className="text-sm text-gray-500 hover:text-gray-700">← HR</button>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-gray-800">{applicant.first_name} {applicant.last_name}</span>
        <div className="flex-1" />
        {applicant.status !== 'hired' && applicant.status !== 'rejected' && (
          <button
            onClick={handleHire}
            disabled={hiring}
            className="px-3 py-1.5 bg-green-700 text-white rounded-lg text-xs font-semibold hover:bg-green-800 disabled:opacity-50"
          >
            {hiring ? 'Converting…' : '✅ Hire as Employee'}
          </button>
        )}
        <button onClick={handleDelete} className="px-3 py-1.5 border border-red-200 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50">
          🗑️ Delete
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        <div className="max-w-3xl mx-auto space-y-5">

          {/* Header card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">
                    {applicant.first_name?.[0]}{applicant.last_name?.[0]}
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">{applicant.first_name} {applicant.last_name}</h1>
                    <p className="text-sm text-gray-500">{applicant.position_applied || 'No position specified'}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">Applied {formatDate(applicant.applied_at)}</p>
              </div>
              <div className="flex gap-2 items-center">
                {!editing
                  ? <button onClick={() => setEditing(true)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50">✏️ Edit</button>
                  : <>
                      <button onClick={() => { setEditing(false); setDraft({ ...applicant, work_experience: applicant.work_experience || [], applicant_references: applicant.applicant_references || [] }) }}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
                      <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 bg-green-700 text-white rounded-lg text-xs font-semibold hover:bg-green-800 disabled:opacity-50">
                        {saving ? 'Saving…' : '💾 Save'}
                      </button>
                    </>
                }
              </div>
            </div>

            {/* Status pipeline */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Status</p>
              <div className="flex gap-2 flex-wrap">
                {STATUSES.map(s => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-colors ${
                      applicant.status === s
                        ? STATUS_COLORS[s] + ' border-current'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Contact info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Contact Information</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['email', 'Email'], ['phone', 'Phone'],
                ['address', 'Address'], ['city', 'City'],
                ['state', 'State'], ['zip', 'Zip'],
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                  {editing
                    ? <input value={draft[key] || ''} onChange={e => set(key, e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-green-500" />
                    : <p className="text-sm text-gray-800">{applicant[key] || <span className="text-gray-400 italic">—</span>}</p>
                  }
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Position Applying For</label>
                {editing
                  ? <input value={draft.position_applied || ''} onChange={e => set('position_applied', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-green-500" />
                  : <p className="text-sm text-gray-800">{applicant.position_applied || <span className="text-gray-400 italic">—</span>}</p>
                }
              </div>
            </div>
          </div>

          {/* Resume */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-800 mb-3">Resume</h3>
            {applicant.resume_url ? (
              <div className="flex items-center gap-3">
                <a href={applicant.resume_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50">
                  📄 View Resume ↗
                </a>
                {editing && (
                  <span className="text-xs text-gray-400">Upload below to replace</span>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic mb-2">No resume on file</p>
            )}
            {editing && (
              <div className="mt-3">
                <div onClick={() => resumeRef.current?.click()}
                  className="flex items-center gap-2 h-12 border-2 border-dashed border-gray-300 rounded-lg px-3 cursor-pointer hover:border-green-400 hover:bg-green-50">
                  <span className="text-gray-400 text-sm">{resumeFile ? `📎 ${resumeFile.name}` : '📁 Upload resume'}</span>
                </div>
                <input ref={resumeRef} type="file" className="sr-only" onChange={e => setResumeFile(e.target.files?.[0] || null)} />
                <div className="mt-2">
                  <input value={draft.resume_url || ''} onChange={e => set('resume_url', e.target.value)}
                    placeholder="Or paste a link (Google Drive, Dropbox…)"
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-green-500" />
                </div>
              </div>
            )}
          </div>

          {/* Work Experience */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Work Experience</h3>
              {editing && (
                <button onClick={addWorkExp} className="text-xs font-medium text-green-700 hover:underline">+ Add</button>
              )}
            </div>
            {(editing ? draft.work_experience : applicant.work_experience || []).length === 0 ? (
              <p className="text-sm text-gray-400 italic">No work experience listed</p>
            ) : (
              <div className="space-y-4">
                {(editing ? draft.work_experience : applicant.work_experience || []).map((exp, idx) => (
                  <div key={exp.id || idx} className={`${editing ? 'border border-gray-200 rounded-xl p-4' : 'border-l-2 border-gray-200 pl-4'}`}>
                    {editing ? (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input value={exp.company} onChange={e => updateWorkExp(idx, { company: e.target.value })}
                            placeholder="Company" className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-green-500" />
                          <input value={exp.title} onChange={e => updateWorkExp(idx, { title: e.target.value })}
                            placeholder="Job Title" className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-green-500" />
                          <button onClick={() => removeWorkExp(idx)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
                        </div>
                        <div className="flex gap-2">
                          <input type="date" value={exp.start_date} onChange={e => updateWorkExp(idx, { start_date: e.target.value })}
                            className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-green-500" />
                          <input type="date" value={exp.end_date} onChange={e => updateWorkExp(idx, { end_date: e.target.value })}
                            placeholder="Present"
                            className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-green-500" />
                        </div>
                        <textarea value={exp.description} onChange={e => updateWorkExp(idx, { description: e.target.value })}
                          placeholder="Responsibilities and accomplishments…" rows={2}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-green-500 resize-none" />
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-gray-800">{exp.title} at {exp.company}</p>
                          <p className="text-xs text-gray-400">{exp.start_date} – {exp.end_date || 'Present'}</p>
                        </div>
                        {exp.description && <p className="text-sm text-gray-600 mt-1">{exp.description}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Skills */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-800 mb-3">Skills</h3>
            {editing
              ? <textarea value={draft.skills || ''} onChange={e => set('skills', e.target.value)}
                  rows={3} placeholder="List skills, separated by commas or new lines…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 resize-none" />
              : <p className="text-sm text-gray-700 whitespace-pre-wrap">{applicant.skills || <span className="text-gray-400 italic">No skills listed</span>}</p>
            }
          </div>

          {/* References */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">References</h3>
              {editing && (
                <button onClick={addRef} className="text-xs font-medium text-green-700 hover:underline">+ Add</button>
              )}
            </div>
            {(editing ? draft.applicant_references : applicant.applicant_references || []).length === 0 ? (
              <p className="text-sm text-gray-400 italic">No applicant_references listed</p>
            ) : (
              <div className="space-y-3">
                {(editing ? draft.applicant_references : applicant.applicant_references || []).map((ref, idx) => (
                  <div key={ref.id || idx} className={`${editing ? 'flex gap-2 items-center' : 'flex items-center gap-4'}`}>
                    {editing ? (
                      <>
                        <input value={ref.name} onChange={e => updateRef(idx, { name: e.target.value })} placeholder="Name"
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-green-500" />
                        <input value={ref.phone} onChange={e => updateRef(idx, { phone: e.target.value })} placeholder="Phone"
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-green-500" />
                        <input value={ref.relation} onChange={e => updateRef(idx, { relation: e.target.value })} placeholder="Relation"
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-green-500" />
                        <button onClick={() => removeRef(idx)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
                      </>
                    ) : (
                      <div className="flex-1">
                        <span className="font-medium text-gray-800">{ref.name}</span>
                        {ref.relation && <span className="text-gray-500 text-sm ml-2">({ref.relation})</span>}
                        {ref.phone && <span className="text-gray-500 text-sm ml-3">📞 {ref.phone}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-800 mb-3">Internal Notes</h3>
            {editing
              ? <textarea value={draft.notes || ''} onChange={e => set('notes', e.target.value)} rows={3}
                  placeholder="Notes visible to admins only…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 resize-none" />
              : <p className="text-sm text-gray-700 whitespace-pre-wrap">{applicant.notes || <span className="text-gray-400 italic">No notes</span>}</p>
            }
          </div>

        </div>
      </div>
    </div>
  )
}
