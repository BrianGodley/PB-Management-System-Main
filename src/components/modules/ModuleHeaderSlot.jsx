import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

// Portals its children into the estimate-module modal header slot
// (#pbs-module-worktype-slot in EstimateDetail), so a module can render a
// control — e.g. the In House / Subcontractor toggle — up in the header row
// next to the module name while keeping the state inside the module. Renders
// nothing if the slot isn't present (module used outside the modal host).
export default function ModuleHeaderSlot({ children }) {
  const [el, setEl] = useState(null)
  useEffect(() => {
    setEl(document.getElementById('pbs-module-worktype-slot'))
  }, [])
  if (!el) return null
  return createPortal(children, el)
}
