// ─────────────────────────────────────────────────────────────────────────────
// SubVendorCatalogs — the "Catalogs" sub-tab of a vendor's detail modal.
// Stores the original vendor catalog PDFs, one (or more) per year, and lists
// them in a table with a link that opens the PDF in the in-app viewer.
//
// Requires: table `vendor_catalogs` + the shared `sub-vendor-files` storage bucket.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import DocViewerModal from './DocViewerModal'

export default function SubVendorCatalogs({ partyId }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())
  const [uploading, setUploading] = useState(false)
  const [viewDoc, setViewDoc] = useState(null)
  const fileRef = useRef(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('vendor_catalogs')
      .select('*')
      .eq('vendor_id', partyId)
      .order('year', { ascending: false })
      .order('uploaded_at', { ascending: false })
    setRows(data || [])
    setLoading(false)
  }
  useEffect(() => {
    if (partyId) load()
  }, [partyId])

  async function handleFile(file) {
    if (!file || !partyId) return
    setUploading(true)
    const safe = file.name.replace(/[^\w.\-]+/g, '_')
    const path = `catalogs/${partyId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`
    const { error: upErr } = await supabase.storage
      .from('sub-vendor-files')
      .upload(path, file, { upsert: false, contentType: file.type })
    if (upErr) {
      const tooBig =
        /size|large|exceed|payload|413/i.test(upErr.message || '') ||
        file.size > 50 * 1024 * 1024
      alert(
        tooBig
          ? `This catalog (${(file.size / 1024 / 1024).toFixed(1)} MB) is larger than the storage limit, so it wasn't saved.\n\n` +
              `Ask an admin to raise the "sub-vendor-files" bucket file size limit in Supabase (Storage → Buckets → sub-vendor-files → Edit), then upload again.\n\n` +
              `(Details: ${upErr.message})`
          : 'Upload failed: ' + upErr.message
      )
      setUploading(false)
      return
    }
    const { error: insErr } = await supabase.from('vendor_catalogs').insert({
      vendor_id: partyId,
      year: Number(year),
      file_path: path,
      file_name: file.name,
    })
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
    if (insErr) {
      alert('Save failed: ' + insErr.message)
      return
    }
    load()
  }

  async function openCatalog(r) {
    const { data, error } = await supabase.storage
      .from('sub-vendor-files')
      .createSignedUrl(r.file_path, 3600)
    if (error || !data?.signedUrl) {
      alert('Could not open catalog: ' + (error?.message || 'unknown error'))
      return
    }
    setViewDoc({ name: r.file_name || `Catalog ${r.year}`, url: data.signedUrl })
  }

  async function remove(r) {
    if (!confirm(`Delete the ${r.year} catalog?`)) return
    if (r.file_path) await supabase.storage.from('sub-vendor-files').remove([r.file_path])
    await supabase.from('vendor_catalogs').delete().eq('id', r.id)
    load()
  }

  const thisYear = new Date().getFullYear()
  const years = Array.from({ length: 12 }, (_, i) => thisYear + 1 - i)

  return (
    <div>
      {/* Upload a catalog for a year */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Catalog Year</label>
          <select
            value={year}
            onChange={e => setYear(e.target.value)}
            className="input text-sm py-1.5 w-28"
          >
            {years.map(y => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={e => handleFile(e.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="btn-primary text-sm px-3 py-2 disabled:opacity-50"
        >
          {uploading ? 'Uploading…' : '⬆ Upload Catalog PDF'}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 py-10 text-center">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="py-16 text-center text-gray-400">
          <p className="text-4xl mb-3">📚</p>
          <p className="font-medium text-gray-500">No catalogs yet</p>
          <p className="text-sm mt-1">Choose a year and upload the vendor's catalog PDF.</p>
        </div>
      ) : (
        <div className="bg-white sm:rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-gray-600 uppercase text-xs">
                <th className="px-4 py-2 font-semibold w-24">Year</th>
                <th className="px-4 py-2 font-semibold">Catalog</th>
                <th className="px-4 py-2 font-semibold hidden sm:table-cell">Uploaded</th>
                <th className="px-4 py-2 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2 font-semibold text-gray-700">{r.year}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => openCatalog(r)}
                      className="text-green-700 hover:underline font-medium text-left"
                    >
                      📄 {r.file_name || `Catalog ${r.year}`}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-gray-500 hidden sm:table-cell whitespace-nowrap">
                    {r.uploaded_at ? new Date(r.uploaded_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => remove(r)}
                      className="text-gray-300 hover:text-red-500"
                      title="Delete catalog"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewDoc && (
        <DocViewerModal name={viewDoc.name} url={viewDoc.url} onClose={() => setViewDoc(null)} />
      )}
    </div>
  )
}
