import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..')

interface OAuthCreds {
  clientId: string
  clientSecret: string
  refreshToken: string
  user: string
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
      }
      if (!data.client_id || !data.client_secret || !data.refresh_token) continue
      return {
        clientId: data.client_id,
        clientSecret: data.client_secret,
        refreshToken: data.refresh_token,
        user: process.env.SMTP_USER?.trim() || 'jeremy@atome.sh',
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

export async function sendViaGmailOAuth(
  options: GmailOAuthSendOptions,
): Promise<{ sent: boolean; error?: string }> {
  const creds = loadOAuthCreds()
  if (!creds) {
    return { sent: false, error: 'Gmail OAuth credentials not configured' }
  }

  try {
    const nodemailer = await import('nodemailer')
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: creds.user,
        clientId: creds.clientId,
        clientSecret: creds.clientSecret,
        refreshToken: creds.refreshToken,
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
