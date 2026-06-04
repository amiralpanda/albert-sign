import type { VercelRequest, VercelResponse } from '@vercel/node'
import { isSigningTokenSegment } from '../../../server/handlers/signing-public.js'
import {
  getRequestByToken,
  ensureRequestActive,
} from '../../../server/services/signing-store.js'
import { blobGetPreviewPdfUrl } from '../../../server/services/signing-blob-pdf.js'

/** GET /api/signing/:token/document — inline PDF preview (no forced download). */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = typeof req.query.token === 'string' ? req.query.token : ''
  if (!isSigningTokenSegment(token)) {
    return res.status(404).json({ error: 'Not found' })
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const request = await getRequestByToken(token)
  if (!request) return res.status(404).json({ error: 'Lien invalide' })

  const active = await ensureRequestActive(request)
  if (!active.ok) return res.status(410).json({ error: active.error })

  const pdfSource = request.previewPdfUrl || (await blobGetPreviewPdfUrl(token))
  if (!pdfSource) {
    return res.status(404).json({ error: 'PDF not ready' })
  }

  const upstream = await fetch(pdfSource)
  if (!upstream.ok) {
    return res.status(502).json({ error: 'Failed to load PDF' })
  }

  const buffer = Buffer.from(await upstream.arrayBuffer())
  const title = request.documentSnapshot?.title ?? 'contrat'
  const safeName = title.replace(/[^a-zA-Z0-9À-ÿ\s-]/g, '').replace(/\s+/g, '_')

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename="${safeName}.pdf"`)
  res.setHeader('Cache-Control', 'private, max-age=300')
  return res.status(200).send(buffer)
}
