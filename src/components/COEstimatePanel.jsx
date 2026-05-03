/**
 * COEstimatePanel
 * Inline change-order estimator embedded inside the Jobs > Change Orders tab.
 * Behaves identically to EstimateDetail but is prop-driven (no routing).
 *
 * Props:
 *   estimateId  – UUID of the underlying estimate record
 *   bidId       – UUID of existing bid row (null = create mode)
 *   coName      – display name for this CO
 *   coType      – 'Residential' | 'Commercial' | 'Public Works'
 *   jobId       – UUID of the parent job (for linked_job_id on bid)
 *   clientName  – client name string (for bid.client_name)
 *   onClose     – () => void   called when user clicks "← Back"
 *   onSaved     – (bid) => void  called after bid is created / updated
 */
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { generateBidDoc, downloadBidDoc } from '../lib/generateBidDoc'

import DrainageModule           from './modules/DrainageModule'
import DrainageSummary          from './modules/DrainageSummary'
import LightingModule           from './modules/LightingModule'
import LightingSummary          from './modules/LightingSummary'
import SkidSteerDemoModule      from './modules/SkidSteerDemoModule'
import SkidSteerDemoSummary     from './modules/SkidSteerDemoSummary'
import MiniSkidSteerDemoModule  from './modules/MiniSkidSteerDemoModule'
import MiniSkidSteerDemoSummary from './modules/MiniSkidSteerDemoSummary'
import ConcreteModule           from './modules/ConcreteModule'
import ConcreteSummary          from './modules/ConcreteSummary'
import HandDemoModule           from './modules/HandDemoModule'
import HandDemoSummary          from './modules/HandDemoSummary'
import IrrigationModule         from './modules/IrrigationModule'
import IrrigationSummary        from './modules/IrrigationSummary'
import ArtificialTurfModule     from './modules/ArtificialTurfModule'
import ArtificialTurfSummary    from './modules/ArtificialTurfSummary'
import PaverModule              from './modules/PaverModule'
import PaverSummary             from './modules/PaverSummary'
import PlantingModule           from './modules/PlantingModule'
import PlantingSummary          from './modules/PlantingSummary'
import PoolModule               from './modules/PoolModule'
import PoolSummary              from './modules/PoolSummary'
import UtilitiesModule          from './modules/UtilitiesModule'
import UtilitiesSummary         from './modules/UtilitiesSummary'
import ColumnsModule            from './modules/ColumnsModule'
import ColumnsSummary           from './modules/ColumnsSummary'
import GroundTreatmentsModule   from './modules/GroundTreatmentsModule'
import GroundTreatmentsSummary  from './modules/GroundTreatmentsSummary'
import OutdoorKitchenModule     from './modules/OutdoorKitchenModule'
import OutdoorKitchenSummary    from './modules/OutdoorKitchenSummary'
import FirePitModule            from './modules/FirePitModule'
import FirePitSummary           from './modules/FirePitSummary'
import WallsModule              from './modules/WallsModule'
import WallsSummary             from './modules/WallsSummary'
import FinishesModule           from './modules/FinishesModule'
import FinishesSummary          from './modules/FinishesSummary'
import StepsModule              from './modules/StepsModule'
import StepsSummary             from './modules/StepsSummary'
import GpmdBar                  from './modules/GpmdBar'

const MODULE_GROUPS = [
  { label: 'Demo',          items: ['Hand Demo', 'Mini Skid Steer Demo', 'Skid Steer Demo'] },
  { label: 'Underground',   items: ['Utilities', 'Drainage'] },
  { label: 'Flatwork',      items: ['Concrete', 'Pavers', 'Artificial Turf', 'Ground Treatments', 'Steps'] },
  { label: 'Yard Features', items: ['Pool', 'Outdoor Kitchen', 'Fire Pit', 'Walls', 'Columns', 'Water Features', 'Lighting', 'Finishes'] },
  { label: 'Softscapes',    items: ['Irrigation', 'Planting'] },
]

const SPECIFIC_TYPES = new Set([
  'Drainage','Lighting','Skid Steer Demo','Mini Skid Steer Demo','Concrete','Hand Demo',
  'Irrigation','Artificial Turf','Pavers','Planting','Pool','Utilities','Columns',
  'Ground Treatments','Outdoor Kitchen','Fire Pit','Walls','Finishes','Steps',
])

