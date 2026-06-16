// src/pages/Customize.jsx
// Per-module background customization. Pick a background image for each app
// section (Dashboard, Documents, Contacts, Design, Jobs, …); it replaces the
// grey background on that module's pages. Saved per-user (synced across
// devices) and cached in localStorage so the Layout can apply it per route.
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  BACKGROUNDS,
  CUSTOMIZE_MODULES,
  MODULE_BG_LS_KEY,
  readModuleBackgrounds,
} from '../lib/dashboardBackgrounds'

export default function Customize() {
  const { user } = useAuth()
  const [map, setMap] = useState(() => readModuleBackgrounds())
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  function pick(moduleKey, bgId) {
    setMap(m => ({ ...m, [moduleKey]: bgId }))
    setSavedMsg('')
  }

  async function handleSave() {
    setSaving(true)
    // Cache + broadcast so the Layout re-applies immediately, then persist.
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
      const hint = /module_backgrounds/.test(errMsg)
        ? ' (run supabase-update-106.sql)'
        : ''
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

      <p className="text-sm text-gray-500 mb-5">
        Choose a background for each module. It replaces the grey behind that section's pages.
      </p>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-6 pb-6">
        {CUSTOMIZE_MODULES.map(mod => {
          const current = map[mod.key] || 'none'
          return (
            <div key={mod.key}>
              <h3 className="text-sm font-bold text-gray-800 mb-2">{mod.label}</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {BACKGROUNDS.map(bg => {
                  const selected = current === bg.id
                  return (
                    <button
                      key={bg.id}
                      onClick={() => pick(mod.key, bg.id)}
                      className={`text-left rounded-lg overflow-hidden border-2 transition-all ${
                        selected
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
                        <span className="text-[11px] font-medium text-gray-600 truncate">
                          {bg.label}
                        </span>
                        {selected && <span className="text-green-600 text-xs">✓</span>}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
