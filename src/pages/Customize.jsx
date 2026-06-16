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
  SIDEBAR_COLORS,
  readModuleBackgrounds,
} from '../lib/dashboardBackgrounds'

export default function Customize() {
  const { user } = useAuth()
  const [map, setMap] = useState(() => readModuleBackgrounds())
  const [selected, setSelected] = useState('all') // 'all' | module route key
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  const selectedLabel =
    selected === 'all'
      ? 'All modules'
      : CUSTOMIZE_MODULES.find(m => m.key === selected)?.label || selected
  const currentBg = selected === 'all' ? null : map[selected] || 'none'
  const currentSidebar = map[SIDEBAR_KEY] ?? null

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
      <div className="flex items-center justify-between mb-4 flex-shrink-0 gap-3">
        <h1 className="text-xl font-bold text-gray-900">Customize</h1>
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

      <div className="flex-1 min-h-0 overflow-y-auto pb-8">
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
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                  isSel
                    ? 'bg-green-700 text-white border-green-700'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
                }`}
              >
                {mod.label}
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
                      ? 'border-green-600 ring-2 ring-green-600/30'
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
                    {isSel && <span className="text-green-600 text-xs">✓</span>}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Left menu bar color ── */}
        <h2 className="text-lg font-bold text-gray-900 mb-1">Left menu bar</h2>
        <p className="text-sm text-gray-500 mb-3">
          Give the menu a background color, or <strong>Clear</strong> to let the page background show
          through.
        </p>
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3">
          {SIDEBAR_COLORS.map(c => {
            const isSel = (currentSidebar ?? null) === (c.value ?? null)
            return (
              <button
                key={c.id}
                onClick={() => pickSidebar(c.value)}
                className={`flex flex-col items-center gap-1 ${isSel ? '' : ''}`}
              >
                <span
                  className={`w-10 h-10 rounded-full border flex items-center justify-center ${
                    isSel
                      ? 'ring-2 ring-green-600 ring-offset-1 border-green-600'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: c.value || '#ffffff' }}
                >
                  {!c.value && <span className="text-[10px] text-gray-400">∅</span>}
                </span>
                <span className="text-[11px] text-gray-600">{c.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
