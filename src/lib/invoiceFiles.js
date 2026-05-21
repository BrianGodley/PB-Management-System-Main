// src/lib/invoiceFiles.js
//
// Shared helpers for invoice attachments. Files live in the existing
// 'job-files' Storage bucket (same bucket CO + job attachments use) and are
// tracked as job_files rows with invoice_id set, file_category 'invoice'.
import { supabase } from './supabase'

const BUCKET = 'job-files'

export async function listInvoiceFiles(invoiceId) {
  const { data, error } = await supabase
    .from('job_files')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('created_at', { ascending: true })
  return { data: data || [], error }
}

// Uploads one file to Storage, then records it in job_files.
export async function uploadInvoiceFile(invoiceId, jobId, file, userId) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `invoice-attachments/${invoiceId}/${Date.now()}_${safeName}`
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false })
  if (upErr) return { error: upErr }
  const { data, error } = await supabase
    .from('job_files')
    .insert({
      job_id: jobId,
      invoice_id: invoiceId,
      file_name: file.name,
      file_type: file.type || null,
      file_category: 'invoice',
      storage_path: path,
      file_size: file.size,
      uploaded_by: userId || null,
    })
    .select()
    .single()
  return { data, error }
}

export async function deleteInvoiceFile(row) {
  if (row?.storage_path) await supabase.storage.from(BUCKET).remove([row.storage_path])
  return supabase.from('job_files').delete().eq('id', row.id)
}

// 5-minute signed URL for a private-bucket download.
export async function invoiceFileUrl(path) {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 300)
  return data?.signedUrl || null
}

export function fileSizeLabel(bytes) {
  const n = Number(bytes)
  if (!Number.isFinite(n) || n <= 0) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}
