#!/usr/bin/env node
/*
 * Uploads the 6 module help guides into the Help Desk → Documentation section,
 * each filed under its matching category.
 *
 * Run from the repo root:
 *     node help-docs-upload/upload-help-docs.cjs
 *
 * Requires .env in the repo root with:
 *     SUPABASE_URL=...
 *     SUPABASE_SERVICE_ROLE_KEY=...
 * (already present — the import scripts use the same keys)
 *
 * Safe to re-run: it skips any doc whose title already exists in its category.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const ROOT = path.resolve(__dirname, '..');
const DIR = __dirname;
const MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// file  ->  { category (must match a help_doc_categories.name), title, description }
const PLAN = [
  { file: 'Org Chart - User Guide.docx',        category: 'Org Chart',      title: 'Org Chart — User Guide',        description: 'Step-by-step end-user guide: building charts, positions, areas, connections, templates.' },
  { file: 'HR - User Guide.docx',               category: 'HR',             title: 'HR — User Guide',               description: 'Step-by-step end-user guide: employees, applicants, positions, access, permissions, reviews.' },
  { file: 'Contacts - User Guide.docx',         category: 'Contacts',       title: 'Contacts — User Guide',         description: 'Step-by-step end-user guide: adding contacts/companies, stages, communication log, promoting to opportunities.' },
  { file: 'Opportunities - User Guide.docx',    category: 'Opportunities',  title: 'Opportunities — User Guide',    description: 'Step-by-step end-user guide: opportunities pipeline, estimates, detail page, settings.' },
  { file: 'Jobs - User Guide.docx',             category: 'Jobs',           title: 'Jobs — User Guide',             description: 'Step-by-step end-user guide: job list, info & assignments, schedule, tracking, finance, files.' },
  { file: 'Finance (Weekly FP) - User Guide.docx', category: 'Finance',     title: 'Finance (Weekly FP) — User Guide', description: 'Step-by-step end-user guide: weekly collections, payables, and financial planning.' },
  { file: 'Statistics - User Guide.docx',        category: 'Statistics',  title: 'Statistics — User Guide',       description: 'Step-by-step end-user guide: graphs, stat types, value entry, import/export, print, archive, ownership & sharing.' },
];

function loadEnv() {
  const env = {};
  for (const l of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')) {
    const i = l.indexOf('='); if (i < 0) continue;
    env[l.slice(0, i).trim()] = l.slice(i + 1).trim();
  }
  return env;
}
function safeName(n) { return n.replace(/[^a-zA-Z0-9.\-_]+/g, '_'); }

(async () => {
  const env = loadEnv();
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env'); process.exit(1);
  }
  const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const { data: cats, error: ce } = await sb.from('help_doc_categories').select('id,name');
  if (ce) { console.error('Could not read categories:', ce.message); process.exit(1); }
  const catByName = Object.fromEntries(cats.map(c => [c.name.toLowerCase(), c.id]));

  const { data: existing } = await sb.from('help_docs').select('title,category_id');
  const has = new Set((existing || []).map(d => (d.category_id || '') + '|' + (d.title || '').toLowerCase()));

  let ok = 0, skip = 0, fail = 0;
  for (const item of PLAN) {
    const catId = catByName[item.category.toLowerCase()];
    if (!catId) { console.error(`✗ ${item.title}: category "${item.category}" not found — skipping`); fail++; continue; }
    if (has.has(catId + '|' + item.title.toLowerCase())) { console.log(`• ${item.title}: already in ${item.category} — skipping`); skip++; continue; }

    const filePath = path.join(DIR, item.file);
    const bytes = fs.readFileSync(filePath);
    const storagePath = `docs/${crypto.randomUUID()}_${safeName(item.file)}`;

    const up = await sb.storage.from('help-resources').upload(storagePath, bytes, { contentType: MIME, upsert: false });
    if (up.error) { console.error(`✗ ${item.title}: upload failed — ${up.error.message}`); fail++; continue; }

    const ins = await sb.from('help_docs').insert({
      category_id: catId, title: item.title, description: item.description,
      storage_path: storagePath, file_name: item.file, mime_type: MIME, size_bytes: bytes.length, sort_order: 0,
    });
    if (ins.error) {
      console.error(`✗ ${item.title}: DB insert failed — ${ins.error.message}`);
      await sb.storage.from('help-resources').remove([storagePath]); // roll back the orphaned file
      fail++; continue;
    }
    console.log(`✓ ${item.title} → Help ▸ Documentation ▸ ${item.category}`);
    ok++;
  }
  console.log(`\nDone. Uploaded ${ok}, skipped ${skip}, failed ${fail}.`);
  process.exit(fail ? 1 : 0);
})();
