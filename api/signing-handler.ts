import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  handleSigningPublicGet,
  parseSigningUrl,
} from '../server/handlers/signing-public.js'

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<unknown>

let signingHandler: Handler | null = null

async function getSigningHandler(): Promise<Handler> {
  if (!signingHandler) {
    const [{ createSigningApp }, { default: serverless }] = await Promise.all([
      import('../server/signing-app.js'),
      import('serverless-http'),
    ])
    signingHandler = serverless(createSigningApp()) as Handler
  }
  return signingHandler
}

export default async function vercelHandler(req: VercelRequest, res: VercelResponse) {
  const route = parseSigningUrl(req.url || '')

  if (route.kind === 'public-get' && req.method === 'GET' && route.token) {
    return handleSigningPublicGet(req, res, route.token)
  }

  const handler = await getSigningHandler()
  return handler(req, res)
}
