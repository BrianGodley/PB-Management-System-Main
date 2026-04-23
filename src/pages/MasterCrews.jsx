import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

// ─────────────────────────────────────────────────────────────────────────────
// Master Crews
// Internal tab: crew management built from employees
// Subcontractor tab: read-only view from subs_vendors (type='sub')
// ─────────────────────────────────────────────────────────────────────────────

const SKILL_TYPES   = ['Masonry', 'Demo', 'Paver', 'Landscape', 'Specialty']
const SKILL_LABELS  = { 1: 'Lv 1 — Best', 2: 'Lv 2 — Good', 3: 'Lv 3 — Fair', 4: 'Lv 4 — Basic' }
const LABEL_CHARS   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

const SKILL_COLORS = {
  Masonry:   'bg-orange-100 text-orange-800 border-orange-200',
  Demo:      'bg-red-100    text-red-800    border-red-200',
  Paver:     'bg-blue-100   text-blue-800   border-blue-200',
  Landscape: 'bg-green-100  text-green-800  border-green-200',
  Specialty: 'bg-purple-100 text-purple-800 border-purple-200',
}

const LEVEL_DOT = { 1: 'bg-green-500', 2: 'bg-yellow-400', 3: 'bg-orange-400', 4: 'bg-red-400' }

// ── Helpers ───────────────────────────────────────────────────────────────────
function empName(emp) {
  if (!emp) return ''
  return `${emp.first_name || ''} ${emp.last_name || ''}`.trim()
}
function empLabel(emp) {
  if (!emp) return ''
  return `${emp.last_name || ''}, ${emp.first_name || ''}`.trim()
}

