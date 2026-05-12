// Fetches active employees who belong to the "Executive" or "Sales" employee groups
// set up in HR → Settings → Employee Groups.
// Returns an array of { id, first_name, last_name, job_title } sorted by last name.

import { supabase } from './supabase'

export async function fetchAssignableEmployees() {
  // 1. Get IDs of groups whose name contains "executive" or "sales"
  const { data: groups } = await supabase
    .from('employee_groups')
    .select('id, name')
    .or('name.ilike.%executive%,name.ilike.%sales%')

  if (!groups || groups.length === 0) return []

  const groupIds = groups.map(g => g.id)

  // 2. Get unique employee IDs in those groups
  const { data: members } = await supabase
    .from('employee_group_members')
    .select('employee_id')
    .in('group_id', groupIds)

  if (!members || members.length === 0) return []

  const empIds = [...new Set(members.map(m => m.employee_id))]

  // 3. Fetch the employees themselves (active only)
  const { data: employees } = await supabase
    .from('employees')
    .select('id, first_name, last_name, job_title')
    .in('id', empIds)
    .eq('status', 'active')
    .order('last_name')

  return employees || []
}