export default function COEstimatePanel({
  estimateId,
  bidId,
  coName,
  coType,
  jobId,
  clientName,
  onClose,
  onSaved,
}) {
  const { user } = useAuth()
  const [estimate,       setEstimate]       = useState(null)
  const [projects,       setProjects]       = useState([])
  const [loading,        setLoading]        = useState(true)
  const [selectedProject, setSelectedProject] = useState(null)
  const [selectedModule,  setSelectedModule]  = useState(null)
  const [showAddProject,  setShowAddProject]  = useState(false)
  const [newProjectName,  setNewProjectName]  = useState('')
  const [savingProject,   setSavingProject]   = useState(false)
  const [editingProject,  setEditingProject]  = useState(null)
  const [editProjectName, setEditProjectName] = useState('')
  const [projectGpmds,    setProjectGpmds]    = useState({})
  const [projectSubRates, setProjectSubRates] = useState({})
  const [showModulePicker, setShowModulePicker] = useState(false)
  const [selectedType,     setSelectedType]     = useState(null)
  const [moduleForm,       setModuleForm]       = useState({ man_days: '', material_cost: '', notes: '' })
  const [savingModule,     setSavingModule]     = useState(false)
  const [editingModule,    setEditingModule]    = useState(null)
  const [savingCO,         setSavingCO]         = useState(false)
  const [description,      setDescription]      = useState(coName || '')

  useEffect(() => { fetchData() }, [estimateId])

  async function fetchData() {
    setLoading(true)
    const { data: est } = await supabase.from('estimates').select('*').eq('id', estimateId).single()
    if (est) {
      setEstimate(est)
      const { data: projs } = await supabase
        .from('estimate_projects')
        .select('*, estimate_modules(*)')
        .eq('estimate_id', estimateId)
        .order('created_at')
      if (projs) {
        setProjects(projs)
        const overrides = {}
        projs.forEach(p => { if (p.gpmd_override != null) overrides[p.id] = parseFloat(p.gpmd_override) })
        setProjectGpmds(overrides)
        const subRates = {}
        projs.forEach(p => { if (p.sub_gp_markup_rate != null) subRates[p.id] = parseFloat(p.sub_gp_markup_rate) })
        setProjectSubRates(subRates)
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

  // ── Projects ─────────────────────────────────────────────────────────────
  async function addProject() {
    if (!newProjectName.trim()) return
    setSavingProject(true)
    const { data: proj } = await supabase
      .from('estimate_projects')
      .insert({ estimate_id: estimateId, project_name: newProjectName.trim() })
      .select().single()
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
      .select().single()
    if (updated) {
      setProjects(p => p.map(pr => pr.id === updated.id ? { ...pr, project_name: updated.project_name } : pr))
      if (selectedProject?.id === updated.id) setSelectedProject(p => ({ ...p, project_name: updated.project_name }))
    }
    setEditingProject(null)
    setSavingProject(false)
  }

  async function deleteProject(proj) {
    if (!confirm(`Delete project "${proj.project_name}" and all its modules?`)) return
    await supabase.from('estimate_projects').delete().eq('id', proj.id)
    setProjects(p => p.filter(p2 => p2.id !== proj.id))
    if (selectedProject?.id === proj.id) { setSelectedProject(null); setSelectedModule(null) }
  }

  // ── GPMD / sub-rate overrides ─────────────────────────────────────────────
  async function saveProjectGpmd(projectId, newVal) {
    setProjectGpmds(prev => ({ ...prev, [projectId]: newVal }))
    await supabase.from('estimate_projects').update({ gpmd_override: newVal }).eq('id', projectId)
    const proj = projects.find(p => p.id === projectId)
    if (!proj) return
    const mods = proj.estimate_modules || []
    const updatedMods = await Promise.all(mods.map(async mod => {
      const manDays   = parseFloat(mod.man_days || 0)
      const laborCost = parseFloat(mod.labor_cost   || mod.data?.calc?.laborCost || 0)
      const burden    = parseFloat(mod.labor_burden || mod.data?.calc?.burden    || 0)
      const mat       = parseFloat(mod.material_cost || 0)
      const subCost   = parseFloat(mod.sub_cost     || mod.data?.calc?.subCost  || 0)
      const oldGpmd   = parseFloat(mod.data?.gpmd ?? 425)
      const oldTotalGP = parseFloat(mod.gross_profit || mod.data?.calc?.gp || 0)
      const subContrib = oldTotalGP - (manDays * oldGpmd)
      const newGP      = (manDays * newVal) + subContrib
      const newComm    = newGP * 0.12
      const newPrice   = laborCost + burden + mat + subCost + newGP + newComm
      const updatedData = { ...(mod.data || {}), gpmd: newVal, calc: { ...(mod.data?.calc || {}), gp: newGP, commission: newComm, price: newPrice } }
      await supabase.from('estimate_modules').update({ gross_profit: parseFloat(newGP.toFixed(2)), total_price: parseFloat(newPrice.toFixed(2)), data: updatedData }).eq('id', mod.id)
      return { ...mod, gross_profit: newGP, total_price: newPrice, data: updatedData }
    }))
    const updatedProj = { ...proj, estimate_modules: updatedMods }
    setProjects(prev => prev.map(p => p.id === projectId ? updatedProj : p))
    if (selectedProject?.id === projectId) setSelectedProject(updatedProj)
    if (selectedModule) {
      const refreshed = updatedMods.find(m => m.id === selectedModule.id)
      if (refreshed) setSelectedModule(refreshed)
    }
  }

  async function saveProjectSubRate(projectId, newVal) {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, sub_gp_markup_rate: newVal } : p))
    if (selectedProject?.id === projectId) setSelectedProject(p => ({ ...p, sub_gp_markup_rate: newVal }))
    await supabase.from('estimate_projects').update({ sub_gp_markup_rate: newVal }).eq('id', projectId)
  }

  // ── Modules ───────────────────────────────────────────────────────────────
  function openModulePicker() { setShowModulePicker(true); setSelectedType(null); setModuleForm({ man_days: '', material_cost: '', notes: '' }) }
  function closeModuleFlow() { setShowModulePicker(false); setSelectedType(null); setModuleForm({ man_days: '', material_cost: '', notes: '' }); setEditingModule(null) }
  function openEditModule(mod) {
    setEditingModule(mod)
    setSelectedType(mod.module_type)
    setModuleForm({ man_days: mod.man_days || '', material_cost: mod.material_cost || '', notes: mod.notes || '' })
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
    const payload = formData || moduleForm
    const fin = extractFinancials(payload)
    const { data: mod } = await supabase.from('estimate_modules').insert({
      project_id:    selectedProject.id,
      module_type:   selectedType,
      man_days:      parseFloat(payload.man_days) || 0,
      material_cost: parseFloat(payload.material_cost) || 0,
      data:          payload.data || null,
      notes:         payload.notes || '',
      ...fin,
    }).select().single()
    if (mod) {
      const updatedProject = { ...selectedProject, estimate_modules: [...(selectedProject.estimate_modules || []), mod] }
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
    const { data: mod } = await supabase.from('estimate_modules').update({
      man_days:      parseFloat(payload.man_days) || 0,
      material_cost: parseFloat(payload.material_cost) || 0,
      data:          payload.data || editingModule.data || null,
      notes:         payload.notes || '',
      ...fin,
    }).eq('id', editingModule.id).select().single()
    if (mod) {
      const updatedProject = { ...selectedProject, estimate_modules: selectedProject.estimate_modules.map(m => m.id === mod.id ? mod : m) }
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
    const updatedProject = { ...selectedProject, estimate_modules: selectedProject.estimate_modules.filter(m => m.id !== mod.id) }
    setProjects(p => p.map(proj => proj.id === selectedProject.id ? updatedProject : proj))
    setSelectedProject(updatedProject)
    if (selectedModule?.id === mod.id) setSelectedModule(null)
  }

  // ── Save / Update CO bid ─────────────────────────────────────────────────
  async function handleSaveCO() {
    if (!description.trim()) { alert('Please enter a Description before saving.'); return }
    if (!projects.length) { alert('Add at least one project before saving.'); return }
    setSavingCO(true)
    try {
      const allMods    = projects.flatMap(p => p.estimate_modules || [])
      const grandTotal = allMods.reduce((s, m) => s + parseFloat(m.total_price   || m.data?.calc?.price || 0), 0)
      const totalGp    = allMods.reduce((s, m) => s + parseFloat(m.gross_profit  || m.data?.calc?.gp    || 0), 0)
      const totalMD    = allMods.reduce((s, m) => s + parseFloat(m.man_days      || 0), 0)
      const bidGpmd    = totalMD > 0 ? Math.round(totalGp / totalMD) : 0
      const projNames  = projects.map(p => p.project_name)

      // Always sync the estimate name to the description
      await supabase.from('estimates').update({ estimate_name: description.trim() }).eq('id', estimateId)

      let bid
      if (bidId) {
        // Update existing bid with new totals + description
        const { data: updated } = await supabase.from('bids').update({
          bid_amount:   grandTotal,
          gross_profit: totalGp,
          gpmd:         bidGpmd,
          projects:     projNames,
          co_name:      description.trim(),
        }).eq('id', bidId).select().single()
        bid = updated
      } else {
        // Create new bid record
        // Fetch client address if possible
        let clientAddress = ''
        if (estimate?.client_id) {
          const { data: cd } = await supabase.from('clients').select('street,city,state,zip').eq('id', estimate.client_id).single()
          if (cd) {
            const parts = [cd.street, [cd.city, cd.state, cd.zip].filter(Boolean).join(', ')].filter(Boolean)
            clientAddress = parts.join(', ')
          }
        }

        const { data: created, error: bidErr } = await supabase.from('bids').insert({
          client_name:    clientName || estimate?.client_name || '',
          job_address:    clientAddress,
          bid_amount:     grandTotal,
          gross_profit:   totalGp,
          gpmd:           bidGpmd,
          date_submitted: new Date().toISOString().split('T')[0],
          status:         'pending',
          estimate_id:    estimateId,
          projects:       projNames,
          notes:          '',
          created_by:     user?.id || null,
          record_type:    'change_order',
          linked_job_id:  jobId,
          co_name:        description.trim(),
          co_type:        coType,
        }).select().single()
        if (bidErr) throw new Error(bidErr.message)
        bid = created

        // Generate and download the CO Word doc
        if (estimate && projects.length) {
          try {
            const blob     = await generateBidDoc(estimate, projects, clientAddress)
            const safeName = (description.trim() || 'ChangeOrder').replace(/[^a-z0-9]/gi, '_')
            downloadBidDoc(blob, `${safeName}_CO_${new Date().toISOString().split('T')[0]}.docx`)
          } catch (_) { /* doc gen failure is non-fatal */ }
        }
      }

      onSaved(bid)
      onClose()
    } catch (err) {
      alert('Error saving change order: ' + err.message)
    } finally {
      setSavingCO(false)
    }
  }

  // ── Derived totals ────────────────────────────────────────────────────────
  const allModules = projects.flatMap(p => p.estimate_modules || [])
  const et = allModules.reduce((acc, mod) => {
    const calc = mod.data?.calc || {}
    acc.manDays     += parseFloat(mod.man_days      || 0)
    acc.materialCost+= parseFloat(mod.material_cost || 0)
    acc.laborCost   += parseFloat(mod.labor_cost    || calc.laborCost || 0)
    acc.burden      += parseFloat(mod.labor_burden  || calc.burden    || 0)
    acc.subCost     += parseFloat(mod.sub_cost      || calc.subCost   || 0)
    acc.gp          += parseFloat(mod.gross_profit  || calc.gp        || 0)
    acc.commission  += parseFloat(calc.commission   || 0)
    acc.price       += parseFloat(mod.total_price   || calc.price     || 0)
    return acc
  }, { manDays: 0, materialCost: 0, laborCost: 0, burden: 0, subCost: 0, gp: 0, commission: 0, price: 0 })

  const adjustedEstimateGP = projects.reduce((sum, proj) => {
    const mods     = proj.estimate_modules || []
    const projMD   = mods.reduce((s, m) => s + parseFloat(m.man_days || 0), 0)
    const naturalGP= mods.reduce((s, m) => { const c = m.data?.calc || {}; return s + parseFloat(m.gross_profit || c.gp || 0) }, 0)
    const override = projectGpmds[proj.id]
    return sum + (override != null ? projMD * override : naturalGP)
  }, 0)

  const estimateTotalSubGp = projects.reduce((sum, proj) => {
    const mods = proj.estimate_modules || []
    const projSubCost = mods.reduce((s, m) => s + parseFloat(m.sub_cost || m.data?.calc?.subCost || 0), 0)
    return sum + projSubCost * (proj.sub_gp_markup_rate ?? 0.20)
  }, 0)
  const derivedEstSubRate = et.subCost > 0 ? estimateTotalSubGp / et.subCost : 0.20

  const activeModules = selectedProject?.estimate_modules || []
  const projModules   = selectedProject?.estimate_modules || []
  const pt = projModules.reduce((acc, mod) => {
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
  const projGpmd = pt.manDays > 0 ? Math.round(pt.gp / pt.manDays) : 425

  const moduleInitialData = {
    ...(editingModule?.data || {}),
    gpmd: projectGpmds[selectedProject?.id] ?? (editingModule?.data?.gpmd ?? 425),
    subGpMarkupRate: selectedProject?.sub_gp_markup_rate ?? 0.20,
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-700" />
    </div>
  )

  return (
    <div className="flex flex-col h-full">

      {/* CO header bar */}
      <div className="flex items-start justify-between gap-3 mb-3 px-1 flex-wrap">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-800 font-medium flex items-center gap-1 mt-1 flex-shrink-0"
          >
            ← Back
          </button>
          <div className="h-4 w-px bg-gray-200 mt-2 flex-shrink-0" />
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <span className="text-base mt-1">📋</span>
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] font-semibold text-blue-600 uppercase tracking-wide mb-0.5">
                Description <span className="text-red-500">*</span>
              </label>
              <input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g. Add Patio Extension…"
                className="w-full text-sm font-semibold text-gray-900 border-b border-gray-300 focus:border-blue-500 outline-none bg-transparent pb-0.5 placeholder-gray-300"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleSaveCO}
          disabled={savingCO}
          className="text-sm px-4 py-2 rounded-lg bg-blue-700 text-white font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
        >
          {savingCO ? '⏳ Saving…' : bidId ? '💾 Update Change Order' : '📋 Save Change Order'}
        </button>
      </div>

      {/* Estimate-wide GPMD bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5 px-1">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">CO Totals</p>
          <p className="text-xs text-gray-400">
            {allModules.length} module{allModules.length !== 1 ? 's' : ''} across {projects.length} project{projects.length !== 1 ? 's' : ''}
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
            subMarkupRate={derivedEstSubRate}
          />
        )}
      </div>

      {/* Per-project bar */}
      {selectedProject && pt.price > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <div className="flex items-center gap-3">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                {selectedProject.project_name} — Project Totals
              </p>
              {projectGpmds[selectedProject.id] != null && projectGpmds[selectedProject.id] !== projGpmd && (
                <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-300 rounded-full px-2 py-0.5 font-medium">
                  ⚠ GPMD overridden
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">{projModules.length} module{projModules.length !== 1 ? 's' : ''}</p>
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
            subMarkupRate={selectedProject.sub_gp_markup_rate ?? 0.20}
            onSubMarkupSave={val => saveProjectSubRate(selectedProject.id, val)}
          />
        </div>
      )}

      {/* Three-panel layout */}
      <div className="flex gap-3 flex-1 min-h-0" style={{ minHeight: '420px' }}>

        {/* Panel 1: Projects */}
        <div className="w-1/3 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h2 className="font-semibold text-gray-900 text-sm">Projects</h2>
            <button onClick={() => { setShowAddProject(true); setNewProjectName('') }}
              className="text-xs text-blue-700 font-semibold hover:underline">+ Add</button>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {showAddProject && (
              <div className="p-3 bg-blue-50 border-b border-blue-100">
                <input className="input text-sm w-full mb-2" placeholder="Project name..."
                  value={newProjectName} onChange={e => setNewProjectName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addProject()} autoFocus />
                <div className="flex gap-2">
                  <button onClick={() => setShowAddProject(false)} className="btn-secondary text-xs flex-1 py-1">Cancel</button>
                  <button onClick={addProject} disabled={savingProject || !newProjectName.trim()} className="btn-primary text-xs flex-1 py-1">
                    {savingProject ? '...' : 'Save'}
                  </button>
                </div>
              </div>
            )}
            {editingProject && (
              <div className="p-3 bg-blue-50 border-b border-blue-100">
                <p className="text-xs text-blue-600 font-semibold mb-1.5">Rename project</p>
                <input className="input text-sm w-full mb-2" value={editProjectName}
                  onChange={e => setEditProjectName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') updateProject(); if (e.key === 'Escape') setEditingProject(null) }} autoFocus />
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
                const isSel   = selectedProject?.id === proj.id
                return (
                  <div key={proj.id} onClick={() => { setSelectedProject(proj); setSelectedModule(null) }}
                    className={`px-4 py-3 cursor-pointer transition-colors group ${isSel ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50 border-l-4 border-transparent'}`}>
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-semibold ${isSel ? 'text-blue-800' : 'text-gray-800'}`}>{proj.project_name}</p>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={e => { e.stopPropagation(); setEditingProject(proj); setEditProjectName(proj.project_name) }}
                          className="text-gray-400 hover:text-gray-700 text-xs" title="Rename">✎</button>
                        <button onClick={e => { e.stopPropagation(); deleteProject(proj) }}
                          className="text-red-300 hover:text-red-500 text-xs">✕</button>
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

        {/* Panel 2: Modules */}
        <div className="w-1/3 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h2 className="font-semibold text-gray-900 text-sm">{selectedProject ? selectedProject.project_name : 'Modules'}</h2>
            {selectedProject && (
              <button onClick={openModulePicker} className="text-xs text-blue-700 font-semibold hover:underline">+ Add</button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {!selectedProject ? (
              <div className="p-6 text-center text-gray-400 text-sm">Select a project to view its modules.</div>
            ) : activeModules.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">
                <p className="mb-2">No modules yet.</p>
                <button onClick={openModulePicker} className="btn-primary text-xs">+ Add Module</button>
              </div>
            ) : (
              activeModules.map(mod => {
                const isSel = selectedModule?.id === mod.id
                return (
                  <div key={mod.id} onClick={() => setSelectedModule(mod)}
                    className={`px-4 py-3 cursor-pointer transition-colors group ${isSel ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50 border-l-4 border-transparent'}`}>
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-semibold ${isSel ? 'text-blue-800' : 'text-gray-800'}`}>{mod.module_type}</p>
                      <button onClick={e => { e.stopPropagation(); deleteModule(mod) }}
                        className="text-red-300 hover:text-red-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
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

        {/* Panel 3: Module Detail */}
        <div className="w-1/3 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h2 className="font-semibold text-gray-900 text-sm">{selectedModule ? selectedModule.module_type : 'Module Detail'}</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {!selectedModule ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm text-center">
                Select a module to view its details.
              </div>
            ) : (
              <div className="space-y-3">
                {selectedModule.module_type === 'Drainage'           ? <DrainageSummary module={selectedModule} />
                : selectedModule.module_type === 'Lighting'           ? <LightingSummary module={selectedModule} />
                : selectedModule.module_type === 'Skid Steer Demo'    ? <SkidSteerDemoSummary module={selectedModule} />
                : selectedModule.module_type === 'Mini Skid Steer Demo'? <MiniSkidSteerDemoSummary module={selectedModule} />
                : selectedModule.module_type === 'Concrete'           ? <ConcreteSummary module={selectedModule} />
                : selectedModule.module_type === 'Hand Demo'          ? <HandDemoSummary module={selectedModule} />
                : selectedModule.module_type === 'Irrigation'         ? <IrrigationSummary module={selectedModule} />
                : selectedModule.module_type === 'Artificial Turf'    ? <ArtificialTurfSummary module={selectedModule} />
                : selectedModule.module_type === 'Pavers'             ? <PaverSummary module={selectedModule} />
                : selectedModule.module_type === 'Planting'           ? <PlantingSummary module={selectedModule} />
                : selectedModule.module_type === 'Utilities'          ? <UtilitiesSummary module={selectedModule} />
                : selectedModule.module_type === 'Columns'            ? <ColumnsSummary module={selectedModule} />
                : selectedModule.module_type === 'Ground Treatments'  ? <GroundTreatmentsSummary module={selectedModule} />
                : selectedModule.module_type === 'Outdoor Kitchen'    ? <OutdoorKitchenSummary module={selectedModule} />
                : selectedModule.module_type === 'Fire Pit'           ? <FirePitSummary module={selectedModule} />
                : selectedModule.module_type === 'Walls'              ? <WallsSummary module={selectedModule} />
                : selectedModule.module_type === 'Finishes'           ? <FinishesSummary module={selectedModule} />
                : selectedModule.module_type === 'Steps'              ? <StepsSummary module={selectedModule} />
                : selectedModule.module_type === 'Pool'               ? <PoolSummary module={selectedModule} />
                : (
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
                <p className="text-xs text-gray-400 pt-1">{selectedProject?.project_name} · {selectedModule.module_type}</p>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => openEditModule(selectedModule)}
                    className="flex-1 text-sm text-blue-700 hover:text-blue-900 border border-blue-300 hover:border-blue-500 rounded-lg py-2 transition-colors font-medium">
                    ✎ Edit Module
                  </button>
                  <button onClick={() => deleteModule(selectedModule)}
                    className="flex-1 text-sm text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 rounded-lg py-2 transition-colors">
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Module type picker modal */}
      {showModulePicker && !selectedType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeModuleFlow} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 p-6">
            <div className="mb-4">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-0.5">Add Module</p>
              <h2 className="text-xl font-bold text-gray-900">{selectedProject?.project_name}</h2>
              <p className="text-sm text-gray-500 mt-0.5">Select a module type</p>
            </div>
            <div className="space-y-4">
              {MODULE_GROUPS.map(({ label, items }) => (
                <div key={label}>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 px-0.5">{label}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {items.map(type => (
                      <button key={type} onClick={() => setSelectedType(type)}
                        className="text-left px-3 py-2.5 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 text-sm font-medium text-gray-700 hover:text-blue-800 transition-colors">
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={closeModuleFlow} className="btn-secondary w-full mt-4 text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Module form modal */}
      {selectedType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeModuleFlow} />
          {SPECIFIC_TYPES.has(selectedType) ? (
            <div className={`relative bg-white rounded-2xl shadow-xl w-full mx-4 flex flex-col ${selectedType === 'Pavers' || selectedType === 'Pool' ? 'max-w-6xl' : 'max-w-5xl'}`}
                 style={{ maxHeight: '90vh' }}>
              <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-200">
                <div>
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-0.5">
                    {editingModule ? 'Edit Module' : 'Add Module'}
                  </p>
                  <h2 className="text-xl font-bold text-gray-900">{selectedType}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{selectedProject?.project_name}</p>
                </div>
                <button onClick={closeModuleFlow} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
              </div>
              <div className="overflow-y-auto px-6 pb-6 flex-1">
                {selectedType === 'Drainage'           && <DrainageModule           projectName={selectedProject?.project_name} onSave={editingModule ? updateModule : saveModule} onBack={editingModule ? closeModuleFlow : () => setSelectedType(null)} saving={savingModule} initialData={moduleInitialData} />}
                {selectedType === 'Lighting'           && <LightingModule           projectName={selectedProject?.project_name} onSave={editingModule ? updateModule : saveModule} onBack={editingModule ? closeModuleFlow : () => setSelectedType(null)} saving={savingModule} initialData={moduleInitialData} />}
                {selectedType === 'Skid Steer Demo'    && <SkidSteerDemoModule      onSave={editingModule ? updateModule : saveModule} onCancel={closeModuleFlow} initialData={moduleInitialData} />}
                {selectedType === 'Mini Skid Steer Demo'&& <MiniSkidSteerDemoModule onSave={editingModule ? updateModule : saveModule} onCancel={closeModuleFlow} initialData={moduleInitialData} />}
                {selectedType === 'Concrete'           && <ConcreteModule           projectName={selectedProject?.project_name} onSave={editingModule ? updateModule : saveModule} onBack={editingModule ? closeModuleFlow : () => setSelectedType(null)} saving={savingModule} initialData={moduleInitialData} />}
                {selectedType === 'Hand Demo'          && <HandDemoModule           onSave={editingModule ? updateModule : saveModule} onCancel={closeModuleFlow} initialData={moduleInitialData} />}
                {selectedType === 'Irrigation'         && <IrrigationModule         onSave={editingModule ? updateModule : saveModule} onCancel={closeModuleFlow} initialData={moduleInitialData} />}
                {selectedType === 'Artificial Turf'    && <ArtificialTurfModule     onSave={editingModule ? updateModule : saveModule} onCancel={closeModuleFlow} initialData={moduleInitialData} />}
                {selectedType === 'Pavers'             && <PaverModule              onSave={editingModule ? updateModule : saveModule} onCancel={closeModuleFlow} initialData={moduleInitialData} />}
                {selectedType === 'Planting'           && <PlantingModule           projectName={selectedProject?.project_name} onSave={editingModule ? updateModule : saveModule} onBack={editingModule ? closeModuleFlow : () => setSelectedType(null)} saving={savingModule} initialData={moduleInitialData} />}
                {selectedType === 'Pool'               && <PoolModule               projectName={selectedProject?.project_name} onSave={editingModule ? updateModule : saveModule} onBack={editingModule ? closeModuleFlow : () => setSelectedType(null)} saving={savingModule} initialData={moduleInitialData} />}
                {selectedType === 'Utilities'          && <UtilitiesModule          projectName={selectedProject?.project_name} onSave={editingModule ? updateModule : saveModule} onBack={editingModule ? closeModuleFlow : () => setSelectedType(null)} saving={savingModule} initialData={moduleInitialData} />}
                {selectedType === 'Columns'            && <ColumnsModule            projectName={selectedProject?.project_name} onSave={editingModule ? updateModule : saveModule} onBack={editingModule ? closeModuleFlow : () => setSelectedType(null)} saving={savingModule} initialData={moduleInitialData} />}
                {selectedType === 'Ground Treatments'  && <GroundTreatmentsModule   projectName={selectedProject?.project_name} onSave={editingModule ? updateModule : saveModule} onBack={editingModule ? closeModuleFlow : () => setSelectedType(null)} saving={savingModule} initialData={moduleInitialData} />}
                {selectedType === 'Outdoor Kitchen'    && <OutdoorKitchenModule     projectName={selectedProject?.project_name} onSave={editingModule ? updateModule : saveModule} onBack={editingModule ? closeModuleFlow : () => setSelectedType(null)} saving={savingModule} initialData={moduleInitialData} />}
                {selectedType === 'Fire Pit'           && <FirePitModule            projectName={selectedProject?.project_name} onSave={editingModule ? updateModule : saveModule} onBack={editingModule ? closeModuleFlow : () => setSelectedType(null)} saving={savingModule} initialData={moduleInitialData} />}
                {selectedType === 'Walls'              && <WallsModule              projectName={selectedProject?.project_name} onSave={editingModule ? updateModule : saveModule} onBack={editingModule ? closeModuleFlow : () => setSelectedType(null)} saving={savingModule} initialData={moduleInitialData} />}
                {selectedType === 'Finishes'           && <FinishesModule           projectName={selectedProject?.project_name} onSave={editingModule ? updateModule : saveModule} onBack={editingModule ? closeModuleFlow : () => setSelectedType(null)} saving={savingModule} initialData={moduleInitialData} />}
                {selectedType === 'Steps'              && <StepsModule              projectName={selectedProject?.project_name} onSave={editingModule ? updateModule : saveModule} onBack={editingModule ? closeModuleFlow : () => setSelectedType(null)} saving={savingModule} initialData={moduleInitialData} />}
              </div>
            </div>
          ) : (
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 p-6">
              <div className="mb-5">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-0.5">
                  {editingModule ? 'Edit Module' : 'Add Module'}
                </p>
                <h2 className="text-xl font-bold text-gray-900">{selectedType}</h2>
                <p className="text-sm text-gray-500 mt-0.5">{selectedProject?.project_name}</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Man Days</label>
                  <input type="number" step="0.5" min="0" className="input" placeholder="0.0"
                    value={moduleForm.man_days} onChange={e => setModuleForm(p => ({ ...p, man_days: e.target.value }))} autoFocus />
                  <p className="text-xs text-gray-400 mt-1">1 Man Day = 8 hours</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Material Cost</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input type="number" step="0.01" min="0" className="input pl-7" placeholder="0.00"
                      value={moduleForm.material_cost} onChange={e => setModuleForm(p => ({ ...p, material_cost: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                  <textarea className="input resize-none" rows={2} placeholder="Any details..."
                    value={moduleForm.notes} onChange={e => setModuleForm(p => ({ ...p, notes: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={editingModule ? closeModuleFlow : () => setSelectedType(null)} className="btn-secondary flex-1 text-sm">
                  {editingModule ? 'Cancel' : '← Back'}
                </button>
                <button onClick={() => editingModule ? updateModule(moduleForm) : saveModule(moduleForm)}
                  disabled={savingModule} className="btn-primary flex-1 text-sm">
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
