import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'

// ── Field definitions ─────────────────────────────────────────────────────────
const CONTACT_FIELDS = [
  { value: '',               label: '— Skip column —' },
  { value: 'full_name',      label: 'Full Name (auto-split → First + Last)' },
  { value: 'first_name',     label: 'First Name' },
  { value: 'last_name',      label: 'Last Name' },
  { value: 'secondary_first_name', label: 'Spouse/Partner First Name' },
  { value: 'secondary_last_name',  label: 'Spouse/Partner Last Name' },
  { value: 'company_name',   label: 'Company' },
  { value: 'phone',          label: 'Phone' },
  { value: 'cell',           label: 'Cell' },
  { value: 'email',          label: 'Email' },
  { value: 'street_address', label: 'Street Address' },
  { value: 'city',           label: 'City' },
  { value: 'state',          label: 'State' },
  { value: 'zip',            label: 'Zip' },
  { value: 'company_street', label: 'Company Street Address' },
  { value: 'company_city',   label: 'Company City' },
  { value: 'company_state',  label: 'Company State' },
  { value: 'company_zip',    label: 'Company Zip' },
  { value: 'contact_type',   label: 'Contact Type' },
  { value: 'stage',          label: 'Stage' },
  { value: 'source',         label: 'Contact Source' },
  { value: 'date_of_birth',  label: 'Date of Birth' },
  { value: 'notes',                label: 'Notes' },
  { value: 'project_description', label: 'Project Description' },
  { value: 'tags',                label: 'Tags (comma-separated)' },
  { value: 'dnd_phone',           label: 'DND Phone (true/false)' },
  { value: 'dnd_email',           label: 'DND Email (true/false)' },
  { value: 'dnd_sms',             label: 'DND SMS (true/false)' },
]

const EXPORT_FIELDS = [
  { value: 'first_name',     label: 'First Name',     on: true  },
  { value: 'last_name',      label: 'Last Name',      on: true  },
  { value: 'secondary_first_name', label: 'Spouse/Partner First', on: false },
  { value: 'secondary_last_name',  label: 'Spouse/Partner Last',  on: false },
  { value: 'company_name',   label: 'Company',        on: true  },
  { value: 'phone',          label: 'Phone',          on: true  },
  { value: 'cell',           label: 'Cell',           on: true  },
  { value: 'email',          label: 'Email',          on: true  },
  { value: 'street_address', label: 'Street Address', on: true  },
  { value: 'city',           label: 'City',           on: true  },
  { value: 'state',          label: 'State',          on: true  },
  { value: 'zip',            label: 'Zip',            on: false },
  { value: 'company_street', label: 'Company Street', on: false },
  { value: 'company_city',   label: 'Company City',   on: false },
  { value: 'company_state',  label: 'Company State',  on: false },
  { value: 'company_zip',    label: 'Company Zip',    on: false },
  { value: 'contact_type',   label: 'Contact Type',   on: true  },
  { value: 'stage',          label: 'Stage',          on: true  },
  { value: 'source',         label: 'Contact Source', on: false },
  { value: 'date_of_birth',  label: 'Date of Birth',  on: false },
  { value: 'notes',                label: 'Notes',               on: false },
  { value: 'project_description', label: 'Project Description', on: false },
  { value: 'tags',                label: 'Tags',                on: false },
  { value: 'dnd_phone',           label: 'DND Phone',           on: false },
  { value: 'dnd_email',           label: 'DND Email',           on: false },
  { value: 'dnd_sms',             label: 'DND SMS',             on: false },
  { value: 'created_at',          label: 'Date Added',          on: true  },
]

const VALID_STAGES = ['new_lead','warm_lead','consultation','quoted','won','lost','nurture','bt_import','ghl_import']

// Split "First Last" or "Last, First" into { first_name, last_name }
function splitFullName(raw) {
  const name = (raw || '').trim()
  if (!name) return { first_name: '', last_name: '' }

  // "Last, First Middle" format
  if (name.includes(',')) {
    const [last, ...rest] = name.split(',').map(s => s.trim())
    return { first_name: rest.join(' ').trim(), last_name: last }
  }

  // "First Last" or "First Middle Last"
  const parts = name.split(/\s+/)
  if (parts.length === 1) return { first_name: '', last_name: parts[0] }
  const last  = parts[parts.length - 1]
  const first = parts.slice(0, parts.length - 1).join(' ')
  return { first_name: first, last_name: last }
}

