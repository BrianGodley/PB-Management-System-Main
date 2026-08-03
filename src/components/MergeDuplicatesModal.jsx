import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import { topCandidates, normalizeName } from '../lib/matchScore'

// ── Find & Merge Duplicate Materials ─────────────────────────────────────────
// Scans `material_rates` for near-duplicate rows (same product imported twice —
// e.g. a CATALOG row with a photo but no price, and a PRICE-SHEET row with a
// price but no photo). Fuzzy pre-filters candidate pairs client-side, asks Sam
// (reconcile-materials) to confirm, then merges each confirmed pair into one
// record via the merge_material_rates RPC.

const GREEN = '#3A5038'
const PAIR_SEND_CAP = 120 // cap items sent to Sam to control cost
const FUZZY_FLOOR = 0.6 // client pre-filter floor
const FUZZY_FALLBACK = 0.75 // fallback pair floor if Sam errors
const SAM_CONFIDENCE = 0.7 // keep Sam matches at/above this

// Stable key for a symmetric pair of ids (order-independent).
function pairKey(a, b) {
  return [a, b].sort().join('::')
}

function hasPhoto(row) {
  return !!(row && row.photo_url)
}
function hasPrice(row) {
  const v = row && row.unit_cost
  return v != null && v !== '' && parseFloat(v) > 0
}

// Decide which of two rows should survive a merge by default:
//   1) the one WITH a photo; 2) if tie, the one WITH a price; 3) else the first.
function defaultKeepId(rowA, rowB) {
  const aPhoto = hasPhoto(rowA)
  const bPhoto = hasPhoto(rowB)
  if (aPhoto !== bPhoto) return aPhoto ? rowA.id : rowB.id
  const aPrice = hasPrice(rowA)
  const bPrice = hasPrice(rowB)
  if (aPrice !== bPrice) return aPrice ? rowA.id : rowB.id
  return rowA.id
}

function priceText(row) {
  if (!hasPrice(row)) return '—'
  const n = parseFloat(row.unit_cost)
  if (!isFinite(n)) return '—'
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 4 })}`
}

function RowCol({ row, isKeep }) {
  if (!row) return null
  return (
    <div
      className={`flex-1 min-w-0 rounded-lg border p-2 ${
        isKeep ? 'border-green-500 bg-green-50/60' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="w-14 h-14 flex-shrink-0 rounded border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
          {hasPhoto(row) ? (
            <img src={row.photo_url} alt="" className="w-full h-full object-contain" />
          ) : (
            <span className="text-gray-300 text-[10px]">no photo</span>
          )}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-gray-900 truncate" title={row.name || ''}>
            {row.name || '—'}
          </div>
          <div className="text-[10px] text-gray-500 truncate">
            {[row.category, row.sub_category].filter(Boolean).join(' · ') || '—'}
          </div>
          <div className="text-[10px] text-gray-500">
            {row.unit || '—'} · <span className="font-medium text-gray-700">{priceText(row)}</span>
          </div>
        </div>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {hasPhoto(row) && (
          <span className="inline-block px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-medium">
            has photo
          </span>
        )}
        {hasPrice(row) && (
          <span className="inline-block px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-medium">
            has price
          </span>
        )}
        {isKeep && (
          <span
            className="inline-block px-1.5 py-0.5 rounded text-white text-[10px] font-semibold"
            style={{ backgroundColor: GREEN }}
          >
            keep
          </span>
        )}
      </div>
    </div>
  )
}

