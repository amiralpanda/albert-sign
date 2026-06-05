import type { VercelRequest, VercelResponse } from '@vercel/node'
import { hashDocument, renderDocumentHtml } from '../services/document-hash.js'
import {
  getRequestByToken,
  ensureRequestActive,
  getDocumentContextForRequest,
  getSigningPublicBaseUrl,
  type SigningDocContext,
  type SigningRequest,
} from '../services/signing-store.js'

export type SigningDocumentResolved =
  | { ok: true; request: SigningRequest; ctx: SigningDocContext; html: string }
  | { ok: false; status: number; error: string }

export async function resolveSigningDocument(token: string): Promise<SigningDocumentResolved> {
  const request = await getRequestByToken(token)
  if (!request) {
    return { ok: false, status: 404, error: 'Lien invalide' }
  }

  const active = await ensureRequestActive(request)
  if (!active.ok) {
    return { ok: false, status: 410, error: active.ok === false ? active.error : 'Lien expiré' }
  }

  const ctx = getDocumentContextForRequest(request)
  if (!ctx) {
    return { ok: false, status: 404, error: 'Document introuvable' }
  }

  const currentHash = hashDocument(ctx.doc.templateName, ctx.doc.variables)
  if (currentHash !== request.documentHash) {
    return {
      ok: false,
      status: 409,
      error:
        "Le contrat a été modifié depuis l'envoi de ce lien. Demandez un nouveau lien de signature.",
    }
  }

  const html = renderDocumentHtml(ctx.doc.templateName, ctx.doc.variables)
  if (!html) {
    return { ok: false, status: 500, error: 'Impossible d\'afficher le contrat' }
  }

  return { ok: true, request, ctx, html }
}

export function buildSigningDocumentUrl(token: string): string {
  return `${getSigningPublicBaseUrl()}/api/signing/${token}/document`
}

export async function handleSigningPublicGet(
  req: VercelRequest,
  res: VercelResponse,
  token: string,
): Promise<void> {
  try {
    const resolved = await resolveSigningDocument(token)
    if (!resolved.ok) {
      res.status(resolved.status).json({ error: resolved.error })
      return
    }

    const { request, ctx } = resolved
    res.status(200).json({
      documentTitle: ctx.doc.title,
      clientName: ctx.clientName,
      signerEmail: request.signerEmail,
      expiresAt: request.expiresAt,
      documentUrl: buildSigningDocumentUrl(token),
      previewPdfUrl: request.previewPdfUrl || null,
      previewStatus: request.previewStatus || null,
    })
  } catch (error) {
    console.error('Error loading signing page:', error)
    res.status(500).json({ error: 'Failed to load signing page' })
  }
}

export async function handleSigningPublicDocument(
  _req: VercelRequest,
  res: VercelResponse,
  token: string,
): Promise<void> {
  try {
    const resolved = await resolveSigningDocument(token)
    if (!resolved.ok) {
      res.status(resolved.status).send(
        `<!DOCTYPE html><html lang="fr"><body style="font-family:sans-serif;padding:2rem"><h1>${resolved.error}</h1></body></html>`,
      )
      return
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'private, max-age=3600')
    res.setHeader('X-Frame-Options', 'SAMEORIGIN')
    res.status(200).send(resolved.html)
  } catch (error) {
    console.error('Error loading signing document:', error)
    res.status(500).send('Failed to load document')
  }
}

/** 64-char hex signing tokens only */
export function isSigningTokenSegment(segment: string): boolean {
  return /^[a-f0-9]{64}$/i.test(segment)
}

export function parseSigningUrl(url: string): {
  kind: 'public-get' | 'public-sign' | 'public-document' | 'full'
  token?: string
} {
  const path = (url || '').split('?')[0]
  const match = path.match(/^\/api\/signing\/([^/]+)(?:\/(sign|document))?\/?$/)
  if (!match) return { kind: 'full' }

  const segment = match[1]
  const action = match[2]

  if (segment === 'requests' || segment === 'resend-invitation' || segment.startsWith('status')) {
    return { kind: 'full' }
  }

  if (!isSigningTokenSegment(segment)) return { kind: 'full' }

  if (action === 'sign') return { kind: 'public-sign', token: segment }
  if (action === 'document') return { kind: 'public-document', token: segment }
  return { kind: 'public-get', token: segment }
}