// Auto-detect file column → contact field
function autoDetect(header) {
  const h = header.toLowerCase().replace(/[\s_\-().]/g, '')
  if (['name','fullname','contactname','clientname','customername'].includes(h))    return 'full_name'
  if (['firstname','fname','first'].includes(h))                                    return 'first_name'
  if (['lastname','lname','last','surname','familyname'].includes(h))               return 'last_name'
  if (['spousefirst','partnerfirst','secondaryfirst','spousepartnerfirst'].includes(h))   return 'secondary_first_name'
  if (['spouselast','partnerlast','secondarylast','spousepartnerlast'].includes(h))       return 'secondary_last_name'
  if (['company','companyname','organization','org','business','businessname'].includes(h)) return 'company_name'
  if (['phone','phonenumber','homephone','telephone','tel','ph','workphone'].includes(h))     return 'phone'
  if (['cell','cellphone','mobile','mobilephone','cellular','cellnumber'].includes(h))       return 'cell'
  if (['email','emailaddress','mail','emailaddr'].includes(h))                      return 'email'
  if (['address','streetaddress','street','addr','streetaddr'].includes(h))         return 'street_address'
  if (['city','town'].includes(h))                                                  return 'city'
  if (['state','province','region','st'].includes(h))                               return 'state'
  if (['zip','zipcode','postalcode','postal','postcode'].includes(h))               return 'zip'
  if (['companystreet','companyaddress','bizstreet','bizaddress'].includes(h))      return 'company_street'
  if (['companycity','bizcity'].includes(h))                                        return 'company_city'
  if (['companystate','bizstate'].includes(h))                                      return 'company_state'
  if (['companyzip','bizzip','companyzipcode'].includes(h))                         return 'company_zip'
  if (['contacttype','type','clienttype','customertype'].includes(h))               return 'contact_type'
  if (['stage','status','leadstage','pipelinestage'].includes(h))                   return 'stage'
  if (['source','leadsource','contactsource','referral','origin','howfound'].includes(h)) return 'source'
  if (['dob','dateofbirth','birthdate','birthday'].includes(h))                     return 'date_of_birth'
  if (['notes','note','comments','comment','memo','description'].includes(h))       return 'notes'
  if (['projectdescription','projectdesc','project','projectdetails'].includes(h))  return 'project_description'
  if (['tags','tag','labels','label','categories'].includes(h))                     return 'tags'
  if (['dndphone','donotcallphone','nophone','phonednd'].includes(h))               return 'dnd_phone'
  if (['dndemail','donotcallemail','noemail','emaildnd'].includes(h))               return 'dnd_email'
  if (['dndsms','donotcallsms','nosms','smsdnd','dndtext'].includes(h))             return 'dnd_sms'
  return ''
}

