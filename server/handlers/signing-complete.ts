import type { VercelRequest, VercelResponse } from '@vercel/node'
import { documentPdfFilename } from '../lib/document-filename.js'
import { hashDocument } from '../services/document-hash.js'
import {
  getRequestByToken,
  ensureRequestActive,
  getDocumentContextForRequest,
  completeSigningRequest,
  updateSigningRequest,
} from '../services/signing-store.js'
import { resolveSigningLocale, formatSigningDate } from '../services/signing-locale.js'
import { scheduleBackground } from '../services/signing-background.js'
import { blobPutSignedPdf } from '../services/signing-blob-pdf.js'

const signAttempts = new Map<string, { count: number; resetAt: number }>()

function rateLimitSign(ip: string): boolean {
  const now = Date.now()
  const entry = signAttempts.get(ip)
  if (!entry || entry.resetAt < now) {
    signAttempts.set(ip, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (entry.count >= 10) return false
  entry.count++
  return true
}

async function finalizeSignature(params: {
  request: Awaited<ReturnType<typeof getRequestByToken>>
  signerName: string
  signerTitle: string
  signerEmail: string
  signatureImage: string
  ip: string
  userAgent?: string
}): Promise<void> {
  const { request, signerName, signerTitle, signatureImage, ip, userAgent } = params
  if (!request) return

  const ctx = getDocumentContextForRequest(request)
  if (!ctx) throw new Error('Document context missing')

  const email = signerEmail.trim().toLowerCase()
  const templateName = request.documentSnapshot?.templateName ?? ctx.doc.templateName
  const locale = resolveSigningLocale(templateName)
  const signedDate = formatSigningDate(new Date(), locale)

  const updatedVariables = {
    ...ctx.doc.variables,
    clientSignatureImage: signatureImage,
    clientSignerName: signerName,
    clientSignerTitle: signerTitle || '',
    clientSignedDate: signedDate,
  }

  if (request.documentSnapshot) {
    request.documentSnapshot.variables = updatedVariables
  }

  const signedDoc = { ...ctx.doc, variables: updatedVariables }
  const { generateDocumentPdfBuffer } = await import('../services/document-pdf.js')
  const pdfBuffer = await generateDocumentPdfBuffer(signedDoc)
  const filename = documentPdfFilename(signedDoc.title)

  await blobPutSignedPdf(request.token, pdfBuffer)

  const atome = await import('../services/atome-client.js')
  const file = await atome.uploadFile(filename, 'application/pdf', pdfBuffer, {
    isOrganizationAccessible: true,
  })

  try {
    const uploads = await import('../services/atome-uploads.js')
    uploads.logUpload({
      atomeFileId: file.id,
      sourceType: 'document',
      sourceId: request.documentId,
      clientSlug: ctx.slug,
      filename: file.filename,
      sizeBytes: pdfBuffer.length,
      uploadedAt: new Date().toISOString(),
    })
  } catch {
    /* optional */
  }

  const { syncSignedDocumentToAtome } = await import('../services/atome-document-sync.js')
  const syncResult = await syncSignedDocumentToAtome({
    fileId: file.id,
    documentId: request.documentId,
    templateName: signedDoc.templateName,
    signerEmail: email,
    signedAt: new Date().toISOString().slice(0, 10),
  })

  const audit = {
    ip,
    userAgent,
    consentAt: new Date().toISOString(),
    signerName,
    signerTitle,
    signerEmail: email,
  }

  await completeSigningRequest(request, audit, file.id)

  const { sendSigningCompletionEmail } = await import('../services/signing-mail.js')
  await sendSigningCompletionEmail({
    to: email,
    templateName,
    documentTitle: signedDoc.title,
    clientName: ctx.clientName,
    signerName,
    signedAt: signedDate,
    pdfBuffer,
    pdfFilename: filename,
  })

  console.log('Signature finalized', {
    requestId: request.id,
    atomeFileId: file.id,
    atomeSync: syncResult,
  })
}

export async function handleSigningCompletePost(
  req: VercelRequest,
  res: VercelResponse,
  token: string,
): Promise<void> {
  try {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.socket as { remoteAddress?: string })?.remoteAddress ||
      'unknown'

    if (!rateLimitSign(ip)) {
      res.status(429).json({ error: 'Trop de tentatives. Réessayez dans une minute.' })
      return
    }

    const body = typeof req.body === 'object' && req.body ? req.body : {}
    const { signerName, signerTitle, signerEmail, signatureImage, consent } = body as Record<
      string,
      string | boolean
    >

    if (!consent) {
      res.status(400).json({ error: 'Vous devez accepter de signer le document.' })
      return
    }
    if (!signerName || !signatureImage) {
      res.status(400).json({ error: 'Nom et signature sont requis.' })
      return
    }

    const request = await getRequestByToken(token)
    if (!request) {
      res.status(404).json({ error: 'Lien invalide' })
      return
    }

    const active = await ensureRequestActive(request)
    if (!active.ok) {
      res.status(410).json({ error: active.error })
      return
    }

    const ctx = getDocumentContextForRequest(request)
    if (!ctx) {
      res.status(404).json({ error: 'Document not found' })
      return
    }

    const currentHash = hashDocument(ctx.doc.templateName, ctx.doc.variables)
    if (currentHash !== request.documentHash) {
      res.status(409).json({
        error:
          "Le contrat a été modifié depuis l'envoi de ce lien. Demandez un nouveau lien de signature.",
      })
      return
    }

    const email = String(signerEmail || request.signerEmail).trim().toLowerCase()

    request.signProcessing = true
    await updateSigningRequest(request)

    scheduleBackground(async () => {
      try {
        await finalizeSignature({
          request,
          signerName: String(signerName).trim(),
          signerTitle: String(signerTitle || '').trim(),
          signerEmail: email,
          signatureImage: String(signatureImage),
          ip,
          userAgent: req.headers['user-agent'],
        })
      } catch (err) {
        console.error('finalizeSignature failed:', err)
        request.signProcessing = false
        await updateSigningRequest(request)
      }
    })

    res.status(200).json({
      success: true,
      processing: true,
      message:
        'Signature enregistrée. Le PDF signé sera envoyé par email dans quelques instants.',
    })
  } catch (error) {
    console.error('Error accepting signature:', error)
    res.status(500).json({ error: 'Failed to complete signature' })
  }
}
