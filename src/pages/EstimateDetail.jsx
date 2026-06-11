import { useState, useEffect, lazy, Suspense } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { fetchGlobalGpmd, DEFAULT_ESTIMATE_GPMD } from '../lib/companyDefaults'
import { useRateIcons } from '../contexts/RateIconsContext'
const DrainageModule = lazy(() => import('../components/modules/DrainageModule'))
import DrainageSummary from '../components/modules/DrainageSummary'
const LightingModule = lazy(() => import('../components/modules/LightingModule'))
import LightingSummary from '../components/modules/LightingSummary'
const SkidSteerDemoModule = lazy(() => import('../components/modules/SkidSteerDemoModule'))
import SkidSteerDemoSummary from '../components/modules/SkidSteerDemoSummary'
const MiniSkidSteerDemoModule = lazy(() => import('../components/modules/MiniSkidSteerDemoModule'))
import MiniSkidSteerDemoSummary from '../components/modules/MiniSkidSteerDemoSummary'
const ConcreteModule = lazy(() => import('../components/modules/ConcreteModule'))
import ConcreteSummary from '../components/modules/ConcreteSummary'
const HandDemoModule = lazy(() => import('../components/modules/HandDemoModule'))
import HandDemoSummary from '../components/modules/HandDemoSummary'
const IrrigationModule = lazy(() => import('../components/modules/IrrigationModule'))
import IrrigationSummary from '../components/modules/IrrigationSummary'
const ArtificialTurfModule = lazy(() => import('../components/modules/ArtificialTurfModule'))
import ArtificialTurfSummary from '../components/modules/ArtificialTurfSummary'
const PaverModule = lazy(() => import('../components/modules/PaverModule'))
import PaverSummary from '../components/modules/PaverSummary'
const PlantingModule = lazy(() => import('../components/modules/PlantingModule'))
import PlantingSummary from '../components/modules/PlantingSummary'
const PoolModule = lazy(() => import('../components/modules/PoolModule'))
import PoolSummary from '../components/modules/PoolSummary'
const UtilitiesModule = lazy(() => import('../components/modules/UtilitiesModule'))
import UtilitiesSummary from '../components/modules/UtilitiesSummary'
const ColumnsModule = lazy(() => import('../components/modules/ColumnsModule'))
import ColumnsSummary from '../components/modules/ColumnsSummary'
const GroundTreatmentsModule = lazy(() => import('../components/modules/GroundTreatmentsModule'))
import GroundTreatmentsSummary from '../components/modules/GroundTreatmentsSummary'
const OutdoorKitchenModule = lazy(() => import('../components/modules/OutdoorKitchenModule'))
import OutdoorKitchenSummary from '../components/modules/OutdoorKitchenSummary'
const FirePitModule = lazy(() => import('../components/modules/FirePitModule'))
import FirePitSummary from '../components/modules/FirePitSummary'
const WallsModule = lazy(() => import('../components/modules/WallsModule'))
import WallsSummary from '../components/modules/WallsSummary'
const FinishesModule = lazy(() => import('../components/modules/FinishesModule'))
import FinishesSummary from '../components/modules/FinishesSummary'
const StepsModule = lazy(() => import('../components/modules/StepsModule'))
import StepsSummary from '../components/modules/StepsSummary'
import GpmdBar from '../components/modules/GpmdBar'
import EstimateWhatIfModal from '../components/EstimateWhatIfModal'

const MODULE_GROUPS = [
  { label: 'Demo', items: ['Hand Demo', 'Mini Skid Steer Demo', 'Skid Steer Demo'] },
  { label: 'Underground', items: ['Utilities', 'Drainage'] },
  {
    label: 'Flatwork',
    items: ['Concrete', 'Pavers', 'Artificial Turf', 'Ground Treatments', 'Steps'],
  },
  {
    label: 'Yard Features',
    items: [
      'Pool',
      'Outdoor Kitchen',
      'Fire Pit',
      'Walls',
      'Columns',
      'Water Features',
      'Lighting',
      'Finishes',
    ],
  },
  { label: 'Softscapes', items: ['Irrigation', 'Planting'] },
]

const TYPE_COLORS = {
  Residential: 'bg-green-100 text-green-800',
  Commercial: 'bg-blue-100 text-blue-800',
  'Public Works': 'bg-purple-100 text-purple-800',
}

const STATUS_BADGE = {
  pending: 'bg-yellow-100 text-yellow-800',
  sold: 'bg-green-100  text-green-800',
  lost: 'bg-red-100    text-red-800',
}

