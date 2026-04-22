import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { generateBidDoc, downloadBidDoc } from '../lib/generateBidDoc'
import DrainageModule      from '../components/modules/DrainageModule'
import DrainageSummary     from '../components/modules/DrainageSummary'
import LightingModule      from '../components/modules/LightingModule'
import LightingSummary     from '../components/modules/LightingSummary'
import SkidSteerDemoModule      from '../components/modules/SkidSteerDemoModule'
import SkidSteerDemoSummary     from '../components/modules/SkidSteerDemoSummary'
import MiniSkidSteerDemoModule  from '../components/modules/MiniSkidSteerDemoModule'
import MiniSkidSteerDemoSummary from '../components/modules/MiniSkidSteerDemoSummary'
import ConcreteModule           from '../components/modules/ConcreteModule'
import ConcreteSummary          from '../components/modules/ConcreteSummary'
import HandDemoModule           from '../components/modules/HandDemoModule'
import HandDemoSummary          from '../components/modules/HandDemoSummary'
import IrrigationModule         from '../components/modules/IrrigationModule'
import IrrigationSummary        from '../components/modules/IrrigationSummary'
import ArtificialTurfModule     from '../components/modules/ArtificialTurfModule'
import ArtificialTurfSummary    from '../components/modules/ArtificialTurfSummary'
import PaverModule              from '../components/modules/PaverModule'
import PaverSummary             from '../components/modules/PaverSummary'
import GpmdBar                  from '../components/modules/GpmdBar'

const MODULE_TYPES = [
  'Skid Steer Demo',
  'Mini Skid Steer Demo',
  'Hand Demo',
  'Concrete',
  'Artificial Turf',
  'Pavers',
  'Pool',
  'Utilities',
  'Irrigation',
  'Planting',
  'Columns',
  'Outdoor Kitchen',
  'Fire Pit',
  'Water Features',
  'Ground Treatments',
  'Walls',
  'Finishes',
  'Drainage',
  'Lighting',
]

const TYPE_COLORS = {
  Residential:    'bg-green-100 text-green-800',
  Commercial:     'bg-blue-100 text-blue-800',
  'Public Works': 'bg-purple-100 text-purple-800',
}

const STATUS_BADGE = {
  pending: 'bg-yellow-100 text-yellow-800',
  sold:    'bg-green-100  text-green-800',
  lost:    'bg-red-100    text-red-800',
}