// ── Crew Form Modal ───────────────────────────────────────────────────────────
function CrewModal({ crew, employees, usedLabels, onClose, onSave, onDelete }) {
  const isNew = !crew?.id

  // Next available label for new crews
  const nextLabel = LABEL_CHARS.find(c => !usedLabels.includes(c)) || ''

  const [label,       setLabel]       = useState(crew?.label       || nextLabel)
  const [chiefId,     setChiefId]     = useState(crew?.crew_chief_id || '')
  const [journeyId,   setJourneyId]   = useState(crew?.journeyman_id || '')
  const [lab1Id,      setLab1Id]      = useState(crew?.laborer_1_id || '')
  const [lab2Id,      setLab2Id]      = useState(crew?.laborer_2_id || '')
  const [lab3Id,      setLab3Id]      = useState(crew?.laborer_3_id || '')
  const [skills,      setSkills]      = useState(crew?.skills || [])
  const [notes,       setNotes]       = useState(crew?.notes || '')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')

  function toggleSkill(type) {
    setSkills(prev => {
      const exists = prev.find(s => s.type === type)
      if (exists) return prev.filter(s => s.type !== type)
      return [...prev, { type, level: 1 }]
    })
  }

  function setSkillLevel(type, level) {
    setSkills(prev => prev.map(s => s.type === type ? { ...s, level } : s))
  }

  async function handleSave() {
    if (!label) { setError('Label is required.'); return }
    if (!chiefId) { setError('Crew Chief is required.'); return }
    if (skills.length === 0) { setError('At least one skill type is required.'); return }
    setSaving(true)
    setError('')

    const payload = {
      label,
      crew_chief_id: chiefId    || null,
      journeyman_id: journeyId  || null,
      laborer_1_id:  lab1Id     || null,
      laborer_2_id:  lab2Id     || null,
      laborer_3_id:  lab3Id     || null,
      skills,
      notes,
    }

    const { error: err } = isNew
      ? await supabase.from('crews').insert(payload)
      : await supabase.from('crews').update(payload).eq('id', crew.id)

    setSaving(false)
    if (err) { setError(err.message); return }
    onSave()
  }

  const availableLabels = isNew
    ? LABEL_CHARS.filter(c => !usedLabels.includes(c))
    : LABEL_CHARS.filter(c => !usedLabels.includes(c) || c === crew?.label)

  // Employee dropdown options — exclude already-selected members
  function empOptions(currentId) {
    const taken = [chiefId, journeyId, lab1Id, lab2Id, lab3Id].filter(Boolean)
    return employees.filter(e => e.id === currentId || !taken.includes(e.id))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
         onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col"
           style={{ maxHeight: '92vh' }}>

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">
              {isNew ? 'New Crew' : `Edit Crew ${crew.label}`}
            </p>
            <h2 className="text-lg font-bold text-gray-900">Internal Crew</h2>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Label — editable in both new and edit mode */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Crew Label
            </label>
            <div className="flex gap-2 flex-wrap">
              {availableLabels.map(c => (
                <button key={c} onClick={() => setLabel(c)}
                  className={`w-9 h-9 rounded-lg text-sm font-bold border-2 transition-colors ${
                    label === c
                      ? 'bg-green-700 text-white border-green-700'
                      : 'border-gray-200 text-gray-600 hover:border-green-400 hover:text-green-700'
                  }`}>
                  {c}
                </button>
              ))}
              {availableLabels.length === 0 && (
                <p className="text-sm text-red-500">All labels A–Z are in use.</p>
              )}
            </div>
          </div>

          {/* Members */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Members
            </label>
            <div className="space-y-2">
              {[
                { role: 'Crew Chief *', id: chiefId,   set: setChiefId,   required: true  },
                { role: 'Journeyman',   id: journeyId, set: setJourneyId, required: false },
                { role: 'Laborer 1',    id: lab1Id,    set: setLab1Id,    required: false },
                { role: 'Laborer 2',    id: lab2Id,    set: setLab2Id,    required: false },
                { role: 'Laborer 3',    id: lab3Id,    set: setLab3Id,    required: false },
              ].map(({ role, id, set, required }) => (
                <div key={role} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-28 shrink-0">{role}</span>
                  <select
                    value={id}
                    onChange={e => set(e.target.value)}
                    className="input text-sm py-1.5 flex-1"
                  >
                    <option value="">{required ? '— Select —' : '— None —'}</option>
                    {empOptions(id).map(e => (
                      <option key={e.id} value={e.id}>{empLabel(e)}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Skills */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Crew Skills
              <span className="ml-1 font-normal normal-case text-gray-400">(1 = best · 4 = basic)</span>
            </label>
            <div className="space-y-2">
              {SKILL_TYPES.map(type => {
                const skill   = skills.find(s => s.type === type)
                const checked = !!skill
                return (
                  <div key={type} className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer w-28 shrink-0">
                      <input type="checkbox" checked={checked}
                        onChange={() => toggleSkill(type)}
                        className="w-4 h-4 rounded accent-green-700"
                      />
                      <span className={`text-sm font-medium ${checked ? 'text-gray-800' : 'text-gray-400'}`}>
                        {type}
                      </span>
                    </label>
                    {checked && (
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4].map(lvl => (
                          <button key={lvl} onClick={() => setSkillLevel(type, lvl)}
                            title={SKILL_LABELS[lvl]}
                            className={`w-8 h-8 rounded-lg text-xs font-bold border transition-colors ${
                              skill.level === lvl
                                ? `${LEVEL_DOT[lvl]} text-white border-transparent`
                                : 'border-gray-200 text-gray-400 hover:border-gray-400'
                            }`}>
                            {lvl}
                          </button>
                        ))}
                        <span className="text-xs text-gray-400 self-center ml-1">
                          {SKILL_LABELS[skill.level]}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="input text-sm resize-none w-full"
              rows={2}
              placeholder="Optional notes about this crew…"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-2 flex-shrink-0">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 btn-primary text-sm py-2 disabled:opacity-50">
            {saving ? 'Saving…' : (isNew ? 'Create Crew' : 'Save Changes')}
          </button>
          <button onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          {!isNew && onDelete && (
            <button onClick={() => onDelete(crew)}
              className="px-4 py-2 text-sm rounded-lg border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors">
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Sub Crew Modal (standalone — not linked to subs_vendors) ─────────────────
function SubCrewModal({ sub, onClose, onSave, onDelete }) {
  const isNew = !sub?.id
  const [name,      setName]      = useState(sub?.name      || '')
  const [divisions, setDivisions] = useState((sub?.divisions || []).join(', '))
  const [rating,    setRating]    = useState(sub?.rating     ?? 5)
  const [notes,     setNotes]     = useState(sub?.notes      || '')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  async function handleSave() {
    if (!name.trim()) { setError('Company name is required.'); return }
    setSaving(true); setError('')
    const divArr = divisions.split(',').map(d => d.trim()).filter(Boolean)
    const payload = { name: name.trim(), divisions: divArr, rating: +rating, notes: notes.trim() }
    const { error: err } = isNew
      ? await supabase.from('master_sub_crews').insert(payload)
      : await supabase.from('master_sub_crews').update(payload).eq('id', sub.id)
    setSaving(false)
    if (err) { setError(err.message); return }
    onSave()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
         onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col"
           style={{ maxHeight: '88vh' }}>
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">
              {isNew ? 'Add Subcontractor' : 'Edit Subcontractor'}
            </p>
            <h2 className="text-lg font-bold text-gray-900">{isNew ? 'New Sub Crew' : name}</h2>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Company Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Acme Masonry" className="input text-sm w-full" autoFocus />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Divisions / Trades <span className="font-normal normal-case text-gray-400">(comma-separated)</span>
            </label>
            <input type="text" value={divisions} onChange={e => setDivisions(e.target.value)}
              placeholder="e.g. Masonry, Concrete, Tile" className="input text-sm w-full" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Sub Rating: <span className="text-green-700 font-bold">{rating} / 10</span>
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <button key={n} onClick={() => setRating(n)}
                  className={`w-9 h-9 rounded-lg text-sm font-bold border-2 transition-colors ${
                    rating === n
                      ? n >= 8 ? 'bg-green-600 text-white border-green-600'
                        : n >= 5 ? 'bg-yellow-500 text-white border-yellow-500'
                        : 'bg-red-500 text-white border-red-500'
                      : 'border-gray-200 text-gray-500 hover:border-gray-400'
                  }`}>
                  {n}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">10 = highest · 1 = lowest</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              className="input text-sm resize-none w-full" rows={3}
              placeholder="Optional notes…" />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-2 flex-shrink-0">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 btn-primary text-sm py-2 disabled:opacity-50">
            {saving ? 'Saving…' : isNew ? 'Add Sub' : 'Save Changes'}
          </button>
          <button onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          {!isNew && onDelete && (
            <button onClick={() => onDelete(sub)}
              className="px-4 py-2 text-sm rounded-lg border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors">
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Crew Table Row ────────────────────────────────────────────────────────────
function CrewRow({ crew, employees, onClick }) {
  const empById  = id => employees.find(e => e.id === id)
  const empShort = id => { const e = empById(id); return e ? `${e.first_name} ${e.last_name}` : '—' }

  return (
    <tr onClick={onClick}
      className="hover:bg-green-50 cursor-pointer transition-colors border-b border-gray-100">
      {/* Label */}
      <td className="px-4 py-3 w-16">
        <div className="w-9 h-9 rounded-lg bg-green-700 text-white flex items-center justify-center text-sm font-bold">
          {crew.label}
        </div>
      </td>
      {/* Chief */}
      <td className="px-4 py-3 text-sm font-medium text-green-700 hover:underline whitespace-nowrap">
        {empById(crew.crew_chief_id) ? empShort(crew.crew_chief_id) : <span className="text-gray-300 italic font-normal">None</span>}
      </td>
      {/* Journeyman */}
      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
        {crew.journeyman_id ? empShort(crew.journeyman_id) : <span className="text-gray-300">—</span>}
      </td>
      {/* Laborers */}
      {[crew.laborer_1_id, crew.laborer_2_id, crew.laborer_3_id].map((id, i) => (
        <td key={i} className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
          {id ? empShort(id) : <span className="text-gray-300">—</span>}
        </td>
      ))}
      {/* Skill columns */}
      {SKILL_TYPES.map(type => {
        const skill = (crew.skills || []).find(s => s.type === type)
        return (
          <td key={type} className="px-4 py-3 text-center">
            {skill ? (
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${SKILL_COLORS[type]}`}>
                <span className={`w-2 h-2 rounded-full ${LEVEL_DOT[skill.level]}`} />
                Lv{skill.level}
              </span>
            ) : (
              <span className="text-gray-200 text-xs">—</span>
            )}
          </td>
        )
      })}
    </tr>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MasterCrews() {
  const [tab,        setTab]        = useState('internal') // 'internal' | 'sub'
  const [crews,      setCrews]      = useState([])
  const [employees,  setEmployees]  = useState([])
  const [subCrews,   setSubCrews]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(null)     // null | 'new' | crew object
  const [subModal,   setSubModal]   = useState(null)     // null | 'new' | sub object
  const [subSearch,  setSubSearch]  = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    await Promise.all([
      supabase.from('crews').select('*').order('label')
        .then(({ data }) => { if (data) setCrews(data) }),
      supabase.from('employees').select('id, first_name, last_name, job_title')
        .eq('status', 'active').order('last_name')
        .then(({ data }) => { if (data) setEmployees(data) }),
      supabase.from('master_sub_crews').select('*').order('name')
        .then(({ data }) => { if (data) setSubCrews(data) }),
    ])
    setLoading(false)
  }

  function handleCrewSaved() { setModal(null); loadAll() }
  function handleSubSaved()  { setSubModal(null); loadAll() }

  async function handleDeleteSub(sub) {
    if (!confirm(`Delete ${sub.name}? This cannot be undone.`)) return
    await supabase.from('master_sub_crews').delete().eq('id', sub.id)
    setSubCrews(prev => prev.filter(s => s.id !== sub.id))
    setSubModal(null)
  }

  const usedLabels  = crews.map(c => c.label)
  const sortedCrews = [...crews].sort((a, b) => a.label.localeCompare(b.label))

  const filteredSubs = subCrews.filter(s =>
    !subSearch ||
    s.name?.toLowerCase().includes(subSearch.toLowerCase()) ||
    (s.divisions || []).some(d => d.toLowerCase().includes(subSearch.toLowerCase()))
  )

  const RATING_COLOR = r =>
    r >= 8 ? 'bg-green-100 text-green-800' :
    r >= 5 ? 'bg-yellow-100 text-yellow-800' :
             'bg-red-100 text-red-800'

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0 gap-3">
        <h1 className="text-xl font-bold text-gray-900">Master Crews</h1>
        {tab === 'internal' && (
          <button onClick={() => setModal('new')} disabled={usedLabels.length >= 26}
            className="btn-primary text-sm px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
            + New Crew
          </button>
        )}
        {tab === 'sub' && (
          <button onClick={() => setSubModal('new')}
            className="btn-primary text-sm px-3 py-1.5">
            + Add Sub
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-200 mb-5 flex-shrink-0">
        {[
          { key: 'internal', label: `Internal Crews (${crews.length})` },
          { key: 'sub',      label: `Subcontractor Crews (${subCrews.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
        </div>
      ) : (

        <>
          {/* ── Internal Crews ── */}
          {tab === 'internal' && (
            <div className="flex-1 overflow-y-auto">
              {sortedCrews.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <p className="text-4xl mb-3">👷</p>
                  <p className="font-medium text-gray-500">No crews yet</p>
                  <p className="text-sm mt-1">Click + New Crew to build your first crew.</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        <th className="px-4 py-2.5 text-left w-16">Crew</th>
                        <th className="px-4 py-2.5 text-left">Crew Chief</th>
                        <th className="px-4 py-2.5 text-left">Journeyman</th>
                        <th className="px-4 py-2.5 text-left">Laborer 1</th>
                        <th className="px-4 py-2.5 text-left">Laborer 2</th>
                        <th className="px-4 py-2.5 text-left">Laborer 3</th>
                        {SKILL_TYPES.map(t => (
                          <th key={t} className="px-4 py-2.5 text-center">{t}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedCrews.map(crew => (
                        <CrewRow
                          key={crew.id}
                          crew={crew}
                          employees={employees}
                          onClick={() => setModal(crew)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Subcontractor Crews ── */}
          {tab === 'sub' && (
            <div className="flex-1 overflow-y-auto">
              <div className="mb-4">
                <input type="text" value={subSearch} onChange={e => setSubSearch(e.target.value)}
                  placeholder="Search by company or division…"
                  className="input text-sm w-full max-w-xs" />
              </div>

              {filteredSubs.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-3xl mb-2">🔧</p>
                  <p className="text-sm">
                    {subCrews.length === 0
                      ? 'No subs yet. Click + Add Sub to get started.'
                      : 'No results match your search.'}
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        <th className="px-4 py-2.5 text-left">Company</th>
                        <th className="px-4 py-2.5 text-left">Divisions / Trade</th>
                        <th className="px-4 py-2.5 text-center">Rating</th>
                        <th className="px-4 py-2.5 text-left">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredSubs.map(sub => (
                        <tr key={sub.id} className="hover:bg-green-50 cursor-pointer transition-colors"
                          onClick={() => setSubModal(sub)}>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-green-700 hover:underline">
                              {sub.name}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {sub.divisions?.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {sub.divisions.map((d, i) => (
                                  <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{d}</span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-300 text-xs italic">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {sub.rating ? (
                              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${RATING_COLOR(sub.rating)}`}>
                                {sub.rating}/10
                              </span>
                            ) : <span className="text-gray-300 text-xs">—</span>}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">
                            {sub.notes || <span className="text-gray-300">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Crew Modal ── */}
      {modal && (
        <CrewModal
          crew={modal === 'new' ? null : modal}
          employees={employees}
          usedLabels={modal === 'new' ? usedLabels : usedLabels.filter(l => l !== modal?.label)}
          onClose={() => setModal(null)}
          onSave={handleCrewSaved}
          onDelete={async crew => {
            if (!confirm(`Delete Crew ${crew.label}? This cannot be undone.`)) return
            await supabase.from('crews').delete().eq('id', crew.id)
            setCrews(prev => prev.filter(c => c.id !== crew.id))
            setModal(null)
          }}
        />
      )}

      {subModal && (
        <SubCrewModal
          sub={subModal === 'new' ? null : subModal}
          onClose={() => setSubModal(null)}
          onSave={handleSubSaved}
          onDelete={handleDeleteSub}
        />
      )}
    </div>
  )
}
