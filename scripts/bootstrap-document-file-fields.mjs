#!/usr/bin/env node
/**
 * Bootstrap custom fields on native Files schema for Albert document signing.
 * Run from repo root: node scripts/atome/bootstrap-document-file-fields.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..')
dotenv.config({ path: join(ROOT, '.env') })

const API = process.env.ATOME_API_URL || 'https://api.atome.sh'
const KEY = process.env.ATOME_API_KEY
const CONFIG_PATH = join(ROOT, 'config', 'atome-document-file-fields.json')

if (!KEY) {
  console.error('ATOME_API_KEY missing in .env')
  process.exit(1)
}

async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'x-api-key': KEY, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : {}
  if (!res.ok) throw new Error(`${method} ${path}: ${JSON.stringify(data).slice(0, 300)}`)
  return data
}

function selectConfig(name, slug, options) {
  return {
    type: 'select',
    config: {
      has_options_with_colors: false,
      groups: [{
        options: options.map(o => ({
          id: randomUUID(),
          label: o.label,
          slug: o.slug,
          color: 'gray',
          iconName: null,
        })),
      }],
    },
  }
}

const DOCUMENT_TYPE_OPTIONS = [
  { slug: 'design_partnership', label: 'Contrat Design Partnership' },
  { slug: 'commercial_proposal', label: 'Proposition commerciale' },
  { slug: 'nda', label: 'NDA' },
  { slug: 'amendment', label: 'Avenant' },
  { slug: 'annex', label: 'Annexe' },
  { slug: 'other', label: 'Autre' },
]

const SIGNATURE_STATUS_OPTIONS = [
  { slug: 'not_required', label: 'Signature non requise' },
  { slug: 'draft', label: 'Brouillon' },
  { slug: 'pending_signature', label: 'En attente de signature' },
  { slug: 'signed', label: 'Signé' },
  { slug: 'expired', label: 'Lien expiré' },
  { slug: 'cancelled', label: 'Annulé' },
]

async function findFilesSchemaId() {
  const org = await api('GET', '/organization')
  const schemas = org.schemas || org.data?.schemas || []
  const files = schemas.find(s => s.slug === 'files' || s.entity_type === 'file')
  if (files?.id) return files.id
  throw new Error('Files schema not found in GET /organization')
}

async function getFields(schemaId) {
  const data = await api('GET', `/fields/by-schema-id?schema_id=${schemaId}`)
  return data.fields || []
}

async function ensureField(schemaId, spec, existing) {
  const found = existing.find(f => f.slug === spec.slug)
  if (found) {
    console.log(`  ✓ ${spec.slug} (${found.id})`)
    return found.id
  }
  const body = {
    data: {
      schema_id: schemaId,
      name: spec.name,
      slug: spec.slug,
      description: spec.description || null,
      type: spec.type,
      config: spec.config || {},
      icon_name: null,
      order: spec.order,
      created_by_source: 'api',
      created_by_context: { source: 'albert-bootstrap-document-fields' },
    },
  }
  try {
    const res = await api('POST', '/fields', body)
    console.log(`  + ${spec.slug} (${res.field.id})`)
    return res.field.id
  } catch (err) {
    if (String(err).includes('FieldSlugAlreadyExistsError')) {
      const m = String(err).match(/[0-9a-f-]{36}/i)
      if (m) {
        console.log(`  ✓ ${spec.slug} (${m[0]}) existing`)
        return m[0]
      }
    }
    throw err
  }
}

async function main() {
  console.log('Finding files schema…')
  const schemaId = await findFilesSchemaId()
  console.log('Schema id:', schemaId)

  const existing = await getFields(schemaId)
  let order = existing.length + 1

  const docTypeSpec = {
    name: 'Type de document',
    slug: 'document_type',
    type: 'select',
    order: order++,
    ...selectConfig('document_type', 'document_type', DOCUMENT_TYPE_OPTIONS),
  }
  const sigStatusSpec = {
    name: 'Statut signature',
    slug: 'signature_status',
    type: 'select',
    order: order++,
    ...selectConfig('signature_status', 'signature_status', SIGNATURE_STATUS_OPTIONS),
  }

  const textFields = [
    { name: 'ID document Albert', slug: 'albert_document_id', type: 'text' },
    { name: 'Template Albert', slug: 'albert_template_name', type: 'text' },
    { name: 'Email signataire', slug: 'signer_email', type: 'text' },
    { name: 'Signé le', slug: 'signed_at', type: 'date', config: {} },
  ]

  const fields = {}
  fields.document_type = await ensureField(schemaId, docTypeSpec, existing)
  fields.signature_status = await ensureField(schemaId, sigStatusSpec, existing)
  for (const tf of textFields) {
    fields[tf.slug] = await ensureField(schemaId, { ...tf, order: order++, config: tf.config || {} }, existing)
  }

  const docTypeField = await api('GET', `/fields/${fields.document_type}`)
  const sigField = await api('GET', `/fields/${fields.signature_status}`)
  const docOptions = {}
  const sigOptions = {}
  for (const g of docTypeField.field?.config?.groups || []) {
    for (const o of g.options || []) docOptions[o.slug] = o.id
  }
  for (const g of sigField.field?.config?.groups || []) {
    for (const o of g.options || []) sigOptions[o.slug] = o.id
  }

  const config = {
    filesSchemaId: schemaId,
    fields,
    documentTypeOptions: docOptions,
    signatureStatusOptions: sigOptions,
    bootstrappedAt: new Date().toISOString(),
  }

  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n')
  console.log('\nWrote', CONFIG_PATH)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