export default function EstimateDetail() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [estimate, setEstimate]           = useState(null)
  const [projects, setProjects]           = useState([])
  const [loading, setLoading]             = useState(true)
  const [statusLoading, setStatusLoading] = useState(false)

  // Selection state
  const [selectedProject, setSelectedProject] = useState(null)
  const [selectedModule,  setSelectedModule]  = useState(null)

  // Add project
  const [showAddProject,  setShowAddProject]  = useState(false)
  const [newProjectName,  setNewProjectName]  = useState('')
  const [savingProject,   setSavingProject]   = useState(false)

  // Edit project
  const [editingProject,  setEditingProject]  = useState(null)
  const [editProjectName, setEditProjectName] = useState('')

  // Inline estimate name editing
  const [editingName,  setEditingName]  = useState(false)
  const [nameInput,    setNameInput]    = useState('')
  const [savingName,   setSavingName]   = useState(false)

  async function saveEstimateName() {
    const trimmed = nameInput.trim()
    if (!trimmed || trimmed === estimate.estimate_name) { setEditingName(false); return }
    setSavingName(true)
    const { error } = await supabase.from('estimates').update({ estimate_name: trimmed }).eq('id', id)
    if (!error) setEstimate(p => ({ ...p, estimate_name: trimmed }))
    setSavingName(false)
    setEditingName(false)
  }

  // Per-project GPMD overrides  { [projectId]: number }
  const [projectGpmds, setProjectGpmds] = useState({})

  // Add / Edit module modals
  const [showModulePicker, setShowModulePicker] = useState(false)
  const [selectedType,     setSelectedType]     = useState(null)
  const [moduleForm,       setModuleForm]       = useState({ man_days: '', material_cost: '', notes: '' })
  const [savingModule,     setSavingModule]     = useState(false)
  const [editingModule,    setEditingModule]    = useState(null)  // set when editing existing module

  useEffect(() => { fetchData() }, [id])

  async function fetchData() {
    setLoading(true)
    const { data: est } = await supabase
      .from('estimates')
      .select('*')
      .eq('id', id)
      .single()

    if (est) {
      setEstimate(est)
      const { data: projs } = await supabase
        .from('estimate_projects')
        .select('*, estimate_modules(*)')
        .eq('estimate_id', id)
        .order('created_at')
      if (projs) {
        setProjects(projs)
        // Initialise per-project GPMD overrides from DB
        const overrides = {}
        projs.forEach(p => { if (p.gpmd_override != null) overrides[p.id] = parseFloat(p.gpmd_override) })
        setProjectGpmds(overrides)
        // Re-sync selected project/module if already selected
        if (selectedProject) {
          const refreshed = projs.find(p => p.id === selectedProject.id)
          if (refreshed) {
            setSelectedProject(refreshed)
            if (selectedModule) {
              const refreshedMod = (refreshed.estimate_modules || []).find(m => m.id === selectedModule.id)
              setSelectedModule(refreshedMod || null)
            }
          }
        }
      }
    }
    setLoading(false)
  }

  // ── Projects ──────────────────────────────────────
  async function addProject() {
    if (!newProjectName.trim()) return
    setSavingProject(true)
    const { data: proj } = await supabase
      .from('estimate_projects')
      .insert({ estimate_id: id, project_name: newProjectName.trim() })
      .select()
      .single()
    if (proj) {
      const newProj = { ...proj, estimate_modules: [] }
      setProjects(p => [...p, newProj])
      setNewProjectName('')
      setShowAddProject(false)
      setSelectedProject(newProj)
      setSelectedModule(null)
    }
    setSavingProject(false)
  }

  async function updateProject() {
    if (!editProjectName.trim() || !editingProject) return
    setSavingProject(true)
    const { data: updated } = await supabase
      .from('estimate_projects')
      .update({ project_name: editProjectName.trim() })
      .eq('id', editingProject.id)
      .select()
      .single()
    if (updated) {
      const refreshed = { ...editingProject, project_name: updated.project_name }
      setProjects(p => p.map(pr => pr.id === refreshed.id ? { ...pr, project_name: refreshed.project_name } : pr))
      if (selectedProject?.id === refreshed.id) setSelectedProject(p => ({ ...p, project_name: refreshed.project_name }))
    }
    setEditingProject(null)
    setSavingProject(false)
  }

  async function deleteProject(proj) {
    if (!confirm(`Delete project "${proj.project_name}" and all its modules?`)) return
    await supabase.from('estimate_projects').delete().eq('id', proj.id)
    setProjects(p => p.filter(p2 => p2.id !== proj.id))
    if (selectedProject?.id === proj.id) {
      setSelectedProject(null)
      setSelectedModule(null)
    }
  }

  // ── Per-project GPMD override ─────────────────────
  async function saveProjectGpmd(projectId, newVal) {
    // Update local GPMD state immediately
    setProjectGpmds(prev => ({ ...prev, [projectId]: newVal }))

    // Persist project override
    await supabase.from('estimate_projects').update({ gpmd_override: newVal }).eq('id', projectId)

    // Cascade to every module in the project
    const proj = projects.find(p => p.id === projectId)
    if (!proj) return
    const mods = proj.estimate_modules || []

    const updatedMods = await Promise.all(mods.map(async mod => {
      const manDays    = parseFloat(mod.man_days || 0)
      const laborCost  = parseFloat(mod.labor_cost   || mod.data?.calc?.laborCost || 0)
      const burden     = parseFloat(mod.labor_burden || mod.data?.calc?.burden    || 0)
      const mat        = parseFloat(mod.material_cost || 0)
      const subCost    = parseFloat(mod.sub_cost      || mod.data?.calc?.subCost  || 0)

      // Preserve any sub-haul / markup GP contribution that isn't manDays×gpmd
      const oldGpmd        = parseFloat(mod.data?.gpmd ?? 425)
      const oldTotalGP     = parseFloat(mod.gross_profit || mod.data?.calc?.gp || 0)
      const subContrib     = oldTotalGP - (manDays * oldGpmd)   // non-zero for demo modules
      const newGP          = (manDays * newVal) + subContrib
      const newCommission  = newGP * 0.12
      const newPrice       = laborCost + burden + mat + subCost + newGP + newCommission

      const updatedData = {
        ...(mod.data || {}),
        gpmd: newVal,
        calc: {
          ...(mod.data?.calc || {}),
          gp:         newGP,
          commission: newCommission,
          price:      newPrice,
        },
      }

      await supabase.from('estimate_modules').update({
        gross_profit: parseFloat(newGP.toFixed(2)),
        total_price:  parseFloat(newPrice.toFixed(2)),
        data:         updatedData,
      }).eq('id', mod.id)

      return { ...mod, gross_profit: newGP, total_price: newPrice, data: updatedData }
    }))

    // Update local state so bars re-render immediately
    const updatedProj = { ...proj, estimate_modules: updatedMods }
    setProjects(prev => prev.map(p => p.id === projectId ? updatedProj : p))
    if (selectedProject?.id === projectId) setSelectedProject(updatedProj)

    // Also refresh selectedModule so "Edit Module" gets the new gpmd in initialData
    if (selectedModule) {
      const refreshed = updatedMods.find(m => m.id === selectedModule.id)
      if (refreshed) setSelectedModule(refreshed)
    }
  }

  // ── Modules ──────────────────────────────────────
  function openModulePicker() {
    setShowModulePicker(true)
    setSelectedType(null)
    setModuleForm({ man_days: '', material_cost: '', notes: '' })
  }

  function closeModuleFlow() {
    setShowModulePicker(false)
    setSelectedType(null)
    setModuleForm({ man_days: '', material_cost: '', notes: '' })
    setEditingModule(null)
  }

  function openEditModule(mod) {
    setEditingModule(mod)
    setSelectedType(mod.module_type)
    // Pre-fill generic form in case it's a non-specific module type
    setModuleForm({
      man_days:      mod.man_days      || '',
      material_cost: mod.material_cost || '',
      notes:         mod.notes        || '',
    })
  }

  function extractFinancials(payload) {
    const calc = payload.data?.calc || {}
    return {
      labor_cost:   parseFloat(payload.labor_cost   || calc.laborCost || 0),
      labor_burden: parseFloat(payload.labor_burden || calc.burden    || 0),
      gross_profit: parseFloat(payload.gross_profit || calc.gp        || 0),
      sub_cost:     parseFloat(payload.sub_cost     || calc.subCost   || 0),
      total_price:  parseFloat(payload.total_price  || calc.price     || 0),
    }
  }

  async function saveModule(formData) {
    if (!selectedType || !selectedProject) return
    setSavingModule(true)
    // formData may come from a specific module component (e.g. DrainageModule)
    // or from the generic form. Normalise to a common shape.
    const payload = formData || moduleForm
    const fin = extractFinancials(payload)
    const { data: mod } = await supabase
      .from('estimate_modules')
      .insert({
        project_id:    selectedProject.id,
        module_type:   selectedType,
        man_days:      parseFloat(payload.man_days) || 0,
        material_cost: parseFloat(payload.material_cost) || 0,
        data:          payload.data || null,
        notes:         payload.notes || '',
        ...fin,
      })
      .select()
      .single()
    if (mod) {
      const updatedProject = {
        ...selectedProject,
        estimate_modules: [...(selectedProject.estimate_modules || []), mod],
      }
      setProjects(p => p.map(proj => proj.id === selectedProject.id ? updatedProject : proj))
      setSelectedProject(updatedProject)
      setSelectedModule(mod)
      closeModuleFlow()
    }
    setSavingModule(false)
  }

  async function updateModule(formData) {
    if (!editingModule) return
    setSavingModule(true)
    const payload = formData || moduleForm
    const fin = extractFinancials(payload)
    const { data: mod } = await supabase
      .from('estimate_modules')
      .update({
        man_days:      parseFloat(payload.man_days) || 0,
        material_cost: parseFloat(payload.material_cost) || 0,
        data:          payload.data || editingModule.data || null,
        notes:         payload.notes || '',
        ...fin,
      })
      .eq('id', editingModule.id)
      .select()
      .single()
    if (mod) {
      const updatedProject = {
        ...selectedProject,
        estimate_modules: selectedProject.estimate_modules.map(m => m.id === mod.id ? mod : m),
      }
      setProjects(p => p.map(proj => proj.id === selectedProject.id ? updatedProject : proj))
      setSelectedProject(updatedProject)
      setSelectedModule(mod)
      closeModuleFlow()
    }
    setSavingModule(false)
  }

  async function deleteModule(mod) {
    if (!confirm(`Remove module "${mod.module_type}"?`)) return
    await supabase.from('estimate_modules').delete().eq('id', mod.id)
    const updatedProject = {
      ...selectedProject,
      estimate_modules: selectedProject.estimate_modules.filter(m => m.id !== mod.id),
    }
    setProjects(p => p.map(proj => proj.id === selectedProject.id ? updatedProject : proj))
    setSelectedProject(updatedProject)
    if (selectedModule?.id === mod.id) setSelectedModule(null)
  }

  // ── Status management ────────────────────────────
  async function markAsSold() {
    if (!confirm(`Mark "${estimate.estimate_name}" as Sold? This will create a job record.`)) return
    setStatusLoading(true)

    // Aggregate totals from all modules across all projects
    const allModules = projects.flatMap(p => p.estimate_modules || [])
    const totals = allModules.reduce((acc, mod) => {
      const calc = mod.data?.calc || {}
      acc.man_days     += parseFloat(mod.man_days      || 0)
      acc.material_cost+= parseFloat(mod.material_cost || 0)
      acc.labor_burden += parseFloat(mod.labor_burden  || calc.burden   || 0)
      acc.sub_cost     += parseFloat(mod.sub_cost      || calc.subCost  || 0)
      acc.gross_profit += parseFloat(mod.gross_profit  || calc.gp       || 0)
      acc.total_price  += parseFloat(mod.total_price   || calc.price    || 0)
      return acc
    }, { man_days: 0, material_cost: 0, labor_burden: 0, sub_cost: 0, gross_profit: 0, total_price: 0 })

    const gpmd = totals.man_days > 0 ? totals.gross_profit / totals.man_days : 0

    // Insert job record
    const { error: jobErr } = await supabase.from('jobs').insert({
      estimate_id:    id,
      client_id:      estimate.client_id || null,
      client_name:    estimate.client_name || '',
      name:           estimate.estimate_name,
      sold_date:      new Date().toISOString(),
      total_man_days: totals.man_days,
      labor_burden:   totals.labor_burden,
      material_cost:  totals.material_cost,
      sub_cost:       totals.sub_cost,
      gross_profit:   totals.gross_profit,
      gpmd:           gpmd,
      total_price:    totals.total_price,
      status:         'active',
    })

    if (jobErr) {
      alert(`Error creating job: ${jobErr.message}`)
      setStatusLoading(false)
      return
    }

    // Update estimate status
    const { data: updated } = await supabase
      .from('estimates')
      .update({ status: 'sold' })
      .eq('id', id)
      .select()
      .single()

    if (updated) setEstimate(updated)
    setStatusLoading(false)
  }

  async function markAsLost() {
    if (!confirm(`Mark "${estimate.estimate_name}" as Lost?`)) return
    setStatusLoading(true)
    const { data: updated } = await supabase
      .from('estimates')
      .update({ status: 'lost' })
      .eq('id', id)
      .select()
      .single()
    if (updated) setEstimate(updated)
    setStatusLoading(false)
  }

  async function markAsPending() {
    if (!confirm(`Revert "${estimate.estimate_name}" back to Pending?`)) return
    setStatusLoading(true)
    const { data: updated } = await supabase
      .from('estimates')
      .update({ status: 'pending' })
      .eq('id', id)
      .select()
      .single()
    if (updated) setEstimate(updated)
    setStatusLoading(false)
  }

  // ── Create Bid ────────────────────────────────────────────────────────────
  const [creatingBid, setCreatingBid] = useState(false)

  async function createBid() {
    if (!projects.length) {
      alert('Add at least one project before creating a bid.')
      return
    }
    setCreatingBid(true)
    try {
      // Fetch client address from the clients table
      let clientAddress = ''
      if (estimate.client_id) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('street, city, state, zip')
          .eq('id', estimate.client_id)
          .single()
        if (clientData) {
          const parts = [
            clientData.street,
            [clientData.city, clientData.state, clientData.zip].filter(Boolean).join(', ')
          ].filter(Boolean)
          clientAddress = parts.join('\n')
        }
      }

      // Compute grand total, GP, and GPMD
      const allMods    = projects.flatMap(p => p.estimate_modules || [])
      const grandTotal = allMods.reduce((s, m) => s + parseFloat(m.total_price || m.data?.calc?.price || 0), 0)
      const totalGp    = allMods.reduce((s, m) => s + parseFloat(m.gross_profit || m.data?.calc?.gp || 0), 0)
      const totalMD    = allMods.reduce((s, m) => s + parseFloat(m.man_days     || m.data?.calc?.manDays || 0), 0)
      const bidGpmd    = totalMD > 0 ? Math.round(totalGp / totalMD) : 0
      const projNames  = projects.map(p => p.project_name)

      // Save bid record to Supabase
      const { data: bid, error: bidErr } = await supabase
        .from('bids')
        .insert({
          client_name:    estimate.client_name || '',
          job_address:    clientAddress.replace('\n', ', '),
          bid_amount:     grandTotal,
          gross_profit:   totalGp,
          gpmd:           bidGpmd,
          date_submitted: new Date().toISOString().split('T')[0],
          status:         'pending',
          estimate_id:    id,
          projects:       projNames,
          notes:          '',
          created_by:     user?.id || null,
        })
        .select()
        .single()

      if (bidErr) throw new Error(bidErr.message)

      // Generate and download the Word doc
      const blob     = await generateBidDoc(estimate, projects, clientAddress)
      const safeName = (estimate.estimate_name || 'Bid').replace(/[^a-z0-9]/gi, '_')
      downloadBidDoc(blob, `${safeName}_Bid_${new Date().toISOString().split('T')[0]}.docx`)

    } catch (err) {
      alert('Error creating bid: ' + err.message)
    } finally {
      setCreatingBid(false)
    }
  }

  async function deleteEstimate() {
    if (estimate.status !== 'pending') return
    if (!confirm(`Delete "${estimate.estimate_name}"? This will also remove all projects and modules inside it. This cannot be undone.`)) return
    setStatusLoading(true)
    await supabase.from('estimates').delete().eq('id', id)
    // Navigate back to the client page if we have a client_id, otherwise clients list
    if (estimate.client_id) {
      navigate(`/clients/${estimate.client_id}`)
    } else {
      navigate('/clients')
    }
  }

  // ── Render ────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-700"></div>
    </div>
  )
  if (!estimate) return (
    <div className="card text-center py-12 text-gray-500">Estimate not found.</div>
  )

  const activeModules = selectedProject?.estimate_modules || []

  // ── Estimate-wide totals across every module in every project ──────────────
  const allModules = projects.flatMap(p => p.estimate_modules || [])
  const estimateTotals = allModules.reduce((acc, mod) => {
    const calc = mod.data?.calc || {}
    const gp = parseFloat(mod.gross_profit || calc.gp || 0)
    acc.manDays     += parseFloat(mod.man_days      || 0)
    acc.materialCost+= parseFloat(mod.material_cost || 0)
    acc.laborCost   += parseFloat(mod.labor_cost    || calc.laborCost || 0)
    acc.burden      += parseFloat(mod.labor_burden  || calc.burden    || 0)
    acc.subCost     += parseFloat(mod.sub_cost      || calc.subCost   || 0)
    acc.gp          += gp
    acc.commission  += parseFloat(calc.commission   || gp * 0.12     || 0)
    acc.price       += parseFloat(mod.total_price   || calc.price     || 0)
    return acc
  }, { manDays: 0, materialCost: 0, laborCost: 0, burden: 0, subCost: 0, gp: 0, commission: 0, price: 0 })
  const et = estimateTotals

  // Adjusted estimate GP — sum of each project bar's effective GP
  // If a project has a GPMD override: GP = projManDays × override
  // Otherwise: GP = natural sum of module gross profits
  const adjustedEstimateGP = projects.reduce((sum, proj) => {
    const mods        = proj.estimate_modules || []
    const projManDays = mods.reduce((s, m) => s + parseFloat(m.man_days || 0), 0)
    const naturalGP   = mods.reduce((s, m) => { const c = m.data?.calc || {}; return s + parseFloat(m.gross_profit || c.gp || 0) }, 0)
    const override    = projectGpmds[proj.id]
    return sum + (override != null ? projManDays * override : naturalGP)
  }, 0)
  // Estimate GPMD is purely derived — never edited directly
  // (displayed inside GpmdBar via directGp ÷ manDays)

  // ── Per-project totals for selected project ────────────────────────────────
  const projModules = selectedProject?.estimate_modules || []
  const projectTotals = projModules.reduce((acc, mod) => {
    const calc = mod.data?.calc || {}
    acc.manDays     += parseFloat(mod.man_days      || 0)
    acc.materialCost+= parseFloat(mod.material_cost || 0)
    acc.laborCost   += parseFloat(mod.labor_cost    || calc.laborCost || 0)
    acc.burden      += parseFloat(mod.labor_burden  || calc.burden    || 0)
    acc.subCost     += parseFloat(mod.sub_cost      || calc.subCost   || 0)
    acc.gp          += parseFloat(mod.gross_profit  || calc.gp        || 0)
    acc.price       += parseFloat(mod.total_price   || calc.price     || 0)
    return acc
  }, { manDays: 0, materialCost: 0, laborCost: 0, burden: 0, subCost: 0, gp: 0, price: 0 })
  const pt = projectTotals
  const projGpmd = pt.manDays > 0 ? Math.round(pt.gp / pt.manDays) : 425

  return (
    <div className="flex flex-col h-full">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 text-sm">
        <Link to="/clients" className="text-gray-400 hover:text-gray-600">← Clients</Link>
        {estimate.client_name && (
          <>
            <span className="text-gray-300">/</span>
            <span className="text-gray-400">{estimate.client_name}</span>
          </>
        )}
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-medium">{editingName ? nameInput || estimate.estimate_name : estimate.estimate_name}</span>
      </div>

      {/* Estimate header */}
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveEstimateName(); if (e.key === 'Escape') setEditingName(false) }}
                onBlur={saveEstimateName}
                disabled={savingName}
                className="text-2xl font-bold text-gray-900 border-b-2 border-green-500 outline-none bg-transparent w-72"
              />
              {savingName && <span className="text-xs text-gray-400">Saving…</span>}
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h1 className="text-2xl font-bold text-gray-900">{estimate.estimate_name}</h1>
              <button
                onClick={() => { setNameInput(estimate.estimate_name); setEditingName(true) }}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600"
                title="Rename estimate"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
            </div>
          )}
          {estimate.type && (
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${TYPE_COLORS[estimate.type] || 'bg-gray-100 text-gray-700'}`}>
              {estimate.type}
            </span>
          )}
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_BADGE[estimate.status] || STATUS_BADGE.pending}`}>
            {estimate.status?.charAt(0).toUpperCase() + estimate.status?.slice(1) || 'Pending'}
          </span>
          {estimate.client_name && (
            <span className="text-sm text-gray-400">{estimate.client_name}</span>
          )}
        </div>

        {/* Status action buttons */}
        <div className="flex gap-2 flex-shrink-0 flex-wrap">
          {/* Create Bid */}
          <button
            onClick={createBid}
            disabled={creatingBid}
            className="text-sm px-4 py-2 rounded-lg border border-green-700 text-green-700 font-semibold hover:bg-green-50 transition-colors disabled:opacity-50"
          >
            {creatingBid ? '⏳ Generating...' : '📄 Create Bid'}
          </button>

          <button
            onClick={deleteEstimate}
            disabled={statusLoading}
            className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
            title="Delete this estimate"
          >
            🗑 Delete
          </button>
        </div>
      </div>

      {/* ── Estimate-wide summary bar ── */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Estimate Totals</p>
          <p className="text-xs text-gray-400">
            {allModules.length} module{allModules.length !== 1 ? 's' : ''}
            {' across '}
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        {allModules.length === 0 ? (
          <div className="bg-gray-900 text-white rounded-xl px-5 py-4">
            <p className="text-xs text-gray-500 text-center py-1">Add projects and modules to see totals here.</p>
          </div>
        ) : (
          <GpmdBar
            totalMat={et.materialCost}
            totalHrs={et.manDays * 8}
            manDays={et.manDays}
            laborCost={et.laborCost}
            laborRatePerHour={et.manDays > 0 && et.laborCost > 0 ? et.laborCost / (et.manDays * 8) : 35}
            burden={et.burden}
            subCost={et.subCost}
            directGp={adjustedEstimateGP}
            price={et.price}
          />
        )}
      </div>

      {/* ── Per-project summary bar (shown when a project is selected) ── */}
      {selectedProject && pt.price > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex items-center gap-3">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                {selectedProject.project_name} — Project Totals
              </p>
              {projectGpmds[selectedProject.id] != null && projectGpmds[selectedProject.id] !== projGpmd && (
                <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-300 rounded-full px-2 py-0.5 font-medium">
                  ⚠ GPMD overridden from module average of ${projGpmd.toLocaleString()}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">
              {projModules.length} module{projModules.length !== 1 ? 's' : ''}
            </p>
          </div>
          <GpmdBar
            totalMat={pt.materialCost}
            totalHrs={pt.manDays * 8}
            manDays={pt.manDays}
            laborCost={pt.laborCost}
            burden={pt.burden}
            subCost={pt.subCost}
            gpmd={projectGpmds[selectedProject.id] ?? projGpmd}
            price={pt.price}
            onGpmdSave={val => saveProjectGpmd(selectedProject.id, val)}
          />
        </div>
      )}

      {/* Three-panel layout */}
      <div className="flex gap-4 flex-1 min-h-0" style={{ minHeight: '500px' }}>

        {/* ── Panel 1: Projects ── */}
        <div className="w-1/3 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h2 className="font-semibold text-gray-900 text-sm">Projects</h2>
            <button
              onClick={() => { setShowAddProject(true); setNewProjectName('') }}
              className="text-xs text-green-700 font-semibold hover:underline"
            >
              + Add
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">

            {/* Add project inline input */}
            {showAddProject && (
              <div className="p-3 bg-green-50 border-b border-green-100">
                <input
                  className="input text-sm w-full mb-2"
                  placeholder="Project name..."
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addProject()}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button onClick={() => setShowAddProject(false)} className="btn-secondary text-xs flex-1 py-1">Cancel</button>
                  <button onClick={addProject} disabled={savingProject || !newProjectName.trim()} className="btn-primary text-xs flex-1 py-1">
                    {savingProject ? '...' : 'Save'}
                  </button>
                </div>
              </div>
            )}

            {/* Edit project inline input */}
            {editingProject && (
              <div className="p-3 bg-blue-50 border-b border-blue-100">
                <p className="text-xs text-blue-600 font-semibold mb-1.5">Rename project</p>
                <input
                  className="input text-sm w-full mb-2"
                  value={editProjectName}
                  onChange={e => setEditProjectName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') updateProject(); if (e.key === 'Escape') setEditingProject(null) }}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button onClick={() => setEditingProject(null)} className="btn-secondary text-xs flex-1 py-1">Cancel</button>
                  <button onClick={updateProject} disabled={savingProject || !editProjectName.trim()} className="btn-primary text-xs flex-1 py-1">
                    {savingProject ? '...' : 'Save'}
                  </button>
                </div>
              </div>
            )}

            {projects.length === 0 && !showAddProject ? (
              <div className="p-6 text-center text-gray-400 text-sm">
                <p className="mb-2">No projects yet.</p>
                <button onClick={() => setShowAddProject(true)} className="btn-primary text-xs">+ Add Project</button>
              </div>
            ) : (
              projects.map(proj => {
                const projMD  = (proj.estimate_modules || []).reduce((s, m) => s + parseFloat(m.man_days || 0), 0)
                const projMat = (proj.estimate_modules || []).reduce((s, m) => s + parseFloat(m.material_cost || 0), 0)
                const isSelected = selectedProject?.id === proj.id
                return (
                  <div
                    key={proj.id}
                    onClick={() => { setSelectedProject(proj); setSelectedModule(null) }}
                    className={`px-4 py-3 cursor-pointer transition-colors group ${isSelected ? 'bg-green-50 border-l-4 border-green-600' : 'hover:bg-gray-50 border-l-4 border-transparent'}`}
                  >
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-semibold ${isSelected ? 'text-green-800' : 'text-gray-800'}`}>
                        {proj.project_name}
                      </p>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={e => { e.stopPropagation(); setEditingProject(proj); setEditProjectName(proj.project_name) }}
                          className="text-gray-400 hover:text-gray-700 text-xs"
                          title="Rename"
                        >
                          ✎
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); deleteProject(proj) }}
                          className="text-red-300 hover:text-red-500 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {(proj.estimate_modules || []).length} module{(proj.estimate_modules || []).length !== 1 ? 's' : ''}
                      {projMD > 0 && ` · ${projMD.toFixed(1)} MD`}
                      {projMat > 0 && ` · $${projMat.toLocaleString()}`}
                    </p>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ── Panel 2: Modules ── */}
        <div className="w-1/3 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h2 className="font-semibold text-gray-900 text-sm">
              {selectedProject ? selectedProject.project_name : 'Modules'}
            </h2>
            {selectedProject && (
              <button
                onClick={openModulePicker}
                className="text-xs text-green-700 font-semibold hover:underline"
              >
                + Add
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {!selectedProject ? (
              <div className="p-6 text-center text-gray-400 text-sm">
                Select a project to view its modules.
              </div>
            ) : activeModules.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">
                <p className="mb-2">No modules yet.</p>
                <button onClick={openModulePicker} className="btn-primary text-xs">+ Add Module</button>
              </div>
            ) : (
              activeModules.map(mod => {
                const isSelected = selectedModule?.id === mod.id
                return (
                  <div
                    key={mod.id}
                    onClick={() => setSelectedModule(mod)}
                    className={`px-4 py-3 cursor-pointer transition-colors group ${isSelected ? 'bg-green-50 border-l-4 border-green-600' : 'hover:bg-gray-50 border-l-4 border-transparent'}`}
                  >
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-semibold ${isSelected ? 'text-green-800' : 'text-gray-800'}`}>
                        {mod.module_type}
                      </p>
                      <button
                        onClick={e => { e.stopPropagation(); deleteModule(mod) }}
                        className="text-red-300 hover:text-red-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {parseFloat(mod.man_days || 0).toFixed(1)} MD · ${parseFloat(mod.material_cost || 0).toLocaleString()} mat.
                    </p>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ── Panel 3: Module Detail ── */}
        <div className="w-1/3 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h2 className="font-semibold text-gray-900 text-sm">
              {selectedModule ? selectedModule.module_type : 'Module Detail'}
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {!selectedModule ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm text-center">
                Select a module to view its details.
              </div>
            ) : (
              <div className="space-y-3">

                {/* Module-specific detail view */}
                {selectedModule.module_type === 'Drainage' ? (
                  <DrainageSummary module={selectedModule} />
                ) : selectedModule.module_type === 'Lighting' ? (
                  <LightingSummary module={selectedModule} />
                ) : selectedModule.module_type === 'Skid Steer Demo' ? (
                  <SkidSteerDemoSummary module={selectedModule} />
                ) : selectedModule.module_type === 'Mini Skid Steer Demo' ? (
                  <MiniSkidSteerDemoSummary module={selectedModule} />
                ) : selectedModule.module_type === 'Concrete' ? (
                  <ConcreteSummary module={selectedModule} />
                ) : selectedModule.module_type === 'Hand Demo' ? (
                  <HandDemoSummary module={selectedModule} />
                ) : selectedModule.module_type === 'Irrigation' ? (
                  <IrrigationSummary module={selectedModule} />
                ) : selectedModule.module_type === 'Artificial Turf' ? (
                  <ArtificialTurfSummary module={selectedModule} />
                ) : selectedModule.module_type === 'Pavers' ? (
                  <PaverSummary module={selectedModule} />
                ) : (
                  /* Generic fallback for modules not yet built out */
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500 mb-1">Man Days</p>
                        <p className="text-xl font-bold text-gray-900">{parseFloat(selectedModule.man_days || 0).toFixed(1)}</p>
                        <p className="text-xs text-gray-400">{(parseFloat(selectedModule.man_days || 0) * 8).toFixed(0)} hrs</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500 mb-1">Material Cost</p>
                        <p className="text-xl font-bold text-gray-900">${parseFloat(selectedModule.material_cost || 0).toLocaleString()}</p>
                      </div>
                    </div>
                    {selectedModule.notes && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes</p>
                        <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{selectedModule.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes (if saved separately from module data) */}
                {selectedModule.module_type !== 'Drainage' && selectedModule.notes && null /* already shown above */}

                {/* Project label */}
                <p className="text-xs text-gray-400 pt-1">
                  {selectedProject?.project_name} · {selectedModule.module_type}
                </p>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => openEditModule(selectedModule)}
                    className="flex-1 text-sm text-green-700 hover:text-green-900 border border-green-300 hover:border-green-500 rounded-lg py-2 transition-colors font-medium"
                  >
                    ✎ Edit Module
                  </button>
                  <button
                    onClick={() => deleteModule(selectedModule)}
                    className="flex-1 text-sm text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 rounded-lg py-2 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── Module Type Picker Modal ── */}
      {showModulePicker && !selectedType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeModuleFlow} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
            <div className="mb-4">
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-0.5">Add Module</p>
              <h2 className="text-xl font-bold text-gray-900">{selectedProject?.project_name}</h2>
              <p className="text-sm text-gray-500 mt-0.5">Select a module type</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto">
              {MODULE_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className="text-left px-3 py-2.5 rounded-lg border border-gray-200 hover:border-green-500 hover:bg-green-50 text-sm font-medium text-gray-700 hover:text-green-800 transition-colors"
                >
                  {type}
                </button>
              ))}
            </div>
            <button onClick={closeModuleFlow} className="btn-secondary w-full mt-4 text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* ── Module Form Modal ── */}
      {selectedType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeModuleFlow} />

          {/* Wide scrollable modal for module-specific forms */}
          {(selectedType === 'Drainage' || selectedType === 'Lighting' || selectedType === 'Skid Steer Demo' || selectedType === 'Mini Skid Steer Demo' || selectedType === 'Concrete' || selectedType === 'Hand Demo' || selectedType === 'Irrigation' || selectedType === 'Artificial Turf' || selectedType === 'Pavers') ? (
            <div className={`relative bg-white rounded-2xl shadow-xl w-full mx-4 flex flex-col ${selectedType === 'Pavers' ? 'max-w-6xl' : 'max-w-5xl'}`}
                 style={{ maxHeight: '90vh' }}>
              <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-200">
                <div>
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-0.5">
                    {editingModule ? 'Edit Module' : 'Add Module'}
                  </p>
                  <h2 className="text-xl font-bold text-gray-900">{selectedType}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{selectedProject?.project_name}</p>
                </div>
                <button onClick={closeModuleFlow} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
              </div>
              <div className="overflow-y-auto px-6 py-5 flex-1">
                {selectedType === 'Drainage' && (
                  <DrainageModule
                    projectName={selectedProject?.project_name}
                    onSave={editingModule ? updateModule : saveModule}
                    onBack={editingModule ? closeModuleFlow : () => setSelectedType(null)}
                    saving={savingModule}
                    initialData={editingModule?.data || null}
                  />
                )}
                {selectedType === 'Lighting' && (
                  <LightingModule
                    projectName={selectedProject?.project_name}
                    onSave={editingModule ? updateModule : saveModule}
                    onBack={editingModule ? closeModuleFlow : () => setSelectedType(null)}
                    saving={savingModule}
                    initialData={editingModule?.data || null}
                  />
                )}
                {selectedType === 'Skid Steer Demo' && (
                  <SkidSteerDemoModule
                    onSave={editingModule ? updateModule : saveModule}
                    onCancel={closeModuleFlow}
                    initialData={editingModule?.data || null}
                  />
                )}
                {selectedType === 'Mini Skid Steer Demo' && (
                  <MiniSkidSteerDemoModule
                    onSave={editingModule ? updateModule : saveModule}
                    onCancel={closeModuleFlow}
                    initialData={editingModule?.data || null}
                  />
                )}
                {selectedType === 'Concrete' && (
                  <ConcreteModule
                    projectName={selectedProject?.project_name}
                    onSave={editingModule ? updateModule : saveModule}
                    onBack={editingModule ? closeModuleFlow : () => setSelectedType(null)}
                    saving={savingModule}
                    initialData={editingModule?.data || null}
                  />
                )}
                {selectedType === 'Hand Demo' && (
                  <HandDemoModule
                    onSave={editingModule ? updateModule : saveModule}
                    onCancel={closeModuleFlow}
                    initialData={editingModule?.data || null}
                  />
                )}
                {selectedType === 'Irrigation' && (
                  <IrrigationModule
                    onSave={editingModule ? updateModule : saveModule}
                    onCancel={closeModuleFlow}
                    initialData={editingModule?.data || null}
                  />
                )}
                {selectedType === 'Artificial Turf' && (
                  <ArtificialTurfModule
                    onSave={editingModule ? updateModule : saveModule}
                    onCancel={closeModuleFlow}
                    initialData={editingModule?.data || null}
                  />
                )}
                {selectedType === 'Pavers' && (
                  <PaverModule
                    onSave={editingModule ? updateModule : saveModule}
                    onCancel={closeModuleFlow}
                    initialData={editingModule?.data || null}
                  />
                )}
              </div>
            </div>
          ) : (
            /* Generic form for all other module types (placeholder until built) */
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 p-6">
              <div className="mb-5">
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-0.5">
                  {editingModule ? 'Edit Module' : 'Add Module'}
                </p>
                <h2 className="text-xl font-bold text-gray-900">{selectedType}</h2>
                <p className="text-sm text-gray-500 mt-0.5">{selectedProject?.project_name}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Man Days</label>
                  <input
                    type="number" step="0.5" min="0"
                    className="input"
                    placeholder="0.0"
                    value={moduleForm.man_days}
                    onChange={e => setModuleForm(p => ({ ...p, man_days: e.target.value }))}
                    autoFocus
                  />
                  <p className="text-xs text-gray-400 mt-1">1 Man Day = 8 hours</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Material Cost</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input
                      type="number" step="0.01" min="0"
                      className="input pl-7"
                      placeholder="0.00"
                      value={moduleForm.material_cost}
                      onChange={e => setModuleForm(p => ({ ...p, material_cost: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    className="input resize-none" rows={2}
                    placeholder="Any details..."
                    value={moduleForm.notes}
                    onChange={e => setModuleForm(p => ({ ...p, notes: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={editingModule ? closeModuleFlow : () => setSelectedType(null)} className="btn-secondary flex-1 text-sm">
                  {editingModule ? 'Cancel' : '← Back'}
                </button>
                <button
                  onClick={() => editingModule ? updateModule(moduleForm) : saveModule(moduleForm)}
                  disabled={savingModule}
                  className="btn-primary flex-1 text-sm"
                >
                  {savingModule ? 'Saving...' : editingModule ? 'Update Module' : 'Add Module'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
