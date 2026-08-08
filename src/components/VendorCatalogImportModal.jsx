import { useState, useMemo, useEffect, useRef } from 'react'
import { pdfjs } from 'react-pdf'
import { supabase } from '../lib/supabase'
import { supersedeMaterialPrice, resolveTaxonomyIds } from '../lib/materialCatalog'
import VendorCombo from './VendorCombo'
import QuickAddVendorModal from './QuickAddVendorModal'

// ─────────────────────────────────────────────────────────────────────────────
// VendorCatalogImportModal — upload a vendor product catalog (PDF or image),
// then step through it ONE PAGE AT A TIME. For each page Sam extracts just that
// page's items and the pixel box of each item's photo; the boxes appear as
// draggable / resizable rectangles over the rendered page so the admin can fix a
// bad crop, delete one, or add a region Sam missed. Included items are collected
// across pages, their (adjusted) crops are cut client-side, and everything is
// added to material_rates for the vendor with the cropped photo attached.
//   • Rendered pages → private `vendor-catalogs` bucket (one JPEG per page).
//   • Extraction      → process-vendor-catalog edge function (single image).
//   • Cropped photos  → public `rate-photos` bucket (getPublicUrl → photo_url).
// Nothing is written to material_rates until the admin clicks Import.
// ─────────────────────────────────────────────────────────────────────────────

// Worker from cdnjs — same pattern the rest of the app uses (EDoc components).
// pdfjs.version resolves to the exact version react-pdf bundles, so the worker
// always matches the library.
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const clamp01 = v => Math.max(0, Math.min(1, Number(v) || 0))

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

// Given a full-resolution page canvas (W×H) and a normalized box {x,y,w,h}
// (0..1), cut the region out into a JPEG blob. Returns null if the box is empty
// or degenerate.
function cropBoxToBlob(canvas, box) {
  return new Promise(resolve => {
    if (!canvas || !box || !(Number(box.w) > 0) || !(Number(box.h) > 0)) return resolve(null)
    const W = canvas.width
    const H = canvas.height
    const sx = Math.max(0, Math.min(W, clamp01(box.x) * W))
    const sy = Math.max(0, Math.min(H, clamp01(box.y) * H))
    const sw = Math.min(W - sx, clamp01(box.w) * W)
    const sh = Math.min(H - sy, clamp01(box.h) * H)
    if (sw <= 2 || sh <= 2) return resolve(null)
    const c = document.createElement('canvas')
    c.width = Math.round(sw)
    c.height = Math.round(sh)
    c.getContext('2d').drawImage(canvas, sx, sy, sw, sh, 0, 0, c.width, c.height)
    c.toBlob(b => resolve(b), 'image/jpeg', 0.85)
  })
}

// Small live thumbnail of an item's current crop. Re-crops (debounced) from the
// cached page canvas whenever the box moves/resizes.
function CropThumb({ canvas, box, size = 56 }) {
  const ref = useRef(null)
  useEffect(() => {
    const t = setTimeout(() => {
      const c = ref.current
      if (!c) return
      const ctx = c.getContext('2d')
      c.width = size
      c.height = size
      ctx.clearRect(0, 0, size, size)
      if (!canvas || !box || !(Number(box.w) > 0) || !(Number(box.h) > 0)) return
      const W = canvas.width
      const H = canvas.height
      const sx = Math.max(0, Math.min(W, clamp01(box.x) * W))
      const sy = Math.max(0, Math.min(H, clamp01(box.y) * H))
      const sw = Math.min(W - sx, clamp01(box.w) * W)
      const sh = Math.min(H - sy, clamp01(box.h) * H)
      if (sw <= 2 || sh <= 2) return
      const scale = Math.min(size / sw, size / sh)
      const dw = sw * scale
      const dh = sh * scale
      ctx.drawImage(canvas, sx, sy, sw, sh, (size - dw) / 2, (size - dh) / 2, dw, dh)
    }, 150)
    return () => clearTimeout(t)
  }, [canvas, box?.x, box?.y, box?.w, box?.h, size])
  return <canvas ref={ref} width={size} height={size} className="w-14 h-14 rounded border border-gray-200 bg-gray-50" />
}

const DEFAULT_BOX = { x: 0.4, y: 0.4, w: 0.2, h: 0.2 }
const newItem = cat => ({
  include: true,
  name: '',
  category: cat || '',
  sub_category: '',
  unit: 'each',
  price: '',
  sku: '',
  description: '',
  box: { ...DEFAULT_BOX },
})

