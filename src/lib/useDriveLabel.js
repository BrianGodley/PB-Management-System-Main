// src/lib/useDriveLabel.js
//
// Resolves the admin-editable name for the document "Drive" tab
// (company_settings.drive_label). Falls back to "Drive" when unset. Used by the
// Documents tab bar, the settings sub-tab, and the PbsDrive screen so they all
// show the same company-chosen name.

import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export function useDriveLabel() {
  const [label, setLabel] = useState('Drive')
  useEffect(() => {
    let alive = true
    supabase
      .from('company_settings')
      .select('drive_label, company_name')
      .maybeSingle()
      .then(({ data }) => {
        if (!alive || !data) return
        // Prefer the admin-set label; fall back to the tenant's company name; else "Drive".
        const v =
          (data.drive_label && data.drive_label.trim()) ||
          (data.company_name && data.company_name.trim())
        if (v) setLabel(v)
      })
    return () => {
      alive = false
    }
  }, [])
  return label
}
