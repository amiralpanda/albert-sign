import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SIGNATURE_PATH = join(__dirname, '..', '..', 'methodology', 'assets', 'jeremy-signature.png')

let cachedDataUrl: string | null = null

export function getDefaultEditorSignatureImage(): string | null {
  if (cachedDataUrl) return cachedDataUrl
  if (!existsSync(SIGNATURE_PATH)) return null
  const buf = readFileSync(SIGNATURE_PATH)
  cachedDataUrl = `data:image/png;base64,${buf.toString('base64')}`
  return cachedDataUrl
}

export function getDefaultEditorName(): string {
  return process.env.SIGNING_INVITER_NAME || 'Jérémy Foucray'
}

export function formatEditorDate(date = new Date()): string {
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function ensureEditorSignatureVariables(
  variables: Record<string, string>,
): Record<string, string> {
  const out = { ...variables }
  if (!out.editorSignatureImage?.trim()) {
    const img = getDefaultEditorSignatureImage()
    if (img) out.editorSignatureImage = img
  }
  if (!out.editorName?.trim()) out.editorName = getDefaultEditorName()
  if (!out.editorDate?.trim()) out.editorDate = formatEditorDate()
  return out
}
