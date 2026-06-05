import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import Handlebars from 'handlebars'
import { sendMail } from './mail-transport.js'
import {
  resolveSigningLocale,
  formatSigningDate,
  type SigningLocale,
} from './signing-locale.js'

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

const INVITE_TEMPLATE: Record<SigningLocale, string> = {
  fr: 'contract-signing-invite.hbs',
  en: 'contract-signing-invite.en.hbs',
}

const COMPLETE_TEMPLATE: Record<SigningLocale, string> = {
  fr: 'contract-signing-complete.hbs',
  en: 'contract-signing-complete.en.hbs',
}

function compileTemplate(fileName: string, context: SigningEmailContext): string {
  const path = join(EMAILS_DIR, fileName)
  if (!existsSync(path)) throw new Error(`Email template not found: ${fileName}`)
  const source = readFileSync(path, 'utf-8')
  return Handlebars.compile(source)(context)
}

function getFromAddress(): string {
  return process.env.SIGNING_FROM || 'Atome <signing@sign.atome.software>'
}

function getInviterName(): string {
  return process.env.SIGNING_INVITER_NAME || 'Jérémy Foucray'
}

async function deliverMail(options: {
  to: string
  cc?: string
  subject: string
  html: string
  attachments?: { filename: string; content: Buffer }[]
}): Promise<{ sent: boolean; error?: string }> {
  return sendMail({
    from: getFromAddress(),
    to: options.to,
    cc: options.cc,
    subject: options.subject,
    html: options.html,
    attachments: options.attachments,
  })
}

function invitationSubject(locale: SigningLocale, documentTitle: string): string {
  const inviter = getInviterName()
  if (locale === 'en') {
    return `${inviter} invites you to sign: ${documentTitle}`
  }
  return `${inviter} vous invite à signer : ${documentTitle}`
}

function completionSubject(locale: SigningLocale, documentTitle: string): string {
  if (locale === 'en') return `Signed document: ${documentTitle}`
  return `Document signé : ${documentTitle}`
}

export async function sendSigningInvitationEmail(params: {
  to: string
  templateName: string
  documentTitle: string
  clientName: string
  signUrl: string
  expiresAt: string
}): Promise<{ sent: boolean; error?: string }> {
  const locale = resolveSigningLocale(params.templateName)
  const context: SigningEmailContext = {
    inviterName: getInviterName(),
    documentTitle: params.documentTitle,
    clientName: params.clientName,
    signUrl: params.signUrl,
    expiresAt: formatSigningDate(params.expiresAt, locale),
  }

  const html = compileTemplate(INVITE_TEMPLATE[locale], context)
  const subject = invitationSubject(locale, params.documentTitle)

  return deliverMail({ to: params.to, subject, html })
}

export async function sendSigningCompletionEmail(params: {
  to: string
  templateName: string
  documentTitle: string
  clientName: string
  signerName: string
  signedAt: string
  pdfBuffer: Buffer
  pdfFilename: string
}): Promise<{ sent: boolean; error?: string }> {
  const locale = resolveSigningLocale(params.templateName)
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

  const html = compileTemplate(COMPLETE_TEMPLATE[locale], context)
  const subject = completionSubject(locale, params.documentTitle)

  return deliverMail({
    to: params.to,
    cc,
    subject,
    html,
    attachments: [{ filename: params.pdfFilename, content: params.pdfBuffer }],
  })
}

/** @deprecated Use formatSigningDate(iso, resolveSigningLocale(templateName)) */
export function formatExpiresAtFr(iso: string): string {
  return formatSigningDate(iso, 'fr')
}
