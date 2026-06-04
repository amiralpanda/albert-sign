import type { SigningRequest } from './signing-store.js'
import {
  getDocumentContextForRequest,
  getRequestByToken,
  updateSigningRequest,
} from './signing-store.js'
import { blobGetPreviewPdfUrl, blobPutPreviewPdf } from './signing-blob-pdf.js'
import { scheduleBackground } from './signing-background.js'

export async function resolvePreviewPdfUrl(request: SigningRequest): Promise<string | null> {
  if (request.previewPdfUrl) return request.previewPdfUrl
  return blobGetPreviewPdfUrl(request.token)
}

/** Generate unsigned contract PDF and store on Blob (Puppeteer — runs in background). */
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

export function schedulePreviewPdf(request: SigningRequest): void {
  if (request.previewStatus === 'ready' && request.previewPdfUrl) return
  request.previewStatus = 'pending'
  void updateSigningRequest(request).then(() => {
    scheduleBackground(() => generatePreviewPdf(request))
  })
}
