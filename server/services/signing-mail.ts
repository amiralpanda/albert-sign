import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import Handlebars from 'handlebars'
import { gmailCredentialsAvailable, sendViaGmailApi } from './gmail-send.js'
import { resendConfigured, sendViaResend } from './resend-send.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WORKSPACE_ROOT = join(__dirname, '..', '..')
const EMAILS_DIR = join(WORKSPACE_ROOT, 'methodology', 'templates', 'emails')

export interface SigningEmailContext {
  inviterName: string
  documentTitle: string
  clientName: string
  signUrl: string
  expiresAt: string
  signerName?: string
  signedAt?: string
}

function compileTemplate(name: string, context: SigningEmailContext): string {
  const path = join(EMAILS_DIR, name)
  if (!existsSync(path)) throw new Error(`Email template not found: ${name}`)
  const source = readFileSync(path, 'utf-8')
  return Handlebars.compile(source)(context)
}

function getFromAddress(): string {
  return process.env.SIGNING_FROM || 'Jérémy Foucray <jeremy@atome.sh>'
}

function getInviterName(): string {
  return process.env.SIGNING_INVITER_NAME || 'Jérémy Foucray'
}

function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
}

async function sendMail(options: {
  to: string
  cc?: string
  subject: string
  html: string
  attachments?: { filename: string; content: Buffer }[]
}): Promise<{ sent: boolean; error?: string }> {
  if (resendConfigured()) {
    return sendViaResend({
      to: options.to,
      cc: options.cc,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    })
  }

  if (smtpConfigured()) {
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
        from: getFromAddress(),
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

  if (gmailCredentialsAvailable()) {
    return sendViaGmailApi({
      from: getFromAddress(),
      to: options.to,
      cc: options.cc,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    })
  }

  return {
    sent: false,
    error:
      'No mail transport: set RESEND_API_KEY, SMTP_*, or Google token in config/credentials/',
  }
}

export async function sendSigningInvitationEmail(params: {
  to: string
  documentTitle: string
  clientName: string
  signUrl: string
  expiresAt: string
}): Promise<{ sent: boolean; error?: string }> {
  const context: SigningEmailContext = {
    inviterName: getInviterName(),
    documentTitle: params.documentTitle,
    clientName: params.clientName,
    signUrl: params.signUrl,
    expiresAt: params.expiresAt,
  }

  const html = compileTemplate('contract-signing-invite.hbs', context)
  const subject = `${getInviterName()} vous invite à signer : ${params.documentTitle}`

  return sendMail({ to: params.to, subject, html })
}

export async function sendSigningCompletionEmail(params: {
  to: string
  documentTitle: string
  clientName: string
  signerName: string
  signedAt: string
  pdfBuffer: Buffer
  pdfFilename: string
}): Promise<{ sent: boolean; error?: string }> {
  const cc = process.env.SIGNING_COMPLETION_CC || 'finance@atome.sh'

  const context: SigningEmailContext = {
    inviterName: getInviterName(),
    documentTitle: params.documentTitle,
    clientName: params.clientName,
    signUrl: '',
    expiresAt: '',
    signerName: params.signerName,
    signedAt: params.signedAt,
  }

  const html = compileTemplate('contract-signing-complete.hbs', context)
  const subject = `Document signé : ${params.documentTitle}`

  return sendMail({
    to: params.to,
    cc,
    subject,
    html,
    attachments: [{ filename: params.pdfFilename, content: params.pdfBuffer }],
  })
}

export function formatExpiresAtFr(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
