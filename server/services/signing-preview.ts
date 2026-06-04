import type { SigningRequest } from './signing-store.js'
import {
  getDocumentContextForRequest,
  getRequestByToken,
  updateSigningRequest,
  getSigningPublicBaseUrl,
} from './signing-store.js'
import { blobGetPreviewPdfUrl, blobPutPreviewPdf } from './signing-blob-pdf.js'
import { scheduleBackground } from './signing-background.js'

export async function resolvePreviewPdfUrl(request: SigningRequest): Promise<string | null> {
  if (request.previewPdfUrl) return request.previewPdfUrl
  return blobGetPreviewPdfUrl(request.token)
}

/** Generate unsigned contract PDF and store on Blob (Puppeteer). */
export async function generatePreviewPdf(request: SigningRequest): Promise<string | null> {
  const fresh = (await getRequestByToken(request.token)) ?? request
  const existing = await resolvePreviewPdfUrl(fresh)
  if (existing) {
    if (!fresh.previewPdfUrl) {
      fresh.previewPdfUrl = existing
      fresh.previewStatus = 'ready'
      await updateSigningRequest(fresh)
    }
    return existing
  }

  const ctx = getDocumentContextForRequest(fresh)
  if (!ctx) {
    fresh.previewStatus = 'failed'
    await updateSigningRequest(fresh)
    return null
  }

  try {
    const { generateDocumentPdfBuffer } = await import('./document-pdf.js')
    const pdfBuffer = await generateDocumentPdfBuffer(ctx.doc)
    const url = await blobPutPreviewPdf(fresh.token, pdfBuffer)
    fresh.previewPdfUrl = url
    fresh.previewStatus = 'ready'
    await updateSigningRequest(fresh)
    return url
  } catch (err) {
    console.error('Preview PDF generation failed:', err)
    fresh.previewStatus = 'failed'
    await updateSigningRequest(fresh)
    return null
  }
}

async function triggerPreviewJob(token: string): Promise<void> {
  const base = getSigningPublicBaseUrl()
  const secret = process.env.SIGNING_JOB_SECRET?.trim()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (secret) headers['x-signing-job'] = secret

  const res = await fetch(`${base}/api/signing/preview/${token}`, {
    method: 'POST',
    headers,
    body: '{}',
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Preview job HTTP ${res.status}: ${text}`)
  }
}

export function schedulePreviewPdf(request: SigningRequest): void {
  if (request.previewStatus === 'ready' && request.previewPdfUrl) return

  request.previewStatus = 'pending'
  void updateSigningRequest(request).then(() => {
    scheduleBackground(async () => {
      try {
        if (process.env.VERCEL) {
          await triggerPreviewJob(request.token)
        } else {
          await generatePreviewPdf(request)
        }
      } catch (err) {
        console.error('schedulePreviewPdf failed:', err)
        const fresh = await getRequestByToken(request.token)
        if (fresh) {
          fresh.previewStatus = 'failed'
          await updateSigningRequest(fresh)
        }
      }
    })
  })
}
