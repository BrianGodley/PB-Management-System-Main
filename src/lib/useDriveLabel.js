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
      .select('drive_label')
      .maybeSingle()
      .then(({ data }) => {
        if (alive && data?.drive_label && data.drive_label.trim()) setLabel(data.drive_label.trim())
      })
    return () => {
      alive = false
    }
  }, [])
  return label
}
