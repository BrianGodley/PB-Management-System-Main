// src/pages/Customize.jsx
// Customize app appearance:
//   • Pick a module (or "All") from the button row, then choose a background
//     image below — it replaces the grey on that module's pages. "All" applies
//     the chosen background to every module at once.
//   • Pick a color for the left menu bar (or Clear to keep it transparent).
// Saved per-user (synced across devices) + cached in localStorage so the
// Layout applies it per route / to the sidebar.
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  BACKGROUNDS,
  CUSTOMIZE_MODULES,
  MODULE_BG_LS_KEY,
  SIDEBAR_KEY,
  SIDEBAR_ICONS_KEY,
  SIDEBAR_FONT_KEY,
  SIDEBAR_FONTS,
  SIDEBAR_FONT_SIZES,
  sidebarFontStyle,
  HEADER_KEY,
  HEADER_DEFAULT,
  HEADER_ITEMS_KEY,
  readHeaderItems,
  MENU_POS_KEY,
  MENU_POSITIONS,
  MENU_GROUPS_KEY,
  MENU_ITEMS,
  buildMenuStructure,
  sidebarNavColor,
  CUSTOM_BG_KEY,
  readCustomBackgrounds,
  resolveBackground,
  readModuleBackgrounds,
} from '../lib/dashboardBackgrounds'
import { COLOR_LIBRARY } from '../lib/colorLibrary'

