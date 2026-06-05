import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  handleSigningPublicDocument,
  isSigningTokenSegment,
} from '../../../server/handlers/signing-public.js'

/** GET /api/signing/:token/document — contract HTML for iframe (not embedded in JSON). */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = typeof req.query.token === 'string' ? req.query.token : ''
  if (!isSigningTokenSegment(token)) {
    return res.status(404).send('Not found')
  }
  if (req.method !== 'GET') {
    return res.status(405).send('Method not allowed')
  }
  return handleSigningPublicDocument(req, res, token)
}
