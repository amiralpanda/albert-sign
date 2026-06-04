import type { VercelRequest, VercelResponse } from '@vercel/node'
import { hashDocument } from '../services/document-hash.js'
import {
  getRequestByToken,
  ensureRequestActive,
  getDocumentContextForRequest,
} from '../services/signing-store.js'
import {
  resolvePreviewPdfUrl,
  schedulePreviewPdf,
} from '../services/signing-preview.js'

export async function handleSigningPublicGet(
  req: VercelRequest,
  res: VercelResponse,
  token: string,
): Promise<void> {
  try {
    const request = await getRequestByToken(token)
    if (!request) {
      res.status(404).json({ error: 'Lien invalide' })
      return
    }

    const active = await ensureRequestActive(request)
    if (!active.ok) {
      res.status(410).json({ error: active.error })
      return
    }

    const ctx = getDocumentContextForRequest(request)
    if (!ctx) {
      res.status(404).json({ error: 'Document not found' })
      return
    }

    const currentHash = hashDocument(ctx.doc.templateName, ctx.doc.variables)
    if (currentHash !== request.documentHash) {
      res.status(409).json({
        error:
          "Le contrat a été modifié depuis l'envoi de ce lien. Demandez un nouveau lien de signature.",
      })
      return
    }

    let pdfUrl = await resolvePreviewPdfUrl(request)
    if (!pdfUrl && request.previewStatus !== 'pending') {
      schedulePreviewPdf(request)
    }

    res.status(200).json({
      documentTitle: ctx.doc.title,
      clientName: ctx.clientName,
      signerEmail: request.signerEmail,
      expiresAt: request.expiresAt,
      previewReady: Boolean(pdfUrl),
      previewStatus: pdfUrl ? 'ready' : request.previewStatus ?? 'pending',
      pdfUrl: pdfUrl ?? undefined,
    })
  } catch (error) {
    console.error('Error loading signing page:', error)
    res.status(500).json({ error: 'Failed to load signing page' })
  }
}

/** 64-char hex signing tokens only */
export function isSigningTokenSegment(segment: string): boolean {
  return /^[a-f0-9]{64}$/i.test(segment)
}

export function parseSigningUrl(url: string): {
  kind: 'public-get' | 'public-sign' | 'full'
  token?: string
} {
  const path = (url || '').split('?')[0]
  const match = path.match(/^\/api\/signing\/([^/]+)(?:\/(sign))?\/?$/)
  if (!match) return { kind: 'full' }

  const segment = match[1]
  const action = match[2]

  if (segment === 'requests' || segment === 'resend-invitation' || segment.startsWith('status')) {
    return { kind: 'full' }
  }

  if (!isSigningTokenSegment(segment)) return { kind: 'full' }

  if (action === 'sign') return { kind: 'public-sign', token: segment }
  return { kind: 'public-get', token: segment }
}
