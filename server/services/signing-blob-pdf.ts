import { put, head } from '@vercel/blob'

function previewPath(token: string): string {
  return `signing/previews/${token}.pdf`
}

function signedPath(token: string): string {
  return `signing/signed/${token}.pdf`
}

export async function blobPutPreviewPdf(token: string, pdf: Buffer): Promise<string> {
  const result = await put(previewPath(token), pdf, {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/pdf',
  })
  return result.url
}

export async function blobPutSignedPdf(token: string, pdf: Buffer): Promise<string> {
  const result = await put(signedPath(token), pdf, {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/pdf',
  })
  return result.url
}

export async function blobGetPreviewPdfUrl(token: string): Promise<string | null> {
  try {
    const meta = await head(previewPath(token))
    return meta.downloadUrl
  } catch {
    return null
  }
}
