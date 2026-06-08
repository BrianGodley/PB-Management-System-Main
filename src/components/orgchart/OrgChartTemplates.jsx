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
export function NewChartModal({ templates, categories, onClose, onCreate }) {
  const [name, setName] = useState('')
  const [source, setSource] = useState('scratch')
  const [templateId, setTemplateId] = useState('')
  const groups = groupByCategory(templates || [], categories || [])

  const submit = () => {
    if (!name.trim()) return
    if (source === 'template' && !templateId) return
    const template =
      source === 'template' ? (templates || []).find(t => String(t.id) === String(templateId)) : null
    onCreate({ name: name.trim(), source, template })
  }

  return (
    <Backdrop onClose={onClose}>
      <Panel className="max-w-3xl">
        <Header title="New Org Chart" onClose={onClose} />
        <div className="px-6 py-5 space-y-5 overflow-y-auto">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Chart name</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Operations 2026"
              className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Start from</label>
            <div className="flex gap-2">
              {[
                ['scratch', 'Blank chart'],
                ['template', 'A template'],
              ].map(([v, lab]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setSource(v)}
                  className={`flex-1 py-1.5 rounded-md border text-sm ${
                    source === v
                      ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {lab}
                </button>
              ))}
            </div>
          </div>
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
                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-md divide-y divide-slate-100">
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
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-md">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!name.trim() || (source === 'template' && !templateId)}
            className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50"
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
export function CreateTemplateModal({ categories, onClose, onSave }) {
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const usingNew = categoryId === '__new__'

  const submit = () => {
    if (!name.trim()) return
    const cat = usingNew ? newCategory.trim() : categoryId
    if (!cat) return
    onSave({
      name: name.trim(),
      categoryId: usingNew ? null : Number(categoryId),
      newCategoryName: usingNew ? newCategory.trim() : null,
    })
  }

  return (
    <Backdrop onClose={onClose}>
      <Panel className="max-w-sm">
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
export function ChartNameMenu({ anchorRect, onClose, onRename, onCreateTemplate, onDelete }) {
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
      <MenuRow label="Create New Template" onClick={onCreateTemplate} />
      <div className="border-t border-slate-100 my-1" />
      <MenuRow label="Delete" onClick={onDelete} danger />
    </div>
  )
}

// ── Admin Settings: templates table + categories management ──────────────────
export function TemplatesSettingsView({
  templates,
  categories,
  onClose,
  onDeleteTemplate,
  onRenameTemplate,
  onChangeTemplateCategory,
  onAddCategory,
  onRenameCategory,
  onDeleteCategory,
}) {
  const [tab, setTab] = useState('templates')
  const [newCat, setNewCat] = useState('')
  const catName = id => categories.find(c => c.id === id)?.name || 'Uncategorized'

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex border-b border-gray-200 bg-white px-6 items-center justify-between flex-shrink-0">
        <div className="flex">
          {[
            ['templates', 'Templates'],
            ['categories', 'Categories'],
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
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400">
                    <th className="py-1 pr-2">Name</th>
                    <th className="py-1 pr-2">Category</th>
                    <th className="py-1 pr-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {templates.map(t => (
                    <tr key={t.id}>
                      <td className="py-1.5 pr-2">
                        <button
                          type="button"
                          onClick={() => {
                            const n = prompt('Rename template', t.name)
                            if (n && n.trim()) onRenameTemplate(t.id, n.trim())
                          }}
                          className="text-slate-800 hover:underline"
                          title="Click to rename"
                        >
                          {t.name}
                        </button>
                      </td>
                      <td className="py-1.5 pr-2">
                        <select
                          value={t.category_id ?? ''}
                          onChange={e =>
                            onChangeTemplateCategory(
                              t.id,
                              e.target.value === '' ? null : Number(e.target.value),
                            )
                          }
                          className="border border-slate-300 rounded-md px-1 py-0.5 text-xs"
                        >
                          <option value="">Uncategorized</option>
                          {categories.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1.5 pr-2 text-right">
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
            <div className="space-y-3">
              <div className="flex gap-2">
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
                    <li key={c.id} className="flex items-center justify-between px-3 py-1.5 text-sm">
                      <button
                        type="button"
                        onClick={() => {
                          const n = prompt('Rename category', c.name)
                          if (n && n.trim()) onRenameCategory(c.id, n.trim())
                        }}
                        className="text-slate-800 hover:underline"
                        title="Click to rename"
                      >
                        {c.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Delete category "${c.name}"? Templates in it become Uncategorized.`))
                            onDeleteCategory(c.id)
                        }}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Small shared building blocks ─────────────────────────────────────────────
function Backdrop({ onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  )
}
function Panel({ className = '', children }) {
  return (
    <div
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
