import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const CREW_TYPES = ['General', 'Demo', 'Concrete', 'Irrigation', 'Planting']
const PROJECT_TYPES = ['Landscaping', 'Concrete/Hardscape', 'Wall', 'Pool', 'Irrigation', 'Planting', 'Demo', 'Drainage', 'Lighting', 'Other']

function newModule() {
  return { module_name: '', crew_type: 'General', estimated_man_days: '', estimated_material_cost: '' }
}

function newProject() {
  return { project_name: '', project_type: 'Landscaping', modules: [newModule()] }
}

export default function NewJob() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    client_name: '',
    job_address: '',
    salesperson: '',
    contract_price: '',
    date_sold: new Date().toISOString().split('T')[0],
    start_date: '',
    estimated_completion: '',
    status: 'active',
    notes: '',
  })

  const [projects, setProjects] = useState([newProject()])

  function updateForm(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function updateProject(pi, field, value) {
    setProjects(prev => prev.map((p, i) => i === pi ? { ...p, [field]: value } : p))
  }

  function updateModule(pi, mi, field, value) {
    setProjects(prev => prev.map((p, i) => {
      if (i !== pi) return p
      return {
        ...p,
        modules: p.modules.map((m, j) => j === mi ? { ...m, [field]: value } : m)
      }
    }))
  }

  function addProject() {
    setProjects(prev => [...prev, newProject()])
  }

  function removeProject(pi) {
    setProjects(prev => prev.filter((_, i) => i !== pi))
  }

  function addModule(pi) {
    setProjects(prev => prev.map((p, i) => i === pi ? { ...p, modules: [...p.modules, newModule()] } : p))
  }

  function removeModule(pi, mi) {
    setProjects(prev => prev.map((p, i) => {
      if (i !== pi) return p
      return { ...p, modules: p.modules.filter((_, j) => j !== mi) }
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.client_name.trim()) return setError('Client name is required.')
    if (!form.job_address.trim()) return setError('Job address is required.')
    if (!form.contract_price || isNaN(parseFloat(form.contract_price))) return setError('Contract price is required.')

    setSaving(true)
    try {
      // 1. Insert job
      const { data: job, error: jobErr } = await supabase
        .from('jobs')
        .insert({
          client_name: form.client_name.trim(),
          job_address: form.job_address.trim(),
          salesperson: form.salesperson.trim(),
          contract_price: parseFloat(form.contract_price),
          date_sold: form.date_sold || null,
          start_date: form.start_date || null,
          estimated_completion: form.estimated_completion || null,
          status: form.status,
          notes: form.notes.trim(),
          created_by: user?.id,
        })
        .select()
        .single()

      if (jobErr) throw jobErr

      // 2. Insert projects + modules
      for (let pi = 0; pi < projects.length; pi++) {
        const proj = projects[pi]
        if (!proj.project_name.trim()) continue

        const { data: project, error: projErr } = await supabase
          .from('projects')
          .insert({
            job_id: job.id,
            project_name: proj.project_name.trim(),
            project_type: proj.project_type,
            sort_order: pi,
          })
          .select()
          .single()

        if (projErr) throw projErr

        for (let mi = 0; mi < proj.modules.length; mi++) {
          const mod = proj.modules[mi]
          if (!mod.module_name.trim()) continue
          await supabase.from('modules').insert({
            project_id: project.id,
            module_name: mod.module_name.trim(),
            crew_type: mod.crew_type,
            estimated_man_days: parseFloat(mod.estimated_man_days) || 0,
            estimated_material_cost: parseFloat(mod.estimated_material_cost) || 0,
            sort_order: mi,
          })
        }
      }

      navigate(`/jobs/${job.id}`)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">New Job</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Job Info */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4 text-lg">Job Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Client Name *</label>
              <input className="input" value={form.client_name} onChange={e => updateForm('client_name', e.target.value)} placeholder="John Smith" required />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Job Address *</label>
              <input className="input" value={form.job_address} onChange={e => updateForm('job_address', e.target.value)} placeholder="123 Main St, City, State" required />
            </div>
            <div>
              <label className="label">Contract Price *</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-400">$</span>
                <input className="input pl-7" type="number" min="0" step="0.01" value={form.contract_price} onChange={e => updateForm('contract_price', e.target.value)} placeholder="0.00" required />
              </div>
            </div>
            <div>
              <label className="label">Salesperson</label>
              <input className="input" value={form.salesperson} onChange={e => updateForm('salesperson', e.target.value)} placeholder="Name" />
            </div>
            <div>
              <label className="label">Date Sold</label>
              <input className="input" type="date" value={form.date_sold} onChange={e => updateForm('date_sold', e.target.value)} />
            </div>
            <div>
              <label className="label">Start Date</label>
              <input className="input" type="date" value={form.start_date} onChange={e => updateForm('start_date', e.target.value)} />
            </div>
            <div>
              <label className="label">Est. Completion</label>
              <input className="input" type="date" value={form.estimated_completion} onChange={e => updateForm('estimated_completion', e.target.value)} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => updateForm('status', e.target.value)}>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notes</label>
              <textarea className="input resize-none" rows={2} value={form.notes} onChange={e => updateForm('notes', e.target.value)} placeholder="Any additional notes..." />
            </div>
          </div>
        </div>

        {/* Projects & Modules */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 text-lg">Projects & Modules</h2>
            <button type="button" onClick={addProject} className="btn-secondary text-sm">+ Add Project</button>
          </div>

          {projects.map((project, pi) => (
            <div key={pi} className="card mb-4">
              {/* Project header */}
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-semibold text-green-800">Project {pi + 1}</h3>
                {projects.length > 1 && (
                  <button type="button" onClick={() => removeProject(pi)} className="text-red-400 hover:text-red-600 text-sm">
                    Remove
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="label">Project Name</label>
                  <input className="input" value={project.project_name} onChange={e => updateProject(pi, 'project_name', e.target.value)} placeholder="e.g. Front Yard Wall" />
                </div>
                <div>
                  <label className="label">Project Type</label>
                  <select className="input" value={project.project_type} onChange={e => updateProject(pi, 'project_type', e.target.value)}>
                    {PROJECT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Modules */}
              <div className="border-t border-gray-100 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700">Modules</p>
                  <button type="button" onClick={() => addModule(pi)} className="text-green-700 text-xs font-medium hover:underline">+ Add Module</button>
                </div>

                {project.modules.map((mod, mi) => (
                  <div key={mi} className="bg-gray-50 rounded-lg p-3 mb-2">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-gray-500">Module {mi + 1}</p>
                      {project.modules.length > 1 && (
                        <button type="button" onClick={() => removeModule(pi, mi)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <label className="label text-xs">Module Name</label>
                        <input className="input text-sm" value={mod.module_name} onChange={e => updateModule(pi, mi, 'module_name', e.target.value)} placeholder="e.g. Demo Work" />
                      </div>
                      <div>
                        <label className="label text-xs">Crew Type</label>
                        <select className="input text-sm" value={mod.crew_type} onChange={e => updateModule(pi, mi, 'crew_type', e.target.value)}>
                          {CREW_TYPES.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label text-xs">Est. Man Days</label>
                        <input className="input text-sm" type="number" min="0" step="0.25" value={mod.estimated_man_days} onChange={e => updateModule(pi, mi, 'estimated_man_days', e.target.value)} placeholder="0.0" />
                      </div>
                      <div className="col-span-2">
                        <label className="label text-xs">Est. Material Cost ($)</label>
                        <input className="input text-sm" type="number" min="0" step="0.01" value={mod.estimated_material_cost} onChange={e => updateModule(pi, mi, 'estimated_material_cost', e.target.value)} placeholder="0.00" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        <div className="flex gap-3 pb-6">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? 'Saving...' : 'Create Job'}
          </button>
        </div>
      </form>
    </div>
  )
}
