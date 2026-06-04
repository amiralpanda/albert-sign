import { Router } from 'express'
import { appendFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { hashDocument } from '../services/document-hash.js'
import { requiresSignatureForTemplate } from '../services/document-type.js'
import {
  buildSignUrl,
  createSigningRequest,
  getLatestRequestForDocument,
  cancelSigningRequest,
  getDocumentContext,
  getDocumentContextForRequest,
  listRequestsForDocument,
  updateSigningRequest,
  type SigningDocContext,
  type SigningDocumentSnapshot,
} from '../services/signing-store.js'
import { sendSigningInvitationEmail } from '../services/signing-mail.js'
import { schedulePreviewPdf } from '../services/signing-preview.js'
import { handleSigningCompletePost } from '../handlers/signing-complete.js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WORKSPACE_ROOT = join(__dirname, '..', '..')

function logClientEvent(clientSlug: string, type: string, data: Record<string, unknown>) {
  try {
    const line =
      JSON.stringify({ ts: new Date().toISOString(), type, data, source: 'api/signing' }) + '\n'
    appendFileSync(join(WORKSPACE_ROOT, 'clients', clientSlug, 'events.jsonl'), line, 'utf-8')
  } catch {
    /* ignore */
  }
}

export const signingRouter = Router()

// ========== ADMIN ==========

signingRouter.get('/requests', async (req, res) => {
  try {
    const documentId = req.query.documentId as string
    const clientSlug = req.query.clientSlug as string
    if (!documentId || !clientSlug) {
      return res.status(400).json({ error: 'documentId and clientSlug are required' })
    }
    const requests = await listRequestsForDocument(documentId, clientSlug)
    res.json(requests)
  } catch (error) {
    console.error('Error listing signing requests:', error)
    res.status(500).json({ error: 'Failed to list signing requests' })
  }
})

signingRouter.post('/requests', async (req, res) => {
  try {
    const {
      documentId,
      signerEmail,
      signerName,
      sendEmail = true,
      clientSlug: bodySlug,
      clientName: bodyClientName,
      documentSnapshot: bodySnapshot,
    } = req.body

    if (!documentId || !signerEmail) {
      return res.status(400).json({ error: 'documentId and signerEmail are required' })
    }

    let ctx: SigningDocContext | null = null
    let snapshot: SigningDocumentSnapshot | undefined = bodySnapshot

    const snapshotClientName = bodySnapshot?.clientName || bodyClientName
    if (bodySlug && bodySnapshot?.templateName && bodySnapshot?.title && bodySnapshot?.variables && snapshotClientName) {
      snapshot = {
        templateName: bodySnapshot.templateName,
        title: bodySnapshot.title,
        clientId: bodySnapshot.clientId ?? '',
        clientName: snapshotClientName,
        variables: { ...bodySnapshot.variables },
      }
      ctx = {
        doc: {
          id: documentId,
          clientId: snapshot.clientId,
          templateName: snapshot.templateName,
          title: snapshot.title,
          variables: { ...snapshot.variables },
        },
        clientName: snapshot.clientName,
        slug: bodySlug,
      }
    } else {
      ctx = await getDocumentContext(documentId)
      if (!ctx) return res.status(404).json({ error: 'Document not found' })
      snapshot = {
        templateName: ctx.doc.templateName,
        title: ctx.doc.title,
        clientId: ctx.doc.clientId,
        clientName: ctx.clientName,
        variables: { ...ctx.doc.variables },
      }
    }

    if (!requiresSignatureForTemplate(ctx.doc.templateName)) {
      return res.status(400).json({ error: 'This document type does not require electronic signature' })
    }

    const documentHash = hashDocument(ctx.doc.templateName, ctx.doc.variables)
    if (!documentHash) {
      return res.status(500).json({ error: 'Failed to hash document content' })
    }

    const request = await createSigningRequest({
      documentId,
      clientSlug: ctx.slug,
      documentHash,
      signerEmail,
      signerName,
      documentSnapshot: snapshot,
    })

    schedulePreviewPdf(request)

    const signUrl = buildSignUrl(request.token)
    let emailResult: { sent: boolean; error?: string } = { sent: false }

    if (sendEmail) {
      emailResult = await sendSigningInvitationEmail({
        to: request.signerEmail,
        templateName: ctx.doc.templateName,
        documentTitle: ctx.doc.title,
        clientName: ctx.clientName,
        signUrl,
        expiresAt: request.expiresAt,
      })
      if (emailResult.sent) {
        request.invitationEmailSent = true
        await updateSigningRequest(request)
      }
    }

    logClientEvent(ctx.slug, 'signing_request_created', {
      documentId,
      requestId: request.id,
      signerEmail: request.signerEmail,
      invitationSent: emailResult.sent,
    })

    res.json({
      request,
      signUrl,
      invitationEmail: emailResult,
    })
  } catch (error) {
    console.error('Error creating signing request:', error)
    res.status(500).json({ error: 'Failed to create signing request' })
  }
})

signingRouter.delete('/requests/:id', async (req, res) => {
  try {
    const clientSlug = req.query.clientSlug as string
    if (!clientSlug) return res.status(400).json({ error: 'clientSlug query is required' })

    const cancelled = await cancelSigningRequest(req.params.id, clientSlug)
    if (!cancelled) return res.status(404).json({ error: 'Pending request not found' })

    logClientEvent(clientSlug, 'signing_request_cancelled', {
      requestId: cancelled.id,
      documentId: cancelled.documentId,
    })

    res.json(cancelled)
  } catch (error) {
    console.error('Error cancelling signing request:', error)
    res.status(500).json({ error: 'Failed to cancel signing request' })
  }
})

/** Document signing status for admin UI */
signingRouter.get('/status/:documentId', async (req, res) => {
  try {
    const clientSlug = req.query.clientSlug as string
    if (!clientSlug) return res.status(400).json({ error: 'clientSlug required' })

    const latest = await getLatestRequestForDocument(req.params.documentId, clientSlug)
    const uploads = await import('../services/atome-uploads.js')
    const upload = uploads.getActiveUploadForSource('document', req.params.documentId)

    let albertStatus: 'draft' | 'pending_signature' | 'signed' = 'draft'
    if (latest?.status === 'signed') albertStatus = 'signed'
    else if (latest?.status === 'pending') albertStatus = 'pending_signature'

    res.json({
      status: albertStatus,
      latestRequest: latest,
      atomeFileId: latest?.atomeFileId || upload?.atomeFileId,
      signUrl: latest?.status === 'pending' ? buildSignUrl(latest.token) : undefined,
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get signing status' })
  }
})

/** Resend invitation email for the current pending request */
signingRouter.post('/resend-invitation', async (req, res) => {
  try {
    const { documentId, clientSlug } = req.body
    if (!documentId || !clientSlug) {
      return res.status(400).json({ error: 'documentId and clientSlug are required' })
    }

    const latest = await getLatestRequestForDocument(documentId, clientSlug)
    if (!latest || latest.status !== 'pending') {
      return res.status(404).json({ error: 'No pending signing request for this document' })
    }

    const ctx =
      getDocumentContextForRequest(latest) ?? (await getDocumentContext(documentId))
    if (!ctx) return res.status(404).json({ error: 'Document not found' })

    const signUrl = buildSignUrl(latest.token)
    const templateName =
      latest.documentSnapshot?.templateName ?? ctx.doc.templateName
    const emailResult = await sendSigningInvitationEmail({
      to: latest.signerEmail,
      templateName,
      documentTitle: ctx.doc.title,
      clientName: ctx.clientName,
      signUrl,
      expiresAt: latest.expiresAt,
    })

    if (emailResult.sent) {
      latest.invitationEmailSent = true
      await updateSigningRequest(latest)
    }

    res.json({ signUrl, invitationEmail: emailResult })
  } catch (error) {
    console.error('Error resending invitation:', error)
    res.status(500).json({ error: 'Failed to resend invitation' })
  }
})

// ========== PUBLIC (token) ==========

signingRouter.get('/:token', async (req, res) => {
  const { handleSigningPublicGet } = await import('../handlers/signing-public.js')
  return handleSigningPublicGet(req as unknown as VercelRequest, res as unknown as VercelResponse, req.params.token)
})

signingRouter.post('/:token/sign', async (req, res) => {
  return handleSigningCompletePost(req as unknown as VercelRequest, res as unknown as VercelResponse, req.params.token)
})
