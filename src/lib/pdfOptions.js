// Shared pdf.js document options.
//
// isEvalSupported disables pdf.js's use of eval() when building font/CMap
// glyph mappings. Left on (the default), a malicious PDF can reach arbitrary
// JavaScript execution — see GHSA-wgrm-67xf-hhpq, which affects the
// pdfjs-dist 3.x that react-pdf 7 bundles. Every PDF we open is user-supplied
// (uploads, e-docs, vendor catalogs), so it stays off everywhere.
//
// Exported as a frozen module-level constant on purpose: react-pdf compares
// the `options` prop by reference, so a fresh object literal per render sends
// <Document> into a reload loop.
export const PDF_OPTIONS = Object.freeze({ isEvalSupported: false })
