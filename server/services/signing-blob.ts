import { put, head, list } from '@vercel/blob'
import type { SigningRequest } from './signing-store.js'

function requestPath(slug: string, id: string): string {
  return `signing/${slug}/${id}.json`
}

function tokenPath(token: string): string {
  return `signing/tokens/${token}.json`
}

function latestForDocumentPath(slug: string, documentId: string): string {
  return `signing/${slug}/latest/${documentId}.json`
}

function blobToken(): string | undefined {
  return process.env.BLOB_READ_WRITE_TOKEN?.trim() || undefined
}

export function blobSigningEnabled(): boolean {
  return Boolean(blobToken())
}

async function fetchJson(url: string): Promise<SigningRequest | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return (await res.json()) as SigningRequest
  } catch {
    return null
  }
}

function blobOpts() {
  const token = blobToken()
  return {
    access: 'public' as const,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    ...(token ? { token } : {}),
  }
}

export async function blobSaveRequest(request: SigningRequest): Promise<void> {
  const body = JSON.stringify(request)
  const opts = blobOpts()
  await put(requestPath(request.clientSlug, request.id), body, opts)
  await put(tokenPath(request.token), body, opts)
  await put(latestForDocumentPath(request.clientSlug, request.documentId), body, opts)
}

export async function blobGetByToken(token: string): Promise<SigningRequest | null> {
  try {
    const meta = await head(tokenPath(token), blobToken() ? { token: blobToken()! } : undefined)
    return fetchJson(meta.downloadUrl)
  } catch {
    return null
  }
}

export async function blobGetById(
  id: string,
  clientSlug: string,
): Promise<SigningRequest | null> {
  try {
    const meta = await head(requestPath(clientSlug, id), blobToken() ? { token: blobToken()! } : undefined)
    return fetchJson(meta.downloadUrl)
  } catch {
    return null
  }
}

export async function blobGetLatestForDocument(
  documentId: string,
  clientSlug: string,
): Promise<SigningRequest | null> {
  try {
    const meta = await head(
      latestForDocumentPath(clientSlug, documentId),
      blobToken() ? { token: blobToken()! } : undefined,
    )
    return fetchJson(meta.downloadUrl)
  } catch {
    return null
  }
}

export async function blobListForDocument(
  documentId: string,
  clientSlug: string,
): Promise<SigningRequest[]> {
  const latest = await blobGetLatestForDocument(documentId, clientSlug)
  if (latest) return [latest]

  const token = blobToken()
  const { blobs } = await list({
    prefix: `signing/${clientSlug}/`,
    limit: 100,
    ...(token ? { token } : {}),
  })
  const requests: SigningRequest[] = []
  for (const blob of blobs) {
    if (!blob.pathname.endsWith('.json') || blob.pathname.includes('/tokens/')) continue
    if (blob.pathname.includes('/latest/')) continue
    const req = await fetchJson(blob.downloadUrl)
    if (req?.documentId === documentId) requests.push(req)
  }
  return requests.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
