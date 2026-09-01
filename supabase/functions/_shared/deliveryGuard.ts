// Outbound delivery guard for non-production environments.
//
// Staging carries a copy of production's data — real clients, with real phone
// numbers and real email addresses. Without a gate, one "notify" click while
// testing reaches actual customers. This blocks every outbound destination that
// is not explicitly allowlisted, and reports what it blocked so the caller can
// SAY so rather than appearing to succeed or silently doing nothing.
//
// Production is identified POSITIVELY, by project ref. Anything we do not
// recognise as production is gated — so a missing or mistyped environment
// variable makes the system more cautious, never less. Production behaviour is
// completely unchanged: the guard returns early and every recipient passes.

const PROD_PROJECT_REF = 'jjlnpywpmoukgwmwczbz'

export function isProduction(): boolean {
  return (Deno.env.get('SUPABASE_URL') || '').includes(PROD_PROJECT_REF)
}

// Phone numbers vary by formatting and emails by case, so compare on a
// normalised form: digits only for phones, lowercased for addresses.
function normalise(value: string): string {
  const s = String(value).trim().toLowerCase()
  return s.includes('@') ? s : s.replace(/\D/g, '')
}

function allowlist(): string[] {
  return (Deno.env.get('TEST_RECIPIENT_ALLOWLIST') || '')
    .split(',')
    .map(s => normalise(s))
    .filter(Boolean)
}

export interface GuardResult {
  gated: boolean        // true when running outside production
  allowed: string[]     // recipients that may be delivered to
  blocked: string[]     // recipients withheld
  reason?: string       // human-readable, safe to surface in the UI
}

export function guardRecipients(to: string | string[]): GuardResult {
  const list = (Array.isArray(to) ? to : [to]).filter(Boolean).map(String)

  if (isProduction()) return { gated: false, allowed: list, blocked: [] }

  const allow = allowlist()
  if (allow.length === 0) {
    return {
      gated: true,
      allowed: [],
      blocked: list,
      reason:
        'Blocked: this is a non-production environment and TEST_RECIPIENT_ALLOWLIST is not set, ' +
        'so nothing was sent. Add the destination to that secret to allow it.',
    }
  }

  const allowed = list.filter(r => allow.includes(normalise(r)))
  const blocked = list.filter(r => !allow.includes(normalise(r)))
  return {
    gated: true,
    allowed,
    blocked,
    reason: blocked.length
      ? `Blocked ${blocked.length} of ${list.length} recipient(s): non-production environment ` +
        `delivers only to TEST_RECIPIENT_ALLOWLIST. Withheld: ${blocked.join(', ')}`
      : undefined,
  }
}
