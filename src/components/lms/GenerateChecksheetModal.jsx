// ─────────────────────────────────────────────────────────────────────────────
// GenerateChecksheetModal — upload a course curriculum + an existing checksheet
// (PDF / Word / text), extract their text in the browser, and let Claude turn
// them into a structured draft checksheet. The draft is handed back to the
// caller (LMS) which opens it pre-filled in the Checksheet Builder for review.
// Nothing is saved until the admin clicks Save in the builder.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { extractDocText } from '../../lib/extractDocText'

function FileDrop({ label, hint, file, onPick, accent = 'green' }) {
  const ref = useRef()
  const ring = accent === 'blue' ? 'hover:border-blue-400 hover:bg-blue-50' : 'hover:border-green-400 hover:bg-green-50'
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div
        onClick={() => ref.current?.click()}
        className={`flex flex-col items-center justify-center h-28 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer transition-colors ${ring}`}
      >
        {file ? (
          <div className="text-center px-3">
            <p className="text-2xl mb-0.5">📄</p>
            <p className="text-sm font-medium text-gray-800 truncate max-w-[16rem]">{file.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">Click to change</p>
          </div>
        ) : (
          <div className="text-center text-gray-400 px-3">
            <p className="text-3xl mb-1">📁</p>
            <p className="text-sm">{hint}</p>
            <p className="text-[11px] mt-0.5">PDF, Word (.docx), or text</p>
          </div>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        accept=".pdf,.docx,.txt,.md,.csv"
        className="sr-only"
        onChange={e => onPick(e.target.files?.[0] || null)}
      />
    </div>
  )
}

export default function GenerateChecksheetModal({ onClose, onGenerated }) {
  const [curriculumFile, setCurriculumFile] = useState(null)
  const [checksheetFile, setChecksheetFile] = useState(null)
  const [titleHint, setTitleHint] = useState('')
  const [categoryHint, setCategoryHint] = useState('')

  const [busy, setBusy] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [error, setError] = useState('')

  const canGo = (curriculumFile || checksheetFile) && !busy

  const run = async () => {
    setError('')
    if (!curriculumFile && !checksheetFile) {
      setError('Upload at least one document.')
      return
    }
    setBusy(true)
    try {
      setStatusMsg('Reading your documents…')
      const [curriculum_text, checksheet_text] = await Promise.all([
        curriculumFile ? extractDocText(curriculumFile) : Promise.resolve(''),
        checksheetFile ? extractDocText(checksheetFile) : Promise.resolve(''),
      ])

      if (!curriculum_text && !checksheet_text) {
        throw new Error(
          'No readable text was found in those files. If they are scanned images, the text can’t be extracted.'
        )
      }

      setStatusMsg('Building your checksheet with AI… this can take 10–20 seconds.')
      const { data, error: fnErr } = await supabase.functions.invoke('generate-checksheet', {
        body: {
          curriculum_text,
          checksheet_text,
          title_hint: titleHint.trim() || undefined,
          category_hint: categoryHint.trim() || undefined,
        },
      })
      if (fnErr) throw new Error(fnErr.message || 'The AI request failed.')
      if (data?.error) throw new Error(data.error)
      if (!data?.steps?.length) throw new Error('The AI returned no steps. Try different documents.')

      // Hand the draft back to the caller to open in the builder.
      onGenerated({
        title: data.title || titleHint.trim() || '',
        description: data.description || '',
        category: data.category || categoryHint.trim() || 'General',
        steps: data.steps.map((s, i) => ({
          id: crypto.randomUUID(),
          _new: true,
          step_order: i,
          step_type: s.step_type,
          title: s.title,
          instructions: s.instructions || '',
          youtube_url: '',
          read_item_id: '',
          video_id: '',
          learning_drill_id: '',
          quiz_id: '',
          test_id: '',
          action_id: '',
        })),
      })
    } catch (err) {
      setError(err.message || 'Something went wrong.')
      setBusy(false)
      setStatusMsg('')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-start gap-3">
          <div className="text-2xl">✨</div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 text-lg">Generate Checksheet from Documents</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Upload your training material and AI will draft an ordered checksheet. You’ll review
              and edit every step before it’s saved.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <FileDrop
            label="Course Curriculum"
            hint="Upload curriculum"
            file={curriculumFile}
            onPick={setCurriculumFile}
          />
          <FileDrop
            label="Existing Checksheet"
            hint="Upload checksheet"
            file={checksheetFile}
            onPick={setChecksheetFile}
            accent="blue"
          />
        </div>
        <p className="text-[11px] text-gray-400 -mt-1">
          Provide either or both. The more you give, the better the draft.
        </p>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Title (optional)</label>
            <input
              value={titleHint}
              onChange={e => setTitleHint(e.target.value)}
              placeholder="e.g. Irrigation Basics"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category (optional)</label>
            <input
              value={categoryHint}
              onChange={e => setCategoryHint(e.target.value)}
              placeholder="e.g. Safety"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500"
            />
          </div>
        </div>

        {busy && statusMsg && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <span className="inline-block w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-green-800">{statusMsg}</p>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <button
            onClick={run}
            disabled={!canGo}
            className="flex-1 py-2.5 bg-green-700 text-white rounded-xl font-semibold hover:bg-green-800 disabled:opacity-50"
          >
            {busy ? 'Working…' : '✨ Generate Draft'}
          </button>
          <button
            onClick={onClose}
            disabled={busy}
            className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
