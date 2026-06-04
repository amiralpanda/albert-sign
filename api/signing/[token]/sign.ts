import type { VercelRequest, VercelResponse } from '@vercel/node'
import { isSigningTokenSegment } from '../../../server/handlers/signing-public.js'

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<unknown>

let signingHandler: Handler | null = null

async function getSigningHandler(): Promise<Handler> {
  if (!signingHandler) {
    const [{ createSigningApp }, { default: serverless }] = await Promise.all([
      import('../../../server/signing-app.js'),
      import('serverless-http'),
    ])
    signingHandler = serverless(createSigningApp()) as Handler
  }
  return signingHandler
}

/** POST /api/signing/:token/sign — PDF + Atome upload (heavy cold start). */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = typeof req.query.token === 'string' ? req.query.token : ''
  if (!isSigningTokenSegment(token)) {
    return res.status(404).json({ error: 'Not found' })
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const handler = await getSigningHandler()
  return handler(req, res)
}