// Shared color picker for the Left Menu bar and the Header bar. Offers a
// "Clear" option (plus an optional "Default" for the header), then the full
// app color library (same swatches as Org Chart › Edit Area › Color).
function BarPalette({ value, onChange, includeDefault }) {
  const norm = (value || '').toLowerCase()
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4">
        <SpecialSwatch label="Clear" clear selected={value == null} onClick={() => onChange(null)} />
        {includeDefault && (
          <SpecialSwatch
            label="Default"
            color={HEADER_DEFAULT}
            selected={norm === HEADER_DEFAULT.toLowerCase()}
            onClick={() => onChange(HEADER_DEFAULT)}
          />
        )}
      </div>
      <div className="space-y-1.5">
        {COLOR_LIBRARY.map(fam => (
          <div key={fam.family} className="flex items-center gap-2">
            <span className="w-14 text-[10px] uppercase tracking-wide text-gray-500 font-medium flex-shrink-0">
              {fam.family}
            </span>
            <div className="flex gap-1 flex-wrap">
              {fam.shades.map(s => {
                const isSel = norm === s.hex.toLowerCase()
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onChange(s.hex)}
                    title={`${s.id} • ${s.hex}`}
                    style={{ backgroundColor: s.hex }}
                    className={`w-7 h-7 rounded-md border transition-transform hover:scale-110 ${
                      isSel ? 'border-black ring-2 ring-black' : 'border-gray-200'
                    }`}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SpecialSwatch({ label, color, selected, onClick, clear }) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-1">
      <span
        className={`w-10 h-10 rounded-full border flex items-center justify-center ${
          selected ? 'ring-2 ring-black border-black' : 'border-gray-300 hover:border-gray-400'
        }`}
        style={{ backgroundColor: color || '#ffffff' }}
      >
        {clear && <span className="text-[10px] text-gray-400">∅</span>}
      </span>
      <span className="text-[11px] text-gray-600">{label}</span>
    </button>
  )
}

// Emoji icons for the menu preview (mirror Layout's nav icons closely enough
// for a visual sample).
const PREVIEW_ICONS = {
  '/': '🏠', '/org-chart': '🏢', '/hr': '👥', '/training': '🎓',
  '/contacts': '📇', '/clients': '💡', '/edocuments': '📄', '/accounting': '🧮',
  '/collections': '💰', '/design': '📐', '/bids': '📋', '/jobs': '🏡',
  '/equipment-tracking': '🚜', '/portal/subs': '🧑‍🔧', '/statistics': '📈',
}
const PREVIEW_ITEMS = MENU_ITEMS.map(i => ({ ...i, icon: PREVIEW_ICONS[i.path] || '•' }))

// A compact, live sample of the menu. Reflects the chosen font, icon
// visibility, bar color, custom groups, and — when the bar is Clear — the
// user's current page background (so they see how Clear actually looks). All
// previews share one fixed width/height so they line up identically.
function MenuPreview({ font, showIcons, barColor, bgUrl, bgSwatch, bgDark, groups }) {
  const clear = !barColor
  const baseColor = clear ? (bgSwatch || '#eceef1') : barColor
  const textColor = clear
    ? (bgDark ? '#ffffff' : '#1f2937')
    : (sidebarNavColor(barColor).text || '#ffffff')
  const structure = buildMenuStructure(PREVIEW_ITEMS, groups || [])
  const Row = ({ item, indent }) => (
    <div className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 ${indent ? 'ml-3' : ''}`}>
      {showIcons && <span className="text-sm leading-none w-4 text-center">{item.icon}</span>}
      <span className="whitespace-nowrap" style={{ color: textColor, ...sidebarFontStyle(font) }}>{item.label}</span>
    </div>
  )
  return (
    <div
      className="rounded-md w-fit min-w-[11rem] border border-gray-200"
      style={{
        backgroundColor: baseColor,
        backgroundImage: clear && bgUrl ? `url(${bgUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="p-2">
        {structure.map(e =>
          e.type === 'single' ? (
            <Row key={e.item.path} item={e.item} />
          ) : (
            <div key={e.id} className="mb-0.5">
              <div className="flex items-center gap-1 px-2.5 py-1.5">
                <span className="text-[10px] opacity-60" style={{ color: textColor }}>▾</span>
                <span className="font-bold text-[11px] uppercase tracking-wide" style={{ color: textColor }}>
                  {e.label}
                </span>
              </div>
              {e.items.map(it => <Row key={it.path} item={it} indent />)}
            </div>
          )
        )}
      </div>
    </div>
  )
}

// A small layout diagram showing where the menu sits for a given position:
// a vertical bar for Left/Right, a horizontal bar for Top/Bottom.
function LocationDiagram({ pos, selected }) {
  const content = <div className="flex-1 bg-gray-200 rounded-sm" />
  const vertical = pos === 'left' || pos === 'right'
  return (
    <div
      className={`w-full h-16 rounded-md p-1 flex gap-1 ${
        vertical ? 'flex-row' : 'flex-col'
      } ${selected ? 'bg-green-50' : 'bg-gray-100'}`}
    >
      {pos === 'left' && <div className="w-1/4 bg-green-600 rounded-sm" />}
      {pos === 'top' && <div className="h-1/4 bg-green-600 rounded-sm" />}
      {content}
      {pos === 'right' && <div className="w-1/4 bg-green-600 rounded-sm" />}
      {pos === 'bottom' && <div className="h-1/4 bg-green-600 rounded-sm" />}
    </div>
  )
}

// Background picker sections (ordered). Any preset not listed falls into a
// final "Other" group so nothing ever disappears.
const BG_SECTIONS = [
  {
    title: 'Colorized',
    ids: ['none', 'waves-blue', 'green', 'sunset', 'aurora', 'lavender', 'peach', 'sky', 'mint', 'sunrise', 'rose-gold', 'slate', 'ocean', 'midnight', 'carbon', 'plum', 'emerald-night'],
  },
  {
    title: 'Patterns',
    ids: ['mesh', 'graphite-grid', 'dots', 'crosshatch', 'sand-topo', 'honeycomb', 'chevron', 'triangles', 'diagonal-stripes', 'plus-grid', 'waves-soft'],
  },
  {
    title: 'Multi Colored',
    ids: ['rainbow-pastel', 'holographic', 'cotton-candy', 'citrus', 'prism'],
  },
  {
    title: 'Interest Items',
    ids: ['mountains', 'beach', 'desert', 'tropical-sea', 'balloons', 'cityscape', 'townscape', 'meadow'],
  },
]

export default function Customize() {
  const { user } = useAuth()
  const [map, setMap] = useState(() => readModuleBackgrounds())
  const [selected, setSelected] = useState('all') // 'all' | module route key
  const [saving, setSaving] = useState(false)
  const [uploadingBg, setUploadingBg] = useState(false)
  // Background being previewed in the large pop-up (with Apply / Close).
  const [bgPreview, setBgPreview] = useState(null)
  const [savedMsg, setSavedMsg] = useState('')
  const [tab, setTab] = useState('backgrounds') // 'backgrounds' | 'menu'

  const selectedLabel =
    selected === 'all'
      ? 'All modules'
      : CUSTOMIZE_MODULES.find(m => m.key === selected)?.label || selected
  // For "All", reflect the background only if every module shares the same one
  // — that way the applied tile shows its black border + check mark.
  const currentBg =
    selected === 'all'
      ? (() => {
          const vals = CUSTOMIZE_MODULES.map(m => map[m.key] || 'none')
          const first = vals[0]
          return vals.every(v => v === first) ? first : null
        })()
      : map[selected] || 'none'
  const currentSidebar = map[SIDEBAR_KEY] ?? null
  // Undefined (never set) → default green; explicit null → Clear.
  const currentHeader = map[HEADER_KEY] !== undefined ? map[HEADER_KEY] : HEADER_DEFAULT
  const headerItems = readHeaderItems(map)
  const showIcons = map[SIDEBAR_ICONS_KEY] !== false
  const font = map[SIDEBAR_FONT_KEY] || {}
  const menuPos = map[MENU_POS_KEY] || 'left'
  const menuGroups = map[MENU_GROUPS_KEY] || []
  const byPath = Object.fromEntries(MENU_ITEMS.map(i => [i.path, i]))
  const groupNameByPath = {}
  menuGroups.forEach(g => (g.items || []).forEach(p => { groupNameByPath[p] = g.name }))

  // User-uploaded photo backgrounds (resolved like presets).
  const customBgs = readCustomBackgrounds(map)
  // When the menu bar is Clear, previews show the user's current page
  // background so they see how Clear actually looks.
  const previewBg = resolveBackground(currentBg || 'none', map) || BACKGROUNDS[0]
  // Shared props so every preview is identical and reflects every change.
  const previewProps = {
    font,
    showIcons,
    barColor: currentSidebar,
    bgUrl: previewBg.url,
    bgSwatch: previewBg.swatch,
    bgDark: previewBg.dark,
    groups: menuGroups,
  }

  function pickBackground(bgId) {
    setMap(m => {
      if (selected === 'all') {
        const next = { ...m }
        CUSTOMIZE_MODULES.forEach(mod => {
          next[mod.key] = bgId
        })
        return next
      }
      return { ...m, [selected]: bgId }
    })
    setSavedMsg('')
  }

  // Upload a photo to the public bucket, register it as a custom background,
  // and select it for the current target. Persisted when the user clicks Save.
  async function addCustomBackground(file) {
    if (!file || !user?.id) return
    setUploadingBg(true)
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `backgrounds/${user.id}/${Date.now()}-${safe}`
      const { error } = await supabase.storage
        .from('company-assets')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (error) throw error
      const { data } = supabase.storage.from('company-assets').getPublicUrl(path)
      const url = data?.publicUrl
      const id = 'custom-' + Date.now()
      const label = (file.name.replace(/\.[^.]+$/, '') || 'Photo').slice(0, 40)
      setMap(m => {
        const list = Array.isArray(m[CUSTOM_BG_KEY]) ? m[CUSTOM_BG_KEY] : []
        return { ...m, [CUSTOM_BG_KEY]: [...list, { id, label, url, storage_path: path }] }
      })
      setSavedMsg('')
      // Show the big preview so the user can Apply (or just close).
      setBgPreview({ id, label, url })
    } catch (e) {
      setSavedMsg('Upload failed: ' + (e?.message || 'unknown error'))
    } finally {
      setUploadingBg(false)
    }
  }

  function removeCustomBackground(id) {
    const item = customBgs.find(b => b.id === id)
    if (item?.storage_path) {
      supabase.storage.from('company-assets').remove([item.storage_path]).then(() => {}, () => {})
    }
    setMap(m => {
      const list = (Array.isArray(m[CUSTOM_BG_KEY]) ? m[CUSTOM_BG_KEY] : []).filter(b => b.id !== id)
      const next = { ...m, [CUSTOM_BG_KEY]: list }
      CUSTOMIZE_MODULES.forEach(mod => { if (next[mod.key] === id) next[mod.key] = 'none' })
      return next
    })
    setSavedMsg('')
  }

  function pickSidebar(value) {
    setMap(m => ({ ...m, [SIDEBAR_KEY]: value }))
    setSavedMsg('')
  }

  function pickHeader(value) {
    setMap(m => ({ ...m, [HEADER_KEY]: value }))
    setSavedMsg('')
  }

  function setHeaderItem(patch) {
    setMap(m => ({ ...m, [HEADER_ITEMS_KEY]: { ...readHeaderItems(m), ...patch } }))
    setSavedMsg('')
  }

  function setIcons(show) {
    setMap(m => ({ ...m, [SIDEBAR_ICONS_KEY]: show }))
    setSavedMsg('')
  }

  function setMenuPos(pos) {
    setMap(m => ({ ...m, [MENU_POS_KEY]: pos }))
    setSavedMsg('')
  }

  function setFont(patch) {
    setMap(m => ({ ...m, [SIDEBAR_FONT_KEY]: { ...(m[SIDEBAR_FONT_KEY] || {}), ...patch } }))
    setSavedMsg('')
  }

  // ── Menu grouping helpers ──
  function setGroups(updater) {
    setMap(m => ({ ...m, [MENU_GROUPS_KEY]: updater(m[MENU_GROUPS_KEY] || []) }))
    setSavedMsg('')
  }
  function addGroup() {
    const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'g' + Date.now()
    setGroups(gs => [...gs, { id, name: 'New Group', items: [] }])
  }
  function renameGroup(id, name) {
    setGroups(gs => gs.map(g => (g.id === id ? { ...g, name } : g)))
  }
  function deleteGroup(id) {
    setGroups(gs => gs.filter(g => g.id !== id))
  }
  // Add a menu item to a group, removing it from any other group first
  // (an item lives in at most one group).
  function addItemToGroup(id, path) {
    setGroups(gs =>
      gs.map(g => {
        const cleaned = { ...g, items: (g.items || []).filter(p => p !== path) }
        return cleaned.id === id ? { ...cleaned, items: [...cleaned.items, path] } : cleaned
      })
    )
  }
  function removeItemFromGroup(id, path) {
    setGroups(gs => gs.map(g => (g.id === id ? { ...g, items: (g.items || []).filter(p => p !== path) } : g)))
  }

  async function handleSave() {
    setSaving(true)
    try {
      localStorage.setItem(MODULE_BG_LS_KEY, JSON.stringify(map))
      window.dispatchEvent(new Event('module-backgrounds-updated'))
    } catch {
      /* ignore */
    }
    let ok = true
    let errMsg = ''
    if (user?.id) {
      const { error } = await supabase
        .from('dashboard_preferences')
        .upsert(
          { user_id: user.id, module_backgrounds: map, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        )
      ok = !error
      errMsg = error?.message || ''
    }
    setSaving(false)
    if (ok) {
      setSavedMsg('✓ Saved — applied across your devices.')
      setTimeout(() => setSavedMsg(''), 4000)
    } else {
      const hint = /module_backgrounds/.test(errMsg) ? ' (run supabase-update-106.sql)' : ''
      setSavedMsg(`Could not save: ${errMsg || 'unknown error'}${hint}`)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-end mb-3 flex-shrink-0 gap-3">
        <div className="flex items-center gap-3">
          {savedMsg && <span className="text-sm text-green-700 font-medium">{savedMsg}</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-green-700 text-white text-sm font-semibold px-6 py-2 rounded-lg hover:bg-green-800 disabled:opacity-50"
          >
            {saving ? 'Saving…' : '💾 Save'}
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex justify-center bg-white border border-gray-200 rounded-xl mb-4 flex-shrink-0 overflow-hidden">
        {[
          { id: 'backgrounds', label: 'Backgrounds' },
          { id: 'menu', label: 'Menu' },
          { id: 'header', label: 'Header Bar' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-6 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              tab === t.id
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pb-8">
        {tab === 'backgrounds' && (
        <>
        {/* ── My Image Backgrounds (uploaded photos) ── */}
        <h2 className="text-lg font-bold text-gray-900 mb-1">My Image Backgrounds</h2>
        <p className="text-sm text-gray-500 mb-3">
          Upload your own photo (forest, beach, city, space — anything) to use as a background for the
          selected module. Landscape images around 1600×1000 or larger look best.
        </p>
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-8">
          <label className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
            uploadingBg ? 'opacity-60 pointer-events-none border-gray-300' : 'border-green-300 text-green-700 hover:bg-green-50'
          }`}>
            {uploadingBg ? 'Uploading…' : '⬆️ Upload a photo'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) addCustomBackground(f) }}
            />
          </label>
        </div>

        {/* ── Module backgrounds ── */}
        <h2 className="text-lg font-bold text-gray-900 mb-1">Module Backgrounds</h2>
        <p className="text-sm text-gray-500 mb-3">
          Pick a module (or <strong>All</strong>), then choose its background below.
        </p>

        {/* Module buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[{ key: 'all', label: '🌐 All modules' }, ...CUSTOMIZE_MODULES].map(mod => {
            const isSel = selected === mod.key
            return (
              <button
                key={mod.key}
                onClick={() => setSelected(mod.key)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                  isSel
                    ? 'bg-green-700 text-white border-2 border-black'
                    : 'bg-white text-gray-700 border border-gray-300 hover:border-green-400'
                }`}
              >
                {isSel ? '✓ ' : ''}{mod.label}
              </button>
            )
          })}
        </div>

        {/* Background grid for the selected module */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-8">
          <p className="text-sm font-semibold text-gray-700 mb-3">
            {selected === 'all'
              ? 'Choose a background to apply to every module:'
              : `Background for ${selectedLabel}:`}
          </p>
          {(() => {
            const byId = Object.fromEntries(BACKGROUNDS.map(b => [b.id, b]))
            const claimed = new Set(BG_SECTIONS.flatMap(s => s.ids))
            const leftover = BACKGROUNDS.filter(b => !claimed.has(b.id))
            const sections = [
              ...BG_SECTIONS.map(s => ({ title: s.title, items: s.ids.map(id => byId[id]).filter(Boolean) })),
              ...(customBgs.length ? [{ title: 'Photos', items: customBgs }] : []),
              ...(leftover.length ? [{ title: 'Other', items: leftover }] : []),
            ]
            const Tile = bg => {
              const isSel = currentBg === bg.id
              return (
                <button
                  key={bg.id}
                  onClick={() => setBgPreview(bg)}
                  className={`text-left rounded-lg overflow-hidden border-2 transition-all ${
                    isSel ? 'border-black ring-2 ring-black/20' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {bg.url ? (
                    <img
                      src={bg.url}
                      alt={bg.label}
                      loading="lazy"
                      decoding="async"
                      className="h-14 w-full object-cover bg-gray-100"
                    />
                  ) : (
                    <div className="h-14 w-full" style={{ backgroundColor: bg.swatch }} />
                  )}
                  <div className="flex items-center justify-between px-2 py-1 bg-white">
                    <span className="text-[11px] font-medium text-gray-600 truncate">{bg.label}</span>
                    {isSel && <span className="text-black text-xs">✓</span>}
                  </div>
                </button>
              )
            }
            return sections.map(section =>
              section.items.length ? (
                <div key={section.title} className="mb-5 last:mb-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">{section.title}</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                    {section.items.map(Tile)}
                  </div>
                </div>
              ) : null
            )
          })()}
        </div>

        </>
        )}

        {tab === 'menu' && (
        <>
        {/* ── Menu location (desktop) ── */}
        <h2 className="text-lg font-bold text-gray-900 mb-1">Menu location</h2>
        <p className="text-sm text-gray-500 mb-3">
          Where the navigation menu sits on desktop. <strong>Top</strong> groups the menu into
          dropdowns in the header bar. (Mobile always uses the bottom dock.)
        </p>
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {MENU_POSITIONS.map(opt => {
            const isSel = menuPos === opt.id
            return (
              <button
                key={opt.id}
                onClick={() => setMenuPos(opt.id)}
                className={`flex flex-col gap-2 p-2 rounded-lg border transition-colors ${
                  isSel
                    ? 'border-2 border-black bg-green-50'
                    : 'border border-gray-300 hover:border-green-400'
                }`}
              >
                <LocationDiagram pos={opt.id} selected={isSel} />
                <span className="text-sm font-semibold text-gray-700">
                  {isSel ? '✓ ' : ''}{opt.label}
                </span>
              </button>
            )
          })}
        </div>

        {/* ── Menu item groups ── */}
        <h2 className="text-lg font-bold text-gray-900 mb-1">Menu Item Groups</h2>
        <p className="text-sm text-gray-500 mb-3">
          Create your own groups, name them, and move menu items underneath. Items you don't put in a
          group stay on their own. In the <strong>Top</strong> and <strong>Bottom</strong> menus, groups
          become dropdowns; in the <strong>Left</strong>/<strong>Right</strong> sidebar they open a
          pop-up menu.
        </p>
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
          <div className="grid md:grid-cols-2 gap-5">
            {/* editor */}
            <div className="space-y-3">
              {menuGroups.length === 0 && (
                <p className="text-sm text-gray-400">No groups yet — add one to start grouping menu items.</p>
              )}
              {menuGroups.map(g => (
                <div key={g.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      value={g.name}
                      onChange={e => renameGroup(g.id, e.target.value)}
                      placeholder="Group name"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600"
                    />
                    <button
                      onClick={() => deleteGroup(g.id)}
                      title="Delete group"
                      className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 text-lg leading-none"
                    >
                      ×
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(g.items || []).length === 0 && (
                      <span className="text-xs text-gray-400">No items yet</span>
                    )}
                    {(g.items || []).map(p => {
                      const it = byPath[p]
                      if (!it) return null
                      return (
                        <span
                          key={p}
                          className="inline-flex items-center gap-1 bg-green-50 text-green-800 border border-green-200 rounded-full pl-2.5 pr-1 py-0.5 text-xs"
                        >
                          {it.label}
                          <button
                            onClick={() => removeItemFromGroup(g.id, p)}
                            className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-green-200"
                            title="Remove"
                          >
                            ×
                          </button>
                        </span>
                      )
                    })}
                  </div>
                  <select
                    value=""
                    onChange={e => { if (e.target.value) addItemToGroup(g.id, e.target.value) }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600"
                  >
                    <option value="">+ Add item…</option>
                    {MENU_ITEMS.filter(i => !(g.items || []).includes(i.path)).map(i => {
                      const inOther = groupNameByPath[i.path]
                      return (
                        <option key={i.path} value={i.path}>
                          {i.label}{inOther ? ` (move from ${inOther})` : ''}
                        </option>
                      )
                    })}
                  </select>
                </div>
              ))}
              <button
                onClick={addGroup}
                className="text-sm font-semibold text-green-700 border border-green-300 rounded-lg px-4 py-2 hover:bg-green-50"
              >
                + Add group
              </button>
            </div>
            {/* preview */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1.5">Preview</p>
              <MenuPreview {...previewProps} />
              <p className="text-[11px] text-gray-400 mt-1.5">
                Ungrouped items appear on their own; groups show as sections here (pop-up menus in the
                sidebar, dropdowns in the Top/Bottom menus).
              </p>
            </div>
          </div>
        </div>

        {/* ── Menu font ── */}
        <h2 className="text-lg font-bold text-gray-900 mb-1">Menu font</h2>
        <p className="text-sm text-gray-500 mb-3">Change the menu text font, size, and style.</p>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="grid md:grid-cols-2 gap-5">
            {/* controls */}
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1.5">Font</p>
                <select
                  value={font.family || ''}
                  onChange={e => setFont({ family: e.target.value })}
                  className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600"
                  style={font.family ? { fontFamily: font.family } : undefined}
                >
                  {SIDEBAR_FONTS.map(f => (
                    <option key={f.id} value={f.value} style={f.value ? { fontFamily: f.value } : undefined}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1.5">Size</p>
                <div className="flex flex-wrap gap-2">
                  {SIDEBAR_FONT_SIZES.map(s => {
                    const isSel = (font.size || '') === s.value
                    return (
                      <button
                        key={s.id}
                        onClick={() => setFont({ size: s.value })}
                        className={`text-sm w-10 py-1.5 rounded-lg transition-colors ${
                          isSel
                            ? 'bg-green-700 text-white border-2 border-black'
                            : 'bg-white text-gray-700 border border-gray-300 hover:border-green-400'
                        }`}
                      >
                        {s.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1.5">Style</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFont({ bold: !font.bold })}
                    className={`w-10 py-1.5 rounded-lg font-bold transition-colors ${
                      font.bold
                        ? 'bg-green-700 text-white border-2 border-black'
                        : 'bg-white text-gray-700 border border-gray-300 hover:border-green-400'
                    }`}
                  >
                    B
                  </button>
                  <button
                    onClick={() => setFont({ italic: !font.italic })}
                    className={`w-10 py-1.5 rounded-lg italic transition-colors ${
                      font.italic
                        ? 'bg-green-700 text-white border-2 border-black'
                        : 'bg-white text-gray-700 border border-gray-300 hover:border-green-400'
                    }`}
                  >
                    I
                  </button>
                </div>
              </div>
            </div>

            {/* live sample — updates as the font/size/style change */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1.5">Preview</p>
              <MenuPreview {...previewProps} />
              <p className="text-[11px] text-gray-400 mt-1.5">Sample updates live as you change the font.</p>
            </div>
          </div>
        </div>

        {/* ── Left menu bar color ── */}
        <h2 className="text-lg font-bold text-gray-900 mt-6 mb-1">Menu Background</h2>
        <p className="text-sm text-gray-500 mb-3">
          Give the menu a background color, or <strong>Clear</strong> to let the page background show
          through.
        </p>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="grid md:grid-cols-2 gap-5">
            <BarPalette value={currentSidebar} onChange={pickSidebar} />
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1.5">Preview</p>
              <MenuPreview {...previewProps} />
            </div>
          </div>
        </div>

        {/* ── Menu icons ── */}
        <h2 className="text-lg font-bold text-gray-900 mt-6 mb-1">Menu icons</h2>
        <p className="text-sm text-gray-500 mb-3">
          Show or hide the icons next to each menu item. With icons off, the labels shift left.
        </p>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="grid md:grid-cols-2 gap-5">
            <div className="flex gap-2 h-fit">
              {[
                { id: true, label: 'Show icons' },
                { id: false, label: 'Hide icons' },
              ].map(opt => {
                const isSel = showIcons === opt.id
                return (
                  <button
                    key={String(opt.id)}
                    onClick={() => setIcons(opt.id)}
                    className={`text-sm font-semibold px-4 py-2 rounded-lg border transition-colors ${
                      isSel
                        ? 'bg-green-700 text-white border-2 border-black'
                        : 'bg-white text-gray-700 border border-gray-300 hover:border-green-400'
                    }`}
                  >
                    {isSel ? '✓ ' : ''}{opt.label}
                  </button>
                )
              })}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1.5">Preview</p>
              <MenuPreview {...previewProps} />
            </div>
          </div>
        </div>

        </>
        )}

        {tab === 'header' && (
        <>
        {/* ── Top header bar color ── */}
        <h2 className="text-lg font-bold text-gray-900 mb-1">Header bar</h2>
        <p className="text-sm text-gray-500 mb-3">
          Set the color of the top bar (logo, Sam, Customize). Pick <strong>Default (green)</strong>,
          <strong> Clear</strong> to let the page background show through, or another color. The
          header text auto-adjusts for readability.
        </p>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <BarPalette value={currentHeader} onChange={pickHeader} includeDefault />
        </div>

        {/* ── Header Bar Items ── */}
        <h2 className="text-lg font-bold text-gray-900 mt-6 mb-1">Header Bar Items</h2>
        <p className="text-sm text-gray-500 mb-3">
          Choose which items appear in the top bar, and which show as icon only.
        </p>
        <div className="bg-white border border-gray-200 rounded-xl p-4 divide-y divide-gray-100">
          {[
            { key: 'logo', label: 'Logo icon', desc: 'The company logo at the far left.' },
            { key: 'brand', label: 'System name', desc: 'The "Picture Build System" text.' },
            { key: 'sam', label: 'Sam (AI assistant)', desc: 'The Sam assistant button.' },
            { key: 'help', label: 'Help menu', desc: 'The 🛟 Help dropdown.' },
          ].map(row => (
            <div key={row.key} className="flex items-center justify-between gap-4 py-2.5 first:pt-0">
              <div>
                <p className="text-sm font-semibold text-gray-800">{row.label}</p>
                <p className="text-xs text-gray-500">{row.desc}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {[{ v: true, t: 'Shown' }, { v: false, t: 'Hidden' }].map(opt => (
                  <button
                    key={String(opt.v)}
                    onClick={() => setHeaderItem({ [row.key]: opt.v })}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                      headerItems[row.key] === opt.v
                        ? 'bg-green-700 text-white border-2 border-black'
                        : 'bg-white text-gray-700 border border-gray-300 hover:border-green-400'
                    }`}
                  >
                    {opt.t}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {[
            { key: 'adminIconOnly', label: 'Admin button', desc: 'Show the 🛡️ Admin button with or without its label.' },
            { key: 'profileIconOnly', label: 'Profile', desc: 'Show your avatar with or without your email.' },
          ].map(row => (
            <div key={row.key} className="flex items-center justify-between gap-4 py-2.5">
              <div>
                <p className="text-sm font-semibold text-gray-800">{row.label}</p>
                <p className="text-xs text-gray-500">{row.desc}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {[{ v: false, t: 'Icon + label' }, { v: true, t: 'Icon only' }].map(opt => (
                  <button
                    key={String(opt.v)}
                    onClick={() => setHeaderItem({ [row.key]: opt.v })}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                      headerItems[row.key] === opt.v
                        ? 'bg-green-700 text-white border-2 border-black'
                        : 'bg-white text-gray-700 border border-gray-300 hover:border-green-400'
                    }`}
                  >
                    {opt.t}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        </>
        )}
      </div>

      {/* Large background preview pop-up — appears when a tile is clicked. */}
      {bgPreview && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
          onClick={() => setBgPreview(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-[90vw] max-w-3xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div
              className="h-[60vh] w-full bg-gray-100"
              style={
                bgPreview.url
                  ? { backgroundImage: `url('${bgPreview.url}')`, backgroundSize: 'cover', backgroundPosition: 'center' }
                  : { backgroundColor: bgPreview.swatch || '#eceef1' }
              }
            />
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200">
              <span className="text-sm font-semibold text-gray-800 truncate">{bgPreview.label}</span>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => setBgPreview(null)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => { pickBackground(bgPreview.id); setBgPreview(null) }}
                  className="px-4 py-2 rounded-lg bg-green-700 text-white text-sm font-semibold hover:bg-green-800"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
