import { randomBytes } from 'crypto'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { v4 as uuid } from 'uuid'
import * as blob from './signing-blob.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WORKSPACE_ROOT = join(__dirname, '..', '..')
const CLIENTS_DIR = join(WORKSPACE_ROOT, 'clients')

export type SigningRequestStatus = 'pending' | 'signed' | 'expired' | 'cancelled'

export interface SigningDocumentSnapshot {
  templateName: string
  title: string
  clientId: string
  clientName: string
  variables: Record<string, string>
}

export interface SigningDocContext {
  doc: {
    id: string
    clientId: string
    templateName: string
    title: string
    variables: Record<string, string>
  }
  clientName: string
  slug: string
}

export interface SigningAudit {
  ip?: string
  userAgent?: string
  consentAt: string
  signerName: string
  signerTitle?: string
  signerEmail: string
}

export interface SigningRequest {
  id: string
  documentId: string
  clientSlug: string
  token: string
  status: SigningRequestStatus
  documentHash: string
  signerEmail: string
  signerName?: string
  createdAt: string
  expiresAt: string
  signedAt?: string
  atomeFileId?: string
  audit?: SigningAudit
  invitationEmailSent?: boolean
  completionEmailSent?: boolean
  completionEmailError?: string
  /** Frozen contract at invitation time (required on Vercel / Blob) */
  documentSnapshot?: SigningDocumentSnapshot
  /** Public Blob URL — unsigned PDF for instant client preview */
  previewPdfUrl?: string
  previewStatus?: 'pending' | 'ready' | 'failed'
  signProcessing?: boolean
}

function signingDir(slug: string): string {
  const dir = join(CLIENTS_DIR, slug, 'signing')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function readRequestFile(filePath: string): SigningRequest | null {
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8')) as SigningRequest
  } catch {
    return null
  }
}

async function persistRequest(request: SigningRequest): Promise<void> {
  if (blob.blobSigningEnabled()) {
    await blob.blobSaveRequest(request)
  }
  try {
    writeFileSync(
      join(signingDir(request.clientSlug), `${request.id}.json`),
      JSON.stringify(request, null, 2),
      'utf-8',
    )
  } catch {
    /* read-only filesystem on Vercel */
  }
}

export function generateToken(): string {
  return randomBytes(32).toString('hex')
}

export function getSigningPublicBaseUrl(): string {
  const explicit = process.env.SIGNING_PUBLIC_BASE_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, '')

  if (process.env.VERCEL_ENV === 'production') {
    return 'https://sign.atome.software'
  }

  if (process.env.VERCEL_URL?.trim()) {
    return `https://${process.env.VERCEL_URL.trim()}`
  }

  if (process.env.PUBLIC_APP_URL?.trim()) {
    return process.env.PUBLIC_APP_URL.trim().replace(/\/$/, '')
  }

  if (process.env.NODE_ENV === 'production') {
    return 'https://sign.atome.software'
  }

  return 'http://localhost:3000'
}

export function buildSignUrl(token: string): string {
  return `${getSigningPublicBaseUrl()}/sign/${token}`
}

export async function createSigningRequest(params: {
  documentId: string
  clientSlug: string
  documentHash: string
  signerEmail: string
  signerName?: string
  expiresInDays?: number
  documentSnapshot?: SigningDocumentSnapshot
}): Promise<SigningRequest> {
  const days = params.expiresInDays ?? 30
  const now = new Date()
  const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

  const request: SigningRequest = {
    id: uuid(),
    documentId: params.documentId,
    clientSlug: params.clientSlug,
    token: generateToken(),
    status: 'pending',
    documentHash: params.documentHash,
    signerEmail: params.signerEmail.trim().toLowerCase(),
    signerName: params.signerName?.trim(),
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    documentSnapshot: params.documentSnapshot,
  }

  await cancelPendingForDocument(params.documentId, params.clientSlug)
  await persistRequest(request)
  return request
}

export async function cancelPendingForDocument(
  documentId: string,
  clientSlug: string,
): Promise<void> {
  for (const req of await listRequestsForDocument(documentId, clientSlug)) {
    if (req.status === 'pending') {
      req.status = 'cancelled'
      await persistRequest(req)
    }
  }
}

