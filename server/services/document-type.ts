import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import * as store from './file-store.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WORKSPACE_ROOT = join(__dirname, '..', '..')
const TYPE_MAP_PATH = join(WORKSPACE_ROOT, 'config', 'albert-document-types.json')

const SIGNATURE_REQUIRED = new Set(['design_partnership', 'nda', 'amendment'])

let typeMapCache: Record<string, string> | null = null

function loadTypeMap(): Record<string, string> {
  if (typeMapCache) return typeMapCache
  if (!existsSync(TYPE_MAP_PATH)) {
    typeMapCache = {}
    return typeMapCache
  }
  typeMapCache = JSON.parse(readFileSync(TYPE_MAP_PATH, 'utf-8')) as Record<string, string>
  return typeMapCache
}

export function resolveDocumentType(templateName: string): string {
  const template = store.getDocumentTemplate(templateName)
  const meta = template?.meta as store.DocumentTemplateMeta & {
    documentType?: string
    requiresSignature?: boolean
  }
  if (meta?.documentType) return meta.documentType

  const map = loadTypeMap()
  if (map[templateName]) return map[templateName]

  if (templateName.startsWith('design-partnership')) return 'design_partnership'
  return 'other'
}

export function requiresSignature(documentType: string): boolean {
  return SIGNATURE_REQUIRED.has(documentType)
}

export function requiresSignatureForTemplate(templateName: string): boolean {
  const template = store.getDocumentTemplate(templateName)
  const meta = template?.meta as store.DocumentTemplateMeta & { requiresSignature?: boolean }
  if (meta?.requiresSignature === true) return true
  if (meta?.requiresSignature === false) return false
  return requiresSignature(resolveDocumentType(templateName))
}