// Parse boolean-like values from imported files
function parseBool(val) {
  const v = String(val || '').trim().toLowerCase()
  return ['true','yes','1','y','on'].includes(v)
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600'
const btnPrimary = 'px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-800 disabled:opacity-50 transition-colors'
const btnSecondary = 'px-4 py-2 border border-gray-200 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 transition-colors'

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT MODAL
// ══════════════════════════════════════════════════════════════════════════════
export function ExportModal({ contacts, onClose }) {
  const [format,     setFormat]     = useState('csv')
  const [selected,   setSelected]   = useState(new Set(EXPORT_FIELDS.filter(f => f.on).map(f => f.value)))
  const [exporting,  setExporting]  = useState(false)

  function toggle(v) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(v) ? next.delete(v) : next.add(v)
      return next
    })
  }

  function doExport() {
    setExporting(true)
    try {
      const cols = EXPORT_FIELDS.filter(f => selected.has(f.value))
      const headers = cols.map(c => c.label)
      const rows = contacts.map(c =>
        cols.map(col => {
          if (col.value === 'created_at' && c[col.value])
            return new Date(c[col.value]).toLocaleDateString()
          if (col.value === 'tags')
            return (c.tags || []).join(', ')
          if (['dnd_phone','dnd_email','dnd_sms'].includes(col.value))
            return c[col.value] ? 'true' : 'false'
          return c[col.value] ?? ''
        })
      )

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])

      // Auto-size columns
      const colWidths = headers.map((h, i) => ({
        wch: Math.max(h.length, ...rows.map(r => String(r[i] || '').length), 10)
      }))
      ws['!cols'] = colWidths

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Contacts')

      const filename = `contacts-${new Date().toISOString().slice(0, 10)}`
      if (format === 'csv') {
        XLSX.writeFile(wb, `${filename}.csv`, { bookType: 'csv' })
      } else {
        XLSX.writeFile(wb, `${filename}.xlsx`)
      }
      onClose()
    } finally {
      setExporting(false)
    }
  }

  const allOn  = EXPORT_FIELDS.every(f => selected.has(f.value))
  const allOff = selected.size === 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">

        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Export Contacts</h2>
            <p className="text-xs text-gray-400 mt-0.5">{contacts.length.toLocaleString()} contact{contacts.length !== 1 ? 's' : ''} selected</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        {/* Format */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Format</p>
          <div className="flex gap-2">
            {[{ v: 'csv', label: 'CSV', sub: 'Excel, Google Sheets' }, { v: 'xlsx', label: 'Excel (.xlsx)', sub: 'Microsoft Excel' }].map(f => (
              <button
                key={f.v}
                onClick={() => setFormat(f.v)}
                className={`flex-1 py-2.5 px-3 rounded-lg border text-left transition-colors ${
                  format === f.v ? 'border-green-600 bg-green-50 text-green-800' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <p className="text-sm font-semibold">{f.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{f.sub}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Fields */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fields to export</p>
            <div className="flex gap-2">
              <button onClick={() => setSelected(new Set(EXPORT_FIELDS.map(f => f.value)))} className="text-xs text-green-700 hover:underline disabled:opacity-40" disabled={allOn}>All</button>
              <span className="text-gray-300">·</span>
              <button onClick={() => setSelected(new Set())} className="text-xs text-gray-400 hover:underline disabled:opacity-40" disabled={allOff}>None</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {EXPORT_FIELDS.map(f => (
              <label key={f.value} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selected.has(f.value)}
                  onChange={() => toggle(f.value)}
                  className="w-3.5 h-3.5 rounded accent-green-600"
                />
                {f.label}
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className={btnSecondary + ' flex-1'}>Cancel</button>
          <button
            onClick={doExport}
            disabled={exporting || selected.size === 0}
            className={btnPrimary + ' flex-1'}
          >
            {exporting ? 'Exporting…' : `Export ${contacts.length} Contact${contacts.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// IMPORT MODAL
// ══════════════════════════════════════════════════════════════════════════════
export function ImportModal({ onDone, onClose }) {
  const [step,      setStep]      = useState(1)   // 1 upload · 2 map · 3 preview · 4 done
  const [fileRows,  setFileRows]  = useState([])
  const [headers,   setHeaders]   = useState([])
  const [mapping,   setMapping]   = useState({})  // { colHeader: contactField }
  const [preview,   setPreview]   = useState(null) // { toImport[], skipped[] }
  const [result,    setResult]    = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [dragOver,  setDragOver]  = useState(false)
  const [fileError, setFileError] = useState('')
  const fileRef = useRef()

  // ── Step 1: parse file ───────────────────────────────────────────────────
  function handleFile(file) {
    setFileError('')
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['csv','xlsx','xls'].includes(ext)) {
      setFileError('Please upload a .csv, .xlsx, or .xls file.')
      return
    }
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const data = new Uint8Array(e.target.result)
        const wb   = XLSX.read(data, { type: 'array' })
        const ws   = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

        if (rows.length < 2) { setFileError('File appears to be empty or has only a header row.'); return }

        const hdrs = rows[0].map(h => String(h).trim()).filter(Boolean)
        const dataRows = rows.slice(1).filter(r => r.some(cell => String(cell).trim()))

        if (hdrs.length === 0) { setFileError('Could not detect column headers in the first row.'); return }

        setHeaders(hdrs)
        setFileRows(dataRows.map(r => r.slice(0, hdrs.length + 5))) // guard extra cols
        const auto = {}
        hdrs.forEach(h => { auto[h] = autoDetect(h) })
        setMapping(auto)
        setStep(2)
      } catch {
        setFileError('Could not read the file. Make sure it is a valid CSV or Excel file.')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  // ── Step 2 → Step 3: build preview with duplicate check ──────────────────
  async function buildPreview() {
    setLoading(true)
    try {
      const { data: existing } = await supabase
        .from('contacts')
        .select('email, phone')

      const existEmails = new Set(
        (existing || []).map(c => (c.email || '').toLowerCase().trim()).filter(Boolean)
      )
      const existPhones = new Set(
        (existing || []).map(c => (c.phone || '').replace(/\D/g, '')).filter(Boolean)
      )

      const toImport = []
      const skipped  = []

      fileRows.forEach((row, rowIdx) => {
        const mapped = {}
        headers.forEach((h, idx) => {
          const field = mapping[h]
          if (!field) return
          if (field === 'full_name') {
            // Expand full_name into first_name + last_name
            const { first_name, last_name } = splitFullName(String(row[idx] ?? ''))
            if (!mapped.first_name) mapped.first_name = first_name
            if (!mapped.last_name)  mapped.last_name  = last_name
          } else {
            mapped[field] = String(row[idx] ?? '').trim()
          }
        })

        if (!mapped.first_name && !mapped.last_name && !mapped.email && !mapped.phone) return

        const email = (mapped.email || '').toLowerCase().trim()
        const phone = (mapped.phone || '').replace(/\D/g, '')
        const isDup = (email && existEmails.has(email)) || (phone && existPhones.has(phone))

        if (isDup) {
          skipped.push({ _row: rowIdx + 2, ...mapped })
        } else {
          toImport.push(mapped)
          if (email) existEmails.add(email)
          if (phone) existPhones.add(phone)
        }
      })

      setPreview({ toImport, skipped })
      setStep(3)
    } finally {
      setLoading(false)
    }
  }

  // ── Step 3 → Step 4: import ───────────────────────────────────────────────
  async function doImport() {
    setLoading(true)
    try {
      const records = preview.toImport.map(r => ({
        first_name:           r.first_name           || '',
        last_name:            r.last_name            || '',
        secondary_first_name: r.secondary_first_name || null,
        secondary_last_name:  r.secondary_last_name  || null,
        company_name:         r.company_name         || null,
        phone:                r.phone                || null,
        cell:                 r.cell                 || null,
        email:                r.email                || null,
        street_address:       r.street_address       || null,
        city:                 r.city                 || null,
        state:                r.state                || null,
        zip:                  r.zip                  || null,
        company_street:       r.company_street       || null,
        company_city:         r.company_city         || null,
        company_state:        r.company_state        || null,
        company_zip:          r.company_zip          || null,
        contact_type:         r.contact_type         || null,
        stage:                VALID_STAGES.includes(r.stage) ? r.stage : 'new_lead',
        source:               r.source               || null,
        date_of_birth:        r.date_of_birth        || null,
        notes:                r.notes                || null,
        project_description:  r.project_description  || null,
        tags:                 r.tags ? r.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        dnd_phone:            r.dnd_phone ? parseBool(r.dnd_phone) : false,
        dnd_email:            r.dnd_email ? parseBool(r.dnd_email) : false,
        dnd_sms:              r.dnd_sms   ? parseBool(r.dnd_sms)   : false,
      }))

      let inserted = 0
      let errors   = 0
      const BATCH  = 100
      for (let i = 0; i < records.length; i += BATCH) {
        const batch = records.slice(i, i + BATCH)
        const { error } = await supabase.from('contacts').insert(batch)
        if (error) errors += batch.length
        else       inserted += batch.length
      }

      setResult({ inserted, skipped: preview.skipped.length, errors })
      setStep(4)
      if (inserted > 0) onDone()
    } finally {
      setLoading(false)
    }
  }

  const mappedCount = Object.values(mapping).filter(Boolean).length

  // ── Preview sample helper ─────────────────────────────────────────────────
  const SAMPLE = 3

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Import Contacts</h2>
            <div className="flex items-center gap-2 mt-1">
              {[1,2,3,4].map(n => (
                <div key={n} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    step > n  ? 'bg-green-600 text-white' :
                    step === n ? 'bg-green-700 text-white ring-2 ring-green-200' :
                                 'bg-gray-100 text-gray-400'
                  }`}>
                    {step > n ? '✓' : n}
                  </div>
                  <span className={`text-xs font-medium hidden sm:inline ${step === n ? 'text-gray-700' : 'text-gray-400'}`}>
                    {['Upload','Map Fields','Preview','Done'][n-1]}
                  </span>
                  {n < 4 && <span className="text-gray-200 text-xs">›</span>}
                </div>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl flex-shrink-0">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── STEP 1: Upload ── */}
          {step === 1 && (
            <div>
              <p className="text-sm text-gray-500 mb-4">
                Upload a CSV or Excel file. The first row should contain column headers.
              </p>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                  dragOver ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="text-4xl mb-3">📂</div>
                <p className="text-sm font-semibold text-gray-700">Drop your file here or click to browse</p>
                <p className="text-xs text-gray-400 mt-1">Supports .csv, .xlsx, .xls</p>
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
                  onChange={e => handleFile(e.target.files[0])} />
              </div>
              {fileError && (
                <div className="mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
                  {fileError}
                </div>
              )}

              <div className="mt-5 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-xs font-semibold text-gray-600 mb-2">Expected column names (auto-detected):</p>
                <div className="flex flex-wrap gap-1.5">
                  {['First Name', 'Last Name', 'Company', 'Phone', 'Email', 'Address', 'City', 'State', 'Zip', 'Stage', 'Source', 'Notes'].map(f => (
                    <span key={f} className="px-2 py-0.5 bg-white border border-gray-200 rounded text-xs text-gray-500">{f}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Map columns ── */}
          {step === 2 && (
            <div>
              <p className="text-sm text-gray-500 mb-1">
                Match each column from your file to a contact field. Columns set to <strong>Skip</strong> will be ignored.
              </p>
              <p className="text-xs text-gray-400 mb-4">
                {fileRows.length} data row{fileRows.length !== 1 ? 's' : ''} detected · {mappedCount} column{mappedCount !== 1 ? 's' : ''} mapped
              </p>

              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase w-1/3">File Column</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase w-1/4">Sample Value</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Map to Field</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {headers.map((h, idx) => {
                      const sample = fileRows.slice(0, SAMPLE)
                        .map(r => String(r[idx] ?? '').trim())
                        .filter(Boolean)[0] || ''
                      return (
                        <tr key={h} className="hover:bg-gray-50">
                          <td className="px-4 py-2">
                            <span className="font-medium text-gray-800">{h}</span>
                          </td>
                          <td className="px-4 py-2">
                            <span className="text-xs text-gray-400 truncate block max-w-[120px]">{sample || '—'}</span>
                          </td>
                          <td className="px-4 py-2">
                            <select
                              value={mapping[h] || ''}
                              onChange={e => setMapping(prev => ({ ...prev, [h]: e.target.value }))}
                              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-green-500"
                            >
                              {CONTACT_FIELDS.map(f => (
                                <option key={f.value} value={f.value}>{f.label}</option>
                              ))}
                            </select>
                            {mapping[h] === 'full_name' && (
                              <p className="text-xs text-green-600 mt-1">
                                ✓ Will split into First + Last. Handles "Smith, John" or "John Smith"
                              </p>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── STEP 3: Preview ── */}
          {step === 3 && preview && (
            <div>
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{preview.toImport.length}</p>
                  <p className="text-xs text-green-600 font-medium mt-0.5">Will be imported</p>
                </div>
                <div className={`${preview.skipped.length > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'} border rounded-xl p-3 text-center`}>
                  <p className={`text-2xl font-bold ${preview.skipped.length > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>{preview.skipped.length}</p>
                  <p className={`text-xs font-medium mt-0.5 ${preview.skipped.length > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>Skipped (duplicates)</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-gray-600">{preview.toImport.length + preview.skipped.length}</p>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">Total rows</p>
                </div>
              </div>

              {preview.toImport.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Preview — first {Math.min(SAMPLE, preview.toImport.length)} of {preview.toImport.length}
                  </p>
                  <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          {['Name', 'Company', 'Phone', 'Email', 'City', 'Stage'].map(h => (
                            <th key={h} className="text-left px-3 py-2 font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {preview.toImport.slice(0, SAMPLE).map((r, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">
                              {[r.last_name, r.first_name].filter(Boolean).join(', ') || '—'}
                            </td>
                            <td className="px-3 py-2 text-gray-600">{r.company_name || '—'}</td>
                            <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{r.phone || '—'}</td>
                            <td className="px-3 py-2 text-gray-600 max-w-[140px] truncate">{r.email || '—'}</td>
                            <td className="px-3 py-2 text-gray-600">{r.city || '—'}</td>
                            <td className="px-3 py-2 text-gray-600">{r.stage || 'new_lead'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {preview.skipped.length > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <p className="text-xs font-semibold text-yellow-700 mb-1">
                    ⚠ {preview.skipped.length} row{preview.skipped.length !== 1 ? 's' : ''} will be skipped — duplicate email or phone already in your contacts.
                  </p>
                  <div className="text-xs text-yellow-600 space-y-0.5 max-h-20 overflow-y-auto">
                    {preview.skipped.slice(0, 5).map((r, i) => (
                      <p key={i}>Row {r._row}: {[r.last_name, r.first_name].filter(Boolean).join(', ') || r.email || r.phone || 'Unknown'}</p>
                    ))}
                    {preview.skipped.length > 5 && <p className="text-yellow-500">…and {preview.skipped.length - 5} more</p>}
                  </div>
                </div>
              )}

              {preview.toImport.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-4xl mb-2">🤷</p>
                  <p className="font-medium text-gray-600">No new contacts to import</p>
                  <p className="text-sm mt-1">All rows were identified as duplicates.</p>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 4: Done ── */}
          {step === 4 && result && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">{result.errors === 0 ? '✅' : '⚠️'}</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                {result.errors === 0 ? 'Import complete!' : 'Import finished with errors'}
              </h3>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                  <span className="text-green-700 font-medium">Contacts imported</span>
                  <span className="font-bold text-green-700">{result.inserted}</span>
                </div>
                {result.skipped > 0 && (
                  <div className="flex items-center justify-between px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <span className="text-yellow-700 font-medium">Duplicates skipped</span>
                    <span className="font-bold text-yellow-700">{result.skipped}</span>
                  </div>
                )}
                {result.errors > 0 && (
                  <div className="flex items-center justify-between px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
                    <span className="text-red-700 font-medium">Errors</span>
                    <span className="font-bold text-red-700">{result.errors}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          {step === 1 && (
            <button onClick={onClose} className={btnSecondary + ' flex-1'}>Cancel</button>
          )}

          {step === 2 && (
            <>
              <button onClick={() => setStep(1)} className={btnSecondary}>← Back</button>
              <button
                onClick={buildPreview}
                disabled={loading || mappedCount === 0}
                className={btnPrimary + ' flex-1'}
              >
                {loading ? 'Checking…' : 'Preview Import →'}
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <button onClick={() => setStep(2)} className={btnSecondary} disabled={loading}>← Back</button>
              <button
                onClick={doImport}
                disabled={loading || preview?.toImport.length === 0}
                className={btnPrimary + ' flex-1'}
              >
                {loading ? 'Importing…' : `Import ${preview?.toImport.length ?? 0} Contact${preview?.toImport.length !== 1 ? 's' : ''}`}
              </button>
            </>
          )}

          {step === 4 && (
            <button onClick={onClose} className={btnPrimary + ' flex-1'}>Done</button>
          )}
        </div>
      </div>
    </div>
  )
}
