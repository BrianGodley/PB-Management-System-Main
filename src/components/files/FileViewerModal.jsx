// src/components/files/FileViewerModal.jsx
//
// Opens a storage file in a popup using the Doc Creator editors instead of
// downloading it:
//   • Word/text  → rich-text editor (docx parsed via mammoth)
//   • Spreadsheet → grid editor (xlsx/csv parsed via SheetJS)
//   • PDF / image / video → inline viewer
//   • anything else → download
// Edits can be saved back to the Drive (upsert) and downloaded at any stage.

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { RichTextCreator, SheetCreator } from '../DocCreator'

// xlsx + mammoth are loaded on demand (keeps the main bundle small and isolates
// any browser-resolution quirks to when a file is actually opened).
const loadXLSX = () => import('xlsx')
const loadMammoth = () => import('mammoth').then(m => m.default || m)

const DOC_EXT = ['doc', 'docx', 'txt', 'md', 'rtf', 'html', 'htm', 'odt']
const SHEET_EXT = ['xlsx', 'xls', 'csv', 'tsv']
const IMG_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'heic']
const VIDEO_EXT = ['mp4', 'mov', 'webm', 'm4v', 'ogg']

const extOf = name => (name.split('.').pop() || '').toLowerCase()
const baseOf = name => name.replace(/\.[^.]+$/, '')
const escapeHtml = s =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function kindFor(name) {
  const e = extOf(name)
  if (DOC_EXT.includes(e)) return 'doc'
  if (SHEET_EXT.includes(e)) return 'sheet'
  if (e === 'pdf') return 'pdf'
  if (IMG_EXT.includes(e)) return 'image'
  if (VIDEO_EXT.includes(e)) return 'video'
  return 'other'
}

export default function FileViewerModal({ bucket, prefix, name, onClose, onSaved }) {
  const kind = kindFor(name)
  const path = `${prefix}/${name}`
  const publicUrl = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl

  const [state, setState] = useState({ loading: true, error: '', html: '', grid: null })
  const [savedMsg, setSavedMsg] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (kind === 'pdf' || kind === 'image' || kind === 'video' || kind === 'other') {
        setState({ loading: false, error: '', html: '', grid: null })
        return
      }
      try {
        const { data, error } = await supabase.storage.from(bucket).download(path)
        if (error) throw error
        const e = extOf(name)
        if (kind === 'doc') {
          if (e === 'docx') {
            const mammoth = await loadMammoth()
            const ab = await data.arrayBuffer()
            const { value } = await mammoth.convertToHtml({ arrayBuffer: ab })
            if (!cancelled) setState({ loading: false, error: '', html: value || '', grid: null })
          } else {
            const text = await data.text()
            const html = /<\w+[\s>]/.test(text) ? text : escapeHtml(text).replace(/\n/g, '<br>')
            if (!cancelled) setState({ loading: false, error: '', html, grid: null })
          }
        } else if (kind === 'sheet') {
          const XLSX = await loadXLSX()
          const ab = await data.arrayBuffer()
          const wb = XLSX.read(ab, { type: 'array' })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' })
          if (!cancelled) setState({ loading: false, error: '', html: '', grid: aoa.length ? aoa : [['']] })
        }
      } catch (err) {
        if (!cancelled) setState({ loading: false, error: err?.message || 'Could not open this file.', html: '', grid: null })
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function upload(savePath, blob, contentType) {
    const { error } = await supabase.storage.from(bucket).upload(savePath, blob, { upsert: true, contentType })
    if (error) throw error
  }

  // Save handlers passed into the editors.
  async function saveDoc(html) {
    const header =
      "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
      "xmlns:w='urn:schemas-microsoft-com:office:word' " +
      "xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'></head><body>"
    const blob = new Blob(['﻿', header + html + '</body></html>'], { type: 'application/msword' })
    // .docx can't be regenerated faithfully — save edits as a .doc sibling.
    const savePath = `${prefix}/${baseOf(name)}.doc`
    await upload(savePath, blob, 'application/msword')
    flashSaved(savePath.split('/').pop())
  }

  async function saveSheet(grid) {
    const XLSX = await loadXLSX()
    const e = extOf(name)
    const ws = XLSX.utils.aoa_to_sheet(grid)
    let savePath, blob, ct
    if (e === 'csv' || e === 'tsv') {
      const csv = XLSX.utils.sheet_to_csv(ws)
      savePath = path
      blob = new Blob([csv], { type: 'text/csv' })
      ct = 'text/csv'
    } else {
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
      const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      savePath = e === 'xlsx' ? path : `${prefix}/${baseOf(name)}.xlsx`
      blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      ct = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }
    await upload(savePath, blob, ct)
    flashSaved(savePath.split('/').pop())
  }

  function flashSaved(fname) {
    setSavedMsg(`Saved ${fname}`)
    onSaved?.()
    setTimeout(() => setSavedMsg(''), 4000)
  }

  function downloadOriginal() {
    const a = document.createElement('a')
    a.href = publicUrl
    a.download = name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/50 flex flex-col"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-12 bg-white border-b border-gray-200 flex-shrink-0">
        <span className="text-sm font-semibold text-gray-800 truncate">{name}</span>
        {savedMsg && <span className="text-xs text-green-700 font-medium whitespace-nowrap">✓ {savedMsg}</span>}
        <div className="ml-auto flex items-center gap-2">
          {(kind === 'pdf' || kind === 'image' || kind === 'video' || kind === 'other' || state.error) && (
            <button onClick={downloadOriginal} className="btn-secondary text-xs px-3 py-1.5">Download</button>
          )}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none px-1">×</button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-auto bg-gray-100 p-4">
        {state.loading ? (
          <div className="flex items-center justify-center h-full text-gray-500 gap-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-700" />
            Opening {name}…
          </div>
        ) : state.error ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3">
            <p className="text-sm">Couldn’t open this file in the editor.</p>
            <p className="text-xs text-gray-400">{state.error}</p>
            <button onClick={downloadOriginal} className="btn-primary text-sm px-4 py-2">Download instead</button>
          </div>
        ) : kind === 'doc' ? (
          <RichTextCreator mode="doc" initialTitle={baseOf(name)} initialHtml={state.html} onSave={saveDoc} />
        ) : kind === 'sheet' ? (
          <SheetCreator initialTitle={baseOf(name)} initialGrid={state.grid} onSave={saveSheet} />
        ) : kind === 'pdf' ? (
          <iframe title={name} src={publicUrl} className="w-full h-full bg-white rounded-lg border border-gray-200" />
        ) : kind === 'image' ? (
          <div className="flex items-center justify-center h-full">
            <img src={publicUrl} alt={name} className="max-w-full max-h-full object-contain rounded-lg shadow" />
          </div>
        ) : kind === 'video' ? (
          <div className="flex items-center justify-center h-full">
            <video src={publicUrl} controls className="max-w-full max-h-full rounded-lg shadow" />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3">
            <p className="text-sm">This file type can’t be previewed.</p>
            <button onClick={downloadOriginal} className="btn-primary text-sm px-4 py-2">Download</button>
          </div>
        )}
      </div>
    </div>
  )
}
