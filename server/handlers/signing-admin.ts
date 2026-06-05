import type { VercelRequest, VercelResponse } from '@vercel/node'
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
import { ensureEditorSignatureVariables } from '../services/editor-signature.js'
import { schedulePreviewPdf } from '../services/signing-preview.js'

function json(res: VercelResponse, status: number, body: unknown) {
  res.status(status).json(body)
}

export async function handleListRequests(req: VercelRequest, res: VercelResponse) {
  try {
    const documentId = req.query.documentId as string
    const clientSlug = req.query.clientSlug as string
    if (!documentId || !clientSlug) {
      return json(res, 400, { error: 'documentId and clientSlug are required' })
    }
    const requests = await listRequestsForDocument(documentId, clientSlug)
    return json(res, 200, requests)
  } catch (error) {
    console.error('Error listing signing requests:', error)
    return json(res, 500, { error: 'Failed to list signing requests' })
  }
}

export async function handleCreateRequest(req: VercelRequest, res: VercelResponse) {
  try {
    const {
      documentId,
      signerEmail,
      signerName,
      sendEmail = true,
      clientSlug: bodySlug,
      clientName: bodyClientName,
      documentSnapshot: bodySnapshot,
    } = typeof req.body === 'object' && req.body ? req.body : {}

    if (!documentId || !signerEmail) {
      return json(res, 400, { error: 'documentId and signerEmail are required' })
    }

    let ctx: SigningDocContext | null = null
    let snapshot: SigningDocumentSnapshot | undefined = bodySnapshot

    const snapshotClientName = bodySnapshot?.clientName || bodyClientName
    if (
      bodySlug &&
      bodySnapshot?.templateName &&
      bodySnapshot?.title &&
      bodySnapshot?.variables &&
      snapshotClientName
    ) {
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
      if (!ctx) return json(res, 404, { error: 'Document not found' })
      snapshot = {
        templateName: ctx.doc.templateName,
        title: ctx.doc.title,
        clientId: ctx.doc.clientId,
        clientName: ctx.clientName,
        variables: { ...ctx.doc.variables },
      }
    }

    if (!requiresSignatureForTemplate(ctx.doc.templateName)) {
      return json(res, 400, { error: 'This document type does not require electronic signature' })
    }

    ctx.doc.variables = ensureEditorSignatureVariables(ctx.doc.variables)
    if (snapshot) snapshot.variables = { ...ctx.doc.variables }

    const documentHash = hashDocument(ctx.doc.templateName, ctx.doc.variables)
    if (!documentHash) {
      return json(res, 500, { error: 'Failed to hash document content' })
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

    return json(res, 200, { request, signUrl, invitationEmail: emailResult })
  } catch (error) {
    console.error('Error creating signing request:', error)
    return json(res, 500, { error: 'Failed to create signing request' })
  }
}

export async function handleCancelRequest(req: VercelRequest, res: VercelResponse, id: string) {
  try {
    const clientSlug = req.query.clientSlug as string
    if (!clientSlug) return json(res, 400, { error: 'clientSlug query is required' })

    const cancelled = await cancelSigningRequest(id, clientSlug)
    if (!cancelled) return json(res, 404, { error: 'Pending request not found' })

    return json(res, 200, cancelled)
  } catch (error) {
    console.error('Error cancelling signing request:', error)
    return json(res, 500, { error: 'Failed to cancel signing request' })
  }
}

export async function handleStatus(req: VercelRequest, res: VercelResponse, documentId: string) {
  try {
    const clientSlug = req.query.clientSlug as string
    if (!clientSlug) return json(res, 400, { error: 'clientSlug required' })

    const latest = await getLatestRequestForDocument(documentId, clientSlug)
    const uploads = await import('../services/atome-uploads.js')
    const upload = uploads.getActiveUploadForSource('document', documentId)

    let albertStatus: 'draft' | 'pending_signature' | 'signed' = 'draft'
    if (latest?.status === 'signed') albertStatus = 'signed'
    else if (latest?.status === 'pending') albertStatus = 'pending_signature'

    return json(res, 200, {
      status: albertStatus,
      latestRequest: latest,
      atomeFileId: latest?.atomeFileId || upload?.atomeFileId,
      signUrl: latest?.status === 'pending' ? buildSignUrl(latest.token) : undefined,
    })
  } catch (error) {
    console.error('Error getting signing status:', error)
    return json(res, 500, { error: 'Failed to get signing status' })
  }
}

export async function handleResendInvitation(req: VercelRequest, res: VercelResponse) {
  try {
    const body = typeof req.body === 'object' && req.body ? req.body : {}
    const { documentId, clientSlug } = body as { documentId?: string; clientSlug?: string }
    if (!documentId || !clientSlug) {
      return json(res, 400, { error: 'documentId and clientSlug are required' })
    }

    const latest = await getLatestRequestForDocument(documentId, clientSlug)
    if (!latest || latest.status !== 'pending') {
      return json(res, 404, { error: 'No pending signing request for this document' })
    }

    const ctx =
      getDocumentContextForRequest(latest) ?? (await getDocumentContext(documentId))
    if (!ctx) return json(res, 404, { error: 'Document not found' })

    const signUrl = buildSignUrl(latest.token)
    const templateName = latest.documentSnapshot?.templateName ?? ctx.doc.templateName
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

    return json(res, 200, { signUrl, invitationEmail: emailResult })
  } catch (error) {
    console.error('Error resending invitation:', error)
    return json(res, 500, { error: 'Failed to resend invitation' })
  }
}
