import { supabase } from './supabase'

// ─────────────────────────────────────────────────────────────────────────────
// Category reconciliation across the three rate systems. The CATEGORY level is a
// single shared namespace: material (`category`), labor (`labor_category`) and
// subcontractor (`subcontractor_category`) must always hold the same set of
// category names. Sub-categories stay independent per system.
//
// Free-text category columns that must track a rename/delete:
//   labor_rates.category, subcontractor_rates.category, misc_rates.category
// (material items link by category_id, so they follow the row automatically.)
// ─────────────────────────────────────────────────────────────────────────────

export const CATEGORY_TABLES = ['category', 'labor_category', 'subcontractor_category']

const slugCode = name => {
  const base = (name || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()
  return base || 'GEN'
}

// A code unique within `table` (matches the app's misc-rate style: 6-char slug,
// 2-digit numeric suffix on collision).
async function uniqueCode(table, name) {
  const base = slugCode(name)
  const { data } = await supabase.from(table).select('code').ilike('code', `${base}%`)
  const taken = new Set((data || []).map(r => (r.code || '').toUpperCase()))
  if (!taken.has(base)) return base
  for (let i = 1; i < 100; i++) {
    const c = base + String(i).padStart(2, '0')
    if (!taken.has(c)) return c
  }
  return base + String(Date.now()).slice(-4)
}

async function catRow(table, name) {
  const { data } = await supabase.from(table).select('id, name, code').eq('name', name).limit(1)
  return data && data.length ? data[0] : null
}

// Ensure `name` exists as a category in ALL three tables (insert where missing).
// Returns the list of tables it was newly added to.
export async function ensureCategoryEverywhere(name) {
  const nm = (name || '').trim()
  const added = []
  if (!nm) return added
  for (const table of CATEGORY_TABLES) {
    if (await catRow(table, nm)) continue
    const code = await uniqueCode(table, nm)
    const { error } = await supabase.from(table).insert({ code, name: nm })
    if (!error) added.push(table)
  }
  return added
}

// Rename a category everywhere: the three category tables plus the free-text
// category columns on labor/subcontractor/misc rate rows.
export async function renameCategoryEverywhere(oldName, newName) {
  const o = (oldName || '').trim()
  const n = (newName || '').trim()
  if (!o || !n || o === n) return
  for (const table of CATEGORY_TABLES) {
    await supabase.from(table).update({ name: n }).eq('name', o)
  }
  await supabase.from('labor_rates').update({ category: n }).eq('category', o)
  await supabase.from('subcontractor_rates').update({ category: n }).eq('category', o)
  await supabase.from('misc_rates').update({ category: n }).eq('category', o)
  await ensureCategoryEverywhere(n)
}

// Delete a category everywhere. Contents in EACH system are reassigned to
// `targetName` (which must already exist as a category) before the old category
// row is removed. Material/labor/sub sub-categories + items are moved; free-text
// rate categories are rewritten.
export async function deleteCategoryEverywhere(oldName, targetName) {
  const o = (oldName || '').trim()
  const t = (targetName || '').trim()
  if (!o) return

  // Material scope — subcategory + material link by id.
  {
    const oldRow = await catRow('category', o)
    const tgt = t ? await catRow('category', t) : null
    if (oldRow) {
      if (tgt) {
        await supabase.from('subcategory').update({ category_id: tgt.id }).eq('category_id', oldRow.id)
        await supabase.from('material').update({ category_id: tgt.id }).eq('category_id', oldRow.id)
      }
      await supabase.from('category').delete().eq('id', oldRow.id)
    }
  }
  // Labor scope — labor_subcategory links by id; labor_rates.category is text.
  {
    const oldRow = await catRow('labor_category', o)
    const tgt = t ? await catRow('labor_category', t) : null
    if (oldRow) {
      if (tgt) await supabase.from('labor_subcategory').update({ category_id: tgt.id }).eq('category_id', oldRow.id)
      await supabase.from('labor_category').delete().eq('id', oldRow.id)
    }
    if (t) await supabase.from('labor_rates').update({ category: t }).eq('category', o)
  }
  // Subcontractor scope — subcontractor_subcategory by id; subcontractor_rates.category is text.
  {
    const oldRow = await catRow('subcontractor_category', o)
    const tgt = t ? await catRow('subcontractor_category', t) : null
    if (oldRow) {
      if (tgt) await supabase.from('subcontractor_subcategory').update({ category_id: tgt.id }).eq('category_id', oldRow.id)
      await supabase.from('subcontractor_category').delete().eq('id', oldRow.id)
    }
    if (t) await supabase.from('subcontractor_rates').update({ category: t }).eq('category', o)
  }
  // Misc rates — free-text category.
  if (t) await supabase.from('misc_rates').update({ category: t }).eq('category', o)
}

// Detect drift: category names present in some tables but missing from others.
// Returns { aligned: bool, missing: { table: [names] }, allNames: [] }.
export async function detectCategoryDrift() {
  const sets = {}
  const all = new Set()
  for (const table of CATEGORY_TABLES) {
    const { data } = await supabase.from(table).select('name')
    const names = new Set((data || []).map(r => (r.name || '').trim()).filter(Boolean))
    sets[table] = names
    names.forEach(n => all.add(n))
  }
  const missing = {}
  let aligned = true
  for (const table of CATEGORY_TABLES) {
    const miss = [...all].filter(n => !sets[table].has(n))
    if (miss.length) {
      missing[table] = miss.sort()
      aligned = false
    }
  }
  return { aligned, missing, allNames: [...all].sort() }
}

// One-click fix: add every missing category name to whichever table lacks it.
export async function syncAllCategories() {
  const { allNames } = await detectCategoryDrift()
  for (const name of allNames) await ensureCategoryEverywhere(name)
}
