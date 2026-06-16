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
  HEADER_KEY,
  HEADER_DEFAULT,
  MENU_POS_KEY,
  MENU_POSITIONS,
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

export default function Customize() {
  const { user } = useAuth()
  const [map, setMap] = useState(() => readModuleBackgrounds())
  const [selected, setSelected] = useState('all') // 'all' | module route key
  const [saving, setSaving] = useState(false)
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
  const showIcons = map[SIDEBAR_ICONS_KEY] !== false
  const font = map[SIDEBAR_FONT_KEY] || {}
  const menuPos = map[MENU_POS_KEY] || 'left'

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

  function pickSidebar(value) {
    setMap(m => ({ ...m, [SIDEBAR_KEY]: value }))
    setSavedMsg('')
  }

  function pickHeader(value) {
    setMap(m => ({ ...m, [HEADER_KEY]: value }))
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
        {/* ── Module backgrounds ── */}
        <h2 className="text-lg font-bold text-gray-900 mb-1">Page backgrounds</h2>
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
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {BACKGROUNDS.map(bg => {
              const isSel = currentBg === bg.id
              return (
                <button
                  key={bg.id}
                  onClick={() => pickBackground(bg.id)}
                  className={`text-left rounded-lg overflow-hidden border-2 transition-all ${
                    isSel
                      ? 'border-black ring-2 ring-black/20'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div
                    className="h-14 w-full"
                    style={
                      bg.url
                        ? {
                            backgroundImage: `url('${bg.url}')`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }
                        : { backgroundColor: bg.swatch }
                    }
                  />
                  <div className="flex items-center justify-between px-2 py-1 bg-white">
                    <span className="text-[11px] font-medium text-gray-600 truncate">{bg.label}</span>
                    {isSel && <span className="text-black text-xs">✓</span>}
                  </div>
                </button>
              )
            })}
          </div>
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
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex flex-wrap gap-2">
          {MENU_POSITIONS.map(opt => {
            const isSel = menuPos === opt.id
            return (
              <button
                key={opt.id}
                onClick={() => setMenuPos(opt.id)}
                className={`text-sm font-semibold px-4 py-2 rounded-lg border transition-colors ${
                  isSel
                    ? 'bg-green-700 text-white border-2 border-black'
                    : 'bg-white text-gray-700 border border-gray-300 hover:border-green-400'
                }`}
              >
                {isSel ? '✓ ' : ''}{opt.icon} {opt.label}
              </button>
            )
          })}
        </div>

        {/* ── Left menu icons ── */}
        <h2 className="text-lg font-bold text-gray-900 mb-1">Menu icons</h2>
        <p className="text-sm text-gray-500 mb-3">
          Show or hide the icons next to each menu item. With icons off, the labels shift left.
        </p>
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex gap-2">
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

        {/* ── Menu font ── */}
        <h2 className="text-lg font-bold text-gray-900 mb-1">Menu font</h2>
        <p className="text-sm text-gray-500 mb-3">Change the menu text font, size, and style.</p>
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
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

        {/* ── Left menu bar color ── */}
        <h2 className="text-lg font-bold text-gray-900 mt-6 mb-1">Left menu bar</h2>
        <p className="text-sm text-gray-500 mb-3">
          Give the menu a background color, or <strong>Clear</strong> to let the page background show
          through.
        </p>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <BarPalette value={currentSidebar} onChange={pickSidebar} />
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
        </>
        )}
      </div>
    </div>
  )
}
