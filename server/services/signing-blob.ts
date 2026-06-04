import { put, head, list } from '@vercel/blob'
import type { SigningRequest } from './signing-store.js'

function requestPath(slug: string, id: string): string {
  return `signing/${slug}/${id}.json`
}

function tokenPath(token: string): string {
  return `signing/tokens/${token}.json`
}

export function blobSigningEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim())
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

export async function blobSaveRequest(request: SigningRequest): Promise<void> {
  const body = JSON.stringify(request)
  const opts = {
    access: 'public' as const,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  }
  await put(requestPath(request.clientSlug, request.id), body, opts)
  await put(tokenPath(request.token), body, opts)
}

export async function blobGetByToken(token: string): Promise<SigningRequest | null> {
  try {
    const meta = await head(tokenPath(token))
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
    const meta = await head(requestPath(clientSlug, id))
    return fetchJson(meta.downloadUrl)
  } catch {
    return null
  }
}

export async function blobListForDocument(
  documentId: string,
  clientSlug: string,
): Promise<SigningRequest[]> {
  const prefix = `signing/${clientSlug}/`
  const { blobs } = await list({ prefix, limit: 100 })
  const requests: SigningRequest[] = []
  for (const blob of blobs) {
    if (!blob.pathname.endsWith('.json') || blob.pathname.includes('/tokens/')) continue
    const req = await fetchJson(blob.downloadUrl)
    if (req?.documentId === documentId) requests.push(req)
  }
  return requests.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
