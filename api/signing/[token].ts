import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  handleSigningPublicGet,
  isSigningTokenSegment,
} from '../../server/handlers/signing-public.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = typeof req.query.token === 'string' ? req.query.token : ''
  if (!isSigningTokenSegment(token)) {
    return res.status(404).json({ error: 'Not found' })
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  return handleSigningPublicGet(req, res, token)
}
