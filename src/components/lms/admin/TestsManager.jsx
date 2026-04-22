import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'

function newQuestion() {
  return { id: crypto.randomUUID(), question: '', options: ['', '', '', ''], correct_index: 0 }
}

function QuestionEditor({ q, idx, onChange, onRemove }) {
  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
      <div className="flex justify-between items-center">
        <span className="text-sm font-semibold text-gray-700">Question {idx + 1}</span>
        <button onClick={onRemove} className="text-xs text-red-400 hover:text-red-600">Remove</button>
      </div>
      <input
        value={q.question}
        onChange={e => onChange({ ...q, question: e.target.value })}
        placeholder="Question text…"
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-green-500"
      />
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-500">Answer Options — select the correct one</p>
        {q.options.map((opt, oi) => (
          <div key={oi} className="flex items-center gap-2">
            <input
              type="radio"
              name={`correct_${q.id}`}
              checked={q.correct_index === oi}
              onChange={() => onChange({ ...q, correct_index: oi })}
              className="accent-green-600 flex-shrink-0"
            />
            <input
              value={opt}
              onChange={e => {
                const opts = [...q.options]
                opts[oi] = e.target.value
                onChange({ ...q, options: opts })
              }}
              placeholder={`Option ${oi + 1}`}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-green-500"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function TestsManager() {
  const { user } = useAuth()
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ title: '', description: '', passing_score: 80, max_attempts: 2 })
  const [questions, setQuestions] = useState([newQuestion()])
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('lms_tests').select('*').order('created_at', { ascending: false })
    setTests(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setEditing(null)
    setForm({ title: '', description: '', passing_score: 80, max_attempts: 2 })
    setQuestions([newQuestion()])
    setShowModal(true)
  }

  const openEdit = (test) => {
    setEditing(test)
    setForm({ title: test.title, description: test.description || '', passing_score: test.passing_score, max_attempts: test.max_attempts })
    setQuestions(test.questions?.length ? test.questions : [newQuestion()])
    setShowModal(true)
  }

  const save = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    const payload = {
      ...form,
      passing_score: Number(form.passing_score),
      max_attempts: Number(form.max_attempts),
      questions: questions.filter(q => q.question.trim()),
    }
    if (editing) {
      await supabase.from('lms_tests').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('lms_tests').insert({ ...payload, created_by_email: user?.email })
    }
    setSaving(false)
    setShowModal(false)
    load()
  }

  const del = async (id) => {
    if (!confirm('Delete this final test?')) return
    await supabase.from('lms_tests').delete().eq('id', id)
    load()
  }

  const updateQ = (idx, val) => setQuestions(prev => prev.map((q, i) => i === idx ? val : q))
  const removeQ = (idx) => setQuestions(prev => prev.filter((_, i) => i !== idx))

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-800">Final Tests</h3>
          <p className="text-xs text-gray-500 mt-0.5">Comprehensive end-of-course tests. Higher passing threshold than quizzes.</p>
        </div>
        <button onClick={openAdd} className="px-3 py-1.5 bg-green-700 text-white text-sm rounded-lg hover:bg-green-800">
          + Add Final Test
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 py-4">Loading…</p>
      ) : tests.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <div className="text-4xl mb-2">🎓</div>
          <p className="text-sm">No final tests yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Title</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Questions</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Passing Score</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Max Attempts</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Created By</th>
                <th className="py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {tests.map(test => (
                <tr key={test.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3 font-medium text-gray-900">{test.title}</td>
                  <td className="py-2 px-3 text-gray-600">{test.questions?.length || 0}</td>
                  <td className="py-2 px-3 text-gray-600">{test.passing_score}%</td>
                  <td className="py-2 px-3 text-gray-600">{test.max_attempts}</td>
                  <td className="py-2 px-3 text-gray-400 text-xs">{test.created_by_email || '—'}</td>
                  <td className="py-2 px-3">
                    <div className="flex gap-3">
                      <button onClick={() => openEdit(test)} className="text-xs text-blue-600 hover:underline">Edit</button>
                      <button onClick={() => del(test.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 space-y-5 my-8">
            <h3 className="font-bold text-gray-900 text-lg">{editing ? 'Edit Final Test' : 'New Final Test'}</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Passing Score (%)</label>
                <input type="number" min={1} max={100} value={form.passing_score}
                  onChange={e => setForm(f => ({ ...f, passing_score: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Attempts</label>
                <input type="number" min={1} max={10} value={form.max_attempts}
                  onChange={e => setForm(f => ({ ...f, max_attempts: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">Questions</p>
                <button onClick={() => setQuestions(prev => [...prev, newQuestion()])}
                  className="text-sm text-green-700 hover:underline font-medium">+ Add Question</button>
              </div>
              {questions.map((q, idx) => (
                <QuestionEditor key={q.id} q={q} idx={idx}
                  onChange={val => updateQ(idx, val)}
                  onRemove={() => removeQ(idx)} />
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={save} disabled={saving || !form.title.trim()}
                className="flex-1 py-2.5 bg-green-700 text-white rounded-xl font-medium hover:bg-green-800 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save Final Test'}
              </button>
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
