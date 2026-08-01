import { useState, useMemo, useEffect } from 'react'
import { pdfjs } from 'react-pdf'
import { supabase } from '../lib/supabase'
import VendorCombo from './VendorCombo'
import QuickAddVendorModal from './QuickAddVendorModal'

// ─────────────────────────────────────────────────────────────────────────────
// VendorCatalogImportModal — upload a vendor product catalog (PDF or image),
// let Sam extract every item AND the pixel box of each item's photo, crop those
// photos out of the page (client-side, via pdfjs / canvas), review, then add the
// items to material_rates for the vendor with the cropped photo attached.
//   • Uploaded catalog → private `vendor-catalogs` bucket.
//   • Extraction        → process-vendor-catalog edge function.
//   • Cropped photos    → public `rate-photos` bucket (getPublicUrl → photo_url).
// Nothing is written to material_rates until the admin clicks Import.
// ─────────────────────────────────────────────────────────────────────────────

// Worker from cdnjs — same pattern the rest of the app uses (EDoc components).
// pdfjs.version resolves to the exact version react-pdf bundles, so the worker
// always matches the library.
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export default function VendorCatalogImportModal({ vendors = [], onClose, onImported }) {
  const [step, setStep] = useState('form') // form | review | done
  const [vendorId, setVendorId] = useState('')
  const [defaultCategory, setDefaultCategory] = useState('')
  const [instructions, setInstructions] = useState('')
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [rows, setRows] = useState([]) // review rows
  const [search, setSearch] = useState('')
  const [added, setAdded] = useState(0)
  const [skippedCount, setSkippedCount] = useState(0)

  // Vendors created via quick-add are appended locally so the picker updates
  // immediately without a parent refresh.
  const [extraVendors, setExtraVendors] = useState([])
  const [showNewVendor, setShowNewVendor] = useState(false)
  const allVendors = [...(vendors || []), ...extraVendors]
  const vendorList = allVendors.filter(v => !v.type || v.type === 'vendor')
  const vendorName = useMemo(
    () => allVendors.find(v => v.id === vendorId)?.company_name || '',
    [allVendors, vendorId]
  )

  // Existing categories → datalist suggestions (you can also type a new value).
  const [catOptions, setCatOptions] = useState([])
  useEffect(() => {
    supabase
      .from('material_rates')
      .select('category')
      .then(({ data }) => {
        const cats = new Set()
        for (const r of data || []) if (r.category) cats.add(r.category)
        setCatOptions([...cats].sort())
      })
  }, [])

  // ── Photo cropping ─────────────────────────────────────────────────────────
  // For each item that has a photo_box + page, render the source page (PDF page
  // via pdfjs, or the uploaded image directly), crop the normalized box, and
  // upload the crop to rate-photos. Best-effort: any failure leaves the item
  // with no photo (photoUrl null) and it still imports. Rendered PDF pages are
  // cached by page number so multiple items on one page don't re-render it.
  async function cropPhotos(items, srcFile, vId) {
    const isPdf = srcFile.type === 'application/pdf' || /\.pdf$/i.test(srcFile.name)
    const pageCache = new Map() // pageNum → { source, W, H }
    let pdf = null
    let imgEntry = null
    let objUrl = null

    async function getPage(pageNum) {
      if (pageCache.has(pageNum)) return pageCache.get(pageNum)
      let entry
      if (isPdf) {
        if (!pdf) {
          const buf = await srcFile.arrayBuffer()
          pdf = await pdfjs.getDocument({ data: buf }).promise
        }
        const page = await pdf.getPage(pageNum)
        const viewport = page.getViewport({ scale: 2 })
        const canvas = document.createElement('canvas')
        canvas.width = Math.ceil(viewport.width)
        canvas.height = Math.ceil(viewport.height)
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
        entry = { source: canvas, W: canvas.width, H: canvas.height }
      } else {
        if (!imgEntry) {
          objUrl = URL.createObjectURL(srcFile)
          const img = await loadImage(objUrl)
          imgEntry = { source: img, W: img.naturalWidth, H: img.naturalHeight }
        }
        entry = imgEntry
      }
      pageCache.set(pageNum, entry)
      return entry
    }

    const out = []
    try {
      for (let i = 0; i < items.length; i++) {
        const it = items[i]
        let photoUrl = null
        const box = it.photo_box
        if (box && Number(box.w) > 0 && Number(box.h) > 0) {
          try {
            const pageNum = isPdf ? (it.page || 1) : 1
            const { source, W, H } = await getPage(pageNum)
            const sx = Math.max(0, Math.min(W, box.x * W))
            const sy = Math.max(0, Math.min(H, box.y * H))
            const sw = Math.min(W - sx, box.w * W)
            const sh = Math.min(H - sy, box.h * H)
            if (sw > 2 && sh > 2) {
              const c = document.createElement('canvas')
              c.width = Math.round(sw)
              c.height = Math.round(sh)
              c.getContext('2d').drawImage(source, sx, sy, sw, sh, 0, 0, c.width, c.height)
              const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.85))
              if (blob) {
                const path = `catalog/${vId}/${Date.now()}-${i}.jpg`
                const { error: upErr } = await supabase.storage
                  .from('rate-photos')
                  .upload(path, blob, { contentType: 'image/jpeg', upsert: false })
                if (!upErr) {
                  photoUrl = supabase.storage.from('rate-photos').getPublicUrl(path).data.publicUrl
                }
              }
            }
          } catch {
            photoUrl = null
          }
        }
        out.push({ ...it, photoUrl })
      }
    } finally {
      if (objUrl) URL.revokeObjectURL(objUrl)
      if (pdf) { try { pdf.destroy?.() } catch { /* noop */ } }
    }
    return out
  }

  async function extract() {
    setError('')
    if (!vendorId) return setError('Pick a vendor first.')
    if (!file) return setError('Choose a catalog file (PDF or image).')
    setBusy(true)
    try {
      setProgress('Uploading catalog…')
      const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_')
      const path = `${vendorId}/${Date.now()}-${safe}`
      const { error: upErr } = await supabase.storage.from('vendor-catalogs').upload(path, file)
      if (upErr) throw new Error(`Upload failed: ${upErr.message}`)

      setProgress('Sam is reading the catalog…')
      const { data, error: fnErr } = await supabase.functions.invoke('process-vendor-catalog', {
        body: { file_path: path, vendor_name: vendorName, instructions },
      })
      if (fnErr) {
        // supabase-js hides the function's JSON error behind a generic message;
        // dig the real reason out of the response body.
        let msg = fnErr.message || 'Extraction failed.'
        try {
          const body = await fnErr.context?.json?.()
          if (body?.error) msg = body.error
        } catch { /* keep generic */ }
        throw new Error(msg)
      }
      if (data?.error) throw new Error(data.error)
      const items = data?.items || []
      if (!items.length) throw new Error('No catalog items were found in that file.')

      setProgress(`Cropping photos for ${items.length} item(s)…`)
      const cropped = await cropPhotos(items, file, vendorId)

      const reviewRows = cropped.map(it => ({
        include: true,
        name: it.name || '',
        category: it.category || defaultCategory || '',
        sub_category: it.sub_category || '',
        unit: it.unit || 'each',
        price: it.unit_price == null ? '' : String(it.unit_price),
        sku: it.sku || '',
        description: it.description || '',
        photoUrl: it.photoUrl || null,
      }))
      setRows(reviewRows)
      setStep('review')
    } catch (e) {
      setError(String(e.message || e))
    } finally {
      setBusy(false)
      setProgress('')
    }
  }

  function setRow(i, patch) {
    setRows(rs => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  const matchesSearch = r => {
    const q = norm(search)
    if (!q) return true
    return norm(`${r.name} ${r.category} ${r.sub_category} ${r.sku} ${r.description}`).includes(q)
  }

  const counts = useMemo(() => {
    const included = rows.filter(r => r.include)
    return { included: included.length, total: rows.length, withPhoto: included.filter(r => r.photoUrl).length }
  }, [rows])

  async function importItems() {
    setError('')
    const included = rows.filter(r => r.include && r.name.trim())
    if (!included.length) return setError('Nothing to import — include at least one item with a name.')
    setBusy(true)
    try {
      // material_rates is unique on (tenant, name, category), so we can't insert
      // a name that already exists in that category (or twice in one catalog).
      // Dedupe within the batch, then skip anything already in the table.
      const key = r => `${(r.category || '').trim().toLowerCase()}::${r.name.trim().toLowerCase()}`
      const seen = new Set()
      const uniq = []
      for (const r of included) {
        const k = key(r)
        if (seen.has(k)) continue
        seen.add(k)
        uniq.push(r)
      }
      const { data: existingRows } = await supabase.from('material_rates').select('name, category')
      const exists = new Set(
        (existingRows || []).map(e => `${(e.category || '').toLowerCase()}::${(e.name || '').toLowerCase()}`)
      )
      const toInsert = uniq.filter(r => !exists.has(key(r)))
      const skipped = included.length - toInsert.length
      if (!toInsert.length) {
        setBusy(false)
        return setError('Every item already exists in the materials list — nothing new to import.')
      }
      const payload = toInsert.map(r => ({
        name: r.name.trim(),
        category: r.category.trim() || null,
        sub_category: r.sub_category.trim() || null,
        vendor_id: vendorId,
        unit: r.unit.trim() || null,
        unit_cost: r.price === '' ? null : Number(r.price),
        photo_url: r.photoUrl || null,
      }))
      setAdded(payload.length)
      setSkippedCount(skipped)
      const { error: insErr } = await supabase.from('material_rates').insert(payload)
      if (insErr) throw new Error(`Import failed: ${insErr.message}`)
      setAdded(payload.length)
      setStep('done')
      onImported?.()
    } catch (e) {
      setError(String(e.message || e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto">
      {showNewVendor && (
        <QuickAddVendorModal
          onClose={() => setShowNewVendor(false)}
          onCreated={v => { setExtraVendors(a => [...a, v]); setVendorId(v.id); setShowNewVendor(false) }}
        />
      )}
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl my-8">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Import Vendor Catalog</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-lg leading-none">×</button>
        </div>

        {error && (
          <div className="mx-5 mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>
        )}

        {step === 'form' && (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs text-gray-500">Vendor</label>
                  <button type="button" onClick={() => setShowNewVendor(true)} className="text-xs text-green-700 font-semibold hover:underline">+ New vendor</button>
                </div>
                <VendorCombo vendors={vendorList} value={vendorId} onChange={setVendorId} placeholder="Search vendor…" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Default category (optional)</label>
                <input
                  value={defaultCategory}
                  onChange={e => setDefaultCategory(e.target.value)}
                  list="vc-cats"
                  placeholder="Applied to items Sam couldn't categorize"
                  className="input w-full text-sm py-1.5"
                />
                <datalist id="vc-cats">
                  {catOptions.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Catalog file (PDF or image)</label>
              <input
                type="file"
                accept="application/pdf,image/*"
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-gray-600 file:mr-3 file:rounded file:border-0 file:bg-green-50 file:px-3 file:py-1.5 file:text-green-700 file:font-semibold"
              />
              <p className="text-[11px] text-gray-400 mt-1">Sam reads the catalog, lists every product, and crops each item's photo out of the page for your review. Nothing is saved until you approve.</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Instructions for Sam (optional)</label>
              <textarea
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                rows={2}
                placeholder="e.g. Only capture the paver products in the middle table; ignore the header banner logos."
                className="input w-full text-sm py-1.5"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={onClose} className="text-sm text-gray-500 px-3 py-1.5">Cancel</button>
              <button onClick={extract} disabled={busy} className="text-sm bg-green-600 text-white font-semibold rounded px-4 py-1.5 disabled:opacity-50">
                {busy ? (progress || 'Working…') : 'Extract & Review'}
              </button>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="p-5">
            <div className="flex flex-wrap items-center gap-3 mb-2 text-xs">
              <span className="font-semibold text-gray-800">{vendorName}</span>
              <span className="text-gray-600">{counts.total} item(s) found</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Filter items…"
                className="border border-gray-300 rounded px-2 py-1 w-48"
              />
              <span className="ml-auto text-gray-700">
                {counts.included} to import · {counts.withPhoto} with photo
              </span>
            </div>
            <p className="text-[11px] text-gray-600 mb-2">Review each item, fix anything Sam misread, and untick items you don't want. Remove a bad crop with "clear". Only ticked items are added to this vendor's materials.</p>

            <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-[54vh]">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr className="text-left text-gray-700">
                    <th className="px-2 py-2 font-semibold w-8">Incl</th>
                    <th className="px-2 py-2 font-semibold w-20">Photo</th>
                    <th className="px-2 py-2 font-semibold">Item</th>
                    <th className="px-2 py-2 font-semibold">Category</th>
                    <th className="px-2 py-2 font-semibold">Sub category</th>
                    <th className="px-2 py-2 font-semibold">Unit</th>
                    <th className="px-2 py-2 font-semibold text-right">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((r, i) => {
                    if (!matchesSearch(r)) return null
                    return (
                      <tr key={i} className={r.include ? '' : 'opacity-50'}>
                        <td className="px-2 py-1.5">
                          <input type="checkbox" checked={r.include} onChange={e => setRow(i, { include: e.target.checked })} className="accent-green-700" />
                        </td>
                        <td className="px-2 py-1.5">
                          {r.photoUrl ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <img src={r.photoUrl} alt="" className="w-14 h-14 object-cover rounded border border-gray-200" />
                              <button onClick={() => setRow(i, { photoUrl: null })} className="text-[10px] text-gray-400 hover:text-red-500">clear</button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-300">no photo</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          <input value={r.name} onChange={e => setRow(i, { name: e.target.value })} className="border border-gray-200 rounded px-1.5 py-1 w-48 font-medium text-gray-800" />
                          {r.sku && <div className="text-[10px] text-gray-400 mt-0.5">SKU {r.sku}</div>}
                        </td>
                        <td className="px-2 py-1.5">
                          <input value={r.category} onChange={e => setRow(i, { category: e.target.value })} list="vc-cats" placeholder="Category" className="border border-gray-200 rounded px-1.5 py-1 w-36" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input value={r.sub_category} onChange={e => setRow(i, { sub_category: e.target.value })} placeholder="—" className="border border-gray-200 rounded px-1.5 py-1 w-32" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input value={r.unit} onChange={e => setRow(i, { unit: e.target.value })} list="vc-units" className="border border-gray-200 rounded px-1.5 py-1 w-20" />
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          <input value={r.price} onChange={e => setRow(i, { price: e.target.value })} placeholder="blank ok" className="border border-gray-200 rounded px-1.5 py-1 w-20 text-right" />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <datalist id="vc-units">
              {['each', 'roll', 'yard', 'CY', 'ton', 'LF', 'linear ft', 'SF', 'sqft', 'bag', 'pallet', 'gallon', 'box'].map(u => (
                <option key={u} value={u} />
              ))}
            </datalist>
            <div className="flex items-center justify-end gap-3 pt-3">
              <button onClick={() => setStep('form')} className="text-sm text-gray-500 px-3 py-1.5">Back</button>
              <button onClick={importItems} disabled={busy || counts.included === 0} className="text-sm bg-green-600 text-white font-semibold rounded px-4 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
                {busy ? 'Importing…' : `Import ${counts.included} item(s)`}
              </button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-700 mb-1 font-semibold">Catalog imported</p>
            <p className="text-xs text-gray-500 mb-4">
              {added} item(s) added to {vendorName}'s materials{skippedCount > 0 ? ` · ${skippedCount} skipped (already existed)` : ''}. You'll find them in the Catalog tab and in Master Rates.
            </p>
            <button onClick={onClose} className="text-sm bg-gray-800 text-white font-semibold rounded px-4 py-1.5">Done</button>
          </div>
        )}
      </div>
    </div>
  )
}