function PairCard({ pair, onMerged, onSkip }) {
  const { rowA, rowB, confidence, reason } = pair
  const [keepId, setKeepId] = useState(() => defaultKeepId(rowA, rowB))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const keepRow = keepId === rowA.id ? rowA : rowB
  const dropRow = keepId === rowA.id ? rowB : rowA

  async function doMerge() {
    setBusy(true)
    setError('')
    try {
      const { error: rpcErr } = await supabase.rpc('merge_material_rates', {
        keep: keepRow.id,
        drop: dropRow.id,
      })
      if (rpcErr) {
        setError(rpcErr.message || 'Merge failed')
        setBusy(false)
        return
      }
      onMerged?.(pair, keepRow.id, dropRow.id)
    } catch (e) {
      setError((e && e.message) || 'Merge failed')
      setBusy(false)
    }
  }

  const confPct = Math.round((Number(confidence) || 0) * 100)

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className="inline-block px-2 py-0.5 rounded-full text-white text-[10px] font-semibold"
            style={{ backgroundColor: GREEN }}
          >
            {confPct}% match
          </span>
          {reason && <span className="text-[11px] text-gray-500 truncate">{reason}</span>}
        </div>
      </div>

      <div className="flex items-stretch gap-2">
        <div className="flex-1 min-w-0">
          <label className="flex items-center gap-1.5 mb-1 cursor-pointer">
            <input
              type="radio"
              name={`keep-${rowA.id}-${rowB.id}`}
              checked={keepId === rowA.id}
              onChange={() => setKeepId(rowA.id)}
              disabled={busy}
              className="accent-green-700"
            />
            <span className="text-[10px] text-gray-500 uppercase font-semibold">Keep this</span>
          </label>
          <RowCol row={rowA} isKeep={keepId === rowA.id} />
        </div>
        <div className="flex items-center text-gray-300 text-lg font-semibold px-1">⇄</div>
        <div className="flex-1 min-w-0">
          <label className="flex items-center gap-1.5 mb-1 cursor-pointer">
            <input
              type="radio"
              name={`keep-${rowA.id}-${rowB.id}`}
              checked={keepId === rowB.id}
              onChange={() => setKeepId(rowB.id)}
              disabled={busy}
              className="accent-green-700"
            />
            <span className="text-[10px] text-gray-500 uppercase font-semibold">Keep this</span>
          </label>
          <RowCol row={rowB} isKeep={keepId === rowB.id} />
        </div>
      </div>

      {error && <div className="mt-2 text-[11px] text-red-600">{error}</div>}

      <div className="mt-2.5 flex items-center justify-end gap-2">
        <button
          onClick={() => onSkip?.(pair)}
          disabled={busy}
          className="text-xs text-gray-500 font-semibold px-3 py-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
        >
          Skip
        </button>
        <button
          onClick={doMerge}
          disabled={busy}
          className="text-xs text-white font-semibold px-4 py-1.5 rounded hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: GREEN }}
        >
          {busy ? 'Merging…' : 'Merge'}
        </button>
      </div>
    </div>
  )
}

