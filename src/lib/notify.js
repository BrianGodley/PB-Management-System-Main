/**
 * notify.js
 * Thin wrappers around the send-email and send-sms Edge Functions.
 * Import and call these anywhere in the app.
 *
 * Usage:
 *   import { sendEmail, sendSMS, sendWelcomeEmail } from '../lib/notify'
 *
 *   await sendEmail({ to: 'user@co.com', subject: 'Hello', html: '<p>Hi</p>' })
 *   await sendSMS({ to: '+15551234567', message: 'Your job is ready.' })
 */

import { supabase } from './supabase'

// ── Low-level senders ─────────────────────────────────────────────────────────

export async function sendEmail({ to, subject, html, text }) {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: { to, subject, html, text },
  })
  if (error) console.error('[notify] sendEmail error:', error)
  return { data, error }
}

export async function sendSMS({ to, message }) {
  const { data, error } = await supabase.functions.invoke('send-sms', {
    body: { to, message },
  })
  if (error) console.error('[notify] sendSMS error:', error)
  return { data, error }
}

// ── Email templates ───────────────────────────────────────────────────────────

const brandColor = '#3A5038'

function baseTemplate({ title, body, buttonText, buttonUrl }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:${brandColor};padding:28px 32px;text-align:center;">
            <span style="font-size:28px;">🌿</span>
            <p style="margin:8px 0 0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">
              Picture Build System
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111827;">${title}</h1>
            ${body}
            ${buttonText && buttonUrl ? `
            <div style="margin-top:28px;text-align:center;">
              <a href="${buttonUrl}"
                 style="display:inline-block;background:${brandColor};color:#ffffff;text-decoration:none;
                        padding:12px 28px;border-radius:10px;font-weight:700;font-size:15px;">
                ${buttonText}
              </a>
            </div>` : ''}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f3f4f6;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              Picture Build System<br>
              You're receiving this because you have an account on this system.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ── Pre-built email senders ───────────────────────────────────────────────────

/**
 * Welcome email sent when an admin creates a new user account.
 */
export async function sendWelcomeEmail({ to, fullName, username, password, loginUrl }) {
  const subject = 'Welcome to Picture Build System'
  const html = baseTemplate({
    title: `Welcome, ${fullName || 'there'}!`,
    body: `
      <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">
        Your account has been created on the Picture Build System.
        Here are your login credentials:
      </p>
      <table style="width:100%;background:#f9fafb;border-radius:10px;padding:16px;border:1px solid #e5e7eb;margin-bottom:16px;" cellpadding="0" cellspacing="0">
        <tr><td style="padding:6px 12px;font-size:13px;color:#6b7280;width:100px;">Username</td>
            <td style="padding:6px 12px;font-size:14px;font-weight:600;color:#111827;font-family:monospace;">@${username}</td></tr>
        <tr><td style="padding:6px 12px;font-size:13px;color:#6b7280;">Email</td>
            <td style="padding:6px 12px;font-size:14px;font-weight:600;color:#111827;font-family:monospace;">${to}</td></tr>
        <tr><td style="padding:6px 12px;font-size:13px;color:#6b7280;">Password</td>
            <td style="padding:6px 12px;font-size:14px;font-weight:600;color:#111827;font-family:monospace;">${password}</td></tr>
      </table>
      <p style="color:#6b7280;font-size:13px;margin:0;">
        Please log in and change your password as soon as possible.
      </p>`,
    buttonText: 'Log In Now',
    buttonUrl: loginUrl || 'https://your-app-url.com/login',
  })
  return sendEmail({ to, subject, html })
}

/**
 * Notification email for job status changes.
 */
export async function sendJobStatusEmail({ to, jobName, status, jobUrl }) {
  const subject = `Job Update: ${jobName} is now ${status}`
  const html = baseTemplate({
    title: 'Job Status Update',
    body: `
      <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 12px;">
        The status of <strong>${jobName}</strong> has been updated to:
      </p>
      <div style="display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;
                  color:#166534;padding:8px 20px;border-radius:8px;font-weight:700;font-size:16px;margin-bottom:16px;">
        ${status}
      </div>`,
    buttonText: 'View Job',
    buttonUrl: jobUrl || '#',
  })
  return sendEmail({ to, subject, html })
}

/**
 * Notification email for bid status changes.
 */
export async function sendBidStatusEmail({ to, clientName, bidAmount, status, bidUrl }) {
  const subject = `Bid Update: ${clientName} bid is ${status}`
  const html = baseTemplate({
    title: 'Bid Status Update',
    body: `
      <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 12px;">
        The bid for <strong>${clientName}</strong>
        ${bidAmount ? `(${bidAmount})` : ''} has been marked as:
      </p>
      <div style="display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;
                  color:#166534;padding:8px 20px;border-radius:8px;font-weight:700;font-size:16px;margin-bottom:16px;">
        ${status}
      </div>`,
    buttonText: 'View Bid',
    buttonUrl: bidUrl || '#',
  })
  return sendEmail({ to, subject, html })
}

/**
 * Generic SMS notification.
 */
export async function sendJobSMS({ to, jobName, message }) {
  return sendSMS({
    to,
    message: `[Job Tracker] ${jobName}: ${message}`,
  })
}
