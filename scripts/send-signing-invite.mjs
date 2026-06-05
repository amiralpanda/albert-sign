#!/usr/bin/env node
/**
 * Create signing request + preview PDF on Blob + send Resend invite.
 * Usage: RESEND_API_KEY=... BLOB_READ_WRITE_TOKEN=... node scripts/send-signing-invite.mjs jeremy@atome.sh
 */
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomBytes } from 'crypto'
import { v4 as uuid } from 'uuid'
import Handlebars from 'handlebars'
import { put } from '@vercel/blob'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const to = process.argv[2]?.trim()
if (!to) {
  console.error('Usage: node scripts/send-signing-invite.mjs <email>')
  process.exit(1)
}

function loadEnv() {
  for (const f of [join(root, '.env'), join(root, '..', 'Albert', '.env.vercel.production')]) {
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

loadEnv()

const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim()
const resendKey = process.env.RESEND_API_KEY?.trim()
if (!blobToken) {
  console.error('Need BLOB_READ_WRITE_TOKEN in env')
  process.exit(1)
}

const { hashDocument } = await import('../server/services/document-hash.ts')
const { generatePreviewPdf } = await import('../server/services/signing-preview.ts')
const { ensureEditorSignatureVariables } = await import('../server/services/editor-signature.ts')

const variables = ensureEditorSignatureVariables({
  clientName: 'Atome SAS',
  legalForm: 'SAS',
  address: 'Paris, France',
  rcsCity: 'Paris',
  rcsNumber: '000 000 000',
  legalRepName: 'Jérémy Foucray',
  legalRepTitle: 'CEO',
  nbLicences: '5',
  prixLicenceAnnuel: '1200',
  redevanceAnnuelle: '6000',
  periodicite: 'annuel',
  modePaiement: 'virement bancaire',
  heuresParametrage: '10',
  heuresSupport: '4',
  tarifSupportSupp: '150',
})

const templateName = 'design-partnership'
const documentHash = hashDocument(templateName, variables)
const token = randomBytes(32).toString('hex')
const now = new Date()
const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

const request = {
  id: uuid(),
  documentId: `invite-${now.toISOString().slice(0, 10)}-jeremy`,
  clientSlug: 'atome',
  token,
  status: 'pending',
  documentHash,
  signerEmail: to.toLowerCase(),
  signerName: 'Jérémy Foucray',
  createdAt: now.toISOString(),
  expiresAt: expiresAt.toISOString(),
  previewStatus: 'pending',
  documentSnapshot: {
    templateName,
    title: 'Contrat Design Partnership — signature',
    clientId: 'atome-demo',
    clientName: 'Atome SAS',
    variables: { ...variables },
  },
}

process.env.BLOB_READ_WRITE_TOKEN = blobToken

const body = JSON.stringify(request)
const blobOpts = {
  access: 'public',
  addRandomSuffix: false,
  allowOverwrite: true,
  contentType: 'application/json',
  token: blobToken,
}
await put(`signing/${request.clientSlug}/${request.id}.json`, body, blobOpts)
await put(`signing/tokens/${token}.json`, body, blobOpts)

let pdfUrl = null
try {
  pdfUrl = await generatePreviewPdf(request)
} catch (err) {
  console.warn('Local PDF skip (prod will generate):', err.message || err)
}
const signUrl = `https://sign.atome.software/sign/${token}`

const tplPath = join(root, 'methodology/templates/emails/contract-signing-invite.hbs')
const tpl = readFileSync(tplPath, 'utf8')
const html = Handlebars.compile(tpl)({
  inviterName: process.env.SIGNING_INVITER_NAME || 'Jérémy Foucray',
  documentTitle: request.documentSnapshot.title,
  clientName: 'Atome SAS',
  signUrl,
  expiresAt: expiresAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
})

const subject = `${process.env.SIGNING_INVITER_NAME || 'Jérémy Foucray'} vous invite à signer : ${request.documentSnapshot.title}`
const from = process.env.SIGNING_FROM || 'Jérémy Foucray <jeremy@atome.sh>'

async function sendViaGmail() {
  const { spawnSync } = await import('child_process')
  const py = join(root, '..', 'Albert', 'config', 'credentials', 'gmail-send-message.py')
  const venvPy = join(root, '..', 'Albert', 'config', 'credentials', '.venv', 'bin', 'python3')
  const python = existsSync(venvPy) ? venvPy : 'python3'
  if (!existsSync(py)) return { sent: false, error: 'gmail script missing' }
  const r = spawnSync(
    python,
    [py],
    {
      input: JSON.stringify({ to, subject, html, from }),
      encoding: 'utf8',
    },
  )
  try {
    return JSON.parse(r.stdout || '{}')
  } catch {
    return { sent: false, error: r.stderr || r.stdout || 'gmail failed' }
  }
}

async function sendViaResend() {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || 'onboarding@resend.dev',
      to: [to],
      cc: (process.env.SIGNING_MAIL_CC || 'jeremy@atome.sh,finance@atome.sh').split(',').map(s => s.trim()),
      subject,
      html,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { sent: false, error: data.message || JSON.stringify(data) }
  return { sent: true, id: data.id, via: 'resend' }
}

let sent = await sendViaGmail()
if (!sent.sent) {
  console.warn('Gmail:', sent.error)
  sent = await sendViaResend()
}
if (!sent.sent) {
  console.error('All transports failed:', sent.error)
  process.exit(1)
}

// Trigger prod preview generation (GET schedules job)
await fetch(`https://sign.atome.software/api/signing/${token}`).catch(() => {})

console.log('OK')
console.log('To:', to)
console.log('Via:', sent.via || 'gmail')
console.log('Sign:', signUrl)
console.log('PDF preview:', pdfUrl || '(generating on prod)')
if (sent.id) console.log('Message id:', sent.id)
