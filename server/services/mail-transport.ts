import { gmailCredentialsAvailable, sendViaGmailApi } from './gmail-send.js'
import { gmailOAuthConfigured, sendViaGmailOAuth } from './gmail-oauth-send.js'
import { resendConfigured, sendViaResend } from './resend-send.js'

export type MailPayload = {
  from: string
  to: string
  cc?: string
  subject: string
  html: string
  attachments?: { filename: string; content: Buffer }[]
}

function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
}

async function sendViaSmtp(options: MailPayload): Promise<{ sent: boolean; error?: string }> {
  try {
    const nodemailer = await import('nodemailer')
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    await transporter.sendMail({
      from: options.from,
      to: options.to,
      cc: options.cc,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments?.map(a => ({
        filename: a.filename,
        content: a.content,
        contentType: 'application/pdf',
      })),
    })

    return { sent: true }
  } catch (err) {
    return { sent: false, error: String(err) }
  }
}

/** Prod on sign.atome.software: Resend only — no personal Gmail OAuth. */
export function isProductionSigningHost(): boolean {
  if (process.env.VERCEL === '1' || process.env.VERCEL_ENV === 'production') return true
  const base = process.env.SIGNING_PUBLIC_BASE_URL?.trim() || ''
  return base.includes('sign.atome.software')
}

export async function sendMail(options: MailPayload): Promise<{ sent: boolean; error?: string }> {
  const prod = isProductionSigningHost()

  if (prod) {
    if (!resendConfigured()) {
      return {
        sent: false,
        error: 'RESEND_API_KEY required on sign.atome.software (no Gmail fallback in production)',
      }
    }
    return sendViaResend({
      to: options.to,
      cc: options.cc,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    })
  }

  const attempts: Array<{ name: string; run: () => Promise<{ sent: boolean; error?: string }> }> = []

  if (resendConfigured()) {
    attempts.push({
      name: 'resend',
      run: () =>
        sendViaResend({
          to: options.to,
          cc: options.cc,
          subject: options.subject,
          html: options.html,
          attachments: options.attachments,
        }),
    })
  }
  if (gmailCredentialsAvailable()) {
    attempts.push({
      name: 'gmail-api',
      run: () =>
        sendViaGmailApi({
          from: options.from,
          to: options.to,
          cc: options.cc,
          subject: options.subject,
          html: options.html,
          attachments: options.attachments,
        }),
    })
  }
  if (gmailOAuthConfigured()) {
    attempts.push({
      name: 'gmail-oauth',
      run: () =>
        sendViaGmailOAuth({
          from: options.from,
          to: options.to,
          cc: options.cc,
          subject: options.subject,
          html: options.html,
          attachments: options.attachments,
        }),
    })
  }
  if (smtpConfigured()) {
    attempts.push({ name: 'smtp', run: () => sendViaSmtp(options) })
  }

  if (attempts.length === 0) {
    return {
      sent: false,
      error: 'No mail transport: set RESEND_API_KEY or Gmail credentials for local dev',
    }
  }

  const errors: string[] = []
  for (const attempt of attempts) {
    const result = await attempt.run()
    if (result.sent) return result
    errors.push(`${attempt.name}: ${result.error || 'unknown error'}`)
    console.warn(`[signing-mail] ${attempt.name} failed:`, result.error)
  }

  return { sent: false, error: errors.join(' | ') }
}