export default function EstimateDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()

  // Change Order mode — set when navigating in from the New Change Order flow
  const isCOMode = searchParams.get('co') === '1'
  const coJobId = searchParams.get('job_id') || null
  const coName = searchParams.get('co_name') || ''
  const coType = searchParams.get('co_type') || ''
  const returnTo = searchParams.get('return_to') || null
  const [estimate, setEstimate] = useState(null)
  const [projects, setProjects] = useState([])
  // Drag-and-drop reorder of the project list (left column).
  const [dragProjId, setDragProjId] = useState(null)
  const [dragOverProjId, setDragOverProjId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [statusLoading, setStatusLoading] = useState(false)

  // Selection state
  const [selectedProject, setSelectedProject] = useState(null)
  const [selectedModule, setSelectedModule] = useState(null)

  // Add project
  const [showAddProject, setShowAddProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [savingProject] = useState(false)

  // Edit project
  const [editingProject, setEditingProject] = useState(null)
  const [editProjectName, setEditProjectName] = useState('')

  // Inline estimate name editing
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [savingName, setSavingName] = useState(false)

  async function saveEstimateName() {
    const trimmed = nameInput.trim()
    if (!trimmed || trimmed === estimate.estimate_name) {
      setEditingName(false)
      return
    }
    setSavingName(true)
    const { error } = await supabase
      .from('estimates')
      .update({ estimate_name: trimmed })
      .eq('id', id)
    if (!error) setEstimate(p => ({ ...p, estimate_name: trimmed }))
    setSavingName(false)
    setEditingName(false)
  }

  // Per-project GPMD overrides  { [projectId]: number }
  const [projectGpmds, setProjectGpmds] = useState({})

  // Global estimate GPMD baseline from company_settings. Used as the
  // fallback when a module has no stored GPMD and the project has no
  // override. Loaded once on mount; defaults to DEFAULT_ESTIMATE_GPMD until
  // the fetch completes so first paint has a sane number.
  const [globalGpmd, setGlobalGpmd] = useState(DEFAULT_ESTIMATE_GPMD)
  useEffect(() => {
    let alive = true
    fetchGlobalGpmd().then(n => {
      if (alive) setGlobalGpmd(n)
    })
    return () => {
      alive = false
    }
  }, [])

  // Rate-icon toggle — controls visibility of every <RateEditPopover/> across
  // the open module editor. The "Edit Rates" button in the module modal
  // header flips this. Off by default; gated by canAccessRates so only users
  // with the `clients_access_edit_rates` permission see the button.
  const { showRateIcons, toggleRateIcons, canAccessRates } = useRateIcons()

  // Per-project sub GP markup rates  { [projectId]: number }
  const [projectSubRates, setProjectSubRates] = useState({})

  // Cascade delete modal for estimate
  const [estDeleteModal, setEstDeleteModal] = useState(null)
  // { bidId, bidCount, woCount, jobIds, onConfirm, onKeepBid }

  // What-If modal toggle. The user can either preview only (no save) or
  // click "Save as New Estimate" inside the modal — that snapshots the
  // current estimate as a new version with the GPMD overrides baked in.
  const [whatIfOpen, setWhatIfOpen] = useState(false)

  // Draft-mode flag. After load every edit (module add/edit/delete,
  // project GPMD override, etc.) updates only local state and flips this
  // to true. Clicking "Save Changes" snapshots the local state as a new
  // version (Estimate N+1). Reset to false on load and after save.
  const [dirty, setDirty] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  // Mark dirty whenever an edit handler updates local state.
  const markDirty = () => setDirty(true)

  // Browser-level guard so accidental nav / refresh / tab-close doesn't
  // silently lose draft changes. The string is shown in some browsers and
  // ignored in modern Chrome/Firefox (they use a generic message), but the
  // dialog still appears as long as we set returnValue.
  useEffect(() => {
    if (!dirty) return
    function handler(e) {
      e.preventDefault()
      e.returnValue = 'You have unsaved estimate changes. Leave anyway?'
      return e.returnValue
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  // Snapshot the current estimate as a brand-new version. The original
  // estimate is left untouched. New row gets parent_estimate_id pointing
  // at the original (or the original's own id if `estimate` is itself a
  // version), and a fresh version number = max(existing children) + 1.
  //
  // moduleOverrides: { [moduleId]: newGpmd }
  // projectGpmdOverrides:
  //   null/undefined  → carry over each project's existing gpmd_override
  //   { [projId]: v } → for each project in the map: v=number sets the
  //                     override, v=null clears it. Projects not in the
  //                     map carry over.
  // What If Sections 1 & 2 pass a "clear-all" map so the per-module new
  // GPs win on the bar — otherwise stale project-level overrides from
  // earlier versions would mask the uniform GPMD the user just chose.
  async function applyAsNewVersion(moduleOverrides, projectGpmdOverrides = null) {
    if (!estimate) return false
    // The root original everything chains to. If we ourselves are a
    // version, point new versions at the same parent.
    const rootId = estimate.parent_estimate_id || estimate.id

    // Find the next version number under this root.
    const { data: existing } = await supabase
      .from('estimates')
      .select('version')
      .or(`id.eq.${rootId},parent_estimate_id.eq.${rootId}`)
    const maxVer = (existing || []).reduce((m, e) => Math.max(m, e.version || 1), 1)
    const nextVer = maxVer + 1

    // Make sure the original itself has version=1 set so the tree displays
    // correctly. If it was created before the versioning column existed
    // it may be NULL.
    if (rootId === estimate.id && (estimate.version == null || estimate.version === 0)) {
      await supabase.from('estimates').update({ version: 1 }).eq('id', rootId)
    }

    // 1) Insert the new estimate row (copy of the current one's shell).
    const { data: newEst, error: estErr } = await supabase
      .from('estimates')
      .insert({
        estimate_name: estimate.estimate_name,
        type: estimate.type,
        status: 'pending',
        client_id: estimate.client_id,
        client_name: estimate.client_name,
        created_by: user?.id || null,
        version: nextVer,
        parent_estimate_id: rootId,
      })
      .select()
      .single()
    if (estErr || !newEst) {
      alert('Save failed: ' + (estErr?.message || 'unknown error'))
      return false
    }

    // 2) Duplicate every project under the new estimate, then duplicate
    // every module under each project — applying the GPMD override if any.
    for (const proj of projects) {
      const {
        id: oldProjId,
        estimate_modules: _mods,
        estimate_id: _eid,
        created_at: _ca,
        ...projShell
      } = proj
      // Decide what gpmd_override the new project row should have:
      //   - If the caller supplied projectGpmdOverrides AND included this
      //     project's id, use that value (number or null).
      //   - Otherwise carry over the source project's existing override.
      const newOverride =
        projectGpmdOverrides &&
        Object.prototype.hasOwnProperty.call(projectGpmdOverrides, oldProjId)
          ? projectGpmdOverrides[oldProjId]
          : projShell.gpmd_override
      const { data: newProj, error: projErr } = await supabase
        .from('estimate_projects')
        .insert({ ...projShell, gpmd_override: newOverride, estimate_id: newEst.id })
        .select()
        .single()
      if (projErr || !newProj) {
        alert('Project copy failed: ' + (projErr?.message || 'unknown'))
        return false
      }

      const newRows = (proj.estimate_modules || []).map(m => {
        const { id: _modId, project_id: _pid, created_at: _mca, ...modShell } = m
        const ov = moduleOverrides[m.id]
        if (Number.isFinite(ov) && ov >= 0) {
          // Recompute GP and total_price using the new GPMD. Other costs
          // (labor, burden, materials, sub) are unchanged. Preserve any
          // non-labor GP contribution (sub-haul markup, etc.) so a module
          // with sub_cost doesn't lose that piece of profit on the version
          // copy — same trick the live saveProjectGpmd uses.
          const md = parseFloat(m.man_days || 0)
          const labor = parseFloat(m.labor_cost || m.data?.calc?.laborCost || 0)
          const burden = parseFloat(m.labor_burden || m.data?.calc?.burden || 0)
          const mat = parseFloat(m.material_cost || 0)
          const sub = parseFloat(m.sub_cost || m.data?.calc?.subCost || 0)
          const oldGpmd = parseFloat(m.data?.gpmd ?? 425)
          const oldTotalGp = parseFloat(m.gross_profit || m.data?.calc?.gp || 0)
          const subContrib = oldTotalGp - md * oldGpmd // 0 for non-sub modules
          const newGp = md * ov + subContrib
          const comm = newGp * 0.12
          const newPrice = labor + burden + mat + sub + newGp + comm
          const newData = {
            ...(m.data || {}),
            gpmd: ov,
            calc: { ...(m.data?.calc || {}), gp: newGp, price: newPrice },
          }
          return {
            ...modShell,
            project_id: newProj.id,
            gross_profit: newGp,
            total_price: newPrice,
            data: newData,
          }
        }
        // No override → straight copy.
        return { ...modShell, project_id: newProj.id }
      })
      if (newRows.length > 0) {
        const { error: modErr } = await supabase.from('estimate_modules').insert(newRows)
        if (modErr) {
          alert('Module copy failed: ' + modErr.message)
          return false
        }
      }
    }

    // Navigate to the new version so the user sees it.
    navigate(`/estimates/${newEst.id}`)
    return true
  }

  // Add / Edit module modals
  const [showModulePicker, setShowModulePicker] = useState(false)
  const [selectedType, setSelectedType] = useState(null)
  // Optional custom display name for the module being added. Pre-filled
  // with the module_type when the user picks a type; they can edit it
  // before continuing into the detail modal. Persisted as
  // estimate_modules.module_name (a new column). Falls back to module_type
  // for legacy rows / when left blank.
  const [moduleNameInput, setModuleNameInput] = useState('')
  // pickerStep: 1 = pick type, 2 = name the module. Auto-advances when the
  // user picks a type from step 1.
  const [pickerStep, setPickerStep] = useState(1)
  // When the user clicks "Change Demo Module" inside one of the three
  // demo modules (Hand / Skid / Mini Skid), the source module bundles its
  // current entries and passes them up to us so we can hand them to the
  // target module as initialData. Null = no in-flight switch.
  const [switchDemoData, setSwitchDemoData] = useState(null)

  // Hand-off callback passed to each demo module. Receives the target
  // module type ('Hand Demo' | 'Skid Steer Demo' | 'Mini Skid Steer Demo')
  // and the source module's current payload (state + rate maps). We swap
  // selectedType WITHOUT going back through the type/name picker so the
  // user lands directly in the target module with their values prefilled.
  function switchDemoType(newType, payload) {
    if (!newType) return
    setSwitchDemoData(payload || null)
    setSelectedType(newType)
    setPickerStep(3)
  }
  const [moduleForm, setModuleForm] = useState({ man_days: '', material_cost: '', notes: '' })
  const [savingModule] = useState(false)
  const [editingModule, setEditingModule] = useState(null) // set when editing existing module

  useEffect(() => {
    fetchData()
  }, [id])

  async function fetchData() {
    setLoading(true)

    const { data: est } = await supabase.from('estimates').select('*').eq('id', id).single()

    if (est) {
      setEstimate(est)
      const { data: projs } = await supabase
        .from('estimate_projects')
        .select('*, estimate_modules(*)')
        .eq('estimate_id', id)
        .order('sort_order', { nullsFirst: false })
        .order('created_at')
      if (projs) {
        setProjects(projs)
        // Initialise per-project GPMD overrides from DB
        const overrides = {}
        projs.forEach(p => {
          if (p.gpmd_override != null) overrides[p.id] = parseFloat(p.gpmd_override)
        })
        setProjectGpmds(overrides)
        // Initialise per-project sub GP rates from DB
        const subRates = {}
        projs.forEach(p => {
          if (p.sub_gp_markup_rate != null) subRates[p.id] = parseFloat(p.sub_gp_markup_rate)
        })
        setProjectSubRates(subRates)
        // Re-sync selected project/module if already selected
        if (selectedProject) {
          const refreshed = projs.find(p => p.id === selectedProject.id)
          if (refreshed) {
            setSelectedProject(refreshed)
            if (selectedModule) {
              const refreshedMod = (refreshed.estimate_modules || []).find(
                m => m.id === selectedModule.id
              )
              setSelectedModule(refreshedMod || null)
            }
          }
        }
      }
    }
    setLoading(false)
  }

  // ── Projects ──────────────────────────────────────
  // ── DRAFT-MODE handlers ──────────────────────────────────────────────────
  // Every project/module edit only updates local state and marks the
  // estimate dirty. Clicking "Save Changes" snapshots local state as a
  // new version (Estimate N+1) via saveDraftAsNewVersion(). The current
  // estimate row in Postgres stays untouched until then.
  function addProject() {
    if (!newProjectName.trim()) return
    const newProj = {
      id: crypto.randomUUID(),
      estimate_id: id,
      project_name: newProjectName.trim(),
      sort_order: projects.length + 1,
      gpmd_override: null,
      sub_gp_markup_rate: 0.2,
      estimate_modules: [],
    }
    setProjects(p => [...p, newProj])
    setNewProjectName('')
    setShowAddProject(false)
    setSelectedProject(newProj)
    setSelectedModule(null)
    markDirty()
  }

  function updateProject() {
    if (!editProjectName.trim() || !editingProject) return
    const newName = editProjectName.trim()
    setProjects(p =>
      p.map(pr => (pr.id === editingProject.id ? { ...pr, project_name: newName } : pr))
    )
    if (selectedProject?.id === editingProject.id)
      setSelectedProject(p => ({ ...p, project_name: newName }))
    setEditingProject(null)
    markDirty()
  }

  function deleteProject(proj) {
    if (
      !confirm(
        `Remove project "${proj.project_name}" from this draft?\n\nIt will only disappear once you save the new version. The current saved estimate is untouched.`
      )
    )
      return
    setProjects(p => p.filter(p2 => p2.id !== proj.id))
    if (selectedProject?.id === proj.id) {
      setSelectedProject(null)
      setSelectedModule(null)
    }
    markDirty()
  }

  // ── Project reorder (draft) — drag-and-drop in the left column
  function reorderProjects(fromId, toId) {
    if (!fromId || fromId === toId) return
    setProjects(prev => {
      const arr = [...prev]
      const fromIdx = arr.findIndex(p => p.id === fromId)
      const toIdx = arr.findIndex(p => p.id === toId)
      if (fromIdx < 0 || toIdx < 0) return prev
      const [moved] = arr.splice(fromIdx, 1)
      arr.splice(toIdx, 0, moved)
      return arr.map((p, i) => ({ ...p, sort_order: i + 1 }))
    })
    markDirty()
  }

  // ── Per-project GPMD override (draft) ─────────────────────
  function saveProjectGpmd(projectId, newVal) {
    setProjectGpmds(prev => ({ ...prev, [projectId]: newVal }))
    const proj = projects.find(p => p.id === projectId)
    if (!proj) return
    const mods = proj.estimate_modules || []
    const updatedMods = mods.map(mod => {
      const manDays = parseFloat(mod.man_days || 0)
      const laborCost = parseFloat(mod.labor_cost || mod.data?.calc?.laborCost || 0)
      const burden = parseFloat(mod.labor_burden || mod.data?.calc?.burden || 0)
      const mat = parseFloat(mod.material_cost || 0)
      const subCost = parseFloat(mod.sub_cost || mod.data?.calc?.subCost || 0)
      const oldGpmd = parseFloat(mod.data?.gpmd ?? 425)
      const oldTotalGP = parseFloat(mod.gross_profit || mod.data?.calc?.gp || 0)
      const subContrib = oldTotalGP - manDays * oldGpmd
      const newGP = manDays * newVal + subContrib
      const newCommission = newGP * 0.12
      const newPrice = laborCost + burden + mat + subCost + newGP + newCommission
      const updatedData = {
        ...(mod.data || {}),
        gpmd: newVal,
        calc: { ...(mod.data?.calc || {}), gp: newGP, commission: newCommission, price: newPrice },
      }
      return { ...mod, gross_profit: newGP, total_price: newPrice, data: updatedData }
    })
    const updatedProj = { ...proj, gpmd_override: newVal, estimate_modules: updatedMods }
    setProjects(prev => prev.map(p => (p.id === projectId ? updatedProj : p)))
    if (selectedProject?.id === projectId) setSelectedProject(updatedProj)
    if (selectedModule) {
      const refreshed = updatedMods.find(m => m.id === selectedModule.id)
      if (refreshed) setSelectedModule(refreshed)
    }
    markDirty()
  }

  // ── Per-project sub GP markup rate (draft) ────────────────────────────
  function saveProjectSubRate(projectId, newVal) {
    setProjects(prev =>
      prev.map(p => (p.id === projectId ? { ...p, sub_gp_markup_rate: newVal } : p))
    )
    if (selectedProject?.id === projectId)
      setSelectedProject(p => ({ ...p, sub_gp_markup_rate: newVal }))
    markDirty()
  }

  // ── Modules ──────────────────────────────────────
  function openModulePicker() {
    setShowModulePicker(true)
    setSelectedType(null)
    setModuleNameInput('')
    setPickerStep(1)
    setModuleForm({ man_days: '', material_cost: '', notes: '' })
  }

  function closeModuleFlow() {
    setShowModulePicker(false)
    setSelectedType(null)
    setModuleNameInput('')
    setPickerStep(1)
    setSwitchDemoData(null)
    setModuleForm({ man_days: '', material_cost: '', notes: '' })
    setEditingModule(null)
  }

  function openEditModule(mod) {
    setEditingModule(mod)
    setSelectedType(mod.module_type)
    setPickerStep(3) // skip the two add-flow steps when editing
    setModuleNameInput(mod.module_name || mod.module_type)
    // Pre-fill generic form in case it's a non-specific module type
    setModuleForm({
      man_days: mod.man_days || '',
      material_cost: mod.material_cost || '',
      notes: mod.notes || '',
    })
  }

  function extractFinancials(payload) {
    const calc = payload.data?.calc || {}
    return {
      labor_cost: parseFloat(payload.labor_cost || calc.laborCost || 0),
      labor_burden: parseFloat(payload.labor_burden || calc.burden || 0),
      gross_profit: parseFloat(payload.gross_profit || calc.gp || 0),
      sub_cost: parseFloat(payload.sub_cost || calc.subCost || 0),
      total_price: parseFloat(payload.total_price || calc.price || 0),
    }
  }

  function saveModule(formData) {
    if (!selectedType || !selectedProject) return
    const payload = formData || moduleForm
    const fin = extractFinancials(payload)
    const mod = {
      id: crypto.randomUUID(), // temp local id; stripped on save
      project_id: selectedProject.id,
      module_type: selectedType,
      module_name: (moduleNameInput || '').trim() || selectedType,
      man_days: parseFloat(payload.man_days) || 0,
      material_cost: parseFloat(payload.material_cost) || 0,
      data: payload.data || null,
      notes: payload.notes || '',
      ...fin,
    }
    const updatedProject = {
      ...selectedProject,
      estimate_modules: [...(selectedProject.estimate_modules || []), mod],
    }
    setProjects(p => p.map(proj => (proj.id === selectedProject.id ? updatedProject : proj)))
    setSelectedProject(updatedProject)
    setSelectedModule(mod)
    closeModuleFlow()
    markDirty()
  }

  function updateModule(formData) {
    if (!editingModule) return
    const payload = formData || moduleForm
    const fin = extractFinancials(payload)
    const updatedMod = {
      ...editingModule,
      module_name:
        (moduleNameInput || '').trim() || editingModule.module_name || editingModule.module_type,
      man_days: parseFloat(payload.man_days) || 0,
      material_cost: parseFloat(payload.material_cost) || 0,
      data: payload.data || editingModule.data || null,
      notes: payload.notes || '',
      ...fin,
    }
    const updatedProject = {
      ...selectedProject,
      estimate_modules: selectedProject.estimate_modules.map(m =>
        m.id === updatedMod.id ? updatedMod : m
      ),
    }
    setProjects(p => p.map(proj => (proj.id === selectedProject.id ? updatedProject : proj)))
    setSelectedProject(updatedProject)
    setSelectedModule(updatedMod)
    closeModuleFlow()
    markDirty()
  }

  function deleteModule(mod) {
    if (
      !confirm(
        `Remove module "${mod.module_type}" from this draft?\n\nIt will only disappear once you save the new version. The current saved estimate is untouched.`
      )
    )
      return
    const updatedProject = {
      ...selectedProject,
      estimate_modules: selectedProject.estimate_modules.filter(m => m.id !== mod.id),
    }
    setProjects(p => p.map(proj => (proj.id === selectedProject.id ? updatedProject : proj)))
    setSelectedProject(updatedProject)
    if (selectedModule?.id === mod.id) setSelectedModule(null)
    markDirty()
  }

  // ── Status management ────────────────────────────
  async function markAsSold() {
    if (!confirm(`Mark "${estimate.estimate_name}" as Sold? This will create a job record.`)) return
    setStatusLoading(true)

    // Aggregate totals from all modules across all projects
    const allModules = projects.flatMap(p => p.estimate_modules || [])
    const totals = allModules.reduce(
      (acc, mod) => {
        const calc = mod.data?.calc || {}
        acc.man_days += parseFloat(mod.man_days || 0)
        acc.material_cost += parseFloat(mod.material_cost || 0)
        acc.labor_burden += parseFloat(mod.labor_burden || calc.burden || 0)
        acc.sub_cost += parseFloat(mod.sub_cost || calc.subCost || 0)
        acc.gross_profit += parseFloat(mod.gross_profit || calc.gp || 0)
        acc.total_price += parseFloat(mod.total_price || calc.price || 0)
        return acc
      },
      {
        man_days: 0,
        material_cost: 0,
        labor_burden: 0,
        sub_cost: 0,
        gross_profit: 0,
        total_price: 0,
      }
    )

    const gpmd = totals.man_days > 0 ? totals.gross_profit / totals.man_days : 0

    // Insert job record
    const { error: jobErr } = await supabase.from('jobs').insert({
      estimate_id: id,
      client_id: estimate.client_id || null,
      client_name: estimate.client_name || '',
      name: estimate.estimate_name,
      sold_date: new Date().toISOString(),
      total_man_days: totals.man_days,
      labor_burden: totals.labor_burden,
      material_cost: totals.material_cost,
      sub_cost: totals.sub_cost,
      gross_profit: totals.gross_profit,
      gpmd: gpmd,
      total_price: totals.total_price,
      status: 'active',
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
  // Date (YYYY-MM-DD) of the most recent bid created from this estimate, or
  // null if no bids exist yet. Shown as small black text under the Create
  // Bid button so the user knows whether they're about to make a duplicate.
  const [lastBidDate, setLastBidDate] = useState(null)
  // After a successful create, we open a confirmation modal pointing the
  // user to the Bids table (so they don't lose track of where the new bid
  // landed). null = closed; { bidId, recordType } = open.
  const [bidCreatedModal, setBidCreatedModal] = useState(null)

  // Fetch the most-recent bid date for this estimate (refreshed after each
  // create so the "Last bid" line updates immediately).
  async function refreshLastBidDate() {
    if (!id) return
    const { data } = await supabase
      .from('bids')
      .select('date_submitted')
      .eq('estimate_id', id)
      .eq('record_type', 'bid')
      .order('date_submitted', { ascending: false })
      .limit(1)
      .maybeSingle()
    setLastBidDate(data?.date_submitted || null)
  }
  useEffect(() => {
    refreshLastBidDate()
  }, [id])

  async function createBid() {
    if (!projects.length) {
      alert('Add at least one project before creating a bid.')
      return
    }
    // Draft mode safety: never create a bid that points at an estimate row
    // whose totals haven't been persisted yet. Block until the user either
    // saves the draft as a new version or discards it.
    if (dirty) {
      alert(
        'You have unsaved changes on this estimate. Click "Save Changes as New Version" first — the bid will then use that new version\'s numbers.'
      )
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
            [clientData.city, clientData.state, clientData.zip].filter(Boolean).join(', '),
          ].filter(Boolean)
          clientAddress = parts.join('\n')
        }
      }

      // Re-pull projects + modules straight from the DB for the CURRENT
      // estimate id. Guarantees bid totals match exactly what's saved on
      // this version, regardless of whatever's in local state.
      const { data: freshProjs } = await supabase
        .from('estimate_projects')
        .select('*, estimate_modules(*)')
        .eq('estimate_id', id)
        .order('sort_order', { nullsFirst: false })
        .order('created_at')
      const projsForBid = freshProjs || projects

      // Compute grand total, GP, and GPMD from the freshly fetched data.
      // The module-level total_price doesn't carry per-project Sub GP
      // markup (that's a project-level field), so we add it back here so
      // the bid total matches the Estimate Totals bar exactly.
      const allMods = projsForBid.flatMap(p => p.estimate_modules || [])
      const moduleSum = allMods.reduce(
        (s, m) => s + parseFloat(m.total_price || m.data?.calc?.price || 0),
        0
      )
      const moduleGp = allMods.reduce(
        (s, m) => s + parseFloat(m.gross_profit || m.data?.calc?.gp || 0),
        0
      )
      const totalMD = allMods.reduce(
        (s, m) => s + parseFloat(m.man_days || m.data?.calc?.manDays || 0),
        0
      )
      const subGp = projsForBid.reduce((s, p) => {
        const projSub = (p.estimate_modules || []).reduce(
          (ms, m) => ms + parseFloat(m.sub_cost || m.data?.calc?.subCost || 0),
          0
        )
        const rate = p.sub_gp_markup_rate ?? 0.2
        return s + projSub * rate
      }, 0)
      const grandTotal = moduleSum + subGp + subGp * 0.12
      const totalGp = moduleGp + subGp
      const bidGpmd = totalMD > 0 ? Math.round(totalGp / totalMD) : 0
      const projNames = projsForBid.map(p => p.project_name)

      // Save bid / change order record to Supabase
      const { data: bid, error: bidErr } = await supabase
        .from('bids')
        .insert({
          client_name: estimate.client_name || '',
          job_address: clientAddress.replace('\n', ', '),
          bid_amount: grandTotal,
          gross_profit: totalGp,
          gpmd: bidGpmd,
          date_submitted: new Date().toISOString().split('T')[0],
          status: 'pending',
          estimate_id: id,
          projects: projNames,
          notes: '',
          created_by: user?.id || null,
          // Change Order fields
          record_type: isCOMode ? 'change_order' : 'bid',
          linked_job_id: isCOMode ? coJobId : null,
          co_name: isCOMode ? coName : null,
          co_type: isCOMode ? coType : null,
        })
        .select()
        .single()

      if (bidErr) throw new Error(bidErr.message)

      // No auto-download — the user typically needs to edit the bid in
      // the Bids module before sending. The Word doc can be generated
      // from there once the bid is finalised.

      // Confirmation modal: tell the user it saved + point them at the
      // Bids table so they can find it. CO mode keeps the existing
      // navigate-back behavior (Jobs → Change Orders flow), so we skip
      // the modal there to avoid disrupting that workflow.
      if (!isCOMode) {
        setBidCreatedModal({ bidId: bid.id, clientName: bid.client_name })
        refreshLastBidDate()
      }

      // Navigate back if a return path was provided (e.g., back to Jobs > Change Orders)
      if (isCOMode && returnTo) {
        navigate(returnTo)
      }
    } catch (err) {
      alert('Error creating bid: ' + err.message)
    } finally {
      setCreatingBid(false)
    }
  }

  async function deleteEstimate() {
    if (estimate.status !== 'pending') return

    // Look up any bids and associated work orders
    const { data: bidsData } = await supabase.from('bids').select('id').eq('estimate_id', id)
    const bidCount = bidsData?.length || 0

    const { data: jobsData } = await supabase.from('jobs').select('id').eq('estimate_id', id)
    let woCount = 0
    const jobIds = jobsData?.map(j => j.id) || []
    if (jobIds.length > 0) {
      const { count } = await supabase
        .from('work_orders')
        .select('id', { count: 'exact', head: true })
        .in('job_id', jobIds)
      woCount = count || 0
    }

    const bidIds = bidsData?.map(b => b.id) || []

    setEstDeleteModal({
      bidCount,
      woCount,
      // Delete all — bids + WOs + estimate
      onConfirm: async () => {
        setStatusLoading(true)
        if (jobIds.length) await supabase.from('work_orders').delete().in('job_id', jobIds)
        if (bidIds.length) await supabase.from('bids').delete().in('id', bidIds)
        await supabase.from('estimates').delete().eq('id', id)
        setEstDeleteModal(null)
        navigate(estimate.client_id ? `/clients/${estimate.client_id}` : '/clients')
      },
      // Keep bid — only delete WOs + estimate, leave bids
      onKeepBid:
        bidCount > 0
          ? async () => {
              setStatusLoading(true)
              if (jobIds.length) await supabase.from('work_orders').delete().in('job_id', jobIds)
              await supabase.from('estimates').delete().eq('id', id)
              setEstDeleteModal(null)
              navigate(estimate.client_id ? `/clients/${estimate.client_id}` : '/clients')
            }
          : null,
    })
  }

  // ── Render ────────────────────────────────────────
  if (loading)
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-700"></div>
      </div>
    )
  if (!estimate)
    return <div className="card text-center py-12 text-gray-500">Estimate not found.</div>

  const activeModules = selectedProject?.estimate_modules || []

  // ── Module initialData: always inject the current project GPMD ────────────
  // This ensures the module form shows the correct GPMD whether adding a new
  // module or editing an existing one, regardless of what is stored in module.data.
  const moduleInitialData = {
    ...(editingModule?.data || {}),
    ...(switchDemoData || {}),
    // Priority: per-project override → stored module GPMD → global default
    // from company_settings.estimate_gpmd_default → hardcoded baseline.
    gpmd: projectGpmds[selectedProject?.id] ?? editingModule?.data?.gpmd ?? globalGpmd,
    // Sub GP rate always comes from the project — never from stored module data
    subGpMarkupRate: selectedProject?.sub_gp_markup_rate ?? 0.2,
    // Notes live as a top-level column on estimate_modules (Sam writes
    // takeoffs here via create_estimate_from_takeoff). Surface it here so
    // the module's notes textarea pre-fills when editing.
    notes: editingModule?.notes ?? '',
  }

  // ── Estimate-wide totals across every module in every project ──────────────
  const allModules = projects.flatMap(p => p.estimate_modules || [])
  const estimateTotals = allModules.reduce(
    (acc, mod) => {
      const calc = mod.data?.calc || {}
      const gp = parseFloat(mod.gross_profit || calc.gp || 0)
      acc.manDays += parseFloat(mod.man_days || 0)
      acc.materialCost += parseFloat(mod.material_cost || 0)
      acc.laborCost += parseFloat(mod.labor_cost || calc.laborCost || 0)
      acc.burden += parseFloat(mod.labor_burden || calc.burden || 0)
      acc.subCost += parseFloat(mod.sub_cost || calc.subCost || 0)
      acc.gp += gp
      acc.commission += parseFloat(calc.commission || gp * 0.12 || 0)
      acc.price += parseFloat(mod.total_price || calc.price || 0)
      return acc
    },
    {
      manDays: 0,
      materialCost: 0,
      laborCost: 0,
      burden: 0,
      subCost: 0,
      gp: 0,
      commission: 0,
      price: 0,
    }
  )
  const et = estimateTotals

  // Adjusted estimate GP — sum of each project bar's effective GP
  // If a project has a GPMD override: GP = projManDays × override
  // Otherwise: GP = natural sum of module gross profits
  const adjustedEstimateGP = projects.reduce((sum, proj) => {
    const mods = proj.estimate_modules || []
    const projManDays = mods.reduce((s, m) => s + parseFloat(m.man_days || 0), 0)
    const naturalGP = mods.reduce((s, m) => {
      const c = m.data?.calc || {}
      return s + parseFloat(m.gross_profit || c.gp || 0)
    }, 0)
    const override = projectGpmds[proj.id]
    return sum + (override != null ? projManDays * override : naturalGP)
  }, 0)
  // Estimate GPMD is purely derived — never edited directly
  // (displayed inside GpmdBar via directGp ÷ manDays)

  // Estimate-level Sub GP: sum each project's sub cost × that project's own rate
  const estimateTotalSubGp = projects.reduce((sum, proj) => {
    const mods = proj.estimate_modules || []
    const projSubCost = mods.reduce(
      (s, m) => s + parseFloat(m.sub_cost || m.data?.calc?.subCost || 0),
      0
    )
    const projRate = proj.sub_gp_markup_rate ?? 0.2
    return sum + projSubCost * projRate
  }, 0)
  // Derived blended rate for display in the Estimate Totals bar (read-only)
  const derivedEstSubRate = et.subCost > 0 ? estimateTotalSubGp / et.subCost : 0.2

  // ── Per-project totals for selected project ────────────────────────────────
  const projModules = selectedProject?.estimate_modules || []
  const projectTotals = projModules.reduce(
    (acc, mod) => {
      const calc = mod.data?.calc || {}
      acc.manDays += parseFloat(mod.man_days || 0)
      acc.materialCost += parseFloat(mod.material_cost || 0)
      acc.laborCost += parseFloat(mod.labor_cost || calc.laborCost || 0)
      acc.burden += parseFloat(mod.labor_burden || calc.burden || 0)
      acc.subCost += parseFloat(mod.sub_cost || calc.subCost || 0)
      acc.gp += parseFloat(mod.gross_profit || calc.gp || 0)
      acc.price += parseFloat(mod.total_price || calc.price || 0)
      return acc
    },
    { manDays: 0, materialCost: 0, laborCost: 0, burden: 0, subCost: 0, gp: 0, price: 0 }
  )
  const pt = projectTotals
  const projGpmd = pt.manDays > 0 ? Math.round(pt.gp / pt.manDays) : 425

  return (
    <div className="flex flex-col lg:h-full">
      {/* ── What If? scratchpad modal ── */}
      {whatIfOpen && (
        <EstimateWhatIfModal
          projects={projects}
          et={et}
          adjustedEstimateGP={adjustedEstimateGP}
          derivedEstSubRate={derivedEstSubRate}
          onClose={() => setWhatIfOpen(false)}
          onApplyAsNewVersion={applyAsNewVersion}
        />
      )}

      {/* ── Estimate Delete Cascade Modal ── */}
      {/* Bid-created confirmation modal — opens after a successful bid
          create. User can close it or click through to /bids. */}
      {bidCreatedModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setBidCreatedModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-3">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">✅</span>
                <h3 className="text-lg font-semibold text-gray-900">Bid created</h3>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                A new bid for{' '}
                <strong className="text-gray-900">
                  {bidCreatedModal.clientName || estimate?.client_name || 'this opportunity'}
                </strong>{' '}
                has been saved. You can find it in the <strong>Bids</strong> table (look for today's
                date).
              </p>
            </div>
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-end gap-2 bg-gray-50">
              <button
                onClick={() => setBidCreatedModal(null)}
                className="text-xs font-semibold text-gray-600 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-white"
              >
                Close
              </button>
              <Link
                to="/bids"
                onClick={() => setBidCreatedModal(null)}
                className="text-xs font-semibold text-white bg-green-700 hover:bg-green-800 px-3 py-1.5 rounded-lg transition-colors"
              >
                Go to Bids →
              </Link>
            </div>
          </div>
        </div>
      )}

      {estDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">⚠️</span>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Delete This Estimate?</h2>
                <p className="text-sm text-gray-500">"{estimate.estimate_name}"</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm space-y-1.5">
              <p className="text-gray-700">
                Deleting this estimate will also remove all projects and modules inside it.
              </p>
              {estDeleteModal.bidCount > 0 && (
                <p className="text-red-700 font-medium">
                  ⚠️ {estDeleteModal.bidCount} Bid{estDeleteModal.bidCount !== 1 ? 's' : ''}{' '}
                  associated with this estimate will also be deleted.
                </p>
              )}
              {estDeleteModal.woCount > 0 && (
                <p className="text-red-700 font-medium">
                  ⚠️ {estDeleteModal.woCount} Work Order{estDeleteModal.woCount !== 1 ? 's' : ''}{' '}
                  associated with this estimate's bid{estDeleteModal.bidCount !== 1 ? 's' : ''} will
                  also be deleted.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {estDeleteModal.onKeepBid && (
                <button
                  onClick={estDeleteModal.onKeepBid}
                  className="w-full px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-800 font-semibold hover:bg-amber-100 transition-colors text-sm"
                >
                  Delete Estimate Only — Keep Bid{estDeleteModal.bidCount !== 1 ? 's' : ''}
                </button>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setEstDeleteModal(null)}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={estDeleteModal.onConfirm}
                  className="flex-1 bg-red-600 text-white font-semibold py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete Everything
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 text-sm">
        <Link to="/clients" className="text-gray-400 hover:text-gray-600">
          ← Opportunities
        </Link>
        {estimate.client_name && (
          <>
            <span className="text-gray-300">/</span>
            <Link
              to={estimate.client_id ? `/clients/${estimate.client_id}` : '/clients'}
              className="text-gray-400 hover:text-gray-600 hover:underline"
            >
              {estimate.client_name}
            </Link>
          </>
        )}
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-medium">
          {editingName ? nameInput || estimate.estimate_name : estimate.estimate_name}
        </span>
        {(estimate.version > 1 || estimate.parent_estimate_id) && (
          <span className="ml-2 text-[11px] bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5 font-medium">
            Estimate {estimate.version || 2}
          </span>
        )}
      </div>

      {/* Change Order mode banner */}
      {isCOMode && (
        <div className="flex items-center gap-2 mb-3 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
          <span className="text-base">📋</span>
          <span>
            <span className="font-semibold">Change Order:</span> {coName || 'Unnamed'}
          </span>
          {coType && <span className="text-blue-500">· {coType}</span>}
          <span className="ml-auto text-xs text-blue-500">
            Complete the estimate below, then click Create Change Order
          </span>
        </div>
      )}

      {/* Estimate header */}
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') saveEstimateName()
                  if (e.key === 'Escape') setEditingName(false)
                }}
                onBlur={saveEstimateName}
                disabled={savingName}
                className="text-2xl font-bold text-gray-900 border-b-2 border-green-500 outline-none bg-transparent w-72"
              />
              {savingName && <span className="text-xs text-gray-400">Saving…</span>}
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h1 className="text-2xl font-bold text-gray-900">
                {estimate.client_name
                  ? `${estimate.client_name} - ${estimate.estimate_name}`
                  : estimate.estimate_name}
              </h1>
              <button
                onClick={() => {
                  setNameInput(estimate.estimate_name)
                  setEditingName(true)
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600"
                title="Rename estimate"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
            </div>
          )}
          {estimate.type && (
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full ${TYPE_COLORS[estimate.type] || 'bg-gray-100 text-gray-700'}`}
            >
              {estimate.type}
            </span>
          )}
          <span
            className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_BADGE[estimate.status] || STATUS_BADGE.pending}`}
          >
            {estimate.status?.charAt(0).toUpperCase() + estimate.status?.slice(1) || 'Pending'}
          </span>
          {dirty && (
            <span className="text-[11px] font-bold uppercase tracking-wide bg-amber-100 text-amber-800 border border-amber-300 rounded-full px-2 py-0.5">
              Unsaved draft
            </span>
          )}
        </div>

        {/* Status action buttons */}
        <div className="flex gap-2 flex-shrink-0 flex-wrap">
          {/* Save Changes — only visible when there are draft edits.
               Snapshots local state into a brand-new estimate version
               (Estimate N+1, where N = max version across the whole tree
               regardless of which version the user is currently on). */}
          {dirty && (() => {
            // First save of a brand-new estimate (no prior versions) gets a
            // plain "Save" label. Once the tree has at least one prior
            // version saved, subsequent saves become "Save New Version" to
            // make the version-snapshotting behavior explicit.
            const isFirstSave =
              !estimate.parent_estimate_id &&
              (!estimate.version || estimate.version <= 1)
            const label = savingDraft
              ? 'Saving…'
              : isFirstSave
                ? '💾 Save'
                : '💾 Save New Version'
            return (
              <button
                onClick={async () => {
                  setSavingDraft(true)
                  const ok = await applyAsNewVersion({})
                  setSavingDraft(false)
                  if (ok) setDirty(false)
                }}
                disabled={savingDraft}
                className="px-4 py-1 rounded-lg bg-green-700 text-white text-sm font-semibold hover:bg-green-800 disabled:opacity-50"
                title={
                  isFirstSave
                    ? 'Save this estimate'
                    : 'Snapshot every change as the next estimate version'
                }
              >
                {label}
              </button>
            )
          })()}
          {/* Create Bid / Change Order */}
          <div className="flex flex-col items-stretch">
            <button
              onClick={createBid}
              disabled={creatingBid}
              className={`text-sm px-4 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-50 ${
                isCOMode
                  ? 'border border-blue-700 text-blue-700 hover:bg-blue-50'
                  : 'border border-green-700 text-green-700 hover:bg-green-50'
              }`}
            >
              {creatingBid
                ? '⏳ Generating...'
                : isCOMode
                  ? '📋 Create Change Order'
                  : '📄 Create Bid'}
            </button>
            {/* Show the most-recent bid date so the user can tell if a
                fresh bid would be a duplicate. Hidden in CO mode (the
                date isn't relevant to change orders). */}
            {!isCOMode && lastBidDate && (
              <p className="text-[11px] text-black text-center mt-1">
                Last bid:{' '}
                {new Date(lastBidDate + 'T00:00:00').toLocaleDateString('en-US', {
                  month: 'numeric',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>

          <button
            onClick={deleteEstimate}
            disabled={statusLoading}
            className="text-sm px-4 py-1.5 rounded-lg border border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
            title="Delete this estimate"
          >
            🗑 Delete
          </button>
        </div>
      </div>

      {/* ── Estimate-wide summary bar ── */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-3">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Estimate Totals
            </p>
            {allModules.length > 0 && (
              <button
                onClick={() => setWhatIfOpen(true)}
                className="px-3 py-1 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-[11px] font-semibold hover:bg-amber-100 hover:border-amber-400 transition-colors"
                title="Run a what-if analysis: tweak GPMD, overall price, or per-project / per-module overrides"
              >
                💡 What If?
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400">
            {allModules.length} module{allModules.length !== 1 ? 's' : ''}
            {' across '}
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        {allModules.length === 0 ? (
          <div className="bg-gray-900 text-white rounded-xl px-5 py-4">
            <p className="text-xs text-gray-500 text-center py-1">
              Add projects and modules to see totals here.
            </p>
          </div>
        ) : (
          <GpmdBar
            totalMat={et.materialCost}
            totalHrs={et.manDays * 8}
            manDays={et.manDays}
            laborCost={et.laborCost}
            laborRatePerHour={
              et.manDays > 0 && et.laborCost > 0 ? et.laborCost / (et.manDays * 8) : 35
            }
            burden={et.burden}
            subCost={et.subCost}
            directGp={adjustedEstimateGP}
            price={et.price}
            subMarkupRate={derivedEstSubRate}
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
              {projectGpmds[selectedProject.id] != null &&
                projectGpmds[selectedProject.id] !== projGpmd && (
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
            subMarkupRate={selectedProject.sub_gp_markup_rate ?? 0.2}
            onSubMarkupSave={val => saveProjectSubRate(selectedProject.id, val)}
          />
        </div>
      )}

      {/* Three-panel layout — stacks vertically on mobile, side-by-side on desktop */}
      <div className="flex flex-col lg:flex-row gap-4 lg:flex-1 lg:min-h-0 lg:[min-height:500px]">
        {/* ── Panel 1: Projects ── */}
        <div className="w-full lg:w-1/3 min-h-[16rem] lg:min-h-0 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h2 className="font-semibold text-gray-900 text-sm">Projects</h2>
            <button
              onClick={() => {
                setShowAddProject(true)
                setNewProjectName('')
              }}
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
                  <button
                    onClick={() => setShowAddProject(false)}
                    className="btn-secondary text-xs flex-1 py-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addProject}
                    disabled={savingProject || !newProjectName.trim()}
                    className="btn-primary text-xs flex-1 py-1"
                  >
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
                  onKeyDown={e => {
                    if (e.key === 'Enter') updateProject()
                    if (e.key === 'Escape') setEditingProject(null)
                  }}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingProject(null)}
                    className="btn-secondary text-xs flex-1 py-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={updateProject}
                    disabled={savingProject || !editProjectName.trim()}
                    className="btn-primary text-xs flex-1 py-1"
                  >
                    {savingProject ? '...' : 'Save'}
                  </button>
                </div>
              </div>
            )}

            {projects.length === 0 && !showAddProject ? (
              <div className="p-6 text-center text-gray-400 text-sm">
                <p className="mb-2">No projects yet.</p>
                <button onClick={() => setShowAddProject(true)} className="btn-primary text-xs">
                  + Add Project
                </button>
              </div>
            ) : (
              projects.map(proj => {
                const projMD = (proj.estimate_modules || []).reduce(
                  (s, m) => s + parseFloat(m.man_days || 0),
                  0
                )
                const projMat = (proj.estimate_modules || []).reduce(
                  (s, m) => s + parseFloat(m.material_cost || 0),
                  0
                )
                const isSelected = selectedProject?.id === proj.id
                return (
                  <div
                    key={proj.id}
                    draggable
                    onDragStart={() => setDragProjId(proj.id)}
                    onDragEnd={() => {
                      setDragProjId(null)
                      setDragOverProjId(null)
                    }}
                    onDragOver={e => {
                      e.preventDefault()
                      if (dragProjId && dragProjId !== proj.id) setDragOverProjId(proj.id)
                    }}
                    onDragLeave={() => setDragOverProjId(o => (o === proj.id ? null : o))}
                    onDrop={e => {
                      e.preventDefault()
                      reorderProjects(dragProjId, proj.id)
                      setDragProjId(null)
                      setDragOverProjId(null)
                    }}
                    onClick={() => {
                      setSelectedProject(proj)
                      setSelectedModule(null)
                    }}
                    className={`px-4 py-3 cursor-pointer transition-colors group ${
                      dragProjId === proj.id ? 'opacity-40' : ''
                    } ${
                      dragOverProjId === proj.id && dragProjId !== proj.id
                        ? 'bg-green-100'
                        : isSelected
                          ? 'bg-green-50'
                          : 'hover:bg-gray-50'
                    } ${isSelected ? 'shadow-[inset_4px_0_0_#16a34a]' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <p
                        className={`flex items-center text-sm font-semibold ${isSelected ? 'text-green-800' : 'text-gray-800'}`}
                      >
                        <span
                          className="mr-1.5 cursor-grab select-none text-gray-300"
                          title="Drag to reorder"
                        >
                          ⠿
                        </span>
                        {proj.project_name}
                      </p>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            setEditingProject(proj)
                            setEditProjectName(proj.project_name)
                          }}
                          className="text-gray-400 hover:text-gray-700 text-xs"
                          title="Rename"
                        >
                          ✎
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            deleteProject(proj)
                          }}
                          className="text-red-300 hover:text-red-500 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {(proj.estimate_modules || []).length} module
                      {(proj.estimate_modules || []).length !== 1 ? 's' : ''}
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
        <div className="w-full lg:w-1/3 min-h-[16rem] lg:min-h-0 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden">
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
                <button onClick={openModulePicker} className="btn-primary text-xs">
                  + Add Module
                </button>
              </div>
            ) : (
              activeModules.map(mod => {
                const isSelected = selectedModule?.id === mod.id
                return (
                  <div
                    key={mod.id}
                    onClick={() => setSelectedModule(mod)}
                    className={`px-4 py-3 cursor-pointer transition-colors group ${
                      isSelected
                        ? 'bg-green-50 shadow-[inset_4px_0_0_#16a34a]'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p
                        className={`text-sm font-semibold ${isSelected ? 'text-green-800' : 'text-gray-800'}`}
                        title={
                          mod.module_name && mod.module_name !== mod.module_type
                            ? mod.module_type
                            : undefined
                        }
                      >
                        {mod.module_name || mod.module_type}
                      </p>
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          deleteModule(mod)
                        }}
                        className="text-red-300 hover:text-red-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {parseFloat(mod.man_days || 0).toFixed(1)} MD · $
                      {parseFloat(mod.material_cost || 0).toLocaleString()} mat.
                    </p>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ── Panel 3: Module Detail ── */}
        <div className="w-full lg:w-1/3 min-h-[16rem] lg:min-h-0 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h2 className="font-semibold text-gray-900 text-sm">
              {selectedModule
                ? selectedModule.module_name || selectedModule.module_type
                : 'Module Detail'}
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
                ) : selectedModule.module_type === 'Planting' ? (
                  <PlantingSummary module={selectedModule} />
                ) : selectedModule.module_type === 'Utilities' ? (
                  <UtilitiesSummary module={selectedModule} />
                ) : selectedModule.module_type === 'Columns' ? (
                  <ColumnsSummary module={selectedModule} />
                ) : selectedModule.module_type === 'Ground Treatments' ? (
                  <GroundTreatmentsSummary module={selectedModule} />
                ) : selectedModule.module_type === 'Outdoor Kitchen' ? (
                  <OutdoorKitchenSummary module={selectedModule} />
                ) : selectedModule.module_type === 'Fire Pit' ? (
                  <FirePitSummary module={selectedModule} />
                ) : selectedModule.module_type === 'Walls' ? (
                  <WallsSummary module={selectedModule} />
                ) : selectedModule.module_type === 'Finishes' ? (
                  <FinishesSummary module={selectedModule} />
                ) : selectedModule.module_type === 'Steps' ? (
                  <StepsSummary module={selectedModule} />
                ) : selectedModule.module_type === 'Pool' ? (
                  <PoolSummary module={selectedModule} />
                ) : (
                  /* Generic fallback for modules not yet built out */
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500 mb-1">Man Days</p>
                        <p className="text-xl font-bold text-gray-900">
                          {parseFloat(selectedModule.man_days || 0).toFixed(1)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {(parseFloat(selectedModule.man_days || 0) * 8).toFixed(0)} hrs
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500 mb-1">Material Cost</p>
                        <p className="text-xl font-bold text-gray-900">
                          ${parseFloat(selectedModule.material_cost || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {selectedModule.notes && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                          Notes
                        </p>
                        <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                          {selectedModule.notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes (if saved separately from module data) */}
                {
                  selectedModule.module_type !== 'Drainage' &&
                    selectedModule.notes &&
                    null /* already shown above */
                }

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
      {showModulePicker && !selectedType && pickerStep === 1 && (
        <div className="fixed inset-x-0 top-0 h-[100dvh] z-50 flex items-center justify-center py-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeModuleFlow} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 max-h-[90dvh] flex flex-col overflow-hidden">
            {/* Header (pinned) */}
            <div className="px-6 pt-6 pb-3 flex-shrink-0">
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-0.5">
                Add Module
              </p>
              <h2 className="text-xl font-bold text-gray-900">{selectedProject?.project_name}</h2>
              <p className="text-sm text-gray-500 mt-0.5">Select a module type</p>
            </div>
            {/* Scrollable list */}
            <div className="px-6 flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-4">
              {MODULE_GROUPS.map(({ label, items }) => (
                <div key={label}>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 px-0.5">
                    {label}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {items.map(type => (
                      <button
                        key={type}
                        onClick={() => {
                          setSelectedType(type)
                          setModuleNameInput(type)
                          setPickerStep(2)
                        }}
                        className="text-left px-3 py-2.5 rounded-lg border border-gray-200 hover:border-green-500 hover:bg-green-50 text-sm font-medium text-gray-700 hover:text-green-800 transition-colors"
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {/* Footer (pinned) — Cancel always visible */}
            <div className="px-6 py-4 flex-shrink-0 border-t border-gray-100">
              <button onClick={closeModuleFlow} className="btn-secondary w-full text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Module Form Modal ── */}
      {/* Step 2 — Name the module. Pre-filled with the module type so the
          user can just hit Continue, or override with a custom name like
          "Front Yard Patio" or "Pool Coping — phase 2". */}
      {showModulePicker && selectedType && pickerStep === 2 && (
        <div className="fixed inset-x-0 top-0 h-[100dvh] z-50 flex items-center justify-center py-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeModuleFlow} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 max-h-[90dvh] overflow-y-auto overscroll-contain">
            <div className="mb-4">
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-0.5">
                Add Module · Step 2 of 2
              </p>
              <h2 className="text-xl font-bold text-gray-900">{selectedType}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{selectedProject?.project_name}</p>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                Module Name{' '}
                <span className="text-gray-400 normal-case font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={moduleNameInput}
                onChange={e => setModuleNameInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && moduleNameInput.trim()) setPickerStep(3)
                }}
                autoFocus
                placeholder={selectedType}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Shown in the module list. Leave as-is for the default "{selectedType}".
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedType(null)
                  setPickerStep(1)
                }}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50"
              >
                ← Back
              </button>
              <button
                onClick={() => setPickerStep(3)}
                className="flex-1 px-4 py-2 rounded-lg bg-green-700 text-white text-sm font-semibold hover:bg-green-800"
              >
                Continue →
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedType && pickerStep === 3 && (
        <div className="fixed inset-x-0 top-0 h-[100dvh] z-50 flex items-center justify-center py-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeModuleFlow} />

          {/* Wide scrollable modal for module-specific forms */}
          {selectedType === 'Drainage' ||
          selectedType === 'Lighting' ||
          selectedType === 'Skid Steer Demo' ||
          selectedType === 'Mini Skid Steer Demo' ||
          selectedType === 'Concrete' ||
          selectedType === 'Hand Demo' ||
          selectedType === 'Irrigation' ||
          selectedType === 'Artificial Turf' ||
          selectedType === 'Pavers' ||
          selectedType === 'Planting' ||
          selectedType === 'Pool' ||
          selectedType === 'Utilities' ||
          selectedType === 'Columns' ||
          selectedType === 'Ground Treatments' ||
          selectedType === 'Outdoor Kitchen' ||
          selectedType === 'Fire Pit' ||
          selectedType === 'Walls' ||
          selectedType === 'Finishes' ||
          selectedType === 'Steps' ? (
            <div
              className={`relative bg-white rounded-2xl shadow-xl w-full mx-4 flex flex-col ${selectedType === 'Pavers' || selectedType === 'Pool' ? 'max-w-6xl' : 'max-w-5xl'}`}
              style={{ maxHeight: '90dvh' }}
            >
              <div className="flex items-start justify-between px-6 pt-5 pb-3 border-b border-gray-200 flex-shrink-0">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-0.5">
                    {editingModule ? 'Edit Module' : 'Add Module'}
                  </p>
                  {editingModule ? (
                    <input
                      type="text"
                      value={moduleNameInput}
                      onChange={e => setModuleNameInput(e.target.value)}
                      placeholder={editingModule.module_type || selectedType}
                      title="Edit the module name — saved when you click Update Module"
                      className="w-full max-w-md rounded-md border border-dashed border-gray-300 bg-white px-2 py-1 text-xl font-bold text-gray-900 focus:border-green-500 focus:outline-none"
                    />
                  ) : (
                    <h2 className="text-xl font-bold text-gray-900">
                      {(moduleNameInput && moduleNameInput.trim()) ||
                        editingModule?.module_name ||
                        selectedType}
                    </h2>
                  )}
                  {/* Project-name row: project name on the left, Edit Rates
                      toggle on the right so it sits directly above the
                      "Total Price" cell of the GPMD bar (which is right-most
                      in the dark bar). Permission-gated and module-only. */}
                  <div className="flex items-center justify-between gap-3 mt-0.5">
                    <p className="text-sm text-gray-500">{selectedProject?.project_name}</p>
                    {canAccessRates && (
                      <button
                        type="button"
                        onClick={toggleRateIcons}
                        title={
                          showRateIcons
                            ? 'Hide the inline rate-edit calculator icons'
                            : 'Show calculator icons next to every rate so you can adjust master rates inline'
                        }
                        className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md border transition-colors ${
                          showRateIcons
                            ? 'bg-green-600 border-green-500 text-white hover:bg-green-700'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                        }`}
                      >
                        <svg
                          className="w-3 h-3"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <rect x="4" y="3" width="16" height="18" rx="2" />
                          <line x1="8" y1="7" x2="16" y2="7" />
                          <line x1="8" y1="11" x2="10" y2="11" />
                          <line x1="13" y1="11" x2="16" y2="11" />
                          <line x1="8" y1="15" x2="10" y2="15" />
                          <line x1="13" y1="15" x2="16" y2="15" />
                          <line x1="8" y1="19" x2="10" y2="19" />
                          <line x1="13" y1="19" x2="16" y2="19" />
                        </svg>
                        Edit Rates
                        <span
                          className={`text-[10px] uppercase tracking-wide ml-0.5 ${
                            showRateIcons ? 'text-green-100' : 'text-gray-500'
                          }`}
                        >
                          {showRateIcons ? 'on' : 'off'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
                <button
                  onClick={closeModuleFlow}
                  className="text-gray-400 hover:text-gray-600 text-base leading-none mt-0.5"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <div className="overflow-y-auto overscroll-contain px-6 pb-6 flex-1">
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center py-12 text-sm text-gray-400">
                      Loading module…
                    </div>
                  }
                >
                  {selectedType === 'Drainage' && (
                    <DrainageModule
                      projectName={selectedProject?.project_name}
                      onSave={editingModule ? updateModule : saveModule}
                      onBack={editingModule ? closeModuleFlow : () => setSelectedType(null)}
                      saving={savingModule}
                      initialData={moduleInitialData}
                    />
                  )}
                  {selectedType === 'Lighting' && (
                    <LightingModule
                      projectName={selectedProject?.project_name}
                      onSave={editingModule ? updateModule : saveModule}
                      onBack={editingModule ? closeModuleFlow : () => setSelectedType(null)}
                      saving={savingModule}
                      initialData={moduleInitialData}
                    />
                  )}
                  {selectedType === 'Skid Steer Demo' && (
                    <SkidSteerDemoModule
                      onSave={editingModule ? updateModule : saveModule}
                      onCancel={closeModuleFlow}
                      onSwitchType={switchDemoType}
                      initialData={moduleInitialData}
                    />
                  )}
                  {selectedType === 'Mini Skid Steer Demo' && (
                    <MiniSkidSteerDemoModule
                      onSave={editingModule ? updateModule : saveModule}
                      onCancel={closeModuleFlow}
                      onSwitchType={switchDemoType}
                      initialData={moduleInitialData}
                    />
                  )}
                  {selectedType === 'Concrete' && (
                    <ConcreteModule
                      projectName={selectedProject?.project_name}
                      onSave={editingModule ? updateModule : saveModule}
                      onBack={editingModule ? closeModuleFlow : () => setSelectedType(null)}
                      saving={savingModule}
                      initialData={moduleInitialData}
                    />
                  )}
                  {selectedType === 'Hand Demo' && (
                    <HandDemoModule
                      onSave={editingModule ? updateModule : saveModule}
                      onCancel={closeModuleFlow}
                      onSwitchType={switchDemoType}
                      initialData={moduleInitialData}
                    />
                  )}
                  {selectedType === 'Irrigation' && (
                    <IrrigationModule
                      onSave={editingModule ? updateModule : saveModule}
                      onCancel={closeModuleFlow}
                      initialData={moduleInitialData}
                    />
                  )}
                  {selectedType === 'Artificial Turf' && (
                    <ArtificialTurfModule
                      onSave={editingModule ? updateModule : saveModule}
                      onCancel={closeModuleFlow}
                      initialData={moduleInitialData}
                    />
                  )}
                  {selectedType === 'Pavers' && (
                    <PaverModule
                      onSave={editingModule ? updateModule : saveModule}
                      onCancel={closeModuleFlow}
                      initialData={moduleInitialData}
                    />
                  )}
                  {selectedType === 'Planting' && (
                    <PlantingModule
                      projectName={selectedProject?.project_name}
                      onSave={editingModule ? updateModule : saveModule}
                      onBack={editingModule ? closeModuleFlow : () => setSelectedType(null)}
                      saving={savingModule}
                      initialData={moduleInitialData}
                    />
                  )}
                  {selectedType === 'Pool' && (
                    <PoolModule
                      projectName={selectedProject?.project_name}
                      onSave={editingModule ? updateModule : saveModule}
                      onBack={editingModule ? closeModuleFlow : () => setSelectedType(null)}
                      saving={savingModule}
                      initialData={moduleInitialData}
                    />
                  )}
                  {selectedType === 'Utilities' && (
                    <UtilitiesModule
                      projectName={selectedProject?.project_name}
                      onSave={editingModule ? updateModule : saveModule}
                      onBack={editingModule ? closeModuleFlow : () => setSelectedType(null)}
                      saving={savingModule}
                      initialData={moduleInitialData}
                    />
                  )}
                  {selectedType === 'Columns' && (
                    <ColumnsModule
                      projectName={selectedProject?.project_name}
                      onSave={editingModule ? updateModule : saveModule}
                      onBack={editingModule ? closeModuleFlow : () => setSelectedType(null)}
                      saving={savingModule}
                      initialData={moduleInitialData}
                    />
                  )}
                  {selectedType === 'Ground Treatments' && (
                    <GroundTreatmentsModule
                      projectName={selectedProject?.project_name}
                      onSave={editingModule ? updateModule : saveModule}
                      onBack={editingModule ? closeModuleFlow : () => setSelectedType(null)}
                      saving={savingModule}
                      initialData={moduleInitialData}
                    />
                  )}
                  {selectedType === 'Outdoor Kitchen' && (
                    <OutdoorKitchenModule
                      projectName={selectedProject?.project_name}
                      onSave={editingModule ? updateModule : saveModule}
                      onBack={editingModule ? closeModuleFlow : () => setSelectedType(null)}
                      saving={savingModule}
                      initialData={moduleInitialData}
                    />
                  )}
                  {selectedType === 'Fire Pit' && (
                    <FirePitModule
                      projectName={selectedProject?.project_name}
                      onSave={editingModule ? updateModule : saveModule}
                      onBack={editingModule ? closeModuleFlow : () => setSelectedType(null)}
                      saving={savingModule}
                      initialData={moduleInitialData}
                    />
                  )}
                  {selectedType === 'Walls' && (
                    <WallsModule
                      projectName={selectedProject?.project_name}
                      onSave={editingModule ? updateModule : saveModule}
                      onBack={editingModule ? closeModuleFlow : () => setSelectedType(null)}
                      saving={savingModule}
                      initialData={moduleInitialData}
                    />
                  )}
                  {selectedType === 'Finishes' && (
                    <FinishesModule
                      projectName={selectedProject?.project_name}
                      onSave={editingModule ? updateModule : saveModule}
                      onBack={editingModule ? closeModuleFlow : () => setSelectedType(null)}
                      saving={savingModule}
                      initialData={moduleInitialData}
                    />
                  )}
                  {selectedType === 'Steps' && (
                    <StepsModule
                      projectName={selectedProject?.project_name}
                      onSave={editingModule ? updateModule : saveModule}
                      onBack={editingModule ? closeModuleFlow : () => setSelectedType(null)}
                      saving={savingModule}
                      initialData={moduleInitialData}
                    />
                  )}
                </Suspense>
              </div>
            </div>
          ) : (
            /* Generic form for all other module types (placeholder until built) */
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 p-6 max-h-[90dvh] overflow-y-auto overscroll-contain">
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
                    type="number"
                    step="0.5"
                    min="0"
                    className="input"
                    placeholder="0.0"
                    value={moduleForm.man_days}
                    onChange={e => setModuleForm(p => ({ ...p, man_days: e.target.value }))}
                    autoFocus
                  />
                  <p className="text-xs text-gray-400 mt-1">1 Man Day = 8 hours</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Material Cost
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
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
                    className="input resize-none"
                    rows={2}
                    placeholder="Any details..."
                    value={moduleForm.notes}
                    onChange={e => setModuleForm(p => ({ ...p, notes: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={editingModule ? closeModuleFlow : () => setSelectedType(null)}
                  className="btn-secondary flex-1 text-sm"
                >
                  {editingModule ? 'Cancel' : '← Back'}
                </button>
                <button
                  onClick={() =>
                    editingModule ? updateModule(moduleForm) : saveModule(moduleForm)
                  }
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
