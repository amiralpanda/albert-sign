#!/usr/bin/env node
/**
 * Resend signed contract PDF by email (completion email).
 * Usage:
 *   node scripts/resend-signing-completion.mjs --token <hex>
 *   node scripts/resend-signing-completion.mjs --id <requestId> --client hb-aesthetics
 */
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function loadEnv() {
  for (const f of [join(root, '.env'), join(root, '..', 'Albert', '.env')]) {
    if (!existsSync(f)) continue
    for (const line of readFileSync(f, 'utf8').split('\n')) {
      if (!line || line.startsWith('#') || !line.includes('=')) continue
      const i = line.indexOf('=')
      const k = line.slice(0, i)
      let v = line.slice(i + 1).trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1)
      }
      if (!process.env[k]) process.env[k] = v
    }
  }
}

function parseArgs() {
  const args = process.argv.slice(2)
  let token
  let id
  let client
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--token') token = args[++i]
    else if (args[i] === '--id') id = args[++i]
    else if (args[i] === '--client') client = args[++i]
  }
  return { token, id, client }
}

loadEnv()

const { token, id, client } = parseArgs()
if (!token && !(id && client)) {
  console.error('Usage: node scripts/resend-signing-completion.mjs --token <hex>')
  console.error('   or: node scripts/resend-signing-completion.mjs --id <id> --client <slug>')
  process.exit(1)
}

const { blobGetByToken, blobGetById } = await import('../server/services/signing-blob.ts')
const { head } = await import('@vercel/blob')
const { sendSigningCompletionEmail } = await import('../server/services/signing-mail.ts')
const { documentPdfFilename } = await import('../server/lib/document-filename.ts')
const { resolveSigningLocale, formatSigningDate } = await import('../server/services/signing-locale.ts')

const request = token
  ? await blobGetByToken(token)
  : await blobGetById(id, client)

if (!request) {
  console.error('Signing request not found')
  process.exit(1)
}

if (request.status !== 'signed') {
  console.error(`Request status is "${request.status}", expected "signed"`)
  process.exit(1)
}

let pdfBuffer
try {
  const meta = await head(`signing/signed/${request.token}.pdf`)
  const res = await fetch(meta.downloadUrl)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  pdfBuffer = Buffer.from(await res.arrayBuffer())
} catch (err) {
  console.error('Signed PDF not found in Blob:', err)
  process.exit(1)
}

const snap = request.documentSnapshot
if (!snap) {
  console.error('Request has no documentSnapshot')
  process.exit(1)
}

const locale = resolveSigningLocale(snap.templateName)
const signedAt = request.signedAt
  ? formatSigningDate(request.signedAt, locale)
  : request.audit?.consentAt
    ? formatSigningDate(request.audit.consentAt, locale)
    : formatSigningDate(new Date(), locale)

const result = await sendSigningCompletionEmail({
  to: request.audit?.signerEmail || request.signerEmail,
  templateName: snap.templateName,
  documentTitle: snap.title,
  clientName: snap.clientName,
  signerName: request.audit?.signerName || request.signerName || request.signerEmail,
  signedAt,
  pdfBuffer,
  pdfFilename: documentPdfFilename(snap.title),
})

console.log(JSON.stringify({ requestId: request.id, ...result }, null, 2))
process.exit(result.sent ? 0 : 1)