// ── Lightweight draft persistence ────────────────────────────────────────────
// Saves each page's extracted items + box edits to localStorage (NOT the page
// images — those are re-rendered from the PDF). Lets a session survive an
// accidental close/refresh and resume when the same catalog file is re-opened.
const DRAFT_KEY = 'catalogImportDraft:v1'
const sigOf = (vendorId, file) => (file ? `${vendorId}::${file.name}::${file.size}` : '')
function readDraft() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null')
  } catch {
    return null
  }
}
function writeDraft(obj) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(obj))
  } catch {
    /* storage full / unavailable — non-fatal */
  }
}
function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    /* ignore */
  }
}

export default function VendorCatalogImportModal({ vendors = [], onClose, onImported }) {
  const [step, setStep] = useState('form') // form | page | done
  const [vendorId, setVendorId] = useState('')
  const [defaultCategory, setDefaultCategory] = useState('')
  const [instructions, setInstructions] = useState('')
  const [file, setFile] = useState(null)
  const [catalogYear, setCatalogYear] = useState(new Date().getFullYear())
  const [catalogWarn, setCatalogWarn] = useState('')
  const savedCatalogRef = useRef(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [added, setAdded] = useState(0)
  const [skippedCount, setSkippedCount] = useState(0)
  const [photolessCount, setPhotolessCount] = useState(0)

  // Per-page state. `pages` maps pageNum → { imageUrl, items, error }.
  // Rendered page canvases live in a ref Map so cropping + thumbnails reuse them
  // without re-rendering. `extractedRef` tracks which pages we've already asked
  // Sam about, so revisiting a page never re-extracts.
  const [numPages, setNumPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [pages, setPages] = useState({}) // { [n]: { imageUrl, items, error } }
  const [selectedIdx, setSelectedIdx] = useState(null)
  const canvasCache = useRef(new Map()) // pageNum → full-res canvas
  const pdfRef = useRef(null)
  const workRef = useRef(null) // the page-image wrapper (for drag math)
  const extractedRef = useRef(new Set())
  // A synchronous mirror of `pages` so the importer can read the current page's
  // items without waiting for a re-render.
  const pagesRef = useRef({})
  useEffect(() => { pagesRef.current = pages }, [pages])
  // Which pages have already been imported (so we can mark/skip them).
  const importedPagesRef = useRef(new Set())

  // A catalog session is "in progress" once pages have been read. Guard against
  // accidental loss: warn before a browser unload, and confirm on close.
  const inProgress = step === 'page' && Object.keys(pages).length > 0
  useEffect(() => {
    if (!inProgress) return
    const h = e => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [inProgress])
  function requestClose() {
    if (
      inProgress &&
      !window.confirm(
        'Leave the catalog importer? Any pages you have worked on but not imported yet will be lost.'
      )
    )
      return
    onClose()
  }

  // Persist a lightweight draft (items only) as the user works, so an accidental
  // close/refresh can be resumed by re-opening the same catalog file.
  useEffect(() => {
    if (step !== 'page' || !vendorId || !file) return
    const itemsByPage = {}
    for (const [n, pg] of Object.entries(pages)) {
      if (pg?.items?.length) itemsByPage[n] = pg.items
    }
    writeDraft({
      sig: sigOf(vendorId, file),
      vendorId,
      fileName: file.name,
      numPages,
      currentPage,
      defaultCategory,
      instructions,
      itemsByPage,
      importedPages: [...importedPagesRef.current],
      savedAt: Date.now(),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, currentPage, step, vendorId, file, numPages, defaultCategory, instructions])

  // Clear the draft once the import is finished.
  useEffect(() => {
    if (step === 'done') clearDraft()
  }, [step])

  const isPdf = useMemo(
    () => !!file && (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)),
    [file]
  )

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
      .from('category')
      .select('name')
      .then(({ data }) => {
        setCatOptions([...new Set((data || []).map(c => c.name).filter(Boolean))].sort())
      })
  }, [])

  // Free the pdf document when the modal unmounts.
  useEffect(() => () => { try { pdfRef.current?.destroy?.() } catch { /* noop */ } }, [])

  // ── Page rendering ───────────────────────────────────────────────────────
  // Render page N to a full-resolution canvas (PDF via pdfjs @ scale 2, or the
  // uploaded image drawn 1:1) and cache it. Cropping + the overlay reuse the
  // cached natural-size canvas; the page is only ever *displayed* CSS-scaled.
  async function ensurePageRendered(pageNum) {
    if (canvasCache.current.has(pageNum)) return canvasCache.current.get(pageNum)
    let canvas
    if (isPdf) {
      if (!pdfRef.current) {
        const buf = await file.arrayBuffer()
        pdfRef.current = await pdfjs.getDocument({ data: buf }).promise
      }
      const page = await pdfRef.current.getPage(pageNum)
      const viewport = page.getViewport({ scale: 2 })
      canvas = document.createElement('canvas')
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
    } else {
      const objUrl = URL.createObjectURL(file)
      try {
        const img = await loadImage(objUrl)
        canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        canvas.getContext('2d').drawImage(img, 0, 0)
      } finally {
        URL.revokeObjectURL(objUrl)
      }
    }
    canvasCache.current.set(pageNum, canvas)
    return canvas
  }

  // Extract one page. Uploads the rendered page as a JPEG to vendor-catalogs and
  // invokes the edge function with a single image. Stores items + any error on
  // the page; never throws (a failed page still lets the user move on / add
  // boxes manually).
  async function extractPage(pageNum) {
    const canvas = canvasCache.current.get(pageNum)
    try {
      const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.9))
      if (!blob) throw new Error('Could not encode the page image.')
      const path = `${vendorId}/page-${Date.now()}-${pageNum}.jpg`
      const { error: upErr } = await supabase.storage
        .from('vendor-catalogs')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: false })
      if (upErr) throw new Error(`Upload failed: ${upErr.message}`)

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

      const items = (data?.items || []).map(it => ({
        include: true,
        name: it.name || '',
        category: it.category || defaultCategory || '',
        sub_category: it.sub_category || '',
        unit: it.unit || 'each',
        price: it.unit_price == null ? '' : String(it.unit_price),
        sku: it.sku || '',
        description: it.description || '',
        box:
          it.photo_box && Number(it.photo_box.w) > 0 && Number(it.photo_box.h) > 0
            ? { x: clamp01(it.photo_box.x), y: clamp01(it.photo_box.y), w: clamp01(it.photo_box.w), h: clamp01(it.photo_box.h) }
            : null,
      }))
      setPages(p => { const next = { ...p, [pageNum]: { ...(p[pageNum] || {}), items, error: null } }; pagesRef.current = next; return next })
    } catch (e) {
      setPages(p => { const next = { ...p, [pageNum]: { ...(p[pageNum] || {}), items: p[pageNum]?.items || [], error: String(e.message || e) } }; pagesRef.current = next; return next })
    }
  }

  // Render (if needed) + extract (once) a page, WITHOUT navigating to it. Used
  // both when the user opens a page and when Import sweeps every page.
  async function ensurePageReady(pageNum) {
    if (!canvasCache.current.has(pageNum)) {
      setProgress(`Rendering page ${pageNum}…`)
      const canvas = await ensurePageRendered(pageNum)
      const imageUrl = canvas.toDataURL('image/jpeg', 0.9)
      setPages(p => { const next = { ...p, [pageNum]: { ...(p[pageNum] || {}), imageUrl, items: p[pageNum]?.items || [] } }; pagesRef.current = next; return next })
    }
    if (!extractedRef.current.has(pageNum)) {
      extractedRef.current.add(pageNum)
      setProgress(`Sam is reading page ${pageNum}…`)
      await extractPage(pageNum)
    }
  }

  // Render (if needed) + extract (once) the given page, then show it.
  async function preparePage(pageNum) {
    setBusy(true)
    setError('')
    try {
      await ensurePageReady(pageNum)
    } catch (e) {
      setError(String(e.message || e))
    } finally {
      setBusy(false)
      setProgress('')
    }
  }

  async function goToPage(n) {
    if (n < 1 || n > numPages) return
    setSelectedIdx(null)
    setCurrentPage(n)
    await preparePage(n)
  }

  // ── Form → page workspace ──────────────────────────────────────────────────
  async function start() {
    setError('')
    if (!vendorId) return setError('Pick a vendor first.')
    if (!file) return setError('Choose a catalog file (PDF or image).')
    setBusy(true)
    setProgress('Opening file…')

    // Save the ORIGINAL catalog file to this vendor's Catalogs tab (once per
    // run), tagged with the chosen year. Non-fatal if it fails.
    if (!savedCatalogRef.current) {
      try {
        const safe = file.name.replace(/[^\w.\-]+/g, '_')
        const cpath = `catalogs/${vendorId}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}-${safe}`
        const { error: cErr } = await supabase.storage
          .from('sub-vendor-files')
          .upload(cpath, file, { upsert: false, contentType: file.type })
        if (!cErr) {
          await supabase.from('vendor_catalogs').insert({
            vendor_id: vendorId,
            year: Number(catalogYear),
            file_path: cpath,
            file_name: file.name,
          })
          savedCatalogRef.current = true
          setCatalogWarn('')
        } else {
          // Don't block the product import — just tell the user the original
          // PDF wasn't stored (usually because it exceeds the storage size limit).
          setCatalogWarn(
            `The original catalog file wasn't saved to the Catalogs tab (${cErr.message}). Product extraction still works. If it's a size limit, ask an admin to raise the sub-vendor-files bucket limit, then re-upload the PDF from the vendor's Catalogs tab.`
          )
        }
      } catch (e) {
        setCatalogWarn(
          `The original catalog file couldn't be saved (${e?.message || 'unknown error'}). Product extraction still works.`
        )
      }
    }
    try {
      let np = 1
      if (isPdf) {
        const buf = await file.arrayBuffer()
        pdfRef.current = await pdfjs.getDocument({ data: buf }).promise
        np = pdfRef.current.numPages || 1
      }
      // Restore a saved draft for this exact file, if present — otherwise fresh.
      const draft = readDraft()
      const restored = draft && draft.sig === sigOf(vendorId, file) ? draft : null

      canvasCache.current = new Map()
      extractedRef.current = new Set()
      importedPagesRef.current = new Set(restored?.importedPages || [])
      const restoredPages = {}
      if (restored?.itemsByPage) {
        for (const [n, items] of Object.entries(restored.itemsByPage)) {
          if (Array.isArray(items) && items.length) {
            restoredPages[n] = { items }
            extractedRef.current.add(Number(n)) // don't re-extract restored pages
          }
        }
        if (restored.defaultCategory) setDefaultCategory(restored.defaultCategory)
        if (restored.instructions) setInstructions(restored.instructions)
      }
      pagesRef.current = restoredPages
      setAdded(0)
      setSkippedCount(0)
      setPhotolessCount(0)
      setPages(restoredPages)
      setSelectedIdx(null)
      setNumPages(np)
      const startPage = restored?.currentPage && restored.currentPage <= np ? restored.currentPage : 1
      setCurrentPage(startPage)
      setStep('page')
      setBusy(false)
      setProgress('')
      await preparePage(startPage)
    } catch (e) {
      setError(String(e.message || e))
      setBusy(false)
      setProgress('')
    }
  }

  // ── Per-page item edits ────────────────────────────────────────────────────
  const pageItems = pages[currentPage]?.items || []
  const pageError = pages[currentPage]?.error || ''
  const pageImageUrl = pages[currentPage]?.imageUrl || ''
  const pageCanvas = canvasCache.current.get(currentPage) || null
  const pageIncluded = pageItems.filter(it => it.include && it.name.trim()).length

  function setItem(idx, patch) {
    setPages(p => {
      const pg = p[currentPage] || { items: [] }
      const items = (pg.items || []).map((it, i) => (i === idx ? { ...it, ...patch } : it))
      return { ...p, [currentPage]: { ...pg, items } }
    })
  }
  const updateBox = (idx, box) => setItem(idx, { box })
  const addItem = () => {
    setPages(p => {
      const pg = p[currentPage] || { items: [] }
      const items = [...(pg.items || []), newItem(defaultCategory)]
      setSelectedIdx(items.length - 1)
      return { ...p, [currentPage]: { ...pg, items } }
    })
  }
  const removeItem = idx => {
    setPages(p => {
      const pg = p[currentPage] || { items: [] }
      const items = (pg.items || []).filter((_, i) => i !== idx)
      return { ...p, [currentPage]: { ...pg, items } }
    })
    setSelectedIdx(null)
  }

  // Drag / resize a box. Mouse delta (displayed px) → normalized by dividing by
  // the displayed wrapper's width/height; clamp to [0,1]. mode = move | resize.
  function startDrag(e, idx, mode, startBox) {
    e.preventDefault()
    e.stopPropagation()
    setSelectedIdx(idx)
    const rect = workRef.current?.getBoundingClientRect()
    if (!rect || !rect.width || !rect.height) return
    const sx0 = startBox.x
    const sy0 = startBox.y
    const sw0 = startBox.w
    const sh0 = startBox.h
    const startX = e.clientX
    const startY = e.clientY
    const move = ev => {
      const dx = (ev.clientX - startX) / rect.width
      const dy = (ev.clientY - startY) / rect.height
      if (mode === 'move') {
        const nx = Math.max(0, Math.min(1 - sw0, sx0 + dx))
        const ny = Math.max(0, Math.min(1 - sh0, sy0 + dy))
        updateBox(idx, { x: nx, y: ny, w: sw0, h: sh0 })
      } else {
        const nw = Math.max(0.02, Math.min(1 - sx0, sw0 + dx))
        const nh = Math.max(0.02, Math.min(1 - sy0, sh0 + dy))
        updateBox(idx, { x: sx0, y: sy0, w: nw, h: nh })
      }
    }
    const up = () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  // ── Import (one page at a time) ─────────────────────────────────────────────
  // Imports THIS page's included items, then advances to the next page (which is
  // read on arrival). Repeats page by page until the last one, then shows the
  // summary. The admin can close out at any point — everything imported so far
  // is kept. `added` / `skippedCount` accumulate across pages.
  async function advancePage() {
    importedPagesRef.current.add(currentPage)
    if (currentPage < numPages) await goToPage(currentPage + 1)
    else setStep('done')
  }

  async function importCurrentPage() {
    setError('')
    const canvas = canvasCache.current.get(currentPage)
    const pageData = pagesRef.current[currentPage] || pages[currentPage] || {}
    const jobs = (pageData.items || [])
      .filter(it => it.include && it.name.trim())
      .map(it => ({ it }))

    // Nothing to import on this page → just move on (or finish).
    if (!jobs.length) return advancePage()

    setBusy(true)
    try {
      // Crop each item's box from this page's canvas → upload to rate-photos.
      // Best-effort: a failed crop leaves the item photo-less but still imports.
      setProgress('Cropping photos…')
      const rows = []
      for (let i = 0; i < jobs.length; i++) {
        const { it } = jobs[i]
        let photoUrl = null
        try {
          const blob = await cropBoxToBlob(canvas, it.box)
          if (blob) {
            // Unique path per attempt (random suffix) avoids same-ms collisions,
            // and we retry a couple times so a transient storage hiccup on a
            // large import doesn't silently drop the photo.
            for (let attempt = 0; attempt < 3 && !photoUrl; attempt++) {
              const path = `catalog/${vendorId}/${Date.now()}-${i}-${Math.random()
                .toString(36)
                .slice(2, 8)}.jpg`
              const { error: upErr } = await supabase.storage
                .from('rate-photos')
                .upload(path, blob, { contentType: 'image/jpeg', upsert: false })
              if (!upErr) {
                photoUrl = supabase.storage.from('rate-photos').getPublicUrl(path).data.publicUrl
                break
              }
              await new Promise(r => setTimeout(r, 300 * (attempt + 1)))
            }
          }
        } catch {
          photoUrl = null
        }
        rows.push({
          name: it.name,
          category: it.category || '',
          sub_category: it.sub_category || '',
          unit: it.unit || '',
          price: it.price,
          description: it.description || '',
          sku: it.sku || '',
          photoUrl,
        })
      }

      // material_rates is unique on (tenant, name, category): dedupe within the
      // page, then skip anything already in the table (existing rows just count
      // as "skipped" — they never block the rest of the page).
      const included = rows.filter(r => r.name.trim())
      const key = r => `${(r.category || '').trim().toLowerCase()}::${r.name.trim().toLowerCase()}`
      const seen = new Set()
      const uniq = []
      for (const r of included) {
        const k = key(r)
        if (seen.has(k)) continue
        seen.add(k)
        uniq.push(r)
      }
      const { data: existingRows } = await supabase
        .from('material')
        .select('description, category:category_id ( name )')
      const exists = new Set(
        (existingRows || []).map(
          e => `${(e.category?.name || '').toLowerCase()}::${(e.description || '').toLowerCase()}`
        )
      )
      const toInsert = uniq.filter(r => !exists.has(key(r)))
      const skipped = included.length - toInsert.length

      if (toInsert.length) {
        // One `material` record per item + a vendor price. show_in_selections=true
        // so imported catalog items appear in Design → Selections. The new model
        // keeps the product name in `description`; the long spec blurb (if any)
        // lives under attributes.description.
        let insertedCount = 0
        let photoless = 0
        for (const r of toInsert) {
          const { category_id, subcategory_id, error: taxErr } = await resolveTaxonomyIds(
            r.category,
            r.sub_category
          )
          if (taxErr) throw new Error(`Import failed for "${r.name}": ${taxErr}`)
          const attributes = {}
          if (r.description?.trim()) attributes.description = r.description.trim()
          const { data: mIns, error: insErr } = await supabase
            .from('material')
            .insert({
              description: r.name.trim(),
              category_id,
              subcategory_id,
              unit: r.unit.trim() || null,
              photo_url: r.photoUrl || null,
              sku: r.sku?.trim() || null,
              attributes,
              show_in_selections: true,
            })
            .select('id')
            .single()
          if (insErr) throw new Error(`Import failed for "${r.name}": ${insErr.message}`)
          if (r.price !== '' && r.price != null) {
            await supersedeMaterialPrice(mIns.id, vendorId, Number(r.price), { source: 'vendor_catalog' })
          }
          insertedCount++
          if (!r.photoUrl) photoless++
        }
        setAdded(a => a + insertedCount)
        // Items that imported without a photo (crop empty or upload failed).
        setPhotolessCount(c => c + photoless)
      }
      setSkippedCount(s => s + skipped)
      onImported?.()

      setBusy(false)
      setProgress('')
      await advancePage()
    } catch (e) {
      setError(String(e.message || e))
      setBusy(false)
      setProgress('')
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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-[1500px] my-4">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Import Vendor Catalog</h2>
          <button onClick={requestClose} className="text-gray-400 hover:text-gray-700 text-lg leading-none">×</button>
        </div>

        {error && (
          <div className="mx-5 mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>
        )}

        {catalogWarn && (
          <div className="mx-5 mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2 flex items-start gap-2">
            <span>⚠</span>
            <span className="flex-1">{catalogWarn}</span>
            <button
              type="button"
              onClick={() => setCatalogWarn('')}
              className="text-amber-500 hover:text-amber-700"
            >
              ✕
            </button>
          </div>
        )}

        {/* shared datalists */}
        <datalist id="vc-cats">
          {catOptions.map(c => <option key={c} value={c} />)}
        </datalist>
        <datalist id="vc-units">
          {['each', 'roll', 'yard', 'CY', 'ton', 'LF', 'linear ft', 'SF', 'sqft', 'bag', 'pallet', 'gallon', 'box'].map(u => (
            <option key={u} value={u} />
          ))}
        </datalist>

        {step === 'form' && (
          <div className="p-5 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs text-gray-900">Vendor</label>
                  <button type="button" onClick={() => setShowNewVendor(true)} className="text-xs text-green-700 font-semibold hover:underline">+ New vendor</button>
                </div>
                <VendorCombo vendors={vendorList} value={vendorId} onChange={setVendorId} placeholder="Search vendor…" />
              </div>
              <div>
                <label className="block text-xs text-gray-900 mb-1">Default category (optional)</label>
                <input
                  value={defaultCategory}
                  onChange={e => setDefaultCategory(e.target.value)}
                  list="vc-cats"
                  placeholder="Applied to items Sam couldn't categorize"
                  className="input w-full text-sm py-1.5"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-900 mb-1">Catalog Year</label>
              <select
                value={catalogYear}
                onChange={e => setCatalogYear(e.target.value)}
                className="input w-40 text-sm py-1.5"
              >
                {Array.from({ length: 12 }, (_, i) => new Date().getFullYear() + 1 - i).map(y => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-400 mt-1">
                The original file is saved to this vendor's Catalogs tab under this year.
              </p>
            </div>
            <div>
              <label className="block text-xs text-gray-900 mb-1">Catalog file (PDF or image)</label>
              <input
                type="file"
                accept="application/pdf,image/*"
                onChange={e => {
                  setFile(e.target.files?.[0] || null)
                  savedCatalogRef.current = false
                }}
                className="block w-full text-xs text-gray-900 file:mr-3 file:rounded-lg file:border-0 file:bg-green-600 file:px-4 file:py-2 file:text-white file:font-semibold file:cursor-pointer hover:file:bg-green-700"
              />
              <p className="text-[11px] text-gray-400 mt-1">You'll step through the catalog one page at a time. On each page Sam lists the products and marks each item's photo with an adjustable box you can drag, resize, delete, or add. Nothing is saved until you approve.</p>
              {vendorId &&
                file &&
                (() => {
                  const d = readDraft()
                  return d && d.sig === sigOf(vendorId, file)
                })() && (
                  <p className="text-[11px] font-semibold text-green-700 mt-1">
                    ↩ A saved draft for this catalog was found — Start will resume where you left
                    off.
                  </p>
                )}
            </div>
            <div>
              <label className="block text-xs text-gray-900 mb-1">Instructions for Sam (optional)</label>
              <textarea
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                rows={2}
                placeholder="e.g. Only capture the paver products in the middle table; ignore the header banner logos."
                className="input w-full text-sm py-1.5"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={requestClose} className="text-sm text-gray-500 px-3 py-1.5">Cancel</button>
              {Object.keys(pages).length > 0 && (
                <button
                  onClick={() => setStep('page')}
                  className="text-sm border border-green-600 text-green-700 font-semibold rounded px-4 py-1.5 hover:bg-green-50"
                >
                  ‹ Resume import
                </button>
              )}
              <button
                onClick={() => {
                  if (
                    Object.keys(pages).length > 0 &&
                    !window.confirm(
                      'Start over? This clears the pages you have worked on here (items you already imported stay saved).'
                    )
                  )
                    return
                  if (Object.keys(pages).length > 0) clearDraft()
                  start()
                }}
                disabled={busy}
                className="text-sm bg-green-600 text-white font-semibold rounded px-4 py-1.5 disabled:opacity-50"
              >
                {busy
                  ? progress || 'Working…'
                  : Object.keys(pages).length > 0
                    ? 'Start over'
                    : 'Start'}
              </button>
            </div>
          </div>
        )}

        {step === 'page' && (
          <div className="p-4">
            {pageError && (
              <div className="mb-3 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-1.5">
                Couldn't read this page automatically: {pageError} — you can still add items and boxes by hand, or move on.
              </div>
            )}

            <div className="flex flex-col lg:flex-row gap-4">
              {/* Page image with adjustable boxes — takes the full left column */}
              <div className="lg:flex-1 min-w-0">
                <div className="border border-gray-200 rounded-lg bg-gray-100 p-2 overflow-auto max-h-[82vh] flex items-start justify-center">
                  {pageImageUrl ? (
                    <div ref={workRef} className="relative inline-block select-none leading-none">
                      <img src={pageImageUrl} alt={`Page ${currentPage}`} draggable={false} className="block max-h-[80vh] w-auto" />
                      {pageItems.map((it, idx) => {
                        if (!it.box) return null
                        const sel = idx === selectedIdx
                        return (
                          <div
                            key={idx}
                            onMouseDown={e => startDrag(e, idx, 'move', it.box)}
                            className={`absolute cursor-move ${sel ? 'border-2 border-green-500 bg-green-400/20 z-20' : 'border-2 border-blue-500/80 bg-blue-400/10 z-10'}`}
                            style={{
                              left: `${clamp01(it.box.x) * 100}%`,
                              top: `${clamp01(it.box.y) * 100}%`,
                              width: `${clamp01(it.box.w) * 100}%`,
                              height: `${clamp01(it.box.h) * 100}%`,
                            }}
                            title={it.name || `Item ${idx + 1}`}
                          >
                            <span className={`absolute -top-4 left-0 text-[10px] px-1 rounded-t ${sel ? 'bg-green-600 text-white' : 'bg-blue-600/90 text-white'}`}>{idx + 1}</span>
                            <button
                              onMouseDown={e => { e.preventDefault(); e.stopPropagation() }}
                              onClick={e => { e.stopPropagation(); updateBox(idx, null) }}
                              className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-red-600 text-white text-[10px] leading-none flex items-center justify-center shadow"
                              title="Remove this crop"
                            >×</button>
                            <div
                              onMouseDown={e => startDrag(e, idx, 'resize', it.box)}
                              className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-green-600 rounded-sm cursor-nwse-resize"
                              title="Resize"
                            />
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 py-16">{busy ? (progress || 'Loading…') : 'No page loaded.'}</div>
                  )}
                </div>
              </div>

              {/* Right sidebar: page nav, instructions, items, actions */}
              <div className="lg:w-[400px] shrink-0 flex flex-col max-h-[82vh]">
                <div className="flex flex-wrap items-center gap-2 mb-2 text-xs">
                  <span className="font-semibold text-gray-800">{vendorName}</span>
                  <span className="inline-flex items-center gap-1">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={busy || currentPage <= 1}
                      className="px-2 py-1 rounded border border-gray-300 text-gray-700 disabled:opacity-40"
                    >‹ Prev</button>
                    <span className="px-1 font-medium text-gray-700">Page {currentPage} of {numPages}</span>
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={busy || currentPage >= numPages}
                      className="px-2 py-1 rounded border border-gray-300 text-gray-700 disabled:opacity-40"
                    >Next ›</button>
                  </span>
                  <span className="ml-auto text-gray-700 font-medium">
                    {added} imported{skippedCount > 0 ? ` · ${skippedCount} skipped` : ''}
                    {photolessCount > 0 ? ` · ${photolessCount} without photo` : ''}
                  </span>
                  {busy && <span className="w-full text-gray-500">{progress || 'Working…'}</span>}
                </div>

                <p className="text-[11px] text-gray-500 mb-2">Drag a box to move it, drag the green corner to resize, or ✕ to remove it. Boxes stay put at any zoom.</p>

                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-700">{pageItems.length} item(s) on this page</span>
                  <button onClick={addItem} className="text-xs text-green-700 font-semibold hover:underline">＋ add item</button>
                </div>
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 flex-1 min-h-[200px] overflow-y-auto">
                  {pageItems.length === 0 && (
                    <div className="text-[11px] text-gray-400 px-3 py-6 text-center">No items yet on this page.</div>
                  )}
                  {pageItems.map((it, idx) => {
                    const sel = idx === selectedIdx
                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedIdx(idx)}
                        className={`p-2 cursor-pointer ${sel ? 'bg-green-50' : ''} ${it.include ? '' : 'opacity-50'}`}
                      >
                        <div className="flex gap-2">
                          <div className="flex flex-col items-center gap-1">
                            <input
                              type="checkbox"
                              checked={it.include}
                              onClick={e => e.stopPropagation()}
                              onChange={e => setItem(idx, { include: e.target.checked })}
                              className="accent-green-700"
                            />
                            <CropThumb canvas={pageCanvas} box={it.box} />
                            {it.box ? (
                              <button
                                onClick={e => { e.stopPropagation(); updateBox(idx, null) }}
                                className="text-[10px] text-gray-400 hover:text-red-500"
                              >clear box</button>
                            ) : (
                              <button
                                onClick={e => { e.stopPropagation(); updateBox(idx, { ...DEFAULT_BOX }) }}
                                className="text-[10px] text-blue-600 hover:underline"
                              >set box</button>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <input
                              value={it.name}
                              onClick={e => e.stopPropagation()}
                              onChange={e => setItem(idx, { name: e.target.value })}
                              placeholder="Item name"
                              className="border border-gray-200 rounded px-1.5 py-1 w-full text-xs font-medium text-gray-800"
                            />
                            <div className="flex gap-1">
                              <input
                                value={it.category}
                                onClick={e => e.stopPropagation()}
                                onChange={e => setItem(idx, { category: e.target.value })}
                                list="vc-cats"
                                placeholder="Category"
                                className="border border-gray-200 rounded px-1.5 py-1 w-1/2 text-xs"
                              />
                              <input
                                value={it.sub_category}
                                onClick={e => e.stopPropagation()}
                                onChange={e => setItem(idx, { sub_category: e.target.value })}
                                placeholder="Sub category"
                                className="border border-gray-200 rounded px-1.5 py-1 w-1/2 text-xs"
                              />
                            </div>
                            <div className="flex gap-1 items-center">
                              <input
                                value={it.unit}
                                onClick={e => e.stopPropagation()}
                                onChange={e => setItem(idx, { unit: e.target.value })}
                                list="vc-units"
                                placeholder="unit"
                                className="border border-gray-200 rounded px-1.5 py-1 w-20 text-xs"
                              />
                              <input
                                value={it.price}
                                onClick={e => e.stopPropagation()}
                                onChange={e => setItem(idx, { price: e.target.value })}
                                placeholder="price (opt)"
                                className="border border-gray-200 rounded px-1.5 py-1 w-24 text-xs text-right"
                              />
                              <button
                                onClick={e => { e.stopPropagation(); removeItem(idx) }}
                                className="ml-auto text-[10px] text-gray-400 hover:text-red-500"
                              >remove</button>
                            </div>
                            {it.sku && <div className="text-[10px] text-gray-400">SKU {it.sku}</div>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="flex items-center justify-between gap-2 pt-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            'Return to the setup screen? Your progress is kept — use “Resume import” to come back.'
                          )
                        )
                          setStep('form')
                      }}
                      className="text-xs text-gray-500 px-2 py-1.5"
                      title="Go back to the setup screen (your progress is kept)"
                    >
                      ‹ Setup
                    </button>
                    {added > 0 && (
                      <button onClick={() => { setStep('done') }} className="text-xs text-gray-500 px-2 py-1.5">Finish now</button>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {currentPage < numPages && (
                      <button onClick={() => goToPage(currentPage + 1)} disabled={busy} className="text-xs border border-gray-300 text-gray-700 rounded px-2 py-1.5 disabled:opacity-50">Skip ›</button>
                    )}
                    <button
                      onClick={importCurrentPage}
                      disabled={busy}
                      className="text-xs bg-green-600 text-white font-semibold rounded px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {busy
                        ? (progress || 'Importing…')
                        : currentPage < numPages
                          ? `Import ${pageIncluded} & next ›`
                          : `Import ${pageIncluded} & finish`}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-700 mb-1 font-semibold">Catalog imported</p>
            <p className="text-xs text-gray-500 mb-4">
              {added} item(s) added to {vendorName}'s materials{skippedCount > 0 ? ` · ${skippedCount} skipped (already existed)` : ''}
              {photolessCount > 0 ? ` · ${photolessCount} imported without a photo` : ''}. You'll
              find them in the Catalog tab and in Master Rates.
              {photolessCount > 0 && (
                <span className="block mt-1 text-amber-600">
                  Tip: {photolessCount} item(s) came in without a photo — usually because no photo
                  box was marked on that item. You can add a photo later from Master Rates.
                </span>
              )}
            </p>
            <button onClick={onClose} className="text-sm bg-gray-800 text-white font-semibold rounded px-4 py-1.5">Done</button>
          </div>
        )}
      </div>
    </div>
  )
}
