import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleSigningCompletePost } from '../../../server/handlers/signing-complete.js'
import { isSigningTokenSegment } from '../../../server/handlers/signing-public.js'

/** POST /api/signing/:token/sign — instant ack; PDF/Atome/email in background. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = typeof req.query.token === 'string' ? req.query.token : ''
  if (!isSigningTokenSegment(token)) {
    return res.status(404).json({ error: 'Not found' })
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  return handleSigningCompletePost(req, res, token)
}
