import type { VercelRequest, VercelResponse } from '@vercel/node'

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

/** Admin routes only (requests, status, resend). Public GET/POST use api/signing/[token]*. */
export default async function vercelHandler(req: VercelRequest, res: VercelResponse) {
  const handler = await getSigningHandler()
  return handler(req, res)
}
