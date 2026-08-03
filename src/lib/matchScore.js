// src/lib/matchScore.js
//
// Lightweight, dependency-free fuzzy matching used to pre-filter likely-duplicate
// materials before asking Sam to confirm. Combines token-set overlap (Jaccard)
// with character trigram overlap (Dice) so it's robust to word order AND small
// spelling/format differences. SKU exact-match is a strong signal on top.

// Words that add no discriminating value in product names.
const STOP = new Set([
  'the', 'a', 'an', 'and', 'of', 'for', 'with', 'in', 'by',
  'material', 'materials', 'item', 'product', 'each', 'ea', 'pc', 'pcs',
])

export function normalizeName(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/["'’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokens(s) {
  return normalizeName(s)
    .split(' ')
    .filter(t => t && !STOP.has(t))
}

function trigrams(s) {
  const n = normalizeName(s).replace(/\s+/g, ' ')
  const set = new Set()
  const padded = `  ${n} `
  for (let i = 0; i < padded.length - 2; i++) set.add(padded.slice(i, i + 3))
  return set
}

function jaccard(aSet, bSet) {
  if (!aSet.size && !bSet.size) return 0
  let inter = 0
  for (const x of aSet) if (bSet.has(x)) inter++
  return inter / (aSet.size + bSet.size - inter)
}

function dice(aSet, bSet) {
  if (!aSet.size || !bSet.size) return 0
  let inter = 0
  for (const x of aSet) if (bSet.has(x)) inter++
  return (2 * inter) / (aSet.size + bSet.size)
}

// 0..1 similarity between two product names.
export function nameScore(a, b) {
  const at = new Set(tokens(a))
  const bt = new Set(tokens(b))
  const tok = jaccard(at, bt)
  const tri = dice(trigrams(a), trigrams(b))
  // token overlap matters most; trigrams rescue reordered/typo'd names.
  return 0.6 * tok + 0.4 * tri
}

// Score a candidate material row against a target item. Returns 0..1.
// `item`      : { name/item, sku?, category?, sub_category? }
// `candidate` : a material_rates row { name, sku?, category?, sub_category? }
export function candidateScore(item, candidate) {
  const iName = item.name ?? item.item ?? ''
  const cName = candidate.name ?? ''
  let s = nameScore(iName, cName)

  // Exact SKU match is a very strong signal.
  const iSku = normalizeName(item.sku)
  const cSku = normalizeName(candidate.sku)
  if (iSku && cSku && iSku === cSku) s = Math.max(s, 0.97)

  // Same category nudges up; different category nudges down (but never zeroes,
  // since categorization is often inconsistent).
  const iCat = normalizeName(item.category)
  const cCat = normalizeName(candidate.category)
  if (iCat && cCat) s += iCat === cCat ? 0.05 : -0.08

  return Math.max(0, Math.min(1, s))
}

// Rank candidates for an item, returning the top N above a floor score.
// candidates: array of material_rates rows.
export function topCandidates(item, candidates, { limit = 5, floor = 0.35 } = {}) {
  return (candidates || [])
    .map(c => ({ candidate: c, score: candidateScore(item, c) }))
    .filter(x => x.score >= floor)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
