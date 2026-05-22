/**
 * process-stat-reminders
 *
 * Runs on a daily schedule (via pg_cron). For every enabled stat reminder:
 *  1. Computes the most recently completed period for the stat's tracking type.
 *  2. Checks whether a value has been entered for that period.
 *  3. If no value and the delay window has passed → sends email/SMS.
 *  4. Handles repeat reminders based on the configured interval.
 *  5. Marks log entries resolved when a value is finally entered.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SEND_EMAIL_URL            = `${SUPABASE_URL}/functions/v1/send-email`
const SEND_SMS_URL              = `${SUPABASE_URL}/functions/v1/send-sms`

// ── Period helpers ────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Returns the most recently COMPLETED period_date for a given tracking type.
 * weekEndingDay: 0=Sun … 6=Sat
 */
function mostRecentCompletedPeriod(tracking: string, weekEndingDay: number): Date | null {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  switch (tracking) {
    case 'weekly': {
      const dow = today.getDay()
      let daysBack = (dow - weekEndingDay + 7) % 7
      if (daysBack === 0) daysBack = 7  // must be a past week, not today
      const d = new Date(today)
      d.setDate(today.getDate() - daysBack)
      return d
    }
    case 'monthly': {
      return new Date(today.getFullYear(), today.getMonth() - 1, 1)
    }
    case 'quarterly': {
      const q = Math.floor(today.getMonth() / 3)
      const prevQ = q === 0 ? 3 : q - 1
      const yr    = q === 0 ? today.getFullYear() - 1 : today.getFullYear()
      return new Date(yr, prevQ * 3, 1)
    }
    case 'yearly': {
      return new Date(today.getFullYear() - 1, 0, 1)
    }
    case 'daily': {
      const d = new Date(today)
      d.setDate(today.getDate() - 1)
      return d
    }
    default: return null
  }
}

/**
 * Returns the last calendar day of a period (the "end" date).
 */
function periodEndDate(periodDate: Date, tracking: string): Date {
  switch (tracking) {
    case 'weekly':    return periodDate
    case 'monthly':   return new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 0)
    case 'quarterly': return new Date(periodDate.getFullYear(), periodDate.getMonth() + 3, 0)
    case 'yearly':    return new Date(periodDate.getFullYear(), 11, 31)
    case 'daily':     return periodDate
    default:          return periodDate
  }
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000)
}

// ── Notification helpers ──────────────────────────────────────────────────────

const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? SUPABASE_SERVICE_ROLE_KEY

async function sendEmail(to: string, statName: string, periodLabel: string, tracking: string) {
  const body = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f9fafb;border-radius:16px;">
      <div style="text-align:center;margin-bottom:24px;">
        <span style="font-size:2.5rem;">🌿</span>
        <h2 style="margin:8px 0 0;color:#1f2937;font-size:20px;">Picture Build System</h2>
      </div>
      <div style="background:#fff;border-radius:12px;padding:28px;border:1px solid #e5e7eb;">
        <h3 style="margin:0 0 8px;color:#111827;font-size:17px;">📊 Statistic Entry Reminder</h3>
        <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;">
          A value is needed for the following statistic:
        </p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin-bottom:16px;">
          <p style="margin:0 0 4px;font-size:16px;font-weight:700;color:#14532d;">${statName}</p>
          <p style="margin:0;font-size:13px;color:#166534;">Period: ${periodLabel} (${tracking})</p>
        </div>
        <p style="margin:0;color:#6b7280;font-size:13px;">
          Please log in to the Picture Build System and enter the value for this period.
        </p>
      </div>
    </div>`

  await fetch(SEND_EMAIL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}`, 'apikey': ANON_KEY },
    body: JSON.stringify({ to, subject: `Reminder: Enter value for "${statName}" — ${periodLabel}`, html: body }),
  })
}

