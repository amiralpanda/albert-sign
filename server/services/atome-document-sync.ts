import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { atomePut } from '../lib/atome-api.js'
import { resolveDocumentType } from './document-type.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WORKSPACE_ROOT = join(__dirname, '..', '..')
const FIELDS_CONFIG_PATH = join(WORKSPACE_ROOT, 'config', 'atome-document-file-fields.json')

interface FieldsConfig {
  fields: Record<string, string | null>
  documentTypeOptions: Record<string, string | null>
  signatureStatusOptions: Record<string, string | null>
}

let configCache: FieldsConfig | null = null

function loadConfig(): FieldsConfig | null {
  if (configCache) return configCache
  if (!existsSync(FIELDS_CONFIG_PATH)) return null
  configCache = JSON.parse(readFileSync(FIELDS_CONFIG_PATH, 'utf-8')) as FieldsConfig
  return configCache
}

function fieldReady(slug: string): boolean {
  const cfg = loadConfig()
  return Boolean(cfg?.fields?.[slug])
}

async function putFileField(
  fileId: string,
  dataSlug: string,
  dataValue: unknown,
  apiKey?: string,
): Promise<void> {
  await atomePut('files', { file_id: fileId, data_slug: dataSlug, data_value: dataValue }, apiKey)
}

export interface SyncSignedDocumentParams {
  fileId: string
  documentId: string
  templateName: string
  signerEmail: string
  signedAt?: string
  apiKey?: string
}

export async function syncSignedDocumentToAtome(params: SyncSignedDocumentParams): Promise<{
  synced: boolean
  skipped?: string
}> {
  const cfg = loadConfig()
  if (!cfg?.fields?.document_type) {
    return {
      synced: false,
      skipped: 'Bootstrap Atome file fields first: node scripts/atome/bootstrap-document-file-fields.mjs',
    }
  }

  const docType = resolveDocumentType(params.templateName)
  const signedAt = params.signedAt || new Date().toISOString().slice(0, 10)

  const typeOptionId = cfg.documentTypeOptions[docType]
  const signedOptionId = cfg.signatureStatusOptions.signed

  if (typeOptionId && fieldReady('document_type')) {
    await putFileField(params.fileId, 'document_type', [typeOptionId], params.apiKey)
  }
  if (signedOptionId && fieldReady('signature_status')) {
    await putFileField(params.fileId, 'signature_status', [signedOptionId], params.apiKey)
  }
  if (fieldReady('albert_document_id')) {
    await putFileField(params.fileId, 'albert_document_id', params.documentId, params.apiKey)
  }
  if (fieldReady('albert_template_name')) {
    await putFileField(params.fileId, 'albert_template_name', params.templateName, params.apiKey)
  }
  if (fieldReady('signer_email')) {
    await putFileField(params.fileId, 'signer_email', params.signerEmail, params.apiKey)
  }
  if (fieldReady('signed_at')) {
    await putFileField(params.fileId, 'signed_at', signedAt, params.apiKey)
  }

  return { synced: true }
}