export default function MergeDuplicatesModal({ onClose, onMerged }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState('')
  const [scanned, setScanned] = useState(false)
  const [pairs, setPairs] = useState([])

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      setLoadError('')
      try {
        const { data, error } = await supabase
          .from('material_rates')
          .select(
            'id, name, sku, category, sub_category, unit, unit_cost, photo_url, vendor_id, show_in_selections'
          )
          .limit(8000)
        if (!alive) return
        if (error) {
          setLoadError(error.message || 'Failed to load materials')
          setRows([])
        } else {
          setRows(Array.isArray(data) ? data : [])
        }
      } catch (e) {
        if (alive) setLoadError((e && e.message) || 'Failed to load materials')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const rowById = useMemo(() => {
    const m = new Map()
    for (const r of rows) if (r && r.id) m.set(r.id, r)
    return m
  }, [rows])

  // Build unique candidate pairs via client fuzzy pre-filter, grouped by category.
  const fuzzyPairs = useMemo(() => {
    if (!rows.length) return []
    const byCat = new Map()
    for (const r of rows) {
      if (!r || !r.id) continue
      const key = normalizeName(r.category) || '__none__'
      if (!byCat.has(key)) byCat.set(key, [])
      byCat.get(key).push(r)
    }
    const seen = new Set()
    const out = []
    for (const group of byCat.values()) {
      if (group.length < 2) continue
      for (const r of group) {
        const others = group.filter(o => o.id !== r.id)
        const tops = topCandidates(
          { name: r.name, sku: r.sku, category: r.category },
          others,
          { limit: 4, floor: FUZZY_FLOOR }
        )
        for (const t of tops) {
          const c = t.candidate
          const k = pairKey(r.id, c.id)
          if (seen.has(k)) continue
          seen.add(k)
          out.push({ rowA: r, rowB: c, score: t.score })
        }
      }
    }
    // Best-scoring pairs first.
    out.sort((a, b) => b.score - a.score)
    return out
  }, [rows])

  async function scan() {
    setScanning(true)
    setScanError('')
    try {
      // One item per row that has fuzzy candidates. Cap the pool sent to Sam.
      const byRow = new Map() // rowId -> { row, candidates:Set<id> }
      for (const p of fuzzyPairs) {
        for (const [a, b] of [
          [p.rowA, p.rowB],
          [p.rowB, p.rowA],
        ]) {
          if (!byRow.has(a.id)) byRow.set(a.id, { row: a, cand: new Map() })
          byRow.get(a.id).cand.set(b.id, b)
        }
      }
      const entries = Array.from(byRow.values()).slice(0, PAIR_SEND_CAP)

      let proposed = []
      if (entries.length) {
        const items = entries.map((e, index) => ({
          index,
          name: e.row.name || '',
          sku: e.row.sku || '',
          category: e.row.category || '',
          sub_category: e.row.sub_category || '',
          unit: e.row.unit || '',
          price: hasPrice(e.row) ? parseFloat(e.row.unit_cost) : null,
          candidates: Array.from(e.cand.values()).map(c => ({
            id: c.id,
            name: c.name || '',
            sku: c.sku || '',
            category: c.category || '',
            sub_category: c.sub_category || '',
            unit_cost: hasPrice(c) ? parseFloat(c.unit_cost) : null,
            has_photo: hasPhoto(c),
          })),
        }))

        let matches = null
        try {
          const { data, error } = await supabase.functions.invoke('reconcile-materials', {
            body: { items },
          })
          if (error) throw error
          matches = data && Array.isArray(data.matches) ? data.matches : null
        } catch (e) {
          matches = null
        }

        if (matches) {
          const seen = new Set()
          for (const m of matches) {
            if (!m || m.candidate_id == null) continue
            if ((Number(m.confidence) || 0) < SAM_CONFIDENCE) continue
            const entry = entries[m.index]
            if (!entry) continue
            const rowA = entry.row
            const rowB = rowById.get(m.candidate_id)
            if (!rowB || rowB.id === rowA.id) continue
            const k = pairKey(rowA.id, rowB.id)
            if (seen.has(k)) continue
            seen.add(k)
            proposed.push({
              rowA,
              rowB,
              confidence: Number(m.confidence) || 0,
              reason: m.reason || 'Sam confirmed',
            })
          }
        } else {
          // Degrade gracefully: fuzzy-only fallback.
          setScanError('Sam unavailable — showing name-similarity matches.')
          const seen = new Set()
          for (const p of fuzzyPairs) {
            if (p.score < FUZZY_FALLBACK) continue
            const k = pairKey(p.rowA.id, p.rowB.id)
            if (seen.has(k)) continue
            seen.add(k)
            proposed.push({
              rowA: p.rowA,
              rowB: p.rowB,
              confidence: p.score,
              reason: 'name similarity',
            })
          }
        }
      }

      setPairs(proposed)
      setScanned(true)
    } catch (e) {
      setScanError((e && e.message) || 'Scan failed')
    } finally {
      setScanning(false)
    }
  }

  function handleMerged(pair, keptId, droppedId) {
    // Remove the merged card and any later pair that references the dropped id
    // (that record no longer exists).
    setPairs(prev =>
      prev.filter(
        p =>
          p !== pair &&
          p.rowA.id !== droppedId &&
          p.rowB.id !== droppedId
      )
    )
    onMerged?.()
  }

  function handleSkip(pair) {
    setPairs(prev => prev.filter(p => p !== pair))
  }

  const body = (
    <div className="fixed inset-0 z-[9998] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-gray-900">Find &amp; Merge Duplicate Materials</h2>
            {scanned && (
              <p className="text-[11px] text-gray-500">
                {pairs.length} proposed merge{pairs.length === 1 ? '' : 's'}
              </p>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={scan}
              disabled={scanning || loading || !!loadError}
              className="text-xs text-white font-semibold px-3 py-1.5 rounded hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: GREEN }}
            >
              {scanning ? 'Scanning…' : scanned ? 'Rescan with Sam' : 'Scan with Sam'}
            </button>
            <button
              onClick={() => onClose?.()}
              className="text-gray-400 hover:text-gray-700 text-xl leading-none px-1"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center text-gray-400 text-sm py-10">Loading materials…</div>
          ) : loadError ? (
            <div className="text-center text-red-600 text-sm py-10">{loadError}</div>
          ) : !scanned ? (
            <div className="text-center text-gray-500 text-sm py-10">
              <p>
                Ready to scan {rows.length.toLocaleString()} materials for likely duplicates.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Click “Scan with Sam” to find pairs to review.
              </p>
            </div>
          ) : (
            <>
              {scanError && (
                <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                  {scanError}
                </div>
              )}
              {pairs.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-10">
                  No likely duplicates found.
                </div>
              ) : (
                pairs.map(p => (
                  <PairCard
                    key={pairKey(p.rowA.id, p.rowB.id)}
                    pair={p}
                    onMerged={handleMerged}
                    onSkip={handleSkip}
                  />
                ))
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(body, document.body)
}