export async function listRequestsForDocument(
  documentId: string,
  clientSlug: string,
): Promise<SigningRequest[]> {
  if (blob.blobSigningEnabled()) {
    const fromBlob = await blob.blobListForDocument(documentId, clientSlug)
    if (fromBlob.length > 0) return fromBlob
  }

  const dir = join(CLIENTS_DIR, clientSlug, 'signing')
  if (!existsSync(dir)) return []

  return readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => readRequestFile(join(dir, f)))
    .filter((r): r is SigningRequest => r !== null && r.documentId === documentId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function getLatestRequestForDocument(
  documentId: string,
  clientSlug: string,
): Promise<SigningRequest | null> {
  const list = await listRequestsForDocument(documentId, clientSlug)
  return list[0] ?? null
}

export async function getRequestByToken(token: string): Promise<SigningRequest | null> {
  if (blob.blobSigningEnabled()) {
    const fromBlob = await blob.blobGetByToken(token)
    if (fromBlob) return fromBlob
  }

  if (!existsSync(CLIENTS_DIR)) return null

  for (const slug of readdirSync(CLIENTS_DIR)) {
    const dir = join(CLIENTS_DIR, slug, 'signing')
    if (!existsSync(dir)) continue
    for (const file of readdirSync(dir).filter(f => f.endsWith('.json'))) {
      const req = readRequestFile(join(dir, file))
      if (req?.token === token) return req
    }
  }
  return null
}

export async function getRequestById(
  id: string,
  clientSlug: string,
): Promise<SigningRequest | null> {
  if (blob.blobSigningEnabled()) {
    const fromBlob = await blob.blobGetById(id, clientSlug)
    if (fromBlob) return fromBlob
  }

  const path = join(CLIENTS_DIR, clientSlug, 'signing', `${id}.json`)
  if (!existsSync(path)) return null
  return readRequestFile(path)
}

export function isRequestExpired(request: SigningRequest): boolean {
  return new Date(request.expiresAt).getTime() < Date.now()
}

export async function ensureRequestActive(
  request: SigningRequest,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (request.status === 'signed') {
    return { ok: false, error: 'Ce document a déjà été signé.' }
  }
  if (request.status === 'cancelled') {
    return { ok: false, error: 'Cette demande de signature a été annulée.' }
  }
  if (isRequestExpired(request)) {
    if (request.status === 'pending') {
      request.status = 'expired'
      await persistRequest(request)
    }
    return { ok: false, error: 'Ce lien de signature a expiré.' }
  }
  return { ok: true }
}

export async function completeSigningRequest(
  request: SigningRequest,
  audit: SigningAudit,
  atomeFileId?: string,
): Promise<SigningRequest> {
  request.status = 'signed'
  request.signedAt = new Date().toISOString()
  request.audit = audit
  if (atomeFileId) request.atomeFileId = atomeFileId
  await persistRequest(request)
  return request
}

export async function updateSigningRequest(request: SigningRequest): Promise<SigningRequest> {
  await persistRequest(request)
  return request
}

export async function cancelSigningRequest(
  id: string,
  clientSlug: string,
): Promise<SigningRequest | null> {
  const req = await getRequestById(id, clientSlug)
  if (!req || req.status !== 'pending') return null
  req.status = 'cancelled'
  await persistRequest(req)
  return req
}

/** Local dev / Albert monorepo — reads clients/ on disk */
export async function getDocumentContext(documentId: string): Promise<SigningDocContext | null> {
  const store = await import('./file-store.js')
  const doc = store.getDocumentById(documentId)
  if (!doc) return null
  const client = store.getClientById(doc.clientId)
  if (!client) return null
  return {
    doc: {
      id: doc.id,
      clientId: doc.clientId,
      templateName: doc.templateName,
      title: doc.title,
      variables: doc.variables,
    },
    clientName: client.name,
    slug: client.slug,
  }
}

/** Prod: snapshot in Blob — no file-store */
export function getDocumentContextForRequest(request: SigningRequest): SigningDocContext | null {
  const snap = request.documentSnapshot
  if (!snap) return null
  const clientName = snap.clientName || snap.variables?.clientName
  if (!clientName) return null
  return {
    doc: {
      id: request.documentId,
      clientId: snap.clientId,
      templateName: snap.templateName,
      title: snap.title,
      variables: snap.variables,
    },
    clientName,
    slug: request.clientSlug,
  }
}

export function formatSignedDateFr(date = new Date()): string {
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
