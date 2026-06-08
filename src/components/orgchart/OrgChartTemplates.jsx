// Org-chart template library UI: the New Chart modal (scratch vs template),
// the chart-name edit menu (rename / create template / delete), the rename and
// create-template modals, and the admin Settings modal (templates table +
// categories management). All logic (DB reads/writes, instantiation, position
// sync) lives in OrgChartV2; these components are presentational and call back.

import { useState, useEffect, useRef } from 'react'

const FG = '#16491b'

function groupByCategory(templates, categories) {
  const catName = id => categories.find(c => c.id === id)?.name || 'Uncategorized'
  const map = new Map()
  for (const t of templates) {
    const key = t.category_id ?? 'none'
    if (!map.has(key)) map.set(key, { name: catName(t.category_id), items: [] })
    map.get(key).items.push(t)
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
}

// ── New Chart modal ──────────────────────────────────────────────────────────
export function NewChartModal({ templates, categories, subcategories, onClose, onCreate }) {
  const [name, setName] = useState('')
  const [source, setSource] = useState('scratch')
  const [templateId, setTemplateId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [subcategoryId, setSubcategoryId] = useState('')
  const groups = groupByCategory(templates || [], categories || [])
  const subsForCategory = categoryId
    ? (subcategories || []).filter(s => String(s.category_id) === String(categoryId))
    : []

  const submit = () => {
    if (!name.trim()) return
    if (source === 'template' && !templateId) return
    const template =
      source === 'template' ? (templates || []).find(t => String(t.id) === String(templateId)) : null
    onCreate({
      name: name.trim(),
      source,
      template,
      categoryId: categoryId ? Number(categoryId) : null,
      subcategoryId: subcategoryId ? Number(subcategoryId) : null,
    })
  }

  return (
    <Backdrop onClose={onClose}>
      <Panel className="max-w-5xl min-h-[80vh]">
        <Header title="New Org Chart" onClose={onClose} />
        <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1 min-h-0">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">
              Chart Name
            </label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Operations 2026"
              className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">
              Start From
            </label>
            <div className="flex gap-2">
              {[
                ['scratch', 'Blank chart', 'Start with an empty chart and build every item yourself.'],
                ['template', 'A template', "Start from one of your saved templates, pre-filled with its structure."],
                [
                  'wizard',
                  'Org Chart Wizard',
                  "Answer a few guided questions (with Sam's suggestions) and the wizard builds your starting chart.",
                ],
              ].map(([v, lab]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setSource(v)}
                  className={`flex-1 py-1.5 rounded-md border text-sm uppercase ${
                    source === v
                      ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {lab}
                </button>
              ))}
            </div>
            {/* Description of the currently selected "start from" option. */}
            <p className="mt-4 text-sm text-slate-800 leading-snug">
              {
                {
                  scratch: 'Start with an empty chart and build every item yourself.',
                  template:
                    'Start from one of your saved templates, pre-filled with its structure.',
                  wizard:
                    "Answer a few guided questions (with Sam's suggestions) and the wizard builds your starting chart.",
                }[source]
              }
            </p>
          </div>
          {source !== 'wizard' && (categories || []).length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={e => {
                    setCategoryId(e.target.value)
                    setSubcategoryId('')
                  }}
                  className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm"
                >
                  <option value="">— None —</option>
                  {(categories || []).map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">
                  Subcategory
                </label>
                <select
                  value={subcategoryId}
                  onChange={e => setSubcategoryId(e.target.value)}
                  disabled={!categoryId || subsForCategory.length === 0}
                  className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">
                    {!categoryId
                      ? '— Pick a category first —'
                      : subsForCategory.length === 0
                        ? '— None available —'
                        : '— None —'}
                  </option>
                  {subsForCategory.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          {source === 'template' && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Choose a template
              </label>
              {groups.length === 0 ? (
                <p className="text-sm text-slate-400 italic">
                  No templates yet — create one from an existing chart's edit menu.
                </p>
              ) : (
                <div className="max-h-[48vh] overflow-y-auto border border-slate-200 rounded-md divide-y divide-slate-100">
                  {groups.map(g => (
                    <div key={g.name} className="py-1">
                      <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        {g.name}
                      </p>
                      {g.items.map(t => (
                        <label
                          key={t.id}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-slate-50 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="template"
                            checked={String(templateId) === String(t.id)}
                            onChange={() => setTemplateId(t.id)}
                            className="accent-blue-600"
                          />
                          {t.name}
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <Footer>
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm uppercase text-slate-600 hover:bg-slate-100 rounded-md">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!name.trim() || (source === 'template' && !templateId)}
            className="px-3 py-1.5 text-sm uppercase bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50"
          >
            Create
          </button>
        </Footer>
      </Panel>
    </Backdrop>
  )
}

// ── Rename Chart modal ───────────────────────────────────────────────────────
export function RenameChartModal({ initialName, onClose, onSave }) {
  const [name, setName] = useState(initialName || '')
  return (
    <Backdrop onClose={onClose}>
      <Panel className="max-w-sm">
        <Header title="Rename Chart" onClose={onClose} />
        <div className="px-5 py-4">
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && name.trim() && onSave(name.trim())}
            className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm"
          />
        </div>
        <Footer>
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-md">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => name.trim() && onSave(name.trim())}
            disabled={!name.trim()}
            className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50"
          >
            Save
          </button>
        </Footer>
      </Panel>
    </Backdrop>
  )
}

// ── Create Template modal ────────────────────────────────────────────────────
export function CreateTemplateModal({ categories, subcategories, onClose, onSave }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [subcategoryId, setSubcategoryId] = useState('')
  const [newSubcategory, setNewSubcategory] = useState('')
  const usingNew = categoryId === '__new__'
  const usingNewSub = subcategoryId === '__new__'
  // Subcategories available for the chosen (existing) category.
  const subsForCategory =
    !usingNew && categoryId
      ? (subcategories || []).filter(s => String(s.category_id) === String(categoryId))
      : []

  const submit = () => {
    if (!name.trim()) return
    const cat = usingNew ? newCategory.trim() : categoryId
    if (!cat) return
    onSave({
      name: name.trim(),
      description: description.trim() || null,
      categoryId: usingNew ? null : Number(categoryId),
      newCategoryName: usingNew ? newCategory.trim() : null,
      subcategoryId: usingNewSub || !subcategoryId ? null : Number(subcategoryId),
      newSubcategoryName: usingNewSub ? newSubcategory.trim() : null,
    })
  }

  return (
    <Backdrop onClose={onClose}>
      <Panel className="max-w-md">
        <Header title="Create Template" onClose={onClose} />
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Template name</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Standard Division Structure"
              className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="What this template is for…"
              className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm"
            >
              <option value="">— Select category —</option>
              {(categories || []).map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value="__new__">+ New category…</option>
            </select>
          </div>
          {usingNew && (
            <input
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              placeholder="New category name"
              className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm"
            />
          )}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Subcategory (optional)
            </label>
            <select
              value={subcategoryId}
              onChange={e => setSubcategoryId(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm"
            >
              <option value="">— None —</option>
              {subsForCategory.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
              <option value="__new__">+ New subcategory…</option>
            </select>
          </div>
          {usingNewSub && (
            <input
              value={newSubcategory}
              onChange={e => setNewSubcategory(e.target.value)}
              placeholder="New subcategory name"
              className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm"
            />
          )}
          <p className="text-[11px] text-amber-600 leading-snug">
            Employees are removed from templates — only positions and structure are kept.
          </p>
        </div>
        <Footer>
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-md">
            Cancel
          </button>
          <button type="button" onClick={submit} className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md">
            Save Template
          </button>
        </Footer>
      </Panel>
    </Backdrop>
  )
}

// ── Chart-name edit menu (rename / create template / delete) ─────────────────
export function ChartNameMenu({
  anchorRect,
  onClose,
  onRename,
  onRecategorize,
  onCreateTemplate,
  onDelete,
}) {
  const ref = useRef(null)
  const [pos, setPos] = useState({ top: anchorRect.bottom + 4, left: anchorRect.left })
  useEffect(() => {
    const reposition = () => {
      const w = 200
      let left = anchorRect.left
      if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8
      setPos({ top: anchorRect.bottom + 4, left: Math.max(8, left) })
    }
    reposition()
    const onDoc = e => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [anchorRect, onClose])

  return (
    <div
      ref={ref}
      className="fixed z-[1000] bg-white border border-slate-200 shadow-xl rounded-lg py-1 text-sm"
      style={{ top: pos.top, left: pos.left, width: 200 }}
    >
      <MenuRow label="Rename" onClick={onRename} />
      <MenuRow label="Recategorize" onClick={onRecategorize} />
      <MenuRow label="Create New Template" onClick={onCreateTemplate} />
      <div className="border-t border-slate-100 my-1" />
      <MenuRow label="Delete" onClick={onDelete} danger />
    </div>
  )
}

// ── Recategorize a chart (set its industry category / sub-sector) ────────────
export function RecategorizeChartModal({
  initialCategoryId,
  initialSubcategoryId,
  categories,
  subcategories,
  onClose,
  onSave,
}) {
  const [categoryId, setCategoryId] = useState(
    initialCategoryId != null ? String(initialCategoryId) : '',
  )
  const [subcategoryId, setSubcategoryId] = useState(
    initialSubcategoryId != null ? String(initialSubcategoryId) : '',
  )
  const subs = categoryId
    ? (subcategories || []).filter(s => String(s.category_id) === String(categoryId))
    : []

  return (
    <Backdrop onClose={onClose}>
      <Panel className="max-w-md">
        <Header title="Recategorize Chart" onClose={onClose} />
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
            <select
              value={categoryId}
              onChange={e => {
                setCategoryId(e.target.value)
                setSubcategoryId('')
              }}
              className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm"
            >
              <option value="">— None —</option>
              {(categories || []).map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Subcategory</label>
            <select
              value={subcategoryId}
              onChange={e => setSubcategoryId(e.target.value)}
              disabled={!categoryId || subs.length === 0}
              className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">— None —</option>
              {subs.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Footer>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-md"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() =>
              onSave({
                category_id: categoryId ? Number(categoryId) : null,
                subcategory_id: subcategoryId ? Number(subcategoryId) : null,
              })
            }
            className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md"
          >
            Save
          </button>
        </Footer>
      </Panel>
    </Backdrop>
  )
}

// ── Admin Settings: templates table + categories management ──────────────────
export function TemplatesSettingsView({
  templates,
  categories,
  subcategories,
  onClose,
  onDeleteTemplate,
  onUpdateTemplate,
  onAddCategory,
  onRenameCategory,
  onDeleteCategory,
  onAddSubcategory,
  onRenameSubcategory,
  onDeleteSubcategory,
}) {
  const [tab, setTab] = useState('templates')
  const [newCat, setNewCat] = useState('')
  const [selectedCatId, setSelectedCatId] = useState(null)
  const [newSub, setNewSub] = useState('')
  const [editingTemplate, setEditingTemplate] = useState(null)
  const catName = id => categories.find(c => c.id === id)?.name || '—'
  const subName = id => (subcategories || []).find(s => s.id === id)?.name || '—'
  const subsForSelected = (subcategories || []).filter(s => s.category_id === selectedCatId)

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex border-b border-gray-200 bg-white px-6 items-center justify-between flex-shrink-0">
        <div className="flex">
          {[
            ['templates', 'Templates'],
            ['categories', 'Categories & Subcategories'],
          ].map(([v, lab]) => (
            <button
              key={v}
              type="button"
              onClick={() => setTab(v)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === v
                  ? 'border-green-700 text-green-800'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {lab}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-gray-500 hover:text-gray-800 px-2"
        >
          ✕ Close
        </button>
      </div>

      <div className="bg-gray-50 px-6 py-6 flex-1 overflow-y-auto">
        <div className="bg-white border border-gray-200 rounded-xl p-5 max-w-4xl">
          {tab === 'templates' ? (
            (templates || []).length === 0 ? (
              <p className="text-sm text-slate-400 italic">No templates yet.</p>
            ) : (
              <table className="w-full text-sm border border-slate-200 rounded-md overflow-hidden">
                <thead>
                  <tr className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2 font-semibold">Name</th>
                    <th className="px-3 py-2 font-semibold">Description</th>
                    <th className="px-3 py-2 font-semibold">Category</th>
                    <th className="px-3 py-2 font-semibold">Subcategory</th>
                    <th className="px-3 py-2 font-semibold text-right w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {templates.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium text-slate-800">{t.name}</td>
                      <td className="px-3 py-2 text-slate-500 max-w-xs truncate" title={t.description || ''}>
                        {t.description || '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-600">{catName(t.category_id)}</td>
                      <td className="px-3 py-2 text-slate-600">{subName(t.subcategory_id)}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <button
                          type="button"
                          title="Edit"
                          onClick={() => setEditingTemplate(t)}
                          className="text-slate-500 hover:text-slate-800 mr-3"
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Delete template "${t.name}"?`)) onDeleteTemplate(t.id)
                          }}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            <div className="grid grid-cols-2 gap-5">
              {/* Left — categories (click to select and reveal its subcategories) */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
                  Categories
                </p>
                <div className="flex gap-2 mb-2">
                  <input
                    value={newCat}
                    onChange={e => setNewCat(e.target.value)}
                    placeholder="New category name"
                    className="flex-1 border border-slate-300 rounded-md px-2 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newCat.trim()) {
                        onAddCategory(newCat.trim())
                        setNewCat('')
                      }
                    }}
                    className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                  >
                    Add
                  </button>
                </div>
                {(categories || []).length === 0 ? (
                  <p className="text-sm text-slate-400 italic">No categories yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 border border-slate-200 rounded-md">
                    {categories.map(c => (
                      <li
                        key={c.id}
                        onClick={() => setSelectedCatId(c.id)}
                        className={`flex items-center justify-between px-3 py-1.5 text-sm cursor-pointer ${
                          selectedCatId === c.id ? 'bg-green-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <span className="flex-1 truncate text-slate-800">{c.name}</span>
                        <span className="flex items-center gap-2 flex-shrink-0">
                          <button
                            type="button"
                            title="Rename"
                            onClick={e => {
                              e.stopPropagation()
                              const n = prompt('Rename category', c.name)
                              if (n && n.trim()) onRenameCategory(c.id, n.trim())
                            }}
                            className="text-slate-400 hover:text-slate-700"
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation()
                              if (
                                confirm(
                                  `Delete category "${c.name}"? Its subcategories are removed and its templates become Uncategorized.`,
                                )
                              )
                                onDeleteCategory(c.id)
                            }}
                            className="text-red-500 hover:text-red-700 text-xs"
                          >
                            Delete
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Right — subcategories of the selected category */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
                  Subcategories
                  {selectedCatId
                    ? ` — ${categories.find(c => c.id === selectedCatId)?.name || ''}`
                    : ''}
                </p>
                {!selectedCatId ? (
                  <p className="text-sm text-slate-400 italic">
                    Select a category on the left to manage its subcategories.
                  </p>
                ) : (
                  <>
                    <div className="flex gap-2 mb-2">
                      <input
                        value={newSub}
                        onChange={e => setNewSub(e.target.value)}
                        placeholder="New subcategory name"
                        className="flex-1 border border-slate-300 rounded-md px-2 py-1.5 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newSub.trim()) {
                            onAddSubcategory(selectedCatId, newSub.trim())
                            setNewSub('')
                          }
                        }}
                        className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                      >
                        Add
                      </button>
                    </div>
                    {subsForSelected.length === 0 ? (
                      <p className="text-sm text-slate-400 italic">No subcategories yet.</p>
                    ) : (
                      <ul className="divide-y divide-slate-100 border border-slate-200 rounded-md">
                        {subsForSelected.map(s => (
                          <li
                            key={s.id}
                            className="flex items-center justify-between px-3 py-1.5 text-sm"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                const n = prompt('Rename subcategory', s.name)
                                if (n && n.trim()) onRenameSubcategory(s.id, n.trim())
                              }}
                              className="text-slate-800 hover:underline"
                              title="Click to rename"
                            >
                              {s.name}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Delete subcategory "${s.name}"?`))
                                  onDeleteSubcategory(s.id)
                              }}
                              className="text-red-500 hover:text-red-700 text-xs"
                            >
                              Delete
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {editingTemplate && (
        <TemplateEditModal
          template={editingTemplate}
          categories={categories}
          subcategories={subcategories}
          onClose={() => setEditingTemplate(null)}
          onSave={fields => {
            onUpdateTemplate(editingTemplate.id, fields)
            setEditingTemplate(null)
          }}
        />
      )}
    </div>
  )
}

// ── Template row edit modal (name / description / category / subcategory) ─────
function TemplateEditModal({ template, categories, subcategories, onClose, onSave }) {
  const [name, setName] = useState(template.name || '')
  const [description, setDescription] = useState(template.description || '')
  const [categoryId, setCategoryId] = useState(
    template.category_id != null ? String(template.category_id) : '',
  )
  const [subcategoryId, setSubcategoryId] = useState(
    template.subcategory_id != null ? String(template.subcategory_id) : '',
  )
  const subs = categoryId
    ? (subcategories || []).filter(s => String(s.category_id) === String(categoryId))
    : []

  return (
    <Backdrop onClose={onClose}>
      <Panel className="max-w-md">
        <Header title="Edit Template" onClose={onClose} />
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
            <select
              value={categoryId}
              onChange={e => {
                setCategoryId(e.target.value)
                setSubcategoryId('') // reset subcategory when category changes
              }}
              className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm"
            >
              <option value="">— Uncategorized —</option>
              {(categories || []).map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Subcategory</label>
            <select
              value={subcategoryId}
              onChange={e => setSubcategoryId(e.target.value)}
              disabled={!categoryId}
              className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">— None —</option>
              {subs.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Footer>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-md"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() =>
              name.trim() &&
              onSave({
                name: name.trim(),
                description: description.trim() || null,
                category_id: categoryId ? Number(categoryId) : null,
                subcategory_id: subcategoryId ? Number(subcategoryId) : null,
              })
            }
            className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md"
          >
            Save
          </button>
        </Footer>
      </Panel>
    </Backdrop>
  )
}

// ── Small shared building blocks ─────────────────────────────────────────────
function Backdrop({ onClose, children }) {
  // The panel is the DIRECT centered flex child (no extra wrapper), so its
  // `w-full max-w-*` actually resolves against the viewport — otherwise the
  // modal collapses to its content width and ignores the max-width.
  return (
    <div
      className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {children}
    </div>
  )
}
function Panel({ className = '', children }) {
  return (
    <div
      onClick={e => e.stopPropagation()}
      className={`bg-white rounded-2xl shadow-2xl w-full flex flex-col max-h-[90vh] overflow-hidden ${className}`}
    >
      {children}
    </div>
  )
}
function Header({ title, onClose }) {
  return (
    <div
      className="flex items-center justify-between px-5 py-3 flex-shrink-0"
      style={{ backgroundColor: FG }}
    >
      <h2 className="text-base font-bold text-white">{title}</h2>
      <button onClick={onClose} className="text-white/70 hover:text-white text-xl leading-none">
        ✕
      </button>
    </div>
  )
}
function Footer({ children }) {
  return (
    <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100 flex-shrink-0">
      {children}
    </div>
  )
}
function MenuRow({ label, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 ${
        danger ? 'text-red-600' : 'text-slate-700'
      }`}
    >
      {label}
    </button>
  )
}
