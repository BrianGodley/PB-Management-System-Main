// src/components/modules/subTabContext.js
//
// Shared context so every module's SectionHeader can append " (SUB)" to its
// section titles when the module is on its Subcontractor tab — and NOT on the
// In-House tab. Each module wraps its rendered body in
// <SubTabContext.Provider value={isSub}> and its local SectionHeader reads the
// context via subSectionTitle().
import { createContext } from 'react'

export const SubTabContext = createContext(false)

// Normalize a section title for the current tab:
//   • strips any existing trailing "(sub)"/"(SUB)" so we never double-suffix,
//   • appends " (SUB)" only when on the Sub tab.
export function subSectionTitle(title, isSub) {
  const base = String(title == null ? '' : title)
    .replace(/\s*\((?:sub)\)\s*$/i, '')
    .replace(/\s+$/, '')
  return isSub ? `${base} (SUB)` : base
}
