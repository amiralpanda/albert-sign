import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  handleCancelRequest,
  handleCreateRequest,
  handleListRequests,
  handleResendInvitation,
  handleStatus,
} from '../server/handlers/signing-admin.js'

function pathname(req: VercelRequest): string {
  const raw = req.url || '/'
  return raw.split('?')[0] || '/'
}

/** Admin signing routes — lightweight handler (no Express cold start). */
export default async function vercelHandler(req: VercelRequest, res: VercelResponse) {
  const path = pathname(req)
  const method = req.method || 'GET'

  if (path === '/api/signing/resend-invitation' && method === 'POST') {
    return handleResendInvitation(req, res)
  }

  if (path.startsWith('/api/signing/status/') && method === 'GET') {
    const documentId = decodeURIComponent(path.slice('/api/signing/status/'.length))
    return handleStatus(req, res, documentId)
  }

  if (path === '/api/signing/requests' && method === 'GET') {
    return handleListRequests(req, res)
  }

  if (path === '/api/signing/requests' && method === 'POST') {
    return handleCreateRequest(req, res)
  }

  const deleteMatch = path.match(/^\/api\/signing\/requests\/([^/]+)$/)
  if (deleteMatch && method === 'DELETE') {
    return handleCancelRequest(req, res, decodeURIComponent(deleteMatch[1]))
  }

  res.status(404).json({ error: 'Not found' })
}
