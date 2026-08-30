// Guard for navigation targets that arrive from the URL.
//
// Anything we hand to navigate() from a query param is attacker-controlled, so
// it has to be an in-app path and nothing else. Requiring a single clean
// leading "/" blocks the usual escapes:
//   //evil.com        protocol-relative — the browser reads it as a host
//   /\evil.com        backslash variants browsers normalize to "//"
//   https://evil.com  absolute URL
//   javascript:...    scheme payload
// Returns the path when it is safe to navigate to, otherwise null so callers
// can fall back to their normal destination.
export function safeInternalPath(value) {
  if (typeof value !== 'string' || value === '') return null

  // Control characters, space, and DEL are grounds for rejection rather than
  // something to strip: a value that needs cleaning is not one we should follow.
  // Checked by code point so ordinary path characters like "-" stay legal.
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    if (code <= 0x20 || code === 0x7f) return null
  }

  if (value.includes('\\')) return null
  if (!value.startsWith('/')) return null
  if (value.startsWith('//')) return null
  return value
}
