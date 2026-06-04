import type { VercelRequest, VercelResponse } from '@vercel/node'
import serverless from 'serverless-http'
import { createSigningApp } from '../server/signing-app.js'

const app = createSigningApp()
const handler = serverless(app)

export default async function vercelHandler(req: VercelRequest, res: VercelResponse) {
  return handler(req, res)
}
