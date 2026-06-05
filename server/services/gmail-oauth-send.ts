import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { google } from 'googleapis'
import type { OAuth2Client } from 'google-auth-library'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..')

interface OAuthCreds {
  clientId: string
  clientSecret: string
  refreshToken: string
  user: string
  scopes?: string[]
}

function loadOAuthCreds(): OAuthCreds | null {
  const envRefresh = process.env.GOOGLE_OAUTH_REFRESH_TOKEN?.trim()
  if (envRefresh) {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim()
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim()
    if (!clientId || !clientSecret) return null
    return {
      clientId,
      clientSecret,
      refreshToken: envRefresh,
      user: process.env.GOOGLE_OAUTH_USER?.trim() || process.env.SMTP_USER?.trim() || 'jeremy@atome.sh',
    }
  }

  const candidates = [
    join(REPO_ROOT, 'config', 'credentials', 'google-token.json'),
    join(REPO_ROOT, '..', 'Albert', 'config', 'credentials', 'google-token.json'),
  ]
  for (const path of candidates) {
    if (!existsSync(path)) continue
    try {
      const data = JSON.parse(readFileSync(path, 'utf8')) as {
        client_id?: string
        client_secret?: string
        refresh_token?: string
        scopes?: string[]
      }
      if (!data.client_id || !data.client_secret || !data.refresh_token) continue
      return {
        clientId: data.client_id,
        clientSecret: data.client_secret,
        refreshToken: data.refresh_token,
        user: process.env.SMTP_USER?.trim() || 'jeremy@atome.sh',
        scopes: data.scopes,
      }
    } catch {
      continue
    }
  }
  return null
}

export function gmailOAuthConfigured(): boolean {
  return loadOAuthCreds() !== null
}

export interface GmailOAuthSendOptions {
  from: string
  to: string
  subject: string
  html: string
  cc?: string
  attachments?: { filename: string; content: Buffer }[]
}

function encodeHeader(value: string): string {
  return /[^\x00-\x7F]/.test(value)
    ? `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`
    : value
}

function buildRawMessage(options: GmailOAuthSendOptions): string {
  const lines: string[] = [
    `From: ${options.from}`,
    `To: ${options.to}`,
    `Subject: ${encodeHeader(options.subject)}`,
  ]
  if (options.cc) lines.push(`Cc: ${options.cc}`)
  lines.push('MIME-Version: 1.0')

  const attachments = options.attachments ?? []
  if (attachments.length === 0) {
    lines.push('Content-Type: text/html; charset=UTF-8')
    lines.push('Content-Transfer-Encoding: base64')
    lines.push('')
    lines.push(Buffer.from(options.html, 'utf8').toString('base64'))
  } else {
    const mixed = `mixed_${Date.now()}`
    const alt = `alt_${Date.now()}`
    lines.push(`Content-Type: multipart/mixed; boundary="${mixed}"`)
    lines.push('')
    lines.push(`--${mixed}`)
    lines.push(`Content-Type: multipart/alternative; boundary="${alt}"`)
    lines.push('')
    lines.push(`--${alt}`)
    lines.push('Content-Type: text/html; charset=UTF-8')
    lines.push('Content-Transfer-Encoding: base64')
    lines.push('')
    lines.push(Buffer.from(options.html, 'utf8').toString('base64'))
    lines.push(`--${alt}--`)

    for (const att of attachments) {
      lines.push(`--${mixed}`)
      lines.push(`Content-Type: application/pdf; name="${att.filename}"`)
      lines.push('Content-Transfer-Encoding: base64')
      lines.push(`Content-Disposition: attachment; filename="${att.filename}"`)
      lines.push('')
      lines.push(att.content.toString('base64'))
    }
    lines.push(`--${mixed}--`)
  }

  return Buffer.from(lines.join('\r\n'))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export async function sendViaGmailOAuth(
  options: GmailOAuthSendOptions,
): Promise<{ sent: boolean; error?: string }> {
  const creds = loadOAuthCreds()
  if (!creds) {
    return { sent: false, error: 'Gmail OAuth credentials not configured' }
  }

  try {
    const oauth2 = new google.auth.OAuth2(creds.clientId, creds.clientSecret)
    oauth2.setCredentials({
      refresh_token: creds.refreshToken,
      scope: creds.scopes?.join(' '),
    })

    const gmail = google.gmail({ version: 'v1', auth: oauth2 as OAuth2Client })
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: buildRawMessage(options) },
    })

    return { sent: true }
  } catch (err) {
    return { sent: false, error: String(err) }
  }
}
