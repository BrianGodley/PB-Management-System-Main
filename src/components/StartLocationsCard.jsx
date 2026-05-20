// src/components/StartLocationsCard.jsx
//
// Manage saved start addresses for the Schedule Assistant route optimizer.
// Each entry is geocoded immediately on add via the geocode-address edge
// function so the optimizer can use lat/lon directly without a second
// round-trip.
//
// Used in two places:
//   - Admin > Company Settings
//   - Jobs > Settings > Start Locations
//
// Props:
//   currentUserIsAdmin (bool) — gates the add/delete controls (read-only otherwise)

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function StartLocationsCard({ currentUserIsAdmin = true }) {
  const [locations, setLocations] = useState([])
  const [defaultId, setDefaultId] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newAddr, setNewAddr] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('company_settings')
      .select('start_locations, default_start_location_id')
      .maybeSingle()
    setLocations(Array.isArray(data?.start_locations) ? data.start_locations : [])
    setDefaultId(data?.default_start_location_id || '')
    setLoading(false)
  }

  async function persist(nextLocations, nextDefaultId = defaultId) {
    const updates = {
      start_locations: nextLocations,
      default_start_location_id: nextDefaultId || null,
    }
    await supabase.from('company_settings').update(updates).not('id', 'is', null)
    setLocations(nextLocations)
    setDefaultId(nextDefaultId || '')
  }

  // Hit our small geocode-address edge function which calls Google for us
  // and never exposes the API key to the browser.
  async function geocode(address) {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/geocode-address`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address }),
    })
    const data = await res.json()
    if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`)
    return data
  }

  async function addLocation() {
    if (!newLabel.trim() || !newAddr.trim()) return
    setAdding(true)
    setMsg('')
    try {
      const geo = await geocode(newAddr.trim())
      const next = [
        ...locations,
        {
          id: crypto.randomUUID(),
          label: newLabel.trim(),
          address: newAddr.trim(),
          lat: geo.lat,
          lon: geo.lon,
        },
      ]
      // First entry becomes default automatically
      const newDefault = locations.length === 0 ? next[next.length - 1].id : defaultId
      await persist(next, newDefault)
      setNewLabel('')
      setNewAddr('')
    } catch (e) {
      setMsg('Could not geocode that address: ' + (e instanceof Error ? e.message : String(e)))
    }
    setAdding(false)
  }

  async function removeLocation(id) {
    if (!confirm('Remove this start location?')) return
    const next = locations.filter(l => l.id !== id)
    const newDefault = defaultId === id ? next[0]?.id || '' : defaultId
    await persist(next, newDefault)
  }

  async function setDefault(id) {
    await persist(locations, id)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-800 mb-1">📍 Schedule Assistant Start Locations</h3>
      <p className="text-sm text-gray-500 mb-4">
        Saved starting points for route optimization (e.g. Main Office, North Yard, a supervisor's
        home). The optimizer pre-selects the default but you can pick a different one each session.
      </p>

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-700" />
        </div>
      ) : (
        <>
          <div className="space-y-1.5 mb-4">
            {locations.length === 0 && (
              <p className="text-xs text-gray-400 italic">
                No start locations yet — add one below.
              </p>
            )}
            {locations.map(loc => (
              <div
                key={loc.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50"
              >
                <button
                  onClick={() => setDefault(loc.id)}
                  title={defaultId === loc.id ? 'Default start location' : 'Set as default'}
                  className={`flex-shrink-0 text-base ${defaultId === loc.id ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'}`}
                >
                  {defaultId === loc.id ? '★' : '☆'}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{loc.label}</p>
                  <p className="text-xs text-gray-500 truncate">{loc.address}</p>
                </div>
                <span className="text-[10px] font-mono text-gray-400 flex-shrink-0">
                  {loc.lat?.toFixed(3)}, {loc.lon?.toFixed(3)}
                </span>
                {currentUserIsAdmin && (
                  <button
                    onClick={() => removeLocation(loc.id)}
                    className="text-red-300 hover:text-red-600 text-xs px-1.5"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {currentUserIsAdmin && (
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  placeholder="Label (e.g. Main Office)"
                  className="input text-sm md:col-span-1"
                />
                <input
                  type="text"
                  value={newAddr}
                  onChange={e => setNewAddr(e.target.value)}
                  placeholder="Full address (street, city, state, zip)"
                  className="input text-sm md:col-span-2"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={addLocation}
                  disabled={adding || !newLabel.trim() || !newAddr.trim()}
                  className="text-sm px-4 py-2 rounded-lg bg-green-700 text-white font-semibold hover:bg-green-800 disabled:opacity-40"
                >
                  {adding ? 'Geocoding…' : 'Add location'}
                </button>
                {msg && <p className="text-xs text-red-600">{msg}</p>}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