async function sendSMS(to: string, statName: string, periodLabel: string) {
  await fetch(SEND_SMS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}`, 'apikey': ANON_KEY },
    body: JSON.stringify({
      to,
      message: `Picture Build Reminder: Please enter the value for "${statName}" (${periodLabel}). Log in to PBS to update it.`,
    }),
  })
}

// ── Main ──────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const respond = (body: object, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Get company week-ending day (default Friday=5)
    const { data: co } = await admin.from('company_settings').select('week_ending_day').single()
    const weekEndingDay: number = co?.week_ending_day ?? 5

    // Load all enabled reminders with stat + owner info
    const { data: reminders, error: remErr } = await admin
      .from('stat_reminders')
      .select(`
        id, statistic_id, delay_days, notify_email, notify_sms,
        repeat_enabled, repeat_value, repeat_unit,
        statistics ( id, name, tracking, owner_user_id, archived )
      `)
      .eq('enabled', true)

    if (remErr) return respond({ error: remErr.message }, 500)
    if (!reminders?.length) return respond({ message: 'No enabled reminders.', processed: 0 })

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let sent = 0
    let resolved = 0

    for (const rem of reminders) {
      const stat = (rem as any).statistics
      if (!stat || stat.archived) continue

      const tracking  = stat.tracking as string
      const periodDate = mostRecentCompletedPeriod(tracking, weekEndingDay)
      if (!periodDate) continue

      const periodStr = toDateStr(periodDate)
      const periodEnd = periodEndDate(periodDate, tracking)

      // Days since the period ended
      const daysSinceEnd = daysBetween(periodEnd, today)
      if (daysSinceEnd < rem.delay_days) continue  // delay not yet reached

      // Check if a value has been entered
      const { data: valueRow } = await admin
        .from('statistic_values')
        .select('value')
        .eq('statistic_id', rem.statistic_id)
        .eq('period_date', periodStr)
        .not('value', 'is', null)
        .maybeSingle()

      // Fetch existing log entry
      const { data: logRow } = await admin
        .from('stat_reminder_log')
        .select('*')
        .eq('statistic_id', rem.statistic_id)
        .eq('period_date', periodStr)
        .maybeSingle()

      // If value now exists → mark resolved and skip
      if (valueRow !== null) {
        if (logRow && !logRow.resolved) {
          await admin.from('stat_reminder_log')
            .update({ resolved: true })
            .eq('id', logRow.id)
          resolved++
        }
        continue
      }

      // No value entered — determine whether to send
      let shouldSend = false

      if (!logRow) {
        // Never sent before
        shouldSend = true
      } else if (!logRow.resolved && rem.repeat_enabled && logRow.next_send_at) {
        const nextSend = new Date(logRow.next_send_at)
        nextSend.setHours(0, 0, 0, 0)
        if (today >= nextSend) shouldSend = true
      }

      if (!shouldSend) continue

      // Look up owner contact info
      if (!stat.owner_user_id) continue
      const { data: emp } = await admin
        .from('employees')
        .select('email, cell_phone, first_name')
        .eq('auth_user_id', stat.owner_user_id)
        .maybeSingle()

      const ownerEmail = emp?.email
      const ownerPhone = emp?.cell_phone

      if (!ownerEmail && !ownerPhone) continue

      // Build period label
      const periodLabel = periodStr

      // Send notifications
      if (rem.notify_email && ownerEmail) {
        await sendEmail(ownerEmail, stat.name, periodLabel, tracking)
      }
      if (rem.notify_sms && ownerPhone) {
        const digits = ownerPhone.replace(/\D/g, '')
        const e164   = digits.length === 10 ? `+1${digits}` : `+${digits}`
        await sendSMS(e164, stat.name, periodLabel)
      }

      // Calculate next_send_at for repeat
      let nextSendAt: string | null = null
      if (rem.repeat_enabled) {
        const next = new Date(today)
        const days = rem.repeat_unit === 'weeks' ? rem.repeat_value * 7 : rem.repeat_value
        next.setDate(today.getDate() + days)
        nextSendAt = next.toISOString()
      }

      // Upsert log entry
      const sentCount = (logRow?.sent_count ?? 0) + 1
      await admin.from('stat_reminder_log').upsert({
        statistic_id: rem.statistic_id,
        period_date:  periodStr,
        sent_count:   sentCount,
        last_sent_at: today.toISOString(),
        next_send_at: nextSendAt,
        resolved:     false,
      }, { onConflict: 'statistic_id,period_date' })

      sent++
    }

    return respond({ message: 'Done.', sent, resolved })
  } catch (e: any) {
    return respond({ error: e.message || 'Unexpected error' }, 500)
  }
})
