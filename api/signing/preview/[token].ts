import type { VercelRequest, VercelResponse } from '@vercel/node'
import { generatePreviewPdf } from '../../../server/services/signing-preview.js'
import { getRequestByToken } from '../../../server/services/signing-store.js'
import { isSigningTokenSegment } from '../../../server/handlers/signing-public.js'

function jobAuthorized(req: VercelRequest): boolean {
  const secret = process.env.SIGNING_JOB_SECRET?.trim()
  if (!secret) return process.env.NODE_ENV !== 'production'
  return req.headers['x-signing-job'] === secret
}

/** Internal: generate unsigned PDF (Puppeteer — 2048MB). */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = typeof req.query.token === 'string' ? req.query.token : ''
  if (!isSigningTokenSegment(token)) {
    return res.status(404).json({ error: 'Not found' })
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  if (!jobAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const request = await getRequestByToken(token)
  if (!request) return res.status(404).json({ error: 'Request not found' })

  const url = await generatePreviewPdf(request)
  if (!url) return res.status(500).json({ error: 'Preview generation failed' })

  return res.status(200).json({ previewPdfUrl: url, previewStatus: 'ready' })
}
