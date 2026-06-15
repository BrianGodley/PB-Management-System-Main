// src/components/edoc/EDocPrepareModal.jsx
// Staff "prepare" view: fill the CONTRACTOR-role fields on a draft document
// (e.g. contract price, dates, company rep name + signature) before sending it
// to the buyer. Reuses EDocFillView with fillRole="contractor". Saving merges
// the entered values into edoc_documents.fields so the buyer sees them
// read-only when they open the signing link.
import { useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import EDocFillView from './EDocFillView'

const BUCKET = 'edocuments'

export default function EDocPrepareModal({ doc, onClose, onSaved }) {
  const [values, setValues] = useState(() => {
    const seed = {}
    ;(doc.fields || []).forEach(f => {
      if (f.value != null) seed[f.id] = f.value
    })
    return seed
  })
  const [saving, setSaving] = useState(false)

  const url = useMemo(
    () => (doc.pdf_path ? supabase.storage.from(BUCKET).getPublicUrl(doc.pdf_path).data.publicUrl : null),
    [doc.pdf_path]
  )

  const contractorCount = (doc.fields || []).filter(f => f.role === 'contractor').length

  async function save() {
    setSaving(true)
    const merged = (doc.fields || []).map(f => ({ ...f, value: values[f.id] ?? f.value ?? null }))
    const { error } = await supabase
      .from('edoc_documents')
      .update({ fields: merged, updated_at: new Date().toISOString() })
      .eq('id', doc.id)
    setSaving(false)
    if (error) {
      alert('Save failed: ' + error.message)
      return
    }
    onSaved?.(merged)
  }

  return (
    <div className="fixed inset-0 z-[75] bg-black/50 flex flex-col">
      <div className="bg-white border-b border-gray-200 flex items-center justify-between px-4 py-3 flex-shrink-0">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">
            Fill your fields
          </p>
          <p className="text-sm font-bold text-gray-900 truncate">{doc.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-400 hidden sm:inline">
            {contractorCount} contractor field{contractorCount !== 1 ? 's' : ''} · green = yours
          </span>
          <button
            onClick={onClose}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="text-sm bg-green-700 text-white rounded-lg px-4 py-1.5 font-semibold hover:bg-green-800 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {contractorCount === 0 ? (
          <div className="max-w-md mx-auto mt-16 text-center text-sm text-gray-500 bg-white rounded-xl p-6">
            This template has no fields assigned to you (contractor). Add some in Templates → Edit
            Fields, or just send it for the buyer to complete.
          </div>
        ) : (
          <EDocFillView
            url={url}
            numPages={doc.page_count}
            fields={doc.fields || []}
            values={values}
            setValues={setValues}
            fillRole="contractor"
          />
        )}
      </div>
    </div>
  )
}
